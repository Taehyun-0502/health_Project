import { NavLink, Outlet } from 'react-router-dom';
import './Contract.css';

// 계약 패키지 2Depth 메뉴 레이아웃 (1Depth: Contract)
// Contract = 기존 계약서 리스트(Contractpage) / Member = 역할별 로스터(명단) 신규 화면
// 구직 트레이너 탭은 관계사(ADMIN)에게만 노출 (구직 풀 선별·소개는 ADMIN 권한)
function ContractLayout() {
  const loginUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = loginUser?.role?.toUpperCase() === 'ADMIN';

  // NavLink 활성 탭 클래스 처리 (최소 CSS)
  const tabClass = ({ isActive }) => (isActive ? 'contract-tab active' : 'contract-tab');

  return (
    <div className="contract-layout">
      <nav className="contract-tabs">
        <NavLink to="/fitb/contractpage" end className={tabClass}>Contract</NavLink>
        <NavLink to="/fitb/contractpage/member" className={tabClass}>Member</NavLink>
        {isAdmin && (
          <NavLink to="/fitb/contractpage/jobseekers" className={tabClass}>구직 트레이너</NavLink>
        )}
      </nav>
      <Outlet />
    </div>
  );
}

export default ContractLayout;
