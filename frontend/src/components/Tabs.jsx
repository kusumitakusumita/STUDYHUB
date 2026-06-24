// src/components/Tabs.jsx
import { useAuth } from '../AuthContext';

const TABS = [
  ['browse', 'Browse'],
  ['requests', 'Requests'],
  ['leaderboard', 'Leaderboard'],
  ['bookmarks', 'Bookmarks'],
  ['mine', 'My uploads']
];

export default function Tabs({ tab, onChange, onAddResource }) {
  const { user } = useAuth();
  const allTabs = user?.isAdmin ? [...TABS, ['admin', 'Admin']] : TABS;

  return (
    <div className="navrow">
      <nav className="tabs">
        {allTabs.map(([key, label]) => (
          <button
            key={key}
            className={`tab-btn${tab === key ? ' active' : ''}`}
            onClick={() => onChange(key)}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="spacer" />
      <button className="btn btn-primary" onClick={onAddResource}>+ Add resource</button>
    </div>
  );
}
