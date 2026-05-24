/* ControlEvent v43.8.5 - apertura real de Planificación inicial desde menú móvil.
   Parche mínimo sobre v43.8.5: no toca login, COMPRAS, DONACIONES, INFOEVENTO, BACKUP ni GRAFICAS. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v43.8.5';
  const VERSION_FILE = 'ControlEvent_v43_8_5';
  const PLAN_BUTTON_ID = 'tabPlanificacionBtn';
  const PLAN_PANEL_ID = 'tabPlanificacionInicial';
  const PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','noEventMessage'];
  const BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabPlanificacionBtn','tabResumenBtn','tabGraficasBtn'];
  const $ = id => document.getElementById(id);

  function norm(value){
    return String(value || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }
  function isMobile(){
    try{ return window.matchMedia && window.matchMedia('(max-width: 760px)').matches; }
    catch(_){ return (window.innerWidth || 0) <= 760; }
  }
  function isPlanAction(target){
    if(!target || !target.closest) return false;
    const action = target.closest('#ceMobileDrawer .mobile-menu-action, #ceMobileDrawer button, .mobile-menu-action, button');
    if(!action) return false;
    if(action.id === PLAN_BUTTON_ID) return true;
    if(action.dataset && action.dataset.target === PLAN_BUTTON_ID) return true;
    return norm(action.textContent).includes('PLANIFICACION INICIAL');
  }
  function hideMobileDrawerOnly(){
    try{
      document.body.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      const drawer = $('ceMobileDrawer');
      const backdrop = $('ceMobileDrawerBackdrop') || $('ceMobileOverlay');
      if(drawer) drawer.setAttribute('aria-hidden','true');
      if(backdrop) backdrop.setAttribute('aria-hidden','true');
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
      if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'planificacion';
      if(window.ControlEventRuntime?.app?.navigation) window.ControlEventRuntime.app.navigation.currentMainTab = 'planificacion';
    }catch(_){ }
    return true;
  }
  function openPlanificacion(){
    hideMobileDrawerOnly();
    try{
      if(typeof window.showPlanificacionInicial === 'function') window.showPlanificacionInicial();
    }catch(err){ console.warn('[ControlEvent v43.8.5] showPlanificacionInicial', err); }
    forcePlanificacionVisible();
    try{ if(typeof window.renderPlanificacionInicial === 'function') window.renderPlanificacionInicial(); }catch(_){ }
    setTimeout(() => { hideMobileDrawerOnly(); forcePlanificacionVisible(); }, 60);
  }
  function handleMenuAction(ev){
    if(!isMobile() || !isPlanAction(ev.target)) return;
    try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    openPlanificacion();
    return false;
  }
  function patchPlanButtonDirect(){
    const btn = $(PLAN_BUTTON_ID);
    if(!btn || btn.__ceV4385PlanDirect) return;
    btn.__ceV4385PlanDirect = true;
    btn.addEventListener('click', function(ev){
      try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
      openPlanificacion();
      return false;
    }, true);
  }
  function installDelegation(){
    const drawer = $('ceMobileDrawer');
    if(drawer && !drawer.__ceV4385Planificacion){
      drawer.__ceV4385Planificacion = true;
      drawer.addEventListener('click', handleMenuAction, true);
      drawer.addEventListener('touchend', handleMenuAction, {capture:true, passive:false});
    }
    if(!document.__ceV4385PlanificacionFallback){
      document.__ceV4385PlanificacionFallback = true;
      document.addEventListener('click', function(ev){
        // Respaldo limitado: solo intercepta el botón real de Planificación, nunca login ni otros botones.
        if(isMobile() && isPlanAction(ev.target)) return handleMenuAction(ev);
      }, true);
    }
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
        if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
  }
  function patchDownloadNames(){
    try{
      const proto = HTMLAnchorElement.prototype;
      if(proto.click.__ceV4385DownloadName) return;
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
      wrapped.__ceV4385DownloadName = true;
      proto.click = wrapped;
    }catch(_){ }
  }
  function installCss(){
    if($('ceV4385PlanificacionCss')) return;
    const style = document.createElement('style');
    style.id = 'ceV4385PlanificacionCss';
    style.textContent = '@media (max-width:760px){#tabPlanificacionInicial:not(.hidden){display:block!important;filter:none!important;opacity:1!important;}#ceMobileMenuBtn{pointer-events:auto!important;touch-action:manipulation!important;}}';
    document.head.appendChild(style);
  }
  function install(){
    applyVersionOnce();
    patchDownloadNames();
    installCss();
    patchPlanButtonDirect();
    installDelegation();
  }
  window.ControlEventV4385 = {version:VERSION, versionFile:VERSION_FILE, install, openPlanificacion, forcePlanificacionVisible};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0, 100, 400, 1200].forEach(ms => setTimeout(install, ms));
})();
