import B2cAvatar from './b2c_mypage/B2cAvatar.jsx';
import NavIcon from './components/uiIcons.jsx';
import './b2c_mypage/B2cPages.css';

// 일반 회원(member) 로그인 직후 도달하는 메인 포털 컴포넌트 (Plain 버전 - 탭 이관 완료)
function MemberMain() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  return (
    <main className="b2c-home">
      <section className="b2c-home__card">
        {/* 아바타 컴포넌트 배치 */}
        <B2cAvatar />

        <h1 className="b2c-home__title">
          반갑습니다, {user.name} 회원님.
        </h1>
        
        {/* 아바타 성장 가이드 섹션 */}
        <div className="b2c-home__guide">
          <p className="b2c-home__guide-copy">
            <NavIcon id="dumbbell" size={17} className="ui-icon" /> 회원님의 아바타는 최근 30일간의 헬스장 출석 일수로 성장합니다.
          </p>

          <div className="b2c-home__levels">
            <span className="b2c-home__level">
              Lv.1 / 0~4일
            </span>
            <span className="b2c-home__level b2c-home__level--active">
              Lv.2 / 5~11일
            </span>
            <span className="b2c-home__level b2c-home__level--active b2c-home__level--strong">
              Lv.3 / 12~20일
            </span>
            <span className="b2c-home__level b2c-home__level--max">
              Lv.4 / 21일+
            </span>
          </div>
        </div>

        {/* 세련된 마이페이지 꿀팁/안내 콜아웃 박스 */}
        <aside className="b2c-home__callout">
          <p>
            ℹ️ 회원님의 상세 <strong>이용권 기간, 입·퇴실 기록, 보유 쿠폰 및 건의사항</strong>은 하단 <strong>[탭바]</strong> 메뉴에서 간편하게 통합 조회하실 수 있습니다.
          </p>
        </aside>
      </section>
    </main>
  );
}

export default MemberMain;
