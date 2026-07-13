package com.health.app.coupon;

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
@RequestMapping("/coupon")
public class CouponController {

    @Autowired
    private CouponService couponService;

    @Autowired
    private JwtUtill jwtUtill; // ◀ JWT 유틸리티 의존성 다시 주입

    // 헤더에 실린 Bearer 토큰을 안전하게 해독 검증하고 로그인 아이디를 리턴하는 공통 헬퍼 메서드
    private Long validateAndGetUsername(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            throw new IllegalArgumentException("로그인이 필요합니다.");
        }
        try {
            Claims claims = jwtUtill.extractAllClaims(authorization.substring(7));
            return Long.parseLong(claims.getSubject());
        } catch (Exception e) {
            throw new IllegalArgumentException("유효하지 않은 토큰입니다.");
        }
    }

    // 회원의 본인 보유 쿠폰 목록 조회 API
    // username 파라미터가 있으면 해당 회원의 쿠폰함을 조회 (사장님이 현장 결제 시 회원 쿠폰함을 확인하는 용도), 없으면 로그인 본인 쿠폰함
    @GetMapping("tolist")
    public ResponseEntity<?> toList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "username", required = false) Long username) throws Exception {
        try {
            Long loginUsername = validateAndGetUsername(authorization);
            Long targetUsername = username != null ? username : loginUsername;
            List<CouponDTO> list = couponService.toList(targetUsername);
            return ResponseEntity.ok(list);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    // 사장님의 지점 쿠폰 종류 신규 생성 API
    @PostMapping("type/create")
    public ResponseEntity<?> createCoupon(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody CouponTypeDTO typeDTO) throws Exception {
        try {
            validateAndGetUsername(authorization); // 토큰 검증 및 파싱 수행
            int result = couponService.createCoupon(typeDTO);
            if (result > 0) {
                return ResponseEntity.ok("쿠폰 종류가 정상 등록되었습니다.");
            }
            return ResponseEntity.badRequest().body("쿠폰 종류 등록 실패");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    // 사장님 지점의 쿠폰 종류 목록 조회 API
    @GetMapping("type/list")
    public ResponseEntity<?> couponTypeList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("gymId") Long gymId) throws Exception {
        try {
            validateAndGetUsername(authorization); // 토큰 검증 수행
            List<CouponTypeDTO> list = couponService.couponTypeList(gymId);
            return ResponseEntity.ok(list);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    // 사장님의 특정 회원 대상 할인 쿠폰 발송 API (사용기간 date 주입)
    @PostMapping("send")
    public ResponseEntity<?> sendCoupon(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody CouponDTO couponDTO) throws Exception {
        try {
            Long ownerId = validateAndGetUsername(authorization); // 토큰 검증 및 사장님 아이디 확보
            couponDTO.setFromId(ownerId);

            int result = couponService.sendCoupon(couponDTO);
            if (result > 0) {
                return ResponseEntity.ok("쿠폰이 정상적으로 발송되었습니다.");
            }
            return ResponseEntity.badRequest().body("쿠폰 발송 실패");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @GetMapping("status")
    public ResponseEntity<?> couponStatus(@RequestHeader(value="Authorization", required=false)String authorization)throws Exception{
        try{
        Long fromId = validateAndGetUsername(authorization);

        List<CouponDTO> list = couponService.couponStatus(fromId);
        return ResponseEntity.ok(list);
        }
        catch(IllegalArgumentException e){
            // 3. 토큰이 비었거나 위조된 경우 401 에러 리턴
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }
}



