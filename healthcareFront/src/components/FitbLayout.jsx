import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import AiPanel from '../ai/AiPanel.jsx';
import B2bLnb from './B2bLnb.jsx';
import B2bDrawer from './B2bDrawer.jsx';
import './FitbLayout.css';

// 사장님/가맹점(B2B) 전용 공통 셸 — 좌측 LNB + 상단 유틸리티 바 + 콘텐츠 (LNB 단일 확정)
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
      {/* AI 비서: 플로팅 입력바 (채팅 본문은 드로어 AI 탭 - Phase 1 role 게이트는 내부 판단) */}
      <AiPanel />
    </div>
  );
}

export default FitbLayout;
