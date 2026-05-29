/* ControlEvent v50.27 - Salir duro y logon limpio.
   Objetivo: reproducir el estado que funciona con Ctrl+F5 + nuevo login.
   No rehidrata globos, no usa MutationObserver, no usa setInterval. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.27';
  const VERSION_FILE = 'ControlEvent_v50_27';
  if(window.__ceV5027HardLogout) return;
  window.__ceV5027HardLogout = true;

  const $ = id => document.getElementById(id);
  const safe = fn => { try{ return fn(); }catch(_){ return undefined; } };
  const logoutSelectors = '#btnLogout,#ceBtnSalirV518,[data-ce-action="logout"],[data-action="logout"]';

  function replaceVersionText(text){
    return String(text || '')
      .replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION)
      .replace(/ControlEvent_v\d+(?:_\d+)*/ig, VERSION_FILE);
  }


  function patchVersionSetters(){
    if(window.__ceV5027VersionSetters) return;
    window.__ceV5027VersionSetters = true;
    try{
      const desc = Object.getOwnPropertyDescriptor(Node.prototype, 'textContent');
      if(desc && desc.set && desc.get){
        Object.defineProperty(Node.prototype, 'textContent', {
          configurable: true,
          get: function(){ return desc.get.call(this); },
          set: function(value){
            try{
              if(this?.matches?.('.appname span,.appname-stack span,[data-ce-version-label]')) value = replaceVersionText(value);
            }catch(_){ }
            return desc.set.call(this, value);
          }
        });
      }
    }catch(_){ }
  }

  function applyVersion(){
    safe(() => { document.title = VERSION; });
    safe(() => { document.documentElement.dataset.ceVersion = VERSION; });
    safe(() => { if(document.body) document.body.dataset.ceVersion = VERSION; });
    safe(() => { window.__ceVersion = VERSION; window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; });
    safe(() => { window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; });
    safe(() => {
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const next = replaceVersionText(el.textContent || '');
        if(next && next !== el.textContent) el.textContent = next;
      });
    });
    safe(() => {
      if(typeof window.emittedByTextV171 === 'function' && !window.emittedByTextV171.__ceV5027Wrapped){
        const old = window.emittedByTextV171;
        const wrapped = function(){ return replaceVersionText(old.apply(this, arguments)); };
        wrapped.__ceV5027Wrapped = true;
        window.emittedByTextV171 = wrapped;
        try{ emittedByTextV171 = wrapped; }catch(_){ }
      }
    });
  }

  function shouldRemoveKey(key){
    const k = String(key || '');
    return /^(ControlEvent_|controlevent_|ce_)/i.test(k) && (
      /session/i.test(k) || /selected.*event/i.test(k) || /event.*chosen/i.test(k) ||
      /force.*event/i.test(k) || /awaiting.*event/i.test(k) || /user.*picked/i.test(k) ||
      /logout/i.test(k) || /login/i.test(k) || /auth/i.test(k)
    );
  }

  function cleanStorage(){
    [window.sessionStorage, window.localStorage].forEach(store => {
      safe(() => {
        const keys = [];
        for(let i=0; i<store.length; i += 1) keys.push(store.key(i));
        keys.forEach(key => { if(shouldRemoveKey(key)) store.removeItem(key); });
      });
    });
    [
      'ControlEvent_v50_27_session','ControlEvent_v50_26_session','ControlEvent_v50_25_session','ControlEvent_v50_24_session','ControlEvent_v26_9_session',
      'ce_v250_event_chosen','ce_event_chosen','controlevent_v44_event_chosen_after_login',
      'controlevent_v229_selected_event_id','ControlEvent_v50_27_selected_event','ControlEvent_v50_26_selected_event','ControlEvent_v50_25_selected_event','ControlEvent_v50_24_selected_event'
    ].forEach(key => { safe(() => sessionStorage.removeItem(key)); safe(() => localStorage.removeItem(key)); });
  }

  function clearRuntime(){
    safe(() => { if(typeof authUser !== 'undefined') authUser = null; });
    safe(() => { window.authUser = null; });
    safe(() => { window.__CONTROL_EVENT_USER__ = null; });
    safe(() => { if(window.ControlEventApp) window.ControlEventApp.authUser = null; });
    safe(() => { if(window.ControlEventRuntime?.app) window.ControlEventRuntime.app.authUser = null; });
    safe(() => { if(typeof state !== 'undefined' && state) state.selectedEventId = ''; });
    safe(() => { if(window.state) window.state.selectedEventId = ''; });
    const sel = $('selectedEvent');
    if(sel) safe(() => { sel.value = ''; });
  }

  function hardLogout(event){
    if(window.__ceV5027LogoutRunning) return false;
    window.__ceV5027LogoutRunning = true;
    if(event){
      safe(() => event.preventDefault());
      safe(() => event.stopPropagation());
      safe(() => event.stopImmediatePropagation());
    }
    cleanStorage();
    clearRuntime();
    safe(() => fetch('/api/logout', {method:'POST', cache:'no-store', keepalive:true}).catch(()=>{}));
    safe(() => { sessionStorage.setItem('ControlEvent_v50_27_hard_logout_at', String(Date.now())); });
    const base = window.location.origin + window.location.pathname;
    window.location.replace(base + '?ce_hard_logout=' + Date.now());
    return false;
  }

  function isLogoutTarget(target){
    if(!target) return false;
    const el = target.closest?.(logoutSelectors);
    if(el) return true;
    const btn = target.closest?.('button,a,[role="button"]');
    const txt = String(btn?.textContent || '').trim().toUpperCase();
    return txt === 'SALIR';
  }

  function logoutCapture(event){
    if(isLogoutTarget(event.target)) return hardLogout(event);
  }

  function cleanHardLogoutUrl(){
    const params = new URLSearchParams(window.location.search || '');
    if(!params.has('ce_hard_logout')) return;
    cleanStorage();
    clearRuntime();
    safe(() => {
      const clean = window.location.origin + window.location.pathname + (window.location.hash || '');
      window.history.replaceState(null, '', clean);
    });
  }

  function ensureLoginCleanAfterHardLogout(){
    const recent = Number(safe(() => sessionStorage.getItem('ControlEvent_v50_27_hard_logout_at')) || 0);
    if(!recent || Date.now() - recent > 12000) return;
    cleanStorage();
    clearRuntime();
    const ov = $('authOverlay');
    if(ov){
      ov.classList.remove('hidden');
      ov.removeAttribute('aria-hidden');
      ov.style.removeProperty('display');
      ov.style.removeProperty('visibility');
      ov.style.removeProperty('pointer-events');
    }
    safe(() => document.body.classList.add('auth-locked'));
    const ident = $('loginIdentificacion');
    const pass = $('loginClave');
    [ident, pass].forEach(el => { if(el){ el.disabled = false; el.readOnly = false; } });
    safe(() => ident?.focus?.());
  }

  function install(){
    patchVersionSetters();
    cleanHardLogoutUrl();
    applyVersion();
    ensureLoginCleanAfterHardLogout();
  }

  // Captura antes del click antiguo: en móvil/PC evita que los manejadores viejos de Salir ensucien el estado.
  ['pointerdown','mousedown','touchstart','click'].forEach(type => {
    window.addEventListener(type, logoutCapture, {capture:true, passive:false});
    document.addEventListener(type, logoutCapture, {capture:true, passive:false});
  });
  window.addEventListener('keydown', event => {
    if((event.key === 'Enter' || event.key === ' ') && isLogoutTarget(event.target)) return hardLogout(event);
  }, true);

  window.ControlEventV5027 = {version:VERSION, versionFile:VERSION_FILE, hardLogout, applyVersion, cleanStorage};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  window.addEventListener('load', () => setTimeout(install, 60), {once:true});
  setTimeout(install, 250);
})();
