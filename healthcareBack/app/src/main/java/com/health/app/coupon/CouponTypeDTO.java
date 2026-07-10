package com.health.app.coupon;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class CouponTypeDTO {

    private Long couponNum;      // 쿠폰 종류 번호 (PK, 자동증가)
    private String category;     // 헬스 / PT 구분
    private Integer percent;     // 할인률% (0~100)
    private String couponName;   // 쿠폰 이름
    private Long gymId;          // 적용 헬스장 ID
    private Integer couponDate;  // 적용가능한 개월수 (null 허용)
    private Integer couponCount; // PT 횟수 (null 허용)
    private Integer sendCount;   // 누적 발송 횟수    

}
