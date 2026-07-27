import { useNavigate } from 'react-router-dom';
import AttendanceConfirm from './AttendanceConfirm.jsx';
import OwnerManagement from './OwnerManagement.jsx';
import AdminManagement from './AdminManagement.jsx';
import PageHeaderActionSlot from '../components/PageHeaderActionSlot.jsx';
import { B2B_ROLES, normalizeRole } from '../config/uiNavigation.js';
import './B2bManagementPage.css';

// role별 안내 문구 — 허브(Home) 카드 desc와 문구 일치 (config/uiNavigation.js management 카드)
const MANAGEMENT_DESC = {
  admin: '헬스장별 제휴 계약 기간과 만료 현황을 확인합니다.',
  owner: '트레이너 성과, 재등록 대상과 지점 일정을 확인합니다.',
  trainer: '담당 회원의 PT 출석, 일정과 잔여 세션을 관리합니다.',
};

function B2bManagementPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = normalizeRole(user.role);

  return (
    <section className="b2b-management-page">
      {B2B_ROLES.includes(role) && (
        // 페이지 헤더 (제목 + 안내 문구 + 주요 액션) — 리포트 페이지와 동일 시각 규격
        // 주요 액션(새로고침·프로모션 발행 등)은 하위 탭 컴포넌트가 usePageHeaderAction으로 등록하고
        // 여기 슬롯이 렌더한다 (탭에 따라 버튼이 없거나 바뀌므로 하위 컴포넌트가 소유)
        <header className="b2b-management-page__head">
          <div className="b2b-management-page__head-main">
            <h2 className="b2b-management-page__title">회원 관리</h2>
            <p className="b2b-management-page__desc">{MANAGEMENT_DESC[role]}</p>
          </div>
          <PageHeaderActionSlot className="b2b-management-page__action" />
        </header>
      )}
      {role === 'trainer' && <AttendanceConfirm />}
      {role === 'owner' && <OwnerManagement onGoPromotion={() => navigate('/fitb/promotion')} />}
      {role === 'admin' && <AdminManagement />}
      {!B2B_ROLES.includes(role) && (
        <p className="b2b-management-page__empty">이 역할에서 사용할 수 있는 관리 화면이 없습니다.</p>
      )}
    </section>
  );
}

export default B2bManagementPage;
