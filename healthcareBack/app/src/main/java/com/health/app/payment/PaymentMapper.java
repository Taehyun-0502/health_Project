package com.health.app.payment;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.health.app.contract.ContractDTO;
import com.health.app.pager.Pager;

/**
 * 결제(매출, h_payment) 원장 CRUD를 담당하는 MyBatis 매퍼 인터페이스
 */
@Mapper
public interface PaymentMapper {

    public Long getOwnerGymId(@Param("username") Long username) throws Exception;

    public int isValidOwnerPaymentTarget(@Param("gymId") Long gymId,
            @Param("payerUsername") Long payerUsername, @Param("dataId") Long dataId) throws Exception;

    // 신규 매출(결제) 내역 추가 등록
    public int paymentAdd(PaymentDTO paymentDTO) throws Exception;

    // 매출 내역 페이징 조회 (username + Pager(페이지/검색어/조회월) + 정렬조건(sort: price_desc/price_asc/date_desc/date_asc, 기본은 최신순))
    public List<PaymentDTO> paymentList(@Param("username") Long username, @Param("pager") Pager pager, @Param("sort") String sort) throws Exception;

    // 매출 내역 전체 건수 조회 (Pager의 총 페이지/블록 계산용)
    public long paymentListCount(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    // 매출 내역 전체 합계 금액 조회
    public long paymentListSum(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    // CSV 내보내기용 매출 전체 목록 조회 (username + Pager(검색어/조회월) 조건, 페이징 없음)
    public List<PaymentDTO> paymentListAll(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    // 미결제 상태이며 서명이 완료된 계약 정보 목록 조회
    public List<ContractDTO> unpaidContractList(Long username) throws Exception;

    // 매출(결제) 단건 조회 (삭제 전 gymId/payDate 확인용 - 커미션 재계산에 필요)
    public PaymentDTO getPaymentByIdForGym(@Param("payId") Long payId, @Param("gymId") Long gymId) throws Exception;

    // 매출(결제) 내역 삭제
    public int paymentDeleteForGym(@Param("payId") Long payId, @Param("gymId") Long gymId) throws Exception;

}
