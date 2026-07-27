package com.health.app.pager;

import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

@Getter
@Setter
@ToString
public class Pager {

    // 한 페이지에 허용하는 최대 행 수.
    // pageSize는 클라이언트 쿼리스트링에서 그대로 들어와 SQL의 LIMIT이 되므로 상한이 없으면
    // pageSize=99999999 한 번으로 테이블 전체를 덤프받을 수 있다(전 목록 API가 이 Pager를 공유).
    // 현재 화면들은 5~10만 사용하므로 100이면 충분한 여유값이다.
    private static final long MAX_PAGE_SIZE = 100L;

    // 기본 페이지 크기 (null·음수 등 잘못된 값이 들어왔을 때)
    private static final long DEFAULT_PAGE_SIZE = 10L;

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

    // 조회월 필터 (YYYY-MM 형식, 선택)
    private String month;

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
    
    // 페이지당 데이터 개수 Getter (널 및 음수 값 방어 보정 + 과대 요청 상한 보정)
    public Long getPageSize() {
        if (this.pageSize == null || this.pageSize < 1) {
            this.pageSize = DEFAULT_PAGE_SIZE;
        } else if (this.pageSize > MAX_PAGE_SIZE) {
            // 과대 요청은 거절하지 않고 상한으로 잘라낸다 (기존 화면 동작을 깨지 않으면서 전량 덤프만 차단)
            this.pageSize = MAX_PAGE_SIZE;
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
