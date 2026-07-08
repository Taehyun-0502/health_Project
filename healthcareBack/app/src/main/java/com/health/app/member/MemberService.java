package com.health.app.member;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.health.app.contract.ContractDTO;

@Service
public class MemberService {

    @Autowired
    private MemberMapper memberMapper;

    public int update(MemberDTO memberDTO) throws Exception {
        // 1. 공백 및 필수값 검증
    if (memberDTO.getPassword() == null || memberDTO.getPassword().trim().isEmpty()) {
            return -1; 
    }
        
    // 2. 새로운 비밀번호와 비밀번호 확인 일치 대조 검증
    if (!memberDTO.getPassword().equals(memberDTO.getPasswordCheck())) {
        return -2; // 비밀번호 불일치 에러 플래그 리턴
    }
    return memberMapper.update(memberDTO);
    }
    
    // 입력받은 전화번호(username)를 안전하게 뒷자리 8자리 숫자로 변환하는 헬퍼 메서드
    private Long formatUsernameToEightDigits(Long username) {
        if (username == null) {
            return null;
        }
        String phoneStr = String.valueOf(username);
        // 번호 길이가 8자리보다 길 경우, 뒷자리 8자리만 슬라이싱하여 추출 (앞의 010/10 강제 소거)
        if (phoneStr.length() > 8) {
            phoneStr = phoneStr.substring(phoneStr.length() - 8);
        }
        return Long.parseLong(phoneStr);
    }

    // 회원가입 메서드 (admin, owner 등 수동 회원 추가 전용)
    public int join(MemberDTO memberDTO) throws Exception {
        if (memberDTO.getPassword() == null || !memberDTO.getPassword().equals(memberDTO.getPasswordCheck())) {
            return -1;
        }

        // 전화번호 뒷 8자리 변환 전처리 수행
        Long formattedUsername = this.formatUsernameToEightDigits(memberDTO.getUsername());
        memberDTO.setUsername(formattedUsername);

        // 가입 시 아이디 중복 체크 방어 코드
        if (this.idcheck(memberDTO) != null) {
            return -2; // 아이디 중복 플래그 반환
        }
        return memberMapper.join(memberDTO);
    } 

    // 자동회원가입 메서드 (trainer, member 계약서 등록 시 연쇄 가입 전용)
    // 매개변수 타입을 UserDTO에서 ContractDTO로 리팩토링 정정
    public int autoJoin(ContractDTO contractDTO) throws Exception {
        if (contractDTO.getReceiverId() == null) {
            return -3;
        }

        // 계약서의 수신자 번호(receiverId)를 가져와 뒷 8자리 전화번호로 변환
        Long username = this.formatUsernameToEightDigits(contractDTO.getReceiverId());

        // 중복 가입 여부 체크
        MemberDTO check = new MemberDTO();
        check.setUsername(username);
        if (this.idcheck(check) != null) {
            return 0; // 이미 존재하는 계정은 자동가입 생략하고 성공 반환
        }

        // 회원가입 전용 DTO 바인딩 조립
        MemberDTO newMember = new MemberDTO();
        newMember.setUsername(username);
        newMember.setPassword(username.toString());
        newMember.setPasswordCheck(username.toString());
        newMember.setName(contractDTO.getReceiverName());
        newMember.setGymId(contractDTO.getGymId());
        newMember.setBirth(contractDTO.getBirthDate());

        // contract 번호 스펙에 따른 권한(Role) 분기 처리
        Long contractVal = contractDTO.getContract();
        if (contractVal != null) {
            if (contractVal == 2L) {
                // contract 2 -> 트레이너 권한 부여
                newMember.setRole("trainer");
            } else if (contractVal == 3L || contractVal == 4L) {
                // contract 3 또는 4 -> 일반 회원 권한 부여
                newMember.setRole("member");
            } else {
                return -4; // 그 외의 계약(제휴계약 등)은 자동가입 스킵
            }
        } else {
            return -5; // 계약 정보 번호 누락 시 예외 스킵
        }

        return memberMapper.join(newMember);
    }

    // 아이디 중복체크 비즈니스 로직 메서드
    public MemberDTO idcheck(MemberDTO memberDTO) throws Exception {
        // 중복 체크 시에도 8자리 포맷팅 전처리를 하여 일관성 유지
        Long formattedUsername = this.formatUsernameToEightDigits(memberDTO.getUsername());
        memberDTO.setUsername(formattedUsername);
        return memberMapper.idcheck(memberDTO);
    }

    // 로그인 비즈니스 로직 검증 메서드
    public MemberDTO login(MemberDTO memberDTO) throws Exception {
        // 로그인 시에도 유저가 입력한 번호를 8자리 포맷으로 정돈하여 체크
        Long formattedUsername = this.formatUsernameToEightDigits(memberDTO.getUsername());
        memberDTO.setUsername(formattedUsername);

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
