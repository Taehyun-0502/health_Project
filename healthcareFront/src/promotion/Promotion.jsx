import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// 사장님 프로모션 — 쿠폰 발송 화면
//  ① 상단: 우리 지점(gym_id) 쿠폰 종류 선택 (h_coupon_type)
//  ② 탭: '회원수 기준'(상위 N명) / '이탈율 기준'(P% 초과) 으로 발송 대상 지정
//  ③ 하단: 회원을 이탈율 큰 순으로 세우고, 대상자에 체크(✓) → 일괄 발송
function Promotion() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('accessToken');
  const gymId = user.gymId;

  const [types, setTypes] = useState([]);            // 쿠폰 종류 목록
  const [selectedNum, setSelectedNum] = useState(''); // 고른 쿠폰 종류(coupon_num)
  const [members, setMembers] = useState([]);        // 이탈율 큰 순 회원 [{username,name,churnRate}]
  const [loading, setLoading] = useState(true);

  const [mode, setMode] = useState('count');         // 'count'(회원수) | 'rate'(이탈율)
  const [countN, setCountN] = useState(10);          // 상위 N명
  const [rateP, setRateP] = useState(50);            // 이탈율 P% 초과

  const [sentSet, setSentSet] = useState(() => new Set()); // 발송 완료된 username
  const [sending, setSending] = useState(false);

  // 쿠폰 종류 목록 조회 (발송 후 잔여 수량 갱신에도 재사용)
  const loadTypes = () => {
    if (!gymId) return;
    fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/types?gymId=${gymId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        setTypes(data);
        // 아직 아무것도 안 골랐으면 첫 번째를 기본 선택
        setSelectedNum((prev) => (prev !== '' ? prev : (data[0]?.couponNum ?? '')));
      })
      .catch((e) => { console.error('쿠폰 종류 조회 실패:', e); setTypes([]); });
  };

  useEffect(() => {
    if (!gymId) { setLoading(false); return; }
    loadTypes();
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/members/byChurn?gymId=${gymId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setMembers)
      .catch((e) => { console.error('회원 명단 조회 실패:', e); setMembers([]); })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  const selectedType = types.find((t) => String(t.couponNum) === String(selectedNum)) || null;
  // coupon_count 가 null 이면 무제한 발행
  const unlimited = !!selectedType && selectedType.couponCount == null;
  const remaining = !selectedType ? 0
    : unlimited ? Infinity
    : selectedType.couponCount - (selectedType.sendCount ?? 0);

  // 현재 기준에 따라 '발송 대상'인 회원 username 집합 (members는 이미 이탈율 내림차순)
  const targetSet = useMemo(() => {
    if (mode === 'count') {
      const n = Math.max(0, Number(countN) || 0);
      return new Set(members.slice(0, n).map((m) => m.username));
    }
    const p = Number(rateP) || 0;
    return new Set(members.filter((m) => (m.churnRate ?? 0) * 100 >= p).map((m) => m.username));
  }, [mode, countN, rateP, members]);

  // 실제로 이번에 보낼 대상 = 대상자 중 아직 발송 안 된 회원
  const toSend = members.filter((m) => targetSet.has(m.username) && !sentSet.has(m.username));

  const handleSend = async () => {
    if (!token) { alert('로그인이 필요합니다.'); navigate('/'); return; }
    if (!selectedType) { alert('발송할 쿠폰 종류를 먼저 선택해 주세요.'); return; }
    if (toSend.length === 0) { alert('발송할 대상이 없습니다. (기준을 확인해 주세요)'); return; }
    if (toSend.length > remaining) {
      alert(`발급 가능 수량이 부족합니다. (대상 ${toSend.length}명 / 잔여 ${remaining}개)`);
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ couponNum: selectedType.couponNum, toIds: toSend.map((m) => m.username) }),
      });
      if (res.ok) {
        const count = await res.json();
        setSentSet((prev) => {
          const next = new Set(prev);
          toSend.forEach((m) => next.add(m.username));
          return next;
        });
        loadTypes(); // 잔여 수량 갱신
        alert(`${count}명에게 '${selectedType.couponName}' 쿠폰을 발송했습니다.`);
      } else {
        alert(`발송 실패: ${await res.text()}`);
      }
    } catch (e) {
      console.error('쿠폰 발송 오류:', e);
      alert('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setSending(false);
    }
  };

  if (!gymId) {
    return <div style={{ padding: '20px' }}>로그인한 사장님의 헬스장 정보를 찾을 수 없습니다.</div>;
  }

  const churnColor = (rate) => (rate >= 0.5 ? '#c62828' : rate >= 0.25 ? '#ef6c00' : '#2e7d32');

  return (
    <div style={{ padding: '20px', maxWidth: '820px' }}>
      <h2>🎁 프로모션 쿠폰 발송 ({user.name} 사장님)</h2>

      {/* ① 쿠폰 종류 선택 */}
      <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '14px 16px', margin: '14px 0', background: '#fbfbfb' }}>
        <label style={{ fontWeight: 'bold', marginRight: '10px' }}>발송할 쿠폰 종류</label>
        {types.length === 0 ? (
          <span style={{ color: '#888' }}>등록된 쿠폰 종류가 없습니다.</span>
        ) : (
          <>
            <select
              value={selectedNum}
              onChange={(e) => setSelectedNum(e.target.value)}
              style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' }}
            >
              {types.map((t) => (
                <option key={t.couponNum} value={t.couponNum}>
                  {t.couponName} ({t.category} {t.percent}%)
                </option>
              ))}
            </select>
            {selectedType && (
              <span style={{ marginLeft: '14px', fontSize: '13px', color: '#555' }}>
                할인 <b>{selectedType.percent}%</b> · 유효 <b>{selectedType.couponDate ?? 1}개월</b> ·
                잔여 <b style={{ color: (unlimited || remaining > 0) ? '#1565c0' : '#c62828' }}>
                  {unlimited ? '무제한' : `${remaining}개`}
                </b>
                {!unlimited && <span style={{ color: '#999' }}> / 총 {selectedType.couponCount}개</span>}
              </span>
            )}
          </>
        )}
      </div>

      {/* ② 기준 탭 (회원수 / 이탈율) */}
      <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
        {[['count', '회원수 기준'], ['rate', '이탈율 기준']].map(([m, label]) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '6px 16px', borderRadius: '6px', cursor: 'pointer',
              border: mode === m ? '2px solid #007bff' : '1px solid #ccc',
              background: mode === m ? '#e7f1ff' : '#fff',
              fontWeight: mode === m ? 'bold' : 'normal',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 기준 입력 */}
      <div style={{ margin: '10px 0', fontSize: '14px' }}>
        {mode === 'count' ? (
          <span>
            이탈율 높은 순으로 상위{' '}
            <input
              type="number" min={0} max={members.length} value={countN}
              onChange={(e) => setCountN(e.target.value)}
              style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ccc', textAlign: 'right' }}
            />{' '}명에게 발송 · <b style={{ color: '#1565c0' }}>대상 {targetSet.size}명</b>
          </span>
        ) : (
          <span>
            이탈율{' '}
            <input
              type="number" min={0} max={100} value={rateP}
              onChange={(e) => setRateP(e.target.value)}
              style={{ width: '70px', padding: '4px 8px', borderRadius: '6px', border: '1px solid #ccc', textAlign: 'right' }}
            />% 초과 회원에게 발송 · <b style={{ color: '#1565c0' }}>총 {targetSet.size}명</b>
          </span>
        )}
        <span style={{ color: '#999', marginLeft: '8px' }}>(전체 {members.length}명)</span>
      </div>

      {/* ③ 회원 목록 (이탈율 큰 순) */}
      {loading ? (
        <p>불러오는 중…</p>
      ) : members.length === 0 ? (
        <p style={{ color: '#888' }}>분석된 회원이 없습니다. (배치 실행 후 표시됩니다)</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
          <thead style={{ background: '#f5f5f5' }}>
            <tr>
              <th style={{ padding: '8px', width: '60px' }}>발송</th>
              <th style={{ padding: '8px', width: '48px' }}>순위</th>
              <th style={{ padding: '8px', textAlign: 'left' }}>회원</th>
              <th style={{ padding: '8px' }}>ID</th>
              <th style={{ padding: '8px' }}>이탈율</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => {
              const isTarget = targetSet.has(m.username);
              const isSent = sentSet.has(m.username);
              return (
                <tr key={m.username} style={{ background: isSent ? '#e8f5e9' : isTarget ? '#fff8e1' : '#fff' }}>
                  <td style={{ padding: '8px', textAlign: 'center', fontSize: '18px' }}>
                    {isSent ? <span title="발송완료" style={{ color: '#2e7d32' }}>✅</span>
                      : isTarget ? <span title="발송 대상" style={{ color: '#1565c0' }}>☑️</span>
                      : <span style={{ color: '#ddd' }}>▫️</span>}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#888' }}>{i + 1}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{m.name}</td>
                  <td style={{ padding: '8px', color: '#666' }}>{m.username}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: churnColor(m.churnRate ?? 0) }}>
                    {((m.churnRate ?? 0) * 100).toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* 발송 버튼 */}
      <div style={{ margin: '18px 0', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={handleSend}
          disabled={sending || !selectedType || toSend.length === 0}
          style={{
            padding: '10px 22px', borderRadius: '6px', border: 'none', fontSize: '15px', fontWeight: 'bold',
            color: '#fff', background: (sending || !selectedType || toSend.length === 0) ? '#aaa' : '#e0662b',
            cursor: (sending || !selectedType || toSend.length === 0) ? 'not-allowed' : 'pointer',
          }}
        >
          {sending ? '발송 중…' : `체크된 ${toSend.length}명에게 쿠폰 발송`}
        </button>
        {toSend.length > remaining && selectedType && (
          <span style={{ color: '#c62828', fontSize: '13px' }}>잔여 수량({remaining}개)보다 대상이 많습니다.</span>
        )}
      </div>

      <div style={{ marginTop: '10px' }}>
        <Link to="/fitb">← 관리 포털로</Link>
      </div>
    </div>
  );
}

export default Promotion;
