/* ControlEvent v17_prod - FIX13 seguro sobre FIX11:
   - NO toca alta/baja/adjuntar fotos.
   - En eventos Finalizados, si se abre cualquier visor antiguo de ticket, lo sustituye por el visor nuevo con detalle a la izquierda y cerrar abajo derecha.
   - Limpia solo miniaturas duplicadas exactas (misma URL base) en Cálculos por tienda y ticket.
   No cambia versión visible. */
(function(){
  'use strict';
  if(window.__ceV17Fix13FinalizadoVisorSafe) return;
  window.__ceV17Fix13FinalizadoVisorSafe = true;

  const VIEWER_ID='ceV17Fix13TicketViewerFinalizado';
  const STYLE_ID='ceV17Fix13FinalizadoVisorSafeStyle';
  const LEGACY_SEL = [
    '#ceV104TicketDetail','#ceV103TicketDetail','#ceV102TicketDetail','#ceV101TicketDetail','#ceV100TicketDetail','#ceV96TicketDetail',
    '#ceV40TicketPhotoModal','#ceV310PhotoViewer','#ceTicketModalV234','#ceTicketImageModalV225',
    '.ce-v40-modal','.ce-v401-pc-modal','[id*="TicketDetail"]','[id*="TicketPhoto"]','[id*="PhotoViewer"]'
  ].join(',');
  const IMG_SEL = '#summaryTiendaTicket img.ticket-thumb,#summaryTiendaTicket img.ce-v17-doc-thumb,#summaryTiendaTicket .summary-item img,#summaryTiendaTicket .ce-v17-doc-row img';

  const norm=v=>String(v??'').trim();
  const up=v=>norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=(fn,fb)=>{try{const out=fn();return out===undefined?fb:out;}catch(_){return fb;}};
  const stop=ev=>{try{ev?.preventDefault?.();ev?.stopPropagation?.();ev?.stopImmediatePropagation?.();}catch(_){ } return false;};
  const getLexical=name=>safe(()=>Function('return (typeof '+name+'!=="undefined")?'+name+':undefined')(),undefined);
  const money=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const fmtNum=v=>new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(Number(v||0));

  function stateObjects(){
    const out=[]; const add=o=>{ if(o&&typeof o==='object'&&!out.includes(o)) out.push(o); };
    add(window.ControlEventApp?.state); add(getLexical('state')); add(window.state); add(window.__CONTROL_EVENT_STATE__); add(window.ControlEventRuntime?.app?.state);
    return out;
  }
  function arr(name){ for(const s of stateObjects()){ const v=s?.[name]; if(Array.isArray(v)) return v; } return []; }
  function eventId(){
    const fromSel=safe(()=>typeof selectedEvent==='function'?(selectedEvent()||{}).id:'','')||safe(()=>window.selectedEvent?.()?.id,'');
    if(norm(fromSel)) return norm(fromSel);
    for(const s of stateObjects()) if(norm(s?.selectedEventId)) return norm(s.selectedEventId);
    return norm(document.getElementById('selectedEvent')?.value||'');
  }
  function currentEvent(){
    const id=eventId();
    for(const s of stateObjects()){
      const ev=(Array.isArray(s?.eventos)?s.eventos:[]).find(x=>String(x?.id||'')===id);
      if(ev) return ev;
    }
    return safe(()=>typeof selectedEvent==='function'?(selectedEvent()||{}):{},{})||{};
  }
  function isFinalizado(){
    const ev=currentEvent();
    const txt=up(ev?.situacion||ev?.estado||document.querySelector('.badge,.status-pill')?.textContent||'');
    return txt.includes('FINALIZADO');
  }
  function titleEvent(){return norm(currentEvent()?.titulo||currentEvent()?.nombre||document.getElementById('selectedEvent')?.selectedOptions?.[0]?.textContent||'Evento seleccionado');}
  function byId(name,id){ const sid=String(id??''); return arr(name).find(x=>String(x?.id??x?.ID??'')===sid) || {}; }
  function displayName(o){return norm(o?.nombre||o?.name||o?.titulo||o?.descripcion||o?.label||o?.id||'');}
  function productName(c){return norm(c?.producto?.nombre||c?.product?.nombre||c?.productoNombre||c?.productName||c?.nombreProducto||displayName(byId('productos',c?.productoId??c?.producto_id??c?.productId))||'Producto');}
  function storeName(c){return norm(c?.tienda?.nombre||c?.store?.nombre||c?.tiendaNombre||c?.storeName||displayName(byId('tiendas',c?.tiendaId??c?.tienda_id??c?.storeId))||'Sin tienda');}
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
  function rowEventId(c){return norm(c?.eventId??c?.event_id??c?.eventoId??c?.evento_id??c?.idEvento??c?.evento??'');}
  function ticketToken(s){const m=norm(s).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);return m?m[0].replace(/\s+/g,'').toUpperCase():'';}
  function cleanLabel(label){
    const ev=eventId(); let s=norm(label);
    try{s=decodeURIComponent(s);}catch(_){ }
    s=s.split('·')[0].replace(/\s*\|\s*/g,' | ').replace(/\s+/g,' ').trim();
    if(ev&&s.startsWith(ev+' | '))s=s.slice(ev.length+3).trim();
    if(ev&&s.startsWith(ev+'|'))s=s.slice(ev.length+1).trim();
    return s.replace(/\s*\|\s*/g,' | ').trim();
  }
  function splitParts(label){return cleanLabel(label).split('|').map(x=>norm(x)).filter(Boolean);}
  function collectRows(){
    const out=[]; const seen=new Set();
    function addRows(rows){
      if(!Array.isArray(rows)) return;
      rows.forEach((r,i)=>{
        if(!r||typeof r!=='object') return;
        const key=String(r.id??r.ID??'')+'|'+String(r.eventId??r.event_id??r.eventoId??r.evento_id??'')+'|'+String(r.ticketDonacion??r.ticket??'')+'|'+i;
        if(seen.has(key)) return; seen.add(key); out.push(r);
      });
    }
    addRows(safe(()=>window.ControlEventApp?.selectors?.comprasForEvent?.(),[]));
    addRows(safe(()=>window.ControlEventApp?.domain?.compras?.comprasForEvent?.(),[]));
    addRows(safe(()=>getLexical('comprasForEvent')?.(),[]));
    addRows(arr('compras'));
    return out;
  }
  function rowsForTicket(label){
    const clean=cleanLabel(label); const tk=ticketToken(clean); if(!tk) return [];
    const storeU=up(splitParts(clean)[0]||''); const ev=eventId();
    let rows=collectRows().filter(c=>up(ticketOf(c))===tk);
    const eventRows=rows.filter(c=>{const rid=rowEventId(c); return !rid || !ev || rid===ev;});
    if(eventRows.length) rows=eventRows;
    if(storeU){
      const strict=rows.filter(c=>{const su=up(storeName(c)); return su===storeU || su.includes(storeU) || storeU.includes(su);});
      if(strict.length) rows=strict;
    }
    return rows;
  }
  function parseAmountFromRow(row){
    const txt=norm(row?.querySelector?.('.pill,.amount,.importe,.total')?.textContent||row?.textContent||'');
    const all=[...txt.matchAll(/([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})\s*€/g)];
    const m=all.length?all[all.length-1]:null;
    return m?Number(m[1].replace(/\./g,'').replace(',','.')):0;
  }
  function srcIsRealTicket(src){ return !!src && !/icon-|footer-|excel|database|db-|colty|logo|apple-touch/i.test(src); }
  function labelForThumb(img){
    const row=img?.closest?.('#summaryTiendaTicket .summary-item,#summaryTiendaTicket .ce-v17-doc-row,#summaryTiendaTicket [data-ce-v17-label],#summaryTiendaTicket [data-ce-ticket-label]');
    let label=norm(img?.dataset?.ceV17Label||img?.dataset?.ceTicketLabel||row?.dataset?.ceV17Label||row?.dataset?.ceTicketLabel||'');
    if(!label&&row){
      const lab=row.querySelector('.ce-hf10-label,.ce-v17-doc-label,.summary-label,span:first-child');
      label=norm(lab?.textContent||'');
      if(!label){
        const clone=row.cloneNode(true);
        clone.querySelectorAll('button,img,input,.ticket-actions,.ce-v17-doc-actions,.pill').forEach(x=>x.remove());
        label=norm(clone.textContent||'');
      }
    }
    if(!ticketToken(label)){
      const txt=norm((row?.textContent||'')+' '+(img?.alt||'')+' '+(img?.src||''));
      const tk=ticketToken(txt);
      if(tk){ const store=splitParts(label)[0]||norm((row?.textContent||'').split('|')[0]||''); label=(store?store+' | ':'')+tk; }
    }
    return cleanLabel(label);
  }
  function labelFromLegacy(modal){
    const txt=norm(modal?.textContent||'');
    const tk=ticketToken(txt) || ticketToken(lastCtx?.label||'') || ticketToken(lastCtx?.src||'');
    if(!tk) return '';
    const store = splitParts(lastCtx?.label||'')[0] || norm((txt.match(/\b([A-ZÁÉÍÓÚÜÑ0-9 ._\-]+)\s+TK\s*\d+/i)||[])[1]||'');
    return cleanLabel((store?store+' | ':'')+tk);
  }
  function closeLegacy(){
    document.querySelectorAll(LEGACY_SEL).forEach(m=>{
      if(!m || m.id===VIEWER_ID) return;
      try{m.remove();}catch(_){try{m.style.setProperty('display','none','important');}catch(__){}}
    });
  }
  function closeViewer(ev){ if(ev) stop(ev); document.getElementById(VIEWER_ID)?.remove(); closeLegacy(); return false; }
  let lastCtx=null;
  function contextFromThumb(img){
    if(!img) return null;
    const src=norm(img.currentSrc||img.src||img.dataset?.ceV17Src||'');
    if(!srcIsRealTicket(src)) return null;
    const row=img.closest('#summaryTiendaTicket .summary-item,#summaryTiendaTicket .ce-v17-doc-row');
    const label=labelForThumb(img);
    const tk=ticketToken(label)||ticketToken(src)||ticketToken(row?.textContent||'');
    if(!tk) return null;
    return {img,src,row,label:label||tk,tk,at:Date.now()};
  }
  function findImgFromLegacy(modal){
    const img=modal?.querySelector?.('img');
    const src=norm(img?.currentSrc||img?.src||'');
    return srcIsRealTicket(src)?src:'';
  }
  function openViewerFromContext(ctx,ev){
    if(!ctx || !ctx.src || !ctx.tk) return false;
    if(ev) stop(ev);
    closeLegacy();
    document.getElementById(VIEWER_ID)?.remove();
    const rows=rowsForTicket(ctx.label||ctx.tk);
    const total=rows.length?rows.reduce((a,c)=>a+valueLine(c),0):parseAmountFromRow(ctx.row);
    const store=splitParts(ctx.label)[0] || (rows[0]?storeName(rows[0]):'');
    const tableRows=rows.length?rows.map(c=>{
      const imp=valueLine(c);
      return '<tr><td>'+esc(productName(c))+'</td><td>'+esc(fmtNum(units(c)))+'</td><td>'+esc(money(price(c)))+'</td><td>'+esc(money(imp))+'</td></tr>';
    }).join(''):'<tr><td colspan="4">Sin líneas contables para este ticket.</td></tr>';
    const modal=document.createElement('div'); modal.id=VIEWER_ID; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true');
    modal.innerHTML='<div class="ce-fix13-ticket-card">'
      +'<h2>'+esc(titleEvent())+'</h2>'
      +'<div class="ce-fix13-ticket-grid">'
        +'<section class="ce-fix13-ticket-lines">'
          +'<div class="ce-fix13-ticket-meta"><strong>'+esc(store)+'</strong><strong>'+esc(ctx.tk)+'</strong></div>'
          +'<div class="ce-fix13-ticket-total">Total ticket: '+esc(money(total))+'</div>'
          +'<div class="ce-fix13-table-wrap"><table><thead><tr><th>Producto</th><th>Uds.</th><th>Precio</th><th>Importe</th></tr></thead><tbody>'+tableRows+'</tbody></table></div>'
        +'</section>'
        +'<section class="ce-fix13-ticket-photo"><img src="'+esc(ctx.src)+'" alt="Foto '+esc(ctx.tk)+'"></section>'
      +'</div>'
      +'<div class="ce-fix13-close-row"><button type="button" class="outline small" data-ce-fix13-close>✕ Cerrar</button></div>'
    +'</div>';
    document.body.appendChild(modal);
    try{modal.querySelector('[data-ce-fix13-close]')?.focus({preventScroll:true});}catch(_){ }
    return false;
  }
  function maybeReplaceLegacy(){
    if(!isFinalizado()) return;
    const legacy=document.querySelector(LEGACY_SEL);
    if(!legacy || legacy.id===VIEWER_ID) return;
    const recent = lastCtx && Date.now()-lastCtx.at<6000;
    let ctx=recent?Object.assign({},lastCtx):null;
    if(!ctx){
      const label=labelFromLegacy(legacy); const tk=ticketToken(label); const src=findImgFromLegacy(legacy);
      if(tk && src) ctx={src,label,tk,row:null,at:Date.now()};
    }else if(!ctx.src){
      const src=findImgFromLegacy(legacy); if(src) ctx.src=src;
    }
    if(ctx && ctx.src && ctx.tk) openViewerFromContext(ctx,null);
  }
  function handleThumbDown(ev){
    const img=ev.target?.closest?.(IMG_SEL);
    const ctx=contextFromThumb(img);
    if(ctx) lastCtx=ctx;
  }
  function handleThumbClick(ev){
    const img=ev.target?.closest?.(IMG_SEL);
    const ctx=contextFromThumb(img);
    if(!ctx) return;
    lastCtx=ctx;
    if(isFinalizado()) return openViewerFromContext(ctx,ev);
    // En curso se deja al FIX11, que ya funcionaba.
  }
  function cleanUrl(src){ return norm(src).split('?')[0].replace(/\/$/,''); }
  function sanitizeThumbs(){
    const root=document.getElementById('summaryTiendaTicket'); if(!root) return;
    root.querySelectorAll('.summary-item,.ce-v17-doc-row').forEach(row=>{
      const seen=new Set();
      Array.from(row.querySelectorAll('img')).forEach(img=>{
        const src=norm(img.currentSrc||img.src||'');
        if(!srcIsRealTicket(src)) return;
        img.classList.add('ticket-thumb','ce-v17-doc-thumb');
        const key=cleanUrl(src);
        if(seen.has(key)){ try{img.remove();}catch(_){img.style.setProperty('display','none','important');} }
        else seen.add(key);
      });
    });
  }
  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const st=document.createElement('style'); st.id=STYLE_ID;
    st.textContent=`
      #${VIEWER_ID}{position:fixed!important;inset:0!important;z-index:10000180!important;background:rgba(15,23,42,.72)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important;}
      #${VIEWER_ID} .ce-fix13-ticket-card{background:#fff!important;border:2px solid #fb923c!important;border-radius:16px!important;width:96vw!important;max-width:1450px!important;height:94vh!important;max-height:94vh!important;padding:14px!important;display:flex!important;flex-direction:column!important;gap:14px!important;overflow:auto!important;}
      #${VIEWER_ID} h2{margin:0!important;text-align:center!important;color:#991b1b!important;font-size:24px!important;font-weight:950!important;}
      #${VIEWER_ID} .ce-fix13-ticket-grid{display:grid!important;grid-template-columns:minmax(340px,38%) 1fr!important;gap:14px!important;min-height:0!important;flex:1 1 auto!important;}
      #${VIEWER_ID} .ce-fix13-ticket-lines{border:1px solid #dbe4ee!important;border-radius:12px!important;overflow:auto!important;background:#fff!important;align-self:start!important;max-height:calc(94vh - 128px)!important;}
      #${VIEWER_ID} .ce-fix13-ticket-meta{display:flex!important;justify-content:space-between!important;gap:10px!important;background:#f8fafc!important;border-bottom:1px solid #e2e8f0!important;padding:10px!important;font-weight:950!important;color:#334155!important;}
      #${VIEWER_ID} .ce-fix13-ticket-total{padding:10px!important;font-weight:950!important;color:#0f172a!important;}
      #${VIEWER_ID} .ce-fix13-table-wrap{overflow:auto!important;}
      #${VIEWER_ID} table{width:100%!important;border-collapse:collapse!important;font-size:13px!important;}
      #${VIEWER_ID} th,#${VIEWER_ID} td{border-top:1px solid #e2e8f0!important;padding:7px!important;text-align:left!important;}
      #${VIEWER_ID} th{background:#f8fafc!important;font-weight:950!important;position:sticky!important;top:0!important;}
      #${VIEWER_ID} td:nth-child(n+2),#${VIEWER_ID} th:nth-child(n+2){text-align:right!important;white-space:nowrap!important;}
      #${VIEWER_ID} .ce-fix13-ticket-photo{display:flex!important;align-items:flex-start!important;justify-content:center!important;overflow:auto!important;min-height:0!important;}
      #${VIEWER_ID} .ce-fix13-ticket-photo img{max-width:100%!important;max-height:calc(94vh - 128px)!important;object-fit:contain!important;border-radius:10px!important;background:#fff!important;}
      #${VIEWER_ID} .ce-fix13-close-row{position:sticky!important;bottom:0!important;display:flex!important;justify-content:flex-end!important;background:linear-gradient(to top,#fff 74%,rgba(255,255,255,0))!important;padding:12px 4px 4px!important;margin-top:auto!important;z-index:10!important;}
      #${VIEWER_ID} [data-ce-fix13-close]{min-width:112px!important;min-height:40px!important;font-weight:950!important;font-size:15px!important;background:#fff!important;}
      @media(max-width:760px){#${VIEWER_ID} .ce-fix13-ticket-grid{grid-template-columns:1fr!important;}#${VIEWER_ID} .ce-fix13-ticket-lines{max-height:34vh!important;}#${VIEWER_ID} .ce-fix13-ticket-photo img{max-height:45vh!important;}}
      body.ce-v120-finalizado-tools #ceV104TicketDetail [data-ce-v104-close],
      body.ce-v120-finalizado-tools #ceV103TicketDetail [data-ce-v103-close],
      body.ce-v120-finalizado-tools #ceV102TicketDetail [data-ce-v102-close],
      body.ce-v120-finalizado-tools #ceV101TicketDetail [data-ce-v101-close],
      body.ce-v120-finalizado-tools #ceV100TicketDetail [data-ce-v100-close]{position:fixed!important;right:calc(2vw + 24px)!important;bottom:calc(3vh + 16px)!important;top:auto!important;z-index:10000190!important;min-width:112px!important;min-height:40px!important;font-weight:950!important;background:#fff!important;}
    `;
    document.head.appendChild(st);
  }
  function install(){ injectStyle(); sanitizeThumbs(); maybeReplaceLegacy(); }
  ['pointerdown','mousedown','touchstart'].forEach(t=>document.addEventListener(t,handleThumbDown,{capture:true,passive:false}));
  document.addEventListener('click',handleThumbClick,true);
  document.addEventListener('click',ev=>{ if(ev.target?.closest?.('[data-ce-fix13-close]')) return closeViewer(ev); },true);
  document.addEventListener('keydown',ev=>{ if(ev.key==='Escape' && (document.getElementById(VIEWER_ID)||document.querySelector(LEGACY_SEL))){ return closeViewer(ev); } },true);
  const mo=new MutationObserver(()=>{
    clearTimeout(mo.__t);
    mo.__t=setTimeout(install,35);
  });
  try{mo.observe(document.body,{childList:true,subtree:true});}catch(_){ }
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-loaded','controlevent:data-loaded','controlevent:module-mounted'].forEach(evt=>window.addEventListener(evt,()=>setTimeout(install,30),true));
  [0,250,900,1800,3200].forEach(ms=>setTimeout(install,ms));
  window.ControlEventV17Fix13={install,openViewerFromContext,closeViewer,sanitizeThumbs,version:'v17_prod_fix13_finalizado_visor_safe'};
})();
