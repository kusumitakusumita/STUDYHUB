// src/components/Requests.jsx
import { timeAgo } from '../utils.jsx';

export default function Requests({ requests, loading, onOpen, onAddRequest }) {
  return (
    <>
      <div className="navrow" style={{ marginTop: 0 }}>
        <h3 style={{ fontSize: 15 }}>Can't find something? Ask the class.</h3>
        <div className="spacer" />
        <button className="btn btn-accent btn-sm" onClick={onAddRequest}>+ Post a request</button>
      </div>

      {loading ? (
        <div className="loading"><span className="skel" />Loading requests…</div>
      ) : requests.length ? (
        requests.map(req => (
          <div className="req-card" key={req.id}>
            <div className="req-top">
              <div className="req-title">{req.title}</div>
              <span className={`req-badge ${req.fulfilled ? 'fulfilled' : 'open'}`}>
                {req.fulfilled ? 'FULFILLED' : 'OPEN'}
              </span>
            </div>
            <div className="card-meta">{req.branch} · SEM {req.semester} · {req.subject}</div>
            <div className="req-desc">{req.description}</div>
            <div className="req-foot">
              <span>asked by <b>{req.requesterName}</b> · {timeAgo(req.createdAt)} · {req.comments.length} replies</span>
              <button className="btn btn-ghost btn-sm" onClick={() => onOpen(req.id)}>View / reply</button>
            </div>
          </div>
        ))
      ) : (
        <div className="empty">
          <h3>No open requests</h3>
          <p>Be the first to ask for notes, papers, or a manual you're missing.</p>
          <button className="btn btn-primary" onClick={onAddRequest}>+ Post a request</button>
        </div>
      )}
    </>
  );
}
