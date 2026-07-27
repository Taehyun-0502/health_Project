import { Link } from 'react-router-dom';

// 메인 랜딩 페이지 컴포넌트
function Home() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* 내비게이션 바 */}
      <nav className="navbar">
        <div className="container navbar-content">
          <Link to="/" className="logo-text">Haru Bread Health</Link>
          <div className="nav-links">
            <Link to="/login" className="nav-link">로그인</Link>
            <Link to="/join" className="nav-link nav-link-btn">시작하기</Link>
          </div>
        </div>
      </nav>

      {/* 히어로 섹션 */}
      <main className="container" style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px' }}>
        <div className="card-premium" style={{ maxWidth: '800px', width: '100%', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '999px', backgroundColor: 'var(--accent-bg)', color: 'var(--primary-accent)', fontSize: 'var(--text-sm)', fontWeight: '700', marginBottom: '20px' }}>
            ✨ 스마트 헬스케어 플랫폼
          </div>
          <h1 className="gradient-title" style={{ fontSize: '48px', lineHeight: '1.2' }}>하루 브레드 헬스케어에 오신 것을 환영합니다</h1>
          <p className="sub-title" style={{ fontSize: '18px', maxWidth: '600px', margin: '0 auto 35px' }}>
            개인 맞춤형 피트니스 계획 수립, 식단 다이어리 아카이브, 그리고 AI 연계 실시간 웰니스 관리를 통해 더 건강한 내일을 시작하세요.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/join" className="btn-premium" style={{ width: 'auto', padding: '14px 32px', textDecoration: 'none' }}>
              지금 무료 회원가입
            </Link>
            <Link to="/login" className="nav-link" style={{ border: '1px solid var(--border-color)', display: 'inline-flex', alignItems: 'center', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '600' }}>
              기존 계정으로 로그인
            </Link>
          </div>

          {/* 서비스 특징 요약 카드 그리드 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '60px', borderTop: '1px solid var(--border-color)', paddingTop: '40px' }}>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>🥗</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>정밀 식단 분석</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>일일 영양성분 기록과 칼로리 분석을 통해 올바른 식습관을 만듭니다.</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>💪</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>맞춤 운동 플랜</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>사용자의 목적과 신체 조건에 최적화된 트레이닝 루틴을 제공합니다.</p>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>📈</div>
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>대시보드 트래킹</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>체중 변화, 활동 대사량 등의 피드백을 주간/월간 리포트로 제공합니다.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Home;
