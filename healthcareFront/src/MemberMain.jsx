import { useState } from 'react';
import { Link } from 'react-router-dom';

// 일반 회원(member) 로그인 직후 도달하는 메인 포털 컴포넌트 (Plain 버전)
function MemberMain() {
  const [activeTab, setActiveTab] = useState('notification');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // 메인 포털 4대 메뉴 상수 정의
  const tabs = [
    { id: 'notification', label: '알림', title: '알림 내역', desc: '새로운 알림 소식이 없습니다.' },
    { id: 'coupon', label: '쿠폰함', title: '내 쿠폰함', desc: '보유 중인 혜택 쿠폰이 없습니다.' },
    { id: 'attendance', label: '출석기록', title: '출석 일지', desc: '출석 체크 기록이 존재하지 않습니다.' },
    { id: 'membership', label: '멤버십', title: '멤버십 정보', desc: '결제하신 피트니스 회원권 정보가 없습니다.' }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <h2>Haru Bread Health - 일반 회원 메인 포털 ({user.name}님)</h2>
      
      {/* 마이페이지 이동 및 로그아웃 버튼 링크 */}
      <div style={{ margin: '20px 0', display: 'flex', gap: '15px' }}>
        <Link to="/fitc/mypage" style={{ padding: '8px 16px', backgroundColor: '#007bff', color: '#fff', textDecoration: 'none', borderRadius: '4px' }}>
          마이페이지 이동 (건의/계정)
        </Link>
        <Link to="/" style={{ padding: '8px 16px', border: '1px solid #ccc', color: '#333', textDecoration: 'none', borderRadius: '4px' }}>
          로그아웃
        </Link>
      </div>

      <hr />

      {/* 4대 탭 메뉴 버튼 */}
      <div style={{ margin: '20px 0' }}>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ marginRight: '10px', padding: '8px 16px', cursor: 'pointer' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4대 탭 활성 내용 노출 영역 */}
      <div style={{ border: '1px solid #ccc', padding: '20px', minHeight: '200px' }}>
        {tabs.map((tab) => {
          if (activeTab !== tab.id) return null;
          return (
            <div key={tab.id}>
              <h3>{tab.title}</h3>
              <p>{tab.desc}</p>
              <button onClick={() => alert(`${tab.title} 페이지가 추후 연동될 예정입니다.`)}>
                내역 확인
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MemberMain;
