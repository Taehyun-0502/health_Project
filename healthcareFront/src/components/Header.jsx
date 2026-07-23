import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getB2bPageTitle } from '../config/uiNavigation.js';
import useLogout from '../hooks/useLogout.js';
import './Header.css';

function Header({ variant = 'portal' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useLogout();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [alarms, setAlarms] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const isB2b = variant === 'b2b';

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    fetch(`${import.meta.env.VITE_BACKEND_URL}/alarm/list`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        setAlarms(data);
        setUnreadCount(data.filter((alarm) => alarm.read !== 'Y').length);
      })
      .catch((error) => console.warn('헤더 알림 이력 조회 실패:', error.message));
  }, []);

  // 실시간 알림 구독
  // EventSource는 Authorization 헤더를 못 보내므로 ① Bearer로 1회용 티켓을 받고 ② 그 티켓으로 연결한다.
  // 티켓이 1회용이라 브라우저 자동 재연결(같은 URL 재시도)은 반드시 실패한다. 따라서 끊기면
  // 직접 새 티켓을 받아 다시 연결한다. 서버 emitter가 30분마다 만료되므로 이 경로는 정상 동작의 일부다.
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return undefined;

    let eventSource = null;
    let retryTimer = null;
    let retryCount = 0;
    let cancelled = false; // 언마운트 후 재연결이 계속되지 않도록 하는 가드

    const handleAlarm = (event) => {
      try {
        setAlarms((previous) => [JSON.parse(event.data), ...previous]);
      } catch {
        setAlarms((previous) => [{
          alarmId: Date.now(),
          message: event.data,
          link: '/mypage',
        }, ...previous]);
      }
      setUnreadCount((previous) => previous + 1);
    };

    // 서버가 계속 죽어 있을 때 재연결 요청이 폭주하지 않도록 지수 백오프 (3초 → 최대 30초)
    const scheduleRetry = () => {
      if (cancelled || retryTimer) return;
      const delay = Math.min(3000 * 2 ** retryCount, 30000);
      retryCount += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    const connect = async () => {
      if (cancelled) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/alarm/ticket`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`티켓 발급 실패(${response.status})`);

        const { ticket } = await response.json();
        if (cancelled || !ticket) return;

        // 핸들러 안에서는 바깥 변수가 아니라 이 인스턴스를 참조한다.
        // 재연결로 바깥 변수가 새 연결로 바뀐 뒤 옛 연결의 onerror가 늦게 도착하면 새 연결을 닫아버린다.
        const source = new EventSource(
          `${import.meta.env.VITE_BACKEND_URL}/alarm/subscribe?ticket=${encodeURIComponent(ticket)}`,
        );
        eventSource = source;

        source.addEventListener('connect', () => { retryCount = 0; });
        source.addEventListener('alarm', handleAlarm);
        source.onerror = () => {
          // 자동 재연결에 맡기면 소비된 티켓으로 무한 재시도하므로 직접 닫고 새 티켓으로 재연결
          source.close();
          if (eventSource === source) eventSource = null;
          scheduleRetry();
        };
      } catch (error) {
        console.warn('실시간 알림 구독 실패:', error.message);
        scheduleRetry();
      }
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (eventSource) eventSource.close();
    };
  }, []);

  const markAllAsRead = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || unreadCount === 0) return;

    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL}/alarm/read/all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      console.warn('알림 일괄 읽음 처리 통신 실패:', error);
    }
  };

  const toggleNotifications = () => {
    setShowDropdown((previous) => !previous);
    setUnreadCount(0);
    markAllAsRead();
  };

  const openAlarm = (alarm) => {
    if (!alarm.link) return;
    navigate(alarm.link);
    setShowDropdown(false);
  };

  return (
    <header className={`portal-header${isB2b ? ' portal-header--b2b' : ''}`}>
      <div className="portal-header__identity">
        {isB2b ? (
          <h1>{getB2bPageTitle(location.pathname)}</h1>
        ) : (
          <>
            <h1>{user.role === 'admin' || user.role === 'owner' ? '사장님 관리 포털' : '회원 포털'}</h1>
            <p>{user.name} {user.role === 'admin' || user.role === 'owner' ? '' : '회원님'} · 지점 {user.gymId}</p>
          </>
        )}
      </div>

      <div className="portal-header__actions">
        <div className="portal-notification">
          <button
            type="button"
            className="portal-notification__trigger"
            onClick={toggleNotifications}
            aria-label={`알림 ${unreadCount}개`}
            aria-expanded={showDropdown}
          >
            <span aria-hidden="true">🔔</span>
            {unreadCount > 0 && <span className="portal-notification__count">{unreadCount}</span>}
          </button>

          {showDropdown && (
            <section className="portal-notification__menu" aria-label="최근 알림">
              <h2>최근 알림</h2>
              {alarms.length === 0 ? (
                <p className="portal-notification__empty">새로운 알림이 없습니다.</p>
              ) : (
                <ul>
                  {alarms.map((alarm, index) => (
                    <li key={alarm.alarmId || index}>
                      <button type="button" onClick={() => openAlarm(alarm)} disabled={!alarm.link}>
                        <span aria-hidden="true">●</span>
                        <span>{alarm.message}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {!isB2b && (
          <button type="button" className="portal-header__logout" onClick={logout}>로그아웃</button>
        )}
      </div>
    </header>
  );
}

export default Header;
