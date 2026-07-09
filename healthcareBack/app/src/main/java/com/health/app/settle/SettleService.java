package com.health.app.settle;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.health.app.alarm.AlarmService;
import com.health.app.contract.ContractDTO;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;
import com.health.app.pager.PagedResponse;
import com.health.app.pager.Pager;

/**
 * 정산 및 지출 관련 비즈니스 로직을 처리하는 서비스 클래스
 */
@Service
public class SettleService {

    @Autowired
    private SettleMapper settleMapper;

    @Autowired
    private AlarmService alarmService;

    @Autowired
    private MemberService memberService;

    // gym_id로 사장님 username(전화번호)을 조회해 알림 발송 대상으로 변환하는 헬퍼 메서드
    // (h_gym.gym_ownernum은 사업자 등록번호라 회원 식별에 쓸 수 없음 - h_member에서 gym_id+role=OWNER로 직접 조회)
    // 조회 실패는 알림 발송을 포기할 뿐 호출부의 핵심 트랜잭션(매출 삭제, 정산 생성 등)에 영향을 주면 안되므로 예외를 던지지 않고 흡수
    private Long resolveOwnerReceiver(Long gymId) {
        if (gymId == null) {
            return null;
        }
        try {
            MemberDTO owner = memberService.findOwnerByGymId(gymId);
            return owner != null ? owner.getUsername() : null;
        } catch (Exception e) {
            System.err.println("gym 사장님 계정 조회 실패 (gymId=" + gymId + "): " + e.getMessage());
            return null;
        }
    }

    // 알림 발송 실패가 핵심 업무 트랜잭션을 롤백시키지 않도록 격리하는 헬퍼 메서드
    private void sendAlarmSafely(Long receiver, String message, String link, String category) {
        try {
            alarmService.sendAlarm(receiver, null, message, link, category);
        } catch (Exception e) {
            System.err.println("알림 발송 실패 (receiver=" + receiver + ", category=" + category + "): " + e.getMessage());
        }
    }

    // 결제 매출 등록 처리
    public int payAdd(PayDTO payDTO) throws Exception {
        return settleMapper.payAdd(payDTO);
    }

    // 매출 목록 페이징 조회 처리: 목록 조회 -> 전체 건수/합계 조회 -> Pager에 offset/블록 정보 계산 후 함께 반환
    public PagedResponse<PayDTO> payList(Long username, Pager pager, String sort) throws Exception {
        pager.makeOffset();
        List<PayDTO> items = settleMapper.payList(username, pager, sort);
        long totalCount = settleMapper.payListCount(username, pager);
        long totalAmount = settleMapper.payListSum(username, pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, totalAmount);
    }

    // CSV 내보내기용 매출 전체 목록 조회 처리 (현재 검색어/조회월 조건 반영, 페이징 없음)
    public List<PayDTO> payListAll(Long username, Pager pager) throws Exception {
        return settleMapper.payListAll(username, pager);
    }

    // 미결제 계약서 목록 조회 처리 (매출 연동용, UserDTO -> ContractDTO 정정)
    public List<ContractDTO> unpaidContractList(Long username) throws Exception {
        return settleMapper.unpaidContractList(username);
    }

    // 매출(결제) 삭제 및 해당 월 커미션 자동 재계산 처리
    // - 아직 커미션이 생성되지 않은 달: 재계산할 대상이 없으므로 그대로 종료 (다음 정산 생성 시 자동으로 최신 매출 반영됨)
    // - 커미션이 '미지급' 상태인 달: 삭제 후 남은 매출 기준으로 즉시 재계산하여 반영
    // - 커미션이 '지급' 상태인 달: 이미 지급 완료된 금액이라 자동으로 낮추지 않고, 관리자 확인이 필요하다는 경고만 반환
    @org.springframework.transaction.annotation.Transactional
    public PayDeleteResult payDelete(Long payId) throws Exception {
        PayDTO pay = settleMapper.getPayById(payId);
        if (pay == null) {
            return new PayDeleteResult(false, false);
        }

        int result = settleMapper.payDelete(payId);
        if (result <= 0) {
            return new PayDeleteResult(false, false);
        }

        java.time.LocalDate monthStart = pay.getPayDate().withDayOfMonth(1);
        CommissionDTO settlement = settleMapper.getCommissionByGymAndMonth(pay.getGymId(), monthStart);
        if (settlement == null) {
            return new PayDeleteResult(true, false);
        }
        if ("지급".equals(settlement.getStatus())) {
            Long receiver = resolveOwnerReceiver(pay.getGymId());
            if (receiver != null) {
                sendAlarmSafely(receiver,
                        "이미 지급 완료된 정산 금액이라 매출 삭제가 자동 반영되지 않았습니다. 확인이 필요합니다.",
                        "/fitb/Settlepage", "SETTLE_RECALC");
            }
            return new PayDeleteResult(true, true);
        }

        java.time.LocalDate monthEnd = monthStart.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());
        long newCommission = settleMapper.sumGymSalesForMonth(pay.getGymId(), monthStart, monthEnd, settlement.getCommissionRate());
        settleMapper.updateCommissionAmount(settlement.getSettlementId(), newCommission);

        return new PayDeleteResult(true, false);
    }

    // 관리자용 가맹점 전체 커미션 목록 페이징 조회 처리
    public PagedResponse<CommissionDTO> commissionList(Pager pager, String sort) throws Exception {
        pager.makeOffset();
        List<CommissionDTO> items = settleMapper.commissionList(pager, sort);
        long totalCount = settleMapper.commissionListCount(pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, 0L);
    }

    // CSV 내보내기용 커미션 전체 목록 조회 처리 (현재 상태/조회월 조건 반영, 페이징 없음)
    public List<CommissionDTO> commissionListAll(Pager pager) throws Exception {
        return settleMapper.commissionListAll(pager);
    }

    // 관리자용 커미션 대시보드 요약 통계 조회 처리 (필터/페이지와 무관)
    public CommissionStatsDTO commissionStats() throws Exception {
        return settleMapper.commissionStats();
    }

    // 관리자용 커미션 수수료 지급 상태 토글 비즈니스 로직
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

    // 사장님 계정의 소속 지점(gym_id) 기준 지출비 목록 페이징 조회
    public PagedResponse<ExpenseDTO> expenseList(Long username, Pager pager, String sort) throws Exception {
        pager.makeOffset();
        List<ExpenseDTO> items = settleMapper.expenseList(username, pager, sort);
        long totalCount = settleMapper.expenseListCount(username, pager);
        long totalAmount = settleMapper.expenseListSum(username, pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, totalAmount);
    }

    // CSV 내보내기용 지출 전체 목록 조회 처리 (현재 검색어/조회월 조건 반영, 페이징 없음)
    public List<ExpenseDTO> expenseListAll(Long username, Pager pager) throws Exception {
        return settleMapper.expenseListAll(username, pager);
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
    // 이미 정산(h_settlement.expense_id)에 연결된 지출은 h_settlement_expense_id_fkey 제약 때문에 삭제가 불가능하므로 사전에 차단
    public int expenseDelete(Long expenseId) throws Exception {
        int linkedCount = settleMapper.checkExpenseLinkedToSettlement(expenseId);
        if (linkedCount > 0) {
            return -2; // 이미 정산에 반영되어 삭제 불가 플래그 반환
        }
        return settleMapper.expenseDelete(expenseId);
    }

    // 매달 1일 및 수동 요청 시 가맹점별 매출 집계 및 정산 커미션 생성 처리
    @org.springframework.transaction.annotation.Transactional
    public int generateMonthlyCommissions(java.time.LocalDate settleMonth) throws Exception {
        java.time.LocalDate startDate = settleMonth.withDayOfMonth(1);
        java.time.LocalDate endDate = settleMonth.with(java.time.temporal.TemporalAdjusters.lastDayOfMonth());

        List<CommissionDTO> calculatedList = settleMapper.calculateMonthlyGymSales(startDate, endDate);

        int insertCount = 0;
        for (CommissionDTO item : calculatedList) {
            int count = settleMapper.checkCommissionExists(item.getGymId(), startDate);
            if (count == 0) {
                item.setSettleMonth(startDate);
                item.setStatus("미지급");
                int result = settleMapper.insertCommission(item);
                if (result > 0) {
                    insertCount++;

                    Long receiver = resolveOwnerReceiver(item.getGymId());
                    if (receiver != null) {
                        String message = String.format("%d년 %d월 정산이 생성되었습니다. (수수료 %,d원)",
                                startDate.getYear(), startDate.getMonthValue(), item.getCommission());
                        sendAlarmSafely(receiver, message, "/fitb/Settlepage", "SETTLE_BATCH");
                    }
                }
            }
        }
        return insertCount;
    }

    // 사장님용: 지출 처리해야 할 임금/제휴 계약서 목록 페이징 조회 처리 (UserDTO -> ContractDTO 정정)
    public PagedResponse<ContractDTO> unpaidExpenseContractList(Long username, Pager pager) throws Exception {
        pager.makeOffset();
        List<ContractDTO> items = settleMapper.unpaidExpenseContractList(username, pager);
        long totalCount = settleMapper.unpaidExpenseContractListCount(username, pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, 0L);
    }

    // 매일 배치: 최근 24시간 내 서명 완료된 신규 지출 정산 대기 계약서를 스캔해 gym 사장님에게 알림 발송
    // (contract 도메인 코드는 건드리지 않고 settle 쪽에서 h_contract_data/h_expense를 직접 조회해 감지)
    public int checkNewlySignedExpenseContracts() throws Exception {
        List<ContractDTO> newlySigned = settleMapper.newlySignedExpenseContracts();

        int sentCount = 0;
        for (ContractDTO contract : newlySigned) {
            Long receiver = resolveOwnerReceiver(contract.getGymId());
            if (receiver == null) {
                continue;
            }
            String message = String.format("신규 지출 정산 대기 계약서가 발생했습니다: %s", contract.getReceiverName());
            sendAlarmSafely(receiver, message, "/fitb/Settlepage", "CONTRACT_WAIT");
            sentCount++;
        }
        return sentCount;
    }
}
