import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';

// 일반 회원(B2C) 전용 화면 상시 고정 헤더 레이아웃
function FitcLayout() {
  return (
    <div>
      {/* 회원용 최상단 공통 헤더 고정 */}
      <Header />
      <div style={{ padding: '10px 0' }}>
        {/* 하위 매핑된 실제 라우트 내용이 들어올 구멍 */}
        <Outlet />
      </div>
    </div>
  );
}

export default FitcLayout;
