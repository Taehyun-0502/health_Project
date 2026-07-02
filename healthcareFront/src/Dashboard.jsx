import { Link } from 'react-router-dom';

// 로그인 성공 후 이동할 빈 대시보드 페이지 컴포넌트
function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
      <div className="card-premium" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '6px 12px', borderRadius: '30px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary-accent)', fontSize: '13px', fontWeight: '700', marginBottom: '20px' }}>
          🔒 로그인 인증 완료
        </div>
        <h2 className="gradient-title" style={{ fontSize: '32px', marginBottom: '16px' }}>메인 페이지</h2>
        <p className="sub-title" style={{ fontSize: '15px', marginBottom: '32px' }}>
          로그인에 성공하셨습니다. 이곳은 로그인한 회원만 접근할 수 있는 전용 대시보드 영역입니다. 준비 중인 헬스케어 피드백 콘텐츠가 여기에 배치될 예정입니다.
        </p>

        <Link to="/" className="btn-premium" style={{ display: 'inline-flex', width: 'auto', padding: '12px 24px', textDecoration: 'none' }}>
          로그아웃
        </Link>
      </div>
    </div>
  );
}

export default Dashboard;
