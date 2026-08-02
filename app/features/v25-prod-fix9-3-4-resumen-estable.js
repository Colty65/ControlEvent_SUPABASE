/* ControlEvent v25_prod - FIX9.3.4: Resumen estable sin retemblores.
   Autoridad final para RESUMEN PRESUPUESTARIO y Cálculos por tienda/ticket.
   Intercepta los manejadores hover legacy antes de que lleguen a document,
   mantiene el DOM sin reconstrucciones periódicas y reutiliza el visor de GRÁFICAS. */
(function(){
  'use strict';
  const INSTALLED='__ceV25Fix934ResumenEstable';
  if(window[INSTALLED]) return;
  window[INSTALLED]=true;
  const $=id=>document.getElementById(id);
  const norm=v=>String(v??'').trim();
  const escFile=v=>norm(v).replace(/[^a-zA-Z0-9._-]+/g,'-').replace(/^-+|-+$/g,'')||'ticket';
  const LEGACY_ATTRS=[
    'title','data-tip','data-ce-tip','data-v181-tip','data-ce-tip-v196','data-ce-tip-v1952',
    'data-ce-tip-v21','data-tip-bg-v21','data-ce-tip-layout-v21','data-ce-tip-lazy-v250',
    'data-ce-tip-bg','data-ce-tip-layout','data-tip-bg-v196','data-tip-bg-v1952',
    'data-ce-tip-layout-v20','data-ce-tip-layout-v196','data-ce-tip-black'
  ];
  let sanitizing=false;
  let pending=0;

  function inStableZone(target){
    const el=target?.nodeType===1?target:target?.parentElement;
    return !!el?.closest?.('#budgetLayout,#summaryTiendaTicket,#ceBudgetLiteTooltipV307');
  }

  // Los listeners legacy están registrados en document. Al detener estos eventos
  // en window se evita que añadan/quiten atributos, flechas y cajas al pasar el ratón.
  function stopLegacyHover(event){
    if(!inStableZone(event.target)) return;
    try{event.stopImmediatePropagation();event.stopPropagation();}catch(_){ }
  }
  ['mouseover','mouseout','mousemove','mouseenter','mouseleave','pointerover','pointerout'].forEach(type=>{
    window.addEventListener(type,stopLegacyHover,true);
  });

  function removeLegacy(node){
    if(!node?.removeAttribute) return;
    LEGACY_ATTRS.forEach(attr=>{if(node.hasAttribute(attr)) node.removeAttribute(attr);});
    node.classList?.remove('ce-v15hf6-summary-collapsed','ce-v15hf7-summary-collapsed','ce-hf9-collapsed','summary-tip');
  }

  function decorateSummaryThumb(img,row){
    if(!img||!row) return;
    const src=norm(img.currentSrc||img.src||img.dataset.ceV17Src||'');
    if(!src) return;
    const label=norm(row.dataset.ceV17Label||row.dataset.ceTicketLabel||row.querySelector('.ce-hf10-label,span:first-child')?.textContent||'TKxx');
    const tk=(label.match(/\bTK\s*\d+[A-Z0-9_-]*\b/i)||[])[0]?.replace(/\s+/g,'').toUpperCase()||'TKxx';
    const store=label.split('|')[0]?.trim()||'Tienda';
    img.loading='eager';
    img.decoding='async';
    img.width=36;
    img.height=36;
    img.setAttribute('data-ce-g92-photo','1');
    img.dataset.imageSrc=src;
    img.dataset.photoTitle=`${tk} · ${store}`;
    img.dataset.downloadName=`${escFile(tk)}-${escFile(store)}.jpg`;
    img.dataset.ticketCode=tk;
    img.dataset.storeName=store;
    img.setAttribute('role','button');
    img.setAttribute('tabindex','0');
    img.setAttribute('aria-label',`Ver ${tk} · ${store}`);
  }

  function sanitizeSummary(){
    const root=$('summaryTiendaTicket');
    if(!root) return;
    root.classList.add('ce-fix934-stable-owner');
    root.querySelectorAll('.ce-v17-doc-row').forEach(row=>{
      removeLegacy(row);
      row.querySelectorAll('*').forEach(removeLegacy);
      const expected=norm(row.dataset.ceV17Label||row.dataset.ceTicketLabel||'');
      const label=row.querySelector('.ce-hf10-label');
      if(expected&&label&&norm(label.textContent)!==expected) label.textContent=expected;
      const thumbs=Array.from(row.querySelectorAll('img.ce-v17-doc-thumb,img[src*="ticket-images"],img[src^="data:image/"]'));
      thumbs.forEach((img,index)=>{
        if(index===0) decorateSummaryThumb(img,row);
        else img.remove();
      });
    });
  }

  function sanitizeBudget(){
    const root=$('budgetLayout');
    if(root){
      root.classList.add('ce-fix934-stable-owner');
      root.querySelectorAll('.budget-panel,.budget-row,.budget-subrow,.budget-row *,.budget-subrow *').forEach(removeLegacy);
    }
    const tip=$('ceBudgetLiteTooltipV307');
    if(tip){
      tip.querySelectorAll('.ce-budget-ticket-thumb').forEach(button=>{
        const img=button.querySelector('img');
        if(!img) return;
        img.loading='eager'; img.decoding='async'; img.width=48; img.height=48;
        const src=norm(button.dataset.imageSrc||img.currentSrc||img.src||'');
        if(src) button.dataset.imageSrc=src;
      });
    }
  }

  function sanitize(){
    if(sanitizing) return;
    sanitizing=true;
    try{sanitizeBudget();sanitizeSummary();}finally{sanitizing=false;}
  }
  function schedule(){
    if(pending) return;
    pending=requestAnimationFrame(()=>{pending=0;sanitize();});
  }

  const observer=new MutationObserver(records=>{
    if(sanitizing) return;
    if(records.some(record=>inStableZone(record.target)||Array.from(record.addedNodes||[]).some(inStableZone))) schedule();
  });
  try{observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,characterData:true});}catch(_){ }

  const style=document.createElement('style');
  style.id='ceV25Fix934ResumenEstableStyle';
  style.textContent=`
    #budgetLayout,#budgetLayout *,#summaryTiendaTicket,#summaryTiendaTicket *,#ceBudgetLiteTooltipV307,#ceBudgetLiteTooltipV307 *{
      animation:none!important;transition:none!important;scroll-behavior:auto!important;
    }
    #budgetLayout .budget-row,#budgetLayout .budget-subrow,#summaryTiendaTicket .ce-v17-doc-row{
      transform:none!important;will-change:auto!important;backface-visibility:hidden!important;
    }
    #summaryTiendaTicket.ce-fix934-stable-owner{contain:layout paint!important;overflow-anchor:none!important;}
    #summaryTiendaTicket .ce-v17-doc-row{min-height:46px!important;height:auto!important;contain:layout paint!important;}
    #summaryTiendaTicket .ce-v17-doc-right{min-width:190px!important;min-height:38px!important;}
    #summaryTiendaTicket .ticket-actions,#summaryTiendaTicket .ce-v17-doc-actions{min-width:112px!important;min-height:38px!important;}
    #summaryTiendaTicket img.ce-v17-doc-thumb{display:block!important;width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important;max-width:36px!important;max-height:36px!important;object-fit:cover!important;flex:0 0 36px!important;}
    #ceBudgetLiteTooltipV307 .ce-budget-ticket-thumb-cell{width:64px!important;min-width:64px!important;}
    #ceBudgetLiteTooltipV307 .ce-budget-ticket-thumb,#ceBudgetLiteTooltipV307 .ce-budget-ticket-thumb img{width:48px!important;height:48px!important;min-width:48px!important;min-height:48px!important;max-width:48px!important;max-height:48px!important;}
    #ceBudgetLiteTooltipV307 .ce-budget-ticket-thumb img{display:block!important;object-fit:cover!important;}
    #ceBudgetLiteTooltipV307 table{table-layout:auto!important;}
  `;
  document.head.appendChild(style);

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-ready','controlevent:event-changed'].forEach(name=>window.addEventListener(name,()=>setTimeout(sanitize,40),true));
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#tabResumenBtn,.mobile-menu-action[data-target="tabResumenBtn"]')) setTimeout(sanitize,120);
  },true);
  [0,100,350,900,1800].forEach(ms=>setTimeout(sanitize,ms));
  window.ControlEventFix934ResumenEstable={sanitize,version:'FIX9.3.4'};
})();
