package com.health.app.item;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.health.app.alarm.AlarmService;
import com.health.app.member.MemberDTO;
import com.health.app.member.MemberService;
import com.health.app.pager.Pager;
import com.health.app.settle.ExpenseDTO;
import com.health.app.settle.SettleService;

@Service
public class ItemService {

    @Autowired
    private ItemMapper itemMapper;

    @Autowired
    private SettleService settleService;

    @Autowired
    private AlarmService alarmService;

    @Autowired
    private MemberService memberService;

    private Long ownerGymId(Long username) throws Exception {
        Long gymId = itemMapper.getOwnerGymId(username);
        if (gymId == null) {
            throw new IllegalArgumentException("OWNER 소속 사업장을 찾을 수 없습니다.");
        }
        return gymId;
    }

    @Transactional(rollbackFor = Exception.class)
    public int itemAddForOwner(Long username, ItemDTO itemDTO) throws Exception {
        itemDTO.setGymId(ownerGymId(username));
        return itemAdd(itemDTO);
    }

    public ItemListResponse itemListForOwner(Long username, Pager pager, String sort, String category) throws Exception {
        return itemList(ownerGymId(username), pager, sort, category);
    }

    public List<ItemDTO> itemNamesForOwner(Long username) throws Exception {
        return itemNames(ownerGymId(username));
    }

    public List<ItemDTO> itemListAllForOwner(Long username, String keyword, String category) throws Exception {
        return itemListAll(ownerGymId(username), keyword, category);
    }

    // 상세는 목록의 그룹 키(분류+물품명)로 식별한다. 분류가 없으면 동명이품이 섞이므로 조회 자체를 막는다.
    public List<ItemDTO> itemDetailForOwner(Long username, ItemDTO itemDTO) throws Exception {
        if (itemDTO.getItemName() == null || itemDTO.getItemName().isBlank()
                || itemDTO.getItemCategory() == null || itemDTO.getItemCategory().isBlank()) {
            throw new IllegalArgumentException("물품명과 분류를 함께 지정해 주세요.");
        }
        itemDTO.setGymId(ownerGymId(username));
        return itemDetail(itemDTO);
    }

    public int itemUpdateForOwner(Long username, ItemDTO itemDTO) throws Exception {
        itemDTO.setGymId(ownerGymId(username));
        return itemUpdate(itemDTO);
    }

    public int itemDeleteForOwner(Long username, ItemDTO itemDTO) throws Exception {
        itemDTO.setGymId(ownerGymId(username));
        return itemDelete(itemDTO);
    }

    public List<ItemDTO> selectByCategoryForOwner(Long username, String category) throws Exception {
        return selectByCategory(ownerGymId(username), category);
    }

    public List<ItemDTO> selectByCategoryForGymUser(
            Long username, String role, Long adminGymId, String category) throws Exception {
        Long gymId;
        if (role != null && role.equalsIgnoreCase("ADMIN")) {
            if (adminGymId == null) {
                throw new IllegalArgumentException("조회할 사업장을 선택해 주세요.");
            }
            gymId = adminGymId;
        } else {
            gymId = itemMapper.getGymIdForGymUser(username);
            if (gymId == null) {
                throw new IllegalArgumentException("소속 사업장을 찾을 수 없습니다.");
            }
        }
        return selectByCategory(gymId, category);
    }

    // 아이템 등록 맵퍼 호출. item insert + (구매인 경우) 연동 지출 insert를 하나의 트랜잭션으로 묶어 실패 시 함께 롤백
    @Transactional(rollbackFor = Exception.class)
    public int itemAdd(ItemDTO itemDTO) throws Exception {

        int result = itemMapper.itemAdd(itemDTO);

        // itemCount가 양수인 경우만 "구매"로 간주해 지출 연동 (음수=폐기는 지출이 아니므로 제외)
        if (result > 0 && itemDTO.getItemCount() != null && itemDTO.getItemCount() > 0) {
            ExpenseDTO expenseDTO = new ExpenseDTO();
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
    public ItemListResponse itemList(Long gymId, Pager pager, String sort, String category) throws Exception {

        pager.makeOffset();
        List<ItemDTO> items = itemMapper.itemList(gymId, pager, sort, category);
        long totalCount = itemMapper.itemListCount(gymId, pager, category);
        pager.makeBlock(totalCount);

        return new ItemListResponse(items, pager, totalCount);
    }

    // 물품 등록 폼 자동완성용 물품명 목록 맵퍼 호출
    public List<ItemDTO> itemNames(Long gymId) throws Exception {

        return itemMapper.itemNames(gymId);
    }

    // CSV 내보내기용 전체 목록(현재 검색어 + 카테고리 칩 조건 반영, 페이징 없음) 맵퍼 호출
    public List<ItemDTO> itemListAll(Long gymId, String keyword, String category) throws Exception {

        return itemMapper.itemListAll(gymId, keyword, category);
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

    // 특정 gym의 특정 카테고리 아이템 목록 맵퍼 호출 (이탈통계 기구불만 옆 표시용)
    public List<ItemDTO> selectByCategory(Long gymId, String category) throws Exception {
        return itemMapper.selectByCategory(gymId, category);
    }

    // 유효기간 임박(D-3) 알림 배치 비즈니스 로직: 대상 조회 후 gym별 사장님에게 알림 발송
    // 알림 발송/조회 실패는 개별 건만 건너뛰고 나머지 건 처리를 막지 않도록 각 건마다 격리
    public int checkExpiringItems() throws Exception {
        List<ItemDTO> expiring = itemMapper.findExpiringItems();

        int sentCount = 0;
        for (ItemDTO item : expiring) {
            try {
                // h_gym.gym_ownernum은 사업자 등록번호라 회원 식별에 쓸 수 없음 - h_member에서 gym_id+role=OWNER로 직접 조회
                MemberDTO owner = memberService.findOwnerByGymId(item.getGymId());
                if (owner == null || owner.getUsername() == null) {
                    continue;
                }

                String message = String.format("[%s] %s의 유효기간이 3일 후(%s) 만료됩니다.",
                        item.getItemCategory(), item.getItemName(), item.getItemExpiryDate());

                alarmService.sendAlarm(owner.getUsername(), null, message, "/fitb/itempage", "ITEM_EXPIRY");
                sentCount++;
            } catch (Exception e) {
                System.err.println("유효기간 임박 알림 발송 실패 (itemId=" + item.getItemId() + "): " + e.getMessage());
            }
        }
        return sentCount;
    }

}
