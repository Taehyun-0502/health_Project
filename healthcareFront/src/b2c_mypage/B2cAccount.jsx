import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './B2cPages.css';

// B2C 일반 회원용 계정 설정 수정 컴포넌트 (Plain 버전)
function B2cAccount() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 상태 관리 (이메일 및 새로운 비밀번호 입력 데이터)
  const [email, setEmail] = useState(user.email || '');
  const [password, setPassword] = useState('');
  const [passwordCheck, setPasswordCheck] = useState('');
  const [message, setMessage] = useState('');

  // 계정 정보 수정 요청 핸들러
  const handleUpdate = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate('/');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: email,
          password: password,
          passwordCheck: passwordCheck
        })
      });

      if (response.ok) {
        alert('계정 정보가 성공적으로 변경되었습니다. 다시 로그인해 주세요.');
        
        // 개인정보 변경 성공 시 세션을 클리어하고 강제 로그아웃 리다이렉트
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken'); // ◀ 리프레쉬 토큰 제거
        navigate('/');
      } else {
        const errorText = await response.text();
        setMessage(errorText || '수정에 실패했습니다.');
      }
    } catch (error) {
      console.error('정보 수정 중 오류 발생:', error);
      setMessage('서버와의 통신에 실패했습니다.');
    }
  };

  return (
    <div className="b2c-page">
      <header className="b2c-page__header">
        <h2 className="b2c-page__title">내 계정 설정 (B2C)</h2>
        <p className="b2c-page__description">회원님의 임시 비밀번호와 이메일을 수정할 수 있습니다.</p>
      </header>

      {message && <div className="b2c-form__message">{message}</div>}

      <form onSubmit={handleUpdate} className="b2c-form">
        <div className="b2c-form__group">
          <label className="b2c-form__label">아이디 (전화번호)</label>
          <input
            type="text"
            value={user.username || ''}
            disabled
            className="b2c-form__input"
          />
        </div>

        <div className="b2c-form__group">
          <label className="b2c-form__label">이메일 주소</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="b2c-form__input"
          />
        </div>

        <div className="b2c-form__group">
          <label className="b2c-form__label">새 비밀번호 입력</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="변경할 새 비밀번호"
            className="b2c-form__input"
          />
        </div>

        <div className="b2c-form__group">
          <label className="b2c-form__label">새 비밀번호 확인</label>
          <input
            type="password"
            value={passwordCheck}
            onChange={(e) => setPasswordCheck(e.target.value)}
            required
            placeholder="변경할 새 비밀번호 재입력"
            className="b2c-form__input"
          />
        </div>

        <button type="submit" className="b2c-button b2c-button--dark">
          수정 완료
        </button>
      </form>
    </div>
  );
}

export default B2cAccount;
