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

        // 조회 전 만료 일괄 갱신 - end_date 경과 계약의 상태(EXPIRED/TERMINATED)를 최신화
        contractMapper.contractExpireSweep();

        return contractMapper.contractUserList(contractDTO);
    }

    // 제휴 계약(1) 대상자 선택용 사장님(OWNER) 목록 조회 비즈니스 로직 (ADMIN 전용)
    // 발행 폼 select에 필요한 최소 정보만 반환 (비밀번호 등 민감 필드 제거)
    public List<MemberDTO> ownerList(String role) throws Exception {
        String upperRole = role == null ? null : role.toUpperCase();
        if (!"ADMIN".equals(upperRole)) {
            return null; // ADMIN 외 접근 차단 플래그 반환
        }

        List<MemberDTO> owners = memberService.findByRole("OWNER");
        for (MemberDTO owner : owners) {
            owner.setPassword(null);
            owner.setPasswordCheck(null);
        }
        return owners;
    }

    // 계약서 발행 비즈니스 로직
    // 발행 시점에는 회원가입하지 않음 - 자동 회원가입은 서명 완료(contractSign) 시점에 수행
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
        // 미가입 수신자여도 receiver_id는 FK가 아니므로 번호만 저장하고, 가입은 서명 시점에 처리
        if (contractDTO.getReceiverId() != null) {
            contractDTO.setReceiverId(toEightDigits(contractDTO.getReceiverId()));
        }

        // 담당 트레이너 번호도 8자리 포맷으로 정돈 (h_member FK 제약과 일치)
        if (contractDTO.getManagerId() != null) {
            contractDTO.setManagerId(toEightDigits(contractDTO.getManagerId()));
        }

        // 임금 계약(2) 재작성 = UPDATE: 같은 사장님-트레이너의 기존 임금 계약이 있으면
        // 신규 INSERT 대신 기존 행을 갱신하고 ISSUED로 재발행 (재고용 시 기존 계약 갱신 활용)
        if (Long.valueOf(2).equals(contract) && contractDTO.getReceiverId() != null) {
            ContractDTO existWage = contractMapper.wageContractFind(contractDTO);
            if (existWage != null) {
                contractDTO.setDataId(existWage.getDataId());
                return contractMapper.wageContractUpdate(contractDTO);
            }
        }

        // 초기 상태는 발행됨(서명대기)
        contractDTO.setStatus("ISSUED");
        return contractMapper.contractInsert(contractDTO);
    }

    // 계약서 상세 조회 비즈니스 로직
    public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception {
        // 조회 전 만료 일괄 갱신 - end_date 경과 계약의 상태(EXPIRED/TERMINATED)를 최신화
        contractMapper.contractExpireSweep();

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

    // 계약서 서명 비즈니스 로직 (ISSUED -> 이용권·PT는 ACTIVE, 그 외 SIGNED)
    // 서명 완료 시점에 미가입 수신자 자동 회원가입(2번 -> trainer, 3·4번 -> member)
    // 서명과 가입이 하나의 트랜잭션으로 묶여 실패 시 함께 롤백
    @Transactional
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

        int result = contractMapper.contractSign(contractDTO);

        // 서명(계약 체결) 완료 시점에 미가입 수신자 자동 회원가입 (MemberService.autoJoin 연결)
        // 2번 계약 -> trainer, 3·4번 계약 -> member로 가입되고
        // 이미 가입된 경우(0)와 자동가입 대상이 아닌 제휴 계약(-4)은 스킵됨
        if (result > 0) {
            Long contract = detail.getContract();
            if (contract != null && (contract == 2 || contract == 3 || contract == 4)) {
                memberService.autoJoin(detail);
            }
        }

        return result;
    }

    // 역할별 리스트/로스터 조회 비즈니스 로직 (계약서 리스트와 별개의 대상 명단 조회)
    // ADMIN: gymId 없으면 제휴 매장 리스트, 있으면 해당 매장 소속 명단
    // OWNER: 클라이언트가 보낸 gymId는 무시하고 본인 소속 gym_id로 강제 (테넌트 격리, 없으면 -1로 차단)
    // TRAINER: 본인 담당(manager_id) PT 계약(4) 회원 명단
    public List<ContractDTO> contractRoster(ContractDTO contractDTO) throws Exception {
        String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();

        // 허용되지 않은 권한(MEMBER 포함)은 접근 차단 플래그로 null 반환
        if (role == null
                || !(role.equals("ADMIN") || role.equals("OWNER") || role.equals("TRAINER"))) {
            return null;
        }

        // 조회 전 만료 일괄 갱신 - 계약 기간(D-Day)·상태 표시를 최신화
        contractMapper.contractExpireSweep();

        if (role.equals("ADMIN")) {
            if (contractDTO.getGymId() == null) {
                return contractMapper.rosterGymList(); // 제휴 매장 리스트 (매장 선택 전)
            }
            return contractMapper.rosterMemberList(contractDTO); // 선택 매장 소속 명단
        }

        if (role.equals("OWNER")) {
            // 테넌트 격리: 본인 계정의 gym_id로 강제하고, 소속이 없으면 -1로 막아 타 지점 노출 차단
            MemberDTO find = new MemberDTO();
            find.setUsername(contractDTO.getUsername());
            MemberDTO owner = memberMapper.idcheck(find);
            Long gymId = (owner != null && owner.getGymId() != null) ? owner.getGymId() : -1L;
            contractDTO.setGymId(gymId);
            return contractMapper.rosterMemberList(contractDTO);
        }

        // TRAINER: 담당 PT 회원 명단
        return contractMapper.rosterManagedList(contractDTO);
    }

    // 구직 트레이너(구인구직 풀) 조회 비즈니스 로직
    // 구직 풀 선별·소개는 관계사(ADMIN) 권한 - 그 외 역할은 접근 차단(null 반환)
    // role=TRAINER & status=이탈(유효 임금계약 2 없음) 회원을 이름·전화번호 등 최소 정보만 반환
    public List<MemberDTO> jobSeekingTrainers(String role) throws Exception {
        String upper = role == null ? null : role.toUpperCase();
        if (!"ADMIN".equals(upper)) {
            return null; // 접근 권한 없음 플래그 반환
        }
        // 구직 판정이 최신 임금계약(2)의 status 기준이므로 조회 직전 만료 sweep으로 EXPIRED 전이를 최신화
        contractMapper.contractExpireSweep();
        return contractMapper.jobSeekingTrainers();
    }
}
