(function(){
  'use strict';
  const RUN_KEY = 'controlevent_v85_ticket_images_housekeeping_fix11';
  const SESSION_KEY = 'controlevent_v85_ticket_images_housekeeping_fix11_session';
  function apiBase(){
    const base = (window.__API_BASE__ || '').replace(/\/$/, '');
    return base || '';
  }
  function shouldRun(){
    try{
      if(sessionStorage.getItem(SESSION_KEY) === '1') return false;
      const last = Number(localStorage.getItem(RUN_KEY) || '0');
      // Una vez al dia como maximo por navegador. No bloquea el uso normal.
      return !last || (Date.now() - last) > 23 * 60 * 60 * 1000;
    }catch(_){ return true; }
  }
  function markRun(){
    try{ sessionStorage.setItem(SESSION_KEY, '1'); }catch(_){}
    try{ localStorage.setItem(RUN_KEY, String(Date.now())); }catch(_){}
  }
  async function runCleanup(){
    if(!shouldRun()) return;
    markRun();
    try{
      const res = await fetch(apiBase() + '/api/ticket-images/cleanup-orphans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'v8.5_fix11_auto' }),
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if(data && data.ok){
        window.__CE_TICKET_IMAGES_CLEANUP__ = data;
        if((data.deletedRows || data.updatedRows) && window.console){
          console.info('[ControlEvent v8.5] Limpieza ce_ticket_images', data);
        }
      }
    }catch(err){
      if(window.console) console.warn('[ControlEvent v8.5] Limpieza ce_ticket_images no ejecutada:', err && err.message ? err.message : err);
    }
  }
  // Lo lanzamos diferido para no perjudicar arranque/rendimiento.
  window.addEventListener('load', function(){ setTimeout(runCleanup, 3500); }, { once:true });
  window.ControlEventTicketImagesCleanup = runCleanup;
})();
