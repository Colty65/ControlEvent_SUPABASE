/* ControlEvent v11_3_3_prod - HOTFIX mínimo: Ticket Auto no debe abrirse solo.
   Motivo: tras v11.1 algunos arranques dejaban visible Alta asistida de COMPRAS antes de elegir evento.
   Este parche no cambia versión ni funcionalidad; solo cierra el panel si no procede. */
(function(){
  'use strict';
  if(window.__ceV110TicketAutoNoAutopenHotfix) return;
  window.__ceV110TicketAutoNoAutopenHotfix = true;

  function $(id){ return document.getElementById(id); }
  function txt(v){ return v==null ? '' : String(v); }
  function trim(v){ return txt(v).trim(); }
  function stateObj(){ try{ return (typeof state!=='undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function selectedEventId(){
    var s = stateObj();
    var v = trim(s.selectedEventId || (($('selectedEvent')||{}).value) || '');
    if(!v || /selecciona/i.test(v)) return '';
    return v;
  }
  function eventExists(){
    var id = selectedEventId();
    if(!id) return false;
    var s = stateObj();
    var evs = Array.isArray(s.eventos) ? s.eventos : [];
    if(!evs.length) return true; // si aún no está hidratado el catálogo, no cerramos por este motivo.
    return evs.some(function(e){ return trim(e && e.id) === id; });
  }
  function authVisible(){
    var a = $('authOverlay');
    if(!a) return false;
    if(a.classList && a.classList.contains('hidden')) return false;
    var cs = null;
    try{ cs = getComputedStyle(a); }catch(_){ }
    if(cs && (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) === 0)) return false;
    return true;
  }
  function tabComprasVisible(){
    var t = $('tabCompras');
    if(!t) return false;
    var cs = null;
    try{ cs = getComputedStyle(t); }catch(_){ }
    if(cs && (cs.display === 'none' || cs.visibility === 'hidden')) return false;
    // En esta app las pestañas ocultas pueden estar sin offset; si hay una clase activa en otra, lo tratamos como no visible.
    var active = document.querySelector('.tab-panel.active,.tab.active,[data-tab-panel].active,.view.active');
    if(active && active.id && active.id !== 'tabCompras') return false;
    return true;
  }
  function closeTicketAutoPanel(reason){
    var p = $('ceAiTicketPanel');
    if(p){
      try{ p.classList.remove('open'); }catch(_){ }
      try{ p.style.display = ''; }catch(_){ }
    }
    try{ document.body.classList.remove('ce-ai-panel-open'); }catch(_){ }
    if(reason){ try{ console.info('[CE v11.1 hotfix Ticket Auto]', reason); }catch(_){ } }
  }
  function shouldTicketAutoBeClosed(){
    if(authVisible()) return 'login activo: cerrar Ticket Auto';
    if(!eventExists()) return 'sin evento seleccionado: cerrar Ticket Auto';
    if(!tabComprasVisible()) return 'fuera de COMPRAS: cerrar Ticket Auto';
    return '';
  }
  function guardNow(){
    var p = $('ceAiTicketPanel');
    if(!p || !(p.classList && p.classList.contains('open'))) return;
    var reason = shouldTicketAutoBeClosed();
    if(reason) closeTicketAutoPanel(reason);
  }
  function wrapOpeners(){
    ['__ceOpenTicketAutoV1042','__ceOpenTicketAutoV104','__ceOpenTicketAutoV103','__ceOpenTicketAutoV101','__ceOpenTicketAutoV96','__ceOpenTicketAutoV952','__ceOpenTicketAutoV95','__ceOpenTicketAutoV94','__ceOpenTicketAutoV93','__ceOpenTicketAutoV92','__ceOpenTicketAutoV91','__ceOpenTicketIaComprasV90'].forEach(function(name){
      var fn = window[name];
      if(typeof fn !== 'function' || fn.__ceNoAutopenWrapped) return;
      var wrapped = function(){
        var reason = shouldTicketAutoBeClosed();
        if(reason){
          closeTicketAutoPanel(reason);
          if(!authVisible() && !eventExists()) alert('Selecciona primero un evento.');
          return false;
        }
        return fn.apply(this, arguments);
      };
      wrapped.__ceNoAutopenWrapped = true;
      wrapped.__ceOriginal = fn;
      window[name] = wrapped;
    });
  }
  function installStyle(){
    if($('ceV110NoAutoTicketStyle')) return;
    var st = document.createElement('style');
    st.id = 'ceV110NoAutoTicketStyle';
    st.textContent = 'body.ce-v110-no-event #ceAiTicketPanel.open, body.ce-v110-auth-visible #ceAiTicketPanel.open{display:none!important;pointer-events:none!important;visibility:hidden!important;}';
    document.head.appendChild(st);
  }
  function syncBodyFlags(){
    try{ document.body.classList.toggle('ce-v110-auth-visible', authVisible()); }catch(_){ }
    try{ document.body.classList.toggle('ce-v110-no-event', !eventExists()); }catch(_){ }
  }
  function tick(){ installStyle(); syncBodyFlags(); wrapOpeners(); guardNow(); }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-ready','controlevent:event-loaded'].forEach(function(e){
    window.addEventListener(e,function(){ setTimeout(tick,30); setTimeout(tick,300); }, false);
  });
  document.addEventListener('change',function(ev){ if(ev.target && ev.target.id === 'selectedEvent') setTimeout(tick,40); }, true);
  document.addEventListener('click',function(ev){
    if(ev.target && ev.target.closest && ev.target.closest('#btnLogin,#btnLogout,#btnSalir,[data-action="logout"]')){
      setTimeout(tick,80); setTimeout(tick,500);
    }
  }, true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',tick,{once:true}); else tick();
  setTimeout(tick,250);
  setTimeout(tick,1000);
})();
