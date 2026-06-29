/* ControlEvent v16_prod OPT3Q - Resumen fotos TKxx: puente mínimo.
   Base: OPT3J. No pinta filas, no crea botones, no toca login/selector/state.
   Solo corrige las funciones originales uploadTicketImage/removeTicketImage para que usen
   el endpoint de fotos con cabecera válida, sustitución por TKxx y recarga limpia desde servidor. */
(function(){
  'use strict';
  if(window.__ceV16Opt3QResumenFotosMinimo) return;
  window.__ceV16Opt3QResumenFotosMinimo = true;

  const SCOPE = 'ticket-image-v8-5-fix23';
  const ROOT_ID = 'summaryTiendaTicket';
  const metrics = window.ControlEventOpt3Q = {version:'v16_opt_3q', deletes:0, uploads:0, reloads:0, busy:false, lastLabel:'', lastError:'', installedAt:new Date().toISOString()};
  const $ = id => document.getElementById(id);
  const clean = v => String(v == null ? '' : v).trim();
  const norm = v => clean(v).replace(/\s+/g,' ');
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const stateRef = () => { try{ return window.ControlEventApp?.state || window.state || (typeof state !== 'undefined' ? state : {}) || {}; }catch(_){ return {}; } };
  const eventId = () => clean(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const decode = value => { try{ return decodeURIComponent(String(value || '')); }catch(_){ return String(value || ''); } };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  function ticketToken(value){
    const m = up(value).match(/(?:^|[^A-Z0-9])(?:TK|TICKET)\s*[-_]*\s*0*([0-9]{1,4})(?:[^A-Z0-9]|$)/);
    return m ? 'TK' + String(Number(m[1])).padStart(2,'0') : '';
  }
  function srcOf(v){
    if(!v) return '';
    if(typeof v === 'string') return clean(v);
    if(typeof v === 'object') return clean(v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || v.src || '');
    return '';
  }
  function bust(src){
    src = clean(src);
    if(!src || /^data:image\//i.test(src)) return src;
    return src + (src.includes('?') ? '&' : '?') + 'ceImg=' + Date.now();
  }
  function imageKey(img){ return clean(img?.key || img?.image_key || img?.id || ''); }
  function imageLabel(img){
    const k = imageKey(img);
    if(k.includes('|')) return k.split('|').slice(1).join('|');
    return clean(img?.label || k);
  }
  function matchesLabelKey(k, label){
    const ev = eventId();
    const raw = clean(k); const lab = clean(label);
    if(!raw || !lab) return false;
    const noEv = ev && raw.startsWith(ev + '|') ? raw.slice(ev.length + 1) : raw;
    const labNoEv = ev && lab.startsWith(ev + '|') ? lab.slice(ev.length + 1) : lab;
    const tk = ticketToken(lab);
    return raw === lab || raw === ev + '|' + labNoEv || noEv === labNoEv || (!!tk && ticketToken(raw) === tk);
  }
  function purgeLocal(label){
    const s = stateRef();
    ['ticketImages','ticketImageRefs','ticketImagesByKey'].forEach(name => {
      const bag = s[name];
      if(!bag || typeof bag !== 'object' || Array.isArray(bag)) return;
      Object.keys(bag).forEach(k => { if(matchesLabelKey(k, label)) delete bag[k]; });
    });
    try{ window.ControlEventOpt3F?.clearCaches?.(); }catch(_){ }
  }
  function rebuildLocalFromServer(images){
    const s = stateRef();
    if(!s.ticketImages || typeof s.ticketImages !== 'object' || Array.isArray(s.ticketImages)) s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object' || Array.isArray(s.ticketImageRefs)) s.ticketImageRefs = {};
    const ev = eventId();
    // Estado event-scoped: limpiamos solo fotos del evento actual para evitar que quede una miniatura vieja.
    Object.keys(s.ticketImages).forEach(k => { if(!ev || k.startsWith(ev + '|') || ticketToken(k)) delete s.ticketImages[k]; });
    Object.keys(s.ticketImageRefs).forEach(k => { if(!ev || k.startsWith(ev + '|') || ticketToken(k)) delete s.ticketImageRefs[k]; });
    (Array.isArray(images) ? images : []).forEach(img => {
      const k = imageKey(img); const src = bust(srcOf(img));
      if(!k || !src) return;
      s.ticketImages[k] = src;
      s.ticketImageRefs[k] = {key:k, url:src, pathname:src, label:imageLabel(img), updated_at:img.updated_at || img.created_at || new Date().toISOString()};
    });
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    try{ window.ControlEventOpt3F?.clearCaches?.(); }catch(_){ }
  }
  async function reloadImagesAndRender(){
    const ev = eventId(); if(!ev) return;
    const res = await fetch('/api/ticket-images?eventId=' + encodeURIComponent(ev) + '&_=' + Date.now(), {cache:'no-store'});
    const data = await res.json().catch(() => ({}));
    if(res.ok && data.ok && Array.isArray(data.images)) rebuildLocalFromServer(data.images);
    metrics.reloads++;
    try{ window.ControlEventOpt3F?.renderNow?.(true); }
    catch(_){ try{ if(typeof renderBudget === 'function') renderBudget(); }catch(__){ try{ if(typeof render === 'function') render(); }catch(___){ } } }
  }
  function compress(file){
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la foto'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagen no válida'));
        img.onload = () => {
          const max = 1400; let w = img.width, h = img.height;
          const ratio = Math.min(max / w, max / h, 1);
          w = Math.max(1, Math.round(w * ratio)); h = Math.max(1, Math.round(h * ratio));
          const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function labelFromButton(btn){
    const onclick = btn?.getAttribute?.('onclick') || '';
    const m = onclick.match(/['\"]([^'\"]+)['\"]/);
    if(m) return decode(m[1]);
    const row = btn?.closest?.('#summaryTiendaTicket .summary-item,#summaryTiendaTicket .ce-opt3e-row,#summaryTiendaTicket .rowline');
    return norm(row?.dataset?.ceOpt3eKey || row?.__ceOpt3eRow?.key || row?.querySelector?.('.ce-opt3e-label,.ce-hf10-label')?.textContent || '');
  }
  async function apiDelete(label){
    const res = await fetch('/api/ticket-images', {
      method:'DELETE',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE},
      body:JSON.stringify({eventId:eventId(), key:label, tk:ticketToken(label)})
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || data.message || 'No se pudo eliminar la foto');
    return data;
  }
  async function apiUpload(label, dataUrl){
    const res = await fetch('/api/ticket-images', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE},
      body:JSON.stringify({eventId:eventId(), key:label, tk:ticketToken(label), dataUrl, replace:true})
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false || !data.image) throw new Error(data.error || data.message || 'No se pudo adjuntar la foto');
    return data;
  }
  function setBusy(value){
    metrics.busy = !!value;
    const root = $(ROOT_ID); if(root) root.classList.toggle('ce-opt3q-busy', !!value);
  }
  async function remove(labelOrEncoded){
    const label = decode(labelOrEncoded || '');
    if(!label || !eventId()) return false;
    if(metrics.busy) return false;
    if(!confirm('¿Eliminar la foto asociada a este ticket/gasto?')) return false;
    setBusy(true); metrics.lastLabel = label; metrics.lastError = '';
    try{
      await apiDelete(label);
      purgeLocal(label);
      await reloadImagesAndRender();
      metrics.deletes++;
    }catch(err){
      metrics.lastError = err?.message || String(err);
      console.error('[v16_opt_3q] eliminar foto', err);
      alert('No se pudo eliminar la foto: ' + metrics.lastError);
    }finally{ setBusy(false); }
    return false;
  }
  async function uploadWithFile(labelOrEncoded, file){
    const label = decode(labelOrEncoded || '');
    if(!label || !eventId() || !file || metrics.busy) return false;
    setBusy(true); metrics.lastLabel = label; metrics.lastError = '';
    try{
      const dataUrl = await compress(file);
      await apiUpload(label, dataUrl);
      await reloadImagesAndRender();
      metrics.uploads++;
    }catch(err){
      metrics.lastError = err?.message || String(err);
      console.error('[v16_opt_3q] adjuntar foto', err);
      alert('No se pudo adjuntar la foto: ' + metrics.lastError);
    }finally{ setBusy(false); }
    return false;
  }
  function upload(evOrEncoded, maybeEncoded){
    let encoded = typeof evOrEncoded === 'string' ? evOrEncoded : maybeEncoded;
    if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){
      const file = evOrEncoded.target.files && evOrEncoded.target.files[0];
      return uploadWithFile(encoded || '', file);
    }
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => { const file = input.files && input.files[0]; if(file) uploadWithFile(encoded || '', file); };
    input.click();
    return false;
  }
  function installGlobals(){
    try{ window.uploadTicketImage = upload; window.uploadTicketImageV164 = upload; window.uploadTicketImageV202 = upload; }catch(_){ }
    try{ window.removeTicketImage = remove; window.removeTicketImageV164 = remove; window.removeTicketImageV202 = remove; }catch(_){ }
    try{ uploadTicketImage = upload; uploadTicketImageV164 = upload; uploadTicketImageV202 = upload; }catch(_){ }
    try{ removeTicketImage = remove; removeTicketImageV164 = remove; removeTicketImageV202 = remove; }catch(_){ }
  }
  function onClick(ev){
    const root = $(ROOT_ID); if(!root || !root.contains(ev.target)) return;
    const btn = ev.target.closest?.('button[onclick*="removeTicketImage"],button[title*="Eliminar foto"],button[aria-label*="Eliminar foto"]');
    if(btn){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); return remove(labelFromButton(btn)); }
  }
  function closeCss(){
    if($('ceOpt3QCloseStyle')) return;
    const st = document.createElement('style'); st.id = 'ceOpt3QCloseStyle';
    st.textContent = `
      #summaryTiendaTicket.ce-opt3q-busy .ticket-actions button{opacity:.55!important;cursor:wait!important;}
      #ceV40TicketPhotoModal .ce-v40-modal-close,
      #ceV310PhotoViewer .ce-v310-photo-close,
      #ceV401PcPhotoModal .ce-v401-pc-modal-close,
      #ceTicketModalV234 button[data-close],
      #ceTicketImageModalV225 button[data-close]{
        position:fixed!important;right:24px!important;bottom:24px!important;left:auto!important;top:auto!important;z-index:2147483647!important;
      }
    `;
    document.head.appendChild(st);
  }
  function fixCloseInline(){
    document.querySelectorAll('#ceV40TicketPhotoModal .ce-v40-modal-close,#ceV310PhotoViewer .ce-v310-photo-close,#ceV401PcPhotoModal .ce-v401-pc-modal-close,#ceTicketModalV234 button,#ceTicketImageModalV225 button').forEach(btn => {
      const txt = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
      if(!txt.includes('cerrar')) return;
      btn.style.setProperty('position','fixed','important');
      btn.style.setProperty('right','24px','important');
      btn.style.setProperty('bottom','24px','important');
      btn.style.setProperty('left','auto','important');
      btn.style.setProperty('top','auto','important');
      btn.style.setProperty('z-index','2147483647','important');
    });
  }
  document.addEventListener('click', onClick, {capture:true, passive:false});
  const mo = new MutationObserver(() => setTimeout(fixCloseInline, 30));
  try{ mo.observe(document.body || document.documentElement, {childList:true, subtree:true}); }catch(_){ }
  ['DOMContentLoaded','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted','controlevent:rendered','focus'].forEach(name => {
    const target = name === 'DOMContentLoaded' ? document : window;
    target.addEventListener(name, () => { closeCss(); installGlobals(); setTimeout(fixCloseInline, 50); }, true);
  });
  closeCss(); installGlobals(); setTimeout(fixCloseInline, 80);
})();
