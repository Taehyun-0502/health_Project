package com.health.app.item;

import java.util.List;

import com.health.app.pager.Pager;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

// 아이템 목록 API 응답 래퍼: 현재 페이지의 아이템 목록(items), 페이징 정보(pager), 검색조건 적용 전체 건수(totalCount)를 함께 반환하기 위한 DTO
@Getter
@Setter
@AllArgsConstructor
public class ItemListResponse {

    private List<ItemDTO> items;
    private Pager pager;
    private long totalCount;

}
