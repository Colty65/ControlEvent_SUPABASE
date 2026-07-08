/* ControlEvent v19_prod - FIX13 puntual (cargado realmente desde index):
   1) cerrar globo detalle con X/Escape; 2) evitar miniaturas duplicadas;
   3) visor ticket con detalle a la izquierda y Cerrar abajo derecha;
   4) título del evento en visor: verde En curso, rojo Finalizado.
   No cambia versión visible. */
(function(){
  'use strict';
  if(window.__ceV17Fix12CierreMiniaturasVisor) return;
  window.__ceV17Fix12CierreMiniaturasVisor = true;

  const STYLE_ID='ceV17Fix12CierreMiniaturasVisorStyle';
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=(fn,fb)=>{try{const out=fn();return out===undefined?fb:out;}catch(_){return fb;}};
  const getLexical=name=>safe(()=>Function('return (typeof '+name+'!=="undefined")?'+name+':undefined')(),undefined);
  const stop=ev=>{try{ev?.preventDefault?.();ev?.stopPropagation?.();ev?.stopImmediatePropagation?.();}catch(_){ } return false;};
  const money=v=>{
    const n=Number(v||0);
    const fn=getLexical('money')||window.money;
    if(typeof fn==='function') return safe(()=>fn(n),new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n));
    return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(n);
  };
  function stateObjects(){
    const out=[];
    const add=o=>{ if(o&&typeof o==='object'&&!out.includes(o)) out.push(o); };
    add(getLexical('state'));
    add(window.state);
    add(window.ControlEventApp?.state);
    add(window.ControlEventRuntime?.app?.state);
    add(window.__CONTROL_EVENT_STATE__);
    return out;
  }
  function arr(name){
    for(const s of stateObjects()){
      const v=s?.[name];
      if(Array.isArray(v)) return v;
    }
    return [];
  }
  function eventId(){
    const sid=safe(()=>typeof selectedEvent==='function'?(selectedEvent()||{}).id:'','')||safe(()=>window.selectedEvent?.()?.id,'');
    if(norm(sid)) return norm(sid);
    for(const s of stateObjects()) if(norm(s?.selectedEventId)) return norm(s.selectedEventId);
    return norm($('selectedEvent')?.value||'');
  }
  function currentEvent(){
    const id=eventId();
    for(const s of stateObjects()){
      const ev=(Array.isArray(s?.eventos)?s.eventos:[]).find(x=>String(x?.id||'')===id);
      if(ev) return ev;
    }
    return safe(()=>typeof selectedEvent==='function'?(selectedEvent()||{}):{},{});
  }
  function byId(name,id){
    const sid=String(id??'');
    return arr(name).find(x=>String(x?.id??x?.ID??'')===sid) || {};
  }
  function displayName(obj){return norm(obj?.nombre||obj?.name||obj?.titulo||obj?.descripcion||obj?.label||obj?.id||'');}
  function productName(c){
    return norm(c?.producto?.nombre||c?.product?.nombre||c?.productoNombre||c?.productName||c?.nombreProducto||displayName(byId('productos',c?.productoId??c?.producto_id??c?.productId))||'Producto');
  }
  function storeName(c){
    return norm(c?.tienda?.nombre||c?.store?.nombre||c?.tiendaNombre||c?.storeName||displayName(byId('tiendas',c?.tiendaId??c?.tienda_id??c?.storeId))||'Sin tienda');
  }
  function units(c){return Number(c?.unidades??c?.uds??c?.cantidad??c?.qty??0)||0;}
  function price(c){
    const prod=byId('productos',c?.productoId??c?.producto_id??c?.productId);
    return Number(c?.precio??c?.precioUnitario??c?.price??c?.importeUnitario??c?.producto?.defaultPrecio??c?.producto?.precio??prod?.defaultPrecio??prod?.precio??0)||0;
  }
  function valueLine(c){
    const explicit=c?.importe??c?.total??c?.valor??c?.amount;
    const n=Number(explicit);
    if(Number.isFinite(n)&&n!==0) return n;
    return units(c)*price(c);
  }
  function ticketOf(c){return norm(c?.ticketDonacion??c?.ticket_donacion??c?.ticket??c?.donacion??c?.ticketId??'');}
  function ticketToken(label){const m=norm(label).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);return m?m[0].replace(/\s+/g,'').toUpperCase():'';}
  function cleanLabel(label){
    const ev=eventId();
    let s=norm(label);
    try{s=decodeURIComponent(s);}catch(_){ }
    s=s.split('·')[0].replace(/\s*\|\s*/g,' | ').trim();
    if(ev&&s.startsWith(ev+' | '))s=s.slice(ev.length+3).trim();
    if(ev&&s.startsWith(ev+'|'))s=s.slice(ev.length+1).trim();
    return s.replace(/\s*\|\s*/g,' | ').trim();
  }
  function splitParts(label){return cleanLabel(label).split('|').map(x=>norm(x)).filter(Boolean);}
  function fmtNum(v){return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0));}
  function parseMoneyText(text){
    let s=norm(text).replace(/[^0-9,.-]/g,'');
    if(!s) return 0;
    const lastComma=s.lastIndexOf(','), lastDot=s.lastIndexOf('.');
    if(lastComma!==-1 && lastDot!==-1){
      s=lastComma>lastDot?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
    }else if(lastComma!==-1){
      s=s.replace(/\./g,'').replace(',','.');
    }else{
      const dots=(s.match(/\./g)||[]).length;
      if(dots>1) s=s.replace(/\./g,'');
    }
    const n=Number(s); return Number.isFinite(n)?n:0;
  }
  function parseDomDetail(img){
    const row=img?.closest?.('#summaryTiendaTicket .summary-item,.ce-v17-doc-row');
    const raw=img?.dataset?.ceV17Detail || row?.dataset?.ceV17Detail || '';
    if(!raw) return null;
    try{
      const d=JSON.parse(raw);
      if(!d || typeof d!=='object') return null;
      const headers=Array.isArray(d.headers)?d.headers.map(x=>String(x??'')):[];
      const lines=Array.isArray(d.lines)?d.lines:[];
      if(!headers.length || !lines.length) return null;
      return {
        title:norm(d.title||''),
        label:cleanLabel(d.label||row?.dataset?.ceV17Label||''),
        store:norm(d.store||''),
        ticket:norm(d.ticket||''),
        total:Number(d.total||0),
        headers,
        lines
      };
    }catch(_){ return null; }
  }
  function tableFromDomDetail(detail){
    const headers=detail?.headers||[];
    const lines=Array.isArray(detail?.lines)?detail.lines:[];
    const body=(lines.length?lines:[['Sin detalle']]).map(line=>{
      const cells=Array.isArray(line)?line.map(x=>String(x??'')):String(line??'').split('|').map(x=>norm(x));
      while(cells.length<headers.length) cells.push('');
      return '<tr>'+cells.slice(0,Math.max(headers.length,cells.length)).map(cell=>'<td>'+esc(cell)+'</td>').join('')+'</tr>';
    }).join('');
    return '<table class="ce-v17-ticket-table-dom"><thead><tr>'+headers.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+body+'</tbody></table>';
  }

  function rowEventId(c){ return norm(c?.eventId??c?.event_id??c?.eventoId??c?.evento_id??c?.idEvento??c?.evento??''); }
  function rowBelongsEvent(c){ const ev=eventId(); const rid=rowEventId(c); return !ev || !rid || rid===ev; }
  function rowsForTicketLabel(label){
    const clean=cleanLabel(label);
    const parts=splitParts(clean);
    const tiendaU=up(parts[0]||'');
    const tk=ticketToken(clean);
    if(!tk) return [];
    let rows=arr('compras').filter(c=>rowBelongsEvent(c) && up(ticketOf(c))===tk);
    if(tiendaU){
      const strict=rows.filter(c=>up(storeName(c))===tiendaU);
      if(strict.length) rows=strict;
    }
    return rows;
  }
  function titleEvent(){return norm(currentEvent()?.titulo||currentEvent()?.nombre||$('selectedEvent')?.selectedOptions?.[0]?.textContent||'Evento seleccionado');}
  function eventStatusText(){
    const ev=currentEvent()||{};
    return norm(ev.situacion||ev.estado||ev.status||$('eventStatus')?.textContent||'En curso');
  }
  function eventStatusClass(){
    return /FINALIZADO/.test(up(eventStatusText())) ? 'ce-v17-event-finalizado' : 'ce-v17-event-curso';
  }
  function modalRoots(){
    return '#ceV17TicketViewerFinal,#ceV104TicketDetail,#ceV103TicketDetail,#ceV102TicketDetail,#ceV101TicketDetail,#ceV100TicketDetail,#ceV96TicketDetail,#ceV40TicketPhotoModal,#ceV310PhotoViewer,#ceTicketModalV234,#ceTicketImageModalV225,.ce-v40-modal,.ce-v401-pc-modal';
  }
  let lastThumbForViewer=null;
  let lastThumbAt=0;
  function legacyModalOpen(){ return !!document.querySelector('#ceV104TicketDetail,#ceV103TicketDetail,#ceV102TicketDetail,#ceV101TicketDetail,#ceV100TicketDetail,#ceV96TicketDetail,#ceV40TicketPhotoModal,#ceV310PhotoViewer,#ceTicketModalV234,#ceTicketImageModalV225,.ce-v40-modal,.ce-v401-pc-modal'); }
  function closeTicketViewers(ev){
    if(ev) stop(ev);
    document.querySelectorAll(modalRoots()).forEach(m=>{try{m.remove();}catch(_){try{m.classList.remove('visible');}catch(__){}}});
    return false;
  }
  function openTicketViewerFromThumb(img,ev){
    if(!img) return false;
    const src=norm(img.currentSrc||img.src||img.dataset.ceV17Src||'');
    const row=img.closest('#summaryTiendaTicket .summary-item,.ce-v17-doc-row');
    const label=cleanLabel(img.dataset.ceV17Label||row?.dataset?.ceV17Label||row?.dataset?.ceTicketLabel||row?.innerText||'');
    const domDetail=parseDomDetail(img);
    const tk=ticketToken(label)||norm(domDetail?.ticket||img.dataset.ceHf12Tk||img.dataset.ceHf10Tk||'').toUpperCase();
    if(!src||!tk) return false;
    lastThumbForViewer=img; lastThumbAt=Date.now();
    stop(ev);
    closeTicketViewers();
    const rows=rowsForTicketLabel(label||tk);
    const rowPillTotal=parseMoneyText(row?.querySelector?.('.pill')?.textContent||'');
    const rowsTotal=rows.length?rows.reduce((a,c)=>a+valueLine(c),0):0;
    const detailTotal=domDetail&&Number.isFinite(domDetail.total)?Number(domDetail.total||0):0;
    const total=detailTotal||rowsTotal||rowPillTotal||0;
    const store=domDetail?.store||splitParts(label)[0]||rows[0]&&storeName(rows[0])||'';
    let tableHtml='';
    if(domDetail){
      tableHtml=tableFromDomDetail(domDetail);
    }else{
      const lineRows=rows.length?rows.map(c=>{
        const imp=valueLine(c);
        return '<tr><td>'+esc(productName(c))+'</td><td>'+esc(fmtNum(units(c)))+'</td><td>'+esc(money(price(c)))+'</td><td>'+esc(money(imp))+'</td></tr>';
      }).join(''):'<tr><td colspan="4">Sin líneas contables para este ticket.</td></tr>';
      tableHtml='<table><thead><tr><th>Producto</th><th>Uds.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>'+lineRows+'</tbody></table>';
    }
    const modal=document.createElement('div');
    modal.id='ceV17TicketViewerFinal';
    modal.className=eventStatusClass();
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML='<div class="ce-v17-ticket-card">'
      +'<h2>'+esc(titleEvent())+'</h2>'
      +'<div class="ce-v17-ticket-grid">'
        +'<div class="ce-v17-ticket-lines">'
          +'<div class="ce-v17-ticket-meta"><strong>'+esc(store)+'</strong><strong>'+esc(tk)+'</strong></div>'
          +'<div class="ce-v17-ticket-total">'+esc(money(total))+'</div>'
          +'<div class="ce-v17-ticket-table-wrap">'+tableHtml+'</div>'
        +'</div>'
        +'<div class="ce-v17-ticket-image"><img alt="Foto '+esc(tk)+'" src="'+esc(src)+'"><button type="button" class="outline small" data-ce-v17-ticket-close>✕ Cerrar</button></div>'
      +'</div>'
    +'</div>';
    document.body.appendChild(modal);
    try{modal.querySelector('[data-ce-v17-ticket-close]')?.focus({preventScroll:true});}catch(_){ }
    return false;
  }

  function sanitizeSummaryThumbs(){
    const root=$('summaryTiendaTicket');
    if(!root) return;
    root.querySelectorAll('.summary-item,.ce-v17-doc-row').forEach(row=>{
      const actionsAll=Array.from(row.querySelectorAll('.ticket-actions,.ce-v17-doc-actions'));
      if(actionsAll.length>1){
        const keepActions=actionsAll[0];
        actionsAll.slice(1).forEach(a=>{
          // Si la segunda caja solo aporta miniaturas duplicadas, se elimina.
          if(a.querySelector('img')){ try{a.remove();}catch(_){a.style.display='none';} }
        });
        keepActions.classList.add('ticket-actions','ce-v17-doc-actions');
      }
      const thumbs=Array.from(row.querySelectorAll('img.ce-v17-doc-thumb,img.ticket-thumb,img[src*="ticket-images"],img[src^="data:image/"]'));
      thumbs.forEach(img=>{try{img.classList.add('ce-v17-doc-thumb'); img.classList.remove('ticket-thumb'); if(!img.dataset.ceV17Label && row.dataset.ceV17Label) img.dataset.ceV17Label=row.dataset.ceV17Label; if(!img.dataset.ceV17Detail && row.dataset.ceV17Detail) img.dataset.ceV17Detail=row.dataset.ceV17Detail;}catch(_){} });
      if(thumbs.length>1){
        const score=img=>{
          let n=0;
          if(norm(img.dataset.ceV17Detail)) n+=100;
          if(norm(row.dataset.ceV17Detail) && !norm(img.dataset.ceV17Detail)) n+=40;
          if(img.classList.contains('ce-v17-doc-thumb')) n+=10;
          if(norm(img.dataset.ceV17Label)) n+=5;
          return n;
        };
        const keep=thumbs.slice().sort((a,b)=>score(b)-score(a))[0] || thumbs[0];
        if(norm(row.dataset.ceV17Detail) && !norm(keep.dataset.ceV17Detail)) keep.dataset.ceV17Detail=row.dataset.ceV17Detail;
        if(norm(row.dataset.ceV17Label) && !norm(keep.dataset.ceV17Label)) keep.dataset.ceV17Label=row.dataset.ceV17Label;
        keep.classList.add('ce-v17-doc-thumb'); keep.classList.remove('ticket-thumb');
        thumbs.filter(img=>img!==keep).forEach(img=>{try{img.remove();}catch(_){img.style.setProperty('display','none','important');}});
      }
      row.querySelectorAll('.ticket-actions').forEach(actions=>{
        const btns=Array.from(actions.querySelectorAll('button[data-ce-v17-photo]'));
        const seen={};
        btns.forEach(btn=>{
          const key=btn.dataset.ceV17Photo||btn.textContent||'';
          if(seen[key]){try{btn.remove();}catch(_){btn.style.display='none';}}
          else seen[key]=true;
        });
      });
    });
  }

  function closeRowDetail(ev){
    const modal=document.querySelector('.ce-v17-rowdetail-modal');
    if(!modal) return false;
    if(ev) stop(ev);
    try{modal.remove();}catch(_){ }
    return false;
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const st=document.createElement('style');
    st.id=STYLE_ID;
    st.textContent=`
      #summaryTiendaTicket .summary-item img.ce-v17-doc-thumb:nth-of-type(n+2),
      #summaryTiendaTicket .ce-v17-doc-row img.ce-v17-doc-thumb:nth-of-type(n+2),
      #summaryTiendaTicket .ticket-actions img:nth-of-type(n+2),
      #summaryTiendaTicket .ce-v17-doc-actions img:nth-of-type(n+2){display:none!important;}
      .ce-v17-rowdetail-close{pointer-events:auto!important;cursor:pointer!important;z-index:10000050!important;}
      #ceV17TicketViewerFinal{position:fixed!important;inset:0!important;z-index:10000090!important;background:rgba(15,23,42,.72)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:10px!important;}
      #ceV17TicketViewerFinal .ce-v17-ticket-card{background:#fff!important;border-radius:14px!important;width:96vw!important;max-width:1420px!important;height:94vh!important;max-height:94vh!important;overflow:auto!important;padding:14px!important;border:2px solid #fb923c!important;display:flex!important;flex-direction:column!important;gap:14px!important;}
      #ceV17TicketViewerFinal h2{margin:0!important;text-align:center!important;font-size:24px!important;font-weight:950!important;}
      #ceV17TicketViewerFinal.ce-v17-event-curso h2{color:#166534!important;}
      #ceV17TicketViewerFinal.ce-v17-event-finalizado h2{color:#991b1b!important;}
      #ceV17TicketViewerFinal .ce-v17-ticket-grid{display:grid!important;grid-template-columns:minmax(320px,38%) 1fr!important;gap:14px!important;min-height:0!important;flex:1 1 auto!important;}
      #ceV17TicketViewerFinal .ce-v17-ticket-lines{border:1px solid #dbe4ee!important;border-radius:12px!important;overflow:auto!important;background:#fff!important;align-self:start!important;max-height:calc(94vh - 86px)!important;}
      #ceV17TicketViewerFinal .ce-v17-ticket-meta{display:flex!important;justify-content:space-between!important;gap:10px!important;align-items:center!important;background:#f8fafc!important;border-bottom:1px solid #e2e8f0!important;padding:10px!important;font-weight:950!important;color:#334155!important;}
      #ceV17TicketViewerFinal .ce-v17-ticket-total{padding:10px!important;font-weight:950!important;color:#0f172a!important;}
      #ceV17TicketViewerFinal .ce-v17-ticket-table-wrap{overflow:auto!important;}
      #ceV17TicketViewerFinal table{width:100%!important;border-collapse:collapse!important;font-size:13px!important;}
      #ceV17TicketViewerFinal th,#ceV17TicketViewerFinal td{border-top:1px solid #e2e8f0!important;padding:7px!important;text-align:left!important;}
      #ceV17TicketViewerFinal th{background:#f8fafc!important;font-weight:950!important;position:sticky!important;top:0!important;}
      #ceV17TicketViewerFinal td:nth-child(n+2),#ceV17TicketViewerFinal th:nth-child(n+2){text-align:right!important;white-space:nowrap!important;}
      #ceV17TicketViewerFinal .ce-v17-ticket-image{position:relative!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:flex-start!important;overflow:auto!important;min-height:0!important;padding-bottom:8px!important;}
      #ceV17TicketViewerFinal .ce-v17-ticket-image img{max-width:100%!important;max-height:calc(94vh - 112px)!important;object-fit:contain!important;border-radius:10px!important;background:#fff!important;}
      #ceV17TicketViewerFinal [data-ce-v17-ticket-close]{position:sticky!important;bottom:10px!important;align-self:flex-start!important;margin:8px auto 0 10px!important;min-width:112px!important;min-height:40px!important;font-weight:950!important;font-size:15px!important;background:#fff!important;z-index:8!important;box-shadow:0 8px 24px rgba(15,23,42,.20)!important;}
      @media(max-width:760px){#ceV17TicketViewerFinal .ce-v17-ticket-grid{grid-template-columns:1fr!important;}#ceV17TicketViewerFinal .ce-v17-ticket-lines{max-height:34vh!important;}#ceV17TicketViewerFinal .ce-v17-ticket-image img{max-height:45vh!important;}}
      #ceV104TicketDetail [data-ce-v104-close],#ceV103TicketDetail [data-ce-v103-close],#ceV102TicketDetail [data-ce-v102-close],#ceV101TicketDetail [data-ce-v101-close],#ceV100TicketDetail [data-ce-v100-close],#ceV96TicketDetail [data-ce-v96-close],#ceV40TicketPhotoModal .ce-v40-modal-close{position:fixed!important;left:calc(2vw + 24px)!important;right:auto!important;bottom:calc(3vh + 16px)!important;top:auto!important;z-index:10000095!important;min-width:112px!important;min-height:40px!important;font-weight:950!important;background:#fff!important;}
    `;
    document.head.appendChild(st);
  }

  function handleClick(ev){
    if(ev.target?.closest?.('.ce-v17-rowdetail-close,.ce-v17-rowdetail-head button,[aria-label="Cerrar"]')) return closeRowDetail(ev);
    if(ev.target?.closest?.('[data-ce-v17-ticket-close],[data-ce-v104-close],[data-ce-v103-close],[data-ce-v102-close],[data-ce-v101-close],[data-ce-v100-close],[data-ce-v96-close],.ce-v40-modal-close')) return closeTicketViewers(ev);
    const img=ev.target?.closest?.('#summaryTiendaTicket img.ce-v17-doc-thumb,#summaryTiendaTicket img[src*="ticket-images"],#summaryTiendaTicket img[src^="data:image/"]');
    if(img) return openTicketViewerFromThumb(img,ev);
  }
  function handleKey(ev){
    if(ev.key==='Escape'){
      if(document.querySelector('.ce-v17-rowdetail-modal')) return closeRowDetail(ev);
      if(document.querySelector(modalRoots())) return closeTicketViewers(ev);
    }
  }
  function install(){injectStyle();sanitizeSummaryThumbs();}
  ['click','pointerdown','pointerup','touchend'].forEach(t=>document.addEventListener(t,handleClick,true));
  document.addEventListener('keydown',handleKey,true);
  const mo=new MutationObserver(()=>{
    clearTimeout(mo.__t);
    mo.__t=setTimeout(()=>{
      sanitizeSummaryThumbs();
      if(legacyModalOpen()){
        let img=(lastThumbForViewer && Date.now()-lastThumbAt<3000)?lastThumbForViewer:null;
        if(!img){
          const legacyImg=document.querySelector(modalRoots()+' img');
          const legacySrc=norm(legacyImg?.currentSrc||legacyImg?.src||'');
          if(legacySrc){
            img=Array.from(document.querySelectorAll('#summaryTiendaTicket img.ce-v17-doc-thumb,#summaryTiendaTicket img[src*=\"ticket-images\"],#summaryTiendaTicket img[src^=\"data:image/\"]')).find(x=>norm(x.currentSrc||x.src||'')===legacySrc || norm(x.dataset.ceV17Src||'')===legacySrc) || null;
          }
        }
        if(img){
          closeTicketViewers();
          setTimeout(()=>openTicketViewerFromThumb(img,null),20);
        }
      }
    },40);
  });
  try{mo.observe(document.body,{childList:true,subtree:true});}catch(_){ }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-loaded','controlevent:data-loaded','controlevent:module-mounted'].forEach(evt=>window.addEventListener(evt,()=>setTimeout(install,30),true));
  [0,250,900,1800].forEach(ms=>setTimeout(install,ms));
  window.ControlEventV17Fix10={install,sanitizeSummaryThumbs,openTicketViewerFromThumb,closeTicketViewers,version:'v19_prod_fix13_titulo_evento_color_estado'};
})();
