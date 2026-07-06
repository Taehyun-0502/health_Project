package com.health.app.survey;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface SurveyMapper {

    // 설문 데이터 저장
    public int create(SurveyDTO surveyDTO) throws Exception;

    // 회원 1명의 최신 설문 데이터 조회
    public SurveyDTO selectByUsername(Long username) throws Exception;

    // 전체 회원 최신 설문 데이터 조회
    public List<SurveyDTO> selectAll() throws Exception;
}
