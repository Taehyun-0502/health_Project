package com.health.app.settle;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Setter
@Getter
@ToString
public class PayDTO {

    // 결제 PK
    private Long payId;
    // username (전화번호)
    private Long username;
    // 사업자 id
    private Long gymId;
    // 계약 데이터 id
    private Long dataId;
    // 할부 여부
    private int installment;
    // 결제 금액
    private Long payPrice;
    // 결제 날짜
    private LocalDate payDate;
    // 결제 항목
    private String payName;

}
