package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.health.app.pager.Pager;

@Service
public class ItemService {

    @Autowired
    private ItemMapper itemMapper;

    // 아이템 등록 맵퍼 호출
    public int itemAdd(ItemDTO itemDTO) throws Exception {

        return itemMapper.itemAdd(itemDTO);
    }

    // 아이템 리스트 맵퍼 호출: 페이지 목록 조회 -> 전체 건수 조회 -> Pager에 offset/블록 정보 계산 후 목록+Pager를 함께 반환
    public ItemListResponse itemList(Long gymId, Pager pager) throws Exception {

        pager.makeOffset();
        List<ItemDTO> items = itemMapper.itemList(gymId, pager);
        long totalCount = itemMapper.itemListCount(gymId, pager);
        pager.makeBlock(totalCount);

        return new ItemListResponse(items, pager, totalCount);
    }

    // 물품 등록 폼 자동완성용 물품명 목록 맵퍼 호출
    public List<ItemDTO> itemNames(Long gymId) throws Exception {

        return itemMapper.itemNames(gymId);
    }

    // 아이템 디테일 맵퍼 호출
    public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception {

        return itemMapper.itemDetail(itemDTO);
    }

    // 등록 아이템 수정 맵퍼 호출
    public int itemUpdate(ItemDTO itemDTO) throws Exception {

        return itemMapper.itemUpdate(itemDTO);
    }

    // 등록 아이템 삭제 맵퍼 호출
    public int itemDelete(ItemDTO itemDTO) throws Exception {
        return itemMapper.itemDelete(itemDTO);
    }

}
