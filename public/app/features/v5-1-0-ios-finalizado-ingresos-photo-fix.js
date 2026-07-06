/* ControlEvent v18_prod - FIX único iPhone/iPadOS: fotos de INGRESOS en evento Finalizado por encima de globos, incluyendo GRAFICAS.
   Alcance: solo visor iOS/iPadOS finalizado. No cambia versión, Excel, BACKUP, cache ni módulos de datos. */
(function(){
  'use strict';

  const INSTALLED = '__ceV510IosFinalizadoIngresosPhotoFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const MODAL_ID = 'ceV510IosFinalizadoIngresoPhotoModal';
  const STYLE_ID = 'ceV510IosFinalizadoIngresoPhotoStyle';
  const OPEN_CLASS = 'ce-v510-ios-finalizado-ingreso-photo-open';
  const ACTIVE_CLASS = 'ce-v510-ios-finalizado-ingreso-photo-active';
  let suppressUntil = 0;
  let lastSig = '';
  let lastAt = 0;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };

  function isiOSLike(){
    const ua = navigator.userAgent || '';
    return /iPhone|iPod|iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  function st(){ return safe(() => (typeof state !== 'undefined' && state) ? state : null, null) || window.state || window.ControlEventApp?.state || {}; }
  function rows(name){ return Array.isArray(st()[name]) ? st()[name] : []; }
  function currentEventId(){ return String(st().selectedEventId || $('selectedEvent')?.value || ''); }
  function currentEvent(){
    const id = currentEventId();
    return safe(() => (typeof selectedEvent === 'function' ? selectedEvent() : null), null) || rows('eventos').find(e => String(e.id || '') === id) || {};
  }
  function isFinalizado(){ return up(currentEvent().situacion || '') === 'FINALIZADO'; }
  function active(){ return isiOSLike() && isFinalizado(); }

  function receiptKeys(id){
    const ev = currentEventId();
    const sid = String(id || '');
    return [`${ev}|INGRESO:${sid}`, `${ev}|INGRESO|${sid}`, `INGRESO:${ev}|${sid}`, `INGRESO:${sid}`];
  }
  function valueToSrc(value){
    if(!value) return '';
    if(typeof value === 'string') return value.trim();
    if(typeof value === 'object') return String(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.dataURL || value.base64 || '').trim();
    return '';
  }
  function jsonGet(key){ try{ return JSON.parse(localStorage.getItem(key) || '{}') || {}; }catch(_){ return {}; } }
  function receiptSrc(id){
    const keys = receiptKeys(id);
    const store = st().ticketImages || {};
    const refs = st().ticketImageRefs || {};
    const backups = [jsonGet('ControlEvent_ingreso_receipts_v468'), jsonGet('ControlEvent_ingreso_receipts_v502')];
    for(const key of keys){ const src = valueToSrc(store[key]); if(src) return src; }
    for(const key of keys){ const src = valueToSrc(refs[key]); if(src) return src; }
    for(const map of backups){ for(const key of keys){ const src = valueToSrc(map[key]); if(src) return src; } }
    return '';
  }
  function nearestImgSrc(el){
    const img = el?.matches?.('img') ? el : el?.querySelector?.('img');
    return img ? String(img.currentSrc || img.src || '').trim() : '';
  }
  function resolveFromElement(el){
    if(!el || !active()) return null;
    const trigger = el.closest?.([
      '#collabList [data-action="ingreso-receipt-view-v465"]',
      '#collabList [data-action="ingreso-receipt-view-v502"]',
      '#collabList [data-ce-v509-receipt="view"]',
      '#collabList .ce-v465-receipt-thumb',
      '#collabList .ce-v502-receipt-thumb',
      '#collabList .ce-v504-receipt-thumb',
      '#collabList .ce-v509-receipt-thumb',
      '#tabIngresos [data-action="ingreso-receipt-view-v465"]',
      '#tabIngresos [data-action="ingreso-receipt-view-v502"]',
      '#tabIngresos [data-ce-v509-receipt="view"]',
      '#tabIngresos .ce-v465-receipt-thumb',
      '#tabIngresos .ce-v502-receipt-thumb',
      '#tabIngresos .ce-v504-receipt-thumb',
      '#tabIngresos .ce-v509-receipt-thumb',
      '#ceBudgetLiteTooltipV307 .ce-v5017-budget-thumb',
      '#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb',
      '#ceBudgetLiteTooltipV307 [data-ce-v512-budget-photo]',
      '#ceTooltipV21 .ce-v465-tip-thumb',
      '#ceTooltipV21 [data-action="ingreso-receipt-view-v465"]',
      '#ceTooltipV21 [data-ce-v512-budget-photo]',
      '#tabGraficas .ce-v465-tip-thumb'
    ].join(','));
    if(!trigger) return null;
    const id = trigger.dataset?.id || trigger.closest?.('[data-id]')?.dataset?.id || '';
    const src = nearestImgSrc(trigger) || (id ? receiptSrc(id) : '');
    if(!src) return null;
    return {src, title:'Justificante de ingreso'};
  }
  function resolveFromPoint(ev){
    const touch = ev?.changedTouches?.[0] || ev?.touches?.[0] || null;
    const x = touch ? touch.clientX : ev?.clientX;
    const y = touch ? touch.clientY : ev?.clientY;
    if(!Number.isFinite(x) || !Number.isFinite(y) || typeof document.elementsFromPoint !== 'function') return null;
    const stack = document.elementsFromPoint(x, y) || [];
    for(const el of stack){ const found = resolveFromElement(el); if(found) return found; }
    return null;
  }

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.${ACTIVE_CLASS} #tabIngresos,
      body.${ACTIVE_CLASS} #tabIngresos *,
      body.${ACTIVE_CLASS} #collabList,
      body.${ACTIVE_CLASS} #collabList *,
      body.${ACTIVE_CLASS} #ceBudgetLiteTooltipV307,
      body.${ACTIVE_CLASS} #ceBudgetLiteTooltipV307 *,
      body.${ACTIVE_CLASS} #ceTooltipV21,
      body.${ACTIVE_CLASS} #ceTooltipV21 *{pointer-events:auto!important;}
      body.${ACTIVE_CLASS} #collabList [data-action="ingreso-receipt-view-v465"],
      body.${ACTIVE_CLASS} #collabList [data-action="ingreso-receipt-view-v502"],
      body.${ACTIVE_CLASS} #collabList [data-ce-v509-receipt="view"],
      body.${ACTIVE_CLASS} #collabList .ce-v465-receipt-thumb,
      body.${ACTIVE_CLASS} #collabList .ce-v502-receipt-thumb,
      body.${ACTIVE_CLASS} #collabList .ce-v504-receipt-thumb,
      body.${ACTIVE_CLASS} #collabList .ce-v509-receipt-thumb,
      body.${ACTIVE_CLASS} #ceBudgetLiteTooltipV307 .ce-v5017-budget-thumb,
      body.${ACTIVE_CLASS} #ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,
      body.${ACTIVE_CLASS} #ceTooltipV21 .ce-v465-tip-thumb{touch-action:manipulation!important;-webkit-tap-highlight-color:rgba(15,23,42,.12)!important;cursor:zoom-in!important;}
      body.${OPEN_CLASS} #ceBudgetLiteTooltipV307,
      body.${OPEN_CLASS} #ceTooltipV21{visibility:hidden!important;pointer-events:none!important;}
      body.${OPEN_CLASS} #ceBudgetLiteTooltipV307 *,
      body.${OPEN_CLASS} #ceTooltipV21 *{pointer-events:none!important;}
      #${MODAL_ID}{position:fixed!important;inset:0!important;z-index:2147483647!important;background:rgba(2,6,23,.88)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:10px!important;box-sizing:border-box!important;transform:none!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;}
      #${MODAL_ID} .ce-v510-ios-card{width:100%!important;max-width:98vw!important;max-height:96vh!important;display:flex!important;flex-direction:column!important;gap:8px!important;align-items:center!important;justify-content:center!important;}
      #${MODAL_ID} .ce-v510-ios-title{align-self:stretch!important;color:#fff!important;font-weight:900!important;font-size:15px!important;line-height:1.15!important;text-align:left!important;padding-right:86px!important;}
      #${MODAL_ID} img{display:block!important;max-width:98vw!important;max-height:82vh!important;width:auto!important;height:auto!important;object-fit:contain!important;background:#fff!important;border-radius:10px!important;box-shadow:0 18px 70px rgba(0,0,0,.52)!important;}
      #${MODAL_ID} .ce-v510-ios-close{position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 12px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 16px)!important;z-index:2147483647!important;background:#fff!important;color:#000!important;border:1px solid #111827!important;border-radius:10px!important;min-width:82px!important;min-height:42px!important;font-weight:900!important;font-size:14px!important;touch-action:manipulation!important;appearance:none!important;-webkit-appearance:none!important;pointer-events:auto!important;}
    `;
    document.head.appendChild(style);
  }
  function refreshBodyFlag(){ try{ document.body?.classList.toggle(ACTIVE_CLASS, active()); }catch(_){ } }
  function hideKnownPhotoModals(){
    try{
      document.querySelectorAll('#ceV310PhotoViewer,#ceV509ReceiptModal,#ceTicketModalV234,#ceTicketImageModalV225,.ce-v468-modal,.ce-v465-modal,.ce-v464-receipt-modal,.ce-receipt-modal-v463').forEach(el => {
        if(el.id === MODAL_ID) return;
        el.classList?.remove?.('visible','open');
        el.setAttribute?.('aria-hidden','true');
        el.style.setProperty('display','none','important');
        el.style.setProperty('pointer-events','none','important');
      });
    }catch(_){ }
  }
  function closeModal(ev){
    suppressUntil = Date.now() + 500;
    stop(ev);
    try{ $(MODAL_ID)?.remove(); }catch(_){ }
    try{ document.body?.classList.remove(OPEN_CLASS); }catch(_){ }
    setTimeout(() => { try{ document.body?.classList.remove(OPEN_CLASS); }catch(_){ } }, 0);
    return false;
  }
  function openModal(photo, ev){
    if(!photo?.src || Date.now() < suppressUntil) return false;
    const sig = `${photo.title}|${photo.src}`;
    const now = Date.now();
    if(sig === lastSig && now - lastAt < 650) return stop(ev);
    lastSig = sig; lastAt = now;
    stop(ev);
    hideKnownPhotoModals();
    try{ $(MODAL_ID)?.remove(); }catch(_){ }
    try{ document.body?.classList.add(OPEN_CLASS); }catch(_){ }
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `<div class="ce-v510-ios-card"><div class="ce-v510-ios-title">${esc(photo.title || 'Foto')}</div><img alt="${esc(photo.title || 'Foto ampliada')}" src="${esc(photo.src)}"><button type="button" class="ce-v510-ios-close">Cerrar</button></div>`;
    document.body.appendChild(modal);
    setTimeout(hideKnownPhotoModals, 0);
    return false;
  }
  function handleOpen(ev){
    if(!active()) return undefined;
    if(Date.now() < suppressUntil) return undefined;
    const photo = resolveFromElement(ev.target) || resolveFromPoint(ev);
    if(!photo) return undefined;
    return openModal(photo, ev);
  }
  function handleClose(ev){
    const modal = $(MODAL_ID);
    if(!modal) return undefined;
    const target = ev.target;
    if(target === modal || target?.closest?.(`#${MODAL_ID} .ce-v510-ios-close`)) return closeModal(ev);
    try{ ev.stopPropagation(); }catch(_){ }
    return undefined;
  }
  function eventHandler(ev){
    if(handleClose(ev) === false) return false;
    return handleOpen(ev);
  }
  function install(){ injectStyle(); refreshBodyFlag(); }

  ['touchstart','pointerdown','touchend','pointerup','click'].forEach(type => {
    window.addEventListener(type, eventHandler, {capture:true, passive:false});
    document.addEventListener(type, eventHandler, {capture:true, passive:false});
  });
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape' && $(MODAL_ID)) return closeModal(ev); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(install, 80); }, true);
  [0,160,700,1800].forEach(ms => setTimeout(install, ms));

  window.ControlEventV510IosFinalizadoIngresosPhotoFix = {install, open:openModal, close:closeModal};
})();
