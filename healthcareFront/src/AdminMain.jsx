import { Link } from 'react-router-dom';
import { getB2bHomeActions, ROLE_LABEL, normalizeRole } from './config/uiNavigation.js';
import NavIcon from './components/uiIcons.jsx';
import './AdminMain.css';

const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

function formatToday() {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}`;
}

function AdminMain() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const actions = getB2bHomeActions(user.role);
  const coreActions = actions.filter((action) => action.core);
  const extraActions = actions.filter((action) => !action.core);
  const roleLabel = ROLE_LABEL[normalizeRole(user.role)] || '';
  const gymLabel = user.gymId ? `지점 ${user.gymId}` : null;

  const renderCard = (action, className, iconSize) => {
    const content = (
      <>
        <span className="admin-home__icon" aria-hidden="true">
          <NavIcon id={action.id} size={iconSize} fallback={action.icon} />
        </span>
        <span className="admin-home__copy">
          <strong>{action.title}</strong>
          <span>{action.description}</span>
        </span>
        <span className="admin-home__arrow" aria-hidden="true">
          <NavIcon id="chevron" size={18} fallback="→" />
        </span>
      </>
    );

    if (action.external) {
      return (
        <a key={action.id} href={action.to} target="_blank" rel="noreferrer" className={className}>
          {content}
        </a>
      );
    }
    return (
      <Link key={action.id} to={action.to} className={className}>
        {content}
      </Link>
    );
  };

  return (
    <section className="admin-home">
      <header className="admin-home__header">
        <h1>안녕하세요, {user.name || '관리자'}{roleLabel === '사장님' ? ' 사장님' : '님'}</h1>
        <p>{formatToday()}{gymLabel ? ` · ${gymLabel}` : ''}</p>
      </header>

      <div className="admin-home__grid">
        {coreActions.map((action) => renderCard(action, 'admin-home__card', 26))}
      </div>

      {extraActions.length > 0 && (
        <>
          <p className="admin-home__section-label">기타 메뉴</p>
          <div className="admin-home__extra-grid">
            {extraActions.map((action) => renderCard(action, 'admin-home__extra-card', 17))}
          </div>
        </>
      )}
    </section>
  );
}

export default AdminMain;
