// Copies the website's static frontend (HTML/CSS/JS/images/manifest) into
// mobile/www/, which is what Capacitor bundles into the Android/iOS app.
// Run this (via `npm run sync-web`, or `npm run sync` to also run `cap sync`)
// every time you change the frontend and want the native app to pick it up.
//
// server/ is intentionally NOT copied — Capacitor apps don't run a Node
// backend on the device. The app calls your deployed backend's API instead
// (see PRODUCTION_API_URL in js/app.js and the publishing guide).

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEST = path.join(__dirname, 'www');

const COPY_DIRS = ['css', 'js', 'images', 'data'];
const COPY_FILES = [
  'index.html', 'problems.html', 'problem-details.html', 'register-problem.html',
  'profile.html', 'login.html', 'register.html', 'about.html', 'contact.html',
  'leaderboard.html', 'privacy.html', 'terms.html', '404.html', 'offline.html',
  'manifest.json',
  // sw.js is deliberately skipped — see note above the imports.
];

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

rmrf(DEST);
fs.mkdirSync(DEST, { recursive: true });

let copied = 0;
for (const dir of COPY_DIRS) {
  const src = path.join(ROOT, dir);
  if (fs.existsSync(src)) { copyDir(src, path.join(DEST, dir)); copied++; }
}
for (const file of COPY_FILES) {
  const src = path.join(ROOT, file);
  if (fs.existsSync(src)) { fs.copyFileSync(src, path.join(DEST, file)); copied++; }
  else console.warn(`[sync-web] skipped missing file: ${file}`);
}

console.log(`[sync-web] copied ${copied} items into mobile/www/`);
