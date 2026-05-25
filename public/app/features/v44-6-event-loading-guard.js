/* ControlEvent v44.6 - Capa de carga segura al cambiar de evento.
   Alcance: no cambia guardado, Excel, gráficos ni formularios. Solo bloquea la interacción
   mientras el evento nuevo se recompone y preserva el desplegable de eventos. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v44.6';
  const VERSION_FILE = 'ControlEvent_v44_6';
  const MIN_VISIBLE_MS = 900;
  const QUIET_MS = 850;
  const MAX_VISIBLE_MS = 26000;
  const CHECK_MS = 180;

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
    preservedOptions:0
  };

  let overlay = null;
  let styleInstalled = false;
  let selectSnapshot = null;
  let selectObserver = null;
  let bodyObserver = null;
  let finishTimer = null;
  let maxTimer = null;
  let checkTimer = null;
  let lastMutationAt = 0;
  let installed = false;

  function now(){ return (performance && performance.now) ? performance.now() : Date.now(); }
  function $(id){ return document.getElementById(id); }
  function txt(v){ return String(v == null ? '' : v); }
  function isMobileLike(){ return matchMedia('(max-width: 900px), (pointer: coarse)').matches; }

  function appState(){ return window.ControlEventApp?.state || window.state || {}; }
  function nav(){ return window.ControlEventApp?.navigation || {}; }
  function currentTab(){ return txt(nav().currentMainTab || window.__ceCurrentMainTab || safe(() => currentMainTab, '') || ''); }
  function selectedEventId(){ return txt(appState().selectedEventId || $('selectedEvent')?.value || ''); }
  function safe(fn, fallback){ try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } }

  function installStyle(){
    if(styleInstalled || $('ceV446Style')) return;
    styleInstalled = true;
    const style = document.createElement('style');
    style.id = 'ceV446Style';
    style.textContent = `
      body.ce-v446-event-loading{cursor:progress!important}
      body.ce-v446-event-loading .app-lockable,
      body.ce-v446-event-loading .footer,
      body.ce-v446-event-loading .tabs{pointer-events:none!important;user-select:none!important}
      body.ce-v446-event-loading #selectedEvent{opacity:.72!important;cursor:progress!important}
      #ceV446LoadingOverlay{position:fixed!important;inset:0!important;z-index:2147483000!important;display:none!important;align-items:center!important;justify-content:center!important;padding:18px!important;background:rgba(15,23,42,.42)!important;backdrop-filter:blur(2px)!important;-webkit-backdrop-filter:blur(2px)!important;box-sizing:border-box!important}
      #ceV446LoadingOverlay.open{display:flex!important}
      #ceV446LoadingOverlay .ce-v446-card{width:min(430px,calc(100vw - 28px))!important;border-radius:22px!important;background:rgba(17,24,39,.96)!important;color:#fff!important;border:1px solid rgba(255,255,255,.16)!important;box-shadow:0 24px 80px rgba(0,0,0,.42)!important;padding:22px!important;text-align:center!important;font-family:system-ui,-apple-system,Segoe UI,sans-serif!important}
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
        <div class="ce-v446-pill">ControlEvent v44.6</div>
        <div class="ce-v446-title">Cargando nuevo evento...</div>
        <p class="ce-v446-sub">Preparando datos y pantallas del evento seleccionado. Espera un momento antes de tocar la app.</p>
        <div class="ce-v446-bar"><span></span></div>
      </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function snapshotSelect(){
    const sel = $('selectedEvent');
    if(!sel) return null;
    const options = Array.from(sel.options || []).map(opt => ({value: opt.value, text: opt.text, selected: opt.selected, disabled: opt.disabled}));
    if(options.length) {
      selectSnapshot = {options, value: sel.value, at: Date.now()};
      state.preservedOptions = options.length;
    }
    return selectSnapshot;
  }

  function restoreSelectIfNeeded(){
    const sel = $('selectedEvent');
    if(!sel || !selectSnapshot || !selectSnapshot.options?.length) return false;
    const nonEmpty = Array.from(sel.options || []).filter(opt => opt.value !== '').length;
    const snapshotNonEmpty = selectSnapshot.options.filter(opt => opt.value !== '').length;
    if(nonEmpty >= snapshotNonEmpty && sel.options.length) return false;
    const currentValue = state.eventId || selectSnapshot.value || sel.value;
    sel.replaceChildren();
    selectSnapshot.options.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.value;
      opt.text = item.text;
      opt.disabled = !!item.disabled;
      opt.selected = String(item.value) === String(currentValue);
      sel.appendChild(opt);
    });
    sel.value = currentValue;
    state.restoredSelects += 1;
    return true;
  }

  function preserveSelectDuringLoading(){
    const sel = $('selectedEvent');
    if(!sel || selectObserver) return;
    selectObserver = new MutationObserver(() => {
      if(!state.active) return;
      restoreSelectIfNeeded();
    });
    try{ selectObserver.observe(sel, {childList:true, subtree:false}); }catch(_){ }
  }

  function markMutation(){ lastMutationAt = now(); }
  function watchMutations(){
    if(bodyObserver || typeof MutationObserver !== 'function') return;
    bodyObserver = new MutationObserver(list => {
      if(!state.active) return;
      // Ignora cambios dentro del propio overlay/PERF para no alargar artificialmente la carga.
      for(const m of list){
        const target = m.target;
        if(target && (target.id === 'ceV446LoadingOverlay' || target.closest?.('#ceV446LoadingOverlay,#cePerf442Panel'))) continue;
        markMutation();
        break;
      }
    });
    try{ bodyObserver.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:['class','style']}); }catch(_){ }
  }

  function setDisabled(disabled){
    const sel = $('selectedEvent');
    if(sel){
      if(disabled){ sel.dataset.ceV446WasDisabled = sel.disabled ? '1' : '0'; sel.disabled = true; }
      else if(sel.dataset.ceV446WasDisabled !== '1'){ sel.disabled = false; }
    }
  }

  function dispatch(name, detail){
    try{ window.dispatchEvent(new CustomEvent('controlevent:event-loading-' + name, {detail: Object.assign({state}, detail || {})})); }catch(_){ }
  }

  function start(eventId, reason){
    if(!eventId) return;
    snapshotSelect();
    preserveSelectDuringLoading();
    watchMutations();
    clearTimeout(finishTimer); clearTimeout(maxTimer); clearTimeout(checkTimer);
    state.active = true;
    state.eventId = txt(eventId);
    state.startedAt = now();
    state.finishedAt = 0;
    state.elapsedMs = 0;
    state.phase = 'cambiando-evento';
    state.lastReason = reason || 'selectedEvent.change';
    state.changes += 1;
    markMutation();
    ensureOverlay().classList.add('open');
    document.body.classList.add('ce-v446-event-loading');
    setDisabled(true);
    dispatch('start', {eventId: state.eventId, reason: state.lastReason});
    maxTimer = setTimeout(() => finish('max-time'), MAX_VISIBLE_MS);
    checkTimer = setTimeout(checkReady, MIN_VISIBLE_MS);
  }

  function activeScreenReady(){
    const tab = currentTab();
    if(!tab) return false;
    if(tab === 'graficas'){
      const wrap = $('eventChartWrap');
      if(!wrap) return false;
      // Evita retirar el aviso si solo está el gráfico antiguo de barras o si está vacío.
      return !!wrap.querySelector('.ce-v434-pie-card,.ce-v434-chart-layout-shell,svg,canvas');
    }
    if(tab === 'resumen') return !!($('budgetLayout')?.children?.length || $('summarySegmento')?.children?.length || $('summaryDestino')?.children?.length);
    if(tab === 'compras') return !!$('comprasList');
    if(tab === 'donaciones') return !!$('donacionesList');
    if(tab === 'ingresos') return !!$('collabList');
    if(tab === 'mapa') return !!($('mapaProductosList') || $('mapaProductosSummary'));
    return true;
  }

  function checkReady(){
    if(!state.active) return;
    restoreSelectIfNeeded();
    const elapsed = now() - state.startedAt;
    const quiet = now() - lastMutationAt;
    state.elapsedMs = Math.round(elapsed);
    state.phase = activeScreenReady() ? 'esperando-estabilidad' : 'renderizando';
    dispatch('tick', {elapsedMs: state.elapsedMs, phase: state.phase, quietMs: Math.round(quiet)});
    if(elapsed >= MIN_VISIBLE_MS && quiet >= QUIET_MS && activeScreenReady()){
      finish('ready');
      return;
    }
    checkTimer = setTimeout(checkReady, CHECK_MS);
  }

  function finish(reason){
    if(!state.active) return;
    clearTimeout(finishTimer); clearTimeout(maxTimer); clearTimeout(checkTimer);
    restoreSelectIfNeeded();
    state.active = false;
    state.finishedAt = now();
    state.elapsedMs = Math.round(state.finishedAt - state.startedAt);
    state.lastCompletedMs = state.elapsedMs;
    state.lastCompletedAt = new Date().toLocaleTimeString();
    state.phase = 'completado-' + (reason || 'ready');
    ensureOverlay().classList.remove('open');
    document.body.classList.remove('ce-v446-event-loading');
    setDisabled(false);
    dispatch('done', {eventId: state.eventId, reason: reason || 'ready', elapsedMs: state.elapsedMs});
  }

  function installEventHooks(){
    if(document.__ceV446LoadingInstalled) return;
    document.__ceV446LoadingInstalled = true;
    document.addEventListener('change', event => {
      const sel = event.target;
      if(!sel || sel.id !== 'selectedEvent') return;
      const id = txt(sel.value);
      if(!id) return;
      start(id, 'selectedEvent.change');
    }, true);

    // Si el usuario intenta tocar mientras se recompone el evento, se bloquea para evitar estados intermedios.
    document.addEventListener('click', event => {
      if(!state.active) return;
      const target = event.target;
      if(target?.closest?.('#ceV446LoadingOverlay,#cePerf442Panel,#cePerf442Button')) return;
      state.preventedClicks += 1;
      event.preventDefault();
      event.stopPropagation();
    }, true);

    ['controlevent:module-before-activate','controlevent:module-mounted','controlevent:app-ready','controlevent:runtime-ready'].forEach(name => {
      window.addEventListener(name, () => {
        if(!state.active) return;
        markMutation();
        setTimeout(checkReady, 120);
      });
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

  window.ControlEventV446 = {version:VERSION, versionFile:VERSION_FILE, start, finish, state, restoreSelectIfNeeded};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
})();
