import { useState, useEffect, useCallback } from 'react';

// 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3=이용권, 4=PT)
const CONTRACT_LABEL = {
  1: '제휴 계약서',
  2: '임금 계약서',
  3: '이용권 계약서',
  4: 'PT 이용권 계약서',
};

// 남은 계약 기간(D-Day) 계산 - endDate 기준 (음수면 만료)
// 'YYYY-MM-DD'를 그대로 new Date()에 넣으면 UTC 자정으로 파싱돼 KST에서 하루 밀리므로 로컬 자정으로 고정
const calcDday = (endDate) => {
  if (!endDate) return null;
  const today = new Date(new Date().toDateString()); // 시각 제거(로컬 자정 기준)
  const end = new Date(`${endDate}T00:00:00`); // 로컬 자정으로 파싱
  return Math.round((end - today) / 86400000);
};

// D-Day 표시 문자열 (만료/D-0/D-n)
const ddayLabel = (endDate) => {
  const dday = calcDday(endDate);
  if (dday === null) return '-';
  return dday < 0 ? '만료' : `D-${dday}`;
};

// 역할별 리스트/로스터 페이지 (GET /contract/roster, 디자인 제외 Plain 버전)
// ADMIN: 제휴 매장 리스트(D-Day) -> 매장 선택 시 소속 트레이너·회원 명단
// OWNER: 소속 트레이너·회원 명단 + 계약 기간 / TRAINER: 담당 PT 회원 명단 + 계약 기간
function RosterPage() {
  const [rows, setRows] = useState([]);
  const [selectedGym, setSelectedGym] = useState(null); // ADMIN 매장 선택 상태 (null=매장 리스트 뷰)
  const [roleFilter, setRoleFilter] = useState(''); // 명단 역할 필터 (''=전체 / trainer / member)
  const [message, setMessage] = useState('');

  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const role = loginUser?.role?.toUpperCase();
  const isAdmin = role === 'ADMIN';

  // 로스터 조회 (ADMIN은 gymId 유무로 매장 리스트/매장별 명단 분기)
  const loadRoster = useCallback(async (gymId) => {
    setMessage('');
    setRows([]);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다. 먼저 로그인해 주세요.');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (gymId != null) params.append('gymId', gymId);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/roster?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setRows(result);
        setMessage(`조회 성공: ${result.length}건`);
      } else {
        // 401(미로그인/토큰만료), 403(MEMBER 접근 차단) 등
        setMessage(`조회 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      console.error('로스터 조회 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  }, []);

  // 진입 시 자동 조회 (ADMIN=제휴 매장 리스트, OWNER/TRAINER=소속·담당 명단)
  useEffect(() => {
    loadRoster(null);
  }, [loadRoster]);

  // ADMIN 매장 선택 -> 해당 매장 소속 명단 조회 (역할 필터는 전체로 초기화)
  const handleSelectGym = (row) => {
    setSelectedGym({ gymId: row.gymId, gymName: row.gymName });
    setRoleFilter('');
    loadRoster(row.gymId);
  };

  // ADMIN 매장 리스트로 복귀
  const handleBackToGyms = () => {
    setSelectedGym(null);
    setRoleFilter('');
    loadRoster(null);
  };

  // ADMIN 매장 리스트 뷰 (제휴 계약 1 기준, 남은 계약 기간 D-Day)
  const renderGymList = () => (
    <table border="1">
      <thead>
        <tr>
          <th>매장ID</th>
          <th>매장명</th>
          <th>사장님</th>
          <th>계약 상태</th>
          <th>계약기간</th>
          <th>남은 기간</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((item) => (
          <tr key={item.dataId}>
            <td>{item.gymId ?? '-'}</td>
            <td>
              <button onClick={() => handleSelectGym(item)} disabled={item.gymId == null}>
                {item.gymName ?? '(매장 미연결)'}
              </button>
            </td>
            <td>{item.member?.name ?? item.receiverName}</td>
            <td>{item.status}</td>
            <td>{item.startDate} ~ {item.endDate}</td>
            <td>{ddayLabel(item.endDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 명단 뷰 (ADMIN 매장 선택 후 / OWNER 소속 / TRAINER 담당)
  // OWNER·ADMIN 명단은 트레이너·회원이 섞여 있어 역할 필터 버튼으로 구분 조회
  // (TRAINER의 담당 명단은 회원뿐이라 필터 미노출)
  const rosterRole = (item) => item.member?.role?.toLowerCase();
  const trainerCount = rows.filter((item) => rosterRole(item) === 'trainer').length;
  const memberCount = rows.filter((item) => rosterRole(item) === 'member').length;
  const filteredRows = roleFilter ? rows.filter((item) => rosterRole(item) === roleFilter) : rows;

  const renderRoleFilter = () => (
    <div className="roster-filter">
      <button
        className={roleFilter === '' ? 'roster-filter-btn active' : 'roster-filter-btn'}
        onClick={() => setRoleFilter('')}
      >
        전체 ({rows.length})
      </button>
      <button
        className={roleFilter === 'trainer' ? 'roster-filter-btn active' : 'roster-filter-btn'}
        onClick={() => setRoleFilter('trainer')}
      >
        트레이너 ({trainerCount})
      </button>
      <button
        className={roleFilter === 'member' ? 'roster-filter-btn active' : 'roster-filter-btn'}
        onClick={() => setRoleFilter('member')}
      >
        회원 ({memberCount})
      </button>
    </div>
  );

  const renderRoster = () => (
    <table border="1">
      <thead>
        <tr>
          <th>아이디(연락처)</th>
          <th>이름</th>
          <th>역할</th>
          <th>계약유형</th>
          <th>계약 상태</th>
          <th>계약기간</th>
          <th>남은 기간</th>
        </tr>
      </thead>
      <tbody>
        {filteredRows.map((item) => (
          <tr key={item.member?.username ?? item.receiverId ?? item.dataId}>
            <td>{item.member?.username ?? item.receiverId ?? '(미가입)'}</td>
            <td>{item.member?.name ?? item.receiverName}</td>
            <td>{item.member?.role ?? '(미가입)'}</td>
            <td>{item.contract ? (CONTRACT_LABEL[item.contract] ?? item.contract) : '(계약 없음)'}</td>
            <td>{item.status ?? '-'}</td>
            <td>{item.startDate ? `${item.startDate} ~ ${item.endDate}` : '-'}</td>
            <td>{ddayLabel(item.endDate)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div>
      <h1>계약 명단 (역할별 로스터)</h1>
      <p>
        로그인 사용자: {loginUser ? `${loginUser.name} (${loginUser.role})` : '없음'}
      </p>
      <p>{message}</p>

      {/* ADMIN 매장 선택 상태 표시 + 복귀 버튼 */}
      {isAdmin && selectedGym && (
        <p>
          <button onClick={handleBackToGyms}>← 매장 리스트로</button>{' '}
          <strong>{selectedGym.gymName ?? `매장 ${selectedGym.gymId}`}</strong> 소속 명단
        </p>
      )}

      {isAdmin && !selectedGym ? (
        renderGymList()
      ) : (
        <>
          {/* OWNER 소속 명단·ADMIN 매장별 명단은 트레이너·회원 혼합이라 구분 필터 노출 (TRAINER는 회원만이라 제외) */}
          {role !== 'TRAINER' && renderRoleFilter()}
          {renderRoster()}
        </>
      )}
    </div>
  );
}

export default RosterPage;
