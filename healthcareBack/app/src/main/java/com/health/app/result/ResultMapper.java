package com.health.app.result;

import java.util.List;
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

}
