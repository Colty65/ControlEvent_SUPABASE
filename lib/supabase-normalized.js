import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import mime from 'mime-types';
import { BUCKET, getSupabaseAdmin } from './supabase.js';

export const COLLECTIONS = ['eventos', 'personas', 'tiendas', 'productos', 'colaboradores', 'compras'];
export const META_KEYS = ['selectedEventId', 'comprasSort', 'summaryTiendaSort'];
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
const PROTECTED_EMPTY_REPLACE_COLLECTIONS = new Set(['colaboradores']);

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

async function saveImagesFromState(state) {
  const images = { ...(state.ticketImages || {}) };
  for (const [key, ref] of Object.entries(state.ticketImageRefs || {})) {
    if (!images[key]) images[key] = ref;
  }

  const liveIndex = liveImageIndexForState(state || {});
  const rows = [];
  for (const [rawKey, value] of Object.entries(images)) {
    if (!value) continue;
    const key = liveCanonicalImageKey(rawKey, value, liveIndex);
    // v8.2: solo se persisten fotos que apuntan a datos vivos actuales: ingreso existente o TKxx existente.
    // Así, tras limpiar el servidor, no vuelven a grabarse aliases antiguos ni referencias huérfanas.
    if (!key) continue;
    rows.push(isDataUrl(value) ? await uploadDataUrlImage(key, value) : refToImageRow(key, value));
  }

  const clean = rows.filter(Boolean);
  if (!clean.length) return 0;
  const { error } = await db().from('ce_ticket_images').upsert(clean, { onConflict: 'image_key' });
  if (error) throw error;
  return clean.length;
}

export async function stateFromDb() {
  const state = {};
  for (const collection of COLLECTIONS) {
    const [table, , , fromDb] = tableMap[collection];
    state[collection] = fromRows(await selectAll(table), fromDb);
  }

  const meta = await selectAll('ce_meta', 'key');
  for (const row of meta) state[row.key] = row.value;

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
    await replaceTable(table, pk, rows);
  }

  const metaRows = META_KEYS
    .filter(key => Object.prototype.hasOwnProperty.call(state, key))
    .map(key => ({ key, value: state[key] ?? null }));
  if (metaRows.length) {
    const { error } = await db().from('ce_meta').upsert(metaRows, { onConflict: 'key' });
    if (error) throw error;
  }
  await saveImagesFromState(state);
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

export async function uploadTicketImage({ eventId, key, dataUrl }) {
  const row = await uploadDataUrlImage(ticketImageKeyForEvent(eventId, key), dataUrl);
  const { error } = await db().from('ce_ticket_images').upsert(row, { onConflict: 'image_key' });
  if (error) throw error;
  return { key: row.image_key, url: row.public_url, pathname: row.pathname };
}

export async function deleteTicketImage({ eventId, key }) {
  const imageKey = ticketImageKeyForEvent(eventId, key);
  const { data } = await db().from('ce_ticket_images').select('storage_path').eq('image_key', imageKey).maybeSingle();
  if (data?.storage_path) await db().storage.from(BUCKET).remove([data.storage_path]);
  const { error } = await db().from('ce_ticket_images').delete().eq('image_key', imageKey);
  if (error) throw error;
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
