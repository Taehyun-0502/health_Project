import { NavLink, Outlet } from 'react-router-dom';
import './B2cPages.css';

// 마이페이지 서브 메뉴 (하단 탭바와 별개로 마이페이지 내부 이동을 담당)
const SUB_MENUS = [
  { to: 'membership', label: '멤버십' },
  { to: 'coupon', label: '내 쿠폰함' },
  { to: 'checkin', label: '출석기록' },
  { to: 'b2ccomplaint', label: '건의사항' },
  { to: 'account', label: '계정설정' },
];

// B2C 일반 회원 메인 마이페이지 컴포넌트 (디자인 제외 Plain 버전 - 중첩 라우팅 적용)
function B2cMain() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <main className="b2c-mypage">
      <h1 className="b2c-mypage__title">일반 회원 마이페이지 ({user.name}님)</h1>

      {/* 마이페이지 전용 서브 링크 영역 - 현재 경로에 해당하는 칩만 선택 상태로 표시 */}
      <nav className="b2c-mypage__nav" aria-label="마이페이지 세부 메뉴">
        {SUB_MENUS.map((menu) => (
          <NavLink
            key={menu.to}
            to={menu.to}
            className={({ isActive }) => `b2c-mypage__chip${isActive ? ' is-active' : ''}`}
          >
            {menu.label}
          </NavLink>
        ))}
      </nav>

      {/* 자식 라우트 컴포넌트들이 마운트되는 슬롯 */}
      <section className="b2c-mypage__panel">
        <Outlet />
      </section>
    </main>
  );
}

export default B2cMain;
