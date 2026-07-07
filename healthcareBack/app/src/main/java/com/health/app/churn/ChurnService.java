package com.health.app.churn;

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
public class ChurnService {

    private final ChurnMapper churnMapper;
    private final RestTemplate restTemplate;

    @Value("${app.churn.fastapi-url:http://localhost:8000}")
    private String churnFastapiUrl;

    public ChurnService(ChurnMapper churnMapper) {
        this.churnMapper = churnMapper;
        this.restTemplate = new RestTemplate();
    }

    // 모델 입력 데이터 저장
    public int create(ChurnDTO churnDTO) throws Exception {
        return churnMapper.create(churnDTO);
    }

    // 회원 1명의 모델 입력 데이터 조회
    public ChurnDTO selectByUsername(Long username) throws Exception {
        return churnMapper.selectByUsername(username);
    }

    // 전체 회원 모델 입력 데이터 조회
    public List<ChurnDTO> selectAll() throws Exception {
        return churnMapper.selectAll();
    }

    // 회원 1명의 주당 방문횟수, 일평균 운동시간, 마지막 방문 경과일 UPSERT
    @Transactional
    public int upsertChurnFeatures(Long username, Double visitPerWeek, Double averExercise, Long lastDays) throws Exception {
        return churnMapper.upsertChurnFeatures(username, visitPerWeek, averExercise, lastDays);
    }

    // FastAPI 응답 바디에서 visit_per_week, aver_exercise, last_days를 추출하여 DB에 UPSERT
    @Transactional
    public void upsertChurnFeaturesFromResponse(Map<String, Object> body, Long username) throws Exception {
        if (body != null) {
            Double visitPerWeek = null;
            Double averExercise = null;
            Long lastDays = null;
            if (body.get("visit_per_week") != null) {
                visitPerWeek = ((Number) body.get("visit_per_week")).doubleValue();
            }
            if (body.get("aver_exercise") != null) {
                averExercise = ((Number) body.get("aver_exercise")).doubleValue();
            }
            if (body.get("last_days") != null) {
                lastDays = ((Number) body.get("last_days")).longValue();
            }
            churnMapper.upsertChurnFeatures(username, visitPerWeek, averExercise, lastDays);
        }
    }

    // 전체 회원의 주당 방문횟수 일괄 UPSERT (벌크 UPSERT)
    @Transactional
    public int upsertChurnFeaturesAll(List<ChurnDTO> list) throws Exception {
        if (list == null || list.isEmpty()) {
            return 0;
        }
        return churnMapper.upsertChurnFeaturesAll(list);
    }

    // FastAPI churn 서버 호출
    public Map<String, Object> predictByUsername(Long username) {
        String url = churnFastapiUrl + "/churn/" + username;
        RequestEntity<Void> request = RequestEntity.method(HttpMethod.GET, java.net.URI.create(url)).build();

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                request,
                new ParameterizedTypeReference<Map<String, Object>>() {
                });
        return response.getBody();
    }
}
