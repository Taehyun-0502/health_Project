import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// 계약 유형별 화면 정보
const TYPE_INFO = {
  ADMIN_OWNER: { name: '관리자–헬스장 제휴 계약서', receiverLabel: '대상 헬스장 사장님(Owner)' },
  OWNER_TRAINER: { name: '헬스장–트레이너 임금 계약서', receiverLabel: '대상 트레이너' },
  OWNER_MEMBER_MEMBERSHIP: { name: '헬스장–회원 이용권 계약서', receiverLabel: '대상 회원' },
  OWNER_MEMBER_PT: { name: '헬스장–회원 PT 이용권 계약서', receiverLabel: '대상 회원' },
};

// 계약서 작성(발행) 페이지 (디자인 제외 Plain 버전)
function ContractNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get('type');
  const info = TYPE_INFO[type];
  const [message, setMessage] = useState('');

  if (!info) {
    return (
      <div>
        <h1>계약서 작성</h1>
        <p>잘못된 계약 유형입니다.</p>
        <button onClick={() => navigate('/fitb/userpage')}>리스트로 돌아가기</button>
      </div>
    );
  }

  // 계약서 발행 제출 핸들러 (POST /user/contract)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    const submitData = {
      contractType: type,
      receiverId: data.receiverId ? parseInt(data.receiverId, 10) : null,
      receiverName: data.receiverName,
      receiverPhone: data.receiverPhone || null,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      amount: data.amount ? parseInt(data.amount, 10) : null,
      ratePercent: data.ratePercent ? parseFloat(data.ratePercent) : null,
      billingCycle: data.billingCycle || null,
      title: data.title || null,
      quantity: data.quantity ? parseInt(data.quantity, 10) : null,
      unitPrice: data.unitPrice ? parseInt(data.unitPrice, 10) : null,
      validMonths: data.validMonths ? parseInt(data.validMonths, 10) : null,
      note: data.note || null,
    };

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/user/contract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        alert('계약서가 발행되었습니다. (상태: ISSUED)');
        navigate('/fitb/userpage');
      } else {
        setMessage(`발행 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      console.error('계약서 발행 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div>
      <h1>{info.name} 작성</h1>
      <p>{message}</p>

      <form onSubmit={handleSubmit}>
        {/* 공통: 수신자 정보 */}
        <h2>수신자 정보</h2>
        <div>
          <label>{info.receiverLabel} 이름: </label>
          <input name="receiverName" required />
        </div>
        <div>
          <label>수신자 아이디(전화번호, 미가입 시 비움): </label>
          <input type="tel" name="receiverId" placeholder="예: 01012345678" />
        </div>
        <div>
          <label>수신자 연락처: </label>
          <input name="receiverPhone" placeholder="010-0000-0000" />
        </div>

        {/* 유형별 계약 조건 */}
        <h2>계약 조건</h2>
        {type === 'ADMIN_OWNER' && (
          <>
            <div>
              <label>수수료율(%): </label>
              <input type="number" name="ratePercent" min="0" step="0.1" required />
            </div>
            <div>
              <label>월 이용료(원): </label>
              <input type="number" name="amount" min="0" />
            </div>
            <div>
              <label>정산 주기: </label>
              <input name="billingCycle" placeholder="월 1회" />
            </div>
          </>
        )}
        {type === 'OWNER_TRAINER' && (
          <>
            <div>
              <label>월 기본급(원): </label>
              <input type="number" name="amount" min="0" required />
            </div>
            <div>
              <label>인센티브 정산비율(%): </label>
              <input type="number" name="ratePercent" min="0" max="100" />
            </div>
            <div>
              <label>근무 형태·시간: </label>
              <input name="note" placeholder="주 5일 / 1일 8시간" />
            </div>
            <div>
              <label>지급 주기: </label>
              <input name="billingCycle" placeholder="월 1회" />
            </div>
          </>
        )}
        {type === 'OWNER_MEMBER_MEMBERSHIP' && (
          <>
            <div>
              <label>이용권명: </label>
              <input name="title" placeholder="3개월 정기권" required />
            </div>
            <div>
              <label>이용 금액(원): </label>
              <input type="number" name="amount" min="0" required />
            </div>
          </>
        )}
        {type === 'OWNER_MEMBER_PT' && (
          <>
            <div>
              <label>총 PT 횟수(회): </label>
              <input type="number" name="quantity" min="1" required />
            </div>
            <div>
              <label>회당 단가(원): </label>
              <input type="number" name="unitPrice" min="0" required />
            </div>
            <div>
              <label>유효기간(개월): </label>
              <input type="number" name="validMonths" min="1" />
            </div>
            <p>총 이용금액은 횟수 x 단가로 자동 계산됩니다.</p>
          </>
        )}

        {/* 공통: 계약 기간 */}
        <div>
          <label>계약(이용) 시작일: </label>
          <input type="date" name="startDate" />
        </div>
        <div>
          <label>계약(이용) 종료일: </label>
          <input type="date" name="endDate" />
        </div>

        <button type="submit">계약서 발행</button>
        <button type="button" onClick={() => navigate('/fitb/userpage')}>취소</button>
      </form>
    </div>
  );
}

export default ContractNew;
