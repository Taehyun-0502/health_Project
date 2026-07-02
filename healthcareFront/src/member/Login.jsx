import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// 로그인 페이지 컴포넌트 (디자인 제외 Plain 버전)
function Login() {
  const formRef = useRef(null);
  const navigate = useNavigate();

  // 로그인 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
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

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        const memberInfo = await response.json();
        alert(`${memberInfo.name}님, 로그인에 성공했습니다.`);
        if (memberInfo.role === 'member') {
          navigate('/fitc');
        } else {
          navigate('/fitb');
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
    <div>
      <h2>로그인</h2>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div>
          <label>전화번호 (아이디): </label>
          <input type="tel" name="username" required placeholder="예: 01012345678" />
        </div>
        <div>
          <label>비밀번호: </label>
          <input type="password" name="password" required />
        </div>
        <button type="submit">로그인</button>
      </form>
      <div>
        <Link to="/join">회원가입 하기</Link>
      </div>
    </div>
  );
}

export default Login;
