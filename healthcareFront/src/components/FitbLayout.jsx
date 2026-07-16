import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import AiPanel from '../ai/AiPanel.jsx';

// 사장님/가맹점(B2B) 전용 화면 상시 고정 헤더 레이아웃
// AI 비서(OWNER 전용)는 하단 중앙 플로팅 입력바 + 채팅 팝업(fixed)이라 본문 레이아웃에 영향 없음
function FitbLayout() {
  return (
    <div>
      {/* 사장님용 최상단 공통 헤더 고정 */}
      <Header />
      <div style={{ padding: '10px 0' }}>
        {/* 하위 매핑된 실제 사장님 상세 관리 화면 구멍 */}
        <Outlet />
      </div>
      {/* AI 비서: 플로팅 입력바 + 채팅 팝업 (Phase 1 - OWNER만 내부에서 렌더 판단) */}
      <AiPanel />
    </div>
  );
}

export default FitbLayout;
