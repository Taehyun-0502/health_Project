package com.health.app.member;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MemberMapper {

    // 회원가입 메서드
    public int join(MemberDTO memberDTO) throws Exception;

    // 아이디 중복확인 메서드
    public MemberDTO idcheck(MemberDTO memberDTO) throws Exception;

    // 회원정보 수정 메서드
    public int update(MemberDTO memberDTO) throws Exception;
}
