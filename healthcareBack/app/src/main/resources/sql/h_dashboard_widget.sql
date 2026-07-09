-- 대시보드 위젯 커스텀 설정 테이블 (ERD: h_dashboard_widget)
-- ERD의 phone FK는 실제 스키마 컨벤션에 맞춰 username(전화번호)으로 적용
CREATE TABLE IF NOT EXISTS "h_dashboard_widget" (
    widget_id   bigserial PRIMARY KEY,
    username    int8        NOT NULL REFERENCES "h_member"(username),
    gym_id      int8,
    role        varchar     NOT NULL,
    widget_key  varchar     NOT NULL,
    is_active   boolean     NOT NULL DEFAULT false,
    has_data    boolean     NOT NULL DEFAULT false,
    sort_order  int8        NOT NULL DEFAULT 0,
    updated_at  timestamp   NOT NULL DEFAULT now(),
    UNIQUE (username, widget_key)
);
