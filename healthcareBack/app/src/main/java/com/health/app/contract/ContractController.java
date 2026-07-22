package com.health.app.contract;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.health.app.config.JwtUtill;
import com.health.app.member.MemberDTO;
import com.health.app.pager.PagedResponse;
import com.health.app.pager.Pager;
import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/contract")
public class ContractController {

    @Autowired
    private ContractService contractService;

    @Autowired
    private JwtUtill jwtUtill;

    // Authorization 헤더에서 로그인 사용자 정보(아이디/권한) 추출 메서드
    private Claims extractClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        try {
            return jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    // 로그인 권한별 계약 유저 리스트 페이징 조회 API 메서드 (B2B 어드민 페이지)
    // page/pageSize를 Pager로 묶어 LIMIT/OFFSET 적용, {items, pager, totalCount, totalAmount} 형태로 응답(payment·item 관례와 동일)
    @GetMapping("/list")
    public ResponseEntity<?> contractUserList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long contract,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long pageSize) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));
        contractDTO.setContract(contract);
        contractDTO.setKeyword(keyword);

        Pager pager = new Pager();
        pager.setCurrentPage(page);
        pager.setPageSize(pageSize);

        PagedResponse<ContractDTO> userList = contractService.contractUserListPage(contractDTO, pager);

        if (userList == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(userList);
    }

    // 체험권 계약 대상 목록 조회 API 메서드 (OWNER 전용)
    // PT 체험(5) 발행폼 진입용 - 본인이 발급한 미사용·미만료 체험권의 동일 지점 MEMBER만 반환
    @GetMapping("/trial-targets")
    public ResponseEntity<?> trialTargetList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));

        List<TrialTargetDTO> targets = contractService.trialTargetList(contractDTO);

        if (targets == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(targets);
    }

    // 제휴 계약(1) 대상자(사장님) 목록 조회 API 메서드 (ADMIN 전용)
    // 발행 폼에서 사장님 select 선택 -> receiverId 자동 입력용
    @GetMapping("/owners")
    public ResponseEntity<?> ownerList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        List<MemberDTO> owners = contractService.ownerList(claims.get("role", String.class));

        if (owners == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(owners);
    }

    // 역할별 리스트/로스터 조회 API 메서드 (계약 대상 명단 - 매장/트레이너/회원)
    // ADMIN: gymId 없으면 제휴 매장 리스트, 있으면 매장별 명단 / OWNER: 소속 명단 / TRAINER: 담당 회원
    @GetMapping("/roster")
    public ResponseEntity<?> contractRoster(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long gymId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));
        contractDTO.setGymId(gymId);

        List<ContractDTO> roster = contractService.contractRoster(contractDTO);
        if (roster == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(roster);
    }

    // 구직 트레이너(구인구직 풀) 조회 API 메서드
    // 관계사(ADMIN)가 구직 풀에서 소개할 트레이너를 선별하기 위한 조회 - 이름·전화번호 등 최소 정보만 반환
    @GetMapping("/jobseekers")
    public ResponseEntity<?> jobSeekingTrainers(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        List<MemberDTO> trainers = contractService.jobSeekingTrainers(claims.get("role", String.class));
        if (trainers == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(trainers);
    }

    // 계약서 발행 API 메서드
    @PostMapping("/insert")
    public ResponseEntity<String> contractInsert(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ContractDTO contractDTO) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        // 발행자는 로그인 사용자 본인으로 강제
        contractDTO.setSenderId(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));

        int result = contractService.contractInsert(contractDTO);

        if (result == -1) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("해당 계약서를 발행할 권한이 없습니다.");
        } else if (result == -2) {
            return ResponseEntity.badRequest().body("수신자 정보를 입력해 주세요.");
        } else if (result == -6) {
            return ResponseEntity.badRequest().body("총 PT 횟수는 0 이상이어야 합니다.");
        } else if (result == -7) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("이미 유효한 PT 체험 계약이 있어 중복 발행할 수 없습니다.");
        } else if (result == -8) {
            return ResponseEntity.badRequest().body("체험권 정보가 없거나 발행 가능한 체험권이 아닙니다.");
        } else if (result > 0) {
            // 발행된 계약서 번호 반환 - 사장님 대면 서명 동선(발행 -> 바로 서명폼 이동)에서 사용
            return ResponseEntity.ok(String.valueOf(contractDTO.getDataId()));
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    // 계약서 상세 조회 API 메서드
    @GetMapping("/detail/{dataId}")
    public ResponseEntity<?> contractDetail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long dataId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setDataId(dataId);
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));

        ContractDTO detail = contractService.contractDetail(contractDTO);
        if (detail == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("계약서가 없거나 열람 권한이 없습니다.");
        }
        return ResponseEntity.ok(detail);
    }

    // 계약서 서명 API 메서드
    @PutMapping("/detail/{dataId}/sign")
    public ResponseEntity<String> contractSign(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long dataId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setDataId(dataId);
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));

        int result = contractService.contractSign(contractDTO);

        if (result == -1) {
            return ResponseEntity.badRequest().body("존재하지 않는 계약서입니다.");
        } else if (result == -2) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("서명 권한이 없습니다.");
        } else if (result == -3 || result == 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body("서명할 수 없는 상태의 계약서입니다.");
        } else {
            return ResponseEntity.ok("Success");
        }
    }
}
