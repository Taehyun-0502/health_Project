package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 헬스장 이탈 통계 — 기간(일별/월별) 요약 행
@Getter
@Setter
@ToString
public class ChurnStatPeriodDTO {

    private String period;        // 일별: 'YYYY-MM-DD', 월별: 'YYYY-MM'
    private Integer totalMembers; // 전체 분석 회원수 — 월별은 일평균 반올림
    private Integer riskMembers;  // 위험군(개입·긴급) 회원수 = 요인·불만 %의 분모
    private Double avgChurnRate;  // 그 기간 이탈율(0~1)

    // 위험도 4단계 분포 (모델 tier_edges [25,45,65] 기준, 월별은 일평균 반올림)
    private Integer stableCount;    // 안정  (<25%)
    private Integer watchCount;     // 관찰  (25~45%)
    private Integer interveneCount; // 개입  (45~65%)
    private Integer critCount;      // 긴급  (>=65%)

}
