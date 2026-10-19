document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('problemList');
  const searchInput = document.getElementById('searchInput');
  const categoryFilter = document.getElementById('categoryFilter');
  const statusFilter = document.getElementById('statusFilter');
  let debounceTimer;
  const preset = new URLSearchParams(location.search).get('category');
  if (preset) categoryFilter.value = preset;

  async function load(){
    list.innerHTML = `<p class="muted">Loading problems…</p>`;
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (categoryFilter.value) params.set('category', categoryFilter.value);
    if (statusFilter.value) params.set('status', statusFilter.value);

    try{
      let problems;
      try{
        problems = await apiFetch('/problems?' + params.toString());
      }catch(apiErr){
        const site = await loadSite();
        if (!site) throw apiErr;
        showPreviewBanner();
        problems = sampleProblems(site, {
          search: searchInput.value, category: categoryFilter.value, status: statusFilter.value
        });
      }
      if (!problems.length){
        list.innerHTML = `<div class="empty-state">${Icon.inbox}<p>No problems match your filters yet. Try clearing them, or be the first to <a href="register-problem.html" style="color:var(--teal);font-weight:600;">register one</a>.</p></div>`;
        return;
      }
      list.innerHTML = problems.map(problemCardHTML).join('');
    }catch(err){
      list.innerHTML = `<div class="empty-state">${Icon.x}<p>${escapeHtml(err.message)}</p></div>`;
    }
  }

  searchInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(load, 300); });
  categoryFilter.addEventListener('change', load);
  statusFilter.addEventListener('change', load);

  load();
});
