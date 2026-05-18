/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #24. */
(function(){
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const canUseSW = () => 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1');

  if(canUseSW()){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(err => console.warn('ControlEvent PWA: no se pudo registrar sw.js', err));
    });
  }

  let deferredPrompt = null;
  function ensureInstallButton(){
    if(isStandalone() || document.getElementById('pwaInstallBtn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'pwaInstallBtn';
    btn.className = 'pwa-install-btn';
    btn.innerHTML = '📲 Instalar app';
    btn.addEventListener('click', async () => {
      if(deferredPrompt){
        deferredPrompt.prompt();
        try{ await deferredPrompt.userChoice; }catch(_){ }
        deferredPrompt = null;
        btn.classList.remove('visible');
        return;
      }
      if(isIOS()){
        alert('Para instalar ControlEvent en iPhone: abre esta página en Safari, pulsa Compartir y elige “Añadir a pantalla de inicio”. Después se abrirá como app, sin barra de navegador.');
      }else{
        alert('Para instalar ControlEvent: abre el menú del navegador y elige “Instalar app” o “Añadir a pantalla de inicio”.');
      }
    });
    document.body.appendChild(btn);
    if(deferredPrompt || isIOS()) btn.classList.add('visible');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    ensureInstallButton();
    const btn = document.getElementById('pwaInstallBtn');
    if(btn) btn.classList.add('visible');
  });

  window.addEventListener('appinstalled', () => {
    const btn = document.getElementById('pwaInstallBtn');
    if(btn) btn.classList.remove('visible');
  });

  window.addEventListener('load', () => {
    if(!isStandalone() && isIOS()) ensureInstallButton();
  });
})();
