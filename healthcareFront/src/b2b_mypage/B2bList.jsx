import { useState, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';

// 이탈요인 피처키 → 표시 라벨 (predict.py _LABEL 의 '이탈↑' 방향과 동일)
const FACTOR_LABEL = {
  '상대_방문공백': '평소보다 오래 결석',
  '이번달_주당방문횟수': '방문 적음',
  'PT_가입여부': 'PT 미가입',
  '그룹수업_참여': '그룹수업 미참여',
  '총_이용개월수': '가입 초기',
  '기구_만족도': '기구 불만족',
  '직원_만족도': '직원 불만족',
  '서비스_만족도': '서비스 불만족',
  '가격_만족도': '가격 불만족',
  '최근한달_부상경험': '최근 부상',
  '불편_회원_경험': '불편 경험',
  '최근한달_일평균_운동시간': '운동시간 짧음',
  '주_이용_시간대_혼잡도': '혼잡시간대 이용',
  '나이': '위험 연령대(젊은층/고령층)',
};

// 불만족 이탈요인(만족도 피처) → 불만 항목 카테고리 접두어 (app.py cat_mapping 과 동일)
const FACTOR_TO_CAT = {
  '가격_만족도': '가격불만',
  '기구_만족도': '기구불만',
  '직원_만족도': '직원불만',
  '서비스_만족도': '서비스불만',
};
// 카테고리 헤더 라벨 (요인 리스트에 만족도 요인이 안 떠도 불만이 있으면 이 헤더로 표시)
const CAT_LABEL = {
  '가격불만': '💸 가격 불만족',
  '기구불만': '🏋️ 기구 불만족',
  '직원불만': '👤 직원 불만족',
  '서비스불만': '🧼 서비스 불만족',
};

// 비율 막대
function Bar({ pct, color }) {
  return (
    <div style={{ background: '#eee', borderRadius: '4px', height: '14px', width: '100%', minWidth: '80px' }}>
      <div style={{ background: color, width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: '4px' }} />
    </div>
  );
}

// 요인 행 + (만족도 요인이면) 그 카테고리 세부 불만 하위행
function StatRow({ label, pct, memberCount, bold, indent, color }) {
  return (
    <tr style={{ background: bold ? '#f0f6ff' : '#fff' }}>
      <td style={{ padding: bold ? '6px 8px' : '4px 8px', paddingLeft: indent ? '28px' : '8px',
                   whiteSpace: 'nowrap', fontWeight: bold ? 'bold' : 'normal', color: indent ? '#555' : '#000' }}>
        {indent ? '└ ' : ''}{label}
      </td>
      <td style={{ padding: '4px 8px', width: '45%' }}>{pct != null ? <Bar pct={pct} color={color} /> : null}</td>
      <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {pct != null ? (
          <><strong>{pct}%</strong> <span style={{ color: '#999', fontSize: '12px' }}>({memberCount}명)</span></>
        ) : null}
      </td>
    </tr>
  );
}

// 이탈 요인 + 불만 이유를 하나로 합쳐 렌더 (불만은 해당 카테고리 요인 밑에 들여써서)
function Breakdown({ items }) {
  const factors = items.filter((b) => b.statType === 'factor');
  const complaints = items.filter((b) => b.statType === 'complaint');

  // 카테고리별 불만 묶기 ('가격불만_할인부족' → 'gap'가격불만)
  const byCat = {};
  complaints.forEach((c) => {
    const cat = c.statKey.slice(0, c.statKey.indexOf('_'));
    (byCat[cat] = byCat[cat] || []).push(c);
  });

  // 불만 %는 '해당 카테고리(탭) 안에서의 비율'로 정규화 → 탭 안 합계 100%
  const complaintRows = (cat) => {
    const list = byCat[cat] || [];
    const catTotal = list.reduce((s, c) => s + (c.memberCount || 0), 0);
    return list.map((c) => {
      const pctInCat = catTotal ? Math.round((c.memberCount / catTotal) * 1000) / 10 : 0;
      return (
        <StatRow key={c.statKey} indent color="#1565c0"
                 label={c.statKey.slice(cat.length + 1)} pct={pctInCat} memberCount={c.memberCount} />
      );
    });
  };

  const rows = [];
  const shownCats = new Set();
  factors.forEach((f) => {
    const cat = FACTOR_TO_CAT[f.statKey];
    rows.push(
      <StatRow key={f.statKey} bold color="#ef6c00"
               label={cat ? CAT_LABEL[cat] : (FACTOR_LABEL[f.statKey] || f.statKey)}
               pct={f.pct} memberCount={f.memberCount} />
    );
    if (cat) { shownCats.add(cat); complaintRows(cat).forEach((r) => rows.push(r)); }
  });
  // 요인엔 없지만 불만은 있는 카테고리 → 헤더(비율 없음) + 세부 불만
  Object.keys(byCat).forEach((cat) => {
    if (shownCats.has(cat)) return;
    rows.push(<StatRow key={`cat-${cat}`} bold label={CAT_LABEL[cat] || cat} pct={null} />);
    complaintRows(cat).forEach((r) => rows.push(r));
  });

  if (rows.length === 0) return <p style={{ color: '#888' }}>데이터 없음</p>;

  return (
    <div style={{ maxWidth: '620px' }}>
      <h4 style={{ marginBottom: '2px' }}>📌 이탈 요인 &amp; 불만 비율</h4>
      <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 8px' }}>
        주황 = 이탈 요인 비율(전체 회원 대비) · 파랑(└ 들여쓰기) = 그 불만 카테고리(탭) 안에서의 세부 불만 비율(합 100%)
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>{rows}</tbody>
      </table>
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

  // 행 클릭 → 해당 기간 요인/불만 비율 조회 (토글)
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
        기간을 누르면 그 {mode === 'daily' ? '날' : '달'}의 이탈 요인·불만 이유 비율이 펼쳐집니다.
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
                  <td style={{ padding: '8px', textAlign: 'center' }}>
                    <strong style={{ color: p.avgChurnRate >= 0.5 ? '#c62828' : p.avgChurnRate >= 0.25 ? '#ef6c00' : '#2e7d32' }}>
                      {(p.avgChurnRate * 100).toFixed(1)}%
                    </strong>
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{openPeriod === p.period ? '▲ 닫기' : '▼ 열기'}</td>
                </tr>

                {openPeriod === p.period && (
                  <tr>
                    <td colSpan={4} style={{ padding: '16px', background: '#fafafa' }}>
                      {loading ? <p>불러오는 중…</p> : <Breakdown items={breakdown} />}
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
