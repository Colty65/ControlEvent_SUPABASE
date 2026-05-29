/* ControlEvent v1.0.1/pr - saneamiento de efectos colaterales v50.5.
   - Salir real: limpia sesion ligera localStorage y evita reentrada automatica.
   - Evita flicker de pantalla inicial/login durante renders autentificados en iPad.
   - Mueve Salir/Refrescar en movil/iPad a esquina inferior derecha, compactos y semitransparentes.
   - Visor ligero de fotos/justificantes de INGRESOS y globos, bloqueando handlers antiguos que congelaban iPad.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v1.0.1/pr';
  const VERSION_FILE = 'ControlEvent_v1_0_1_pr';
  const INSTALLED = '__ceV506FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const SESSION_KEY = 'ControlEvent_v50_24_session';
  const LOGOUT_KEY = 'ControlEvent_v50_24_logout_at';
  const PHOTO_SELECTOR = [
    '.ce-v504-receipt-thumb',
    '[data-ce-v504-receipt="view"]',
    '.ce-v502-receipt-thumb',
    '[data-action="ingreso-receipt-view-v502"]',
    '.ce-v465-receipt-thumb',
    '[data-action="ingreso-receipt-view-v465"]',
    '.ce-v465-tip-thumb',
    'img.ticket-thumb'
  ].join(',');

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safe = fn => { try{ return fn(); }catch(_){ return null; } };

  function stop(ev){
    try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ }
    return false;
  }
  function globalFn(name){
    return safe(() => (typeof window[name] === 'function') ? window[name] : Function('return (typeof '+name+' === "function") ? '+name+' : null')()) || null;
  }
  function setLexical(name, valueExpr){
    try{ Function(name + ' = ' + valueExpr)(); }catch(_){ }
  }
  function currentAuth(){
    return safe(() => (typeof authUser !== 'undefined' && authUser) ? authUser : null)
      || window.authUser
      || window.ControlEventApp?.authUser
      || window.__CONTROL_EVENT_USER__
      || null;
  }
  function storedUser(){
    if(isExplicitLogout()) return null;
    const raw = safe(() => localStorage.getItem(SESSION_KEY));
    if(!raw) return null;
    const user = safe(() => JSON.parse(raw));
    if(user && typeof user === 'object' && (user.identificacion || user.nombre || user.nivel)) return user;
    return null;
  }
  function isExplicitLogout(){
    const raw = Number(safe(() => sessionStorage.getItem(LOGOUT_KEY)) || 0);
    return raw > 0 && (Date.now() - raw) < 12 * 60 * 60 * 1000;
  }
  function clearExplicitLogout(){ safe(() => sessionStorage.removeItem(LOGOUT_KEY)); }
  function markExplicitLogout(){ safe(() => sessionStorage.setItem(LOGOUT_KEY, String(Date.now()))); }
  function hasStableAuth(){ return !!(currentAuth() || storedUser()); }

  function injectStyle(){
    if($('ceV506FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV506FinalStyle';
    style.textContent = `
      body.ce-v506-auth-stable:not(.ce-v506-logged-out) #authOverlay{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      body.ce-v506-logged-out #authOverlay{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:200000!important;}
      #ceV506PhotoModal{position:fixed!important;inset:0!important;z-index:1000002!important;background:rgba(15,23,42,.72)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:10px!important;touch-action:none!important;overscroll-behavior:contain!important;}
      #ceV506PhotoModal .ce-v506-photo-card{width:min(1080px,96vw)!important;max-height:94vh!important;background:#fff!important;border-radius:18px!important;box-shadow:0 24px 80px rgba(0,0,0,.44)!important;padding:10px!important;display:flex!important;flex-direction:column!important;gap:8px!important;overflow:hidden!important;}
      #ceV506PhotoModal .ce-v506-photo-head{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;font-weight:950!important;color:#111827!important;min-height:36px!important;}
      #ceV506PhotoModal .ce-v506-photo-close{min-width:42px!important;height:36px!important;border-radius:999px!important;border:0!important;background:#111827!important;color:#fff!important;font-size:22px!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0!important;}
      #ceV506PhotoModal .ce-v506-photo-stage{flex:1 1 auto!important;min-height:0!important;display:flex!important;align-items:center!important;justify-content:center!important;overflow:auto!important;background:#f8fafc!important;border-radius:14px!important;border:1px solid rgba(148,163,184,.25)!important;padding:6px!important;-webkit-overflow-scrolling:touch!important;}
      #ceV506PhotoModal img{max-width:100%!important;max-height:78vh!important;object-fit:contain!important;border-radius:10px!important;background:#f8fafc!important;display:block!important;}
      #ceV506PhotoModal .ce-v506-photo-info{font-size:12px!important;color:#475569!important;white-space:pre-wrap!important;max-height:64px!important;overflow:auto!important;border-top:1px solid #e5e7eb!important;padding-top:5px!important;-webkit-overflow-scrolling:touch!important;}
      #ceV504ReceiptModal,.ce-v468-modal,#ceTicketModalV234,#ceTicketImageModalV225{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      @media(max-width:900px){
        body.ce-v506-auth-stable:not(.ce-v506-logged-out) .appname .user-actions{display:flex!important;position:fixed!important;top:auto!important;left:auto!important;right:calc(env(safe-area-inset-right,0px) + 6px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 96px)!important;z-index:9400!important;flex-direction:column!important;gap:4px!important;align-items:flex-end!important;justify-content:flex-end!important;margin:0!important;padding:0!important;height:auto!important;min-height:0!important;pointer-events:none!important;opacity:.46!important;transition:opacity .14s ease!important;}
        body.ce-v506-auth-stable:not(.ce-v506-logged-out) .appname .user-actions:focus-within,body.ce-v506-auth-stable:not(.ce-v506-logged-out) .appname .user-actions:hover{opacity:.9!important;}
        body.ce-v506-auth-stable:not(.ce-v506-logged-out) #btnLogout:not(.hidden),body.ce-v506-auth-stable:not(.ce-v506-logged-out) #btnSoftRefresh:not(.hidden){position:static!important;display:inline-flex!important;visibility:visible!important;align-items:center!important;justify-content:center!important;height:30px!important;min-height:30px!important;min-width:50px!important;border-radius:11px!important;background:rgba(255,255,255,.52)!important;color:#111827!important;border:1px solid rgba(15,23,42,.16)!important;box-shadow:0 5px 14px rgba(15,23,42,.12)!important;font-size:10px!important;font-weight:950!important;line-height:1!important;pointer-events:auto!important;touch-action:manipulation!important;padding:0 7px!important;margin:0!important;backdrop-filter:blur(4px)!important;-webkit-backdrop-filter:blur(4px)!important;}
        body.ce-v506-auth-stable:not(.ce-v506-logged-out) #btnSoftRefresh:not(.hidden){min-width:64px!important;}
        body.ce-v506-auth-stable:not(.ce-v506-logged-out) #btnLogout:active,body.ce-v506-auth-stable:not(.ce-v506-logged-out) #btnSoftRefresh:active{background:rgba(255,255,255,.92)!important;}
      }
      @media(max-width:420px){body.ce-v506-auth-stable:not(.ce-v506-logged-out) .appname .user-actions{bottom:calc(env(safe-area-inset-bottom,0px) + 88px)!important;right:calc(env(safe-area-inset-right,0px) + 4px)!important;opacity:.40!important;}}
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{
      document.title = VERSION;
      document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version: VERSION, versionFile: VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const text = el.textContent || '';
        if(/ControlEvent\s+v\d+(?:\.\d+)*/i.test(text)) el.textContent = text.replace(/ControlEvent\s+v\d+(?:\.\d+)*/ig, VERSION);
      });
    }catch(_){ }
  }

  function closeStrayModals(){
    ['ceV505PhotoModal','ceV504ReceiptModal','ceV502ReceiptModal','ceTicketModalV234','ceTicketImageModalV225'].forEach(id => {
      const el = $(id);
      if(!el) return;
      try{ el.remove(); }catch(_){ try{ el.classList.remove('visible','open','show'); el.style.display='none'; }catch(__){ } }
    });
    document.querySelectorAll('.ce-v468-modal,.ce-ticket-modal-v234,.ce-ticket-modal-v225').forEach(el => { try{ el.remove(); }catch(_){ } });
  }

  function syncAuthStable(){
    injectStyle(); applyVersion();
    const stable = hasStableAuth();
    const loggedOut = isExplicitLogout() && !stable;
    document.body.classList.toggle('ce-v506-auth-stable', stable);
    document.body.classList.toggle('ce-v506-logged-out', loggedOut || (!stable && isExplicitLogout()));
    document.body.classList.toggle('auth-locked', !stable);
    if(stable){
      const overlay = $('authOverlay');
      if(overlay){ overlay.classList.add('hidden'); overlay.style.setProperty('display','none','important'); overlay.style.setProperty('visibility','hidden','important'); overlay.style.setProperty('pointer-events','none','important'); }
      const logout = $('btnLogout'); if(logout){ logout.classList.remove('hidden'); logout.disabled = false; }
      const refresh = $('btnSoftRefresh'); if(refresh){ refresh.classList.remove('hidden'); refresh.disabled = false; }
    }else if(isExplicitLogout()){
      const overlay = $('authOverlay');
      if(overlay){ overlay.classList.remove('hidden'); overlay.removeAttribute('hidden'); overlay.style.removeProperty('display'); overlay.style.removeProperty('visibility'); overlay.style.removeProperty('pointer-events'); }
      const logout = $('btnLogout'); if(logout) logout.classList.add('hidden');
      const refresh = $('btnSoftRefresh'); if(refresh) refresh.classList.add('hidden');
    }
  }

  function hardLoggedOutUi(){
    markExplicitLogout();
    try{ localStorage.removeItem(SESSION_KEY); }catch(_){ }
    try{ sessionStorage.removeItem('ce_v250_event_chosen'); }catch(_){ }
    setLexical('authUser','null');
    setLexical('accessUsers','[]');
    try{ window.authUser = null; }catch(_){ }
    try{ window.__CONTROL_EVENT_USER__ = null; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.authUser = null; }catch(_){ }
    document.body.classList.remove('ce-v506-auth-stable','ce-authenticated-v505','ce-authenticated-v504','ce-role-ro-v505','ce-role-rw-v505','ce-role-gd-v505','ce-role-ro-v504','ce-role-rw-v504','ce-role-gd-v504','ce-role-ro-v502','ce-role-rw-v502','ce-role-gd-v502','ce-role-ro-v452','mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.documentElement.classList.remove('mobile-drawer-open','mobile-menu-open','ce-mobile-menu-open','drawer-open','menu-open');
    document.body.classList.add('auth-locked','ce-v506-logged-out');
    ['brandCurrentUserName','currentUserName'].forEach(id => { const el=$(id); if(el) el.textContent='Sin acceso'; });
    ['brandCurrentUserMeta','currentUserLevel'].forEach(id => { const el=$(id); if(el) el.textContent=''; });
    ['loginIdentificacion','loginClave','changeNewPassword1','changeNewPassword2'].forEach(id => { const el=$(id); if(el) el.value=''; });
    const err=$('authError'); if(err) err.textContent='';
    const change=$('changePasswordPanel'); if(change) change.classList.add('hidden');
    closeStrayModals();
    const overlay=$('authOverlay');
    if(overlay){ overlay.classList.remove('hidden'); overlay.removeAttribute('hidden'); overlay.style.removeProperty('display'); overlay.style.removeProperty('visibility'); overlay.style.removeProperty('pointer-events'); }
    const logout=$('btnLogout'); if(logout) logout.classList.add('hidden');
    const refresh=$('btnSoftRefresh'); if(refresh) refresh.classList.add('hidden');
  }

  function logoutV506(ev){
    stop(ev || {});
    hardLoggedOutUi();
    try{ fetch('/api/logout', {method:'POST', cache:'no-store'}).catch(() => {}); }catch(_){ }
    setTimeout(hardLoggedOutUi, 80);
    setTimeout(hardLoggedOutUi, 450);
    return false;
  }

  function patchAuthFlow(){
    const oldLogin = globalFn('doLogin');
    if(typeof oldLogin === 'function' && !oldLogin.__ceV506Wrapped){
      const wrappedLogin = async function(){
        clearExplicitLogout();
        document.body.classList.remove('ce-v506-logged-out');
        const out = await oldLogin.apply(this, arguments);
        setTimeout(syncAuthStable, 20);
        setTimeout(syncAuthStable, 220);
        return out;
      };
      wrappedLogin.__ceV506Wrapped = true;
      try{ doLogin = wrappedLogin; }catch(_){ }
      window.doLogin = wrappedLogin;
    }

    const oldLogout = globalFn('doLogout');
    if(typeof oldLogout === 'function' && !oldLogout.__ceV506Replaced){
      const replaced = function(ev){ return logoutV506(ev || window.event); };
      replaced.__ceV506Replaced = true;
      try{ doLogout = replaced; }catch(_){ }
      window.doLogout = replaced;
    }

    const oldRenderAuth = globalFn('renderAuthUI');
    if(typeof oldRenderAuth === 'function' && !oldRenderAuth.__ceV506Wrapped){
      const wrappedAuth = function(){
        const stableBefore = hasStableAuth();
        const ret = oldRenderAuth.apply(this, arguments);
        if(stableBefore || hasStableAuth()) syncAuthStable();
        return ret;
      };
      wrappedAuth.__ceV506Wrapped = true;
      try{ renderAuthUI = wrappedAuth; }catch(_){ }
      window.renderAuthUI = wrappedAuth;
    }
  }

  function patchRender(){
    const oldRender = globalFn('render');
    if(typeof oldRender !== 'function' || oldRender.__ceV506Wrapped) return;
    const wrapped = function(){
      const stableBefore = hasStableAuth();
      const ret = oldRender.apply(this, arguments);
      if(stableBefore || hasStableAuth()){
        [0,30,120,320].forEach(ms => setTimeout(syncAuthStable, ms));
      }
      return ret;
    };
    wrapped.__ceV506Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.render = (...args) => wrapped(...args); }catch(_){ }
  }

  function photoTrigger(target){
    try{ return target?.closest?.(PHOTO_SELECTOR) || null; }catch(_){ return null; }
  }
  function photoSrc(trigger){
    const img = trigger?.matches?.('img') ? trigger : trigger?.querySelector?.('img');
    return img?.currentSrc || img?.src || '';
  }
  function photoContext(trigger){
    const card = trigger?.closest?.('.itemcard,.rowline,tr,.summary-item,#ceTooltipV21,#ceBudgetLiteTooltipV307,.ce-v21-tooltip,.ce-budget-tooltip') || null;
    return String(card?.innerText || '').replace(/\n{3,}/g,'\n\n').trim().slice(0,900);
  }
  function neutralizeLegacyPhotoHandlers(trigger){
    if(!trigger || trigger.__ceV506Muted) return;
    const restore = [];
    function attr(el, name){ const val = el.getAttribute(name); if(val !== null){ restore.push(() => el.setAttribute(name,val)); el.removeAttribute(name); } }
    function cls(el, name){ if(el.classList?.contains(name)){ restore.push(() => el.classList.add(name)); el.classList.remove(name); } }
    trigger.__ceV506Muted = true;
    attr(trigger,'data-ce-v504-receipt');
    const action = trigger.getAttribute?.('data-action') || '';
    if(/^ingreso-receipt-view-v(?:465|502)$/i.test(action)) attr(trigger,'data-action');
    ['ce-v504-receipt-thumb','ce-v502-receipt-thumb','ce-v465-receipt-thumb','ce-v465-tip-thumb','ticket-thumb'].forEach(c => cls(trigger,c));
    const img = trigger.matches?.('img') ? trigger : trigger.querySelector?.('img.ticket-thumb');
    if(img) cls(img,'ticket-thumb');
    setTimeout(() => { restore.forEach(fn => { try{ fn(); }catch(_){ } }); try{ delete trigger.__ceV506Muted; }catch(_){ trigger.__ceV506Muted=false; } }, 1800);
  }
  function closePhoto(ev){
    stop(ev || {});
    const modal = $('ceV506PhotoModal');
    if(modal) modal.remove();
    return false;
  }
  function openPhoto(src, info, ev){
    if(!src) return false;
    injectStyle();
    closeStrayModals();
    try{ $('ceV506PhotoModal')?.remove(); }catch(_){ }
    const modal = document.createElement('div');
    modal.id = 'ceV506PhotoModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `<div class="ce-v506-photo-card"><div class="ce-v506-photo-head"><span>Foto / justificante</span><button type="button" class="ce-v506-photo-close" aria-label="Cerrar">×</button></div><div class="ce-v506-photo-stage"><img alt="Foto ampliada" src="${esc(src)}"></div>${info ? `<div class="ce-v506-photo-info">${esc(info)}</div>` : ''}</div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if(e.target === modal || e.target?.closest?.('.ce-v506-photo-close')) return closePhoto(e); try{ e.stopPropagation(); }catch(_){ } }, true);
    modal.addEventListener('pointerdown', e => { if(e.target === modal || e.target?.closest?.('.ce-v506-photo-close')) return; try{ e.stopPropagation(); }catch(_){ } }, true);
    try{ modal.querySelector('.ce-v506-photo-close')?.focus({preventScroll:true}); }catch(_){ }
    return stop(ev || {});
  }
  function handlePhotoEarly(ev){
    const trg = photoTrigger(ev.target);
    if(!trg) return;
    const src = photoSrc(trg);
    if(!src) return;
    neutralizeLegacyPhotoHandlers(trg);
    return openPhoto(src, photoContext(trg), ev);
  }
  function handlePhotoLate(ev){
    const trg = photoTrigger(ev.target);
    if(!trg) return;
    const src = photoSrc(trg);
    if(!src) return;
    neutralizeLegacyPhotoHandlers(trg);
    if(!$('ceV506PhotoModal')) openPhoto(src, photoContext(trg), ev);
    return stop(ev);
  }

  function install(){
    injectStyle(); applyVersion(); patchAuthFlow(); patchRender(); syncAuthStable();
  }

  ['pointerdown','touchstart'].forEach(type => window.addEventListener(type, handlePhotoEarly, {capture:true, passive:false}));
  ['pointerup','touchend','click'].forEach(type => window.addEventListener(type, handlePhotoLate, {capture:true, passive:false}));
  ['pointerdown','touchstart','click'].forEach(type => window.addEventListener(type, ev => {
    if(ev.target?.closest?.('#btnLogout')) return logoutV506(ev);
    if(ev.target?.closest?.('#btnLogin')){ clearExplicitLogout(); document.body.classList.remove('ce-v506-logged-out'); setTimeout(syncAuthStable, 50); }
  }, {capture:true, passive:false}));
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape' && $('ceV506PhotoModal')) return closePhoto(ev); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,60,180,500,1200,2500,5000].forEach(ms => setTimeout(install, ms));
  setInterval(() => { syncAuthStable(); applyVersion(); }, window.ControlEventLowResource?.interval?.(3000) || 3000);

  window.ControlEventV506 = {version: VERSION, versionFile: VERSION_FILE, install, syncAuthStable, logout: logoutV506, openPhoto};
})();
