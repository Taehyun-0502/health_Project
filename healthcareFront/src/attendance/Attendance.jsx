import { useRef, useState } from 'react';

// 헬스장 입구 공용 태블릿(키오스크)용 출석 페이지 - 로그인 없이 접근
// 1화면: 헬스장 출석 / PT 출석 버튼 -> 2화면: 계정(전화번호+비밀번호) 입력 -> 3화면: 완료 안내
function Attendance() {
  const formRef = useRef(null);
  const [mode, setMode] = useState(null); // null=선택화면, 'gym'=헬스장, 'pt'=PT
  const [result, setResult] = useState(null); // 출석 완료 응답 (완료 화면 표시용)
  const [loading, setLoading] = useState(false);

  // 초기 선택 화면으로 리셋 (키오스크 특성상 완료 후 항상 처음으로 복귀)
  const handleReset = () => {
    setMode(null);
    setResult(null);
  };

  // 출석 제출 핸들러 (헬스장/PT 공용 - mode에 따라 API 분기)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData.entries());

    const submitData = {
      username: parseInt(data.username?.trim(), 10),
      password: data.password,
    };

    if (isNaN(submitData.username)) {
      alert('올바른 전화번호 형식을 입력해 주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitc/attendance/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const row = await response.json();
        setResult(row);
        // 공용 태블릿이므로 완료 화면은 7초 후 자동으로 처음 화면 복귀
        setTimeout(handleReset, 7000);
      } else {
        const errorText = await response.text();
        alert(errorText || '출석 처리에 실패했습니다.');
      }
    } catch (error) {
      console.error('출석 처리 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const bigButtonStyle = {
    width: '260px',
    height: '160px',
    fontSize: '24px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '16px',
    cursor: 'pointer',
    color: '#fff',
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '8px' }}>🏋️ 출석 체크</h2>
      <p style={{ color: '#666', marginBottom: '40px' }}>출석 유형을 선택한 뒤 본인 계정으로 확인해 주세요.</p>

      {/* 3화면: 출석 완료 안내 */}
      {result ? (
        <div style={{ padding: '40px 20px', border: '2px solid #22c55e', borderRadius: '16px', backgroundColor: '#f0fdf4' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ margin: '0 0 12px 0', color: '#166534' }}>{result.memberName}님 출석 완료!</h2>
          {result.inoutType === 2 ? (
            <p style={{ color: '#374151', fontSize: '15px' }}>
              PT 출석이 접수되었습니다.<br />
              담당 트레이너 확인 후 잔여 횟수가 차감됩니다. (현재 잔여 {result.remainingCount}회)
            </p>
          ) : (
            <p style={{ color: '#374151', fontSize: '15px' }}>오늘도 좋은 운동 되세요!</p>
          )}
          <button onClick={handleReset} style={{ marginTop: '20px', padding: '10px 30px', fontSize: '15px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
            확인
          </button>
        </div>
      ) : mode === null ? (
        /* 1화면: 출석 유형 선택 버튼 2개 */
        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center' }}>
          <button onClick={() => setMode('gym')} style={{ ...bigButtonStyle, backgroundColor: '#0284c7' }}>
            💪<br />헬스장 출석
          </button>
          <button onClick={() => setMode('pt')} style={{ ...bigButtonStyle, backgroundColor: '#7c3aed' }}>
            🤝<br />PT 출석
          </button>
        </div>
      ) : (
        /* 2화면: 계정 입력 폼 (로그인 형식 본인 확인) */
        <div style={{ maxWidth: '360px', margin: '0 auto', padding: '30px', border: '1px solid #ddd', borderRadius: '16px', textAlign: 'left' }}>
          <h3 style={{ marginTop: 0, textAlign: 'center', color: mode === 'gym' ? '#0284c7' : '#7c3aed' }}>
            {mode === 'gym' ? '💪 헬스장 출석' : '🤝 PT 출석'}
          </h3>
          {mode === 'pt' && (
            <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
              접수 후 담당 트레이너가 확인하면 잔여 횟수가 1회 차감됩니다.
            </p>
          )}
          <form ref={formRef} onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>전화번호 (아이디)</label>
              <input type="tel" name="username" required placeholder="예: 01012345678" autoComplete="off"
                style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>비밀번호</label>
              <input type="password" name="password" required autoComplete="off"
                style={{ width: '100%', padding: '10px', fontSize: '16px', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '16px', fontWeight: 'bold', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', backgroundColor: mode === 'gym' ? '#0284c7' : '#7c3aed' }}>
              {loading ? '처리 중...' : '출석하기'}
            </button>
          </form>
          <button onClick={handleReset} style={{ width: '100%', marginTop: '10px', padding: '10px', fontSize: '14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
            ← 처음으로
          </button>
        </div>
      )}
    </div>
  );
}

export default Attendance;
