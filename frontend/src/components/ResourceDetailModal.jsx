// src/components/ResourceDetailModal.jsx
import { useState } from 'react';
import Modal from './Modal';
import { STAMP_CLASS } from '../constants';
import { timeAgo, formatContent } from '../utils.jsx';
import { useAuth } from '../AuthContext';

export default function ResourceDetailModal({
  resource, bookmarked, onClose, onToggleBookmark, onUpvote, onComment, onDelete
}) {
  const { user } = useAuth();
  const [commentText, setCommentText] = useState('');
  const upvoted = user ? resource.upvotes.includes(user.id) : false;
  const isOwner = user && user.id === resource.uploaderId;

  function submitComment() {
    const text = commentText.trim();
    if (!text) return;
    onComment(resource.id, text);
    setCommentText('');
  }

  return (
    <Modal
      onClose={onClose}
      title={
        <>
          <span
            className={`pill stamp ${STAMP_CLASS[resource.type] || ''}`}
            style={{ position: 'static', transform: 'none', display: 'inline-block', marginBottom: 8 }}
          >
            {resource.type}
          </span>
          <div>{resource.title}</div>
        </>
      }
    >
      <div className="detail-meta-row">
        <span className="pill">{resource.branch}</span>
        <span className="pill">Semester {resource.semester}</span>
        <span className="pill">{resource.subject}</span>
        <span className="pill">👁 {resource.views} views</span>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>{resource.description}</p>

      {resource.content && (
        <div className="detail-content" style={{ marginTop: 12 }}>{formatContent(resource.content)}</div>
      )}
      {resource.link && (
        <a className="detail-link" href={resource.link} target="_blank" rel="noopener noreferrer">
          ↗ Open external resource
        </a>
      )}

      {resource.tags?.length > 0 && (
        <div className="tagrow" style={{ marginTop: 12 }}>
          {resource.tags.map(t => <span className="tag" key={t}>#{t}</span>)}
        </div>
      )}

      <div className="card-foot" style={{ marginTop: 14, borderTop: '1px dashed var(--border)', paddingTop: 10 }}>
        <div className="uploader">Uploaded by <b>{resource.uploaderName}</b> · {timeAgo(resource.createdAt)}</div>
        <div className="card-actions">
          <button className={`iconbtn${bookmarked ? ' bookmarked' : ''}`} onClick={() => onToggleBookmark(resource.id)}>
            {bookmarked ? '★ Saved' : '☆ Save'}
          </button>
          <button className={`iconbtn${upvoted ? ' active' : ''}`} onClick={() => onUpvote(resource.id)}>
            ▲ Helpful ({resource.upvotes.length})
          </button>
        </div>
      </div>

      {isOwner && (
        <button className="btn btn-danger btn-sm" style={{ marginTop: 10 }} onClick={() => onDelete(resource.id)}>
          Delete this resource
        </button>
      )}

      <div className="comments">
        <h4>Discussion ({resource.comments.length})</h4>
        {resource.comments.length ? resource.comments.map(c => (
          <div className="comment" key={c.id}>
            <div className="comment-head"><b>{c.authorName}</b><span>{timeAgo(c.createdAt)}</span></div>
            <div>{c.text}</div>
          </div>
        )) : <p className="hint">No comments yet — ask a question or say thanks.</p>}

        <div className="comment-form">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={user ? 'Add a comment…' : 'Log in to comment…'}
            onKeyDown={(e) => { if (e.key === 'Enter') submitComment(); }}
          />
          <button className="btn btn-accent btn-sm" onClick={submitComment}>Post</button>
        </div>
      </div>
    </Modal>
  );
}
