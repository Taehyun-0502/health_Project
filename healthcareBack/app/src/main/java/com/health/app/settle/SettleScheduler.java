package com.health.app.settle;

import java.time.LocalDate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 매달 1일 자동으로 전월 정산 데이터를 집계하여 h_settlement 테이블에 미지급으로 등록하는 스케줄러 클래스
 */
@Component
@EnableScheduling
public class SettleScheduler {

    @Autowired
    private SettleService settleService;

    /**
     * 매달 1일 00:00:00에 전월 매출 정산을 자동 생성하는 배치 메서드
     */
    @Scheduled(cron = "0 0 0 1 * *")
    public void scheduleMonthlySettlement() {
        try {
            // 정산 실행 시점(매월 1일) 기준 전월 날짜 획득
            LocalDate targetMonth = LocalDate.now().minusMonths(1);
            int count = settleService.generateMonthlyCommissions(targetMonth);
            System.out.println("Scheduler execution success: Generated " + count + " commissions for month: "
                    + targetMonth.getYear() + "-" + targetMonth.getMonthValue());
        } catch (Exception e) {
            System.err.println("Scheduler execution failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * 임시 테스트 기능: 서버 구동(ApplicationReadyEvent) 완료 즉시
     * 전월 및 당월의 수수료 정산 내역을 자동으로 강제 집계하여 생성합니다.
     */
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void runOnStartup() {
    try {
    // 1. 전월 정산 강제 집계 생성
    LocalDate prevMonth = LocalDate.now().minusMonths(1);
    int prevCount = settleService.generateMonthlyCommissions(prevMonth);

    // 2. 당월 정산 강제 집계 생성 (오늘 날짜 기준 누적 매출분)
    LocalDate currentMonth = LocalDate.now();
    int currentCount = settleService.generateMonthlyCommissions(currentMonth);

    System.out.println("[서버기동정산 완료] 전월(" + prevMonth.getYear() + "-" +
    prevMonth.getMonthValue() + "): " + prevCount + "건 / " +
    "당월(" + currentMonth.getYear() + "-" + currentMonth.getMonthValue() + "): " +
    currentCount + "건이 생성/업데이트 되었습니다.");
    }catch(Exception e) {
  
  System.err.println("[서버기동정산 실패] 에러: " + e.getMessage());
    e.printStackTrace();
    }
    }
}
