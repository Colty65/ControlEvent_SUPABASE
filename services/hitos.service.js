import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '../lib/supabase.js';

const HITO_TABLE = 'ce_hitos';
const LG_TABLE = 'ce_lg';

function db(){ return getSupabaseAdmin(); }
function text(value){ return value == null ? '' : String(value).trim(); }
function bool(value){ return value === true || String(value).toLowerCase() === 'true' || value === 1 || value === '1'; }
function integer(value, fallback = 0){ const n = Number(value); return Number.isFinite(n) ? Math.trunc(n) : fallback; }
function dateOrNull(value){ const s = text(value); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; }
function nowIso(){ return new Date().toISOString(); }
function currentBusinessDate(){
  try{
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }catch(_){ return new Date().toISOString().slice(0, 10); }
}
function normalizeType(value){ return text(value).toUpperCase() === 'HITO' ? 'HITO' : 'LG'; }
function normalizeMode(value){ return text(value).toUpperCase() === 'HITO_COMPLETO' ? 'HITO_COMPLETO' : 'LG'; }
function refKey(ref){ return `${normalizeType(ref?.tipo)}:${text(ref?.id)}`; }
function currentRef(id){ return { tipo: 'LG', id: text(id) }; }

function normIdentity(value){
  const s = text(value);
  return (s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s).toLowerCase().replace(/[^a-z0-9ñ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function normalizeActor(actor = {}){
  const raw = actor && typeof actor === 'object' ? actor : {};
  return {
    nivel: text(raw.nivel || raw.Nivel).toUpperCase(),
    identificacion: text(raw.identificacion || raw.Identificacion),
    nombre: text(raw.nombre || raw.Nombre),
    responsableId: text(raw.responsableId || raw.responsable_id),
    responsableNombre: text(raw.responsableNombre || raw.responsable_nombre)
  };
}
function actorCanManageAll(actor){ return ['GD','RW'].includes(normalizeActor(actor).nivel); }
function actorIsRo(actor){ return normalizeActor(actor).nivel === 'RO'; }
function requireKnownActor(actor){
  const a = normalizeActor(actor);
  if(!['GD','RW','RO'].includes(a.nivel)) fail('No se ha podido identificar el nivel del usuario para modificar Control de Hitos.', 403, 'HITOS_ACTOR_REQUIRED');
  return a;
}
function requireFullAccess(actor){
  const a = requireKnownActor(actor);
  if(!actorCanManageAll(a)) fail('Los usuarios RO no pueden crear, modificar ni eliminar Hitos. Sí pueden gestionar las LG de su responsabilidad.', 403, 'HITOS_HITO_FORBIDDEN');
  return a;
}
function actorOwnsLg(actor, row){
  const a = normalizeActor(actor);
  if(actorCanManageAll(a)) return true;
  if(!actorIsRo(a) || !row) return false;
  const rowId = text(row.responsableId || row.responsable_id);
  if(a.responsableId && rowId && a.responsableId === rowId) return true;
  const rowName = normIdentity(row.responsableNombre || row.responsable_nombre);
  const names = [a.responsableNombre, a.nombre, a.identificacion].map(normIdentity).filter(Boolean);
  return !!rowName && names.includes(rowName);
}
function enforceLgActor(actor, next, old = null){
  const a = requireKnownActor(actor);
  if(actorCanManageAll(a)) return next;
  if(old && !actorOwnsLg(a, old)) fail('Solo puedes modificar LG asignadas a tu responsabilidad.', 403, 'HITOS_LG_NOT_OWNED');
  if(!a.responsableId && !text(a.responsableNombre || a.nombre || a.identificacion)) fail('No se ha podido resolver tu usuario para asignarte la LG.', 403, 'HITOS_RO_WITHOUT_IDENTITY');
  next.responsableId = a.responsableId || '';
  next.responsableNombre = a.responsableNombre || a.nombre || a.identificacion;
  return next;
}

function normalizeRefs(value){
  const input = Array.isArray(value) ? value : [];
  const map = new Map();
  for(const raw of input){
    if(!raw) continue;
    let tipo = '';
    let id = '';
    if(typeof raw === 'string'){
      const match = raw.match(/^(HITO|LG)\s*:\s*(.+)$/i);
      if(match){ tipo = match[1]; id = match[2]; }
      else { tipo = 'LG'; id = raw; }
    }else{
      tipo = raw.tipo || raw.type || raw.kind;
      id = raw.id || raw.value;
    }
    tipo = normalizeType(tipo);
    id = text(id);
    if(!id) continue;
    map.set(`${tipo}:${id}`, { tipo, id });
  }
  return [...map.values()];
}

function addRef(list, ref){
  const refs = normalizeRefs(list);
  const key = refKey(ref);
  if(!refs.some(item => refKey(item) === key)) refs.push({ tipo: normalizeType(ref.tipo), id: text(ref.id) });
  return refs;
}
function removeRef(list, ref){
  const key = refKey(ref);
  return normalizeRefs(list).filter(item => refKey(item) !== key);
}
function stripRefs(list, keys){
  return normalizeRefs(list).filter(item => !keys.has(refKey(item)));
}

function canonicalizeDependencyGraph(hitoRows = [], lgRows = []){
  const hitos = new Map(arrSafe(hitoRows).map(row => [text(row.id), { ...row }]));
  const lgs = new Map(arrSafe(lgRows).map(row => [text(row.id), {
    ...row,
    dependenciasPrevias: normalizeRefs(row.dependenciasPrevias),
    dependenciasPosteriores: []
  }]));

  for(const row of lgs.values()){
    const own = refKey(currentRef(row.id));
    row.dependenciasPrevias = normalizeRefs(row.dependenciasPrevias).filter(ref => {
      if(refKey(ref) === own) return false;
      if(ref.tipo === 'HITO') return hitos.has(ref.id) && ref.id !== text(row.hitoId);
      return lgs.has(ref.id);
    });
  }

  // Saneado de datos heredados: versiones anteriores permitían editar también las
  // “posteriores” y podían terminar creando A→B y B→A. Conservamos primero la relación
  // cronológicamente coherente y omitimos cualquier referencia que cierre un ciclo.
  const adjacency = new Map([...lgs.keys()].map(id => [id, new Set()]));
  const warnings = [];
  const candidates = [];
  const dateKey = row => dateOrNull(row?.fechaMinima) || dateOrNull(row?.fechaMaxima) || '9999-12-31';
  for(const row of lgs.values()){
    normalizeRefs(row.dependenciasPrevias).forEach((ref, index) => {
      const targets = targetsForRef(ref, lgs).filter(id => id !== row.id);
      const laterTargets = targets.filter(id => dateKey(lgs.get(id)) > dateKey(row));
      candidates.push({ row, ref, index, targets, chronologyPenalty: laterTargets.length ? 1 : 0 });
    });
    row.dependenciasPrevias = [];
  }
  candidates.sort((a,b) => a.chronologyPenalty - b.chronologyPenalty
    || dateKey(a.row).localeCompare(dateKey(b.row))
    || integer(a.row.orden,0) - integer(b.row.orden,0)
    || a.index - b.index);
  function hasPath(from, to){
    if(from === to) return true;
    const seen = new Set();
    const stack = [from];
    while(stack.length){
      const id = stack.pop();
      if(seen.has(id)) continue;
      seen.add(id);
      for(const next of adjacency.get(id) || []){
        if(next === to) return true;
        if(!seen.has(next)) stack.push(next);
      }
    }
    return false;
  }
  for(const candidate of candidates){
    const createsCycle = candidate.targets.some(targetId => hasPath(candidate.row.id, targetId));
    if(createsCycle){
      warnings.push({
        lgId: candidate.row.id,
        descripcion: candidate.row.descripcion,
        referencia: { ...candidate.ref },
        motivo: 'Dependencia circular heredada omitida del resultado.'
      });
      continue;
    }
    candidate.row.dependenciasPrevias = addRef(candidate.row.dependenciasPrevias, candidate.ref);
    candidate.targets.forEach(targetId => adjacency.get(targetId)?.add(candidate.row.id));
  }

  // Fuente canónica: dependencias_previas. Las posteriores se derivan siempre de ella.
  // Así desaparecen relaciones antiguas/huérfanas guardadas solo como “posteriores”.
  for(const row of lgs.values()){
    for(const ref of row.dependenciasPrevias){
      for(const targetId of targetsForRef(ref, lgs)){
        if(targetId === row.id) continue;
        const target = lgs.get(targetId);
        if(target) target.dependenciasPosteriores = addRef(target.dependenciasPosteriores, currentRef(row.id));
      }
    }
  }
  return { hitos: [...hitos.values()], lgs: [...lgs.values()], dependencyWarnings: warnings };
}
function arrSafe(value){ return Array.isArray(value) ? value : []; }

function friendlyDbError(error){
  const msg = text(error?.message || error);
  if(/ce_hitos|ce_lg|relation .* does not exist|schema cache|pgrst205|42p01/i.test(msg)){
    const err = new Error('El módulo Control de Hitos todavía no está creado en Supabase. Ejecuta ControlEvent_SQL_V23_R2_HITOS.sql en el SQL Editor y vuelve a abrir la ventana.');
    err.status = 503;
    err.code = 'HITOS_SCHEMA_MISSING';
    return err;
  }
  return error;
}
function fail(message, status = 400, code = 'HITOS_VALIDATION'){
  const err = new Error(message);
  err.status = status;
  err.code = code;
  throw err;
}

function hitoFromDb(row){
  return {
    id: row.id,
    eventId: row.event_id,
    nombreHito: row.nombre_hito || '',
    descripcion: row.descripcion || '',
    fechaMinima: row.fecha_minima || '',
    fechaMaxima: row.fecha_maxima || '',
    responsableId: row.responsable_id || '',
    responsableNombre: row.responsable_nombre || '',
    orden: Number(row.orden || 0),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || ''
  };
}
function lgFromDb(row){
  return {
    id: row.id,
    eventId: row.event_id,
    hitoId: row.hito_id,
    descripcion: row.descripcion || '',
    fechaMinima: row.fecha_minima || '',
    fechaMaxima: row.fecha_maxima || '',
    notas: row.notas || '',
    dependenciaTipo: row.dependencia_tipo || 'LG',
    dependenciasPrevias: normalizeRefs(row.dependencias_previas),
    dependenciasPosteriores: normalizeRefs(row.dependencias_posteriores),
    responsableId: row.responsable_id || '',
    responsableNombre: row.responsable_nombre || '',
    cumplida: !!row.cumplida,
    cumplidaAt: row.cumplida_at || '',
    orden: Number(row.orden || 0),
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || ''
  };
}
function lgToDb(row){
  return {
    id: text(row.id),
    event_id: text(row.eventId),
    hito_id: text(row.hitoId),
    descripcion: text(row.descripcion),
    fecha_minima: dateOrNull(row.fechaMinima),
    fecha_maxima: dateOrNull(row.fechaMaxima),
    notas: text(row.notas) || null,
    dependencia_tipo: normalizeMode(row.dependenciaTipo),
    dependencias_previas: normalizeRefs(row.dependenciasPrevias),
    dependencias_posteriores: normalizeRefs(row.dependenciasPosteriores),
    responsable_id: text(row.responsableId) || null,
    responsable_nombre: text(row.responsableNombre) || null,
    cumplida: !!row.cumplida,
    cumplida_at: row.cumplida ? (row.cumplidaAt || nowIso()) : null,
    orden: integer(row.orden, 0),
    updated_at: nowIso()
  };
}

async function selectEventRows(eventId){
  const ev = text(eventId);
  if(!ev) fail('Selecciona un evento antes de abrir el Control de Hitos.');
  try{
    const [{ data: hitos, error: hError }, { data: lgs, error: lError }] = await Promise.all([
      db().from(HITO_TABLE).select('*').eq('event_id', ev).order('orden').order('created_at'),
      db().from(LG_TABLE).select('*').eq('event_id', ev).order('orden').order('created_at')
    ]);
    if(hError) throw hError;
    if(lError) throw lError;
    return canonicalizeDependencyGraph(
      (hitos || []).map(hitoFromDb),
      (lgs || []).map(lgFromDb)
    );
  }catch(error){ throw friendlyDbError(error); }
}

function targetsForRef(ref, lgs){
  const type = normalizeType(ref?.tipo);
  const id = text(ref?.id);
  if(!id) return [];
  if(type === 'LG') return lgs.has(id) ? [id] : [];
  return [...lgs.values()].filter(row => row.hitoId === id).map(row => row.id);
}

function validateRefs(row, hitos, lgs){
  const own = refKey(currentRef(row.id));
  const parentHito = text(row.hitoId);
  for(const ref of [...normalizeRefs(row.dependenciasPrevias), ...normalizeRefs(row.dependenciasPosteriores)]){
    if(refKey(ref) === own) fail('Una LG no puede depender de sí misma.', 409, 'HITOS_SELF_DEPENDENCY');
    if(ref.tipo === 'HITO'){
      if(!hitos.has(ref.id)) fail('La dependencia hace referencia a un Hito que ya no existe.', 409, 'HITOS_DEPENDENCY_NOT_FOUND');
      if(ref.id === parentHito) fail('Una LG no puede depender de su propio Hito completo.', 409, 'HITOS_OWN_PARENT_DEPENDENCY');
    }else if(!lgs.has(ref.id)){
      fail('La dependencia hace referencia a una LG que ya no existe.', 409, 'HITOS_DEPENDENCY_NOT_FOUND');
    }
  }
}

function dependencySatisfied(ref, lgs){
  if(normalizeType(ref?.tipo) === 'LG') return !!lgs.get(text(ref?.id))?.cumplida;
  const children = [...lgs.values()].filter(row => row.hitoId === text(ref?.id));
  return children.length > 0 && children.every(row => row.cumplida);
}
function pendingDependencyLabels(row, hitos, lgs){
  const pending = [];
  for(const ref of normalizeRefs(row.dependenciasPrevias)){
    if(dependencySatisfied(ref, lgs)) continue;
    if(ref.tipo === 'HITO') pending.push(`Hito completo: ${hitos.get(ref.id)?.nombreHito || ref.id}`);
    else pending.push(`LG: ${lgs.get(ref.id)?.descripcion || ref.id}`);
  }
  return pending;
}

function cascadeReopenUnsatisfied(lgs, hitos, changed, protectedId = ''){
  let reopened = 0;
  let again = true;
  while(again){
    again = false;
    for(const row of lgs.values()){
      if(!row.cumplida || row.id === protectedId) continue;
      if(!pendingDependencyLabels(row, hitos, lgs).length) continue;
      row.cumplida = false;
      row.cumplidaAt = '';
      changed.add(row.id);
      reopened += 1;
      again = true;
    }
  }
  return reopened;
}

function assertNoCycles(lgs){
  const adjacency = new Map([...lgs.keys()].map(id => [id, new Set()]));
  for(const row of lgs.values()){
    for(const ref of normalizeRefs(row.dependenciasPrevias)){
      for(const dependencyId of targetsForRef(ref, lgs)){
        if(dependencyId === row.id) fail('La dependencia genera un ciclo con la propia LG.', 409, 'HITOS_DEPENDENCY_CYCLE');
        adjacency.get(dependencyId)?.add(row.id);
      }
    }
  }
  const state = new Map();
  const stack = [];
  function visit(id){
    const status = state.get(id) || 0;
    if(status === 1){
      const start = stack.indexOf(id);
      const cycle = [...stack.slice(start), id];
      fail(`Se ha detectado una dependencia circular entre LG: ${cycle.join(' → ')}.`, 409, 'HITOS_DEPENDENCY_CYCLE');
    }
    if(status === 2) return;
    state.set(id, 1);
    stack.push(id);
    for(const next of adjacency.get(id) || []) visit(next);
    stack.pop();
    state.set(id, 2);
  }
  for(const id of adjacency.keys()) visit(id);
}

async function recalculateHitoDates(eventId, hitoIds = []){
  const ev = text(eventId);
  const ids = [...new Set(hitoIds.map(text).filter(Boolean))];
  if(!ids.length) return;
  for(const hitoId of ids){
    const { data, error } = await db().from(LG_TABLE).select('fecha_minima,fecha_maxima').eq('event_id', ev).eq('hito_id', hitoId);
    if(error) throw friendlyDbError(error);
    const mins = (data || []).map(row => row.fecha_minima).filter(Boolean).sort();
    const maxs = (data || []).map(row => row.fecha_maxima).filter(Boolean).sort();
    const { error: updateError } = await db().from(HITO_TABLE).update({
      fecha_minima: mins[0] || null,
      fecha_maxima: maxs[maxs.length - 1] || null,
      updated_at: nowIso()
    }).eq('id', hitoId).eq('event_id', ev);
    if(updateError) throw friendlyDbError(updateError);
  }
}

export async function listHitos(eventId){
  const ev = text(eventId);
  const data = await selectEventRows(ev);
  const lgByHito = new Map();
  for(const lg of data.lgs){
    if(!lgByHito.has(lg.hitoId)) lgByHito.set(lg.hitoId, []);
    lgByHito.get(lg.hitoId).push(lg);
  }
  const hitos = data.hitos.map(hito => {
    const lineas = lgByHito.get(hito.id) || [];
    return {
      ...hito,
      totalLg: lineas.length,
      lgCumplidas: lineas.filter(row => row.cumplida).length,
      cumplido: lineas.length > 0 && lineas.every(row => row.cumplida)
    };
  });
  return { ok: true, eventId: ev, hitos, lgs: data.lgs, dependencyWarnings: arrSafe(data.dependencyWarnings) };
}

export async function listAllHitosState(){
  try{
    const [{ data: hitos, error: hError }, { data: lgs, error: lError }] = await Promise.all([
      db().from(HITO_TABLE).select('*').order('event_id').order('orden').order('created_at'),
      db().from(LG_TABLE).select('*').order('event_id').order('orden').order('created_at')
    ]);
    if(hError) throw hError;
    if(lError) throw lError;
    const hitoRows = (hitos || []).map(hitoFromDb);
    const lgRows = (lgs || []).map(lgFromDb);
    const eventIds = [...new Set([...hitoRows.map(row => row.eventId), ...lgRows.map(row => row.eventId)].filter(Boolean))];
    const out = { hitos: [], lgs: [] };
    for(const eventId of eventIds){
      const canonical = canonicalizeDependencyGraph(
        hitoRows.filter(row => row.eventId === eventId),
        lgRows.filter(row => row.eventId === eventId)
      );
      out.hitos.push(...canonical.hitos);
      out.lgs.push(...canonical.lgs);
    }
    return out;
  }catch(error){ throw friendlyDbError(error); }
}

export async function saveHito(id, payload = {}, actor = {}){
  requireFullAccess(actor);
  const requestedId = text(id || payload.id);
  const rowId = requestedId || randomUUID();
  const eventId = text(payload.eventId || payload.event_id);
  const nombre = text(payload.nombreHito || payload.nombre_hito);
  if(!eventId) fail('Falta el evento del Hito.');
  if(!nombre) fail('El NombreHito es obligatorio.');
  if(requestedId){
    try{
      const { data: existing, error: existingError } = await db().from(HITO_TABLE).select('id,event_id').eq('id', requestedId).maybeSingle();
      if(existingError) throw existingError;
      if(existing?.id && text(existing.event_id) !== eventId) fail('El Hito pertenece a otro evento y no puede trasladarse mediante esta operación.', 409, 'HITOS_EVENT_MISMATCH');
    }catch(error){ throw friendlyDbError(error); }
  }
  const row = {
    id: rowId,
    event_id: eventId,
    nombre_hito: nombre,
    descripcion: text(payload.descripcion) || null,
    responsable_id: text(payload.responsableId || payload.responsable_id) || null,
    responsable_nombre: text(payload.responsableNombre || payload.responsable_nombre) || null,
    orden: integer(payload.orden, 0),
    updated_at: nowIso()
  };
  try{
    const { data, error } = await db().from(HITO_TABLE).upsert(row, { onConflict: 'id' }).select('*').single();
    if(error) throw error;
    await recalculateHitoDates(eventId, [rowId]);
    const { data: fresh, error: freshError } = await db().from(HITO_TABLE).select('*').eq('id', rowId).single();
    if(freshError) throw freshError;
    return { ok: true, item: hitoFromDb(fresh || data) };
  }catch(error){ throw friendlyDbError(error); }
}

function cloneLgMap(lgs){
  return new Map(lgs.map(row => [row.id, {
    ...row,
    dependenciasPrevias: normalizeRefs(row.dependenciasPrevias),
    dependenciasPosteriores: normalizeRefs(row.dependenciasPosteriores)
  }]));
}

export async function saveLg(id, payload = {}, actor = {}){
  const requestedId = text(id || payload.id);
  const rowId = requestedId || randomUUID();
  const eventId = text(payload.eventId || payload.event_id);
  if(!eventId) fail('Falta el evento de la LG.');
  if(requestedId){
    try{
      const { data: existingGlobal, error: existingGlobalError } = await db().from(LG_TABLE).select('id,event_id').eq('id', requestedId).maybeSingle();
      if(existingGlobalError) throw existingGlobalError;
      if(existingGlobal?.id && text(existingGlobal.event_id) !== eventId) fail('La LG pertenece a otro evento y no puede trasladarse mediante esta operación.', 409, 'HITOS_EVENT_MISMATCH');
    }catch(error){ throw friendlyDbError(error); }
  }
  const snapshot = await selectEventRows(eventId);
  const hitos = new Map(snapshot.hitos.map(row => [row.id, row]));
  const lgs = cloneLgMap(snapshot.lgs);
  const old = lgs.get(rowId) || null;
  const hitoId = text(payload.hitoId || payload.hito_id || old?.hitoId);
  if(!hitoId || !hitos.has(hitoId)) fail('Selecciona un Hito válido para la LG.');
  const descripcion = text(payload.descripcion ?? old?.descripcion);
  if(!descripcion) fail('La descripción de la LG es obligatoria.');
  const fechaMinima = dateOrNull(payload.fechaMinima ?? payload.fecha_minima ?? old?.fechaMinima);
  const fechaMaxima = dateOrNull(payload.fechaMaxima ?? payload.fecha_maxima ?? old?.fechaMaxima);
  if(fechaMinima && fechaMaxima && fechaMinima > fechaMaxima) fail('La fecha mínima de la LG no puede ser posterior a su fecha máxima.');

  const next = {
    id: rowId,
    eventId,
    hitoId,
    descripcion,
    fechaMinima: fechaMinima || '',
    fechaMaxima: fechaMaxima || '',
    notas: text(payload.notas ?? old?.notas),
    dependenciaTipo: normalizeMode(payload.dependenciaTipo ?? payload.dependencia_tipo ?? old?.dependenciaTipo),
    // Fuente única y auditable: el usuario selecciona SOLO dependencias previas.
    // Las posteriores se calculan siempre a partir de ellas; no se aceptan desde el cliente.
    dependenciasPrevias: normalizeRefs(payload.dependenciasPrevias ?? payload.dependencias_previas ?? old?.dependenciasPrevias),
    dependenciasPosteriores: [],
    responsableId: text(payload.responsableId ?? payload.responsable_id ?? old?.responsableId),
    responsableNombre: text(payload.responsableNombre ?? payload.responsable_nombre ?? old?.responsableNombre),
    cumplida: payload.cumplida === undefined ? !!old?.cumplida : bool(payload.cumplida),
    cumplidaAt: payload.cumplidaAt || payload.cumplida_at || old?.cumplidaAt || '',
    orden: integer(payload.orden ?? old?.orden, 0)
  };
  enforceLgActor(actor, next, old);

  const ownRef = currentRef(rowId);
  next.dependenciasPrevias = removeRef(next.dependenciasPrevias, ownRef);
  next.dependenciasPosteriores = removeRef(next.dependenciasPosteriores, ownRef);
  lgs.set(rowId, next);
  validateRefs(next, hitos, lgs);

  const changed = new Set([rowId, ...arrSafe(snapshot.dependencyWarnings).map(item => text(item?.lgId)).filter(Boolean)]);
  const previousPosteriorById = new Map(snapshot.lgs.map(row => [row.id, JSON.stringify(normalizeRefs(row.dependenciasPosteriores))]));

  // Recalcular TODAS las posteriores desde las previas canónicas. Nunca se crea una
  // dependencia previa por haber quedado marcada una posterior en otro formulario.
  for(const row of lgs.values()) row.dependenciasPosteriores = [];
  for(const row of lgs.values()){
    for(const ref of normalizeRefs(row.dependenciasPrevias)){
      for(const targetId of targetsForRef(ref, lgs)){
        if(targetId === row.id) continue;
        const target = lgs.get(targetId);
        if(target) target.dependenciasPosteriores = addRef(target.dependenciasPosteriores, currentRef(row.id));
      }
    }
  }
  for(const row of lgs.values()){
    if((previousPosteriorById.get(row.id) || '[]') !== JSON.stringify(normalizeRefs(row.dependenciasPosteriores))) changed.add(row.id);
  }

  for(const row of lgs.values()) validateRefs(row, hitos, lgs);
  assertNoCycles(lgs);
  if(next.cumplida){
    const businessDate = currentBusinessDate();
    if(next.fechaMinima && businessDate < next.fechaMinima){
      fail(`No se puede marcar la LG como cumplida antes de su fecha mínima (${next.fechaMinima}).`, 409, 'HITOS_BEFORE_START_DATE');
    }
    if(next.fechaMaxima && businessDate > next.fechaMaxima){
      fail(`No se puede marcar la LG como cumplida después de su fecha máxima (${next.fechaMaxima}). Modifica primero el plazo si la gestión sigue vigente.`, 409, 'HITOS_AFTER_END_DATE');
    }
    const pending = pendingDependencyLabels(next, hitos, lgs);
    if(pending.length) fail(`No se puede marcar la LG como cumplida. Dependencias previas pendientes: ${pending.join('; ')}.`, 409, 'HITOS_PREVIOUS_DEPENDENCIES_PENDING');
    if(!old?.cumplida) next.cumplidaAt = nowIso();
  }else{
    next.cumplidaAt = '';
  }
  const reopenedDependents = cascadeReopenUnsatisfied(lgs, hitos, changed, next.cumplida ? rowId : '');

  const rows = [...changed].map(targetId => lgToDb(lgs.get(targetId))).filter(Boolean);
  try{
    const { error } = await db().from(LG_TABLE).upsert(rows, { onConflict: 'id' });
    if(error) throw error;
    await recalculateHitoDates(eventId, [...new Set([hitoId, old?.hitoId].filter(Boolean))]);
    const { data, error: selectError } = await db().from(LG_TABLE).select('*').eq('id', rowId).single();
    if(selectError) throw selectError;
    return { ok: true, item: lgFromDb(data), reciprocalUpdates: Math.max(0, changed.size - 1), reopenedDependents };
  }catch(error){ throw friendlyDbError(error); }
}

export async function toggleLg(id, cumplida, actor = {}){
  const rowId = text(id);
  if(!rowId) fail('Falta la LG que se quiere actualizar.');
  try{
    const { data, error } = await db().from(LG_TABLE).select('*').eq('id', rowId).maybeSingle();
    if(error) throw error;
    if(!data?.id) fail('La LG ya no existe.', 404, 'HITOS_LG_NOT_FOUND');
    const current = lgFromDb(data);
    const snapshot = await selectEventRows(current.eventId);
    const canonical = snapshot.lgs.find(row => row.id === rowId) || current;
    return saveLg(rowId, { ...canonical, cumplida: bool(cumplida) }, actor);
  }catch(error){ throw friendlyDbError(error); }
}

export async function deleteLg(id, actor = {}){
  const rowId = text(id);
  if(!rowId) fail('Falta la LG que se quiere eliminar.');
  try{
    const { data: existing, error: existingError } = await db().from(LG_TABLE).select('*').eq('id', rowId).maybeSingle();
    if(existingError) throw existingError;
    if(!existing?.id) return { ok: true, deleted: 0 };
    const current = lgFromDb(existing);
    const acting = requireKnownActor(actor);
    if(!actorOwnsLg(acting, current)) fail('Solo puedes eliminar LG asignadas a tu responsabilidad.', 403, 'HITOS_LG_NOT_OWNED');
    const snapshot = await selectEventRows(current.eventId);
    const keys = new Set([refKey({ tipo: 'LG', id: rowId })]);
    const updates = snapshot.lgs.filter(row => row.id !== rowId).map(row => ({
      ...row,
      dependenciasPrevias: stripRefs(row.dependenciasPrevias, keys),
      dependenciasPosteriores: stripRefs(row.dependenciasPosteriores, keys)
    })).filter((row, index) => {
      const original = snapshot.lgs.filter(item => item.id !== rowId)[index];
      return JSON.stringify(row.dependenciasPrevias) !== JSON.stringify(original.dependenciasPrevias) || JSON.stringify(row.dependenciasPosteriores) !== JSON.stringify(original.dependenciasPosteriores);
    });
    if(updates.length){
      const { error: updateError } = await db().from(LG_TABLE).upsert(updates.map(lgToDb), { onConflict: 'id' });
      if(updateError) throw updateError;
    }
    const { error: deleteError } = await db().from(LG_TABLE).delete().eq('id', rowId);
    if(deleteError) throw deleteError;
    await recalculateHitoDates(current.eventId, [current.hitoId]);
    return { ok: true, deleted: 1, reciprocalUpdates: updates.length };
  }catch(error){ throw friendlyDbError(error); }
}

export async function deleteHito(id, actor = {}){
  requireFullAccess(actor);
  const hitoId = text(id);
  if(!hitoId) fail('Falta el Hito que se quiere eliminar.');
  try{
    const { data: hito, error: hitoError } = await db().from(HITO_TABLE).select('*').eq('id', hitoId).maybeSingle();
    if(hitoError) throw hitoError;
    if(!hito?.id) return { ok: true, deleted: 0 };
    const snapshot = await selectEventRows(hito.event_id);
    const childIds = snapshot.lgs.filter(row => row.hitoId === hitoId).map(row => row.id);
    const keys = new Set([refKey({ tipo: 'HITO', id: hitoId }), ...childIds.map(childId => refKey({ tipo: 'LG', id: childId }))]);
    const updates = snapshot.lgs.filter(row => row.hitoId !== hitoId).map(row => ({
      ...row,
      dependenciasPrevias: stripRefs(row.dependenciasPrevias, keys),
      dependenciasPosteriores: stripRefs(row.dependenciasPosteriores, keys)
    })).filter((row, index) => {
      const original = snapshot.lgs.filter(item => item.hitoId !== hitoId)[index];
      return JSON.stringify(row.dependenciasPrevias) !== JSON.stringify(original.dependenciasPrevias) || JSON.stringify(row.dependenciasPosteriores) !== JSON.stringify(original.dependenciasPosteriores);
    });
    if(updates.length){
      const { error: updateError } = await db().from(LG_TABLE).upsert(updates.map(lgToDb), { onConflict: 'id' });
      if(updateError) throw updateError;
    }
    const { error: deleteError } = await db().from(HITO_TABLE).delete().eq('id', hitoId);
    if(deleteError) throw deleteError;
    return { ok: true, deleted: 1, deletedLg: childIds.length, reciprocalUpdates: updates.length };
  }catch(error){ throw friendlyDbError(error); }
}
