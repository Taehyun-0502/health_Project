package com.health.app.survey;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class SurveyDTO {

    private Long surveyId;        // 기본키 (int8)
    private Long username;        // 아이디 (h_member.username, int8)
    private Long serviceRate1;    // 서비스 비매너 회원 (int8, 1~5)
    private Long serviceRate2;    // 서비스 환경 불편 (int8, 1~5)
    private Long costRate;        // 가격불만 (int8, 1~5)
    private Long equipRate1;      // 기구 상태 불만 (int8, 1~5)
    private Long equipRate2;      // 기구 부족 (int8, 1~5)
    private Long employeeRate1;   // 직원 불친절 (int8, 1~5)
    private Long employeeRate2;   // 직원 전문성 부족 (int8, 1~5)
    private Boolean injuryIssue;  // 최근 한 달 부상 경험 (boolean)
    private String injuryArea;    // 부상 부위 (varchar)
}
