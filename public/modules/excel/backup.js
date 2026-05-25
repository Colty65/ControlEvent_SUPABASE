import { registerExcelModule, ensureExcelJS as ensureRuntimeExcelJS } from './_excel-runtime.js';

export const meta = {
  name: 'backup',
  version: 'v33.7',
  mode: 'server-backup-download-with-client-fallback',
  description: 'Descarga de datos/backup: descarga principal generada por /api/export/backup y fallback cliente si el endpoint no está disponible.'
};

const BACKUP_VERSION = 'ControlEvent v44.7.3';
const BACKUP_VERSION_FILE = 'ControlEvent_v44_7_3';
const BACKUP_PASSWORD = 'open_excel_arrastre';
const COLLECTIONS = ['eventos','personas','tiendas','productos','colaboradores','compras'];

const norm = value => String(value ?? '').trim();
const num = value => {
  if(typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let s = String(value ?? '').replace(/[^0-9,.-]/g, '');
  if(s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if(s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const rows = (state, key) => Array.isArray(state?.[key]) ? state[key] : [];
const countRows = state => COLLECTIONS.reduce((total, key) => total + rows(state, key).length, 0) + Object.keys(state?.ticketImages || {}).length;
const cleanFilePart = value => norm(value || 'SIN_TITULO').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'SIN_TITULO';
function stamp(date = new Date()){
  const pad = n => String(n).padStart(2, '0');
  return {yyyy:date.getFullYear(), mm:pad(date.getMonth()+1), dd:pad(date.getDate()), hh:pad(date.getHours()), mi:pad(date.getMinutes()), ss:pad(date.getSeconds())};
}
function backupFileName(scope, title){
  const s = stamp();
  const label = scope === 'TODOS' ? 'TODOS' : cleanFilePart(title || scope || 'EVENTO');
  return `${BACKUP_VERSION_FILE}_BACKUP_${label}_${s.dd}${s.mm}${s.yyyy}_${s.hh}_${s.mi}_${s.ss}.xlsx`;
}
function backupServerUrl(scope){
  const params = new URLSearchParams({scope: scope || 'TODOS', t: String(Date.now())});
  return `/api/export/backup?${params.toString()}`;
}
function filenameFromDisposition(disposition){
  const text = String(disposition || '');
  const utf = text.match(/filename\*=UTF-8''([^;]+)/i);
  if(utf){ try{ return decodeURIComponent(utf[1]); }catch(_){ return utf[1]; } }
  const plain = text.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1] : '';
}
async function downloadServerBackup(scope){
  const url = backupServerUrl(scope);
  const response = await fetch(url, {cache:'no-store'});
  if(!response.ok){
    let detail = '';
    try{ const data = await response.json(); detail = data?.error || JSON.stringify(data); }catch(_){ detail = await response.text().catch(()=> ''); }
    throw new Error(`Servidor no generó backup (${response.status}). ${detail || ''}`.trim());
  }
  const blob = await response.blob();
  if(!blob || blob.size === 0) throw new Error('El servidor devolvió un backup vacío.');
  const filename = filenameFromDisposition(response.headers.get('content-disposition')) || backupFileName(scope, scope);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1600);
  return {ok:true, source:'server-api-export', scope, filename, size: blob.size};
}
function isGD(){
  const user = window.ControlEventApp?.authUser || window.authUser || window.__CONTROL_EVENT_USER__ || null;
  return String(user?.nivel || '').trim().toUpperCase() === 'GD';
}
async function ensureExcelJS(){
  return ensureRuntimeExcelJS();
}
function cloneState(value){
  if(!value || typeof value !== 'object') return {};
  try{ return JSON.parse(JSON.stringify(value)); }catch(_){ return {...value}; }
}
function normalizeState(value){
  const state = cloneState(value);
  for(const key of COLLECTIONS) if(!Array.isArray(state[key])) state[key] = [];
  state.ticketImages = state.ticketImages && typeof state.ticketImages === 'object' ? state.ticketImages : {};
  return state;
}
async function fetchServerState(){
  const res = await fetch('/api/state', {cache:'no-store'});
  if(!res.ok) throw new Error(`No se pudo leer /api/state (${res.status}).`);
  return normalizeState(await res.json());
}
function fallbackState(){
  const appState = window.ControlEventApp?.state;
  const globalState = window.state;
  const candidates = [appState, globalState, window.__CONTROL_EVENT_STATE__].map(normalizeState);
  candidates.sort((a,b) => countRows(b) - countRows(a));
  return candidates[0] || normalizeState({});
}
async function getBestState(){
  let source = 'server';
  let state = null;
  try{ state = await fetchServerState(); }
  catch(error){
    console.warn('[ControlEventExcel/v33.7] No se pudo leer /api/state; se usa estado de la app.', error);
    source = 'app-fallback';
    state = fallbackState();
  }
  const app = fallbackState();
  if(countRows(app) > countRows(state)){
    source = source === 'server' ? 'app-fallback-mas-completo' : source;
    state = app;
  }
  return {state: normalizeState(state), source, counts: countsFor(state)};
}
function countsFor(state){
  return {
    eventos: rows(state,'eventos').length,
    personas: rows(state,'personas').length,
    tiendas: rows(state,'tiendas').length,
    productos: rows(state,'productos').length,
    colaboradores: rows(state,'colaboradores').length,
    compras: rows(state,'compras').length,
    ticketImages: Object.keys(state?.ticketImages || {}).length
  };
}
function chooseBackupScope(state){
  return new Promise(resolve => {
    const events = rows(state, 'eventos');
    const selectedId = window.ControlEventApp?.state?.selectedEventId || state.selectedEventId || '';
    const overlay = document.createElement('div');
    overlay.className = 'ce-backup-overlay-v181';
    overlay.innerHTML = `<div class="ce-backup-modal-v181"><h3>Descarga de datos</h3><p>Elige si quieres descargar todos los datos o solo los vinculados a un evento concreto.</p><div class="field"><label>Evento a descargar</label><select id="ceBackupScopeV2702"><option value="TODOS">TODOS los eventos</option>${events.map(e => `<option value="${esc(e.id)}" ${String(e.id)===String(selectedId)?'selected':''}>${esc(e.titulo || e.id)}</option>`).join('')}</select></div><div class="ce-backup-actions-v181"><button type="button" class="outline" id="ceBackupCancelV2702">Cancelar</button><button type="button" id="ceBackupOkV2702">Descargar</button></div></div>`;
    document.body.appendChild(overlay);
    const done = value => { overlay.remove(); resolve(value); };
    overlay.querySelector('#ceBackupCancelV2702')?.addEventListener('click', () => done(null));
    overlay.querySelector('#ceBackupOkV2702')?.addEventListener('click', () => done(overlay.querySelector('#ceBackupScopeV2702')?.value || 'TODOS'));
    overlay.addEventListener('click', ev => { if(ev.target === overlay) done(null); });
  });
}
function byIdMap(items){ return Object.fromEntries((items || []).map(item => [String(item.id), item])); }
function makeCodes(items, prefix){
  const out = {};
  (items || []).forEach((item, index) => { out[item.id] = prefix + String(index + 1).padStart(prefix === 'EV' ? 3 : 4, '0'); });
  return out;
}
function ticketEventIdFromKey(key){ return String(key || '').split('|')[0] || ''; }
function ticketInnerKeyFromKey(key){ const parts = String(key || '').split('|'); return parts.slice(1).join('|').trim(); }
function isDonation(ticket){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(norm(ticket)); }
function ticket(c){ return norm(c?.ticketDonacion ?? c?.ticket ?? c?.ticketOtrosGastos ?? ''); }
function price(c, productMap){
  const direct = num(c?.precio);
  if(direct) return direct;
  const p = productMap[String(c?.productoId)] || {};
  return num(p.defaultPrecio ?? p.precio);
}
function scopedBackupState(fullState, scope){
  const all = scope === 'TODOS';
  const eventos = all ? [...rows(fullState,'eventos')] : rows(fullState,'eventos').filter(e => String(e.id) === String(scope));
  const eventIds = new Set(eventos.map(e => String(e.id)));
  const colaboradores = rows(fullState,'colaboradores').filter(c => all || eventIds.has(String(c.eventId)));
  const compras = rows(fullState,'compras').filter(c => all || eventIds.has(String(c.eventId)));
  const personIds = new Set();
  colaboradores.forEach(c => { if(c.personaId) personIds.add(String(c.personaId)); });
  compras.forEach(c => {
    if(c.responsableId) personIds.add(String(c.responsableId));
    const donor = String(c.donorRef || '');
    if(donor.startsWith('P:')) personIds.add(donor.slice(2));
  });
  const storeIds = new Set();
  compras.forEach(c => {
    if(c.tiendaId) storeIds.add(String(c.tiendaId));
    const donor = String(c.donorRef || '');
    if(donor.startsWith('T:')) storeIds.add(donor.slice(2));
  });
  const productIds = new Set(compras.map(c => String(c.productoId || '')).filter(Boolean));
  const personas = all ? [...rows(fullState,'personas')] : rows(fullState,'personas').filter(p => personIds.has(String(p.id)));
  const tiendas = all ? [...rows(fullState,'tiendas')] : rows(fullState,'tiendas').filter(t => storeIds.has(String(t.id)));
  const productos = all ? [...rows(fullState,'productos')] : rows(fullState,'productos').filter(p => productIds.has(String(p.id)));
  const ticketImages = {};
  Object.entries(fullState.ticketImages || {}).forEach(([key, value]) => {
    if(all || eventIds.has(String(ticketEventIdFromKey(key)))) ticketImages[key] = value;
  });
  return {eventos, personas, tiendas, productos, colaboradores, compras, ticketImages};
}
function splitLongText(value, size = 30000){
  const text = String(value || '');
  const out = [];
  for(let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : [''];
}
function setupWorkbook(ExcelJS){
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BACKUP_VERSION} - ©oltyLAB '26`;
  wb.created = new Date();
  const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
  const fills = {title:'FF111827', soft:'FFF8FAFC', white:'FFFFFFFF'};
  function sheet(name, headers){
    const ws = wb.addWorksheet(name);
    ws.properties.defaultRowHeight = 21;
    ws.columns = headers.map(h => ({width: Math.max(14, Math.min(42, String(h).length + 4))}));
    headers.forEach((h,i) => {
      const c = ws.getCell(1, i + 1);
      c.value = h;
      c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:fills.title}};
      c.font = {bold:true, color:{argb:'FFFFFFFF'}};
      c.border = border;
      c.alignment = {vertical:'middle', horizontal:'center', wrapText:true};
    });
    ws.getRow(1).height = 24;
    ws.views = [{state:'frozen', ySplit:1}];
    return ws;
  }
  function addRows(name, headers, data){
    const ws = sheet(name, headers);
    data.forEach(row => ws.addRow(row.map(v => v == null ? '' : v)));
    ws.eachRow(row => row.eachCell(cell => {
      cell.border = border;
      cell.alignment = {vertical:'middle', horizontal:'left', wrapText:true};
    }));
    ws.columns.forEach((col, idx) => {
      let width = col.width || 14;
      col.eachCell({includeEmpty:true}, cell => { width = Math.max(width, Math.min(70, String(cell.value ?? '').length + 3)); });
      col.width = headers[idx] === 'IMAGEN_BASE64_PARTE' ? 72 : Math.min(70, width);
    });
    return ws;
  }
  return {wb, addRows};
}
async function protectWorkbook(wb){
  for(const ws of wb.worksheets){
    try{
      ws.eachRow(row => row.eachCell(cell => { cell.protection = {locked:true}; }));
      await ws.protect(BACKUP_PASSWORD, {
        selectLockedCells:true, selectUnlockedCells:true,
        formatCells:false, formatColumns:false, formatRows:false,
        insertColumns:false, insertRows:false, deleteColumns:false, deleteRows:false,
        sort:false, autoFilter:false, pivotTables:false,
        objects:false, scenarios:false
      });
    }catch(_){ }
  }
}
async function downloadWorkbook(wb, filename){
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1200);
}

export async function run(options = {}){
  if(!isGD()){
    alert('Solo GD puede realizar descarga de datos.');
    return null;
  }
  const {state, source, counts} = await getBestState();
  const scope = options.scope || await chooseBackupScope(state);
  if(!scope) return null;
  const scoped = scopedBackupState(state, scope);
  const scopedCounts = countsFor(scoped);
  const dataCount = countRows(scoped);
  console.info('[ControlEventExcel/v33.7] Descarga de datos solicitada', {source, counts, scope, scopedCounts});
  try{
    const serverResult = await downloadServerBackup(scope);
    console.info('[ControlEventExcel/v33.7] Backup generado por servidor', serverResult);
    return {...serverResult, counts, scopedCounts};
  }catch(serverError){
    console.warn('[ControlEventExcel/v33.7] Fallback a backup cliente', serverError);
  }
  if(dataCount === 0){
    alert('No hay datos que descargar. La descarga se ha cancelado para evitar un Excel solo con cabeceras.');
    return null;
  }
  const ExcelJS = await ensureExcelJS();
  const {wb, addRows} = setupWorkbook(ExcelJS);
  const eventCode = makeCodes(scoped.eventos, 'EV');
  const personCode = makeCodes(scoped.personas, 'PE');
  const storeCode = makeCodes(scoped.tiendas, 'TI');
  const productCode = makeCodes(scoped.productos, 'PR');
  const productMap = byIdMap(scoped.productos);
  const selectedEvent = scope === 'TODOS' ? null : scoped.eventos.find(e => String(e.id) === String(scope));
  const selectedCode = scope === 'TODOS' ? 'TODOS' : (eventCode[scope] || 'EV001');
  const selectedTitle = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.titulo || selectedCode || 'EVENTO');
  const now = stamp();

  addRows('METADATOS', ['CAMPO','VALOR'], [
    ['VERSION', BACKUP_VERSION],
    ['VERSION_FICHERO', BACKUP_VERSION_FILE],
    ['FUENTE_DATOS', source],
    ['ALCANCE', scope === 'TODOS' ? 'TODOS' : selectedTitle],
    ['EVENTO_CODIGO', scope === 'TODOS' ? 'TODOS' : selectedCode],
    ['FECHA_DESCARGA', `${now.yyyy}${now.mm}${now.dd}-${now.hh}_${now.mi}_${now.ss}`],
    ['REGISTROS_EVENTOS', scopedCounts.eventos],
    ['REGISTROS_PERSONAS', scopedCounts.personas],
    ['REGISTROS_TIENDAS', scopedCounts.tiendas],
    ['REGISTROS_PRODUCTOS', scopedCounts.productos],
    ['REGISTROS_INGRESOS', scopedCounts.colaboradores],
    ['REGISTROS_COMPRAS', scopedCounts.compras],
    ['REGISTROS_TICKETS', scopedCounts.ticketImages],
    ['PROTECCION', 'Hojas protegidas para evitar cambios accidentales en la descarga.'],
    ['NOTA', 'Las imagenes grandes de tickets se dividen en TICKETS_PARTES para evitar ficheros Excel corruptos.']
  ]);
  addRows('EVENTOS', ['EVENTO_CODIGO','EVENTO_ID','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'], scoped.eventos.map(e => [eventCode[e.id], e.id, e.titulo || '', num(e.precio), e.fechaIni || '', e.fechaFin || '', e.situacion || 'En curso', e.descripcion || '']));
  addRows('PERSONAS', ['PERSONA_CODIGO','PERSONA_ID','PERSONA_NOMBRE','PERSONA_RANGO'], scoped.personas.map(p => [personCode[p.id], p.id, p.nombre || '', p.rango || 'SOCIO']));
  addRows('TIENDAS', ['TIENDA_CODIGO','TIENDA_ID','TIENDA_NOMBRE'], scoped.tiendas.map(t => [storeCode[t.id], t.id, t.nombre || '']));
  const wsProductos = addRows('PRODUCTOS', ['PRODUCTO_CODIGO','PRODUCTO_ID','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO','PRODUCTO_PRECIO_REFERENCIA'], scoped.productos.map(p => [productCode[p.id], p.id, p.nombre || '', p.segmento || '', p.destino || '', num(p.defaultPrecio ?? p.precio)]));
  try{ wsProductos.getColumn(6).numFmt = '#,##0.00 [$€-C0A]'; }catch(_){ }
  addRows('INGRESOS', ['EVENTO_CODIGO','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'], scoped.colaboradores.map(c => [eventCode[c.eventId] || '', personCode[c.personaId] || '', num(c.numero), c.situacion || c.ingreso || 'Pendiente', num(c.importe ?? c.importeVoluntario)]));
  addRows('COMPRAS', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TICKET_U_OTROS_GASTOS','TIENDA_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => !isDonation(ticket(c))).map(c => [eventCode[c.eventId] || '', productCode[c.productoId] || '', num(c.unidades), price(c, productMap), ticket(c), storeCode[c.tiendaId] || '', personCode[c.responsableId] || '']));
  addRows('DONACIONES', ['EVENTO_CODIGO','PRODUCTO_CODIGO','UNIDADES','PRECIO','TIPO_DONACION','DONANTE_TIPO','DONANTE_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => isDonation(ticket(c))).map(c => { const parts = String(c.donorRef || '').split(':'); const kind = parts[0], id = parts[1]; return [eventCode[c.eventId] || '', productCode[c.productoId] || '', num(c.unidades), price(c, productMap), ticket(c), kind === 'P' ? 'PERSONA' : (kind === 'T' ? 'TIENDA' : ''), kind === 'P' ? (personCode[id] || '') : (kind === 'T' ? (storeCode[id] || '') : ''), personCode[c.responsableId] || '']; }));
  const ticketRows = [], partRows = [];
  Object.entries(scoped.ticketImages || {}).forEach(([fullKey, image]) => {
    const evCode = eventCode[ticketEventIdFromKey(fullKey)] || '';
    const key = ticketInnerKeyFromKey(fullKey);
    const data = typeof image === 'object' ? JSON.stringify(image) : String(image || '');
    const parts = splitLongText(data, 30000);
    ticketRows.push([evCode, key, '', data.length <= 30000 ? data : '', data.length > 30000 ? 'DIVIDIDA_EN_TICKETS_PARTES' : '']);
    parts.forEach((part, idx) => partRows.push([evCode, key, idx + 1, parts.length, part]));
  });
  addRows('TICKETS', ['EVENTO_CODIGO','CLAVE_RESUMEN','ARCHIVO_IMAGEN','IMAGEN_BASE64','OBSERVACIONES'], ticketRows);
  addRows('TICKETS_PARTES', ['EVENTO_CODIGO','CLAVE_RESUMEN','PARTE','TOTAL_PARTES','IMAGEN_BASE64_PARTE'], partRows);
  await protectWorkbook(wb);
  await downloadWorkbook(wb, backupFileName(scope, selectedTitle));
  return {ok:true, source, scope, counts, scopedCounts, filename: backupFileName(scope, selectedTitle)};
}

registerExcelModule('exportSeedWorkbook', {meta, run});
registerExcelModule('backup', {meta, run});
