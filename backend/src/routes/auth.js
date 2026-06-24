// src/routes/auth.js
//
// Three endpoints:
//   POST /api/auth/register   create an account, get back a login token
//   POST /api/auth/login      log in to an existing account, get a token
//   GET  /api/auth/me         "who am I?" — used to restore a session on page load

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser, missingFields } from '../utils/helpers.js';
import { recordEvent } from '../events.js';

const router = Router();

function signToken(user) {
  // The token just carries id + name — enough to identify the user on
  // later requests. It expires after 30 days, so people don't get logged
  // out mid-semester but also aren't logged in forever on a shared computer.
  return jwt.sign({ id: user.id, name: user.name }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
}

// Decides whether a newly-registering user should be an admin:
//  - the very first account ever created always becomes an admin, so
//    there's always at least one person who can see the dashboard
//  - any name listed in the ADMIN_NAMES env var (comma-separated) also
//    becomes an admin on registration — handy for adding a professor/TA
function shouldBeAdmin(name) {
  if (db.data.users.length === 0) return true;
  const adminNames = (process.env.ADMIN_NAMES || '')
    .split(',')
    .map(n => n.trim().toLowerCase())
    .filter(Boolean);
  return adminNames.includes(name.toLowerCase());
}

router.post('/register', async (req, res) => {
  const error = missingFields(req.body, ['name', 'password']);
  if (error) return res.status(400).json({ error });

  const name = req.body.name.trim();
  const { password, branch = '', semester = '' } = req.body;

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  await db.read();
  const existing = db.data.users.find(u => u.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'That name is already taken — try logging in instead, or pick a different name.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: crypto.randomUUID(),
    name,
    passwordHash,
    branch,
    semester,
    bookmarks: [],
    isAdmin: shouldBeAdmin(name),
    createdAt: new Date().toISOString()
  };
  db.data.users.push(user);
  recordEvent({ type: 'register', userId: user.id, userName: user.name });
  await db.write();

  const token = signToken(user);
  res.status(201).json({ token, user: publicUser(user) });
});

router.post('/login', async (req, res) => {
  const error = missingFields(req.body, ['name', 'password']);
  if (error) return res.status(400).json({ error });

  const name = req.body.name.trim();
  const { password } = req.body;

  await db.read();
  const user = db.data.users.find(u => u.name.toLowerCase() === name.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'No account with that name. Check the spelling, or register.' });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  recordEvent({ type: 'login', userId: user.id, userName: user.name });
  await db.write();

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  await db.read();
  const user = db.data.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Account no longer exists.' });
  res.json({ user: publicUser(user) });
});

export default router;
