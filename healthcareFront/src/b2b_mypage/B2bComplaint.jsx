import { useState, useEffect } from 'react';
import './B2bSubpages.css';

const complaintStatusClass = (status) => {
  if (status === '처리완료') return 'b2b-status-badge--complete';
  if (status === '처리중') return 'b2b-status-badge--progress';
  return 'b2b-status-badge--waiting';
};

// B2B 사장님/관리자용 건의사항 접수 및 처리 컴포넌트 (Plain 버전)
function B2bComplaint() {
  const [complaints, setComplaints] = useState([]); // 접수된 건의 내역 목록 상태

  // 로그인 세션에서 사장님 정보 획득
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 소속 체육관 건의사항 목록 조회 함수
  const fetchGymComplaints = async () => {
    if (!user.gymId) return;
    try {
      // 백엔드와 정확히 매치되는 /complaint/ownerlist 주소로 조회 호출
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/complaint/ownerlist?gymId=${user.gymId}`);
      if (response.ok) {
        const data = await response.json();
        setComplaints(data);
      }
    } catch (error) {
      console.error('건의 내역 조회 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 최초 조회 작동
  useEffect(() => {
    fetchGymComplaints();
  }, []);

  // 건의사항 처리 상태 수정 요청 핸들러
  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/complaint/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          complaintId: complaintId,
          status: newStatus
        }),
      });

      if (response.ok) {
        alert('처리 상태가 변경되었습니다.');
        fetchGymComplaints(); // 목록 동기화 최신화
      } else {
        alert('상태 변경에 실패했습니다.');
      }
    } catch (error) {
      console.error('상태 변경 통신 오류:', error);
    }
  };

  return (
    <section className="b2b-subpage" aria-labelledby="b2b-complaint-title">
      <header className="b2b-subpage__header">
        <h2 id="b2b-complaint-title">회원 건의사항 접수 현황</h2>
      </header>
      {complaints.length === 0 ? (
        <p className="b2b-subpage__empty">접수된 건의 내역이 없어요.</p>
      ) : (
        <div className="b2b-table-wrap">
          <table className="b2b-data-table b2b-data-table--complaint">
            <thead>
              <tr>
                <th>번호</th>
                <th>회원 ID(전화번호)</th>
                <th>제목</th>
                <th>내용</th>
                <th>접수일자</th>
                <th className="b2b-data-table__center">현재상태</th>
                <th className="b2b-data-table__center">상태 변경</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((item) => (
                <tr key={item.complaintId}>
                  <td className="b2b-data-table__number">{item.complaintId}</td>
                  <td className="b2b-data-table__number">{item.username}</td>
                  <td className="b2b-data-table__title">{item.title}</td>
                  <td className="b2b-data-table__content">{item.content}</td>
                  <td className="b2b-data-table__date">{item.createAt}</td>
                  <td className="b2b-data-table__center">
                    <strong className={`b2b-status-badge ${complaintStatusClass(item.status)}`}>
                      {item.status}
                    </strong>
                  </td>
                  <td className="b2b-data-table__center">
                    <select
                      className="b2b-table-select"
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.complaintId, e.target.value)}
                      aria-label={`${item.title} 처리 상태 변경`}
                    >
                      <option value="처리대기">처리대기</option>
                      <option value="처리중">처리중</option>
                      <option value="처리완료">처리완료</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default B2bComplaint;
