import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
    <div style={{ padding: '16px 16px 32px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--gray-900)' }}>알림 내역</h3>
      {alarms.length === 0 ? (
        <p style={{ color: 'var(--gray-600)', marginTop: '10px' }}>새로운 알림 소식이 없습니다.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-600)', borderBottom: '2px solid var(--gray-200)' }}>
              <th style={{ padding: '10px', fontWeight: '600' }}>구분</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>내용</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>수신일</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>읽음</th>
            </tr>
          </thead>
          <tbody>
            {alarms.map((alarm) => (
              <tr
                key={alarm.alarmId}
                onClick={() => handleAlarmClick(alarm)}
                style={{
                  cursor: 'pointer',
                  fontWeight: alarm.read === 'Y' ? 'normal' : 'bold',
                  backgroundColor: alarm.read === 'Y' ? 'transparent' : 'var(--b2c-lime-bg)',
                  borderBottom: alarm.read === 'Y' ? '1px solid var(--gray-200)' : '1px solid var(--b2c-lime-line)'
                }}
              >
                <td style={{ padding: '10px' }}>{alarm.category}</td>
                <td style={{ padding: '10px' }}>{alarm.message}</td>
                <td style={{ padding: '10px', color: 'var(--gray-600)' }}>{alarm.createAt}</td>
                <td style={{ padding: '10px', color: alarm.read === 'Y' ? 'var(--gray-400)' : 'var(--b2c-accent)' }}>{alarm.read === 'Y' ? '읽음' : '안읽음'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default B2cNotification;
