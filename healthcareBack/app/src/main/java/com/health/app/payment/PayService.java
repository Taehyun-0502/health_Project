package com.health.app.payment;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.contract.ContractDTO;

/**
 * 회원 셀프결제(h_pay) 확정 및 매출(h_payment) 반영 트리거를 담당하는 서비스 클래스
 * TODO: 쿠폰 연동(coupon 도메인 병합 후 재작업 예정) - 현재는 쿠폰 적용 없이 계약 금액 그대로 결제 처리
 */
@Service
public class PayService {

    @Autowired
    private PayMapper payMapper;

    // 결제 확정 시 매출 원장(h_payment)에 반영하기 위한 협력 호출
    @Autowired
    private PaymentService paymentService;

    // 회원 셀프결제 확정 처리
    // 1. 계약 검증(본인 소유/서명완료/미결제) -> 2. h_pay insert -> 3. h_payment insert(매출 반영)
    // 하나라도 실패하면 전체 롤백되도록 단일 트랜잭션으로 처리
    @Transactional
    public PayDTO checkout(Long dataId, Long username) throws Exception {
        ContractDTO contract = payMapper.findPayableContract(dataId, username);
        if (contract == null) {
            throw new IllegalStateException("결제 가능한 계약이 아니거나 이미 결제가 완료된 계약입니다.");
        }

        long price = contract.getAmount();

        String itemLabel = contract.getContract() == 3 ? "이용권" : "PT";
        String pName = String.format("[계약 #%d] %s - %s", dataId, itemLabel, contract.getReceiverName());

        PayDTO pay = new PayDTO();
        pay.setDataId(dataId);
        pay.setUsername(username);
        pay.setPPrice(price);
        pay.setPName(pName);
        pay.setCreatedAt(LocalDate.now());

        payMapper.insertPay(pay);

        PaymentDTO payment = new PaymentDTO();
        payment.setUsername(username);
        payment.setGymId(contract.getGymId());
        payment.setInstallment(0);
        payment.setPayPrice(price);
        payment.setPayDate(LocalDate.now());
        payment.setPayName(pName);
        payment.setDataId(dataId);
        paymentService.paymentAdd(payment);

        return pay;
    }

}
