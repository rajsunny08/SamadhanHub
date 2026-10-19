const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();
const CATEGORIES = ['Education', 'Technology', 'Career', 'Business', 'Daily Life', 'Community', 'Other'];
const URGENCIES = ['Normal', 'Important', 'Urgent'];
const STATUSES = ['OPEN', 'IN PROGRESS', 'SOLVED'];

// GET /api/problems?search=&category=&status=&limit=
router.get('/', (req, res) => {
  const { search, category, status, limit } = req.query;
  let sql = `
    SELECT p.*, u.name AS author_name,
      (SELECT COUNT(*) FROM solutions s WHERE s.problem_id = p.id) AS solution_count
    FROM problems p JOIN users u ON u.id = p.user_id
    WHERE 1=1`;
  const params = [];

  if (search && search.trim()) {
    sql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }
  if (category && CATEGORIES.includes(category)) {
    sql += ' AND p.category = ?';
    params.push(category);
  }
  if (status && STATUSES.includes(status)) {
    sql += ' AND p.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY p.created_at DESC';
  if (limit && Number.isFinite(Number(limit))) {
    sql += ' LIMIT ?';
    params.push(Math.min(Number(limit), 100));
  }

  res.json(db.prepare(sql).all(...params));
});

// GET /api/problems/:id  (with author + solutions)
router.get('/:id', (req, res) => {
  const problem = db.prepare(`
    SELECT p.*, u.name AS author_name FROM problems p JOIN users u ON u.id = p.user_id WHERE p.id = ?
  `).get(req.params.id);
  if (!problem) return res.status(404).json({ error: 'Problem not found.' });

  problem.solutions = db.prepare(`
    SELECT s.*, u.name AS author_name FROM solutions s JOIN users u ON u.id = s.user_id
    WHERE s.problem_id = ? ORDER BY s.created_at ASC
  `).all(req.params.id);

  res.json(problem);
});

// POST /api/problems
router.post('/', requireAuth, (req, res) => {
  const { title, description, category, urgency, location, image } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required.' });
  if (!description || !description.trim()) return res.status(400).json({ error: 'Description is required.' });
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Choose a valid category.' });
  const finalUrgency = URGENCIES.includes(urgency) ? urgency : 'Normal';

  const result = db.prepare(`
    INSERT INTO problems (user_id, title, description, category, urgency, location, image)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, title.trim(), description.trim(), category, finalUrgency, location || null, image || null);

  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(problem);
});

// PATCH /api/problems/:id/status  (owner only)
router.patch('/:id/status', requireAuth, (req, res) => {
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(req.params.id);
  if (!problem) return res.status(404).json({ error: 'Problem not found.' });
  if (problem.user_id !== req.user.id) return res.status(403).json({ error: 'Only the author can update the status.' });

  db.prepare('UPDATE problems SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// DELETE /api/problems/:id  (owner only)
router.delete('/:id', requireAuth, (req, res) => {
  const problem = db.prepare('SELECT * FROM problems WHERE id = ?').get(req.params.id);
  if (!problem) return res.status(404).json({ error: 'Problem not found.' });
  if (problem.user_id !== req.user.id) return res.status(403).json({ error: 'Only the author can delete this problem.' });

  db.prepare('DELETE FROM problems WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/problems/:id/solutions
router.post('/:id/solutions', requireAuth, (req, res) => {
  const { content } = req.body || {};
  if (!content || !content.trim()) return res.status(400).json({ error: 'Solution text is required.' });

  const problem = db.prepare('SELECT id FROM problems WHERE id = ?').get(req.params.id);
  if (!problem) return res.status(404).json({ error: 'Problem not found.' });

  const result = db.prepare('INSERT INTO solutions (problem_id, user_id, content) VALUES (?, ?, ?)')
    .run(req.params.id, req.user.id, content.trim());
  const solution = db.prepare(`
    SELECT s.*, u.name AS author_name FROM solutions s JOIN users u ON u.id = s.user_id WHERE s.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(solution);
});

module.exports = router;
