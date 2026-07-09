import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// B2C 일반 회원 마이페이지용 쿠폰함 컴포넌트
function B2cCoupon() {
  const [coupons, setCoupons] = useState([]);
  const [currentPage, setCurrentPage] = useState(1); // 현재 활성화된 페이지 번호 상태
  const itemsPerPage = 5; // 페이지당 출력할 쿠폰 개수 고정
  const navigate = useNavigate();

  // 회원의 보유 쿠폰 목록 백엔드 조회
  const fetchCoupons = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate('/');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/tolist`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCoupons(data);
      } else {
        const errorText = await response.text();
        console.error('쿠폰 목록 로드 실패:', errorText);
      }
    } catch (error) {
      console.error('쿠폰 조회 통신 오류:', error);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // 전체 페이지 수 동적 계산
  const totalPages = Math.ceil(coupons.length / itemsPerPage);

  // 현재 페이지에 해당하는 범위의 쿠폰들만 슬라이싱 추출
  const currentItems = coupons.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 페이지 이동 처리 핸들러
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '10px' }}>
      <h3>내 쿠폰함</h3>
      <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>회원님이 보유하고 계신 가맹점 할인 혜택 쿠폰 목록입니다.</p>

      {coupons.length === 0 ? (
        <p style={{ color: '#999', marginTop: '20px', textAlign: 'center', fontSize: '14px' }}>보유 중인 혜택 쿠폰이 없습니다.</p>
      ) : (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#0b0b0be5', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '10px', textAlign: 'left' }}>보낸사람</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>쿠폰 이름</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>종류</th>
                <th style={{ padding: '10px', textAlign: 'left' }}>할인률(%)</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>만료일</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((coupon) => (
                <tr key={coupon.couponId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{coupon.fromName}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{coupon.couponName}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{coupon.category}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{coupon.percent}</td>
                  <td style={{ padding: '10px', textAlign: 'center', color: '#666' }}>{coupon.date}</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      backgroundColor: coupon.status === '미사용' ? '#dcfce7' : '#f3f4f6',
                      color: coupon.status === '미사용' ? '#15803d' : '#9ca3af'
                    }}>
                      {coupon.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이징 내비게이션 바 (총 페이지가 1개 이하일 때는 2번 룰에 의해 자동 숨김 처리) */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '20px' }}>
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                style={{ padding: '5px 10px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: '5px 10px',
                    cursor: 'pointer',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    backgroundColor: currentPage === page ? '#007bff' : '#fff',
                    color: currentPage === page ? '#fff' : '#000',
                    fontWeight: currentPage === page ? 'bold' : 'normal'
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{ padding: '5px 10px', cursor: 'pointer', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}
              >
                다음
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default B2cCoupon;
