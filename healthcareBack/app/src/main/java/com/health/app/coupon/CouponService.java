package com.health.app.coupon;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class CouponService {

    @Autowired
    private CouponMapper couponMapper;

    //회원의 쿠폰보관함 메서드
    public List<CouponDTO> toList(Long username) throws Exception{
        return couponMapper.toList(username);
    }
}
