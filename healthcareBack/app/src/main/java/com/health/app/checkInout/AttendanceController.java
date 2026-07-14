package com.health.app.checkInout;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.config.JwtUtill;
import com.health.app.member.MemberDTO;

import io.jsonwebtoken.Claims;

/**
 * 출석 키오스크(회원용, 무로그인) + PT 출석 트레이너 확인(사장님 포털)을 처리하는 REST 컨트롤러
 * 키오스크는 헬스장 입구 공용 태블릿 용도라 JWT 없이 전화번호+비밀번호 본인 확인으로 동작한다
 */
@RestController
public class AttendanceController {

    @Autowired
    private CheckInoutService checkInoutService;

    @Autowired
    private JwtUtill jwtUtill;

    // 헬스장 출석 API (키오스크, 무로그인) - 계정 검증 후 출석 기록
    @PostMapping("/fitc/attendance/gym")
    public ResponseEntity<?> gymCheckIn(@RequestBody MemberDTO credential) throws Exception {
        try {
            return ResponseEntity.ok(checkInoutService.gymCheckIn(credential));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // PT 출석 접수 API (키오스크, 무로그인) - 미확인 상태로 기록, 차감은 트레이너 확인 시점
    @PostMapping("/fitc/attendance/pt")
    public ResponseEntity<?> ptCheckIn(@RequestBody MemberDTO credential) throws Exception {
        try {
            return ResponseEntity.ok(checkInoutService.ptCheckIn(credential));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 트레이너 본인 담당 당일 미확인 PT 출석 대기 목록 API (TRAINER용)
    @GetMapping("/fitb/attendance/pending")
    public ResponseEntity<?> pendingList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }

        Long trainerUsername = Long.parseLong(claims.getSubject());
        List<CheckInoutDTO> li = checkInoutService.pendingList(trainerUsername);
        return ResponseEntity.ok(li);
    }

    // PT 출석 트레이너 확인 API (TRAINER용) - 확인 처리 + 잔여횟수 1 차감 (단일 트랜잭션)
    @PostMapping("/fitb/attendance/confirm/{inoutId}")
    public ResponseEntity<?> confirmPt(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("inoutId") Long inoutId) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }

        Long trainerUsername = Long.parseLong(claims.getSubject());
        try {
            int remainingCount = checkInoutService.confirmPt(inoutId, trainerUsername);
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("remainingCount", remainingCount);
            return ResponseEntity.ok(responseData);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // JWT 검증 + TRAINER 권한 확인 공통 메서드 (실패 시 null 반환)
    private Claims extractTrainerClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
        String role = claims.get("role", String.class);
        if (role == null || !role.equalsIgnoreCase("TRAINER")) {
            return null;
        }
        return claims;
    }
}
