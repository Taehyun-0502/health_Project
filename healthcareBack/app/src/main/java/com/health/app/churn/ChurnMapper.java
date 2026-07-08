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

    // 회원 1명의 모든 피처 데이터 UPSERT (객체 바인딩 구조)
    public int upsertChurnFeatures(ChurnDTO churnDTO) throws Exception;

    // 전체 회원의 주당 방문횟수 일괄 UPSERT (벌크 UPSERT)
    public int upsertChurnFeaturesAll(List<ChurnDTO> list) throws Exception;
}
