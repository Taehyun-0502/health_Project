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
    private Integer totalMembers; // 분모(예측 회원수) — 월별은 일평균 반올림
    private Double avgChurnRate;  // 그 기간 이탈율(0~1)

}
