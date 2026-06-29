/* ControlEvent v17_prod - hotfix acotado fotos en Calculos por tienda y ticket.
   Copia el patrón robusto de INGRESOS: input efímero, limpieza local amplia,
   escritura explícita /api/ticket-images y refresco sólo del resumen. No cambia versión. */
(function(){
  'use strict';
  const INSTALLED = '__ceV17CalculosFotosIngresosStyle';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

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
  function currentEvent(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return ev; }catch(_){ }
    try{ const ev = typeof window.selectedEvent === 'function' ? window.selectedEvent() : null; if(ev?.id) return ev; }catch(_){ }
    const id = eventId();
    return arr('eventos').find(ev => String(ev?.id || '') === id) || {};
  }
  function eventId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return norm(ev.id); }catch(_){ }
    try{ const ev = typeof window.selectedEvent === 'function' ? window.selectedEvent() : null; if(ev?.id) return norm(ev.id); }catch(_){ }
    return norm(st().selectedEventId || '');
  }
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
  function stores(){
    const s = st();
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    return {images:s.ticketImages, refs:s.ticketImageRefs};
  }
  function decodeMaybe(value){
    const raw = norm(value);
    if(!raw) return '';
    try{ return /%[0-9A-F]{2}/i.test(raw) ? decodeURIComponent(raw) : raw; }catch(_){ return raw; }
  }
  function cleanLabel(label){
    const ev = eventId();
    let out = decodeMaybe(label).replace(/\s*\|\s*/g, ' | ').trim();
    if(ev && out.startsWith(ev + ' | ')) out = out.slice(ev.length + 3).trim();
    if(ev && out.startsWith(ev + '|')) out = out.slice(ev.length + 1).trim();
    return out.replace(/\s*\|\s*/g, ' | ').trim();
  }
  function ticketToken(label){
    const match = norm(label).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);
    return match ? match[0].replace(/\s+/g, '').toUpperCase() : '';
  }
  function primaryKey(label){ const ev = eventId(); const clean = cleanLabel(label); return ev && clean ? `${ev}|${clean}` : clean; }
  function keyOnly(label){ return cleanLabel(label); }
  function valueToSrc(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.src || '');
    return '';
  }
  function labelParts(label){ return cleanLabel(label).split('|').map(part => norm(part)).filter(Boolean); }
  function imageVariants(label){
    const ev = eventId();
    const raw = decodeMaybe(label);
    const clean = cleanLabel(label);
    const parts = labelParts(label);
    const tk = ticketToken(clean || raw);
    const out = [];
    const add = value => { value = norm(value); if(value && !out.includes(value)) out.push(value); };
    const scoped = value => { value = norm(value); if(!value) return; add(value); if(ev && !value.startsWith(ev + '|')) add(`${ev}|${value}`); };
    [raw, clean].forEach(scoped);
    if(parts.length >= 2){
      const store = parts[0];
      const second = parts[1];
      [
        `${store} | ${second}`,
        `${store}|${second}`,
        `${second}`,
        tk ? `${store} | ${tk}` : '',
        tk ? `${store}|${tk}` : '',
        tk || ''
      ].forEach(scoped);
    } else if(tk){
      scoped(tk);
    }
    return out;
  }
  function clearLocal(label){
    const {images, refs} = stores();
    const variants = new Set(imageVariants(label));
    const ev = eventId();
    const tk = ticketToken(label);
    const wantStore = up(labelParts(label)[0] || '');
    Object.keys(images).concat(Object.keys(refs)).forEach(key => {
      const k = String(key || '');
      const rest = ev && k.startsWith(ev + '|') ? k.slice(ev.length + 1) : k;
      const matchesVariant = variants.has(k) || variants.has(rest);
      const matchesTicket = ev && k.startsWith(ev + '|') && tk && up(rest).includes(tk) && (!wantStore || up(rest).includes(wantStore) || up(rest) === tk);
      if(matchesVariant || matchesTicket) variants.add(k);
    });
    variants.forEach(key => { try{ delete images[key]; delete refs[key]; }catch(_){ } });
  }
  function putLocal(label, src, ref){
    if(!src) return;
    const {images, refs} = stores();
    const clean = cleanLabel(label);
    const pkey = primaryKey(clean);
    const tk = ticketToken(clean);
    const keys = [pkey];
    if(tk) keys.push(`${eventId()}|${tk}`);
    keys.forEach(key => {
      if(!key) return;
      images[key] = src;
      refs[key] = ref && typeof ref === 'object' ? {...ref, key, url:src, pathname:ref.pathname || ref.url || src} : {key, url:src, pathname:src};
    });
  }
  function captureScroll(){
    const data = {x:window.scrollX || 0, y:window.scrollY || 0, els:[]};
    ['summaryTiendaTicket','comprasSummaryBody','tabResumen','budgetLayout','mainTabs'].forEach(id => {
      const el = $(id);
      if(el) data.els.push([id, el.scrollLeft || 0, el.scrollTop || 0]);
    });
    return data;
  }
  function restoreScroll(data){
    if(!data) return;
    const run = () => {
      try{ window.scrollTo(data.x || 0, data.y || 0); }catch(_){ }
      (data.els || []).forEach(([id,x,y]) => { const el = $(id); if(el){ try{ el.scrollLeft = x; el.scrollTop = y; }catch(_){ } } });
    };
    [0,40,120,260].forEach(ms => setTimeout(run, ms));
  }
  function setBusy(label, on){
    const key = cleanLabel(label);
    if(!key) return;
    if(on) busy.add(key); else busy.delete(key);
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => {
      const rowLabel = rowLabelFromNode(row);
      if(cleanLabel(rowLabel) !== key) return;
      row.querySelectorAll('.ticket-actions button').forEach(btn => { try{ btn.disabled = !!on; btn.style.pointerEvents = on ? 'none' : ''; }catch(_){ } });
    });
  }
  function repaintRowDom(label, src){
    const key = cleanLabel(label);
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => {
      const rowLabel = cleanLabel(rowLabelFromNode(row));
      if(rowLabel !== key) return;
      const actions = row.querySelector('.ticket-actions');
      if(!actions) return;
      actions.querySelectorAll('.hint').forEach(el => { if(/Sin imagen/i.test(el.textContent || '')) el.remove(); });
      let img = actions.querySelector('img.ticket-thumb');
      if(src){
        if(!img){ img = document.createElement('img'); img.className = 'ticket-thumb'; img.alt = 'ticket'; actions.appendChild(img); }
        img.src = src;
        img.style.display = 'inline-block';
        const encoded = encodeURIComponent(key);
        if(!actions.querySelector('button[onclick*="removeTicketImage"]')){
          const del = document.createElement('button');
          del.type = 'button'; del.className = 'outline small'; del.title = 'Eliminar foto'; del.textContent = 'Eliminar';
          del.setAttribute('onclick', `removeTicketImage('${encoded}'); return false;`);
          actions.appendChild(del);
        }
      } else {
        if(img) img.remove();
        actions.querySelectorAll('button').forEach(btn => {
          const txt = up(btn.textContent + ' ' + (btn.title || '') + ' ' + (btn.getAttribute('onclick') || ''));
          if(/ELIMINAR|BORRAR|REMOVETICKETIMAGE|🗑/.test(txt)) btn.remove();
        });
        if(!actions.querySelector('.hint')){
          const span = document.createElement('span'); span.className = 'hint'; span.textContent = 'Sin imagen'; actions.appendChild(span);
        }
      }
    });
  }
  function refreshSummary(label, src, scroll){
    repaintRowDom(label, src || '');
    try{ if(typeof window.renderBudget === 'function') window.renderBudget(); else if(typeof renderBudget === 'function') renderBudget(); }catch(_){ }
    try{ window.ControlEventV40ProdPhotos?.sync?.(true); }catch(_){ }
    try{ window.ControlEventV40ProdPhotos?.hydrate?.(true); }catch(_){ }
    [70,180,420,900].forEach(ms => setTimeout(() => { repaintRowDom(label, src || ''); restoreScroll(scroll); }, ms));
  }
  function readImageAsDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la foto.'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
  }
  async function compressImageFile(file){
    const original = await readImageAsDataUrl(file);
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
  async function uploadServer(label, src){
    const ev = eventId();
    const key = keyOnly(label);
    if(!ev || !key || !isDataUrl(src)) throw new Error('Falta evento, ticket o imagen.');
    const res = await fetch('/api/ticket-images', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':'ticket-image-v8-5-fix26'},
      body:JSON.stringify({eventId:ev, key, dataUrl:src})
    });
    const payload = await res.json().catch(() => ({}));
    if(!res.ok || !payload.ok || !payload.image) throw new Error(payload.error || payload.message || 'No se pudo guardar la foto en servidor.');
    const image = payload.image || {};
    const savedUrl = valueToSrc(image) || src;
    putLocal(label, savedUrl, image);
    if(image.key && image.key !== primaryKey(label)){
      const {images, refs} = stores();
      images[image.key] = savedUrl;
      refs[image.key] = {...image, key:image.key, url:savedUrl, pathname:image.pathname || savedUrl};
    }
    return savedUrl;
  }
  async function deleteServer(label){
    const ev = eventId();
    const key = keyOnly(label);
    if(!ev || !key) return;
    const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(ev)}&key=${encodeURIComponent(key)}`, {
      method:'DELETE',
      headers:{'X-ControlEvent-Write-Scope':'ticket-image-v8-5-fix26'}
    });
    if(!res.ok){
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.error || payload.message || 'No se pudo eliminar la foto en servidor.');
    }
  }
  function guardCanModify(ev){
    if(!canWrite()){ alert('No autorizado para modificar fotos.'); return stop(ev || {}); }
    if(locked()){ alert('Evento finalizado. No se puede modificar.'); return stop(ev || {}); }
    return true;
  }
  async function attachPhoto(label, ev){
    stop(ev || {});
    if(guardCanModify(null) !== true) return false;
    label = cleanLabel(label);
    if(!label) return false;
    const scroll = captureScroll();
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '-9999px';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      try{
        const file = input.files && input.files[0];
        if(!file) return;
        if(file.type && !/^image\//i.test(file.type)){ alert('Selecciona una imagen para el ticket.'); return; }
        setBusy(label, true);
        const src = await compressImageFile(file);
        clearLocal(label);
        putLocal(label, src);
        refreshSummary(label, src, scroll);
        const url = await uploadServer(label, src);
        refreshSummary(label, url, scroll);
      }catch(error){
        alert('No se pudo adjuntar la foto. ' + (error?.message || error));
        restoreScroll(scroll);
      }finally{
        setBusy(label, false);
        try{ input.value = ''; input.remove(); }catch(_){ }
      }
    }, {once:true});
    input.click();
    return false;
  }
  async function removePhoto(label, ev){
    stop(ev || {});
    if(guardCanModify(null) !== true) return false;
    label = cleanLabel(label);
    if(!label) return false;
    if(!confirm('¿Eliminar la foto asociada a este ticket?')) return false;
    const scroll = captureScroll();
    try{
      setBusy(label, true);
      await deleteServer(label);
      clearLocal(label);
      refreshSummary(label, '', scroll);
    }catch(error){
      alert('No se pudo eliminar la foto. ' + (error?.message || error));
      restoreScroll(scroll);
    }finally{
      setBusy(label, false);
    }
    return false;
  }
  function rowLabelFromNode(node){
    const row = node?.closest?.('.summary-item') || node;
    const first = row?.querySelector?.(':scope > span:first-child');
    return norm(first?.textContent || row?.dataset?.ceTicketLabel || '');
  }
  function labelFromControl(control){
    const onclick = norm(control?.getAttribute?.('onclick') || '');
    const match = onclick.match(/(?:uploadTicketImage|removeTicketImage)\((?:event\s*,\s*)?['"]([^'"]+)['"]/i);
    if(match) return cleanLabel(match[1]);
    const input = control?.closest?.('.ticket-actions')?.querySelector?.('input.ticket-file-input[onchange*="uploadTicketImage"]');
    const onchg = norm(input?.getAttribute?.('onchange') || '');
    const m2 = onchg.match(/uploadTicketImage\(event\s*,\s*['"]([^'"]+)['"]/i);
    if(m2) return cleanLabel(m2[1]);
    return cleanLabel(rowLabelFromNode(control));
  }
  function actionFromControl(control){
    const txt = up((control?.textContent || '') + ' ' + (control?.title || '') + ' ' + (control?.getAttribute?.('onclick') || ''));
    if(/REMOVETICKETIMAGE|ELIMINAR|BORRAR|🗑/.test(txt)) return 'remove';
    if(/UPLOADTICKETIMAGE|ADJUNTAR|INSERTAR|📎/.test(txt)) return 'attach';
    return '';
  }
  function handleActivation(ev){
    const control = ev.target?.closest?.('#summaryTiendaTicket .ticket-actions button,#ceBudgetLiteTooltipV307 .ticket-actions button');
    if(!control) return;
    const action = actionFromControl(control);
    if(!action) return;
    const label = labelFromControl(control);
    if(!label) return;
    const sig = action + '|' + label;
    const now = Date.now();
    if(sig === lastActionSig && now - lastActionAt < 650) return stop(ev);
    lastActionSig = sig; lastActionAt = now;
    if(busy.has(cleanLabel(label))) return stop(ev);
    if(action === 'attach') return attachPhoto(label, ev);
    if(action === 'remove') return removePhoto(label, ev);
  }
  function wrapGlobals(){
    const wrappedUpload = function(evOrEncoded, maybeEncoded){
      const label = evOrEncoded && evOrEncoded.target && maybeEncoded ? maybeEncoded : evOrEncoded;
      if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){
        const file = evOrEncoded.target.files && evOrEncoded.target.files[0];
        const clean = cleanLabel(maybeEncoded || '');
        if(!clean || !file) return false;
        const scroll = captureScroll();
        (async () => {
          try{
            if(guardCanModify(evOrEncoded) !== true) return;
            setBusy(clean, true);
            const src = await compressImageFile(file);
            clearLocal(clean); putLocal(clean, src); refreshSummary(clean, src, scroll);
            const url = await uploadServer(clean, src); refreshSummary(clean, url, scroll);
          }catch(error){ alert('No se pudo adjuntar la foto. ' + (error?.message || error)); restoreScroll(scroll); }
          finally{ setBusy(clean, false); try{ evOrEncoded.target.value = ''; }catch(_){ } }
        })();
        return false;
      }
      return attachPhoto(label, null);
    };
    const wrappedRemove = function(encoded){ return removePhoto(encoded, null); };
    try{ window.uploadTicketImage = wrappedUpload; uploadTicketImage = wrappedUpload; }catch(_){ window.uploadTicketImage = wrappedUpload; }
    try{ window.uploadTicketImageV164 = wrappedUpload; uploadTicketImageV164 = wrappedUpload; }catch(_){ window.uploadTicketImageV164 = wrappedUpload; }
    try{ window.uploadTicketImageV202 = wrappedUpload; }catch(_){ }
    try{ window.removeTicketImage = wrappedRemove; removeTicketImage = wrappedRemove; }catch(_){ window.removeTicketImage = wrappedRemove; }
    try{ window.removeTicketImageV164 = wrappedRemove; removeTicketImageV164 = wrappedRemove; }catch(_){ window.removeTicketImageV164 = wrappedRemove; }
    try{ window.removeTicketImageV202 = wrappedRemove; }catch(_){ }
  }
  function install(){ wrapGlobals(); }

  document.addEventListener('click', handleActivation, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  [0,80,240,700,1500,3000].forEach(ms => setTimeout(install, ms));
  window.ControlEventV17CalculosFotos = {install, attachPhoto, removePhoto, clearLocal, imageVariants};
})();
