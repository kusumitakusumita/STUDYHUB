// src/components/ResourceCard.jsx
import { STAMP_CLASS } from '../constants';
import { timeAgo } from '../utils.jsx';

export default function ResourceCard({ resource, bookmarked, upvoted, onOpen, onToggleBookmark, onUpvote }) {
  return (
    <div className="card" onClick={() => onOpen(resource.id)}>
      <span className={`stamp ${STAMP_CLASS[resource.type] || ''}`}>{resource.type}</span>
      <div className="card-title">{resource.title}</div>
      <div className="card-meta">{resource.branch} · SEM {resource.semester} · {resource.subject}</div>
      <div className="card-desc">{resource.description}</div>
      {resource.tags?.length > 0 && (
        <div className="tagrow">
          {resource.tags.slice(0, 4).map(t => <span className="tag" key={t}>#{t}</span>)}
        </div>
      )}
      <div className="card-foot">
        <div className="uploader">by <b>{resource.uploaderName}</b> · {timeAgo(resource.createdAt)}</div>
        <div className="card-actions">
          <button
            className={`iconbtn${bookmarked ? ' bookmarked' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleBookmark(resource.id); }}
            title="Bookmark"
          >
            {bookmarked ? '★' : '☆'}
          </button>
          <button
            className={`iconbtn${upvoted ? ' active' : ''}`}
            onClick={(e) => { e.stopPropagation(); onUpvote(resource.id); }}
            title="Mark helpful"
          >
            ▲ {resource.upvotes.length}
          </button>
          <span className="iconbtn" title="Comments">💬 {resource.comments.length}</span>
        </div>
      </div>
    </div>
  );
}
