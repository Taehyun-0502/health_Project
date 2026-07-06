package com.health.app.member;

import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;

@RestController
@RequestMapping("/member")
public class MemberController {

    @Autowired
    private MemverService memverService;
    
    @Autowired
    private JwtUtill jwtUtill;

    // 회원가입 처리 메서드
    @PostMapping("/join")
    public ResponseEntity<String> join(@RequestBody MemberDTO memberDTO) throws Exception {
        int result = memverService.join(memberDTO);
        
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
        MemberDTO check = memverService.idcheck(memberDTO);
        if (check != null) {
            return ResponseEntity.ok("Duplicate"); // 중복됨
        } else {
            return ResponseEntity.ok("Available"); // 사용 가능
        }
    }

    // 로그인 처리 API 메서드
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody MemberDTO memberDTO) throws Exception {
        MemberDTO loginMember = memverService.login(memberDTO);
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
