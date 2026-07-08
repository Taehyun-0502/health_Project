package com.health.app.alarm;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

// 프론트엔드의 실시간 알람 구독(EventSource 연결) 요청을 접수하는 컨트롤러
@RestController
@RequestMapping("/alarm")
public class AlarmController {

    @Autowired
    private AlarmService alarmService;

    // 실시간 알람 채널 구독 API
    // GET /alarm/subscribe?username=번호
    // produces = MediaType.TEXT_EVENT_STREAM_VALUE 속성 지정을 통해 SSE 규격으로 송출합니다.
    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@RequestParam("username") String username) throws Exception {
        // 서비스로부터 개설 및 더미 이벤트 전송을 마친 Emitter 자원을 획득하여 반환
        return alarmService.subscribe(username);
    }
}