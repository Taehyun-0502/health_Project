package com.health.app.ai;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// h_ai_message 매핑 DTO
@Getter
@Setter
@ToString
public class AiMessageDTO {

    private Long messageId;      // PK
    private Long conversationId; // FK -> h_ai_conversation
    private String role;         // user / assistant / tool
    private String content;
    private String toolName;     // role=tool일 때만
    private String toolArgs;     // jsonb (JWT 주입 후 최종 인자)
    private String toolResult;   // jsonb
    private Long tokenIn;        // Anthropic usage.input_tokens
    private Long tokenOut;       // Anthropic usage.output_tokens
    private LocalDateTime createdAt;
}
