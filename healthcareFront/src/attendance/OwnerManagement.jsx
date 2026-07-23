import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ClientPagination from '../components/ClientPagination';

const PAGE_SIZE = 10;

const getLastPage = (itemCount) => Math.max(1, Math.ceil(itemCount / PAGE_SIZE));

const getPageItems = (items, page) => {
  const startIndex = (page - 1) * PAGE_SIZE;
  return items.slice(startIndex, startIndex + PAGE_SIZE);
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

  return (
    <div style={{ maxWidth: '750px', margin: '0 auto', padding: '20px' }}>

      {/* ===== 탭바 ===== */}
      <div role="tablist" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '7px 16px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
              borderRadius: '999px', border: '1px solid ' + (activeTab === tab.key ? '#171717' : '#d4d4d4'),
              backgroundColor: activeTab === tab.key ? '#171717' : '#fff',
              color: activeTab === tab.key ? '#fff' : '#525252',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== 0. 회원 (ACTIVE 계약 보유 회원 명단) ===== */}
      {activeTab === 'members' && (
        <div role="tabpanel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>👥 회원 명단</h3>
            <button onClick={() => { fetchMembers(); fetchContractCoupons(); }} style={{ padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
              🔄 새로고침
            </button>
          </div>
          <p style={{ fontSize: '13px', color: '#666', margin: '8px 0 15px 0' }}>
            현재 이용 중(ACTIVE)인 이용권·PT 계약을 보유한 회원입니다. 쿠폰 사용여부는 해당 계약 결제 시 쿠폰 적용 여부입니다.
          </p>

          {members.length === 0 ? (
            <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
              이용 중인 회원이 없습니다.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f3f4f6' }}>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>계약유형</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>종료일</th>
                  <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>쿠폰 사용여부</th>
                </tr>
              </thead>
              <tbody>
                {memberPageItems.map((m) => {
                  const dday = toDday(m.endDate);
                  const pay = payCouponMap?.[String(m.dataId)]; // 해당 계약(dataId)의 결제 건
                  const couponUsed = pay?.couponId != null; // 결제 시 쿠폰 적용 여부
                  return (
                    <tr key={m.dataId ?? m.member?.username}>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>{m.member?.name ?? '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{m.member?.username ?? '-'}</td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {m.dataId != null ? (
                          <Link to={`/fitb/contract/${m.dataId}`} style={{ color: '#2563eb', fontWeight: 'bold', textDecoration: 'underline' }}>
                            {contractLabel[m.contract] ?? '-'}
                          </Link>
                        ) : (
                          contractLabel[m.contract] ?? '-'
                        )}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {m.endDate ? <>{m.endDate}{dday != null && <span style={{ fontSize: '11px', color: dday <= 7 ? '#b91c1c' : '#888' }}> (D-{dday})</span>}</> : '-'}
                      </td>
                      <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                        {payCouponStatus === 'error' ? (
                          <span style={{ color: '#b91c1c' }}>확인 불가</span>
                        ) : payCouponMap === null ? (
                          <span style={{ color: '#999' }}>확인 중</span>
                        ) : !pay ? (
                          <span style={{ color: '#999' }}>결제 내역 없음</span>
                        ) : couponUsed ? (
                          <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '2px 7px', borderRadius: '10px', fontWeight: 'bold' }}>사용</span>
                            {pay.couponName && <span style={{ fontSize: '11px', color: '#666' }}>{pay.couponName}</span>}
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', backgroundColor: '#f5f5f4', color: '#525252', border: '1px solid #e5e5e5', padding: '2px 7px', borderRadius: '10px', fontWeight: 'bold' }}>미사용</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
      <h3>🏋️ 트레이너별 성과</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
        우리 지점 트레이너의 담당 회원 수와 이번 달 수업 실적입니다. 수행률 = 완료 / (완료 + 미수행).
      </p>

      <button onClick={() => fetchOverview()} style={{ marginBottom: '15px', padding: '6px 14px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
        🔄 새로고침
      </button>

      {trainers.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          지점에 소속된 트레이너가 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>트레이너</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>담당 회원</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>이번 달 수업</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>수행률</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>재등록 임박</th>
            </tr>
          </thead>
          <tbody>
            {trainerPageItems.map((trainer) => {
              const done = trainer.monthDone || 0;
              const missed = trainer.monthMissed || 0;
              const rate = done + missed > 0 ? Math.round((done / (done + missed)) * 100) : null;
              return (
                <tr key={trainer.username}>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>
                    {trainer.name}<br /><span style={{ fontSize: '11px', fontWeight: 'normal', color: '#888' }}>{trainer.username}</span>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{trainer.memberCount || 0}명</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {done}건{missed > 0 && <span style={{ fontSize: '11px', color: '#b91c1c' }}> (미수행 {missed})</span>}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: rate == null ? '#999' : rate >= 90 ? '#15803d' : rate >= 70 ? '#d97706' : '#b91c1c' }}>
                    {rate != null ? `${rate}%` : '-'}
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    {(trainer.rebookCount || 0) > 0 ? (
                      <span style={{ fontSize: '11px', backgroundColor: '#f59e0b', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>{trainer.rebookCount}명</span>
                    ) : (
                      <span style={{ color: '#999' }}>-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>⏰ 재등록 임박 회원</h3>
        <button onClick={() => onGoPromotion && onGoPromotion()}
          style={{ padding: '7px 14px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', border: 'none', borderRadius: '4px', backgroundColor: '#f59e0b', color: '#fff' }}>
          🎟️ 프로모션(쿠폰) 발행하러 가기
        </button>
      </div>
      <p style={{ fontSize: '13px', color: '#666', margin: '8px 0 15px 0' }}>
        PT 잔여 3회 이하 또는 이용권 종료 7일 이내인 회원입니다. 쿠폰 발행으로 재등록을 유도해 보세요.
      </p>

      {rebooks.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          재등록 임박 회원이 없습니다.
        </p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>구분</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>회원명</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>전화번호</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>담당 트레이너</th>
              <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>남은 상태</th>
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
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', backgroundColor: isPt ? '#7c3aed' : '#0284c7', color: '#fff', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
                      {rebook.category}
                    </span>
                  </td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold' }}>{rebook.memberName || '-'}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{rebook.username}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{rebook.trainerName || '-'}</td>
                  <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center', fontWeight: 'bold', color: '#d97706' }}>
                    {isPt
                      ? `잔여 ${rebook.remainingCount}회`
                      : `종료 ${rebook.endDate} (D-${dday})`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
