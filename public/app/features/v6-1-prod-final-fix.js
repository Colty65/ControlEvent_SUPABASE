/* ControlEvent v6.1_prod - parche final limitado desde base estable anterior.
   Alcance: versión, nombres/Excel, cierre de fotos separado de Salir, retorno de globo en GRAFICAS e iPhone Finalizado.
   Sin setInterval ni bucles periódicos nuevos. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v6.1_prod';
  const VERSION_FILE = 'ControlEvent_v6_1_prod';
  const INSTALLED = '__ceV61ProdFinalFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const MODAL_SELECTORS = [
    '#ceV61ReceiptModal','#ceV401PcPhotoModal','#ceV40TicketPhotoModal','#ceV310PhotoViewer','#ceV509ReceiptModal','#ceV504ReceiptModal','#ceV502ReceiptModal','#ceV468ReceiptModal','#ceV465ReceiptModal','#ceTicketModalV234','#ceTicketImageModalV225',
    '.ce-v468-modal','.ce-v465-modal','.ce-v5017-budget-modal','.ce-v512-budget-photo-modal','.ce-v504-modal','.ce-v505-photo-modal','.ce-v506-photo-modal','.ce-v508-photo-modal','.ce-receipt-modal-v463'
  ];
  const CLOSE_SELECTORS = '[data-close],.ce-v401-pc-modal-close,.ce-v40-modal-close,.ce-v310-photo-close,.ce-v468-modal-head button,.ce-v465-modal-head button,.ce-v61-receipt-close';
  const RECEIPT_SELECTOR = [
    '#collabList .ce-v465-receipt-thumb','#collabList .ce-v509-receipt-thumb','#collabList [data-ce-v509-receipt="view"]','#collabList [data-action="ingreso-receipt-view-v465"]',
    '#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb','#ceBudgetLiteTooltipV307 .ce-v5017-budget-thumb','#ceBudgetLiteTooltipV307 [data-ce-v5017-budget-thumb]',
    '#ceTooltipV21 .ce-v465-tip-thumb','.ce-v21-tooltip .ce-v465-tip-thumb','.ce-budget-tooltip .ce-v465-tip-thumb','.ce-tooltip .ce-v465-tip-thumb'
  ].join(',');

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const norm = v => String(v ?? '').trim();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const pad = v => String(v).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const hms = d => `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  let lastTooltipSnapshot = null;
  let blockLogoutUntil = 0;

  function clean(v){ return String(v || 'EVENTO').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9._ -]+/g,'_').trim().replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,95) || 'EVENTO'; }
  function normalizeText(value){
    return String(value == null ? '' : value)
      .replace(/ControlEvent_v\d+(?:_\d+){1,4}(?:_prod)?/ig, VERSION_FILE)
      .replace(/ControlEvent\s+v\d+(?:\.\d+){0,4}(?:_prod)?/ig, VERSION);
  }
  function applyVersion(){
    safe(() => { document.title = VERSION; }, null);
    safe(() => {
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      if(document.body) document.body.dataset.ceVersion = VERSION;
    }, null);
    safe(() => {
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label]').forEach(el => {
        const txt = el.textContent || '';
        if(/ControlEvent\s+v/i.test(txt) || el.matches('[data-ce-version-label]')) el.textContent = VERSION;
      });
    }, null);
  }
  function currentEventTitle(){
    const sel = $('selectedEvent');
    const raw = sel?.selectedOptions?.[0]?.textContent || sel?.options?.[sel.selectedIndex]?.textContent || '';
    return clean(raw.replace(/^\s*(FINALIZADO|EN CURSO)\s*[-–:]?\s*/i,''));
  }
  function normalizeDownloadName(name){
    let n = normalizeText(name || '');
    if(!n) return n;
    const now = new Date();
    n = n.replace(/[\/:*?"<>|]+/g, '_').replace(/__+/g,'_');
    if(/INFOEVENTO/i.test(n)){
      const after = n.split(/INFOEVENTO[-_]/i)[1] || '';
      let base = after.replace(/\.xlsx$/i,'').replace(/(?:_\d{8}(?:_\d{6})?)+$/g, '').replace(/(?:_\d{8})+$/g, '');
      const date = (n.match(/_(\d{8})(?:_\d{6})?(?:_\d{8}(?:_\d{6})?)*\.xlsx$/i) || [])[1] || ymd(now);
      n = `${VERSION_FILE}_INFOEVENTO-${clean(base || currentEventTitle())}_${date}.xlsx`;
    }else if(/BACKUP/i.test(n) || /descarga_datos\.xlsx$/i.test(n)){
      if(/descarga_datos\.xlsx$/i.test(n)) n = `${VERSION_FILE}_BACKUP_TODOS_${ymd(now)}_${hms(now)}.xlsx`;
      else {
        const tail = (n.split(/_BACKUP_/i)[1] || `TODOS_${ymd(now)}_${hms(now)}.xlsx`).replace(/\.xlsx$/i,'');
        n = `${VERSION_FILE}_BACKUP_${tail}.xlsx`;
      }
    }
    return n.replace(/_+\.xlsx$/i,'.xlsx').replace(/__+/g,'_');
  }
  function patchAnchorDownloads(){
    const proto = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
    const nativeClick = window.HTMLElement && HTMLElement.prototype && HTMLElement.prototype.click;
    if(!proto || !nativeClick || proto.__ceV61DownloadPatched) return;
    proto.__ceV61DownloadPatched = true;
    const oldSetAttribute = proto.setAttribute;
    proto.setAttribute = function(name, value){ if(String(name || '').toLowerCase() === 'download') value = normalizeDownloadName(value); return oldSetAttribute.call(this, name, value); };
    proto.click = function(){ try{ if(this && this.download) this.download = normalizeDownloadName(this.download); }catch(_){ } return nativeClick.call(this); };
  }
  function scrubValue(value){
    if(typeof value === 'string') return normalizeText(value);
    if(value && typeof value === 'object'){
      if(Array.isArray(value.richText)) return {...value, richText:value.richText.map(part => ({...part, text:normalizeText(part.text || '')}))};
      if(typeof value.text === 'string') return {...value, text:normalizeText(value.text)};
      if(typeof value.result === 'string') return {...value, result:normalizeText(value.result)};
    }
    return value;
  }
  function scrubWorkbook(wb){
    if(!wb || wb.__ceV61Scrubbed) return wb;
    wb.__ceV61Scrubbed = true;
    safe(() => { wb.creator = normalizeText(wb.creator || `${VERSION} - ©oltyLAB '26`); }, null);
    safe(() => { wb.lastModifiedBy = VERSION; }, null);
    safe(() => { (wb.worksheets || []).forEach(ws => ws.eachRow(row => row.eachCell(cell => { cell.value = scrubValue(cell.value); }))); }, null);
    return wb;
  }
  function patchWorkbookInstance(wb){
    if(!wb || wb.__ceV61WritePatched || !wb.xlsx || typeof wb.xlsx.writeBuffer !== 'function') return wb;
    wb.__ceV61WritePatched = true;
    const oldWriteBuffer = wb.xlsx.writeBuffer.bind(wb.xlsx);
    wb.xlsx.writeBuffer = function(){ scrubWorkbook(wb); return oldWriteBuffer.apply(this, arguments); };
    return wb;
  }
  function patchExcelJS(){
    const X = window.ExcelJS;
    if(!X || !X.Workbook || X.__ceV61WorkbookPatched) return false;
    const Original = X.Workbook;
    function WorkbookPatched(){ const wb = new Original(...arguments); return patchWorkbookInstance(wb); }
    try{ WorkbookPatched.prototype = Original.prototype; Object.setPrototypeOf(WorkbookPatched, Original); }catch(_){ }
    X.Workbook = WorkbookPatched;
    X.__ceV61WorkbookPatched = true;
    return true;
  }
  function wrapEnsureExcelJS(){
    const fn = window.ensureExcelJS;
    if(typeof fn !== 'function' || fn.__ceV61EnsureWrapped) return;
    const wrapped = async function(){ const res = await fn.apply(this, arguments); patchExcelJS(); return res; };
    wrapped.__ceV61EnsureWrapped = true;
    window.ensureExcelJS = wrapped;
  }

  function markPhotoClosed(){
    blockLogoutUntil = Date.now() + 750;
    try{ window.__cePhotoCloseBlockLogoutUntil = Math.max(window.__cePhotoCloseBlockLogoutUntil || 0, blockLogoutUntil); }catch(_){ }
  }
  function visibleTooltip(el){
    if(!el) return false;
    const cs = safe(() => getComputedStyle(el), null);
    const r = safe(() => el.getBoundingClientRect(), null);
    return !!(cs && r && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0);
  }
  function captureTooltipSnapshot(trigger){
    const tip = trigger?.closest?.('#ceTooltipV21,#ceBudgetLiteTooltipV307,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip') || $('ceTooltipV21') || null;
    if(!visibleTooltip(tip)) return null;
    const r = safe(() => tip.getBoundingClientRect(), null);
    return {html:tip.outerHTML, id:tip.id || '', left:r ? r.left : null, top:r ? r.top : null, width:r ? r.width : null, height:r ? r.height : null, scrollTop:tip.scrollTop || 0, scrollLeft:tip.scrollLeft || 0};
  }
  function restoreTooltipSnapshot(snapshot){
    if(!snapshot || !snapshot.html) return;
    try{
      let restored = null;
      if(snapshot.id){ const old = $(snapshot.id); if(old && visibleTooltip(old)) restored = old; else if(old) old.remove(); }
      if(!restored){ const holder = document.createElement('div'); holder.innerHTML = snapshot.html; restored = holder.firstElementChild; if(restored) document.body.appendChild(restored); }
      if(!restored) return;
      restored.setAttribute('data-ce-v61-restored-tooltip','1');
      if(restored.id === 'ceBudgetLiteTooltipV307') restored.classList.add('open');
      const w = Math.min(snapshot.width || 420, window.innerWidth - 16);
      const h = Math.min(snapshot.height || 260, window.innerHeight - 16);
      const left = Math.max(8, Math.min(snapshot.left == null ? 24 : snapshot.left, Math.max(8, window.innerWidth - w - 8)));
      const top = Math.max(8, Math.min(snapshot.top == null ? 80 : snapshot.top, Math.max(8, window.innerHeight - h - 8)));
      restored.style.setProperty('display','block','important');
      restored.style.setProperty('visibility','visible','important');
      restored.style.setProperty('opacity','1','important');
      restored.style.setProperty('pointer-events','auto','important');
      restored.style.setProperty('position','fixed','important');
      restored.style.setProperty('left', left + 'px', 'important');
      restored.style.setProperty('top', top + 'px', 'important');
      restored.style.setProperty('z-index','10000060','important');
      try{ restored.scrollTop = snapshot.scrollTop || 0; restored.scrollLeft = snapshot.scrollLeft || 0; }catch(_){ }
      safe(() => window.ControlEventV468?.hydrateEventReceipts?.(false), null);
      safe(() => window.ControlEventV469?.enrichOpenTooltips?.(), null);
      safe(() => window.ControlEventV468?.compactIngresoReceipts?.(), null);
    }catch(_){ }
  }

  function isIPhone(){ return /iPhone|iPod/i.test(navigator.userAgent || '') && !/Android/i.test(navigator.userAgent || ''); }
  function st(){ try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ } return window.state || window.ControlEventApp?.state || {}; }
  function arr(name){ const s = st(); return Array.isArray(s[name]) ? s[name] : []; }
  function currentEventId(){
    const ev = safe(() => typeof selectedEvent === 'function' ? selectedEvent() : null, null) || safe(() => window.selectedEvent?.(), null);
    return norm(ev?.id || st().selectedEventId || '');
  }
  function srcOf(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || '');
    return '';
  }
  function stores(){ const s = st(); if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {}; if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {}; return {images:s.ticketImages, refs:s.ticketImageRefs}; }
  function jsonGet(key){ return safe(() => JSON.parse(localStorage.getItem(key) || '{}') || {}, {}); }
  function receiptKeys(id){ const ev = currentEventId(); const sid = norm(id); return [`${ev}|INGRESO:${sid}`,`${ev}|INGRESO|${sid}`,`INGRESO:${ev}|${sid}`,`INGRESO:${sid}`,`INGRESO|${sid}`,sid]; }
  function receiptSrc(id){
    const keys = receiptKeys(id);
    const {images, refs} = stores();
    const bags = [images, refs, jsonGet('ControlEvent_ingreso_receipts_v502'), jsonGet('ControlEvent_ingreso_receipts_v468')];
    for(const bag of bags) for(const key of keys){ const src = srcOf(bag && bag[key]); if(src) return src; }
    return '';
  }
  function idFrom(node){ return norm(node?.dataset?.id || node?.getAttribute?.('data-id') || node?.closest?.('[data-id]')?.dataset?.id || ''); }
  function srcFromTrigger(trigger){ const img = trigger?.matches?.('img') ? trigger : trigger?.querySelector?.('img'); return img?.currentSrc || img?.src || receiptSrc(idFrom(trigger)); }
  function personName(id){ return arr('personas').find(p => String(p.id || '') === String(id || ''))?.nombre || ''; }
  function money(v){ try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }catch(_){ return `${Number(v||0).toFixed(2)} €`; } }
  function infoHtml(id){
    const row = arr('colaboradores').find(c => String(c.id || '') === String(id || '')) || {};
    const p = row.persona || arr('personas').find(x => String(x.id || '') === String(row.personaId || '')) || {};
    const nombre = p.nombre || row.nombre || personName(row.personaId) || 'Justificante de ingreso';
    const numero = Number(row.numero || 0) || 0;
    const obligatorio = Number(row.obligatorio || row.base || 0) || 0;
    const voluntario = Number(row.donation ?? row.importeVoluntario ?? row.importe ?? row.voluntario ?? 0) || 0;
    const total = Number(row.total ?? row.totalIngreso ?? (obligatorio + voluntario)) || 0;
    return `<h3>${esc(nombre)}</h3><table><tbody><tr><td>Situación</td><td>${esc(row.situacion || row.formaPago || 'Pendiente')}</td></tr><tr><td>Rango</td><td>${esc(p.rango || row.rango || '-')}</td></tr><tr><td>Nº personas</td><td>${esc(numero)}</td></tr><tr><td>Importe obligatorio</td><td>${esc(money(obligatorio))}</td></tr><tr><td>Importe voluntario</td><td>${esc(money(voluntario))}</td></tr><tr><td>Total ingreso</td><td>${esc(money(total))}</td></tr></tbody></table>`;
  }
  function closeV61Modal(modal, snapshot, ev){
    stop(ev || {});
    try{ modal?.remove(); }catch(_){ }
    markPhotoClosed();
    [0,60,160,320].forEach(ms => setTimeout(() => restoreTooltipSnapshot(snapshot || lastTooltipSnapshot), ms));
    return false;
  }
  function openIPhoneReceipt(trigger, ev){
    if(!isIPhone()) return undefined;
    const id = idFrom(trigger);
    const src = srcFromTrigger(trigger);
    if(!src) return undefined;
    const snapshot = captureTooltipSnapshot(trigger); if(snapshot) lastTooltipSnapshot = snapshot;
    stop(ev);
    try{ $( 'ceV61ReceiptModal' )?.remove(); }catch(_){ }
    const modal = document.createElement('div');
    modal.id = 'ceV61ReceiptModal';
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `<div class="ce-v61-receipt-card"><div class="ce-v61-receipt-head"><span>Justificante de ingreso</span></div><div class="ce-v61-receipt-info">${infoHtml(id)}</div><img class="ce-v61-receipt-img" alt="Justificante de ingreso" src="${esc(src)}"><button type="button" class="ce-v61-receipt-close" data-close="1">✕ Cerrar</button></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('touchend', e => { if(e.target === modal || e.target?.closest?.('[data-close]')) return closeV61Modal(modal, snapshot, e); try{ e.stopPropagation(); }catch(_){ } }, {capture:true, passive:false});
    modal.addEventListener('click', e => { if(e.target === modal || e.target?.closest?.('[data-close]')) return closeV61Modal(modal, snapshot, e); try{ e.stopPropagation(); }catch(_){ } }, true);
    modal.addEventListener('pointerdown', e => { try{ e.stopPropagation(); }catch(_){ } }, true);
    safe(() => modal.querySelector('[data-close]')?.focus({preventScroll:true}), null);
    return false;
  }

  function closeModalFrom(target, ev){
    const modal = target?.closest?.(MODAL_SELECTORS.join(','));
    if(!modal) return undefined;
    const close = target.closest?.(CLOSE_SELECTORS);
    if(close || target === modal){
      const snapshot = modal.__ceV61TooltipSnapshot || lastTooltipSnapshot;
      stop(ev); markPhotoClosed();
      safe(() => modal.remove(), null);
      [40,140,300].forEach(ms => setTimeout(() => restoreTooltipSnapshot(snapshot), ms));
      return false;
    }
    return undefined;
  }

  function injectStyle(){
    if($('ceV61FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV61FinalStyle';
    style.textContent = `
      #ceV61ReceiptModal{position:fixed!important;inset:0!important;z-index:10000090!important;background:rgba(2,6,23,.84)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important;}
      #ceV61ReceiptModal .ce-v61-receipt-card{width:min(1100px,96vw)!important;max-height:94vh!important;background:#fff!important;color:#0f172a!important;border-radius:18px!important;box-shadow:0 24px 90px rgba(0,0,0,.50)!important;padding:12px 12px 68px!important;display:grid!important;grid-template-columns:minmax(260px,380px) minmax(300px,1fr)!important;gap:12px!important;overflow:auto!important;position:relative!important;}
      #ceV61ReceiptModal .ce-v61-receipt-head{grid-column:1/-1!important;font-weight:950!important;}
      #ceV61ReceiptModal .ce-v61-receipt-info{font-size:13px!important;line-height:1.35!important;overflow:auto!important;max-height:78vh!important;background:#f8fafc!important;border:1px solid #e2e8f0!important;border-radius:14px!important;padding:10px!important;}
      #ceV61ReceiptModal .ce-v61-receipt-info h3{margin:0 0 8px!important;font-size:16px!important;}
      #ceV61ReceiptModal .ce-v61-receipt-info table{width:100%!important;border-collapse:collapse!important;}
      #ceV61ReceiptModal .ce-v61-receipt-info td{border-bottom:1px solid #e5e7eb!important;padding:5px 6px!important;}
      #ceV61ReceiptModal .ce-v61-receipt-info td:first-child{font-weight:900!important;color:#475569!important;}
      #ceV61ReceiptModal .ce-v61-receipt-info td:last-child{text-align:right!important;font-weight:850!important;}
      #ceV61ReceiptModal .ce-v61-receipt-img{display:block!important;max-width:100%!important;max-height:78vh!important;object-fit:contain!important;border-radius:12px!important;background:#f8fafc!important;justify-self:center!important;align-self:start!important;}
      #ceV61ReceiptModal .ce-v61-receipt-close,
      #ceV401PcPhotoModal .ce-v401-pc-modal-close,
      #ceV40TicketPhotoModal .ce-v40-modal-close,
      #ceV310PhotoViewer .ce-v310-photo-close,
      #ceV509ReceiptModal [data-close],#ceV504ReceiptModal [data-close],#ceV502ReceiptModal [data-close],#ceV468ReceiptModal [data-close],#ceV465ReceiptModal [data-close],
      .ce-v468-modal [data-close],.ce-v465-modal [data-close],.ce-v5017-budget-modal [data-close],.ce-v512-budget-photo-modal [data-close]{
        position:fixed!important;right:16px!important;bottom:calc(16px + env(safe-area-inset-bottom,0px))!important;top:auto!important;left:auto!important;z-index:10000100!important;background:#fff!important;color:#000!important;border:1px solid #111827!important;border-radius:10px!important;padding:10px 16px!important;font-weight:950!important;min-height:44px!important;min-width:104px!important;box-shadow:0 2px 10px rgba(15,23,42,.22)!important;pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;
      }
      .ce-v468-modal-card,.ce-v465-modal-card,.ce-v40-modal-box,.ce-v401-pc-modal-box{padding-bottom:72px!important;}
      #ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,#ceBudgetLiteTooltipV307 .ce-v5017-budget-thumb,#ceTooltipV21 .ce-v465-tip-thumb,#collabList .ce-v465-receipt-thumb,#collabList .ce-v509-receipt-thumb,#collabList [data-ce-v509-receipt="view"]{pointer-events:auto!important;touch-action:manipulation!important;cursor:zoom-in!important;}
      @media(max-width:760px){#ceV61ReceiptModal .ce-v61-receipt-card{grid-template-columns:1fr!important;width:calc(100vw - 12px)!important;max-height:94vh!important;}#ceV61ReceiptModal .ce-v61-receipt-info{max-height:28vh!important;}#ceV61ReceiptModal .ce-v61-receipt-img{max-height:58vh!important;}}
    `;
    document.head.appendChild(style);
  }

  function install(){
    applyVersion();
    patchAnchorDownloads();
    wrapEnsureExcelJS();
    patchExcelJS();
    injectStyle();
    safe(() => document.querySelectorAll('a[download]').forEach(a => { a.download = normalizeDownloadName(a.download); }), null);
  }

  ['pointerdown','touchstart'].forEach(type => window.addEventListener(type, ev => {
    const thumb = ev.target?.closest?.(RECEIPT_SELECTOR);
    if(thumb){ const snap = captureTooltipSnapshot(thumb); if(snap) lastTooltipSnapshot = snap; }
    if(Date.now() < Math.max(blockLogoutUntil, window.__cePhotoCloseBlockLogoutUntil || 0) && ev.target?.closest?.('#btnLogout,.user-actions')) return stop(ev);
    const close = ev.target?.closest?.(CLOSE_SELECTORS);
    if(close){ markPhotoClosed(); [60,180,360].forEach(ms => setTimeout(() => restoreTooltipSnapshot(lastTooltipSnapshot), ms)); }
  }, {capture:true, passive:false}));

  ['touchend','pointerup'].forEach(type => window.addEventListener(type, ev => {
    if(Date.now() < Math.max(blockLogoutUntil, window.__cePhotoCloseBlockLogoutUntil || 0) && ev.target?.closest?.('#btnLogout,.user-actions')) return stop(ev);
    const thumb = ev.target?.closest?.(RECEIPT_SELECTOR);
    if(thumb && isIPhone()) return openIPhoneReceipt(thumb, ev);
  }, {capture:true, passive:false}));

  ['click','touchend','pointerdown'].forEach(type => document.addEventListener(type, ev => {
    if(Date.now() < Math.max(blockLogoutUntil, window.__cePhotoCloseBlockLogoutUntil || 0) && ev.target?.closest?.('#btnLogout,.user-actions')) return stop(ev);
    closeModalFrom(ev.target, ev);
  }, {capture:true, passive:false}));

  document.addEventListener('keydown', ev => {
    if(ev.key === 'Escape'){
      const modal = document.querySelector(MODAL_SELECTORS.join(','));
      if(modal){ stop(ev); const snap = modal.__ceV61TooltipSnapshot || lastTooltipSnapshot; safe(() => modal.remove(), null); markPhotoClosed(); [40,140,300].forEach(ms => setTimeout(() => restoreTooltipSnapshot(snap), ms)); }
    }
  }, true);

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:excel-before-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnExportExcel,#btnExportSeed,a[download]')) install(); }, true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(install, 20); }, true);
  [0,100,500,1200,3000].forEach(ms => setTimeout(install, ms));
  safe(() => {
    const header = document.querySelector('.appname,.appname-stack') || document.body;
    if(header){ const mo = new MutationObserver(() => { clearTimeout(mo.__ceV61t); mo.__ceV61t = setTimeout(applyVersion, 40); }); mo.observe(header, {childList:true, characterData:true, subtree:true}); }
  }, null);

  window.ControlEventV61ProdFinalFix = {version:VERSION, versionFile:VERSION_FILE, install, normalizeDownloadName, patchExcelJS, restoreTooltipSnapshot};
})();
