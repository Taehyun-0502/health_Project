import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import B2bPromotion from './promotion/B2bPromotion.jsx'; // ◀ 프로모션 컴포넌트 임포트


// 사장님/트레이너 전용 메인 포털 컴포넌트 (디자인 제외 Plain 버전)
function AdminMain() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const navigate = useNavigate();

  // 로그인 세션에서 사장님 정보 획득
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 실시간 알람 상태 변수 선언 (MemberMain.jsx와 동일한 패턴)
  const [alarms, setAlarms] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  // 페이지 진입 시 저장된 알림 이력 조회 (실시간 접속 이전에 이미 발송된 알림도 벨에 표시하기 위함)
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(`${import.meta.env.VITE_BACKEND_URL}/alarm/list`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setAlarms(data.map((alarm) => alarm.message));
        setUnreadCount(data.filter((alarm) => alarm.read !== 'Y').length);
      })
      .catch((err) => console.warn('알림 이력 조회 실패:', err.message));
  }, []);

  // 실시간 알람 채널 구독 라이프사이클
  useEffect(() => {
    if (!user.username) return;

    const eventSource = new EventSource(`${import.meta.env.VITE_BACKEND_URL}/alarm/subscribe?username=${user.username}`);

    // 실시간 알람 수신 상태 업데이트
    eventSource.addEventListener('alarm', (event) => {
      const message = event.data;
      setAlarms((prev) => [message, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      eventSource.close();
    };
  }, [user.username]);

  // 알람 창 토글 및 읽음 카운트 리셋
  const handleToggleAlarm = () => {
    setShowDropdown(!showDropdown);
    setUnreadCount(0);
  };

  // 로그아웃 처리 핸들러 (세션 정리 및 리다이렉트)
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    alert('로그아웃되었습니다.');
    navigate('/');
  };

  // 관리 대시보드 4대 메뉴 상수 정의
  const tabs = [
    { id: 'dashboard', label: '대시보드', title: '운영 현황 대시보드', desc: '오늘의 운영 현황을 간편하게 모니터링합니다.' },
    { id: 'settlement', label: '정산관리', title: '매출 및 정산 통계', desc: '이용권 결제 내역 분석 및 정산 자료입니다.' },
    { id: 'inventory', label: '물품관리', title: '라커룸 및 기자재 인벤토리', desc: '센터 내부 물품 재고 수량을 기록 관리합니다.' },
    { id: 'promotion', label: '프로모션', title: '이벤트 및 쿠폰 발행', desc: '할인 프로모션 생성 및 이벤트 업무를 수행합니다.' }
  ];

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      {/* 헤더 영역 우측 상단 알람 종 (MemberMain.jsx와 동일한 패턴) */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 100 }}>
        <button
          onClick={handleToggleAlarm}
          style={{
            position: 'relative',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer'
          }}
        >
          🔔
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute',
              top: '-5px',
              right: '-5px',
              backgroundColor: 'red',
              color: '#fff',
              borderRadius: '50%',
              padding: '2px 6px',
              fontSize: '10px',
              fontWeight: 'bold'
            }}>
              {unreadCount}
            </span>
          )}
        </button>

        {showDropdown && (
          <div style={{
            position: 'absolute',
            top: '35px',
            right: '0',
            width: '280px',
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '10px',
            maxHeight: '300px',
            overflowY: 'auto',
            textAlign: 'left'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', borderBottom: '1px solid #eee', paddingBottom: '6px', color: '#333' }}>최근 알람</h4>
            {alarms.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#999', margin: '10px 0', textAlign: 'center' }}>새로운 알람이 없습니다.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {alarms.map((alarmMsg, index) => (
                  <li
                    key={index}
                    style={{
                      fontSize: '12px',
                      padding: '8px',
                      borderBottom: '1px solid #f9f9f9',
                      wordBreak: 'break-all',
                      color: '#444'
                    }}
                  >
                    📢 {alarmMsg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <h2>Haru Bread Health - 사장님 관리 포털 ({user.name} 사장님 - 지점번호: {user.gymId})</h2>

      {/* 마이페이지 이동, 회원 가입/추가, 로그아웃 처리 버튼 영역 */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '15px', alignItems: 'center' }}>
        <Link to="/fitb/b2bmypage" style={{ padding: '8px 16px', backgroundColor: '#28a745', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
          관리자 마이페이지 이동 (건의/계정)
        </Link>
        
        {/* [권한 제약] 오직 역할이 admin(총괄 관리자)인 계정에게만 회원 가입/추가 링크 버튼을 노출시킴 */}
        {user.role === 'admin' && (
          <Link to="/join" style={{ padding: '8px 16px', backgroundColor: '#17a2b8', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
            신규 회원 가입/추가
          </Link>
        )}

        <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          로그아웃
        </button>
      </div>

      <hr />

      {/* 4대 관리 탭 메뉴 버튼 */}
      <div style={{ margin: '20px 0' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ marginRight: '10px', padding: '8px 16px', cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4대 관리 탭 활성 내용 노출 영역 */}
      <div style={{ border: '1px solid #ccc', padding: '20px', minHeight: '200px' }}>
        {tabs.map((tab) => {
          if (activeTab !== tab.id) return null;
          // 프로모션 탭일 경우 커스텀 쿠폰 발송 컴포넌트를 출력
          if (tab.id === 'promotion') {
            return <B2bPromotion key={tab.id} />;
          }
          return (
            <div key={tab.id}>
              <h3>{tab.title}</h3>
              <p>{tab.desc}</p>
              <button onClick={() => alert(`${tab.title} 기능이 활성화됩니다.`)}>
                상세 정보 보기
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdminMain;
