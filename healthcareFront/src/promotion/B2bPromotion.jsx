import { useState, useEffect } from 'react';
import './B2bPromotion.css';

// B2B 사장님용 쿠폰 종류 등록 및 회원 발송 관리 컴포넌트
function B2bPromotion() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // 상태 관리 (쿠폰 종류 목록, 입력 폼 데이터 등)
  const [couponTypes, setCouponTypes] = useState([]);
  const [members, setMembers] = useState([]); // ◀ 지점 회원 목록 상태 추가
  const [sentCoupons, setSentCoupons] = useState([]); // ◀ 발송 쿠폰 전체 상태 추가
  const [category, setCategory] = useState('헬스');
  const [percent, setPercent] = useState('');
  const [couponName, setCouponName] = useState('');
  const [maxAmount, setMaxAmount] = useState(''); // ◀ couponDate를 maxAmount(최대적용금액) 상태로 변경
  const [couponCount, setCouponCount] = useState('');

  // 발송 폼용 상태 관리
  const [selectedType, setSelectedType] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]); // ◀ 복수 선택된 회원 목록 (배열)
  const [expiryDate, setExpiryDate] = useState('');

  // 개별 회원 체크박스 클릭 토글 핸들러
  const handleCheckMember = (username) => {
    if (selectedMembers.includes(username)) {
      setSelectedMembers(selectedMembers.filter(id => id !== username));
    } else {
      setSelectedMembers([...selectedMembers, username]);
    }
  };

  // 전체 선택 / 해제 토글 핸들러
  const handleCheckAll = (checked) => {
    if (checked) {
      setSelectedMembers(members.map(m => m.username));
    } else {
      setSelectedMembers([]);
    }
  };

  // 이탈위험(가격불만) 회원만 선택 — 최신 예측 기준 위험군 중 '가격불만' 이탈요인 보유자
  const handleSelectChurnRisk = async () => {
    if (!user.gymId) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/result/members/byFactor`
        + `?gymId=${user.gymId}&statKey=${encodeURIComponent('가격불만')}`);
      if (!res.ok) { alert('이탈위험 회원 조회에 실패했습니다.'); return; }
      const data = await res.json();
      const riskSet = new Set((Array.isArray(data) ? data : []).map(d => String(d.username)));
      const picked = members.filter(m => riskSet.has(String(m.username))).map(m => m.username);
      setSelectedMembers(picked);
      if (picked.length === 0) alert('가격불만 이탈위험 회원이 없습니다.');
    } catch (err) {
      console.error('이탈위험 회원 선택 오류:', err);
      alert('이탈위험 회원 조회 중 오류가 발생했습니다.');
    }
  };

  // 지점의 등록된 쿠폰 종류 목록 백엔드 로드
  const fetchCouponTypes = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user.gymId) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/type/list?gymId=${user.gymId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCouponTypes(data);
      }
    } catch (err) {
      console.error('쿠폰 종류 목록 로드 실패:', err);
    }
  };

  // 소속 지점의 일반 회원 목록 백엔드 로드
  const fetchMembers = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !user.gymId) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/member/list/gym?gymId=${user.gymId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('지점 회원 목록 로드 실패:', err);
    }
  };

  // 사장님이 발송한 쿠폰 상태 현황 목록 백엔드 로드
  const fetchSentCoupons = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSentCoupons(data);
      }
    } catch (err) {
      console.error('발송 쿠폰 상태 목록 로드 실패:', err);
    }
  };

  useEffect(() => {
    fetchCouponTypes();
    fetchMembers(); // ◀ 회원 목록 로드 메서드 기동
    fetchSentCoupons(); // ◀ 발송 쿠폰 상태 목록 로드 기동
  }, []);

  // 사장님의 새로운 쿠폰 종류 생성 처리 핸들러
  const handleCreateType = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const requestBody = {
      category,
      percent: Number(percent),
      couponName,
      gymId: user.gymId,
      maxAmount: category !== '체험권' ? Number(maxAmount) : null, // ◀ couponDate 대신 maxAmount 기입
      couponCount: category === '체험권' ? Number(couponCount) : null // ◀ 오직 체험권일 때만 횟수 지정
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/type/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        alert('할인 쿠폰 종류가 정상 등록되었습니다.');
        setCouponName('');
        setPercent('');
        setMaxAmount(''); // ◀ 입력 초기화
        setCouponCount('');
        fetchCouponTypes(); // ◀ 추가: 쿠폰 종류 목록 실시간 갱신 트리거
      } else {
        alert('등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('쿠폰 종류 등록 통신 오류:', err);
    }
  };

  // 선택된 쿠폰 종류를 특정 회원(들)에게 최종 발송하는 핸들러 (다중 발송 지원)
  const handleSendCoupon = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token || !selectedType) return;

    if (selectedMembers.length === 0) {
      alert('쿠폰을 발송할 회원을 1명 이상 선택해 주세요.');
      return;
    }
    if (!expiryDate) {
      alert('쿠폰 만료일을 지정해주세요.');
      return;
    }

    // 선택된 전원에게 비동기 발송 Promise 배열 생성
    const sendPromises = selectedMembers.map(async (memberId) => {
      const requestBody = {
        toId: Number(memberId),
        couponNum: selectedType.couponNum,
        couponName: selectedType.couponName,
        date: expiryDate
      };

      return fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });
    });

    try {
      const responses = await Promise.all(sendPromises);
      
      // 개별 실패 결과 파싱 및 수집
      const failedResults = [];
      for (let i = 0; i < responses.length; i++) {
        const res = responses[i];
        if (!res.ok) {
          const username = selectedMembers[i];
          const memberObj = members.find(m => m.username === username);
          const name = memberObj ? memberObj.name : username;
          const errText = await res.text();
          failedResults.push(`${name}님: ${errText}`);
        }
      }

      if (failedResults.length === 0) {
        alert(`선택된 회원 ${selectedMembers.length}명에게 쿠폰이 정상적으로 일괄 발송되었습니다.`);
        setSelectedMembers([]); // 복수 선택 리셋
        setExpiryDate('');
        setSelectedType(null); // 모달 닫기
        fetchCouponTypes(); // 발송 수(sendCount) 업데이트를 위해 목록 갱신
        fetchSentCoupons();  // 통계 카운트 실시간 동기화
      } else {
        // 실패 건수가 있는 경우 일괄 실패 명세 경고 알림
        alert(`일부 회원에게 쿠폰 발송을 실패했습니다.\n\n[실패 내역]\n${failedResults.join('\n')}`);
        setSelectedMembers([]); // 선택 배열 비우기
        setExpiryDate('');
        setSelectedType(null); // 모달 닫기
        fetchCouponTypes();
        fetchSentCoupons();
      }
    } catch (err) {
      console.error('쿠폰 일괄 발송 중 오류:', err);
      alert('통신 오류로 인해 일괄 쿠폰 발송에 실패했습니다.');
    }
  };

  // 발송된 전체 쿠폰 통계 파생 계산 (Derived State)
  const totalCount = sentCoupons.length;
  const unuseCount = sentCoupons.filter(c => c.status === '미사용').length;
  const usedCount = sentCoupons.filter(c => c.status === '사용완료').length;
  const expiredCount = sentCoupons.filter(c => c.status === '기간만료').length;

  return (
    <section className="promotion-page">
      {/* 0. 쿠폰 발송 및 사용 상태 집계 카드 현황판 */}
      <section className="promotion-card" aria-labelledby="promotion-summary-title">
        <div className="promotion-section-head">
          <div>
            <h2 id="promotion-summary-title" className="promotion-section-title">쿠폰 발행 및 사용 통계</h2>
            <p className="promotion-section-desc">발송한 쿠폰의 현재 사용 상태를 확인합니다.</p>
          </div>
        </div>
        <div className="promotion-stats">
          {/* 총 발행 수 */}
          <div className="promotion-stat">
            <span className="promotion-stat__label">총 발행 수</span>
            <strong className="promotion-stat__value">{totalCount}건</strong>
          </div>

          {/* 미사용 수 */}
          <div className="promotion-stat promotion-stat--waiting">
            <span className="promotion-stat__label">미사용 (사용대기)</span>
            <strong className="promotion-stat__value">{unuseCount}건</strong>
          </div>

          {/* 사용 완료 수 */}
          <div className="promotion-stat promotion-stat--complete">
            <span className="promotion-stat__label">사용 완료</span>
            <strong className="promotion-stat__value">{usedCount}건</strong>
          </div>

          {/* 유효기간 만료 수 */}
          <div className="promotion-stat promotion-stat--expired">
            <span className="promotion-stat__label">기간 만료</span>
            <strong className="promotion-stat__value">{expiredCount}건</strong>
          </div>
        </div>
      </section>

      {/* 1. 쿠폰 종류 생성 폼 */}
      <section className="promotion-card" aria-labelledby="promotion-create-title">
        <div className="promotion-section-head">
          <div>
            <h2 id="promotion-create-title" className="promotion-section-title">새 쿠폰 만들기</h2>
            <p className="promotion-section-desc">쿠폰 이름과 혜택 조건을 설정해 새 유형을 등록합니다.</p>
          </div>
        </div>
        <form onSubmit={handleCreateType} className="promotion-create-form">
          <div className="promotion-field promotion-field--name">
            <label className="promotion-label" htmlFor="promotion-coupon-name">쿠폰 이름</label>
            <input 
              id="promotion-coupon-name"
              type="text" 
              value={couponName} 
              onChange={(e) => setCouponName(e.target.value)} 
              required 
              placeholder="예: 헬린이 응원 할인권" 
              className="promotion-input"
            />
          </div>
          <div className="promotion-field">
            <label className="promotion-label" htmlFor="promotion-category">카테고리</label>
            <select 
              id="promotion-category"
              value={category} 
              onChange={(e) => { 
                const val = e.target.value;
                setCategory(val); 
                setMaxAmount(''); 
                setCouponCount(''); 
                if (val === '체험권') {
                  setPercent('100'); // ◀ 체험권일 때 100% 자동 기입
                } else {
                  setPercent('');    // ◀ 타 카테고리로 복귀 시 초기화
                }
              }}
              className="promotion-input promotion-select"
            >
              <option value="헬스">헬스</option>
              <option value="PT">PT</option>
              <option value="체험권">PT체험권</option>
            </select>
          </div>
          <div className="promotion-field">
            <label className="promotion-label" htmlFor="promotion-percent">할인율 (%)</label>
            <input 
              id="promotion-percent"
              type="number" 
              value={percent} 
              onChange={(e) => setPercent(e.target.value)} 
              required 
              min="1" 
              max="100" 
              placeholder="10" 
              readOnly={category === '체험권'} // ◀ 체험권일 시 읽기전용(수정불가) 적용
              className="promotion-input"
            />
          </div>

          {/* 헬스, PT인 경우에만 최대 할인 한도금액(maxAmount)을 기입하도록 노출 */}
          {category !== '체험권' && (
            <div className="promotion-field">
              <label className="promotion-label" htmlFor="promotion-max-amount">최대 할인 금액 (원)</label>
              <input 
                id="promotion-max-amount"
                type="number" 
                value={maxAmount} 
                onChange={(e) => setMaxAmount(e.target.value)} 
                required 
                placeholder="10000" 
                className="promotion-input"
              />
            </div>
          )}

          {/* 오직 PT체험권 계열인 경우에만 할인 횟수를 입력하도록 노출 */}
          {category === '체험권' && (
            <div className="promotion-field">
              <label className="promotion-label" htmlFor="promotion-coupon-count">할인 적용 횟수 (PT)</label>
              <input 
                id="promotion-coupon-count"
                type="number" 
                value={couponCount} 
                onChange={(e) => setCouponCount(e.target.value)} 
                required 
                placeholder="10" 
                className="promotion-input"
              />
            </div>
          )}

          <button type="submit" className="promotion-button promotion-button--primary">
            등록하기
          </button>
        </form>
      </section>

      {/* 2. 등록된 쿠폰 종류 목록 및 발송 */}
      <section className="promotion-card" aria-labelledby="promotion-list-title">
        <div className="promotion-section-head promotion-section-head--list">
          <div>
            <h2 id="promotion-list-title" className="promotion-section-title">등록된 쿠폰</h2>
            <p className="promotion-section-desc">쿠폰별 혜택과 누적 발송 수를 확인하고 회원에게 전송합니다.</p>
          </div>
          <span className="promotion-count">총 {couponTypes.length}개</span>
        </div>
        {couponTypes.length === 0 ? (
          <p className="promotion-empty">등록된 쿠폰 종류가 없습니다.</p>
        ) : (
          <div className="promotion-table-wrap">
            <table className="promotion-table">
              <thead>
                <tr>
                  <th>쿠폰명</th>
                  <th>종류</th>
                  <th>할인율</th>
                  <th>상세 혜택</th>
                  <th className="promotion-table__center">누적 발송 수</th>
                  <th className="promotion-table__center">발송 작업</th>
                </tr>
              </thead>
              <tbody>
                {couponTypes.map((type) => (
                  <tr key={type.couponNum}>
                    <td className="promotion-table__name">{type.couponName}</td>
                    <td>
                      <span className={`promotion-badge ${
                        type.category === 'PT'
                          ? 'promotion-badge--pt'
                          : type.category === '체험권'
                            ? 'promotion-badge--trial'
                            : 'promotion-badge--gym'
                      }`}>
                        {type.category}
                      </span>
                    </td>
                    <td className="promotion-table__percent">{type.percent}%</td>
                    <td>
                      {type.category === '헬스' && `헬스권 ${type.percent}% 할인 (최대 ${type.maxAmount}원)`}
                      {type.category === 'PT' && `PT ${type.percent}% 할인 (최대 ${type.maxAmount}원)`}
                      {type.category === '체험권' && `${type.couponCount}회 PT 무료체험`}
                    </td>
                    <td className="promotion-table__center promotion-table__number">
                      {type.sendCount}회
                    </td>
                    <td className="promotion-table__center">
                      <button
                        type="button"
                        onClick={() => setSelectedType(type)}
                        className="promotion-button promotion-button--table"
                      >
                        회원에게 전송
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. 회원 발송 레이어 모달 */}
      {selectedType && (
        <div className="promotion-modal-back">
          <div
            className="promotion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promotion-send-title"
          >
            <div className="promotion-modal__head">
              <h2 id="promotion-send-title" className="promotion-modal__title">쿠폰 발송 설정</h2>
              <p className="promotion-modal__desc">발송할 회원과 쿠폰 만료일을 선택합니다.</p>
            </div>
            <p className="promotion-selected-coupon">
              <span>선택한 쿠폰</span>
              <strong>{selectedType.couponName} ({selectedType.percent}%)</strong>
            </p>
            <form onSubmit={handleSendCoupon} className="promotion-send-form">
              <div>
                <p className="promotion-send-label">
                  수신 회원 선택 ({selectedMembers.length}명 선택됨)
                </p>
                
                {/* 전체 선택 체크박스 + 이탈위험(가격불만) 회원 선택 */}
                <div className="promotion-member-tools">
                  <label className="promotion-check">
                    <input
                      type="checkbox"
                      id="checkAll"
                      checked={selectedMembers.length === members.length && members.length > 0}
                      onChange={(e) => handleCheckAll(e.target.checked)}
                    />
                    <span>전체 회원 선택</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectChurnRisk}
                    className="promotion-button promotion-button--risk"
                  >
                    이탈위험 회원 선택 (가격불만)
                  </button>
                </div>

                {/* 회원 목록 개별 체크박스 스크롤 리스트 */}
                <div className="promotion-member-list">
                  {members.map((member) => (
                    <label key={member.username} className="promotion-member">
                      <input 
                        type="checkbox" 
                        id={`member-${member.username}`}
                        checked={selectedMembers.includes(member.username)}
                        onChange={() => handleCheckMember(member.username)}
                      />
                      <span>
                        {member.name} ({member.username})
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="promotion-field">
                <label className="promotion-label" htmlFor="promotion-expiry-date">사용 만료 기한</label>
                <input 
                  id="promotion-expiry-date"
                  type="date" 
                  value={expiryDate} 
                  onChange={(e) => setExpiryDate(e.target.value)} 
                  required 
                  className="promotion-input"
                />
              </div>

              <div className="promotion-modal__actions">
                <button 
                  type="button" 
                  onClick={() => { setSelectedType(null); setSelectedMembers([]); setExpiryDate(''); }}
                  className="promotion-button promotion-button--secondary"
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  className="promotion-button promotion-button--primary"
                >
                  보내기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default B2bPromotion;
