/* ControlEvent v15_prod - ajustes generales: cabecera compacta, refresco gráficas, búsqueda finalizados, fotos y mapa. */
(function(){
  'use strict';
  if(window.__ceV96AppFixes) return; window.__ceV96AppFixes=true;
  var VERSION='v15_prod';
  function text(v){ return v==null?'':String(v); }
  function $(id){ return document.getElementById(id); }
  function safe(fn){ try{return fn();}catch(_){return undefined;} }
  function stateObj(){ return safe(function(){return (typeof state!=='undefined'&&state)||window.state||{};}) || window.state || {}; }
  function selectedEventId(){ var s=stateObj(); return text(s.selectedEventId || (($('selectedEvent')||{}).value||'')).trim(); }
  function injectStyle(){
    if($('ceV96Style')) return;
    var st=document.createElement('style'); st.id='ceV96Style';
    st.textContent='\n.appname-stack .ce-v96-brand-mini{display:inline-flex!important;align-items:center!important;gap:6px!important;font-weight:900!important;white-space:nowrap!important}.ce-v96-brand-mini img{height:28px!important;width:28px!important;object-fit:contain!important;border-radius:6px!important}.ce-v96-brand-mini span{font-size:13px!important;font-weight:900!important}\n@media(max-width:700px){.appname-stack .ce-v96-brand-mini img{height:22px!important;width:22px!important}.appname-stack .ce-v96-brand-mini span{font-size:10px!important}.appname-stack>span:not(.ce-v96-brand-mini){font-size:10px!important}.brand-user strong{max-width:170px!important}}\nbody.ce-finalizado-consulta #comprasSearchInput,body.ce-finalizado-consulta #donacionesSearchInput,body.ce-v235-finalizado #comprasSearchInput,body.ce-v235-finalizado #donacionesSearchInput,body.ce-v233-final-consulta #comprasSearchInput,body.ce-v233-final-consulta #donacionesSearchInput{pointer-events:auto!important;opacity:1!important;filter:none!important;background:#fff!important}\n#ceBudgetLiteTooltipV307 .date,#ceBudgetLiteTooltipV307 .fecha,#ceBudgetLiteTooltipV307 [class*=fecha],#ceBudgetLiteTooltipV307 [class*=date],#ceBudgetLiteTooltipV307 time,#ceBudgetLiteTooltipV307 small{display:none!important}\n#ceBudgetLiteTooltipV307 img.ticket-thumb{display:block!important;max-width:min(86vw,420px)!important;max-height:220px!important;object-fit:contain!important;margin:4px auto!important;cursor:zoom-in!important}\n#tabGraficas .ce-ticket-download-v95,#tabCompras .ce-ticket-download-v95,#tabDonaciones .ce-ticket-download-v95,#tabMapa .ce-ticket-download-v95,#ceBudgetLiteTooltipV307 .ce-ticket-download-v95,#ceAiTicketPanel .ce-ticket-download-v95{display:none!important}\n@media(max-width:1024px){#mapaResponsablesFilterV309 .mapa-filter-body,#mapaResponsablesFilterV309 .mapa-filter-options,.mapa-filter-body,.mapa-filter-options{gap:4px!important}.mapa-filter-option{font-size:11px!important;padding:3px 5px!important;line-height:1.1!important;border-radius:7px!important}.mapa-filter-option input{width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;margin-right:3px!important}}\n.ce-v96-tk-click{cursor:pointer!important;text-decoration:underline!important;text-underline-offset:2px!important;font-weight:900!important}\n#ceV96TicketDetail{position:fixed!important;inset:0!important;z-index:10000000!important;background:rgba(15,23,42,.72)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:10px!important}#ceV96TicketDetail .box{background:#fff!important;border-radius:14px!important;max-width:1320px!important;width:98vw!important;max-height:94vh!important;overflow:auto!important;padding:12px!important;border:2px solid #fb923c!important}#ceV96TicketDetail .head{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:8px!important;margin-bottom:10px!important;font-weight:900!important;color:#7c2d12!important}#ceV96TicketDetail .grid{display:grid!important;grid-template-columns:minmax(260px,34%) 1fr!important;gap:12px!important}#ceV96TicketDetail table{width:100%!important;border-collapse:collapse!important;font-size:12px!important}#ceV96TicketDetail th,#ceV96TicketDetail td{border-bottom:1px solid #e2e8f0!important;padding:5px!important;text-align:left!important}#ceV96TicketDetail img{width:100%!important;max-height:76vh!important;object-fit:contain!important;background:#fff!important;border:1px solid #e2e8f0!important;border-radius:10px!important}@media(max-width:760px){#ceV96TicketDetail .grid{grid-template-columns:1fr!important}#ceV96TicketDetail img{max-height:52vh!important}}\n';
    document.head.appendChild(st);
  }
  function compactHeader(){
    var stack=document.querySelector('.appname-stack'); if(!stack) return;
    var first=stack.querySelector(':scope > span'); if(!first) return;
    if(first.classList.contains('ce-v96-brand-mini')){ var tx=first.querySelector('span'); if(tx) tx.textContent=VERSION; return; }
    first.className='ce-v96-brand-mini';
    first.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>';
    document.title='ControlEvent '+VERSION;
  }
  function callRenderGraph(){
    ['renderGraficas'].forEach(function(n){ var f=window[n]; if(typeof f==='function') safe(function(){ f({force:true,reason:'v96-event-refresh'}); }); });
    safe(function(){ window.ControlEventV461&&window.ControlEventV461.renderGraficas&&window.ControlEventV461.renderGraficas({force:true,reason:'v96'}); });
    safe(function(){ window.ControlEventV462&&window.ControlEventV462.renderGraficas&&window.ControlEventV462.renderGraficas({force:true,reason:'v96'}); });
    safe(function(){ window.ControlEventV434&&window.ControlEventV434.renderGraficas&&window.ControlEventV434.renderGraficas({force:true,reason:'v96'}); });
  }
  function scheduleGraphRefresh(){ [160,450,900,1500].forEach(function(ms){ setTimeout(callRenderGraph,ms); }); }
  function wrapChangeEvent(){
    var old=window.changeSelectedEvent;
    if(typeof old==='function' && !old.__ceV96Wrapped){
      var wrapped=function(){ var out=old.apply(this,arguments); Promise.resolve(out).finally(scheduleGraphRefresh); return out; };
      wrapped.__ceV96Wrapped=true; window.changeSelectedEvent=wrapped; safe(function(){ changeSelectedEvent=wrapped; });
    }
    var sel=$('selectedEvent'); if(sel && sel.dataset.ceV96Refresh!=='1'){ sel.dataset.ceV96Refresh='1'; sel.addEventListener('change',scheduleGraphRefresh,true); }
  }
  function enableFinalizedSearch(){
    ['comprasSearchInput','donacionesSearchInput'].forEach(function(id){ var el=$(id); if(el){ el.disabled=false; el.removeAttribute('disabled'); el.removeAttribute('aria-disabled'); el.classList.remove('locked'); el.style.setProperty('pointer-events','auto','important'); el.style.setProperty('opacity','1','important'); }});
  }
  function restrictDownloads(){
    document.querySelectorAll('.ce-ticket-download-v95').forEach(function(btn){
      if(btn.closest('#tabIngresos,#tabResumen,#summaryTiendaTicket')) return;
      btn.remove();
    });
  }
  function eventRowsForTicket(tk){
    var ev=selectedEventId(), s=stateObj();
    return (Array.isArray(s.compras)?s.compras:[]).filter(function(c){ return text(c.eventId)===ev && text(c.ticketDonacion).trim().toUpperCase()===text(tk).trim().toUpperCase(); });
  }
  function nameById(arrName,id){ var s=stateObj(), a=Array.isArray(s[arrName])?s[arrName]:[]; var x=a.find(function(r){return text(r.id)===text(id);}); return x ? (x.nombre||x.titulo||x.id) : ''; }
  function ticketImageUrl(tk){ var s=stateObj(); var im=s.ticketImages||{}; return im[tk]||im[text(tk).toUpperCase()]||im[text(tk).toLowerCase()]||''; }
  function openTicketDetail(tk){
    var rows=eventRowsForTicket(tk); var img=ticketImageUrl(tk); var total=rows.reduce(function(a,c){ return a+(Number(c.unidades||0)*Number(c.precio||0)); },0);
    var html='<div id="ceV96TicketDetail"><div class="box"><div class="head"><div>Factura '+tk+' · '+total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €</div><button type="button" class="outline small" data-ce-v96-close> Cerrar </button></div><div class="grid"><div><table><thead><tr><th>Producto</th><th>Uds.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>'+
      (rows.length?rows.map(function(c){ var imp=Number(c.unidades||0)*Number(c.precio||0); return '<tr><td>'+esc(nameById('productos',c.productoId)||c.productoId)+'</td><td>'+esc(c.unidades||'')+'</td><td>'+Number(c.precio||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td><td>'+imp.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td></tr>'; }).join(''):'<tr><td colspan="4">Sin líneas contables para este ticket.</td></tr>')+
      '</tbody></table></div><div>'+(img?'<img src="'+esc(img)+'" alt="Foto '+esc(tk)+'">':'<div class="empty">No hay foto adjunta para '+esc(tk)+'</div>')+'</div></div></div></div>';
    var old=$('ceV96TicketDetail'); if(old) old.remove(); document.body.insertAdjacentHTML('beforeend',html);
  }
  function esc(v){ return text(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function clickableMapaTk(){
    var root=$('tabMapa')||document;
    root.querySelectorAll('.mapa-group-header span,.mapa-tags .ticket,.ticket.tk').forEach(function(el){
      var tk=text(el.textContent).trim().toUpperCase(); if(!/^TK\d+/.test(tk)) return;
      el.classList.add('ce-v96-tk-click'); el.setAttribute('title','Ver detalle y foto de '+tk); el.dataset.ceV96Tk=tk;
    });
  }
  document.addEventListener('click',function(ev){ var c=ev.target&&ev.target.closest&&ev.target.closest('[data-ce-v96-close]'); if(c){ ev.preventDefault(); var m=$('ceV96TicketDetail'); if(m)m.remove(); return; } var tk=ev.target&&ev.target.closest&&ev.target.closest('[data-ce-v96-tk]'); if(tk){ ev.preventDefault(); ev.stopPropagation(); openTicketDetail(tk.dataset.ceV96Tk); }},true);
  function tick(){ injectStyle(); compactHeader(); wrapChangeEvent(); enableFinalizedSearch(); restrictDownloads(); clickableMapaTk(); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick,{once:true}); else tick();
  window.addEventListener('controlevent:runtime-ready',tick,false);
  window.addEventListener('controlevent:auth-restored-v96',tick,false);
  setInterval(tick,1000);
  console.info('[CE v9.6] Ajustes generales activos');
})();
