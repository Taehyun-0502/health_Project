package com.health.app.survey;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class SurveyDTO {

    private Long surveyId;       // 기본키 (int8)
    private Long username;       // 회원 전화번호 (h_member.username, int8)
    private Long costRate;       // 가격 만족도 (int8)
    private Long employeeRate;   // 직원 만족도 (int8)
    private Long serviceRate;    // 서비스 만족도 (int8)
    private Long equipRate;      // 기구 만족도 (int8)
    private Boolean memberIssue; // 불편 회원 경험 여부 (boolean)
    private Boolean injuryIssue; // 부상 경험 여부 (boolean)
    private String injuryArea;   // 부상 부위 (varchar)
}
