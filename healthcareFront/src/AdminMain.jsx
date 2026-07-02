import { useState } from 'react';
import { Link } from 'react-router-dom';

// 관리자/트레이너 전용 메인 페이지 (디자인 제외 Plain 버전)
function AdminMain() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const tabs = [
    { id: 'dashboard', label: '대시보드', title: '운영 현황 대시보드', desc: '오늘의 운영 현황을 간편하게 모니터링합니다.' },
    { id: 'member', label: '회원관리', title: '회원 목록 및 배정 관리', desc: '가입된 피트니스 회원을 검색하고 지정 관리합니다.' },
    { id: 'settlement', label: '정산관리', title: '매출 및 정산 통계', desc: '이용권 결제 내역 분석 및 정산 자료입니다.' },
    { id: 'inventory', label: '물품관리', title: '라커룸 및 기자재 인벤토리', desc: '센터 내부 물품 재고 수량을 기록 관리합니다.' },
    { id: 'promotion', label: '프로모션', title: '이벤트 및 쿠폰 발행', desc: '할인 프로모션 생성 및 이벤트 업무를 수행합니다.' },
    { id: 'account', label: '계정설정', title: '계정설정', desc: '관리자 보안 및 개인 설정을 조작합니다.' }
  ];

  return (
    <div>
      <h2>운영 제어 대시보드</h2>

      {/* 탭 버튼 영역 */}
      <div>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 본문 내용 영역 */}
      <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '20px' }}>
        {tabs.map((tab) => {
          if (activeTab !== tab.id) return null;
          return (
            <div key={tab.id}>
              <h3>{tab.title}</h3>
              <p>{tab.desc}</p>
              <button onClick={() => alert(`${tab.title} 기능 준비 중`)}>
                자세히 보기
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '20px' }}>
        <Link to="/">로그아웃</Link>
      </div>
    </div>
  );
}

export default AdminMain;
