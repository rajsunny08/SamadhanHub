document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('leaderboardList');
  let rows;
  try{
    rows = await apiFetch('/leaderboard');
  }catch(err){
    root.innerHTML = `<div class="empty-state">${Icon.x}<p>${escapeHtml(err.message)}</p></div>`;
    return;
  }

  if (!rows.length){
    root.innerHTML = `<div class="empty-state">${Icon.inbox}<p>No activity yet — be the first to post a solution.</p></div>`;
    return;
  }

  const medals = ['🥇', '🥈', '🥉'];
  root.innerHTML = `<div class="lb-list">` + rows.map((u, i) => `
    <div class="lb-row ${i < 3 ? 'lb-top' : ''}">
      <div class="lb-rank">${medals[i] || (i + 1)}</div>
      <div class="avatar" style="width:44px;height:44px;font-size:18px;">${escapeHtml(u.name.charAt(0).toUpperCase())}</div>
      <div class="lb-who">
        <strong>${escapeHtml(u.name)}</strong>
        <span class="muted">Member since ${new Date(u.created_at).toLocaleDateString()}</span>
      </div>
      <div class="lb-stats">
        <div><strong>${u.solutions_given}</strong><span>solutions</span></div>
        <div><strong>${u.problems_posted}</strong><span>problems</span></div>
        <div><strong>${u.problems_solved}</strong><span>solved</span></div>
      </div>
    </div>`).join('') + `</div>`;
});
