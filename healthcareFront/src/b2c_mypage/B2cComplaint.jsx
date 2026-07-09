import { useState, useEffect, useRef } from 'react';

// B2C 일반 회원 건의사항 컴포넌트 (디자인 제외 Plain 버전)
function B2cComplaint() {
  const [suggestions, setSuggestions] = useState([]); // 건의사항 내역 목록 상태
  const suggestFormRef = useRef(null);

  // 로컬 스토리지에서 현재 로그인한 유저의 정보 획득
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 내 건의사항 목록 조회 함수
  const fetchMySuggestions = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/complaint/memberlist`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data);
      } else {
        const errorText = await response.text();
        console.error('건의 내역 로드 실패:', errorText);
      }
    } catch (error) {
      console.error('건의 내역 조회 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 최초 목록 조회 수행
  useEffect(() => {
    fetchMySuggestions();
  }, []);

  // 건의사항 제출 핸들러
  const handleSuggestSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(suggestFormRef.current);
    const data = Object.fromEntries(formData.entries());

    const submitData = {
      username: user.username,
      gymId: user.gymId,
      title: data.title,
      content: data.content,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/complaint/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert('건의사항이 사장님께 전송되었습니다.');
        suggestFormRef.current.reset();
        fetchMySuggestions(); // 내역 목록 즉시 갱신
      } else {
        alert('전송에 실패했습니다.');
      }
    } catch (error) {
      console.error('오류 발생:', error);
      alert('통신 오류 발생');
    }
  };

  return (
    <div>
      <h3>건의사항 접수함</h3>
      
      {/* 건의사항 작성 폼 */}
      <form ref={suggestFormRef} onSubmit={handleSuggestSubmit} style={{ marginBottom: '30px' }}>
        <div>
          <label>건의 제목: </label>
          <input type="text" name="title" required style={{ width: '100%' }} />
        </div>
        <div style={{ marginTop: '10px' }}>
          <label>건의 내용: </label>
          <textarea name="content" required style={{ width: '100%', height: '100px' }}></textarea>
        </div>
        <button type="submit" style={{ marginTop: '10px' }}>건의사항 보내기</button>
      </form>

      <hr />

      {/* 건의 처리결과 화면 목록 */}
      <h4>내가 접수한 건의 내역</h4>
      {suggestions.length === 0 ? (
        <p>접수된 건의 내역이 없습니다.</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr>
              <th>번호</th>
              <th>제목</th>
              <th>상태</th>
              <th>접수일자</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((item) => (
              <tr key={item.complaintId}>
                <td>{item.complaintId}</td>
                <td>{item.title}</td>
                <td>
                  <span style={{ color: item.status === '처리완료' ? 'green' : 'orange', fontWeight: 'bold' }}>
                    {item.status}
                  </span>
                </td>
                <td>{item.createAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default B2cComplaint;