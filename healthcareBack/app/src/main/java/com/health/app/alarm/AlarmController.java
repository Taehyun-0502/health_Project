package com.health.app.alarm;

import java.util.List;
import java.util.Map;

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

    // SSE 구독 티켓 발급 API (POST /alarm/ticket)
    // EventSource는 Authorization 헤더를 보낼 수 없으므로, Bearer 인증은 이 단계에서 받고
    // 구독 단계는 여기서 발급한 1회용 티켓으로 대신한다. 발급 대상은 JWT subject로 고정한다.
    @PostMapping("/ticket")
    public ResponseEntity<?> issueSubscribeTicket(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        Claims claims = extractClaims(authorization);
        if (claims == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Long receiver = Long.parseLong(claims.getSubject());
        return ResponseEntity.ok(Map.of("ticket", alarmService.issueSubscribeTicket(receiver)));
    }

    // 실시간 알람 채널 구독 API
    // GET /alarm/subscribe?ticket=발급받은티켓
    // 구독 대상은 티켓에 봉인된 발급 대상으로만 결정된다(클라이언트가 username을 지정할 수 없음).
    // produces = MediaType.TEXT_EVENT_STREAM_VALUE 속성 지정을 통해 SSE 규격으로 송출합니다.
    // ResponseEntity<SseEmitter>로 감싸는 이유: 인증 실패 시 상태코드만 돌려줘야 하는데,
    // 예외를 던지면 produces=text/event-stream과 오류 응답의 콘텐츠 협상이 어긋날 수 있다.
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> subscribe(
            @RequestParam(value = "ticket", required = false) String ticket) throws Exception {

        // 서비스로부터 개설 및 더미 이벤트 전송을 마친 Emitter 자원을 획득하여 반환
        SseEmitter emitter = alarmService.subscribeByTicket(ticket);
        if (emitter == null) {
            // 티켓이 없거나 만료·이미 사용된 경우
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(emitter);
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

        // 수신자는 클라이언트 값이 아니라 JWT subject로 강제 - 타인 알림 읽음 처리(IDOR) 차단
        Long receiver = Long.parseLong(claims.getSubject());
        int result = alarmService.alarmRead(alarmId, receiver);
        if (result == 0) {
            // 존재하지 않거나 본인 수신 알림이 아님 (구분해서 알려주면 타인 알림 존재 여부가 노출되므로 통합)
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("알림을 찾을 수 없습니다.");
        }
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