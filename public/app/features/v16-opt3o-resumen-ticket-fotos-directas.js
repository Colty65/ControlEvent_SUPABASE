/* ControlEvent v16_prod OPT3O - Resumen: fotos TKxx directas y sin capa antigua.
   Base estable OPT3L/OPT3J. No toca login, selector, /api/state, compras, ingresos,
   donaciones, documentos, gráficas ni AVANCE. */
(function(){
  'use strict';
  if(window.__ceV16Opt3OTicketFotosDirectas) return;
  window.__ceV16Opt3OTicketFotosDirectas = true;

  const ROOT_ID = 'summaryTiendaTicket';
  const SCOPE = 'ticket-image-v8-5-fix26';
  const DB_NAME = 'controlevent_ticket_images_v225';
  const DB_STORE = 'images';
  const metrics = window.ControlEventOpt3O = {
    version:'v16_opt_3o', normalized:0, deletes:0, uploads:0, idbPurges:0,
    busy:false, lastAction:'', lastLabel:'', lastError:'', installedAt:new Date().toISOString()
  };

  const $ = id => document.getElementById(id);
  const norm = v => String(v == null ? '' : v).trim();
  const plain = v => norm(v).replace(/\s+/g,' ');
  const up = v => plain(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const stateRef = () => {
    try{ if(window.ControlEventApp && window.ControlEventApp.state) return window.ControlEventApp.state; }catch(_){ }
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  };
  const eventId = () => plain(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const ticketToken = value => {
    const m = up(value).match(/\bTK\s*0*([0-9]{1,4})\b/);
    return m ? 'TK' + String(Number(m[1])).padStart(2,'0') : '';
  };
  function esc(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function safeDecode(s){ try{ return decodeURIComponent(String(s||'')); }catch(_){ return String(s||''); } }
  function fullKey(label){ const ev = eventId(); label = plain(label); return ev && label && !label.startsWith(ev+'|') ? ev+'|'+label : label; }
  function srcOf(v){
    if(!v) return '';
    if(typeof v === 'string') return plain(v);
    if(typeof v === 'object') return plain(v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || v.src || '');
    return '';
  }
  function withBust(src){ src = plain(src); if(!src || /^data:image\//i.test(src)) return src; return src + (src.includes('?')?'&':'?') + 'ceLocal=' + Date.now(); }
  function root(){ return $(ROOT_ID); }
  function rowFrom(el){ return el?.closest?.(`#${ROOT_ID} .summary-item,#${ROOT_ID} .ce-opt3e-row,#${ROOT_ID} .rowline`); }
  function cleanRowText(text){
    return plain(text).replace(/ⓘ/g,'').replace(/\s+Sin imagen\s*$/i,'').replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*€\s*$/,'').trim();
  }
  function labelFromRow(row){
    if(!row) return '';
    if(row.dataset?.ceOpt3oLabel) return plain(row.dataset.ceOpt3oLabel);
    if(row.dataset?.ceOpt3eKey) return plain(row.dataset.ceOpt3eKey);
    if(row.__ceOpt3eRow?.key) return plain(row.__ceOpt3eRow.key);
    const first = row.querySelector('.ce-opt3e-label,.ce-hf10-label,:scope > span:first-child') || row.querySelector('span');
    let txt = cleanRowText(first?.textContent || row.textContent || '');
    const tk = ticketToken(txt);
    if(tk){
      const store = plain(txt.split('|')[0] || '');
      return store ? `${store} | ${tk}` : tk;
    }
    return txt;
  }
  function keyMatches(key, label, tkHint){
    key = plain(key); label = plain(label); const tk = ticketToken(tkHint) || ticketToken(label);
    if(!key && !label && !tk) return false;
    const ev = eventId();
    const keyNoEv = ev && key.startsWith(ev+'|') ? key.slice(ev.length+1) : key;
    const labelNoEv = ev && label.startsWith(ev+'|') ? label.slice(ev.length+1) : label;
    if(key && label && (key === label || key === fullKey(label) || keyNoEv === labelNoEv)) return true;
    return !!(tk && (ticketToken(key) === tk || ticketToken(keyNoEv) === tk));
  }
  function currentImageFor(label){
    const s = stateRef(); const tk = ticketToken(label);
    for(const bagName of ['ticketImages','ticketImageRefs','ticketImagesByKey']){
      const bag = s[bagName]; if(!bag || typeof bag !== 'object') continue;
      for(const [k,v] of Object.entries(bag)) if(keyMatches(k,label,tk)){ const src = srcOf(v); if(src) return src; }
    }
    return '';
  }
  function purgeLocal(label){
    const s = stateRef(); const tk = ticketToken(label);
    for(const name of ['ticketImages','ticketImageRefs','ticketImagesByKey']){
      const bag = s[name]; if(!bag || typeof bag !== 'object' || Array.isArray(bag)) continue;
      for(const k of Object.keys(bag)) if(keyMatches(k,label,tk)) delete bag[k];
    }
    for(const name of ['ticket_images','ce_ticket_images']){
      if(!Array.isArray(s[name])) continue;
      s[name] = s[name].filter(row => !keyMatches(row?.image_key || row?.key || row?.ticket || row?.tk || row?.codigo || row?.label, label, tk));
    }
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
  }
  function putLocal(label, src){
    const s = stateRef(); const k = fullKey(label);
    if(!s.ticketImages || typeof s.ticketImages !== 'object' || Array.isArray(s.ticketImages)) s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object' || Array.isArray(s.ticketImageRefs)) s.ticketImageRefs = {};
    s.ticketImages[k] = src;
    s.ticketImageRefs[k] = {key:k,url:src,pathname:src,updated_at:new Date().toISOString()};
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
  }
  function idbOpen(){
    return new Promise(resolve => {
      if(!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open(DB_NAME,1);
      req.onerror = () => resolve(null);
      req.onsuccess = () => resolve(req.result || null);
      req.onupgradeneeded = () => { try{ req.result.createObjectStore(DB_STORE); }catch(_){ } };
    });
  }
  async function purgeIdb(label){
    const tk = ticketToken(label); const db = await idbOpen(); if(!db) return 0;
    return await new Promise(resolve => {
      let count = 0;
      try{
        const tx = db.transaction(DB_STORE,'readwrite'); const st = tx.objectStore(DB_STORE); const req = st.openCursor();
        req.onsuccess = () => { const cur = req.result; if(!cur) return; if(keyMatches(cur.key,label,tk)){ try{ cur.delete(); count++; }catch(_){ } } cur.continue(); };
        tx.oncomplete = () => { metrics.idbPurges += count; resolve(count); };
        tx.onerror = () => resolve(count);
      }catch(_){ resolve(count); }
    });
  }
  async function syncImages(){
    const ev = eventId(); if(!ev) return {};
    const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(ev)}&_=${Date.now()}`, {cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || data.message || `No se pudieron leer fotos (${res.status})`);
    const images = data.images || {};
    const s = stateRef();
    for(const name of ['ticketImages','ticketImageRefs','ticketImagesByKey']){
      if(!s[name] || typeof s[name] !== 'object' || Array.isArray(s[name])) s[name] = {};
      for(const k of Object.keys(s[name])) if(plain(k).startsWith(ev+'|')) delete s[name][k];
    }
    for(const [k,v] of Object.entries(images)){
      const src = srcOf(v); if(!src) continue;
      s.ticketImages[k] = src;
      s.ticketImageRefs[k] = typeof v === 'object' ? v : {key:k,url:src,pathname:src};
    }
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    return images;
  }
  function setActions(row, label, src){
    if(!row || !label || !ticketToken(label)) return false;
    let holder = row.querySelector('.ticket-actions');
    if(!holder){
      const right = row.children[row.children.length - 1] || row;
      holder = document.createElement('span'); holder.className = 'ticket-actions'; right.appendChild(holder);
    }
    src = src || currentImageFor(label) || '';
    const sig = `${label}|${src}`;
    if(holder.dataset.ceOpt3oSig === sig) return false;
    holder.dataset.ceOpt3oSig = sig;
    holder.classList.add('ce-opt3o-actions');
    holder.innerHTML = `<button type="button" class="outline small ce-opt3o-upload" title="Adjuntar o sustituir foto" data-ce-opt3o-label="${esc(label)}">📎</button>` +
      (src ? `<img class="ticket-thumb ce-opt3o-thumb" src="${esc(src)}" alt="ticket" data-ce-opt3o-label="${esc(label)}" />` +
             `<button type="button" class="outline small ce-opt3o-delete" title="Eliminar foto" data-ce-opt3o-label="${esc(label)}">🗑️</button>`
           : `<span class="hint ce-opt3o-noimg">Sin imagen</span>`);
    row.dataset.ceOpt3oLabel = label;
    metrics.normalized++;
    return true;
  }
  let scheduled = 0;
  function normalizeActions(){
    scheduled = 0;
    const r = root(); if(!r) return;
    const rows = Array.from(r.querySelectorAll('.summary-item,.ce-opt3e-row,.rowline'));
    for(const row of rows){
      const label = labelFromRow(row);
      if(ticketToken(label)) setActions(row, label, currentImageFor(label));
    }
  }
  function scheduleNormalize(delay){
    if(scheduled) return;
    scheduled = setTimeout(normalizeActions, delay == null ? 30 : delay);
  }
  function observeRoot(){
    const r = root(); if(!r || r.__ceOpt3oObserved) return;
    r.__ceOpt3oObserved = true;
    try{
      const mo = new MutationObserver(() => scheduleNormalize(30));
      mo.observe(r,{childList:true,subtree:true});
      r.__ceOpt3oObserver = mo;
    }catch(_){ }
    scheduleNormalize(0); setTimeout(normalizeActions,150); setTimeout(normalizeActions,600);
  }
  function clearRenderCaches(){
    try{ if(window.ControlEventOpt3F) window.ControlEventOpt3F.lastSig = ''; }catch(_){ }
    try{ const r = root(); if(r){ delete r.dataset.ceOpt3eSig; delete r.dataset.ceOpt3eLightStamp; } }catch(_){ }
  }
  function setBusy(label, busy){
    const r = root(); if(!r) return;
    r.querySelectorAll(`.ce-opt3o-upload,.ce-opt3o-delete`).forEach(b=>{
      if(plain(b.dataset.ceOpt3oLabel) === label){ b.disabled = !!busy; b.style.opacity = busy ? '.55' : ''; }
    });
  }
  async function apiDelete(label){
    const tk = ticketToken(label);
    const res = await fetch('/api/ticket-images', {method:'DELETE', headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE}, body:JSON.stringify({eventId:eventId(), key:label, tk})});
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || data.message || `No se pudo eliminar foto (${res.status})`);
    return data;
  }
  async function apiUpload(label, dataUrl){
    const tk = ticketToken(label);
    const res = await fetch('/api/ticket-images', {method:'POST', headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE}, body:JSON.stringify({eventId:eventId(), key:label, tk, dataUrl, replace:true})});
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false || !data.image) throw new Error(data.error || data.message || `No se pudo guardar foto (${res.status})`);
    return withBust(srcOf(data.image));
  }
  function compress(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la foto'));
      reader.onload = () => { const img = new Image(); img.onerror = () => reject(new Error('Imagen no válida')); img.onload = () => { const max=1400; let w=img.width,h=img.height; const ratio=Math.min(max/w,max/h,1); w=Math.round(w*ratio); h=Math.round(h*ratio); const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); resolve(c.toDataURL('image/jpeg',0.86)); }; img.src = reader.result; };
      reader.readAsDataURL(file);
    });
  }
  async function deletePhoto(label){
    label = plain(label); if(!label || !eventId()) return false;
    if(metrics.busy) return false;
    if(!confirm('¿Eliminar la foto asociada a este ticket/gasto?')) return false;
    metrics.busy = true; metrics.lastAction='delete'; metrics.lastLabel=label; metrics.lastError=''; setBusy(label,true);
    try{
      await apiDelete(label);
      purgeLocal(label); await purgeIdb(label); await syncImages().catch(()=>{});
      clearRenderCaches();
      const rows = root() ? Array.from(root().querySelectorAll('.summary-item,.ce-opt3e-row,.rowline')) : [];
      rows.forEach(row=>{ const l=labelFromRow(row); if(ticketToken(l)===ticketToken(label)) setActions(row,l,''); });
      metrics.deletes++;
      return true;
    }catch(err){
      metrics.lastError = err?.message || String(err);
      console.error('[v16_opt_3o] delete', err);
      alert('No se pudo eliminar la foto: ' + metrics.lastError);
      return false;
    }finally{ metrics.busy=false; setBusy(label,false); scheduleNormalize(120); }
  }
  async function uploadPhoto(label, file){
    label = plain(label); if(!label || !eventId() || !file) return false;
    if(metrics.busy) return false;
    metrics.busy = true; metrics.lastAction='upload'; metrics.lastLabel=label; metrics.lastError=''; setBusy(label,true);
    try{
      purgeLocal(label); await purgeIdb(label);
      const dataUrl = await compress(file);
      const src = await apiUpload(label, dataUrl);
      purgeLocal(label); await purgeIdb(label); putLocal(label, src); await syncImages().catch(()=>{});
      clearRenderCaches();
      const rows = root() ? Array.from(root().querySelectorAll('.summary-item,.ce-opt3e-row,.rowline')) : [];
      rows.forEach(row=>{ const l=labelFromRow(row); if(ticketToken(l)===ticketToken(label)) setActions(row,l,src); });
      metrics.uploads++;
      return true;
    }catch(err){
      metrics.lastError = err?.message || String(err);
      console.error('[v16_opt_3o] upload', err);
      alert('No se pudo adjuntar la foto: ' + metrics.lastError);
      return false;
    }finally{ metrics.busy=false; setBusy(label,false); scheduleNormalize(120); }
  }
  function pick(label){
    const input = document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange = () => { const file = input.files && input.files[0]; if(file) uploadPhoto(label, file); };
    input.click(); return false;
  }
  function onClick(ev){
    const r = root(); if(!r || !r.contains(ev.target)) return;
    const del = ev.target.closest?.('.ce-opt3o-delete');
    if(del){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); deletePhoto(del.dataset.ceOpt3oLabel || labelFromRow(rowFrom(del))); return false; }
    const add = ev.target.closest?.('.ce-opt3o-upload');
    if(add){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); pick(add.dataset.ceOpt3oLabel || labelFromRow(rowFrom(add))); return false; }
  }
  function installGlobals(){
    const remove = function(encoded){ const label = safeDecode(encoded); deletePhoto(label); return false; };
    const upload = function(evOrEncoded, maybeEncoded){
      if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){ return uploadPhoto(safeDecode(maybeEncoded||''), evOrEncoded.target.files[0]); }
      return pick(safeDecode(String(evOrEncoded||'')));
    };
    remove.__ceOpt3O = upload.__ceOpt3O = true;
    try{ window.removeTicketImage = remove; window.removeTicketImageV164 = remove; window.removeTicketImageV202 = remove; }catch(_){ }
    try{ window.uploadTicketImage = upload; window.uploadTicketImageV164 = upload; window.uploadTicketImageV202 = upload; }catch(_){ }
    try{ removeTicketImage = remove; removeTicketImageV164 = remove; removeTicketImageV202 = remove; }catch(_){ }
    try{ uploadTicketImage = upload; uploadTicketImageV164 = upload; uploadTicketImageV202 = upload; }catch(_){ }
  }
  function style(){
    if($('ceOpt3OStyle')) return;
    const st = document.createElement('style'); st.id='ceOpt3OStyle';
    st.textContent = `
      #summaryTiendaTicket .ticket-actions.ce-opt3o-actions{display:inline-flex!important;align-items:center!important;gap:8px!important;min-width:0!important;}
      #summaryTiendaTicket .ticket-actions.ce-opt3o-actions button{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;}
      #summaryTiendaTicket .ticket-actions.ce-opt3o-actions button:disabled{cursor:wait!important;}
      #summaryTiendaTicket .ticket-actions.ce-opt3o-actions img.ticket-thumb{cursor:pointer!important;max-height:54px!important;}
      #ceV401PcPhotoModal .ce-v401-pc-modal-close,
      #ceV40TicketPhotoModal .ce-v40-modal-close,
      #ceV310PhotoViewer .ce-v310-photo-close,
      #ceTicketImageModalV225 .ce-ticket-modal-v225-close,
      #ceTicketModalV234 .ce-ticket-modal-v234-close,
      .ce-ticket-modal-v225 .ce-ticket-modal-v225-close,
      button.ce-ticket-modal-v225-close,
      button[class*="modal-close"],
      button[aria-label="Cerrar"]{
        position:fixed!important;right:24px!important;bottom:24px!important;left:auto!important;top:auto!important;
        z-index:10000100!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;
        min-width:112px!important;min-height:46px!important;background:#fff!important;color:#0f172a!important;
        border:2px solid #0f172a!important;border-radius:14px!important;box-shadow:0 14px 38px rgba(15,23,42,.22)!important;
        font-weight:950!important;cursor:pointer!important;pointer-events:auto!important;
      }
      #ceV401PcPhotoModal .ce-v401-pc-modal-box,#ceV40TicketPhotoModal .ce-v40-modal-box{padding-bottom:82px!important;}
    `;
    document.head.appendChild(st);
  }
  document.addEventListener('click', onClick, {capture:true, passive:false});
  ['DOMContentLoaded','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted','controlevent:rendered'].forEach(name=>{
    const target = name === 'DOMContentLoaded' ? document : window;
    target.addEventListener(name, () => { style(); installGlobals(); observeRoot(); scheduleNormalize(80); }, {capture:true});
  });
  const boot = () => { style(); installGlobals(); observeRoot(); scheduleNormalize(0); setTimeout(observeRoot,200); setTimeout(normalizeActions,600); };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true}); else boot();
})();
