// =====================================================
// SamadhanHub — PWA: service worker registration + install prompt
// =====================================================
(function(){
  // Inside the packaged native app (Capacitor) there's no separate server
  // origin to cache against and nothing to "install" — skip both entirely.
  if (window.Capacitor) return;

  if ('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (isStandalone) return; // already installed — no need to pitch it

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  let deferred = null;

  function card(html){
    const el = document.createElement('div');
    el.className = 'install-card';
    el.innerHTML = html;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    return el;
  }

  function dismissFor(days, key){
    localStorage.setItem(key, String(Date.now() + days * 86400000));
  }
  function isDismissed(key){
    const until = parseInt(localStorage.getItem(key) || '0', 10);
    return Date.now() < until;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    if (isDismissed('sh_install_dismiss')) return;
    setTimeout(showAndroidCard, 2500);
  });

  function showAndroidCard(){
    if (document.querySelector('.install-card') || !deferred) return;
    const el = card(`
      <img src="images/icons/icon-96.png" alt="" width="40" height="40">
      <div class="install-copy"><strong>Install SamadhanHub</strong><span>Add the app to your home screen for one-tap access.</span></div>
      <button type="button" class="btn btn-primary btn-sm" id="installGo">Install</button>
      <button type="button" class="install-close" id="installNo" aria-label="Dismiss">${typeof Icon !== 'undefined' ? Icon.x : '✕'}</button>
    `);
    el.querySelector('#installGo').onclick = async () => {
      el.remove();
      if (!deferred) return;
      deferred.prompt();
      await deferred.userChoice;
      deferred = null;
    };
    el.querySelector('#installNo').onclick = () => { dismissFor(14, 'sh_install_dismiss'); el.remove(); };
  }

  function showIOSCard(){
    if (isDismissed('sh_ios_install_dismiss') || document.querySelector('.install-card')) return;
    const el = card(`
      <img src="images/icons/icon-96.png" alt="" width="40" height="40">
      <div class="install-copy"><strong>Install SamadhanHub</strong><span>Tap Share <b>⬆</b>, then "Add to Home Screen".</span></div>
      <button type="button" class="install-close" id="iosNo" aria-label="Dismiss">${typeof Icon !== 'undefined' ? Icon.x : '✕'}</button>
    `);
    el.querySelector('#iosNo').onclick = () => { dismissFor(14, 'sh_ios_install_dismiss'); el.remove(); };
  }

  if (isIOS) setTimeout(showIOSCard, 3000);

  window.addEventListener('appinstalled', () => {
    document.querySelectorAll('.install-card').forEach((e) => e.remove());
    if (typeof showToast === 'function') showToast('Installed! Open SamadhanHub from your home screen anytime.');
  });
})();
