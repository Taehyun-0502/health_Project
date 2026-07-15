package com.health.app.checkInout;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class CheckInoutDTO {

    private Long id;
    private Long username;
    private LocalDateTime checkIn;
    private Long duration;

    // 출석 페이지(키오스크) 확장 컬럼 - PK는 기존 id 필드(실컬럼명 id) 재사용
    private Long gymId; // 사업장 ID
    private Long inoutType; // 출석 유형 (1=헬스장, 2=PT)
    private Long trainerId; // PT 담당 트레이너 (계약의 manager_id 스냅샷)
    private LocalDateTime trainerConfirm; // 트레이너 확인 시각 (null=미확인, 확인 시점에 잔여횟수 차감)

    // 조회 표시용 조인 필드 (h_member / h_contract_data)
    private String memberName; // 회원 이름
    private String trainerName; // 트레이너 이름 (사장님 지점 캘린더용)
    private Integer remainingCount; // PT 잔여횟수

}
