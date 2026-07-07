import { Link, Outlet } from 'react-router-dom';

// B2C 일반 회원 메인 마이페이지 컴포넌트 (디자인 제외 Plain 버전 - 중첩 라우팅 적용)
function B2cMain() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ padding: '20px' }}>
      <h2>일반 회원 마이페이지 ({user.name}님)</h2>
      
      {/* 마이페이지 전용 서브 링크 영역 (이관 탭 추가 및 정합) */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
        {/* 멤버십 링크 */}
        <Link to="membership" style={{ textDecoration: 'none', fontWeight: 'bold', color: 'blue' }}>멤버십</Link>

        {/* 신규 이관 링크 삼대장 */}
        <Link to="notification" style={{ textDecoration: 'none', fontWeight: 'bold' }}>알림</Link>
        <Link to="coupon" style={{ textDecoration: 'none', fontWeight: 'bold' }}>내 쿠폰함</Link>
        <Link to="attendance" style={{ textDecoration: 'none', fontWeight: 'bold' }}>출석기록</Link>

        {/* 건의사항 링크 */}
        <Link to="b2ccomplaint" style={{ textDecoration: 'none' }}>건의사항</Link>
        
        {/* 계정설정 링크 */}
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
