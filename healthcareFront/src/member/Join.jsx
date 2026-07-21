import { useRef, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Auth.css';

// 회원가입 페이지 컴포넌트 — 디자인 시스템 v1.0 (관리자 전용 회원추가, 480px 카드)
function Join() {
  const formRef = useRef(null);
  const checkedIdRef = useRef('');
  const navigate = useNavigate();

  const [role , setRole] = useState('owner')
  const [gymList , setGymList] = useState([])
  const [name , setName] = useState('')

  // [보안 인증 장치] 마운트 시 로그인 세션 권한을 판별하여 admin이 아닐 경우 즉각 튕겨냄
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.role !== 'admin') {
      alert('접근 권한이 없습니다. 총괄 관리자(admin)만 회원 추가가 가능합니다.');
      // 로그인되어 있는 사장님이라면 /fitb로, 그 외 일반 유저라면 / 로그인창으로 분기 이동
      if (user.role === 'owner' || user.role === 'trainer') {
        navigate('/fitb');
      } else {
        navigate('/');
      }
    }
  }, [navigate]);

    // 마운트 시 백엔드에서 전체 체육관 목록을 불러와 저장하는 훅
  useEffect(() => {
    const fetchGymList = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/gym/selectid`);
        if (response.ok) {
          const data = await response.json();
          setGymList(data);
        }
      } catch (error) {
        console.error('체육관 목록 조회 실패:', error);
      }
    };
    fetchGymList();
  }, []);

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
          alert('등록 가능한 전화번호입니다.');
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
      name: name,
      email: data.email || null,
      role: role,
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
        alert('신규 회원이 정상적으로 등록되었습니다.');
        navigate('/fitb'); // 등록 완료 후 다시 대시보드로 복귀
      } else {
        const errorText = await response.text();
        alert(errorText || '회원 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('오류 발생:', error);
      alert('통신 오류 발생');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <strong>Haru Health</strong>
          <small>MANAGEMENT</small>
        </div>
        <h2 className="auth-title">신규 회원 등록 (관리자 전용)</h2>
        <form className="auth-form" ref={formRef} onSubmit={handleSubmit}>
          <div className="auth-field auth-field--inline">
            <div>
              <label>전화번호 (아이디)</label>
              <input type="tel" name="username" required placeholder="예: 01012345678" />
            </div>
            <button className="auth-check-btn" type="button" onClick={handleIdCheck}>중복 확인</button>
          </div>
          <div className="auth-field">
            <label>임시 비밀번호</label>
            <input type="password" name="password" required />
          </div>
          <div className="auth-field">
            <label>임시 비밀번호 확인</label>
            <input type="password" name="passwordCheck" required />
          </div>
          <div className="auth-field">
            <label>이름</label>
            <input
              type="text"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={role === 'owner'}
            />
          </div>
          <div className="auth-field">
            <label>이메일 (선택)</label>
            <input type="email" name="email" />
          </div>
          <div className="auth-field">
            <label>등록할 권한 유형</label>
            <select
              name="role"
              required
              value={role}
              onChange={(e) => {
                const selectedRole = e.target.value;
                setRole(selectedRole);
                if (selectedRole === 'admin') {
                  setName(''); // admin으로 선택 시 강제 이름 초기화하여 자유 기입 유도
                }
              }}
            >
              <option value="owner">체육관 사장 (owner)</option>
              <option value="admin">총괄 관리자 (admin)</option>
            </select>
          </div>
          <div className="auth-field">
            <label>소속 사업장</label>
            {role === 'owner' ? (
              <select
                name="gymId"
                required
                onChange={(e) => {
                  const selectedOption = e.target.options[e.target.selectedIndex];
                  // 1. 옵션 태그에 숨겨둔 data-gymname 속성에서 한글 이름을 가져옵니다.
                  const gymName = selectedOption.getAttribute('data-gymname');
                  if (e.target.value && gymName) {
                    setName(gymName + " 사장님"); // 2. 이름에는 한글 체육관명이 적용됩니다.
                  } else {
                    setName('');
                  }
                }}
              >
                <option value="">-- 선택 --</option>
                {gymList.map((gym) => (
                  // 3. value와 표시 글자는 gymId(숫자)로 지정하고, 한글 이름은 data-gymname에 보관합니다.
                  <option key={gym.gymId} value={gym.gymId} data-gymname={gym.gymName}>
                    {gym.gymId}
                  </option>
                ))}
              </select>
            ) : (
              // admin 권한은 사업장 지정이 불필요하므로 기본값(0) 고정 readOnly 처리
              <input type="number" name="gymId" value={0} readOnly />
            )}
          </div>
          <button className="auth-submit" type="submit">등록하기</button>
        </form>
        <p className="auth-foot">
          <Link to="/fitb">관리자 대시보드로 돌아가기</Link>
        </p>
      </div>
    </div>
  );
}

export default Join;