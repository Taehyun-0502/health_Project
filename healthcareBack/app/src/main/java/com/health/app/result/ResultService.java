package com.health.app.result;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class ResultService {

    private final ResultMapper resultMapper;

    public ResultService(ResultMapper resultMapper) {
        this.resultMapper = resultMapper;
    }

    // data_id로 분석 결과 조회
    public ResultDTO selectByDataId(Long dataId) throws Exception {
        return resultMapper.selectByDataId(dataId);
    }

    // 전체 및 특정 지점 분석 결과 조회
    public List<ResultDTO> selectAll(Long gymId) throws Exception {
        return resultMapper.selectAll(gymId);
    }

    // 이탈 통계: 기간(일별/월별) 목록
    public List<ChurnStatPeriodDTO> selectStatPeriods(Long gymId, String mode) throws Exception {
        return resultMapper.selectStatPeriods(gymId, mode);
    }

    // 이탈 통계: 특정 기간 요인/불만 항목별 비율
    public List<ChurnStatItemDTO> selectStatBreakdown(Long gymId, String mode, String period) throws Exception {
        return resultMapper.selectStatBreakdown(gymId, mode, period);
    }

    // 이탈 통계 드릴다운: 특정 요인/불만을 가진 위험군 회원 명단
    public List<ChurnStatMemberDTO> selectStatMembers(Long gymId, String mode, String period,
                                                      String statType, String statKey) throws Exception {
        return resultMapper.selectStatMembers(gymId, mode, period, statType, statKey);
    }

    // 이탈 통계: 특정 기간 위험군 회원 전체 명단 + 이탈이유(top1~3)
    public List<ChurnRiskMemberDTO> selectRiskMembers(Long gymId, String mode, String period) throws Exception {
        return resultMapper.selectRiskMembers(gymId, mode, period);
    }

    // 프로모션 발송용: 그 헬스장 회원 전체를 이탈율 높은 순으로
    public List<ChurnStatMemberDTO> selectMembersByChurn(Long gymId) throws Exception {
        return resultMapper.selectMembersByChurn(gymId);
    }

    // 프로모션 발송용: 특정 이탈요인(statKey)을 가진 위험군 회원 (최신 예측 기준)
    public List<ChurnStatMemberDTO> selectMembersByFactor(Long gymId, String statKey) throws Exception {
        return resultMapper.selectMembersByFactor(gymId, statKey);
    }
}
