import { useState } from 'react';
import './B2cPages.css';

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
      <span key={n} className="b2c-rating__option">
        <button
          type="button"
          title={SCALE_LABELS[n - 1]}
          onClick={() => onChange(n)}
          className={`b2c-rating__button${n === value ? ' is-selected' : ''}`}
          aria-pressed={n === value}
        >
          {n}
        </button>
        <span className="b2c-rating__label">{SCALE_LABELS[n - 1]}</span>
      </span>
    ));

  const ScaleRow = ({ label, field }) => (
    <div className="b2c-survey__row">
      <span className="b2c-survey__item-label">{label}</span>
      <div className="b2c-rating">{renderScale(rates[field], (v) => setRate(field, v))}</div>
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
    <div className="b2c-page">
      <header className="b2c-page__header">
        <h2 className="b2c-page__title">회원 설문</h2>
        <p className="b2c-page__description">
          각 항목을 매우좋음 ~ 매우나쁨의 5단계로 평가해주세요.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="b2c-survey">
        {/* 아이디 (로그인 연동 전 임시 직접 입력) */}
        <div className="b2c-form__group">
          <label className="b2c-form__label">아이디</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="회원 아이디(전화번호)"
            required
            className="b2c-form__input"
          />
        </div>

        {/* 불만 7종 (1~5) */}
        {COMPLAINT_GROUPS.map((g) => (
          <fieldset key={g.group} className="b2c-survey__fieldset">
            <legend className="b2c-survey__legend">{g.group}</legend>
            {g.items.map((it) => (
              <ScaleRow key={it.key} label={it.label} field={it.key} />
            ))}
          </fieldset>
        ))}

        {/* 부상 경험 */}
        <div className="b2c-survey__injury">
          <span className="b2c-survey__question">
            최근 한 달 부상 경험이 있나요?
          </span>
          <div className="b2c-survey__radios">
            <label className="b2c-radio-option">
              <input type="radio" name="injuryIssue" checked={injuryIssue === true}
                     onChange={() => setInjuryIssue(true)} /> 있음
            </label>
            <label className="b2c-radio-option">
              <input type="radio" name="injuryIssue" checked={injuryIssue === false}
                     onChange={() => { setInjuryIssue(false); setInjuryArea(''); }} /> 없음
            </label>
          </div>
        </div>

        {/* 부상 부위 (부상 있음일 때만) */}
        {injuryIssue && (
          <div className="b2c-form__group">
            <label className="b2c-form__label">부상 부위</label>
            <input
              type="text"
              value={injuryArea}
              onChange={(e) => setInjuryArea(e.target.value)}
              placeholder="예: 오른쪽 어깨"
              required
              className="b2c-form__input"
            />
          </div>
        )}

        <button type="submit" className="b2c-button">설문 제출</button>
      </form>
    </div>
  );
}

export default B2cSurvey;
