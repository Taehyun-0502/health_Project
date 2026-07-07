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

    // 로그인 권한별 계약 유저 리스트 조회 API 메서드 (B2B 어드민 페이지)
    @GetMapping("/list")
    public ResponseEntity<?> contractUserList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long contract) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        ContractDTO contractDTO = new ContractDTO();
        contractDTO.setUsername(Long.parseLong(claims.getSubject()));
        contractDTO.setRole(claims.get("role", String.class));
        contractDTO.setContract(contract);

        List<ContractDTO> userList = contractService.contractUserList(contractDTO);

        if (userList == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(userList);
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
            return ResponseEntity.badRequest().body("수신자 이름을 입력해 주세요.");
        } else if (result > 0) {
            return ResponseEntity.ok("Success");
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
