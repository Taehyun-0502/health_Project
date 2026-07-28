import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../settle/Pagination';
import NavIcon from '../components/uiIcons.jsx';
import './Contract.css';

// 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3=이용권, 4=PT, 5=PT 체험)
const CONTRACT_LABEL = {
  1: '제휴',
  2: '임금',
  3: '이용권',
  4: 'PT',
  5: 'PT 체험',
};

// 로그인 권한별 발행 가능한 계약서 버튼 목록
// ADMIN: 제휴 / OWNER: 임금·회원(이용권/PT 통합)·PT 체험(체험권 대상 목록 진입) / TRAINER·MEMBER: 발행 불가
// desc는 계약이 하나도 없을 때 보여주는 빈 상태 카드의 설명 문구(대시보드 KPI 카드 규격)
const CREATE_BUTTONS = {
  admin: [{
    to: '/fitb/contract/new?contract=1', label: '+ 제휴 계약서', title: '제휴 계약서 작성',
    desc: '체육관 사장님과 제휴 계약을 맺어요',
  }],
  owner: [
    {
      to: '/fitb/contract/new?contract=2', label: '+ 임금', title: '임금 계약서 작성',
      desc: '소속 트레이너와 임금 계약을 맺어요',
    },
    {
      to: '/fitb/contract/new?contract=3', label: '+ 회원', title: '회원 계약서 작성 (이용권/PT)',
      desc: '회원에게 이용권 또는 PT를 발행해요',
    },
    {
      to: '/fitb/contractpage/trial', label: '+ PT 체험', title: 'PT 체험 계약서 작성 (체험권 대상)',
      desc: '체험권을 받은 회원에게 발행해요',
    },
  ],
};

// '트레이너 구하기' 안내 팝업 (2026-07-22 확정 범위: 버튼+팝업만, 데이터 저장/API 호출 없음)
// 바깥 클릭·ESC로 닫힘. CSS 제거해도 열림/닫힘 동작은 유지된다(React state 기반).
function TrainerRecruitModal({ onClose }) {
  const boxRef = useRef(null);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const onBackdropClick = (e) => {
    if (boxRef.current && !boxRef.current.contains(e.target)) onClose();
  };

  return (
    <div className="contract-modal-back" onClick={onBackdropClick}>
      <div className="contract-modal" ref={boxRef} role="dialog" aria-modal="true" aria-label="트레이너 구하기">
        <h4 className="contract-modal__title">트레이너 구하기</h4>
        <p className="contract-modal__desc">
          관계사가 구직 중인 트레이너를 선별해 소개해 드리는 서비스입니다.
          준비 중인 기능으로, 도입 일정은 관계사에 문의해 주세요.
        </p>
        <div className="contract-modal__actions">
          <button type="button" className="contract-btn-primary" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}

// 로그인 권한별 계약서 리스트 페이지 (B2B 어드민, 디자인 제외 Plain 버전)
// 공통 칼럼: 계약 ID | 계약 유형 | 이름 | 상태 | 금액 | 시작일 | 종료일 | 발행일 | 갱신
// 검색: 이름 또는 username (돋보기/Enter 실행, 입력값 있을 때만 X 초기화 표시 - X는 검색어만 지움)
// 서버 페이징: GET /contract/list?page&pageSize&contract&keyword → { items, pager, totalCount, totalAmount }
function Contractpage() {
  const navigate = useNavigate();
  const [userList, setUserList] = useState([]);
  const [pager, setPager] = useState(null);
  const [typeFilter, setTypeFilter] = useState(0); // 계약 유형 필터 (0=전체 / 1~5)
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState(''); // 검색 입력값(검색창)
  const [appliedKeyword, setAppliedKeyword] = useState(''); // 실제 조회에 적용된 검색어
  const [message, setMessage] = useState('');
  const [hireModalOpen, setHireModalOpen] = useState(false); // '트레이너 구하기' 안내 팝업 (OWNER 전용)

  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isLoggedIn = !!localStorage.getItem('accessToken');
  const loginRole = loginUser?.role?.toLowerCase();
  const createButtons = CREATE_BUTTONS[loginRole] ?? [];
  const isOwner = loginRole === 'owner';

  // 권한별 계약 리스트 페이징 조회 (GET /contract/list)
  // signal: 언마운트·의존값 변경 시 진행 중인 fetch를 취소해 이탈 후 콘솔 노이즈(고아 오류 로그)를 막는다.
  const handleList = async (signal) => {
    setMessage('');

    // 미로그인은 별도 안내 문구 없이 빈 목록의 로그인 카드가 동선을 안내한다
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '10' });
      if (typeFilter) params.append('contract', String(typeFilter));
      if (appliedKeyword) params.append('keyword', appliedKeyword);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });

      if (response.ok) {
        const result = await response.json();
        setUserList(result.items || []);
        setPager(result.pager || null);
        setMessage('');
      } else {
        // 401(미로그인/토큰만료), 403(MEMBER 접근 차단) 등
        setUserList([]);
        setPager(null);
        setMessage(`조회 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      // 취소된 요청(AbortError)은 이탈에 따른 정상 취소이므로 오류로 취급하지 않는다.
      if (error.name === 'AbortError') return;
      console.error('리스트 조회 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 페이지·유형 필터·적용된 검색어가 바뀔 때마다 재조회 (언마운트/의존값 변경 시 이전 요청 취소)
  useEffect(() => {
    const controller = new AbortController();
    handleList(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, typeFilter, appliedKeyword]);

  // 유형 필터 칩 클릭 - 서버 재조회 + 1페이지로 리셋
  const changeTypeFilter = (type) => {
    setTypeFilter(type);
    setPage(1);
  };

  // 돋보기 클릭 / PC Enter / 모바일 키패드 Enter 모두 같은 검색 동작 - 1페이지로 리셋
  const runSearch = () => {
    setAppliedKeyword(keyword.trim());
    setPage(1);
  };

  // X 초기화: 검색어만 지우고 현재 유형 필터는 유지
  const clearSearch = () => {
    setKeyword('');
    setAppliedKeyword('');
    setPage(1);
  };

  // 상태 문자열 → 배지 클래스 (ACTIVE/SIGNED/ISSUED/TERMINATED/DRAFT, 미지원 값은 issued 톤)
  const badgeClass = (status) => {
    const key = String(status || '').toLowerCase();
    const known = ['active', 'signed', 'issued', 'terminated', 'draft'];
    return `contract-badge contract-badge--${known.includes(key) ? key : 'issued'}`;
  };

  // 행 클릭 = 우측 통합 드로어로 상세 열기 (계약서 상세 페이지 라우트는 그대로 유지 - 추가 동선)
  const openDrawer = (item) => {
    window.dispatchEvent(new CustomEvent('b2b-drawer-open', {
      detail: {
        kind: 'contract',
        id: item.dataId,
        title: `${item.member?.name ?? item.receiverName ?? '계약'} · ${CONTRACT_LABEL[item.contract] ?? ''}`.trim(),
      },
    }));
  };

  return (
    <div>
      {/* 페이지 헤더 (제목 + 안내 문구 + 주요 액션) — 리포트 페이지와 동일 시각 규격 */}
      <header className="contract-list-head">
        <div className="contract-list-head__main">
          <h2 className="contract-list-head__title">계약</h2>
          <p className="contract-list-head__desc">계약서를 조회하고 역할에 따라 신규 계약을 작성합니다.</p>
        </div>
        <div className="contract-list-head__actions">
          {/* 권한별 계약서 작성 버튼 (ADMIN=제휴 / OWNER=임금·회원·PT 체험) */}
          {createButtons.map((btn) => (
            <button key={btn.to} className="contract-btn-primary" title={btn.title} onClick={() => navigate(btn.to)}>
              {btn.label}
            </button>
          ))}

          {/* 트레이너 구하기 (OWNER 전용) - 2026-07-22 확정 범위: 버튼+안내 팝업만, 데이터 저장 없음 */}
          {isOwner && (
            <button
              type="button"
              className="contract-btn-secondary"
              title="트레이너 구하기"
              onClick={() => setHireModalOpen(true)}
            >
              트레이너 구하기
            </button>
          )}
        </div>
      </header>

      {/* 상단 액션 줄: 필터 칩(좌) + 검색(우) — 목업 기준 한 줄 배치 */}
      <div className="contract-toolbar">
        {/* 계약 유형 필터 탭 (전체/제휴/임금/이용권/PT/PT 체험) - 서버 페이징 전환으로 칩 건수 배지는 표시하지 않음 */}
        <div className="roster-filter">
          <button
            className={typeFilter === 0 ? 'roster-filter-btn active' : 'roster-filter-btn'}
            onClick={() => changeTypeFilter(0)}
          >
            전체
          </button>
          {[1, 2, 3, 4, 5].map((type) => (
            <button
              key={type}
              className={typeFilter === type ? 'roster-filter-btn active' : 'roster-filter-btn'}
              onClick={() => changeTypeFilter(type)}
            >
              {CONTRACT_LABEL[type]}
            </button>
          ))}
        </div>

        <div className="contract-toolbar__right">
          {/* 이름/username 검색 - 입력창 내부 X는 값이 있을 때만 표시 */}
          <div className="contract-search">
            <span className="contract-search__box">
              {/* 돋보기 클릭 · Enter 모두 같은 검색 동작 */}
              <button type="button" className="contract-search__icon" title="검색" onClick={runSearch}>
                <NavIcon id="search" size={16} />
              </button>
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                placeholder="이름 · 아이디 검색"
                enterKeyHint="search"
              />
              {keyword !== '' && (
                <button
                  type="button"
                  className="contract-search__clear"
                  title="검색어 지우기"
                  onClick={clearSearch}
                >
                  <NavIcon id="close" size={16} />
                </button>
              )}
            </span>
          </div>
        </div>
      </div>

      {hireModalOpen && <TrainerRecruitModal onClose={() => setHireModalOpen(false)} />}

      {/* 조회 상태·오류 안내 (401/403 등) */}
      {message && <p className="contract-message">{message}</p>}

      {/* 공통 리스트 칼럼: 계약 ID | 계약 유형 | 이름 | 상태 | 금액 | 시작일 | 종료일 | 발행일 | 갱신 */}
      <div className="contract-table-card">
        <table className="contract-table">
          <thead>
            <tr>
              <th>계약 ID</th>
              <th>계약 유형</th>
              <th>이름</th>
              <th>상태</th>
              <th>금액(원)</th>
              <th>시작일</th>
              <th>종료일</th>
              <th>발행일</th>
              <th>갱신</th>
            </tr>
          </thead>
          <tbody>
            {userList.length === 0 && (
              <tr className="contract-table__empty-row">
                <td colSpan="9" className="contract-table__empty">
                  <p className="contract-empty__msg">
                    {isLoggedIn ? '조건에 해당하는 계약이 없어요.' : '로그인하면 계약서를 볼 수 있어요.'}
                  </p>
                  {/* 미로그인은 로그인 카드 하나, 로그인 상태면 발행 권한이 있는 역할에만
                      버튼 개수만큼 카드를 노출한다(TRAINER는 발행 권한이 없어 문구만 남는다) */}
                  {!isLoggedIn ? (
                    <div className="contract-empty__grid">
                      <button
                        type="button"
                        className="contract-empty__card"
                        onClick={() => navigate('/login')}
                      >
                        <span className="contract-empty__card-label">로그인</span>
                        <span className="contract-empty__card-desc">로그인 후 이용할 수 있어요</span>
                      </button>
                    </div>
                  ) : createButtons.length > 0 && (
                    <div className="contract-empty__grid">
                      {createButtons.map((btn) => (
                        <button
                          key={btn.to}
                          type="button"
                          className="contract-empty__card"
                          title={btn.title}
                          onClick={() => navigate(btn.to)}
                        >
                          <span className="contract-empty__card-label">{btn.label}</span>
                          <span className="contract-empty__card-desc">{btn.desc}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            )}
            {userList.map((item) => (
              // 행 클릭 = 우측 통합 드로어에 계약 탭 추가 (기존 버튼 동선은 stopPropagation으로 유지)
              <tr key={item.dataId} className="contract-table__row" onClick={() => openDrawer(item)}>
                <td>
                  <button className="contract-table__id" onClick={(e) => { e.stopPropagation(); navigate(`/fitb/contract/${item.dataId}`); }}>{item.dataId}</button>
                </td>
                <td className="contract-table__muted">{CONTRACT_LABEL[item.contract] ?? item.contract}</td>
                <td className="contract-table__name">{item.member?.name ?? item.receiverName}</td>
                <td><span className={badgeClass(item.status)}>{item.status}</span></td>
                {/* 제휴(1)는 amount가 없어 수수료율(contractRate)을 % 표시 */}
                <td>{item.contract === 1 ? (item.contractRate != null ? `${item.contractRate}%` : '') : (item.amount == null ? '' : Number(item.amount).toLocaleString('ko-KR'))}</td>
                <td className="contract-table__muted">{item.startDate}</td>
                <td className="contract-table__muted">{item.endDate}</td>
                <td className="contract-table__muted">{item.issueDate}</td>
                <td>
                  {/* 갱신: 재계약(previous) 또는 연계(related) 이력이 있으면 해당 계약으로 이동 */}
                  {item.previousDataId && (
                    <button className="contract-renew-link" onClick={(e) => { e.stopPropagation(); navigate(`/fitb/contract/${item.previousDataId}`); }}>
                      재계약 #{item.previousDataId}
                    </button>
                  )}
                  {item.relatedDataId && (
                    <button className="contract-renew-link" onClick={(e) => { e.stopPropagation(); navigate(`/fitb/contract/${item.relatedDataId}`); }}>
                      연계 #{item.relatedDataId}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination pager={pager} onPageChange={setPage} />
    </div>
  );
}

export default Contractpage;
