/* ControlEvent v16_prod OPT3D - guardia temprana de entrada.
   Se carga en <head> antes de bundles legacy. No bloquea login, fetch, render ni estado.
   Solo evita que escritura/autorrelleno en el login dispare manejadores globales pesados. */
(function(){
  'use strict';
  if(window.__ceV16Opt3DLoginGuardHead) return;
  window.__ceV16Opt3DLoginGuardHead = true;
  const VERSION = 'v16_opt_3d_login_guard_head';
  const INPUT_IDS = new Set(['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2']);
  const stats = {inputStops:0, toggleClicks:0, enterClicks:0, cleaned:0};

  function $(id){ return document.getElementById(id); }
  function closest(node, sel){ try{ return node && node.closest ? node.closest(sel) : null; }catch(_){ return null; } }
  function isLoginInput(node){ const el = closest(node, 'input,textarea'); return !!(el && INPUT_IDS.has(el.id) && closest(el, '#authOverlay')); }
  function isAuthVisible(){
    const ov = $('authOverlay');
    if(!ov || ov.classList.contains('hidden') || ov.hasAttribute('hidden')) return false;
    try{ const cs = getComputedStyle(ov); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0; }catch(_){ return true; }
  }
  function cleanLoginVisual(){
    const ov = $('authOverlay'); if(!ov) return;
    try{
      const visible = isAuthVisible();
      document.documentElement.classList.toggle('ce-opt3d-login-visible', visible);
      document.body?.classList.toggle('ce-opt3d-login-visible', visible);
      if(visible){
        ov.style.setProperty('display','flex','important');
        ov.style.setProperty('align-items','center','important');
        ov.style.setProperty('justify-content','center','important');
        ov.querySelectorAll(':scope > .brand-user,:scope > .brand,:scope > .appname').forEach(el => { el.style.setProperty('display','none','important'); });
        ['loginIdentificacion','loginClave'].forEach(id => { const el = $(id); if(el){ el.disabled = false; el.readOnly = false; el.removeAttribute('disabled'); el.removeAttribute('readonly'); } });
        const btn = $('btnLogin'); if(btn){ btn.disabled = false; btn.removeAttribute('disabled'); if(!String(btn.textContent||'').trim()) btn.textContent = 'Entrar'; }
      }
      stats.cleaned++;
    }catch(_){ }
  }
  function scheduleClean(){ if(scheduleClean._raf) return; scheduleClean._raf = requestAnimationFrame(() => { scheduleClean._raf = 0; cleanLoginVisual(); }); }

  function stopInputEvent(ev){
    if(!isLoginInput(ev.target)) return;
    // Mantiene la escritura/autorrelleno del navegador, pero no deja que handlers globales antiguos repinten la app.
    try{ ev.stopPropagation(); ev.stopImmediatePropagation(); stats.inputStops++; }catch(_){ }
  }
  function onKeydown(ev){
    if(!isLoginInput(ev.target)) return;
    if(ev.key === 'Enter'){
      try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
      stats.enterClicks++;
      setTimeout(() => {
        const btn = $('btnLogin');
        try{ if(btn && !btn.disabled) btn.click(); else if(typeof window.doLogin === 'function') window.doLogin(); }catch(_){ }
      }, 0);
      return;
    }
    stopInputEvent(ev);
  }
  function onClick(ev){
    const t = closest(ev.target, '.ce-pass-toggle-v233,.ce-pass-toggle-v234,[data-target="loginClave"],[data-target="changeNewPassword1"],[data-target="changeNewPassword2"]');
    if(t && closest(t, '#authOverlay')){
      const id = t.getAttribute('data-target') || 'loginClave';
      const input = $(id);
      if(input){
        try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
        const show = input.type === 'password';
        try{ input.type = show ? 'text' : 'password'; }catch(_){ }
        t.textContent = show ? 'Ocultar' : 'Ver';
        try{ input.focus({preventScroll:true}); }catch(_){ try{ input.focus(); }catch(__){} }
        stats.toggleClicks++;
        return false;
      }
    }
    if(closest(ev.target, '#btnLogin,#btnToggleChangePassword,#btnChangePassword')){
      // No se interceptan estos botones: trabajan los manejadores de login existentes y probados.
      scheduleClean();
      return;
    }
  }

  ['pointerdown','mousedown','touchstart','pointerup','mouseup','touchend','beforeinput','input','change','keyup','paste','compositionstart','compositionupdate','compositionend'].forEach(type => {
    window.addEventListener(type, stopInputEvent, {capture:true, passive:true});
  });
  window.addEventListener('keydown', onKeydown, true);
  window.addEventListener('click', onClick, true);
  document.addEventListener('DOMContentLoaded', () => { cleanLoginVisual(); setTimeout(cleanLoginVisual, 80); }, {once:true});
  window.addEventListener('load', () => { cleanLoginVisual(); setTimeout(cleanLoginVisual, 160); }, {once:true});
  window.ControlEventOpt3DLoginGuard = {version:VERSION, stats, clean:cleanLoginVisual};
})();
