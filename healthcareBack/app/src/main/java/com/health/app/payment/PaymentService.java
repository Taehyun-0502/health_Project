package com.health.app.payment;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.health.app.contract.ContractDTO;
import com.health.app.pager.PagedResponse;
import com.health.app.pager.Pager;
import com.health.app.settle.SettleService;

/**
 * 결제(매출, h_payment) 원장 관련 비즈니스 로직을 처리하는 서비스 클래스
 */
@Service
public class PaymentService {

    @Autowired
    private PaymentMapper paymentMapper;

    // 매출 삭제 후 커미션 재계산은 settle 도메인(정산 계산 로직)이 소유 - 협력 호출
    @Autowired
    private SettleService settleService;

    // 결제 매출 등록 처리
    public int paymentAdd(PaymentDTO paymentDTO) throws Exception {
        return paymentMapper.paymentAdd(paymentDTO);
    }

    // 매출 목록 페이징 조회 처리: 목록 조회 -> 전체 건수/합계 조회 -> Pager에 offset/블록 정보 계산 후 함께 반환
    public PagedResponse<PaymentDTO> paymentList(Long username, Pager pager, String sort) throws Exception {
        pager.makeOffset();
        List<PaymentDTO> items = paymentMapper.paymentList(username, pager, sort);
        long totalCount = paymentMapper.paymentListCount(username, pager);
        long totalAmount = paymentMapper.paymentListSum(username, pager);
        pager.makeBlock(totalCount);

        return new PagedResponse<>(items, pager, totalCount, totalAmount);
    }

    // CSV 내보내기용 매출 전체 목록 조회 처리 (현재 검색어/조회월 조건 반영, 페이징 없음)
    public List<PaymentDTO> paymentListAll(Long username, Pager pager) throws Exception {
        return paymentMapper.paymentListAll(username, pager);
    }

    // 미결제 계약서 목록 조회 처리 (매출 연동용)
    public List<ContractDTO> unpaidContractList(Long username) throws Exception {
        return paymentMapper.unpaidContractList(username);
    }

    // 매출(결제) 삭제 및 해당 월 커미션 자동 재계산 처리
    // - 아직 커미션이 생성되지 않은 달: 재계산할 대상이 없으므로 그대로 종료 (다음 정산 생성 시 자동으로 최신 매출 반영됨)
    // - 커미션이 '미지급' 상태인 달: 삭제 후 남은 매출 기준으로 즉시 재계산하여 반영
    // - 커미션이 '지급' 상태인 달: 이미 지급 완료된 금액이라 자동으로 낮추지 않고, 관리자 확인이 필요하다는 경고만 반환
    @org.springframework.transaction.annotation.Transactional
    public PaymentDeleteResult paymentDelete(Long payId) throws Exception {
        PaymentDTO pay = paymentMapper.getPaymentById(payId);
        if (pay == null) {
            return new PaymentDeleteResult(false, false);
        }

        int result = paymentMapper.paymentDelete(payId);
        if (result <= 0) {
            return new PaymentDeleteResult(false, false);
        }

        boolean alreadyPaidWarning = settleService.recalcCommissionAfterPaymentDeleted(pay.getGymId(),
                pay.getPayDate());
        return new PaymentDeleteResult(true, alreadyPaidWarning);
    }

}
