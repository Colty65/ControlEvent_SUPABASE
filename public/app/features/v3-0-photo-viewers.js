/* ControlEvent v10.4.3_prod - visor de fotos sin doble apertura; base estable v3.2. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v10.4.3_prod';
  const VERSION_FILE = 'ControlEvent_v10_4_prod';
  const STYLE_ID = 'ceV310PhotoViewerStyle';
  const MODAL_ID = 'ceV310PhotoViewer';
  const LEGACY_MODAL_IDS = ['ceV300PhotoViewer'];
  let lastOpenSig = '';
  let lastOpenAt = 0;
  let suppressOpenUntil = 0;
  let hydrateBusy = false;
  let lastHydrateEvent = '';
  let lastHydrateAt = 0;
  let activeOrigin = null;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stop = event => {
    try{ event?.preventDefault?.(); event?.stopPropagation?.(); event?.stopImmediatePropagation?.(); }catch(_){ }
    return false;
  };
  function appState(){
    try{ if(window.state && typeof window.state === 'object') return window.state; }catch(_){ }
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return {};
  }
  function currentEvent(){
    try{ if(typeof window.selectedEvent === 'function') return window.selectedEvent() || {}; }catch(_){ }
    try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ }
    const s = appState();
    const id = String(s.selectedEventId || '');
    return (Array.isArray(s.eventos) ? s.eventos : []).find(ev => String(ev.id) === id) || {};
  }
  function isFinalizedEvent(){
    return String(currentEvent().situacion || '').trim().toUpperCase() === 'FINALIZADO';
  }
  function currentEventId(){
    const s = appState();
    const ev = currentEvent();
    return String(ev.id || s.selectedEventId || '');
  }
  function srcOf(value){
    if(!value) return '';
    if(typeof value === 'string') return value.trim();
    if(typeof value === 'object') return String(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || '').trim();
    return '';
  }
  function ensureImageStores(){
    const s = appState();
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    return {images:s.ticketImages, refs:s.ticketImageRefs};
  }
  function mergeImageRef(key, value){
    key = String(key || '').trim();
    const src = srcOf(value);
    if(!key || !src) return false;
    const {images, refs} = ensureImageStores();
    let changed = false;
    if(srcOf(images[key]) !== src){ images[key] = src; changed = true; }
    const ref = value && typeof value === 'object' ? {...value, key, url:src, pathname:value.pathname || src} : {key, url:src, pathname:src};
    if(srcOf(refs[key]) !== src){ refs[key] = ref; changed = true; }
    return changed;
  }
  function refreshPhotoScreens(){
    try{
      const api = window.__ceV240;
      if($('summaryTiendaTicket') && api && typeof api.summaryByTiendaTicket === 'function' && typeof window.renderSummaryList === 'function'){
        window.renderSummaryList('summaryTiendaTicket', api.summaryByTiendaTicket());
      }else if($('summaryTiendaTicket') && typeof window.renderBudget === 'function'){
        window.renderBudget();
      }
    }catch(_){ }
    try{ window.ControlEventV509?.normalizeReceiptFields?.(); }catch(_){ }
    forceVisibleViewTargets();
  }
  function refreshTicketScreens(){
    try{
      const api = window.__ceV240;
      if($('summaryTiendaTicket') && api && typeof api.summaryByTiendaTicket === 'function' && typeof window.renderSummaryList === 'function'){
        window.renderSummaryList('summaryTiendaTicket', api.summaryByTiendaTicket());
      }else if($('summaryTiendaTicket') && typeof window.renderBudget === 'function'){
        window.renderBudget();
      }
    }catch(_){ }
    forceVisibleViewTargets();
  }
  async function hydrateEventImages(force){
    const eventId = currentEventId();
    if(!eventId || hydrateBusy) return false;
    const now = Date.now();
    if(!force && eventId === lastHydrateEvent && now - lastHydrateAt < 6000) return false;
    hydrateBusy = true;
    lastHydrateEvent = eventId;
    lastHydrateAt = now;
    let changed = false;
    try{
      const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId)}`, {cache:'no-store'});
      const payload = await res.json().catch(() => ({}));
      if(!res.ok || !payload || !payload.images) return false;
      Object.entries(payload.images || {}).forEach(([rawKey, value]) => {
        const key = String(rawKey || '').includes('|') ? String(rawKey || '') : `${eventId}|${String(rawKey || '')}`;
        if(mergeImageRef(key, value)) changed = true;
        // v8.0: no crear variantes globales sin evento para TKxx. Esas variantes mezclaban fotos entre eventos.
      });
    }catch(error){
      console.warn('[ControlEvent v10.4.3_prod] No se pudieron hidratar fotos desde BBDD.', error);
    }finally{
      hydrateBusy = false;
    }
    return changed;
  }
  function hydrateAndRefresh(force){
    hydrateEventImages(force).then(changed => {
      if(changed) refreshPhotoScreens();
      else if(force) refreshTicketScreens();
      else forceVisibleViewTargets();
    }).catch(() => forceVisibleViewTargets());
  }
  function pruneEmptyImagePayload(payload){
    if(!payload || typeof payload !== 'object') return payload;
    const persistedSrc = value => {
      let src = '';
      if(typeof value === 'string') src = value;
      else if(value && typeof value === 'object') src = value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || '';
      src = String(src || '').trim();
      return /^data:image\//i.test(src) ? '' : src;
    };
    ['ticketImages','ticketImageRefs'].forEach(name => {
      if(!payload[name] || typeof payload[name] !== 'object') return;
      const clean = {};
      Object.entries(payload[name]).forEach(([key, value]) => {
        if(persistedSrc(value)) clean[key] = value;
      });
      if(Object.keys(clean).length) payload[name] = clean;
      else delete payload[name];
    });
    return payload;
  }
  function patchFetchPersistence(){
    if(typeof window.fetch !== 'function' || window.fetch.__ceV34PhotoPersistence) return;
    const oldFetch = window.fetch.bind(window);
    const wrapped = function(input, init){
      const url = String(typeof input === 'string' ? input : (input && input.url) || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      let nextInit = init;
      if(method === 'PUT' && /\/api\/state(?:$|\?)/.test(url) && init && typeof init.body === 'string'){
        try{
          const payload = pruneEmptyImagePayload(JSON.parse(init.body));
          nextInit = {...init, body:JSON.stringify(payload)};
        }catch(_){ }
      }
      const result = oldFetch(input, nextInit);
      if(/\/api\/ticket-images(?:$|\?)/.test(url) && (method === 'POST' || method === 'DELETE')){
        Promise.resolve(result).then(res => {
          if(res && res.ok) [120, 520, 1400].forEach(ms => setTimeout(() => hydrateAndRefresh(true), ms));
        }).catch(() => {});
      }
      return result;
    };
    wrapped.__ceV34PhotoPersistence = true;
    window.fetch = wrapped;
  }

  function applyVersion(){
    try{
      document.title = VERSION;
      window.__ceVersion = VERSION;
      window.VERSION = VERSION;
      window.VERSION_FILE = VERSION_FILE;
      window.ControlEventVersion = {version: VERSION, versionFile: VERSION_FILE};
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
      #collabList [data-ce-v509-receipt="view"],
      #collabList .ce-v509-receipt-thumb,
      #collabList .ce-v465-receipt-thumb{
        display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;cursor:zoom-in!important;
      }
      body.ce-v235-finalizado #tabIngresos.app-lockable,
      body.ce-v235-finalizado #tabIngresos.app-lockable.locked,
      body.ce-finalizado-consulta #tabIngresos.app-lockable.locked,
      body.ce-v233-final-consulta #tabIngresos.app-lockable.locked{
        opacity:1!important;filter:none!important;pointer-events:auto!important;user-select:auto!important;
      }
      body.ce-v235-finalizado #collabList,
      body.ce-v235-finalizado #collabList .itemcard,
      body.ce-v235-finalizado #collabList .rowline,
      body.ce-v235-finalizado #collabList .ce-v509-receipt-field,
      body.ce-v235-finalizado #collabList .ce-v509-receipt-strip,
      body.ce-v235-finalizado #collabList [data-ce-v509-receipt="view"]{
        pointer-events:auto!important;visibility:visible!important;opacity:1!important;
      }
      #ceBudgetLiteTooltipV307{
        max-height:min(86vh,760px)!important;overflow:auto!important;pointer-events:auto!important;
      }
      #ceBudgetLiteTooltipV307 button,
      #summaryTiendaTicket .ticket-actions,
      #summaryTiendaTicket img.ticket-thumb{
        pointer-events:auto!important;
      }
      #summaryTiendaTicket img.ticket-thumb{
        display:inline-block!important;visibility:visible!important;opacity:1!important;cursor:zoom-in!important;
      }
      #ceBudgetLiteTooltipV307 img.ticket-thumb,
      #ceBudgetLiteTooltipV307 .ce-v465-tip-thumb{
        display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;
        max-width:min(88vw,720px)!important;max-height:70vh!important;object-fit:contain!important;
      }
      #${MODAL_ID}{
        position:fixed!important;inset:0!important;z-index:10000000!important;display:flex!important;align-items:center!important;justify-content:center!important;
        background:rgba(2,6,23,.84)!important;padding:10px!important;
      }
      #${MODAL_ID} .ce-v310-photo-box{
        width:min(1320px,98vw)!important;max-height:96vh!important;display:flex!important;flex-direction:column!important;gap:8px!important;align-items:center!important;
      }
      #${MODAL_ID} .ce-v310-photo-head{
        width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;
        color:#fff!important;font-weight:900!important;font-size:15px!important;line-height:1.2!important;
      }
      #${MODAL_ID} .ce-v310-photo-close{
        appearance:none!important;border:1px solid rgba(255,255,255,.5)!important;background:#fff!important;color:#0f172a!important;border-radius:8px!important;
        min-width:74px!important;min-height:38px!important;font-weight:900!important;cursor:pointer!important;pointer-events:auto!important;
      }
      #${MODAL_ID} img{
        display:block!important;max-width:98vw!important;max-height:88vh!important;object-fit:contain!important;border-radius:10px!important;background:#fff!important;
        box-shadow:0 22px 80px rgba(0,0,0,.48)!important;
      }
    `;
    document.head.appendChild(style);
  }

  function forceVisibleViewTargets(){
    document.querySelectorAll('#collabList [data-ce-v509-receipt="view"],#collabList .ce-v509-receipt-thumb,#collabList .ce-v465-receipt-thumb').forEach(el => {
      try{
        el.disabled = false;
        el.removeAttribute('disabled');
        el.removeAttribute('aria-disabled');
        el.style.setProperty('display', el.tagName === 'IMG' ? 'inline-block' : 'inline-flex', 'important');
        el.style.setProperty('visibility', 'visible', 'important');
        el.style.setProperty('opacity', '1', 'important');
        el.style.setProperty('pointer-events', 'auto', 'important');
        el.style.setProperty('cursor', 'zoom-in', 'important');
      }catch(_){ }
    });
    if(isFinalizedEvent()){
      document.querySelectorAll('#tabIngresos.app-lockable,#tabIngresos.app-lockable.locked,#collabList,#collabList .itemcard,#collabList .rowline,#collabList .ce-v509-receipt-field,#collabList .ce-v509-receipt-strip').forEach(el => {
        try{
          el.classList.remove('locked');
          el.style.setProperty('pointer-events', 'auto', 'important');
          el.style.setProperty('opacity', '1', 'important');
          el.style.setProperty('filter', 'none', 'important');
        }catch(_){ }
      });
    }
    document.querySelectorAll('#ceBudgetLiteTooltipV307 button').forEach(btn => {
      try{
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.style.setProperty('pointer-events', 'auto', 'important');
      }catch(_){ }
    });
    document.querySelectorAll('#summaryTiendaTicket .ticket-actions').forEach(el => {
      try{
        el.style.setProperty('display', 'inline-flex', 'important');
        el.style.setProperty('align-items', 'center', 'important');
        el.style.setProperty('gap', '8px', 'important');
        el.style.setProperty('pointer-events', 'auto', 'important');
      }catch(_){ }
    });
    document.querySelectorAll('#summaryTiendaTicket img.ticket-thumb').forEach(img => {
      try{
        img.removeAttribute('aria-disabled');
        img.style.setProperty('display', 'inline-block', 'important');
        img.style.setProperty('visibility', 'visible', 'important');
        img.style.setProperty('opacity', '1', 'important');
        img.style.setProperty('pointer-events', 'auto', 'important');
        img.style.setProperty('cursor', 'zoom-in', 'important');
      }catch(_){ }
    });
  }

  function removeOwnModals(){
    try{ $(MODAL_ID)?.remove(); }catch(_){ }
    LEGACY_MODAL_IDS.forEach(id => {
      try{ $(id)?.remove(); }catch(_){ }
    });
  }
  function captureOrigin(event){
    const target = event?.target || null;
    const el = target?.nodeType === 1 ? target : target?.parentElement || null;
    activeOrigin = {
      el,
      scrollX: window.scrollX || 0,
      scrollY: window.scrollY || 0,
      context: el?.closest?.('#ceBudgetLiteTooltipV307,#ceV509ReceiptModal,#ceTicketModalV234,#ceTicketImageModalV225,#ceTooltipV21') || null
    };
  }
  function restoreOrigin(){
    const origin = activeOrigin;
    activeOrigin = null;
    if(!origin) return;
    try{
      const ctx = origin.context;
      if(ctx && document.contains(ctx)){
        ctx.style.setProperty('pointer-events', 'auto', 'important');
        if(ctx.id === 'ceTicketModalV234' || ctx.id === 'ceTicketImageModalV225') ctx.classList.add('visible');
      }
      if(origin.el && document.contains(origin.el)){
        origin.el.focus?.({preventScroll:true});
        return;
      }
      window.scrollTo(origin.scrollX, origin.scrollY);
    }catch(_){ }
  }

  function closePhoto(event){
    suppressOpenUntil = Date.now() + 450;
    if(event) stop(event);
    removeOwnModals();
    restoreOrigin();
    setTimeout(forceVisibleViewTargets, 40);
    return false;
  }

  function openPhoto(src, title, event){
    if(!src || Date.now() < suppressOpenUntil) return stop(event);
    const now = Date.now();
    const sig = `${title}|${src}`;
    if(sig === lastOpenSig && now - lastOpenAt < 700) return stop(event);
    lastOpenSig = sig;
    lastOpenAt = now;
    stop(event);
    captureOrigin(event);
    removeOwnModals();
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `<div class="ce-v310-photo-box"><div class="ce-v310-photo-head"><span>${esc(title || 'Foto')}</span><button type="button" class="ce-v310-photo-close">Cerrar</button></div><img alt="${esc(title || 'Foto ampliada')}" src="${esc(src)}"></div>`;
    document.body.appendChild(modal);
    try{ modal.querySelector('.ce-v310-photo-close')?.focus({preventScroll:true}); }catch(_){ }
    return false;
  }

  function resolvePhotoTarget(target){
    const ingreso = target?.closest?.('#collabList [data-ce-v509-receipt="view"],#collabList .ce-v509-receipt-thumb,#collabList .ce-v465-receipt-thumb,#collabList .ce-v464-receipt-tools button[data-action*="view"]');
    if(ingreso){
      const img = ingreso.querySelector?.('img') || ingreso.closest?.('.ce-v509-receipt-strip,.ce-v465-receipt-strip')?.querySelector?.('img') || ingreso;
      const src = img?.currentSrc || img?.src || '';
      if(src) return {src, title:'Justificante de ingreso'};
    }
    const tipIngreso = target?.closest?.('.ce-v465-tip-thumb');
    if(tipIngreso){
      const img = tipIngreso.querySelector?.('img') || tipIngreso;
      const src = img?.currentSrc || img?.src || '';
      if(src) return {src, title:'Justificante de ingreso'};
    }
    const modalIngreso = target?.closest?.('#ceV509ReceiptModal .ce-v509-modal-img');
    if(modalIngreso){
      const src = modalIngreso.currentSrc || modalIngreso.src || '';
      if(src) return {src, title:'Justificante de ingreso'};
    }
    const ticketImg = target?.closest?.('#summaryTiendaTicket img.ticket-thumb,#ceBudgetLiteTooltipV307 img.ticket-thumb,#ceTicketModalV234 img,#ceTicketImageModalV225 img');
    if(ticketImg){
      const src = ticketImg.currentSrc || ticketImg.src || '';
      if(src) return {src, title:'Foto de ticket'};
    }
    return null;
  }

  function handleModalEvent(event){
    const target = event.target;
    const modal = target?.closest?.(`#${MODAL_ID}`);
    if(!modal) return undefined;
    if(target === modal || target?.closest?.('.ce-v310-photo-close')) return closePhoto(event);
    try{ event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
    return undefined;
  }

  function handlePhotoEvent(event){
    if(handleModalEvent(event) === false) return false;
    if(Date.now() < suppressOpenUntil) return undefined;
    const photo = resolvePhotoTarget(event.target);
    if(!photo) return undefined;
    return openPhoto(photo.src, photo.title, event);
  }

  function install(){
    injectStyle();
    applyVersion();
    patchFetchPersistence();
    forceVisibleViewTargets();
    hydrateAndRefresh(false);
  }

  document.addEventListener('click', handlePhotoEvent, {capture:true, passive:false});
  ['pointerup','touchend'].forEach(type => {
    document.addEventListener(type, handleModalEvent, {capture:true, passive:false});
  });
  document.addEventListener('keydown', event => {
    if(event.key === 'Escape' && $(MODAL_ID)) return closePhoto(event);
  }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted'].forEach(evt => {
    window.addEventListener(evt, () => setTimeout(install, 30));
  });
  document.addEventListener('change', event => {
    if(event.target?.id === 'selectedEvent') [120,500,1200].forEach(ms => setTimeout(() => { install(); hydrateAndRefresh(true); }, ms));
  }, true);
  [0,120,500,1400,2800].forEach(ms => setTimeout(install, ms));
  [700,1800,3600].forEach(ms => setTimeout(() => hydrateAndRefresh(true), ms));

  window.ControlEventV340Photos = {version: VERSION, install, open: openPhoto, close: closePhoto, hydrate:hydrateAndRefresh};
  window.ControlEventV310Photos = window.ControlEventV340Photos;
})();
