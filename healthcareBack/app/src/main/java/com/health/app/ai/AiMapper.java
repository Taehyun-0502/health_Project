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

    // 회원 1명의 최신 이탈 예측 결과 (h_churn_result, 이력 누적 → 최신 churn_date 1건)
    // get_churn_prediction 도구 전용 - churn/result 패키지 미변경 원칙에 따라 ai 패키지에 둔다.
    com.health.app.result.ResultDTO latestChurnResult(@Param("username") Long username) throws Exception;
}
