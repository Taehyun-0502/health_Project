package com.health.app.settle;

import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * 매출(결제) 삭제 결과 및 커미션 자동 재계산 처리 결과를 함께 담는 응답 DTO
 */
@Getter
@AllArgsConstructor
public class PayDeleteResult {

    // 매출 삭제 성공 여부
    private boolean deleted;
    // 해당 월 커미션이 이미 '지급' 상태라 자동 재계산을 건너뛰었는지 여부 (관리자 확인 필요)
    private boolean alreadyPaidWarning;

}
