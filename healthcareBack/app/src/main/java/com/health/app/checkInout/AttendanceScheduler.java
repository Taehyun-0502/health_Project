package com.health.app.checkInout;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * PT 수업 전날 리마인드 알림을 발송하는 스케줄러 클래스 (AlarmScheduler 패턴)
 * 매일 저녁 8시에 다음 날 h_pt_schedule 일정을 조회해 회원/트레이너 양쪽에 알림을 보낸다
 */
@Component
public class AttendanceScheduler {

    @Autowired
    private CheckInoutService checkInoutService;

    // 매일 20시 00분에 내일 예정 PT 일정 리마인드 발송 배치 메서드
    @Scheduled(cron = "0 0 20 * * *")
    public void sendTomorrowReminders() {
        try {
            int count = checkInoutService.sendTomorrowReminders();
            System.out.println("[PT 수업 리마인드] 내일 예정 일정 " + count + "건 알림 발송 완료");
        } catch (Exception e) {
            System.err.println("[PT 수업 리마인드 실패] 에러: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
