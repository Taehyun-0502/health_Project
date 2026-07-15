import { useState, useEffect } from 'react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'left' }}>
      
      {/* 0. 쿠폰 발송 및 사용 상태 집계 카드 현황판 */}
      <div style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#111827' }}>📊 쿠폰 발행 및 사용 통계 현황</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          
          {/* 총 발행 수 */}
          <div style={{ padding: '12px', border: '1px solid #f3f4f6', borderRadius: '6px', backgroundColor: '#f9fafb', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px' }}>총 발행 수</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>{totalCount}건</div>
          </div>

          {/* 미사용 수 */}
          <div style={{ padding: '12px', border: '1px solid #dbeafe', borderRadius: '6px', backgroundColor: '#eff6ff', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#2563eb', marginBottom: '3px' }}>미사용 (사용대기)</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e40af' }}>{unuseCount}건</div>
          </div>

          {/* 사용 완료 수 */}
          <div style={{ padding: '12px', border: '1px solid #d1fae5', borderRadius: '6px', backgroundColor: '#ecfdf5', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#10b981', marginBottom: '3px' }}>사용 완료</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#065f46' }}>{usedCount}건</div>
          </div>

          {/* 유효기간 만료 수 */}
          <div style={{ padding: '12px', border: '1px solid #fee2e2', borderRadius: '6px', backgroundColor: '#fef2f2', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '3px' }}>기간 만료</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#991b1b' }}>{expiredCount}건</div>
          </div>

        </div>
      </div>

      {/* 1. 쿠폰 종류 생성 폼 */}
      <div style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fafafa' }}>
        <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>🎟️ 새 할인 쿠폰 종류 만들기 (커스터마이징)</h4>
        <form onSubmit={handleCreateType} style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>쿠폰 이름</label>
            <input 
              type="text" 
              value={couponName} 
              onChange={(e) => setCouponName(e.target.value)} 
              required 
              placeholder="예: 헬린이 응원 할인권" 
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>카테고리</label>
            <select 
              value={category} 
              onChange={(e) => { 
                const val = e.target.value;
                setCategory(val); 
                setCouponDate(''); 
                setCouponCount(''); 
                if (val === '체험권') {
                  setPercent('100'); // ◀ 체험권일 때 100% 자동 기입
                } else {
                  setPercent('');    // ◀ 타 카테고리로 복귀 시 초기화
                }
              }}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', height: '35px', color: '#333', backgroundColor: '#fff' }}
            >
              <option value="헬스">헬스</option>
              <option value="PT">PT</option>
              <option value="체험권">PT체험권</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>할인율 (%)</label>
            <input 
              type="number" 
              value={percent} 
              onChange={(e) => setPercent(e.target.value)} 
              required 
              min="1" 
              max="100" 
              placeholder="10" 
              readOnly={category === '체험권'} // ◀ 체험권일 시 읽기전용(수정불가) 적용
              style={{ 
                padding: '8px', 
                border: '1px solid #ccc', 
                borderRadius: '4px', 
                width: '80px',
                backgroundColor: category === '체험권' ? '#f3f4f6' : '#fff', // ◀ 체험권일 시 회색 배경
                color: category === '체험권' ? '#9ca3af' : '#333'
              }} 
            />
          </div>

          {/* 헬스, PT인 경우에만 최대 할인 한도금액(maxAmount)을 기입하도록 노출 */}
          {category !== '체험권' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>최대 할인 금액 (원)</label>
              <input 
                type="number" 
                value={maxAmount} 
                onChange={(e) => setMaxAmount(e.target.value)} 
                required 
                placeholder="10000" 
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '120px' }} 
              />
            </div>
          )}

          {/* 오직 PT체험권 계열인 경우에만 할인 횟수를 입력하도록 노출 */}
          {category === '체험권' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>할인 적용 횟수 (PT)</label>
              <input 
                type="number" 
                value={couponCount} 
                onChange={(e) => setCouponCount(e.target.value)} 
                required 
                placeholder="10" 
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '80px' }} 
              />
            </div>
          )}

          <button type="submit" style={{ padding: '9px 16px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
            등록하기
          </button>
        </form>
      </div>

      {/* 2. 등록된 쿠폰 종류 목록 및 발송 */}
      <div>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>📋 등록된 쿠폰 목록 및 발송 현황</h4>
        {couponTypes.length === 0 ? (
          <p style={{ color: '#999', fontSize: '14px' }}>등록된 쿠폰 종류가 없습니다.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', color: '#333' }}>
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#333' }}>쿠폰명</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#333' }}>종류</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#333' }}>할인율</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#333' }}>상세 혜택</th>
                <th style={{ padding: '10px', textAlign: 'center', color: '#333' }}>누적 발송 수</th>
                <th style={{ padding: '10px', textAlign: 'center', color: '#333' }}>발송 작업</th>
              </tr>
            </thead>
            <tbody>
              {couponTypes.map((type) => (
                <tr key={type.couponNum} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#333' }}>{type.couponName}</td>
                  <td style={{ padding: '10px', color: '#333' }}>{type.category}</td>
                  <td style={{ padding: '10px', color: '#2563eb', fontWeight: 'bold' }}>{type.percent}%</td>
                  <td style={{ padding: '10px', color: '#333' }}>
                    {type.category === '헬스' && `헬스권 ${type.percent}% 할인 (최대 ${type.maxAmount}원)`}
                    {type.category === 'PT' && `PT ${type.percent}% 할인 (최대 ${type.maxAmount}원)`}
                    {type.category === '체험권' && `${type.couponCount}회 PT 무료체험`}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#e11d48', fontWeight: 'bold' }}>
                    {type.sendCount}회
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <button 
                      onClick={() => setSelectedType(type)}
                      style={{ padding: '4px 10px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    >
                      회원에게 전송
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 3. 회원 발송 레이어 모달 */}
      {selectedType && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ backgroundColor: '#fff', padding: '25px', borderRadius: '8px', width: '350px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: '#333' }}>✉️ 쿠폰 발송 설정</h4>
            <p style={{ fontSize: '12px', color: '#666', marginBottom: '15px' }}>
              선택한 쿠폰: <strong style={{ color: '#333' }}>{selectedType.couponName} ({selectedType.percent}%)</strong>
            </p>
            <form onSubmit={handleSendCoupon} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#333' }}>
                  수신 회원 선택 ({selectedMembers.length}명 선택됨)
                </label>
                
                {/* 전체 선택 체크박스 + 이탈위험(가격불만) 회원 선택 */}
                <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="checkAll"
                    checked={selectedMembers.length === members.length && members.length > 0}
                    onChange={(e) => handleCheckAll(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="checkAll" style={{ marginLeft: '6px', fontSize: '12px', fontWeight: 'bold', color: '#111827', cursor: 'pointer' }}>
                    전체 회원 선택
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectChurnRisk}
                    style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                             border: '1px solid #ef6c00', borderRadius: '4px', backgroundColor: '#fff', color: '#ef6c00' }}
                  >
                    이탈위험 회원 선택 (가격불만)
                  </button>
                </div>

                {/* 회원 목록 개별 체크박스 스크롤 리스트 */}
                <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ccc', borderRadius: '4px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#fff' }}>
                  {members.map((member) => (
                    <div key={member.username} style={{ display: 'flex', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        id={`member-${member.username}`}
                        checked={selectedMembers.includes(member.username)}
                        onChange={() => handleCheckMember(member.username)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label htmlFor={`member-${member.username}`} style={{ marginLeft: '8px', fontSize: '12px', color: '#333', cursor: 'pointer' }}>
                        {member.name} ({member.username})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>사용 만료 기한</label>
                <input 
                  type="date" 
                  value={expiryDate} 
                  onChange={(e) => setExpiryDate(e.target.value)} 
                  required 
                  style={{ width: '90%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#333' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  onClick={() => { setSelectedType(null); setSelectedMembers([]); setExpiryDate(''); }}
                  style={{ padding: '6px 12px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}
                >
                  취소
                </button>
                <button 
                  type="submit" 
                  style={{ padding: '6px 15px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  보내기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default B2bPromotion;
