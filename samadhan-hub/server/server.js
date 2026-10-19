require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const problemRoutes = require('./routes/problems');
const miscRoutes = require('./routes/misc');
const chatRoutes = require('./routes/chat');
const presenceRoutes = require('./routes/presence');

const app = express();
const PORT = process.env.PORT || 4000;

app.set('trust proxy', 1);

// The packaged mobile app (Capacitor) calls this server from a different
// origin than a browser visiting the website directly, so it needs CORS.
// Default allow-list covers Capacitor's standard WebView origins; add your
// own deployed web domains via ALLOWED_ORIGINS in .env (comma-separated)
// if you also host the frontend separately from this server.
const DEFAULT_APP_ORIGINS = ['capacitor://localhost', 'http://localhost', 'https://localhost', 'ionic://localhost'];
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const ALLOWED_ORIGINS = [...DEFAULT_APP_ORIGINS, ...EXTRA_ORIGINS];
app.use(cors({
  origin(origin, cb) {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '1mb' }));

// ---- API ----
app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api', miscRoutes); // /api/profile, /api/stats

// ---- static frontend (the folder one level up: index.html, css/, js/) ----
const FRONTEND_DIR = path.join(__dirname, '..');
app.use(express.static(FRONTEND_DIR));

// Fallback 404 for unknown /api/* routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// Fallback 404 page for any other unmatched route
app.use((req, res) => res.status(404).sendFile(path.join(FRONTEND_DIR, '404.html')));

// Centralized error handler
app.use((err, req, res, next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'This origin is not allowed to call the API.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`SamadhanHub running at http://localhost:${PORT}`);
  console.log(`Demo login: demo@samadhanhub.com / demo1234`);
});
