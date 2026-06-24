// src/components/AdminDashboard.jsx
//
// The admin panel — only visible to accounts with isAdmin: true.
// Three inner tabs:
//   Overview  — headline numbers + two bar charts (signups & activity over 14 days)
//   Users     — full user table with per-user stats, sortable
//   Activity  — raw event feed, filterable by type
//
// No charting library is imported — charts are plain CSS bar charts so
// the bundle stays small and there are zero extra dependencies to install.

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { useToast } from '../ToastContext';
import { timeAgo } from '../utils.jsx';

// ─── helpers ───────────────────────────────────────────────────────────────

const EVENT_LABELS = {
  register:         '👤 Registered',
  login:            '🔑 Logged in',
  view_resource:    '👁 Viewed resource',
  create_resource:  '📎 Uploaded resource',
  delete_resource:  '🗑 Deleted resource',
  upvote_resource:  '▲ Marked helpful',
  comment_resource: '💬 Commented on resource',
  bookmark_resource:'★ Bookmarked resource',
  create_request:   '📋 Posted request',
  comment_request:  '💬 Replied to request',
  fulfill_request:  '✅ Fulfilled request',
  reopen_request:   '🔁 Reopened request',
  delete_request:   '🗑 Deleted request',
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '16px 20px',
      borderLeft: `3px solid ${accent || 'var(--accent)'}`,
      minWidth: 130, flex: '1 1 130px'
    }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// Plain CSS bar chart — each bar height is proportional to the max value.
function BarChart({ data, label, color }) {
  if (!data || Object.keys(data).length === 0) return null;
  const entries = Object.entries(data);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 16px 12px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-soft)', marginBottom: 14 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {entries.map(([day, val]) => (
          <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }} title={`${day}: ${val}`}>
            <div style={{
              width: '100%', background: val > 0 ? (color || 'var(--accent)') : 'var(--border)',
              height: `${Math.max((val / maxVal) * 72, val > 0 ? 4 : 1)}px`,
              borderRadius: '3px 3px 0 0', opacity: val > 0 ? 0.85 : 0.4,
              transition: 'height .3s ease'
            }} />
          </div>
        ))}
      </div>
      {/* x-axis: show only first, middle, last labels to avoid overlap */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        {[entries[0], entries[Math.floor(entries.length / 2)], entries[entries.length - 1]].map(([day]) => (
          <span key={day} style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink-faint)' }}>
            {day.slice(5)} {/* show MM-DD */}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── sub-views ─────────────────────────────────────────────────────────────

function Overview({ stats }) {
  if (!stats) return <div className="loading"><span className="skel" />Loading stats…</div>;
  const { totals, signupsByDay, activityByDay, topActiveUsers, eventCountsByType, mostViewedResources } = stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* headline numbers */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <StatCard label="Total users"      value={totals.users}          accent="var(--accent)" />
        <StatCard label="Active (7 days)"  value={totals.activeUsers7d}  accent="var(--green)"  sub="unique logged-in users" />
        <StatCard label="Resources"        value={totals.resources}       accent="var(--amber)"  />
        <StatCard label="Total views"      value={totals.totalViews}      accent="#7A4FB5"       />
        <StatCard label="Open requests"    value={totals.openRequests}    accent="var(--red)"    sub={`of ${totals.requests} total`} />
      </div>

      {/* charts side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <BarChart data={signupsByDay}  label="New signups — last 14 days"   color="var(--accent)" />
        <BarChart data={activityByDay} label="All activity — last 14 days"  color="var(--green)"  />
      </div>

      {/* two side-by-side tables */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>

        {/* most active users */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-soft)' }}>
            Most active users (all time)
          </div>
          {topActiveUsers.map((u, i) => (
            <div key={u.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', width: 24 }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600 }}>{u.name}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)' }}><b style={{ color: 'var(--ink)' }}>{u.count}</b> actions</span>
            </div>
          ))}
          {topActiveUsers.length === 0 && <div className="hint" style={{ padding: 14 }}>No activity yet.</div>}
        </div>

        {/* most viewed resources */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-soft)' }}>
            Most viewed resources
          </div>
          {mostViewedResources.map((r, i) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, gap: 10 }}>
              <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-mono)', width: 24 }}>{i + 1}</span>
              <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}><b style={{ color: 'var(--ink)' }}>{r.views}</b> views</span>
            </div>
          ))}
          {mostViewedResources.length === 0 && <div className="hint" style={{ padding: 14 }}>No resources yet.</div>}
        </div>
      </div>

      {/* event type breakdown */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--ink-soft)' }}>
          Activity breakdown (all time)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
          {Object.entries(eventCountsByType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
            <div key={type} style={{ padding: '10px 18px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', minWidth: 170 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{EVENT_LABELS[type] || type}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22, color: 'var(--ink)', marginTop: 2 }}>{count}</div>
            </div>
          ))}
          {Object.keys(eventCountsByType).length === 0 && <div className="hint" style={{ padding: 14 }}>No events recorded yet.</div>}
        </div>
      </div>

    </div>
  );
}

function UsersTable({ users, loading }) {
  const [sortKey, setSortKey] = useState('lastActiveAt');
  const [sortDir, setSortDir] = useState('desc');

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  }

  const sorted = [...(users || [])].sort((a, b) => {
    let av = a[sortKey] || 0, bv = b[sortKey] || 0;
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const SortBtn = ({ k, label }) => (
    <span
      onClick={() => toggleSort(k)}
      style={{ cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}
    >
      {label} {sortKey === k ? (sortDir === 'asc' ? '▲' : '▼') : <span style={{ opacity: 0.3 }}>⇅</span>}
    </span>
  );

  if (loading) return <div className="loading"><span className="skel" />Loading users…</div>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface-2)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--ink-soft)' }}>
            {[['name','Name'],['branch','Branch'],['semester','Sem'],['resourceCount','Uploads'],['bookmarkCount','Bookmarks'],['eventCount','Actions'],['lastActiveAt','Last active'],['createdAt','Joined']].map(([k, label]) => (
              <th key={k} style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                <SortBtn k={k} label={label} />
              </th>
            ))}
            <th style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>Role</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(u => (
            <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '9px 12px', fontWeight: 600 }}>{u.name}</td>
              <td style={{ padding: '9px 12px', color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{u.branch || '—'}</td>
              <td style={{ padding: '9px 12px', color: 'var(--ink-soft)', textAlign: 'center' }}>{u.semester || '—'}</td>
              <td style={{ padding: '9px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{u.resourceCount}</td>
              <td style={{ padding: '9px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{u.bookmarkCount}</td>
              <td style={{ padding: '9px 12px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{u.eventCount}</td>
              <td style={{ padding: '9px 12px', color: 'var(--ink-soft)', fontSize: 12, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{u.lastActiveAt ? timeAgo(u.lastActiveAt) : '—'}</td>
              <td style={{ padding: '9px 12px', color: 'var(--ink-soft)', fontSize: 12, fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>{timeAgo(u.createdAt)}</td>
              <td style={{ padding: '9px 12px' }}>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: 10.5, padding: '2px 7px', borderRadius: 99,
                  background: u.isAdmin ? 'var(--amber-bg)' : 'var(--surface-2)',
                  color: u.isAdmin ? 'var(--amber)' : 'var(--ink-soft)',
                  border: `1px solid ${u.isAdmin ? 'var(--amber)' : 'var(--border)'}`
                }}>
                  {u.isAdmin ? 'Admin' : 'Student'}
                </span>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: 'var(--ink-faint)' }}>No users yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

const EVENT_TYPE_OPTIONS = [
  '', 'register', 'login', 'view_resource', 'create_resource', 'delete_resource',
  'upvote_resource', 'comment_resource', 'bookmark_resource',
  'create_request', 'comment_request', 'fulfill_request', 'reopen_request', 'delete_request'
];

function ActivityFeed({ events, loading, onFilter, filterType }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filterType}
          onChange={e => onFilter(e.target.value)}
          style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '7px 10px', fontSize: 13, background: 'var(--surface)', color: 'var(--ink)' }}
        >
          <option value="">All event types</option>
          {EVENT_TYPE_OPTIONS.slice(1).map(t => (
            <option key={t} value={t}>{EVENT_LABELS[t] || t}</option>
          ))}
        </select>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-faint)' }}>
          Showing most recent {events?.length || 0} events
        </span>
      </div>

      {loading ? (
        <div className="loading"><span className="skel" />Loading activity…</div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          {events?.length ? events.map(e => (
            <div key={e.id} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink-faint)', whiteSpace: 'nowrap', paddingTop: 2, minWidth: 80 }}>
                {timeAgo(e.createdAt)}
              </span>
              <span style={{ flex: '0 0 auto' }}>{EVENT_LABELS[e.type]?.split(' ')[0] || '⚡'}</span>
              <div style={{ flex: 1, lineHeight: 1.45 }}>
                <b>{e.userName}</b>
                {' '}
                <span style={{ color: 'var(--ink-soft)' }}>
                  {EVENT_LABELS[e.type]?.slice(EVENT_LABELS[e.type]?.indexOf(' ') + 1) || e.type}
                  {e.targetLabel ? <> — <em style={{ fontStyle: 'normal', color: 'var(--ink)' }}>{e.targetLabel}</em></> : null}
                </span>
              </div>
            </div>
          )) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-faint)', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
              No events match this filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── main export ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const showToast = useToast();
  const [inner, setInner] = useState('overview');

  const [stats, setStats]         = useState(null);
  const [users, setUsers]         = useState([]);
  const [events, setEvents]       = useState([]);
  const [loadingStats, setLoadingStats]   = useState(true);
  const [loadingUsers, setLoadingUsers]   = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [filterType, setFilterType]       = useState('');

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try { const d = await api.adminStats(); setStats(d); }
    catch (e) { showToast(e.message, true); }
    finally { setLoadingStats(false); }
  }, [showToast]);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try { const d = await api.adminUsers(); setUsers(d.users); }
    catch (e) { showToast(e.message, true); }
    finally { setLoadingUsers(false); }
  }, [showToast]);

  const loadEvents = useCallback(async (type = '') => {
    setLoadingEvents(true);
    try { const d = await api.adminEvents({ type, limit: 100 }); setEvents(d.events); }
    catch (e) { showToast(e.message, true); }
    finally { setLoadingEvents(false); }
  }, [showToast]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    if (inner === 'users' && users.length === 0) loadUsers();
    if (inner === 'activity') loadEvents(filterType);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inner]);

  async function handleFilterType(type) {
    setFilterType(type);
    await loadEvents(type);
  }

  const INNER_TABS = [['overview','Overview'],['users','Users'],['activity','Activity feed']];

  return (
    <div>
      {/* admin inner tab strip */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {INNER_TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setInner(key)}
            style={{
              border: 'none', background: inner === key ? 'var(--accent-soft)' : 'transparent',
              color: inner === key ? 'var(--accent)' : 'var(--ink-soft)',
              fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5,
              padding: '6px 14px', borderRadius: 6, cursor: 'pointer',
              borderBottom: inner === key ? '2px solid var(--accent)' : '2px solid transparent'
            }}
          >{label}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost btn-sm" onClick={() => { loadStats(); if (inner === 'users') loadUsers(); if (inner === 'activity') loadEvents(filterType); }}>
          ↻ Refresh
        </button>
      </div>

      {inner === 'overview' && (
        loadingStats
          ? <div className="loading"><span className="skel" />Loading stats…</div>
          : <Overview stats={stats} />
      )}
      {inner === 'users'    && <UsersTable users={users} loading={loadingUsers} />}
      {inner === 'activity' && <ActivityFeed events={events} loading={loadingEvents} onFilter={handleFilterType} filterType={filterType} />}
    </div>
  );
}
