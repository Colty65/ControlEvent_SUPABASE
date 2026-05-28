/* ControlEvent v50.10 - persistencia real de justificantes de INGRESOS, retorno al globo y negrita PRODUCTOS.
   - Los justificantes de ingresos se suben tambien a /api/ticket-images (Supabase) como los tickets.
   - Se mantiene una copia local de seguridad para no perder fotos en cambios de version/cache.
   - Al cerrar una foto se restaura el globo de origen si el navegador lo habia cerrado por perdida de foco.
   - PRODUCTOS queda marcado en negrita al pulsar Modificar como el resto de mantenimientos.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.10';
  const VERSION_FILE = 'ControlEvent_v50_10';
  const INSTALLED = '__ceV469FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const BACKUP_KEY = 'ControlEvent_ingreso_receipts_v468';
  const UPLOADED_KEY = 'ControlEvent_ingreso_receipts_uploaded_v468';
  const $ = id => document.getElementById(id);
  const norm = v => String(v ?? '').trim();
  const up = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const same = (a,b) => String(a ?? '') === String(b ?? '');
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const cssEsc = v => { try{ return window.CSS?.escape ? CSS.escape(String(v ?? '')) : String(v ?? '').replace(/[^a-zA-Z0-9_-]/g, '\\$&'); }catch(_){ return String(v ?? '').replace(/"/g,'\\"'); } };

  function st(){
    try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ }
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  function role(){ try{ if(typeof authUser !== 'undefined' && authUser) return up(authUser.nivel); }catch(_){ } return up(window.authUser?.nivel || window.ControlEventApp?.authUser?.nivel || ''); }
  const canWrite = () => role() === 'GD' || role() === 'RW';
  function selectedId(){ try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ } return String(st().selectedEventId || ''); }
  function selectedEv(){ const id = selectedId(); try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return ev; }catch(_){ } return arr('eventos').find(e => same(e.id, id)) || null; }
  function isLockedSafe(){ try{ return typeof isLocked === 'function' ? !!isLocked() : up(selectedEv()?.situacion) === 'FINALIZADO'; }catch(_){ return false; } }
  function parseEuro(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').trim().replace(/\s/g,'').replace(/€/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function money(v){ try{ return (typeof window.money === 'function') ? window.money(Number(v || 0)) : new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(v||0)); }catch(_){ return `${Number(v||0).toFixed(2)} €`; } }
  function saveNow(){ try{ if(typeof saveState === 'function') return saveState(); }catch(_){ } try{ return window.saveState?.(); }catch(_){ } }
  function renderNow(){ try{ if(typeof render === 'function') return render(); }catch(_){ } try{ return window.render?.(); }catch(_){ } }
  function stop(ev){ try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ } return false; }
  function dataUrl(v){ return /^data:image\//i.test(String(v || '')); }
  function valueToSrc(value){
    if(!value) return '';
    if(typeof value === 'string') return value;
    if(typeof value === 'object') return value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || '';
    return '';
  }
  function ticketStore(){ const s = st(); if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {}; if(!s.ticketImageRefs || typeof s.ticketImageRefs !== 'object') s.ticketImageRefs = {}; return s.ticketImages; }
  function primaryKey(id){ return `${selectedId()}|INGRESO:${String(id || '')}`; }
  function imageKeyOnly(id){ return `INGRESO:${String(id || '')}`; }
  function receiptKeys(id){ const ev = selectedId(); const sid = String(id || ''); return [`${ev}|INGRESO:${sid}`, `${ev}|INGRESO|${sid}`, `INGRESO:${ev}|${sid}`]; }
  function jsonGet(key, fallback){ try{ return JSON.parse(localStorage.getItem(key) || '') || fallback; }catch(_){ return fallback; } }
  function jsonSet(key, value){ try{ localStorage.setItem(key, JSON.stringify(value || {})); }catch(_){ } }
  function backupMap(){ return jsonGet(BACKUP_KEY, {}); }
  function uploadedMap(){ return jsonGet(UPLOADED_KEY, {}); }
  function setUploaded(key){ const m = uploadedMap(); m[key] = Date.now(); jsonSet(UPLOADED_KEY, m); }
  function backupPut(key, src){ if(!key || !src) return; const m = backupMap(); m[key] = src; jsonSet(BACKUP_KEY, m); }
  function backupDelete(key){ const m = backupMap(); delete m[key]; jsonSet(BACKUP_KEY, m); }

  function receiptData(id){
    const keys = receiptKeys(id);
    const store = ticketStore();
    for(const k of keys){ const src = valueToSrc(store[k]); if(src) return src; }
    const refs = st().ticketImageRefs || {};
    for(const k of keys){ const src = valueToSrc(refs[k]); if(src) return src; }
    const bak = backupMap();
    for(const k of keys){ const src = valueToSrc(bak[k]); if(src) return src; }
    return '';
  }
  function setReceiptLocal(id, src, ref){
    const key = primaryKey(id);
    if(!src) return;
    const store = ticketStore();
    store[key] = src;
    if(ref && typeof ref === 'object') st().ticketImageRefs[key] = ref;
    if(dataUrl(src)) backupPut(key, src);
  }
  function deleteReceiptLocal(id){
    const store = ticketStore(); const refs = st().ticketImageRefs || {};
    receiptKeys(id).forEach(k => { try{ delete store[k]; delete refs[k]; backupDelete(k); }catch(_){ } });
  }
  function readImageAsDataUrl(file){
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }
  async function uploadReceiptToServer(id, src){
    const eventId = selectedId();
    if(!eventId || !id || !dataUrl(src)) return null;
    const key = imageKeyOnly(id);
    const res = await fetch('/api/ticket-images', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({eventId, key, dataUrl:src})});
    const payload = await res.json().catch(() => ({}));
    if(!res.ok || !payload.ok) throw new Error(payload.error || payload.message || 'No se pudo guardar el justificante en servidor.');
    const img = payload.image || {};
    const fullKey = img.key || primaryKey(id);
    const url = img.url || img.public_url || img.pathname || src;
    const store = ticketStore();
    store[fullKey] = url;
    if(fullKey !== primaryKey(id)) store[primaryKey(id)] = url;
    st().ticketImageRefs[fullKey] = {key:fullKey, url, pathname:img.pathname || url, contentType:img.contentType || img.content_type || '', size:img.size || img.size_bytes || 0};
    setUploaded(primaryKey(id)); setUploaded(fullKey);
    return url;
  }
  async function deleteReceiptFromServer(id){
    const eventId = selectedId(); if(!eventId || !id) return;
    try{ await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId)}&key=${encodeURIComponent(imageKeyOnly(id))}`, {method:'DELETE'}); }catch(_){ }
  }
  async function hydrateEventReceipts(force){
    const eventId = selectedId(); if(!eventId) return;
    hydrateEventReceipts._last = hydrateEventReceipts._last || new Map();
    const last = hydrateEventReceipts._last.get(eventId) || 0;
    if(!force && Date.now() - last < 12000) return;
    hydrateEventReceipts._last.set(eventId, Date.now());
    try{
      const res = await fetch(`/api/ticket-images?eventId=${encodeURIComponent(eventId)}`, {cache:'no-store'});
      const payload = await res.json().catch(() => ({}));
      if(!res.ok || !payload.ok || !payload.images) return;
      const store = ticketStore(); const refs = st().ticketImageRefs || {};
      Object.entries(payload.images || {}).forEach(([key, value]) => {
        if(!/\|INGRESO[:|]/i.test(key) && !/^INGRESO[:|]/i.test(key)) return;
        const src = valueToSrc(value);
        if(!src) return;
        store[key] = src;
        refs[key] = typeof value === 'object' ? {...value, key, url:src, pathname:value.pathname || src} : {key, url:src, pathname:src};
      });
      compactIngresoReceipts(); enrichOpenTooltips();
    }catch(_){ }
  }
  async function migrateLocalIngresoReceipts(){
    const store = ticketStore();
    const bak = backupMap();
    // 1) Cualquier justificante local que este en state pasa a la copia local persistente.
    Object.entries(store).forEach(([key, value]) => { const src=valueToSrc(value); if(/\|INGRESO[:|]/i.test(key) && dataUrl(src)) backupPut(key, src); });
    // 2) Si una copia local no esta en state, se reinyecta para que no desaparezca al cambiar de version.
    Object.entries(bak).forEach(([key, src]) => { if(/\|INGRESO[:|]/i.test(key) && src && !valueToSrc(store[key])) store[key] = src; });
    // 3) Subida diferida al almacen de imagenes para que deje de depender del estado/localStorage.
    const uploaded = uploadedMap();
    for(const [key, src] of Object.entries({...bak, ...store})){
      if(!/\|INGRESO[:|]/i.test(key) || !dataUrl(valueToSrc(src)) || uploaded[key]) continue;
      const parts = String(key).split('|');
      if(String(parts[0]) !== selectedId()) continue;
      const label = parts.slice(1).join('|');
      const id = label.replace(/^INGRESO[:|]/i, '');
      if(!id) continue;
      try{ await uploadReceiptToServer(id, valueToSrc(src)); saveNow(); }catch(_){ }
    }
  }

  function byId(list,id){ return arr(list).find(x => same(x?.id, id)) || null; }
  function personaBy(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id) || {}; }catch(_){ return byId('personas', id) || {}; } }
  function personName(id){ return personaBy(id).nombre || ''; }
  function collabRows(){
    try{ const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : null; if(Array.isArray(rows)) return rows.slice(); }catch(_){ }
    const ev = selectedEv(); const eventId = selectedId(); const price = parseEuro(ev?.precio || 0);
    return arr('colaboradores').filter(r => same(r.eventId, eventId)).map(r => {
      const persona = personaBy(r.personaId); const esSocio = up(persona?.rango) === 'SOCIO';
      const base = esSocio ? price * Number(r.numero || 0) : 0;
      const importe = parseEuro(r.importe || r.importeVoluntario || 0);
      return {...r, persona, base, total:base + importe};
    });
  }
  function incomeTotal(row){ if(row?.total !== undefined) return parseEuro(row.total); return parseEuro(row?.base || 0) + parseEuro(row?.importe || row?.importeVoluntario || 0); }
  function ingresoInfo(id){
    const enriched = collabRows().find(x => same(x.id, id)) || null;
    const raw = arr('colaboradores').find(x => same(x.id, id)) || null;
    const row = enriched || raw || {};
    const persona = row.persona || personaBy(row.personaId);
    const rango = persona?.rango || row.rango || row.personaRango || '';
    const nombre = persona?.nombre || personName(row.personaId) || 'Sin nombre';
    const parts = row.__ceV259Parts || {};
    const obligatorio = parseEuro(parts.obligatorio ?? row.base ?? row.importeObligatorio ?? 0);
    const voluntario = parseEuro(parts.voluntario ?? row.donation ?? row.importeVoluntario ?? row.voluntario ?? row.importe ?? 0);
    const total = parseEuro(parts.total ?? row.total ?? (obligatorio + voluntario));
    return {id, row, nombre, rango, situacion: row.situacion || row.ingreso || row.formaPago || 'Pendiente', numero:Number(row.numero || 0), obligatorio, voluntario, total};
  }

  function injectStyle(){
    if($('ceV469FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV469FinalStyle';
    style.textContent = `
      .ce-v468-modified-product,.ce-v468-modified-product *{font-weight:900!important;}
      .ce-v468-modified-product input,.ce-v468-modified-product select,.ce-v468-modified-product textarea,.ce-v468-modified-product button{font-weight:900!important;}
      .ce-v468-modal{position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:1000001;display:flex;align-items:center;justify-content:center;padding:18px;animation:ceV468ModalIn .18s ease-out both;}
      .ce-v468-modal-card{max-width:min(1080px,96vw);max-height:94vh;background:#fff;border-radius:18px;box-shadow:0 26px 86px rgba(0,0,0,.44);padding:13px;display:grid;grid-template-columns:minmax(260px,360px) minmax(320px,1fr);gap:12px;color:#0f172a;}
      .ce-v468-modal-head{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:950;}
      .ce-v468-modal-info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:10px;align-self:start;}
      .ce-v468-modal-info h3{margin:0 0 8px;font-size:16px;}
      .ce-v468-modal-info table{width:100%;border-collapse:separate;border-spacing:0 5px;font-size:13px;}
      .ce-v468-modal-info td:first-child{font-weight:900;color:#475569;padding-right:8px;}
      .ce-v468-modal-info td:last-child{text-align:right;font-weight:850;}
      .ce-v468-modal-img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:13px;background:#f1f5f9;justify-self:center;align-self:center;}
      @keyframes ceV468ModalIn{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}
      @media(max-width:720px){.ce-v468-modal-card{grid-template-columns:1fr;}.ce-v468-modal-img{max-height:62vh;}}
    `;
    document.head.appendChild(style);
  }

  function captureScroll(){ const data={x:window.scrollX||0,y:window.scrollY||0,els:[]}; ['mainTabs','collabList','comprasList','donacionesList','personasList','eventosList','tiendasList','productosList','accesoList','budgetLayout','eventChartWrap'].forEach(id=>{const el=$(id); if(el) data.els.push([id,el.scrollLeft||0,el.scrollTop||0]);}); return data; }
  function restoreScroll(data){ if(!data) return; const run=()=>{try{window.scrollTo(data.x||0,data.y||0);}catch(_){} (data.els||[]).forEach(([id,x,y])=>{const el=$(id); if(el){try{el.scrollLeft=x; el.scrollTop=y;}catch(_){}}});}; [0,40,120,260].forEach(ms=>setTimeout(run,ms)); }

  let lastTooltipSnapshot = null;
  function isVisibleTip(el){ if(!el) return false; const cs=getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.classList.contains('open') || el.offsetParent !== null || el.getBoundingClientRect().width > 0); }
  function captureTooltipSnapshot(){
    const tips = ['ceTooltipV21','ceBudgetLiteTooltipV307'].map(id => $(id)).filter(isVisibleTip);
    if(!tips.length) return null;
    return tips.map(el => ({id:el.id, html:el.outerHTML, scrollTop:el.scrollTop || 0, scrollLeft:el.scrollLeft || 0}));
  }
  function restoreTooltipSnapshot(snapshot){
    if(!snapshot || !snapshot.length) return;
    snapshot.forEach(item => {
      let el = $(item.id);
      if(isVisibleTip(el)) return;
      try{ if(el) el.remove(); }catch(_){ }
      const holder = document.createElement('div'); holder.innerHTML = item.html;
      const restored = holder.firstElementChild;
      if(!restored) return;
      restored.setAttribute('data-ce-restored-tooltip-v468','1');
      if(item.id === 'ceBudgetLiteTooltipV307') restored.classList.add('open');
      document.body.appendChild(restored);
      try{ restored.scrollTop = item.scrollTop || 0; restored.scrollLeft = item.scrollLeft || 0; }catch(_){ }
    });
    setTimeout(enrichOpenTooltips, 30);
  }
  function closeReceiptModal(ov, snapshot, ev){
    stop(ev || {});
    try{ if(ov && ov.__ceKeepTooltipTimer) clearInterval(ov.__ceKeepTooltipTimer); }catch(_){ }
    try{ ov.remove(); }catch(_){ }
    document.body.classList.remove('ce-v468-preserve-tooltips');
    restoreTooltipSnapshot(snapshot || lastTooltipSnapshot);
    [0,40,120,240].forEach(ms => setTimeout(() => { try{ enrichOpenTooltips(); restoreTooltipSnapshot(snapshot || lastTooltipSnapshot); }catch(_){ } }, ms));
    return false;
  }
  function showReceiptModal(id, ev){
    const src = receiptData(id);
    if(!src){ alert('Este ingreso no tiene justificante adjunto.'); return false; }
    const snapshot = captureTooltipSnapshot(); lastTooltipSnapshot = snapshot;
    document.body.classList.add('ce-v468-preserve-tooltips');
    const info = ingresoInfo(id);
    const ov = document.createElement('div');
    ov.className = 'ce-v468-modal';
    ov.setAttribute('data-ce-preserve-tooltip','1');
    ov.innerHTML = `<div class="ce-v468-modal-card" role="dialog" aria-modal="true">
      <div class="ce-v468-modal-head"><span>Justificante de ingreso</span><button type="button" class="outline small" data-close="1">Cerrar</button></div>
      <div class="ce-v468-modal-info"><h3>${esc(info.nombre)}</h3><table><tbody>
        <tr><td>Situación</td><td>${esc(info.situacion)}</td></tr>
        <tr><td>Rango</td><td>${esc(info.rango || '-')}</td></tr>
        <tr><td>Nº personas</td><td>${esc(info.numero)}</td></tr>
        <tr><td>Importe obligatorio</td><td>${esc(money(info.obligatorio))}</td></tr>
        <tr><td>Importe voluntario</td><td>${esc(money(info.voluntario))}</td></tr>
        <tr><td>Total ingreso</td><td>${esc(money(info.total))}</td></tr>
      </tbody></table></div>
      <img class="ce-v468-modal-img" alt="Justificante de ingreso" src="${esc(src)}">
    </div>`;
    document.body.appendChild(ov);
    // v50.1: mantener vivo/restaurado el globo origen mientras el visor esta encima.
    try{
      ov.__ceKeepTooltipTimer = setInterval(() => restoreTooltipSnapshot(snapshot || lastTooltipSnapshot), 250);
      [20,90,220,520].forEach(ms => setTimeout(() => restoreTooltipSnapshot(snapshot || lastTooltipSnapshot), ms));
    }catch(_){ }
    ov.addEventListener('pointerdown', e => { try{ e.stopPropagation(); e.stopImmediatePropagation(); }catch(_){ } }, true);
    ov.addEventListener('wheel', e => { try{ e.stopPropagation(); }catch(_){ } }, true);
    ov.addEventListener('click', e => { if(e.target === ov || e.target?.closest?.('[data-close]')) return closeReceiptModal(ov, snapshot, e); try{ e.stopPropagation(); }catch(_){ } }, true);
    try{ ov.querySelector('[data-close]')?.focus({preventScroll:true}); }catch(_){ }
    return stop(ev || {});
  }
  async function attachReceipt(id, ev){
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return stop(ev || {}); }
    if(isLockedSafe()){ alert('Evento finalizado. No se puede modificar.'); return stop(ev || {}); }
    const scroll = captureScroll();
    const input = document.createElement('input'); input.type='file'; input.accept='image/*'; input.style.position='fixed'; input.style.left='-9999px'; input.style.top='-9999px';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      try{
        const file = input.files && input.files[0]; if(!file) return;
        if(!/^image\//i.test(file.type || '')){ alert('Selecciona una imagen para el justificante.'); return; }
        const src = await readImageAsDataUrl(file);
        setReceiptLocal(id, src); compactIngresoReceipts(); renderNow(); restoreScroll(scroll);
        try{ const url = await uploadReceiptToServer(id, src); if(url) setReceiptLocal(id, url, {key:primaryKey(id), url, pathname:url}); }catch(error){ console.warn('[v50.1] justificante no subido, queda copia local/estado', error); }
        saveNow();
        [80,220,520,1000].forEach(ms => setTimeout(() => { compactIngresoReceipts(); enrichOpenTooltips(); restoreScroll(scroll); }, ms));
      }catch(error){ alert('No se pudo adjuntar el justificante. ' + (error?.message || error)); restoreScroll(scroll); }
      finally{ try{ input.remove(); }catch(_){ } }
    }, {once:true});
    input.click();
    return stop(ev || {});
  }
  async function removeReceipt(id, ev){
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return stop(ev || {}); }
    if(isLockedSafe()){ alert('Evento finalizado. No se puede modificar.'); return stop(ev || {}); }
    if(!confirm('¿Eliminar el justificante de este ingreso?')) return stop(ev || {});
    const scroll = captureScroll();
    deleteReceiptLocal(id); await deleteReceiptFromServer(id); saveNow(); renderNow(); restoreScroll(scroll);
    [80,220,520,1000].forEach(ms => setTimeout(() => { compactIngresoReceipts(); enrichOpenTooltips(); restoreScroll(scroll); }, ms));
    return stop(ev || {});
  }

  function collabCardId(card){ return card?.querySelector?.('button[data-action="save-collab"][data-id],button[data-action="delete-collab"][data-id],select[data-action="edit-collab-persona"][data-id],input[data-action="edit-collab-numero"][data-id],[data-action="edit-collab-situacion"][data-id]')?.dataset?.id || ''; }
  function compactIngresoReceipts(){
    return;
    injectStyle();
    const wrap = $('collabList'); if(!wrap) return;
    wrap.querySelectorAll('.ce-ingreso-receipt-tools-v463,.ce-v464-receipt-tools').forEach(el => { try{ el.remove(); }catch(_){ } });
    wrap.querySelectorAll('.itemcard,.rowline,.card').forEach(card => {
      const id = collabCardId(card); if(!id) return;
      let box = card.querySelector('.ce-v465-receipt-strip');
      const src = receiptData(id);
      const html = `${src ? `<button type="button" class="ce-v465-receipt-thumb" title="Ver justificante" data-action="ingreso-receipt-view-v465" data-id="${esc(id)}"><img alt="Justificante" src="${esc(src)}"></button>` : `<span class="ce-v465-receipt-empty" title="Sin justificante">📷</span>`}<button type="button" class="ce-v465-receipt-btn" title="${src ? 'Cambiar justificante' : 'Adjuntar justificante'}" data-action="ingreso-receipt-add-v465" data-id="${esc(id)}">📎</button>${src ? `<button type="button" class="ce-v465-receipt-btn danger" title="Eliminar justificante" data-action="ingreso-receipt-delete-v465" data-id="${esc(id)}">🗑</button>` : ''}`;
      if(box){ box.innerHTML = html; box.dataset.receiptHas = String(!!src); return; }
      box = document.createElement('div'); box.className='ce-v465-receipt-strip'; box.dataset.receiptHas=String(!!src); box.innerHTML=html;
      const actions = card.querySelector('button[data-action="save-collab"]')?.parentElement || card.querySelector('button[data-action="delete-collab"]')?.parentElement || card;
      try{ actions.appendChild(box); }catch(_){ card.appendChild(box); }
    });
  }
  function findReceiptForDisplay(name, amount, situacion){
    const n=up(name), a=parseEuro(amount), s=up(situacion);
    const rows = collabRows().filter(r => receiptData(r.id));
    let found = rows.find(r => up(r.persona?.nombre || personName(r.personaId)) === n && (Math.abs(incomeTotal(r) - a) < .011 || !Number.isFinite(a) || a === 0) && (!s || up(r.situacion || r.ingreso || 'Pendiente') === s));
    if(!found) found = rows.find(r => up(r.persona?.nombre || personName(r.personaId)) === n && (Math.abs(incomeTotal(r) - a) < .011 || !Number.isFinite(a) || a === 0));
    return found || null;
  }
  function thumbCellFor(id, tag){ const src=receiptData(id); return src ? `<button type="button" class="ce-v465-tip-thumb" title="Ver justificante" data-id="${esc(id)}" data-from="${esc(tag||'tip')}"><img alt="Justificante" src="${esc(src)}"></button>` : `<span class="ce-v465-tip-empty"></span>`; }
  function enrichGraphTooltip(){
    const tip=$('ceTooltipV21'); if(!tip || tip.style.display === 'none') return;
    tip.querySelectorAll('table.ce-v21-table').forEach(table => {
      if(table.dataset.ceV468Receipts === '1' || table.dataset.ceV465Receipts === '1'){ table.dataset.ceV468Receipts='1'; return; }
      const rows = Array.from(table.querySelectorAll('tr')); if(!rows.length) return;
      const headCells = Array.from(rows[0].children).map(td => up(td.textContent));
      if(!(headCells.includes('NOMBRE') && headCells.includes('INGRESO') && headCells.includes('IMPORTE'))) return;
      const th=document.createElement('td'); th.className='ce-v465-thumb-cell'; th.textContent='Just.'; rows[0].appendChild(th);
      rows.slice(1).forEach(tr => { const cells=Array.from(tr.children); if(cells.length<3) return; const found=findReceiptForDisplay(cells[0].textContent, cells[cells.length-1].textContent, cells[1].textContent); const td=document.createElement('td'); td.className='ce-v465-thumb-cell'; td.innerHTML=found ? thumbCellFor(found.id,'graficas') : '<span class="ce-v465-tip-empty"></span>'; tr.appendChild(td); });
      table.dataset.ceV468Receipts='1'; table.dataset.ceV465Receipts='1';
    });
  }
  function enrichBudgetTooltip(){
    const box=$('ceBudgetLiteTooltipV307'); if(!box || !box.classList.contains('open')) return;
    const title=up(box.querySelector('.ce-budget-lite-title')?.textContent || ''); if(!/INGRESADO/.test(title)) return;
    box.querySelectorAll('table.ce-budget-lite-table').forEach(table => {
      if(table.dataset.ceV468Receipts === '1' || table.dataset.ceV465Receipts === '1'){ table.dataset.ceV468Receipts='1'; return; }
      const heads=Array.from(table.querySelectorAll('thead th')).map(th => up(th.textContent));
      if(!(heads.includes('NOMBRE') && heads.includes('INGRESADO') && heads.includes('TOTAL'))) return;
      const hr=table.querySelector('thead tr'); if(hr){ const th=document.createElement('th'); th.className='ce-v465-thumb-cell'; th.textContent='Just.'; hr.appendChild(th); }
      const idxName=heads.indexOf('NOMBRE'), idxTotal=heads.indexOf('TOTAL');
      Array.from(table.querySelectorAll('tbody tr')).forEach(tr => { const cells=Array.from(tr.children); if(cells.length<=Math.max(idxName, idxTotal)) return; const found=findReceiptForDisplay(cells[idxName].textContent, cells[idxTotal].textContent, ''); const td=document.createElement('td'); td.className='ce-v465-thumb-cell'; td.innerHTML=found ? thumbCellFor(found.id,'resumen') : '<span class="ce-v465-tip-empty"></span>'; tr.appendChild(td); });
      table.dataset.ceV468Receipts='1'; table.dataset.ceV465Receipts='1';
    });
  }
  function dedupeReceiptThumbColumns(){
    document.querySelectorAll('#ceTooltipV21 table,#ceBudgetLiteTooltipV307 table').forEach(table => {
      const rows = Array.from(table.querySelectorAll('tr'));
      if(!rows.length) return;
      const first = rows[0];
      const markers = Array.from(first.children).map((cell, idx) => ({cell, idx})).filter(x => x.cell.classList?.contains('ce-v465-thumb-cell') || /^\s*JUST\.?\s*$/i.test(String(x.cell.textContent || '').normalize('NFD').replace(/[̀-ͯ]/g,'').toUpperCase()));
      if(markers.length <= 1){ table.dataset.ceV465Receipts='1'; table.dataset.ceV468Receipts='1'; return; }
      const keep = markers[0].idx;
      const remove = markers.slice(1).map(x => x.idx).sort((a,b)=>b-a);
      rows.forEach(tr => {
        const cells = Array.from(tr.children);
        remove.forEach(idx => { try{ cells[idx]?.remove(); }catch(_){ } });
      });
      table.dataset.ceV465Receipts='1'; table.dataset.ceV468Receipts='1';
    });
  }
  function enrichOpenTooltips(){ enrichGraphTooltip(); enrichBudgetTooltip(); dedupeReceiptThumbColumns(); }

  const modifiedProducts = new Set();
  function productNodes(id){
    const safe = cssEsc(id);
    const wrap = $('productosList') || document;
    const selectors = [
      `button[data-action="save-producto"][data-id="${safe}"]`,
      `input[data-action="edit-producto-nombre"][data-id="${safe}"]`,
      `select[data-action="edit-producto-segmento"][data-id="${safe}"]`,
      `select[data-action="edit-producto-destino"][data-id="${safe}"]`,
      `input[data-action="edit-producto-precio"][data-id="${safe}"]`,
      `[data-id="${safe}"]`
    ];
    const found = [];
    selectors.forEach(sel => { try{ wrap.querySelectorAll(sel).forEach(el => { if(el && !found.includes(el)) found.push(el); }); }catch(_){ } });
    return found;
  }
  function commonContainer(nodes){
    if(!nodes || !nodes.length) return null;
    const preferred = nodes[0].closest?.('.itemcard,.rowline,.card,tr,li,[data-record-id],.maintenance-card,.product-card,.producto-card,.grid-card');
    if(preferred && nodes.every(n => preferred.contains(n))) return preferred;
    let cur = nodes[0];
    while(cur && cur !== document.body){
      if(nodes.every(n => cur.contains(n)) && cur.id !== 'productosList') return cur;
      cur = cur.parentElement;
    }
    return preferred || nodes[0];
  }
  function markBoldElement(el){
    if(!el) return;
    try{ el.classList.add('ce-v468-modified-product','ce-v464-modified','ce-v46-modified'); }catch(_){ }
    try{ el.style.setProperty('font-weight','900','important'); }catch(_){ }
    try{ el.querySelectorAll('*').forEach(child => child.style.setProperty('font-weight','900','important')); }catch(_){ }
  }
  function productCard(id){
    const nodes = productNodes(id);
    return commonContainer(nodes);
  }
  function applyProductBold(){
    modifiedProducts.forEach(id => {
      const nodes = productNodes(id);
      const card = commonContainer(nodes);
      if(card) markBoldElement(card);
      nodes.forEach(n => { markBoldElement(n); const field=n.closest?.('.field'); if(field) markBoldElement(field); });
    });
  }
  function rememberProductModified(btn){
    const id=btn?.dataset?.id || '';
    if(!id) return;
    modifiedProducts.add(String(id));
    try{ localStorage.setItem('ControlEvent_productos_modificados_v469', JSON.stringify(Array.from(modifiedProducts))); }catch(_){ }
    [0,30,80,160,320,640,1000,1800,3200,5200].forEach(ms => setTimeout(applyProductBold, ms));
  }
  try{ JSON.parse(localStorage.getItem('ControlEvent_productos_modificados_v469') || '[]').forEach(id => modifiedProducts.add(String(id))); }catch(_){ }

  function applyVersion(){
    try{ document.title = VERSION; document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+(?:\.\d+){1,2}/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
  }
  function handleClick(ev){
    const btn = ev.target?.closest?.('[data-action="ingreso-receipt-add-v465"],[data-action="ingreso-receipt-view-v465"],[data-action="ingreso-receipt-delete-v465"],.ce-v465-tip-thumb,button[data-action="save-producto"]');
    if(!btn) return;
    if(btn.matches('button[data-action="save-producto"]')){ rememberProductModified(btn); return; }
    const id = btn.dataset.id || ''; if(!id) return;
    if(btn.matches('.ce-v465-tip-thumb') || btn.dataset.action === 'ingreso-receipt-view-v465') return showReceiptModal(id, ev);
    if(btn.dataset.action === 'ingreso-receipt-add-v465') return attachReceipt(id, ev);
    if(btn.dataset.action === 'ingreso-receipt-delete-v465') return removeReceipt(id, ev);
  }
  function keepInside(ev){ if(ev.target?.closest?.('#ceTooltipV21,#ceBudgetLiteTooltipV307,.ce-v468-modal')){ try{ ev.stopPropagation(); }catch(_){ } } }

  let mo = null;
  function installObserver(){
    if(mo) return;
    mo = new MutationObserver(() => { if(installObserver._t) clearTimeout(installObserver._t); installObserver._t = setTimeout(() => { compactIngresoReceipts(); enrichOpenTooltips(); applyProductBold(); applyVersion(); }, 80); });
    try{ mo.observe(document.body, {childList:true, subtree:true}); }catch(_){ }
  }
  function wrapRender(){
    const old = (typeof render === 'function') ? render : window.render;
    if(!old || old.__ceV468Wrapped) return;
    const wrapped = function(){ const ret = old.apply(this, arguments); [40,120,300,700].forEach(ms => setTimeout(() => { compactIngresoReceipts(); enrichOpenTooltips(); applyProductBold(); hydrateEventReceipts(false); applyVersion(); }, ms)); return ret; };
    wrapped.__ceV468Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  function install(){
    injectStyle(); applyVersion(); migrateLocalIngresoReceipts(); hydrateEventReceipts(false); compactIngresoReceipts(); enrichOpenTooltips(); applyProductBold(); wrapRender(); installObserver();
  }

  window.addEventListener('click', handleClick, true); // window-capture: se adelanta al manejador v46.7/v46.8 de document.
  document.addEventListener('wheel', keepInside, true);
  document.addEventListener('scroll', keepInside, true);
  document.addEventListener('touchmove', keepInside, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape'){ const m=document.querySelector('.ce-v468-modal'); if(m) return closeReceiptModal(m, lastTooltipSnapshot, ev); } }, true);
  document.addEventListener('click', () => setTimeout(enrichOpenTooltips, 40), true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,80,260,700,1500,3000,6000].forEach(ms => setTimeout(install, ms));
  setInterval(() => { hydrateEventReceipts(false); compactIngresoReceipts(); enrichOpenTooltips(); applyProductBold(); applyVersion(); }, 2200);
  window.ControlEventV469 = {version:VERSION, versionFile:VERSION_FILE, hydrateEventReceipts, migrateLocalIngresoReceipts, compactIngresoReceipts, showReceiptModal, applyProductBold};
})();
