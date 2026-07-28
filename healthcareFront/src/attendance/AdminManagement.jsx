import { useCallback, useEffect, useMemo, useState } from 'react';
import NavIcon from '../components/uiIcons.jsx';
import usePageHeaderAction from '../hooks/usePageHeaderAction.js';
import './AdminManagement.css';

const DAY_MS = 24 * 60 * 60 * 1000;

const calcDaysLeft = (endDate) => {
  if (!endDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end - today) / DAY_MS);
};

// 만료까지 남은 기간을 라벨 + 심각도 level로 변환한다.
// 색상은 CSS(.admin-management__badge--{level})가 담당하고, JSX는 데이터 파생 값만 계산한다.
// (색을 못 봐도 라벨 텍스트로 상태를 알 수 있게 label을 함께 제공)
const getExpiryMeta = (endDate) => {
  const daysLeft = calcDaysLeft(endDate);

  if (daysLeft === null) return { label: '기간 미정', level: 'none' };
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}일 경과`, level: 'expired' };
  if (daysLeft === 0) return { label: '오늘 만료', level: 'expired' };
  if (daysLeft <= 30) return { label: `D-${daysLeft}`, level: 'soon' };
  if (daysLeft <= 90) return { label: `D-${daysLeft}`, level: 'watch' };
  return { label: `D-${daysLeft}`, level: 'normal' };
};

const STATUS_LABEL = {
  DRAFT: '작성 중',
  ISSUED: '서명 대기',
  SIGNED: '계약 중',
  EXPIRED: '만료',
  ACTIVE: '이용 중',
  TERMINATED: '종료',
};

// 계약 유형 코드(1=제휴, 2=임금, 3=이용권, 4=PT, 5=PT 체험) 표시 라벨
const CONTRACT_LABEL = {
  1: '제휴',
  2: '임금',
  3: '이용권',
  4: 'PT',
  5: 'PT 체험',
};

// 총괄 관리자(admin) 전용 회원 관리 화면
// 상단 탭으로 두 영역을 나눈다:
//  ① 운동시설 제휴 계약 현황 - 계약 기간·만료 확인, 시설명 클릭 시 해당 시설 회원 명단 드릴다운
//  ② 구인구직 - 유효 임금계약(2)이 없는 이탈 트레이너 풀(연락처 소개용, 최소 정보만)
// 모든 조회는 기존 백엔드 API(GET /contract/roster, /contract/jobseekers)를 그대로 사용한다.
function AdminManagement() {
  // 상단 탭: 'contracts'=운동시설 제휴 계약 현황 / 'jobseekers'=구인구직 트레이너 풀
  const [activeTab, setActiveTab] = useState('contracts');

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 운동시설 회원 명단 드릴다운 상태 (selectedGym=null 이면 시설 리스트 뷰)
  const [selectedGym, setSelectedGym] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState('');

  // 구인구직(구직 트레이너 풀) 상태 - 탭 최초 진입 시에만 조회
  const [jobSeekers, setJobSeekers] = useState([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [jobError, setJobError] = useState('');
  const [jobLoaded, setJobLoaded] = useState(false);

  const fetchContracts = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      setError('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/roster`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setError(`계약 현황을 불러오지 못했습니다. (${response.status})`);
        return;
      }

      setContracts(await response.json());
    } catch (fetchError) {
      console.error('운동시설 계약 현황 조회 실패:', fetchError);
      setError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 최초 진입 시 서버의 최신 계약 상태를 동기화한다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchContracts();
  }, [fetchContracts]);

  // 선택한 운동시설(gymId)의 소속 명단을 조회해 회원(role=member)만 남긴다.
  // 백엔드는 기존 GET /contract/roster?gymId= 를 그대로 사용한다(신규 API 없음).
  const fetchMembers = useCallback(async (gymId) => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMembersError('로그인이 필요합니다.');
      return;
    }

    setMembersLoading(true);
    setMembersError('');
    setMembers([]);

    try {
      const params = new URLSearchParams({ gymId: String(gymId) });
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/roster?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setMembersError(`회원 명단을 불러오지 못했습니다. (${response.status})`);
        return;
      }

      const roster = await response.json();
      // 트레이너 등은 제외하고 회원(member)만 노출
      setMembers(roster.filter((item) => item.member?.role?.toLowerCase() === 'member'));
    } catch (fetchError) {
      console.error('운동시설 회원 명단 조회 실패:', fetchError);
      setMembersError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  // 구직 트레이너 풀 조회 (ADMIN 전용 - 그 외 역할은 403)
  // 유효 임금계약(2)이 없는 이탈 트레이너를 이름·전화번호(아이디) 최소 정보만 조회한다.
  const fetchJobSeekers = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setJobError('로그인이 필요합니다.');
      return;
    }

    setJobLoading(true);
    setJobError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/jobseekers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        setJobError(`구직 트레이너 명단을 불러오지 못했습니다. (${response.status})`);
        return;
      }

      setJobSeekers(await response.json());
      setJobLoaded(true);
    } catch (fetchError) {
      console.error('구직 트레이너 조회 실패:', fetchError);
      setJobError('서버와 통신 중 오류가 발생했습니다.');
    } finally {
      setJobLoading(false);
    }
  }, []);

  // 탭 전환 - 구인구직 탭 최초 진입 시에만 조회 (이후에는 새로고침 버튼으로 갱신)
  const handleSelectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'jobseekers' && !jobLoaded) {
      fetchJobSeekers();
    }
  };

  // 운동시설명 클릭 → 회원 명단 뷰로 전환하며 조회
  const handleSelectGym = (contract) => {
    setSelectedGym({
      gymId: contract.gymId,
      gymName: contract.gymName || `운동시설 #${contract.gymId}`,
    });
    fetchMembers(contract.gymId);
  };

  // 시설 리스트 뷰로 복귀
  const handleBackToGyms = () => {
    setSelectedGym(null);
    setMembers([]);
    setMembersError('');
  };

  // 탭·드릴다운 상태에 맞는 새로고침 액션을 페이지 헤더(B2bManagementPage)에 등록한다.
  usePageHeaderAction(
    activeTab === 'contracts'
      ? (selectedGym
          ? { label: membersLoading ? '불러오는 중...' : '새로고침', onClick: () => fetchMembers(selectedGym.gymId), disabled: membersLoading }
          : { label: loading ? '불러오는 중...' : '새로고침', onClick: fetchContracts, disabled: loading })
      : { label: jobLoading ? '불러오는 중...' : '새로고침', onClick: fetchJobSeekers, disabled: jobLoading }
  );

  const summary = useMemo(() => contracts.reduce((counts, contract) => {
    const daysLeft = calcDaysLeft(contract.endDate);
    const isExpired = contract.status === 'EXPIRED' || contract.status === 'TERMINATED' || (daysLeft !== null && daysLeft < 0);
    if (isExpired) counts.expired += 1;
    else if (daysLeft !== null && daysLeft <= 30) counts.expiring += 1;
    else counts.normal += 1;
    return counts;
  }, { normal: 0, expiring: 0, expired: 0 }), [contracts]);

  // ── 회원 명단 뷰 (운동시설 선택 후) ─────────────────────────────
  const renderMemberView = () => (
    <>
      <div className="admin-management__header">
        <button type="button" className="admin-management__back" onClick={handleBackToGyms}>
          <NavIcon id="arrow" size={16} className="ui-icon ui-icon--left" /> 운동시설 목록으로
        </button>
      </div>
      <h3 className="admin-management__title">{selectedGym.gymName} 회원 명단</h3>

      {membersError && <p className="admin-management__error">{membersError}</p>}

      {!membersLoading && !membersError && members.length === 0 ? (
        <p className="admin-management__empty">이 운동시설에 등록된 회원이 없어요.</p>
      ) : !membersError && (
        <div className="admin-management__table-wrap">
          <table className="admin-management__table">
            <thead>
              <tr>
                <th>아이디(연락처)</th>
                <th>이름</th>
                <th>계약 유형</th>
                <th>계약 상태</th>
                <th>계약 기간</th>
                <th>만료까지</th>
              </tr>
            </thead>
            <tbody>
              {members.map((item) => {
                const expiry = getExpiryMeta(item.endDate);
                return (
                  <tr key={item.member?.username ?? item.dataId}>
                    <td>{item.member?.username ?? '-'}</td>
                    <td className="admin-management__cell--name">{item.member?.name ?? '-'}</td>
                    <td className="admin-management__cell--center">
                      {item.contract ? (CONTRACT_LABEL[item.contract] ?? item.contract) : '-'}
                    </td>
                    <td className="admin-management__cell--center">
                      {STATUS_LABEL[item.status] || item.status || '-'}
                    </td>
                    <td className="admin-management__cell--center">
                      {item.startDate ? `${item.startDate} ~ ${item.endDate}` : '-'}
                    </td>
                    <td className="admin-management__cell--center">
                      <span className={`admin-management__badge admin-management__badge--${expiry.level}`}>
                        {expiry.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // ── 운동시설 제휴 계약 현황 뷰 (시설 리스트) ─────────────────────
  const renderGymList = () => (
    <>
      <div className="admin-management__summary">
        <div className="admin-management__summary-card admin-management__summary-card--normal">
          <div className="admin-management__summary-label">정상</div>
          <strong className="admin-management__summary-value">{summary.normal}</strong>건
        </div>
        <div className="admin-management__summary-card admin-management__summary-card--expiring">
          <div className="admin-management__summary-label">30일 이내 만료</div>
          <strong className="admin-management__summary-value">{summary.expiring}</strong>건
        </div>
        <div className="admin-management__summary-card admin-management__summary-card--expired">
          <div className="admin-management__summary-label">만료</div>
          <strong className="admin-management__summary-value">{summary.expired}</strong>건
        </div>
      </div>

      {error && <p className="admin-management__error">{error}</p>}

      {!loading && !error && contracts.length === 0 ? (
        <p className="admin-management__empty">등록된 제휴 계약이 없어요.</p>
      ) : !error && (
        <div className="admin-management__table-wrap">
          <table className="admin-management__table">
            <thead>
              <tr>
                <th>운동시설</th>
                <th>대표자</th>
                <th>계약 상태</th>
                <th>계약 시작일</th>
                <th>계약 종료일</th>
                <th>만료까지</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const expiry = getExpiryMeta(contract.endDate);
                return (
                  <tr key={contract.dataId}>
                    <td className="admin-management__cell--gym">
                      <button
                        type="button"
                        className="admin-management__gym-link"
                        onClick={() => handleSelectGym(contract)}
                        disabled={contract.gymId == null}
                      >
                        {contract.gymName || `운동시설 #${contract.gymId}`}
                      </button>
                    </td>
                    <td className="admin-management__cell--center">
                      {contract.member?.name || contract.receiverName || '-'}
                    </td>
                    <td className="admin-management__cell--center">
                      {STATUS_LABEL[contract.status] || contract.status || '-'}
                    </td>
                    <td className="admin-management__cell--center">{contract.startDate || '-'}</td>
                    <td className="admin-management__cell--center">{contract.endDate || '-'}</td>
                    <td className="admin-management__cell--center">
                      <span className={`admin-management__badge admin-management__badge--${expiry.level}`}>
                        {expiry.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  // ── 구인구직 뷰 (구직 트레이너 풀) ──────────────────────────────
  const renderJobSeekers = () => (
    <>
      {jobError && <p className="admin-management__error">{jobError}</p>}

      {!jobLoading && !jobError && jobSeekers.length === 0 ? (
        <p className="admin-management__empty">현재 구직 중인 트레이너가 없어요.</p>
      ) : !jobError && (
        <div className="admin-management__table-wrap">
          <table className="admin-management__table">
            <thead>
              <tr>
                <th>이름</th>
                <th>전화번호(아이디)</th>
              </tr>
            </thead>
            <tbody>
              {jobSeekers.map((trainer) => (
                <tr key={trainer.username}>
                  <td className="admin-management__cell--name">{trainer.name}</td>
                  <td>{trainer.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <div className="admin-management">
      <div className="admin-management__tabs" role="tablist" aria-label="회원 관리">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'contracts'}
          className={`admin-management__tab${activeTab === 'contracts' ? ' admin-management__tab--active' : ''}`}
          onClick={() => handleSelectTab('contracts')}
        >
          운동시설 제휴 계약
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'jobseekers'}
          className={`admin-management__tab${activeTab === 'jobseekers' ? ' admin-management__tab--active' : ''}`}
          onClick={() => handleSelectTab('jobseekers')}
        >
          구직 트레이너
        </button>
      </div>

      {activeTab === 'contracts'
        ? (selectedGym ? renderMemberView() : renderGymList())
        : renderJobSeekers()}
    </div>
  );
}

export default AdminManagement;
