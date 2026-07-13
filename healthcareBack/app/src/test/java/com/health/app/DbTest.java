package com.health.app;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.health.app.coupon.CouponMapper;
import com.health.app.coupon.CouponDTO;

@SpringBootTest
public class DbTest {

    @Autowired
    private CouponMapper couponMapper;

    @Test
    public void testDatabaseSchema() {
        try {
            System.out.println("====== MAPPER toList TEST START ======");
            
            System.out.println("--- toList(66666602L) ---");
            List<CouponDTO> list1 = couponMapper.toList(66666602L);
            for (CouponDTO c : list1) {
                System.out.println(c);
            }

            System.out.println("--- toList(66666618L) ---");
            List<CouponDTO> list2 = couponMapper.toList(66666618L);
            for (CouponDTO c : list2) {
                System.out.println(c);
            }

            System.out.println("====== MAPPER toList TEST END ======");
        } catch (Exception e) {
            System.out.println("====== ERROR DETECTED ======");
            e.printStackTrace();
        }
    }
}
