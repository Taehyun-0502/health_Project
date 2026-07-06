package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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

    // 아이템 리스트 조회 메서드
    @GetMapping("list")
    public List<ItemDTO> itemList(Long gymId) throws Exception {
        return itemService.itemList(gymId);
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
