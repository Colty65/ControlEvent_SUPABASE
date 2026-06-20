/* ControlEvent v11.2_prod - LowResourceLegacyPatch
   Parche clasico posterior al legacy: puede reasignar el render global heredado.
   V29.4 conserva el rendimiento de v29.2/v29.3, pero protege el arranque post-login:
   - primer render autenticado y cambio de evento hacen un bootstrap completo controlado;
   - las opciones GD/RW/RO se sincronizan inmediatamente, sin esperar al intervalo heredado;
   - la pantalla activa se re-activa sin temporizadores para evitar paneles vacios en iPad/Android. */
(function(){
  'use strict';
  const root = window.ControlEventLowResource;
  const VERSION = 'ControlEvent v11.2_prod';
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
    fullBootstrapRenders: 0,
    selectorsRendered: 0,
    maintenanceLiteCalls: 0,
    moduleActivations: 0,
    roleSyncCalls: 0,
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
  function authRef(){
    try{ if(typeof authUser !== 'undefined') return authUser || null; }catch(_){ }
    try{ return window.ControlEventApp?.authUser || window.authUser || null; }catch(_){ return null; }
  }
  function hasAuth(){ return !!authRef(); }
  function role(){ return String(authRef()?.nivel || '').toUpperCase(); }
  function isGD(){ return role() === 'GD'; }
  function isRW(){ return role() === 'RW'; }
  function isRO(){ return role() === 'RO'; }
  function stateRef(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ return window.ControlEventApp?.state || window.state || {}; }catch(_){ return {}; }
  }
  function stateSignature(){
    const st = stateRef();
    const count = k => Array.isArray(st[k]) ? st[k].length : 0;
    return [st.selectedEventId || '', count('eventos'), count('personas'), count('productos'), count('tiendas')].join('|');
  }
  function authEventSignature(){
    const st = stateRef();
    const u = authRef() || {};
    return [u.identificacion || '', u.nivel || '', st.selectedEventId || '', Array.isArray(st.eventos) ? st.eventos.length : 0].join('|');
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

  function show(el, yes){
    if(!el) return;
    el.classList.toggle('hidden-by-role-v228', !yes);
    if(yes){
      el.style.removeProperty('display');
      el.removeAttribute('aria-hidden');
    }else{
      el.style.setProperty('display', 'none', 'important');
      el.setAttribute('aria-hidden', 'true');
    }
  }
  function setDisabled(el, yes){
    if(!el) return;
    el.disabled = !!yes;
    if(yes) el.setAttribute('aria-disabled','true');
    else el.removeAttribute('aria-disabled');
  }
  function hideMobileTarget(target, visible){
    document.querySelectorAll(`.mobile-menu-action[data-target="${target}"]`).forEach(el => show(el, visible));
  }
  function currentEvent(){
    const st = stateRef();
    const id = String(st.selectedEventId || '');
    return (Array.isArray(st.eventos) ? st.eventos : []).find(e => String(e.id) === id) || null;
  }
  function isFinalized(){ return String(currentEvent()?.situacion || '').toUpperCase() === 'FINALIZADO'; }
  function applyCriticalRoleUi(){
    if(!hasAuth()) return;
    stats.roleSyncCalls += 1;
    const gd = isGD(), rw = isRW(), ro = isRO();
    try{
      document.body.classList.toggle('ce-role-gd', gd);
      document.body.classList.toggle('ce-role-rw', rw);
      document.body.classList.toggle('ce-role-ro', ro);
      document.body.classList.toggle('ce-event-finalized', isFinalized());
      document.body.classList.toggle('ce-event-not-finalized', !isFinalized());
    }catch(_){ }

    // Menú principal: en GD deben estar todas desde el primer render post-login.
    show($('tabIngresosBtn'), !ro);
    show($('tabDonacionesBtn'), !ro);
    show($('tabComprasBtn'), !ro);
    show($('tabMapaBtn'), gd || rw || ro);
    show($('tabResumenBtn'), gd || rw || ro);
    show($('tabGraficasBtn'), gd || rw || ro);

    // Herramientas del pie y mantenimiento, replicando el criterio heredado crítico.
    show($('btnExportExcel'), (gd || rw || ro) && (!ro || isFinalized()));
    setDisabled($('btnExportExcel'), ro && !isFinalized());
    show($('btnOpenImport'), gd);
    show($('btnExportSeed'), gd);
    show($('btnToggleMaintenance'), gd || rw);
    show($('mtAccesoBtn'), gd);
    const accCard = $('mtAcceso');
    if(accCard) accCard.classList.toggle('hidden-by-role', !gd);

    ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn'].forEach(t => hideMobileTarget(t, !ro));
    hideMobileTarget('tabMapaBtn', gd || rw || ro);
    hideMobileTarget('tabResumenBtn', gd || rw || ro);
    hideMobileTarget('tabGraficasBtn', gd || rw || ro);
    hideMobileTarget('btnExportExcel', (gd || rw || ro) && (!ro || isFinalized()));
    hideMobileTarget('btnToggleMaintenance', gd || rw);
    hideMobileTarget('btnOpenImport', gd);
    hideMobileTarget('btnExportSeed', gd);

    if(ro){
      show($('tabIngresos'), false);
      show($('tabDonaciones'), false);
      show($('tabCompras'), false);
    }
    note('role-sync', 'applyCriticalRoleUi', role());
  }

  let moduleActivationBusy = false;
  function activateCurrentModule(reason){
    const modules = window.ControlEventModules;
    if(moduleActivationBusy || !modules || typeof modules.activate !== 'function') return;
    const tab = currentTab();
    moduleActivationBusy = true;
    stats.moduleActivations += 1;
    Promise.resolve()
      .then(() => modules.activate(tab, {reason: reason || 'low-resource-render-sync'}))
      .catch(error => {
        stats.errors.push({at:new Date().toISOString(), name:'activateCurrentModule', message:error?.message || String(error)});
        if(stats.errors.length > 12) stats.errors.shift();
      })
      .finally(() => { moduleActivationBusy = false; });
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



  function setCurrentTab(value){
    try{ if(typeof currentMainTab !== 'undefined') currentMainTab = value; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = value; }catch(_){ }
  }

  function warmCoreDataScreens(reason){
    // V30.6: tras login/cambio de evento, precalienta las tres pantallas de captura
    // para que Colaboradores, Donaciones y Compras no queden vacías si el render LITE
    // ha evitado repintar una pestaña oculta. Se restaura la pestaña original antes
    // de devolver el control, por lo que no debería verse parpadeo.
    if(!hasAuth() || isRO()) return;
    const originalTab = currentTab();
    try{
      window.__ceMapaProductosWarmup = true;
      renderSelectorsIfNeeded(true);
      const tasks = [
        {tab:'ingresos', renders:['renderIngresosSummary','renderColabs']},
        {tab:'donaciones', renders:['renderDonaciones']},
        {tab:'compras', renders:['renderCompras']}
      ];
      tasks.forEach(item => {
        setCurrentTab(item.tab);
        call('renderTabVisibility');
        item.renders.forEach(name => call(name));
      });
    }catch(error){
      stats.errors.push({at:new Date().toISOString(), name:'warmCoreDataScreens', message:error?.message || String(error), reason});
      if(stats.errors.length > 12) stats.errors.shift();
    }finally{
      window.__ceMapaProductosWarmup = false;
      setCurrentTab(originalTab || 'ingresos');
      try{ call('renderTabVisibility'); }catch(_){ }
      try{ if(originalTab === 'mapa' && window.renderMapaProductos) window.renderMapaProductos(); }catch(_){ }
    }
  }

  const oldRender = getFn('render');
  const oldBudget = getFn('renderBudget');
  const oldGraficas = getFn('renderGraficas');
  const oldMaintenance = getFn('renderMaintenance');
  let lastBootstrapSignature = '';

  function needsFullBootstrap(){
    if(!hasAuth()) return false;
    const sig = authEventSignature();
    if(sig && sig !== lastBootstrapSignature){
      lastBootstrapSignature = sig;
      return true;
    }
    return false;
  }

  function runFullBootstrap(thisArg, args, reason){
    stats.fullBootstrapRenders += 1;
    note('full-bootstrap', 'render', reason);
    const result = oldRender.apply(thisArg || window, args || []);
    try{ applyCriticalRoleUi(); }catch(_){ }
    try{ warmCoreDataScreens(reason || 'auth-event'); }catch(_){ }
    activateCurrentModule('full-bootstrap:' + (reason || 'auth-event'));
    return result;
  }

  function liteRender(){
    if(!oldRender){ stats.fullRenderFallbacks += 1; return undefined; }
    stats.liteRenderCalls += 1;
    try{
      call('renderEnvironmentBanner');
      call('renderAuthUI');
      if(!hasAuth()) return undefined;

      // Punto clave v30.7: primer render autenticado y cambio real de evento no se recortan.
      // Así no quedan menús GD ocultos ni paneles vacíos tras login/selección de evento.
      if(needsFullBootstrap()){
        return runFullBootstrap(this, arguments, 'auth-or-event-change');
      }

      // v3.5: un render no debe persistir estado; evita guardar pantallas locales vacias.
      call('renderHeader');
      call('renderTabVisibility');
      applyCriticalRoleUi();
      renderSelectorsIfNeeded(false);
      const tab = currentTab();
      if(tab === 'ingresos'){
        call('renderIngresosSummary');
        call('renderColabs');
      }else if(tab === 'compras'){
        call('renderCompras');
      }else if(tab === 'donaciones'){
        call('renderDonaciones');
      }else if(tab === 'mapa'){
        call('renderMapaProductos');
      }else if(tab === 'resumen'){
        call('renderBudget');
      }else if(tab === 'graficas'){
        call('renderGraficas');
      }else{
        stats.fullRenderFallbacks += 1;
        return runFullBootstrap(this, arguments, 'unknown-tab:' + tab);
      }
      if(isVisible('maintenanceWrapper')) call('renderMaintenance');
      call('renderPermissions');
      call('renderLockState');
      applyCriticalRoleUi();
      activateCurrentModule('lite-render:' + tab);
      note('lite-render', tab);
      return undefined;
    }catch(error){
      stats.fullRenderFallbacks += 1;
      try{ return runFullBootstrap(this, arguments, 'exception-fallback'); }catch(err){ throw error; }
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
      if(window.renderMapaProductos) actions.renderMapaProductos = (...args) => window.renderMapaProductos(...args);
      actions.renderMaintenance = (...args) => window.renderMaintenance(...args);
    }catch(_){ }
    try{ applyCriticalRoleUi(); }catch(_){ }
  }
  patchAppActions();
  window.addEventListener('controlevent:app-ready', () => { patchAppActions(); activateCurrentModule('app-ready'); });
  window.addEventListener('controlevent:runtime-ready', () => { patchAppActions(); activateCurrentModule('runtime-ready'); });
  document.addEventListener('change', event => {
    if(event.target && event.target.id === 'selectedEvent'){
      lastBootstrapSignature = '';
    }
  }, true);

  function inspect(){
    return {
      ...stats,
      currentTab: currentTab(),
      currentMaintenanceTab: currentMaintenanceTab(),
      role: role(),
      bootstrapSignature: lastBootstrapSignature,
      visible: {
        ingresos: isVisible('tabIngresos'),
        compras: isVisible('tabCompras'),
        donaciones: isVisible('tabDonaciones'),
        mapa: isVisible('tabMapaProductos'),
        resumen: isVisible('tabResumen'),
        graficas: isVisible('tabGraficas'),
        mantenimiento: isVisible('maintenanceWrapper')
      },
      commands: ['ControlEventLowResourceLegacy.print()', 'ControlEventLowResourceLegacy.syncRoleUi()', 'ControlEventLowResourceLegacy.refreshSelectors()']
    };
  }
  function print(){
    const report = inspect();
    console.group('[ControlEventLowResourceLegacy/ControlEvent v11.2_prod]');
    console.info(report);
    try{ console.table(report.executed); }catch(_){ }
    console.groupEnd();
    return report;
  }
  window.ControlEventLowResourceLegacy = {
    version:VERSION,
    installed:true,
    inspect,
    print,
    refreshSelectors:()=>renderSelectorsIfNeeded(true),
    syncRoleUi: applyCriticalRoleUi,
    activateCurrentModule
  };
  window.__ceV294RoleSync = applyCriticalRoleUi;
  try{ console.info('[ControlEventLowResourceLegacy/ControlEvent v11.2_prod] Render legacy recortado + Mapa de recursos activado.'); }catch(_){ }
})();
