package com.health.app.checkInout;

/**
 * 키오스크 인증 시도 제한에 걸렸을 때 던지는 예외.
 *
 * 일반 검증 실패(IllegalStateException, 400)와 구분해야 컨트롤러가 429(Too Many Requests)로
 * 응답할 수 있고, 프론트도 "잠시 후 다시" 안내를 따로 보여줄 수 있다.
 */
public class AttendanceLockedException extends RuntimeException {

    public AttendanceLockedException(String message) {
        super(message);
    }
}
