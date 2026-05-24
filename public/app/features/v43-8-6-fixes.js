/* ControlEvent v43.8.6 - recuperación estable desde v43.8.3.
   Parche mínimo: no toca login, COMPRAS, DONACIONES, INFOEVENTO, BACKUP ni GRAFICAS.
   Solo asegura Planificación inicial desde menú móvil y consolida versión. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v43.8.6';
  const VERSION_FILE = 'ControlEvent_v43_8_6';
  const PLAN_BUTTON_ID = 'tabPlanificacionBtn';
  const PLAN_PANEL_ID = 'tabPlanificacionInicial';
  const PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','noEventMessage'];
  const BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabPlanificacionBtn','tabResumenBtn','tabGraficasBtn'];
  const $ = id => document.getElementById(id);

  function isMobile(){
    try { return window.matchMedia && window.matchMedia('(max-width: 760px)').matches; }
    catch(_) { return (window.innerWidth || 0) <= 760; }
  }
  function setHidden(el, hidden){
    if(!el) return;
    el.classList.toggle('hidden', !!hidden);
    if(hidden) el.setAttribute('aria-hidden','true');
    else el.removeAttribute('aria-hidden');
  }
  function closeMobileDrawerClean(){
    try{
      document.body.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
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
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{
      window.__ceVersion = VERSION;
      window.__ceVersionFile = VERSION_FILE;
      if(document.body) document.body.dataset.ceVersion = VERSION;
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version]').forEach(el => {
        if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
  }
  function patchDownloadNames(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(proto.click.__ceV4386DownloadName) return;
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
      wrapped.__ceV4386DownloadName = true;
      proto.click = wrapped;
    }catch(_){ }
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
      el.classList.toggle('primary', el.dataset && el.dataset.target === PLAN_BUTTON_ID);
    });
    try{
      if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'planificacion';
      if(window.ControlEventRuntime?.app?.navigation) window.ControlEventRuntime.app.navigation.currentMainTab = 'planificacion';
    }catch(_){ }
    return true;
  }
  function openPlanificacionInicialFromMobile(){
    if(!window.authUser) return false;
    closeMobileDrawerClean();
    try{ if(typeof window.showPlanificacionInicial === 'function') window.showPlanificacionInicial(); }catch(err){ console.warn('[ControlEvent v43.8.6] Planificación inicial', err); }
    forcePlanificacionVisible();
    try{ if(typeof window.renderPlanificacionInicial === 'function') window.renderPlanificacionInicial(); }catch(_){ }
    setTimeout(() => { forcePlanificacionVisible(); closeMobileDrawerClean(); applyVersion(); }, 40);
    setTimeout(() => { forcePlanificacionVisible(); closeMobileDrawerClean(); applyVersion(); }, 140);
    return true;
  }
  function isPlanMobileAction(target){
    return !!(target && target.closest && target.closest('.mobile-menu-action[data-target="tabPlanificacionBtn"]'));
  }
  function onPlanMobileClick(ev){
    if(!isMobile() || !isPlanMobileAction(ev.target)) return;
    if(!window.authUser) return;
    try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    openPlanificacionInicialFromMobile();
    return false;
  }
  function install(){
    applyVersion();
    patchDownloadNames();
    closeMobileDrawerClean();
    if(!document.__ceV4386PlanMobile){
      document.__ceV4386PlanMobile = true;
      document.addEventListener('click', onPlanMobileClick, true);
    }
  }
  window.ControlEventV4386 = {version:VERSION, versionFile:VERSION_FILE, install, openPlanificacionInicialFromMobile, forcePlanificacionVisible};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [80, 300, 900, 1600].forEach(ms => setTimeout(install, ms));
})();
