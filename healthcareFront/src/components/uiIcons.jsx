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
  arrow: (
    <>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M3 9h18" />
    </>
  ),
  person: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0116 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
    </>
  ),
  close: (
    <>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3L2.8 20h18.4z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6h14a2 2 0 012 2v11H4a2 2 0 01-2-2V6a3 3 0 013-3h12" />
      <path d="M15 11h6v5h-6a2.5 2.5 0 010-5z" />
    </>
  ),
  card: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
  clipboard: (
    <>
      <path d="M9 5H6a2 2 0 00-2 2v14h16V7a2 2 0 00-2-2h-3" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M8 12h8M8 16h8" />
    </>
  ),
  bot: (
    <>
      <rect x="4" y="7" width="16" height="12" rx="3" />
      <path d="M12 3v4M9 3h6M8 12h.01M16 12h.01M8 16h8" />
    </>
  ),
  send: (
    <>
      <path d="M21 3L10 14" />
      <path d="M21 3l-7 18-4-7-7-4z" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M9 18h6M10 22h4" />
      <path d="M8.5 15.5a7 7 0 117 0c-.9.8-1.5 1.5-1.5 2.5h-4c0-1-.6-1.7-1.5-2.5z" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M6 9v6M18 9v6M3 10v4M21 10v4M6 12h12" />
    </>
  ),
  handshake: (
    <>
      <path d="M3 8l4-3 4 3-4 5zM21 8l-4-3-4 3 4 5z" />
      <path d="M8 12l4 4 4-4M10 14l-2 2M14 14l2 2" />
    </>
  ),
  check: <path d="M5 12l4 4L19 6" />,
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 018 0v3M12 14v3" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  tool: (
    <>
      <path d="M14 7a4 4 0 01-5 5L4 17l3 3 5-5a4 4 0 005-5z" />
      <path d="M15 4l5 5" />
    </>
  ),
  phone: (
    <>
      <path d="M7 3h3l1 5-2 1a15 15 0 006 6l1-2 5 1v3a3 3 0 01-3 3A15 15 0 014 6a3 3 0 013-3z" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
};

export function NavIcon({ id, size = 19, fallback = null, className }) {
  const paths = ICON_PATHS[id];
  if (!paths) return fallback;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}

export default NavIcon;
