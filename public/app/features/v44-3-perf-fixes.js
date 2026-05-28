/* ControlEvent v50.19 - Optimización controlada de render y gráficas.
   Alcance: evitar renderizar todas las ventanas en cada cambio, evitar el gráfico antiguo de barras y corregir medición PERF. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v50.19';
  const VERSION_FILE = 'ControlEvent_v50_19';
  const HEAVY_GROUPS = {
    ingresos: ['collabList','ingresosSummaryGrid'],
    compras: ['comprasList'],
    donaciones: ['donacionesList'],
    mapa: ['mapaProductosSummary','mapaProductosList'],
    resumen: ['budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket'],
    graficas: ['eventChartWrap']
  };
  const pruneState = {lastKey:'', lastAt:0, rendering:false, installed:false};

  function $(id){ return document.getElementById(id); }
  function safe(fn, fallback){ try{ const value = fn(); return value === undefined ? fallback : value; }catch(_){ return fallback; } }
  function call(name, args){
    const fn = window[name];
    if(typeof fn !== 'function') return undefined;
    try{ return fn.apply(window, args || []); }catch(error){ console.warn('[ControlEvent v50.19] Error en ' + name, error); return undefined; }
  }
  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(lexical) return String(lexical);
    const runtime = safe(() => window.ControlEventApp?.navigation?.currentMainTab || window.__ceCurrentMainTab || '', '');
    if(runtime) return String(runtime);
    const visible = [
      ['ingresos','tabIngresos'], ['compras','tabCompras'], ['donaciones','tabDonaciones'],
      ['mapa','tabMapaProductos'], ['planificacion','tabPlanificacionInicial'], ['resumen','tabResumen'], ['graficas','tabGraficas']
    ].find(([,id]) => { const el=$(id); return el && !el.classList.contains('hidden'); });
    return visible ? visible[0] : 'ingresos';
  }
  function setCurrentTab(tab){
    try{ currentMainTab = tab; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = tab; }catch(_){ }
    try{ window.__ceCurrentMainTab = tab; }catch(_){ }
  }
  function selectedEventId(){
    return safe(() => window.ControlEventApp?.state?.selectedEventId || window.state?.selectedEventId || document.getElementById('selectedEvent')?.value || '', '');
  }
  function hasUser(){ return !!safe(() => (typeof authUser !== 'undefined' ? authUser : null), null) || !!window.authUser; }
  function eventSwitcherOwnsRender(){ return !!window.__ceEventSwitcherOwnsRender || !!window.ControlEventV447; }
  function visibleTab(id){ const el=$(id); return !!(el && !el.classList.contains('hidden')); }
  function clearIds(ids){
    let cleared = 0;
    (ids || []).forEach(id => {
      const el = $(id);
      if(!el || !el.childNodes || !el.childNodes.length) return;
      cleared += el.getElementsByTagName ? el.getElementsByTagName('*').length : el.childNodes.length;
      el.replaceChildren();
      el.dataset.ceV443Cleared = '1';
    });
    return cleared;
  }
  function pruneInactive(active, reason){
    // v45.1: limpieza selectiva. No se barre todo en cada render.
    // Solo se limpia una vez por combinación ventana/evento, o cuando se fuerza.
    const key = String(active || '') + '|' + String(selectedEventId() || '');
    const force = reason === 'event-change' || reason === 'force';
    const t = Date.now();
    if(!force && pruneState.lastKey === key && (t - pruneState.lastAt) < 12000) return 0;
    pruneState.lastKey = key;
    pruneState.lastAt = t;
    let cleared = 0;
    Object.entries(HEAVY_GROUPS).forEach(([group, ids]) => {
      if(group !== active) cleared += clearIds(ids);
    });
    try{ window.__ceV443Stats.prunes += cleared ? 1 : 0; window.__ceV443Stats.clearedNodes += cleared; window.__ceV443Stats.lastReason = reason || 'selective'; }catch(_){ }
    return cleared;
  }
  function withGraficasDisabled(fn){
    const oldWin = window.renderGraficas;
    let oldLexical;
    try{ oldLexical = (typeof renderGraficas !== 'undefined' ? renderGraficas : undefined); }catch(_){ oldLexical = undefined; }
    const noop = function(){ return undefined; };
    try{ renderGraficas = noop; }catch(_){ }
    window.renderGraficas = noop;
    try{ return fn(); }
    finally{
      if(oldLexical){ try{ renderGraficas = oldLexical; }catch(_){ } }
      if(oldWin) window.renderGraficas = oldWin;
    }
  }
  function renderStableGraficas(){
    const wrap = $('eventChartWrap');
    if(wrap){
      const oldBars = wrap.querySelector('.chart-bars,.chart-track,.chart-seg:not(.ce-v434-pie-slice)');
      if(oldBars || !wrap.firstElementChild?.classList?.contains('ce-v434-chart-layout-shell')) wrap.replaceChildren();
    }
    try{ window.__ceDisableLegacyBarGraficas = true; window.__ceStableGraficasV435 = true; }catch(_){ }
    const stable = window.ControlEventV434?.renderGraficas || window.ControlEventV435?.renderGraficas || window.ControlEventV436?.renderGraficas;
    if(typeof stable === 'function') return stable({force:true, reason:'v45.1'});
    return call('renderGraficas');
  }
  function renderActiveContent(active){
    switch(active){
      case 'ingresos':
        call('renderIngresosSummary');
        call('renderColabs');
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
        withGraficasDisabled(() => call('renderBudget'));
        clearIds(['eventChartWrap']);
        break;
      case 'graficas':
        renderStableGraficas();
        break;
      case 'planificacion':
        try{ window.ControlEventPlanificacion?.show?.(); }catch(_){ }
        break;
      default:
        break;
    }
  }
  function renderV443(){
    // v45.1: si el nuevo selector unificado controla el render, este optimizador antiguo no debe lanzar render extra.
    if(eventSwitcherOwnsRender() && window.render !== renderV443) return;
    if(pruneState.rendering) return;
    pruneState.rendering = true;
    try{
      call('renderEnvironmentBanner');
      call('renderAuthUI');
      if(!hasUser()) return;
      call('saveState');
      call('renderHeader');
      call('renderTabVisibility');
      call('renderMainSelectors');
      const active = currentTab();
      pruneInactive(active, 'active-render');
      renderActiveContent(active);
      const maint = $('maintenanceWrapper');
      if(maint && !maint.classList.contains('hidden')) call('renderMaintenance');
      call('renderPermissions');
      call('renderLockState');
    }finally{
      pruneState.rendering = false;
    }
  }
  function patchRender(){
    const old = safe(() => (typeof render === 'function' ? render : window.render), null);
    if(old && old.__ceV443Minimal) return;
    renderV443.__ceV443Minimal = true;
    renderV443.__ceV443Original = old;
    try{ render = renderV443; }catch(_){ }
    window.render = renderV443;
  }
  function patchEventChange(){
    const old = safe(() => (typeof changeSelectedEvent === 'function' ? changeSelectedEvent : window.changeSelectedEvent), null);
    if(typeof old !== 'function' || old.__ceV443EventChange) return;
    const wrapped = async function(){
      const result = await old.apply(this, arguments);
      setTimeout(() => {
        try{ pruneInactive(currentTab(), 'event-change'); renderV443(); }catch(error){ console.warn('[ControlEvent v50.19] render tras cambio de evento', error); }
      }, 0);
      return result;
    };
    wrapped.__ceV443EventChange = true;
    wrapped.__ceV443Original = old;
    try{ changeSelectedEvent = wrapped; }catch(_){ }
    window.changeSelectedEvent = wrapped;
  }
  function patchMobileMenuClick(){
    if(document.__ceV443MenuPatch) return;
    document.__ceV443MenuPatch = true;
    document.addEventListener('click', event => {
      const trigger = event.target?.closest?.('.mobile-menu-action[data-target],button[id]');
      if(!trigger) return;
      const target = trigger.dataset?.target || trigger.id || '';
      const map = {
        tabIngresosBtn:'ingresos', tabComprasBtn:'compras', tabDonacionesBtn:'donaciones', tabMapaBtn:'mapa',
        tabResumenBtn:'resumen', tabGraficasBtn:'graficas', tabPlanificacionBtn:'planificacion'
      };
      const tab = map[target];
      if(!tab || tab === 'planificacion') return;
      // Solo sincroniza el tab antes de que actúe el manejador existente; no renderiza aquí para evitar doble trabajo.
      setCurrentTab(tab);
    }, true);
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    // v45.1: actualización ligera de versión. Evita recorrer todo el DOM en cada instalación.
    document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
      const t = el.textContent || '';
      if(/ControlEvent\s+v\d+(?:\.\d+)*/.test(t)) el.textContent = t.replace(/ControlEvent\s+v\d+(?:\.\d+)*/g, VERSION);
    });
    try{ document.body.dataset.ceVersion = VERSION; }catch(_){ }
    try{ window.VERSION = VERSION; window.VERSION_FILE = VERSION_FILE; }catch(_){ }
  }
  function install(){
    window.__ceV443Stats = window.__ceV443Stats || {prunes:0, clearedNodes:0, installedAt:new Date().toISOString(), mode:'v45.1-selective'};
    try{ window.__ceDisableLegacyBarGraficas = true; window.__ceStableGraficasV435 = true; }catch(_){ }
    applyVersion();
    if(eventSwitcherOwnsRender()) return;
    if(!pruneState.installed){
      pruneState.installed = true;
      patchRender();
      patchEventChange();
      patchMobileMenuClick();
    }
    if(hasUser()) setTimeout(() => { try{ renderV443(); }catch(_){} }, 0);
  }
  window.ControlEventV443 = {version:VERSION, versionFile:VERSION_FILE, install, render:renderV443, renderStableGraficas};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40)));
  [120,650].forEach(ms => setTimeout(install, ms));
})();
