package com.health.app.survey;

import java.util.List;

import org.springframework.stereotype.Service;

@Service
public class SurveyService {

    private final SurveyMapper surveyMapper;

    public SurveyService(SurveyMapper surveyMapper) {
        this.surveyMapper = surveyMapper;
    }

    // 설문 데이터 저장
    public int create(SurveyDTO surveyDTO) throws Exception {
        return surveyMapper.create(surveyDTO);
    }

    // 회원 1명의 최신 설문 데이터 조회
    public SurveyDTO selectByUsername(Long username) throws Exception {
        return surveyMapper.selectByUsername(username);
    }

    // 전체 회원 최신 설문 데이터 조회
    public List<SurveyDTO> selectAll() throws Exception {
        return surveyMapper.selectAll();
    }
}
