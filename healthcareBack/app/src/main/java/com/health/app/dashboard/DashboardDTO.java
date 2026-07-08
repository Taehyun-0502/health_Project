package com.health.app.dashboard;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class DashboardDTO {

    private Long widgetId;          // 위젯 설정 번호 (int8)
    private Long username;          // 회원 아이디/전화번호 (int8)
    private Long gymId;             // 사업장 정보 번호 (int8)
    private String role;            // 역할 권한 (varchar)
    private String widgetKey;       // 위젯 식별 키 (varchar)
    private Boolean isActive;       // 대시보드 표시 여부 (boolean)
    private Boolean hasData;        // 데이터 적재 여부 - false면 잠금 (boolean)
    private Long sortOrder;         // 표시 순서 (int8)
    private LocalDateTime updatedAt;// 마지막 변경 시각 (timestamp)

}
