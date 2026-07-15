package com.health.app.checkInout;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 사장님용 재등록 임박 리스트 DTO - PT(잔여 3회 이하)와 이용권(종료 7일 이내)을 한 목록으로 통합
@Getter
@Setter
@ToString
public class RebookDTO {

    private String category; // 'PT' 또는 '이용권'
    private Long dataId; // 계약 id
    private Long username; // 회원 (전화번호)
    private String memberName; // 회원 이름
    private String trainerName; // 담당 트레이너 이름 (PT만, 이용권은 null)
    private Integer remainingCount; // PT 잔여 횟수 (이용권은 null)
    private LocalDate endDate; // 계약 종료일

}
