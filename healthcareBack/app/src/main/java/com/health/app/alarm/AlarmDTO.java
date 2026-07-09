package com.health.app.alarm;

import java.time.LocalDate;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class AlarmDTO {

    private Long alarmId;      // 알림 id (int8, PK)
    private Long receiver;     // 수신자 username(전화번호) (int8, FK)
    private Long sender;       // 발신자 username(전화번호), 시스템 발송 시 null (int8, FK)
    private String message;    // 알림 본문 (varchar)
    private String link;       // 클릭 시 이동할 프론트 경로 (varchar)
    private LocalDate createAt; // 생성일 (date)
    private LocalDateTime readAt; // 읽은 시각, 안읽었으면 null (timestamp)
    private String category;   // 알림 종류 구분값 (varchar)
    private String read;       // 읽음 여부 'Y'/'N' (varchar)
}
