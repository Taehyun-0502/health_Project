package com.health.app.contract;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.health.app.member.MemberDTO;
import com.health.app.pager.Pager;

@Mapper
public interface ContractMapper {

    // 로그인 권한별 계약 유저 리스트 조회 메서드 (페이징 없음 - AI 도구 등 전체 목록이 필요한 내부 호출용)
    public List<ContractDTO> contractUserList(ContractDTO contractDTO) throws Exception;

    // 로그인 권한별 계약 유저 리스트 페이징 조회 메서드 (GET /contract/list, LIMIT/OFFSET 적용)
    public List<ContractDTO> contractUserListPage(@Param("dto") ContractDTO contractDTO, @Param("pager") Pager pager) throws Exception;

    // 로그인 권한별 계약 유저 리스트 전체 건수 조회 메서드 (Pager 총 페이지/블록 계산용)
    public long contractUserListCount(ContractDTO contractDTO) throws Exception;

    // 계약서 발행(등록) 메서드
    public int contractInsert(ContractDTO contractDTO) throws Exception;

    // 계약서 상세 조회 메서드
    public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception;

    // 계약서 서명 처리 메서드 (ISSUED -> 이용권·PT는 ACTIVE, 그 외 SIGNED)
    public int contractSign(ContractDTO contractDTO) throws Exception;

    // 계약 만료 일괄 갱신 메서드 (end_date 경과 시 TERMINATED로 통합 전이)
    public int contractExpireSweep() throws Exception;

    // 계약 활성화 일괄 갱신 메서드 (SIGNED + 시작일 도래 시 ACTIVE 전이, 3·4·5는 결제 완료분만)
    public int contractActivateSweep() throws Exception;

    // 결제 완료 직후 계약 활성화 메서드 (SIGNED -> ACTIVE + PT(4·5) 잔여횟수 초기화)
    public int contractActivate(ContractDTO contractDTO) throws Exception;

    // 체험권 계약 대상 목록 조회 메서드 (OWNER 전용, PT 체험 발행폼 진입용)
    public List<TrialTargetDTO> trialTargetList(ContractDTO contractDTO) throws Exception;

    // 회원의 유효한 기본 계약(3·4) 조회 메서드 (중복·병행 검증용)
    public ContractDTO activeBaseContractFind(ContractDTO contractDTO) throws Exception;

    // 회원의 유효한 PT 체험 계약(5) 조회 메서드 (중복 발행 차단용)
    public ContractDTO activeTrialContractFind(ContractDTO contractDTO) throws Exception;

    // PT 체험(5) 발행 근거 체험권 재검증 메서드 (OWNER 발급·동일 센터·대상 MEMBER 일치 시 1)
    public int trialCouponValidate(ContractDTO contractDTO) throws Exception;

    // 계약 종료 처리 메서드 (교체 갱신/체험 전환 시 기존 계약 TERMINATED 전이)
    public int contractTerminate(ContractDTO contractDTO) throws Exception;

    // 기존 임금 계약(2) 조회 메서드 (사장님-트레이너 조합 기준, 재작성=UPDATE 판단용)
    public ContractDTO wageContractFind(ContractDTO contractDTO) throws Exception;

    // 임금 계약(2) 재작성(갱신) 메서드 - 기존 행 UPDATE 후 ISSUED로 재발행
    public int wageContractUpdate(ContractDTO contractDTO) throws Exception;

    // 구직 트레이너(구인구직 풀) 조회 메서드
    // role=TRAINER & status=이탈(유효 임금계약 2 없음), 이름·전화번호 등 최소 정보만 반환
    public List<MemberDTO> jobSeekingTrainers() throws Exception;

    // (ADMIN) 제휴 매장 리스트 조회 메서드 - 제휴 계약(1) 기준, 매장명·계약 기간 포함(D-Day는 프론트 계산)
    public List<ContractDTO> rosterGymList() throws Exception;

    // (ADMIN/OWNER) 매장 소속 트레이너·회원 명단 조회 메서드 - gym_id 격리, 인원별 최신 계약 기간 포함
    public List<ContractDTO> rosterMemberList(ContractDTO contractDTO) throws Exception;

    // (TRAINER) 담당 유저 리스트 조회 메서드 - 담당 PT 계약(4, manager_id) 기준
    public List<ContractDTO> rosterManagedList(ContractDTO contractDTO) throws Exception;

    // (OWNER 대시보드) 30일 내 만료 임박 회원 계약(3·4·5, SIGNED/ACTIVE) 수 집계 메서드
    public java.util.Map<String, Object> expiringMemberCount(Long gymId) throws Exception;
}
