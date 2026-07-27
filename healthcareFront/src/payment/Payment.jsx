import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import NavIcon from '../components/uiIcons.jsx';
import './Payment.css';

// 계약 유형 라벨 (백엔드 h_contract_data.contract 코드 기준)
// 결제 대상은 3·4·5뿐 (PayMapper.findPayableContract의 contract IN (3,4,5)와 동일 범위)
const TYPE_LABEL = { 3: '이용권', 4: 'PT', 5: 'PT 체험' };

// 횟수(quantity)를 갖는 PT형 계약 - 이용권(3)은 횟수 개념이 없다
const PT_CONTRACTS = [4, 5];

const money = (v) => (v == null ? '-' : Number(v).toLocaleString('ko-KR'));

// 계약 체결 후 결제 페이지 (계약 요약 + 적용 가능 쿠폰 선택 + 결제 확정)
function Payment() {
  const { dataId } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [selectedCouponId, setSelectedCouponId] = useState(null);
  const [installment, setInstallment] = useState(0);
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

  // 쿠폰 카테고리별 적용 규칙 (백엔드 PayService.validateCouponForContract와 동일, 새 카테고리는 항목 추가로 확장)
  // 헬스: 이용권 계약(3) / PT: PT 계약(4) / 체험권: PT 체험 계약(5), 기존 PT(4)도 하위 호환 허용
  // 개월수/횟수 일치 제약은 정책 결정으로 제거됨 — 카테고리만 맞으면 목록에 노출
  const COUPON_CATEGORY_RULES = {
    '헬스': (c, d) => d.contract === 3,
    'PT': (c, d) => d.contract === 4,
    '체험권': (c, d) => PT_CONTRACTS.includes(d.contract),
  };

  // 이 계약에 실제로 적용 가능한 쿠폰만 추리기 (백엔드 PayService.checkout 검증 규칙과 동일)
  const applicableCoupons = (() => {
    if (!detail) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return coupons.filter((c) => {
      if (c.status !== '미사용') return false;
      if (!c.date || new Date(c.date) < today) return false;
      if (c.gymId !== detail.gymId) return false;
      const rule = COUPON_CATEGORY_RULES[c.category];
      return rule ? rule(c, detail) : false;
    });
  })();

  const selectedCoupon = applicableCoupons.find((c) => c.couponId === selectedCouponId) || null;
  // 할인율 적용액이 쿠폰의 최대 할인 금액(maxAmount)을 넘으면 최대 금액까지만 할인 (백엔드 PayService.checkout과 동일)
  const rawDiscount = selectedCoupon ? Math.floor((detail?.amount || 0) * selectedCoupon.percent / 100) : 0;
  const isCapped = selectedCoupon?.maxAmount != null && rawDiscount > selectedCoupon.maxAmount;
  const discount = isCapped ? selectedCoupon.maxAmount : rawDiscount;
  const finalPrice = (detail?.amount || 0) - discount;
  // 체험권(100% 할인) 등으로 최종 0원이면 할부가 의미 없으므로 일시불 고정 (백엔드도 동일하게 강제)
  const effectiveInstallment = finalPrice === 0 ? 0 : installment;

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
        body: JSON.stringify({ dataId: Number(dataId), couponId: selectedCouponId, installment: effectiveInstallment }),
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
      <div className="pay-state">
        <div className="pay-state-title">결제</div>
        <p>{message || '불러오는 중...'}</p>
      </div>
    );
  }

  return (
    <div className="pay-page">
      <div className="pay-head">
        <h1 className="pay-title">결제</h1>
        <Link to={`/fitb/contract/${dataId}`} className="pay-back">
          <NavIcon id="arrow" size={16} className="ui-icon ui-icon--left" /> 계약 상세로
        </Link>
      </div>

      <div className="pay-layout">
        {/* 본문: 계약 정보 · 쿠폰 · 결제 방법 */}
        <div className="pay-main">
          <section className="pay-card">
            <h2 className="pay-card-title">계약 정보</h2>
            <div className="pay-fields">
              <div className="pay-field">
                <span className="pay-field-label">계약 유형</span>
                <span className="pay-field-value">
                  <span className="pay-type-badge">{TYPE_LABEL[detail.contract] ?? '-'}</span>
                </span>
              </div>
              <div className="pay-field">
                <span className="pay-field-label">계약 기간</span>
                <span className="pay-field-value">{detail.startDate ?? '-'} ~ {detail.endDate ?? '-'}</span>
              </div>
              {PT_CONTRACTS.includes(detail.contract) && (
                <div className="pay-field">
                  <span className="pay-field-label">PT 횟수</span>
                  <span className="pay-field-value">{detail.quantity ?? '-'}회</span>
                </div>
              )}
              <div className="pay-field">
                <span className="pay-field-label">결제 금액</span>
                <span className="pay-field-value is-amount">{money(detail.amount)}원</span>
              </div>
            </div>
          </section>

          <section className="pay-card">
            <h2 className="pay-card-title">쿠폰 선택</h2>
            {applicableCoupons.length === 0 ? (
              <p className="pay-coupon-none">이 계약에 적용 가능한 쿠폰이 없습니다.</p>
            ) : (
              <div className="pay-coupon-list">
                <label className={`pay-coupon-option${selectedCouponId === null ? ' is-selected' : ''}`}>
                  <input
                    type="radio"
                    name="coupon"
                    className="pay-coupon-radio"
                    checked={selectedCouponId === null}
                    onChange={() => setSelectedCouponId(null)}
                  />
                  <span className="pay-coupon-body">
                    <span className="pay-coupon-name">쿠폰 사용 안 함</span>
                  </span>
                </label>
                {applicableCoupons.map((c) => (
                  <label
                    key={c.couponId}
                    className={`pay-coupon-option${selectedCouponId === c.couponId ? ' is-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="coupon"
                      className="pay-coupon-radio"
                      checked={selectedCouponId === c.couponId}
                      onChange={() => setSelectedCouponId(c.couponId)}
                    />
                    <span className="pay-coupon-body">
                      <span className="pay-coupon-name">
                        <span className="pay-coupon-cat">{c.category}</span>
                        {c.couponName}
                      </span>
                      <span className="pay-coupon-meta">
                        {c.category === '체험권' ? '무료체험' : `${c.percent}% 할인`}
                        {c.maxAmount != null ? ` · 최대 ${money(c.maxAmount)}원` : ''} · {c.fromName} 발송 · ~{c.date} 까지
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="pay-card">
            <h2 className="pay-card-title">결제 방법</h2>
            <div className="pay-method-row">
              <label className="pay-field-label" htmlFor="pay-installment">할부 개월</label>
              <select
                id="pay-installment"
                className="pay-select"
                value={effectiveInstallment}
                disabled={finalPrice === 0}
                onChange={(e) => setInstallment(Number(e.target.value))}
              >
                <option value={0}>일시불</option>
                <option value={3}>3개월 할부</option>
                <option value={6}>6개월 할부</option>
                <option value={12}>12개월 할부</option>
              </select>
              {finalPrice === 0 && (
                <p className="pay-method-note">무료(0원) 결제는 일시불로 처리됩니다.</p>
              )}
            </div>
          </section>
        </div>

        {/* 우측 요약 레일 */}
        <aside className="pay-summary">
          <h2 className="pay-summary-title">결제 요약</h2>
          <div className="pay-summary-row">
            <span>기본 금액</span>
            <span className="pay-summary-num">{money(detail.amount)}원</span>
          </div>
          {selectedCoupon && (
            <div className="pay-summary-row is-discount">
              <span>
                쿠폰 할인{selectedCoupon.category === '체험권' ? ' (무료체험)' : ''}
                {isCapped ? ` (최대 ${money(selectedCoupon.maxAmount)}원)` : ''}
              </span>
              <span className="pay-summary-num">-{money(discount)}원</span>
            </div>
          )}
          <div className="pay-summary-row">
            <span>결제 방법</span>
            <span className="pay-summary-num">{effectiveInstallment === 0 ? '일시불' : `${effectiveInstallment}개월 할부`}</span>
          </div>

          <div className="pay-summary-divider" />

          <div className="pay-summary-total">
            <span className="pay-summary-total-label">최종 결제 금액</span>
            <span className="pay-summary-total-value">{money(finalPrice)}원</span>
          </div>

          <button type="button" className="pay-submit" onClick={handleCheckout} disabled={submitting}>
            {submitting ? '결제 처리 중...' : '결제하기'}
          </button>

          {message && <p className="pay-message">{message}</p>}
        </aside>
      </div>
    </div>
  );
}

export default Payment;
