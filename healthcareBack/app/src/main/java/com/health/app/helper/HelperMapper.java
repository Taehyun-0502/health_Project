package com.health.app.helper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

// 불만 조치 도우미(helper) — 이탈통계 주황 바 옆 표시용 + 헬퍼 요청 등록
@Mapper
public interface HelperMapper {

    // 그 헬스장의 트레이너(직원) 명단
    List<Map<String, Object>> selectTrainers(@Param("gymId") Long gymId) throws Exception;

    // 특정 불만(statKey)이 예측된 위험군 회원들의 방문 시간대 분포(최빈 순)
    List<Map<String, Object>> selectComplaintVisitSlots(@Param("gymId") Long gymId,
                                                        @Param("mode") String mode,
                                                        @Param("period") String period,
                                                        @Param("statKey") String statKey) throws Exception;

    // 특정 불만(statKey)이 예측된 위험군 회원들의 담당자(계약 manager_id) 명단
    List<Map<String, Object>> selectComplaintManagers(@Param("gymId") Long gymId,
                                                      @Param("mode") String mode,
                                                      @Param("period") String period,
                                                      @Param("statKey") String statKey) throws Exception;

    // 서비스센터 전체 목록 (기구상태불만 옆 표시용)
    List<Map<String, Object>> selectServiceCenters() throws Exception;

    // 헬퍼 요청 등록 (환경불편 → 헬퍼)
    int insertHelperRequest(@Param("username") Long username, @Param("contents") String contents) throws Exception;
}
