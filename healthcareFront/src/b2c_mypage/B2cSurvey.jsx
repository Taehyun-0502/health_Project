import { useState } from 'react';

// B2C 회원 설문 입력 폼 (디자인 제외 Plain 버전)
// - 불만 7종을 5단계로 평가: 매우좋음(1)·좋음(2)·보통(3)·나쁨(4)·매우나쁨(5).
//   숫자가 클수록 "나쁨=불만 큼" → 모델의 이탈 위험↑ 방향과 일치(변환 없이 그대로 저장).
//   서비스(비매너/환경불편) · 기구(상태/부족) · 직원(불친절/전문성부족) · 가격
// - 부상 경험 여부(있음·없음), 부상 시 부위 입력
// - 아이디는 원래 로그인 회원 자동 기입 예정이나, 로그인 연동 전이라 직접 입력란 제공
//
// 제출 payload는 SurveyDTO 필드명과 1:1 일치해야 h_survey에 정상 저장된다.

// 5단계 척도 라벨 — index 0→1점(매우좋음) … index 4→5점(매우나쁨). 클수록 불만↑.
const SCALE_LABELS = ['매우좋음', '좋음', '보통', '나쁨', '매우나쁨'];
const COMPLAINT_GROUPS = [
  { group: '서비스 불만', items: [
    { key: 'serviceRate1', label: '비매너 회원' },
    { key: 'serviceRate2', label: '환경 불편' },
  ] },
  { group: '기구 불만', items: [
    { key: 'equipRate1', label: '기구 상태 불만' },
    { key: 'equipRate2', label: '기구 부족' },
  ] },
  { group: '직원 불만', items: [
    { key: 'employeeRate1', label: '불친절' },
    { key: 'employeeRate2', label: '전문성 부족' },
  ] },
  { group: '가격 불만', items: [
    { key: 'costRate', label: '가격 불만' },
  ] },
];

const RATE_KEYS = COMPLAINT_GROUPS.flatMap((g) => g.items.map((it) => it.key));

function B2cSurvey() {
  const [username, setUsername] = useState('');
  const [rates, setRates] = useState(() =>
    Object.fromEntries(RATE_KEYS.map((k) => [k, 0])),
  );
  const [injuryIssue, setInjuryIssue] = useState(false);
  const [injuryArea, setInjuryArea] = useState('');

  const setRate = (key, v) => setRates((prev) => ({ ...prev, [key]: v }));

  // 원 5개(매우좋음 ~ 매우나쁨) 선택 렌더 헬퍼. 저장값 = 1~5 (클수록 나쁨=불만↑).
  const renderScale = (value, onChange) =>
    [1, 2, 3, 4, 5].map((n) => (
      <span key={n} style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', marginRight: '10px' }}>
        <button
          type="button"
          title={SCALE_LABELS[n - 1]}
          onClick={() => onChange(n)}
          style={{
            cursor: 'pointer',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            border: n === value ? '2px solid var(--b2c-accent)' : '1px solid var(--gray-300)',
            background: n === value ? 'var(--b2c-accent)' : 'var(--white)',
            color: n === value ? 'var(--white)' : 'var(--gray-700)',
            fontWeight: n === value ? 'bold' : 'normal',
          }}
        >
          {n}
        </button>
        <span style={{ fontSize: '11px', color: 'var(--gray-400)', marginTop: '2px' }}>{SCALE_LABELS[n - 1]}</span>
      </span>
    ));

  const ScaleRow = ({ label, field }) => (
    <div style={{ margin: '10px 0', display: 'flex', alignItems: 'flex-start' }}>
      <label style={{ display: 'inline-block', width: '130px', paddingTop: '6px' }}>{label}</label>
      <span>{renderScale(rates[field], (v) => setRate(field, v))}</span>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || Number.isNaN(Number(username))) {
      alert('아이디(숫자)를 정확히 입력해주세요.');
      return;
    }
    if (RATE_KEYS.some((k) => !rates[k])) {
      alert('불만 항목을 모두 선택해주세요.');
      return;
    }
    if (injuryIssue && !injuryArea.trim()) {
      alert('부상 부위를 입력해주세요.');
      return;
    }

    const submitData = {
      username: Number(username),
      serviceRate1: rates.serviceRate1,
      serviceRate2: rates.serviceRate2,
      costRate: rates.costRate,
      equipRate1: rates.equipRate1,
      equipRate2: rates.equipRate2,
      employeeRate1: rates.employeeRate1,
      employeeRate2: rates.employeeRate2,
      injuryIssue,
      injuryArea: injuryIssue ? injuryArea.trim() : null,
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/survey/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert('설문이 제출되었습니다. 감사합니다!');
        setUsername('');
        setRates(Object.fromEntries(RATE_KEYS.map((k) => [k, 0])));
        setInjuryIssue(false);
        setInjuryArea('');
      } else {
        alert('제출에 실패했습니다.');
      }
    } catch (error) {
      console.error('설문 제출 오류:', error);
      alert('통신 오류가 발생했습니다.');
    }
  };

  return (
    <div style={{ padding: '16px 16px 32px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--gray-900)' }}>회원 설문</h3>
      <p style={{ color: 'var(--gray-600)', fontSize: '14px' }}>
        각 항목을 매우좋음 ~ 매우나쁨의 5단계로 평가해주세요.
      </p>

      <form onSubmit={handleSubmit}>
        {/* 아이디 (로그인 연동 전 임시 직접 입력) */}
        <div style={{ margin: '10px 0' }}>
          <label style={{ display: 'inline-block', width: '130px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-600)' }}>아이디</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="회원 아이디(전화번호)"
            required
            style={{ padding: '10px 12px', border: '1px solid var(--gray-300)', borderRadius: '10px' }}
          />
        </div>

        {/* 불만 7종 (1~5) */}
        {COMPLAINT_GROUPS.map((g) => (
          <fieldset key={g.group} style={{ margin: '12px 0', border: '1px solid var(--gray-200)', borderRadius: '12px', padding: '12px' }}>
            <legend style={{ fontWeight: 'bold', color: 'var(--gray-900)' }}>{g.group}</legend>
            {g.items.map((it) => (
              <ScaleRow key={it.key} label={it.label} field={it.key} />
            ))}
          </fieldset>
        ))}

        {/* 부상 경험 */}
        <div style={{ margin: '10px 0' }}>
          <label style={{ display: 'inline-block', width: '220px' }}>
            최근 한 달 부상 경험이 있나요?
          </label>
          <label style={{ marginRight: '12px' }}>
            <input type="radio" name="injuryIssue" checked={injuryIssue === true}
                   onChange={() => setInjuryIssue(true)} /> 있음
          </label>
          <label>
            <input type="radio" name="injuryIssue" checked={injuryIssue === false}
                   onChange={() => { setInjuryIssue(false); setInjuryArea(''); }} /> 없음
          </label>
        </div>

        {/* 부상 부위 (부상 있음일 때만) */}
        {injuryIssue && (
          <div style={{ margin: '10px 0' }}>
            <label style={{ display: 'inline-block', width: '130px', fontSize: '13px', fontWeight: '600', color: 'var(--gray-600)' }}>부상 부위</label>
            <input
              type="text"
              value={injuryArea}
              onChange={(e) => setInjuryArea(e.target.value)}
              placeholder="예: 오른쪽 어깨"
              required
              style={{ padding: '10px 12px', border: '1px solid var(--gray-300)', borderRadius: '10px' }}
            />
          </div>
        )}

        <button type="submit" style={{ marginTop: '15px', width: '100%', minHeight: '48px', padding: '12px', backgroundColor: 'var(--b2c-accent)', color: 'var(--white)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '15px' }}>설문 제출</button>
      </form>
    </div>
  );
}

export default B2cSurvey;
