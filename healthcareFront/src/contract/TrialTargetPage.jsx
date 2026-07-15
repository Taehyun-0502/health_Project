import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 체험권 계약 대상 목록 페이지 (OWNER 전용, 디자인 제외 Plain 버전)
// 본인이 발급한 미사용·미만료 체험권의 동일 지점 MEMBER 목록 - 선택 시 PT 체험(5) 발행폼으로 이동
function TrialTargetPage() {
  const navigate = useNavigate();
  const [targets, setTargets] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchTargets = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage('로그인이 필요합니다.');
        return;
      }
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/trial-targets`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const result = await response.json();
          setTargets(result);
          setMessage(`발행 가능한 체험권 대상: ${result.length}건`);
        } else {
          setMessage(`조회 실패(${response.status}): ${await response.text()}`);
        }
      } catch (error) {
        console.error('체험권 대상 목록 조회 오류:', error);
        setMessage('서버와의 통신 중 오류가 발생했습니다.');
      }
    };

    fetchTargets();
  }, []);

  return (
    <div>
      <h1>체험권 계약 대상 목록</h1>
      <p>발행 가능한 체험권(미사용·미만료)을 보유한 우리 지점 회원만 표시됩니다.</p>
      <p>{message}</p>

      <table border="1">
        <thead>
          <tr>
            <th>이름</th>
            <th>회원 아이디</th>
            <th>이메일</th>
            <th>생년월일</th>
            <th>체험 PT 횟수</th>
            <th>기존 계약</th>
            <th>발행</th>
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => (
            <tr key={target.couponId}>
              <td>{target.member?.name}</td>
              <td>{target.member?.username}</td>
              <td>{target.member?.email}</td>
              <td>{target.member?.birth}</td>
              <td>{target.couponCount}회</td>
              <td>
                {target.baseDataId
                  ? `${target.baseContract === 3 ? '이용권' : 'PT'} #${target.baseDataId}`
                  : '없음'}
              </td>
              <td>
                {/* 선택한 대상 정보를 state로 넘겨 PT 체험(5) 발행폼에 자동 입력 */}
                <button onClick={() => navigate('/fitb/contract/new?contract=5', { state: { target } })}>
                  PT 체험 계약서 발행
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={() => navigate('/fitb/contractpage')}>← 계약서 리스트로</button>
    </div>
  );
}

export default TrialTargetPage;
