package com.health.app.member;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class RefreshTokenDTO {

    private Long username;
    private String refreshToken;
    private LocalDateTime expiryDate;
}
