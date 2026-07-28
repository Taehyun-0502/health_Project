export const ROLE_LABEL = {
  admin: '관리자',
  owner: '사장님',
  trainer: '트레이너',
  member: '회원',
};

export const B2B_ROLES = ['admin', 'owner', 'trainer'];

export const normalizeRole = (role) => String(role || '').toLowerCase();

export const isGymRole = (role) => ['owner', 'trainer'].includes(normalizeRole(role));

export const B2B_PRIMARY_NAV = [
  { id: 'home', label: '홈', to: '/fitb', icon: 'H', end: true },
  { id: 'dashboard', label: '대시보드', to: '/fitb/dashboard', icon: 'D' },
  { id: 'churnlist', label: '리포트', to: '/fitb/report', icon: 'L' },
  { id: 'management', label: '회원 관리', to: '/fitb/management', icon: 'M' },
  { id: 'contract', label: '계약', to: '/fitb/contractpage', icon: 'C' },
  { id: 'settle', label: '정산 매출', to: '/fitb/Settlepage', icon: 'S' },
  { id: 'item', label: '물품', to: '/fitb/itempage', icon: 'I' },
];

const CORE_HOME_ACTIONS = [
  {
    id: 'dashboard',
    title: '대시보드',
    description: '매출, 회원, 계약 현황과 오늘 처리할 업무를 한눈에 확인합니다.',
    to: '/fitb/dashboard',
    icon: 'D',
    core: true,
  },
  {
    id: 'contract',
    title: '계약',
    description: '계약서를 조회하고 역할에 따라 신규 계약을 작성합니다.',
    to: '/fitb/contractpage',
    icon: 'C',
    core: true,
  },
  {
    id: 'settle',
    title: '정산 매출',
    description: '매출과 지출 내역을 확인하고 기간별 정산 업무를 관리합니다.',
    to: '/fitb/Settlepage',
    icon: 'S',
    core: true,
  },
  {
    id: 'item',
    title: '물품',
    description: '센터 물품의 재고, 사용 현황과 교체 일정을 관리합니다.',
    to: '/fitb/itempage',
    icon: 'I',
    core: true,
  },
];

const ROLE_HOME_ACTIONS = {
  admin: [
    {
      id: 'management',
      title: '헬스장 계약 관리',
      description: '헬스장별 제휴 계약 기간과 만료 현황을 확인합니다.',
      to: '/fitb/management',
      icon: 'M',
    },
    {
      id: 'join',
      title: '신규 회원 가입/추가',
      description: '새로운 관리자·사장님·트레이너·회원 계정을 등록합니다.',
      to: '/join',
      icon: '+',
    },
  ],
  owner: [
    {
      id: 'promotion',
      title: '프로모션',
      description: '쿠폰 유형을 만들고 대상 회원에게 프로모션을 발송합니다.',
      to: '/fitb/promotion',
      icon: 'P',
    },
    {
      id: 'management',
      title: '회원/직원 관리',
      description: '트레이너 성과, 재등록 대상과 지점 일정을 확인합니다.',
      to: '/fitb/management',
      icon: 'M',
    },
    {
      id: 'attendance',
      title: '출석 키오스크',
      description: '헬스장 입구 태블릿용 출석 화면을 새 창으로 엽니다.',
      to: '/fitc/attendance',
      icon: 'A',
      external: true,
    },
  ],
  trainer: [
    {
      id: 'promotion',
      title: '프로모션',
      description: '회원 대상 쿠폰과 프로모션 발송 업무를 확인합니다.',
      to: '/fitb/promotion',
      icon: 'P',
    },
    {
      id: 'management',
      title: '회원/직원 관리',
      description: '담당 회원의 PT 출석, 일정과 잔여 세션을 관리합니다.',
      to: '/fitb/management',
      icon: 'M',
    },
  ],
};

export const getB2bHomeActions = (role) => {
  const normRole = normalizeRole(role);
  
  let core = CORE_HOME_ACTIONS;
  if (normRole === 'admin') {
    core = CORE_HOME_ACTIONS.filter((action) => !['item', 'dashboard'].includes(action.id));
  } else if (normRole === 'trainer') {
    core = CORE_HOME_ACTIONS.filter((action) => !['item', 'settle'].includes(action.id));
  }

  let extra = ROLE_HOME_ACTIONS[normRole] || [];
  if (normRole === 'trainer') {
    extra = extra.filter((action) => action.id !== 'promotion');
  }

  return [
    ...core,
    ...extra,
  ];
};

const PAGE_TITLE_RULES = [
  { test: /^\/fitb\/dashboard/, label: '대시보드' },
  { test: /^\/fitb\/b2bmanagement/, label: '회원 · 직원 관리' },
  { test: /^\/fitb\/ownermanagement/, label: '회원 관리' },
  { test: /^\/fitb\/contractpage/, label: '계약 관리' },
  { test: /^\/fitb\/contract\//, label: '계약 관리' },
  { test: /^\/fitb\/payment\//, label: '결제' },
  { test: /^\/fitb\/Settlepage/, label: '정산 · 매출' },
  { test: /^\/fitb\/itempage/, label: '물품 관리' },
  { test: /^\/fitb\/promotion/, label: '프로모션' },
  { test: /^\/fitb\/management/, label: '회원 · 직원 관리' },
  { test: /^\/fitb\/b2bmypage/, label: '마이페이지' },
  { test: /^\/fitb$/, label: 'Home' },
];

export const getB2bPageTitle = (pathname) => (
  PAGE_TITLE_RULES.find(({ test }) => test.test(pathname))?.label || '관리'
);

// 리스트(1Depth)에서 이동해 들어가는 드릴인 페이지 — 상단 유틸바 백버튼 노출 판정의 단일 원천.
// 계약 작성(/fitb/contract/new) · 계약 상세(/fitb/contract/:dataId) · 결제(/fitb/payment/:dataId)
// · PT 체험권 계약 대상 목록(/fitb/contractpage/trial, 계약 리스트 index는 매칭 제외)
const B2B_DETAIL_PAGE_RULES = [
  /^\/fitb\/contract\//,
  /^\/fitb\/payment\//,
  /^\/fitb\/contractpage\/trial/,
];

export const isB2bDetailPage = (pathname) => (
  B2B_DETAIL_PAGE_RULES.some((test) => test.test(pathname))
);
