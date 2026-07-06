package com.health.app.settle;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SettleMapper {

    public int payAdd(PayDTO payDTO) throws Exception;

    public List<PayDTO> payList() throws Exception;

}
