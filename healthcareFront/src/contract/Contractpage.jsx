import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Contract.css';

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

// 로그인 권한별 계약서 리스트 페이지 (B2B 어드민, 디자인 제외 Plain 버전)
// ADMIN: 제휴 계약 / OWNER: 임금·이용권·PT 계약 / TRAINER: 담당 PT + 본인 임금 계약 / MEMBER: 접근 불가
// 유형 구분은 로스터(Member 탭)의 역할 필터와 동일한 탭 버튼 방식 (건수 표시 + 클라이언트 필터)
function Contractpage() {
  const navigate = useNavigate();
  const [userList, setUserList] = useState([]);
  const [typeFilter, setTypeFilter] = useState(0); // 계약 유형 필터 (0=전체 / 1~4)
  const [message, setMessage] = useState('');

  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const createButtons = CREATE_BUTTONS[loginUser?.role?.toLowerCase()] ?? [];

  // 진입 시 권한별 계약 리스트 전체 조회 (GET /contract/list)
  useEffect(() => {
    const handleList = async () => {
      setMessage('');

      const token = localStorage.getItem('accessToken');
      if (!token) {
        setMessage('로그인이 필요합니다. 먼저 로그인해 주세요.');
        return;
      }

      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/contract/list`, {
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

    handleList();
  }, []);

  // 유형 탭 필터링 (로스터의 역할 필터와 동일하게 클라이언트에서 구분 조회)
  const typeCount = (type) => userList.filter((item) => item.contract === type).length;
  const filteredList = typeFilter ? userList.filter((item) => item.contract === typeFilter) : userList;

  return (
    <div>
      <h1>계약서 리스트 (권한별)</h1>
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

      {/* 계약 유형 필터 탭 (Member 로스터의 역할 필터 버튼과 동일한 방식) */}
      <div className="roster-filter">
        <button
          className={typeFilter === 0 ? 'roster-filter-btn active' : 'roster-filter-btn'}
          onClick={() => setTypeFilter(0)}
        >
          전체 ({userList.length})
        </button>
        {[1, 2, 3, 4].map((type) => (
          <button
            key={type}
            className={typeFilter === type ? 'roster-filter-btn active' : 'roster-filter-btn'}
            onClick={() => setTypeFilter(type)}
          >
            {CONTRACT_LABEL[type]} ({typeCount(type)})
          </button>
        ))}
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
          {filteredList.map((item) => (
            <tr key={item.dataId}>
              <td>
                <button onClick={() => navigate(`/fitb/contract/${item.dataId}`)}>{item.dataId}</button>
              </td>
              <td>{CONTRACT_LABEL[item.contract] ?? item.contract}</td>
              <td>{item.status}</td>
              <td>{item.member?.name ?? item.receiverName}</td>
              <td>{item.member?.username ?? '(미가입)'}</td>
              <td>{item.member?.role ?? '(미가입)'}</td>
              {/* 제휴 계약(1)은 amount가 없어 수수료율(contractRate)을 % 표시, 그 외는 amount(만원) */}
              <td>{item.contract === 1 ? (item.contractRate != null ? `${item.contractRate}%` : '') : item.amount}</td>
              <td>{item.startDate} ~ {item.endDate}</td>
              <td>{item.issueDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Contractpage;
