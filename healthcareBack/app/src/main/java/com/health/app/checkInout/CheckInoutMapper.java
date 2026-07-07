package com.health.app.checkInout;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface CheckInoutMapper {

    public List<CheckInoutDTO> list(Long username) throws Exception;

}
