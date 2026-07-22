package com.health.app.settle;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * 사장님(OWNER) 정산 페이지 우측 "이번 달 요약" 레일용 월별 집계 DTO.
 * 모든 값은 인증 사용자(username)의 소속 gym_id 범위로만 집계한다(테넌트 격리).
 *  - 순이익 = salesTotal - expenseTotal (프론트에서 파생)
 *  - 커미션 지급 = 관계사에 내는 커미션 정산(h_settlement) 기준
 *  - 월급 지급 = 임금계약(2) 연동 지출 기준
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class OwnerSummaryDTO {

    // 해당 월 매출(h_payment) 합계
    private long salesTotal;
    // 해당 월 지출(h_expense) 합계
    private long expenseTotal;
    // 해당 월 커미션 지급 완료 금액(h_settlement status='지급')
    private long commissionPaid;
    // 커미션 미지급 건수(h_settlement status='미지급')
    private long commissionPending;
    // 해당 월 월급(임금계약 2 연동 지출) 지급 금액
    private long wagePaid;
    // 아직 지출 미등록인 임금계약(2) 대기 건수
    private long wagePending;

}
