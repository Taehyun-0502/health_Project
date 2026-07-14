package com.health.app.result;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 특정 기간(일별/월별) 위험군에 속한 회원 1명 + 이탈이유(h_churn_result top1~3)
@Getter
@Setter
@ToString
public class ChurnRiskMemberDTO {

    private Long username;       // 회원 전화번호(ID)
    private String name;         // 회원 이름
    private Double churnRate;    // 그 회원의 이탈율(0~1)
    private String top1Reason;   // 이탈이유 1순위
    private String top2Reason;   // 이탈이유 2순위
    private String top3Reason;   // 이탈이유 3순위

}
