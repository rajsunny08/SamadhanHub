// =====================================================
// SamadhanHub — shared front-end logic (loaded on every page)
// =====================================================

// When this runs as a real website, relative '/api' reaches the same server
// that served the page — fine. When it runs as a packaged native app
// (Capacitor), there is no same-origin server, so it must call your deployed
// backend's full URL instead. Set that URL once, after you deploy the
// server/ folder somewhere (see the App Store / Play Store publishing guide).
const PRODUCTION_API_URL = 'https://YOUR-DEPLOYED-BACKEND.example.com/api';
const IS_PACKAGED_APP = !!window.Capacitor || ['file:', 'capacitor:', 'ionic:'].includes(location.protocol);
const API_BASE = IS_PACKAGED_APP ? PRODUCTION_API_URL : '/api';
const TOKEN_KEY = 'sh_token';
const USER_KEY = 'sh_user';

const Auth = {
  getToken(){ return localStorage.getItem(TOKEN_KEY); },
  getUser(){ try{ return JSON.parse(localStorage.getItem(USER_KEY)); }catch(e){ return null; } },
  setSession(token, user){
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(){ localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
  isLoggedIn(){ return !!this.getToken(); }
};

async function apiFetch(path, options = {}){
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try{
    res = await fetch(API_BASE + path, { ...options, headers });
  }catch(err){
    throw new Error('Cannot reach the server. Is the SamadhanHub backend running?');
  }

  let data = null;
  try{ data = await res.json(); }catch(e){ /* no body */ }

  if (res.status === 401 && Auth.isLoggedIn()){
    // token expired/invalid — drop the stale session
    Auth.clear();
  }
  if (!res.ok){
    throw new Error((data && data.error) || `Request failed (${res.status})`);
  }
  return data;
}

function showToast(message, type = 'success'){
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = `toast ${type === 'error' ? 'error' : ''}`;
  el.innerHTML = `${type === 'error' ? Icon.x : Icon.check} <span>${escapeHtml(message)}</span>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

function timeAgo(iso){
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  const units = [[31536000,'y'],[2592000,'mo'],[86400,'d'],[3600,'h'],[60,'m']];
  for (const [secs, label] of units){
    if (diff >= secs) return `${Math.floor(diff/secs)}${label} ago`;
  }
  return 'just now';
}

function statusClass(status){
  return 'status-' + String(status || 'open').toLowerCase().replace(/\s+/g,'-');
}
function statusLabel(status){
  const s = (status || 'OPEN').toUpperCase();
  return s === 'IN PROGRESS' ? 'In Progress' : s.charAt(0) + s.slice(1).toLowerCase();
}

// ---- shared "problem card" renderer, used on index.html and problems.html ----
function problemCardHTML(p){
  const urgent = p.urgency === 'Urgent';
  return `
  <a class="problem-card ${statusClass(p.status)}" href="problem-details.html?id=${p.id}">
    <div class="status ${p.status === 'SOLVED' ? 'solved' : p.status === 'IN PROGRESS' ? 'in-progress' : ''}">
      <span class="status-dot"></span> ${statusLabel(p.status).toUpperCase()}
    </div>
    <h3>${escapeHtml(p.title)}</h3>
    <p>${escapeHtml((p.description || '').slice(0, 110))}${(p.description||'').length > 110 ? '…' : ''}</p>
    <div class="tag-row">
      <span class="tag">${escapeHtml(p.category)}</span>
      ${urgent ? `<span class="tag urgent">${Icon.flag} Urgent</span>` : ''}
      ${p.location ? `<span class="tag">${Icon.pin} ${escapeHtml(p.location)}</span>` : ''}
    </div>
    <div class="card-footer">
      <span>${Icon.lightbulb} ${p.solution_count ?? 0} solution${(p.solution_count ?? 0) === 1 ? '' : 's'}</span>
      <span>${Icon.clock} ${timeAgo(p.created_at)}</span>
    </div>
  </a>`;
}

// ---- nav: account icon + dropdown, mobile toggle, runs on every page ----
function initNav(){
  const nav = document.querySelector('.nav-links');
  if (!nav) return;

  const menu = document.getElementById('navAuth');
  if (menu){
    const btn = menu.querySelector('#acctBtn');
    const drop = menu.querySelector('#acctDrop');

    if (Auth.isLoggedIn()){
      const user = Auth.getUser();
      const initial = escapeHtml((user?.name || '?').trim().charAt(0).toUpperCase());
      btn.innerHTML = initial;
      btn.classList.add('account-btn-avatar');
      btn.setAttribute('aria-label', user?.name ? `Account — ${user.name}` : 'Account');
      drop.innerHTML = `
        <div class="acct-name">${escapeHtml(user?.name || 'Account')}</div>
        <a href="profile.html" role="menuitem">${Icon.user} Profile</a>
        <button class="link-btn" id="logoutBtn" type="button" role="menuitem">${Icon.logout} Logout</button>`;
      drop.querySelector('#logoutBtn').addEventListener('click', () => {
        Auth.clear();
        showToast('Logged out');
        setTimeout(() => location.href = 'index.html', 500);
      });
    }
    // else: guest markup (icon + Login/Create account) already in the page HTML

    const closeDrop = () => { menu.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); };
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !menu.classList.contains('open');
      menu.classList.toggle('open', willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    });
    document.addEventListener('click', (e) => { if (!menu.contains(e.target)) closeDrop(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrop(); });
  }

  let toggle = document.querySelector('.nav-toggle');
  if (!toggle){
    toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Toggle menu');
    toggle.innerHTML = Icon.menu;
    nav.parentElement.insertBefore(toggle, nav);
  }
  toggle.addEventListener('click', () => nav.classList.toggle('open'));
}

// ---- gate pages that require login ----
function requireAuth(){
  if (!Auth.isLoggedIn()){
    sessionStorage.setItem('sh_redirect', location.pathname + location.search);
    location.href = 'login.html';
    return false;
  }
  return true;
}

document.addEventListener('DOMContentLoaded', initNav);
