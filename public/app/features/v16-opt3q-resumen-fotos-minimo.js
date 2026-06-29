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
  const metrics = window.ControlEventOpt3Q = {version:'v16_opt_3s', deletes:0, uploads:0, reloads:0, busy:false, lastLabel:'', lastError:'', installedAt:new Date().toISOString()};
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
    if(/[?&]ceImg=/i.test(src)) return src;
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
  function hardClearCaches(){
    try{ window.ControlEventOpt3F?.clearCaches?.(); }catch(_){ }
    try{ window.ControlEventOpt3F && (window.ControlEventOpt3F.lastSig = ''); }catch(_){ }
    try{ window.ControlEventOpt3Q && (window.ControlEventOpt3Q.cacheClears = (window.ControlEventOpt3Q.cacheClears || 0) + 1); }catch(_){ }
  }
  function purgeLocal(label){
    const s = stateRef();
    ['ticketImages','ticketImageRefs','ticketImagesByKey'].forEach(name => {
      const bag = s[name];
      if(!bag || typeof bag !== 'object' || Array.isArray(bag)) return;
      Object.keys(bag).forEach(k => { if(matchesLabelKey(k, label)) delete bag[k]; });
    });
    hardClearCaches();
  }
  function normalizeServerImages(images){
    if(Array.isArray(images)) return images;
    if(images && typeof images === 'object') return Object.entries(images).map(([k,v]) => {
      if(v && typeof v === 'object') return {...v, key:v.key || v.image_key || k, image_key:v.image_key || v.key || k};
      return {key:k, image_key:k, url:String(v || ''), pathname:String(v || '')};
    });
    return [];
  }
  function upsertLocalImage(img){
    const s = stateRef();
    if(!s.ticketImages || typeof s.ticketImages !== 'object' || Array.isArray(s.ticketImages)) s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object' || Array.isArray(s.ticketImageRefs)) s.ticketImageRefs = {};
    if(!s.ticketImagesByKey || typeof s.ticketImagesByKey !== 'object' || Array.isArray(s.ticketImagesByKey)) s.ticketImagesByKey = {};
    const k = imageKey(img); const src = bust(srcOf(img));
    if(!k || !src) return false;
    const item = {key:k, image_key:k, url:src, pathname:src, storage_path:img?.storage_path || '', label:imageLabel(img), updated_at:img?.updated_at || img?.created_at || new Date().toISOString()};
    s.ticketImages[k] = src;
    s.ticketImageRefs[k] = item;
    s.ticketImagesByKey[k] = item;
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    hardClearCaches();
    return true;
  }
  function rebuildLocalFromServer(images){
    const list = normalizeServerImages(images);
    const s = stateRef();
    if(!s.ticketImages || typeof s.ticketImages !== 'object' || Array.isArray(s.ticketImages)) s.ticketImages = {};
    if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object' || Array.isArray(s.ticketImageRefs)) s.ticketImageRefs = {};
    if(!s.ticketImagesByKey || typeof s.ticketImagesByKey !== 'object' || Array.isArray(s.ticketImagesByKey)) s.ticketImagesByKey = {};
    const ev = eventId();
    // Estado event-scoped: limpiamos solo fotos del evento actual para evitar que quede una miniatura vieja.
    ['ticketImages','ticketImageRefs','ticketImagesByKey'].forEach(name => {
      const bag = s[name];
      Object.keys(bag).forEach(k => { if(!ev || k.startsWith(ev + '|') || ticketToken(k)) delete bag[k]; });
    });
    list.forEach(img => { upsertLocalImage(img); });
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    hardClearCaches();
  }
  async function reloadImagesAndRender(){
    const ev = eventId(); if(!ev) return;
    const res = await fetch('/api/ticket-images?eventId=' + encodeURIComponent(ev) + '&_=' + Date.now(), {cache:'no-store'});
    const data = await res.json().catch(() => ({}));
    if(res.ok && data.ok) rebuildLocalFromServer(data.images);
    metrics.reloads++;
    hardClearCaches();
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
      console.error('[v16_opt_3s] eliminar foto', err);
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
      purgeLocal(label);
      const uploaded = await apiUpload(label, dataUrl);
      if(uploaded?.image) upsertLocalImage(uploaded.image);
      try{ window.ControlEventOpt3F?.renderNow?.(true); }catch(_){ }
      await reloadImagesAndRender();
      metrics.uploads++;
    }catch(err){
      metrics.lastError = err?.message || String(err);
      console.error('[v16_opt_3s] adjuntar foto', err);
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
    input.onchange = () => {
      const file = input.files && input.files[0];
      try{ input.value = ''; }catch(_){ }
      try{ input.remove(); }catch(_){ }
      if(file) uploadWithFile(encoded || '', file);
    };
    input.click();
    return false;
  }
  function parseMoney(v){
    let x = String(v == null ? '' : v).replace(/[^0-9,.-]/g,'');
    if(x.includes(',') && x.includes('.')) x = x.replace(/\./g,'').replace(',', '.');
    else if(x.includes(',')) x = x.replace(',', '.');
    const n = Number(x); return Number.isFinite(n) ? n : 0;
  }
  const money = v => { try{ return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v || 0)); }catch(_){ return String(v || '0') + ' €'; } };
  function labelFromRowText(row){
    let text = norm(row?.dataset?.ceOpt3eKey || row?.querySelector?.('.ce-opt3e-label,.ce-hf10-label,:scope > span:first-child')?.textContent || row?.textContent || '');
    text = text.replace(/ⓘ/g,'').replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2}\s*€\s*$/,'').replace(/\s+Sin imagen\s*$/i,'').trim();
    return text;
  }
  function rowDataFromElement(rowEl){
    if(!rowEl) return null;
    if(rowEl.__ceOpt3eRow) return rowEl.__ceOpt3eRow;
    const key = up(labelFromRowText(rowEl));
    try{
      const rows = window.ControlEventOpt3F?.rowsForSummary?.() || [];
      const found = rows.find(r => up(r.key) === key) || rows.find(r => key.includes(up(r.key)) || up(r.key).includes(key));
      if(found) return found;
    }catch(_){ }
    const tip = rowEl.getAttribute('data-ce-tip-v21') || rowEl.getAttribute('data-ce-tip') || '';
    if(tip) return {key:labelFromRowText(rowEl), v:parseMoney(rowEl.querySelector?.('.pill')?.textContent), text:tip, headers:[], lines:[]};
    return null;
  }
  function closeInfoModals(){
    document.querySelectorAll('.ce-opt3q-info-modal,.ce-opt3e-modal,.ce-opt3g-modal,.ce-opt3b-modal,.ce-hf10-modal,.ce-hf9-modal').forEach(x => x.remove());
  }
  function showInfoModal(row){
    if(!row) return;
    closeInfoModals();
    const title = row.donated ? 'CÁLCULOS POR DONANTE Y DONACIÓN' : (row.pending ? 'PENDIENTE DE COMPRA U OTROS GASTOS' : 'CÁLCULOS POR TIENDA Y TICKET');
    const headers = Array.isArray(row.headers) ? row.headers : [];
    const lines = Array.isArray(row.lines) ? row.lines : [];
    let body = '';
    if(lines.length && headers.length){
      body = `<div class="ce-opt3q-table-wrap"><table class="ce-opt3q-table"><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${lines.map(line => `<tr>${(Array.isArray(line)?line:[line]).map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }else{
      body = `<pre class="ce-opt3q-pre">${esc(row.text || 'Sin detalle')}</pre>`;
    }
    const totalLabel = row.donated ? 'TOTAL ESTIMADO' : 'TOTAL';
    const modal = document.createElement('div'); modal.className = 'ce-opt3q-info-modal';
    modal.innerHTML = `<div class="ce-opt3q-info-card" role="dialog" aria-modal="true"><div class="ce-opt3q-info-head"><div><h3>${esc(title)}</h3><p>${esc(row.key || '')}</p></div><button type="button" class="ce-opt3q-info-close" aria-label="Cerrar">×</button></div><div class="ce-opt3q-info-total"><span>${esc(totalLabel)}</span><strong>${esc(money(row.v || 0))}</strong></div>${body}</div>`;
    modal.addEventListener('click', ev => { if(ev.target === modal || ev.target.closest('.ce-opt3q-info-close')) modal.remove(); }, true);
    document.body.appendChild(modal);
  }
  let lastInfoOpenAt = 0;
  let lastInfoOpenKey = '';
  function onInfoClick(ev){
    const root = $(ROOT_ID); if(!root || !root.contains(ev.target)) return;
    // La captura en window llega antes que los globos heredados que bloqueaban el clic.
    // Se excluyen botones/foto para no robar adjuntar, eliminar, ordenar ni ampliar miniatura.
    if(ev.target.closest?.('button,input,select,textarea,a,img,.ticket-actions,[data-opt3e-sort]')) return;
    const row = ev.target.closest?.('#summaryTiendaTicket .ce-opt3e-row,#summaryTiendaTicket .summary-item:not(.ce-tt-total-evento),#summaryTiendaTicket [data-ce-opt3e-key]');
    if(!row || row.classList.contains('ce-tt-total-evento')) return;
    const data = rowDataFromElement(row);
    if(!data) return;
    const now = Date.now();
    const k = String(data.key || labelFromRowText(row) || '');
    if(k && k === lastInfoOpenKey && (now - lastInfoOpenAt) < 450){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.();
      return false;
    }
    lastInfoOpenAt = now; lastInfoOpenKey = k;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation?.();
    metrics.infoOpens = (metrics.infoOpens || 0) + 1;
    showInfoModal(data);
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
      #summaryTiendaTicket .ce-opt3e-row,#summaryTiendaTicket .summary-item{cursor:pointer;}
      .ce-opt3q-info-modal{position:fixed;inset:0;z-index:7800;background:rgba(15,23,42,.40);display:flex;align-items:center;justify-content:center;padding:14px;}
      .ce-opt3q-info-card{width:min(980px,94vw);max-height:78vh;overflow:auto;background:#fff;border:2px solid #0f172a;border-radius:18px;box-shadow:0 24px 80px rgba(15,23,42,.35);padding:14px;}
      .ce-opt3q-info-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;border-bottom:1px solid #e2e8f0;margin-bottom:8px;padding-bottom:8px;}
      .ce-opt3q-info-head h3{margin:0;font-size:18px;font-weight:950;color:#0f172a}.ce-opt3q-info-head p{margin:4px 0 0;font-weight:850;color:#334155}.ce-opt3q-info-close{border:0;background:#0f172a;color:#fff;border-radius:999px;width:46px;height:46px;font-size:30px;font-weight:950;line-height:1;cursor:pointer;}
      .ce-opt3q-info-total{display:flex;justify-content:space-between;gap:12px;align-items:center;background:#e0f2fe;border-radius:12px;padding:8px 10px;margin-bottom:8px;font-weight:950;}
      .ce-opt3q-table-wrap{overflow:auto;border:1px solid #dbe4ee;border-radius:12px}.ce-opt3q-table{border-collapse:separate;border-spacing:0;width:100%;min-width:680px;font-size:13px}.ce-opt3q-table th,.ce-opt3q-table td{padding:7px 9px;border-bottom:1px solid #e2e8f0;border-right:1px solid #eef2f7;text-align:left;white-space:nowrap}.ce-opt3q-table th{position:sticky;top:0;background:#f1f5f9;font-weight:950;z-index:1}.ce-opt3q-table td:nth-last-child(-n+3),.ce-opt3q-table th:nth-last-child(-n+3){text-align:right}.ce-opt3q-table td:first-child{font-weight:850}.ce-opt3q-pre{white-space:pre-wrap;margin:0;font:13px/1.35 ui-monospace,Menlo,Consolas,monospace;}
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
  // window/capture: llega antes que budget-tooltips-lite y capas antiguas de globos.
  window.addEventListener('pointerup', onInfoClick, {capture:true, passive:false});
  window.addEventListener('click', onInfoClick, {capture:true, passive:false});
  window.addEventListener('touchend', onInfoClick, {capture:true, passive:false});
  document.addEventListener('click', onInfoClick, {capture:true, passive:false});
  document.addEventListener('touchend', onInfoClick, {capture:true, passive:false});
  const mo = new MutationObserver(() => setTimeout(fixCloseInline, 30));
  try{ mo.observe(document.body || document.documentElement, {childList:true, subtree:true}); }catch(_){ }
  ['DOMContentLoaded','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted','controlevent:rendered','focus'].forEach(name => {
    const target = name === 'DOMContentLoaded' ? document : window;
    target.addEventListener(name, () => { closeCss(); installGlobals(); setTimeout(fixCloseInline, 50); }, true);
  });
  closeCss(); installGlobals(); setTimeout(fixCloseInline, 80);
})();
