import { useState, useEffect } from 'react';

// B2C 일반 회원 마이페이지용 출석 기록(입퇴실) 조회 컴포넌트 (Plain 버전)
function B2cCheckIn() {
  const [checkIn, setCheckIn] = useState([]);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 본인 출석 기록 조회 함수
  const fetchCheckIn = async () => {
    if (!user.username) return;
    try {
      // 8자리 회원 고유 식별 번호(username) 파라미터 전달
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/checkin/list?username=${user.username}`);
      if (response.ok) {
        const data = await response.json();
        setCheckIn(data);
      }
    } catch (error) {
      console.error('출석 기록 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchCheckIn();
  }, []);

  return (
    <div>
      <h3>출석 일지 (입·퇴실 현황)</h3>
      {checkIn.length === 0 ? (
        <p style={{ color: '#666', marginTop: '10px' }}>최근 등록된 출입(입·퇴실) 기록이 없습니다.</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr>
              <th>번호</th>
              <th>입실 시간 (Check In)</th>
            </tr>
          </thead>
          <tbody>
            {checkIn.map((item, idx) => (
              <tr key={item.id || idx}>
                <td>{idx + 1}</td>
                <td>{item.checkIn ? new Date(item.checkIn).toLocaleString() : '-'}</td>
                
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default B2cCheckIn;
