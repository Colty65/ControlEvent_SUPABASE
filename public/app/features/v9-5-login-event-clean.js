/* ControlEvent v11.2_prod - limpieza visual real del selector de evento tras login.
   Evita que el desplegable muestre un evento aparente cuando todavía no se ha elegido ninguno. */
(function(){
  'use strict';
  if(window.__ceV95LoginEventClean) return;
  window.__ceV95LoginEventClean = true;

  var PICKED_KEY = 'ControlEvent_v11_2_prod_event_user_picked';
  var LOGIN_CLEAN_UNTIL = 0;
  function $(id){ return document.getElementById(id); }
  function text(v){ return v == null ? '' : String(v); }
  function st(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function arr(name){ var s=st(); return Array.isArray(s[name]) ? s[name] : []; }
  function auth(){ try{ return (typeof authUser !== 'undefined' && authUser) || window.authUser || null; }catch(_){ return window.authUser || null; } }
  function validEvent(id){ var sid=text(id).trim(); return !!sid && arr('eventos').some(function(e){ return text(e && e.id).trim() === sid; }); }
  function picked(){ try{ return sessionStorage.getItem(PICKED_KEY)==='1'; }catch(_){ return false; } }
  function markPicked(){ try{ sessionStorage.setItem(PICKED_KEY,'1'); }catch(_){ } }
  function clearPicked(){ try{ sessionStorage.removeItem(PICKED_KEY); }catch(_){ } }
  function ensurePlaceholder(){
    var sel=$('selectedEvent'); if(!sel) return null;
    var opt=sel.querySelector('option[value=""]');
    if(!opt){ opt=document.createElement('option'); opt.value=''; sel.insertBefore(opt, sel.firstChild); }
    opt.textContent=arr('eventos').length ? 'Selecciona evento...' : 'Cargando eventos...';
    return sel;
  }
  function clearSelection(reason){
    if(!auth()) return;
    var sel=ensurePlaceholder();
    var s=st();
    if(s) s.selectedEventId='';
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.selectedEventId=''; }catch(_){ }
    if(sel){ try{ sel.value=''; sel.selectedIndex=0; }catch(_){ } }
    try{ document.body.classList.add('ce-v95-awaiting-event-clean'); }catch(_){ }
  }
  function shouldForceClean(){
    if(!auth()) return false;
    if(picked()) return false;
    var body=document.body;
    if(Date.now() < LOGIN_CLEAN_UNTIL) return true;
    if(body && (body.classList.contains('ce-v5019-awaiting-event') || body.classList.contains('ce-v44-awaiting-event'))) return true;
    var sid=text(st().selectedEventId).trim();
    if(!sid) return true;
    return false;
  }
  function tick(reason){
    ensurePlaceholder();
    if(shouldForceClean()) clearSelection(reason || 'tick');
  }
  document.addEventListener('change', function(ev){
    var sel=ev.target && ev.target.closest && ev.target.closest('#selectedEvent');
    if(!sel) return;
    var id=text(sel.value).trim();
    if(validEvent(id)){
      markPicked();
      var s=st(); if(s) s.selectedEventId=id;
      try{ document.body.classList.remove('ce-v95-awaiting-event-clean'); }catch(_){ }
    }else{
      clearPicked();
      clearSelection('blank-change');
    }
  }, true);
  document.addEventListener('click', function(ev){
    var t=ev.target;
    if(t && (t.id==='btnLogin' || (t.closest && t.closest('#btnLogin')))){
      clearPicked(); LOGIN_CLEAN_UNTIL=Date.now()+9000;
      [80,220,480,900,1500,2600,4200,6500].forEach(function(ms){ setTimeout(function(){ tick('login-click'); }, ms); });
    }
  }, true);
  if(typeof window.fetch === 'function' && !window.__ceV95LoginFetchClean){
    window.__ceV95LoginFetchClean = true;
    var oldFetch = window.fetch.bind(window);
    window.fetch = function(input, init){
      var url = text((input && input.url) || input || '');
      var p = oldFetch(input, init);
      if(/\/api\/login(?:\?|$)/.test(url)){
        return p.then(function(res){
          try{
            res.clone().json().then(function(data){
              if(res.ok && data && data.ok){ clearPicked(); LOGIN_CLEAN_UNTIL=Date.now()+9000; [80,220,500,1000,1800,3200,5200].forEach(function(ms){ setTimeout(function(){ tick('login-fetch'); }, ms); }); }
            }).catch(function(){});
          }catch(_){ }
          return res;
        });
      }
      return p;
    };
  }
  window.__ceV95CleanAwaitingEvent = function(){ clearPicked(); LOGIN_CLEAN_UNTIL=Date.now()+5000; tick('manual'); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', function(){ tick('dom'); }, {once:true}); else tick('load');
  window.addEventListener('controlevent:runtime-ready', function(){ tick('runtime'); }, false);
  [300,900,1800,3200].forEach(function(ms){ setTimeout(function(){ tick('startup'); }, ms); });
})();
