package com.health.app.contract;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberMapper;
import com.health.app.member.MemberService;
import com.health.app.pager.PagedResponse;
import com.health.app.pager.Pager;

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

    // 계약 상태 일괄 최신화 헬퍼 메서드 (조회 직전 호출)
    // 1) 만료: end_date 경과 계약을 TERMINATED로 통합 전이 (EXPIRED 미사용)
    // 2) 활성화: SIGNED + 시작일 도래 계약을 ACTIVE로 전이 (1·2는 서명만으로, 3·4·5는 결제 완료분만 + PT 잔여횟수 초기화)
    private void contractSweep() throws Exception {
        contractMapper.contractExpireSweep();
        contractMapper.contractActivateSweep();
    }

    // 결제 완료 후 계약 활성화 비즈니스 로직 - 결제 영역(PayService)이 결제 트랜잭션 안에서 호출
    // 결제 실패 시 계약 상태도 함께 롤백되도록 결제 트랜잭션에 참여
    @Transactional
    public int contractActivate(ContractDTO contractDTO) throws Exception {
        ContractDTO detail = contractMapper.contractDetail(contractDTO);
        if (detail == null) {
            return -1; // 존재하지 않는 계약서 플래그 반환
        }

        // 결제 OWNER와 계약 OWNER(발행자) 일치 검증
        if (contractDTO.getUsername() == null || !contractDTO.getUsername().equals(detail.getSenderId())) {
            return -2; // 활성화 권한 없음 플래그 반환
        }

        // 서명 완료(SIGNED) 상태에서만 활성화 가능
        if (!"SIGNED".equals(detail.getStatus())) {
            return -3; // 활성화 불가 상태 플래그 반환
        }

        // 시작일이 현재보다 과거이거나 같으면 즉시 ACTIVE 전이(+PT(4·5) 잔여횟수 초기화),
        // 미래 시작일이면 SIGNED 유지 - 시작일 도래 시 조회 sweep이 전이 처리
        if (detail.getStartDate() == null || !detail.getStartDate().isAfter(java.time.LocalDate.now())) {
            return contractMapper.contractActivate(contractDTO);
        }
        return 1; // 미래 시작일 - 전이 보류 (성공 취급)
    }

    // 체험권 계약 대상 목록 조회 비즈니스 로직 (OWNER 전용)
    // 클라이언트가 보낸 gymId는 무시하고 인증 사용자의 소속 gym_id로 강제 (테넌트 격리, 없으면 -1 차단)
    public List<TrialTargetDTO> trialTargetList(ContractDTO contractDTO) throws Exception {
        String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
        if (!"OWNER".equals(role)) {
            return null; // OWNER 외 접근 차단 플래그 반환
        }

        // 유효 기본 계약 판정(연계 정보·담당 트레이너 초기값)을 최신 상태로 유지
        contractSweep();

        MemberDTO find = new MemberDTO();
        find.setUsername(contractDTO.getUsername());
        MemberDTO owner = memberMapper.idcheck(find);
        contractDTO.setGymId(owner != null && owner.getGymId() != null ? owner.getGymId() : -1L);

        return contractMapper.trialTargetList(contractDTO);
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

        // 조회 전 만료 일괄 갱신 - end_date 경과 계약의 상태(TERMINATED)를 최신화
        contractSweep();

        return contractMapper.contractUserList(contractDTO);
    }

    // 로그인 권한별 계약 유저 리스트 페이징 조회 비즈니스 로직 (GET /contract/list 전용)
    // 필터·정렬·상대방 이름 조인 로직은 contractUserList와 동일하며, LIMIT/OFFSET + 전체 건수만 추가
    public PagedResponse<ContractDTO> contractUserListPage(ContractDTO contractDTO, Pager pager) throws Exception {
        String role = contractDTO.getRole() == null ? null : contractDTO.getRole().toUpperCase();
        contractDTO.setRole(role);

        // 허용되지 않은 권한(MEMBER 포함)은 접근 차단 플래그로 null 반환
        if (role == null
                || !(role.equals("ADMIN") || role.equals("OWNER") || role.equals("TRAINER"))) {
            return null;
        }

        // 조회 전 만료 일괄 갱신 - end_date 경과 계약의 상태(TERMINATED)를 최신화
        contractSweep();

        pager.makeOffset();
        List<ContractDTO> items = contractMapper.contractUserListPage(contractDTO, pager);
        long totalCount = contractMapper.contractUserListCount(contractDTO);
        pager.makeBlock(totalCount);

        // 계약 리스트는 금액 합계 표시가 없어 totalAmount는 0 고정(제휴(1)는 금액이 아닌 수수료율을 쓰는 등 합산 의미가 없음)
        return new PagedResponse<>(items, pager, totalCount, 0L);
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

        // 회원 계약(3·4)은 클라이언트가 전달한 유형을 신뢰하지 않고 quantity로 서버가 최종 판정
        // quantity = 0(또는 미입력) -> 이용권(3), quantity >= 1 -> PT(4), 음수는 발행 불가
        if (contract != null && (contract == 3 || contract == 4)) {
            Integer quantity = contractDTO.getQuantity();
            if (quantity != null && quantity < 0) {
                return -6; // 총 PT 횟수 음수 - 발행 불가 플래그 반환
            }
            contract = (quantity == null || quantity == 0) ? 3L : 4L;
            contractDTO.setContract(contract);
        }

        // 권한별 발행 가능한 계약 유형 검증 (ADMIN -> 제휴(1), OWNER -> 임금(2)·이용권(3)·PT(4)·PT 체험(5))
        boolean allowed =
                ("ADMIN".equals(role) && Long.valueOf(1).equals(contract))
                || ("OWNER".equals(role) && contract != null
                        && (contract == 2 || contract == 3 || contract == 4 || contract == 5));
        if (!allowed) {
            return -1; // 발행 권한 없음 플래그 반환
        }

        // 수신자 이름 필수 검증
        if (contractDTO.getReceiverName() == null || contractDTO.getReceiverName().isBlank()) {
            return -2; // 수신자 정보 누락 플래그 반환
        }

        // PT 체험(5)은 체험권 대상 목록의 기존 MEMBER만 대상 - 수신자 아이디 필수
        if (Long.valueOf(5).equals(contract) && contractDTO.getReceiverId() == null) {
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

        // 회원 계약(3·4·5) 중복·병행 검증 및 갱신/연계 이력 연결
        // - 기본 계약군(3·4)은 동시에 1건만 유효: 재발행 시 기존 기본 계약을 종료(TERMINATED)하고
        //   새 행을 INSERT해 이력 보존, previous_data_id로 교체 갱신 연결
        // - PT 체험(5)은 기본 계약과 병행 가능(related_data_id 연결), 중복 발행은 불가
        // - 체험 후 유료 PT 전환: 새 PT(4) 발행 시 유효한 PT 체험(5)도 함께 종료
        if (contract != null && contract >= 3 && contractDTO.getReceiverId() != null) {
            ContractDTO activeBase = contractMapper.activeBaseContractFind(contractDTO);
            ContractDTO activeTrial = contractMapper.activeTrialContractFind(contractDTO);

            if (contract == 5) {
                // PT 체험(5)은 체험권이 발행 근거 - sourceCouponId 필수 + 소유·센터·대상 재검증
                // (로그인 OWNER가 발급한 동일 센터의 체험권이고 선택한 MEMBER의 쿠폰인지)
                if (contractDTO.getSourceCouponId() == null
                        || contractMapper.trialCouponValidate(contractDTO) == 0) {
                    return -8; // 체험권 없음/부적합 플래그 반환
                }

                // PT 체험(5) 중복 발행 차단 (같은 회원 또는 같은 체험권의 유효 계약)
                if (activeTrial != null) {
                    return -7; // 유효한 PT 체험 계약 존재 플래그 반환
                }
                // 유효한 기본 계약(3·4)이 있으면 종료하지 않고 연계 이력으로만 연결 (병행)
                if (activeBase != null) {
                    contractDTO.setRelatedDataId(activeBase.getDataId());
                }
            } else {
                // 기본 계약군(3·4) 교체 갱신: 기존 유효 기본 계약 종료 + previous_data_id 연결
                if (activeBase != null) {
                    contractMapper.contractTerminate(activeBase);
                    contractDTO.setPreviousDataId(activeBase.getDataId());
                }
                // 체험 후 유료 PT 전환: 새 PT(4) 발행 시 유효한 PT 체험(5) 종료
                if (contract == 4 && activeTrial != null) {
                    contractMapper.contractTerminate(activeTrial);
                    if (contractDTO.getPreviousDataId() == null) {
                        contractDTO.setPreviousDataId(activeTrial.getDataId());
                    }
                }
            }
        }

        // 초기 상태는 발행됨(서명대기)
        contractDTO.setStatus("ISSUED");
        return contractMapper.contractInsert(contractDTO);
    }

    // 계약서 상세 조회 비즈니스 로직
    public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception {
        // 조회 전 만료 일괄 갱신 - end_date 경과 계약의 상태(TERMINATED)를 최신화
        contractSweep();

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

    // 계약서 서명 비즈니스 로직 - 모든 유형이 우선 SIGNED로 전이 (상태 흐름 통합)
    // 제휴(1)·임금(2)은 서명 직후 시작일이 도래했으면 바로 ACTIVE 전이,
    // 이용권(3)·PT(4)·PT 체험(5)은 결제 완료 후 contractActivate에서 ACTIVE 전이
    // 서명 완료 시점에 미가입 수신자 자동 회원가입(2번 -> trainer, 3·4번 -> member)
    // 서명-가입-활성화가 하나의 트랜잭션으로 묶여 실패 시 함께 롤백
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
        // (PT 체험(5)은 기존 MEMBER만 대상이라 자동가입 미사용)
        if (result > 0) {
            Long contract = detail.getContract();
            if (contract != null && (contract == 2 || contract == 3 || contract == 4)) {
                memberService.autoJoin(detail);
            }

            // 제휴(1)·임금(2)은 결제 없이 서명만으로 체결되므로,
            // 시작일이 현재보다 과거이거나 같으면 서명 직후 바로 ACTIVE로 전이
            if (contract != null && (contract == 1 || contract == 2)
                    && detail.getStartDate() != null
                    && !detail.getStartDate().isAfter(java.time.LocalDate.now())) {
                contractMapper.contractActivate(contractDTO);
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
        contractSweep();

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
        // 구직 판정이 최신 임금계약(2)의 status 기준이므로 조회 직전 만료 sweep으로 TERMINATED 전이를 최신화
        contractSweep();
        return contractMapper.jobSeekingTrainers();
    }

    // 만료 임박(30일 내 종료일 도래) 회원 계약(이용권3·PT4·PT 체험5) 대상 회원 수 집계 비즈니스 로직
    // 판정이 계약 status(SIGNED·ACTIVE)에 의존하므로 조회 직전 sweep으로 만료·활성 전이를 최신화
    public java.util.Map<String, Object> expiringMemberCount(Long gymId) throws Exception {
        contractSweep();
        return contractMapper.expiringMemberCount(gymId);
    }
}
