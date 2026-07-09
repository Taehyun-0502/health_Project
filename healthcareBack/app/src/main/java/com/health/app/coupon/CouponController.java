package com.health.app.coupon;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;


@RestController
@RequestMapping("/coupon")
public class CouponController {

    @Autowired
    private CouponService couponService;

    @Autowired
    private JwtUtill jwtUtill;

    // 회원의 보유 쿠폰 목록 조회 메서드
    @GetMapping("tolist")
    public ResponseEntity<?> toList(@RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {
        
        // 1. 헤더에 실린 JWT 토큰의 존재 여부 및 형식 사전 검증
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        // 2. 토큰 해독 및 Claims 정보 추출
        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }
        // 3. 토큰의 주체(Subject)에서 로그인 사용자 번호(username) 획득
        Long loginUsername = Long.parseLong(claims.getSubject());
        // 4. 추출한 본인 번호로 서비스 레이어 호출하여 안전하게 데이터 반환
        List<CouponDTO> list = couponService.toList(loginUsername);
        return ResponseEntity.ok(list);
    }
}
