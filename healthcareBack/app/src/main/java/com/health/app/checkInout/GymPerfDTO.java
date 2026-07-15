package com.health.app.checkInout;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 총괄 관리자(admin)용 매장별 비교 지표 DTO (트레이너 수 / 이번 달 수업·미수행 / 재등록·만료 임박)
@Getter
@Setter
@ToString
public class GymPerfDTO {

    private Long gymId; // 매장 id
    private String gymName; // 매장 상호명
    private Integer trainerCount; // 소속 트레이너 수
    private Integer monthDone; // 이번 달 확인 완료 PT 수업 수
    private Integer monthMissed; // 이번 달 미수행 일정 수
    private Integer rebookCount; // PT 재등록 임박 회원 수 (잔여 3회 이하)
    private Integer expiringCount; // 이용권 만료 임박 수 (종료 7일 이내)

}
