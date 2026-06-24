// src/routes/requests.js
//
// The "can't find something? ask the class" board.
//   GET    /api/requests                list all requests
//   POST   /api/requests                post a new request                (logged in)
//   GET    /api/requests/:id            view one
//   PATCH  /api/requests/:id/fulfilled  toggle open/fulfilled              (logged in)
//   POST   /api/requests/:id/comments   reply to a request                 (logged in)
//   DELETE /api/requests/:id            delete (only the requester can)    (logged in)

import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { missingFields } from '../utils/helpers.js';
import { recordEvent } from '../events.js';

const router = Router();

router.get('/', async (req, res) => {
  await db.read();
  const list = [...db.data.requests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ requests: list });
});

router.post('/', requireAuth, async (req, res) => {
  const error = missingFields(req.body, ['title', 'branch', 'semester', 'subject']);
  if (error) return res.status(400).json({ error });

  const { title, branch, semester, subject, description = '' } = req.body;

  await db.read();
  const request = {
    id: crypto.randomUUID(),
    title: title.trim(),
    branch,
    semester,
    subject: subject.trim(),
    description: description.trim(),
    requesterId: req.user.id,
    requesterName: req.user.name,
    createdAt: new Date().toISOString(),
    fulfilled: false,
    comments: []
  };
  db.data.requests.unshift(request);
  recordEvent({ type: 'create_request', userId: req.user.id, userName: req.user.name, targetType: 'request', targetId: request.id, targetLabel: request.title });
  await db.write();

  res.status(201).json({ request });
});

router.get('/:id', async (req, res) => {
  await db.read();
  const request = db.data.requests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  res.json({ request });
});

router.patch('/:id/fulfilled', requireAuth, async (req, res) => {
  await db.read();
  const request = db.data.requests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found.' });

  request.fulfilled = !request.fulfilled;
  recordEvent({ type: request.fulfilled ? 'fulfill_request' : 'reopen_request', userId: req.user.id, userName: req.user.name, targetType: 'request', targetId: request.id, targetLabel: request.title });
  await db.write();
  res.json({ request });
});

router.post('/:id/comments', requireAuth, async (req, res) => {
  const error = missingFields(req.body, ['text']);
  if (error) return res.status(400).json({ error });

  await db.read();
  const request = db.data.requests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found.' });

  request.comments.push({
    id: crypto.randomUUID(),
    authorId: req.user.id,
    authorName: req.user.name,
    text: req.body.text.trim(),
    createdAt: new Date().toISOString()
  });
  recordEvent({ type: 'comment_request', userId: req.user.id, userName: req.user.name, targetType: 'request', targetId: request.id, targetLabel: request.title });
  await db.write();

  res.status(201).json({ request });
});

router.delete('/:id', requireAuth, async (req, res) => {
  await db.read();
  const request = db.data.requests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found.' });
  if (request.requesterId !== req.user.id) {
    return res.status(403).json({ error: 'Only the person who posted this can delete it.' });
  }

  db.data.requests = db.data.requests.filter(r => r.id !== req.params.id);
  recordEvent({ type: 'delete_request', userId: req.user.id, userName: req.user.name, targetType: 'request', targetId: request.id, targetLabel: request.title });
  await db.write();
  res.json({ ok: true });
});

export default router;
