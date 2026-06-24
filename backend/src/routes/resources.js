// src/routes/resources.js
//
// Everything to do with study material itself.
//   GET    /api/resources              list, with ?search=&branch=&semester=&type=&sort=
//   POST   /api/resources              create a new resource               (logged in)
//   GET    /api/resources/:id          view one (also increments its view count)
//   DELETE /api/resources/:id          delete (only the uploader can)      (logged in)
//   POST   /api/resources/:id/upvote   toggle "helpful" vote               (logged in)
//   POST   /api/resources/:id/comments add a comment                       (logged in)

import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { missingFields, isValidUrl } from '../utils/helpers.js';
import { recordEvent } from '../events.js';

const router = Router();

router.get('/', async (req, res) => {
  await db.read();
  let list = [...db.data.resources];

  const { search, branch, semester, type, sort } = req.query;

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.subject.toLowerCase().includes(q) ||
      (r.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  if (branch) list = list.filter(r => r.branch === branch);
  if (semester) list = list.filter(r => r.semester === semester);
  if (type) list = list.filter(r => r.type === type);

  if (sort === 'oldest') list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  else if (sort === 'upvoted') list.sort((a, b) => b.upvotes.length - a.upvotes.length);
  else if (sort === 'viewed') list.sort((a, b) => b.views - a.views);
  else list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // newest first, default

  res.json({ resources: list });
});

router.post('/', requireAuth, async (req, res) => {
  const error = missingFields(req.body, ['title', 'subject', 'description', 'branch', 'semester', 'type']);
  if (error) return res.status(400).json({ error });

  const { title, subject, description, branch, semester, type, content = '', link = '', tags = [] } = req.body;

  if (!content.trim() && !link.trim()) {
    return res.status(400).json({ error: 'Add either pasted notes or an external link.' });
  }
  if (link.trim() && !isValidUrl(link.trim())) {
    return res.status(400).json({ error: 'That link doesn\'t look valid — it should start with http:// or https://' });
  }

  await db.read();
  const resource = {
    id: crypto.randomUUID(),
    title: title.trim(),
    subject: subject.trim(),
    branch,
    semester,
    type,
    description: description.trim(),
    content: content.trim(),
    link: link.trim(),
    tags: Array.isArray(tags) ? tags.slice(0, 8) : [],
    uploaderId: req.user.id,
    uploaderName: req.user.name,
    createdAt: new Date().toISOString(),
    views: 0,
    upvotes: [],
    comments: []
  };
  db.data.resources.unshift(resource);
  recordEvent({ type: 'create_resource', userId: req.user.id, userName: req.user.name, targetType: 'resource', targetId: resource.id, targetLabel: resource.title });
  await db.write();

  res.status(201).json({ resource });
});

router.get('/:id', optionalAuth, async (req, res) => {
  await db.read();
  const resource = db.data.resources.find(r => r.id === req.params.id);
  if (!resource) return res.status(404).json({ error: 'Resource not found.' });

  resource.views += 1;
  recordEvent({
    type: 'view_resource',
    userId: req.user?.id || null,
    userName: req.user?.name || 'Guest',
    targetType: 'resource',
    targetId: resource.id,
    targetLabel: resource.title
  });
  await db.write();

  res.json({ resource });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await db.read();
  const resource = db.data.resources.find(r => r.id === req.params.id);
  if (!resource) return res.status(404).json({ error: 'Resource not found.' });
  if (resource.uploaderId !== req.user.id) {
    return res.status(403).json({ error: 'Only the person who uploaded this can delete it.' });
  }

  db.data.resources = db.data.resources.filter(r => r.id !== req.params.id);
  recordEvent({ type: 'delete_resource', userId: req.user.id, userName: req.user.name, targetType: 'resource', targetId: resource.id, targetLabel: resource.title });
  await db.write();

  res.json({ ok: true });
});

router.post('/:id/upvote', requireAuth, async (req, res) => {
  await db.read();
  const resource = db.data.resources.find(r => r.id === req.params.id);
  if (!resource) return res.status(404).json({ error: 'Resource not found.' });

  const i = resource.upvotes.indexOf(req.user.id);
  const wasAdded = i < 0;
  if (i >= 0) resource.upvotes.splice(i, 1);
  else resource.upvotes.push(req.user.id);

  if (wasAdded) {
    recordEvent({ type: 'upvote_resource', userId: req.user.id, userName: req.user.name, targetType: 'resource', targetId: resource.id, targetLabel: resource.title });
  }
  await db.write();
  res.json({ resource });
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const error = missingFields(req.body, ['text']);
  if (error) return res.status(400).json({ error });

  await db.read();
  const resource = db.data.resources.find(r => r.id === req.params.id);
  if (!resource) return res.status(404).json({ error: 'Resource not found.' });

  const comment = {
    id: crypto.randomUUID(),
    authorId: req.user.id,
    authorName: req.user.name,
    text: req.body.text.trim(),
    createdAt: new Date().toISOString()
  };
  resource.comments.push(comment);
  recordEvent({ type: 'comment_resource', userId: req.user.id, userName: req.user.name, targetType: 'resource', targetId: resource.id, targetLabel: resource.title });
  await db.write();

  res.status(201).json({ resource });
});

export default router;
