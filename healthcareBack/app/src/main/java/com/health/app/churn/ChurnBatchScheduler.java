package com.health.app.churn;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/**
 * 매일 정해진 시각에 전체 회원 이탈 예측을 갱신하는 스케줄러.
 * FastAPI 의 POST /churn/batch (analyze_and_save_all) 를 호출한다.
 * - EC2 단일 인스턴스 상시 실행 전제. 다중 인스턴스로 확장 시 분산 락(ShedLock 등) 필요.
 * - EC2 기본 타임존(UTC)과 무관하게 한국시간으로 돌도록 zone 지정.
 */
@Component
public class ChurnBatchScheduler {

    private static final Logger log = LoggerFactory.getLogger(ChurnBatchScheduler.class);

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.churn.fastapi-url:http://localhost:8000}")
    private String churnFastapiUrl;

    // 매일 새벽 3시(한국시간) 전체 회원 이탈 예측 갱신
    @Scheduled(cron = "0 0 3 * * *", zone = "Asia/Seoul")
    public void runDailyChurnBatch() {
        triggerBatch("일일 스케줄");
    }

    // 앱 시작 시 1회 실행 (배포/재시작 직후 최신화). 스케줄 대체가 아니라 보완.
    @EventListener(ApplicationReadyEvent.class)
    public void runOnStartup() {
        triggerBatch("앱 시작");
    }

    // FastAPI /churn/batch 호출 (analyze_and_save_all 실행). 실패해도 앱에 영향 없이 로그만 남김.
    private void triggerBatch(String trigger) {
        String url = churnFastapiUrl + "/churn/batch";
        log.info("[ChurnBatch] {} — 이탈 예측 배치 시작 → {}", trigger, url);
        try {
            RequestEntity<Void> request = RequestEntity.method(HttpMethod.POST, URI.create(url)).build();
            ResponseEntity<String> response = restTemplate.exchange(request, String.class);
            log.info("[ChurnBatch] {} 완료: status={}, body={}", trigger, response.getStatusCode(), response.getBody());
        } catch (Exception e) {
            log.error("[ChurnBatch] {} 실패: {}", trigger, e.getMessage(), e);
        }
    }
}
