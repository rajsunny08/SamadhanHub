// =====================================================
// Sam — SamadhanHub assistant widget
// AI mode: POST /api/chat (server holds the API key).
// Basic mode: local answers from site.json + problem search.
// =====================================================
(function(){
  const STORE = 'sh_chat_v1';
  let site = null, aiOn = false, busy = false;
  let history = [];            // [{role, content}]
  const $ = (s, r = document) => r.querySelector(s);

  // ---------- formatting ----------
  function fmt(text){
    let h = escapeHtml(text);
    h = h.replace(/\[([^\]]+)\]\(((?:https?:\/\/|[\w\-./]+\.html)[^)\s"'<>]*)\)/gi,
      (m, label, url) => `<a href="${url}"${url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}>${label}</a>`);
    h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const out = []; let list = false;
    h.split('\n').forEach(line => {
      const li = line.match(/^\s*[-*•]\s+(.*)/);
      if (li){ if (!list){ out.push('<ul>'); list = true; } out.push(`<li>${li[1]}</li>`); }
      else { if (list){ out.push('</ul>'); list = false; } out.push(line.trim() ? `<p>${line}</p>` : ''); }
    });
    if (list) out.push('</ul>');
    return out.join('');
  }

  // ---------- UI ----------
  function build(){
    const name = site?.assistant?.name || 'Sam';
    const title = site?.assistant?.title || 'Samadhan Assistant';
    const root = document.createElement('div');
    root.className = 'chat-root';
    root.innerHTML = `
      <button class="chat-launcher" type="button" aria-label="Open chat assistant">
        <span class="chat-launch-ico">💬</span><span class="chat-pulse"></span>
      </button>
      <section class="chat-panel" aria-live="polite" aria-label="Chat assistant" hidden>
        <header class="chat-head">
          <div class="chat-avatar">${escapeHtml(name[0])}</div>
          <div class="chat-title"><strong>${escapeHtml(name)} · ${escapeHtml(title)}</strong><span id="chatStatus"><i></i> Online</span></div>
          <button type="button" class="chat-icon-btn" id="chatReset" title="New chat" aria-label="New chat">${Icon.trash}</button>
          <button type="button" class="chat-icon-btn" id="chatClose" aria-label="Close chat">${Icon.x}</button>
        </header>
        <div class="chat-body" id="chatBody"></div>
        <div class="chat-chips" id="chatChips"></div>
        <form class="chat-form" id="chatForm">
          <textarea id="chatInput" rows="1" maxlength="1000" placeholder="Type your message…" aria-label="Message"></textarea>
          <button type="submit" class="chat-send" aria-label="Send">${Icon.arrowRight}</button>
        </form>
        <p class="chat-foot" id="chatFoot">AI can make mistakes. Don't share passwords.</p>
      </section>`;
    document.body.appendChild(root);
    return root;
  }

  function addBubble(role, text, { instant = true } = {}){
    const body = $('#chatBody');
    const el = document.createElement('div');
    el.className = `chat-msg ${role}`;
    el.innerHTML = role === 'bot' ? fmt(text) : `<p>${escapeHtml(text)}</p>`;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
    return el;
  }

  // word-by-word reveal so replies feel like someone typing
  function reveal(text){
    return new Promise(resolve => {
      const el = addBubble('bot', '');
      const words = text.split(/(\s+)/);
      const step = Math.max(1, Math.ceil(words.length / 60));
      let i = 0;
      (function tick(){
        i = Math.min(i + step, words.length);
        el.innerHTML = fmt(words.slice(0, i).join(''));
        $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
        if (i < words.length) setTimeout(tick, 22); else resolve();
      })();
    });
  }

  function typing(on){
    let t = $('#chatTyping');
    if (on && !t){
      t = document.createElement('div');
      t.id = 'chatTyping'; t.className = 'chat-msg bot typing';
      t.innerHTML = '<span></span><span></span><span></span>';
      $('#chatBody').appendChild(t);
      $('#chatBody').scrollTop = $('#chatBody').scrollHeight;
    } else if (!on && t) t.remove();
  }

  function save(){ try{ sessionStorage.setItem(STORE, JSON.stringify(history.slice(-30))); }catch(e){} }

  function setChips(list){
    const box = $('#chatChips');
    box.innerHTML = (list || []).map(s => `<button type="button" class="chat-chip">${escapeHtml(s)}</button>`).join('');
    box.querySelectorAll('button').forEach(b => b.onclick = () => send(b.textContent));
  }

  function greeting(){
    const u = Auth.getUser();
    const first = u?.name ? u.name.split(' ')[0] : null;
    return first
      ? `Hey ${first}! 👋 I'm Sam. Ask me anything — how the site works, a tricky problem you're stuck on, or just a general question.`
      : `Hi there! 👋 I'm Sam, your SamadhanHub assistant. Ask me anything — how the site works, a problem you're stuck on, or just a general question.`;
  }

  function startFresh(){
    history = []; save();
    $('#chatBody').innerHTML = '';
    addBubble('bot', greeting());
    setChips(site?.assistant?.suggestions);
  }

  // ---------- basic (offline) brain ----------
  const STOP = new Set('the a an and or of to in on for with about any is are was how what why can could would should you your my me i we it this that there some please help find search tell give show need want'.split(' '));

  async function localReply(text){
    const t = text.toLowerCase().trim();
    const has = re => re.test(t);
    const faq = q => site?.faqs?.find(f => f.q.toLowerCase().includes(q))?.a;

    if (has(/^(hi+|hello+|hey+|hola|namaste|good (morning|afternoon|evening))\b/)) return "Hey! 😊 Good to see you. What can I help you with today?";
    if (has(/how are you|kaise ho|kya haal/)) return "Doing great, thanks for asking! Ready to help. What's on your mind?";
    if (has(/thank|thanks|shukriya|dhanyavaad|thx/)) return "Anytime! Shout if you need anything else. 🙌";
    if (has(/who are you|your name|what are you|are you (a )?(bot|human|ai)/)) return "I'm Sam, the assistant for SamadhanHub — an AI, not a person. Right now I'm running in **basic mode**, so I can guide you around the site and answer common questions.";
    if (has(/what is samadhan|about (this )?(site|website|samadhanhub)|what (do|does) (you|this|it) do/)) return "SamadhanHub is a community where people post real-life problems and others share solutions — *Har Problem Ka Ek Samadhan*. You can [browse problems](problems.html) or [register your own](register-problem.html).";
    if (has(/urgent|urgency/)) return faq('urgent') || "Urgent is a flag you add so helpers know your problem is time-sensitive.";
    if (has(/free|cost|price|pay|charge/)) return faq('free') || "Yes, it's free to use.";
    if (has(/password|secure|safe|privacy/)) return faq('password') || "Passwords are hashed and never stored in plain text.";
    if (has(/delete|remove/)) return "You can delete a problem you created from its page or from your [profile](profile.html). Only the author can do it.";
    if (has(/status|solved|in progress|mark/)) return "Authors can switch a problem between **Open**, **In Progress** and **Solved** — either on the problem's page or from the dashboard on your [profile](profile.html).";
    if (has(/register|post|submit|add|create|new problem|publish/) && has(/problem|issue|question/)) return "Easy: log in, then open [Register a Problem](register-problem.html). Add a clear title, describe what you've tried, pick a category and urgency, and hit **Publish**.";
    if (has(/solution|answer|reply|respond|help (someone|others)/)) return "Open any problem from [Browse Problems](problems.html) and use the *Share a solution* box at the bottom. You need to be logged in.";
    if (has(/login|log in|sign in|signin|sign up|signup|create.*account|register.*account|account/)) return "You can [create an account](register.html) in a few seconds, or [log in](login.html) if you already have one.";
    if (has(/categor/)) return "Categories: " + (site?.categories?.map(c => `${c.icon} ${c.name}`).join(', ') || 'Education, Technology, Career, Business, Daily Life, Community, Other') + ". Pick one when you register a problem, or filter by it on [Browse Problems](problems.html).";
    if (has(/contact|support|phone|email|reach/)) return "You can reach the team from the [contact page](contact.html) or at **contact@samadhanhub.com**.";
    if (has(/how.*(work|use)|get started|guide/)) return "Three steps: **1)** register your problem, **2)** the community posts solutions, **3)** you mark it solved. There's more on the [How It Works](about.html) page.";

    // try searching real problems for the user's keywords
    const words = t.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 3 && !STOP.has(w));
    for (const w of words.sort((a, b) => b.length - a.length).slice(0, 2)){
      let results = [];
      try{ results = await apiFetch('/problems?search=' + encodeURIComponent(w) + '&limit=3'); }
      catch(e){ results = sampleProblems(site, { search: w }).slice(0, 3); }
      if (results.length){
        return `I found ${results.length === 1 ? 'a problem' : 'a few problems'} that might be related:\n` +
          results.map(p => `- [${p.title}](problem-details.html?id=${p.id})`).join('\n') +
          `\nNone of these fit? You can [post your own](register-problem.html).`;
      }
    }
    return "Hmm, I'm not sure about that one — I'm in **basic mode** right now, so I can only help with SamadhanHub questions (registering problems, solutions, accounts, status) and searching existing problems. Try asking one of those!";
  }

  // ---------- sending ----------
  async function send(text){
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true;
    $('#chatChips').innerHTML = '';
    addBubble('user', text);
    history.push({ role: 'user', content: text });
    save();
    $('#chatInput').value = ''; autoGrow();
    typing(true);

    let reply, failed = false;
    try{
      if (aiOn){
        const data = await apiFetch('/chat', { method: 'POST', body: JSON.stringify({
          messages: history.slice(-14), page: document.title.split('—')[0].trim()
        })});
        reply = data.reply;
      } else {
        await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
        reply = await localReply(text);
      }
    }catch(err){
      if (aiOn && /not configured/i.test(err.message)){ aiOn = false; setStatus(); reply = await localReply(text); }
      else { failed = true; reply = err.message || "Sorry, something went wrong. Please try again."; }
    }
    typing(false);
    if (failed){
      addBubble('bot', reply).classList.add('error');
    } else {
      await reveal(reply);
      history.push({ role: 'assistant', content: reply });
      save();
    }
    busy = false;
    $('#chatInput').focus();
  }

  function setStatus(){
    $('#chatStatus').innerHTML = aiOn ? '<i></i> Online · AI-powered' : '<i class="off"></i> Basic mode';
    $('#chatFoot').textContent = aiOn ? "AI can make mistakes. Don't share passwords." : 'Basic mode — add an API key on the server for full conversations.';
  }

  function autoGrow(){
    const t = $('#chatInput'); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 110) + 'px';
  }

  function open(){
    $('.chat-panel').hidden = false;
    requestAnimationFrame(() => $('.chat-root').classList.add('open'));
    $('#chatInput').focus();
    $('.chat-pulse').remove();
  }
  function close(){
    $('.chat-root').classList.remove('open');
    setTimeout(() => { $('.chat-panel').hidden = true; }, 220);
  }

  document.addEventListener('DOMContentLoaded', async () => {
    site = await loadSite();
    const root = build();
    try{ aiOn = !!(await apiFetch('/chat/status')).ai; }catch(e){ aiOn = false; }
    setStatus();

    // restore session
    try{ history = JSON.parse(sessionStorage.getItem(STORE) || '[]'); }catch(e){ history = []; }
    if (history.length){
      history.forEach(m => addBubble(m.role === 'user' ? 'user' : 'bot', m.content));
    } else {
      addBubble('bot', greeting());
      setChips(site?.assistant?.suggestions);
    }

    $('.chat-launcher').onclick = () => root.classList.contains('open') ? close() : open();
    $('#chatClose').onclick = close;
    $('#chatReset').onclick = () => { if (!busy) startFresh(); };
    $('#chatForm').addEventListener('submit', e => { e.preventDefault(); send($('#chatInput').value); });
    $('#chatInput').addEventListener('input', autoGrow);
    $('#chatInput').addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); send($('#chatInput').value); }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('open')) close(); });
  });
})();
