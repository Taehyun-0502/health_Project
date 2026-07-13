package com.health.app.member;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MemberMapper {

    // 회원가입 메서드
    public int join(MemberDTO memberDTO) throws Exception;

    // 아이디 중복확인 메서드
    public MemberDTO idcheck(MemberDTO memberDTO) throws Exception;

    // 회원정보 수정 메서드
    public int update(MemberDTO memberDTO) throws Exception;

    // 권한(role) 기준 회원 목록 조회 메서드 - 시스템 알림(정산 배치 실패 등) 발송 대상(ADMIN) 조회용
    public List<MemberDTO> findByRole(String role) throws Exception;

    // gym_id 기준 사장님(OWNER) 계정 단건 조회 메서드 - 알림 발송 대상(username) 식별용
    public MemberDTO findOwnerByGymId(Long gymId) throws Exception;

    // gym_id 기준 지점별 소속 일반 회원 목록 조회 메서드
    public List<MemberDTO> findMembersByGymId(Long gymId) throws Exception;
}
