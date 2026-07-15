package com.health.app.checkInout;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
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

    // 트레이너 본인 PT 수업 이력 조회 API (TRAINER용) - 확인 완료 건 전체, 캘린더 표시용
    @GetMapping("/fitb/attendance/history")
    public ResponseEntity<?> historyList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }

        Long trainerUsername = Long.parseLong(claims.getSubject());
        List<CheckInoutDTO> li = checkInoutService.historyList(trainerUsername);
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

    // ===== PT 수업 일정 API (트레이너 주도 등록, 회원은 조회 전용) =====

    // 트레이너 본인 담당 회원 목록 API (TRAINER용) - 일정 등록 폼의 회원 선택용
    @GetMapping("/fitb/attendance/members")
    public ResponseEntity<?> myMembers(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        return ResponseEntity.ok(checkInoutService.myMembers(Long.parseLong(claims.getSubject())));
    }

    // 트레이너 담당 회원 현황 API (TRAINER용) - 유효 PT 계약별 총횟수/사용/잔여, 잔여 적은 순
    @GetMapping("/fitb/attendance/members/status")
    public ResponseEntity<?> memberStatusList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        return ResponseEntity.ok(checkInoutService.memberStatusList(Long.parseLong(claims.getSubject())));
    }

    // 트레이너 본인 일정 전체 조회 API (TRAINER용, 캘린더 표시용)
    @GetMapping("/fitb/attendance/schedule")
    public ResponseEntity<?> trainerScheduleList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        return ResponseEntity.ok(checkInoutService.trainerScheduleList(Long.parseLong(claims.getSubject())));
    }

    // 일정 등록 API (TRAINER용) - 본인 담당 회원만 등록 가능
    @PostMapping("/fitb/attendance/schedule")
    public ResponseEntity<?> scheduleAdd(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PtScheduleDTO schedule) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        try {
            return ResponseEntity.ok(checkInoutService.scheduleAdd(Long.parseLong(claims.getSubject()), schedule));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 일정 삭제 API (TRAINER용) - 본인 등록 건만
    @DeleteMapping("/fitb/attendance/schedule/{scheduleId}")
    public ResponseEntity<?> scheduleDelete(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("scheduleId") Long scheduleId) throws Exception {

        Claims claims = extractTrainerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("트레이너 로그인이 필요합니다.");
        }
        try {
            checkInoutService.scheduleDelete(scheduleId, Long.parseLong(claims.getSubject()));
            return ResponseEntity.ok("일정이 삭제되었습니다.");
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 회원 본인의 다가오는 PT 일정 조회 API (일반 회원용, JWT 필요)
    @GetMapping("/fitc/attendance/schedule")
    public ResponseEntity<?> memberScheduleList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }
        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }
        return ResponseEntity.ok(checkInoutService.memberScheduleList(Long.parseLong(claims.getSubject())));
    }

    // ===== 사장님용 지점 집계 API (회원/직원 관리 탭 owner 뷰, OWNER/ADMIN 전용) =====

    // 지점 관리 현황 통합 조회 API - 트레이너 성과 / 재등록 임박 / 지점 일정·수업 이력을 한 번에 반환
    // OWNER는 본인 지점 고정, ADMIN은 gymId 파라미터로 임의 매장 드릴다운 가능
    @GetMapping("/fitb/attendance/owner/overview")
    public ResponseEntity<?> ownerOverview(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(value = "gymId", required = false) Long gymIdParam) throws Exception {

        Claims claims = extractOwnerClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("사장님 로그인이 필요합니다.");
        }

        try {
            String role = claims.get("role", String.class);
            Long gymId = (gymIdParam != null && role.equalsIgnoreCase("ADMIN"))
                    ? gymIdParam // ADMIN만 타 매장 지정 허용 (OWNER는 본인 지점 강제)
                    : checkInoutService.resolveGymId(Long.parseLong(claims.getSubject()));

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("trainers", checkInoutService.ownerTrainerPerf(gymId));
            responseData.put("rebooks", checkInoutService.ownerRebookList(gymId));
            responseData.put("schedules", checkInoutService.ownerScheduleList(gymId));
            responseData.put("sessions", checkInoutService.ownerHistoryList(gymId));
            return ResponseEntity.ok(responseData);
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 총괄 관리자용 매장별 비교 지표 API (ADMIN 전용) - 전 매장의 수업량/수행률/임박 지표
    @GetMapping("/fitb/attendance/admin/gyms")
    public ResponseEntity<?> adminGymOverview(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractOwnerClaims(authorization);
        if (claims == null || !"ADMIN".equalsIgnoreCase(claims.get("role", String.class))) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("총괄 관리자 로그인이 필요합니다.");
        }
        return ResponseEntity.ok(checkInoutService.adminGymOverview());
    }

    // JWT 검증 + OWNER/ADMIN 권한 확인 공통 메서드 (실패 시 null 반환)
    private Claims extractOwnerClaims(String authorization) {
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
        if (role == null || !(role.equalsIgnoreCase("OWNER") || role.equalsIgnoreCase("ADMIN"))) {
            return null;
        }
        return claims;
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
