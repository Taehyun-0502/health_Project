import { Link, Outlet } from 'react-router-dom';

// B2B 사장님 마이페이지 프레임 컴포넌트 (디자인 제외 Plain 버전 - 중첩 라우팅 적용)
function B2bMain() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ padding: '20px' }}>
      <h2>B2B 관리자 마이페이지 ({user.name} 사장님)</h2>
      
      {/* 관리자 전용 서브 링크 영역 (건의사항 및 계정설정 보존) */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        {/* 회원 건의사항 접수함 링크 */}
        <Link to="b2bcomplaint" style={{ textDecoration: 'none', fontWeight: 'bold', color: 'blue' }}>회원건의 접수현황</Link>
        
        {/* 계정설정 링크 */}
        <Link to="account" style={{ textDecoration: 'none' }}>계정설정</Link>
      </div>

      {/* 자식 라우트 컴포넌트(B2bComplaint 등)가 실시간으로 교체 마운트되는 슬롯 공간 */}
      <div style={{ border: '1px solid #ccc', padding: '20px', minHeight: '300px' }}>
        <Outlet />
      </div>

      <div style={{ marginTop: '20px' }}>
        <Link to="/fitb">관리자 메인화면으로 이동</Link>
      </div>
    </div>
  );
}

export default B2bMain;
