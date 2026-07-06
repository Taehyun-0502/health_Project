import { Link, Outlet } from 'react-router-dom';

// B2C 일반 회원 메인 마이페이지 컴포넌트 (디자인 제외 Plain 버전 - 중첩 라우팅 적용)
// 이 페이지에는 오직 건의사항과 계정설정 메뉴만 보존됩니다.
function B2cMain() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ padding: '20px' }}>
      <h2>일반 회원 마이페이지 ({user.name}님)</h2>
      
      {/* 마이페이지 전용 서브 링크 영역 (건의사항 및 계정설정만 보존) */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        {/* 건의사항 링크 */}
        <Link to="b2ccomplaint" style={{ textDecoration: 'none', fontWeight: 'bold', color: 'blue' }}>건의사항</Link>
        
        {/* 계정설정 링크 (임시 탭용 링크로 남겨둡니다) */}
        <Link to="account" style={{ textDecoration: 'none' }}>계정설정</Link>
      </div>

      {/* 자식 라우트 컴포넌트들이 마운트되는 슬롯 */}
      <div style={{ border: '1px solid #ccc', padding: '20px', minHeight: '300px' }}>
        <Outlet />
      </div>

      <div style={{ marginTop: '20px' }}>
        <Link to="/fitc">메인화면으로 이동</Link>
      </div>
    </div>
  );
}

export default B2cMain;
