import express from 'express';
import ExcelJS from 'exceljs';
import { asyncHandler } from './_async.js';
import { getState } from '../services/state.service.js';
import { getSupabaseAdmin } from '../lib/supabase.js';

const router = express.Router();
const BACKUP_VERSION = 'ControlEvent v23_prod_r1';
const BACKUP_VERSION_FILE = 'ControlEvent_v23_prod_r1';
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
const countRows = state => COLLECTIONS.reduce((total, key) => total + arr(state, key).length, 0) + Object.keys(state?.ticketImages || {}).length + arr(state, 'eventDocuments').length;
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
  state.eventDocuments = Array.isArray(source.eventDocuments) ? source.eventDocuments.map(plainRow) : [];
  state.ticketImages = {};
  state.eventCodeMap = source.eventCodeMap && typeof source.eventCodeMap === 'object' ? source.eventCodeMap : {};
  state.entityCodeMaps = source.entityCodeMaps && typeof source.entityCodeMaps === 'object' ? source.entityCodeMaps : {};
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

async function mergeTicketImagesFromDb(state, scope){
  const out = state && typeof state === 'object' ? state : {};
  if(!out.ticketImages || typeof out.ticketImages !== 'object') out.ticketImages = {};
  if(!out.ticketImageRefs || typeof out.ticketImageRefs !== 'object') out.ticketImageRefs = {};
  const scopeText = norm(scope || 'TODOS');
  const eventIds = arr(out, 'eventos').map(e => norm(e?.id)).filter(Boolean);
  const scopeIsAll = !scopeText || scopeText === 'TODOS';
  const wantedIds = scopeIsAll ? eventIds : [scopeText];
  if(!wantedIds.length) return out;
  try{
    let query = getSupabaseAdmin()
      .from('ce_ticket_images')
      .select('image_key,event_id,label,public_url,pathname,storage_path,content_type,size_bytes')
      .order('image_key');
    query = scopeIsAll ? query.in('event_id', wantedIds) : query.eq('event_id', scopeText);
    const { data, error } = await query;
    if(error) throw error;
    (data || []).forEach(img => {
      const eventId = norm(img?.event_id);
      if(!eventId || !wantedIds.includes(eventId)) return;
      const label = norm(img?.label || ticketInnerKeyFromKey(img?.image_key));
      let key = norm(img?.image_key);
      if(!key || ticketEventIdFromKey(key) !== eventId) key = label ? `${eventId}|${label}` : key;
      const value = norm(img?.public_url || img?.pathname || img?.storage_path || '');
      if(!key || !value) return;
      out.ticketImages[key] = value;
      out.ticketImageRefs[key] = {
        key,
        url: img?.public_url || value,
        pathname: img?.pathname || img?.public_url || value,
        storage_path: img?.storage_path || '',
        contentType: img?.content_type || '',
        size: img?.size_bytes || 0
      };
    });
  }catch(err){
    console.warn('[backup v8.2.3] No se pudo fusionar ce_ticket_images directamente:', err?.message || err);
  }
  return out;
}


async function fetchAllSupabaseRows(makeQuery, pageSize = 1000){
  const all = [];
  let from = 0;
  for(;;){
    const to = from + pageSize - 1;
    const { data, error } = await makeQuery().range(from, to);
    if(error) throw error;
    const rows = Array.isArray(data) ? data : [];
    all.push(...rows);
    if(rows.length < pageSize) break;
    from += pageSize;
    if(from > 200000){
      throw new Error('Exportación detenida por seguridad: demasiadas filas al paginar Supabase.');
    }
  }
  return all;
}


async function rawTicketImageRowsForBackup(scope){
  const scopeText = norm(scope || 'TODOS');
  const scopeIsAll = !scopeText || scopeText === 'TODOS';
  try{
    const data = await fetchAllSupabaseRows(() => {
      let query = getSupabaseAdmin()
        .from('ce_ticket_images')
        .select('image_key,event_id,label,public_url,pathname,storage_path,content_type,size_bytes')
        .order('event_id')
        .order('image_key');
      if(!scopeIsAll) query = query.eq('event_id', scopeText);
      return query;
    });
    return (data || []).map(row => ({
      image_key: norm(row?.image_key),
      event_id: norm(row?.event_id || ticketEventIdFromKey(row?.image_key)),
      label: norm(row?.label || ticketInnerKeyFromKey(row?.image_key)),
      public_url: norm(row?.public_url),
      pathname: norm(row?.pathname),
      storage_path: norm(row?.storage_path),
      content_type: norm(row?.content_type),
      size_bytes: row?.size_bytes == null ? '' : row.size_bytes
    })).filter(row => row.image_key || row.event_id || row.label || row.storage_path || row.public_url || row.pathname);
  }catch(err){
    console.warn('[backup v8.5 FIX41] No se pudo leer ce_ticket_images completo:', err?.message || err);
    return [];
  }
}


async function rawCompraRowsForBackup(scope){
  const scopeText = norm(scope || 'TODOS');
  const scopeIsAll = !scopeText || scopeText === 'TODOS';
  try{
    const data = await fetchAllSupabaseRows(() => {
      let query = getSupabaseAdmin()
        .from('ce_compras')
        .select('id,event_id,producto_id,unidades,precio,ticket_donacion,tienda_id,responsable_id,donor_ref,created_at,updated_at')
        .order('event_id')
        .order('id');
      if(!scopeIsAll) query = query.eq('event_id', scopeText);
      return query;
    });
    return (data || []).map(row => ({
      id: norm(row?.id),
      event_id: norm(row?.event_id),
      producto_id: norm(row?.producto_id),
      unidades: row?.unidades == null ? '' : row.unidades,
      precio: row?.precio == null ? '' : row.precio,
      ticket_donacion: norm(row?.ticket_donacion),
      tienda_id: norm(row?.tienda_id),
      responsable_id: norm(row?.responsable_id),
      donor_ref: norm(row?.donor_ref),
      created_at: norm(row?.created_at),
      updated_at: norm(row?.updated_at)
    })).filter(row => row.id || row.event_id || row.producto_id || row.ticket_donacion);
  }catch(err){
    console.warn('[backup v8.5 FIX42] No se pudo leer ce_compras completo:', err?.message || err);
    return [];
  }
}
function dbCompraToStateRow(row){
  return {
    id: row?.id || '',
    eventId: row?.event_id || row?.eventId || '',
    productoId: row?.producto_id || row?.productoId || '',
    unidades: row?.unidades,
    precio: row?.precio,
    ticketDonacion: row?.ticket_donacion || row?.ticketDonacion || '',
    tiendaId: row?.tienda_id || row?.tiendaId || '',
    responsableId: row?.responsable_id || row?.responsableId || '',
    donorRef: row?.donor_ref || row?.donorRef || '',
    createdAt: row?.created_at || row?.createdAt || '',
    updatedAt: row?.updated_at || row?.updatedAt || ''
  };
}

function byIdMap(items){ return Object.fromEntries((items || []).map(item => [String(item.id), item])); }
function stableCodeFor(item, prefix, stableMap = {}){
  const props = prefix === 'EV'
    ? ['eventoCodigo','codigoEvento','eventCode','EVENTO_CODIGO']
    : prefix === 'PE'
      ? ['personaCodigo','codigoPersona','personCode','PERSONA_CODIGO']
      : prefix === 'TI'
        ? ['tiendaCodigo','codigoTienda','storeCode','TIENDA_CODIGO']
        : ['productoCodigo','codigoProducto','productCode','PRODUCTO_CODIGO'];
  const re = new RegExp('^' + prefix + '\\d+$','i');
  for(const prop of props){
    const code = norm(item?.[prop]);
    if(re.test(code)) return code.toUpperCase();
  }
  const mapped = norm(stableMap?.[String(item?.id || '')]);
  return re.test(mapped) ? mapped.toUpperCase() : '';
}
function makeCodes(items, prefix, stableMap = {}){
  const out = {};
  const used = new Set();
  (items || []).forEach(item => {
    const id = String(item?.id || '');
    if(!id) return;
    const code = stableCodeFor(item, prefix, stableMap);
    if(code && !used.has(code)){ out[id] = code; used.add(code); }
  });
  let n = 1;
  (items || []).forEach(item => {
    const id = String(item?.id || '');
    if(!id || out[id]) return;
    let code;
    do{ code = prefix + String(n++).padStart(prefix === 'EV' ? 3 : 4, '0'); }while(used.has(code));
    out[id] = code; used.add(code);
  });
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
  const raw = norm(value).replace(/\.[a-z0-9]+(?:\?.*)?$/i,'').split('.v')[0];
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
function documentToken(value){
  const match = norm(value).toUpperCase().match(/\bDOC\s*(\d+)\b/);
  return match ? 'DOC' + String(Number(match[1])).padStart(2, '0') : '';
}
function normalizeDocumentInner(value){
  return documentToken(value);
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
  dataRows(fullState,'eventDocuments').forEach(doc => {
    const code = documentToken(doc?.codigo || doc?.imageKey || doc?.id);
    if(doc?.eventId && code) add(doc.eventId, code, 'DOC');
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
      const docInner = normalizeDocumentInner(inner);
      if(docInner){
        const exactDoc = liveIndex.index.get(`${ev}|${docInner}`);
        if(exactDoc) return exactDoc;
        return {eventToken:ev, innerKey:docInner, canonicalKey:`${ev}|${docInner}`, kind:'DOC'};
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
  const eventDocuments = dataRows(fullState,'eventDocuments').filter(doc => all || eventIds.has(String(doc.eventId)));
  const ticketImages = {};
  const liveIndex = buildLiveImageIndex(fullState, eventIds);
  Object.entries(fullState.ticketImages || {}).forEach(([key, value]) => addCanonicalTicketImage(ticketImages, key, value, liveIndex, eventIds));
  Object.entries(fullState.ticketImageRefs || {}).forEach(([key, value]) => addCanonicalTicketImage(ticketImages, key, value, liveIndex, eventIds));
  return {eventos, personas, tiendas, productos, colaboradores, compras, eventDocuments, ticketImages};
}
function countsFor(state){
  return {
    eventos: arr(state,'eventos').length,
    personas: arr(state,'personas').length,
    tiendas: arr(state,'tiendas').length,
    productos: arr(state,'productos').length,
    colaboradores: arr(state,'colaboradores').length,
    compras: arr(state,'compras').length,
    eventDocuments: arr(state,'eventDocuments').length,
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
  // v8.5: para EVENTOS no se genera EVxxx. El identificador estable es el id real de ce_eventos.
  const eventCode = Object.fromEntries(dataRows(fullState, 'eventos').map(e => [String(e?.id || ''), String(e?.id || '')]).filter(([id]) => id));
  const entityMaps = fullState.entityCodeMaps || {};
  const personCode = makeCodes(scoped.personas, 'PE', entityMaps.personas || {});
  const storeCode = makeCodes(scoped.tiendas, 'TI', entityMaps.tiendas || {});
  const productCode = makeCodes(scoped.productos, 'PR', entityMaps.productos || {});
  const productMap = byIdMap(scoped.productos);
  const selectedEvent = scope === 'TODOS' ? null : scoped.eventos.find(e => String(e.id) === String(scope));
  const selectedCode = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.id || scope || '');
  const selectedTitle = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.titulo || selectedCode || 'EVENTO');
  const now = stamp();
  const {wb, addRows} = setupWorkbook();
  const scopedCounts = countsFor(scoped);
  const totalCounts = countsFor(fullState);
  const rawTicketImageRows = await rawTicketImageRowsForBackup(scope);
  const backupTicketCount = rawTicketImageRows.length;
  const rawCompraRows = await rawCompraRowsForBackup(scope);
  const backupCompras = rawCompraRows.length ? rawCompraRows.map(dbCompraToStateRow) : scoped.compras;
  const backupCompraCount = backupCompras.length;
  addRows('METADATOS', ['CAMPO','VALOR'], [
    ['VERSION', BACKUP_VERSION],
    ['VERSION_FICHERO', BACKUP_VERSION_FILE],
    ['FUENTE_DATOS', 'server-api-export'],
    ['ALCANCE', scope === 'TODOS' ? 'TODOS' : selectedTitle],
    ['EVENTO_ID', scope === 'TODOS' ? 'TODOS' : selectedCode],
    ['FECHA_DESCARGA', `${now.yyyy}${now.mm}${now.dd}-${now.hh}_${now.mi}_${now.ss}`],
    ['REGISTROS_EVENTOS', scopedCounts.eventos],
    ['REGISTROS_PERSONAS', scopedCounts.personas],
    ['REGISTROS_TIENDAS', scopedCounts.tiendas],
    ['REGISTROS_PRODUCTOS', scopedCounts.productos],
    ['REGISTROS_INGRESOS', scopedCounts.colaboradores],
    ['REGISTROS_COMPRAS', backupCompraCount],
    ['REGISTROS_COMPRAS_CANONICAS_APP', scopedCounts.compras],
    ['REGISTROS_DOCUMENTOS', scopedCounts.eventDocuments || 0],
    ['REGISTROS_TICKETS', backupTicketCount],
    ['REGISTROS_TICKETS_CANONICOS_APP', scopedCounts.ticketImages],
    ['PAGINACION_SUPABASE_BACKUP', 'ACTIVA: lecturas por rangos para no quedar limitado a 1000 filas'],
    ['TOTAL_ORIGEN_EVENTOS', totalCounts.eventos],
    ['TOTAL_ORIGEN_PERSONAS', totalCounts.personas],
    ['TOTAL_ORIGEN_PRODUCTOS', totalCounts.productos],
    ['PROTECCION', 'Hojas protegidas para evitar cambios accidentales en la descarga.'],
    ['NOTA', 'Exportación generada en servidor con clonado plano y tickets divididos para evitar RangeError.']
  ]);
  addRows('EVENTOS', ['EVENTO_ID','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'], scoped.eventos.map(e => [e.id || '', e.titulo || '', num(e.precio), e.fechaIni || '', e.fechaFin || '', e.situacion || 'En curso', e.descripcion || '']));
  addRows('PERSONAS', ['PERSONA_CODIGO','PERSONA_ID','PERSONA_NOMBRE','PERSONA_RANGO'], scoped.personas.map(p => [personCode[p.id], p.id, p.nombre || '', p.rango || 'SOCIO']));
  addRows('TIENDAS', ['TIENDA_CODIGO','TIENDA_ID','TIENDA_NOMBRE'], scoped.tiendas.map(t => [storeCode[t.id], t.id, t.nombre || '']));
  const wsProductos = addRows('PRODUCTOS', ['PRODUCTO_CODIGO','PRODUCTO_ID','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO','PRODUCTO_PRECIO_REFERENCIA'], scoped.productos.map(p => [productCode[p.id], p.id, p.nombre || '', p.segmento || '', p.destino || '', num(p.defaultPrecio ?? p.precio)]));
  try{ wsProductos.getColumn(6).numFmt = '#,##0.00 [$€-C0A]'; }catch(_){ }
  addRows('INGRESOS', ['EVENTO_CODIGO','INGRESO_ID','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'], scoped.colaboradores.map(c => [eventCode[c.eventId] || '', c.id || '', personCode[c.personaId] || '', num(c.numero), c.situacion || c.ingreso || 'Pendiente', num(c.importe ?? c.importeVoluntario)]));
  addRows('CE_COMPRAS_BBDD', ['COMPRA_ID','EVENT_ID','PRODUCTO_ID','UNIDADES','PRECIO','TICKET_DONACION','TIENDA_ID','RESPONSABLE_ID','DONOR_REF','CREATED_AT','UPDATED_AT'], rawCompraRows.map(c => [
    c.id || '', c.event_id || '', c.producto_id || '', c.unidades == null ? '' : c.unidades, c.precio == null ? '' : c.precio, c.ticket_donacion || '', c.tienda_id || '', c.responsable_id || '', c.donor_ref || '', c.created_at || '', c.updated_at || ''
  ]));
  addRows('COMPRAS', ['EVENTO_CODIGO','COMPRA_ID','PRODUCTO_CODIGO','UNIDADES','PRECIO','TICKET_U_OTROS_GASTOS','TIENDA_CODIGO','RESPONSABLE_PERSONA_CODIGO'], backupCompras.filter(c => !isDonation(ticket(c))).map(c => [eventCode[c.eventId] || c.eventId || '', c.id || '', productCode[c.productoId] || c.productoId || '', num(c.unidades), price(c, productMap), ticket(c), storeCode[c.tiendaId] || c.tiendaId || '', personCode[c.responsableId] || c.responsableId || '']));
  addRows('DONACIONES', ['EVENTO_CODIGO','DONACION_ID','PRODUCTO_CODIGO','UNIDADES','PRECIO','TIPO_DONACION','DONANTE_TIPO','DONANTE_CODIGO','RESPONSABLE_PERSONA_CODIGO'], backupCompras.filter(c => isDonation(ticket(c))).map(c => { const parts = String(c.donorRef || '').split(':'); const kind = parts[0], id = parts[1]; return [eventCode[c.eventId] || c.eventId || '', c.id || '', productCode[c.productoId] || c.productoId || '', num(c.unidades), price(c, productMap), ticket(c), kind === 'P' ? 'PERSONA' : (kind === 'T' ? 'TIENDA' : ''), kind === 'P' ? (personCode[id] || id || '') : (kind === 'T' ? (storeCode[id] || id || '') : ''), personCode[c.responsableId] || c.responsableId || '']; }));
  addRows('DOCUMENTOS', ['EVENTO_CODIGO','DOC_CODIGO','DOC_ID','FECHA','DESCRIPCION','CLAVE_IMAGEN','FOTO_URL'], (scoped.eventDocuments || []).map(doc => {
    const code = documentToken(doc?.codigo || doc?.imageKey || doc?.id);
    const key = doc?.eventId && code ? `${doc.eventId}|${code}` : '';
    const image = key ? (scoped.ticketImages?.[key] || '') : '';
    const imageText = typeof image === 'object' ? (image.url || image.public_url || image.publicUrl || image.pathname || image.path || image.storage_path || image.dataUrl || image.base64 || '') : String(image || '');
    return [eventCode[doc?.eventId] || doc?.eventId || '', code, doc?.id || key, doc?.fecha || '', doc?.descripcion || '', code, imageText || doc?.imageUrl || ''];
  }));
  addRows('CE_TICKET_IMAGES_BBDD', ['EVENT_ID','IMAGE_KEY','LABEL','PUBLIC_URL','PATHNAME','STORAGE_PATH','CONTENT_TYPE','SIZE_BYTES'], rawTicketImageRows.map(img => [
    img.event_id || ticketEventIdFromKey(img.image_key) || '',
    img.image_key || '',
    img.label || ticketInnerKeyFromKey(img.image_key) || '',
    img.public_url || '',
    img.pathname || '',
    img.storage_path || '',
    img.content_type || '',
    img.size_bytes || ''
  ]));
  const ticketRows = [], partRows = [];
  const rawSource = rawTicketImageRows.length ? rawTicketImageRows : Object.entries(scoped.ticketImages || {}).map(([fullKey, image]) => ({
    image_key: fullKey,
    event_id: ticketEventIdFromKey(fullKey),
    label: ticketInnerKeyFromKey(fullKey),
    public_url: '',
    pathname: '',
    storage_path: typeof image === 'object' ? JSON.stringify(image) : String(image || ''),
    content_type: '',
    size_bytes: ''
  }));
  rawSource.forEach(img => {
    const eventId = img.event_id || ticketEventIdFromKey(img.image_key) || '';
    const innerKey = img.label || ticketInnerKeyFromKey(img.image_key) || img.image_key || '';
    const data = img.public_url || img.pathname || img.storage_path || '';
    const parts = splitLongText(data, 8000);
    ticketRows.push([eventId, innerKey, '', '', data ? 'IMAGEN_DIVIDIDA_EN_TICKETS_PARTES_FIX41_RAW_BBDD' : 'SIN_IMAGEN_REFERENCIA_BBDD']);
    parts.forEach((part, idx) => partRows.push([eventId, innerKey, idx + 1, parts.length, part]));
  });
  addRows('TICKETS', ['EVENTO_CODIGO','CLAVE_RESUMEN','ARCHIVO_IMAGEN','IMAGEN_BASE64','OBSERVACIONES'], ticketRows);
  addRows('TICKETS_PARTES', ['EVENTO_CODIGO','CLAVE_RESUMEN','PARTE','TOTAL_PARTES','IMAGEN_BASE64_PARTE'], partRows);
  await protectWorkbook(wb);
  enforceBackupVersion(wb);
  return {wb, filename: backupFileName(scope, selectedTitle), counts: {...scopedCounts, compras: backupCompraCount, ticketImages: backupTicketCount}};
}

router.get('/export/backup', asyncHandler(async (req, res) => {
  let scope = String(req.query.scope || 'TODOS');
  const eventIdParam = norm(req.query.eventId || req.query.eventID || req.query.EVENTO_ID || '');
  if (/^all$/i.test(scope)) scope = 'TODOS';
  if (/^event$/i.test(scope) && eventIdParam) scope = eventIdParam;
  const state = await mergeTicketImagesFromDb(normalizeState(await getState()), scope);
  const { wb, filename, counts } = await buildBackupWorkbook(state, scope);
  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-ControlEvent-Backup-Version', BACKUP_VERSION_FILE);
  res.setHeader('X-ControlEvent-Backup-Counts', encodeURIComponent(JSON.stringify(counts)));
  res.send(Buffer.from(buffer));
}));

export default router;
