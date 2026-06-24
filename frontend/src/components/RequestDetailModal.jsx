// src/components/RequestDetailModal.jsx
import { useState } from 'react';
import Modal from './Modal';
import { timeAgo } from '../utils.jsx';
import { useAuth } from '../AuthContext';

export default function RequestDetailModal({ request, onClose, onToggleFulfilled, onComment, onDelete }) {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const isOwner = user && user.id === request.requesterId;

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onComment(request.id, trimmed);
    setText('');
  }

  return (
    <Modal title={request.title} onClose={onClose}>
      <div className="detail-meta-row">
        <span className="pill">{request.branch}</span>
        <span className="pill">Semester {request.semester}</span>
        <span className="pill">{request.subject}</span>
        <span className={`req-badge ${request.fulfilled ? 'fulfilled' : 'open'}`}>
          {request.fulfilled ? 'FULFILLED' : 'OPEN'}
        </span>
      </div>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
        {request.description || 'No extra details given.'}
      </p>
      <p className="hint" style={{ marginTop: 10 }}>
        asked by <b style={{ color: 'var(--ink)' }}>{request.requesterName}</b> · {timeAgo(request.createdAt)}
      </p>

      <button className={`btn ${request.fulfilled ? 'btn-ghost' : 'btn-accent'} btn-sm`} style={{ marginTop: 10 }} onClick={() => onToggleFulfilled(request.id)}>
        {request.fulfilled ? 'Mark as still open' : 'Mark as fulfilled'}
      </button>
      {isOwner && (
        <button className="btn btn-danger btn-sm" style={{ marginTop: 10, marginLeft: 8 }} onClick={() => onDelete(request.id)}>
          Delete
        </button>
      )}

      <div className="comments">
        <h4>Replies ({request.comments.length})</h4>
        {request.comments.length ? request.comments.map(c => (
          <div className="comment" key={c.id}>
            <div className="comment-head"><b>{c.authorName}</b><span>{timeAgo(c.createdAt)}</span></div>
            <div>{c.text}</div>
          </div>
        )) : <p className="hint">No replies yet — if you have this, let them know.</p>}

        <div className="comment-form">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? "I have this — here's a link, or just say hi…" : 'Log in to reply…'}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
          />
          <button className="btn btn-accent btn-sm" onClick={submit}>Reply</button>
        </div>
      </div>
    </Modal>
  );
}
