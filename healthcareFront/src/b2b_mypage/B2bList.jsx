import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';

// 바 이름은 모델 피처키(컬럼명, statKey)를 그대로 노출한다.

// 이탈 요인 표시 고정 순서 (이 순서대로 위→아래로 노출, 목록에 없는 요인은 뒤로)
const FACTOR_ORDER = [
  '나이',
  '이번달_주당방문횟수',
  '총_이용개월수',
  '상대_방문공백',
  '일평균_운동시간',
  '주_이용_시간대_혼잡도',
  'PT_가입여부',
  '그룹수업_참여',
  '최근한달_부상경험',
  '서비스불만_환경불편',
  '서비스불만_비매너회원',
  '기구불만_기구부족',
  '기구불만_기구상태불만',
  '직원불만_불친절',
  '직원불만_전문성부족',
  '가격불만',
];

// 불만족 요인별 액션 버튼 라벨 (기능 미구현 — 버튼만 노출)
const FACTOR_ACTION = {
  '서비스불만_환경불편': '헬퍼',
  '서비스불만_비매너회원': '시간대 조회',
  '기구불만_기구부족': '기구 리스트 조회',
  '기구불만_기구상태불만': '서비스 센터 리스트 조회',
  '직원불만_불친절': '교육 프로그램 제공',
  '직원불만_전문성부족': '담당자 리스트',
  '가격불만': '쿠폰',
};

// 비율 막대
function Bar({ pct, color }) {
  return (
    <div style={{ background: '#eee', borderRadius: '4px', height: '14px', width: '100%', minWidth: '80px' }}>
      <div style={{ background: color, width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: '4px' }} />
    </div>
  );
}

// 이탈 요인 한 행 (클릭 → 해당 요인을 가진 위험군 회원 명단 토글)
function StatRow({ label, pct, memberCount, open, onClick }) {
  return (
    <tr onClick={onClick}
        style={{ background: open ? '#fff3e0' : '#fff', cursor: 'pointer' }}>
      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
        {label}<span style={{ color: '#999', fontSize: '11px' }}>{open ? ' ▲' : ' ▼'}</span>
      </td>
      <td style={{ padding: '4px 8px', width: '45%' }}>{pct != null ? <Bar pct={pct} color="#ef6c00" /> : null}</td>
      <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {pct != null ? (
          <><strong>{pct}%</strong> <span style={{ color: '#999', fontSize: '12px' }}>({memberCount}명)</span></>
        ) : null}
      </td>
    </tr>
  );
}

// 회원 명단 하위행 (요인 로우 클릭 시)
function MemberListRow({ loading, members, statKey }) {
  const action = FACTOR_ACTION[statKey];
  return (
    <tr>
      <td colSpan={3} style={{ padding: '6px 8px 10px 28px', background: '#fffdf5' }}>
        {action && (
          <div style={{ marginBottom: '8px' }}>
            <button
              type="button"
              style={{
                padding: '5px 14px', borderRadius: '6px', cursor: 'pointer',
                border: '1px solid #ef6c00', background: '#fff', color: '#ef6c00',
                fontSize: '13px', fontWeight: 'bold',
              }}
            >
              {action}
            </button>
          </div>
        )}
        {loading ? <span style={{ color: '#888' }}>명단 불러오는 중…</span>
          : members.length === 0 ? <span style={{ color: '#888' }}>해당 회원 없음</span>
          : (
            <table style={{ borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead><tr style={{ color: '#888' }}>
                <th style={{ textAlign: 'left', padding: '2px 12px 2px 0' }}>회원</th>
                <th style={{ textAlign: 'left', padding: '2px 12px 2px 0' }}>ID</th>
                <th style={{ textAlign: 'right', padding: '2px 0' }}>이탈율</th>
              </tr></thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.username}>
                    <td style={{ padding: '2px 12px 2px 0' }}>{m.name}</td>
                    <td style={{ padding: '2px 12px 2px 0', color: '#666' }}>{m.username}</td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 'bold',
                                 color: m.churnRate >= 0.5 ? '#c62828' : m.churnRate >= 0.25 ? '#ef6c00' : '#2e7d32' }}>
                      {(m.churnRate * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </td>
    </tr>
  );
}

// 이탈 요인 비율(주황 바) — 요인 로우 클릭 시 그 요인을 가진 위험군 회원 명단 조회
function Breakdown({ items, riskMembers, gymId, mode, period }) {
  const [openKey, setOpenKey] = useState(null);   // statKey
  const [members, setMembers] = useState([]);
  const [mLoading, setMLoading] = useState(false);

  // 직전 기간 대비 '새로' 위험군에 진입한 회원 명단 + 이탈이유(top1~3) — 옆에 표시
  const [riskList, setRiskList] = useState([]);
  const [riskLoading, setRiskLoading] = useState(false);
  useEffect(() => {
    if (!gymId || !period) { setRiskList([]); return; }
    setRiskLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/riskMembers`
      + `?gymId=${gymId}&mode=${mode}&period=${period}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setRiskList)
      .catch((e) => { console.error('위험군 명단 조회 실패:', e); setRiskList([]); })
      .finally(() => setRiskLoading(false));
  }, [gymId, mode, period]);

  const toggle = async (statKey) => {
    if (openKey === statKey) { setOpenKey(null); setMembers([]); return; }
    setOpenKey(statKey); setMLoading(true); setMembers([]);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/members`
        + `?gymId=${gymId}&mode=${mode}&period=${period}`
        + `&statType=factor&statKey=${encodeURIComponent(statKey)}`);
      setMembers(res.ok ? await res.json() : []);
    } catch (e) {
      console.error('회원 명단 조회 실패:', e); setMembers([]);
    } finally { setMLoading(false); }
  };

  // 이탈 요인(주황)만 FACTOR_ORDER 고정 순서로 정렬
  const factorRank = (k) => { const i = FACTOR_ORDER.indexOf(k); return i === -1 ? FACTOR_ORDER.length : i; };
  const factors = items
    .filter((b) => b.statType === 'factor')
    .sort((a, b) => factorRank(a.statKey) - factorRank(b.statKey));

  const rows = [];
  factors.forEach((f) => {
    const open = openKey === f.statKey;
    rows.push(
      <StatRow key={f.statKey} open={open} onClick={() => toggle(f.statKey)}
        label={f.statKey} pct={f.pct} memberCount={f.memberCount} />
    );
    if (open) rows.push(<MemberListRow key={`${f.statKey}-m`} loading={mLoading} members={members} statKey={f.statKey} />);
  });

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* 왼쪽: 이탈요인 비율 (주황) */}
      <div style={{ flex: '1 1 520px', minWidth: 0, maxWidth: '620px' }}>
        <h4 style={{ marginBottom: '2px' }}>📌 이탈 요인 비율 <span style={{ fontSize: '13px', color: '#c62828' }}>(위험군 {riskMembers ?? 0}명 기준)</span></h4>
        <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 8px' }}>
          위험군(개입·긴급 등급) 회원 대상 · 주황 = 이탈 요인 비율(위험군 대비) · <b>요인 행을 누르면 해당 회원 명단</b>
        </p>
        {rows.length === 0 ? (
          <p style={{ color: '#888' }}>데이터 없음</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{rows}</tbody>
          </table>
        )}
      </div>

      {/* 오른쪽: 신규 위험군 회원 명단 (별도 컬럼 · 길면 내부 스크롤) */}
      <div style={{ flex: '0 1 380px', minWidth: '300px', border: '1px solid #ddd', borderRadius: '8px',
                    padding: '10px 12px', background: '#fbfbfb', alignSelf: 'stretch' }}>
        <h4 style={{ margin: '0 0 2px' }}>🚨 신규 위험군 회원 <span style={{ fontSize: '13px', color: '#c62828' }}>({riskList.length}명)</span></h4>
        <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 8px' }}>
          직전 {mode === 'daily' ? '날' : '달'} 대비 <b>새로</b> 위험군(개입·긴급)에 진입한 회원 + 이탈이유 Top3
        </p>
        {riskLoading ? (
          <p style={{ color: '#888', fontSize: '13px' }}>명단 불러오는 중…</p>
        ) : riskList.length === 0 ? (
          <p style={{ color: '#888', fontSize: '13px' }}>새로 진입한 위험군 회원이 없습니다.</p>
        ) : (
          <div style={{ maxHeight: '520px', overflowY: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
              <thead><tr style={{ color: '#888', textAlign: 'left', position: 'sticky', top: 0, background: '#fbfbfb' }}>
                <th style={{ padding: '2px 8px 4px 0' }}>회원</th>
                <th style={{ padding: '2px 8px 4px 0', textAlign: 'right' }}>이탈율</th>
                <th style={{ padding: '2px 0 4px' }}>이탈이유 (Top3)</th>
              </tr></thead>
              <tbody>
                {riskList.map((m) => (
                  <tr key={m.username} style={{ borderTop: '1px solid #eee' }}>
                    <td style={{ padding: '4px 8px 4px 0', whiteSpace: 'nowrap' }}>
                      {m.name}<br /><span style={{ color: '#999', fontSize: '11px' }}>{m.username}</span>
                    </td>
                    <td style={{ padding: '4px 8px 4px 0', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap',
                                 color: m.churnRate >= 0.5 ? '#c62828' : m.churnRate >= 0.25 ? '#ef6c00' : '#2e7d32' }}>
                      {(m.churnRate * 100).toFixed(1)}%
                    </td>
                    <td style={{ padding: '4px 0' }}>
                      {[m.top1Reason, m.top2Reason, m.top3Reason].filter(Boolean).map((rsn, i) => (
                        <span key={i} style={{ display: 'inline-block', background: '#fff', border: '1px solid #f0c9a8',
                                               color: '#ef6c00', borderRadius: '10px', padding: '1px 8px', margin: '1px 3px 1px 0', fontSize: '12px' }}>
                          {i + 1}. {rsn}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function B2bList() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const gymId = user.gymId;

  const [mode, setMode] = useState('daily');       // 'daily' | 'monthly'
  const [periods, setPeriods] = useState([]);      // [{period, totalMembers, avgChurnRate}]
  const [openPeriod, setOpenPeriod] = useState(null);   // 펼쳐진 기간
  const [breakdown, setBreakdown] = useState([]);  // [{statType, statKey, memberCount, pct}]
  const [loading, setLoading] = useState(false);

  // 기간 목록 조회 (mode 변경 시 재조회)
  useEffect(() => {
    if (!gymId) return;
    setOpenPeriod(null);
    setBreakdown([]);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/periods?gymId=${gymId}&mode=${mode}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setPeriods)
      .catch((e) => { console.error('기간 목록 조회 실패:', e); setPeriods([]); });
  }, [gymId, mode]);

  // 행 클릭 → 해당 기간 요인 비율 조회 (토글)
  const handleOpen = async (period) => {
    if (openPeriod === period) { setOpenPeriod(null); setBreakdown([]); return; }
    setOpenPeriod(period);
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/result/stats/breakdown?gymId=${gymId}&mode=${mode}&period=${period}`
      );
      setBreakdown(res.ok ? await res.json() : []);
    } catch (e) {
      console.error('상세 비율 조회 실패:', e);
      setBreakdown([]);
    } finally {
      setLoading(false);
    }
  };

  if (!gymId) {
    return <div style={{ padding: '20px' }}>로그인한 사장님의 헬스장 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '900px' }}>
      <h2>📊 헬스장 이탈 통계 ({user.name} 사장님)</h2>
      <p style={{ fontSize: '13px', color: '#666' }}>
        기간을 누르면 그 {mode === 'daily' ? '날' : '달'}의 이탈 요인 비율이 펼쳐집니다.
      </p>

      {/* 일별 / 월별 토글 */}
      <div style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
        {[['daily', '일별'], ['monthly', '월별']].map(([m, label]) => (
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

      {periods.length === 0 ? (
        <p>집계된 통계 데이터가 없습니다. (배치 실행 후 표시됩니다)</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead style={{ background: '#f5f5f5' }}>
            <tr>
              <th style={{ padding: '8px' }}>{mode === 'daily' ? '날짜' : '월'}</th>
              <th style={{ padding: '8px' }}>회원 수</th>
              <th style={{ padding: '8px' }}>위험군</th>
              <th style={{ padding: '8px' }}>이탈율</th>
              <th style={{ padding: '8px' }}>상세</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <Fragment key={p.period}>
                <tr
                  onClick={() => handleOpen(p.period)}
                  style={{ cursor: 'pointer', background: openPeriod === p.period ? '#eef6ff' : '#fff' }}
                >
                  <td style={{ padding: '8px', fontWeight: 'bold' }}>{p.period}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{p.totalMembers}명</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#c62828' }}>{p.riskMembers ?? 0}명</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <strong style={{ color: p.avgChurnRate >= 0.5 ? '#c62828' : p.avgChurnRate >= 0.25 ? '#ef6c00' : '#2e7d32' }}>
                      {(p.avgChurnRate * 100).toFixed(1)}%
                    </strong>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{openPeriod === p.period ? '▲ 닫기' : '▼ 열기'}</td>
                </tr>

                {openPeriod === p.period && (
                  <tr>
                    <td colSpan={5} style={{ padding: '16px', background: '#fafafa' }}>
                      {loading ? <p>불러오는 중…</p> : <Breakdown items={breakdown} riskMembers={p.riskMembers} gymId={gymId} mode={mode} period={p.period} />}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: '20px' }}>
        <Link to="/fitb/b2bmypage">← 마이페이지로</Link>
      </div>
    </div>
  );
}

export default B2bList;
