package com.health.app.item;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import com.health.app.pager.Pager;

@Mapper
public interface ItemMapper {

    // 아이템 등록 쿼리 호출
    public int itemAdd(ItemDTO itemDTO) throws Exception;

    // 아이템 리스트 페이징 조회 쿼리 호출 (gymId + Pager(페이지/검색어) + 정렬조건(sort: count_desc/count_asc/price_desc/price_asc, 기본은 이름순))
    public List<ItemDTO> itemList(@Param("gymId") Long gymId, @Param("pager") Pager pager, @Param("sort") String sort) throws Exception;

    // 아이템 리스트 전체 건수 조회 쿼리 호출 (Pager의 총 페이지/블록 계산용)
    public long itemListCount(@Param("gymId") Long gymId, @Param("pager") Pager pager) throws Exception;

    // 물품 등록 폼 자동완성용 물품명 전체 조회 쿼리 호출 (페이징 없음)
    public List<ItemDTO> itemNames(Long gymId) throws Exception;

    // CSV 내보내기용 전체 목록 조회 쿼리 호출 (gymId + 검색어 조건, 페이징 없음)
    public List<ItemDTO> itemListAll(@Param("gymId") Long gymId, @Param("keyword") String keyword) throws Exception;

    // 등록된 아이템의 디테일 쿼리 호출
    public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception;

    // 등록된 아이템 수정 쿼리 호출
    public int itemUpdate(ItemDTO itemDTO) throws Exception;

    // 등록된 아이템 삭제 쿼리 호출
    public int itemDelete(ItemDTO itemDTO) throws Exception;

    // 유효기간 임박(D-3) 알림 배치용: 전체 gym 대상 구매 건 조회 쿼리 호출
    public List<ItemDTO> findExpiringItems() throws Exception;
}
