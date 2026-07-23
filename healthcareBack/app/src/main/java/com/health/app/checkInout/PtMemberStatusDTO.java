package com.health.app.checkInout;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 트레이너 담당 회원 현황 DTO - 유효 PT형 계약별 총횟수/사용/잔여 (h_contract_data 조회 + h_pt_manage 조인)
@Getter
@Setter
@ToString
public class PtMemberStatusDTO {

    private Long dataId; // PT 계약 id
    private Long contract; // 계약 유형 (4=PT, 5=PT 체험) - 트레이너가 체험 회원을 구분해 전환 제안하도록 노출
    private Long username; // 회원 (전화번호)
    private String memberName; // 회원 이름
    private Integer totalCount; // 총 PT 횟수 (계약 quantity)
    private Integer usedCount; // 사용 횟수 (h_pt_manage)
    private Integer remainingCount; // 잔여 횟수
    private LocalDate startDate; // 계약 시작일
    private LocalDate endDate; // 계약 종료일

}
