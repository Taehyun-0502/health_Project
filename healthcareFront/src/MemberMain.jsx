import { useState } from 'react';
import { Link } from 'react-router-dom';

// 일반 회원(member) 전용 메인 페이지 (디자인 제외 Plain 버전)
function MemberMain() {
  const [activeTab, setActiveTab] = useState('notification');

  const tabs = [
    { id: 'notification', label: '알림', title: '알림 내역', desc: '새로운 알림이 없습니다.' },
    { id: 'coupon', label: '쿠폰함', title: '내 쿠폰함', desc: '보유 중인 쿠폰이 없습니다.' },
    { id: 'attendance', label: '출석기록', title: '출석 일지', desc: '출석 기록이 없습니다.' },
    { id: 'membership', label: '멤버십', title: '멤버십 정보', desc: '등록된 멤버십 정보가 없습니다.' },
    { id: 'suggest', label: '건의사항', title: '고객 건의함', desc: '접수된 건의사항이 없습니다.' },
    { id: 'account', label: '계정설정', title: '계정설정', desc: '계정 설정 옵션입니다.' }
  ];

  return (
    <div>
      <h2>일반 회원 대시보드</h2>
      
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

export default MemberMain;
