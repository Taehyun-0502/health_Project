package com.health.app.churn;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ChurnDTO {

    private Long modelId; // 기본키 (int8)
    private Long username; // 아이디 (h_member.username, int8)
    private Long age; // 나이 (int8)
    private Long totalMonth; // 총 이용개월수 (int8)
    private Double visitPerWeek; // 이번달 주당 방문횟수
    private Double averExercise; // 이번달 하루 평균 운동시간
    private Boolean ptYn; // PT 가입여부 (boolean)
    private Boolean groupYn; // 그룹수업 참여여부 (boolean)
    private String timeCong; // 주 이용 시간대 혼잡도 (varchar) : 헬스장 별 매달 회원들의 출석 시간으로 분위수로 계산
    private Long lastDays; // 마지막 방문 경과일 (int8)
    private String contractType; // 계약 유형 (varchar)

}
