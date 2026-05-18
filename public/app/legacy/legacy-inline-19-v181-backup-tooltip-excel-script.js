/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #19. */
/* ==== V18.1: tooltips redondeados, backup por evento y Excel INGRESOS ==== */
(function(){
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const norm = v => String(v ?? '').trim();
  const normalize = v => norm(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const esc = v => (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch] || ch));
  const byId = (arr,id) => (arr || []).find(x => String(x.id) === String(id)) || null;
  const isDonation = v => (typeof isDonationTicket === 'function') ? isDonationTicket(v) : /^DONADO/i.test(norm(v));
  const pad = n => String(n).padStart(2,'0');
  const nowStamp = () => { const d = new Date(); return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}_${pad(d.getMinutes())}_${pad(d.getSeconds())}`; };
  const cleanPart = v => normalize(v).replace(/[^A-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').replace(/_+/g,'_') || 'SIN_CODIGO';

  function refreshVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span, .appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+/i.test(el.textContent || '')) el.textContent = VERSION;
    });
  }

  function ensureTooltip(){
    let tip = document.getElementById('ceTooltipV181');
    if(!tip){ tip = document.createElement('div'); tip.id = 'ceTooltipV181'; tip.className = 'ce-tooltip-v181'; document.body.appendChild(tip); }
    return tip;
  }
  function getTipText(el){
    if(!el) return '';
    let txt = el.getAttribute('data-v181-tip') || el.getAttribute('data-tip') || el.getAttribute('title') || '';
    if(txt && el.hasAttribute('title')){ el.setAttribute('data-v181-tip', txt); el.removeAttribute('title'); }
    return txt;
  }
  function placeTooltip(tip, x, y){
    const margin = 12;
    const long = (tip.textContent || '').length > 600 || (tip.textContent || '').split('\n').length > 14;
    tip.classList.toggle('long', long);
    tip.classList.toggle('full', (tip.textContent || '').length > 1600 || (tip.textContent || '').split('\n').length > 30);
    tip.style.display = 'block';
    tip.style.left = '0px'; tip.style.top = '0px';
    const rect = tip.getBoundingClientRect();
    let left = x + 16;
    let top = y + 16;
    if(left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if(top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    if(!tip.classList.contains('full')){ tip.style.left = left + 'px'; tip.style.top = top + 'px'; }
  }
  let activeTipEl = null;
  function showTipFromEvent(e){
    const el = e.target.closest('[title],[data-tip],[data-v181-tip]');
    if(!el) return;
    const txt = getTipText(el);
    if(!txt) return;
    activeTipEl = el;
    const tip = ensureTooltip();
    tip.textContent = txt;
    placeTooltip(tip, e.clientX || 24, e.clientY || 24);
  }
  function moveTip(e){ if(activeTipEl){ const tip = ensureTooltip(); if(tip.style.display !== 'none') placeTooltip(tip, e.clientX || 24, e.clientY || 24); } }
  function hideTip(){ activeTipEl = null; const tip = document.getElementById('ceTooltipV181'); if(tip) tip.style.display = 'none'; }
  document.addEventListener('mouseover', showTipFromEvent, true);
  document.addEventListener('focusin', showTipFromEvent, true);
  document.addEventListener('mousemove', moveTip, true);
  document.addEventListener('mouseout', e => { if(activeTipEl && !e.relatedTarget?.closest?.('[title],[data-tip],[data-v181-tip]')) hideTip(); }, true);
  document.addEventListener('focusout', hideTip, true);
  document.addEventListener('scroll', hideTip, true);
  document.addEventListener('keydown', e => { if(e.key === 'Escape') hideTip(); }, true);

  function eventList(){ return Array.isArray(state?.eventos) ? state.eventos : []; }
  function makeCodesFor(items, prefix){ const out = {}; (items || []).forEach((x,i)=> out[x.id] = prefix + String(i+1).padStart(prefix === 'EV' ? 3 : 4, '0')); return out; }
  function ticketEventId(fullKey){ const parts = String(fullKey).split('|'); return parts[0] || ''; }
  function ticketInnerKey(fullKey){ const parts = String(fullKey).split('|'); return parts.slice(1).join('|').trim(); }

  function askBackupScope(){
    return new Promise(resolve => {
      const events = eventList();
      const overlay = document.createElement('div');
      overlay.className = 'ce-backup-overlay-v181';
      overlay.innerHTML = `<div class="ce-backup-modal-v181"><h3>Descarga de datos</h3><p>Elige si quieres descargar todos los datos o solo los datos vinculados a un evento concreto.</p><div class="field"><label>Evento a descargar</label><select id="ceBackupScopeV181"><option value="TODOS">TODOS los eventos</option>${events.map(e => `<option value="${esc(e.id)}" ${String(e.id)===String(state?.selectedEventId||'')?'selected':''}>${esc(e.titulo || e.id)}</option>`).join('')}</select></div><div class="ce-backup-actions-v181"><button type="button" class="outline" id="ceBackupCancelV181">Cancelar</button><button type="button" id="ceBackupOkV181">Descargar</button></div></div>`;
      document.body.appendChild(overlay);
      const cleanup = val => { overlay.remove(); resolve(val); };
      overlay.querySelector('#ceBackupCancelV181').addEventListener('click', () => cleanup(null));
      overlay.querySelector('#ceBackupOkV181').addEventListener('click', () => cleanup(overlay.querySelector('#ceBackupScopeV181').value || 'TODOS'));
      overlay.addEventListener('click', e => { if(e.target === overlay) cleanup(null); });
    });
  }

  function scopedState(scope){
    const all = scope === 'TODOS';
    const eventos = all ? [...(state.eventos || [])] : (state.eventos || []).filter(e => String(e.id) === String(scope));
    const eventIds = new Set(eventos.map(e => String(e.id)));
    const colaboradores = (state.colaboradores || []).filter(c => all || eventIds.has(String(c.eventId)));
    const compras = (state.compras || []).filter(c => all || eventIds.has(String(c.eventId)));
    const personIds = new Set();
    colaboradores.forEach(c => { if(c.personaId) personIds.add(String(c.personaId)); });
    compras.forEach(c => { if(c.responsableId) personIds.add(String(c.responsableId)); const dr=String(c.donorRef||''); if(dr.startsWith('P:')) personIds.add(dr.slice(2)); });
    const storeIds = new Set();
    compras.forEach(c => { if(c.tiendaId) storeIds.add(String(c.tiendaId)); const dr=String(c.donorRef||''); if(dr.startsWith('T:')) storeIds.add(dr.slice(2)); });
    const productIds = new Set(compras.map(c => String(c.productoId)).filter(Boolean));
    const personas = all ? [...(state.personas || [])] : (state.personas || []).filter(p => personIds.has(String(p.id)));
    const tiendas = all ? [...(state.tiendas || [])] : (state.tiendas || []).filter(t => storeIds.has(String(t.id)));
    const productos = all ? [...(state.productos || [])] : (state.productos || []).filter(p => productIds.has(String(p.id)));
    const ticketImages = {};
    Object.entries(state.ticketImages || {}).forEach(([k,v]) => { if(all || eventIds.has(String(ticketEventId(k)))) ticketImages[k] = v; });
    return {eventos, personas, tiendas, productos, colaboradores, compras, ticketImages};
  }

  function backupFileName(scope, eventTitle){
    const title = scope === 'TODOS' ? 'TODOS' : cleanPart(eventTitle || 'EVENTO');
    return `${VERSION_FILE}_BACKUP_${title}_${nowStamp()}.xlsx`;
  }

  function splitLongText(s, size=30000){
    const txt = String(s || '');
    const out = [];
    for(let i=0; i<txt.length; i += size) out.push(txt.slice(i, i+size));
    return out.length ? out : [''];
  }

  exportSeedWorkbook = async function(){
    if(typeof isLocked === 'function' && isLocked()) return;
    const scope = await askBackupScope();
    if(!scope) return;
    try{ await ensureExcelJS(); }catch(err){ alert('No se pudo cargar el motor de Excel.'); return; }
    const scoped = scopedState(scope);
    const eventCode = makeCodesFor(scoped.eventos, 'EV');
    const personCode = makeCodesFor(scoped.personas, 'PE');
    const storeCode = makeCodesFor(scoped.tiendas, 'TI');
    const productCode = makeCodesFor(scoped.productos, 'PR');
    const selectedEvent = scope === 'TODOS' ? null : (scoped.eventos || []).find(e => String(e.id) === String(scope));
    const selectedCode = scope === 'TODOS' ? 'TODOS' : (eventCode[scope] || 'EV001');
    const selectedTitle = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.titulo || selectedCode || 'EVENTO');
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB ’26`; wb.created = new Date();
    const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
    const headFill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
    function makeSheet(name, headers, rows){
      const ws = wb.addWorksheet(name);
      ws.columns = headers.map(h => ({width: Math.max(14, Math.min(42, String(h).length + 4))}));
      headers.forEach((h,i)=>{ const c=ws.getCell(1,i+1); c.value=h; c.font={bold:true,color:{argb:'FFFFFFFF'}}; c.fill=headFill; c.border=border; c.alignment={horizontal:'center',vertical:'middle',wrapText:true}; });
      rows.forEach(row => ws.addRow(row.map(v => v == null ? '' : v)));
      ws.eachRow(r => r.eachCell(c => { c.border=border; c.alignment={vertical:'middle',wrapText:true}; }));
      ws.columns.forEach((col,idx)=>{ let w=col.width||14; col.eachCell({includeEmpty:true}, cell => { w = Math.max(w, Math.min(70, String(cell.value ?? '').length + 3)); }); col.width = idx === headers.indexOf('IMAGEN_BASE64_PARTE') ? 72 : Math.min(70,w); });
      return ws;
    }
    makeSheet('METADATOS', ['CAMPO','VALOR'], [['VERSION', VERSION], ['ALCANCE', scope === 'TODOS' ? 'TODOS' : selectedTitle], ['EVENTO_CODIGO', scope === 'TODOS' ? 'TODOS' : selectedCode], ['FECHA_DESCARGA', nowStamp()], ['PROTECCION', 'Hojas protegidas para evitar cambios accidentales en la descarga.'], ['NOTA', 'Las imágenes grandes de tickets se dividen en TICKETS_PARTES para evitar ficheros Excel corruptos.']]);
    makeSheet('EVENTOS', ['EVENTO_CODIGO','EVENTO_ID','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'], scoped.eventos.map(e => [eventCode[e.id], e.id, e.titulo||'', Number(e.precio||0), e.fechaIni||'', e.fechaFin||'', e.situacion||'En curso', e.descripcion||'']));
    makeSheet('PERSONAS', ['PERSONA_CODIGO','PERSONA_ID','PERSONA_NOMBRE','PERSONA_RANGO'], scoped.personas.map(p => [personCode[p.id], p.id, p.nombre||'', p.rango||'SOCIO']));
    makeSheet('TIENDAS', ['TIENDA_CODIGO','TIENDA_ID','TIENDA_NOMBRE'], scoped.tiendas.map(t => [storeCode[t.id], t.id, t.nombre||'']));
    const wsProductosBackupV190 = makeSheet('PRODUCTOS', ['PRODUCTO_CODIGO','PRODUCTO_ID','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO','PRODUCTO_PRECIO'], scoped.productos.map(p => [productCode[p.id], p.id, p.nombre||'', p.segmento||'', p.destino||'', Number((p.defaultPrecio ?? p.precio) || 0)]));
    try{ wsProductosBackupV190.getColumn(6).numFmt = '#,##0.00 [$€-C0A]'; }catch(_){ }
    makeSheet('INGRESOS', ['EVENTO_CODIGO','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'], scoped.colaboradores.map(c => [eventCode[c.eventId]||'', personCode[c.personaId]||'', Number(c.numero||0), c.situacion||'Pendiente', Number(c.importe||0)]));
    makeSheet('COMPRAS', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TICKET_U_OTROS_GASTOS','TIENDA_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => !isDonation(c.ticketDonacion)).map(c => [eventCode[c.eventId]||'', productCode[c.productoId]||'', Number(c.unidades||0), Number(c.precio||0), c.ticketDonacion||'', storeCode[c.tiendaId]||'', personCode[c.responsableId]||'']));
    makeSheet('DONACIONES', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TIPO_DONACION','DONANTE_TIPO','DONANTE_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => isDonation(c.ticketDonacion)).map(c => { const [kind,id] = String(c.donorRef||'').split(':'); return [eventCode[c.eventId]||'', productCode[c.productoId]||'', Number(c.unidades||0), Number(c.precio||0), c.ticketDonacion||'', kind==='P'?'PERSONA':(kind==='T'?'TIENDA':''), kind==='P' ? (personCode[id]||'') : (kind==='T' ? (storeCode[id]||'') : ''), personCode[c.responsableId]||'']; }));
    const ticketRows = [], partRows = [];
    Object.entries(scoped.ticketImages || {}).forEach(([fullKey,img]) => {
      const evCode = eventCode[ticketEventId(fullKey)] || '';
      const key = ticketInnerKey(fullKey);
      const image = String(img || '');
      const parts = splitLongText(image, 30000);
      ticketRows.push([evCode, key, '', image.length <= 30000 ? image : '', image.length > 30000 ? 'DIVIDIDA_EN_TICKETS_PARTES' : '']);
      parts.forEach((part,idx) => partRows.push([evCode, key, idx + 1, parts.length, part]));
    });
    makeSheet('TICKETS', ['EVENTO_CODIGO','CLAVE_RESUMEN','ARCHIVO_IMAGEN','IMAGEN_BASE64','OBSERVACIONES'], ticketRows);
    makeSheet('TICKETS_PARTES', ['EVENTO_CODIGO','CLAVE_RESUMEN','PARTE','TOTAL_PARTES','IMAGEN_BASE64_PARTE'], partRows);
    for(const ws of wb.worksheets){
      try{
        ws.views = [{state:'frozen', ySplit:1}];
        ws.eachRow(row => row.eachCell(cell => { cell.protection = {locked:true}; }));
        await ws.protect('open_excel_arrastre', {
          selectLockedCells:true, selectUnlockedCells:true,
          formatCells:false, formatColumns:false, formatRows:false,
          insertColumns:false, insertRows:false, deleteColumns:false, deleteRows:false,
          sort:false, autoFilter:false, pivotTables:false
        });
      }catch(_){ }
    }
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = backupFileName(scope, selectedTitle);
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  if(typeof readSheetRows === 'function'){
    const previousReadSheetRowsV181 = readSheetRows;
    readSheetRows = function(workbook, wantedName){
      const rows = previousReadSheetRowsV181(workbook, wantedName);
      if((typeof normalizeHeader === 'function' ? normalizeHeader(wantedName) : normalize(wantedName)) !== 'TICKETS') return rows;
      const parts = previousReadSheetRowsV181(workbook, 'TICKETS_PARTES');
      if(!parts || !parts.length) return rows;
      const map = new Map();
      parts.forEach(p => {
        const ev = String(p.EVENTO_CODIGO || '').trim();
        const key = String(p.CLAVE_RESUMEN || '').trim();
        const seq = Number(p.PARTE || 0) || 0;
        const val = String(p.IMAGEN_BASE64_PARTE || '');
        const id = ev + '|' + key;
        if(!map.has(id)) map.set(id, {ev, key, chunks:[]});
        map.get(id).chunks[seq - 1] = val;
      });
      const rowMap = new Map(rows.map(r => [String(r.EVENTO_CODIGO || '').trim() + '|' + String(r.CLAVE_RESUMEN || '').trim(), r]));
      map.forEach((rec,id) => {
        const img = rec.chunks.join('');
        let row = rowMap.get(id);
        if(!row){ row = {EVENTO_CODIGO:rec.ev, CLAVE_RESUMEN:rec.key, ARCHIVO_IMAGEN:'', IMAGEN_BASE64:''}; rowMap.set(id,row); }
        if(img && (!String(row.IMAGEN_BASE64 || '').trim() || String(row.OBSERVACIONES || '').includes('DIVIDIDA'))) row.IMAGEN_BASE64 = img;
      });
      return Array.from(rowMap.values());
    };
  }

  refreshVersion();
  window.addEventListener('load', () => { refreshVersion(); try{ if(typeof render === 'function') render(); }catch(_){} });
})();
