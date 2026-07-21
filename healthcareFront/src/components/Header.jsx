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

  useEffect(() => {
    if (!user.username) return undefined;

    const eventSource = new EventSource(
      `${import.meta.env.VITE_BACKEND_URL}/alarm/subscribe?username=${user.username}`,
    );

    eventSource.addEventListener('alarm', (event) => {
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
    });

    return () => eventSource.close();
  }, [user.username]);

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
