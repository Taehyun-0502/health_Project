package com.health.app.settle;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class ExpenseDTO {

    // 지출 입력 ID PK
    private Long expenseId;
    // 사업장 id
    private Long gymId;
    // 계약 데이터 id
    private Long dateId;
    // 지출 항목
    private String expenseName;
    // 지출 날짜(결제일)
    private LocalDate expenseDate;
    // 지출 가격
    private Long expensePrice;
    // 비율 (커미션 비율 및 트레이너 인센 비율)
    private double expenseRate;

}
