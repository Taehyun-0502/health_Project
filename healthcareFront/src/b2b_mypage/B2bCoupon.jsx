import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import NavIcon from '../components/uiIcons.jsx';
import './B2bSubpages.css';

// 이탈율(0~1)에 따른 색상 (B2bList와 동일 기준)
const churnToneClass = (rate) => (
  rate >= 0.5
    ? 'b2b-churn-rate--high'
    : rate >= 0.25
      ? 'b2b-churn-rate--medium'
      : 'b2b-churn-rate--low'
);

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
    return (
      <section className="b2b-subpage">
        <p className="b2b-subpage__empty">로그인한 사장님의 헬스장 정보를 찾을 수 없어요.</p>
      </section>
    );
  }

  const tabBtn = (m, label) => (
    <button
      key={m}
      type="button"
      onClick={() => setMode(m)}
      className={`b2b-filter-chip ${mode === m ? 'b2b-filter-chip--active' : ''}`}
      aria-pressed={mode === m}
    >
      {label}
    </button>
  );

  return (
    <section className="b2b-subpage" aria-labelledby="b2b-coupon-title">
      <header className="b2b-subpage__header">
        <h2 id="b2b-coupon-title">쿠폰 대상 회원 선택 ({user.name} 사장님)</h2>
        <p>
          이탈율이 높은 순으로 정렬된 회원 명단입니다. 기준을 골라 대상을 자동 선택하거나, 개별로 체크할 수 있습니다.
        </p>
      </header>

      {/* 기준 선택 탭 */}
      <div className="b2b-filter-chips" aria-label="쿠폰 대상 선택 기준">
        {tabBtn('count', '인원수 기준')}
        {tabBtn('rate', '이탈율 기준')}
      </div>

      {/* 기준별 입력 */}
      <div className="b2b-filter-panel">
        {mode === 'count' ? (
          <label className="b2b-filter-panel__label">
            이탈율 높은 순으로 상위{' '}
            <input
              type="number" min="0" max={members.length} value={countN}
              onChange={(e) => setCountN(e.target.value)}
              className="b2b-inline-input"
            />
            {' '}명 선택 <span className="b2b-filter-panel__meta">(전체 {members.length}명)</span>
          </label>
        ) : (
          <label className="b2b-filter-panel__label">
            이탈율{' '}
            <input
              type="number" min="0" max="100" value={rateThreshold}
              onChange={(e) => setRateThreshold(e.target.value)}
              className="b2b-inline-input"
            />
            {' '}% 이상 회원 전부 선택
          </label>
        )}
      </div>

      {/* 선택 요약 */}
      <div className="b2b-selection-summary">
        <strong>{selectedCount}명 선택됨</strong>
        {avgSelectedChurn != null && (
          <span>
            선택 회원 평균 이탈율{' '}
            <b className={`b2b-churn-rate ${churnToneClass(avgSelectedChurn)}`}>
              {(avgSelectedChurn * 100).toFixed(1)}%
            </b>
          </span>
        )}
      </div>

      {loading ? (
        <p className="b2b-subpage__empty">명단 불러오는 중…</p>
      ) : members.length === 0 ? (
        <p className="b2b-subpage__empty">회원 데이터가 없어요. (이탈 예측 배치 실행 후 표시됩니다)</p>
      ) : (
        <div className="b2b-table-wrap">
          <table className="b2b-data-table b2b-data-table--coupon">
            <thead>
              <tr>
                <th className="b2b-data-table__center">선택</th>
                <th className="b2b-data-table__center">순위</th>
                <th>회원</th>
                <th>ID</th>
                <th className="b2b-data-table__right">이탈율</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const checked = selected.has(m.username);
                return (
                  <tr
                    key={m.username}
                    onClick={() => toggleMember(m.username)}
                    className={checked ? 'b2b-data-table__row--selected' : ''}
                  >
                    <td className="b2b-data-table__center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(m.username)}
                        onClick={(e) => e.stopPropagation()}
                        className="b2b-table-check"
                        aria-label={`${m.name} 회원 선택`}
                      />
                    </td>
                    <td className="b2b-data-table__center b2b-data-table__muted">{i + 1}</td>
                    <td className="b2b-data-table__title">{m.name}</td>
                    <td className="b2b-data-table__number b2b-data-table__muted">{m.username}</td>
                    <td className="b2b-data-table__right">
                      <strong className={`b2b-churn-rate ${churnToneClass(m.churnRate)}`}>
                        {(m.churnRate * 100).toFixed(1)}%
                      </strong>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="b2b-subpage__back">
        <Link to="/fitb/b2bmypage">
          <NavIcon id="arrow" size={16} className="ui-icon ui-icon--left" /> 마이페이지로
        </Link>
      </div>
    </section>
  );
}

export default B2bCoupon;
