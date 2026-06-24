// src/middleware/auth.js
//
// Protects routes that require a logged-in user. The frontend sends the
// token it got back from /api/auth/login or /api/auth/register in an
// "Authorization: Bearer <token>" header on every request that needs it.

import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'You need to be logged in to do that.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Your session has expired — please log in again.' });
  }
}

// Like requireAuth, but doesn't fail the request if there's no token —
// just leaves req.user undefined. Used on routes like GET /resources/:id
// where logged-out visitors can still view things, but logged-in visitors
// get a slightly different response (e.g. knowing if they've bookmarked it).
export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      // invalid/expired token on an optional route — just treat as logged out
    }
  }
  next();
}

// Same as requireAuth, but additionally checks the user's isAdmin flag in
// the database (the token itself doesn't carry that, so we look it up).
export async function requireAdmin(req, res, next) {
  requireAuth(req, res, async () => {
    await db.read();
    const user = db.data.users.find(u => u.id === req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access only.' });
    }
    next();
  });
}
