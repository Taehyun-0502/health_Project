import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import B2cTabBar from './B2cTabBar.jsx';
import './FitcLayout.css';

// 일반 회원(B2C) 전용 화면 상시 고정 헤더 레이아웃
// 모바일 375px 기준 단일 컬럼 — PC 접속 시 480px 중앙 고정 컬럼으로 그대로 세운다
function FitcLayout() {
  return (
    <div className="b2c-shell">
      {/* 회원용 최상단 공통 헤더 고정 */}
      <Header />
      <div className="b2c-shell__column">
        {/* 하위 매핑된 실제 라우트 내용이 들어올 구멍 */}
        <Outlet />
      </div>
      {/* 회원용 하단 고정 탭바 — 기존 라우트 이동 전용 */}
      <B2cTabBar />
    </div>
  );
}

export default FitcLayout;
