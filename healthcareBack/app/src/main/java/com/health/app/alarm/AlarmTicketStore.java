package com.health.app.alarm;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

import org.springframework.stereotype.Component;

/**
 * SSE 구독용 1회성 티켓 저장소.
 *
 * 브라우저 EventSource는 Authorization 헤더를 보낼 수 없어 /alarm/subscribe를 Bearer로 보호할 수 없다.
 * 그렇다고 access token을 쿼리스트링에 실으면 서버 액세스 로그·브라우저 히스토리·Referer에 남으므로,
 * Bearer 인증을 통과한 요청에만 수명이 짧은 1회용 티켓을 발급하고 구독은 그 티켓으로만 허용한다.
 * 티켓이 유출돼도 60초 안에 한 번만, 발급받은 본인 채널에만 쓸 수 있다.
 *
 * 서버 재시작 시 초기화되지만 티켓은 즉시 소비되는 값이라 영속화할 필요가 없다.
 * (다중 인스턴스로 확장하면 이 맵을 공유 저장소로 옮겨야 한다.)
 */
@Component
public class AlarmTicketStore {

    // 발급 후 구독까지 허용하는 시간 (프론트가 발급 직후 곧바로 연결하므로 짧게 잡는다)
    private static final long TTL_MILLIS = 60_000L;

    // 만료 티켓이 쌓이지 않도록 발급 요청이 이 횟수를 넘길 때마다 한 번씩 청소
    private static final int PURGE_INTERVAL = 100;

    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();
    private final AtomicInteger issueCount = new AtomicInteger();

    private record Ticket(Long username, long expiresAt) {
    }

    // 인증된 회원에게 1회용 구독 티켓 발급
    public String issue(Long username) {
        if (issueCount.incrementAndGet() % PURGE_INTERVAL == 0) {
            purgeExpired();
        }

        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        tickets.put(ticket, new Ticket(username, System.currentTimeMillis() + TTL_MILLIS));
        return ticket;
    }

    // 티켓 소비 - 유효하면 소유자 username, 아니면 null (재사용 방지를 위해 조회와 동시에 제거)
    public Long consume(String ticket) {
        if (ticket == null || ticket.isBlank()) {
            return null;
        }
        Ticket found = tickets.remove(ticket);
        if (found == null || found.expiresAt() < System.currentTimeMillis()) {
            return null;
        }
        return found.username();
    }

    private void purgeExpired() {
        long now = System.currentTimeMillis();
        tickets.values().removeIf(ticket -> ticket.expiresAt() < now);
    }
}
