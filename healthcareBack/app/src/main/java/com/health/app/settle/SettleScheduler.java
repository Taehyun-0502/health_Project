package com.health.app.settle;

import java.time.LocalDate;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.health.app.alarm.AlarmService;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;

/**
 * 매달 1일 자동으로 전월 정산 데이터를 집계하여 h_settlement 테이블에 미지급으로 등록하는 스케줄러 클래스
 */
@Component
@EnableScheduling
public class SettleScheduler {

    private static final java.time.ZoneId SEOUL_ZONE = java.time.ZoneId.of("Asia/Seoul");

    @Autowired
    private SettleService settleService;

    @Autowired
    private AlarmService alarmService;

    @Autowired
    private MemberService memberService;

    // 정산 배치 실패를 전체 ADMIN 권한 회원에게 알림으로 통지하는 헬퍼 메서드
    // 관리자 한 명에 대한 발송 실패가 나머지 관리자에게 통지되는 것까지 막지 않도록 개별 격리
    private void notifyAdminsOfFailure(String targetMonth, String errorMessage) {
        List<MemberDTO> admins;
        try {
            admins = memberService.findByRole("admin");
        } catch (Exception e) {
            System.err.println("ADMIN 목록 조회 실패: " + e.getMessage());
            return;
        }

        for (MemberDTO admin : admins) {
            try {
                alarmService.sendAlarm(admin.getUsername(), null,
                        targetMonth + " 정산 배치 실패 - 확인이 필요합니다. (" + errorMessage + ")",
                        "/fitb/Settlepage", "SETTLE_BATCH");
            } catch (Exception notifyError) {
                System.err.println("정산 배치 실패 알림 발송 중 에러 (admin=" + admin.getUsername() + "): " + notifyError.getMessage());
            }
        }
    }

    /**
     * 매달 1일 00:00:00에 전월 매출 정산을 자동 생성하는 배치 메서드
     */
    @Scheduled(cron = "0 0 0 1 * *", zone = "Asia/Seoul")
    public void scheduleMonthlySettlement() {
        try {
            // 정산 실행 시점(매월 1일) 기준 전월 날짜 획득
            LocalDate targetMonth = LocalDate.now(SEOUL_ZONE).minusMonths(1);
            int count = settleService.generateMonthlyCommissions(targetMonth);
            System.out.println("Scheduler execution success: Generated " + count + " commissions for month: "
                    + targetMonth.getYear() + "-" + targetMonth.getMonthValue());
        } catch (Exception e) {
            System.err.println("Scheduler execution failed: " + e.getMessage());
            e.printStackTrace();
            LocalDate targetMonth = LocalDate.now(SEOUL_ZONE).minusMonths(1);
            notifyAdminsOfFailure(targetMonth.getYear() + "-" + targetMonth.getMonthValue(), e.getMessage());
        }
    }

    /**
     * 매일 00시 15분에 최근 24시간 내 서명 완료된 신규 지출 정산 대기 계약서를 스캔해 알림을 발송하는 배치 메서드
     */
    @Scheduled(cron = "0 15 0 * * *", zone = "Asia/Seoul")
    public void scheduleNewExpenseContractCheck() {
        try {
            int count = settleService.checkNewlySignedExpenseContracts();
            System.out.println("[신규 지출 정산 대기 알림] " + count + "건 발송 완료");
        } catch (Exception e) {
            System.err.println("[신규 지출 정산 대기 알림 실패] 에러: " + e.getMessage());
            e.printStackTrace();
        }
    }

}
