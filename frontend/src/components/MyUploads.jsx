// src/components/MyUploads.jsx
import ResourceCard from './ResourceCard';

export default function MyUploads({ resources, loading, currentUserId, bookmarkedIds, onOpen, onToggleBookmark, onUpvote, onAddResource, loggedIn, onOpenAuth }) {
  if (!loggedIn) {
    return (
      <div className="empty">
        <h3>Log in to see your uploads</h3>
        <p>So we know which resources are yours.</p>
        <button className="btn btn-primary" onClick={onOpenAuth}>Log in / register</button>
      </div>
    );
  }

  return (
    <>
      <h3 style={{ fontSize: 15, margin: '4px 0 12px' }}>Resources you've shared</h3>
      {loading ? (
        <div className="loading"><span className="skel" />Loading…</div>
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
          <h3>You haven't shared anything yet</h3>
          <p>Your notes might be exactly what a classmate needs.</p>
          <button className="btn btn-primary" onClick={onAddResource}>+ Add your first resource</button>
        </div>
      )}
    </>
  );
}
