package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ItemService {

    @Autowired
    private ItemMapper itemMapper;

    // 아이템 등록 맵퍼 호출
    public int itemAdd(ItemDTO itemDTO) throws Exception {

        return itemMapper.itemAdd(itemDTO);
    }

    // 아이템 리스트 맵퍼 호출
    public List<ItemDTO> itemList(Long gymId) throws Exception {

        return itemMapper.itemList(gymId);

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
