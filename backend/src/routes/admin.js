// src/routes/admin.js
//
// Everything here is protected by requireAdmin — only accounts with
// isAdmin: true (see auth.js's shouldBeAdmin) can call these.
//
//   GET /api/admin/stats   summary numbers + small time series for charts
//   GET /api/admin/users   every user, with their own activity counts
//   GET /api/admin/events  raw activity feed, newest first, optionally filtered

import { Router } from 'express';
import { db } from '../db.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();
router.use(requireAdmin);

// Builds an array of the last `days` calendar dates as 'YYYY-MM-DD'
// strings, oldest first — used so charts always show a full, even time
// range instead of skipping days with zero activity.
function lastNDays(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

router.get('/stats', async (req, res) => {
  await db.read();
  const { users, resources, requests, events } = db.data;

  const days = lastNDays(14);

  const signupsByDay = Object.fromEntries(days.map(d => [d, 0]));
  for (const u of users) {
    const day = u.createdAt.slice(0, 10);
    if (day in signupsByDay) signupsByDay[day] += 1;
  }

  const activityByDay = Object.fromEntries(days.map(d => [d, 0]));
  for (const e of events) {
    const day = e.createdAt.slice(0, 10);
    if (day in activityByDay) activityByDay[day] += 1;
  }

  const sevenDaysAgo = Date.now() - 7 * 86400000;
  const recentEvents7d = events.filter(e => new Date(e.createdAt).getTime() >= sevenDaysAgo);
  const activeUsers7d = new Set(recentEvents7d.filter(e => e.userId).map(e => e.userId)).size;

  const activityCountByUser = {};
  for (const e of events) {
    if (!e.userId) continue;
    activityCountByUser[e.userName] = (activityCountByUser[e.userName] || 0) + 1;
  }
  const topActiveUsers = Object.entries(activityCountByUser)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const eventCountsByType = {};
  for (const e of events) {
    eventCountsByType[e.type] = (eventCountsByType[e.type] || 0) + 1;
  }

  const mostViewedResources = [...resources]
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map(r => ({ id: r.id, title: r.title, views: r.views }));

  res.json({
    totals: {
      users: users.length,
      resources: resources.length,
      requests: requests.length,
      openRequests: requests.filter(r => !r.fulfilled).length,
      totalViews: resources.reduce((sum, r) => sum + r.views, 0),
      activeUsers7d
    },
    signupsByDay,
    activityByDay,
    topActiveUsers,
    eventCountsByType,
    mostViewedResources
  });
});

router.get('/users', async (req, res) => {
  await db.read();
  const { users, resources, events } = db.data;

  const rows = users.map(u => {
    const userEvents = events.filter(e => e.userId === u.id);
    const lastEvent = userEvents[userEvents.length - 1];
    return {
      id: u.id,
      name: u.name,
      branch: u.branch,
      semester: u.semester,
      isAdmin: !!u.isAdmin,
      createdAt: u.createdAt,
      resourceCount: resources.filter(r => r.uploaderId === u.id).length,
      bookmarkCount: u.bookmarks.length,
      eventCount: userEvents.length,
      lastActiveAt: lastEvent ? lastEvent.createdAt : null
    };
  }).sort((a, b) => new Date(b.lastActiveAt || 0) - new Date(a.lastActiveAt || 0));

  res.json({ users: rows });
});

router.get('/events', async (req, res) => {
  await db.read();
  let list = [...db.data.events].reverse(); // newest first

  const { type, userId, limit } = req.query;
  if (type) list = list.filter(e => e.type === type);
  if (userId) list = list.filter(e => e.userId === userId);

  const max = Math.min(parseInt(limit, 10) || 50, 500);
  res.json({ events: list.slice(0, max) });
});

export default router;
