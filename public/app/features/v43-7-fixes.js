/* ControlEvent v50.18 - exportaciones seguras, edición sin falso duplicado, mapa de recursos y globos de borrado. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v50.18';
  const VERSION_FILE = 'ControlEvent_v50_18';
  const PROTECTION_PASSWORD = 'open_excel_arrastre';
  let backupBusy = false;
  let infoBusy = false;

  const $ = id => document.getElementById(id);
  function app(){ try{ return window.ControlEventApp || window.ControlEventRuntime?.app || null; }catch(_){ return null; } }
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return app()?.state || window.state || {}; }
  function arr(name){ const v = st()[name]; return Array.isArray(v) ? v : []; }
  function norm(value){ return String(value ?? '').trim(); }
  function up(value){ return norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase(); }
  function esc(value){ return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }
  function cssEsc(value){ const s = String(value ?? ''); try{ return window.CSS?.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g,'\\$&'); }catch(_){ return s.replace(/"/g,'\\"'); } }
  function moneyFmt(value){ try{ if(typeof money === 'function') return money(value); }catch(_){ } return new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR'}).format(Number(value||0)); }
  function parseNum(value){
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let text = String(value ?? '').replace(/[^0-9,.-]/g,'').trim();
    if(text.includes(',') && text.includes('.')) text = text.replace(/\./g,'').replace(',','.');
    else if(text.includes(',')) text = text.replace(',','.');
    const n = Number(text);
    return Number.isFinite(n) ? n : 0;
  }
  function selectedEventId(){ return norm(st().selectedEventId); }
  function byId(list, id){ const sid = norm(id); return arr(list).find(x => norm(x?.id) === sid) || null; }
  function currentEvent(){ return byId('eventos', selectedEventId()) || null; }
  function currentEventTitle(){ const ev = currentEvent(); return ev?.titulo || ev?.nombre || ev?.title || selectedEventId() || 'Evento'; }
  function fileSafe(value){ return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,80) || 'Evento'; }
  function ymd(){ const d = new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}${String(d.getSeconds()).padStart(2,'0')}`; }
  function isDonationTicket(ticket){ try{ if(typeof isDonationTicket === 'function') return isDonationTicket(ticket); }catch(_){ } const t=up(ticket); return t === 'DONADO TIENDA' || t === 'DONADO SOCIO' || t === 'DONADO OTROS'; }
  function isTk(ticket){ return /^TK\s*\d+/i.test(norm(ticket)); }
  function isCurrentExpense(ticket){ return up(ticket) === 'GASTOS CORRIENTES'; }
  function isPaidCompra(row){ const t = row?.ticketDonacion || row?.ticket || ''; return isTk(t) || isCurrentExpense(t); }
  function rowValue(row){ const producto = byId('productos', row?.productoId) || {}; const price = parseNum(row?.precio || producto.precio || producto.defaultPrecio || 0); return parseNum(row?.unidades || 0) * price; }
  function personName(id){ return byId('personas', id)?.nombre || ''; }
  function storeName(id){ return byId('tiendas', id)?.nombre || ''; }
  function productName(id){ return byId('productos', id)?.nombre || ''; }
  function donorName(row){
    const ref = norm(row?.donorRef || row?.donanteRef || '');
    if(ref){
      const parts = ref.split(':');
      const kind = up(parts.shift() || '');
      const id = parts.join(':');
      if(kind === 'P' || kind === 'PERSONA') return personName(id) || ref;
      if(kind === 'T' || kind === 'TIENDA') return storeName(id) || ref;
      return personName(ref) || storeName(ref) || ref;
    }
    return row?.donante || row?.donor || storeName(row?.tiendaId) || 'Sin donante';
  }
  function eventRows(listName){ const eid=selectedEventId(); return arr(listName).filter(r => norm(r?.eventId) === eid); }
  function ingresos(){ return eventRows('colaboradores'); }
  function compras(){ return eventRows('compras'); }
  function incomeTotal(row){
    const persona = byId('personas', row?.personaId) || {};
    const ev = currentEvent() || {};
    const numero = parseNum(row?.numero || 0);
    const precioEvento = parseNum(ev?.precio || ev?.EVENTOS_PRECIO || 0);
    const voluntario = parseNum(row?.importe ?? row?.importeVoluntario ?? row?.voluntario ?? row?.extra ?? 0);
    const obligatorio = up(persona.rango || row?.rango || '') === 'SOCIO' ? numero * precioEvento : 0;
    return obligatorio + voluntario;
  }
  function isIngresoPendiente(row){ return up(row?.situacion || row?.estado || '').includes('PENDIENTE'); }
  function saveNow(){ try{ if(typeof saveState === 'function') return saveState(); }catch(_){ } try{ return window.saveState?.(); }catch(_){ } }
  function renderNow(){ try{ if(typeof render === 'function') return render(); }catch(_){ } try{ return window.render?.(); }catch(_){ } }
  function isVisible(el){ if(!el) return false; try{ if(el.hidden) return false; const cs=getComputedStyle(el); if(cs.display==='none'||cs.visibility==='hidden') return false; return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); }catch(_){ return true; } }

  function injectStyle(){
    if($('ceV437Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV437Style';
    style.textContent = `
      body:not(.ce-v437-delete-tip-active) #ceDeleteTipV200,
      body:not(.ce-v437-delete-tip-active) .ce-delete-tip-v200,
      body:not(.ce-v437-delete-tip-active) [data-ce-delete-tip="1"]{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #tabMapaProductos .mapa-summary-metrics{grid-template-columns:repeat(4,minmax(0,1fr));}
      #tabMapaProductos .mapa-metric.saldo-limite{border-color:#bae6fd!important;background:#f0f9ff!important;}
      @media(max-width:860px){#tabMapaProductos .mapa-summary-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}}
      @media(max-width:560px){#tabMapaProductos .mapa-summary-metrics{grid-template-columns:1fr;}}
    `;
    document.head.appendChild(style);
  }

  function applyVersion(){
    try{ document.title = VERSION; }catch(_){ }
    try{ document.body.dataset.ceVersion = VERSION; window.__ceVersion = VERSION; }catch(_){ }
    try{ document.querySelectorAll('.appname span,.appname-stack span').forEach(el => { if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION; }); }catch(_){ }
    try{
      const proto = HTMLAnchorElement.prototype;
      if(!proto.click.__ceV437Version){
        const old = proto.click;
        const wrapped = function(){
          try{ if(this.download) this.download = String(this.download).replace(/ControlEvent_v\d+_\d+(?:_\d+)?/ig, VERSION_FILE); }catch(_){ }
          return old.apply(this, arguments);
        };
        wrapped.__ceV437Version = true;
        proto.click = wrapped;
      }
    }catch(_){ }
  }

  function hideDeleteTip(){
    try{ document.body.classList.remove('ce-v437-delete-tip-active'); }catch(_){ }
    try{ document.querySelectorAll('#ceDeleteTipV200,.ce-delete-tip-v200,[data-ce-delete-tip="1"]').forEach(el => { el.style.display='none'; el.style.visibility='hidden'; el.style.opacity='0'; }); }catch(_){ }
  }
  function installDeleteTipGuard(){
    if(window.__ceV437DeleteTipGuard) return;
    window.__ceV437DeleteTipGuard = true;
    const isDeleteButton = el => !!el?.closest?.('button[data-action^="delete"],button[title*="Eliminar"],button[aria-label*="Eliminar"],.delete-btn,.danger');
    ['mouseover','focusin'].forEach(type => document.addEventListener(type, e => { if(isDeleteButton(e.target)){ document.body.classList.add('ce-v437-delete-tip-active'); } }, true));
    ['mouseout','focusout','click','scroll'].forEach(type => document.addEventListener(type, e => { if(type === 'scroll' || !isDeleteButton(e.target)) hideDeleteTip(); }, true));
    setInterval(hideDeleteTip, 2200);
  }

  function ensureExcelJS(){
    if(window.ExcelJS) return Promise.resolve(window.ExcelJS);
    try{ if(typeof window.ensureExcelJS === 'function') return window.ensureExcelJS().then(() => window.ExcelJS); }catch(_){ }
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-ce-exceljs="1"]');
      if(existing){ existing.addEventListener('load', () => resolve(window.ExcelJS)); existing.addEventListener('error', reject); return; }
      const script = document.createElement('script');
      script.src = './vendor/exceljs.min.js';
      script.async = true;
      script.setAttribute('data-ce-exceljs','1');
      script.onload = () => window.ExcelJS ? resolve(window.ExcelJS) : reject(new Error('ExcelJS no disponible'));
      script.onerror = () => reject(new Error('No se pudo cargar ExcelJS'));
      document.head.appendChild(script);
    });
  }
  function styleWorkbook(wb){
    try{ wb.creator = `©oltyLAB '26_${VERSION}`; wb.created = new Date(); }catch(_){ }
    wb.eachSheet(ws => {
      try{ ws.views = [{state:'frozen', ySplit:1}]; }catch(_){ }
      try{ ws.eachRow((row, rn) => { row.eachCell(cell => { cell.alignment = {vertical:'middle', wrapText:true}; cell.border = {top:{style:'thin', color:{argb:'FFE5E7EB'}}, left:{style:'thin', color:{argb:'FFE5E7EB'}}, bottom:{style:'thin', color:{argb:'FFE5E7EB'}}, right:{style:'thin', color:{argb:'FFE5E7EB'}}}; if(rn === 1){ cell.font = {bold:true, color:{argb:'FFFFFFFF'}}; cell.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF93465E'}}; } }); }); }catch(_){ }
    });
  }
  async function protectWorkbook(wb){
    const jobs = [];
    try{ wb.eachSheet(ws => { try{ jobs.push(ws.protect(PROTECTION_PASSWORD, {selectLockedCells:true, selectUnlockedCells:true})); }catch(_){ } }); }catch(_){ }
    try{ await Promise.all(jobs.filter(Boolean)); }catch(_){ }
  }
  function fitColumns(ws){
    try{
      ws.columns.forEach(col => {
        let max = 10;
        col.eachCell({includeEmpty:true}, cell => { const text = String(cell.value == null ? '' : (typeof cell.value === 'object' && cell.value.text ? cell.value.text : cell.value)); max = Math.max(max, Math.min(48, text.length + 2)); });
        col.width = max;
      });
    }catch(_){ }
  }
  function addSheet(wb, name, headers, rows){
    const ws = wb.addWorksheet(name.slice(0,31));
    ws.addRow(headers);
    rows.forEach(row => ws.addRow(row));
    fitColumns(ws);
    return ws;
  }
  function downloadBuffer(buffer, filename){
    const blob = buffer instanceof Blob ? buffer : new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try{ URL.revokeObjectURL(a.href); a.remove(); }catch(_){ } }, 5000);
  }
  function primitiveRow(row){
    const out = {};
    Object.keys(row || {}).forEach(k => {
      const v = row[k];
      if(v == null || ['string','number','boolean'].includes(typeof v)) out[k] = v;
      else if(v instanceof Date) out[k] = v.toISOString();
      else if(Array.isArray(v)) out[k] = v.map(x => (x && typeof x === 'object') ? (x.id || x.nombre || '') : x).join(', ');
      else if(typeof v === 'object') out[k] = v.id || v.nombre || JSON.stringify(Object.fromEntries(Object.entries(v).filter(([,val]) => val == null || ['string','number','boolean'].includes(typeof val))));
    });
    return out;
  }

  async function exportInfoEventoV437(){
    if(infoBusy) return;
    infoBusy = true;
    try{
      const ev = currentEvent();
      if(!ev){ alert('Selecciona un evento para descargar INFOEVENTO.'); return; }
      const ExcelJS = await ensureExcelJS();
      const wb = new ExcelJS.Workbook();
      const inc = ingresos();
      const cmp = compras();
      const don = cmp.filter(r => isDonationTicket(r.ticketDonacion || r.ticket));
      const buy = cmp.filter(r => !isDonationTicket(r.ticketDonacion || r.ticket));
      const ingresoPrevisto = inc.reduce((s,r)=>s+incomeTotal(r),0);
      const ingresoPendiente = inc.filter(isIngresoPendiente).reduce((s,r)=>s+incomeTotal(r),0);
      const ingresoReal = ingresoPrevisto - ingresoPendiente;
      const valorDonado = don.reduce((s,r)=>s+rowValue(r),0);
      const gastado = buy.filter(isPaidCompra).reduce((s,r)=>s+rowValue(r),0);
      const pteCompra = buy.filter(r=>!isPaidCompra(r)).reduce((s,r)=>s+rowValue(r),0);
      addSheet(wb, 'RESUMEN', ['Concepto','Importe','Observación'], [
        ['Evento', currentEventTitle(), ev.descripcion || ev.EVENTOS_DESCRIPCION || ''],
        ['Emitido por', `©oltyLAB '26_${VERSION}_${ymd()}`, ''],
        ['INGRESOS INGRESADOS', ingresoReal, 'No incluye pendientes'],
        ['INGRESOS PENDIENTES', ingresoPendiente, 'Pendiente de ingresar'],
        ['SALDO LÍMITE', ingresoPrevisto, 'Ingresado + pendiente'],
        ['DONACION DE PRODUCTO', valorDonado, 'Valor estimado'],
        ['COMPRAS GASTADAS', gastado, 'TKXX + GASTOS CORRIENTES'],
        ['PTE.COMPRA', pteCompra, 'Compras pendientes'],
        ['SALDO OPERATIVO', ingresoReal - gastado, 'Ingresado - gastado']
      ]);
      addSheet(wb, 'INGRESOS', ['Nombre','Rango','Situación','Número','Importe total'], inc.map(r => [personName(r.personaId) || r.nombre || '', byId('personas', r.personaId)?.rango || '', r.situacion || '', r.numero || 0, incomeTotal(r)]));
      addSheet(wb, 'COMPRAS', ['Tienda','Ticket','Producto','Segmento','Destino','Unidades','Precio','Importe','Responsable'], buy.map(r => { const p=byId('productos', r.productoId)||{}; return [storeName(r.tiendaId) || '', r.ticketDonacion || r.ticket || '', productName(r.productoId) || r.producto || '', p.segmento || '', p.destino || '', r.unidades || 0, parseNum(r.precio || p.precio || p.defaultPrecio || 0), rowValue(r), personName(r.responsableId) || '']; }));
      addSheet(wb, 'DONACIONES', ['Donante','Tipo','Producto','Segmento','Destino','Unidades','Precio','Valor','Responsable','Entregado'], don.map(r => { const p=byId('productos', r.productoId)||{}; return [donorName(r), r.ticketDonacion || r.ticket || '', productName(r.productoId) || r.producto || '', p.segmento || '', p.destino || '', r.unidades || 0, parseNum(r.precio || p.precio || p.defaultPrecio || 0), rowValue(r), personName(r.responsableId) || '', r.donacionEntregada || r.entregadoDonacion || r.entregado ? 'Sí' : 'No']; }));
      const byDestino = new Map();
      cmp.forEach(r => { const p=byId('productos', r.productoId)||{}; const key=p.destino || 'Sin destino'; byDestino.set(key,(byDestino.get(key)||0)+rowValue(r)); });
      addSheet(wb, 'GRAFICAS', ['Agrupación','Valor'], Array.from(byDestino.entries()).sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'es')));
      styleWorkbook(wb);
      await protectWorkbook(wb);
      const buffer = await wb.xlsx.writeBuffer();
      downloadBuffer(buffer, `${VERSION_FILE}_INFOEVENTO-${fileSafe(currentEventTitle())}_${ymd()}.xlsx`);
    }catch(err){ console.error('[v43.8] INFOEVENTO', err); alert(`No se pudo descargar INFOEVENTO.\n\n${err?.name || 'Error'}: ${err?.message || err}`); }
    finally{ infoBusy = false; }
  }

  function openBackupScopeDialog(){
    return new Promise(resolve => {
      const old = $('ceBackupScopeV437'); if(old) old.remove();
      const overlay = document.createElement('div');
      overlay.id = 'ceBackupScopeV437';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:18px;';
      overlay.innerHTML = `<div style="max-width:420px;width:100%;background:#fff;border-radius:20px;padding:18px;box-shadow:0 22px 60px rgba(0,0,0,.28);font-family:system-ui,-apple-system,Segoe UI,sans-serif;"><h3 style="margin:0 0 8px;color:#111827;">Descarga de datos</h3><p style="margin:0 0 14px;color:#475569;font-size:14px;">Elige qué backup quieres descargar.</p><div style="display:grid;gap:10px;"><button type="button" data-scope="event" style="padding:12px;border-radius:14px;border:1px solid #93465e;background:#93465e;color:white;font-weight:900;">Evento seleccionado</button><button type="button" data-scope="all" style="padding:12px;border-radius:14px;border:1px solid #d1d5db;background:white;color:#111827;font-weight:900;">Todos los eventos</button><button type="button" data-scope="cancel" style="padding:10px;border:0;background:transparent;color:#64748b;font-weight:800;">Cancelar</button></div></div>`;
      const done = value => { overlay.remove(); resolve(value); };
      overlay.addEventListener('click', e => { const b=e.target.closest('button[data-scope]'); if(b) done(b.dataset.scope); else if(e.target === overlay) done('cancel'); });
      document.body.appendChild(overlay);
    });
  }
  async function tryServerBackup(scope){
    const res = await fetch(`/api/export/backup?scope=${encodeURIComponent(scope)}&eventId=${encodeURIComponent(selectedEventId())}&v=46.1`, {cache:'no-store'});
    if(!res.ok) throw new Error(await res.text().catch(()=>`HTTP ${res.status}`));
    const ct = String(res.headers.get('content-type') || '').toLowerCase();
    if(ct.includes('text/html')) throw new Error('La ruta de backup del servidor no devolvió un Excel');
    const blob = await res.blob();
    if(!blob || !blob.size) throw new Error('El backup del servidor está vacío');
    const name = res.headers.get('x-filename') || `${VERSION_FILE}_BACKUP_${scope === 'all' ? 'TODOS' : fileSafe(currentEventTitle())}_${ymd()}.xlsx`;
    downloadBuffer(blob, name);
  }
  async function clientBackup(scope){
    const ExcelJS = await ensureExcelJS();
    const wb = new ExcelJS.Workbook();
    const stateObj = st();
    const keys = ['eventos','personas','tiendas','productos','colaboradores','compras','ticketImages','usuarios','users'];
    addSheet(wb, 'METADATOS', ['Campo','Valor'], [['Versión', VERSION], ['Ámbito', scope === 'all' ? 'TODOS' : 'EVENTO'], ['Evento', scope === 'all' ? 'TODOS' : currentEventTitle()], ['Fecha', new Date().toLocaleString('es-ES')]]);
    keys.forEach(key => {
      const source = Array.isArray(stateObj[key]) ? stateObj[key] : [];
      const rows = source.filter(row => scope === 'all' || !('eventId' in (row || {})) || norm(row?.eventId) === selectedEventId()).map(primitiveRow);
      const headers = Array.from(rows.reduce((set,row) => { Object.keys(row).forEach(k=>set.add(k)); return set; }, new Set()));
      addSheet(wb, key.toUpperCase().slice(0,31), headers.length ? headers : ['Sin datos'], rows.map(row => headers.map(h => row[h] ?? '')));
    });
    styleWorkbook(wb);
    await protectWorkbook(wb);
    const buffer = await wb.xlsx.writeBuffer();
    downloadBuffer(buffer, `${VERSION_FILE}_BACKUP_${scope === 'all' ? 'TODOS' : fileSafe(currentEventTitle())}_${ymd()}.xlsx`);
  }
  async function exportBackupV437(){
    if(backupBusy) return;
    backupBusy = true;
    try{
      const scope = await openBackupScopeDialog();
      if(!scope || scope === 'cancel') return;
      if(scope !== 'all' && !currentEvent()){ alert('Selecciona un evento para descargar su backup.'); return; }
      try{ await tryServerBackup(scope); }
      catch(serverErr){ console.warn('[v43.8] Backup servidor no disponible, se usa cliente', serverErr); await clientBackup(scope); }
    }catch(err){ console.error('[v43.8] BACKUP', err); alert(`No se pudo descargar la descarga de datos.\n\n${err?.name || 'Error'}: ${err?.message || err}`); }
    finally{ backupBusy = false; }
  }

  function patchExportEntryPoints(){
    // v43.8: NO se sustituyen INFOEVENTO ni BACKUP.
    // Se mantiene el motor legacy/modular original, que es el que generaba los Excel correctos.
    return false;
  }

  function captureExportClick(event){
    // v43.8: sin captura de exportaciones para no bloquear el motor original.
    return false;
  }


  function normalizeMapaSummary(){
    try{
      const summary = $('mapaProductosSummary');
      if(!summary) return;
      const labels = Array.from(summary.querySelectorAll('.mapa-metric-label')).map(el => up(el.textContent));
      if(labels.includes('SALDO LIMITE')) return;
      const income = ingresos().reduce((s,r)=>s+incomeTotal(r),0);
      const box = summary.querySelector('.mapa-summary-metrics');
      if(box && !box.querySelector('.saldo-limite')){
        const card = document.createElement('div');
        card.className = 'mapa-metric ok saldo-limite';
        card.innerHTML = `<div class="mapa-metric-label">SALDO LÍMITE</div><div class="mapa-metric-value">${esc(moneyFmt(income))}</div><div class="mapa-metric-note">Ingresos totales previstos: ingresados + pendientes</div>`;
        box.appendChild(card);
      }
    }catch(_){ }
  }

  function install(){
    injectStyle(); applyVersion(); hideDeleteTip(); installDeleteTipGuard(); patchExportEntryPoints(); normalizeMapaSummary();
    setTimeout(() => { hideDeleteTip(); normalizeMapaSummary(); }, 120);
  }
  // v43.8: no se instala captura de click de INFOEVENTO/BACKUP.
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 20)));
  try{ install(); }catch(_){ }
  window.ControlEventV437 = {version:VERSION, install};
})();
