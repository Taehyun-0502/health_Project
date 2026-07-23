package com.health.app.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

@ExtendWith(MockitoExtension.class)
class PaymentControllerTest {

    @Mock
    private PaymentService paymentService;

    @Mock
    private JwtUtill jwtUtill;

    @InjectMocks
    private PaymentController paymentController;

    @Test
    void missingTokenReturnsUnauthorized() throws Exception {
        ResponseEntity<?> response = paymentController.paymentAdd(null, new PaymentDTO());

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(paymentService, never()).paymentAddForOwner(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void nonOwnerTokenReturnsForbidden() throws Exception {
        Claims claims = org.mockito.Mockito.mock(Claims.class);
        when(jwtUtill.extractAllClaims("token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("2020");
        when(claims.get("role")).thenReturn("MEMBER");

        ResponseEntity<?> response = paymentController.paymentDelete("Bearer token", 55L);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(paymentService, never()).paymentDeleteForOwner(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void hiddenOrMissingPaymentReturnsNotFound() throws Exception {
        Claims claims = org.mockito.Mockito.mock(Claims.class);
        when(jwtUtill.extractAllClaims("token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("1010");
        when(claims.get("role")).thenReturn("OWNER");
        when(paymentService.paymentDeleteForOwner(1010L, 55L))
                .thenReturn(new PaymentDeleteResult(false, false));

        ResponseEntity<?> response = paymentController.paymentDelete("Bearer token", 55L);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void invalidOwnerPaymentTargetReturnsBadRequest() throws Exception {
        Claims claims = org.mockito.Mockito.mock(Claims.class);
        PaymentDTO payment = new PaymentDTO();
        when(jwtUtill.extractAllClaims("token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("1010");
        when(claims.get("role")).thenReturn("OWNER");
        when(paymentService.paymentAddForOwner(1010L, payment))
                .thenThrow(new IllegalArgumentException("invalid target"));

        ResponseEntity<?> response = paymentController.paymentAdd("Bearer token", payment);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }
}
