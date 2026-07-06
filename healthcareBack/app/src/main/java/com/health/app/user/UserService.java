package com.health.app.user;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.health.app.member.MemberDTO;
import com.health.app.member.MemberMapper;

@Service
public class UserService {

    @Autowired
    private UserMapper userMapper;

    @Autowired
    private MemberMapper memberMapper;

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
    // ADMIN: 제휴(ADMIN_OWNER)만 / OWNER: 임금·이용권·PT만 발행 가능
    public int contractInsert(UserDTO userDTO) throws Exception {
        String role = userDTO.getRole() == null ? null : userDTO.getRole().toUpperCase();
        String type = userDTO.getContractType();

        // 권한별 발행 가능한 계약 유형 검증
        boolean allowed =
                ("ADMIN".equals(role) && "ADMIN_OWNER".equals(type))
                || ("OWNER".equals(role)
                        && ("OWNER_TRAINER".equals(type)
                                || "OWNER_MEMBER_MEMBERSHIP".equals(type)
                                || "OWNER_MEMBER_PT".equals(type)));
        if (!allowed) {
            return -1; // 발행 권한 없음 플래그 반환
        }

        // 수신자 이름 필수 검증 (미가입자도 스냅샷 이름은 필요)
        if (userDTO.getReceiverName() == null || userDTO.getReceiverName().isBlank()) {
            return -2; // 수신자 정보 누락 플래그 반환
        }

        // 계약 유형별 금액 성격 자동 세팅
        switch (type) {
            case "ADMIN_OWNER" -> userDTO.setAmountType("MONTHLY_FEE");
            case "OWNER_TRAINER" -> userDTO.setAmountType("SALARY");
            case "OWNER_MEMBER_MEMBERSHIP" -> userDTO.setAmountType("MEMBERSHIP_PRICE");
            case "OWNER_MEMBER_PT" -> userDTO.setAmountType("PT_TOTAL");
        }

        // PT 총액 자동 계산 (총 횟수 x 회당 단가)
        if ("OWNER_MEMBER_PT".equals(type)
                && userDTO.getQuantity() != null && userDTO.getUnitPrice() != null) {
            userDTO.setAmount(userDTO.getQuantity() * userDTO.getUnitPrice());
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

        // 초기 상태는 발행됨(서명대기)
        userDTO.setStatus("ISSUED");
        return userMapper.contractInsert(userDTO);
    }
}
