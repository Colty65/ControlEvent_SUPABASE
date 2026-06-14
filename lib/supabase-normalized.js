import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import mime from 'mime-types';
import { BUCKET, getSupabaseAdmin } from './supabase.js';

export const COLLECTIONS = ['eventos', 'personas', 'tiendas', 'productos', 'colaboradores', 'compras'];
export const META_KEYS = ['selectedEventId', 'comprasSort', 'summaryTiendaSort', 'eventCodeMap', 'entityCodeMaps', 'eventDocuments'];
export const TABLES = [
  'ce_users',
  'ce_eventos',
  'ce_personas',
  'ce_tiendas',
  'ce_productos',
  'ce_colaboradores',
  'ce_compras',
  'ce_ticket_images',
  'ce_meta'
];
const PROTECTED_EMPTY_REPLACE_COLLECTIONS = new Set(COLLECTIONS);
// v8.5 FIX19: /api/state queda prohibido como mecanismo de borrado por ausencia.
// En guardados normales TODAS las colecciones se tratan como UPSERT no destructivo.
// Las bajas se hacen mediante endpoints CRUD explícitos y la sustitución total queda limitada
// a cargas/restore marcados explícitamente con __forceReplaceAll.
const NON_DESTRUCTIVE_STATE_COLLECTIONS = new Set(COLLECTIONS);

function db() { return getSupabaseAdmin(); }
function arr(value) { return Array.isArray(value) ? value : []; }
function text(value) { return value == null ? '' : String(value); }
function nullableText(value) {
  const s = text(value).trim();
  return s ? s : null;
}
function money(value) {
  const n = Number(String(value ?? 0).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function id(row, fallback) {
  return text(row?.id || fallback);
}
function imageEventId(key) {
  return text(key).split('|')[0] || 'sin_evento';
}
function imageLabel(key) {
  const parts = text(key).split('|');
  return parts.slice(1).join('|') || text(key);
}
function ticketImageKeyForEvent(eventId, key) {
  const ev = text(eventId).trim();
  const raw = text(key).trim();
  if (!ev) return raw;
  return raw.startsWith(`${ev}|`) ? raw : `${ev}|${raw}`;
}
function safeFilePart(value) {
  return Buffer.from(text(value), 'utf8').toString('base64url');
}

function imageSourceForCanonical(value) {
  if (!value) return '';
  if (typeof value === 'string') return text(value).trim();
  if (typeof value === 'object') return text(value.public_url || value.publicUrl || value.url || value.pathname || value.path || value.storage_path || value.dataUrl || value.base64 || value.src || '').trim();
  return '';
}
function decodeBase64UrlText(value) {
  const raw = text(value).trim().replace(/\.[a-z0-9]+(?:\?.*)?$/i, '');
  if (!raw) return '';
  try { return Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'); } catch (_) { return ''; }
}
function imageEventIdFromValue(value) {
  const match = imageSourceForCanonical(value).match(/\/ticket-images\/([^\/?#]+)\//i);
  return match ? decodeURIComponent(match[1]) : '';
}
function decodedImageKeyFromValue(value) {
  const match = imageSourceForCanonical(value).match(/\/ticket-images\/[^\/?#]+\/([^\/?#]+?)(?:\.[a-z0-9]+)?(?:[?#].*)?$/i);
  return match ? decodeBase64UrlText(match[1]) : '';
}
function hasTicketToken(value) {
  return /\bTK\s*\d+[A-Z0-9_-]*\b/i.test(text(value));
}
function canonicalImageKey(key, value) {
  const raw = text(key).trim();
  const decoded = decodedImageKeyFromValue(value);
  if (decoded && decoded.includes('|')) return decoded;
  const eventFromValue = imageEventIdFromValue(value);
  if (eventFromValue && raw && !raw.startsWith(`${eventFromValue}|`)) return `${eventFromValue}|${raw}`;
  return raw;
}

function parseDataUrl(dataUrl) {
  const match = text(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Imagen base64 no valida');
  const contentType = match[1];
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
  return { contentType, ext, buffer: Buffer.from(match[2], 'base64') };
}
function isDataUrl(value) {
  return /^data:image\//.test(text(value));
}
function storagePathFor(key, ext) {
  return `${imageEventId(key).replace(/[^a-zA-Z0-9_-]/g, '_')}/${safeFilePart(key)}.${ext || 'jpg'}`;
}

function eventIdFromStoragePath(value) {
  const first = text(value).split('/')[0]?.trim() || '';
  return first && first !== 'sin_evento' ? first : '';
}
function eventIdFromImageRow(row) {
  const direct = text(row?.event_id).trim();
  if (direct) return direct;
  const keyEvent = imageEventId(row?.image_key);
  if (keyEvent && keyEvent !== 'sin_evento') return keyEvent;
  const pathEvent = eventIdFromStoragePath(row?.storage_path || row?.pathname || '');
  if (pathEvent) return pathEvent;
  return imageEventIdFromValue(row?.public_url || row?.pathname || '') || '';
}
async function removeStoragePaths(paths, logPrefix = '[v8.5]') {
  const allPaths = [...new Set(arr(paths).map(p => text(p).trim()).filter(Boolean))];
  let storageDeleted = 0;
  for (let i = 0; i < allPaths.length; i += 100) {
    const chunk = allPaths.slice(i, i + 100);
    try {
      const { error } = await db().storage.from(BUCKET).remove(chunk);
      if (!error) storageDeleted += chunk.length;
      else console.warn(`${logPrefix} Storage remove parcial fallido:`, error.message || error);
    } catch (err) {
      console.warn(`${logPrefix} Storage remove parcial fallido:`, err?.message || err);
    }
  }
  return storageDeleted;
}
async function deleteTicketImageRows(rows, logPrefix = '[v8.5]') {
  const cleanRows = arr(rows).filter(Boolean);
  const imageKeys = [...new Set(cleanRows.map(row => text(row.image_key).trim()).filter(Boolean))];
  const storageDeleted = await removeStoragePaths(cleanRows.map(row => row.storage_path), logPrefix);
  let deletedRows = 0;
  for (let i = 0; i < imageKeys.length; i += 100) {
    const chunk = imageKeys.slice(i, i + 100);
    const { error } = await db().from('ce_ticket_images').delete().in('image_key', chunk);
    if (error) throw error;
    deletedRows += chunk.length;
  }
  return { deletedRows, storageDeleted };
}
function fromRows(rows, mapper) {
  return arr(rows).map(mapper);
}

function normalizeRowsForReplace(rows, pk, collection) {
  const cleanRows = [];
  const indexByKey = new Map();
  const duplicates = [];
  for (const row of arr(rows)) {
    if (!row || typeof row !== 'object') continue;
    const clean = { ...row };
    const key = text(clean[pk]).trim();
    if (!key) continue;
    if (indexByKey.has(key)) {
      duplicates.push(key);
      cleanRows[indexByKey.get(key)] = clean; // conserva el ultimo valor recibido
    } else {
      indexByKey.set(key, cleanRows.length);
      cleanRows.push(clean);
    }
  }
  if (duplicates.length) {
    const sample = [...new Set(duplicates)].slice(0, 8).join(', ');
    console.warn(`[saveStateToDb] ${collection}: ${duplicates.length} claves duplicadas normalizadas antes de guardar (${sample}).`);
  }
  return cleanRows;
}


function stableCodeValue(value, prefix) {
  const s = text(value).trim().toUpperCase();
  return new RegExp('^' + prefix + '\d+$', 'i').test(s) ? s : '';
}
function eventCodeFromRow(row) {
  return stableCodeValue(row?.eventoCodigo || row?.codigoEvento || row?.eventCode || row?.EVENTO_CODIGO, 'EV');
}
function entityCodeFromRow(row, prefix) {
  const props = prefix === 'PE'
    ? ['personaCodigo','codigoPersona','personCode','PERSONA_CODIGO']
    : prefix === 'TI'
      ? ['tiendaCodigo','codigoTienda','storeCode','TIENDA_CODIGO']
      : ['productoCodigo','codigoProducto','productCode','PRODUCTO_CODIGO'];
  for (const prop of props) {
    const code = stableCodeValue(row?.[prop], prefix);
    if (code) return code;
  }
  return '';
}
function buildCodeMapsFromState(state) {
  const eventCodeMap = { ...(state?.eventCodeMap && typeof state.eventCodeMap === 'object' ? state.eventCodeMap : {}) };
  const entityCodeMaps = { ...(state?.entityCodeMaps && typeof state.entityCodeMaps === 'object' ? state.entityCodeMaps : {}) };
  entityCodeMaps.personas = { ...(entityCodeMaps.personas || {}) };
  entityCodeMaps.tiendas = { ...(entityCodeMaps.tiendas || {}) };
  entityCodeMaps.productos = { ...(entityCodeMaps.productos || {}) };
  arr(state?.eventos).forEach(row => { const code = eventCodeFromRow(row); if (code && row?.id) eventCodeMap[text(row.id)] = code; });
  arr(state?.personas).forEach(row => { const code = entityCodeFromRow(row, 'PE'); if (code && row?.id) entityCodeMaps.personas[text(row.id)] = code; });
  arr(state?.tiendas).forEach(row => { const code = entityCodeFromRow(row, 'TI'); if (code && row?.id) entityCodeMaps.tiendas[text(row.id)] = code; });
  arr(state?.productos).forEach(row => { const code = entityCodeFromRow(row, 'PR'); if (code && row?.id) entityCodeMaps.productos[text(row.id)] = code; });
  return { eventCodeMap, entityCodeMaps };
}
function attachStableCodesToState(state) {
  const eventCodeMap = state?.eventCodeMap && typeof state.eventCodeMap === 'object' ? state.eventCodeMap : {};
  const entityCodeMaps = state?.entityCodeMaps && typeof state.entityCodeMaps === 'object' ? state.entityCodeMaps : {};
  state.eventos = arr(state.eventos).map(e => ({ ...e, eventoCodigo: stableCodeValue(e.eventoCodigo || eventCodeMap[e.id], 'EV') || e.eventoCodigo || '' }));
  state.personas = arr(state.personas).map(p => ({ ...p, personaCodigo: stableCodeValue(p.personaCodigo || entityCodeMaps.personas?.[p.id], 'PE') || p.personaCodigo || '' }));
  state.tiendas = arr(state.tiendas).map(t => ({ ...t, tiendaCodigo: stableCodeValue(t.tiendaCodigo || entityCodeMaps.tiendas?.[t.id], 'TI') || t.tiendaCodigo || '' }));
  state.productos = arr(state.productos).map(p => ({ ...p, productoCodigo: stableCodeValue(p.productoCodigo || entityCodeMaps.productos?.[p.id], 'PR') || p.productoCodigo || '' }));
  return state;
}

function eventToDb(row) {
  return {
    id: id(row),
    titulo: text(row.titulo),
    precio: money(row.precio),
    fecha_ini: text(row.fechaIni),
    fecha_fin: text(row.fechaFin),
    situacion: text(row.situacion || 'En curso'),
    descripcion: text(row.descripcion)
  };
}
function eventFromDb(row) {
  return {
    id: row.id,
    titulo: row.titulo || '',
    precio: Number(row.precio || 0),
    fechaIni: row.fecha_ini || '',
    fechaFin: row.fecha_fin || '',
    situacion: row.situacion || 'En curso',
    descripcion: row.descripcion || ''
  };
}
function personToDb(row) {
  return { id: id(row), nombre: text(row.nombre), rango: text(row.rango || 'SOCIO').toUpperCase() };
}
function personFromDb(row) {
  return { id: row.id, nombre: row.nombre || '', rango: row.rango || 'SOCIO' };
}
function storeToDb(row) {
  return { id: id(row), nombre: text(row.nombre) };
}
function storeFromDb(row) {
  return { id: row.id, nombre: row.nombre || '' };
}
function productToDb(row) {
  return {
    id: id(row),
    nombre: text(row.nombre),
    segmento: text(row.segmento),
    destino: text(row.destino),
    default_precio: money(row.defaultPrecio ?? row.precio),
    default_tienda_id: nullableText(row.defaultTiendaId ?? row.tiendaId)
  };
}
function productFromDb(row) {
  const out = {
    id: row.id,
    nombre: row.nombre || '',
    segmento: row.segmento || '',
    destino: row.destino || '',
    defaultPrecio: Number(row.default_precio || 0)
  };
  if (row.default_tienda_id) out.defaultTiendaId = row.default_tienda_id;
  return out;
}
function collaboratorToDb(row) {
  return {
    id: id(row),
    event_id: text(row.eventId),
    persona_id: text(row.personaId),
    numero: money(row.numero),
    situacion: text(row.situacion || 'Pendiente'),
    importe: money(row.importe)
  };
}
function collaboratorFromDb(row) {
  return {
    id: row.id,
    eventId: row.event_id || '',
    personaId: row.persona_id || '',
    numero: Number(row.numero || 0),
    situacion: row.situacion || 'Pendiente',
    importe: Number(row.importe || 0)
  };
}
function purchaseToDb(row) {
  return {
    id: id(row),
    event_id: text(row.eventId),
    producto_id: text(row.productoId),
    unidades: money(row.unidades),
    precio: money(row.precio),
    ticket_donacion: text(row.ticketDonacion),
    donor_ref: nullableText(row.donorRef),
    responsable_id: nullableText(row.responsableId),
    tienda_id: nullableText(row.tiendaId)
  };
}
function purchaseFromDb(row) {
  return {
    id: row.id,
    eventId: row.event_id || '',
    productoId: row.producto_id || '',
    unidades: Number(row.unidades || 0),
    precio: Number(row.precio || 0),
    ticketDonacion: row.ticket_donacion || '',
    donorRef: row.donor_ref || '',
    responsableId: row.responsable_id || '',
    tiendaId: row.tienda_id || ''
  };
}

const tableMap = {
  eventos: ['ce_eventos', 'id', eventToDb, eventFromDb],
  personas: ['ce_personas', 'id', personToDb, personFromDb],
  tiendas: ['ce_tiendas', 'id', storeToDb, storeFromDb],
  productos: ['ce_productos', 'id', productToDb, productFromDb],
  colaboradores: ['ce_colaboradores', 'id', collaboratorToDb, collaboratorFromDb],
  compras: ['ce_compras', 'id', purchaseToDb, purchaseFromDb]
};

async function replaceTable(table, pk, rows) {
  const client = db();
  const { error: deleteError } = await client.from(table).delete().not(pk, 'is', null);
  if (deleteError) throw deleteError;
  if (!rows.length) return 0;
  const { error } = await client.from(table).upsert(rows, { onConflict: pk });
  if (error) throw error;
  return rows.length;
}

async function mergeTableNonDestructive(table, pk, rows, collection) {
  const cleanRows = arr(rows).filter(Boolean);
  if (!cleanRows.length) {
    const existingCount = await tableCount(table).catch(() => 0);
    if (existingCount > 0) {
      console.warn(`[saveStateToDb] FIX18: protegido ${table}. Se ignora guardado vacio no destructivo sobre ${existingCount} registros existentes.`);
    }
    return 0;
  }
  const { error } = await db().from(table).upsert(cleanRows, { onConflict: pk });
  if (error) throw error;
  console.warn(`[saveStateToDb] FIX18: ${collection} guardado en modo no destructivo (${cleanRows.length} filas upsert). No se borran registros ausentes del payload.`);
  return cleanRows.length;
}

async function selectAll(table, order = 'id') {
  const { data, error } = await db().from(table).select('*').order(order);
  if (error) throw error;
  return data || [];
}

async function tableCount(table) {
  const { count, error } = await db().from(table).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return count ?? 0;
}

async function existingEventIdSet() {
  const { data, error } = await db().from('ce_eventos').select('id');
  if (error) throw error;
  return new Set((data || []).map(row => text(row?.id).trim()).filter(Boolean));
}

async function assertExistingEventId(eventId, context = 'imagen') {
  const ev = text(eventId).trim();
  if (!ev) {
    const err = new Error(`Falta eventId para ${context}.`);
    err.status = 400;
    throw err;
  }
  const { data, error } = await db().from('ce_eventos').select('id').eq('id', ev).maybeSingle();
  if (error) throw error;
  if (!data?.id) {
    const err = new Error(`Evento no existe para ${context}: ${ev}`);
    err.status = 409;
    throw err;
  }
  return ev;
}

async function ensureExistingEventIdForImageUpload(eventId, _eventSnapshot) {
  // FIX23: una subida de foto NUNCA crea ni modifica eventos.
  // Si el evento no existe todavía, primero debe haberse dado de alta por CRUD explícito.
  return assertExistingEventId(eventId, 'subir foto');
}

function imageKeyLooksLikeOtherEvent(key, eventId) {
  const raw = text(key).trim();
  const ev = text(eventId).trim();
  const first = raw.split('|')[0] || '';
  return /^id-[a-z0-9_-]+$/i.test(first) && ev && first !== ev;
}

function allowsEmptyReplace(state, collection) {
  if (state.__forceReplaceAll === true || state.__allowEmptyReplace === true) return true;
  const allowed = state.__allowEmptyCollections;
  return Array.isArray(allowed) && allowed.includes(collection);
}

async function uploadDataUrlImage(key, dataUrl) {
  const client = db();
  const parsed = parseDataUrl(dataUrl);
  const storagePath = storagePathFor(key, parsed.ext);
  const { error: uploadError } = await client.storage.from(BUCKET).upload(storagePath, parsed.buffer, {
    contentType: parsed.contentType,
    upsert: true,
    cacheControl: '60'
  });
  if (uploadError) throw uploadError;
  const { data: pub } = client.storage.from(BUCKET).getPublicUrl(storagePath);
  const publicUrl = pub?.publicUrl || storagePath;
  return {
    image_key: key,
    event_id: imageEventId(key),
    label: imageLabel(key),
    storage_path: storagePath,
    public_url: publicUrl,
    pathname: publicUrl,
    content_type: parsed.contentType,
    size_bytes: parsed.buffer.length
  };
}

function refToImageRow(key, value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const src = text(value).trim();
    if (!src) return null;
    return {
      image_key: key,
      event_id: imageEventId(key),
      label: imageLabel(key),
      public_url: /^https?:\/\//.test(src) ? src : null,
      pathname: src
    };
  }
  if (typeof value === 'object') {
    const src = text(value.public_url || value.publicUrl || value.url || value.pathname || value.path || value.storage_path || '').trim();
    // v50.1: protección no destructiva. Nunca se sube una referencia vacía que pueda pisar
    // una imagen real ya guardada en ce_ticket_images / Supabase Storage.
    if (!src) return null;
    return {
      image_key: key,
      event_id: imageEventId(key),
      label: imageLabel(key),
      public_url: /^https?:\/\//.test(src) ? src : null,
      pathname: src,
      content_type: value.contentType || value.content_type || null,
      size_bytes: value.size || value.size_bytes || null
    };
  }
  return null;
}


function ticketTokenFrom(value) {
  const match = text(value).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);
  return match ? match[0].replace(/\s+/g, '').toUpperCase() : '';
}
function isDonationTicket(value) {
  return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(text(value).trim().toUpperCase());
}
function purchaseTicket(row) {
  return text(row?.ticketDonacion ?? row?.ticket ?? row?.ticketOtrosGastos ?? '').trim();
}
function ingresoInnerFrom(value) {
  const match = text(value).trim().match(/INGRESO[:|]([^|\s]+)/i);
  return match ? `INGRESO:${match[1]}` : '';
}

function ingresoIdFromLabel(value) {
  const match = text(value).trim().match(/^INGRESO[:|]([^|\s]+)/i);
  return match ? text(match[1]).trim() : '';
}
function stripKnownEventPrefix(value, eventId) {
  let out = text(value).trim();
  if (eventId && out.startsWith(`${eventId}|`)) out = out.slice(String(eventId).length + 1).trim();
  return out;
}
function normalizeTicketInnerFrom(value) {
  let out = text(value).trim();
  if (/^INGRESO[:|]/i.test(out) && out.includes('|') && ticketTokenFrom(out)) {
    out = out.split('|').slice(1).join('|').trim();
  }
  const tk = ticketTokenFrom(out);
  if (!tk) return '';
  const left = text(out.split('|')[0] || '').trim();
  if (left && left !== tk && !/^INGRESO[:|]/i.test(left)) return `${left} | ${tk}`;
  return tk;
}
function liveImageIndexForState(state) {
  const index = new Map();
  const byEventToken = new Map();
  const stores = Object.fromEntries(arr(state?.tiendas).map(t => [text(t.id), t]));
  function add(eventId, innerKey, kind) {
    eventId = text(eventId).trim(); innerKey = text(innerKey).trim();
    if (!eventId || !innerKey) return;
    const canonicalKey = `${eventId}|${innerKey}`;
    if (!index.has(canonicalKey)) index.set(canonicalKey, { eventToken: eventId, innerKey, canonicalKey, kind });
    const tk = ticketTokenFrom(innerKey);
    if (tk) {
      const k = `${eventId}|${tk}`;
      if (!byEventToken.has(k)) byEventToken.set(k, new Set());
      byEventToken.get(k).add(canonicalKey);
    }
  }
  arr(state?.colaboradores).forEach(c => {
    if (c?.id && c?.eventId) add(c.eventId, `INGRESO:${c.id}`, 'INGRESO');
  });
  arr(state?.compras).forEach(c => {
    const tk = ticketTokenFrom(purchaseTicket(c));
    if (!tk || isDonationTicket(purchaseTicket(c))) return;
    const storeName = text(stores[text(c.tiendaId)]?.nombre).trim();
    add(c.eventId, storeName ? `${storeName} | ${tk}` : tk, 'TK');
  });
  return { index, byEventToken };
}
function imageCandidateEvents(rawKey, value, liveIndex) {
  const decoded = decodedImageKeyFromValue(value);
  const candidates = [
    imageEventIdFromValue(value),
    imageEventId(rawKey),
    decoded ? imageEventId(decoded) : ''
  ].filter(Boolean).map(text);
  const out = [];
  candidates.forEach(ev => {
    // imageEventId() devuelve 'sin_evento' si no hay prefijo; no es un evento real.
    if (ev && ev !== 'sin_evento' && !out.includes(ev)) out.push(ev);
  });
  return out;
}
function imageCandidateInners(rawKey, value, eventId) {
  const decoded = decodedImageKeyFromValue(value);
  const vals = [
    decoded ? stripKnownEventPrefix(imageLabel(decoded), eventId) : '',
    stripKnownEventPrefix(imageLabel(rawKey), eventId),
    stripKnownEventPrefix(rawKey, eventId),
    decoded ? stripKnownEventPrefix(decoded, eventId) : ''
  ];
  const out = [];
  vals.forEach(v => { v = text(v).trim(); if (v && !out.includes(v)) out.push(v); });
  return out;
}
function liveCanonicalImageKey(rawKey, value, liveIndex) {
  for (const ev of imageCandidateEvents(rawKey, value, liveIndex)) {
    for (const inner of imageCandidateInners(rawKey, value, ev)) {
      const ing = ingresoInnerFrom(inner);
      if (ing && liveIndex.index.has(`${ev}|${ing}`)) return `${ev}|${ing}`;
      const tkInner = normalizeTicketInnerFrom(inner);
      if (tkInner) {
        const exact = `${ev}|${tkInner}`;
        if (liveIndex.index.has(exact)) return exact;
        const tk = ticketTokenFrom(tkInner);
        const candidates = liveIndex.byEventToken.get(`${ev}|${tk}`);
        if (candidates && candidates.size === 1) return [...candidates][0];
      }
    }
  }
  return '';
}

function documentCodeFrom(value) {
  const match = text(value).toUpperCase().match(/DOC\s*(\d+)/);
  return match ? `DOC${String(Number(match[1])).padStart(2, '0')}` : '';
}
function liveDocumentImageKey(rawKey, value, state) {
  const liveEventIds = new Set(arr(state?.eventos).map(event => text(event?.id).trim()).filter(Boolean));
  const validDocs = new Set(arr(state?.eventDocuments).map(doc => {
    const ev = text(doc?.eventId).trim();
    const code = documentCodeFrom(doc?.codigo || doc?.imageKey);
    return ev && code ? `${ev}|${code}` : '';
  }).filter(Boolean));
  const events = imageCandidateEvents(rawKey, value, {}).filter(ev => ev && ev !== 'sin_evento' && liveEventIds.has(ev));
  for (const ev of events) {
    for (const inner of imageCandidateInners(rawKey, value, ev)) {
      const code = documentCodeFrom(inner);
      if (!code) continue;
      const key = `${ev}|${code}`;
      if (!validDocs.size || validDocs.has(key)) return key;
    }
  }
  return '';
}

async function saveImagesFromState(state) {
  const images = { ...(state.ticketImages || {}) };
  for (const [key, ref] of Object.entries(state.ticketImageRefs || {})) {
    if (!images[key]) images[key] = ref;
  }

  const liveIndex = liveImageIndexForState(state || {});
  const rows = [];
  for (const [rawKey, value] of Object.entries(images)) {
    if (!value) continue;
    let key = liveDocumentImageKey(rawKey, value, state);
    if (!key) {
      key = liveCanonicalImageKey(rawKey, value, liveIndex);
    }
    // v8.2: solo se persisten fotos que apuntan a datos vivos actuales: ingreso existente, TKxx existente o DOCXX vivo del evento.
    // Así, tras limpiar el servidor, no vuelven a grabarse aliases antiguos ni referencias huérfanas.
    if (!key) continue;
    if (!isDataUrl(value)) {
      const srcEvent = imageEventIdFromValue(value);
      const keyEvent = imageEventId(key);
      // v8.3.1: si una URL ya existente apunta a otra carpeta de evento, no se persiste.
      // Esto evita reintroducir referencias cruzadas tras una carga que venga de datos antiguos.
      if (srcEvent && keyEvent && srcEvent !== keyEvent) continue;
    }
    rows.push(isDataUrl(value) ? await uploadDataUrlImage(key, value) : refToImageRow(key, value));
  }

  const clean = rows.filter(Boolean);
  if (!clean.length) return 0;

  // v8.5 FIX13: ce_ticket_images nunca debe crear fotos de eventos que no existen realmente
  // en ce_eventos. Esto corta las migraciones antiguas/locales que se disparaban al cargar
  // la pantalla de login con selectedEventId obsoleto.
  const liveEventIds = await existingEventIdSet();
  const safeRowsRaw = clean.filter(row => {
    const ev = eventIdFromImageRow(row);
    return ev && liveEventIds.has(ev);
  });
  if (!safeRowsRaw.length) return 0;

  // v8.5 FIX16: varias referencias antiguas pueden canonizarse al mismo image_key
  // (por ejemplo ticketImages + ticketImageRefs, o aliases antiguos). Supabase no
  // permite que un mismo upsert contenga dos filas que choquen contra la misma clave.
  // Conservamos la ultima fila valida por image_key y subimos una sola vez cada foto.
  const rowByImageKey = new Map();
  for (const row of safeRowsRaw) {
    const k = text(row?.image_key).trim();
    if (!k) continue;
    rowByImageKey.set(k, row);
  }
  const safeRows = [...rowByImageKey.values()];
  if (!safeRows.length) return 0;

  const { error } = await db().from('ce_ticket_images').upsert(safeRows, { onConflict: 'image_key' });
  if (error) throw error;
  return safeRows.length;
}

export async function stateFromDb() {
  const state = {};
  for (const collection of COLLECTIONS) {
    const [table, , , fromDb] = tableMap[collection];
    state[collection] = fromRows(await selectAll(table), fromDb);
  }

  const meta = await selectAll('ce_meta', 'key');
  for (const row of meta) state[row.key] = row.value;
  attachStableCodesToState(state);

  const { data: images, error } = await db()
    .from('ce_ticket_images')
    .select('image_key,event_id,label,public_url,pathname,storage_path,content_type,size_bytes')
    .order('image_key');
  if (error) throw error;
  state.ticketImages = {};
  state.ticketImageRefs = {};
  for (const img of images || []) {
    const value = img.public_url || img.pathname || img.storage_path || '';
    state.ticketImages[img.image_key] = value;
    state.ticketImageRefs[img.image_key] = {
      key: img.image_key,
      url: img.public_url || value,
      pathname: img.pathname || value,
      contentType: img.content_type || '',
      size: img.size_bytes || 0
    };
  }
  return state;
}



// v8.5 FIX24: cierres duros de seguridad de datos.
// Un evento Finalizado es inmutable: no se pueden insertar, modificar ni borrar
// ingresos, compras, donaciones, documentos/fotos ni registros globales que afecten
// a ese evento cerrado. Solo la restauracion total de BACKUP puede reemplazar datos.
async function eventRowByIdForGuard(eventId) {
  const ev = text(eventId).trim();
  if (!ev) return null;
  const { data, error } = await db().from('ce_eventos').select('id,titulo,situacion').eq('id', ev).maybeSingle();
  if (error) throw error;
  return data || null;
}
function isFinalizedDbRow(row) {
  return text(row?.situacion).trim().toLowerCase() === 'finalizado';
}
async function assertEventNotFinalized(eventId, action = 'modificar') {
  const ev = text(eventId).trim();
  if (!ev) {
    const err = new Error(`FIX24: falta event_id para ${action}.`);
    err.status = 400;
    throw err;
  }
  const row = await eventRowByIdForGuard(ev);
  if (!row?.id) {
    const err = new Error(`FIX24: evento inexistente para ${action}: ${ev}`);
    err.status = 409;
    throw err;
  }
  if (isFinalizedDbRow(row)) {
    const err = new Error(`FIX24: evento Finalizado bloqueado. No se permite ${action} en "${row.titulo || ev}".`);
    err.status = 423;
    throw err;
  }
  return row;
}
async function finalizedEventIdsSet() {
  const { data, error } = await db().from('ce_eventos').select('id,situacion').eq('situacion', 'Finalizado');
  if (error) throw error;
  return new Set((data || []).map(r => text(r.id).trim()).filter(Boolean));
}
async function assertExistingRecordNotInFinalizedEvent(collection, table, pk, recordId, action) {
  const idv = text(recordId).trim();
  if (!idv) return;
  if (collection === 'colaboradores' || collection === 'compras') {
    const { data, error } = await db().from(table).select('id,event_id').eq(pk, idv).maybeSingle();
    if (error) throw error;
    if (data?.event_id) await assertEventNotFinalized(data.event_id, `${action} ${collection}`);
  } else if (collection === 'eventos') {
    const row = await eventRowByIdForGuard(idv);
    if (row && isFinalizedDbRow(row)) {
      const err = new Error(`FIX24: evento Finalizado bloqueado. No se permite ${action} el evento "${row.titulo || idv}".`);
      err.status = 423;
      throw err;
    }
  }
}
async function assertNoFinalizedReferences(collection, recordId, action) {
  const idv = text(recordId).trim();
  if (!idv) return;
  const finalIds = await finalizedEventIdsSet();
  if (!finalIds.size) return;
  function fail(kind) {
    const err = new Error(`FIX24: no se permite ${action} ${collection} porque está usado en evento Finalizado (${kind}).`);
    err.status = 423;
    throw err;
  }
  const finalList = [...finalIds];
  if (collection === 'personas') {
    let q = await db().from('ce_colaboradores').select('id,event_id').eq('persona_id', idv).in('event_id', finalList).limit(1);
    if (q.error) throw q.error;
    if ((q.data || []).length) fail('ingresos');
    q = await db().from('ce_compras').select('id,event_id').eq('responsable_id', idv).in('event_id', finalList).limit(1);
    if (q.error) throw q.error;
    if ((q.data || []).length) fail('compras/responsable');
  }
  if (collection === 'productos') {
    const q = await db().from('ce_compras').select('id,event_id').eq('producto_id', idv).in('event_id', finalList).limit(1);
    if (q.error) throw q.error;
    if ((q.data || []).length) fail('compras/donaciones');
  }
  if (collection === 'tiendas') {
    let q = await db().from('ce_compras').select('id,event_id').eq('tienda_id', idv).in('event_id', finalList).limit(1);
    if (q.error) throw q.error;
    if ((q.data || []).length) fail('compras/tienda');
  }
}

function sameEventDbField(a, b, numeric = false) {
  if (numeric) return Number(a || 0) === Number(b || 0);
  return text(a).trim() === text(b).trim();
}
function eventUpdateOnlyChangesSituation(existing, incoming) {
  return sameEventDbField(existing?.titulo, incoming?.titulo)
    && sameEventDbField(existing?.precio, incoming?.precio, true)
    && sameEventDbField(existing?.fecha_ini, incoming?.fecha_ini)
    && sameEventDbField(existing?.fecha_fin, incoming?.fecha_fin)
    && sameEventDbField(existing?.descripcion, incoming?.descripcion);
}

async function assertCrudAllowed(collection, rowOrId, action, table = '', pk = 'id') {
  const isDelete = action === 'borrar';
  const row = rowOrId && typeof rowOrId === 'object' ? rowOrId : null;
  const rowId = row ? text(row?.[pk] || row?.id).trim() : text(rowOrId).trim();

  if (collection === 'eventos') {
    if (isDelete) {
      await assertExistingRecordNotInFinalizedEvent(collection, table || 'ce_eventos', pk, rowId, action);
      return;
    }
    const existing = await eventRowByIdForGuard(rowId);
    if (existing && isFinalizedDbRow(existing)) {
      // FIX25: un evento Finalizado es inmutable en datos, pero GD debe poder cambiar
      // explícitamente SOLO la situación para reabrir/cerrar. Si cambia cualquier otro campo, bloqueo.
      if (!row || !eventUpdateOnlyChangesSituation(existing, row)) {
        const err = new Error(`FIX25: evento Finalizado bloqueado. Solo se permite cambiar la SITUACIÓN de "${existing.titulo || rowId}".`);
        err.status = 423;
        throw err;
      }
    }
    return;
  }

  if (collection === 'colaboradores' || collection === 'compras') {
    if (rowId) await assertExistingRecordNotInFinalizedEvent(collection, table, pk, rowId, action);
    const ev = text(row?.event_id || row?.eventId).trim();
    if (ev) await assertEventNotFinalized(ev, `${action} ${collection}`);
    return;
  }

  if (['personas','productos','tiendas'].includes(collection)) {
    if (rowId) await assertNoFinalizedReferences(collection, rowId, action);
  }
}

export async function saveStateToDb(incoming) {
  const state = incoming && typeof incoming === 'object' ? incoming : {};
  for (const collection of COLLECTIONS) {
    if (!Object.prototype.hasOwnProperty.call(state, collection)) continue;
    const [table, pk, toDb] = tableMap[collection];
    const mappedRows = arr(state[collection]).map((row, index) => toDb({ ...row, id: id(row, `${collection}-${index}`) }));
    const rows = normalizeRowsForReplace(mappedRows, pk, collection);
    if (
      PROTECTED_EMPTY_REPLACE_COLLECTIONS.has(collection) &&
      rows.length === 0 &&
      !allowsEmptyReplace(state, collection)
    ) {
      const existingCount = await tableCount(table);
      if (existingCount > 0) {
        console.warn(`[saveStateToDb] Protegido ${table}: se ignora reemplazo vacio sobre ${existingCount} registros existentes.`);
        continue;
      }
    }
    if (NON_DESTRUCTIVE_STATE_COLLECTIONS.has(collection) && !allowsEmptyReplace(state, collection)) {
      await mergeTableNonDestructive(table, pk, rows, collection);
      continue;
    }
    await replaceTable(table, pk, rows);
  }

  const stableMaps = buildCodeMapsFromState(state);
  if (Object.keys(stableMaps.eventCodeMap).length) state.eventCodeMap = stableMaps.eventCodeMap;
  if (stableMaps.entityCodeMaps && Object.keys(stableMaps.entityCodeMaps).length) state.entityCodeMaps = stableMaps.entityCodeMaps;
  const metaRows = META_KEYS
    .filter(key => Object.prototype.hasOwnProperty.call(state, key))
    .map(key => ({ key, value: state[key] ?? null }));
  if (metaRows.length) {
    const { error } = await db().from('ce_meta').upsert(metaRows, { onConflict: 'key' });
    if (error) throw error;
  }
  await saveImagesFromState(state);
  // v8.5 FIX18: no se limpian fotos de INGRESOS como efecto colateral de un saveState normal.
  // Esa limpieza queda solo para el endpoint manual /api/ticket-images/cleanup-stale-ingresos,
  // porque si el payload viene parcial se podrían borrar justificantes buenos.
  if (state.__cleanupStaleIngresoImages === true) {
    await cleanupStaleIngresoImages();
  }
  // v8.5 FIX13: no se hace limpieza automática de ce_ticket_images durante guardados
  // normales. La limpieza de huérfanos debe ser una acción manual/controlada, no un efecto
  // colateral de abrir la app o guardar cualquier dato.
  if (state.__cleanupOrphanTicketImages === true) {
    await cleanupOrphanTicketImages();
  }
}

export async function upsertUsersFromArray(users) {
  const rows = arr(users).map(user => ({
    identificacion: text(user.identificacion).trim(),
    nombre: text(user.nombre || user.identificacion).trim(),
    clave: text(user.clave),
    nivel: text(user.nivel || 'RO').toUpperCase()
  })).filter(user => user.identificacion);
  if (!rows.length) return 0;
  const { error } = await db().from('ce_users').upsert(rows, { onConflict: 'identificacion' });
  if (error) throw error;
  return rows.length;
}

export async function getUsers(fallbackUsers = []) {
  const { data, error } = await db()
    .from('ce_users')
    .select('identificacion,nombre,clave,nivel')
    .order('identificacion');
  if (error) throw error;
  if ((!data || !data.length) && fallbackUsers.length) {
    await upsertUsersFromArray(fallbackUsers);
    return getUsers();
  }
  return data || [];
}

export async function saveAccessUser(payload) {
  const existingId = text(payload.existingId).trim();
  const row = {
    identificacion: text(payload.identificacion).trim(),
    nombre: text(payload.nombre).trim(),
    nivel: text(payload.nivel || 'RO').toUpperCase()
  };
  if (typeof payload.clave === 'string' && payload.clave.length) row.clave = payload.clave;
  if (!row.identificacion || !row.nombre) throw new Error('Identificacion y nombre son obligatorios');
  if (existingId && existingId !== row.identificacion) {
    const { error: delError } = await db().from('ce_users').delete().eq('identificacion', existingId);
    if (delError) throw delError;
  }
  const { error } = await db().from('ce_users').upsert(row, { onConflict: 'identificacion' });
  if (error) throw error;
  return row;
}

export async function deleteAccessUser(identificacion) {
  const { error } = await db().from('ce_users').delete().eq('identificacion', text(identificacion));
  if (error) throw error;
}

export async function changePassword({ identificacion, claveActual, claveNueva, nuevaClave }) {
  const users = await getUsers();
  const user = users.find(item => text(item.identificacion) === text(identificacion));
  if (!user || text(user.clave) !== text(claveActual)) throw new Error('Clave actual no valida');
  const next = claveNueva ?? nuevaClave;
  if (!next) throw new Error('La nueva clave es obligatoria');
  const { error } = await db().from('ce_users').update({ clave: text(next) }).eq('identificacion', user.identificacion);
  if (error) throw error;
}

export async function uploadTicketImage({ eventId, key, dataUrl, eventSnapshot }) {
  const ev = await ensureExistingEventIdForImageUpload(eventId, eventSnapshot);
  await assertEventNotFinalized(ev, 'subir foto');
  if (imageKeyLooksLikeOtherEvent(key, ev)) {
    const err = new Error(`Clave de imagen de otro evento rechazada: ${text(key).trim()}`);
    err.status = 409;
    throw err;
  }
  const row = await uploadDataUrlImage(ticketImageKeyForEvent(ev, key), dataUrl);
  const rowEvent = eventIdFromImageRow(row);
  if (rowEvent !== ev) {
    const err = new Error(`La foto intenta guardarse en un evento distinto: ${rowEvent || 'sin_evento'}`);
    err.status = 409;
    throw err;
  }
  const { error } = await db().from('ce_ticket_images').upsert(row, { onConflict: 'image_key' });
  if (error) throw error;
  return { key: row.image_key, url: row.public_url, pathname: row.pathname };
}

export async function deleteTicketImage({ eventId, key }) {
  await assertEventNotFinalized(eventId, 'eliminar foto');
  const imageKey = ticketImageKeyForEvent(eventId, key);
  const { data } = await db().from('ce_ticket_images').select('storage_path').eq('image_key', imageKey).maybeSingle();
  if (data?.storage_path) await db().storage.from(BUCKET).remove([data.storage_path]);
  const { error } = await db().from('ce_ticket_images').delete().eq('image_key', imageKey);
  if (error) throw error;
}


export async function deleteTicketImagesForEvent(eventId) {
  const ev = text(eventId).trim();
  if (!ev) return { deleted: 0, deletedRows: 0, storageDeleted: 0 };
  await assertEventNotFinalized(ev, 'eliminar fotos del evento');

  const byKey = new Map();
  const collect = async (query) => {
    const { data, error } = await query;
    if (error) throw error;
    for (const row of data || []) {
      const key = text(row?.image_key).trim();
      if (key) byKey.set(key, row);
    }
  };

  await collect(db().from('ce_ticket_images').select('image_key,storage_path').eq('event_id', ev));
  await collect(db().from('ce_ticket_images').select('image_key,storage_path').like('image_key', `${ev}|%`));

  const result = await deleteTicketImageRows([...byKey.values()], '[v8.5]');
  return { deleted: result.deletedRows, ...result };
}


function collectionSpec(collection) {
  const key = text(collection).trim();
  const spec = tableMap[key];
  if (!spec) {
    const err = new Error(`Colección no soportada para CRUD: ${key}`);
    err.status = 400;
    throw err;
  }
  return [key, ...spec];
}

async function upsertRows(table, pk, rows) {
  const cleanRows = normalizeRowsForReplace(rows, pk, table);
  if (!cleanRows.length) return 0;
  const { error } = await db().from(table).upsert(cleanRows, { onConflict: pk });
  if (error) throw error;
  return cleanRows.length;
}

async function removeIngresoImagesForCollab(row) {
  const ev = text(row?.event_id || row?.eventId).trim();
  const collabId = text(row?.id).trim();
  if (!ev || !collabId) return { deletedRows: 0, storageDeleted: 0 };
  const label = `INGRESO:${collabId}`;
  const byKey = new Map();
  const collect = async (query) => {
    const { data, error } = await query;
    if (error) throw error;
    for (const img of data || []) {
      const key = text(img?.image_key).trim();
      if (key) byKey.set(key, img);
    }
  };
  await collect(db().from('ce_ticket_images').select('image_key,event_id,label,storage_path').eq('event_id', ev).eq('label', label));
  await collect(db().from('ce_ticket_images').select('image_key,event_id,label,storage_path').eq('image_key', `${ev}|${label}`));
  return deleteTicketImageRows([...byKey.values()], '[v8.5 FIX19 collab-image-delete]');
}

async function removeEventDocumentsFromMeta(eventId) {
  const ev = text(eventId).trim();
  if (!ev) return 0;
  const { data, error } = await db().from('ce_meta').select('value').eq('key', 'eventDocuments').maybeSingle();
  if (error) throw error;
  const value = Array.isArray(data?.value) ? data.value : [];
  const next = value.filter(doc => text(doc?.eventId || doc?.event_id).trim() !== ev);
  if (next.length === value.length) return 0;
  const { error: upsertError } = await db().from('ce_meta').upsert([{ key: 'eventDocuments', value: next }], { onConflict: 'key' });
  if (upsertError) throw upsertError;
  return value.length - next.length;
}



// v8.5 FIX31: COMPRAS pasa a RPC transaccional en BBDD.
// Mantiene global_write_lock=ON y solo las funciones SQL autorizadas hacen bypass interno,
// con validación de evento En curso. Ya no se escribe ce_compras directamente desde JS.
async function rpcCompraInsert(row) {
  const { data, error } = await db().rpc('ce_crud_compras_insert', {
    p_id: text(row.id).trim(),
    p_event_id: text(row.event_id).trim(),
    p_producto_id: text(row.producto_id).trim(),
    p_unidades: money(row.unidades),
    p_precio: money(row.precio),
    p_ticket_donacion: text(row.ticket_donacion).trim(),
    p_donor_ref: nullableText(row.donor_ref),
    p_responsable_id: nullableText(row.responsable_id),
    p_tienda_id: nullableText(row.tienda_id)
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
async function rpcCompraUpdate(row) {
  const { data, error } = await db().rpc('ce_crud_compras_update', {
    p_id: text(row.id).trim(),
    p_event_id: text(row.event_id).trim(),
    p_producto_id: text(row.producto_id).trim(),
    p_unidades: money(row.unidades),
    p_precio: money(row.precio),
    p_ticket_donacion: text(row.ticket_donacion).trim(),
    p_donor_ref: nullableText(row.donor_ref),
    p_responsable_id: nullableText(row.responsable_id),
    p_tienda_id: nullableText(row.tienda_id)
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
async function rpcCompraDelete(rowId) {
  const { data, error } = await db().rpc('ce_crud_compras_delete', { p_id: text(rowId).trim() });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
async function rpcEventSituation(rowId, situacion) {
  const { data, error } = await db().rpc('ce_crud_eventos_situacion', {
    p_id: text(rowId).trim(),
    p_situacion: text(situacion).trim()
  });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function updateEventSituationCrud(recordId, situacion) {
  const rowId = text(recordId).trim();
  const next = text(situacion).trim() === 'Finalizado' ? 'Finalizado' : 'En curso';
  if (!rowId) {
    const err = new Error('Falta id para cambiar situación de evento');
    err.status = 400;
    throw err;
  }
  const data = await rpcEventSituation(rowId, next);
  if (!data?.id) {
    const err = new Error(`No existe evento para cambiar situación: ${rowId}`);
    err.status = 404;
    throw err;
  }
  return { ok: true, collection: 'eventos', action: 'update-situacion', id: rowId, situacion: next, item: eventFromDb(data) };
}


export async function upsertCrudRecord(collection, payload) {
  const [key, table, pk, toDb, fromDb] = collectionSpec(collection);
  const input = payload && typeof payload === 'object' ? payload : {};
  const row = toDb({ ...input, id: id(input) });
  const rowId = text(row?.[pk]).trim();
  if (!rowId) {
    const err = new Error(`Falta id para alta/modificación en ${key}`);
    err.status = 400;
    throw err;
  }

  if (key === 'compras') {
    // FIX31: alta/modificación de COMPRAS por RPC SQL explícito.
    // Si ya existe el id, UPDATE; si no existe, INSERT. La función SQL valida evento En curso.
    const { data: existing, error: existsError } = await db().from('ce_compras').select('id').eq('id', rowId).maybeSingle();
    if (existsError) throw existsError;
    const saved = existing?.id ? await rpcCompraUpdate(row) : await rpcCompraInsert(row);
    return { ok: true, collection: key, action: existing?.id ? 'update' : 'insert', id: rowId, item: saved ? fromDb(saved) : input };
  }

  await assertCrudAllowed(key, row, 'guardar', table, pk);
  await upsertRows(table, pk, [row]);
  const { data, error } = await db().from(table).select('*').eq(pk, rowId).maybeSingle();
  if (error) throw error;
  return { ok: true, collection: key, action: 'upsert', id: rowId, item: data ? fromDb(data) : input };
}


function sameTextOrNull(a, b) {
  const aa = text(a).trim();
  const bb = text(b).trim();
  return aa === bb;
}
function sameMoney(a, b) {
  const aa = Math.round(money(a) * 100);
  const bb = Math.round(money(b) * 100);
  return aa === bb;
}
function purchaseMatchesSignature(candidate, signature) {
  if (!candidate || !signature) return false;
  if (text(signature.event_id).trim() && text(candidate.event_id).trim() !== text(signature.event_id).trim()) return false;
  if (text(signature.producto_id).trim() && text(candidate.producto_id).trim() !== text(signature.producto_id).trim()) return false;
  if (!sameMoney(candidate.unidades, signature.unidades)) return false;
  if (!sameMoney(candidate.precio, signature.precio)) return false;
  if (!sameTextOrNull(candidate.ticket_donacion, signature.ticket_donacion)) return false;
  if (!sameTextOrNull(candidate.tienda_id, signature.tienda_id)) return false;
  if (!sameTextOrNull(candidate.responsable_id, signature.responsable_id)) return false;
  if (!sameTextOrNull(candidate.donor_ref, signature.donor_ref)) return false;
  return true;
}
async function deleteCompraBySignature(originalId, payload, out) {
  const signature = purchaseToDb({ ...payload, id: originalId });
  const ev = text(signature.event_id).trim();
  const producto = text(signature.producto_id).trim();
  if (!ev || !producto) return null;
  await assertEventNotFinalized(ev, 'borrar compras por firma');

  let query = db()
    .from('ce_compras')
    .select('id,event_id,producto_id,unidades,precio,ticket_donacion,donor_ref,responsable_id,tienda_id')
    .eq('event_id', ev)
    .eq('producto_id', producto);
  const ticket = text(signature.ticket_donacion).trim();
  if (ticket) query = query.eq('ticket_donacion', ticket);
  const { data: candidates, error: selectError } = await query;
  if (selectError) throw selectError;
  const exact = (candidates || []).filter(row => purchaseMatchesSignature(row, signature));
  if (!exact.length) {
    out.fallback = {
      attempted: true,
      matched: false,
      reason: 'No se encontro ninguna compra con la misma firma funcional en BBDD.',
      signature,
      candidates: (candidates || []).map(r => ({ id: r.id, event_id: r.event_id, producto_id: r.producto_id, unidades: r.unidades, precio: r.precio, ticket_donacion: r.ticket_donacion, tienda_id: r.tienda_id, responsable_id: r.responsable_id, donor_ref: r.donor_ref }))
    };
    return null;
  }
  // Si hay varias lineas identicas, se elimina UNA sola. Es justo el caso de duplicado manual.
  const target = exact[0];
  const { data: deletedRows, error } = await db().from('ce_compras').delete().eq('id', target.id).select('id');
  if (error) throw error;
  const deletedCount = Array.isArray(deletedRows) ? deletedRows.length : 0;
  if (deletedCount > 0) {
    out.deletedRows = deletedCount;
    out.fallback = { attempted: true, matched: true, originalId, deletedActualId: target.id, matchedCount: exact.length };
    return out;
  }
  out.fallback = { attempted: true, matched: true, deleted: false, originalId, targetId: target.id };
  return null;
}

export async function deleteCrudRecord(collection, recordId, payload = {}) {
  const [key, table, pk] = collectionSpec(collection);
  const rowId = text(recordId).trim();
  if (!rowId) {
    const err = new Error(`Falta id para baja en ${key}`);
    err.status = 400;
    throw err;
  }

  if (key === 'compras') {
    // FIX31: baja de COMPRAS por RPC SQL explícito. No hay fallback por firma: se borra exactamente el id real.
    const deleted = await rpcCompraDelete(rowId);
    return { ok: true, collection: key, action: 'delete', id: rowId, deletedRows: deleted?.id ? 1 : 0, item: deleted ? purchaseFromDb(deleted) : null };
  }

  await assertCrudAllowed(key, rowId, 'borrar', table, pk);
  const out = { ok: true, collection: key, action: 'delete', id: rowId };

  if (key === 'eventos') {
    await deleteTicketImagesForEvent(rowId).then(r => { out.images = r; });
    await removeEventDocumentsFromMeta(rowId).then(n => { out.documents = n; });
    let res = await db().from('ce_colaboradores').delete().eq('event_id', rowId); if (res.error) throw res.error;
    res = await db().from('ce_compras').delete().eq('event_id', rowId); if (res.error) throw res.error;
    res = await db().from('ce_eventos').delete().eq('id', rowId); if (res.error) throw res.error;
    return out;
  }

  if (key === 'personas') {
    const { data: collabs, error: collabSelectError } = await db().from('ce_colaboradores').select('id,event_id').eq('persona_id', rowId);
    if (collabSelectError) throw collabSelectError;
    for (const row of collabs || []) await removeIngresoImagesForCollab(row);
    let res = await db().from('ce_colaboradores').delete().eq('persona_id', rowId); if (res.error) throw res.error;
    res = await db().from('ce_compras').update({ responsable_id: null }).eq('responsable_id', rowId); if (res.error) throw res.error;
    res = await db().from('ce_personas').delete().eq('id', rowId); if (res.error) throw res.error;
    return out;
  }

  if (key === 'tiendas') {
    let res = await db().from('ce_productos').update({ default_tienda_id: null }).eq('default_tienda_id', rowId); if (res.error) throw res.error;
    res = await db().from('ce_compras').update({ tienda_id: null }).eq('tienda_id', rowId); if (res.error) throw res.error;
    res = await db().from('ce_tiendas').delete().eq('id', rowId); if (res.error) throw res.error;
    return out;
  }

  if (key === 'productos') {
    let res = await db().from('ce_compras').delete().eq('producto_id', rowId); if (res.error) throw res.error;
    res = await db().from('ce_productos').delete().eq('id', rowId); if (res.error) throw res.error;
    return out;
  }

  if (key === 'colaboradores') {
    const { data: oldRow, error: oldError } = await db().from('ce_colaboradores').select('id,event_id').eq('id', rowId).maybeSingle();
    if (oldError) throw oldError;
    if (oldRow) await removeIngresoImagesForCollab(oldRow).then(r => { out.images = r; });
  }

  const { data: deletedRows, error } = await db().from(table).delete().eq(pk, rowId).select(pk);
  if (error) throw error;
  out.deletedRows = Array.isArray(deletedRows) ? deletedRows.length : 0;
  if (out.deletedRows === 0) {
    if (key === 'compras' && payload && Object.keys(payload).length) {
      const fallback = await deleteCompraBySignature(rowId, payload, out);
      if (fallback) return fallback;
    }
    const err = new Error(`FIX29: no se borró ningún registro en ${table} con ${pk}=${rowId}.` + (out.fallback ? ' Fallback por firma tampoco encontró coincidencia exacta.' : ''));
    err.status = 404;
    err.details = out.fallback || null;
    throw err;
  }
  return out;
}

export async function applyCrudDeltas(deltas = {}) {
  // v8.5 FIX20: los deltas automáticos del navegador no son fuente fiable para bajas.
  // Durante renders/cambios de pestaña pueden faltar filas temporalmente y eso NO puede
  // convertirse en DELETE real. Se aceptan upserts si llegan, pero cualquier delete por
  // /api/crud-deltas se rechaza explícitamente. Las bajas reales deben usar endpoints
  // explícitos botón a botón, nunca comparación automática de snapshots.
  const deletes = deltas?.deletes && Object.values(deltas.deletes).some(list => arr(list).length > 0);
  if (deletes) {
    const err = new Error('FIX20: deletes automáticos por /api/crud-deltas bloqueados por seguridad.');
    err.status = 409;
    throw err;
  }
  const result = { ok: true, upserts: 0, deletes: 0, details: [], deletesBlocked: true };
  for (const [collection, rows] of Object.entries(deltas.upserts || {})) {
    for (const row of arr(rows)) {
      const info = await upsertCrudRecord(collection, row);
      result.upserts++;
      result.details.push(info);
    }
  }
  return result;
}

export async function cleanupOrphanTicketImages(liveEventIds = null) {
  let liveIds;
  if (liveEventIds instanceof Set) {
    liveIds = new Set([...liveEventIds].map(v => text(v).trim()).filter(Boolean));
  } else if (Array.isArray(liveEventIds)) {
    liveIds = new Set(liveEventIds.map(v => text(v).trim()).filter(Boolean));
  } else {
    const { data, error } = await db().from('ce_eventos').select('id');
    if (error) throw error;
    liveIds = new Set((data || []).map(row => text(row.id).trim()).filter(Boolean));
  }

  const { data, error } = await db()
    .from('ce_ticket_images')
    .select('image_key,event_id,storage_path,public_url,pathname');
  if (error) throw error;

  const orphans = (data || []).filter(row => {
    const ev = eventIdFromImageRow(row);
    return ev && !liveIds.has(ev);
  });
  if (!orphans.length) return { ok: true, deleted: 0, deletedRows: 0, storageDeleted: 0 };

  const result = await deleteTicketImageRows(orphans, '[v8.5 orphan-cleanup]');
  console.warn(`[v8.5] Limpieza CE_TICKET_IMAGES: ${result.deletedRows} filas huérfanas eliminadas.`);
  return { ok: true, deleted: result.deletedRows, ...result };
}


export async function cleanupStaleIngresoImages({ dryRun = false } = {}) {
  // v8.5 FIX14: las fotos INGRESO:<id> deben corresponder a un ingreso vivo
  // en ce_colaboradores. Si se borró un ingreso o se restauró un backup más corto,
  // la app deja de mostrar esa foto, pero la fila antigua podía seguir en ce_ticket_images.
  const { data: collabs, error: collabError } = await db()
    .from('ce_colaboradores')
    .select('id,event_id');
  if (collabError) throw collabError;

  const liveIncomeKeys = new Set();
  const liveIncomeByEvent = new Set();
  for (const row of collabs || []) {
    const ev = text(row?.event_id).trim();
    const id = text(row?.id).trim();
    if (!ev || !id) continue;
    liveIncomeKeys.add(`${ev}|INGRESO:${id}`);
    liveIncomeByEvent.add(`${ev}|${id}`);
  }

  const { data: events, error: eventError } = await db().from('ce_eventos').select('id');
  if (eventError) throw eventError;
  const liveEvents = new Set((events || []).map(row => text(row?.id).trim()).filter(Boolean));

  const { data: rows, error } = await db()
    .from('ce_ticket_images')
    .select('image_key,event_id,label,storage_path,public_url,pathname,created_at,updated_at');
  if (error) throw error;

  const incomeRows = (rows || []).filter(row =>
    ingresoInnerFrom(row?.label) || ingresoInnerFrom(imageLabel(row?.image_key)) || ingresoInnerFrom(row?.image_key)
  );

  const stale = [];
  const seenLiveLabel = new Map();
  for (const row of incomeRows) {
    const ev = eventIdFromImageRow(row);
    const label = ingresoInnerFrom(row?.label) || ingresoInnerFrom(imageLabel(row?.image_key)) || ingresoInnerFrom(row?.image_key);
    const incomeId = ingresoIdFromLabel(label);
    if (!ev || !label || !incomeId) continue;

    // Los huérfanos de evento se limpian con cleanupOrphanTicketImages. Aquí solo
    // actuamos sobre eventos vivos para no mezclar diagnósticos.
    if (!liveEvents.has(ev)) continue;

    const canonical = `${ev}|${label}`;
    const hasLiveIncome = liveIncomeByEvent.has(`${ev}|${incomeId}`) || liveIncomeKeys.has(canonical);
    if (!hasLiveIncome) {
      stale.push(row);
      continue;
    }

    // Si por una versión antigua hubiera aliases duplicados para el mismo ingreso vivo,
    // se conserva la clave canónica y se eliminan las demás. Si solo hay una no canónica,
    // se conserva para no arriesgar pérdida de una foto visible.
    const bucketKey = `${ev}|${label}`;
    const prev = seenLiveLabel.get(bucketKey);
    const isCanonical = text(row?.image_key).trim() === canonical;
    if (!prev) {
      seenLiveLabel.set(bucketKey, { row, isCanonical });
    } else if (isCanonical && !prev.isCanonical) {
      stale.push(prev.row);
      seenLiveLabel.set(bucketKey, { row, isCanonical: true });
    } else if (!isCanonical && prev.isCanonical) {
      stale.push(row);
    }
  }

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      stale: stale.length,
      rows: stale.map(row => ({ event_id: eventIdFromImageRow(row), image_key: row.image_key, label: row.label, storage_path: row.storage_path }))
    };
  }

  if (!stale.length) return { ok: true, deleted: 0, deletedRows: 0, storageDeleted: 0 };
  const result = await deleteTicketImageRows(stale, '[v8.5 stale-ingresos]');
  console.warn(`[v8.5] Limpieza INGRESOS ce_ticket_images: ${result.deletedRows} filas antiguas eliminadas.`);
  return { ok: true, deleted: result.deletedRows, ...result };
}

export async function imagesForEvent(eventId) {
  const { data, error } = await db()
    .from('ce_ticket_images')
    .select('image_key,public_url,pathname,storage_path')
    .eq('event_id', text(eventId));
  if (error) throw error;
  const images = {};
  for (const img of data || []) {
    images[img.image_key] = {
      key: img.image_key,
      url: img.public_url || img.pathname || img.storage_path,
      pathname: img.pathname || img.public_url || img.storage_path
    };
  }
  return images;
}

export async function health() {
  const client = db();
  const tables = {};
  let ok = true;
  for (const table of TABLES) {
    const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
    tables[table] = error ? { ok: false, error: error.message } : { ok: true, count: count ?? 0 };
    if (error) ok = false;
  }
  const { data: bucket, error: bucketError } = await client.storage.getBucket(BUCKET);
  if (bucketError) ok = false;
  return {
    ok,
    backend: 'supabase-real-tables',
    bucket: bucketError ? { ok: false, name: BUCKET, error: bucketError.message } : { ok: true, name: bucket?.name || BUCKET },
    tables
  };
}

export async function localFileToDataUrl(file) {
  const contentType = mime.lookup(file) || 'image/jpeg';
  const buffer = await fs.readFile(file);
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

export function findLocalUpload(root, ref) {
  if (!ref) return null;
  let rel = typeof ref === 'object' ? (ref.pathname || ref.url || ref.href || '') : text(ref);
  if (/^https?:\/\//.test(rel)) {
    try { rel = new URL(rel).pathname; } catch {}
  }
  rel = decodeURIComponent(rel).replace(/^\//, '');
  const candidates = [
    path.join(root, rel),
    path.join(root, 'public', rel),
    path.join(root, rel.replace(/^uploads\//, 'uploads/'))
  ];
  for (const candidate of candidates) {
    if (fsSync.existsSync(candidate) && fsSync.statSync(candidate).isFile()) return candidate;
  }
  return null;
}
