package com.health.app.contract;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ContractMapper {

    // 로그인 권한별 계약 유저 리스트 조회 메서드
    public List<ContractDTO> contractUserList(ContractDTO contractDTO) throws Exception;

    // 계약서 발행(등록) 메서드
    public int contractInsert(ContractDTO contractDTO) throws Exception;

    // 계약서 상세 조회 메서드
    public ContractDTO contractDetail(ContractDTO contractDTO) throws Exception;

    // 계약서 서명 처리 메서드 (ISSUED -> SIGNED)
    public int contractSign(ContractDTO contractDTO) throws Exception;
}
