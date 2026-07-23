// 디자인 시스템 공용 스트로크 아이콘 (체육관 SaaS 프로토타입 아이콘 세트)
// 표현 전용 컴포넌트 — 라우팅·상태 로직 없음. color는 CSS currentColor를 따른다.

const ICON_PATHS = {
  home: (
    <>
      <path d="M4 11l8-6.5 8 6.5" />
      <path d="M6 10v9h12v-9" />
    </>
  ),
  dashboard: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  churnlist: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4" />
      <path d="M9 17v-3M12 17v-5M15 17v-2" strokeLinecap="round" />
    </>
  ),
  contract: (
    <>
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9.5 12h6M9.5 16h6" />
    </>
  ),
  settle: (
    <>
      <ellipse cx="12" cy="7" rx="7" ry="3" />
      <path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" />
    </>
  ),
  item: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
  promotion: (
    <>
      <path d="M4 4h7l9 9-7 7-9-9z" />
      <circle cx="8.5" cy="8.5" r="1.4" />
    </>
  ),
  management: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20a5.5 5.5 0 0111 0" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.5 20a4 4 0 016.5-3" />
    </>
  ),
  attendance: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M8 21h8" />
    </>
  ),
  join: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 20a5 5 0 019-3" />
      <path d="M18 8v6M15 11h6" />
    </>
  ),
  mypage: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2" />
    </>
  ),
  complaint: <path d="M4 5h16v11H9l-4 4z" />,
  coupon: (
    <>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M12 6v12" strokeDasharray="2 2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 01-3.4 0" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" strokeWidth="2" />,
};

export function NavIcon({ id, size = 19, fallback = null }) {
  const paths = ICON_PATHS[id];
  if (!paths) return fallback;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

export default NavIcon;
