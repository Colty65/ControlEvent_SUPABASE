/* ControlEvent v44.6.1 - Aviso pasivo de carga al cambiar de evento.
   Corrección sobre v44.6: no bloquea el desplegable, no intercepta clicks y no observa todo el DOM.
   Objetivo: informar al usuario sin interferir en la selección/carga real del evento. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v44.6.1';
  const VERSION_FILE = 'ControlEvent_v44_6_1';
  const MIN_VISIBLE_MS = 700;
  const SOFT_HIDE_MS = 4500;
  const MAX_VISIBLE_MS = 14000;

  const state = window.__ceV446LoadingState = window.__ceV446LoadingState || {
    active:false,
    eventId:'',
    startedAt:0,
    finishedAt:0,
    elapsedMs:0,
    phase:'reposo',
    lastReason:'',
    lastCompletedMs:0,
    lastCompletedAt:'',
    changes:0,
    preventedClicks:0,
    restoredSelects:0,
    preservedOptions:0,
    passive:true
  };

  let overlay = null;
  let styleInstalled = false;
  let minTimer = null;
  let softTimer = null;
  let maxTimer = null;
  let installed = false;

  function now(){ return (performance && performance.now) ? performance.now() : Date.now(); }
  function $(id){ return document.getElementById(id); }
  function txt(v){ return String(v == null ? '' : v); }

  function installStyle(){
    if(styleInstalled || $('ceV446Style')) return;
    styleInstalled = true;
    const style = document.createElement('style');
    style.id = 'ceV446Style';
    style.textContent = `
      body.ce-v446-event-loading{cursor:progress!important}
      #ceV446LoadingOverlay{position:fixed!important;inset:0!important;z-index:2147483000!important;display:none!important;align-items:center!important;justify-content:center!important;padding:18px!important;background:rgba(15,23,42,.30)!important;backdrop-filter:blur(1.5px)!important;-webkit-backdrop-filter:blur(1.5px)!important;box-sizing:border-box!important;pointer-events:none!important}
      #ceV446LoadingOverlay.open{display:flex!important}
      #ceV446LoadingOverlay .ce-v446-card{width:min(430px,calc(100vw - 28px))!important;border-radius:22px!important;background:rgba(17,24,39,.96)!important;color:#fff!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:0 24px 80px rgba(0,0,0,.42)!important;padding:22px!important;text-align:center!important;font-family:system-ui,-apple-system,Segoe UI,sans-serif!important;pointer-events:none!important}
      #ceV446LoadingOverlay .ce-v446-title{font-size:20px!important;font-weight:900!important;margin:0 0 8px!important;letter-spacing:.01em!important}
      #ceV446LoadingOverlay .ce-v446-sub{font-size:13px!important;color:#d1d5db!important;margin:0 0 14px!important;line-height:1.35!important}
      #ceV446LoadingOverlay .ce-v446-pill{display:inline-block!important;border-radius:999px!important;background:#fbbf24!important;color:#111827!important;font-weight:900!important;font-size:12px!important;padding:7px 12px!important;margin-bottom:14px!important}
      #ceV446LoadingOverlay .ce-v446-bar{height:8px!important;border-radius:999px!important;background:rgba(255,255,255,.16)!important;overflow:hidden!important;margin:4px 0 0!important}
      #ceV446LoadingOverlay .ce-v446-bar span{display:block!important;height:100%!important;width:38%!important;border-radius:999px!important;background:#fbbf24!important;animation:ceV446Move 1.1s ease-in-out infinite!important}
      @keyframes ceV446Move{0%{transform:translateX(-110%)}50%{transform:translateX(85%)}100%{transform:translateX(250%)}}
      @media(max-width:760px){#ceV446LoadingOverlay{align-items:flex-start!important;padding-top:18vh!important}.ce-v446-card{padding:18px!important}.ce-v446-title{font-size:18px!important}}
    `;
    document.head.appendChild(style);
  }

  function ensureOverlay(){
    installStyle();
    if(overlay && document.body.contains(overlay)) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'ceV446LoadingOverlay';
    overlay.setAttribute('role','status');
    overlay.setAttribute('aria-live','polite');
    overlay.innerHTML = `
      <div class="ce-v446-card">
        <div class="ce-v446-pill">ControlEvent v44.6.1</div>
        <div class="ce-v446-title">Cargando nuevo evento...</div>
        <p class="ce-v446-sub">Preparando datos y pantallas del evento seleccionado.</p>
        <div class="ce-v446-bar"><span></span></div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function dispatch(name, detail){
    try{ window.dispatchEvent(new CustomEvent('controlevent:event-loading-' + name, {detail: Object.assign({state}, detail || {})})); }catch(_){ }
  }

  function clearTimers(){
    clearTimeout(minTimer); clearTimeout(softTimer); clearTimeout(maxTimer);
    minTimer = softTimer = maxTimer = null;
  }

  function start(eventId, reason){
    if(!eventId) return;
    clearTimers();
    state.active = true;
    state.eventId = txt(eventId);
    state.startedAt = now();
    state.finishedAt = 0;
    state.elapsedMs = 0;
    state.phase = 'cambiando-evento-aviso-pasivo';
    state.lastReason = reason || 'selectedEvent.change';
    state.changes += 1;
    state.passive = true;
    state.preventedClicks = state.preventedClicks || 0; // no se incrementa: v44.6.1 no bloquea clicks.
    ensureOverlay().classList.add('open');
    document.body.classList.add('ce-v446-event-loading');
    dispatch('start', {eventId: state.eventId, reason: state.lastReason});

    // Ocultación segura: no depende de MutationObserver ni de recorridos de DOM.
    minTimer = setTimeout(() => { state.phase = 'cargando'; }, MIN_VISIBLE_MS);
    softTimer = setTimeout(() => finish('soft-time'), SOFT_HIDE_MS);
    maxTimer = setTimeout(() => finish('max-time'), MAX_VISIBLE_MS);
  }

  function finish(reason){
    if(!state.active) return;
    clearTimers();
    state.active = false;
    state.finishedAt = now();
    state.elapsedMs = Math.round(state.finishedAt - state.startedAt);
    state.lastCompletedMs = state.elapsedMs;
    state.lastCompletedAt = new Date().toLocaleTimeString();
    state.phase = 'completado-' + (reason || 'ready');
    if(overlay) overlay.classList.remove('open');
    document.body.classList.remove('ce-v446-event-loading');
    dispatch('done', {eventId: state.eventId, reason: reason || 'ready', elapsedMs: state.elapsedMs});
  }

  function scheduleFinish(reason, delay){
    if(!state.active) return;
    setTimeout(() => finish(reason), delay || 0);
  }

  function installEventHooks(){
    if(document.__ceV446LoadingInstalled) return;
    document.__ceV446LoadingInstalled = true;

    // Importante: escucha en burbuja, no en captura, para no interferir en los manejadores reales del cambio de evento.
    document.addEventListener('change', event => {
      const sel = event.target;
      if(!sel || sel.id !== 'selectedEvent') return;
      const id = txt(sel.value);
      if(!id) return;
      setTimeout(() => start(id, 'selectedEvent.change'), 0);
    }, false);

    // Estos eventos solo ayudan a ocultar el aviso antes si la app ya ha montado pantalla. No bloquean nada.
    ['controlevent:module-mounted','controlevent:app-ready','controlevent:runtime-ready','controlevent:event-ready'].forEach(name => {
      window.addEventListener(name, () => scheduleFinish(name, 450));
    });
  }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
      const t = el.textContent || '';
      if(/ControlEvent\s+v\d+(?:\.\d+)*/.test(t)) el.textContent = t.replace(/ControlEvent\s+v\d+(?:\.\d+)*/g, VERSION);
    });
    try{ document.body.dataset.ceVersion = VERSION; }catch(_){ }
  }

  function install(){
    if(installed) return;
    installed = true;
    installStyle();
    installEventHooks();
    applyVersion();
    setTimeout(applyVersion, 350);
    setTimeout(applyVersion, 1200);
  }

  window.ControlEventV446 = {version:VERSION, versionFile:VERSION_FILE, start, finish, state, mode:'passive'};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
