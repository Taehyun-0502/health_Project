import { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// 회원가입 페이지 컴포넌트 (디자인 제외 Plain 버전)
function Join() {
  const formRef = useRef(null);
  const checkedIdRef = useRef('');
  const navigate = useNavigate();

  // 아이디(전화번호) 중복 확인 핸들러
  const handleIdCheck = async () => {
    if (!formRef.current) return;
    const formData = new FormData(formRef.current);
    const username = formData.get('username')?.trim();

    if (!username) {
      alert('전화번호(아이디)를 입력해 주세요.');
      return;
    }

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
          checkedIdRef.current = username;
        } else {
          alert('이미 가입된 전화번호입니다.');
          checkedIdRef.current = '';
        }
      } else {
        alert('중복 확인 실패: 서버 이상');
      }
    } catch (error) {
      console.error('중복확인 오류:', error);
      alert('통신 오류 발생');
    }
  };

  // 회원가입 요청 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(formRef.current);
    const data = Object.fromEntries(formData.entries());

    const username = data.username?.trim();
    if (!checkedIdRef.current || checkedIdRef.current !== username) {
      alert('전화번호 중복 확인을 먼저 수행해 주세요.');
      return;
    }

    if (data.password !== data.passwordCheck) {
      alert('비밀번호가 일치하지 않습니다.');
      return;
    }

    const submitData = {
      username: parseInt(username, 10),
      password: data.password,
      passwordCheck: data.passwordCheck,
      name: data.name,
      email: data.email || null,
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
        navigate('/')
      } else {
        const errorText = await response.text();
        alert(errorText || '회원가입에 실패했습니다.');
      }
    } catch (error) {
      console.error('오류 발생:', error);
      alert('통신 오류 발생');
    }
  };

  return (
    <div>
      <h2>회원가입</h2>
      <form ref={formRef} onSubmit={handleSubmit}>
        <div>
          <label>전화번호 (아이디): </label>
          <input type="tel" name="username" required placeholder="예: 01012345678" />
          <button type="button" onClick={handleIdCheck}>중복 확인</button>
        </div>
        <div>
          <label>비밀번호: </label>
          <input type="password" name="password" required />
        </div>
        <div>
          <label>비밀번호 확인: </label>
          <input type="password" name="passwordCheck" required />
        </div>
        <div>
          <label>이름: </label>
          <input type="text" name="name" required />
        </div>
        <div>
          <label>이메일 (선택): </label>
          <input type="email" name="email" />
        </div>
        <div>
          <label>회원 유형: </label>
          <select name="role" required>
            <option value="member">일반 회원 (member)</option>
            <option value="trainer">트레이너 (trainer)</option>
          </select>
        </div>
        <div>
          <label>사업장 번호 (Gym ID): </label>
          <input type="number" name="gymId" required />
        </div>
        <button type="submit">가입하기</button>
      </form>
      <div>
        <Link to="/login">로그인 하기</Link>
      </div>
    </div>
  );
}

export default Join;