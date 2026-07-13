import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import AiPanel from '../ai/AiPanel.jsx';

// 사장님/가맹점(B2B) 전용 화면 상시 고정 헤더 레이아웃
// AI 비서 패널(OWNER 전용)이 우측에 도킹되면 본문이 남은 폭으로 리플로우되는 구조
function FitbLayout() {
  return (
    <div>
      {/* 사장님용 최상단 공통 헤더 고정 */}
      <Header />
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <div style={{ flex: 1, minWidth: 0, padding: '10px 0' }}>
          {/* 하위 매핑된 실제 사장님 상세 관리 화면 구멍 */}
          <Outlet />
        </div>
        {/* AI 비서: FAB + 우측 도킹 리사이저블 패널 (Phase 1 - OWNER만 내부에서 렌더 판단) */}
        <AiPanel />
      </div>
    </div>
  );
}

export default FitbLayout;
