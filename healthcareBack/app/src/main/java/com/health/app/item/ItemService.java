package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class ItemService {

    @Autowired
    private ItemMapper itemMapper;

    public int itemAdd(ItemDTO itemDTO) throws Exception {

        return itemMapper.itemAdd(itemDTO);
    }

    public List<ItemDTO> itemList(int gymId) throws Exception {

        return itemMapper.itemList(gymId);

    }

}
