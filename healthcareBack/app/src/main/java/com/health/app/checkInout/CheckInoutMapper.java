package com.health.app.checkInout;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.health.app.contract.ContractDTO;

@Mapper
public interface CheckInoutMapper {

    public List<CheckInoutDTO> list(Long username) throws Exception;

    // 회원의 유효(ACTIVE·기간 내) 계약 1건 조회 - 유형별 단건 조회 (3=이용권, 4=PT, 5=PT 체험)
    public ContractDTO findActiveContract(@Param("username") Long username,
            @Param("contractType") Long contractType) throws Exception;

    // 현재 소진 대상 PT 계약 조회 - 유효 PT형 계약(PT=4, PT 체험=5) 중 잔여가 남은 가장 오래된 계약 1건
    // 팀 정책: 먼저 계약한 건을 다 사용해야 다음 계약(PT 체험 등)을 이용 가능
    public ContractDTO findConsumablePtContract(Long username) throws Exception;

    // 당일 동일 유형 출석 존재 여부 (하루 1회 제한용)
    public int countToday(@Param("username") Long username, @Param("inoutType") Long inoutType) throws Exception;

    // 출석 기록 등록 (헬스장/PT 공용)
    public int insertAttendance(CheckInoutDTO checkInoutDTO) throws Exception;

    // 트레이너 본인 담당 당일 미확인 PT 출석 대기 목록
    public List<CheckInoutDTO> pendingList(Long trainerId) throws Exception;

    // 트레이너 본인이 확인 완료한(=실제 진행한) PT 수업 이력 전체 (캘린더 표시용)
    public List<CheckInoutDTO> historyList(Long trainerId) throws Exception;

    // 출석 단건 조회 (트레이너 확인 검증용)
    public CheckInoutDTO findAttendance(Long inoutId) throws Exception;

    // 트레이너 확인 처리 (당일 + 본인 담당 + 미확인 건만)
    public int confirmAttendance(@Param("inoutId") Long inoutId, @Param("trainerId") Long trainerId) throws Exception;

    // PT 이용 관리(h_pt_manage) 행 생성 - 계약당 1행, 이미 있으면 무시 (h_contract_data는 읽기만 하고 갱신하지 않음)
    public int upsertPtManage(@Param("dataId") Long dataId, @Param("username") Long username,
            @Param("totalCount") Integer totalCount) throws Exception;

    // PT 사용 횟수 +1 및 완료 여부 갱신 (총 횟수 초과 방지 가드)
    public int usePtCount(Long dataId) throws Exception;

    // 계약별 현재 사용 횟수 조회 (행 없으면 0)
    public int findUsedCount(Long dataId) throws Exception;

    // ===== PT 수업 일정(h_pt_schedule) - 트레이너 주도 등록 =====

    // 트레이너 본인 담당 회원 목록 (유효 PT형 계약(4·5) 기준 - 일정 등록 시 회원 선택용)
    public List<com.health.app.member.MemberDTO> myMembers(Long trainerId) throws Exception;

    // 트레이너 담당 회원 현황 - 유효 PT형 계약(4·5)별 총횟수/사용/잔여 (잔여 적은 순)
    public List<PtMemberStatusDTO> memberStatusList(Long trainerId) throws Exception;

    // 회원+트레이너 조합의 유효 PT형 계약(4·5) 조회 (일정 등록 검증용 - 회원의 최신 계약 하나만 보는 findActiveContract와 달리 담당 조합으로 직접 매칭)
    public com.health.app.contract.ContractDTO findActivePtByTrainer(@Param("username") Long username,
            @Param("trainerId") Long trainerId) throws Exception;

    // 일정 등록
    public int insertSchedule(PtScheduleDTO schedule) throws Exception;

    // 트레이너 본인 일정 전체 (회원 이름 조인, 캘린더 표시용)
    public List<PtScheduleDTO> trainerScheduleList(Long trainerId) throws Exception;

    // 회원 본인의 다가오는 일정 (트레이너 이름 조인)
    public List<PtScheduleDTO> memberScheduleList(Long username) throws Exception;

    // 일정 삭제 (본인 등록 건만)
    public int deleteSchedule(@Param("scheduleId") Long scheduleId, @Param("trainerId") Long trainerId) throws Exception;

    // 내일 예정된 전체 일정 (전날 리마인드 알림 배치용 - 회원/트레이너 이름 조인)
    public List<PtScheduleDTO> tomorrowSchedules() throws Exception;

    // ===== 사장님용 지점 집계 (회원/직원 관리 탭 owner 뷰) =====

    // 회원의 지점(gym_id) 조회 - 사장님 계정의 지점 판별용
    public Long findGymIdByUsername(Long username) throws Exception;

    // 지점 트레이너별 성과 지표 (담당 회원/이번 달 수업·미수행/재등록 임박)
    public List<TrainerPerfDTO> ownerTrainerPerf(Long gymId) throws Exception;

    // 지점 재등록 임박 리스트 - PT형(4·5, 잔여 3회 이하) + 이용권(3, 종료 7일 이내) 통합, category로 유형 구분
    public List<RebookDTO> ownerRebookList(Long gymId) throws Exception;

    // 지점 전체 PT 일정 (읽기 전용 캘린더용)
    public List<PtScheduleDTO> ownerScheduleList(Long gymId) throws Exception;

    // 지점 전체 확인 완료 PT 수업 이력 (읽기 전용 캘린더용)
    public List<CheckInoutDTO> ownerHistoryList(Long gymId) throws Exception;

    // 총괄 관리자용 매장별 비교 지표 (전 매장)
    public List<GymPerfDTO> adminGymOverview() throws Exception;

    // (OWNER 대시보드) 오늘 지점 출석(체크인) distinct 회원 수 집계
    public java.util.Map<String, Object> ownerTodayAttendanceCount(Long gymId) throws Exception;

    // (OWNER 대시보드) 지점 체크인 기록 존재 여부(hasData 판정용 - 오늘 0명이어도 위젯 노출)
    public java.util.Map<String, Object> ownerAttendanceHasData(Long gymId) throws Exception;

}
