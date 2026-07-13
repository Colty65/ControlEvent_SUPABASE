/* ControlEvent v21_prod - HOTFIX48: avance solo en logo, modales/títulos, globos A-Z, mantenimiento desde documentos. */
(function(){
  'use strict';
  const INSTALLED='__ceV15Hotfix23AvanceLogoModalesGlobos';
  if(window[INSTALLED]) return;
  window[INSTALLED]=true;

  const $=id=>document.getElementById(id);
  const safe=(fn,fb)=>{try{const v=fn();return v===undefined?fb:v;}catch(_){return fb;}};
  const text=v=>String(v??'').trim();
  const up=v=>text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const euro=v=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0));
  const st=()=>safe(()=> (typeof state!=='undefined'&&state)||window.state||window.ControlEventApp?.state||{}, window.state||window.ControlEventApp?.state||{});
  const arr=n=>Array.isArray(st()[n])?st()[n]:[];
  const selId=()=>text($('selectedEvent')?.value||st().selectedEventId||'');
  const selectedEventObj=()=>{
    const id=selId();
    return arr('eventos').find(e=>String(e?.id||'')===id) || safe(()=> (typeof selectedEvent==='function'?selectedEvent():null), null) || {};
  };
  const eventTitle=()=>text(selectedEventObj().titulo || $('selectedEvent')?.selectedOptions?.[0]?.textContent || 'Evento');
  const isFinalizado=()=>up(selectedEventObj().situacion||'')==='FINALIZADO';
  const isVisible=el=>!!(el && !el.classList?.contains('hidden') && (el.offsetWidth||el.offsetHeight||el.getClientRects().length));
  const call=(name,...args)=>{try{const fn=window[name]||Function('return (typeof '+name+'==="function")?'+name+':null')(); if(typeof fn==='function') return fn(...args);}catch(_){}};

  function injectStyle(){
    if($('ceHf48Style')) return;
    const css=document.createElement('style'); css.id='ceHf48Style';
    css.textContent=`
      /* El avance ya no vive dentro de Resumen ni Mapa: solo sale desde el logo. */
      #budgetLayout .ce-v15hf6-avance-box,#budgetLayout .ce-v15hf7-avance-box,#budgetLayout .ce-hf9-av-box,
      #ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf17AvanceBtn,#ceHf18AvanceBtn,#ceHf19AvanceBtn,#ceHf20AvanceBtn,#ceHf21AvanceBtn,#ceHf40AvanceBtn,#ceHf41AvanceBtn,#ceHf42AvanceBtn,#ceHf43AvanceBtn,#ceHf44AvanceBtn,#ceHf45AvanceBtn,#ceHf46AvanceBtn,#ceHf46MapaActions,
      [id^="ceHf13MapaAvancePanel"],[id^="ceHf14MapaAvancePanel"],[id^="ceHf15MapaAvancePanel"],[id^="ceHf16MapaAvancePanel"],[id^="ceHf17MapaAvancePanel"],[id^="ceHf18MapaAvancePanel"],[id^="ceHf19MapaAvancePanel"],[id^="ceHf20MapaAvancePanel"],[id^="ceHf21MapaAvancePanel"],[id^="ceHf40MapaAvancePanel"],[id^="ceHf41MapaAvancePanel"],[id^="ceHf42MapaAvancePanel"],[id^="ceHf43MapaAvancePanel"],[id^="ceHf44MapaAvancePanel"],[id^="ceHf45MapaAvancePanel"],[id^="ceHf46MapaAvancePanel"],
      .ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,.ce-hf17-mapa-actions,.ce-hf18-mapa-actions,.ce-hf19-mapa-actions,.ce-hf20-mapa-actions,.ce-hf21-mapa-actions,.ce-hf40-mapa-actions,.ce-hf41-mapa-actions,.ce-hf42-mapa-actions,.ce-hf43-mapa-actions,.ce-hf44-mapa-actions,.ce-hf45-mapa-actions,.ce-hf46-mapa-actions{display:none!important;visibility:hidden!important;pointer-events:none!important;max-height:0!important;overflow:hidden!important;}
      .brand img[alt*="Colty"],img.brand-logo-large,.brand .brand-logo-large{cursor:pointer!important;}
      #ceHf48AvanceLayer{position:fixed!important;inset:0!important;z-index:1000000!important;display:none!important;align-items:center!important;justify-content:center!important;padding:12px!important;pointer-events:none!important;background:rgba(15,23,42,.10)!important;}
      #ceHf48AvanceLayer.visible{display:flex!important;}
      .ce-hf48-bubble{position:relative!important;width:min(620px,94vw)!important;max-height:min(78vh,640px)!important;overflow:auto!important;background:rgba(255,255,255,.985)!important;border:2px solid #0f172a!important;border-radius:24px!important;box-shadow:0 24px 80px rgba(15,23,42,.32)!important;padding:14px!important;pointer-events:auto!important;animation:ceHf48Pop .16s ease-out!important;}
      .ce-hf48-bubble.curso{border-color:#16a34a!important}.ce-hf48-bubble.finalizado{border-color:#dc2626!important}
      .ce-hf48-bubble-title{text-align:center!important;margin:2px 38px 12px!important;line-height:1.16!important}.ce-hf48-bubble-title span{display:block!important;font-size:12px!important;font-weight:950!important;letter-spacing:.15em!important;color:#64748b!important}.ce-hf48-bubble-title strong{display:block!important;font-size:clamp(17px,3.8vw,24px)!important;font-weight:950!important}.ce-hf48-bubble.curso .ce-hf48-bubble-title strong{color:#15803d!important}.ce-hf48-bubble.finalizado .ce-hf48-bubble-title strong{color:#991b1b!important}
      .ce-hf48-close{position:absolute!important;right:10px!important;top:8px!important;width:34px!important;height:34px!important;border-radius:999px!important;border:1px solid #cbd5e1!important;background:#fff!important;font-size:24px!important;font-weight:950!important;line-height:28px!important;cursor:pointer!important}.ce-hf48-rows{display:grid!important;gap:6px!important}.ce-hf48-row{display:grid!important;grid-template-columns:1fr 62px minmax(96px,.8fr)!important;gap:8px!important;align-items:center!important;background:#f8fafc!important;border:1px solid #dbe4ee!important;border-radius:14px!important;padding:8px!important}.ce-hf48-row b{font-size:13px!important;font-weight:950!important}.ce-hf48-row small{display:block!important;color:#475569!important;font-size:11px!important;font-weight:750!important;margin-top:2px!important}.ce-hf48-row>strong{text-align:right!important;font-size:13px!important}.ce-hf48-bar{height:10px!important;background:#e5e7eb!important;border-radius:999px!important;overflow:hidden!important}.ce-hf48-bar i{display:block!important;height:100%!important;background:#2563eb!important;border-radius:999px!important}@media(max-width:560px){.ce-hf48-row{grid-template-columns:1fr 52px!important}.ce-hf48-bar{grid-column:1/-1!important}.ce-hf48-bubble{border-radius:20px!important;padding:12px!important}}
      @keyframes ceHf48Pop{from{transform:scale(.96);opacity:.25}to{transform:scale(1);opacity:1}}
      .ce-hf48-event-modal-title{display:block!important;text-align:center!important;font-weight:950!important;line-height:1.18!important;white-space:normal!important;}
      .ce-hf48-event-modal-title.is-curso{color:#15803d!important}.ce-hf48-event-modal-title.is-finalizado{color:#991b1b!important}
      .ce-hf48-receipt-title{flex:1!important;text-align:center!important;font-weight:950!important;font-size:clamp(15px,2.4vw,21px)!important;line-height:1.15!important;padding:0 14px!important;}
      .ce-hf48-receipt-title.is-curso{color:#15803d!important}.ce-hf48-receipt-title.is-finalizado{color:#991b1b!important}
      .ce-v468-modal-head,.ce-v465-modal-head,.ce-v464-receipt-head,.ce-receipt-modal-head-v463{display:flex!important;align-items:center!important;gap:10px!important;width:100%!important;}
      body.ce-hf48-maint-open #maintenanceWrapper{display:block!important;visibility:visible!important;pointer-events:auto!important;opacity:1!important;max-height:none!important;}
      body.ce-hf48-maint-open #tabDocumentos{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #ceTooltipV21 table.ce-v21-table tr.ce-hf48-table-head td,#ceBudgetLiteTooltipV307 table tr.ce-hf48-table-head th,#ceBudgetLiteTooltipV307 table tr.ce-hf48-table-head td{font-weight:950!important;background:#f1f5f9!important;color:#0f172a!important;}
    `;
    document.head.appendChild(css);
  }

  function cleanupInlineAvance(){
    document.querySelectorAll('#budgetLayout .ce-v15hf6-avance-box,#budgetLayout .ce-v15hf7-avance-box,#budgetLayout .ce-hf9-av-box,#ceHf13AvanceBtn,#ceHf14AvanceBtn,#ceHf15AvanceBtn,#ceHf16AvanceBtn,#ceHf17AvanceBtn,#ceHf18AvanceBtn,#ceHf19AvanceBtn,#ceHf20AvanceBtn,#ceHf21AvanceBtn,#ceHf40AvanceBtn,#ceHf41AvanceBtn,#ceHf42AvanceBtn,#ceHf43AvanceBtn,#ceHf44AvanceBtn,#ceHf45AvanceBtn,#ceHf46AvanceBtn,#ceHf46MapaActions,[id^="ceHf13MapaAvancePanel"],[id^="ceHf14MapaAvancePanel"],[id^="ceHf15MapaAvancePanel"],[id^="ceHf16MapaAvancePanel"],[id^="ceHf17MapaAvancePanel"],[id^="ceHf18MapaAvancePanel"],[id^="ceHf19MapaAvancePanel"],[id^="ceHf20MapaAvancePanel"],[id^="ceHf21MapaAvancePanel"],[id^="ceHf40MapaAvancePanel"],[id^="ceHf41MapaAvancePanel"],[id^="ceHf42MapaAvancePanel"],[id^="ceHf43MapaAvancePanel"],[id^="ceHf44MapaAvancePanel"],[id^="ceHf45MapaAvancePanel"],[id^="ceHf46MapaAvancePanel"],.ce-hf13-mapa-actions,.ce-hf14-mapa-actions,.ce-hf15-mapa-actions,.ce-hf16-mapa-actions,.ce-hf17-mapa-actions,.ce-hf18-mapa-actions,.ce-hf19-mapa-actions,.ce-hf20-mapa-actions,.ce-hf21-mapa-actions,.ce-hf40-mapa-actions,.ce-hf41-mapa-actions,.ce-hf42-mapa-actions,.ce-hf43-mapa-actions,.ce-hf44-mapa-actions,.ce-hf45-mapa-actions,.ce-hf46-mapa-actions').forEach(el=>{try{el.remove();}catch(_){}});
  }

  function imageKeyPresent(key){
    const s=st(); const raw=String(key||''); const compact=raw.replace(/\s+/g,'');
    return !!(s.ticketImages?.[raw]||s.ticketImageRefs?.[raw]||s.ticketImages?.[compact]||s.ticketImageRefs?.[compact]);
  }
  function docCode(value){const m=String(value||'').toUpperCase().match(/DOC\s*(\d+)/); return m?'DOC'+String(Number(m[1])).padStart(2,'0'):'';}
  function isDonation(row){
    const t=up(row?.ticketDonacion||row?.ticket||row?.donacion||'');
    return t.startsWith('DONADO') || t.includes('DONACION');
  }
  function computeAvance(){
    const ev=selectedEventObj(); const evId=selId(); const precio=Number(ev.precio||0);
    const col=arr('colaboradores').filter(c=>String(c.eventId||c.event_id||'')===evId);
    const previsto=col.reduce((sum,c)=>sum+(Number(c.obligatorio??0)||(Number(c.numero||0)*precio))+Number(c.importeVoluntario??c.voluntario??c.importe??0),0);
    const ingresado=col.filter(c=>up(c.situacion||c.formaPago||'Pendiente')!=='PENDIENTE').reduce((sum,c)=>sum+(Number(c.obligatorio??0)||(Number(c.numero||0)*precio))+Number(c.importeVoluntario??c.voluntario??c.importe??0),0);
    const fotosIng=col.filter(c=>imageKeyPresent(`${evId}|INGRESO:${c.id}`)||imageKeyPresent(`${evId}|INGRESO|${c.id}`)).length;
    const compras=arr('compras').filter(c=>String(c.eventId||c.event_id||'')===evId);
    const don=compras.filter(isDonation);
    const comp=compras.filter(c=>!isDonation(c));
    const docs=(Array.isArray(st().eventDocuments)?st().eventDocuments:[]).filter(d=>String(d.eventId||d.event_id||'')===evId);
    const docKeys=new Set(docs.map(d=>`${evId}|${docCode(d.codigo||d.imageKey||d.id)}`).filter(k=>!k.endsWith('|')));
    Object.keys(st().ticketImages||{}).forEach(k=>{if(k.startsWith(evId+'|')&&/DOC\s*\d+/i.test(k)) docKeys.add(k);});
    const tickets=[...new Set(comp.map(c=>text(c.ticket||c.ticketDonacion||c.ticket_donacion||'').toUpperCase()).filter(v=>/TK\d+/i.test(v)))];
    const ticketPhotos=tickets.filter(tk=>Object.keys(st().ticketImages||{}).some(k=>k.startsWith(evId+'|')&&k.toUpperCase().includes(tk))).length;
    return [
      {n:1,t:'INGRESOS',p:previsto?Math.min(100,ingresado/previsto*100):0,d:`${euro(ingresado)} de ${euro(previsto)} ingresados`},
      {n:2,t:'FOTOS INGRESOS',p:col.length?fotosIng/col.length*100:0,d:`${fotosIng} de ${col.length} ingresos realizados con justificante`},
      {n:3,t:'DONACIONES',p:don.length?100:0,d:`Donaciones registradas: ${don.length}`},
      {n:4,t:'COMPRAS',p:comp.length?100:0,d:`${comp.length} líneas asignadas a TKxx o gastos corrientes`},
      {n:5,t:'DOCUMENTOS',p:docKeys.size?100:0,d:`${docKeys.size} documento(s) adjunto(s)`},
      {n:6,t:'FOTOS TICKETS',p:tickets.length?ticketPhotos/tickets.length*100:0,d:`${ticketPhotos} de ${tickets.length} tickets contables con foto adjunta`}
    ];
  }

  let bubbleTimer=0;
  function showAvanceBubble(){
    // FIX10 v21: el avance oficial es v16-hotfix5 (ASISTENCIA, importes y diseño nuevo).
    // Este hotfix antiguo solo queda para títulos/modales. Si alguien pulsa el logo por este handler,
    // delegamos en el avance oficial y evitamos pintar la ficha vieja con numeración/FOTOS INGRESOS.
    if(window.ControlEventV16Hf5Avance && typeof window.ControlEventV16Hf5Avance.show==='function'){
      try{ cleanupInlineAvance(); window.ControlEventV16Hf5Avance.show(); return; }catch(_){ }
    }
    cleanupInlineAvance();
    let layer=$('ceHf48AvanceLayer');
    if(!layer){ layer=document.createElement('div'); layer.id='ceHf48AvanceLayer'; document.body.appendChild(layer); }
    const rows=computeAvance(); const cls=isFinalizado()?'finalizado':'curso';
    layer.innerHTML=`<div class="ce-hf48-bubble ${cls}" role="dialog" aria-live="polite">
      <button type="button" class="ce-hf48-close" aria-label="Cerrar">×</button>
      <div class="ce-hf48-bubble-title"><span>AVANCE DEL EVENTO</span><strong>${esc(eventTitle())}</strong></div>
      <div class="ce-hf48-rows">${rows.map(r=>`<div class="ce-hf48-row"><div><b>${r.n} · ${esc(r.t)}</b><small>${esc(r.d)}</small></div><strong>${Number(r.p||0).toLocaleString('es-ES',{maximumFractionDigits:2})}%</strong><span class="ce-hf48-bar"><i style="width:${Math.max(0,Math.min(100,Number(r.p||0)))}%"></i></span></div>`).join('')}</div>
    </div>`;
    layer.classList.add('visible');
    const close=()=>{try{layer.classList.remove('visible');}catch(_){}};
    layer.querySelector('.ce-hf48-close')?.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();close();},{once:true});
    clearTimeout(bubbleTimer); bubbleTimer=setTimeout(close,8500);
  }
  function isLogoClickTarget(target){
    if(!target) return false;
    const img=target.closest?.('img.brand-logo-large,img[alt*="Colty"],.brand-logo-large');
    if(img) return true;
    const brand=target.closest?.('.brand');
    if(brand && brand.querySelector?.('img.brand-logo-large,img[alt*="Colty"]')) return true;
    return false;
  }
  let lastLogoOpen=0;
  function logoHandler(ev){
    if(!isLogoClickTarget(ev.target)) return;
    const now=Date.now();
    if(ev.type==='click' && now-lastLogoOpen<450) return;
    lastLogoOpen=now;
    try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
    showAvanceBubble();
    return false;
  }
  function stripLogoTitle(){
    document.querySelectorAll('.brand,img.brand-logo-large,img[alt*="Colty"]').forEach(el=>{try{el.removeAttribute('title');el.style.cursor='pointer';}catch(_){}});
  }

  function openMaintenanceFromDocuments(ev){
    const trigger=ev.target?.closest?.('#btnToggleMaintenance,.mobile-menu-action[data-target="btnToggleMaintenance"]');
    if(!trigger) return;
    const docs=$('tabDocumentos');
    if(!isVisible(docs) && !document.body.classList.contains('ce-docs-active-v85')) return;
    try{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();}catch(_){ }
    try{ window.__ceDocsForceActiveV85=false; window.ControlEventDocumentsV85?.releaseExclusive?.(); }catch(_){ }
    document.body.classList.remove('ce-docs-active-v85');
    document.body.classList.add('ce-hf48-maint-open');
    try{ currentMainTab='mantenimiento'; }catch(_){ }
    try{ window.__ceCurrentMainTab='mantenimiento'; if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab='mantenimiento'; }catch(_){ }
    ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','tabDocumentos'].forEach(id=>{const el=$(id); if(el){el.classList.add('hidden'); el.style.setProperty('display','none','important');}});
    const wrap=$('maintenanceWrapper');
    if(wrap){
      wrap.classList.remove('hidden');
      wrap.style.setProperty('display','block','important');
      wrap.style.setProperty('visibility','visible','important');
      wrap.style.setProperty('pointer-events','auto','important');
      wrap.style.setProperty('opacity','1','important');
      try{ call('renderMaintenance'); }catch(_){ }
      setTimeout(()=>{try{wrap.scrollIntoView({behavior:'smooth',block:'start'});}catch(_){ }},50);
    }
    const btn=$('btnToggleMaintenance'); if(btn){btn.classList.add('maint-btn-open');btn.classList.remove('maint-btn-closed');}
    return false;
  }
  function clearMaintOverrideOnTab(ev){
    if(ev.target?.closest?.('#mainTabs button,.mobile-menu-action[data-target]') && !ev.target?.closest?.('#btnToggleMaintenance,.mobile-menu-action[data-target="btnToggleMaintenance"]')){
      document.body.classList.remove('ce-hf48-maint-open');
      ['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','tabDocumentos'].forEach(id=>{const el=$(id); if(el){el.style.removeProperty('display');}});
    }
  }

  function modalTitleMarkup(){return `<span class="ce-hf48-event-modal-title ${isFinalizado()?'is-finalizado':'is-curso'}">${esc(eventTitle())}</span>`;}
  function leafText(el){return text(el?.textContent||'');}
  function isLeafish(el){return !el || !el.querySelector('table,img,input,select,textarea,button');}
  function replaceTicketHeading(root){
    const candidates=Array.from(root.querySelectorAll('h1,h2,h3,h4,.modal-title,.ce-modal-title,.ce-v401-pc-modal-head,.ce-v40-modal-head,.head,.modal-head,div,span,strong,b'));
    let done=false;
    for(const el of candidates){
      if(/^Foto de ticket$/i.test(leafText(el)) && isLeafish(el)){
        el.innerHTML=modalTitleMarkup();
        try{el.style.textAlign='center';el.style.justifyContent='center';el.style.width='100%';}catch(_){ }
        done=true; break;
      }
    }
    if(!done && !root.querySelector('.ce-hf48-event-modal-title')){
      const head=root.querySelector('.ce-v401-pc-modal-head,.ce-v40-modal-head,.head,.modal-head,[class*="head"]') || root.firstElementChild;
      if(head){const d=document.createElement('div'); d.style.cssText='text-align:center;width:100%;'; d.innerHTML=modalTitleMarkup(); head.prepend(d);}
    }
  }
  function addReceiptTitle(root){
    if(root.querySelector('.ce-hf48-receipt-title')) return;
    const head=root.querySelector('.ce-v468-modal-head,.ce-v465-modal-head,.ce-v464-receipt-head,.ce-receipt-modal-head-v463,.ce-receipt-modal-head,.modal-head,.head') || root.querySelector('[role="dialog"] > div:first-child');
    const label=head?.querySelector?.('span,div,strong,b');
    const title=document.createElement('span');
    title.className=`ce-hf48-receipt-title ${isFinalizado()?'is-finalizado':'is-curso'}`;
    title.textContent=eventTitle();
    if(head){
      if(label && /Justificante de ingreso/i.test(label.textContent||'')) label.insertAdjacentElement('afterend', title);
      else head.insertBefore(title, head.querySelector('button') || null);
    }else{
      const marker=Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b')).find(el=>/^Justificante de ingreso$/i.test(leafText(el))&&isLeafish(el));
      if(marker) marker.insertAdjacentElement('afterend', title);
    }
  }
  function removeCalcHeading(root){
    Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b')).forEach(el=>{
      const tx=leafText(el);
      if(/^CALCULOS\s+POR\s+AGRUPACION\s*\/\s*POR\s+TIENDA\s+Y\s+TICKET/i.test(tx) && isLeafish(el)){
        try{el.remove();}catch(_){ }
      }
    });
  }
  function sortTablesByProduct(root){
    root.querySelectorAll('table').forEach(table=>sortOneTable(table));
  }
  function sortOneTable(table){
    if(!table || table.dataset.ceHf48Sorted==='1') return;
    const rows=Array.from(table.rows||[]);
    if(rows.length<2) return;
    let headerIndex=rows.findIndex(r=>Array.from(r.cells||[]).some(c=>/producto/i.test(c.textContent||'')) && Array.from(r.cells||[]).some(c=>/precio|uds|total|valor/i.test(c.textContent||'')));
    if(headerIndex<0) return;
    const header=rows[headerIndex];
    const cells=Array.from(header.cells||[]);
    const productIdx=Math.max(0,cells.findIndex(c=>/producto/i.test(c.textContent||'')));
    const parent=header.parentElement; if(!parent) return;
    const before=rows.slice(0,headerIndex).filter(r=>!/producto/i.test(r.textContent||''));
    const after=rows.slice(headerIndex+1);
    const data=after.filter(r=>r.cells&&r.cells.length>productIdx&&text(r.cells[productIdx]?.textContent)&&!/^(TOTAL|SUBTOTAL)\b/i.test(text(r.cells[0]?.textContent||'')));
    const totals=after.filter(r=>!/producto/i.test(r.textContent||'') && /^(TOTAL|SUBTOTAL)\b/i.test(text(r.cells?.[0]?.textContent||'')));
    const sorted=data.slice().sort((a,b)=>text(a.cells[productIdx]?.textContent).localeCompare(text(b.cells[productIdx]?.textContent),'es',{sensitivity:'base'}));
    try{
      header.classList.add('ce-hf48-table-head');
      if(header.parentElement!==parent) parent.appendChild(header);
      rows.forEach(r=>{try{r.remove();}catch(_){}});
      before.forEach(r=>parent.appendChild(r));
      parent.appendChild(header);
      sorted.forEach(r=>parent.appendChild(r));
      totals.forEach(r=>parent.appendChild(r));
      table.dataset.ceHf48Sorted='1';
    }catch(_){ }
  }
  function patchModals(){
    // HOTFIX51: desactivado aquí. La normalización real de visores se hace en v15-hotfix25-rebase49-correcciones.js
    // para evitar que este hotfix y el 49 creen títulos duplicados en cascada.
    return;
  }

  function patchTooltipTables(){
    document.querySelectorAll('#ceTooltipV21 table.ce-v21-table,#ceBudgetLiteTooltipV307 table').forEach(table=>{
      const rows=Array.from(table.rows||[]); if(rows.length<2) return;
      const headerIndex=rows.findIndex(r=>{
        const t=Array.from(r.cells||[]).map(c=>up(c.textContent)).join('|');
        return /PRODUCTO/.test(t) && /(UDS|PRECIO|TOTAL|VALOR|ESTIMADO)/.test(t);
      });
      if(headerIndex<0) return;
      const header=rows[headerIndex];
      const cells=Array.from(header.cells||[]);
      const productIdx=Math.max(0,cells.findIndex(c=>/producto/i.test(c.textContent||'')));
      const parent=header.parentElement; if(!parent) return;
      const data=rows.filter((r,i)=>i!==headerIndex && r.cells && r.cells.length>productIdx && text(r.cells[productIdx]?.textContent) && !/^(TOTAL|SUBTOTAL)\b/i.test(text(r.cells[0]?.textContent||'')));
      const totals=rows.filter((r,i)=>i!==headerIndex && /^(TOTAL|SUBTOTAL)\b/i.test(text(r.cells?.[0]?.textContent||'')));
      data.sort((a,b)=>text(a.cells[productIdx]?.textContent).localeCompare(text(b.cells[productIdx]?.textContent),'es',{sensitivity:'base'}));
      try{
        rows.forEach(r=>r.remove());
        header.classList.add('ce-hf48-table-head');
        parent.appendChild(header);
        data.forEach(r=>parent.appendChild(r));
        totals.forEach(r=>parent.appendChild(r));
      }catch(_){ }
    });
  }

  function stabilizeEventSwitch(){
    // Refuerzo de cambio rápido de evento: cancela renders viejos y fuerza que no queden listas del evento anterior.
    const sel=$('selectedEvent');
    if(sel && !sel.__ceHf48SwitchBound){
      sel.__ceHf48SwitchBound=true;
      sel.addEventListener('change',()=>{
        document.body.classList.add('ce-hf48-event-switching');
        cleanupInlineAvance();
        setTimeout(()=>document.body.classList.remove('ce-hf48-event-switching'),1800);
        setTimeout(()=>{try{window.ControlEventBudgetLiteTips?.hide?.();}catch(_){ }},0);
      },true);
    }
  }

  let sched=0;
  function schedule(){
    if(sched) return;
    sched=setTimeout(()=>{sched=0; run();},40);
  }
  function run(){
    injectStyle(); stripLogoTitle(); cleanupInlineAvance(); patchModals(); patchTooltipTables(); stabilizeEventSwitch();
  }

  document.addEventListener('click',logoHandler,true);
  document.addEventListener('pointerup',logoHandler,true);
  document.addEventListener('click',openMaintenanceFromDocuments,true);
  document.addEventListener('click',clearMaintOverrideOnTab,true);
  document.addEventListener('keydown',ev=>{if(ev.key==='Escape') $('ceHf48AvanceLayer')?.classList.remove('visible');},true);
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,60));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,60));
  document.addEventListener('change',ev=>{if(ev.target?.id==='selectedEvent') setTimeout(run,80);},true);
  try{ new MutationObserver(schedule).observe(document.body||document.documentElement,{childList:true,subtree:true,characterData:true}); }catch(_){ }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  [120,400,1000,2200,4200].forEach(ms=>setTimeout(run,ms));
  window.ControlEventHf48=Object.assign(window.ControlEventHf48||{}, {showAvance:showAvanceBubble, cleanupAvance:cleanupInlineAvance, patchModals, patchTooltipTables, openMaintenanceFromDocuments});
})();
