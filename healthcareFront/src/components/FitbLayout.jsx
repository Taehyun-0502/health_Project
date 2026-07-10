import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';

// 사장님/가맹점(B2B) 전용 화면 상시 고정 헤더 레이아웃
function FitbLayout() {
  return (
    <div>
      {/* 사장님용 최상단 공통 헤더 고정 */}
      <Header />
      <div style={{ padding: '10px 0' }}>
        {/* 하위 매핑된 실제 사장님 상세 관리 화면 구멍 */}
        <Outlet />
      </div>
    </div>
  );
}

export default FitbLayout;
