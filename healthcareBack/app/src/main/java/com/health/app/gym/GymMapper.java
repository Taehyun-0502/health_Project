package com.health.app.gym;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface GymMapper {

    //회원가입시 gym_id를 가져오는 메서드
    public List<GymDTO> selectId()throws Exception;
}
