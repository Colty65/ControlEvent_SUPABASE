/* ControlEvent v23_prod_r1 - HOTFIX49: limpia títulos duplicados, colorea avance, globos con cabecera/productos A-Z. */
(function(){
  'use strict';
  const INSTALLED='__ceV15Hotfix24ModalAvanceSaldo49';
  if(window[INSTALLED]) return;
  window[INSTALLED]=true;

  const $=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=(fn,fb)=>{try{const v=fn(); return v===undefined?fb:v;}catch(_){return fb;}};
  const state=()=>safe(()=> (typeof window.state!=='undefined'&&window.state)||window.ControlEventApp?.state||{}, {});
  const arr=n=>Array.isArray(state()[n])?state()[n]:[];
  const evId=()=>txt($('selectedEvent')?.value || state().selectedEventId || '');
  const eventObj=()=>{
    const id=evId();
    return arr('eventos').find(e=>String(e?.id||'')===id) || safe(()=> (typeof selectedEvent==='function'?selectedEvent():null), null) || {};
  };
  const eventTitle=()=>txt(eventObj().titulo || $('selectedEvent')?.selectedOptions?.[0]?.textContent || 'Evento');
  const isFinal=()=>norm(eventObj().situacion || '')==='FINALIZADO';
  const isLeaf=el=>!!el && !el.querySelector('table,img,video,canvas,input,select,textarea,button');
  const leafText=el=>txt(el?.textContent||'');
  const sameTitle=el=>norm(leafText(el))===norm(eventTitle());

  function injectStyle(){
    if($('ceHf49Style')) return;
    const style=document.createElement('style'); style.id='ceHf49Style';
    style.textContent=`
      /* Colores del globo AVANCE DEL EVENTO: mismos criterios visuales que GRAFICAS */
      #ceHf48AvanceLayer .ce-hf48-row{border-width:2px!important;box-shadow:0 6px 14px rgba(15,23,42,.06)!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(1){background:#eff6ff!important;border-color:#2563eb!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(1) .ce-hf48-bar i{background:#2563eb!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(2){background:#ecfdf5!important;border-color:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(2) .ce-hf48-bar i{background:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(3){background:#fff7ed!important;border-color:#f59e0b!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(3) .ce-hf48-bar i{background:#f59e0b!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(4){background:#fef2f2!important;border-color:#ef4444!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(4) .ce-hf48-bar i{background:#ef4444!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(5){background:#f0fdf4!important;border-color:#22c55e!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(5) .ce-hf48-bar i{background:#22c55e!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(6){background:#faf5ff!important;border-color:#8b5cf6!important;}
      #ceHf48AvanceLayer .ce-hf48-row:nth-child(6) .ce-hf48-bar i{background:#8b5cf6!important;}

      .ce-hf49-title{display:block!important;text-align:center!important;font-weight:950!important;line-height:1.16!important;white-space:normal!important;margin:0!important;padding:0 10px!important;}
      .ce-hf49-title.is-curso{color:#15803d!important}.ce-hf49-title.is-final{color:#991b1b!important}
      .ce-hf49-ticket-title{width:100%!important;font-size:clamp(16px,2.4vw,23px)!important;margin:0 0 14px!important;}
      .ce-hf49-receipt-title{flex:1 1 auto!important;font-size:clamp(15px,2.1vw,20px)!important;}
      .ce-hf49-receipt-head{display:flex!important;align-items:center!important;gap:12px!important;width:100%!important;box-sizing:border-box!important;}
      .ce-hf49-receipt-head button{margin-left:auto!important;}
      #ceBudgetLiteTooltipV307 table thead,#ceTooltipV21 table thead{display:table-header-group!important;}
      #ceBudgetLiteTooltipV307 table th,#ceTooltipV21 table th,#ceBudgetLiteTooltipV307 table tr.ce-hf49-head td,#ceTooltipV21 table tr.ce-hf49-head td{font-weight:950!important;background:#f1f5f9!important;color:#0f172a!important;}
    `;
    document.head.appendChild(style);
  }

  function removeOldTitleCopies(root){
    if(!root) return;
    root.querySelectorAll('.ce-hf48-event-modal-title,.ce-hf48-receipt-title,.ce-hf49-title').forEach(el=>{try{el.remove();}catch(_){}});
    const title=eventTitle();
    if(!title || title==='Evento') return;
    // Quita solo textos sueltos que coincidan exactamente con el título del evento dentro de modales.
    Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b')).forEach(el=>{
      if(!isLeaf(el)) return;
      if(!sameTitle(el)) return;
      const cls=String(el.className||'');
      const tag=String(el.tagName||'').toUpperCase();
      if(/ce-hf48|ce-hf49|modal-title|event-modal-title|receipt-title/i.test(cls) || /^H[1-4]$/.test(tag) || el.parentElement?.children?.length<=3){
        try{el.remove();}catch(_){ }
      }
    });
  }

  function titleNode(kind){
    const span=document.createElement('span');
    span.className=`ce-hf49-title ${kind==='receipt'?'ce-hf49-receipt-title':'ce-hf49-ticket-title'} ${isFinal()?'is-final':'is-curso'}`;
    span.textContent=eventTitle();
    return span;
  }

  function normalizeReceiptModal(root){
    removeOldTitleCopies(root);
    // Localiza el texto Justificante de ingreso y monta una única cabecera: texto + título + cerrar.
    const candidates=Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b'));
    let label=candidates.find(el=>isLeaf(el) && /^Justificante de ingreso$/i.test(leafText(el)));
    if(!label) return;
    let head=label.parentElement || label;
    // Si el padre contiene demasiada cosa del cuerpo, crea una cabecera limpia antes del cuerpo.
    if(head && (head.querySelector('img,table') || (head.textContent||'').length>180)) head=label;
    const closeBtn=root.querySelector('button, .close, [aria-label="Cerrar"]');
    let row=head.classList?.contains('ce-hf49-receipt-head') ? head : document.createElement('div');
    row.className='ce-hf49-receipt-head';
    if(row!==head){
      try{ label.replaceWith(row); }catch(_){ try{ root.insertBefore(row, root.firstChild); }catch(__){} }
      row.appendChild(label);
    }
    if(!row.querySelector('.ce-hf49-receipt-title')) row.appendChild(titleNode('receipt'));
    if(closeBtn && closeBtn.parentElement!==row && /cerrar|×|x/i.test(closeBtn.textContent||closeBtn.getAttribute('aria-label')||'')){
      try{ row.appendChild(closeBtn); }catch(_){ }
    }
  }

  function normalizeTicketModal(root){
    removeOldTitleCopies(root);
    Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b')).forEach(el=>{
      if(isLeaf(el) && /^CALCULOS\s+POR\s+AGRUPACION\s*\/\s*POR\s+TIENDA\s+Y\s+TICKET/i.test(leafText(el))) try{el.remove();}catch(_){ }
    });
    const candidates=Array.from(root.querySelectorAll('h1,h2,h3,h4,.modal-title,.ce-modal-title,div,span,strong,b'));
    let label=candidates.find(el=>isLeaf(el) && /^Foto de ticket$/i.test(leafText(el)));
    const title=titleNode('ticket');
    if(label){
      try{label.replaceWith(title);}catch(_){root.insertBefore(title, root.firstChild);}
    }else{
      // Inserta un único título arriba del contenido real del modal, no a la derecha ni dentro de una columna.
      const first=root.firstElementChild;
      try{ root.insertBefore(title, first || null); }catch(_){ }
    }
  }

  function sortTableByProduct(table){
    if(!table) return;
    const rows=Array.from(table.rows||[]);
    if(rows.length<2) return;
    const headerIndex=rows.findIndex(r=>Array.from(r.cells||[]).some(c=>/producto/i.test(c.textContent||'')));
    if(headerIndex<0) return;
    const header=rows[headerIndex];
    const cells=Array.from(header.cells||[]);
    const productIdx=Math.max(0,cells.findIndex(c=>/producto/i.test(c.textContent||'')));
    const parent=header.parentElement; if(!parent) return;
    const bodyRows=rows.filter((r,i)=>i!==headerIndex && r.cells && r.cells.length>productIdx && txt(r.cells[productIdx]?.textContent) && !/^TOTAL\b|^SUBTOTAL\b/i.test(txt(r.cells[0]?.textContent||'')));
    const totals=rows.filter((r,i)=>i!==headerIndex && /^TOTAL\b|^SUBTOTAL\b/i.test(txt(r.cells?.[0]?.textContent||'')));
    bodyRows.sort((a,b)=>txt(a.cells[productIdx]?.textContent).localeCompare(txt(b.cells[productIdx]?.textContent),'es',{sensitivity:'base'}));
    try{
      rows.forEach(r=>r.remove());
      header.classList.add('ce-hf49-head');
      parent.appendChild(header);
      bodyRows.forEach(r=>parent.appendChild(r));
      totals.forEach(r=>parent.appendChild(r));
    }catch(_){ }
  }

  function patchModals(){
    // HOTFIX51: no tocar visores aquí; se corrigen de forma específica y segura en v15-hotfix25.
    return;
  }


  function patchTooltipTables(){
    document.querySelectorAll('#ceBudgetLiteTooltipV307 table,#ceTooltipV21 table,.ce-budget-lite-tooltip-v306 table,[id*="Tooltip"] table').forEach(sortTableByProduct);
  }

  let timer=0;
  function run(){
    injectStyle();
    patchModals();
    patchTooltipTables();
  }
  function schedule(){
    clearTimeout(timer);
    timer=setTimeout(run,70);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  document.addEventListener('click',()=>setTimeout(run,80),true);
  document.addEventListener('mouseover',()=>setTimeout(patchTooltipTables,120),true);
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,120));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,120));
  try{ new MutationObserver(schedule).observe(document.body||document.documentElement,{childList:true,subtree:true}); }catch(_){ }
  [150,500,1200,2500].forEach(ms=>setTimeout(run,ms));
  window.ControlEventHf49=Object.assign(window.ControlEventHf49||{}, {run, patchModals, patchTooltipTables});
})();
