package com.health.app.ai;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// h_ai_tool_audit 매핑 DTO - 도구 호출 감사 로그
@Getter
@Setter
@ToString
public class AiToolAuditDTO {

    private Long auditId;        // PK
    private Long conversationId; // FK -> h_ai_conversation
    private Long messageId;      // FK -> h_ai_message (nullable)
    private Long username;
    private Long gymId;
    private String toolName;
    private String classification; // READ / WRITE
    private String params;         // jsonb (JWT 주입 후 최종 인자)
    private String status;         // requested / confirmed / executed / rejected / failed
    private String resultSummary;
    private String error;
    private LocalDateTime createdAt;
}
