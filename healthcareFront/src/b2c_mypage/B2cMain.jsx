import { NavLink, Outlet } from 'react-router-dom';

// 마이페이지 서브 메뉴 (하단 탭바와 별개로 마이페이지 내부 이동을 담당)
const SUB_MENUS = [
  { to: 'membership', label: '멤버십' },
  { to: 'coupon', label: '내 쿠폰함' },
  { to: 'checkin', label: '출석기록' },
  { to: 'b2ccomplaint', label: '건의사항' },
  { to: 'account', label: '계정설정' },
];

const chipStyle = (isActive) => ({
  textDecoration: 'none',
  fontWeight: '600',
  fontSize: '13px',
  padding: '8px 14px',
  borderRadius: '999px',
  color: isActive ? '#fff' : 'var(--gray-500)',
  backgroundColor: isActive ? 'var(--b2c-accent)' : 'var(--gray-100)',
});

// B2C 일반 회원 메인 마이페이지 컴포넌트 (디자인 제외 Plain 버전 - 중첩 라우팅 적용)
function B2cMain() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--gray-900)' }}>일반 회원 마이페이지 ({user.name}님)</h2>

      {/* 마이페이지 전용 서브 링크 영역 - 현재 경로에 해당하는 칩만 선택 상태로 표시 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {SUB_MENUS.map((menu) => (
          <NavLink key={menu.to} to={menu.to} style={({ isActive }) => chipStyle(isActive)}>
            {menu.label}
          </NavLink>
        ))}
      </div>

      {/* 자식 라우트 컴포넌트들이 마운트되는 슬롯 */}
      <div style={{ border: '1px solid var(--gray-200)', borderRadius: '14px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(23,23,23,.06)', padding: '16px 12px', minHeight: '300px' }}>
        <Outlet />
      </div>


    </div>
  );
}

export default B2cMain;
