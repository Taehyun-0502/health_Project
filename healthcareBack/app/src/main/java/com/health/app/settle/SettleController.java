package com.health.app.settle;

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
import org.springframework.web.bind.annotation.RestController;
import com.health.app.config.JwtUtill;
import com.health.app.user.UserDTO;
import io.jsonwebtoken.Claims;

/**
 * 정산, 매출, 지출 및 플랫폼 커미션 관리를 처리하는 REST 컨트롤러
 */
@RestController
@RequestMapping("/fitb/settle/*")
public class SettleController {

    @Autowired
    private SettleService settleService;

    @Autowired
    private JwtUtill jwtUtill;

    /**
     * 신규 결제(매출) 등록 API (OWNER용)
     * 사장님(OWNER)이 미결제 상태의 회원 계약서를 확인하여 매출 결제 정보로 수동 연동 등록합니다.
     */
    @PostMapping("payadd")
    public ResponseEntity<?> payAdd(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody PayDTO payDTO) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        int result = settleService.payAdd(payDTO);
        if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    /**
     * 매출 정보 내역 조회 API (OWNER용)
     */
    @GetMapping("paylist")
    public ResponseEntity<?> payList(
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
        List<PayDTO> list = settleService.payList(ownerPhone);
        return ResponseEntity.ok(list);
    }

    /**
     * 미결제 완료 회원 계약서 목록 조회 API (OWNER용)
     * 사장님이 해당 매장의 서명 완료된 이용권/PT 계약 건중 매출에 연동하지 않은 대상 목록을 보여줍니다.
     */
    @GetMapping("unpaid-contracts")
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
        List<UserDTO> list = settleService.unpaidContractList(ownerPhone);
        return ResponseEntity.ok(list);
    }

    /**
     * 전체 가맹점 플랫폼 수수료 커미션 내역 조회 API (ADMIN용)
     */
    @GetMapping("commission")
    public ResponseEntity<?> commissionList(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        List<CommissionDTO> list = settleService.commissionList();
        return ResponseEntity.ok(list);
    }

    /**
     * 커미션 지급 상태 변경 API (ADMIN용)
     * 수수료 지급 여부 상태를 "지급" <-> "미지급"으로 반전 업데이트 처리합니다.
     */
    @PostMapping("commission/status")
    public ResponseEntity<?> toggleCommissionStatus(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody CommissionDTO req) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        if (req.getSettlementId() == null) {
            return ResponseEntity.badRequest().body("settlementId is required");
        }

        int result = settleService.toggleCommissionStatus(req.getSettlementId());
        if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    /**
     * 소속 가맹점 지출 내역 조회 API (OWNER용)
     * 사장님 계정의 gym_id를 조회하여 매장의 모든 월별 비용 지출 내역을 반환합니다.
     */
    @GetMapping("expense")
    public ResponseEntity<?> expenseList(
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

        Long username = Long.parseLong(claims.getSubject());
        List<ExpenseDTO> list = settleService.expenseList(username);
        return ResponseEntity.ok(list);
    }

    /**
     * 신규 지출 내역 등록 API (OWNER용)
     */
    @PostMapping("expense")
    public ResponseEntity<?> expenseAdd(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ExpenseDTO expenseDTO) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        int result = settleService.expenseAdd(expenseDTO);
        if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    /**
     * 등록된 지출 내역 삭제 API (OWNER용)
     */
    @DeleteMapping("expense/{expenseId}")
    public ResponseEntity<?> expenseDelete(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable("expenseId") Long expenseId) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        int result = settleService.expenseDelete(expenseId);
        if (result > 0) {
            return ResponseEntity.ok("Success");
        } else {
            return ResponseEntity.badRequest().body("Fail");
        }
    }

    /**
     * 특정 대상 월의 플랫폼 정산 커미션 수동 강제 집계 생성 API (ADMIN용)
     * 요청 바디: {"settleMonth": "2026-06-01"}
     */
    @PostMapping("commission/generate")
    public ResponseEntity<?> generateCommissions(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody CommissionDTO req) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        if (req.getSettleMonth() == null) {
            return ResponseEntity.badRequest().body("settleMonth is required");
        }

        int count = settleService.generateMonthlyCommissions(req.getSettleMonth());
        return ResponseEntity.ok("Successfully generated " + count + " commission records.");
    }

    /**
     * 사장님용: 지출 처리해야 할 임금/제휴 계약서 목록 조회 API (지출 등록 연동용)
     */
    @GetMapping("unpaid-expenses")
    public ResponseEntity<?> unpaidExpenseContractList(
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
        List<UserDTO> list = settleService.unpaidExpenseContractList(ownerPhone);
        return ResponseEntity.ok(list);
    }
}
