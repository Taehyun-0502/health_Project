package com.health.app.payment;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.health.app.config.JwtUtill;
import io.jsonwebtoken.Claims;

/**
 * 사장님의 현장 결제 확정(체크아웃)을 처리하는 REST 컨트롤러
 */
@RestController
@RequestMapping("/fitb/payment")
public class PayController {

    @Autowired
    private PayService payService;

    @Autowired
    private JwtUtill jwtUtill;

    // 사장님 결제 확정 API (OWNER용) - 계약 결제 + (선택)쿠폰 적용, 성공 시 매출(h_payment)에도 자동 반영
    @PostMapping("/checkout")
    public ResponseEntity<?> checkout(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PayDTO req) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        Long ownerUsername = Long.parseLong(claims.getSubject());

        try {
            PayDTO result = payService.checkout(req.getDataId(), ownerUsername, req.getCouponId());
            return ResponseEntity.ok(result);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

}
