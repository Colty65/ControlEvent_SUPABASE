/* ControlEvent v10.2_prod - sincronizacion y visor de fotos de INGRESOS/TICKETS.
   Parche acotado sobre v4.0_prod:
   - No toca login.
   - No toca INFOEVENTO/BACKUP salvo textos de version globales.
   - Hidrata fotos desde /api/ticket-images al elegir evento/entrar/volver de foco/refrescar.
   - En FINALIZADO permite ampliar miniaturas de INGRESOS y TICKETS sin permitir modificar.
   - TICKETS usan visor con informacion del TKxx a la izquierda.
*/
(function(){
  'use strict';

  const VERSION = 'ControlEvent v10.2_prod';
  const VERSION_FILE = 'ControlEvent_v10_2_prod';
  const INSTALLED = '__ceV40ProdPhotoSync';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV40ProdPhotoSyncStyle';
  const MODAL_ID = 'ceV40TicketPhotoModal';
  let hydrateBusy = false;
  let lastHydrateKey = '';
  let lastHydrateAt = 0;
  let lastClickSig = '';
  let lastClickAt = 0;

  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };

  function st(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || window.ControlEventApp?.state || {};
  }
  function arr(name){ const s = st(); return Array.isArray(s[name]) ? s[name] : []; }
  function currentEvent(){
    try{ if(typeof window.selectedEvent === 'function') return window.selectedEvent() || {}; }catch(_){ }
    try{ if(typeof selectedEvent === 'function') return selectedEvent() || {}; }catch(_){ }
    const id = norm(st().selectedEventId);
    return arr('eventos').find(ev => String(ev.id) === id) || {};
  }
  function eventId(){
    const ev = currentEvent();
    return norm(ev.id || st().selectedEventId || '');
  }
  function isFinalizado(){ return up(currentEvent().situacion || '') === 'FINALIZADO'; }
  function srcOf(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || '');
    return '';
  }
  function stores(){
    const s = st();
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    return {images:s.ticketImages, refs:s.ticketImageRefs};
  }
  function putImage(key, value){
    key = norm(key);
    const src = srcOf(value);
    if(!key || !src) return false;
    const {images, refs} = stores();
    const ref = value && typeof value === 'object'
      ? {...value, key, url:src, pathname:value.pathname || value.path || src}
      : {key, url:src, pathname:src};
    const changed = srcOf(images[key]) !== src || srcOf(refs[key]) !== src;
    images[key] = src;
    refs[key] = ref;
    return changed;
  }
  function decodeBase64UrlText(value){
    const raw = norm(value).replace(/\.[a-z0-9]+(?:\?.*)?$/i,'');
    if(!raw) return '';
    try{
      const b64 = raw.replace(/-/g,'+').replace(/_/g,'/');
      const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
      return decodeURIComponent(Array.prototype.map.call(atob(padded), ch => '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2)).join(''));
    }catch(_){ return ''; }
  }
  function decodedKeyFromImageValue(value){
    const src = srcOf(value);
    const m = src.match(/\/ticket-images\/([^\/?#]+)\/([^\/?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
    if(!m) return '';
    const decoded = decodeBase64UrlText(m[2]);
    return decoded || '';
  }
  function addScopedVariant(set, ev, label){
    label = cleanLabel(label);
    if(!ev || !label) return;
    if(label.startsWith(ev + '|')) set.add(label);
    else set.add(ev + '|' + label);
  }
  function addImageVariants(rawKey, value){
    const ev = eventId();
    const raw = norm(rawKey);
    if(!raw || !ev) return false;
    const variants = new Set();
    const decoded = decodedKeyFromImageValue(value);
    if(decoded){
      if(decoded.startsWith(ev + '|')) variants.add(decoded);
      else addScopedVariant(variants, ev, decoded);
    }
    // Si la URL trae clave codificada completa (evento|tienda|TKxx), no recrear la clave genérica raw TKxx.
    if(raw.startsWith(ev + '|')) variants.add(raw);
    else if(!decoded) addScopedVariant(variants, ev, raw);
    const labels = Array.from(variants).map(k => k.startsWith(ev + '|') ? k.slice(ev.length + 1) : k);
    labels.forEach(label => {
      addScopedVariant(variants, ev, label.replace(/\s*\|\s*/g, ' | '));
      const tk = ticketToken(label);
      if(tk) addScopedVariant(variants, ev, tk);
    });
    let changed = false;
    variants.forEach(k => { if(putImage(k, value)) changed = true; });
    return changed;
  }

  function cleanLabel(label){ return norm(label).replace(/\s*\|\s*/g, ' | '); }
  function ticketToken(label){
    const m = norm(label).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);
    return m ? m[0].replace(/\s+/g, '').toUpperCase() : '';
  }
  function imageCandidates(label){
    const ev = eventId();
    const base = norm(label);
    const clean = cleanLabel(base);
    const tk = ticketToken(base);
    const out = [];
    const add = v => { v = norm(v); if(v && !out.includes(v)) out.push(v); };
    const scoped = v => { v = norm(v); if(!v || !ev) return; add(v.startsWith(ev + '|') ? v : ev + '|' + v); };
    [base, clean].forEach(scoped);
    const parts = clean.split('|').map(x => norm(x)).filter(Boolean);
    if(parts.length >= 2){
      const a = parts[0], b = parts[1];
      [a+'|'+b, a+' | '+b, b+'|'+a, b+' | '+a, b].forEach(scoped);
    }
    if(tk) scoped(tk);
    return out;
  }
  function imageValueEvent(value){
    const src = srcOf(value);
    const m = src.match(/\/ticket-images\/([^\/?#]+)\//i);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function findImage(label){
    const {images, refs} = stores();
    const bags = [images, refs];
    const ev = eventId();
    for(const key of imageCandidates(label)){
      for(const bag of bags){ const src = srcOf(bag[key]); if(src) return src; }
    }
    const tk = ticketToken(label);
    const wantStore = up(cleanLabel(label).split('|')[0] || '');
    const ticketOnly = [];
    for(const bag of bags){
      for(const [key, value] of Object.entries(bag || {})){
        const k = String(key || '');
        const valueEvent = imageValueEvent(value);
        if(ev && k.includes('|') && !k.startsWith(ev + '|')) continue;
        if(ev && !k.includes('|') && valueEvent && valueEvent !== ev) continue;
        if(ev && !k.includes('|') && !valueEvent) continue; // sin evento verificable, no usar fallback global TKxx
        const rest = up(k.startsWith(ev + '|') ? k.slice(ev.length + 1) : k);
        const src = srcOf(value);
        if(!src) continue;
        if(tk && rest.includes(tk)){
          if(!wantStore || rest.includes(wantStore)) return src;
          ticketOnly.push(src);
        }
      }
    }
    return ticketOnly.length === 1 ? ticketOnly[0] : '';
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
        const txt = el.textContent || '';
        if(/ControlEvent\s+v[0-9][0-9A-Za-z._\/-]*/i.test(txt)) el.textContent = VERSION;
      });
    }catch(_){ }
  }

  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #summaryTiendaTicket .ticket-actions,
      #ceBudgetLiteTooltipV307 .ticket-actions{
        display:inline-flex!important;align-items:center!important;gap:8px!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;
      }
      #summaryTiendaTicket img.ticket-thumb,
      #ceBudgetLiteTooltipV307 img.ticket-thumb,
      #collabList .ce-v509-receipt-thumb,
      #collabList .ce-v509-receipt-thumb img,
      #collabList [data-ce-v509-receipt="view"]{
        display:inline-block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;cursor:zoom-in!important;
      }
      body.ce-event-finalizado-v40 #summaryTiendaTicket .ticket-actions button[onclick*="uploadTicketImage"],
      body.ce-event-finalizado-v40 #summaryTiendaTicket .ticket-actions button[onclick*="removeTicketImage"],
      body.ce-event-finalizado-v40 #ceBudgetLiteTooltipV307 .ticket-actions button[onclick*="uploadTicketImage"],
      body.ce-event-finalizado-v40 #ceBudgetLiteTooltipV307 .ticket-actions button[onclick*="removeTicketImage"]{
        display:none!important;visibility:hidden!important;pointer-events:none!important;
      }
      body.ce-event-finalizado-v40 #tabResumen,
      body.ce-event-finalizado-v40 #tabGraficas,
      body.ce-event-finalizado-v40 #tabIngresos,
      body.ce-event-finalizado-v40 #summaryTiendaTicket,
      body.ce-event-finalizado-v40 #summaryTiendaTicket .summary-item,
      body.ce-event-finalizado-v40 #ceBudgetLiteTooltipV307,
      body.ce-event-finalizado-v40 #collabList,
      body.ce-event-finalizado-v40 #collabList .itemcard,
      body.ce-event-finalizado-v40 #collabList .rowline,
      body.ce-event-finalizado-v40 #collabList .ce-v509-receipt-field,
      body.ce-event-finalizado-v40 #collabList .ce-v509-receipt-strip{
        pointer-events:auto!important;filter:none!important;opacity:1!important;visibility:visible!important;
      }
      #${MODAL_ID}{
        position:fixed!important;inset:0!important;z-index:10000020!important;background:rgba(2,6,23,.84)!important;
        display:flex!important;align-items:center!important;justify-content:center!important;padding:12px!important;
      }
      #${MODAL_ID} .ce-v40-modal-box{
        width:min(1260px,98vw)!important;max-height:96vh!important;background:#fff!important;color:#0f172a!important;border-radius:18px!important;
        box-shadow:0 24px 90px rgba(0,0,0,.48)!important;padding:12px!important;display:grid!important;
        grid-template-columns:minmax(260px,380px) minmax(300px,1fr)!important;gap:12px!important;overflow:auto!important;
      }
      #${MODAL_ID} .ce-v40-modal-head{grid-column:1/-1!important;display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;font-weight:950!important;}
      #${MODAL_ID} .ce-v40-modal-close{appearance:none!important;border:1px solid #cbd5e1!important;background:#fff!important;border-radius:10px!important;padding:8px 14px!important;font-weight:900!important;cursor:pointer!important;}
      #${MODAL_ID} .ce-v40-modal-info{font-size:13px!important;line-height:1.35!important;overflow:auto!important;max-height:82vh!important;}
      #${MODAL_ID} .ce-v40-modal-info table{width:100%!important;border-collapse:collapse!important;margin:8px 0!important;}
      #${MODAL_ID} .ce-v40-modal-info td{border-bottom:1px solid #e5e7eb!important;padding:4px 6px!important;vertical-align:top!important;}
      #${MODAL_ID} .ce-v40-modal-info td:first-child{font-weight:850!important;color:#475569!important;}
      #${MODAL_ID} .ce-v40-modal-info .ce-v40-title{font-weight:950!important;margin:5px 0 8px!important;}
      #${MODAL_ID} img{display:block!important;max-width:100%!important;max-height:82vh!important;object-fit:contain!important;border-radius:12px!important;background:#f8fafc!important;justify-self:center!important;align-self:start!important;}
      @media(max-width:860px){
        #${MODAL_ID} .ce-v40-modal-box{grid-template-columns:1fr!important;width:calc(100vw - 14px)!important;max-height:94vh!important;padding:10px!important;}
        #${MODAL_ID} .ce-v40-modal-info{max-height:30vh!important;}
        #${MODAL_ID} img{max-height:58vh!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function renderInfoHtml(text){
    const lines = String(text || '').split('\n');
    const html = [];
    let rows = [];
    const flush = () => {
      if(!rows.length) return;
      html.push('<table><tbody>' + rows.map(row => '<tr>' + row.map(cell => '<td>' + esc(cell) + '</td>').join('') + '</tr>').join('') + '</tbody></table>');
      rows = [];
    };
    lines.forEach(line => {
      if(!line.trim()){ flush(); html.push('<div style="height:7px"></div>'); return; }
      if(line.includes('|')) rows.push(line.split('|').map(x => x.trim()));
      else { flush(); html.push('<div class="ce-v40-title">' + esc(line.trim()) + '</div>'); }
    });
    flush();
    return html.join('') || '<div class="ce-v40-title">Sin detalle asociado</div>';
  }
  function infoForThumb(img){
    const holder = img.closest('[data-ce-tip-v21]') || img.closest('.summary-item,.budget-row,.itemcard,.chart-row')?.querySelector?.('[data-ce-tip-v21]');
    const tip = holder?.getAttribute?.('data-ce-tip-v21') || '';
    if(tip) return tip;
    const row = img.closest('.summary-item,.budget-row,.itemcard,.chart-row');
    return row?.innerText || 'Foto de ticket';
  }
  function closeModal(ev){
    if(ev) stop(ev);
    try{ $(MODAL_ID)?.remove(); }catch(_){ }
    return false;
  }
  function openTicketModal(img, ev){
    if(!img) return undefined;
    const src = img.currentSrc || img.src || '';
    if(!src) return undefined;
    const now = Date.now();
    const sig = src + '|' + (img.closest('.summary-item,.budget-row,.itemcard')?.innerText || '');
    if(sig === lastClickSig && now - lastClickAt < 700) return stop(ev);
    lastClickSig = sig; lastClickAt = now;
    stop(ev);
    try{ document.getElementById('ceV310PhotoViewer')?.remove(); }catch(_){ }
    try{ document.getElementById('ceTicketModalV234')?.classList.remove('visible'); }catch(_){ }
    try{ document.getElementById('ceTicketImageModalV225')?.classList.remove('visible'); }catch(_){ }
    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.setAttribute('role','dialog');
    modal.setAttribute('aria-modal','true');
    modal.innerHTML = `<div class="ce-v40-modal-box"><div class="ce-v40-modal-head"><span>Foto de ticket</span><button type="button" class="ce-v40-modal-close">Cerrar</button></div><div class="ce-v40-modal-info">${renderInfoHtml(infoForThumb(img))}</div><img alt="Foto de ticket" src="${esc(src)}"></div>`;
    document.body.appendChild(modal);
    try{ modal.querySelector('.ce-v40-modal-close')?.focus({preventScroll:true}); }catch(_){ }
    return false;
  }
  function handleWindowClick(ev){
    const modal = ev.target?.closest?.('#' + MODAL_ID);
    if(modal){
      if(ev.target === modal || ev.target?.closest?.('.ce-v40-modal-close')) return closeModal(ev);
      try{ ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
      return undefined;
    }
    const img = ev.target?.closest?.('#summaryTiendaTicket img.ticket-thumb,#ceBudgetLiteTooltipV307 img.ticket-thumb');
    if(img) return openTicketModal(img, ev);
    return undefined;
  }

  async function hydrateImages(force){
    const ev = eventId();
    if(!ev || hydrateBusy) return false;
    const now = Date.now();
    const tab = document.querySelector('#tabResumen:not(.hidden),#tabGraficas:not(.hidden),#tabIngresos:not(.hidden)')?.id || '';
    const key = ev + '|' + tab;
    if(!force && key === lastHydrateKey && now - lastHydrateAt < 4500) return false;
    hydrateBusy = true; lastHydrateKey = key; lastHydrateAt = now;
    let changed = false;
    try{
      const res = await fetch('/api/ticket-images?eventId=' + encodeURIComponent(ev) + '&_=' + Date.now(), {cache:'no-store'});
      const payload = await res.json().catch(() => ({}));
      const images = payload && payload.images ? payload.images : {};
      Object.entries(images).forEach(([rawKey, value]) => { if(addImageVariants(rawKey, value)) changed = true; });
    }catch(error){ console.warn('[ControlEvent v10.2_prod] No se pudieron hidratar fotos.', error); }
    finally{ hydrateBusy = false; }
    return changed;
  }

  function refreshViews(){
    try{
      if(typeof window.renderBudget === 'function') window.renderBudget();
    }catch(_){ }
    try{
      if(typeof window.renderGraficas === 'function' && !document.getElementById('tabGraficas')?.classList.contains('hidden')) window.renderGraficas();
    }catch(_){ }
    try{
      if(window.ControlEventV509?.normalizeReceiptFields) window.ControlEventV509.normalizeReceiptFields();
    }catch(_){ }
    setTimeout(() => { applyFinalizedState(); ensureTicketPreviews(); }, 60);
  }
  function hydrateThenRefresh(force){
    return hydrateImages(force).then(changed => {
      if(changed || force) refreshViews();
      else { applyFinalizedState(); ensureTicketPreviews(); }
      return changed;
    }).catch(() => { applyFinalizedState(); ensureTicketPreviews(); });
  }

  function ensureTicketPreviews(){
    const wrap = $('summaryTiendaTicket');
    if(!wrap) return;
    const fin = isFinalizado();
    wrap.querySelectorAll('.summary-item').forEach(row => {
      const first = row.querySelector(':scope > span:first-child');
      const second = row.querySelector(':scope > span:last-child');
      const label = norm(first?.textContent || '');
      if(!label || /^TOTAL$/i.test(label) || /Pte\.\s*Compra/i.test(label) || /DONADO/i.test(label)) return;
      const src = findImage(label);
      const actions = row.querySelector('.ticket-actions');
      if(fin && actions){
        actions.querySelectorAll('button').forEach(btn => {
          const txt = up(btn.textContent + ' ' + (btn.title || ''));
          if(/ADJUNTAR|INSERTAR|ELIMINAR|BORRAR/.test(txt)) btn.style.setProperty('display','none','important');
        });
      }
      if(!src) return;
      let holder = actions;
      if(!holder){
        holder = document.createElement('span');
        holder.className = 'ticket-actions ce-v40-view-only';
        (second || row).appendChild(holder);
      }
      let img = holder.querySelector('img.ticket-thumb');
      if(!img){
        holder.querySelectorAll('.hint').forEach(x => { if(/Sin imagen/i.test(x.textContent || '')) x.remove(); });
        img = document.createElement('img');
        img.className = 'ticket-thumb';
        img.alt = 'ticket';
        holder.appendChild(img);
      }
      if(img.src !== src) img.src = src;
      img.style.setProperty('display','inline-block','important');
      img.style.setProperty('visibility','visible','important');
      img.style.setProperty('opacity','1','important');
      img.style.setProperty('pointer-events','auto','important');
      img.style.setProperty('cursor','zoom-in','important');
    });
  }

  function applyFinalizedState(){
    document.body.classList.toggle('ce-event-finalizado-v40', isFinalizado());
    document.querySelectorAll('#collabList .ce-v509-receipt-thumb,#collabList [data-ce-v509-receipt="view"],#summaryTiendaTicket img.ticket-thumb,#ceBudgetLiteTooltipV307 img.ticket-thumb').forEach(el => {
      try{
        el.removeAttribute('disabled');
        el.removeAttribute('aria-disabled');
        el.style.setProperty('pointer-events','auto','important');
        el.style.setProperty('visibility','visible','important');
        el.style.setProperty('opacity','1','important');
        el.style.setProperty('cursor','zoom-in','important');
      }catch(_){ }
    });
  }

  function patchFetch(){
    if(typeof window.fetch !== 'function' || window.fetch.__ceV40PhotoSync) return;
    const oldFetch = window.fetch.bind(window);
    const wrapped = function(input, init){
      const url = String(typeof input === 'string' ? input : (input && input.url) || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      const result = oldFetch(input, init);
      if(/\/api\/ticket-images(?:$|\?)/.test(url) && (method === 'POST' || method === 'DELETE')){
        Promise.resolve(result).then(res => {
          if(res && res.ok) [180,650,1500].forEach(ms => setTimeout(() => hydrateThenRefresh(true), ms));
        }).catch(() => {});
      }
      return result;
    };
    wrapped.__ceV40PhotoSync = true;
    window.fetch = wrapped;
  }

  function install(force){
    injectStyle();
    applyVersion();
    patchFetch();
    applyFinalizedState();
    ensureTicketPreviews();
    hydrateThenRefresh(!!force);
  }

  window.addEventListener('click', handleWindowClick, {capture:true, passive:false});
  window.addEventListener('touchend', handleWindowClick, {capture:true, passive:false});
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape' && $(MODAL_ID)) return closeModal(ev); }, true);
  document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') [120,520,1200,2200].forEach(ms => setTimeout(() => install(true), ms)); }, true);
  document.addEventListener('click', ev => {
    if(ev.target?.closest?.('#tabResumenBtn,#tabGraficasBtn,#btnSoftRefresh,#btnRefrescar,#btnRefresh,[data-action*="refresh"],[data-ce-soft-refresh]')){
      [120,520,1400].forEach(ms => setTimeout(() => install(true), ms));
    }
  }, true);
  window.addEventListener('focus', () => setTimeout(() => install(true), 120));
  document.addEventListener('visibilitychange', () => { if(!document.hidden) setTimeout(() => install(true), 120); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:modules-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => {
    window.addEventListener(evt, () => setTimeout(() => install(true), 90));
  });
  [0,300,1200,2600].forEach(ms => setTimeout(() => install(ms > 0), ms));

  window.ControlEventV40ProdPhotos = {version:VERSION, versionFile:VERSION_FILE, hydrate:hydrateThenRefresh, sync:install, findImage, openTicket:openTicketModal};
})();
