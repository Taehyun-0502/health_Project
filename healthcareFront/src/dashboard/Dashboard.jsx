import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

// 위젯 키별 표시 이름 (백엔드 h_dashboard_widget.widget_key와 매핑)
const WIDGET_LABEL = {
  gymCount: '계약 체육관 수',
  expiringSubscription: '다가오는 구독 만료',
  monthlyRevenue: '월별 총 매출',
  monthlyExpense: '월별 총 지출',
  gymNps: '체육관 만족도',
  memberCount: '계약 회원 수',
  expiringContract: '다가오는 계약 만료',
  bodyComposition: '체성분 변화 추이',
  gymChurn: '헬스장 이탈율',
  managedMemberCount: '담당 회원 수',
  lowSessionMembers: '세션 소진 임박',
  monthlySession: '월별 세션 수행',
  memberChurn: '회원 이탈 예측',
  goalRate: '목표 달성률',
};

const ROLE_LABEL = { ADMIN: '관계사', OWNER: '사장님', TRAINER: '트레이너' };

// AI 영역 왼쪽 질문 카드 4종 - 단일 위젯/메서드로 없어서 AI가 READ 도구를 조합해야 답할 수 있는 질문
// 질문 문구는 이 메타에 고정한다 (사용자 입력 아님 - 전송 질문 예측 가능, 임의 문자열 주입 여지 없음)
const AI_QUESTIONS = [
  { key: 'netprofit', tag: '매출 × 지출', question: '최근 6개월 순이익 추이 알려줘' },
  { key: 'renewal', tag: '계약', question: 'PT 계약 갱신율은 어때?' },
  { key: 'unpaid', tag: '결제', question: '미결제 회원 알려줘' },
  { key: 'churn', tag: '이탈 예측', question: '이탈 위험이 높은 회원은 누구야?' },
];

// 역할별 커스텀 대시보드 (1부: 위젯 조회/토글/순서 변경/데이터 표시)
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
  const handleToggle = async (widget) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/dashboard/widgets/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ widgetKey: widget.widgetKey, isActive: !widget.isActive }),
      });

      if (response.ok) {
        loadDashboard();
      } else {
        // 409: 데이터가 없는 위젯은 켤 수 없음
        setMessage(await response.text());
      }
    } catch (error) {
      console.error('위젯 토글 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 위젯 순서 한 칸 위/아래 이동 (PUT /dashboard/widgets/order)
  const handleMove = async (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= widgets.length) return;

    // 두 위젯의 sortOrder를 서로 교환
    const reordered = widgets.map((w, i) => {
      if (i === index) return { widgetKey: w.widgetKey, sortOrder: widgets[target].sortOrder };
      if (i === target) return { widgetKey: w.widgetKey, sortOrder: widgets[index].sortOrder };
      return null;
    }).filter(Boolean);

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

  // 위젯 데이터 형태별 렌더링 (KPI / 만료 목록 / 월별 차트 / 세션 목록 등)
  const renderWidgetData = (widgetKey) => {
    const value = data[widgetKey];
    if (value == null) return <p className="dash-empty">데이터 없음</p>;

    switch (widgetKey) {
      case 'gymCount':
      case 'memberCount':
      case 'managedMemberCount':
        return (
          <div>
            <p className="dash-kpi">{value.total}<span> 명(개)</span></p>
            <p className="dash-sub">이번 달 신규 +{value.newThisMonth}</p>
          </div>
        );
      case 'expiringSubscription':
      case 'expiringContract':
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
        return (
          <div className="dash-chart">
            {value.map((row) => (
              <div key={row.month} className="dash-bar-col">
                <span className="dash-bar-value">{Number(row.total).toLocaleString()}</span>
                <div className="dash-bar" style={{ height: `${Math.round((Number(row.total) / max) * 80)}px` }} />
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
      case 'bodyComposition':
        return (
          <div>
            <p className="dash-sub">주당 방문 {value.averageVisitPerWeek}회 · 일평균 운동 {value.averageExerciseTime}분</p>
            <p className="dash-sub">운동 데이터 {value.total}건 기준</p>
          </div>
        );
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

  const activeWidgets = widgets.filter((w) => w.isActive && w.hasData);

  return (
    <div className="dash-page">
      <div className="dash-header">
        <h1>
          {ROLE_LABEL[loginUser?.role?.toUpperCase()] ?? loginUser?.role} 대시보드
          <span className="dash-user">{loginUser ? ` ${loginUser.name}` : ''}</span>
        </h1>
        <button onClick={() => setEditOpen(!editOpen)}>위젯 편집</button>
      </div>

      {!token && <p className="dash-message">로그인이 필요합니다. 먼저 로그인해 주세요.</p>}
      {message && <p className="dash-message">{message}</p>}

      {/* 위젯 편집 패널: 데이터 없는 위젯은 잠금 표시 */}
      {editOpen && (
        <div className="dash-edit">
          <p>대시보드에 표시할 위젯을 켜고 끌 수 있어요</p>
          <ul>
            {widgets.map((widget, index) => (
              <li key={widget.widgetKey} className={widget.hasData ? '' : 'locked'}>
                <label>
                  <input
                    type="checkbox"
                    checked={widget.isActive}
                    disabled={!widget.hasData}
                    onChange={() => handleToggle(widget)}
                  />
                  {WIDGET_LABEL[widget.widgetKey] ?? widget.widgetKey}
                </label>
                {widget.hasData ? (
                  <span>
                    <button onClick={() => handleMove(index, -1)}>▲</button>
                    <button onClick={() => handleMove(index, 1)}>▼</button>
                  </span>
                ) : (
                  <span className="dash-badge">데이터 없음</span>
                )}
              </li>
            ))}
          </ul>
          <p className="dash-sub">데이터가 없는 위젯은 켤 수 없어요. 데이터가 쌓이면 켤 수 있어요.</p>
        </div>
      )}

      {/* 활성 위젯 카드 목록 */}
      <div className="dash-grid">
        {activeWidgets.length === 0 && <p className="dash-empty">표시할 위젯이 없습니다. 위젯 편집에서 켜보세요.</p>}
        {activeWidgets.map((widget) => (
          <div key={widget.widgetKey} className="dash-card">
            <h2>{WIDGET_LABEL[widget.widgetKey] ?? widget.widgetKey}</h2>
            {renderWidgetData(widget.widgetKey)}
          </div>
        ))}
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
                    <div key={item.key}>
                      <button type="button" className="dash-ai-task" onClick={() => setBundleOpen(!bundleOpen)}>
                        <span className="dash-ai-task-label">{item.label}</span>
                        <span className="dash-badge warning">{item.count}건</span>
                        <span className="dash-ai-task-go">{bundleOpen ? '▴' : '▾'}</span>
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
                          <span className="dash-ai-task-go">→</span>
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
                      <span className="dash-ai-task-go">→</span>
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
