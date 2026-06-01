/* ControlEvent v5.2.0_prod - parche final desde v5.1.0.
   Alcance: versión real, Excel INFOEVENTO/BACKUP, retorno a globo de GRAFICAS y visor iPhone ingresos.
   Sin setInterval ni trabajo periódico. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v5.2.0_prod';
  const VERSION_FILE = 'ControlEvent_v5_2_0_prod';
  const INSTALLED = '__ceV520ProdFinalFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const TOOLTIP_SELECTORS = '#ceTooltipV21,#ceBudgetLiteTooltipV307,#ceBudgetLiteTooltipV309';
  const PHOTO_MODAL_SELECTORS = '#ceV520PhotoModal,#ceV310PhotoViewer,#ceV40TicketPhotoModal,#ceV509ReceiptModal,.ce-v465-modal,.ce-receipt-modal-v463,.ce-v509-modal';
  const INCOME_PHOTO_TARGETS = '[data-ce-v509-receipt="view"],.ce-v509-receipt-thumb,.ce-v465-receipt-thumb,.ce-v465-tip-thumb,.ce-v509-modal-img,.ce-v465-modal-img';
  const THUMB_TARGETS = `${INCOME_PHOTO_TARGETS},#ceTooltipV21 img,#ceBudgetLiteTooltipV307 img,#ceBudgetLiteTooltipV309 img,#summaryTiendaTicket img.ticket-thumb`;
  let tooltipSnapshot = null;
  let lastOpenSig = '';
  let lastOpenAt = 0;
  let mo = null;

  const $ = id => document.getElementById(id);
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const pad = n => String(n).padStart(2,'0');
  const nowYmd = (d=new Date()) => `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}`;
  const nowHms = (d=new Date()) => `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent || '') || ((navigator.platform || '') === 'MacIntel' && navigator.maxTouchPoints > 1);

  function cleanFilePart(value){
    return String(value || 'EVENTO')
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-zA-Z0-9._ -]+/g,'_').trim().replace(/\s+/g,'_').replace(/_+/g,'_')
      .replace(/^_+|_+$/g,'').slice(0,95) || 'EVENTO';
  }
  function normalizeText(value){
    return String(value == null ? '' : value)
      .replace(/ControlEvent_v\d+(?:_\d+){1,4}(?:_prod)?/ig, VERSION_FILE)
      .replace(/ControlEvent\s+v\d+(?:\.\d+){1,4}(?:_prod)?/ig, VERSION)
      .replace(/controlevent-shell-v\d+(?:-\d+){1,4}-prod/ig, 'controlevent-shell-v5-2-0-prod');
  }
  function appState(){
    try{ if(window.state && typeof window.state === 'object') return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  function arr(name){ const s = appState(); return Array.isArray(s[name]) ? s[name] : []; }
  function currentEvent(){
    try{ if(typeof window.selectedEvent === 'function') return window.selectedEvent() || {}; }catch(_){ }
    const s=appState(); const id=String(s.selectedEventId || '');
    return arr('eventos').find(ev => String(ev.id) === id) || {};
  }
  function currentEventId(){ const ev=currentEvent(); return String(ev.id || appState().selectedEventId || ''); }
  function currentEventTitle(){
    const sel = $('selectedEvent');
    const raw = sel?.selectedOptions?.[0]?.textContent || sel?.options?.[sel.selectedIndex]?.textContent || currentEvent().titulo || 'EVENTO';
    return cleanFilePart(String(raw).replace(/^\s*(FINALIZADO|EN CURSO)\s*[-–:]?\s*/i,''));
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
      document.querySelectorAll('.appname span,.appname-stack span,[data-ce-version-label],title').forEach(el => {
        const txt = el.textContent || '';
        if(/ControlEvent\s+v/i.test(txt) || el.matches('[data-ce-version-label]')) el.textContent = VERSION;
      });
    }, null);
  }

  function normalizeDownloadName(name){
    let n = normalizeText(name || '');
    if(!n) return n;
    const d = new Date();
    n = n.replace(/[\\/:*?"<>|]+/g, '_').replace(/__+/g,'_');
    if(/INFOEVENTO/i.test(n)){
      let tail = n.split(/INFOEVENTO[-_]/i).pop() || currentEventTitle();
      tail = tail.replace(/\.xlsx$/i,'');
      tail = tail.replace(/(?:_\d{8}(?:_\d{6})?)+$/g,'');
      const date = (n.match(/_(\d{8})(?:_\d{6})?(?:_\d{8}(?:_\d{6})?)*\.xlsx$/i) || [])[1] || nowYmd(d);
      n = `${VERSION_FILE}_INFOEVENTO-${cleanFilePart(tail || currentEventTitle())}_${date}.xlsx`;
    }else if(/BACKUP/i.test(n) || /descarga_datos\.xlsx$/i.test(n)){
      const tail = (n.split(/_BACKUP_/i)[1] || `TODOS_${nowYmd(d)}_${nowHms(d)}.xlsx`).replace(/\.xlsx$/i,'');
      let scope = tail.replace(/_\d{8}_\d{6}$/,'') || 'TODOS';
      const m = tail.match(/_(\d{8})_(\d{6})$/);
      n = `${VERSION_FILE}_BACKUP_${cleanFilePart(scope)}_${m ? m[1] : nowYmd(d)}_${m ? m[2] : nowHms(d)}.xlsx`;
    }
    return n.replace(/_+\.xlsx$/i,'.xlsx').replace(/__+/g,'_');
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
    if(!wb || wb.__ceV520Scrubbing) return wb;
    wb.__ceV520Scrubbing = true;
    safe(() => { wb.creator = `${VERSION} - ©oltyLAB '26`; }, null);
    safe(() => { wb.lastModifiedBy = VERSION; }, null);
    safe(() => {
      (wb.worksheets || []).forEach(ws => ws.eachRow(row => row.eachCell(cell => { cell.value = scrubValue(cell.value); })));
    }, null);
    wb.__ceV520Scrubbing = false;
    return wb;
  }
  function patchWorkbookInstance(wb){
    if(!wb || wb.__ceV520WritePatched || !wb.xlsx || typeof wb.xlsx.writeBuffer !== 'function') return wb;
    wb.__ceV520WritePatched = true;
    const oldWriteBuffer = wb.xlsx.writeBuffer.bind(wb.xlsx);
    wb.xlsx.writeBuffer = function(){ scrubWorkbook(wb); return oldWriteBuffer.apply(this, arguments); };
    return wb;
  }
  function patchExcelJS(){
    const X = window.ExcelJS;
    if(!X || !X.Workbook || X.__ceV520WorkbookPatched) return false;
    const Original = X.Workbook;
    function WorkbookPatched(){ return patchWorkbookInstance(new Original(...arguments)); }
    try{ WorkbookPatched.prototype = Original.prototype; Object.setPrototypeOf(WorkbookPatched, Original); }catch(_){ }
    X.Workbook = WorkbookPatched;
    X.__ceV520WorkbookPatched = true;
    return true;
  }
  function patchEnsureExcelJS(){
    const fn = window.ensureExcelJS;
    if(typeof fn !== 'function' || fn.__ceV520Wrapped) return;
    const wrapped = async function(){ const res = await fn.apply(this, arguments); patchExcelJS(); return res; };
    wrapped.__ceV520Wrapped = true;
    window.ensureExcelJS = wrapped;
  }
  function patchDownloads(){
    const proto = window.HTMLAnchorElement && HTMLAnchorElement.prototype;
    if(!proto || proto.__ceV520DownloadsPatched) return;
    proto.__ceV520DownloadsPatched = true;
    const oldSet = proto.setAttribute;
    proto.setAttribute = function(name, value){
      if(String(name || '').toLowerCase() === 'download') value = normalizeDownloadName(value);
      return oldSet.call(this, name, value);
    };
    const desc = Object.getOwnPropertyDescriptor(proto, 'download');
    if(desc && desc.configurable){
      Object.defineProperty(proto, 'download', {
        configurable:true,
        enumerable:desc.enumerable,
        get:function(){ return desc.get ? desc.get.call(this) : this.getAttribute('download'); },
        set:function(value){ const v = normalizeDownloadName(value); return desc.set ? desc.set.call(this, v) : this.setAttribute('download', v); }
      });
    }
    const nativeClick = proto.click;
    if(typeof nativeClick === 'function'){
      proto.click = function(){ try{ if(this.download) this.download = normalizeDownloadName(this.download); }catch(_){ } return nativeClick.apply(this, arguments); };
    }
  }

  function captureTooltipFrom(target){
    const tip = target?.closest?.(TOOLTIP_SELECTORS);
    if(!tip) return;
    const r = tip.getBoundingClientRect();
    tooltipSnapshot = {
      id: tip.id,
      html: tip.innerHTML,
      className: tip.className,
      style: tip.getAttribute('style') || '',
      left: Number.isFinite(r.left) ? r.left : 12,
      top: Number.isFinite(r.top) ? r.top : 12,
      width: r.width || 0,
      height: r.height || 0,
      scrollTop: tip.scrollTop || 0,
      scrollLeft: tip.scrollLeft || 0,
      at: Date.now()
    };
  }
  function clampTooltip(tip){
    if(!tip) return;
    const r = tip.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left || 8, window.innerWidth - Math.max(120, r.width) - 8));
    const top = Math.max(8, Math.min(r.top || 8, window.innerHeight - Math.min(window.innerHeight - 16, Math.max(120, r.height)) - 8));
    tip.style.left = `${Math.round(left)}px`;
    tip.style.top = `${Math.round(top)}px`;
  }
  function restoreTooltipSnapshot(){
    const snap = tooltipSnapshot;
    if(!snap || Date.now() - snap.at > 120000) return;
    let tip = $(snap.id);
    if(!tip){ tip = document.createElement('div'); tip.id = snap.id; document.body.appendChild(tip); }
    if(!tip.innerHTML.trim()) tip.innerHTML = snap.html;
    if(snap.className) tip.className = snap.className;
    if(snap.style) tip.setAttribute('style', snap.style);
    tip.style.display = 'block';
    tip.style.visibility = 'visible';
    tip.style.opacity = '1';
    tip.style.pointerEvents = 'auto';
    tip.style.zIndex = '1000001';
    if(!tip.style.left || tip.style.left === '0px') tip.style.left = Math.round(snap.left) + 'px';
    if(!tip.style.top || tip.style.top === '0px') tip.style.top = Math.round(snap.top) + 'px';
    safe(() => { tip.scrollTop = snap.scrollTop || 0; tip.scrollLeft = snap.scrollLeft || 0; }, null);
    prepareImages(tip);
    clampTooltip(tip);
  }
  function afterPhotoClose(){
    [0,40,120].forEach(ms => setTimeout(restoreTooltipSnapshot, ms));
  }

  function tagPhotoModals(root=document){
    safe(() => {
      root.querySelectorAll?.(PHOTO_MODAL_SELECTORS).forEach(modal => {
        modal.setAttribute('data-ce-preserve-tooltip','1');
        modal.style.setProperty('touch-action','auto','important');
        modal.querySelectorAll('[data-close],button,.ce-v310-photo-close,.ce-v40-modal-close').forEach(btn => {
          btn.style.setProperty('pointer-events','auto','important');
          btn.style.setProperty('touch-action','manipulation','important');
        });
      });
    }, null);
  }
  function closeOpenPhotoModal(ev){
    const modal = ev?.target?.closest?.(PHOTO_MODAL_SELECTORS);
    if(!modal) return undefined;
    const isClose = ev.target === modal || ev.target?.closest?.('[data-close],.ce-v310-photo-close,.ce-v40-modal-close');
    if(!isClose) return undefined;
    stop(ev);
    safe(() => modal.remove(), null);
    afterPhotoClose();
    return false;
  }
  function prepareImages(root=document){
    safe(() => {
      root.querySelectorAll?.('#ceTooltipV21 img,#ceBudgetLiteTooltipV307 img,#ceBudgetLiteTooltipV309 img,#summaryTiendaTicket img.ticket-thumb,#collabList .ce-v509-receipt-thumb img,#collabList .ce-v465-receipt-thumb img').forEach(img => {
        img.loading = 'eager';
        img.decoding = 'async';
        img.setAttribute('fetchpriority','high');
        img.style.setProperty('pointer-events','auto','important');
        img.style.setProperty('cursor','zoom-in','important');
      });
    }, null);
  }

  function srcFromStateForIncome(id){
    id = String(id || '').trim();
    if(!id) return '';
    const ev = currentEventId();
    const s = appState();
    const bags = [s.ticketImages, s.ticketImageRefs];
    const keys = [`${ev}|INGRESO:${id}`, `${ev}|INGRESO|${id}`, `INGRESO:${ev}|${id}`, `INGRESO:${id}`, id];
    for(const bag of bags){
      if(!bag || typeof bag !== 'object') continue;
      for(const key of keys){
        const value = bag[key];
        const src = typeof value === 'string' ? value : (value?.url || value?.public_url || value?.publicUrl || value?.pathname || value?.path || value?.storage_path || value?.dataUrl || value?.base64 || '');
        if(String(src || '').trim()) return String(src).trim();
      }
    }
    return '';
  }
  function resolvePhotoTarget(target){
    const el = target?.closest?.(THUMB_TARGETS);
    if(!el) return null;
    const img = el.tagName === 'IMG' ? el : (el.querySelector?.('img') || el.closest?.('.ce-v509-receipt-strip,.ce-v465-receipt-strip')?.querySelector?.('img'));
    let src = img?.currentSrc || img?.src || '';
    const id = el.dataset?.id || el.closest?.('[data-id]')?.dataset?.id || '';
    if(!src && id) src = srcFromStateForIncome(id);
    if(!src) return null;
    const ticket = el.matches?.('#summaryTiendaTicket img.ticket-thumb,#ceBudgetLiteTooltipV307 img.ticket-thumb,#ceBudgetLiteTooltipV309 img.ticket-thumb') || el.closest?.('#summaryTiendaTicket');
    return {src, title: ticket ? 'Foto de ticket' : 'Justificante de ingreso'};
  }
  function openSimplePhoto(photo, ev){
    if(!photo?.src) return undefined;
    const sig = `${photo.title}|${photo.src}`;
    const now = Date.now();
    if(sig === lastOpenSig && now - lastOpenAt < 700) return stop(ev);
    lastOpenSig = sig; lastOpenAt = now;
    stop(ev);
    tagPhotoModals();
    safe(() => $('ceV520PhotoModal')?.remove(), null);
    const modal = document.createElement('div');
    modal.id = 'ceV520PhotoModal';
    modal.setAttribute('data-ce-preserve-tooltip','1');
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `<div class="ce-v520-photo-box"><div class="ce-v520-photo-head"><span>${esc(photo.title || 'Foto')}</span><button type="button" data-close="1">Cerrar</button></div><img alt="${esc(photo.title || 'Foto')}" src="${esc(photo.src)}"></div>`;
    document.body.appendChild(modal);
    tagPhotoModals(modal);
    safe(() => modal.querySelector('[data-close]')?.focus({preventScroll:true}), null);
    return false;
  }

  function injectStyle(){
    if($('ceV520FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV520FinalStyle';
    style.textContent = `
      #ceTooltipV21,#ceBudgetLiteTooltipV307,#ceBudgetLiteTooltipV309{pointer-events:auto!important;max-width:calc(100vw - 16px)!important;max-height:calc(100vh - 16px)!important;overflow:auto!important;}
      #ceTooltipV21 img,#ceBudgetLiteTooltipV307 img,#ceBudgetLiteTooltipV309 img{loading:eager!important;cursor:zoom-in!important;}
      #ceV520PhotoModal{position:fixed!important;inset:0!important;z-index:10000090!important;background:rgba(2,6,23,.84)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:10px!important;touch-action:auto!important;}
      #ceV520PhotoModal .ce-v520-photo-box{width:min(1180px,98vw)!important;max-height:96vh!important;display:flex!important;flex-direction:column!important;gap:8px!important;align-items:center!important;}
      #ceV520PhotoModal .ce-v520-photo-head{width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;color:#fff!important;font-weight:900!important;}
      #ceV520PhotoModal [data-close]{appearance:none!important;border:1px solid #111827!important;background:#fff!important;color:#000!important;border-radius:9px!important;min-width:78px!important;min-height:42px!important;font-weight:950!important;cursor:pointer!important;pointer-events:auto!important;touch-action:manipulation!important;}
      #ceV520PhotoModal img{display:block!important;max-width:98vw!important;max-height:88vh!important;object-fit:contain!important;border-radius:10px!important;background:#fff!important;box-shadow:0 22px 80px rgba(0,0,0,.48)!important;}
      #ceV310PhotoViewer,#ceV40TicketPhotoModal,#ceV509ReceiptModal,.ce-v465-modal,.ce-receipt-modal-v463,.ce-v509-modal{touch-action:auto!important;}
      #ceV310PhotoViewer [data-close],#ceV310PhotoViewer button,#ceV40TicketPhotoModal button,#ceV509ReceiptModal [data-close],.ce-v465-modal [data-close],.ce-receipt-modal-v463 [data-close],.ce-v509-modal [data-close]{pointer-events:auto!important;touch-action:manipulation!important;background:#fff!important;color:#000!important;}
      @media(max-width:720px){#ceV520PhotoModal .ce-v520-photo-box{width:calc(100vw - 16px)!important;}#ceV520PhotoModal img{max-height:78vh!important;}}
    `;
    document.head.appendChild(style);
  }

  function installObserver(){
    if(mo || !document.body) return;
    mo = new MutationObserver(records => {
      let needs = false;
      for(const rec of records){
        for(const node of rec.addedNodes || []){
          if(node.nodeType === 1 && (node.matches?.(PHOTO_MODAL_SELECTORS + ',' + TOOLTIP_SELECTORS) || node.querySelector?.(PHOTO_MODAL_SELECTORS + ',' + TOOLTIP_SELECTORS))){ needs = true; break; }
        }
        if(needs) break;
      }
      if(needs){ tagPhotoModals(); prepareImages(); }
    });
    mo.observe(document.body, {childList:true, subtree:true});
  }

  function install(){
    applyVersion();
    injectStyle();
    patchDownloads();
    patchEnsureExcelJS();
    patchExcelJS();
    tagPhotoModals();
    prepareImages();
    installObserver();
    safe(() => document.querySelectorAll('a[download]').forEach(a => { a.download = normalizeDownloadName(a.download); }), null);
  }

  // Capturar el globo antes de que cualquier visor abra la foto.
  ['pointerdown','touchstart','click'].forEach(type => window.addEventListener(type, ev => {
    const target = ev.target;
    if(target?.closest?.(THUMB_TARGETS)) captureTooltipFrom(target);
  }, {capture:true, passive:false}));

  // En iPhone abrimos nosotros el justificante de ingresos para evitar que Safari pierda el click/touch del visor legado.
  ['click','touchend','pointerup'].forEach(type => window.addEventListener(type, ev => {
    if(closeOpenPhotoModal(ev) === false) return false;
    const target = ev.target;
    if(!target?.closest?.(INCOME_PHOTO_TARGETS)) return undefined;
    const inTooltip = !!target.closest?.(TOOLTIP_SELECTORS);
    if(isIOS() || inTooltip){
      const photo = resolvePhotoTarget(target);
      if(photo) return openSimplePhoto(photo, ev);
    }
  }, {capture:true, passive:false}));

  document.addEventListener('keydown', ev => {
    if(ev.key !== 'Escape') return;
    const modal = document.querySelector('#ceV520PhotoModal,' + PHOTO_MODAL_SELECTORS);
    if(modal){ stop(ev); safe(() => modal.remove(), null); afterPhotoClose(); }
  }, true);
  document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnExportExcel,#btnExportSeed,a[download]')) install(); }, true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(install, 20); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:excel-before-run'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,120,600,1600].forEach(ms => setTimeout(install, ms));

  window.ControlEventV520ProdFinalFix = {version:VERSION, versionFile:VERSION_FILE, install, normalizeDownloadName, restoreTooltip:restoreTooltipSnapshot};
})();
