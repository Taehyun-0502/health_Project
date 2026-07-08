package com.health.app.contract;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberMapper;
import com.health.app.member.MemberService;

@Service
public class ContractService {

    @Autowired
    private ContractMapper contractMapper;

    @Autowired
    private MemberMapper memberMapper;

    @Autowired
    private MemberService memberService;

    // 전화번호를 회원 아이디와 동일한 뒷 8자리 숫자로 변환하는 헬퍼 메서드 (MemberService 포맷 규칙과 일치)
    private Long toEightDigits(Long phone) {
        String phoneStr = String.valueOf(phone);
        if (phoneStr.length() > 8) {
            phoneStr = phoneStr.substring(phoneStr.length() - 8);
        }
        return Long.parseLong(phoneStr);
    }

    // 로그인 권한별 계약 유저 리스트 조회 비즈니스 로직
    public List<ContractDTO> contractUserList(ContractDTO contractDTO) throws Exception {
        String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
        contractDTO.setRole(role);

        // 허용되지 않은 권한(MEMBER 포함)은 접근 차단 플래그로 null 반환
        if (role == null
                || !(role.equals("ADMIN") || role.equals("OWNER") || role.equals("TRAINER"))) {
            return null;
        }
        return contractMapper.contractUserList(contractDTO);
    }

    // 계약서 발행 비즈니스 로직
    // 미가입 수신자는 발행과 동시에 자동 회원가입(3,4번 계약 -> member, 2번 계약 -> trainer)
    // 발행과 가입이 하나의 트랜잭션으로 묶여 실패 시 함께 롤백
    @Transactional
    public int contractInsert(ContractDTO contractDTO) throws Exception {
        String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
        Long contract = contractDTO.getContract();

        // 권한별 발행 가능한 계약 유형 검증
        boolean allowed =
                ("ADMIN".equals(role) && Long.valueOf(1).equals(contract))
                || ("OWNER".equals(role) && contract != null
                        && (contract == 2 || contract == 3 || contract == 4));
        if (!allowed) {
            return -1; // 발행 권한 없음 플래그 반환
        }

        // 수신자 이름 필수 검증
        if (contractDTO.getReceiverName() == null || contractDTO.getReceiverName().isBlank()) {
            return -2; // 수신자 정보 누락 플래그 반환
        }

        // 계약 대상 사업장 세팅: OWNER는 본인 사업장, ADMIN은 수신 Owner의 사업장
        MemberDTO find = new MemberDTO();
        find.setUsername("ADMIN".equals(role) ? contractDTO.getReceiverId() : contractDTO.getSenderId());
        if (find.getUsername() != null) {
            MemberDTO gymOwner = memberMapper.idcheck(find);
            if (gymOwner != null) {
                contractDTO.setGymId(gymOwner.getGymId());
            }
        }

        // 수신자 번호를 회원 아이디와 동일한 뒷 8자리 포맷으로 정돈 (MemberService 포맷 규칙과 일치)
        if (contractDTO.getReceiverId() != null) {
            contractDTO.setReceiverId(toEightDigits(contractDTO.getReceiverId()));

            // 미가입 수신자 자동 회원가입 (MemberService.autoJoin 연결)
            // 3,4번 계약 -> role 'member', 2번 계약 -> role 'trainer'로 가입되고
            // 이미 가입된 경우(0)와 자동가입 대상이 아닌 계약(-4)은 그대로 발행 진행됨
            memberService.autoJoin(contractDTO);
        }

        // 담당 트레이너 번호도 8자리 포맷으로 정돈 (h_member FK 제약과 일치)
        if (contractDTO.getManagerId() != null) {
            contractDTO.setManagerId(toEightDigits(contractDTO.getManagerId()));
        }

        // 초기 상태는 발행됨(서명대기)
        contractDTO.setStatus("ISSUED");
        return contractMapper.contractInsert(contractDTO);
    }

    // 계약서 상세 조회 비즈니스 로직
    public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception {
        ContractDTO detail = contractMapper.contractDetail(contractDTO);
        if (detail == null) {
            return null;
        }

        String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
        Long loginId = contractDTO.getUsername();
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
    public int contractSign(ContractDTO contractDTO) throws Exception {
        ContractDTO detail = contractMapper.contractDetail(contractDTO);
        if (detail == null) {
            return -1; // 존재하지 않는 계약서 플래그 반환
        }

        // 계약 당사자(발행자-대면 서명 / 수신자)만 서명 가능
        Long loginId = contractDTO.getUsername();
        boolean party = loginId != null
                && (loginId.equals(detail.getSenderId()) || loginId.equals(detail.getReceiverId()));
        if (!party) {
            return -2; // 서명 권한 없음 플래그 반환
        }

        // 이미 서명 완료된 계약서에 재서명 요청 시 예외 처리
        if (!"ISSUED".equals(detail.getStatus())) {
            return -3; // 서명 불가 상태 플래그 반환
        }

        return contractMapper.contractSign(contractDTO);
    }
}
