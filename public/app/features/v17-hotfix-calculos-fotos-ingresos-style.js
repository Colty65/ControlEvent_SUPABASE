/* ControlEvent v17_prod - mantenimiento estable de fotos en Cálculos por tienda y ticket.
   Base FIX2: no cambia version. Sustituye los controles inestables por un flujo calcado
   al de Documentos/Ingresos: input efimero, escritura explicita, sin renderBudget y sin
   rehidrataciones de ventana. */
(function(){
  'use strict';
  const INSTALLED = '__ceV17CalculosFotosDocumentosStyleV4';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV17CalculosFotosDocStyleV4';
  const WRITE_SCOPE = 'ticket-image-v8-5-fix26';
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? '').trim();
  const up = value => norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isDataUrl = value => /^data:image\//i.test(String(value || ''));
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };
  const safe = (fn, fb) => { try{ const out = fn(); return out === undefined ? fb : out; }catch(_){ return fb; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);

  let lastActionSig = '';
  let lastActionAt = 0;
  let normalizeTimer = 0;
  const busy = new Set();

  function uniquePush(list, item){ if(item && typeof item === 'object' && !list.includes(item)) list.push(item); }
  function stateObjects(){
    const out = [];
    uniquePush(out, getLexical('state'));
    uniquePush(out, window.state);
    uniquePush(out, window.ControlEventApp?.state);
    uniquePush(out, window.ControlEventRuntime?.app?.state);
    uniquePush(out, window.__CONTROL_EVENT_STATE__);
    if(!out.length) out.push({});
    return out;
  }
  function st(){ return stateObjects()[0] || {}; }
  function arrFromAny(name){
    for(const s of stateObjects()){ if(Array.isArray(s?.[name])) return s[name]; }
    return [];
  }
  function eventId(){
    const fromSelected = safe(() => (typeof selectedEvent === 'function' ? selectedEvent() : null)?.id, '') || safe(() => window.selectedEvent?.()?.id, '');
    if(norm(fromSelected)) return norm(fromSelected);
    for(const s of stateObjects()){ if(norm(s?.selectedEventId)) return norm(s.selectedEventId); }
    return norm($('selectedEvent')?.value || '');
  }
  function currentEvent(){
    const id = eventId();
    for(const s of stateObjects()){
      const ev = (Array.isArray(s?.eventos) ? s.eventos : []).find(item => String(item?.id || '') === id);
      if(ev) return ev;
    }
    return {};
  }
  function role(){
    const lexical = safe(() => (typeof authUser !== 'undefined' && authUser) ? authUser.nivel : '', '');
    return up(lexical || window.authUser?.nivel || window.ControlEventApp?.authUser?.nivel || '');
  }
  function canWrite(){ return role() === 'GD' || role() === 'RW'; }
  function locked(){
    const lexical = safe(() => typeof isLocked === 'function' ? isLocked() : undefined, undefined);
    if(lexical !== undefined) return !!lexical;
    if(typeof window.isLocked === 'function') return !!safe(() => window.isLocked(), false);
    return up(currentEvent().situacion || '') === 'FINALIZADO';
  }

  function ensureStoresOn(s){
    if(!s || typeof s !== 'object') return {images:{}, refs:{}, byKey:{}};
    if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {};
    if(!s.ticketImagesByKey || typeof s.ticketImagesByKey !== 'object') s.ticketImagesByKey = {};
    return {images:s.ticketImages, refs:s.ticketImageRefs, byKey:s.ticketImagesByKey};
  }
  function allBags(){
    const out = [];
    for(const s of stateObjects()){
      const stores = ensureStoresOn(s);
      out.push(stores.images, stores.refs, stores.byKey);
    }
    return out.filter(Boolean);
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
  function labelParts(label){ return cleanLabel(label).split('|').map(part => norm(part)).filter(Boolean); }
  function keyOnly(label){ return cleanLabel(label); }
  function primaryKey(label){ const ev = eventId(); const clean = cleanLabel(label); return ev && clean ? `${ev}|${clean}` : clean; }
  function imageSource(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.src || value.base64 || '');
    return '';
  }
  function imageKeyRest(key){ const ev = eventId(); const k = norm(key); return ev && k.startsWith(ev + '|') ? k.slice(ev.length + 1) : k; }
  function imageEventFromValue(value){
    const src = imageSource(value);
    const m = src.match(/\/ticket-images\/([^\/?#]+)\//i);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function sameEventKey(key, value){
    const ev = eventId(); const k = norm(key);
    if(!ev) return false;
    if(k.startsWith(ev + '|')) return true;
    return imageEventFromValue(value) === ev;
  }
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
      const left = parts[0];
      const right = parts.slice(1).join(' | ');
      [`${left} | ${right}`, `${left}|${right}`, right, tk ? `${left} | ${tk}` : '', tk ? `${left}|${tk}` : '', tk || ''].forEach(scoped);
    }else if(tk){ scoped(tk); }
    return out;
  }
  function shouldTouchKey(label, key, value){
    const ev = eventId();
    const clean = cleanLabel(label);
    const tk = ticketToken(clean);
    const variants = new Set(imageVariants(clean).map(norm));
    const k = norm(key);
    const rest = imageKeyRest(k);
    if(variants.has(k) || variants.has(rest)) return true;
    if(!sameEventKey(k, value)) return false;
    const restUp = up(rest);
    if(tk && restUp.includes(tk)) return true;
    if(up(rest) === up(clean)) return true;
    return false;
  }
  function clearLocal(label){
    for(const bag of allBags()){
      Object.keys(bag || {}).forEach(key => { if(shouldTouchKey(label, key, bag[key])){ try{ delete bag[key]; }catch(_){ } } });
    }
  }
  function putLocal(label, src, ref){
    if(!src) return;
    const key = primaryKey(label);
    if(!key) return;
    for(const s of stateObjects()){
      const {images, refs, byKey} = ensureStoresOn(s);
      const item = ref && typeof ref === 'object' ? {...ref, key, url:src, pathname:ref.pathname || ref.url || src} : {key, url:src, pathname:src};
      images[key] = src;
      refs[key] = item;
      byKey[key] = item;
    }
  }
  function scoreImageCandidate(label, key, value){
    const src = imageSource(value);
    if(!src || !sameEventKey(key, value)) return -1;
    const clean = cleanLabel(label);
    const pkey = primaryKey(clean);
    const rest = imageKeyRest(key);
    const tk = ticketToken(clean);
    let score = 0;
    if(key === pkey) score += 1000;
    if(up(rest) === up(clean)) score += 700;
    if(up(rest).includes(up(clean))) score += 300;
    if(tk && up(rest).includes(tk)) score += 120;
    if(/\?ce_img=|&ce_img=/.test(src)) score += 20;
    if(!isDataUrl(src)) score += 10;
    return score;
  }
  function imageForLabel(label){
    let best = {score:-1, src:''};
    for(const bag of allBags()){
      for(const [key, value] of Object.entries(bag || {})){
        const score = scoreImageCandidate(label, key, value);
        if(score > best.score){ best = {score, src:imageSource(value)}; }
      }
    }
    return best.score > 0 ? best.src : '';
  }

  function captureScroll(){
    const data = {x:window.scrollX || 0, y:window.scrollY || 0, els:[]};
    ['summaryTiendaTicket','tabResumen','budgetLayout','mainTabs'].forEach(id => { const el = $(id); if(el) data.els.push([id, el.scrollLeft || 0, el.scrollTop || 0]); });
    return data;
  }
  function restoreScroll(data){
    if(!data) return;
    const run = () => {
      try{ window.scrollTo(data.x || 0, data.y || 0); }catch(_){ }
      (data.els || []).forEach(([id,x,y]) => { const el = $(id); if(el){ try{ el.scrollLeft = x; el.scrollTop = y; }catch(_){ } } });
    };
    [0,60,160].forEach(ms => setTimeout(run, ms));
  }
  function rowLabelFromNode(node){
    const row = node?.closest?.('.summary-item') || node;
    const explicit = row?.dataset?.ceV17Label || row?.dataset?.ceTicketLabel || '';
    if(explicit) return cleanLabel(explicit);
    const first = row?.querySelector?.(':scope > span:first-child,.ce-hf10-label');
    return cleanLabel(norm(first?.textContent || '').replace(/\s*ⓘ\s*$/,'').trim());
  }
  function makeButton(action, label){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'outline small ce-v17-photo-icon';
    btn.dataset.ceV17PhotoAction = action;
    btn.dataset.ceV17Label = label;
    btn.textContent = action === 'remove' ? '🗑️' : '📎';
    btn.title = action === 'remove' ? 'Eliminar foto' : 'Adjuntar foto';
    btn.setAttribute('aria-label', btn.title);
    return btn;
  }
  function normalizeRow(row, forcedSrc){
    if(!row || row.classList?.contains('ce-hf10-donation') || row.classList?.contains('red-row')) return;
    const label = rowLabelFromNode(row);
    if(!label || !ticketToken(label)) return;
    const actions = row.querySelector('.ticket-actions');
    if(!actions) return;
    const src = forcedSrc !== undefined ? (forcedSrc || '') : imageForLabel(label);
    const sig = `${label}|${src ? src.slice(0, 120) + ':' + src.length : 'noimg'}|${busy.has(label) ? 'busy' : 'free'}`;
    const ownButtons = actions.querySelectorAll(':scope > button[data-ce-v17-photo-action]');
    const legacyBits = actions.querySelector('input.ticket-file-input,:scope > button:not([data-ce-v17-photo-action])');
    const imgCount = actions.querySelectorAll(':scope > img.ticket-thumb').length;
    const cleanStructure = !legacyBits && !!actions.querySelector(':scope > button[data-ce-v17-photo-action="attach"]') && (src ? (imgCount === 1 && !!actions.querySelector(':scope > button[data-ce-v17-photo-action="remove"]') && ownButtons.length === 2) : (imgCount === 0 && !actions.querySelector(':scope > button[data-ce-v17-photo-action="remove"]') && ownButtons.length === 1));
    if(actions.dataset.ceV17Sig === sig && cleanStructure) return;
    actions.dataset.ceV17Sig = sig;
    actions.dataset.ceV17Label = label;
    row.dataset.ceV17Label = label;
    row.dataset.ceTicketLabel = label;
    while(actions.firstChild) actions.removeChild(actions.firstChild);
    const attach = makeButton('attach', label);
    attach.disabled = busy.has(label);
    actions.appendChild(attach);
    if(src){
      const img = document.createElement('img');
      img.className = 'ticket-thumb ce-v17-ticket-thumb';
      img.alt = 'ticket';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = src;
      const tk = ticketToken(label);
      if(tk) img.dataset.ceHf12Tk = tk;
      const tip = row.getAttribute('data-ce-tip-v21') || row.getAttribute('data-ce-tip') || '';
      if(tip) img.dataset.ceTipV21 = tip;
      actions.appendChild(img);
      const remove = makeButton('remove', label);
      remove.disabled = busy.has(label);
      actions.appendChild(remove);
    }else{
      const span = document.createElement('span');
      span.className = 'hint ce-v17-noimage';
      span.textContent = 'Sin imagen';
      actions.appendChild(span);
    }
  }
  function normalizeAll(){
    clearTimeout(normalizeTimer);
    normalizeTimer = 0;
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => normalizeRow(row));
  }
  function scheduleNormalize(delay = 60){
    clearTimeout(normalizeTimer);
    normalizeTimer = setTimeout(normalizeAll, delay);
  }
  function repaintLabel(label, src, scroll){
    const clean = cleanLabel(label);
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => {
      if(rowLabelFromNode(row) === clean) normalizeRow(row, src || '');
    });
    restoreScroll(scroll);
  }
  function setBusy(label, on){
    label = cleanLabel(label);
    if(!label) return;
    if(on) busy.add(label); else busy.delete(label);
    repaintLabel(label, imageForLabel(label), null);
  }

  function readFile(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsDataURL(file);
    });
  }
  async function fileToCompressedDataUrl(file){
    if(!file) throw new Error('Selecciona una imagen.');
    if(file.type && !/^image\//i.test(file.type)) throw new Error('El archivo debe ser una imagen.');
    const original = await readFile(file);
    return await new Promise(resolve => {
      const img = new Image();
      img.onerror = () => resolve(original);
      img.onload = () => {
        try{
          const max = 1500;
          let w = img.width || max, h = img.height || max;
          const ratio = Math.min(max / Math.max(w, 1), max / Math.max(h, 1), 1);
          w = Math.max(1, Math.round(w * ratio));
          h = Math.max(1, Math.round(h * ratio));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#fff'; ctx.fillRect(0,0,w,h);
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.84));
        }catch(_){ resolve(original); }
      };
      img.src = original;
    });
  }
  async function apiJson(url, options = {}){
    const res = await fetch(url, {
      cache:'no-store',
      ...options,
      headers:{
        'Content-Type':'application/json',
        'X-ControlEvent-Write-Scope':WRITE_SCOPE,
        ...(options.headers || {})
      }
    });
    const text = await res.text().catch(() => '');
    let json = {};
    try{ json = text ? JSON.parse(text) : {}; }catch(_){ json = {}; }
    if(!res.ok) throw new Error(json.error || json.message || text || `HTTP ${res.status}`);
    return json;
  }
  async function deleteServer(label){
    const ev = eventId(); const key = keyOnly(label);
    if(!ev || !key) return {ok:true};
    return apiJson(`/api/ticket-images?eventId=${encodeURIComponent(ev)}&key=${encodeURIComponent(key)}`, {
      method:'DELETE',
      body:JSON.stringify({eventId:ev, key})
    });
  }
  async function uploadServer(label, dataUrl){
    const ev = eventId(); const key = keyOnly(label);
    if(!ev || !key || !isDataUrl(dataUrl)) throw new Error('Falta evento, ticket o imagen.');
    const json = await apiJson('/api/ticket-images', {
      method:'POST',
      body:JSON.stringify({eventId:ev, key, dataUrl})
    });
    const image = json.image || json || {};
    const src = imageSource(image) || dataUrl;
    clearLocal(label);
    putLocal(label, src, image);
    return src;
  }
  function guardCanModify(ev){
    if(!canWrite()){ alert('No autorizado para modificar fotos.'); return stop(ev || {}); }
    if(locked()){ alert('Evento finalizado. No se puede modificar.'); return stop(ev || {}); }
    return true;
  }
  async function attachPhoto(label, ev){
    stop(ev || {});
    if(guardCanModify(ev || null) !== true) return false;
    label = cleanLabel(label);
    if(!label) return false;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.top = '-9999px';
    input.style.width = '1px';
    input.style.height = '1px';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const scroll = captureScroll();
      try{
        const file = input.files && input.files[0];
        if(!file) return;
        setBusy(label, true);
        const localDataUrl = await fileToCompressedDataUrl(file);
        // Igual que Documentos: limpiar, subir y usar exactamente la URL devuelta.
        // No se invoca renderBudget ni recargas globales.
        clearLocal(label);
        repaintLabel(label, '', scroll);
        await deleteServer(label).catch(error => console.warn('[ControlEvent v17_prod] Limpieza previa de foto TK:', error?.message || error));
        clearLocal(label);
        putLocal(label, localDataUrl);
        repaintLabel(label, localDataUrl, scroll);
        const finalUrl = await uploadServer(label, localDataUrl);
        repaintLabel(label, finalUrl, scroll);
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
    if(guardCanModify(ev || null) !== true) return false;
    label = cleanLabel(label);
    if(!label) return false;
    if(!confirm('¿Eliminar la foto asociada a este ticket?')) return false;
    const scroll = captureScroll();
    try{
      setBusy(label, true);
      await deleteServer(label);
      clearLocal(label);
      repaintLabel(label, '', scroll);
    }catch(error){
      alert('No se pudo eliminar la foto. ' + (error?.message || error));
      restoreScroll(scroll);
    }finally{
      setBusy(label, false);
    }
    return false;
  }
  function labelFromControl(control){
    const explicit = control?.dataset?.ceV17Label || control?.closest?.('.ticket-actions')?.dataset?.ceV17Label || control?.closest?.('.summary-item')?.dataset?.ceV17Label || '';
    if(explicit) return cleanLabel(explicit);
    const onclick = norm(control?.getAttribute?.('onclick') || '');
    const match = onclick.match(/(?:uploadTicketImage|removeTicketImage)\((?:event\s*,\s*)?['"]([^'"]+)['"]/i);
    if(match) return cleanLabel(match[1]);
    const input = control?.closest?.('.ticket-actions')?.querySelector?.('input.ticket-file-input[onchange*="uploadTicketImage"]');
    const onchg = norm(input?.getAttribute?.('onchange') || '');
    const m2 = onchg.match(/uploadTicketImage\(event\s*,\s*['"]([^'"]+)['"]/i);
    if(m2) return cleanLabel(m2[1]);
    return rowLabelFromNode(control);
  }
  function actionFromControl(control){
    const data = norm(control?.dataset?.ceV17PhotoAction || '');
    if(data === 'attach' || data === 'remove') return data;
    const txt = up((control?.textContent || '') + ' ' + (control?.title || '') + ' ' + (control?.getAttribute?.('aria-label') || '') + ' ' + (control?.getAttribute?.('onclick') || ''));
    if(/REMOVETICKETIMAGE|ELIMINAR|BORRAR|🗑/.test(txt)) return 'remove';
    if(/UPLOADTICKETIMAGE|ADJUNTAR|INSERTAR|SUBIR|📎/.test(txt)) return 'attach';
    return '';
  }
  function controlFromEvent(ev){
    return ev.target?.closest?.('#summaryTiendaTicket .ticket-actions button,#ceBudgetLiteTooltipV307 .ticket-actions button,#summaryTiendaTicket input.ticket-file-input,#ceBudgetLiteTooltipV307 input.ticket-file-input');
  }
  function handleActivation(ev){
    const control = controlFromEvent(ev);
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
      const isFileChange = evOrEncoded && evOrEncoded.target && evOrEncoded.target.files;
      const label = isFileChange ? maybeEncoded : evOrEncoded;
      if(isFileChange){
        const file = evOrEncoded.target.files && evOrEncoded.target.files[0];
        const clean = cleanLabel(maybeEncoded || '');
        if(!clean || !file) return false;
        const scroll = captureScroll();
        (async () => {
          try{
            if(guardCanModify(evOrEncoded) !== true) return;
            setBusy(clean, true);
            const dataUrl = await fileToCompressedDataUrl(file);
            await deleteServer(clean).catch(error => console.warn('[ControlEvent v17_prod] Limpieza previa TK:', error?.message || error));
            clearLocal(clean); putLocal(clean, dataUrl); repaintLabel(clean, dataUrl, scroll);
            const url = await uploadServer(clean, dataUrl); repaintLabel(clean, url, scroll);
          }catch(error){ alert('No se pudo adjuntar la foto. ' + (error?.message || error)); restoreScroll(scroll); }
          finally{ setBusy(clean, false); try{ evOrEncoded.target.value = ''; }catch(_){ } }
        })();
        return false;
      }
      return attachPhoto(label, null);
    };
    const wrappedRemove = function(encoded){ return removePhoto(encoded, null); };
    try{ window.uploadTicketImage = wrappedUpload; setLexical('uploadTicketImage', wrappedUpload); }catch(_){ window.uploadTicketImage = wrappedUpload; }
    try{ window.uploadTicketImageV164 = wrappedUpload; setLexical('uploadTicketImageV164', wrappedUpload); }catch(_){ window.uploadTicketImageV164 = wrappedUpload; }
    try{ window.uploadTicketImageV202 = wrappedUpload; }catch(_){ }
    try{ window.removeTicketImage = wrappedRemove; setLexical('removeTicketImage', wrappedRemove); }catch(_){ window.removeTicketImage = wrappedRemove; }
    try{ window.removeTicketImageV164 = wrappedRemove; setLexical('removeTicketImageV164', wrappedRemove); }catch(_){ window.removeTicketImageV164 = wrappedRemove; }
    try{ window.removeTicketImageV202 = wrappedRemove; }catch(_){ }
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #summaryTiendaTicket .ticket-actions,#ceBudgetLiteTooltipV307 .ticket-actions{display:inline-flex!important;align-items:center!important;gap:8px!important;min-width:112px!important;justify-content:flex-end!important;white-space:nowrap!important;}
      #summaryTiendaTicket .ticket-actions input.ticket-file-input,#ceBudgetLiteTooltipV307 .ticket-actions input.ticket-file-input{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #summaryTiendaTicket .ticket-actions button.ce-v17-photo-icon,#ceBudgetLiteTooltipV307 .ticket-actions button.ce-v17-photo-icon{width:34px!important;min-width:34px!important;height:30px!important;min-height:30px!important;padding:2px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;font-size:16px!important;line-height:1!important;border-radius:8px!important;white-space:nowrap!important;pointer-events:auto!important;}
      #summaryTiendaTicket .ticket-actions img.ticket-thumb,#ceBudgetLiteTooltipV307 .ticket-actions img.ticket-thumb{width:36px!important;height:36px!important;object-fit:cover!important;border-radius:8px!important;display:inline-block!important;}
      #summaryTiendaTicket .ticket-actions .ce-v17-noimage,#ceBudgetLiteTooltipV307 .ticket-actions .ce-v17-noimage{font-size:12px!important;color:#64748b!important;white-space:nowrap!important;}
    `;
    document.head.appendChild(style);
  }
  function install(){ injectStyle(); wrapGlobals(); scheduleNormalize(30); }

  ['click','pointerup','touchend'].forEach(type => {
    window.addEventListener(type, handleActivation, {capture:true, passive:false});
    document.addEventListener(type, handleActivation, {capture:true, passive:false});
  });
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-loaded','controlevent:data-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30), true));
  window.addEventListener('controlevent:event-changed', () => setTimeout(install, 180), true);
  try{
    new MutationObserver(mutations => {
      for(const m of mutations){
        if(m.target?.id === 'summaryTiendaTicket' || m.target?.closest?.('#summaryTiendaTicket,#ceBudgetLiteTooltipV307')){ scheduleNormalize(80); break; }
      }
    }).observe(document.body, {childList:true, subtree:true});
  }catch(_){ }
  [0,160,700,1600].forEach(ms => setTimeout(install, ms));
  window.ControlEventV17CalculosFotos = {install, attachPhoto, removePhoto, clearLocal, imageForLabel, version:'v17_prod_calculos_fotos_documentos_style'};
})();
