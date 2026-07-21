import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AiChat from '../ai/AiChat.jsx';
import './B2bDrawer.css';

// 우측 통합 드로어 (추가 동선) - 리스트 행 클릭 시 'b2b-drawer-open' 커스텀 이벤트로 탭이 쌓인다.
// detail = { kind: 'contract'|'settle'|'item'|'ai', id, title, data? }
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

// settle/item 탭 하단 이동 버튼 메타
const KIND_LINK = {
  settle: { label: '정산 페이지 열기', path: '/fitb/Settlepage' },
  item: { label: '물품 페이지 열기', path: '/fitb/itempage' },
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

// kind='settle'/'item' 탭 본문: 이벤트로 전달된 행 객체의 key-value를 2열로 표시 (내부 객체/null 제외)
function DataTabContent({ kind, data, onOpenPage }) {
  const entries = Object.entries(data || {}).filter(
    ([, value]) => value !== null && value !== undefined && typeof value !== 'object',
  );
  const link = KIND_LINK[kind];

  return (
    <>
      <div className="b2b-drawer__fields">
        {entries.length === 0 ? (
          <p className="b2b-drawer__message">표시할 데이터가 없습니다.</p>
        ) : (
          <dl className="b2b-drawer__list">
            {entries.map(([key, value]) => (
              <div className="b2b-drawer__row" key={key}>
                <dt>{key}</dt>
                <dd>{String(value)}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {link && (
        <div className="b2b-drawer__footer">
          <button
            type="button"
            className="b2b-drawer__primary-btn"
            onClick={() => onOpenPage(link.path)}
          >
            {link.label}
          </button>
        </div>
      )}
    </>
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
                  ✕
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
                ∨
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
            ✕
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
              ) : (
                <DataTabContent kind={tab.kind} data={tab.data} onOpenPage={openPage} />
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default B2bDrawer;
