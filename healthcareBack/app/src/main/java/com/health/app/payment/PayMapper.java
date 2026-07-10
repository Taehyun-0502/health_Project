package com.health.app.payment;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.health.app.contract.ContractDTO;

/**
 * 회원 셀프결제(h_pay) 원장을 담당하는 MyBatis 매퍼 인터페이스
 */
@Mapper
public interface PayMapper {

    // 셀프결제 대상 계약 검증 조회: 본인 소유 + 서명완료(이용권/PT) + 아직 매출 미등록인 계약만 반환
    public ContractDTO findPayableContract(@Param("dataId") Long dataId, @Param("username") Long username) throws Exception;

    // 결제(h_pay) 신규 등록
    public int insertPay(PayDTO payDTO) throws Exception;

}
