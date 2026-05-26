/* ControlEvent v45.6 - corrección móvil de Planificación inicial y precio en COMPRAS.
   No modifica los motores de INFOEVENTO ni BACKUP. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v45.6';
  const VERSION_FILE = 'ControlEvent_v45_6';
  const $ = id => document.getElementById(id);

  function st(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || window.ControlEventApp?.state || {};
  }
  function arr(name){ const v = st()[name]; return Array.isArray(v) ? v : []; }
  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').replace(/€/g,'').replace(/\s/g,'').trim();
    if(!s) return 0;
    const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
    if(c !== -1 && d !== -1) s = c > d ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,'');
    else if(c !== -1) s = s.replace(/\./g,'').replace(',', '.');
    const n = Number(s.replace(/[^0-9.-]/g,''));
    return Number.isFinite(n) ? n : 0;
  }
  function euro(value){
    try{ return new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(value || 0)) + ' €'; }
    catch(_){ return (Number(value || 0).toFixed(2).replace('.', ',')) + ' €'; }
  }
  function money(value){
    try{ if(typeof window.money === 'function') return window.money(value); }catch(_){ }
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value || 0)); }
    catch(_){ return euro(value); }
  }
  function productById(id){
    const sid = String(id || '');
    try{ if(typeof productoById === 'function'){ const p = productoById(sid); if(p) return p; } }catch(_){ }
    return arr('productos').find(p => String(p?.id || '') === sid) || null;
  }
  function productPrice(product){
    if(!product) return 0;
    const candidates = [product.defaultPrecio, product.precio, product.precioReferencia, product.valor, product.importe];
    for(const item of candidates){
      const n = parseEuro(item);
      if(Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
        if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
  }

  function patchDownloadNames(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(proto.click.__ceV4381DownloadName) return;
      const old = proto.click;
      const wrapped = function(){
        try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
        return old.apply(this, arguments);
      };
      wrapped.__ceV4381DownloadName = true;
      proto.click = wrapped;
    }catch(_){ }
  }

  function closeMobileDrawer(){
    try{
      document.body.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      // No ponemos display:none ni hidden inline: el menú móvil legacy abre/cierra con body.mobile-drawer-open.
      // Si aquí dejamos estilos inline, después el botón Menú parece no responder.
      ['ceMobileDrawerBackdrop','ceMobileOverlay'].forEach(id => {
        const el = $(id);
        if(el){ el.classList.remove('open','is-open','active'); el.style.removeProperty('display'); el.style.removeProperty('pointer-events'); }
      });
      const drawer = $('ceMobileDrawer');
      if(drawer){ drawer.classList.remove('open','is-open','active'); drawer.style.removeProperty('display'); drawer.style.removeProperty('pointer-events'); drawer.setAttribute('aria-hidden','true'); }
    }catch(_){ }
  }
  function isPlanVisible(){
    const panel = $('tabPlanificacionInicial');
    return !!(panel && !panel.classList.contains('hidden'));
  }
  function fixPlanificacionMobile(){
    if(!isPlanVisible()) return;
    closeMobileDrawer();
    try{
      const btn = $('ceMobileMenuBtn');
      if(btn){ btn.disabled = false; btn.style.pointerEvents = 'auto'; btn.removeAttribute('aria-disabled'); }
    }catch(_){ }
  }

  function updateBuyPreviewV4381(forceReference=false){
    const productId = $('buyProducto')?.value || '';
    const product = productById(productId);
    const precioEl = $('buyPrecio');
    const importeEl = $('buyImporte');
    const unidades = parseEuro($('buyUnidades')?.value || 0);
    const ref = productPrice(product);
    const lastProductId = precioEl?.dataset?.lastProductIdV4381 || precioEl?.dataset?.lastProductId || '';
    let precio = parseEuro(precioEl?.value || 0);
    if(productId && (forceReference || productId !== lastProductId || !precio)){
      precio = ref;
      if(precioEl){
        precioEl.value = euro(precio);
        precioEl.dataset.lastProductIdV4381 = productId;
        precioEl.dataset.lastProductId = productId;
      }
    }
    if(!productId){
      precio = 0;
      if(precioEl && forceReference){ precioEl.value = '0,00 €'; precioEl.dataset.lastProductIdV4381 = ''; precioEl.dataset.lastProductId = ''; }
    }
    if(importeEl) importeEl.value = money(precio * unidades);
  }

  function installBuyPreviewPatch(){
    try{ window.updateBuyPreview = updateBuyPreviewV4381; }catch(_){ }
    try{ updateBuyPreview = updateBuyPreviewV4381; }catch(_){ }
    if(document.__ceV4381BuyPreviewPatch) return;
    document.__ceV4381BuyPreviewPatch = true;
    window.addEventListener('change', event => {
      const id = event.target?.id || '';
      if(id === 'buyProducto') updateBuyPreviewV4381(true);
      else if(id === 'buyUnidades' || id === 'buyPrecio' || id === 'buyTicket' || id === 'buyTienda') updateBuyPreviewV4381(false);
    }, true);
    window.addEventListener('input', event => {
      const id = event.target?.id || '';
      if(id === 'buyUnidades' || id === 'buyPrecio') updateBuyPreviewV4381(false);
    }, true);
    window.addEventListener('blur', event => {
      if(event.target?.id === 'buyPrecio'){
        event.target.value = euro(parseEuro(event.target.value));
        updateBuyPreviewV4381(false);
      }
    }, true);
  }

  function installPlanificacionMobilePatch(){
    if(document.__ceV4381PlanMobilePatch) return;
    document.__ceV4381PlanMobilePatch = true;
    window.addEventListener('click', event => {
      const trigger = event.target?.closest?.('#tabPlanificacionBtn,.mobile-menu-action[data-target="tabPlanificacionBtn"]');
      if(trigger){
        setTimeout(() => { closeMobileDrawer(); fixPlanificacionMobile(); }, 0);
        setTimeout(() => { closeMobileDrawer(); fixPlanificacionMobile(); }, 80);
        setTimeout(() => { closeMobileDrawer(); fixPlanificacionMobile(); }, 240);
      }
    }, true);
    window.addEventListener('pointerup', event => {
      const trigger = event.target?.closest?.('.mobile-menu-action[data-target="tabPlanificacionBtn"]');
      if(trigger) setTimeout(closeMobileDrawer, 0);
    }, true);
  }

  function install(){
    applyVersion();
    patchDownloadNames();
    installBuyPreviewPatch();
    installPlanificacionMobilePatch();
    fixPlanificacionMobile();
  }

  window.ControlEventV4381 = {version: VERSION, install, updateBuyPreview:updateBuyPreviewV4381, closeMobileDrawer};
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  // Instalación puntual, sin refrescos permanentes de cabecera para evitar parpadeos.
  [0,80,250,700,1500].forEach(ms => setTimeout(install, ms));
})();
