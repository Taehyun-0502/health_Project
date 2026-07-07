package com.health.app.user;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.member.MemberDTO;
import com.health.app.member.MemberMapper;
import com.health.app.member.MemberService;

@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private MemberMapper memberMapper;

    @Autowired
    private MemberService memberService;

    // 로그인 권한별 계약 유저 리스트 조회 비즈니스 로직
    // ADMIN/OWNER/TRAINER만 접근 가능, MEMBER는 B2B 어드민 페이지 접근 불가
    public List<UserDTO> contractUserList(UserDTO userDTO) throws Exception {
        // DB에 role이 소문자(owner 등)로 저장되어 있어 대문자로 통일 후 비교
        String role = userDTO.getRole() == null ? null : userDTO.getRole().toUpperCase();
        userDTO.setRole(role);

        // 허용되지 않은 권한(MEMBER 포함)은 접근 차단 플래그로 null 반환
        if (role == null
                || !(role.equals("ADMIN") || role.equals("OWNER") || role.equals("TRAINER"))) {
            return null;
        }
        return userMapper.contractUserList(userDTO);
    }

    // 계약서 발행 비즈니스 로직
    // 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3=이용권, 4=PT)
    // ADMIN: 제휴(1)만 / OWNER: 임금(2)·이용권(3)·PT(4)만 발행 가능
    // 미가입 수신자(trainer/member)는 발행 시 자동 회원가입 후 연결 - 발행과 가입을 한 트랜잭션으로 묶음
    @Transactional
    public int contractInsert(UserDTO userDTO) throws Exception {
        String role = userDTO.getRole() == null ? null : userDTO.getRole().toUpperCase();
        Long contract = userDTO.getContract();

        // 권한별 발행 가능한 계약 유형 검증
        boolean allowed =
                ("ADMIN".equals(role) && Long.valueOf(1).equals(contract))
                || ("OWNER".equals(role) && contract != null
                        && (contract == 2 || contract == 3 || contract == 4));
        if (!allowed) {
            return -1; // 발행 권한 없음 플래그 반환
        }

        // 수신자 이름 필수 검증 (미가입자도 스냅샷 이름은 필요)
        if (userDTO.getReceiverName() == null || userDTO.getReceiverName().isBlank()) {
            return -2; // 수신자 정보 누락 플래그 반환
        }

        // 계약 대상 사업장 세팅: OWNER는 본인 사업장, ADMIN은 수신 Owner의 사업장 (h_member 조회 재활용)
        MemberDTO find = new MemberDTO();
        find.setUsername("ADMIN".equals(role) ? userDTO.getReceiverId() : userDTO.getSenderId());
        if (find.getUsername() != null) {
            MemberDTO gymOwner = memberMapper.idcheck(find);
            if (gymOwner != null) {
                userDTO.setGymId(gymOwner.getGymId());
            }
        }

        // 수신자 번호를 회원 아이디와 동일한 뒷 8자리 포맷으로 정돈 (MemberService 포맷 규칙과 일치)
        if (userDTO.getReceiverId() != null) {
            String phoneStr = String.valueOf(userDTO.getReceiverId());
            if (phoneStr.length() > 8) {
                phoneStr = phoneStr.substring(phoneStr.length() - 8);
            }
            userDTO.setReceiverId(Long.parseLong(phoneStr));

            // 미가입 trainer/member 수신자 자동 회원가입 (MemberService 회원가입 로직 연결)
            // 이미 가입된 경우(0)와 자동가입 대상이 아닌 계약(-4)은 그대로 진행됨
            memberService.autoJoin(userDTO);
        }

        // 초기 상태는 발행됨(서명대기)
        userDTO.setStatus("ISSUED");
        return userMapper.contractInsert(userDTO);
    }

    // 계약서 상세 조회 비즈니스 로직
    // ADMIN 또는 계약 당사자(발행자/수신자/PT 담당 트레이너)만 열람 가능
    public UserDTO contractDetail(UserDTO userDTO) throws Exception {
        UserDTO detail = userMapper.contractDetail(userDTO);
        if (detail == null) {
            return null;
        }

        String role = userDTO.getRole() == null ? null : userDTO.getRole().toUpperCase();
        Long loginId = userDTO.getUsername();
        boolean party = loginId != null
                && (loginId.equals(detail.getSenderId())
                        || loginId.equals(detail.getReceiverId())
                        || loginId.equals(detail.getManagerId()));
        if (!"ADMIN".equals(role) && !party) {
            return null; // 당사자가 아니면 열람 차단
        }
        return detail;
    }

    // 계약서 서명 비즈니스 로직 (ISSUED -> SIGNED)
    public int contractSign(UserDTO userDTO) throws Exception {
        UserDTO detail = userMapper.contractDetail(userDTO);
        if (detail == null) {
            return -1; // 존재하지 않는 계약서 플래그 반환
        }

        // 계약 당사자(발행자-대면 서명 / 수신자)만 서명 가능
        Long loginId = userDTO.getUsername();
        boolean party = loginId != null
                && (loginId.equals(detail.getSenderId()) || loginId.equals(detail.getReceiverId()));
        if (!party) {
            return -2; // 서명 권한 없음 플래그 반환
        }

        // 이미 서명 완료된 계약서에 재서명 요청 시 예외 처리 (무결성 검증)
        if (!"ISSUED".equals(detail.getStatus())) {
            return -3; // 서명 불가 상태 플래그 반환
        }

        // update 조건(status = 'ISSUED')으로 동시성 재방어 - 경합 시 0 반환됨
        return userMapper.contractSign(userDTO);
    }
}
