/* ControlEvent v16_prod OPT3D - entrada limpia sin tocar login/fetch/render.
   Complementa a la guardia temprana: solo estilos, limpieza visual y pantalla CE sin evento. */
(function(){
  'use strict';
  if(window.__ceV16Opt3DEntradaLimpia) return;
  window.__ceV16Opt3DEntradaLimpia = true;
  const VERSION = 'v16_opt_3d_entrada_limpia';
  const WELCOME_ICON = './assets/icons/controlevent-welcome-v44.png';
  const stats = {syncs:0, welcome:0, authHidden:0};
  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  function auth(){ return safe(() => (typeof authUser !== 'undefined' && authUser) || window.authUser || window.ControlEventApp?.authUser || window.__CONTROL_EVENT_USER__ || null, null); }
  function st(){ return safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {}); }
  function selectedId(){ return String(st()?.selectedEventId || $('selectedEvent')?.value || ''); }
  function authVisible(){
    const ov = $('authOverlay');
    if(!ov || ov.classList.contains('hidden') || ov.hasAttribute('hidden')) return false;
    const cs = safe(() => getComputedStyle(ov), null);
    return !cs || (cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0);
  }
  function injectStyle(){
    if($('ceV16Opt3DEntradaStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV16Opt3DEntradaStyle';
    style.textContent = `
      html.ce-opt3d-login-visible,body.ce-opt3d-login-visible{background:#7b828d!important;overflow:hidden!important;}
      body.ce-opt3d-login-visible .header,body.ce-opt3d-login-visible > .app,body.ce-opt3d-login-visible .footer,body.ce-opt3d-login-visible #perfPanel,body.ce-opt3d-login-visible #cePerfPanel,body.ce-opt3d-login-visible .perf-panel,body.ce-opt3d-login-visible .floating-home{visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #authOverlay:not(.hidden){position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;min-height:100vh!important;width:100vw!important;background:rgba(107,114,128,.86)!important;z-index:500000!important;overflow:hidden!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;}
      #authOverlay.hidden{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #authOverlay:not(.hidden)> .brand-user,#authOverlay:not(.hidden)> .brand,#authOverlay:not(.hidden)> .appname{display:none!important;visibility:hidden!important;}
      #authOverlay .auth-card{position:relative!important;inset:auto!important;transform:none!important;animation:none!important;width:min(560px,calc(100vw - 42px))!important;max-width:560px!important;margin:0 auto!important;box-sizing:border-box!important;will-change:auto!important;}
      #authOverlay input,#authOverlay button{pointer-events:auto!important;}
      #authOverlay input{user-select:text!important;-webkit-user-select:text!important;}
      .ce-prelogin-splash,.ce-login-splash,.ce-boot-logo,.ce-v1042-party,.ce-v44-welcome,.ce-v1042-welcome,.ce-v5013-welcome{animation:none!important;}
      #noEventMessage.ce-opt3d-welcome-clean{display:flex!important;align-items:center!important;justify-content:center!important;min-height:52vh!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0 auto!important;}
      #noEventMessage.ce-opt3d-welcome-clean.hidden{display:none!important;}
      .ce-opt3d-welcome{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-height:48vh!important;text-align:center!important;background:transparent!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0!important;}
      .ce-opt3d-welcome img{display:block!important;width:min(190px,28vw)!important;max-width:190px!important;height:auto!important;margin:0 auto!important;border-radius:28px!important;filter:drop-shadow(0 14px 26px rgba(15,23,42,.20))!important;animation:none!important;}
      .ce-opt3d-welcome h1,.ce-opt3d-welcome h2,.ce-opt3d-welcome h3,.ce-opt3d-welcome p,.ce-opt3d-welcome span{display:none!important;}
      @media(max-width:760px){.ce-opt3d-welcome img{width:min(150px,42vw)!important;}}
    `;
    document.head.appendChild(style);
  }
  function syncLogin(){
    injectStyle();
    const visible = authVisible() && !auth();
    try{ document.documentElement.classList.toggle('ce-opt3d-login-visible', visible); document.body.classList.toggle('ce-opt3d-login-visible', visible); }catch(_){ }
    if(visible){
      const ov = $('authOverlay');
      if(ov){
        ov.style.setProperty('display','flex','important');
        ov.style.setProperty('align-items','center','important');
        ov.style.setProperty('justify-content','center','important');
        ov.querySelectorAll(':scope > .brand-user,:scope > .brand,:scope > .appname').forEach(el => { el.style.setProperty('display','none','important'); });
      }
    }else if(auth()){
      stats.authHidden++;
      try{ document.documentElement.classList.remove('ce-opt3d-login-visible'); document.body.classList.remove('ce-opt3d-login-visible'); }catch(_){ }
    }
    stats.syncs++;
  }
  function cleanWelcome(){
    if(authVisible() || !auth() || selectedId()) return;
    const msg = $('noEventMessage'); if(!msg) return;
    msg.classList.add('ce-opt3d-welcome-clean');
    msg.classList.remove('hidden');
    if(!msg.querySelector('.ce-opt3d-welcome')) msg.innerHTML = `<div class="ce-opt3d-welcome"><img src="${WELCOME_ICON}" alt="ControlEvent" /></div>`;
    stats.welcome++;
  }
  let raf = 0;
  function tick(){ if(raf) return; raf = requestAnimationFrame(() => { raf = 0; syncLogin(); cleanWelcome(); }); }
  function install(){ injectStyle(); syncLogin(); cleanWelcome(); }
  document.addEventListener('DOMContentLoaded', install, {once:true});
  ['load','click','focusin','input','change','controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, tick, {passive:true}));
  [80,240,700,1500].forEach(ms => setTimeout(install, ms));
  window.ControlEventOpt3D = {version:VERSION, stats, syncLogin, cleanWelcome};
})();
