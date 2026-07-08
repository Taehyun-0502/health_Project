package com.health.app.alarm;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Repository
public class AlarmRepository {

    // 회원 아이디(전화번호)를 key로 하여 SseEmitter 객체를 저장하는 동시성 제어 맵
    private Map<String,SseEmitter> emitters = new ConcurrentHashMap<>();

    // 특정 회원의 실시간 연결망 저장
    public void save(String username, SseEmitter emitter) throws Exception{
        emitters.put(username, emitter);
    }

    // 특정 회원의 실시간 연결망 조회
    public SseEmitter get(String username)throws Exception{
        return emitters.get(username);
    }

    // 특정 회원의 실시간 연결망 삭제 (로그아웃 혹은 통신 단선 시 호출)
    public void remove(String username) {
        emitters.remove(username);
    }
}
