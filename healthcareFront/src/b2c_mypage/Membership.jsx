import { useState, useEffect } from "react";

// B2C 일반 회원 멤버십(이용권) 조회 컴포넌트 (디자인 제외 Plain 버전)
function Membership() {
  const [memberships, setMemberships] = useState([]); // 멤버십 내역 목록 상태
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 내 멤버십 정보 조회 함수
  const fetchMyMemberships = async () => {
    if (!user.username) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/membership/list?username=${user.username}`);
      if (response.ok) {
        const data = await response.json();
        setMemberships(data);
      }
    } catch (error) {
      console.error('멤버십 내역 조회 실패:', error);
    }
  };

  // 컴포넌트 마운트 시 최초 조회 실행
  useEffect(() => {
    fetchMyMemberships();
  }, []);

  // 계약 종류(contract) 한글 명칭 변환 함수
  const getContractName = (contractVal) => {
    switch (Number(contractVal)) {
      case 1: return "제휴계약";
      case 2: return "근로계약";
      case 3: return "헬스장이용권";
      case 4: return "pt이용권";
      default: return "알수없는계약";
    }
  };

  return (
    <div>
      <h3>내 멤버십 정보</h3>
      {memberships.length === 0 ? (
        <p>이용 중인 피트니스 회원권(멤버십) 정보가 없습니다.</p>
      ) : (
        <table border="1" style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr>
              <th>번호</th>
              <th>계약종류</th>
              <th>시작일</th>
              <th>만료일</th>
              <th>결제액</th>
              <th>담당자</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((item, idx) => (
              <tr key={item.dataId || idx}>
                <td>{idx + 1}</td>
                <td>{getContractName(item.contract)}</td>
                <td>{item.startDate}</td>
                <td>{item.endDate}</td>
                <td>{item.amount ? `${item.amount.toLocaleString()}원` : '0원'}</td>
                <td>{item.memberId || '미지정'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Membership;