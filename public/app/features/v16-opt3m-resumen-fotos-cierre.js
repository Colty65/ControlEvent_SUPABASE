/* ControlEvent v16_prod OPT3M - Resumen: fotos TKxx seguras + cierre fijo.
   Rebase sobre OPT3L/OPT3J. No toca login, selector, /api/state ni render global.
   Corrige exclusivamente acciones humanas de adjuntar/eliminar foto en Resumen y
   fija el cierre del visor de tickets abajo a la derecha. */
(function(){
  'use strict';
  if(window.__ceV16Opt3MResumenFotosCierre) return;
  window.__ceV16Opt3MResumenFotosCierre = true;

  const VERSION = 'v16_opt_3m';
  const SCOPE = 'ticket-image-v8-5-fix26';
  const ROOT_ID = 'summaryTiendaTicket';
  const norm = v => String(v == null ? '' : v).trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const $ = id => document.getElementById(id);
  const stateRef = () => {
    try{ if(window.ControlEventApp && window.ControlEventApp.state) return window.ControlEventApp.state; }catch(_){ }
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  };
  const eventId = () => norm(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const ticketToken = label => { const m = up(label).match(/\bTK\s*0*([0-9]{1,3})\b/); return m ? ('TK' + String(Number(m[1])).padStart(2,'0')) : ''; };
  const plainKey = label => norm(label).replace(/\s+/g,' ');
  const fullKey = label => {
    const ev = eventId();
    const raw = plainKey(label);
    if(!ev) return raw;
    return raw.startsWith(ev + '|') ? raw : `${ev}|${raw}`;
  };
  const metrics = window.ControlEventOpt3M = {
    version: VERSION,
    deletes: 0,
    uploads: 0,
    localPurges: 0,
    lastAction: '',
    lastKey: '',
    lastError: '',
    installedAt: new Date().toISOString()
  };

  function decodeArg(value){
    try{ return decodeURIComponent(String(value || '')); }catch(_){ return String(value || ''); }
  }
  function encodedFromOnclick(btn){
    const s = String(btn?.getAttribute?.('onclick') || '');
    const m = s.match(/'([^']+)'|"([^"]+)"/);
    return m ? (m[1] || m[2] || '') : '';
  }
  function labelFromRow(row){
    if(!row) return '';
    const ds = row.dataset || {};
    const direct = ds.ceOpt3eKey || ds.ceOpt3gDonationKey || ds.ceHf12Tk || '';
    if(direct && /\|/.test(direct)) return norm(direct);
    const el = row.querySelector('.ce-opt3e-label,.ce-hf10-label,:scope > span:first-child') || row.querySelector('span');
    let text = norm(el?.textContent || row.textContent || '');
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
    if(enc) return decodeArg(enc);
    const row = el?.closest?.(`#${ROOT_ID} .summary-item,#${ROOT_ID} .ce-opt3e-row,#${ROOT_ID} .rowline`);
    return labelFromRow(row);
  }
  function candidatesFor(label){
    const ev = eventId();
    const raw = plainKey(label);
    const tk = ticketToken(raw);
    const set = new Set();
    if(raw){ set.add(raw); if(ev) set.add(`${ev}|${raw}`); }
    if(tk){ set.add(tk); if(ev) set.add(`${ev}|${tk}`); }
    return [...set].filter(Boolean);
  }
  function matchesKey(key, label){
    key = norm(key); label = plainKey(label);
    const ev = eventId();
    const tk = ticketToken(label);
    const nkey = up(key), nlabel = up(label);
    if(!key) return false;
    if(key === label || (ev && key === `${ev}|${label}`)) return true;
    if(nkey === nlabel || (ev && nkey === up(`${ev}|${label}`))) return true;
    if(tk && nkey.includes(tk) && (!ev || key.startsWith(ev + '|') || !/\bid-[a-z0-9_-]+\|/i.test(key))) return true;
    return false;
  }
  function srcOf(value){
    if(!value) return '';
    if(typeof value === 'string') return value;
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || value.src || '');
    return '';
  }
  function mutateLocalImages(label, nextSrc){
    const s = stateRef();
    const canon = fullKey(label);
    const bags = ['ticketImages','ticketImageRefs','ticketImagesByKey'];
    for(const name of bags){
      if(!s[name] || typeof s[name] !== 'object' || Array.isArray(s[name])) continue;
      for(const k of Object.keys(s[name])){
        if(matchesKey(k, label)){ delete s[name][k]; metrics.localPurges++; }
      }
      if(nextSrc) s[name][canon] = nextSrc;
    }
    const arrayBags = ['ticket_images','ce_ticket_images'];
    for(const name of arrayBags){
      if(!Array.isArray(s[name])) continue;
      s[name] = s[name].filter(row => {
        const keys = [row?.image_key,row?.key,row?.ticketKey,row?.ticket,row?.tk,row?.codigo].map(norm).filter(Boolean);
        const sameEvent = !row?.eventId && !row?.event_id || norm(row?.eventId || row?.event_id) === eventId();
        return !(sameEvent && keys.some(k => matchesKey(k, label)));
      });
      if(nextSrc) s[name].push({eventId:eventId(), image_key:canon, key:canon, url:nextSrc, pathname:nextSrc, ticket:ticketToken(label)});
    }
    if(!s.ticketImages || typeof s.ticketImages !== 'object' || Array.isArray(s.ticketImages)) s.ticketImages = {};
    if(nextSrc) s.ticketImages[canon] = nextSrc;
    try{ window.ControlEventApp && (window.ControlEventApp.state = s); }catch(_){ }
  }
  function clearOptCaches(){
    try{ if(window.ControlEventOpt3F){ window.ControlEventOpt3F.lastSig = ''; } }catch(_){ }
    try{ const root = $(ROOT_ID); if(root){ delete root.dataset.ceOpt3eSig; delete root.dataset.ceOpt3eLightStamp; } }catch(_){ }
  }
  function touchRow(label, src){
    const root = $(ROOT_ID); if(!root) return;
    const tk = ticketToken(label);
    const rows = Array.from(root.querySelectorAll('.summary-item,.ce-opt3e-row,.rowline'));
    const row = rows.find(r => up(labelFromRow(r)) === up(label) || (tk && up(labelFromRow(r)).includes(tk)));
    if(!row) return;
    const actions = row.querySelector('.ticket-actions');
    if(!actions) return;
    actions.querySelectorAll('img.ticket-thumb').forEach(x => x.remove());
    actions.querySelectorAll('button[onclick*="removeTicketImage"],button[data-ce-delete-img="1"]').forEach(x => x.remove());
    actions.querySelectorAll('.hint').forEach(x => x.remove());
    if(src){
      const img = document.createElement('img');
      img.className = 'ticket-thumb';
      img.alt = 'ticket';
      img.src = src;
      img.dataset.ceHf12Tk = tk;
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'outline small';
      del.title = 'Eliminar foto';
      del.setAttribute('onclick', `removeTicketImage('${encodeURIComponent(label)}'); return false;`);
      del.textContent = '🗑️';
      const firstBtn = actions.querySelector('button[onclick*="uploadTicketImage"]');
      if(firstBtn && firstBtn.nextSibling) actions.insertBefore(img, firstBtn.nextSibling); else actions.appendChild(img);
      actions.appendChild(del);
    }else{
      const hint = document.createElement('span');
      hint.className = 'hint';
      hint.textContent = 'Sin imagen';
      actions.appendChild(hint);
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
          const max = 1200;
          let w = img.width, h = img.height;
          const r = Math.min(max / w, max / h, 1);
          w = Math.round(w * r); h = Math.round(h * r);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
  async function apiDeleteOne(key){
    const res = await fetch('/api/ticket-images', {
      method: 'DELETE',
      headers: {'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE},
      body: JSON.stringify({eventId:eventId(), key})
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false) throw new Error(data.error || data.message || `No se pudo eliminar foto (${res.status})`);
    return data;
  }
  async function apiUpload(label, dataUrl){
    const res = await fetch('/api/ticket-images', {
      method: 'POST',
      headers: {'Content-Type':'application/json','X-ControlEvent-Write-Scope':SCOPE},
      body: JSON.stringify({eventId:eventId(), key:plainKey(label), dataUrl})
    });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data.ok === false || !data.image) throw new Error(data.error || data.message || `No se pudo adjuntar foto (${res.status})`);
    return srcOf(data.image) || data.image.pathname || data.image.url || '';
  }
  async function deleteTicket(label, opts){
    label = plainKey(label);
    if(!label || !eventId()) return false;
    if(!opts?.silent && !confirm('¿Eliminar la foto asociada a este ticket/gasto?')) return false;
    metrics.lastAction = 'delete'; metrics.lastKey = label; metrics.lastError = '';
    const keys = candidatesFor(label);
    const errors = [];
    let okCount = 0;
    for(const key of keys){
      try{ await apiDeleteOne(key); okCount++; }catch(err){ errors.push(err); }
    }
    if(!okCount && errors.length){
      const msg = errors[0]?.message || String(errors[0] || 'No se pudo eliminar');
      metrics.lastError = msg;
      alert(msg);
      return false;
    }
    // Si el servidor acepta la acción, limpiamos también el estado local para que la miniatura no reaparezca desde caché.
    mutateLocalImages(label, '');
    clearOptCaches();
    touchRow(label, '');
    try{ if(typeof window.render === 'function' && opts?.render !== false) setTimeout(() => window.render(), 40); }catch(_){ }
    metrics.deletes++;
    return true;
  }
  async function uploadTicket(label, file){
    label = plainKey(label);
    if(!label || !eventId() || !file) return false;
    metrics.lastAction = 'upload'; metrics.lastKey = label; metrics.lastError = '';
    try{
      // Sustitución real: primero limpia claves antiguas de ese TK en local y servidor; luego sube una sola foto nueva.
      await deleteTicket(label, {silent:true, render:false}).catch(() => {});
      const dataUrl = await compress(file);
      const src = await apiUpload(label, dataUrl);
      mutateLocalImages(label, src || dataUrl);
      clearOptCaches();
      touchRow(label, src || dataUrl);
      try{ if(typeof window.render === 'function') setTimeout(() => window.render(), 60); }catch(_){ }
      metrics.uploads++;
      return true;
    }catch(err){
      console.error('[v16_opt_3m] upload', err);
      metrics.lastError = err?.message || String(err);
      alert('No se pudo adjuntar la foto: ' + metrics.lastError);
      return false;
    }
  }
  function pickAndUpload(label){
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => uploadTicket(label, input.files && input.files[0]);
    input.click();
    return false;
  }
  function installFunctionOverrides(){
    if(window.removeTicketImage?.__ceOpt3M && window.uploadTicketImage?.__ceOpt3M) return;
    const remove = function(encoded){ deleteTicket(decodeArg(encoded)); return false; };
    const upload = function(evOrEncoded, maybeEncoded){
      if(evOrEncoded && evOrEncoded.target && evOrEncoded.target.files){
        return uploadTicket(decodeArg(maybeEncoded || ''), evOrEncoded.target.files[0]);
      }
      return pickAndUpload(decodeArg(String(evOrEncoded || '')));
    };
    remove.__ceOpt3M = true; upload.__ceOpt3M = true;
    try{ window.removeTicketImage = remove; window.removeTicketImageV164 = remove; window.removeTicketImageV202 = remove; }catch(_){ }
    try{ window.uploadTicketImage = upload; window.uploadTicketImageV164 = upload; window.uploadTicketImageV202 = upload; }catch(_){ }
    try{ removeTicketImage = remove; removeTicketImageV164 = remove; removeTicketImageV202 = remove; }catch(_){ }
    try{ uploadTicketImage = upload; uploadTicketImageV164 = upload; uploadTicketImageV202 = upload; }catch(_){ }
  }
  function handleClick(ev){
    const root = $(ROOT_ID);
    if(!root || !root.contains(ev.target)) return;
    const del = ev.target?.closest?.('button[onclick*="removeTicketImage"],button[data-ce-delete-img="1"],button[title*="Eliminar foto"]');
    if(del){
      const label = labelFromAction(del);
      if(label){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); deleteTicket(label); }
      return;
    }
    const add = ev.target?.closest?.('button[onclick*="uploadTicketImage"],button[title*="Insertar foto"],button[title*="Adjuntar foto"]');
    if(add){
      const label = labelFromAction(add);
      if(label){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.(); pickAndUpload(label); }
      return;
    }
  }
  function injectStyle(){
    if($('ceOpt3MStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceOpt3MStyle';
    st.textContent = `
      #summaryTiendaTicket .ticket-actions button{pointer-events:auto!important;touch-action:manipulation!important;}
      #summaryTiendaTicket .ticket-actions img.ticket-thumb{cursor:pointer!important;}
      #ceV401PcPhotoModal .ce-v401-pc-modal-close,
      #ceV40TicketPhotoModal .ce-v40-modal-close,
      #ceTicketImageModalV225 .ce-ticket-modal-v225-close,
      #ceTicketModalV234 .ce-ticket-modal-v234-close,
      .ce-ticket-modal-v225 .ce-ticket-modal-v225-close{
        position:fixed!important;
        right:24px!important;
        bottom:24px!important;
        left:auto!important;
        top:auto!important;
        z-index:10000100!important;
        display:inline-flex!important;
        align-items:center!important;
        justify-content:center!important;
        min-width:112px!important;
        min-height:46px!important;
        background:#fff!important;
        color:#0f172a!important;
        border:2px solid #0f172a!important;
        border-radius:14px!important;
        box-shadow:0 14px 38px rgba(15,23,42,.22)!important;
        font-weight:950!important;
        cursor:pointer!important;
        pointer-events:auto!important;
      }
      #ceV401PcPhotoModal .ce-v401-pc-modal-head .ce-v401-pc-modal-close,
      #ceV40TicketPhotoModal .ce-v40-modal-head .ce-v40-modal-close{position:fixed!important;}
      #ceV401PcPhotoModal .ce-v401-pc-modal-box,
      #ceV40TicketPhotoModal .ce-v40-modal-box{padding-bottom:76px!important;}
    `;
    document.head.appendChild(st);
  }
  function install(){ injectStyle(); installFunctionOverrides(); }
  document.addEventListener('click', handleClick, {capture:true, passive:false});
  ['controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted','controlevent:event-changed','controlevent:opt1-event-stable'].forEach(ev => window.addEventListener(ev, () => setTimeout(install, 80), true));
  document.addEventListener('DOMContentLoaded', () => setTimeout(install, 80), {once:true});
  window.addEventListener('load', () => setTimeout(install, 120), {once:true});
  setInterval(installFunctionOverrides, 5000);
  install();
})();
