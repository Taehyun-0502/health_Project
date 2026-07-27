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
    <div style={{ padding: '16px 16px 32px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--gray-900)' }}>건의사항 접수함</h3>

      {/* 건의사항 작성 폼 */}
      <form ref={suggestFormRef} onSubmit={handleSuggestSubmit} style={{ marginBottom: '30px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px' }}>건의 제목: </label>
          <input type="text" name="title" required style={{ width: '100%', boxSizing: 'border-box', padding: '12px', border: '1px solid var(--gray-300)', borderRadius: '10px' }} />
        </div>
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--gray-600)', marginBottom: '6px' }}>건의 내용: </label>
          <textarea name="content" required style={{ width: '100%', boxSizing: 'border-box', height: '100px', padding: '12px', border: '1px solid var(--gray-300)', borderRadius: '10px', fontFamily: 'inherit' }}></textarea>
        </div>
        <button type="submit" style={{ marginTop: '12px', width: '100%', minHeight: '48px', padding: '12px', backgroundColor: 'var(--b2c-accent)', color: 'var(--white)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>건의사항 보내기</button>
      </form>

      <hr style={{ border: 'none', borderTop: '1px solid var(--gray-200)', margin: '24px 0' }} />

      {/* 건의 처리결과 화면 목록 */}
      <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--gray-900)' }}>내가 접수한 건의 내역</h4>
      {suggestions.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>접수된 건의 내역이 없습니다.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-600)', borderBottom: '2px solid var(--gray-200)' }}>
              <th style={{ padding: '10px', fontWeight: '600' }}>번호</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>제목</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>상태</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>접수일자</th>
            </tr>
          </thead>
          <tbody>
            {suggestions.map((item) => (
              <tr key={item.complaintId} style={{ borderBottom: '1px solid var(--gray-200)', textAlign: 'center' }}>
                <td style={{ padding: '10px' }}>{item.complaintId}</td>
                <td style={{ padding: '10px' }}>{item.title}</td>
                <td style={{ padding: '10px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    fontSize: '11px',
                    fontWeight: '600',
                    backgroundColor: item.status === '처리완료' ? 'var(--success-bg)' : 'var(--warning-bg)',
                    color: item.status === '처리완료' ? 'var(--success)' : 'var(--warning)'
                  }}>
                    {item.status}
                  </span>
                </td>
                <td style={{ padding: '10px', color: 'var(--gray-600)' }}>{item.createAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default B2cComplaint;