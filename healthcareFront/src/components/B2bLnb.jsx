import { useRef } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  B2B_PRIMARY_NAV,
  ITEM_SUB_NAV,
  ROLE_LABEL,
  normalizeRole,
} from '../config/uiNavigation.js';
import useLogout from '../hooks/useLogout.js';
import NavIcon from './uiIcons.jsx';
import './B2bLnb.css';

function B2bLnb() {
  const location = useLocation();
  const logout = useLogout();
  const profileDetailsRef = useRef(null);

  const closeProfileMenu = () => {
    // 클릭 이벤트의 기본 동작(Link 네비게이션)이 먼저 처리되도록 다음 틱에 닫는다.
    // 같은 틱에서 즉시 닫으면 <details> 콘텐츠가 사라지며 네이티브 앵커 네비게이션이 취소될 수 있다.
    setTimeout(() => {
      profileDetailsRef.current?.removeAttribute('open');
    }, 0);
  };

  const handleLogoutClick = () => {
    closeProfileMenu();
    logout();
  };
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = ROLE_LABEL[normalizeRole(user.role)] || user.role || '사용자';
  const initial = String(user.name || user.username || 'U').trim().slice(0, 1).toUpperCase();

  // LNB 상단 브랜드 영역 — 소속 지점명(gymName) 노출 (OWNER·TRAINER 한정, ADMIN·gymName 없음은 기존 브랜드 폴백)
  const gymName = String(user.gymName || '').trim();
  const hasGymBrand = gymName.length > 0;
  const gymBrandLabel = gymName.length > 5 ? `${gymName.slice(0, 5)}…` : gymName;
  const gymBrandInitial = gymName.slice(0, 1).toUpperCase();
  const isItemPage = location.pathname.startsWith('/fitb/itempage');
  const itemView = new URLSearchParams(location.search).get('view') === 'form' ? 'form' : 'list';
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
        {hasGymBrand ? (
          <>
            <span className="b2b-lnb__brand-mark" aria-hidden="true">{gymBrandInitial}</span>
            <span className="b2b-lnb__brand-copy">
              <strong title={gymName}>{gymBrandLabel}</strong>
              <small>Haru Health</small>
            </span>
          </>
        ) : (
          <span className="b2b-lnb__brand-copy">
            <strong>Haru Health</strong>
            <small>MANAGEMENT</small>
          </span>
        )}
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

            {item.id === 'item' && isItemPage && (
              <div className="b2b-lnb__subnav" aria-label="Item 하위 메뉴">
                {ITEM_SUB_NAV.map((subItem) => (
                  <Link
                    key={subItem.id}
                    to={subItem.to}
                    className={`b2b-lnb__sublink${itemView === subItem.view ? ' is-active' : ''}`}
                    aria-current={itemView === subItem.view ? 'page' : undefined}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <details ref={profileDetailsRef} className={`b2b-profile${isProfilePage ? ' is-active' : ''}`}>
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
          <Link to="/fitb/b2bmypage" onClick={closeProfileMenu}>마이페이지</Link>
          <button type="button" onClick={handleLogoutClick}>로그아웃</button>
        </div>
      </details>
    </aside>
  );
}

export default B2bLnb;
