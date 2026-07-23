package com.health.app.checkInout;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * 출석 키오스크 인증 시도 제한기.
 *
 * 키오스크(/fitc/attendance/*)는 헬스장 입구 공용 태블릿용이라 JWT 없이 전화번호+비밀번호로 본인을 확인한다.
 * 즉 인증 시도 횟수에 제한이 없으면 누구나 무한히 비밀번호를 대입해 볼 수 있는 통로가 된다.
 * 회원 아이디가 전화번호 뒤 8자리라 추측도 어렵지 않다.
 *
 * 두 축을 함께 건다.
 *  - 계정(username) 기준: 특정 회원을 노린 비밀번호 대입 차단
 *  - 출발지(IP) 기준: 여러 계정에 같은 비밀번호를 뿌리는 시도(password spraying) 차단.
 *    계정 기준만으로는 계정마다 카운터가 따로 올라가 이 패턴을 막지 못한다.
 *
 * 잠금은 시간이 지나면 자동으로 풀리고, 인증에 성공하면 즉시 초기화한다.
 * 공용 태블릿 특성상 IP 한도는 계정 한도보다 넉넉해야 정상 이용자가 막히지 않는다.
 */
@Component
public class AttendanceRateLimiter {

    // 계정 기준: 연속 실패 허용 횟수와 초과 시 잠금 시간
    private static final int USER_MAX_FAILURES = 5;
    private static final long USER_LOCK_MILLIS = 60_000L;

    // IP 기준: 한 태블릿에서 여러 회원이 번갈아 쓰므로 계정보다 여유 있게 잡는다
    private static final int IP_MAX_FAILURES = 20;
    private static final long IP_LOCK_MILLIS = 300_000L;

    // 마지막 실패로부터 이 시간이 지나면 누적 실패 횟수를 리셋 (드문드문 틀리는 정상 이용자 보호)
    private static final long FAILURE_WINDOW_MILLIS = 600_000L;

    private final Map<String, Attempt> attempts = new ConcurrentHashMap<>();

    private static class Attempt {
        int failures;
        long lastFailureAt;
        long lockedUntil;
    }

    // 시도 전 잠금 여부 확인 - 잠겨 있으면 예외 (컨트롤러가 429로 변환)
    public void assertNotLocked(Long username, String clientIp) {
        checkKey(userKey(username));
        checkKey(ipKey(clientIp));
    }

    // 인증 실패 기록 - 한도를 넘으면 해당 키를 잠근다
    public void recordFailure(Long username, String clientIp) {
        registerFailure(userKey(username), USER_MAX_FAILURES, USER_LOCK_MILLIS);
        registerFailure(ipKey(clientIp), IP_MAX_FAILURES, IP_LOCK_MILLIS);
    }

    // 인증 성공 - 누적 실패 기록 제거 (정상 이용자가 이전 오타 때문에 잠기지 않도록)
    public void recordSuccess(Long username, String clientIp) {
        attempts.remove(userKey(username));
        attempts.remove(ipKey(clientIp));
    }

    private void checkKey(String key) {
        if (key == null) {
            return;
        }
        Attempt attempt = attempts.get(key);
        if (attempt == null) {
            return;
        }
        synchronized (attempt) {
            if (attempt.lockedUntil > System.currentTimeMillis()) {
                long remainSeconds = (attempt.lockedUntil - System.currentTimeMillis() + 999) / 1000;
                throw new AttendanceLockedException(
                        "인증 시도가 너무 많습니다. " + remainSeconds + "초 후 다시 시도해 주세요.");
            }
        }
    }

    private void registerFailure(String key, int maxFailures, long lockMillis) {
        if (key == null) {
            return;
        }
        long now = System.currentTimeMillis();
        Attempt attempt = attempts.computeIfAbsent(key, k -> new Attempt());
        synchronized (attempt) {
            // 마지막 실패가 오래 전이면 새로 세기 시작
            if (now - attempt.lastFailureAt > FAILURE_WINDOW_MILLIS) {
                attempt.failures = 0;
            }
            attempt.failures++;
            attempt.lastFailureAt = now;
            if (attempt.failures >= maxFailures) {
                attempt.lockedUntil = now + lockMillis;
                attempt.failures = 0; // 잠금 해제 후 곧바로 재잠금되지 않도록 카운터 초기화
            }
        }
    }

    private String userKey(Long username) {
        return username == null ? null : "user:" + username;
    }

    private String ipKey(String clientIp) {
        return (clientIp == null || clientIp.isBlank()) ? null : "ip:" + clientIp;
    }
}
