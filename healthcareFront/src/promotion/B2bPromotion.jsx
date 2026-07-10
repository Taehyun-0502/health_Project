import { useState, useEffect } from 'react';

// B2B 사장님용 쿠폰 종류 등록 및 회원 발송 관리 컴포넌트
function B2bPromotion() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  // 상태 관리 (쿠폰 종류 목록, 입력 폼 데이터 등)
  const [couponTypes, setCouponTypes] = useState([]);
  const [category, setCategory] = useState('헬스');
  const [percent, setPercent] = useState('');
  const [couponName, setCouponName] = useState('');
  const [couponDate, setCouponDate] = useState('');
  const [couponCount, setCouponCount] = useState('');

  // 발송 폼용 상태 관리
  const [selectedType, setSelectedType] = useState(null);
  const [receiverId, setReceiverId] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

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

  useEffect(() => {
    fetchCouponTypes();
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
      couponDate: category === '헬스' ? Number(couponDate) : null,
      couponCount: category === 'PT' ? Number(couponCount) : null
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
        alert('새로운 쿠폰 종류가 정상 등록되었습니다.');
        setPercent('');
        setCouponName('');
        setCouponDate('');
        setCouponCount('');
        fetchCouponTypes(); // 목록 갱신
      } else {
        alert('등록에 실패했습니다.');
      }
    } catch (err) {
      console.error('쿠폰 종류 등록 통신 오류:', err);
    }
  };

  // 선택된 쿠폰 종류를 특정 회원에게 최종 발송하는 핸들러
  const handleSendCoupon = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token || !selectedType) return;

    if (!receiverId.trim() || Number.isNaN(Number(receiverId))) {
      alert('올바른 회원 아이디(숫자)를 입력해주세요.');
      return;
    }
    if (!expiryDate) {
      alert('쿠폰 만료일을 지정해주세요.');
      return;
    }

    const requestBody = {
      toId: Number(receiverId),
      couponNum: selectedType.couponNum,
      couponName: selectedType.couponName,
      date: expiryDate
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        alert('해당 회원에게 쿠폰이 정상 발송되었습니다.');
        setReceiverId('');
        setExpiryDate('');
        setSelectedType(null); // 모달 닫기
        fetchCouponTypes(); // 발송 수(sendCount) 업데이트를 위해 목록 갱신
      } else {
        const errText = await response.text();
        alert(`발송 실패: ${errText}`);
      }
    } catch (err) {
      console.error('쿠폰 발송 중 오류:', err);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', textAlign: 'left' }}>
      
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
              onChange={(e) => { setCategory(e.target.value); setCouponDate(''); setCouponCount(''); }}
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', height: '35px' }}
            >
              <option value="헬스">헬스</option>
              <option value="PT">PT</option>
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
              style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '80px' }} 
            />
          </div>

          {category === '헬스' ? (
            <div>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>적용 개월수</label>
              <input 
                type="number" 
                value={couponDate} 
                onChange={(e) => setCouponDate(e.target.value)} 
                required 
                placeholder="3" 
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '80px' }} 
              />
            </div>
          ) : (
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
                    {type.category === '헬스' ? `${type.couponDate}개월 이용권 적용` : `${type.couponCount}회 PT 할인`}
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
                <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#333' }}>수신 회원 아이디(전화번호)</label>
                <input 
                  type="text" 
                  value={receiverId} 
                  onChange={(e) => setReceiverId(e.target.value)} 
                  required 
                  placeholder="예: 66666602"
                  style={{ width: '90%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', color: '#333' }}
                />
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
                  onClick={() => { setSelectedType(null); setReceiverId(''); setExpiryDate(''); }}
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
