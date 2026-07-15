import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';

// 이탈율(0~1)에 따른 색상 (B2bList와 동일 기준)
const churnColor = (rate) => (rate >= 0.5 ? '#c62828' : rate >= 0.25 ? '#ef6c00' : '#2e7d32');

// B2B 사장님용 — 이탈율 높은 순 회원 명단에서 쿠폰 발송 대상 선택 컴포넌트
function B2bCoupon() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const gymId = user.gymId;

  const [members, setMembers] = useState([]);   // [{username, name, churnRate}] 이탈율 내림차순
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState('count');     // 'count'(인원수 기준) | 'rate'(이탈율 기준)
  const [countN, setCountN] = useState(50);       // 인원수 기준: 상위 N명
  const [rateThreshold, setRateThreshold] = useState(50); // 이탈율 기준: N% 이상

  const [selected, setSelected] = useState(() => new Set()); // 선택된 회원 username Set

  // 이탈율 높은 순 회원 명단 조회
  useEffect(() => {
    if (!gymId) return;
    setLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/members/byChurn?gymId=${gymId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch((e) => { console.error('회원 명단 조회 실패:', e); setMembers([]); })
      .finally(() => setLoading(false));
  }, [gymId]);

  // 탭/입력값이 바뀌면 기준에 맞춰 자동 선택 (이후 개별 체크박스로 수동 조정 가능)
  useEffect(() => {
    if (members.length === 0) { setSelected(new Set()); return; }
    let picked;
    if (mode === 'count') {
      const n = Math.max(0, Number(countN) || 0);
      picked = members.slice(0, n).map((m) => m.username);       // 이미 내림차순 → 위에서부터 N명
    } else {
      const th = (Number(rateThreshold) || 0) / 100;
      picked = members.filter((m) => m.churnRate >= th).map((m) => m.username); // 이탈율 임계값 이상 전부
    }
    setSelected(new Set(picked));
  }, [members, mode, countN, rateThreshold]);

  // 개별 회원 체크 토글 (수동 조정)
  const toggleMember = (username) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(username)) next.delete(username);
      else next.add(username);
      return next;
    });
  };

  const selectedCount = selected.size;
  const avgSelectedChurn = useMemo(() => {
    const picked = members.filter((m) => selected.has(m.username));
    if (picked.length === 0) return null;
    return picked.reduce((s, m) => s + m.churnRate, 0) / picked.length;
  }, [members, selected]);

  if (!gymId) {
    return <div style={{ padding: '20px' }}>로그인한 사장님의 헬스장 정보를 찾을 수 없습니다.</div>;
  }

  const tabBtn = (m, label) => (
    <button
      key={m}
      onClick={() => setMode(m)}
      style={{
        padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
        border: mode === m ? '2px solid #ef6c00' : '1px solid #ccc',
        background: mode === m ? '#fff3e0' : '#fff',
        fontWeight: mode === m ? 'bold' : 'normal',
        color: mode === m ? '#ef6c00' : '#333',
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ padding: '20px', maxWidth: '760px' }}>
      <h2>🎟️ 쿠폰 대상 회원 선택 ({user.name} 사장님)</h2>
      <p style={{ fontSize: '13px', color: '#666' }}>
        이탈율이 높은 순으로 정렬된 회원 명단입니다. 기준을 골라 대상을 자동 선택하거나, 개별로 체크할 수 있습니다.
      </p>

      {/* 기준 선택 탭 */}
      <div style={{ display: 'flex', gap: '8px', margin: '14px 0 10px' }}>
        {tabBtn('count', '인원수 기준')}
        {tabBtn('rate', '이탈율 기준')}
      </div>

      {/* 기준별 입력 */}
      <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '12px 14px', marginBottom: '14px' }}>
        {mode === 'count' ? (
          <label style={{ fontSize: '14px' }}>
            이탈율 높은 순으로 상위{' '}
            <input
              type="number" min="0" max={members.length} value={countN}
              onChange={(e) => setCountN(e.target.value)}
              style={{ width: '80px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'right' }}
            />
            {' '}명 선택 <span style={{ color: '#999' }}>(전체 {members.length}명)</span>
          </label>
        ) : (
          <label style={{ fontSize: '14px' }}>
            이탈율{' '}
            <input
              type="number" min="0" max="100" value={rateThreshold}
              onChange={(e) => setRateThreshold(e.target.value)}
              style={{ width: '80px', padding: '6px 8px', border: '1px solid #ccc', borderRadius: '4px', textAlign: 'right' }}
            />
            {' '}% 이상 회원 전부 선택
          </label>
        )}
      </div>

      {/* 선택 요약 */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '10px' }}>
        <strong style={{ color: '#ef6c00', fontSize: '15px' }}>{selectedCount}명 선택됨</strong>
        {avgSelectedChurn != null && (
          <span style={{ fontSize: '13px', color: '#666' }}>
            선택 회원 평균 이탈율 <b style={{ color: churnColor(avgSelectedChurn) }}>{(avgSelectedChurn * 100).toFixed(1)}%</b>
          </span>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>명단 불러오는 중…</p>
      ) : members.length === 0 ? (
        <p style={{ color: '#888' }}>회원 데이터가 없습니다. (이탈 예측 배치 실행 후 표시됩니다)</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ background: '#f5f5f5' }}>
            <tr>
              <th style={{ padding: '8px', width: '48px', textAlign: 'center' }}>선택</th>
              <th style={{ padding: '8px', width: '48px', textAlign: 'center' }}>순위</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>회원</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>ID</th>
              <th style={{ padding: '8px', textAlign: 'right' }}>이탈율</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const checked = selected.has(m.username);
              return (
                <tr key={m.username}
                    onClick={() => toggleMember(m.username)}
                    style={{ cursor: 'pointer', background: checked ? '#fff3e0' : '#fff', borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '6px 8px', textAlign: 'center' }}>
                    <input type="checkbox" checked={checked}
                           onChange={() => toggleMember(m.username)}
                           onClick={(e) => e.stopPropagation()}
                           style={{ cursor: 'pointer' }} />
                  </td>
                  <td style={{ padding: '6px 8px', textAlign: 'center', color: '#999' }}>{i + 1}</td>
                  <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{m.name}</td>
                  <td style={{ padding: '6px 8px', color: '#666' }}>{m.username}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: churnColor(m.churnRate) }}>
                    {(m.churnRate * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '20px' }}>
        <Link to="/fitb/b2bmypage">← 마이페이지로</Link>
      </div>
    </div>
  );
}

export default B2bCoupon;
