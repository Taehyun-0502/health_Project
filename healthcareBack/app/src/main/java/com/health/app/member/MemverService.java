package com.health.app.member;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class MemverService {

    @Autowired
    private MemberMapper memberMapper;

    public int join(MemberDTO memberDTO)throws Exception{
        if (memberDTO.getPassword() == null || !memberDTO.getPassword().equals(memberDTO.getPasswordCheck())) {
            return -1;
        }
        // 가입 시 아이디 중복 체크 방어 코드 추가
        if (this.idcheck(memberDTO) != null) {
            return -2; // 아이디 중복 플래그 반환
        }
        return memberMapper.join(memberDTO);
    } 

    // 아이디 중복체크 비즈니스 로직 메서드
    public MemberDTO idcheck(MemberDTO memberDTO) throws Exception {
        return memberMapper.idcheck(memberDTO);
    }

    // 로그인 비즈니스 로직 검증 메서드
    public MemberDTO login(MemberDTO memberDTO) throws Exception {
        // 아이디(전화번호)에 해당하는 회원 정보 조회 (기존 idcheck 쿼리 재활용)
        MemberDTO existMember = memberMapper.idcheck(memberDTO);
        if (existMember == null) {
            return null; // 가입되지 않은 전화번호
        }
        // 입력 비밀번호와 가입된 비밀번호 비교
        if (!existMember.getPassword().equals(memberDTO.getPassword())) {
            return null; // 비밀번호 불일치
        }
        // 보안상 비밀번호 필드는 지우고 반환
        existMember.setPassword(null);
        return existMember;
    }

}
