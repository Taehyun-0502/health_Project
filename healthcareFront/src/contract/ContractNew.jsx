import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

// 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3·4=회원 계약 통합폼, 5=PT 체험)
// 이용권(3)/PT(4)는 하나의 발행폼을 사용하고 서버가 quantity(0=이용권, 1 이상=PT)로 최종 판정한다
const TYPE_INFO = {
  1: { name: '관리자–헬스장 제휴 계약서', receiverLabel: '대상 헬스장 사장님(Owner)' },
  2: { name: '헬스장–트레이너 임금 계약서', receiverLabel: '대상 트레이너' },
  3: { name: '헬스장–회원 계약서 (이용권/PT 통합)', receiverLabel: '대상 회원' },
  4: { name: '헬스장–회원 계약서 (이용권/PT 통합)', receiverLabel: '대상 회원' },
  5: { name: '헬스장–회원 PT 체험 계약서', receiverLabel: '대상 회원' },
};

// 계약서 작성(발행) 페이지 (디자인 제외 Plain 버전)
function ContractNew() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const contract = parseInt(searchParams.get('contract'), 10);
  const info = TYPE_INFO[contract];
  const [message, setMessage] = useState('');

  // PT 체험(5) 발행은 체험권 대상 목록에서 선택한 대상 정보로만 진입 (자동 입력, 수정 불가)
  const trialTarget = location.state?.target ?? null;

  // 제휴 계약(1) 대상자 선택용 사장님 목록 + 선택된 사장님 (선택 시 receiverId 자동 입력)
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState(null);

  // 회원 계약 통합폼(3·4)의 총 PT 횟수 - 0이면 이용권(3), 1 이상이면 PT(4)로 서버가 판정
  const [quantity, setQuantity] = useState('0');

  // PT·PT 체험 담당 트레이너 선택용 - 본인 소속 트레이너 목록 + 선택된 트레이너 (managerId 자동 입력)
  const [trainers, setTrainers] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);

  const isMemberForm = contract === 3 || contract === 4; // 이용권/PT 통합폼
  const isPt = isMemberForm && parseInt(quantity || '0', 10) >= 1; // 통합폼에서 PT로 판정될 입력 상태

  // 제휴 계약(1) 작성 시 사장님(OWNER) 목록 조회 (GET /contract/owners, ADMIN 전용)
  useEffect(() => {
    if (contract !== 1) return;

    const fetchOwners = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/owners`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          setOwners(await response.json());
        } else {
          setMessage(`사장님 목록 조회 실패(${response.status}): ${await response.text()}`);
        }
      } catch (error) {
        console.error('사장님 목록 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    };

    fetchOwners();
  }, [contract]);

  // 회원 계약(3·4)·PT 체험(5) 작성 시 본인 소속 트레이너 목록 조회
  // 기존 GET /contract/roster 재사용 - 서버가 인증 사용자의 소속 gym_id로 강제 격리(타 매장 트레이너 미노출)
  useEffect(() => {
    if (!isMemberForm && contract !== 5) return;

    const fetchTrainers = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/roster`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const roster = await response.json();
          // 로스터(트레이너+회원)에서 role=trainer만 추려 담당 트레이너 후보로 사용
          const list = roster
            .filter((row) => row.member?.role?.toLowerCase() === 'trainer')
            .map((row) => row.member);
          setTrainers(list);

          // PT 체험(5): 유효한 기존 PT 계약(4)의 담당 트레이너를 초기값으로 자동 입력 (OWNER가 변경 가능)
          if (contract === 5 && trialTarget?.baseManagerId) {
            const initial = list.find((t) => t.username === trialTarget.baseManagerId) ?? null;
            setSelectedTrainer(initial);
          }
        } else {
          setMessage(`트레이너 목록 조회 실패(${response.status}): ${await response.text()}`);
        }
      } catch (error) {
        console.error('트레이너 목록 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    };

    fetchTrainers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract]);

  if (!info) {
    return (
      <div>
        <h1>계약서 작성</h1>
        <p>잘못된 계약 유형입니다.</p>
        <button onClick={() => navigate('/fitb/contractpage')}>리스트로 돌아가기</button>
      </div>
    );
  }

  // PT 체험(5)은 체험권 대상 목록을 거치지 않으면 작성 불가
  if (contract === 5 && !trialTarget) {
    return (
      <div>
        <h1>PT 체험 계약서 작성</h1>
        <p>체험권 계약 대상 목록에서 대상을 선택해 진입해 주세요.</p>
        <button onClick={() => navigate('/fitb/contractpage/trial')}>체험권 대상 목록으로 이동</button>
      </div>
    );
  }

  // 계약서 발행 제출 핸들러 (POST /contract/insert)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    // 제휴 계약(1)은 select로 선택한 사장님 정보로 수신자 자동 세팅
    if (contract === 1 && !selectedOwner) {
      setMessage('대상 헬스장 사장님을 선택해 주세요.');
      return;
    }

    const submitData = {
      contract,
      receiverId:
        contract === 1 ? selectedOwner.username
        : contract === 5 ? trialTarget.member.username
        : data.receiverId ? parseInt(data.receiverId, 10) : null,
      receiverName:
        contract === 1 ? selectedOwner.name
        : contract === 5 ? trialTarget.member.name
        : data.receiverName,
      startDate: data.startDate || null,
      endDate: data.endDate || null,
      amount: data.amount ? parseInt(data.amount, 10) : null,
      contractRate: data.contractRate ? parseFloat(data.contractRate) : null,
      // 통합폼(3·4)은 입력 quantity(0=이용권), PT 체험(5)은 체험권 횟수(couponCount) 자동 사용
      quantity:
        isMemberForm ? parseInt(quantity || '0', 10)
        : contract === 5 ? Number(trialTarget.couponCount ?? 0)
        : null,
      managerId: (isPt || contract === 5) ? selectedTrainer?.username ?? null : null,
      // PT 체험(5)은 발행에 사용한 체험권을 저장해 동일 체험권 중복 발행을 차단
      sourceCouponId: contract === 5 ? trialTarget.couponId ?? null : null,
      birthDate:
        contract === 5 ? trialTarget.member.birth ?? null
        : data.birthDate || null,
      avgWorkoutHour: data.avgWorkoutHour ? parseInt(data.avgWorkoutHour, 10) : null,
      avgWorkoutMinute: data.avgWorkoutMinute ? parseInt(data.avgWorkoutMinute, 10) : null,
    };

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다.');
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/insert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(submitData),
      });

      if (response.ok) {
        // 발행된 계약서 번호(dataId) 응답
        const dataId = await response.text();
        const loginUser = JSON.parse(localStorage.getItem('user') || 'null');

        // 사장님(owner)은 발행 직후 서명폼으로 이동해 그 자리에서 수신자 서명을 받는다 (대면 서명 동선)
        if (loginUser?.role?.toLowerCase() === 'owner') {
          alert('계약서가 발행되었습니다. 이어서 수신자 서명을 진행해 주세요.');
          navigate(`/fitb/contract/${dataId}`);
        } else {
          alert('계약서가 발행되었습니다. (상태: ISSUED)');
          navigate('/fitb/contractpage');
        }
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
        {contract === 1 && (
          <>
            {/* 제휴 계약(1): 사장님(OWNER) 목록 select 선택 -> 수신자 아이디 자동 입력 */}
            <div>
              <label>{info.receiverLabel} 선택: </label>
              <select
                value={selectedOwner?.username ?? ''}
                onChange={(e) => {
                  const owner = owners.find((o) => String(o.username) === e.target.value) ?? null;
                  setSelectedOwner(owner);
                }}
                required
              >
                <option value="">선택</option>
                {owners.map((owner) => (
                  <option key={owner.username} value={owner.username}>
                    {owner.name} ({owner.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>수신자 아이디(선택 시 자동 입력): </label>
              <input value={selectedOwner?.username ?? ''} readOnly />
            </div>
          </>
        )}
        {contract === 2 && (
          <>
            <div>
              <label>{info.receiverLabel} 이름: </label>
              <input name="receiverName" required />
            </div>
            <div>
              <label>수신자 아이디(전화번호, 연락처로 사용 / 미가입자는 서명 시 자동 회원가입): </label>
              <input type="tel" name="receiverId" placeholder="예: 01012345678" />
            </div>
          </>
        )}
        {isMemberForm && (
          <>
            <div>
              <label>{info.receiverLabel} 이름: </label>
              <input name="receiverName" required />
            </div>
            <div>
              <label>수신자 아이디(전화번호, 연락처로 사용 / 미가입자는 서명 시 자동 회원가입): </label>
              <input type="tel" name="receiverId" placeholder="예: 01012345678" />
            </div>
            <div>
              <label>수신자 생년월일: </label>
              <input type="date" name="birthDate" />
            </div>
          </>
        )}
        {contract === 5 && (
          <>
            {/* 체험권 대상 목록에서 선택한 정보 자동 입력 - 수정 불가 (쿠폰 입력·선택 항목 없음) */}
            <div><label>이름: </label><input value={trialTarget.member.name ?? ''} readOnly /></div>
            <div><label>회원 아이디: </label><input value={trialTarget.member.username ?? ''} readOnly /></div>
            <div><label>이메일: </label><input value={trialTarget.member.email ?? ''} readOnly /></div>
            <div><label>생년월일: </label><input value={trialTarget.member.birth ?? ''} readOnly /></div>
            <div><label>계약 유형: </label><input value="PT 체험 (5)" readOnly /></div>
            <div><label>PT 횟수(체험권 제공 횟수): </label><input value={trialTarget.couponCount ?? ''} readOnly /></div>
            {trialTarget.baseDataId && (
              <div>
                <label>기존 계약 연계: </label>
                <input value={`${trialTarget.baseContract === 3 ? '이용권' : 'PT'} 계약 #${trialTarget.baseDataId}`} readOnly />
              </div>
            )}
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
        {isMemberForm && (
          <>
            <div>
              <label>총 PT 횟수(회, 0 = 이용권 계약): </label>
              <input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
              <span> → {isPt ? 'PT 계약(4)으로 발행' : '이용권 계약(3)으로 발행'}</span>
            </div>
            <div>
              <label>{isPt ? '총 이용금액(만원): ' : '이용 금액(만원): '}</label>
              <input type="number" name="amount" min="0" required />
            </div>
            {isPt && (
              <div>
                <label>담당 트레이너 선택(본인 소속): </label>
                <select
                  value={selectedTrainer?.username ?? ''}
                  onChange={(e) => {
                    const trainer = trainers.find((t) => String(t.username) === e.target.value) ?? null;
                    setSelectedTrainer(trainer);
                  }}
                >
                  <option value="">선택</option>
                  {trainers.map((trainer) => (
                    <option key={trainer.username} value={trainer.username}>
                      {trainer.name} ({trainer.username})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}
        {contract === 5 && (
          <>
            <div>
              <label>금액(만원): </label>
              <input type="number" name="amount" min="0" required />
            </div>
            <div>
              {/* 유효한 기존 PT(4)의 담당 트레이너가 초기값, OWNER가 변경 가능 */}
              <label>담당 트레이너 선택(본인 소속): </label>
              <select
                value={selectedTrainer?.username ?? ''}
                onChange={(e) => {
                  const trainer = trainers.find((t) => String(t.username) === e.target.value) ?? null;
                  setSelectedTrainer(trainer);
                }}
              >
                <option value="">선택</option>
                {trainers.map((trainer) => (
                  <option key={trainer.username} value={trainer.username}>
                    {trainer.name} ({trainer.username})
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        {(isMemberForm || contract === 5) && (
          <div>
            <label>하루평균 운동 시간: </label>
            <select name="avgWorkoutHour" defaultValue="">
              <option value="">선택</option>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <label> 시간 </label>
            <select name="avgWorkoutMinute" defaultValue="">
              <option value="">선택</option>
              {[0, 10, 20, 30, 40, 50].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <label> 분</label>
          </div>
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
        <button type="button" onClick={() => navigate('/fitb/contractpage')}>취소</button>
      </form>
    </div>
  );
}

export default ContractNew;
