document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  const root = document.getElementById('profileBox');

  async function render(){
    let data;
    try{
      data = await apiFetch('/profile');
    }catch(err){
      root.innerHTML = `<div class="empty-state">${Icon.x}<p>${escapeHtml(err.message)}</p></div>`;
      return;
    }

    const { user, problems } = data;
    const solved = problems.filter(p => p.status === 'SOLVED').length;
    const solutionsGiven = user.solutions_given ?? 0;

    root.innerHTML = `
      <div class="profile-header">
        <div class="avatar">${escapeHtml(user.name.charAt(0).toUpperCase())}</div>
        <div>
          <h1 style="font-size:1.5rem;">${escapeHtml(user.name)}</h1>
          <p class="muted">${escapeHtml(user.email)} · member since ${new Date(user.created_at).toLocaleDateString()}</p>
          <div class="profile-stats">
            <div class="stat"><strong>${problems.length}</strong><span>Problems posted</span></div>
            <div class="stat"><strong>${solved}</strong><span>Marked solved</span></div>
            <div class="stat"><strong>${solutionsGiven}</strong><span>Solutions given</span></div>
          </div>
        </div>
      </div>

      <div class="section-heading" style="margin-bottom:16px;">
        <h2 style="font-size:1.2rem;">Your problems</h2>
        <a class="view-all" href="register-problem.html">${Icon.plus} New problem</a>
      </div>
      <div id="myProblems">
        ${problems.length ? problems.map(p => `
          <div class="dash-row">
            <div>
              <div class="title"><a href="problem-details.html?id=${p.id}">${escapeHtml(p.title)}</a></div>
              <div class="muted" style="font-size:.82rem;">${escapeHtml(p.category)} · ${p.solution_count} solution${p.solution_count===1?'':'s'} · ${timeAgo(p.created_at)}</div>
            </div>
            <div class="actions">
              <select class="status-select" data-id="${p.id}">
                <option ${p.status==='OPEN'?'selected':''} value="OPEN">Open</option>
                <option ${p.status==='IN PROGRESS'?'selected':''} value="IN PROGRESS">In Progress</option>
                <option ${p.status==='SOLVED'?'selected':''} value="SOLVED">Solved</option>
              </select>
              <button class="btn btn-ghost btn-sm" data-delete="${p.id}">${Icon.trash}</button>
            </div>
          </div>`).join('') : `<div class="empty-state">${Icon.inbox}<p>You haven't registered a problem yet.</p></div>`}
      </div>
    `;

    root.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async () => {
        try{
          await apiFetch(`/problems/${sel.dataset.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: sel.value }) });
          showToast('Status updated');
          render();
        }catch(err){ showToast(err.message, 'error'); }
      });
    });
    root.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this problem?')) return;
        try{
          await apiFetch(`/problems/${btn.dataset.delete}`, { method: 'DELETE' });
          showToast('Deleted');
          render();
        }catch(err){ showToast(err.message, 'error'); }
      });
    });
  }

  render();
});
