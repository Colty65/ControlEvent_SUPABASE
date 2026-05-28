/* ControlEvent v50.10 - justificantes compactos, miniaturas en globos y ordenación estable de productos.
   - INGRESOS: adjuntar/eliminar justificante con controles compactos y miniatura clicable.
   - Resumen presupuestario y GRAFICAS: miniatura del justificante en globos de ingresos.
   - Los globos no se cierran al usar su propia ruleta/ascensor.
*/
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.10';
  const VERSION_FILE = 'ControlEvent_v50_10';
  const INSTALLED = '__ceV465FinalFixes';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

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
  function role(){
    try{ if(typeof authUser !== 'undefined' && authUser) return up(authUser.nivel); }catch(_){ }
    return up(window.authUser?.nivel || window.ControlEventApp?.authUser?.nivel || '');
  }
  const canWrite = () => role() === 'GD' || role() === 'RW';
  function selectedId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return String(ev.id); }catch(_){ }
    return String(st().selectedEventId || '');
  }
  function selectedEv(){
    const id = selectedId();
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return ev; }catch(_){ }
    return arr('eventos').find(e => same(e.id, id)) || null;
  }
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

  function byId(list,id){ return arr(list).find(x => same(x?.id, id)) || null; }
  function personaBy(id){ try{ return (typeof personaById === 'function' ? personaById(id) : null) || byId('personas', id) || {}; }catch(_){ return byId('personas', id) || {}; } }
  function personName(id){ return personaBy(id).nombre || ''; }
  function collabRows(){
    try{ const rows = typeof collabsForEvent === 'function' ? collabsForEvent() : null; if(Array.isArray(rows)) return rows.slice(); }catch(_){ }
    const ev = selectedEv(); const eventId = selectedId(); const price = parseEuro(ev?.precio || 0);
    return arr('colaboradores').filter(r => same(r.eventId, eventId)).map(r => {
      const persona = personaBy(r.personaId);
      const base = price * Number(r.numero || 0);
      const importe = parseEuro(r.importe || r.importeVoluntario || 0);
      return {...r, persona, base, total:base + importe};
    });
  }
  function incomeTotal(row){
    if(row?.total !== undefined) return parseEuro(row.total);
    const ev = selectedEv();
    return parseEuro(ev?.precio || 0) * Number(row?.numero || 0) + parseEuro(row?.importe || row?.importeVoluntario || 0);
  }
  function ingresoInfo(id){
    const row = arr('colaboradores').find(x => same(x.id, id)) || collabRows().find(x => same(x.id, id)) || {};
    const persona = row.persona || personaBy(row.personaId);
    const rango = persona?.rango || '';
    const nombre = persona?.nombre || personName(row.personaId) || 'Sin nombre';
    const ev = selectedEv();
    const precio = parseEuro(ev?.precio || 0);
    const numero = Number(row.numero || 0);
    const obligatorio = precio * numero;
    const voluntario = parseEuro(row.importe || row.importeVoluntario || 0);
    const total = row.total !== undefined ? parseEuro(row.total) : obligatorio + voluntario;
    return {id, row, nombre, rango, situacion: row.situacion || row.ingreso || 'Pendiente', numero, obligatorio, voluntario, total};
  }

  function receiptStore(){ const s = st(); if(!s.ticketImages || typeof s.ticketImages !== 'object') s.ticketImages = {}; return s.ticketImages; }
  function receiptPrimaryKey(id){ return `${selectedId()}|INGRESO:${String(id || '')}`; }
  function receiptKeys(id){ const ev = selectedId(); const sid = String(id || ''); return [`${ev}|INGRESO:${sid}`, `${ev}|INGRESO|${sid}`, `INGRESO:${ev}|${sid}`]; }
  function receiptData(id){ const store = receiptStore(); for(const k of receiptKeys(id)){ if(store[k]) return store[k]; } return ''; }
  function setReceipt(id, data){ receiptStore()[receiptPrimaryKey(id)] = data; }
  function deleteReceipt(id){ const store = receiptStore(); receiptKeys(id).forEach(k => { try{ delete store[k]; }catch(_){ } }); }
  function readImageAsDataUrl(file){
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer la imagen.'));
      reader.readAsDataURL(file);
    });
  }

  function injectStyle(){
    if($('ceV465FinalStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV465FinalStyle';
    style.textContent = `
      .ce-ingreso-receipt-tools-v463,.ce-v464-receipt-tools{display:none!important;visibility:hidden!important;width:0!important;height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;}
      .ce-v465-receipt-strip{display:inline-flex!important;gap:5px!important;align-items:center!important;justify-content:flex-start!important;flex-wrap:nowrap!important;margin:2px 0!important;vertical-align:middle!important;max-width:118px!important;}
      .ce-v465-receipt-btn,.ce-v465-receipt-thumb,.ce-v465-tip-thumb{appearance:none;border:1px solid #cbd5e1;background:#fff;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 1px 2px rgba(15,23,42,.08);}
      .ce-v465-receipt-btn{width:28px!important;height:28px!important;min-width:28px!important;min-height:28px!important;padding:0!important;font-size:14px!important;}
      .ce-v465-receipt-btn.danger{border-color:#fecaca;background:#fff5f5;color:#991b1b;}
      .ce-v465-receipt-thumb{width:34px!important;height:34px!important;min-width:34px!important;padding:0!important;overflow:hidden!important;background:#f8fafc!important;}
      .ce-v465-receipt-thumb img,.ce-v465-tip-thumb img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important;}
      .ce-v465-receipt-empty{width:34px;height:34px;border:1px dashed #cbd5e1;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;color:#64748b;background:#f8fafc;font-size:13px;}
      .ce-v465-modal{position:fixed;inset:0;background:rgba(15,23,42,.76);z-index:1000000;display:flex;align-items:center;justify-content:center;padding:18px;animation:ceV465ModalIn .18s ease-out both;}
      .ce-v465-modal-card{max-width:min(1080px,96vw);max-height:94vh;background:#fff;border-radius:18px;box-shadow:0 26px 86px rgba(0,0,0,.44);padding:13px;display:grid;grid-template-columns:minmax(260px,360px) minmax(320px,1fr);gap:12px;color:#0f172a;}
      .ce-v465-modal-head{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:12px;font-weight:950;}
      .ce-v465-modal-info{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:10px;align-self:start;}
      .ce-v465-modal-info h3{margin:0 0 8px;font-size:16px;}
      .ce-v465-modal-info table{width:100%;border-collapse:separate;border-spacing:0 5px;font-size:13px;}
      .ce-v465-modal-info td:first-child{font-weight:900;color:#475569;padding-right:8px;}
      .ce-v465-modal-info td:last-child{text-align:right;font-weight:800;}
      .ce-v465-modal-img{max-width:100%;max-height:78vh;object-fit:contain;border-radius:13px;background:#f1f5f9;justify-self:center;align-self:center;}
      .ce-v465-tip-thumb{width:34px!important;height:34px!important;min-width:34px!important;padding:0!important;overflow:hidden!important;background:#f8fafc!important;}
      .ce-v465-tip-empty{display:inline-block;width:34px;height:34px;}
      #ceTooltipV21 .ce-v21-table td.ce-v465-thumb-cell,#ceBudgetLiteTooltipV307 .ce-budget-lite-table td.ce-v465-thumb-cell{text-align:center!important;vertical-align:middle!important;min-width:42px!important;}
      #ceTooltipV21 .ce-v21-table tr:first-child td.ce-v465-thumb-cell,#ceBudgetLiteTooltipV307 .ce-budget-lite-table th.ce-v465-thumb-cell{font-weight:950!important;text-align:center!important;}
      @keyframes ceV465ModalIn{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:scale(1)}}
      @media(max-width:720px){.ce-v465-modal-card{grid-template-columns:1fr;}.ce-v465-modal-img{max-height:62vh;}}
    `;
    document.head.appendChild(style);
  }

  function captureScroll(){
    const data = {x:window.scrollX || 0, y:window.scrollY || 0, els:[]};
    ['collabList','mainTabs','budgetLayout','eventChartWrap'].forEach(id => { const el=$(id); if(el) data.els.push([id, el.scrollLeft || 0, el.scrollTop || 0]); });
    return data;
  }
  function restoreScroll(data){
    if(!data) return;
    const run = () => { try{ window.scrollTo(data.x || 0, data.y || 0); }catch(_){ } (data.els || []).forEach(([id,x,y]) => { const el=$(id); if(el){ try{ el.scrollLeft=x; el.scrollTop=y; }catch(_){ } } }); };
    [0,40,120,260].forEach(ms => setTimeout(run, ms));
  }

  function showReceiptModal(id){
    const data = receiptData(id);
    if(!data){ alert('Este ingreso no tiene justificante adjunto.'); return; }
    const info = ingresoInfo(id);
    const ov = document.createElement('div');
    ov.className = 'ce-v465-modal';
    ov.innerHTML = `<div class="ce-v465-modal-card" role="dialog" aria-modal="true">
      <div class="ce-v465-modal-head"><span>Justificante de ingreso</span><button type="button" class="outline small" data-close="1">Cerrar</button></div>
      <div class="ce-v465-modal-info"><h3>${esc(info.nombre)}</h3><table><tbody>
        <tr><td>Situación</td><td>${esc(info.situacion)}</td></tr>
        <tr><td>Rango</td><td>${esc(info.rango || '-')}</td></tr>
        <tr><td>Nº personas</td><td>${esc(info.numero)}</td></tr>
        <tr><td>Importe obligatorio</td><td>${esc(money(info.obligatorio))}</td></tr>
        <tr><td>Importe voluntario</td><td>${esc(money(info.voluntario))}</td></tr>
        <tr><td>Total ingreso</td><td>${esc(money(info.total))}</td></tr>
      </tbody></table></div>
      <img class="ce-v465-modal-img" alt="Justificante de ingreso" src="${esc(data)}">
    </div>`;
    document.body.appendChild(ov);
    try{ ov.querySelector('[data-close]')?.focus({preventScroll:true}); }catch(_){ }
    ov.addEventListener('click', e => { if(e.target === ov || e.target?.closest?.('[data-close]')) ov.remove(); });
  }
  async function attachReceipt(id){
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return; }
    if(isLockedSafe()){ alert('Evento finalizado. No se puede modificar.'); return; }
    const scroll = captureScroll();
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.style.position = 'fixed'; input.style.left = '-9999px'; input.style.top = '-9999px';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      try{
        const file = input.files && input.files[0];
        if(!file) return;
        if(!/^image\//i.test(file.type || '')){ alert('Selecciona una imagen para el justificante.'); return; }
        const data = await readImageAsDataUrl(file);
        setReceipt(id, data);
        saveNow(); renderNow(); restoreScroll(scroll);
        [80,220,520,1000].forEach(ms => setTimeout(() => { compactIngresoReceipts(); enrichOpenTooltips(); }, ms));
      }catch(error){ alert('No se pudo adjuntar el justificante. ' + (error?.message || error)); restoreScroll(scroll); }
      finally{ try{ input.remove(); }catch(_){ } }
    }, {once:true});
    input.click();
  }
  function removeReceipt(id){
    if(!canWrite()){ alert('No autorizado para modificar justificantes.'); return; }
    if(isLockedSafe()){ alert('Evento finalizado. No se puede modificar.'); return; }
    if(!confirm('¿Eliminar el justificante de este ingreso?')) return;
    const scroll = captureScroll();
    deleteReceipt(id); saveNow(); renderNow(); restoreScroll(scroll);
    [80,220,520,1000].forEach(ms => setTimeout(() => { compactIngresoReceipts(); enrichOpenTooltips(); }, ms));
  }

  function collabCardId(card){
    return card?.querySelector?.('button[data-action="save-collab"][data-id],button[data-action="delete-collab"][data-id],select[data-action="edit-collab-persona"][data-id],input[data-action="edit-collab-numero"][data-id],[data-action="edit-collab-situacion"][data-id]')?.dataset?.id || '';
  }
  function compactIngresoReceipts(){
    injectStyle();
    // Oculta y retira los controles largos heredados para que no ocupen la línea.
    document.querySelectorAll('.ce-ingreso-receipt-tools-v463,.ce-v464-receipt-tools').forEach(el => { try{ el.remove(); }catch(_){ } });
    const wrap = $('collabList'); if(!wrap) return;
    wrap.querySelectorAll('.itemcard,.rowline,.card').forEach(card => {
      const id = collabCardId(card); if(!id) return;
      let box = card.querySelector('.ce-v465-receipt-strip');
      const data = receiptData(id);
      const html = `${data ? `<button type="button" class="ce-v465-receipt-thumb" title="Ver justificante" data-action="ingreso-receipt-view-v465" data-id="${esc(id)}"><img alt="Justificante" src="${esc(data)}"></button>` : `<span class="ce-v465-receipt-empty" title="Sin justificante">📷</span>`}<button type="button" class="ce-v465-receipt-btn" title="${data ? 'Cambiar justificante' : 'Adjuntar justificante'}" data-action="ingreso-receipt-add-v465" data-id="${esc(id)}">📎</button>${data ? `<button type="button" class="ce-v465-receipt-btn danger" title="Eliminar justificante" data-action="ingreso-receipt-delete-v465" data-id="${esc(id)}">🗑</button>` : ''}`;
      if(box){ if(box.dataset.receiptHas !== String(!!data)){ box.innerHTML = html; box.dataset.receiptHas = String(!!data); } return; }
      box = document.createElement('div');
      box.className = 'ce-v465-receipt-strip';
      box.dataset.receiptHas = String(!!data);
      box.innerHTML = html;
      const actions = card.querySelector('button[data-action="save-collab"]')?.parentElement || card.querySelector('button[data-action="delete-collab"]')?.parentElement || card;
      try{ actions.appendChild(box); }catch(_){ card.appendChild(box); }
    });
  }

  function findReceiptForDisplay(name, amount, situacion){
    const n = up(name); const a = parseEuro(amount); const s = up(situacion);
    const rows = collabRows().filter(r => receiptData(r.id));
    let found = rows.find(r => up(r.persona?.nombre || personName(r.personaId)) === n && (Math.abs(incomeTotal(r) - a) < 0.011 || !Number.isFinite(a) || a === 0) && (!s || up(r.situacion || r.ingreso || 'Pendiente') === s));
    if(!found) found = rows.find(r => up(r.persona?.nombre || personName(r.personaId)) === n && (Math.abs(incomeTotal(r) - a) < 0.011 || !Number.isFinite(a) || a === 0));
    return found || null;
  }
  function thumbCellFor(id, tag){
    const data = receiptData(id);
    if(!data) return `<span class="ce-v465-tip-empty"></span>`;
    return `<button type="button" class="ce-v465-tip-thumb" title="Ver justificante" data-id="${esc(id)}" data-from="${esc(tag || 'tip')}"><img alt="Justificante" src="${esc(data)}"></button>`;
  }
  function enrichGraphTooltip(){
    const tip = $('ceTooltipV21');
    if(!tip || tip.style.display === 'none') return;
    tip.querySelectorAll('table.ce-v21-table').forEach(table => {
      if(table.dataset.ceV465Receipts === '1') return;
      const rows = Array.from(table.querySelectorAll('tr'));
      if(!rows.length) return;
      const headCells = Array.from(rows[0].children).map(td => up(td.textContent));
      if(!(headCells.includes('NOMBRE') && headCells.includes('INGRESO') && headCells.includes('IMPORTE'))) return;
      const th = document.createElement('td'); th.className = 'ce-v465-thumb-cell'; th.textContent = 'Just.'; rows[0].appendChild(th);
      rows.slice(1).forEach(tr => {
        const cells = Array.from(tr.children);
        if(cells.length < 3) return;
        const found = findReceiptForDisplay(cells[0].textContent, cells[cells.length - 1].textContent, cells[1].textContent);
        const td = document.createElement('td'); td.className = 'ce-v465-thumb-cell'; td.innerHTML = found ? thumbCellFor(found.id, 'graficas') : '<span class="ce-v465-tip-empty"></span>';
        tr.appendChild(td);
      });
      table.dataset.ceV465Receipts = '1';
    });
  }
  function enrichBudgetTooltip(){
    const box = $('ceBudgetLiteTooltipV307');
    if(!box || !box.classList.contains('open')) return;
    const title = up(box.querySelector('.ce-budget-lite-title')?.textContent || '');
    if(!/INGRESADO/.test(title)) return;
    box.querySelectorAll('table.ce-budget-lite-table').forEach(table => {
      if(table.dataset.ceV465Receipts === '1') return;
      const heads = Array.from(table.querySelectorAll('thead th')).map(th => up(th.textContent));
      if(!(heads.includes('NOMBRE') && heads.includes('INGRESADO') && heads.includes('TOTAL'))) return;
      const hr = table.querySelector('thead tr');
      if(hr){ const th=document.createElement('th'); th.className='ce-v465-thumb-cell'; th.textContent='Just.'; hr.appendChild(th); }
      const idxName = heads.indexOf('NOMBRE');
      const idxTotal = heads.indexOf('TOTAL');
      Array.from(table.querySelectorAll('tbody tr')).forEach(tr => {
        const cells = Array.from(tr.children);
        if(cells.length <= Math.max(idxName, idxTotal)) return;
        const found = findReceiptForDisplay(cells[idxName].textContent, cells[idxTotal].textContent, '');
        const td = document.createElement('td'); td.className = 'ce-v465-thumb-cell'; td.innerHTML = found ? thumbCellFor(found.id, 'resumen') : '<span class="ce-v465-tip-empty"></span>';
        tr.appendChild(td);
      });
      table.dataset.ceV465Receipts = '1';
    });
  }
  function enrichOpenTooltips(){ enrichGraphTooltip(); enrichBudgetTooltip(); }

  function keepTooltipFocusOnInternalScroll(ev){
    const target = ev.target;
    if(target?.closest?.('#ceTooltipV21,#ceBudgetLiteTooltipV307')){
      try{ ev.stopPropagation(); }catch(_){ }
    }
  }
  function applyVersion(){
    try{ document.title = VERSION; document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; window.ControlEventVersion = {version:VERSION, versionFile:VERSION_FILE}; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+(?:\.\d+){1,2}/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
  }
  function handleClick(ev){
    const btn = ev.target?.closest?.('[data-action="ingreso-receipt-add-v465"],[data-action="ingreso-receipt-view-v465"],[data-action="ingreso-receipt-delete-v465"],.ce-v465-tip-thumb');
    if(!btn) return;
    const id = btn.dataset.id || '';
    if(!id) return;
    if(btn.matches('.ce-v465-tip-thumb') || btn.dataset.action === 'ingreso-receipt-view-v465'){ stop(ev); showReceiptModal(id); return false; }
    if(btn.dataset.action === 'ingreso-receipt-add-v465'){ stop(ev); attachReceipt(id); return false; }
    if(btn.dataset.action === 'ingreso-receipt-delete-v465'){ stop(ev); removeReceipt(id); return false; }
  }

  let mo = null;
  function installObserver(){
    if(mo) return;
    mo = new MutationObserver(() => {
      if(installObserver._t) clearTimeout(installObserver._t);
      installObserver._t = setTimeout(() => { compactIngresoReceipts(); enrichOpenTooltips(); applyVersion(); }, 80);
    });
    try{ mo.observe(document.body, {childList:true, subtree:true}); }catch(_){ }
  }
  function wrapRender(){
    const old = (typeof render === 'function') ? render : window.render;
    if(!old || old.__ceV465Wrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      [40,120,300].forEach(ms => setTimeout(() => { compactIngresoReceipts(); enrichOpenTooltips(); applyVersion(); }, ms));
      return ret;
    };
    wrapped.__ceV465Wrapped = true;
    try{ render = wrapped; }catch(_){ }
    window.render = wrapped;
  }
  function install(){ injectStyle(); applyVersion(); compactIngresoReceipts(); enrichOpenTooltips(); wrapRender(); installObserver(); }

  document.addEventListener('click', handleClick, true);
  document.addEventListener('click', () => setTimeout(enrichOpenTooltips, 40), true);
  document.addEventListener('wheel', keepTooltipFocusOnInternalScroll, true);
  document.addEventListener('scroll', keepTooltipFocusOnInternalScroll, true);
  document.addEventListener('touchmove', keepTooltipFocusOnInternalScroll, true);
  document.addEventListener('keydown', ev => { if(ev.key === 'Escape') document.querySelector('.ce-v465-modal')?.remove(); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30)));
  [0,80,260,700,1500,3000].forEach(ms => setTimeout(install, ms));
  setInterval(() => { compactIngresoReceipts(); enrichOpenTooltips(); applyVersion(); }, 1600);
  window.ControlEventV465 = {version:VERSION, versionFile:VERSION_FILE, compactIngresoReceipts, enrichOpenTooltips, showReceiptModal};
})();
