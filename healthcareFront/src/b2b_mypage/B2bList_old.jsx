import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './B2bList_old.css';

// 바 이름은 모델 피처키(컬럼명, statKey)를 그대로 노출한다.

// 이탈 요인 표시 고정 순서 (이 순서대로 위→아래로 노출, 목록에 없는 요인은 뒤로)
const FACTOR_ORDER = [
  '나이',
  '이번달_주당방문횟수',
  '총_이용개월수',
  '상대_방문공백',
  '일평균_운동시간',
  '주_이용_시간대_혼잡도',
  '그룹수업_참여',
  'PT_가입여부',
  '최근한달_부상경험',
  '서비스불만_환경불편',
  '서비스불만_비매너회원',
  '기구불만_기구부족',
  '기구불만_기구상태불만',
  '직원불만_불친절',
  '직원불만_전문성부족',
  '가격불만',
];

// 모델 피처키(statKey) → 사용자용 자연어 라벨 (표시 전용, 매칭 로직은 원래 키 그대로 사용)
const FACTOR_LABEL = {
  '나이': '나이',
  '이번달_주당방문횟수': '주당 방문 감소',
  '총_이용개월수': '이용 기간',
  '상대_방문공백': '방문 공백',
  '일평균_운동시간': '운동시간 저조',
  '주_이용_시간대_혼잡도': '시간대 혼잡',
  '그룹수업_참여': '그룹수업 미참여',
  'PT_가입여부': 'PT 미가입',
  '최근한달_부상경험': '최근 부상',
  '서비스불만_환경불편': '환경 불편',
  '서비스불만_비매너회원': '비매너 회원',
  '기구불만_기구부족': '기구 부족',
  '기구불만_기구상태불만': '기구 상태 불만',
  '직원불만_불친절': '직원 불친절',
  '직원불만_전문성부족': '전문성 부족',
  '가격불만': '가격 불만',
};
const factorLabel = (k) => FACTOR_LABEL[k] || String(k || '').replace(/_/g, ' ');

// 불만족 요인별 액션 버튼 라벨 (기능 미구현 — 버튼만 노출)
const FACTOR_ACTION = {
  '서비스불만_환경불편': '헬퍼 요청',
  '직원불만_불친절': '교육 프로그램 제공',
  '가격불만': '쿠폰',
  'PT_가입여부': 'PT체험권 발송',
  '최근한달_부상경험': 'PT체험권 발송',
  '일평균_운동시간': '목표 설정 알림 발송',
};

// 이 요인은 버튼 대신 '그 요인을 가진 회원들의 방문 시간대 분포'를 옆에 띄운다
const VISIT_TIME_FACTOR = '서비스불만_비매너회원';
// 이 요인은 버튼 대신 '그 헬스장 기구 목록'을 옆에 띄운다
const EQUIP_FACTOR = '기구불만_기구부족';
// 이 요인은 버튼 대신 '그 요인을 가진 회원들의 담당자(계약 manager_id)'를 옆에 띄운다
const MANAGER_FACTOR = '직원불만_전문성부족';
// 이 요인은 버튼 대신 '서비스센터 전체 목록'을 옆에 띄운다
const SERVICE_CENTER_FACTOR = '기구불만_기구상태불만';
// 이 요인의 버튼을 누르면 프로모션(쿠폰 발행) 페이지로 이동
const COUPON_FACTOR = '가격불만';
// 이 요인의 버튼(헬퍼)을 누르면 헬퍼 요청 팝업 → h_helper 등록
const HELPER_FACTOR = '서비스불만_환경불편';
// 이 요인들의 버튼(PT체험권 발송)을 누르면 쿠폰 발송 팝업 → 오늘자 위험군 회원에게 쿠폰 발송
const PT_TRIAL_FACTORS = ['PT_가입여부', '최근한달_부상경험'];

// 방문 시간대 표시 순서(시간순)
const SLOT_ORDER = ['새벽(00-06)', '오전(06-11)', '점심(11-14)', '오후(14-18)', '저녁(18-22)', '야간(22-24)'];

// 이탈률(0~1) → 위험 등급 (모델 tier_edges [25,45,65] 와 일치)
function tierOf(rate) {
  const s = (Number(rate) || 0) * 100;
  if (s < 25) return { label: '안정', cls: 'good' };
  if (s < 45) return { label: '관찰', cls: 'warn' };
  if (s < 65) return { label: '개입', cls: 'serious' };
  return { label: '긴급', cls: 'crit' };
}

// 달력 그리드 (일별 선택) — 날짜별 이탈 등급 점 표시
function CalendarGrid({ periods, value, onPick }) {
  const tierByDate = {};
  periods.forEach((p) => { tierByDate[p.period] = tierOf(p.avgChurnRate).cls; });
  const pad = (n) => String(n).padStart(2, '0');
  const initDate = value || periods[0]?.period || new Date().toISOString().slice(0, 10);
  const [ym, setYm] = useState(() => {
    const parts = String(initDate).split('-').map(Number);
    return { y: parts[0], m: parts[1] };
  });
  const firstDow = new Date(ym.y, ym.m - 1, 1).getDay();
  const daysInMonth = new Date(ym.y, ym.m, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
  const prevMonth = () => setYm((s) => (s.m === 1 ? { y: s.y - 1, m: 12 } : { y: s.y, m: s.m - 1 }));
  const nextMonth = () => setYm((s) => (s.m === 12 ? { y: s.y + 1, m: 1 } : { y: s.y, m: s.m + 1 }));

  return (
    <>
      <div className="cs-cal-head">
        <button type="button" onClick={prevMonth} aria-label="이전 달">‹</button>
        <span>{ym.y}년 {ym.m}월</span>
        <button type="button" onClick={nextMonth} aria-label="다음 달">›</button>
      </div>
      <div className="cs-cal-grid cs-cal-dow">
        {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
          <span key={d} className="cs-cal-dow-cell">{d}</span>
        ))}
      </div>
      <div className="cs-cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} />;
          const ds = `${ym.y}-${pad(ym.m)}-${pad(d)}`;
          const cls = tierByDate[ds];
          const sel = value === ds;
          return (
            <button
              key={ds}
              type="button"
              className={`cs-cal-day${cls ? ' has-data' : ''}${sel ? ' is-sel' : ''}`}
              disabled={!cls}
              onClick={() => onPick(ds)}
            >
              {d}
              {cls && <i className={`cs-cal-dot cs-bg-${cls}`} />}
            </button>
          );
        })}
      </div>
    </>
  );
}

// 월 목록 (월별 선택)
function MonthList({ periods, value, onPick }) {
  return (
    <div className="cs-monthlist">
      {periods.map((p) => (
        <button
          key={p.period}
          type="button"
          className={`cs-month-item${value === p.period ? ' is-sel' : ''}`}
          onClick={() => onPick(p.period)}
        >
          <span>{p.period}</span>
          <i className={`cs-cal-dot cs-bg-${tierOf(p.avgChurnRate).cls}`} />
        </button>
      ))}
    </div>
  );
}

// 날짜 선택 겸 '전체 회원' KPI — variant: 'card'(KPI 카드) | 'compact'(고정 헤더바)
function PeriodPicker({ mode, periods, value, onPick, total, variant }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const pick = (v) => { onPick(v); setOpen(false); };

  return (
    <div className={`cs-periodpick${variant === 'compact' ? ' compact' : ''}`} ref={ref}>
      {variant === 'compact' ? (
        <button type="button" className="cs-kpi-float-item is-btn" aria-expanded={open} title="날짜 선택"
                onClick={() => setOpen((o) => !o)}>
          <span className="cs-kpi-float-ico">📅</span>
          <span className="cs-kpi-float-label">{value || '날짜'}</span>
          <span className="cs-kpi-float-val cs-num">{total}명</span>
        </button>
      ) : (
        <button type="button" className="cs-kpi cs-kpi-btn" aria-expanded={open} title="날짜 선택"
                onClick={() => setOpen((o) => !o)}>
          <div className="cs-kpi-ico">📅</div>
          <div className="cs-kpi-body">
            <div className="cs-kpi-label">전체 회원</div>
            <div className="cs-kpi-value cs-num">{total}<small>명</small></div>
            <div className="cs-kpi-sub">{value || '날짜 선택'}</div>
          </div>
        </button>
      )}
      {open && (
        <div className="cs-period-pop">
          {mode === 'daily'
            ? <CalendarGrid periods={periods} value={value} onPick={pick} />
            : <MonthList periods={periods} value={value} onPick={pick} />}
        </div>
      )}
    </div>
  );
}

// 서비스불만_비매너회원 요인을 가진 위험군 회원들이 주로 언제 오는지 (방문 시간대 분포)
function VisitTimePanel({ gymId, mode, period, statKey }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gymId || !period) { setSlots([]); return; }
    setLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/helper/complaintVisitTimes`
      + `?gymId=${gymId}&mode=${mode}&period=${period}&statKey=${encodeURIComponent(statKey)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setSlots(Array.isArray(d) ? d : []))
      .catch((e) => { console.error('방문 시간대 조회 실패:', e); setSlots([]); })
      .finally(() => setLoading(false));
  }, [gymId, mode, period, statKey]);

  const sorted = [...slots].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  const total = slots.reduce((s, x) => s + Number(x.cnt || 0), 0);
  const max = slots.reduce((m, x) => Math.max(m, Number(x.cnt || 0)), 0) || 1;
  const peak = slots.reduce((p, x) => (Number(x.cnt || 0) > Number(p?.cnt || 0) ? x : p), null);

  return (
    <div className="cs-side">
      <h5>🕒 이 회원들이 주로 오는 시간대</h5>
      {loading ? (
        <p className="cs-loading">불러오는 중…</p>
      ) : total === 0 ? (
        <p className="cs-empty">방문 기록이 없습니다.</p>
      ) : (
        <>
          <p className="cs-hint" style={{ marginBottom: '8px' }}>
            총 <b>{total}</b>회 방문 · 피크 <b className="cs-accent">{peak?.slot}</b>
          </p>
          <div className="cs-side-body">
            <table>
              <tbody>
                {sorted.map((x) => {
                  const cnt = Number(x.cnt || 0);
                  return (
                    <tr key={x.slot}>
                      <td className="cs-slot-name">{x.slot}</td>
                      <td style={{ width: '100%' }}>
                        <div className="cs-slotbar"><i style={{ width: `${(cnt / max) * 100}%` }} /></div>
                      </td>
                      <td className="r cs-num">{cnt}회</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// 기구불만_기구부족 요인일 때 옆에 띄우는 그 헬스장 기구 목록
function EquipmentPanel({ gymId }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gymId) { setItems([]); return; }
    setLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/itempage/byCategory`
      + `?gymId=${gymId}&category=${encodeURIComponent('기구')}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch((e) => { console.error('기구 목록 조회 실패:', e); setItems([]); })
      .finally(() => setLoading(false));
  }, [gymId]);

  const sorted = [...items].sort((a, b) => Number(b.itemCount || 0) - Number(a.itemCount || 0));

  return (
    <div className="cs-side">
      <h5>🏋️ 이 헬스장 기구 목록</h5>
      {loading ? (
        <p className="cs-loading">불러오는 중…</p>
      ) : sorted.length === 0 ? (
        <p className="cs-empty">등록된 기구가 없습니다.</p>
      ) : (
        <div className="cs-side-body">
          <table>
            <thead><tr><th className="cs-eq-name">기구명</th><th className="r">보유 수량</th></tr></thead>
            <tbody>
              {sorted.map((it) => (
                <tr key={it.itemName}>
                  <td className="cs-eq-name">{it.itemName}</td>
                  <td className="r cs-num">{it.itemCount}대</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// 직원불만_전문성부족 요인을 가진 회원들의 담당자(계약 manager_id) 명단
function ManagerPanel({ gymId, mode, period, statKey }) {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!gymId || !period) { setList([]); return; }
    setLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/helper/complaintManagers`
      + `?gymId=${gymId}&mode=${mode}&period=${period}&statKey=${encodeURIComponent(statKey)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setList(Array.isArray(d) ? d : []))
      .catch((e) => { console.error('담당자 조회 실패:', e); setList([]); })
      .finally(() => setLoading(false));
  }, [gymId, mode, period, statKey]);

  // 담당자별 회원 수 집계 (응답 행 = 회원 1명 + 담당자, managerId 기준 그룹)
  const byManager = {};
  list.forEach((m) => {
    const id = m.managerId ?? m.managerName;
    if (!byManager[id]) byManager[id] = { managerId: id, managerName: m.managerName, cnt: 0 };
    byManager[id].cnt += 1;
  });
  const managers = Object.values(byManager).sort((a, b) => b.cnt - a.cnt);
  const total = list.length;
  const max = managers.reduce((mx, x) => Math.max(mx, x.cnt), 0) || 1;
  const top = managers[0] || null;

  return (
    <div className="cs-side">
      <h5>🧑‍🏫 이 회원들의 담당자</h5>
      {loading ? (
        <p className="cs-loading">불러오는 중…</p>
      ) : managers.length === 0 ? (
        <p className="cs-empty">배정된 담당자가 없습니다.</p>
      ) : (
        <>
          <p className="cs-hint" style={{ marginBottom: '8px' }}>
            총 <b>{total}</b>명 · 최다 <b className="cs-accent">{top?.managerName}</b>
          </p>
          <div className="cs-side-body">
            <table>
              <tbody>
                {managers.map((x) => (
                  <tr key={x.managerId}>
                    <td className="cs-slot-name">{x.managerName}</td>
                    <td style={{ width: '100%' }}>
                      <div className="cs-slotbar"><i style={{ width: `${(x.cnt / max) * 100}%` }} /></div>
                    </td>
                    <td className="r cs-num">{x.cnt}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// 기구불만_기구상태불만 요인일 때 옆에 띄우는 서비스센터 전체 목록
function ServiceCenterPanel() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/helper/serviceCenters`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCenters(Array.isArray(d) ? d : []))
      .catch((e) => { console.error('서비스센터 조회 실패:', e); setCenters([]); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="cs-side cs-side-sc">
      <h5>🛠️ 서비스센터 목록</h5>
      {loading ? (
        <p className="cs-loading">불러오는 중…</p>
      ) : centers.length === 0 ? (
        <p className="cs-empty">등록된 서비스센터가 없습니다.</p>
      ) : (
        <div className="cs-side-body cs-center-list">
          {centers.map((c) => (
            <div key={c.centerId} className="cs-center">
              <div className="cs-center-name">
                {c.centerName}
                {c.brandName && c.brandName !== c.centerName && (
                  <span className="cs-muted cs-center-brand"> ({c.brandName})</span>
                )}
                <span className={`cs-center-repair ${c.onsiteRepair ? 'cs-good' : 'cs-crit'}`}>
                  {c.onsiteRepair ? '✔ 출장 수리 가능' : '✕ 출장 수리 불가'}
                </span>
              </div>
              <div className="cs-ink-2">📞 {c.centerPhone || '-'}</div>
              {c.operatingHours && <div className="cs-muted cs-center-hours">🕒 {c.operatingHours}</div>}
              {c.url && (<a href={c.url} target="_blank" rel="noreferrer">홈페이지 바로가기 ↗</a>)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 요인 선택 시 오른쪽 칸에 뜨는 상세 — 회원 명단 + 액션 버튼/팝업 + 사이드 패널
function FactorDetail({ statKey, factor, members, loading, gymId, mode, period, onClose }) {
  const navigate = useNavigate();
  const action = FACTOR_ACTION[statKey];
  const showVisitTime = statKey === VISIT_TIME_FACTOR;
  const showEquip = statKey === EQUIP_FACTOR;
  const showManager = statKey === MANAGER_FACTOR;
  const showServiceCenter = statKey === SERVICE_CENTER_FACTOR;
  const isCoupon = statKey === COUPON_FACTOR;
  const isHelper = statKey === HELPER_FACTOR;
  const isPtTrial = PT_TRIAL_FACTORS.includes(statKey);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperText, setHelperText] = useState('');
  const [helperSending, setHelperSending] = useState(false);

  const [ptOpen, setPtOpen] = useState(false);
  const [couponTypes, setCouponTypes] = useState([]);
  const [selectedCouponNum, setSelectedCouponNum] = useState('');
  const [ptExpiry, setPtExpiry] = useState('');
  const [ptSending, setPtSending] = useState(false);

  useEffect(() => {
    if (!ptOpen || !gymId) return;
    const token = localStorage.getItem('accessToken');
    fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/type/list?gymId=${gymId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setCouponTypes(Array.isArray(d) ? d : []))
      .catch((e) => { console.error('쿠폰 종류 조회 실패:', e); setCouponTypes([]); });
  }, [ptOpen, gymId]);

  const submitPtTrial = async () => {
    const token = localStorage.getItem('accessToken');
    if (!selectedCouponNum) { alert('발송할 쿠폰을 선택하세요.'); return; }
    if (!ptExpiry) { alert('사용 만료 기한을 지정하세요.'); return; }
    const coupon = couponTypes.find((c) => String(c.couponNum) === String(selectedCouponNum));
    setPtSending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/sendChurnTargets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          couponNum: Number(selectedCouponNum),
          couponName: coupon?.couponName,
          date: ptExpiry,
          usernames: members.map((m) => m.username),
        }),
      });
      if (res.ok) {
        const r = await res.json();
        alert(`${r.sent}명에게 발송 완료` + (r.skipped ? ` (이미 발송된 ${r.skipped}명 제외)` : ''));
        setPtOpen(false); setSelectedCouponNum(''); setPtExpiry('');
      } else {
        alert('쿠폰 발송에 실패했습니다.');
      }
    } catch (e) {
      console.error('PT체험권 발송 오류:', e);
      alert('통신 오류로 발송에 실패했습니다.');
    } finally {
      setPtSending(false);
    }
  };

  const submitHelper = async () => {
    if (!user.username) { alert('로그인 정보를 찾을 수 없습니다.'); return; }
    setHelperSending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/result/helper/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.username, contents: helperText }),
      });
      if (res.ok) {
        alert('헬퍼 요청이 접수되었습니다. (처리대기)');
        setHelperOpen(false); setHelperText('');
      } else {
        alert('헬퍼 요청에 실패했습니다.');
      }
    } catch (e) {
      console.error('헬퍼 요청 오류:', e);
      alert('통신 오류로 헬퍼 요청에 실패했습니다.');
    } finally {
      setHelperSending(false);
    }
  };

  const showActionBtn = action && !showVisitTime && !showEquip && !showManager && !showServiceCenter;
  const hasPanel = showVisitTime || showEquip || showManager || showServiceCenter;

  return (
    <div className="cs-detailstack">
      <div className="cs-riskcard">
        <div className="cs-detail-head">
          <h4>🔍 {factorLabel(statKey)}</h4>
          <button type="button" className="cs-btn-ghost cs-back-btn" onClick={onClose}>
            ← 닫기
          </button>
        </div>
        {factor && factor.pct != null && (
          <div className="cs-factor-summary">
            <div className="cs-bar"><i style={{ width: `${Math.min(factor.pct, 100)}%` }} /></div>
            <span className="cs-factor-summary-pct cs-num">
              <b>{factor.pct}%</b> <span className="cs-fmeta">({factor.memberCount}명)</span>
            </span>
          </div>
        )}
        <p className="cs-hint">이 요인을 이탈이유로 가진 위험군 회원 명단입니다.</p>

        {loading ? (
          <p className="cs-loading cs-muted">명단 불러오는 중…</p>
        ) : members.length === 0 ? (
          <p className="cs-empty cs-muted">해당 회원 없음</p>
        ) : (
          <div className={`cs-mscroll${hasPanel ? ' half' : ''}${showServiceCenter ? ' sc' : ''}`}>
            <table className="cs-mtable">
              <thead><tr><th>회원</th><th>ID</th><th className="r">이탈률</th></tr></thead>
              <tbody>
                {members.map((m) => {
                  const t = tierOf(m.churnRate);
                  return (
                    <tr key={m.username}>
                      <td>{m.name}</td>
                      <td className="cs-muted cs-num">{m.username}</td>
                      <td className={`r cs-num cs-${t.cls}`}>{(m.churnRate * 100).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 이탈 방지 액션 버튼 — 스크롤 명단 밖, 카드 오른쪽 아래 */}
        {showActionBtn && (
          <div className="cs-detail-actions">
            <button
              type="button"
              className="cs-action-btn"
              onClick={
                isCoupon ? () => navigate('/fitb/promotion')
                : isHelper ? () => setHelperOpen(true)
                : isPtTrial ? () => setPtOpen(true)
                : undefined
              }
            >
              {action}
            </button>
          </div>
        )}
      </div>

      {/* 사이드 패널 = 회원 명단과 분리된 별도 카드 */}
      {showVisitTime && <VisitTimePanel gymId={gymId} mode={mode} period={period} statKey={statKey} />}
      {showEquip && <EquipmentPanel gymId={gymId} />}
      {showManager && <ManagerPanel gymId={gymId} mode={mode} period={period} statKey={statKey} />}
      {showServiceCenter && <ServiceCenterPanel />}

      {/* 헬퍼 요청 팝업 */}
      {helperOpen && (
        <div className="cs-modal-back" onClick={() => !helperSending && setHelperOpen(false)}>
          <div className="cs-modal sm" onClick={(e) => e.stopPropagation()}>
            <h4>🛎️ 헬퍼 요청</h4>
            <p className="cs-modal-desc">요청자: <b>{user.name || user.username}</b> · 상태: 처리대기로 접수됩니다.</p>
            <label className="cs-field-label" htmlFor="helper-text">추가로 적을 내용</label>
            <textarea id="helper-text" className="cs-textarea" value={helperText} onChange={(e) => setHelperText(e.target.value)} rows={4}
                      placeholder="요청 내용을 입력하세요 (예: 샤워실 환기 개선 요청)" />
            <div className="cs-modal-actions">
              <button type="button" className="cs-btn-ghost" onClick={() => setHelperOpen(false)} disabled={helperSending}>취소</button>
              <button type="button" className="cs-btn-primary" onClick={submitHelper} disabled={helperSending}>
                {helperSending ? '요청 중…' : '요청'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PT체험권(쿠폰) 발송 팝업 */}
      {ptOpen && (
        <div className="cs-modal-back" onClick={() => !ptSending && setPtOpen(false)}>
          <div className="cs-modal" onClick={(e) => e.stopPropagation()}>
            <h4>🎟️ 쿠폰 발송 설정</h4>
            <p className="cs-modal-desc">아래 <b>{members.length}명</b>에게 선택한 쿠폰을 발송합니다. (이미 발송된 회원은 자동 제외)</p>

            <label className="cs-field-label" htmlFor="pt-coupon">발송할 쿠폰</label>
            <select id="pt-coupon" className="cs-select" value={selectedCouponNum} onChange={(e) => setSelectedCouponNum(e.target.value)}>
              <option value="">-- 체험권 선택 --</option>
              {couponTypes.filter((c) => c.category === '체험권').map((c) => (
                <option key={c.couponNum} value={c.couponNum}>
                  {c.couponName} ({c.percent}% / {c.couponCount}회)
                </option>
              ))}
            </select>
            {couponTypes.filter((c) => c.category === '체험권').length === 0 && (
              <p className="cs-warn-text">등록된 체험권 쿠폰이 없습니다. 프로모션에서 먼저 체험권을 만들어 주세요.</p>
            )}

            <label className="cs-field-label">대상 회원 ({members.length}명)</label>
            <div className="cs-target-box">
              {members.length === 0 ? <span className="cs-muted">대상 회원이 없습니다.</span>
                : members.map((m) => (
                    <div key={m.username} className="cs-target-row">
                      {m.name} <span className="cs-muted cs-target-id">({m.username})</span>
                    </div>
                  ))}
            </div>

            <label className="cs-field-label" htmlFor="pt-expiry">사용 만료 기한</label>
            <input id="pt-expiry" type="date" className="cs-input" value={ptExpiry} onChange={(e) => setPtExpiry(e.target.value)} />

            <div className="cs-modal-actions">
              <button type="button" className="cs-btn-ghost" onClick={() => setPtOpen(false)} disabled={ptSending}>취소</button>
              <button type="button" className="cs-btn-primary" onClick={submitPtTrial} disabled={ptSending || members.length === 0}>
                {ptSending ? '보내는 중…' : '보내기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 신규 위험군 회원 명단 (오른쪽 칸 기본 표시)
function RiskMembers({ riskList, loading, mode }) {
  return (
    <>
      <div className="cs-panel-head">
        <h4 className="cs-riskcard-title">
          🚨 신규 위험군 <span className="cs-crit cs-riskcard-count">({riskList.length}명)</span>
        </h4>
        <p className="cs-hint cs-hint-inline">
          직전 {mode === 'daily' ? '날' : '달'} 대비 새로 진입한 위험군
          <span className="cs-info" tabIndex={0} data-tip={"개입·긴급 등급에 새로 진입한 회원 + 이탈이유 Top3.\n평균 이탈률 KPI를 누르면\n이탈 요인 비율로 돌아갑니다."}>ⓘ</span>
        </p>
      </div>
      {loading ? (
        <p className="cs-loading cs-muted">명단 불러오는 중…</p>
      ) : riskList.length === 0 ? (
        <p className="cs-empty cs-muted">새로 진입한 위험군 회원이 없습니다.</p>
      ) : (
        <div className="cs-risklist">
          {riskList.map((m) => {
            const t = tierOf(m.churnRate);
            const reasons = [m.top1Reason, m.top2Reason, m.top3Reason].filter(Boolean);
            return (
              <div key={m.username} className="cs-rmember">
                <div className="cs-rmember-main">
                  <div className="cs-rname">{m.name} <span className="cs-rid cs-num">{m.username}</span></div>
                  <div className="cs-chips">
                    {reasons.map((rsn, i) => (
                      <span key={i} className="cs-chip">{factorLabel(rsn)}</span>
                    ))}
                  </div>
                </div>
                <span className={`cs-rrate cs-${t.cls}`}>{(m.churnRate * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

// 위험도 4단계(안정/관찰/개입/긴급) 분포 도넛 + 섹터별 인원 범례 (순수 SVG)
function TierDonut({ dist }) {
  // 색은 대시보드(gymChurn) 도넛과 동일: 안정 초록 / 관찰 노랑 / 개입 주황 / 긴급 빨강
  const tiers = [
    { key: 'good', label: '안정', desc: '25% 미만', count: dist?.stableCount || 0, color: '#10b981' },
    { key: 'warn', label: '관찰', desc: '25~45%', count: dist?.watchCount || 0, color: '#facc15' },
    { key: 'serious', label: '개입', desc: '45~65%', count: dist?.interveneCount || 0, color: '#f59e0b' },
    { key: 'crit', label: '긴급', desc: '65% 이상', count: dist?.critCount || 0, color: '#ef4444' },
  ];
  const total = tiers.reduce((a, t) => a + t.count, 0);
  const sum = total || 1;

  const size = 280;
  const stroke = 40;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

  // 전체 한 바퀴를 SWEEP초에 걸쳐 채우되, 각 구간의 딜레이·지속시간을 호 길이에 비례 분배
  // → 각속도가 일정해 경계에서 끊기지 않고 연속으로 채워진다 (linear 타이밍)
  const SWEEP = 0.3;
  let offset = 0;
  let accFrac = 0;
  const segs = tiers.map((t) => {
    const frac = t.count / sum;
    const len = frac * circ;
    const seg = (
      <circle
        key={t.key}
        className="cs-donut-seg"
        cx={c} cy={c} r={r} stroke={t.color} strokeWidth={stroke}
        strokeDashoffset={-offset}
        style={{
          '--seg-len': `${len}px`,
          '--seg-circ': `${circ}px`,
          animationDelay: `${(accFrac * SWEEP).toFixed(3)}s`,
          animationDuration: `${(frac * SWEEP).toFixed(3)}s`,
        }}
      />
    );
    offset += len;
    accFrac += frac;
    return seg;
  });

  return (
    <>
      <div className="cs-panel-head">
        <h4>🧭 위험도 분포 <span className="cs-panel-count cs-muted">(전체 {total}명)</span></h4>
        <p className="cs-hint cs-hint-inline">
          전체 회원의 이탈 위험 등급 분포
          <span className="cs-info" tabIndex={0} data-tip={"모델 등급 경계(25 / 45 / 65%) 기준.\n안정 · 관찰 · 개입 · 긴급 4단계로\n전체 회원을 분류합니다."}>ⓘ</span>
        </p>
      </div>
      {total === 0 ? (
        <p className="cs-empty cs-muted">분포 데이터가 없습니다.</p>
      ) : (
        <div className="cs-donut-wrap">
          <svg className="cs-donut" viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            {/* translate+scale(-1,1) 로 좌우 반전 → 12시부터 반시계방향으로 채워짐 */}
            <g transform={`translate(${size} 0) scale(-1 1) rotate(-90 ${c} ${c})`}>
              <circle className="cs-donut-track" cx={c} cy={c} r={r} strokeWidth={stroke} />
              {segs}
            </g>
            <text className="cs-donut-cap" x={c} y={c - 6} textAnchor="middle">전체 회원</text>
            <text className="cs-donut-total" x={c} y={c + 22} textAnchor="middle">{total}명</text>
          </svg>
          <ul className="cs-donut-legend">
            {tiers.map((t) => (
              <li key={t.key}>
                <i style={{ background: t.color }} />
                <span className="cs-dl-label">{t.label}</span>
                <span className="cs-dl-desc">{t.desc}</span>
                <span className="cs-dl-val cs-num"><b>{Math.round((t.count / sum) * 100)}%</b> ({t.count}명)</span>
              </li>
            ))}
          </ul>
          {/* 위험군 구성 = 개입 + 긴급 (범례에서 정의한 두 등급을 묶은 결론) */}
          <div className="cs-risk-summary">
            <div className="cs-risk-summary-eq">
              <span className="cs-risk-summary-title">⚠ 위험군</span>
              <span>= <b className="cs-serious">개입 {tiers[2].count}</b> + <b className="cs-crit">긴급 {tiers[3].count}</b></span>
            </div>
            <div className="cs-risk-summary-total cs-num">
              = <b>{tiers[2].count + tiers[3].count}명</b>
              <span className="cs-muted"> (전체의 {(((tiers[2].count + tiers[3].count) / sum) * 100).toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// 펼침 상세 — 이탈요인 비율 / 위험도 분포(도넛) / 신규 위험군 · 요인 상세 (뷰 전환)
function Breakdown({ items, riskMembers, riskList, riskLoading, view, dist, gymId, mode, period }) {
  const [openKey, setOpenKey] = useState(null);   // 선택된 요인 statKey
  const [members, setMembers] = useState([]);
  const [mLoading, setMLoading] = useState(false);

  // 뷰(KPI) 전환·기간 변경 시 열려 있던 요인 상세는 닫는다 (key 재마운트 없이 리셋)
  useEffect(() => { setOpenKey(null); setMembers([]); }, [view, period]);

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

  // 이탈 요인(factor)만 FACTOR_ORDER 고정 순서로 정렬 (퍼센트 정렬 아님)
  const factorRank = (k) => { const i = FACTOR_ORDER.indexOf(k); return i === -1 ? FACTOR_ORDER.length : i; };
  const factors = items
    .filter((b) => b.statType === 'factor')
    .sort((a, b) => factorRank(a.statKey) - factorRank(b.statKey));

  // '위험군' 뷰: 위험도 4단계 분포 도넛만 단독 표시
  if (view === 'dist') {
    return (
      <div className="cs-detail-inner is-single">
        <div className="cs-panel">
          <TierDonut key={period} dist={dist} />
        </div>
      </div>
    );
  }

  // '신규 위험군' 뷰: 신규 위험군 카드만 단독 표시
  if (view === 'risk') {
    return (
      <div className="cs-detail-inner is-single">
        <div className="cs-panel">
          <RiskMembers riskList={riskList} loading={riskLoading} mode={mode} />
        </div>
      </div>
    );
  }

  // 기본 뷰: 이탈 요인 비율 — 요인 클릭 시 그 요인이 맨 위(나이 행 위치)로 올라오고 그 아래 상세 창
  return (
    <div className="cs-detail-inner is-single">
      <div className="cs-panel">
        <div className="cs-panel-head">
          <h4>📌 이탈 요인 비율 <span className="cs-crit cs-panel-count">(위험군 {riskMembers ?? 0}명)</span></h4>
          <p className="cs-hint cs-hint-inline">
            요인을 누르면 회원 명단
            <span className="cs-info" tabIndex={0} data-tip={"위험군(개입·긴급) 회원 대상.\n막대 = 요인 비율 (위험군 대비).\n회원 1명당 이탈요인 Top3를 각각 집계하므로 한 명이\n최대 3개 요인에 중복 카운트됩니다."}>ⓘ</span>
          </p>
        </div>
        {factors.length === 0 ? (
          <p className="cs-muted">데이터 없음</p>
        ) : openKey ? (
          /* 선택 모드: 선택 요인이 클릭 위치에서 맨 위로 올라오고(FLIP) 그 아래 상세 창 */
          <div className="cs-factor-detail-wrap">
            <FactorDetail statKey={openKey} factor={factors.find((f) => f.statKey === openKey) || null}
                          members={members} loading={mLoading}
                          gymId={gymId} mode={mode} period={period}
                          onClose={() => { setOpenKey(null); setMembers([]); }} />
          </div>
        ) : (
          <div className="cs-factors-scroll">
            <table className="cs-factors">
              <tbody>
                {factors.map((f) => (
                  <tr key={f.statKey} className="cs-frow" onClick={() => toggle(f.statKey)} aria-expanded={false}>
                    <td className="cs-fname">
                      {factorLabel(f.statKey)}<span className="cs-fcaret">▶</span>
                    </td>
                    <td className="cs-fbar-cell">
                      {f.pct != null ? <div className="cs-bar"><i style={{ width: `${Math.min(f.pct, 100)}%` }} /></div> : null}
                    </td>
                    <td className="cs-fpct cs-num">
                      {f.pct != null ? (
                        <><b>{f.pct}%</b> <span className="cs-fmeta">({f.memberCount}명)</span></>
                      ) : null}
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

  const [mode, setMode] = useState('daily');       // 'daily' | 'monthly' (페이지 내 칩 탭)
  const [periods, setPeriods] = useState([]);      // [{period, totalMembers, riskMembers, avgChurnRate}]
  const [periodsLoading, setPeriodsLoading] = useState(true); // 로딩과 '데이터 없음' 구분
  const [openPeriod, setOpenPeriod] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailView, setDetailView] = useState('factors'); // 'factors'(기본) | 'risk'(신규 위험군 동반 표시) — KPI 클릭으로 전환

  // KPI 카드 위쪽 센티넬이 화면 밖으로 나가면(=KPI가 상단에 닿으면) 컴팩트 아이콘 바 표시.
  // IntersectionObserver는 스크롤 이벤트에 의존하지 않아 중첩 스크롤 구조에서도 안정적으로 발화한다.
  const kpiSentinelRef = useRef(null);
  const [kpiStuck, setKpiStuck] = useState(false);
  useEffect(() => {
    const el = kpiSentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([e]) => setKpiStuck(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // KPI 기준 기간: 펼친 기간 ?? 최신 기간
  const focusObj = periods.find((p) => p.period === openPeriod) || periods[0] || null;
  const focusPeriod = focusObj?.period;

  // 신규 위험군 명단 (KPI 카운트 + 오른쪽 칸 기본 표시에 공유) — 기준 기간에 연동
  const [riskList, setRiskList] = useState([]);
  const [riskLoading, setRiskLoading] = useState(false);

  // 기간 목록 조회
  useEffect(() => {
    if (!gymId) return;
    setOpenPeriod(null);
    setBreakdown([]);
    setPeriods([]);          // 이전 모드의 기간 목록을 비워 자동선택이 옛 데이터로 잘못 잡히는 것 방지
    setPeriodsLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/periods?gymId=${gymId}&mode=${mode}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPeriods(Array.isArray(d) ? d : []))
      .catch((e) => { console.error('기간 목록 조회 실패:', e); setPeriods([]); })
      .finally(() => setPeriodsLoading(false));
  }, [gymId, mode]);

  // 자동 선택: 일별=오늘 / 월별=이번 달을 우선 선택, 없으면 최신 기간
  useEffect(() => {
    if (!periods.length) return;
    if (openPeriod && periods.some((p) => p.period === openPeriod)) return;
    const now = new Date();
    const p2 = (n) => String(n).padStart(2, '0');
    const target = mode === 'daily'
      ? `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`
      : `${now.getFullYear()}-${p2(now.getMonth() + 1)}`;
    const hit = periods.find((p) => p.period === target);
    setOpenPeriod(hit ? hit.period : periods[0].period);
  }, [periods, openPeriod, mode]);

  // 선택 기간의 이탈 요인 비율 조회
  useEffect(() => {
    if (!gymId || !openPeriod) { setBreakdown([]); return; }
    setLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/breakdown?gymId=${gymId}&mode=${mode}&period=${openPeriod}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setBreakdown(Array.isArray(d) ? d : []))
      .catch((e) => { console.error('상세 비율 조회 실패:', e); setBreakdown([]); })
      .finally(() => setLoading(false));
  }, [gymId, mode, openPeriod]);

  // 신규 위험군 명단 — 기준 기간 연동
  useEffect(() => {
    if (!gymId || !focusPeriod) { setRiskList([]); return; }
    setRiskLoading(true);
    fetch(`${import.meta.env.VITE_BACKEND_URL}/result/stats/riskMembers?gymId=${gymId}&mode=${mode}&period=${focusPeriod}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setRiskList(Array.isArray(d) ? d : []))
      .catch((e) => { console.error('위험군 명단 조회 실패:', e); setRiskList([]); })
      .finally(() => setRiskLoading(false));
  }, [gymId, mode, focusPeriod]);

  if (!gymId) {
    return <div className="cs-wrap"><div className="cs-inner"><p className="cs-empty-state">로그인한 사장님의 헬스장 정보를 찾을 수 없습니다.</p></div></div>;
  }

  const focusTier = focusObj ? tierOf(focusObj.avgChurnRate) : null;
  const total = focusObj?.totalMembers ?? 0;
  const risk = focusObj?.riskMembers ?? 0;
  const riskPct = total > 0 ? ((risk / total) * 100).toFixed(1) : '0.0';
  const avgPct = focusObj ? (focusObj.avgChurnRate * 100).toFixed(1) : '-';

  return (
    <div className="cs-wrap">
      <div className="cs-inner">

        {/* 제목 + 일별/월별 칩 탭 (위치 유지) */}
        <h2 className="b2blist-title">
          📊 헬스장 이탈 통계
          <span className="b2blist-title-sub">{user.name} 사장님</span>
        </h2>
        <p className="b2blist-desc">
          기간을 선택하면 그 {mode === 'daily' ? '날' : '달'}의 이탈 요인 비율과 위험군이 표시됩니다.
        </p>
        <div className="b2b-tabs" role="tablist">
          {[['daily', '일별'], ['monthly', '월별']].map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={`b2b-chip${mode === m ? ' is-active' : ''}`}
              onClick={() => setMode(m)}
            >
              {label}
            </button>
          ))}
        </div>

        <div ref={kpiSentinelRef} className="cs-kpi-sentinel" aria-hidden="true" />
        <div className="cs-kpis">
          <PeriodPicker variant="card" mode={mode} periods={periods} value={openPeriod} onPick={setOpenPeriod} total={total} />
          <button
            type="button"
            className={`cs-kpi cs-kpi-btn${detailView === 'dist' ? ' is-active' : ''}`}
            aria-pressed={detailView === 'dist'}
            title="위험군"
            onClick={() => setDetailView('dist')}
          >
            <div className="cs-kpi-ico">⚠️</div>
            <div className="cs-kpi-body">
              <div className="cs-kpi-label">위험군</div>
              <div className="cs-kpi-value cs-num cs-crit">{risk}<small>명</small></div>
              <div className="cs-kpi-sub cs-num">전체의 {riskPct}%</div>
            </div>
          </button>
          <button
            type="button"
            className={`cs-kpi cs-kpi-btn${detailView === 'factors' ? ' is-active' : ''}`}
            aria-pressed={detailView === 'factors'}
            title="평균 이탈률"
            onClick={() => setDetailView('factors')}
          >
            <div className="cs-kpi-ico">📈</div>
            <div className="cs-kpi-body">
              <div className="cs-kpi-label">평균 이탈률</div>
              <div className={`cs-kpi-value cs-num cs-${focusTier?.cls || 'good'}`}>{avgPct}<small>%</small></div>
              <div className="cs-kpi-sub">{focusTier && <span className={`cs-badge ${focusTier.cls}`}>{focusTier.label}</span>}</div>
            </div>
          </button>
          <button
            type="button"
            className={`cs-kpi cs-kpi-btn${detailView === 'risk' ? ' is-active' : ''}`}
            aria-pressed={detailView === 'risk'}
            title="신규 위험군"
            onClick={() => setDetailView('risk')}
          >
            <div className="cs-kpi-ico">🔔</div>
            <div className="cs-kpi-body">
              <div className="cs-kpi-label">신규 위험군</div>
              <div className="cs-kpi-value cs-num">{riskLoading ? '…' : riskList.length}<small>명</small></div>
              <div className="cs-kpi-sub">직전 {mode === 'daily' ? '날' : '달'} 대비</div>
            </div>
          </button>
        </div>

        {/* KPI 카드가 스크롤로 사라지면 뜨는 컴팩트 아이콘 바.
            document.body로 포털 → 어떤 조상의 overflow/transform에도 안 잘리고 뷰포트 기준 고정 */}
        {kpiStuck && (
          <div className="cs-kpi-float" aria-label="KPI 빠른 전환">
            <div className="cs-kpi-float-inner">
              <PeriodPicker variant="compact" mode={mode} periods={periods} value={openPeriod} onPick={setOpenPeriod} total={total} />
              <button type="button" className={`cs-kpi-float-item is-btn${detailView === 'dist' ? ' is-active' : ''}`}
                      aria-pressed={detailView === 'dist'} onClick={() => setDetailView('dist')}>
                <span className="cs-kpi-float-ico">⚠️</span>
                <span className="cs-kpi-float-label">위험군</span>
                <span className="cs-kpi-float-val cs-num is-crit">{risk}명 · {riskPct}%</span>
              </button>
              <button type="button" className={`cs-kpi-float-item is-btn${detailView === 'factors' ? ' is-active' : ''}`}
                      aria-pressed={detailView === 'factors'} onClick={() => setDetailView('factors')}>
                <span className="cs-kpi-float-ico">📈</span>
                <span className="cs-kpi-float-label">평균 이탈률</span>
                <span className={`cs-kpi-float-val cs-num is-${focusTier?.cls || 'good'}`}>{avgPct}%</span>
              </button>
              <button type="button" className={`cs-kpi-float-item is-btn${detailView === 'risk' ? ' is-active' : ''}`}
                      aria-pressed={detailView === 'risk'} onClick={() => setDetailView('risk')}>
                <span className="cs-kpi-float-ico">🔔</span>
                <span className="cs-kpi-float-label">신규 위험군</span>
                <span className="cs-kpi-float-val cs-num">{riskLoading ? '…' : riskList.length}명</span>
              </button>
            </div>
          </div>
        )}

        {periodsLoading ? (
          <p className="cs-empty-state">불러오는 중…</p>
        ) : periods.length === 0 ? (
          <p className="cs-empty-state">집계된 통계 데이터가 없습니다. (배치 실행 후 표시됩니다)</p>
        ) : (
          /* 상세 카드 전체 폭 (이탈요인 비율 / 위험도 분포 / 신규 위험군) */
          <div className="cs-detailpane" aria-busy={loading}>
            {openPeriod ? (
              <Breakdown items={breakdown} riskMembers={focusObj?.riskMembers}
                         riskList={riskList} riskLoading={riskLoading} view={detailView} dist={focusObj}
                         gymId={gymId} mode={mode} period={openPeriod} />
            ) : (
              <p className="cs-muted cs-pane-msg">상단에서 기간을 선택하세요.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default B2bList;
