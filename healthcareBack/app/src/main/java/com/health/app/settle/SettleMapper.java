package com.health.app.settle;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.health.app.contract.ContractDTO;
import com.health.app.pager.Pager;

/**
 * 정산(Settle), 매출(Payment), 지출(Expense) 및 커미션(Settlement) 처리를 담당하는 MyBatis 매퍼 인터페이스
 */
@Mapper
public interface SettleMapper {

    // 플랫폼 가맹점의 전체 커미션(정산) 내역 페이징 조회 (ADMIN 기능, Pager(페이지/상태/조회월) + 정렬조건(sort: amount_desc/amount_asc/month_desc/month_asc, 기본은 최신순))
    public List<CommissionDTO> commissionList(@Param("pager") Pager pager, @Param("sort") String sort) throws Exception;

    // 커미션 내역 전체 건수 조회 (Pager 총 페이지 계산용)
    public long commissionListCount(@Param("pager") Pager pager) throws Exception;

    // CSV 내보내기용 커미션 전체 목록 조회 (Pager(상태/조회월) 조건, 페이징 없음)
    public List<CommissionDTO> commissionListAll(@Param("pager") Pager pager) throws Exception;

    // 커미션 대시보드 요약 통계 조회 (필터/페이지와 무관한 전체 가맹점 기준 집계, ADMIN 기능)
    public CommissionStatsDTO commissionStats() throws Exception;

    // 사장님 정산 페이지 우측 요약 레일 집계 (username→gym_id 스코프, month 선택)
    public OwnerSummaryDTO ownerSettleSummary(@Param("username") Long username, @Param("month") String month) throws Exception;

    // OWNER 본인 지점의 월별 미지급 커미션 목록
    public List<CommissionDTO> ownerUnpaidCommissionList(@Param("username") Long username) throws Exception;

    // OWNER 본인 지점의 정확한 미지급 커미션 단건 조회 (지출 등록 검증용)
    public CommissionDTO getOwnerUnpaidCommission(
            @Param("username") Long username,
            @Param("settlementId") Long settlementId) throws Exception;

    // JWT subject에 연결된 OWNER의 gym_id 조회
    public Long getOwnerGymId(@Param("username") Long username) throws Exception;

    // 가맹점+정산월 기준 커미션 단건 조회 (매출 삭제 후 재계산 대상 확인용)
    public CommissionDTO getCommissionByGymAndMonth(
            @Param("gymId") Long gymId,
            @Param("month") java.time.LocalDate month) throws Exception;

    // 특정 가맹점의 특정 기간 매출 합계 * 커미션율로 재계산된 정산 금액 조회 (매출 삭제 후 재계산용)
    public long sumGymSalesForMonth(
            @Param("gymId") Long gymId,
            @Param("startDate") java.time.LocalDate startDate,
            @Param("endDate") java.time.LocalDate endDate,
            @Param("rate") double rate) throws Exception;

    // 커미션 정산 금액만 갱신 (매출 삭제 후 재계산 결과 반영용)
    public int updateCommissionAmount(
            @Param("settlementId") Long settlementId,
            @Param("commission") long commission) throws Exception;

    // 사장님 계정의 소속 지점(gym_id) 기준 지출비 목록 페이징 조회 (username + Pager(페이지/검색어/조회월) + 정렬조건(sort: price_desc/price_asc/date_desc/date_asc, 기본은 최신순))
    public List<ExpenseDTO> expenseList(@Param("username") Long username, @Param("pager") Pager pager, @Param("sort") String sort) throws Exception;

    // 지출비 목록 전체 건수 조회 (Pager의 총 페이지/블록 계산용)
    public long expenseListCount(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    // 지출비 목록 전체 합계 금액 조회
    public long expenseListSum(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    // CSV 내보내기용 지출 전체 목록 조회 (username + Pager(검색어/조회월) 조건, 페이징 없음)
    public List<ExpenseDTO> expenseListAll(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    // 지점 운영 지출 항목 신규 등록
    public int expenseAdd(ExpenseDTO expenseDTO) throws Exception;

    // 정확한 미지급 정산 한 건만 지급 완료 처리
    public int markSettlementPaid(
            @Param("settlementId") Long settlementId,
            @Param("expenseId") Long expenseId,
            @Param("settledAt") java.time.LocalDate settledAt) throws Exception;

    // OWNER가 선택한 임금 계약이 실제로 본인이 발행한 미지급 대상인지 확인
    public int checkOwnerExpenseContract(
            @Param("username") Long username,
            @Param("dataId") Long dataId) throws Exception;

    // 같은 임금 계약의 동시 지출 등록을 직렬화하는 트랜잭션 범위 DB 잠금
    public Long lockExpenseContract(@Param("dataId") Long dataId) throws Exception;

    // 지점 운영 지출 항목 삭제
    public int expenseDelete(@Param("username") Long username, @Param("expenseId") Long expenseId) throws Exception;

    // OWNER 소유 지출에 연결된 커미션 정산을 미지급 상태로 되돌리고 연결을 해제
    public int resetSettlementForExpense(
            @Param("username") Long username,
            @Param("expenseId") Long expenseId) throws Exception;

    // 특정 기간 내 가맹점별 총 매출액 및 제휴 수수료율 기반의 정산 커미션 목록 집계 조회
    public List<CommissionDTO> calculateMonthlyGymSales(
            @org.apache.ibatis.annotations.Param("startDate") java.time.LocalDate startDate, 
            @org.apache.ibatis.annotations.Param("endDate") java.time.LocalDate endDate) throws Exception;

    // 가맹점의 특정 정산 대상 월 정산 데이터 기등록 여부 조회
    public int checkCommissionExists(
            @org.apache.ibatis.annotations.Param("gymId") Long gymId, 
            @org.apache.ibatis.annotations.Param("settleMonth") java.time.LocalDate settleMonth) throws Exception;

    // 여러 서버가 같은 지점의 월 정산을 동시에 생성하지 못하도록 트랜잭션 범위 DB 잠금
    public Long lockCommissionGeneration(@Param("gymId") Long gymId) throws Exception;

    // 신규 플랫폼 정산 커미션 등록
    public int insertCommission(CommissionDTO commissionDTO) throws Exception;

    // 사장님용: 지출 처리해야 할 임금/제휴 계약서 목록 페이징 조회 (UserDTO -> ContractDTO 정정)
    public List<ContractDTO> unpaidExpenseContractList(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    // 지출 처리 대기 계약서 전체 건수 조회 (Pager의 총 페이지/블록 계산용)
    public long unpaidExpenseContractListCount(@Param("username") Long username, @Param("pager") Pager pager) throws Exception;

    // 알림 배치용: 최근 24시간 내 서명 완료되었고 아직 지출 미등록인 임금/제휴 계약(contract=2) 목록 조회
    public List<ContractDTO> newlySignedExpenseContracts() throws Exception;

}
