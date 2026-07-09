package com.health.app.item;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 매일 자정 물품 유효기간 임박(D-3) 항목을 스캔해 해당 gym 사장님에게 알림을 보내는 스케줄러 클래스
 */
@Component
@EnableScheduling
public class ItemScheduler {

    @Autowired
    private ItemService itemService;

    /**
     * 매일 00시 5분에 유효기간 임박 물품을 스캔해 알림을 발송하는 배치 메서드
     */
    @Scheduled(cron = "0 5 0 * * *")
    public void scheduleExpiryCheck() {
        try {
            int count = itemService.checkExpiringItems();
            System.out.println("[유효기간 임박 알림] " + count + "건 발송 완료");
        } catch (Exception e) {
            System.err.println("[유효기간 임박 알림 실패] 에러: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
