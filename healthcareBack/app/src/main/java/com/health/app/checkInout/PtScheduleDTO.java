package com.health.app.checkInout;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// PT 수업 일정(h_pt_schedule) DTO - 트레이너 주도 등록, 회원은 조회 전용
@Getter
@Setter
@ToString
public class PtScheduleDTO {

    private Long scheduleId; // PK
    private Long trainerId; // 트레이너
    private Long username; // 회원
    private Long gymId; // 사업장 ID (계약에서 스냅샷)
    private LocalDateTime scheduleAt; // 수업 예정 일시
    private String memo; // 선택 메모
    private LocalDateTime createdAt; // 등록 시각

    // 조회 표시용 조인 필드 (h_member)
    private String memberName; // 회원 이름 (트레이너 화면용)
    private String trainerName; // 트레이너 이름 (회원 화면용)

}
