package com.health.app.churn;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ChurnMapper {

    // 모델 입력 데이터 저장
    public int create(ChurnDTO churnDTO) throws Exception;

    // 회원 1명의 모델 입력 데이터 조회
    public ChurnDTO selectByUsername(Long username) throws Exception;

    // 전체 회원 모델 입력 데이터 조회 (헬스장 대시보드 집계용)
    public List<ChurnDTO> selectAll() throws Exception;

    // 회원 1명의 주당 방문횟수, 일평균 운동시간, 마지막 방문 경과일 UPSERT
    public int upsertChurnFeatures(@org.apache.ibatis.annotations.Param("username") Long username, 
                                   @org.apache.ibatis.annotations.Param("visitPerWeek") Double visitPerWeek,
                                   @org.apache.ibatis.annotations.Param("averExercise") Double averExercise,
                                   @org.apache.ibatis.annotations.Param("lastDays") Long lastDays) throws Exception;

    // 전체 회원의 주당 방문횟수 일괄 UPSERT (벌크 UPSERT)
    public int upsertChurnFeaturesAll(List<ChurnDTO> list) throws Exception;
}
