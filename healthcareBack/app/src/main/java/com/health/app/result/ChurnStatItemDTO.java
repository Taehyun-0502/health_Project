package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 헬스장 이탈 통계 — 요인/불만 항목별 비율(롱포맷 한 행)
@Getter
@Setter
@ToString
public class ChurnStatItemDTO {

    private String statType;     // 'factor'(이탈요인) | 'complaint'(불만이유)
    private String statKey;      // factor=피처키, complaint=항목명(예: 서비스불만_환경불편)
    private Integer memberCount; // 분자(해당 항목에 걸린 회원 수 / 월별은 합계)
    private Double pct;          // 비율(%) = member_count / total_members

}
