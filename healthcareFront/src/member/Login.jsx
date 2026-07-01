import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// 로그인 페이지 컴포넌트
function Login() {
  const formRef = useRef(null);
  const navigate = useNavigate();

  // 로그인 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData.entries());

    // 백엔드 수신 타입(Long)에 부합하도록 정수 가공
    const submitData = {
      username: parseInt(data.username?.trim(), 10),
      password: data.password,
    };

    if (isNaN(submitData.username)) {
      alert('올바른 전화번호 형식을 입력해 주세요.');
      return;
    }

    try {
      // 로그인 API 요청 발송
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const memberInfo = await response.json();
        alert(`${memberInfo.name}님, 환영합니다. 로그인에 성공했습니다.`);
        
        // 로그인 성공 시 사용자의 권한(role)에 따른 분기 이동
        if (memberInfo.role === 'member') {
          navigate('/member/main');
        } else {
          navigate('/admin/main');
        }
      } else {
        const errorText = await response.text();
        alert(errorText || '아이디 또는 비밀번호가 올바르지 않습니다.');
      }
    } catch (error) {
      console.error('로그인 오류:', error);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
      {/* 로그인 폼 카드 */}
      <div className="card-premium" style={{ maxWidth: '440px', width: '100%' }}>
        <h2 className="gradient-title" style={{ fontSize: '28px', marginBottom: '8px', textAlign: 'center' }}>로그인</h2>
        <p className="sub-title" style={{ textAlign: 'center', fontSize: '14px', marginBottom: '32px' }}>
          서비스를 이용하기 위해 계정 정보를 입력하세요.
        </p>

        <form ref={formRef} onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="form-group">
            <label htmlFor="username" className="form-label">전화번호 (아이디)</label>
            <input type="tel" id="username" name="username" required className="form-input" placeholder="숫자만 입력하세요. (예: 01012345678)" />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">비밀번호</label>
            <input type="password" id="password" name="password" required className="form-input" placeholder="비밀번호를 입력하세요." />
          </div>

          <button type="submit" className="btn-premium" style={{ marginTop: '10px' }}>
            로그인하기
          </button>
        </form>

        <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '24px', paddingTop: '20px', textAlign: 'center' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>아직 회원이 아니신가요? </span>
          <Link to="/join" style={{ fontSize: '14px', color: 'var(--primary-accent)', fontWeight: '600', textDecoration: 'none' }}>
            회원가입 하기
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
