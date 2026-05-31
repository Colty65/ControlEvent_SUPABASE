/* ControlEvent v3.1_prod - visor grande de justificantes de INGRESOS y globo de tickets sin duplicados. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v3.1_prod';
  const VERSION_FILE = 'ControlEvent_v3_1_prod';
  const STYLE_ID = 'ceV310PhotoViewerStyle';
  const MODAL_ID = 'ceV310PhotoViewer';
  const LEGACY_MODAL_IDS = ['ceV300PhotoViewer'];
  let lastOpenSig = '';
  let lastOpenAt = 0;
  let suppressOpenUntil = 0;

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

  function closePhoto(event){
    suppressOpenUntil = Date.now() + 450;
    if(event) stop(event);
    removeOwnModals();
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
    if(tipIngreso && !tipIngreso.closest?.('#ceBudgetLiteTooltipV307')){
      const img = tipIngreso.querySelector?.('img') || tipIngreso;
      const src = img?.currentSrc || img?.src || '';
      if(src) return {src, title:'Justificante de ingreso'};
    }
    if(isFinalizedEvent()){
      const ticketImg = target?.closest?.('#summaryTiendaTicket img.ticket-thumb');
      if(ticketImg && !ticketImg.closest?.('#ceBudgetLiteTooltipV307')){
        const src = ticketImg.currentSrc || ticketImg.src || '';
        if(src) return {src, title:'Foto de ticket'};
      }
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
    forceVisibleViewTargets();
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
    if(event.target?.id === 'selectedEvent') [120,500,1200].forEach(ms => setTimeout(install, ms));
  }, true);
  [0,120,500,1400,2800].forEach(ms => setTimeout(install, ms));

  window.ControlEventV310Photos = {version: VERSION, install, open: openPhoto, close: closePhoto};
})();
