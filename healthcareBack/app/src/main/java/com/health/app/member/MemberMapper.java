package com.health.app.member;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface MemberMapper {

    // 회원가입 메서드
    public int join(MemberDTO memberDTO) throws Exception;

    // 아이디 중복확인 메서드
    public MemberDTO idcheck(MemberDTO memberDTO) throws Exception;

    // 로그인 전용 조회 메서드 - h_gym left join으로 gymName(소속 지점명)까지 함께 반환 (LNB 브랜드 노출용)
    public MemberDTO loginLookup(MemberDTO memberDTO) throws Exception;

    // 회원정보 수정 메서드
    public int update(MemberDTO memberDTO) throws Exception;

    // 권한(role) 기준 회원 목록 조회 메서드 - 시스템 알림(정산 배치 실패 등) 발송 대상(ADMIN) 조회용
    public List<MemberDTO> findByRole(String role) throws Exception;

    // gym_id 기준 사장님(OWNER) 계정 단건 조회 메서드 - 알림 발송 대상(username) 식별용
    public MemberDTO findOwnerByGymId(Long gymId) throws Exception;

    // gym_id 기준 지점별 소속 일반 회원 목록 조회 메서드
    public List<MemberDTO> findMembersByGymId(Long gymId) throws Exception;

    // 리프레쉬토큰 저장,갱신 메서드
    public int updateToken(RefreshTokenDTO refreshTokenDTO) throws Exception;

    // 2. 리프레쉬 토큰 대조 조회 (토큰 갱신 API용)
    public RefreshTokenDTO getRefreshToken(String refreshToken) throws Exception;
    
    // 3. 리프레쉬 토큰 영구 소거 (로그아웃 API용)
    public int deleteToken(Long username) throws Exception;
}
