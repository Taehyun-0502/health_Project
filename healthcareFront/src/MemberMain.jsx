import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import B2cAvatar from './b2c_mypage/B2cAvatar.jsx';

// 일반 회원(member) 로그인 직후 도달하는 메인 포털 컴포넌트 (Plain 버전 - 탭 이관 완료)
function MemberMain() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 실시간 알람 상태 변수 선언
  const [alarms, setAlarms] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

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

  // 로그아웃 처리 핸들러 (세션 정리 및 리다이렉트)
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    alert('로그아웃되었습니다.');
    navigate('/');
  };

  // 알람 창 토글 및 읽음 카운트 리셋
  const handleToggleAlarm = () => {
    setShowDropdown(!showDropdown);
    setUnreadCount(0);
  };

  return (
    <div style={{ padding: '20px', position: 'relative' }}>
      {/* 헤더 영역 우측 상단 알람 종 */}
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

      <h2>Haru Bread Health - 일반 회원 메인 포털 ({user.name}님)</h2>
      
      {/* 마이페이지 이동 및 로그아웃 처리 버튼 */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '15px' }}>
        <Link to="/fitc/mypage" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
          마이페이지 이동 (멤버십/쿠폰/출석/건의)
        </Link>
        <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          로그아웃
        </button>
      </div>

      <hr />

      <div style={{ padding: '40px 30px', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #eee', marginTop: '20px', textAlign: 'center' }}>
        {/* 아바타 컴포넌트 배치 */}
        <B2cAvatar />
        
        <h3 style={{ marginTop: '20px', color: '#111', fontSize: '20px', fontWeight: '700' }}>
          반갑습니다, {user.name} 회원님.
        </h3>
        
        {/* 아바타 성장 가이드 섹션 */}
        <div style={{ margin: '25px auto 15px auto', maxWidth: '480px' }}>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '12px', fontWeight: '500' }}>
            🏋️ 회원님의 아바타는 최근 30일간의 헬스장 출석 일수로 성장합니다.
          </p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', backgroundColor: '#f3f4f6', color: '#4b5563', padding: '6px 12px', borderRadius: '20px', border: '1px solid #e5e7eb', fontWeight: '600' }}>
              Lv.1 / 0~4일
            </span>
            <span style={{ fontSize: '12px', backgroundColor: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '20px', border: '1px solid #dbeafe', fontWeight: '600' }}>
              Lv.2 / 5~11일
            </span>
            <span style={{ fontSize: '12px', backgroundColor: '#f0fdf4', color: '#16a34a', padding: '6px 12px', borderRadius: '20px', border: '1px solid #dcfce7', fontWeight: '600' }}>
              Lv.3 / 12~20일
            </span>
            <span style={{ fontSize: '12px', backgroundColor: '#fff7ed', color: '#ea580c', padding: '6px 12px', borderRadius: '20px', border: '1px solid #ffedd5', fontWeight: '600' }}>
              Lv.4 / 21일+
            </span>
          </div>
        </div>

        {/* 세련된 마이페이지 꿀팁/안내 콜아웃 박스 */}
        <div style={{
          marginTop: '25px',
          padding: '14px 20px',
          backgroundColor: '#f0f7ff',
          border: '1px solid #e0efff',
          borderRadius: '8px',
          display: 'inline-block',
          textAlign: 'left',
          maxWidth: '460px'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: '#0369a1', lineHeight: '1.5' }}>
            ℹ️ 회원님의 상세 <strong>이용권 기간, 입·퇴실 기록, 보유 쿠폰 및 건의사항</strong>은 상단 <strong>[마이페이지]</strong> 메뉴에서 간편하게 통합 조회하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MemberMain;
