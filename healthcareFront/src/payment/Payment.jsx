import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const TYPE_LABEL = { 3: '이용권', 4: 'PT' };

const money = (v) => (v == null ? '-' : Number(v).toLocaleString('ko-KR'));

// 계약 시작일~종료일 사이의 개월 수 계산 (백엔드 ChronoUnit.MONTHS.between과 동일한 규칙)
function monthsBetween(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const s = new Date(startDate);
  const e = new Date(endDate);
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (e.getDate() < s.getDate()) months -= 1;
  return months;
}

// 계약 체결 후 결제 페이지 (계약 요약 + 적용 가능 쿠폰 선택 + 결제 확정)
function Payment() {
  const { dataId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [selectedCouponId, setSelectedCouponId] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다.');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/detail/${dataId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDetail(data);
        fetchCoupons(data.receiverId); // 결제 당사자(회원)의 쿠폰함을 조회
      } else {
        setMessage(`계약 조회 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      console.error('계약 조회 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  // 사장님(로그인 계정)이 결제 대상 회원의 쿠폰함을 조회
  const fetchCoupons = async (memberUsername) => {
    const token = localStorage.getItem('accessToken');
    if (!token || !memberUsername) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/coupon/tolist?username=${memberUsername}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setCoupons(await response.json());
      }
    } catch (error) {
      console.error('쿠폰 조회 오류:', error);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataId]);

  // 이 계약에 실제로 적용 가능한 쿠폰만 추리기 (백엔드 PayService.checkout 검증 규칙과 동일)
  const applicableCoupons = (() => {
    if (!detail) return [];
    const requiredCategory = detail.contract === 3 ? '헬스' : 'PT';
    const contractMonths = monthsBetween(detail.startDate, detail.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return coupons.filter((c) => {
      if (c.status !== '미사용') return false;
      if (!c.date || new Date(c.date) < today) return false;
      if (c.gymId !== detail.gymId) return false;
      if (c.category !== requiredCategory) return false;
      if (requiredCategory === '헬스') return c.couponDate === contractMonths;
      return c.couponCount === detail.quantity;
    });
  })();

  const selectedCoupon = applicableCoupons.find((c) => c.couponId === selectedCouponId) || null;
  const discount = selectedCoupon ? Math.floor((detail?.amount || 0) * selectedCoupon.percent / 100) : 0;
  const finalPrice = (detail?.amount || 0) - discount;

  const handleCheckout = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다.');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/fitb/payment/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dataId: Number(dataId), couponId: selectedCouponId }),
      });
      if (response.ok) {
        alert('결제가 완료되었습니다.');
        navigate(`/fitb/contract/${dataId}`);
      } else {
        setMessage(`결제 실패: ${await response.text()}`);
      }
    } catch (error) {
      console.error('결제 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!detail) {
    return (
      <div>
        <h1>결제</h1>
        <p>{message || '불러오는 중...'}</p>
      </div>
    );
  }

  return (
    <div>
      <h1>결제</h1>
      <p>{message}</p>

      <h2>계약 정보</h2>
      <p>계약 유형: {TYPE_LABEL[detail.contract] ?? '-'}</p>
      <p>계약 기간: {detail.startDate ?? '-'} ~ {detail.endDate ?? '-'}</p>
      {detail.contract === 4 && <p>PT 횟수: {detail.quantity ?? '-'}회</p>}
      <p>결제 금액: {money(detail.amount)}원</p>

      <h2>쿠폰 선택</h2>
      {applicableCoupons.length === 0 ? (
        <p>이 계약에 적용 가능한 쿠폰이 없습니다.</p>
      ) : (
        <div>
          <label>
            <input
              type="radio"
              name="coupon"
              checked={selectedCouponId === null}
              onChange={() => setSelectedCouponId(null)}
            />
            쿠폰 사용 안 함
          </label>
          {applicableCoupons.map((c) => (
            <div key={c.couponId}>
              <label>
                <input
                  type="radio"
                  name="coupon"
                  checked={selectedCouponId === c.couponId}
                  onChange={() => setSelectedCouponId(c.couponId)}
                />
                {c.couponName} ({c.percent}% 할인, {c.fromName} 발송, ~{c.date} 까지)
              </label>
            </div>
          ))}
        </div>
      )}

      <h2>결제 요약</h2>
      <p>기본 금액: {money(detail.amount)}원</p>
      {selectedCoupon && <p>쿠폰 할인: -{money(discount)}원</p>}
      <p><strong>최종 결제 금액: {money(finalPrice)}원</strong></p>

      <button type="button" onClick={handleCheckout} disabled={submitting}>
        {submitting ? '결제 처리 중...' : '결제하기'}
      </button>
    </div>
  );
}

export default Payment;
