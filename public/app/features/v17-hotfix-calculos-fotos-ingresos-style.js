/* ControlEvent v17_prod - hotfix acotado fotos en Calculos por tienda y ticket.
   Objetivo: mismo comportamiento practico que INGRESOS/Documentos: input efimero,
   sin reutilizar inputs antiguos, sin renderBudget completo y sin hidrataciones que hagan parpadear.
   No cambia version. */
(function(){
  'use strict';
  const INSTALLED = '__ceV17CalculosFotosIngresosStyleV2';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV17CalculosFotosStyleV2';
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? '').trim();
  const up = value => norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  const isDataUrl = value => /^data:image\//i.test(String(value || ''));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stop = ev => { try{ ev?.preventDefault?.(); ev?.stopPropagation?.(); ev?.stopImmediatePropagation?.(); }catch(_){ } return false; };

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
  function eventId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return norm(ev.id); }catch(_){ }
    try{ const ev = typeof window.selectedEvent === 'function' ? window.selectedEvent() : null; if(ev?.id) return norm(ev.id); }catch(_){ }
    return norm(st().selectedEventId || $('selectedEvent')?.value || '');
  }
  function currentEvent(){
    const id = eventId();
    return arr('eventos').find(ev => String(ev?.id || '') === id) || {};
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
    if(!s.ticketImagesByKey || typeof s.ticketImagesByKey !== 'object') s.ticketImagesByKey = {};
    return {images:s.ticketImages, refs:s.ticketImageRefs, byKey:s.ticketImagesByKey};
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
  function valueToSrc(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.src || '');
    return '';
  }
  function imageKeyRest(key){
    const ev = eventId();
    const k = norm(key);
    return ev && k.startsWith(ev + '|') ? k.slice(ev.length + 1) : k;
  }
  function sameEventKey(key, value){
    const ev = eventId();
    const k = norm(key);
    if(!ev) return false;
    if(k.startsWith(ev + '|')) return true;
    const src = valueToSrc(value);
    const m = src.match(/\/ticket-images\/([^\/?#]+)\//i);
    return !!(m && decodeURIComponent(m[1]) === ev);
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
      const store = parts[0];
      const second = parts.slice(1).join(' | ');
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
  function shouldPurgeKey(label, key, value){
    const ev = eventId();
    const clean = cleanLabel(label);
    const tk = ticketToken(clean);
    const variants = new Set(imageVariants(clean));
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
    const bags = stores();
    [bags.images, bags.refs, bags.byKey].forEach(bag => {
      Object.keys(bag || {}).forEach(key => {
        if(shouldPurgeKey(label, key, bag[key])){ try{ delete bag[key]; }catch(_){ } }
      });
    });
  }
  function putLocal(label, src, ref){
    if(!src) return;
    const {images, refs, byKey} = stores();
    const clean = cleanLabel(label);
    const pkey = primaryKey(clean);
    const tk = ticketToken(clean);
    const keys = [pkey];
    // Se mantiene un alias por TKxx porque otros visores antiguos buscan por ticket.
    if(tk && eventId()) keys.push(`${eventId()}|${tk}`);
    keys.forEach(key => {
      if(!key) return;
      images[key] = src;
      refs[key] = ref && typeof ref === 'object' ? {...ref, key, url:src, pathname:ref.pathname || ref.url || src} : {key, url:src, pathname:src};
      byKey[key] = refs[key];
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
  function rowLabelFromNode(node){
    const row = node?.closest?.('.summary-item') || node;
    const first = row?.querySelector?.(':scope > span:first-child');
    return norm(row?.dataset?.ceTicketLabel || first?.textContent || '').replace(/\s*ⓘ\s*$/,'').trim();
  }
  function setBusy(label, on){
    const key = cleanLabel(label);
    if(!key) return;
    if(on) busy.add(key); else busy.delete(key);
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => {
      const rowLabel = cleanLabel(rowLabelFromNode(row));
      if(rowLabel !== key) return;
      row.querySelectorAll('.ticket-actions button').forEach(btn => { try{ btn.disabled = !!on; btn.style.pointerEvents = on ? 'none' : ''; }catch(_){ } });
    });
  }
  function iconizeButton(btn, action){
    if(!btn) return;
    if(action === 'attach'){
      btn.textContent = '📎';
      btn.title = 'Adjuntar foto';
      btn.setAttribute('aria-label', 'Adjuntar foto');
      btn.classList.add('ce-v17-photo-icon');
    }else if(action === 'remove'){
      btn.textContent = '🗑️';
      btn.title = 'Eliminar foto';
      btn.setAttribute('aria-label', 'Eliminar foto');
      btn.classList.add('ce-v17-photo-icon');
    }
  }
  function repaintRowDom(label, src){
    const key = cleanLabel(label);
    document.querySelectorAll('#summaryTiendaTicket .summary-item,#ceBudgetLiteTooltipV307 .summary-item').forEach(row => {
      const rowLabel = cleanLabel(rowLabelFromNode(row));
      if(rowLabel !== key) return;
      row.dataset.ceTicketLabel = key;
      const actions = row.querySelector('.ticket-actions');
      if(!actions) return;
      actions.querySelectorAll('.hint').forEach(el => { if(/Sin imagen/i.test(el.textContent || '')) el.remove(); });
      actions.querySelectorAll('button').forEach(btn => {
        const txt = up((btn.textContent || '') + ' ' + (btn.title || '') + ' ' + (btn.getAttribute('aria-label') || '') + ' ' + (btn.getAttribute('onclick') || ''));
        if(/REMOVETICKETIMAGE|ELIMINAR|BORRAR|🗑/.test(txt)) iconizeButton(btn, 'remove');
        else if(/UPLOADTICKETIMAGE|ADJUNTAR|INSERTAR|SUBIR|📎/.test(txt)) iconizeButton(btn, 'attach');
      });
      let img = actions.querySelector('img.ticket-thumb');
      if(src){
        if(!img){ img = document.createElement('img'); img.className = 'ticket-thumb'; img.alt = 'ticket'; actions.appendChild(img); }
        if(img.src !== src) img.src = src;
        img.style.display = 'inline-block';
        let del = Array.from(actions.querySelectorAll('button')).find(btn => /REMOVETICKETIMAGE|ELIMINAR|BORRAR|🗑/.test(up((btn.textContent || '') + ' ' + (btn.title || '') + ' ' + (btn.getAttribute('onclick') || ''))));
        if(!del){
          del = document.createElement('button');
          del.type = 'button'; del.className = 'outline small ce-v17-photo-icon';
          del.setAttribute('onclick', `removeTicketImage('${encodeURIComponent(key)}'); return false;`);
          actions.appendChild(del);
        }
        iconizeButton(del, 'remove');
      } else {
        if(img) img.remove();
        actions.querySelectorAll('button').forEach(btn => {
          const txt = up((btn.textContent || '') + ' ' + (btn.title || '') + ' ' + (btn.getAttribute('onclick') || ''));
          if(/REMOVETICKETIMAGE|ELIMINAR|BORRAR|🗑/.test(txt)) btn.remove();
          else if(/UPLOADTICKETIMAGE|ADJUNTAR|INSERTAR|SUBIR|📎/.test(txt)) iconizeButton(btn, 'attach');
        });
        if(!actions.querySelector('.hint')){
          const span = document.createElement('span'); span.className = 'hint'; span.textContent = 'Sin imagen'; actions.appendChild(span);
        }
      }
    });
  }
  function quietRefresh(label, src, scroll){
    // No renderBudget(): evita que Resumen parpadee y que los scripts antiguos alternen texto/icono.
    repaintRowDom(label, src || '');
    restoreScroll(scroll);
    [50,180,420].forEach(ms => setTimeout(() => { repaintRowDom(label, src || ''); restoreScroll(scroll); }, ms));
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
  function xhrJson(url, options = {}){
    return new Promise((resolve, reject) => {
      try{
        const xhr = new XMLHttpRequest();
        xhr.open(options.method || 'GET', url, true);
        xhr.setRequestHeader('X-ControlEvent-Write-Scope', 'ticket-image-v8-5-fix26');
        if(options.body) xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Cache-Control', 'no-cache');
        xhr.onload = () => {
          let payload = {};
          try{ payload = xhr.responseText ? JSON.parse(xhr.responseText) : {}; }catch(_){ payload = {}; }
          if(xhr.status >= 200 && xhr.status < 300) resolve(payload);
          else reject(new Error(payload.error || payload.message || `HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error('Error de red al escribir la foto.'));
        xhr.send(options.body || null);
      }catch(error){ reject(error); }
    });
  }
  async function uploadServer(label, src){
    const ev = eventId();
    const key = keyOnly(label);
    if(!ev || !key || !isDataUrl(src)) throw new Error('Falta evento, ticket o imagen.');
    const payload = await xhrJson('/api/ticket-images', {
      method:'POST',
      body:JSON.stringify({eventId:ev, key, dataUrl:src})
    });
    if(!payload.ok || !payload.image) throw new Error(payload.error || payload.message || 'No se pudo guardar la foto en servidor.');
    const image = payload.image || {};
    const savedUrl = valueToSrc(image) || src;
    clearLocal(label);
    putLocal(label, savedUrl, image);
    if(image.key && image.key !== primaryKey(label)){
      const {images, refs, byKey} = stores();
      images[image.key] = savedUrl;
      refs[image.key] = {...image, key:image.key, url:savedUrl, pathname:image.pathname || savedUrl};
      byKey[image.key] = refs[image.key];
    }
    return savedUrl;
  }
  async function deleteServer(label){
    const ev = eventId();
    const key = keyOnly(label);
    if(!ev || !key) return {ok:true};
    return xhrJson(`/api/ticket-images?eventId=${encodeURIComponent(ev)}&key=${encodeURIComponent(key)}`, {method:'DELETE'});
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
    const scroll = captureScroll();
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
      try{
        const file = input.files && input.files[0];
        if(!file) return;
        if(file.type && !/^image\//i.test(file.type)){ alert('Selecciona una imagen para el ticket.'); return; }
        setBusy(label, true);
        const src = await compressImageFile(file);
        // Purga local y servidor antes de la subida para que no sobreviva ningun alias TKxx antiguo.
        clearLocal(label);
        putLocal(label, src);
        quietRefresh(label, src, scroll);
        await deleteServer(label);
        clearLocal(label);
        putLocal(label, src);
        quietRefresh(label, src, scroll);
        const url = await uploadServer(label, src);
        quietRefresh(label, url, scroll);
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
      clearLocal(label);
      quietRefresh(label, '', scroll);
      await deleteServer(label);
      clearLocal(label);
      quietRefresh(label, '', scroll);
    }catch(error){
      alert('No se pudo eliminar la foto. ' + (error?.message || error));
      restoreScroll(scroll);
    }finally{
      setBusy(label, false);
    }
    return false;
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
            clearLocal(clean); putLocal(clean, src); quietRefresh(clean, src, scroll);
            await deleteServer(clean);
            clearLocal(clean); putLocal(clean, src); quietRefresh(clean, src, scroll);
            const url = await uploadServer(clean, src); quietRefresh(clean, url, scroll);
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
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #summaryTiendaTicket .ticket-actions button.ce-v17-photo-icon,
      #ceBudgetLiteTooltipV307 .ticket-actions button.ce-v17-photo-icon{
        width:34px!important;min-width:34px!important;height:30px!important;min-height:30px!important;
        padding:2px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;
        font-size:16px!important;line-height:1!important;border-radius:8px!important;white-space:nowrap!important;
      }
      #summaryTiendaTicket .ticket-actions,
      #ceBudgetLiteTooltipV307 .ticket-actions{display:inline-flex!important;align-items:center!important;gap:8px!important;min-width:82px!important;}
      #summaryTiendaTicket .ticket-actions img.ticket-thumb,
      #ceBudgetLiteTooltipV307 .ticket-actions img.ticket-thumb{width:36px!important;height:36px!important;object-fit:cover!important;border-radius:8px!important;}
    `;
    document.head.appendChild(style);
  }
  function normalizeVisibleButtons(){
    document.querySelectorAll('#summaryTiendaTicket .ticket-actions button,#ceBudgetLiteTooltipV307 .ticket-actions button').forEach(btn => {
      const action = actionFromControl(btn);
      if(action) iconizeButton(btn, action);
    });
  }
  function install(){ injectStyle(); wrapGlobals(); normalizeVisibleButtons(); }

  window.addEventListener('click', handleActivation, true);
  document.addEventListener('click', handleActivation, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  try{ new MutationObserver(() => setTimeout(normalizeVisibleButtons, 40)).observe(document.body, {childList:true, subtree:true}); }catch(_){ }
  [0,80,240,700,1500,3000].forEach(ms => setTimeout(install, ms));
  window.ControlEventV17CalculosFotos = {install, attachPhoto, removePhoto, clearLocal, imageVariants, version:'v17_prod_calculos_fotos_sin_render'};
})();
