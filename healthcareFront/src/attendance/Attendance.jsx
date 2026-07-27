import { useRef, useState } from 'react';
import NavIcon from '../components/uiIcons.jsx';
import './Attendance.css';

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

  return (
    <main className="attendance-kiosk">
      <header className="attendance-kiosk__header">
        <h1 className="attendance-kiosk__title">
          <NavIcon id="dumbbell" size={24} className="ui-icon" /> 출석 체크
        </h1>
        <p className="attendance-kiosk__description">출석 유형을 선택한 뒤 본인 계정으로 확인해 주세요.</p>
      </header>

      {/* 3화면: 출석 완료 안내 */}
      {result ? (
        <section className="attendance-kiosk__result">
          <div className="attendance-kiosk__result-icon" aria-hidden="true"><NavIcon id="check" size={40} /></div>
          <h2 className="attendance-kiosk__result-title">{result.memberName}님 출석 완료!</h2>
          {result.inoutType === 2 ? (
            <p className="attendance-kiosk__result-copy">
              PT 출석이 접수되었습니다.<br />
              담당 트레이너 확인 후 잔여 횟수가 차감됩니다. (현재 잔여 {result.remainingCount}회)
            </p>
          ) : (
            <p className="attendance-kiosk__result-copy">오늘도 좋은 운동 되세요!</p>
          )}
          <button onClick={handleReset} className="attendance-kiosk__reset">
            확인
          </button>
        </section>
      ) : mode === null ? (
        /* 1화면: 출석 유형 선택 버튼 2개 */
        <section className="attendance-kiosk__chooser" aria-label="출석 유형 선택">
          <button onClick={() => setMode('gym')} className="attendance-kiosk__type-button attendance-kiosk__type-button--gym">
            <span className="attendance-kiosk__type-icon" aria-hidden="true"><NavIcon id="dumbbell" size={32} /></span>
            <span className="attendance-kiosk__type-label">헬스장 출석</span>
          </button>
          <button onClick={() => setMode('pt')} className="attendance-kiosk__type-button attendance-kiosk__type-button--pt">
            <span className="attendance-kiosk__type-icon" aria-hidden="true"><NavIcon id="handshake" size={32} /></span>
            <span className="attendance-kiosk__type-label">PT 출석</span>
          </button>
        </section>
      ) : (
        /* 2화면: 계정 입력 폼 (로그인 형식 본인 확인) */
        <section className={`attendance-kiosk__card attendance-kiosk__card--${mode}`}>
          <h2 className="attendance-kiosk__card-title">
            <NavIcon id={mode === 'gym' ? 'dumbbell' : 'handshake'} size={20} className="ui-icon" />
            {' '}{mode === 'gym' ? '헬스장 출석' : 'PT 출석'}
          </h2>
          {mode === 'pt' && (
            <p className="attendance-kiosk__note">
              접수 후 담당 트레이너가 확인하면 잔여 횟수가 1회 차감됩니다.
            </p>
          )}
          <form ref={formRef} onSubmit={handleSubmit} className="attendance-kiosk__form">
            <div className="attendance-kiosk__field">
              <label className="attendance-kiosk__label">전화번호 (아이디)</label>
              <input type="tel" name="username" required placeholder="예: 01012345678" autoComplete="off"
                className="attendance-kiosk__input" />
            </div>
            <div className="attendance-kiosk__field">
              <label className="attendance-kiosk__label">비밀번호</label>
              <input type="password" name="password" required autoComplete="off"
                className="attendance-kiosk__input" />
            </div>
            <button type="submit" disabled={loading}
              className={`attendance-kiosk__submit attendance-kiosk__submit--${mode}`}>
              {loading ? '처리 중...' : '출석하기'}
            </button>
          </form>
          <button onClick={handleReset} className="attendance-kiosk__reset">
            <NavIcon id="arrow" size={18} className="ui-icon ui-icon--left" /> 처음으로
          </button>
        </section>
      )}
    </main>
  );
}

export default Attendance;
