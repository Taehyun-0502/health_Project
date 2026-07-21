import { useState, useEffect } from "react";

// B2C 일반 회원 멤버십(이용권) 조회 컴포넌트 (디자인 제외 Plain 버전)
function Membership() {
  const [memberships, setMemberships] = useState([]); // 멤버십 내역 목록 상태
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 내 멤버십 정보 조회 함수
  const fetchMyMemberships = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/membership/list`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMemberships(data);
      } else {
        const errorText = await response.text();
        console.error('멤버십 내역 로드 실패:', errorText);
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
    <div style={{ padding: '16px 16px 32px' }}>
      <h3 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--gray-900)' }}>내 멤버십 정보</h3>
      {memberships.length === 0 ? (
        <p style={{ color: 'var(--gray-400)', fontSize: '14px' }}>이용 중인 피트니스 회원권(멤버십) 정보가 없습니다.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--gray-100)', color: 'var(--gray-500)', borderBottom: '2px solid var(--gray-200)' }}>
              <th style={{ padding: '10px', fontWeight: '600' }}>번호</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>계약종류</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>시작일</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>만료일</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>결제액</th>
              <th style={{ padding: '10px', fontWeight: '600' }}>담당자</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map((item, idx) => (
              <tr key={item.dataId || idx} style={{ borderBottom: '1px solid var(--gray-200)', textAlign: 'center' }}>
                <td style={{ padding: '10px' }}>{idx + 1}</td>
                <td style={{ padding: '10px', fontWeight: '600', color: 'var(--b2c-accent)' }}>{getContractName(item.contract)}</td>
                <td style={{ padding: '10px', color: 'var(--gray-500)' }}>{item.startDate}</td>
                <td style={{ padding: '10px', color: 'var(--gray-500)' }}>{item.endDate}</td>
                <td style={{ padding: '10px', fontVariantNumeric: 'tabular-nums' }}>{item.amount ? `${item.amount.toLocaleString()}만원` : '0만원'}</td>
                <td style={{ padding: '10px', color: 'var(--gray-500)' }}>{item.managerId || '미지정'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Membership;