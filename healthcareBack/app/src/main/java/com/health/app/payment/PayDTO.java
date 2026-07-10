package com.health.app.payment;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

/**
 * 회원이 직접 확정하는 결제 자체를 담는 데이터 전송 객체 (DTO)
 * h_pay 테이블과 매핑됩니다. 결제 확정 시 매출 원장(h_payment)에 트리거로 반영됩니다.
 */
@Getter
@Setter
@ToString
public class PayDTO {

    // 결제 PK
    private Long pId;
    // 계약 id
    private Long dataId;
    // username (전화번호)
    private Long username;
    // 결제 금액 (쿠폰 할인 반영 후 최종 금액)
    private Long pPrice;
    // 사용된 쿠폰 id (미사용 시 null)
    private Long couponId;
    // 결제 항목명
    private String pName;
    // 결제 발생일
    private LocalDate createdAt;

}
