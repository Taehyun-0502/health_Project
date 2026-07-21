import { useNavigate } from 'react-router-dom';
import AttendanceConfirm from './AttendanceConfirm.jsx';
import OwnerManagement from './OwnerManagement.jsx';
import AdminManagement from './AdminManagement.jsx';
import { B2B_ROLES, normalizeRole } from '../config/uiNavigation.js';
import './B2bManagementPage.css';

function B2bManagementPage() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = normalizeRole(user.role);

  return (
    <section className="b2b-management-page">
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
