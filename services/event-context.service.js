/* ControlEvent v11_3_2_prod - Motor seguro de contexto para Zuzu / Analítica libre.
   SOLO LECTURA: prepara datos completos, calculados y legibles. Gemini NO ejecuta SQL ni toca BBDD. */

function text(value) { return value == null ? '' : String(value); }
function trim(value) { return text(value).trim(); }
function num(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(text(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function round(value, digits = 2) { return Number(num(value).toFixed(digits)); }
function arr(value) { return Array.isArray(value) ? value : []; }
function norm(value) {
  const s = text(value);
  return (s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
const COMMON_STOP = new Set([
  'de','del','la','el','las','los','y','e','o','u','vs','vss','contra','con','sin','para','por','un','una','unos','unas',
  'jornada','jornadas','solidaria','solidarias','evento','eventos','dime','dame','saca','sacame','haz','hacer','quiero',
  'cuanto','cuantos','cuanta','cuantas','cual','cuales','total','totales','detalle','detalles','lista','listado','grafica','graficas',
  'analiza','analisis','comparar','compara','comparativa','entre','mas','menos','ultimo','ultima','reciente','actual','gestion',
  'producto','productos','articulo','articulos','ticket','tickets','tk','compra','compras','donacion','donaciones','ingreso','ingresos',
  'responsable','responsables','tienda','tiendas','segmento','destino','precio','importe','coste','valor','valoracion','cantidad','unidades'
]);
function words(value, opts = {}) {
  const min = opts.min || 3;
  const keepStop = opts.keepStop === true;
  return norm(value).split(' ').filter(w => w.length >= min && (keepStop || !COMMON_STOP.has(w)));
}
function byId(rows) {
  const out = new Map();
  arr(rows).forEach(row => { const id = trim(row?.id); if (id) out.set(id, row); });
  return out;
}
function add(map, key, value) {
  const k = trim(key) || 'Sin clasificar';
  map.set(k, num(map.get(k)) + num(value));
}
function addQtyCost(map, key, qty, cost) {
  const k = trim(key) || 'Sin clasificar';
  const old = map.get(k) || { unidades: 0, importe: 0 };
  old.unidades += num(qty);
  old.importe += num(cost);
  map.set(k, old);
}
function topN(map, n = 50) {
  return [...map.entries()].sort((a, b) => num(b[1]) - num(a[1])).slice(0, n).map(([nombre, valor]) => ({ nombre, valor: round(valor, 2) }));
}
function topQtyCost(map, sortBy = 'importe', n = 50) {
  return [...map.entries()]
    .sort((a, b) => num(b[1]?.[sortBy]) - num(a[1]?.[sortBy]))
    .slice(0, n)
    .map(([nombre, v]) => ({ nombre, unidades: round(v.unidades, 3), importe: round(v.importe, 2) }));
}
function valueOfLine(row) { return round(num(row?.unidades) * num(row?.precio), 2); }
function firstNonEmpty(...values) {
  for (const value of values) {
    const s = trim(value);
    if (s) return s;
  }
  return '';
}
function ticketText(row) { return firstNonEmpty(row?.ticketDonacion, row?.ticket_donacion, row?.ticket, row?.ticketOtrosGastos, row?.ticket_otros_gastos); }
function ticketToken(value) { const m = trim(value).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i); return m ? m[0].replace(/\s+/g, '').toUpperCase() : ''; }
function isDonationTicket(value) { return /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(trim(value)); }
function isPendingTicket(value) { return /PTE\.?\s*COMPRA|PENDIENTE/i.test(trim(value)); }
function lineKind(value) {
  const raw = trim(value);
  if (isDonationTicket(raw)) return 'DONACION_PRODUCTO';
  if (isPendingTicket(raw)) return 'PTE_COMPRA';
  return 'COMPRA_REAL';
}
function docCode(value) { const m = text(value).toUpperCase().match(/DOC\s*(\d+)/); return m ? `DOC${String(Number(m[1])).padStart(2, '0')}` : ''; }
function imageInnerKey(value) { return trim(value).split('|').slice(1).join('|') || trim(value); }
function hasImage(ticketImages, eventId, inner) {
  const ev = trim(eventId); const inr = trim(inner);
  if (!ev || !inr) return false;
  const keys = Object.keys(ticketImages || {});
  const tk = ticketToken(inr);
  return keys.some(key => {
    if (!key.startsWith(`${ev}|`)) return false;
    const innerKey = imageInnerKey(key);
    if (innerKey === inr) return true;
    if (tk && ticketToken(innerKey) === tk) return true;
    return false;
  });
}
function firstNumber(row, keys, fallback = 0) {
  for (const key of keys) if (row && row[key] !== undefined && row[key] !== null && trim(row[key]) !== '') return num(row[key]);
  return fallback;
}
function parseEventDate(ev) {
  const candidates = [ev?.fechaFin, ev?.fecha_fin, ev?.fechaIni, ev?.fecha_ini, ev?.createdAt, ev?.created_at].map(trim).filter(Boolean);
  for (const raw of candidates) {
    const m = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const y = Number(m[3].length === 2 ? `20${m[3]}` : m[3]);
      const d = new Date(y, Number(m[2]) - 1, Number(m[1])).getTime();
      if (Number.isFinite(d)) return d;
    }
    const d = Date.parse(raw);
    if (Number.isFinite(d)) return d;
  }
  return 0;
}

function makeHelpers(state) {
  const people = byId(state?.personas);
  const stores = byId(state?.tiendas);
  const products = byId(state?.productos);
  function personName(id) { return trim(people.get(trim(id))?.nombre || id || 'Sin responsable'); }
  function personRange(id) { return trim(people.get(trim(id))?.rango || ''); }
  function storeName(id) { return trim(stores.get(trim(id))?.nombre || id || 'Sin tienda'); }
  function productName(id) { return trim(products.get(trim(id))?.nombre || id || 'Sin producto'); }
  function productSegment(id) { return trim(products.get(trim(id))?.segmento || ''); }
  function productDestino(id) { return trim(products.get(trim(id))?.destino || ''); }
  function entityName(value) {
    const v = trim(value);
    if (!v) return '';
    if (people.has(v)) return personName(v);
    if (stores.has(v)) return storeName(v);
    if (products.has(v)) return productName(v);
    return v;
  }
  return { people, stores, products, personName, personRange, storeName, productName, productSegment, productDestino, entityName };
}

function incomeParts(row, ev, helpers, ticketImages) {
  const personaId = rowPersonaId(row);
  const rangoRaw = trim(helpers.personRange(personaId) || row?.rango || row?.personaRango || row?.tipoPersona || '');
  const socio = norm(rangoRaw) === 'socio';
  const numero = num(row?.numero);
  const precioEntrada = num(ev?.precio);
  const importeObligatorioSocios = socio ? round(numero * precioEntrada, 2) : 0;
  const importeVoluntario = firstNumber(row, ['importeVoluntario','voluntario','donation','importe','importeDonacion','aportacionVoluntaria'], 0);
  const total = round(importeObligatorioSocios + importeVoluntario, 2);
  return {
    colaborador: helpers.personName(personaId),
    tipoPersona: socio ? 'SOCIO' : (rangoRaw || 'NO SOCIO / OTRO'),
    esSocio: socio,
    numero: round(numero, 3),
    formaPago: trim(row?.situacion || row?.formaPago || row?.ingreso || 'Pendiente') || 'Pendiente',
    importeObligatorioSocios,
    importeVoluntarioONoSocio: round(importeVoluntario, 2),
    importeTotalCalculado: total,
    importeCampoBBDD: round(row?.importe, 2),
    tieneJustificante: hasImage(ticketImages, row?.eventId || ev?.id, `INGRESO:${row?.id}`)
  };
}
function summarizeIngresos(rows, ev, helpers, ticketImages) {
  const byForma = new Map(), byTipo = new Map(), byColaborador = new Map();
  let total = 0, socios = 0, noSocios = 0, obligatorio = 0, voluntario = 0, entradas = 0;
  const detalle = arr(rows).map(row => {
    const p = incomeParts(row, ev, helpers, ticketImages);
    total += p.importeTotalCalculado;
    entradas += p.numero;
    voluntario += p.importeVoluntarioONoSocio;
    obligatorio += p.importeObligatorioSocios;
    if (p.esSocio) socios += p.importeTotalCalculado; else noSocios += p.importeTotalCalculado;
    add(byForma, p.formaPago, p.importeTotalCalculado);
    add(byTipo, p.tipoPersona, p.importeTotalCalculado);
    add(byColaborador, p.colaborador, p.importeTotalCalculado);
    return p;
  });
  return {
    ingresosTotal: round(total, 2),
    ingresosSocios: round(socios, 2),
    ingresosNoSociosYOtros: round(noSocios, 2),
    importeObligatorioSocios: round(obligatorio, 2),
    importeVoluntarioONoSocio: round(voluntario, 2),
    entradasTotal: round(entradas, 3),
    numeroLineas: detalle.length,
    conJustificante: detalle.filter(x => x.tieneJustificante).length,
    porFormaPago: topN(byForma, 60),
    porTipoPersona: topN(byTipo, 60),
    porColaborador: topN(byColaborador, 120),
    reglaCalculo: 'IngresosTotal = socios(numero * precioEntrada + voluntario) + noSocios/otros(importe registrado). No usar solo importeCampoBBDD si hay socios.',
    detalle
  };
}

function purchaseReadable(row, ev, helpers, ticketImages) {
  const ticket = ticketText(row);
  const tipo = lineKind(ticket);
  const productoId = trim(row?.productoId || row?.producto_id);
  const tiendaId = trim(row?.tiendaId || row?.tienda_id);
  const responsableId = trim(row?.responsableId || row?.responsable_id);
  const producto = helpers.productName(productoId);
  const tienda = helpers.storeName(tiendaId);
  const responsable = helpers.personName(responsableId);
  const donante = helpers.entityName(row?.donorRef || row?.donor_ref || '');
  return {
    tipo,
    ticket: ticket || (tipo === 'PTE_COMPRA' ? 'Pte.Compra' : ''),
    tk: ticketToken(ticket),
    producto,
    segmento: helpers.productSegment(productoId) || 'Sin segmento',
    destino: helpers.productDestino(productoId) || 'Sin destino',
    unidades: round(row?.unidades, 3),
    precioUnitario: round(row?.precio, 4),
    importe: valueOfLine(row),
    tienda,
    responsable,
    donante: donante || (tipo === 'DONACION_PRODUCTO' ? 'Sin donante informado' : ''),
    tieneFotoTicket: tipo === 'COMPRA_REAL' ? hasImage(ticketImages, ev?.id, ticket) : false
  };
}
function summarizeCompras(rows, ev, helpers, ticketImages) {
  const comprasReales = [], comprasPendientes = [], donacionesProducto = [];
  const byProductoCantidad = new Map(), byProductoCoste = new Map(), byTienda = new Map(), byResponsable = new Map(), bySegmento = new Map(), byDestino = new Map(), byDonante = new Map(), byTicket = new Map();
  let totalReales = 0, totalPendientes = 0, totalDonaciones = 0;
  for (const row of arr(rows)) {
    const out = purchaseReadable(row, ev, helpers, ticketImages);
    if (out.tipo === 'DONACION_PRODUCTO') {
      totalDonaciones += out.importe;
      donacionesProducto.push(out);
      add(byDonante, out.donante || 'Sin donante informado', out.importe);
    } else if (out.tipo === 'PTE_COMPRA') {
      totalPendientes += out.importe;
      comprasPendientes.push(out);
    } else {
      totalReales += out.importe;
      comprasReales.push(out);
    }
    addQtyCost(byProductoCantidad, out.producto, out.unidades, out.importe);
    add(byProductoCoste, out.producto, out.importe);
    add(byTienda, out.tienda, out.importe);
    add(byResponsable, out.responsable, out.importe);
    add(bySegmento, out.segmento || 'Sin segmento', out.importe);
    add(byDestino, out.destino || 'Sin destino', out.importe);
    if (out.tk && out.tipo === 'COMPRA_REAL') {
      const old = byTicket.get(out.tk) || { ticket: out.tk, tienda: out.tienda, responsable: out.responsable, total: 0, numeroLineas: 0, tieneFoto: out.tieneFotoTicket, segmentos: new Map(), destinos: new Map(), lineas: [] };
      old.total += out.importe;
      old.numeroLineas += 1;
      old.tieneFoto = old.tieneFoto || out.tieneFotoTicket;
      add(old.segmentos, out.segmento, out.importe);
      add(old.destinos, out.destino, out.importe);
      old.lineas.push({ producto: out.producto, unidades: out.unidades, precioUnitario: out.precioUnitario, importe: out.importe, segmento: out.segmento, destino: out.destino });
      byTicket.set(out.tk, old);
    }
  }
  const tickets = [...byTicket.values()].sort((a, b) => a.ticket.localeCompare(b.ticket, 'es', { numeric: true })).map(t => ({
    ticket: t.ticket,
    tienda: t.tienda,
    responsable: t.responsable,
    total: round(t.total, 2),
    numeroLineas: t.numeroLineas,
    tieneFoto: !!t.tieneFoto,
    segmentos: topN(t.segmentos, 30),
    destinos: topN(t.destinos, 30),
    lineas: t.lineas
  }));
  return {
    totalComprasReales: round(totalReales, 2),
    totalComprasPendientes: round(totalPendientes, 2),
    totalDonacionesProducto: round(totalDonaciones, 2),
    numeroLineasComprasReales: comprasReales.length,
    numeroLineasPendientes: comprasPendientes.length,
    numeroLineasDonaciones: donacionesProducto.length,
    numeroTickets: tickets.length,
    ticketsConFoto: tickets.filter(t => t.tieneFoto).length,
    ticketsSinFoto: tickets.filter(t => !t.tieneFoto).length,
    rankings: {
      productosPorCantidad: topQtyCost(byProductoCantidad, 'unidades', 100),
      productosPorCoste: topQtyCost(byProductoCantidad, 'importe', 100),
      tiendasPorImporte: topN(byTienda, 100),
      responsablesPorImporte: topN(byResponsable, 100),
      segmentosPorImporte: topN(bySegmento, 100),
      destinosPorImporte: topN(byDestino, 100),
      donantesPorImporte: topN(byDonante, 100)
    },
    comprasReales,
    comprasPendientes,
    donacionesProducto,
    tickets
  };
}

function summarizeDocs(rows, ev, ticketImages) {
  const docs = arr(rows).filter(d => trim(d?.eventId || d?.event_id) === trim(ev?.id)).map(doc => {
    const code = docCode(doc?.codigo || doc?.imageKey || doc?.id) || trim(doc?.codigo || doc?.imageKey || 'DOC');
    return {
      codigo: code,
      fecha: trim(doc?.fecha || ''),
      descripcion: trim(doc?.descripcion || doc?.texto || ''),
      tieneImagen: hasImage(ticketImages, ev?.id, code) || !!trim(doc?.imageUrl || ''),
      recuperado: doc?.recovered === true
    };
  }).sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.codigo || '').localeCompare(b.codigo || ''));
  return { totalDocumentos: docs.length, conImagen: docs.filter(d => d.tieneImagen).length, sinImagen: docs.filter(d => !d.tieneImagen).length, documentos: docs };
}

function buildEventDetail(ev, state, helpers, ticketImages) {
  const evId = trim(ev?.id);
  const evCompras = arr(state?.compras).filter(c => trim(c?.eventId || c?.event_id) === evId);
  const evIngresos = arr(state?.colaboradores).filter(c => trim(c?.eventId || c?.event_id) === evId);
  const ingresos = summarizeIngresos(evIngresos, ev, helpers, ticketImages);
  const compras = summarizeCompras(evCompras, ev, helpers, ticketImages);
  const documentos = summarizeDocs(state?.eventDocuments, ev, ticketImages);
  const valoracion = round(ingresos.ingresosTotal + compras.totalDonacionesProducto - compras.totalComprasReales, 2);
  const avisos = [];
  if (compras.totalComprasPendientes > 0) avisos.push(`Hay compras pendientes por ${round(compras.totalComprasPendientes, 2)} €.`);
  if (compras.ticketsSinFoto > 0) avisos.push(`Hay ${compras.ticketsSinFoto} ticket(s) sin foto asociada.`);
  if (documentos.sinImagen > 0) avisos.push(`Hay ${documentos.sinImagen} documento(s) sin imagen asociada.`);
  const sinSegmento = compras.comprasReales.concat(compras.comprasPendientes, compras.donacionesProducto).filter(x => !trim(x.segmento) || x.segmento === 'Sin segmento').length;
  const sinDestino = compras.comprasReales.concat(compras.comprasPendientes, compras.donacionesProducto).filter(x => !trim(x.destino) || x.destino === 'Sin destino').length;
  if (sinSegmento) avisos.push(`${sinSegmento} línea(s) sin segmento.`);
  if (sinDestino) avisos.push(`${sinDestino} línea(s) sin destino.`);
  return {
    evento: {
      titulo: trim(ev?.titulo),
      situacion: trim(ev?.situacion || 'En curso'),
      fechaInicio: trim(ev?.fechaIni),
      fechaFin: trim(ev?.fechaFin),
      precioEntrada: round(ev?.precio, 2),
      descripcion: trim(ev?.descripcion || '')
    },
    resumenFinanciero: {
      ingresosTotal: ingresos.ingresosTotal,
      comprasReales: compras.totalComprasReales,
      donacionesProducto: compras.totalDonacionesProducto,
      comprasPendientes: compras.totalComprasPendientes,
      valoracionEvento: valoracion,
      formulaValoracion: 'valoracionEvento = ingresosTotal + donacionesProducto - comprasReales'
    },
    ingresos,
    compras,
    donaciones: { totalValorado: compras.totalDonacionesProducto, lineas: compras.donacionesProducto, rankings: { porProducto: compras.rankings.productosPorCoste, porDonante: compras.rankings.donantesPorImporte } },
    tickets: compras.tickets,
    documentos,
    avisosDatos: avisos
  };
}

function eventTitleWithoutDateSuffix(value) {
  return norm(value).replace(/\b(dic|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov)\s*\d{2,4}\b/g, '').replace(/\s+/g, ' ').trim();
}
function quotedFragments(value) {
  const out = [];
  const re = /["“”'‘’]([^"“”'‘’]{4,160})["“”'‘’]/g;
  let m;
  while ((m = re.exec(text(value)))) {
    const q = trim(m[1]);
    if (q && !out.includes(q)) out.push(q);
  }
  return out;
}
function eventPhraseScore(ev, phrase) {
  const q = eventTitleWithoutDateSuffix(phrase);
  const title = norm(ev?.titulo);
  const titleNoSuffix = eventTitleWithoutDateSuffix(ev?.titulo);
  if (!q || !titleNoSuffix) return 0;
  if (q === title || q === titleNoSuffix) return 220;
  if (q.includes(titleNoSuffix) || titleNoSuffix.includes(q)) return 190;
  const qWords = q.split(' ').filter(w => w.length >= 2);
  const tWords = new Set(titleNoSuffix.split(' ').filter(w => w.length >= 2));
  const meaningful = qWords.filter(w => !COMMON_STOP.has(w));
  const hits = meaningful.filter(w => tWords.has(w));
  const romanHits = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'].filter(r => qWords.includes(r) && tWords.has(r)).length;
  const score = hits.length * 35 + romanHits * 25;
  return hits.length >= 2 || (hits.length >= 1 && romanHits) ? score : 0;
}
function eventScore(ev, prompt) {
  const p = norm(prompt);
  const title = norm(ev?.titulo);
  if (!p || !title) return 0;
  let score = 0;
  if (p.includes(title)) score += 160;
  const titleNoSuffix = eventTitleWithoutDateSuffix(ev?.titulo);
  if (titleNoSuffix && p.includes(titleNoSuffix)) score += 120;
  const pWords = p.split(' ');
  const tWords = title.split(' ');
  const romans = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
  // Un ordinal romano por sí solo NO identifica un evento. Antes esto metía eventos ajenos
  // como "III Visita a Madrid" al pedir "III Jornada Solidaria VS ELA".
  romans.forEach(r => { if (tWords.includes(r) && pWords.includes(r)) score += 8; });
  for (const w of words(ev?.titulo)) if (pWords.includes(w)) score += w.length >= 5 ? 16 : 7;
  const code = norm(ev?.eventoCodigo || ev?.codigoEvento || ev?.codigo || '');
  if (code && p.includes(code)) score += 60;
  return score;
}
function mostRecentEventIds(events, n = 1, opts = {}) {
  const onlyCelebrated = opts && opts.celebrated === true;
  let candidates = arr(events);
  if (onlyCelebrated) {
    const finalized = candidates.filter(ev => /finalizado/i.test(trim(ev?.situacion || '')));
    if (finalized.length) candidates = finalized;
  }
  return candidates.map(ev => ({ id: trim(ev?.id), date: parseEventDate(ev) })).filter(x => x.id)
    .sort((a, b) => b.date - a.date).slice(0, n).map(x => x.id);
}
function detectPromptBlocks(prompt) {
  const p = norm(prompt);
  const blocks = new Set();
  if (/\bingres|socio|entrada|asistent|forma\s+de\s+pago|colaborador/.test(p)) blocks.add('ingresos');
  if (/\bcompra|comprado|gasto|coste|precio|tienda|producto|articulo|segmento|destino|cerveza|agua|refresco|comida|material|ticket|tk\d+/.test(p)) { blocks.add('compras'); blocks.add('tickets'); }
  if (/\bdonaci|donado|donante|producto\s+donado/.test(p)) { blocks.add('donaciones'); blocks.add('compras'); }
  if (/\bdocumento|doc\d+|archivo|foto|justificante/.test(p)) blocks.add('documentos');
  if (/\bvaloracion|resumen|dashboard|grafica|estadistica|compar/.test(p)) ['ingresos','compras','donaciones','tickets','documentos'].forEach(b => blocks.add(b));
  if (!blocks.size) ['ingresos','compras','donaciones','tickets','documentos'].forEach(b => blocks.add(b));
  return [...blocks];
}
function promptTerms(prompt) {
  const out = [];
  for (const w of words(prompt, { min: 3 })) {
    if (COMMON_STOP.has(w)) continue;
    if (!out.includes(w)) out.push(w);
  }
  return out.slice(0, 20);
}
function tokenSet(value) { return new Set(words(value, { min: 3, keepStop: true })); }
function matchScoreFromTerms(value, terms) {
  const ws = tokenSet(value);
  let score = 0;
  for (const t of terms) {
    if (ws.has(t)) score += 14;
    else if (t.length >= 5 && [...ws].some(w => w.length >= 5 && (w.startsWith(t) || t.startsWith(w)))) score += 5;
  }
  return score;
}
function findReferencedEventIds(events, prompt, selectedId) {
  const explicit = findExplicitReferencedEventIds(events, prompt);
  if (explicit.length) return explicit;
  const p = norm(prompt);
  if (/\b(mas\s+reciente|ultimo|ultima|reciente|actual|celebrado|celebrada)\b/.test(p)) {
    const celebrated = /\b(celebrado|celebrada)\b/.test(p);
    const recent = mostRecentEventIds(events, 1, { celebrated });
    if (recent.length) return recent;
  }
  return selectedId ? [selectedId] : [];
}
function findExplicitReferencedEventIds(events, prompt) {
  const out = [];
  function push(id) { if (id && !out.includes(id)) out.push(id); }
  const quoted = quotedFragments(prompt);
  if (quoted.length) {
    // Si el usuario ha entrecomillado eventos, el alcance queda cerrado a esos textos.
    // No añadimos eventos solo por parecido/ordinal para evitar mezclar datos de otros eventos.
    quoted.forEach(q => {
      const matches = arr(events)
        .map(ev => ({ id: trim(ev?.id), score: eventPhraseScore(ev, q), date: parseEventDate(ev) }))
        .filter(x => x.id && x.score >= 60)
        .sort((a, b) => b.score - a.score || b.date - a.date);
      if (matches[0]) push(matches[0].id);
    });
    return out;
  }
  const scored = arr(events)
    .map(ev => ({ id: trim(ev?.id), titulo: trim(ev?.titulo), score: eventScore(ev, prompt), date: parseEventDate(ev) }))
    .filter(x => x.id && x.score >= 55)
    .sort((a, b) => b.score - a.score || b.date - a.date);
  scored.forEach(x => push(x.id));
  return out;
}
function buildPromptFilteredLines(state, events, helpers, ticketImages, prompt, maxLines = 500) {
  const terms = promptTerms(prompt);
  if (!terms.length) return { criterios: [], totalCoincidencias: 0, lineas: [], nota: 'No se detectaron términos concretos para filtrar líneas.' };
  const evById = byId(events);
  const out = [];
  for (const row of arr(state?.compras)) {
    const evId = trim(row?.eventId || row?.event_id);
    const ev = evById.get(evId) || {};
    const line = purchaseReadable(row, ev, helpers, ticketImages);
    const haystack = [line.producto, line.segmento, line.destino, line.tienda, line.responsable, line.donante, line.ticket, trim(ev?.titulo)].join(' ');
    const score = matchScoreFromTerms(haystack, terms);
    if (score <= 0) continue;
    out.push({ score, eventDate: parseEventDate(ev), evento: trim(ev?.titulo || 'Sin evento'), situacionEvento: trim(ev?.situacion || ''), fechaInicio: trim(ev?.fechaIni || ''), fechaFin: trim(ev?.fechaFin || ''), ...line });
  }
  out.sort((a, b) => b.eventDate - a.eventDate || b.score - a.score || b.importe - a.importe);
  return { criterios: terms, totalCoincidencias: out.length, lineas: out.slice(0, maxLines).map(({ score, eventDate, ...x }) => x), nota: 'Líneas de compras reales, pendientes y donaciones filtradas por términos del prompt en todos los eventos. Los nombres son legibles; no se exponen claves internas.' };
}


function compactMoneyLine(x) {
  return {
    tipo: x.tipo,
    ticket: x.ticket,
    tk: x.tk,
    producto: x.producto,
    segmento: x.segmento,
    destino: x.destino,
    unidades: x.unidades,
    precioUnitario: x.precioUnitario,
    importe: x.importe,
    tienda: x.tienda,
    responsable: x.responsable,
    donante: x.donante,
    tieneFotoTicket: x.tieneFotoTicket
  };
}
function compactTicket(t, includeLines = false) {
  const out = {
    ticket: t.ticket,
    tienda: t.tienda,
    responsable: t.responsable,
    total: t.total,
    numeroLineas: t.numeroLineas,
    tieneFoto: t.tieneFoto,
    segmentos: t.segmentos,
    destinos: t.destinos
  };
  if (includeLines) out.lineas = arr(t.lineas).map(l => ({ producto: l.producto, unidades: l.unidades, precioUnitario: l.precioUnitario, importe: l.importe, segmento: l.segmento, destino: l.destino }));
  return out;
}
function wantsPending(prompt) { return /\b(pendiente|pendientes|pte|previs|previst|por\s+comprar)\b/i.test(norm(prompt)); }
function wantsTicketLines(prompt) { return /\b(ticket|tickets|tk\s*\d+|detalle\s+ticket|lineas\s+ticket)\b/i.test(norm(prompt)); }
function compactEventDetailForBlocks(detail, blocks, prompt) {
  const b = new Set(blocks || []);
  const p = norm(prompt || '');
  const includeAll = !b.size;
  const includeCompras = includeAll || b.has('compras');
  const includeDonaciones = includeAll || b.has('donaciones');
  const includeIngresos = includeAll || b.has('ingresos');
  const includeTickets = includeAll || b.has('tickets') || wantsTicketLines(p);
  const includeDocs = includeAll || b.has('documentos');
  const includePend = includeCompras && (wantsPending(p) || includeAll);
  const out = {
    evento: detail.evento,
    resumenFinanciero: detail.resumenFinanciero,
    avisosDatos: detail.avisosDatos,
    resumenLineas: {
      ingresos: detail.ingresos?.numeroLineas || 0,
      comprasReales: detail.compras?.numeroLineasComprasReales || 0,
      comprasPendientes: detail.compras?.numeroLineasPendientes || 0,
      donacionesProducto: detail.compras?.numeroLineasDonaciones || 0,
      tickets: detail.compras?.numeroTickets || 0,
      documentos: detail.documentos?.totalDocumentos || 0
    }
  };
  if (includeIngresos) {
    out.ingresos = {
      ingresosTotal: detail.ingresos.ingresosTotal,
      ingresosSocios: detail.ingresos.ingresosSocios,
      ingresosNoSociosYOtros: detail.ingresos.ingresosNoSociosYOtros,
      importeObligatorioSocios: detail.ingresos.importeObligatorioSocios,
      importeVoluntarioONoSocio: detail.ingresos.importeVoluntarioONoSocio,
      entradasTotal: detail.ingresos.entradasTotal,
      numeroLineas: detail.ingresos.numeroLineas,
      conJustificante: detail.ingresos.conJustificante,
      porFormaPago: detail.ingresos.porFormaPago,
      porTipoPersona: detail.ingresos.porTipoPersona,
      porColaborador: detail.ingresos.porColaborador,
      reglaCalculo: detail.ingresos.reglaCalculo,
      detalle: arr(detail.ingresos.detalle)
    };
  }
  if (includeCompras) {
    out.compras = {
      totalComprasReales: detail.compras.totalComprasReales,
      totalComprasPendientes: detail.compras.totalComprasPendientes,
      numeroLineasComprasReales: detail.compras.numeroLineasComprasReales,
      numeroLineasPendientes: detail.compras.numeroLineasPendientes,
      rankings: {
        productosPorCantidad: detail.compras.rankings.productosPorCantidad,
        productosPorCoste: detail.compras.rankings.productosPorCoste,
        tiendasPorImporte: detail.compras.rankings.tiendasPorImporte,
        responsablesPorImporte: detail.compras.rankings.responsablesPorImporte,
        segmentosPorImporte: detail.compras.rankings.segmentosPorImporte,
        destinosPorImporte: detail.compras.rankings.destinosPorImporte
      },
      comprasReales: arr(detail.compras.comprasReales).map(compactMoneyLine)
    };
    if (includePend) out.compras.comprasPendientes = arr(detail.compras.comprasPendientes).map(compactMoneyLine);
  }
  if (includeDonaciones) {
    out.donaciones = {
      totalValorado: detail.donaciones.totalValorado,
      numeroLineas: detail.compras.numeroLineasDonaciones,
      rankings: detail.donaciones.rankings,
      lineas: arr(detail.donaciones.lineas).map(compactMoneyLine)
    };
  }
  if (includeTickets) {
    const includeLines = wantsTicketLines(p) || /\bdetalle|lineas|lista|listado\b/i.test(p);
    out.tickets = arr(detail.tickets).map(t => compactTicket(t, includeLines));
  }
  if (includeDocs) out.documentos = detail.documentos;
  return out;
}
function reduceCatalogosForPrompt(state, helpers, filteredLines) {
  return {
    tiendas: arr(state.tiendas).map(t => ({ nombre: trim(t.nombre) })).filter(t => t.nombre).slice(0, 300),
    responsables: arr(state.personas).map(p => ({ nombre: trim(p.nombre), rango: trim(p.rango) })).filter(p => p.nombre).slice(0, 500),
    productos: arr(state.productos)
      .map(p => ({ nombre: trim(p.nombre), segmento: trim(p.segmento), destino: trim(p.destino), precioHabitual: round(p.defaultPrecio ?? p.precio, 4), tiendaHabitual: helpers.storeName(p.defaultTiendaId) }))
      .filter(p => p.nombre && (!filteredLines.criterios.length || matchScoreFromTerms([p.nombre, p.segmento, p.destino, p.tiendaHabitual].join(' '), filteredLines.criterios) > 0))
      .slice(0, 220)
  };
}

function summarizeEventForGlobal(detail) {
  return {
    titulo: detail.evento.titulo,
    situacion: detail.evento.situacion,
    fechas: `${detail.evento.fechaInicio} a ${detail.evento.fechaFin}`,
    precioEntrada: detail.evento.precioEntrada,
    ingresosTotal: detail.resumenFinanciero.ingresosTotal,
    ingresosSocios: detail.ingresos.ingresosSocios,
    ingresosNoSociosYOtros: detail.ingresos.ingresosNoSociosYOtros,
    comprasReales: detail.resumenFinanciero.comprasReales,
    donacionesProducto: detail.resumenFinanciero.donacionesProducto,
    comprasPendientes: detail.resumenFinanciero.comprasPendientes,
    valoracionEvento: detail.resumenFinanciero.valoracionEvento,
    numeroTickets: detail.tickets.length,
    numeroDocumentos: detail.documentos.totalDocumentos,
    lineasComprasReales: detail.compras.numeroLineasComprasReales,
    lineasDonacionesProducto: detail.compras.numeroLineasDonaciones,
    lineasComprasPendientes: detail.compras.numeroLineasPendientes,
    productoMasConsumidoCantidad: detail.compras.rankings.productosPorCantidad[0] || null,
    productoMayorCoste: detail.compras.rankings.productosPorCoste[0] || null
  };
}
function estimateContextSize(obj) { return Buffer.byteLength(JSON.stringify(obj), 'utf8'); }
function isVeryBroad(prompt) {
  const p = norm(prompt);
  return /\b(todo|todos|toda|todas|completo|completa|cualquier|general|global|dashboard\s+general)\b/.test(p) && !/\b(compara|comparativa|versus| vs |entre)\b/.test(` ${p} `);
}

export function buildEventAiContext(state, selectedEventId = '', userPrompt = '') {
  const safeState = state && typeof state === 'object' ? state : {};
  const events = arr(safeState.eventos);
  const helpers = makeHelpers(safeState);
  const ticketImages = safeState.ticketImages || safeState.ticketImageRefs || {};
  const selectedId = trim(selectedEventId || safeState.selectedEventId);
  const prompt = text(userPrompt);
  const selectedEvent = events.find(e => trim(e?.id) === selectedId) || null;
  const targetIds = findReferencedEventIds(events, prompt, selectedId);
  const blocks = detectPromptBlocks(prompt);
  const wantsComparison = /\b(compara|comparativa|frente|versus|entre\s+los\s+eventos| vs )\b/i.test(` ${prompt} `);
  if (wantsComparison && selectedId && !targetIds.includes(selectedId)) targetIds.push(selectedId);
  const warnings = [];

  if (!events.length) {
    return { needsClarification: true, clarification: 'No hay eventos disponibles para analizar. Debes cargar o seleccionar un evento antes de usar Zuzu.', warnings: [] };
  }
  if (!targetIds.length) {
    return { needsClarification: true, clarification: 'Debes ser más concreto en tu petición. Piensa un poco más lo que quieres: indica el evento, el producto, el responsable, el donante o el bloque que quieres analizar.', warnings: [] };
  }
  if (wantsComparison && targetIds.length < 2) {
    return { needsClarification: true, clarification: 'Para una comparativa necesito que indiques con claridad al menos dos eventos, o que uses una petición más concreta indicando el evento activo y el evento a comparar.', warnings: [] };
  }
  if (targetIds.length > 3 && isVeryBroad(prompt)) {
    return { needsClarification: true, clarification: 'Debes ser más concreto en tu petición. Piensa un poco más lo que quieres: has pedido demasiados eventos o un análisis demasiado amplio. Indica 1 o 2 eventos y si quieres compras, donaciones, ingresos, tickets o documentos.', warnings: [] };
  }

  const detailById = new Map();
  const fullDetails = [];
  for (const id of targetIds.slice(0, wantsComparison ? 3 : 2)) {
    const ev = events.find(e => trim(e?.id) === id);
    if (!ev) continue;
    const d = buildEventDetail(ev, safeState, helpers, ticketImages);
    detailById.set(id, d);
    fullDetails.push(compactEventDetailForBlocks(d, blocks, prompt));
  }
  const allSummaries = events.map(ev => summarizeEventForGlobal(buildEventDetail(ev, safeState, helpers, ticketImages)));
  const filteredLines = buildPromptFilteredLines(safeState, events, helpers, ticketImages, prompt, 300);

  const globalIngresos = new Map(), globalCompras = new Map(), globalDonaciones = new Map(), globalValoracion = new Map();
  allSummaries.forEach(s => { add(globalIngresos, s.titulo, s.ingresosTotal); add(globalCompras, s.titulo, s.comprasReales); add(globalDonaciones, s.titulo, s.donacionesProducto); add(globalValoracion, s.titulo, s.valoracionEvento); });

  const context = {
    versionContexto: 'ControlEvent EventContext v11_3_2_prod - Zuzu contexto completo selectivo',
    generatedAt: new Date().toISOString(),
    seguridad: {
      modo: 'solo lectura',
      prohibido: ['SQL directo', 'modificar BBDD', 'insertar', 'actualizar', 'borrar', 'leer credenciales', 'consultas ajenas al evento'],
      nota: 'Gemini solo recibe este JSON calculado por ControlEvent. No tiene conexión directa a Supabase ni permiso para ejecutar consultas.'
    },
    planExtraccionControlEvent: {
      eventosObjetivo: fullDetails.map(d => d.evento.titulo),
      eventoActivo: selectedEvent ? trim(selectedEvent.titulo) : '',
      modoComparativa: wantsComparison,
      bloquesSolicitados: blocks,
      criterio: 'ControlEvent decide qué eventos y bloques extraer a partir del prompt. Si el prompt es ambiguo o excesivo, se pide concreción antes de llamar a Gemini.'
    },
    selectedEvent: selectedEvent ? { titulo: trim(selectedEvent.titulo), situacion: trim(selectedEvent.situacion), fechaInicio: trim(selectedEvent.fechaIni), fechaFin: trim(selectedEvent.fechaFin), precioEntrada: round(selectedEvent.precio, 2) } : null,
    eventosResumen: allSummaries,
    detalleEventosSeleccionados: fullDetails,
    detalleEventosRelevantes: fullDetails,
    lineasFiltradasPorPrompt: filteredLines,
    resumenGlobal: {
      totalEventos: events.length,
      rankingIngresos: topN(globalIngresos, 50),
      rankingCompras: topN(globalCompras, 50),
      rankingDonaciones: topN(globalDonaciones, 50),
      rankingValoracion: topN(globalValoracion, 50)
    },
    catalogosRelacionados: reduceCatalogosForPrompt(safeState, helpers, filteredLines),
    instruccionesCalculo: {
      ingresos: 'Para socios, obligatorio = numero * precioEntrada. Total ingreso = obligatorio + voluntario/no socio. No usar solo importe bruto.',
      compras: 'COMPRA_REAL son tickets TKxx u otros gastos no pendientes ni donados. PTE_COMPRA son previsiones. DONADO TIENDA/SOCIO/OTROS son donaciones de producto valoradas.',
      valoracion: 'valoracionEvento = ingresosTotal + donacionesProducto - comprasReales.',
      tickets: 'Los tickets agrupan líneas de compra por TKxx, tienda y responsable; tieneFoto solo indica disponibilidad de imagen, no se envía la imagen.',
      personas: 'Todos los datos están humanizados: se exponen nombres de producto, tienda, responsable y donante, no claves internas.'
    },
    warnings
  };

  const bytes = estimateContextSize(context);
  context.planExtraccionControlEvent.contextoEstimadoBytes = bytes;
  if (bytes > 320000) {
    context.warnings.push(`Contexto grande pero se envía en modo compacto: ${bytes} bytes. Si la respuesta tarda o no es precisa, concreta más por producto, responsable, tienda, ticket o fecha.`);
  }
  if (bytes > 900000) {
    return {
      needsClarification: true,
      clarification: 'Debes ser más concreto en tu petición. Piensa un poco más lo que quieres: el volumen de datos necesario sigue siendo demasiado grande incluso en modo compacto. Indica evento, bloque concreto y, si puedes, producto, responsable, tienda o ticket.',
      warnings: [`Contexto estimado demasiado grande incluso en modo compacto: ${bytes} bytes.`],
      planExtraccionControlEvent: context.planExtraccionControlEvent
    };
  }
  return context;
}

/* ControlEvent v11_3_2_prod - Zuzu: módulos seguros de extracción selectiva completa.
   Esta capa NO ejecuta SQL ni expone claves internas. Solo transforma el estado ya leído por ControlEvent
   en registros legibles para humano según módulos invocados por el planificador. */
const ZUZU_ALLOWED_MODULES = ['EVENTOS','INGRESOS','DONACIONES','COMPRAS','TICKETS','DOCUMENTOS','PRODUCTOS','TIENDAS','PERSONAS'];
function zuzuUpperModule(value) {
  const raw = trim(value).toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const map = { RECAUDACION: 'INGRESOS', RECAUDACIÓN: 'INGRESOS', ASISTENTES: 'INGRESOS', ENTRADAS: 'INGRESOS', DONACION: 'DONACIONES', DONACIONES_PRODUCTO: 'DONACIONES', GASTOS: 'COMPRAS', TICKET: 'TICKETS', DOCUMENTO: 'DOCUMENTOS', CATALOGOS: 'PRODUCTOS', CATALOGO_PRODUCTOS: 'PRODUCTOS' };
  return map[raw] || raw;
}
function zuzuUnique(list) { const out=[]; arr(list).forEach(x=>{ const v=trim(x); if(v && !out.includes(v)) out.push(v); }); return out; }
function zuzuNormIncludes(haystack, needle) { const h=norm(haystack); const n=norm(needle); return !!h && !!n && (h.includes(n) || n.includes(h)); }
function zuzuWordMatch(haystack, needle) {
  const hw = new Set(words(haystack, { min: 2, keepStop: true }));
  const nw = words(needle, { min: 2, keepStop: true });
  if (!hw.size || !nw.length) return false;
  let hits = 0;
  nw.forEach(w => {
    if (hw.has(w)) hits += 1;
    else if (w.length >= 5 && [...hw].some(x => x.length >= 5 && (x.startsWith(w) || w.startsWith(x)))) hits += 0.5;
  });
  return hits >= Math.max(1, Math.ceil(Math.min(nw.length, 3) * 0.45));
}
function zuzuEscapeRegExp(value) { return text(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function zuzuPromptWithoutEventTitles(prompt, state, eventIds) {
  let p = ` ${norm(prompt)} `;
  const ids = new Set(arr(eventIds).map(trim).filter(Boolean));
  arr(state?.eventos).forEach(ev => {
    if (ids.size && !ids.has(trim(ev?.id))) return;
    const title = norm(ev?.titulo);
    if (!title) return;
    p = p.replace(new RegExp('\\b' + zuzuEscapeRegExp(title) + '\\b', 'g'), ' ');
    words(ev?.titulo, { min: 2, keepStop: true }).forEach(w => {
      if (w.length >= 3) p = p.replace(new RegExp('\\b' + zuzuEscapeRegExp(w) + '\\b', 'g'), ' ');
    });
  });
  return p.replace(/\s+/g, ' ').trim();
}
function zuzuHasCue(prompt, cues) {
  const p = norm(prompt);
  return arr(cues).some(c => new RegExp('\\b' + zuzuEscapeRegExp(c) + '\\b', 'i').test(p));
}
function zuzuRangoPersona(id, row, helpers) {
  const r = trim(helpers.people.get(trim(id))?.rango || row?.rango || row?.personaRango || row?.tipoPersona || '');
  if (/^socio$/i.test(r)) return 'SOCIO';
  if (/donante/i.test(r)) return 'DONANTE';
  if (/no\s*socio/i.test(r)) return 'NO SOCIO';
  return r ? r.toUpperCase() : 'NO SOCIO';
}
function zuzuIncomeAmounts(row, ev, helpers) {
  const personaId = rowPersonaId(row);
  const rango = zuzuRangoPersona(personaId, row, helpers);
  const numero = num(row?.numero);
  const isSocio = rango === 'SOCIO';
  const obligatorio = isSocio ? round(numero * num(ev?.precio), 2) : 0;
  const voluntario = firstNumber(row, ['importeVoluntario','voluntario','donation','importe','importeDonacion','aportacionVoluntaria'], 0);
  return { rango, numero: round(numero, 3), obligatorio: round(obligatorio, 2), voluntario: round(voluntario, 2), total: round(obligatorio + voluntario, 2) };
}

function rowEventId(row) { return trim(row?.eventId || row?.event_id || row?.eventoId || row?.evento_id || row?.idEvento || row?.evento || ''); }
function rowPersonaId(row) { return trim(row?.personaId || row?.persona_id || row?.colaboradorId || row?.colaborador_id || row?.persona || ''); }
function rowProductoId(row) { return trim(row?.productoId || row?.producto_id || row?.productId || row?.product_id || row?.producto || ''); }
function rowTiendaId(row) { return trim(row?.tiendaId || row?.tienda_id || row?.storeId || row?.store_id || row?.tienda || ''); }
function rowResponsableId(row) { return trim(row?.responsableId || row?.responsable_id || row?.responsibleId || row?.responsible_id || row?.responsable || ''); }
function rowDonorRef(row) { return trim(row?.donorRef || row?.donor_ref || row?.donanteRef || row?.donante_ref || row?.donanteId || row?.donante_id || row?.donante || ''); }
function zuzuHasAllRowsCue(prompt) {
  const p = norm(prompt);
  return /\b(todos|todas|todo|toda|completo|completa|completos|completas|todas\s+las\s+filas|todos\s+los\s+datos|sin\s+filtrar|del\s+evento|de\s+evento)\b/.test(p)
    || /\b(lista|listado|relacion|detalle|detallame|muestra|dame)\b.*\b(colaboradores|compras|donaciones|ingresos|tickets|documentos)\b.*\b(evento)\b/.test(p)
    || /\b(grafica|gráfica)\b.*\b(compras|donaciones|ingresos)\b.*\b(evento)\b/.test(p);
}
function zuzuPromptHasExplicitSpecificFilter(prompt, kind) {
  const p = norm(prompt);
  if (kind === 'tiendas') return /\b(en\s+la\s+tienda|tienda\s+|tiendas\s+|proveedor\s+)\b/.test(p);
  if (kind === 'productos') return /\b(producto\s+|productos\s+|articulo\s+|articulos\s+|comprado\s+|de\s+producto\s+)\b/.test(p);
  if (kind === 'personas') return /\b(de\s+la\s+persona|de\s+persona|persona\s+|personas\s+|colaborador\s+|colaboradora\s+|responsable\s+|donante\s+|de\s+[a-z0-9]{3,})\b/.test(p)
    && !/\b(todos\s+los\s+colaboradores|todas\s+las\s+personas|lista\s+(?:los|de\s+los)?\s*colaboradores)\b/.test(p);
  return false;
}
function zuzuSanitizeFiltersForPrompt(prompt, modules, filters) {
  const out = {
    personas: zuzuUnique(arr(filters?.personas)),
    productos: zuzuUnique(arr(filters?.productos)),
    tiendas: zuzuUnique(arr(filters?.tiendas)),
    responsables: zuzuUnique(arr(filters?.responsables)),
    donantes: zuzuUnique(arr(filters?.donantes)),
    tickets: zuzuUnique(arr(filters?.tickets))
  };
  // Si el usuario pide todas las filas/datos de un evento, los filtros de personas/productos que se hayan inferido
  // por coincidencias de texto son peligrosos: pueden dejar el módulo a cero. Solo se conservan filtros muy explícitos.
  if (zuzuHasAllRowsCue(prompt)) {
    if (!zuzuPromptHasExplicitSpecificFilter(prompt, 'personas')) { out.personas = []; out.responsables = []; out.donantes = []; }
    if (!zuzuPromptHasExplicitSpecificFilter(prompt, 'productos')) out.productos = [];
    // La tienda sí se conserva si aparece como "tienda X"; si no, se limpia también.
    if (!zuzuPromptHasExplicitSpecificFilter(prompt, 'tiendas')) out.tiendas = [];
  }
  return out;
}

function zuzuBuildFilterMatcher(plan, prompt, state, helpers) {
  const filters = plan?.filters && typeof plan.filters === 'object' ? plan.filters : {};
  const filterPeople = zuzuUnique([].concat(filters.personas || [], filters.responsables || [], filters.donantes || []));
  const filterProducts = zuzuUnique([].concat(filters.productos || []));
  const filterStores = zuzuUnique([].concat(filters.tiendas || []));
  const filterTickets = zuzuUnique([].concat(filters.tickets || []));
  const promptProductHints = words(prompt).filter(w => !COMMON_STOP.has(w)).slice(0, 12);
  function anyMatch(value, list) { return !list.length || list.some(x => zuzuWordMatch(value, x) || zuzuNormIncludes(value, x)); }
  function productMatches(name) {
    if (filterProducts.length) return anyMatch(name, filterProducts);
    return true;
  }
  function peopleMatches(value) { return anyMatch(value, filterPeople); }
  function storeMatches(value) { return anyMatch(value, filterStores); }
  function ticketMatches(value) {
    if (!filterTickets.length) return true;
    const tk = ticketToken(value) || trim(value);
    return filterTickets.some(x => norm(tk) === norm(x) || zuzuNormIncludes(tk, x));
  }
  function lineMatchesCommon(line) {
    return productMatches(line.producto)
      && peopleMatches([line.responsable, line.donante, line.colaborador].join(' '))
      && storeMatches(line.tienda)
      && ticketMatches(line.tk || line.ticket || line.ticketTipo || '');
  }
  return { filterPeople, filterProducts, filterStores, filterTickets, promptProductHints, peopleMatches, productMatches, storeMatches, ticketMatches, lineMatchesCommon };
}
function zuzuFindExplicitEventIds(events, selectedId, prompt, plan) {
  const out = [];
  function push(id){ if(id && !out.includes(id)) out.push(id); }
  const requested = arr(plan?.eventos).concat(arr(plan?.events)).map(trim).filter(Boolean);
  const allRequested = plan?.todosLosEventos === true || requested.some(x => /^(ALL|TODOS|TODOS_LOS_EVENTOS|EVENTOS_REGISTRADOS)$/i.test(x)) || /\b(eventos\s+registrados|todos\s+los\s+eventos|todos\s+los\s+registrados)\b/i.test(prompt);
  if (allRequested) { arr(events).forEach(e => push(trim(e?.id))); return out; }

  // Primero manda el texto real del usuario. El planificador IA no puede cambiar el evento si el prompt ya lo nombra.
  findExplicitReferencedEventIds(events, prompt).forEach(push);
  if (out.length) return out;

  // Peticiones relativas: último/más reciente. Si dice celebrado, se priorizan Finalizados.
  if (/\b(mas\s+reciente|ultimo|ultima|reciente|actual|celebrado|celebrada)\b/.test(norm(prompt))) {
    const celebrated = /\b(celebrado|celebrada)\b/.test(norm(prompt));
    mostRecentEventIds(events, 1, { celebrated }).forEach(push);
    if (out.length) return out;
  }

  // Solo si no hay referencia local clara, se acepta el evento propuesto por el planificador IA.
  requested.forEach(req => {
    if (/^(ALL|TODOS|TODOS_LOS_EVENTOS|EVENTOS_REGISTRADOS)$/i.test(req)) return;
    const direct = events.find(e => trim(e?.id) === req || norm(e?.titulo) === norm(req));
    if (direct) return push(trim(direct.id));
    const ranked = events.map(e => ({ id: trim(e?.id), score: Math.max(eventScore(e, req), eventScore(e, prompt) + (zuzuWordMatch(e?.titulo, req) ? 35 : 0)), date: parseEventDate(e) }))
      .filter(x => x.id && x.score >= 35).sort((a,b)=>b.score-a.score || b.date-a.date);
    if (ranked[0]) push(ranked[0].id);
  });
  return out;
}
function zuzuFindEventIds(events, selectedId, prompt, plan) {
  const explicit = zuzuFindExplicitEventIds(events, selectedId, prompt, plan);
  if (explicit.length) return explicit;
  return selectedId ? [selectedId] : [];
}
function zuzuInferModulesLocal(prompt) {
  const p = norm(prompt);
  const mods = new Set();
  if (/\b(ingreso|ingresos|recaudacion|recaudado|asistente|asistentes|entrada|entradas|socio|socios|banco|bizum|efectivo)\b/.test(p)) mods.add('INGRESOS');
  if (/\b(donacion|donaciones|donado|donados|donante|donantes)\b/.test(p)) mods.add('DONACIONES');
  if (/\b(compra|compras|gasto|gastos|comprado|coste|costes|precio|precios|tienda|tiendas|producto|productos|articulo|articulos|pte|pendiente)\b/.test(p)) mods.add('COMPRAS');
  if (/\b(ticket|tickets|tk\s*\d+|factura|facturas)\b/.test(p)) { mods.add('TICKETS'); mods.add('COMPRAS'); }
  if (/\b(evento|eventos|fecha|fechas|situacion|finalizado|curso|precio\s+entrada|doc\s*\d+)\b/.test(p)) mods.add('EVENTOS');
  if (/\b(documento|documentos|doc\s*\d+|descripcion|archivo)\b/.test(p)) { mods.add('DOCUMENTOS'); mods.add('EVENTOS'); }
  if (/\b(catalogo|catálogo|productos|producto|segmento|destino|precio\s+referencia|precio\s+habitual)\b/.test(p)) mods.add('PRODUCTOS');
  if (/\b(tienda|tiendas)\b/.test(p)) mods.add('TIENDAS');
  if (/\b(persona|personas|responsable|responsables|donante|donantes|colaborador|colaboradores|socio|socios)\b/.test(p)) mods.add('PERSONAS');
  if (/\b(valoracion|valoración|dashboard|grafica|gráfica|estadistica|estadística|comparativa|compara|comparar)\b/.test(p)) ['EVENTOS','INGRESOS','COMPRAS','DONACIONES'].forEach(m=>mods.add(m));
  if (!mods.size) ['EVENTOS'].forEach(m=>mods.add(m));
  return [...mods].filter(m => ZUZU_ALLOWED_MODULES.includes(m));
}
function zuzuDetectNamedFilters(prompt, state, eventIds = []) {
  const p = norm(prompt);
  const pf = zuzuPromptWithoutEventTitles(prompt, state, eventIds);
  const hasPersonCue = zuzuHasCue(prompt, ['persona','personas','colaborador','colaboradores','socio','socios','donante','donantes','responsable','responsables','ingreso','ingresos','recaudacion','recaudado']);
  const hasProductCue = zuzuHasCue(prompt, ['producto','productos','articulo','articulos','compra','compras','comprado','donacion','donaciones','donado','precio','coste','unidades']);
  const hasStoreCue = zuzuHasCue(prompt, ['tienda','tiendas','almacen','almacén','supermercado','bar','proveedor']);
  function namesFrom(rows, promptNorm, requireCue) {
    if (requireCue === true && !promptNorm) return [];
    return arr(rows).map(r => trim(r?.nombre)).filter(Boolean).filter(n => {
      const nn = norm(n);
      if (!nn || nn.length < 3) return false;
      if (promptNorm.includes(nn)) return true;
      return words(n, { min: 4, keepStop: true }).some(w => new RegExp('\\b' + zuzuEscapeRegExp(w) + '\\b').test(promptNorm));
    });
  }
  const tickets = [];
  const tkRe = /\bTK\s*\d+[A-Z0-9_-]*\b/gi; let m; while ((m = tkRe.exec(prompt))) tickets.push(m[0].replace(/\s+/g,'').toUpperCase());
  return {
    personas: hasPersonCue ? namesFrom(state?.personas, pf, true) : [],
    productos: hasProductCue ? namesFrom(state?.productos, pf, true) : [],
    tiendas: hasStoreCue ? namesFrom(state?.tiendas, pf, true) : [],
    tickets
  };
}
export function buildZuzuPlanningCatalog(state, selectedEventId = '') {
  const events = arr(state?.eventos).map(e => ({ id: trim(e?.id), titulo: trim(e?.titulo), situacion: trim(e?.situacion), fechaInicio: trim(e?.fechaIni), fechaFin: trim(e?.fechaFin), precioEntrada: round(e?.precio, 2) }));
  const selected = events.find(e => e.id === trim(selectedEventId)) || null;
  return {
    version: 'ControlEvent Zuzu Planner v11_3_2_prod',
    modulosDisponibles: ZUZU_ALLOWED_MODULES,
    camposPorModulo: {
      INGRESOS: ['Evento','Nombre','Numero','Importe obligatorio','Importe voluntario','Ingreso','Just.ing'],
      DONACIONES: ['Evento','Producto','Unidades','Precio','Valor','Tipo de donación','Donante','Responsable'],
      COMPRAS: ['Evento','Producto','Unidades','Precio','Importe','Ticket u otros gastos','Tienda','Responsable','Ticket SI/NO'],
      EVENTOS: ['Titulo del evento','Precio','fecha ini','fecha fin','Estado','DOCxxx','Fecha documento','Descripcion documento'],
      PRODUCTOS: ['Nombre producto','Segmento','Destino','Precio rfa.'],
      TIENDAS: ['Nombre tienda'],
      PERSONAS: ['Nombre persona','Rango'],
      TICKETS: ['TKxx','Tienda','Responsable','Total ticket','Nº líneas','Ticket SI/NO','Líneas contables'],
      DOCUMENTOS: ['DOCxxx','Evento','Fecha','Descripcion','Tiene imagen']
    },
    eventoActivo: selected,
    eventos: events,
    catalogoNombres: {
      personas: arr(state?.personas).map(p => trim(p?.nombre)).filter(Boolean).slice(0, 500),
      productos: arr(state?.productos).map(p => trim(p?.nombre)).filter(Boolean).slice(0, 800),
      tiendas: arr(state?.tiendas).map(t => trim(t?.nombre)).filter(Boolean).slice(0, 300)
    }
  };
}
export function buildZuzuLocalPlan(state, selectedEventId = '', userPrompt = '') {
  const eventos = zuzuFindEventIds(arr(state?.eventos), selectedEventId, userPrompt, {});
  const filters = zuzuDetectNamedFilters(userPrompt, state, eventos);
  return {
    ok: true,
    needsClarification: false,
    modules: zuzuInferModulesLocal(userPrompt),
    eventos,
    todosLosEventos: /\b(eventos\s+registrados|todos\s+los\s+eventos|todos\s+los\s+registrados)\b/i.test(userPrompt),
    filters,
    reasoning: 'Plan local de respaldo generado por ControlEvent. Prioriza evento y filtros detectados localmente para no recortar registros reales por una deducción incorrecta de Gemini.'
  };
}
function humanOrFallback(value, fallback) {
  const v = trim(value);
  if (!v || /^id-[a-z0-9_-]+$/i.test(v) || /^[A-Z]:id-/i.test(v)) return fallback;
  return v;
}
function zuzuCleanDonorRef(ref) {
  const raw = trim(ref);
  const clean = raw.replace(/^[A-Za-z]+:/, '');
  return { raw, clean };
}
function zuzuResolveDonorByType(ref, tipoDonacion, helpers) {
  const { raw, clean } = zuzuCleanDonorRef(ref);
  if (!raw) return 'Sin donante';
  const donorType = trim(tipoDonacion).toUpperCase();
  const pName = humanOrFallback(helpers.people.get(clean)?.nombre, '');
  const tName = humanOrFallback(helpers.stores.get(clean)?.nombre, '');
  const freeText = /^([A-Za-z]+:)?id-/i.test(raw) ? '' : raw;
  if (donorType === 'DONADO TIENDA') return tName || pName || freeText || 'Donante no encontrado en maestro';
  if (donorType === 'DONADO SOCIO' || donorType === 'DONADO OTROS') return pName || tName || freeText || 'Donante no encontrado en maestro';
  return pName || tName || freeText || 'Donante no encontrado en maestro';
}
function zuzuResolveDonor(ref, helpers) {
  return zuzuResolveDonorByType(ref, '', helpers);
}
function zuzuPaymentLabel(value) {
  const raw = trim(value);
  const u = raw.toUpperCase();
  if (u.includes('BANCO')) return 'BANCO';
  if (u.includes('BIZUM')) return 'BIZUM';
  if (u.includes('EFECTIVO')) return 'EFECTIVO';
  if (u.includes('PEND')) return 'PENDIENTE';
  return u || 'PENDIENTE';
}
function zuzuHumanPerson(id, helpers, fallback = 'Sin responsable') {
  return humanOrFallback(helpers.people.get(trim(id))?.nombre, fallback);
}
function zuzuHumanStore(id, helpers, fallback = 'Sin tienda') {
  return humanOrFallback(helpers.stores.get(trim(id))?.nombre, fallback);
}
function zuzuHumanProduct(id, helpers, fallback = 'Sin producto') {
  return humanOrFallback(helpers.products.get(trim(id))?.nombre, fallback);
}
function zuzuProductSegment(id, helpers) { return trim(helpers.products.get(trim(id))?.segmento || ''); }
function zuzuProductDestino(id, helpers) { return trim(helpers.products.get(trim(id))?.destino || ''); }
function zuzuQueryFilterRows(rows, filters, matcher, moduleName) {
  const list = arr(rows);
  if (!filters || !Object.values(filters).some(v => arr(v).length)) return list;
  return list.filter(row => {
    if (filters.productos?.length) {
      const prod = row.Producto || row['Nombre producto'] || '';
      if (!matcher.productMatches(prod)) return false;
    }
    if (filters.tiendas?.length) {
      const tienda = row.Tienda || row['Nombre tienda'] || (moduleName === 'DONACIONES' ? row.Donante : '');
      if (!matcher.storeMatches(tienda)) return false;
    }
    if (filters.tickets?.length) {
      const tk = row['Ticket u otros gastos'] || row.TKxx || row['TKxx, GASTOS CORRIENTES o Pte. Compra'] || '';
      if (!matcher.ticketMatches(tk)) return false;
    }
    if (filters.personas?.length || filters.responsables?.length || filters.donantes?.length) {
      const peopleText = [row.Nombre, row['Nombre persona'], row.Colaborador, row.Responsable, row.Donante].filter(Boolean).join(' ');
      if (!matcher.peopleMatches(peopleText)) return false;
    }
    return true;
  });
}
function zuzuModuleIngresos(state, eventIds, filters, helpers, ticketImages) {
  const evById = byId(state?.eventos);
  const matcher = zuzuBuildFilterMatcher({ filters }, '', state, helpers);
  const rows = [];
  arr(state?.colaboradores).forEach(row => {
    const evId = rowEventId(row); if (!eventIds.includes(evId)) return;
    const ev = evById.get(evId) || {};
    const personaId = rowPersonaId(row);
    const amounts = zuzuIncomeAmounts(row, ev, helpers);
    rows.push({
      Evento: trim(ev?.titulo) || 'Sin evento',
      Nombre: zuzuHumanPerson(personaId, helpers, 'Sin nombre'),
      Numero: amounts.numero,
      'Importe obligatorio': amounts.obligatorio,
      'Importe voluntario': amounts.voluntario,
      Ingreso: zuzuPaymentLabel(row?.situacion || row?.formaPago || row?.ingreso),
      Rango: amounts.rango,
      'Just.ing': hasImage(ticketImages, evId, `INGRESO:${row?.id}`) ? 'Si' : 'No'
    });
  });
  return zuzuQueryFilterRows(rows, filters, matcher, 'INGRESOS');
}
function zuzuModuleCompras(state, eventIds, filters, helpers, ticketImages, onlyDonations = false) {
  const evById = byId(state?.eventos);
  const matcher = zuzuBuildFilterMatcher({ filters }, '', state, helpers);
  const rows = [];
  arr(state?.compras).forEach(row => {
    const evId = rowEventId(row); if (!eventIds.includes(evId)) return;
    const ev = evById.get(evId) || {};
    const rawTicket = ticketText(row);
    const donation = isDonationTicket(rawTicket);
    if (onlyDonations && !donation) return;
    if (!onlyDonations && donation) return;
    const pId = rowProductoId(row);
    const tId = rowTiendaId(row);
    const rId = rowResponsableId(row);
    const evento = trim(ev?.titulo) || 'Sin evento';
    const producto = zuzuHumanProduct(pId, helpers, 'Sin producto');
    const unidades = round(row?.unidades, 3);
    const precio = round(row?.precio, 4);
    const importe = valueOfLine(row);
    const responsable = zuzuHumanPerson(rId, helpers, 'Sin responsable');
    if (donation) {
      const tipo = trim(rawTicket).toUpperCase();
      rows.push({
        Evento: evento,
        Producto: producto,
        Unidades: unidades,
        Precio: precio,
        Valor: importe,
        'Tipo de donación': tipo,
        Donante: zuzuResolveDonorByType(rowDonorRef(row), tipo, helpers),
        Responsable: responsable
      });
    } else {
      let etiqueta = 'GASTOS CORRIENTES';
      if (isPendingTicket(rawTicket)) etiqueta = 'Pte. Compra';
      else if (ticketToken(rawTicket)) etiqueta = ticketToken(rawTicket);
      else if (trim(rawTicket)) etiqueta = trim(rawTicket);
      rows.push({
        Evento: evento,
        Producto: producto,
        Unidades: unidades,
        Precio: precio,
        Importe: importe,
        'Ticket u otros gastos': etiqueta,
        Tienda: zuzuHumanStore(tId, helpers, 'Sin tienda'),
        Responsable: responsable,
        'Ticket SI/NO': (ticketToken(rawTicket) && hasImage(ticketImages, evId, rawTicket)) ? 'SI' : 'NO'
      });
    }
  });
  return zuzuQueryFilterRows(rows, filters, matcher, onlyDonations ? 'DONACIONES' : 'COMPRAS');
}
function zuzuModuleEventos(state, eventIds, ticketImages) {
  const docsByEvent = new Map();
  arr(state?.eventDocuments).forEach(d => {
    const evId = rowEventId(d); if (!evId) return;
    if (!docsByEvent.has(evId)) docsByEvent.set(evId, []);
    docsByEvent.get(evId).push(d);
  });
  const rows = [];
  arr(state?.eventos).filter(ev => eventIds.includes(trim(ev?.id))).forEach(ev => {
    const evId = trim(ev?.id);
    const base = {
      'Titulo del evento': trim(ev?.titulo) || 'Sin evento',
      Precio: round(ev?.precio, 2),
      'fecha ini': trim(ev?.fechaIni),
      'fecha fin': trim(ev?.fechaFin),
      Estado: trim(ev?.situacion || 'En curso')
    };
    const docs = docsByEvent.get(evId) || [];
    if (!docs.length) rows.push({ ...base, DOCxxx: '', 'Fecha documento': '', 'Descripcion documento': '', 'Documento con imagen': '' });
    else docs.forEach(d => {
      const code = docCode(d?.codigo || d?.imageKey || d?.id) || trim(d?.codigo || d?.imageKey || 'DOC');
      rows.push({ ...base, DOCxxx: code, 'Fecha documento': trim(d?.fecha || ''), 'Descripcion documento': trim(d?.descripcion || d?.texto || ''), 'Documento con imagen': (hasImage(ticketImages, evId, code) || !!trim(d?.imageUrl || '')) ? 'SI' : 'NO' });
    });
  });
  return rows;
}
function zuzuModuleTickets(state, eventIds, filters, helpers, ticketImages) {
  const evById = byId(state?.eventos);
  const matcher = zuzuBuildFilterMatcher({ filters }, '', state, helpers);
  const groups = new Map();
  arr(state?.compras).forEach(row => {
    const evId = rowEventId(row); if (!eventIds.includes(evId)) return;
    const ticket = ticketText(row); const tk = ticketToken(ticket); if (!tk || isDonationTicket(ticket) || isPendingTicket(ticket)) return;
    const pId = rowProductoId(row);
    const tId = rowTiendaId(row);
    const rId = rowResponsableId(row);
    const key = `${evId}|${tk}`;
    if (!groups.has(key)) groups.set(key, { Evento: trim(evById.get(evId)?.titulo) || 'Sin evento', TKxx: tk, Tienda: zuzuHumanStore(tId, helpers, 'Sin tienda'), Responsable: zuzuHumanPerson(rId, helpers, 'Sin responsable'), 'Total ticket': 0, 'Nº líneas': 0, 'Ticket SI/NO': hasImage(ticketImages, evId, ticket) ? 'SI' : 'NO', 'Líneas contables': [] });
    const g = groups.get(key);
    const line = { Producto: zuzuHumanProduct(pId, helpers, 'Sin producto'), Segmento: zuzuProductSegment(pId, helpers), Destino: zuzuProductDestino(pId, helpers), Unidades: round(row?.unidades,3), Precio: round(row?.precio,4), Importe: valueOfLine(row) };
    g['Total ticket'] = round(g['Total ticket'] + line.Importe, 2); g['Nº líneas'] += 1; g['Líneas contables'].push(line);
  });
  return zuzuQueryFilterRows([...groups.values()].filter(g => g['Nº líneas'] > 0), filters, matcher, 'TICKETS');
}
function zuzuModuleDocumentos(state, eventIds, ticketImages) {
  const evById = byId(state?.eventos);
  return arr(state?.eventDocuments).filter(d => eventIds.includes(rowEventId(d))).map(d => {
    const evId = rowEventId(d); const code = docCode(d?.codigo || d?.imageKey || d?.id) || trim(d?.codigo || d?.imageKey || 'DOC');
    return { DOCxxx: code, Evento: trim(evById.get(evId)?.titulo) || 'Sin evento', Fecha: trim(d?.fecha || ''), Descripcion: trim(d?.descripcion || d?.texto || ''), 'Tiene imagen': (hasImage(ticketImages, evId, code) || !!trim(d?.imageUrl || '')) ? 'SI' : 'NO' };
  });
}
function zuzuModuleProductos(state, filters, helpers) {
  const matcher = zuzuBuildFilterMatcher({ filters }, '', state, helpers);
  const rows = arr(state?.productos).map(p => ({ 'Nombre producto': trim(p?.nombre), Segmento: trim(p?.segmento), Destino: trim(p?.destino), 'Precio rfa.': round(p?.defaultPrecio ?? p?.precio, 4) }))
    .filter(p => p['Nombre producto']);
  return zuzuQueryFilterRows(rows, filters, matcher, 'PRODUCTOS');
}
function zuzuModuleTiendas(state, filters, helpers) {
  const matcher = zuzuBuildFilterMatcher({ filters }, '', state, helpers);
  const rows = arr(state?.tiendas).map(t => ({ 'Nombre tienda': trim(t?.nombre) })).filter(t => t['Nombre tienda']);
  return zuzuQueryFilterRows(rows, filters, matcher, 'TIENDAS');
}
function zuzuModulePersonas(state, filters, helpers) {
  const matcher = zuzuBuildFilterMatcher({ filters }, '', state, helpers);
  const rows = arr(state?.personas).map(p => ({ 'Nombre persona': trim(p?.nombre), Rango: trim(p?.rango || '').toUpperCase() })).filter(p => p['Nombre persona']);
  return zuzuQueryFilterRows(rows, filters, matcher, 'PERSONAS');
}

function zuzuModuleRawExpected(state, moduleName, eventIds) {
  if (moduleName === 'INGRESOS') return arr(state?.colaboradores).filter(r => eventIds.includes(rowEventId(r))).length;
  if (moduleName === 'COMPRAS') return arr(state?.compras).filter(r => eventIds.includes(rowEventId(r)) && !isDonationTicket(ticketText(r))).length;
  if (moduleName === 'DONACIONES') return arr(state?.compras).filter(r => eventIds.includes(rowEventId(r)) && isDonationTicket(ticketText(r))).length;
  if (moduleName === 'TICKETS') {
    const tks = new Set();
    arr(state?.compras).forEach(r => { const evId = rowEventId(r); const tk = ticketToken(ticketText(r)); if (eventIds.includes(evId) && tk && !isDonationTicket(ticketText(r)) && !isPendingTicket(ticketText(r))) tks.add(`${evId}|${tk}`); });
    return tks.size;
  }
  if (moduleName === 'DOCUMENTOS') return arr(state?.eventDocuments).filter(r => eventIds.includes(rowEventId(r))).length;
  if (moduleName === 'EVENTOS') return arr(state?.eventos).filter(e => eventIds.includes(trim(e?.id))).length;
  if (moduleName === 'PRODUCTOS') return arr(state?.productos).filter(p => trim(p?.nombre)).length;
  if (moduleName === 'TIENDAS') return arr(state?.tiendas).filter(t => trim(t?.nombre)).length;
  if (moduleName === 'PERSONAS') return arr(state?.personas).filter(p => trim(p?.nombre)).length;
  return 0;
}
function zuzuFilterSummary(filters) {
  const out = {};
  ['personas','productos','tiendas','responsables','donantes','tickets'].forEach(k => {
    const v = zuzuUnique(arr(filters?.[k]).map(trim).filter(Boolean));
    if (v.length) out[k] = v;
  });
  return out;
}
function zuzuBuildModuleAudit(state, eventIds, filters, modulos) {
  const filterSummary = zuzuFilterSummary(filters);
  const filtrosAplicados = Object.keys(filterSummary).length > 0;
  return Object.entries(modulos || {}).map(([moduleName, rows]) => {
    const esperadoSinFiltros = zuzuModuleRawExpected(state, moduleName, eventIds);
    const extraidos = arr(rows).length;
    return {
      modulo: moduleName,
      registrosFuenteSinFiltros: esperadoSinFiltros,
      registrosEntregados: extraidos,
      filtrosAplicados,
      filtros: filterSummary,
      ok: filtrosAplicados ? extraidos <= esperadoSinFiltros : extraidos === esperadoSinFiltros || moduleName === 'EVENTOS'
    };
  });
}
export function buildZuzuModuleContext(state, selectedEventId = '', userPrompt = '', plan = null) {
  const safeState = state && typeof state === 'object' ? state : {};
  const events = arr(safeState.eventos);
  if (!events.length) return { needsClarification: true, clarification: 'No hay eventos disponibles para analizar. Debes cargar o seleccionar un evento antes de usar Zuzu.' };
  const selectedId = trim(selectedEventId || safeState.selectedEventId);
  const localPlan = buildZuzuLocalPlan(safeState, selectedId, userPrompt);
  const p = plan && typeof plan === 'object' ? plan : localPlan;
  if (p.needsClarification && !localPlan.modules?.length) return { needsClarification: true, clarification: p.clarification || 'Debes ser más concreto en tu petición. Piensa un poco más lo que quieres.' };
  const modules = zuzuUnique([].concat(arr(localPlan.modules), arr(p.modules || p.modulos)).map(zuzuUpperModule)).filter(m => ZUZU_ALLOWED_MODULES.includes(m));
  if (!modules.length) return { needsClarification: true, clarification: 'Debes ser más concreto en tu petición. Piensa un poco más lo que quieres: indica si quieres ingresos, compras, donaciones, tickets, documentos, productos, tiendas, personas o eventos.' };
  const helpers = makeHelpers(safeState);
  const ticketImages = safeState.ticketImages || safeState.ticketImageRefs || {};
  const localEventIds = arr(localPlan.eventos).map(trim).filter(Boolean);
  const planEventIds = zuzuFindEventIds(events, selectedId, userPrompt, p);
  const eventIds = localEventIds.length ? localEventIds : planEventIds;
  if (!eventIds.length && modules.some(m => ['EVENTOS','INGRESOS','DONACIONES','COMPRAS','TICKETS','DOCUMENTOS'].includes(m))) {
    return { needsClarification: true, clarification: 'Debes ser más concreto en tu petición. Piensa un poco más lo que quieres: no he podido identificar el evento o eventos objetivo.' };
  }
  // v11_3_2: los filtros que reducen líneas deben salir de detección local verificable en catálogos reales.
  // No se aplican filtros inventados por el planificador IA, porque podían recortar compras/donaciones reales.
  const filters = zuzuSanitizeFiltersForPrompt(userPrompt, modules, localPlan.filters || {});
  const modulos = {};
  if (modules.includes('EVENTOS')) modulos.EVENTOS = zuzuModuleEventos(safeState, eventIds, ticketImages);
  if (modules.includes('INGRESOS')) modulos.INGRESOS = zuzuModuleIngresos(safeState, eventIds, filters, helpers, ticketImages);
  if (modules.includes('DONACIONES')) modulos.DONACIONES = zuzuModuleCompras(safeState, eventIds, filters, helpers, ticketImages, true);
  if (modules.includes('COMPRAS')) modulos.COMPRAS = zuzuModuleCompras(safeState, eventIds, filters, helpers, ticketImages, false);
  if (modules.includes('TICKETS')) modulos.TICKETS = zuzuModuleTickets(safeState, eventIds, filters, helpers, ticketImages);
  if (modules.includes('DOCUMENTOS')) modulos.DOCUMENTOS = zuzuModuleDocumentos(safeState, eventIds, ticketImages);
  if (modules.includes('PRODUCTOS')) modulos.PRODUCTOS = zuzuModuleProductos(safeState, filters, helpers);
  if (modules.includes('TIENDAS')) modulos.TIENDAS = zuzuModuleTiendas(safeState, filters, helpers);
  if (modules.includes('PERSONAS')) modulos.PERSONAS = zuzuModulePersonas(safeState, filters, helpers);
  const eventRows = arr(safeState.eventos).filter(e => eventIds.includes(trim(e?.id))).map(e => ({ 'Titulo del evento': trim(e?.titulo), Precio: round(e?.precio, 2), 'fecha ini': trim(e?.fechaIni), 'fecha fin': trim(e?.fechaFin), Estado: trim(e?.situacion || 'En curso') }));
  const totals = Object.fromEntries(Object.entries(modulos).map(([k,v]) => [k, arr(v).length]));
  const auditoriaModulos = zuzuBuildModuleAudit(safeState, eventIds, filters, modulos);
  const advertenciasAuditoria = auditoriaModulos.filter(a => !a.filtrosAplicados && a.registrosEntregados !== a.registrosFuenteSinFiltros && a.modulo !== 'EVENTOS')
    .map(a => `Auditoría ${a.modulo}: fuente sin filtros ${a.registrosFuenteSinFiltros}, entregados ${a.registrosEntregados}. Revisar mapeo si no coincide.`);
  const context = {
    versionContexto: 'ControlEvent Zuzu Modules v11_3_2_prod',
    generatedAt: new Date().toISOString(),
    seguridad: { modo: 'solo lectura', nota: 'Gemini no consulta Supabase, no ejecuta SQL y no modifica datos. ControlEvent entrega módulos completos y humanizados.' },
    promptUsuario: trim(userPrompt).slice(0, 3000),
    planZuzu: { modules, eventosObjetivo: eventRows.map(e => e['Titulo del evento']), filtrosHumanos: filters, razonamiento: trim(p.reasoning || p.razonamiento || localPlan.reasoning || '') },
    eventosObjetivo: eventRows,
    modulosExtraidos: modulos,
    totalesRegistrosPorModulo: totals,
    auditoriaModulos,
    instruccionesFuncionalesZuzu: [
      { id: 'EXP-1-ALCANCE-EVENTOS', regla: 'Si el usuario cita eventos entre comillas, solo se usan esos eventos. No se añaden eventos parecidos por ordinal, fecha o palabras comunes.' },
      { id: 'EXP-2-COMPARATIVA-EVENTOS', regla: 'Una comparativa entre eventos debe calcular una fila por evento y por módulo solicitado. Está prohibido mezclar datos de eventos no citados.' },
      { id: 'EXP-3-CALCULO-DETERMINISTICO', regla: 'Sumas, conteos, agrupaciones, porcentajes y gráficas básicas se calculan en ControlEvent sobre los registros extraídos. Gemini solo puede redactar o interpretar, nunca sustituir la aritmética oficial.' },
      { id: 'EXP-4-AUDITORIA', regla: 'Toda respuesta de diagnóstico debe indicar eventos detectados, módulos, registros extraídos y filtros aplicados.' }
    ],
    instrucciones: {
      veracidad: 'Usa exclusivamente modulosExtraidos. Si un módulo no está presente, no inventes sus datos.',
      ingresos: 'INGRESOS usa la salida probada: Evento; Nombre; Numero; Importe obligatorio; Importe voluntario; Ingreso; Just.ing. En socios, Importe obligatorio = Numero * Precio del evento.',
      compras: 'COMPRAS usa la salida probada: Evento; Producto; Unidades; Precio; Importe; Ticket u otros gastos; Tienda; Responsable. Excluye DONADO SOCIO/TIENDA/OTROS.',
      donaciones: 'DONACIONES usa la salida probada: Evento; Producto; Unidades; Precio; Valor; Tipo de donación; Donante; Responsable. El donante se resuelve por P:/T:/id contra personas o tiendas y nunca debe mostrarse como código técnico.',
      tickets: 'TICKETS contiene datos contables agrupados por TKxx y sus líneas contables.',
      legibilidad: 'No hay claves internas p_id/pr_id/t_id; todos los nombres son texto humano.'
    },
    advertencias: advertenciasAuditoria
  };
  const bytes = estimateContextSize(context);
  context.planZuzu.contextoEstimadoBytes = bytes;
  const broad = isVeryBroad(userPrompt) || (!Object.values(filters).some(v => arr(v).length) && eventIds.length > 2 && modules.length > 2);
  if (bytes > 850000 || (bytes > 550000 && broad)) {
    return { needsClarification: true, clarification: 'Debes ser más concreto en tu petición. Piensa un poco más lo que quieres.', warnings: [`El volumen de datos para ${modules.join(', ')} y ${eventIds.length} evento(s) es demasiado grande: ${bytes} bytes. Indica evento, persona, producto, tienda, responsable, ticket o módulo concreto.`], planZuzu: context.planZuzu };
  }
  return context;
}
