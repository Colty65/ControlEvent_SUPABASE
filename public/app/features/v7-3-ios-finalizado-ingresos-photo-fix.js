/* ControlEvent v9.5.1_prod - iOS/iPadOS Finalizado: INGRESOS en grande con información y retorno al globo origen.
   Alcance: solo visor iOS/iPadOS para fotos de INGRESOS en evento Finalizado. Sin cambios de datos, Excel, cache ni render general. */
(function(){
  'use strict';

  const INSTALLED = '__ceV73IosFinalizadoIngresosPhotoFix';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const MODAL_ID = 'ceV73IosFinalizadoIngresoPhotoModal';
  const STYLE_ID = 'ceV73IosFinalizadoIngresoPhotoStyle';
  const OPEN_CLASS = 'ce-v73-ios-ingreso-photo-open';
  const ACTIVE_CLASS = 'ce-v73-ios-ingreso-photo-active';
  let suppressUntil = 0;
  let lastSig = '';
  let lastAt = 0;
  let lastTooltipSnapshot = null;

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
  function same(a,b){ return String(a || '') === String(b || ''); }
  function parseNum(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').trim().replace(/\s/g,'').replace(/€/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s); return Number.isFinite(n) ? n : 0;
  }
  function money(value){
    try{ if(typeof window.money === 'function') return window.money(Number(value || 0)); }catch(_){ }
    try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value || 0)); }catch(_){ return `${Number(value || 0).toFixed(2)} €`; }
  }

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
  function idFrom(el){ return norm(el?.dataset?.id || el?.getAttribute?.('data-id') || el?.closest?.('[data-id]')?.dataset?.id || ''); }
  function ingresoRow(id){
    const enriched = safe(() => (typeof collabsForEvent === 'function' ? collabsForEvent() : null), null);
    if(Array.isArray(enriched)){ const row = enriched.find(r => same(r.id, id)); if(row) return row; }
    return rows('colaboradores').find(r => same(r.id, id)) || {};
  }
  function personaFor(row){ return row?.persona || rows('personas').find(p => same(p.id, row?.personaId)) || {}; }
  function rowTextFor(node){
    const row = node?.closest?.('.summary-item,.budget-row,.itemcard,.rowline,.chart-row,tr,#ceBudgetLiteTooltipV307,#ceTooltipV21,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip');
    const tipOwner = node?.closest?.('[data-ce-tip-v21],[data-tip],[data-ce-tip]') || row?.querySelector?.('[data-ce-tip-v21],[data-tip],[data-ce-tip]');
    const tip = tipOwner?.getAttribute?.('data-ce-tip-v21') || tipOwner?.getAttribute?.('data-tip') || tipOwner?.getAttribute?.('data-ce-tip') || '';
    return norm(tip || row?.innerText || node?.alt || node?.title || '');
  }
  function ingresoInfoText(trigger, id){
    const row = id ? ingresoRow(id) : {};
    const persona = personaFor(row);
    const ev = currentEvent() || {};
    const numero = Number(row.numero || 0) || 0;
    const precio = parseNum(ev.precio || 0);
    const rango = norm(persona.rango || row.rango || row.personaRango || '');
    const parts = row.__ceV259Parts || {};
    const obligatorio = parseNum(parts.obligatorio ?? row.base ?? row.importeObligatorio ?? (up(rango) === 'SOCIO' ? precio * numero : 0));
    const voluntario = parseNum(parts.voluntario ?? row.donation ?? row.importeVoluntario ?? row.voluntario ?? row.importe ?? 0);
    const total = parseNum(parts.total ?? row.total ?? row.totalIngreso ?? (obligatorio + voluntario));
    const nombre = norm(persona.nombre || row.nombre || row.personaNombre || '');
    const situacion = norm(row.situacion || row.ingreso || row.formaPago || 'Pendiente');
    const lines = [];
    if(nombre) lines.push(nombre);
    if(situacion) lines.push(`Situación|${situacion}`);
    if(rango) lines.push(`Rango|${rango}`);
    if(id || numero) lines.push(`Nº personas|${String(numero)}`);
    if(id) lines.push(`Importe obligatorio|${money(obligatorio)}`);
    if(id) lines.push(`Importe voluntario|${money(voluntario)}`);
    if(id) lines.push(`Total ingreso|${money(total)}`);
    const fallback = rowTextFor(trigger);
    return (lines.length ? lines.join('\n') : fallback) || 'Justificante de ingreso';
  }
  function renderInfoHtml(text){
    const lines = String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
    const out = [];
    lines.forEach(line => {
      if(line.includes('|')){
        const parts = line.split('|').map(x => x.trim());
        out.push(`<div class="ce-v73-ios-info-row"><span>${esc(parts[0])}</span><strong>${esc(parts.slice(1).join(' | '))}</strong></div>`);
      }else{
        out.push(`<div class="ce-v73-ios-info-title">${esc(line)}</div>`);
      }
    });
    return out.join('') || '<div class="ce-v73-ios-info-title">Justificante de ingreso</div>';
  }

  function isVisibleTip(el){
    if(!el) return false;
    const cs = safe(() => getComputedStyle(el), null);
    return !!cs && cs.display !== 'none' && cs.visibility !== 'hidden' && (el.classList.contains('open') || el.offsetParent !== null || el.getBoundingClientRect().width > 0);
  }
  function captureTooltip(trigger){
    const tip = trigger?.closest?.('#ceTooltipV21,#ceBudgetLiteTooltipV307,.ce-v21-tooltip,.ce-budget-tooltip,.ce-tooltip') || ['ceTooltipV21','ceBudgetLiteTooltipV307'].map($).find(isVisibleTip) || null;
    if(!tip) return null;
    const rect = safe(() => tip.getBoundingClientRect(), null);
    return {
      id: tip.id || '',
      html: tip.outerHTML || '',
      scrollTop: tip.scrollTop || 0,
      scrollLeft: tip.scrollLeft || 0,
      left: tip.style.left || '', top: tip.style.top || '', right: tip.style.right || '', bottom: tip.style.bottom || '',
      display: tip.style.display || '', visibility: tip.style.visibility || '', pointerEvents: tip.style.pointerEvents || '',
      rectLeft: rect ? rect.left : null, rectTop: rect ? rect.top : null,
      className: tip.className || ''
    };
  }
  function restoreTooltip(){
    const s = lastTooltipSnapshot;
    if(!s) return;
    let el = s.id ? $(s.id) : null;
    try{
      if(!el && s.html){
        const holder = document.createElement('div');
        holder.innerHTML = s.html;
        el = holder.firstElementChild;
        if(el) document.body.appendChild(el);
      }
      if(!el) return;
      el.style.removeProperty('display');
      el.style.removeProperty('visibility');
      el.style.removeProperty('pointer-events');
      if(s.display && s.display !== 'none') el.style.display = s.display;
      else el.style.display = el.style.display || 'block';
      if(s.visibility && s.visibility !== 'hidden') el.style.visibility = s.visibility;
      else el.style.visibility = 'visible';
      if(s.pointerEvents) el.style.pointerEvents = s.pointerEvents;
      if(s.left) el.style.left = s.left;
      if(s.top) el.style.top = s.top;
      if(s.right) el.style.right = s.right;
      if(s.bottom) el.style.bottom = s.bottom;
      el.className = s.className || el.className;
      el.classList.add('open');
      if(el.id === 'ceTooltipV21') el.classList.add('ce-v462-tip-open');
      el.removeAttribute('aria-hidden');
      el.scrollTop = s.scrollTop || 0;
      el.scrollLeft = s.scrollLeft || 0;
      if(el.id === 'ceTooltipV21' || !el.id){
        el.style.setProperty('z-index','600000','important');
      }
    }catch(_){ }
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
    const id = idFrom(trigger);
    const src = nearestImgSrc(trigger) || (id ? receiptSrc(id) : '');
    if(!src) return null;
    return {src, id, trigger, title:'Justificante de ingreso', info:ingresoInfoText(trigger, id)};
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
      body.${ACTIVE_CLASS} #tabIngresos,body.${ACTIVE_CLASS} #tabIngresos *,body.${ACTIVE_CLASS} #collabList,body.${ACTIVE_CLASS} #collabList *,body.${ACTIVE_CLASS} #ceBudgetLiteTooltipV307,body.${ACTIVE_CLASS} #ceBudgetLiteTooltipV307 *,body.${ACTIVE_CLASS} #ceTooltipV21,body.${ACTIVE_CLASS} #ceTooltipV21 *{pointer-events:auto!important;}
      body.${ACTIVE_CLASS} #collabList [data-action="ingreso-receipt-view-v465"],body.${ACTIVE_CLASS} #collabList [data-action="ingreso-receipt-view-v502"],body.${ACTIVE_CLASS} #collabList [data-ce-v509-receipt="view"],body.${ACTIVE_CLASS} #collabList .ce-v465-receipt-thumb,body.${ACTIVE_CLASS} #collabList .ce-v502-receipt-thumb,body.${ACTIVE_CLASS} #collabList .ce-v504-receipt-thumb,body.${ACTIVE_CLASS} #collabList .ce-v509-receipt-thumb,body.${ACTIVE_CLASS} #ceBudgetLiteTooltipV307 .ce-v5017-budget-thumb,body.${ACTIVE_CLASS} #ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,body.${ACTIVE_CLASS} #ceTooltipV21 .ce-v465-tip-thumb{touch-action:manipulation!important;-webkit-tap-highlight-color:rgba(15,23,42,.12)!important;cursor:zoom-in!important;}
      body.${OPEN_CLASS} #ceBudgetLiteTooltipV307,body.${OPEN_CLASS} #ceTooltipV21{visibility:hidden!important;pointer-events:none!important;}
      body.${OPEN_CLASS} #ceBudgetLiteTooltipV307 *,body.${OPEN_CLASS} #ceTooltipV21 *{pointer-events:none!important;}
      #${MODAL_ID}{position:fixed!important;inset:0!important;z-index:2147483647!important;background:rgba(2,6,23,.88)!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:8px!important;box-sizing:border-box!important;transform:none!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;}
      #${MODAL_ID} .ce-v73-ios-card{width:100%!important;max-width:98vw!important;max-height:96vh!important;display:grid!important;grid-template-rows:auto minmax(0,1fr)!important;gap:8px!important;align-items:stretch!important;justify-content:stretch!important;}
      #${MODAL_ID} .ce-v73-ios-title{align-self:stretch!important;color:#fff!important;font-weight:900!important;font-size:15px!important;line-height:1.15!important;text-align:left!important;padding-right:86px!important;}
      #${MODAL_ID} .ce-v73-ios-body{width:100%!important;max-height:84vh!important;display:grid!important;grid-template-columns:minmax(128px,38vw) minmax(0,1fr)!important;gap:8px!important;align-items:center!important;justify-content:center!important;}
      #${MODAL_ID} .ce-v73-ios-info{align-self:stretch!important;max-height:82vh!important;overflow:auto!important;-webkit-overflow-scrolling:touch!important;color:#fff!important;background:rgba(15,23,42,.76)!important;border:1px solid rgba(255,255,255,.28)!important;border-radius:10px!important;padding:8px!important;font-size:11px!important;line-height:1.22!important;box-sizing:border-box!important;}
      #${MODAL_ID} .ce-v73-ios-info-title{font-weight:950!important;font-size:12px!important;margin:0 0 8px!important;color:#fff!important;}
      #${MODAL_ID} .ce-v73-ios-info-row{border-top:1px solid rgba(255,255,255,.18)!important;padding:6px 0!important;display:block!important;}
      #${MODAL_ID} .ce-v73-ios-info-row span{display:block!important;color:#cbd5e1!important;font-weight:800!important;margin-bottom:2px!important;}
      #${MODAL_ID} .ce-v73-ios-info-row strong{display:block!important;color:#fff!important;font-weight:950!important;word-break:break-word!important;}
      #${MODAL_ID} img{display:block!important;max-width:calc(98vw - 145px)!important;max-height:82vh!important;width:auto!important;height:auto!important;object-fit:contain!important;background:#fff!important;border-radius:10px!important;box-shadow:0 18px 70px rgba(0,0,0,.52)!important;justify-self:center!important;align-self:center!important;}
      #${MODAL_ID} .ce-v73-ios-close{position:fixed!important;right:calc(env(safe-area-inset-right,0px) + 12px)!important;bottom:calc(env(safe-area-inset-bottom,0px) + 16px)!important;z-index:2147483647!important;background:#fff!important;color:#000!important;border:1px solid #111827!important;border-radius:10px!important;min-width:82px!important;min-height:42px!important;font-weight:900!important;font-size:14px!important;touch-action:manipulation!important;appearance:none!important;-webkit-appearance:none!important;pointer-events:auto!important;}
      @media (max-width:380px){#${MODAL_ID} .ce-v73-ios-body{grid-template-columns:minmax(120px,42vw) minmax(0,1fr)!important;gap:6px!important;} #${MODAL_ID} img{max-width:calc(98vw - 134px)!important;} #${MODAL_ID} .ce-v73-ios-info{font-size:10.5px!important;padding:6px!important;}}
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
    [0,60,180,360].forEach(ms => setTimeout(restoreTooltip, ms));
    return false;
  }
  function openModal(photo, ev){
    if(!photo?.src || Date.now() < suppressUntil) return false;
    const sig = `${photo.title}|${photo.src}`;
    const now = Date.now();
    if(sig === lastSig && now - lastAt < 650) return stop(ev);
    lastSig = sig; lastAt = now;
    stop(ev);
    lastTooltipSnapshot = captureTooltip(photo.trigger);
    hideKnownPhotoModals();
    try{ $(MODAL_ID)?.remove(); }catch(_){ }
    try{ document.body?.classList.add(OPEN_CLASS); }catch(_){ }
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.setAttribute('data-ce-preserve-tooltip','1');
    modal.innerHTML = `<div class="ce-v73-ios-card"><div class="ce-v73-ios-title">${esc(photo.title || 'Foto')}</div><div class="ce-v73-ios-body"><div class="ce-v73-ios-info">${renderInfoHtml(photo.info)}</div><img alt="${esc(photo.title || 'Foto ampliada')}" src="${esc(photo.src)}"></div><button type="button" class="ce-v73-ios-close">Cerrar</button></div>`;
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
    if(target === modal || target?.closest?.(`#${MODAL_ID} .ce-v73-ios-close`)) return closeModal(ev);
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

  window.ControlEventV73IosFinalizadoIngresosPhotoFix = {install, open:openModal, close:closeModal};
})();
