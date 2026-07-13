-- =============================================================
-- AI 비서 (Phase 0/1 MVP) 신규 테이블 DDL
-- 대상 DB: PostgreSQL, 관례: h_ 접두 테이블, FK ON UPDATE CASCADE
-- 루트 CLAUDE.md "AI 비서 상세 설계 > 4. ERD" 기준
-- =============================================================

-- 대화 세션
CREATE TABLE IF NOT EXISTS "h_ai_conversation" (
    conversation_id BIGSERIAL PRIMARY KEY,
    username        INT8 NOT NULL REFERENCES "h_member"(username) ON UPDATE CASCADE, -- 전화 뒤 8자리
    gym_id          INT8 REFERENCES "h_gym"(gym_id) ON UPDATE CASCADE,               -- 테넌트 격리 축
    role            VARCHAR(20) NOT NULL,                                            -- 대화 시점 role 스냅샷
    title           VARCHAR(200),
    created_at      TIMESTAMP NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_h_ai_conversation_username ON "h_ai_conversation"(username);
CREATE INDEX IF NOT EXISTS idx_h_ai_conversation_gym ON "h_ai_conversation"(gym_id);

-- 대화 메시지 (멀티턴)
CREATE TABLE IF NOT EXISTS "h_ai_message" (
    message_id      BIGSERIAL PRIMARY KEY,
    conversation_id INT8 NOT NULL REFERENCES "h_ai_conversation"(conversation_id) ON UPDATE CASCADE ON DELETE CASCADE,
    role            VARCHAR(20) NOT NULL,  -- user / assistant / tool
    content         TEXT,
    tool_name       VARCHAR(100),          -- role=tool일 때만
    tool_args       JSONB,                 -- JWT 주입 후 최종 인자
    tool_result     JSONB,
    token_in        INT8,                  -- Anthropic usage.input_tokens (assistant 턴)
    token_out       INT8,                  -- Anthropic usage.output_tokens (assistant 턴)
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_h_ai_message_conversation ON "h_ai_message"(conversation_id);

-- 도구 호출 감사 로그 (WRITE 확인 흐름 상태 전이 포함 - Phase 1은 READ만 사용)
CREATE TABLE IF NOT EXISTS "h_ai_tool_audit" (
    audit_id        BIGSERIAL PRIMARY KEY,
    conversation_id INT8 REFERENCES "h_ai_conversation"(conversation_id) ON UPDATE CASCADE ON DELETE CASCADE,
    message_id      INT8 REFERENCES "h_ai_message"(message_id) ON UPDATE CASCADE ON DELETE SET NULL,
    username        INT8 NOT NULL,
    gym_id          INT8,
    tool_name       VARCHAR(100) NOT NULL,
    classification  VARCHAR(10) NOT NULL,  -- READ / WRITE
    params          JSONB,                 -- JWT 주입 후 최종 인자
    status          VARCHAR(20) NOT NULL,  -- requested / confirmed / executed / rejected / failed
    result_summary  TEXT,
    error           TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_h_ai_tool_audit_conversation ON "h_ai_tool_audit"(conversation_id);
CREATE INDEX IF NOT EXISTS idx_h_ai_tool_audit_username ON "h_ai_tool_audit"(username);
