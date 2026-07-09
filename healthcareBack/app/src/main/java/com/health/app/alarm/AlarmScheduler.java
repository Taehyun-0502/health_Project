package com.health.app.alarm;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 알림 이력 보관 기간(1개월)이 지난 h_alarm row를 매일 정리하는 스케줄러 클래스
 */
@Component
@EnableScheduling
public class AlarmScheduler {

    @Autowired
    private AlarmService alarmService;

    /**
     * 매일 00시 10분에 생성일(create_at) 기준 1개월이 지난 알림 이력을 삭제하는 배치 메서드
     */
    @Scheduled(cron = "0 10 0 * * *")
    public void deleteOldAlarms() {
        try {
            int count = alarmService.deleteOldAlarms();
            System.out.println("[알림 보관기간 정리] 1개월 경과 알림 " + count + "건 삭제 완료");
        } catch (Exception e) {
            System.err.println("[알림 보관기간 정리 실패] 에러: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
