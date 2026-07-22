// ControlEvent v23_prod · FIX12
// Refuerzos: refresco inmediato de INGRESOS, nombres DOC/TK, vista aérea y personalización Zuzu.
(function(){
  'use strict';
  if(window.__CE_V19_FIX12_APPLIED__) return;
  window.__CE_V19_FIX12_APPLIED__ = true;
  function text(v){ return v == null ? '' : String(v); }
  function trim(v){ return text(v).trim(); }
  function arr(v){ return Array.isArray(v) ? v : []; }
  function $(id){ return document.getElementById(id); }
  function state(){ return window.state || window.ControlEventState || window.AppState || {}; }
  function setStateObject(st){
    try{ if(window.state && st && typeof st === 'object') Object.assign(window.state, st); }catch(_){ }
    try{ if(window.ControlEventState && st && typeof st === 'object') Object.assign(window.ControlEventState, st); }catch(_){ }
    try{ if(window.AppState && st && typeof st === 'object') Object.assign(window.AppState, st); }catch(_){ }
  }
  function selectedEventId(){
    var st=state();
    return trim(window.selectedEventId || st.selectedEventId || st.eventoActivoId || (($('selectedEvent')||{}).value) || (window.getSelectedEventId && window.getSelectedEventId()) || '');
  }
  function currentEvent(){
    var st=state(), id=selectedEventId();
    var ev=arr(st.eventos || window.eventos || window.CE_EVENTOS).find(function(e){ return trim(e && e.id)===id; });
    if(window.selectedEvent && typeof window.selectedEvent==='function'){ try{ ev=window.selectedEvent() || ev; }catch(_){ } }
    return ev || {};
  }
  function eventTitle(){ var ev=currentEvent(); var el=document.querySelector('.event-title,.ce-event-title,#currentEventTitle'); return trim(ev.titulo || ev.Titulo || ev.Evento || ev.nombre || ev.title || (el && el.textContent) || 'Evento'); }
  function safePart(v, fallback, max){
    var s=trim(v || fallback || 'sin_dato');
    try{ s=s.normalize('NFKD').replace(/[\u0300-\u036f]/g,''); }catch(_){ }
    s=s.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,'_').replace(/_+/g,'_').replace(/^_+|_+$/g,'');
    return (s || trim(fallback) || 'sin_dato').slice(0, max || 90);
  }
  function formatDocDate(value){
    var v=trim(value), m=v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/); if(m){ var y=m[3]; if(y.length===2) y='20'+y; return ('0'+m[1]).slice(-2)+'-'+('0'+m[2]).slice(-2)+'-'+y; }
    m=v.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/); if(m) return ('0'+m[3]).slice(-2)+'-'+('0'+m[2]).slice(-2)+'-'+m[1];
    return 'DD-MM-AAAA';
  }
  function short20(v){ var s=trim(v || 'texto'); return s.length>20 ? s.slice(0,20).trim() : s; }
  function people(){ return arr(state().personas || window.personas); }
  function stores(){ return arr(state().tiendas || window.tiendas); }
  function byId(list,id){ return arr(list).find(function(x){ return trim(x && x.id)===trim(id); }) || {}; }
  function personNameById(id){ var p=byId(people(), id); return trim(p.nombre || p.Nombre || p.persona || p.name); }
  function storeNameById(id){ var t=byId(stores(), id); return trim(t.nombre || t.Nombre || t.tienda || t.name); }
  function ticketCode(value){ var m=trim(value).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i); return m ? m[0].toUpperCase().replace(/\s+/g,'') : ''; }
  function rowTicket(row){ return ticketCode(row && (row.ticketDonacion || row.tk || row.ticket || row.ticketTipo || row.ticketOtrosGastos || row.ticket_otros_gastos || row['Ticket u otros gastos'] || row.TKxx || '')); }
  function guessTicketName(ctxEl, oldName){
    var st=state(), evId=selectedEventId(), rows=arr(st.compras || window.compras);
    var raw=trim((ctxEl && ctxEl.textContent) || '')+' '+trim(oldName || '')+' '+trim(($('ceAiTicket')||{}).value || '');
    var tk=ticketCode(raw);
    var row=(tk && rows.find(function(r){ return rowTicket(r)===tk; })) || rows.filter(function(r){ return !evId || trim(r.eventId || r.eventoId)===evId; }).slice(-1)[0] || {};
    tk=tk || rowTicket(row) || 'TKxx';
    var tienda=trim((function(){ var sel=$('ceAiTienda'); if(sel && sel.options && sel.selectedIndex>=0) return sel.options[sel.selectedIndex].text; return ''; })()) || storeNameById(row.tiendaId) || trim(row.tienda || row.Tienda || 'Tienda');
    return tk+'-'+safePart(eventTitle(),'Evento',70)+'-'+safePart(tienda,'Tienda',45)+'.jpg';
  }
  function guessDocName(ctxEl){
    var t=trim(ctxEl && ctxEl.textContent);
    var date=(t.match(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/)||[])[0] || '';
    var desc=t.replace(/\b\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}\b/g,' ')
      .replace(/\b(ver|descargar|documento|adjuntar|eliminar|cerrar|abrir|foto|imagen|doc\d*)\b/ig,' ')
      .replace(/\s+/g,' ').trim();
    return 'DOC-'+safePart(formatDocDate(date),'DD-MM-AAAA',10)+'-'+safePart(eventTitle(),'Evento',80)+'-'+safePart(short20(desc),'texto',24)+'.jpg';
  }
  function classifyDownload(el, oldName){
    var node=el && el.closest && el.closest('button,a,[role="button"],img,.card,.itemcard,.rowline,.modal,.dialog,#ceAiTicketPanel,#eventDocsList');
    var label=trim((el && (el.getAttribute && (el.getAttribute('title')||el.getAttribute('aria-label')) || ''))+' '+(node && node.textContent || '')+' '+(el && el.className || '')+' '+oldName);
    if(/documento|\bdoc\d*\b|eventdocs|ce-v105-doc-download/i.test(label)) return { type:'DOC', node:node || el };
    if(/ticket|\btk\s*\d+|fototicket|ticketfoto|ceAiTicket/i.test(label)) return { type:'TK', node:node || el };
    return null;
  }
  window.__ceFix12DownloadContext = null;
  document.addEventListener('pointerdown', function(ev){ var c=classifyDownload(ev.target,''); if(c) window.__ceFix12DownloadContext=c; }, true);
  document.addEventListener('click', function(ev){ var c=classifyDownload(ev.target,''); if(c) window.__ceFix12DownloadContext=c; }, true);
  try{
    var proto=HTMLAnchorElement.prototype;
    var oldClick=proto.click;
    if(oldClick && !oldClick.__ceFix12Wrapped){
      var wrapped=function(){
        try{
          var c=window.__ceFix12DownloadContext || classifyDownload(this, this.download || this.href || '');
          if(c && this.download){
            if(c.type==='DOC') this.download=guessDocName(c.node || document.body);
            if(c.type==='TK') this.download=guessTicketName(c.node || document.body, this.download || this.href || '');
          }
        }catch(_){ }
        return oldClick.apply(this, arguments);
      };
      wrapped.__ceFix12Wrapped=true;
      proto.click=wrapped;
    }
  }catch(_){ }

  function installCss(){
    if(document.getElementById('ce-v19-fix12-style')) return;
    var css=''
      +'.ce-fix12-recent-collab{background:#fff7ed!important;border-color:#fb923c!important;box-shadow:0 0 0 3px rgba(249,115,22,.28),0 8px 24px rgba(15,23,42,.10)!important;transition:box-shadow .25s ease,background .25s ease!important;}'
      +'#ceMapaGlobalOverlay .ce-v19-products-head.compact,#ceMapaGlobalOverlay .ce-v19-product-line.compact{grid-template-columns:minmax(150px,1.20fr) minmax(116px,.72fr) minmax(78px,.54fr) minmax(94px,.68fr) minmax(100px,.72fr) minmax(94px,.68fr) minmax(112px,.78fr) minmax(72px,.52fr) minmax(94px,.66fr) minmax(68px,.48fr)!important;min-width:1045px!important;}'
      +'#ceMapaGlobalOverlay .ce-v19-products-head.compact{font-size:11.8px!important;}'
      +'#ceMapaGlobalOverlay .ce-v19-product-line.compact{font-size:10.6px!important;line-height:1.08!important;}'
      +'#ceMapaGlobalOverlay .ce-v19-products-head.compact>*:nth-child(2),#ceMapaGlobalOverlay .ce-v19-product-line.compact>*:nth-child(2){transform:translateX(6ch)!important;width:calc(100% - 6ch)!important;}'
      +'#ceMapaGlobalOverlay .ce-v19-metric{filter:saturate(1.08)!important;}'
      +'@media(max-width:720px){#ceMapaGlobalOverlay .ce-v19-product-line.compact{font-size:11px!important;min-width:0!important;transform:none!important;}#ceMapaGlobalOverlay .ce-v19-product-line.compact>*{transform:none!important;width:auto!important;}}';
    var st=document.createElement('style'); st.id='ce-v19-fix12-style'; st.textContent=css; document.head.appendChild(st);
  }
  installCss();

  function getInputValue(scope, names){
    for(var i=0;i<names.length;i++){
      var sel='[name="'+names[i]+'"],#'+names[i]+',[data-field="'+names[i]+'"]';
      var el=(scope && scope.querySelector && scope.querySelector(sel)) || document.querySelector(sel);
      if(el) return trim(el.value != null ? el.value : el.textContent);
    }
    return '';
  }
  function rowFromButton(btn){
    var id=trim(btn && (btn.getAttribute('data-id') || (btn.dataset && btn.dataset.id))); if(!id) return null;
    var st=state(); var rows=arr(st.colaboradores || st.ingresos || window.colaboradores); var old=rows.find(function(r){ return trim(r.id)===id; }) || { id:id };
    var scope=btn.closest && (btn.closest('.rowline,.itemcard,.card,tr,.modal,.dialog,.ce-v5011-pending-row') || btn.parentElement);
    var row=Object.assign({}, old);
    var evId=selectedEventId(); if(evId) row.eventId=row.eventId || evId;
    var fields={ personaId:['edit-collab-persona-'+id,'edit-collab-persona','personaId','persona','colaborador','collabPersona'], numero:['edit-collab-numero-'+id,'edit-collab-numero','numero','Numero','cantidad'], importe:['edit-collab-importe-'+id,'edit-collab-importe','importe','importeVoluntario','voluntario','importe_voluntario'], situacion:['edit-collab-situacion-'+id,'edit-collab-situacion','situacion','formaPago','ingreso'], rango:['rango','Rango'] };
    Object.keys(fields).forEach(function(k){ var v=getInputValue(scope, fields[k]); if(v!=='') row[k]=v; });
    return row;
  }
  function mergePendingInto(data){
    var pending=window.__ceFix12PendingCollabSave || window.__ceFix11PendingCollabSave;
    if(!pending || !pending.row || Date.now()>(pending.until||0)) return data;
    var d=data && typeof data==='object' ? data : {};
    var keys=['colaboradores','ingresos'];
    keys.forEach(function(k){
      if(Array.isArray(d[k])){
        var found=false;
        d[k]=d[k].map(function(r){ if(trim(r && r.id)===trim(pending.row.id)){ found=true; return Object.assign({}, r, pending.row); } return r; });
        if(!found && k==='colaboradores') d[k].push(pending.row);
      }
    });
    return d;
  }
  function highlightCollab(id){
    if(!id) return;
    var candidates=[].slice.call(document.querySelectorAll('[data-id="'+String(id).replace(/"/g,'\\"')+'"],button[data-action="save-collab"][data-id="'+String(id).replace(/"/g,'\\"')+'"]'));
    candidates.forEach(function(el){ var card=el.closest && (el.closest('.rowline,.itemcard,.card,tr,.ce-v5011-pending-row') || el); if(card){ card.classList.add('ce-fix12-recent-collab'); setTimeout(function(){ try{card.classList.remove('ce-fix12-recent-collab');}catch(_){ } }, 6500); } });
  }
  function rememberPending(btn){
    var row=rowFromButton(btn); if(!row || !row.id) return;
    var pending={ row:row, until:Date.now()+25000 };
    window.__ceFix12PendingCollabSave=pending;
    window.__ceFix11PendingCollabSave=pending;
    try{
      var st=state(); if(Array.isArray(st.colaboradores)){
        var found=false; st.colaboradores=st.colaboradores.map(function(r){ if(trim(r.id)===trim(row.id)){ found=true; return Object.assign({}, r, row); } return r; }); if(!found) st.colaboradores.push(row);
        setStateObject(st);
      }
    }catch(_){ }
    [40,150,350,750,1400,2600,4200].forEach(function(ms){ setTimeout(function(){ highlightCollab(row.id); try{ if(typeof window.renderNow==='function') window.renderNow(); }catch(_){ } }, ms); });
  }
  /* FIX15: se desactiva el optimismo antiguo de INGRESOS porque repintaba datos stale y provocaba temblor. */

  if(false && window.fetch && !window.fetch.__ceFix12Wrapped){
    var oldFetch=window.fetch;
    var wrappedFetch=function(input, init){
      var url=typeof input==='string' ? input : (input && input.url) || '';
      return oldFetch.call(this, input, init).then(function(resp){
        try{
          if(/\/api\/state(?:\?|$)/i.test(url) && (!init || !init.method || /^GET$/i.test(init.method))){
            var pending=window.__ceFix12PendingCollabSave || window.__ceFix11PendingCollabSave;
            if(pending && pending.row && Date.now()<(pending.until||0)){
              return resp.clone().json().then(function(data){
                data=mergePendingInto(data);
                try{ setStateObject(data); }catch(_){ }
                var headers=new Headers(resp.headers); if(!headers.has('content-type')) headers.set('content-type','application/json;charset=utf-8');
                return new Response(JSON.stringify(data), { status:resp.status, statusText:resp.statusText, headers:headers });
              }).catch(function(){ return resp; });
            }
          }
        }catch(_){ }
        return resp;
      });
    };
    wrappedFetch.__ceFix12Wrapped=true;
    window.fetch=wrappedFetch;
  }
})();
