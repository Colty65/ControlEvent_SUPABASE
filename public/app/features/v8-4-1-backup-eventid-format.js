/* ControlEvent v11_3_prod - BACKUP con EVENTO_ID real, sin EVxxx para eventos.
   - EVENTOS ya no exporta EVENTO_CODIGO.
   - En hojas relacionales, EVENTO_CODIGO contiene el id real de ce_eventos.
   - La importación acepta el nuevo formato y conserva EVENTO_ID. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v11_3_prod';
  const VERSION_FILE = 'ControlEvent_v11_3_prod';
  const INSTALLED = '__ceV841BackupEventIdFormat';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const norm = value => String(value ?? '').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const up = value => norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
  const num = value => {
    if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
    let s = String(value ?? '').replace(/[^0-9,.-]/g, '');
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const arr = name => {
    const st = appState();
    return Array.isArray(st?.[name]) ? st[name] : [];
  };
  function appState(){
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || {};
  }
  function selectedEventId(){
    const st = appState();
    return norm(st.selectedEventId || document.getElementById('selectedEvent')?.value || '');
  }
  function currentEvent(){
    const id = selectedEventId();
    return arr('eventos').find(e => String(e?.id || '') === id) || null;
  }
  function filePart(value){
    return norm(value || 'SIN_TITULO').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'SIN_TITULO';
  }
  function stamp(date = new Date()){
    const pad = n => String(n).padStart(2, '0');
    return {yyyy:date.getFullYear(), mm:pad(date.getMonth()+1), dd:pad(date.getDate()), hh:pad(date.getHours()), mi:pad(date.getMinutes()), ss:pad(date.getSeconds())};
  }
  function backupFileName(scope, title){
    const s = stamp();
    const label = scope === 'TODOS' ? 'TODOS' : filePart(title || scope || 'EVENTO');
    return `${VERSION_FILE}_BACKUP_${label}_${s.yyyy}${s.mm}${s.dd}_${s.hh}${s.mi}${s.ss}.xlsx`;
  }
  function isGD(){
    const user = window.ControlEventApp?.authUser || window.authUser || window.__CONTROL_EVENT_USER__ || null;
    return up(user?.nivel || '') === 'GD';
  }
  function isDonation(ticket){
    try{ if(typeof isDonationTicket === 'function') return !!isDonationTicket(ticket); }catch(_){ }
    return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(up(ticket));
  }
  function ticket(row){ return norm(row?.ticketDonacion ?? row?.ticket ?? row?.ticketOtrosGastos ?? ''); }
  function documentToken(value){
    const match = norm(value).toUpperCase().match(/\bDOC\s*(\d+)\b/);
    return match ? 'DOC' + String(Number(match[1])).padStart(2, '0') : '';
  }
  function makeCodes(items, prefix, stableMap){
    const out = {}, used = new Set();
    const props = prefix === 'PE' ? ['personaCodigo','codigoPersona','personCode','PERSONA_CODIGO'] : prefix === 'TI' ? ['tiendaCodigo','codigoTienda','storeCode','TIENDA_CODIGO'] : ['productoCodigo','codigoProducto','productCode','PRODUCTO_CODIGO'];
    const re = new RegExp('^' + prefix + '\\d+$', 'i');
    (items || []).forEach(item => {
      const id = norm(item?.id); if(!id) return;
      let code = '';
      for(const prop of props){ const c = norm(item?.[prop]); if(re.test(c)){ code = c.toUpperCase(); break; } }
      const mapped = norm(stableMap?.[id]);
      if(!code && re.test(mapped)) code = mapped.toUpperCase();
      if(code && !used.has(code)){ out[id] = code; used.add(code); }
    });
    let n = 1;
    (items || []).forEach(item => {
      const id = norm(item?.id); if(!id || out[id]) return;
      let code; do{ code = prefix + String(n++).padStart(4, '0'); }while(used.has(code));
      out[id] = code; used.add(code);
    });
    return out;
  }
  function byId(items){ return Object.fromEntries((items || []).map(x => [String(x?.id || ''), x]).filter(([id]) => id)); }
  function rowPrice(row, products){
    const direct = num(row?.precio);
    if(direct) return direct;
    const p = products[String(row?.productoId || '')] || {};
    return num(p.defaultPrecio ?? p.precio);
  }
  function chooseScope(){
    return new Promise(resolve => {
      const old = document.getElementById('ceBackupScopeV841Id'); if(old) old.remove();
      const overlay = document.createElement('div');
      overlay.id = 'ceBackupScopeV841Id';
      overlay.className = 'ce-backup-overlay-v181';
      const events = arr('eventos');
      overlay.innerHTML = `<div class="ce-backup-modal-v181"><h3>Descarga de datos</h3><p>Elige si quieres descargar todos los datos o solo los vinculados a un evento concreto.</p><div class="field"><label>Evento a descargar</label><select id="ceBackupScopeSelectV841Id"><option value="TODOS">TODOS los eventos</option>${events.map(e => `<option value="${esc(e.id)}" ${String(e.id)===selectedEventId()?'selected':''}>${esc(e.titulo || e.id)}</option>`).join('')}</select></div><div class="ce-backup-actions-v181"><button type="button" class="outline" id="ceBackupCancelV841Id">Cancelar</button><button type="button" id="ceBackupOkV841Id">Descargar</button></div></div>`;
      document.body.appendChild(overlay);
      const done = value => { overlay.remove(); resolve(value); };
      overlay.querySelector('#ceBackupCancelV841Id')?.addEventListener('click', () => done(null));
      overlay.querySelector('#ceBackupOkV841Id')?.addEventListener('click', () => done(overlay.querySelector('#ceBackupScopeSelectV841Id')?.value || 'TODOS'));
      overlay.addEventListener('click', ev => { if(ev.target === overlay) done(null); });
    });
  }
  function filenameFromDisposition(disposition){
    const text = String(disposition || '');
    const utf = text.match(/filename\*=UTF-8''([^;]+)/i);
    if(utf){ try{ return decodeURIComponent(utf[1]); }catch(_){ return utf[1]; } }
    const plain = text.match(/filename="?([^";]+)"?/i);
    return plain ? plain[1] : '';
  }
  function downloadBlob(blob, filename){
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { try{ URL.revokeObjectURL(a.href); }catch(_){} try{ a.remove(); }catch(_){} }, 1600);
  }
  async function downloadServerBackup(scope){
    const eventId = scope === 'TODOS' ? '' : scope;
    const params = new URLSearchParams({scope: scope || 'TODOS', eventId, v:'8.5-eventid', t:String(Date.now())});
    const response = await fetch(`/api/export/backup?${params.toString()}`, {cache:'no-store'});
    if(!response.ok){
      let detail = '';
      try{ const data = await response.json(); detail = data?.error || JSON.stringify(data); }catch(_){ detail = await response.text().catch(()=> ''); }
      throw new Error(`Servidor no generó backup (${response.status}). ${detail || ''}`.trim());
    }
    const blob = await response.blob();
    if(!blob || blob.size === 0) throw new Error('El servidor devolvió un backup vacío.');
    const ev = scope === 'TODOS' ? null : arr('eventos').find(e => String(e.id) === String(scope));
    downloadBlob(blob, filenameFromDisposition(response.headers.get('content-disposition')) || backupFileName(scope, ev?.titulo || scope));
    return {ok:true, source:'server-api-export-eventid'};
  }
  function scopedState(scope){
    const all = scope === 'TODOS';
    const eventos = all ? arr('eventos').slice() : arr('eventos').filter(e => String(e.id) === String(scope));
    const eventIds = new Set(eventos.map(e => String(e.id)));
    const colaboradores = arr('colaboradores').filter(c => all || eventIds.has(String(c.eventId)));
    const compras = arr('compras').filter(c => all || eventIds.has(String(c.eventId)));
    const eventDocuments = arr('eventDocuments').filter(doc => all || eventIds.has(String(doc.eventId)));
    const personIds = new Set();
    colaboradores.forEach(c => { if(c.personaId) personIds.add(String(c.personaId)); });
    compras.forEach(c => { if(c.responsableId) personIds.add(String(c.responsableId)); const d = norm(c.donorRef); if(d.startsWith('P:')) personIds.add(d.slice(2)); });
    const storeIds = new Set();
    compras.forEach(c => { if(c.tiendaId) storeIds.add(String(c.tiendaId)); const d = norm(c.donorRef); if(d.startsWith('T:')) storeIds.add(d.slice(2)); });
    const productIds = new Set(compras.map(c => String(c.productoId || '')).filter(Boolean));
    const ticketImages = {};
    const imageSources = [appState().ticketImages, appState().ticketImageRefs];
    imageSources.forEach(store => {
      if(!store || typeof store !== 'object') return;
      Object.entries(store).forEach(([key, value]) => {
        const info = ticketInfo(key, value, eventIds, all);
        if(info.eventId && info.innerKey && !ticketImages[`${info.eventId}|${info.innerKey}`]) ticketImages[`${info.eventId}|${info.innerKey}`] = value;
      });
    });
    return {
      eventos,
      personas: all ? arr('personas').slice() : arr('personas').filter(p => personIds.has(String(p.id))),
      tiendas: all ? arr('tiendas').slice() : arr('tiendas').filter(t => storeIds.has(String(t.id))),
      productos: all ? arr('productos').slice() : arr('productos').filter(p => productIds.has(String(p.id))),
      colaboradores,
      compras,
      eventDocuments,
      ticketImages
    };
  }
  function imageSource(value){
    if(!value) return '';
    if(typeof value === 'string') return norm(value);
    if(typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || value.src || '');
    return String(value);
  }
  function decodeBase64UrlText(value){
    const raw = norm(value).replace(/\.[a-z0-9]+(?:\?.*)?$/i, '');
    if(!raw) return '';
    try{ const b64 = raw.replace(/-/g,'+').replace(/_/g,'/'); const padded = b64 + '='.repeat((4 - b64.length % 4) % 4); return decodeURIComponent(Array.prototype.map.call(atob(padded), ch => '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2)).join('')); }catch(_){ return ''; }
  }
  function eventFromKey(key){ return norm(key).split('|')[0] || ''; }
  function innerFromKey(key){ const parts = norm(key).split('|'); return parts.slice(1).join('|').trim(); }
  function eventFromValue(value){ const m = imageSource(value).match(/\/ticket-images\/([^\/?#]+)\//i); return m ? decodeURIComponent(m[1]) : ''; }
  function decodedKeyFromValue(value){ const m = imageSource(value).match(/\/ticket-images\/[^\/?#]+\/([^\/?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i); return m ? decodeBase64UrlText(m[1]) : ''; }
  function ticketInfo(key, value, eventIds, all){
    const raw = norm(key), decoded = decodedKeyFromValue(value);
    const events = [eventFromKey(decoded), eventFromValue(value), eventFromKey(raw)].filter(Boolean);
    let eventId = events.find(ev => all || eventIds.has(String(ev))) || '';
    let innerKey = '';
    if(eventId){
      if(eventFromKey(decoded) === eventId) innerKey = innerFromKey(decoded) || decoded;
      if(!innerKey && eventFromKey(raw) === eventId) innerKey = innerFromKey(raw) || raw;
      if(!innerKey) innerKey = innerFromKey(decoded) || innerFromKey(raw) || raw;
      if(innerKey.startsWith(eventId + '|')) innerKey = norm(innerKey.slice(eventId.length + 1));
    }
    return {eventId, innerKey};
  }
  function sheet(wb, name, headers, rows){
    const ws = wb.addWorksheet(name);
    ws.columns = headers.map(h => ({width: Math.max(14, Math.min(42, String(h).length + 4))}));
    headers.forEach((h,i) => { const c = ws.getCell(1, i + 1); c.value = h; c.font = {bold:true, color:{argb:'FFFFFFFF'}}; c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}}; c.alignment = {horizontal:'center', vertical:'middle', wrapText:true}; });
    rows.forEach(r => ws.addRow(r.map(v => v == null ? '' : v)));
    ws.views = [{state:'frozen', ySplit:1}];
    ws.columns.forEach((col, idx) => { let w = col.width || 14; col.eachCell({includeEmpty:true}, cell => { w = Math.max(w, Math.min(70, String(cell.value ?? '').length + 3)); }); col.width = headers[idx] === 'IMAGEN_BASE64_PARTE' ? 72 : Math.min(70, w); });
    return ws;
  }
  function splitLongText(value, size = 8000){ const text = String(value || ''); const out = []; for(let i=0; i<text.length; i += size) out.push(text.slice(i, i + size)); return out.length ? out : ['']; }
  async function ensureExcelJSLocal(){
    if(window.ExcelJS) return window.ExcelJS;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = '/vendor/exceljs.min.js';
      s.onload = resolve; s.onerror = () => reject(new Error('No se pudo cargar ExcelJS.'));
      document.head.appendChild(s);
    });
    if(!window.ExcelJS) throw new Error('ExcelJS no quedó disponible.');
    return window.ExcelJS;
  }
  async function clientBackup(scope){
    const ExcelJS = await ensureExcelJSLocal();
    const scoped = scopedState(scope);
    const entityMaps = appState().entityCodeMaps || {};
    const personCode = makeCodes(scoped.personas, 'PE', entityMaps.personas || {});
    const storeCode = makeCodes(scoped.tiendas, 'TI', entityMaps.tiendas || {});
    const productCode = makeCodes(scoped.productos, 'PR', entityMaps.productos || {});
    const products = byId(scoped.productos);
    const selected = scope === 'TODOS' ? null : scoped.eventos.find(e => String(e.id) === String(scope));
    const wb = new ExcelJS.Workbook();
    wb.creator = `${VERSION} - ©oltyLAB '26`;
    wb.created = new Date();
    const now = stamp();
    sheet(wb, 'METADATOS', ['CAMPO','VALOR'], [
      ['VERSION', VERSION], ['VERSION_FICHERO', VERSION_FILE], ['FUENTE_DATOS', 'client-fallback-eventid'],
      ['ALCANCE', scope === 'TODOS' ? 'TODOS' : (selected?.titulo || scope)], ['EVENTO_ID', scope === 'TODOS' ? 'TODOS' : scope],
      ['FECHA_DESCARGA', `${now.yyyy}${now.mm}${now.dd}-${now.hh}_${now.mi}_${now.ss}`], ['NOTA', 'EVENTO_CODIGO contiene el EVENTO_ID real en hojas relacionales; EVENTOS no incluye EVxxx.']
    ]);
    sheet(wb, 'EVENTOS', ['EVENTO_ID','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'], scoped.eventos.map(e => [e.id || '', e.titulo || '', num(e.precio), e.fechaIni || '', e.fechaFin || '', e.situacion || 'En curso', e.descripcion || '']));
    sheet(wb, 'PERSONAS', ['PERSONA_CODIGO','PERSONA_ID','PERSONA_NOMBRE','PERSONA_RANGO'], scoped.personas.map(p => [personCode[p.id] || '', p.id || '', p.nombre || '', p.rango || 'SOCIO']));
    sheet(wb, 'TIENDAS', ['TIENDA_CODIGO','TIENDA_ID','TIENDA_NOMBRE'], scoped.tiendas.map(t => [storeCode[t.id] || '', t.id || '', t.nombre || '']));
    sheet(wb, 'PRODUCTOS', ['PRODUCTO_CODIGO','PRODUCTO_ID','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO','PRODUCTO_PRECIO_REFERENCIA'], scoped.productos.map(p => [productCode[p.id] || '', p.id || '', p.nombre || '', p.segmento || '', p.destino || '', num(p.defaultPrecio ?? p.precio)]));
    sheet(wb, 'INGRESOS', ['EVENTO_CODIGO','INGRESO_ID','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'], scoped.colaboradores.map(c => [c.eventId || '', c.id || '', personCode[c.personaId] || '', num(c.numero), c.situacion || c.ingreso || 'Pendiente', num(c.importe ?? c.importeVoluntario)]));
    sheet(wb, 'COMPRAS', ['EVENTO_CODIGO','COMPRA_ID','PRODUCTO_CODIGO','UNIDADES','PRECIO','TICKET_U_OTROS_GASTOS','TIENDA_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => !isDonation(ticket(c))).map(c => [c.eventId || '', c.id || '', productCode[c.productoId] || '', num(c.unidades), rowPrice(c, products), ticket(c), storeCode[c.tiendaId] || '', personCode[c.responsableId] || '']));
    sheet(wb, 'DONACIONES', ['EVENTO_CODIGO','DONACION_ID','PRODUCTO_CODIGO','UNIDADES','PRECIO','TIPO_DONACION','DONANTE_TIPO','DONANTE_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => isDonation(ticket(c))).map(c => { const parts = String(c.donorRef || '').split(':'); const kind = parts[0], id = parts[1]; return [c.eventId || '', c.id || '', productCode[c.productoId] || '', num(c.unidades), rowPrice(c, products), ticket(c), kind === 'P' ? 'PERSONA' : (kind === 'T' ? 'TIENDA' : ''), kind === 'P' ? (personCode[id] || '') : (kind === 'T' ? (storeCode[id] || '') : ''), personCode[c.responsableId] || '']; }));
    sheet(wb, 'DOCUMENTOS', ['EVENTO_CODIGO','DOC_CODIGO','DOC_ID','FECHA','DESCRIPCION','CLAVE_IMAGEN','FOTO_URL'], (scoped.eventDocuments || []).map(doc => {
      const code = documentToken(doc?.codigo || doc?.imageKey || doc?.id);
      const key = doc?.eventId && code ? `${doc.eventId}|${code}` : '';
      const image = key ? (scoped.ticketImages?.[key] || '') : '';
      const imageText = typeof image === 'object' ? (image.url || image.public_url || image.publicUrl || image.pathname || image.path || image.storage_path || image.dataUrl || image.base64 || '') : String(image || '');
      return [doc?.eventId || '', code, doc?.id || key, doc?.fecha || '', doc?.descripcion || '', code, imageText || doc?.imageUrl || ''];
    }));
    const ticketRows = [], partRows = [];
    Object.entries(scoped.ticketImages || {}).forEach(([fullKey, image]) => {
      const eventId = eventFromKey(fullKey);
      const inner = innerFromKey(fullKey) || fullKey;
      const data = typeof image === 'object' ? JSON.stringify(image) : String(image || '');
      const parts = splitLongText(data, 8000);
      ticketRows.push([eventId, inner, '', '', data ? 'IMAGEN_DIVIDIDA_EN_TICKETS_PARTES_V41_2' : 'SIN_IMAGEN']);
      parts.forEach((part, idx) => partRows.push([eventId, inner, idx + 1, parts.length, part]));
    });
    sheet(wb, 'TICKETS', ['EVENTO_CODIGO','CLAVE_RESUMEN','ARCHIVO_IMAGEN','IMAGEN_BASE64','OBSERVACIONES'], ticketRows);
    sheet(wb, 'TICKETS_PARTES', ['EVENTO_CODIGO','CLAVE_RESUMEN','PARTE','TOTAL_PARTES','IMAGEN_BASE64_PARTE'], partRows);
    const buffer = await wb.xlsx.writeBuffer();
    downloadBlob(new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}), backupFileName(scope, selected?.titulo || scope));
    return {ok:true, source:'client-fallback-eventid'};
  }
  async function exportBackupEventId(){
    if(!isGD()){ alert('Solo GD puede realizar descarga de datos.'); return; }
    const scope = await chooseScope();
    if(!scope) return;
    try{ return await downloadServerBackup(scope); }
    catch(serverError){
      console.warn('[ControlEvent/v8.5] Backup servidor no disponible; se genera fallback cliente con EVENTO_ID.', serverError);
      return clientBackup(scope);
    }
  }
  function patchImportRows(){
    try{
      if(typeof readSheetRows !== 'function' || readSheetRows.__ceEventIdFormat) return;
      const previous = readSheetRows;
      const wrapped = function(workbook, wantedName){
        const rows = previous.apply(this, arguments) || [];
        const name = (typeof normalizeHeader === 'function' ? normalizeHeader(wantedName) : up(wantedName));
        if(name === 'EVENTOS'){
          rows.forEach(row => {
            if(!norm(row.EVENTO_CODIGO) && norm(row.EVENTO_ID)) row.EVENTO_CODIGO = norm(row.EVENTO_ID);
          });
        }
        return rows;
      };
      wrapped.__ceEventIdFormat = true;
      try{ readSheetRows = wrapped; }catch(_){ }
      window.readSheetRows = wrapped;
    }catch(err){ console.warn('[ControlEvent/v8.5] No se pudo adaptar importación EVENTO_ID.', err); }
  }
  function install(){
    patchImportRows();
    try{
      if(!window.__ceV257 || typeof window.__ceV257 !== 'object') window.__ceV257 = {};
      window.__ceV257.exportSeedWorkbook = exportBackupEventId;
    }catch(_){ }
    try{ exportSeedWorkbook = exportBackupEventId; }catch(_){ }
    window.exportSeedWorkbook = exportBackupEventId;
  }
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:modules-ready'].forEach(evt => window.addEventListener(evt, install, true));
  setTimeout(install, 0); setTimeout(install, 250); setTimeout(install, 1200);
  window.ControlEventBackupEventIdFormat = {version:VERSION, mode:'event-id-no-evxxx', exportBackupEventId, clientBackup};
})();
