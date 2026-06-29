/* ControlEvent v16_prod OPT3K - Resumen: fotos de TKxx directas + regreso discreto.
   No toca login, selector, /api/state, cálculos ni importes. */
(function(){
  'use strict';
  if(window.__ceV16Opt3KResumenFotosReposo) return;
  window.__ceV16Opt3KResumenFotosReposo = true;

  const VERSION = 'v16_opt_3k';
  const ROOT_ID = 'summaryTiendaTicket';
  const WRITE_SCOPE = 'ticket-image-v8-5-fix26';
  const $ = id => document.getElementById(id);
  const norm = v => String(v == null ? '' : v).trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const arr = v => Array.isArray(v) ? v : [];
  const obj = v => (v && typeof v === 'object' && !Array.isArray(v)) ? v : null;
  const metrics = window.ControlEventOpt3K = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    uploads: 0,
    deletes: 0,
    intercepted: 0,
    localPurges: 0,
    focusShields: 0,
    focusBudgetSkips: 0,
    lastAction: '',
    lastKey: '',
    lastError: ''
  };

  function stateRef(){
    try{ return window.ControlEventApp?.state || window.state || (typeof state !== 'undefined' ? state : {}) || {}; }catch(_){ return {}; }
  }
  function evId(){ return norm(stateRef().selectedEventId || $('selectedEvent')?.value || ''); }
  function ticketToken(label){ const m = up(label).match(/\bTK\d{1,3}\b/); return m ? m[0] : ''; }
  function baseLabel(label){ return norm(String(label || '').split('·')[0]); }
  function isReady(){
    const root = $(ROOT_ID);
    return !!(root && evId() && root.offsetParent !== null);
  }
  function stop(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); }catch(_){} }
  function decodeMaybe(v){
    const raw = norm(v);
    if(!raw) return '';
    try{ return decodeURIComponent(raw); }catch(_){ return raw; }
  }
  function labelFrom(target){
    const el = target?.closest?.('[data-ce-ticket-key],#summaryTiendaTicket .ce-opt3e-row,#summaryTiendaTicket .summary-item');
    const data = norm(el?.getAttribute?.('data-ce-ticket-key') || el?.dataset?.ceTicketKey || el?.dataset?.ceOpt3eKey || '');
    if(data) return decodeMaybe(data);
    const row = target?.closest?.('#summaryTiendaTicket .ce-opt3e-row,#summaryTiendaTicket .summary-item');
    const span = row?.querySelector?.('.ce-opt3e-label,.ce-hf10-label,:scope > span:first-child');
    let text = norm(span?.textContent || row?.textContent || '');
    text = text.replace(/ⓘ/g,'').replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*€\s*$/,'').replace(/\s+Sin imagen\s*$/i,'').trim();
    return baseLabel(text);
  }
  function candidates(label){
    const id = evId();
    const raw = norm(label);
    const clean = baseLabel(raw);
    const tk = ticketToken(raw);
    const out = [];
    const add = x => { x = norm(x); if(x && !out.includes(x)) out.push(x); };
    add(raw); if(id) add(`${id}|${raw}`);
    if(clean && clean !== raw){ add(clean); if(id) add(`${id}|${clean}`); }
    if(tk){ add(tk); if(id) add(`${id}|${tk}`); }
    return out;
  }
  function keyMatches(k, label){
    const id = evId(); const nk = up(k); const tk = ticketToken(label);
    if(candidates(label).some(c => up(c) === nk)) return true;
    if(tk && nk.includes(tk) && (!id || nk.startsWith(up(id + '|')))) return true;
    return false;
  }
  function imageUrlFromResponse(data){
    const img = data && data.image || {};
    return img.pathname || img.public_url || img.publicUrl || img.url || img.path || '';
  }
  function canonicalKey(label){
    const id = evId(); const raw = norm(label);
    if(id && raw.startsWith(id + '|')) return raw;
    return id ? `${id}|${raw}` : raw;
  }
  function ensureTicketImages(){
    const s = stateRef();
    if(!s.ticketImages || typeof s.ticketImages !== 'object' || Array.isArray(s.ticketImages)) s.ticketImages = {};
    return s.ticketImages;
  }
  function purgeObject(map, label){
    if(!map || typeof map !== 'object' || Array.isArray(map)) return 0;
    let n = 0;
    Object.keys(map).forEach(k => { if(keyMatches(k, label)){ delete map[k]; n++; } });
    return n;
  }
  function purgeArray(list, label){
    if(!Array.isArray(list)) return list;
    return list.filter(row => {
      const key = norm(row?.image_key || row?.key || row?.ticketKey || row?.ticket || row?.tk || row?.codigo || '');
      const txt = [key, row?.label, row?.url, row?.publicUrl, row?.public_url, row?.pathname, row?.path].map(norm).join('|');
      return !keyMatches(txt, label);
    });
  }
  function purgeLocal(label){
    const s = stateRef();
    let n = 0;
    n += purgeObject(s.ticketImages, label);
    n += purgeObject(s.ticketImagesByKey, label);
    n += purgeObject(s.ticketImageRefs, label);
    n += purgeObject(s.ticket_images, label);
    n += purgeObject(s.ce_ticket_images, label);
    if(Array.isArray(s.ticketImageRefs)){ const old=s.ticketImageRefs.length; s.ticketImageRefs = purgeArray(s.ticketImageRefs, label); n += old - s.ticketImageRefs.length; }
    if(Array.isArray(s.ticket_images)){ const old=s.ticket_images.length; s.ticket_images = purgeArray(s.ticket_images, label); n += old - s.ticket_images.length; }
    if(Array.isArray(s.ce_ticket_images)){ const old=s.ce_ticket_images.length; s.ce_ticket_images = purgeArray(s.ce_ticket_images, label); n += old - s.ce_ticket_images.length; }
    metrics.localPurges += n;
  }
  function storeLocal(label, url){
    const imgs = ensureTicketImages();
    const key = canonicalKey(label);
    if(url) imgs[key] = url;
    // Evita que una referencia antigua con el mismo TKxx resucite la imagen anterior.
    Object.keys(imgs).forEach(k => { if(k !== key && keyMatches(k, label)) delete imgs[k]; });
  }
  function clearCaches(){
    try{ window.ControlEventOpt3F?.clearCaches?.(); }catch(_){}
    try{ window.ControlEventOpt3F?.renderNow?.(true); }catch(_){}
    try{ setTimeout(() => window.ControlEventOpt3G?.markRows?.(), 80); }catch(_){}
  }
  function setPhotoBusy(){ window.__ceOpt3KPhotoBusyUntil = Date.now() + 3000; }
  function saveLocal(){ try{ if(typeof saveState === 'function') saveState(); }catch(_){} }
  async function deleteServer(label){
    const id = evId();
    const seen = new Set();
    for(const key of candidates(label)){
      const raw = key.startsWith(id + '|') ? key.slice(id.length + 1) : key;
      for(const k of [raw, key]){
        const kk = norm(k); if(!kk || seen.has(kk)) continue; seen.add(kk);
        try{
          await fetch(`/api/ticket-images?eventId=${encodeURIComponent(id)}&key=${encodeURIComponent(kk)}`, {
            method:'DELETE',
            headers:{'X-ControlEvent-Write-Scope':WRITE_SCOPE}
          });
        }catch(err){ metrics.lastError = String(err?.message || err || ''); }
      }
    }
  }
  async function removePhoto(label){
    if(!label || !evId()) return false;
    if(!confirm('¿Eliminar la foto asociada a este ticket/gasto?')) return false;
    metrics.deletes++; metrics.lastAction = 'delete'; metrics.lastKey = label;
    setPhotoBusy();
    purgeLocal(label);
    clearCaches();
    await deleteServer(label);
    purgeLocal(label);
    saveLocal();
    clearCaches();
    return false;
  }
  function fileToDataUrl(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagen no válida'));
        img.onload = () => {
          const max = 1400;
          let w = img.width || 1, h = img.height || 1;
          const r = Math.min(max / w, max / h, 1);
          w = Math.max(1, Math.round(w * r)); h = Math.max(1, Math.round(h * r));
          const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.84));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  function pickFile(){
    return new Promise(resolve => {
      const input = document.createElement('input'); input.type = 'file'; input.accept = 'image/*';
      input.onchange = () => resolve(input.files && input.files[0] || null);
      input.click();
    });
  }
  async function uploadPhoto(label){
    if(!label || !evId()) return false;
    const file = await pickFile();
    if(!file) return false;
    metrics.uploads++; metrics.lastAction = 'upload'; metrics.lastKey = label;
    setPhotoBusy();
    const dataUrl = await fileToDataUrl(file);
    purgeLocal(label);
    const res = await fetch('/api/ticket-images', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE},
      body:JSON.stringify({eventId:evId(), key:baseLabel(label), dataUrl})
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false){
      metrics.lastError = data.error || `HTTP ${res.status}`;
      alert('No se pudo guardar la foto: ' + metrics.lastError);
      clearCaches();
      return false;
    }
    storeLocal(label, imageUrlFromResponse(data) || dataUrl);
    saveLocal();
    clearCaches();
    return false;
  }
  function handleTicketAction(ev){
    if(!isReady()) return;
    const del = ev.target?.closest?.('#summaryTiendaTicket [data-ce-opt3k-delete],#summaryTiendaTicket button[title*="Eliminar"][onclick*="removeTicketImage"],#summaryTiendaTicket button[onclick*="removeTicketImage"]');
    const upb = ev.target?.closest?.('#summaryTiendaTicket [data-ce-opt3k-upload],#summaryTiendaTicket button[title*="Insertar"][onclick*="uploadTicketImage"],#summaryTiendaTicket button[onclick*="uploadTicketImage"]');
    const btn = del || upb;
    if(!btn) return;
    const label = labelFrom(btn);
    if(!label) return;
    metrics.intercepted++;
    stop(ev);
    if(del) removePhoto(label).catch(err => { metrics.lastError = String(err?.message || err || ''); alert('No se pudo eliminar la foto: ' + metrics.lastError); });
    else uploadPhoto(label).catch(err => { metrics.lastError = String(err?.message || err || ''); alert('No se pudo adjuntar la foto: ' + metrics.lastError); });
    return false;
  }
  function focusShield(){
    if(!isReady()) return;
    window.__ceOpt3KFocusShieldUntil = Date.now() + 2600;
    metrics.focusShields++;
    const root = $(ROOT_ID);
    if(root && root.dataset.ceOpt3eEventId === evId()){
      root.classList.add('ce-opt3k-focus-stable');
      setTimeout(() => root.classList.remove('ce-opt3k-focus-stable'), 2800);
    }
  }
  function patchRenderBudgetFocusShield(){
    let old = null;
    try{ old = window.renderBudget || eval('typeof renderBudget === "function" ? renderBudget : null'); }catch(_){ old = window.renderBudget || null; }
    if(!old || old.__ceOpt3KWrapped) return;
    const wrapped = function(){
      const root = $(ROOT_ID);
      const shield = Number(window.__ceOpt3KFocusShieldUntil || 0) > Date.now();
      const stable = !!(root && root.dataset.ceOpt3eEventId === evId() && root.querySelector('.ce-opt3e-row,.summary-item'));
      const photoBusy = Number(window.__ceOpt3KPhotoBusyUntil || 0) > Date.now();
      if(shield && stable && !photoBusy){
        metrics.focusBudgetSkips++;
        try{ window.ControlEventOpt3F?.renderNow?.(false); }catch(_){}
        return undefined;
      }
      return old.apply(this, arguments);
    };
    wrapped.__ceOpt3KWrapped = true;
    wrapped.__ceOpt3KOld = old;
    try{ window.renderBudget = wrapped; renderBudget = wrapped; }catch(_){ window.renderBudget = wrapped; }
  }
  function injectStyle(){
    if($('ceOpt3KStyle')) return;
    const st = document.createElement('style'); st.id = 'ceOpt3KStyle';
    st.textContent = `
      #summaryTiendaTicket.ce-opt3k-focus-stable{visibility:visible!important;contain:layout paint!important;}
      #summaryTiendaTicket.ce-opt3k-focus-stable .summary-item,
      #summaryTiendaTicket.ce-opt3k-focus-stable .ce-opt3e-row{transition:none!important;animation:none!important;}
      #summaryTiendaTicket .ticket-actions button[data-ce-opt3k-upload],
      #summaryTiendaTicket .ticket-actions button[data-ce-opt3k-delete]{font-size:20px!important;min-width:42px!important;min-height:42px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;}
      #ceV310PhotoViewer .ce-v310-photo-close,
      #ceTicketImageModalV225 .ce-ticket-modal-v225-close,
      #ceTicketModalV234 .ce-ticket-modal-v225-close,
      #ceTicketModalV234 button[data-close],
      #ceTicketModalV234 button[title*="Cerrar"]{
        position:fixed!important;right:24px!important;bottom:24px!important;top:auto!important;left:auto!important;z-index:2147483647!important;
        min-width:94px!important;min-height:44px!important;border-radius:12px!important;background:#fff!important;color:#0f172a!important;border:2px solid #0f172a!important;
        box-shadow:0 12px 32px rgba(15,23,42,.32)!important;font-weight:950!important;pointer-events:auto!important;
      }
      #ceV310PhotoViewer .ce-v310-photo-head{justify-content:center!important;padding-right:0!important;}
      #ceV310PhotoViewer .ce-v310-photo-head .ce-v310-photo-close{margin:0!important;}
      #ceV310PhotoViewer img{max-height:86vh!important;}
    `;
    document.head.appendChild(st);
  }
  function install(){ injectStyle(); patchRenderBudgetFocusShield(); }

  document.addEventListener('click', handleTicketAction, {capture:true, passive:false});
  document.addEventListener('visibilitychange', () => { if(!document.hidden) focusShield(); }, true);
  window.addEventListener('focus', focusShield, true);
  ['controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted','controlevent:event-changed','controlevent:opt1-event-stable'].forEach(type => window.addEventListener(type, () => setTimeout(install, 120), true));
  document.addEventListener('DOMContentLoaded', () => setTimeout(install, 120), {once:true});
  window.addEventListener('load', () => setTimeout(install, 160), {once:true});
  setTimeout(install, 80);
  window.ControlEventOpt3K = Object.assign(metrics, {install, purgeLocal, clearCaches, removePhoto, uploadPhoto, focusShield});
})();
