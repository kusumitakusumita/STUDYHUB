// src/db.js
//
// This is the entire "database" for StudyHub: a single JSON file on disk
// (db.json) read into memory and written back out after every change.
// lowdb just gives us a tiny, readable wrapper around that read/write cycle.
//
// Why a JSON file instead of Postgres/MongoDB? For a class-sized project
// (tens to a few hundred resources) this is plenty fast, has zero setup,
// and — most importantly — it's easy to open db.json yourself and see
// exactly what's stored. If this ever needs to scale to a whole university,
// swap this file for a real database client; every route file only talks
// to the small set of functions exported here, so that's the only file
// you'd need to change.

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbFile = path.join(__dirname, '..', 'db.json');

const defaultData = {
  users: [],       // { id, name, passwordHash, branch, semester, bookmarks: [resourceId], isAdmin, createdAt }
  resources: [],    // { id, title, branch, semester, subject, type, description, content, link, tags, uploaderId, uploaderName, createdAt, views, upvotes: [userId], comments: [...] }
  requests: [],     // { id, title, branch, semester, subject, description, requesterId, requesterName, createdAt, fulfilled, comments: [...] }
  events: []        // { id, type, userId, userName, targetType, targetId, targetLabel, createdAt } — activity log for the admin dashboard
};

const adapter = new JSONFile(dbFile);
export const db = new Low(adapter, defaultData);

// Call this once when the server starts.
export async function initDb() {
  await db.read();
  db.data ||= structuredClone(defaultData);

  // If this db.json was created by an older version of the app, it won't
  // have an `events` array yet — add it without touching anything else.
  db.data.events ||= [];
  db.data.users ||= [];
  db.data.resources ||= [];
  db.data.requests ||= [];

  // Seed a few example resources the very first time the database is
  // created, so the site isn't empty on first run. Only happens if
  // db.json didn't exist yet (db.data.resources will be [] in that case
  // AND there will be no users — an empty db someone has actually used
  // would still have an empty resources list but at least one user/request,
  // so we only seed on a totally fresh database).
  const isFreshDatabase =
    db.data.users.length === 0 &&
    db.data.resources.length === 0 &&
    db.data.requests.length === 0;

  if (isFreshDatabase) {
    db.data.resources = seedResources();
    await db.write();
  }
}

function seedResources() {
  const now = Date.now();
  const day = 86400000;
  return [
    {
      id: crypto.randomUUID(),
      title: 'Engineering Mathematics III — Laplace Transform Notes',
      branch: 'Computer Science',
      semester: '3',
      subject: 'Engineering Mathematics III',
      type: 'NOTES',
      description: 'Concise notes covering Laplace transforms, inverse transforms, and applications to solving ODEs.',
      content: 'Unit 1 — Laplace Transforms\n- Definition and existence conditions\n- Standard transform pairs\n- Properties: linearity, shifting, scaling\n\nUnit 2 — Inverse Laplace Transforms\n- Partial fractions method\n- Convolution theorem\n\nTip: memorise the standard pairs table first.',
      link: '',
      tags: ['maths', 'laplace', 'semester3'],
      uploaderId: 'seed',
      uploaderName: 'StudyHub Team',
      createdAt: new Date(now - 6 * day).toISOString(),
      views: 14,
      upvotes: [],
      comments: []
    },
    {
      id: crypto.randomUUID(),
      title: 'Digital Electronics — Last 5 Years Question Papers',
      branch: 'Electronics & Communication',
      semester: '4',
      subject: 'Digital Electronics',
      type: 'PYQ',
      description: 'Compiled previous year papers with recurring question patterns highlighted.',
      content: 'Recurring topics across the last 5 years:\n- Karnaugh maps\n- Flip-flop conversions\n- Counter design (mod-N counters)\n- Number system conversions',
      link: '',
      tags: ['digital-electronics', 'pyq', 'exam-prep'],
      uploaderId: 'seed',
      uploaderName: 'StudyHub Team',
      createdAt: new Date(now - 10 * day).toISOString(),
      views: 31,
      upvotes: [],
      comments: []
    },
    {
      id: crypto.randomUUID(),
      title: 'Fluid Mechanics Lab Manual — All Experiments',
      branch: 'Mechanical',
      semester: '4',
      subject: 'Fluid Mechanics',
      type: 'LAB',
      description: 'Step-by-step procedure, observation tables, and sample calculations for all 8 lab experiments.',
      content: 'Includes:\n1. Verification of Bernoulli\'s theorem\n2. Flow through Venturimeter\n3. Flow through Orificemeter\n4. Reynolds number apparatus\n5. Pipe friction losses\n6. Notch calibration',
      link: '',
      tags: ['fluid-mechanics', 'lab', 'mechanical'],
      uploaderId: 'seed',
      uploaderName: 'StudyHub Team',
      createdAt: new Date(now - 2 * day).toISOString(),
      views: 9,
      upvotes: [],
      comments: []
    }
  ];
}
