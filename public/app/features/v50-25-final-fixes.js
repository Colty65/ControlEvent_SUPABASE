/* ControlEvent v1.0/pr - parche mínimo sobre v50.24.
   - Cambio de usuario tras Salir: al elegir evento se fuerza estado de evento listo y globos rehidratados.
   - Versión única visible y en descargas: ControlEvent v1.0/pr.
   - Sin MutationObserver global ni bucles permanentes. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v1.0/pr';
  const VERSION_FILE = 'ControlEvent_v1_0_pr';
  const INSTALLED = '__ceV5025FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const AWAITING_CLASSES = [
    'ce-v44-awaiting-event','ce-v5013-force-event-choice','ce-v5015-awaiting-event','ce-v5017-awaiting-event','ce-v5018-awaiting-event',
    'ce-v5019-awaiting-event','ce-v5021-awaiting-event','ce-v5022-awaiting-event','ce-v5024-awaiting-event','ce-v5025-awaiting-event',
    'ce-v5019-logged-out','ce-v5022-logged-out'
  ];
  const HAS_EVENT_CLASSES = ['ce-v5019-authenticated','ce-v5020-has-event','ce-v5022-has-event','ce-v5025-has-event'];
  const SESSION_KEYS_TO_CLEAR_ON_LOGOUT = ['ControlEvent_v50_25_session','ControlEvent_v50_24_session'];
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const events = () => Array.isArray(st().eventos) ? st().eventos : [];
  const currentEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const hasValidEvent = id => {
    const sid = String(id == null ? currentEventId() : id || '');
    return !!sid && events().some(ev => String(ev?.id || '') === sid);
  };

  function replaceVersionText(text){
    return String(text || '')
      .replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION)
      .replace(/ControlEvent_v\d+(?:_\d+)*/ig, VERSION_FILE);
  }

  function applyVersion(){
    try{
      document.title = VERSION;
      document.documentElement.dataset.ceVersion = VERSION;
      if(document.body) document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const next = replaceVersionText(el.textContent || '');
        if(next && next !== el.textContent) el.textContent = next;
      });
    }catch(_){ }
  }

  function patchDownloads(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV5025VersionFile){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = replaceVersionText(this.download); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV5025VersionFile = true;
        proto.click = wrapped;
      }
    }catch(_){ }
    document.addEventListener('click', ev => {
      const a = ev.target?.closest?.('a[download]');
      if(a && a.download) a.download = replaceVersionText(a.download);
    }, true);
  }

  function markEventReady(reason){
    if(!auth() || !hasValidEvent()) return;
    try{
      document.body.classList.remove('auth-locked', ...AWAITING_CLASSES);
      document.body.classList.add(...HAS_EVENT_CLASSES);
    }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.add('hidden');
      msg.setAttribute('aria-hidden','true');
      msg.style.setProperty('display','none','important');
      msg.style.setProperty('visibility','hidden','important');
      msg.style.setProperty('pointer-events','none','important');
      msg.style.setProperty('max-height','0','important');
      msg.style.setProperty('overflow','hidden','important');
    }
    try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
    try{ window.ControlEventV469?.hydrateEventReceipts?.(false); }catch(_){ }
    try{ window.ControlEventV469?.compactIngresoReceipts?.(); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
    try{ window.ControlEventV467?.enrichOpenTooltips?.(); }catch(_){ }
    applyVersion();
  }

  function hydrateSeries(reason){
    [0,80,220,520,1000,1800,3000].forEach(ms => setTimeout(() => markEventReady(reason), ms));
  }

  function installLogoutCleanup(){
    if(window.__ceV5025LogoutCleanup) return;
    window.__ceV5025LogoutCleanup = true;
    document.addEventListener('click', ev => {
      if(!ev.target?.closest?.('#btnLogout,#ceBtnSalirV518')) return;
      SESSION_KEYS_TO_CLEAR_ON_LOGOUT.forEach(k => { try{ localStorage.removeItem(k); }catch(_){ } });
      try{ window.__ceV5025LastLogoutAt = Date.now(); }catch(_){ }
    }, true);
  }

  function install(){
    applyVersion();
    patchDownloads();
    installLogoutCleanup();
    if(auth() && hasValidEvent()) hydrateSeries('install');
  }

  window.ControlEventV5025 = {version:VERSION, versionFile:VERSION_FILE, applyVersion, markEventReady, hydrateSeries};

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-ready'].forEach(evt => {
    window.addEventListener(evt, () => { applyVersion(); hydrateSeries(evt); });
  });
  [0,120,360,800,1500,2600,4200,6500].forEach(ms => setTimeout(() => { applyVersion(); if(auth() && hasValidEvent()) markEventReady('startup'); }, ms));
})();
