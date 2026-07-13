package com.health.app.result;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ResultMapper {

    // 분석 결과 저장
    int insert(ResultDTO resultDTO) throws Exception;

    // 분석 결과 수정
    int update(ResultDTO resultDTO) throws Exception;

    // data_id로 분석 결과 조회
    ResultDTO selectByDataId(Long dataId) throws Exception;

    // 전체 분석 결과 조회 (지점 필터링 지원)
    List<ResultDTO> selectAll(@Param("gymId") Long gymId) throws Exception;

    // data_id로 회원 username 조회 (FastAPI 호출에 필요)
    Long selectUsernameByDataId(Long dataId) throws Exception;

    // username으로 회원의 gym_id 조회
    Long selectGymIdByUsername(@Param("username") Long username) throws Exception;

    // ── 헬스장 이탈 통계(일별/월별) ──
    // 기간 목록 + 기간별 이탈율/회원수 (mode: 'daily' | 'monthly')
    List<ChurnStatPeriodDTO> selectStatPeriods(@Param("gymId") Long gymId,
                                               @Param("mode") String mode) throws Exception;

    // 특정 기간의 요인/불만 항목별 비율 (mode: 'daily' | 'monthly', period: 'YYYY-MM-DD' | 'YYYY-MM')
    List<ChurnStatItemDTO> selectStatBreakdown(@Param("gymId") Long gymId,
                                               @Param("mode") String mode,
                                               @Param("period") String period) throws Exception;

    // 드릴다운: 특정 요인/불만을 가진 위험군 회원 명단(+이탈율)
    List<ChurnStatMemberDTO> selectStatMembers(@Param("gymId") Long gymId,
                                               @Param("mode") String mode,
                                               @Param("period") String period,
                                               @Param("statType") String statType,
                                               @Param("statKey") String statKey) throws Exception;

    // 특정 기간 위험군 회원 전체 명단 + 이탈이유(top1~3)
    List<ChurnRiskMemberDTO> selectRiskMembers(@Param("gymId") Long gymId,
                                               @Param("mode") String mode,
                                               @Param("period") String period) throws Exception;

    // 불만 조치 도우미: 그 헬스장의 트레이너(직원) 명단 — 직원불만(전문성부족/과도한영업) 옆 표시용
    List<Map<String, Object>> selectTrainers(@Param("gymId") Long gymId) throws Exception;

    // 불만 조치 도우미: 해당 기간 특정 불만(statKey)이 예측된 회원들의 방문 시간대 분포(최빈 순)
    List<Map<String, Object>> selectComplaintVisitSlots(@Param("gymId") Long gymId,
                                                        @Param("mode") String mode,
                                                        @Param("period") String period,
                                                        @Param("statKey") String statKey) throws Exception;

}
