package com.health.app.settle;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * 사업장(Gym)에서 자체적으로 기록 및 관리하는 지출 및 운영 비용 데이터를 담는 DTO
 * h_expense 테이블과 매핑됩니다.
 */
@Getter
@Setter
@ToString
public class ExpenseDTO {

    // 지출 입력 ID PK
    private Long expenseId;
    // 사업장 id
    private Long gymId;
    // 계약 데이터 id
    private Long dataId;
    // 지출 항목
    private String expenseName;
    // 지출 날짜(결제일)
    private LocalDate expenseDate;
    // 지출 가격
    private Long expensePrice;
    // 비율 (커미션 비율 및 트레이너 인센 비율)
    private double expenseRate;

}
