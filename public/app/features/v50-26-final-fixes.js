/* ControlEvent v23_prod - logon limpio y globos rehidratados sin bucles pesados.
   - Marca TODAS las claves de evento elegido, incluida la antigua ce_v250_event_chosen.
   - Tras cambio de usuario + eleccion de evento, rehidrata globos de Resumen y Graficas.
   - No usa MutationObserver global ni setInterval.
   - Mantiene Refres en sitio y version unificada. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v23_prod';
  const VERSION_FILE = 'ControlEvent_v23_prod';
  const INSTALLED = '__ceV5026FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const CHOSEN_KEYS = [
    'ce_v250_event_chosen',
    'controlevent_v44_event_chosen_after_login',
    'ControlEvent_v23_prod_event_chosen',
    'ControlEvent_v23_prod_event_chosen',
    'ControlEvent_v23_prod_event_chosen',
    'controlevent_v5022_user_picked_event',
    'ce_v5017_event_chosen','ce_v5016_event_chosen','ce_v5015_event_chosen','ce_v5013_user_picked_event'
  ];
  const SELECT_KEYS = ['controlevent_v229_selected_event_id','ControlEvent_v23_prod_selected_event','ControlEvent_v23_prod_selected_event','ControlEvent_v23_prod_selected_event'];
  const SESSION_KEYS = ['ControlEvent_v23_prod_session','ControlEvent_v23_prod_session','ControlEvent_v23_prod_session'];
  const AWAIT_CLASSES = ['ce-v44-awaiting-event','ce-v5013-force-event-choice','ce-v5015-awaiting-event','ce-v5017-awaiting-event','ce-v5018-awaiting-event','ce-v5019-awaiting-event','ce-v5021-awaiting-event','ce-v5022-awaiting-event','ce-v5024-awaiting-event','ce-v5025-awaiting-event','ce-v5026-awaiting-event'];
  const HAS_CLASSES = ['ce-v5019-authenticated','ce-v5020-has-event','ce-v5022-has-event','ce-v5025-has-event','ce-v5026-has-event'];
  const PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabDocumentos','tabPlanificacionInicial','tabResumen','tabGraficas'];

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);
  const st = () => getLexical('state') || window.state || window.ControlEventApp?.state || {};
  const auth = () => getLexical('authUser') || window.authUser || window.ControlEventApp?.authUser || null;
  const arr = key => Array.isArray(st()[key]) ? st()[key] : [];
  const eventById = id => arr('eventos').find(ev => String(ev?.id || '') === String(id || '')) || null;
  const hasValidEvent = id => !!eventById(id == null ? st().selectedEventId : id);
  const currentEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const currentTab = () => String(getLexical('currentMainTab') || window.__ceCurrentMainTab || 'graficas');

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
    return replaceVersionFilePrefixV300(String(text || '')
      .replace(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/ig, VERSION));
  }

  function patchVersionSetters(){
    if(window.__ceV5026VersionSetters) return;
    window.__ceV5026VersionSetters = true;
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
      if(typeof window.emittedByTextV171 === 'function' && !window.emittedByTextV171.__ceV5026Wrapped){
        const old = window.emittedByTextV171;
        const wrapped = function(){ return replaceVersionText(old.apply(this, arguments)); };
        wrapped.__ceV5026Wrapped = true;
        window.emittedByTextV171 = wrapped;
        try{ emittedByTextV171 = wrapped; }catch(_){ }
      }
    }catch(_){ }
  }
  function setChosen(){ CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.setItem(k, '1'), null)); }
  function clearChosen(){ CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.removeItem(k), null)); }
  function rememberEvent(id){ SELECT_KEYS.forEach(k => { safe(() => sessionStorage.setItem(k, String(id)), null); safe(() => localStorage.setItem(k, String(id)), null); }); }
  function forgetEvent(){ SELECT_KEYS.forEach(k => { safe(() => sessionStorage.removeItem(k), null); safe(() => localStorage.removeItem(k), null); }); }
  function hideWelcome(){
    const msg = $('noEventMessage');
    if(msg){ msg.classList.add('hidden'); msg.setAttribute('aria-hidden','true'); msg.style.setProperty('display','none','important'); msg.style.setProperty('visibility','hidden','important'); msg.style.setProperty('pointer-events','none','important'); }
    try{ document.body.classList.remove(...AWAIT_CLASSES, 'auth-locked'); document.body.classList.add(...HAS_CLASSES); }catch(_){ }
  }
  function showWelcomeClean(){
    if(!auth()) return;
    clearChosen();
    forgetEvent();
    try{ const s = st(); if(s) s.selectedEventId = ''; }catch(_){ }
    const sel = $('selectedEvent');
    if(sel){
      let opt = sel.querySelector('option[value=""]');
      if(!opt){ opt = document.createElement('option'); opt.value = ''; sel.insertBefore(opt, sel.firstChild); }
      opt.textContent = arr('eventos').length ? 'Selecciona evento...' : 'Cargando eventos...';
      sel.value = '';
      sel.disabled = false;
    }
    PANELS.forEach(id => { const el=$(id); if(el) el.classList.add('hidden'); });
    const ov = $('authOverlay');
    if(ov){ ov.classList.add('hidden'); ov.setAttribute('aria-hidden','true'); ov.style.setProperty('display','none','important'); ov.style.setProperty('visibility','hidden','important'); ov.style.setProperty('pointer-events','none','important'); }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden'); msg.removeAttribute('aria-hidden');
      msg.style.removeProperty('display'); msg.style.removeProperty('visibility'); msg.style.removeProperty('pointer-events'); msg.style.removeProperty('max-height');
      if(!msg.querySelector('.ce-v5026-welcome')){
        msg.innerHTML = '<div class="ce-v5026-welcome"><img src="./assets/icons/controlevent-welcome-v44.png" alt="ControlEvent"><h2>Selecciona un evento para trabajar</h2><p>Elige el evento en el desplegable superior para cargar todos los datos y activar todos los globos.</p></div>';
      }
    }
    try{ document.body.classList.remove('auth-locked', ...HAS_CLASSES); document.body.classList.add('ce-v44-awaiting-event','ce-v5026-awaiting-event'); }catch(_){ }
    applyVersion();
  }
  function markEventSelected(id, reason){
    if(!id || !eventById(id)) return false;
    try{ const s = st(); if(s) s.selectedEventId = String(id); }catch(_){ }
    const sel = $('selectedEvent'); if(sel) sel.value = String(id);
    setChosen();
    rememberEvent(id);
    hideWelcome();
    applyVersion();
    return true;
  }
  function hydrateTooltips(reason){
    if(!auth() || !hasValidEvent()) return;
    setChosen();
    hideWelcome();
    try{ window.ControlEventBudgetLiteTips?.rehydrate?.(reason || 'v50.27'); }catch(_){ }
    try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
    try{ window.ControlEventV469?.hydrateEventReceipts?.(false); }catch(_){ }
    try{ window.ControlEventV469?.compactIngresoReceipts?.(); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
    try{ window.ControlEventV467?.enrichOpenTooltips?.(); }catch(_){ }
    applyVersion();
  }
  function hydrateOnceSeries(reason){
    // Serie corta y acotada: suficiente para esperar al render asíncrono sin crear bucles permanentes.
    [0,180,520,1100,1900].forEach(ms => setTimeout(() => hydrateTooltips(reason), ms));
  }
  function patchLogout(){
    if(window.__ceV5026LogoutClean) return;
    window.__ceV5026LogoutClean = true;
    document.addEventListener('click', ev => {
      if(!ev.target?.closest?.('#btnLogout,#ceBtnSalirV518')) return;
      clearChosen();
      forgetEvent();
      SESSION_KEYS.forEach(k => safe(() => localStorage.removeItem(k), null));
      try{ const s = st(); if(s) s.selectedEventId = ''; }catch(_){ }
    }, true);
  }
  function patchLogin(){
    if(window.__ceV5026LoginFetch || typeof window.fetch !== 'function') return;
    window.__ceV5026LoginFetch = true;
    const oldFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      const url = String((input && input.url) || input || '');
      const p = oldFetch(input, init);
      if(/\/api\/login(?:\?|$)/.test(url)){
        return p.then(res => {
          try{
            res.clone().json().then(data => {
              if(res.ok && data && data.ok && data.user){
                clearChosen(); forgetEvent();
                [120,420,900,1600].forEach(ms => setTimeout(showWelcomeClean, ms));
              }
            }).catch(()=>{});
          }catch(_){ }
          return res;
        });
      }
      return p;
    };
  }
  function patchSelectors(){
    if(window.__ceV5026SelectorHandlers) return;
    window.__ceV5026SelectorHandlers = true;
    document.addEventListener('change', ev => {
      if(ev.target?.id !== 'selectedEvent') return;
      const id = String(ev.target.value || '');
      if(id && eventById(id)){
        markEventSelected(id, 'change');
        hydrateOnceSeries('selectedEvent-change');
      }else if(auth()){
        showWelcomeClean();
      }
    }, true);
    window.addEventListener('controlevent:event-ready', ev => {
      const id = String(ev?.detail?.eventId || currentEventId());
      if(id && eventById(id)) markEventSelected(id, 'event-ready');
      hydrateOnceSeries('event-ready');
    });
    ['controlevent:module-mounted','controlevent:modules-ready','controlevent:app-ready','controlevent:runtime-ready'].forEach(evt => {
      window.addEventListener(evt, () => { if(auth() && hasValidEvent()) hydrateOnceSeries(evt); applyVersion(); });
    });
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('#tabResumenBtn,#tabGraficasBtn,.mobile-menu-action[data-target="tabResumenBtn"],.mobile-menu-action[data-target="tabGraficasBtn"]')){
        setTimeout(() => hydrateTooltips('tab-click'), 220);
      }
    }, true);
  }
  function patchRefreshButton(){
    if(window.__ceV5026RefreshMark) return;
    window.__ceV5026RefreshMark = true;
    const mark = on => document.querySelectorAll('#btnSoftRefresh,#ceBtnRefresV518').forEach(btn => {
      if(on){ btn.dataset.ceRefreshing='1'; btn.classList.add('ce-refreshing'); }
      else{ delete btn.dataset.ceRefreshing; btn.classList.remove('ce-refreshing'); }
    });
    document.addEventListener('click', ev => {
      if(ev.target?.closest?.('#btnSoftRefresh,#ceBtnRefresV518')){ mark(true); setTimeout(() => { hydrateOnceSeries('refresh'); mark(false); }, 1400); }
    }, true);
  }
  function install(){
    patchVersionSetters();
    applyVersion();
    patchLogout();
    patchLogin();
    patchSelectors();
    patchRefreshButton();
    if(auth() && hasValidEvent()) hydrateOnceSeries('install');
  }
  window.ControlEventV5026 = {version:VERSION, versionFile:VERSION_FILE, install, showWelcomeClean, markEventSelected, hydrateTooltips, hydrateOnceSeries, applyVersion};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  [120,700,1600].forEach(ms => setTimeout(install, ms));
})();
