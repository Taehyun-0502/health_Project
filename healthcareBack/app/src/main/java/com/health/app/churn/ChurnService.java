package com.health.app.churn;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ChurnService {

    private final ChurnMapper churnMapper;

    public ChurnService(ChurnMapper churnMapper) {
        this.churnMapper = churnMapper;
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

    // 회원 1명의 모든 피처 데이터 UPSERT
    @Transactional
    public int upsertChurnFeatures(ChurnDTO dto) throws Exception {
        return churnMapper.upsertChurnFeatures(dto);
    }

    // 전체 회원의 주당 방문횟수 일괄 UPSERT (벌크 UPSERT)
    @Transactional
    public int upsertChurnFeaturesAll(List<ChurnDTO> list) throws Exception {
        if (list == null || list.isEmpty()) {
            return 0;
        }
        return churnMapper.upsertChurnFeaturesAll(list);
    }
}
