// src/components/Browse.jsx
import { BRANCHES, SEMESTERS, TYPES } from '../constants';
import ResourceCard from './ResourceCard';

export default function Browse({
  resources, loading, filters, onFilterChange,
  bookmarkedIds, currentUserId, onOpen, onToggleBookmark, onUpvote, onAddResource,
  stats
}) {
  return (
    <>
      <div className="filterbar">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search title, subject, or tag…"
            value={filters.search}
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
        </div>
        <select value={filters.branch} onChange={(e) => onFilterChange('branch', e.target.value)}>
          <option value="">All branches</option>
          {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <select value={filters.semester} onChange={(e) => onFilterChange('semester', e.target.value)}>
          <option value="">All semesters</option>
          {SEMESTERS.map(s => <option key={s} value={s}>Sem {s}</option>)}
        </select>
        <select value={filters.type} onChange={(e) => onFilterChange('type', e.target.value)}>
          <option value="">All types</option>
          {Object.entries(TYPES).map(([label, code]) => <option key={code} value={code}>{label}</option>)}
        </select>
        <select value={filters.sort} onChange={(e) => onFilterChange('sort', e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="upvoted">Most helpful</option>
          <option value="viewed">Most viewed</option>
        </select>
      </div>

      <div className="statstrip">
        <span><b>{stats.totalResources}</b> resources</span>
        <span><b>{stats.branchesCovered}</b> branches covered</span>
        <span><b>{resources.length}</b> matching current filters</span>
      </div>

      {loading ? (
        <div className="loading"><span className="skel" />Loading the archive…</div>
      ) : resources.length ? (
        <div className="grid">
          {resources.map(r => (
            <ResourceCard
              key={r.id}
              resource={r}
              bookmarked={bookmarkedIds.includes(r.id)}
              upvoted={currentUserId ? r.upvotes.includes(currentUserId) : false}
              onOpen={onOpen}
              onToggleBookmark={onToggleBookmark}
              onUpvote={onUpvote}
            />
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>Nothing here yet</h3>
          <p>No resources match these filters. Try widening your search, or be the first to add one for this subject.</p>
          <button className="btn btn-primary" onClick={onAddResource}>+ Add resource</button>
        </div>
      )}
    </>
  );
}
