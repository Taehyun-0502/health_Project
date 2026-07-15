package com.health.app.payment;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.contract.ContractDTO;
import com.health.app.contract.ContractService;
import com.health.app.coupon.CouponDTO;
import com.health.app.coupon.CouponService;

/**
 * 현장 결제(h_pay) 확정 및 매출(h_payment) 반영 트리거를 담당하는 서비스 클래스
 * 결제 확정 주체는 계약을 발행한 사장님(sender)이며, h_pay/h_payment에 기록되는 결제 당사자는
 * 회원(receiver)이다.
 */
@Service
public class PayService {

    @Autowired
    private PayMapper payMapper;

    // 결제 확정 시 매출 원장(h_payment)에 반영하기 위한 협력 호출
    @Autowired
    private PaymentService paymentService;

    @Autowired
    private CouponService couponService;

    // 결제 완료 후 계약 활성화(SIGNED -> ACTIVE + PT 잔여횟수 초기화) 협력 호출
    @Autowired
    private ContractService contractService;

    // 사장님 계정의 결제 확정 처리
    // 1. 계약 검증(본인이 발행한 계약/서명완료/미결제) -> 2. (쿠폰 있으면) 쿠폰 검증 및 할인 적용
    // -> 3. h_pay insert -> 4. 쿠폰 사용완료 처리 -> 5. h_payment insert(매출 반영)
    // 하나라도 실패하면 전체 롤백되도록 단일 트랜잭션으로 처리
    @Transactional
    public PayDTO checkout(Long dataId, Long ownerUsername, Long couponId, int installment) throws Exception {
        if (installment != 0 && installment != 3 && installment != 6 && installment != 12) {
            throw new IllegalStateException("할부 개월 수가 올바르지 않습니다.");
        }

        ContractDTO contract = payMapper.findPayableContract(dataId, ownerUsername);
        if (contract == null) {
            throw new IllegalStateException("결제 가능한 계약이 아니거나 이미 결제가 완료된 계약입니다.");
        }

        Long memberUsername = contract.getReceiverId();
        long price = contract.getAmount();

        if (couponId != null) {
            CouponDTO coupon = couponService.getCouponById(couponId);

            if (coupon == null
                    || !memberUsername.equals(coupon.getToId())
                    || !"미사용".equals(coupon.getStatus())
                    || coupon.getDate() == null || coupon.getDate().isBefore(LocalDate.now())
                    || !contract.getGymId().equals(coupon.getGymId())) {
                throw new IllegalStateException("사용할 수 없는 쿠폰입니다.");
            }

            validateCouponForContract(coupon, contract);

            long discount = price * coupon.getPercent() / 100;
            // 쿠폰 종류에 최대 할인 금액(max_amount)이 설정된 경우 할인액을 그 금액까지만 적용
            if (coupon.getMaxAmount() != null && discount > coupon.getMaxAmount()) {
                discount = coupon.getMaxAmount();
            }
            price -= discount;
        }

        // 체험권(100% 할인) 등으로 최종 금액이 0원이면 할부가 의미 없으므로 일시불로 고정
        if (price == 0) {
            installment = 0;
        }

        String itemLabel = contract.getContract() == 3 ? "이용권"
                : contract.getContract() == 5 ? "PT 체험" : "PT";
        String pName = String.format("[계약 #%d] %s - %s", dataId, itemLabel, contract.getReceiverName());

        PayDTO pay = new PayDTO();
        pay.setDataId(dataId);
        pay.setUsername(memberUsername);
        pay.setPPrice(price);
        pay.setCouponId(couponId);
        pay.setInstallment(installment);
        pay.setPName(pName);
        pay.setCreatedAt(LocalDate.now());

        payMapper.insertPay(pay);

        if (couponId != null) {
            couponService.markUsed(couponId);
        }

        PaymentDTO payment = new PaymentDTO();
        payment.setUsername(memberUsername);
        payment.setGymId(contract.getGymId());
        payment.setInstallment(installment);
        payment.setPayPrice(price);
        payment.setPayDate(LocalDate.now());
        payment.setPayName(pName);
        payment.setDataId(dataId);
        paymentService.paymentAdd(payment);

        // 결제 완료 후 계약 활성화 - 시작일 도래 시 ACTIVE 전이 + PT(4·5) 잔여횟수 초기화,
        // 미래 시작일이면 SIGNED 유지(시작일 도래 시 sweep이 전이). 실패 시 결제 전체 롤백
        ContractDTO activate = new ContractDTO();
        activate.setDataId(dataId);
        activate.setUsername(ownerUsername);
        int activateResult = contractService.contractActivate(activate);
        if (activateResult <= 0) {
            throw new IllegalStateException("계약 활성화에 실패하여 결제를 취소했습니다.");
        }

        return pay;
    }

    // 쿠폰 카테고리별 적용 가능 계약 유형 검증 (새 카테고리 추가 시 case만 확장)
    // 헬스: 이용권 계약(3) / PT·체험권: PT 계약(4)
    // 개월수(couponDate)/횟수(couponCount) 일치 제약은 정책 결정으로 제거됨 — 카테고리만 맞으면 사용 가능
    private void validateCouponForContract(CouponDTO coupon, ContractDTO contract) {
        String category = coupon.getCategory() == null ? "" : coupon.getCategory();

        switch (category) {
            case "헬스" -> {
                if (contract.getContract() != 3) {
                    throw new IllegalStateException("계약 유형과 맞지 않는 쿠폰입니다.");
                }
            }
            case "PT" -> {
                if (contract.getContract() != 4) {
                    throw new IllegalStateException("계약 유형과 맞지 않는 쿠폰입니다.");
                }
            }
            // 체험권 쿠폰은 PT 체험 계약(5) 결제에 사용 (기존 PT(4) 사용도 하위 호환 허용)
            case "체험권" -> {
                if (contract.getContract() != 4 && contract.getContract() != 5) {
                    throw new IllegalStateException("계약 유형과 맞지 않는 쿠폰입니다.");
                }
            }
            default -> throw new IllegalStateException("지원하지 않는 쿠폰 카테고리입니다.");
        }
    }

}
