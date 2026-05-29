/* ControlEvent v1.0.1/pr - correcciones de navegación, casitas, menú, backup y Mapa de recursos. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v1.0.1/pr';
  const VERSION_FILE = 'ControlEvent_v1_0_1_pr';
  const $ = id => document.getElementById(id);
  const now = () => Date.now();
  let lastHomeAt = 0;
  let lastDonationToggle = {id:'', at:0};

  function app(){ try{ return window.ControlEventApp || window.ControlEventRuntime?.app || null; }catch(_){ return null; } }
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return app()?.state || window.state || {}; }
  function auth(){ try{ if(typeof authUser !== 'undefined') return authUser || null; }catch(_){ } return app()?.authUser || window.authUser || window.__CONTROL_EVENT_USER__ || null; }
  function currentTab(){ try{ if(typeof currentMainTab !== 'undefined') return String(currentMainTab || 'ingresos'); }catch(_){ } return String(app()?.navigation?.currentMainTab || 'ingresos'); }
  function setCurrentTab(tab){ if(!tab) return; try{ if(typeof currentMainTab !== 'undefined') currentMainTab = tab; }catch(_){ } try{ if(app()?.navigation) app().navigation.currentMainTab = tab; }catch(_){ } }
  function hasEvent(){ const s=st(); const id=String(s.selectedEventId||''); return !!id && Array.isArray(s.eventos) && s.eventos.some(e=>String(e.id)===id); }
  function safeRender(){ try{ if(typeof render === 'function') render(); else window.render?.(); }catch(_){ } }
  function saveNow(){ try{ if(typeof saveState === 'function') saveState(); else window.saveState?.(); }catch(_){ } }
  function scrollToTopOf(target){
    const el = target || document.querySelector('.main') || document.scrollingElement || document.documentElement;
    try{
      const top = el && el.getBoundingClientRect ? Math.max(0, (window.pageYOffset || document.documentElement.scrollTop || 0) + el.getBoundingClientRect().top - 8) : 0;
      window.scrollTo({top, left:0, behavior:'smooth'});
    }catch(_){ try{ window.scrollTo(0,0); }catch(__){} }
  }
  function scrollMapaTop(){
    const target = document.querySelector('#tabMapaProductos .mapa-productos-card') || $('tabMapaProductos') || $('mainTabs');
    scrollToTopOf(target);
    return false;
  }
  function activeMaintenancePanel(){
    const wrap = $('maintenanceWrapper');
    if(!wrap || wrap.classList.contains('hidden')) return null;
    return document.querySelector('#mtPersonas:not(.hidden),#mtTiendas:not(.hidden),#mtProductos:not(.hidden)');
  }
  function scrollMaintenanceTop(){
    const target = activeMaintenancePanel() || $('maintenanceWrapper') || document.querySelector('.main');
    scrollToTopOf(target);
    try{ target?.scrollTo?.({top:0,left:0,behavior:'smooth'}); }catch(_){ }
    return false;
  }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
    try{ const proto=HTMLAnchorElement.prototype; if(!proto.click.__ceV411Version){ const old=proto.click; const wrapped=function(){ try{ if(this.download) this.download=String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){} return old.apply(this, arguments); }; wrapped.__ceV411Version=true; proto.click=wrapped; } }catch(_){ }
  }

  function injectStyle(){
    if($('ceV411Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV411Style';
    style.textContent = `
      #mainTabs{grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:5px!important;}
      #mainTabs .tab{min-width:0!important;padding:8px 8px!important;}
      #mainTabs .tab .tabicon{font-size:36px!important;line-height:1!important;}
      #toggleComprasEvent,.mobile-menu-action[data-target="toggleComprasEvent"]{display:none!important;}
      #comprasEventBody{display:block!important;}
      #cePlanTopFloat,.ce-plan-top-float{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #ceMapaFloatingHomeButton.mapa-floating-home,.ce-maint-floating-top-v40{z-index:3200!important;right:18px!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;background:rgba(255,255,255,.98)!important;color:#0f172a!important;border:1px solid rgba(148,163,184,.65)!important;}
      @media (max-width:760px){
        #mainTabs{grid-template-columns:repeat(7,minmax(0,1fr))!important;gap:4px!important;padding:6px!important;}
        #mainTabs .tab{min-height:48px!important;padding:6px 4px!important;border-radius:13px!important;}
        #mainTabs .tab .tabicon{font-size:28px!important;}
        #ceMapaFloatingHomeButton.mapa-floating-home,.ce-maint-floating-top-v40{top:auto!important;right:14px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 86px)!important;transform:none!important;width:44px!important;height:44px!important;font-size:22px!important;}
        .donation-delivered-cell{min-width:0!important;justify-content:flex-start!important;}
        .mapa-donation-delivered{padding:7px 10px!important;min-height:38px!important;touch-action:manipulation!important;position:relative!important;z-index:3!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function syncCompraToggle(){
    const btn = $('toggleComprasEvent');
    if(btn){ btn.classList.add('hidden'); btn.hidden = true; btn.setAttribute('aria-hidden','true'); btn.tabIndex = -1; }
    const body = $('comprasEventBody');
    if(body){ body.classList.remove('hidden'); body.hidden = false; body.style.display = 'block'; }
    document.querySelectorAll('.mobile-menu-action[data-target="toggleComprasEvent"]').forEach(el => { el.hidden = true; el.style.display='none'; });
  }

  function syncFloatingHomes(){
    const plan = $('cePlanTopFloat');
    if(plan){ plan.hidden = true; plan.classList.add('hidden'); plan.style.display = 'none'; plan.style.pointerEvents = 'none'; }
    const mapBtn = $('ceMapaFloatingHomeButton');
    if(mapBtn){
      const showMap = currentTab() === 'mapa' && hasEvent() && $('tabMapaProductos') && !$('tabMapaProductos').classList.contains('hidden');
      mapBtn.hidden = !showMap;
      mapBtn.classList.toggle('is-visible', !!showMap);
      mapBtn.textContent = '⌂';
      mapBtn.style.pointerEvents = showMap ? 'auto' : 'none';
    }
    const maintBtn = $('ceMaintFloatingTopV40');
    if(maintBtn){
      const showMaint = !!activeMaintenancePanel();
      maintBtn.hidden = !showMaint;
      maintBtn.classList.toggle('is-visible', showMaint);
      maintBtn.textContent = '⌂';
      maintBtn.style.pointerEvents = showMaint ? 'auto' : 'none';
    }
  }

  function patchRenderForLoginAndSync(){
    const old = (typeof render === 'function') ? render : window.render;
    if(typeof old !== 'function' || old.__ceV411Wrapped) return;
    let hadAuth = !!auth();
    const wrapped = function(){
      const hasAuthNow = !!auth();
      if(hasAuthNow && !hadAuth){
        // v43.7: al entrar desde LOGIN, la primera ventana de trabajo será GRAFICAS.
        setCurrentTab('graficas');
      }
      const result = old.apply(this, arguments);
      hadAuth = hasAuthNow;
      setTimeout(() => { applyVersion(); syncCompraToggle(); syncFloatingHomes(); }, 40);
      return result;
    };
    wrapped.__ceV411Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
    try{ if(app()?.actions) app().actions.render = (...args) => wrapped(...args); }catch(_){ }
  }

  function patchChangeSelectedEventPreserveTab(){
    const old = window.changeSelectedEvent;
    if(typeof old !== 'function' || old.__ceV411PreserveTab) return;
    const wrapped = async function(value){
      const before = currentTab() || 'graficas';
      const ret = await old.apply(this, arguments);
      // v43.7: al cambiar de evento desde dentro, mantener la misma ventana activa.
      if(before) setCurrentTab(before);
      try{ if(typeof render === 'function') render(); else window.render?.(); }catch(_){ }
      setTimeout(() => {
        try{ window.ControlEventModules?.activate?.(before, {reason:'v43.7-event-change-preserve-tab'}); }catch(_){ }
        if(before === 'mapa') try{ window.renderMapaProductos?.(); }catch(_){ }
        applyVersion(); syncCompraToggle(); syncFloatingHomes();
      }, 80);
      return ret;
    };
    wrapped.__ceV411PreserveTab = true;
    wrapped.__ceV411Original = old;
    window.changeSelectedEvent = wrapped;
    try{ changeSelectedEvent = wrapped; }catch(_){ }
  }

  function handleHomeEvent(event){
    const btn = event.target?.closest?.('#ceMapaFloatingHomeButton,#ceMaintFloatingTopV40');
    if(!btn) return;
    const t = now();
    if(t - lastHomeAt < 320){ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); return false; }
    lastHomeAt = t;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    if(btn.id === 'ceMapaFloatingHomeButton') scrollMapaTop();
    else scrollMaintenanceTop();
    setTimeout(syncFloatingHomes, 120);
    return false;
  }

  function findDonation(id){
    const list = Array.isArray(st().compras) ? st().compras : [];
    return list.find(row => String(row?.id || '') === String(id || '')) || null;
  }
  function isDelivered(row){
    return !!(row && (row.donacionEntregada || row.entregadoDonacion || row.entregado === true || row.entregado === 'SI' || row.entregado === 'SÍ'));
  }
  function handleDonationDelivered(event){
    const btn = event.target?.closest?.('#tabMapaProductos [data-mapa-donation-toggle="1"]');
    if(!btn) return;
    const id = String(btn.getAttribute('data-donation-id') || '');
    const t = now();
    if(lastDonationToggle.id === id && t - lastDonationToggle.at < 360){ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); return false; }
    lastDonationToggle = {id, at:t};
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    const row = findDonation(id);
    if(!row) return false;
    row.donacionEntregada = !isDelivered(row);
    saveNow();
    try{ window.renderMapaProductos?.(); }catch(_){ safeRender(); }
    setTimeout(syncFloatingHomes, 80);
    return false;
  }

  function installEventInterceptors(){
    if(window.__ceV411EventInterceptors) return;
    window.__ceV411EventInterceptors = true;
    ['click','pointerup','touchend'].forEach(type => {
      document.addEventListener(type, function(event){
        if(event.target?.closest?.('#ceMapaFloatingHomeButton,#ceMaintFloatingTopV40')) return handleHomeEvent(event);
        if(event.target?.closest?.('#tabMapaProductos [data-mapa-donation-toggle="1"]')) return handleDonationDelivered(event);
      }, {capture:true, passive:false});
    });
  }

  function install(){
    injectStyle();
    applyVersion();
    patchRenderForLoginAndSync();
    patchChangeSelectedEventPreserveTab();
    syncCompraToggle();
    syncFloatingHomes();
    installEventInterceptors();
  }

  window.ControlEventV411 = {version:VERSION, install, syncFloatingHomes, setCurrentTab, scrollMapaTop, scrollMaintenanceTop};
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  document.addEventListener('click', () => setTimeout(() => { install(); syncFloatingHomes(); }, 80), true);
  document.addEventListener('scroll', () => setTimeout(syncFloatingHomes, 30), true);
  [0,120,500,1200,2500].forEach(ms => setTimeout(install, ms));
})();
