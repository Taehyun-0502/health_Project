package com.health.app.user;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {

    // 로그인 권한별 계약 유저 리스트 조회 메서드
    public List<UserDTO> contractUserList(UserDTO userDTO) throws Exception;

    // 계약서 발행(등록) 메서드
    public int contractInsert(UserDTO userDTO) throws Exception;
}
