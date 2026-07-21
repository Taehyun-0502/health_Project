import { Link, useLocation } from 'react-router-dom';
import './B2cTabBar.css';

// B2C(회원) 하단 고정 탭바 — 기존 라우트로 이동만 하는 내비게이션 컴포넌트.
// 활성 여부는 CSS class가 아니라 useLocation 기반 React 로직으로 판정한다.

// 홈 아이콘
function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M4 11l8-6.5 8 6.5" />
      <path d="M6 10v9h12v-9" />
    </svg>
  );
}

// 출석(달력) 아이콘
function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18" />
    </svg>
  );
}

// 쿠폰 아이콘
function CouponIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M12 6v12" strokeDasharray="2 2" />
    </svg>
  );
}

// 마이(사람) 아이콘
function PersonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </svg>
  );
}

// 탭 정의 — 각 탭의 활성 판정 규칙(match)을 데이터로 함께 보관
const TABS = [
  {
    key: 'home',
    label: '홈',
    to: '/fitc',
    Icon: HomeIcon,
    // 홈은 경로가 정확히 /fitc 일 때만 활성
    match: (path) => path === '/fitc' || path === '/fitc/',
  },
  {
    key: 'checkin',
    label: '출석',
    to: '/fitc/mypage/checkin',
    Icon: CalendarIcon,
    match: (path) => path === '/fitc/mypage/checkin',
  },
  {
    key: 'coupon',
    label: '쿠폰',
    to: '/fitc/mypage/coupon',
    Icon: CouponIcon,
    match: (path) => path === '/fitc/mypage/coupon',
  },
  {
    key: 'mypage',
    label: '마이',
    to: '/fitc/mypage/membership',
    Icon: PersonIcon,
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
      {TABS.map(({ key, label, to, Icon, match }) => {
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
              <Icon />
            </span>
            <span className="b2c-tabbar__label">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default B2cTabBar;
