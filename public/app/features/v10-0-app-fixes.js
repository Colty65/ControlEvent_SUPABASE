/* ControlEvent v11.2_prod - ajustes generales: cabecera, búsquedas en finalizados, resumen rápido, mapa TK y compartir pantalla. */
(function(){
  'use strict';
  if(window.__ceV100AppFixes) return; window.__ceV100AppFixes=true;
  var VERSION='v11.2_prod';
  function text(v){ return v==null?'':String(v); }
  function trim(v){ return text(v).trim(); }
  function $(id){ return document.getElementById(id); }
  function safe(fn){ try{return fn();}catch(_){return undefined;} }
  function stateObj(){ return safe(function(){return (typeof state!=='undefined'&&state)||window.state||{};}) || window.state || {}; }
  function arr(name){ var s=stateObj(); return Array.isArray(s[name]) ? s[name] : []; }
  function esc(v){ return text(v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];}); }
  function selectedEventId(){ var s=stateObj(); return trim(s.selectedEventId || (($('selectedEvent')||{}).value||'')); }
  function fold(v){ return text(v).normalize ? text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase() : text(v).toUpperCase(); }
  function injectStyle(){
    if($('ceV100Style')) return;
    var st=document.createElement('style'); st.id='ceV100Style';
    st.textContent='\n.appname-stack .ce-v100-brand-mini{display:inline-flex!important;align-items:center!important;gap:6px!important;font-weight:900!important;white-space:nowrap!important}.ce-v100-brand-mini img{height:28px!important;width:28px!important;object-fit:contain!important;border-radius:6px!important}.ce-v100-brand-mini span{font-size:13px!important;font-weight:900!important}\n@media(max-width:700px){.appname-stack .ce-v100-brand-mini img{height:22px!important;width:22px!important}.appname-stack .ce-v100-brand-mini span{font-size:10px!important}.brand-user strong{max-width:190px!important}}\n#ceShareScreenBtn{font-size:16px!important;width:32px!important;height:30px!important;min-width:32px!important;min-height:30px!important;padding:2px!important;border-radius:9px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}\n#ceShareScreenPanel{position:fixed!important;inset:0!important;z-index:10000020!important;background:rgba(15,23,42,.72)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important}#ceShareScreenPanel .box{background:#fff!important;border:2px solid #0ea5e9!important;border-radius:16px!important;max-width:640px!important;width:96vw!important;padding:16px!important;box-shadow:0 24px 80px rgba(0,0,0,.35)!important}#ceShareScreenPanel .head{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:10px!important;margin-bottom:10px!important;font-weight:900!important;color:#075985!important}#ceShareScreenPanel .actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important;margin-top:12px!important}#ceShareScreenPanel video{width:100%!important;max-height:260px!important;border-radius:12px!important;border:1px solid #cbd5e1!important;background:#0f172a!important;margin-top:10px!important}\nbody.ce-finalizado-consulta #comprasSearchInput,body.ce-finalizado-consulta #donacionesSearchInput,body.ce-v235-finalizado #comprasSearchInput,body.ce-v235-finalizado #donacionesSearchInput,body.ce-v233-final-consulta #comprasSearchInput,body.ce-v233-final-consulta #donacionesSearchInput,#comprasSearchInput,#donacionesSearchInput{pointer-events:auto!important;opacity:1!important;filter:none!important;background:#fff!important;user-select:text!important}\n#comprasSearchInputBtn,#donacionesSearchInputBtn{pointer-events:auto!important;opacity:1!important;filter:none!important}\n#ceBudgetLiteTooltipV307 .date,#ceBudgetLiteTooltipV307 .fecha,#ceBudgetLiteTooltipV307 [class*=fecha],#ceBudgetLiteTooltipV307 [class*=date],#ceBudgetLiteTooltipV307 time,#ceBudgetLiteTooltipV307 small{display:none!important}\n#ceBudgetLiteTooltipV307 img.ticket-thumb{display:block!important;max-width:min(86vw,420px)!important;max-height:220px!important;object-fit:contain!important;margin:4px auto!important;cursor:zoom-in!important}\n#tabGraficas .ce-ticket-download-v95,#tabCompras .ce-ticket-download-v95,#tabDonaciones .ce-ticket-download-v95,#tabMapaProductos .ce-ticket-download-v95,#ceBudgetLiteTooltipV307 .ce-ticket-download-v95,#ceAiTicketPanel .ce-ticket-download-v95{display:none!important}\n@media(max-width:1024px){#mapaResponsablesFilterV309 .mapa-filter-body,#mapaResponsablesFilterV309 .mapa-filter-options,#mapaResponsablesFilter .mapa-filter-panel,.mapa-filter-panel,.mapa-filter-options{gap:3px!important}.mapa-filter-option{font-size:10px!important;padding:2px 4px!important;line-height:1.05!important;border-radius:7px!important}.mapa-filter-option input{width:13px!important;height:13px!important;min-width:13px!important;min-height:13px!important;margin-right:3px!important}.mapa-filter-toggle{font-size:11px!important;padding:4px 7px!important}}\n.ce-v100-tk-click{cursor:pointer!important;text-decoration:underline!important;text-underline-offset:2px!important;font-weight:900!important}\n#ceV100TicketDetail{position:fixed!important;inset:0!important;z-index:10000010!important;background:rgba(15,23,42,.72)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:10px!important}#ceV100TicketDetail .box{background:#fff!important;border-radius:14px!important;max-width:1320px!important;width:98vw!important;max-height:94vh!important;overflow:auto!important;padding:12px!important;border:2px solid #fb923c!important}#ceV100TicketDetail .head{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:8px!important;margin-bottom:10px!important;font-weight:900!important;color:#7c2d12!important}#ceV100TicketDetail .grid{display:grid!important;grid-template-columns:minmax(260px,34%) 1fr!important;gap:12px!important}#ceV100TicketDetail table{width:100%!important;border-collapse:collapse!important;font-size:12px!important}#ceV100TicketDetail th,#ceV100TicketDetail td{border-bottom:1px solid #e2e8f0!important;padding:5px!important;text-align:left!important}#ceV100TicketDetail img{width:100%!important;max-height:76vh!important;object-fit:contain!important;background:#fff!important;border:1px solid #e2e8f0!important;border-radius:10px!important}@media(max-width:760px){#ceV100TicketDetail .grid{grid-template-columns:1fr!important}#ceV100TicketDetail img{max-height:52vh!important}}\n';
    document.head.appendChild(st);
  }
  function compactHeader(){
    var stack=document.querySelector('.appname-stack'); if(!stack) return;
    var first=stack.querySelector(':scope > span,.ce-v96-brand-mini,.ce-v100-brand-mini'); if(!first) return;
    first.className='ce-v100-brand-mini';
    first.innerHTML='<img src="./assets/icons/controlevent-welcome-v44.png" alt="CE"><span>'+VERSION+'</span>';
    document.title='ControlEvent '+VERSION;
  }
  function ensureShareButton(){
    var stack=document.querySelector('.appname-stack'); if(!stack || $('ceShareScreenBtn')) return;
    var actions=stack.querySelector('.user-actions') || stack;
    var btn=document.createElement('button'); btn.type='button'; btn.id='ceShareScreenBtn'; btn.className='outline small'; btn.title='Compartir/proyectar pantalla'; btn.setAttribute('aria-label','Compartir/proyectar pantalla'); btn.textContent='📺';
    btn.addEventListener('click',function(ev){ ev.preventDefault(); ev.stopPropagation(); openSharePanel(); });
    actions.insertBefore(btn, actions.firstChild || null);
  }
  function openSharePanel(){
    var old=$('ceShareScreenPanel'); if(old) old.remove();
    var html='<div id="ceShareScreenPanel"><div class="box"><div class="head"><div>📺 Compartir / proyectar pantalla</div><button type="button" class="outline small" data-ce-share-close>Cerrar</button></div>'+ 
      '<div>Para llevar esta misma app a un televisor o proyector de tu red, usa la función de proyección del dispositivo/navegador. Desde aquí puedes activar pantalla completa y, si el navegador lo permite, abrir el selector nativo de compartir pantalla.</div>'+ 
      '<div class="actions"><button type="button" class="modify small" data-ce-share-full>⛶ Pantalla completa</button><button type="button" class="outline small" data-ce-share-capture>🖥️ Abrir selector de compartir</button><button type="button" class="outline small" data-ce-share-url>🔗 Copiar URL de esta pantalla</button></div>'+ 
      '<video id="ceSharePreview" autoplay muted playsinline style="display:none"></video></div></div>';
    document.body.insertAdjacentHTML('beforeend',html);
  }
  function selectedTextFromSelect(sel){ try{ return sel.options[sel.selectedIndex]?.textContent || sel.value || ''; }catch(_){ return sel?.value || ''; } }
  function rowText(card){
    var parts=[card.textContent||''];
    safe(function(){ card.querySelectorAll('select').forEach(function(s){ parts.push(selectedTextFromSelect(s),s.value); }); });
    safe(function(){ card.querySelectorAll('input,textarea').forEach(function(i){ parts.push(i.value); }); });
    return fold(parts.join(' '));
  }
  function runSearch(listId,inputId){
    var list=$(listId), input=$(inputId); if(!list||!input) return false;
    var q=fold(input.value||'').split(/\s+/).filter(Boolean); if(!q.length) return false;
    var cards=Array.prototype.slice.call(list.querySelectorAll(':scope > .itemcard, :scope .itemcard')).filter(function(c){ return !c.closest('.ce-v434-search,.ce-v413-search,.maint-search'); });
    var found=cards.find(function(c){ var h=rowText(c); return q.every(function(t){return h.indexOf(t)>=0;}); });
    if(found){ try{ found.scrollIntoView({behavior:'smooth',block:'center'}); }catch(_){ found.scrollIntoView(); } found.classList.add('ce-search-found','mapa-search-found'); setTimeout(function(){ found.classList.remove('ce-search-found','mapa-search-found'); },1800); return true; }
    try{ alert('No se ha encontrado ningún registro con ese texto.'); }catch(_){}
    return false;
  }
  function enableFinalizedSearch(){
    ['comprasSearchInput','donacionesSearchInput'].forEach(function(id){ var el=$(id); if(el){ el.disabled=false; el.readOnly=false; el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled'); el.classList.add('ce-mapa-readonly-allowed','mobile-menu-action'); el.style.setProperty('pointer-events','auto','important'); el.style.setProperty('opacity','1','important'); }});
    ['comprasSearchInputBtn','donacionesSearchInputBtn'].forEach(function(id){ var btn=$(id); if(btn){ btn.disabled=false; btn.removeAttribute('disabled'); btn.classList.add('ce-mapa-readonly-allowed','mobile-menu-action'); }});
  }
  function handleSearchEvents(ev){
    var btn=ev.target&&ev.target.closest&&ev.target.closest('#comprasSearchInputBtn,#donacionesSearchInputBtn');
    if(btn){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); runSearch(btn.id==='comprasSearchInputBtn'?'comprasList':'donacionesList', btn.id==='comprasSearchInputBtn'?'comprasSearchInput':'donacionesSearchInput'); return false; }
    if(ev.type==='keydown'){
      var inp=ev.target&&ev.target.closest&&ev.target.closest('#comprasSearchInput,#donacionesSearchInput');
      if(inp && ev.key==='Enter'){ ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); runSearch(inp.id==='comprasSearchInput'?'comprasList':'donacionesList', inp.id); return false; }
    }
  }
  function srcOf(v){ if(!v) return ''; if(typeof v==='string') return trim(v); if(typeof v==='object') return trim(v.url||v.public_url||v.publicUrl||v.pathname||v.path||v.dataUrl||v.src||''); return ''; }
  function nameById(arrName,id){ var a=arr(arrName); var x=a.find(function(r){return trim(r.id)===trim(id);}); return x ? (x.nombre||x.titulo||x.id) : ''; }
  function eventRowsForTicket(tk){ var ev=selectedEventId(); var key=fold(tk).replace(/\s+/g,''); return arr('compras').filter(function(c){ return trim(c.eventId||c.event_id)===ev && fold(c.ticketDonacion||c.ticket_donacion||c.ticket).replace(/\s+/g,'')===key; }); }
  function ticketImageUrl(tk){
    var ev=selectedEventId(), raw=trim(tk), up=raw.toUpperCase().replace(/\s+/g,'');
    var keys=[ev+'|'+raw, ev+'|'+up, ev+'|'+raw.toUpperCase(), raw, raw.toUpperCase(), up];
    var s=stateObj(), bags=[s.ticketImages||{}, s.ticketImageRefs||{}];
    for(var b=0;b<bags.length;b++){ for(var i=0;i<keys.length;i++){ var got=srcOf(bags[b][keys[i]]); if(got) return got; } }
    // fallback: busca cualquier clave del evento que termine en el TKxx pedido.
    for(var j=0;j<bags.length;j++){
      var bag=bags[j]||{};
      for(var k in bag){ if(!Object.prototype.hasOwnProperty.call(bag,k)) continue; var kk=fold(k).replace(/\s+/g,''); if(kk.endsWith('|'+up) || kk===up){ var src=srcOf(bag[k]); if(src) return src; } }
    }
    return '';
  }
  function openTicketDetail(tk){
    tk=trim(tk).toUpperCase().replace(/\s+/g,''); if(!/^TK\d+/.test(tk)) return;
    var rows=eventRowsForTicket(tk), img=ticketImageUrl(tk); var total=rows.reduce(function(a,c){ return a+(Number(c.unidades||0)*Number(c.precio||0)); },0);
    var html='<div id="ceV100TicketDetail"><div class="box"><div class="head"><div>Factura '+esc(tk)+' · '+total.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €</div><button type="button" class="outline small" data-ce-v100-close>Cerrar</button></div><div class="grid"><div><table><thead><tr><th>Producto</th><th>Uds.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>'+ (rows.length?rows.map(function(c){ var imp=Number(c.unidades||0)*Number(c.precio||0); return '<tr><td>'+esc(nameById('productos',c.productoId||c.producto_id)||c.productoId||c.producto_id)+'</td><td>'+esc(c.unidades||'')+'</td><td>'+Number(c.precio||0).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td><td>'+imp.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+'</td></tr>'; }).join(''):'<tr><td colspan="4">Sin líneas contables para este ticket.</td></tr>')+'</tbody></table></div><div>'+(img?'<img src="'+esc(img)+'" alt="Foto '+esc(tk)+'">':'<div class="empty">No hay foto adjunta para '+esc(tk)+'</div>')+'</div></div></div></div>';
    var old=$('ceV100TicketDetail')||$('ceV96TicketDetail'); if(old) old.remove(); document.body.insertAdjacentHTML('beforeend',html);
  }
  function markMapaTickets(){
    var root=$('tabMapaProductos')||document;
    root.querySelectorAll('.mapa-group-header span,.mapa-tags .ticket,.ticket.tk').forEach(function(el){ var m=trim(el.textContent).toUpperCase().match(/TK\s*\d+/); if(!m) return; el.classList.add('ce-v100-tk-click'); el.dataset.ceV100Tk=m[0].replace(/\s+/g,''); el.title='Ver detalle y foto de '+el.dataset.ceV100Tk; });
  }
  function handleMapaTicketClick(ev){
    var root=(ev.target&&ev.target.closest&&ev.target.closest('#tabMapaProductos'))||null; if(!root) return;
    var el=ev.target.closest('[data-ce-v100-tk],.mapa-group-header span,.mapa-tags .ticket,.ticket.tk'); if(!el) return;
    var tk=el.dataset.ceV100Tk || ((trim(el.textContent).toUpperCase().match(/TK\s*\d+/)||[])[0]||''); tk=tk.replace(/\s+/g,'');
    if(!/^TK\d+/.test(tk)) return;
    ev.preventDefault(); ev.stopPropagation(); if(ev.stopImmediatePropagation) ev.stopImmediatePropagation(); openTicketDetail(tk); return false;
  }
  function hydrateResumenNow(){
    try{ window.ControlEventV469&&window.ControlEventV469.hydrateEventReceipts&&window.ControlEventV469.hydrateEventReceipts(true); }catch(_){ }
    try{ window.ControlEventV469&&window.ControlEventV469.compactIngresoReceipts&&window.ControlEventV469.compactIngresoReceipts(); }catch(_){ }
    try{ window.ControlEventV469&&window.ControlEventV469.enrichOpenTooltips&&window.ControlEventV469.enrichOpenTooltips(); }catch(_){ }
    try{ window.ControlEventV5026&&window.ControlEventV5026.hydrateTooltips&&window.ControlEventV5026.hydrateTooltips('v10'); }catch(_){ }
    if(window.__ceOpenTicketAutoV100 || window.__ceOpenTicketAutoV96){ try{ document.dispatchEvent(new Event('controlevent:ticket-tools-refresh')); }catch(_){ } }
  }
  function hydrateBurst(){ [0,80,180,360,700].forEach(function(ms){ setTimeout(hydrateResumenNow,ms); }); }
  function handleShareClick(ev){
    var close=ev.target&&ev.target.closest&&ev.target.closest('[data-ce-share-close]'); if(close){ ev.preventDefault(); var p=$('ceShareScreenPanel'); if(p)p.remove(); return; }
    if(ev.target&&ev.target.closest&&ev.target.closest('[data-ce-share-full]')){ ev.preventDefault(); var de=document.documentElement; if(de.requestFullscreen) de.requestFullscreen().catch(function(){}); return; }
    if(ev.target&&ev.target.closest&&ev.target.closest('[data-ce-share-url]')){ ev.preventDefault(); var url=location.href; if(navigator.clipboard) navigator.clipboard.writeText(url).then(function(){ alert('URL copiada. Ábrela en el dispositivo/proyector o compártela por tu sistema.'); }).catch(function(){ prompt('Copia esta URL:',url); }); else prompt('Copia esta URL:',url); return; }
    if(ev.target&&ev.target.closest&&ev.target.closest('[data-ce-share-capture]')){ ev.preventDefault(); if(navigator.mediaDevices&&navigator.mediaDevices.getDisplayMedia){ navigator.mediaDevices.getDisplayMedia({video:true,audio:false}).then(function(stream){ var v=$('ceSharePreview'); if(v){ v.srcObject=stream; v.style.display='block'; } }).catch(function(){}); } else alert('Este navegador no permite abrir el selector de compartir pantalla desde la web. Usa la opción de proyectar/duplicar pantalla del dispositivo.'); return; }
  }
  function tick(){ injectStyle(); compactHeader(); ensureShareButton(); enableFinalizedSearch(); markMapaTickets(); if($('summaryTiendaTicket') && !tick._hydrated){ tick._hydrated=true; hydrateBurst(); setTimeout(function(){tick._hydrated=false;},1200); } }
  window.addEventListener('click', handleSearchEvents, true);
  window.addEventListener('keydown', handleSearchEvents, true);
  window.addEventListener('click', handleMapaTicketClick, true);
  document.addEventListener('click', function(ev){ if(ev.target&&ev.target.closest&&ev.target.closest('[data-ce-v100-close]')){ ev.preventDefault(); var m=$('ceV100TicketDetail'); if(m)m.remove(); } handleShareClick(ev); }, true);
  document.addEventListener('click', function(ev){ if(ev.target&&ev.target.closest&&ev.target.closest('#tabResumenBtn,#summaryTiendaTicket,#tabGraficasBtn')) hydrateBurst(); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-ready'].forEach(function(e){ window.addEventListener(e,function(){ setTimeout(tick,40); hydrateBurst(); }); });
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',tick,{once:true}); else tick();
  setInterval(tick,1200);
  window.ControlEventV100={version:VERSION, openTicketDetail:openTicketDetail, hydrateResumenNow:hydrateResumenNow, runSearch:runSearch};
})();
