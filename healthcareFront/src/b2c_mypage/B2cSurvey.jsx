import { useState } from 'react';

// B2C 회원 만족도 설문 입력 폼 (디자인 제외 Plain 버전)
// - 만족도 4종(가격/직원/서비스/기구)을 1~5 별점으로 입력
// - 불편 회원 경험 / 부상 경험 여부(있음·없음), 부상 시 부위 입력
// - 아이디는 원래 로그인 회원 자동 기입 예정이나, 로그인 연동 전이라 직접 입력란 제공
function B2cSurvey() {
  const [username, setUsername] = useState('');
  const [rates, setRates] = useState({ cost: 0, employee: 0, service: 0, equip: 0 });
  const [memberIssue, setMemberIssue] = useState(false);
  const [injuryIssue, setInjuryIssue] = useState(false);
  const [injuryArea, setInjuryArea] = useState('');

  const setRate = (key, v) => setRates((prev) => ({ ...prev, [key]: v }));

  // 별점 1~5 렌더 헬퍼
  const renderStars = (value, onChange) =>
    [1, 2, 3, 4, 5].map((n) => (
      <span
        key={n}
        onClick={() => onChange(n)}
        style={{ cursor: 'pointer', fontSize: '26px', color: n <= value ? '#f5b301' : '#ccc' }}
      >
        ★
      </span>
    ));

  const StarRow = ({ label, field }) => (
    <div style={{ margin: '10px 0' }}>
      <label style={{ display: 'inline-block', width: '110px' }}>{label}</label>
      {renderStars(rates[field], (v) => setRate(field, v))}
      <span style={{ marginLeft: '8px', color: '#666' }}>
        {rates[field] > 0 ? `${rates[field]}점` : '미선택'}
      </span>
    </div>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!username.trim() || Number.isNaN(Number(username))) {
      alert('아이디(숫자)를 정확히 입력해주세요.');
      return;
    }
    if (!rates.cost || !rates.employee || !rates.service || !rates.equip) {
      alert('만족도 4개 항목을 모두 선택해주세요.');
      return;
    }
    if (injuryIssue && !injuryArea.trim()) {
      alert('부상 부위를 입력해주세요.');
      return;
    }

    const submitData = {
      username: Number(username),
      costRate: rates.cost,
      employeeRate: rates.employee,
      serviceRate: rates.service,
      equipRate: rates.equip,
      memberIssue,
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
        setRates({ cost: 0, employee: 0, service: 0, equip: 0 });
        setMemberIssue(false);
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
    <div>
      <h3>회원 만족도 설문</h3>

      <form onSubmit={handleSubmit}>
        {/* 아이디 (로그인 연동 전 임시 직접 입력) */}
        <div style={{ margin: '10px 0' }}>
          <label style={{ display: 'inline-block', width: '110px' }}>아이디</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="회원 아이디(전화번호)"
            required
          />
        </div>

        {/* 만족도 별점 */}
        <StarRow label="가격 만족도" field="cost" />
        <StarRow label="직원 만족도" field="employee" />
        <StarRow label="서비스 만족도" field="service" />
        <StarRow label="기구 만족도" field="equip" />

        {/* 불편 회원 경험 */}
        <div style={{ margin: '10px 0' }}>
          <label style={{ display: 'inline-block', width: '220px' }}>
            이번 달 불편했던 경험이 있나요?
          </label>
          <label style={{ marginRight: '12px' }}>
            <input type="radio" name="memberIssue" checked={memberIssue === true}
                   onChange={() => setMemberIssue(true)} /> 있음
          </label>
          <label>
            <input type="radio" name="memberIssue" checked={memberIssue === false}
                   onChange={() => setMemberIssue(false)} /> 없음
          </label>
        </div>

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
            <label style={{ display: 'inline-block', width: '110px' }}>부상 부위</label>
            <input
              type="text"
              value={injuryArea}
              onChange={(e) => setInjuryArea(e.target.value)}
              placeholder="예: 오른쪽 어깨"
              required
            />
          </div>
        )}

        <button type="submit" style={{ marginTop: '15px' }}>설문 제출</button>
      </form>
    </div>
  );
}

export default B2cSurvey;
