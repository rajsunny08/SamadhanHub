const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, 'samadhanhub.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS problems (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'Normal',
  location TEXT,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS solutions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
CREATE INDEX IF NOT EXISTS idx_problems_category ON problems(category);
CREATE INDEX IF NOT EXISTS idx_solutions_problem ON solutions(problem_id);
`);

// Seed a starting point for the real visit counter so a brand-new install
// doesn't show "0" — every visit after this is a genuinely counted one.
db.prepare("INSERT OR IGNORE INTO counters (key, value) VALUES ('total_visits', 128)").run();

// Seed from data/site.json on first run so the app (and preview mode) show the
// same sample content. Every seeded account uses the password: demo1234
const fs = require('fs');
const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (userCount === 0) {
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('demo1234', 10);
  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)');
  const userIds = {};
  const getUser = (name) => {
    if (!userIds[name]) {
      const email = name.toLowerCase().replace(/[^a-z0-9]+/g, '.') + '@samadhanhub.com';
      userIds[name] = insertUser.run(name, email === 'demo.user@samadhanhub.com' ? 'demo@samadhanhub.com' : email, hash).lastInsertRowid;
    }
    return userIds[name];
  };
  getUser('Demo User');

  let sample = [];
  try {
    sample = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'site.json'), 'utf8')).sample_problems || [];
  } catch (e) { console.warn('Could not read data/site.json for seeding:', e.message); }

  const insertProblem = db.prepare(`INSERT INTO problems (user_id, title, description, category, urgency, location, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertSolution = db.prepare('INSERT INTO solutions (problem_id, user_id, content, created_at) VALUES (?, ?, ?, ?)');
  const fmt = (iso) => iso.replace('T', ' ').replace('Z', '');

  sample.sort((a, b) => a.id - b.id).forEach((p) => {
    const pid = insertProblem.run(getUser(p.author), p.title, p.description, p.category, p.urgency, p.location, p.status, fmt(p.created_at)).lastInsertRowid;
    (p.solutions || []).forEach((s) => insertSolution.run(pid, getUser(s.author), s.content, fmt(s.created_at)));
  });
}

module.exports = db;
