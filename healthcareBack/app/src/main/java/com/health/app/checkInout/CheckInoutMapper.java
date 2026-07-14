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

    // 당일 동일 유형 출석 존재 여부 (하루 1회 제한용)
    public int countToday(@Param("username") Long username, @Param("inoutType") Long inoutType) throws Exception;

    // 출석 기록 등록 (헬스장/PT 공용)
    public int insertAttendance(CheckInoutDTO checkInoutDTO) throws Exception;

    // 트레이너 본인 담당 당일 미확인 PT 출석 대기 목록
    public List<CheckInoutDTO> pendingList(Long trainerId) throws Exception;

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

}
