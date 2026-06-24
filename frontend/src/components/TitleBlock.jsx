// src/components/TitleBlock.jsx
import { useAuth } from '../AuthContext';

export default function TitleBlock({ stats, theme, onToggleTheme, onOpenAuth }) {
  const { user, logout } = useAuth();

  return (
    <header className="titleblock">
      <div className="tb-cell tb-mark">
        <div className="tb-title">StudyHub</div>
        <div className="tb-sub">Engineering Archive · shared by the class</div>
      </div>
      <div className="tb-cell tb-stat">
        <div className="tb-label">Sheet count</div>
        <div className="tb-value">{stats.totalResources}</div>
      </div>
      <div className="tb-cell tb-stat">
        <div className="tb-label">Contributors</div>
        <div className="tb-value">{stats.contributors}</div>
      </div>
      <div
        className="tb-cell tb-user"
        onClick={() => { if (!user) onOpenAuth(); else logout(); }}
        title={user ? 'Click to log out' : 'Click to log in / register'}
      >
        <div className="tb-label">Drawn by</div>
        <div className="tb-value">{user ? user.name : 'Log in →'}</div>
      </div>
      <div className="tb-cell tb-theme">
        <button className="theme-btn" onClick={onToggleTheme}>
          {theme === 'dark' ? '☀ Paper mode' : '◆ Blueprint mode'}
        </button>
      </div>
    </header>
  );
}
