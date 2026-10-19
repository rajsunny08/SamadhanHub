# SamadhanHub

A community platform where people register real problems and the community posts solutions. Full-stack rebuild of the pages you shared: static frontend + a Node/Express/SQLite backend for real data persistence.

## Run it

```bash
cd server
npm install
cp .env.example .env      # then edit JWT_SECRET
npm start
```

Open **http://localhost:4000** — the same Express server serves the frontend *and* the API, so there's no CORS setup needed.

Demo login: `demo@samadhanhub.com` / `demo1234` (seeded on first run, in `server/db.js`).

## Architecture

```
samadhan-hub/
├── index.html, problems.html, problem-details.html,
│   register-problem.html, profile.html, login.html,
│   register.html, about.html, contact.html
├── css/         style.css (tokens+components), responsive.css, auth.css
├── js/          icons.js, app.js (API client, auth, nav, toasts),
│                index.js, problems.js, problem-details.js,
│                register-problem.js, profile.js, auth.js
└── server/
    ├── server.js         Express app (serves API + static frontend)
    ├── db.js              SQLite schema + seed (better-sqlite3)
    ├── middleware/auth.js JWT verification
    └── routes/            auth.js, problems.js, misc.js
```

**Database**: SQLite (file-based, zero setup) via `better-sqlite3`, with three tables — `users`, `problems`, `solutions` — and indexes on status/category/problem_id. Swapping to MySQL/Postgres later only touches `server/db.js` and the query calls in `server/routes/*`, since the rest of the app talks to the DB only through those routes.

**Auth**: bcrypt-hashed passwords, JWT bearer tokens (7-day expiry), stored client-side in `localStorage`. `register-problem.html` and `profile.html` redirect to `login.html` if you're not signed in and bounce you back afterward.

**API** (all under `/api`):
| Method | Route | Purpose |
|---|---|---|
| POST | `/auth/register`, `/auth/login` | account creation / login |
| GET | `/problems?search=&category=&status=&limit=` | list + filter |
| GET | `/problems/:id` | detail + solutions |
| POST | `/problems` | create (auth) |
| PATCH | `/problems/:id/status` | update status (owner only) |
| DELETE | `/problems/:id` | delete (owner only) |
| POST | `/problems/:id/solutions` | add a solution (auth) |
| GET | `/profile` | current user + their problems (auth) |
| GET | `/stats` | homepage counters |

## What was fixed from the original files

- **Inconsistent branding**: `index.html`/`problems.html`/`register-problem.html` said "SamadhanHub" while `login.html`/`register.html`/`problem-details.html` said "ProblemSolve" with a "PS" mark. Unified to SamadhanHub everywhere.
- **Missing assets**: every page referenced `css/style.css`, `css/responsive.css`, `js/app.js`, etc., and `images/logo.png.jpeg` — none of these existed. All rebuilt; the logo is now an inline SVG so it never 404s.
- **Broken/missing pages**: footer linked to `about.html`, which didn't exist — now built, along with a new `contact.html`.
- **`#navAuth` did nothing**: the login link in the nav was static HTML on every page; it's now driven by `app.js`, which swaps it for the user's name + a working Logout button when signed in.
- **No real persistence**: forms had no backend to submit to. Registering a problem, posting a solution, and updating status now hit real API endpoints and are stored in SQLite.
- **Mismatched contact details**: home page footer used a different phone number than other pages — unified to one number.
- **No auth gating**: anyone could reach `register-problem.html` and `profile.html` with no session. Both now require login and redirect back after sign-in.
- **Static "8 solutions" hero card**: left as an illustrative example card (clearly a demo), while the *actual* recent-problems grid and stats block below it are now live from the database.

## What's new

- **Pages**: `about.html` (How It Works), `contact.html`, and richer `profile.html` (avatar, stats, per-problem status/delete controls).
- **Design system**: a distinct palette (ink `#142433` + marigold `#E8A33D` + teal `#1F6F63`) and a Newsreader/IBM Plex Sans pairing, applied consistently via CSS variables in `css/style.css`.
- **Interactive icon set** (`js/icons.js`): inline SVGs for search, filter, status, urgency, location, mail, phone, logout, delete, etc. — no icon-font dependency, so nothing breaks offline.
- **Search + filters** on Browse Problems (debounced search, category and status dropdowns).
- **Status workflow**: Open → In Progress → Solved, editable by the problem's author from either the detail page or their profile dashboard.
- **Mobile nav**: hamburger toggle below 720px (`css/responsive.css` + `app.js`).
- **Toasts** for success/error feedback instead of silent failures.

## Design update

The visual design was swapped to your new blue/Inter theme and real logo (`images/logo.jpeg`), replacing the earlier ink/marigold palette. All backend-connected behavior (SQLite persistence, auth, filters, status workflow) is unchanged — only `css/*.css` and the brand markup changed. A few component styles (forms, tags, detail/profile pages, toasts, mobile nav) that weren't in the new stylesheet were added on top of it using the same color tokens (`--primary`, `--warning`, `--danger`, etc.) so every page stays visually consistent.

## Installable app (PWA)

The website is now a installable Progressive Web App — same codebase, same database, same login, with an app icon, splash/startup look, and offline shell.

- **manifest.json** — app name, theme colors, icons (`images/icons/`), and home-screen shortcuts to Register Problem / Browse Problems / Profile.
- **sw.js** — a service worker that caches the app shell so it opens instantly once installed; API calls always go to the network for fresh data, and `offline.html` shows if there's no connection at all.
- **js/pwa.js** — registers the service worker and shows an "Install SamadhanHub" card (Android/desktop use the native install prompt; iOS Safari gets a tip to use Share → Add to Home Screen, since iOS doesn't expose an install prompt API).

**To install it:** run the server, open `http://localhost:4000` in Chrome/Edge, and either use the install icon in the address bar or wait for the in-app prompt. On a phone, open the same URL (use your computer's LAN IP instead of localhost to test from a phone) and use "Add to Home Screen."

A true native iOS/Android app (App Store or Play Store build) would need a separate project — e.g. wrapping this PWA with Capacitor, or a React Native/Flutter app calling the same `/api` routes. This PWA gives the installable-app experience without that extra build step.

## Publishing to the App Store & Play Store

A ready-to-use Capacitor project lives in `mobile/` — it wraps this same frontend into a real Android/iOS app. See **SamadhanHub-App-Store-Play-Store-Guide.pdf** for the full walkthrough (deploying the backend, building, and submitting to both stores). Quick summary: deploy `server/` somewhere public, set `PRODUCTION_API_URL` near the top of `js/app.js`, then follow `mobile/README.md`.

## Recent updates

- **Account icon (top right):** the old text "Login" link is now a circular account icon. Guests get a dropdown with Login / Create account; signed-in users get their avatar initial with Profile / Logout. Click outside or press Escape to close it.
- **Live visit pill:** a real, database-backed counter ("N people have used SamadhanHub") on the homepage and leaderboard, seeded at 128 so a fresh install doesn't show 0. Backed by `server/routes/presence.js` (`GET/POST /api/presence`) and a `counters` table in SQLite — one visit is counted per browser session, tracked with a random id in `sessionStorage`, not cookies.
- **New pages:** `leaderboard.html` (top helpers ranked by solutions given, via `GET /api/leaderboard`), `privacy.html`, `terms.html`, and a custom `404.html` that the server now serves for any unmatched route.
- **Fixed a real bug:** the dark-theme CSS had accidentally dropped the navbar's stacking order, so the mobile menu rendered *behind* the hero content on small screens. Fixed, and the mobile menu panel is now a solid dark surface instead of a white one that clashed with the theme.
- **The "blue line while scrolling"** some people notice on `127.0.0.1` addresses is the browser's own page-load indicator (common with Live Server auto-reload) — there's no such element in this site's CSS/JS to remove.

## AI assistant ("Sam")

A floating chat widget on every page. Two modes, chosen automatically:

- **AI mode** - set `ANTHROPIC_API_KEY` in `server/.env` (and optionally `CHAT_MODEL`, default `claude-sonnet-5`). The browser talks to `POST /api/chat`; the server adds the system prompt and calls the Anthropic API, so the key is never exposed. Includes input validation, a 20 msgs/min/IP rate limit and a 30s timeout.
- **Basic mode** (no key) - answers common site questions from `data/site.json` and searches existing problems, so the widget still works out of the box.

Edit Sam's greeting and suggestion chips in `data/site.json` (`assistant`), and his personality/knowledge in the `SYSTEM` prompt in `server/routes/chat.js`.

## Content & preview mode (`data/site.json`)

Homepage text widgets, categories, FAQ, testimonials and sample problems live in `data/site.json`. The same file seeds the database on first run and powers preview mode when the API is offline (serve over http, e.g. VS Code Live Server). The testimonials and sample people are placeholders - replace them before going public.

## Suggested next steps

- Swap SQLite for MySQL if you want to match the stack from your other projects (Online Code Judge, E-Commerce app) — the route layer is already isolated for that.
- Add image upload (multer + S3, since you've already used AWS S3) instead of the current photo-URL field.
- Add email notifications when a solution is posted on your problem.
- Wire `contact.html`'s form to a real endpoint (or a mail API) — it currently only confirms client-side.
