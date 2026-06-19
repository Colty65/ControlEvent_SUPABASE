/* ControlEvent v11.1_prod - guardia de sesión visible.
   Evita que la cabecera quede en "Sin acceso" dentro de una sesión activa por refrescos/renderizados tardíos. */
(function(){
  'use strict';
  if(window.__ceV952SessionGuard) return;
  window.__ceV952SessionGuard = true;
  var KEY='ControlEvent_v11_1_prod_auth_shadow';
  var LOGOUT_UNTIL=0;
  function text(v){ return v==null?'':String(v); }
  function $(id){ return document.getElementById(id); }
  function safe(fn, fallback){ try{ return fn(); }catch(_){ return fallback; } }
  function readLexAuth(){ return safe(function(){ return (typeof authUser !== 'undefined' && authUser) ? authUser : null; }, null); }
  function currentAuth(){ return readLexAuth() || window.authUser || window.ControlEventApp?.authUser || window.ControlEventRuntime?.app?.authUser || window.__CONTROL_EVENT_USER__ || null; }
  function validUser(u){ return !!u && !!text(u.nivel).trim() && (!!text(u.nombre).trim() || !!text(u.identificacion).trim()); }
  function putShadow(u){
    if(!validUser(u)) return;
    window.__ceAuthShadowV952 = u;
    safe(function(){ sessionStorage.setItem(KEY, JSON.stringify(u)); });
  }
  function getShadow(){
    if(validUser(window.__ceAuthShadowV952)) return window.__ceAuthShadowV952;
    var raw=safe(function(){ return sessionStorage.getItem(KEY); }, '');
    if(!raw) return null;
    try{ var u=JSON.parse(raw); return validUser(u) ? u : null; }catch(_){ return null; }
  }
  function clearShadow(){
    window.__ceAuthShadowV952=null;
    safe(function(){ sessionStorage.removeItem(KEY); });
  }
  function setAuth(u){
    if(!validUser(u)) return false;
    safe(function(){ if(typeof authUser !== 'undefined') authUser = u; });
    window.authUser = u;
    window.__CONTROL_EVENT_USER__ = u;
    safe(function(){ if(window.ControlEventApp) window.ControlEventApp.authUser = u; });
    safe(function(){ if(window.ControlEventRuntime?.app) window.ControlEventRuntime.app.authUser = u; });
    return true;
  }
  function updateHeader(u){
    if(!validUser(u)) return;
    var name=text(u.nombre || u.identificacion || 'Usuario');
    var level=text(u.nivel || '');
    ['currentUserName','brandCurrentUserName'].forEach(function(id){ var el=$(id); if(el && (!el.textContent || /Sin acceso/i.test(el.textContent))) el.textContent=name; });
    ['currentUserLevel','brandCurrentUserMeta'].forEach(function(id){ var el=$(id); if(el && !text(el.textContent).trim()) el.textContent=level; });
    ['btnLogout','btnSoftRefresh'].forEach(function(id){ var b=$(id); if(b){ b.classList.remove('hidden'); b.removeAttribute('hidden'); b.style.removeProperty('display'); } });
  }
  function visibleData(){
    var s=safe(function(){ return (typeof state !== 'undefined' && state) || window.state || {}; }, window.state || {});
    if(s && (Array.isArray(s.eventos) || Array.isArray(s.compras) || Array.isArray(s.productos))) return true;
    return !!document.querySelector('#selectedEvent option[value]:not([value=""])');
  }
  function logoutRecently(){ return Date.now() < LOGOUT_UNTIL || safe(function(){ return document.body.classList.contains('ce-v5011-logged-out') || document.body.classList.contains('ce-v5010-logged-out'); }, false); }
  function tick(){
    var u=currentAuth();
    if(validUser(u)){ putShadow(u); updateHeader(u); return; }
    if(logoutRecently()) return;
    var shadow=getShadow();
    if(shadow && visibleData()){
      setAuth(shadow);
      updateHeader(shadow);
      safe(function(){ window.dispatchEvent(new CustomEvent('controlevent:auth-restored-v952',{detail:{user:shadow}})); });
    }
  }
  document.addEventListener('click', function(ev){ if(ev.target && ev.target.closest && ev.target.closest('#btnLogout,[data-ce-logout],#ceBtnSalirV513')){ LOGOUT_UNTIL=Date.now()+20000; clearShadow(); } }, true);
  if(typeof window.fetch==='function' && !window.__ceV952SessionGuardFetch){
    window.__ceV952SessionGuardFetch=true;
    var oldFetch=window.fetch.bind(window);
    window.fetch=function(input, init){
      var url=text((input && input.url) || input || '');
      var p=oldFetch(input, init);
      if(/\/api\/login(?:\?|$)/.test(url)){
        return p.then(function(res){ try{ res.clone().json().then(function(data){ if(res.ok && data && data.ok && data.user){ LOGOUT_UNTIL=0; putShadow(data.user); setTimeout(tick,80); } }).catch(function(){}); }catch(_){} return res; });
      }
      if(/\/api\/logout(?:\?|$)/.test(url)){
        LOGOUT_UNTIL=Date.now()+20000; clearShadow();
      }
      return p;
    };
  }
  var oldLogout = window.doLogout;
  if(typeof oldLogout === 'function' && !oldLogout.__ceV952Wrapped){
    var wrapped=function(){ LOGOUT_UNTIL=Date.now()+20000; clearShadow(); return oldLogout.apply(this, arguments); };
    wrapped.__ceV952Wrapped=true;
    safe(function(){ doLogout=wrapped; });
    window.doLogout=wrapped;
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', tick, {once:true}); else tick();
  window.addEventListener('controlevent:runtime-ready', tick, false);
  window.addEventListener('focus', tick, false);
  setInterval(tick, 900);
  console.info('[CE v9.5.2] Guardia de sesión activa');
})();
