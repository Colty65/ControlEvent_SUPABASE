import express from 'express';
import ExcelJS from 'exceljs';
import { asyncHandler } from './_async.js';
import { getState } from '../services/state.service.js';

const router = express.Router();
const BACKUP_VERSION = 'ControlEvent v8.2_prod';
const BACKUP_VERSION_FILE = 'ControlEvent_v8_2_prod';
const BACKUP_PASSWORD = 'open_excel_arrastre';
const COLLECTIONS = ['eventos','personas','tiendas','productos','colaboradores','compras'];

const norm = value => String(value ?? '').trim();
const num = value => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let s = String(value ?? '').replace(/[^0-9,.-]/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};
const arr = (state, key) => Array.isArray(state?.[key]) ? state[key] : [];
const cleanFilePart = value => norm(value || 'SIN_TITULO').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'SIN_TITULO';
const countRows = state => COLLECTIONS.reduce((total, key) => total + arr(state, key).length, 0) + Object.keys(state?.ticketImages || {}).length;
function stamp(date = new Date()){
  const pad = n => String(n).padStart(2, '0');
  return {yyyy:date.getFullYear(), mm:pad(date.getMonth()+1), dd:pad(date.getDate()), hh:pad(date.getHours()), mi:pad(date.getMinutes()), ss:pad(date.getSeconds())};
}
function backupFileName(scope, title){
  const s = stamp();
  const label = scope === 'TODOS' ? 'TODOS' : cleanFilePart(title || scope || 'EVENTO');
  return `${BACKUP_VERSION_FILE}_BACKUP_${label}_${s.yyyy}${s.mm}${s.dd}_${s.hh}${s.mi}${s.ss}.xlsx`;
}
function plainRow(row){
  if(!row || typeof row !== 'object') return row;
  const out = {};
  Object.keys(row).forEach(key => {
    const value = row[key];
    if(value == null || ['string','number','boolean'].includes(typeof value)) out[key] = value;
    else if(value instanceof Date) out[key] = value.toISOString();
    else if(Array.isArray(value)) out[key] = value.map(item => (item == null || ['string','number','boolean'].includes(typeof item)) ? item : String(item));
    else out[key] = value.id || value.value || value.nombre || value.titulo || '';
  });
  return out;
}
function normalizeTicketImage(value){
  if(value == null) return '';
  if(typeof value === 'string') return value;
  if(typeof value !== 'object') return String(value);
  return value.base64 || value.dataUrl || value.dataURL || value.image || value.src || value.public_url || value.publicUrl || value.url || value.pathname || value.storage_path || value.path || value.filename || value.name || '';
}
function normalizeState(value){
  const source = value && typeof value === 'object' ? value : {};
  const state = {};
  for (const key of COLLECTIONS) state[key] = Array.isArray(source[key]) ? source[key].map(plainRow) : [];
  state.ticketImages = {};
  const imageSources = [
    source.ticketImages && typeof source.ticketImages === 'object' ? source.ticketImages : {},
    source.ticketImageRefs && typeof source.ticketImageRefs === 'object' ? source.ticketImageRefs : {}
  ];
  imageSources.forEach(ticketImages => {
    Object.entries(ticketImages).forEach(([key, image]) => {
      if(!state.ticketImages[String(key)]) state.ticketImages[String(key)] = normalizeTicketImage(image);
    });
  });
  return state;
}
function byIdMap(items){ return Object.fromEntries((items || []).map(item => [String(item.id), item])); }
function makeCodes(items, prefix){
  const out = {};
  (items || []).forEach((item, index) => { out[item.id] = prefix + String(index + 1).padStart(prefix === 'EV' ? 3 : 4, '0'); });
  return out;
}
function ticketEventIdFromKey(key){ return String(key || '').split('|')[0] || ''; }
function ticketInnerKeyFromKey(key){ const parts = String(key || '').split('|'); return parts.slice(1).join('|').trim(); }

function ticketImageSource(value){
  if(!value) return '';
  if(typeof value === 'string') return norm(value);
  if(value && typeof value === 'object') return norm(value.url || value.public_url || value.publicUrl || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || value.src || '');
  return '';
}
function decodeBase64UrlText(value){
  const raw = norm(value).replace(/\.[a-z0-9]+(?:\?.*)?$/i,'');
  if(!raw) return '';
  try{
    if(typeof Buffer !== 'undefined') return Buffer.from(raw.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8');
  }catch(_){ }
  try{
    const b64 = raw.replace(/-/g,'+').replace(/_/g,'/');
    const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
    return decodeURIComponent(Array.prototype.map.call(atob(padded), ch => '%' + ('00' + ch.charCodeAt(0).toString(16)).slice(-2)).join(''));
  }catch(_){ return ''; }
}
function ticketEventIdFromImageValue(value){
  const m = ticketImageSource(value).match(/\/ticket-images\/([^\/?#]+)\//i);
  return m ? decodeURIComponent(m[1]) : '';
}
function ticketDecodedKeyFromImageValue(value){
  const m = ticketImageSource(value).match(/\/ticket-images\/[^\/?#]+\/([^\/?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  return m ? decodeBase64UrlText(m[1]) : '';
}
function ticketBackupParts(fullKey, image, eventCode){
  const rawKey = norm(fullKey);
  const keyEvent = ticketEventIdFromKey(rawKey);
  const keyInner = ticketInnerKeyFromKey(rawKey) || rawKey;
  const srcEvent = ticketEventIdFromImageValue(image);
  const decoded = ticketDecodedKeyFromImageValue(image);
  const decEvent = decoded ? ticketEventIdFromKey(decoded) : '';
  const decInner = decoded ? (ticketInnerKeyFromKey(decoded) || decoded) : '';
  let eventToken = '';
  if(eventCode[decEvent]) eventToken = decEvent;
  else if(eventCode[srcEvent]) eventToken = srcEvent;
  else if(eventCode[keyEvent]) eventToken = keyEvent;
  let innerKey = '';
  if(eventToken && decEvent === eventToken && decInner) innerKey = decInner;
  else if(eventToken && keyEvent === eventToken && keyInner) innerKey = keyInner;
  else innerKey = decInner || keyInner || rawKey;
  if(eventToken && innerKey.startsWith(eventToken + '|')) innerKey = norm(innerKey.slice(eventToken.length + 1));
  return {eventToken, eventCode: eventCode[eventToken] || '', innerKey: innerKey || rawKey};
}
function ticketToken(value){
  const match = norm(value).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);
  return match ? match[0].replace(/\s+/g, '').toUpperCase() : '';
}
function isDonation(ticket){ return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(norm(ticket)); }
function ticket(c){ return norm(c?.ticketDonacion ?? c?.ticket ?? c?.ticketOtrosGastos ?? ''); }
function dataRows(source, name){
  if(typeof rows === 'function') return rows(source, name);
  if(typeof arr === 'function') return arr(source, name);
  return Array.isArray(source?.[name]) ? source[name] : [];
}
function ingresoInnerKey(value){
  const m = norm(value).match(/INGRESO[:|]([^|\s]+)/i);
  return m ? `INGRESO:${m[1]}` : '';
}
function stripEventPrefix(value, eventId){
  let s = norm(value);
  if(eventId && s.startsWith(eventId + '|')) s = norm(s.slice(eventId.length + 1));
  return s;
}
function normalizeTicketInner(value){
  let s = norm(value);
  // Algunos alias heredados llegaron como INGRESO:id|TIENDA | TKxx. Para comparar con compras vivas,
  // se toma solo la parte posterior si realmente contiene un TKxx.
  if(/^INGRESO[:|]/i.test(s) && s.includes('|') && ticketToken(s)) s = norm(s.split('|').slice(1).join('|'));
  const tk = ticketToken(s);
  if(!tk) return '';
  const left = norm(s.split('|')[0] || '');
  if(left && left !== tk && !/^INGRESO[:|]/i.test(left)) return `${left} | ${tk}`;
  return tk;
}
function buildLiveImageIndex(fullState, scopedEventIds){
  const index = new Map();
  const byEventToken = new Map();
  const stores = byIdMap(dataRows(fullState, 'tiendas'));
  const inScope = ev => ev && scopedEventIds.has(String(ev));
  function add(eventId, innerKey, kind){
    eventId = norm(eventId); innerKey = norm(innerKey);
    if(!inScope(eventId) || !innerKey) return;
    const canonicalKey = `${eventId}|${innerKey}`;
    if(!index.has(canonicalKey)) index.set(canonicalKey, {eventToken:eventId, innerKey, canonicalKey, kind});
    const tk = ticketToken(innerKey);
    if(tk){
      const mapKey = `${eventId}|${tk}`;
      if(!byEventToken.has(mapKey)) byEventToken.set(mapKey, new Set());
      byEventToken.get(mapKey).add(canonicalKey);
    }
  }
  dataRows(fullState,'colaboradores').forEach(c => {
    if(c?.id && c?.eventId) add(c.eventId, `INGRESO:${c.id}`, 'INGRESO');
  });
  dataRows(fullState,'compras').forEach(c => {
    const tk = ticketToken(ticket(c));
    if(!tk || isDonation(ticket(c))) return;
    const storeName = norm(stores[String(c.tiendaId || '')]?.nombre || '');
    add(c.eventId, storeName ? `${storeName} | ${tk}` : tk, 'TK');
  });
  return {index, byEventToken};
}
function candidateEventsForImage(key, value, scopedEventIds){
  const rawKey = norm(key);
  const srcEvent = norm(ticketEventIdFromImageValue(value));
  const decoded = norm(ticketDecodedKeyFromImageValue(value));
  const keyEvent = norm(ticketEventIdFromKey(rawKey));
  const decEvent = decoded ? norm(ticketEventIdFromKey(decoded)) : '';
  const out = [];
  [decEvent, srcEvent, keyEvent].forEach(ev => { if(ev && scopedEventIds.has(ev) && !out.includes(ev)) out.push(ev); });
  return out;
}
function candidateInnersForImage(key, value, eventId){
  const rawKey = norm(key);
  const decoded = norm(ticketDecodedKeyFromImageValue(value));
  const keyInner = stripEventPrefix(ticketInnerKeyFromKey(rawKey) || rawKey, eventId);
  const decInner = decoded ? stripEventPrefix(ticketInnerKeyFromKey(decoded) || decoded, eventId) : '';
  const out = [];
  [decInner, keyInner, rawKey, decoded].forEach(v => { v = stripEventPrefix(v, eventId); if(v && !out.includes(v)) out.push(v); });
  return out;
}
function liveCanonicalInfo(key, value, liveIndex, scopedEventIds){
  const events = candidateEventsForImage(key, value, scopedEventIds);
  for(const ev of events){
    for(const inner of candidateInnersForImage(key, value, ev)){
      const ing = ingresoInnerKey(inner);
      if(ing){
        const hit = liveIndex.index.get(`${ev}|${ing}`);
        if(hit) return hit;
      }
      const tkInner = normalizeTicketInner(inner);
      if(tkInner){
        const exact = liveIndex.index.get(`${ev}|${tkInner}`);
        if(exact) return exact;
        const tk = ticketToken(tkInner);
        const candidates = liveIndex.byEventToken.get(`${ev}|${tk}`);
        // Solo se permite resolver una clave reducida TKxx si en ese evento hay una única compra viva con ese TKxx.
        if(candidates && candidates.size === 1) return liveIndex.index.get([...candidates][0]);
      }
    }
  }
  return null;
}
function addCanonicalTicketImage(out, key, value, liveIndex, scopedEventIds){
  const info = liveCanonicalInfo(key, value, liveIndex, scopedEventIds);
  if(!info || !info.eventToken || !info.innerKey) return;
  if(!out[info.canonicalKey]) out[info.canonicalKey] = value;
}
function price(c, productMap){
  const direct = num(c?.precio);
  if (direct) return direct;
  const p = productMap[String(c?.productoId)] || {};
  return num(p.defaultPrecio ?? p.precio);
}
function splitLongText(value, size = 8000){
  const text = String(value || '');
  const out = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : [''];
}
function scopedBackupState(fullState, scope){
  const all = scope === 'TODOS';
  const eventos = all ? [...dataRows(fullState,'eventos')] : dataRows(fullState,'eventos').filter(e => String(e.id) === String(scope));
  const eventIds = new Set(eventos.map(e => String(e.id)));
  const colaboradores = dataRows(fullState,'colaboradores').filter(c => all || eventIds.has(String(c.eventId)));
  const compras = dataRows(fullState,'compras').filter(c => all || eventIds.has(String(c.eventId)));
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
  const personas = all ? [...dataRows(fullState,'personas')] : dataRows(fullState,'personas').filter(p => personIds.has(String(p.id)));
  const tiendas = all ? [...dataRows(fullState,'tiendas')] : dataRows(fullState,'tiendas').filter(t => storeIds.has(String(t.id)));
  const productos = all ? [...dataRows(fullState,'productos')] : dataRows(fullState,'productos').filter(p => productIds.has(String(p.id)));
  const ticketImages = {};
  const liveIndex = buildLiveImageIndex(fullState, eventIds);
  Object.entries(fullState.ticketImages || {}).forEach(([key, value]) => addCanonicalTicketImage(ticketImages, key, value, liveIndex, eventIds));
  Object.entries(fullState.ticketImageRefs || {}).forEach(([key, value]) => addCanonicalTicketImage(ticketImages, key, value, liveIndex, eventIds));
  return {eventos, personas, tiendas, productos, colaboradores, compras, ticketImages};
}
function countsFor(state){
  return {
    eventos: arr(state,'eventos').length,
    personas: arr(state,'personas').length,
    tiendas: arr(state,'tiendas').length,
    productos: arr(state,'productos').length,
    colaboradores: arr(state,'colaboradores').length,
    compras: arr(state,'compras').length,
    ticketImages: Object.keys(state?.ticketImages || {}).length
  };
}
function setupWorkbook(){
  const wb = new ExcelJS.Workbook();
  wb.creator = `${BACKUP_VERSION} - ©oltyLAB '26`;
  wb.created = new Date();
  const border = {top:{style:'thin', color:{argb:'FFDDE2EA'}},left:{style:'thin', color:{argb:'FFDDE2EA'}},bottom:{style:'thin', color:{argb:'FFDDE2EA'}},right:{style:'thin', color:{argb:'FFDDE2EA'}}};
  function sheet(name, headers){
    const ws = wb.addWorksheet(name);
    ws.properties.defaultRowHeight = 21;
    ws.columns = headers.map(h => ({width: Math.max(14, Math.min(42, String(h).length + 4))}));
    headers.forEach((h,i) => {
      const c = ws.getCell(1, i + 1);
      c.value = h;
      c.fill = {type:'pattern', pattern:'solid', fgColor:{argb:'FF111827'}};
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
        sort:false, autoFilter:false, pivotTables:false
      });
    }catch(_){ }
  }
}
function backupVersionText(value){
  if(typeof value !== 'string') return value;
  const oldFile = 'ControlEvent_' + 'v3_' + '0_prod';
  const oldText = 'ControlEvent ' + 'v3.' + '0_prod';
  const oldTextAlt = 'ControlEvent ' + 'v3_' + '0_prod';
  return value.split(oldFile).join(BACKUP_VERSION_FILE).split(oldText).join(BACKUP_VERSION).split(oldTextAlt).join(BACKUP_VERSION);
}
function enforceBackupVersion(wb){
  try{ wb.creator = `${BACKUP_VERSION} - ©oltyLAB '26`; }catch(_){ }
  try{ wb.lastModifiedBy = BACKUP_VERSION; }catch(_){ }
  try{
    (wb.worksheets || []).forEach(ws => {
      ws.eachRow(row => row.eachCell(cell => {
        const next = backupVersionText(cell.value);
        if(next !== cell.value) cell.value = next;
      }));
    });
  }catch(_){ }
}
async function buildBackupWorkbook(fullState, scope){
  const scoped = scopedBackupState(fullState, scope);
  const dataCount = countRows(scoped);
  if (dataCount === 0) {
    const err = new Error('No hay datos que descargar para el alcance seleccionado.');
    err.status = 409;
    throw err;
  }
  const eventCode = makeCodes(scoped.eventos, 'EV');
  const personCode = makeCodes(scoped.personas, 'PE');
  const storeCode = makeCodes(scoped.tiendas, 'TI');
  const productCode = makeCodes(scoped.productos, 'PR');
  const productMap = byIdMap(scoped.productos);
  const selectedEvent = scope === 'TODOS' ? null : scoped.eventos.find(e => String(e.id) === String(scope));
  const selectedCode = scope === 'TODOS' ? 'TODOS' : (eventCode[scope] || 'EV001');
  const selectedTitle = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.titulo || selectedCode || 'EVENTO');
  const now = stamp();
  const {wb, addRows} = setupWorkbook();
  const scopedCounts = countsFor(scoped);
  const totalCounts = countsFor(fullState);
  addRows('METADATOS', ['CAMPO','VALOR'], [
    ['VERSION', BACKUP_VERSION],
    ['VERSION_FICHERO', BACKUP_VERSION_FILE],
    ['FUENTE_DATOS', 'server-api-export'],
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
    ['TOTAL_ORIGEN_EVENTOS', totalCounts.eventos],
    ['TOTAL_ORIGEN_PERSONAS', totalCounts.personas],
    ['TOTAL_ORIGEN_PRODUCTOS', totalCounts.productos],
    ['PROTECCION', 'Hojas protegidas para evitar cambios accidentales en la descarga.'],
    ['NOTA', 'Exportación generada en servidor con clonado plano y tickets divididos para evitar RangeError.']
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
    const ticketPartsInfo = ticketBackupParts(fullKey, image, eventCode);
    const evCode = ticketPartsInfo.eventCode;
    const key = ticketPartsInfo.innerKey;
    const data = typeof image === 'object' ? JSON.stringify(image) : String(image || '');
    const parts = splitLongText(data, 8000);
    ticketRows.push([evCode, key, '', '', data ? 'IMAGEN_DIVIDIDA_EN_TICKETS_PARTES_V41_2' : 'SIN_IMAGEN']);
    parts.forEach((part, idx) => partRows.push([evCode, key, idx + 1, parts.length, part]));
  });
  addRows('TICKETS', ['EVENTO_CODIGO','CLAVE_RESUMEN','ARCHIVO_IMAGEN','IMAGEN_BASE64','OBSERVACIONES'], ticketRows);
  addRows('TICKETS_PARTES', ['EVENTO_CODIGO','CLAVE_RESUMEN','PARTE','TOTAL_PARTES','IMAGEN_BASE64_PARTE'], partRows);
  await protectWorkbook(wb);
  enforceBackupVersion(wb);
  return {wb, filename: backupFileName(scope, selectedTitle), counts: scopedCounts};
}

router.get('/export/backup', asyncHandler(async (req, res) => {
  const scope = String(req.query.scope || 'TODOS');
  const state = normalizeState(await getState());
  const { wb, filename, counts } = await buildBackupWorkbook(state, scope);
  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-ControlEvent-Backup-Version', BACKUP_VERSION_FILE);
  res.setHeader('X-ControlEvent-Backup-Counts', encodeURIComponent(JSON.stringify(counts)));
  res.send(Buffer.from(buffer));
}));

export default router;
