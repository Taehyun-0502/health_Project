package com.health.app.dashboard;

import java.util.List;
import java.util.Map;

import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface DashboardMapper {

    // ===== 위젯 설정 (h_dashboard_widget) =====

    // 로그인 사용자의 위젯 설정 개수 조회 쿼리 호출 (최초 초기화 판단용)
    public int widgetCount(Long username) throws Exception;

    // 로그인 사용자의 위젯 설정 목록 조회 쿼리 호출
    public List<DashboardDTO> widgetList(Long username) throws Exception;

    // 역할별 기본 위젯 설정 등록 쿼리 호출
    public int widgetAdd(DashboardDTO dashboardDTO) throws Exception;

    // 위젯 표시 여부 토글 쿼리 호출 (데이터 없는 위젯은 켤 수 없음)
    public int widgetToggle(DashboardDTO dashboardDTO) throws Exception;

    // 위젯 표시 순서 변경 쿼리 호출
    public int widgetOrderUpdate(DashboardDTO dashboardDTO) throws Exception;

    // 위젯 데이터 적재 여부 갱신 쿼리 호출 (데이터가 쌓이면 자동 활성화)
    public int widgetHasDataUpdate(DashboardDTO dashboardDTO) throws Exception;

    // 로그인 사용자의 소속 지점 번호 조회 쿼리 호출
    public Long memberGymId(Long username) throws Exception;

    // ===== 위젯 데이터 (역할별 집계) =====

    // 관계사: 계약 체육관 수 집계 쿼리 호출
    public Map<String, Object> adminGymCount() throws Exception;

    // 관계사: 30일 내 구독(제휴 계약) 만료 체육관 목록 쿼리 호출
    public List<Map<String, Object>> adminExpiringSubscription() throws Exception;

    // 관계사: 체육관 만족도(설문 평점) 집계 쿼리 호출
    public Map<String, Object> adminNpsSummary() throws Exception;

    // 공용: 최근 6개월 월별 매출 집계 쿼리 호출 (gymId 없으면 전체)
    public List<Map<String, Object>> monthlyRevenue(DashboardDTO dashboardDTO) throws Exception;

    // 공용: 최근 6개월 월별 지출 집계 쿼리 호출 (gymId 없으면 전체)
    public List<Map<String, Object>> monthlyExpense(DashboardDTO dashboardDTO) throws Exception;

    // 사장님: 계약 회원 수 집계 쿼리 호출
    public Map<String, Object> ownerMemberCount(Long gymId) throws Exception;

    // 사장님: 30일 내 계약 만료 회원 목록 쿼리 호출
    public List<Map<String, Object>> ownerExpiringContract(Long gymId) throws Exception;

    // 사장님: 회원 운동 데이터(체성분/이용 패턴) 집계 쿼리 호출
    public Map<String, Object> ownerModelSummary(Long gymId) throws Exception;

    // 트레이너: 담당 회원 수 집계 쿼리 호출
    public Map<String, Object> trainerMemberCount(Long username) throws Exception;

    // 트레이너: 세션 소진 임박 회원 목록 쿼리 호출
    public List<Map<String, Object>> trainerLowSessionMembers(Long username) throws Exception;

    // 트레이너: 최근 6개월 월별 세션(담당 회원 출석) 수행 집계 쿼리 호출
    public List<Map<String, Object>> trainerMonthlySession(Long username) throws Exception;

    // 트레이너: 담당 회원 이탈 예측 집계 쿼리 호출
    public Map<String, Object> trainerChurnSummary(Long username) throws Exception;

}
