/* ControlEvent v10.3_prod - Mapa de recursos: filtros/buscador activos en solo lectura.
   Alcance: solo Mapa de Recursos. No toca datos, BACKUP, INFOEVENTO ni Documentos.
   Permite seleccionar responsables, buscar y usar los botones locales de Entregado/Comprado
   aunque el evento esté Finalizado o el usuario sea RO. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v10.3_prod mapa-readonly-controls-2';
  const PANEL_ID = 'tabMapaProductos';
  const STYLE_ID = 'ceV85MapaReadonlyControlsStyle';
  const CONTROL_SELECTOR = [
    '#mapaResponsablesFilter button',
    '#mapaResponsablesFilter input',
    '[data-mapa-filter-toggle]',
    '#mapaProductoSearch',
    '#mapaProductoSearchBtn',
    '[data-mapa-shop-toggle="1"]',
    '[data-mapa-donation-toggle="1"]',
    '[data-mapa-jump-donados="1"]',
    '[data-mapa-back-top="1"]',
    '#ceMapaFloatingHomeButton'
  ].join(',');

  function $(id){ return document.getElementById(id); }
  function panel(){ return $(PANEL_ID); }
  function safe(fn, fallback){ try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } }
  function currentTab(){
    const lexical = safe(() => (typeof currentMainTab !== 'undefined' ? currentMainTab : ''), '');
    if(lexical) return String(lexical);
    return safe(() => String(window.ControlEventApp?.navigation?.currentMainTab || window.__ceCurrentMainTab || ''), '');
  }
  function mapaVisible(){
    const p = panel();
    if(!p) return false;
    if(currentTab() === 'mapa') return true;
    return !p.classList.contains('hidden') && p.offsetParent !== null;
  }
  function enable(el){
    if(!el) return;
    try{ el.classList?.add?.('ce-mapa-readonly-allowed','mobile-menu-action'); }catch(_){ }
    try{ if('disabled' in el) el.disabled = false; }catch(_){ }
    try{ if('readOnly' in el) el.readOnly = false; }catch(_){ }
    try{ el.removeAttribute('disabled'); }catch(_){ }
    try{ el.removeAttribute('readonly'); }catch(_){ }
    try{ el.removeAttribute('aria-disabled'); }catch(_){ }
    try{ el.classList.remove('locked','ce-v225-ro-disabled','disabled','is-locked','app-disabled'); }catch(_){ }
    try{ el.style.setProperty('pointer-events','auto','important'); }catch(_){ }
    try{ el.style.setProperty('opacity','1','important'); }catch(_){ }
    try{ el.style.removeProperty('filter'); }catch(_){ }
    try{ el.style.removeProperty('user-select'); el.style.removeProperty('-webkit-user-select'); }catch(_){ }
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #tabMapaProductos{pointer-events:auto!important;opacity:1!important;filter:none!important;}
      #tabMapaProductos #mapaResponsablesFilter,
      #tabMapaProductos #mapaProductoSearchBox,
      #tabMapaProductos .mapa-product-search,
      #tabMapaProductos [data-mapa-shop-toggle="1"],
      #tabMapaProductos [data-mapa-donation-toggle="1"],
      #tabMapaProductos [data-mapa-jump-donados="1"],
      #tabMapaProductos [data-mapa-back-top="1"],
      #ceMapaFloatingHomeButton{
        pointer-events:auto!important;
        opacity:1!important;
        filter:none!important;
      }
      #tabMapaProductos #mapaResponsablesFilter input,
      #tabMapaProductos #mapaResponsablesFilter button,
      #tabMapaProductos #mapaProductoSearch,
      #tabMapaProductos #mapaProductoSearchBtn{
        pointer-events:auto!important;
        opacity:1!important;
        -webkit-user-select:auto!important;
        user-select:auto!important;
      }
      #tabMapaProductos .ce-mapa-readonly-allowed.mobile-menu-action{
        display:initial!important;
        visibility:visible!important;
        transform:none!important;
      }
      #tabMapaProductos input.ce-mapa-readonly-allowed.mobile-menu-action{
        width:100%!important;
      }
      #tabMapaProductos button.ce-mapa-readonly-allowed.mobile-menu-action{
        display:inline-flex!important;
      }
    `;
    document.head.appendChild(style);
  }
  function unlockMapaControls(reason){
    injectStyle();
    const p = panel();
    if(!p) return false;
    try{ p.style.setProperty('pointer-events','auto','important'); p.style.setProperty('opacity','1','important'); p.style.removeProperty('filter'); p.removeAttribute('aria-disabled'); }catch(_){ }
    p.querySelectorAll(CONTROL_SELECTOR).forEach(enable);
    // Por si el botón flotante está fuera del panel.
    enable($('ceMapaFloatingHomeButton'));
    try{ window.__ceV85MapaReadonlyControlsLast = {version:VERSION, reason:reason || '', at:Date.now()}; }catch(_){ }
    return true;
  }
  let pending = false;
  function schedule(reason, delay){
    if(pending) return;
    pending = true;
    setTimeout(() => {
      pending = false;
      if(mapaVisible()) unlockMapaControls(reason || 'scheduled');
    }, delay == null ? 25 : delay);
  }
  function burst(reason){
    schedule(reason, 0);
    [60, 180, 420, 900, 1500].forEach(ms => setTimeout(() => { if(mapaVisible()) unlockMapaControls(reason + '-' + ms); }, ms));
  }
  function getGlobalFn(name){
    if(typeof window[name] === 'function') return window[name];
    return safe(() => Function('return (typeof '+name+' === "function") ? '+name+' : null')(), null);
  }
  function wrapGlobal(name){
    const old = getGlobalFn(name);
    if(typeof old !== 'function' || old.__ceV85MapaReadonlyControls) return;
    const wrapped = function(){
      const result = old.apply(this, arguments);
      if(mapaVisible()) unlockMapaControls(name + '-sync');
      burst(name);
      return result;
    };
    wrapped.__ceV85MapaReadonlyControls = true;
    try{ window[name] = wrapped; }catch(_){ }
    try{ Function(name + ' = window["' + name + '"]')(); }catch(_){ }
  }
  function wrapMapaApi(){
    const api = window.ControlEventMapaProductos;
    if(!api || api.__ceV85ReadonlyControlsWrapped) return;
    ['render','show','sync'].forEach(name => {
      const old = api[name];
      if(typeof old !== 'function' || old.__ceV85MapaReadonlyControls) return;
      api[name] = function(){
        const result = old.apply(this, arguments);
        if(mapaVisible()) unlockMapaControls('mapa-api-' + name + '-sync');
        burst('mapa-api-' + name);
        return result;
      };
      api[name].__ceV85MapaReadonlyControls = true;
    });
    api.__ceV85ReadonlyControlsWrapped = true;
  }
  function installObserver(){
    const p = panel();
    if(!p || p.__ceV85MapaReadonlyControlsObserver) return;
    p.__ceV85MapaReadonlyControlsObserver = true;
    try{
      const obs = new MutationObserver(mutations => {
        for(const m of mutations){
          if(m.type === 'childList' || ['disabled','readonly','aria-disabled','class','style','hidden'].includes(m.attributeName || '')){
            schedule('mutation', 30);
            break;
          }
        }
      });
      obs.observe(p, {subtree:true, childList:true, attributes:true, attributeFilter:['disabled','readonly','aria-disabled','class','style','hidden']});
      p.__ceV85MapaReadonlyControlsObserverRef = obs;
    }catch(_){ }
  }
  function install(){
    injectStyle();
    ['render','renderLockState','renderPermissions','renderTabVisibility','renderMapaProductos'].forEach(wrapGlobal);
    wrapMapaApi();
    installObserver();
    burst('install');
  }

  ['pointerdown','mousedown','touchstart','focusin','click','change','keydown'].forEach(evt => {
    document.addEventListener(evt, event => {
      if(event.target?.closest?.('#tabMapaProductos,#ceMapaFloatingHomeButton')) unlockMapaControls(evt);
    }, true);
  });
  document.addEventListener('click', event => {
    if(event.target?.closest?.('#tabMapaBtn,.mobile-menu-action[data-target="tabMapaBtn"]')) burst('open-mapa');
  }, true);
  document.addEventListener('change', event => {
    if(event.target && event.target.id === 'selectedEvent') burst('event-change');
  }, true);
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40)));
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  [120, 500, 1200, 2500].forEach(ms => setTimeout(install, ms));
  setInterval(() => { if(mapaVisible()) unlockMapaControls('interval'); }, window.ControlEventLowResource?.interval?.(900) || 900);

  window.ControlEventMapaReadonlyControls = {version:VERSION, unlock:unlockMapaControls, install};
})();
