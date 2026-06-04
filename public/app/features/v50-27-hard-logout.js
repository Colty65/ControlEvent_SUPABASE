/* ControlEvent v8.4.1_prod - Salir duro y logon limpio.
   Objetivo: reproducir el estado que funciona con Ctrl+F5 + nuevo login.
   No rehidrata globos, no usa MutationObserver, no usa setInterval. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v8.4.1_prod';
  const VERSION_FILE = 'ControlEvent_v8_4_1_prod';
  if(window.__ceV5027HardLogout) return;
  window.__ceV5027HardLogout = true;

  const $ = id => document.getElementById(id);
  const safe = fn => { try{ return fn(); }catch(_){ return undefined; } };
  const logoutSelectors = '#btnLogout,#ceBtnSalirV518,[data-ce-action="logout"],[data-action="logout"]';

  function stampV300(date = new Date()){
    const p = n => String(n).padStart(2, '0');
    return {ymd: `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}`, hms: `${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`};
  }

  function normalizeYmdV300(value){
    const s = String(value || '');
    if(/^20\d{6}$/.test(s)) return s;
    if(/^\d{8}$/.test(s)) return `${s.slice(4)}${s.slice(2,4)}${s.slice(0,2)}`;
    return stampV300().ymd;
  }

  function normalizeDownloadNameV300(text){
    let out = String(text || '');
    if(!/\.xlsx(?:$|\?)/i.test(out)) return out;
    out = out.replace(new RegExp(`(${VERSION_FILE}_INFOEVENTO-.+?)_(\\d{8})(?:[-_](\\d{2})[:_]*(\\d{2})[:_]*(\\d{2}))?\\.xlsx$`, 'i'), (_m, prefix, date, hh, mi, ss) => {
      const fallback = stampV300();
      return `${prefix}_${normalizeYmdV300(date)}_${hh && mi && ss ? `${hh}${mi}${ss}` : fallback.hms}.xlsx`;
    });
    out = out.replace(new RegExp(`(${VERSION_FILE}_BACKUP_.+?)_(\\d{8})(?:[-_](\\d{2})[:_]*(\\d{2})[:_]*(\\d{2}))?\\.xlsx$`, 'i'), (_m, prefix, date, hh, mi, ss) => {
      const fallback = stampV300();
      return `${prefix}_${normalizeYmdV300(date)}_${hh && mi && ss ? `${hh}${mi}${ss}` : fallback.hms}.xlsx`;
    });
    return out;
  }

  function escapeRegExpV300(text){
    return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function replaceVersionFilePrefixV300(text){
    const out = String(text || '')
      .replace(/ControlEvent_v\d+(?:_\d+){1,3}(?:_prod)+(?=_(?:INFOEVENTO|BACKUP|descarga_datos)(?=[_.-])|\.xlsx(?:$|\?|\b)|$)/ig, VERSION_FILE)
      .replace(/ControlEvent_v\d+(?:_\d+){1,3}(?=_(?:INFOEVENTO|BACKUP|descarga_datos)(?=[_.-])|\.xlsx(?:$|\?|\b)|$)/ig, VERSION_FILE);
    return out.replace(new RegExp(`${escapeRegExpV300(VERSION_FILE)}(?:_prod)+(?=_(?:INFOEVENTO|BACKUP|descarga_datos)(?=[_.-])|\\.xlsx(?:$|\\?|\\b)|$)`, 'ig'), VERSION_FILE);
  }

  function replaceVersionText(text){
    return normalizeDownloadNameV300(replaceVersionFilePrefixV300(String(text || '')
      .replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION)));
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
      'ControlEvent_v8_4_1_prod_session','ControlEvent_v8_4_1_prod_session','ControlEvent_v8_4_1_prod_session','ControlEvent_v8_4_1_prod_session','ControlEvent_v26_9_session',
      'ce_v250_event_chosen','ce_event_chosen','controlevent_v44_event_chosen_after_login',
      'controlevent_v229_selected_event_id','ControlEvent_v8_4_1_prod_selected_event','ControlEvent_v8_4_1_prod_selected_event','ControlEvent_v8_4_1_prod_selected_event','ControlEvent_v8_4_1_prod_selected_event'
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
    safe(() => { sessionStorage.setItem('ControlEvent_v8_4_1_prod_hard_logout_at', String(Date.now())); });
    safe(() => { window.authUser = null; window.__CONTROL_EVENT_USER__ = null; if(window.ControlEventApp) window.ControlEventApp.authUser = null; });
    const ov = $('authOverlay');
    if(ov){
      ov.classList.remove('hidden'); ov.removeAttribute('hidden'); ov.setAttribute('aria-hidden','false');
      ov.style.setProperty('display','flex','important'); ov.style.setProperty('visibility','visible','important'); ov.style.setProperty('opacity','1','important'); ov.style.setProperty('pointer-events','auto','important'); ov.style.setProperty('z-index','300000','important');
    }
    safe(() => document.body.classList.remove('ce-v5019-authenticated','ce-v5019-has-event','ce-v5020-has-event','ce-v5022-has-event','ce-v5025-has-event','ce-v5026-has-event'));
    safe(() => document.body.classList.add('auth-locked','ce-v5019-logged-out','ce-v5019-awaiting-event'));
    ['loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    setTimeout(() => { window.__ceV5027LogoutRunning = false; }, 250);
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
    const recent = Number(safe(() => sessionStorage.getItem('ControlEvent_v8_4_1_prod_hard_logout_at')) || 0);
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
