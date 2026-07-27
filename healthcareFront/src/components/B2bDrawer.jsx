import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiChat from '../ai/AiChat.jsx';
import { FactorDetailLoader, RiskMembersPanel } from '../report/Report.jsx';
import NavIcon from './uiIcons.jsx';
import './B2bDrawer.css';

// 우측 통합 드로어 (추가 동선) - 리스트 행 클릭 시 'b2b-drawer-open' 커스텀 이벤트로 탭이 쌓인다.
// detail = { kind: 'contract'|'settle'|'expense'|'item'|'ai', id, title, data? }
// 같은 kind+id 탭은 중복 생성 없이 활성화만 전환. 바깥 클릭 = 접힘(탭 보존), ✕ = 전체 닫기.
// AI 비서(2026-07-21 기획서)도 같은 드로어의 한 탭으로 편입되며, 탭 상태는 'b2b-drawer-state'로 방송한다.

const CONTRACT_LABEL = { 1: '제휴', 2: '임금', 3: '이용권', 4: 'PT', 5: 'PT 체험' };

// 상태 pill 배지 톤 (미지원 값은 issued 톤으로 폴백)
const STATUS_BADGE = {
  ACTIVE: 'b2b-drawer__badge--active',
  SIGNED: 'b2b-drawer__badge--signed',
  ISSUED: 'b2b-drawer__badge--issued',
  TERMINATED: 'b2b-drawer__badge--terminated',
};

// settle/item 탭에는 하단 이동 버튼을 두지 않는다 — 드로어를 연 페이지와 목적지가 같아 이동 의미가 없음

// 값 포맷터: null 반환 = 해당 행 생략
const won = (value) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(value);
const fmtId = (value) => `#${value}`;
const fmtWon = (value) => won(value);
const fmtDiscount = (value) => (value > 0 ? `−${won(value)}` : null);
const fmtInstallment = (value) => (Number(value) === 0 ? '일시불' : `${value}개월 할부`);
const fmtRate = (value) => (Number(value) > 0 ? `${(Number(value) * 100).toFixed(0)}%` : null);

// kind별 표시 필드 메타 — 이 순서대로 렌더하며 응답 키 순서에 의존하지 않는다.
// tone: 'strong'(금액 강조) | 'danger'(지출·할인), hidden: 화면에 의미 없는 내부 키(라벨 없이 노출 방지)
const DATA_FIELDS = {
  settle: {
    fields: [
      { key: 'payId', label: '결제 ID', format: fmtId },
      { key: 'dataId', label: '계약 ID', format: fmtId },
      { key: 'username', label: '회원 연락처' },
      { key: 'payName', label: '결제 항목' },
      { key: 'payPrice', label: '결제 금액', format: fmtWon, tone: 'strong' },
      { key: 'couponName', label: '사용 쿠폰' },
      { key: 'discountAmount', label: '할인 금액', format: fmtDiscount, tone: 'danger' },
      { key: 'installment', label: '결제 방법', format: fmtInstallment },
      { key: 'payDate', label: '결제일', tone: 'num' },
    ],
    hidden: ['gymId', 'couponId'],
  },
  expense: {
    fields: [
      { key: 'expenseId', label: '지출 ID', format: fmtId },
      { key: 'expenseName', label: '지출 항목' },
      { key: 'expensePrice', label: '지출 금액', format: fmtWon, tone: 'danger' },
      { key: 'expenseDate', label: '결제일', tone: 'num' },
      { key: 'expenseRate', label: '수수료·인센 비율', format: fmtRate },
      { key: 'dataId', label: '계약 ID', format: fmtId },
      { key: 'settlementId', label: '커미션 정산 ID', format: fmtId },
      { key: 'originItemId', label: '물품 등록 ID', format: fmtId },
    ],
    hidden: ['gymId'],
  },
  item: {
    fields: [
      { key: 'itemId', label: '물품 ID', format: fmtId },
      { key: 'itemCategory', label: '분류' },
      { key: 'itemName', label: '물품명' },
      { key: 'itemCount', label: '수량' },
      { key: 'itemPrice', label: '금액', format: fmtWon, tone: 'strong' },
      { key: 'itemDate', label: '등록일', tone: 'num' },
      { key: 'itemStatus', label: '상태' },
      { key: 'itemExpiryDate', label: '유효기간', tone: 'num' },
    ],
    hidden: ['gymId'],
  },
};

// 메타 순서대로 정리한 뒤, 메타에 없는 키는 원시 키 그대로 뒤에 붙인다(DTO 필드 추가 시 누락 방지)
const buildRows = (kind, data) => {
  const source = data || {};
  const meta = DATA_FIELDS[kind] ?? { fields: [], hidden: [] };
  const rows = [];

  meta.fields.forEach(({ key, label, format, tone }) => {
    const value = source[key];
    if (value === null || value === undefined || value === '') return;
    const text = format ? format(value) : String(value);
    if (text === null || text === undefined) return;
    rows.push({ key, label, text, tone });
  });

  const known = new Set([...meta.fields.map((f) => f.key), ...meta.hidden]);
  Object.entries(source).forEach(([key, value]) => {
    if (known.has(key)) return;
    if (value === null || value === undefined || typeof value === 'object') return;
    rows.push({ key, label: key, text: String(value) });
  });

  return rows;
};

const DEFAULT_WIDTH = 440;
const MIN_WIDTH = 360;
const LNB_WIDTH = 248;

// 최대 폭: LNB(248px)를 덮지 않는 범위 안에서 1080px까지
const getMaxWidth = () => Math.min(1080, window.innerWidth - LNB_WIDTH - 48);
const clampWidth = (w) => Math.max(MIN_WIDTH, Math.min(getMaxWidth(), w));

// kind='contract' 탭 본문: 마운트 시 계약 상세를 조회해 라벨/값 2열로 표시
function ContractTabContent({ id, onOpenPage }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      setDetail(null);
      setError('');
      try {
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/detail/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          if (!ignore) setError(`상세를 불러올 수 없습니다(${response.status})`);
          return;
        }
        const data = await response.json();
        if (!ignore) setDetail(data);
      } catch {
        if (!ignore) setError('상세를 불러올 수 없습니다(통신 오류)');
      }
    };
    load();
    return () => { ignore = true; };
  }, [id]);

  // 제휴(1)는 amount가 없어 수수료율(contractRate)을 % 표시
  const amountText = detail
    ? (detail.contract === 1
      ? (detail.contractRate != null ? `${detail.contractRate}%` : '-')
      : (detail.amount != null ? `${detail.amount}만원` : '-'))
    : '';

  return (
    <>
      <div className="b2b-drawer__fields">
        {error ? (
          <p className="b2b-drawer__message">{error}</p>
        ) : !detail ? (
          <p className="b2b-drawer__message">불러오는 중...</p>
        ) : (
          <dl className="b2b-drawer__list">
            <div className="b2b-drawer__row"><dt>계약 ID</dt><dd>{detail.dataId}</dd></div>
            <div className="b2b-drawer__row"><dt>계약 유형</dt><dd>{CONTRACT_LABEL[detail.contract] ?? detail.contract}</dd></div>
            <div className="b2b-drawer__row"><dt>이름</dt><dd>{detail.member?.name ?? detail.receiverName ?? '-'}</dd></div>
            <div className="b2b-drawer__row">
              <dt>상태</dt>
              <dd>
                <span className={`b2b-drawer__badge ${STATUS_BADGE[detail.status] ?? 'b2b-drawer__badge--issued'}`}>
                  {detail.status}
                </span>
              </dd>
            </div>
            <div className="b2b-drawer__row"><dt>금액</dt><dd>{amountText}</dd></div>
            <div className="b2b-drawer__row"><dt>시작일</dt><dd>{detail.startDate ?? '-'}</dd></div>
            <div className="b2b-drawer__row"><dt>종료일</dt><dd>{detail.endDate ?? '-'}</dd></div>
            <div className="b2b-drawer__row"><dt>발행일</dt><dd>{detail.issueDate ?? '-'}</dd></div>
          </dl>
        )}
      </div>
      <div className="b2b-drawer__footer">
        <button
          type="button"
          className="b2b-drawer__primary-btn"
          onClick={() => onOpenPage(`/fitb/contract/${id}`)}
        >
          계약서 상세 열기
        </button>
      </div>
    </>
  );
}

// kind='settle'/'expense'/'item' 탭 본문: 이벤트로 전달된 행 객체를 한글 라벨 2열로 표시
function DataTabContent({ kind, data }) {
  const rows = buildRows(kind, data);

  return (
    <div className="b2b-drawer__fields">
      {rows.length === 0 ? (
        <p className="b2b-drawer__message">표시할 데이터가 없습니다.</p>
      ) : (
        <dl className="b2b-drawer__list">
          {rows.map((row) => (
            <div className="b2b-drawer__row" key={row.key}>
              <dt>{row.label}</dt>
              <dd className={row.tone ? `b2b-drawer__value--${row.tone}` : undefined}>{row.text}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

function B2bDrawer() {
  const navigate = useNavigate();
  const [tabs, setTabs] = useState([]); // { key, kind, id, title, data }
  const [activeKey, setActiveKey] = useState(null);
  const [collapsed, setCollapsed] = useState(false); // 접힘(탭 상태는 보존)
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const rootRef = useRef(null);
  const tabListRef = useRef(null);
  const dropdownRef = useRef(null);
  const dragRef = useRef(null);

  // 'b2b-drawer-open' 수신: 같은 kind+id면 활성화만, 새 탭이면 끝에 추가 + 활성화 + 펼침
  useEffect(() => {
    const onOpen = (event) => {
      const { kind, id, title, data } = event.detail || {};
      if (!kind || id === undefined || id === null) return;
      const key = `${kind}:${id}`;
      setTabs((prev) => {
        if (prev.some((tab) => tab.key === key)) return prev;
        return [...prev, { key, kind, id, title: title || `${kind} ${id}`, data }];
      });
      setActiveKey(key);
      setCollapsed(false);
    };
    window.addEventListener('b2b-drawer-open', onOpen);
    return () => window.removeEventListener('b2b-drawer-open', onOpen);
  }, []);

  // 바깥 클릭 = 접힘(탭 보존). 드로어 내부 클릭은 무시하되 드롭다운 밖이면 드롭다운만 닫음
  useEffect(() => {
    const onDocMouseDown = (event) => {
      if (rootRef.current && rootRef.current.contains(event.target)) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setDropdownOpen(false);
        }
        return;
      }
      setCollapsed(true);
      setDropdownOpen(false);
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  // 드로어 상태 방송 - AI 입력바 노출 규칙(AI 탭 활성 + 펼침일 때만 숨김)에 사용
  useEffect(() => {
    const activeKind = tabs.find((tab) => tab.key === activeKey)?.kind ?? null;
    window.dispatchEvent(new CustomEvent('b2b-drawer-state', {
      detail: { activeKind, collapsed: collapsed || tabs.length === 0 },
    }));
  }, [tabs, activeKey, collapsed]);

  // 탭바 오버플로우 감지 → 넘칠 때만 드롭다운(∨) 버튼 노출
  useLayoutEffect(() => {
    const el = tabListRef.current;
    setHasOverflow(el ? el.scrollWidth > el.clientWidth + 1 : false);
  }, [tabs, width, collapsed]);

  // 좌측 가장자리 핸들 드래그로 폭 조절 (min 360 / max = LNB 미침범 범위)
  const handleResizeStart = (event) => {
    event.preventDefault();
    dragRef.current = { startX: event.clientX, startWidth: width };
    const onMove = (e) => {
      if (!dragRef.current) return;
      setWidth(clampWidth(dragRef.current.startWidth + (dragRef.current.startX - e.clientX)));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  // 개별 탭 닫기: 활성 탭이 닫히면 인접 탭 활성화, 마지막 탭이 닫히면 드로어 닫힘
  const closeTab = (key) => {
    setDropdownOpen(false);
    const index = tabs.findIndex((tab) => tab.key === key);
    if (index < 0) return;
    const next = tabs.filter((tab) => tab.key !== key);
    if (key === activeKey) {
      const neighbor = next[index] ?? next[index - 1] ?? null;
      setActiveKey(neighbor ? neighbor.key : null);
    }
    setTabs(next);
  };

  // ✕ = 모든 탭 제거 + 드로어 닫기
  const closeAll = () => {
    setTabs([]);
    setActiveKey(null);
    setDropdownOpen(false);
    setCollapsed(false);
  };

  // 하단 버튼: 해당 페이지로 이동 + 드로어 접기(탭 보존)
  const openPage = (path) => {
    setCollapsed(true);
    setDropdownOpen(false);
    navigate(path);
  };

  if (tabs.length === 0) return null;

  return (
    <aside
      ref={rootRef}
      className="b2b-drawer"
      // 접힘은 인라인 style로 처리해 CSS 파일과 무관하게 동작 (탭 컴포넌트는 마운트 유지 → 재펼침 시 복원)
      style={{ width: `${width}px`, display: collapsed ? 'none' : undefined }}
      aria-label="통합 드로어"
    >
      {/* 좌측 크기 조절 핸들 */}
      <div
        className="b2b-drawer__resize-handle"
        onMouseDown={handleResizeStart}
        role="separator"
        aria-orientation="vertical"
        aria-label="드로어 폭 조절"
      >
        <span className="b2b-drawer__resize-bar" />
      </div>

      <div className="b2b-drawer__inner">
        {/* 탭바: 가로 스크롤(스크롤바 숨김) + 오버플로우 시 ∨ 드롭다운 + 전체 닫기 ✕ */}
        <div className="b2b-drawer__tabbar">
          <div className="b2b-drawer__tabs" ref={tabListRef} role="tablist">
            {tabs.map((tab) => (
              <div
                key={tab.key}
                role="tab"
                tabIndex={0}
                aria-selected={tab.key === activeKey}
                className={`b2b-drawer__tab${tab.key === activeKey ? ' b2b-drawer__tab--active' : ''}`}
                onClick={() => setActiveKey(tab.key)}
                onKeyDown={(e) => { if (e.key === 'Enter') setActiveKey(tab.key); }}
              >
                <span className="b2b-drawer__tab-label" title={tab.title}>{tab.title}</span>
                <button
                  type="button"
                  className="b2b-drawer__tab-close"
                  title="탭 닫기"
                  onClick={(e) => { e.stopPropagation(); closeTab(tab.key); }}
                >
                  <NavIcon id="close" size={14} />
                </button>
              </div>
            ))}
          </div>

          {hasOverflow && (
            <div className="b2b-drawer__dropdown" ref={dropdownRef}>
              <button
                type="button"
                className="b2b-drawer__icon-btn"
                title="열린 탭 목록"
                onClick={() => setDropdownOpen((open) => !open)}
              >
                <NavIcon id="chevron" size={16} className="ui-icon ui-icon--down" />
              </button>
              {dropdownOpen && (
                <ul className="b2b-drawer__dropdown-list">
                  {tabs.map((tab) => (
                    <li key={tab.key}>
                      <button
                        type="button"
                        className={`b2b-drawer__dropdown-item${tab.key === activeKey ? ' b2b-drawer__dropdown-item--active' : ''}`}
                        onClick={() => { setActiveKey(tab.key); setDropdownOpen(false); }}
                      >
                        {tab.title}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <button
            type="button"
            className="b2b-drawer__icon-btn"
            title="모두 닫기"
            onClick={closeAll}
          >
            <NavIcon id="close" size={18} />
          </button>
        </div>

        {/* 본문: 탭별 콘텐츠 (비활성 탭은 인라인 display:none으로 마운트 유지 → 재조회 없이 전환) */}
        <div className="b2b-drawer__body">
          {tabs.map((tab) => (
            <div
              key={tab.key}
              className="b2b-drawer__panel"
              style={{ display: tab.key === activeKey ? undefined : 'none' }}
            >
              {tab.kind === 'ai' ? (
                <AiChat onNavigate={openPage} />
              ) : tab.kind === 'contract' ? (
                <ContractTabContent id={tab.id} onOpenPage={openPage} />
              ) : tab.kind === 'report' ? (
                <FactorDetailLoader
                  statKey={tab.data?.statKey}
                  gymId={tab.data?.gymId}
                  mode={tab.data?.mode}
                  period={tab.data?.period}
                />
              ) : tab.kind === 'riskmembers' ? (
                <RiskMembersPanel data={tab.data} />
              ) : (
                <DataTabContent kind={tab.kind} data={tab.data} />
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default B2bDrawer;
