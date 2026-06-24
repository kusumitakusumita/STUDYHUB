// src/routes/bookmarks.js
//
// A user's personal "saved for later" list, stored as an array of
// resource IDs on their user record.
//   GET  /api/bookmarks               the current user's bookmarked resources (logged in)
//   POST /api/bookmarks/:resourceId   toggle a bookmark on/off               (logged in)

import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { recordEvent } from '../events.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  const resources = db.data.resources.filter(r => user.bookmarks.includes(r.id));
  res.json({ resources, bookmarkedIds: user.bookmarks });
});

router.post('/:resourceId', requireAuth, async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Account not found.' });

  const i = user.bookmarks.indexOf(req.params.resourceId);
  const wasAdded = i < 0;
  if (i >= 0) user.bookmarks.splice(i, 1);
  else user.bookmarks.push(req.params.resourceId);

  if (wasAdded) {
    const resource = db.data.resources.find(r => r.id === req.params.resourceId);
    recordEvent({ type: 'bookmark_resource', userId: user.id, userName: user.name, targetType: 'resource', targetId: req.params.resourceId, targetLabel: resource?.title || null });
  }
  await db.write();
  res.json({ bookmarkedIds: user.bookmarks });
});

export default router;
