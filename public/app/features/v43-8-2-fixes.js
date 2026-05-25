/* ControlEvent v44.6.2 - menú móvil estable y versión unificada.
   Parche defensivo: no toca INFOEVENTO, BACKUP, COMPRAS ni DONACIONES. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v44.6.2';
  const VERSION_FILE = 'ControlEvent_v44_6_2';
  const MOBILE_MAX = 760;
  const $ = id => document.getElementById(id);

  function isMobile(){
    try{ return window.matchMedia && window.matchMedia('(max-width: 760px)').matches; }catch(_){ return window.innerWidth <= MOBILE_MAX; }
  }
  function drawer(){ return $('ceMobileDrawer'); }
  function backdrop(){ return $('ceMobileDrawerBackdrop') || $('ceMobileOverlay'); }
  function btn(){ return $('ceMobileMenuBtn'); }

  function normalizeMenuDom(){
    const b = btn();
    if(b){
      b.disabled = false;
      b.removeAttribute('disabled');
      b.removeAttribute('aria-disabled');
      b.style.pointerEvents = 'auto';
      b.style.zIndex = '3005';
      b.style.touchAction = 'manipulation';
    }
    const d = drawer();
    if(d){
      d.classList.remove('hidden');
      d.style.removeProperty('display');
      d.style.removeProperty('pointer-events');
      d.style.zIndex = '3007';
    }
    const bd = backdrop();
    if(bd){
      bd.classList.remove('hidden');
      bd.style.removeProperty('display');
      bd.style.removeProperty('pointer-events');
      bd.style.zIndex = '3006';
    }
  }
  function openMenu(){
    normalizeMenuDom();
    document.body.classList.add('mobile-drawer-open');
    document.documentElement.classList.add('mobile-drawer-open');
    const d = drawer(); if(d) d.setAttribute('aria-hidden','false');
  }
  function closeMenu(){
    document.body.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    const d = drawer(); if(d) d.setAttribute('aria-hidden','true');
    normalizeMenuDom();
  }
  function toggleMenu(){
    if(document.body.classList.contains('mobile-drawer-open')) closeMenu();
    else openMenu();
  }
  function targetClick(id){
    if(!id) return;
    if(id === 'tabPlanificacionBtn' && typeof window.showPlanificacionInicial === 'function'){
      window.showPlanificacionInicial();
      return;
    }
    const el = $(id);
    if(el) el.click();
  }
  function applyVersionOnce(){
    try{ document.title = VERSION; }catch(_){ }
    try{ window.__ceVersion = VERSION; if(document.body) document.body.dataset.ceVersion = VERSION; }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
        if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
  }
  function patchDownloadNames(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(proto.click.__ceV4382DownloadName) return;
      const old = proto.click;
      const wrapped = function(){
        try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
        return old.apply(this, arguments);
      };
      wrapped.__ceV4382DownloadName = true;
      proto.click = wrapped;
    }catch(_){ }
  }
  function installCss(){
    if($('ceV4382MobileMenuCss')) return;
    const style = document.createElement('style');
    style.id = 'ceV4382MobileMenuCss';
    style.textContent = `
      @media (max-width: 760px){
        #ceMobileMenuBtn{z-index:3005!important;pointer-events:auto!important;touch-action:manipulation!important;}
        #ceMobileDrawerBackdrop{z-index:3006!important;}
        #ceMobileDrawer{z-index:3007!important;}
        body:not(.mobile-drawer-open) #ceMobileDrawerBackdrop,
        body:not(.mobile-drawer-open) #ceMobileDrawer{display:none!important;}
        body.mobile-drawer-open #ceMobileDrawerBackdrop,
        body.mobile-drawer-open #ceMobileDrawer{display:block!important;}
      }
    `;
    document.head.appendChild(style);
  }
  function installMenuHandlers(){
    if(document.__ceV4382MobileMenuPatch) return;
    document.__ceV4382MobileMenuPatch = true;
    document.addEventListener('click', ev => {
      const menuBtn = ev.target && ev.target.closest && ev.target.closest('#ceMobileMenuBtn');
      if(menuBtn && isMobile()){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        toggleMenu();
        return false;
      }
      const close = ev.target && ev.target.closest && ev.target.closest('#ceMobileDrawerClose,.mobile-drawer-close,#ceMobileDrawerBackdrop');
      if(close && isMobile()){
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        closeMenu();
        return false;
      }
      const action = ev.target && ev.target.closest && ev.target.closest('#ceMobileDrawer .mobile-menu-action[data-target]');
      if(action && isMobile()){
        const id = action.dataset.target || '';
        ev.preventDefault();
        ev.stopPropagation();
        ev.stopImmediatePropagation();
        closeMenu();
        setTimeout(() => targetClick(id), 0);
        return false;
      }
    }, true);
  }
  function install(){
    applyVersionOnce();
    patchDownloadNames();
    installCss();
    normalizeMenuDom();
    installMenuHandlers();
  }
  window.ControlEventV4382 = {version:VERSION, install, openMenu, closeMenu, toggleMenu};
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,80,250,700,1500].forEach(ms => setTimeout(install, ms));
})();
