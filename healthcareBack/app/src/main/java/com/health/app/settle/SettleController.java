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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.health.app.config.JwtUtill;
import com.health.app.contract.ContractDTO;
import com.health.app.pager.Pager;
import io.jsonwebtoken.Claims;

/**
 * 정산, 매출, 지출 및 플랫폼 커미션 관리를 처리하는 REST 컨트롤러
 */
@RestController
@RequestMapping("/fitb/settle") // 와일드카드 /* 제거
public class SettleController {

    @Autowired
    private SettleService settleService;

    @Autowired
    private JwtUtill jwtUtill;

    // Authorization 헤더에서 로그인 사용자 정보 추출 메서드
    private Claims extractClaims(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        try {
            return jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    // 신규 결제(매출) 등록 API (OWNER용)
    @PostMapping("/payadd")
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

    // 매출 정보 내역 페이징 조회 API (OWNER용)
    @GetMapping("/paylist")
    public ResponseEntity<?> payList(
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

        return ResponseEntity.ok(settleService.payList(ownerPhone, pager, sort));
    }

    // CSV 내보내기용 매출 전체 목록 조회 API (OWNER용, 현재 검색어/조회월 조건 반영, 페이징 없음)
    @GetMapping("/paylist/export")
    public ResponseEntity<?> payListAll(
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

        return ResponseEntity.ok(settleService.payListAll(ownerPhone, pager));
    }

    // 매출(결제) 내역 삭제 API (OWNER용) - 해당 월 커미션이 미지급 상태면 자동 재계산, 지급 완료 상태면 경고만 반환
    @DeleteMapping("/pay/{payId}")
    public ResponseEntity<?> payDelete(
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

        PayDeleteResult result = settleService.payDelete(payId);
        if (!result.isDeleted()) {
            return ResponseEntity.badRequest().body("Fail");
        }

        return ResponseEntity.ok(result);
    }

    // 미결제 완료 회원 계약서 목록 조회 API (OWNER용, UserDTO -> ContractDTO 정정)
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
        List<ContractDTO> list = settleService.unpaidContractList(ownerPhone);
        return ResponseEntity.ok(list);
    }

    // 전체 가맹점 플랫폼 수수료 커미션 내역 페이징 조회 API (ADMIN용)
    @GetMapping("/commission")
    public ResponseEntity<?> commissionList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long pageSize,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String month,
            @RequestParam(required = false) String sort) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        Pager pager = new Pager();
        pager.setCurrentPage(page);
        pager.setPageSize(pageSize);
        pager.setSearchKeyword(status);
        pager.setMonth(month);

        return ResponseEntity.ok(settleService.commissionList(pager, sort));
    }

    // CSV 내보내기용 커미션 전체 목록 조회 API (ADMIN용, 현재 상태/조회월 조건 반영, 페이징 없음)
    @GetMapping("/commission/export")
    public ResponseEntity<?> commissionListAll(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String month) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        Pager pager = new Pager();
        pager.setSearchKeyword(status);
        pager.setMonth(month);

        return ResponseEntity.ok(settleService.commissionListAll(pager));
    }

    // 커미션 대시보드 요약 통계 조회 API (ADMIN용, 필터/페이지와 무관한 전체 집계)
    @GetMapping("/commission/stats")
    public ResponseEntity<?> commissionStats(
            @RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {

        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        }

        try {
            jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("유효하지 않은 토큰입니다.");
        }

        return ResponseEntity.ok(settleService.commissionStats());
    }

    // 커미션 지급 상태 변경 API (ADMIN용)
    @PostMapping("/commission/status")
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

    // 소속 가맹점 지출 내역 페이징 조회 API (OWNER용)
    @GetMapping("/expense")
    public ResponseEntity<?> expenseList(
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

        Long username = Long.parseLong(claims.getSubject());

        Pager pager = new Pager();
        pager.setCurrentPage(page);
        pager.setPageSize(pageSize);
        pager.setSearchKeyword(keyword);
        pager.setMonth(month);

        return ResponseEntity.ok(settleService.expenseList(username, pager, sort));
    }

    // CSV 내보내기용 지출 전체 목록 조회 API (OWNER용, 현재 검색어/조회월 조건 반영, 페이징 없음)
    @GetMapping("/expense/export")
    public ResponseEntity<?> expenseListAll(
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

        Long username = Long.parseLong(claims.getSubject());

        Pager pager = new Pager();
        pager.setSearchKeyword(keyword);
        pager.setMonth(month);

        return ResponseEntity.ok(settleService.expenseListAll(username, pager));
    }

    // 신규 지출 내역 등록 API (OWNER용)
    @PostMapping("/expense")
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

    // 등록된 지출 내역 삭제 API (OWNER용)
    @DeleteMapping("/expense/{expenseId}")
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

    // 특정 대상 월의 플랫폼 정산 커미션 수동 강제 집계 생성 API (ADMIN용)
    @PostMapping("/commission/generate")
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

    // 사장님용: 지출 처리해야 할 임금/제휴 계약서 목록 페이징 조회 API (지출 등록 연동용, UserDTO -> ContractDTO 정정)
    @GetMapping("/unpaid-expenses")
    public ResponseEntity<?> unpaidExpenseContractList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long pageSize) throws Exception {

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

        return ResponseEntity.ok(settleService.unpaidExpenseContractList(ownerPhone, pager));
    }
}
