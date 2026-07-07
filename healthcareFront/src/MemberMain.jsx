import { Link, useNavigate } from 'react-router-dom';

// 일반 회원(member) 로그인 직후 도달하는 메인 포털 컴포넌트 (Plain 버전 - 탭 이관 완료)
function MemberMain() {
  const navigate = useNavigate();

  // 로그인 세션 사용자 정보 획득
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 로그아웃 처리 핸들러 (세션 정리 및 리다이렉트)
  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    alert('로그아웃되었습니다.');
    navigate('/');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Haru Bread Health - 일반 회원 메인 포털 ({user.name}님)</h2>
      
      {/* 마이페이지 이동 및 로그아웃 처리 버튼 */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '15px' }}>
        <Link to="/fitc/mypage" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
          마이페이지 이동 (멤버십/알림/쿠폰/출석/건의)
        </Link>
        <button onClick={handleLogout} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          로그아웃
        </button>
      </div>

      <hr />

      <div style={{ padding: '40px 20px', backgroundColor: '#f9f9f9', borderRadius: '8px', border: '1px solid #eee', marginTop: '20px' }}>
        <h3>반갑습니다, {user.name} 회원님.</h3>
        <p style={{ color: '#666', marginTop: '10px' }}>
          회원님의 이용권 기간, 입·퇴실 기록, 보유 쿠폰 및 건의사항은 <strong>[마이페이지]</strong>에서 확인하실 수 있습니다.
        </p>
      </div>
    </div>
  );
}

export default MemberMain;
