/* ControlEvent v17_prod - Estabilizador de vistas
   Refuerza el refresco de Colaboradores/Ingresos, Donaciones y Compras tras login,
   cambio de evento y cambio de pestaña. No cambia datos: sólo repinta la vista activa. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v17_prod';
  const stats = {version:VERSION, installed:true, schedules:0, hydrations:0, forced:0, errors:[], last:null};
  const $ = id => document.getElementById(id);
  const TAB_BY_BUTTON = {
    tabIngresosBtn:'ingresos',
    tabDonacionesBtn:'donaciones',
    tabComprasBtn:'compras',
    tabMapaBtn:'mapa',
    tabResumenBtn:'resumen',
    tabGraficasBtn:'graficas'
  };
  const PANEL_BY_TAB = {
    ingresos:'tabIngresos',
    donaciones:'tabDonaciones',
    compras:'tabCompras',
    mapa:'tabMapaProductos',
    resumen:'tabResumen',
    graficas:'tabGraficas'
  };
  function app(){ try{return window.ControlEventApp || null;}catch(_){return null;} }
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } try{return app()?.state || window.state || {};}catch(_){return {};} }
  function auth(){ try{ if(typeof authUser !== 'undefined') return authUser || null; }catch(_){ } try{return app()?.authUser || window.authUser || null;}catch(_){return null;} }
  function role(){ return String(auth()?.nivel || '').toUpperCase(); }
  function hasAuth(){ return !!auth(); }
  function eventId(){ return String(st().selectedEventId || ''); }
  function hasEvent(){ const id=eventId(); const evs=Array.isArray(st().eventos)?st().eventos:[]; return !!id && evs.some(e=>String(e.id)===id); }
  function currentTab(){
    try{ if(typeof currentMainTab !== 'undefined') return String(currentMainTab || 'ingresos'); }catch(_){ }
    try{ return String(app()?.navigation?.currentMainTab || 'ingresos'); }catch(_){ return 'ingresos'; }
  }
  function setCurrentTab(tab){
    if(!tab) return;
    try{ if(typeof currentMainTab !== 'undefined') currentMainTab = tab; }catch(_){ }
    try{ if(app()?.navigation) app().navigation.currentMainTab = tab; }catch(_){ }
  }
  function getFn(name){
    try{ if(typeof window[name] === 'function') return window[name]; }catch(_){ }
    try{ return Function('return (typeof '+name+' === "function") ? '+name+' : null')(); }catch(_){ return null; }
  }
  function call(name){
    const fn=getFn(name);
    if(typeof fn!=='function') return undefined;
    try{ return fn(); }catch(error){
      stats.errors.push({at:new Date().toISOString(), name, message:error?.message || String(error)});
      if(stats.errors.length>10) stats.errors.shift();
      return undefined;
    }
  }
  function visiblePanel(tab){ const el=$(PANEL_BY_TAB[tab]); return !!el && !el.classList.contains('hidden'); }
  function arr(name){ const v=st()[name]; return Array.isArray(v)?v:[]; }
  function isDonationTicketValue(v){
    try{ const fn=getFn('isDonationTicket'); if(fn) return !!fn(v); }catch(_){ }
    return /^DONADO/i.test(String(v||''));
  }
  function eventRows(){
    const id=eventId();
    const colabs=arr('colaboradores').filter(r=>String(r.eventId||'')===id);
    const compras=arr('compras').filter(r=>String(r.eventId||'')===id);
    return {
      colabs,
      compras: compras.filter(r=>!isDonationTicketValue(r.ticketDonacion)),
      donaciones: compras.filter(r=>isDonationTicketValue(r.ticketDonacion))
    };
  }
  function hasItemCards(id){ const el=$(id); return !!el && !!el.querySelector('.itemcard'); }
  function visibleButMissing(tab){
    if(!visiblePanel(tab)) return false;
    const rows=eventRows();
    if(tab==='ingresos') return rows.colabs.length>0 && !hasItemCards('collabList');
    if(tab==='donaciones') return rows.donaciones.length>0 && !hasItemCards('donacionesList');
    if(tab==='compras') return rows.compras.length>0 && !hasItemCards('comprasList');
    return false;
  }
  function hydrate(tab, reason){
    if(!hasAuth() || !hasEvent()) return;
    tab = tab || currentTab();
    if(role()==='RO' && ['ingresos','donaciones','compras'].includes(tab)) return;
    stats.hydrations += 1;
    stats.last = {at:new Date().toISOString(), tab, reason};
    try{ call('renderHeader'); }catch(_){ }
    try{ call('renderTabVisibility'); }catch(_){ }
    try{ if(role()!=='RO') call('renderMainSelectors'); }catch(_){ }
    if(tab==='ingresos'){
      call('renderIngresosSummary');
      call('renderColabs');
    }else if(tab==='donaciones'){
      call('renderDonaciones');
    }else if(tab==='compras'){
      call('renderCompras');
    }else if(tab==='mapa'){
      call('renderMapaProductos');
    }else if(tab==='resumen'){
      call('renderBudget');
    }else if(tab==='graficas'){
      call('renderGraficas');
    }
    try{ call('renderPermissions'); call('renderLockState'); }catch(_){ }
    try{ window.ControlEventModules?.activate?.(tab, {reason:'view-refresh-stabilizer:'+reason}); }catch(_){ }
  }
  let timer = 0;
  function schedule(reason, delay){
    stats.schedules += 1;
    clearTimeout(timer);
    timer = setTimeout(() => hydrate(currentTab(), reason || 'scheduled'), Number(delay ?? 80)), Number(delay ?? 80);
  }
  function scheduleSeries(reason){
    schedule(reason+':quick', 60);
    setTimeout(() => hydrate(currentTab(), reason+':late'), 260);
    setTimeout(() => {
      const tab=currentTab();
      if(visibleButMissing(tab)){ stats.forced += 1; hydrate(tab, reason+':missing-visible-data'); }
    }, 720);
  }
  function tabFromEvent(event){
    const btn = event.target?.closest?.('button[id],.mobile-menu-action[data-target]');
    if(!btn) return '';
    const id = btn.id || btn.dataset?.target || '';
    return TAB_BY_BUTTON[id] || '';
  }
  document.addEventListener('click', event => {
    const tab=tabFromEvent(event);
    if(!tab) return;
    setCurrentTab(tab);
    // Al salir de Mapa, se desactiva su pin lógico público.
    if(tab!=='mapa') { try{ window.__ceMapaProductosPinned=false; }catch(_){ } }
    scheduleSeries('tab-click:'+tab);
  }, false);
  document.addEventListener('change', event => {
    if(event.target && event.target.id==='selectedEvent'){
      scheduleSeries('event-change');
    }
  }, false);
  window.addEventListener('controlevent:app-ready', () => scheduleSeries('app-ready'));
  window.addEventListener('controlevent:runtime-ready', () => scheduleSeries('runtime-ready'));

  function patchRender(){
    const old = getFn('render');
    if(typeof old !== 'function' || old.__ceV304Stabilized) return false;
    const wrapped = function(){
      const result = old.apply(this, arguments);
      schedule('after-render', 90);
      return result;
    };
    wrapped.__ceV304Stabilized = true;
    try{ render = wrapped; }catch(_){ }
    try{ window.render = wrapped; }catch(_){ }
    try{ if(app()?.actions) app().actions.render = (...args)=>wrapped(...args); }catch(_){ }
    return true;
  }
  patchRender();
  setTimeout(patchRender, 400);
  setTimeout(patchRender, 1400);
  setInterval(() => {
    const tab=currentTab();
    if(visibleButMissing(tab)){ stats.forced += 1; hydrate(tab, 'watchdog-visible-empty'); }
  }, window.ControlEventLowResource?.interval?.(2600) || 2600);
  window.ControlEventViewRefreshStabilizer = {version:VERSION, stats, hydrate, schedule:scheduleSeries, inspect:()=>({...stats, tab:currentTab(), role:role(), eventId:eventId(), rows:eventRows()})};
})();
