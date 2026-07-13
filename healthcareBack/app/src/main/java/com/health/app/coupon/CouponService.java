package com.health.app.coupon;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;

@Service
public class CouponService {

    @Autowired
    private CouponMapper couponMapper;

    @Autowired
    private AlarmService alarmService;

    //회원의 쿠폰보관함 메서드
    public List<CouponDTO> toList(Long username) throws Exception{
        return couponMapper.toList(username);
    }

    
    // 사장님의 새로운 쿠폰 종류(템플릿) 등록
    public int createCoupon(CouponTypeDTO typeDTO) throws Exception {
        return couponMapper.createCoupon(typeDTO);
    }
    // 해당 헬스장의 등록된 쿠폰 종류 목록 조회
    public List<CouponTypeDTO> couponTypeList(Long gymId) throws Exception {
        return couponMapper.couponTypeList(gymId);
    }
    // 사장님의 회원 쿠폰 발송 및 카운팅 증가 트랜잭션 비즈니스 로직
         @Transactional
    public int sendCoupon(CouponDTO couponDTO) throws Exception {
        // 1. 회원 쿠폰함에 발송 기입
        int result = couponMapper.sendCoupon(couponDTO);
        
        // 2. 발송 성공 시 해당 쿠폰 종류의 누적 발송 횟수 1 증가
        if (result > 0) {
            couponMapper.sendCount(couponDTO.getCouponNum());
            
            // 3. 수신 회원에게 실시간 SSE 알림 팝업 전송 (인자 5개 완비)
            alarmService.sendAlarm(
                couponDTO.getToId(),                                     // 1) 수신 회원 (receiver)
                couponDTO.getFromId(),                                   // 2) 발송 사장님 (sender)
                "새로운 쿠폰이 도착했습니다: " + couponDTO.getCouponName(),   // 3) 메시지 (message)
                "/mypage/coupon",                                        // 4) 클릭 시 이동할 경로 (link)
                "COUPON"                                                 // 5) 알림 종류 구분 (category)
            );
        }
        return result;
    }

    // 쿠폰 단건 조회 (결제 시 유효성 검증용)
    public CouponDTO getCouponById(Long couponId) throws Exception {
        return couponMapper.getCouponById(couponId);
    }

    // 쿠폰 사용 처리
    public int markUsed(Long couponId) throws Exception {
        return couponMapper.markUsed(couponId);
    }

    //발송된 쿠폰 상태 조회
    public List<CouponDTO> couponStatus(Long fromId)throws Exception{
        return couponMapper.couponStatus(fromId);
    }

}
