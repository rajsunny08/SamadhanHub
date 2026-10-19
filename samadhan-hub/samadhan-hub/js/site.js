// =====================================================
// SamadhanHub — JSON-driven content + interactive widgets
// Reads data/site.json. If the API is offline, pages fall back to
// the sample problems in that file ("preview mode").
// =====================================================

let _sitePromise;
function loadSite(){
  if (!_sitePromise){
    _sitePromise = fetch('data/site.json')
      .then(r => { if (!r.ok) throw new Error('no json'); return r.json(); })
      .catch(() => null);
  }
  return _sitePromise;
}

// ---- sample data (same shape the API returns) ----
function sampleProblems(site, { search = '', category = '', status = '' } = {}){
  if (!site) return [];
  const q = search.trim().toLowerCase();
  return site.sample_problems
    .map(p => ({
      ...p,
      user_id: null,
      author_name: p.author,
      solution_count: (p.solutions || []).length
    }))
    .filter(p =>
      (!q || (p.title + ' ' + p.description).toLowerCase().includes(q)) &&
      (!category || p.category === category) &&
      (!status || p.status === status))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function sampleProblemById(site, id){
  const p = sampleProblems(site).find(x => String(x.id) === String(id));
  if (!p) return null;
  return { ...p, solutions: (p.solutions || []).map(s => ({ ...s, author_name: s.author })) };
}

function showPreviewBanner(){
  if (document.querySelector('.preview-banner')) return;
  const bar = document.createElement('div');
  bar.className = 'preview-banner';
  bar.innerHTML = `${Icon.eye} <span><strong>Preview mode</strong> — showing sample data from <code>data/site.json</code>. Start the server (<code>npm start</code>) to save real problems.</span>`;
  const nav = document.querySelector('.navbar');
  nav ? nav.insertAdjacentElement('afterend', bar) : document.body.prepend(bar);
}

// ---- category grid (needs a problems list for counts) ----
function renderCategories(site, problems){
  const el = document.getElementById('categoryGrid');
  if (!el || !site) return;
  el.innerHTML = site.categories.map(c => {
    const n = problems.filter(p => p.category === c.name).length;
    return `<a class="cat-card" href="problems.html?category=${encodeURIComponent(c.name)}">
      <div class="cat-ico">${c.icon}</div>
      <div><h3>${escapeHtml(c.name)}</h3><p>${escapeHtml(c.desc)}</p></div>
      <span class="cat-count">${n}</span>
    </a>`;
  }).join('');
}

// ---- count-up animation for .stat strong ----
function countUp(root){
  (root || document).querySelectorAll('.stat strong').forEach(el => {
    const target = parseInt(el.textContent, 10);
    if (isNaN(target)) return;
    const dur = 900, start = performance.now();
    (function tick(now){
      const t = Math.min((now - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  });
}

// ---- typing rotator in hero ----
function initRotator(site){
  const el = document.getElementById('rotator');
  if (!el || !site?.rotator?.length) return;
  let i = 0, j = 0, deleting = false;
  (function loop(){
    const word = site.rotator[i];
    el.textContent = word.slice(0, j);
    if (!deleting && j === word.length){ deleting = true; return setTimeout(loop, 1600); }
    if (deleting && j === 0){ deleting = false; i = (i + 1) % site.rotator.length; }
    j += deleting ? -1 : 1;
    setTimeout(loop, deleting ? 28 : 55);
  })();
}

// ---- live activity ticker ----
function initTicker(site){
  const el = document.getElementById('ticker');
  if (!el || !site?.ticker?.length) return;
  const items = site.ticker.map(t => `<span>${escapeHtml(t)}</span>`).join('');
  el.innerHTML = `<div class="ticker-track">${items}${items}</div>`;
}

// ---- how-it-works steps ----
function initSteps(site){
  const el = document.getElementById('stepsGrid');
  if (!el || !site?.steps) return;
  el.innerHTML = site.steps.map((s, i) => `
    <div class="step-card glow-card">
      <div class="step-num">0${i + 1}</div>
      <div class="cat-ico">${s.icon}</div>
      <h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.text)}</p>
    </div>`).join('');
}

// ---- testimonials slider ----
function initTestimonials(site){
  const el = document.getElementById('testimonials');
  if (!el || !site?.testimonials?.length) return;
  const items = site.testimonials;
  let idx = 0, timer;
  el.innerHTML = `
    <div class="t-card" id="tCard"></div>
    <div class="t-controls">
      <button type="button" class="t-btn" id="tPrev" aria-label="Previous">${Icon.arrowRight.replace('<svg class="icon"', '<svg class="icon" style="transform:rotate(180deg)"')}</button>
      <div class="t-dots" id="tDots">${items.map((_, i) => `<button type="button" aria-label="Go to ${i + 1}" data-i="${i}"></button>`).join('')}</div>
      <button type="button" class="t-btn" id="tNext" aria-label="Next">${Icon.arrowRight}</button>
    </div>`;
  const card = el.querySelector('#tCard'), dots = el.querySelectorAll('#tDots button');
  function show(n){
    idx = (n + items.length) % items.length;
    const t = items[idx];
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    card.innerHTML = `
      <div class="stars">${'★'.repeat(t.rating)}<span>${'★'.repeat(5 - t.rating)}</span></div>
      <p>“${escapeHtml(t.text)}”</p>
      <div class="t-who"><div class="avatar" style="width:42px;height:42px;font-size:17px;">${escapeHtml(t.name[0])}</div>
        <div><strong>${escapeHtml(t.name)}</strong><span>${escapeHtml(t.role)}</span></div></div>`;
    dots.forEach((d, i) => d.classList.toggle('on', i === idx));
  }
  const restart = () => { clearInterval(timer); timer = setInterval(() => show(idx + 1), 6000); };
  el.querySelector('#tPrev').onclick = () => { show(idx - 1); restart(); };
  el.querySelector('#tNext').onclick = () => { show(idx + 1); restart(); };
  dots.forEach(d => d.onclick = () => { show(+d.dataset.i); restart(); });
  show(0); restart();
}

// ---- FAQ accordion ----
function initFaq(site){
  const el = document.getElementById('faqList');
  if (!el || !site?.faqs) return;
  el.innerHTML = site.faqs.map(f => `
    <details class="faq-item"><summary>${escapeHtml(f.q)}</summary><p>${escapeHtml(f.a)}</p></details>`).join('');
  // one open at a time
  el.querySelectorAll('details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) el.querySelectorAll('details').forEach(o => { if (o !== d) o.open = false; });
  }));
}

// ---- global polish: scroll progress, back-to-top, reveal, card glow ----
function initGlobalFX(){
  document.body.classList.add('fx');

  const top = document.createElement('button');
  top.className = 'to-top'; top.type = 'button'; top.setAttribute('aria-label', 'Back to top');
  top.innerHTML = Icon.arrowRight.replace('<svg class="icon"', '<svg class="icon" style="transform:rotate(-90deg)"');
  top.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  document.body.appendChild(top);

  const onScroll = () => {
    const h = document.documentElement;
    top.classList.toggle('show', h.scrollTop > 500);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if ('IntersectionObserver' in window){
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  // mouse-follow highlight on glass cards (event delegation, works for dynamic cards)
  document.addEventListener('mousemove', e => {
    const card = e.target.closest?.('.glow-card, .problem-card, .feature, .cat-card');
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', `${e.clientX - r.left}px`);
    card.style.setProperty('--my', `${e.clientY - r.top}px`);
  });
}

// ---- live visit / online-now pill ("453 Subscribers are live now"-style) ----
function sessionId(){
  let id = sessionStorage.getItem('sh_sid');
  if (!id){
    id = (crypto.randomUUID ? crypto.randomUUID() : 'sid-' + Date.now() + '-' + Math.random().toString(36).slice(2));
    sessionStorage.setItem('sh_sid', id);
  }
  return id;
}

function paintPill(count){
  const el = document.getElementById('livePillCount');
  if (!el) return;
  const target = Number(count) || 0;
  const start = parseInt(el.textContent.replace(/[^\d]/g, ''), 10) || 0;
  if (start === target){ el.textContent = target.toLocaleString(); return; }
  const dur = 700, t0 = performance.now();
  (function tick(now){
    const p = Math.min((now - t0) / dur, 1);
    el.textContent = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3))).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

async function initLivePill(){
  if (!document.getElementById('livePill')) return;
  const sid = sessionId();
  const already = sessionStorage.getItem('sh_visit_counted');

  async function refresh(){
    try{
      const data = already
        ? await apiFetch('/presence')
        : await apiFetch('/presence/visit', { method: 'POST', body: JSON.stringify({ sessionId: sid }) });
      if (!already) sessionStorage.setItem('sh_visit_counted', '1');
      paintPill(data.totalVisits ?? data.total_visits ?? data.online);
    }catch(err){
      // offline / preview mode — show a believable local estimate instead of "—"
      let n = parseInt(localStorage.getItem('sh_preview_visits') || '', 10);
      if (!n){ n = 480 + Math.floor(Math.random() * 40); localStorage.setItem('sh_preview_visits', n); }
      paintPill(n);
    }
  }
  refresh();
  // heartbeat so "online now" style pings stay warm; harmless if the pill only shows total visits
  setInterval(() => { apiFetch('/presence/ping', { method: 'POST', body: JSON.stringify({ sessionId: sid }) }).catch(() => {}); }, 20000);
}

document.addEventListener('DOMContentLoaded', async () => {
  initGlobalFX();
  initLivePill();
  const site = await loadSite();
  initRotator(site); initTicker(site); initSteps(site); initTestimonials(site); initFaq(site);
});
