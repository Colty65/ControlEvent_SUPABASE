/* ControlEvent v17_prod - limpieza de logo inicial y transicion limpia a GRAFICAS.
   No cambia version ni toca datos. */
(function(){
  'use strict';
  const INSTALLED = '__ceV17LogoGraficasClean';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV17LogoGraficasCleanStyle';
  const ICON = './assets/icons/controlevent-welcome-v44.png';
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? '').trim();

  function st(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || window.ControlEventApp?.state || {};
  }
  function auth(){
    try{ if(typeof authUser !== 'undefined' && authUser) return authUser; }catch(_){ }
    return window.authUser || window.ControlEventApp?.authUser || null;
  }
  function events(){ const s = st(); return Array.isArray(s.eventos) ? s.eventos : []; }
  function selectedId(){ return norm(st().selectedEventId || $('selectedEvent')?.value || ''); }
  function hasValidEvent(id = selectedId()){
    id = norm(id);
    return !!id && events().some(ev => String(ev?.id || '') === id);
  }
  function setGraficasTab(){
    try{ currentMainTab = 'graficas'; }catch(_){ }
    try{ window.currentMainTab = 'graficas'; }catch(_){ }
    try{ window.__ceCurrentMainTab = 'graficas'; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'graficas'; }catch(_){ }
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #noEventMessage.ce-v17-logo-only,
      #noEventMessage.ce-v44-welcome-card.ce-v17-logo-only{
        display:flex!important;align-items:center!important;justify-content:center!important;
        min-height:44vh!important;background:transparent!important;border:0!important;box-shadow:none!important;
        padding:0!important;margin:0!important;overflow:hidden!important;
      }
      #noEventMessage.ce-v17-logo-only.hidden{display:none!important;}
      #noEventMessage.ce-v17-logo-only .ce-v44-welcome,
      #noEventMessage.ce-v17-logo-only .ce-v17-welcome-logo-only{
        width:auto!important;max-width:none!important;margin:0 auto!important;padding:0!important;text-align:center!important;
        background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;
      }
      #noEventMessage.ce-v17-logo-only .ce-v44-welcome h2,
      #noEventMessage.ce-v17-logo-only .ce-v44-welcome p,
      #noEventMessage.ce-v17-logo-only .ce-v17-welcome-logo-only h2,
      #noEventMessage.ce-v17-logo-only .ce-v17-welcome-logo-only p{display:none!important;}
      #noEventMessage.ce-v17-logo-only img,
      #noEventMessage.ce-v17-logo-only .ce-v44-welcome img,
      #noEventMessage.ce-v17-logo-only .ce-v17-welcome-logo-only img{
        display:block!important;width:min(150px,36vw)!important;max-width:150px!important;height:auto!important;
        margin:0 auto!important;border-radius:24px!important;filter:drop-shadow(0 12px 22px rgba(15,23,42,.20))!important;
        transform:none!important;transition:none!important;animation:none!important;
      }
      body.ce-v17-event-switching #noEventMessage,
      body.ce-v17-has-event #noEventMessage{
        display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;max-height:0!important;overflow:hidden!important;
      }
    `;
    document.head.appendChild(style);
  }
  function hideWelcomeNow(){
    try{ document.body.classList.add('ce-v17-event-switching'); }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.add('hidden');
      msg.setAttribute('aria-hidden','true');
      msg.style.setProperty('display','none','important');
      msg.style.setProperty('visibility','hidden','important');
      msg.style.setProperty('pointer-events','none','important');
      msg.style.setProperty('max-height','0','important');
      msg.style.setProperty('overflow','hidden','important');
    }
  }
  function showLogoOnly(){
    const msg = $('noEventMessage');
    if(!msg) return;
    const alreadyClean = msg.classList.contains('ce-v17-logo-only') && !!msg.querySelector('.ce-v17-welcome-logo-only img') && !msg.querySelector('h2,p');
    msg.classList.remove('hidden');
    msg.classList.add('ce-v44-welcome-card','ce-v17-logo-only');
    msg.removeAttribute('aria-hidden');
    msg.style.removeProperty('display');
    msg.style.removeProperty('visibility');
    msg.style.removeProperty('pointer-events');
    msg.style.removeProperty('max-height');
    msg.style.removeProperty('overflow');
    if(!alreadyClean){
      msg.innerHTML = `<div class="ce-v17-welcome-logo-only"><img src="${ICON}" alt="ControlEvent" /></div>`;
    }
  }
  function sanitizeWelcome(){
    injectStyle();
    if(!auth()) return;
    const valid = hasValidEvent();
    try{ document.body.classList.toggle('ce-v17-has-event', valid); }catch(_){ }
    if(valid){ hideWelcomeNow(); return; }
    try{ document.body.classList.remove('ce-v17-event-switching','ce-v17-has-event'); }catch(_){ }
    showLogoOnly();
  }
  function wrapRenderWelcome(){
    const obj = window.ControlEventV440;
    if(obj && typeof obj.renderWelcome === 'function' && !obj.renderWelcome.__ceV17LogoClean){
      const old = obj.renderWelcome.bind(obj);
      const wrapped = function(){ const r = old.apply(this, arguments); setTimeout(sanitizeWelcome, 0); return r; };
      wrapped.__ceV17LogoClean = true;
      obj.renderWelcome = wrapped;
    }
  }
  function wrapChangeSelected(){
    const fn = window.changeSelectedEvent || (function(){ try{ return changeSelectedEvent; }catch(_){ return null; } })();
    if(typeof fn !== 'function' || fn.__ceV17LogoClean) return;
    const wrapped = function(value){
      if(norm(value)){
        setGraficasTab();
        hideWelcomeNow();
      }
      const result = fn.apply(this, arguments);
      Promise.resolve(result).finally(() => setTimeout(() => {
        try{ document.body.classList.remove('ce-v17-event-switching'); }catch(_){ }
        sanitizeWelcome();
      }, 60));
      return result;
    };
    wrapped.__ceV17LogoClean = true;
    try{ changeSelectedEvent = wrapped; }catch(_){ }
    window.changeSelectedEvent = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.changeSelectedEvent = (...args) => wrapped(...args); }catch(_){ }
  }
  function handleSelectedEventCapture(event){
    const sel = event.target?.closest?.('#selectedEvent');
    if(!sel) return;
    if(norm(sel.value)){
      setGraficasTab();
      hideWelcomeNow();
      setTimeout(sanitizeWelcome, 900);
    }
  }
  function install(){ injectStyle(); wrapRenderWelcome(); wrapChangeSelected(); sanitizeWelcome(); }

  window.addEventListener('change', handleSelectedEventCapture, true);
  document.addEventListener('change', handleSelectedEventCapture, true);
  try{ new MutationObserver(() => setTimeout(sanitizeWelcome, 30)).observe(document.body, {childList:true, subtree:true}); }catch(_){ }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,80,220,600,1400,2600].forEach(ms => setTimeout(install, ms));
  window.ControlEventV17LogoGraficasClean = {install, sanitizeWelcome, hideWelcomeNow, version:'v17_prod_logo_limpio'};
})();
