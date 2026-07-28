import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ClientPagination from '../components/ClientPagination';
import usePageHeaderAction from '../hooks/usePageHeaderAction.js';
import './OwnerManagement.css';

const PAGE_SIZE = 10;

const getLastPage = (itemCount) => Math.max(1, Math.ceil(itemCount / PAGE_SIZE));

const getPageItems = (items, page) => {
  const startIndex = (page - 1) * PAGE_SIZE;
  return items.slice(startIndex, startIndex + PAGE_SIZE);
};

// 트레이너 수행률을 색상 등급(good/warn/bad/none)으로 변환한다.
// 색은 CSS(.owner-mgmt__rate--*)가 담당하고 JSX는 데이터 파생값만 계산한다.
const getRateLevel = (rate) => {
  if (rate == null) return 'none';
  if (rate >= 90) return 'good';
  if (rate >= 70) return 'warn';
  return 'bad';
};

// 사장님 전용 지점 회원·직원 관리 컴포넌트 (AdminMain 회원/직원 관리 탭에 내장)
// 탭 구성: 0) 회원(ACTIVE 계약 보유 회원 명단)  1) 트레이너별 성과 보드
//          2) 재등록 임박 리스트(PT+이용권)  3) 지점 PT 일정 캘린더(읽기 전용)
// gymId prop이 있으면 해당 매장을 조회(총괄 관리자의 매장 드릴다운용), 없으면 본인 지점
function OwnerManagement({ onGoPromotion, gymId }) {
  const [members, setMembers] = useState([]); // ACTIVE 계약 보유 회원 명단 (기존 /contract/roster 재사용)
  const [payCouponMap, setPayCouponMap] = useState(null); // 계약(dataId) -> 결제 건(쿠폰 사용 여부, 기존 /fitb/payment/paylist/export 재사용)
  const [payCouponStatus, setPayCouponStatus] = useState('loading'); // loading | loaded | error
  const [trainers, setTrainers] = useState([]);
  const [rebooks, setRebooks] = useState([]);
  const [activeTab, setActiveTab] = useState('members'); // members | trainers | rebooks
  const [memberPage, setMemberPage] = useState(1);
  const [trainerPage, setTrainerPage] = useState(1);
  const [rebookPage, setRebookPage] = useState(1);

  // 회원 탭 계약 유형 라벨 (3=이용권, 4=PT, 5=PT 체험)
  const contractLabel = { 3: '이용권', 4: 'PT', 5: 'PT 체험' };

  // 지점 관리 현황 통합 조회 (트레이너 성과 / 재등록 / 일정 / 수업 이력)
  // gymId prop이 있으면(총괄 관리자 드릴다운) 해당 매장 지정 조회
  const fetchOverview = async (resetPage = false) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (resetPage) {
      setTrainerPage(1);
      setRebookPage(1);
    }

    try {
      const query = gymId ? `?gymId=${gymId}` : '';
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/attendance/owner/overview${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const nextTrainers = data.trainers || [];
        const nextRebooks = data.rebooks || [];
        setTrainers(nextTrainers);
        setRebooks(nextRebooks);
        setTrainerPage((currentPage) => Math.min(currentPage, getLastPage(nextTrainers.length)));
        setRebookPage((currentPage) => Math.min(currentPage, getLastPage(nextRebooks.length)));
      } else {
        console.error('지점 현황 로드 실패:', await response.text());
      }
    } catch (error) {
      console.error('지점 현황 조회 실패:', error);
    }
  };

  // ACTIVE 계약 보유 회원 명단 조회 - 기존 GET /contract/roster 재사용, 프론트에서 MEMBER + ACTIVE만 필터
  // (roster는 서버에서 sweep으로 상태 최신화 + gym_id 테넌트 격리를 이미 처리)
  const fetchMembers = async (resetPage = false) => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    if (resetPage) {
      setMemberPage(1);
    }

    try {
      const query = gymId ? `?gymId=${gymId}` : '';
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/roster${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const activeMembers = (data || []).filter(
          (r) => String(r.member?.role || '').toUpperCase() === 'MEMBER' && r.status === 'ACTIVE'
        );
        setMembers(activeMembers);
        setMemberPage((currentPage) => Math.min(currentPage, getLastPage(activeMembers.length)));
      } else {
        console.error('회원 명단 로드 실패:', await response.text());
      }
    } catch (error) {
      console.error('회원 명단 조회 실패:', error);
    }
  };

  // 계약 결제 시 쿠폰 사용 여부 조회 - 기존 GET /fitb/payment/paylist/export(비페이징, 지점 격리) 재사용
  // 결제 건을 계약(dataId) 기준으로 묶어(h_payment↔h_pay 조인의 couponId) 회원 탭에서 계약별 쿠폰 사용여부로 표시
  const fetchContractCoupons = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    setPayCouponMap(null);
    setPayCouponStatus('loading');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/payment/paylist/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const map = {};
        (data || []).forEach((p) => {
          if (p.dataId != null) map[String(p.dataId)] = p; // 계약(data_id)당 결제 건
        });
        setPayCouponMap(map);
        setPayCouponStatus('loaded');
      } else {
        console.error('결제 내역 로드 실패:', await response.text());
        setPayCouponStatus('error');
      }
    } catch (error) {
      console.error('결제 내역 조회 실패:', error);
      setPayCouponStatus('error');
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOverview(true);
    fetchMembers(true);
    fetchContractCoupons();
    // 기존 조회 함수들은 새로고침 버튼에서도 재사용하며, gymId 변경 때만 전체 재조회한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]); // 드릴다운 대상 매장이 바뀌면 재조회

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // 종료일까지 남은 일수(D-day) 계산 헬퍼
  const toDday = (endDate) => (endDate ? Math.ceil((new Date(endDate) - new Date(todayStr)) / 86400000) : null);

  const tabs = [
    { key: 'members', label: `회원 (${members.length})` },
    { key: 'trainers', label: '트레이너 성과' },
    { key: 'rebooks', label: `재등록 임박 (${rebooks.length})` },
  ];

  const memberPageItems = getPageItems(members, memberPage);
  const trainerPageItems = getPageItems(trainers, trainerPage);
  const rebookPageItems = getPageItems(rebooks, rebookPage);

  // 탭별 주요 액션 버튼을 페이지 헤더(B2bManagementPage)에 등록한다 - 회원 탭은 액션 없음
  usePageHeaderAction(
    activeTab === 'trainers'
      ? { label: '새로고침', onClick: () => fetchOverview() }
      : activeTab === 'rebooks'
        ? { label: '프로모션(쿠폰) 발행하러 가기', onClick: () => onGoPromotion && onGoPromotion(), variant: 'primary' }
        : null
  );

  return (
    <div className="owner-mgmt">

      {/* ===== 탭바 ===== */}
      <div className="owner-mgmt__tabs" role="tablist" aria-label="지점 회원·직원 관리">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`owner-mgmt__tab${activeTab === tab.key ? ' owner-mgmt__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 0. 회원 (ACTIVE 계약 보유 회원 명단) ===== */}
      {activeTab === 'members' && (
        <div role="tabpanel">
          {members.length === 0 ? (
            <p className="owner-mgmt__empty">이용 중인 회원이 없어요.</p>
          ) : (
            <div className="owner-mgmt__table-wrap">
              <table className="owner-mgmt__table">
                <thead>
                  <tr>
                    <th>회원명</th>
                    <th>전화번호</th>
                    <th>계약유형</th>
                    <th>종료일</th>
                    <th>쿠폰 사용여부</th>
                  </tr>
                </thead>
                <tbody>
                  {memberPageItems.map((m) => {
                    const dday = toDday(m.endDate);
                    const pay = payCouponMap?.[String(m.dataId)]; // 해당 계약(dataId)의 결제 건
                    const couponUsed = pay?.couponId != null; // 결제 시 쿠폰 적용 여부
                    return (
                      <tr key={m.dataId ?? m.member?.username}>
                        <td className="owner-mgmt__cell--name">{m.member?.name ?? '-'}</td>
                        <td className="owner-mgmt__num">{m.member?.username ?? '-'}</td>
                        <td>
                          {m.dataId != null ? (
                            <Link to={`/fitb/contract/${m.dataId}`} className="owner-mgmt__type-link">
                              {contractLabel[m.contract] ?? '-'}
                            </Link>
                          ) : (
                            contractLabel[m.contract] ?? '-'
                          )}
                        </td>
                        <td className="owner-mgmt__num">
                          {m.endDate ? (
                            <>
                              {m.endDate}
                              {dday != null && (
                                <span className={`owner-mgmt__dday${dday <= 7 ? ' owner-mgmt__dday--urgent' : ''}`}> (D-{dday})</span>
                              )}
                            </>
                          ) : '-'}
                        </td>
                        <td>
                          {payCouponStatus === 'error' ? (
                            <span className="owner-mgmt__danger-text">확인 불가</span>
                          ) : payCouponMap === null ? (
                            <span className="owner-mgmt__muted-text">확인 중</span>
                          ) : !pay ? (
                            <span className="owner-mgmt__muted-text">결제 내역 없음</span>
                          ) : couponUsed ? (
                            <span className="owner-mgmt__coupon">
                              <span className="owner-mgmt__badge owner-mgmt__badge--coupon">사용</span>
                              {pay.couponName && <span className="owner-mgmt__coupon-name">{pay.couponName}</span>}
                            </span>
                          ) : (
                            <span className="owner-mgmt__badge owner-mgmt__badge--muted">미사용</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <ClientPagination
            currentPage={memberPage}
            totalItems={members.length}
            pageSize={PAGE_SIZE}
            onPageChange={setMemberPage}
            ariaLabel="회원 명단 페이지"
          />
        </div>
      )}

      {/* ===== 1. 트레이너별 성과 보드 ===== */}
      {activeTab === 'trainers' && (
      <div role="tabpanel">
        {trainers.length === 0 ? (
          <p className="owner-mgmt__empty">지점에 소속된 트레이너가 없어요.</p>
        ) : (
          <div className="owner-mgmt__table-wrap">
            <table className="owner-mgmt__table">
              <thead>
                <tr>
                  <th>트레이너</th>
                  <th>담당 회원</th>
                  <th>이번 달 수업</th>
                  <th>수행률</th>
                  <th>재등록 임박</th>
                </tr>
              </thead>
              <tbody>
                {trainerPageItems.map((trainer) => {
                  const done = trainer.monthDone || 0;
                  const missed = trainer.monthMissed || 0;
                  const rate = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : null;
                  const rateLevel = getRateLevel(rate);
                  return (
                    <tr key={trainer.username}>
                      <td className="owner-mgmt__cell--name">
                        {trainer.name}
                        <span className="owner-mgmt__sub owner-mgmt__num">{trainer.username}</span>
                      </td>
                      <td className="owner-mgmt__num">{trainer.memberCount || 0}명</td>
                      <td className="owner-mgmt__num">
                        {done}건{missed > 0 && <span className="owner-mgmt__missed"> (미수행 {missed})</span>}
                      </td>
                      <td className={`owner-mgmt__num owner-mgmt__rate owner-mgmt__rate--${rateLevel}`}>
                        {rate != null ? `${rate}%` : '-'}
                      </td>
                      <td>
                        {(trainer.rebookCount || 0) > 0 ? (
                          <span className="owner-mgmt__badge owner-mgmt__badge--rebook">{trainer.rebookCount}명</span>
                        ) : (
                          <span className="owner-mgmt__muted-text">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <ClientPagination
          currentPage={trainerPage}
          totalItems={trainers.length}
          pageSize={PAGE_SIZE}
          onPageChange={setTrainerPage}
          ariaLabel="트레이너 성과 페이지"
        />
      </div>
      )}

      {/* ===== 2. 재등록 임박 리스트 (PT + 이용권) ===== */}
      {activeTab === 'rebooks' && (
      <div role="tabpanel">
        {rebooks.length === 0 ? (
          <p className="owner-mgmt__empty">재등록 임박 회원이 없어요.</p>
        ) : (
          <div className="owner-mgmt__table-wrap">
            <table className="owner-mgmt__table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>회원명</th>
                  <th>전화번호</th>
                  <th>담당 트레이너</th>
                  <th>남은 상태</th>
                </tr>
              </thead>
              <tbody>
                {rebookPageItems.map((rebook) => {
                  // PT형(PT·PT 체험)은 잔여 횟수가, 이용권은 null이 내려온다.
                  // category 문자열이 아니라 데이터 형태로 판별해야 유형이 늘어도 표시가 깨지지 않는다.
                  const isPt = rebook.remainingCount != null;
                  // 이용권은 종료일까지 남은 일수(D-day) 계산
                  const dday = rebook.endDate ? Math.ceil((new Date(rebook.endDate) - new Date(todayStr)) / 86400000) : null;
                  return (
                    <tr key={`${rebook.category}-${rebook.dataId}`}>
                      <td>
                        <span className={`owner-mgmt__badge owner-mgmt__badge--${isPt ? 'pt' : 'gym'}`}>
                          {rebook.category}
                        </span>
                      </td>
                      <td className="owner-mgmt__cell--name">{rebook.memberName || '-'}</td>
                      <td className="owner-mgmt__num">{rebook.username}</td>
                      <td>{rebook.trainerName || '-'}</td>
                      <td className="owner-mgmt__rebook-state owner-mgmt__num">
                        {isPt
                          ? `잔여 ${rebook.remainingCount}회`
                          : `종료 ${rebook.endDate} (D-${dday})`}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <ClientPagination
          currentPage={rebookPage}
          totalItems={rebooks.length}
          pageSize={PAGE_SIZE}
          onPageChange={setRebookPage}
          ariaLabel="재등록 임박 회원 페이지"
        />
      </div>
      )}

    </div>
  );
}

export default OwnerManagement;
