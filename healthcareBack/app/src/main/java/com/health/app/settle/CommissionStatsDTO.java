package com.health.app.settle;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 관리자(ADMIN) 커미션 대시보드 상단 요약 통계 (목록 필터/페이지와 무관하게 전체 가맹점 기준 집계)
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CommissionStatsDTO {

    // 지급 완료 커미션 누적 합계
    private long totalPaidAmount;
    // 미지급 상태 건수
    private long unpaidCount;
    // 전체 가맹점 평균 커미션 수수료율
    private double avgCommissionRate;

}
