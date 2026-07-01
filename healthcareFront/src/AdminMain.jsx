import { useState } from 'react';
import { Link } from 'react-router-dom';

// 관리자/운영자/트레이너(admin, owner, trainer) 전용 메인 관리자 대시보드 컴포넌트
function AdminMain() {
  // 현재 활성화된 탭 상태 정보 (기본값: dashboard)
  const [activeTab, setActiveTab] = useState('dashboard');

  // 관리자 5대 탭 목록 상수 정의
  const tabs = [
    { id: 'dashboard', label: '📊 대시보드', title: '운영 현황 대시보드', desc: '오늘의 신규 회원 등록 수, 출석 트래픽 및 총 매출 현황을 간편하게 모니터링합니다.' },
    { id: 'member', label: '👥 회원관리', title: '회원 목록 및 배정 관리', desc: '가입된 피트니스 회원을 검색하고, 트레이너 1:1 담당 지정 및 PT 수업 예약을 승인/조율합니다.' },
    { id: 'settlement', label: '💰 정산관리', title: '매출 및 정산 통계', desc: '가맹점 이용권 결제 내역 분석, 월별 수수료 정산 및 부가세 보고 자료 일람입니다.' },
    { id: 'inventory', label: '📦 물품관리', title: '라커룸 및 기자재 인벤토리', desc: '헬스장 내부 보유 운동 소도구, 락커 배정 상태 및 음료/프로틴 자판기 재고 수량을 기록 관리합니다.' },
    { id: 'promotion', label: '📢 프로모션', title: '이벤트 및 쿠폰 발행', desc: '할인 프로모션 생성, 회원 대상 공지사항 SMS 전송 및 이벤트 쿠폰 발행 업무를 수행합니다.' },
    { id: 'account', label: '⚙️ 계정설정', title: '센터 및 계정 관리자 설정', desc: '관리 권한 패스워드 변경, 관리 연락처 갱신 및 계정 보안 등급 세부사항을 조작합니다.' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '40px 24px' }}>
      
      {/* 상단 웰컴 관리자 영역 */}
      <header className="container" style={{ textAlign: 'center', marginBottom: '40px' }}>
        <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '30px', backgroundColor: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', fontSize: '13px', fontWeight: '700', marginBottom: '16px' }}>
          🛡️ 관리자 & 트레이너 전용 포털
        </div>
        <h2 className="gradient-title" style={{ fontSize: '36px', marginBottom: '8px', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', webkitBackgroundClip: 'text', webkitTextFillColor: 'transparent' }}>운영 제어 대시보드</h2>
        <p className="sub-title" style={{ fontSize: '15px' }}>센터 내 모든 회원 정보와 재고 통계를 확인하고 이벤트를 제어하세요.</p>
      </header>

      {/* 5대 관리 메뉴 탭 네비게이션 */}
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
                backgroundColor: activeTab === tab.id ? '#a855f7' : 'var(--bg-card)',
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

      {/* 관리 탭 본문 내용 노출 카드 */}
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
              <button className="btn-premium" style={{ width: 'auto', padding: '12px 32px', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)' }} onClick={() => alert(`${tab.title} 관리 시스템이 추후 구현될 예정입니다.`)}>
                관리가동 실행
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

export default AdminMain;
