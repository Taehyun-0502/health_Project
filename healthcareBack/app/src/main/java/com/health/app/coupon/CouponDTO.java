package com.health.app.coupon;

import java.time.LocalDate;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class CouponDTO {

    private Long couponId;
    private Long fromId;    //발신자
    private Long toId;  //수신자
    private String couponName;  //쿠폰명
    private LocalDate date; //유효기간
    private String status;  //상태 (미사용 사용완료 유효기간만료)\
    private String fromName; //h_member테이블과 조인한 이름
}
