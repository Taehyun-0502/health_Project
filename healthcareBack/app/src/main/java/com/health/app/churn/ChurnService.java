package com.health.app.churn;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
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

    // FastAPI churn 서버 호출
    public Map<String, Object> predictByUsername(Long username) {
        String url = churnFastapiUrl + "/churn/" + username;
        RequestEntity<Void> request = RequestEntity.method(HttpMethod.GET, java.net.URI.create(url)).build();

        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
            request,
            new ParameterizedTypeReference<Map<String, Object>>() {}
        );
        return response.getBody();
    }
}
