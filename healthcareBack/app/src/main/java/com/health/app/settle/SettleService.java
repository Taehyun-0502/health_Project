package com.health.app.settle;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.health.app.user.UserDTO;

/**
 * 정산 및 지출 관련 비즈니스 로직을 처리하는 서비스 클래스
 */
@Service
public class SettleService {

    @Autowired
    private SettleMapper settleMapper;

    // 결제 매출 등록 처리
    public int payAdd(PayDTO payDTO) throws Exception {

        return settleMapper.payAdd(payDTO);

    }

    // 매출 목록 조회 처리
    public List<PayDTO> payList(Long username) throws Exception {

        return settleMapper.payList(username);
    }

    // 미결제 계약서 목록 조회 처리 (매출 연동용)
    public List<UserDTO> unpaidContractList(Long username) throws Exception {
        return settleMapper.unpaidContractList(username);
    }

    // 관리자용 가맹점 전체 커미션 목록 조회 처리
    public List<CommissionDTO> commissionList() throws Exception {
        return settleMapper.commissionList();
    }

    // 관리자용 커미션 수수료 지급 상태 토글 비즈니스 로직
    // 기존 상태가 '지급'인 경우 -> '미지급' 처리 (지급완료일 null화)
    // 기존 상태가 '미지급'인 경우 -> '지급' 처리 (지급완료일 현재일 지정)
    public int toggleCommissionStatus(Long settlementId) throws Exception {
        CommissionDTO commission = settleMapper.getCommissionById(settlementId);
        if (commission != null) {
            if ("지급".equals(commission.getStatus())) {
                commission.setStatus("미지급");
                commission.setSettledAt(null);
            } else {
                commission.setStatus("지급");
                commission.setSettledAt(java.time.LocalDate.now());
            }
            return settleMapper.updateCommissionStatus(commission);
        }
        return 0;
    }

    // 사장님 계정의 소속 지점(gym_id) 기준 지출비 목록 조회
    public List<ExpenseDTO> expenseList(Long username) throws Exception {
        return settleMapper.expenseList(username);
    }

    // 지점 운영 지출 항목 추가 및 제휴 수수료 정산 상태 자동 갱신
    @org.springframework.transaction.annotation.Transactional
    public int expenseAdd(ExpenseDTO expenseDTO) throws Exception {
        int result = settleMapper.expenseAdd(expenseDTO);
        if (result > 0 && expenseDTO.getDataId() != null) {
            settleMapper.updateSettlementStatusByContract(expenseDTO.getDataId(), expenseDTO.getExpenseId());
        }
        return result;
    }

    // 지점 운영 지출 항목 삭제
    public int expenseDelete(Long expenseId) throws Exception {
        return settleMapper.expenseDelete(expenseId);
    }

    // 매달 1일 및 수동 요청 시 가맹점별 매출 집계 및 정산 커미션 생성 처리
    @org.springframework.transaction.annotation.Transactional
    public int generateMonthlyCommissions(java.time.LocalDate settleMonth) throws Exception {
        // 정산 대상 월의 시작일과 종료일 계산
        java.time.LocalDate startDate = settleMonth.withDayOfMonth(1);
        java.time.LocalDate endDate = settleMonth.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());

        // 매출이 존재하고 계약된 요율에 따른 커미션 대상 목록을 집계
        List<CommissionDTO> calculatedList = settleMapper.calculateMonthlyGymSales(startDate, endDate);

        int insertCount = 0;
        for (CommissionDTO item : calculatedList) {
            // 중복 생성 검사 (동일 지점, 동일 정산 월 기준)
            int count = settleMapper.checkCommissionExists(item.getGymId(), startDate);
            if (count == 0) {
                item.setSettleMonth(startDate);
                item.setStatus("미지급");
                int result = settleMapper.insertCommission(item);
                if (result > 0) {
                    insertCount++;
                }
            }
        }
        return insertCount;
    }

    // 사장님용: 지출 처리해야 할 임금/제휴 계약서 목록 조회 처리
    public List<UserDTO> unpaidExpenseContractList(Long username) throws Exception {
        return settleMapper.unpaidExpenseContractList(username);
    }
}
