/* ControlEvent v20_prod - casitas globales, móvil en donaciones y guardado inmediato de compras/donaciones. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v20_prod';
  const VERSION_FILE = 'ControlEvent_v20_prod';
  const HOME_ID = 'ceGlobalFloatingHomeButton';
  let lastHomeAt = 0;
  let lastDonationToggle = {id:'', at:0};

  const $ = id => document.getElementById(id);
  const escCss = value => {
    const s = String(value ?? '');
    try{ return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return s.replace(/"/g, '\\"'); }
  };
  function app(){ try{ return window.ControlEventApp || window.ControlEventRuntime?.app || null; }catch(_){ return null; } }
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return app()?.state || window.state || {}; }
  function currentTab(){
    try{ if(typeof currentMainTab !== 'undefined') return String(currentMainTab || 'ingresos'); }catch(_){ }
    return String(app()?.navigation?.currentMainTab || 'ingresos');
  }
  function hasEvent(){ const s=st(); const id=String(s.selectedEventId||''); return !!id && Array.isArray(s.eventos) && s.eventos.some(e=>String(e.id)===id); }
  function saveNow(){ try{ if(typeof saveState === 'function') return saveState(); }catch(_){ } try{ return window.saveState?.(); }catch(_){ } }
  function renderNow(){ try{ if(typeof render === 'function') return render(); }catch(_){ } try{ return window.render?.(); }catch(_){ } }
  function isHidden(el){
    if(!el) return true;
    try{ if(el.hidden) return true; }catch(_){ }
    try{ if(el.classList?.contains('hidden')) return true; }catch(_){ }
    try{ const cs = getComputedStyle(el); if(cs.display === 'none' || cs.visibility === 'hidden') return true; }catch(_){ }
    return false;
  }
  function isVisible(el){
    if(!el || isHidden(el)) return false;
    try{ return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }catch(_){ return true; }
  }
  function activeTabPanel(){
    const ids = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas'];
    for(const id of ids){ const el=$(id); if(el && !isHidden(el)) return el; }
    const m = $('maintenanceWrapper'); if(m && !isHidden(m)) return m;
    return document.querySelector('.main') || document.body;
  }
  function activeMaintenancePanel(){
    const wrap = $('maintenanceWrapper');
    if(!wrap || isHidden(wrap)) return null;
    return document.querySelector('#mtPersonas:not(.hidden),#mtTiendas:not(.hidden),#mtProductos:not(.hidden)');
  }
  function scrollElementTopOnce(target){
    const el = target || activeTabPanel();
    try{
      if(el && el !== document.body && el !== document.documentElement){
        const top = Math.max(0, (window.pageYOffset || document.documentElement.scrollTop || 0) + el.getBoundingClientRect().top - 8);
        window.scrollTo({top, left:0, behavior:'smooth'});
        if(typeof el.scrollTo === 'function') el.scrollTo({top:0, left:0, behavior:'smooth'});
        else el.scrollTop = 0;
        return;
      }
    }catch(_){ }
    try{ window.scrollTo({top:0,left:0,behavior:'smooth'}); }catch(_){ try{ window.scrollTo(0,0); }catch(__){} }
  }
  function scrollCurrentTop(){
    if(currentTab() === 'mapa') return scrollElementTopOnce(document.querySelector('#tabMapaProductos .mapa-productos-card') || $('tabMapaProductos'));
    const maint = activeMaintenancePanel();
    if(maint) return scrollElementTopOnce(maint);
    return scrollElementTopOnce(activeTabPanel());
  }

  function injectStyle(){
    if($('ceV412Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV412Style';
    style.textContent = `
      body[data-ce-version] .appname span,
      body[data-ce-version] .appname-stack span{white-space:nowrap;}
      #cePlanTopFloat,.ce-plan-top-float{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #${HOME_ID},#ceMapaFloatingHomeButton.mapa-floating-home,.ce-maint-floating-top-v40{
        position:fixed!important;right:18px!important;top:50%!important;bottom:auto!important;transform:translateY(-50%)!important;
        z-index:2147483000!important;width:46px!important;height:46px!important;border-radius:999px!important;
        display:none;align-items:center!important;justify-content:center!important;
        background:rgba(255,255,255,.99)!important;color:#0f172a!important;border:1px solid rgba(148,163,184,.75)!important;
        box-shadow:0 12px 28px rgba(15,23,42,.24)!important;font-size:24px!important;font-weight:950!important;line-height:1!important;
        cursor:pointer!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;pointer-events:auto!important;
      }
      #${HOME_ID}.is-visible,#ceMapaFloatingHomeButton.mapa-floating-home.is-visible,.ce-maint-floating-top-v40.is-visible{display:flex!important;}
      #tabMapaProductos .mapa-donation-delivered{touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;position:relative!important;z-index:5!important;}
      @media (max-width:760px){
        #${HOME_ID},#ceMapaFloatingHomeButton.mapa-floating-home,.ce-maint-floating-top-v40{
          top:auto!important;right:14px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 104px)!important;transform:none!important;
          width:44px!important;height:44px!important;font-size:22px!important;
        }
        #tabMapaProductos .mapa-donation-list{display:grid!important;gap:8px!important;overflow:visible!important;}
        #tabMapaProductos .mapa-donation-row,
        #tabMapaProductos .mapa-donation-row.donation-only-row{
          display:grid!important;grid-template-columns:1fr!important;gap:6px!important;align-items:stretch!important;overflow:visible!important;
        }
        #tabMapaProductos .mapa-donation-row > div{min-width:0!important;}
        #tabMapaProductos .donation-delivered-cell{order:-1!important;width:100%!important;min-width:0!important;justify-content:stretch!important;display:flex!important;}
        #tabMapaProductos .mapa-donation-delivered{width:100%!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:42px!important;padding:9px 10px!important;font-size:13px!important;white-space:normal!important;}
        #tabMapaProductos .mapa-product-card.donation-only .mapa-product-head{grid-template-columns:1fr!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV412Version){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV412Version = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }

  function ensureGlobalHome(){
    let btn = $(HOME_ID);
    if(!btn){
      btn = document.createElement('button');
      btn.id = HOME_ID;
      btn.type = 'button';
      btn.className = 'ce-global-floating-home-v412';
      btn.textContent = '⌂';
      btn.title = 'Volver al inicio';
      btn.setAttribute('aria-label','Volver al inicio');
      document.body.appendChild(btn);
    }
    return btn;
  }
  function syncHomes(){
    const tab = currentTab();
    const maintOpen = !!activeMaintenancePanel();
    const showGlobal = !!hasEvent() && !maintOpen && tab !== 'mapa' && !isHidden(activeTabPanel());
    const global = ensureGlobalHome();
    global.hidden = !showGlobal;
    global.classList.toggle('is-visible', showGlobal);
    global.style.pointerEvents = showGlobal ? 'auto' : 'none';
    const map = $('ceMapaFloatingHomeButton');
    if(map){ const showMap = !!hasEvent() && tab === 'mapa' && !isHidden($('tabMapaProductos')); map.hidden = !showMap; map.classList.toggle('is-visible', showMap); map.textContent = '⌂'; map.style.pointerEvents = showMap ? 'auto' : 'none'; }
    const maint = $('ceMaintFloatingTopV40');
    if(maint){ maint.hidden = !maintOpen; maint.classList.toggle('is-visible', maintOpen); maint.textContent = '⌂'; maint.style.pointerEvents = maintOpen ? 'auto' : 'none'; }
    const plan = $('cePlanTopFloat');
    if(plan){ plan.hidden = true; plan.classList.add('hidden'); plan.style.display='none'; plan.style.pointerEvents='none'; }
  }

  function handleHomeEvent(event){
    const btn = event.target?.closest?.(`#${HOME_ID},#ceMapaFloatingHomeButton,#ceMaintFloatingTopV40`);
    if(!btn) return false;
    const t = Date.now();
    if(t - lastHomeAt < 450){ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); return true; }
    lastHomeAt = t;
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    scrollCurrentTop();
    setTimeout(syncHomes, 80);
    return true;
  }

  function isDelivered(row){ return !!(row && (row.donacionEntregada || row.entregadoDonacion || row.entregado === true || row.entregado === 'SI' || row.entregado === 'SÍ')); }
  function handleDonationDelivered(event){
    const btn = event.target?.closest?.('#tabMapaProductos [data-mapa-donation-toggle="1"]');
    if(!btn) return false;
    const id = String(btn.getAttribute('data-donation-id') || '');
    const t = Date.now();
    if(lastDonationToggle.id === id && t - lastDonationToggle.at < 400){ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); return true; }
    lastDonationToggle = {id, at:t};
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    const row = (Array.isArray(st().compras) ? st().compras : []).find(x => String(x?.id || '') === id);
    if(row){
      row.donacionEntregada = !isDelivered(row);
      saveNow();
      try{ window.renderMapaProductos?.(); }catch(_){ renderNow(); }
      setTimeout(syncHomes, 80);
    }
    return true;
  }

  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').replace(/[^0-9,.-]/g, '').trim();
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',','.');
    else if(s.includes(',')) s = s.replace(',','.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function currentValue(action, id, scope){
    const selector = `[data-action="${escCss(action)}"][data-id="${escCss(id)}"]`;
    let nodes = [];
    try{ nodes = Array.from((scope || document).querySelectorAll(selector)); }catch(_){ nodes = []; }
    if(!nodes.length && scope){ try{ nodes = Array.from(document.querySelectorAll(selector)); }catch(_){ nodes = []; } }
    const visible = nodes.find(isVisible) || nodes.find(el => !isHidden(el)) || nodes[0];
    if(!visible) return '';
    if(visible.tagName === 'SELECT') return visible.value;
    if(visible.type === 'checkbox') return visible.checked ? (visible.value || 'on') : '';
    return visible.value ?? '';
  }
  function fieldValue(actions, id, scope, fallback=''){
    const arr = Array.isArray(actions) ? actions : [actions];
    for(const action of arr){
      const v = currentValue(action, id, scope);
      if(v !== '') return v;
    }
    return fallback;
  }
  function rowScope(id){
    const sel = `[data-id="${escCss(id)}"]`;
    try{ return document.querySelector(`${sel}`)?.closest?.('.itemcard,.rowline,.card') || null; }catch(_){ return null; }
  }
  function compras(){ const s=st(); if(!Array.isArray(s.compras)) s.compras = []; return s.compras; }
  function isDonationTicket(ticket){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(String(ticket || '').trim().toUpperCase()); }
  function duplicateCompra(productoId, tiendaId, ticket, excludeId){
    const p = String(productoId || ''), t = String(tiendaId || ''), tk = String(ticket || '').trim();
    if(!p) return null;
    return compras().find(row => String(row?.id || '') !== String(excludeId || '') && !isDonationTicket(row?.ticketDonacion || row?.ticket || '') && String(row?.productoId || '') === p && String(row?.tiendaId || '') === t && String(row?.ticketDonacion || row?.ticket || '').trim() === tk) || null;
  }
  function duplicateDonacion(productoId, donorRef, excludeId){
    const p = String(productoId || ''), d = String(donorRef || '');
    if(!p || !d) return null;
    return compras().find(row => String(row?.id || '') !== String(excludeId || '') && isDonationTicket(row?.ticketDonacion || row?.ticket || '') && String(row?.productoId || '') === p && String(row?.donorRef || '') === d) || null;
  }
  function productById(id){
    try{ if(typeof productoById === 'function') return productoById(id); }catch(_){ }
    return (Array.isArray(st().productos) ? st().productos : []).find(p => String(p.id) === String(id)) || null;
  }
  function saveCompraFromDom(id){
    const c = compras().find(x => String(x?.id || '') === String(id || ''));
    if(!c) return false;
    const scope = rowScope(id);
    const productoId = fieldValue('edit-compra-producto', id, scope, c.productoId || '');
    const unidades = Number(fieldValue('edit-compra-unidades', id, scope, c.unidades || 0) || 0);
    const precio = parseEuro(fieldValue('edit-compra-precio', id, scope, c.precio || 0) || 0);
    const ticket = fieldValue('edit-compra-ticket', id, scope, c.ticketDonacion || '');
    const responsableId = fieldValue('edit-compra-responsable', id, scope, c.responsableId || '');
    const donorRef = fieldValue(['edit-compra-donante','edit-donacion-donante'], id, scope, c.donorRef || '');
    const donation = isDonationTicket(ticket) || isDonationTicket(c.ticketDonacion || '') || !!scope?.closest?.('#donacionesList');
    if(donation){
      // v43.7: en modificación no se bloquea por duplicidad; solo se valida al crear una ficha nueva.
      const found = null; // duplicateDonacion(productoId, donorRef, id);
      c.productoId = productoId;
      c.unidades = Number.isFinite(unidades) ? unidades : 0;
      if(precio) c.precio = precio;
      c.ticketDonacion = ticket;
      c.donorRef = donorRef;
      c.responsableId = responsableId;
    }else{
      const tiendaId = fieldValue('edit-compra-tienda', id, scope, c.tiendaId || '');
      // v43.7: en modificación no se bloquea por duplicidad; solo se valida al crear una ficha nueva.
      const found = null; // duplicateCompra(productoId, tiendaId, ticket, id);
      c.productoId = productoId;
      c.unidades = Number.isFinite(unidades) ? unidades : 0;
      if(precio) c.precio = precio;
      c.ticketDonacion = ticket;
      c.tiendaId = tiendaId;
      c.donorRef = donorRef;
      c.responsableId = responsableId;
    }
    const p = productById(productoId);
    if(p && precio){ p.defaultPrecio = precio; p.precio = precio; }
    saveNow();
    renderNow();
    return true;
  }
  function saveDonacionFromDom(id){
    const c = compras().find(x => String(x?.id || '') === String(id || ''));
    if(!c) return false;
    const scope = rowScope(id);
    const productoId = fieldValue(['edit-donacion-producto','edit-compra-producto'], id, scope, c.productoId || '');
    const unidades = Number(fieldValue(['edit-donacion-unidades','edit-compra-unidades'], id, scope, c.unidades || 0) || 0);
    const precio = parseEuro(fieldValue(['edit-donacion-precio','edit-compra-precio'], id, scope, c.precio || 0) || 0);
    const ticket = fieldValue(['edit-donacion-ticket','edit-compra-ticket'], id, scope, c.ticketDonacion || '');
    const donorRef = fieldValue(['edit-donacion-donante','edit-compra-donante'], id, scope, c.donorRef || '');
    const responsableId = fieldValue(['edit-donacion-responsable','edit-compra-responsable'], id, scope, c.responsableId || '');
    // v43.7: en modificación no se bloquea por duplicidad; solo se valida al crear una ficha nueva.
    const found = null; // duplicateDonacion(productoId, donorRef, id);
    c.productoId = productoId;
    c.unidades = Number.isFinite(unidades) ? unidades : 0;
    if(precio) c.precio = precio;
    c.ticketDonacion = ticket;
    c.donorRef = donorRef;
    c.responsableId = responsableId;
    const p = productById(productoId);
    if(p && precio){ p.defaultPrecio = precio; p.precio = precio; }
    saveNow();
    renderNow();
    return true;
  }
  function handleSaveEvent(event){
    const btn = event.target?.closest?.('button[data-action="save-compra"],button[data-action="save-donacion"]');
    if(!btn) return false;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id') || '';
    event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation();
    if(action === 'save-donacion' || btn.closest?.('#donacionesList')) saveDonacionFromDom(id);
    else saveCompraFromDom(id);
    setTimeout(syncHomes, 80);
    return true;
  }

  function installInterceptors(){
    if(window.__ceV412Interceptors) return;
    window.__ceV412Interceptors = true;
    ['click','pointerup','touchend'].forEach(type => {
      window.addEventListener(type, function(event){
        if(handleHomeEvent(event)) return false;
        if(handleDonationDelivered(event)) return false;
        if(type === 'click' && handleSaveEvent(event)) return false;
      }, {capture:true, passive:false});
    });
  }
  function install(){
    injectStyle();
    applyVersion();
    ensureGlobalHome();
    syncHomes();
    installInterceptors();
  }

  window.ControlEventV412 = {version:VERSION, install, syncHomes, scrollCurrentTop, saveCompraFromDom, saveDonacionFromDom};
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  document.addEventListener('click', () => setTimeout(install, 80), true);
  document.addEventListener('scroll', () => setTimeout(syncHomes, 50), true);
  [0,120,500,1200,2500].forEach(ms => setTimeout(install, ms));
})();
