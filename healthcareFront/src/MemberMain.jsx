import B2cAvatar from './b2c_mypage/B2cAvatar.jsx';

// 일반 회원(member) 로그인 직후 도달하는 메인 포털 컴포넌트 (Plain 버전 - 탭 이관 완료)
function MemberMain() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <div style={{ padding: '16px 16px 32px', position: 'relative' }}>

      <div style={{ padding: '32px 20px', backgroundColor: 'var(--white)', borderRadius: '14px', border: '1px solid var(--gray-200)', boxShadow: '0 1px 3px rgba(23,23,23,.06)', marginTop: '16px', textAlign: 'center' }}>
        {/* 아바타 컴포넌트 배치 */}
        <B2cAvatar />

        <h3 style={{ marginTop: '20px', color: 'var(--gray-900)', fontSize: '20px', fontWeight: '700' }}>
          반갑습니다, {user.name} 회원님.
        </h3>
        
        {/* 아바타 성장 가이드 섹션 */}
        <div style={{ margin: '25px auto 15px auto', maxWidth: '480px' }}>
          <p style={{ fontSize: '13px', color: 'var(--gray-600)', marginBottom: '12px', fontWeight: '500' }}>
            🏋️ 회원님의 아바타는 최근 30일간의 헬스장 출석 일수로 성장합니다.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', backgroundColor: 'var(--gray-100)', color: 'var(--gray-600)', padding: '6px 12px', borderRadius: '999px', border: '1px solid var(--gray-200)', fontWeight: '600' }}>
              Lv.1 / 0~4일
            </span>
            <span style={{ fontSize: '12px', backgroundColor: 'var(--b2c-lime-bg)', color: 'var(--b2c-accent)', padding: '6px 12px', borderRadius: '999px', border: '1px solid var(--b2c-lime-line)', fontWeight: '600' }}>
              Lv.2 / 5~11일
            </span>
            <span style={{ fontSize: '12px', backgroundColor: 'var(--b2c-lime-soft)', color: 'var(--b2c-accent)', padding: '6px 12px', borderRadius: '999px', border: '1px solid var(--b2c-lime-line)', fontWeight: '600' }}>
              Lv.3 / 12~20일
            </span>
            <span style={{ fontSize: '12px', backgroundColor: 'var(--black)', color: 'var(--b2c-lime-bright)', padding: '6px 12px', borderRadius: '999px', border: '1px solid var(--black)', fontWeight: '600' }}>
              Lv.4 / 21일+
            </span>
          </div>
        </div>

        {/* 세련된 마이페이지 꿀팁/안내 콜아웃 박스 */}
        <div style={{
          marginTop: '25px',
          padding: '14px 20px',
          backgroundColor: 'var(--b2c-lime-bg)',
          border: '1px solid var(--b2c-lime-line)',
          borderRadius: '10px',
          display: 'inline-block',
          textAlign: 'left',
          maxWidth: '460px'
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--b2c-accent)', lineHeight: '1.5' }}>
            ℹ️ 회원님의 상세 <strong>이용권 기간, 입·퇴실 기록, 보유 쿠폰 및 건의사항</strong>은 하단 <strong>[탭바]</strong> 메뉴에서 간편하게 통합 조회하실 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MemberMain;
