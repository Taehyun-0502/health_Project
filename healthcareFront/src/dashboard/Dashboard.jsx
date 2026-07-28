import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import NavIcon from '../components/uiIcons.jsx';
import './Dashboard.css';

// 위젯 키별 표시 이름 (백엔드 h_dashboard_widget.widget_key와 매핑)
// OWNER 위젯 세트 개편(2026-07-22 확정)으로 memberCount·expiringContract·bodyComposition은
// 더 이상 어느 역할의 DEFAULT_WIDGETS에도 없는 죽은 키라 라벨을 제거했다 — 아래 KNOWN 필터로
// h_dashboard_widget에 잔존할 수 있는 구 키 행을 렌더·편집 목록에서 제외한다.
const WIDGET_LABEL = {
  gymCount: '계약 체육관 수',
  expiringSubscription: '다가오는 구독 만료',
  monthlyRevenue: '월별 총 매출',
  monthlyExpense: '월별 총 지출',
  gymNps: '체육관 불만도',
  gymChurn: '헬스장 이탈율',
  managedMemberCount: '담당 회원 수',
  lowSessionMembers: '세션 소진 임박',
  monthlySession: '월별 세션 수행',
  memberChurn: '회원 이탈 예측',
  goalRate: '목표 달성률',
  // OWNER 위젯 세트 개편 (2026-07-22 확정)
  activeMemberCount: '총 회원 수',
  couponUsage: '쿠폰 사용',
  expiringMemberCount: '만료 임박 회원 수',
  todayAttendance: '오늘 출석',
  churnTrend: '월별 이탈 위험군 추이',
};

const ROLE_LABEL = { ADMIN: '관계사', OWNER: '사장님', TRAINER: '트레이너' };

// 위젯 배치 폭 (목업 기준: KPI 4열 한 줄 · 리스트 2열 · 차트 전폭)
// 사용자가 지정한 위젯 순서(sortOrder)는 유지하고 각 카드의 grid span만 달리한다.
const WIDGET_LAYOUT = {
  gymCount: 'kpi',
  managedMemberCount: 'kpi',
  gymNps: 'kpi',
  memberChurn: 'kpi',
  gymChurn: 'kpi',
  goalRate: 'kpi',
  monthlyRevenue: 'chart',
  monthlyExpense: 'chart',
  monthlySession: 'chart',
  // OWNER 위젯 세트 개편 (2026-07-22 확정)
  activeMemberCount: 'kpi',
  couponUsage: 'kpi',
  expiringMemberCount: 'kpi',
  todayAttendance: 'kpi',
  churnTrend: 'chart',
};
const layoutOf = (widgetKey) => WIDGET_LAYOUT[widgetKey] ?? 'list';

// 차트 위젯 계열 정보 (범례 라벨 + 막대 색)
const CHART_SERIES = {
  monthlyRevenue: { label: '매출', tone: 'accent' },
  monthlyExpense: { label: '지출', tone: 'gray' },
  monthlySession: { label: '세션', tone: 'accent' },
  churnTrend: { label: '위험군', tone: 'blue' },
};

// 매출·지출은 둘 다 켜져 있으면 한 카드에 월별 묶음 막대로 함께 그린다.
// 위젯 키·토글 API·h_dashboard_widget은 그대로이고, 편집 모달에서만 한 행으로 묶어 보여준다
// (한 행 = 두 키를 같은 상태로 함께 켜고 끄며 순서도 함께 이동).
const REVENUE_EXPENSE_KEYS = ['monthlyRevenue', 'monthlyExpense'];
const MERGED_REVENUE_EXPENSE_LABEL = '월별 총 매출·지출';

// 편집 모달·순서 이동의 단위 행. 카드에서 하나로 합쳐 그리는 매출·지출은 편집에서도 한 행으로 묶는다.
// 단, 한쪽만 데이터가 있으면 묶지 않는다 — 묶어서 잠그면 데이터가 있는 쪽까지 켤 수 없게 된다.
const buildWidgetRows = (list) => {
  const pair = REVENUE_EXPENSE_KEYS.map((key) => list.find((w) => w.widgetKey === key));
  const merge = pair.every((w) => w && w.hasData);
  const rows = [];
  let mergedDone = false;

  list.forEach((widget) => {
    if (merge && REVENUE_EXPENSE_KEYS.includes(widget.widgetKey)) {
      if (mergedDone) return; // 묶음 행은 둘 중 먼저 오는 자리에 한 번만 넣는다
      mergedDone = true;
      rows.push({
        key: REVENUE_EXPENSE_KEYS.join('+'),
        label: MERGED_REVENUE_EXPENSE_LABEL,
        widgets: pair,
        hasData: true,
        isActive: pair.every((w) => w.isActive),
      });
      return;
    }
    rows.push({
      key: widget.widgetKey,
      label: WIDGET_LABEL[widget.widgetKey] ?? widget.widgetKey,
      widgets: [widget],
      hasData: widget.hasData,
      isActive: widget.isActive,
    });
  });

  return rows;
};

// 회원/직원 관리 기존 라우트 (팀원 개편 중 - 현재 401 발생 상태 그대로 유지, merge 후 실제 라우트로 교체)
const MANAGEMENT_ROUTE = '/fitb/management';
// 이탈 리포트 페이지 (헬스장 이탈 통계 리포트)
const REPORT_ROUTE = '/fitb/report';

// 위젯 카드 클릭 시 이동 라우트 (OWNER 위젯 세트 개편 2026-07-22 확정)
const WIDGET_LINK = {
  activeMemberCount: MANAGEMENT_ROUTE,
  todayAttendance: MANAGEMENT_ROUTE,
  monthlyRevenue: '/fitb/Settlepage',
  monthlyExpense: '/fitb/Settlepage',
  gymChurn: REPORT_ROUTE,
};

// AI 영역 왼쪽 질문 카드 4종 - 단일 위젯/메서드로 없어서 AI가 READ 도구를 조합해야 답할 수 있는 질문
// 질문 문구는 이 메타에 고정한다 (사용자 입력 아님 - 전송 질문 예측 가능, 임의 문자열 주입 여지 없음)
const AI_QUESTIONS = [
  { key: 'netprofit', tag: '매출 × 지출', question: '최근 6개월 순이익 추이 알려줘' },
  { key: 'renewal', tag: '계약', question: 'PT 계약 갱신율은 어때?' },
  { key: 'unpaid', tag: '결제', question: '미결제 회원 알려줘' },
  { key: 'churn', tag: '이탈 예측', question: '이탈 위험이 높은 회원은 누구야?' },
];

// 역할별 커스텀 대시보드 (1부: 위젯 조회/토글/순서 변경/데이터 표시)
// 위젯 편집 모달(팝업) — ESC·바깥 클릭·닫기 버튼으로 닫힌다.
// 표시 전용 컴포넌트로, 토글·순서 변경은 상위에서 내려준 기존 핸들러(같은 API)를 그대로 호출한다.
function WidgetEditModal({ rows, onToggle, onReorder, onClose }) {
  const boxRef = useRef(null);
  // 이동 핸들 드래그 상태 (drag=끌고 있는 행, over=놓을 자리 - 시각 표시용)
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const onBackdropClick = (e) => {
    if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
  };

  const resetDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  // 드래그는 핸들에서만 시작하고, 끌리는 미리보기는 행 전체로 보여준다
  const handleDragStart = (index) => (e) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index)); // Firefox는 데이터가 있어야 드래그가 시작된다
    const row = e.currentTarget.closest('li');
    if (row) e.dataTransfer.setDragImage(row, 12, row.offsetHeight / 2);
  };

  const handleDragOver = (index) => (e) => {
    if (dragIndex === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index !== overIndex) setOverIndex(index);
  };

  const handleDrop = (index) => (e) => {
    if (dragIndex === null) return;
    e.preventDefault();
    const from = dragIndex;
    resetDrag();
    onReorder(from, index);
  };

  // 드래그를 쓸 수 없는 환경(키보드 조작)에서도 위/아래로 옮길 수 있게 방향키를 지원한다
  const handleHandleKeyDown = (index) => (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    onReorder(index, index + (e.key === 'ArrowUp' ? -1 : 1));
  };

  return (
    <div className="dash-modal-back" onClick={onBackdropClick}>
      <div className="dash-modal" ref={boxRef} role="dialog" aria-modal="true" aria-label="위젯 편집">
        <div className="dash-modal__head">
          <h4 className="dash-modal__title">위젯 편집</h4>
          <button type="button" className="dash-modal__close" onClick={onClose} aria-label="닫기">
            <NavIcon id="close" size={18} />
          </button>
        </div>
        <p className="dash-modal__desc">대시보드에 표시할 위젯을 켜고 끌 수 있어요</p>

        <ul className="dash-modal__list">
          {rows.map((row, index) => {
            const rowClass = [
              row.hasData ? '' : 'locked',
              dragIndex === index ? 'dragging' : '',
              overIndex === index && dragIndex !== null && dragIndex !== index ? 'is-over' : '',
            ].filter(Boolean).join(' ');

            return (
              <li
                key={row.key}
                className={rowClass}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop(index)}
                onDragEnd={resetDrag}
              >
                <span
                  className={row.hasData ? 'dash-modal__handle' : 'dash-modal__handle is-disabled'}
                  role="button"
                  aria-disabled={!row.hasData}
                  tabIndex={row.hasData ? 0 : -1}
                  aria-label={`${row.label} 순서 이동 (위·아래 방향키 또는 드래그)`}
                  draggable={row.hasData}
                  onDragStart={handleDragStart(index)}
                  onKeyDown={handleHandleKeyDown(index)}
                >
                  <NavIcon id="grip" size={16} />
                </span>
                <label>
                  <input
                    type="checkbox"
                    checked={row.isActive}
                    disabled={!row.hasData}
                    onChange={() => onToggle(row.widgets)}
                  />
                  {row.label}
                </label>
                {!row.hasData && <span className="dash-badge">데이터 없음</span>}
              </li>
            );
          })}
        </ul>

        <p className="dash-modal__hint">
          왼쪽 이동 핸들을 끌어 순서를 바꿀 수 있어요. 데이터가 없는 위젯은 켤 수 없어요.
        </p>
        <div className="dash-modal__actions">
          <button type="button" className="dash-modal__done" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [widgets, setWidgets] = useState([]);
  const [data, setData] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [briefing, setBriefing] = useState(null); // null=미로드, []=처리할 일 없음
  const [bundleOpen, setBundleOpen] = useState(false);

  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('accessToken');
  // Phase 1.5(프리뷰 게이트): 대시보드 AI 영역은 ADMIN·OWNER·TRAINER 모두 노출
  // (ADMIN·TRAINER는 질문 시 고정 문구 응답·브리핑 빈 후보 - 세부 항목은 추후 role별 변경)
  const aiEligible = ['owner', 'admin', 'trainer']
    .includes(String(loginUser?.role || '').toLowerCase());

  // 위젯 설정 + 활성 위젯 데이터 조회 (GET /dashboard/widgets, /dashboard/data)
  const loadDashboard = useCallback(async () => {
    if (!token) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [widgetRes, dataRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_BACKEND_URL}/dashboard/widgets`, { headers }),
        fetch(`${import.meta.env.VITE_BACKEND_URL}/dashboard/data`, { headers }),
      ]);

      if (widgetRes.ok && dataRes.ok) {
        setWidgets(await widgetRes.json());
        setData(await dataRes.json());
        setMessage('');
      } else {
        setMessage(`조회 실패(${widgetRes.status}): ${await widgetRes.text()}`);
      }
    } catch (error) {
      console.error('대시보드 조회 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // 태스크 브리핑("오늘 처리할 일") - 결정적 GET /ai/briefing (토큰 무소모)
  // 대시보드 진입(마운트)마다 건수>0 후보에서 랜덤 3개를 새로 받는다 (OWNER 외에는 서버가 빈 후보 반환)
  useEffect(() => {
    if (!token || !aiEligible) return;
    fetch(`${import.meta.env.VITE_BACKEND_URL}/ai/briefing`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((result) => setBriefing(result ? result.items ?? [] : []))
      .catch(() => setBriefing([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 질문 카드 클릭 - 고정 문구 질문을 AI 챗 팝업으로 자동 전송 (AiPanel이 ai-ask 이벤트 수신)
  const askAi = (question) => {
    window.dispatchEvent(new CustomEvent('ai-ask', { detail: question }));
  };

  // 위젯 표시 여부 토글 (PUT /dashboard/widgets/toggle)
  // 위젯 하나(칩 ✕) 또는 한 행으로 묶인 여러 위젯(편집 모달의 월별 총 매출·지출)을 받는다.
  // 묶음은 같은 목표 상태로 맞추며, API·요청 형태는 키마다 기존 그대로다.
  const handleToggle = async (target) => {
    const targets = Array.isArray(target) ? target : [target];
    if (targets.length === 0) return;

    // 하나라도 꺼져 있으면 전부 켜고, 전부 켜져 있으면 전부 끈다
    const nextActive = !targets.every((w) => w.isActive);
    const pending = targets.filter((w) => w.isActive !== nextActive);
    if (pending.length === 0) return;

    try {
      for (const widget of pending) {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/dashboard/widgets/toggle`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ widgetKey: widget.widgetKey, isActive: nextActive }),
        });

        if (!response.ok) {
          // 409: 데이터가 없는 위젯은 켤 수 없음 — 묶음이면 남은 키는 진행하지 않고 실제 상태를 다시 읽는다
          setMessage(await response.text());
          break;
        }
      }
      loadDashboard();
    } catch (error) {
      console.error('위젯 토글 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 위젯 순서 이동 (PUT /dashboard/widgets/order) - 편집 모달의 이동 핸들(드래그/방향키)에서 호출
  // 구 위젯 키(h_dashboard_widget에 남아있을 수 있는 memberCount 등)는 알려진 키(visibleWidgets)
  // 기준으로만 순서를 재배치한다 - 죽은 키가 섞여 인덱스가 어긋나는 것을 방지
  // 이동 단위는 편집 모달의 행(widgetRows)이라, 묶음 행은 두 키가 함께 움직인다.
  const handleReorder = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= widgetRows.length) return;
    if (toIndex < 0 || toIndex >= widgetRows.length) return;

    // 끌어온 행을 새 자리에 끼워 넣고 키 단위로 펼친 뒤, 기존 sortOrder 값들을 자리 순서대로 다시 부여한다
    const next = [...widgetRows];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    const slots = visibleWidgets.map((w) => w.sortOrder);
    const reordered = next
      .flatMap((row) => row.widgets)
      .map((widget, i) => ({ widgetKey: widget.widgetKey, sortOrder: slots[i] }));

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/dashboard/widgets/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(reordered),
      });

      if (response.ok) {
        loadDashboard();
      } else {
        setMessage(`순서 변경 실패(${response.status})`);
      }
    } catch (error) {
      console.error('위젯 순서 변경 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 매출·지출 통합 차트 - 같은 달을 한 칸에 묶어 매출/지출 막대를 나란히 그린다
  // (두 위젯의 원본 응답 [{month,total}]을 월 기준으로 합치고, 축 최대값도 두 계열 공통으로 잡는다)
  const renderRevenueExpenseChart = () => {
    const byMonth = new Map();
    const collect = (rows, field) => {
      (rows ?? []).forEach((row) => {
        const merged = byMonth.get(row.month) ?? { month: row.month, revenue: 0, expense: 0 };
        merged[field] = Number(row.total);
        byMonth.set(row.month, merged);
      });
    };
    collect(data.monthlyRevenue, 'revenue');
    collect(data.monthlyExpense, 'expense');

    const rows = [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month));
    if (rows.length === 0) return <p className="dash-empty">데이터 없음</p>;

    const max = Math.max(...rows.flatMap((row) => [row.revenue, row.expense])) || 1;
    const barHeight = (amount) => `${amount > 0 ? Math.max(3, Math.round((amount / max) * 100)) : 0}%`;

    return (
      <div className="dash-chart">
        {rows.map((row) => (
          <div
            key={row.month}
            className="dash-bar-col"
            title={`${row.month} · 매출 ${row.revenue.toLocaleString()} · 지출 ${row.expense.toLocaleString()}`}
          >
            <span className="dash-bar-pair">
              <span className="dash-bar dash-bar--accent" style={{ height: barHeight(row.revenue) }} />
              <span className="dash-bar dash-bar--gray" style={{ height: barHeight(row.expense) }} />
            </span>
            <span className="dash-bar-month">{row.month.slice(5)}월</span>
          </div>
        ))}
      </div>
    );
  };

  // 위젯 데이터 형태별 렌더링 (KPI / 만료 목록 / 월별 차트 / 세션 목록 등)
  const renderWidgetData = (widgetKey) => {
    const value = data[widgetKey];
    if (value == null) return <p className="dash-empty">데이터 없음</p>;

    switch (widgetKey) {
      case 'gymCount':
      case 'managedMemberCount':
        return (
          <div>
            <p className="dash-kpi">{value.total}<span> 명(개)</span></p>
            <p className="dash-sub">이번 달 신규 +{value.newThisMonth}</p>
          </div>
        );
      // 총 회원 수 (OWNER 위젯 세트 개편) - 이용권·PT·PT체험(3·4·5) ACTIVE 수신자 수 + 유형 구성
      case 'activeMemberCount':
        return (
          <div>
            {/* 이번 달 신규는 수치 옆에 붙여 한 줄로 표시한다 */}
            <p className="dash-kpi">
              {value.total}<span> 명</span>
              <span className="dash-kpi__note">이번 달 신규 +{value.newThisMonth}</span>
            </p>
            <p className="dash-sub">이용권 {value.membership} · PT {value.pt} · 체험 {value.trial}</p>
          </div>
        );
      // 쿠폰 사용 (OWNER 위젯 세트 개편) - 전체 발급 대비 사용 수
      case 'couponUsage': {
        const pct = value.total > 0 ? Math.round((value.used / value.total) * 100) : 0;
        return (
          <div>
            <p className="dash-kpi">{value.used}<span> / {value.total}건 사용</span></p>
            <div className="dash-progress">
              <div className="dash-progress__fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="dash-sub">사용률 {pct}%</p>
          </div>
        );
      }
      // 만료 임박 회원 수 (OWNER 위젯 세트 개편) - 30일 내 end_date 도래
      case 'expiringMemberCount':
        return (
          <div>
            <p className="dash-kpi">{value.total}<span> 명</span></p>
            <p className="dash-sub">30일 내 만료 예정</p>
          </div>
        );
      // 오늘 출석 (OWNER 위젯 세트 개편) - h_check_inout 당일 distinct 체크인
      case 'todayAttendance':
        return (
          <div>
            <p className="dash-kpi">{value.total}<span> 명</span></p>
            <p className="dash-sub">오늘 출석 인원</p>
          </div>
        );
      case 'expiringSubscription':
        return (
          <ul className="dash-list">
            {value.map((row, i) => (
              <li key={i}>
                <span>{row.name}</span>
                <span className={row.dday <= 7 ? 'dash-badge danger' : 'dash-badge'}>D-{row.dday}</span>
              </li>
            ))}
          </ul>
        );
      case 'monthlyRevenue':
      case 'monthlyExpense':
      case 'monthlySession': {
        const max = Math.max(...value.map((row) => Number(row.total))) || 1;
        const tone = CHART_SERIES[widgetKey]?.tone ?? 'accent';
        return (
          // 막대 위 수치는 목업대로 생략하고 title 속성으로 정확한 값을 제공한다
          <div className="dash-chart">
            {value.map((row) => (
              <div key={row.month} className="dash-bar-col" title={`${row.month} · ${Number(row.total).toLocaleString()}`}>
                <div
                  className={`dash-bar dash-bar--${tone}`}
                  style={{ height: `${Math.max(3, Math.round((Number(row.total) / max) * 100))}%` }}
                />
                <span className="dash-bar-month">{row.month.slice(5)}월</span>
              </div>
            ))}
          </div>
        );
      }
      case 'lowSessionMembers':
        return (
          <ul className="dash-list">
            {value.map((row, i) => (
              <li key={i}>
                <span>{row.name}</span>
                <span className={row.remain <= 3 ? 'dash-badge danger' : 'dash-badge'}>{row.remain}회 남음</span>
              </li>
            ))}
          </ul>
        );
      case 'gymNps':
        return (
          <div>
            <p className="dash-kpi">{value.averageScore}<span> / 5점</span></p>
            <p className="dash-sub">설문 {value.total}건 기준</p>
          </div>
        );
      // 월별 이탈 위험군 추이 (OWNER 위젯 세트 개편) - ResultService.selectStatPeriods(monthly)
      case 'churnTrend': {
        const max = Math.max(...value.map((row) => Number(row.riskMembers))) || 1;
        return (
          <div className="dash-chart">
            {value.map((row) => (
              <div
                key={row.period}
                className="dash-bar-col"
                title={`${row.period} · 위험군 ${row.riskMembers}명 · 평균 이탈률 ${(Number(row.avgChurnRate || 0) * 100).toFixed(1)}%`}
              >
                <div
                  className="dash-bar dash-bar--blue"
                  style={{ height: `${Math.max(3, Math.round((Number(row.riskMembers) / max) * 100))}%` }}
                />
                <span className="dash-bar-month">{row.period.slice(5)}월</span>
              </div>
            ))}
          </div>
        );
      }
      case 'memberChurn':
      case 'gymChurn':
        return (
          <div>
            <p className="dash-kpi">{value.highRiskCount}<span> 명 고위험</span></p>
            <p className="dash-sub">평균 이탈률 {(Number(value.averageChurnRate) * 100).toFixed(1)}% · {value.total}명 분석</p>
          </div>
        );
      default:
        return <pre className="dash-sub">{JSON.stringify(value)}</pre>;
    }
  };

  // 알려진(WIDGET_LABEL에 라벨이 있는) 위젯 키만 표시·편집 대상으로 삼는다.
  // OWNER 위젯 세트 개편(2026-07-22)으로 h_dashboard_widget에 남아있을 수 있는 구 키
  // (memberCount·expiringContract·bodyComposition 등)는 여기서 걸러진다.
  const visibleWidgets = widgets.filter((w) => WIDGET_LABEL[w.widgetKey]);
  const activeWidgets = visibleWidgets.filter((w) => w.isActive && w.hasData);
  // 편집 모달의 행 목록 (매출·지출은 카드와 동일하게 한 행으로 묶임) — 순서 이동 단위이기도 하다
  const widgetRows = buildWidgetRows(visibleWidgets);
  // 상단 삭제형 칩도 같은 묶음 규칙을 쓴다 — 카드가 한 장이면 칩도 하나, ✕는 두 키를 함께 끈다
  const activeChips = buildWidgetRows(activeWidgets);

  // 매출·지출이 둘 다 활성이면 한 카드로 합치고, 그 카드는 둘 중 먼저 오는 위젯 자리에 놓는다
  const mergeRevenueExpense = REVENUE_EXPENSE_KEYS
    .every((key) => activeWidgets.some((w) => w.widgetKey === key));
  const revenueExpenseAnchor = activeWidgets
    .find((w) => REVENUE_EXPENSE_KEYS.includes(w.widgetKey))?.widgetKey;

  return (
    <div className="dash-page">
      {/* 상단 줄: 선택된 위젯 칩(삭제형) + 위젯 편집 버튼 — 칩 ✕는 기존 토글 API를 그대로 사용 */}
      <div className="dash-toolbar">
        <div className="dash-chips">
          {activeChips.map((chip) => (
            <span key={chip.key} className="dash-chip">
              {chip.label}
              <button
                type="button"
                className="dash-chip__remove"
                title={`${chip.label} 숨기기`}
                onClick={() => handleToggle(chip.widgets)}
              >
                <NavIcon id="close" size={14} />
              </button>
            </span>
          ))}
        </div>
        <button type="button" className="dash-edit-btn" onClick={() => setEditOpen(!editOpen)}>
          <NavIcon id="edit" size={15} />
          위젯 편집
        </button>
      </div>

      {message && <p className="dash-message">{message}</p>}

      {/* 위젯 편집 모달(팝업): 데이터 없는 위젯은 잠금 표시 — 토글·순서 변경 API는 기존 그대로 */}
      {editOpen && (
        <WidgetEditModal
          rows={widgetRows}
          onToggle={handleToggle}
          onReorder={handleReorder}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* 활성 위젯 카드 목록 — KPI 4열 / 리스트 2열 / 차트 전폭 (목업 배치) */}
      <div className="dash-grid">
        {activeWidgets.length === 0 && <p className="dash-empty">표시할 위젯이 없어요. 위젯 편집에서 켜보세요.</p>}
        {activeWidgets.map((widget) => {
          // 매출·지출이 함께 켜져 있으면 먼저 오는 쪽 자리에 통합 카드 1장만 그리고 나머지는 건너뛴다
          const isRevenueExpense = REVENUE_EXPENSE_KEYS.includes(widget.widgetKey);
          if (isRevenueExpense && mergeRevenueExpense && widget.widgetKey !== revenueExpenseAnchor) return null;
          const merged = isRevenueExpense && mergeRevenueExpense;

          const layout = layoutOf(widget.widgetKey);
          const series = CHART_SERIES[widget.widgetKey];
          // 위젯 클릭 이동 - 편집 모드에서는 이동을 비활성화해 편집 조작과 충돌하지 않게 한다
          const linkTo = WIDGET_LINK[widget.widgetKey];
          const clickable = !!linkTo && !editOpen;
          const CardTag = clickable ? 'button' : 'div';
          const cardProps = clickable
            ? { type: 'button', onClick: () => navigate(linkTo), className: `dash-card dash-card--${layout} dash-card--clickable` }
            : { className: `dash-card dash-card--${layout}` };
          return (
            <CardTag key={widget.widgetKey} {...cardProps}>
              <div className="dash-card__head">
                <h2>{merged ? MERGED_REVENUE_EXPENSE_LABEL : (WIDGET_LABEL[widget.widgetKey] ?? widget.widgetKey)}</h2>
                {merged ? (
                  <span className="dash-legend-group">
                    {REVENUE_EXPENSE_KEYS.map((key) => (
                      <span key={key} className={`dash-legend dash-legend--${CHART_SERIES[key].tone}`}>
                        ● {CHART_SERIES[key].label}
                      </span>
                    ))}
                  </span>
                ) : (
                  series && <span className={`dash-legend dash-legend--${series.tone}`}>● {series.label}</span>
                )}
              </div>
              {merged ? renderRevenueExpenseChart() : renderWidgetData(widget.widgetKey)}
            </CardTag>
          );
        })}
      </div>

      {/* AI 영역 (OWNER 전용, 위젯 그리드 아래 좌우 분할)
          왼쪽=질문 카드(클릭 시 AI 팝업 답변·토큰 소모) / 오른쪽=태스크 브리핑(클릭 시 페이지 이동·무소모) */}
      {aiEligible && (
        <div className="dash-ai-zone">
          <div className="dash-ai-card">
            <h3>AI 비서에게 물어보기</h3>
            <div className="dash-ai-questions">
              {AI_QUESTIONS.map((q) => (
                <button key={q.key} type="button" className="dash-ai-question" onClick={() => askAi(q.question)}>
                  <span className="dash-ai-tag">{q.tag}</span>
                  {q.question}
                </button>
              ))}
            </div>
            <p className="dash-ai-caption">누르면 AI가 팝업으로 답해드려요</p>
          </div>

          <div className="dash-ai-card">
            <h3>오늘 처리할 일</h3>
            {briefing == null && <p className="dash-sub">불러오는 중...</p>}
            {briefing != null && briefing.length === 0 && (
              <p className="dash-sub">오늘 처리할 일이 없어요</p>
            )}
            {briefing != null && briefing.length > 0 && (
              <div className="dash-ai-tasks">
                {briefing.map((item) => (
                  item.bundle ? (
                    // 지출 내역 확인 - 1슬롯 묶음 (커미션·월급 아코디언)
                    <div key={item.key} className={`dash-ai-task-group ${bundleOpen ? 'is-open' : ''}`}>
                      <button
                        type="button"
                        className={`dash-ai-task ${bundleOpen ? 'is-open' : ''}`}
                        onClick={() => setBundleOpen(!bundleOpen)}
                      >
                        <span className="dash-ai-task-label">{item.label}</span>
                        <span className="dash-badge warning">{item.count}건</span>
                        <span className="dash-ai-task-go">
                          <NavIcon
                            id="chevron"
                            size={16}
                            className={`ui-icon ${bundleOpen ? 'ui-icon--up' : 'ui-icon--down'}`}
                          />
                        </span>
                      </button>
                      {bundleOpen && item.bundle.map((sub) => (
                        <button
                          key={sub.key}
                          type="button"
                          className="dash-ai-task dash-ai-task-sub"
                          onClick={() => navigate(sub.linkTo)}
                        >
                          <span className="dash-ai-task-label">{sub.label}</span>
                          <span className="dash-badge warning">{sub.count}건</span>
                          <span className="dash-ai-task-go"><NavIcon id="arrow" size={16} className="ui-icon" /></span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      key={item.key}
                      type="button"
                      className="dash-ai-task"
                      onClick={() => navigate(item.linkTo)}
                    >
                      <span className="dash-ai-task-label">{item.label}</span>
                      <span className={`dash-badge ${item.tone === 'danger' ? 'danger' : 'warning'}`}>
                        {item.count}건
                      </span>
                      <span className="dash-ai-task-go"><NavIcon id="arrow" size={16} className="ui-icon" /></span>
                    </button>
                  )
                ))}
              </div>
            )}
            <p className="dash-ai-caption">누르면 해당 페이지로 이동해요</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
