import { registerExcelModule, ensureExcelJS as ensureRuntimeExcelJS } from './_excel-runtime.js';

export const meta = {
  name: 'backup',
  version: 'v33.7',
  mode: 'server-backup-download-with-client-fallback',
  description: 'Descarga de datos/backup: descarga principal generada por /api/export/backup y fallback cliente si el endpoint no está disponible.'
};

const BACKUP_VERSION = 'ControlEvent v9.5.2_prod';
const BACKUP_VERSION_FILE = 'ControlEvent_v9_5_2_prod';
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
const countRows = state => COLLECTIONS.reduce((total, key) => total + rows(state, key).length, 0) + Object.keys(state?.ticketImages || {}).length + rows(state, 'eventDocuments').length;
const cleanFilePart = value => norm(value || 'SIN_TITULO').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').replace(/^_+|_+$/g, '').slice(0, 80) || 'SIN_TITULO';
function stamp(date = new Date()){
  const pad = n => String(n).padStart(2, '0');
  return {yyyy:date.getFullYear(), mm:pad(date.getMonth()+1), dd:pad(date.getDate()), hh:pad(date.getHours()), mi:pad(date.getMinutes()), ss:pad(date.getSeconds())};
}
function backupFileName(scope, title){
  const s = stamp();
  const label = scope === 'TODOS' ? 'TODOS' : cleanFilePart(title || scope || 'EVENTO');
  return `${BACKUP_VERSION_FILE}_BACKUP_${label}_${s.yyyy}${s.mm}${s.dd}_${s.hh}${s.mi}${s.ss}.xlsx`;
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
  state.eventDocuments = Array.isArray(state.eventDocuments) ? state.eventDocuments : [];
  state.ticketImages = state.ticketImages && typeof state.ticketImages === 'object' ? state.ticketImages : {};
  const refs = state.ticketImageRefs && typeof state.ticketImageRefs === 'object' ? state.ticketImageRefs : {};
  Object.entries(refs).forEach(([key, ref]) => {
    if(state.ticketImages[key]) return;
    if(typeof ref === 'string') state.ticketImages[key] = ref;
    else if(ref && typeof ref === 'object') state.ticketImages[key] = ref.base64 || ref.dataUrl || ref.dataURL || ref.image || ref.src || ref.public_url || ref.publicUrl || ref.url || ref.pathname || ref.storage_path || ref.path || '';
  });
  return state;
}
async function fetchServerState(){
  const res = await fetch('/api/state', {cache:'no-store'});
  if(!res.ok) throw new Error(`No se pudo leer /api/state (${res.status}).`);
  return normalizeState(await res.json());
}
function fallbackState(){
  const localState = (() => {
    try{
      const raw = localStorage.getItem('controlevent_v6_4');
      return raw ? JSON.parse(raw) : null;
    }catch(_){ return null; }
  })();
  const candidates = [
    window.ControlEventApp?.state,
    window.ControlEventRuntime?.app?.state,
    window.__ceV258?.app?.state,
    window.state,
    window.__CONTROL_EVENT_STATE__,
    localState
  ].map(normalizeState);
  candidates.sort((a,b) => countRows(b) - countRows(a));
  return candidates[0] || normalizeState({});
}
async function getBestState(){
  let source = 'server';
  let state = null;
  let serverCounts = null;
  try{ state = await fetchServerState(); }
  catch(error){
    console.warn('[ControlEventExcel/v33.7] No se pudo leer /api/state; se usa estado de la app.', error);
    source = 'app-fallback';
    state = fallbackState();
  }
  serverCounts = countsFor(state);
  const app = fallbackState();
  if(countRows(app) > countRows(state)){
    source = source === 'server' ? 'app-fallback-mas-completo' : source;
    state = app;
  }
  const normalized = normalizeState(state);
  return {state: normalized, source, counts: countsFor(normalized), serverCounts, appCounts: countsFor(app), useServerBackup: true};
}
function countsFor(state){
  return {
    eventos: rows(state,'eventos').length,
    personas: rows(state,'personas').length,
    tiendas: rows(state,'tiendas').length,
    productos: rows(state,'productos').length,
    colaboradores: rows(state,'colaboradores').length,
    compras: rows(state,'compras').length,
    eventDocuments: rows(state,'eventDocuments').length,
    ticketImages: Object.keys(state?.ticketImages || {}).length
  };
}
async function freshBackupEvents(baseState){
  const map = new Map();
  const add = item => {
    const id = String(item?.id || '').trim();
    if(id && !map.has(id)) map.set(id, item);
  };
  try{
    const res = await fetch('/api/state?t=' + Date.now(), {cache:'no-store'});
    if(res.ok) rows(normalizeState(await res.json()), 'eventos').forEach(add);
  }catch(_){ }
  rows(baseState, 'eventos').forEach(add);
  rows(window.ControlEventApp?.state || {}, 'eventos').forEach(add);
  rows(window.ControlEventRuntime?.app?.state || {}, 'eventos').forEach(add);
  rows(window.state || {}, 'eventos').forEach(add);
  return Array.from(map.values());
}
async function chooseBackupScope(state){
  const events = await freshBackupEvents(state);
  return new Promise(resolve => {
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
  if(direct) return direct;
  const p = productMap[String(c?.productoId)] || {};
  return num(p.defaultPrecio ?? p.precio);
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
async function downloadWorkbook(wb, filename){
  enforceBackupVersion(wb);
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
  const {state, source, counts, serverCounts, appCounts, useServerBackup} = await getBestState();
  const scope = options.scope || await chooseBackupScope(state);
  if(!scope) return null;
  const scoped = scopedBackupState(state, scope);
  const scopedCounts = countsFor(scoped);
  const dataCount = countRows(scoped);
  console.info('[ControlEventExcel/v33.7] Descarga de datos solicitada', {source, counts, serverCounts, appCounts, scope, scopedCounts});
  if(useServerBackup){
    try{
      const serverResult = await downloadServerBackup(scope);
      console.info('[ControlEventExcel/v33.7] Backup generado por servidor', serverResult);
      return {...serverResult, counts, scopedCounts};
    }catch(serverError){
      console.warn('[ControlEventExcel/v33.7] Fallback a backup cliente', serverError);
    }
  }else{
    console.warn('[ControlEventExcel/v33.7] Se omite /api/export/backup porque el estado de la app contiene mas datos que el servidor.', {source, serverCounts, appCounts});
  }
  if(dataCount === 0){
    alert('No hay datos que descargar. La descarga se ha cancelado para evitar un Excel solo con cabeceras.');
    return null;
  }
  const ExcelJS = await ensureExcelJS();
  const {wb, addRows} = setupWorkbook(ExcelJS);
  // v8.5: EVENTO_CODIGO usa el id real de ce_eventos, no EVxxx.
  const eventCode = Object.fromEntries(dataRows(state, 'eventos').map(e => [String(e?.id || ''), String(e?.id || '')]).filter(([id]) => id));
  const entityMaps = state.entityCodeMaps || {};
  const personCode = makeCodes(scoped.personas, 'PE', entityMaps.personas || {});
  const storeCode = makeCodes(scoped.tiendas, 'TI', entityMaps.tiendas || {});
  const productCode = makeCodes(scoped.productos, 'PR', entityMaps.productos || {});
  const productMap = byIdMap(scoped.productos);
  const selectedEvent = scope === 'TODOS' ? null : scoped.eventos.find(e => String(e.id) === String(scope));
  const selectedCode = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.id || scope || '');
  const selectedTitle = scope === 'TODOS' ? 'TODOS' : (selectedEvent?.titulo || selectedCode || 'EVENTO');
  const now = stamp();
  const totalCounts = countsFor(state);

  addRows('METADATOS', ['CAMPO','VALOR'], [
    ['VERSION', BACKUP_VERSION],
    ['VERSION_FICHERO', BACKUP_VERSION_FILE],
    ['FUENTE_DATOS', source],
    ['ALCANCE', scope === 'TODOS' ? 'TODOS' : selectedTitle],
    ['EVENTO_ID', scope === 'TODOS' ? 'TODOS' : selectedCode],
    ['FECHA_DESCARGA', `${now.yyyy}${now.mm}${now.dd}-${now.hh}_${now.mi}_${now.ss}`],
    ['REGISTROS_EVENTOS', scopedCounts.eventos],
    ['REGISTROS_PERSONAS', scopedCounts.personas],
    ['REGISTROS_TIENDAS', scopedCounts.tiendas],
    ['REGISTROS_PRODUCTOS', scopedCounts.productos],
    ['REGISTROS_INGRESOS', scopedCounts.colaboradores],
    ['REGISTROS_COMPRAS', scopedCounts.compras],
    ['REGISTROS_DOCUMENTOS', scopedCounts.eventDocuments || 0],
    ['REGISTROS_TICKETS', scopedCounts.ticketImages],
    ['TOTAL_ORIGEN_EVENTOS', totalCounts.eventos],
    ['TOTAL_ORIGEN_PERSONAS', totalCounts.personas],
    ['TOTAL_ORIGEN_PRODUCTOS', totalCounts.productos],
    ['PROTECCION', 'Hojas protegidas para evitar cambios accidentales en la descarga.'],
    ['NOTA', 'Exportacion generada con clonado plano y tickets divididos para evitar RangeError.']
  ]);
  addRows('EVENTOS', ['EVENTO_ID','EVENTO_TITULO','EVENTO_PRECIO','EVENTO_FECHAINI','EVENTO_FECHAFIN','EVENTO_SITUACION','EVENTO_DESCRIPCION'], scoped.eventos.map(e => [e.id || '', e.titulo || '', num(e.precio), e.fechaIni || '', e.fechaFin || '', e.situacion || 'En curso', e.descripcion || '']));
  addRows('PERSONAS', ['PERSONA_CODIGO','PERSONA_ID','PERSONA_NOMBRE','PERSONA_RANGO'], scoped.personas.map(p => [personCode[p.id], p.id, p.nombre || '', p.rango || 'SOCIO']));
  addRows('TIENDAS', ['TIENDA_CODIGO','TIENDA_ID','TIENDA_NOMBRE'], scoped.tiendas.map(t => [storeCode[t.id], t.id, t.nombre || '']));
  const wsProductos = addRows('PRODUCTOS', ['PRODUCTO_CODIGO','PRODUCTO_ID','PRODUCTO_NOMBRE','PRODUCTO_SEGMENTO','PRODUCTO_DESTINO','PRODUCTO_PRECIO_REFERENCIA'], scoped.productos.map(p => [productCode[p.id], p.id, p.nombre || '', p.segmento || '', p.destino || '', num(p.defaultPrecio ?? p.precio)]));
  try{ wsProductos.getColumn(6).numFmt = '#,##0.00 [$€-C0A]'; }catch(_){ }
  addRows('INGRESOS', ['EVENTO_CODIGO','INGRESO_ID','PERSONA_CODIGO','NUMERO','INGRESO','IMPORTE_VOLUNTARIO'], scoped.colaboradores.map(c => [eventCode[c.eventId] || '', c.id || '', personCode[c.personaId] || '', num(c.numero), c.situacion || c.ingreso || 'Pendiente', num(c.importe ?? c.importeVoluntario)]));
  addRows('COMPRAS', ['EVENTO_CODIGO','COMPRA_ID','PRODUCTO_CODIGO','UNIDADES','PRECIO','TICKET_U_OTROS_GASTOS','TIENDA_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => !isDonation(ticket(c))).map(c => [eventCode[c.eventId] || '', c.id || '', productCode[c.productoId] || '', num(c.unidades), price(c, productMap), ticket(c), storeCode[c.tiendaId] || '', personCode[c.responsableId] || '']));
  addRows('DONACIONES', ['EVENTO_CODIGO','DONACION_ID','PRODUCTO_CODIGO','UNIDADES','PRECIO','TIPO_DONACION','DONANTE_TIPO','DONANTE_CODIGO','RESPONSABLE_PERSONA_CODIGO'], scoped.compras.filter(c => isDonation(ticket(c))).map(c => { const parts = String(c.donorRef || '').split(':'); const kind = parts[0], id = parts[1]; return [eventCode[c.eventId] || '', c.id || '', productCode[c.productoId] || '', num(c.unidades), price(c, productMap), ticket(c), kind === 'P' ? 'PERSONA' : (kind === 'T' ? 'TIENDA' : ''), kind === 'P' ? (personCode[id] || '') : (kind === 'T' ? (storeCode[id] || '') : ''), personCode[c.responsableId] || '']; }));
  addRows('DOCUMENTOS', ['EVENTO_CODIGO','DOC_CODIGO','DOC_ID','FECHA','DESCRIPCION','CLAVE_IMAGEN','FOTO_URL'], (scoped.eventDocuments || []).map(doc => {
    const code = documentToken(doc?.codigo || doc?.imageKey || doc?.id);
    const key = doc?.eventId && code ? `${doc.eventId}|${code}` : '';
    const image = key ? (scoped.ticketImages?.[key] || '') : '';
    const imageText = typeof image === 'object' ? (image.url || image.public_url || image.publicUrl || image.pathname || image.path || image.storage_path || image.dataUrl || image.base64 || '') : String(image || '');
    return [eventCode[doc?.eventId] || doc?.eventId || '', code, doc?.id || key, doc?.fecha || '', doc?.descripcion || '', code, imageText || doc?.imageUrl || ''];
  }));
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
  await downloadWorkbook(wb, backupFileName(scope, selectedTitle));
  return {ok:true, source, scope, counts, scopedCounts, filename: backupFileName(scope, selectedTitle)};
}

registerExcelModule('exportSeedWorkbook', {meta, run});
registerExcelModule('backup', {meta, run});
