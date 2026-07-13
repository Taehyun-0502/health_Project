package com.health.app.ai;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// h_ai_conversation 매핑 DTO
@Getter
@Setter
@ToString
public class AiConversationDTO {

    private Long conversationId; // PK
    private Long username;       // FK -> h_member.username (8자리)
    private Long gymId;          // FK -> h_gym
    private String role;         // 대화 시점 role 스냅샷
    private String title;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
