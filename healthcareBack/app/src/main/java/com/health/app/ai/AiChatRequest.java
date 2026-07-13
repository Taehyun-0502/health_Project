package com.health.app.ai;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

// POST /ai/chat 요청 바디
@Getter
@Setter
@ToString
public class AiChatRequest {

    private Long conversationId; // null이면 새 대화 세션 생성
    private String message;      // 사용자 입력
}
