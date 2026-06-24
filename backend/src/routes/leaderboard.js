// src/routes/leaderboard.js
//
// GET /api/leaderboard
// Ranks contributors by number of resources uploaded, then by total
// helpful votes those resources have received. Computed on the fly from
// the resources list rather than stored separately, so it's always
// accurate and there's nothing extra to keep in sync.

import { Router } from 'express';
import { db } from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  await db.read();

  const totals = {}; // name -> { uploads, upvotes }
  for (const resource of db.data.resources) {
    const entry = totals[resource.uploaderName] || { name: resource.uploaderName, uploads: 0, upvotes: 0 };
    entry.uploads += 1;
    entry.upvotes += resource.upvotes.length;
    totals[resource.uploaderName] = entry;
  }

  const rows = Object.values(totals).sort((a, b) => b.uploads - a.uploads || b.upvotes - a.upvotes);
  res.json({ leaderboard: rows });
});

export default router;
