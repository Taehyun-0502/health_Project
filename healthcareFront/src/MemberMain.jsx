import { useState } from 'react';
import { Link } from 'react-router-dom';

// 일반 회원(member) 전용 메인 대시보드 컴포넌트
function MemberMain() {
  // 현재 활성화된 탭 상태 정보 (기본값: notification)
  const [activeTab, setActiveTab] = useState('notification');

  // 탭 목록 상수 정의
  const tabs = [
    { id: 'notification', label: '🔔 알림', title: '알림 내역', desc: '도착한 소식과 새로운 맞춤형 운동 정보가 없습니다.' },
    { id: 'coupon', label: '🎫 쿠폰함', title: '내 쿠폰함', desc: '현재 보유 중인 할인 및 이벤트 혜택 쿠폰이 없습니다.' },
    { id: 'attendance', label: '📅 출석기록', title: '출석 일지', desc: '이번 달 출석 도장이 준비 중입니다. 매일 운동을 기록해 보세요.' },
    { id: 'membership', label: '💳 멤버십', title: '멤버십 등급 정보', desc: '등록하신 피트니스 회원권 기간 및 결제 정보 세부사항입니다.' },
    { id: 'suggest', label: '✍️ 건의사항', title: '고객 건의함', desc: '센터나 서비스 개선 요구사항을 안전하게 작성하여 접수해 주세요.' },
    { id: 'account', label: '⚙️ 계정설정', title: '내 정보 및 계정설정', desc: '비밀번호 변경, 이메일 주소 갱신 및 계정 탈퇴 등의 프로필 관리 옵션을 조작합니다.' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '40px 24px' }}>
      
      {/* 상단 웰컴 영역 */}
      <header className="container" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '30px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-accent)', fontSize: '13px', fontWeight: '700', marginBottom: '16px' }}>
          🏃 일반 회원 전용 서비스
        </div>
        <h2 className="gradient-title" style={{ fontSize: '36px', marginBottom: '8px' }}>나의 웰니스 대시보드</h2>
        <p className="sub-title" style={{ fontSize: '15px' }}>원하시는 서비스 탭을 선택하여 웰니스 일지를 확인해 보세요.</p>
      </header>

      {/* 5대 메뉴 탭 네비게이션 */}
      <section className="container" style={{ maxWidth: '800px', width: '100%', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '10px', justifyContent: 'center' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: '600',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                backgroundColor: activeTab === tab.id ? 'var(--primary-accent)' : 'var(--bg-card)',
                color: activeTab === tab.id ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
                boxShadow: activeTab === tab.id ? 'var(--shadow-md)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* 탭 본문 내용 노출 카드 */}
      <main className="container" style={{ maxWidth: '800px', width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {tabs.map((tab) => {
          if (activeTab !== tab.id) return null;
          return (
            <div key={tab.id} className="card-premium" style={{ width: '100%', textAlign: 'center', minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <h3 style={{ fontSize: '22px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)' }}>
                {tab.title}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '440px', lineHeight: '1.6', marginBottom: '30px' }}>
                {tab.desc}
              </p>
              
              {/* 기능별 임시 액션 유도 버튼 */}
              <button className="btn-premium" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => alert(`${tab.title} 페이지가 추후 연동될 예정입니다.`)}>
                내역 확인하기
              </button>
            </div>
          );
        })}

        {/* 하단 로그아웃 */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/" className="nav-link" style={{ border: '1px solid var(--border-color)', display: 'inline-flex', padding: '10px 24px', borderRadius: '10px', fontSize: '14px', fontWeight: '600' }}>
            로그아웃
          </Link>
        </div>
      </main>

    </div>
  );
}

export default MemberMain;
