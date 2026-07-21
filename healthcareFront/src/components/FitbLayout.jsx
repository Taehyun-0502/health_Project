import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import AiPanel from '../ai/AiPanel.jsx';
import B2bLnb from './B2bLnb.jsx';
import B2bDrawer from './B2bDrawer.jsx';
import './FitbLayout.css';

// 사장님/가맹점(B2B) 전용 화면 상시 고정 헤더 레이아웃
// AI 비서(OWNER 전용)는 하단 중앙 플로팅 입력바 + 채팅 팝업(fixed)이라 본문 레이아웃에 영향 없음
function FitbLayout() {
  return (
    <div className="b2b-shell">
      <B2bLnb />
      <div className="b2b-shell__workspace">
        <Header variant="b2b" />
        <main className="b2b-shell__content">
          <Outlet />
        </main>
      </div>
      {/* 우측 통합 드로어: 리스트 행 클릭 시 'b2b-drawer-open' 이벤트로 탭 누적 (추가 동선) */}
      <B2bDrawer />
      {/* AI 비서: 플로팅 입력바 + 채팅 팝업 (Phase 1 - OWNER만 내부에서 렌더 판단) */}
      <AiPanel />
    </div>
  );
}

export default FitbLayout;
