package com.health.app.item;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ItemMapper {

    public int itemAdd(ItemDTO itemDTO) throws Exception;

    public List<ItemDTO> itemList(int gymId) throws Exception;
}
