package com.health.app.ai;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AiMapper {

    // 대화 세션
    int conversationInsert(AiConversationDTO conversation) throws Exception;

    AiConversationDTO conversationFind(@Param("conversationId") Long conversationId) throws Exception;

    List<AiConversationDTO> conversationList(@Param("username") Long username) throws Exception;

    int conversationTouch(@Param("conversationId") Long conversationId) throws Exception;

    // 메시지
    int messageInsert(AiMessageDTO message) throws Exception;

    List<AiMessageDTO> messageList(@Param("conversationId") Long conversationId) throws Exception;

    // 도구 호출 감사 로그
    int auditInsert(AiToolAuditDTO audit) throws Exception;
}
