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
        // [신규] 동일 쿠폰의 미사용 상태 중복 발송 차단 가드
        int dupCount = couponMapper.checkDuplicateUnused(couponDTO.getToId(), couponDTO.getCouponNum());
        if (dupCount > 0) {
            throw new IllegalArgumentException("이미 사용하지 않은 동일한 쿠폰을 보유하고 있는 회원입니다.");
        }

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
                "/fitc/mypage/coupon",                                        // 4) 클릭 시 이동할 경로 (link)
                "COUPON"                                                 // 5) 알림 종류 구분 (category)
            );
        }
        return result;
    }

    // 이탈위험(PT_가입여부/부상경험 등) 회원 일괄 발송 — 오늘자 h_churn_result status 0→1 claim 성공한 회원만 발송.
    // 이미 status=1(다른 바에서 발송됨)이거나 오늘 예측 행이 없으면 스킵. 반환: {sent, skipped}.
    @Transactional
    public java.util.Map<String, Integer> sendToChurnMembers(Long fromId, Long couponNum, String couponName,
                                                             java.time.LocalDate date, java.util.List<Long> usernames) throws Exception {
        int sent = 0, skipped = 0;
        if (usernames != null) {
            for (Long toId : usernames) {
                // 오늘자 행 status 0→1 원자적 claim (이미 1이면 0건 → 스킵)
                int claimed = couponMapper.claimChurnStatusToday(toId);
                if (claimed == 0) { skipped++; continue; }

                CouponDTO dto = new CouponDTO();
                dto.setFromId(fromId);
                dto.setToId(toId);
                dto.setCouponNum(couponNum);
                dto.setCouponName(couponName);
                dto.setDate(date);

                couponMapper.sendCoupon(dto);          // h_coupon 적재
                couponMapper.sendCount(couponNum);     // 발송 누적 카운트
                alarmService.sendAlarm(                // h_alarm 적재 + 실시간 알림
                    toId, fromId,
                    "새로운 쿠폰이 도착했습니다: " + couponName,
                    "/fitc/mypage/coupon",
                    "COUPON"
                );
                sent++;
            }
        }
        java.util.Map<String, Integer> result = new java.util.HashMap<>();
        result.put("sent", sent);
        result.put("skipped", skipped);
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
