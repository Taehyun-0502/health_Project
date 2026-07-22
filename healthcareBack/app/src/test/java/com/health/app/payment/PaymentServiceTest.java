package com.health.app.payment;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.health.app.settle.SettleService;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    @Mock
    private PaymentMapper paymentMapper;

    @Mock
    private SettleService settleService;

    @InjectMocks
    private PaymentService paymentService;

    @Test
    void ownerCanAddManualSaleOnlyForMemberOfOwnerGym() throws Exception {
        PaymentDTO payment = new PaymentDTO();
        payment.setUsername(2020L);
        payment.setGymId(999L);
        when(paymentMapper.getOwnerGymId(1010L)).thenReturn(7L);
        when(paymentMapper.isValidOwnerPaymentTarget(7L, 2020L, null)).thenReturn(1);
        when(paymentMapper.paymentAdd(payment)).thenReturn(1);

        assertEquals(1, paymentService.paymentAddForOwner(1010L, payment));
        assertEquals(7L, payment.getGymId());
        verify(paymentMapper).paymentAdd(payment);
    }

    @Test
    void linkedSaleRequiresContractForSameGymAndReceiver() throws Exception {
        PaymentDTO payment = new PaymentDTO();
        payment.setUsername(2020L);
        payment.setDataId(88L);
        when(paymentMapper.getOwnerGymId(1010L)).thenReturn(7L);
        when(paymentMapper.isValidOwnerPaymentTarget(7L, 2020L, 88L)).thenReturn(0);

        assertThrows(IllegalArgumentException.class,
                () -> paymentService.paymentAddForOwner(1010L, payment));
        assertEquals(7L, payment.getGymId());
        verify(paymentMapper, never()).paymentAdd(any());
    }

    @Test
    void payerOutsideOwnerGymCannotBeUsedForManualSale() throws Exception {
        PaymentDTO payment = new PaymentDTO();
        payment.setUsername(3030L);
        when(paymentMapper.getOwnerGymId(1010L)).thenReturn(7L);
        when(paymentMapper.isValidOwnerPaymentTarget(7L, 3030L, null)).thenReturn(0);

        assertThrows(IllegalArgumentException.class,
                () -> paymentService.paymentAddForOwner(1010L, payment));
        verify(paymentMapper, never()).paymentAdd(any());
    }

    @Test
    void anotherGymsPaymentIsNotDeletedOrRecalculated() throws Exception {
        when(paymentMapper.getOwnerGymId(1010L)).thenReturn(7L);
        when(paymentMapper.getPaymentByIdForGym(55L, 7L)).thenReturn(null);

        PaymentDeleteResult result = paymentService.paymentDeleteForOwner(1010L, 55L);

        assertFalse(result.isDeleted());
        verify(paymentMapper, never()).paymentDeleteForGym(any(), any());
        verify(settleService, never()).recalcCommissionAfterPaymentDeleted(any(), any());
    }

    @Test
    void ownerPaymentIsDeletedAndRecalculatedForOwnerGym() throws Exception {
        PaymentDTO payment = new PaymentDTO();
        payment.setGymId(7L);
        payment.setPayDate(LocalDate.of(2026, 7, 22));
        when(paymentMapper.getOwnerGymId(1010L)).thenReturn(7L);
        when(paymentMapper.getPaymentByIdForGym(55L, 7L)).thenReturn(payment);
        when(paymentMapper.paymentDeleteForGym(55L, 7L)).thenReturn(1);
        when(settleService.recalcCommissionAfterPaymentDeleted(7L, payment.getPayDate())).thenReturn(false);

        PaymentDeleteResult result = paymentService.paymentDeleteForOwner(1010L, 55L);

        assertEquals(true, result.isDeleted());
        verify(paymentMapper).paymentDeleteForGym(55L, 7L);
        verify(settleService).recalcCommissionAfterPaymentDeleted(7L, payment.getPayDate());
    }
}
