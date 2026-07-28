import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './B2cPages.css';

// B2C 일반 회원 마이페이지용 알림 내역 컴포넌트
function B2cNotification() {
  const [alarms, setAlarms] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('accessToken');

  // 내 알림 이력 목록 조회 함수
  const fetchAlarms = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/alarm/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setAlarms(data);
      }
    } catch (error) {
      console.error('알림 이력 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchAlarms();
  }, []);

  // 알림 클릭 시 읽음 처리 후, 연결된 페이지(link)가 있으면 이동
  const handleAlarmClick = async (alarm) => {
    if (alarm.read !== 'Y') {
      try {
        // 서버는 본인 수신 알림만 읽음 처리한다(아니면 404). 성공했을 때만 화면 상태를 바꾼다.
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/alarm/read?alarmId=${alarm.alarmId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setAlarms((prev) =>
            prev.map((a) => (a.alarmId === alarm.alarmId ? { ...a, read: 'Y' } : a))
          );
        }
      } catch (error) {
        console.error('알림 읽음 처리 실패:', error);
      }
    }
    if (alarm.link) {
      navigate(alarm.link);
    }
  };

  return (
    <div className="b2c-page">
      <header className="b2c-page__header">
        <h2 className="b2c-page__title">알림 내역</h2>
      </header>
      {alarms.length === 0 ? (
        <p className="b2c-empty">새로운 알림 소식이 없어요.</p>
      ) : (
        <table className="b2c-data-table">
          <thead>
            <tr>
              <th>구분</th>
              <th>내용</th>
              <th>수신일</th>
              <th>읽음</th>
            </tr>
          </thead>
          <tbody>
            {alarms.map((alarm) => (
              <tr
                key={alarm.alarmId}
                onClick={() => handleAlarmClick(alarm)}
                className={`b2c-data-table__row--interactive${alarm.read === 'Y' ? '' : ' b2c-data-table__row--unread'}`}
              >
                <td data-label="구분">{alarm.category}</td>
                <td data-label="내용" className="b2c-data-table__primary">{alarm.message}</td>
                <td data-label="수신일" className="b2c-data-table__muted">{alarm.createAt}</td>
                <td data-label="읽음">
                  <span className={`b2c-status${alarm.read === 'Y' ? '' : ' b2c-status--accent'}`}>
                    {alarm.read === 'Y' ? '읽음' : '안읽음'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default B2cNotification;
