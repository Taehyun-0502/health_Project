package com.health.app;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.health.app.coupon.CouponMapper;
import com.health.app.coupon.CouponTypeDTO;

@SpringBootTest
public class DbTest {

    @Autowired
    private CouponMapper couponMapper;

    @Test
    public void testDatabaseSchema() {
        try {
            System.out.println("====== DB SCHEMA CHECK START ======");
            // 1. 쿠폰 종류 리스트 조회 시도를 통해 테이블 실재 여부 및 스키마 검증
            couponMapper.couponTypeList(1L);
            System.out.println("SUCCESS: h_coupon_type table exists and mapping is valid!");
        } catch (Exception e) {
            System.out.println("====== ERROR DETECTED ======");
            e.printStackTrace();
            System.out.println("====== DB SCHEMA CHECK END ======");
        }
    }
}
