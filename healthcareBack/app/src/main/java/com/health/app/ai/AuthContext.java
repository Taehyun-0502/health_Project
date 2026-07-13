package com.health.app.ai;

// AI 오케스트레이터 인증 컨텍스트 - JWT에서 추출한 값만 담는다.
// 모든 도구 호출의 gymId/username은 이 컨텍스트에서 주입하고 LLM 인자는 폐기(하드닝 레이어 원칙)
public class AuthContext {

    private final Long username; // 전화 뒤 8자리
    private final String role;   // ADMIN/OWNER/TRAINER/MEMBER (대문자 정규화)
    private final Long gymId;    // 소속 지점 (없으면 -1로 차단)

    public AuthContext(Long username, String role, Long gymId) {
        this.username = username;
        this.role = role;
        this.gymId = gymId;
    }

    public Long getUsername() {
        return username;
    }

    public String getRole() {
        return role;
    }

    public Long getGymId() {
        return gymId;
    }
}
