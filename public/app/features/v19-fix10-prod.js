// ControlEvent v23_prod_r2 · FIX11 + descarga reforzada FIX12
// Ajustes: usuario ce_acceso en sesión, casa estándar Vista aérea, nombres de descarga y blindajes ligeros.
(function(){
  'use strict';
  if (window.__CE_V19_FIX11_APPLIED__) return;
  window.__CE_V19_FIX11_APPLIED__ = true;
  window.__CE_V19_FIX10_APPLIED__ = true;
  var STORAGE_USER = 'ControlEvent_v23_prod_r2_login_user';
  var STORAGE_ACCESS = 'ControlEvent_ce_acceso_usuario';
  function trim(v){ return String(v == null ? '' : v).trim(); }
  function arr(v){ return Array.isArray(v) ? v : []; }
  function pick(obj, keys){ for(var i=0;i<keys.length;i++){ var k=keys[i]; if(obj && obj[k] != null && trim(obj[k])) return obj[k]; } return ''; }
  function normalizeUser(user){
    if(!user || typeof user !== 'object') return null;
    var identificacion = trim(pick(user, ['Identificacion','identificacion','IDENTIFICACION','usuario','user']));
    var nombre = trim(pick(user, ['Nombre','nombre','NOMBRE','name']));
    var nivel = trim(pick(user, ['Nivel','nivel','NIVEL','rol','Rol']));
    if(!identificacion && !nombre) return null;
    return { identificacion:identificacion, nombre:nombre, nivel:nivel, Identificacion:identificacion, Nombre:nombre, Nivel:nivel, ce_acceso:{ Identificacion:identificacion, Nombre:nombre, Nivel:nivel } };
  }
  function storeUser(user){
    var u = normalizeUser(user); if(!u) return null;
    try{ sessionStorage.setItem(STORAGE_USER, JSON.stringify(u)); sessionStorage.setItem(STORAGE_ACCESS, JSON.stringify(u.ce_acceso)); }catch(_){ }
    try{ localStorage.setItem(STORAGE_USER, JSON.stringify(u)); localStorage.setItem(STORAGE_ACCESS, JSON.stringify(u.ce_acceso)); }catch(_){ }
    window.ControlEventLoginUser = u;
    window.__CONTROL_EVENT_LOGIN_USER__ = u;
    window.__CONTROL_EVENT_CE_ACCESO__ = u.ce_acceso;
    if(window.ControlEventApp && typeof window.ControlEventApp === 'object'){
      window.ControlEventApp.authUser = Object.assign({}, window.ControlEventApp.authUser || {}, u);
      window.ControlEventApp.ceAccesoUsuario = u.ce_acceso;
    }
    return u;
  }
  function readUser(){
    var keys=[STORAGE_USER, STORAGE_ACCESS, 'ControlEvent_auth_user_v509'];
    for(var i=0;i<keys.length;i++){
      try{ var raw = sessionStorage.getItem(keys[i]) || localStorage.getItem(keys[i]); if(raw){ var u=normalizeUser(JSON.parse(raw)); if(u) return u; } }catch(_){ }
    }
    return normalizeUser(window.authUser) || normalizeUser(window.__CONTROL_EVENT_USER__) || normalizeUser(window.ControlEventApp && window.ControlEventApp.authUser);
  }
  function clearUser(){
    [STORAGE_USER, STORAGE_ACCESS].forEach(function(k){ try{ sessionStorage.removeItem(k); localStorage.removeItem(k); }catch(_){ } });
    try{ delete window.ControlEventLoginUser; delete window.__CONTROL_EVENT_LOGIN_USER__; delete window.__CONTROL_EVENT_CE_ACCESO__; }catch(_){ }
  }
  try{
    var currentAuth = window.authUser;
    Object.defineProperty(window, 'authUser', {
      configurable:true,
      get:function(){ return currentAuth; },
      set:function(v){ currentAuth = v; var u=storeUser(v); if(u) currentAuth = Object.assign({}, v || {}, u); }
    });
    if(currentAuth) window.authUser = currentAuth;
  }catch(_){ }
  function injectUserInBody(input){
    try{
      if(typeof input === 'string' && input.trim().charAt(0)==='{'){
        var json = JSON.parse(input);
        var u = readUser();
        if(u && !json.usuarioLogado){ json.usuarioLogado = u; json.ce_acceso = u.ce_acceso; return JSON.stringify(json); }
      }
    }catch(_){ }
    return input;
  }
  if(window.fetch && !window.fetch.__ceFix10Wrapped){
    var oldFetch = window.fetch;
    var wrappedFetch = function(input, init){
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var nextInit = init;
      try{
        if(/\/api\/(event-ai|zuzu|planificacion)/i.test(url) && init && init.body){
          nextInit = Object.assign({}, init, { body: injectUserInBody(init.body) });
        }
      }catch(_){ }
      return oldFetch.call(this, input, nextInit).then(function(resp){
        try{
          if(/\/api\/(login|auth\/login)/i.test(url)){
            resp.clone().json().then(function(data){ storeUser((data && (data.user || data.usuario || data.ce_acceso || data)) || null); }).catch(function(){});
          }
          if(/\/api\/(logout|auth\/logout)/i.test(url)) clearUser();
        }catch(_){ }
        return resp;
      });
    };
    wrappedFetch.__ceFix10Wrapped = true;
    window.fetch = wrappedFetch;
  }
  setTimeout(function(){ storeUser(window.authUser || window.__CONTROL_EVENT_USER__ || (window.ControlEventApp && window.ControlEventApp.authUser)); }, 250);

  function state(){ return window.ControlEventState || window.AppState || window.state || {}; }
  function currentEvent(){
    var st=state();
    var id = trim(window.selectedEventId || st.selectedEventId || st.eventoActivoId || (window.getSelectedEventId && window.getSelectedEventId()) || '');
    var eventos = arr(st.eventos || window.eventos || window.CE_EVENTOS);
    var ev = eventos.find(function(e){ return trim(e && e.id) === id; }) || eventos.find(function(e){ return e && (e.activo || e.selected); }) || null;
    if(window.selectedEvent && typeof window.selectedEvent === 'function'){ try{ ev = window.selectedEvent() || ev; }catch(_){ } }
    return ev;
  }
  function eventTitle(){
    var ev=currentEvent() || {};
    var titleEl = document.querySelector('.event-title,.ce-event-title,#currentEventTitle');
    return trim(ev['Titulo del evento'] || ev.titulo || ev.Evento || ev.nombre || ev.title || (titleEl && titleEl.textContent) || 'Evento');
  }
  function safe(v, fallback){
    var s=trim(v || fallback || '');
    return (s || trim(fallback) || 'sin_dato').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'').slice(0,150) || 'sin_dato';
  }
  function personNameById(id){
    var st=state(); var personas=arr(st.personas || window.personas || []); var p=personas.find(function(x){ return trim(x && x.id)===trim(id); });
    return trim(p && (p.nombre || p.Nombre || p.persona || p.name));
  }
  function storeNameById(id){
    var st=state(); var tiendas=arr(st.tiendas || window.tiendas || []); var t=tiendas.find(function(x){ return trim(x && x.id)===trim(id); });
    return trim(t && (t.nombre || t.Nombre || t.tienda || t.name));
  }
  function guessIncome(ctxEl){
    var st=state(), ev=currentEvent(), evId=trim(ev && ev.id), rows=arr(st.colaboradores || window.colaboradores || []);
    var text=trim(ctxEl && ctxEl.textContent);
    var byText = rows.find(function(r){ var n=personNameById(r.personaId) || trim(r.persona || r.colaborador || r.nombre); return n && text && text.indexOf(n) !== -1; });
    var r = byText || rows.filter(function(x){ return !evId || trim(x.eventId || x.eventoId)===evId; }).slice(-1)[0] || {};
    return personNameById(r.personaId) || trim(r.persona || r.colaborador || r.nombre || 'Colaborador');
  }
  function formatDocDate(value){
    var v=trim(value); var m=v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/); if(m){ var y=m[3]; if(y.length===2) y='20'+y; return ('0'+m[1]).slice(-2)+'-'+('0'+m[2]).slice(-2)+'-'+y; }
    m=v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/); if(m){ return ('0'+m[3]).slice(-2)+'-'+('0'+m[2]).slice(-2)+'-'+m[1]; }
    return 'DD-MM-AAAA';
  }
  function shortDocText(value){ var v=trim(value||'texto'); return v.length>20 ? v.slice(0,20).trim() : v; }
  function guessDoc(ctxEl){
    var text=trim(ctxEl && ctxEl.textContent);
    var date = (text.match(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/) || [])[0] || '';
    var docText = text.replace(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/g,' ')
      .replace(/(ver|descargar|documento|adjuntar|eliminar|cerrar|abrir|foto|imagen|doc\d*)/ig,' ')
      .replace(/\s+/g,' ').trim();
    return { fecha: formatDocDate(date), evento: eventTitle(), texto: shortDocText(docText || 'texto') };
  }
  function guessTicket(ctxEl, oldName){
    var st=state(), ev=currentEvent(), evId=trim(ev && ev.id), rows=arr(st.compras || window.compras || []);
    var text=trim((ctxEl && ctxEl.textContent) || '') + ' ' + trim(oldName || '');
    var tk = (text.match(/\bTK\s*\d+\b/i) || [])[0];
    if(tk) tk = tk.toUpperCase().replace(/\s+/g,'');
    var row = (tk && rows.find(function(r){ return trim(r.ticketDonacion || r.tk || r.ticket || r.ticketTipo || r.ticketOtrosGastos || r.ticket_otros_gastos).toUpperCase().replace(/\s+/g,'') === tk; })) || rows.filter(function(x){ return !evId || trim(x.eventId || x.eventoId)===evId; }).slice(-1)[0] || {};
    return { tk: tk || trim(row.ticketDonacion || row.tk || row.ticket || row.ticketTipo || row.ticketOtrosGastos || row.ticket_otros_gastos || 'TKxx').toUpperCase().replace(/\s+/g,''), tienda: storeNameById(row.tiendaId) || trim(row.tienda || row.Tienda || 'Tienda') };
  }
  window.__ceFix10DownloadContext = null;
  function captureDownloadContext(ev){
    var t=ev.target && ev.target.closest && ev.target.closest('button,a,[role="button"],img'); if(!t) return;
    var label=trim((t.getAttribute('title')||'')+' '+(t.getAttribute('aria-label')||'')+' '+t.textContent+' '+(t.className||''));
    if(!/(descargar|download|bajar|foto|justificante|ticket|documento|doc|tk)/i.test(label)) return;
    var ctxEl=t.closest('.rowline,.itemcard,.card,.ce-v19-income-row,.ce-v19-product-line,.ce-v19-image-card,#eventDocsList,#collabList,#ceAiTicketPanel,#ceAiTicket,.modal,.dialog') || t;
    var txt=trim(ctxEl.textContent);
    if(/ingreso|justificante|colaborador/i.test(txt+' '+label)) window.__ceFix10DownloadContext={ type:'ING', evento:eventTitle(), colaborador:guessIncome(ctxEl) };
    else if(/documento|doc\d*/i.test(txt+' '+label)) window.__ceFix10DownloadContext=Object.assign({ type:'DOC' }, guessDoc(ctxEl));
    else if(/ticket|\btk\s*\d+|foto/i.test(txt+' '+label)) window.__ceFix10DownloadContext=Object.assign({ type:'TK', evento:eventTitle() }, guessTicket(ctxEl));
  }
  document.addEventListener('pointerdown', captureDownloadContext, true);
  document.addEventListener('click', captureDownloadContext, true);
  function normalizedDownloadName(old){
    var ctx=window.__ceFix10DownloadContext || {}; var low=trim(old).toLowerCase();
    if(ctx.type==='ING' || /ingreso|justificante/.test(low)) return 'ING-'+safe(ctx.evento || eventTitle(),'Evento')+'-'+safe(ctx.colaborador || guessIncome(document.body),'Colaborador')+'.jpg';
    if(ctx.type==='DOC' || /documento|\bdoc/.test(low)) { var d=ctx.type==='DOC'?Object.assign({evento:eventTitle()}, ctx):guessDoc(document.body); return 'DOC-'+safe(formatDocDate(d.fecha),'DD-MM-AAAA')+'-'+safe(d.evento || eventTitle(),'Evento')+'-'+safe(shortDocText(d.texto || 'texto'),'texto')+'.jpg'; }
    if(ctx.type==='TK' || /ticket|tk\d+|foto_ticket|fototicket|ticketfoto/.test(low)) { var k=ctx.type==='TK'?ctx:guessTicket(document.body, old); return safe(k.tk,'TKxx')+'-'+safe(k.evento || eventTitle(),'Evento')+'-'+safe(k.tienda,'Tienda')+'.jpg'; }
    return old;
  }
  try{
    var click = HTMLAnchorElement.prototype.click;
    if(click && !click.__ceFix10Wrapped){
      var newClick=function(){ try{ if(this.download){ this.download = normalizedDownloadName(this.download); } }catch(_){ } return click.apply(this, arguments); };
      newClick.__ceFix10Wrapped = true;
      HTMLAnchorElement.prototype.click = newClick;
    }
  }catch(_){ }

  function ensureStandardHome(){
    var btn=document.getElementById('ceMapaFloatingHomeButton');
    if(!btn){ btn=document.createElement('button'); btn.type='button'; btn.id='ceMapaFloatingHomeButton'; btn.className='mapa-floating-home'; btn.textContent='⌂'; btn.title='Volver arriba'; btn.setAttribute('aria-label','Volver arriba'); document.body.appendChild(btn); }
    return btn;
  }
  function updateHome(){
    var modal=document.getElementById('ceMapaGlobalOverlay');
    if(modal){ document.body.classList.add('ce-v19-modal-open'); ensureStandardHome(); }
    else document.body.classList.remove('ce-v19-modal-open');
  }
  document.addEventListener('click', function(ev){
    var btn=ev.target && ev.target.closest && ev.target.closest('#ceMapaFloatingHomeButton'); if(!btn) return;
    var modal=document.getElementById('ceMapaGlobalOverlay'); if(!modal) return;
    ev.preventDefault(); ev.stopPropagation();
    var card=modal.querySelector('.ce-v19-global-card') || modal;
    try{ card.scrollTo({ top:0, behavior:'smooth' }); }catch(_){ card.scrollTop=0; }
  }, true);
  var css=document.createElement('style');
  css.textContent='body.ce-v19-modal-open #ceMapaFloatingHomeButton.mapa-floating-home{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:1000006!important;} body.ce-v19-modal-open .ce-v19-home-top{display:none!important;}';
  document.head.appendChild(css);
  try{ new MutationObserver(updateHome).observe(document.body,{childList:true,subtree:false}); }catch(_){ }
  setInterval(updateHome, 700);
  updateHome();
})();
