package com.health.app.item;

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
class ItemControllerTest {

    @Mock
    private ItemService itemService;

    @Mock
    private JwtUtill jwtUtill;

    @InjectMocks
    private ItemController itemController;

    @Test
    void missingTokenReturnsUnauthorized() throws Exception {
        ResponseEntity<?> response = itemController.itemAdd(null, new ItemDTO());

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        verify(itemService, never()).itemAddForOwner(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void nonOwnerTokenReturnsForbidden() throws Exception {
        Claims claims = org.mockito.Mockito.mock(Claims.class);
        when(jwtUtill.extractAllClaims("token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("2020");
        when(claims.get("role")).thenReturn("MEMBER");

        ResponseEntity<?> response = itemController.itemUpdate("Bearer token", new ItemDTO());

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        verify(itemService, never()).itemUpdateForOwner(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void hiddenOrMissingItemReturnsNotFound() throws Exception {
        Claims claims = org.mockito.Mockito.mock(Claims.class);
        ItemDTO item = new ItemDTO();
        when(jwtUtill.extractAllClaims("token")).thenReturn(claims);
        when(claims.getSubject()).thenReturn("1010");
        when(claims.get("role")).thenReturn("OWNER");
        when(itemService.itemDeleteForOwner(1010L, item)).thenReturn(0);

        ResponseEntity<?> response = itemController.itemDelete("Bearer token", item);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }
}
