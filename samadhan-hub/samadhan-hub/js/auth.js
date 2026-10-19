document.addEventListener('DOMContentLoaded', () => {
  // password show/hide toggle for any .pw-toggle field
  document.querySelectorAll('.pw-toggle').forEach(group => {
    const input = group.querySelector('input');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.innerHTML = Icon.eye;
    btn.setAttribute('aria-label', 'Show password');
    group.appendChild(btn);
    btn.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.innerHTML = showing ? Icon.eye : Icon.eyeOff;
    });
  });

  const loginForm = document.getElementById('loginForm');
  if (loginForm){
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('authMessage');
      msg.textContent = ''; msg.className = 'form-message';
      const fd = new FormData(loginForm);
      const submitBtn = loginForm.querySelector('button[type=submit]');
      submitBtn.disabled = true;
      try{
        const data = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: fd.get('email'), password: fd.get('password') })
        });
        Auth.setSession(data.token, data.user);
        msg.textContent = 'Welcome back — redirecting…';
        msg.className = 'form-message success';
        const redirect = sessionStorage.getItem('sh_redirect');
        sessionStorage.removeItem('sh_redirect');
        setTimeout(() => location.href = redirect || 'index.html', 500);
      }catch(err){
        msg.textContent = err.message;
        msg.className = 'form-message error';
      }finally{
        submitBtn.disabled = false;
      }
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm){
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = document.getElementById('authMessage');
      msg.textContent = ''; msg.className = 'form-message';
      const fd = new FormData(registerForm);
      if (String(fd.get('password')).length < 6){
        msg.textContent = 'Password must be at least 6 characters.';
        msg.className = 'form-message error';
        return;
      }
      const submitBtn = registerForm.querySelector('button[type=submit]');
      submitBtn.disabled = true;
      try{
        const data = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            name: fd.get('name'), email: fd.get('email'), password: fd.get('password')
          })
        });
        Auth.setSession(data.token, data.user);
        msg.textContent = 'Account created — redirecting…';
        msg.className = 'form-message success';
        setTimeout(() => location.href = 'index.html', 500);
      }catch(err){
        msg.textContent = err.message;
        msg.className = 'form-message error';
      }finally{
        submitBtn.disabled = false;
      }
    });
  }
});
