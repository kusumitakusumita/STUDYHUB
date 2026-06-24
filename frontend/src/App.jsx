// src/App.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from './api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

import TitleBlock from './components/TitleBlock';
import Tabs from './components/Tabs';
import Browse from './components/Browse';
import Requests from './components/Requests';
import Leaderboard from './components/Leaderboard';
import Bookmarks from './components/Bookmarks';
import MyUploads from './components/MyUploads';
import AdminDashboard from './components/AdminDashboard';

import AuthModal from './components/AuthModal';
import AddResourceModal from './components/AddResourceModal';
import ResourceDetailModal from './components/ResourceDetailModal';
import AddRequestModal from './components/AddRequestModal';
import RequestDetailModal from './components/RequestDetailModal';

export default function App() {
  const { user, ready } = useAuth();
  const showToast = useToast();

  const [theme, setTheme] = useState(() => localStorage.getItem('studyhub_theme') || 'light');
  const [tab, setTab] = useState('browse');
  const [modal, setModal] = useState({ type: null, data: null });

  // Browse tab: filtered resources, re-fetched from the server whenever filters change
  const [filters, setFilters] = useState({ search: '', branch: '', semester: '', type: '', sort: 'newest' });
  const [resources, setResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(true);

  // The complete, unfiltered resource list — used for header stats and the
  // "My uploads" tab so we don't need extra round trips for those.
  const [allResources, setAllResources] = useState([]);

  // Requests board
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Leaderboard (always recomputed server-side on each visit)
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Bookmarks: kept at the App level (not just the Bookmarks tab) so the
  // star icon is correct on every card everywhere in the app.
  const [bookmarkedIds, setBookmarkedIds] = useState([]);
  const [bookmarkResources, setBookmarkResources] = useState([]);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('studyhub_theme', theme);
  }, [theme]);

  // ---------- initial load ----------
  useEffect(() => {
    api.listResources({}).then(({ resources }) => setAllResources(resources)).catch(() => {});
  }, []);

  const fetchResources = useCallback(async () => {
    setLoadingResources(true);
    try {
      const { resources } = await api.listResources(filters);
      setResources(resources);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoadingResources(false);
    }
  }, [filters, showToast]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  const fetchRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const { requests } = await api.listRequests();
      setRequests(requests);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoadingRequests(false);
    }
  }, [showToast]);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeaderboard(true);
    try {
      const { leaderboard } = await api.leaderboard();
      setLeaderboardRows(leaderboard);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoadingLeaderboard(false);
    }
  }, [showToast]);

  const fetchBookmarks = useCallback(async () => {
    if (!user) { setBookmarkedIds([]); setBookmarkResources([]); return; }
    setLoadingBookmarks(true);
    try {
      const data = await api.bookmarks();
      setBookmarkedIds(data.bookmarkedIds);
      setBookmarkResources(data.resources);
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setLoadingBookmarks(false);
    }
  }, [user, showToast]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  useEffect(() => {
    if (tab === 'requests' && requests.length === 0) fetchRequests();
    if (tab === 'leaderboard') fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // ---------- helpers shared by several handlers ----------
  function updateResourceEverywhere(resource) {
    setResources(prev => prev.map(r => (r.id === resource.id ? resource : r)));
    setAllResources(prev => prev.map(r => (r.id === resource.id ? resource : r)));
    setBookmarkResources(prev => prev.map(r => (r.id === resource.id ? resource : r)));
    setModal(prev => (prev.type === 'resourceDetail' && prev.data?.id === resource.id) ? { ...prev, data: resource } : prev);
  }
  function updateRequestEverywhere(request) {
    setRequests(prev => prev.map(r => (r.id === request.id ? request : r)));
    setModal(prev => (prev.type === 'requestDetail' && prev.data?.id === request.id) ? { ...prev, data: request } : prev);
  }
  function requireLogin(actionLabel) {
    if (!user) {
      showToast(`Log in to ${actionLabel}.`, true);
      setModal({ type: 'auth', data: null });
      return false;
    }
    return true;
  }
  function closeModal() { setModal({ type: null, data: null }); }

  // ---------- resource actions ----------
  async function openResource(id) {
    try {
      const { resource } = await api.getResource(id);
      setModal({ type: 'resourceDetail', data: resource });
    } catch (err) { showToast(err.message, true); }
  }
  async function createResource(payload) {
    try {
      const { resource } = await api.createResource(payload);
      setResources(prev => [resource, ...prev]);
      setAllResources(prev => [resource, ...prev]);
      closeModal();
      showToast('Resource published to the archive.');
    } catch (err) { showToast(err.message, true); }
  }
  async function deleteResource(id) {
    if (!window.confirm("Delete this resource for everyone? This can't be undone.")) return;
    try {
      await api.deleteResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
      setAllResources(prev => prev.filter(r => r.id !== id));
      setBookmarkResources(prev => prev.filter(r => r.id !== id));
      setBookmarkedIds(prev => prev.filter(rid => rid !== id));
      closeModal();
      showToast('Resource deleted.');
    } catch (err) { showToast(err.message, true); }
  }
  async function upvoteResource(id) {
    if (!requireLogin('mark a resource helpful')) return;
    try {
      const { resource } = await api.upvoteResource(id);
      updateResourceEverywhere(resource);
    } catch (err) { showToast(err.message, true); }
  }
  async function commentOnResource(id, text) {
    if (!requireLogin('comment')) return;
    try {
      const { resource } = await api.commentOnResource(id, text);
      updateResourceEverywhere(resource);
    } catch (err) { showToast(err.message, true); }
  }
  async function toggleBookmark(id) {
    if (!requireLogin('bookmark resources')) return;
    try {
      await api.toggleBookmark(id);
      fetchBookmarks();
    } catch (err) { showToast(err.message, true); }
  }

  // ---------- request board actions ----------
  async function openRequest(id) {
    try {
      const { request } = await api.getRequest(id);
      setModal({ type: 'requestDetail', data: request });
    } catch (err) { showToast(err.message, true); }
  }
  async function createRequest(payload) {
    try {
      const { request } = await api.createRequest(payload);
      setRequests(prev => [request, ...prev]);
      closeModal();
      showToast('Request posted.');
    } catch (err) { showToast(err.message, true); }
  }
  async function toggleFulfilled(id) {
    try {
      const { request } = await api.toggleFulfilled(id);
      updateRequestEverywhere(request);
    } catch (err) { showToast(err.message, true); }
  }
  async function commentOnRequest(id, text) {
    if (!requireLogin('reply')) return;
    try {
      const { request } = await api.commentOnRequest(id, text);
      updateRequestEverywhere(request);
    } catch (err) { showToast(err.message, true); }
  }
  async function deleteRequest(id) {
    if (!window.confirm('Delete this request?')) return;
    try {
      await api.deleteRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      closeModal();
      showToast('Request deleted.');
    } catch (err) { showToast(err.message, true); }
  }

  function openAddResourceModal() {
    if (!requireLogin('add a resource')) return;
    setModal({ type: 'addResource', data: null });
  }
  function openAddRequestModal() {
    if (!requireLogin('post a request')) return;
    setModal({ type: 'addRequest', data: null });
  }

  const stats = useMemo(() => ({
    totalResources: allResources.length,
    contributors: new Set(allResources.map(r => r.uploaderId)).size,
    branchesCovered: new Set(allResources.map(r => r.branch)).size
  }), [allResources]);

  const myResources = useMemo(
    () => (user ? allResources.filter(r => r.uploaderId === user.id) : []),
    [allResources, user]
  );

  if (!ready) {
    return <div className="loading"><span className="skel" />Starting up…</div>;
  }

  return (
    <div id="app">
      <TitleBlock
        stats={stats}
        theme={theme}
        onToggleTheme={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
        onOpenAuth={() => setModal({ type: 'auth', data: null })}
      />

      <Tabs tab={tab} onChange={setTab} onAddResource={openAddResourceModal} />

      <main>
        {tab === 'browse' && (
          <Browse
            resources={resources}
            loading={loadingResources}
            filters={filters}
            onFilterChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
            bookmarkedIds={bookmarkedIds}
            currentUserId={user?.id}
            onOpen={openResource}
            onToggleBookmark={toggleBookmark}
            onUpvote={upvoteResource}
            onAddResource={openAddResourceModal}
            stats={stats}
          />
        )}

        {tab === 'requests' && (
          <Requests requests={requests} loading={loadingRequests} onOpen={openRequest} onAddRequest={openAddRequestModal} />
        )}

        {tab === 'leaderboard' && (
          <Leaderboard rows={leaderboardRows} loading={loadingLeaderboard} />
        )}

        {tab === 'bookmarks' && (
          <Bookmarks
            resources={bookmarkResources}
            loading={loadingBookmarks}
            currentUserId={user?.id}
            bookmarkedIds={bookmarkedIds}
            onOpen={openResource}
            onToggleBookmark={toggleBookmark}
            onUpvote={upvoteResource}
            loggedIn={!!user}
            onOpenAuth={() => setModal({ type: 'auth', data: null })}
          />
        )}

        {tab === 'mine' && (
          <MyUploads
            resources={myResources}
            loading={false}
            currentUserId={user?.id}
            bookmarkedIds={bookmarkedIds}
            onOpen={openResource}
            onToggleBookmark={toggleBookmark}
            onUpvote={upvoteResource}
            onAddResource={openAddResourceModal}
            loggedIn={!!user}
            onOpenAuth={() => setModal({ type: 'auth', data: null })}
          />
        )}

        {tab === 'admin' && user?.isAdmin && (
          <AdminDashboard />
        )}
      </main>

      <footer className="sitefoot">
        STUDYHUB · A shared archive built by the class, for the class<br />
        Everyone who registers an account adds to and sees the same library.
      </footer>

      {modal.type === 'auth' && <AuthModal onClose={closeModal} />}
      {modal.type === 'addResource' && <AddResourceModal onClose={closeModal} onSubmit={createResource} />}
      {modal.type === 'resourceDetail' && (
        <ResourceDetailModal
          resource={modal.data}
          bookmarked={bookmarkedIds.includes(modal.data.id)}
          onClose={closeModal}
          onToggleBookmark={toggleBookmark}
          onUpvote={upvoteResource}
          onComment={commentOnResource}
          onDelete={deleteResource}
        />
      )}
      {modal.type === 'addRequest' && <AddRequestModal onClose={closeModal} onSubmit={createRequest} />}
      {modal.type === 'requestDetail' && (
        <RequestDetailModal
          request={modal.data}
          onClose={closeModal}
          onToggleFulfilled={toggleFulfilled}
          onComment={commentOnRequest}
          onDelete={deleteRequest}
        />
      )}
    </div>
  );
}
