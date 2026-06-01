/* ControlEvent v5.0.0_prod - parche quirurgico PC / EVENTO Finalizado.
   Alcance:
   - Solo actua en entorno PC (hover + puntero fino, no iPad/iPhone/Android).
   - Solo actua cuando el evento seleccionado esta FINALIZADO.
   - Refuerza el visor de justificantes de INGRESOS en pantalla y globos.
   - Refuerza el visor de TICKETS con informacion a la izquierda y cierre fiable.
   - No toca login, datos, Excel, compras/donaciones ni moviles/tablets.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v5.0.0_prod';
  const VERSION_FILE = 'ControlEvent_v5_0_0_prod';
  const INSTALLED = '__ceV401PcPhotoFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const MODAL_ID = 'ceV401PcPhotoModal';
  const STYLE_ID = 'ceV401PcPhotoStyle';
  const OLD_MODAL_IDS = [
    'ceV40TicketPhotoModal',
    'ceV310PhotoViewer',
    'ceV509ReceiptModal',
    'ceV504ReceiptModal',
    'ceV502ReceiptModal',
    'ceV468ReceiptModal',
    'ceV465ReceiptModal',
    'ceTicketModalV234',
    'ceTicketImageModalV225'
  ];

  const RECEIPT_SELECTOR = [
    '#collabList [data-ce-v509-receipt="view"]',
    '#collabList .ce-v509-receipt-thumb',
    '#collabList .ce-v504-receipt-thumb',
    '#collabList .ce-v502-receipt-thumb',
    '#collabList .ce-v465-receipt-thumb',
    '#collabList .ce-v464-receipt-tools button[data-action*="view"]',
    '#ceBudgetLiteTooltipV307 .ce-v5017-budget-thumb',
    '#ceBudgetLiteTooltipV307 [data-ce-v5017-budget-thumb]',
    '#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb',
    '#ceTooltipV21 .ce-v465-tip-thumb',
    '.ce-v21-tooltip .ce-v465-tip-thumb',
    '.ce-budget-tooltip .ce-v465-tip-thumb',
    '.ce-tooltip .ce-v465-tip-thumb'
  ].join(',');

  const TICKET_SELECTOR = [
    '#summaryTiendaTicket img.ticket-thumb',
    '#ceBudgetLiteTooltipV307 img.ticket-thumb',
    '#ceTooltipV21 img.ticket-thumb',
    '.ce-v21-tooltip img.ticket-thumb',
    '.ce-budget-tooltip img.ticket-thumb',
    '.ce-tooltip img.ticket-thumb'
  ].join(',');

  const PC_RETAG_CLASSES = [
    'ce-v509-receipt-thumb',
    'ce-v504-receipt-thumb',
    'ce-v502-receipt-thumb',
    'ce-v465-receipt-thumb',
    'ce-v465-tip-thumb',
    'ce-v5017-budget-thumb',
    'ticket-thumb'
  ];

  let lastOpenSig = '';
  let lastOpenAt = 0;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const safe = (fn, fb) => { try{ const value = fn(); return value === undefined ? fb : value; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };

  function isPcLike(){
    const ua = navigator.userAgent || '';
    if(/Android|iPhone|iPad|iPod/i.test(ua)) return false;
    return safe(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches, true) !== false;
  }
  function stateRef(){
    return safe(() => (typeof state !== 'undefined' && state) ? state : null, null)
      || window.state
      || window.ControlEventApp?.state
      || {};
  }
  function arr(name){ const s = stateRef(); return Array.isArray(s[name]) ? s[name] : []; }
  function selectedEventId(){
    const ev = safe(() => (typeof window.selectedEvent === 'function') ? window.selectedEvent() : null, null)
      || safe(() => (typeof selectedEvent === 'function') ? selectedEvent() : null, null);
    return norm(ev?.id || stateRef().selectedEventId || '');
  }
  function selectedEventObj(){
    const ev = safe(() => (typeof window.selectedEvent === 'function') ? window.selectedEvent() : null, null)
      || safe(() => (typeof selectedEvent === 'function') ? selectedEvent() : null, null);
    if(ev && ev.id) return ev;
    const id = selectedEventId();
    return arr('eventos').find(item => String(item.id || '') === id) || {};
  }
  function isFinalizado(){ return up(selectedEventObj().situacion || '') === 'FINALIZADO'; }
  function active(){ return isPcLike() && isFinalizado(); }

  function srcOf(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || '');
    return '';
  }
  function jsonGet(key){ return safe(() => JSON.parse(localStorage.getItem(key) || '{}') || {}, {}); }
  function stores(){
    const s = stateRef();
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    return {images:s.ticketImages, refs:s.ticketImageRefs};
  }
  function receiptKeys(id){
    const ev = selectedEventId();
    const sid = norm(id);
    return [
      `${ev}|INGRESO:${sid}`,
      `${ev}|INGRESO|${sid}`,
      `INGRESO:${ev}|${sid}`,
      `INGRESO:${sid}`,
      `INGRESO|${sid}`,
      sid
    ];
  }
  function receiptSrc(id){
    const keys = receiptKeys(id);
    const {images, refs} = stores();
    const bags = [images, refs, jsonGet('ControlEvent_ingreso_receipts_v502'), jsonGet('ControlEvent_ingreso_receipts_v468')];
    for(const bag of bags){
      for(const key of keys){ const src = srcOf(bag && bag[key]); if(src) return src; }
    }
    return '';
  }
  function imageFrom(node){
    const img = node?.matches?.('img') ? node : (node?.querySelector?.('img') || null);
    return img?.currentSrc || img?.src || '';
  }
  function idFrom(node){
    return norm(node?.dataset?.id || node?.getAttribute?.('data-id') || node?.closest?.('[data-id]')?.dataset?.id || '');
  }
  function srcFromReceipt(trigger){
    return imageFrom(trigger) || receiptSrc(idFrom(trigger));
  }
  function srcFromTicket(trigger){ return imageFrom(trigger); }

  function rowTextFor(node){
    const row = node?.closest?.('.summary-item,.budget-row,.itemcard,.rowline,.chart-row,tr,#ceBudgetLiteTooltipV307,#ceTooltipV21,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip');
    const owner = node?.closest?.('[data-ce-tip-v21],[data-tip],[data-ce-tip]') || row?.closest?.('[data-ce-tip-v21],[data-tip],[data-ce-tip]') || row?.querySelector?.('[data-ce-tip-v21],[data-tip],[data-ce-tip]');
    const tip = owner?.getAttribute?.('data-ce-tip-v21') || owner?.getAttribute?.('data-tip') || owner?.getAttribute?.('data-ce-tip') || '';
    return norm(tip || row?.innerText || node?.alt || node?.title || '');
  }
  function ingresoInfo(trigger){
    const id = idFrom(trigger);
    const row = arr('colaboradores').find(c => String(c.id || '') === String(id || '')) || {};
    const persona = row.persona || arr('personas').find(p => String(p.id || '') === String(row.personaId || '')) || {};
    const ev = selectedEventObj();
    const numero = Number(row.numero || 0) || 0;
    const precio = Number(ev.precio || 0) || 0;
    const obligatorio = up(persona.rango || row.rango || '') === 'SOCIO' ? numero * precio : Number(row.obligatorio || 0) || 0;
    const voluntario = Number(row.donation ?? row.importeVoluntario ?? row.importe ?? row.voluntario ?? 0) || 0;
    const total = Number(row.total ?? row.totalIngreso ?? (obligatorio + voluntario)) || 0;
    const lines = [];
    lines.push(norm(persona.nombre || row.nombre || 'Justificante de ingreso'));
    lines.push(`Situacion|${norm(row.situacion || row.formaPago || 'Pendiente')}`);
    if(norm(persona.rango || row.rango || '')) lines.push(`Rango|${norm(persona.rango || row.rango || '')}`);
    lines.push(`Numero|${String(numero)}`);
    lines.push(`Importe obligatorio|${money(obligatorio)}`);
    lines.push(`Importe voluntario|${money(voluntario)}`);
    lines.push(`Total ingreso|${money(total)}`);
    const fallback = rowTextFor(trigger);
    return lines.length > 1 ? lines.join('\n') : fallback;
  }
  function money(value){
    return safe(() => new Intl.NumberFormat('es-ES', {style:'currency', currency:'EUR'}).format(Number(value || 0)), `${Number(value || 0).toFixed(2)} €`);
  }
  function renderInfoHtml(text){
    const lines = String(text || '').split('\n').map(line => line.trim()).filter(Boolean);
    const rows = [];
    const blocks = [];
    const flush = () => {
      if(!rows.length) return;
      blocks.push('<table><tbody>' + rows.map(row => '<tr>' + row.map(cell => '<td>' + esc(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      rows.length = 0;
    };
    lines.forEach(line => {
      if(line.includes('|')) rows.push(line.split('|').map(x => x.trim()));
      else { flush(); blocks.push('<div class="ce-v401-pc-info-title">' + esc(line) + '</div>'); }
    });
    flush();
    return blocks.join('') || '<div class="ce-v401-pc-info-title">Sin detalle asociado</div>';
  }


  let lastTooltipSnapshot = null;
  function tooltipRoots(){
    const byId = ['ceBudgetLiteTooltipV307','ceTooltipV21','ceV462Tooltip','ceTooltipV190','ceTooltipV181'].map($).filter(Boolean);
    const byClass = Array.from(document.querySelectorAll('.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip,.ce-tooltip-v181,.ce-tooltip-v190'));
    return byId.concat(byClass).filter((el, idx, arr) => el && arr.indexOf(el) === idx);
  }
  function isVisibleTooltip(el){
    return safe(() => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0 && r.width > 0 && r.height > 0;
    }, false);
  }
  function rememberTooltip(source){
    const roots = tooltipRoots().filter(isVisibleTooltip);
    if(!roots.length && source){
      const own = source.closest?.('#ceBudgetLiteTooltipV307,#ceTooltipV21,#ceV462Tooltip,#ceTooltipV190,#ceTooltipV181,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip,.ce-tooltip-v181,.ce-tooltip-v190');
      if(own) roots.push(own);
    }
    if(!roots.length) return;
    lastTooltipSnapshot = roots.map(el => ({
      el,
      id: el.id || '',
      className: el.className || '',
      style: el.getAttribute('style') || '',
      html: el.innerHTML,
      scrollTop: el.scrollTop || 0,
      scrollLeft: el.scrollLeft || 0,
      rect: safe(() => el.getBoundingClientRect(), null)
    }));
  }
  function restoreTooltip(){
    const snap = lastTooltipSnapshot;
    if(!snap || !snap.length) return;
    snap.forEach(item => {
      let el = item.el && document.contains(item.el) ? item.el : (item.id ? $(item.id) : null);
      if(!el) return;
      try{
        if(!el.innerHTML && item.html) el.innerHTML = item.html;
        el.className = item.className || el.className;
        el.setAttribute('style', item.style || '');
        if(item.rect){
          el.style.setProperty('position', 'fixed', 'important');
          el.style.setProperty('left', Math.max(4, Math.round(item.rect.left)) + 'px', 'important');
          el.style.setProperty('top', Math.max(4, Math.round(item.rect.top)) + 'px', 'important');
        }
        el.style.setProperty('display', 'block', 'important');
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('pointer-events','auto','important');
        el.scrollTop = item.scrollTop || 0;
        el.scrollLeft = item.scrollLeft || 0;
      }catch(_){ }
    });
  }
  function restoreTooltipSoon(){ [30,100,220,420].forEach(ms => setTimeout(restoreTooltip, ms)); }

  function closeAll(ev, options){
    const shouldRestore = !options || options.restore !== false;
    if(ev) stop(ev);
    safe(() => $(MODAL_ID)?.remove(), null);
    OLD_MODAL_IDS.forEach(id => safe(() => $(id)?.remove(), null));
    document.querySelectorAll('.ce-v5017-budget-modal,.ce-v512-budget-photo-modal,.ce-v504-modal,.ce-v505-photo-modal,.ce-v506-photo-modal,.ce-v508-photo-modal,.ce-v465-modal,.ce-v468-modal,.ce-receipt-modal-v463').forEach(el => safe(() => el.remove(), null));
    if(shouldRestore) restoreTooltipSoon();
    return false;
  }
  function openModal(kind, trigger, src, ev){
    if(!src) return stop(ev);
    const now = Date.now();
    const sig = kind + '|' + src;
    if(sig === lastOpenSig && now - lastOpenAt < 650) return stop(ev);
    lastOpenSig = sig;
    lastOpenAt = now;
    rememberTooltip(trigger);
    closeAll(null, {restore:false});
    const isTicket = kind === 'ticket';
    const title = isTicket ? 'Foto de ticket' : 'Justificante de ingreso';
    const info = isTicket ? rowTextFor(trigger) : ingresoInfo(trigger);
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('data-ce-v401-kind', kind);
    modal.innerHTML = `<div class="ce-v401-pc-modal-box">
      <div class="ce-v401-pc-modal-head"><span>${esc(title)}</span><button type="button" class="ce-v401-pc-modal-close" data-close="1" aria-label="Cerrar visor">✕ Cerrar</button></div>
      <div class="ce-v401-pc-modal-info">${renderInfoHtml(info)}</div>
      <img class="ce-v401-pc-modal-img" alt="${esc(title)}" src="${esc(src)}">
    </div>`;
    document.body.appendChild(modal);
    safe(() => modal.querySelector('[data-close]')?.focus({preventScroll:true}), null);
    return stop(ev);
  }
  function retagTrigger(trigger, kind){
    if(!trigger) return;
    if(kind === 'receipt'){
      const id = idFrom(trigger);
      if(id && !trigger.getAttribute('data-ce-v401-id')) trigger.setAttribute('data-ce-v401-id', id);
      trigger.setAttribute('data-ce-v401-pc-receipt', '1');
      trigger.removeAttribute('data-ce-v509-receipt');
      trigger.removeAttribute('data-action');
      trigger.classList.add('ce-v401-pc-thumb');
    }else{
      trigger.setAttribute('data-ce-v401-pc-ticket', '1');
      trigger.classList.add('ce-v401-pc-ticket-thumb');
    }
    PC_RETAG_CLASSES.forEach(cls => { if(trigger.classList.contains(cls)) trigger.classList.remove(cls); });
  }

  function patchVisiblePcThumbs(){
    if(!active()) return;
    document.querySelectorAll('#collabList [data-ce-v509-receipt="view"],#collabList .ce-v509-receipt-thumb,#ceBudgetLiteTooltipV307 .ce-v5017-budget-thumb,#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,#ceTooltipV21 .ce-v465-tip-thumb').forEach(el => {
      try{
        el.style.setProperty('pointer-events','auto','important');
        el.style.setProperty('cursor','zoom-in','important');
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('opacity','1','important');
      }catch(_){ }
    });
    document.querySelectorAll('#summaryTiendaTicket img.ticket-thumb,#ceBudgetLiteTooltipV307 img.ticket-thumb,#ceTooltipV21 img.ticket-thumb').forEach(el => {
      try{
        el.style.setProperty('pointer-events','auto','important');
        el.style.setProperty('cursor','zoom-in','important');
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('opacity','1','important');
      }catch(_){ }
    });
  }

  function handlePointerStart(ev){
    const target = ev.target;
    if(target?.closest?.(`#${MODAL_ID} [data-close],#${MODAL_ID} .ce-v401-pc-modal-close`)) return closeAll(ev);
    if(target === $(MODAL_ID)) return closeAll(ev);
    if(target?.closest?.('#ceV40TicketPhotoModal .ce-v40-modal-close,#ceV40TicketPhotoModal [data-close],#ceV310PhotoViewer .ce-v310-photo-close,#ceV310PhotoViewer [data-close],#ceV509ReceiptModal [data-close],.ce-v5017-budget-modal [data-close],.ce-v512-budget-photo-modal [data-close]')) return closeAll(ev);
    const oldBackdrop = target?.closest?.('#ceV40TicketPhotoModal,#ceV310PhotoViewer,#ceV509ReceiptModal,.ce-v5017-budget-modal,.ce-v512-budget-photo-modal');
    if(oldBackdrop && target === oldBackdrop) return closeAll(ev);
    if(!active()) return undefined;

    const receipt = target?.closest?.(RECEIPT_SELECTOR + ',[data-ce-v401-pc-receipt]');
    if(receipt){
      const src = srcFromReceipt(receipt);
      retagTrigger(receipt, 'receipt');
      return openModal('receipt', receipt, src, ev);
    }
    const ticket = target?.closest?.(TICKET_SELECTOR + ',[data-ce-v401-pc-ticket]');
    if(ticket){
      const src = srcFromTicket(ticket);
      retagTrigger(ticket, 'ticket');
      return openModal('ticket', ticket, src, ev);
    }
    return undefined;
  }
  function handleModalClick(ev){
    const target = ev.target;
    if(target?.closest?.(`#${MODAL_ID} [data-close],#${MODAL_ID} .ce-v401-pc-modal-close`)) return closeAll(ev);
    if(target === $(MODAL_ID)) return closeAll(ev);
    if(target?.closest?.(`#${MODAL_ID}`)){ try{ ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } }
    return undefined;
  }

  function applyVersion(){
    try{
      document.title = VERSION;
      document.body.dataset.ceVersion = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(el.textContent || '')) el.textContent = VERSION;
      });
    }catch(_){ }
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .ce-v401-pc-thumb{appearance:none!important;-webkit-appearance:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:36px!important;height:36px!important;min-width:36px!important;min-height:36px!important;border-radius:10px!important;border:1px solid #cbd5e1!important;background:#fff!important;color:#0f172a!important;padding:0!important;margin:0!important;cursor:zoom-in!important;box-shadow:0 1px 3px rgba(15,23,42,.12)!important;position:relative!important;z-index:60!important;pointer-events:auto!important;}
      .ce-v401-pc-thumb img{width:32px!important;height:32px!important;display:block!important;object-fit:cover!important;border-radius:8px!important;pointer-events:none!important;}
      img.ce-v401-pc-ticket-thumb{display:inline-block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;cursor:zoom-in!important;max-width:44px!important;max-height:44px!important;object-fit:cover!important;border-radius:8px!important;border:1px solid #cbd5e1!important;background:#fff!important;}
      #${MODAL_ID}{position:fixed!important;inset:0!important;z-index:10000080!important;background:rgba(2,6,23,.84)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:14px!important;}
      #${MODAL_ID} .ce-v401-pc-modal-box{width:min(1320px,98vw)!important;max-height:96vh!important;background:#fff!important;color:#0f172a!important;border-radius:18px!important;box-shadow:0 24px 90px rgba(0,0,0,.50)!important;padding:12px!important;display:grid!important;grid-template-columns:minmax(260px,380px) minmax(360px,1fr)!important;gap:12px!important;overflow:auto!important;}
      #${MODAL_ID} .ce-v401-pc-modal-head{grid-column:1/-1!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;font-weight:950!important;position:sticky!important;top:0!important;z-index:2!important;background:#fff!important;padding-bottom:8px!important;}
      #${MODAL_ID} .ce-v401-pc-modal-close{appearance:none!important;-webkit-appearance:none!important;border:1px solid #cbd5e1!important;background:#fff!important;color:#0f172a!important;border-radius:10px!important;padding:8px 14px!important;font-weight:950!important;cursor:pointer!important;pointer-events:auto!important;min-width:96px!important;min-height:40px!important;box-shadow:0 1px 4px rgba(15,23,42,.14)!important;}
      #${MODAL_ID} .ce-v401-pc-modal-info{font-size:13px!important;line-height:1.35!important;overflow:auto!important;max-height:82vh!important;background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:14px!important;padding:10px!important;align-self:start!important;}
      #${MODAL_ID} .ce-v401-pc-info-title{font-weight:950!important;margin:5px 0 8px!important;color:#0f172a!important;}
      #${MODAL_ID} .ce-v401-pc-modal-info table{width:100%!important;border-collapse:collapse!important;margin:8px 0!important;}
      #${MODAL_ID} .ce-v401-pc-modal-info td{border-bottom:1px solid #e5e7eb!important;padding:5px 6px!important;vertical-align:top!important;}
      #${MODAL_ID} .ce-v401-pc-modal-info td:first-child{font-weight:900!important;color:#475569!important;}
      #${MODAL_ID} .ce-v401-pc-modal-info td:last-child{text-align:right!important;font-weight:850!important;}
      #${MODAL_ID} .ce-v401-pc-modal-img{display:block!important;max-width:100%!important;max-height:82vh!important;object-fit:contain!important;border-radius:12px!important;background:#f8fafc!important;justify-self:center!important;align-self:start!important;}
      body.ce-v401-pc-finalizado #tabIngresos,body.ce-v401-pc-finalizado #collabList,body.ce-v401-pc-finalizado #collabList .itemcard,body.ce-v401-pc-finalizado #collabList .rowline,body.ce-v401-pc-finalizado #summaryTiendaTicket,body.ce-v401-pc-finalizado #ceBudgetLiteTooltipV307,body.ce-v401-pc-finalizado #ceTooltipV21{pointer-events:auto!important;filter:none!important;opacity:1!important;visibility:visible!important;}
    `;
    document.head.appendChild(style);
  }
  function markBody(){
    document.body.classList.toggle('ce-v401-pc-finalizado', active());
  }
  function install(){
    injectStyle();
    applyVersion();
    markBody();
    patchVisiblePcThumbs();
  }

  ['pointerdown','mousedown'].forEach(type => window.addEventListener(type, handlePointerStart, {capture:true, passive:false}));
  window.addEventListener('click', handleModalClick, {capture:true, passive:false});
  window.addEventListener('keydown', ev => { if(ev.key === 'Escape' && ($(MODAL_ID) || OLD_MODAL_IDS.some(id => $(id)))) return closeAll(ev); }, true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') [60,240,650,1400].forEach(ms => setTimeout(install, ms)); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40)));
  [0,120,500,1200,2600,5000].forEach(ms => setTimeout(install, ms));
  safe(() => {
    const mo = new MutationObserver(() => { clearTimeout(mo.__ceV401t); mo.__ceV401t = setTimeout(install, 80); });
    mo.observe(document.documentElement, {childList:true, subtree:true});
  }, null);

  window.ControlEventV401PcPhotoFix = {version:VERSION, versionFile:VERSION_FILE, install, close:closeAll, restoreTooltip};
})();
