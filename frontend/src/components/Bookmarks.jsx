// src/components/Bookmarks.jsx
import ResourceCard from './ResourceCard';

export default function Bookmarks({ resources, loading, currentUserId, bookmarkedIds, onOpen, onToggleBookmark, onUpvote, loggedIn, onOpenAuth }) {
  if (!loggedIn) {
    return (
      <div className="empty">
        <h3>Log in to see your bookmarks</h3>
        <p>Bookmarks are saved to your account so they follow you between devices.</p>
        <button className="btn btn-primary" onClick={onOpenAuth}>Log in / register</button>
      </div>
    );
  }

  return (
    <>
      <h3 style={{ fontSize: 15, margin: '4px 0 12px' }}>Your saved resources</h3>
      {loading ? (
        <div className="loading"><span className="skel" />Loading your bookmarks…</div>
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
          <h3>Nothing saved yet</h3>
          <p>Tap the ☆ on any resource to save it here for quick access later.</p>
        </div>
      )}
    </>
  );
}
