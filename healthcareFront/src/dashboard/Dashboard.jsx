import { useCallback, useEffect, useState } from 'react';
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

// 역할별 커스텀 대시보드 (1부: 위젯 조회/토글/순서 변경/데이터 표시)
function Dashboard() {
  const [widgets, setWidgets] = useState([]);
  const [data, setData] = useState({});
  const [editOpen, setEditOpen] = useState(false);
  const [message, setMessage] = useState('');

  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('accessToken');

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
    </div>
  );
}

export default Dashboard;
