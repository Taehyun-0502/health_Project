package com.health.app.checkInout;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.health.app.contract.ContractDTO;

@Mapper
public interface CheckInoutMapper {

    public List<CheckInoutDTO> list(Long username) throws Exception;

    // 회원의 유효(ACTIVE·기간 내) 계약 1건 조회 - 헬스장 출석은 이용권(3), PT 출석은 PT(4)
    public ContractDTO findActiveContract(@Param("username") Long username,
            @Param("contractType") Long contractType) throws Exception;

    // 현재 소진 대상 PT 계약 조회 - 유효 PT형 계약(일반 PT·체험권) 중 잔여가 남은 가장 오래된 계약 1건
    // 팀 정책: 먼저 계약한 건을 다 사용해야 다음 계약(체험권 등)을 이용 가능
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

    // 트레이너 본인 담당 회원 목록 (유효 PT 계약 기준 - 일정 등록 시 회원 선택용)
    public List<com.health.app.member.MemberDTO> myMembers(Long trainerId) throws Exception;

    // 트레이너 담당 회원 현황 - 유효 PT 계약별 총횟수/사용/잔여 (잔여 적은 순)
    public List<PtMemberStatusDTO> memberStatusList(Long trainerId) throws Exception;

    // 회원+트레이너 조합의 유효 PT 계약 조회 (일정 등록 검증용 - 회원의 최신 계약 하나만 보는 findActiveContract와 달리 담당 조합으로 직접 매칭)
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

}
