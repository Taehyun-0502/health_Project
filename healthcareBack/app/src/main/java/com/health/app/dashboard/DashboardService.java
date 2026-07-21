package com.health.app.dashboard;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DashboardService {

    @Autowired
    private DashboardMapper dashboardMapper;

    // 역할별 기본 위젯 구성 (표시 순서대로)
    private static final Map<String, List<String>> DEFAULT_WIDGETS = Map.of(
            // 관계사: 계약 체육관 수 / 다가오는 구독 만료 / 월별 총 매출 / 월별 총 지출 / 체육관 만족도
            "ADMIN", List.of("gymCount", "expiringSubscription", "monthlyRevenue", "monthlyExpense", "gymNps"),
            // 사장님: 계약 회원 수 / 다가오는 계약 만료 / 월별 총 매출 / 월별 총 지출 / 체성분(운동 데이터) 추이 / 헬스장 이탈율 / 월별 예측 이탈률 추이
            "OWNER", List.of("memberCount", "expiringContract", "monthlyRevenue", "monthlyExpense", "bodyComposition", "gymChurn", "gymChurnTrend", "gymRiskTrend"),
            // 트레이너: 담당 회원 수 / 세션 소진 임박 / 월별 세션 수행 / 회원 이탈 예측 / 목표 달성률
            "TRAINER", List.of("managedMemberCount", "lowSessionMembers", "monthlySession", "memberChurn", "goalRate"));

    // 로그인 사용자의 소속 지점 번호 조회 맵퍼 호출
    public Long memberGymId(Long username) throws Exception {

        return dashboardMapper.memberGymId(username);
    }

    // 위젯 설정 목록 맵퍼 호출 (최초 조회 시 기본 세트 생성 + has_data 자동 갱신)
    @Transactional
    public List<DashboardDTO> widgetList(Long username, String role, Long gymId) throws Exception {

        List<String> defaults = DEFAULT_WIDGETS.get(role);
        if (defaults == null) {
            // 대시보드를 지원하지 않는 역할
            return List.of();
        }

        gymId = isolatedGymId(role, gymId);

        // 설정에 아직 없는 기본 위젯 등록 (최초 진입이면 전체, 기본 세트에 위젯이 새로 생기면 해당 키만 보충)
        List<DashboardDTO> existing = dashboardMapper.widgetList(username);
        boolean firstInit = existing.isEmpty();
        Set<String> existingKeys = new HashSet<>();
        long maxOrder = 0;
        for (DashboardDTO widget : existing) {
            existingKeys.add(widget.getWidgetKey());
            maxOrder = Math.max(maxOrder, widget.getSortOrder() == null ? 0 : widget.getSortOrder());
        }
        Set<String> addedKeys = new HashSet<>();
        for (String widgetKey : defaults) {
            if (existingKeys.contains(widgetKey)) {
                continue;
            }
            DashboardDTO widget = new DashboardDTO();
            widget.setUsername(username);
            widget.setGymId(gymId);
            widget.setRole(role);
            widget.setWidgetKey(widgetKey);
            widget.setIsActive(false);
            widget.setHasData(false);
            widget.setSortOrder(++maxOrder);
            dashboardMapper.widgetAdd(widget);
            addedKeys.add(widgetKey);
        }

        // 실제 데이터 적재 여부 확인 후 has_data 갱신
        // (최초 진입·신규 추가 위젯은 데이터 있으면 기본 켜짐, 이후에는 사용자가 편집한 켜짐/꺼짐 상태 유지)
        List<DashboardDTO> widgets = dashboardMapper.widgetList(username);
        for (DashboardDTO widget : widgets) {
            boolean hasData = checkHasData(widget.getWidgetKey(), role, gymId, username);
            boolean active = hasData && (firstInit || addedKeys.contains(widget.getWidgetKey())
                    || Boolean.TRUE.equals(widget.getIsActive()));
            if (widget.getHasData() == null || widget.getHasData() != hasData
                    || Boolean.TRUE.equals(widget.getIsActive()) != active) {
                widget.setHasData(hasData);
                widget.setIsActive(active);
                dashboardMapper.widgetHasDataUpdate(widget);
            }
        }
        return widgets;
    }

    // 위젯 표시 여부 토글 맵퍼 호출 (0 반환 시 데이터 없음 잠금 또는 위젯 없음)
    public int widgetToggle(Long username, String widgetKey, Boolean isActive) throws Exception {

        DashboardDTO widget = new DashboardDTO();
        widget.setUsername(username);
        widget.setWidgetKey(widgetKey);
        widget.setIsActive(isActive);
        return dashboardMapper.widgetToggle(widget);
    }

    // 위젯 표시 순서 일괄 변경 맵퍼 호출
    public int widgetOrderUpdate(Long username, List<DashboardDTO> widgets) throws Exception {

        int updated = 0;
        for (DashboardDTO widget : widgets) {
            if (widget.getWidgetKey() == null || widget.getSortOrder() == null) {
                continue;
            }
            widget.setUsername(username);
            updated += dashboardMapper.widgetOrderUpdate(widget);
        }
        return updated;
    }

    // 활성 위젯들의 대시보드 데이터 조회 (widgetKey -> 집계 데이터)
    public Map<String, Object> widgetData(Long username, String role, Long gymId) throws Exception {

        gymId = isolatedGymId(role, gymId);

        Map<String, Object> data = new LinkedHashMap<>();
        for (DashboardDTO widget : widgetList(username, role, gymId)) {
            if (Boolean.TRUE.equals(widget.getIsActive()) && Boolean.TRUE.equals(widget.getHasData())) {
                data.put(widget.getWidgetKey(), loadWidgetData(widget.getWidgetKey(), role, gymId, username));
            }
        }
        return data;
    }

    // 위젯별 데이터 적재 여부 확인
    private boolean checkHasData(String widgetKey, String role, Long gymId, Long username) throws Exception {

        switch (widgetKey) {
            case "gymCount":
            case "expiringSubscription":
                return countOf(dashboardMapper.adminGymCount()) > 0;
            case "monthlyRevenue":
                return !dashboardMapper.monthlyRevenue(monthlyScope(role, gymId)).isEmpty();
            case "monthlyExpense":
                return !dashboardMapper.monthlyExpense(monthlyScope(role, gymId)).isEmpty();
            case "gymNps":
                return countOf(dashboardMapper.adminNpsSummary()) > 0;
            case "memberCount":
            case "expiringContract":
                return countOf(dashboardMapper.ownerMemberCount(gymId)) > 0;
            case "bodyComposition":
                return countOf(dashboardMapper.ownerModelSummary(gymId)) > 0;
            case "gymChurn":
                return countOf(dashboardMapper.ownerChurnSummary(gymId)) > 0;
            case "gymChurnTrend":
                return !dashboardMapper.ownerChurnTrend(gymId).isEmpty();
            case "gymRiskTrend":
                return !dashboardMapper.ownerRiskTrend(gymId).isEmpty();
            case "managedMemberCount":
            case "lowSessionMembers":
                return countOf(dashboardMapper.trainerMemberCount(username)) > 0;
            case "monthlySession":
                return !dashboardMapper.trainerMonthlySession(username).isEmpty();
            case "memberChurn":
                return countOf(dashboardMapper.trainerChurnSummary(username)) > 0;
            default:
                // goalRate 등 아직 데이터 소스가 없는 위젯은 잠금 유지
                return false;
        }
    }

    // 위젯별 집계 데이터 조회
    private Object loadWidgetData(String widgetKey, String role, Long gymId, Long username) throws Exception {

        switch (widgetKey) {
            case "gymCount":
                return dashboardMapper.adminGymCount();
            case "expiringSubscription":
                return dashboardMapper.adminExpiringSubscription();
            case "monthlyRevenue":
                return dashboardMapper.monthlyRevenue(monthlyScope(role, gymId));
            case "monthlyExpense":
                return dashboardMapper.monthlyExpense(monthlyScope(role, gymId));
            case "gymNps":
                return dashboardMapper.adminNpsSummary();
            case "memberCount":
                return dashboardMapper.ownerMemberCount(gymId);
            case "expiringContract":
                return dashboardMapper.ownerExpiringContract(gymId);
            case "bodyComposition":
                return dashboardMapper.ownerModelSummary(gymId);
            case "gymChurn":
                return dashboardMapper.ownerChurnSummary(gymId);
            case "gymChurnTrend":
                return dashboardMapper.ownerChurnTrend(gymId);
            case "gymRiskTrend":
                return dashboardMapper.ownerRiskTrend(gymId);
            case "managedMemberCount":
                return dashboardMapper.trainerMemberCount(username);
            case "lowSessionMembers":
                return dashboardMapper.trainerLowSessionMembers(username);
            case "monthlySession":
                return dashboardMapper.trainerMonthlySession(username);
            case "memberChurn":
                return dashboardMapper.trainerChurnSummary(username);
            default:
                return null;
        }
    }

    // 사장님 계정에 지점 정보가 없으면 다른 지점 데이터가 노출되지 않도록 차단
    private Long isolatedGymId(String role, Long gymId) {

        if ("OWNER".equals(role) && gymId == null) {
            return -1L;
        }
        return gymId;
    }

    // 월별 매출/지출 집계 범위: 관계사는 전체, 사장님은 소속 지점
    private DashboardDTO monthlyScope(String role, Long gymId) {

        DashboardDTO scope = new DashboardDTO();
        if ("OWNER".equals(role)) {
            scope.setGymId(gymId);
        }
        return scope;
    }

    // 집계 결과 Map의 total 값 추출
    private long countOf(Map<String, Object> summary) {

        if (summary == null || summary.get("total") == null) {
            return 0;
        }
        return ((Number) summary.get("total")).longValue();
    }

}
