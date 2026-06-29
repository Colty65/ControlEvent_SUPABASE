/* ControlEvent v16_prod OPT3P - Resumen: fotos TKxx desde el motor original, sin overlays tardíos.
   Base OPT3O + corrección backend/cache. No toca login, selector, /api/state, gráficas, compras,
   ingresos, donaciones, documentos, planificación ni AVANCE. */
(function(){
  'use strict';
  if(window.__ceV16Opt3PTicketFotosCore) return;
  window.__ceV16Opt3PTicketFotosCore = true;

  const SCOPE = 'ticket-image-v8-5-fix26';
  const DB_NAME = 'controlevent_ticket_images_v225';
  const DB_STORE = 'images';
  const ROOT_ID = 'summaryTiendaTicket';
  const metrics = window.ControlEventOpt3P = {version:'v16_opt_3p', deletes:0, uploads:0, busy:false, lastAction:'', lastLabel:'', lastError:'', installedAt:new Date().toISOString()};
  const $ = id => document.getElementById(id);
  const plain = v => String(v == null ? '' : v).trim().replace(/\s+/g,' ');
  const up = v => plain(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const stateRef = () => { try{ return window.ControlEventApp?.state || window.state || (typeof state !== 'undefined' ? state : {}) || {}; }catch(_){ return {}; } };
  const eventId = () => plain(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  function ticketToken(value){ const m = up(value).match(/(?:^|[^A-Z0-9])(?:TK|TICKET)\s*[-_]*\s*0*([0-9]{1,4})(?:[^A-Z0-9]|$)/); return m ? 'TK' + String(Number(m[1])).padStart(2,'0') : ''; }
  function safeDecode(value){ try{ return decodeURIComponent(String(value||'')); }catch(_){ return String(value||''); } }
  function srcOf(v){ if(!v) return ''; if(typeof v === 'string') return plain(v); if(typeof v === 'object') return plain(v.url || v.public_url || v.publicUrl || v.pathname || v.path || v.storage_path || v.dataUrl || v.base64 || v.src || ''); return ''; }
  function withBust(src){ src = plain(src); if(!src || /^data:image\//i.test(src)) return src; return src + (src.includes('?') ? '&' : '?') + 'ceImg=' + Date.now(); }
  function labelFromElement(el){
    const row = el?.closest?.(`#${ROOT_ID} .summary-item,#${ROOT_ID} .ce-opt3e-row,#${ROOT_ID} .rowline`);
    if(!row) return '';
    const encoded = el?.dataset?.ceTicketKey || el?.closest?.('.ticket-actions')?.dataset?.ceTicketKey || '';
    if(encoded) return safeDecode(encoded);
    if(row.dataset?.ceOpt3eKey) return plain(row.dataset.ceOpt3eKey);
    if(row.__ceOpt3eRow?.key) return plain(row.__ceOpt3eRow.key);
    const first = row.querySelector('.ce-opt3e-label,.ce-hf10-label,:scope > span:first-child') || row.querySelector('span');
    return plain((first?.textContent || row.textContent || '').replace(/ⓘ/g,'').replace(/\s+Sin imagen\s*$/i,'').replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*€\s*$/,''));
  }
  function matchesKey(k,label,tk){
    const ev = eventId(); k = plain(k); label = plain(label); tk = tk || ticketToken(label);
    const noEv = ev && k.startsWith(ev+'|') ? k.slice(ev.length+1) : k;
    const labelNoEv = ev && label.startsWith(ev+'|') ? label.slice(ev.length+1) : label;
    return (k && label && (k === label || noEv === labelNoEv || k === ev+'|'+labelNoEv)) || (!!tk && ticketToken(k) === tk);
  }
  function purgeLocal(label){
    const s = stateRef(); const tk = ticketToken(label);
    ['ticketImages','ticketImageRefs','ticketImagesByKey'].forEach(name => {
      const bag = s[name]; if(!bag || typeof bag !== 'object' || Array.isArray(bag)) return;
      Object.keys(bag).forEach(k => { if(matchesKey(k,label,tk)) delete bag[k]; });
    });
    ['ticket_images','ce_ticket_images'].forEach(name => {
      if(Array.isArray(s[name])) s[name] = s[name].filter(row => !matchesKey(row?.image_key || row?.key || row?.ticket || row?.tk || row?.codigo || row?.label, label, tk));
    });
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    try{ window.ControlEventOpt3F?.clearCaches?.(); }catch(_){ }
  }
  function putLocal(label, src){
    const s = stateRef(); const ev = eventId(); const clean = plain(label).startsWith(ev+'|') ? plain(label).slice(ev.length+1) : plain(label); const key = ev ? ev + '|' + clean : clean;
    if(!s.ticketImages || typeof s.ticketImages !== 'object' || Array.isArray(s.ticketImages)) s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object' || Array.isArray(s.ticketImageRefs)) s.ticketImageRefs = {};
    s.ticketImages[key] = src;
    s.ticketImageRefs[key] = {key,url:src,pathname:src,updated_at:new Date().toISOString()};
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    try{ window.ControlEventOpt3F?.clearCaches?.(); }catch(_){ }
  }
  function idbOpen(){
    return new Promise(resolve => {
      if(!('indexedDB' in window)) return resolve(null);
      const req = indexedDB.open(DB_NAME,1);
      req.onerror = () => resolve(null); req.onsuccess = () => resolve(req.result || null);
      req.onupgradeneeded = () => { try{ req.result.createObjectStore(DB_STORE); }catch(_){ } };
    });
  }
  async function purgeIdb(label){
    const db = await idbOpen(); if(!db) return 0; const tk = ticketToken(label);
    return await new Promise(resolve => {
      let count = 0;
      try{
        const tx = db.transaction(DB_STORE,'readwrite'); const st = tx.objectStore(DB_STORE); const req = st.openCursor();
        req.onsuccess = () => { const cur = req.result; if(!cur) return; if(matchesKey(cur.key,label,tk)){ try{ cur.delete(); count++; }catch(_){ } } cur.continue(); };
        tx.oncomplete = () => resolve(count); tx.onerror = () => resolve(count);
      }catch(_){ resolve(count); }
    });
  }
  function compress(file){
    return new Promise((resolve,reject)=>{
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la foto'));
      reader.onload = () => { const img = new Image(); img.onerror = () => reject(new Error('Imagen no válida')); img.onload = () => { const max=1400; let w=img.width,h=img.height; const r=Math.min(max/w,max/h,1); w=Math.round(w*r); h=Math.round(h*r); const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(img,0,0,w,h); resolve(c.toDataURL('image/jpeg',0.86)); }; img.src = reader.result; };
      reader.readAsDataURL(file);
    });
  }
  async function apiDelete(label){
    const res = await fetch('/api/ticket-images', {method:'DELETE', headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE}, body:JSON.stringify({eventId:eventId(), key:label, tk:ticketToken(label)})});
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || data.message || `No se pudo eliminar foto (${res.status})`);
    return data;
  }
  async function apiUpload(label, dataUrl){
    const res = await fetch('/api/ticket-images', {method:'POST', headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE}, body:JSON.stringify({eventId:eventId(), key:label, tk:ticketToken(label), dataUrl, replace:true})});
    const data = await res.json().catch(()=>({}));
    if(!res.ok || data.ok === false || !data.image) throw new Error(data.error || data.message || `No se pudo guardar foto (${res.status})`);
    return withBust(srcOf(data.image));
  }
  function rowFor(label, origin){
    const tk = ticketToken(label); const root = $(ROOT_ID); if(!root) return origin?.closest?.('.summary-item,.ce-opt3e-row,.rowline') || null;
    let row = origin?.closest?.('.summary-item,.ce-opt3e-row,.rowline') || null;
    if(row && ticketToken(labelFromElement(row)) === tk) return row;
    return Array.from(root.querySelectorAll('.summary-item,.ce-opt3e-row,.rowline')).find(r => ticketToken(labelFromElement(r)) === tk) || row;
  }
  function updateRow(label, src, origin){
    const row = rowFor(label, origin); if(!row) return;
    let actions = row.querySelector('.ticket-actions');
    const encoded = encodeURIComponent(label);
    if(!actions){
      const right = row.children[row.children.length-1] || row;
      actions = document.createElement('span'); actions.className = 'ticket-actions ce-opt3p-actions'; right.appendChild(actions);
    }
    actions.dataset.ceTicketKey = encoded;
    actions.innerHTML = `<button type="button" class="outline small ce-opt3p-upload" title="Adjuntar o sustituir foto" onclick="uploadTicketImage('${encoded}'); return false;">📎</button>` +
      (src ? `<img class="ticket-thumb ce-opt3p-thumb" src="${String(src).replace(/&/g,'&amp;').replace(/"/g,'&quot;')}" alt="ticket" data-ce-ticket-key="${encoded}" />` +
             `<button type="button" class="outline small ce-opt3p-delete" title="Eliminar foto" onclick="removeTicketImage('${encoded}'); return false;">🗑️</button>`
           : `<span class="hint ce-opt3p-noimg">Sin imagen</span>`);
  }
  function setBusy(busy){ metrics.busy = !!busy; const r = $(ROOT_ID); if(r) r.classList.toggle('ce-opt3p-busy', !!busy); }
  async function doDelete(encodedOrLabel, origin){
    const label = safeDecode(encodedOrLabel); if(!label || !eventId() || metrics.busy) return false;
    if(!confirm('¿Eliminar la foto asociada a este ticket/gasto?')) return false;
    setBusy(true); metrics.lastAction='delete'; metrics.lastLabel=label; metrics.lastError='';
    try{
      purgeLocal(label); updateRow(label,'',origin); await purgeIdb(label);
      await apiDelete(label);
      purgeLocal(label); await purgeIdb(label); updateRow(label,'',origin);
      metrics.deletes++;
      setTimeout(()=>{ try{ window.ControlEventOpt3F?.clearCaches?.(); window.ControlEventOpt3F?.renderNow?.(true); }catch(_){ } }, 80);
      return false;
    }catch(err){ metrics.lastError = err?.message || String(err); console.error('[v16_opt_3p] delete', err); alert('No se pudo eliminar la foto: ' + metrics.lastError); return false; }
    finally{ setBusy(false); }
  }
  async function doUpload(encodedOrLabel, file, origin){
    const label = safeDecode(encodedOrLabel); if(!label || !eventId() || !file || metrics.busy) return false;
    setBusy(true); metrics.lastAction='upload'; metrics.lastLabel=label; metrics.lastError='';
    try{
      purgeLocal(label); updateRow(label,'',origin); await purgeIdb(label);
      const dataUrl = await compress(file);
      const src = await apiUpload(label, dataUrl);
      purgeLocal(label); await purgeIdb(label); putLocal(label, src); updateRow(label, src, origin);
      metrics.uploads++;
      setTimeout(()=>{ try{ window.ControlEventOpt3F?.clearCaches?.(); window.ControlEventOpt3F?.renderNow?.(true); }catch(_){ } }, 80);
      return false;
    }catch(err){ metrics.lastError = err?.message || String(err); console.error('[v16_opt_3p] upload', err); alert('No se pudo adjuntar la foto: ' + metrics.lastError); return false; }
    finally{ setBusy(false); }
  }
  function pick(encodedOrLabel, origin){
    const input = document.createElement('input'); input.type='file'; input.accept='image/*';
    input.onchange = () => { const file = input.files && input.files[0]; if(file) doUpload(encodedOrLabel, file, origin); };
    input.click();
    return false;
  }
  function installGlobals(){
    const upload = function(evOrEncoded, maybeEncoded){
      if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){ const f = evOrEncoded.target.files[0]; return doUpload(maybeEncoded || '', f, evOrEncoded.target); }
      return pick(evOrEncoded || '', null);
    };
    const remove = function(encoded){ return doDelete(encoded || '', null); };
    upload.__ceOpt3P = remove.__ceOpt3P = true;
    try{ window.uploadTicketImage = upload; window.uploadTicketImageV164 = upload; window.uploadTicketImageV202 = upload; }catch(_){ }
    try{ window.removeTicketImage = remove; window.removeTicketImageV164 = remove; window.removeTicketImageV202 = remove; }catch(_){ }
    try{ uploadTicketImage = upload; uploadTicketImageV164 = upload; uploadTicketImageV202 = upload; }catch(_){ }
    try{ removeTicketImage = remove; removeTicketImageV164 = remove; removeTicketImageV202 = remove; }catch(_){ }
  }
  function onClick(ev){
    const root = $(ROOT_ID); if(!root || !root.contains(ev.target)) return;
    const del = ev.target.closest?.('.ce-opt3p-delete,button[onclick*="removeTicketImage"]');
    if(del){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); const label = labelFromElement(del) || safeDecode((del.getAttribute('onclick')||'').match(/'([^']+)'/)?.[1] || ''); doDelete(label, del); return false; }
    const add = ev.target.closest?.('.ce-opt3p-upload,button[onclick*="uploadTicketImage"]');
    if(add){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); const label = labelFromElement(add) || safeDecode((add.getAttribute('onclick')||'').match(/'([^']+)'/)?.[1] || ''); pick(label, add); return false; }
  }
  function fixCloseButtons(){
    try{
      Array.from(document.querySelectorAll('button')).forEach(btn => {
        if(!/cerrar/i.test(btn.textContent || btn.getAttribute('aria-label') || '')) return;
        const box = btn.closest('[id*="Modal"],[class*="modal"],.photo-viewer,.viewer,.overlay') || btn.parentElement;
        if(!box || !box.querySelector?.('img')) return;
        btn.style.setProperty('position','fixed','important');
        btn.style.setProperty('right','24px','important');
        btn.style.setProperty('bottom','24px','important');
        btn.style.setProperty('left','auto','important');
        btn.style.setProperty('top','auto','important');
        btn.style.setProperty('z-index','10000100','important');
      });
    }catch(_){ }
  }
  function style(){
    if($('ceOpt3PStyle')) return;
    const st = document.createElement('style'); st.id='ceOpt3PStyle';
    st.textContent = `
      #summaryTiendaTicket .ticket-actions{display:inline-flex!important;align-items:center!important;gap:8px!important;pointer-events:auto!important;}
      #summaryTiendaTicket .ticket-actions button{pointer-events:auto!important;touch-action:manipulation!important;cursor:pointer!important;min-width:42px!important;}
      #summaryTiendaTicket .ticket-actions input[type="file"]{display:none!important;}
      #summaryTiendaTicket .ticket-thumb{cursor:pointer!important;max-height:54px!important;}
      #summaryTiendaTicket.ce-opt3p-busy .ticket-actions button{opacity:.55!important;}
    `;
    document.head.appendChild(st);
  }
  document.addEventListener('click', onClick, {capture:true, passive:false});
  const mo = new MutationObserver(() => setTimeout(fixCloseButtons, 40));
  try{ mo.observe(document.body || document.documentElement, {childList:true, subtree:true}); }catch(_){ }
  ['DOMContentLoaded','controlevent:app-ready','controlevent:runtime-ready','controlevent:event-ready','controlevent:module-mounted','controlevent:rendered'].forEach(e => {
    const t = e === 'DOMContentLoaded' ? document : window;
    t.addEventListener(e, () => { style(); installGlobals(); setTimeout(fixCloseButtons,60); }, true);
  });
  style(); installGlobals(); setTimeout(fixCloseButtons,80);
})();
