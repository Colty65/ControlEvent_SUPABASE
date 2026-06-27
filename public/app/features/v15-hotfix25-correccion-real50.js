/* ControlEvent v15_prod - HOTFIX50: corrección real de duplicados en modales, colores de AVANCE y limpieza final. */
(function(){
  'use strict';
  const INSTALLED='__ceV15Hotfix25CorreccionReal50';
  if(window[INSTALLED]) return;
  window[INSTALLED]=true;

  const $=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toUpperCase();
  const state=()=>{try{return (typeof window.state!=='undefined'&&window.state)||window.ControlEventApp?.state||{};}catch(_){return {};}};
  const arr=n=>Array.isArray(state()[n])?state()[n]:[];
  const evId=()=>txt($('selectedEvent')?.value || state().selectedEventId || '');
  const eventObj=()=>{
    const id=evId();
    try{ if(typeof window.selectedEvent==='function'){ const e=window.selectedEvent(); if(e) return e; } }catch(_){ }
    return arr('eventos').find(e=>String(e?.id||'')===id) || {};
  };
  const eventTitle=()=>{
    const e=eventObj();
    const t=txt(e.titulo || $('selectedEvent')?.selectedOptions?.[0]?.textContent || '');
    return t.replace(/^EVENTO\s*:\s*/i,'').replace(/\s*\(del\s+\d{1,2}\/\d{1,2}\/\d{2,4}.*$/i,'').trim() || 'Evento';
  };
  const isFinal=()=>norm(eventObj().situacion||'')==='FINALIZADO' || !!document.querySelector('.event-status.finalizado,.badge-finalizado');
  const isVisible=el=>{
    try{ const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); return r.width>20 && r.height>20 && cs.display!=='none' && cs.visibility!=='hidden'; }catch(_){return false;}
  };
  const isLeaf=el=>!!el && !el.querySelector('table,img,video,canvas,input,select,textarea,button,svg');
  const leafText=el=>txt(el?.textContent||'');
  const sameTitle=el=>norm(leafText(el))===norm(eventTitle());

  function ensureStyle(){
    if($('ceHf50Style')) return;
    const st=document.createElement('style');
    st.id='ceHf50Style';
    st.textContent=`
      .ce-hf50-modal-head{display:grid!important;grid-template-columns:auto 1fr auto!important;gap:12px!important;align-items:center!important;width:100%!important;margin:0 0 14px 0!important;box-sizing:border-box!important;}
      .ce-hf50-modal-label{font-weight:950!important;font-size:clamp(16px,2vw,20px)!important;color:#0f172a!important;white-space:nowrap!important;}
      .ce-hf50-title{display:block!important;text-align:center!important;font-weight:950!important;line-height:1.14!important;white-space:normal!important;margin:0!important;padding:0 10px!important;font-size:clamp(16px,2.3vw,24px)!important;}
      .ce-hf50-title.is-curso{color:#15803d!important}.ce-hf50-title.is-final{color:#991b1b!important}
      .ce-hf50-modal-head button{justify-self:end!important;}
      .ce-hf50-ticket-title{width:100%!important;margin:0 0 14px 0!important;}
      .ce-hf50-hidden-old-title{display:none!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-hf50-avance-ingresos{background:#eff6ff!important;border-color:#2563eb!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-hf50-avance-fotos-ingresos{background:#ecfdf5!important;border-color:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-hf50-avance-donaciones{background:#fff7ed!important;border-color:#f59e0b!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-hf50-avance-compras{background:#fef2f2!important;border-color:#ef4444!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-hf50-avance-documentos{background:#f0fdf4!important;border-color:#22c55e!important;}
      #ceHf48AvanceLayer .ce-hf48-row.ce-hf50-avance-fotos-tickets{background:#faf5ff!important;border-color:#8b5cf6!important;}
      #ceBudgetLiteTooltipV307 table thead,#ceTooltipV21 table thead{display:table-header-group!important;}
      #ceBudgetLiteTooltipV307 table th,#ceTooltipV21 table th,#ceBudgetLiteTooltipV307 table tr.ce-hf50-head td,#ceTooltipV21 table tr.ce-hf50-head td{font-weight:950!important;background:#f1f5f9!important;color:#0f172a!important;}
    `;
    document.head.appendChild(st);
  }

  function modalRoots(){
    const set=new Set();
    document.querySelectorAll('.ce-v468-modal,.ce-v465-modal,.ce-v464-modal,.ce-receipt-modal-v463,.ce-receipt-modal,.ce-v40-modal,.ce-v401-pc-modal,#ceV401PcPhotoModal,#ceV40TicketPhotoModal,#ceV104TicketDetail,#ceV103TicketDetail,#ceTicketModalV234,#ceTicketImageModalV225,.modal,.dialog,[role="dialog"],[class*="modal"],[class*="Modal"]').forEach(el=>{ if(isVisible(el)) set.add(el); });
    Array.from(document.body?.children||[]).forEach(el=>{
      if(!isVisible(el)) return;
      const t=el.textContent||'';
      if(/Justificante de ingreso|Ticket\/Otros|Foto de ticket|TK\d|CALCULOS\s+POR\s+AGRUPACION/i.test(t)) set.add(el);
      try{ const cs=getComputedStyle(el); if((cs.position==='fixed'||cs.position==='absolute') && /Justificante de ingreso|Ticket\/Otros|TK\d|Foto de ticket/i.test(t)) set.add(el); }catch(_){ }
    });
    return Array.from(set).sort((a,b)=> (a.contains(b)?1:b.contains(a)?-1:0));
  }

  function makeTitle(cls){
    const sp=document.createElement('span');
    sp.className=`ce-hf50-title ${cls||''} ${isFinal()?'is-final':'is-curso'}`;
    sp.textContent=eventTitle();
    return sp;
  }

  function removeOldTitles(root, keep){
    if(!root) return;
    root.querySelectorAll('.ce-hf48-event-modal-title,.ce-hf48-receipt-title,.ce-hf49-title,.ce-hf50-title').forEach(el=>{
      if(el!==keep){ try{el.remove();}catch(_){ el.classList.add('ce-hf50-hidden-old-title'); } }
    });
    const title=eventTitle();
    if(!title || title==='Evento') return;
    Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b,p')).forEach(el=>{
      if(el===keep || (keep && el.contains(keep)) || (keep && keep.contains(el))) return;
      if(!isLeaf(el)) return;
      if(sameTitle(el)){
        try{ el.remove(); }catch(_){ el.classList.add('ce-hf50-hidden-old-title'); }
      }
    });
  }

  function findClose(root){
    const buttons=Array.from(root.querySelectorAll('button,[role="button"]')).filter(isVisible);
    return buttons.find(b=>/cerrar|×|\bx\b/i.test(txt(b.textContent||b.getAttribute('aria-label')||b.title||''))) || null;
  }

  function normalizeReceipt(root){
    if(root.__ceHf50ReceiptBusy) return;
    root.__ceHf50ReceiptBusy=true;
    try{
      const close=findClose(root);
      removeOldTitles(root, null);
      const oldLabel=Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b')).find(el=>isLeaf(el) && /^Justificante de ingreso$/i.test(leafText(el)));
      if(oldLabel){ try{ oldLabel.remove(); }catch(_){ oldLabel.classList.add('ce-hf50-hidden-old-title'); } }
      const head=document.createElement('div');
      head.className='ce-hf50-modal-head ce-hf50-receipt-head';
      const label=document.createElement('span');
      label.className='ce-hf50-modal-label';
      label.textContent='Justificante de ingreso';
      const title=makeTitle('ce-hf50-receipt-title');
      head.appendChild(label);
      head.appendChild(title);
      if(close){ try{ head.appendChild(close); }catch(_){ const ph=document.createElement('span'); head.appendChild(ph); } }
      else { const ph=document.createElement('span'); head.appendChild(ph); }
      root.insertBefore(head, root.firstChild);
      removeOldTitles(root, title);
    }finally{ setTimeout(()=>{ root.__ceHf50ReceiptBusy=false; },0); }
  }

  function normalizeTicket(root){
    if(root.__ceHf50TicketBusy) return;
    root.__ceHf50TicketBusy=true;
    try{
      removeOldTitles(root, null);
      Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b,p')).forEach(el=>{
        if(!isLeaf(el)) return;
        const t=leafText(el);
        if(/^Foto de ticket$/i.test(t) || /^CALCULOS\s+POR\s+AGRUPACION\s*\/\s*POR\s+TIENDA\s+Y\s+TICKET/i.test(t)){
          try{ el.remove(); }catch(_){ el.classList.add('ce-hf50-hidden-old-title'); }
        }
      });
      const title=makeTitle('ce-hf50-ticket-title');
      root.insertBefore(title, root.firstChild);
      removeOldTitles(root, title);
      root.querySelectorAll('table').forEach(sortTableByProduct);
    }finally{ setTimeout(()=>{ root.__ceHf50TicketBusy=false; },0); }
  }

  function sortTableByProduct(table){
    if(!table || table.__ceHf50Sorting) return;
    table.__ceHf50Sorting=true;
    try{
      const rows=Array.from(table.rows||[]);
      if(rows.length<2) return;
      let headerIndex=rows.findIndex(r=>Array.from(r.cells||[]).some(c=>/producto/i.test(c.textContent||'')));
      if(headerIndex<0) return;
      const header=rows[headerIndex];
      const cells=Array.from(header.cells||[]);
      const productIdx=Math.max(0,cells.findIndex(c=>/producto/i.test(c.textContent||'')));
      const parent=header.parentElement;
      if(!parent) return;
      const bodyRows=[]; const totals=[]; const pre=[];
      rows.forEach((r,i)=>{
        if(i===headerIndex) return;
        const first=txt(r.cells?.[0]?.textContent||'');
        const prod=txt(r.cells?.[productIdx]?.textContent||'');
        if(/^TOTAL\b|^SUBTOTAL\b/i.test(first)) totals.push(r);
        else if(prod) bodyRows.push(r);
        else pre.push(r);
      });
      bodyRows.sort((a,b)=>txt(a.cells[productIdx]?.textContent).localeCompare(txt(b.cells[productIdx]?.textContent),'es',{sensitivity:'base'}));
      rows.forEach(r=>{ try{r.remove();}catch(_){} });
      pre.forEach(r=>parent.appendChild(r));
      header.classList.add('ce-hf50-head');
      parent.appendChild(header);
      bodyRows.forEach(r=>parent.appendChild(r));
      totals.forEach(r=>parent.appendChild(r));
    }finally{ setTimeout(()=>{ table.__ceHf50Sorting=false; },0); }
  }

  const avanceColors=[
    {re:/\b1\s*[·.\-:]?\s*INGRESOS\b/i, cls:'ce-hf50-avance-ingresos', color:'#2563eb', bg:'#eff6ff'},
    {re:/FOTOS?\s+INGRESOS/i, cls:'ce-hf50-avance-fotos-ingresos', color:'#16a34a', bg:'#ecfdf5'},
    {re:/DONACIONES/i, cls:'ce-hf50-avance-donaciones', color:'#f59e0b', bg:'#fff7ed'},
    {re:/COMPRAS/i, cls:'ce-hf50-avance-compras', color:'#ef4444', bg:'#fef2f2'},
    {re:/DOCUMENTOS/i, cls:'ce-hf50-avance-documentos', color:'#22c55e', bg:'#f0fdf4'},
    {re:/FOTOS?\s+TICKETS?/i, cls:'ce-hf50-avance-fotos-tickets', color:'#8b5cf6', bg:'#faf5ff'}
  ];
  function colorAvance(){
    const candidates=[];
    document.querySelectorAll('#ceHf48AvanceLayer,.ce-hf48-avance-card,[id*="Avance"],[class*="avance"],[class*="Avance"]').forEach(el=>{ if(isVisible(el) && /AVANCE\s+DEL\s+EVENTO/i.test(el.textContent||'')) candidates.push(el); });
    Array.from(document.body?.children||[]).forEach(el=>{ if(isVisible(el) && /AVANCE\s+DEL\s+EVENTO/i.test(el.textContent||'')) candidates.push(el); });
    [...new Set(candidates)].forEach(root=>{
      let rows=Array.from(root.querySelectorAll('.ce-hf48-row,.avance-row,.progress-row,.row'));
      if(!rows.length){
        rows=Array.from(root.querySelectorAll('div,li')).filter(el=>isVisible(el) && /\b(INGRESOS|DONACIONES|COMPRAS|DOCUMENTOS|TICKETS)\b/i.test(el.textContent||'') && (el.querySelector('[style*="width"],i') || el.children.length>=2));
      }
      rows.forEach(row=>{
        const t=row.textContent||'';
        const cfg=avanceColors.find(c=>c.re.test(t));
        if(!cfg) return;
        avanceColors.forEach(c=>row.classList.remove(c.cls));
        row.classList.add(cfg.cls);
        row.style.setProperty('background',cfg.bg,'important');
        row.style.setProperty('border-color',cfg.color,'important');
        const fills=Array.from(row.querySelectorAll('.ce-hf48-bar i,.progress-bar i,.bar i,[style*="width"]')).filter(el=>{
          const cs=getComputedStyle(el); return (el.tagName==='I' || /bar|progress/i.test(el.className||'') || parseFloat(cs.width)>20) && parseFloat(cs.height)>2;
        });
        fills.forEach(el=>{
          el.style.setProperty('background',cfg.color,'important');
          el.style.setProperty('background-color',cfg.color,'important');
        });
      });
    });
  }

  function patchModals(){
    modalRoots().forEach(root=>{
      const t=root.textContent||'';
      if(/Justificante de ingreso/i.test(t)) normalizeReceipt(root);
      if(/Foto de ticket|Ticket\/Otros|TK\d|CALCULOS\s+POR\s+AGRUPACION/i.test(t)) normalizeTicket(root);
    });
  }

  function patchTooltipTables(){
    document.querySelectorAll('#ceBudgetLiteTooltipV307 table,#ceTooltipV21 table,.ce-budget-lite-tooltip-v306 table,[id*="Tooltip"] table,[class*="tooltip"] table,[class*="globo"] table').forEach(sortTableByProduct);
  }

  function run(){
    ensureStyle();
    patchModals();
    colorAvance();
    patchTooltipTables();
  }
  let timer=0;
  function schedule(){ clearTimeout(timer); timer=setTimeout(run,80); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  document.addEventListener('click',()=>setTimeout(run,90),true);
  document.addEventListener('mouseover',()=>setTimeout(()=>{colorAvance(); patchTooltipTables();},120),true);
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,150));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,150));
  try{ new MutationObserver(schedule).observe(document.body||document.documentElement,{childList:true,subtree:true,characterData:true}); }catch(_){ }
  [120,350,800,1600,3000].forEach(ms=>setTimeout(run,ms));
  window.ControlEventHf50=Object.assign(window.ControlEventHf50||{}, {run, patchModals, colorAvance, patchTooltipTables});
})();
