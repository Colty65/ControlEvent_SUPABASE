/* ControlEvent v11.2_prod - Motor seguro de contexto para Zuzu / Analítica libre.
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
function ticketText(row) { return trim(row?.ticketDonacion ?? row?.ticket_donacion ?? row?.ticket ?? row?.ticketOtrosGastos ?? ''); }
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
  const personaId = trim(row?.personaId || row?.persona_id);
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

function eventScore(ev, prompt) {
  const p = norm(prompt);
  const title = norm(ev?.titulo);
  if (!p || !title) return 0;
  let score = 0;
  if (p.includes(title)) score += 160;
  const titleNoSuffix = title.replace(/\b(dic|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov)\s*\d{2,4}\b/g, '').replace(/\s+/g, ' ').trim();
  if (titleNoSuffix && p.includes(titleNoSuffix)) score += 120;
  const pWords = p.split(' ');
  const tWords = title.split(' ');
  const romans = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
  romans.forEach(r => { if (tWords.includes(r) && pWords.includes(r)) score += 55; });
  for (const w of words(ev?.titulo)) if (pWords.includes(w)) score += w.length >= 5 ? 16 : 7;
  const code = norm(ev?.eventoCodigo || ev?.codigoEvento || ev?.codigo || '');
  if (code && p.includes(code)) score += 60;
  return score;
}
function mostRecentEventIds(events, n = 1) {
  return arr(events).map(ev => ({ id: trim(ev?.id), date: parseEventDate(ev) })).filter(x => x.id)
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
  const scored = arr(events)
    .map(ev => ({ id: trim(ev?.id), titulo: trim(ev?.titulo), score: eventScore(ev, prompt), date: parseEventDate(ev) }))
    .filter(x => x.id && x.score >= 35)
    .sort((a, b) => b.score - a.score || b.date - a.date);
  const out = [];
  function push(id) { if (id && !out.includes(id)) out.push(id); }
  scored.forEach(x => push(x.id));
  if (/\b(mas\s+reciente|ultimo|ultima|reciente|actual)\b/.test(norm(prompt))) mostRecentEventIds(events, 1).forEach(push);
  if (!out.length && selectedId) push(selectedId);
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
    versionContexto: 'ControlEvent EventContext v11.2_prod - Zuzu contexto completo selectivo',
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
