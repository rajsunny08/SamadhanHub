// SamadhanHub service worker — app-shell caching so the installed app
// opens instantly and basic navigation works offline. API calls always
// go to the network (fresh data); static assets are cache-first.
const VERSION = 'v1';
const CACHE = `samadhanhub-${VERSION}`;

const SHELL = [
  '/', '/index.html', '/problems.html', '/about.html', '/contact.html',
  '/login.html', '/register.html', '/offline.html',
  '/css/style.css', '/css/responsive.css', '/css/auth.css',
  '/js/icons.js', '/js/app.js', '/js/site.js', '/js/chat.js',
  '/data/site.json',
  '/images/logo.jpeg', '/images/icons/icon-192.png', '/images/icons/icon-512.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // API + presence/chat: always network, never cached (live data)
  if (url.pathname.startsWith('/api/')) return;

  // Navigations: network first, fall back to cached shell, then offline page
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then((res) => {
        caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() =>
        caches.match(req).then((cached) => cached || caches.match('/offline.html'))
      )
    );
    return;
  }

  // Static assets: cache first, update cache in background
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res && res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
