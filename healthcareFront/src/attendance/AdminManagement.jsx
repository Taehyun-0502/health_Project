import { useCallback, useEffect, useMemo, useState } from 'react';

const DAY_MS = 24 * 60 * 60 * 1000;

const calcDaysLeft = (endDate) => {
  if (!endDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(`${endDate}T00:00:00`);
  return Math.round((end - today) / DAY_MS);
};

const getExpiryMeta = (endDate) => {
  const daysLeft = calcDaysLeft(endDate);

  if (daysLeft === null) return { label: '기간 미정', color: '#6b7280', background: '#f3f4f6' };
  if (daysLeft < 0) return { label: `${Math.abs(daysLeft)}일 경과`, color: '#991b1b', background: '#fee2e2' };
  if (daysLeft === 0) return { label: '오늘 만료', color: '#991b1b', background: '#fee2e2' };
  if (daysLeft <= 30) return { label: `D-${daysLeft}`, color: '#9a3412', background: '#ffedd5' };
  if (daysLeft <= 90) return { label: `D-${daysLeft}`, color: '#92400e', background: '#fef3c7' };
  return { label: `D-${daysLeft}`, color: '#166534', background: '#dcfce7' };
};

const STATUS_LABEL = {
  DRAFT: '작성 중',
  ISSUED: '서명 대기',
  SIGNED: '계약 중',
  EXPIRED: '만료',
  ACTIVE: '이용 중',
  TERMINATED: '종료',
};

// 총괄 관리자(admin) 전용 헬스장 제휴 계약 현황
// 매장 내부 운영 정보는 열람하지 않고, 제휴 계약 기간과 만료 여부만 관리한다.
function AdminManagement() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      console.error('헬스장 계약 현황 조회 실패:', fetchError);
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

  const summary = useMemo(() => contracts.reduce((counts, contract) => {
    const daysLeft = calcDaysLeft(contract.endDate);
    const isExpired = contract.status === 'EXPIRED' || contract.status === 'TERMINATED' || (daysLeft !== null && daysLeft < 0);
    if (isExpired) counts.expired += 1;
    else if (daysLeft !== null && daysLeft <= 30) counts.expiring += 1;
    else counts.normal += 1;
    return counts;
  }, { normal: 0, expiring: 0, expired: 0 }), [contracts]);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: '0 0 8px' }}>헬스장 제휴 계약 현황</h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>
            각 헬스장과의 계약 기간을 확인하고, 만료 30일 전부터 갱신을 준비할 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchContracts}
          disabled={loading}
          style={{ padding: '7px 14px', cursor: loading ? 'default' : 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}
        >
          {loading ? '불러오는 중...' : '새로고침'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(120px, 1fr))', gap: '10px', margin: '20px 0' }}>
        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#166534' }}>
          <div style={{ fontSize: '12px' }}>정상</div>
          <strong style={{ fontSize: '22px' }}>{summary.normal}</strong>건
        </div>
        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fff7ed', color: '#9a3412' }}>
          <div style={{ fontSize: '12px' }}>30일 이내 만료</div>
          <strong style={{ fontSize: '22px' }}>{summary.expiring}</strong>건
        </div>
        <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fef2f2', color: '#991b1b' }}>
          <div style={{ fontSize: '12px' }}>만료</div>
          <strong style={{ fontSize: '22px' }}>{summary.expired}</strong>건
        </div>
      </div>

      {error && (
        <p style={{ padding: '12px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#b91c1c' }}>{error}</p>
      )}

      {!loading && !error && contracts.length === 0 ? (
        <p style={{ padding: '30px', textAlign: 'center', color: '#999', border: '1px dashed #ddd', borderRadius: '8px' }}>
          등록된 제휴 계약이 없습니다.
        </p>
      ) : !error && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '680px', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>헬스장</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>대표자</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>계약 상태</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>계약 시작일</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>계약 종료일</th>
                <th style={{ padding: '10px', border: '1px solid #e5e7eb' }}>만료까지</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract) => {
                const expiry = getExpiryMeta(contract.endDate);
                return (
                  <tr key={contract.dataId}>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', fontWeight: 700 }}>
                      {contract.gymName || `헬스장 #${contract.gymId}`}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      {contract.member?.name || contract.receiverName || '-'}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      {STATUS_LABEL[contract.status] || contract.status || '-'}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{contract.startDate || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>{contract.endDate || '-'}</td>
                    <td style={{ padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', minWidth: '60px', padding: '4px 8px', borderRadius: '999px', fontWeight: 700, color: expiry.color, backgroundColor: expiry.background }}>
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
    </div>
  );
}

export default AdminManagement;
