package com.health.app.contract;

import java.time.LocalDate;
import com.health.app.member.MemberDTO;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// 체험권 계약 대상 목록 행 DTO
// h_coupon_type(category='체험권') -> h_coupon -> h_member 조인 결과 + PT 체험 발행폼 자동 입력 정보
@Getter
@Setter
@ToString
public class TrialTargetDTO {

    private Long couponId; // 발급 쿠폰 식별자 (h_coupon PK)
    private Long couponNum; // 쿠폰 유형 연결 (h_coupon_type PK)
    private String couponName; // 쿠폰 이름
    private Long couponCount; // 체험 PT 횟수 (PT 체험 계약의 quantity로 사용)
    private LocalDate couponExpire; // 쿠폰 만료일 (목록 조회 조건으로만 사용)

    // 대상 회원 정보 (발행폼 자동 입력용)
    private MemberDTO member;

    // 기존 이용권(3)/PT(4) 연계 정보 - PT 체험 발행 시 related_data_id 및 담당 트레이너 초기값
    private Long baseDataId; // 유효한 기본 계약 data_id
    private Long baseContract; // 기본 계약 유형 (3 또는 4)
    private Long baseManagerId; // 기본 계약이 PT(4)면 담당 트레이너 초기값
}
