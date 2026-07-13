package com.health.app.member;

import java.util.HashMap;
import java.util.List; // ◀ List 임포트 추가
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping; // ◀ GetMapping 임포트 추가
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam; // ◀ RequestParam 임포트 추가
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/member")
public class MemberController {

    @Autowired
    private MemberService memberService;
    
    @Autowired
    private JwtUtill jwtUtill;

    // 사장님 소속 지점의 일반 회원 목록 조회 API
    @GetMapping("/list/gym")
    public ResponseEntity<?> getGymMembers(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "gymId") Long gymId) throws Exception {

        // 1. JWT 토큰 존재 여부 확인
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        // 2. JWT 토큰 분석
        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        // 3. 서비스 조회 및 리턴
        List<MemberDTO> members = memberService.findMembersByGymId(gymId);
        return ResponseEntity.ok(members);
    }

    // 로그인된 회원의 계정 정보(이메일, 비밀번호) 수정 API
    // PUT /member/update
    @PutMapping("/update")
    public ResponseEntity<String> update(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody MemberDTO memberDTO) throws Exception {

        // 1. JWT 토큰 존재 여부 확인
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        // 2. JWT 토큰 분석을 통한 본인 식별 추출
        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        // 3. 토큰에서 추출한 로그인 사용자의 ID(username)를 DTO에 바인딩
        Long loginUsername = Long.parseLong(claims.getSubject());
        memberDTO.setUsername(loginUsername);

        // 4. 서비스 로직 호출 및 결과 반환
        int result = memberService.update(memberDTO);

        if (result == -1) {
            return ResponseEntity.badRequest().body("비밀번호를 바르게 입력해 주세요.");
        } else if (result == -2) {
            return ResponseEntity.badRequest().body("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        } else if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    // 회원가입 처리 메서드
    @PostMapping("/join")
    public ResponseEntity<String> join(@RequestBody MemberDTO memberDTO) throws Exception {
        int result = memberService.join(memberDTO);
        
        if (result == -1) {
            return ResponseEntity.badRequest().body("비밀번호가 일치하지 않습니다.");
        } else if (result == -2) {
            return ResponseEntity.badRequest().body("이미 사용 중인 아이디입니다.");
        } else if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    // 아이디 중복체크 API 메서드
    @PostMapping("/idcheck")
    public ResponseEntity<String> idcheck(@RequestBody MemberDTO memberDTO) throws Exception {
        MemberDTO check = memberService.idcheck(memberDTO);
        if (check != null) {
            return ResponseEntity.ok("Duplicate"); // 중복됨
        } else {
            return ResponseEntity.ok("Available"); // 사용 가능
        }
    }

    // 로그인 처리 API 메서드
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody MemberDTO memberDTO) throws Exception {
        MemberDTO loginMember = memberService.login(memberDTO);
        if (loginMember != null) {
            String token = jwtUtill.generateToken(String.valueOf(loginMember.getUsername()),
            loginMember.getRole()
        );
            Map<String,Object> responseData = new HashMap<>();
            responseData.put("member", loginMember);
            responseData.put("token", token);

            return ResponseEntity.ok(responseData); // 로그인 성공 (회원정보 전달)
        } else {
            return ResponseEntity.badRequest().body("아이디 또는 비밀번호가 올바르지 않습니다.");
        }
    }
}

