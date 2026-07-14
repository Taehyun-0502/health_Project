import { useState, useEffect } from 'react';

// 트레이너 전용 PT 출석 확인 페이지 (/fitb/attendance)
// 당일 본인 담당 회원의 미확인 PT 출석 접수 건을 조회하고, 확인 시 잔여횟수가 1회 차감된다
function AttendanceConfirm() {
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(false);

  // 당일 미확인 PT 출석 대기 목록 조회
  const fetchPending = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setPendingList(data);
      } else {
        const errorText = await response.text();
        console.error('대기 목록 로드 실패:', errorText);
      }
    } catch (error) {
      console.error('대기 목록 조회 실패:', error);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  // 출석 확인 처리 핸들러 - 성공 시 잔여횟수 안내 후 목록 갱신
  const handleConfirm = async (row) => {
    if (loading) return;
    if (!window.confirm(`${row.memberName || row.username}님의 PT 출석을 확인하시겠습니까?\n확인 시 잔여 횟수가 1회 차감됩니다.`)) return;

    const token = localStorage.getItem('accessToken');
    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/confirm/${row.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        alert(`출석 확인 완료! 잔여 PT 횟수: ${data.remainingCount}회`);
      } else {
        const errorText = await response.text();
        alert(errorText || '출석 확인에 실패했습니다.');
      }
    } catch (error) {
      console.error('출석 확인 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
      fetchPending();
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px' }}>
      <h3>🤝 PT 출석 확인</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
        오늘 접수된 담당 회원의 PT 출석 목록입니다. 확인 버튼을 누르면 해당 회원의 잔여 PT 횟수가 1회 차감됩니다.
      </p>

      <button onClick={fetchPending} style={{ marginBottom: '15px', padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
        🔄 새로고침
      </button>

      {pendingList.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          확인 대기 중인 PT 출석이 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>출석 시간</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>잔여 횟수</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {pendingList.map((row) => (
              <tr key={row.id}>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{row.memberName || '-'}</td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{row.username}</td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {row.checkIn ? row.checkIn.substring(11, 16) : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  {row.remainingCount != null ? `${row.remainingCount}회` : '-'}
                </td>
                <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                  <button onClick={() => handleConfirm(row)} disabled={loading}
                    style={{ padding: '6px 14px', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#7c3aed', color: '#fff', fontWeight: 'bold' }}>
                    출석 확인
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default AttendanceConfirm;
