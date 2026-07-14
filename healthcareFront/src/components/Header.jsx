import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// 사장님 및 일반회원 포털 상단에 공통 장착되는 알림/로그아웃 헤더 컴포넌트
function Header() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // 상태 관리 (알림 이력 목록, 읽지 않은 수, 드롭다운 토글)
  const [alarms, setAlarms] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  // 1. 페이지 진입 시 저장된 기존 알림 이력 DB 조회 로드
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(`${import.meta.env.VITE_BACKEND_URL}/alarm/list`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        setAlarms(data); // ◀ 변경: DTO 객체 배열 그대로 셋업
        setUnreadCount(data.filter((alarm) => alarm.read !== 'Y').length);
      })
      .catch((err) => console.warn('헤더 알림 이력 조회 실패:', err.message));
  }, []);

  // 2. 실시간 알람 채널 구독 라이프사이클 (SSE)
  useEffect(() => {
    if (!user.username) return;

    const eventSource = new EventSource(`${import.meta.env.VITE_BACKEND_URL}/alarm/subscribe?username=${user.username}`);

    // 실시간 알람 수신 상태 업데이트
    eventSource.addEventListener('alarm', (event) => {
      try {
        const alarmData = JSON.parse(event.data);
        setAlarms((prev) => [alarmData, ...prev]);
      } catch (e) {
        const tempAlarm = {
          alarmId: Date.now(),
          message: event.data,
          link: '/mypage'
        };
        setAlarms((prev) => [tempAlarm, ...prev]);
      }
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      eventSource.close();
    };
  }, [user.username]);

  // 3. 로그아웃 처리 핸들러 (세션 정리 및 리다이렉트)
  const handleLogout = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      if (token) {
        await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (err) {
      console.error('서버 로그아웃 세션 파괴 실패:', err);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken'); // ◀ 리프레쉬 토큰 소거
      alert('로그아웃되었습니다.');
      navigate('/');
    }
  };

  // 4. 알람 창 토글 및 읽음 카운트 리셋
  const handleToggleAlarm = () => {
    setShowDropdown(!showDropdown);
    setUnreadCount(0);
  };

  // 4-1. 모든 알림 일괄 읽음 처리 (신규 독립 메서드)
  const handleMarkAllAsRead = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || unreadCount === 0) return;
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/alarm/read/all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.warn('알림 일괄 읽음 처리 통신 실패:', err);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 20px',
      borderBottom: '1px solid #eee',
      backgroundColor: '#fff',
      position: 'relative'
    }}>
      {/* 좌측: 포털 정체성 타이틀 */}
      <h3 style={{ margin: 0, color: '#333' }}>
        {user.role === 'admin' || user.role === 'owner' ? '🏢 사장님 관리 포털' : '🏋️ 회원 포털'}
        <span style={{ fontSize: '13px', fontWeight: 'normal', color: '#666', marginLeft: '10px' }}>
          ({user.name} {user.role === 'admin' || user.role === 'owner' ? '사장님' : '회원님'} - 지점: {user.gymId})
        </span>
      </h3>

      {/* 우측: 알림 벨 아이콘 및 로그아웃 버튼 영역 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* 알림 종 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => {
              handleToggleAlarm();   // 1) 기존 화면 토글 및 리셋 로직 원형 보존 호출
              handleMarkAllAsRead(); // 2) 신규 일괄 읽음 처리 API 독립 호출
            }}
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer'
            }}
          >
            🔔
            {unreadCount > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                backgroundColor: '#ef4444',
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

          {/* 알림 리스트 드롭다운 */}
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
              textAlign: 'left',
              zIndex: 1000
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', borderBottom: '1px solid #eee', paddingBottom: '6px', color: '#333' }}>최근 알람</h4>
              {alarms.length === 0 ? (
                <p style={{ fontSize: '11px', color: '#999', margin: '10px 0', textAlign: 'center' }}>새로운 알람이 없습니다.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {alarms.map((alarm, index) => (
                    <li
                      key={alarm.alarmId || index}
                      onClick={() => {
                        if (alarm.link) {
                          navigate(alarm.link); // ◀ 지정된 페이지 경로로 이동
                          setShowDropdown(false); // ◀ 드롭다운 팝업 닫기
                        }
                      }}
                      style={{
                        fontSize: '11px',
                        padding: '8px',
                        borderBottom: '1px solid #f9f9f9',
                        wordBreak: 'break-all',
                        color: '#444',
                        cursor: 'pointer', // ◀ 마우스 클릭 손가락 효과
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      📢 {alarm.message}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* 로그아웃 버튼 */}
        <button 
          onClick={handleLogout} 
          style={{
            padding: '6px 12px',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            color: '#374151'
          }}
        >
          로그아웃
        </button>

      </div>
    </div>
  );
}

export default Header;
