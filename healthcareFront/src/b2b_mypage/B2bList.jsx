import { useState, useEffect, Fragment } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
    <div style={{ minWidth: '260px', flex: '0 1 320px', border: '1px solid #f0c9a8', borderRadius: '8px',
                  padding: '10px 12px', background: '#fff' }}>
      <h5 style={{ margin: '0 0 6px' }}>🕒 이 회원들이 주로 오는 시간대</h5>
      {loading ? (
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>불러오는 중…</p>
      ) : total === 0 ? (
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>방문 기록이 없습니다.</p>
      ) : (
        <>
          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px' }}>
            총 <b>{total}</b>회 방문 · 피크 <b style={{ color: '#ef6c00' }}>{peak?.slot}</b>
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <tbody>
              {sorted.map((x) => {
                const cnt = Number(x.cnt || 0);
                return (
                  <tr key={x.slot}>
                    <td style={{ padding: '2px 8px 2px 0', whiteSpace: 'nowrap', color: '#555' }}>{x.slot}</td>
                    <td style={{ padding: '2px 6px', width: '100%' }}>
                      <div style={{ background: '#eee', borderRadius: '4px', height: '12px' }}>
                        <div style={{ background: '#ef6c00', width: `${(cnt / max) * 100}%`, height: '100%', borderRadius: '4px' }} />
                      </div>
                    </td>
                    <td style={{ padding: '2px 0', textAlign: 'right', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                      {cnt}회
                    </td>
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
function Bar({ pct, color }) {
  return (
    <div style={{ background: '#eee', borderRadius: '4px', height: '14px', width: '100%', minWidth: '80px' }}>
      <div style={{ background: color, width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: '4px' }} />
    </div>
  );
}

// 이탈 요인 한 행 (클릭 → 해당 요인을 가진 위험군 회원 명단 토글)
function StatRow({ label, pct, memberCount, riskMembers, open, onClick }) {
  return (
    <tr onClick={onClick}
        style={{ background: open ? '#fff3e0' : '#fff', cursor: 'pointer' }}>
      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
        {label}<span style={{ color: '#999', fontSize: '11px' }}>{open ? ' ▲' : ' ▼'}</span>
      </td>
      <td style={{ padding: '4px 8px', width: '45%' }}>{pct != null ? <Bar pct={pct} color="#ef6c00" /> : null}</td>
      <td style={{ padding: '4px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
        {pct != null ? (
          <><strong>{pct}%</strong> <span style={{ color: '#999', fontSize: '12px' }}>({memberCount}명 / 위험군 {riskMembers ?? 0}명)</span></>
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
    <div style={{ minWidth: '220px', flex: '0 1 300px', border: '1px solid #f0c9a8', borderRadius: '8px',
                  padding: '10px 12px', background: '#fff' }}>
      <h5 style={{ margin: '0 0 6px' }}>🏋️ 이 헬스장 기구 목록</h5>
      {loading ? (
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>불러오는 중…</p>
      ) : sorted.length === 0 ? (
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>등록된 기구가 없습니다.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={{ color: '#888' }}>
            <th style={{ textAlign: 'left', padding: '2px 12px 4px 0' }}>기구명</th>
            <th style={{ textAlign: 'right', padding: '2px 0 4px' }}>보유 수량</th>
          </tr></thead>
          <tbody>
            {sorted.map((it) => (
              <tr key={it.itemName} style={{ borderTop: '1px solid #f3f3f3' }}>
                <td style={{ padding: '3px 12px 3px 0' }}>{it.itemName}</td>
                <td style={{ padding: '3px 0', textAlign: 'right', fontWeight: 'bold' }}>{it.itemCount}대</td>
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
    <div style={{ minWidth: '260px', flex: '0 1 340px', border: '1px solid #f0c9a8', borderRadius: '8px',
                  padding: '10px 12px', background: '#fff' }}>
      <h5 style={{ margin: '0 0 6px' }}>🧑‍🏫 이 회원들의 담당자</h5>
      {loading ? (
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>불러오는 중…</p>
      ) : list.length === 0 ? (
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>배정된 담당자가 없습니다.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead><tr style={{ color: '#888' }}>
            <th style={{ textAlign: 'left', padding: '2px 12px 4px 0' }}>회원</th>
            <th style={{ textAlign: 'left', padding: '2px 0 4px' }}>담당자</th>
          </tr></thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.username} style={{ borderTop: '1px solid #f3f3f3' }}>
                <td style={{ padding: '3px 12px 3px 0' }}>{m.memberName}</td>
                <td style={{ padding: '3px 0', fontWeight: 'bold' }}>{m.managerName}</td>
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
    <div style={{ minWidth: '280px', flex: '0 1 380px', border: '1px solid #f0c9a8', borderRadius: '8px',
                  padding: '10px 12px', background: '#fff' }}>
      <h5 style={{ margin: '0 0 8px' }}>🛠️ 서비스센터 목록</h5>
      {loading ? (
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>불러오는 중…</p>
      ) : centers.length === 0 ? (
        <p style={{ color: '#888', fontSize: '13px', margin: 0 }}>등록된 서비스센터가 없습니다.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {centers.map((c) => (
            <div key={c.centerId} style={{ borderTop: '1px solid #f3f3f3', paddingTop: '6px', fontSize: '13px' }}>
              <div style={{ fontWeight: 'bold' }}>
                {c.centerName}
                {c.brandName && c.brandName !== c.centerName && (
                  <span style={{ color: '#999', fontWeight: 'normal', fontSize: '12px' }}> ({c.brandName})</span>
                )}
              </div>
              <div style={{ color: '#555' }}>📞 {c.centerPhone || '-'}</div>
              {c.operatingHours && <div style={{ color: '#777', fontSize: '12px' }}>🕒 {c.operatingHours}</div>}
              <div style={{ fontSize: '12px', color: c.onsiteRepair ? '#2e7d32' : '#999' }}>
                {c.onsiteRepair ? '✔ 출장 수리 가능' : '출장 수리 불가'}
              </div>
              {c.url && (
                <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#ef6c00' }}>
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
      <td colSpan={3} style={{ padding: '6px 8px 10px 28px', background: '#fffdf5' }}>
        {action && !showVisitTime && !showEquip && !showManager && !showServiceCenter && (
          <div style={{ marginBottom: '8px' }}>
            <button
              type="button"
              onClick={
                isCoupon ? () => navigate('/fitb?tab=promotion')
                : isHelper ? () => setHelperOpen(true)
                : isPtTrial ? () => setPtOpen(true)
                : undefined
              }
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

        {/* 헬퍼 요청 팝업 */}
        {helperOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
                        justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
               onClick={() => !helperSending && setHelperOpen(false)}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '360px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
                 onClick={(e) => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 4px' }}>🛎️ 헬퍼 요청</h4>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 12px' }}>
                요청자: <b>{user.name || user.username}</b> · 상태: 처리대기로 접수됩니다.
              </p>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>추가로 적을 내용</label>
              <textarea
                value={helperText}
                onChange={(e) => setHelperText(e.target.value)}
                rows={4}
                placeholder="요청 내용을 입력하세요 (예: 샤워실 환기 개선 요청)"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', fontSize: '13px', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '14px' }}>
                <button type="button" onClick={() => setHelperOpen(false)} disabled={helperSending}
                        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>
                  취소
                </button>
                <button type="button" onClick={submitHelper} disabled={helperSending}
                        style={{ padding: '6px 15px', border: 'none', borderRadius: '4px', background: '#ef6c00', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                  {helperSending ? '요청 중…' : '요청'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PT체험권(쿠폰) 발송 팝업 */}
        {ptOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex',
                        justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
               onClick={() => !ptSending && setPtOpen(false)}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '22px', width: '400px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}
                 onClick={(e) => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 4px' }}>🎟️ 쿠폰 발송 설정</h4>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 14px' }}>
                아래 <b>{members.length}명</b>에게 선택한 쿠폰을 발송합니다. (이미 발송된 회원은 자동 제외)
              </p>

              {/* 쿠폰 선택 (그 헬스장 gym_id 쿠폰만) */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>발송할 쿠폰</label>
              <select value={selectedCouponNum} onChange={(e) => setSelectedCouponNum(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '14px' }}>
                <option value="">-- 체험권 선택 --</option>
                {couponTypes.filter((c) => c.category === '체험권').map((c) => (
                  <option key={c.couponNum} value={c.couponNum}>
                    {c.couponName} ({c.percent}% / {c.couponCount}회)
                  </option>
                ))}
              </select>
              {couponTypes.filter((c) => c.category === '체험권').length === 0 && (
                <p style={{ fontSize: '12px', color: '#c62828', margin: '-8px 0 14px' }}>
                  등록된 체험권 쿠폰이 없습니다. 프로모션에서 먼저 체험권을 만들어 주세요.
                </p>
              )}

              {/* 대상 회원 (바 드릴다운 회원 자동 포함, 읽기전용) */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>
                대상 회원 ({members.length}명)
              </label>
              <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px', padding: '8px', marginBottom: '14px', fontSize: '13px' }}>
                {members.length === 0 ? <span style={{ color: '#888' }}>대상 회원이 없습니다.</span>
                  : members.map((m) => (
                      <div key={m.username} style={{ padding: '2px 0' }}>
                        {m.name} <span style={{ color: '#999', fontSize: '11px' }}>({m.username})</span>
                      </div>
                    ))}
              </div>

              {/* 사용 만료 기한 */}
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px' }}>사용 만료 기한</label>
              <input type="date" value={ptExpiry} onChange={(e) => setPtExpiry(e.target.value)}
                     style={{ width: '100%', boxSizing: 'border-box', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} />

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" onClick={() => setPtOpen(false)} disabled={ptSending}
                        style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}>
                  취소
                </button>
                <button type="button" onClick={submitPtTrial} disabled={ptSending || members.length === 0}
                        style={{ padding: '6px 15px', border: 'none', borderRadius: '4px', background: '#ef6c00', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                  {ptSending ? '보내는 중…' : '보내기'}
                </button>
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* 왼쪽: 해당 요인을 가진 회원 명단 */}
          <div>
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
          </div>
          {/* 오른쪽: 방문 시간대 분포 (비매너회원) / 기구 목록 (기구부족) */}
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
        label={f.statKey} pct={f.pct} memberCount={f.memberCount} riskMembers={riskMembers} />
    );
    if (open) rows.push(<MemberListRow key={`${f.statKey}-m`} loading={mLoading} members={members} statKey={f.statKey}
                                       gymId={gymId} mode={mode} period={period} />);
  });

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* 왼쪽: 이탈요인 비율 (주황) */}
      <div style={{ flex: '1 1 520px', minWidth: 0, maxWidth: '620px' }}>
        <h4 style={{ marginBottom: '2px' }}>📌 이탈 요인 비율 <span style={{ fontSize: '13px', color: '#c62828' }}>(위험군 {riskMembers ?? 0}명 기준)</span></h4>
        <p style={{ fontSize: '12px', color: '#888', margin: '2px 0 8px' }}>
          위험군(개입·긴급 등급) 회원 대상 · 주황 = 이탈 요인 비율(위험군 대비) · <b>요인 행을 누르면 해당 회원 명단</b>
          <br />※ 회원 1명당 <b>이탈요인 top3</b>를 각각 집계 → 한 명이 최대 3개 요인에 중복 카운트됨
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
