package com.health.app.coupon;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CouponMapper {

    //멤버의 쿠폰함조회
    public List<CouponDTO> toList(Long username) throws Exception;

    //사장님의 쿠폰생성
    public int createCoupon(CouponTypeDTO couponTypeDTO) throws Exception;

    // 사장님의 회원 쿠폰 발송
    public int sendCoupon(CouponDTO couponDTO) throws Exception;

    // 해당 헬스장(gymId)의 쿠폰 종류 목록 조회
    public List<CouponTypeDTO> CouponTypeList(Long gymId) throws Exception;

    // 쿠폰 발송 시 누적 발송 횟수 1 증가
    public int SendCount(Long couponNum) throws Exception;

    // 쿠폰 단건 조회 (결제 시 유효성 검증용, h_coupon_type 조인 포함)
    public CouponDTO getCouponById(Long couponId) throws Exception;

    // 쿠폰 사용 처리 (결제 확정 시 상태를 '사용완료'로 변경)
    public int markUsed(Long couponId) throws Exception;
}
