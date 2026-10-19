const express = require('express');
const db = require('../db');

const router = express.Router();

// ---- "online now" — in-memory heartbeat, no DB needed for this part ----
// A visitor counts as online if we've heard from their tab in the last 45s.
const ONLINE_WINDOW_MS = 45 * 1000;
const lastSeen = new Map(); // sessionId -> timestamp

function onlineCount() {
  const cutoff = Date.now() - ONLINE_WINDOW_MS;
  for (const [id, t] of lastSeen) if (t < cutoff) lastSeen.delete(id);
  return lastSeen.size;
}

// ---- "total visits" — real, persistent, counted once per browser session ----
const countedSessions = new Set(); // resets on server restart, same as online tracking
const getVisits = db.prepare("SELECT value FROM counters WHERE key = 'total_visits'");
const bumpVisits = db.prepare("UPDATE counters SET value = value + 1 WHERE key = 'total_visits'");

router.get('/', (req, res) => {
  res.json({ online: onlineCount(), totalVisits: getVisits.get().value });
});

// Called on every open tab every ~20s to say "still here".
router.post('/ping', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return res.status(400).json({ error: 'Invalid session id.' });
  }
  lastSeen.set(sessionId, Date.now());
  res.json({ online: onlineCount() });
});

// Called once per new browser session (guarded client-side) to count a real visit.
router.post('/visit', (req, res) => {
  const { sessionId } = req.body || {};
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 100) {
    return res.status(400).json({ error: 'Invalid session id.' });
  }
  if (!countedSessions.has(sessionId)) {
    countedSessions.add(sessionId);
    bumpVisits.run();
  }
  lastSeen.set(sessionId, Date.now());
  res.json({ totalVisits: getVisits.get().value, online: onlineCount() });
});

module.exports = router;
