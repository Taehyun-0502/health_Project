package com.health.app.settle;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * 플랫폼 커미션(수수료) 정보를 담는 데이터 전송 객체 (DTO)
 * h_settlement 테이블과 매핑됩니다.
 */
@Setter
@Getter
@ToString
public class CommissionDTO {

    // 정산 id PK
    private Long settlementId;
    // 사업장 id
    private Long gymId;
    // 받은 커미션 (금액)
    private Long commission;
    // 커미션 받은 날짜
    private LocalDate settledAt;
    // 커미션 비율
    private double commissionRate;
    // 커미션 정산 대상 월
    private LocalDate settleMonth;
    // 커미션 상태 (미지급 , 지급)
    private String status;
    // 지출 입력 id
    private Long expenseId;
    // 사업장 이름
    private String gymName;

}
