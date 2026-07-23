package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.pager.Pager;
import com.health.app.config.JwtUtill;

import io.jsonwebtoken.Claims;

@CrossOrigin("*")
@RestController
@RequestMapping("/fitb/itempage/*")
public class ItemController {

    @Autowired
    private ItemService itemService;

    @Autowired
    private JwtUtill jwtUtill;

    private Claims authenticate(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            return null;
        }
        try {
            return jwtUtill.extractAllClaims(authorization.substring(7));
        } catch (Exception e) {
            return null;
        }
    }

    private boolean isOwner(Claims claims) {
        Object role = claims.get("role");
        return role != null && "OWNER".equalsIgnoreCase(role.toString());
    }

    private boolean canReadItemStats(Claims claims) {
        Object role = claims.get("role");
        if (role == null) return false;
        String value = role.toString();
        return "OWNER".equalsIgnoreCase(value)
                || "TRAINER".equalsIgnoreCase(value)
                || "ADMIN".equalsIgnoreCase(value);
    }

    private Long subject(Claims claims) {
        try {
            return Long.valueOf(claims.getSubject());
        } catch (RuntimeException e) {
            return null;
        }
    }

    // 아이템 등록 메서드
    @PostMapping("add")
    public ResponseEntity<?> itemAdd(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ItemDTO newItem) throws Exception {
        Claims claims = authenticate(authorization);
        if (claims == null || subject(claims) == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        return ResponseEntity.ok(itemService.itemAddForOwner(subject(claims), newItem));
    }

    // 아이템 리스트 페이징 조회 메서드: page/pageSize/keyword를 Pager로 묶고, sort(count_desc/count_asc/price_desc/price_asc)로 정렬조건 전달, {items, pager} 형태로 응답
    @GetMapping("list")
    public ResponseEntity<?> itemList(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String category) throws Exception {

        Claims claims = authenticate(authorization);
        if (claims == null || subject(claims) == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        Pager pager = new Pager();
        pager.setCurrentPage(page);
        pager.setPageSize(pageSize);
        pager.setSearchKeyword(keyword);

        return ResponseEntity.ok(itemService.itemListForOwner(subject(claims), pager, sort, category));
    }

    // 물품 등록 폼 자동완성용 물품명 전체 조회 메서드 (페이징 없음)
    @GetMapping("names")
    public ResponseEntity<?> itemNames(@RequestHeader(value = "Authorization", required = false) String authorization) throws Exception {
        Claims claims = authenticate(authorization);
        if (claims == null || subject(claims) == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        return ResponseEntity.ok(itemService.itemNamesForOwner(subject(claims)));
    }

    // CSV 내보내기용 전체 목록 조회 메서드: 현재 화면의 검색조건(keyword)은 반영하되 페이징은 없이 전체 반환 (CSV 변환은 프론트에서 처리)
    @GetMapping("export")
    public ResponseEntity<?> itemListAll(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) String keyword) throws Exception {
        Claims claims = authenticate(authorization);
        if (claims == null || subject(claims) == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        return ResponseEntity.ok(itemService.itemListAllForOwner(subject(claims), keyword));
    }

    // 특정 카테고리(기본:기구) 아이템 목록 조회 — 이탈통계 기구불만 옆 표시용
    @GetMapping("byCategory")
    public ResponseEntity<?> itemByCategory(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam(required = false) Long gymId,
            @RequestParam(required = false, defaultValue = "기구") String category) throws Exception {
        Claims claims = authenticate(authorization);
        if (claims == null || subject(claims) == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        if (!canReadItemStats(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        String role = claims.get("role").toString();
        try {
            return ResponseEntity.ok(itemService.selectByCategoryForGymUser(subject(claims), role, gymId, category));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // 아이템 상세보기 메서드
    @GetMapping("detail")
    public ResponseEntity<?> itemDetail(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            ItemDTO itemDTO) throws Exception {
        Claims claims = authenticate(authorization);
        if (claims == null || subject(claims) == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        return ResponseEntity.ok(itemService.itemDetailForOwner(subject(claims), itemDTO));

    }

    // 아이템 업테이트(수정) 메서드
    @PostMapping("update")
    public ResponseEntity<?> itemUpdate(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ItemDTO itemDTO) throws Exception {
        Claims claims = authenticate(authorization);
        if (claims == null || subject(claims) == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        int result = itemService.itemUpdateForOwner(subject(claims), itemDTO);
        return result > 0 ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();
    }

    // 등록된 아이템 삭제 메서드
    @PostMapping("delete")
    public ResponseEntity<?> itemDelete(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestBody ItemDTO itemDTO) throws Exception {
        Claims claims = authenticate(authorization);
        if (claims == null || subject(claims) == null) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("로그인이 필요합니다.");
        if (!isOwner(claims)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("접근 권한이 없습니다.");
        int result = itemService.itemDeleteForOwner(subject(claims), itemDTO);
        return result > 0 ? ResponseEntity.ok(result) : ResponseEntity.notFound().build();

    }

}
