import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// 계약 유형은 contract FK로 판별 (1=제휴, 2=임금, 3=이용권, 4=PT)
const CONTRACT_LABEL = {
  1: '제휴 계약서',
  2: '임금 계약서',
  3: '이용권 계약서',
  4: 'PT 이용권 계약서',
};

// 로그인 권한별 발행 가능한 계약서 버튼 목록
// ADMIN: 제휴 계약서 / OWNER: 임금·이용권·PT 계약서 / TRAINER·MEMBER: 발행 불가
const CREATE_BUTTONS = {
  admin: [{ contract: 1, label: '제휴 계약서 작성' }],
  owner: [
    { contract: 2, label: '임금 계약서 작성' },
    { contract: 3, label: '이용권 계약서 작성' },
    { contract: 4, label: 'PT 계약서 작성' },
  ],
};

// 로그인 권한별 계약 유저 리스트 확인용 테스트 페이지 (B2B 어드민, 디자인 제외 Plain 버전)
// ADMIN: 제휴 계약 Owner / OWNER: 임금·이용권·PT 계약 상대 / TRAINER: 담당 PT 계약 Member / MEMBER: 접근 불가
function Userpage() {
  const navigate = useNavigate();
  const [contract, setContract] = useState('');
  const [userList, setUserList] = useState([]);
  const [message, setMessage] = useState('');

  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const createButtons = CREATE_BUTTONS[loginUser?.role?.toLowerCase()] ?? [];

  // 권한별 계약 유저 리스트 조회 (GET /user/list)
  const handleList = async () => {
    setMessage('');
    setUserList([]);

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setMessage('로그인이 필요합니다. 먼저 로그인해 주세요.');
      return;
    }

    try {
      const params = new URLSearchParams();
      if (contract) params.append('contract', contract);

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/list?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setUserList(result);
        setMessage(`조회 성공: ${result.length}건`);
      } else {
        // 401(미로그인/토큰만료), 403(MEMBER 접근 차단) 등
        setMessage(`조회 실패(${response.status}): ${await response.text()}`);
      }
    } catch (error) {
      console.error('리스트 조회 오류:', error);
      setMessage('서버와의 통신 중 오류가 발생했습니다.');
    }
  };

  return (
    <div>
      <h1>계약 유저 리스트 (권한별)</h1>
      <p>
        로그인 사용자: {loginUser ? `${loginUser.name} (${loginUser.role})` : '없음'}
      </p>
      <p>{message}</p>

      {/* 권한별 계약서 작성 버튼 */}
      <div>
        {createButtons.map((btn) => (
          <button key={btn.contract} onClick={() => navigate(`/fitb/contract/new?contract=${btn.contract}`)}>
            {btn.label}
          </button>
        ))}
      </div>

      <div>
        <label>계약 유형 필터: </label>
        <select value={contract} onChange={(e) => setContract(e.target.value)}>
          <option value="">전체</option>
          <option value="1">제휴 계약서</option>
          <option value="2">임금 계약서</option>
          <option value="3">이용권 계약서</option>
          <option value="4">PT 이용권 계약서</option>
        </select>
        <button onClick={handleList}>조회</button>
      </div>

      <table border="1">
        <thead>
          <tr>
            <th>계약ID</th>
            <th>계약유형</th>
            <th>상태</th>
            <th>상대방 이름</th>
            <th>상대방 아이디(연락처)</th>
            <th>상대방 권한</th>
            <th>금액(만원)</th>
            <th>기간</th>
            <th>발행일</th>
          </tr>
        </thead>
        <tbody>
          {userList.map((item) => (
            <tr key={item.dataId}>
              <td>
                <button onClick={() => navigate(`/fitb/contract/${item.dataId}`)}>{item.dataId}</button>
              </td>
              <td>{CONTRACT_LABEL[item.contract] ?? item.contract}</td>
              <td>{item.status}</td>
              <td>{item.member?.name ?? item.receiverName}</td>
              <td>{item.member?.username ?? '(미가입)'}</td>
              <td>{item.member?.role ?? '(미가입)'}</td>
              <td>{item.amount}</td>
              <td>{item.startDate} ~ {item.endDate}</td>
              <td>{item.issueDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Userpage;
