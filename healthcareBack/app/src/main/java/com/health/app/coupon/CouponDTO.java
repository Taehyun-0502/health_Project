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
    private Long fromId;      // 발신자 (사장님)
    private Long toId;        // 수신자 (일반회원)
    private LocalDate date;   // 쿠폰 유효기간 만료일
    private String status;    // 상태 (미사용, 사용완료, 유효기간만료)
    private Long couponNum;   // ◀ 쿠폰 종류 외래키(FK) 추가

    // 2. h_coupon_type 조인 컬럼 매핑 (화면 표시용)
    private String couponName;   // 쿠폰명
    private String category;     // 헬스 / PT / 체험권
    private Integer percent;     // 할인율 (0~100)
    private Integer maxAmount;  // 최대 할인 금액
    private Integer couponCount; // 체험권용 적용 횟수
    private Long gymId;          // 소속 헬스장 ID
    
    // 3. h_member 조인 컬럼 매핑 (화면 표시용)
    private String fromName;     // 보낸 사장님 한글 이름
}
