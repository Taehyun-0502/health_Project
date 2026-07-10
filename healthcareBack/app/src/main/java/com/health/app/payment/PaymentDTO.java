package com.health.app.payment;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * 회원의 계약 연동 결제(매출) 데이터를 담는 데이터 전송 객체 (DTO)
 * h_payment 테이블과 매핑됩니다.
 */
@Setter
@Getter
@ToString
public class PaymentDTO {

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

    // 사용된 쿠폰 id (h_pay 연동 결제가 아니거나 쿠폰 미사용 시 null)
    private Long couponId;
    // 사용된 쿠폰명
    private String couponName;
    // 쿠폰 할인 금액 (쿠폰 미사용 시 null)
    private Long discountAmount;

}
