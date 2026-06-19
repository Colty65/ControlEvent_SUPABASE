/* ControlEvent v11.1_prod - Motor seguro de contexto para Gemini libre.
   SOLO LECTURA: prepara datos calculados y saneados. Gemini NO ejecuta SQL ni toca BBDD. */

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
  return (s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s).toLowerCase().replace(/[^a-z0-9]+/gi, ' ').replace(/\s+/g, ' ').trim();
}
function words(value) {
  const stop = new Set(['de','del','la','el','las','los','y','vs','contra','con','sin','para','por','un','una','jornada','jornadas','solidaria','solidarias']);
  return norm(value).split(' ').filter(w => w.length >= 3 && !stop.has(w));
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
function topN(map, n = 20) {
  return [...map.entries()].sort((a, b) => num(b[1]) - num(a[1])).slice(0, n).map(([nombre, valor]) => ({ nombre, valor: round(valor, 2) }));
}
function topQtyCost(map, sortBy = 'importe', n = 20) {
  return [...map.entries()].sort((a, b) => num(b[1]?.[sortBy]) - num(a[1]?.[sortBy])).slice(0, n).map(([nombre, v]) => ({ nombre, unidades: round(v.unidades, 3), importe: round(v.importe, 2) }));
}
function valueOfLine(row) { return round(num(row?.unidades) * num(row?.precio), 2); }
function ticketText(row) { return trim(row?.ticketDonacion ?? row?.ticket_donacion ?? row?.ticket ?? row?.ticketOtrosGastos ?? ''); }
function ticketToken(value) { const m = trim(value).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i); return m ? m[0].replace(/\s+/g, '').toUpperCase() : ''; }
function isDonationTicket(value) { return /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(trim(value)); }
function isPendingTicket(value) { return /PTE\.?\s*COMPRA|PENDIENTE/i.test(trim(value)); }
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
function moneyByTicketKind(value) {
  const raw = trim(value);
  if (isDonationTicket(raw)) return 'DONACION_PRODUCTO';
  if (isPendingTicket(raw)) return 'PTE_COMPRA';
  return 'COMPRA_REAL';
}
function firstNumber(row, keys, fallback = 0) {
  for (const key of keys) if (row && row[key] !== undefined && row[key] !== null && trim(row[key]) !== '') return num(row[key]);
  return fallback;
}

function makeHelpers(state) {
  const people = byId(state?.personas);
  const stores = byId(state?.tiendas);
  const products = byId(state?.productos);
  return {
    people, stores, products,
    personName(id) { return trim(people.get(trim(id))?.nombre || id || 'Sin responsable'); },
    personRange(id) { return trim(people.get(trim(id))?.rango || ''); },
    storeName(id) { return trim(stores.get(trim(id))?.nombre || id || 'Sin tienda'); },
    productName(id) { return trim(products.get(trim(id))?.nombre || id || 'Sin producto'); },
    productSegment(id) { return trim(products.get(trim(id))?.segmento || ''); },
    productDestino(id) { return trim(products.get(trim(id))?.destino || ''); },
    productDefaultPrecio(id) { return round(products.get(trim(id))?.defaultPrecio ?? products.get(trim(id))?.precio ?? 0, 4); }
  };
}

function incomeParts(row, ev, helpers) {
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
    personaId,
    tipoPersona: socio ? 'SOCIO' : (rangoRaw || 'NO SOCIO / OTRO'),
    esSocio: socio,
    numero: round(numero, 3),
    formaPago: trim(row?.situacion || row?.formaPago || row?.ingreso || 'Pendiente') || 'Pendiente',
    importeObligatorioSocios,
    importeVoluntarioONoSocio: round(importeVoluntario, 2),
    importeTotalCalculado: total,
    importeCampoBBDD: round(row?.importe, 2),
    justificante: false
  };
}

function summarizeIngresos(rows, ev, helpers, ticketImages) {
  const byForma = new Map(), byTipo = new Map(), byColaborador = new Map();
  let total = 0, socios = 0, noSocios = 0, obligatorio = 0, voluntario = 0, entradas = 0;
  const detail = arr(rows).map(row => {
    const p = incomeParts(row, ev, helpers);
    p.justificante = hasImage(ticketImages, row?.eventId || ev?.id, `INGRESO:${row?.id}`);
    total += p.importeTotalCalculado; entradas += p.numero; voluntario += p.importeVoluntarioONoSocio; obligatorio += p.importeObligatorioSocios;
    if (p.esSocio) socios += p.importeTotalCalculado; else noSocios += p.importeTotalCalculado;
    add(byForma, p.formaPago, p.importeTotalCalculado); add(byTipo, p.tipoPersona, p.importeTotalCalculado); add(byColaborador, p.colaborador, p.importeTotalCalculado);
    return p;
  });
  return {
    ingresosTotal: round(total, 2), ingresosSocios: round(socios, 2), ingresosNoSociosYOtros: round(noSocios, 2),
    importeObligatorioSocios: round(obligatorio, 2), importeVoluntarioONoSocio: round(voluntario, 2), entradasTotal: round(entradas, 3),
    numeroLineas: detail.length, conJustificante: detail.filter(x => x.justificante).length,
    porFormaPago: topN(byForma, 30), porTipoPersona: topN(byTipo, 30), porColaborador: topN(byColaborador, 40),
    reglaCalculo: 'IngresosTotal = socios(numero * precioEntrada + voluntario) + noSocios/otros(importe registrado). No usar solo importeCampoBBDD si hay socios.',
    detalle: detail
  };
}

function summarizeCompras(rows, ev, helpers, ticketImages) {
  const reales = [], pendientes = [], donaciones = [];
  const byProductoCantidad = new Map(), byProductoCoste = new Map(), byTienda = new Map(), byResponsable = new Map(), bySegmento = new Map(), byDestino = new Map(), byTicket = new Map();
  let totalReales = 0, totalPendientes = 0, totalDonaciones = 0;
  const lineas = arr(rows).map(row => {
    const ticket = ticketText(row); const tipo = moneyByTicketKind(ticket); const importe = valueOfLine(row);
    const productoId = trim(row?.productoId || row?.producto_id); const tiendaId = trim(row?.tiendaId || row?.tienda_id); const responsableId = trim(row?.responsableId || row?.responsable_id);
    const out = {
      id: trim(row?.id), tipo, ticket, ticketToken: ticketToken(ticket),
      producto: helpers.productName(productoId), productoId,
      segmento: helpers.productSegment(productoId), destino: helpers.productDestino(productoId),
      unidades: round(row?.unidades, 3), precio: round(row?.precio, 4), importe,
      tienda: helpers.storeName(tiendaId), tiendaId,
      responsable: helpers.personName(responsableId), responsableId,
      donante: trim(row?.donorRef || ''),
      tieneFotoTicket: tipo === 'COMPRA_REAL' ? hasImage(ticketImages, ev?.id, ticket) : false
    };
    addQtyCost(byProductoCantidad, out.producto, out.unidades, out.importe); add(byProductoCoste, out.producto, out.importe);
    add(byTienda, out.tienda, out.importe); add(byResponsable, out.responsable, out.importe); add(bySegmento, out.segmento || 'Sin segmento', out.importe); add(byDestino, out.destino || 'Sin destino', out.importe);
    if (tipo === 'DONACION_PRODUCTO') { totalDonaciones += importe; donaciones.push(out); }
    else if (tipo === 'PTE_COMPRA') { totalPendientes += importe; pendientes.push(out); }
    else { totalReales += importe; reales.push(out); }
    if (out.ticketToken && tipo === 'COMPRA_REAL') {
      const key = out.ticketToken;
      const old = byTicket.get(key) || { ticket: key, tienda: out.tienda, responsable: out.responsable, total: 0, lineas: 0, tieneFoto: out.tieneFotoTicket, segmentos: new Map(), destinos: new Map(), productos: [] };
      old.total += importe; old.lineas += 1; old.tieneFoto = old.tieneFoto || out.tieneFotoTicket; add(old.segmentos, out.segmento || 'Sin segmento', importe); add(old.destinos, out.destino || 'Sin destino', importe);
      old.productos.push({ producto: out.producto, unidades: out.unidades, precio: out.precio, importe: out.importe, segmento: out.segmento, destino: out.destino });
      byTicket.set(key, old);
    }
    return out;
  });
  const tickets = [...byTicket.values()].sort((a,b) => a.ticket.localeCompare(b.ticket)).map(t => ({
    ticket: t.ticket, tienda: t.tienda, responsable: t.responsable, total: round(t.total, 2), numeroLineas: t.lineas, tieneFoto: !!t.tieneFoto,
    segmentos: topN(t.segmentos, 12), destinos: topN(t.destinos, 12), lineas: t.productos
  }));
  return {
    totalComprasReales: round(totalReales, 2), totalComprasPendientes: round(totalPendientes, 2), totalDonacionesProducto: round(totalDonaciones, 2),
    numeroLineasComprasReales: reales.length, numeroLineasPendientes: pendientes.length, numeroLineasDonaciones: donaciones.length,
    numeroTickets: tickets.length, ticketsConFoto: tickets.filter(t => t.tieneFoto).length, ticketsSinFoto: tickets.filter(t => !t.tieneFoto).length,
    rankings: {
      productosPorCantidad: topQtyCost(byProductoCantidad, 'unidades', 30), productosPorCoste: topQtyCost(byProductoCantidad, 'importe', 30),
      tiendasPorImporte: topN(byTienda, 30), responsablesPorImporte: topN(byResponsable, 30), segmentosPorImporte: topN(bySegmento, 30), destinosPorImporte: topN(byDestino, 30)
    },
    comprasReales: reales, comprasPendientes: pendientes, donacionesProducto: donaciones, tickets
  };
}

function summarizeDocs(rows, ev, ticketImages) {
  const docs = arr(rows).filter(d => trim(d?.eventId || d?.event_id) === trim(ev?.id)).map(doc => {
    const code = docCode(doc?.codigo || doc?.imageKey || doc?.id) || trim(doc?.codigo || doc?.imageKey || 'DOC');
    return {
      id: trim(doc?.id), codigo: code, fecha: trim(doc?.fecha || ''), descripcion: trim(doc?.descripcion || doc?.texto || ''),
      tieneImagen: hasImage(ticketImages, ev?.id, code) || !!trim(doc?.imageUrl || ''), recuperado: doc?.recovered === true
    };
  }).sort((a,b) => (a.fecha || '').localeCompare(b.fecha || '') || (a.codigo || '').localeCompare(b.codigo || ''));
  return { totalDocumentos: docs.length, conImagen: docs.filter(d => d.tieneImagen).length, sinImagen: docs.filter(d => !d.tieneImagen).length, documentos: docs };
}

function eventScore(ev, prompt) {
  const p = norm(prompt); const title = norm(ev?.titulo); if (!p || !title) return 0;
  let score = 0;
  if (p.includes(title)) score += 120;
  const titleNoSuffix = title.replace(/\b(dic|ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov)\s*\d{2,4}\b/g, '').replace(/\s+/g, ' ').trim();
  if (titleNoSuffix && p.includes(titleNoSuffix)) score += 90;
  const romans = ['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
  const tWords = title.split(' ');
  romans.forEach(r => { if (tWords.includes(r) && p.split(' ').includes(r)) score += 40; });
  for (const w of words(ev?.titulo)) if (p.split(' ').includes(w) || p.includes(w)) score += w.length >= 5 ? 9 : 4;
  const code = norm(ev?.eventoCodigo || ev?.codigo || ''); if (code && p.includes(code)) score += 30;
  return score;
}
function chooseRelevantEventIds(events, selectedId, prompt) {
  // v11.1 HOTFIX Analítica libre: Gemini debe disponer del detalle de TODOS los eventos.
  // No se da acceso a SQL ni a BBDD; simplemente se prepara un JSON de solo lectura con
  // todos los eventos ya calculados por ControlEvent. El orden prioriza evento activo y
  // eventos citados en el prompt, pero no elimina el resto.
  const ids = arr(events).map(ev => trim(ev?.id)).filter(Boolean);
  const selected = trim(selectedId);
  const scored = arr(events)
    .map(ev => ({ id: trim(ev?.id), score: eventScore(ev, prompt) }))
    .filter(x => x.id && x.score > 0)
    .sort((a,b) => b.score - a.score)
    .map(x => x.id);
  const out = [];
  function push(id){ if(id && !out.includes(id)) out.push(id); }
  push(selected);
  scored.forEach(push);
  ids.forEach(push);
  return out;
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
  if (compras.totalComprasPendientes > 0) avisos.push(`Hay compras pendientes por ${round(compras.totalComprasPendientes,2)} €.`);
  if (compras.ticketsSinFoto > 0) avisos.push(`Hay ${compras.ticketsSinFoto} ticket(s) sin foto asociada.`);
  const sinSegmento = compras.comprasReales.concat(compras.comprasPendientes, compras.donacionesProducto).filter(x => !trim(x.segmento)).length;
  const sinDestino = compras.comprasReales.concat(compras.comprasPendientes, compras.donacionesProducto).filter(x => !trim(x.destino)).length;
  if (sinSegmento) avisos.push(`${sinSegmento} línea(s) sin segmento.`);
  if (sinDestino) avisos.push(`${sinDestino} línea(s) sin destino.`);
  return {
    evento: { id: evId, titulo: trim(ev?.titulo), situacion: trim(ev?.situacion || 'En curso'), fechaIni: trim(ev?.fechaIni), fechaFin: trim(ev?.fechaFin), precioEntrada: round(ev?.precio, 2), descripcion: trim(ev?.descripcion || '') },
    resumenFinanciero: { ingresosTotal: ingresos.ingresosTotal, comprasReales: compras.totalComprasReales, donacionesProducto: compras.totalDonacionesProducto, comprasPendientes: compras.totalComprasPendientes, valoracionEvento: valoracion, formulaValoracion: 'valoracionEvento = ingresosTotal + donacionesProducto - comprasReales' },
    ingresos, compras, donaciones: { totalValorado: compras.totalDonacionesProducto, lineas: compras.donacionesProducto, rankings: { porProducto: topQtyCost(new Map(compras.donacionesProducto.map(x => [x.producto, { unidades: x.unidades, importe: x.importe }])), 'importe', 20) } },
    tickets: compras.tickets, documentos,
    avisosDatos: avisos
  };
}

export function buildEventAiContext(state, selectedEventId = '', userPrompt = '') {
  const safeState = state && typeof state === 'object' ? state : {};
  const events = arr(safeState.eventos);
  const helpers = makeHelpers(safeState);
  const ticketImages = safeState.ticketImages || safeState.ticketImageRefs || {};
  const selectedId = trim(selectedEventId || safeState.selectedEventId);
  const relevantIds = chooseRelevantEventIds(events, selectedId, userPrompt);
  const details = relevantIds.map(id => events.find(e => trim(e?.id) === id)).filter(Boolean).map(ev => buildEventDetail(ev, safeState, helpers, ticketImages));
  const globalIngresos = new Map(), globalCompras = new Map(), globalDonaciones = new Map(), globalValoracion = new Map();
  const resumenEventos = events.map(ev => {
    const d = buildEventDetail(ev, safeState, helpers, ticketImages);
    add(globalIngresos, d.evento.titulo, d.resumenFinanciero.ingresosTotal);
    add(globalCompras, d.evento.titulo, d.resumenFinanciero.comprasReales);
    add(globalDonaciones, d.evento.titulo, d.resumenFinanciero.donacionesProducto);
    add(globalValoracion, d.evento.titulo, d.resumenFinanciero.valoracionEvento);
    return {
      id: d.evento.id, titulo: d.evento.titulo, situacion: d.evento.situacion, fechas: `${d.evento.fechaIni} a ${d.evento.fechaFin}`, precioEntrada: d.evento.precioEntrada,
      ingresosTotal: d.resumenFinanciero.ingresosTotal, ingresosSocios: d.ingresos.ingresosSocios, ingresosNoSociosYOtros: d.ingresos.ingresosNoSociosYOtros,
      comprasReales: d.resumenFinanciero.comprasReales, donacionesProducto: d.resumenFinanciero.donacionesProducto, comprasPendientes: d.resumenFinanciero.comprasPendientes,
      valoracionEvento: d.resumenFinanciero.valoracionEvento, numeroTickets: d.compras.numeroTickets, numeroDocumentos: d.documentos.totalDocumentos,
      productoMasConsumidoCantidad: d.compras.rankings.productosPorCantidad[0] || null,
      productoMayorCoste: d.compras.rankings.productosPorCoste[0] || null
    };
  });
  return {
    versionContexto: 'ControlEvent EventContext v11.1_prod - analitica contexto completo',
    generatedAt: new Date().toISOString(),
    seguridad: {
      modo: 'solo lectura',
      prohibido: ['SQL directo', 'modificar BBDD', 'insertar', 'actualizar', 'borrar', 'leer credenciales', 'consultas ajenas al evento'],
      nota: 'Gemini solo recibe este JSON calculado por ControlEvent. No tiene conexión directa a Supabase ni permiso para ejecutar consultas.'
    },
    selectedEventId: selectedId,
    selectedEvent: details.find(d => d.evento.id === selectedId)?.evento || null,
    eventosResumen: resumenEventos,
    detalleEventosCompletos: details,
    detalleEventosRelevantes: details, // Alias histórico: desde este hotfix contiene TODOS los eventos, no solo seleccionados.
    resumenGlobal: { totalEventos: events.length, rankingIngresos: topN(globalIngresos, 20), rankingCompras: topN(globalCompras, 20), rankingDonaciones: topN(globalDonaciones, 20), rankingValoracion: topN(globalValoracion, 20) },
    catalogosRelacionados: {
      tiendas: arr(safeState.tiendas).map(t => ({ id: trim(t.id), nombre: trim(t.nombre) })).filter(t => t.nombre).slice(0, 500),
      responsables: arr(safeState.personas).map(p => ({ id: trim(p.id), nombre: trim(p.nombre), rango: trim(p.rango) })).filter(p => p.nombre).slice(0, 800),
      productos: arr(safeState.productos).map(p => ({ id: trim(p.id), nombre: trim(p.nombre), segmento: trim(p.segmento), destino: trim(p.destino), precioHabitual: round(p.defaultPrecio ?? p.precio, 4), tiendaHabitualId: trim(p.defaultTiendaId) })).filter(p => p.nombre).slice(0, 1600)
    },
    instruccionesCalculo: {
      ingresos: 'Para socios, obligatorio = numero * precioEntrada. Total ingreso = obligatorio + voluntario/no socio. No usar solo importe bruto.',
      compras: 'COMPRA_REAL son tickets TKxx u otros gastos no pendientes ni donados. PTE_COMPRA son previsiones. DONADO TIENDA/SOCIO/OTROS son donaciones de producto valoradas.',
      valoracion: 'valoracionEvento = ingresosTotal + donacionesProducto - comprasReales.',
      tickets: 'Los tickets agrupan líneas de compra por TKxx, tienda y responsable; tieneFoto solo indica disponibilidad de imagen, no se envía la imagen.'
    }
  };
}
