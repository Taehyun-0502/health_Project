package com.health.app.checkInout;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 사장님용 트레이너별 성과 지표 DTO (담당 회원 수 / 이번 달 수업·미수행 / 재등록 임박)
@Getter
@Setter
@ToString
public class TrainerPerfDTO {

    private Long username; // 트레이너 (전화번호)
    private String name; // 트레이너 이름
    private Integer memberCount; // 담당 회원 수 (유효 PT 계약 기준)
    private Integer monthDone; // 이번 달 확인 완료 수업 수
    private Integer monthMissed; // 이번 달 미수행 일정 수 (지난 일정 중 출석 없음)
    private Integer rebookCount; // 재등록 임박 회원 수 (잔여 3회 이하)

}
