package com.health.app.payment;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.health.app.config.JwtUtill;
import com.health.app.contract.ContractDTO;
import com.health.app.pager.Pager;
import io.jsonwebtoken.Claims;

/**
 * 결제(매출, h_payment) 원장 CRUD를 처리하는 REST 컨트롤러
 */
@RestController
@RequestMapping("/fitb/payment")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private JwtUtill jwtUtill;

    // 신규 결제(매출) 등록 API (OWNER용)
    @PostMapping("/payadd")
    public ResponseEntity<?> paymentAdd(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PaymentDTO paymentDTO) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        int result = paymentService.paymentAdd(paymentDTO);
        if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    // 매출 정보 내역 페이징 조회 API (OWNER용)
    @GetMapping("/paylist")
    public ResponseEntity<?> paymentList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String sort) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        Long ownerPhone = Long.parseLong(claims.getSubject());

        Pager pager = new Pager();
        pager.setCurrentPage(page);
        pager.setPageSize(pageSize);
        pager.setSearchKeyword(keyword);
        pager.setMonth(month);

        return ResponseEntity.ok(paymentService.paymentList(ownerPhone, pager, sort));
    }

    // CSV 내보내기용 매출 전체 목록 조회 API (OWNER용, 현재 검색어/조회월 조건 반영, 페이징 없음)
    @GetMapping("/paylist/export")
    public ResponseEntity<?> paymentListAll(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String month) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        Long ownerPhone = Long.parseLong(claims.getSubject());

        Pager pager = new Pager();
        pager.setSearchKeyword(keyword);
        pager.setMonth(month);

        return ResponseEntity.ok(paymentService.paymentListAll(ownerPhone, pager));
    }

    // 매출(결제) 내역 삭제 API (OWNER용) - 해당 월 커미션이 미지급 상태면 자동 재계산, 지급 완료 상태면 경고만 반환
    @DeleteMapping("/pay/{payId}")
    public ResponseEntity<?> paymentDelete(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("payId") Long payId) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        PaymentDeleteResult result = paymentService.paymentDelete(payId);
        if (!result.isDeleted()) {
            return ResponseEntity.badRequest().body("Fail");
        }

        return ResponseEntity.ok(result);
    }

    // 미결제 완료 회원 계약서 목록 조회 API (OWNER용)
    @GetMapping("/unpaid-contracts")
    public ResponseEntity<?> unpaidContractList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        Claims claims;
        try {
            claims = jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        Long ownerPhone = Long.parseLong(claims.getSubject());
        List<ContractDTO> list = paymentService.unpaidContractList(ownerPhone);
        return ResponseEntity.ok(list);
    }

}
