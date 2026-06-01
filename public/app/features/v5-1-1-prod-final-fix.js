/* ControlEvent v5.1.1_prod - cierre quirurgico: version, INFOEVENTO, retorno a globo y iPhone ingresos.
   Sin setInterval: sólo eventos, MutationObserver de cabecera/título y acciones de Excel/foto. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v5.1.1_prod';
  const VERSION_FILE = 'ControlEvent_v5_1_1_prod';
  const INSTALLED = '__ceV511ProdFinalFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const PHOTO_MODAL_SELECTOR = '#ceV401PcPhotoModal,#ceV512BudgetPhotoModal,#ceV310PhotoViewer,#ceV509ReceiptModal,#ceV504ReceiptModal,#ceV502ReceiptModal,#ceV468ReceiptModal,#ceV465ReceiptModal,.ce-v468-modal,.ce-v465-modal,.ce-v512-budget-photo-modal,.ce-v5017-budget-modal,.ce-v504-modal,.ce-v505-photo-modal,.ce-v506-photo-modal,.ce-v508-photo-modal,.ce-receipt-modal-v463,[data-ce-iphone-receipt-modal]';
  const TOOLTIP_SELECTOR = '#ceBudgetLiteTooltipV307,#ceTooltipV21,#ceV462Tooltip,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip';
  const RECEIPT_SELECTOR = '#collabList [data-ce-v509-receipt="view"],#collabList .ce-v509-receipt-thumb,#collabList .ce-v504-receipt-thumb,#collabList .ce-v502-receipt-thumb,#collabList .ce-v465-receipt-thumb,#collabList .ce-v464-receipt-tools button[data-action*="view"],#ceBudgetLiteTooltipV307 .ce-v5017-budget-thumb,#ceBudgetLiteTooltipV307 [data-ce-v5017-budget-thumb],#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,#ceTooltipV21 .ce-v465-tip-thumb,.ce-v21-tooltip .ce-v465-tip-thumb,.ce-budget-tooltip .ce-v465-tip-thumb,.ce-tooltip .ce-v465-tip-thumb,[data-ce-v512-budget-photo]';

  let tooltipSnapshot = null;
  let versionGuardBusy = false;

  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const esc = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const pad = v => String(v).padStart(2, '0');
  const clean = v => String(v || 'EVENTO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^A-Za-z0-9._ -]+/g,'_').trim().replace(/\s+/g,'_').replace(/_+/g,'_').slice(0,95) || 'EVENTO';

  function normalizeText(value){
    return String(value == null ? '' : value)
      .replace(/ControlEvent_v\d+(?:_\d+){1,5}(?:_prod)?/ig, VERSION_FILE)
      .replace(/ControlEvent\s+v\d+(?:\.\d+){1,5}(?:_prod)?/ig, VERSION);
  }
  function emittedBy(date = new Date()){
    return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${pad(date.getDate())}${pad(date.getMonth()+1)}${date.getFullYear()}_${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}"`;
  }
  function currentEventTitle(){
    const sel = document.getElementById('selectedEvent');
    const txt = sel?.selectedOptions?.[0]?.textContent || sel?.options?.[sel.selectedIndex]?.textContent || 'EVENTO';
    return clean(txt.replace(/^\s*(FINALIZADO|EN CURSO)\s*[-–:]?\s*/i,''));
  }
  function infoEventoName(name){
    const now = new Date();
    let n = normalizeText(name || '');
    if(!/INFOEVENTO/i.test(n)) return n;
    const date = (n.match(/_(\d{8})(?:_\d{6})?(?:_\d{8}(?:_\d{6})?)*\.xlsx$/i) || [])[1] || `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}`;
    const after = n.split(/INFOEVENTO[-_]/i)[1] || currentEventTitle();
    const base = after.replace(/\.xlsx$/i,'').replace(/(?:_\d{8}(?:_\d{6})?)+$/g,'') || currentEventTitle();
    return `${VERSION_FILE}_INFOEVENTO-${clean(base)}_${date}.xlsx`;
  }
  function normalizeDownloadName(name){
    let n = normalizeText(name || '');
    if(/INFOEVENTO/i.test(n)) return infoEventoName(n);
    if(/BACKUP/i.test(n)) return n.replace(/ControlEvent_v\d+(?:_\d+){1,5}(?:_prod)?/ig, VERSION_FILE);
    return n;
  }

  function applyVersion(){
    safe(() => { if(document.title !== VERSION) document.title = VERSION; }, null);
    safe(() => {
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE};
      if(document.body) document.body.dataset.ceVersion = VERSION;
    }, null);
    safe(() => {
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label],.brand [data-ce-version-label]').forEach(el => {
        const txt = el.textContent || '';
        if(/ControlEvent\s+v/i.test(txt) || el.matches('[data-ce-version-label]')) el.textContent = VERSION;
      });
    }, null);
  }
  function scheduleApplyVersion(){
    if(versionGuardBusy) return;
    versionGuardBusy = true;
    setTimeout(() => { versionGuardBusy = false; applyVersion(); }, 25);
  }
  function installVersionGuard(){
    if(window.__ceV511VersionGuard) return;
    window.__ceV511VersionGuard = true;
    const observe = target => {
      if(!target || !window.MutationObserver) return;
      try{
        new MutationObserver(muts => {
          for(const m of muts){
            const txt = (m.target?.textContent || '') + '';
            if(/ControlEvent\s+v/i.test(txt) && !txt.includes('v5.1.1_prod')){ scheduleApplyVersion(); break; }
          }
        }).observe(target, {childList:true, characterData:true, subtree:true});
      }catch(_){ }
    };
    observe(document.querySelector('title'));
    observe(document.querySelector('.header'));
  }

  function installEmittedAndNames(){
    safe(() => { window.emittedByTextV171 = emittedBy; }, null);
    safe(() => { emittedByTextV171 = emittedBy; }, null);
    const fileFn = function(ev){
      const d = new Date();
      const title = clean(ev?.titulo || safe(() => currentEvent().titulo, '') || safe(() => selectedEvent().titulo, '') || currentEventTitle());
      return `${VERSION_FILE}_INFOEVENTO-${title}_${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.xlsx`;
    };
    safe(() => { window.makeInfoEventoFilename = fileFn; window.xlsxFilename = fileFn; }, null);
    safe(() => { makeInfoEventoFilename = fileFn; }, null);
    safe(() => { xlsxFilename = fileFn; }, null);
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
    if(!wb) return wb;
    safe(() => { wb.creator = normalizeText(wb.creator || `${VERSION} - ©oltyLAB '26`); }, null);
    safe(() => { wb.lastModifiedBy = VERSION; }, null);
    safe(() => (wb.worksheets || []).forEach(ws => ws.eachRow(row => row.eachCell(cell => { cell.value = scrubValue(cell.value); }))), null);
    return wb;
  }
  function patchWorkbookInstance(wb){
    if(!wb || !wb.xlsx || typeof wb.xlsx.writeBuffer !== 'function' || wb.__ceV511WritePatched) return wb;
    wb.__ceV511WritePatched = true;
    const oldWriteBuffer = wb.xlsx.writeBuffer.bind(wb.xlsx);
    wb.xlsx.writeBuffer = function(){ scrubWorkbook(wb); return oldWriteBuffer.apply(this, arguments); };
    return wb;
  }
  function patchExcelJS(){
    const X = window.ExcelJS;
    if(!X || typeof X.Workbook !== 'function') return false;
    if(!X.__ceV511WorkbookPatched){
      const Original = X.Workbook;
      function WorkbookPatched(){ return patchWorkbookInstance(new Original(...arguments)); }
      safe(() => { WorkbookPatched.prototype = Original.prototype; Object.setPrototypeOf(WorkbookPatched, Original); }, null);
      X.Workbook = WorkbookPatched;
      X.__ceV511WorkbookPatched = true;
    }
    return true;
  }
  function wrapEnsureExcelJS(){
    const fn = window.ensureExcelJS;
    if(typeof fn !== 'function' || fn.__ceV511EnsureWrapped) return;
    const wrapped = async function(){ const res = await fn.apply(this, arguments); installEmittedAndNames(); patchExcelJS(); return res; };
    wrapped.__ceV511EnsureWrapped = true;
    window.ensureExcelJS = wrapped;
  }
  function patchDownloads(){
    const proto = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
    const nativeClick = window.HTMLElement && HTMLElement.prototype && HTMLElement.prototype.click;
    if(!proto || !nativeClick || proto.__ceV511DownloadPatched) return;
    proto.__ceV511DownloadPatched = true;
    const oldSetAttribute = proto.setAttribute;
    proto.setAttribute = function(name, value){
      if(String(name || '').toLowerCase() === 'download') value = normalizeDownloadName(value);
      return oldSetAttribute.call(this, name, value);
    };
    proto.click = function(){
      try{ if(this && this.download) this.download = normalizeDownloadName(this.download); }catch(_){ }
      return nativeClick.call(this);
    };
  }

  function visibleTooltipRoots(){
    return Array.from(document.querySelectorAll(TOOLTIP_SELECTOR)).filter((el, idx, arr) => {
      if(!el || arr.indexOf(el) !== idx) return false;
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return (cs.display !== 'none' && cs.visibility !== 'hidden' && rect.width > 8 && rect.height > 8) || el.classList.contains('open');
    });
  }
  function captureTooltip(trigger){
    const root = trigger?.closest?.(TOOLTIP_SELECTOR);
    const list = root ? [root] : visibleTooltipRoots();
    if(!list.length) return null;
    return list.map(el => ({id:el.id || '', html:el.outerHTML, scrollTop:el.scrollTop || 0, scrollLeft:el.scrollLeft || 0}));
  }
  function clamp(el){
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth || 0;
    const vh = window.innerHeight || document.documentElement.clientHeight || 0;
    let left = rect.left, top = rect.top;
    if(!Number.isFinite(left) || left < 8) left = 8;
    if(!Number.isFinite(top) || top < 8) top = 8;
    if(left + rect.width > vw - 8) left = Math.max(8, vw - rect.width - 8);
    if(top + rect.height > vh - 8) top = Math.max(8, vh - rect.height - 8);
    el.style.setProperty('position','fixed','important');
    el.style.setProperty('left', Math.round(left) + 'px', 'important');
    el.style.setProperty('top', Math.round(top) + 'px', 'important');
    el.style.setProperty('right','auto','important');
    el.style.setProperty('bottom','auto','important');
    el.style.setProperty('display','block','important');
    el.style.setProperty('visibility','visible','important');
    el.style.setProperty('opacity','1','important');
    el.style.setProperty('max-width','calc(100vw - 16px)','important');
    el.style.setProperty('max-height','82vh','important');
    el.style.setProperty('overflow','auto','important');
    el.style.setProperty('z-index','600000','important');
  }
  function restoreTooltip(snapshot){
    const snap = snapshot || tooltipSnapshot;
    if(!snap || !snap.length) return;
    snap.forEach(item => {
      safe(() => {
        let el = item.id ? document.getElementById(item.id) : null;
        if(!el){
          const holder = document.createElement('div');
          holder.innerHTML = item.html;
          el = holder.firstElementChild;
          if(el) document.body.appendChild(el);
        }
        if(!el) return;
        el.removeAttribute('aria-hidden');
        el.classList.add('open');
        clamp(el);
        el.scrollTop = item.scrollTop || 0;
        el.scrollLeft = item.scrollLeft || 0;
      }, null);
    });
    safe(() => window.ControlEventV469?.enrichOpenTooltips?.(), null);
  }

  function installTooltipReturn(){
    document.addEventListener('pointerdown', ev => {
      const thumb = ev.target?.closest?.(RECEIPT_SELECTOR);
      if(thumb && thumb.closest?.(TOOLTIP_SELECTOR)) tooltipSnapshot = captureTooltip(thumb) || tooltipSnapshot;
    }, true);
    document.addEventListener('click', ev => {
      const close = ev.target?.closest?.('[data-close],[data-ce-v512-budget-photo-close],.ce-v401-pc-modal-close,.ce-v40-modal-close,.ce-v310-photo-close');
      const modal = ev.target?.closest?.(PHOTO_MODAL_SELECTOR);
      if(close || modal){ setTimeout(() => restoreTooltip(), 35); }
    }, true);
    document.addEventListener('keydown', ev => { if(ev.key === 'Escape') setTimeout(() => restoreTooltip(), 35); }, true);
  }

  function imgSrc(trigger){
    const img = trigger?.matches?.('img') ? trigger : trigger?.querySelector?.('img');
    let src = img?.currentSrc || img?.src || trigger?.dataset?.src || trigger?.dataset?.url || '';
    if(src) return src;
    const id = trigger?.dataset?.id || trigger?.getAttribute?.('data-id') || trigger?.closest?.('[data-id]')?.dataset?.id || '';
    if(!id) return '';
    const ev = safe(() => window.selectedEvent?.().id, '') || safe(() => selectedEvent().id, '') || safe(() => state.selectedEventId, '');
    const keys = [`${ev}|INGRESO:${id}`,`${ev}|INGRESO|${id}`,`INGRESO:${ev}|${id}`,`INGRESO:${id}`,`INGRESO|${id}`,id];
    const bags = [safe(() => state.ticketImages, {}), safe(() => state.ticketImageRefs, {}), safe(() => JSON.parse(localStorage.getItem('ControlEvent_ingreso_receipts_v502') || '{}'), {}), safe(() => JSON.parse(localStorage.getItem('ControlEvent_ingreso_receipts_v468') || '{}'), {})];
    for(const bag of bags){
      for(const key of keys){
        const v = bag && bag[key];
        src = typeof v === 'string' ? v : (v?.url || v?.public_url || v?.publicUrl || v?.dataUrl || v?.base64 || '');
        if(src) return src;
      }
    }
    return '';
  }
  function isIPhone(){ return /iPhone|iPod/i.test(navigator.userAgent || ''); }
  function openIPhoneReceipt(trigger, ev){
    if(!isIPhone()) return undefined;
    const src = imgSrc(trigger);
    if(!src) return undefined;
    tooltipSnapshot = captureTooltip(trigger) || tooltipSnapshot;
    document.querySelectorAll('[data-ce-iphone-receipt-modal]').forEach(el => el.remove());
    const ov = document.createElement('div');
    ov.setAttribute('data-ce-iphone-receipt-modal','1');
    ov.setAttribute('data-ce-preserve-tooltip','1');
    ov.innerHTML = `<div class="ce-v511-iphone-card" role="dialog" aria-modal="true"><div class="ce-v511-iphone-head"><span>Justificante de ingreso</span></div><img src="${esc(src)}" alt="Justificante de ingreso"><button type="button" data-close="1">✕ Cerrar</button></div>`;
    document.body.appendChild(ov);
    return stop(ev);
  }
  function installIPhoneFallback(){
    document.addEventListener('click', ev => {
      const trigger = ev.target?.closest?.(RECEIPT_SELECTOR);
      if(trigger && isIPhone()) return openIPhoneReceipt(trigger, ev);
      const close = ev.target?.closest?.('[data-ce-iphone-receipt-modal] [data-close]');
      const modal = ev.target?.closest?.('[data-ce-iphone-receipt-modal]');
      if(close || (modal && ev.target === modal)){ stop(ev); modal.remove(); setTimeout(() => restoreTooltip(), 25); return false; }
      return undefined;
    }, true);
  }

  function eagerVisibleThumbs(){
    safe(() => document.querySelectorAll(`${TOOLTIP_SELECTOR} img,.ce-v465-tip-thumb img,.ce-v5017-budget-thumb img,#collabList img`).forEach(img => {
      img.loading = 'eager'; img.decoding = 'async';
      try{ img.fetchPriority = 'high'; }catch(_){ }
    }), null);
  }
  function injectStyle(){
    if(document.getElementById('ceV511FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV511FinalStyle';
    style.textContent = `
      [data-ce-iphone-receipt-modal]{position:fixed!important;inset:0!important;background:rgba(2,6,23,.86)!important;z-index:10000090!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important;}
      [data-ce-iphone-receipt-modal] .ce-v511-iphone-card{width:min(96vw,860px)!important;max-height:94vh!important;background:#fff!important;color:#0f172a!important;border-radius:18px!important;padding:12px!important;display:flex!important;flex-direction:column!important;gap:10px!important;overflow:auto!important;box-shadow:0 24px 80px rgba(0,0,0,.45)!important;}
      [data-ce-iphone-receipt-modal] .ce-v511-iphone-head{font-weight:950!important;}
      [data-ce-iphone-receipt-modal] img{max-width:100%!important;max-height:78vh!important;object-fit:contain!important;border-radius:12px!important;background:#f8fafc!important;}
      [data-ce-iphone-receipt-modal] button{align-self:flex-end!important;background:#fff!important;color:#000!important;border:1px solid #111827!important;border-radius:10px!important;min-height:42px!important;padding:8px 14px!important;font-weight:900!important;touch-action:manipulation!important;}
    `;
    document.head.appendChild(style);
  }

  function install(){
    applyVersion();
    installEmittedAndNames();
    wrapEnsureExcelJS();
    patchExcelJS();
    patchDownloads();
    installVersionGuard();
    injectStyle();
    eagerVisibleThumbs();
    safe(() => document.querySelectorAll('a[download]').forEach(a => { a.download = normalizeDownloadName(a.download); }), null);
  }

  installTooltipReturn();
  installIPhoneFallback();
  ['DOMContentLoaded','load','pageshow','visibilitychange','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:excel-before-run','controlevent:excel-after-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnExportExcel,#btnExportSeed,a[download]')) install(); }, true);
  document.addEventListener('pointerup', () => setTimeout(applyVersion, 20), true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(install, 30); }, true);
  [0,80,300,900,1800].forEach(ms => setTimeout(install, ms));

  window.ControlEventV511ProdFinalFix = {version:VERSION, versionFile:VERSION_FILE, install, applyVersion, emittedBy, normalizeDownloadName, restoreTooltip};
})();
