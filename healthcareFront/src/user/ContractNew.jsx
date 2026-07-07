import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3=이용권, 4=PT)
const TYPE_INFO = {
  1: { name: '관리자–헬스장 제휴 계약서', receiverLabel: '대상 헬스장 사장님(Owner)' },
  2: { name: '헬스장–트레이너 임금 계약서', receiverLabel: '대상 트레이너' },
  3: { name: '헬스장–회원 이용권 계약서', receiverLabel: '대상 회원' },
  4: { name: '헬스장–회원 PT 이용권 계약서', receiverLabel: '대상 회원' },
};

// 계약서 작성(발행) 페이지 (디자인 제외 Plain 버전)
function ContractNew() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contract = parseInt(searchParams.get('contract'), 10);
  const info = TYPE_INFO[contract];
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
      contract,
      receiverId: data.receiverId ? parseInt(data.receiverId, 10) : null,
      receiverName: data.receiverName,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      amount: data.amount ? parseInt(data.amount, 10) : null,
      contractRate: data.contractRate ? parseFloat(data.contractRate) : null,
      quantity: data.quantity ? parseInt(data.quantity, 10) : null,
      managerId: data.managerId ? parseInt(data.managerId, 10) : null,
      birthDate: data.birthDate || null,
      avgWorkoutTime: data.avgWorkoutTime ? parseInt(data.avgWorkoutTime, 10) : null,
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
        {/* 공통: 수신자 정보 (아이디=전화번호를 연락처로 사용) */}
        <h2>수신자 정보</h2>
        <div>
          <label>{info.receiverLabel} 이름: </label>
          <input name="receiverName" required />
        </div>
        <div>
          <label>수신자 아이디(전화번호, 연락처로 사용 / 미가입자는 입력 시 자동 회원가입): </label>
          <input type="tel" name="receiverId" placeholder="예: 01012345678" />
        </div>
        {(contract === 3 || contract === 4) && (
          <>
            <div>
              <label>수신자 생년월일: </label>
              <input type="date" name="birthDate" />
            </div>
            <div>
              <label>하루평균 운동 시간(시간): </label>
              <input type="number" name="avgWorkoutTime" min="0" />
            </div>
          </>
        )}

        {/* 유형별 계약 조건 */}
        <h2>계약 조건</h2>
        {contract === 1 && (
          <div>
            <label>수수료율(%): </label>
            <input type="number" name="contractRate" min="0" step="0.1" required />
          </div>
        )}
        {contract === 2 && (
          <>
            <div>
              <label>월 기본급(만원): </label>
              <input type="number" name="amount" min="0" required />
            </div>
            <div>
              <label>인센티브 정산비율(%): </label>
              <input type="number" name="contractRate" min="0" max="100" />
            </div>
          </>
        )}
        {contract === 3 && (
          <div>
            <label>이용 금액(만원): </label>
            <input type="number" name="amount" min="0" required />
          </div>
        )}
        {contract === 4 && (
          <>
            <div>
              <label>총 PT 횟수(회): </label>
              <input type="number" name="quantity" min="1" required />
            </div>
            <div>
              <label>총 이용금액(만원): </label>
              <input type="number" name="amount" min="0" required />
            </div>
            <div>
              <label>담당 트레이너 아이디(전화번호): </label>
              <input type="tel" name="managerId" placeholder="예: 01012345678" />
            </div>
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
