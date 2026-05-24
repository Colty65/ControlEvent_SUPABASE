/* ControlEvent v43.8.4 - acceso real a Planificación inicial desde menú móvil.
   Parche puntual: mantiene la corrección del botón Menú y no toca COMPRAS, DONACIONES, INFOEVENTO, BACKUP ni GRAFICAS. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v43.8.4';
  const VERSION_FILE = 'ControlEvent_v43_8_4';
  const PLAN_BUTTON_ID = 'tabPlanificacionBtn';
  const PLAN_PANEL_ID = 'tabPlanificacionInicial';
  const PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','noEventMessage'];
  const BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabPlanificacionBtn','tabResumenBtn','tabGraficasBtn'];
  const $ = id => document.getElementById(id);
  let lastOpenAt = 0;

  function norm(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  }
  function isPlanTrigger(target){
    if(!target || !target.closest) return false;
    if(target.closest('#' + PLAN_BUTTON_ID)) return true;
    const byTarget = target.closest('[data-target="' + PLAN_BUTTON_ID + '"]');
    if(byTarget) return true;
    const action = target.closest('.mobile-menu-action,button,a,[role="button"]');
    if(action && norm(action.textContent).includes('PLANIFICACION INICIAL')) return true;
    return false;
  }
  function hardCloseMobileMenu(){
    try{
      document.body.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      const drawer = $('ceMobileDrawer');
      if(drawer){
        drawer.setAttribute('aria-hidden','true');
        drawer.classList.remove('open','is-open','active');
        drawer.style.removeProperty('display');
        drawer.style.removeProperty('pointer-events');
      }
      ['ceMobileDrawerBackdrop','ceMobileOverlay'].forEach(id => {
        const el = $(id);
        if(el){
          el.setAttribute('aria-hidden','true');
          el.classList.remove('open','is-open','active');
          el.style.removeProperty('display');
          el.style.removeProperty('pointer-events');
        }
      });
      const menuBtn = $('ceMobileMenuBtn');
      if(menuBtn){
        menuBtn.disabled = false;
        menuBtn.removeAttribute('disabled');
        menuBtn.removeAttribute('aria-disabled');
        menuBtn.style.pointerEvents = 'auto';
        menuBtn.style.touchAction = 'manipulation';
      }
    }catch(_){ }
  }
  function setHidden(el, hidden){
    if(!el) return;
    el.classList.toggle('hidden', !!hidden);
    if(hidden) el.setAttribute('aria-hidden','true');
    else el.removeAttribute('aria-hidden');
  }
  function forcePlanificacionVisible(){
    const panel = $(PLAN_PANEL_ID);
    if(!panel) return false;
    PANELS.forEach(id => {
      const el = $(id);
      if(el) setHidden(el, id !== PLAN_PANEL_ID);
    });
    const maint = $('maintenanceWrapper');
    if(maint) setHidden(maint, true);
    setHidden(panel, false);
    panel.style.removeProperty('display');
    panel.style.removeProperty('filter');
    panel.style.removeProperty('opacity');
    BUTTONS.forEach(id => {
      const btn = $(id);
      if(btn) btn.classList.toggle('active', id === PLAN_BUTTON_ID);
    });
    document.querySelectorAll('.mobile-menu-action').forEach(el => {
      const active = (el.dataset && el.dataset.target === PLAN_BUTTON_ID) || norm(el.textContent).includes('PLANIFICACION INICIAL');
      el.classList.toggle('primary', active);
    });
    try{
      window.__ceForcePlanificacionUntil = Date.now() + 1800;
      if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'planificacion';
      if(window.ControlEventRuntime?.app?.navigation) window.ControlEventRuntime.app.navigation.currentMainTab = 'planificacion';
    }catch(_){ }
    try{ if(typeof window.renderPlanificacionInicial === 'function') window.renderPlanificacionInicial(); }catch(_){ }
    return true;
  }
  function openPlanificacion(){
    lastOpenAt = Date.now();
    window.__ceForcePlanificacionUntil = lastOpenAt + 2200;
    hardCloseMobileMenu();
    // Usar primero el flujo propio de Planificación para que rellene combos y desbloquee controles.
    try{ if(typeof window.showPlanificacionInicial === 'function') window.showPlanificacionInicial(); }catch(_){ }
    // Asegurar después la pantalla, porque algunos listeners legacy repintan tarde en móvil.
    [0, 25, 80, 180, 420, 900, 1500].forEach(ms => setTimeout(() => {
      hardCloseMobileMenu();
      forcePlanificacionVisible();
    }, ms));
  }
  function handlePlanEvent(ev){
    if(!isPlanTrigger(ev.target)) return;
    try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    openPlanificacion();
    return false;
  }
  function patchRenderAfterLegacy(){
    try{
      const old = window.render;
      if(typeof old !== 'function' || old.__ceV4384Planificacion) return;
      const wrapped = function(){
        const out = old.apply(this, arguments);
        try{
          if(Date.now() < Number(window.__ceForcePlanificacionUntil || 0)) setTimeout(forcePlanificacionVisible, 0);
        }catch(_){ }
        return out;
      };
      wrapped.__ceV4384Planificacion = true;
      window.render = wrapped;
      try{ render = wrapped; }catch(_){ }
    }catch(_){ }
  }
  function applyVersionOnce(){
    try{ document.title = VERSION; }catch(_){ }
    try{
      window.__ceVersion = VERSION;
      window.__ceVersionFile = VERSION_FILE;
      if(document.body) document.body.dataset.ceVersion = VERSION;
    }catch(_){ }
    try{
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version]').forEach(el => {
        const text = el.textContent || '';
        if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(text)) el.textContent = VERSION;
      });
    }catch(_){ }
  }
  function patchDownloadNames(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(proto.click.__ceV4384DownloadName) return;
      const old = proto.click;
      const wrapped = function(){
        try{
          if(this.download){
            this.download = String(this.download)
              .replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE)
              .replace(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/ig, VERSION);
          }
        }catch(_){ }
        return old.apply(this, arguments);
      };
      wrapped.__ceV4384DownloadName = true;
      proto.click = wrapped;
    }catch(_){ }
  }
  function installCss(){
    if($('ceV4384PlanificacionCss')) return;
    const style = document.createElement('style');
    style.id = 'ceV4384PlanificacionCss';
    style.textContent = `
      @media (max-width: 760px){
        #ceMobileMenuBtn{pointer-events:auto!important;touch-action:manipulation!important;z-index:3005!important;}
        body:not(.mobile-drawer-open) #ceMobileDrawer,
        body:not(.mobile-drawer-open) #ceMobileDrawerBackdrop,
        body:not(.mobile-drawer-open) #ceMobileOverlay{display:none!important;pointer-events:none!important;}
        #tabPlanificacionInicial:not(.hidden){display:block!important;filter:none!important;opacity:1!important;}
      }
    `;
    document.head.appendChild(style);
  }
  function installEvents(){
    if(document.__ceV4384PlanificacionEvents) return;
    document.__ceV4384PlanificacionEvents = true;
    const opts = {capture:true, passive:false};
    ['pointerdown','touchstart','touchend','pointerup','click'].forEach(type => {
      document.addEventListener(type, handlePlanEvent, opts);
      window.addEventListener(type, handlePlanEvent, opts);
    });
  }
  function install(){
    applyVersionOnce();
    patchDownloadNames();
    installCss();
    installEvents();
    patchRenderAfterLegacy();
    if(Date.now() < Number(window.__ceForcePlanificacionUntil || 0)) forcePlanificacionVisible();
    if(lastOpenAt && Date.now() - lastOpenAt < 2200) hardCloseMobileMenu();
  }
  window.ControlEventV4384 = {version:VERSION, versionFile:VERSION_FILE, install, openPlanificacion, forcePlanificacionVisible};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0, 80, 250, 700, 1500].forEach(ms => setTimeout(install, ms));
})();
