/* ControlEvent v50.24 - correccion puntual sobre v50.19.
   - No toca justificantes de INGRESOS ni tickets.
   - Al elegir evento, desbloquea el estado de espera y reinstala/sanea globos.
   - El boton Refres recarga en sitio conservando evento y pestana actual.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.24';
  const VERSION_FILE = 'ControlEvent_v50_24';
  const INSTALLED = '__ceV5016FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const FORCE_KEYS = [
    'ce_v5015_force_event_picker_after_login',
    'ce_v5013_force_event_choice_after_login',
    'ce_v5013_login_force_event_choice'
  ];
  const CHOSEN_KEYS = [
    'controlevent_v44_event_chosen_after_login',
    'ControlEvent_v50_24_event_chosen',
    'ce_v250_event_chosen',
    'ce_event_chosen'
  ];
  const SELECT_KEY = 'controlevent_v229_selected_event_id';
  const DOCK_ID = 'ceMobileExitDockV514';
  const BUDGET_TIP_ID = 'ceBudgetLiteTooltipV307';
  const TABS = ['ingresos','donaciones','compras','mapa','planificacion','resumen','graficas'];
  const PANEL_BY_TAB = {
    ingresos:'tabIngresos', donaciones:'tabDonaciones', compras:'tabCompras', mapa:'tabMapaProductos',
    planificacion:'tabPlanificacionInicial', resumen:'tabResumen', graficas:'tabGraficas'
  };

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const isMobileLike = () => safe(() => window.matchMedia('(max-width: 900px)').matches, window.innerWidth <= 900) || /iPad|iPhone|Android/i.test(navigator.userAgent || '');
  const auth = () => safe(() => (typeof authUser !== 'undefined' && authUser) || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__ || null, null);
  const st = () => safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {});
  const events = () => { const s = st(); return Array.isArray(s.eventos) ? s.eventos : []; };
  const currentEventId = () => String(st().selectedEventId || $('selectedEvent')?.value || '');
  const hasValidEvent = id => {
    const sid = String(id == null ? currentEventId() : id || '');
    return !!sid && events().some(ev => String(ev.id || '') === sid);
  };
  const currentTab = () => {
    const lex = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(TABS.includes(String(lex))) return String(lex);
    const appTab = safe(() => window.ControlEventApp?.navigation?.currentMainTab || '', '');
    if(TABS.includes(String(appTab))) return String(appTab);
    const mem = safe(() => window.__ceCurrentMainTab || '', '');
    if(TABS.includes(String(mem))) return String(mem);
    const visible = TABS.find(tab => { const el = $(PANEL_BY_TAB[tab]); return el && !el.classList.contains('hidden'); });
    return visible || 'graficas';
  };
  function setTab(tab){
    const next = TABS.includes(String(tab)) ? String(tab) : currentTab();
    try{ currentMainTab = next; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = next; }catch(_){ }
    try{ window.__ceCurrentMainTab = next; }catch(_){ }
    return next;
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
        const t = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(t)) el.textContent = t.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }

  function injectStyle(){
    if($('ceV5016FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV5016FinalStyle';
    style.textContent = `
      body.ce-v5016-has-event #selectedEvent{outline:none!important;box-shadow:none!important;}
      body.ce-v5016-has-event #noEventMessage{display:none!important;}
      @media(max-width:900px){
        #${DOCK_ID}{display:flex!important;visibility:visible!important;position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 1px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 2px)!important;left:auto!important;top:auto!important;z-index:180000!important;flex-direction:column!important;gap:2px!important;align-items:flex-end!important;opacity:.58!important;pointer-events:none!important;}
        #${DOCK_ID}:active,#${DOCK_ID}:focus-within{opacity:.98!important;}
        #${DOCK_ID} button{pointer-events:auto!important;touch-action:manipulation!important;appearance:none!important;-webkit-appearance:none!important;width:52px!important;min-width:52px!important;height:27px!important;min-height:27px!important;border-radius:999px!important;border:1px solid rgba(15,23,42,.16)!important;background:rgba(255,255,255,.70)!important;color:#111827!important;box-shadow:0 4px 12px rgba(15,23,42,.14)!important;font-size:10px!important;font-weight:900!important;line-height:1!important;margin:0!important;padding:0 5px!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;}
        body.auth-locked #${DOCK_ID},body:not(.ce-v5016-authenticated) #${DOCK_ID}{display:none!important;visibility:hidden!important;}
      }
      @media(min-width:901px){#${DOCK_ID}{display:none!important;visibility:hidden!important;}}
      #${BUDGET_TIP_ID}.open{pointer-events:auto!important;z-index:4200!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-close{position:sticky!important;top:0!important;float:right!important;z-index:12!important;min-width:40px!important;min-height:40px!important;font-size:24px!important;touch-action:manipulation!important;}
      #${BUDGET_TIP_ID} .ce-budget-lite-table-wrap{overflow:auto!important;-webkit-overflow-scrolling:touch!important;max-width:100%!important;}
    `;
    document.head.appendChild(style);
  }

  function clearForcePickerState(){
    FORCE_KEYS.forEach(k => safe(() => sessionStorage.removeItem(k), null));
    if(hasValidEvent()){
      CHOSEN_KEYS.forEach(k => safe(() => sessionStorage.setItem(k, '1'), null));
      safe(() => sessionStorage.setItem(SELECT_KEY, currentEventId()), null);
      safe(() => localStorage.setItem(SELECT_KEY, currentEventId()), null);
    }
  }

  function clearAwaitingVisualState(){
    if(!hasValidEvent()) return false;
    clearForcePickerState();
    try{
      document.body.classList.remove('ce-v5015-awaiting-event','ce-v5013-force-event-choice','ce-v44-awaiting-event');
      document.body.classList.add('ce-v5016-has-event','ce-v5016-authenticated');
    }catch(_){ }
    const msg = $('noEventMessage');
    if(msg) msg.classList.add('hidden');
    const sel = $('selectedEvent');
    if(sel && currentEventId() && sel.value !== currentEventId()) sel.value = currentEventId();
    return true;
  }

  function callRenderPieces(tab){
    const active = setTab(tab || currentTab());
    try{ window.ControlEventModules?.activate?.(active, {reason:'v50.19-refresh-active'}); }catch(_){ }
    if(!hasValidEvent()) return;
    try{ window.renderHeader?.(); }catch(_){ }
    try{ window.renderPermissions?.(); }catch(_){ }
    try{ window.renderLockState?.(); }catch(_){ }
    if(active === 'resumen'){
      try{ window.renderBudget?.(); }catch(_){ }
    }
    if(active === 'graficas'){
      try{ window.renderGraficas?.({force:true, reason:'v50.19-refresh-active'}); }catch(_){ try{ window.renderGraficas?.(); }catch(__){ } }
    }
    if(active === 'ingresos'){
      try{ window.renderIngresosSummary?.(); }catch(_){ }
      try{ window.renderColabs?.(); }catch(_){ }
    }
    if(active === 'compras') try{ window.renderCompras?.(); }catch(_){ }
    if(active === 'donaciones') try{ window.renderDonaciones?.(); }catch(_){ }
    if(active === 'mapa') try{ window.renderMapaProductos?.(); }catch(_){ }
  }

  function hydrateBudgetTips(reason){
    if(!hasValidEvent()) return;
    clearAwaitingVisualState();
    try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
    try{ window.ControlEventV467?.enrichOpenTooltips?.(); }catch(_){ }
    try{ window.ControlEventV465?.enrichOpenTooltips?.(); }catch(_){ }
    // Si estamos en Resumen y el layout existe, activar de nuevo los rows de globo.
    const budget = $('budgetLayout');
    if(budget){
      budget.querySelectorAll('.budget-panel.socios .budget-subrow,.budget-panel.ce-v306-donantes-lite .budget-subrow,.budget-panel.ce-v306-donantes-lite .budget-row,.budget-panel.donantes .budget-subrow,.budget-panel.donantes .budget-row').forEach(row => {
        try{
          row.classList.add('ce-v306-budget-lite-row');
          row.setAttribute('role','button');
          row.setAttribute('tabindex','0');
          row.setAttribute('aria-label','Ver detalle');
        }catch(_){ }
      });
    }
    applyVersion();
  }

  function burstHydrate(reason){
    [0,80,220,520,1100].forEach(ms => setTimeout(() => hydrateBudgetTips(reason), ms));
  }

  function mergeFreshStatePreservingContext(freshState, eventId){
    const target = st();
    const keep = eventId || currentEventId();
    let merged = freshState || {};
    try{
      if(typeof mergeLoadedState === 'function' && typeof defaultState === 'function') merged = mergeLoadedState(freshState, defaultState());
    }catch(_){ }
    try{ Object.keys(target).forEach(k => delete target[k]); }catch(_){ }
    Object.assign(target, merged || {});
    if(keep && events().some(ev => String(ev.id || '') === String(keep))) target.selectedEventId = keep;
    try{ if(window.ControlEventApp) window.ControlEventApp.state = target; }catch(_){ }
    return target;
  }

  async function refreshInPlace(ev){
    if(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } }
    const eventId = currentEventId();
    const tab = currentTab();
    if(!eventId || !hasValidEvent(eventId)){
      try{ window.ControlEventV5015?.renderAwaitingShell?.(); return false; }catch(_){ }
      try{ window.render?.({force:true}); }catch(_){ }
      return false;
    }
    clearForcePickerState();
    try{
      const res = await fetch('/api/state', {cache:'no-store'});
      if(res.ok){
        const data = await res.json();
        mergeFreshStatePreservingContext(data, eventId);
      }
    }catch(error){ console.warn('[v50.19] No se pudo refrescar estado en sitio', error); }
    clearAwaitingVisualState();
    callRenderPieces(tab);
    burstHydrate('refresh-in-place');
    return false;
  }

  function ensureMobileDock(){
    injectStyle();
    let dock = $(DOCK_ID);
    if(!dock){
      dock = document.createElement('div');
      dock.id = DOCK_ID;
      dock.setAttribute('aria-label','Acciones rapidas');
      dock.innerHTML = '<button type="button" id="ceBtnRefresV514" aria-label="Refrescar">Refres</button><button type="button" id="ceBtnSalirV514" aria-label="Salir">Salir</button>';
      document.body.appendChild(dock);
    }else{
      const r = dock.querySelector('#ceBtnRefresV514'); if(r) r.textContent = 'Refres';
    }
    const show = isMobileLike() && !!auth() && !document.body?.classList.contains('auth-locked');
    try{
      document.body.classList.toggle('ce-v5016-authenticated', show);
      dock.style.setProperty('display', show ? 'flex' : 'none', 'important');
      dock.style.setProperty('visibility', show ? 'visible' : 'hidden', 'important');
    }catch(_){ }
  }

  function installHandlers(){
    if(!window.__ceV5016Handlers){
      window.__ceV5016Handlers = true;
      ['pointerup','touchend','click'].forEach(type => {
        window.addEventListener(type, ev => {
          if(ev.target?.closest?.('#ceBtnRefresV514')) return refreshInPlace(ev);
          if(ev.target?.closest?.('#ceBtnSalirV514')){
            try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
            const fn = window.doLogout || window.ControlEventApp?.actions?.doLogout;
            try{ if(typeof fn === 'function') fn(ev); else $('btnLogout')?.click(); }catch(_){ }
            setTimeout(() => { ensureMobileDock(); applyVersion(); }, 120);
            return false;
          }
        }, {capture:true, passive:false});
      });
      // El selector antiguo corta la propagacion del change; por eso escuchamos tambien input/click/focusout y hacemos una hidratacion diferida.
      ['input','change','focusout','blur','pointerup','touchend','click'].forEach(type => {
        document.addEventListener(type, ev => {
          if(ev.target?.id === 'selectedEvent' || ev.target?.closest?.('#selectedEvent')){
            setTimeout(() => { if(hasValidEvent()) { clearAwaitingVisualState(); burstHydrate('event-selector'); } }, 120);
            setTimeout(() => { if(hasValidEvent()) { callRenderPieces(currentTab()); burstHydrate('event-selector-late'); } }, 750);
          }
        }, {capture:false, passive:true});
      });
      document.addEventListener('click', ev => {
        if(ev.target?.closest?.('#tabResumenBtn,.mobile-menu-action[data-target="tabResumenBtn"],#budgetLayout')) burstHydrate('resumen-click');
      }, true);
      window.addEventListener('controlevent:module-mounted', ev => {
        if(ev.detail?.name === 'resumen' || currentTab() === 'resumen') burstHydrate('module-mounted');
      });
      window.addEventListener('controlevent:runtime-ready', () => burstHydrate('runtime-ready'));
      window.addEventListener('controlevent:app-ready', () => burstHydrate('app-ready'));
    }
  }

  function patchV5015ForceLogic(){
    // v50.19 dejaba una marca de "forzar selector" que podia seguir activa tras escoger evento.
    // Si ya hay evento valido, la anulamos antes de cualquier refresco o /api/state posterior.
    if(hasValidEvent()) clearForcePickerState();
  }

  function install(){
    injectStyle();
    applyVersion();
    patchV5015ForceLogic();
    clearAwaitingVisualState();
    ensureMobileDock();
    installHandlers();
    if(hasValidEvent()) burstHydrate('install');
  }

  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,120,500,1200,2500].forEach(ms => setTimeout(install, ms));

  window.ControlEventV5016 = {version:VERSION, versionFile:VERSION_FILE, install, refreshInPlace, hydrateBudgetTips, burstHydrate, clearForcePickerState};
})();
