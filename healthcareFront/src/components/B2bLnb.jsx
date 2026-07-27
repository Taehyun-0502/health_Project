import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  B2B_PRIMARY_NAV,
  ROLE_LABEL,
  normalizeRole,
} from '../config/uiNavigation.js';
import useLogout from '../hooks/useLogout.js';
import NavIcon from './uiIcons.jsx';
import './B2bLnb.css';

function B2bLnb() {
  const location = useLocation();
  const logout = useLogout();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = ROLE_LABEL[normalizeRole(user.role)] || user.role || '사용자';
  const initial = String(user.name || user.username || 'U').trim().slice(0, 1).toUpperCase();
  const isProfilePage = location.pathname.startsWith('/fitb/b2bmypage');

  // admin 권한일 경우 물품(item) 탭 필터링 제외
  const primaryNav = B2B_PRIMARY_NAV.filter((item) => {
    if (normalizeRole(user.role) === 'admin' && item.id === 'item') {
      return false;
    }
    return true;
  });

  return (
    <aside className="b2b-lnb" aria-label="B2B 관리 메뉴">
      <Link to="/fitb" className="b2b-lnb__brand" aria-label="Haru Health Home">
        <span className="b2b-lnb__brand-copy">
          <strong>Haru Health</strong>
          <small>MANAGEMENT</small>
        </span>
      </Link>

      <nav className="b2b-lnb__nav" aria-label="주요 메뉴">
        <span className="b2b-lnb__section-label">MENU</span>
        {primaryNav.map((item) => (
          <div key={item.id} className="b2b-lnb__nav-group">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) => `b2b-lnb__link${isActive ? ' is-active' : ''}`}
            >
              <span className="b2b-lnb__menu-icon" aria-hidden="true">
                <NavIcon id={item.id} fallback={item.icon} />
              </span>
              <span>{item.label}</span>
            </NavLink>
          </div>
        ))}
      </nav>

      <details className={`b2b-profile${isProfilePage ? ' is-active' : ''}`}>
        <summary className="b2b-profile__summary">
          <span className="b2b-profile__avatar" aria-hidden="true">{initial}</span>
          <span className="b2b-profile__copy">
            <strong>{user.name || user.username || '사용자'}</strong>
            <small>{role} · {user.gymId ? `지점 ${user.gymId}` : '지점 미지정'}</small>
          </span>
          <span className="b2b-profile__chevron" aria-hidden="true">
            <NavIcon id="chevron" size={16} />
          </span>
        </summary>
        <div className="b2b-profile__menu">
          <Link to="/fitb/b2bmypage">마이페이지</Link>
          <button type="button" onClick={logout}>로그아웃</button>
        </div>
      </details>
    </aside>
  );
}

export default B2bLnb;
