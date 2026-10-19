const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/profile — current user + their problems + solutions-given count
router.get('/profile', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const problems = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM solutions s WHERE s.problem_id = p.id) AS solution_count
    FROM problems p WHERE p.user_id = ? ORDER BY p.created_at DESC
  `).all(user.id);

  user.solutions_given = db.prepare('SELECT COUNT(*) AS n FROM solutions WHERE user_id = ?').get(user.id).n;

  res.json({ user, problems });
});

// GET /api/stats — homepage counters
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) AS n FROM problems').get().n;
  const solved = db.prepare("SELECT COUNT(*) AS n FROM problems WHERE status = 'SOLVED'").get().n;
  const solutions = db.prepare('SELECT COUNT(*) AS n FROM solutions').get().n;
  res.json({ total, solved, solutions });
});

// GET /api/leaderboard — top helpers, ranked by solutions given (tie-break: problems posted)
router.get('/leaderboard', (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.created_at,
      (SELECT COUNT(*) FROM solutions s WHERE s.user_id = u.id) AS solutions_given,
      (SELECT COUNT(*) FROM problems p WHERE p.user_id = u.id) AS problems_posted,
      (SELECT COUNT(*) FROM problems p WHERE p.user_id = u.id AND p.status = 'SOLVED') AS problems_solved
    FROM users u
    ORDER BY solutions_given DESC, problems_posted DESC
    LIMIT 20
  `).all();
  res.json(rows.filter(r => r.solutions_given > 0 || r.problems_posted > 0));
});

module.exports = router;
