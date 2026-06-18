/* ControlEvent v10.4.2_prod - Estabilizador de vistas (hotfix sin retemblores)
   Esta versión evita repintados múltiples. Solo interviene si la vista activa queda vacía
   aunque el estado del evento sí tenga datos. */
(function(){
  'use strict';
  if(window.__ceViewRefreshStabilizerNoTremble) return;
  window.__ceViewRefreshStabilizerNoTremble = true;
  const VERSION = 'ControlEvent v10.4.2_prod HOTFIX no-tremble';
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
  function hasItemCards(id){ const el=$(id); return !!el && !!el.querySelector('.itemcard,.ce-mapa-card,.ce-budget-card'); }
  function visibleButMissing(tab){
    if(!visiblePanel(tab)) return false;
    const rows=eventRows();
    if(tab==='ingresos') return rows.colabs.length>0 && !hasItemCards('collabList');
    if(tab==='donaciones') return rows.donaciones.length>0 && !hasItemCards('donacionesList');
    if(tab==='compras') return rows.compras.length>0 && !hasItemCards('comprasList');
    return false;
  }
  let hydrateTimer=0, lastHydrate=0;
  function hydrate(tab, reason){
    if(!hasAuth() || !hasEvent()) return;
    tab = tab || currentTab();
    if(role()==='RO' && ['ingresos','donaciones','compras'].includes(tab)) return;
    if(!visibleButMissing(tab)) return; // clave del hotfix: no repintar si ya hay pantalla
    const now=Date.now();
    if(now-lastHydrate<1600) return;
    lastHydrate=now;
    stats.hydrations += 1;
    stats.forced += 1;
    stats.last = {at:new Date().toISOString(), tab, reason};
    if(tab==='ingresos'){
      call('renderIngresosSummary');
      call('renderColabs');
    }else if(tab==='donaciones'){
      call('renderDonaciones');
    }else if(tab==='compras'){
      call('renderCompras');
    }
  }
  function schedule(reason, delay){
    stats.schedules += 1;
    clearTimeout(hydrateTimer);
    hydrateTimer=setTimeout(()=>hydrate(currentTab(), reason || 'missing-check'), Number(delay ?? 650));
  }
  function scheduleSeries(reason){ schedule(reason, 700); }
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
    if(tab!=='mapa') { try{ window.__ceMapaProductosPinned=false; }catch(_){ } }
    schedule('tab-click:'+tab, 750);
  }, false);
  document.addEventListener('change', event => {
    if(event.target && event.target.id==='selectedEvent') schedule('event-change', 900);
  }, false);
  window.addEventListener('controlevent:app-ready', () => schedule('app-ready', 900));
  window.addEventListener('controlevent:runtime-ready', () => schedule('runtime-ready', 900));
  window.addEventListener('controlevent:event-loaded', () => schedule('event-loaded', 900));
  setInterval(() => { schedule('watchdog-visible-empty', 100); }, window.ControlEventLowResource?.interval?.(5000) || 5000);
  window.ControlEventViewRefreshStabilizer = {version:VERSION, stats, hydrate, schedule:scheduleSeries, inspect:()=>({...stats, tab:currentTab(), role:role(), eventId:eventId(), rows:eventRows()})};
})();
