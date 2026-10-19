document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const form = document.getElementById('problemForm');
  const msg = document.getElementById('formMessage');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    msg.textContent = ''; msg.className = 'form-message';
    const fd = new FormData(form);
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;

    try{
      const payload = {
        title: fd.get('title'),
        description: fd.get('description'),
        category: fd.get('category'),
        urgency: fd.get('urgency') || 'Normal',
        location: fd.get('location') || null,
        image: fd.get('image') || null
      };
      const problem = await apiFetch('/problems', { method: 'POST', body: JSON.stringify(payload) });
      msg.textContent = 'Problem published — redirecting…';
      msg.className = 'form-message success';
      setTimeout(() => location.href = `problem-details.html?id=${problem.id}`, 500);
    }catch(err){
      msg.textContent = err.message;
      msg.className = 'form-message error';
    }finally{
      submitBtn.disabled = false;
    }
  });
});
