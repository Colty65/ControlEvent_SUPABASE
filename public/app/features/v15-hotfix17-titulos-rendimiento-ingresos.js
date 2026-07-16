(function(){
  'use strict';
  if(window.__ceV15Hotfix17TitulosRendimientoIngresos) return;
  window.__ceV15Hotfix17TitulosRendimientoIngresos = true;

  const $ = id => document.getElementById(id);
  const st = () => { try{ return window.ControlEventApp?.state || window.state || {}; }catch(_){ return {}; } };
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const text = v => String(v ?? '').trim();
  const up = v => text(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function selectedEventId(){
    try{ if(typeof window.selectedEventId === 'function') return text(window.selectedEventId()); }catch(_){ }
    return text(st().selectedEventId || $('selectedEvent')?.value || '');
  }
  function currentEvent(){
    const id = selectedEventId();
    return arr('eventos').find(e => text(e?.id) === id) || {};
  }
  function eventInfo(){
    const ev = currentEvent();
    const title = text(ev?.titulo) || text($('selectedEvent')?.selectedOptions?.[0]?.textContent) || 'Evento seleccionado';
    const finalizado = up(ev?.situacion).includes('FINALIZADO') || document.body?.innerText?.includes('Finalizado');
    return {title, cls: finalizado ? 'ce-hf17-event-finalizado' : 'ce-hf17-event-curso'};
  }
  function isGenericTitle(value){ return /^(FOTO\s+DE\s+TICKET|JUSTIFICANTE\s+DE\s+INGRESO)$/i.test(text(value)); }
  function paintHeader(el){
    if(!el) return;
    const value = text(el.textContent);
    if(!isGenericTitle(value) && !el.classList?.contains('ce-hf17-event-title')) return;
    const info = eventInfo();
    el.textContent = info.title;
    el.classList.remove('ce-hf17-event-finalizado','ce-hf17-event-curso');
    el.classList.add('ce-hf17-event-title', info.cls);
  }
  function removeCalculosTitles(root=document){
    const candidates = root.querySelectorAll?.('.ce-v40-modal-info .ce-v40-title,.ce-ticket-modal-v234-info div,#ceV40TicketPhotoModal .ce-v40-title,#ceTicketModalV234 .ce-v40-title,#ceV102TicketDetail .ce-v40-title');
    candidates?.forEach(el => { if(/^CALCULOS\s+POR\s+AGRUPACION/i.test(text(el.textContent))) el.remove(); });
    root.querySelectorAll?.('h1,h2,h3,strong,span,div').forEach(el => {
      if(!el.closest?.('#ceV40TicketPhotoModal,#ceTicketModalV234,#ceV102TicketDetail')) return;
      if(/^CALCULOS\s+POR\s+AGRUPACION/i.test(text(el.textContent)) && el.children.length === 0) el.remove();
    });
  }
  function sortTableByProduct(table){
    if(!table || table.dataset.ceHf17Sorted === '1') return;
    const theadRow = table.tHead?.rows?.[0] || null;
    let productIndex = -1;
    if(theadRow){
      Array.from(theadRow.cells).forEach((cell,i)=>{ if(productIndex < 0 && /PRODUCTO/i.test(up(cell.textContent))) productIndex = i; });
    }
    const body = table.tBodies?.[0] || table;
    let rows = Array.from(body.rows || []);
    if(!rows.length) return;
    let headerInBody = null;
    if(productIndex < 0){
      const first = rows[0];
      Array.from(first.cells || []).forEach((cell,i)=>{ if(productIndex < 0 && /PRODUCTO/i.test(up(cell.textContent))) productIndex = i; });
      if(productIndex >= 0){ headerInBody = first; rows = rows.slice(1); }
    }
    if(productIndex < 0) productIndex = 0;
    const sortable = rows.filter(row => row.cells && row.cells.length > productIndex && !row.querySelector('[colspan]'));
    if(sortable.length < 2) return;
    sortable.sort((a,b)=> text(a.cells[productIndex]?.textContent).localeCompare(text(b.cells[productIndex]?.textContent), 'es', {sensitivity:'base'}));
    if(headerInBody) body.appendChild(headerInBody);
    sortable.forEach(row => body.appendChild(row));
    table.dataset.ceHf17Sorted = '1';
  }
  function sortTicketProducts(root=document){
    root.querySelectorAll?.('#ceV102TicketDetail table,#ceV40TicketPhotoModal table,#ceTicketModalV234 table,.ce-ticket-modal-v234 table').forEach(sortTableByProduct);
  }
  function applyModalTitles(root=document){
    const selectors = [
      '#ceV40TicketPhotoModal .ce-v40-modal-head span',
      '#ceTicketModalV234 .ce-ticket-modal-v234-info > div:first-child',
      '.ce-v5017-budget-modal-head span',
      '.ce-v512-budget-photo-head span',
      '.ce-v509-modal-head span',
      '.ce-v504-modal-head span',
      '.ce-v468-modal-head span',
      '.ce-v465-modal-head span',
      '.ce-v464-receipt-head span',
      '.ce-receipt-modal-head-v463 span',
      '.ce-v73-ios-title',
      '.ce-v72-ios-title'
    ];
    selectors.forEach(sel => root.querySelectorAll?.(sel).forEach(paintHeader));
    root.querySelectorAll?.('span,div').forEach(el => {
      if(!el.closest?.('#ceV40TicketPhotoModal,#ceV102TicketDetail,#ceTicketModalV234,.ce-v5017-budget-modal,.ce-v512-budget-photo-modal,.ce-v509-modal,.ce-v504-modal,.ce-v468-modal,.ce-v465-modal,.ce-v464-receipt-card,.ce-receipt-modal-card-v463,.ce-v73-ios-card,.ce-v72-ios-card')) return;
      if(isGenericTitle(el.textContent)) paintHeader(el);
    });
    const v102Title = root.querySelector?.('#ceV102TicketDetail .event-title');
    if(v102Title){
      const info = eventInfo();
      v102Title.textContent = info.title;
      v102Title.classList.add('ce-hf17-event-title', info.cls);
    }
    removeCalculosTitles(root);
    sortTicketProducts(root);
  }
  function injectStyle(){
    if($('ceHf17Style')) return;
    const css = `
      .ce-hf17-event-title{display:block!important;flex:1 1 auto!important;text-align:center!important;font-weight:950!important;font-size:18px!important;line-height:1.2!important;letter-spacing:.01em!important;padding:2px 12px!important}
      .ce-hf17-event-finalizado{color:#dc2626!important}.ce-hf17-event-curso{color:#16a34a!important}
      #ceV40TicketPhotoModal .ce-v40-modal-head{justify-content:center!important;position:relative!important}
      #ceV40TicketPhotoModal .ce-v40-modal-close{position:absolute!important;right:0!important;top:0!important}
      #ceV102TicketDetail .event-title.ce-hf17-event-title{text-align:center!important;font-size:20px!important;margin-bottom:6px!important}
      #ceV40TicketPhotoModal .ce-v40-modal-info table tr:first-child td{font-weight:950!important}
      @media(max-width:900px){.ce-hf17-event-title{font-size:15px!important;text-align:left!important;padding-right:78px!important}#ceV40TicketPhotoModal .ce-v40-modal-head{justify-content:flex-start!important}}
    `;
    const style=document.createElement('style'); style.id='ceHf17Style'; style.textContent=css; document.head.appendChild(style);
  }
  function apply(root){ injectStyle(); applyModalTitles(root || document); }
  let timer=0; function schedule(root, delay=40){ clearTimeout(timer); timer=setTimeout(()=>apply(root || document), delay); }
  try{
    new MutationObserver(mutations => {
      for(const m of mutations){
        if(Array.from(m.addedNodes || []).some(n => n.nodeType === 1 && (n.matches?.('#ceV40TicketPhotoModal,#ceV102TicketDetail,#ceTicketModalV234,.ce-v5017-budget-modal,.ce-v512-budget-photo-modal,.ce-v509-modal,.ce-v504-modal,.ce-v468-modal,.ce-v465-modal,.ce-v73-ios-card,.ce-v72-ios-card') || n.querySelector?.('#ceV40TicketPhotoModal,#ceV102TicketDetail,#ceTicketModalV234,.ce-v5017-budget-modal,.ce-v512-budget-photo-modal,.ce-v509-modal,.ce-v504-modal,.ce-v468-modal,.ce-v465-modal,.ce-v73-ios-card,.ce-v72-ios-card')))){
          schedule(document, 20); return;
        }
      }
    }).observe(document.documentElement, {childList:true, subtree:true});
  }catch(_){ }
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:event-changed','controlevent:event-loaded'].forEach(ev=>window.addEventListener(ev,()=>schedule(document,80),true));
  document.addEventListener('click', ev => { if(ev.target?.closest?.('img.ticket-thumb,.ce-v465-tip-thumb,.ce-v504-receipt-thumb,[data-receipt-open],[data-ce-photo-open]')) schedule(document,120); }, true);
  [0,250,900,1600].forEach(ms=>setTimeout(()=>apply(document),ms));
  window.ControlEventV15Hotfix17 = { applyModalTitles: apply };
})();
