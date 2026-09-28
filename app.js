// =====================================================
// SamadhanHub — shared front-end logic (loaded on every page)
// =====================================================

const API_BASE = '/api';
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

// ---- nav: auth-aware links + mobile toggle, runs on every page ----
function initNav(){
  const nav = document.querySelector('.nav-links');
  if (!nav) return;

  const authSlot = document.getElementById('navAuth');
  if (authSlot){
    if (Auth.isLoggedIn()){
      const user = Auth.getUser();
      const wrap = document.createElement('span');
      wrap.style.display = 'contents';
      wrap.innerHTML = `
        <a href="profile.html" class="nav-user">${Icon.user} ${escapeHtml(user?.name?.split(' ')[0] || 'Profile')}</a>
        <button class="link-btn" id="logoutBtn" type="button">${Icon.logout} Logout</button>`;
      authSlot.replaceWith(wrap);
      document.getElementById('logoutBtn').addEventListener('click', () => {
        Auth.clear();
        showToast('Logged out');
        setTimeout(() => location.href = 'index.html', 500);
      });
    } else {
      authSlot.textContent = 'Login';
    }
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
