package com.health.app.pager;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class Pager {

    // 현재 페이지 번호
    private Long currentPage;
    
    // 한 페이지당 출력할 데이터 개수 (LIMIT)
    private Long pageSize; 
    
    // SQL 조회를 위한 오프셋 (OFFSET - 건너뛸 행의 수)
    private Long offset;
    
    // 이전 블록 존재 여부
    private boolean hasPrev = true;
    
    // 다음 블록 존재 여부
    private boolean hasNext = true;
    
    // 검색어 키워드
    private String searchKeyword = "";
    
    // 검색 기준 컬럼
    private String searchType;
    
    // 페이징 블록의 시작 페이지 번호 (예: 1, 6, 11)
    private Long startPage;
    
    // 페이징 블록의 끝 페이지 번호 (예: 5, 10, 15)
    private Long endPage;
    
    // 현재 페이지 번호 Getter (널 및 음수 값 방어 보정)
    public Long getCurrentPage() {
        if (this.currentPage == null || this.currentPage < 1) {
            this.currentPage = 1L;
        }
        return currentPage;    
    }
    
    // 페이지당 데이터 개수 Getter (널 및 음수 값 방어 보정, 기본값 10개)
    public Long getPageSize() {
        if (this.pageSize == null || this.pageSize < 1) {
            this.pageSize = 10L;
        }
        return pageSize;
    }
    
    // LIMIT OFFSET 계산 메서드
    public void makeOffset() {
        this.offset = (this.getCurrentPage() - 1) * this.getPageSize();
    }
    
    // 페이징 블록([1 2 3 4 5] 형태의 버튼 그룹) 생성 메서드
    public void makeBlock(Long totalCount) {
        // 한 블록당 노출할 페이지 번호 버튼 개수 (요청 조건: 5개)
        Long perBlock = 5L;
        
        if (totalCount == 0) {
            perBlock = 1L;
            hasNext = false;
            hasPrev = false;
        }
        
        // 총 페이지 수 계산
        Long totalPage = totalCount / this.getPageSize();
        if (totalCount % getPageSize() != 0) {
            totalPage++;
        }
        
        // 총 블록 수 계산
        Long totalBlock = totalPage / perBlock;
        if (totalPage % perBlock != 0) {
            totalBlock++;
        }
        
        // 현재 블록 번호 계산
        Long curBlock = this.getCurrentPage() / perBlock;
        if (getCurrentPage() % perBlock != 0) {
            curBlock++;
        }
        
        // 페이징 바 시작 페이지와 끝 페이지 지정
        startPage = (curBlock - 1) * perBlock + 1;
        endPage = curBlock * perBlock;
        
        // 마지막 블록일 경우 끝 페이지 번호 보정 및 다음 그룹 비활성화
        if (curBlock.equals(totalBlock)) {
            endPage = totalPage;
            hasNext = false;
        }
        
        // 첫 번째 블록일 경우 이전 그룹 비활성화
        if (curBlock < 2) {
            hasPrev = false;
        }
    }
}
