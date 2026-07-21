import { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './B2bList.css';

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

// 이 요인의 버튼을 누르면 프로모션(쿠폰 발행) 탭이 켜진 채로 /fitb 로 이동
const COUPON_FACTOR = '가격불만';

// 이 요인의 버튼(헬퍼)을 누르면 헬퍼 요청 팝업 → h_helper 등록
const HELPER_FACTOR = '서비스불만_환경불편';

// 이 요인들의 버튼(PT체험권 발송)을 누르면 쿠폰 발송 팝업 → 오늘자 위험군 회원에게 쿠폰 발송
const PT_TRIAL_FACTORS = ['PT_가입여부', '최근한달_부상경험'];

// 방문 시간대 표시 순서(시간순)
const SLOT_ORDER = ['새벽(00-06)', '오전(06-11)', '점심(11-14)', '오후(14-18)', '저녁(18-22)', '야간(22-24)'];

// 이탈율 임계값별 색 (state 파생 className — 색 값은 CSS 토큰)
const churnClass = (rate) => (rate >= 0.5 ? 'churn-hi' : rate >= 0.25 ? 'churn-mid' : 'churn-lo');

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
    <div className="b2b-card b2b-side-panel">
      <h5 className="b2b-panel-title">🕒 이 회원들이 주로 오는 시간대</h5>
      {loading ? (
        <p className="b2b-muted">불러오는 중…</p>
      ) : total === 0 ? (
        <p className="b2b-muted">방문 기록이 없습니다.</p>
      ) : (
        <>
          <p className="b2b-hint">
            총 <b>{total}</b>회 방문 · 피크 <b className="b2b-peak">{peak?.slot}</b>
          </p>
          <table className="b2b-subtable">
            <tbody>
              {sorted.map((x) => {
                const cnt = Number(x.cnt || 0);
                return (
                  <tr key={x.slot}>
                    <td>{x.slot}</td>
                    <td style={{ width: '100%' }}>
                      <div className="b2b-bar">
                        <div className="b2b-bar-fill" style={{ width: `${(cnt / max) * 100}%` }} />
                      </div>
                    </td>
                    <td className="cell-num">{cnt}회</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

// 비율 막대
function Bar({ pct }) {
  return (
    <div className="b2b-bar">
      <div className="b2b-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

// 이탈 요인 한 행 (클릭 → 해당 요인을 가진 위험군 회원 명단 토글)
function StatRow({ label, pct, memberCount, riskMembers, open, onClick }) {
  return (
    <tr className={`factor-row${open ? ' is-open' : ''}`} onClick={onClick} aria-expanded={open}>
      <td className="factor-label">
        {label}<span className="factor-caret">{open ? '▲' : '▼'}</span>
      </td>
      <td className="factor-bar-cell">{pct != null ? <Bar pct={pct} /> : null}</td>
      <td className="factor-stat">
        {pct != null ? (
          <><strong>{pct}%</strong> <span className="factor-stat-sub">({memberCount}명 / 위험군 {riskMembers ?? 0}명)</span></>
        ) : null}
      </td>
    </tr>
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
    <div className="b2b-card b2b-side-panel">
      <h5 className="b2b-panel-title">🏋️ 이 헬스장 기구 목록</h5>
      {loading ? (
        <p className="b2b-muted">불러오는 중…</p>
      ) : sorted.length === 0 ? (
        <p className="b2b-muted">등록된 기구가 없습니다.</p>
      ) : (
        <table className="b2b-subtable">
          <thead><tr>
            <th>기구명</th>
            <th style={{ textAlign: 'right' }}>보유 수량</th>
          </tr></thead>
          <tbody>
            {sorted.map((it) => (
              <tr key={it.itemName}>
                <td>{it.itemName}</td>
                <td className="cell-num">{it.itemCount}대</td>
              </tr>
            ))}
          </tbody>
        </table>
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

  return (
    <div className="b2b-card b2b-side-panel">
      <h5 className="b2b-panel-title">🧑‍🏫 이 회원들의 담당자</h5>
      {loading ? (
        <p className="b2b-muted">불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className="b2b-muted">배정된 담당자가 없습니다.</p>
      ) : (
        <table className="b2b-subtable">
          <thead><tr>
            <th>회원</th>
            <th>담당자</th>
          </tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.username}>
                <td>{m.memberName}</td>
                <td style={{ fontWeight: 600 }}>{m.managerName}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="b2b-card b2b-side-panel">
      <h5 className="b2b-panel-title">🛠️ 서비스센터 목록</h5>
      {loading ? (
        <p className="b2b-muted">불러오는 중…</p>
      ) : centers.length === 0 ? (
        <p className="b2b-muted">등록된 서비스센터가 없습니다.</p>
      ) : (
        <div className="b2b-center-list">
          {centers.map((c) => (
            <div key={c.centerId} className="b2b-center">
              <div className="b2b-center-name">
                {c.centerName}
                {c.brandName && c.brandName !== c.centerName && (
                  <span className="b2b-center-brand"> ({c.brandName})</span>
                )}
              </div>
              <div>📞 {c.centerPhone || '-'}</div>
              {c.operatingHours && <div className="b2b-center-brand">🕒 {c.operatingHours}</div>}
              <div className={c.onsiteRepair ? 'b2b-center-ok' : 'b2b-center-no'}>
                {c.onsiteRepair ? '✔ 출장 수리 가능' : '출장 수리 불가'}
              </div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer" className="b2b-link">
                  홈페이지 바로가기 ↗
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// 회원 명단 하위행 (요인 로우 클릭 시)
function MemberListRow({ loading, members, statKey, gymId, mode, period }) {
  const navigate = useNavigate();
  const action = FACTOR_ACTION[statKey];
  const showVisitTime = statKey === VISIT_TIME_FACTOR;   // 비매너회원 → 버튼 대신 방문 시간대 패널
  const showEquip = statKey === EQUIP_FACTOR;            // 기구부족 → 버튼 대신 기구 목록 패널
  const showManager = statKey === MANAGER_FACTOR;        // 전문성부족 → 버튼 대신 담당자 패널
  const showServiceCenter = statKey === SERVICE_CENTER_FACTOR;  // 기구상태불만 → 버튼 대신 서비스센터 목록
  const isCoupon = statKey === COUPON_FACTOR;            // 가격불만 → 버튼 누르면 프로모션 탭으로 이동
  const isHelper = statKey === HELPER_FACTOR;            // 환경불편 → 헬퍼 버튼 누르면 요청 팝업
  const isPtTrial = PT_TRIAL_FACTORS.includes(statKey);  // PT가입여부/부상경험 → PT체험권 발송 팝업

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [helperOpen, setHelperOpen] = useState(false);
  const [helperText, setHelperText] = useState('');
  const [helperSending, setHelperSending] = useState(false);

  // PT체험권(쿠폰) 발송 팝업 상태
  const [ptOpen, setPtOpen] = useState(false);
  const [couponTypes, setCouponTypes] = useState([]);
  const [selectedCouponNum, setSelectedCouponNum] = useState('');
  const [ptExpiry, setPtExpiry] = useState('');
  const [ptSending, setPtSending] = useState(false);

  // 팝업 열릴 때 그 헬스장(gym_id)의 쿠폰 종류 목록 로드
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

  // 선택 회원들에게 쿠폰 발송 (이미 발송(status=1)된 회원은 서버가 스킵)
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

  // 헬퍼 요청 등록 — username=로그인 사장님, title/status는 서버 고정
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

  return (
    <tr>
      <td colSpan={3} className="factor-detail-cell">
        {action && !showVisitTime && !showEquip && !showManager && !showServiceCenter && (
          <div className="b2b-action-bar">
            <button
              type="button"
              className="b2b-btn-action"
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

        {/* 헬퍼 요청 팝업 */}
        {helperOpen && (
          <div className="b2b-modal-overlay" onClick={() => !helperSending && setHelperOpen(false)}>
            <div className="b2b-modal sm" onClick={(e) => e.stopPropagation()}>
              <h4 className="b2b-modal-title">🛎️ 헬퍼 요청</h4>
              <p className="b2b-modal-sub">
                요청자: <b>{user.name || user.username}</b> · 상태: 처리대기로 접수됩니다.
              </p>
              <label className="b2b-field-label" htmlFor="helper-text">추가로 적을 내용</label>
              <textarea
                id="helper-text"
                className="b2b-textarea"
                value={helperText}
                onChange={(e) => setHelperText(e.target.value)}
                rows={4}
                placeholder="요청 내용을 입력하세요 (예: 샤워실 환기 개선 요청)"
              />
              <div className="b2b-modal-actions">
                <button type="button" className="b2b-btn-secondary" onClick={() => setHelperOpen(false)} disabled={helperSending}>
                  취소
                </button>
                <button type="button" className="b2b-btn-primary" onClick={submitHelper} disabled={helperSending}>
                  {helperSending ? '요청 중…' : '요청'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PT체험권(쿠폰) 발송 팝업 */}
        {ptOpen && (
          <div className="b2b-modal-overlay" onClick={() => !ptSending && setPtOpen(false)}>
            <div className="b2b-modal md" onClick={(e) => e.stopPropagation()}>
              <h4 className="b2b-modal-title">🎟️ 쿠폰 발송 설정</h4>
              <p className="b2b-modal-sub">
                아래 <b>{members.length}명</b>에게 선택한 쿠폰을 발송합니다. (이미 발송된 회원은 자동 제외)
              </p>

              {/* 쿠폰 선택 (그 헬스장 gym_id 쿠폰만) */}
              <label className="b2b-field-label" htmlFor="pt-coupon">발송할 쿠폰</label>
              <select
                id="pt-coupon"
                className="b2b-select b2b-field"
                value={selectedCouponNum}
                onChange={(e) => setSelectedCouponNum(e.target.value)}
              >
                <option value="">-- 체험권 선택 --</option>
                {couponTypes.filter((c) => c.category === '체험권').map((c) => (
                  <option key={c.couponNum} value={c.couponNum}>
                    {c.couponName} ({c.percent}% / {c.couponCount}회)
                  </option>
                ))}
              </select>
              {couponTypes.filter((c) => c.category === '체험권').length === 0 && (
                <p className="b2b-modal-warn">
                  등록된 체험권 쿠폰이 없습니다. 프로모션에서 먼저 체험권을 만들어 주세요.
                </p>
              )}

              {/* 대상 회원 (바 드릴다운 회원 자동 포함, 읽기전용) */}
              <label className="b2b-field-label">대상 회원 ({members.length}명)</label>
              <div className="b2b-target-list">
                {members.length === 0 ? <span className="b2b-muted">대상 회원이 없습니다.</span>
                  : members.map((m) => (
                      <div key={m.username}>
                        {m.name} <span className="muted-id">({m.username})</span>
                      </div>
                    ))}
              </div>

              {/* 사용 만료 기한 */}
              <label className="b2b-field-label" htmlFor="pt-expiry">사용 만료 기한</label>
              <input
                id="pt-expiry"
                type="date"
                className="b2b-input"
                value={ptExpiry}
                onChange={(e) => setPtExpiry(e.target.value)}
              />

              <div className="b2b-modal-actions">
                <button type="button" className="b2b-btn-secondary" onClick={() => setPtOpen(false)} disabled={ptSending}>
                  취소
                </button>
                <button type="button" className="b2b-btn-primary" onClick={submitPtTrial} disabled={ptSending || members.length === 0}>
                  {ptSending ? '보내는 중…' : '보내기'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="b2b-member-layout">
          {/* 왼쪽: 해당 요인을 가진 회원 명단 */}
          <div>
            {loading ? <span className="b2b-muted">명단 불러오는 중…</span>
              : members.length === 0 ? <span className="b2b-muted">해당 회원 없음</span>
              : (
                <table className="b2b-subtable">
                  <thead><tr>
                    <th>회원</th>
                    <th>ID</th>
                    <th style={{ textAlign: 'right' }}>이탈율</th>
                  </tr></thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.username}>
                        <td>{m.name}</td>
                        <td className="cell-id">{m.username}</td>
                        <td className={`cell-num ${churnClass(m.churnRate)}`}>
                          {(m.churnRate * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
          {/* 오른쪽: 방문 시간대 분포 (비매너회원) / 기구 목록 (기구부족) 등 */}
          {showVisitTime && (
            <VisitTimePanel gymId={gymId} mode={mode} period={period} statKey={statKey} />
          )}
          {showEquip && <EquipmentPanel gymId={gymId} />}
          {showManager && (
            <ManagerPanel gymId={gymId} mode={mode} period={period} statKey={statKey} />
          )}
          {showServiceCenter && <ServiceCenterPanel />}
        </div>
      </td>
    </tr>
  );
}

// 이탈 요인 비율(막대) — 요인 로우 클릭 시 그 요인을 가진 위험군 회원 명단 조회
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
        label={f.statKey} pct={f.pct} memberCount={f.memberCount} riskMembers={riskMembers} />
    );
    if (open) rows.push(<MemberListRow key={`${f.statKey}-m`} loading={mLoading} members={members} statKey={f.statKey}
                                       gymId={gymId} mode={mode} period={period} />);
  });

  return (
    <div className="b2b-breakdown">
      {/* 왼쪽: 이탈요인 비율 */}
      <div className="b2b-breakdown-main">
        <h4 className="b2b-section-title">📌 이탈 요인 비율 <span className="b2b-count-danger">(위험군 {riskMembers ?? 0}명 기준)</span></h4>
        <p className="b2b-hint">
          위험군(개입·긴급 등급) 회원 대상 · 막대 = 이탈 요인 비율(위험군 대비) · <b>요인 행을 누르면 해당 회원 명단</b>
          <br />※ 회원 1명당 <b>이탈요인 top3</b>를 각각 집계 → 한 명이 최대 3개 요인에 중복 카운트됨
        </p>
        {rows.length === 0 ? (
          <p className="b2b-muted">데이터 없음</p>
        ) : (
          <table className="factor-table">
            <tbody>{rows}</tbody>
          </table>
        )}
      </div>

      {/* 오른쪽: 신규 위험군 회원 명단 (별도 컬럼 · 길면 내부 스크롤) */}
      <div className="b2b-breakdown-side b2b-card">
        <h4 className="b2b-section-title">🚨 신규 위험군 회원 <span className="b2b-count-danger">({riskList.length}명)</span></h4>
        <p className="b2b-hint">
          직전 {mode === 'daily' ? '날' : '달'} 대비 <b>새로</b> 위험군(개입·긴급)에 진입한 회원 + 이탈이유 Top3
        </p>
        {riskLoading ? (
          <p className="b2b-muted">명단 불러오는 중…</p>
        ) : riskList.length === 0 ? (
          <p className="b2b-muted">새로 진입한 위험군 회원이 없습니다.</p>
        ) : (
          <div className="b2b-scroll">
            <table className="b2b-subtable">
              <thead className="sticky"><tr>
                <th>회원</th>
                <th style={{ textAlign: 'right' }}>이탈율</th>
                <th>이탈이유 (Top3)</th>
              </tr></thead>
              <tbody>
                {riskList.map((m) => (
                  <tr key={m.username}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {m.name}<br /><span className="cell-id">{m.username}</span>
                    </td>
                    <td className={`cell-num ${churnClass(m.churnRate)}`}>
                      {(m.churnRate * 100).toFixed(1)}%
                    </td>
                    <td>
                      {[m.top1Reason, m.top2Reason, m.top3Reason].filter(Boolean).map((rsn, i) => (
                        <span key={i} className="reason-chip">{i + 1}. {rsn}</span>
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
    return <div className="b2b-notice">로그인한 사장님의 헬스장 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="b2blist-page">
      <h2 className="b2blist-title">
        📊 헬스장 이탈 통계
        <span className="b2blist-title-sub">{user.name} 사장님</span>
      </h2>
      <p className="b2blist-desc">
        기간을 누르면 그 {mode === 'daily' ? '날' : '달'}의 이탈 요인 비율이 펼쳐집니다.
      </p>

      {/* 일별 / 월별 칩형 탭 */}
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

      {periods.length === 0 ? (
        <p className="b2b-notice">집계된 통계 데이터가 없습니다. (배치 실행 후 표시됩니다)</p>
      ) : (
        <table className="b2b-table">
          <thead>
            <tr>
              <th>{mode === 'daily' ? '날짜' : '월'}</th>
              <th>회원 수</th>
              <th>위험군</th>
              <th>이탈율</th>
              <th>상세</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <Fragment key={p.period}>
                <tr
                  className={`b2b-row${openPeriod === p.period ? ' is-open' : ''}`}
                  onClick={() => handleOpen(p.period)}
                  aria-expanded={openPeriod === p.period}
                >
                  <td className="b2b-cell-key">{p.period}</td>
                  <td className="num">{p.totalMembers}명</td>
                  <td className="num churn-hi">{p.riskMembers ?? 0}명</td>
                  <td className="num">
                    <strong className={churnClass(p.avgChurnRate)}>
                      {(p.avgChurnRate * 100).toFixed(1)}%
                    </strong>
                  </td>
                  <td className="num">{openPeriod === p.period ? '▲ 닫기' : '▼ 열기'}</td>
                </tr>

                {openPeriod === p.period && (
                  <tr>
                    <td colSpan={5} className="b2b-detail-cell">
                      {loading ? <p className="b2b-muted">불러오는 중…</p> : <Breakdown items={breakdown} riskMembers={p.riskMembers} gymId={gymId} mode={mode} period={p.period} />}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}

      <Link to="/fitb/b2bmypage" className="b2b-back">← 마이페이지로</Link>
    </div>
  );
}

export default B2bList;
