import { useRef } from 'react';
import { Link } from 'react-router-dom';

// 회원가입 페이지 컴포넌트
function Join() {
  const formRef = useRef(null);
  
  // 중복확인에 통과한 마지막 전화번호 기록용 (비제어 방식 상태 보존)
  const checkedIdRef = useRef('');

  // 아이디(전화번호) 중복 확인 핸들러
  const handleIdCheck = async () => {
    if (!formRef.current) return;
    
    const formData = new FormData(formRef.current);
    const username = formData.get('username')?.trim();

    if (!username) {
      alert('전화번호(아이디)를 입력해 주세요.');
      return;
    }

    // 숫자 형식 검증 (01012345678 형태)
    if (!/^\d+$/.test(username)) {
      alert('하이픈(-) 없이 숫자만 입력해 주세요.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/idcheck`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: parseInt(username, 10) }),
      });

      if (response.ok) {
        const result = await response.text();
        if (result === 'Available') {
          alert('가입 가능한 전화번호입니다.');
          checkedIdRef.current = username; // 사용 가능 판정을 받은 전화번호 기록
        } else {
          alert('이미 가입된 전화번호입니다.');
          checkedIdRef.current = '';
        }
      } else {
        alert('중복 확인 실패: 서버 이상이 발생했습니다.');
      }
    } catch (error) {
      console.error('중복확인 오류:', error);
      alert('서버와 통신하는 중 오류가 발생했습니다.');
    }
  };

  // 회원가입 요청 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData.entries());

    // 데이터 타입 가공 및 검증
    const username = data.username?.trim();
    if (!checkedIdRef.current || checkedIdRef.current !== username) {
      alert('전화번호 중복 확인을 먼저 수행해 주세요.');
      return;
    }

    if (data.password !== data.passwordCheck) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    // JSON 전송용 숫자 포맷 변환
    const submitData = {
      username: parseInt(username, 10),
      password: data.password,
      passwordCheck: data.passwordCheck,
      name: data.name,
      email: data.email,
      role: data.role,
      gymId: parseInt(data.gymId, 10),
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert('회원가입이 완료되었습니다.');
      } else {
        const errorText = await response.text();
        alert(errorText || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('오류 발생:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '40px 24px' }}>
      {/* 가입 폼 카드 */}
      <div className="card-premium" style={{ maxWidth: '500px', width: '100%' }}>
        <h2 className="gradient-title" style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center' }}>회원가입</h2>
        <p className="sub-title" style={{ textAlign: 'center', fontSize: '14px', marginBottom: '32px' }}>
          하루 브레드와 함께 맞춤형 건강 관리를 시작하세요.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">전화번호 (아이디)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="tel" id="username" name="username" required className="form-input" placeholder="숫자만 입력하세요. (예: 01012345678)" />
              <button type="button" onClick={handleIdCheck} style={{ width: 'auto', whiteSpace: 'nowrap', padding: '0 16px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                중복 확인
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">비밀번호</label>
            <input type="password" id="password" name="password" required className="form-input" placeholder="비밀번호를 설정하세요." />
          </div>

          <div className="form-group">
            <label htmlFor="passwordCheck" className="form-label">비밀번호 확인</label>
            <input type="password" id="passwordCheck" name="passwordCheck" required className="form-input" placeholder="비밀번호를 다시 입력하세요." />
          </div>

          <div className="form-group">
            <label htmlFor="name" className="form-label">이름</label>
            <input type="text" id="name" name="name" required className="form-input" placeholder="실명을 입력하세요." />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">이메일 (선택)</label>
            <input type="email" id="email" name="email" className="form-input" placeholder="이메일 주소를 입력하세요." />
          </div>

          <div className="form-group">
            <label htmlFor="role" className="form-label">회원 유형</label>
            <select id="role" name="role" required className="form-input" style={{ appearance: 'auto' }}>
              <option value="member">일반 회원 (member)</option>
              <option value="trainer">트레이너 (trainer)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="gymId" className="form-label">사업장 번호 (Gym ID)</label>
            <input type="number" id="gymId" name="gymId" required className="form-input" placeholder="소속된 사업장 번호를 입력하세요." />
          </div>

          <button type="submit" className="btn-premium" style={{ marginTop: '10px' }}>
            가입하기
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>이미 회원이신가요? </span>
          <Link to="/login" style={{ fontSize: '14px', color: 'var(--primary-accent)', fontWeight: '600', textDecoration: 'none' }}>
            로그인 하기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Join;