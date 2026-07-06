package com.health.app.user;

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
@RequestMapping("/user")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private JwtUtill jwtUtill;

    // Authorization 헤더에서 로그인 사용자 정보(아이디/권한) 추출 메서드 (실패 시 null)
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
    // ADMIN: 제휴 계약 Owner / OWNER: 임금·이용권·PT 계약 상대 / TRAINER: 담당 PT 계약 Member
    // 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3=이용권, 4=PT)
    // 예: GET /user/list?contract=4 (Authorization: Bearer 토큰)
    @GetMapping("/list")
    public ResponseEntity<?> contractUserList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long contract) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        UserDTO userDTO = new UserDTO();
        userDTO.setUsername(Long.parseLong(claims.getSubject()));
        userDTO.setRole(claims.get("role", String.class));
        userDTO.setContract(contract);

        List<UserDTO> userList = userService.contractUserList(userDTO);

        // MEMBER 등 허용되지 않은 권한은 B2B 어드민 페이지 접근 불가
        if (userList == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        }
        return ResponseEntity.ok(userList);
    }

    // 계약서 발행 API 메서드
    // ADMIN: 제휴 계약서 / OWNER: 임금·이용권·PT 계약서 발행 (초기 상태 ISSUED)
    @PostMapping("/contract")
    public ResponseEntity<String> contractInsert(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody UserDTO userDTO) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        // 발행자는 로그인 사용자 본인으로 강제 (변조 방지)
        userDTO.setSenderId(Long.parseLong(claims.getSubject()));
        userDTO.setRole(claims.get("role", String.class));

        int result = userService.contractInsert(userDTO);

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

    // 계약서 상세 조회 API 메서드 (ADMIN 또는 계약 당사자만 열람 가능)
    @GetMapping("/contract/{dataId}")
    public ResponseEntity<?> contractDetail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long dataId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        UserDTO userDTO = new UserDTO();
        userDTO.setDataId(dataId);
        userDTO.setUsername(Long.parseLong(claims.getSubject()));
        userDTO.setRole(claims.get("role", String.class));

        UserDTO detail = userService.contractDetail(userDTO);
        if (detail == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("계약서가 없거나 열람 권한이 없습니다.");
        }
        return ResponseEntity.ok(detail);
    }

    // 계약서 서명 API 메서드 (ISSUED -> SIGNED, 계약 당사자만 가능)
    @PutMapping("/contract/{dataId}/sign")
    public ResponseEntity<String> contractSign(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long dataId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        UserDTO userDTO = new UserDTO();
        userDTO.setDataId(dataId);
        userDTO.setUsername(Long.parseLong(claims.getSubject()));
        userDTO.setRole(claims.get("role", String.class));

        int result = userService.contractSign(userDTO);

        if (result == -1) {
            return ResponseEntity.badRequest().body("존재하지 않는 계약서입니다.");
        } else if (result == -2) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("서명 권한이 없습니다.");
        } else if (result == -3 || result == 0) {
            // 이미 서명 완료되었거나 서명 가능한 상태(ISSUED)가 아닌 경우
            return ResponseEntity.status(HttpStatus.CONFLICT).body("서명할 수 없는 상태의 계약서입니다.");
        } else {
            return ResponseEntity.ok("Success");
        }
    }
}
