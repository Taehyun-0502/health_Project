package com.health.app.alarm;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

// 프론트엔드의 실시간 알람 구독(EventSource 연결) 및 알림 이력 조회/읽음 처리를 담당하는 컨트롤러
@RestController
@RequestMapping("/alarm")
public class AlarmController {

    @Autowired
    private AlarmService alarmService;

    @Autowired
    private JwtUtill jwtUtill;

    // Authorization 헤더에서 로그인 사용자 정보 추출 메서드
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

    // 실시간 알람 채널 구독 API
    // GET /alarm/subscribe?username=번호
    // produces = MediaType.TEXT_EVENT_STREAM_VALUE 속성 지정을 통해 SSE 규격으로 송출합니다.
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@RequestParam("username") String username) throws Exception {
        // 서비스로부터 개설 및 더미 이벤트 전송을 마친 Emitter 자원을 획득하여 반환
        return alarmService.subscribe(username);
    }

    // 로그인한 사용자의 알림 이력 목록 조회 API
    @GetMapping("/list")
    public ResponseEntity<?> list(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Long receiver = Long.parseLong(claims.getSubject());
        List<AlarmDTO> list = alarmService.alarmList(receiver);
        return ResponseEntity.ok(list);
    }

    // 알림 읽음 처리 API
    @PostMapping("/read")
    public ResponseEntity<?> read(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam("alarmId") Long alarmId) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        int result = alarmService.alarmRead(alarmId);
        return ResponseEntity.ok(result);
    }

    // 로그인한 사용자의 모든 알림 일괄 읽음 처리 API (신규 추가 메서드)
    @PostMapping("/read/all")
    public ResponseEntity<?> readAll(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Long receiver = Long.parseLong(claims.getSubject());
        int result = alarmService.readAllAlarms(receiver);
        return ResponseEntity.ok(result);
    }
}