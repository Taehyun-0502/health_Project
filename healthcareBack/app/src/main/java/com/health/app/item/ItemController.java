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

    @PostMapping("add")
    public int itemAdd(@RequestBody ItemDTO newItem) throws Exception {
        System.err.println(newItem);
        return itemService.itemAdd(newItem);
    }

    @GetMapping("list")
    public List<ItemDTO> itemList(int gymId) throws Exception {
        return itemService.itemList(gymId);
    }

    @GetMapping("detail")
    public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception {

        return itemService.itemDetail(itemDTO);

    }

    @PostMapping("update")
    public int itemUpdate(@RequestBody ItemDTO itemDTO) throws Exception {

        return itemService.itemUpdate(itemDTO);
    }

    @PostMapping("delete")
    public int itemDelete(@RequestBody ItemDTO itemDTO) throws Exception {

        return itemService.itemDelete(itemDTO);

    }

}
