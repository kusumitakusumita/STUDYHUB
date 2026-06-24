// server.js
//
// Entry point. Loads environment variables, sets up Express, wires up
// the four route groups, and starts listening.

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { initDb } from './src/db.js';
import authRoutes from './src/routes/auth.js';
import resourceRoutes from './src/routes/resources.js';
import requestRoutes from './src/routes/requests.js';
import leaderboardRoutes from './src/routes/leaderboard.js';
import bookmarkRoutes from './src/routes/bookmarks.js';
import adminRoutes from './src/routes/admin.js';
import uploadRoutes from './src/routes/upload.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*' }));
app.use(express.json());

// A simple request log — handy while developing, shows method + path + status.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// Catch-all for unknown API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Anything that reaches here without matching a route above is a real error.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 4000;

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`StudyHub API running at http://localhost:${PORT}`);
  });
});
