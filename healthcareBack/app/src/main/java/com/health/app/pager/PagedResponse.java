package com.health.app.pager;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

// 페이징 목록 API 공통 응답 래퍼: 현재 페이지 목록(items), 페이징 정보(pager),
// 필터 조건 적용 전체 건수(totalCount), 필터 조건 적용 전체 합계 금액(totalAmount, 금액 합산이 필요없는 목록은 0)을 함께 반환
@Getter
@Setter
@AllArgsConstructor
public class PagedResponse<T> {

    private List<T> items;
    private Pager pager;
    private long totalCount;
    private long totalAmount;

}
