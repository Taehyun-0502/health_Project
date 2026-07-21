import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
const CREATE_BUTTONS = {
  admin: [{ to: '/fitb/contract/new?contract=1', label: '제휴 계약서 작성' }],
  owner: [
    { to: '/fitb/contract/new?contract=2', label: '임금 계약서 작성' },
    { to: '/fitb/contract/new?contract=3', label: '회원 계약서 작성 (이용권/PT)' },
    { to: '/fitb/contractpage/trial', label: 'PT 체험 계약서 작성 (체험권 대상)' },
  ],
};

// 로그인 권한별 계약서 리스트 페이지 (B2B 어드민, 디자인 제외 Plain 버전)
// 공통 칼럼: 계약 ID | 계약 유형 | 이름 | 상태 | 금액 | 시작일 | 종료일 | 발행일 | 갱신
// 검색: 이름 또는 username (돋보기/Enter 실행, 입력값 있을 때만 X 초기화 표시 - X는 검색어만 지움)
function Contractpage() {
  const navigate = useNavigate();
  const [userList, setUserList] = useState([]);
  const [typeFilter, setTypeFilter] = useState(0); // 계약 유형 필터 (0=전체 / 1~5)
  const [keyword, setKeyword] = useState(''); // 검색 입력값
  const [message, setMessage] = useState('');

  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const createButtons = CREATE_BUTTONS[loginUser?.role?.toLowerCase()] ?? [];

  // 권한별 계약 리스트 조회 (GET /contract/list, 검색어는 서버 keyword 파라미터로 전달)
  const handleList = async (searchWord) => {
    setMessage('');

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다. 먼저 로그인해 주세요.');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (searchWord) params.append('keyword', searchWord);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setUserList(result);
        setMessage(`조회 성공: ${result.length}건`);
      } else {
        // 401(미로그인/토큰만료), 403(MEMBER 접근 차단) 등
        setMessage(`조회 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      console.error('리스트 조회 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 진입 시 전체 조회
  useEffect(() => {
    handleList('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 돋보기 클릭 / PC Enter / 모바일 키패드 Enter 모두 같은 검색 동작
  const runSearch = () => handleList(keyword.trim());

  // X 초기화: 검색어만 지우고 현재 유형 필터는 유지
  const clearSearch = () => {
    setKeyword('');
    handleList('');
  };

  // 유형 탭 필터링 (건수 표시, 클라이언트 구분 조회)
  const typeCount = (type) => userList.filter((item) => item.contract === type).length;
  const filteredList = typeFilter ? userList.filter((item) => item.contract === typeFilter) : userList;

  // 상태 문자열 → 배지 클래스 (ACTIVE/SIGNED/ISSUED/TERMINATED/DRAFT, 미지원 값은 issued 톤)
  const badgeClass = (status) => {
    const key = String(status || '').toLowerCase();
    const known = ['active', 'signed', 'issued', 'terminated', 'draft'];
    return `contract-badge contract-badge--${known.includes(key) ? key : 'issued'}`;
  };

  return (
    <div>
      {/* 페이지 헤더: 조회 상태 문구 + 권한별 계약서 작성 버튼 */}
      <div className="contract-pagehead">
        <p className="contract-pagehead__meta">
          로그인 사용자: {loginUser ? `${loginUser.name} (${loginUser.role})` : '없음'}
          {message && <><br />{message}</>}
        </p>
        <div className="contract-pagehead__actions">
          {createButtons.map((btn) => (
            <button key={btn.to} className="contract-btn-primary" onClick={() => navigate(btn.to)}>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* 계약 유형 필터 탭 (전체/제휴/임금/이용권/PT/PT 체험, 건수 표시) */}
      <div className="roster-filter">
        <button
          className={typeFilter === 0 ? 'roster-filter-btn active' : 'roster-filter-btn'}
          onClick={() => setTypeFilter(0)}
        >
          전체 ({userList.length})
        </button>
        {[1, 2, 3, 4, 5].map((type) => (
          <button
            key={type}
            className={typeFilter === type ? 'roster-filter-btn active' : 'roster-filter-btn'}
            onClick={() => setTypeFilter(type)}
          >
            {CONTRACT_LABEL[type]} ({typeCount(type)})
          </button>
        ))}
      </div>

      {/* 이름/username 검색 - 입력창 내부 X는 값이 있을 때만 표시 */}
      <div className="contract-search">
        <span className="contract-search__box">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
            placeholder="이름 또는 아이디 검색"
            enterKeyHint="search"
          />
          {keyword !== '' && (
            <button
              type="button"
              className="contract-search__clear"
              title="검색어 지우기"
              onClick={clearSearch}
            >
              ✕
            </button>
          )}
        </span>
        <button type="button" className="contract-search__run" title="검색" onClick={runSearch}>🔍</button>
      </div>

      {/* 공통 리스트 칼럼: 계약 ID | 계약 유형 | 이름 | 상태 | 금액 | 시작일 | 종료일 | 발행일 | 갱신 */}
      <div className="contract-table-card">
        <table className="contract-table">
          <thead>
            <tr>
              <th>계약 ID</th>
              <th>계약 유형</th>
              <th>이름</th>
              <th>상태</th>
              <th>금액(만원)</th>
              <th>시작일</th>
              <th>종료일</th>
              <th>발행일</th>
              <th>갱신</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((item) => (
              // 행 클릭 = 우측 통합 드로어에 계약 탭 추가 (기존 버튼 동선은 stopPropagation으로 유지)
              <tr
                key={item.dataId}
                style={{ cursor: 'pointer' }}
                onClick={() =>
                  window.dispatchEvent(new CustomEvent('b2b-drawer-open', {
                    detail: { kind: 'contract', id: item.dataId, title: item.member?.name ?? item.receiverName ?? '계약' },
                  }))
                }
              >
                <td>
                  <button className="contract-table__id" onClick={(e) => { e.stopPropagation(); navigate(`/fitb/contract/${item.dataId}`); }}>{item.dataId}</button>
                </td>
                <td>{CONTRACT_LABEL[item.contract] ?? item.contract}</td>
                <td>{item.member?.name ?? item.receiverName}</td>
                <td><span className={badgeClass(item.status)}>{item.status}</span></td>
                {/* 제휴(1)는 amount가 없어 수수료율(contractRate)을 % 표시 */}
                <td>{item.contract === 1 ? (item.contractRate != null ? `${item.contractRate}%` : '') : item.amount}</td>
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
    </div>
  );
}

export default Contractpage;
