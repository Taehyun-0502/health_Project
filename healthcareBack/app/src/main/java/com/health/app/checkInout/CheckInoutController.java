package com.health.app.checkInout;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.GetMapping;
import com.health.app.config.JwtUtill;
import io.jsonwebtoken.Claims;

@RestController
@RequestMapping("/checkin")
public class CheckInoutController {

    @Autowired
    private CheckInoutService checkInoutService;

    @Autowired
    private JwtUtill jwtUtill; // ◀ JWT 유틸리티 주입

    // 회원의 본인 출석 기록 조회 API
    @GetMapping("list")
    public ResponseEntity<?> list(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {
        
        // 1. 헤더에 실린 JWT 토큰 유무 및 규격 사전 검증
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        // 2. 토큰 해독을 통한 본인 정보 추출
        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        // 3. 추출된 본인 번호로 안전하게 조회
        Long loginUsername = Long.parseLong(claims.getSubject());
        List<CheckInoutDTO> li = checkInoutService.list(loginUsername);
        return ResponseEntity.ok(li);
    }
}

