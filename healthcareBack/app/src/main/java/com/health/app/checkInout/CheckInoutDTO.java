package com.health.app.checkInout;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class CheckInoutDTO {

    private Long id;
    private Long username;
    private LocalDateTime checkIn;
    private Long duration;

}
