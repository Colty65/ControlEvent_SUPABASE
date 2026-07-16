/* ControlEvent v22_prod - HOTFIX51: rebase limpio sobre HF49.
   Corrige visores sin duplicar títulos, colorea AVANCE por línea y refuerza limpieza de globos. */
(function(){
  'use strict';
  const INSTALLED='__ceV15Hotfix25Rebase49Correcciones';
  if(window[INSTALLED]) return;
  window[INSTALLED]=true;

  const $=id=>document.getElementById(id);
  const txt=v=>String(v??'').trim();
  const norm=v=>txt(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').toUpperCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=(fn,fb)=>{try{const v=fn();return v===undefined?fb:v;}catch(_){return fb;}};
  const state=()=>safe(()=> (typeof window.state!=='undefined'&&window.state)||window.ControlEventApp?.state||{}, {});
  const arr=n=>Array.isArray(state()[n])?state()[n]:[];
  const currentEventId=()=>txt($('selectedEvent')?.value || state().selectedEventId || '');
  const currentEvent=()=>{
    const id=currentEventId();
    return arr('eventos').find(e=>String(e?.id||'')===id) || safe(()=> (typeof selectedEvent==='function'?selectedEvent():null), null) || {};
  };
  const eventTitle=()=>txt(currentEvent().titulo || $('selectedEvent')?.selectedOptions?.[0]?.textContent || 'Evento');
  const isFinal=()=>norm(currentEvent().situacion || '')==='FINALIZADO';
  const leaf=el=>!!el && !el.querySelector('table,img,video,canvas,input,select,textarea,button');
  const leafText=el=>txt(el?.textContent||'');

  function injectStyle(){
    if($('ceHf51Style')) return;
    const style=document.createElement('style'); style.id='ceHf51Style';
    style.textContent=`
      .ce-v51-modal-head{display:flex!important;align-items:center!important;gap:12px!important;width:100%!important;box-sizing:border-box!important;margin:0 0 12px 0!important;padding:0!important;min-height:38px!important;}
      .ce-v51-modal-head .ce-v51-label{flex:0 0 auto!important;font-weight:950!important;font-size:clamp(16px,2.2vw,21px)!important;color:#0f172a!important;white-space:nowrap!important;}
      .ce-v51-modal-head .ce-v51-title{flex:1 1 auto!important;text-align:center!important;font-weight:950!important;font-size:clamp(16px,2.4vw,24px)!important;line-height:1.15!important;padding:0 10px!important;white-space:normal!important;}
      .ce-v51-modal-head .ce-v51-title.is-curso{color:#15803d!important}.ce-v51-modal-head .ce-v51-title.is-final{color:#991b1b!important}
      .ce-v51-modal-head button{flex:0 0 auto!important;margin-left:auto!important;position:static!important;}
      .ce-v51-ticket-head{justify-content:center!important}.ce-v51-ticket-head .ce-v51-title{max-width:100%!important;}
      .ce-v51-hidden-dup{display:none!important;visibility:hidden!important;max-height:0!important;overflow:hidden!important;}
      #ceHf48AvanceLayer .ce-hf48-row{border-width:2px!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="blue"]{background:#eff6ff!important;border-color:#2563eb!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="green"]{background:#ecfdf5!important;border-color:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="orange"]{background:#fff7ed!important;border-color:#f59e0b!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="red"]{background:#fef2f2!important;border-color:#ef4444!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="purple"]{background:#faf5ff!important;border-color:#8b5cf6!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="blue"] .ce-hf48-bar i{background:#2563eb!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="green"] .ce-hf48-bar i{background:#16a34a!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="orange"] .ce-hf48-bar i{background:#f59e0b!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="red"] .ce-hf48-bar i{background:#ef4444!important;}
      #ceHf48AvanceLayer .ce-hf48-row[data-ce-avance-color="purple"] .ce-hf48-bar i{background:#8b5cf6!important;}
    `;
    document.head.appendChild(style);
  }

  function modalRoots(){
    const selectors=[
      '.ce-v468-modal','.ce-v465-modal','.ce-v464-modal','.ce-receipt-modal-v463','.ce-receipt-modal',
      '#ceV401PcPhotoModal','#ceV40TicketPhotoModal','#ceV104TicketDetail','#ceV103TicketDetail','#ceTicketModalV234','#ceTicketImageModalV225',
      '.ce-v401-pc-modal','.ce-v40-modal','.ce-v5017-budget-modal','.ce-v512-budget-photo-modal','.ce-v504-modal','.ce-v505-photo-modal','.ce-v506-photo-modal','.ce-v508-photo-modal'
    ].join(',');
    return Array.from(document.querySelectorAll(selectors));
  }
  function findCard(root){
    return root.querySelector('.ce-v468-modal-card,.ce-v465-modal-card,.ce-v464-receipt-card,.ce-receipt-modal-card-v463,.ce-v401-pc-modal-box,.ce-v40-modal-box,.ce-v5017-budget-modal-card,.ce-v512-budget-photo-card,.ce-v504-modal-card,.ce-v505-photo-card,.ce-v506-photo-card,.ce-v508-photo-card,[role="dialog"]') || root.firstElementChild || root;
  }
  function findHead(card){
    return card.querySelector('.ce-v468-modal-head,.ce-v465-modal-head,.ce-v464-receipt-head,.ce-receipt-modal-head-v463,.ce-receipt-modal-head,.ce-v401-pc-modal-head,.ce-v40-modal-head,.ce-v5017-budget-modal-head,.ce-v512-budget-photo-head,.ce-v504-modal-head,[class*="modal-head"],[class*="receipt-head"],[class*="ticket-head"]');
  }
  function firstClose(root){
    return Array.from(root.querySelectorAll('button')).find(b=>/cerrar|×|x/i.test(txt(b.textContent||b.getAttribute('aria-label')||''))) || null;
  }
  function titleSpan(){
    const s=document.createElement('span');
    s.className='ce-v51-title '+(isFinal()?'is-final':'is-curso');
    s.textContent=eventTitle();
    return s;
  }
  function ensureHead(card, before){
    let head=findHead(card);
    if(!head){
      head=document.createElement('div');
      try{ card.insertBefore(head, before || card.firstChild); }catch(_){ card.prepend(head); }
    }
    return head;
  }
  function removeDuplicateLeaves(root, keepHead, opts={}){
    const titleN=norm(eventTitle());
    Array.from(root.querySelectorAll('.ce-hf48-receipt-title,.ce-hf49-receipt-title,.ce-hf48-event-modal-title,.ce-hf49-title,.ce-v401-event-title')).forEach(el=>{
      if(keepHead && keepHead.contains(el)) return;
      try{el.remove();}catch(_){ el.classList.add('ce-v51-hidden-dup'); }
    });
    Array.from(root.querySelectorAll('h1,h2,h3,h4,div,span,strong,b')).forEach(el=>{
      if(!leaf(el) || (keepHead && keepHead.contains(el))) return;
      const n=norm(leafText(el));
      if(!n) return;
      if((titleN && n===titleN) || (opts.removeJustificante && n==='JUSTIFICANTE DE INGRESO') || (opts.removeFoto && n==='FOTO DE TICKET') || /^CALCULOS\s+POR\s+AGRUPACION\s*\/\s*POR\s+TIENDA\s+Y\s+TICKET/.test(n)){
        try{el.remove();}catch(_){ el.classList.add('ce-v51-hidden-dup'); }
      }
    });
  }

  function normalizeReceipt(root){
    const card=findCard(root); if(!card) return;
    const close=firstClose(root);
    const firstBody=card.querySelector('.ce-v468-modal-info,.ce-v465-modal-info,.ce-v504-modal-info,.ce-v509-modal-info,.ce-v5017-budget-modal-info,.ce-v401-pc-modal-info,img,table') || card.firstElementChild;
    const head=ensureHead(card, firstBody);
    head.className=(head.className?head.className+' ':'')+'ce-v51-modal-head ce-v51-receipt-head';
    head.innerHTML='';
    const label=document.createElement('span'); label.className='ce-v51-label'; label.textContent='Justificante de ingreso';
    head.appendChild(label); head.appendChild(titleSpan());
    if(close) head.appendChild(close);
    removeDuplicateLeaves(root, head, {removeJustificante:true});
  }

  function normalizeTicket(root){
    const card=findCard(root); if(!card) return;
    const close=firstClose(root);
    const firstBody=card.querySelector('.ce-v40-modal-info,.ce-v401-pc-modal-info,.ce-v468-modal-info,table,img') || card.firstElementChild;
    const head=ensureHead(card, firstBody);
    head.className=(head.className?head.className+' ':'')+'ce-v51-modal-head ce-v51-ticket-head';
    head.innerHTML='';
    head.appendChild(titleSpan());
    if(close) head.appendChild(close);
    removeDuplicateLeaves(root, head, {removeFoto:true});
    root.querySelectorAll('table').forEach(sortTableByProduct);
  }

  function sortTableByProduct(table){
    if(!table) return;
    const rows=Array.from(table.rows||[]);
    if(rows.length<2) return;
    const headerIndex=rows.findIndex(r=>Array.from(r.cells||[]).some(c=>/producto/i.test(c.textContent||'')));
    if(headerIndex<0) return;
    const header=rows[headerIndex];
    const cells=Array.from(header.cells||[]);
    const productIdx=cells.findIndex(c=>/producto/i.test(c.textContent||''));
    if(productIdx<0) return;
    const parent=header.parentElement;
    if(!parent) return;
    const before=rows.slice(0,headerIndex).filter(r=>!Array.from(r.cells||[]).some(c=>/producto/i.test(c.textContent||'')));
    const data=rows.slice(headerIndex+1).filter(r=>r.cells && r.cells.length>productIdx && txt(r.cells[productIdx]?.textContent) && !/^(TOTAL|SUBTOTAL)\b/i.test(txt(r.cells[0]?.textContent||'')));
    const totals=rows.slice(headerIndex+1).filter(r=>/^(TOTAL|SUBTOTAL)\b/i.test(txt(r.cells?.[0]?.textContent||'')));
    data.sort((a,b)=>txt(a.cells[productIdx]?.textContent).localeCompare(txt(b.cells[productIdx]?.textContent),'es',{sensitivity:'base'}));
    try{
      rows.forEach(r=>r.remove());
      header.classList.add('ce-hf48-table-head','ce-hf49-head');
      before.forEach(r=>parent.appendChild(r));
      parent.appendChild(header);
      data.forEach(r=>parent.appendChild(r));
      totals.forEach(r=>parent.appendChild(r));
    }catch(_){ }
  }

  function patchModals(){
    modalRoots().forEach(root=>{
      const t=root.textContent||'';
      const isTicket=/Foto de ticket|Ticket\/Otros|TK\d|CALCULOS\s+POR\s+AGRUPACION/i.test(t);
      const isReceipt=/Justificante de ingreso/i.test(t) && !isTicket;
      if(isTicket) normalizeTicket(root);
      else if(isReceipt) normalizeReceipt(root);
    });
  }

  function colorAvance(){
    const rows=Array.from(document.querySelectorAll('#ceHf48AvanceLayer .ce-hf48-rows > .ce-hf48-row'));
    const colors=['blue','green','orange','red','green','purple'];
    const border={blue:'#2563eb',green:'#16a34a',orange:'#f59e0b',red:'#ef4444',purple:'#8b5cf6'};
    const bg={blue:'#eff6ff',green:'#ecfdf5',orange:'#fff7ed',red:'#fef2f2',purple:'#faf5ff'};
    rows.forEach((r,i)=>{
      const c=colors[i]||'blue';
      r.setAttribute('data-ce-avance-color',c);
      try{r.style.setProperty('border-color',border[c],'important'); r.style.setProperty('background',bg[c],'important');}catch(_){ }
      const bar=r.querySelector('.ce-hf48-bar i');
      if(bar) try{bar.style.setProperty('background',border[c],'important');}catch(_){ }
    });
  }

  let timer=0;
  function run(){ injectStyle(); patchModals(); colorAvance(); }
  function schedule(){ clearTimeout(timer); timer=setTimeout(run,50); }

  function isLikelyModalTarget(ev){
    const t=ev?.target;
    if(!t) return false;
    return !!(t.closest?.('button,[role=button],img,[class*=photo],[class*=ticket],[class*=justificante],[class*=receipt],[class*=modal]'));
  }
  function mutationIsRelevant(muts){
    return (muts||[]).some(m=>Array.from(m.addedNodes||[]).some(n=>{
      if(!n || n.nodeType!==1) return false;
      const id=n.id||'', cls=n.className||'';
      return /modal|ticket|receipt|justificante|ceHf48AvanceLayer/i.test(id+' '+cls) || !!n.querySelector?.('[class*=modal],[class*=ticket],[class*=receipt],#ceHf48AvanceLayer');
    }));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run,{once:true}); else run();
  document.addEventListener('click',(ev)=>{ if(isLikelyModalTarget(ev)) setTimeout(run,80); },true);
  document.addEventListener('mouseover',(ev)=>{ const tt=ev.target?.closest?.('#ceBudgetLiteTooltipV307,#ceTooltipV21,[id*="Tooltip"]'); if(tt) setTimeout(()=>tt.querySelectorAll('table').forEach(sortTableByProduct),80); },true);
  window.addEventListener('controlevent:event-loaded',()=>setTimeout(run,80));
  window.addEventListener('controlevent:event-ready',()=>setTimeout(run,80));
  try{ new MutationObserver((muts)=>{ if(mutationIsRelevant(muts)) schedule(); }).observe(document.body||document.documentElement,{childList:true,subtree:true}); }catch(_){ }
  [100,350,900].forEach(ms=>setTimeout(run,ms));
  window.ControlEventHf51=Object.assign(window.ControlEventHf51||{}, {run, patchModals, colorAvance});
})();
