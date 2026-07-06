package com.health.app.membership;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

import com.health.app.user.UserDTO;

@Mapper

public interface MembershipMapper {

    public List<UserDTO> list (Long username) throws Exception;
}
