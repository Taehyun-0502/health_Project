import { Link, useLocation } from 'react-router-dom';
import NavIcon from './uiIcons.jsx';
import './B2cTabBar.css';

// B2C(회원) 하단 고정 탭바 — 기존 라우트로 이동만 하는 내비게이션 컴포넌트.
// 활성 여부는 CSS class가 아니라 useLocation 기반 React 로직으로 판정한다.

// 탭 정의 — 각 탭의 활성 판정 규칙(match)을 데이터로 함께 보관
const TABS = [
  {
    key: 'home',
    label: '홈',
    to: '/fitc',
    icon: 'home',
    // 홈은 경로가 정확히 /fitc 일 때만 활성
    match: (path) => path === '/fitc' || path === '/fitc/',
  },
  {
    key: 'checkin',
    label: '출석',
    to: '/fitc/mypage/checkin',
    icon: 'calendar',
    match: (path) => path === '/fitc/mypage/checkin',
  },
  {
    key: 'coupon',
    label: '쿠폰',
    to: '/fitc/mypage/coupon',
    icon: 'coupon',
    match: (path) => path === '/fitc/mypage/coupon',
  },
  {
    key: 'mypage',
    label: '마이',
    to: '/fitc/mypage/membership',
    icon: 'person',
    // 출석·쿠폰을 제외한 나머지 마이페이지 하위 경로 전부
    match: (path) =>
      path.startsWith('/fitc/mypage') &&
      path !== '/fitc/mypage/checkin' &&
      path !== '/fitc/mypage/coupon',
  },
];

function B2cTabBar() {
  const { pathname } = useLocation();
  // 끝의 슬래시를 정리해 판정 기준 경로를 통일 (/fitc 는 그대로 둔다)
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

  return (
    <nav className="b2c-tabbar" aria-label="회원 메뉴">
      {TABS.map(({ key, label, to, icon, match }) => {
        const active = match(path);
        return (
          <Link
            key={key}
            to={to}
            className="b2c-tabbar__item"
            data-active={active ? 'true' : 'false'}
            aria-current={active ? 'page' : undefined}
          >
            <span className="b2c-tabbar__icon">
              <NavIcon id={icon} size={22} />
            </span>
            <span className="b2c-tabbar__label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default B2cTabBar;
