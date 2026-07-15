package com.health.app.member;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.health.app.config.JwtUtill;
import com.health.app.contract.ContractDTO;

@Service
public class MemberService {

    @Autowired
    private MemberMapper memberMapper;

    @Autowired
    private org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder passwordEncoder; // ◀ 인코더 주입 (신규 추가)

    @Autowired
    private JwtUtill jwtUtill;

    // 권한(role) 기준 회원 목록 조회 메서드
    public List<MemberDTO> findByRole(String role) throws Exception {
        return memberMapper.findByRole(role);
    }

    // gym_id 기준 사장님(OWNER) 계정 단건 조회 메서드
    public MemberDTO findOwnerByGymId(Long gymId) throws Exception {
        return memberMapper.findOwnerByGymId(gymId);
    }

    // gym_id 기준 지점별 소속 일반 회원 목록 조회 메서드
    public List<MemberDTO> findMembersByGymId(Long gymId) throws Exception {
        return memberMapper.findMembersByGymId(gymId);
    }


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

        // [BCrypt 암호화] 가입 비밀번호를 해시 암호문으로 치환
        String hashedPassword = passwordEncoder.encode(memberDTO.getPassword());
        memberDTO.setPassword(hashedPassword);

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
        
        // [BCrypt 암호화] 기본 비밀번호(전화번호 뒷 8자리)를 해시 암호문으로 자동 치환 주입
        String hashedDefaultPw = passwordEncoder.encode(username.toString());
        newMember.setPassword(hashedDefaultPw);
        newMember.setPasswordCheck(hashedDefaultPw);
        
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
        
        // [BCrypt 비교 처리] 비밀번호 인코더의 matches 함수를 통해 암호문 매칭 검증
        if (!passwordEncoder.matches(memberDTO.getPassword(), existMember.getPassword())) {
            return null; // 비밀번호 불일치
        }
        
        // 보안상 비밀번호 필드는 지우고 반환
        existMember.setPassword(null);
        return existMember;
    }

    // 로그인 성공 후 Access 및 Refresh 토큰 발행 및 DB 저장
    public Map<String, String> generateLoginTokens(MemberDTO member) throws Exception {
        // 1. 유효기간이 다른 두 종류의 토큰 생성 (JwtUtill 활용)
        String accessToken = jwtUtill.generateToken(member.getUsername().toString(), member.getRole());
        String refreshToken = jwtUtill.generateRefreshToken(member.getUsername().toString());
        
        // 2. DB h_refresh_token 테이블에 토큰 저장용 DTO 바인딩 조립
        RefreshTokenDTO tokenDTO = new RefreshTokenDTO();
        tokenDTO.setUsername(member.getUsername());
        tokenDTO.setRefreshToken(refreshToken);
        tokenDTO.setExpiryDate(jwtUtill.getExpiryDateTime()); // 7일 만료일 계산
        
        // 3. MemberMapper.java에 추가 선언했던 updateToken 호출 (저장 혹은 기존토큰 덮어쓰기)
        memberMapper.updateToken(tokenDTO);
        
        // 4. 프론트엔드로 리턴해 주기 위해 Map에 키-값 매핑
        Map<String, String> tokenMap = new java.util.HashMap<>();
        tokenMap.put("accessToken", accessToken);
        tokenMap.put("refreshToken", refreshToken);
        
        return tokenMap;
    }

    // 리프레쉬 토큰 대조 검증 후 새로운 Access Token 단독 발급
    public String refreshAccessToken(String refreshToken) throws Exception {
        // 1. 토큰 포맷 및 위조/만료 여부 1차 유효성 검사 (JwtUtill 활용)
        if (!jwtUtill.isRefreshTokenValid(refreshToken)) {
            throw new IllegalArgumentException("유효하지 않거나 만료된 리프레쉬 토큰입니다.");
        }
        
        // 2. 데이터베이스에 보관 중인 토큰인지 2차 조회 대조
        RefreshTokenDTO dbToken = memberMapper.getRefreshToken(refreshToken);
        if (dbToken == null) {
            throw new IllegalArgumentException("존재하지 않거나 만료된 로그인 세션 토큰입니다. 다시 로그인해 주세요.");
        }
        
        // 3. 데이터베이스에 적재된 만료예정 시각(LocalDateTime) 최종 대조 검사
        if (dbToken.getExpiryDate().isBefore(java.time.LocalDateTime.now())) {
            throw new IllegalArgumentException("만료된 로그인 세션입니다. 다시 로그인해 주세요.");
        }
        
        // 4. 새 액세스 토큰 발행에 필요한 회원 권한(role)을 Member 테이블에서 즉각 조회
        MemberDTO query = new MemberDTO();
        query.setUsername(dbToken.getUsername());
        MemberDTO member = memberMapper.idcheck(query);
        
        String role = member != null ? member.getRole() : "MEMBER"; // 기본값 MEMBER 매핑
        
        // 5. 모든 검증을 완료했으므로 30분 만료의 새로운 Access Token 단독 발급하여 리턴
        return jwtUtill.generateToken(dbToken.getUsername().toString(), role);
    }

    // 로그아웃 시 DB 내 해당 회원 리프레쉬 토큰 삭제
    public int deleteToken(Long username) throws Exception {
        // 기존에 선언되어 작동 중인 8자리 변환 헬퍼 메서드 거치기
        Long formattedUsername = this.formatUsernameToEightDigits(username);
        return memberMapper.deleteToken(formattedUsername);
    }
}
