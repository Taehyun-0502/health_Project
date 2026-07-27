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
    <div style={{ padding: '0 0 16px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--gray-900)' }}>내 쿠폰함</h3>
      <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '15px' }}>회원님이 보유하고 계신 가맹점 할인 혜택 쿠폰 목록입니다.</p>

      {coupons.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>보유 중인 혜택 쿠폰이 없습니다.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-600)', borderBottom: '2px solid var(--gray-200)', whiteSpace: 'nowrap' }}>
                <th style={{ padding: '8px 4px', textAlign: 'left', whiteSpace: 'nowrap' }}>보낸사람</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', whiteSpace: 'nowrap' }}>쿠폰 이름</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', whiteSpace: 'nowrap' }}>종류</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', whiteSpace: 'nowrap' }}>할인률</th>
                <th style={{ padding: '8px 4px', textAlign: 'left', whiteSpace: 'nowrap' }}>혜택 상세</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>만료일</th>
                <th style={{ padding: '8px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((coupon) => (
                <tr key={coupon.couponId} style={{ borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap' }}>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{coupon.fromName}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{coupon.couponName}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{coupon.category}</td>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>{coupon.percent}%</td>
                  <td style={{ padding: '8px 4px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                    {/* 카테고리별 혜택 종류 조건 분기 화면 표시 */}
                    {coupon.category === '헬스' && coupon.maxAmount && `최대 ${coupon.maxAmount}원 할인`}
                    {coupon.category === 'PT' && coupon.maxAmount && `최대 ${coupon.maxAmount}원 할인`}
                    {coupon.category === '체험권' && coupon.couponCount && `${coupon.couponCount}회`}
                  </td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--gray-600)', whiteSpace: 'nowrap' }}>{coupon.date}</td>
                  <td style={{ padding: '8px 4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '600',
                      backgroundColor: coupon.status === '미사용' ? 'var(--success-bg)' : 'var(--gray-100)',
                      color: coupon.status === '미사용' ? 'var(--success)' : 'var(--gray-400)'
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
                style={{ padding: '8px 12px', cursor: 'pointer', border: '1px solid var(--gray-300)', borderRadius: '10px', backgroundColor: 'var(--white)', color: 'var(--gray-700)' }}
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    border: currentPage === page ? '1px solid var(--black)' : '1px solid var(--gray-300)',
                    borderRadius: '10px',
                    backgroundColor: currentPage === page ? 'var(--black)' : 'var(--white)',
                    color: currentPage === page ? 'var(--white)' : 'var(--gray-700)',
                    fontWeight: currentPage === page ? 'bold' : 'normal'
                  }}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                style={{ padding: '8px 12px', cursor: 'pointer', border: '1px solid var(--gray-300)', borderRadius: '10px', backgroundColor: 'var(--white)', color: 'var(--gray-700)' }}
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
