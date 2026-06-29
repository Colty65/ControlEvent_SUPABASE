/* ControlEvent v17_prod - hotfix acotado fotos en Calculos por tienda y ticket.
   Cambio FIX3: sustitucion real del gestor legacy por un gestor unico, igual de estable que
   Ingresos/Documentos: input efimero, clave canonica por fila, borrado agresivo de alias TKxx,
   URL nueva/cache-busted y sin renderBudget tras adjuntar/eliminar. No cambia version. */
(function(){
  'use strict';
  const INSTALLED = '__ceV17CalculosFotosIngresosStyleV3';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV17CalculosFotosStyleV3';
  const WRITE_SCOPE = 'ticket-image-v8-5-fix26';
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? '').trim();
  const up = value => norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const isDataUrl = value => /^data:image\//i.test(String(value || ''));

  let lastActionSig = '';
  let lastActionAt = 0;
  const busy = new Set();

  function st(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  function arr(name){ const s = st(); return Array.isArray(s[name]) ? s[name] : []; }
  function selectedEventId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return norm(ev.id); }catch(_){ }
    try{ const ev = typeof window.selectedEvent === 'function' ? window.selectedEvent() : null; if(ev?.id) return norm(ev.id); }catch(_){ }
    return norm(st().selectedEventId || $('selectedEvent')?.value || '');
  }
  function currentEvent(){ const id = selectedEventId(); return arr('eventos').find(ev => String(ev?.id || '') === id) || {}; }
  function role(){
    try{ if(typeof authUser !== 'undefined' && authUser) return up(authUser.nivel); }catch(_){ }
    return up(window.authUser?.nivel || window.ControlEventApp?.authUser?.nivel || '');
  }
  function canWrite(){ return role() === 'GD' || role() === 'RW'; }
  function locked(){
    try{ if(typeof isLocked === 'function') return !!isLocked(); }catch(_){ }
    try{ if(typeof window.isLocked === 'function') return !!window.isLocked(); }catch(_){ }
    return up(currentEvent().situacion || '') === 'FINALIZADO';
  }
  function ensureStores(){
    const s = st();
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    if(!s.ticketImagesByKey || typeof s.ticketImagesByKey !== 'object') s.ticketImagesByKey = {};
    return {images:s.ticketImages, refs:s.ticketImageRefs, byKey:s.ticketImagesByKey};
  }
  function decodeMaybe(value){
    const raw = norm(value);
    if(!raw) return '';
    try{ return /%[0-9A-F]{2}/i.test(raw) ? decodeURIComponent(raw) : raw; }catch(_){ return raw; }
  }
  function cleanLabel(label){
    const ev = selectedEventId();
    let out = decodeMaybe(label).replace(/\s*\|\s*/g, ' | ').replace(/\s*ⓘ\s*$/,'').trim();
    if(ev && out.startsWith(ev + ' | ')) out = out.slice(ev.length + 3).trim();
    if(ev && out.startsWith(ev + '|')) out = out.slice(ev.length + 1).trim();
    return out.replace(/\s*\|\s*/g, ' | ').trim();
  }
  function ticketToken(label){
    const match = norm(label).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);
    return match ? match[0].replace(/\s+/g, '').toUpperCase() : '';
  }
  function storeToken(label){
    const parts = cleanLabel(label).split('|').map(p => norm(p)).filter(Boolean);
    return parts.length > 1 ? up(parts[0]) : '';
  }
  function primaryKey(label){ const ev = selectedEventId(); const clean = cleanLabel(label); return ev && clean ? `${ev}|${clean}` : clean; }
  function imageValue(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.src || '');
    return '';
  }
  function keyRest(key){ const ev = selectedEventId(); const k = norm(key); return ev && k.startsWith(ev + '|') ? k.slice(ev.length + 1) : k; }
  function variants(label){
    const ev = selectedEventId();
    const clean = cleanLabel(label);
    const tk = ticketToken(clean);
    const parts = clean.split('|').map(p => norm(p)).filter(Boolean);
    const out = [];
    const add = value => { value = norm(value); if(value && !out.includes(value)) out.push(value); };
    const scoped = value => { value = norm(value); if(!value) return; add(value); if(ev && !value.startsWith(ev + '|')) add(`${ev}|${value}`); };
    scoped(clean);
    if(parts.length >= 2){
      scoped(`${parts[0]} | ${parts.slice(1).join(' | ')}`);
      scoped(`${parts[0]}|${parts.slice(1).join('|')}`);
      if(tk){ scoped(`${parts[0]} | ${tk}`); scoped(`${parts[0]}|${tk}`); }
    }
    if(tk) scoped(tk);
    return out;
  }
  function shouldClear(label, key, value){
    const ev = selectedEventId();
    const clean = cleanLabel(label);
    const tk = ticketToken(clean);
    const k = norm(key);
    const rest = keyRest(k);
    const exact = new Set(variants(clean));
    if(exact.has(k) || exact.has(rest)) return true;
    if(ev && k.startsWith(ev + '|') && tk && up(k).includes(tk)) return true;
    const src = imageValue(value);
    if(ev && src.includes(`/ticket-images/${encodeURIComponent(ev)}/`) && tk && up(k + ' ' + rest).includes(tk)) return true;
    return false;
  }
  function clearLocal(label){
    const bags = ensureStores();
    [bags.images, bags.refs, bags.byKey].forEach(bag => {
      Object.keys(bag || {}).forEach(key => { if(shouldClear(label, key, bag[key])){ try{ delete bag[key]; }catch(_){ } } });
    });
  }
  function putLocal(label, src, ref){
    const clean = cleanLabel(label);
    const key = primaryKey(clean);
    if(!key || !src) return;
    const bags = ensureStores();
    const row = ref && typeof ref === 'object' ? {...ref, key, url:src, pathname:ref.pathname || ref.url || src} : {key, url:src, pathname:src};
    bags.images[key] = src;
    bags.refs[key] = row;
    bags.byKey[key] = row;
  }
  function findLocalImage(label){
    const clean = cleanLabel(label);
    const bags = ensureStores();
    const direct = [primaryKey(clean), ...variants(clean)];
    for(const key of direct){
      for(const bag of [bags.images, bags.refs, bags.byKey]){
        const src = imageValue(bag?.[key]);
        if(src) return src;
      }
    }
    const ev = selectedEventId();
    const tk = ticketToken(clean);
    const store = storeToken(clean);
    if(!ev || !tk) return '';
    for(const bag of [bags.images, bags.refs, bags.byKey]){
      for(const [key,value] of Object.entries(bag || {})){
        const k = norm(key);
        if(k.includes('|') && !k.startsWith(ev + '|')) continue;
        const rest = up(keyRest(k));
        if(rest.includes(tk) && (!store || rest.includes(store))){
          const src = imageValue(value);
          if(src) return src;
        }
      }
    }
    return '';
  }
  function hardBust(src, nonce){
    src = norm(src);
    if(!src || isDataUrl(src)) return src;
    const sep = src.includes('?') ? '&' : '?';
    return `${src}${sep}ce_client=${encodeURIComponent(nonce || Date.now())}`;
  }
  function captureScroll(){
    const data = {x:window.scrollX || 0, y:window.scrollY || 0, els:[]};
    ['summaryTiendaTicket','comprasSummaryBody','tabResumen','budgetLayout','mainTabs'].forEach(id => { const el = $(id); if(el) data.els.push([id, el.scrollLeft || 0, el.scrollTop || 0]); });
    return data;
  }
  function restoreScroll(data){
    if(!data) return;
    const run = () => {
      try{ window.scrollTo(data.x || 0, data.y || 0); }catch(_){ }
      (data.els || []).forEach(([id,x,y]) => { const el = $(id); if(el){ try{ el.scrollLeft = x; el.scrollTop = y; }catch(_){ } } });
    };
    [0,50,150,320].forEach(ms => setTimeout(run, ms));
  }
  function rowFromNode(node){ return node?.closest?.('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item') || null; }
  function rowLabel(row){
    if(!row) return '';
    const ds = cleanLabel(row.dataset.ceTicketLabel || row.querySelector('.ticket-actions')?.dataset.ceTicketLabel || '');
    if(ds) return ds;
    const first = row.querySelector(':scope > span:first-child');
    return cleanLabel(first?.textContent || '');
  }
  function makeButton(action){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'outline small ce-v17-photo-icon';
    btn.dataset.ceV17TicketAction = action;
    if(action === 'attach'){
      btn.textContent = '📎'; btn.title = 'Adjuntar foto'; btn.setAttribute('aria-label', 'Adjuntar foto');
    } else {
      btn.textContent = '🗑️'; btn.title = 'Eliminar foto'; btn.setAttribute('aria-label', 'Eliminar foto');
    }
    return btn;
  }
  function renderActions(row, label, src){
    const actions = row?.querySelector?.('.ticket-actions');
    if(!actions) return;
    const clean = cleanLabel(label || rowLabel(row));
    if(!clean) return;
    row.dataset.ceTicketLabel = clean;
    actions.dataset.ceTicketLabel = clean;
    actions.innerHTML = '';
    const writable = canWrite() && !locked();
    if(writable) actions.appendChild(makeButton('attach'));
    if(src){
      const img = document.createElement('img');
      img.className = 'ticket-thumb';
      img.alt = 'ticket';
      img.loading = 'lazy';
      img.src = src;
      actions.appendChild(img);
      if(writable) actions.appendChild(makeButton('remove'));
    } else {
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = 'Sin imagen';
      actions.appendChild(hint);
    }
  }
  function normalizeTicketRows(){
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => {
      if(!row.querySelector('.ticket-actions')) return;
      const label = rowLabel(row);
      if(!label) return;
      renderActions(row, label, findLocalImage(label));
    });
  }
  function refreshOneRow(label, src, scroll){
    const clean = cleanLabel(label);
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => {
      if(rowLabel(row) === clean) renderActions(row, clean, src || findLocalImage(clean));
    });
    restoreScroll(scroll);
    [60,180,420].forEach(ms => setTimeout(() => { normalizeTicketRows(); restoreScroll(scroll); }, ms));
  }
  function setBusy(label, on){
    const clean = cleanLabel(label);
    if(!clean) return;
    if(on) busy.add(clean); else busy.delete(clean);
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => {
      if(rowLabel(row) !== clean) return;
      row.querySelectorAll('.ticket-actions button').forEach(btn => { btn.disabled = !!on; btn.style.pointerEvents = on ? 'none' : ''; });
    });
  }
  function guardCanModify(ev){
    if(!canWrite()){ alert('No autorizado para modificar fotos.'); return stop(ev || {}); }
    if(locked()){ alert('Evento finalizado. No se puede modificar.'); return stop(ev || {}); }
    return true;
  }
  function fileToDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la foto.'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
  }
  async function compressImageFile(file){
    const original = await fileToDataUrl(file);
    return await new Promise(resolve => {
      const img = new Image();
      img.onerror = () => resolve(original);
      img.onload = () => {
        try{
          const max = 1400;
          let w = img.width || 0, h = img.height || 0;
          const ratio = Math.min(max / Math.max(w, 1), max / Math.max(h, 1), 1);
          w = Math.max(1, Math.round(w * ratio)); h = Math.max(1, Math.round(h * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.84));
        }catch(_){ resolve(original); }
      };
      img.src = original;
    });
  }
  async function apiJson(url, options = {}){
    const headers = {'X-ControlEvent-Write-Scope': WRITE_SCOPE, 'Cache-Control':'no-cache', ...(options.headers || {})};
    if(options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(url, {...options, headers, cache:'no-store'});
    const text = await res.text().catch(() => '');
    let payload = {};
    try{ payload = text ? JSON.parse(text) : {}; }catch(_){ payload = {message:text}; }
    if(!res.ok) throw new Error(payload.error || payload.message || text || `HTTP ${res.status}`);
    return payload;
  }
  async function deleteServer(label){
    const ev = selectedEventId();
    const key = cleanLabel(label);
    if(!ev || !key) return {ok:true};
    const url = `/api/ticket-images?eventId=${encodeURIComponent(ev)}&key=${encodeURIComponent(key)}&ce_aggressive=1&_=${Date.now()}`;
    return apiJson(url, {method:'DELETE'});
  }
  async function uploadServer(label, dataUrl, nonce){
    const ev = selectedEventId();
    const key = cleanLabel(label);
    if(!ev || !key || !isDataUrl(dataUrl)) throw new Error('Falta evento, ticket o imagen.');
    const payload = await apiJson('/api/ticket-images', {
      method:'POST',
      body:JSON.stringify({eventId:ev, key, dataUrl, replace:true, ticket:ticketToken(key), nonce})
    });
    const image = payload.image || {};
    let src = image.url || image.public_url || image.publicUrl || image.pathname || image.path || image.storage_path || '';
    src = hardBust(src, nonce);
    if(!payload.ok || !src) throw new Error(payload.error || payload.message || 'No se pudo guardar la foto en servidor.');
    return {src, image:{...image, url:src, pathname:src}};
  }
  async function attachWithFile(label, file, ev){
    if(guardCanModify(ev || null) !== true) return false;
    label = cleanLabel(label);
    if(!label || !file) return false;
    if(file.type && !/^image\//i.test(file.type)){ alert('Selecciona una imagen para el ticket.'); return false; }
    const scroll = captureScroll();
    const nonce = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    try{
      setBusy(label, true);
      const dataUrl = await compressImageFile(file);
      clearLocal(label);
      putLocal(label, dataUrl, {key:primaryKey(label), url:dataUrl, pathname:dataUrl});
      refreshOneRow(label, dataUrl, scroll);
      await deleteServer(label);
      clearLocal(label);
      putLocal(label, dataUrl, {key:primaryKey(label), url:dataUrl, pathname:dataUrl});
      refreshOneRow(label, dataUrl, scroll);
      const saved = await uploadServer(label, dataUrl, nonce);
      clearLocal(label);
      putLocal(label, saved.src, saved.image);
      refreshOneRow(label, saved.src, scroll);
    }catch(error){
      alert('No se pudo adjuntar la foto. ' + (error?.message || error));
      restoreScroll(scroll);
    }finally{
      setBusy(label, false);
    }
    return false;
  }
  function pickFile(label, ev){
    stop(ev || {});
    if(guardCanModify(ev || null) !== true) return false;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.position = 'fixed';
    input.style.left = '-10000px';
    input.style.top = '-10000px';
    input.style.width = '1px';
    input.style.height = '1px';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      try{ await attachWithFile(label, input.files && input.files[0], ev || null); }
      finally{ try{ input.value = ''; input.remove(); }catch(_){ } }
    }, {once:true});
    input.click();
    return false;
  }
  async function removePhoto(label, ev){
    stop(ev || {});
    if(guardCanModify(ev || null) !== true) return false;
    label = cleanLabel(label);
    if(!label) return false;
    if(!confirm('¿Eliminar la foto asociada a este ticket?')) return false;
    const scroll = captureScroll();
    try{
      setBusy(label, true);
      clearLocal(label);
      refreshOneRow(label, '', scroll);
      await deleteServer(label);
      clearLocal(label);
      refreshOneRow(label, '', scroll);
    }catch(error){
      alert('No se pudo eliminar la foto. ' + (error?.message || error));
      restoreScroll(scroll);
    }finally{
      setBusy(label, false);
    }
    return false;
  }
  function labelFromControl(control){
    const row = rowFromNode(control);
    const ds = cleanLabel(control?.dataset?.ceTicketLabel || control?.closest?.('.ticket-actions')?.dataset?.ceTicketLabel || row?.dataset?.ceTicketLabel || '');
    if(ds) return ds;
    const onclick = norm(control?.getAttribute?.('onclick') || '');
    const match = onclick.match(/(?:uploadTicketImage|removeTicketImage|uploadTicketImageV164|removeTicketImageV164|uploadTicketImageV202|removeTicketImageV202)\((?:event\s*,\s*)?['"]([^'"]+)['"]/i);
    if(match) return cleanLabel(match[1]);
    const input = control?.closest?.('.ticket-actions')?.querySelector?.('input.ticket-file-input[onchange*="uploadTicketImage"]');
    const onchg = norm(input?.getAttribute?.('onchange') || '');
    const m2 = onchg.match(/uploadTicketImage\(event\s*,\s*['"]([^'"]+)['"]/i);
    if(m2) return cleanLabel(m2[1]);
    return rowLabel(row);
  }
  function actionFromControl(control){
    const ds = norm(control?.dataset?.ceV17TicketAction || '');
    if(ds === 'attach' || ds === 'remove') return ds;
    const txt = up((control?.textContent || '') + ' ' + (control?.title || '') + ' ' + (control?.getAttribute?.('aria-label') || '') + ' ' + (control?.getAttribute?.('onclick') || ''));
    if(/REMOVETICKETIMAGE|ELIMINAR|BORRAR|🗑/.test(txt)) return 'remove';
    if(/UPLOADTICKETIMAGE|ADJUNTAR|INSERTAR|SUBIR|📎/.test(txt)) return 'attach';
    return '';
  }
  function controlFromEvent(ev){
    return ev.target?.closest?.('#summaryTiendaTicket .ticket-actions button,#ceBudgetLiteTooltipV307 .ticket-actions button,#summaryTiendaTicket .ce-photo-btn-v202,#ceBudgetLiteTooltipV307 .ce-photo-btn-v202,#summaryTiendaTicket [data-ce-delete-img],#ceBudgetLiteTooltipV307 [data-ce-delete-img]');
  }
  function handleClick(ev){
    const control = controlFromEvent(ev);
    if(!control) return;
    const action = actionFromControl(control);
    const label = labelFromControl(control);
    if(!action || !label) return;
    const sig = `${action}|${label}`;
    const now = Date.now();
    if(sig === lastActionSig && now - lastActionAt < 700) return stop(ev);
    lastActionSig = sig; lastActionAt = now;
    if(busy.has(cleanLabel(label))) return stop(ev);
    if(action === 'attach') return pickFile(label, ev);
    if(action === 'remove') return removePhoto(label, ev);
  }
  function handleLegacyInputChange(ev){
    const input = ev.target;
    if(!input?.matches?.('#summaryTiendaTicket input.ticket-file-input,#ceBudgetLiteTooltipV307 input.ticket-file-input')) return;
    const file = input.files && input.files[0];
    const label = labelFromControl(input);
    if(!file || !label) return;
    stop(ev);
    attachWithFile(label, file, ev).finally(() => { try{ input.value = ''; }catch(_){ } });
    return false;
  }
  function wrapGlobals(){
    const upload = function(evOrEncoded, maybeEncoded){
      if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){
        const label = cleanLabel(maybeEncoded || labelFromControl(evOrEncoded.target));
        const file = evOrEncoded.target.files && evOrEncoded.target.files[0];
        attachWithFile(label, file, evOrEncoded);
        return false;
      }
      return pickFile(cleanLabel(evOrEncoded || ''), null);
    };
    const remove = function(encoded){ return removePhoto(cleanLabel(encoded || ''), null); };
    try{ window.uploadTicketImage = upload; uploadTicketImage = upload; }catch(_){ window.uploadTicketImage = upload; }
    try{ window.uploadTicketImageV164 = upload; uploadTicketImageV164 = upload; }catch(_){ window.uploadTicketImageV164 = upload; }
    try{ window.uploadTicketImageV202 = upload; }catch(_){ }
    try{ window.removeTicketImage = remove; removeTicketImage = remove; }catch(_){ window.removeTicketImage = remove; }
    try{ window.removeTicketImageV164 = remove; removeTicketImageV164 = remove; }catch(_){ window.removeTicketImageV164 = remove; }
    try{ window.removeTicketImageV202 = remove; }catch(_){ }
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #summaryTiendaTicket .ticket-actions,#ceBudgetLiteTooltipV307 .ticket-actions{
        display:inline-flex!important;align-items:center!important;gap:8px!important;min-width:82px!important;justify-content:flex-end!important;
      }
      #summaryTiendaTicket .ticket-actions input.ticket-file-input,#ceBudgetLiteTooltipV307 .ticket-actions input.ticket-file-input{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #summaryTiendaTicket .ticket-actions button.ce-v17-photo-icon,#ceBudgetLiteTooltipV307 .ticket-actions button.ce-v17-photo-icon{
        width:34px!important;min-width:34px!important;height:30px!important;min-height:30px!important;padding:2px!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:16px!important;line-height:1!important;border-radius:8px!important;white-space:nowrap!important;
      }
      #summaryTiendaTicket .ticket-actions img.ticket-thumb,#ceBudgetLiteTooltipV307 .ticket-actions img.ticket-thumb{
        width:36px!important;height:36px!important;object-fit:cover!important;border-radius:8px!important;display:inline-block!important;visibility:visible!important;opacity:1!important;
      }
    `;
    document.head.appendChild(style);
  }
  function install(){ injectStyle(); wrapGlobals(); normalizeTicketRows(); }

  document.addEventListener('click', handleClick, true);
  window.addEventListener('click', handleClick, true);
  document.addEventListener('change', handleLegacyInputChange, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  try{ new MutationObserver(() => setTimeout(normalizeTicketRows, 30)).observe(document.body, {childList:true, subtree:true}); }catch(_){ }
  [0,80,220,600,1200,2400,4200].forEach(ms => setTimeout(install, ms));

  window.ControlEventV17CalculosFotos = {install, normalizeTicketRows, clearLocal, attachPhoto:pickFile, removePhoto, version:'v17_prod_calculos_fotos_fix3'};
})();
