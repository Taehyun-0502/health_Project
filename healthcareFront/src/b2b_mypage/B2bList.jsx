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
// 불만 비율 표시에서 제외할 항목
const HIDDEN_COMPLAINTS = new Set([
  '서비스불만_락커샤워시설불편', '가격불만_타헬스장비교', '기구불만_원하는기구없음', '직원불만_관심부족',
]);

// 불만 항목(stat_key) → 옆에 띄울 조치 도우미
//  type 'dead'     : 아직 기능 없는 버튼(자리만)
//  type 'trainers' : 그 헬스장 트레이너(직원) 명단 조회
//  type 'time'     : 불편회원(비매너) 경험 회원들의 최빈 방문 시간대 조회
//  ※ 기구불만_* 은 기존 '기구 목록' 패널이 이미 커버 → 여기서 다루지 않음
const HELPER_MAP = {
  '서비스불만_환경불편': { type: 'dead', label: '헬퍼 호출' },
  '서비스불만_비매너회원': { type: 'time', statKey: '서비스불만_비매너회원' },
  '서비스불만_프로그램불만족': { type: 'dead', label: '다른 헬스장 프로그램 목록 보러가기' },
  '직원불만_불친절': { type: 'dead', label: '교육 프로그램 리스트 보러가기' },
  '직원불만_전문성부족': { type: 'trainers' },
  '직원불만_과도한영업': { type: 'time', statKey: '직원불만_과도한영업' },
  '가격불만_할인부족': { type: 'dead', label: '쿠폰 발급하러 가기' },
  '가격불만_가격비쌈': { type: 'dead', label: '다른 헬스장 금액 보러가기' },
};

// 비율 막대
function Bar({ pct, color }) {
  return (
    <div style={{ background: '#eee', borderRadius: '4px', height: '14px', width: '100%', minWidth: '80px' }}>
      <div style={{ background: color, width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: '4px' }} />
    </div>
  );
}

// 요인/불만 한 행 (statKey가 있으면 클릭 → 회원 명단 토글)
function StatRow({ label, pct, memberCount, bold, indent, color, clickable, open, onClick }) {
  return (
    <tr onClick={clickable ? onClick : undefined}
        style={{ background: open ? '#fff3e0' : bold ? '#f0f6ff' : '#fff', cursor: clickable ? 'pointer' : 'default' }}>
      <td style={{ padding: bold ? '6px 8px' : '4px 8px', paddingLeft: indent ? '28px' : '8px',
                   whiteSpace: 'nowrap', fontWeight: bold ? 'bold' : 'normal', color: indent ? '#555' : '#000' }}>
        {indent ? '└ ' : ''}{label}{clickable ? <span style={{ color: '#999', fontSize: '11px' }}>{open ? ' ▲' : ' ▼'}</span> : ''}
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

// 회원 명단 하위행 (요인/불만 로우 클릭 시)
function MemberListRow({ loading, members }) {
  return (
    <tr>
      <td colSpan={3} style={{ padding: '6px 8px 10px 28px', background: '#fffdf5' }}>
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

// 특정 불만이 예측된 회원들의 최빈 방문 시간대 위젯 (statKey 별로 독립 조회)
function TimeSlotWidget({ gymId, mode, period, statKey }) {
  const [times, setTimes] = useState([]);
  useEffect(() => {
    if (!gymId || !period || !statKey) { setTimes([]); return; }
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/helper/complaintVisitTimes`
      + `?gymId=${gymId}&mode=${mode}&period=${period}&statKey=${encodeURIComponent(statKey)}`)
      .then((r) => (r.ok ? r.json() : [])).then(setTimes)
      .catch((e) => { console.error('시간대 조회 실패:', e); setTimes([]); });
  }, [gymId, mode, period, statKey]);

  if (times.length === 0) return <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>방문 기록이 없습니다.</p>;
  return (
    <div>
      <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
        최빈 방문 시간대: <b style={{ color: '#1565c0' }}>{times[0].slot}</b> <span style={{ color: '#999' }}>({times[0].cnt}회)</span>
      </p>
      <table style={{ borderCollapse: 'collapse', fontSize: '12px', width: '100%', color: '#555' }}>
        <tbody>
          {times.map((t) => (
            <tr key={t.slot}>
              <td style={{ padding: '1px 8px 1px 0' }}>{t.slot}</td>
              <td style={{ padding: '1px 0', textAlign: 'right' }}>{t.cnt}회</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 불만 항목별 조치 도우미 패널 (HELPER_MAP 에 매핑된 불만이 뜨면 옆에 표시)
function ComplaintHelpers({ items, gymId, mode, period }) {
  // 화면에 보이는 불만 중 도우미가 매핑된 것만 추림
  const matched = items.filter(
    (b) => b.statType === 'complaint' && !HIDDEN_COMPLAINTS.has(b.statKey) && HELPER_MAP[b.statKey]
  );

  // 같은 도우미는 하나로 묶고, 유발한 불만 라벨만 합침
  //  · 시간대(time)는 불만 키마다 대상 회원이 다르므로 statKey 별로 분리
  const helpers = [];
  const seen = new Map();
  matched.forEach((b) => {
    const def = HELPER_MAP[b.statKey];
    const key = def.type === 'dead' ? `dead:${def.label}`
      : def.type === 'time' ? `time:${def.statKey}` : def.type;
    const reason = b.statKey.slice(b.statKey.indexOf('_') + 1);
    if (!seen.has(key)) { const h = { def, reasons: [reason] }; seen.set(key, h); helpers.push(h); }
    else seen.get(key).reasons.push(reason);
  });

  const needTrainers = helpers.some((h) => h.def.type === 'trainers');
  const [trainers, setTrainers] = useState([]);
  useEffect(() => {
    if (!needTrainers || !gymId) { setTrainers([]); return; }
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/helper/trainers?gymId=${gymId}`)
      .then((r) => (r.ok ? r.json() : [])).then(setTrainers)
      .catch((e) => { console.error('트레이너 명단 조회 실패:', e); setTrainers([]); });
  }, [needTrainers, gymId]);

  if (helpers.length === 0) return null;

  const deadBtn = { padding: '6px 12px', borderRadius: '6px', border: '1px solid #bbb',
                    background: '#f4f4f4', color: '#666', cursor: 'not-allowed', fontSize: '13px' };

  return (
    <div style={{ flex: '1 1 300px', maxWidth: '380px', border: '1px solid #ddd', borderRadius: '8px', padding: '10px 12px', background: '#fbfbfb' }}>
      <h4 style={{ margin: '0 0 8px' }}>🛠️ 불만 조치 도우미</h4>
      {helpers.map((h, i) => (
        <div key={i} style={{ borderTop: i ? '1px solid #eee' : 'none', padding: '8px 0' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ef6c00', marginBottom: '4px' }}>
            {h.reasons.join(', ')}
          </div>

          {h.def.type === 'dead' && (
            <button style={deadBtn} title="준비 중인 기능입니다" onClick={(e) => e.preventDefault()}>
              {h.def.label}
            </button>
          )}

          {h.def.type === 'trainers' && (
            trainers.length === 0
              ? <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>등록된 트레이너가 없습니다.</p>
              : (
                <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
                  <thead><tr style={{ color: '#888', textAlign: 'left' }}>
                    <th style={{ padding: '2px 8px 2px 0' }}>트레이너</th>
                    <th style={{ padding: '2px 0' }}>연락처(ID)</th>
                  </tr></thead>
                  <tbody>
                    {trainers.map((t) => (
                      <tr key={t.username}>
                        <td style={{ padding: '2px 8px 2px 0' }}>{t.name}</td>
                        <td style={{ padding: '2px 0', color: '#666' }}>{t.username}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          )}

          {h.def.type === 'time' && (
            <TimeSlotWidget gymId={gymId} mode={mode} period={period} statKey={h.def.statKey} />
          )}
        </div>
      ))}
    </div>
  );
}

// 이탈 요인 + 불만 이유를 하나로 합쳐 렌더 (불만은 해당 카테고리 요인 밑에 들여써서)
// 요인/불만 로우 클릭 → 그 항목을 가진 위험군 회원 명단(+이탈율) 조회
function Breakdown({ items, riskMembers, gymId, mode, period }) {
  const [openKey, setOpenKey] = useState(null);   // `${statType}|${statKey}`
  const [members, setMembers] = useState([]);
  const [mLoading, setMLoading] = useState(false);

  // 기구불만 카테고리가 뜨면 그 헬스장의 '기구' 아이템 목록을 옆에 표시
  const hasEquip = items.some((b) => b.statType === 'complaint' && !HIDDEN_COMPLAINTS.has(b.statKey) && b.statKey.startsWith('기구불만'));
  const [equipItems, setEquipItems] = useState([]);
  useEffect(() => {
    if (!hasEquip || !gymId) { setEquipItems([]); return; }
    fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/byCategory?gymId=${gymId}&category=${encodeURIComponent('기구')}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setEquipItems)
      .catch((e) => { console.error('기구 목록 조회 실패:', e); setEquipItems([]); });
  }, [hasEquip, gymId]);

  // 직전 기간 대비 '새로' 위험군에 진입한 회원 명단 + 이탈이유(h_churn_result top1~3) — 옆에 표시
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

  const toggle = async (statType, statKey) => {
    const key = `${statType}|${statKey}`;
    if (openKey === key) { setOpenKey(null); setMembers([]); return; }
    setOpenKey(key); setMLoading(true); setMembers([]);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/members`
        + `?gymId=${gymId}&mode=${mode}&period=${period}`
        + `&statType=${statType}&statKey=${encodeURIComponent(statKey)}`);
      setMembers(res.ok ? await res.json() : []);
    } catch (e) {
      console.error('회원 명단 조회 실패:', e); setMembers([]);
    } finally { setMLoading(false); }
  };

  // '가입 초기'(총_이용개월수)는 이탈요인 표시에서 제외
  const factors = items.filter((b) => b.statType === 'factor' && b.statKey !== '총_이용개월수');
  const complaints = items.filter((b) => b.statType === 'complaint' && !HIDDEN_COMPLAINTS.has(b.statKey));

  const byCat = {};
  complaints.forEach((c) => {
    const cat = c.statKey.slice(0, c.statKey.indexOf('_'));
    (byCat[cat] = byCat[cat] || []).push(c);
  });

  const rows = [];
  const pushClickable = (statType, statKey, props) => {
    const key = `${statType}|${statKey}`;
    const open = openKey === key;
    rows.push(<StatRow key={key} {...props} clickable open={open} onClick={() => toggle(statType, statKey)} />);
    if (open) rows.push(<MemberListRow key={`${key}-m`} loading={mLoading} members={members} />);
  };

  // 불만 %는 '해당 카테고리(탭) 안에서의 비율'로 정규화 → 탭 안 합계 100%
  const pushComplaints = (cat) => {
    const list = byCat[cat] || [];
    const catTotal = list.reduce((s, c) => s + (c.memberCount || 0), 0);
    list.forEach((c) => {
      const pctInCat = catTotal ? Math.round((c.memberCount / catTotal) * 1000) / 10 : 0;
      pushClickable('complaint', c.statKey, {
        indent: true, color: '#1565c0', label: c.statKey.slice(cat.length + 1),
        pct: pctInCat, memberCount: c.memberCount,
      });
    });
  };

  const shownCats = new Set();
  factors.forEach((f) => {
    const cat = FACTOR_TO_CAT[f.statKey];
    pushClickable('factor', f.statKey, {
      bold: true, color: '#ef6c00',
      label: cat ? CAT_LABEL[cat] : (FACTOR_LABEL[f.statKey] || f.statKey),
      pct: f.pct, memberCount: f.memberCount,
    });
    if (cat) { shownCats.add(cat); pushComplaints(cat); }
  });
  // 요인엔 없지만 불만은 있는 카테고리 → 헤더(비율 없음, 클릭 불가) + 세부 불만
  Object.keys(byCat).forEach((cat) => {
    if (shownCats.has(cat)) return;
    rows.push(<StatRow key={`cat-${cat}`} bold label={CAT_LABEL[cat] || cat} pct={null} />);
    pushComplaints(cat);
  });

  if (rows.length === 0) return <p style={{ color: '#888' }}>데이터 없음</p>;

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* 왼쪽: 이탈요인/불만 비율 + 기구목록 + 조치도우미 */}
      <div style={{ flex: '1 1 560px', minWidth: 0, display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 520px', maxWidth: '620px' }}>
          <h4 style={{ marginBottom: '2px' }}>📌 이탈 요인 &amp; 불만 비율 <span style={{ fontSize: '13px', color: '#c62828' }}>(위험군 {riskMembers ?? 0}명 기준)</span></h4>
          <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 8px' }}>
            위험군(개입·긴급 등급) 회원만 대상 · 주황 = 이탈 요인 비율(위험군 대비) · 파랑(└) = 카테고리 안 세부 불만 비율(합 100%) · <b>행을 누르면 해당 회원 명단</b>
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>{rows}</tbody>
          </table>
        </div>

        {hasEquip && (
          <div style={{ flex: '0 1 260px', border: '1px solid #ddd', borderRadius: '8px', padding: '10px 12px', background: '#fbfbfb' }}>
            <h4 style={{ margin: '0 0 6px' }}>🏋️ 이 헬스장 기구 목록</h4>
            {equipItems.length === 0 ? (
              <p style={{ color: '#888', fontSize: '13px' }}>등록된 기구가 없습니다.</p>
            ) : (
              <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
                <thead><tr style={{ color: '#888' }}>
                  <th style={{ textAlign: 'left', padding: '2px 8px 2px 0' }}>기구명</th>
                  <th style={{ textAlign: 'right', padding: '2px 0' }}>수량</th>
                </tr></thead>
                <tbody>
                  {equipItems.map((it) => (
                    <tr key={it.itemName}>
                      <td style={{ padding: '2px 8px 2px 0' }}>{it.itemName}</td>
                      <td style={{ padding: '2px 0', textAlign: 'right' }}>{it.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        <ComplaintHelpers items={items} gymId={gymId} mode={mode} period={period} />
      </div>

      {/* 오른쪽: 신규 위험군 회원 명단 (별도 컬럼 · 길면 내부 스크롤) */}
      <div style={{ flex: '0 1 380px', minWidth: '300px', border: '1px solid #ddd', borderRadius: '8px',
                    padding: '10px 12px', background: '#fbfbfb', alignSelf: 'stretch' }}>
        <h4 style={{ margin: '0 0 2px' }}>🚨 신규 위험군 회원 <span style={{ fontSize: '13px', color: '#c62828' }}>({riskList.length}명)</span></h4>
        <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 8px' }}>
          직전 {mode === 'daily' ? '날' : '달'} 대비 <b>새로</b> 위험군(개입·긴급)에 진입한 회원 + 이탈이유 Top3 (h_churn_result 기준)
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
