package com.health.app.coupon;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import com.health.app.alarm.AlarmService; // 알림 서비스 임포트

import jakarta.annotation.PostConstruct;

@Component
public class CouponScheduler {

    @Autowired
    private CouponMapper couponMapper;

    @Autowired
    private AlarmService alarmService; // 알림 서비스 주입

    //매일 자정(00:00:00)에 자동으로 실행되어 3일 전 알림 및 당일 만료 쿠폰을 일괄 처리하는 메서드
    //     @PostConstruct
    // public void runOnStartup() {
    //     System.out.println("[쿠폰배치] 서버 구동 감지로 즉시 쿠폰 배치를 1회 초기 가동합니다.");
    //     this.handleCouponBatch(); // 메인 배치 실행 메서드 수동 호출
    // }

    @Scheduled(cron = "0 0 0 * * ?")
    public void handleCouponBatch() {
        try {
            System.out.println("[쿠폰배치] 자정 배치를 시작합니다.");
            
            // 1. 만료 3일 전인 쿠폰 대상자 조회 및 알림 발송
            List<CouponDTO> expiringSoon = couponMapper.getCouponsExpiringInDays(3);
            int alarmSendCount = 0;
            for (CouponDTO coupon : expiringSoon) {
                try {
                    alarmService.sendAlarm(
                        coupon.getToId(),                                              // 수신 회원
                        coupon.getFromId(),                                            // 발신 사장님
                        "['" + coupon.getCouponName() + "'] 쿠폰 만료가 3일 남았습니다. 서둘러 사용하세요.", // 메시지
                        "/mypage",                                                     // 이동 링크
                        "COUPON"                                                       // 알림 구분 카테고리
                    );
                    alarmSendCount++;
                } catch (Exception alarmEx) {
                    System.err.println("[쿠폰배치] 회원 " + coupon.getToId() + " 알림 전송 실패: " + alarmEx.getMessage());
                }
            }
            System.out.println("[쿠폰배치] 만료 3일 전 경고 알림 " + alarmSendCount + "건 발송 완료");

            // 2. 오늘 유효기간이 만료된 쿠폰들을 일괄 '기간만료'로 업데이트
            int expiredRows = couponMapper.updateExpiredCoupons();
            System.out.println("[쿠폰배치] 기간 경과 만료 처리 " + expiredRows + "건 완료");

        } catch (Exception e) {
            System.err.println("[쿠폰배치] 배치 작업 중 심각한 예외 발생: " + e.getMessage());
        }
    }
}