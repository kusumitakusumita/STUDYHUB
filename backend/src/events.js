// src/events.js
//
// Every meaningful action in the app (logging in, uploading, commenting,
// upvoting, viewing a resource, etc.) gets recorded as one small "event"
// object. This is what powers the admin dashboard's activity feed and
// stats — it's deliberately just an array on the same db.json file, not a
// separate analytics system, so it's easy to read and reason about.
//
// Call recordEvent(...) from a route, then call db.write() as you
// normally would (most routes already write after the change that
// triggered the event, so this usually doesn't add an extra write).

import { db } from './db.js';

const MAX_EVENTS = 5000; // keep db.json from growing forever

export function recordEvent({ type, userId, userName, targetType = null, targetId = null, targetLabel = null }) {
  db.data.events ||= [];
  db.data.events.push({
    id: crypto.randomUUID(),
    type,            // 'login' | 'register' | 'view_resource' | 'create_resource' | ...
    userId,
    userName,
    targetType,       // 'resource' | 'request' | null
    targetId,
    targetLabel,      // human-readable label, e.g. the resource title, for the activity feed
    createdAt: new Date().toISOString()
  });

  if (db.data.events.length > MAX_EVENTS) {
    db.data.events = db.data.events.slice(-MAX_EVENTS);
  }
}
