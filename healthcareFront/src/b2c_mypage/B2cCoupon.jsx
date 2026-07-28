import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './B2cPages.css';

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
    <div className="b2c-page">
      <header className="b2c-page__header">
        <h2 className="b2c-page__title">내 쿠폰함</h2>
        <p className="b2c-page__description">회원님이 보유하고 계신 가맹점 할인 혜택 쿠폰 목록입니다.</p>
      </header>

      {coupons.length === 0 ? (
        <p className="b2c-empty">보유 중인 혜택 쿠폰이 없어요.</p>
      ) : (
        <>
          <table className="b2c-data-table">
            <thead>
              <tr>
                <th>보낸사람</th>
                <th>쿠폰 이름</th>
                <th>종류</th>
                <th>할인률</th>
                <th>혜택 상세</th>
                <th>만료일</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.map((coupon) => (
                <tr key={coupon.couponId}>
                  <td data-label="보낸사람">{coupon.fromName}</td>
                  <td data-label="쿠폰 이름" className="b2c-data-table__primary">{coupon.couponName}</td>
                  <td data-label="종류">{coupon.category}</td>
                  <td data-label="할인률" className="b2c-data-table__accent">{coupon.percent}%</td>
                  <td data-label="혜택 상세">
                    {/* 카테고리별 혜택 종류 조건 분기 화면 표시 */}
                    {coupon.category === '헬스' && coupon.maxAmount && `최대 ${coupon.maxAmount}원 할인`}
                    {coupon.category === 'PT' && coupon.maxAmount && `최대 ${coupon.maxAmount}원 할인`}
                    {coupon.category === '체험권' && coupon.couponCount && `${coupon.couponCount}회`}
                  </td>
                  <td data-label="만료일" className="b2c-data-table__muted">{coupon.date}</td>
                  <td data-label="상태">
                    <span className={`b2c-status${coupon.status === '미사용' ? ' b2c-status--success' : ''}`}>
                      {coupon.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 페이징 내비게이션 바 (총 페이지가 1개 이하일 때는 2번 룰에 의해 자동 숨김 처리) */}
          {totalPages > 1 && (
            <nav className="b2c-pagination" aria-label="쿠폰 목록 페이지">
              <button
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="b2c-pagination__button"
              >
                이전
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`b2c-pagination__button${currentPage === page ? ' is-active' : ''}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="b2c-pagination__button"
              >
                다음
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default B2cCoupon;
