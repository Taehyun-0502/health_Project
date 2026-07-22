package com.health.app.settle;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.health.app.alarm.AlarmService;
import com.health.app.member.MemberService;

@ExtendWith(MockitoExtension.class)
class SettleServiceTest {

    @Mock
    private SettleMapper settleMapper;

    @Mock
    private AlarmService alarmService;

    @Mock
    private MemberService memberService;

    @InjectMocks
    private SettleService settleService;

    @Test
    void ownerCommissionPaymentUsesAuthoritativeSettlementValues() throws Exception {
        Long username = 1010L;
        LocalDate paidAt = LocalDate.of(2026, 7, 2);

        CommissionDTO settlement = new CommissionDTO();
        settlement.setSettlementId(55L);
        settlement.setGymId(7L);
        settlement.setSettleMonth(LocalDate.of(2026, 6, 1));
        settlement.setCommission(700_000L);
        settlement.setCommissionRate(0.07);

        ExpenseDTO request = new ExpenseDTO();
        request.setGymId(999L);
        request.setDataId(123L);
        request.setSettlementId(55L);
        request.setExpenseName("변조된 이름");
        request.setExpensePrice(1L);
        request.setExpenseRate(0.99);
        request.setExpenseDate(paidAt);

        when(settleMapper.getOwnerGymId(username)).thenReturn(7L);
        when(settleMapper.getOwnerUnpaidCommission(username, 55L)).thenReturn(settlement);
        when(settleMapper.expenseAdd(request)).thenAnswer(invocation -> {
            request.setExpenseId(88L);
            return 1;
        });
        when(settleMapper.markSettlementPaid(55L, 88L, paidAt)).thenReturn(1);

        assertEquals(1, settleService.expenseAddForOwner(username, request));
        assertEquals(7L, request.getGymId());
        assertNull(request.getDataId());
        assertEquals("[2026-06-01] 플랫폼 커미션", request.getExpenseName());
        assertEquals(700_000L, request.getExpensePrice());
        assertEquals(0.07, request.getExpenseRate());
        verify(settleMapper).markSettlementPaid(55L, 88L, paidAt);
    }

    @Test
    void ownerCannotPayAnotherGymsOrAlreadyPaidSettlement() throws Exception {
        ExpenseDTO request = new ExpenseDTO();
        request.setSettlementId(55L);
        request.setExpenseDate(LocalDate.of(2026, 7, 2));

        when(settleMapper.getOwnerGymId(1010L)).thenReturn(7L);
        when(settleMapper.getOwnerUnpaidCommission(1010L, 55L)).thenReturn(null);

        assertThrows(IllegalArgumentException.class,
                () -> settleService.expenseAddForOwner(1010L, request));
        verify(settleMapper, never()).expenseAdd(any());
    }

    @Test
    void concurrentCommissionPaymentIsRejected() throws Exception {
        LocalDate paidAt = LocalDate.of(2026, 7, 2);
        CommissionDTO settlement = new CommissionDTO();
        settlement.setSettlementId(55L);
        settlement.setGymId(7L);
        settlement.setSettleMonth(LocalDate.of(2026, 6, 1));
        settlement.setCommission(700_000L);
        settlement.setCommissionRate(0.07);

        ExpenseDTO request = new ExpenseDTO();
        request.setSettlementId(55L);
        request.setExpenseDate(paidAt);

        when(settleMapper.getOwnerGymId(1010L)).thenReturn(7L);
        when(settleMapper.getOwnerUnpaidCommission(1010L, 55L)).thenReturn(settlement);
        when(settleMapper.expenseAdd(request)).thenAnswer(invocation -> {
            request.setExpenseId(88L);
            return 1;
        });
        when(settleMapper.markSettlementPaid(55L, 88L, paidAt)).thenReturn(0);

        assertThrows(IllegalArgumentException.class,
                () -> settleService.expenseAddForOwner(1010L, request));
    }

    @Test
    void currentMonthCannotBeFinalizedEarly() throws Exception {
        LocalDate currentMonth = LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).withDayOfMonth(1);

        assertThrows(IllegalArgumentException.class,
                () -> settleService.generateMonthlyCommissions(currentMonth));
        verify(settleMapper, never()).calculateMonthlyGymSales(any(), any());
    }

    @Test
    void alreadyPaidWageContractCannotCreateAnotherExpense() throws Exception {
        ExpenseDTO request = new ExpenseDTO();
        request.setDataId(77L);
        request.setExpenseName("임금");
        request.setExpensePrice(3_000_000L);
        request.setExpenseDate(LocalDate.of(2026, 7, 2));

        when(settleMapper.getOwnerGymId(1010L)).thenReturn(7L);
        when(settleMapper.lockExpenseContract(77L)).thenReturn(77L);
        when(settleMapper.checkOwnerExpenseContract(1010L, 77L)).thenReturn(0);

        assertThrows(IllegalArgumentException.class,
                () -> settleService.expenseAddForOwner(1010L, request));
        verify(settleMapper, never()).expenseAdd(any());
    }

    @Test
    void deletingCommissionExpenseRestoresSettlementBeforeDeletingExpense() throws Exception {
        when(settleMapper.resetSettlementForExpense(1010L, 88L)).thenReturn(1);
        when(settleMapper.expenseDelete(1010L, 88L)).thenReturn(1);

        assertEquals(1, settleService.expenseDelete(1010L, 88L));
        verify(settleMapper).resetSettlementForExpense(1010L, 88L);
        verify(settleMapper).expenseDelete(1010L, 88L);
    }
}
