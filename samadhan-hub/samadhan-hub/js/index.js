document.addEventListener('DOMContentLoaded', async () => {
  const statsEl = document.getElementById('homeStats');
  const listEl = document.getElementById('homeProblems');
  const site = await loadSite();

  let problems, stats, preview = false;
  try{
    problems = await apiFetch('/problems?limit=100');
    stats = await apiFetch('/stats');
  }catch(err){
    preview = true;
    problems = sampleProblems(site);
    stats = {
      total: problems.length,
      solved: problems.filter(p => p.status === 'SOLVED').length,
      solutions: problems.reduce((n, p) => n + p.solution_count, 0)
    };
  }
  if (preview && site) showPreviewBanner();

  if (statsEl){
    statsEl.innerHTML = `
      <div class="stat"><strong>${stats.total}</strong><span>Problems Registered</span></div>
      <div class="stat"><strong>${stats.solved}</strong><span>Problems Solved</span></div>
      <div class="stat"><strong>${stats.solutions}</strong><span>Solutions Shared</span></div>`;
    countUp(statsEl);
  }

  if (listEl){
    listEl.innerHTML = problems.length
      ? problems.slice(0, 6).map(problemCardHTML).join('')
      : `<div class="empty-state">${Icon.inbox}<p>No problems yet — <a href="register-problem.html" style="color:var(--glow);font-weight:600;">register the first one</a>.</p></div>`;
  }

  renderCategories(site, problems);
});
