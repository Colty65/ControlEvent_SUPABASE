/* ControlEvent v16_prod - OPT3C entrada estable
   Objetivo: login/pre-entrada sin refrescos visuales ni trabajo pesado en segundo plano.
   No toca datos, compras, ingresos, documentos, tickets, gráficas ni avance. */
(function(){
  'use strict';

  const VERSION = 'v16_opt_3c_entrada_estable';
  const WELCOME_ICON = './assets/icons/controlevent-welcome-v44.png';
  const RENDER_BLOCKED_NAMES = [
    'render','renderHeader','renderPermissions','renderLockState',
    'renderBudget','renderGraficas','renderIngresos','renderDonaciones','renderCompras',
    'renderMapaProductos','renderDocuments','renderEventDocuments','renderPlanificacionInicial',
    'renderMaintenance','renderEnvironmentBanner'
  ];

  const stats = {blocked:0, welcomeCleanups:0, authSyncs:0, loginGuarded:0, fetchStateBlocked:0};
  let authRaf = 0;
  let welcomeRaf = 0;
  let unlockTimer = 0;
  let loginBusy = false;
  let originalFetch = null;

  function $(id){ return document.getElementById(id); }
  function safe(fn, fallback){ try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } }
  function st(){ return safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {}); }
  function auth(){ return safe(() => (typeof authUser !== 'undefined' && authUser) || window.authUser || window.ControlEventApp?.authUser || null, window.authUser || window.ControlEventApp?.authUser || null); }
  function overlay(){ return $('authOverlay'); }
  function overlayVisible(){
    const ov = overlay();
    if(!ov || ov.classList.contains('hidden') || ov.hasAttribute('hidden')) return false;
    const cs = safe(() => getComputedStyle(ov), null);
    return !cs || (cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0);
  }
  function preloginLocked(){ return overlayVisible() && !auth(); }
  function hasSelectedEvent(){
    const s = st();
    const id = String(s?.selectedEventId || '');
    if(!id) return false;
    return Array.isArray(s.eventos) ? s.eventos.some(e => String(e?.id || '') === id) : true;
  }

  function injectStyle(){
    if($('ceV16Opt3cEntradaStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV16Opt3cEntradaStyle';
    style.textContent = `
      body.ce-auth-stable{overflow:hidden!important;background:#7b828d!important;}
      body.ce-auth-stable .header,
      body.ce-auth-stable > .app,
      body.ce-auth-stable .footer,
      body.ce-auth-stable #perfPanel,
      body.ce-auth-stable #cePerfPanel,
      body.ce-auth-stable .perf-panel,
      body.ce-auth-stable .mobile-menu,
      body.ce-auth-stable .floating-home,
      body.ce-auth-stable #ceEventSwitchNotice{
        visibility:hidden!important;opacity:0!important;pointer-events:none!important;
      }
      #authOverlay:not(.hidden){
        position:fixed!important;inset:0!important;display:flex!important;align-items:center!important;justify-content:center!important;
        min-height:100vh!important;width:100vw!important;background:rgba(107,114,128,.86)!important;z-index:500000!important;
        visibility:visible!important;opacity:1!important;pointer-events:auto!important;overflow:hidden!important;
      }
      #authOverlay.hidden{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #authOverlay > .brand-user,
      #authOverlay > .brand,
      #authOverlay > .appname,
      #authOverlay .brand-user:not(.ce-auth-user-inside){display:none!important;visibility:hidden!important;}
      #authOverlay .auth-card{
        position:relative!important;inset:auto!important;transform:none!important;animation:none!important;
        width:min(560px,calc(100vw - 42px))!important;max-width:560px!important;margin:0 auto!important;
        box-sizing:border-box!important;will-change:auto!important;contain:layout paint style!important;
      }
      #authOverlay input,#authOverlay button{pointer-events:auto!important;}
      .ce-prelogin-splash,.ce-login-splash,.ce-boot-logo,.ce-v1042-party,
      body.ce-auth-stable .ce-v44-welcome,body.ce-auth-stable .ce-v1042-welcome,body.ce-auth-stable .ce-v5013-welcome{display:none!important;visibility:hidden!important;}
      #noEventMessage.ce-v16opt3c-clean-welcome{
        display:flex!important;align-items:center!important;justify-content:center!important;min-height:52vh!important;
        background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0 auto!important;
      }
      #noEventMessage.ce-v16opt3c-clean-welcome.hidden{display:none!important;}
      .ce-v16opt3c-welcome{display:flex!important;align-items:center!important;justify-content:center!important;width:100%!important;min-height:48vh!important;text-align:center!important;background:transparent!important;box-shadow:none!important;border:0!important;padding:0!important;margin:0!important;}
      .ce-v16opt3c-welcome img{display:block!important;width:min(190px,28vw)!important;max-width:190px!important;height:auto!important;margin:0 auto!important;border-radius:28px!important;filter:drop-shadow(0 14px 26px rgba(15,23,42,.20))!important;animation:none!important;}
      .ce-v16opt3c-welcome h1,.ce-v16opt3c-welcome h2,.ce-v16opt3c-welcome h3,.ce-v16opt3c-welcome p,.ce-v16opt3c-welcome span{display:none!important;}
      @media(max-width:760px){.ce-v16opt3c-welcome img{width:min(150px,42vw)!important;}}
    `;
    document.head.appendChild(style);
  }

  function syncAuthStable(){
    injectStyle();
    const on = overlayVisible();
    try{ document.body.classList.toggle('ce-auth-stable', on); }catch(_){ }
    if(on){
      // Elimina el texto huérfano "Sin acceso" que quedaba dentro del overlay por HTML acumulado.
      try{ document.querySelectorAll('#authOverlay > .brand-user,#authOverlay > .brand,#authOverlay > .appname').forEach(el => { el.style.setProperty('display','none','important'); }); }catch(_){ }
      try{ document.querySelectorAll('#ceEventSwitchNotice,.ce-v447-loading').forEach(el => el.remove()); }catch(_){ }
      const ov = overlay();
      if(ov){
        ov.style.setProperty('display','flex','important');
        ov.style.setProperty('align-items','center','important');
        ov.style.setProperty('justify-content','center','important');
      }
    }else{
      clearTimeout(unlockTimer);
      unlockTimer = setTimeout(cleanWelcome, 90);
    }
    stats.authSyncs++;
  }
  function scheduleAuthSync(){ if(authRaf) return; authRaf = requestAnimationFrame(() => { authRaf = 0; syncAuthStable(); }); }

  function cleanWelcome(){
    injectStyle();
    if(overlayVisible() || !auth() || hasSelectedEvent()) return;
    const msg = $('noEventMessage');
    if(!msg) return;
    msg.classList.add('ce-v16opt3c-clean-welcome');
    msg.classList.remove('hidden');
    const html = `<div class="ce-v16opt3c-welcome"><img src="${WELCOME_ICON}" alt="ControlEvent" /></div>`;
    if(!msg.querySelector('.ce-v16opt3c-welcome')) msg.innerHTML = html;
    else {
      msg.querySelectorAll('h1,h2,h3,p,span').forEach(el => el.remove());
      const img = msg.querySelector('.ce-v16opt3c-welcome img');
      if(img && !img.getAttribute('src')) img.setAttribute('src', WELCOME_ICON);
    }
    stats.welcomeCleanups++;
  }
  function scheduleWelcome(){ if(welcomeRaf) return; welcomeRaf = requestAnimationFrame(() => { welcomeRaf = 0; cleanWelcome(); }); }

  function wrapRenderName(name){
    let fn = window[name] || safe(() => eval(name), null);
    if(typeof fn !== 'function' || fn.__ceOpt3cWrapped) return;
    const wrapped = function(){
      if(preloginLocked()){
        stats.blocked++;
        scheduleAuthSync();
        return undefined;
      }
      return fn.apply(this, arguments);
    };
    wrapped.__ceOpt3cWrapped = true;
    wrapped.__ceOpt3cOriginal = fn;
    try{ window[name] = wrapped; }catch(_){ }
    try{ eval(name + ' = wrapped'); }catch(_){ }
  }

  function patchRenders(){ RENDER_BLOCKED_NAMES.forEach(wrapRenderName); }

  function patchLoginOnce(){
    const old = window.doLogin || safe(() => (typeof doLogin === 'function' ? doLogin : null), null);
    if(typeof old !== 'function' || old.__ceOpt3cLoginGuard) return;
    const guarded = function(){
      if(loginBusy){ stats.loginGuarded++; return false; }
      loginBusy = true;
      const btn = $('btnLogin');
      try{ if(btn) btn.disabled = true; }catch(_){ }
      const release = () => setTimeout(() => { loginBusy = false; try{ if(btn) btn.disabled = false; }catch(_){ } scheduleAuthSync(); scheduleWelcome(); }, 650);
      try{
        const result = old.apply(this, arguments);
        if(result && typeof result.then === 'function') result.finally(release); else release();
        return result;
      }catch(error){ release(); throw error; }
    };
    guarded.__ceOpt3cLoginGuard = true;
    guarded.__ceOpt3cOriginal = old;
    try{ window.doLogin = guarded; }catch(_){ }
    try{ doLogin = guarded; }catch(_){ }
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.doLogin = guarded; }catch(_){ }
  }

  function patchFetch(){
    if(originalFetch || typeof window.fetch !== 'function') return;
    originalFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      try{
        const url = String((input && input.url) || input || '');
        const isState = /\/api\/state(?:\?|$)/.test(url);
        if(isState && preloginLocked()){
          stats.fetchStateBlocked++;
          return Promise.resolve(new Response(JSON.stringify({ok:true,eventos:[],selectedEventId:''}), {status:200, headers:{'Content-Type':'application/json'}}));
        }
      }catch(_){ }
      return originalFetch(input, init);
    };
  }

  function installObservers(){
    if(document.__ceOpt3cObservers) return;
    document.__ceOpt3cObservers = true;
    try{
      const mo = new MutationObserver((mutations) => {
        let authTouched = false, welcomeTouched = false;
        for(const m of mutations){
          const t = m.target;
          if(t && (t.id === 'authOverlay' || t.closest?.('#authOverlay'))) authTouched = true;
          if(t && (t.id === 'noEventMessage' || t.closest?.('#noEventMessage'))) welcomeTouched = true;
          if(authTouched && welcomeTouched) break;
        }
        if(authTouched) scheduleAuthSync();
        if(welcomeTouched) scheduleWelcome();
      });
      mo.observe(document.body, {subtree:true, childList:true, attributes:true, attributeFilter:['class','style','hidden','aria-hidden']});
      window.__ceOpt3cEntradaObserver = mo;
    }catch(_){ }
    ['focusin','input','change','click','keydown'].forEach(type => {
      document.addEventListener(type, ev => {
        const id = ev.target?.id || '';
        if(id === 'loginIdentificacion' || id === 'loginClave' || id === 'btnLogin') scheduleAuthSync();
      }, true);
    });
    ['controlevent:app-ready','controlevent:runtime-ready','controlevent:event-ready','controlevent:event-changed','controlevent:module-mounted','load'].forEach(evt => {
      window.addEventListener(evt, () => { patchRenders(); patchLoginOnce(); scheduleAuthSync(); scheduleWelcome(); }, {passive:true});
    });
  }

  function install(){
    injectStyle();
    patchFetch();
    patchRenders();
    patchLoginOnce();
    installObservers();
    syncAuthStable();
    cleanWelcome();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  [80,240,600,1200,2400].forEach(ms => setTimeout(install, ms));

  window.ControlEventOpt3C = {version:VERSION, stats, syncAuthStable, cleanWelcome, patchRenders};
})();
