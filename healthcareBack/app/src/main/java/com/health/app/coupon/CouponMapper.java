package com.health.app.coupon;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CouponMapper {

    public List<CouponDTO> toList(Long username) throws Exception;
}
