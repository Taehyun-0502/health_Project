package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.health.app.pager.Pager;

@CrossOrigin("*")
@RestController
@RequestMapping("/fitb/itempage/*")
public class ItemController {

    @Autowired
    private ItemService itemService;

    // 아이템 등록 메서드
    @PostMapping("add")
    public int itemAdd(@RequestBody ItemDTO newItem) throws Exception {
        System.err.println(newItem);
        return itemService.itemAdd(newItem);
    }

    // 아이템 리스트 페이징 조회 메서드: page/pageSize/keyword를 Pager로 묶고, sort(count_desc/count_asc/price_desc/price_asc)로 정렬조건 전달, {items, pager} 형태로 응답
    @GetMapping("list")
    public ItemListResponse itemList(
            Long gymId,
            @RequestParam(required = false) Long page,
            @RequestParam(required = false) Long pageSize,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String sort,
            @RequestParam(required = false) String category) throws Exception {

        Pager pager = new Pager();
        pager.setCurrentPage(page);
        pager.setPageSize(pageSize);
        pager.setSearchKeyword(keyword);

        return itemService.itemList(gymId, pager, sort, category);
    }

    // 물품 등록 폼 자동완성용 물품명 전체 조회 메서드 (페이징 없음)
    @GetMapping("names")
    public List<ItemDTO> itemNames(Long gymId) throws Exception {
        return itemService.itemNames(gymId);
    }

    // CSV 내보내기용 전체 목록 조회 메서드: 현재 화면의 검색조건(keyword)은 반영하되 페이징은 없이 전체 반환 (CSV 변환은 프론트에서 처리)
    @GetMapping("export")
    public List<ItemDTO> itemListAll(
            Long gymId,
            @RequestParam(required = false) String keyword) throws Exception {
        return itemService.itemListAll(gymId, keyword);
    }

    // 특정 카테고리(기본:기구) 아이템 목록 조회 — 이탈통계 기구불만 옆 표시용
    @GetMapping("byCategory")
    public List<ItemDTO> itemByCategory(
            Long gymId,
            @RequestParam(required = false, defaultValue = "기구") String category) throws Exception {
        return itemService.selectByCategory(gymId, category);
    }

    // 아이템 상세보기 메서드
    @GetMapping("detail")
    public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception {

        return itemService.itemDetail(itemDTO);

    }

    // 아이템 업테이트(수정) 메서드
    @PostMapping("update")
    public int itemUpdate(@RequestBody ItemDTO itemDTO) throws Exception {

        return itemService.itemUpdate(itemDTO);
    }

    // 등록된 아이템 삭제 메서드
    @PostMapping("delete")
    public int itemDelete(@RequestBody ItemDTO itemDTO) throws Exception {

        return itemService.itemDelete(itemDTO);

    }

}
