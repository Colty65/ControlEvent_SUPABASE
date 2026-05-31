/* ControlEvent v3.0_prod - visor grande de fotos para INGRESOS y RESUMEN. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v3.0_prod';
  const VERSION_FILE = 'ControlEvent_v3_0_prod';
  const STYLE_ID = 'ceV300PhotoViewerStyle';
  const MODAL_ID = 'ceV300PhotoViewer';
  let lastOpenSig = '';
  let lastOpenAt = 0;

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const stop = event => {
    try{ event?.preventDefault?.(); event?.stopPropagation?.(); event?.stopImmediatePropagation?.(); }catch(_){ }
    return false;
  };

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
      #summaryTiendaTicket img.ticket-thumb,
      #ceBudgetLiteTooltipV307 img.ticket-thumb,
      #ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,
      img.ticket-thumb{
        display:inline-block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;cursor:zoom-in!important;
      }
      #${MODAL_ID}{position:fixed!important;inset:0!important;z-index:10000000!important;display:flex!important;align-items:center!important;justify-content:center!important;background:rgba(2,6,23,.84)!important;padding:10px!important;}
      #${MODAL_ID} .ce-v300-photo-box{width:min(1320px,98vw)!important;max-height:96vh!important;display:flex!important;flex-direction:column!important;gap:8px!important;align-items:center!important;}
      #${MODAL_ID} .ce-v300-photo-head{width:100%!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;color:#fff!important;font-weight:900!important;font-size:15px!important;}
      #${MODAL_ID} .ce-v300-photo-close{appearance:none!important;border:1px solid rgba(255,255,255,.5)!important;background:#fff!important;color:#0f172a!important;border-radius:8px!important;min-width:74px!important;min-height:38px!important;font-weight:900!important;cursor:pointer!important;}
      #${MODAL_ID} img{display:block!important;max-width:98vw!important;max-height:88vh!important;object-fit:contain!important;border-radius:10px!important;background:#fff!important;box-shadow:0 22px 80px rgba(0,0,0,.48)!important;}
    `;
    document.head.appendChild(style);
  }

  function forceVisibleViewTargets(){
    document.querySelectorAll('#collabList [data-ce-v509-receipt="view"],#collabList .ce-v509-receipt-thumb,#summaryTiendaTicket img.ticket-thumb,#ceBudgetLiteTooltipV307 img.ticket-thumb,#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,img.ticket-thumb').forEach(el => {
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
    document.querySelectorAll('#summaryTiendaTicket button,#ceBudgetLiteTooltipV307 button').forEach(btn => {
      if(!btn.querySelector('img.ticket-thumb')) return;
      try{
        btn.disabled = false;
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.style.setProperty('display', 'inline-flex', 'important');
        btn.style.setProperty('visibility', 'visible', 'important');
        btn.style.setProperty('opacity', '1', 'important');
        btn.style.setProperty('pointer-events', 'auto', 'important');
      }catch(_){ }
    });
  }

  function closePhoto(event){
    if(event) stop(event);
    try{ $(MODAL_ID)?.remove(); }catch(_){ }
    setTimeout(forceVisibleViewTargets, 40);
    return false;
  }

  function openPhoto(src, title, event){
    if(!src) return false;
    const now = Date.now();
    const sig = `${title}|${src}`;
    if(sig === lastOpenSig && now - lastOpenAt < 700) return stop(event);
    lastOpenSig = sig;
    lastOpenAt = now;
    stop(event);
    try{ document.querySelectorAll('#ceTicketModalV234,#ceTicketImageModalV225,.ce-ticket-modal-v234,.ce-ticket-modal-v225,.ce-v468-modal,.ce-v509-modal').forEach(el => el.remove()); }catch(_){ }
    let modal = $(MODAL_ID);
    if(modal) modal.remove();
    modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.innerHTML = `<div class="ce-v300-photo-box"><div class="ce-v300-photo-head"><span>${esc(title || 'Foto')}</span><button type="button" class="ce-v300-photo-close">Cerrar</button></div><img alt="${esc(title || 'Foto ampliada')}" src="${esc(src)}"></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => {
      if(e.target === modal || e.target?.closest?.('.ce-v300-photo-close')) return closePhoto(e);
      try{ e.stopPropagation(); }catch(_){ }
    }, true);
    try{ modal.querySelector('.ce-v300-photo-close')?.focus({preventScroll:true}); }catch(_){ }
    return false;
  }

  function resolvePhotoTarget(target){
    const ingreso = target?.closest?.('#collabList [data-ce-v509-receipt="view"],#collabList .ce-v509-receipt-thumb,#collabList .ce-v465-receipt-thumb,#collabList .ce-v464-receipt-tools button[data-action*="view"]');
    if(ingreso){
      const img = ingreso.querySelector?.('img') || ingreso.closest?.('.ce-v509-receipt-strip,.ce-v465-receipt-strip')?.querySelector?.('img');
      const src = img?.currentSrc || img?.src || '';
      if(src) return {src, title:'Justificante de ingreso'};
    }
    const tipIngreso = target?.closest?.('#ceBudgetLiteTooltipV307 .ce-v465-tip-thumb,.ce-v465-tip-thumb');
    if(tipIngreso){
      const img = tipIngreso.querySelector?.('img') || tipIngreso;
      const src = img?.currentSrc || img?.src || '';
      if(src) return {src, title:'Justificante de ingreso'};
    }
    const ticketImg = target?.closest?.('#summaryTiendaTicket img.ticket-thumb,#ceBudgetLiteTooltipV307 img.ticket-thumb,img.ticket-thumb');
    if(ticketImg){
      const src = ticketImg.currentSrc || ticketImg.src || '';
      if(src) return {src, title:'Foto de ticket'};
    }
    const ticketButton = target?.closest?.('#summaryTiendaTicket button,#ceBudgetLiteTooltipV307 button');
    const img = ticketButton?.querySelector?.('img.ticket-thumb');
    if(img){
      const src = img.currentSrc || img.src || '';
      if(src) return {src, title:'Foto de ticket'};
    }
    return null;
  }

  function handlePhotoEvent(event){
    const photo = resolvePhotoTarget(event.target);
    if(!photo) return undefined;
    return openPhoto(photo.src, photo.title, event);
  }

  function install(){
    injectStyle();
    applyVersion();
    forceVisibleViewTargets();
  }

  ['click','pointerup','touchend'].forEach(type => {
    document.addEventListener(type, handlePhotoEvent, {capture:true, passive:false});
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

  window.ControlEventV300Photos = {version: VERSION, install, open: openPhoto, close: closePhoto};
})();
