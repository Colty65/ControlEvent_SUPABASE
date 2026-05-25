/* ControlEvent v44.5 - optimización de cambio de evento y carga bajo demanda.
   Alcance: cancelar renders tardíos, evitar montar módulos ocultos y mantener GRAFICAS estable. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v44.5';
  const VERSION_FILE = 'ControlEvent_v44_5';
  const HEAVY_IDS = ['collabList','comprasList','donacionesList','mapaProductosSummary','mapaProductosList','budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket','eventChartWrap'];
  const TAB_IDS = {
    ingresos:'tabIngresos', compras:'tabCompras', donaciones:'tabDonaciones', mapa:'tabMapaProductos',
    resumen:'tabResumen', graficas:'tabGraficas', planificacion:'tabPlanificacionInicial', mantenimiento:'maintenanceWrapper'
  };
  const BUTTON_TO_TAB = {
    tabIngresosBtn:'ingresos', tabComprasBtn:'compras', tabDonacionesBtn:'donaciones', tabMapaBtn:'mapa',
    tabResumenBtn:'resumen', tabGraficasBtn:'graficas', tabPlanificacionBtn:'planificacion', btnToggleMaintenance:'mantenimiento'
  };
  let originalRenderGraficas = null;
  const state445 = window.__ceV445 = window.__ceV445 || {
    version: VERSION,
    token: 0,
    eventChanging: false,
    lastEventId: '',
    rendersSkipped: 0,
    modulesSkipped: 0,
    eventChanges: 0,
    lastEventMs: 0,
    lastReason: '',
    installedAt: new Date().toISOString()
  };

  const $ = id => document.getElementById(id);
  const safe = (fn, fallback) => { try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } };
  const app = () => window.ControlEventApp || null;
  const appState = () => app()?.state || window.state || {};
  function text(v){ return String(v == null ? '' : v); }
  function hasUser(){ return !!safe(() => (typeof authUser !== 'undefined' ? authUser : null), null) || !!window.authUser; }
  function selectedEventId(){ return text(appState().selectedEventId || $('selectedEvent')?.value || ''); }
  function currentTab(){
    const nav = app()?.navigation?.currentMainTab || window.__ceCurrentMainTab || safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(nav) return String(nav);
    for(const [name,id] of Object.entries(TAB_IDS)){
      const el = $(id);
      if(el && !el.classList.contains('hidden')) return name;
    }
    return 'ingresos';
  }
  function setCurrentTab(tab){
    if(!tab) return;
    try{ currentMainTab = tab; }catch(_){ }
    try{ window.__ceCurrentMainTab = tab; }catch(_){ }
    try{ if(app()?.navigation) app().navigation.currentMainTab = tab; }catch(_){ }
  }
  function activeRoot(tab){ return $(TAB_IDS[tab] || ''); }
  function isVisibleTab(tab){ const el = activeRoot(tab); return !!(el && !el.classList.contains('hidden')); }
  function call(name, args){
    const fn = window[name];
    if(typeof fn !== 'function') return undefined;
    try{ return fn.apply(window, args || []); }catch(error){ console.warn('[ControlEvent v44.5] Error en ' + name, error); return undefined; }
  }
  function clearHeavyExcept(active){
    let cleared = 0;
    const keep = new Set();
    if(active === 'ingresos') keep.add('collabList').add('ingresosSummaryGrid');
    if(active === 'compras') keep.add('comprasList');
    if(active === 'donaciones') keep.add('donacionesList');
    if(active === 'mapa') keep.add('mapaProductosSummary').add('mapaProductosList');
    if(active === 'resumen') keep.add('budgetLayout').add('summarySegmento').add('summaryDestino').add('summaryTiendaTicket');
    if(active === 'graficas') keep.add('eventChartWrap');
    HEAVY_IDS.forEach(id => {
      if(keep.has(id)) return;
      const el = $(id);
      if(!el || !el.childNodes?.length) return;
      cleared += el.getElementsByTagName ? el.getElementsByTagName('*').length : el.childNodes.length;
      el.replaceChildren();
      el.dataset.ceV445Cleared = '1';
    });
    return cleared;
  }
  function showGraficasLoading(){
    const wrap = $('eventChartWrap');
    if(!wrap) return;
    wrap.replaceChildren();
    const box = document.createElement('div');
    box.className = 'chart-shell ce-v445-loading';
    box.style.cssText = 'padding:18px;border:1px solid #e5e7eb;border-radius:18px;background:#fff;font-weight:900;color:#334155;text-align:center;';
    box.textContent = 'Cargando gráficas del evento...';
    wrap.appendChild(box);
  }
  function renderStableGraficas(options = {}){
    const token = state445.token;
    const wrap = $('eventChartWrap');
    if(wrap){
      const old = wrap.querySelector('.chart-bars,.chart-track,.chart-seg:not(.ce-v434-pie-slice),.bar,.bar-seg');
      const own = wrap.firstElementChild?.classList?.contains('ce-v434-chart-layout-shell');
      if(old || (!own && !wrap.querySelector('.ce-v445-loading'))) showGraficasLoading();
    }
    const stable = window.ControlEventV434?.renderGraficas || window.ControlEventV435?.renderGraficas || window.ControlEventV436?.renderGraficas;
    const doRender = () => {
      if(token !== state445.token) { state445.rendersSkipped += 1; return; }
      window.__ceDisableLegacyBarGraficas = true;
      window.__ceStableGraficasV435 = true;
      if(typeof stable === 'function') stable({force: options.force === true, reason: options.reason || 'v44.5'});
      else if(typeof originalRenderGraficas === 'function') originalRenderGraficas({force: options.force === true, reason: options.reason || 'v44.5'});
      safe(() => window.ControlEventPerf?.sample?.('graficas-v44.5'), null);
    };
    if(typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(doRender, 0));
    else setTimeout(doRender, 0);
  }
  function renderActive(active, reason){
    if(!hasUser()) return;
    const token = state445.token;
    const tab = active || currentTab();
    clearHeavyExcept(tab);
    call('renderHeader');
    call('renderTabVisibility');
    call('renderMainSelectors');
    if(token !== state445.token) return;
    switch(tab){
      case 'ingresos':
        call('renderIngresosSummary');
        if(token === state445.token) call('renderColabs');
        break;
      case 'compras':
        call('renderCompras');
        break;
      case 'donaciones':
        call('renderDonaciones');
        break;
      case 'mapa':
        call('renderMapaProductos');
        break;
      case 'resumen':
        call('renderBudget');
        break;
      case 'graficas':
        renderStableGraficas({force: reason === 'event-change', reason: reason || 'active'});
        break;
      case 'planificacion':
        safe(() => window.ControlEventPlanificacion?.show?.(), null);
        break;
    }
    if(token !== state445.token) return;
    call('renderPermissions');
    call('renderLockState');
    safe(() => window.ControlEventPerf?.sample?.('render-active-v44.5'), null);
  }
  function scheduleActiveRender(active, reason, delay){
    const token = state445.token;
    const run = () => {
      if(token !== state445.token){ state445.rendersSkipped += 1; return; }
      renderActive(active, reason);
      state445.eventChanging = false;
      state445.lastEventMs = Date.now() - (state445.startedAt || Date.now());
      window.dispatchEvent(new CustomEvent('controlevent:v44-5-event-ready', {detail:{tab:active, eventId:selectedEventId(), ms:state445.lastEventMs}}));
    };
    if(typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, delay || 0));
    else setTimeout(run, delay || 0);
  }
  function patchRender(){
    const old = safe(() => (typeof render === 'function' ? render : window.render), null);
    if(old && old.__ceV445Render) return;
    const wrapped = function(){
      if(state445.eventChanging){ state445.rendersSkipped += 1; return undefined; }
      return renderActive(currentTab(), 'render-v44.5');
    };
    wrapped.__ceV445Render = true;
    wrapped.__ceV445Original = old;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
    safe(() => { if(app()?.actions) app().actions.render = wrapped; }, null);
  }
  function patchGraficasAction(){
    if(!originalRenderGraficas){
      try{ originalRenderGraficas = (typeof renderGraficas !== 'undefined' ? renderGraficas : window.renderGraficas); }catch(_){ originalRenderGraficas = window.renderGraficas; }
    }
    const stableFn = function(options){ return renderStableGraficas(options || {reason:'action-v44.5'}); };
    stableFn.__ceV445StableGraficas = true;
    try{ renderGraficas = stableFn; }catch(_){ }
    window.renderGraficas = stableFn;
    safe(() => { if(app()?.actions) app().actions.renderGraficas = stableFn; }, null);
    window.__ceDisableLegacyBarGraficas = true;
    window.__ceStableGraficasV435 = true;
  }
  function patchEventChange(){
    const old = window.changeSelectedEvent || safe(() => (typeof changeSelectedEvent === 'function' ? changeSelectedEvent : null), null);
    if(old && old.__ceV445EventChange) return;
    const wrapped = async function(value){
      const id = text(value || '');
      if(!id) return;
      const s = appState();
      const started = Date.now();
      state445.token += 1;
      state445.startedAt = started;
      state445.eventChanging = true;
      state445.eventChanges += 1;
      state445.lastReason = 'event-change';
      s.selectedEventId = id;
      safe(() => { if(app()?.navigation) app().navigation.selectedEventId = id; }, null);
      const sel = $('selectedEvent'); if(sel && sel.value !== id) sel.value = id;
      const active = currentTab() || 'graficas';
      if(active === 'graficas') showGraficasLoading();
      else clearHeavyExcept(active);
      safe(() => localStorage.setItem(typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'controlevent_v6_4', JSON.stringify(s)), null);
      safe(() => (typeof saveState === 'function' ? saveState() : window.saveState?.()), null);
      safe(() => window.ControlEventPerf?.sample?.('event-change-start-v44.5'), null);
      if(window.authUser && ['RW','GD'].includes(String(window.authUser.nivel||''))){
        clearTimeout(window.__ceV445EventSaveTimer);
        window.__ceV445EventSaveTimer = setTimeout(() => safe(() => (typeof pushStateToServer === 'function' ? pushStateToServer() : window.pushStateToServer?.()), null), 220);
      }
      scheduleActiveRender(active, 'event-change', active === 'graficas' ? 30 : 0);
      return undefined;
    };
    wrapped.__ceV445EventChange = true;
    wrapped.__ceV445Original = old;
    try{ changeSelectedEvent = wrapped; }catch(_){ }
    window.changeSelectedEvent = wrapped;
    safe(() => { if(app()?.actions) app().actions.changeSelectedEvent = wrapped; }, null);
  }
  function patchModules(){
    const modules = window.ControlEventModules;
    if(!modules || typeof modules.activate !== 'function' || modules.activate.__ceV445Activate) return;
    const old = modules.activate;
    const wrapped = async function(name, options = {}){
      const active = currentTab();
      const target = text(name || '');
      const reason = text(options?.reason || '');
      const allowed = !target || target === active || reason === 'menu-click' || reason === 'screen-lazy' || reason === 'app-main-initial';
      if(state445.eventChanging && target && target !== active){
        state445.modulesSkipped += 1;
        return {ok:false, skipped:true, name:target, active, reason:'event-changing'};
      }
      if(!allowed && ['ingresos','compras','donaciones','mapa','resumen','graficas'].includes(target)){
        state445.modulesSkipped += 1;
        return {ok:false, skipped:true, name:target, active, reason:'hidden-module'};
      }
      const token = state445.token;
      const result = await old.apply(this, arguments);
      if(token !== state445.token && target !== currentTab()) state445.modulesSkipped += 1;
      return result;
    };
    wrapped.__ceV445Activate = true;
    wrapped.__ceV445Original = old;
    modules.activate = wrapped;
  }
  function patchMenuSync(){
    if(document.__ceV445MenuSync) return;
    document.__ceV445MenuSync = true;
    document.addEventListener('click', event => {
      const btn = event.target?.closest?.('button[id]');
      if(!btn) return;
      const tab = BUTTON_TO_TAB[btn.id];
      if(!tab || tab === 'mantenimiento') return;
      setCurrentTab(tab);
      state445.eventChanging = false;
    }, true);
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; }catch(_){ }
    safe(() => { if(document.body) document.body.dataset.ceVersion = VERSION; }, null);
    document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
      const t = el.textContent || '';
      if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(t)) el.textContent = t.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
    });
  }
  function install(){
    applyVersion();
    patchGraficasAction();
    patchRender();
    patchEventChange();
    patchModules();
    patchMenuSync();
    state445.version = VERSION;
    safe(() => window.ControlEventPerf?.sample?.('install-v44.5'), null);
  }
  window.ControlEventV445 = {version:VERSION, versionFile:VERSION_FILE, install, renderActive, renderStableGraficas, state:state445};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  ['load','controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 80)));
  [250,900,1800].forEach(ms => setTimeout(install, ms));
})();
