package com.health.app.item;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ItemMapper {

    // 아이템 등록 쿼리 호출
    public int itemAdd(ItemDTO itemDTO) throws Exception;

    // 아이템 리스트 쿼리 호출
    public List<ItemDTO> itemList(Long gymId) throws Exception;

    // 등록된 아이템의 디테일 쿼리 호출
    public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception;

    // 등록된 아이템 수정 쿼리 호출
    public int itemUpdate(ItemDTO itemDTO) throws Exception;

    // 등록된 아이템 삭제 쿼리 호출
    public int itemDelete(ItemDTO itemDTO) throws Exception;
}
