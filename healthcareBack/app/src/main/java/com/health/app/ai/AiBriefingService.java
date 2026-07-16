package com.health.app.ai;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.health.app.complaint.ComplaintDTO;
import com.health.app.complaint.ComplaintService;
import com.health.app.contract.ContractDTO;
import com.health.app.dashboard.DashboardMapper;
import com.health.app.pager.Pager;
import com.health.app.pager.PagedResponse;
import com.health.app.payment.PaymentService;
import com.health.app.settle.SettleService;

/**
 * 태스크 브리핑("오늘 처리할 일") 집계 - 결정적 백엔드 집계로 Anthropic 호출/크레딧 소모 없음.
 * gym_id/username은 항상 JWT 기반 AuthContext에서 주입한다(테넌트 격리).
 * 후보(건수>0)만 노출하며, 대시보드 영역용은 랜덤 3개 / 온디맨드(get_task_briefing)는 전체를 반환한다.
 * linkTo는 서버 메타에서만 반환한다(프론트 임의 URL·선택 금지).
 * 미확정 라우트(이탈·미결제·커미션·월급)는 /fitb/dashboard로 임시 연결 - 팀원 라우트 확정 시 여기만 교체.
 */
@Service
public class AiBriefingService {

    private static final int RANDOM_PICK = 3;

    @Autowired
    private DashboardMapper dashboardMapper;

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private SettleService settleService;

    @Autowired
    private ComplaintService complaintService;

    // 브리핑 후보 집계 - all=false면 랜덤 3개(대시보드 영역), true면 전체(온디맨드 도구)
    public Map<String, Object> briefing(AuthContext ctx, boolean all) throws Exception {

        List<Map<String, Object>> candidates = new ArrayList<>();

        // ① 이탈 예방하기 - 지점 고위험(이탈 확률 0.7 이상) 회원 수
        Map<String, Object> churn = dashboardMapper.ownerChurnSummary(ctx.getGymId());
        long highRisk = numberOf(churn == null ? null : churn.get("highRiskCount"));
        if (highRisk > 0) {
            candidates.add(item("churn", "이탈 예방하기", highRisk, "danger", "/fitb/dashboard"));
        }

        // ② 계약서 작성하기 - 30일 내 만료 임박 계약 (expiringContract 소스 재사용)
        List<Map<String, Object>> expiring = dashboardMapper.ownerExpiringContract(ctx.getGymId());
        if (expiring != null && !expiring.isEmpty()) {
            candidates.add(item("expiring", "계약서 작성하기 (만료 임박)", expiring.size(), "warning", "/fitb/contractpage"));
        }

        // ③ 미결제 확인하기 - 서명 완료 후 결제 미완료 회원 계약
        List<ContractDTO> unpaid = paymentService.unpaidContractList(ctx.getUsername());
        if (unpaid != null && !unpaid.isEmpty()) {
            candidates.add(item("unpaid", "미결제 확인하기", unpaid.size(), "warning", "/fitb/dashboard"));
        }

        // ④ 지출 내역 확인 - 1슬롯 묶음(커미션 지급=제휴(1), 월급 지급=임금(2)), 둘 다 0건이면 묶음 제외
        Pager pager = new Pager();
        pager.setCurrentPage(1L);
        pager.setPageSize(200L);
        PagedResponse<ContractDTO> unpaidExpense = settleService.unpaidExpenseContractList(ctx.getUsername(), pager);
        long commissionCount = 0;
        long wageCount = 0;
        if (unpaidExpense != null && unpaidExpense.getItems() != null) {
            for (ContractDTO row : unpaidExpense.getItems()) {
                if (row.getContract() != null && row.getContract() == 1L) {
                    commissionCount++;
                } else if (row.getContract() != null && row.getContract() == 2L) {
                    wageCount++;
                }
            }
        }
        if (commissionCount > 0 || wageCount > 0) {
            Map<String, Object> bundle = item("expense", "지출 내역 확인", commissionCount + wageCount, "warning", null);
            List<Map<String, Object>> subItems = new ArrayList<>();
            if (commissionCount > 0) {
                subItems.add(item("commission", "커미션 지급", commissionCount, "warning", "/fitb/dashboard"));
            }
            if (wageCount > 0) {
                subItems.add(item("wage", "월급 지급", wageCount, "warning", "/fitb/dashboard"));
            }
            bundle.put("bundle", subItems);
            candidates.add(bundle);
        }

        // ⑤ 미처리 건의사항 - status != 처리완료
        List<ComplaintDTO> complaints = complaintService.ownerList(ctx.getGymId());
        long openComplaints = complaints == null ? 0
                : complaints.stream().filter(c -> !"처리완료".equals(c.getStatus())).count();
        if (openComplaints > 0) {
            candidates.add(item("complaint", "미처리 건의사항", openComplaints, "warning", "/fitb/b2bmypage/b2bcomplaint"));
        }

        // 대시보드 영역: 후보 풀에서 랜덤 3개 (3개 미만이면 있는 만큼)
        List<Map<String, Object>> items = candidates;
        if (!all && candidates.size() > RANDOM_PICK) {
            List<Map<String, Object>> shuffled = new ArrayList<>(candidates);
            Collections.shuffle(shuffled);
            items = new ArrayList<>(shuffled.subList(0, RANDOM_PICK));
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        return result;
    }

    private Map<String, Object> item(String key, String label, long count, String tone, String linkTo) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("key", key);
        map.put("label", label);
        map.put("count", count);
        map.put("tone", tone);
        if (linkTo != null) {
            map.put("linkTo", linkTo);
        }
        return map;
    }

    private long numberOf(Object value) {
        return value instanceof Number ? ((Number) value).longValue() : 0L;
    }
}
