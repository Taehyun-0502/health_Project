package com.health.app.result;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

@Service
public class ResultService {

    private final ResultMapper resultMapper;
    private final com.health.app.churn.ChurnService churnService;
    private final RestTemplate restTemplate;

    @Value("${app.churn.fastapi-url:http://localhost:8000}")
    private String churnFastapiUrl;

    public ResultService(ResultMapper resultMapper, com.health.app.churn.ChurnService churnService) {
        this.resultMapper = resultMapper;
        this.churnService = churnService;
        this.restTemplate = new RestTemplate();
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

    // 불만 조치 도우미: 그 헬스장 트레이너(직원) 명단
    public List<Map<String, Object>> selectTrainers(Long gymId) throws Exception {
        return resultMapper.selectTrainers(gymId);
    }

    // 불만 조치 도우미: 해당 기간 특정 불만(statKey)이 예측된 회원들의 방문 시간대 분포(최빈 순)
    public List<Map<String, Object>> selectComplaintVisitSlots(Long gymId, String mode, String period, String statKey) throws Exception {
        return resultMapper.selectComplaintVisitSlots(gymId, mode, period, statKey);
    }

    // 전체 또는 특정 지점에 대해 일괄 분석 및 저장 수행
    @Transactional
    public int analyzeAndSaveAll(Long gymId) throws Exception {
        List<com.health.app.churn.ChurnDTO> allData = churnService.selectAll();
        int successCount = 0;
        for (com.health.app.churn.ChurnDTO dto : allData) {
            try {
                // 특정 지점의 회원들만 선별 분석
                if (gymId != null) {
                    Long memberGymId = resultMapper.selectGymIdByUsername(dto.getUsername());
                    if (memberGymId == null || !memberGymId.equals(gymId)) {
                        continue;
                    }
                }
                analyzeAndSave(dto.getModelId());
                successCount++;
            } catch (Exception e) {
                // 에러 발생 시 로그를 남기고 다른 회원 처리를 계속 진행
                System.err.println("Failed to analyze data_id: " + dto.getModelId() + ". Error: " + e.getMessage());
            }
        }
        return successCount;
    }

    // 이탈 모델 분석을 수행하고 그 결과를 데이터베이스에 저장/갱신
    @Transactional
    public ResultDTO analyzeAndSave(Long dataId) throws Exception {
        // 1. data_id로 회원 username 조회
        Long username = resultMapper.selectUsernameByDataId(dataId);
        if (username == null) {
            throw new IllegalArgumentException("No member data found for data_id: " + dataId);
        }

        // 2. FastAPI churn 서버 호출하여 분석 결과 가져오기
        String url = churnFastapiUrl + "/churn/" + username;
        RequestEntity<Void> request = RequestEntity.method(HttpMethod.GET, java.net.URI.create(url)).build();

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
            request,
            new ParameterizedTypeReference<Map<String, Object>>() {}
        );

        Map<String, Object> body = response.getBody();
        if (body == null) {
            throw new RuntimeException("FastAPI response is null for username: " + username);
        }

        // FastAPI에서 계산되어 돌아온 visit_per_week를 DB(h_model_data)에 UPSERT 위임
        churnService.upsertChurnFeaturesFromResponse(body, username);

        // 3. 응답 맵에서 분석 데이터 추출
        @SuppressWarnings("unchecked")
        Map<String, Object> diagnosis = (Map<String, Object>) body.get("진단");
        if (diagnosis == null) {
            throw new RuntimeException("FastAPI response is missing the '진단' diagnosis block.");
        }

        // 3.1. 이탈확률(churn_rate) 추출 및 변환 (위험점수 / 100.0)
        Double churnRate = null;
        if (diagnosis.get("위험점수") != null) {
            Number scoreNum = (Number) diagnosis.get("위험점수");
            churnRate = scoreNum.doubleValue() / 100.0;
        }

        // 3.2. 이탈 위험 요인 Top 3 추출 (위험요인_이탈↑)
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> riskFactors = (List<Map<String, Object>>) diagnosis.get("위험요인_이탈↑");
        String top1Reason = null;
        String top2Reason = null;
        String top3Reason = null;

        if (riskFactors != null) {
            if (riskFactors.size() > 0 && riskFactors.get(0) != null) {
                top1Reason = (String) riskFactors.get(0).get("해석");
            }
            if (riskFactors.size() > 1 && riskFactors.get(1) != null) {
                top2Reason = (String) riskFactors.get(1).get("해석");
            }
            if (riskFactors.size() > 2 && riskFactors.get(2) != null) {
                top3Reason = (String) riskFactors.get(2).get("해석");
            }
        }

        // 4. ResultDTO 생성 및 DB 저장/갱신
        ResultDTO resultDTO = new ResultDTO();
        resultDTO.setModelId(dataId);
        resultDTO.setChurnRate(churnRate);
        resultDTO.setTop1Reason(top1Reason);
        resultDTO.setTop2Reason(top2Reason);
        resultDTO.setTop3Reason(top3Reason);

        ResultDTO existing = resultMapper.selectByDataId(dataId);
        if (existing != null) {
            resultDTO.setResultId(existing.getResultId());
            resultMapper.update(resultDTO);
        } else {
            resultMapper.insert(resultDTO);
        }

        return resultDTO;
    }
}
