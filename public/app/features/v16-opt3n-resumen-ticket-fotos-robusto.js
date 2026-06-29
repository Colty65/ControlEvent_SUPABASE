/* ControlEvent v16_prod OPT3N - Resumen: reemplazo real de fotos TKxx.
   Base OPT3L/OPT3J. No toca login, selector de eventos, /api/state, gráficas ni cálculos.
   Objetivo: eliminar/sustituir una foto de TKxx desde Resumen sin que vuelva desde BD, IndexedDB ni caché del navegador. */
(function(){
  'use strict';
  if(window.__ceV16Opt3NTicketFotosRobusto) return;
  window.__ceV16Opt3NTicketFotosRobusto = true;

  const ROOT_ID = 'summaryTiendaTicket';
  const SCOPE = 'ticket-image-v8-5-fix26';
  const DB_NAME = 'controlevent_ticket_images_v225';
  const DB_STORE = 'images';
  const metrics = window.ControlEventOpt3N = {
    version: 'v16_opt_3n', deletes: 0, uploads: 0, localPurges: 0, idbPurges: 0,
    lastAction: '', lastLabel: '', lastError: '', busy: false, installedAt: new Date().toISOString()
  };

  const norm = v => String(v == null ? '' : v).trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const $ = id => document.getElementById(id);
  const stateRef = () => {
    try{ if(window.ControlEventApp && window.ControlEventApp.state) return window.ControlEventApp.state; }catch(_){ }
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  };
  const eventId = () => norm(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const ticketToken = label => {
    const m = up(label).match(/\bTK\s*0*([0-9]{1,4})\b/);
    return m ? 'TK' + String(Number(m[1])).padStart(2,'0') : '';
  };
  const plainKey = label => norm(label).replace(/\s+/g,' ');
  const fullKey = label => {
    const ev = eventId();
    const raw = plainKey(label);
    return ev && raw && !raw.startsWith(ev + '|') ? `${ev}|${raw}` : raw;
  };
  const withBust = src => {
    src = norm(src);
    if(!src || /^data:image\//i.test(src)) return src;
    return `${src}${src.includes('?') ? '&' : '?'}ceLocal=${Date.now()}`;
  };
  function decodeArg(value){ try{ return decodeURIComponent(String(value || '')); }catch(_){ return String(value || ''); } }
  function encodedFromOnclick(el){
    const s = String(el?.getAttribute?.('onclick') || '');
    const m = s.match(/'([^']+)'|"([^"]+)"/);
    return m ? (m[1] || m[2] || '') : '';
  }
  function rowFrom(el){ return el?.closest?.(`#${ROOT_ID} .ce-opt3e-row,#${ROOT_ID} .summary-item,#${ROOT_ID} .rowline`); }
  function labelFromRow(row){
    if(!row) return '';
    if(row.__ceOpt3eRow && row.__ceOpt3eRow.key) return plainKey(row.__ceOpt3eRow.key);
    const ds = row.dataset || {};
    if(ds.ceOpt3eKey) return plainKey(ds.ceOpt3eKey);
    const labelEl = row.querySelector('.ce-opt3e-label,.ce-hf10-label,:scope > span:first-child') || row.querySelector('span');
    let text = norm(labelEl?.textContent || row.textContent || '');
    text = text.replace(/ⓘ/g,'').replace(/\s+Sin imagen\s*$/i,'').replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*€\s*$/,'').trim();
    const tk = ticketToken(text);
    if(tk){
      const first = norm(text.split('|')[0] || '');
      return first ? `${first} | ${tk}` : tk;
    }
    return text;
  }
  function labelFromAction(el){
    const enc = encodedFromOnclick(el);
    if(enc) return plainKey(decodeArg(enc));
    return labelFromRow(rowFrom(el));
  }
  function keyMatches(key, label){
    key = plainKey(key); label = plainKey(label);
    if(!key || !label) return false;
    const ev = eventId();
    const labelNoEv = ev && label.startsWith(ev + '|') ? label.slice(ev.length + 1) : label;
    const keyNoEv = ev && key.startsWith(ev + '|') ? key.slice(ev.length + 1) : key;
    if(key === label || key === fullKey(label) || keyNoEv === labelNoEv) return true;
    const tk = ticketToken(labelNoEv || label);
    return !!(tk && (ticketToken(key) === tk || up(key).includes(tk)) && (!ev || key.startsWith(ev + '|') || !/^id-[a-z0-9_-]+\|/i.test(key)));
  }
  function srcOf(value){
    if(!value) return '';
    if(typeof value === 'string') return value;
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || value.src || '');
    return '';
  }
  function purgeLocal(label){
    const s = stateRef();
    const bags = ['ticketImages','ticketImageRefs','ticketImagesByKey'];
    for(const name of bags){
      const bag = s[name];
      if(!bag || typeof bag !== 'object' || Array.isArray(bag)) continue;
      for(const k of Object.keys(bag)){ if(keyMatches(k, label)){ delete bag[k]; metrics.localPurges++; } }
    }
    const arrays = ['ticket_images','ce_ticket_images'];
    for(const name of arrays){
      if(!Array.isArray(s[name])) continue;
      s[name] = s[name].filter(row => {
        const sameEvent = !row?.eventId && !row?.event_id || norm(row?.eventId || row?.event_id) === eventId();
        const keys = [row?.image_key,row?.key,row?.ticketKey,row?.ticket,row?.tk,row?.codigo].map(norm).filter(Boolean);
        return !(sameEvent && keys.some(k => keyMatches(k, label)));
      });
    }
    try{ window.ControlEventApp && (window.ControlEventApp.state = s); }catch(_){ }
  }
  function putLocal(label, src){
    const s = stateRef();
    if(!s.ticketImages || typeof s.ticketImages !== 'object' || Array.isArray(s.ticketImages)) s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object' || Array.isArray(s.ticketImageRefs)) s.ticketImageRefs = {};
    const k = fullKey(label);
    s.ticketImages[k] = src;
    s.ticketImageRefs[k] = {key:k, url:src, pathname:src, updated_at:new Date().toISOString()};
    try{ window.ControlEventApp && (window.ControlEventApp.state = s); }catch(_){ }
  }
  function idbOpen(){
    return new Promise(resolve => {
      if(!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open(DB_NAME, 1);
      req.onerror = () => resolve(null);
      req.onsuccess = () => resolve(req.result || null);
      req.onupgradeneeded = () => { try{ req.result.createObjectStore(DB_STORE); }catch(_){ } };
    });
  }
  async function purgeIndexedDb(label){
    const db = await idbOpen();
    if(!db) return 0;
    return await new Promise(resolve => {
      let count = 0;
      try{
        const tx = db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cur = req.result;
          if(!cur) return;
          if(keyMatches(cur.key, label)){ try{ cur.delete(); count++; }catch(_){ } }
          cur.continue();
        };
        tx.oncomplete = () => { metrics.idbPurges += count; resolve(count); };
        tx.onerror = () => resolve(count);
      }catch(_){ resolve(count); }
    });
  }
  async function syncImagesFromServer(){
    const ev = eventId(); if(!ev) return {};
    const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(ev)}&_=${Date.now()}`, {cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || `No se pudieron leer fotos (${res.status})`);
    const imgs = data.images || {};
    const s = stateRef();
    ['ticketImages','ticketImageRefs','ticketImagesByKey'].forEach(name => {
      if(!s[name] || typeof s[name] !== 'object' || Array.isArray(s[name])) s[name] = {};
      for(const k of Object.keys(s[name])){ if(norm(k).startsWith(ev + '|')) delete s[name][k]; }
    });
    Object.entries(imgs).forEach(([k,v]) => {
      const src = srcOf(v);
      if(src){ s.ticketImages[k] = src; s.ticketImageRefs[k] = typeof v === 'object' ? v : {key:k,url:src,pathname:src}; }
    });
    try{ window.ControlEventApp && (window.ControlEventApp.state = s); }catch(_){ }
    return imgs;
  }
  function clearRenderCaches(){
    try{ if(window.ControlEventOpt3F) window.ControlEventOpt3F.lastSig = ''; }catch(_){ }
    try{ const root = $(ROOT_ID); if(root){ delete root.dataset.ceOpt3eSig; delete root.dataset.ceOpt3eLightStamp; } }catch(_){ }
  }
  function setRow(label, src){
    const root = $(ROOT_ID); if(!root) return;
    const tk = ticketToken(label);
    const rows = Array.from(root.querySelectorAll('.ce-opt3e-row,.summary-item,.rowline'));
    const row = rows.find(r => {
      const rlabel = labelFromRow(r);
      return up(rlabel) === up(label) || (tk && ticketToken(rlabel) === tk);
    });
    if(!row) return;
    const actions = row.querySelector('.ticket-actions');
    if(!actions) return;
    const enc = encodeURIComponent(label);
    actions.innerHTML = `<button type="button" class="outline small" title="Insertar foto" onclick="uploadTicketImage('${enc}'); return false;">📎</button>`;
    if(src){
      actions.insertAdjacentHTML('beforeend', `<img class="ticket-thumb" src="${src.replace(/"/g,'&quot;')}" alt="ticket" data-ce-hf12-tk="${tk}" />`);
      actions.insertAdjacentHTML('beforeend', `<button type="button" class="outline small" title="Eliminar foto" onclick="removeTicketImage('${enc}'); return false;">🗑️</button>`);
    }else{
      actions.insertAdjacentHTML('beforeend', '<span class="hint">Sin imagen</span>');
    }
  }
  function compress(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la foto'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Imagen no válida'));
        img.onload = () => {
          const max = 1400;
          let w = img.width, h = img.height;
          const r = Math.min(max / w, max / h, 1);
          w = Math.round(w * r); h = Math.round(h * r);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.86));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function apiDelete(label){
    const res = await fetch('/api/ticket-images', {
      method:'DELETE',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE},
      body:JSON.stringify({eventId:eventId(), key:plainKey(label)})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || data.message || `No se pudo eliminar foto (${res.status})`);
    return data;
  }
  async function apiUpload(label, dataUrl){
    const res = await fetch('/api/ticket-images', {
      method:'POST',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE},
      body:JSON.stringify({eventId:eventId(), key:plainKey(label), dataUrl})
    });
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false || !data.image) throw new Error(data.error || data.message || `No se pudo guardar foto (${res.status})`);
    return withBust(srcOf(data.image));
  }
  async function deleteTicket(label, silent){
    label = plainKey(label);
    if(!label || !eventId()) return false;
    if(metrics.busy) return false;
    if(!silent && !confirm('¿Eliminar la foto asociada a este ticket/gasto?')) return false;
    metrics.busy = true; metrics.lastAction = 'delete'; metrics.lastLabel = label; metrics.lastError = '';
    try{
      await apiDelete(label);
      purgeLocal(label);
      await purgeIndexedDb(label);
      await syncImagesFromServer();
      clearRenderCaches();
      setRow(label, '');
      metrics.deletes++;
      return true;
    }catch(err){
      console.error('[v16_opt_3n] delete', err);
      metrics.lastError = err?.message || String(err);
      if(!silent) alert('No se pudo eliminar la foto: ' + metrics.lastError);
      return false;
    }finally{ metrics.busy = false; }
  }
  async function uploadTicket(label, file){
    label = plainKey(label);
    if(!label || !eventId() || !file) return false;
    if(metrics.busy) return false;
    metrics.busy = true; metrics.lastAction = 'upload'; metrics.lastLabel = label; metrics.lastError = '';
    try{
      // Limpieza real antes de subir: servidor + estado + IndexedDB. Esto evita que vuelva la foto antigua.
      await apiDelete(label).catch(()=>{});
      purgeLocal(label);
      await purgeIndexedDb(label);
      const dataUrl = await compress(file);
      const src = await apiUpload(label, dataUrl);
      await syncImagesFromServer().catch(()=>{});
      putLocal(label, src);
      clearRenderCaches();
      setRow(label, src);
      metrics.uploads++;
      return true;
    }catch(err){
      console.error('[v16_opt_3n] upload', err);
      metrics.lastError = err?.message || String(err);
      alert('No se pudo adjuntar la foto: ' + metrics.lastError);
      return false;
    }finally{ metrics.busy = false; }
  }
  function pick(label){
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = () => uploadTicket(label, input.files && input.files[0]);
    input.click();
    return false;
  }
  function installOverrides(){
    const remove = function(encoded){ deleteTicket(decodeArg(encoded), false); return false; };
    const upload = function(evOrEncoded, maybeEncoded){
      if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){ return uploadTicket(decodeArg(maybeEncoded || ''), evOrEncoded.target.files[0]); }
      return pick(decodeArg(String(evOrEncoded || '')));
    };
    remove.__ceOpt3N = true; upload.__ceOpt3N = true;
    try{ window.removeTicketImage = remove; window.removeTicketImageV164 = remove; window.removeTicketImageV202 = remove; }catch(_){ }
    try{ window.uploadTicketImage = upload; window.uploadTicketImageV164 = upload; window.uploadTicketImageV202 = upload; }catch(_){ }
    try{ removeTicketImage = remove; removeTicketImageV164 = remove; removeTicketImageV202 = remove; }catch(_){ }
    try{ uploadTicketImage = upload; uploadTicketImageV164 = upload; uploadTicketImageV202 = upload; }catch(_){ }
  }
  function onClick(ev){
    const root = $(ROOT_ID); if(!root || !root.contains(ev.target)) return;
    const del = ev.target?.closest?.('button[onclick*="removeTicketImage"],button[data-ce-delete-img="1"],button[title*="Eliminar foto"]');
    if(del){
      const label = labelFromAction(del);
      if(label){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); deleteTicket(label, false); }
      return;
    }
    const add = ev.target?.closest?.('button[onclick*="uploadTicketImage"],button[title*="Insertar foto"],button[title*="Adjuntar foto"]');
    if(add){
      const label = labelFromAction(add);
      if(label){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); pick(label); }
      return;
    }
  }
  function onChange(ev){
    const input = ev.target;
    if(!input || !input.matches?.(`#${ROOT_ID} input[type="file"],#${ROOT_ID} input.ticket-file-input`)) return;
    const label = labelFromAction(input) || labelFromRow(rowFrom(input));
    if(label){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); uploadTicket(label, input.files && input.files[0]); input.value = ''; }
  }
  function style(){
    if($('ceOpt3NStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceOpt3NStyle';
    st.textContent = `
      #summaryTiendaTicket .ticket-actions button{pointer-events:auto!important;touch-action:manipulation!important;}
      #summaryTiendaTicket .ticket-actions img.ticket-thumb{cursor:pointer!important;}
      #ceV401PcPhotoModal .ce-v401-pc-modal-close,
      #ceV40TicketPhotoModal .ce-v40-modal-close,
      #ceV310PhotoViewer .ce-v310-photo-close,
      #ceTicketImageModalV225 .ce-ticket-modal-v225-close,
      #ceTicketModalV234 .ce-ticket-modal-v234-close,
      .ce-ticket-modal-v225 .ce-ticket-modal-v225-close{
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
  document.addEventListener('change', onChange, {capture:true, passive:false});
  ['DOMContentLoaded','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted'].forEach(name => {
    const target = name === 'DOMContentLoaded' ? document : window;
    target.addEventListener(name, () => { style(); installOverrides(); }, {capture:true});
  });
  style(); installOverrides();
})();
