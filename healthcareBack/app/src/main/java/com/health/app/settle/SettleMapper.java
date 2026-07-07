package com.health.app.settle;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import com.health.app.user.UserDTO;

/**
 * 정산(Settle), 매출(Payment), 지출(Expense) 및 커미션(Settlement) 처리를 담당하는 MyBatis 매퍼 인터페이스
 */
@Mapper
public interface SettleMapper {

    // 신규 매출(결제) 내역 추가 등록
    public int payAdd(PayDTO payDTO) throws Exception;

    // 등록된 전체 매출 내역 목록 조회
    public List<PayDTO> payList(Long username) throws Exception;

    // 미결제 상태이며 서명이 완료된 계약 정보 목록 조회 (매출 자동 연동용)
    public List<UserDTO> unpaidContractList(Long username) throws Exception;

    // 플랫폼 가맹점의 전체 커미션(정산) 내역 목록 조회 (ADMIN 기능)
    public List<CommissionDTO> commissionList() throws Exception;

    // 커미션 정산 ID 기준 개별 단건 조회 (상태 변경 처리에 활용)
    public CommissionDTO getCommissionById(Long settlementId) throws Exception;

    // 가맹점 수수료 지급 상태("지급", "미지급") 및 지급 일자 변경 저장
    public int updateCommissionStatus(CommissionDTO commissionDTO) throws Exception;

    // 사장님 계정의 소속 지점(gym_id) 기준 지출비 목록 조회
    public List<ExpenseDTO> expenseList(Long username) throws Exception;

    // 지점 운영 지출 항목 신규 등록
    public int expenseAdd(ExpenseDTO expenseDTO) throws Exception;

    // 지점 운영 지출 항목 삭제
    public int expenseDelete(Long expenseId) throws Exception;

    // 특정 기간 내 가맹점별 총 매출액 및 제휴 수수료율 기반의 정산 커미션 목록 집계 조회
    public List<CommissionDTO> calculateMonthlyGymSales(
            @org.apache.ibatis.annotations.Param("startDate") java.time.LocalDate startDate, 
            @org.apache.ibatis.annotations.Param("endDate") java.time.LocalDate endDate) throws Exception;

    // 가맹점의 특정 정산 대상 월 정산 데이터 기등록 여부 조회
    public int checkCommissionExists(
            @org.apache.ibatis.annotations.Param("gymId") Long gymId, 
            @org.apache.ibatis.annotations.Param("settleMonth") java.time.LocalDate settleMonth) throws Exception;

    // 신규 플랫폼 정산 커미션 등록
    public int insertCommission(CommissionDTO commissionDTO) throws Exception;

    // 사장님용: 지출 처리해야 할 임금/제휴 계약서 목록 조회
    public List<com.health.app.user.UserDTO> unpaidExpenseContractList(Long username) throws Exception;

    // 사장님의 지출 등록 시 연동된 제휴 계약에 대한 플랫폼 정산 상태를 자동으로 '지급 완료'로 변경
    public int updateSettlementStatusByContract(
            @org.apache.ibatis.annotations.Param("dataId") Long dataId, 
            @org.apache.ibatis.annotations.Param("expenseId") Long expenseId) throws Exception;

}
