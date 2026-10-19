document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('details');
  const id = new URLSearchParams(location.search).get('id');

  if (!id){
    root.innerHTML = `<div class="empty-state">${Icon.x}<p>No problem selected.</p></div>`;
    return;
  }

  async function render(){
    let p;
    try{
      try{
        p = await apiFetch(`/problems/${id}`);
      }catch(apiErr){
        const site = await loadSite();
        p = site && sampleProblemById(site, id);
        if (!p) throw apiErr;
        showPreviewBanner();
      }
    }catch(err){
      root.innerHTML = `<div class="empty-state">${Icon.x}<p>${escapeHtml(err.message)}</p></div>`;
      return;
    }

    const me = Auth.getUser();
    const isOwner = me && me.id === p.user_id;

    root.innerHTML = `
      <div class="detail-header">
        <div>
          <div class="status ${p.status === 'SOLVED' ? 'solved' : p.status === 'IN PROGRESS' ? 'in-progress' : ''}">
            <span class="status-dot"></span> ${statusLabel(p.status).toUpperCase()}
          </div>
          <h1 class="detail-title">${escapeHtml(p.title)}</h1>
        </div>
        ${isOwner ? `
          <select class="status-select" id="statusSelect">
            <option ${p.status==='OPEN'?'selected':''} value="OPEN">Open</option>
            <option ${p.status==='IN PROGRESS'?'selected':''} value="IN PROGRESS">In Progress</option>
            <option ${p.status==='SOLVED'?'selected':''} value="SOLVED">Solved</option>
          </select>` : ''}
      </div>
      <div class="detail-meta">
        <span class="author-badge">${Icon.user} ${escapeHtml(p.author_name)}</span>
        <span class="tag">${escapeHtml(p.category)}</span>
        ${p.urgency === 'Urgent' ? `<span class="tag urgent">${Icon.flag} Urgent</span>` : ''}
        ${p.location ? `<span>${Icon.pin} ${escapeHtml(p.location)}</span>` : ''}
        <span>${Icon.clock} ${timeAgo(p.created_at)}</span>
      </div>
      ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" style="border-radius:10px;margin-bottom:24px;max-height:320px;object-fit:cover;width:100%;">` : ''}
      <div class="detail-body">${escapeHtml(p.description)}</div>
      ${isOwner ? `<div class="detail-actions"><button class="btn btn-danger btn-sm" id="deleteBtn">${Icon.trash} Delete problem</button></div>` : ''}

      <div class="solutions-heading"><h2 style="font-size:1.3rem;">${Icon.lightbulb} ${p.solutions.length} Solution${p.solutions.length===1?'':'s'}</h2></div>
      <div id="solutionsList">
        ${p.solutions.length ? p.solutions.map(s => `
          <div class="solution-card">
            <div class="who"><span>${Icon.user} ${escapeHtml(s.author_name)}</span><span>${timeAgo(s.created_at)}</span></div>
            <p>${escapeHtml(s.content)}</p>
          </div>`).join('') : `<p class="muted">No solutions yet — be the first to help.</p>`}
      </div>

      ${Auth.isLoggedIn() ? `
        <form class="solution-form" id="solutionForm">
          <label style="font-weight:600;font-size:.9rem;">Share a solution
            <textarea class="input" name="content" rows="3" required placeholder="What worked for you, or what would you try?"></textarea>
          </label>
          <button class="btn btn-primary btn-sm" type="submit" style="align-self:flex-start;">${Icon.plus} Post solution</button>
        </form>
      ` : `<p class="auth-notice">${Icon.user} <a href="login.html" style="color:var(--marigold-ink);font-weight:600;">Log in</a> to post a solution.</p>`}
    `;

    const statusSelect = document.getElementById('statusSelect');
    if (statusSelect){
      statusSelect.addEventListener('change', async () => {
        try{
          await apiFetch(`/problems/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: statusSelect.value }) });
          showToast('Status updated');
          render();
        }catch(err){ showToast(err.message, 'error'); }
      });
    }

    const deleteBtn = document.getElementById('deleteBtn');
    if (deleteBtn){
      deleteBtn.addEventListener('click', async () => {
        if (!confirm('Delete this problem? This cannot be undone.')) return;
        try{
          await apiFetch(`/problems/${id}`, { method: 'DELETE' });
          showToast('Problem deleted');
          setTimeout(() => location.href = 'problems.html', 500);
        }catch(err){ showToast(err.message, 'error'); }
      });
    }

    const solutionForm = document.getElementById('solutionForm');
    if (solutionForm){
      solutionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const content = new FormData(solutionForm).get('content');
        try{
          await apiFetch(`/problems/${id}/solutions`, { method: 'POST', body: JSON.stringify({ content }) });
          solutionForm.reset();
          showToast('Solution posted');
          render();
        }catch(err){ showToast(err.message, 'error'); }
      });
    }
  }

  render();
});
