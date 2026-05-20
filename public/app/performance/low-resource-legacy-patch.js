/* ControlEvent v29.2 - LowResourceLegacyPatch
   Parche clasico posterior al legacy: puede reasignar el render global heredado.
   En v29.1 se envolvian funciones en window, pero muchas llamadas internas seguian usando
   las referencias lexicas del bundle legacy. Esto aplica el modo ligero donde realmente se llama. */
(function(){
  'use strict';
  const root = window.ControlEventLowResource;
  const VERSION = 'ControlEvent v29.2';
  if(!root || !root.enabled){
    window.ControlEventLowResourceLegacy = {version:VERSION, installed:false, reason:'LowResource no activo', inspect(){return this;}, print(){console.info(this); return this;}};
    return;
  }

  const stats = {
    version: VERSION,
    installed: true,
    installedAt: new Date().toISOString(),
    liteRenderCalls: 0,
    fullRenderFallbacks: 0,
    selectorsRendered: 0,
    maintenanceLiteCalls: 0,
    executed: {},
    skipped: {budget:0, graficas:0, maintenance:0, render:0},
    errors: [],
    last: null
  };

  const $ = id => document.getElementById(id);
  function inc(group, key){ group[key] = Number(group[key] || 0) + 1; }
  function note(kind, name, detail){ stats.last = {at:new Date().toISOString(), kind, name, detail:detail||null}; }
  function isHiddenByClass(el){
    if(!el) return true;
    let node = el;
    while(node && node !== document.documentElement){
      if(node.classList && node.classList.contains('hidden')) return true;
      node = node.parentElement;
    }
    return false;
  }
  function isVisible(id){ const el = $(id); return !!el && !isHiddenByClass(el); }
  function currentTab(){
    try{ if(typeof currentMainTab !== 'undefined') return String(currentMainTab || 'ingresos'); }catch(_){ }
    try{ return String(window.ControlEventApp?.navigation?.currentMainTab || 'ingresos'); }catch(_){ return 'ingresos'; }
  }
  function currentMaintenanceTab(){
    try{ if(typeof currentMaintTab !== 'undefined') return String(currentMaintTab || 'personas'); }catch(_){ }
    return 'personas';
  }
  function hasAuth(){
    try{ if(typeof authUser !== 'undefined') return !!authUser; }catch(_){ }
    try{ return !!window.ControlEventApp?.authUser || !!window.authUser; }catch(_){ return false; }
  }
  function stateRef(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ return window.ControlEventApp?.state || window.state || {}; }catch(_){ return {}; }
  }
  function stateSignature(){
    const st = stateRef();
    const count = k => Array.isArray(st[k]) ? st[k].length : 0;
    return [st.selectedEventId || '', count('eventos'), count('personas'), count('productos'), count('tiendas')].join('|');
  }
  function getFn(name){
    try{ if(typeof window[name] === 'function') return window[name]; }catch(_){ }
    try{ return eval('typeof '+name+' === "function" ? '+name+' : null'); }catch(_){ return null; }
  }
  function call(name, args){
    const fn = getFn(name);
    if(typeof fn !== 'function') return undefined;
    try{
      inc(stats.executed, name);
      note('run', name);
      return fn.apply(window, args || []);
    }catch(error){
      stats.errors.push({at:new Date().toISOString(), name, message:error && (error.message || String(error))});
      if(stats.errors.length > 12) stats.errors.shift();
      throw error;
    }
  }

  let lastSelectorSignature = '';
  let lastSelectorAt = 0;
  function renderSelectorsIfNeeded(force){
    const now = Date.now();
    const sig = stateSignature();
    if(force || sig !== lastSelectorSignature || (now - lastSelectorAt) > 3500){
      lastSelectorSignature = sig;
      lastSelectorAt = now;
      stats.selectorsRendered += 1;
      return call('renderMainSelectors');
    }
  }

  const oldRender = getFn('render');
  const oldBudget = getFn('renderBudget');
  const oldGraficas = getFn('renderGraficas');
  const oldMaintenance = getFn('renderMaintenance');

  function liteRender(){
    if(!oldRender){ stats.fullRenderFallbacks += 1; return undefined; }
    stats.liteRenderCalls += 1;
    try{
      call('renderEnvironmentBanner');
      call('renderAuthUI');
      if(!hasAuth()) return undefined;
      try{ call('saveState'); }catch(_){ }
      call('renderHeader');
      call('renderTabVisibility');
      renderSelectorsIfNeeded(false);
      const tab = currentTab();
      if(tab === 'ingresos'){
        call('renderIngresosSummary');
        call('renderColabs');
      }else if(tab === 'compras'){
        call('renderCompras');
      }else if(tab === 'donaciones'){
        call('renderDonaciones');
      }else if(tab === 'resumen'){
        call('renderBudget');
      }else if(tab === 'graficas'){
        call('renderGraficas');
      }else{
        stats.fullRenderFallbacks += 1;
        return oldRender.apply(this, arguments);
      }
      if(isVisible('maintenanceWrapper')) call('renderMaintenance');
      call('renderPermissions');
      call('renderLockState');
      note('lite-render', tab);
      return undefined;
    }catch(error){
      stats.fullRenderFallbacks += 1;
      try{ return oldRender.apply(this, arguments); }catch(err){ throw error; }
    }
  }

  function liteRenderBudget(){
    if(!isVisible('tabResumen') && currentTab() !== 'resumen'){
      stats.skipped.budget += 1;
      note('skip','renderBudget','tabResumen oculto');
      return undefined;
    }
    return oldBudget ? oldBudget.apply(this, arguments) : call('renderBudget', arguments);
  }

  function liteRenderGraficas(){
    if(!isVisible('tabGraficas') && currentTab() !== 'graficas'){
      stats.skipped.graficas += 1;
      note('skip','renderGraficas','tabGraficas oculto');
      return undefined;
    }
    return oldGraficas ? oldGraficas.apply(this, arguments) : undefined;
  }

  function liteRenderMaintenance(){
    if(!isVisible('maintenanceWrapper')){
      stats.skipped.maintenance += 1;
      note('skip','renderMaintenance','maintenanceWrapper oculto');
      return undefined;
    }
    stats.maintenanceLiteCalls += 1;
    call('renderMaintenanceTabs');
    const mt = currentMaintenanceTab();
    if(mt === 'personas') call('renderPersonas');
    else if(mt === 'eventos') call('renderEventos');
    else if(mt === 'tiendas') call('renderTiendas');
    else if(mt === 'productos') call('renderProductos');
    else if(mt === 'acceso') call('renderAcceso');
    else if(mt === 'importar') { /* la pantalla de importacion no necesita repintado masivo */ }
    else if(oldMaintenance) return oldMaintenance.apply(this, arguments);
    return undefined;
  }

  try{ renderGraficas = liteRenderGraficas; }catch(_){ }
  try{ window.renderGraficas = liteRenderGraficas; }catch(_){ }
  try{ renderBudget = liteRenderBudget; }catch(_){ }
  try{ window.renderBudget = liteRenderBudget; }catch(_){ }
  try{ renderMaintenance = liteRenderMaintenance; }catch(_){ }
  try{ window.renderMaintenance = liteRenderMaintenance; }catch(_){ }
  try{ render = liteRender; }catch(_){ }
  try{ window.render = liteRender; }catch(_){ }

  function patchAppActions(){
    try{
      const actions = window.ControlEventApp?.actions;
      if(!actions) return;
      actions.render = (...args) => window.render(...args);
      actions.renderBudget = (...args) => window.renderBudget(...args);
      actions.renderGraficas = (...args) => window.renderGraficas(...args);
      actions.renderMaintenance = (...args) => window.renderMaintenance(...args);
    }catch(_){ }
  }
  patchAppActions();
  window.addEventListener('controlevent:app-ready', patchAppActions);
  window.addEventListener('controlevent:runtime-ready', patchAppActions);

  function inspect(){
    return {
      ...stats,
      currentTab: currentTab(),
      currentMaintenanceTab: currentMaintenanceTab(),
      visible: {
        ingresos: isVisible('tabIngresos'),
        compras: isVisible('tabCompras'),
        donaciones: isVisible('tabDonaciones'),
        resumen: isVisible('tabResumen'),
        graficas: isVisible('tabGraficas'),
        mantenimiento: isVisible('maintenanceWrapper')
      },
      commands: ['ControlEventLowResourceLegacy.print()']
    };
  }
  function print(){
    const report = inspect();
    console.group('[ControlEventLowResourceLegacy/ControlEvent v29.2]');
    console.info(report);
    try{ console.table(report.executed); }catch(_){ }
    console.groupEnd();
    return report;
  }
  window.ControlEventLowResourceLegacy = {version:VERSION, installed:true, inspect, print, refreshSelectors:()=>renderSelectorsIfNeeded(true)};
  try{ console.info('[ControlEventLowResourceLegacy/ControlEvent v29.2] Render legacy recortado activado.'); }catch(_){ }
})();
