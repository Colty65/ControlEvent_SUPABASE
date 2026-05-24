/* ControlEvent v43.8.4 - Planificación inicial móvil y versión BACKUP.
   Parche puntual: no toca COMPRAS, DONACIONES, INFOEVENTO ni GRAFICAS. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v43.8.4';
  const VERSION_FILE = 'ControlEvent_v43_8_4';
  const PLAN_BUTTON_ID = 'tabPlanificacionBtn';
  const PLAN_PANEL_ID = 'tabPlanificacionInicial';
  const PANELS = ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','noEventMessage'];
  const BUTTONS = ['tabIngresosBtn','tabDonacionesBtn','tabComprasBtn','tabMapaBtn','tabPlanificacionBtn','tabResumenBtn','tabGraficasBtn'];
  let lastMobilePlanTap = 0;
  const $ = id => document.getElementById(id);

  function isMobile(){
    try{ return window.matchMedia && window.matchMedia('(max-width: 760px)').matches; }
    catch(_){ return (window.innerWidth || 0) <= 760; }
  }
  function safeCall(fn){ try{ return fn && fn(); }catch(err){ console.warn('[ControlEvent v43.8.4]', err); return null; } }
  function setHidden(el, hidden){
    if(!el) return;
    el.classList.toggle('hidden', !!hidden);
    if(hidden) el.setAttribute('aria-hidden','true');
    else el.removeAttribute('aria-hidden');
  }
  function closeMobileMenuHard(){
    try{
      document.body.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
      const drawer = $('ceMobileDrawer');
      if(drawer){ drawer.setAttribute('aria-hidden','true'); drawer.classList.add('hidden'); drawer.style.display='none'; drawer.style.pointerEvents='none'; }
      const backdrops = ['ceMobileDrawerBackdrop','ceMobileOverlay'].map($).filter(Boolean);
      backdrops.forEach(bd => { bd.setAttribute('aria-hidden','true'); bd.classList.add('hidden'); bd.style.display='none'; bd.style.pointerEvents='none'; });
      const menuBtn = $('ceMobileMenuBtn');
      if(menuBtn){ menuBtn.disabled=false; menuBtn.removeAttribute('disabled'); menuBtn.removeAttribute('aria-disabled'); menuBtn.style.pointerEvents='auto'; }
    }catch(_){ }
  }
  function unlockMobileMenuForNextOpen(){
    const menuBtn = $('ceMobileMenuBtn');
    if(menuBtn){
      menuBtn.disabled=false; menuBtn.removeAttribute('disabled'); menuBtn.removeAttribute('aria-disabled');
      menuBtn.style.pointerEvents='auto'; menuBtn.style.touchAction='manipulation'; menuBtn.style.zIndex='3005';
    }
    const drawer = $('ceMobileDrawer');
    if(drawer){ drawer.style.removeProperty('pointer-events'); drawer.style.removeProperty('display'); }
    const backdrop = $('ceMobileDrawerBackdrop') || $('ceMobileOverlay');
    if(backdrop){ backdrop.style.removeProperty('pointer-events'); backdrop.style.removeProperty('display'); }
  }
  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ window.__ceVersion = VERSION; window.__ceVersionFile = VERSION_FILE; if(document.body) document.body.dataset.ceVersion = VERSION; }catch(_){ }
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
      if(proto.click.__ceV4383DownloadName) return;
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
      wrapped.__ceV4383DownloadName = true;
      proto.click = wrapped;
    }catch(_){ }
  }
  function forcePlanificacionVisible(){
    const panel = $(PLAN_PANEL_ID);
    if(!panel) return false;
    PANELS.forEach(id => { const el = $(id); if(el && id !== PLAN_PANEL_ID) setHidden(el, true); });
    setHidden(panel, false);
    panel.style.removeProperty('display');
    $('maintenanceWrapper')?.classList.add('hidden');
    BUTTONS.forEach(id => { const b=$(id); if(b) b.classList.toggle('active', id===PLAN_BUTTON_ID); });
    document.querySelectorAll('.mobile-menu-action').forEach(el => {
      el.classList.toggle('primary', el.dataset && el.dataset.target === PLAN_BUTTON_ID);
    });
    try{
      if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'planificacion';
      if(window.ControlEventRuntime?.app?.navigation) window.ControlEventRuntime.app.navigation.currentMainTab = 'planificacion';
    }catch(_){ }
    try{ if(typeof window.renderPlanificacionInicial === 'function') window.renderPlanificacionInicial(); }catch(_){ }
    return true;
  }
  function openPlanificacionFromMobile(){
    closeMobileMenuHard();
    // Primero intenta el flujo original para no perder inicialización de desplegables.
    safeCall(() => typeof window.showPlanificacionInicial === 'function' && window.showPlanificacionInicial());
    // Después asegura visualmente la pestaña. Se repite unas veces porque otros listeners legacy pueden repintar tarde en móvil.
    [0, 35, 120, 260].forEach(ms => setTimeout(() => {
      forcePlanificacionVisible();
      closeMobileMenuHard();
      unlockMobileMenuForNextOpen();
      applyVersion();
    }, ms));
  }
  function isPlanMobileAction(target){
    return !!(target && target.closest && target.closest('.mobile-menu-action[data-target="tabPlanificacionBtn"]'));
  }
  function handleMobilePlanEvent(ev){
    if(!isMobile() || !isPlanMobileAction(ev.target)) return;
    const now = Date.now();
    if(ev.type === 'click' && now - lastMobilePlanTap < 650){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      return false;
    }
    lastMobilePlanTap = now;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    openPlanificacionFromMobile();
    return false;
  }
  function installPlanMobileCapture(){
    if(window.__ceV4383PlanMobileCapture) return;
    window.__ceV4383PlanMobileCapture = true;
    ['touchend','pointerup','click'].forEach(type => window.addEventListener(type, handleMobilePlanEvent, true));
  }
  function installCss(){
    if($('ceV4383FixCss')) return;
    const style = document.createElement('style');
    style.id = 'ceV4383FixCss';
    style.textContent = `
      @media (max-width: 760px){
        body:not(.mobile-drawer-open) #ceMobileDrawer,
        body:not(.mobile-drawer-open) #ceMobileDrawerBackdrop,
        body:not(.mobile-drawer-open) #ceMobileOverlay{display:none!important;pointer-events:none!important;}
        #ceMobileMenuBtn{pointer-events:auto!important;touch-action:manipulation!important;z-index:3005!important;}
        #tabPlanificacionInicial:not(.hidden){display:block!important;filter:none!important;opacity:1!important;}
      }
    `;
    document.head.appendChild(style);
  }
  function install(){
    applyVersion();
    patchDownloadNames();
    installCss();
    installPlanMobileCapture();
    unlockMobileMenuForNextOpen();
  }
  window.ControlEventV4383 = {version:VERSION, versionFile:VERSION_FILE, install, openPlanificacionFromMobile, forcePlanificacionVisible};
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  ['load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0, 80, 250, 800].forEach(ms => setTimeout(install, ms));
})();
