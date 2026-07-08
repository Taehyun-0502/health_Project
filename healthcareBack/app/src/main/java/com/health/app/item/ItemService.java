package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.pager.Pager;
import com.health.app.settle.ExpenseDTO;
import com.health.app.settle.SettleService;

@Service
public class ItemService {

    @Autowired
    private ItemMapper itemMapper;

    @Autowired
    private SettleService settleService;

    // 아이템 등록 맵퍼 호출. item insert + (구매인 경우) 연동 지출 insert를 하나의 트랜잭션으로 묶어 실패 시 함께 롤백
    @Transactional(rollbackFor = Exception.class)
    public int itemAdd(ItemDTO itemDTO) throws Exception {

        int result = itemMapper.itemAdd(itemDTO);

        // itemCount가 양수인 경우만 "구매"로 간주해 지출 연동 (음수=폐기는 지출이 아니므로 제외)
        if (result > 0 && itemDTO.getItemCount() != null && itemDTO.getItemCount() > 0) {
            ExpenseDTO expenseDTO = new ExpenseDTO();
            expenseDTO.setExpenseId(System.currentTimeMillis()); // settle 페이지의 Date.now() 임시 채번 관례를 그대로 따름
            expenseDTO.setGymId(itemDTO.getGymId());
            expenseDTO.setDataId(null); // 계약 연동 지출이 아니므로 null
            expenseDTO.setExpenseName(itemDTO.getItemName() + " 구매");
            expenseDTO.setExpenseDate(itemDTO.getItemDate());
            long price = itemDTO.getItemPrice() != null ? itemDTO.getItemPrice() : 0L;
            expenseDTO.setExpensePrice(price * itemDTO.getItemCount());
            expenseDTO.setExpenseRate(0);
            expenseDTO.setOriginItemId(itemDTO.getItemId()); // 방금 채번된 item_id를 연결고리로 저장

            settleService.expenseAdd(expenseDTO);
        }

        return result;
    }

    // 아이템 리스트 맵퍼 호출: 페이지 목록 조회 -> 전체 건수 조회 -> Pager에 offset/블록 정보 계산 후 목록+Pager를 함께 반환
    // sort: count_desc/count_asc/price_desc/price_asc, null이면 기본(이름순)
    public ItemListResponse itemList(Long gymId, Pager pager, String sort) throws Exception {

        pager.makeOffset();
        List<ItemDTO> items = itemMapper.itemList(gymId, pager, sort);
        long totalCount = itemMapper.itemListCount(gymId, pager);
        pager.makeBlock(totalCount);

        return new ItemListResponse(items, pager, totalCount);
    }

    // 물품 등록 폼 자동완성용 물품명 목록 맵퍼 호출
    public List<ItemDTO> itemNames(Long gymId) throws Exception {

        return itemMapper.itemNames(gymId);
    }

    // CSV 내보내기용 전체 목록(현재 검색조건 반영, 페이징 없음) 맵퍼 호출
    public List<ItemDTO> itemListAll(Long gymId, String keyword) throws Exception {

        return itemMapper.itemListAll(gymId, keyword);
    }

    // 아이템 디테일 맵퍼 호출
    public List<ItemDTO> itemDetail(ItemDTO itemDTO) throws Exception {

        return itemMapper.itemDetail(itemDTO);
    }

    // 등록 아이템 수정 맵퍼 호출
    public int itemUpdate(ItemDTO itemDTO) throws Exception {

        return itemMapper.itemUpdate(itemDTO);
    }

    // 등록 아이템 삭제 맵퍼 호출
    public int itemDelete(ItemDTO itemDTO) throws Exception {
        return itemMapper.itemDelete(itemDTO);
    }

}
