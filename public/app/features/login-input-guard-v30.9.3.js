/* ControlEvent v50.24 - Guardia temprana del login.
   Objetivo: que ninguna capa de globos, mapa o render heredado pueda bloquear los inputs de acceso. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.24 login-input-guard';
  const INPUT_IDS = new Set(['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2']);
  const AUTH_ID = 'authOverlay';

  function $(id){ return document.getElementById(id); }
  function inAuth(node){ try{ return !!(node && node.closest && node.closest('#' + AUTH_ID)); }catch(_){ return false; } }
  function loginInputFrom(node){
    try{
      const el = node && node.closest && node.closest('input,textarea');
      return el && INPUT_IDS.has(el.id) ? el : null;
    }catch(_){ return null; }
  }
  function isLoginButton(node){
    try{ return !!(node && node.closest && node.closest('#btnLogin,#btnToggleChangePassword,#btnChangePassword')); }catch(_){ return false; }
  }
  function ensureCss(){
    if($('ceLoginInputGuardCssV3093')) return;
    const style = document.createElement('style');
    style.id = 'ceLoginInputGuardCssV3093';
    style.textContent = `
      #authOverlay{pointer-events:auto!important;z-index:9000!important;}
      #authOverlay.hidden{display:none!important;}
      #authOverlay .auth-card{pointer-events:auto!important;}
      #authOverlay input,#authOverlay button{pointer-events:auto!important;user-select:text!important;-webkit-user-select:text!important;touch-action:manipulation!important;}
      #authOverlay input{opacity:1!important;filter:none!important;background:#fff!important;}
    `;
    (document.head || document.documentElement).appendChild(style);
  }
  function ensureInputs(){
    ensureCss();
    INPUT_IDS.forEach(id => {
      const el = $(id);
      if(!el) return;
      try{ el.disabled = false; el.readOnly = false; el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.style.pointerEvents = 'auto'; el.style.userSelect = 'text'; el.style.webkitUserSelect = 'text'; }catch(_){ }
    });
  }
  function hasAuthUser(){
    try{ if(window.authUser) return true; }catch(_){ }
    try{ if(typeof authUser !== 'undefined' && authUser) return true; }catch(_){ }
    return false;
  }
  function authVisible(){
    const auth = $(AUTH_ID);
    if(!auth) return false;
    if(hasAuthUser()) return false;
    try{ return !auth.classList.contains('hidden') && getComputedStyle(auth).display !== 'none'; }catch(_){ return !auth.classList.contains('hidden'); }
  }
  function focusLater(el){
    if(!el) return;
    setTimeout(() => {
      try{ if(authVisible() && document.activeElement !== el) el.focus({preventScroll:true}); }catch(_){ try{ el.focus(); }catch(__){} }
    }, 0);
  }

  function guardPointer(event){
    const input = loginInputFrom(event.target);
    if(!input) return;
    ensureInputs();
    focusLater(input);
    // No se hace preventDefault: así el navegador conserva el foco y el teclado nativo.
    try{ event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
  }
  function guardKeyboard(event){
    const input = loginInputFrom(event.target);
    if(!input) return;
    ensureInputs();
    if(event.key === 'Enter'){
      try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
      try{ if(typeof window.doLogin === 'function') window.doLogin(); else if(typeof doLogin === 'function') doLogin(); }catch(_){ }
      return;
    }
    // Letras/números: no preventDefault. Solo evitamos que capturas globales heredadas las intercepten.
    try{ event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
  }
  function guardTextEvent(event){
    const input = loginInputFrom(event.target);
    if(!input) return;
    ensureInputs();
    try{ event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
  }
  function guardClickButtons(event){
    if(!isLoginButton(event.target)) return;
    ensureInputs();
    // Dejamos que el onclick/click propio del botón trabaje. Solo subimos el overlay por si hubiera capas encima.
  }

  ['pointerdown','mousedown','touchstart','pointerup','mouseup','touchend'].forEach(type => window.addEventListener(type, guardPointer, {capture:true, passive:true}));
  window.addEventListener('keydown', guardKeyboard, true);
  ['beforeinput','input','keyup','paste','compositionstart','compositionupdate','compositionend'].forEach(type => window.addEventListener(type, guardTextEvent, true));
  window.addEventListener('click', guardClickButtons, true);

  ensureCss();
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureInputs, {once:true}); else ensureInputs();
  [50, 200, 700, 1500, 3000].forEach(ms => setTimeout(ensureInputs, ms));
  window.ControlEventLoginInputGuard = {version: VERSION, ensure: ensureInputs};
})();
