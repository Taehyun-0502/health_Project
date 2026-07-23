package com.health.app.alarm;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Repository;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Repository
public class AlarmRepository {

    // 회원 아이디(전화번호)를 key로 하여 SseEmitter 목록을 저장하는 동시성 제어 맵
    // 한 회원이 탭/기기를 여러 개 열 수 있으므로 값은 단일 emitter가 아니라 집합이다.
    // 단일 emitter로 두면 새 연결이 이전 연결을 덮어쓰고, 이후 죽은 이전 연결이 정리될 때
    // 살아있는 새 연결까지 맵에서 사라져 그 회원의 실시간 알림이 끊긴다.
    private final Map<String, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();

    // 특정 회원의 실시간 연결망 추가
    public void save(String username, SseEmitter emitter) throws Exception {
        emitters.computeIfAbsent(username, key -> ConcurrentHashMap.newKeySet()).add(emitter);
    }

    // 특정 회원의 실시간 연결망 전체 조회 (없으면 빈 집합)
    public Set<SseEmitter> get(String username) throws Exception {
        Set<SseEmitter> found = emitters.get(username);
        return found == null ? Collections.emptySet() : found;
    }

    // 특정 연결망만 삭제 (통신 단선·타임아웃 시 호출)
    // 같은 회원의 다른 연결은 유지하고, 마지막 하나가 빠지면 key까지 정리한다.
    public void remove(String username, SseEmitter emitter) {
        emitters.computeIfPresent(username, (key, set) -> {
            set.remove(emitter);
            return set.isEmpty() ? null : set;
        });
    }
}
