package com.health.app.user;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
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

    // 로그인 권한별 계약 유저 리스트 조회 API 메서드 (B2B 어드민 페이지)
    // ADMIN: 제휴 계약 Owner / OWNER: 임금·이용권·PT 계약 상대 / TRAINER: PT 계약 Member
    // 예: GET /user/list?contractType=OWNER_MEMBER_PT (Authorization: Bearer 토큰)
    @GetMapping("/list")
    public ResponseEntity<?> contractUserList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) String contractType) throws Exception {

        // 토큰 검증 및 로그인 사용자 정보(아이디/권한) 추출
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        UserDTO userDTO = new UserDTO();
        userDTO.setUsername(Long.parseLong(claims.getSubject()));
        userDTO.setRole(claims.get("role", String.class));
        userDTO.setContractType(contractType);

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

        // 토큰 검증 및 로그인 사용자 정보(아이디/권한) 추출
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
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
}
