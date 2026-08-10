/* ControlEvent v27_prod_1.2 - Zuzu / Analítica libre sobre datos del evento.
   Solo lectura: no modifica BBDD ni estado. */
import { getState } from './state.service.js';
import { getSupabaseAdmin } from '../lib/supabase.js';
import { buildZuzuModuleContext, buildZuzuPlanningCatalog, buildZuzuLocalPlan } from './event-context.service.js';
import { analyzeZuzuReportRequest } from './zuzu-report-policy.service.js';
import { canonicalAttendanceFromContext, buildCanonicalAttendance } from './zuzu-attendance.service.js';
import { buildRelevantPeopleContext } from './zuzu-people-context.service.js';
import { listAllHitosState } from './hitos.service.js';
import { exportBankData } from './bank-reconciliation.service.js';

function text(value) { return value == null ? '' : String(value); }
function trim(value) { return text(value).trim(); }
function num(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const n = Number(text(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function round(value, digits = 2) {
  const n = num(value);
  return Number(n.toFixed(digits));
}
function norm(value) {
  const s = text(value);
  return (s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s).toLowerCase().trim();
}
function arr(value) { return Array.isArray(value) ? value : []; }
function byId(rows) {
  const out = new Map();
  arr(rows).forEach(row => { const id = trim(row?.id); if (id) out.set(id, row); });
  return out;
}
function firstNonEmpty(...values) {
  for (const value of values) { const s = trim(value); if (s) return s; }
  return '';
}
function ticketText(row) { return firstNonEmpty(row?.ticketDonacion, row?.ticket_donacion, row?.ticket, row?.ticketOtrosGastos, row?.ticket_otros_gastos); }
function isDonationTicket(value) { return /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(trim(value)); }
function isPendingTicket(value) { return /PTE\.?\s*COMPRA|PENDIENTE/i.test(trim(value)); }
function valueOfLine(row) { return round(num(row?.unidades) * num(row?.precio), 2); }
function topN(map, n = 12) {
  return [...map.entries()].sort((a, b) => num(b[1]) - num(a[1])).slice(0, n).map(([k, v]) => ({ nombre: k, valor: round(v, 2) }));
}
function add(map, key, value) {
  const k = trim(key) || 'Sin clasificar';
  map.set(k, num(map.get(k)) + num(value));
}
function addQtyCost(map, key, qty, cost) {
  const k = trim(key) || 'Sin clasificar';
  const old = map.get(k) || { unidades: 0, coste: 0 };
  old.unidades += num(qty);
  old.coste += num(cost);
  map.set(k, old);
}
function fileSafe(value) {
  return trim(value || 'resultado').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').slice(0, 90) || 'resultado';
}
function looksLikeOpenAiKey(value) { return /^sk-/i.test(trim(value)); }
function geminiKey() {
  const explicitZuzu = process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.CONTROLEVENT_GEMINI_API_KEY
    || process.env.OPENIA_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || '';
  if (explicitZuzu) return explicitZuzu;
  const maybeOpenAiVar = process.env.OPENAI_API_KEY || '';
  return maybeOpenAiVar && !looksLikeOpenAiKey(maybeOpenAiVar) ? maybeOpenAiVar : '';
}
function splitModels(value) { return trim(value).split(/[;,\s]+/).map(x => trim(x).replace(/^models\//, '')).filter(Boolean); }
function pushCleanModel(out, model) {
  const m = trim(model).replace(/^models\//, '');
  if (!m) return;
  if (/^gemini-1\.5(?:-|$)/i.test(m) || /^gemini-pro$/i.test(m) || /^gemini-2\.0-flash-lite$/i.test(m)) return;
  if (!out.includes(m)) out.push(m);
}
function configuredGeminiModelsForTask(task = 'zuzu-structured', opts = {}) {
  const t = trim(task).toLowerCase();
  const explicitByTask = {
    'zuzu-planner': process.env.CONTROLEVENT_ZUZU_PLANNER_MODEL || process.env.CONTROLEVENT_PLAN_AI_MODEL,
    'zuzu-structured': process.env.CONTROLEVENT_ZUZU_STRUCTURED_MODEL || process.env.CONTROLEVENT_EVENT_AI_MODEL,
    'zuzu-narrative': process.env.CONTROLEVENT_ZUZU_NARRATIVE_MODEL || process.env.CONTROLEVENT_EVENT_AI_MODEL,
    'initial-planning-full': process.env.CONTROLEVENT_INITIAL_PLAN_AI_MODEL || process.env.CONTROLEVENT_PLANIFICACION_AI_MODEL || process.env.CONTROLEVENT_PLAN_AI_MODEL,
    'initial-planning-partial': process.env.CONTROLEVENT_INITIAL_PLAN_AI_MODEL || process.env.CONTROLEVENT_PLANIFICACION_AI_MODEL || process.env.CONTROLEVENT_PLAN_AI_MODEL
  };
  const globalConfigured = process.env.GEMINI_MODEL || process.env.GOOGLE_GEMINI_MODEL || '';
  const out = [];
  splitModels(explicitByTask[t] || '').forEach(m => pushCleanModel(out, m));
  // Decisión por funcionalidad:
  // - Planificador Zuzu: Flash-Lite primero (JSON corto y barato).
  // - Redacción/informes: Flash primero (calidad humana).
  // - Planificación inicial TOTAL: Flash primero (razonamiento + propuesta de compra compleja).
  // - Planificación inicial PARCIAL: Flash-Lite primero, con Flash de respaldo.
  // Si solo hay GEMINI_MODEL global, se respeta antes de los fallback.
  splitModels(globalConfigured).forEach(m => pushCleanModel(out, m));
  let fallback;
  if (t === 'zuzu-planner') {
    fallback = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash'];
  } else if (t === 'initial-planning-partial') {
    fallback = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
  } else if (t === 'zuzu-narrative') {
    const tier = trim(process.env.CONTROLEVENT_ZUZU_NARRATIVE_TIER || process.env.CONTROLEVENT_ZUZU_COST_MODE || 'auto').toLowerCase();
    const prompt = trim(opts?.prompt || opts?.userPrompt || '');
    const premium = /(exhaustiv|opini[oó]n|cachond|chascarr|coloquial|simp[aá]tic|direcci[oó]n|financier|t[eé]cnic|auditor|alegato|dos\s+p[aá]gin|una\s+p[aá]gina|informe\s+completo|datos\s+del\s+evento|info(?:rmaci[oó]n)?\s+del\s+evento|temperatura|tiempo|meteorolog|clima|lluvia|viento|previsi[oó]n)/i.test(prompt);
    if (/^(lite|ahorro|econ[oó]mico|barato|low)$/i.test(tier)) fallback = ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
    else if (/^(flash|calidad|premium|alta)$/i.test(tier)) fallback = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
    else fallback = premium ? ['gemini-2.5-flash', 'gemini-2.5-flash-lite'] : ['gemini-2.5-flash-lite', 'gemini-2.5-flash'];
  } else {
    fallback = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];
  }
  fallback.forEach(m => pushCleanModel(out, m));
  return out;
}
function configuredGeminiModels() { return configuredGeminiModelsForTask('zuzu-structured'); }
function configuredGeminiPlanningModels(formOrMode = '') {
  const mode = typeof formOrMode === 'string' ? formOrMode : trim(formOrMode?.mode || '');
  const task = trim(mode).toUpperCase() === 'ZUZU_TOTAL' ? 'initial-planning-full' : 'initial-planning-partial';
  return configuredGeminiModelsForTask(task);
}

function compactState(state, selectedEventId = '') {
  const events = arr(state?.eventos);
  const people = byId(state?.personas);
  const stores = byId(state?.tiendas);
  const products = byId(state?.productos);
  const compras = arr(state?.compras);
  const colaboradores = arr(state?.colaboradores);
  const eventPeople = new Map(arr(state?.eventPersonSnapshots).map(row => [`${trim(row?.eventId || row?.event_id)}|${trim(row?.personaId || row?.persona_id)}`, row]));
  const selectedEvent = events.find(e => trim(e.id) === trim(selectedEventId)) || null;

  function historicalPerson(row){
    const eventId=trim(row?.eventId || row?.event_id);
    const personId=trim(row?.personaId || row?.persona_id);
    const snap=eventPeople.get(`${eventId}|${personId}`)||{};
    const current=people.get(personId)||{};
    return {
      nombre:trim(row?.personaNombreSnapshot || row?.persona_nombre_snapshot || snap?.nombreSnapshot || snap?.nombre_snapshot || current.nombre || personId || 'Sin colaborador'),
      rango:trim(row?.personaRangoSnapshot || row?.persona_rango_snapshot || snap?.rangoSnapshot || snap?.rango_snapshot || current.rango || row?.rango || row?.personaRango || '')
    };
  }
  function productName(id) { return trim(products.get(trim(id))?.nombre || id || 'Sin producto'); }
  function storeName(id) { return trim(stores.get(trim(id))?.nombre || id || 'Sin tienda'); }
  function personName(id) { return trim(people.get(trim(id))?.nombre || id || 'Sin responsable'); }
  function productSegment(id) { return trim(products.get(trim(id))?.segmento || ''); }
  function productDestino(id) { return trim(products.get(trim(id))?.destino || ''); }
  function firstNumber(row, keys, fallback = 0) {
    for (const key of keys) {
      if (row && row[key] !== undefined && row[key] !== null && trim(row[key]) !== '') return num(row[key]);
    }
    return fallback;
  }
  function incomeRango(row) {
    const historical=historicalPerson(row);
    return norm(historical.rango || row?.rango || row?.personaRango || row?.tipoPersona || '');
  }
  function isSocioIncome(row) { return incomeRango(row) === 'socio'; }
  function incomePayment(row) { return trim(row?.situacion || row?.formaPago || row?.ingreso || 'Pendiente') || 'Pendiente'; }
  function incomePersonName(row) {
    return historicalPerson(row).nombre;
  }
  function incomeParts(row, ev) {
    const numero = num(row?.numero);
    const precioEntrada = num(ev?.precio);
    const socio = isSocioIncome(row);
    const importeObligatorio = socio ? round(numero * precioEntrada, 2) : 0;
    const importeVoluntario = firstNumber(row, ['importeVoluntario','voluntario','donation','importe','importeDonacion','aportacionVoluntaria'], 0);
    const importeTotal = round(importeObligatorio + importeVoluntario, 2);
    return {
      socio,
      rango: socio ? 'SOCIO' : (historicalPerson(row).rango || 'NO SOCIO / OTRO'),
      numero: round(numero, 3),
      formaPago: incomePayment(row),
      importeObligatorio,
      importeVoluntario: round(importeVoluntario, 2),
      importeTotal,
      importeCampoBBDD: round(row?.importe, 2)
    };
  }
  function summarizeIngresos(rows, ev) {
    const byForma = new Map();
    const byRango = new Map();
    let total = 0, totalSocios = 0, totalNoSocios = 0, obligatorioSocios = 0, voluntario = 0, entradas = 0;
    arr(rows).forEach(row => {
      const p = incomeParts(row, ev);
      total += p.importeTotal;
      entradas += p.numero;
      voluntario += p.importeVoluntario;
      obligatorioSocios += p.importeObligatorio;
      if (p.socio) totalSocios += p.importeTotal; else totalNoSocios += p.importeTotal;
      add(byForma, p.formaPago, p.importeTotal);
      add(byRango, p.rango, p.importeTotal);
    });
    return {
      ingresosTotal: round(total, 2),
      ingresosSocios: round(totalSocios, 2),
      ingresosNoSociosYOtros: round(totalNoSocios, 2),
      importeObligatorioSocios: round(obligatorioSocios, 2),
      importeVoluntario: round(voluntario, 2),
      entradasTotal: round(entradas, 3),
      porFormaPago: topN(byForma, 20),
      porTipoPersona: topN(byRango, 20),
      regla: 'IngresosTotal = importe obligatorio de socios (numero * precioEntrada) + importe voluntario / ingresos no socios. No usar solo el campo bruto importe si hay socios.'
    };
  }

  const eventSummaries = events.map(ev => {
    const evId = trim(ev.id);
    const evCompras = compras.filter(c => trim(c.eventId || c.event_id) === evId);
    const evIngresos = colaboradores.filter(c => trim(c.eventId || c.event_id) === evId);
    const byProductQty = new Map();
    const byProductCost = new Map();
    const byStore = new Map();
    const bySegment = new Map();
    const byDestino = new Map();
    let comprasReales = 0, comprasPendientes = 0, donacionesValor = 0;
    const ingresosResumen = summarizeIngresos(evIngresos, ev);
    const ingresosTotal = ingresosResumen.ingresosTotal;
    const entradasTotal = ingresosResumen.entradasTotal;
    evCompras.forEach(row => {
      const amount = valueOfLine(row);
      const ticket = ticketText(row);
      const pName = productName(row.productoId || row.producto_id);
      addQtyCost(byProductQty, pName, row.unidades, amount);
      add(byProductCost, pName, amount);
      add(byStore, storeName(row.tiendaId || row.tienda_id), amount);
      add(bySegment, productSegment(row.productoId || row.producto_id) || 'Sin segmento', amount);
      add(byDestino, productDestino(row.productoId || row.producto_id) || 'Sin destino', amount);
      if (isDonationTicket(ticket)) donacionesValor += amount;
      else if (isPendingTicket(ticket)) comprasPendientes += amount;
      else comprasReales += amount;
    });
    const topCantidad = [...byProductQty.entries()]
      .sort((a, b) => num(b[1].unidades) - num(a[1].unidades))
      .slice(0, 12)
      .map(([nombre, v]) => ({ nombre, unidades: round(v.unidades, 3), coste: round(v.coste, 2) }));
    const topCoste = [...byProductQty.entries()]
      .sort((a, b) => num(b[1].coste) - num(a[1].coste))
      .slice(0, 12)
      .map(([nombre, v]) => ({ nombre, unidades: round(v.unidades, 3), coste: round(v.coste, 2) }));
    return {
      id: evId,
      titulo: trim(ev.titulo),
      situacion: trim(ev.situacion || 'En curso'),
      fechas: `${trim(ev.fechaIni)} a ${trim(ev.fechaFin)}`,
      precioEntrada: round(ev.precio, 2),
      ingresosTotal: round(ingresosTotal, 2),
      entradasTotal: round(entradasTotal, 2),
      ingresosSocios: ingresosResumen.ingresosSocios,
      ingresosNoSociosYOtros: ingresosResumen.ingresosNoSociosYOtros,
      importeObligatorioSocios: ingresosResumen.importeObligatorioSocios,
      importeVoluntario: ingresosResumen.importeVoluntario,
      ingresosPorFormaPago: ingresosResumen.porFormaPago,
      ingresosPorTipoPersona: ingresosResumen.porTipoPersona,
      comprasReales: round(comprasReales, 2),
      comprasPendientes: round(comprasPendientes, 2),
      donacionesValor: round(donacionesValor, 2),
      valoracionEvento: round(comprasReales + comprasPendientes + donacionesValor, 2),
      topCantidad,
      topCoste,
      tiendasPorImporte: topN(byStore),
      segmentosPorImporte: topN(bySegment),
      destinosPorImporte: topN(byDestino)
    };
  });

  function detailedRowsForEvent(evId, maxRows = 600) {
    const rows = compras.filter(c => trim(c.eventId || c.event_id) === evId).slice(0, maxRows).map(row => ({
      tipo: isDonationTicket(ticketText(row)) ? 'DONACION_PRODUCTO' : isPendingTicket(ticketText(row)) ? 'PTE_COMPRA' : 'COMPRA_REAL',
      producto: productName(row.productoId || row.producto_id),
      segmento: productSegment(row.productoId || row.producto_id),
      destino: productDestino(row.productoId || row.producto_id),
      unidades: round(row.unidades, 3),
      precio: round(row.precio, 4),
      importe: valueOfLine(row),
      ticket: ticketText(row),
      tienda: storeName(row.tiendaId || row.tienda_id),
      responsable: personName(row.responsableId || row.responsable_id),
      donante: trim(row.donorRef || '')
    }));
    return rows;
  }
  function ingresosForEvent(evId, maxRows = 400) {
    const ev = events.find(e => trim(e.id) === trim(evId)) || selectedEvent || {};
    return colaboradores.filter(c => trim(c.eventId || c.event_id) === evId).slice(0, maxRows).map(row => {
      const p = incomeParts(row, ev);
      return {
        colaborador: incomePersonName(row),
        tipoPersona: p.rango,
        esSocio: p.socio,
        numero: p.numero,
        formaPago: p.formaPago,
        importeObligatorioSocios: p.importeObligatorio,
        importeVoluntarioONoSocio: p.importeVoluntario,
        importeTotalCalculado: p.importeTotal,
        importeCampoBBDD: p.importeCampoBBDD,
        notaCalculo: p.socio ? 'Socio: obligatorio = numero * precioEntrada; total = obligatorio + voluntario.' : 'No socio/otro: total = importe voluntario o importe registrado.'
      };
    });
  }
  function ingresosResumenForEvent(evId) {
    const ev = events.find(e => trim(e.id) === trim(evId)) || selectedEvent || {};
    const rows = colaboradores.filter(c => trim(c.eventId || c.event_id) === evId);
    return summarizeIngresos(rows, ev);
  }
  const selectedId = trim(selectedEvent?.id || selectedEventId);
  return {
    generatedAt: new Date().toISOString(),
    selectedEventId: selectedId,
    selectedEvent: selectedEvent ? {
      id: selectedId,
      titulo: trim(selectedEvent.titulo),
      situacion: trim(selectedEvent.situacion || 'En curso'),
      fechaIni: trim(selectedEvent.fechaIni),
      fechaFin: trim(selectedEvent.fechaFin),
      precio: round(selectedEvent.precio, 2)
    } : null,
    eventosResumen: eventSummaries,
    detalleEventoSeleccionado: selectedId ? {
      resumenIngresosDetallado: ingresosResumenForEvent(selectedId),
      comprasDonacionesYPendientes: detailedRowsForEvent(selectedId),
      ingresos: ingresosForEvent(selectedId)
    } : null,
    catalogos: {
      tiendas: arr(state?.tiendas).map(t => trim(t.nombre)).filter(Boolean).slice(0, 300),
      responsables: arr(state?.personas).map(p => trim(p.nombre)).filter(Boolean).slice(0, 500),
      productos: arr(state?.productos).map(p => ({ nombre: trim(p.nombre), segmento: trim(p.segmento), destino: trim(p.destino), precio: round(p.defaultPrecio ?? p.precio, 4) })).slice(0, 1200)
    },
    limitaciones: 'Los datos son de solo lectura. Las compras pendientes son previsiones; las compras reales son tickets TK/otros gastos; DONADO TIENDA/SOCIO/OTROS son donaciones de producto valoradas.'
  };
}

function eventAiSchema() {
  return {
    type: 'OBJECT',
    properties: {
      ok: { type: 'BOOLEAN' },
      rejected: { type: 'BOOLEAN' },
      title: { type: 'STRING' },
      answer: { type: 'STRING' },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } },
      charts: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            type: { type: 'STRING', description: 'bar, horizontalBar, pie, donut, line o stackedBar' },
            labels: { type: 'ARRAY', items: { type: 'STRING' } },
            values: { type: 'ARRAY', items: { type: 'NUMBER' } },
            series: { type: 'ARRAY', items: { type: 'OBJECT', properties: { name: { type: 'STRING' }, values: { type: 'ARRAY', items: { type: 'NUMBER' } } } } },
            unit: { type: 'STRING' }
          },
          required: ['title', 'type', 'labels', 'values', 'unit']
        }
      },
      tables: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            title: { type: 'STRING' },
            columns: { type: 'ARRAY', items: { type: 'STRING' } },
            rows: { type: 'ARRAY', items: { type: 'ARRAY', items: { type: 'STRING' } } }
          },
          required: ['title', 'columns', 'rows']
        }
      },
      files: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            filename: { type: 'STRING' },
            mime: { type: 'STRING' },
            content: { type: 'STRING', description: 'Contenido textual del archivo, no base64' }
          },
          required: ['filename', 'mime', 'content']
        }
      }
    },
    required: ['ok', 'rejected', 'title', 'answer', 'warnings', 'charts', 'tables', 'files']
  };
}

function systemPrompt(userPrompt, context) {
  const rawCtx = JSON.stringify(context);
  const ctx = rawCtx;
  return `Eres Zuzu, el analista y buen amigo integrado en ControlEvent, una aplicación de gestión de eventos solidarios. Zuzu es siempre masculino, cercano y locuaz.

Arquitectura obligatoria ya ejecutada por ControlEvent:
1) Zuzu ha leído el prompt y ha devuelto módulos, filtros y datos solicitados.
2) ControlEvent ha extraído esos módulos desde la app, en registros legibles y sin códigos internos.
3) Ahora recibes TODOS los registros entregados por esos módulos y el prompt original del usuario. Tu trabajo es cocinar/formatear la respuesta final exactamente según lo pedido.
4) ControlEvent NO debe decidir la conclusión por ti: si el contexto entregado no alcanza, debes pedir el dato o módulo que falta en warnings/answer, no inventar una respuesta cómoda.

Reglas obligatorias:
- Usa exclusivamente modulosExtraidos, metricasCanonicas y asistenciaCanonica. No inventes datos ni completes huecos por intuición.
- Para asistencia usa SIEMPRE asistenciaCanonica.porEvento: los registros de ingreso son filas administrativas, no personas. Comunica socios asistentes + no socios asistentes = total asistentes, y usa exclusivamente el listado canónico de socios no asistentes.
- Habla de ti siempre en masculino (listo, preparado, configurado). Eres un buen amigo que habla con cercanía. Termina toda respuesta útil con la frase exacta «Pregúntame lo que quieras».
- La respuesta principal debe ser legible para usuario final: máximo 10-12 líneas de explicación; no pegues JSON, arrays ni listados brutos dentro de answer.
- Si hay muchos registros, resume y crea tablas de resumen. El detalle completo debe ir en tables o files, no en answer.
- Devuelve SIEMPRE JSON válido. No uses markdown fuera de los campos de texto. No cortes strings. Si no puedes generar todo, prioriza resumen + tablas cortas + aviso.
- Si el usuario cita eventos concretos entre comillas o por título, filtra la respuesta a esos eventos exactos. No mezcles otros eventos aunque aparezcan en el contexto.
- Si el usuario pide "todos los eventos", entonces sí puedes usar todos los eventos del contexto.
- Si el usuario menciona varios módulos o conceptos, responde a todos: por ejemplo DONACIONES, COMPRAS, COLABORADORES/INGRESOS, TICKETS y DOCUMENTOS deben aparecer todos si los pidió.
- Si el usuario pide un informe general, información para socios, estado del evento o cómo va el evento, considera obligatorios EVENTOS/Descripción, INGRESOS separados entre SOCIOS y NO SOCIOS, COMPRAS, DONACIONES, SALDOS, TICKETS/FACTURAS, DOCUMENTOS, HITOS y LG/tareas, aunque no los enumere uno a uno.
- Si el usuario pide comparativa, crea una tabla comparativa por evento y por módulo solicitado. No te quedes solo con el primer módulo.
- Si el usuario pide informe de cada evento, "cosas que ocurrieron", crónica, celebración o datos de todos los eventos registrados, ordena SIEMPRE por fecha ini/fecha de celebración y cuenta lo operativo de cada evento: INGRESOS/colaboradores, COMPRAS, DONACIONES, TICKETS/Fototickets, DOCUMENTOS, HITOS y LG/tareas. No respondas con una gráfica genérica ni con la ficha técnica de EVENTOS.
- Si pide agrupar, totalizar, calcular, ordenar, resumir o graficar, hazlo sobre TODOS los registros entregados del módulo correspondiente, no sobre una muestra.
- Si el usuario pide una gráfica, devuelve al menos un objeto en charts. No digas que has pintado una gráfica si charts está vacío.
- Si el usuario pregunta por el tiempo/clima/meteorología de un evento, usa infoIndirecta.meteorologia si existe. Devuelve una lectura útil para la organización del evento y al menos una tabla/gráfica meteorológica si hay datos externos.
- Usa fechaActualControlEvent junto con EVENTOS.fecha ini/fecha fin para elegir tiempo verbal: futuro si el evento no ha llegado, pasado si ya terminó, presente si es hoy/en curso. No hables en pasado para eventos futuros.
- FECHA REAL HOY en ControlEvent: ${trim(context?.fechaActualControlEvent || '') || todayIsoMadrid()}. Si el usuario dice que 10/07/2026 es mañana y fechaActualControlEvent es 2026-07-09, respétalo: NO digas "hoy 10 de julio", di "mañana 10 de julio" o "el 10 de julio".
- El estado "En curso" no significa que el evento ya haya ocurrido: puede ser preparación/organización abierta. Si la fecha del evento es futura, habla en futuro aunque Estado sea En curso.
- Si infoIndirecta.meteorologia existe, integra esos datos en la respuesta principal; no digas que no dispones de temperatura o clima.
- En meteorología usa el campo Día calculado por ControlEvent. Nunca deduzcas ni desplaces el día de la semana a partir de la posición de la fila.
- Si el usuario pide productos consumidos, productos más consumidos, coste por producto o unidades por producto, usa COMPRAS y DONACIONES cuando estén disponibles, agrupa por Producto y devuelve DOS salidas si procede: ranking por coste/valor y ranking por unidades. No respondas con auditoría de extracción ni con métricas técnicas del módulo EVENTOS.
- Si ControlEvent te entrega COMPRAS/DONACIONES/PRODUCTOS, úsalo como datos operativos; EVENTOS solo sirve para identificar título/fechas, no para construir una gráfica de consumo.
- Tipos de gráfica disponibles: bar, horizontalBar, pie, donut, line y stackedBar. Para comparativas entre eventos usa bar/stackedBar. Para repartos por tipo usa pie/donut. Para rankings largos usa horizontalBar.
- Para stackedBar rellena labels con las categorías y series con [{name, values}].
- Para DONACIONES, suma el campo Valor. Para COMPRAS, suma Importe. Para INGRESOS, el total por línea es Importe obligatorio + Importe voluntario. El importe voluntario puede ser negativo y debe sumarse con su signo.
- Para “producto/artículo más utilizado comprado/donado”, mide por Unidades, separando Comprado y Donado si el usuario lo pide.
- Para listados, usa todos los registros relevantes. Puedes resumir en la respuesta principal, pero aporta una tabla o fichero si procede.
- No generes SQL. No expliques claves internas. No propongas cambios en base de datos.
- Si detectas que el contexto no contiene un módulo necesario para responder, dilo claramente en warnings y formula una petición concreta de ampliación de contexto para ControlEvent, por ejemplo: "Necesito COMPRAS y DONACIONES de todos los eventos de 2025".
- Si necesitas más datos de ControlEvent para responder con precisión, no completes por intuición: responde con una solicitud concreta de información adicional y qué módulo/eventos deberían extraerse.
- Responde siempre en español.
- Respeta el tono solicitado por el usuario. Si pide informe coloquial, informal, simpático, con chascarrillos o para socios, escribe una lectura cercana y humana antes de las tablas, con humor ligero y sin perder rigor. Si pide informe técnico, financiero, auditoría, Dirección o justificación formal, escribe en tono ejecutivo, preciso y sobrio, con conclusiones, salvedades y criterios de cálculo.
- Personaliza la respuesta con usuarioLogado si está en el contexto: usa Identificacion/apodo en conversación informal y Nombre en informes serios o formales. Si el usuario pregunta por una persona, revisa también usuarioLogado además de PERSONAS, INGRESOS, COMPRAS y DONACIONES.
- No entregues solo datos crudos cuando el usuario pida un informe: primero redacta un texto de interpretación que explique las líneas generales y responda con el estilo pedido; después deja tablas, gráficas y ficheros como soporte.
- Antes de cerrar la respuesta, verifica internamente cada concepto solicitado. Si falta uno, añádelo; nunca respondas con menos apartados de los pedidos.
- EVENTOS.Descripción debe analizarse expresamente: explica objetivo, programa, fechas y consecuencias organizativas. DOCUMENTOS no se limitan a listar: comenta su finalidad, reintegros, autorizaciones, justificantes y pendientes.
- Cuando el usuario pida detalle, desglosa compras y donaciones por producto, destino, tienda/responsable y donante; una cifra global no satisface una petición de detalle.

- En v19 TODA respuesta final debe parecer escrita por Zuzu: interpreta el prompt completo del usuario, su intención, tono y destinatario. ControlEvent solo te ha preparado los datos; no copies su carcasa.
- No devuelvas una plantilla mecánica repetida. Cambia estructura, vocabulario y enfoque según cada petición y cada persona/evento consultado.
- Si el usuario pide opinión, informe, valoración, tono cachondo, formal, técnico o coloquial, la parte answer debe ser una redacción humana completa y no una introducción de dos líneas seguida de tablas.

Campos oficiales por módulo y datos indirectos:
- METEOROLOGIA indirecta: Evento; Localidad; Día; Fecha; Cielo; Temp. máx; Temp. mín; Prob. lluvia %; Viento km/h; Fuente. Úsala solo si infoIndirecta.meteorologia está presente.
- INGRESOS: Evento; Nombre; Numero; Importe obligatorio; Importe voluntario; Ingreso; Rango; Just.ing.
- DONACIONES: Evento; Producto; Unidades; Precio; Valor; Tipo de donación; Donante; Responsable.
- COMPRAS: Evento; Producto; Unidades; Precio; Importe; Ticket u otros gastos; Tienda; Responsable; Ticket SI/NO.
- EVENTOS: Titulo del evento; Precio; fecha ini; fecha fin; Estado; Descripción; DOCxxx. Usa Descripción para entender el objetivo del evento y enriquecer informes/valoraciones, no como dato decorativo.
- TICKETS: Evento; TKxx; Tienda; Responsable; Total ticket; Nº líneas; Ticket SI/NO; Líneas contables.
- DOCUMENTOS: DOCxxx; Evento; Fecha; Descripcion; Tiene imagen.
- PRODUCTOS: Nombre producto; Segmento; Destino; Precio rfa.
- TIENDAS: Nombre tienda.
- PERSONAS: Nombre persona; Rango.

Formato de salida: SOLO JSON válido con el esquema indicado. Evita respuestas excesivamente largas: usa tablas y ficheros para detalle cuando sea necesario.
Límites de presentación: answer <= 2500 caracteres; máximo 8 tablas; máximo 80 filas por tabla; máximo 8 gráficas. Si necesitas devolver más detalle, usa files en CSV.

CONTEXTO CONTROL EVENT:
${ctx}

PETICIÓN DEL USUARIO:
${trim(userPrompt).slice(0, 3000)}
`;
}
function stripJsonText(value) {
  let s = trim(value);
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  const starts = [firstObj, firstArr].filter(n => n >= 0);
  if (starts.length) {
    const first = Math.min(...starts);
    const lastObj = s.lastIndexOf('}');
    const lastArr = s.lastIndexOf(']');
    const last = Math.max(lastObj, lastArr);
    if (last > first) s = s.slice(first, last + 1);
  }
  return s;
}
function parsePlanJsonLenientHf37(value) {
  const original = stripJsonText(value);
  try { return { parsed: JSON.parse(original), repaired: false, text: original }; } catch (firstError) {
    let s = original;
    // Reparaciones prudentes para respuestas Zuzu casi JSON: comas faltantes entre objetos/arrays
    // y comas colgantes. No intenta interpretar texto libre como propuesta.
    const repairers = [
      x => x.replace(/,\s*([}\]])/g, '$1'),
      x => x.replace(/}\s*(?=\{)/g, '},'),
      x => x.replace(/]\s*(?=\")/g, '],'),
      x => x.replace(/}\s*(?=\")/g, '},'),
      x => x.replace(/\"\s*(?=\"(?:menuResumen|rows|donaciones|compras|avisos|notes|preguntasPendientes|ok|title)\"\s*:)/g, '\",')
    ];
    for (const fn of repairers) s = fn(s);
    // Segunda pasada por si el primer arreglo reveló otro separador entre objetos.
    s = s.replace(/}\s*(?=\{)/g, '},').replace(/,\s*([}\]])/g, '$1');
    try { return { parsed: JSON.parse(s), repaired: true, text: s, firstError }; } catch (secondError) {
      secondError.firstError = firstError;
      secondError.repairedText = s;
      secondError.originalText = original;
      throw secondError;
    }
  }
}

function csvEscape(value) {
  const s = text(value);
  return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function csvFromRows(columns, rows) {
  const lines = [columns.map(csvEscape).join(';')];
  arr(rows).forEach(row => lines.push(columns.map(c => csvEscape(row?.[c])).join(';')));
  return lines.join('\n');
}
function orderedColumnsForModule(moduleName, rows) {
  const preferred = {
    COMPRAS: ['Evento','Producto','Unidades','Precio','Importe','Ticket u otros gastos','Tienda','Responsable','Ticket SI/NO'],
    DONACIONES: ['Evento','Producto','Unidades','Precio','Valor','Tipo de donación','Donante','Responsable'],
    INGRESOS: ['Evento','Nombre','Numero','Importe obligatorio','Importe voluntario','Ingreso','Rango','Just.ing'],
    TICKETS: ['Evento','TKxx','Tienda','Responsable','Total ticket','Nº líneas','Ticket SI/NO','Líneas contables'],
    DOCUMENTOS: ['DOCxxx','Evento','Fecha','Descripcion','Tiene imagen'],
    EVENTOS: ['Titulo del evento','Precio','fecha ini','fecha fin','Estado','Descripción','DOCxxx','Fecha documento','Descripcion documento','Documento con imagen'],
    PRODUCTOS: ['Nombre producto','Segmento','Destino','Precio rfa.'],
    TIENDAS: ['Nombre tienda'],
    PERSONAS: ['Nombre persona','Rango']
  };
  const seen = new Set();
  const cols = [];
  (preferred[moduleName] || []).forEach(c => { if (!seen.has(c)) { seen.add(c); cols.push(c); } });
  arr(rows).forEach(row => Object.keys(row || {}).forEach(k => { if (!seen.has(k)) { seen.add(k); cols.push(k); } }));
  return cols.filter(c => arr(rows).some(r => r && Object.prototype.hasOwnProperty.call(r, c)) || (preferred[moduleName]||[]).includes(c));
}

function isTransformAnalysisPrompt(prompt) {
  const p = norm(prompt);
  // Cuando el usuario pide operar sobre los datos, ControlEvent debe extraer los módulos
  // y pasar esos datos ya fiables a Zuzu junto con el prompt original.
  // No se debe cortar con el listado directo, porque perdería agrupaciones, totalizaciones,
  // cálculos, comparativas, gráficos o formatos pedidos por el usuario.
  return /\b(agrupa|agrupar|agrupado|agrupados|agrupacion|agrupación|totaliza|totalizar|totalizado|subtotal|subtotales|suma|sumar|sumatorio|calcula|calcular|calculo|cálculo|media|promedio|porcentaje|porcentajes|ratio|ranking|ordena|ordenar|filtra|filtrar|resume|resumen|resumir|analiza|analisis|análisis|compara|comparar|comparativa|evolucion|evolución|tendencia|grafica|gráfica|grafico|gráfico|diagrama|tabla dinamica|tabla dinámica|desglose|desglosa|desglosar)\b/.test(p);
}
function isListExtractionPrompt(prompt) {
  const p = norm(prompt);
  if (isTransformAnalysisPrompt(prompt)) return false;
  return /\b(lista|listado|relacion|relación|detalle|detallame|detalla|dame|muestra|muéstrame|ensena|enseña|ver|cuales|cuáles|que|qué|saber|todos|todas)\b/.test(p);
}
function directModuleResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  if (!isListExtractionPrompt(prompt)) return null;
  const mods = context.modulosExtraidos || {};
  const p = norm(prompt);
  const priority = [];
  if (/\bcompra|compras|gasto|gastos|comprado\b/.test(p) && Array.isArray(mods.COMPRAS)) priority.push('COMPRAS');
  if (/\bdonacion|donaciones|donado|donante\b/.test(p) && Array.isArray(mods.DONACIONES)) priority.push('DONACIONES');
  if (/\bingreso|ingresos|recaudacion|recaudación|asistente|asistentes|entrada|entradas|colaborador|colaboradores|socio|socios\b/.test(p) && Array.isArray(mods.INGRESOS)) priority.push('INGRESOS');
  if (/\bticket|tickets|tk\s*\d+|factura|facturas\b/.test(p) && Array.isArray(mods.TICKETS)) priority.push('TICKETS');
  if (/\bdocumento|documentos|doc\s*\d+\b/.test(p) && Array.isArray(mods.DOCUMENTOS)) priority.push('DOCUMENTOS');
  const onlyTechnicalEventAsk = /\b(fecha|precio|estado|situacion|situación|titulo|título)\b/.test(p) && !/\b(datos|info|informacion|información|dossier|comparativa|compara|graficas?|gráficas?|participa|participado|donado|compras?|ingresos?|tickets?|documentos?|celebracion|celebración)\b/.test(p);
  if (/\bevento|eventos|fecha|estado|situacion|situación\b/.test(p) && Array.isArray(mods.EVENTOS) && (onlyTechnicalEventAsk || !priority.length)) priority.push('EVENTOS');
  if (/\bproducto|productos|catalogo|catálogo\b/.test(p) && Array.isArray(mods.PRODUCTOS)) priority.push('PRODUCTOS');
  if (/\btienda|tiendas\b/.test(p) && Array.isArray(mods.TIENDAS) && !priority.includes('COMPRAS')) priority.push('TIENDAS');
  if (/\bpersona|personas|responsable|responsables\b/.test(p) && Array.isArray(mods.PERSONAS) && !priority.includes('INGRESOS')) priority.push('PERSONAS');
  if (!priority.length) return null;
  const moduleName = priority[0];
  const rows = arr(mods[moduleName]);
  const columns = orderedColumnsForModule(moduleName, rows);
  const eventos = arr(context.eventosObjetivo).map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.EVENTO || e?.Evento)).filter(Boolean).join(', ');
  const filename = fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_v27_prod_1.2.csv`);
  const tableLimit = 1000;
  const tableRows = rows.slice(0, tableLimit).map(row => columns.map(c => {
    const v = row?.[c];
    if (c === 'Líneas contables' && Array.isArray(v)) return v.map(x => `${x.Producto || ''} ${x.Unidades || ''} x ${x.Precio || ''} = ${x.Importe || ''}`).join(' | ');
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : text(v);
  }));
  const extra = rows.length > tableRows.length ? ` Se muestran ${tableRows.length} en pantalla; el CSV descargable incluye las ${rows.length}.` : '';
  return {
    ok: true,
    rejected: false,
    title: `${moduleName}${eventos ? ` - ${eventos}` : ''}`,
    answer: `${rows.length} registro(s) encontrados.${extra}`,
    warnings: arr(context.advertencias).concat(rows.length ? [] : [`El módulo ${moduleName} no tiene registros con los filtros solicitados.`]),
    charts: [],
    tables: rows.length ? [{ title: `${moduleName} (${rows.length} registro(s))`, columns, rows: tableRows }] : [],
    files: rows.length ? [{ filename, mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }] : [],
    provider: 'control-event-query-modules-direct',
    model: 'sin-gemini-para-listados'
  };
}



function valueColumnForModule(moduleName) {
  if (moduleName === 'DONACIONES') return 'Valor';
  if (moduleName === 'COMPRAS') return 'Importe';
  if (moduleName === 'INGRESOS') return 'Total ingreso';
  return 'Importe';
}
function valueForModuleRow(moduleName, row) {
  if (moduleName === 'INGRESOS') return num(row?.['Importe obligatorio']) + num(row?.['Importe voluntario']);
  if (moduleName === 'DONACIONES') return num(row?.Valor);
  if (moduleName === 'COMPRAS') return num(row?.Importe);
  return 0;
}
function detectGroupField(moduleName, prompt) {
  const p = norm(prompt);
  if (moduleName === 'DONACIONES') {
    if (/\btipo(?:\s+de)?\s+donaci|donado\s+socio|donado\s+no\s+socio|donado\s+otros|donado\s+tienda\b/.test(p)) return 'Tipo de donación';
    if (/\bdonante|donantes\b/.test(p)) return 'Donante';
    if (/\bresponsable|responsables\b/.test(p)) return 'Responsable';
    if (/\bproducto|productos|articulo|articulos\b/.test(p)) return 'Producto';
    return 'Tipo de donación';
  }
  if (moduleName === 'COMPRAS') {
    if (/\btienda|tiendas|proveedor|proveedores\b/.test(p)) return 'Tienda';
    if (/\bresponsable|responsables\b/.test(p)) return 'Responsable';
    if (/\btk|ticket|factura|gastos\s+corrientes|pte\.?\s*compra\b/.test(p)) return 'Ticket u otros gastos';
    if (/\bproducto|productos|articulo|articulos\b/.test(p)) return 'Producto';
    return 'Producto';
  }
  if (moduleName === 'INGRESOS') {
    if (/\bforma|ingreso|banco|bizum|efectivo|pendiente|pago\b/.test(p)) return 'Ingreso';
    if (/\brango|socio|socios|no\s+socio|donante\b/.test(p)) return 'Rango';
    if (/\bpersona|personas|nombre|colaborador|colaboradores|asistente|asistentes\b/.test(p)) return 'Nombre';
    return 'Ingreso';
  }
  return 'Evento';
}
function detectAggregateModule(prompt, mods) {
  const p = norm(prompt);
  if (/\bdonacion|donaciones|donado|donante\b/.test(p) && Array.isArray(mods.DONACIONES)) return 'DONACIONES';
  if (/\bcompra|compras|gasto|gastos|comprado\b/.test(p) && Array.isArray(mods.COMPRAS)) return 'COMPRAS';
  if (/\bingreso|ingresos|recaudacion|recaudación|asistente|asistentes|entrada|entradas|colaborador|colaboradores|socio|socios\b/.test(p) && Array.isArray(mods.INGRESOS)) return 'INGRESOS';
  return '';
}
function groupRowsForChart(moduleName, rows, prompt) {
  const groupField = detectGroupField(moduleName, prompt);
  const map = new Map();
  arr(rows).forEach(row => {
    const key = trim(row?.[groupField]) || 'Sin clasificar';
    const value = valueForModuleRow(moduleName, row);
    map.set(key, num(map.get(key)) + value);
  });
  const ordered = [...map.entries()].sort((a,b)=>num(b[1])-num(a[1])).slice(0, 30);
  return { groupField, labels: ordered.map(x=>x[0]), values: ordered.map(x=>round(x[1],2)) };
}
function aggregateRowsForModule(moduleName, rows, prompt) {
  const groupField = detectGroupField(moduleName, prompt);
  const valueColumn = valueColumnForModule(moduleName);
  const groups = new Map();
  arr(rows).forEach(row => {
    const key = trim(row?.[groupField]) || 'Sin clasificar';
    const old = groups.get(key) || { key, registros: 0, unidades: 0, total: 0 };
    old.registros += 1;
    if (row?.Unidades !== undefined) old.unidades += num(row.Unidades);
    old.total += valueForModuleRow(moduleName, row);
    groups.set(key, old);
  });
  const ordered = [...groups.values()].sort((a,b)=>num(b.total)-num(a.total) || String(a.key).localeCompare(String(b.key), 'es'));
  const totalGeneral = round(ordered.reduce((acc, g) => acc + num(g.total), 0), 2);
  const totalRegistros = ordered.reduce((acc, g) => acc + num(g.registros), 0);
  const totalUnidades = round(ordered.reduce((acc, g) => acc + num(g.unidades), 0), 3);
  return { groupField, valueColumn, groups: ordered, totalGeneral, totalRegistros, totalUnidades };
}

function distinctValuesForField(rows, field) {
  const seen = new Map();
  arr(rows).forEach(row => {
    const key = trim(row?.[field]) || 'Sin clasificar';
    seen.set(key, (seen.get(key) || 0) + 1);
  });
  return [...seen.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]), 'es')).map(([valor, registros]) => ({ valor, registros }));
}
function auditRowsForAggregate(moduleName, rows, ag, audit, context) {
  const eventos = arr(context?.eventosObjetivo).map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.EVENTO || e?.Evento)).filter(Boolean).join(', ');
  const values = distinctValuesForField(rows, ag.groupField);
  const filtros = audit?.filtrosAplicados ? JSON.stringify(audit.filtros || {}) : 'NO';
  return [
    ['Módulo usado', moduleName],
    ['Evento(s) detectado(s)', eventos || 'No indicado'],
    ['Registros extraídos del módulo', String(rows.length)],
    ['Registros fuente sin filtros', String(audit?.registrosFuenteSinFiltros ?? rows.length)],
    ['Filtros aplicados', filtros],
    ['Campo agrupado', ag.groupField],
    ['Valores distintos encontrados', values.map(v => `${v.valor} (${v.registros})`).join(' | ') || 'Sin valores'],
    ['Total general calculado por ControlEvent', String(ag.totalGeneral)],
    ['Motor de cálculo', 'ControlEvent local, sin Zuzu para sumas/agrupaciones']
  ];
}

function directAggregateResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  // Diagnóstico fiable: detección amplia, sin depender de que Zuzu interprete el prompt.
  // Captura formas con y sin acento: agrúpalas/agrupar/agrupado, totalízalas/totalizar,
  // suma, subtotales, desglose, etc.
  if (!/(agrup|totaliz|subtotal|subtot|sumator|sumar|suma|desglos|calcula|calculo|cálculo|conteo|contar|recuento)/.test(p)) return null;
  const mods = context.modulosExtraidos || {};
  const moduleName = detectAggregateModule(prompt, mods);
  if (!moduleName) return null;
  const rows = arr(mods[moduleName]);
  const eventos = arr(context.eventosObjetivo).map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.EVENTO || e?.Evento)).filter(Boolean).join(', ');
  const audit = arr(context.auditoriaModulos).find(a => a.modulo === moduleName);
  if (!rows.length) {
    return {
      ok: true, rejected: false, title: `${moduleName} agrupado por ControlEvent`,
      answer: `ControlEvent no puede agrupar porque el módulo ${moduleName} ha entregado 0 registros${eventos ? ` para ${eventos}` : ''}.`,
      warnings: [audit ? `Auditoría ${moduleName}: fuente sin filtros ${audit.registrosFuenteSinFiltros}, entregados ${audit.registrosEntregados}.` : `El módulo ${moduleName} no tiene registros.`],
      charts: [], tables: [], files: [], provider: 'control-event-query-modules-aggregate', model: 'sin-gemini-para-totales'
    };
  }
  const ag = aggregateRowsForModule(moduleName, rows, prompt);
  const groupedColumns = [ag.groupField, 'Registros'];
  if (rows.some(r => r?.Unidades !== undefined)) groupedColumns.push('Unidades');
  groupedColumns.push(`Total ${ag.valueColumn} (€)`);
  groupedColumns.push('% sobre total');
  const groupedRows = ag.groups.map(g => {
    const base = [g.key, String(g.registros)];
    if (groupedColumns.includes('Unidades')) base.push(String(round(g.unidades, 3)));
    base.push(String(round(g.total, 2)));
    base.push(ag.totalGeneral ? `${round((num(g.total) * 100) / ag.totalGeneral, 2)} %` : '0 %');
    return base;
  });
  groupedRows.push(['TOTAL', String(ag.totalRegistros)].concat(groupedColumns.includes('Unidades') ? [String(ag.totalUnidades)] : []).concat([String(ag.totalGeneral), '100 %']));
  const detailColumns = orderedColumnsForModule(moduleName, rows);
  const detailRows = rows.slice(0, 300).map(row => detailColumns.map(c => typeof row?.[c] === 'object' && row?.[c] !== null ? JSON.stringify(row[c]) : text(row?.[c])));
  const groupedCsvRows = ag.groups.map(g => {
    const row = { [ag.groupField]: g.key, Registros: g.registros, [`Total ${ag.valueColumn} (€)`]: round(g.total, 2), '% sobre total': ag.totalGeneral ? `${round((num(g.total) * 100) / ag.totalGeneral, 2)} %` : '0 %' };
    if (groupedColumns.includes('Unidades')) row.Unidades = round(g.unidades, 3);
    return row;
  });
  const groupedCsvColumns = groupedColumns;
  const warningSynonyms = /donado\s+no\s+socio/.test(p) && moduleName === 'DONACIONES' ? ['En los datos reales el tipo equivalente a “DONADO NO SOCIO” suele venir como “DONADO OTROS”; se agrupa por el valor real del campo Tipo de donación.'] : [];
  const auditText = audit ? ` Auditoría: fuente sin filtros ${audit.registrosFuenteSinFiltros}, entregados ${audit.registrosEntregados}${audit.filtrosAplicados ? ' con filtros verificados' : ' sin filtros'}.` : '';
  const auditTableRows = auditRowsForAggregate(moduleName, rows, ag, audit, context);
  return {
    ok: true, rejected: false,
    title: `${moduleName} agrupado por ${ag.groupField}${eventos ? ` - ${eventos}` : ''}`,
    answer: `Agrupación por ${ag.groupField}. Total general: ${ag.totalGeneral} €.` ,
    warnings: arr(context.advertencias).concat(warningSynonyms),
    charts: [{ title: `${moduleName} por ${ag.groupField} (cálculo local ControlEvent)`, type: /\b(tarta|queso|pastel|pie|donut)\b/.test(p) ? 'pie' : 'bar', labels: ag.groups.map(g => g.key).slice(0, 30), values: ag.groups.map(g => round(g.total, 2)).slice(0, 30), unit: '€' }],
    tables: [
      { title: `${moduleName} agrupado por ${ag.groupField}`, columns: groupedColumns, rows: groupedRows },
      { title: `${moduleName} detalle base (${rows.length} registro(s))`, columns: detailColumns, rows: detailRows }
    ],
    files: [
      { filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_agrupado_v27_prod_1.2.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(groupedCsvColumns, groupedCsvRows) },
      { filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_detalle_v27_prod_1.2.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(detailColumns, rows) }
    ],
    provider: 'control-event-local-deterministico',
    model: 'sin-gemini-para-calculos'
  };
}


function directSegmentDestinationSituationPieIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  const asksPie = /\b(graf|gr[aá]fic|queso|tarta|pastel|pie|donut)\b/.test(p);
  const asksFields = /\bsegmento\b/.test(p) && /\bdestino\b/.test(p);
  const asksPurchaseSituation = /\b(compra|compras|pte\.?\s*compra|pendiente|tkxx|ticket|gastos?\s+corrientes?|situaci[oó]n)\b/.test(p);
  if (!(asksPie && asksFields && asksPurchaseSituation)) return null;

  const mods = context.modulosExtraidos || {};
  const compras = arr(mods.COMPRAS);
  const productos = arr(mods.PRODUCTOS);
  const events = eventNamesFromContext(context);
  if (!compras.length) {
    return {
      ok: true,
      rejected: false,
      title: `Compras por segmento, destino y situación${events.length ? ` - ${events.join(' | ')}` : ''}`,
      answer: 'No hay líneas de compra disponibles para construir el reparto solicitado.',
      warnings: arr(context.advertencias),
      charts: [], tables: [], files: [],
      provider: 'control-event-local-segmento-destino-situacion',
      model: 'calculo-local-oficial'
    };
  }

  const catalog = new Map();
  productos.forEach(row => {
    const name = trim(row?.['Nombre producto'] || row?.Producto || '');
    if (!name) return;
    catalog.set(norm(name), {
      segmento: trim(row?.Segmento) || 'SIN SEGMENTO',
      destino: trim(row?.Destino) || 'SIN DESTINO'
    });
  });

  const categoryOrder = ['Pte. Compra', 'TKxx', 'GASTOS CORRIENTES'];
  const categoryColors = {
    'Pte. Compra': '#dc2626',
    'TKxx': '#2563eb',
    'GASTOS CORRIENTES': '#111827'
  };
  function situationOf(row) {
    const raw = trim(row?.['Ticket u otros gastos'] || '');
    if (/pte\.?\s*compra|pendiente/i.test(raw) || !raw) return 'Pte. Compra';
    if (/gastos?\s+corrientes?/i.test(raw)) return 'GASTOS CORRIENTES';
    if (/^tk\s*\d+/i.test(raw)) return 'TKxx';
    return 'TKxx';
  }

  const groups = new Map();
  const totalsBySituation = Object.fromEntries(categoryOrder.map(k => [k, 0]));
  const detail = [];
  compras.forEach(row => {
    const product = trim(row?.Producto) || 'Sin producto';
    const cat = catalog.get(norm(product)) || { segmento: 'SIN SEGMENTO', destino: 'SIN DESTINO' };
    const segmento = trim(cat.segmento).toUpperCase() || 'SIN SEGMENTO';
    const destino = trim(cat.destino).toUpperCase() || 'SIN DESTINO';
    const situation = situationOf(row);
    const amount = round(num(row?.Importe), 2);
    const key = `${segmento} / ${destino}`;
    const old = groups.get(key) || { Segmento: segmento, Destino: destino, totals: Object.fromEntries(categoryOrder.map(k => [k, 0])), total: 0, lines: 0 };
    old.totals[situation] = round(num(old.totals[situation]) + amount, 2);
    old.total = round(old.total + amount, 2);
    old.lines += 1;
    groups.set(key, old);
    totalsBySituation[situation] = round(num(totalsBySituation[situation]) + amount, 2);
    detail.push({
      Evento: trim(row?.Evento), Producto: product, Segmento: segmento, Destino: destino,
      Situacion: situation, Importe: amount, 'Ticket u otros gastos': trim(row?.['Ticket u otros gastos']),
      Tienda: trim(row?.Tienda), Responsable: trim(row?.Responsable)
    });
  });

  const ordered = [...groups.values()].sort((a,b) => num(b.total) - num(a.total) || a.Segmento.localeCompare(b.Segmento, 'es') || a.Destino.localeCompare(b.Destino, 'es'));
  const totalGeneral = round(ordered.reduce((acc, g) => acc + num(g.total), 0), 2);
  const columns = ['Segmento','Destino','Pte. Compra (€)','TKxx (€)','GASTOS CORRIENTES (€)','Total parcial (€)','% del total general','Líneas'];
  const rows = ordered.map(g => [
    g.Segmento, g.Destino,
    round(g.totals['Pte. Compra'],2), round(g.totals.TKxx,2), round(g.totals['GASTOS CORRIENTES'],2),
    round(g.total,2), totalGeneral ? `${round((g.total*100)/totalGeneral,2)} %` : '0 %', g.lines
  ].map(text));
  rows.push(['TOTAL GENERAL','',round(totalsBySituation['Pte. Compra'],2),round(totalsBySituation.TKxx,2),round(totalsBySituation['GASTOS CORRIENTES'],2),totalGeneral,'100 %',compras.length].map(text));

  const colors = categoryOrder.map(k => categoryColors[k]);
  const charts = [{
    title: `Distribución general por situación · Total ${totalGeneral.toLocaleString('es-ES',{maximumFractionDigits:2})} €`,
    type: 'pie', labels: categoryOrder, values: categoryOrder.map(k => round(totalsBySituation[k],2)), unit: '€', colors
  }];
  ordered.forEach(g => {
    charts.push({
      title: `${g.Segmento} / ${g.Destino} · Total parcial ${round(g.total,2).toLocaleString('es-ES',{maximumFractionDigits:2})} €`,
      type: 'pie', labels: categoryOrder, values: categoryOrder.map(k => round(g.totals[k],2)), unit: '€', colors
    });
  });

  const detailColumns = ['Evento','Producto','Segmento','Destino','Situacion','Importe','Ticket u otros gastos','Tienda','Responsable'];
  return {
    ok: true,
    rejected: false,
    title: `Compras por segmento, destino y situación${events.length ? ` - ${events.join(' | ')}` : ''}`,
    answer: `He agrupado ${compras.length} línea(s) de compra por SEGMENTO/DESTINO y por situación. Total general: ${totalGeneral.toLocaleString('es-ES',{maximumFractionDigits:2})} €. Los quesos parciales mantienen el mismo código de color: Pte. Compra en rojo, TKxx en azul y GASTOS CORRIENTES en negro.`,
    warnings: arr(context.advertencias),
    charts,
    tables: [{ title: 'Totales parciales y total general por SEGMENTO / DESTINO', columns, rows }],
    files: [
      { filename: fileSafe(`Compras_segmento_destino_situacion_${events.join('_') || 'evento'}_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, ordered.map(g => ({ Segmento:g.Segmento, Destino:g.Destino, 'Pte. Compra (€)':round(g.totals['Pte. Compra'],2), 'TKxx (€)':round(g.totals.TKxx,2), 'GASTOS CORRIENTES (€)':round(g.totals['GASTOS CORRIENTES'],2), 'Total parcial (€)':round(g.total,2), '% del total general':totalGeneral ? `${round((g.total*100)/totalGeneral,2)} %` : '0 %', Líneas:g.lines }))) },
      { filename: fileSafe(`Compras_segmento_destino_situacion_detalle_${events.join('_') || 'evento'}_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(detailColumns, detail) }
    ],
    provider: 'control-event-local-segmento-destino-situacion',
    model: 'calculo-local-oficial'
  };
}


function isModuleDataPrompt(prompt) {
  const p = norm(prompt);
  return /\b(donacion|donaciones|donado|donante|compra|compras|gasto|gastos|ingreso|ingresos|recaudacion|recaudación|asistente|asistentes|colaborador|colaboradores|ticket|tickets|tk\s*\d+|documento|documentos|evento|eventos|producto|productos|tienda|tiendas|persona|personas|responsable|responsables)\b/.test(p);
}

function isComparativeAllDataPrompt(prompt) {
  const p = norm(prompt);
  return /\b(compara|comparar|comparativa|comparativo|entre\s+los\s+eventos|entre\s+eventos)\b/.test(p)
    && /\b(todo|todos|todas|global|general|colaborador|colaboradores|justificante|justificantes|ingreso|ingresos|compra|compras|tk|ticket|tickets|documento|documentos|donacion|donaciones)\b/.test(p);
}
function uniqueEventNamesFromContext(context) {
  return arr(context?.eventosObjetivo)
    .map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.EVENTO || e?.Evento))
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
}
function rowsForEvent(rows, eventName) {
  const n = norm(eventName);
  return arr(rows).filter(row => norm(row?.Evento || row?.['Titulo del evento']) === n);
}
function countYes(rows, field) {
  return arr(rows).filter(r => /^(si|sí|s)$/i.test(trim(r?.[field]))).length;
}
function sumField(rows, field) {
  return round(arr(rows).reduce((acc, r) => acc + num(r?.[field]), 0), 2);
}
function directComparativeAllDataResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  if (!isComparativeAllDataPrompt(prompt)) return null;
  const mods = context.modulosExtraidos || {};
  const events = uniqueEventNamesFromContext(context);
  if (events.length < 2) return null;

  const ingresos = arr(mods.INGRESOS);
  const compras = arr(mods.COMPRAS);
  const donaciones = arr(mods.DONACIONES);
  const tickets = arr(mods.TICKETS);
  const documentos = arr(mods.DOCUMENTOS);

  const canonicalByEvent = new Map(arr(context?.metricasCanonicas?.porEvento).map(r => [norm(r.Evento), r]));
  const rows = events.map(eventName => {
    const ing = rowsForEvent(ingresos, eventName);
    const com = rowsForEvent(compras, eventName);
    const don = rowsForEvent(donaciones, eventName);
    const tk = rowsForEvent(tickets, eventName);
    const doc = rowsForEvent(documentos, eventName);
    const can = canonicalByEvent.get(norm(eventName)) || {};
    const importeIngresos = round(can['Ingresos total'] ?? ing.reduce((acc, r) => acc + num(r?.['Importe obligatorio']) + num(r?.['Importe voluntario']), 0), 2);
    const importeCompras = round(can['Compras realizadas'] ?? sumField(com.filter(r => !/pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos']))), 'Importe'), 2);
    const valorDonaciones = round(can['Donaciones valor'] ?? sumField(don, 'Valor'), 2);
    const totalTk = round(can['Tickets total'] ?? tk.reduce((acc, r) => acc + num(r?.['Total ticket']), 0), 2);
    return {
      Evento: eventName,
      Colaboradores: can['Colaboradores registros'] ?? ing.length,
      'Asistentes / Numero': round(can['Asistentes / Numero'] ?? ing.reduce((acc, r) => acc + num(r?.Numero), 0), 3),
      'Just.ing SI': can['Justificantes ingreso SI'] ?? countYes(ing, 'Just.ing'),
      'Ingresos total (€)': importeIngresos,
      'Compras líneas': can['Compras registros'] ?? com.length,
      'Compras realizadas (€)': importeCompras,
      'Compras pendientes (€)': round(can['Compras pendientes'] ?? 0, 2),
      'Donaciones líneas': can['Donaciones registros'] ?? don.length,
      'Donaciones valor (€)': valorDonaciones,
      TKxx: can['Tickets numero'] ?? tk.length,
      'TKxx total (€)': totalTk,
      Documentos: can['Documentos numero'] ?? doc.length,
      'Saldo actual ingresos - compras (€)': round(can['Saldo actual'] ?? (importeIngresos - importeCompras), 2),
      'Valoración compras + donaciones (€)': round(can['Valoracion con donaciones'] ?? (importeCompras + valorDonaciones), 2)
    };
  });

  const columns = ['Evento','Colaboradores','Asistentes / Numero','Just.ing SI','Ingresos total (€)','Compras líneas','Compras realizadas (€)','Compras pendientes (€)','Donaciones líneas','Donaciones valor (€)','TKxx','TKxx total (€)','Documentos','Saldo actual ingresos - compras (€)','Valoración compras + donaciones (€)'];
  const tableRows = rows.map(r => columns.map(c => text(r[c])));
  const auditRows = [
    ['Modo', 'Comparativa estricta entre eventos citados'],
    ['Eventos usados', events.join(' | ')],
    ['Eventos no citados', 'Excluidos'],
    ['Módulos usados', ['INGRESOS','COMPRAS','DONACIONES','TICKETS','DOCUMENTOS'].filter(m => Array.isArray(mods[m])).join(', ')],
    ['Motor de cálculo', 'ControlEvent local, sin Zuzu para selección de eventos ni sumas']
  ];
  let charts = [
    { title: 'Ingresos total por evento', type: 'bar', labels: events, values: rows.map(r => round(r['Ingresos total (€)'], 2)), unit: '€' },
    { title: 'Compras total por evento', type: 'bar', labels: events, values: rows.map(r => round(r['Compras realizadas (€)'], 2)), unit: '€' },
    { title: 'Donaciones valor por evento', type: 'bar', labels: events, values: rows.map(r => round(r['Donaciones valor (€)'], 2)), unit: '€' },
    { title: 'Colaboradores por evento', type: 'bar', labels: events, values: rows.map(r => round(r.Colaboradores, 2)), unit: '' }
  ];
  return {
    ok: true,
    rejected: false,
    title: `Comparativa estricta entre ${events.length} eventos`,
    answer: `Comparativa entre ${events.join(' y ')}.` ,
    warnings: arr(context.advertencias),
    charts,
    tables: [
      { title: 'Comparativa general por evento', columns, rows: tableRows }
    ],
    files: [{ filename: fileSafe(`Comparativa_eventos_v27_prod_1.2.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }],
    provider: 'control-event-local-comparativa-estricta',
    model: 'sin-gemini-para-alcance-ni-calculos'
  };
}


function firstIntInPrompt(prompt, fallback = 25) {
  const m = text(prompt).match(/\b(\d{1,4})\b/);
  const n = m ? Number(m[1]) : fallback;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : fallback;
}
function firstRankingLimitInPrompt(prompt, fallback = 25) {
  const raw = text(prompt);
  const patterns = [
    /\b(?:top|ranking)\s*(?:de)?\s*(\d{1,3})\b/i,
    /\b(\d{1,3})\s+(?:producto|productos|articulo|articulos)\b/i,
    /\bprimer(?:os|as)?\s+(\d{1,3})\b/i
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    const n = m ? Number(m[1]) : 0;
    if (Number.isFinite(n) && n > 0) return Math.min(n, 100);
  }
  return fallback;
}
function parseEventDateForSort(value) {
  const s = trim(value);
  let m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2}|\d{4})$/);
  if (m) {
    let y = Number(m[3]); if (y < 100) y += 2000;
    return new Date(y, Number(m[2]) - 1, Number(m[1])).getTime() || 0;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime() || 0;
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}
function eventNamesFromContext(context) {
  return arr(context?.eventosObjetivo).map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.Evento || e?.EVENTO)).filter(Boolean);
}
function eventMetaByNameFromContext(context) {
  const out = new Map();
  const merge = row => {
    const title = trim(row?.['Titulo del evento'] || row?.Titulo || row?.Evento || row?.EVENTO || row?.titulo || row?.nombre || '');
    if (!title) return;
    const key = norm(title);
    const old = out.get(key) || { Evento: title };
    out.set(key, {
      ...old,
      Evento: old.Evento || title,
      Estado: firstNonEmpty(old.Estado, row?.Estado, row?.estado, row?.situacion, row?.Situacion),
      'Fecha inicio': firstNonEmpty(old['Fecha inicio'], row?.['fecha ini'], row?.fechaIni, row?.fecha_inicio, row?.FechaInicio, row?.Fecha),
      'Fecha fin': firstNonEmpty(old['Fecha fin'], row?.['fecha fin'], row?.fechaFin, row?.fecha_fin, row?.FechaFin)
    });
  };
  arr(context?.modulosExtraidos?.EVENTOS).forEach(merge);
  arr(context?.eventosObjetivo).forEach(merge);
  return out;
}
function isEventInProgressValue(value) {
  return /en\s*curso|abiert|activo|preparaci[oó]n/i.test(trim(value));
}
function eventLabelWithState(name, metaMap) {
  const meta = metaMap?.get?.(norm(name)) || {};
  const state = trim(meta.Estado);
  return state && isEventInProgressValue(state) ? `${name} · En curso` : name;
}
function eventStateNoteForRow(name, metaMap) {
  const meta = metaMap?.get?.(norm(name)) || {};
  const state = trim(meta.Estado);
  if (!state) return '';
  if (isEventInProgressValue(state)) return 'Evento En curso: cifras provisionales; ingresos, compras, donaciones y saldo pueden variar hasta el cierre.';
  if (/finalizad|cerrad/i.test(state)) return 'Evento cerrado/finalizado: cifras comparables como cierre.';
  return '';
}
function normEq(a, b) { return norm(a) === norm(b); }
function nameMatches(value, needle) {
  const v = norm(value), n = norm(needle);
  if (!v || !n) return false;
  if (v === n) return true;
  // Coincidencia flexible, pero evitando que una palabra corta contamine muchos nombres.
  if (n.length >= 4 && v.includes(n)) return true;
  if (v.length >= 5 && n.includes(v)) return true;
  const vw = v.split(' ').filter(x => x.length >= 3);
  const nw = n.split(' ').filter(x => x.length >= 3);
  if (!vw.length || !nw.length) return false;
  let hits = 0;
  nw.forEach(w => {
    if (vw.includes(w)) hits += 1;
    else if (w.length >= 5 && vw.some(x => x.length >= 5 && (x.startsWith(w) || w.startsWith(x)))) hits += 0.5;
  });
  return hits >= Math.max(1, Math.ceil(Math.min(nw.length, 3) * 0.6));
}
function quotedNames(prompt) {
  const out = [];
  const re = /["“”']([^"“”']{2,120})["“”']/g; let m;
  while ((m = re.exec(text(prompt)))) out.push(trim(m[1]));
  return out;
}
function uniqueRowsBy(rows, keyFn) {
  const seen = new Set(); const out = [];
  arr(rows).forEach(r => { const k = keyFn(r); if (!seen.has(k)) { seen.add(k); out.push(r); } });
  return out;
}
function directEventPriceExtremesIfApplicable(prompt, context) {
  const p = norm(prompt);
  if (!/\b(evento|eventos)\b/.test(p) || !/\b(precio|barato|costoso|caro|maximo|maxima|mínimo|minimo)\b/.test(p)) return null;
  const rows = uniqueRowsBy(arr(context?.modulosExtraidos?.EVENTOS), r => trim(r?.['Titulo del evento'])).filter(r => trim(r?.['Titulo del evento']));
  if (!rows.length) return null;
  const positive = rows.filter(r => num(r?.Precio) > 0);
  const base = positive.length ? positive : rows;
  const sorted = base.slice().sort((a,b)=>num(a.Precio)-num(b.Precio));
  const barato = sorted[0]; const caro = sorted[sorted.length-1];
  const columns = ['Concepto','Titulo del evento','Precio','fecha ini','fecha fin','Estado'];
  const tableRows = [
    ['Más barato', barato?.['Titulo del evento'] || '', String(round(barato?.Precio,2)), text(barato?.['fecha ini']), text(barato?.['fecha fin']), text(barato?.Estado)],
    ['Más costoso', caro?.['Titulo del evento'] || '', String(round(caro?.Precio,2)), text(caro?.['fecha ini']), text(caro?.['fecha fin']), text(caro?.Estado)]
  ];
  const warnings = positive.length && positive.length < rows.length ? ['Se han ignorado eventos con precio 0 para no confundir “sin precio definido” con el evento más barato.'] : [];
  return { ok:true, rejected:false, title:'Precio de eventos', answer:`ControlEvent ha revisado ${rows.length} evento(s) y ha calculado localmente el más barato y el más costoso.`, warnings, charts:[{title:'Precio de eventos extremos', type:'bar', labels:['Más barato','Más costoso'], values:[round(barato?.Precio,2), round(caro?.Precio,2)], unit:'€'}], tables:[{title:'Evento más barato y más costoso', columns, rows: tableRows}], files:[{filename:fileSafe('EVENTOS_precios_extremos_v27_prod_1.2.csv'), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, tableRows.map(r=>Object.fromEntries(columns.map((c,i)=>[c,r[i]]))))}], provider:'control-event-local-eventos-precios', model:'sin-gemini-para-calculos' };
}
function directPersonAppearanceIfApplicable(prompt, context) {
  const p = norm(prompt);
  if (!/\b(busca|buscar|aparece|aparecen|cuantos|cuántos|revisa|participa|participan|participo|participado|participacion|participación|papel|desempenado|desempeñado|informe)\b/.test(p) || !/\b(persona|colaborador|colaboradores|responsable|responsables|donante|donantes)\b/.test(p)) return null;
  const needles = personNeedlesFromPrompt(prompt, context);
  const needle = needles[0] || '';
  if (!needle) return null;
  const ingresos = arr(context?.modulosExtraidos?.INGRESOS).filter(r => nameMatches(r?.Nombre, needle));
  const comprasResp = arr(context?.modulosExtraidos?.COMPRAS).filter(r => nameMatches(r?.Responsable, needle));
  const donResp = arr(context?.modulosExtraidos?.DONACIONES).filter(r => nameMatches(r?.Responsable, needle));
  const donDonante = /\bdonante|donantes|donad/.test(p) ? arr(context?.modulosExtraidos?.DONACIONES).filter(r => nameMatches(r?.Donante, needle)) : [];
  const events = new Map();
  function touch(evento){ const e=trim(evento)||'Sin evento'; if(!events.has(e)) events.set(e,{Evento:e, Colaborador:0,'Responsable compras':0,'Responsable donaciones':0,'Donante donaciones':0}); return events.get(e); }
  ingresos.forEach(r=>touch(r.Evento).Colaborador += 1);
  comprasResp.forEach(r=>touch(r.Evento)['Responsable compras'] += 1);
  donResp.forEach(r=>touch(r.Evento)['Responsable donaciones'] += 1);
  donDonante.forEach(r=>touch(r.Evento)['Donante donaciones'] += 1);
  const rows = [...events.values()].sort((a,b)=>String(a.Evento).localeCompare(String(b.Evento),'es'));
  const columns = ['Evento','Colaborador','Responsable compras','Responsable donaciones','Donante donaciones'];
  return { ok:true, rejected:false, title:`Apariciones de ${needle}`, answer:`ControlEvent ha buscado a “${needle}” en los módulos disponibles: INGRESOS, COMPRAS y DONACIONES. Aparece en ${rows.length} evento(s).`, warnings: rows.length?[]:[`No hay coincidencias para “${needle}” en los módulos extraídos. Prueba con el nombre tal como aparece en PERSONAS/TIENDAS.`], charts:rows.length?[{title:`Eventos donde aparece ${needle}`, type:'bar', labels:rows.map(r=>r.Evento), values:rows.map(r=>r.Colaborador+r['Responsable compras']+r['Responsable donaciones']+r['Donante donaciones']), unit:'apariciones'}]:[], tables:rows.length?[{title:`Apariciones de ${needle} por evento`, columns, rows: rows.map(r=>columns.map(c=>text(r[c])))}]:[], files:rows.length?[{filename:fileSafe(`Apariciones_${needle}_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}]:[], provider:'control-event-local-busqueda-persona', model:'sin-gemini-para-busquedas' };
}

function personNeedlesFromPrompt(prompt, context) {
  const eventNames = eventNamesFromContext(context).map(norm);
  const quoted = quotedNames(prompt).filter(q => {
    const nq = norm(q);
    return !eventNames.some(ev => ev === nq || ev.includes(nq) || nq.includes(ev));
  });
  if (quoted.length) return uniqueTextList(quoted);
  const raw = text(prompt);
  const patterns = [
    /\b(?:de|del|para|sobre)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9 ._-]{2,60}?)(?=\s+(?:con|como|en|que|y|o|,|\.|$))/,
    /\b(?:persona|colaborador|responsable|donante)\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ0-9 ._-]{2,60}?)(?=\s+(?:con|como|en|que|y|o|,|\.|$))/i
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m && trim(m[1])) return uniqueTextList([trim(m[1]).replace(/^['"“”]+|['"“”]+$/g, '')]);
  }
  const people = arr(context?.modulosExtraidos?.PERSONAS);
  if (people.length === 1) return uniqueTextList([people[0]?.['Nombre persona']]);
  return [];
}

function zuzuPersonIdentityPrompt(prompt) {
  const p = norm(prompt);
  return /\b(quien\s+es|quién\s+es|sabes\s+quien\s+es|sabes\s+quién\s+es|conoces\s+a|datos\s+de|datos\s+del|datos\s+sobre|ficha\s+de|informacion\s+de|información\s+de|info\s+de|dime\s+sus\s+datos)\b/.test(p);
}
function cleanPersonNeedle(value) {
  return trim(value)
    .replace(/^['"“”]+|['"“”]+$/g, '')
    .replace(/\b(dime|sus|datos|por\s+favor|porfa|sabes|conoces|quien|quién|es|de|del|sobre|info|informacion|información|ficha)\b/ig, ' ')
    .replace(/[?¿!¡.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function identityNeedlesFromPrompt(prompt, context) {
  const out = personNeedlesFromPrompt(prompt, context).slice();
  const raw = text(prompt);
  const patterns = [
    /\b(?:quien|quién)\s+es\s+["“”']?([^?¿!¡,"“”';:\n]{2,70})["“”']?/i,
    /\b(?:sabes\s+(?:quien|quién)\s+es|conoces\s+a)\s+["“”']?([^?¿!¡,"“”';:\n]{2,70})["“”']?/i,
    /\b(?:datos|ficha|info|informacion|información)\s+(?:de|del|sobre)\s+["“”']?([^?¿!¡,"“”';:\n]{2,70})["“”']?/i
  ];
  for (const re of patterns) {
    const m = raw.match(re);
    if (m && trim(m[1])) out.push(cleanPersonNeedle(m[1]));
  }
  const q = quotedNames(prompt).map(cleanPersonNeedle).filter(Boolean);
  q.forEach(x => out.push(x));
  return uniqueTextList(out.filter(x => trim(x).length >= 2));
}
function loggedUserFromContext(context) {
  const u = context?.usuarioLogado || context?.user || context?.ce_acceso || context?.ceAcceso || null;
  if (!u || typeof u !== 'object') return null;
  const identificacion = firstNonEmpty(u.Identificacion, u.identificacion, u.usuario, u.user, u.apodo);
  const nombre = firstNonEmpty(u.Nombre, u.nombre, u.name);
  const nivel = firstNonEmpty(u.Nivel, u.nivel, u.rol, u.Rol);
  if (!identificacion && !nombre) return null;
  return { Identificacion: identificacion, Nombre: nombre, Nivel: nivel };
}
function loggedUserMatchesNeedle(user, needle) {
  if (!user || !needle) return false;
  return nameMatches(user.Identificacion, needle) || nameMatches(user.Nombre, needle);
}
function directPersonIdentityIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  if (!zuzuPersonIdentityPrompt(prompt)) return null;
  const needles = identityNeedlesFromPrompt(prompt, context);
  const needle = needles[0] || '';
  if (!needle) return null;
  const mods = context.modulosExtraidos || {};
  const user = loggedUserFromContext(context);
  const loginMatch = loggedUserMatchesNeedle(user, needle);
  const people = arr(mods.PERSONAS).filter(r => nameMatches(r?.['Nombre persona'] || r?.Nombre || r?.nombre, needle));
  const ingresos = arr(mods.INGRESOS).filter(r => nameMatches(r?.Nombre, needle));
  const comprasResp = arr(mods.COMPRAS).filter(r => nameMatches(r?.Responsable, needle));
  const donResp = arr(mods.DONACIONES).filter(r => nameMatches(r?.Responsable, needle));
  const donDonante = arr(mods.DONACIONES).filter(r => nameMatches(r?.Donante, needle));
  const ficha = [];
  people.slice(0, 20).forEach(r => ficha.push({ Origen: 'PERSONAS', Nombre: trim(r?.['Nombre persona'] || r?.Nombre || ''), Identificacion: trim(r?.Identificacion || r?.identificacion || r?.Apodo || ''), Rango: trim(r?.Rango || r?.rango || ''), Telefono: trim(r?.Telefono || r?.telefono || ''), Email: trim(r?.Email || r?.email || '') }));
  if (loginMatch) ficha.unshift({ Origen: 'USUARIO LOGADO', Nombre: trim(user.Nombre), Identificacion: trim(user.Identificacion), Rango: trim(user.Nivel), Telefono: '', Email: '' });
  const actividad = [];
  ingresos.forEach(r => actividad.push({ Evento: trim(r.Evento), Papel: 'Colaborador / ingreso', Producto: '', Unidades: '', 'Importe/valor (€)': round(num(r?.['Importe obligatorio']) + num(r?.['Importe voluntario']), 2), Detalle: `Ingreso: ${trim(r.Ingreso || '')}; rango: ${trim(r.Rango || '')}; número: ${trim(r.Numero || '')}` }));
  comprasResp.forEach(r => actividad.push({ Evento: trim(r.Evento), Papel: 'Responsable de compra/gasto', Producto: trim(r.Producto), Unidades: round(r.Unidades, 3), 'Importe/valor (€)': round(r.Importe, 2), Detalle: `${trim(r['Ticket u otros gastos'] || '')}; tienda: ${trim(r.Tienda || '')}` }));
  donResp.forEach(r => actividad.push({ Evento: trim(r.Evento), Papel: 'Responsable de donación', Producto: trim(r.Producto), Unidades: round(r.Unidades, 3), 'Importe/valor (€)': round(r.Valor, 2), Detalle: `${trim(r['Tipo de donación'] || '')}; donante: ${trim(r.Donante || '')}` }));
  donDonante.forEach(r => actividad.push({ Evento: trim(r.Evento), Papel: 'Donante', Producto: trim(r.Producto), Unidades: round(r.Unidades, 3), 'Importe/valor (€)': round(r.Valor, 2), Detalle: `${trim(r['Tipo de donación'] || '')}; responsable: ${trim(r.Responsable || '')}` }));
  actividad.sort((a,b)=>String(a.Evento).localeCompare(String(b.Evento),'es') || String(a.Papel).localeCompare(String(b.Papel),'es'));
  const colsFicha = ['Origen','Nombre','Identificacion','Rango','Telefono','Email'];
  const colsAct = ['Evento','Papel','Producto','Unidades','Importe/valor (€)','Detalle'];
  const displayName = loginMatch && trim(user.Identificacion) ? trim(user.Identificacion) : needle;
  const total = actividad.length + ficha.length;
  const answer = total
    ? `He buscado a “${needle}” en PERSONAS, en el usuario logado actual y en su actividad de INGRESOS, COMPRAS y DONACIONES. ${loginMatch ? `Además coincide con el usuario conectado: ${trim(user.Identificacion) || trim(user.Nombre)}.` : ''} Actividad encontrada: ${actividad.length} línea(s).`
    : `No he encontrado a “${needle}” en PERSONAS, usuario logado ni en la actividad de INGRESOS, COMPRAS o DONACIONES de los datos extraídos.`;
  const tables = [];
  if (ficha.length) tables.push({ title: `Ficha / identidad de ${displayName}`, columns: colsFicha, rows: ficha.map(r => colsFicha.map(c => text(r[c]))) });
  if (actividad.length) tables.push({ title: `Participación de ${displayName}`, columns: colsAct, rows: actividad.map(r => colsAct.map(c => text(r[c]))) });
  const files = [];
  if (ficha.length) files.push({ filename: fileSafe(`PERSONA_${displayName}_ficha_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(colsFicha, ficha) });
  if (actividad.length) files.push({ filename: fileSafe(`PERSONA_${displayName}_actividad_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(colsAct, actividad) });
  return { ok:true, rejected:false, title:`Datos de ${displayName}`, answer, warnings: total ? [] : [`Se han revisado PERSONAS, usuarioLogado, INGRESOS, COMPRAS y DONACIONES dentro del contexto entregado.`], charts:[], tables, files, provider:'control-event-local-persona-identidad', model:'sin-gemini-para-identidad-persona' };
}

function directPersonRoleReportIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  const hasParticipationCue = /\b(informe|papel|participacion|participación|desempenad[oa]|responsable|donante|colaborador|colaboradora|aparece|aparecen|participa|participan|participado|interviene|intervino)\b/.test(p);
  const hasRoleCue = /\b(responsable|donante|colaborador|colaboradora|colaboradores|persona|papel|participacion|participación)\b/.test(p);
  if (!hasParticipationCue) return null;
  if (!hasRoleCue && !quotedNames(prompt).length) return null;
  const needles = personNeedlesFromPrompt(prompt, context);
  const needle = needles[0] || '';
  if (!needle) return null;
  const ingresos = arr(context?.modulosExtraidos?.INGRESOS).filter(r => nameMatches(r?.Nombre, needle));
  const comprasResp = arr(context?.modulosExtraidos?.COMPRAS).filter(r => nameMatches(r?.Responsable, needle));
  const donResp = arr(context?.modulosExtraidos?.DONACIONES).filter(r => nameMatches(r?.Responsable, needle));
  const donDonante = arr(context?.modulosExtraidos?.DONACIONES).filter(r => nameMatches(r?.Donante, needle));
  const detail = [];
  ingresos.forEach(r => detail.push({ Evento: trim(r.Evento), Papel: 'Colaborador / ingreso', Producto: '', Unidades: '', 'Importe/valor (€)': round(num(r?.['Importe obligatorio']) + num(r?.['Importe voluntario']), 2), Detalle: `Ingreso: ${trim(r.Ingreso || '')}; rango: ${trim(r.Rango || '')}; número: ${trim(r.Numero || '')}`, Relacionado: trim(r.Nombre || '') }));
  comprasResp.forEach(r => detail.push({ Evento: trim(r.Evento), Papel: 'Responsable de compra/gasto', Producto: trim(r.Producto), Unidades: round(r.Unidades, 3), 'Importe/valor (€)': round(r.Importe, 2), Detalle: `${trim(r['Ticket u otros gastos'] || '')}; tienda: ${trim(r.Tienda || '')}`, Relacionado: trim(r.Responsable || '') }));
  donResp.forEach(r => detail.push({ Evento: trim(r.Evento), Papel: 'Responsable de donación', Producto: trim(r.Producto), Unidades: round(r.Unidades, 3), 'Importe/valor (€)': round(r.Valor, 2), Detalle: `${trim(r['Tipo de donación'] || '')}; donante: ${trim(r.Donante || '')}`, Relacionado: trim(r.Responsable || '') }));
  donDonante.forEach(r => detail.push({ Evento: trim(r.Evento), Papel: 'Donante', Producto: trim(r.Producto), Unidades: round(r.Unidades, 3), 'Importe/valor (€)': round(r.Valor, 2), Detalle: `${trim(r['Tipo de donación'] || '')}; responsable: ${trim(r.Responsable || '')}`, Relacionado: trim(r.Donante || '') }));
  if (!detail.length) {
    const eventos = eventNamesFromContext(context);
    return {
      ok: true,
      rejected: false,
      title: `Participación de ${needle}`,
      answer: `No he encontrado registros operativos de “${needle}” en INGRESOS, COMPRAS ni DONACIONES${eventos.length ? ` dentro de: ${eventos.join(' | ')}` : ''}. No devuelvo la tabla técnica de EVENTOS porque eso no respondería a “con qué participó”.`,
      warnings: [`Se han revisado los módulos de actividad del evento, no solo la ficha técnica de EVENTOS.`],
      charts: [],
      tables: [],
      files: [],
      provider: 'control-event-local-informe-persona-cero',
      model: 'sin-gemini-para-informes-de-persona'
    };
  }
  detail.sort((a,b)=>String(a.Evento).localeCompare(String(b.Evento),'es') || String(a.Papel).localeCompare(String(b.Papel),'es') || String(a.Producto).localeCompare(String(b.Producto),'es'));
  const byEvent = new Map();
  const byRole = new Map();
  detail.forEach(r => {
    const ev = trim(r.Evento) || 'Sin evento';
    const e = byEvent.get(ev) || { Evento: ev, Colaborador: 0, 'Resp. compras': 0, 'Resp. donaciones': 0, Donante: 0, 'Importe/valor total (€)': 0 };
    if (r.Papel === 'Colaborador / ingreso') e.Colaborador += 1;
    else if (r.Papel === 'Responsable de compra/gasto') e['Resp. compras'] += 1;
    else if (r.Papel === 'Responsable de donación') e['Resp. donaciones'] += 1;
    else if (r.Papel === 'Donante') e.Donante += 1;
    e['Importe/valor total (€)'] = round(e['Importe/valor total (€)'] + num(r['Importe/valor (€)']), 2);
    byEvent.set(ev, e);
    const role = trim(r.Papel) || 'Sin papel';
    const old = byRole.get(role) || { Papel: role, Registros: 0, 'Importe/valor (€)': 0 };
    old.Registros += 1; old['Importe/valor (€)'] = round(old['Importe/valor (€)'] + num(r['Importe/valor (€)']), 2); byRole.set(role, old);
  });
  const summary = [...byEvent.values()].sort((a,b)=>String(a.Evento).localeCompare(String(b.Evento),'es'));
  const roleRows = [...byRole.values()].sort((a,b)=>num(b.Registros)-num(a.Registros));
  const colsSummary = ['Evento','Colaborador','Resp. compras','Resp. donaciones','Donante','Importe/valor total (€)'];
  const colsRoles = ['Papel','Registros','Importe/valor (€)'];
  const colsDetail = ['Evento','Papel','Producto','Unidades','Importe/valor (€)','Detalle','Relacionado'];
  const totalValor = round(detail.reduce((a,r)=>a+num(r['Importe/valor (€)']),0),2);
  return {
    ok: true,
    rejected: false,
    title: `Informe de participación de ${needle}`,
    answer: `He localizado ${detail.length} registro(s) de “${needle}” en ${summary.length} evento(s). Separado por papeles: colaborador/ingresos, responsable de compras, responsable de donaciones y donante. Valor económico registrado en esas líneas: ${totalValor} €.`,
    warnings: [],
    charts: [
      { title: `Participación de ${needle} por evento`, type: 'stackedBar', labels: summary.map(r=>r.Evento), values: [], unit: 'reg.', series: [
        { name: 'Colaborador', values: summary.map(r=>num(r.Colaborador)) },
        { name: 'Resp. compras', values: summary.map(r=>num(r['Resp. compras'])) },
        { name: 'Resp. donaciones', values: summary.map(r=>num(r['Resp. donaciones'])) },
        { name: 'Donante', values: summary.map(r=>num(r.Donante)) }
      ] },
      { title: `Valor asociado a ${needle} por evento`, type: 'bar', labels: summary.map(r=>r.Evento), values: summary.map(r=>round(r['Importe/valor total (€)'],2)), unit: '€' }
    ],
    tables: [
      { title: 'Resumen por evento y papel', columns: colsSummary, rows: summary.map(r=>colsSummary.map(c=>text(r[c]))) },
      { title: 'Resumen por papel desempeñado', columns: colsRoles, rows: roleRows.map(r=>colsRoles.map(c=>text(r[c]))) },
      { title: 'Detalle de registros localizados', columns: colsDetail, rows: detail.slice(0, 500).map(r=>colsDetail.map(c=>text(r[c]))) }
    ],
    files: [{ filename: fileSafe(`Informe_participacion_${needle}_v27_prod_1.2.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(colsDetail, detail) }],
    provider: 'control-event-local-informe-persona',
    model: 'sin-gemini-para-informes-de-persona'
  };
}
function parseInitialCashFromPrompt(prompt) {
  const matches = [...text(prompt).matchAll(/(?:saldo(?:\s+de\s+caja)?\s+(?:inicial|de)?|comenzando\s+con\s+un\s+saldo\s+de|partiendo\s+de)\s*([+-]?\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|[+-]?\d+(?:[,.]\d{1,2})?)\s*€?/gi)];
  const raw = matches.length ? matches[matches.length - 1][1] : '';
  if (!raw) return 0;
  const n = Number(raw.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? round(n, 2) : 0;
}
function directCashEvolutionIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  if (!/\b(saldo\s+de\s+caja|saldo\s+caja|caja|evolucion\s+del\s+saldo|evolución\s+del\s+saldo|balance\s+de\s+caja)\b/.test(p)) return null;
  if (!/\b(grafica|gráfica|grafico|gráfico|evolucion|evolución|temporal|ordenad[oa]s?)\b/.test(p)) return null;
  const events = arr(context?.eventosObjetivo).map(e => ({
    Evento: trim(e?.['Titulo del evento'] || e?.Titulo || e?.Evento || e?.EVENTO),
    fechaIni: trim(e?.['fecha ini'] || e?.fechaIni || e?.Fecha || ''),
    fechaFin: trim(e?.['fecha fin'] || e?.fechaFin || ''),
    Estado: trim(e?.Estado || e?.situacion || '')
  })).filter(e => e.Evento);
  if (!events.length) return null;
  const byEvent = new Map(arr(context?.metricasCanonicas?.porEvento).map(r => [norm(r.Evento), r]));
  const mods = context?.modulosExtraidos || {};
  const sorted = events.slice().sort((a,b)=>parseEventDateForSort(a.fechaIni || a.fechaFin)-parseEventDateForSort(b.fechaIni || b.fechaFin) || String(a.Evento).localeCompare(String(b.Evento),'es'));
  let acumulado = parseInitialCashFromPrompt(prompt);
  const inicial = acumulado;
  const rows = sorted.map(ev => {
    const can = byEvent.get(norm(ev.Evento)) || {};
    const ing = rowsForEvent(arr(mods.INGRESOS), ev.Evento);
    const com = rowsForEvent(arr(mods.COMPRAS), ev.Evento);
    const ingresos = round(can['Ingresos total'] ?? ing.reduce((a,r)=>a+num(r?.['Importe obligatorio'])+num(r?.['Importe voluntario']),0), 2);
    const compras = round(can['Compras realizadas'] ?? sumField(com.filter(r=>!/pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos']))),'Importe'), 2);
    const movimiento = round(ingresos - compras, 2);
    acumulado = round(acumulado + movimiento, 2);
    return { Evento: ev.Evento, Fecha: ev.fechaIni || ev.fechaFin, Estado: ev.Estado, 'Saldo inicial antes del evento (€)': round(acumulado - movimiento, 2), 'Ingresos (€)': ingresos, 'Compras realizadas (€)': compras, 'Movimiento evento (€)': movimiento, 'Saldo de caja acumulado (€)': acumulado };
  });
  const cols = ['Fecha','Evento','Estado','Saldo inicial antes del evento (€)','Ingresos (€)','Compras realizadas (€)','Movimiento evento (€)','Saldo de caja acumulado (€)'];
  const anio = (text(prompt).match(/\b(20\d{2}|19\d{2})\b/) || [,''])[1];
  return {
    ok: true,
    rejected: false,
    title: `Evolución del saldo de caja${anio ? ` ${anio}` : ''}`,
    answer: `Saldo inicial aplicado: ${inicial} €. He ordenado ${rows.length} evento(s) temporalmente y he calculado cada movimiento como ingresos - compras realizadas. Saldo final acumulado: ${rows.length ? rows[rows.length-1]['Saldo de caja acumulado (€)'] : inicial} €.`,
    warnings: [],
    charts: [
      { title: 'Saldo de caja acumulado por evento', type: 'line', labels: rows.map(r=>r.Evento), values: rows.map(r=>round(r['Saldo de caja acumulado (€)'],2)), unit: '€' },
      { title: 'Movimiento de caja de cada evento', type: 'bar', labels: rows.map(r=>r.Evento), values: rows.map(r=>round(r['Movimiento evento (€)'],2)), unit: '€' },
      { title: 'Ingresos y compras realizadas por evento', type: 'stackedBar', labels: rows.map(r=>r.Evento), values: [], unit: '€', series: [
        { name: 'Ingresos', values: rows.map(r=>round(r['Ingresos (€)'],2)) },
        { name: 'Compras realizadas', values: rows.map(r=>round(r['Compras realizadas (€)'],2)) }
      ] }
    ],
    tables: [{ title: 'Evolución temporal del saldo de caja', columns: cols, rows: rows.map(r=>cols.map(c=>text(r[c]))) }],
    files: [{ filename: fileSafe(`Evolucion_saldo_caja_${anio || 'ControlEvent'}_v27_prod_1.2.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(cols, rows) }],
    provider: 'control-event-local-saldo-caja',
    model: 'sin-gemini-para-saldo-caja'
  };
}
function friendlyZuzuErrorMessage(error) {
  const msg = trim(error?.message || error);
  if (/quota|RESOURCE_EXHAUSTED|rate|429|rate-limit|rate limit|free_tier/i.test(msg)) return 'Zuzu ha alcanzado temporalmente la cuota de la API. ControlEvent intentará resolver localmente las preguntas que pueda; si no hay cálculo local disponible, espera un minuto y repite la consulta.';
  if (/timeout|abort|tard[oó] demasiado|504/i.test(msg)) return 'Zuzu ha tardado demasiado. Prueba con una petición más concreta o repite la consulta.';
  if (/GEMINI_API_KEY|api key|key/i.test(msg)) return 'Zuzu no está bien configurado en el servidor. Revisa la clave GEMINI_API_KEY en Vercel.';
  return 'Zuzu no pudo completar la respuesta final. ControlEvent conserva la consulta y, cuando pueda, mostrará un respaldo local basado en los módulos oficiales.';
}
function directBoughtDonatedUsageIfApplicable(prompt, context) {
  const p = norm(prompt);
  if (!/\b(comprado\s*\/\s*donado|comprado\s+y\s+donado|compras?\s+y\s+donaciones?|donaciones?\s+y\s+compras?|separa\s+comprado|mas\s+utilizado|más\s+utilizado)\b/.test(p)) return null;
  if (!/\b(producto|productos|articulo|articulos|utilizado|usado|consumido)\b/.test(p)) return null;
  const compras = arr(context?.modulosExtraidos?.COMPRAS);
  const donaciones = arr(context?.modulosExtraidos?.DONACIONES);
  if (!compras.length && !donaciones.length) return null;
  const map = new Map();
  function rec(prod){ const k=trim(prod)||'Sin producto'; if(!map.has(k)) map.set(k,{Producto:k,'Unidades compradas':0,'Unidades donadas':0,'Total unidades':0,'Importe comprado (€)':0,'Valor donado (€)':0}); return map.get(k); }
  compras.forEach(r=>{ const o=rec(r.Producto); o['Unidades compradas']+=num(r.Unidades); o['Total unidades']+=num(r.Unidades); o['Importe comprado (€)']+=num(r.Importe); });
  donaciones.forEach(r=>{ const o=rec(r.Producto); o['Unidades donadas']+=num(r.Unidades); o['Total unidades']+=num(r.Unidades); o['Valor donado (€)']+=num(r.Valor); });
  const limit = firstIntInPrompt(prompt, 25);
  const rows = [...map.values()].map(r=>({ ...r, 'Unidades compradas':round(r['Unidades compradas'],3), 'Unidades donadas':round(r['Unidades donadas'],3), 'Total unidades':round(r['Total unidades'],3), 'Importe comprado (€)':round(r['Importe comprado (€)'],2), 'Valor donado (€)':round(r['Valor donado (€)'],2)})).sort((a,b)=>num(b['Total unidades'])-num(a['Total unidades']) || String(a.Producto).localeCompare(String(b.Producto),'es'));
  const eventos = eventNamesFromContext(context).join(', ');
  const columns = ['Producto','Unidades compradas','Unidades donadas','Total unidades','Importe comprado (€)','Valor donado (€)'];
  const shown = rows.slice(0, limit);
  return { ok:true, rejected:false, title:`Productos más utilizados${eventos?` - ${eventos}`:''}`, answer:`ControlEvent ha unido COMPRAS y DONACIONES y ha calculado localmente el producto más utilizado por unidades, separando Comprado y Donado.`, warnings:[], charts:[{title:'Top productos por unidades compradas + donadas', type:'bar', labels:shown.slice(0,30).map(r=>r.Producto), values:shown.slice(0,30).map(r=>r['Total unidades']), unit:'uds'}], tables:[{title:`Top ${shown.length} productos por unidades`, columns, rows:shown.map(r=>columns.map(c=>text(r[c])))}], files:[{filename:fileSafe(`Productos_comprado_donado_${eventos||'ControlEvent'}_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}], provider:'control-event-local-comprado-donado', model:'sin-gemini-para-calculos' };
}
function directProductCatalogIfApplicable(prompt, context) {
  const p = norm(prompt);
  const rows0 = arr(context?.modulosExtraidos?.PRODUCTOS);
  if (!rows0.length || !/\b(producto|productos|ce_productos|catalogo|catálogo|segmento|destino|precio\s+rfa|precio\s+referencia)\b/.test(p)) return null;
  let rows = rows0.slice();
  const top = /\b(mas\s+caros|más\s+caros|mayor\s+precio|top)\b/.test(p);
  if (top) rows.sort((a,b)=>num(b['Precio rfa.'])-num(a['Precio rfa.']) || String(a['Nombre producto']).localeCompare(String(b['Nombre producto']),'es'));
  else rows.sort((a,b)=>String(a.Segmento).localeCompare(String(b.Segmento),'es') || String(a.Destino).localeCompare(String(b.Destino),'es') || String(a['Nombre producto']).localeCompare(String(b['Nombre producto']),'es'));
  const limit = top ? firstIntInPrompt(prompt,25) : rows.length;
  const shown = rows.slice(0, limit);
  const columns = ['Nombre producto','Segmento','Destino','Precio rfa.'];
  const tables = [];
  if (/\b(agrupa|agrupad|agrupados|agrupadas|por\s+segmento|por\s+destino)\b/.test(p)) {
    const groups = new Map();
    rows.forEach(r=>{ const key=`${trim(r.Segmento)||'Sin segmento'} / ${trim(r.Destino)||'Sin destino'}`; const g=groups.get(key)||{Grupo:key, Productos:0,'Precio mínimo':Infinity,'Precio máximo':0,'Precio medio':0, _sum:0}; g.Productos++; const price=num(r['Precio rfa.']); g['Precio mínimo']=Math.min(g['Precio mínimo'],price); g['Precio máximo']=Math.max(g['Precio máximo'],price); g._sum+=price; groups.set(key,g); });
    const groupRows=[...groups.values()].map(g=>({Grupo:g.Grupo, Productos:g.Productos, 'Precio mínimo':g['Precio mínimo']===Infinity?0:round(g['Precio mínimo'],2), 'Precio máximo':round(g['Precio máximo'],2), 'Precio medio':round(g._sum/g.Productos,2)})).sort((a,b)=>String(a.Grupo).localeCompare(String(b.Grupo),'es'));
    const gcols=['Grupo','Productos','Precio mínimo','Precio máximo','Precio medio'];
    tables.push({title:'Resumen por Segmento / Destino', columns:gcols, rows:groupRows.map(r=>gcols.map(c=>text(r[c])))});
  }
  tables.push({title:`PRODUCTOS ${top?`top ${shown.length} por precio`:`(${shown.length} registro(s))`}`, columns, rows:shown.map(r=>columns.map(c=>text(r[c])))});
  return { ok:true, rejected:false, title:'PRODUCTOS extraído por ControlEvent', answer:`ControlEvent ha consultado el catálogo de productos con filtros exactos y cálculo local. Registros entregados: ${rows.length}.`, warnings:[], charts: top ? [{title:`Top ${shown.length} productos por precio rfa.`, type:'bar', labels:shown.slice(0,30).map(r=>r['Nombre producto']), values:shown.slice(0,30).map(r=>round(r['Precio rfa.'],2)), unit:'€'}] : [], tables, files:[{filename:fileSafe('PRODUCTOS_catalogo_v27_prod_1.2.csv'), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}], provider:'control-event-local-productos', model:'sin-gemini-para-catalogos' };
}
function rangosSolicitadosFromPrompt(prompt) {
  const p = norm(prompt);
  const out = [];
  if (/\bno\s+socios?\b/.test(p)) out.push('NO SOCIO');
  else if (/\bsocios?\b/.test(p)) out.push('SOCIO');
  if (/\bdonantes?\b/.test(p)) out.push('DONANTE');
  return out;
}
function excludedFromAttendanceName(name) {
  const n = norm(name);
  return !n || /^personas\b/.test(n) || /^grupo\b/.test(n) || /^pe[ñn]a\b/.test(n) || /^z\s*_?\s*de/.test(n) || /^z\s*dev/.test(n);
}
function canonicalNameKey(name) {
  return norm(name).replace(/[^a-z0-9ñ]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function isCanonicalPairName(name) {
  return /\s+y\s+/i.test(trim(name));
}
function splitCanonicalPairName(name) {
  return trim(name).split(/\s+y\s+/i).map(x => trim(x)).filter(Boolean);
}
function canonicalPersonNumber(row, fallback = 1) {
  const n = num(row?.Numero ?? row?.numero ?? row?.['Número'] ?? row?.número ?? row?.num ?? row?.personas ?? row?.cantidad);
  return n > 0 ? n : fallback;
}
function buildCanonicalSocioCensus(personRows) {
  const base = arr(personRows)
    .filter(p => norm(p.Rango || p.rango || '') === 'socio')
    .filter(p => !excludedFromAttendanceName(p['Nombre persona'] || p.Nombre || p.nombre));
  const pairs = base.filter(p => isCanonicalPairName(p['Nombre persona'] || p.Nombre || p.nombre)).map(p => {
    const name = trim(p['Nombre persona'] || p.Nombre || p.nombre);
    const parts = splitCanonicalPairName(name);
    return { kind: 'pair', name, key: canonicalNameKey(name), parts, size: Math.max(2, parts.length || 2), row: p };
  });
  const out = [];
  const seen = new Set();
  pairs.forEach(pair => { if (!seen.has(pair.key)) { seen.add(pair.key); out.push(pair); } });
  base.forEach(p => {
    const name = trim(p['Nombre persona'] || p.Nombre || p.nombre);
    if (!name || isCanonicalPairName(name)) return;
    const key = canonicalNameKey(name);
    if (pairs.some(pair => pair.parts.some(part => canonicalNameKey(part) === key))) return;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ kind: 'single', name, key, parts: [name], size: 1, row: p });
  });
  return out.sort((a,b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
}
function canonicalIncomeNumber(row) {
  const raw = row?.Numero ?? row?.numero ?? row?.['Número'] ?? row?.número ?? row?.num ?? row?.personas ?? row?.cantidad;
  if (raw === undefined || raw === null || trim(raw) === '') return null;
  const n = num(raw);
  return Number.isFinite(n) ? n : null;
}
function buildCanonicalSocioAttendanceForEvent(census, incomesForEvent) {
  const confirmedZero = row => /^(banco|efectivo|bizum|exento|exenta|invitado|invitada|confirmado|confirmada|asiste|si|sí|pagado|pagada)$/.test(norm(row?.Ingreso || row?.ingreso || row?.Situacion || row?.situacion || row?.Estado || row?.estado || ''));
  const socioIncome = arr(incomesForEvent)
    .filter(r => norm(r.Rango || r.rango || '') === 'socio')
    .map(r => ({ row: r, name: trim(r.Nombre || r.nombre || r['Nombre persona'] || ''), key: canonicalNameKey(r.Nombre || r.nombre || r['Nombre persona'] || ''), numero: canonicalIncomeNumber(r) }))
    .filter(r => r.name && !excludedFromAttendanceName(r.name) && r.numero !== null && (r.numero > 0 || (r.numero === 0 && confirmedZero(r.row))));
  function directPair(pair) {
    return socioIncome.some(r => (r.key === pair.key) && (r.numero === 0 || r.numero >= pair.size));
  }
  function directSingle(name) {
    const key = canonicalNameKey(name);
    return socioIncome.some(r => r.key === key);
  }
  const asistentes = [];
  const noAsisten = [];
  census.forEach(item => {
    if (item.kind === 'pair') {
      if (directPair(item)) {
        asistentes.push({ name: item.name, size: item.size, kind: 'pair' });
        return;
      }
      const present = [];
      const missing = [];
      item.parts.forEach(part => { directSingle(part) ? present.push(part) : missing.push(part); });
      if (!present.length) {
        noAsisten.push({ name: item.name, size: item.size, kind: 'pair' });
      } else {
        present.forEach(part => asistentes.push({ name: part, size: 1, kind: 'single' }));
        missing.forEach(part => noAsisten.push({ name: part, size: 1, kind: 'single' }));
      }
      return;
    }
    if (directSingle(item.name)) asistentes.push({ name: item.name, size: 1, kind: 'single' });
    else noAsisten.push({ name: item.name, size: 1, kind: 'single' });
  });
  asistentes.sort((a,b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  noAsisten.sort((a,b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
  return {
    asistentes,
    noAsisten,
    totalSocios: census.reduce((a,x)=>a+num(x.size),0),
    totalAsistentes: asistentes.reduce((a,x)=>a+num(x.size),0),
    totalNoAsisten: noAsisten.reduce((a,x)=>a+num(x.size),0)
  };
}
function canonicalAttendanceSummaryFromContext(context) {
  const official = canonicalAttendanceFromContext(context);
  if (official.length) return official;
  // Compatibilidad con contextos antiguos que aún no traen asistenciaCanonica.
  const mods = context?.modulosExtraidos || {};
  const census = buildCanonicalSocioCensus(arr(mods.PERSONAS));
  const incomes = arr(mods.INGRESOS);
  const events = eventNamesFromContext(context);
  return events.map(ev => {
    const pack = buildCanonicalSocioAttendanceForEvent(census, rowsForEvent(incomes, ev));
    const noSocioRows = rowsForEvent(incomes, ev).filter(r=>{
      if (norm(r.Rango || r.rango || '') === 'socio' || excludedFromAttendanceName(r.Nombre || r.nombre)) return false;
      const n=canonicalIncomeNumber(r);
      const confirmedZero=/^(banco|efectivo|bizum|exento|exenta|invitado|invitada|confirmado|confirmada|asiste|si|sí|pagado|pagada)$/.test(norm(r?.Ingreso || r?.ingreso || r?.Situacion || r?.situacion || ''));
      return n !== null && (n>0 || (n===0 && confirmedZero));
    });
    const noSocios = noSocioRows.map(r=>({ name:trim(r.Nombre || r.nombre), size:Math.max(1,canonicalPersonNumber(r,1)), kind:'no socio asistente' }));
    const totalNoSociosAsistentes = noSocios.reduce((a,x)=>a+num(x.size),0);
    return { Evento: ev, ...pack, registrosIngreso: rowsForEvent(incomes,ev).length, totalNoSociosAsistentes, totalAsistentesPersonas: pack.totalAsistentes + totalNoSociosAsistentes, noSociosAsistentes:noSocios };
  });
}

function asksMissingAttendees(prompt) {
  const p = norm(prompt);
  return /\b(no\s+asistir|no\s+asistiran|no\s+asistir[aá]n|no\s+asisten|no\s+asistentes|no\s+estar[aá]n|no\s+estaran|no\s+estan|no\s+est[aá]n|no\s+esten\s+registrad|no\s+est[eé]n\s+registrad|no\s+figuran|no\s+aparecen|faltan\s+socios|socios?\s+que\s+faltan)\b/.test(p)
    || (/\bsocios?\b/.test(p) && /\b(no\s+est[eé]n|no\s+esten|exceptuando|excluyendo)\b/.test(p) && /\b(evento|ingresos|asist)\b/.test(p));
}
function missingAttendeesTablesAndCharts(context, prompt = '') {
  const canonical = canonicalAttendanceSummaryFromContext(context);
  if (!canonical.length) {
    return { tables: [], charts: [], resumenTexto: '', warnings: ['No está disponible el cálculo canónico de asistencia para los eventos solicitados.'] };
  }
  const summary = [];
  const detail = [];
  canonical.forEach(pack => {
    summary.push({
      Evento: pack.Evento,
      'Registros de ingreso': pack.registrosIngreso,
      'Socios del censo': pack.totalSocios,
      'Socios asistentes': pack.totalAsistentes,
      'No socios asistentes': pack.totalNoSociosAsistentes,
      'Total asistentes': pack.totalAsistentesPersonas,
      'Socios no asistentes': pack.totalNoAsisten,
      Criterio: pack.criterio || 'Cálculo canónico de ControlEvent; registros administrativos y personas se muestran por separado.'
    });
    arr(pack.asistentes).forEach(x => detail.push({ Evento:pack.Evento, Grupo:'SOCIO asistente', Persona:x.name, Personas:x.size }));
    arr(pack.noSociosAsistentes).forEach(x => detail.push({ Evento:pack.Evento, Grupo:'NO SOCIO asistente', Persona:x.name, Personas:x.size }));
    arr(pack.noAsisten).forEach(x => detail.push({ Evento:pack.Evento, Grupo:'SOCIO no asistente', Persona:x.name, Personas:x.size }));
  });
  const summaryCols = ['Evento','Registros de ingreso','Socios del censo','Socios asistentes','No socios asistentes','Total asistentes','Socios no asistentes','Criterio'];
  const detailCols = ['Evento','Grupo','Persona','Personas'];
  const tables = [
    { title:'Asistencia canónica por personas', columns:summaryCols, rows:summary.map(r=>summaryCols.map(c=>text(r[c]))) },
    { title:`Detalle canónico de asistencia (${detail.length})`, columns:detailCols, rows:detail.map(r=>detailCols.map(c=>text(r[c]))) }
  ];
  const charts = summary.length === 1 ? [{
    title:'Asistencia canónica: socios, no socios y ausencias', type:'bar',
    labels:['Socios asistentes','No socios asistentes','Socios no asistentes'],
    values:[num(summary[0]['Socios asistentes']),num(summary[0]['No socios asistentes']),num(summary[0]['Socios no asistentes'])], unit:'personas'
  }] : [{ title:'Total de asistentes por evento', type:'horizontalBar', labels:summary.map(r=>r.Evento), values:summary.map(r=>num(r['Total asistentes'])), unit:'personas' }];
  const resumenTexto = summary.map(r=>`${r.Evento}: ${r['Total asistentes']} asistentes (${r['Socios asistentes']} socios y ${r['No socios asistentes']} no socios); ${r['Socios no asistentes']} socios no asistentes; ${r['Registros de ingreso']} registros administrativos`).join(' | ');
  return { tables, charts, resumenTexto, warnings:[] };
}

function directPersonsCatalogIfApplicable(prompt, context) {
  const p = norm(prompt);
  if (asksMissingAttendees(prompt)) return null;
  const rows0 = arr(context?.modulosExtraidos?.PERSONAS);
  if (!rows0.length && !Array.isArray(context?.modulosExtraidos?.PERSONAS)) return null;
  if (!/\b(persona|personas|socios?|donantes?)\b/.test(p)) return null;
  const catalogAsk = /\b(sistema|registrad[ao]s?|maestro|tabla|catalogo|catálogo|rango|lista|listado|dame|muestra|ver)\b/.test(p)
    && !/\b(participa|participan|participado|papel|responsable|colaborador|evento|eventos|donado|donaciones?|compras?|ingresos?)\b/.test(p);
  const groupingAsk = /\b(agrupa|agrupad|rango)\b/.test(p);
  if (!catalogAsk && !groupingAsk) return null;
  const rangos = rangosSolicitadosFromPrompt(prompt);
  let rows = rows0.slice();
  if (rangos.length) rows = rows.filter(r => rangos.some(rg => norm(r.Rango) === norm(rg) || norm(r.Rango).includes(norm(rg))));
  rows.sort((a,b)=>String(a.Rango).localeCompare(String(b.Rango),'es') || String(a['Nombre persona']).localeCompare(String(b['Nombre persona']),'es'));
  const allRows = rows0.slice().sort((a,b)=>String(a.Rango).localeCompare(String(b.Rango),'es') || String(a['Nombre persona']).localeCompare(String(b['Nombre persona']),'es'));
  const baseForGroups = rangos.length ? rows : allRows;
  const groups = new Map();
  baseForGroups.forEach(r=>{ const k=trim(r.Rango)||'Sin rango'; groups.set(k,(groups.get(k)||0)+1); });
  const gcols=['Rango','Personas'];
  const grows=[...groups.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'es')).map(([k,v])=>[k,String(v)]);
  const cols=['Nombre persona','Rango'];
  const title = rangos.length ? `PERSONAS ${rangos.join(' / ')} registradas en el sistema` : 'PERSONAS registradas en el sistema';
  const answer = rangos.length
    ? `ControlEvent ha consultado PERSONAS como catálogo global del sistema, no el evento activo. Filtro de rango aplicado: ${rangos.join(', ')}. Registros encontrados: ${rows.length}.`
    : `ControlEvent ha consultado PERSONAS como catálogo global del sistema, no el evento activo. Registros encontrados: ${rows.length}.`;
  return {
    ok:true,
    rejected:false,
    title,
    answer,
    warnings: rows.length ? [] : [`No hay personas con rango ${rangos.join(', ') || 'solicitado'} en la tabla PERSONAS.`],
    charts:grows.length?[{title:'Personas por rango',type:'bar',labels:grows.map(r=>r[0]),values:grows.map(r=>num(r[1])),unit:'personas'}]:[],
    tables:[{title:'Resumen por Rango',columns:gcols,rows:grows},{title:`PERSONAS (${rows.length})`,columns:cols,rows:rows.map(r=>cols.map(c=>text(r[c])))}],
    files:[{filename:fileSafe(`${rangos.length ? 'PERSONAS_'+rangos.join('_') : 'PERSONAS_catalogo'}_v27_prod_1.2.csv`),mime:'text/csv;charset=utf-8',content:csvFromRows(cols,rows)}],
    provider:'control-event-local-personas-catalogo',
    model:'zuzu-planifica-control-event-filtra'
  };
}
function directComparativeModuleTotalsIfApplicable(prompt, context) {
  const p = norm(prompt); const events=eventNamesFromContext(context); if (events.length < 2 || !/\b(compara|comparar|comparativa)\b/.test(p)) return null;
  const mods=context?.modulosExtraidos||{}; let moduleName='', valueField='', title='';
  if (/\bcompra|compras\b/.test(p) && Array.isArray(mods.COMPRAS)) { moduleName='COMPRAS'; valueField='Importe'; title='Compras total por evento'; }
  else if (/\bdonacion|donaciones\b/.test(p) && Array.isArray(mods.DONACIONES)) { moduleName='DONACIONES'; valueField='Valor'; title='Donaciones total por evento'; }
  else if (/\bingreso|ingresos|recaudacion\b/.test(p) && Array.isArray(mods.INGRESOS)) { moduleName='INGRESOS'; valueField='Total ingreso'; title='Ingresos total por evento'; }
  if (!moduleName) return null;
  const rows=arr(mods[moduleName]);
  const canonicalByEvent = new Map(arr(context?.metricasCanonicas?.porEvento).map(r => [norm(r.Evento), r]));
  const out=events.map(ev=>{ const rs=rowsForEvent(rows,ev); const can=canonicalByEvent.get(norm(ev))||{}; let total; if(moduleName==='INGRESOS') total=round(can['Ingresos total'] ?? rs.reduce((a,r)=>a+num(r['Importe obligatorio'])+num(r['Importe voluntario']),0),2); else if(moduleName==='COMPRAS') total=round(can['Compras realizadas'] ?? sumField(rs.filter(r=>!/pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos']))),valueField),2); else if(moduleName==='DONACIONES') total=round(can['Donaciones valor'] ?? sumField(rs,valueField),2); else total=sumField(rs,valueField); return {Evento:ev, Registros:rs.length, Total:total}; });
  const cols=['Evento','Registros','Total'];
  return {ok:true,rejected:false,title,answer:`ControlEvent ha comparado estrictamente ${moduleName} entre los eventos citados. No se han mezclado otros eventos.`,warnings:[],charts:[{title,type:'bar',labels:out.map(r=>r.Evento),values:out.map(r=>r.Total),unit:'€'}],tables:[{title,columns:cols,rows:out.map(r=>cols.map(c=>text(r[c])))}],files:[{filename:fileSafe(`${moduleName}_comparativa_eventos_v27_prod_1.2.csv`),mime:'text/csv;charset=utf-8',content:csvFromRows(cols,out)}],provider:'control-event-local-comparativa-modulo',model:'sin-gemini-para-calculos'};
}

function uniqueTextList(list) {
  const out = [];
  arr(list).forEach(x => { const v = trim(x); if (v && !out.some(y => norm(y) === norm(v))) out.push(v); });
  return out;
}
function donorNeedlesFromContext(prompt, context) {
  const eventNames = eventNamesFromContext(context).map(norm);
  const rawPrompt = text(prompt);
  const names = [];
  const quoted = quotedNames(rawPrompt);
  quoted.forEach(q => {
    const nq = norm(q);
    const before = rawPrompt.slice(0, rawPrompt.indexOf(q)).slice(-40);
    const isEventQuote = /\b(evento|eventos|llamado|llamados|t[ií]tulo|titulado)\s*$/i.test(before)
      || /\b(jornada|solidaria|ela|cuotas|ingresos|gastos|extraordinarios|corrientes|dic\d{2}|20\d{2})\b/.test(nq)
      || eventNames.some(ev => ev === nq || ev.includes(nq) || nq.includes(ev));
    if (isEventQuote) return;
    // Si el usuario escribe donaciones de "Carmelo" o donado por "Pocholo y Celes", esa cita es el filtro humano.
    // No se amplía con la tabla PERSONAS porque nombres como "Luisa (Carmelo y Lucia)" ensucian el título y desvían el filtro.
    names.push(q);
  });
  const explicitDe = rawPrompt.match(/\b(?:de|del|por|donante|donantes?)\s+([A-ZÁÉÍÓÚÑ][^,;.()]{2,80}?)(?=\s+\(|\s+en\s+el\s+evento|\s+en\s+evento|\s+que\b|\s+y\s+qu[eé]\b|$)/);
  if (!names.length && explicitDe) names.push(trim(explicitDe[1]).replace(/^['"“”]+|['"“”]+$/g, ''));
  const filters = context?.planZuzu?.filtrosHumanos || {};
  if (!names.length) names.push(...arr(filters.donantes), ...arr(filters.personas));
  return uniqueTextList(names).filter(n => n && !eventNames.some(ev => { const nn = norm(n); return ev === nn || ev.includes(nn) || nn.includes(ev); }));
}
function directDonorDonationProductsIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  if (!/\b(donado|donados|donacion|donaciones|ha\s+donado|han\s+donado)\b/.test(p)) return null;
  if (!/\b(producto|productos|articulo|articulos|evento|eventos|que|qué|cuales|cuáles)\b/.test(p)) return null;
  const rowsAll = arr(context?.modulosExtraidos?.DONACIONES);
  if (!rowsAll.length) return null;
  const names = donorNeedlesFromContext(prompt, context);
  if (!names.length && /\b(ranking|top|mas|menos|mayor|menor|consumo|consumido|consumidos|consumidas|grafica|gráfica|temporal|evolucion|evolución)\b/.test(p)) return null;
  const useResponsible = /\bresponsable|responsables\b/.test(p);
  let rows = rowsAll;
  if (names.length) {
    rows = rowsAll.filter(r => names.some(n => nameMatches(r?.Donante, n) || (useResponsible && nameMatches(r?.Responsable, n))));
  }
  const titleNames = names.length ? names.join(' y ') : 'los donantes solicitados';
  const detailColumns = ['Evento','Donante','Producto','Unidades','Valor','Tipo de donación','Responsable'];
  const grouped = new Map();
  rows.forEach(r => {
    const key = [trim(r.Evento), trim(r.Donante), trim(r.Producto), trim(r['Tipo de donación']), trim(r.Responsable)].join('|');
    const old = grouped.get(key) || { Evento: trim(r.Evento), Donante: trim(r.Donante), Producto: trim(r.Producto), Unidades: 0, Valor: 0, 'Tipo de donación': trim(r['Tipo de donación']), Responsable: trim(r.Responsable) };
    old.Unidades += num(r.Unidades);
    old.Valor += num(r.Valor);
    grouped.set(key, old);
  });
  const detail = [...grouped.values()].map(r => ({ ...r, Unidades: round(r.Unidades,3), Valor: round(r.Valor,2) }))
    .sort((a,b)=>String(a.Evento).localeCompare(String(b.Evento),'es') || String(a.Donante).localeCompare(String(b.Donante),'es') || String(a.Producto).localeCompare(String(b.Producto),'es'));
  const evMap = new Map();
  detail.forEach(r => {
    const ev = trim(r.Evento) || 'Sin evento';
    const old = evMap.get(ev) || { Evento: ev, Donantes: new Set(), Productos: new Set(), 'Unidades donadas': 0, 'Valor donado (€)': 0, 'Nº líneas': 0 };
    old.Donantes.add(trim(r.Donante) || 'Sin donante');
    old.Productos.add(trim(r.Producto) || 'Sin producto');
    old['Unidades donadas'] += num(r.Unidades);
    old['Valor donado (€)'] += num(r.Valor);
    old['Nº líneas'] += 1;
    evMap.set(ev, old);
  });
  const eventSummary = [...evMap.values()].map(r => ({ Evento: r.Evento, Donantes: [...r.Donantes].join(' | '), Productos: [...r.Productos].join(' | '), 'Unidades donadas': round(r['Unidades donadas'],3), 'Valor donado (€)': round(r['Valor donado (€)'],2), 'Nº líneas': r['Nº líneas'] }))
    .sort((a,b)=>String(a.Evento).localeCompare(String(b.Evento),'es'));
  const prodMap = new Map();
  detail.forEach(r => {
    const prod = trim(r.Producto) || 'Sin producto';
    const old = prodMap.get(prod) || { Producto: prod, Unidades: 0, Valor: 0 };
    old.Unidades += num(r.Unidades); old.Valor += num(r.Valor); prodMap.set(prod, old);
  });
  const prodRows = [...prodMap.values()].map(r => ({ Producto: r.Producto, Unidades: round(r.Unidades,3), Valor: round(r.Valor,2) })).sort((a,b)=>num(b.Unidades)-num(a.Unidades) || String(a.Producto).localeCompare(String(b.Producto),'es'));
  const detailRows = detail.map(r => detailColumns.map(c => text(r[c])));
  const eventColumns = ['Evento','Donantes','Productos','Unidades donadas','Valor donado (€)','Nº líneas'];
  const prodColumns = ['Producto','Unidades','Valor'];
  const answer = rows.length
    ? `He encontrado ${detail.length} línea(s) agrupada(s) de donaciones para ${titleNames}. Aparecen en ${eventSummary.length} evento(s) y suman ${round(detail.reduce((a,r)=>a+num(r.Unidades),0),3)} unidades donadas.`
    : `No he encontrado productos donados para ${titleNames} con los filtros actuales.`;
  return {
    ok: true,
    rejected: false,
    title: `Productos donados por ${titleNames}`,
    answer,
    warnings: rows.length ? [] : [`Se revisó el módulo DONACIONES, pero no hay líneas para ${titleNames}.`],
    charts: prodRows.length ? [{ title: `Productos donados por ${titleNames}`, type: 'horizontalBar', labels: prodRows.slice(0,30).map(r=>r.Producto), values: prodRows.slice(0,30).map(r=>r.Unidades), unit: 'uds' }] : [],
    tables: [
      ...(eventSummary.length ? [{ title: 'Eventos donde aparecen esas donaciones', columns: eventColumns, rows: eventSummary.map(r=>eventColumns.map(c=>text(r[c])))}] : []),
      ...(prodRows.length ? [{ title: 'Productos donados agrupados', columns: prodColumns, rows: prodRows.map(r=>prodColumns.map(c=>text(r[c])))}] : []),
      ...(detailRows.length ? [{ title: 'Detalle de donaciones', columns: detailColumns, rows: detailRows.slice(0,500)}] : [])
    ],
    files: detail.length ? [{ filename: fileSafe(`Donaciones_${titleNames}_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(detailColumns, detail) }] : [],
    provider: 'control-event-analitica-donaciones',
    model: 'calculo-local-oficial'
  };
}

function eventTitleFromRow(row) {
  return trim(row?.['Titulo del evento'] || row?.Titulo || row?.Evento || row?.EVENTO || row?.titulo || row?.nombre || '');
}
function eventMetaRowsChronological(context) {
  const out = new Map();
  function merge(row) {
    const title = eventTitleFromRow(row);
    if (!title) return;
    const key = norm(title);
    const old = out.get(key) || { Evento: title };
    out.set(key, {
      ...old,
      Evento: old.Evento || title,
      'Fecha inicio': firstNonEmpty(old['Fecha inicio'], row?.['fecha ini'], row?.fechaIni, row?.FechaInicio, row?.fecha_inicio, row?.Fecha),
      'Fecha fin': firstNonEmpty(old['Fecha fin'], row?.['fecha fin'], row?.fechaFin, row?.FechaFin, row?.fecha_fin),
      Estado: firstNonEmpty(old.Estado, row?.Estado, row?.situacion, row?.Situacion),
      Precio: firstNonEmpty(old.Precio, row?.Precio, row?.precio)
    });
  }
  arr(context?.modulosExtraidos?.EVENTOS).forEach(merge);
  arr(context?.eventosObjetivo).forEach(merge);
  eventNamesFromContext(context).forEach(name => merge({ Evento: name }));
  return [...out.values()].sort((a,b) => parseEventDateForSort(a['Fecha inicio']) - parseEventDateForSort(b['Fecha inicio']) || String(a.Evento).localeCompare(String(b.Evento),'es'));
}
function topJoined(rows, labelField, valueField, limit = 4, unit = '') {
  const map = new Map();
  arr(rows).forEach(r => {
    const key = trim(r?.[labelField]) || 'Sin clasificar';
    map.set(key, num(map.get(key)) + (valueField ? num(r?.[valueField]) : 1));
  });
  return [...map.entries()]
    .sort((a,b) => num(b[1]) - num(a[1]) || String(a[0]).localeCompare(String(b[0]), 'es'))
    .slice(0, limit)
    .map(([k,v]) => `${k} (${round(v, unit === 'uds' ? 3 : 2)}${unit ? ' ' + unit : ''})`)
    .join(' | ');
}
function formatMoneyText(value) { return `${round(value, 2)} €`; }
function calcIngresosTotal(rows) { return round(arr(rows).reduce((a,r)=>a + (r?.['Total ingreso'] !== undefined ? num(r?.['Total ingreso']) : num(r?.['Importe obligatorio']) + num(r?.['Importe voluntario'])),0),2); }
function directChronologicalEventNarrativeIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  const wantsAllRegistered = /\b(eventos\s+registrados|todos\s+los\s+eventos|cada\s+evento|cada\s+uno\s+de\s+los\s+eventos|celebracion\s+de\s+cada\s+evento|celebración\s+de\s+cada\s+evento)\b/.test(p);
  const wantsNarrative = /\b(informe|cuentes|contar|cuenta|relato|cronica|crónica|cosas\s+que\s+ocurrieron|ocurrio|ocurrió|actividad|historial|evolucion|evolución)\b/.test(p);
  const wantsTimeOrder = /\b(ordenad[oa]s?|ordenalo|ordénalo|tiempo|temporal|cronologic[oa]|cronológic[oa]|fecha\s+inicio|fecha\s+de\s+celebracion|fecha\s+de\s+celebración|celebracion|celebración)\b/.test(p);
  const eventMeta = eventMetaRowsChronological(context);
  if (eventMeta.length < 2 || !(wantsNarrative && (wantsAllRegistered || wantsTimeOrder))) return null;

  const mods = context.modulosExtraidos || {};
  const canonical = arr(context?.metricasCanonicas?.porEvento);
  const byEvent = new Map(canonical.map(r => [norm(r.Evento), r]));
  const summaryRows = [];
  const moduleRows = [];
  eventMeta.forEach((ev, idx) => {
    const eventName = ev.Evento;
    const can = byEvent.get(norm(eventName)) || {};
    const ing = rowsForEvent(arr(mods.INGRESOS), eventName);
    const comAll = rowsForEvent(arr(mods.COMPRAS), eventName);
    const comReal = comAll.filter(r => !/pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos'])) && !/^DONADO\s+/i.test(trim(r?.['Ticket u otros gastos'])));
    const comPend = comAll.filter(r => /pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos'])));
    const don = rowsForEvent(arr(mods.DONACIONES), eventName);
    const tk = rowsForEvent(arr(mods.TICKETS), eventName);
    const doc = rowsForEvent(arr(mods.DOCUMENTOS), eventName);
    const hitos = rowsForEvent(arr(mods.HITOS), eventName);
    const lgs = rowsForEvent(arr(mods.LG), eventName);
    const lgCumplidas = lgs.filter(r => /^cumplid/i.test(trim(r?.Estado))).length;
    const lgPendientes = Math.max(0, lgs.length - lgCumplidas);
    const ingresos = round(can['Ingresos total'] ?? calcIngresosTotal(ing), 2);
    const compras = round(can['Compras realizadas'] ?? sumField(comReal, 'Importe'), 2);
    const pendientes = round(can['Compras pendientes'] ?? sumField(comPend, 'Importe'), 2);
    const donaciones = round(can['Donaciones valor'] ?? sumField(don, 'Valor'), 2);
    const saldo = round(can['Saldo actual'] ?? (ingresos - compras), 2);
    const asistentes = round(can['Asistentes / Numero'] ?? ing.reduce((a,r)=>a+num(r?.Numero),0), 3);
    const colaboradores = can['Colaboradores registros'] ?? ing.length;
    const comprasTop = topJoined(comReal, 'Producto', 'Importe', 4, '€');
    const tiendasTop = topJoined(comReal, 'Tienda', 'Importe', 3, '€');
    const donTopProd = topJoined(don, 'Producto', 'Unidades', 4, 'uds');
    const donTopDonantes = topJoined(don, 'Donante', 'Valor', 4, '€');
    const docsList = doc.slice(0, 5).map(r => `${trim(r?.DOCxxx) || 'DOC'}${trim(r?.Descripcion) ? ': ' + trim(r?.Descripcion) : ''}`).join(' | ');
    const tkList = tk.slice(0, 5).map(r => `${trim(r?.TKxx) || 'TK'}${trim(r?.Tienda) ? ' ' + trim(r?.Tienda) : ''}${num(r?.['Total ticket']) ? ' ' + formatMoneyText(r?.['Total ticket']) : ''}`).join(' | ');
    const facts = [];
    if (colaboradores || asistentes) facts.push(`${colaboradores} registro(s) de ingresos/colaboradores y ${asistentes} asistente(s)/unidad(es)`);
    if (ingresos) facts.push(`${formatMoneyText(ingresos)} de ingresos`);
    if (compras) facts.push(`${formatMoneyText(compras)} en compras realizadas`);
    if (pendientes) facts.push(`${formatMoneyText(pendientes)} pendiente(s) de compra`);
    if (don.length || donaciones) facts.push(`${don.length} línea(s) de donación valoradas en ${formatMoneyText(donaciones)}`);
    if (tk.length) facts.push(`${tk.length} ticket(s)/fototicket(s)`);
    if (doc.length) facts.push(`${doc.length} documento(s)`);
    if (hitos.length || lgs.length) facts.push(`${hitos.length} hito(s) y ${lgCumplidas}/${lgs.length} LG/tarea(s) cumplidas (${lgPendientes} pendiente(s))`);
    const occurred = facts.length ? facts.join('; ') + '.' : 'No hay actividad operativa registrada en los módulos extraídos.';
    const lgPendingList = lgs.filter(r => !/^cumplid/i.test(trim(r?.Estado))).slice(0, 5).map(r => `${trim(r?.['Descripción LG']) || 'Tarea sin descripción'}${trim(r?.Responsable) ? ' — ' + trim(r?.Responsable) : ''}`).join(' | ');
    const highlights = [
      comprasTop ? `Compras destacadas: ${comprasTop}.` : '',
      tiendasTop ? `Tiendas principales: ${tiendasTop}.` : '',
      donTopProd ? `Donaciones destacadas: ${donTopProd}.` : '',
      donTopDonantes ? `Donantes principales: ${donTopDonantes}.` : '',
      docsList ? `Documentos: ${docsList}.` : '',
      tkList ? `Tickets: ${tkList}.` : '',
      lgPendingList ? `Tareas pendientes: ${lgPendingList}.` : ''
    ].filter(Boolean).join(' ');
    summaryRows.push({
      Orden: idx + 1,
      'Fecha inicio': trim(ev['Fecha inicio']),
      'Fecha fin': trim(ev['Fecha fin']),
      Evento: eventName,
      Estado: trim(ev.Estado),
      'Ingresos (€)': ingresos,
      'Compras realizadas (€)': compras,
      'Compras pendientes (€)': pendientes,
      'Donaciones valoradas (€)': donaciones,
      'Saldo (€)': saldo,
      Colaboradores: colaboradores,
      'Asistentes / número': asistentes,
      Tickets: tk.length,
      Documentos: doc.length,
      Hitos: hitos.length,
      'LG totales': lgs.length,
      'LG cumplidas': lgCumplidas,
      'LG pendientes': lgPendientes,
      'Qué ocurrió': `${occurred} ${highlights}`.trim()
    });
    moduleRows.push(
      { Orden: idx + 1, Evento: eventName, Módulo: 'INGRESOS', Registros: ing.length, Total: ingresos, Detalle: colaboradores || asistentes || ingresos ? `${colaboradores} colaborador(es), ${asistentes} asistente(s)/unidad(es), ${formatMoneyText(ingresos)}. Formas de ingreso: ${topJoined(ing, 'Ingreso', null, 4) || 'sin desglose'}.` : 'Sin ingresos registrados.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'COMPRAS', Registros: comAll.length, Total: compras, Detalle: comAll.length ? `Realizadas ${formatMoneyText(compras)}; pendientes ${formatMoneyText(pendientes)}. ${comprasTop ? 'Productos: ' + comprasTop + '.' : ''} ${tiendasTop ? 'Tiendas: ' + tiendasTop + '.' : ''}`.trim() : 'Sin compras registradas.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'DONACIONES', Registros: don.length, Total: donaciones, Detalle: don.length ? `${don.length} línea(s), ${formatMoneyText(donaciones)} valorado. ${donTopProd ? 'Productos: ' + donTopProd + '.' : ''} ${donTopDonantes ? 'Donantes: ' + donTopDonantes + '.' : ''}`.trim() : 'Sin donaciones registradas.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'TICKETS', Registros: tk.length, Total: round(sumField(tk, 'Total ticket'),2), Detalle: tk.length ? (tkList || `${tk.length} ticket(s) registrados.`) : 'Sin fototickets/tickets registrados.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'DOCUMENTOS', Registros: doc.length, Total: doc.length, Detalle: doc.length ? (docsList || `${doc.length} documento(s) registrados.`) : 'Sin documentos registrados.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'HITOS', Registros: hitos.length, Total: hitos.length, Detalle: hitos.length ? `${hitos.length} hito(s) de control registrados.` : 'Sin hitos registrados.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'LG', Registros: lgs.length, Total: lgCumplidas, Detalle: lgs.length ? `${lgCumplidas}/${lgs.length} LG/tarea(s) cumplidas; ${lgPendientes} pendiente(s). ${lgPendingList ? 'Pendientes: ' + lgPendingList + '.' : ''}`.trim() : 'Sin LG/tareas registradas.' }
    );
  });
  const columns = ['Orden','Fecha inicio','Fecha fin','Evento','Estado','Ingresos (€)','Compras realizadas (€)','Compras pendientes (€)','Donaciones valoradas (€)','Saldo (€)','Colaboradores','Asistentes / número','Tickets','Documentos','Hitos','LG totales','LG cumplidas','LG pendientes','Qué ocurrió'];
  const moduleColumns = ['Orden','Evento','Módulo','Registros','Total','Detalle'];
  const labels = summaryRows.map(r => `${r['Fecha inicio'] || '?'} · ${r.Evento}`);
  return {
    ok: true,
    rejected: false,
    title: 'Informe cronológico de eventos',
    answer: `He ordenado ${summaryRows.length} evento(s) por fecha de inicio/celebración y he preparado una crónica operativa de lo que ocurrió en cada uno. No uso EVENTOS como respuesta final: EVENTOS solo ordena e identifica; el contenido sale de INGRESOS, COMPRAS, DONACIONES, TICKETS/Fototickets, DOCUMENTOS, HITOS y LG/tareas.`,
    warnings: arr(context.advertencias),
    charts: [
      { title: 'Cronología económica por evento', type: 'stackedBar', labels, values: summaryRows.map(r=>round(r['Ingresos (€)'],2)), unit: '€', series: [
        { name: 'Ingresos', values: summaryRows.map(r=>round(r['Ingresos (€)'],2)) },
        { name: 'Compras realizadas', values: summaryRows.map(r=>round(r['Compras realizadas (€)'],2)) },
        { name: 'Donaciones valoradas', values: summaryRows.map(r=>round(r['Donaciones valoradas (€)'],2)) }
      ]},
      { title: 'Actividad registrada por evento', type: 'bar', labels, values: summaryRows.map(r=>num(r.Colaboradores)+num(r.Tickets)+num(r.Documentos)+num(r.Hitos)+num(r['LG totales'])+num(r['Asistentes / número'])), unit: 'registros/unidades' }
    ],
    tables: [
      { title: 'Crónica ordenada por fecha de celebración', columns, rows: summaryRows.map(r=>columns.map(c=>text(r[c]))) },
      { title: 'Detalle por evento y módulo', columns: moduleColumns, rows: moduleRows.map(r=>moduleColumns.map(c=>text(r[c]))) }
    ],
    files: [
      { filename: fileSafe('Informe_cronologico_eventos_v27_prod_1.2.csv'), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, summaryRows) },
      { filename: fileSafe('Informe_cronologico_eventos_detalle_modulos_v27_prod_1.2.csv'), mime: 'text/csv;charset=utf-8', content: csvFromRows(moduleColumns, moduleRows) }
    ],
    provider: 'control-event-local-cronica-eventos',
    model: 'zuzu-planifica-control-event-ordena-y-resume'
  };
}

function directEventReportIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const policy = analyzeZuzuReportRequest(prompt);
  const p = norm(prompt);
  const events = eventNamesFromContext(context);
  const wantsGraph = wantsGraphicalOutput(prompt);
  const wantsComparison = events.length >= 2 && /\b(compara|comparar|comparativa|comparativas|frente\s+a|versus|\bvs\b)\b/.test(p);
  if (!events.length || !(policy.isReport || policy.broadReport || policy.onePage || wantsComparison)) return null;

  const mods = context.modulosExtraidos || {};
  const canonicalMetrics = arr(context?.metricasCanonicas?.porEvento);
  const metricsByEvent = new Map(canonicalMetrics.map(r => [norm(r.Evento), r]));
  const attendance = canonicalAttendanceSummaryFromContext(context);
  const attendanceByEvent = new Map(attendance.map(r => [norm(r.Evento), r]));
  const metaByEvent = eventMetaByNameFromContext(context);
  const singleEvent = events.length === 1;
  const weatherRows = goodWeatherRowsFromContext(context);

  const rows = events.map(eventName => {
    const can = metricsByEvent.get(norm(eventName)) || {};
    const att = attendanceByEvent.get(norm(eventName)) || {};
    const incomes = rowsForEvent(arr(mods.INGRESOS), eventName);
    const purchases = rowsForEvent(arr(mods.COMPRAS), eventName);
    const donations = rowsForEvent(arr(mods.DONACIONES), eventName);
    const tickets = rowsForEvent(arr(mods.TICKETS), eventName);
    const documents = rowsForEvent(arr(mods.DOCUMENTOS), eventName);
    const hitos = rowsForEvent(arr(mods.HITOS), eventName);
    const lgs = rowsForEvent(arr(mods.LG), eventName);
    const meta = arr(mods.EVENTOS).find(r => norm(r?.['Titulo del evento']) === norm(eventName)) || {};
    const expectedIncome = round(can['Ingresos total'] ?? incomes.reduce((a,r)=>a+num(r?.['Importe obligatorio'])+num(r?.['Importe voluntario']),0),2);
    const collectedIncome = round(incomes.filter(r=>/^(BANCO|EFECTIVO|BIZUM)$/i.test(trim(r?.Ingreso || r?.ingreso || ''))).reduce((a,r)=>a+num(r?.['Importe obligatorio'])+num(r?.['Importe voluntario']),0),2);
    const realizedPurchases = round(can['Compras realizadas'] ?? sumField(purchases.filter(r=>!/pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos']))),'Importe'),2);
    const pendingPurchases = round(can['Compras pendientes'] ?? sumField(purchases.filter(r=>/pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos']))),'Importe'),2);
    const donationValue = round(can['Donaciones valor'] ?? sumField(donations,'Valor'),2);
    return {
      Evento:eventName,
      Estado:firstNonEmpty(can.Estado, metaByEvent.get(norm(eventName))?.Estado, meta.Estado),
      Descripcion:trim(meta['Descripción'] || meta.Descripcion || meta.descripcion),
      FechaInicio:trim(meta['fecha ini'] || meta.fechaIni),
      FechaFin:trim(meta['fecha fin'] || meta.fechaFin),
      IngresosPrevistos:expectedIncome,
      IngresosCobrados:collectedIncome,
      IngresosPendientes:round(Math.max(0,expectedIncome-collectedIncome),2),
      ComprasRealizadas:realizedPurchases,
      ComprasPendientes:pendingPurchases,
      ComprasPrevistas:round(realizedPurchases+pendingPurchases,2),
      Donaciones:donationValue,
      SaldoActual:round(collectedIncome-realizedPurchases,2),
      SaldoPrevisto:round(expectedIncome-realizedPurchases-pendingPurchases,2),
      ValorOperativoProducto:round(realizedPurchases+pendingPurchases+donationValue,2),
      RegistrosIngreso:num(att.registrosIngreso ?? incomes.length),
      SociosCenso:num(att.totalSocios),
      SociosAsistentes:num(att.totalAsistentes),
      NoSociosAsistentes:num(att.totalNoSociosAsistentes),
      TotalAsistentes:num(att.totalAsistentesPersonas),
      SociosNoAsistentes:num(att.totalNoAsisten),
      LineasCompra:purchases.length,
      LineasDonacion:donations.length,
      Tickets:Math.max(num(can['Tickets numero']),tickets.length),
      Documentos:Math.max(num(can['Documentos numero']),documents.length),
      Hitos:hitos.length,
      LgTotales:lgs.length,
      LgCumplidas:lgs.filter(row=>/^cumplid/i.test(trim(row?.Estado))).length,
      LgPendientes:lgs.filter(row=>!/^cumplid/i.test(trim(row?.Estado))).length,
      incomes,purchases,donations,tickets,documents,hitos,lgs,att
    };
  });

  const table = (title, columns, data) => ({ title, columns, rows:arr(data).map(row=>arr(row).map(text)) });
  const maybeEventColumns = columns => singleEvent ? columns.filter(c=>c!=='Evento') : columns;
  const maybeEventRows = (columns, objects) => objects.map(obj=>maybeEventColumns(columns).map(c=>obj[c]));
  const detailTables = [];
  const groupedRows = (data,key,valueKey,limit=30) => {
    const map = new Map();
    arr(data).forEach(r=>{
      const name=trim(r?.[key])||'Sin clasificar';
      const old=map.get(name)||{name,records:0,total:0}; old.records+=1; old.total+=num(r?.[valueKey]); map.set(name,old);
    });
    return [...map.values()].sort((a,b)=>b.total-a.total||b.records-a.records||a.name.localeCompare(b.name,'es')).slice(0,limit).map(x=>[x.name,x.records,round(x.total,2)]);
  };
  const readableRows = (data,columns,limit) => arr(data).slice(0,limit).map(r=>columns.map(c=>r?.[c]));

  if (policy.onePage) {
    const executiveRows=[];
    rows.forEach(r=>{
      const paidPct=r.IngresosPrevistos?round(r.IngresosCobrados/r.IngresosPrevistos*100,1):0;
      const prefix=singleEvent?'':`${r.Evento} · `;
      executiveRows.push(
        [prefix+'Cobros',paidPct>=99.5?'🟢':paidPct>=80?'🟠':'🔴',`${formatMoneyText(r.IngresosCobrados)} de ${formatMoneyText(r.IngresosPrevistos)} (${paidPct} %)`],
        [prefix+'Compras',r.ComprasPendientes>0?'🟠':'🟢',`${formatMoneyText(r.ComprasRealizadas)} realizadas · ${formatMoneyText(r.ComprasPendientes)} pendientes`],
        [prefix+'Donaciones',r.Donaciones>0?'🟢':'🟠',`${formatMoneyText(r.Donaciones)} de valor recibido`],
        [prefix+'Saldo previsto',r.SaldoPrevisto>=0?'🟢':r.SaldoPrevisto>=-100?'🟠':'🔴',formatMoneyText(r.SaldoPrevisto)],
        [prefix+'Asistencia',r.TotalAsistentes>0?'🟢':'🟠',`${r.TotalAsistentes} personas: ${r.SociosAsistentes} socios + ${r.NoSociosAsistentes} no socios`],
        [prefix+'Tickets y documentos',(r.Tickets+r.Documentos)>0?'🟢':'🟠',`${r.Tickets} tickets · ${r.Documentos} documentos`],
        [prefix+'Hitos y tareas',r.LgPendientes>0?'🟠':(r.LgTotales>0?'🟢':'⚪'),`${r.Hitos} hitos · ${r.LgCumplidas}/${r.LgTotales} LG cumplidas · ${r.LgPendientes} pendientes`]
      );
    });
    if (policy.wantsWeather) weatherRows.slice(0,3).forEach(w=>{
      const max=num(w['Temp. máx']); const rain=num(w['Prob. lluvia %']);
      executiveRows.push([`Meteorología · ${trim(w.Día||w.Dia||spanishWeekdayFromIso(w.Fecha))}`,max>=35||rain>=40?'🟠':'🟢',`${trim(w.Cielo)} · ${max} / ${num(w['Temp. mín'])} ºC · lluvia ${rain} % · viento ${num(w['Viento km/h'])} km/h`]);
    });
    const r=rows[0];
    const answer = `La situación está ${isEventInProgressValue(r?.Estado)?'en curso y las cifras son provisionales':'analizada con datos consolidados'}. Cobros, compras, donaciones, saldo, asistencia, tickets, documentos, hitos y tareas quedan reunidos una sola vez en el cuadro ejecutivo${policy.wantsWeather?' junto con la previsión meteorológica':''}.`;
    return {
      ok:true,rejected:false,compactOnePage:true,
      title:singleEvent?'Informe ejecutivo':'Informe ejecutivo comparativo',
      answer,warnings:arr(context.advertencias),charts:[],
      tables:[table('Resumen ejecutivo con semáforos y meteorología',['Área','Semáforo','Lectura'],executiveRows)],
      files:[{filename:fileSafe('Informe_ejecutivo_v27_prod_1.2.csv'),mime:'text/csv;charset=utf-8',content:csvFromRows(['Área','Semáforo','Lectura'],executiveRows.map(r=>({Área:r[0],Semáforo:r[1],Lectura:r[2]})))}],
      provider:'control-event-local-informe-eventos',model:'calculo-local-oficial'
    };
  }

  const financeCols=['Evento','Estado','Ingresos previstos (€)','Ingresos cobrados (€)','Ingresos pendientes (€)','Compras realizadas (€)','Compras pendientes (€)','Compras previstas (€)','Donaciones valoradas (€)','Saldo actual (€)','Saldo previsto al cierre (€)'];
  const financeObjs=rows.map(r=>({'Evento':r.Evento,'Estado':r.Estado,'Ingresos previstos (€)':r.IngresosPrevistos,'Ingresos cobrados (€)':r.IngresosCobrados,'Ingresos pendientes (€)':r.IngresosPendientes,'Compras realizadas (€)':r.ComprasRealizadas,'Compras pendientes (€)':r.ComprasPendientes,'Compras previstas (€)':r.ComprasPrevistas,'Donaciones valoradas (€)':r.Donaciones,'Saldo actual (€)':r.SaldoActual,'Saldo previsto al cierre (€)':r.SaldoPrevisto}));
  detailTables.push(table(singleEvent?'Resumen financiero':'Resumen financiero comparativo',maybeEventColumns(financeCols),maybeEventRows(financeCols,financeObjs)));

  const activityCols=['Evento','Estado','Socios asistentes','No socios asistentes','Total asistentes','Socios no asistentes','Líneas de compra','Líneas de donación','Tickets','Documentos','Hitos','LG totales','LG cumplidas','LG pendientes'];
  const activityObjs=rows.map(r=>({'Evento':r.Evento,'Estado':isEventInProgressValue(r.Estado)?'Datos provisionales':'Cierre','Socios asistentes':r.SociosAsistentes,'No socios asistentes':r.NoSociosAsistentes,'Total asistentes':r.TotalAsistentes,'Socios no asistentes':r.SociosNoAsistentes,'Líneas de compra':r.LineasCompra,'Líneas de donación':r.LineasDonacion,'Tickets':r.Tickets,'Documentos':r.Documentos,'Hitos':r.Hitos,'LG totales':r.LgTotales,'LG cumplidas':r.LgCumplidas,'LG pendientes':r.LgPendientes}));
  detailTables.push(table(singleEvent?'Participación y documentación':'Participación y documentación por evento',maybeEventColumns(activityCols),maybeEventRows(activityCols,activityObjs)));

  if (singleEvent) {
    const r=rows[0];
    detailTables.unshift(table('Ficha y descripción',['Estado','Fecha inicio','Fecha fin','Descripción'],[[r.Estado,r.FechaInicio,r.FechaFin,r.Descripcion||'Sin descripción registrada']]));
  }

  rows.forEach(r=>{
    const suffix=singleEvent?'':` · ${r.Evento}`;
    if (policy.modules.includes('INGRESOS')) {
      const socio=r.incomes.filter(x=>/^SOCIO$/i.test(trim(x.Rango)));
      const noSocio=r.incomes.filter(x=>!/^SOCIO$/i.test(trim(x.Rango)));
      const incomeGroups=[
        ['Socios',socio.length,r.SociosAsistentes,round(socio.reduce((a,x)=>a+num(x['Importe obligatorio'])+num(x['Importe voluntario']),0),2)],
        ['No socios',noSocio.length,r.NoSociosAsistentes,round(noSocio.reduce((a,x)=>a+num(x['Importe obligatorio'])+num(x['Importe voluntario']),0),2)]
      ];
      detailTables.push(table(`Ingresos por tipo${suffix}`,['Grupo','Registros administrativos','Personas asistentes','Importe previsto (€)'],incomeGroups));
      if (policy.detailLevel==='detailed'||policy.detailLevel==='exhaustive') detailTables.push(table(`Detalle de ingresos${suffix}`,['Nombre','Rango','Numero','Importe obligatorio','Importe voluntario','Ingreso','Just.ing.'],readableRows(r.incomes,['Nombre','Rango','Numero','Importe obligatorio','Importe voluntario','Ingreso','Just.ing.'],policy.detailLevel==='exhaustive'?200:25)));
    }
    if (policy.modules.includes('COMPRAS')) {
      const purchaseSummary=[];
      [['Destino','Destino'],['Segmento','Segmento'],['Tienda','Tienda'],['Responsable','Responsable']].forEach(([group,key])=>{
        groupedRows(r.purchases,key,'Importe',group==='Tienda'||group==='Responsable'?15:12).forEach(row=>purchaseSummary.push([group,...row]));
      });
      if(purchaseSummary.length) detailTables.push(table(`Compras por clasificación${suffix}`,['Agrupación','Concepto','Registros','Importe (€)'],purchaseSummary));
      if (policy.detailLevel==='detailed'||policy.detailLevel==='exhaustive') {
        const sorted=[...r.purchases].sort((a,b)=>num(b.Importe)-num(a.Importe));
        detailTables.push(table(`Compras destacadas por producto${suffix}`,['Producto','Segmento','Destino','Unidades','Importe','Ticket u otros gastos','Tienda','Responsable'],readableRows(sorted,['Producto','Segmento','Destino','Unidades','Importe','Ticket u otros gastos','Tienda','Responsable'],policy.detailLevel==='exhaustive'?220:15)));
      }
    }
    if (policy.includeTickets) detailTables.push(table(`Tickets y facturas${suffix}`,['TKxx','Tienda','Responsable','Total ticket','Nº líneas','Ticket SI/NO'],readableRows(r.tickets,['TKxx','Tienda','Responsable','Total ticket','Nº líneas','Ticket SI/NO'],policy.detailLevel==='exhaustive'?200:60)));
    if (policy.modules.includes('DONACIONES')) {
      const donationSummary=[];
      groupedRows(r.donations,'Donante','Valor',20).forEach(row=>donationSummary.push(['Donante',...row]));
      groupedRows(r.donations,'Producto','Valor',policy.detailLevel==='exhaustive'?200:12).forEach(row=>donationSummary.push(['Producto',...row]));
      if(donationSummary.length) detailTables.push(table(`Donaciones resumidas${suffix}`,['Agrupación','Concepto','Registros','Valor (€)'],donationSummary));
      if (policy.detailLevel==='exhaustive') detailTables.push(table(`Detalle completo de donaciones${suffix}`,['Donante','Producto','Unidades','Precio','Valor','Tipo de donación','Responsable'],readableRows(r.donations,['Donante','Producto','Unidades','Precio','Valor','Tipo de donación','Responsable'],220)));
    }
    if (policy.includeDocuments) detailTables.push(table(`Documentos${suffix}`,['DOCxxx','Fecha','Descripcion','Tiene imagen'],readableRows(r.documents,['DOCxxx','Fecha','Descripcion','Tiene imagen'],120)));
    if (policy.modules.includes('HITOS') || policy.modules.includes('LG')) {
      detailTables.push(table(`Control de Hitos${suffix}`,['Hito','Descripción','Fecha mínima','Fecha máxima','Responsable general','LG totales','LG cumplidas','Estado'],readableRows(r.hitos,['Hito','Descripción','Fecha mínima','Fecha máxima','Responsable general','LG totales','LG cumplidas','Estado'],120)));
      if (policy.detailLevel==='detailed'||policy.detailLevel==='exhaustive'||/\b(hito|hitos|lg|lgs|tarea|tareas|dependencias?)\b/.test(p)) {
        const orderedLg=[...r.lgs].sort((a,b)=>(/^cumplid/i.test(trim(a?.Estado))?1:0)-(/^cumplid/i.test(trim(b?.Estado))?1:0)||trim(a?.['Fecha mínima']).localeCompare(trim(b?.['Fecha mínima']))||trim(a?.['Descripción LG']).localeCompare(trim(b?.['Descripción LG']),'es'));
        detailTables.push(table(`Líneas de Gestión (tareas)${suffix}`,['Hito','Descripción LG','Fecha mínima','Fecha máxima','Responsable','Estado','Dependencias previas','Dependencias posteriores'],readableRows(orderedLg,['Hito','Descripción LG','Fecha mínima','Fecha máxima','Responsable','Estado','Dependencias previas','Dependencias posteriores'],policy.detailLevel==='exhaustive'?250:80)));
      }
    }
    if (policy.wantsNames && !policy.greetOneByOne) {
      const nameRows=[];
      arr(r.att.asistentes).forEach(x=>nameRows.push(['Socio asistente',x.name,x.size]));
      arr(r.att.noSociosAsistentes).forEach(x=>nameRows.push(['No socio asistente',x.name,x.size]));
      arr(r.att.noAsisten).forEach(x=>nameRows.push(['Socio no asistente',x.name,x.size]));
      detailTables.push(table(`Personas y asistencia${suffix}`,['Grupo','Nombre','Personas'],nameRows));
    }
  });

  let charts=[];
  if (wantsGraph) {
    const labels=rows.map(r=>eventLabelWithState(r.Evento,metaByEvent));
    charts.push({title:singleEvent?'Situación económica':'Situación económica por evento',type:'bar',labels,values:rows.map(r=>r.IngresosPrevistos),unit:'€',series:[
      {name:'Ingresos previstos',values:rows.map(r=>r.IngresosPrevistos)},
      {name:'Compras realizadas',values:rows.map(r=>r.ComprasRealizadas)},
      {name:'Compras pendientes',values:rows.map(r=>r.ComprasPendientes)},
      {name:'Donaciones valoradas',values:rows.map(r=>r.Donaciones)}
    ]});
  }
  if (wantsGraph && /\basistencia\b/.test(p)&&rows.length===1) charts.push({title:'Asistencia',type:'donut',labels:['Socios asistentes','No socios asistentes','Socios no asistentes'],values:[rows[0].SociosAsistentes,rows[0].NoSociosAsistentes,rows[0].SociosNoAsistentes],unit:'personas'});

  const r0=rows[0];
  const scope=singleEvent?'El informe':`${rows.length} eventos`;
  const answer=`${scope} reúne una sola vez descripción, ingresos, compras, donaciones, saldos, tickets/facturas, documentos, asistencia, hitos y LG/tareas${policy.wantsWeather?' más meteorología':''}. ${rows.some(r=>isEventInProgressValue(r.Estado))?'Las cifras en curso son provisionales.':''}`.trim();
  const exportColumns=['Evento','Estado','IngresosPrevistos','IngresosCobrados','IngresosPendientes','ComprasRealizadas','ComprasPendientes','Donaciones','SaldoActual','SaldoPrevisto','SociosAsistentes','NoSociosAsistentes','TotalAsistentes','Tickets','Documentos','Hitos','LgTotales','LgCumplidas','LgPendientes'];
  return {
    ok:true,rejected:false,compactOnePage:false,
    title:singleEvent?'Informe operativo':'Informe operativo comparativo',answer,
    warnings:arr(context.advertencias),charts,tables:detailTables,
    files:[{filename:fileSafe('Informe_eventos_v27_prod_1.2.csv'),mime:'text/csv;charset=utf-8',content:csvFromRows(exportColumns,rows)}],
    provider:'control-event-local-informe-eventos',model:'calculo-local-oficial'
  };
}

function groupSumRows(rows, keyFn, valueFn) {
  const map = new Map();
  arr(rows).forEach(r => {
    const key = trim(keyFn(r)) || 'Sin dato';
    const old = map.get(key) || { Nombre: key, Registros: 0, Importe: 0 };
    old.Registros += 1;
    old.Importe += num(valueFn(r));
    map.set(key, old);
  });
  return [...map.values()].map(r => ({ ...r, Importe: round(r.Importe, 2) })).sort((a,b)=>num(b.Importe)-num(a.Importe) || b.Registros-a.Registros || String(a.Nombre).localeCompare(String(b.Nombre),'es'));
}
function directOperationalRankingResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  if (!/\b(ranking|top|clasificaci[oó]n|rank|informe\s+ejecutivo|alta\s+direcci[oó]n|semaforo|sem[aá]foro)\b/.test(p)) return null;
  if (!/\b(ingresos?|donaciones?|compras?|tiendas?|responsables?|donantes?)\b/.test(p)) return null;
  const mods = context.modulosExtraidos || {};
  const ingresos = arr(mods.INGRESOS);
  const compras = arr(mods.COMPRAS);
  const donaciones = arr(mods.DONACIONES);
  if (!ingresos.length && !compras.length && !donaciones.length) return null;
  const isPaid = v => /^(BANCO|EFECTIVO|BIZUM)$/i.test(norm(v));
  const incomeValue = r => num(r['Importe obligatorio']) + num(r['Importe voluntario']);
  const ingresosPrevistos = ingresos.reduce((a,r)=>a+incomeValue(r),0);
  const ingresosRealizados = ingresos.filter(r=>isPaid(r.Ingreso)).reduce((a,r)=>a+incomeValue(r),0);
  const ingresosPendientes = Math.max(0, ingresosPrevistos - ingresosRealizados);
  const compraValue = r => num(r.Importe);
  const isPendingPurchase = r => /PTE|PENDIENT/i.test(norm(r['Ticket u otros gastos']));
  const comprasPrevistas = compras.reduce((a,r)=>a+compraValue(r),0);
  const comprasPendientes = compras.filter(isPendingPurchase).reduce((a,r)=>a+compraValue(r),0);
  const comprasRealizadas = Math.max(0, comprasPrevistas - comprasPendientes);
  const donacionesValor = donaciones.reduce((a,r)=>a+num(r.Valor),0);
  const saldoActual = ingresosRealizados - comprasRealizadas;
  const saldoOperativo = ingresosPrevistos - comprasPrevistas;
  const semaforo = saldoOperativo < 0 ? 'ROJO' : (ingresosPendientes > ingresosRealizados || comprasPendientes > comprasRealizadas ? 'AMARILLO' : 'VERDE');
  const semaforoTexto = semaforo === 'ROJO'
    ? 'riesgo: saldo operativo negativo o desequilibrio previsto.'
    : semaforo === 'AMARILLO'
      ? 'favorable pero con seguimiento: saldo previsto positivo, aunque quedan ingresos/compras pendientes relevantes.'
      : 'favorable: situación equilibrada con baja incertidumbre pendiente.';
  const rankings = [];
  const tables = [];
  const charts = [];
  function addRanking(title, rows, unit = '€') {
    if (!rows.length) return;
    const top = rows.slice(0, 15);
    tables.push({ title, columns: ['Nombre','Registros','Importe (€)'], rows: top.map(r => [r.Nombre, String(r.Registros), String(round(r.Importe,2))]) });
    charts.push({ title, type: 'horizontalBar', labels: top.map(r=>r.Nombre), values: top.map(r=>round(r.Importe,2)), unit });
  }
  if (ingresos.length) {
    addRanking('Ranking de ingresos previstos por colaborador', groupSumRows(ingresos, r => r.Nombre, incomeValue));
    addRanking('Ranking de ingresos realizados por colaborador', groupSumRows(ingresos.filter(r=>isPaid(r.Ingreso)), r => r.Nombre, incomeValue));
  }
  if (donaciones.length) {
    addRanking('Ranking de donaciones por donante', groupSumRows(donaciones, r => r.Donante, r => num(r.Valor)));
    addRanking('Ranking de donaciones por responsable', groupSumRows(donaciones, r => r.Responsable, r => num(r.Valor)));
  }
  if (compras.length) {
    addRanking('Ranking de compras por tienda', groupSumRows(compras, r => r.Tienda, compraValue));
    addRanking('Ranking de compras por responsable', groupSumRows(compras, r => r.Responsable, compraValue));
  }
  const resumenColumns = ['Indicador','Valor'];
  const resumenRows = [
    ['Semáforo', `${semaforo} · ${semaforoTexto}`],
    ['Ingresos previstos (€)', String(round(ingresosPrevistos,2))],
    ['Ingresos realizados (€)', String(round(ingresosRealizados,2))],
    ['Ingresos pendientes (€)', String(round(ingresosPendientes,2))],
    ['Compras previstas (€)', String(round(comprasPrevistas,2))],
    ['Compras realizadas (€)', String(round(comprasRealizadas,2))],
    ['Compras pendientes (€)', String(round(comprasPendientes,2))],
    ['Donaciones valoradas (€)', String(round(donacionesValor,2))],
    ['Saldo actual (€)', String(round(saldoActual,2))],
    ['Saldo operativo (€)', String(round(saldoOperativo,2))]
  ];
  tables.unshift({ title: 'Resumen ejecutivo y semáforo operativo', columns: resumenColumns, rows: resumenRows });
  charts.unshift({ title: 'Semáforo financiero · componentes principales', type: 'bar', labels: ['Ingresos realizados','Ingresos pendientes','Compras realizadas','Compras pendientes','Donaciones','Saldo operativo'], values: [round(ingresosRealizados,2), round(ingresosPendientes,2), round(comprasRealizadas,2), round(comprasPendientes,2), round(donacionesValor,2), round(saldoOperativo,2)], unit: '€' });
  return {
    ok: true,
    rejected: false,
    title: 'Informe ejecutivo de rankings operativos',
    answer: `Informe ejecutivo calculado con datos ControlEvent. Semáforo ${semaforo}: ${semaforoTexto} Saldo actual ${round(saldoActual,2)} € y saldo operativo ${round(saldoOperativo,2)} €. Incluyo rankings de ingresos, donaciones y compras por entidad/responsable según los módulos disponibles.`,
    warnings: arr(context.advertencias),
    charts,
    tables,
    files: [{ filename: fileSafe('Rankings_operativos_v27_prod_1.2.csv'), mime:'text/csv;charset=utf-8', content: csvFromRows(['Seccion','Nombre','Registros','Importe'], tables.flatMap(t => t.columns.includes('Importe (€)') ? t.rows.map(r => ({ Seccion:t.title, Nombre:r[0], Registros:r[1], Importe:r[2] })) : [])) }],
    provider: 'control-event-local-ranking-operativo',
    model: 'calculo-local-oficial'
  };
}

function directHighConfidenceResultIfApplicable(prompt, context) {
  return directCashEvolutionIfApplicable(prompt, context)
    || directOperationalRankingResultIfApplicable(prompt, context)
    || directSegmentDestinationSituationPieIfApplicable(prompt, context)
    || directEventReportIfApplicable(prompt, context)
    || directPersonIdentityIfApplicable(prompt, context)
    || directPersonsCatalogIfApplicable(prompt, context)
    || directPersonRoleReportIfApplicable(prompt, context)
    || directPersonAppearanceIfApplicable(prompt, context)
    || directProductConsumptionResultIfApplicable(prompt, context)
    || directDonorDonationProductsIfApplicable(prompt, context)
    || directBoughtDonatedUsageIfApplicable(prompt, context)
    || directChronologicalEventNarrativeIfApplicable(prompt, context);
}
function isProductConsumptionAnalysisPrompt(prompt) {
  const p = norm(prompt);
  return /\b(producto|productos|articulo|articulos|consumo|consumidos|consumidas|utilizado|utilizados|comprado|comprados|donado|donados)\b/.test(p)
    && /\b(grafica|gráfica|grafico|gráfico|barras|ranking|ordena|ordenar|coste|costes|importe|unidades|cantidad|cantidades|mas|menos|mayor|menor)\b/.test(p);
}
function directProductConsumptionResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  if (!isProductConsumptionAnalysisPrompt(prompt)) return null;
  const mods = context.modulosExtraidos || {};
  const compras = arr(mods.COMPRAS);
  const donaciones = arr(mods.DONACIONES);
  const p = norm(prompt);
  const includeCompras = compras.length && (!/\bdonado|donados|donaciones\b/.test(p) || /\bcomprado|comprados|compras?|consumid/.test(p));
  const includeDonaciones = donaciones.length && (!/\bcomprado|comprados|compras\b/.test(p) || /\bdonado|donados|donaciones|consumid/.test(p));
  const rowsSrc = [];
  if (includeCompras) compras.forEach(r => rowsSrc.push({ origen:'Comprado', evento: trim(r.Evento), producto: trim(r.Producto), unidades: num(r.Unidades), importe: num(r.Importe), precio: num(r.Precio), detalle: trim(r['Ticket u otros gastos'] || ''), tercero: trim(r.Tienda || ''), responsable: trim(r.Responsable || '') }));
  if (includeDonaciones) donaciones.forEach(r => rowsSrc.push({ origen:'Donado', evento: trim(r.Evento), producto: trim(r.Producto), unidades: num(r.Unidades), importe: num(r.Valor), precio: num(r.Precio), detalle: trim(r['Tipo de donación'] || ''), tercero: trim(r.Donante || ''), responsable: trim(r.Responsable || '') }));
  if (!rowsSrc.length) return null;
  const eventMeta = arr(context.eventosObjetivo).map(e => ({ name: trim(e?.['Titulo del evento'] || e?.Titulo || e?.EVENTO || e?.Evento), date: parseEventDateForSort(e?.['fecha ini'] || e?.fechaIni || e?.Fecha || '') })).filter(e => e.name);
  const events = eventMeta.map(e => e.name);
  const byProduct = new Map();
  rowsSrc.forEach(r => {
    const key = r.producto || 'Sin producto';
    const old = byProduct.get(key) || { Producto:key, 'Unidades total':0, 'Coste/valor total (€)':0, 'Comprado unidades':0, 'Comprado importe (€)':0, 'Donado unidades':0, 'Donado valor (€)':0, 'Nº líneas':0, Eventos:new Set() };
    old['Unidades total'] += num(r.unidades);
    old['Coste/valor total (€)'] += num(r.importe);
    if (r.origen === 'Comprado') { old['Comprado unidades'] += num(r.unidades); old['Comprado importe (€)'] += num(r.importe); }
    else { old['Donado unidades'] += num(r.unidades); old['Donado valor (€)'] += num(r.importe); }
    old['Nº líneas'] += 1;
    if (r.evento) old.Eventos.add(r.evento);
    byProduct.set(key, old);
  });
  const summary = [...byProduct.values()].map(r => ({ ...r, Eventos: [...r.Eventos].join(' | '), 'Unidades total': round(r['Unidades total'],3), 'Coste/valor total (€)': round(r['Coste/valor total (€)'],2), 'Comprado unidades': round(r['Comprado unidades'],3), 'Comprado importe (€)': round(r['Comprado importe (€)'],2), 'Donado unidades': round(r['Donado unidades'],3), 'Donado valor (€)': round(r['Donado valor (€)'],2) }));
  const byCost = summary.slice().sort((a,b)=>num(b['Coste/valor total (€)'])-num(a['Coste/valor total (€)']) || String(a.Producto).localeCompare(String(b.Producto),'es'));
  const byUnits = summary.slice().sort((a,b)=>num(b['Unidades total'])-num(a['Unidades total']) || String(a.Producto).localeCompare(String(b.Producto),'es'));
  const limit = firstRankingLimitInPrompt(prompt, 25);
  const detailColumns = ['Evento','Origen','Producto','Unidades','Precio','Importe/Valor','Ticket/Tipo','Tienda/Donante','Responsable'];
  const detailRows = rowsSrc.slice().sort((a,b)=>String(a.producto).localeCompare(String(b.producto),'es')).map(r => [r.evento, r.origen, r.producto, String(round(r.unidades,3)), String(round(r.precio,4)), String(round(r.importe,2)), r.detalle, r.tercero, r.responsable]);
  const columns = ['Producto','Unidades total','Coste/valor total (€)','Comprado unidades','Comprado importe (€)','Donado unidades','Donado valor (€)','Nº líneas','Eventos'];
  const tableCostRows = byCost.map(r => columns.map(c => text(r[c])));
  const tableUnitsRows = byUnits.map(r => columns.map(c => text(r[c])));
  const titleEvents = events.length ? ` - ${events.join(' | ')}` : '';
  const totalCost = round(summary.reduce((acc,r)=>acc+num(r['Coste/valor total (€)']),0),2);
  const totalUnits = round(summary.reduce((acc,r)=>acc+num(r['Unidades total']),0),3);
  const wantsTemporal = /\b(temporal|tiempo|fecha|fechas|cronologico|cronológico|evolucion|evolución|por\s+evento|cada\s+evento)\b/.test(p);
  const topProductsForTemporal = byUnits.slice(0, limit).map(r => r.Producto);
  const sortedEventNames = (eventMeta.length ? eventMeta.slice().sort((a,b)=>a.date-b.date || a.name.localeCompare(b.name,'es')).map(e=>e.name) : events).filter(Boolean);
  const eventProduct = new Map();
  rowsSrc.forEach(r => {
    const key = `${r.evento}|${r.producto}`;
    const old = eventProduct.get(key) || { Evento: r.evento, Producto: r.producto, 'Unidades total': 0, 'Comprado unidades': 0, 'Donado unidades': 0, 'Coste/valor (€)': 0 };
    old['Unidades total'] += num(r.unidades);
    old['Coste/valor (€)'] += num(r.importe);
    if (r.origen === 'Comprado') old['Comprado unidades'] += num(r.unidades); else old['Donado unidades'] += num(r.unidades);
    eventProduct.set(key, old);
  });
  const eventProductRows = [...eventProduct.values()]
    .filter(r => !topProductsForTemporal.length || topProductsForTemporal.includes(r.Producto))
    .map(r => ({ ...r, 'Unidades total': round(r['Unidades total'],3), 'Comprado unidades': round(r['Comprado unidades'],3), 'Donado unidades': round(r['Donado unidades'],3), 'Coste/valor (€)': round(r['Coste/valor (€)'],2) }))
    .sort((a,b)=>sortedEventNames.indexOf(a.Evento)-sortedEventNames.indexOf(b.Evento) || num(b['Unidades total'])-num(a['Unidades total']) || String(a.Producto).localeCompare(String(b.Producto),'es'));
  const temporalSeries = topProductsForTemporal.map(prod => ({ name: prod, values: sortedEventNames.map(ev => round(eventProduct.get(`${ev}|${prod}`)?.['Unidades total'] || 0, 3)) }));
  const temporalChart = wantsTemporal && sortedEventNames.length ? [{ title: `Consumo temporal por evento · Top ${topProductsForTemporal.length} productos`, type: 'stackedBar', labels: sortedEventNames, series: temporalSeries, unit: 'uds' }] : [];
  return {
    ok: true,
    rejected: false,
    title: `Productos consumidos${titleEvents}`,
    answer: `He agrupado ${rowsSrc.length} línea(s) de ${includeCompras?'COMPRAS':''}${includeCompras&&includeDonaciones?' + ':''}${includeDonaciones?'DONACIONES':''} por producto. Total agrupado: ${totalUnits} unidades y ${totalCost} €. ${wantsTemporal ? `Además separo el Top ${topProductsForTemporal.length} por evento en orden temporal.` : 'Incluyo ranking por coste/valor y por unidades.'}`,
    warnings: arr(context.advertencias),
    charts: [
      ...temporalChart,
      { title: `Top ${Math.min(limit, byUnits.length)} productos por unidades`, type: 'horizontalBar', labels: byUnits.slice(0,limit).map(r=>r.Producto), values: byUnits.slice(0,limit).map(r=>round(r['Unidades total'],3)), unit: 'ud' },
      { title: `Top ${Math.min(limit, byCost.length)} productos por coste/valor`, type: 'horizontalBar', labels: byCost.slice(0,limit).map(r=>r.Producto), values: byCost.slice(0,limit).map(r=>round(r['Coste/valor total (€)'],2)), unit: '€' }
    ],
    tables: [
      { title: `Ranking por unidades · Top ${Math.min(limit, byUnits.length)}`, columns, rows: tableUnitsRows.slice(0,limit) },
      { title: `Ranking por coste/valor · Top ${Math.min(limit, byCost.length)}`, columns, rows: tableCostRows.slice(0,limit) },
      ...(wantsTemporal ? [{ title: `Detalle temporal por evento y producto · Top ${topProductsForTemporal.length}`, columns: ['Evento','Producto','Unidades total','Comprado unidades','Donado unidades','Coste/valor (€)'], rows: eventProductRows.map(r=>['Evento','Producto','Unidades total','Comprado unidades','Donado unidades','Coste/valor (€)'].map(c=>text(r[c]))).slice(0,500) }] : []),
      { title: `Detalle base (${rowsSrc.length} línea(s))`, columns: detailColumns, rows: detailRows.slice(0,300) }
    ],
    files: [
      { filename: fileSafe(`Productos_consumidos_coste${titleEvents}_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, byCost) },
      { filename: fileSafe(`Productos_consumidos_unidades${titleEvents}_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, byUnits) },
      { filename: fileSafe(`Productos_consumidos_detalle${titleEvents}_v27_prod_1.2.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(detailColumns, rowsSrc.map(r=>({ 'Evento':r.evento, 'Origen':r.origen, 'Producto':r.producto, 'Unidades':round(r.unidades,3), 'Precio':round(r.precio,4), 'Importe/Valor':round(r.importe,2), 'Ticket/Tipo':r.detalle, 'Tienda/Donante':r.tercero, 'Responsable':r.responsable }))) }
    ],
    provider: 'control-event-analitica-productos',
    model: 'calculo-local-oficial'
  };
}

function directDeterministicResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const productConsumption = directProductConsumptionResultIfApplicable(prompt, context);
  if (productConsumption) return productConsumption;
  const donorDonations = directDonorDonationProductsIfApplicable(prompt, context);
  if (donorDonations) return donorDonations;
  // Fase de diagnóstico: todo lo que sea petición de datos de módulos se resuelve primero y, salvo análisis libre puro,
  // se devuelve desde ControlEvent para poder auditar si los módulos sirven todos los registros.
  const personSearch = directPersonAppearanceIfApplicable(prompt, context);
  if (personSearch) return personSearch;
  const productCatalog = directProductCatalogIfApplicable(prompt, context);
  if (productCatalog) return productCatalog;
  const personsCatalog = directPersonsCatalogIfApplicable(prompt, context);
  if (personsCatalog) return personsCatalog;
  const eventPrices = directEventPriceExtremesIfApplicable(prompt, context);
  if (eventPrices) return eventPrices;
  const boughtDonated = directBoughtDonatedUsageIfApplicable(prompt, context);
  if (boughtDonated) return boughtDonated;
  const cmpMod = directComparativeModuleTotalsIfApplicable(prompt, context);
  if (cmpMod) return cmpMod;
  const cmp = directComparativeAllDataResultIfApplicable(prompt, context);
  if (cmp) return cmp;
  const segDestSituation = directSegmentDestinationSituationPieIfApplicable(prompt, context);
  if (segDestSituation) return segDestSituation;
  const ag = directAggregateResultIfApplicable(prompt, context);
  if (ag) return ag;
  const gr = directGraphResultIfApplicable(prompt, context);
  if (gr) return gr;
  const list = directModuleResultIfApplicable(prompt, context);
  if (list) return list;
  // No convertir una petición de análisis/gráficas en una auditoría técnica.
  // Si Zuzu no estructura y tampoco hay una salida local específica, se debe decir que falta respuesta,
  // no enseñar una gráfica de campos técnicos del módulo EVENTOS.
  if (isTransformAnalysisPrompt(prompt)) return null;
  if (!isModuleDataPrompt(prompt)) return null;
  const mods = context.modulosExtraidos || {};
  const prefer = ['DONACIONES','COMPRAS','INGRESOS','TICKETS','DOCUMENTOS','PRODUCTOS','EVENTOS','TIENDAS','PERSONAS'];
  const first = prefer.find(k => Array.isArray(mods[k])) || Object.keys(mods).find(k => Array.isArray(mods[k]));
  if (!first) return null;
  const rows = arr(mods[first]);
  const columns = orderedColumnsForModule(first, rows);
  const eventos = arr(context.eventosObjetivo).map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.EVENTO || e?.Evento)).filter(Boolean).join(', ');
  const audit = arr(context.auditoriaModulos).find(a => a.modulo === first);
  const tableRows = rows.slice(0, 1000).map(row => columns.map(c => typeof row?.[c] === 'object' && row?.[c] !== null ? JSON.stringify(row[c]) : text(row?.[c])));
  const auditRows = [
    ['Módulo usado', first],
    ['Evento(s) detectado(s)', eventos || 'No indicado'],
    ['Registros extraídos', String(rows.length)],
    ['Registros fuente sin filtros', String(audit?.registrosFuenteSinFiltros ?? rows.length)],
    ['Filtros aplicados', audit?.filtrosAplicados ? JSON.stringify(audit.filtros || {}) : 'NO'],
    ['Motor', 'ControlEvent local, consulta directa de módulos']
  ];
  return {
    ok: true,
    rejected: false,
    title: `${first}${eventos ? ` - ${eventos}` : ''}`,
    answer: `He encontrado ${rows.length} registro(s) en ${first}${eventos ? ` para ${eventos}` : ''}. Te lo dejo en tabla y CSV para que puedas revisarlo o cruzarlo con otro dato.`,
    warnings: arr(context.advertencias),
    charts: [],
    tables: [
      { title: 'Resumen de extracción', columns: ['Dato','Valor'], rows: auditRows },
      ...(rows.length ? [{ title: `${first} (${rows.length} registro(s))`, columns, rows: tableRows }] : [])
    ],
    files: rows.length ? [{ filename: fileSafe(`${first}_${eventos || 'ControlEvent'}_diagnostico_v27_prod_1.2.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }] : [],
    provider: 'control-event-local-consulta-directa',
    model: 'consulta-modulos-sin-gemini'
  };
}

function directGraphResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  if (!/\b(grafica|gráfica|grafico|gráfico|diagrama|barras|tarta|queso|pastel|pie|donut)\b/.test(p)) return null;
  const mods = context.modulosExtraidos || {};
  if (/\b(producto|productos|consumo|consumidos|consumidas|utilizado|utilizados)\b/.test(p) && (Array.isArray(mods.COMPRAS) || Array.isArray(mods.DONACIONES))) {
    const pc = directProductConsumptionResultIfApplicable(prompt, context);
    if (pc) return pc;
  }
  let moduleName = '';
  if (/\bcompra|compras|gasto|gastos|comprado\b/.test(p) && Array.isArray(mods.COMPRAS)) moduleName = 'COMPRAS';
  else if (/\bdonacion|donaciones|donado|donante\b/.test(p) && Array.isArray(mods.DONACIONES)) moduleName = 'DONACIONES';
  else if (/\bingreso|ingresos|recaudacion|recaudación|asistente|asistentes|entrada|entradas|colaborador|colaboradores|socio|socios\b/.test(p) && Array.isArray(mods.INGRESOS)) moduleName = 'INGRESOS';
  if (!moduleName) return null;
  const rows = arr(mods[moduleName]);
  const eventos = arr(context.eventosObjetivo).map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.EVENTO || e?.Evento)).filter(Boolean).join(', ');
  const audit = arr(context.auditoriaModulos).find(a => a.modulo === moduleName);
  if (!rows.length) {
    return {
      ok: true,
      rejected: false,
      title: `Gráfica de ${moduleName}`,
      answer: `ControlEvent no ha podido generar la gráfica porque el módulo ${moduleName} ha entregado 0 registros${eventos ? ` para ${eventos}` : ''}.`,
      warnings: [audit ? `Auditoría ${moduleName}: fuente sin filtros ${audit.registrosFuenteSinFiltros}, entregados ${audit.registrosEntregados}, filtros ${audit.filtrosAplicados ? JSON.stringify(audit.filtros) : 'NO'}.` : `El módulo ${moduleName} no tiene registros.`],
      charts: [], tables: [], files: [], provider: 'control-event-modules-direct', model: 'sin-gemini-para-graficas'
    };
  }
  const g = groupRowsForChart(moduleName, rows, prompt);
  const columns = orderedColumnsForModule(moduleName, rows);
  const tableRows = rows.slice(0, 300).map(row => columns.map(c => typeof row?.[c] === 'object' && row?.[c] !== null ? JSON.stringify(row[c]) : text(row?.[c])));
  return {
    ok: true,
    rejected: false,
    title: `Gráfica de ${moduleName}${eventos ? ` - ${eventos}` : ''}`,
    answer: `Gráfica por ${g.groupField} con ${rows.length} registro(s).`,
    warnings: arr(context.advertencias),
    charts: [{ title: `${moduleName} por ${g.groupField}`, type: /\b(tarta|queso|pastel|pie|donut)\b/.test(p) ? 'pie' : 'bar', labels: g.labels, values: g.values, unit: '€' }],
    tables: [{ title: `${moduleName} base usada (${rows.length} registro(s))`, columns, rows: tableRows }],
    files: [{ filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_grafica_v27_prod_1.2.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }],
    provider: 'control-event-modules-direct',
    model: 'sin-gemini-para-graficas'
  };
}

function normalizeResult(raw, model) {
  const out = raw && typeof raw === 'object' ? raw : {};
  const charts = arr(out.charts).map(ch => {
    const rawType = trim(ch.type || 'bar');
    const type = ['bar','horizontalBar','pie','donut','line','stackedBar'].includes(rawType) ? rawType : 'bar';
    const labels = arr(ch.labels).map(x => trim(x)).slice(0, 40);
    const values = arr(ch.values).map(x => round(x, 4)).slice(0, 40);
    const series = arr(ch.series).map(s => ({ name: trim(s?.name || 'Serie'), values: arr(s?.values).map(x => round(x, 4)).slice(0, 40) })).filter(s => s.values.length);
    return { title: trim(ch.title || 'Gráfica'), type, labels, values, series, unit: trim(ch.unit || '') };
  }).filter(ch => ch.labels.length && (ch.values.length || ch.series.length));
  const tables = arr(out.tables).map(tb => ({
    title: trim(tb.title || 'Tabla'),
    columns: arr(tb.columns).map(x => trim(x)).slice(0, 12),
    rows: arr(tb.rows).slice(0, 80).map(row => arr(row).map(x => trim(x)).slice(0, 12))
  })).filter(tb => tb.columns.length && tb.rows.length);
  const files = arr(out.files).map(f => ({
    filename: fileSafe(f.filename || 'resultado_control_event.txt'),
    mime: trim(f.mime || 'text/plain'),
    content: text(f.content || '').slice(0, 250000)
  })).filter(f => f.content);
  return {
    ok: out.ok !== false,
    rejected: out.rejected === true,
    title: trim(out.title || 'Respuesta de Zuzu del evento'),
    answer: trim(out.answer || ''),
    warnings: arr(out.warnings).map(x => trim(x)).filter(Boolean).slice(0, 8),
    charts,
    tables,
    files,
    model,
    provider: 'gemini-rest'
  };
}
function geminiOutText(payload) { return payload?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('\n') || ''; }
function estimateGeminiCost(model, usage = {}) {
  const m = trim(model).toLowerCase();
  const promptTokens = num(usage.promptTokenCount ?? usage.promptTokens ?? usage.prompt_tokens ?? 0);
  const candidateTokens = num(usage.candidatesTokenCount ?? usage.candidateTokens ?? usage.outputTokens ?? usage.output_tokens ?? 0);
  const totalTokens = num(usage.totalTokenCount ?? usage.totalTokens ?? 0);
  // Gemini factura la salida incluyendo posibles thinking tokens. En usageMetadata a veces
  // candidatesTokenCount solo representa texto visible, mientras totalTokenCount incluye tokens internos.
  // Por eso el coste debe usar el mayor entre candidates y (total - prompt).
  const billableOutputTokens = Math.max(0, candidateTokens, totalTokens ? totalTokens - promptTokens : 0);
  const hiddenOutputTokens = Math.max(0, billableOutputTokens - candidateTokens);
  // Tarifas del contrato de uso de Gemini empleadas históricamente por ControlEvent.
  // Se calculan por tokens reales devueltos por usageMetadata. Se pueden sobrescribir por entorno
  // si cambia el contrato, sin tocar el código ni la forma de cálculo.
  let inputUsdPerM = num(process.env.CONTROLEVENT_GEMINI_FLASH_INPUT_USD_PER_M || '0.30') || 0.30;
  let outputUsdPerM = num(process.env.CONTROLEVENT_GEMINI_FLASH_OUTPUT_USD_PER_M || '2.50') || 2.50;
  let family = 'gemini-2.5-flash';
  if (/flash-lite/i.test(m)) {
    inputUsdPerM = num(process.env.CONTROLEVENT_GEMINI_FLASH_LITE_INPUT_USD_PER_M || '0.10') || 0.10;
    outputUsdPerM = num(process.env.CONTROLEVENT_GEMINI_FLASH_LITE_OUTPUT_USD_PER_M || '0.40') || 0.40;
    family = 'gemini-2.5-flash-lite';
  } else if (/2\.0-flash|flash-latest/i.test(m)) {
    inputUsdPerM = num(process.env.CONTROLEVENT_GEMINI_FLASH_INPUT_USD_PER_M || '0.30') || 0.30;
    outputUsdPerM = num(process.env.CONTROLEVENT_GEMINI_FLASH_OUTPUT_USD_PER_M || '2.50') || 2.50;
    family = 'gemini-flash';
  }
  const usd = (promptTokens * inputUsdPerM + billableOutputTokens * outputUsdPerM) / 1000000;
  const eurRate = num(process.env.CONTROLEVENT_USD_EUR || '0.92') || 0.92;
  return {
    family,
    promptTokens,
    candidateTokens,
    visibleOutputTokens: candidateTokens,
    hiddenOutputTokens,
    outputTokens: billableOutputTokens,
    billableOutputTokens,
    totalTokens: totalTokens || (promptTokens + billableOutputTokens),
    inputUsdPerM,
    outputUsdPerM,
    costUsd: Number(usd.toFixed(8)),
    costEurApprox: Number((usd * eurRate).toFixed(8))
  };
}
function logGeminiUsage(stage, model, payload) {
  try {
    const u = payload?.usageMetadata || {};
    const c = estimateGeminiCost(model, u);
    console.log(`[ControlEvent v27_prod_1.2 Zuzu] ${stage} · ${model} · prompt=${u.promptTokenCount ?? ''} candidates=${u.candidatesTokenCount ?? ''} total=${u.totalTokenCount ?? ''} billableOut=${c.billableOutputTokens ?? c.outputTokens} · coste≈$${Number(c.costUsd||0).toFixed(6)}/€${Number(c.costEurApprox||0).toFixed(6)}`);
  } catch (_) {}
}
function isRetryable(err) { return /400|404|model|not supported|429|quota|RESOURCE_EXHAUSTED|rate|unavailable|503|504|aborted|abort|tard[oó] demasiado|INVALID_ARGUMENT/i.test(text(err?.message || '')); }
function isNarrativeQualityError(err) { return /redacci[oó]n.*(?:incompleta|cortada)|respuesta narrativa incompleta|texto libre incompleto|sin cubrir todas las partes|omiti[oó].*parte|dej[oó].*cortad/i.test(text(err?.message || err)); }
function isQuotaError(err) { return /429|quota|RESOURCE_EXHAUSTED|rate limit|rate-limit|free_tier|free tier|retry in/i.test(text(err?.message || '') + ' ' + text(err?.details?.error?.status || '')); }
const __zuzuMemo = new Map();
function memoKey(prefix, value) {
  const raw = prefix + ':' + text(value);
  let h = 2166136261;
  for (let i = 0; i < raw.length; i++) { h ^= raw.charCodeAt(i); h = Math.imul(h, 16777619); }
  return prefix + ':' + (h >>> 0).toString(36);
}
function memoGet(key) { const x = __zuzuMemo.get(key); return x && (Date.now() - x.t < 10 * 60 * 1000) ? x.v : null; }
function memoSet(key, value) {
  __zuzuMemo.set(key, { t: Date.now(), v: value });
  if (__zuzuMemo.size > 80) { const first = __zuzuMemo.keys().next().value; if (first) __zuzuMemo.delete(first); }
}

function zuzuTraceItem(step, status = 'INFO', detail = '', extra = {}) {
  return {
    time: new Date().toISOString(),
    step: trim(step),
    status: trim(status || 'INFO').toUpperCase(),
    detail: trim(detail).slice(0, 900),
    ...extra
  };
}
function zuzuTracePush(trace, step, status = 'INFO', detail = '', extra = {}) {
  if (!Array.isArray(trace)) return;
  trace.push(zuzuTraceItem(step, status, detail, extra));
}
function usageSmall(payload, model = '') {
  const u = payload?.usageMetadata || payload || {};
  const base = {
    promptTokens: u.promptTokenCount ?? u.promptTokens ?? '',
    candidateTokens: u.candidatesTokenCount ?? u.candidateTokens ?? '',
    totalTokens: u.totalTokenCount ?? u.totalTokens ?? ''
  };
  if (model) {
    const cost = estimateGeminiCost(model, u);
    base.outputTokens = cost.outputTokens;
    base.costUsd = cost.costUsd;
    base.costEurApprox = cost.costEurApprox;
    base.pricingFamily = cost.family;
  }
  return base;
}
function summarizeGeminiUsageFromTrace(trace = []) {
  const items = arr(trace).filter(x => x?.usage && (x.usage.promptTokens || x.usage.totalTokens));
  const total = items.reduce((acc, x) => {
    acc.promptTokens += num(x.usage.promptTokens);
    acc.candidateTokens += num(x.usage.candidateTokens);
    acc.outputTokens += num(x.usage.outputTokens || x.usage.billableOutputTokens);
    acc.hiddenOutputTokens += num(x.usage.hiddenOutputTokens);
    acc.totalTokens += num(x.usage.totalTokens);
    acc.costUsd += num(x.usage.costUsd);
    acc.costEurApprox += num(x.usage.costEurApprox);
    return acc;
  }, { promptTokens:0, candidateTokens:0, outputTokens:0, hiddenOutputTokens:0, totalTokens:0, costUsd:0, costEurApprox:0 });
  total.costUsd = Number(total.costUsd.toFixed(6));
  total.costEurApprox = Number(total.costEurApprox.toFixed(6));
  return { calls: items.length, ...total, note: 'Coste estimado por ControlEvent usando output facturable = max(candidatesTokenCount, totalTokenCount - promptTokenCount). La factura real puede variar por caché, región, impuestos o cambios de tarifa.' };
}

function estimateTokensFromText(value) {
  // Estimación local barata: Gemini usa tokenización propia; para traza y decisiones de compactado basta aproximar.
  const chars = text(value).length;
  return Math.max(1, Math.ceil(chars / 4));
}
function sizeTrace(trace, step, label, payloadText) {
  if (!Array.isArray(trace)) return;
  const chars = text(payloadText).length;
  zuzuTracePush(trace, step, 'INFO', `${label}: ${chars} caracteres aprox.; ~${estimateTokensFromText(payloadText)} tokens de entrada estimados antes de Zuzu.`);
}
function compactJson(value, maxChars = 12000) {
  return JSON.stringify(value ?? null).replace(/\s+/g, ' ').slice(0, maxChars);
}
function todayIsoMadrid() {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  } catch (_) {
    return new Date().toISOString().slice(0, 10);
  }
}

function cleanGeminiError(error) {
  const status = error?.status ? `HTTP ${error.status}: ` : '';
  const raw = text(error?.message || error);
  const detailMsg = text(error?.details?.error?.message || error?.details?.message || '');
  return (status + (raw || detailMsg || 'Error desconocido de Zuzu')).slice(0, 1200);
}

async function geminiFetchJsonWithTimeout(url, body, apiKey, timeoutMs = 35000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body), signal: controller.signal });
    const payload = await res.json().catch(async () => ({ error: { message: await res.text().catch(() => res.statusText) } }));
    return { res, payload };
  } catch (error) {
    if (error && (error.name === 'AbortError' || /abort/i.test(text(error.message)))) {
      const e = new Error(`Zuzu tardó demasiado y se abortó a los ${Math.round(timeoutMs/1000)} s`);
      e.status = 504;
      throw e;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function callGeminiEvent(prompt, context, flowTrace = []) {
  const apiKey = geminiKey();
  if (!apiKey) {
    const err = new Error('Falta GEMINI_API_KEY en Vercel para usar Zuzu / Analítica libre.');
    err.status = 503;
    zuzuTracePush(flowTrace, 'Paso 3 · Zuzu respuesta final', 'KO', err.message);
    throw err;
  }
  let lastError = null;
  for (const model of configuredGeminiModelsForTask('zuzu-structured')) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: systemPrompt(prompt, context) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: eventAiSchema(), temperature: 0.2 }
    };
    try {
      zuzuTracePush(flowTrace, 'Paso 3 · Zuzu respuesta final estructurada', 'RUN', `Modelo ${model}. Enviando prompt original + contexto extraído por CE.`);
      const { res, payload } = await geminiFetchJsonWithTimeout(url, body, apiKey, Number(process.env.CONTROLEVENT_ZUZU_EVENT_TIMEOUT_MS || 24000));
      logGeminiUsage('PASO 2 respuesta final estructurada', model, payload);
      if (!res.ok) {
        const e = new Error(payload?.error?.message || `Zuzu HTTP ${res.status}`);
        e.status = Number(res.status || 502);
        e.details = payload;
        throw e;
      }
      const outText = trim(geminiOutText(payload));
      if (!outText) throw new Error('Zuzu no devolvió texto analizable.');
      let parsed;
      try { parsed = JSON.parse(stripJsonText(outText)); }
      catch (e) {
        // v11_3_3 hotfix: nunca mostrar al usuario una respuesta cruda/rota de Zuzu.
        // Si Zuzu no respeta el JSON, se entrega una salida estructurada de ControlEvent
        // con los datos canónicos y una advertencia.
        const fallback = directPersonsCatalogIfApplicable(prompt, context) || directProductConsumptionResultIfApplicable(prompt, context) || directDeterministicResultIfApplicable(prompt, context) || directGraphResultIfApplicable(prompt, context) || (!isTransformAnalysisPrompt(prompt) ? directModuleResultIfApplicable(prompt, context) : null);
        if (fallback) {
          fallback.warnings = arr(fallback.warnings).concat('Zuzu fue llamado pero no devolvió JSON estructurado válido; ControlEvent muestra una salida analítica estructurada para no dejar una pantalla inútil.');
          fallback.provider = `${fallback.provider || 'control-event'}-json-fallback`;
          fallback.model = 'formato-local-por-json-invalido';
          return fallback;
        }
        zuzuTracePush(flowTrace, 'Paso 3 · Zuzu respuesta final estructurada', 'KO', 'Zuzu respondió, pero no en JSON válido. Se adjunta texto crudo como fichero.', { model });
        return {
          ok: true,
          rejected: false,
          title: 'Respuesta de Zuzu no estructurada',
          answer: 'Zuzu no devolvió un JSON válido. ControlEvent ha evitado mostrar la respuesta cruda para no entregar una pantalla ilegible. Repite la consulta de forma algo más concreta o revisa la cuota/modelo de Zuzu.',
          warnings: ['Zuzu no devolvió JSON estructurado válido y no hubo una salida local aplicable.'],
          charts: [],
          tables: [],
          files: [{ filename: fileSafe('Zuzu_respuesta_zuzu_no_estructurada_v27_prod_1.2.txt'), mime: 'text/plain;charset=utf-8', content: outText.slice(0, 250000) }],
          provider: 'gemini-rest-json-fallback',
          model
        };
      }
      const normalized = normalizeResult(parsed, model);
      normalized.answer = sanitizeTemporalAnswerForContext(normalized.answer, context);
      normalized.__zuzuGeminiFinal = { ok: true, model, usage: usageSmall(payload, model), mode: 'structured-json' };
      zuzuTracePush(flowTrace, 'Paso 3 · Zuzu respuesta final estructurada', 'OK', `Zuzu devolvió JSON válido. Tablas=${arr(normalized.tables).length}; gráficas=${arr(normalized.charts).length}; ficheros=${arr(normalized.files).length}.`, { model, usage: usageSmall(payload, model) });
      return normalized;
    } catch (error) {
      lastError = error;
      zuzuTracePush(flowTrace, 'Paso 3 · Zuzu respuesta final estructurada', 'KO', cleanGeminiError(error), { model });
      if (isQuotaError(error) || !isRetryable(error)) break;
    }
  }
  lastError.status = lastError.status || 502;
  throw lastError;
}


function narrativeToneFromPrompt(prompt) {
  const p = norm(prompt);
  const informal = /\b(coloquial|informal|simpatic|simpático|chascarrill|cachond|cachondo|cachonda|cachondeo|coña|broma|risas|guasa|gracios|socios?|soci[ao]s?|peña|ameno|cercano|divertid|natural|humano|campechano|tronquet|colegueo|colega|curra|curres|ya\s+me\s+conoces|como\s+vas\s+por|cómo\s+vas\s+por|para\s+contar|para\s+leer|para\s+dar|para\s+darselo|para\s+dárselo|buena\s+persona|señor[ao]\s+espos[ao])\b/.test(p);
  const technical = /\b(tecnic|técnic|financier|contable|auditor|direccion|dirección|junta\s+directiva|formal|ejecutiv|presupuest|balance|referencias?\s+tecnic|complicad|justificad|fiscal|tesoreria|tesorería|direcci[oó]n|informe\s+de\s+cierre|informe\s+oficial)\b/.test(p);
  if (technical) return {
    id: 'tecnico-financiero',
    label: 'técnico/financiero',
    instruction: 'Redacta en tono formal, ejecutivo y verificable: conclusiones, criterios de cálculo, salvedades, trazabilidad y lectura financiera. Evita bromas y frases coloquiales.'
  };
  if (informal) return {
    id: 'coloquial-socios',
    label: 'coloquial para socios',
    instruction: 'Redacta como Zuzu en tono cercano para socios: humano, simpático, con gracia ligera y complicidad. Puedes usar chascarrillos suaves si el usuario los pide, sin ridiculizar a nadie y apoyando cada opinión en los datos.'
  };
  return {
    id: 'general',
    label: 'general',
    instruction: 'Redacta en tono claro, natural y útil, con interpretación de líneas generales, opinión prudente si la piden y conclusiones prácticas.'
  };
}
function wantsOnePageNarrative(prompt) {
  const p = norm(prompt);
  return /\b((?:una|1)\s+(?:pag(?:ina)?|pagina)|p[aá]gina|texto\s+de\s+1|texto\s+de\s+una|informe\s+en\s+texto|redaccion|redacción|desarrollado|todo\s+lujo\s+de\s+detalles)\b/.test(p);
}
function wantsNarrativeReport(prompt) {
  const p = norm(prompt);
  return /\b(informe|infore|memoria|cronica|crónica|resumen|dossier|explica|explicame|explícame|cuenta|cuentame|cuéntame|cositas|lectura|conclusiones|valoracion|valoración|opinion|opinión|parece|merece|ves\s+tu|ves\s+tú|como\s+lo\s+ves|cómo\s+lo\s+ves|texto|pagina|página|redaccion|redacción|palabras|entonacion|entonación|tono|sentimiento|para\s+entregar|para\s+pasar|para\s+darlo|para\s+darselo|para\s+dárselo|socios|direccion|dirección|coloquial|informal|cachond|chascarrill|tecnic|técnic|financier|contable)\b/.test(p);
}
function requiresGeminiNarrativeStrict(prompt) {
  const p = norm(prompt);
  // Cuando el usuario pide tono, opinión o que “lo haga Zuzu”, no queremos plantillas locales.
  // ControlEvent cocina los datos; Zuzu debe escribir la respuesta humana.
  return wantsNarrativeReport(prompt) && /\b(zuzu|dejate|déjate|curra|curres|tronquet|colegueo|colega|ya\s+me\s+conoces|opinion|opinión|merece|como\s+lo\s+ves|cómo\s+lo\s+ves|tono|cachond|chascarrill|coloquial|informal|simpatic|simpa[tá]ic|palabras|texto\s+de|una\s+pagina|1\s+pagina|p[aá]gina|para\s+darselo|para\s+dárselo|para\s+socios|para\s+direccion|direcci[oó]n)\b/.test(p);
}
function shouldEnrichLocalResultWithNarrative(prompt, result) {
  if (!result || result.rejected === true || result.ok === false) return false;
  const hasData = arr(result.tables).length || arr(result.charts).length || trim(result.answer);
  if (!hasData) return false;
  const provider = trim(result.provider || '');
  // v19: toda salida cocinada localmente por CE debe pasar por Zuzu como capa final de contexto y redacción.
  // Si ya viene de Zuzu REST estructurado o de la capa de redacción, no se fuerza una segunda llamada.
  if (/^gemini-rest/i.test(provider) || /zuzu-redaccion|zuzu-sentimiento|zuzu-gemini-final|redaccion-local/i.test(provider)) return false;
  return !!geminiKey();
}
function tableObjects(table, maxRows = 30) {
  const columns = arr(table?.columns).map(c => trim(c));
  return arr(table?.rows).slice(0, maxRows).map(row => {
    const obj = {};
    columns.forEach((c, i) => { obj[c] = trim(arr(row)[i]); });
    return obj;
  });
}
function pickNarrativeTables(result) {
  const tables = arr(result?.tables);
  const provider = trim(result?.provider || '');
  if (/control-event-local-informe-eventos/i.test(provider)) {
    // En v23_1 Zuzu recibe una muestra de TODOS los bloques exigidos, no solo el resumen
    // económico. Se limita el número de filas después en compactResultForNarrative.
    const priorities = [
      /resumen ejecutivo|resumen financiero/,
      /ficha y descripcion|ficha y descripción/,
      /participacion y documentacion|participación y documentación/,
      /ingresos por tipo/,
      /compras por (?:clasificacion|clasificación|destino|segmento|tienda|responsable)/,
      /tickets y facturas/,
      /donaciones (?:resumidas|por (?:donante|producto))/,
      /^documentos(?:\b|\s|·)/,
      /meteorolog|metereolog|tiempo|clima|prevision/
    ];
    const selected=[];
    priorities.forEach(re=>{
      const found=tables.find(tb=>re.test(norm(tb?.title||'')) && !selected.includes(tb));
      if(found) selected.push(found);
    });
    if(selected.length) return selected.slice(0,10);
  }
  const scored = tables.map((tb, idx) => {
    const t = norm(tb?.title || '');
    let score = 0;
    if (/resumen|cronica|crónica|comparativa|participaci|saldo|ranking|operativo|tickets|documentos/.test(t)) score += 10;
    if (/detalle.*registros|detalle.*donaciones|detalle.*compras|detalle.*ingresos/.test(t)) score += 3;
    else if (/detalle/.test(t)) score -= 4;
    return { tb, idx, score };
  }).sort((a,b)=>b.score-a.score || a.idx-b.idx);
  return scored.slice(0, 6).map(x => x.tb);
}

function narrativeFactsFromResult(result) {
  const roles = objectsFromResultTable(result, /resumen.*papel/, 50);
  const eventos = objectsFromResultTable(result, /resumen.*evento.*papel|resumen.*evento/, 50);
  const suppressDetailExamples = /control-event-local-informe-eventos/i.test(trim(result?.provider || ''));
  const detalle = suppressDetailExamples ? [] : objectsFromResultTable(result, /detalle.*registros|registros.*localizados|detalle/, 160);
  const topProducto = new Map();
  const topImporte = new Map();
  const tiendas = new Map();
  const donantes = new Map();
  detalle.forEach(r => {
    const prod = trim(r.Producto || r.producto || r['Nombre producto']);
    const imp = num(r['Importe/valor (€)'] || r.Importe || r.Valor || r.valor || r['Importe (€)']);
    const uds = num(r.Unidades || r.unidades);
    if (prod) addQtyCost(topProducto, prod, uds, imp);
    if (prod) add(topImporte, prod, imp);
    const det = trim(r.Detalle || r.detalle || '');
    const t = (det.match(/tienda:\s*([^;]+)/i) || [,''])[1];
    const d = (det.match(/donante:\s*([^;]+)/i) || [,''])[1] || (det.match(/responsable:\s*([^;]+)/i) || [,''])[1];
    if (t) add(tiendas, t, imp || 1);
    if (d) add(donantes, d, imp || 1);
  });
  const examples = suppressDetailExamples ? [] : detalle.slice(0, 16).map(r => ({
    evento: trim(r.Evento), papel: trim(r.Papel), producto: trim(r.Producto), unidades: trim(r.Unidades), importe: trim(r['Importe/valor (€)'] || r.Importe || r.Valor), detalle: trim(r.Detalle), relacionado: trim(r.Relacionado)
  }));
  return {
    titulo: trim(result?.title),
    resumenEventos: eventos.slice(0, 20),
    resumenPapeles: roles.slice(0, 25),
    registrosDetalleTotal: detalle.length,
    productosDestacadosPorImporte: [...topImporte.entries()].sort((a,b)=>num(b[1])-num(a[1])).slice(0, 16).map(([nombre, valor]) => ({ nombre, valor: round(valor,2) })),
    productosDestacadosPorUnidades: [...topProducto.entries()].sort((a,b)=>num(b[1]?.unidades)-num(a[1]?.unidades)).slice(0, 16).map(([nombre, v]) => ({ nombre, unidades: round(v.unidades,3), valor: round(v.coste,2) })),
    tiendasDetectadas: topN(tiendas, 12),
    donantesOResponsablesDetectados: topN(donantes, 12),
    ejemplosRepresentativos: examples,
    notaAnexo: 'El detalle completo queda en tablas/anexos generados por CE; Zuzu recibe resumen y ejemplos para ahorrar tokens.'
  };
}
function narrativeTemporalContext(context) {
  const todayIso = trim(context?.fechaActualControlEvent || '') || todayIsoMadrid();
  const events = arr(context?.eventosObjetivo).map(ev => {
    const title = trim(ev?.['Titulo del evento'] || ev?.Titulo || ev?.Evento || ev?.EVENTO || '');
    const startIso = parseCeDateToIso(ev?.['fecha ini'] || ev?.fechaIni || ev?.Fecha || ev?.fecha || '');
    const endIso = parseCeDateToIso(ev?.['fecha fin'] || ev?.fechaFin || ev?.FechaFin || ev?.fecha_fin || '') || startIso;
    const estado = trim(ev?.Estado || ev?.estado || '');
    let relacionTemporal = 'sin_fecha';
    if (startIso) {
      if (startIso > todayIso) relacionTemporal = 'futuro';
      else if (endIso && endIso < todayIso) relacionTemporal = 'pasado';
      else relacionTemporal = 'en_curso_o_hoy';
    }
    return { titulo:title, fechaInicio:startIso, fechaFin:endIso, estado, relacionTemporal };
  }).filter(e => e.titulo || e.fechaInicio);
  return { hoy: todayIso, eventos: events };
}
function compactIndirectContextForNarrative(context) {
  const weather = context?.infoIndirecta?.meteorologia;
  const out = {};
  if (weather) {
    out.meteorologia = {
      ok: !!weather.ok,
      proveedor: trim(weather.proveedor || 'Open-Meteo'),
      localidad: trim(weather.localidad || ''),
      filas: arr(weather.filas).slice(0, 14).map(r => ({
        Evento: trim(r.Evento),
        Localidad: trim(r.Localidad),
        Día: trim(r.Día || r.Dia),
        Fecha: trim(r.Fecha),
        Cielo: trim(r.Cielo),
        'Temp. max': r['Temp. máx'],
        'Temp. min': r['Temp. mín'],
        'Prob. lluvia %': r['Prob. lluvia %'],
        'Viento km/h': r['Viento km/h'],
        Aviso: trim(r.Aviso || '')
      }))
    };
  }
  return out;
}
function compactResultForNarrative(result, narrativeContext = {}) {
  const policy = analyzeZuzuReportRequest(result?.__userPrompt || '');
  const onePage = policy.onePage || wantsOnePageNarrative(result?.__userPrompt || '');
  const tables = pickNarrativeTables(result).map(tb => {
    const t = norm(tb?.title || '');
    const isDetail = /detalle/.test(t);
    const isWeather = /meteorolog|tiempo|clima|lluvia|temperatura/.test(t);
    const isDocuments = /^documentos|tickets y facturas/.test(t);
    const maxRows = onePage ? 14 : (isWeather ? 6 : (isDocuments ? 8 : (isDetail ? 6 : 8)));
    return {
      title: trim(tb?.title),
      columns: arr(tb?.columns).map(c => trim(c)).slice(0, 12),
      rows: tableObjects(tb, maxRows)
    };
  });
  const charts = arr(result?.charts).slice(0, 6).map(ch => ({
    title: trim(ch?.title),
    type: trim(ch?.type),
    labels: arr(ch?.labels).map(x => trim(x)).slice(0, 12),
    values: arr(ch?.values).map(x => round(x, 3)).slice(0, 12),
    series: arr(ch?.series).slice(0, 4).map(s => ({ name: trim(s?.name), values: arr(s?.values).map(x => round(x, 3)).slice(0, 12) })),
    unit: trim(ch?.unit)
  }));
  return {
    title: trim(result?.title),
    contextoTemporal: narrativeTemporalContext(narrativeContext),
    usuarioLogado: narrativeContext?.usuarioLogado || null,
    datosIndirectos: compactIndirectContextForNarrative(narrativeContext),
    asistenciaCanonica: { regla: trim(narrativeContext?.asistenciaCanonica?.regla || ''), porEvento: arr(narrativeContext?.asistenciaCanonica?.porEvento).slice(0,8) },
    contextoPersonas: narrativeContext?.contextoPersonasZuzu || null,
    politicaInforme: narrativeContext?.politicaInforme || analyzeZuzuReportRequest(result?.__userPrompt || ''),
    resumenCocinado: narrativeFactsFromResult(result),
    answerBase: trim(result?.answer).slice(0, 600),
    charts,
    tables,
    warnings: arr(result?.warnings).map(w => trim(w)).filter(Boolean).slice(0, 5)
  };
}
function firstSummaryObject(result) {
  const tb = pickNarrativeTables(result)[0];
  return tableObjects(tb, 1)[0] || {};
}
function columnValueLoose(obj, re) {
  const entry = Object.entries(obj || {}).find(([k]) => re.test(norm(k)));
  return entry ? trim(entry[1]) : '';
}

function objectsFromResultTable(result, titleRe, maxRows = 200) {
  const tb = arr(result?.tables).find(t => titleRe.test(norm(t?.title || '')));
  return tb ? tableObjects(tb, maxRows) : [];
}
function fallbackPersonNarrativeForLocalReport(prompt, result, context = {}) {
  const p = norm(prompt);
  const title = trim(result?.title || '');
  if (!/participaci|papel/.test(norm(title))) return '';
  const tone = narrativeToneFromPrompt(prompt);
  const detail = objectsFromResultTable(result, /detalle.*registros|registros.*localizados/, 80);
  const roles = objectsFromResultTable(result, /resumen.*papel/, 20);
  const eventSummary = objectsFromResultTable(result, /resumen.*evento.*papel/, 20);
  if (!detail.length && !roles.length) return '';
  const who = (title.match(/participación de\s+(.+)$/i) || [,'la persona consultada'])[1];
  const eventos = uniqueTextList(detail.map(r => r.Evento).filter(Boolean));
  const productos = uniqueTextList(detail.map(r => r.Producto).filter(Boolean)).slice(0, 12);
  const total = eventSummary.reduce((a,r)=>a+num(r['Importe/valor total (€)']),0) || roles.reduce((a,r)=>a+num(r['Importe/valor (€)']),0);
  const donante = roles.find(r => /donante/.test(norm(r.Papel)) && !/responsable/.test(norm(r.Papel)));
  const respDon = roles.find(r => /responsable.*donacion/.test(norm(r.Papel)));
  const colab = roles.find(r => /colaborador|ingreso/.test(norm(r.Papel)));
  const roleBits = [];
  if (colab) roleBits.push(`${colab.Registros} registro(s) como colaborador/ingreso`);
  if (donante) roleBits.push(`${donante.Registros} línea(s) como donante`);
  if (respDon) roleBits.push(`${respDon.Registros} línea(s) como responsable de donación`);
  const rolesText = roleBits.length ? roleBits.join(', ') : `${detail.length} registro(s) localizados`;
  if (tone.id === 'coloquial-socios') {
    return `Zuzu lo ve bastante claro: ${who} no pasó por ${eventos.join(' | ') || 'el evento'} a mirar desde la barrera. Su participación aparece con ${rolesText}${total ? ` y un valor asociado de ${round(total,2)} €` : ''}. Y eso, dicho en versión de peña, es entrar por la puerta con la gorra puesta y salir habiendo dejado huella.

En lo concreto, la aportación viene cargada de producto y de intendencia: ${productos.join(', ')}${productos.length ? '...' : 'varias líneas registradas'}. No es la típica colaboración de “yo si eso me paso luego”; aquí hay comida, bebida, organización y presencia real. Si además aparece solo y acompañado, la lectura es todavía más bonita: no es una aportación aislada, es una participación de las que hacen grupo.

Mi opinión, apoyándome en los datos, es que ${who} queda retratado como alguien que arrima el hombro de verdad. Con números delante y sin vender humo, su papel fue relevante, generoso y de esos que conviene agradecer en público. Vamos, que para darle este informe a esa persona, yo lo resumiría así: ${who} no fue de figurante; ${who} dejó una participación con huella y con datos que la sostienen.`;
  }
  if (tone.id === 'tecnico-financiero') {
    return `La participación de ${who} en ${eventos.join(' | ') || 'el evento consultado'} queda acreditada mediante ${rolesText}${total ? `, con un importe/valor agregado de ${round(total,2)} €` : ''}. La información se apoya en los módulos operativos de ingresos y donaciones, separando el papel de donante del papel de responsable de la aportación cuando ambos aparecen diferenciados.

Desde el punto de vista de trazabilidad, la participación es relevante porque no se limita a una presencia nominal: hay líneas de producto identificadas, unidades, valoración económica y relación con el evento. Los productos principales registrados incluyen ${productos.join(', ') || 'las líneas detalladas en la tabla inferior'}.

Conclusión: los datos permiten considerar a ${who} como participante significativo, con aportación material y responsabilidad operativa documentada. La tabla posterior conserva el detalle verificable línea a línea para contraste o archivo.`;
  }
  return `La participación de ${who} en ${eventos.join(' | ') || 'el evento consultado'} aparece documentada con ${rolesText}${total ? ` y un valor asociado de ${round(total,2)} €` : ''}. Las líneas localizadas muestran una aportación real, especialmente en productos como ${productos.join(', ') || 'los detallados en la tabla'}.

Mi valoración es positiva: no parece una presencia testimonial, sino una colaboración efectiva y con peso dentro de la organización del evento. Debajo queda el detalle para revisar cada línea sin perder trazabilidad.`;
}


function fallbackEventReportNarrativeForLocalReport(prompt, result, context = {}) {
  if (!/control-event-local-informe-eventos/i.test(trim(result?.provider || ''))) return '';
  const rows = objectsFromResultTable(result, /resumen\s+(?:financiero|operativo|econ[oó]mico)(?:\s+por\s+evento)?/, 20);
  if (!rows.length) return '';
  const socios = objectsFromResultTable(result, /resumen\s+canonico|resumen\s+canónico|participaci[oó]n\s+y\s+documentaci[oó]n(?:\s+por\s+evento)?/, 20);
  const weather = goodWeatherRowsFromContext(context);
  const line = r => {
    const ev = trim(r.Evento);
    const estado = trim(r.Estado);
    const provisional = /en\s*curso/i.test(estado) ? ' (En curso: cifras provisionales)' : '';
    const ingresosPrevistos = trim(r['Ingresos previstos (€)'] || r['Ingresos total (€)']) || '0';
    const ingresosCobrados = trim(r['Ingresos cobrados (€)'] || r['Ingresos realizados (€)']) || '0';
    const comprasRealizadas = trim(r['Compras realizadas (€)']) || '0';
    const comprasPendientes = trim(r['Compras pendientes (€)']) || '0';
    const donaciones = trim(r['Donaciones valoradas (€)']) || '0';
    const saldoActual = trim(r['Saldo actual (€)']) || '0';
    const saldoCierre = trim(r['Saldo previsto al cierre (€)'] || r['Saldo operativo (€)']) || '0';
    return `${ev}${provisional}: ingresos previstos ${ingresosPrevistos} €, ingresos cobrados ${ingresosCobrados} €, compras realizadas ${comprasRealizadas} €, compras pendientes ${comprasPendientes} €, donaciones valoradas ${donaciones} €, saldo actual ${saldoActual} € y saldo previsto al cierre ${saldoCierre} €`;
  };
  const inProgress = rows.filter(r => /en\s*curso/i.test(trim(r.Estado || r['Nota estado']))).map(r => trim(r.Evento)).filter(Boolean);
  const sociosText = socios.length ? socios.map(r => `${trim(r.Evento)}: ${trim(r['Socios asistentes'] || r['Socios asistentes canónicos']) || '0'} asistentes y ${trim(r['Socios no asistentes'] || r['Socios no asistentes canónicos']) || '0'} no asistentes sobre ${trim(r['Socios'] || r['Socios canónicos']) || '0'} socios`).join('; ') : '';
  const weatherText = weather.length ? weather.map(r => `${trim(r.Evento)} ${trim(r.Día || r.Dia || spanishWeekdayFromIso(r.Fecha))} ${trim(r.Fecha)}: ${trim(r.Cielo)}, máxima ${r['Temp. máx']} ºC, mínima ${r['Temp. mín']} ºC, lluvia ${r['Prob. lluvia %']} %, viento ${r['Viento km/h']} km/h`).join('; ') : '';
  const totals = rows.map(line).join('. ');
  return `Resumen técnico ControlEvent: la consulta está restringida a ${rows.length} evento(s) y los cálculos se han hecho con plantillas cerradas, sin mezclar otros eventos. ${totals}.

Lectura de producto disponible y saldos: los eventos finalizados son comparables como cierre; ${inProgress.length ? `${inProgress.join(', ')} está En curso y por tanto sus compras pendientes, donaciones, ingresos y saldos todavía pueden cambiar antes del cierre.` : 'no hay eventos En curso en esta comparativa.'} La comparación debe leer compras realizadas y pendientes por separado. Saldo actual = dinero efectivamente ingresado menos compras realizadas; saldo operativo = ingresos previstos menos compras previstas. No conviene confundir saldos financieros con valoración total del producto disponible.

Socios: ${sociosText || 'la asistencia canónica queda en las tablas.'}. Criterio aplicado: rango SOCIO, exclusión de registros técnicos/grupo/Peña, parejas con " y " como 2 personas, y colaboradores SOCIO con Numero>0; Numero=0 solo cuenta si la situación confirma asistencia, exención o invitación.

${weatherText ? `Meteorología: ${weatherText}.\n\n` : ''}Conclusión técnica: con los datos actuales, el evento En curso debe interpretarse como una foto provisional. La decisión correcta no es exigirle saldo parecido a un evento cerrado, sino comprobar si el producto disponible previsto —compras realizadas + pendientes + donaciones— está proporcionalmente alineado con los años cerrados.`;
}

function fallbackNarrativeForLocalReport(prompt, result, context = {}) {
  const eventFallback = fallbackEventReportNarrativeForLocalReport(prompt, result, context);
  if (eventFallback) return eventFallback;
  const temporal = narrativeTemporalContext(context);
  const hasFutureEvent = arr(temporal.eventos).some(e => e.relacionTemporal === 'futuro');
  const personFallback = fallbackPersonNarrativeForLocalReport(prompt, result, context);
  if (personFallback) return personFallback;
  const tone = narrativeToneFromPrompt(prompt);
  const one = firstSummaryObject(result);
  const evento = columnValueLoose(one, /(^|\b)evento(\b|$)/) || trim(result?.title || 'el informe');
  const ingresos = columnValueLoose(one, /ingresos/);
  const compras = columnValueLoose(one, /compras.*realizadas|compras/);
  const donaciones = columnValueLoose(one, /donaciones/);
  const saldo = columnValueLoose(one, /saldo/);
  const colaboradores = columnValueLoose(one, /colaboradores|ingresos.*registros/);
  const asistentes = columnValueLoose(one, /asistentes|numero|número/);
  const tickets = columnValueLoose(one, /tickets/);
  const documentos = columnValueLoose(one, /documentos/);
  const parts = [];
  if (ingresos) parts.push(`ingresos ${ingresos}`);
  if (compras) parts.push(`compras ${compras}`);
  if (donaciones) parts.push(`donaciones valoradas ${donaciones}`);
  if (saldo) parts.push(`saldo ${saldo}`);
  const cifras = parts.length ? parts.join(', ') : 'actividad registrada en los módulos disponibles';
  if (tone.id === 'tecnico-financiero') {
    return `Lectura ejecutiva de Zuzu: el informe de ${evento} presenta ${cifras}. El análisis separa la caja financiera de las donaciones valoradas: el saldo actual se interpreta como ingresos realizados menos compras realizadas, y el saldo operativo como ingresos previstos menos compras previstas; las donaciones se muestran como aportación operativa adicional.\n\nConclusión: el detalle de tablas y ficheros permite justificar ingresos/colaboradores, gasto por compras, aportaciones donadas, tickets/fototickets y documentación soporte. Conviene revisar cualquier línea negativa o de ajuste antes de entregar el informe como cierre definitivo.`;
  }
  if (tone.id === 'coloquial-socios') {
    return `Lectura de Zuzu para contar a los socios: en ${evento} ${hasFutureEvent ? 'hay movimiento previsto y preparado' : 'hubo movimiento del bueno'}: ${cifras}. Traducido a cristiano, aquí no solo hay números; hay gente que colaboró, compras que sostuvieron la celebración y donaciones que ayudaron a que la cosa saliera adelante sin que la caja tuviera que cargar con todo.\n\nEl resumen detallado viene debajo con pelos y señales: colaboradores${colaboradores ? ` (${colaboradores})` : ''}, asistentes${asistentes ? ` (${asistentes})` : ''}, tickets${tickets ? ` (${tickets})` : ''} y documentos${documentos ? ` (${documentos})` : ''}. Vamos, que si alguien pregunta “¿y esto de dónde sale?”, hay papeles y números para aburrir a una oveja, pero contado bonito.`;
  }
  return `Lectura general de Zuzu: el informe de ${evento} resume ${cifras}. Las tablas siguientes dejan trazabilidad por ingresos/colaboradores, compras, donaciones, tickets/fototickets y documentos.\n\nLa idea principal es separar la visión financiera de caja de la actividad real del evento: la caja real se mide por saldo actual (ingresos realizados menos compras realizadas), el cierre previsible por saldo operativo, y las donaciones explican valor recibido aunque no entren como ingreso monetario.`;
}
function narrativeMiniSchema() {
  return {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      answer: { type: 'STRING' },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['title','answer','warnings']
  };
}
function narrativePrompt(userPrompt, localResult, context) {
  const tone = narrativeToneFromPrompt(userPrompt);
  const policy = analyzeZuzuReportRequest(userPrompt);
  const onePage = policy.onePage || wantsOnePageNarrative(userPrompt);
  const enriched = { ...localResult, __userPrompt: userPrompt };
  const compact = compactResultForNarrative(enriched, context);
  const ctx = compactJson({ tono: tone.label, instruccionesTono: tone.instruction, politicaInforme:policy, resultadoControlEvent: compact }, onePage ? 14500 : 10000);
  const limit = onePage
    ? '2 o 3 párrafos muy compactos y máximo 1250 caracteres; las tablas deben caber en la misma página'
    : '4 a 7 párrafos y máximo 3400 caracteres';
  const coverage = policy.modules.filter(m=>m!=='METEO').join(', ') || 'los módulos presentes';
  return `Eres Zuzu, el buen amigo y voz masculina final de ControlEvent. ControlEvent ya calculó los datos: tú redactas una lectura exacta, útil, no redundante y sin inventar nada.

REGLAS OBLIGATORIAS:
- Devuelve SOLO JSON válido con title, answer y warnings.
- No copies tablas, listas de productos o JSON dentro de answer: las tablas se muestran debajo.
- En un informe de UN evento, escribe su nombre completo una sola vez, preferentemente en el título o primera frase; después di «el evento».
- Cada persona o pareja se menciona una sola vez en toda la respuesta. Si una tabla ya contiene los nombres, no los repitas en la narración. Si el usuario pide saludar uno por uno, saluda cada grupo canónico una sola vez y no vuelvas a enumerarlo.
- Cada cifra importante se explica una sola vez. No repitas asistencia, ingresos, saldos ni meteorología en varios párrafos con palabras distintas.
- Redacta para lectura por voz: evita repeticiones contiguas como «el evento el evento» o «esa persona esa persona», muletillas, Markdown visible y signos defectuosos como «¡.». Usa un tono cercano pero analítico, sin felicitaciones gratuitas.
- Para asistencia usa SOLO asistenciaCanonica. Numero>0 confirma; Numero=0 solo cuenta con estado explícito de asistencia/exención/invitación. Registros de ingreso son filas administrativas, no asistentes.
- No uses la palabra «canónica» en un informe normal: di «asistencia confirmada». Menciona el número de registros administrativos solo si el usuario pregunta por registros/colaboradores o por una discrepancia.
- Para una petición de informe general o detalles, comenta TODOS los bloques requeridos por politicaInforme: ${coverage}${policy.wantsWeather ? ', METEO' : ''}. No te limites a ingresos y donaciones: incluye compras, tickets/facturas y documentos, aunque sea para indicar su estado o ausencia.
- Distingue saldo actual (ingresos cobrados menos compras realizadas) y saldo previsto al cierre (ingresos previstos menos compras previstas). Las donaciones son valor recibido, no dinero de caja. VALORACIÓN DEL EVENTO = valor de las compras previstas (realizadas + pendientes) + valor del producto donado. Nunca calcules la valoración como saldo + donaciones ni atribuyas el saldo a las donaciones.
- Interpreta descripción, tickets y documentos: no te limites a contar filas. Señala qué acreditan o qué queda pendiente, con prudencia.
- Si HITOS/LG están pedidos, explica avance, tareas pendientes, responsables y dependencias relevantes usando nombres humanos; no cites códigos ni relaciones descartadas por incoherencia.
- No menciones códigos internos (id, persona_id, event_id, producto_id, tienda_id, donor_ref, P:id, T:id, SQL, SELECT, módulos o tokens).
- contextoPersonas es privado y minimizado. Úsalo solo si la pregunta lo hace pertinente; nunca vuelques perfiles, edades, parentescos, salud o rasgos personales en un informe operativo general. Las alertas alimentarias relevantes sí prevalecen al planificar comida.
- Si hay evento En curso, di una sola vez que las cifras son provisionales.
- Si se pide meteorología y hay datos fiables, resume días, máximas/mínimas, lluvia y viento sin repetir la tabla. Los días de la semana vienen calculados por fecha: no los cambies.
- Habla siempre de ti en masculino. Termina una sola vez con la frase exacta «Pregúntame lo que quieras».
- Tono: ${tone.instruction}
- Extensión: ${limit}. Termina con una conclusión cerrada.

PETICIÓN ORIGINAL:
${trim(userPrompt).slice(0, 2200)}

RESUMEN OFICIAL CE:
${ctx}`;
}

function narrativeMaxOutputTokens(userPrompt) {
  const p = norm(userPrompt);
  const mode = trim(process.env.CONTROLEVENT_ZUZU_COST_MODE || '').toLowerCase();
  const multi = /\b(tambien|también|ademas|además|\d+\s*\.-|1\.-|2\.-|3\.-|socios?.*meteorolog|metereolog|tiempo|temperatura)\b/.test(p);
  if (/ultra|ahorro|max/i.test(mode)) return /dos\s+p[aá]gin|exhaustiv|completo/.test(p) ? 3400 : (multi ? 2600 : 1900);
  if (wantsOnePageNarrative(userPrompt)) return 5600;
  if (/exhaustiv|informe\s+completo|direcci[oó]n|financier|t[eé]cnic/.test(p)) return 4200;
  return multi ? 3600 : 2600;
}
function cleanGeminiLooseText(outText) {
  const raw = trim(outText).replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
  if (!raw) return raw;
  if (/^\{\s*"(?:title|answer)"\s*:/i.test(raw)) {
    try { const obj = JSON.parse(stripJsonText(raw)); return trim(obj.answer || obj.text || raw); } catch (_) {}
    const m = raw.match(/"answer"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"warnings"|"\s*\}|$)/i);
    if (m) return m[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
  }
  return raw;
}
function goodWeatherRowsFromContext(context) {
  return arr(context?.infoIndirecta?.meteorologia?.filas).filter(r => !trim(r?.Aviso));
}
function narrativeViolatesWeatherRequest(userPrompt, context, answer) {
  if (!wantsWeatherInfo(userPrompt)) return false;
  const rows = goodWeatherRowsFromContext(context);
  if (!rows.length) return false;
  const a = norm(answer);
  const denies = /(no dispongo|no tengo|no cuento|no hay informacion|no hay información|mis datos se centran|no puedo consultar|no aparece.*temperatura|no se ha podido obtener)/i.test(answer || '');
  const mentions = /(temperatura|grados|º|°|lluvia|viento|cubierto|despejado|nuboso|llovizna|tormenta|probabilidad)/i.test(answer || '');
  return denies || !mentions;
}
function narrativeViolatesTemporalContext(userPrompt, context, answer) {
  const events = arr(narrativeTemporalContext(context).eventos);
  if (!events.some(e => e.relacionTemporal === 'futuro')) return false;
  if (!/(temperatura|tiempo|clima|datos del evento|informe|evento)/i.test(userPrompt || '')) return false;
  const a = answer || '';
  return /(c[oó]mo fue|tuvimos|contamos con|se celebr[oó]|se celebra hoy|celebra hoy|el evento fue|hizo el d[ií]a|durante el evento tuvimos|para hoy\s+10|hoy\s+(?:mismo,?\s*)?10\s+de\s+julio|hoy\s+10\/07\/2026)/i.test(a);
}
function prettyIsoEs(iso) {
  const s = trim(iso);
  if (!s) return '';
  try {
    return new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${s}T00:00:00Z`));
  } catch (_) {
    return s;
  }
}
function sanitizeTemporalAnswerForContext(answer, context) {
  let out = trim(answer);
  const temporal = narrativeTemporalContext(context);
  const future = arr(temporal.eventos).find(e => e.relacionTemporal === 'futuro' && e.fechaInicio);
  if (!future || !out) return out;
  const today = trim(temporal.hoy);
  const start = trim(future.fechaInicio);
  const label = daysBetweenIso(today, start) === 1 ? 'mañana' : `el ${prettyIsoEs(start)}`;
  const pretty = prettyIsoEs(start);
  out = out
    .replace(/que\s+se\s+celebra\s+hoy\s+mismo,?\s*10\s+de\s+julio\s+de\s+2026/ig, `que está previsto para ${label}${pretty ? `, ${pretty}` : ''}`)
    .replace(/que\s+se\s+celebra\s+hoy/ig, `que está previsto para ${label}`)
    .replace(/para\s+hoy\s+10\s+de\s+julio/ig, `para ${label} 10 de julio`)
    .replace(/para\s+hoy\s+10\/07\/2026/ig, `para ${label} 10/07/2026`)
    .replace(/hoy\s+mismo,?\s*10\s+de\s+julio\s+de\s+2026/ig, `${label}, ${pretty || start}`)
    .replace(/hoy\s+10\/07\/2026/ig, `${label} 10/07/2026`);
  return out;
}

function narrativeLooksTruncated(answer, userPrompt) {
  const a = trim(answer);
  if (!a) return true;
  const p = norm(userPrompt);
  const asksComparison = /\b(compara|comparar|comparativa|comparativo|frente\s+a|versus|\bvs\b)\b/.test(p);
  const asksWeather = wantsWeatherInfo(userPrompt);
  const asksBroad = /\b(toda\s+la\s+info|toda\s+la\s+informacion|todo\s+lo\s+disponible|informe|dossier|detalles|detalle|conclusion|conclusiones)\b/.test(p);
  const quotedEvents = [...text(userPrompt).matchAll(/["“”'‘’]([^"“”'‘’]{2,90})["“”'‘’]/g)].length;
  const conjunctions = (p.match(/\b(y|ademas|tambien|no\s+obstante)\b/g) || []).length;
  const asksMany = asksComparison || asksWeather || asksBroad || quotedEvents > 1 || conjunctions > 1;
  const minLength = asksComparison && asksWeather ? 700 : (asksMany ? 450 : 120);
  if (a.length < minLength) return true;
  if (/[,:;\-–—(]$/.test(a)) return true;
  if (!/[.!?…]$/.test(a) && asksMany) return true;
  if (/\b(es\s+importante|conviene|hay\s+que|teniendo\s+en\s+cuenta|por\s+otro\s+lado|adem[aá]s|sin\s+embargo|no\s+obstante)\s*$/i.test(a)) return true;
  if (/\b(el|la|los|las|de|del|con|para|por|que|como|cómo|va|van|mirando|seg[uú]n|tambien|también|adem[aá]s|asciende|ascienden|importa|suma|queda|habr[aá]|tendr[aá])\s*$/i.test(a)) return true;
  return false;
}
function narrativeMissingRequestedBlocks(answer, userPrompt, context) {
  const a = norm(answer);
  const policy = analyzeZuzuReportRequest(userPrompt);
  if (policy.wantsWeather && goodWeatherRowsFromContext(context).length && !/\b(temperatura|maxima|mínima|minima|lluvia|viento|cielo|meteorolog|tiempo)\b/.test(a)) return true;
  if (asksMissingAttendees(userPrompt) && !/\b(no\s+asist|socios?\s+no|ausencia|faltan)\b/.test(a)) return true;
  const checks = {
    EVENTOS:/\b(descripcion|programa|celebracion|organizacion|evento)\b/,
    INGRESOS:/\b(ingresos?|cobros?|cuotas?|pagos?)\b/,
    PERSONAS:/\b(asistencia|asistentes?|socios?|personas?)\b/,
    COMPRAS:/\b(compras?|gastos?|adquisiciones?)\b/,
    DONACIONES:/\b(donaciones?|donantes?|aportaciones?\s+en\s+especie)\b/,
    TICKETS:/\b(tickets?|facturas?|justificantes?\s+de\s+compra)\b/,
    DOCUMENTOS:/\b(documentos?|autorizaciones?|solicitudes?|reintegros?|documentacion)\b/,
    HITOS:/\b(hitos?|control\s+de\s+hitos?)\b/,
    LG:/\b(lg|lgs|tareas?|lineas?\s+de\s+gestion|pendientes?\s+de\s+gestion)\b/
  };
  if (policy.broadReport || policy.detailLevel === 'detailed' || policy.detailLevel === 'exhaustive' || policy.onePage) {
    for (const moduleName of policy.modules) {
      const re = checks[moduleName];
      if (re && !re.test(a)) return true;
    }
  }
  return false;
}

function narrativeCorrectionInstruction(userPrompt, context) {
  const rows = goodWeatherRowsFromContext(context);
  const policy = analyzeZuzuReportRequest(userPrompt);
  const labels = {EVENTOS:'descripción y organización',INGRESOS:'ingresos/cobros',PERSONAS:'asistencia',COMPRAS:'compras',DONACIONES:'donaciones',TICKETS:'tickets/facturas',DOCUMENTOS:'documentos',HITOS:'hitos',LG:'tareas y líneas de gestión',METEO:'meteorología'};
  const required = policy.modules.map(m=>labels[m]).filter(Boolean);
  if (policy.wantsWeather && !required.includes('meteorología')) required.push('meteorología');
  const weather = rows.length ? ` Datos meteorológicos verificados: ${rows.map(r => `${trim(r.Día || r.Dia || spanishWeekdayFromIso(r.Fecha))} ${trim(r.Fecha)} ${trim(r.Cielo)} max ${r['Temp. máx']} min ${r['Temp. mín']} lluvia ${r['Prob. lluvia %']}% viento ${r['Viento km/h']}km/h`).join(' | ')}.` : '';
  return `\n\nREINTENTO OBLIGATORIO: la respuesta anterior quedó incompleta o redundante. Devuelve SOLO JSON válido. Cubre una sola vez: ${required.join('; ') || 'los datos pedidos'}; después una conclusión. Nombra el evento una sola vez y cada persona/pareja una sola vez. No copies tablas ni repitas cifras. No menciones SELECT, SQL, módulos, tokens o trazabilidad. Termina exactamente con «Pregúntame lo que quieras».${weather}`;
}

async function callGeminiNarrativeForLocalResult(userPrompt, localResult, context, flowTrace = []) {
  const apiKey = geminiKey();
  if (!apiKey) { zuzuTracePush(flowTrace, 'Paso 4 · Zuzu redacción humana', 'KO', 'Sin GEMINI_API_KEY para redactar informe con Zuzu.'); throw new Error('Sin GEMINI_API_KEY para redactar informe con Zuzu.'); }
  // v19: no se usa caché narrativa; el usuario ha contratado prepago y quiere que Zuzu recontextualice cada petición.
  const tone = narrativeToneFromPrompt(userPrompt);
  let lastError = null;
  for (const model of configuredGeminiModelsForTask('zuzu-narrative', { prompt: userPrompt, localResult })) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    let correction = '';
    try {
      let payload, res, outText, parsed;
      for (let attempt = 0; attempt < 2; attempt++) {
        const narrativeText = narrativePrompt(userPrompt, localResult, context) + correction;
        const body = {
          contents: [{ role: 'user', parts: [{ text: narrativeText }] }],
          generationConfig: { responseMimeType: 'application/json', responseSchema: narrativeMiniSchema(), temperature: tone.id === 'coloquial-socios' ? 0.68 : 0.22, maxOutputTokens: narrativeMaxOutputTokens(userPrompt) }
        };
        zuzuTracePush(flowTrace, 'Paso 4 · Zuzu redacción humana', 'RUN', `Modelo ${model}${attempt ? ' · reintento guiado' : ''}. Zuzu recibe prompt original + resumen cocinado por CE para redactar con tono.`);
        sizeTrace(flowTrace, 'Paso 4 · Zuzu redacción humana', attempt ? 'Contexto corregido enviado a redacción' : 'Contexto compacto enviado a redacción', narrativeText);
        ({ res, payload } = await geminiFetchJsonWithTimeout(url, body, apiKey, Number(process.env.CONTROLEVENT_ZUZU_NARRATIVE_TIMEOUT_MS || (wantsOnePageNarrative(userPrompt) ? 30000 : 22000))));
        logGeminiUsage('PASO 2 redacción humana', model, payload);
        if (!res.ok) { const e = new Error(payload?.error?.message || `Zuzu narrativa HTTP ${res.status}`); e.status = Number(res.status || 502); e.details = payload; throw e; }
        outText = trim(geminiOutText(payload));
        if (!outText) throw new Error('Zuzu narrativa no devolvió texto.');
        try { parsed = JSON.parse(stripJsonText(outText)); }
        catch (_) {
          const cleaned = cleanGeminiLooseText(outText);
          const badLoose = narrativeViolatesWeatherRequest(userPrompt, context, cleaned) || narrativeViolatesTemporalContext(userPrompt, context, cleaned) || narrativeLooksTruncated(cleaned, userPrompt) || narrativeMissingRequestedBlocks(cleaned, userPrompt, context);
          if (badLoose && attempt === 0) {
            correction = narrativeCorrectionInstruction(userPrompt, context);
            zuzuTracePush(flowTrace, 'Paso 4 · Zuzu redacción humana', 'INFO', 'Zuzu omitió una parte pedida, meteorología o dejó el texto cortado; ControlEvent reenvía a Zuzu con corrección, sin redactar localmente.');
            continue;
          }
          if (badLoose) throw new Error('Zuzu devolvió texto libre incompleto o sin cubrir todas las partes pedidas.');
          zuzuTracePush(flowTrace, 'Paso 4 · Zuzu redacción humana', 'OK', 'Zuzu redactó texto libre no JSON; CE lo presenta sin plantilla local.', { model, usage: usageSmall(payload, model) });
          return { title: trim(localResult?.title || 'Respuesta de Zuzu'), answer: sanitizeTemporalAnswerForContext(cleaned, context), warnings: ['Zuzu redactó texto libre y ControlEvent lo ha presentado sin plantilla local.'], model, usage: usageSmall(payload, model) };
        }
        const answerCandidate = trim(parsed?.answer);
        const badNarrative = narrativeViolatesWeatherRequest(userPrompt, context, answerCandidate) || narrativeViolatesTemporalContext(userPrompt, context, answerCandidate) || narrativeLooksTruncated(answerCandidate, userPrompt) || narrativeMissingRequestedBlocks(answerCandidate, userPrompt, context);
        if (badNarrative && attempt === 0) {
          correction = narrativeCorrectionInstruction(userPrompt, context);
          zuzuTracePush(flowTrace, 'Paso 4 · Zuzu redacción humana', 'INFO', 'Zuzu omitió una parte pedida, meteorología o dejó el texto cortado; ControlEvent reenvía a Zuzu con corrección, sin redactar localmente.');
          continue;
        }
        if (badNarrative) {
          throw new Error('Zuzu devolvió una respuesta narrativa incompleta o sin cubrir todas las partes pedidas.');
        }
        break;
      }
      const finalNarrative = { title: trim(parsed?.title), answer: sanitizeTemporalAnswerForContext(parsed?.answer, context), warnings: arr(parsed?.warnings).map(w => trim(w)).filter(Boolean), model, usage: usageSmall(payload, model) };
      zuzuTracePush(flowTrace, 'Paso 4 · Zuzu redacción humana', 'OK', `Zuzu redactó answer de ${trim(parsed?.answer).length} caracteres.`, { model, usage: usageSmall(payload, model) });
      return finalNarrative;
    } catch (error) {
      lastError = error;
      zuzuTracePush(flowTrace, 'Paso 4 · Zuzu redacción humana', 'KO', cleanGeminiError(error), { model });
      if (isQuotaError(error)) break;
      // FIX7: una respuesta cortada es un fallo de calidad, no un error definitivo.
      // Tras el reintento guiado del mismo modelo, se prueba el siguiente modelo antes
      // de caer a la redacción local. Así la misma pregunta no alterna entre un informe
      // excelente y una introducción genérica por un corte ocasional.
      if (isNarrativeQualityError(error)) continue;
      if (!isRetryable(error)) break;
    }
  }
  throw lastError || new Error('Zuzu narrativa no disponible.');
}
async function maybeEnrichLocalResultWithZuzu(userPrompt, context, localResult, flowTrace = []) {
  if (!shouldEnrichLocalResultWithNarrative(userPrompt, localResult)) return localResult;
  const out = { ...localResult, warnings: arr(localResult.warnings).slice() };
  try {
    const narrative = await callGeminiNarrativeForLocalResult(userPrompt, localResult, context, flowTrace);
    if (trim(narrative.answer)) {
      const ans = trim(narrative.answer);
      const tone = narrativeToneFromPrompt(userPrompt);
      const mechanical = tone.id === 'coloquial-socios' && /^he localizado\s+\d+\s+registro/i.test(ans);
      if (mechanical) throw new Error('Zuzu devolvió una redacción demasiado mecánica para el tono pedido.');
      out.title = trim(narrative.title) || out.title;
      out.answer = sanitizeTemporalAnswerForContext(ans, context);
      out.warnings = arr(out.warnings).concat(arr(narrative.warnings));
      out.provider = `${trim(out.provider || 'control-event-local')}+zuzu-sentimiento-redaccion`;
      out.model = narrative.model || 'zuzu-redaccion';
      out.__zuzuGeminiNarrative = { ok: true, model: narrative.model || 'zuzu-redaccion', usage: narrative.usage || null };
      return out;
    }
  } catch (error) {
    const fallback = fallbackNarrativeForLocalReport(userPrompt, localResult, context);
    if (fallback) {
      out.answer = sanitizeTemporalAnswerForContext(fallback, context);
      out.provider = `${trim(out.provider || 'control-event-local')}+redaccion-local`;
      out.model = 'redaccion-local-por-fallo-zuzu';
      out.showWarnings = true;
      out.warnings = out.warnings.concat(`Zuzu no pudo completar la redacción humana (${friendlyZuzuErrorMessage(error)}). ControlEvent muestra una redacción técnica local claramente etiquetada para no dejar el informe vacío.`);
      return out;
    }
    const timeoutLike = /timeout|abort|tard[oó] demasiado|504/i.test(trim(error?.message || error));
    const strict = requiresGeminiNarrativeStrict(userPrompt) && !timeoutLike;
    if (strict) {
      out.answer = `Zuzu no ha podido redactar todavía la parte humana del informe. Los datos calculados por ControlEvent quedan debajo para no perder el trabajo, pero no voy a disfrazar una plantilla local como si fuera una respuesta de Zuzu. Motivo: ${friendlyZuzuErrorMessage(error)}`;
      out.provider = `${trim(out.provider || 'control-event-local')}+zuzu-redaccion-no-disponible`;
      out.model = 'zuzu-redaccion-obligatoria-fallida';
      out.showWarnings = true;
      out.warnings = out.warnings.concat('La petición exigía tono/opinión/redacción humana. Se evita respuesta mecánica de ControlEvent para no dar una falsa impresión de inteligencia.');
      return out;
    }
    zuzuTracePush(flowTrace, 'Paso 4 · Zuzu redacción humana', 'KO', cleanGeminiError(error));
  }
  return out;
}

const ZUZU_PLAN_MODULES = ['EVENTOS','INGRESOS','COMPRAS','DONACIONES','PRODUCTOS','PERSONAS','METEO','DOCUMENTOS','TICKETS','TIENDAS','HITOS','LG','BANCO'];
function plannerModule(value) {
  const raw = trim(value).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const map = {
    RECAUDACION: 'INGRESOS', ASISTENTES: 'INGRESOS', ASISTENCIA: 'INGRESOS', ENTRADAS: 'INGRESOS', COLABORADORES: 'INGRESOS',
    DONACION: 'DONACIONES', DONACIONES_PRODUCTO: 'DONACIONES', PRODUCTO_DONADO: 'DONACIONES',
    GASTOS: 'COMPRAS', GASTOS_CORRIENTES: 'COMPRAS', PTE_COMPRA: 'COMPRAS', PENDIENTE_COMPRA: 'COMPRAS', PAGO: 'INGRESOS', PAGOS: 'INGRESOS', COBRO: 'INGRESOS', COBROS: 'INGRESOS', PAGADO: 'INGRESOS', PENDIENTE_PAGO: 'INGRESOS', PRODUCTO_DISPONIBLE: 'COMPRAS',
    PRODUCTO: 'PRODUCTOS', CATALOGO_PRODUCTOS: 'PRODUCTOS',
    SOCIOS: 'PERSONAS', SOCIO: 'PERSONAS', PERSONAS: 'PERSONAS', PERSON: 'PERSONAS', PERSONA: 'PERSONAS',
    METEOROLOGIA: 'METEO', METEREOLOGIA: 'METEO', CLIMA: 'METEO', TIEMPO: 'METEO', PREVISION: 'METEO', PRONOSTICO: 'METEO',
    TICKET: 'TICKETS', TKS: 'TICKETS', DOCUMENTO: 'DOCUMENTOS',
    HITO: 'HITOS', CONTROL_HITOS: 'HITOS', TAREA: 'LG', TAREAS: 'LG', LGS: 'LG', LINEA_GESTION: 'LG', LINEAS_GESTION: 'LG',
    BANCO: 'BANCO', CONCILIACION_BANCARIA: 'BANCO', CUADRE_BANCARIO: 'BANCO', MOVIMIENTOS_BANCARIOS: 'BANCO'
  };
  return map[raw] || raw;
}
function plannerUnique(list) {
  const out = [];
  arr(list).forEach(x => { const v = plannerModule(x); if (v && ZUZU_PLAN_MODULES.includes(v) && !out.includes(v)) out.push(v); });
  return out;
}
function splitPlannerItems(value) {
  return trim(value).replace(/[\[\]{}]/g, ' ').split(/[;,|\n]+/).flatMap(x => x.split(/\s+\/\s+/)).map(x => trim(x).replace(/^[-*•]+\s*/, '').replace(/^['"“”]+|['"“”.,;:]+$/g, '')).filter(Boolean);
}
function plannerSection(textValue, labels) {
  const raw = text(textValue);
  const names = arr(labels).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const stops = 'EVENTOS_SOLICITADOS|EVENTOS_NECESARIOS|EVENTOS|ALCANCE_EVENTOS|MODULOS_NECESARIOS|MÓDULOS_NECESARIOS|MODULOS_NO_NECESARIOS|MÓDULOS_NO_NECESARIOS|CONSULTA_GLOBAL|ALCANCE|PERSONAS_IMPLICADAS|CONDICIONES_DATOS|CONDICIONES_ACCESO|FILTROS_DATOS|FILTROS|CRITERIO_INCLUSION|CRITERIO_INCLUSIÓN|CRITERIO_EXCLUSION|CRITERIO_EXCLUSIÓN|SELECT_PRINCIPAL|SELECT_VALIDACION|SELECT_VALIDACIÓN|SELECTS_PROPUESTOS|CONSULTAS_SELECT|MOTIVO|PLANTILLAS|QUERY|SQL';
  const re = new RegExp('(?:^|\\n)\\s*(?:' + names + ')\\s*[:=]\\s*([\\s\\S]*?)(?=\\n\\s*(?:' + stops + ')\\s*[:=]|$)', 'i');
  const m = raw.match(re);
  return m ? trim(m[1]) : '';
}

function promptNeedsSemanticAgent(prompt, state = {}, conversationHistory = []) {
  const p = norm(prompt);
  if (!p) return false;
  const metaOnly = /\b(que\s+puedes\s+hacer|quien\s+eres|presentate|ayuda\s+de\s+zuzu)\b/;
  if (metaOnly.test(p)) return false;
  // La meteorología conserva su flujo especializado porque necesita una fuente externa.
  if (/\b(meteo|meteorolog|metereolog|clima|tiempo|lluvia|temperatura|viento|prevision|pronostico)\b/.test(p)) return false;
  if (v26LooksLikeConversationFollowUp(prompt, conversationHistory)) return true;
  // Intenciones operativas que no siempre llevan un verbo del diccionario clásico
  // («¿está todo justificado documentalmente?», «¿y en responsabilidades?»).
  if (/\b(justificad|documental|responsabilidades?|implicad|participad|faltan|pendientes?\s+de\s+justificar)\b/.test(p)) return true;
  const dataNouns = /\b(evento|eventos|sysa|jornada|jornadas|peña|actividad|actividades|implicacion|implicación|compra|compras|gasto|gastos|ingreso|ingresos|donacion|donaciones|producto|productos|tienda|tiendas|responsable|responsables|socio|socios|persona|personas|colaborador|colaboradores|ticket|tickets|tk\s*\d+|documento|documentos|documentacion|documentación|justificante|justificantes|hito|hitos|\blg\b|tarea|tareas|banco|conciliacion|cuadre|saldo|asistencia|asistentes|valoracion|valoración)\b/;
  const dataAsk = /\b(dame|dime|dirias|dirías|ves|busca|buscar|saca|sacar|muestra|mostrar|lista|listado|informe|resumen|total|totaliza|totalizado|sumatorio|suma|sumar|cuanto|cuantos|cuanta|cuantas|cual|cuales|quien|quienes|compara|comparas|comparar|comparativa|ranking|top|importe|valor|cantidad|unidades|realizadas|realizados|pendientes|registradas|registrados|hay|hubo|ha habido|evolucion|hablame|cuentame|informacion|analiza|analizar|explica|explicame|detalle|detallado|grafico|grafica|que tal|qué tal|como fue|cómo fue|como salio|cómo salió|como estuvo|cómo estuvo|que paso|qué pasó|que ocurrio|qué ocurrió|en que|en qué|donde|dónde|se fue|se gasto|se gastó|coste|costo|raro|anomalia|anomalía|refieres)\b/;
  if (!dataAsk.test(p)) return false;
  if (dataNouns.test(p)) return true;
  const names = [];
  arr(state?.personas).forEach(x => names.push(trim(x?.nombre)));
  arr(state?.tiendas).forEach(x => names.push(trim(x?.nombre)));
  arr(state?.productos).forEach(x => names.push(trim(x?.nombre)));
  arr(state?.eventos).forEach(x => names.push(trim(x?.titulo)));
  return names.some(name => {
    const n = norm(name);
    if (!n) return false;
    if (p.includes(n)) return true;
    const first = n.split(/\s+/)[0];
    return first.length >= 5 && new RegExp(`\\b${escapeRegexText(first)}\\b`, 'i').test(p);
  });
}

function strictScopeRequested(prompt) {
  const p = norm(prompt);
  return /\b(solo|exactos?|estricto|restringid|no\s+hagas\s+consulta\s+global|no\s+consulta\s+global|no\s+analices\s+ning[uú]n\s+otro|no\s+incluyas\s+eventos\s+parecidos|todos\s+los\s+dem[aá]s\s+eventos\s+quedan\s+prohibidos)\b/.test(p);
}
function cleanPotentialEventTitle(value) {
  return trim(value).replace(/^[-*•]+\s*/, '').replace(/^['"“”]+|['"“”.,;:]+$/g, '').replace(/\s+/g, ' ');
}
function exactEventTitlesFromPrompt(prompt, catalogEvents) {
  const events = arr(catalogEvents || []);
  const promptNorm = ` ${norm(prompt)} `;
  const out = [];
  function addByTitle(title) {
    const n = norm(title);
    const ev = events.find(e => norm(e?.titulo) === n);
    if (ev && !out.some(x => trim(x.id) === trim(ev.id))) out.push({ id: trim(ev.id), titulo: trim(ev.titulo) });
  }
  const lineRe = /^\s*\d+\s*[.)\-:]\s*([^\n\r]{2,120})/gm;
  let m;
  while ((m = lineRe.exec(text(prompt)))) addByTitle(cleanPotentialEventTitle(m[1]));
  const quoteRe = /["“”'‘’]([^"“”'‘’]{2,120})["“”'‘’]/g;
  while ((m = quoteRe.exec(text(prompt)))) addByTitle(cleanPotentialEventTitle(m[1]));
  events.forEach(ev => {
    const n = norm(ev?.titulo);
    if (!n || n.length < 3) return;
    if (promptNorm.includes(` ${n} `) && !out.some(x => trim(x.id) === trim(ev.id))) out.push({ id: trim(ev.id), titulo: trim(ev.titulo) });
  });
  return out;
}
function requestedEventCountFromPrompt(prompt) {
  const m = text(prompt).match(/\b(?:los|las)?\s*(\d{1,2})\s+(?:eventos?|ediciones?|jornadas?)\b/i);
  const n = m ? Number(m[1]) : 0;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 20) : 0;
}
function familyEventTitlesFromPrompt(prompt, catalogEvents) {
  const events = arr(catalogEvents || []);
  const quoted = [...text(prompt).matchAll(/["“”'‘’]([^"“”'‘’]{2,120})["“”'‘’]/g)].map(m => cleanPotentialEventTitle(m[1])).filter(Boolean);
  if (!quoted.length) return [];
  const requestedCount = requestedEventCountFromPrompt(prompt);
  const comparison = /\b(compara|comparar|comparativa|comparativo|frente\s+a|versus|\bvs\b)\b/.test(norm(prompt));
  if (!comparison && !requestedCount) return [];
  const out = [];
  for (const fragment of quoted) {
    const fn = norm(fragment);
    if (!fn) continue;
    // Una cita que ya es el título exacto la resuelve exactEventTitlesFromPrompt.
    if (events.some(e => norm(e?.titulo) === fn)) continue;
    const requiredWords = norm(fragment).split(/\s+/).filter(w => w.length >= 2)
      .filter(w => !['evento','eventos','edicion','ediciones','los','las','del','de'].includes(w));
    if (requiredWords.length < 2) continue;
    const matches = events
      .filter(ev => {
        const titleNorm = norm(ev?.titulo);
        if (!titleNorm) return false;
        if (titleNorm.includes(fn)) return true;
        const titleWords = new Set(norm(ev?.titulo).split(/\s+/).filter(w => w.length >= 2));
        return requiredWords.every(w => titleWords.has(w));
      })
      .map(ev => ({ id: trim(ev?.id), titulo: trim(ev?.titulo), date: parseEventDateForSort(ev?.fechaInicio || ev?.fechaIni || ev?.fecha || '') }))
      .filter(ev => ev.id && ev.titulo)
      .sort((a,b) => b.date - a.date || a.titulo.localeCompare(b.titulo, 'es', { sensitivity:'base' }));
    matches.forEach(ev => { if (!out.some(x => x.id === ev.id)) out.push(ev); });
  }
  const limit = requestedCount || Math.min(out.length, 10);
  return out.slice(0, limit).map(({id,titulo}) => ({id,titulo}));
}

function eventsFromPlannerText(raw, catalogEvents, activeEvent = null) {
  const section = plannerSection(raw, ['EVENTOS_SOLICITADOS', 'EVENTOS_NECESARIOS', 'EVENTOS']);
  const scope = plannerSection(raw, ['ALCANCE_EVENTOS', 'ALCANCE']);
  const combined = `${section}\n${scope}`;
  const out = [];
  if (/\b(EVENTO_ACTIVO|EVENTO_EN_PANTALLA|EN_PANTALLA|ACTIVO|PANTALLA)\b/i.test(combined) && activeEvent?.id) {
    out.push({ id: trim(activeEvent.id), titulo: trim(activeEvent.titulo) });
  }
  if (!section) return out;
  splitPlannerItems(section).forEach(item => {
    const clean = cleanPotentialEventTitle(item);
    if (/\b(EVENTO_ACTIVO|EVENTO_EN_PANTALLA|EN_PANTALLA|ACTIVO|PANTALLA|NINGUNO|NONE)\b/i.test(clean)) return;
    const ev = arr(catalogEvents).find(e => norm(e?.titulo) === norm(clean));
    if (ev && !out.some(x => trim(x.id) === trim(ev.id))) out.push({ id: trim(ev.id), titulo: trim(ev.titulo) });
  });
  return out;
}

function modulesFromPlannerText(raw) {
  let section = plannerSection(raw, ['MODULOS_NECESARIOS', 'MÓDULOS_NECESARIOS', 'MODULOS', 'MÓDULOS']);
  const mods = plannerUnique(splitPlannerItems(section));
  if (mods.length) return mods;
  const out = [];
  text(raw).split(/\n+/).forEach(line => {
    const m = trim(line).match(/^[-*•]?\s*([A-ZÁÉÍÓÚÑ_ ]{4,30})\s*:/i);
    if (!m) return;
    const mod = plannerModule(m[1]);
    if (ZUZU_PLAN_MODULES.includes(mod) && !out.includes(mod)) out.push(mod);
  });
  return out;
}
function plannerFiltersFromText(raw) {
  const people = splitPlannerItems(plannerSection(raw, ['PERSONAS_IMPLICADAS', 'PERSONAS_AFECTADAS'])).filter(x => !/^(NINGUNA|NINGUNO|NO|TODOS|TODAS|PERSONAS)$/i.test(x));
  const conditions = [plannerSection(raw, ['CONDICIONES_DATOS', 'CONDICIONES_ACCESO', 'FILTROS_DATOS', 'FILTROS']), plannerSection(raw, ['CRITERIO_INCLUSION', 'CRITERIO_INCLUSIÓN']), plannerSection(raw, ['CRITERIO_EXCLUSION', 'CRITERIO_EXCLUSIÓN'])].map(trim).filter(Boolean).join(' | ');
  const filters = { personas: [], productos: [], tiendas: [], responsables: [], donantes: [], tickets: [], segmentos: [], destinos: [], rangos: [], anios: [], estado: [] };
  if (people.length) {
    filters.personas = people.slice();
    filters.responsables = people.slice();
    filters.donantes = people.slice();
  }
  const yrs = conditions.match(/20\d{2}/g) || [];
  if (yrs.length) filters.anios = [...new Set(yrs)];
  if (/\bNO\s+SOCIO\b/i.test(conditions)) filters.rangos.push('NO SOCIO');
  else if (/\bSOCIO\b/i.test(conditions)) filters.rangos.push('SOCIO');
  return { filters, conditions };
}
function plannerGlobalFlag(raw, prompt) {
  const sec = plannerSection(raw, ['CONSULTA_GLOBAL', 'ALCANCE']);
  const v = norm(sec);
  if (strictScopeRequested(prompt)) return false;
  if (/\b(si|sí|true|global|todos)\b/.test(v)) return true;
  if (/\b(no|false|restring|cerrad|solo)\b/.test(v)) return false;
  return false;
}
function inferPlannerModulesFromPrompt(prompt, localModules = []) {
  const policy = analyzeZuzuReportRequest(prompt);
  const p = norm(prompt);
  const mods = new Set(arr(policy.modules).map(plannerModule).filter(Boolean));
  if (/\b(pagad[oa]s?|pagos?|pagar|pendient(?:e|es)\s+de\s+pago|quien\s+ha\s+pagado|quién\s+ha\s+pagado|falta\s+por\s+pagar)\b/.test(p)) ['EVENTOS','INGRESOS','PERSONAS'].forEach(m => mods.add(m));
  if (/producto\s+disponible|compras?\s+realiz|compras?\s+pend|donaciones?\s+de\s+producto|comparativa/.test(p)) ['EVENTOS','COMPRAS','DONACIONES','PRODUCTOS','TIENDAS'].forEach(m => mods.add(m));
  if (/socio|socios|asistent|no\s+asistent|colaborador/.test(p)) ['EVENTOS','INGRESOS','PERSONAS'].forEach(m => mods.add(m));
  if (/meteo|meteorolog|metereolog|clima|tiempo|lluvia|temperatura|viento|previsi|pronost/.test(p)) ['EVENTOS','METEO'].forEach(m => mods.add(m));
  if (/\b(conciliaci[oó]n|cuadre\s+bancario|movimientos?\s+bancarios?|saldo\s+bancario|abonos?\s+bancarios?)\b/.test(p)) ['EVENTOS','COMPRAS','BANCO'].forEach(m => mods.add(m));
  if (/\b(hito|hitos|control\s+de\s+hitos|control\s+de\s+tareas)\b/.test(p)) ['EVENTOS','HITOS','LG'].forEach(m => mods.add(m));
  if (/\b(lg|lgs|lineas?\s+de\s+gestion|lineas?\s+gestion|tarea|tareas|dependencias?\s+previas?|dependencias?\s+posteriores?)\b/.test(p)) ['EVENTOS','HITOS','LG'].forEach(m => mods.add(m));
  if (!mods.size) arr(localModules).map(plannerModule).filter(Boolean).forEach(m => mods.add(m));
  if (!mods.size) mods.add('EVENTOS');
  return plannerUnique([...mods]);
}

function ensurePlannerDependencies(modules, prompt) {
  const mods = new Set(plannerUnique(modules));
  const p = norm(prompt);
  if (mods.has('COMPRAS') || mods.has('DONACIONES') || /producto\s+disponible/.test(p)) { mods.add('EVENTOS'); mods.add('PRODUCTOS'); }
  if (mods.has('PERSONAS') || /socio|asistent/.test(p)) { mods.add('INGRESOS'); mods.add('PERSONAS'); mods.add('EVENTOS'); }
  if (mods.has('METEO') || /meteo|meteorolog|metereolog|clima|tiempo|lluvia|temperatura|viento|previsi|pronost/.test(p)) { mods.add('EVENTOS'); mods.add('METEO'); }
  if (mods.has('BANCO') || /\b(conciliaci[oó]n|cuadre\s+bancario|movimientos?\s+bancarios?|saldo\s+bancario)\b/.test(p)) { mods.add('EVENTOS'); mods.add('COMPRAS'); mods.add('BANCO'); }
  if (mods.has('HITOS') || mods.has('LG') || /\b(hito|hitos|lg|lgs|tarea|tareas|lineas?\s+de\s+gestion|dependencias?)\b/.test(p)) { mods.add('EVENTOS'); mods.add('HITOS'); mods.add('LG'); }
  return plannerUnique([...mods]);
}
function queryTemplatesForPlan(modules, prompt) {
  const mods = new Set(plannerUnique(modules));
  const p = norm(prompt);
  const out = [];
  if (mods.has('COMPRAS') || mods.has('DONACIONES') || /producto\s+disponible/.test(p)) out.push('producto_disponible_por_evento', 'compras_realizadas_pendientes_por_evento', 'donaciones_producto_por_evento');
  if (mods.has('INGRESOS') || mods.has('PERSONAS') || /socio|asistent/.test(p)) out.push('asistencia_socios_canonica');
  if (mods.has('METEO') || /meteo|meteorolog|metereolog|clima|tiempo|lluvia|temperatura|viento|previsi|pronost/.test(p)) out.push('meteorologia_por_fechas_evento');
  if (mods.has('BANCO')) out.push('conciliacion_bancaria_por_evento');
  if (mods.has('HITOS') || mods.has('LG')) out.push('control_hitos_y_lg_por_evento');
  if (mods.has('EVENTOS')) out.push('eventos_objetivo');
  return [...new Set(out)];
}

function plannerDatabaseSchemaText() {
  return `TABLAS_REALES_SUPABASE_Y_CAMPOS:
- ce_eventos(id, titulo, precio, fecha_ini, fecha_fin, situacion, descripcion, created_at, updated_at)
- ce_colaboradores(id, event_id, persona_id, numero, situacion, importe, created_at, updated_at)
- ce_event_person_snapshots(event_id, persona_id, nombre_snapshot, rango_snapshot, captured_at, updated_at)
- ce_personas(id, nombre, rango, created_at, updated_at)
- ce_compras(id, event_id, producto_id, unidades, precio, ticket_donacion, donor_ref, responsable_id, tienda_id, created_at, updated_at)
- ce_productos(id, nombre, segmento, destino, default_precio, default_tienda_id, created_at, updated_at)
- ce_tiendas(id, nombre, created_at, updated_at)
- ce_ticket_images(image_key, event_id, label, storage_path, public_url, pathname, content_type, size_bytes, created_at, updated_at)
- ce_meta(key, value, updated_at) [metadatos JSONB de estructuras sin tabla propia, entre ellas documentos del evento]
- ce_hitos(id, event_id, nombre_hito, descripcion, fecha_minima, fecha_maxima, responsable_id, responsable_nombre, orden, created_at, updated_at)
- ce_lg(id, event_id, hito_id, descripcion, fecha_minima, fecha_maxima, notas, dependencia_tipo, dependencias_previas, dependencias_posteriores, responsable_id, responsable_nombre, cumplida, cumplida_at, orden, created_at, updated_at)
- ce_bank_import_batches(id, source_filename, account_id, account_label, date_from, date_to, parsed_count, inserted_count, duplicate_count, warning_count, imported_by, imported_at)
- ce_bank_movements(id, account_id, account_label, executed_at, value_date, description, amount, bank_balance, included, source_filename, source_hash, import_batch_id, created_by, created_at, updated_at)
- ce_bank_ticket_links(id, movement_id, event_id, ticket_code, ticket_amount_snapshot, forced_square, created_by, created_at)
- ce_bank_income_links(id, movement_id, event_id, income_id, income_amount_snapshot, created_by, created_at)
- ce_bank_event_settings(event_id, date_from, date_to, updated_by, updated_at)
- ce_bank_event_movement_state(event_id, movement_id, included, updated_by, created_at, updated_at)
- ce_users(identificacion, nombre, clave, nivel, created_at, updated_at) [NO consultar clave]

MAPEO_DE_DOMINIO:
- EVENTOS = ce_eventos.
- INGRESOS = ce_colaboradores JOIN ce_event_person_snapshots por event_id + persona_id para recuperar nombre/rango históricos; ce_personas se usa solo como catálogo actual. JOIN ce_eventos ON ce_colaboradores.event_id = ce_eventos.id.
- COMPRAS = ce_compras con ticket_donacion que NO empieza por DONADO. Incluye compras realizadas y compras pendientes.
- COMPRAS realizadas = ce_compras donde ticket_donacion NO sea DONADO ... y NO sea Pte. Compra/PENDIENTE.
- COMPRAS pendientes / previstas = ce_compras donde ticket_donacion contenga Pte. Compra o PENDIENTE.
- DONACIONES = ce_compras donde ticket_donacion sea DONADO SOCIO, DONADO TIENDA o DONADO OTROS.
- PERSONAS = ce_personas.
- PRODUCTOS = ce_productos.
- TIENDAS = ce_tiendas.
- TICKETS = ce_ticket_images y ce_compras.ticket_donacion.
- DOCUMENTOS = metadatos en ce_meta (eventDocuments/eventDocumentMeta) + imagen/evidencia en ce_ticket_images.
- HITOS = ce_hitos, enlazados al evento por event_id.
- LG = ce_lg, enlazadas a su Hito por hito_id y al evento por event_id. Son las tareas o Líneas de Gestión.
- CONCILIACION_BANCARIA = ce_bank_movements + ce_bank_ticket_links + ce_bank_income_links + ce_bank_event_settings + ce_bank_event_movement_state. Los lotes CSV están en ce_bank_import_batches.

SEMANTICA_CONTROL_EVENT:
- ce_bank_event_settings define el período bancario inclusivo de cada evento.
- ce_bank_event_movement_state.included es la decisión «En saldo» específica del evento y prevalece sobre ce_bank_movements.included.
- ce_bank_ticket_links enlaza exclusivamente TKxx del evento con movimientos bancarios. forced_square=true significa cuadre aceptado manualmente y cuenta como justificado igual que un cuadre exacto.
- ce_bank_movements.amount > 0 es un abono/entrada. Se justifica con registros bancarios de ce_colaboradores; la asociación manual corregida se guarda en ce_bank_income_links y prevalece sobre la asociación automática por importe, nombre y fecha.
- Para saber si todos los TKxx están conciliados, compara los TKxx contables de ce_compras del evento con ce_bank_ticket_links del mismo event_id.
- El saldo inicial del evento es saldo_banco del movimiento más antiguo menos su importe; el saldo final calculado aplica cronológicamente solo movimientos En saldo.

- ce_colaboradores.numero = número de personas asociadas al colaborador. En parejas normalmente 2; en exentos puede ser 0.
- Las fechas fecha_minima/fecha_maxima de ce_hitos son calculadas desde sus LG. Para el detalle operativo usa ce_lg.
- ce_lg.cumplida=true significa tarea cumplida. responsable_nombre es el texto humano; responsable_id enlaza con ce_personas.
- ce_lg.dependencias_previas y dependencias_posteriores son JSONB con referencias {tipo:'LG'|'HITO', id:'...'}. Para secuencia operativa, las previas son la fuente canónica; las posteriores se derivan de ellas.
- ce_eventos.precio = cuota obligatoria por persona.
- Importe obligatorio de una colaboración = ce_colaboradores.numero * ce_eventos.precio. NO uses ce_colaboradores.importe para esto.
- ce_colaboradores.importe = importe voluntario/aportación adicional cuando exista.
- Pago de cuota obligatoria confirmado = situacion en BANCO, EFECTIVO o BIZUM Y numero * precio > 0.
- Pago voluntario confirmado = situacion en BANCO, EFECTIVO o BIZUM Y importe > 0.
- Numero=0 NO confirma asistencia por sí solo. Solo cuenta como asistente si situacion confirma BANCO/EFECTIVO/BIZUM/EXENTO/INVITADO/CONFIRMADO/ASISTE/SI/PAGADO. PENDIENTE o vacío no cuenta.
- Pendiente = situacion PENDIENTE. No lo mezcles con pagado.
- En SQL, normaliza SIEMPRE textos de estado con UPPER(TRIM(campo)). Ejemplo: UPPER(TRIM(c.situacion)) IN ('BANCO','EFECTIVO','BIZUM'). Los datos reales pueden venir como Banco/Pendiente y una comparación literal en mayúsculas puede devolver NULL/0 por error.
- Para nombres humanos (tienda, producto, persona), no uses igualdad literal frágil. Normaliza con UPPER(TRANSLATE(TRIM(COALESCE(campo,'')), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNAEIOUUN')). Por ejemplo ALMACEN, almacén y El Almacén deben poder resolverse por el mismo concepto mediante LIKE '%ALMACEN%' o usando el nombre candidato real del catálogo.
- En agregados SUM/COUNT, usa COALESCE para evitar filas vacías: COALESCE(SUM(...),0) AS importe_total. Si una métrica puede salir NULL, no es válida para un informe ejecutivo.
- En ce_compras, el valor económico de línea es unidades * precio, salvo que preguntes solo precio unitario.
- ticket_donacion = 'Pte. Compra' o similar significa compra prevista/provisional, no ausencia de compra.
- Si el usuario dice que consideres eventos En curso como finalizados/provisionales, INCLUYE Pte. Compra y PENDIENTE en el análisis, indicando que son provisionales.
- Si el usuario pide compras realizadas/cerradas, EXCLUYE Pte. Compra y PENDIENTE.
- Si el usuario pide artículos/productos más consumidos/utilizados, normalmente agrupa por ce_productos.nombre y suma ce_compras.unidades. Si no limita a compras realizadas, incluye compras pendientes y donaciones cuando el contexto diga producto disponible/consumo previsto.
- Si el usuario pide eventos del año 2026, incluye eventos cuya fecha_ini o fecha_fin caiga en 2026. No exijas que ambas fechas estén dentro del año salvo que el usuario lo diga.
- Si una SELECT de ranking o consumo devuelve 0 filas, revisa si has excluido indebidamente Pte. Compra, PENDIENTE o DONADO frente a lo pedido.

REGLAS_PARA_SELECTS_PROPUESTOS:
- Cuando la pregunta requiera datos, intenta devolver SELECTS_PROPUESTOS usando SOLO las tablas/campos reales anteriores.
- Usa SELECT puro. Prohibido INSERT, UPDATE, DELETE, DROP, ALTER, CREATE, TRUNCATE, DO, EXEC, COPY, GRANT, REVOKE.
- Para evento en pantalla usa el id literal del EVENTO_EN_PANTALLA si está disponible.
- Devuelve SELECTs en formato humano: usa JOIN y alias claros en castellano: evento, colaborador_nombre, producto_nombre, tienda_nombre, donante_nombre, responsable_nombre, unidades_total, importe_total.
- Evita devolver id/persona_id/event_id/producto_id/tienda_id/donor_ref si no son imprescindibles.
- Para donor_ref, resuelve P: con ce_personas y T: con ce_tiendas, devolviendo el nombre del donante, no el código.
- En consultas analíticas, usa SELECT_PRINCIPAL agregado y, si procede, SELECT_VALIDACION para comprobar que hay filas base.
- Evita SELECTs duplicadas: no repitas el mismo SELECT como SELECT_PRINCIPAL y SELECTS_PROPUESTOS.
- Si la pregunta pide ranking/informe ejecutivo, devuelve SELECTs agregadas por entidad solicitada: ingresos por colaborador, donaciones por donante/responsable, compras por tienda/responsable, además de totales.
- Devuelve CRITERIO_INCLUSION y CRITERIO_EXCLUSION explicando qué entra y qué queda fuera según el prompt.
- Incluye LIMIT razonable si pides detalle amplio.`;
}
function cleanPlannerSqlText(value) {
  return trim(value)
    .replace(/^```(?:sql)?/i, '')
    .replace(/```$/i, '')
    .replace(/[\u0000-\u001f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function sqlLooksSyntacticallyComplete(s0) {
  const q = String(s0 || '');
  let par = 0;
  let inStr = false;
  for (let i = 0; i < q.length; i += 1) {
    const ch = q[i];
    if (ch === "'") {
      if (inStr && q[i + 1] === "'") { i += 1; continue; }
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (ch === '(') par += 1;
    if (ch === ')') par -= 1;
    if (par < 0) return { ok: false, reason: 'paréntesis desbalanceado' };
  }
  if (inStr) return { ok: false, reason: 'comillas sin cerrar' };
  if (par !== 0) return { ok: false, reason: 'paréntesis sin cerrar' };
  const tail = q.replace(/;\s*$/,'').trim();
  if (/[.,=+\-*\/<>]$/.test(tail)) return { ok: false, reason: 'SELECT incompleta al final' };
  if (/\b(AND|OR|WHERE|JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|INNER\s+JOIN|ON|IN|LIKE|NOT|GROUP\s+BY|ORDER\s+BY|HAVING|AS|FROM|SELECT|UNION\s+ALL|UNION)\s*$/i.test(tail)) return { ok: false, reason: 'SELECT truncada por palabra clave final' };
  if (/\b(MODULOS_NECESARIOS|MOTIVO|MODELO|TOKENS|CRITERIO_INCLUSION|CRITERIO_EXCLUSION|SELECTS_PROPUESTOS)\s*:/i.test(tail)) return { ok: false, reason: 'mezcla texto no SQL' };
  return { ok: true };
}
function isSafePlannerSelect(sql) {
  const s0 = cleanPlannerSqlText(sql).replace(/;\s*$/, '').trim();
  if (!s0 || /^(NINGUNO|NINGUNA|NO|NONE)$/i.test(s0)) return { ok: false, reason: 'vacío/NINGUNO' };
  if (!/^SELECT\b/i.test(s0)) return { ok: false, reason: 'no empieza por SELECT' };
  if (/;\s*\S/.test(cleanPlannerSqlText(sql))) return { ok: false, reason: 'contiene varias sentencias' };
  if (/--|\/\*|\*\/|#/i.test(s0)) return { ok: false, reason: 'contiene comentarios' };
  if (/\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|MERGE|UPSERT|CALL|EXEC|EXECUTE|DO|COPY|GRANT|REVOKE|VACUUM|ANALYZE|REFRESH)\b/i.test(s0)) return { ok: false, reason: 'contiene verbo no permitido' };
  if (/\b(AUTH|STORAGE|VAULT|SECRET|SECRETS|PG_|INFORMATION_SCHEMA|HTTP|NET|EXTENSION)\b/i.test(s0)) return { ok: false, reason: 'referencia a esquema/función no permitido' };
  if (s0.length > 2600) return { ok: false, reason: 'SELECT demasiado largo' };
  const complete = sqlLooksSyntacticallyComplete(s0);
  if (!complete.ok) return complete;
  return { ok: true, sql: s0 };
}
function splitPlannerSelects(section) {
  const raw = trim(section);
  if (!raw || /^(NINGUNO|NINGUNA|NO|NONE)$/i.test(raw)) return [];
  const lines = raw.replace(/```(?:sql)?/gi, '').replace(/```/g, '').split(/\n+/).map(trim).filter(Boolean);
  const candidates = [];
  if (lines.filter(x => /^SELECT\b/i.test(x)).length > 1) candidates.push(...lines.filter(x => /^SELECT\b/i.test(x)));
  else candidates.push(...raw.split(/;(?=\s*SELECT\b|\s*$)/i).map(trim).filter(Boolean));
  return candidates;
}
function sqlDedupeKey(sql) {
  return cleanPlannerSqlText(sql).replace(/;\s*$/,'').replace(/\s+/g,' ').trim().toUpperCase();
}
function plannerSelectsFromText(raw) {
  const section = [plannerSection(raw, ['SELECT_PRINCIPAL']), plannerSection(raw, ['SELECT_VALIDACION', 'SELECT_VALIDACIÓN']), plannerSection(raw, ['SELECTS_PROPUESTOS', 'CONSULTAS_SELECT', 'SQL_SELECTS', 'SELECTS'])].map(trim).filter(Boolean).join('; ');
  const out = [];
  const rejected = [];
  const seen = new Set();
  splitPlannerSelects(section).forEach(candidate => {
    const safe = isSafePlannerSelect(candidate);
    if (safe.ok) {
      const key = sqlDedupeKey(safe.sql);
      if (!seen.has(key)) { seen.add(key); out.push(safe.sql); }
    } else if (trim(candidate) && !/^(NINGUNO|NINGUNA|NO|NONE)$/i.test(trim(candidate))) {
      rejected.push({ sql: trim(candidate).slice(0, 300), motivo: safe.reason });
    }
  });
  return { selects: out.slice(0, 5), rejected };
}

function normalizeSqlIdCode(value) {
  return text(value)
    .replace(/id[\uFFFE\uFFFF\x00-\x1F]+([A-Za-z0-9])/g, 'id-$1')
    .replace(/[\uFFFE\uFFFF\x00-\x1F]+/g, '')
    .trim();
}
function normalizeLookupKey(value) {
  return normalizeSqlIdCode(value).replace(/^['"]|['"]$/g, '').trim();
}
function collectSqlHumanLookups(executed = []) {
  const lookups = { personas: {}, tiendas: {}, productos: {}, eventos: {} };
  arr(executed).forEach(item => arr(item.rows).forEach(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return;
    const id = normalizeLookupKey(row.id || row.ID || row.persona_id || row.personaId || row.tienda_id || row.producto_id || row.event_id || '');
    if (!id) return;
    const nombre = trim(row.nombre || row.Nombre || row.persona_nombre || row.colaborador_nombre || row.donante_nombre || row.responsable_nombre || '');
    const titulo = trim(row.titulo || row.Titulo || row.evento || row.Evento || '');
    const tienda = trim(row.tienda_nombre || row.tienda || '');
    const producto = trim(row.producto_nombre || row.producto || '');
    const rango = trim(row.rango || row.Rango || '');
    if (nombre && (rango || /persona|colaborador|donante|responsable/i.test(Object.keys(row).join(' ')))) lookups.personas[id] = nombre;
    if (nombre && !lookups.personas[id] && Object.keys(row).some(k => /persona|colaborador|donante|responsable/i.test(k))) lookups.personas[id] = nombre;
    if (titulo) lookups.eventos[id] = titulo;
    if (tienda) lookups.tiendas[id] = tienda;
    if (producto) lookups.productos[id] = producto;
  }));
  return lookups;
}
function humanNameFromSqlRef(value, lookups = {}) {
  const s = normalizeSqlIdCode(value);
  if (!s) return '';
  const m = s.match(/^(P|PERSONA|PERSONAS|T|TIENDA|TIENDAS|PRODUCTO|EVENTO)\s*:\s*(.+)$/i);
  const kind = m ? m[1].toUpperCase() : '';
  const id = normalizeLookupKey(m ? m[2] : s);
  if (!id) return '';
  if (/^P/.test(kind) && lookups.personas?.[id]) return lookups.personas[id];
  if (/^T/.test(kind) && lookups.tiendas?.[id]) return lookups.tiendas[id];
  if (/PRODUCTO/.test(kind) && lookups.productos?.[id]) return lookups.productos[id];
  if (/EVENTO/.test(kind) && lookups.eventos?.[id]) return lookups.eventos[id];
  return lookups.personas?.[id] || lookups.tiendas?.[id] || lookups.productos?.[id] || lookups.eventos?.[id] || '';
}
function humanSqlColumnName(key) {
  const k = trim(key);
  const n = norm(k);
  const map = {
    COLABORADOR_NOMBRE: 'Colaborador', RESPONSABLE_NOMBRE: 'Responsable', DONANTE_NOMBRE: 'Donante', PERSONA_NOMBRE: 'Persona',
    PRODUCTO_NOMBRE: 'Producto', TIENDA_NOMBRE: 'Tienda', EVENTO_NOMBRE: 'Evento', TITULO: 'Evento', NOMBRE: 'Nombre',
    FECHA_INI: 'Fecha inicio', FECHA_INICIO: 'Fecha inicio', FECHA_FIN: 'Fecha fin', SITUACION: 'Situación', ESTADO: 'Estado',
    DESCRIPCION: 'Descripción', NUMERO: 'Número', IMPORTE: 'Importe', PRECIO: 'Precio', UNIDADES: 'Unidades',
    TICKET_DONACION: 'Tipo / ticket / estado', JUSTIFICANTE: 'Justificante', RANGO: 'Rango', DONOR_REF: 'Donante'
  };
  if (map[n]) return map[n];
  return k.replace(/_/g, ' ').replace(/\b\w/g, ch => ch.toUpperCase());
}
function isInternalSqlCodeColumn(key) {
  const n = norm(key);
  return n === 'ID' || /^__/.test(trim(key)) || /(^|_)ID$/.test(n) || /ID$/.test(n) || /REF$/.test(n);
}
function humanizeSqlRowForDisplay(row, lookups = {}, selectIndex = '') {
  const out = {};
  if (selectIndex) out.Consulta = `SELECT #${selectIndex}`;
  if (!row || typeof row !== 'object' || Array.isArray(row)) return out;
  Object.entries(row).forEach(([key, value]) => {
    const n = norm(key);
    if (/^__/.test(key)) return;
    if (n === 'DONOR_REF') {
      const name = humanNameFromSqlRef(value, lookups);
      if (name) out.Donante = name;
      return;
    }
    if (isInternalSqlCodeColumn(key)) return;
    let val = value;
    if (typeof val === 'string') {
      const resolved = humanNameFromSqlRef(val, lookups);
      val = resolved || normalizeSqlIdCode(val);
      // No sacar códigos internos largos si no se han podido resolver.
      if (/^(?:P|T)\s*:\s*id[-A-Za-z0-9]+$/i.test(val) || /^id[-A-Za-z0-9]{8,}$/i.test(val)) return;
    }
    const label = humanSqlColumnName(key);
    if (out[label] === undefined) out[label] = val;
    else out[`${label} (${key})`] = val;
  });
  return out;
}
function humanizeExecutedSqlRows(executed = []) {
  const lookups = collectSqlHumanLookups(executed);
  arr(executed).forEach(item => {
    const displayRows = arr(item.rows).map(row => humanizeSqlRowForDisplay(row, lookups, item.indice)).filter(row => Object.keys(row).length);
    item.rows = displayRows;
    item.humanized = true;
  });
  return executed;
}
function rowsToTableRows(rows, max = 100) {
  const list = arr(rows).slice(0, max);
  const cols = [];
  list.forEach(row => {
    if (row && typeof row === 'object' && !Array.isArray(row)) Object.keys(row).forEach(k => { if (!cols.includes(k)) cols.push(k); });
  });
  return { columns: cols.slice(0, 24), rows: list.map(row => cols.slice(0, 24).map(c => text(row?.[c]))) };
}
function sqlResultHasNullMetric(rows = []) {
  return arr(rows).some(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const keys = Object.keys(row);
    const metricKeys = keys.filter(k => /(^|_|\b)(total|importe|valor|saldo|unidades|cantidad|count|sum|media|promedio)(_|\b|$)/i.test(k));
    const hasLabel = keys.some(k => /(tipo|movimiento|nombre|producto|evento|colaborador|donante|responsable|tienda|label)/i.test(k) && trim(row[k]));
    return hasLabel && metricKeys.some(k => row[k] === null || row[k] === undefined || trim(row[k]) === '');
  });
}
function sqlResultLooksAggregate(rows = []) {
  const first = arr(rows).find(r => r && typeof r === 'object' && !Array.isArray(r));
  if (!first) return false;
  const keys = Object.keys(first).join(' ');
  return /(total|importe|valor|saldo|unidades|cantidad|count|sum|media|promedio)/i.test(keys) && /(nombre|producto|evento|colaborador|donante|responsable|tienda|tipo|movimiento|label)/i.test(keys);
}
function sqlSelectLooksUnsafeFactJoin(sql = '') {
  const q = text(sql).toUpperCase();
  const hasAggregate = /\b(SUM|COUNT|AVG|MIN|MAX)\s*\(/.test(q);
  const factTables = ['CE_COLABORADORES','CE_COMPRAS','CE_DONACIONES'].filter(t => new RegExp(`\\b${t}\\b`).test(q));
  if (!hasAggregate || factTables.length < 2) return false;
  // Un JOIN directo entre dos tablas de hechos multiplica filas (N x M) y falsea importes.
  // Solo se admite cuando cada tabla aparece previamente agregada en una CTE/subconsulta.
  const hasPreAggregation = /\bWITH\b[\s\S]{0,5000}\bGROUP\s+BY\b/.test(q)
    || /\(\s*SELECT[\s\S]{0,2500}\bGROUP\s+BY\b[\s\S]{0,800}\)\s*(AS\s+)?[A-Z_][A-Z0-9_]*/.test(q);
  return !hasPreAggregation;
}
function allSqlRowsEmpty(executed = []) {
  const ok = arr(executed).filter(x => x && x.ok);
  return ok.length > 0 && ok.every(x => (Number(x.rowCount) || arr(x.rows).length || 0) === 0);
}

async function executeZuzuSqlSelects(context, flowTrace = []) {
  const selects = arr(context?.planZuzu?.selectsPropuestos).map(trim).filter(Boolean);
  if (!selects.length) return context;
  const executed = [];
  let client = null;
  try { client = getSupabaseAdmin(); }
  catch (error) {
    zuzuTracePush(flowTrace, 'Paso 2s · SELECT SQL Zuzu', 'KO', `No se puede ejecutar SELECT porque falta conexión Supabase admin: ${trim(error?.message || error)}`);
    context.sqlSelectsEjecutados = { ok: false, error: trim(error?.message || error), selects };
    return context;
  }
  zuzuTracePush(flowTrace, 'Paso 2s · SELECT SQL Zuzu', 'RUN', `Ejecutando ${selects.length} SELECT(s) propuesto(s) por Zuzu mediante RPC ce_zuzu_select. Solo lectura.`);
  for (let i = 0; i < selects.length; i += 1) {
    const sql = selects[i];
    try {
      const { data, error } = await client.rpc('ce_zuzu_select', { p_sql: sql, p_max_rows: 300 });
      if (error) throw error;
      const payload = data && typeof data === 'object' ? data : { ok: true, rows: data };
      const rows = arr(payload.rows || payload.data || payload.resultados);
      const nullMetric = payload.ok !== false && sqlResultHasNullMetric(rows);
      const unsafeFactJoin = payload.ok !== false && sqlSelectLooksUnsafeFactJoin(sql);
      const suspect = nullMetric || unsafeFactJoin;
      const suspectReason = unsafeFactJoin
        ? 'Agregación sobre varias tablas de hechos unidas directamente; riesgo de multiplicación cartesiana de importes.'
        : (nullMetric ? 'Métrica agregada nula/vacía en filas con etiqueta; posible filtro de estado mal normalizado o SELECT incompleta.' : '');
      executed.push({ indice: i + 1, ok: payload.ok !== false, sql, rows, rowCount: Number(payload.row_count ?? payload.rowCount ?? rows.length) || rows.length, truncated: payload.truncated === true, error: trim(payload.error || ''), suspect, suspectReason });
      zuzuTracePush(flowTrace, 'Paso 2s · SELECT SQL Zuzu', payload.ok === false ? 'KO' : (suspect ? 'INFO' : 'OK'), `SELECT #${i + 1}: ${payload.ok === false ? trim(payload.error || 'KO') : `${rows.length} fila(s) devuelta(s)${suspect ? ` · descartada para totales: ${suspectReason}` : ''}`}.`);
    } catch (error) {
      executed.push({ indice: i + 1, ok: false, sql, rows: [], rowCount: 0, error: trim(error?.message || error) });
      zuzuTracePush(flowTrace, 'Paso 2s · SELECT SQL Zuzu', 'KO', `SELECT #${i + 1} no ejecutado: ${trim(error?.message || error)}`);
    }
  }
  humanizeExecutedSqlRows(executed);
  context.sqlSelectsEjecutados = { ok: executed.some(x => x.ok), executed };
  const flat = [];
  executed.filter(item => item.ok && !item.suspect).forEach(item => arr(item.rows).slice(0, 300).forEach((row, idx) => flat.push({ Consulta: `Comprobación interna ${item.indice}`, Fila: idx + 1, ...row })));
  if (flat.length) {
    context.modulosExtraidos = { ...(context.modulosExtraidos || {}), SELECTS_SQL_ZUZU: flat };
    context.totalesRegistrosPorModulo = { ...(context.totalesRegistrosPorModulo || {}), SELECTS_SQL_ZUZU: flat.length };
  }
  context.planZuzu = { ...(context.planZuzu || {}), modoExtraccion: 'EJECUCION_REAL_SELECTS_PROPUESTOS_ZUZU', selectsEjecutados: executed.map(x => ({ indice: x.indice, ok: x.ok, filas: x.rowCount, error: x.error || '', sospechoso: x.suspect === true, motivoSospecha: x.suspectReason || '', sql: x.sql })) };
  context.instruccionesFuncionalesZuzu = arr(context.instruccionesFuncionalesZuzu).concat({ id: 'V22-SQL-REAL', regla: 'Las consultas SQL son una comprobación interna de solo lectura. Para importes, saldos y comparativas prevalecen siempre metricasCanonicas y los módulos oficiales de ControlEvent. No menciones SELECT, SQL, RPC, tokens ni trazabilidad en una respuesta normal; solo muéstralos si el usuario pide expresamente una vista técnica.' });
  return context;
}
function explicitTechnicalSqlRequest(prompt) {
  const p = norm(prompt);
  return /\b(sql|select|consulta\s+sql|resultado\s+crudo|sentencia|query\s+tecnica|query\s+t[eé]cnica)\b/.test(p)
    && /\b(muestra|ensena|enseña|ver|detalle|literal|crudo|tecnic|t[eé]cnic|audita|auditor[ií]a)\b/.test(p);
}
function directSqlSelectResultIfApplicable(prompt, context) {
  // FIX5: las SELECT son una herramienta interna. Solo se enseñan cuando el usuario
  // pide expresamente una salida técnica SQL; en cualquier informe normal se usan
  // como comprobación y la presentación final sale de las métricas oficiales de CE.
  if (!explicitTechnicalSqlRequest(prompt)) return null;
  const executed = arr(context?.sqlSelectsEjecutados?.executed).filter(x => x && x.ok);
  if (!executed.length) return null;
  const totalSqlRows = executed.reduce((a, x) => a + (Number(x?.rowCount) || arr(x?.rows).length || 0), 0);
  const totals = context?.totalesRegistrosPorModulo || {};
  const officialRows = Object.entries(totals).filter(([k]) => k !== 'SELECTS_SQL_ZUZU').reduce((a, [,v]) => a + (Number(v) || 0), 0);
  if (totalSqlRows === 0) {
    context.advertencias = arr(context.advertencias).concat('Las SELECTs propuestas por Zuzu devolvieron 0 filas. No se usará esa salida SQL para concluir que no hay datos; se intenta cálculo local/plantillas si hay módulos oficiales disponibles.');
    return null;
  }
  if (executed.some(x => x.suspect)) {
    context.advertencias = arr(context.advertencias).concat('Una o más SELECTs de Zuzu devuelven métricas nulas/vacías en filas con etiqueta. Se considera SQL sospechosa y se prioriza cálculo local/plantillas para evitar conclusiones falsas.');
    return null;
  }
  const tables = [];
  const files = [];
  executed.forEach(item => {
    const { columns, rows } = rowsToTableRows(item.rows, 300);
    if (columns.length) {
      tables.push({ title: `Resultado SELECT Zuzu #${item.indice} (${item.rowCount} fila(s))`, columns, rows });
      files.push({ filename: fileSafe(`ZUZU_SELECT_${item.indice}_v27_prod_1.2.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, arr(item.rows).map(r => Object.fromEntries(columns.map(c => [c, r?.[c]])))) });
    } else {
      tables.push({ title: `Resultado SELECT Zuzu #${item.indice}`, columns: ['SQL','Filas','Estado'], rows: [[item.sql, String(item.rowCount || 0), 'Sin filas']] });
    }
  });
  return {
    ok: true,
    rejected: false,
    title: 'Detalle técnico de consultas SQL',
    answer: `Vista técnica solicitada: ControlEvent ha ejecutado ${executed.length} consulta(s) SQL de solo lectura y muestra su resultado humanizado. Esta salida no se usa como título ni como anexo de los informes normales para usuarios finales.`,
    warnings: arr(context?.advertencias).concat('Versión experimental v27_prod_1.2: SELECTs ejecutados literalmente mediante RPC ce_zuzu_select. Si la RPC no está instalada, no habrá resultados SQL reales.'),
    charts: [],
    tables,
    files,
    provider: 'control-event-zuzu-select-sql-real',
    model: 'supabase-rpc-ce_zuzu_select'
  };
}
function plannerModulesFromSelects(selects) {
  const map = {
    EVENTO: 'EVENTOS', EVENTOS: 'EVENTOS', CE_EVENTOS: 'EVENTOS',
    INGRESO: 'INGRESOS', INGRESOS: 'INGRESOS', COLABORADOR: 'INGRESOS', COLABORADORES: 'INGRESOS', CE_COLABORADORES: 'INGRESOS', CE_INGRESOS: 'INGRESOS',
    COMPRA: 'COMPRAS', COMPRAS: 'COMPRAS', GASTO: 'COMPRAS', GASTOS: 'COMPRAS', CE_COMPRAS: 'COMPRAS',
    DONACION: 'DONACIONES', DONACIONES: 'DONACIONES', CE_DONACIONES: 'DONACIONES',
    PERSONA: 'PERSONAS', PERSONAS: 'PERSONAS', CE_PERSONAS: 'PERSONAS',
    PRODUCTO: 'PRODUCTOS', PRODUCTOS: 'PRODUCTOS', CE_PRODUCTOS: 'PRODUCTOS',
    TIENDA: 'TIENDAS', TIENDAS: 'TIENDAS', CE_TIENDAS: 'TIENDAS',
    DOCUMENTO: 'DOCUMENTOS', DOCUMENTOS: 'DOCUMENTOS', CE_DOCUMENTOS: 'DOCUMENTOS',
    TICKET: 'TICKETS', TICKETS: 'TICKETS', CE_TICKETS: 'TICKETS',
    HITO: 'HITOS', HITOS: 'HITOS', CE_HITOS: 'HITOS',
    LG: 'LG', LGS: 'LG', CE_LG: 'LG', TAREA: 'LG', TAREAS: 'LG', LINEA_GESTION: 'LG', LINEAS_GESTION: 'LG'
  };
  const mods = [];
  arr(selects).forEach(sql => {
    const s = text(sql).toUpperCase();
    const m = s.match(/\bFROM\s+([\s\S]*?)(?:\bWHERE\b|\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b|$)/i);
    const from = m ? m[1] : '';
    const parts = from.split(/\bJOIN\b|,/i).map(x => trim(x).split(/\s+/)[0].replace(/[^A-Z0-9_\.]/gi, '').split('.').pop().toUpperCase()).filter(Boolean);
    parts.forEach(t => { const mod = map[t]; if (mod && !mods.includes(mod)) mods.push(mod); });
  });
  return plannerUnique(mods);
}
function parsePlannerText(raw, catalog, userPrompt, localModules = []) {
  const catalogEvents = arr(catalog?.eventos || catalog?.events);
  const activeEvent = catalog?.eventoActivo || catalog?.activeEvent || null;
  const exactEvents = exactEventTitlesFromPrompt(userPrompt, catalogEvents);
  const aiEvents = eventsFromPlannerText(raw, catalogEvents, activeEvent);
  const chosenEvents = aiEvents.length ? aiEvents : exactEvents;
  const sp = plannerSelectsFromText(raw);
  const selectModules = plannerModulesFromSelects(sp.selects);
  const rawModules = modulesFromPlannerText(raw);
  const modules = ensurePlannerDependencies(rawModules.length ? plannerUnique([].concat(rawModules, selectModules)) : (selectModules.length ? selectModules : inferPlannerModulesFromPrompt(userPrompt, localModules)), userPrompt);
  const consultaGlobal = strictScopeRequested(userPrompt) || chosenEvents.length ? false : plannerGlobalFlag(raw, userPrompt);
  const motivo = plannerSection(raw, ['MOTIVO', 'RAZONAMIENTO']) || 'Plan generado por Zuzu planificador en texto simple y validado por ControlEvent.';
  const pf = plannerFiltersFromText(raw);
  return {
    ok: true,
    needsClarification: !modules.length || (!consultaGlobal && !chosenEvents.length && /\b(evento|eventos|sysa|comparativa|meteo|tiempo|clima)\b/i.test(userPrompt) && !/evento\s+en\s+pantalla|evento\s+activo|este\s+evento/i.test(userPrompt)),
    clarification: '',
    modules,
    eventos: chosenEvents.map(e => e.titulo),
    eventIds: chosenEvents.map(e => e.id),
    todosLosEventos: consultaGlobal === true,
    filters: pf.filters,
    dataRequests: pf.conditions ? [{ tipo: 'condiciones_acceso', texto: pf.conditions }] : [],
    queryTemplates: queryTemplatesForPlan(modules, userPrompt),
    salidaDeseada: [],
    reasoning: `${motivo}${pf.conditions ? ` Condiciones propuestas por Zuzu: ${pf.conditions}` : ''}${sp.selects.length ? ` SELECTs propuestos por Zuzu validados por CE: ${sp.selects.length}.` : ''}`,
    selectsPropuestos: sp.selects,
    selectsRechazados: sp.rejected,
    __sqlSelectExperiment: sp.selects.length > 0,
    __strictEventScope: strictScopeRequested(userPrompt) || chosenEvents.length > 0,
    __queryTemplatePlan: true,
    __rawPlannerText: trim(raw).slice(0, 2000)
  };
}

function plannerPrompt(userPrompt, catalog) {
  const selected = catalog?.eventoActivo || null;
  const activeLine = selected?.id ? `${trim(selected.titulo)} | id=${trim(selected.id)} | ${trim(selected.fechaInicio)} a ${trim(selected.fechaFin)} | ${trim(selected.situacion)}` : 'SIN EVENTO ACTIVO';
  const eventList = arr(catalog?.eventos)
    .map(e => `${trim(e.titulo)} | ${trim(e.fechaInicio)}-${trim(e.fechaFin)} | ${trim(e.situacion)}`)
    .join('\n');
  return `Eres Zuzu planificador de ControlEvent. NO respondas al usuario final.
Decide SOLO qué módulos y condiciones de acceso necesita ControlEvent para extraer datos.
ControlEvent hará la extracción y luego tú redactarás con esos datos.

FECHA_ACTUAL: ${todayIsoMadrid()}
EVENTO_EN_PANTALLA: ${activeLine}

MODULOS_A_ELEGIR:
- EVENTOS: título, fechas, estado, precio, descripción.
- INGRESOS: colaboradores, importes obligatorios/voluntarios, estado de ingreso BANCO/EFECTIVO/BIZUM/PENDIENTE, socios/no socios, justificantes.
- COMPRAS: compras realizadas, pendientes, gastos, tiendas, responsables, tickets.
- DONACIONES: donaciones de producto, donante literal registrado, responsable, valoración.
- PERSONAS: maestro de personas/rango; útil para socios/no socios y cruces.
- PRODUCTOS: catálogo maestro de productos; útil para nombres, segmento/destino y equivalencias.
- METEO: previsión/tiempo por fechas del evento.
- DOCUMENTOS: documentos DOC del evento.
- TICKETS: justificantes/tickets de compra.
- HITOS: bloques de control del evento, descripción, fechas calculadas, responsable general y avance.
- LG: tareas o Líneas de Gestión de cada Hito, responsable, cumplimiento y dependencias.

EVENTOS_DISPONIBLES:
${eventList}

${plannerDatabaseSchemaText()}

Devuelve SOLO estas líneas, sin explicación adicional:
EVENTOS_SOLICITADOS: EVENTO_ACTIVO, TODOS, NINGUNO o títulos exactos separados por coma
ALCANCE_EVENTOS: EVENTO_ACTIVO | EVENTOS_EXACTOS | GLOBAL | SIN_EVENTO
MODULOS_NECESARIOS: módulos separados por coma
MODULOS_NO_NECESARIOS: módulos separados por coma
PERSONAS_IMPLICADAS: nombres si la pregunta nombra personas; si no, NINGUNA
CONDICIONES_DATOS: filtros concretos de acceso a datos; por ejemplo estado ingreso, rango, donante, responsable, compras pendientes/realizadas; si no, NINGUNA
CRITERIO_INCLUSION: qué registros deben entrar según la pregunta; si no aplica, NINGUNO
CRITERIO_EXCLUSION: qué registros deben quedar fuera según la pregunta; si no aplica, NINGUNO
CONSULTA_GLOBAL: SI o NO
SELECT_PRINCIPAL: SELECT principal recomendado; si no hace falta, NINGUNO
SELECT_VALIDACION: SELECT breve de validación/recuento base; si no hace falta, NINGUNO
SELECTS_PROPUESTOS: uno o varios SELECT reales usando tablas/campos indicados; incluye SELECT_PRINCIPAL y SELECT_VALIDACION si los has usado; si no hace falta, NINGUNO
MOTIVO: una frase breve

Reglas:
- Si el usuario dice evento en pantalla, este evento o evento activo, usa EVENTO_ACTIVO.
- Para “quién ha pagado / falta por pagar” usa normalmente INGRESOS y PERSONAS. No uses DONACIONES ni COMPRAS salvo que pregunte por donaciones o gastos.
- Para “todos los datos del evento” usa módulos del evento que aportan datos reales: EVENTOS, INGRESOS, COMPRAS, DONACIONES y PERSONAS; añade DOCUMENTOS/TICKETS solo si son relevantes.
- Para donaciones usa DONACIONES y, si hay que identificar socios/personas, PERSONAS. El donante debe salir literal del registro, no deducido.
- Para producto disponible usa COMPRAS, DONACIONES, PRODUCTOS y EVENTOS.
- No inventes datos, eventos ni repartos. Solo decide módulos/filtros.
- La parte inteligente de deducir SELECT la haces tú: usa el esquema real, la semántica y las condiciones del prompt para proponer SELECT exactos cuando sea posible.
- Si el usuario pide datos provisionales, eventos En curso como finalizados o consumo previsto, no excluyas Pte. Compra/PENDIENTE. Si el usuario pide solo compras realizadas/cerradas, entonces sí exclúyelos.
- Para rankings o gráficas, la SELECT principal debe devolver al menos una columna de etiqueta humana y una métrica numérica agregada.
- Para semáforo ejecutivo, calcula indicadores suficientes: ingresos realizados, ingresos pendientes, compras realizadas, compras pendientes, donaciones valoradas, saldo actual y saldo operativo. No basta con totales agregados sueltos.

PREGUNTA_USUARIO:
${trim(userPrompt).slice(0, 1800)}`;
}

function plannerSelectOnlyPrompt(userPrompt, catalog, partialPlanText = '') {
  const selected = catalog?.eventoActivo || null;
  const activeLine = selected?.id ? `${trim(selected.titulo)} | id=${trim(selected.id)} | ${trim(selected.fechaInicio)} a ${trim(selected.fechaFin)} | ${trim(selected.situacion)}` : 'SIN EVENTO ACTIVO';
  const eventList = arr(catalog?.eventos)
    .map(e => `${trim(e.titulo)} | id=${trim(e.id)} | ${trim(e.fechaInicio)}-${trim(e.fechaFin)} | ${trim(e.situacion)}`)
    .join('\n');
  return `Eres Zuzu planificador SQL de ControlEvent. Tu respuesta anterior pudo quedar cortada.
Devuelve SOLO SELECTs completas y ejecutables de solo lectura. No redactes nada para el usuario final.

FECHA_ACTUAL: ${todayIsoMadrid()}
EVENTO_EN_PANTALLA: ${activeLine}

EVENTOS_DISPONIBLES:
${eventList}

${plannerDatabaseSchemaText()}

INSTRUCCIONES_CRITICAS:
- Devuelve SELECTS_PROPUESTOS con SELECTs completos. Ninguna SELECT puede terminar en punto, coma, AND, OR, WHERE, JOIN, ON, GROUP BY, ORDER BY, FROM o AS.
- Normaliza estados con UPPER(TRIM(campo)). Ejemplo: UPPER(TRIM(c.situacion)) IN ('BANCO','EFECTIVO','BIZUM').
- Usa COALESCE(SUM(...),0) en agregados.
- No repitas SELECTs duplicadas.
- Para rankings, cada SELECT debe devolver etiqueta humana y métrica numérica agregada.
- Para evento en pantalla usa id='${trim(selected?.id || '')}'.
- Solo SELECT. Prohibido cualquier escritura.

PLAN_PARCIAL_RECIBIDO:
${trim(partialPlanText).slice(0, 1500)}

PREGUNTA_USUARIO:
${trim(userPrompt).slice(0, 1800)}

FORMATO_EXACTO:
SELECTS_PROPUESTOS: SELECT ...; SELECT ...`;
}
async function repairPlannerSelectsWithGemini(userPrompt, catalog, model, apiKey, flowTrace = [], partialPlanText = '') {
  const prompt = plannerSelectOnlyPrompt(userPrompt, catalog, partialPlanText);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.0, maxOutputTokens: Number(process.env.CONTROLEVENT_ZUZU_SELECT_REPAIR_MAX_TOKENS || 2048), thinkingConfig: { thinkingBudget: 0 } }
  };
  zuzuTracePush(flowTrace, 'Paso 1b · Zuzu SELECT completas', 'RUN', `Planificador anterior truncado: se pide a ${model} devolver solo SELECTs completas.`);
  sizeTrace(flowTrace, 'Paso 1b · Zuzu SELECT completas', 'Contexto enviado para reparación de SELECTs', prompt);
  const { res, payload } = await geminiFetchJsonWithTimeout(url, body, apiKey, Number(process.env.CONTROLEVENT_ZUZU_PLANNER_TIMEOUT_MS || 22000));
  logGeminiUsage('PASO 1b reparación SELECTs', model, payload);
  if (!res.ok) { const e = new Error(payload?.error?.message || `Zuzu select repair HTTP ${res.status}`); e.status = Number(res.status || 502); e.details = payload; throw e; }
  const outText = trim(geminiOutText(payload));
  if (!outText) throw new Error('Reparación de SELECTs no devolvió texto.');
  const finish = trim(payload?.candidates?.[0]?.finishReason || '');
  const sp = plannerSelectsFromText(outText);
  if (/MAX_TOKENS/i.test(finish) && !arr(sp.selects).length) throw new Error(`Reparación de SELECTs truncada por límite de tokens. Recibido: ${outText.slice(0, 240)}`);
  zuzuTracePush(flowTrace, 'Paso 1b · Zuzu SELECT completas', 'OK', `Respuesta: ${outText.slice(0, 900)}`, { model, usage: usageSmall(payload, model) });
  zuzuTracePush(flowTrace, 'Paso 1b · Zuzu SELECT completas validado', 'OK', `SELECTs válidos=${arr(sp.selects).length}; SELECTs rechazados=${arr(sp.rejected).length}`);
  return { ...sp, raw: outText, finishReason: finish };
}

function mergePlannerFilters(...items) {
  const out = { personas: [], productos: [], tiendas: [], responsables: [], donantes: [], tickets: [], segmentos: [], destinos: [], rangos: [], anios: [], estado: [] };
  for (const src of items) {
    const f = src && typeof src === 'object' ? src : {};
    Object.keys(out).forEach(k => { arr(f[k]).forEach(v => { const s = trim(v); if (s && !out[k].includes(s)) out[k].push(s); }); });
    if (trim(f.fechaDesde)) out.fechaDesde = trim(f.fechaDesde);
    if (trim(f.fechaHasta)) out.fechaHasta = trim(f.fechaHasta);
  }
  return out;
}
async function callGeminiPlanner(userPrompt, catalog, flowTrace = [], localModules = []) {
  const apiKey = geminiKey();
  if (!apiKey) { zuzuTracePush(flowTrace, 'Paso 1 · Zuzu planificador', 'KO', 'Sin GEMINI_API_KEY para Zuzu planificador.'); throw new Error('Sin GEMINI_API_KEY para Zuzu planificador.'); }
  let lastError = null;
  const plannerText = plannerPrompt(userPrompt, catalog);
  for (const model of configuredGeminiModelsForTask('zuzu-planner')) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: plannerText }] }],
      generationConfig: { temperature: 0.0, maxOutputTokens: Number(process.env.CONTROLEVENT_ZUZU_PLANNER_MAX_TOKENS || 2048), thinkingConfig: { thinkingBudget: 0 } }
    };
    try {
      zuzuTracePush(flowTrace, 'Paso 1 · Zuzu planificador', 'RUN', `Modelo ${model}. Petición texto simple: eventos, módulos, alcance y motivo; sin datos operativos.`);
      sizeTrace(flowTrace, 'Paso 1 · Zuzu planificador', 'Contexto ultraligero enviado al planificador', plannerText);
      const { res, payload } = await geminiFetchJsonWithTimeout(url, body, apiKey, Number(process.env.CONTROLEVENT_ZUZU_PLANNER_TIMEOUT_MS || 22000));
      logGeminiUsage('PASO 1 planificación de datos', model, payload);
      if (!res.ok) { const e = new Error(payload?.error?.message || `Zuzu planner HTTP ${res.status}`); e.status = Number(res.status || 502); e.details = payload; throw e; }
      const outText = trim(geminiOutText(payload));
      if (!outText) throw new Error('Planificador no devolvió texto.');
      const finish = trim(payload?.candidates?.[0]?.finishReason || '');
      const parsed = parsePlannerText(outText, catalog, userPrompt, localModules);
      if (/MAX_TOKENS/i.test(finish) && !arr(parsed.modules).length) throw new Error(`Respuesta de Zuzu planificador truncada por límite de tokens. Recibido: ${outText.slice(0, 240)}`);
      if (!arr(parsed.modules).length) throw new Error(`Zuzu planificador no indicó módulos utilizables. Respuesta recibida: ${outText.slice(0, 500)}`);
      if (/MAX_TOKENS/i.test(finish)) {
        parsed.plannerWarning = `Zuzu planificador acabó por MAX_TOKENS. ControlEvent NO ejecuta SELECTs parciales; pide una segunda respuesta solo con SELECTs completas. Respuesta parcial: ${outText.slice(0, 240)}`;
        const oldRejected = arr(parsed.selectsRechazados);
        parsed.selectsPropuestos = [];
        parsed.selectsRechazados = oldRejected;
        try {
          const repaired = await repairPlannerSelectsWithGemini(userPrompt, catalog, model, apiKey, flowTrace, outText);
          if (arr(repaired.selects).length) {
            parsed.selectsPropuestos = arr(repaired.selects);
            parsed.selectsRechazados = oldRejected.concat(arr(repaired.rejected));
            parsed.reasoning = `${trim(parsed.reasoning)} SELECTs completas obtenidas en Paso 1b tras truncado del planificador.`;
            parsed.plannerWarning = `Zuzu planificador acabó por MAX_TOKENS, pero las SELECTs se pidieron de nuevo completas en Paso 1b; solo se ejecutan esas SELECTs reparadas.`;
          } else {
            parsed.reasoning = `${trim(parsed.reasoning)} No se ejecutan SELECTs porque el planificador original quedó truncado y la reparación no devolvió SELECTs completas.`;
            parsed.plannerWarning = `${parsed.plannerWarning} La reparación no devolvió SELECTs completas; se usará extracción CE/local.`;
          }
        } catch (repairError) {
          zuzuTracePush(flowTrace, 'Paso 1b · Zuzu SELECT completas', 'KO', cleanGeminiError(repairError), { model });
          parsed.reasoning = `${trim(parsed.reasoning)} No se ejecutan SELECTs porque el planificador original quedó truncado y falló la reparación de SELECTs.`;
          parsed.plannerWarning = `${parsed.plannerWarning} Falló Paso 1b: ${friendlyZuzuErrorMessage(repairError)}. Se usará extracción CE/local.`;
        }
      }
      parsed.__zuzuPlannerModel = model;
      parsed.__zuzuPlannerUsage = usageSmall(payload, model);
      parsed.__rawPlannerText = outText.slice(0, 2000);
      zuzuTracePush(flowTrace, 'Paso 1 · Zuzu planificador', 'OK', `Respuesta: ${outText.slice(0, 900)}`, { model, usage: usageSmall(payload, model) });
      zuzuTracePush(flowTrace, 'Paso 1 · Zuzu planificador validado', 'OK', `Módulos=${arr(parsed.modules).join(', ')}; eventos=${arr(parsed.eventos).join(' | ') || 'sin evento explícito'}; consulta_global=${parsed.todosLosEventos ? 'SI' : 'NO'}; filtros=${JSON.stringify(parsed.filters || {})}; plantillas=${arr(parsed.queryTemplates).join(', ') || 'sin plantillas'}; SELECTs válidos=${arr(parsed.selectsPropuestos).length}; SELECTs rechazados=${arr(parsed.selectsRechazados).length}`);
      if (parsed.plannerWarning) zuzuTracePush(flowTrace, 'Paso 1 · Zuzu planificador', 'INFO', parsed.plannerWarning);
      return parsed;
    } catch (error) {
      lastError = error;
      zuzuTracePush(flowTrace, 'Paso 1 · Zuzu planificador', 'KO', cleanGeminiError(error), { model });
      if (isQuotaError(error) || !isRetryable(error)) break;
    }
  }
  throw lastError || new Error('Planificador Zuzu no disponible.');
}
function shouldUseGeminiPlanner(userPrompt, local) {
  // FIX29: la inteligencia de selección de módulos/condiciones la pone Zuzu.
  // ControlEvent solo actúa como barandilla si Zuzu no responde o si hay que evitar mezclar eventos.
  return true;
}

async function buildZuzuPlan(userPrompt, state, selectedEventId, flowTrace = []) {
  const local = buildZuzuLocalPlan(state, selectedEventId, userPrompt);
  const catalog = buildZuzuPlanningCatalog(state, selectedEventId, userPrompt);
  const exactEvents = exactEventTitlesFromPrompt(userPrompt, arr(catalog?.eventos));
  const familyEvents = exactEvents.length ? [] : familyEventTitlesFromPrompt(userPrompt, arr(catalog?.eventos));
  const promptResolvedEvents = exactEvents.length ? exactEvents : familyEvents;
  const strictRequested = strictScopeRequested(userPrompt) || promptResolvedEvents.length > 0;

  if (!shouldUseGeminiPlanner(userPrompt, local)) {
    return {
      ...local,
      reasoning: `${local.reasoning || 'Plan local de respaldo.'} Consulta simple de persona/identidad; no se invoca planificador externo.`,
      __zuzuPlannerProvider: 'local-consulta-simple',
      __zuzuGeminiAllRows: false
    };
  }

  // FIX27: si ControlEvent ya resuelve eventos exactos del prompt, no se llama a Zuzu planificador.
  // Evita el KO repetido por respuesta truncada del planificador y ahorra tiempo/tokens.
  if (false && promptResolvedEvents.length && strictRequested) {
    const reportPolicy = analyzeZuzuReportRequest(userPrompt);
    let modules = ensurePlannerDependencies(inferPlannerModulesFromPrompt(userPrompt, local.modules), userPrompt);
    if (!reportPolicy.includeTickets) modules = modules.filter(m => m !== 'TICKETS');
    if (!reportPolicy.includeDocuments) modules = modules.filter(m => m !== 'DOCUMENTOS');
    const chosenTitles = promptResolvedEvents.map(e => e.titulo);
    const chosenIds = promptResolvedEvents.map(e => e.id);
    const queryTemplates = queryTemplatesForPlan(modules, userPrompt);
    zuzuTracePush(flowTrace, 'Paso 1 · Planificador CE', 'OK', `Eventos exactos detectados en el prompt; no se invoca Zuzu planificador. Plantillas cerradas sobre: ${chosenTitles.join(' | ')}. Módulos=${modules.join(', ')}.`);
    return {
      ok: true,
      needsClarification: false,
      clarification: '',
      modules,
      eventos: chosenTitles,
      eventIds: chosenIds,
      todosLosEventos: false,
      filters: {},
      dataRequests: [],
      salidaDeseada: [],
      queryTemplates,
      reasoning: 'ControlEvent resolvió eventos exactos del prompt y ejecuta plantillas cerradas; Zuzu planificador no es necesario.',
      __strictEventScope: true,
      __queryTemplatePlan: true,
      __zuzuPlannerProvider: 'control-event-plantillas-cerradas-eventos-exactos-sin-planificador',
      __zuzuPlannerModel: '',
      __zuzuPlannerUsage: null,
      __zuzuGeminiAllRows: false,
      plannerWarning: ''
    };
  }

  let ai = null;
  let plannerError = null;
  try {
    ai = await callGeminiPlanner(userPrompt, catalog, flowTrace, local.modules);
  } catch (error) {
    plannerError = error;
  }

  // ControlEvent no decide el informe: solo aplica una barandilla genérica de seguridad.
  // Si el usuario ha dado eventos exactos y Zuzu falla, CE puede construir un plan de plantillas cerradas
  // con esos eventos para no caer en 20 eventos ni inventar datos.
  const aiEventIds = arr(ai?.eventIds).map(trim).filter(Boolean);
  const aiEventTitles = arr(ai?.eventos).map(trim).filter(Boolean);
  const localEventIds = arr(local.eventos).map(trim).filter(Boolean);
  // El alcance nombrado por el usuario manda siempre sobre el planificador.
  // Incluye familias entrecomilladas (p. ej. "Jornada Solidaria vs ELA") y respeta el número pedido.
  const chosenIds = promptResolvedEvents.length ? promptResolvedEvents.map(e => e.id) : (aiEventIds.length ? aiEventIds : localEventIds);
  const chosenTitles = promptResolvedEvents.length ? promptResolvedEvents.map(e => e.titulo) : aiEventTitles;
  const reportPolicy = analyzeZuzuReportRequest(userPrompt);
  let modules = ensurePlannerDependencies(plannerUnique([].concat(arr(ai?.modules), inferPlannerModulesFromPrompt(userPrompt, local.modules), reportPolicy.modules)), userPrompt);
  // TICKETS y DOCUMENTOS forman parte del paquete estructural de un informe general/detallado.
  // Solo se retiran en consultas realmente estrechas que no los han pedido.
  if (!reportPolicy.includeTickets) modules = modules.filter(m => m !== 'TICKETS');
  if (!reportPolicy.includeDocuments) modules = modules.filter(m => m !== 'DOCUMENTOS');
  const queryTemplates = queryTemplatesForPlan(modules, userPrompt);

  if (!ai && !chosenIds.length && strictRequested) {
    return {
      ok: false,
      needsClarification: true,
      clarification: `Zuzu planificador no ha completado el plan y ControlEvent no ha podido resolver los eventos exactos. No extraigo datos para evitar un informe falso. Motivo: ${cleanGeminiError(plannerError)}`,
      modules: [], eventos: [], eventIds: [], todosLosEventos: false, filters: {},
      reasoning: 'Corte seguro por falta de plan y de eventos exactos.',
      __zuzuPlannerProvider: 'corte-seguro-sin-plan', __zuzuGeminiAllRows: false
    };
  }

  if (!ai && chosenIds.length) {
    zuzuTracePush(flowTrace, 'Paso 1b · Barandilla CE', 'OK', `Zuzu planificador no completó el plan (${cleanGeminiError(plannerError)}). Como el prompt contiene eventos exactos, CE usa plantillas cerradas sobre esos eventos: ${chosenTitles.join(' | ')}.`);
  }

  if (!chosenIds.length && !strictRequested && ai?.todosLosEventos === true) {
    // Consulta verdaderamente global permitida por Zuzu.
  } else if (!chosenIds.length && !arr(local.eventos).length && arr(modules).some(m => ['INGRESOS','COMPRAS','DONACIONES'].includes(m))) {
    return {
      ok: false, needsClarification: true,
      clarification: 'Zuzu ha pedido módulos de evento, pero no se ha podido resolver ningún evento objetivo. No extraigo datos para evitar mezclar eventos.',
      modules: [], eventos: [], eventIds: [], todosLosEventos: false, filters: {},
      reasoning: 'Corte seguro por falta de evento objetivo.',
      __zuzuPlannerProvider: 'corte-seguro-sin-evento', __zuzuGeminiAllRows: false
    };
  }

  return {
    ok: true,
    needsClarification: false,
    clarification: '',
    modules,
    eventos: chosenTitles.length ? chosenTitles : arr(ai?.eventos || local.eventos),
    eventIds: chosenIds,
    todosLosEventos: strictRequested || chosenIds.length ? false : (ai?.todosLosEventos === true || local.todosLosEventos === true),
    filters: mergePlannerFilters(local.filters || {}, ai?.filters || {}),
    dataRequests: arr(ai?.dataRequests),
    salidaDeseada: arr(ai?.salidaDeseada),
    queryTemplates,
    selectsPropuestos: arr(ai?.selectsPropuestos),
    selectsRechazados: arr(ai?.selectsRechazados),
    __sqlSelectExperiment: arr(ai?.selectsPropuestos).length > 0,
    reasoning: trim(ai?.reasoning || '') || (ai ? 'Zuzu ha deducido módulos, filtros y SELECTs orientativos en texto simple; ControlEvent valida SELECTs y los usa como plan de extracción de solo lectura.' : 'Plan de plantillas cerradas construido con eventos exactos del prompt y reglas genéricas de dependencias.'),
    __strictEventScope: strictRequested || chosenIds.length > 0,
    __queryTemplatePlan: true,
    __zuzuPlannerProvider: ai ? 'zuzu-planner-texto-simple' : 'control-event-plantillas-cerradas-por-eventos-exactos',
    __zuzuPlannerModel: ai?.__zuzuPlannerModel || '',
    __zuzuPlannerUsage: ai?.__zuzuPlannerUsage || null,
    __zuzuGeminiAllRows: false,
    plannerWarning: plannerError ? cleanGeminiError(plannerError) : ''
  };
}


function tableColIndex(cols, re) {
  return arr(cols).findIndex(c => re.test(norm(c)));
}
function sortKeyValue(v) {
  const raw = trim(v);
  const n = Number(raw.replace(',', '.').replace(/[^0-9.-]/g, ''));
  if (raw && Number.isFinite(n) && /^-?\d+(?:[,.]\d+)?\s*(?:€|uds?|reg\.?|)?$/i.test(raw)) return { n, s: '' };
  return { n: null, s: norm(raw) };
}
function compareCell(a, b) {
  const va = sortKeyValue(a), vb = sortKeyValue(b);
  if (va.n !== null || vb.n !== null) return (va.n ?? 0) - (vb.n ?? 0);
  return va.s.localeCompare(vb.s, 'es', { numeric: true, sensitivity: 'base' });
}
function sortRowsByColumns(rows, cols, order) {
  const idxs = order.map(re => tableColIndex(cols, re)).filter(i => i >= 0);
  if (!idxs.length) return rows;
  return arr(rows).slice().sort((a,b) => {
    for (const i of idxs) {
      const c = compareCell(arr(a)[i], arr(b)[i]);
      if (c) return c;
    }
    return 0;
  });
}
function sortOneTable(tb) {
  const cols = arr(tb?.columns).map(c => trim(c));
  const title = norm(tb?.title || '');
  if (!cols.length || !arr(tb?.rows).length) return tb;
  let order = [];
  if (/donaciones|donados|donantes/.test(title) || cols.some(c => /donante/i.test(c))) {
    order = [/^evento$/i, /donante/i, /tipo.*donaci/i, /producto/i, /responsable/i, /tienda/i, /ticket|tk/i];
  } else if (/compras|gastos|tickets|fototickets/.test(title) || cols.some(c => /tienda/i.test(c))) {
    order = [/^evento$/i, /tienda/i, /ticket|tk/i, /producto/i, /responsable/i, /importe|valor|total/i];
  } else if (/participaci|papel|registros localizados|apariciones/.test(title) || cols.some(c => /papel/i.test(c))) {
    order = [/^evento$/i, /papel/i, /relacionado|nombre|persona|donante/i, /producto/i, /tienda/i];
  } else if (/ingresos|colaboradores|personas/.test(title) || cols.some(c => /nombre/i.test(c))) {
    order = [/^evento$/i, /rango/i, /nombre|persona/i, /ingreso|forma/i];
  } else if (/producto|ranking|catalogo|catálogo/.test(title)) {
    order = [/^evento$/i, /producto|nombre producto/i, /segmento/i, /destino/i];
  } else if (/cronica|crónica|resumen|comparativa|saldo/.test(title)) {
    order = [/fecha ini|fecha inicio|fecha|fecha celebración|evento/i, /^evento$/i];
  } else {
    order = [/^evento$/i, /tienda/i, /donante/i, /producto/i, /nombre/i];
  }
  return { ...tb, rows: sortRowsByColumns(tb.rows, cols, order) };
}
function sortResultTables(result) {
  if (!result || !Array.isArray(result.tables)) return result;
  return { ...result, tables: result.tables.map(sortOneTable) };
}
function scopeMetaFromContext(context) {
  const evs = arr(context?.eventosObjetivo);
  const p = norm(context?.promptUsuario || '');
  if (evs.length === 1) {
    const e = evs[0] || {};
    const title = trim(e['Titulo del evento'] || e.titulo || e.Evento || '');
    const estado = trim(e.Estado || e.situacion || '');
    return { eventHeader: [title, estado].filter(Boolean).join(' · '), scopeKind: 'single-event', eventCount: 1 };
  }
  if (evs.length > 1) {
    const label = /\b(compara|comparativa|comparar|frente\s+a|versus|vs)\b/.test(p) ? 'Comparativa' : 'Varios eventos';
    return { eventHeader: `${label} · ${evs.length} eventos`, scopeKind: 'multi-event', eventCount: evs.length };
  }
  return { eventHeader: '', scopeKind: 'global-or-master', eventCount: 0 };
}
function dominantSubjectFromPrompt(prompt, result) {
  const q = [...text(prompt).matchAll(/["“”'‘’]([^"“”'‘’]{2,80})["“”'‘’]/g)].map(m => trim(m[1])).filter(Boolean);
  const p = norm(prompt);
  if (/participaci|opini|papel|aparece|colabor/.test(p) && q[0]) return `Informe_opinion_${q[0]}`;
  if (/donaci/.test(p) && q[0]) return `Donaciones_${q[0]}`;
  if (/compar/.test(p)) return 'Comparativa_eventos';
  if (/cronica|crónica|todos los eventos|cada evento/.test(p)) return 'Cronica_eventos';
  return trim(result?.title || q[0] || prompt).slice(0, 80);
}

function wantsWeatherInfo(prompt) {
  return /\b(tiempo|meteorolog|meteorología|metereolog|metereología|meteo|parte\s+meteorolog|parte\s+metereolog|clima|lluvia|llover|temperatura|calor|fr[ií]o|viento|previsi[oó]n|pron[oó]stico|forecast)\b/i.test(text(prompt));
}
function wantsGraphicalOutput(prompt) {
  return /\b(grafica|gráfica|grafico|gráfico|graficamente|gráficamente|chart|diagrama|barras|tarta|queso|pastel|pie|donut|curva|linea|línea)\b/i.test(text(prompt));
}
function weatherTargetEventNamesFromPrompt(prompt, eventRows = []) {
  const raw = text(prompt);
  const marker = raw.search(/\b(tiempo|meteorol[oó]g\w*|metereol[oó]g\w*|meteo\w*|clima|lluvia|temperatura|viento|previsi[oó]n|pron[oó]stico)\b/i);
  if (marker < 0) return [];
  const weatherPart = raw.slice(marker);
  const names = [];
  arr(eventRows).forEach(ev => {
    const title = trim(ev?.['Titulo del evento'] || ev?.titulo || ev?.Evento || '');
    if (!title) return;
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(escaped, 'i').test(weatherPart) && !names.includes(title)) names.push(title);
  });
  return names;
}
function parseCeDateToIso(value) {
  const s = trim(value);
  if (!s) return '';
  const m1 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m1) return `${m1[1]}-${String(m1[2]).padStart(2,'0')}-${String(m1[3]).padStart(2,'0')}`;
  const m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m2) {
    const y = m2[3].length === 2 ? `20${m2[3]}` : m2[3];
    return `${y}-${String(m2[2]).padStart(2,'0')}-${String(m2[1]).padStart(2,'0')}`;
  }
  return '';
}
function addDaysIso(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return iso;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0,10);
}
function daysBetweenIso(a, b) {
  const da = new Date(`${a}T00:00:00Z`), db = new Date(`${b}T00:00:00Z`);
  if (!Number.isFinite(da.getTime()) || !Number.isFinite(db.getTime())) return 0;
  return Math.round((db - da) / 86400000);
}
function spanishWeekdayFromIso(iso) {
  const days = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const d = new Date(`${trim(iso)}T12:00:00Z`);
  return Number.isFinite(d.getTime()) ? days[d.getUTCDay()] : '';
}
function spanishWeatherDateLabel(iso) {
  const raw = trim(iso);
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${spanishWeekdayFromIso(raw)} ${m[3]}/${m[2]}` : raw;
}
function weatherCodeText(code) {
  const c = Number(code);
  if ([0].includes(c)) return 'Despejado';
  if ([1,2].includes(c)) return 'Poco nuboso';
  if ([3].includes(c)) return 'Cubierto';
  if ([45,48].includes(c)) return 'Niebla';
  if ([51,53,55,56,57].includes(c)) return 'Llovizna';
  if ([61,63,65,66,67,80,81,82].includes(c)) return 'Lluvia';
  if ([71,73,75,77,85,86].includes(c)) return 'Nieve';
  if ([95,96,99].includes(c)) return 'Tormenta';
  return `Código ${trim(code)}`;
}
async function maybeFetchWeatherContext(userPrompt, context, flowTrace = [], force = false) {
  if (!force && !wantsWeatherInfo(userPrompt)) return null;
  const evs = arr(context?.eventosObjetivo);
  if (!evs.length) {
    zuzuTracePush(flowTrace, 'Paso 2b · Datos indirectos meteorología', 'KO', 'El usuario pide tiempo/clima, pero no hay evento objetivo con fechas.');
    return { ok:false, reason:'No hay evento objetivo con fechas para consultar meteorología.' };
  }
  const lat = Number(process.env.CONTROLEVENT_WEATHER_LAT || process.env.WEATHER_LAT || '39.743');
  const lon = Number(process.env.CONTROLEVENT_WEATHER_LON || process.env.WEATHER_LON || '-3.657');
  const place = trim(process.env.CONTROLEVENT_WEATHER_PLACE || process.env.WEATHER_PLACE || 'Villanueva de Bogas, Toledo');
  const rows = [];
  const weatherTargets = weatherTargetEventNamesFromPrompt(userPrompt, evs);
  const targetEvents = weatherTargets.length
    ? evs.filter(ev => weatherTargets.includes(trim(ev['Titulo del evento'] || ev.titulo || ev.Evento || '')))
    : evs;
  for (const ev of targetEvents.slice(0, 4)) {
    const title = trim(ev['Titulo del evento'] || ev.titulo || ev.Evento || 'Evento');
    const start = parseCeDateToIso(ev['fecha ini'] || ev.fechaIni || ev.fecha || '');
    const end0 = parseCeDateToIso(ev['fecha fin'] || ev.fechaFin || '') || start;
    if (!start) { rows.push({ Evento:title, Aviso:'Evento sin fecha de inicio legible para meteorología.' }); continue; }
    const end = daysBetweenIso(start, end0) > 9 ? addDaysIso(start, 9) : end0;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=Europe%2FMadrid&start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
    try {
      zuzuTracePush(flowTrace, 'Paso 2b · Datos indirectos meteorología', 'RUN', `Consultando Open-Meteo para ${title} (${start} a ${end}) en ${place}.`);
      const res = await fetch(url, { headers: { 'accept': 'application/json' } });
      const payload = await res.json().catch(async () => ({ error: await res.text().catch(() => res.statusText) }));
      if (!res.ok) throw new Error(payload?.reason || payload?.error || `Open-Meteo HTTP ${res.status}`);
      const d = payload?.daily || {};
      arr(d.time).forEach((dia, i) => rows.push({
        Evento: title,
        Localidad: place,
        Día: spanishWeekdayFromIso(dia),
        Fecha: dia,
        Cielo: weatherCodeText(arr(d.weather_code)[i]),
        'Temp. máx': round(arr(d.temperature_2m_max)[i], 1),
        'Temp. mín': round(arr(d.temperature_2m_min)[i], 1),
        'Prob. lluvia %': round(arr(d.precipitation_probability_max)[i], 0),
        'Viento km/h': round(arr(d.wind_speed_10m_max)[i], 1),
        Fuente: 'Open-Meteo'
      }));
      zuzuTracePush(flowTrace, 'Paso 2b · Datos indirectos meteorología', 'OK', `Open-Meteo devolvió ${arr(d.time).length} día(s) para ${title}.`);
    } catch (error) {
      rows.push({ Evento:title, Localidad:place, Fecha:start, Aviso:`No se pudo obtener previsión externa: ${cleanGeminiError(error)}` });
      zuzuTracePush(flowTrace, 'Paso 2b · Datos indirectos meteorología', 'KO', cleanGeminiError(error));
    }
  }
  return { ok: rows.some(r => !r.Aviso), proveedor: 'Open-Meteo', localidad: place, filas: rows };
}
function weatherTableAndCharts(weatherCtx, { compact = false, withCharts = false } = {}) {
  const rows = arr(weatherCtx?.filas);
  if (!rows.length) return { tables: [], charts: [] };
  const columns = compact
    ? ['Día','Fecha','Cielo','Temp. máx','Temp. mín','Prob. lluvia %','Viento km/h']
    : ['Evento','Localidad','Día','Fecha','Cielo','Temp. máx','Temp. mín','Prob. lluvia %','Viento km/h','Aviso'];
  const tableRows = rows.map(r => columns.map(c => text(r[c])));
  const okRows = rows.filter(r => !r.Aviso);
  const titleKind = arr(rows).some(r => trim(r.Fecha) && trim(r.Fecha) < new Date().toISOString().slice(0,10)) ? 'Meteorología registrada' : 'Meteorología prevista';
  const charts = [];
  if (okRows.length && !compact && withCharts) {
    charts.push({
      title: `${titleKind} · resumen meteorológico`,
      type: 'weather', unit: '',
      weatherRows: okRows.map(r => ({
        evento:trim(r.Evento), dia:trim(r.Día || r.Dia || spanishWeekdayFromIso(r.Fecha)), fecha:trim(r.Fecha), fechaLabel:spanishWeatherDateLabel(r.Fecha), cielo:trim(r.Cielo),
        tmax:num(r['Temp. máx']), tmin:num(r['Temp. mín']), lluvia:num(r['Prob. lluvia %']), viento:num(r['Viento km/h']), localidad:trim(r.Localidad)
      }))
    });
    if (okRows.length > 1) {
      const labels = okRows.map(r => spanishWeatherDateLabel(r.Fecha));
      charts.push({ title:'Temperatura máxima y mínima por día', type:'line', labels, values:okRows.map(r=>num(r['Temp. máx'])), unit:'ºC', series:[
        { name:'Máxima', values:okRows.map(r=>num(r['Temp. máx'])) },
        { name:'Mínima', values:okRows.map(r=>num(r['Temp. mín'])) }
      ]});
      charts.push({ title:'Probabilidad de lluvia por día', type:'bar', labels, values:okRows.map(r=>num(r['Prob. lluvia %'])), unit:'%' });
    }
  }
  return { tables:[{ title:`${titleKind} · ${trim(weatherCtx?.localidad || '')}`, columns, rows:tableRows }], charts };
}

function attachWeatherVisualsIfNeeded(result, context, userPrompt) {
  if (!wantsWeatherInfo(userPrompt)) return result;
  const weatherCtx = context?.infoIndirecta?.meteorologia;
  if (!weatherCtx || !arr(weatherCtx.filas).length) return result;
  const compact = wantsOnePageNarrative(userPrompt) || result?.compactOnePage === true;
  // El cuadro ejecutivo de una página ya incorpora los tres días: no añadir otra tabla.
  if (compact && result?.compactOnePage === true) return result;
  const wc = weatherTableAndCharts(weatherCtx, { compact, withCharts: wantsGraphicalOutput(userPrompt) });
  const existingWeather = arr(result?.tables).some(t => /meteorolog|tiempo|clima|lluvia|temperatura/i.test(trim(t?.title || '')));
  const existingChartTitles = new Set(arr(result?.charts).map(c => norm(c?.title || '')));
  const extraCharts = arr(wc.charts).filter(c => !existingChartTitles.has(norm(c?.title || '')));
  return {
    ...result,
    tables: existingWeather ? arr(result?.tables) : arr(result?.tables).concat(wc.tables),
    charts: arr(result?.charts).concat(extraCharts)
  };
}

function mergeRowsByIdentity(baseRows, extraRows) {
  const map = new Map();
  arr(baseRows).concat(arr(extraRows)).forEach((row, index) => {
    const key = trim(row?.id) || `${trim(row?.eventId || row?.event_id)}|${trim(row?.productoId || row?.producto_id || row?.personaId || row?.persona_id)}|${trim(row?.ticketDonacion || row?.ticket_donacion)}|${index}`;
    map.set(key, row);
  });
  return [...map.values()];
}
async function hydrateStateForExactEvents(baseState, plan, flowTrace = []) {
  const ids = arr(plan?.eventIds || plan?.event_ids).map(trim).filter(Boolean).slice(0, 8);
  const eventModules = arr(plan?.modules).some(m => ['INGRESOS','COMPRAS','DONACIONES','TICKETS','DOCUMENTOS'].includes(trim(m).toUpperCase()));
  if (ids.length < 2 || !eventModules) return baseState;
  let merged = { ...(baseState || {}) };
  let loaded = 0;
  zuzuTracePush(flowTrace, 'Paso 2a · Carga detallada por evento', 'RUN', `Comprobando datos completos de ${ids.length} eventos exactos para evitar comparativas parciales.`);
  for (const eventId of ids) {
    try {
      const scoped = await getState({ eventId });
      merged.colaboradores = mergeRowsByIdentity(merged.colaboradores, scoped?.colaboradores);
      merged.compras = mergeRowsByIdentity(merged.compras, scoped?.compras);
      merged.eventDocuments = mergeRowsByIdentity(merged.eventDocuments, scoped?.eventDocuments);
      merged.ticketImages = { ...(merged.ticketImages || {}), ...(scoped?.ticketImages || {}) };
      merged.ticketImageRefs = { ...(merged.ticketImageRefs || {}), ...(scoped?.ticketImageRefs || {}) };
      loaded += 1;
    } catch (error) {
      zuzuTracePush(flowTrace, 'Paso 2a · Carga detallada por evento', 'INFO', `No se pudo reforzar el evento ${eventId}: ${cleanGeminiError(error)}`);
    }
  }
  zuzuTracePush(flowTrace, 'Paso 2a · Carga detallada por evento', loaded ? 'OK' : 'KO', loaded ? `Datos detallados reforzados para ${loaded}/${ids.length} eventos.` : 'No se pudo reforzar ningún evento; se conserva el estado global.');
  return merged;
}

async function attachHitosState(baseState, flowTrace = []) {
  const current = baseState && typeof baseState === 'object' ? baseState : {};
  if (Array.isArray(current.hitos) && Array.isArray(current.lgs)) return current;
  try {
    const extra = await listAllHitosState();
    zuzuTracePush(flowTrace, 'Paso 0a · Control de Hitos', 'OK', `Cargados hitos=${arr(extra?.hitos).length}, LG=${arr(extra?.lgs).length}.`);
    return { ...current, hitos: arr(extra?.hitos), lgs: arr(extra?.lgs) };
  } catch (error) {
    zuzuTracePush(flowTrace, 'Paso 0a · Control de Hitos', 'INFO', `No se pudieron cargar ce_hitos/ce_lg: ${cleanGeminiError(error)}. Zuzu continúa con el resto de módulos.`);
    return { ...current, hitos: arr(current?.hitos), lgs: arr(current?.lgs) };
  }
}

async function attachBankState(baseState, userPrompt, flowTrace = []) {
  const current=baseState&&typeof baseState==='object'?baseState:{};
  const prompt=String(userPrompt||'');
  const asksBank=/(conciliaci[oó]n|cuadre\s+bancario|movimientos?\s+bancarios?|saldo\s+bancario|abonos?\s+bancarios?|tk\s*\d+\s+justific)/i.test(prompt);
  const asksBroadEvent=/(?:informe|resumen|balance|dossier|cr[oó]nica|analiza|cu[eé]ntame|dime).{0,45}(?:completo|general|todo|evento)|(?:todo|toda\s+la\s+informaci[oó]n).{0,30}(?:del|sobre\s+el)\s+evento/i.test(prompt);
  if(!asksBank&&!asksBroadEvent) return current;
  try{
    const bank=await exportBankData({accountId:'TODOS'});
    const next={...current,
      bankMovements:arr(bank?.movements), bankTicketLinks:arr(bank?.links), bankImportBatches:arr(bank?.batches),
      bankEventSettings:arr(bank?.eventSettings), bankMovementStates:arr(bank?.movementStates)
    };
    zuzuTracePush(flowTrace,'Paso 0b · Conciliación bancaria','OK',`Cargados movimientos=${next.bankMovements.length}, vínculos TKxx=${next.bankTicketLinks.length}, períodos=${next.bankEventSettings.length}, estados=${next.bankMovementStates.length}.`);
    return next;
  }catch(error){
    zuzuTracePush(flowTrace,'Paso 0b · Conciliación bancaria','INFO',`No se pudieron cargar las tablas bancarias: ${cleanGeminiError(error)}. Zuzu continúa con el resto de módulos.`);
    return {...current,bankMovements:arr(current.bankMovements),bankTicketLinks:arr(current.bankTicketLinks),bankImportBatches:arr(current.bankImportBatches),bankEventSettings:arr(current.bankEventSettings),bankMovementStates:arr(current.bankMovementStates)};
  }
}

function normalizeLoggedUserFix10(payload = {}) {
  const raw = payload?.usuarioLogado || payload?.user || payload?.authUser || payload?.ce_acceso || payload?.ceAcceso || payload?.loggedUser || null;
  if (!raw || typeof raw !== 'object') return null;
  const identificacion = trim(raw.Identificacion ?? raw.identificacion ?? raw.IDENTIFICACION ?? raw.usuario ?? raw.user ?? '');
  const nombre = trim(raw.Nombre ?? raw.nombre ?? raw.NOMBRE ?? raw.name ?? '');
  const nivel = trim(raw.Nivel ?? raw.nivel ?? raw.NIVEL ?? '');
  if (!identificacion && !nombre) return null;
  return { identificacion, nombre, nivel, Identificacion: identificacion, Nombre: nombre, Nivel: nivel };
}
function attachLoggedUserFix10(state, payload = {}) {
  const user = normalizeLoggedUserFix10(payload);
  if (!user) return state;
  return { ...(state || {}), usuarioLogado: user, ce_acceso_usuario_logado: { Identificacion: user.Identificacion, Nombre: user.Nombre, Nivel: user.Nivel } };
}

function enforceCanonicalAttendanceAnswer(answer, context, userPrompt, result = null) {
  let out = trim(answer);
  const policy = analyzeZuzuReportRequest(userPrompt);
  const packs = arr(context?.asistenciaCanonica?.porEvento);
  const attendanceRelevant = policy.modules.includes('PERSONAS') || /\b(asistencia|asistentes?|socios?|no\s+socios?|colaboradores?|participaci[oó]n)\b/.test(norm(userPrompt));
  if (!attendanceRelevant || !packs.length) return out;

  // Cualquier cifra de asistencia escrita por el modelo se sustituye por la fuente única CE.
  const pieces = out.split(/(?<=[.!?])\s+|\n+/).map(trim).filter(Boolean);
  out = pieces.filter(piece => {
    const n = norm(piece);
    const hasNumber = /\d/.test(piece);
    const attendanceClaim = /\b(asistencia|asistentes?|socios?|no\s+socios?|colaboradores?|registros?\s+de\s+ingreso|personas?\s+confirmadas?)\b/.test(n);
    return !(hasNumber && attendanceClaim);
  }).join(' ').trim();

  const attendanceAlreadyStructured = arr(result?.tables).some(t => /participaci[oó]n|asistencia|personas/.test(norm(t?.title || '')) && arr(t?.columns).some(c => /asistentes?|personas/.test(norm(c))));
  if (attendanceAlreadyStructured && !policy.greetOneByOne) return out;

  const mentionRecords = /\b(registros?|filas?|colaboradores?|discrepancia|administrativ)\b/.test(norm(userPrompt));
  const mentionNonAttendees = policy.broadReport || /\b(no\s+asistentes?|ausentes?|socios?\s+no|faltan)\b/.test(norm(userPrompt));
  const official = packs.map(pack => {
    const socios=num(pack.sociosAsistentesPersonas);
    const noSocios=num(pack.noSociosAsistentesPersonas);
    const total=num(pack.totalAsistentesPersonas);
    const noAsisten=num(pack.sociosNoAsistentesPersonas);
    const registros=num(pack.registrosIngreso);
    let line=`La asistencia confirmada es de ${total} ${total===1?'persona':'personas'}: ${socios} ${socios===1?'socio':'socios'} y ${noSocios} ${noSocios===1?'no socio':'no socios'}.`;
    if (mentionNonAttendees) line+=` Hay ${noAsisten} ${noAsisten===1?'socio no asistente':'socios no asistentes'}.`;
    if (mentionRecords) line+=` El dato procede de ${registros} ${registros===1?'registro administrativo':'registros administrativos'}, que no equivalen al número de personas.`;
    return line;
  }).join(' ');
  return `${official}${out ? `\n\n${out}` : ''}`.trim();
}

function escapeRegexText(value) { return text(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
function uniqueAttendanceNames(context) {
  const names=[];
  arr(context?.asistenciaCanonica?.porEvento).forEach(pack=>{
    arr(pack?.sociosAsistentes).concat(arr(pack?.noSociosAsistentes),arr(pack?.sociosNoAsistentes)).forEach(x=>{
      const name=trim(x?.nombre); if(name && !names.some(v=>norm(v)===norm(name))) names.push(name);
    });
  });
  return names.sort((a,b)=>b.length-a.length);
}
function tidyNarrativeAnswer(answer, context, userPrompt) {
  let out=trim(answer)
    .replace(/\s+([,.;:!?])/g,'$1')
    .replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g,'$1 ')
    .replace(/(€|%)(?=[A-ZÁÉÍÓÚÑ])/g,'$1 ')
    .replace(/[ \t]{2,}/g,' ')
    .replace(/\n{3,}/g,'\n\n');

  // Elimina frases idénticas sin alterar el orden.
  const seen=new Set();
  out=out.split(/(?<=[.!?])\s+|\n+/).map(trim).filter(Boolean).filter(piece=>{
    const k=norm(piece).replace(/[^a-z0-9]+/g,' ');
    if(k.length>20 && seen.has(k)) return false;
    if(k.length>20) seen.add(k);
    return true;
  }).join(' ').trim();

  // Un evento se nombra una sola vez en la narración; las tablas ya conservan el contexto.
  for (const eventName of eventNamesFromContext(context)) {
    if(!trim(eventName)) continue;
    let count=0;
    out=out.replace(new RegExp(escapeRegexText(eventName),'gi'),match=>{ count+=1; return count===1?match:'el evento'; });
  }
  // Una persona o pareja se nombra una sola vez. Las menciones posteriores se convierten
  // en una referencia neutra para evitar listas duplicadas.
  for (const name of uniqueAttendanceNames(context)) {
    let count=0;
    const replacement=/\s+y\s+/i.test(name)?'la pareja citada':'esa persona';
    out=out.replace(new RegExp(escapeRegexText(name),'gi'),match=>{ count+=1; return count===1?match:replacement; });
  }
  out=out
    .replace(/(?:[^.!?\n]{1,90},\s*)?soy tu amigo Zuzu,\s*pregúntame lo que quieras[.!]?\s*$/gi,'')
    .replace(/(?:\s*Pregúntame lo que quieras[.!?]?)+\s*$/gi,'')
    .trim();
  if (out && !/[.!?]$/.test(out)) out+='.';
  return out;
}

function sanitizeResultStructure(result, context, userPrompt) {
  const policy=analyzeZuzuReportRequest(userPrompt);
  const singleEvent=eventNamesFromContext(context).length===1;
  const tables=[]; const seenTables=new Set();
  for (const raw of arr(result?.tables)) {
    let columns=arr(raw?.columns).map(text);
    let rows=arr(raw?.rows).map(row=>arr(row).map(text));
    const title=trim(raw?.title||'Tabla');
    const titleNorm=norm(title);
    if (policy.greetOneByOne && /(?:detalle|personas|socios).*asist|asist.*(?:detalle|personas|socios)/.test(titleNorm) && !/participacion|documentacion|resumen/.test(titleNorm)) continue;
    if (singleEvent) {
      const eventIndex=columns.findIndex(c=>/^evento$/i.test(trim(c)));
      if(eventIndex>=0){ columns=columns.filter((_,i)=>i!==eventIndex); rows=rows.map(r=>r.filter((_,i)=>i!==eventIndex)); }
    }
    if (policy.detailLevel==='detailed') {
      if (/compras?.*(producto|detalle)|donaciones?.*(producto|detalle)/.test(titleNorm)) rows=rows.slice(0,35);
      else rows=rows.slice(0,90);
    } else if (policy.detailLevel!=='exhaustive') rows=rows.slice(0,80);
    const sig=`${titleNorm}|${columns.join('|').toLowerCase()}|${rows.slice(0,3).map(r=>r.join('|')).join('||')}`;
    if(seenTables.has(sig)) continue;
    seenTables.add(sig); tables.push({...raw,title,columns,rows});
  }
  let charts=[]; const seenCharts=new Set();
  const hasWeatherCard=arr(result?.charts).some(c=>trim(c?.type).toLowerCase()==='weather');
  for(const chart of arr(result?.charts)){
    if(policy.onePage) break;
    const titleNorm=norm(chart?.title||'');
    if(/probabilidad.*lluvia/.test(titleNorm) && Math.max(0,...arr(chart?.values).map(num))<10) continue;
    if(hasWeatherCard && /prevision meteorologica|previsión meteorológica/.test(titleNorm) && trim(chart?.type).toLowerCase()!=='weather') continue;
    const sig=`${titleNorm}|${trim(chart?.type)}|${arr(chart?.labels).join('|')}`;
    if(seenCharts.has(sig)) continue;
    seenCharts.add(sig); charts.push(chart);
    if(charts.length>=5) break;
  }
  return {...result,tables,charts};
}

function zuzuLoggedUserDisplayName(context = {}) {
  const raw = context?.usuarioLogado || context?.ce_acceso_usuario_logado || context?.user || context?.authUser || null;
  const name = trim(raw?.Identificacion ?? raw?.identificacion ?? raw?.usuario ?? raw?.user ?? raw?.Nombre ?? raw?.nombre ?? raw?.NOMBRE ?? raw?.name ?? '');
  return name || 'Amigo';
}

// FIX9.3.16 · ZUZU AGENTE SEMÁNTICO + CALIDAD DE RESPUESTA
// Corrige regresiones observadas en FIX9.3.15: gráficas inútiles, pérdida de fechas,
// aclaraciones innecesarias sobre conceptos propios de CE y fallback excesivamente técnico.
// Arquitectura estricta:
//   1) Gemini interpreta la intención y devuelve un PLAN SEMÁNTICO (nunca SQL).
//   2) ControlEvent resuelve entidades humanas y traduce el plan a SELECTs cerradas/eficientes.
//   3) ControlEvent ejecuta las SELECTs y devuelve resultados a Gemini.
//   4) Gemini puede pedir una segunda/tercera ronda de datos, también en lenguaje semántico.
//   5) Gemini redacta y decide qué gráficas convienen; CE valida cifras y dibuja con datos reales.
// Gemini piensa. ControlEvent conoce la BBDD, consulta y presenta.
const ZUZU_SEMANTIC_DOMAINS = ['EVENTS','PEOPLE','CANONICAL_SOCIOS','PARTICIPATION','INCOMES','PURCHASES','DONATIONS','PRODUCTS','STORES','TICKETS','DOCUMENTS','HITOS','LG','BANK'];
const ZUZU_SEMANTIC_DIMENSIONS = ['event','event_state','event_start','event_end','person','range','payment_status','store','product','responsible','ticket','segment','destination','donation_type','hito','task','task_status','movement_type','bank_description','description'];
const ZUZU_SEMANTIC_METRICS = ['count','count_records','participants','amount','mandatory_amount','voluntary_amount','units','line_count','ticket_count','completed_count','pending_count','credits','debits'];

function semanticQuerySchema() {
  return {
    type: 'OBJECT',
    properties: {
      id: { type: 'STRING' },
      title: { type: 'STRING' },
      domain: { type: 'STRING' },
      scope: { type: 'STRING', description: 'active_event, all_events, named_events o year' },
      event_names: { type: 'ARRAY', items: { type: 'STRING' } },
      year: { type: 'INTEGER' },
      status: { type: 'STRING', description: 'realized, pending, all, completed o open según dominio' },
      filters: {
        type: 'ARRAY', items: {
          type: 'OBJECT', properties: {
            field: { type: 'STRING' }, value: { type: 'STRING' }, operator: { type: 'STRING' }
          }, required: ['field','value','operator']
        }
      },
      group_by: { type: 'ARRAY', items: { type: 'STRING' } },
      metrics: { type: 'ARRAY', items: { type: 'STRING' } },
      detail_fields: { type: 'ARRAY', items: { type: 'STRING' } },
      include_total: { type: 'BOOLEAN' },
      include_empty: { type: 'BOOLEAN' },
      sort: { type: 'STRING' },
      limit: { type: 'INTEGER' },
      show_table: { type: 'BOOLEAN' }
    },
    required: ['id','title','domain','scope','event_names','year','status','filters','group_by','metrics','detail_fields','include_total','include_empty','sort','limit','show_table']
  };
}
function semanticPlanSchema() {
  return {
    type: 'OBJECT',
    properties: {
      action: { type: 'STRING', description: 'query o clarify' },
      clarification: { type: 'STRING' },
      intent: { type: 'STRING' },
      scope_summary: { type: 'STRING' },
      queries: { type: 'ARRAY', items: semanticQuerySchema() },
      wants_charts: { type: 'BOOLEAN' },
      rationale: { type: 'STRING' }
    },
    required: ['action','clarification','intent','scope_summary','queries','wants_charts','rationale']
  };
}
function semanticReviewSchema() {
  return {
    type: 'OBJECT',
    properties: {
      status: { type: 'STRING', description: 'enough, more o clarify' },
      reason: { type: 'STRING' },
      clarification: { type: 'STRING' },
      additional_queries: { type: 'ARRAY', items: semanticQuerySchema() }
    },
    required: ['status','reason','clarification','additional_queries']
  };
}
function semanticFinalSchema() {
  return {
    type: 'OBJECT',
    properties: {
      title: { type: 'STRING' },
      answer: { type: 'STRING' },
      warnings: { type: 'ARRAY', items: { type: 'STRING' } },
      charts: {
        type: 'ARRAY', items: {
          type: 'OBJECT', properties: {
            title: { type: 'STRING' },
            type: { type: 'STRING', description: 'bar, horizontalBar, pie, donut o line' },
            query_id: { type: 'STRING' },
            label_field: { type: 'STRING' },
            value_field: { type: 'STRING' },
            unit: { type: 'STRING' }
          }, required: ['title','type','query_id','label_field','value_field','unit']
        }
      }
    },
    required: ['title','answer','warnings','charts']
  };
}
function semanticOntologyText() {
  return `VOCABULARIO SEMANTICO DE CONTROLEVENT (NO ES SQL):
DOMINIOS:
- EVENTS: ficha/lista de eventos (título, fechas, estado, precio, descripción).
- PEOPLE: catálogo maestro actual de personas y su rango actual.
- CANONICAL_SOCIOS: censo canónico de socios con el MISMO criterio que ColtyLAB: rango SOCIO, excluye filas técnicas cuyos nombres empiezan por z_DEV, Grupo, Peña o Personas; si existe una pareja/grupo escrita con « y », se conserva esa pareja y no se duplican sus integrantes como socios individuales. Con evento activo, el snapshot histórico del evento puede sobrescribir nombre/rango de esa persona.
- PARTICIPATION: presencia de una persona en eventos a través de sus registros de colaboración/ingreso.
- INCOMES: ingresos/aportaciones por persona y evento. Importe total = obligatorio de SOCIO (numero * precio evento) + aportación voluntaria. Para NO SOCIO el obligatorio es 0.
- PURCHASES: compras/gastos. Importe = unidades * precio. Por defecto excluye DONADO. status=realized excluye Pte. Compra/PENDIENTE; status=pending incluye solo pendientes; status=all incluye realizadas+pendientes pero nunca donaciones.
- DONATIONS: líneas DONADO SOCIO / DONADO TIENDA / DONADO OTROS. Son valor de producto, no dinero de caja.
- PRODUCTS: catálogo de productos, segmento, destino y precio de referencia.
- STORES: catálogo de tiendas.
- TICKETS: evidencias/fotos de TKxx.
- DOCUMENTS: documentos/evidencias DOCxx.
- HITOS y LG: objetivos y tareas del evento; LG tiene responsable, fechas, cumplimiento y dependencias.
- BANK: movimientos bancarios del evento cuando se pide expresamente conciliación/banco.

DIMENSIONES PERMITIDAS: ${ZUZU_SEMANTIC_DIMENSIONS.join(', ')}.
METRICAS PERMITIDAS: ${ZUZU_SEMANTIC_METRICS.join(', ')}.

CONCEPTOS IMPORTANTES:
- "este evento" = evento activo en pantalla.
- "todos los eventos" = no limitar al evento activo.
- asistencia/participación no equivale a número de filas administrativas. Si se pide en qué eventos «participó/asistió» una persona, usa PARTICIPATION con status=realized salvo que el usuario pida también pendientes/registros administrativos.
- "socio canónico", "socios canónicos" y "mismo criterio que ColtyLAB" SON conceptos definidos de ControlEvent: usa CANONICAL_SOCIOS. No preguntes al usuario qué significa si usa esas expresiones.
- Los nombres humanos no son claves. "ALMACEN", "almacén", "El Almacén" pueden referirse a la misma tienda. Devuelve filtro field=store,value=<texto humano>; CE resolverá el id real.
- Igual para personas, productos, responsables y eventos: tú expresas el concepto; CE resuelve la entidad.
- Si una entidad humana parece ambigua, intenta primero resolverla con los candidatos reales de ControlEvent. Pide aclaración SOLO si hay dos o más candidatos plausibles y elegir uno u otro cambiaría materialmente la respuesta. No preguntes por conceptos que la ontología ya define ni por una referencia explícita a una pantalla/criterio de ControlEvent.
- Para una pregunta abierta sobre una persona (ej. «Háblame de Ernesto»), planifica primero PARTICIPATION con fechas de los eventos y después INCOMES; añade PURCHASES como responsable, DONATIONS como donante/responsable y LG como responsable solo si ayudan a describir realmente a esa persona. No uses métricas de conteo por evento si una lista con fechas es más informativa. Después podrás decidir si necesitas más.
- Para «informe detallado/gráfico de este evento», NO pidas una consulta gigante. Divide en consultas pequeñas: EVENTS; INCOMES; PURCHASES; DONATIONS; PARTICIPATION; agrupación de PURCHASES por tienda/destino; TICKETS/DOCUMENTS; HITOS/LG si existen. BANK solo si el usuario lo pide o es esencial para el informe solicitado.
- Para un sumatorio por tienda y evento, usa PURCHASES status=realized, filtro store, group_by=[event], metrics=[amount,line_count], include_total=true. Si dice «todos los eventos registrados», include_empty=true.
- Si el usuario solo quiere una lista, evita métricas irrelevantes, incluye los campos descriptivos útiles (por ejemplo fechas del evento) y marca show_table=true.
- Si pregunta «en qué eventos participó/asistió X», usa PARTICIPATION sin métricas, detail_fields=[event,event_start,event_end] y orden temporal. No hagas una gráfica de barras con valores 1.
- Para preguntas abiertas como «Háblame de X», la respuesta final debe ser una síntesis humana de lo relevante; las tablas son soporte, no sustituyen la respuesta.
- La palabra «informe» no autoriza a añadir módulos no relacionados con el objeto concreto pedido.
- Prefiere de 1 a 8 consultas pequeñas. Nunca una consulta que intente unir varias tablas de hechos a la vez.`;
}
function semanticPlannerPrompt(userPrompt, state, selectedEventId = '') {
  const catalog = buildZuzuPlanningCatalog(state, selectedEventId, userPrompt);
  const active = catalog?.eventoActivo;
  const eventList = arr(catalog?.eventos).map(e => `${trim(e.titulo)} | id=${trim(e.id)} | ${trim(e.fechaInicio)}-${trim(e.fechaFin)} | ${trim(e.situacion)}`).join('\n');
  const candidates = catalog?.candidatosPorPrompt || {};
  const tiendas = arr(candidates.tiendas).map(x => trim(x?.nombre)).filter(Boolean).join(' | ') || 'NINGUNA';
  const productos = arr(candidates.productos).map(x => trim(x?.nombre)).filter(Boolean).join(' | ') || 'NINGUNO';
  const personas = arr(candidates.personas).map(x => trim(x?.nombre)).filter(Boolean).join(' | ') || 'NINGUNA';
  return `Eres Gemini, cerebro SEMANTICO de Zuzu. NO escribas SQL. NO calcules cifras. NO redactes todavía la respuesta final.
Tu trabajo es entender exactamente qué quiere el usuario y pedir a ControlEvent los conjuntos de datos necesarios mediante un PLAN SEMANTICO.

PREGUNTA ORIGINAL:
${trim(userPrompt)}

EVENTO ACTIVO:
${active?.id ? `${trim(active.titulo)} | id=${trim(active.id)}` : 'NINGUNO'}

EVENTOS REGISTRADOS:
${eventList}

CANDIDATOS DE ENTIDADES DETECTADOS EN EL TEXTO:
TIENDAS: ${tiendas}
PRODUCTOS: ${productos}
PERSONAS: ${personas}

${semanticOntologyText()}

REGLAS DE PLANIFICACION:
- action=query si entiendes la intención; action=clarify si un término esencial es ambiguo y no puede resolverse sin preguntar.
- En queries usa SOLO dominios, dimensiones y métricas del vocabulario. ControlEvent rechazará cualquier otra cosa.
- scope: active_event, all_events, named_events o year. Si scope=named_events rellena event_names. Si scope=year rellena year.
- filters usa field semántico: store, product, person, responsible, donor, range, payment_status, ticket, segment, destination, event_state, donation_type, task_status.
- operator normalmente exact o contains. Para entidades humanas CE resolverá por catálogo; no intentes fabricar ids.
- status para PURCHASES: realized/pending/all. Para INCOMES: realized/pending/all. Para LG: completed/open/all.
- group_by y detail_fields usan dimensiones permitidas.
- metrics usa métricas permitidas.
- include_total=true cuando el usuario pida sumatorio/global además de agrupación.
- include_empty=true si el usuario dice explícitamente «todos los eventos registrados» y quiere que también aparezcan eventos sin coincidencias con valor 0.
- show_table=true solo para datos que merece la pena mostrar al usuario; consultas de apoyo pueden ir false.
- wants_charts=true SOLO si el usuario pide explícitamente gráfico/gráfica/visualización. No generes gráficas por iniciativa propia en listas, búsquedas de personas o respuestas breves.
- Si la petición es amplia, divide el trabajo. Si es concreta, no la infles.
- No uses include_total salvo que el usuario pida expresamente suma, sumatorio, total, totalizado, acumulado o equivalente.
- Si el usuario menciona «socios canónicos» o «criterio ColtyLAB», usa CANONICAL_SOCIOS y no action=clarify.

Devuelve JSON estricto con action, clarification, intent, scope_summary, queries, wants_charts y rationale.`;
}
function semanticCleanToken(value) {
  return norm(value).replace(/\b(el|la|los|las|un|una|unos|unas|tienda|establecimiento)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function semanticCatalogRows(state, type) {
  if (type === 'event') return arr(state?.eventos).map(x => ({ id: trim(x?.id), nombre: trim(x?.titulo) })).filter(x => x.id && x.nombre);
  if (type === 'store') return arr(state?.tiendas).map(x => ({ id: trim(x?.id), nombre: trim(x?.nombre) })).filter(x => x.id && x.nombre);
  if (type === 'product') return arr(state?.productos).map(x => ({ id: trim(x?.id), nombre: trim(x?.nombre) })).filter(x => x.id && x.nombre);
  if (type === 'person' || type === 'responsible' || type === 'donor') return arr(state?.personas).map(x => ({ id: trim(x?.id), nombre: trim(x?.nombre) })).filter(x => x.id && x.nombre);
  return [];
}
function semanticEntityScore(needle, candidate) {
  const a = semanticCleanToken(needle), b = semanticCleanToken(candidate);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (b.endsWith(` ${a}`) || b.startsWith(`${a} `) || b.includes(` ${a} `)) return 0.94;
  if (a.includes(b) || b.includes(a)) return Math.min(0.92, 0.72 + Math.min(a.length,b.length) / Math.max(a.length,b.length) * 0.18);
  const at = a.split(' ').filter(Boolean), bt = new Set(b.split(' ').filter(Boolean));
  const overlap = at.filter(t => bt.has(t)).length;
  if (overlap && overlap === at.length) return 0.82 + Math.min(0.08, overlap * 0.02);
  return 0;
}
function semanticResolveEntity(state, type, value) {
  const rows = semanticCatalogRows(state, type);
  const scored = rows.map(row => ({ ...row, score: semanticEntityScore(value, row.nombre) })).filter(x => x.score >= 0.72).sort((a,b) => b.score - a.score || a.nombre.localeCompare(b.nombre,'es'));
  if (!scored.length) return { ok: false, ambiguous: false, value: trim(value), type, candidates: [] };
  const top = scored[0];
  const near = scored.filter(x => top.score - x.score <= 0.035);
  if (near.length > 1 && top.score < 0.995) return { ok: false, ambiguous: true, value: trim(value), type, candidates: near.slice(0,5) };
  return { ok: true, id: top.id, nombre: top.nombre, score: top.score, type, candidates: scored.slice(0,5) };
}
function semanticSqlLiteral(value) { return `'${text(value).replace(/'/g,"''")}'`; }
function semanticNormExpr(expr) { return `UPPER(TRANSLATE(TRIM(COALESCE(${expr},'')), 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNAEIOUUN'))`; }
function semanticSqlLike(expr, value) { return `${semanticNormExpr(expr)} LIKE ${semanticSqlLiteral(`%${semanticCleanToken(value).toUpperCase().replace(/\s+/g,'%')}%`)}`; }
function semanticUnique(list) { const out=[]; arr(list).forEach(x=>{ const v=trim(x); if(v && !out.includes(v)) out.push(v); }); return out; }
function semanticNormalizeQuery(raw, index = 0) {
  const domain = trim(raw?.domain).toUpperCase();
  if (!ZUZU_SEMANTIC_DOMAINS.includes(domain)) throw new Error(`Dominio semántico no permitido: ${domain || 'vacío'}`);
  const groupBy = semanticUnique(raw?.group_by).filter(x => ZUZU_SEMANTIC_DIMENSIONS.includes(x));
  const detailFields = semanticUnique(raw?.detail_fields).filter(x => ZUZU_SEMANTIC_DIMENSIONS.includes(x));
  const metrics = semanticUnique(raw?.metrics).filter(x => ZUZU_SEMANTIC_METRICS.includes(x));
  const scopeRaw = trim(raw?.scope).toLowerCase();
  const scope = ['active_event','all_events','named_events','year'].includes(scopeRaw) ? scopeRaw : 'active_event';
  return {
    id: trim(raw?.id) || `q${index+1}`,
    title: trim(raw?.title) || `Consulta ${index+1}`,
    domain,
    scope,
    event_names: semanticUnique(raw?.event_names).slice(0,20),
    year: Math.max(0, Number(raw?.year)||0),
    status: trim(raw?.status || 'all').toLowerCase(),
    filters: arr(raw?.filters).slice(0,12).map(f=>({ field:trim(f?.field).toLowerCase(), value:trim(f?.value), operator:trim(f?.operator||'exact').toLowerCase() })).filter(f=>f.field && f.value),
    group_by: groupBy,
    metrics,
    detail_fields: detailFields,
    include_total: raw?.include_total === true,
    include_empty: raw?.include_empty === true,
    sort: trim(raw?.sort || '').toLowerCase(),
    limit: Math.max(1, Math.min(300, Number(raw?.limit)||80)),
    show_table: raw?.show_table !== false
  };
}
function semanticSafePlan(parsed) {
  const action = trim(parsed?.action).toLowerCase();
  const queries = arr(parsed?.queries).slice(0,10).map((q,i)=>semanticNormalizeQuery(q,i));
  if (action === 'clarify') return { action:'clarify', clarification:trim(parsed?.clarification) || 'Necesito concretar un término antes de consultar los datos.', queries:[], intent:trim(parsed?.intent), scopeSummary:trim(parsed?.scope_summary), wantsCharts:false, rationale:trim(parsed?.rationale) };
  if (!queries.length) throw new Error('Gemini no ha pedido ningún conjunto de datos semántico.');
  return { action:'query', clarification:'', queries, intent:trim(parsed?.intent), scopeSummary:trim(parsed?.scope_summary), wantsCharts:parsed?.wants_charts===true, rationale:trim(parsed?.rationale) };
}

function semanticPromptExplicitlyRequestsCharts(userPrompt) {
  return /\b(gr[aá]fic[oa]s?|visualizaci[oó]n|visualizar|chart|diagrama)\b/i.test(text(userPrompt));
}
function v272IsShortAffirmativeFollowUp(userPrompt) {
  const p=norm(userPrompt).replace(/[.!¡¿?]+/g,' ').replace(/\s+/g,' ').trim();
  if(!p || p.split(' ').length>5) return false;
  return /^(si|vale|ok|okay|de acuerdo|adelante|hazlo|perfecto|correcto|eso es|esa|ese|asi es|claro)(?:\s+(?:por favor|gracias))?$/.test(p);
}
function v272ConversationRequestsCharts(userPrompt, conversationHistory=[]) {
  if(semanticPromptExplicitlyRequestsCharts(userPrompt)) return true;
  if(!v272IsShortAffirmativeFollowUp(userPrompt)) return false;
  const last=arr(conversationHistory).slice().reverse().find(x=>trim(x?.assistant)||trim(x?.user));
  if(!last) return false;
  const assistantContext=`${trim(last?.assistant)} ${trim(last?.title)}`.trim();
  const prior=assistantContext||trim(last?.user);
  return semanticPromptExplicitlyRequestsCharts(prior) || /\b(curva|barras|tarta|donut|evoluci[oó]n\s+(?:del|de)\s+saldo)\b/i.test(prior);
}
function v272AnswerClaimsChart(answer) {
  const a=text(answer);
  return /\b(aqu[ií]\s+tienes|te\s+muestro|he\s+generado|puedes\s+ver|a\s+continuaci[oó]n)\b[^.\n]{0,100}\b(gr[aá]fic[oa]|visualizaci[oó]n|diagrama|curva)\b/i.test(a)
    || /\b(gr[aá]fica|gr[aá]fico)\b[^.\n]{0,80}\b(muestra|desglosa|representa|refleja)\b/i.test(a);
}
function semanticPromptRequestsTotal(userPrompt) {
  return /\b(sumatorio|sumar|suma\s+de|total(?:es|izado|izada|izar)?|acumulad[oa]|importe\s+total|total\s+general)\b/i.test(text(userPrompt));
}
function semanticIsParticipationEventListPrompt(userPrompt) {
  const p=norm(userPrompt);
  return /\beventos?\b/.test(p) && /\b(particip\w*|asist\w*|estado\s+en)\b/.test(p);
}
function semanticIsOpenPersonPrompt(userPrompt) {
  const p=norm(userPrompt);
  return /^(hablame|háblame|dime\s+(?:algo|cosas?)\s+(?:de|sobre)|que\s+sabes\s+de|qué\s+sabes\s+de|informacion\s+sobre|información\s+sobre)\b/.test(p);
}
function semanticIsCanonicalSociosPrompt(userPrompt) {
  const p=norm(userPrompt);
  return /socios?\s+canonicos?/.test(p) || (/coltylab/.test(p) && /\bsocios?\b/.test(p));
}
function semanticApplyQualityPolicy(plan,userPrompt) {
  const out={...plan,queries:arr(plan?.queries).map(q=>({...q,filters:arr(q.filters).map(f=>({...f})),group_by:[...arr(q.group_by)],metrics:[...arr(q.metrics)],detail_fields:[...arr(q.detail_fields)]}))};
  const explicitCharts=semanticPromptExplicitlyRequestsCharts(userPrompt);
  const asksTotal=semanticPromptRequestsTotal(userPrompt);
  if(semanticIsCanonicalSociosPrompt(userPrompt)){
    return {
      ...out,
      action:'query',
      clarification:'',
      intent:out.intent||'Listar socios canónicos según el criterio real de ColtyLAB',
      scopeSummary:out.scopeSummary||'Censo canónico de socios',
      wantsCharts:false,
      queries:[{
        id:'socios_canonicos',
        title:'Socios canónicos · criterio ColtyLAB',
        domain:'CANONICAL_SOCIOS',
        scope:'active_event',
        event_names:[],
        year:0,
        status:'all',
        filters:[],
        group_by:[],
        metrics:[],
        detail_fields:['person'],
        include_total:false,
        include_empty:false,
        sort:'name',
        limit:300,
        show_table:true
      }]
    };
  }
  out.wantsCharts=explicitCharts;
  out.queries=out.queries.map(q=>{
    const x={...q};
    if(!asksTotal)x.include_total=false;
    if(semanticIsParticipationEventListPrompt(userPrompt) && x.domain==='PARTICIPATION'){
      const person=trim(arr(x.filters).find(f=>f.field==='person')?.value||'');
      x.title=person?`Eventos con participación de ${person}`:'Eventos con participación';
      x.group_by=[]; x.metrics=[]; x.detail_fields=['event','event_start','event_end']; x.include_total=false; x.sort='event_date'; x.show_table=true; x.limit=Math.max(80,x.limit||80);
    }
    if(semanticIsOpenPersonPrompt(userPrompt) && x.domain==='PARTICIPATION'){
      const person=trim(arr(x.filters).find(f=>f.field==='person')?.value||'');
      x.title=person?`Participación de ${person} en eventos`:'Participación en eventos';
      x.group_by=[]; x.metrics=[]; x.detail_fields=['event','event_start','event_end','payment_status']; x.include_total=false; x.sort='event_date'; x.show_table=true; x.limit=Math.max(80,x.limit||80);
    }
    if(semanticIsOpenPersonPrompt(userPrompt) && x.domain==='INCOMES'){
      const person=trim(arr(x.filters).find(f=>f.field==='person')?.value||'');
      x.title=person?`Ingresos de ${person} en eventos`:'Ingresos por evento';
      x.group_by=['event']; x.metrics=['amount','mandatory_amount','voluntary_amount']; x.detail_fields=[]; x.include_total=false; x.sort='event_date'; x.show_table=true; x.limit=Math.max(80,x.limit||80);
    }
    return x;
  });
  return out;
}
async function callGeminiSemanticPlanner(userPrompt, state, selectedEventId, flowTrace = []) {
  const apiKey = geminiKey();
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY para que Gemini interprete la petición.');
  const promptText = semanticPlannerPrompt(userPrompt, state, selectedEventId);
  let lastError = null;
  for (const model of configuredGeminiModelsForTask('zuzu-planner', { prompt:userPrompt })) {
    try {
      zuzuTracePush(flowTrace,'Paso 1 · Gemini interpreta','RUN',`Modelo ${model}. Gemini devuelve intención y plan semántico; no SQL.`);
      sizeTrace(flowTrace,'Paso 1 · Gemini interpreta','Contexto semántico enviado',promptText);
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const body={contents:[{role:'user',parts:[{text:promptText}]}],generationConfig:{responseMimeType:'application/json',responseSchema:semanticPlanSchema(),temperature:0.05,maxOutputTokens:3000,thinkingConfig:{thinkingBudget:0}}};
      const {res,payload}=await geminiFetchJsonWithTimeout(url,body,apiKey,Number(process.env.CONTROLEVENT_ZUZU_PLANNER_TIMEOUT_MS||22000));
      logGeminiUsage('PASO 1 AGENTE SEMANTICO',model,payload);
      if(!res.ok){const e=new Error(payload?.error?.message||`Gemini planner HTTP ${res.status}`);e.status=Number(res.status||502);e.details=payload;throw e;}
      const parsed=JSON.parse(trim(geminiOutText(payload)));
      const plan=semanticApplyQualityPolicy(semanticSafePlan(parsed),userPrompt); plan.model=model; plan.usage=usageSmall(payload,model);
      zuzuTracePush(flowTrace,'Paso 1 · Gemini interpreta','OK',plan.action==='clarify'?`Gemini pide aclaración: ${plan.clarification}`:`Plan semántico: ${plan.queries.length} consulta(s) · ${plan.queries.map(q=>q.domain).join(', ')}`,{model,usage:plan.usage});
      return plan;
    } catch(error){ lastError=error; zuzuTracePush(flowTrace,'Paso 1 · Gemini interpreta','KO',cleanGeminiError(error),{model}); if(isQuotaError(error)||!isRetryable(error)) break; }
  }
  throw lastError||new Error('Gemini no pudo construir un plan semántico.');
}
function semanticScopeConditions(query, state, selectedEventId, alias='e') {
  const cond=[]; const resolved=[];
  if(query.scope==='active_event'){
    const id=trim(selectedEventId||state?.selectedEventId||'');
    if(!id) return {error:'No hay evento activo y la petición depende de «este evento».',conditions:[],resolved:[]};
    cond.push(`${alias}.id=${semanticSqlLiteral(id)}`); resolved.push({type:'event',id,nombre:trim(arr(state?.eventos).find(x=>trim(x?.id)===id)?.titulo||id)});
  } else if(query.scope==='named_events'){
    const ids=[];
    for(const name of query.event_names){ const r=semanticResolveEntity(state,'event',name); if(!r.ok) return {error:r.ambiguous?`El evento «${name}» es ambiguo: ${r.candidates.map(x=>x.nombre).join(' / ')}`:`No encuentro con seguridad el evento «${name}».`,conditions:[],resolved}; ids.push(r.id); resolved.push(r); }
    if(!ids.length) return {error:'El plan pide eventos concretos pero no ha indicado ninguno.',conditions:[],resolved};
    cond.push(`${alias}.id IN (${ids.map(semanticSqlLiteral).join(',')})`);
  } else if(query.scope==='year'){
    const y=Math.trunc(query.year); if(!y||y<2000||y>2100) return {error:'El año solicitado no es válido.',conditions:[],resolved};
    cond.push(`(EXTRACT(YEAR FROM ${alias}.fecha_ini)=${y} OR EXTRACT(YEAR FROM ${alias}.fecha_fin)=${y})`);
  }
  return {conditions:cond,resolved};
}
function semanticFilterConditions(query,state,ctx={}){
  const cond=[]; const resolved=[];
  for(const f of arr(query.filters)){
    const field=f.field, value=f.value;
    if(['store','product','person','responsible'].includes(field)){
      const type=field==='store'?'store':field==='product'?'product':field==='person'?'person':'responsible';
      const r=semanticResolveEntity(state,type,value);
      if(!r.ok) return {error:r.ambiguous?`«${value}» puede referirse a varias ${type==='person'||type==='responsible'?'personas':'entidades'}: ${r.candidates.map(x=>x.nombre).join(' / ')}`:`No encuentro con seguridad ${field==='store'?'la tienda':field==='product'?'el producto':'la persona'} «${value}».`,conditions:[],resolved};
      resolved.push({...r,field});
      if(field==='store'){
        if(['PURCHASES','DONATIONS','TICKETS'].includes(query.domain)) cond.push(`c.tienda_id=${semanticSqlLiteral(r.id)}`);
        else if(query.domain==='STORES') cond.push(`t.id=${semanticSqlLiteral(r.id)}`);
        else if(query.domain==='PRODUCTS') cond.push(`pr.default_tienda_id=${semanticSqlLiteral(r.id)}`);
      } else if(field==='product'){
        if(['PURCHASES','DONATIONS','TICKETS'].includes(query.domain)) cond.push(`c.producto_id=${semanticSqlLiteral(r.id)}`);
        else if(query.domain==='PRODUCTS') cond.push(`pr.id=${semanticSqlLiteral(r.id)}`);
      } else if(field==='responsible'){
        if(['PURCHASES','DONATIONS','TICKETS'].includes(query.domain)) cond.push(`c.responsable_id=${semanticSqlLiteral(r.id)}`);
        else if(query.domain==='LG') cond.push(`l.responsable_id=${semanticSqlLiteral(r.id)}`);
        else if(query.domain==='HITOS') cond.push(`h.responsable_id=${semanticSqlLiteral(r.id)}`);
      } else if(field==='person'){
        if(query.domain==='PEOPLE') cond.push(`p.id=${semanticSqlLiteral(r.id)}`);
        else if(['PARTICIPATION','INCOMES'].includes(query.domain)) cond.push(`c.persona_id=${semanticSqlLiteral(r.id)}`);
        else if(query.domain==='LG') cond.push(`l.responsable_id=${semanticSqlLiteral(r.id)}`);
        else if(query.domain==='HITOS') cond.push(`h.responsable_id=${semanticSqlLiteral(r.id)}`);
      }
    } else if(field==='donor'){
      if(!['DONATIONS','PURCHASES'].includes(query.domain)) continue;
      const pr=semanticResolveEntity(state,'person',value), st=semanticResolveEntity(state,'store',value);
      const terms=[];
      if(pr.ok){terms.push(`c.donor_ref=${semanticSqlLiteral(`P:${pr.id}`)}`);resolved.push({...pr,field});}
      if(st.ok){terms.push(`c.donor_ref=${semanticSqlLiteral(`T:${st.id}`)}`);resolved.push({...st,field});}
      if(!terms.length) terms.push(semanticSqlLike('c.donor_ref',value));
      cond.push(`(${terms.join(' OR ')})`);
    } else if(field==='range'){
      if(query.domain==='PEOPLE') cond.push(`${semanticNormExpr('p.rango')}=${semanticSqlLiteral(semanticCleanToken(value).toUpperCase())}`);
      else if(['PARTICIPATION','INCOMES'].includes(query.domain)) cond.push(`${semanticNormExpr("COALESCE(s.rango_snapshot,p.rango,'')")}=${semanticSqlLiteral(semanticCleanToken(value).toUpperCase())}`);
    } else if(field==='payment_status' && ['PARTICIPATION','INCOMES'].includes(query.domain)) cond.push(`${semanticNormExpr('c.situacion')} LIKE ${semanticSqlLiteral(`%${semanticCleanToken(value).toUpperCase()}%`)}`);
    else if(field==='ticket' && ['PURCHASES','DONATIONS','TICKETS'].includes(query.domain)) cond.push(semanticSqlLike('c.ticket_donacion',value));
    else if(field==='segment' && ['PURCHASES','DONATIONS','PRODUCTS','TICKETS'].includes(query.domain)) cond.push(semanticSqlLike('pr.segmento',value));
    else if(field==='destination' && ['PURCHASES','DONATIONS','PRODUCTS','TICKETS'].includes(query.domain)) cond.push(semanticSqlLike('pr.destino',value));
    else if(field==='event_state' && !['PEOPLE','PRODUCTS','STORES'].includes(query.domain)) cond.push(semanticSqlLike('e.situacion',value));
    else if(field==='donation_type' && ['PURCHASES','DONATIONS'].includes(query.domain)) cond.push(semanticSqlLike('c.ticket_donacion',value));
    else if(field==='task_status' && query.domain==='LG'){
      const nv=semanticCleanToken(value); if(/cumpl|complet|hech/.test(nv)) cond.push('l.cumplida=TRUE'); else if(/pend|abiert|no/.test(nv)) cond.push('(l.cumplida IS DISTINCT FROM TRUE)');
    }
  }
  return {conditions:cond,resolved};
}
function semanticPurchaseClassCondition(domain,status){
  const t=`${semanticNormExpr('c.ticket_donacion')}`;
  if(domain==='DONATIONS') return `${t} LIKE 'DONADO%'`;
  const notDonation=`${t} NOT LIKE 'DONADO%'`;
  if(status==='pending') return `${notDonation} AND (${t} LIKE '%PTE%COMPRA%' OR ${t} LIKE '%PENDIENTE%')`;
  if(status==='realized') return `${notDonation} AND NOT (${t} LIKE '%PTE%COMPRA%' OR ${t} LIKE '%PENDIENTE%')`;
  return notDonation;
}
function semanticIncomeStatusCondition(status){
  const st=semanticNormExpr('c.situacion');
  if(status==='pending') return `${st}='PENDIENTE'`;
  if(status==='realized') return `${st} IN ('BANCO','EFECTIVO','BIZUM','EXENTO','INVITADO','CONFIRMADO','ASISTE','SI','PAGADO')`;
  return 'TRUE';
}
function semanticDimensionExpr(domain,dim){
  const domainsWithEvent=['EVENTS','INCOMES','PARTICIPATION','PURCHASES','DONATIONS','LG','HITOS','TICKETS','DOCUMENTS','BANK'];
  if(domainsWithEvent.includes(domain) && dim==='event') return {expr:'e.titulo',alias:'Evento'};
  if(domainsWithEvent.includes(domain) && dim==='event_state') return {expr:'e.situacion',alias:'Estado'};
  if(domain==='EVENTS' && dim==='description') return {expr:`COALESCE(e.descripcion,'')`,alias:'Descripción'};
  if(['EVENTS','INCOMES','PARTICIPATION','PURCHASES','DONATIONS','TICKETS'].includes(domain) && dim==='event_start') return {expr:'e.fecha_ini',alias:'Fecha inicio'};
  if(['EVENTS','INCOMES','PARTICIPATION','PURCHASES','DONATIONS','TICKETS'].includes(domain) && dim==='event_end') return {expr:'e.fecha_fin',alias:'Fecha fin'};
  if(['INCOMES','PARTICIPATION'].includes(domain)){
    const m={person:`COALESCE(s.nombre_snapshot,p.nombre,c.persona_id)`,range:`COALESCE(s.rango_snapshot,p.rango,'')`,payment_status:`c.situacion`};
    if(m[dim]) return {expr:m[dim],alias:{person:'Persona',range:'Rango',payment_status:'Estado ingreso'}[dim]};
  }
  if(['PURCHASES','DONATIONS'].includes(domain)){
    const donor=`CASE WHEN c.donor_ref LIKE 'P:%' THEN COALESCE(dp.nombre,c.donor_ref) WHEN c.donor_ref LIKE 'T:%' THEN COALESCE(dt.nombre,c.donor_ref) ELSE COALESCE(c.donor_ref,'') END`;
    const m={store:`COALESCE(t.nombre,'Sin tienda')`,product:`COALESCE(pr.nombre,'Sin producto')`,responsible:`COALESCE(r.nombre,'Sin responsable')`,ticket:`COALESCE(c.ticket_donacion,'')`,segment:`COALESCE(pr.segmento,'Sin segmento')`,destination:`COALESCE(pr.destino,'Sin destino')`,donation_type:`COALESCE(c.ticket_donacion,'')`,person:donor};
    if(m[dim]) return {expr:m[dim],alias:{store:'Tienda',product:'Producto',responsible:'Responsable',ticket:'TKxx',segment:'Segmento',destination:'Destino',donation_type:'Tipo donación',person:'Donante'}[dim]};
  }
  if(domain==='CANONICAL_SOCIOS'){
    const m={person:'p.nombre',range:'p.rango'}; if(m[dim]) return {expr:m[dim],alias:dim==='person'?'Socio canónico':'Rango'};
  }
  if(domain==='PEOPLE'){
    const m={person:'p.nombre',range:'p.rango'}; if(m[dim]) return {expr:m[dim],alias:dim==='person'?'Persona':'Rango'};
  }
  if(domain==='PRODUCTS'){
    const m={product:'pr.nombre',segment:'pr.segmento',destination:'pr.destino',store:`COALESCE(t.nombre,'')`}; if(m[dim]) return {expr:m[dim],alias:{product:'Producto',segment:'Segmento',destination:'Destino',store:'Tienda referencia'}[dim]};
  }
  if(domain==='STORES' && dim==='store') return {expr:'t.nombre',alias:'Tienda'};
  if(domain==='LG'){
    const m={event:'e.titulo',hito:`COALESCE(h.nombre_hito,'')`,task:'l.descripcion',responsible:`COALESCE(l.responsable_nombre,p.nombre,'')`,task_status:`CASE WHEN l.cumplida=TRUE THEN 'Cumplida' ELSE 'Pendiente' END`,event_start:'l.fecha_minima',event_end:'l.fecha_maxima'};
    if(m[dim]) return {expr:m[dim],alias:{event:'Evento',hito:'Hito',task:'LG',responsible:'Responsable',task_status:'Estado tarea',event_start:'Fecha mínima',event_end:'Fecha máxima'}[dim]};
  }
  if(domain==='HITOS'){
    const m={event:'e.titulo',hito:'h.nombre_hito',responsible:`COALESCE(h.responsable_nombre,p.nombre,'')`,event_start:'h.fecha_minima',event_end:'h.fecha_maxima'};
    if(m[dim]) return {expr:m[dim],alias:{event:'Evento',hito:'Hito',responsible:'Responsable',event_start:'Fecha mínima',event_end:'Fecha máxima'}[dim]};
  }
  if(domain==='TICKETS'){
    const m={ticket:`COALESCE(c.ticket_donacion,'')`,store:`COALESCE(t.nombre,'Sin tienda')`,product:`COALESCE(pr.nombre,'Sin producto')`,responsible:`COALESCE(r.nombre,'Sin responsable')`,segment:`COALESCE(pr.segmento,'Sin segmento')`,destination:`COALESCE(pr.destino,'Sin destino')`};
    if(m[dim]) return {expr:m[dim],alias:{ticket:'TKxx',store:'Tienda',product:'Producto',responsible:'Responsable',segment:'Segmento',destination:'Destino'}[dim]};
  }
  if(domain==='DOCUMENTS'){
    const m={ticket:`COALESCE(d->>'codigo',d->>'imageKey',d->>'id','DOC')`,event_start:`COALESCE(d->>'fecha','')`,description:`COALESCE(d->>'descripcion',d->>'description','')`};
    if(m[dim]) return {expr:m[dim],alias:{ticket:'Documento',event_start:'Fecha',description:'Descripción'}[dim]};
  }
  if(domain==='BANK'){
    const m={event:'e.titulo',movement_type:`CASE WHEN m.amount>=0 THEN 'Abono' ELSE 'Cargo' END`,bank_description:'m.description',event_start:'m.executed_at'}; if(m[dim]) return {expr:m[dim],alias:{event:'Evento',movement_type:'Tipo movimiento',bank_description:'Concepto',event_start:'Fecha'}[dim]};
  }
  return null;
}
function semanticMetricExpr(domain,metric){
  if(domain==='EVENTS' && metric==='count') return {expr:'COUNT(*)',alias:'Eventos'};
  if(domain==='PEOPLE' && ['count','count_records'].includes(metric)) return {expr:'COUNT(*)',alias:'Personas'};
  if(domain==='CANONICAL_SOCIOS' && ['count','count_records'].includes(metric)) return {expr:'COUNT(*)',alias:'Socios canónicos'};
  if(['INCOMES','PARTICIPATION'].includes(domain)){
    const rango=`${semanticNormExpr("COALESCE(s.rango_snapshot,p.rango,'')")}`;
    const total=`(CASE WHEN ${rango}='SOCIO' THEN COALESCE(c.numero,0)*COALESCE(e.precio,0) ELSE 0 END + COALESCE(c.importe,0))`;
    const m={count:'COUNT(*)',count_records:'COUNT(*)',participants:`COALESCE(SUM(CASE WHEN COALESCE(c.numero,0)>0 THEN c.numero WHEN ${semanticNormExpr('c.situacion')} IN ('BANCO','EFECTIVO','BIZUM','EXENTO','INVITADO','CONFIRMADO','ASISTE','SI','PAGADO') THEN CASE WHEN ${semanticNormExpr("COALESCE(s.nombre_snapshot,p.nombre,'')")} LIKE '% Y %' THEN 2 ELSE 1 END ELSE 0 END),0)`,amount:`COALESCE(SUM(${total}),0)`,mandatory_amount:`COALESCE(SUM(CASE WHEN ${rango}='SOCIO' THEN COALESCE(c.numero,0)*COALESCE(e.precio,0) ELSE 0 END),0)`,voluntary_amount:'COALESCE(SUM(COALESCE(c.importe,0)),0)'};
    if(m[metric]) return {expr:m[metric],alias:{count:'Registros',count_records:'Registros',participants:'Participantes',amount:'Importe',mandatory_amount:'Importe obligatorio',voluntary_amount:'Importe voluntario'}[metric]};
  }
  if(['PURCHASES','DONATIONS'].includes(domain)){
    const m={count:'COUNT(*)',line_count:'COUNT(*)',count_records:'COUNT(*)',units:'COALESCE(SUM(COALESCE(c.unidades,0)),0)',amount:'COALESCE(SUM(COALESCE(c.unidades,0)*COALESCE(c.precio,0)),0)',ticket_count:`COUNT(DISTINCT NULLIF(TRIM(COALESCE(c.ticket_donacion,'')),''))`};
    if(m[metric]) return {expr:m[metric],alias:{count:'Líneas',line_count:'Líneas',count_records:'Líneas',units:'Unidades',amount:'Importe',ticket_count:'Tickets'}[metric]};
  }
  if(domain==='PRODUCTS' && ['count','count_records'].includes(metric)) return {expr:'COUNT(*)',alias:'Productos'};
  if(domain==='STORES' && ['count','count_records'].includes(metric)) return {expr:'COUNT(*)',alias:'Tiendas'};
  if(domain==='LG'){
    const m={count:'COUNT(*)',count_records:'COUNT(*)',completed_count:'COALESCE(SUM(CASE WHEN l.cumplida=TRUE THEN 1 ELSE 0 END),0)',pending_count:'COALESCE(SUM(CASE WHEN l.cumplida=TRUE THEN 0 ELSE 1 END),0)'};
    if(m[metric]) return {expr:m[metric],alias:{count:'LG',count_records:'LG',completed_count:'Cumplidas',pending_count:'Pendientes'}[metric]};
  }
  if(domain==='HITOS' && ['count','count_records'].includes(metric)) return {expr:'COUNT(*)',alias:'Hitos'};
  if(domain==='TICKETS'){
    const m={count:`COUNT(DISTINCT NULLIF(TRIM(COALESCE(c.ticket_donacion,'')),''))`,count_records:'COUNT(*)',ticket_count:`COUNT(DISTINCT NULLIF(TRIM(COALESCE(c.ticket_donacion,'')),''))`,line_count:'COUNT(*)',amount:'COALESCE(SUM(COALESCE(c.unidades,0)*COALESCE(c.precio,0)),0)'};
    if(m[metric]) return {expr:m[metric],alias:{count:'Tickets',count_records:'Líneas',ticket_count:'Tickets',line_count:'Líneas',amount:'Importe'}[metric]};
  }
  if(domain==='DOCUMENTS' && ['count','count_records'].includes(metric)) return {expr:'COUNT(*)',alias:'Documentos'};
  if(domain==='BANK'){
    const m={count:'COUNT(*)',count_records:'COUNT(*)',amount:'COALESCE(SUM(m.amount),0)',credits:'COALESCE(SUM(CASE WHEN m.amount>0 THEN m.amount ELSE 0 END),0)',debits:'COALESCE(SUM(CASE WHEN m.amount<0 THEN -m.amount ELSE 0 END),0)'};
    if(m[metric]) return {expr:m[metric],alias:{count:'Movimientos',count_records:'Movimientos',amount:'Variación',credits:'Abonos',debits:'Cargos'}[metric]};
  }
  return null;
}
function semanticBaseForDomain(domain){
  if(domain==='EVENTS') return {from:'ce_eventos e',eventAlias:'e'};
  if(['INCOMES','PARTICIPATION'].includes(domain)) return {from:'ce_colaboradores c JOIN ce_eventos e ON e.id=c.event_id LEFT JOIN ce_event_person_snapshots s ON s.event_id=c.event_id AND s.persona_id=c.persona_id LEFT JOIN ce_personas p ON p.id=c.persona_id',eventAlias:'e'};
  if(['PURCHASES','DONATIONS'].includes(domain)) return {from:"ce_compras c JOIN ce_eventos e ON e.id=c.event_id LEFT JOIN ce_productos pr ON pr.id=c.producto_id LEFT JOIN ce_tiendas t ON t.id=c.tienda_id LEFT JOIN ce_personas r ON r.id=c.responsable_id LEFT JOIN ce_personas dp ON c.donor_ref=('P:'||dp.id) LEFT JOIN ce_tiendas dt ON c.donor_ref=('T:'||dt.id)",eventAlias:'e'};
  if(domain==='CANONICAL_SOCIOS') return {from:'ce_personas p',eventAlias:'',postprocess:'canonical_socios'};
  if(domain==='PEOPLE') return {from:'ce_personas p',eventAlias:''};
  if(domain==='PRODUCTS') return {from:'ce_productos pr LEFT JOIN ce_tiendas t ON t.id=pr.default_tienda_id',eventAlias:''};
  if(domain==='STORES') return {from:'ce_tiendas t',eventAlias:''};
  if(domain==='LG') return {from:'ce_lg l JOIN ce_eventos e ON e.id=l.event_id LEFT JOIN ce_hitos h ON h.id=l.hito_id LEFT JOIN ce_personas p ON p.id=l.responsable_id',eventAlias:'e'};
  if(domain==='HITOS') return {from:'ce_hitos h JOIN ce_eventos e ON e.id=h.event_id LEFT JOIN ce_personas p ON p.id=h.responsable_id',eventAlias:'e'};
  if(domain==='TICKETS') return {from:"ce_compras c JOIN ce_eventos e ON e.id=c.event_id LEFT JOIN ce_productos pr ON pr.id=c.producto_id LEFT JOIN ce_tiendas t ON t.id=c.tienda_id LEFT JOIN ce_personas r ON r.id=c.responsable_id",eventAlias:'e',baseCondition:`${semanticPurchaseClassCondition('PURCHASES','realized')} AND ${semanticNormExpr("c.ticket_donacion")} LIKE 'TK%'`};
  if(domain==='DOCUMENTS') return {from:"ce_meta m CROSS JOIN LATERAL jsonb_array_elements(CASE WHEN jsonb_typeof(m.value)='array' THEN m.value ELSE '[]'::jsonb END) d JOIN ce_eventos e ON e.id=COALESCE(d->>'eventId',d->>'event_id')",eventAlias:'e',baseCondition:"m.key='eventDocuments'"};
  if(domain==='BANK') return {from:'ce_bank_event_movement_state bs JOIN ce_eventos e ON e.id=bs.event_id JOIN ce_bank_movements m ON m.id=bs.movement_id',eventAlias:'e',baseCondition:'bs.included=TRUE'};
  throw new Error(`Dominio no implementado: ${domain}`);
}
function semanticDefaultDetails(domain){
  const map={EVENTS:['event','event_start','event_end','event_state'],PEOPLE:['person','range'],CANONICAL_SOCIOS:['person'],PARTICIPATION:['event','person','range','payment_status'],INCOMES:['event','person','range','payment_status'],PURCHASES:['event','store','ticket','product','responsible'],DONATIONS:['event','donation_type','person','product','responsible'],PRODUCTS:['product','segment','destination'],STORES:['store'],TICKETS:['event','ticket','store','responsible'],DOCUMENTS:['event','ticket','event_start','description'],HITOS:['event','hito','responsible','event_start','event_end'],LG:['event','hito','task','responsible','task_status'],BANK:['event','event_start','movement_type','bank_description']};
  return map[domain]||[];
}
function semanticBuildEventZeroFillSql(query,state,selectedEventId){
  if(!query.include_empty || !['PURCHASES','DONATIONS'].includes(query.domain)) return null;
  if(query.group_by.length!==1 || query.group_by[0]!=='event' || !query.metrics.length) return null;
  const unsupportedFilters=arr(query.filters).filter(f=>!['store','product','responsible','donor','ticket','segment','destination','donation_type','event_state'].includes(f.field));
  if(unsupportedFilters.length) return null;
  const scope=semanticScopeConditions(query,state,selectedEventId,'e');
  if(scope.error) return {error:scope.error};
  const eventFilters=[];
  for(const f of arr(query.filters).filter(x=>x.field==='event_state')) eventFilters.push(semanticSqlLike('e.situacion',f.value));
  const factQuery={...query,filters:arr(query.filters).filter(x=>x.field!=='event_state')};
  const fc=semanticFilterConditions(factQuery,state,{});
  if(fc.error) return {error:fc.error};
  const factConditions=[semanticPurchaseClassCondition(query.domain,query.status),...fc.conditions];
  const metricParts=[]; const aliases=[];
  for(const m of query.metrics){const x=semanticMetricExpr(query.domain,m);if(x){metricParts.push(`${x.expr} AS "${x.alias}"`);aliases.push(x.alias);}}
  if(!metricParts.length) return null;
  const factFrom="ce_compras c LEFT JOIN ce_productos pr ON pr.id=c.producto_id LEFT JOIN ce_tiendas t ON t.id=c.tienda_id LEFT JOIN ce_personas r ON r.id=c.responsable_id LEFT JOIN ce_personas dp ON c.donor_ref=('P:'||dp.id) LEFT JOIN ce_tiendas dt ON c.donor_ref=('T:'||dt.id)";
  const fact=`SELECT c.event_id, ${metricParts.join(', ')} FROM ${factFrom} WHERE ${factConditions.map(x=>`(${x})`).join(' AND ')} GROUP BY c.event_id`;
  const outerConditions=[...scope.conditions,...eventFilters];
  const select=['e.titulo AS "Evento"'];
  aliases.forEach(a=>select.push(`COALESCE(f."${a}",0) AS "${a}"`));
  const totalAlias=aliases.find(a=>a==='Importe')||aliases[0];
  if(query.include_total && totalAlias) select.push(`SUM(COALESCE(f."${totalAlias}",0)) OVER () AS "Total general"`);
  let order='';
  if(query.sort==='event_date') order=' ORDER BY e.fecha_ini DESC';
  else if(query.sort==='amount_desc' && aliases.includes('Importe')) order=' ORDER BY "Importe" DESC, e.fecha_ini DESC';
  else if(query.sort==='name') order=' ORDER BY e.titulo';
  else if(totalAlias) order=` ORDER BY "${totalAlias}" DESC, e.fecha_ini DESC`;
  const where=outerConditions.length?` WHERE ${outerConditions.map(x=>`(${x})`).join(' AND ')}`:'';
  const limit=` LIMIT ${Math.max(1,Math.min(300,query.limit||80))}`;
  return {sql:`SELECT ${select.join(', ')} FROM ce_eventos e LEFT JOIN (${fact}) f ON f.event_id=e.id${where}${order}${limit}`,resolved:[...scope.resolved,...fc.resolved],columnsHint:['Evento',...aliases,...(query.include_total?['Total general']:[])]};
}

function semanticBuildCanonicalSociosSql(query,state,selectedEventId){
  const eventId=trim(selectedEventId);
  const rangoExpr=eventId ? "COALESCE(NULLIF(s.rango_snapshot,''),p.rango,'')" : "COALESCE(p.rango,'')";
  const nombreExpr=eventId ? "COALESCE(NULLIF(s.nombre_snapshot,''),p.nombre,'')" : "COALESCE(p.nombre,'')";
  const join=eventId ? ` LEFT JOIN ce_event_person_snapshots s ON s.persona_id=p.id AND s.event_id=${semanticSqlLiteral(eventId)}` : '';
  const where=`${semanticNormExpr(rangoExpr)}='SOCIO'`;
  return {
    sql:`SELECT p.id AS "ID interno", ${nombreExpr} AS "Socio canónico", ${rangoExpr} AS "Rango" FROM ce_personas p${join} WHERE ${where} ORDER BY 2 LIMIT 300`,
    resolved:eventId?[{type:'event',id:eventId,nombre:trim(arr(state?.eventos).find(x=>trim(x?.id)===eventId)?.titulo||eventId)}]:[],
    columnsHint:['Socio canónico','Personas'],
    postprocess:'canonical_socios'
  };
}
function semanticCanonicalSocioRows(rows){
  const clean=arr(rows).map(row=>({
    id:trim(row?.['ID interno']||row?.['ID Interno']||row?.id),
    name:trim(row?.['Socio canónico']||row?.['Socio Canónico']||row?.Persona||row?.nombre),
    range:trim(row?.Rango||row?.rango)
  })).filter(x=>{
    if(norm(x.range)!=='socio'||!x.name)return false;
    const n=norm(x.name);
    return !/^z[_\s-]*dev\b/.test(n)&&!/^grupo\b/.test(n)&&!/^pe[ñn]a\b/.test(n)&&!/^personas\b/.test(n);
  });
  const key=v=>norm(v).replace(/[^a-z0-9ñ]+/g,' ').replace(/\s+/g,' ').trim();
  const isPair=v=>/\s+y\s+/i.test(trim(v));
  const parts=v=>trim(v).split(/\s+y\s+/i).map(trim).filter(Boolean);
  const pairs=clean.filter(x=>isPair(x.name)).map(x=>({...x,parts:parts(x.name),size:Math.max(2,parts(x.name).length||2)}));
  const out=[]; const seen=new Set();
  for(const p of pairs){const k=key(p.name);if(!seen.has(k)){seen.add(k);out.push({'Socio canónico':p.name,'Personas':p.size});}}
  for(const x of clean){
    if(isPair(x.name))continue;
    const k=key(x.name);
    if(pairs.some(p=>p.parts.some(part=>key(part)===k)))continue;
    if(seen.has(k))continue;
    seen.add(k);out.push({'Socio canónico':x.name,'Personas':1});
  }
  return out.sort((a,b)=>a['Socio canónico'].localeCompare(b['Socio canónico'],'es',{sensitivity:'base'}));
}

function semanticBuildSql(query,state,selectedEventId){
  if(query.domain==='CANONICAL_SOCIOS') return semanticBuildCanonicalSociosSql(query,state,selectedEventId);
  const zeroFill=semanticBuildEventZeroFillSql(query,state,selectedEventId);
  if(zeroFill) return zeroFill;
  const base=semanticBaseForDomain(query.domain); const conditions=[]; const resolved=[];
  if(base.baseCondition) conditions.push(base.baseCondition);
  if(base.eventAlias){ const sc=semanticScopeConditions(query,state,selectedEventId,base.eventAlias); if(sc.error) return {error:sc.error}; conditions.push(...sc.conditions); resolved.push(...sc.resolved); }
  else if(query.scope==='named_events'||query.scope==='active_event'||query.scope==='year'){
    // Dominios maestros no dependen de evento. El planner debe pedirlos con all_events.
  }
  if(query.domain==='PURCHASES') conditions.push(semanticPurchaseClassCondition('PURCHASES',query.status));
  if(query.domain==='DONATIONS') conditions.push(semanticPurchaseClassCondition('DONATIONS','all'));
  if(['INCOMES','PARTICIPATION'].includes(query.domain)) conditions.push(semanticIncomeStatusCondition(query.status));
  if(query.domain==='LG'){
    if(query.status==='completed') conditions.push('l.cumplida=TRUE');
    else if(query.status==='open') conditions.push('(l.cumplida IS DISTINCT FROM TRUE)');
  }
  const fc=semanticFilterConditions(query,state,{base}); if(fc.error) return {error:fc.error}; conditions.push(...fc.conditions); resolved.push(...fc.resolved);

  const dims=semanticUnique(query.group_by.length?query.group_by:(query.metrics.length?[]:(query.detail_fields.length?query.detail_fields:semanticDefaultDetails(query.domain))));
  const metrics=semanticUnique(query.metrics);
  const select=[]; const group=[];
  for(const d of dims){ const x=semanticDimensionExpr(query.domain,d); if(x){select.push(`${x.expr} AS "${x.alias}"`);group.push(x.expr);} }
  const metricAliases=[];
  for(const m of metrics){const x=semanticMetricExpr(query.domain,m);if(x){select.push(`${x.expr} AS "${x.alias}"`);metricAliases.push(x.alias);} }
  if(!select.length){
    for(const d of semanticDefaultDetails(query.domain)){const x=semanticDimensionExpr(query.domain,d);if(x)select.push(`${x.expr} AS "${x.alias}"`);}
  }
  if(query.domain==='EVENTS' && !metrics.length){
    if(!select.some(x=>/"Precio"/.test(x))) select.push('e.precio AS "Precio"');
    if(!select.some(x=>/"Descripción"/.test(x))) select.push("COALESCE(e.descripcion,'') AS \"Descripción\"");
  }
  if(['INCOMES','PARTICIPATION'].includes(query.domain) && !metrics.length){
    select.push('COALESCE(c.numero,0) AS "Número"');
    if(query.domain==='INCOMES'){
      const rango=semanticNormExpr("COALESCE(s.rango_snapshot,p.rango,'')");
      select.push(`CASE WHEN ${rango}='SOCIO' THEN COALESCE(c.numero,0)*COALESCE(e.precio,0) ELSE 0 END AS "Importe obligatorio"`);
      select.push('COALESCE(c.importe,0) AS "Importe voluntario"');
    }
  }
  if(['PURCHASES','DONATIONS'].includes(query.domain) && !metrics.length){
    select.push('COALESCE(c.unidades,0) AS "Unidades"','COALESCE(c.precio,0) AS "Precio"','COALESCE(c.unidades,0)*COALESCE(c.precio,0) AS "Importe"');
  }
  if(domainNeedsDateExtra(query.domain) && query.domain==='BANK' && !metrics.length) select.push('m.amount AS "Importe"');
  const where=conditions.length?` WHERE ${conditions.map(x=>`(${x})`).join(' AND ')}`:'';
  const groupClause=metrics.length&&group.length?` GROUP BY ${group.join(', ')}`:'';
  let order='';
  const metricOrder=metricAliases[0];
  if(query.sort==='amount_desc' && metricAliases.includes('Importe')) order=' ORDER BY "Importe" DESC';
  else if(query.sort==='count_desc' && metricOrder) order=` ORDER BY "${metricOrder}" DESC`;
  else if(query.sort==='name' && select.length) order=' ORDER BY 1';
  else if(query.sort==='event_date' && query.domain==='EVENTS') order=' ORDER BY e.fecha_ini DESC';
  else if(query.sort==='event_date' && group.length && query.group_by.includes('event')) order=' ORDER BY MIN(e.fecha_ini) DESC';
  else if(query.sort==='event_date' && base.eventAlias && !metrics.length) order=' ORDER BY e.fecha_ini DESC';
  else if(metrics.length && metricOrder) order=` ORDER BY "${metricOrder}" DESC`;
  else if(query.domain==='EVENTS') order=' ORDER BY e.fecha_ini DESC';
  const limit=` LIMIT ${Math.max(1,Math.min(300,query.limit||80))}`;
  const selectWord=(query.domain==='PARTICIPATION'&&!metrics.length)?'SELECT DISTINCT':'SELECT';
  let sql=`${selectWord} ${select.join(', ')} FROM ${base.from}${where}${groupClause}${order}${limit}`;
  if(query.include_total && metrics.length && group.length){
    const amountAlias=metricAliases.find(a=>a==='Importe')||metricAliases[0];
    if(amountAlias) sql=`SELECT ce_sem.*, SUM(COALESCE(ce_sem."${amountAlias}",0)) OVER () AS "Total general" FROM (${sql.replace(/ LIMIT \d+$/,'')}) ce_sem${order.replace(/e\.[a-z_]+/gi,'1')}${limit}`;
  }
  return {sql,resolved,columnsHint:select.map(x=>(x.match(/AS\s+"([^"]+)"/i)||[])[1]).filter(Boolean),postprocess:base.postprocess||''};
}
function domainNeedsDateExtra(domain){return domain==='BANK';}
function semanticPlanWithResolvedQueries(plan,state,selectedEventId){
  const built=[]; const resolved=[];
  for(const q of arr(plan.queries)){
    const b=semanticBuildSql(q,state,selectedEventId);
    if(b.error) return {error:b.error,query:q,built,resolved};
    built.push({...q,sql:b.sql,columnsHint:b.columnsHint,postprocess:b.postprocess||''}); resolved.push(...arr(b.resolved));
  }
  return {built,resolved};
}
async function semanticExecuteQueries(queries,flowTrace=[]){
  let client; try{client=getSupabaseAdmin();}catch(error){throw new Error(`ControlEvent no puede consultar Supabase: ${trim(error?.message||error)}`);}
  const out=[];
  for(const q of arr(queries)){
    zuzuTracePush(flowTrace,'Paso 2 · ControlEvent consulta','RUN',`${q.id} · ${q.domain} · ${q.title}. SELECT construida por CE, no por Gemini.`);
    try{
      const {data,error}=await client.rpc('ce_zuzu_select',{p_sql:q.sql,p_max_rows:Math.max(50,Math.min(300,q.limit||80))});
      if(error) throw error;
      const payload=data&&typeof data==='object'?data:{ok:true,rows:data};
      const rows=arr(payload.rows||payload.data||payload.resultados);
      const suspect=payload.ok!==false&&(sqlResultHasNullMetric(rows)||sqlSelectLooksUnsafeFactJoin(q.sql));
      let human=rows.map(row=>humanizeSqlRowForDisplay(row,collectSqlHumanLookups([{ok:true,rows}]),'')).filter(row=>Object.keys(row).length);
      if(q.postprocess==='canonical_socios') human=semanticCanonicalSocioRows(human);
      out.push({id:q.id,title:q.title,domain:q.domain,showTable:q.show_table,ok:payload.ok!==false&&!suspect,rows:human,rowCount:human.length,truncated:payload.truncated===true,error:suspect?'ControlEvent detectó una consulta agregada insegura.':trim(payload.error||''),columnsHint:q.columnsHint,includeTotal:q.include_total===true});
      zuzuTracePush(flowTrace,'Paso 2 · ControlEvent consulta',payload.ok===false||suspect?'KO':'OK',`${q.id}: ${human.length} fila(s)${payload.truncated?' · truncado':''}.`);
    }catch(error){
      const msg=trim(error?.message||error); out.push({id:q.id,title:q.title,domain:q.domain,showTable:q.show_table,ok:false,rows:[],rowCount:0,truncated:false,error:msg,columnsHint:q.columnsHint});
      zuzuTracePush(flowTrace,'Paso 2 · ControlEvent consulta','KO',`${q.id}: ${msg}`);
    }
  }
  return out;
}
function semanticResultsForGemini(results){
  return arr(results).map(r=>({id:r.id,title:r.title,domain:r.domain,ok:r.ok,rowCount:r.rowCount,truncated:r.truncated,error:r.error||'',columns:r.rows[0]?Object.keys(r.rows[0]):arr(r.columnsHint),rows:arr(r.rows).slice(0,80)}));
}
function semanticReviewerPrompt(userPrompt,plan,results,round){
  return `Eres Gemini revisando si ControlEvent ya ha obtenido información suficiente para responder bien.
NO escribas SQL. Si faltan datos, pide SOLO consultas semánticas adicionales con el mismo contrato de la fase 1.

PREGUNTA ORIGINAL:
${trim(userPrompt)}

INTENCION INTERPRETADA:
${trim(plan.intent)}

RONDA DE DATOS: ${round}
RESULTADOS DE CONTROLEVENT:
${compactJson(semanticResultsForGemini(results),22000)}

${semanticOntologyText()}

DECISION:
- status=enough si los resultados permiten contestar la pregunta con rigor.
- status=more si falta una faceta necesaria o una consulta falló y puede sustituirse por otra consulta semántica más simple. Devuelve additional_queries (máximo 6).
- status=clarify solo si el resultado revela una ambigüedad REAL entre entidades que solo el usuario puede resolver. No pidas aclaración sobre «socios canónicos/criterio ColtyLAB»: ya está definido por ControlEvent.
- Un resultado 0 NO demuestra por sí solo inexistencia si la entidad/concepto estaba dudoso.
- Ante timeout/error, NO abandones automáticamente: pide una consulta más pequeña/agrupada que cubra la misma necesidad.
- En informes amplios, comprueba que haya cobertura de los bloques realmente solicitados, pero no añadas módulos por rutina.
- Para listas de eventos de una persona, prioriza fecha inicio/fin y nombres; no pidas conteos si cada evento solo tendría 1 registro.
Devuelve JSON estricto con status, reason, clarification, additional_queries.`;
}
async function callGeminiSemanticReviewer(userPrompt,plan,results,round,flowTrace=[]){
  const apiKey=geminiKey(); if(!apiKey) return {status:'enough',reason:'Sin Gemini para revisión adicional.',clarification:'',additionalQueries:[]};
  const promptText=semanticReviewerPrompt(userPrompt,plan,results,round); let lastError=null;
  for(const model of configuredGeminiModelsForTask('zuzu-planner',{prompt:userPrompt})){
    try{
      zuzuTracePush(flowTrace,`Paso 3.${round} · Gemini revisa datos`,'RUN',`Modelo ${model}. Decide si necesita otra ronda; no SQL.`);
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const body={contents:[{role:'user',parts:[{text:promptText}]}],generationConfig:{responseMimeType:'application/json',responseSchema:semanticReviewSchema(),temperature:0.05,maxOutputTokens:2200,thinkingConfig:{thinkingBudget:0}}};
      const {res,payload}=await geminiFetchJsonWithTimeout(url,body,apiKey,Number(process.env.CONTROLEVENT_ZUZU_PLANNER_TIMEOUT_MS||22000));
      logGeminiUsage(`PASO 3.${round} REVISION SEMANTICA`,model,payload);
      if(!res.ok){const e=new Error(payload?.error?.message||`Gemini reviewer HTTP ${res.status}`);e.status=Number(res.status||502);throw e;}
      const p=JSON.parse(trim(geminiOutText(payload))); const status=trim(p?.status).toLowerCase();
      const additional=arr(p?.additional_queries).slice(0,6).map((q,i)=>{const nq=semanticNormalizeQuery(q,i+100*round);nq.id=`r${round}_${i+1}_${nq.id}`;return nq;});
      const out={status:['enough','more','clarify'].includes(status)?status:'enough',reason:trim(p?.reason),clarification:trim(p?.clarification),additionalQueries:additional,model};
      zuzuTracePush(flowTrace,`Paso 3.${round} · Gemini revisa datos`,'OK',`${out.status}${out.additionalQueries.length?` · ${out.additionalQueries.length} consulta(s) adicional(es)`:''}. ${out.reason}`);
      return out;
    }catch(error){lastError=error;zuzuTracePush(flowTrace,`Paso 3.${round} · Gemini revisa datos`,'KO',cleanGeminiError(error),{model});if(isQuotaError(error)||!isRetryable(error))break;}
  }
  return {status:'enough',reason:`No se pudo completar la revisión adaptativa: ${cleanGeminiError(lastError)}`,clarification:'',additionalQueries:[]};
}
function semanticNumbers(results=[]){
  const nums=[];
  for(const result of arr(results).filter(r=>r?.ok)){
    for(const row of arr(result.rows)){
      for(const v of Object.values(row||{})){
        if(typeof v==='number' && Number.isFinite(v)) { nums.push(v); continue; }
        if(typeof v!=='string' || !/^\s*-?[0-9][0-9.,\s]*\s*$/.test(v)) continue;
        const raw=v.replace(/\s/g,'');
        let n;
        if(/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(raw)) n=Number(raw.replace(/\./g,'').replace(',','.'));
        else n=Number(raw.replace(',','.'));
        if(Number.isFinite(n)) nums.push(n);
      }
    }
  }
  return nums;
}
function semanticUnsupportedEuro(answer,results=[]){
  const facts=semanticNumbers(results); if(!facts.length)return false;
  return [...text(answer).matchAll(/(-?\d[\d.\s]*(?:,\d+)?|-?\d+(?:\.\d+)?)\s*€/g)].some(m=>{const raw=trim(m[1]).replace(/\s/g,'');let n;if(/^-?\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(raw))n=Number(raw.replace(/\./g,'').replace(',','.'));else n=Number(raw.replace(',','.'));return Number.isFinite(n)&&!facts.some(v=>Math.abs(v-n)<0.005);});
}
function semanticFinalPrompt(userPrompt,plan,results,correction=''){
  const resultPayload=semanticResultsForGemini(results);
  return `Eres Gemini en la fase FINAL de Zuzu. Tú interpretaste la intención; ControlEvent resolvió entidades y ejecutó consultas cerradas. Ahora redacta SOLO con estos resultados.

PREGUNTA ORIGINAL:
${trim(userPrompt)}

INTENCION:
${trim(plan.intent)}

RESULTADOS REALES:
${compactJson(resultPayload,26000)}

REGLAS:
- Los resultados anteriores son la única fuente de verdad factual.
- Responde exactamente a la pregunta. No agregues un informe financiero genérico por ver la palabra «informe».
- Si una consulta falló pero otras cubren la petición, responde con lo disponible e indica únicamente la limitación pertinente.
- No digas «no hay datos» si existe alguna fila relevante.
- No inventes cifras. Si necesitas un total, solo usa una columna/fila que ya lo contenga.
- No menciones SQL, SELECT, RPC, tablas físicas, prompts ni tokens.
- Para pregunta abierta sobre persona, sintetiza las facetas que realmente aparezcan en los resultados; no prometas haber revisado facetas que no están presentes.
- Propón gráficas SOLO si el usuario las pidió explícitamente. Usa SOLO columnas existentes: query_id, label_field y value_field deben coincidir literalmente con los nombres de columnas recibidos.
- No propongas una gráfica si todos sus valores serían iguales, si solo muestra «1 registro» repetido o si una tabla/lista se entiende mejor.
- Responde primero como una persona que conoce ControlEvent: explica el resultado útil y después deja que las tablas aporten detalle. No sustituyas la respuesta por frases como «se obtuvieron N filas verificadas».
- En preguntas abiertas sobre una persona, resume participación, ingresos y otras facetas realmente encontradas. Si aparece un valor negativo, descríbelo como valor/ajuste registrado sin inventar su causa.
- Sé natural, preciso y útil. Evita frases de relleno y tecnicismos internos.
${correction?`\nCORRECCION OBLIGATORIA DE CE:\n${correction}\n`:''}
Devuelve JSON estricto con title, answer, warnings y charts.`;
}
async function callGeminiSemanticFinal(userPrompt,plan,results,flowTrace=[]){
  const apiKey=geminiKey(); if(!apiKey)throw new Error('Falta GEMINI_API_KEY para redactar la respuesta final.');
  let lastError=null,correction='';
  for(const model of configuredGeminiModelsForTask('zuzu-narrative',{prompt:userPrompt})){
    for(let attempt=0;attempt<2;attempt++){
      try{
        const promptText=semanticFinalPrompt(userPrompt,plan,results,correction);
        zuzuTracePush(flowTrace,'Paso 4 · Gemini sintetiza','RUN',`Modelo ${model}. Recibe pregunta + resultados reales; decide narración y gráficas, no consultas.`);
        const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        const body={contents:[{role:'user',parts:[{text:promptText}]}],generationConfig:{responseMimeType:'application/json',responseSchema:semanticFinalSchema(),temperature:0.08,maxOutputTokens:2600,thinkingConfig:{thinkingBudget:0}}};
        const {res,payload}=await geminiFetchJsonWithTimeout(url,body,apiKey,Number(process.env.CONTROLEVENT_ZUZU_NARRATIVE_TIMEOUT_MS||24000));
        logGeminiUsage('PASO 4 SINTESIS SEMANTICA',model,payload);
        if(!res.ok){const e=new Error(payload?.error?.message||`Gemini final HTTP ${res.status}`);e.status=Number(res.status||502);throw e;}
        const p=JSON.parse(trim(geminiOutText(payload))); const answer=trim(p?.answer);
        const unsupported=semanticUnsupportedEuro(answer,results);
        const anyRows=arr(results).some(r=>r.ok&&arr(r.rows).length);
        const falseNoData=anyRows&&/\b(no\s+hay\s+datos|no\s+se\s+encontraron\s+datos|no\s+se\s+encontraron\s+registros|sin\s+datos\s+registrados)\b/i.test(answer);
        if(unsupported||falseNoData){correction=`${unsupported?'Has citado un importe en euros que no aparece en ningún resultado. ':''}${falseNoData?'Hay filas relevantes; no puedes afirmar que no hay datos. ':''}Reescribe usando solo hechos recibidos.`;zuzuTracePush(flowTrace,'Paso 4b · Control de verdad CE','KO',correction,{model});continue;}
        zuzuTracePush(flowTrace,'Paso 4b · Control de verdad CE','OK','Narración coherente con las filas obtenidas.',{model});
        return {title:trim(p?.title)||'Resultado de Zuzu',answer,warnings:arr(p?.warnings),chartSpecs:arr(p?.charts).slice(0,4),model};
      }catch(error){lastError=error;zuzuTracePush(flowTrace,'Paso 4 · Gemini sintetiza','KO',cleanGeminiError(error),{model});break;}
    }
    if(lastError&&(isQuotaError(lastError)||!isRetryable(lastError)))break;
  }
  throw lastError||new Error('Gemini no pudo sintetizar una respuesta fiable.');
}

async function callGeminiSemanticFinalText(userPrompt,plan,results,flowTrace=[]){
  const apiKey=geminiKey(); if(!apiKey) throw new Error('Falta GEMINI_API_KEY para redactar la respuesta.');
  const useful=semanticResultsForGemini(results);
  const promptText=`Eres Zuzu. Responde en español de forma natural, útil y concreta a la pregunta del usuario usando EXCLUSIVAMENTE los resultados reales de ControlEvent que se adjuntan.
No menciones SQL, SELECT, RPC, tokens, filas verificadas ni mecanismos internos.
No inventes datos. Si hay varias tablas, sintetiza lo importante. Si la pregunta es abierta sobre una persona, cuenta lo relevante de su participación e ingresos y menciona otros ámbitos solo si hay datos.
No generes gráficas ni JSON en este intento de rescate.

PREGUNTA:
${trim(userPrompt)}

INTENCIÓN:
${trim(plan?.intent)}

DATOS REALES:
${compactJson(useful,16000)}

Devuelve únicamente la respuesta redactada, sin encabezados técnicos.`;
  let lastError=null;
  for(const model of configuredGeminiModelsForTask('zuzu-narrative',{prompt:userPrompt})){
    try{
      zuzuTracePush(flowTrace,'Paso 4c · Gemini redacción de rescate','RUN',`Modelo ${model}. Respuesta textual simple para no degradar a un volcado técnico.`);
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const body={contents:[{role:'user',parts:[{text:promptText}]}],generationConfig:{temperature:0.12,maxOutputTokens:1800,thinkingConfig:{thinkingBudget:0}}};
      const {res,payload}=await geminiFetchJsonWithTimeout(url,body,apiKey,Number(process.env.CONTROLEVENT_ZUZU_NARRATIVE_TIMEOUT_MS||24000));
      logGeminiUsage('PASO 4C SINTESIS TEXTO',model,payload);
      if(!res.ok){const e=new Error(payload?.error?.message||`Gemini final texto HTTP ${res.status}`);e.status=Number(res.status||502);throw e;}
      const answer=trim(geminiOutText(payload)).replace(/^```(?:markdown|text)?\s*/i,'').replace(/\s*```$/,'');
      if(!answer) throw new Error('Gemini devolvió una redacción vacía.');
      if(semanticUnsupportedEuro(answer,results)) throw new Error('La redacción de rescate citó un importe no presente en los datos.');
      zuzuTracePush(flowTrace,'Paso 4c · Gemini redacción de rescate','OK','Redacción natural recuperada.');
      return {title:'Respuesta de Zuzu',answer,warnings:[],chartSpecs:[],model};
    }catch(error){lastError=error;zuzuTracePush(flowTrace,'Paso 4c · Gemini redacción de rescate','KO',cleanGeminiError(error),{model});}
  }
  throw lastError||new Error('No se pudo recuperar una redacción natural.');
}

function semanticBuildCharts(specs,results=[],userPrompt='',plan={}){
  if(!semanticPromptExplicitlyRequestsCharts(userPrompt)) return [];
  const charts=[]; const byId=new Map(arr(results).map(r=>[trim(r.id),r]));
  for(const s of arr(specs).slice(0,4)){
    const r=byId.get(trim(s?.query_id)); if(!r?.ok||!arr(r.rows).length)continue;
    const label=trim(s?.label_field), value=trim(s?.value_field); if(!label||!value)continue;
    const labels=[],values=[];
    for(const row of arr(r.rows).slice(0,30)){ if(!(label in row)||!(value in row))continue; const n=num(row[value]); labels.push(trim(row[label])||'Sin etiqueta'); values.push(n); }
    if(!labels.length)continue;
    const uniq=[...new Set(values.map(v=>Number(v).toFixed(6)))];
    if(values.length>1 && uniq.length<=1) continue;
    let type=trim(s?.type); if(!['bar','horizontalBar','pie','donut','line'].includes(type))type=labels.length>8?'horizontalBar':'bar';
    charts.push({title:trim(s?.title)||r.title,type,labels,values,unit:trim(s?.unit)});
  }
  return charts;
}
function semanticPresentation(results=[],userPrompt=''){
  const tables=[]; const files=[]; const asksTotal=semanticPromptRequestsTotal(userPrompt);
  for(const r of arr(results).filter(x=>x.ok&&x.showTable&&arr(x.rows).length).slice(0,10)){
    let displayRows=arr(r.rows).map(row=>({...row}));
    if(displayRows.length>1){
      const cols0=Object.keys(displayRows[0]||{});
      for(const col of cols0){
        const values=displayRows.map(row=>row?.[col]);
        const allSame=values.every(v=>text(v)===text(values[0]));
        if(/^total general$/i.test(col) && (!asksTotal || allSame)) displayRows.forEach(row=>delete row[col]);
        if(r.domain==='PARTICIPATION' && /^registros$/i.test(col) && allSame && Number(values[0])===1) displayRows.forEach(row=>delete row[col]);
      }
    }
    const {columns,rows}=rowsToTableRows(displayRows,200); if(!columns.length)continue;
    tables.push({title:r.title,columns,rows});
    if(files.length<4)files.push({filename:fileSafe(`${r.id}_${r.title}_v27_prod_1.2.csv`),mime:'text/csv;charset=utf-8',content:csvFromRows(columns,displayRows.map(row=>Object.fromEntries(columns.map(c=>[c,row?.[c]]))))});
  }
  return {tables,files};
}
function semanticFallbackAnswer(results=[]){
  const ok=arr(results).filter(r=>r.ok), failed=arr(results).filter(r=>!r.ok);
  const canonical=ok.find(r=>r.domain==='CANONICAL_SOCIOS'&&arr(r.rows).length);
  if(canonical){
    const names=arr(canonical.rows).map(x=>trim(x?.['Socio canónico'])).filter(Boolean);
    return {title:'Socios canónicos · criterio ColtyLAB',answer:`Estos son los ${names.length} socios canónicos que constan con el criterio de ColtyLAB: ${names.join(', ')}.`,warnings:failed.map(r=>`${r.title}: ${r.error}`)};
  }
  const eventRows=ok.flatMap(r=>arr(r.rows)).filter(r=>trim(r?.Evento));
  if(eventRows.length && ok.length===1){
    const names=[...new Set(eventRows.map(r=>trim(r.Evento)).filter(Boolean))];
    return {title:'Resultado de Zuzu',answer:`He encontrado ${names.length} evento(s): ${names.join(', ')}.`,warnings:failed.map(r=>`${r.title}: ${r.error}`)};
  }
  const rows=ok.reduce((a,r)=>a+arr(r.rows).length,0);
  return {title:'Resultado de Zuzu',answer:`He podido recuperar ${rows} registros útiles de ControlEvent. Revisa las tablas siguientes para el detalle.${failed.length?' Hay una parte de la consulta que no ha podido completarse.':''}`,warnings:failed.map(r=>`${r.title}: ${r.error}`)};
}

// v27_prod_1.2 · ZUZU TOOLS
// Gemini interpreta y analiza. ControlEvent aporta herramientas de dominio con datos ya calculados.
// El flujo normal de Zuzu NO permite que Gemini escriba SQL ni que calcule importes contables.
const V26_ZUZU_TOOLS = Object.freeze([
  'event_dossier','event_breakdowns','event_people','person_dossier',
  'participation_events','store_purchases','canonical_socios','events_catalog','compare_events',
  'events_overview','event_documentation','people_activity'
]);

function v26ToolPlanSchema(){
  return {
    type:'OBJECT',
    properties:{
      action:{type:'STRING',description:'tools o clarify'},
      clarification:{type:'STRING'},
      intent:{type:'STRING'},
      wants_charts:{type:'BOOLEAN'},
      tools:{type:'ARRAY',items:{type:'OBJECT',properties:{
        id:{type:'STRING'}, name:{type:'STRING'}, event:{type:'STRING'}, events:{type:'ARRAY',items:{type:'STRING'}}, person:{type:'STRING'}, people:{type:'ARRAY',items:{type:'STRING'}}, store:{type:'STRING'},
        scope:{type:'STRING',description:'active_event, all_events o named_event'}, status:{type:'STRING',description:'realized, pending o all'}, include_empty:{type:'BOOLEAN'}
      },required:['id','name','event','events','person','store','scope','status','include_empty']}}
    },
    required:['action','clarification','intent','wants_charts','tools']
  };
}
function v26FinalSchema(){
  return {
    type:'OBJECT',
    properties:{
      title:{type:'STRING'}, answer:{type:'STRING'}, warnings:{type:'ARRAY',items:{type:'STRING'}},
      show_tables:{type:'ARRAY',items:{type:'OBJECT',properties:{tool_id:{type:'STRING'},table_key:{type:'STRING'}},required:['tool_id','table_key']}},
      charts:{type:'ARRAY',items:{type:'OBJECT',properties:{
        title:{type:'STRING'},type:{type:'STRING'},tool_id:{type:'STRING'},table_key:{type:'STRING'},label_field:{type:'STRING'},value_field:{type:'STRING'},series_fields:{type:'ARRAY',items:{type:'STRING'}},unit:{type:'STRING'}
      },required:['title','type','tool_id','table_key','label_field','value_field','series_fields','unit']}}
    },
    required:['title','answer','warnings','show_tables','charts']
  };
}
function v26ModelList(kind='planner'){
  const explicit=kind==='planner'?process.env.CONTROLEVENT_ZUZU_TOOLS_PLANNER_MODEL:process.env.CONTROLEVENT_ZUZU_TOOLS_FINAL_MODEL;
  const out=[];
  splitModels(explicit||'').forEach(m=>pushCleanModel(out,m));
  const defaults=kind==='planner'?['gemini-2.5-flash-lite','gemini-2.5-flash']:['gemini-2.5-flash','gemini-2.5-flash-lite'];
  defaults.forEach(m=>pushCleanModel(out,m));
  return out;
}
function v26CatalogSnapshot(state,selectedEventId=''){
  const active=arr(state?.eventos).find(e=>trim(e?.id)===trim(selectedEventId))||null;
  return {
    activeEvent:active?{id:trim(active.id),title:trim(active.titulo),status:trim(active.situacion),start:trim(active.fechaIni),end:trim(active.fechaFin)}:null,
    events:arr(state?.eventos).map(e=>trim(e?.titulo)).filter(Boolean).slice(0,80),
    people:arr(state?.personas).map(p=>trim(p?.nombre)).filter(Boolean).slice(0,350),
    stores:arr(state?.tiendas).map(t=>trim(t?.nombre)).filter(Boolean).slice(0,250)
  };
}
function v26ImplicitIntent(prompt=''){
  const p=norm(prompt);
  return {
    comparison:/\b(compara(?:s|mos|n|do|da|das|dos)?|comparar|comparativa|comparativo|frente\s+a|versus|\bvs\b)\b/.test(p),
    broadPerson:/\b(hablame|háblame|que sabes|qué sabes|quien es|quién es|informacion sobre|información sobre|cuentame de|cuéntame de|dime (?:algo|cosas|cositas|informacion|información) de)\b/.test(p),
    broadEvent:/\b(hablame|háblame|que tal|qué tal|que paso|qué pasó|como fue|cómo fue|como estuvo|cómo estuvo|como salio|cómo salió|dime cositas|cuentame|cuéntame|resume|resumen|analiza|informe|en que se fue|en qué se fue|donde se fue|dónde se fue|ves algo raro|algo raro)\b/.test(p)&&/\b(evento|jornada|sysa|celebracion|celebración|este|dinero|gasto|gastos|raro)\b/.test(p),
    spendAnalysis:/\b(en que se fue|en qué se fue|donde se fue|dónde se fue|en que gast|en qué gast|gasto real|gastos reales|dinero gastado|se gasto|se gastó|coste real|costó realmente)\b/.test(p),
    breakdown:/\b(destino|segmento|comprado|donado|pendiente(?: de compra)?|producto|productos|tienda|tiendas|forma de pago)\b/.test(p),
    conversational:/\b(hablame|háblame|que tal|qué tal|como fue|cómo fue|como salio|cómo salió|dime cositas|opina|opinion|opinión|analiza|destaca|llamativo|anomalia|anomalía|raro|en que se fue|en qué se fue|donde se fue|dónde se fue|a que te refieres|a qué te refieres)\b/.test(p),
    anomaly:/\b(raro|rara|anomalia|anomalía|inconsistencia|no cuadra|revisar|sospechoso|llamativo)\b/.test(p),
    documentation:/\b(documentacion|documentación|documental|justificad|justificante|justificantes|ticket|tickets|factura|facturas|doc\s*\d+)\b/.test(p),
    globalAcrossEvents:/\b(todos los eventos|todos los eventos registrados|algun evento|algún evento|entre los eventos|en general|control\s*event|controlevent|historico|histórico)\b/.test(p),
    peopleActivity:/\b(implicad|participativ|activo|activa|actividad|actividades|quien dirias|quién dirías|mas presente|más presente)\b/.test(p)&&/\b(peña|personas|gente|socio|socios|colaborador|colaboradores|implicad)\b/.test(p),
    explicitList:/\b(tabla|tablas|lista|listado|detalle|detallado|desglos|todos los datos|cada|por evento|por tienda|por destino|por segmento)\b/.test(p),
    explicitNoTables:/\b(no quiero|sin|no pongas|no muestres|evita)\b.{0,30}\b(tabla|tablas|listado)\b/.test(p),
    asksConclusion:/\b(mejor|peor|resultado|conclusion|conclusión|quien gano|quién ganó|cual fue|cuál fue|merece|destaca|llamativo|anomalia|anomalía)\b/.test(p)
  };
}
function v26PersonHintFromPrompt(prompt,state){
  const p=canonicalNameKey(prompt);
  const people=semanticCatalogRows(state,'person').slice().sort((a,b)=>canonicalNameKey(b.nombre).length-canonicalNameKey(a.nombre).length);
  for(const row of people){
    const k=canonicalNameKey(row.nombre); if(!k||k.length<3)continue;
    if(p===k||p.includes(' '+k+' ')||p.startsWith(k+' ')||p.endsWith(' '+k)||p.includes(k)) return trim(row.nombre);
    if(isCanonicalPairName(row.nombre)){
      const part=v26PairParts(row.nombre).find(x=>{const pk=canonicalNameKey(x);return pk.length>=3&&(p===pk||p.includes(' '+pk+' ')||p.startsWith(pk+' ')||p.endsWith(' '+pk));});
      if(part)return trim(part);
    }
  }
  return '';
}

function v26PersonHintsFromPrompt(prompt,state){
  const p=` ${canonicalNameKey(prompt)} `,out=[],seen=new Set();
  const people=semanticCatalogRows(state,'person').slice().sort((a,b)=>canonicalNameKey(b.nombre).length-canonicalNameKey(a.nombre).length);
  const add=name=>{const n=trim(name),k=canonicalNameKey(n);if(n&&k&&!seen.has(k)){seen.add(k);out.push(n);}};
  for(const row of people){
    const name=trim(row.nombre),k=canonicalNameKey(name);if(!k||k.length<3)continue;
    if(p.includes(` ${k} `)){add(name);continue;}
    if(isCanonicalPairName(name)){
      for(const part of v26PairParts(name)){const pk=canonicalNameKey(part);if(pk.length>=3&&p.includes(` ${pk} `))add(part);}
    }
  }
  return out.slice(0,8);
}
function v26NormalizeConversationContext(value={}){
  const src=value&&typeof value==='object'?value:{};
  const allowedTopics=new Set(['','person','person_comparison','event_analysis','event_comparison','event_documentation','global_events','people_activity']);
  const topic=allowedTopics.has(trim(src.topic))?trim(src.topic):'';
  const people=semanticUnique(arr(src.people).map(trim).filter(Boolean)).slice(0,6);
  const events=semanticUnique(arr(src.events).map(trim).filter(Boolean)).slice(0,6);
  return {
    version:1,
    topic,
    people,
    events,
    focus:trim(src.focus).slice(0,80),
    lastIntent:trim(src.lastIntent||src.intent).slice(0,120),
    selectedEventId:trim(src.selectedEventId).slice(0,100),
    turn:Math.max(0,Math.trunc(num(src.turn)))
  };
}
function v26FrameFromHistory(history=[]){
  for(const h of [...arr(history)].reverse()){
    const frame=v26NormalizeConversationContext(h?.conversationContext||h?.context||{});
    if(frame.topic||frame.people.length||frame.events.length)return frame;
  }
  return v26NormalizeConversationContext({});
}
function v26HistorySubjects(state,history=[],conversationContext={}){
  const people=[],events=[],seenP=new Set(),seenE=new Set();
  const addP=v=>{const k=canonicalNameKey(v);if(v&&k&&!seenP.has(k)){seenP.add(k);people.push(trim(v));}};
  const addE=v=>{const k=norm(v);if(v&&k&&!seenE.has(k)){seenE.add(k);events.push(trim(v));}};
  const frame0=v26NormalizeConversationContext(conversationContext);
  const frame=(frame0.topic||frame0.people.length||frame0.events.length)?frame0:v26FrameFromHistory(history);
  frame.people.forEach(addP);frame.events.forEach(addE);
  // Compatibilidad con sesiones antiguas: solo se inspecciona lo que escribió el usuario.
  // No extraemos entidades del texto libre generado por Zuzu, porque puede contener nombres
  // incidentales de tablas, productos o personas que contaminarían el hilo.
  if(!people.length&&!events.length){
    for(const h of arr(history).slice(-4)){
      const blob=trim(h?.user);
      v26PersonHintsFromPrompt(blob,state).forEach(addP);
      exactEventTitlesFromPrompt(blob,arr(state?.eventos)).forEach(x=>addE(trim(x?.titulo)));
    }
  }
  return{people:people.slice(-6),events:events.slice(-6),frame};
}
function v26LooksLikeConversationFollowUp(prompt,history=[],conversationContext={}){
  if(!arr(history).length&&!v26NormalizeConversationContext(conversationContext).topic)return false;
  const p=norm(prompt).replace(/^[¿¡!?.:,;\"'“”‘’()\s]+/,'').trim(),words=p.split(/\s+/).filter(Boolean);
  if(words.length<=16&&/^(y\b|pero\b|entonces\b|tambien\b|también\b|ahora\b|si\b|sí\b|vale\b|ok\b|pues\b|bueno\b)/.test(p))return true;
  if(words.length<=18&&/\b(eso|esa|ese|estos|estas|ellos|ellas|ambos|los dos|las dos|lo comparas|lo compares|a que te refieres|a qué te refieres|exactamente|y si|y comparado|y comparada|los que faltan|las que faltan)\b/.test(p))return true;
  if(words.length<=14&&/\b(comparas|compáralo|comparalo|dime mas|dime más|amplia|amplía|detalla|profundiza|responsabilidades?|participado|participación|implicado|implicada|faltan|pendientes)\b/.test(p))return true;
  return false;
}
function v26FollowupFocusFromPrompt(prompt,previous=''){
  const p=norm(prompt);
  if(/\b(responsab\w*|compras?\s+gestion\w*|hitos?|lg|tareas?)\b/.test(p))return'responsibilities';
  if(/\b(particip\w*|asist\w*|eventos?\s+ha|eventos?\s+han)\b/.test(p))return'participation';
  if(/\b(implicad\w*|activ[oa]s?|presentes?)\b/.test(p))return'implication';
  if(/\b(cuales?\s+son\s+los?\s+que\s+faltan|cuáles?\s+son\s+los?\s+que\s+faltan|faltan|pendientes)\b/.test(p))return'documentation_missing';
  if(/\b(document\w*|justific\w*|tickets?|facturas?)\b/.test(p))return'documentation';
  if(/\b(ingres\w*|dinero|importes?|aportaci\w*)\b/.test(p))return'income';
  if(/\b(rar[oa]s?|anomali\w*|no\s+cuadra|llamativ\w*)\b/.test(p))return'anomaly';
  if(/\b(a que te refieres|a qué te refieres|exactamente|detalla|profundiza)\b/.test(p))return trim(previous)||'detail';
  return trim(previous)||'followup';
}
function v26ResolveConversationFollowUp(prompt,state,selectedEventId='',history=[],conversationContext={}){
  const hs=arr(history).slice(-6);
  const currentPeople=v26PersonHintsFromPrompt(prompt,state),currentEvents=exactEventTitlesFromPrompt(prompt,arr(state?.eventos)).map(x=>trim(x?.titulo)).filter(Boolean);
  const prior=v26HistorySubjects(state,hs,conversationContext),frame=prior.frame||v26NormalizeConversationContext({});
  const isFollowUp=v26LooksLikeConversationFollowUp(prompt,hs,frame);
  if(!isFollowUp)return{isFollowUp:false,effectivePrompt:prompt,people:currentPeople,events:currentEvents,frame};
  const last=hs[hs.length-1]||{},lastAssistant=trim(last?.assistant).slice(0,450),lastTitle=trim(last?.title).slice(0,140),lastUser=trim(last?.user).slice(0,260);
  const p=norm(prompt),cmp=/\b(compara(?:s|mos|n|do|da|das|dos)?|comparar|comparad|frente\s+a|versus|\bvs\b)\b/.test(p);
  const focus=v26FollowupFocusFromPrompt(prompt,frame.focus);

  // Marco fuerte: una comparación entre dos personas debe conservar exactamente esas dos
  // entidades durante los turnos elípticos («los dos», «y en responsabilidades», etc.).
  if(frame.topic==='person_comparison'&&frame.people.length>=2){
    const people=frame.people.slice(0,2);
    let instruction='Compara';
    if(focus==='participation')instruction='Compara la participación y di quién ha participado en más eventos';
    else if(focus==='responsibilities')instruction='Compara las responsabilidades, compras gestionadas, Hitos y tareas LG';
    else if(focus==='implication')instruction='Valora cuál de los dos ha estado más implicado usando participación y responsabilidades, explicando el criterio';
    else if(focus==='income')instruction='Compara los ingresos vinculados';
    return{isFollowUp:true,effectivePrompt:`CONTINUACIÓN CONFIRMADA DE COMPARACIÓN PERSONAL. ${instruction} entre ${people[0]} y ${people[1]}. No cambies los sujetos y no uses el evento de pantalla para sustituirlos. Petición literal actual: ${prompt}`,people,events:[],focus,frame:{...frame,focus},reason:'marco persistente de comparación entre personas'};
  }

  // Si veníamos de documentación, «cuáles faltan» solo puede referirse a evidencias/adjuntos
  // pendientes de ese mismo evento, nunca a colaboradores pendientes de pago.
  if(frame.topic==='event_documentation'&&frame.events.length){
    const ev=frame.events[0];
    const detail=focus==='documentation_missing'
      ?'Enumera exactamente qué justificantes, fototickets o documentos faltan; si no falta ninguno, dilo expresamente.'
      :'Continúa explicando la justificación documental y los adjuntos del mismo evento.';
    return{isFollowUp:true,effectivePrompt:`CONTINUACIÓN CONFIRMADA DE DOCUMENTACIÓN. Evento: ${ev}. ${detail} Petición literal actual: ${prompt}`,people:frame.people,events:[ev],focus,frame:{...frame,focus},reason:'marco persistente de justificación documental'};
  }

  // Paso natural de un análisis de evento a documentación u otro detalle del mismo evento.
  if(frame.events.length&&['event_analysis','event_comparison'].includes(frame.topic)){
    const ev=frame.events[0];
    if(focus==='documentation'||focus==='documentation_missing'){
      return{isFollowUp:true,effectivePrompt:`CONTINUACIÓN DEL EVENTO ${ev}. Revisa la justificación documental de ese mismo evento. ${focus==='documentation_missing'?'Indica exactamente qué elementos faltan.':''} Petición literal actual: ${prompt}`,people:frame.people,events:[ev],focus,frame:{...frame,topic:'event_documentation',events:[ev],focus},reason:'continuación de evento hacia documentación'};
    }
  }

  // «Háblame de Colty» -> «¿y si lo comparas con Curvas?».
  if(cmp&&currentPeople.length&&(frame.people.length||prior.people.length)){
    const basePeople=frame.people.length?frame.people:prior.people;
    const priorPerson=[...basePeople].reverse().find(x=>!currentPeople.some(y=>canonicalNameKey(y)===canonicalNameKey(x)));
    if(priorPerson){
      const people=[priorPerson,currentPeople[0]];
      return{isFollowUp:true,effectivePrompt:`Compara a ${people[0]} con ${people[1]}. Es una continuación de la conversación anterior; conserva el criterio y el contexto previos. Petición literal actual: ${prompt}`,people,events:[],focus,frame:{version:1,topic:'person_comparison',people,events:[],focus,lastIntent:'compare_people',selectedEventId:trim(selectedEventId),turn:frame.turn},reason:'comparación de personas resuelta desde el turno anterior'};
    }
  }

  const subject=[];if(prior.people.length)subject.push(`personas previas: ${prior.people.slice(-3).join(', ')}`);if(prior.events.length)subject.push(`eventos previos: ${prior.events.slice(-3).join(', ')}`);if(lastTitle)subject.push(`tema previo: ${lastTitle}`);
  const context=`Turno anterior del usuario: ${lastUser||'(sin texto)'}. Respuesta anterior de Zuzu: ${lastAssistant||'(sin texto)'}.`;
  return{isFollowUp:true,effectivePrompt:`CONTINUACIÓN DE CONVERSACIÓN. ${subject.join(' · ')}. ${context} Responde a esta continuación sin reiniciar en el evento de pantalla salvo que el usuario lo pida expresamente: ${prompt}`,people:semanticUnique(prior.people.concat(currentPeople)).slice(-6),events:semanticUnique(prior.events.concat(currentEvents)).slice(-6),focus,frame:{...frame,focus},reason:'continuación corta resuelta con marco estructurado'};
}
function v26EventHintFromPrompt(prompt,state,selectedEventId=''){
  const exact=exactEventTitlesFromPrompt(prompt,arr(state?.eventos));
  if(exact.length)return trim(exact[0]?.titulo||exact[0]?.title||exact[0]?.nombre);
  const active=v26EventById(state,selectedEventId);
  if(/\b(este evento|evento de pantalla|evento actual|evento seleccionado)\b/i.test(text(prompt))&&active)return trim(active.titulo);
  return '';
}
function v26ToolStub(name,id,extra={}){
  return {id,name,event:'',events:[],person:'',store:'',scope:'active_event',status:'realized',include_empty:false,...extra};
}
function v26PlannerPrompt(userPrompt,state,selectedEventId,conversationHistory=[]){
  const cat=v26CatalogSnapshot(state,selectedEventId);
  return `Eres el INTÉRPRETE de Zuzu en ControlEvent v27_prod_1.2.
Tu única misión ahora es decidir qué HERRAMIENTAS DE CONTROLEVENT hacen falta para contestar al usuario. NO escribas SQL. NO calcules cifras. NO redactes todavía la respuesta final.

PREGUNTA ORIGINAL:\n${userPrompt}

CONTEXTO CONVERSACIONAL RECIENTE (solo para resolver pronombres, continuaciones y comparaciones; la pregunta actual manda):\n${JSON.stringify(arr(conversationHistory).slice(-6))}

CONTEXTO DE PANTALLA:\n${JSON.stringify(cat)}

HERRAMIENTAS DISPONIBLES:
- event_dossier: dossier completo y compacto de un evento: ficha, descripción, ingresos, compras realizadas, pendientes, donaciones, saldo operativo, valoración y asistencia/entradas registradas. Úsala para «este evento», «háblame del evento», «dime cositas», informe general, resumen o análisis global.
- event_breakdowns: desgloses de un evento por tienda, destino, segmento, producto, forma de ingreso. Úsala para análisis o gráficas.
- event_people: detalle de participantes/ingresos de un evento con nombre, rango histórico, forma de pago e importes canónicos.
- person_dossier: visión 360º de una persona: eventos, ingresos, responsabilidades de compra, donaciones como donante y Hitos/LG cuando existan. Úsala para «háblame de X».
- participation_events: lista de eventos y fechas donde aparece una persona. Úsala para «en qué eventos participó X».
- store_purchases: compras realizadas/pendientes de una tienda, por evento, con total general. Resuelve variantes humanas como ALMACEN / El Almacén / almacén.
- canonical_socios: lista de socios canónicos con el mismo criterio de ColtyLAB. Si el usuario dice «socios canónicos» o «criterio ColtyLAB», NO pidas aclaración.
- events_catalog: catálogo de eventos con fechas/estado/precio.
- compare_events: comparación CANÓNICA de 2-6 eventos en una misma matriz de indicadores homogéneos (ingresos, compras realizadas, pendientes, donaciones, saldo, valoración y asistencia canónica). Úsala SIEMPRE para comparativas generales entre eventos. Nunca simules una comparativa usando el dossier de un solo evento.
- events_overview: panorama CANÓNICO de todos los eventos con las mismas métricas económicas y asistencia. Úsala para preguntas globales del tipo «¿ha habido algún evento...?», tendencias, mejores/peores o una lectura transversal de ControlEvent.
- event_documentation: estado documental de un evento: justificantes de ingresos, tickets/fototickets de compras y documentos DOC. Úsala para «¿está todo justificado?», «dime cuáles faltan», «documentación», «tickets» o una continuación que se refiera a pendientes documentales.
- people_activity: panorama transversal de implicación de personas/parejas: eventos con participación, compras bajo responsabilidad, donaciones y Hitos/LG. Úsala para «¿quién ha estado más implicado?», «quién participa más» o comparativas globales de actividad humana.

REGLAS DE INTELIGENCIA:
1. El usuario NO tiene que saber cómo está modelado ControlEvent ni redactar una especificación técnica. Deduce lo razonablemente implícito.
2. Si la pregunta es amplia sobre una persona («háblame de Colty», «qué sabes de Ernesto»), usa person_dossier. ControlEvent resolverá automáticamente alias y apariciones en pareja/entidad compuesta; no obligues al usuario a indicarlo.
3. Si la pregunta es amplia sobre el evento activo («qué tal salió», «dime cositas», «háblame de este evento»), usa event_dossier y añade event_breakdowns para tener contexto analítico aunque después no se muestre todo.
4. Si pide una representación gráfica de «todos los datos» del evento, usa event_dossier + event_breakdowns + event_people. La respuesta final elegirá solo gráficas que aporten valor.
5. Para compras de una tienda en todos los eventos usa store_purchases(scope=all_events,status=realized). Si el usuario dice «todos los eventos registrados», include_empty=true.
6. Si aparecen destino, segmento, comprado, donado o pendiente, usa event_breakdowns; no sustituyas esa intención por «compras por tienda».
7. Pide aclaración SOLO si existen dos entidades reales plausibles y la elección cambia materialmente la respuesta. No preguntes por formato, tablas, euros, parejas o conceptos propios ya definidos.
8. Máximo 4 herramientas. Normalmente bastan 1-3.
9. wants_charts=true solo si el usuario pide explícitamente gráfico/gráfica/representación visual o un informe gráfico.
10. Si el usuario pide comparar dos o más eventos, usa compare_events y rellena events con los títulos de TODOS los eventos comparados. Si hay una pequeña errata en un título, usa el catálogo para resolver la opción inequívoca.
11. Una pregunta conversacional debe producir contexto suficiente para que la fase final pueda ANALIZAR, no solo enumerar datos.
12. Si la petición está marcada como CONTINUACIÓN DE CONVERSACIÓN, el contexto previo tiene prioridad sobre el evento de pantalla para resolver «lo», «eso», «y si...», «dime exactamente...», etc. No reinicies el tema.
13. Para comparar dos personas, usa un person_dossier por persona; compare_events es SOLO para eventos.

Devuelve JSON estructurado.`;
}
async function callGeminiV26Planner(userPrompt,state,selectedEventId,flowTrace=[],conversationHistory=[]){
  const apiKey=geminiKey(); if(!apiKey) throw new Error('Falta GEMINI_API_KEY para Zuzu Tools.');
  const promptText=v26PlannerPrompt(userPrompt,state,selectedEventId,conversationHistory); let lastError=null;
  const models=v26ModelList('planner');
  for(let mi=0;mi<models.length;mi++){
    const model=models[mi];
    try{
      zuzuTracePush(flowTrace,'V27 · Gemini interpreta','RUN',`Modelo ${model}. Selecciona herramientas CE; no SQL.`);
      const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const body={contents:[{role:'user',parts:[{text:promptText}]}],generationConfig:{responseMimeType:'application/json',responseSchema:v26ToolPlanSchema(),temperature:0.05,maxOutputTokens:1400,thinkingConfig:{thinkingBudget:0}}};
      const {res,payload}=await geminiFetchJsonWithTimeout(url,body,apiKey,Number(process.env.CONTROLEVENT_ZUZU_TOOLS_PLANNER_TIMEOUT_MS||16000));
      logGeminiUsage('V26 TOOLS PLANNER',model,payload);
      if(!res.ok){const e=new Error(payload?.error?.message||`Gemini planner HTTP ${res.status}`);e.status=Number(res.status||502);throw e;}
      const apiUsage=usageSmall(payload,model);
      zuzuTracePush(flowTrace,'V27 · Gemini API · interpretación','OK',`Llamada facturable completada con ${model}.`,{model,usage:apiUsage});
      const raw=JSON.parse(trim(geminiOutText(payload))||'{}');
      const tools=arr(raw?.tools).slice(0,4).map((t,i)=>({
        id:trim(t?.id)||`tool_${i+1}`,name:V26_ZUZU_TOOLS.includes(trim(t?.name))?trim(t.name):'',event:trim(t?.event),events:arr(t?.events).map(trim).filter(Boolean).slice(0,6),person:trim(t?.person),people:arr(t?.people).map(trim).filter(Boolean).slice(0,6),store:trim(t?.store),
        scope:['active_event','all_events','named_event'].includes(trim(t?.scope))?trim(t.scope):'active_event',status:['realized','pending','all'].includes(trim(t?.status))?trim(t.status):'realized',include_empty:t?.include_empty===true
      })).filter(t=>t.name);
      let out={action:trim(raw?.action)==='clarify'?'clarify':'tools',clarification:trim(raw?.clarification),intent:trim(raw?.intent),wantsCharts:raw?.wants_charts===true,tools,model};
      out=v26ApplyPlannerGuardrails(out,userPrompt,state,selectedEventId);
      if(out.action==='tools'&&!out.tools.length) throw new Error('Gemini no seleccionó ninguna herramienta válida.');
      zuzuTracePush(flowTrace,'V27 · Gemini interpreta','OK',out.action==='clarify'?`Aclaración: ${out.clarification}`:`Herramientas: ${out.tools.map(t=>t.name).join(', ')}`,{model});
      out.usage = apiUsage;
      return out;
    }catch(error){
      lastError=error;
      const canRetry=mi<models.length-1&&isRetryable(error)&&!isQuotaError(error);
      zuzuTracePush(flowTrace,'V27 · Gemini interpreta',canRetry?'RETRY':'KO',cleanGeminiError(error),{model});
      if(!canRetry)break;
    }
  }
  throw lastError||new Error('Gemini no pudo seleccionar herramientas.');
}

function v26EditDistance(a,b){
  const x=semanticCleanToken(a),y=semanticCleanToken(b); if(!x)return y.length;if(!y)return x.length;
  const prev=Array.from({length:y.length+1},(_,i)=>i),cur=new Array(y.length+1);
  for(let i=1;i<=x.length;i++){cur[0]=i;for(let j=1;j<=y.length;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(x[i-1]===y[j-1]?0:1));for(let j=0;j<=y.length;j++)prev[j]=cur[j];}
  return prev[y.length];
}
function v26WordSimilarity(a,b){const x=semanticCleanToken(a),y=semanticCleanToken(b);if(!x||!y)return 0;if(x===y)return 1;const d=v26EditDistance(x,y);return Math.max(0,1-d/Math.max(x.length,y.length));}
function v26EventFragmentScore(fragment,title){
  const f=semanticCleanToken(fragment),t=semanticCleanToken(title);if(!f||!t)return 0;if(f===t)return 1;if(t.includes(f)||f.includes(t))return .98;
  const ft=f.split(' ').filter(Boolean),tt=t.split(' ').filter(Boolean);if(!ft.length||!tt.length)return 0;
  let sum=0;for(const w of ft){let best=0;for(const z of tt)best=Math.max(best,v26WordSimilarity(w,z));sum+=best;}
  const avg=sum/ft.length;const roman=ft.find(w=>/^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)$/.test(w));if(roman&&tt.includes(roman))return Math.min(1,avg+.08);return avg;
}
function v26ComparisonEventNamesFromPrompt(prompt,state){
  const events=arr(state?.eventos);const out=[];const seen=new Set();const add=e=>{const id=trim(e?.id);if(id&&!seen.has(id)){seen.add(id);out.push(trim(e?.titulo));}};
  exactEventTitlesFromPrompt(prompt,events).forEach(x=>{const e=events.find(y=>trim(y?.id)===trim(x.id));if(e)add(e);});
  const quoted=[...text(prompt).matchAll(/["“”'‘’]([^"“”'‘’]{2,140})["“”'‘’]/g)].map(m=>cleanPotentialEventTitle(m[1])).filter(Boolean);
  for(const frag of quoted){if(out.some(n=>norm(n)===norm(frag)))continue;const scored=events.map(e=>({e,score:v26EventFragmentScore(frag,e?.titulo)})).sort((a,b)=>b.score-a.score);if(scored[0]?.score>=.78&&(scored.length<2||scored[0].score-scored[1].score>=.025||scored[0].score>=.94))add(scored[0].e);}
  return out.slice(0,6);
}
function v26ApplyPlannerGuardrails(plan,userPrompt,state,selectedEventId){
  const p=norm(userPrompt),intent=v26ImplicitIntent(userPrompt);
  let tools=arr(plan?.tools).slice();
  const personHints=v26PersonHintsFromPrompt(userPrompt,state);
  const eventHints=v26ComparisonEventNamesFromPrompt(userPrompt,state);
  if(intent.comparison&&personHints.length>=2&&eventHints.length<2){
    tools=personHints.slice(0,2).map((person,i)=>v26ToolStub('person_dossier',`person_compare_${i+1}`,{person,scope:'all_events',status:'all'}));
    plan={...plan,action:'tools',clarification:''};
  } else if(intent.comparison){
    const fromPrompt=v26ComparisonEventNamesFromPrompt(userPrompt,state);
    const fromPlan=tools.flatMap(t=>arr(t?.events).concat(trim(t?.event)?[trim(t.event)]:[])).filter(Boolean);
    const names=semanticUnique(fromPrompt.length>=2?fromPrompt:fromPlan);
    if(names.length>=2){
      const compare=v26ToolStub('compare_events','compare_events',{events:names.slice(0,6),scope:'named_event',status:'all'});
      const rest=tools.filter(t=>t.name!=='compare_events'&&t.name!=='event_dossier').slice(0,2);
      tools=[compare,...rest].slice(0,4);
      plan={...plan,action:'tools',clarification:''};
    }
  }

  // Preguntas humanas sobre una persona deben recibir un dossier completo sin obligar al usuario
  // a saber que puede aparecer en pareja/alias ni a pedir ingresos, compras o tareas por separado.
  const hintedPerson=tools.find(t=>trim(t?.person))?.person||v26PersonHintFromPrompt(userPrompt,state);
  const shortNaturalPerson=hintedPerson && intent.conversational && text(userPrompt).split(/\s+/).filter(Boolean).length<=14;
  if(intent.broadPerson||shortNaturalPerson){
    if(hintedPerson){
      tools=tools.filter(t=>!['person_dossier','participation_events'].includes(t.name));
      tools.unshift(v26ToolStub('person_dossier','person_dossier',{person:hintedPerson,scope:'all_events',status:'all'}));
    }
  }

  const namedEvent=v26EventHintFromPrompt(userPrompt,state,selectedEventId);
  const eventRef=namedEvent||tools.find(t=>trim(t?.event))?.event||'';
  const eventScope=eventRef?'named_event':'active_event';
  if(intent.broadEvent||(namedEvent&&intent.conversational)||intent.spendAnalysis){
    if(!tools.some(t=>t.name==='event_dossier')) tools.unshift(v26ToolStub('event_dossier','event_dossier',{event:eventRef,scope:eventScope,status:'all'}));
    // Para una lectura abierta damos a Gemini contexto adicional; no significa que deba mostrar tablas.
    if(!tools.some(t=>t.name==='event_breakdowns')) tools.push(v26ToolStub('event_breakdowns','event_breakdowns',{event:eventRef,scope:eventScope,status:'all'}));
  }

  // «¿En qué se fue el dinero?» significa gasto REAL: nunca debe convertirse en valoración,
  // producto disponible ni compras+donaciones. CE aporta dossier + desgloses de compras realizadas.
  if(intent.spendAnalysis){
    tools=tools.filter(t=>t.name!=='store_purchases'||t.status==='realized');
  }

  // Si se habla de destino/segmento/comprado/donado/pendiente, el desglose económico es obligatorio.
  if(/\b(destino|segmento|comprado|donado|pendiente(?: de compra)?|valor disponible|plan total)\b/.test(p)){
    if(!tools.some(t=>t.name==='event_breakdowns')) tools.unshift(v26ToolStub('event_breakdowns','event_breakdowns',{event:eventRef,scope:eventScope,status:'all'}));
    if(!/\btienda|tiendas|almacen|almac[eé]n\b/.test(p)) tools=tools.filter(t=>t.name!=='store_purchases');
  }

  if(intent.anomaly){
    if(!tools.some(t=>t.name==='event_dossier')) tools.unshift(v26ToolStub('event_dossier','event_dossier',{event:eventRef,scope:eventScope,status:'all'}));
    if(!tools.some(t=>t.name==='event_breakdowns')) tools.push(v26ToolStub('event_breakdowns','event_breakdowns',{event:eventRef,scope:eventScope,status:'all'}));
    if(!tools.some(t=>t.name==='event_people')) tools.push(v26ToolStub('event_people','event_people',{event:eventRef,scope:eventScope,status:'all'}));
  }
  if(intent.documentation){
    tools=tools.filter(t=>t.name!=='events_overview');
    if(!tools.some(t=>t.name==='event_documentation')) tools.unshift(v26ToolStub('event_documentation','event_documentation',{event:eventRef,scope:eventScope,status:'all'}));
  }
  if(intent.globalAcrossEvents&&!namedEvent&&!intent.comparison){
    tools=tools.filter(t=>!['event_dossier','event_breakdowns','event_people'].includes(t.name));
    if(!tools.some(t=>t.name==='events_overview')) tools.unshift(v26ToolStub('events_overview','events_overview',{scope:'all_events',status:'all'}));
  }
  if(intent.peopleActivity){
    tools=tools.filter(t=>!['event_dossier','event_breakdowns','event_people','events_overview'].includes(t.name));
    if(!tools.some(t=>t.name==='people_activity')) tools.unshift(v26ToolStub('people_activity','people_activity',{scope:'all_events',status:'all'}));
  }

  // «Háblame de X» no necesita además una lista redundante de participación si ya hay dossier.
  if(tools.some(t=>t.name==='person_dossier')) tools=tools.filter((t,i,a)=>t.name!=='participation_events');
  // Deduplicación estable y máximo de cuatro herramientas.
  const seen=new Set(); tools=tools.filter(t=>{const sig=[t.name,trim(t.event),trim(t.person),trim(t.store),arr(t.events).join('|')].join('::');if(seen.has(sig))return false;seen.add(sig);return true;}).slice(0,4);
  return {...plan,tools};
}

function v26DeterministicPlan(userPrompt,state,selectedEventId='',conversationResolution={},conversationContext={}){
  const intent=v26ImplicitIntent(userPrompt),p=norm(userPrompt),frame=v26NormalizeConversationContext(conversationResolution?.frame||conversationContext||{});
  const wantsCharts=semanticPromptExplicitlyRequestsCharts(userPrompt);
  const tools=[];
  const add=t=>{const sig=[t.name,trim(t.event),trim(t.person),trim(t.store),arr(t.events).join('|')].join('::');if(!tools.some(x=>[x.name,trim(x.event),trim(x.person),trim(x.store),arr(x.events).join('|')].join('::')===sig))tools.push(t);};
  const currentPeople=v26PersonHintsFromPrompt(userPrompt,state);
  const currentEvents=v26ComparisonEventNamesFromPrompt(userPrompt,state);
  const frameEvent=trim(frame.events?.[0]);
  const explicitEvent=v26EventHintFromPrompt(userPrompt,state,selectedEventId);
  const eventRef=frameEvent||explicitEvent||'';
  const eventScope=eventRef?'named_event':'active_event';
  const follow=conversationResolution?.isFollowUp===true;
  const focus=trim(conversationResolution?.focus||frame.focus||v26FollowupFocusFromPrompt(userPrompt,''));

  if(follow&&frame.topic==='person_comparison'&&frame.people.length>=2){
    frame.people.slice(0,2).forEach((person,i)=>add(v26ToolStub('person_dossier',`person_compare_${i+1}`,{person,scope:'all_events',status:'all'})));
    return{action:'tools',clarification:'',intent:`continuación comparación personas · ${focus||'general'}`,wantsCharts:false,tools:tools.slice(0,4),model:'control-event-local-plan',localPlan:true,conversationFrame:{...frame,focus}};
  }
  if(follow&&frame.topic==='event_documentation'&&frameEvent){
    add(v26ToolStub('event_documentation','event_documentation',{event:frameEvent,scope:'named_event',status:'all'}));
    return{action:'tools',clarification:'',intent:`continuación documentación · ${focus||'detalle'}`,wantsCharts:false,tools,model:'control-event-local-plan',localPlan:true,conversationFrame:{...frame,focus}};
  }
  if(follow&&frame.events.length&&(focus==='documentation'||focus==='documentation_missing')){
    add(v26ToolStub('event_documentation','event_documentation',{event:frameEvent,scope:'named_event',status:'all'}));
    return{action:'tools',clarification:'',intent:`documentación del evento en conversación · ${focus}`,wantsCharts:false,tools,model:'control-event-local-plan',localPlan:true,conversationFrame:{...frame,topic:'event_documentation',focus}};
  }

  if(intent.comparison){
    if(currentPeople.length>=2&&currentEvents.length<2){
      currentPeople.slice(0,2).forEach((person,i)=>add(v26ToolStub('person_dossier',`person_compare_${i+1}`,{person,scope:'all_events',status:'all'})));
      return{action:'tools',clarification:'',intent:'comparación de personas',wantsCharts:false,tools,model:'control-event-local-plan',localPlan:true};
    }
    if(currentEvents.length>=2){
      add(v26ToolStub('compare_events','compare_events',{events:currentEvents.slice(0,6),scope:'named_event',status:'all'}));
      return{action:'tools',clarification:'',intent:'comparación canónica de eventos',wantsCharts,tools,model:'control-event-local-plan',localPlan:true};
    }
  }

  const hintedPerson=currentPeople[0]||v26PersonHintFromPrompt(userPrompt,state);
  if((intent.broadPerson||(hintedPerson&&intent.conversational))&&hintedPerson){
    add(v26ToolStub('person_dossier','person_dossier',{person:hintedPerson,scope:'all_events',status:'all'}));
    return{action:'tools',clarification:'',intent:'dossier personal 360',wantsCharts:false,tools,model:'control-event-local-plan',localPlan:true};
  }

  if(intent.documentation){
    add(v26ToolStub('event_documentation','event_documentation',{event:eventRef,scope:eventScope,status:'all'}));
    return{action:'tools',clarification:'',intent:'justificación documental del evento',wantsCharts:false,tools,model:'control-event-local-plan',localPlan:true};
  }
  if(intent.peopleActivity){
    add(v26ToolStub('people_activity','people_activity',{scope:'all_events',status:'all'}));
    return{action:'tools',clarification:'',intent:'implicación transversal de personas',wantsCharts,tools,model:'control-event-local-plan',localPlan:true};
  }
  if(intent.globalAcrossEvents&&!intent.comparison){
    add(v26ToolStub('events_overview','events_overview',{scope:'all_events',status:'all'}));
    return{action:'tools',clarification:'',intent:'análisis transversal de eventos',wantsCharts,tools,model:'control-event-local-plan',localPlan:true};
  }
  if(intent.anomaly){
    add(v26ToolStub('event_dossier','event_dossier',{event:eventRef,scope:eventScope,status:'all'}));
    add(v26ToolStub('event_breakdowns','event_breakdowns',{event:eventRef,scope:eventScope,status:'all'}));
    add(v26ToolStub('event_people','event_people',{event:eventRef,scope:eventScope,status:'all'}));
    add(v26ToolStub('event_documentation','event_documentation',{event:eventRef,scope:eventScope,status:'all'}));
    return{action:'tools',clarification:'',intent:'auditoría de anomalías del evento',wantsCharts,tools:tools.slice(0,4),model:'control-event-local-plan',localPlan:true};
  }
  if(intent.spendAnalysis){
    add(v26ToolStub('event_dossier','event_dossier',{event:eventRef,scope:eventScope,status:'all'}));
    add(v26ToolStub('event_breakdowns','event_breakdowns',{event:eventRef,scope:eventScope,status:'all'}));
    return{action:'tools',clarification:'',intent:'análisis de gasto real',wantsCharts,tools,model:'control-event-local-plan',localPlan:true};
  }
  if(intent.broadEvent||(explicitEvent&&intent.conversational)){
    add(v26ToolStub('event_dossier','event_dossier',{event:eventRef,scope:eventScope,status:'all'}));
    add(v26ToolStub('event_breakdowns','event_breakdowns',{event:eventRef,scope:eventScope,status:'all'}));
    return{action:'tools',clarification:'',intent:'análisis abierto del evento',wantsCharts,tools,model:'control-event-local-plan',localPlan:true};
  }
  return null;
}

function v26ConversationContextFromRun(userPrompt,plan,results,previousContext={},conversationResolution={},selectedEventId=''){
  const prev=v26NormalizeConversationContext(previousContext),p=norm(userPrompt),turn=(prev.turn||0)+1;
  const personResults=arr(results).filter(r=>r?.ok&&r?.name==='person_dossier');
  const doc=arr(results).find(r=>r?.ok&&r?.name==='event_documentation');
  const cmp=arr(results).find(r=>r?.ok&&r?.name==='compare_events');
  const overview=arr(results).find(r=>r?.ok&&r?.name==='events_overview');
  const activity=arr(results).find(r=>r?.ok&&r?.name==='people_activity');
  const event=arr(results).find(r=>r?.ok&&r?.name==='event_dossier');
  const focus=v26FollowupFocusFromPrompt(userPrompt,conversationResolution?.focus||prev.focus);
  if(personResults.length>=2){
    const planned=arr(plan?.tools).filter(t=>t?.name==='person_dossier').map(t=>trim(t?.person)).filter(Boolean);
    const people=semanticUnique(planned.length>=2?planned:personResults.map(r=>trim(r?.facts?.query||r?.facts?.person))).slice(0,2);
    return{version:1,topic:'person_comparison',people,events:[],focus,lastIntent:trim(plan?.intent)||'compare_people',selectedEventId:trim(selectedEventId),turn};
  }
  if(personResults.length===1){
    const r=personResults[0],name=trim(arr(plan?.tools).find(t=>t?.name==='person_dossier')?.person||r?.facts?.query||r?.facts?.person);
    return{version:1,topic:'person',people:name?[name]:[],events:[],focus,lastIntent:trim(plan?.intent)||'person',selectedEventId:trim(selectedEventId),turn};
  }
  if(doc){
    return{version:1,topic:'event_documentation',people:prev.people,events:[trim(doc?.facts?.event)].filter(Boolean),focus:focus==='documentation_missing'?'documentation_missing':'documentation',lastIntent:trim(plan?.intent)||'documentation',selectedEventId:trim(selectedEventId),turn};
  }
  if(cmp){
    return{version:1,topic:'event_comparison',people:[],events:arr(cmp?.facts?.event_names).map(trim).filter(Boolean).slice(0,6),focus:'comparison',lastIntent:trim(plan?.intent)||'compare_events',selectedEventId:trim(selectedEventId),turn};
  }
  if(event){
    return{version:1,topic:'event_analysis',people:[],events:[trim(event?.facts?.event)].filter(Boolean),focus:focus||'analysis',lastIntent:trim(plan?.intent)||'event',selectedEventId:trim(selectedEventId),turn};
  }
  if(overview)return{version:1,topic:'global_events',people:[],events:[],focus:'overview',lastIntent:trim(plan?.intent)||'overview',selectedEventId:trim(selectedEventId),turn};
  if(activity)return{version:1,topic:'people_activity',people:[],events:[],focus:'implication',lastIntent:trim(plan?.intent)||'people_activity',selectedEventId:trim(selectedEventId),turn};
  return{...prev,focus:focus||prev.focus,lastIntent:trim(plan?.intent)||prev.lastIntent,selectedEventId:trim(selectedEventId)||prev.selectedEventId,turn};
}

function v26PairParts(name){return trim(name).split(/\s+y\s+/i).map(trim).filter(Boolean);}

// v27_prod_1.2 · identidad canónica compartida por TODAS las herramientas personales.
// Una consulta por una persona atómica (p. ej. «Curvas») debe resolver siempre las mismas
// representaciones, tanto si Gemini llama person_dossier, participation_events o people_activity.
// Las parejas siguen siendo entidades registradas válidas, pero sus registros también quedan
// enlazados a cada miembro para consultas personales. Los importes compartidos NO son aditivos
// entre miembros de una pareja.
function v262CanonicalPeopleIndex(state){
  const rows=semanticCatalogRows(state,'person');
  const atoms=new Map(),pairs=[];
  const ensure=(display,sourceRow=null)=>{
    const key=canonicalNameKey(display);if(!key)return null;
    let rec=atoms.get(key);
    if(!rec){rec={key,display:trim(display),standaloneIds:new Set(),compositeIds:new Set(),names:new Set(),aliases:new Set()};atoms.set(key,rec);}
    if(sourceRow&&!isCanonicalPairName(sourceRow?.nombre)){rec.standaloneIds.add(trim(sourceRow.id));rec.names.add(trim(sourceRow.nombre));if(!rec.display)rec.display=trim(sourceRow.nombre);}
    return rec;
  };
  for(const row of rows){
    const name=trim(row.nombre);if(!name)continue;
    if(isCanonicalPairName(name)){pairs.push(row);for(const part of v26PairParts(name)){const rec=ensure(part);if(rec){rec.compositeIds.add(trim(row.id));rec.names.add(name);rec.aliases.add(trim(part));}}}
    else ensure(name,row);
  }
  // Preferimos la grafía del registro individual cuando existe; si no, la grafía vista en pareja.
  for(const rec of atoms.values()){
    if(rec.standaloneIds.size){const id=[...rec.standaloneIds][0],row=rows.find(x=>trim(x.id)===id);if(row?.nombre)rec.display=trim(row.nombre);}
  }
  return{rows,atoms,pairs};
}
function v262ResolveAtomicPerson(state,value){
  const idx=v262CanonicalPeopleIndex(state),needle=trim(value);if(!needle)return{ok:false,ambiguous:false,value:needle,type:'person',candidates:[]};
  const scored=[...idx.atoms.values()].map(rec=>({rec,score:semanticEntityScore(needle,rec.display)})).filter(x=>x.score>=0.72).sort((a,b)=>b.score-a.score||a.rec.display.localeCompare(b.rec.display,'es'));
  if(!scored.length)return{ok:false,ambiguous:false,value:needle,type:'person',candidates:[]};
  const top=scored[0],near=scored.filter(x=>top.score-x.score<=0.035);
  if(near.length>1&&top.score<0.995)return{ok:false,ambiguous:true,value:needle,type:'person',candidates:near.slice(0,5).map(x=>({id:[...x.rec.standaloneIds][0]||[...x.rec.compositeIds][0]||'',nombre:x.rec.display,score:x.score}))};
  const rec=top.rec,standaloneIds=[...rec.standaloneIds],compositeIds=[...rec.compositeIds],ids=[...new Set([...standaloneIds,...compositeIds])];
  return{ok:true,id:standaloneIds[0]||compositeIds[0]||'',nombre:rec.display,score:top.score,type:'person',identity_key:rec.key,identity_kind:'atomic_person',ids,names:[...rec.names],members:ids.map(id=>{const row=idx.rows.find(x=>trim(x.id)===id)||{};return{id,nombre:trim(row.nombre),kind:standaloneIds.includes(id)?'direct':'composite'};}),directIds:standaloneIds,compositeIds,expanded:ids.length>1||compositeIds.length>0,shared_pair_warning:compositeIds.length?'Los registros de pareja están vinculados a ambos miembros; no sumes los mismos importes entre personas como si fueran independientes.':''};
}
function v26ResolvePersonFamily(state,value){
  const needle=trim(value),queryIsPair=isCanonicalPairName(needle);
  if(!queryIsPair)return v262ResolveAtomicPerson(state,needle);
  const primary=semanticResolveEntity(state,'person',needle);if(!primary.ok)return primary;
  const rows=semanticCatalogRows(state,'person'),row=rows.find(x=>trim(x.id)===trim(primary.id))||{id:primary.id,nombre:primary.nombre};
  return{ok:true,id:trim(row.id),nombre:trim(row.nombre),score:primary.score,type:'person',identity_key:canonicalNameKey(row.nombre),identity_kind:'registered_pair',ids:[trim(row.id)],names:[trim(row.nombre)],members:[{id:trim(row.id),nombre:trim(row.nombre),kind:'direct'}],directIds:[trim(row.id)],compositeIds:[],expanded:false,shared_pair_warning:'Entidad de pareja consultada explícitamente; los importes corresponden al registro conjunto.'};
}
function v26SchemaField(kind,unit='',concept=''){return{kind,unit,concept};}
function v26MoneySchema(concept='Importe monetario'){return v26SchemaField('money','€',concept);}
function v26CountSchema(unit='registros',concept='Conteo'){return v26SchemaField('count',unit,concept);}
function v26DateSchema(concept='Fecha'){return v26SchemaField('date','',concept);}
function v26TextSchema(concept='Texto'){return v26SchemaField('text','',concept);}
function v26StatusSchema(concept='Estado'){return v26SchemaField('status','',concept);}
function v26TableFieldMeta(table,field){return table?.schema?.[field]||null;}
function v26IsChartNumericMeta(meta){return !!meta&&['money','count','quantity','percent','number'].includes(meta.kind);}

function v26EventById(state,id){return arr(state?.eventos).find(e=>trim(e?.id)===trim(id))||null;}
function v26ResolveEvent(state,selectedEventId,name,scope){
  if(scope==='active_event'||!trim(name)){
    const ev=v26EventById(state,selectedEventId); return ev?{ok:true,id:trim(ev.id),nombre:trim(ev.titulo),row:ev}:{ok:false,error:'No hay un evento activo en pantalla.'};
  }
  const r=semanticResolveEntity(state,'event',name); if(!r.ok)return{ok:false,error:r.ambiguous?`El evento «${name}» es ambiguo: ${r.candidates.map(x=>x.nombre).join(' / ')}`:`No encuentro el evento «${name}».`};
  return{ok:true,id:r.id,nombre:r.nombre,row:v26EventById(state,r.id)};
}
function v26PersonHistoryHelpers(state){
  const people=byId(state?.personas), snaps=new Map(arr(state?.eventPersonSnapshots).map(row=>[`${trim(row?.eventId||row?.event_id)}|${trim(row?.personaId||row?.persona_id)}`,row]));
  const eventMap=byId(state?.eventos);
  function identity(row){
    const eventId=trim(row?.eventId||row?.event_id), personId=trim(row?.personaId||row?.persona_id), snap=snaps.get(`${eventId}|${personId}`)||{}, cur=people.get(personId)||{};
    return {name:trim(row?.personaNombreSnapshot||row?.persona_nombre_snapshot||snap?.nombreSnapshot||snap?.nombre_snapshot||cur?.nombre||personId),range:trim(row?.personaRangoSnapshot||row?.persona_rango_snapshot||snap?.rangoSnapshot||snap?.rango_snapshot||cur?.rango||row?.rango||row?.personaRango||'')};
  }
  function income(row){
    const ev=eventMap.get(trim(row?.eventId||row?.event_id))||{}; const id=identity(row); const isSocio=norm(id.range)==='socio'; const numero=num(row?.numero); const mandatory=isSocio?round(numero*num(ev?.precio),2):0;
    const voluntary=round(row?.importeVoluntario??row?.voluntario??row?.donation??row?.importe??row?.importeDonacion??row?.aportacionVoluntaria??0,2);
    return {mandatory,voluntary,total:round(mandatory+voluntary,2),numero:round(numero,3),identity:id};
  }
  return{identity,income,eventMap,people};
}

// v27_prod_1.2 · señales económicas de atención.
// No decide la explicación final: entrega a Gemini patrones canónicos de la operativa CE
// para que pueda detectarlos desde el primer dossier sin esperar a que el usuario le pida «husmear».
function v271IncomeAttentionSignals(state,eventId,eventPrice=0){
  const eid=trim(eventId),price=v26Money(eventPrice),h=v26PersonHistoryHelpers(state);
  const att=arr(buildCanonicalAttendance(state,[eid])?.porEvento)[0]||{};
  const attending=new Set([...arr(att?.sociosAsistentes),...arr(att?.noSociosAsistentes)].map(x=>canonicalNameKey(x?.nombre)).filter(Boolean));
  const donationCurrent=new Map(),donationHistorical=new Map();
  for(const row of arr(state?.compras)){
    if(!isDonationTicket(ticketText(row)))continue;
    const pid=trim(text(row?.donorRef||row?.donor_ref).replace(/^P:/,''));if(!pid)continue;
    const amount=v26Money(valueOfLine(row));
    donationHistorical.set(pid,v26Money((donationHistorical.get(pid)||0)+amount));
    if(trim(row?.eventId||row?.event_id)===eid)donationCurrent.set(pid,v26Money((donationCurrent.get(pid)||0)+amount));
  }
  const signals=[],technicalCorrections=[];
  for(const c of arr(state?.colaboradores).filter(x=>trim(x?.eventId||x?.event_id)===eid)){
    const pid=trim(c?.personaId||c?.persona_id),inc=h.income(c),name=trim(inc?.identity?.name),range=norm(inc?.identity?.range),key=canonicalNameKey(name);
    const total=v26Money(inc.total),voluntary=v26Money(inc.voluntary),mandatory=v26Money(inc.mandatory),numero=round(inc.numero,3);
    const isTechnical=/^z[\s_-]*dev/i.test(name)||/^z[\s_-]*de/i.test(name);
    if(isTechnical){
      if(total<0||voluntary<0)technicalCorrections.push({Entidad:name||'Entidad técnica',Importe:total||voluntary,'Situación / forma registrada':trim(c?.situacion||''),Tipo:'Corrección/devolución de ingresos',Explicación:'Apunte técnico negativo: reduce ingresos ya registrados. La persona beneficiaria solo debe atribuirse si existe vínculo documental, bancario o contexto explícito; no por mera coincidencia de importes.'});
      continue;
    }
    const pairSize=isCanonicalPairName(name)?Math.max(2,v26PairParts(name).length||2):1;
    const fullStandard=v26Money(price*pairSize),currentDonation=v26Money(donationCurrent.get(pid)||0),historicalDonation=v26Money(donationHistorical.get(pid)||0);
    const attended=attending.has(key);
    if(range==='socio' && numero===0 && total===0 && attended){
      const donationCovers=fullStandard>0 && currentDonation>=fullStandard-0.01;
      signals.push({Persona:name,Tipo:donationCovers?'Exención compatible con aportación en especie':'Exención/cuota cero con asistencia confirmada','Número':numero,'Cuota estándar evento completo':fullStandard,'Importe obligatorio':mandatory,'Ajuste voluntario':voluntary,'Importe total':total,'Donado en este evento':currentDonation,'Donado históricamente':historicalDonation,Asistencia:'Confirmada',Explicación:donationCovers?'La persona/pareja figura como asistente con cuota 0 y su producto donado en este evento iguala o supera la cuota estándar completa. En la operativa de ControlEvent este patrón es coherente con una exención de pago por aportación en especie.':'La persona/pareja figura como asistente con cuota 0. ControlEvent admite exenciones; si la donación del evento no explica por sí sola la exención, la causa concreta debe apoyarse en documentación o contexto de la conversación.'});
    }
    if(range==='socio' && voluntary<0){
      signals.push({Persona:name,Tipo:'Precio ajustado sobre la cuota estándar','Número':numero,'Cuota estándar evento completo':fullStandard,'Importe obligatorio':mandatory,'Ajuste voluntario':voluntary,'Importe total':total,'Donado en este evento':currentDonation,'Donado históricamente':historicalDonation,Asistencia:attended?'Confirmada':'No confirmada por asistencia canónica',Explicación:'El importe voluntario negativo reduce deliberadamente la cuota calculada como Número × precio. En la operativa de ControlEvent este mecanismo se usa para reflejar un precio convenido —por ejemplo, asistencia parcial o una circunstancia de conveniencia—. El motivo concreto debe atribuirse solo si consta en datos, documentos o en una aclaración del usuario.'});
    }
    if(range==='socio'){
      const formulaExpected=v26Money(numero*price);
      if(Math.abs(mandatory-formulaExpected)>0.011)signals.push({Persona:name,Tipo:'Desajuste de fórmula obligatoria','Número':numero,'Cuota estándar evento completo':fullStandard,'Importe obligatorio':mandatory,'Ajuste voluntario':voluntary,'Importe total':total,'Donado en este evento':currentDonation,'Donado históricamente':historicalDonation,Asistencia:attended?'Confirmada':'No confirmada',Explicación:'El obligatorio no coincide con Número × precio del evento. Esto sí requiere revisión porque rompe la fórmula canónica de ControlEvent.'});
    }
  }
  return {signals,technicalCorrections,summary:{attention_count:signals.length,technical_correction_count:technicalCorrections.length,rule:'Para SOCIO: obligatorio = Número × precio. Número 0 puede coexistir con asistencia si la situación confirma exención/invitación. Importe voluntario negativo es un ajuste manual sobre la cuota estándar. Los apuntes negativos de entidades z_DEV son correcciones/devoluciones de ingresos y no deben atribuirse a una persona sin evidencia de vínculo.'}};
}
function v26Table(key,title,rows,schema={}){return{key,title,rows:arr(rows),schema:schema||{}};}
function v26Money(n){return round(n,2);}
async function v26ToolEventDossier(tool,state,selectedEventId){
  const rr=v26ResolveEvent(state,selectedEventId,tool.event,tool.scope); if(!rr.ok)throw new Error(rr.error);
  const compact=compactState(state,rr.id); const summary=arr(compact?.eventosResumen).find(x=>trim(x?.id)===rr.id)||{}; const ev=rr.row||{};
  const att=arr(buildCanonicalAttendance(state,[rr.id])?.porEvento)[0]||{};
  let hitosCount=0,lgCount=0,lgCompleted=0,lgPending=0;
  try{
    const hs=await listAllHitosState();
    const hitos=arr(hs?.hitos).filter(x=>trim(x?.eventId)===rr.id);
    const lgs=arr(hs?.lgs).filter(x=>trim(x?.eventId)===rr.id);
    hitosCount=hitos.length;lgCount=lgs.length;lgCompleted=lgs.filter(x=>x?.cumplida===true).length;lgPending=Math.max(0,lgCount-lgCompleted);
  }catch(_){}
  const incomeAttention=v271IncomeAttentionSignals(state,rr.id,num(ev?.precio));
  const facts={event_id:rr.id,event:rr.nombre,status:trim(ev?.situacion||summary?.situacion),start:trim(ev?.fechaIni),end:trim(ev?.fechaFin),price:v26Money(ev?.precio),description:trim(ev?.descripcion),
    income_total:v26Money(summary?.ingresosTotal),income_members:v26Money(summary?.ingresosSocios),income_nonmembers:v26Money(summary?.ingresosNoSociosYOtros),income_mandatory:v26Money(summary?.importeObligatorioSocios),income_voluntary:v26Money(summary?.importeVoluntario),
    income_attention_count:incomeAttention.summary.attention_count,income_technical_correction_count:incomeAttention.summary.technical_correction_count,income_attention_signals:incomeAttention.signals.slice(0,12),income_technical_corrections:incomeAttention.technicalCorrections.slice(0,12),income_attention_rule:incomeAttention.summary.rule,
    purchases_realized:v26Money(summary?.comprasReales),purchases_pending:v26Money(summary?.comprasPendientes),donations_value:v26Money(summary?.donacionesValor),income_people_units:round(summary?.entradasTotal,3),
    attendees_canonical:round(att?.totalAsistentesPersonas,3),members_attending:round(att?.sociosAsistentesPersonas,3),nonmembers_attending:round(att?.noSociosAsistentesPersonas,3),members_not_attending:round(att?.sociosNoAsistentesPersonas,3),
    operating_balance:v26Money(num(summary?.ingresosTotal)-num(summary?.comprasReales)-num(summary?.comprasPendientes)),event_valuation:v26Money(num(summary?.comprasReales)+num(summary?.donacionesValor)),valuation_formula:'Valoración del evento = compras realizadas + valor del producto donado',
    hitos_count:hitosCount,lg_count:lgCount,lg_completed:lgCompleted,lg_pending:lgPending,attendance_criterion:trim(att?.criterio)};
  const facts_schema={
    event:v26TextSchema('Evento canónico resuelto'),status:v26StatusSchema('Estado del evento'),start:v26DateSchema('Fecha de inicio'),end:v26DateSchema('Fecha de fin'),price:v26MoneySchema('Precio por socio/persona según configuración del evento'),
    income_total:v26MoneySchema('Ingreso total real calculado por ControlEvent. Para socios: obligatorio + ajuste voluntario; para no socios: su aportación queda en voluntario. Es la suma final efectivamente registrada.'),
    income_members:v26MoneySchema('Ingreso total real de registros cuyo rango histórico es SOCIO, DESPUÉS de aplicar sus ajustes voluntarios. No es la cuota obligatoria teórica.'),
    income_nonmembers:v26MoneySchema('Ingreso total real de registros NO SOCIO / OTRO. No equivale al componente obligatorio de socios.'),
    income_mandatory:v26MoneySchema('Componente obligatorio teórico de los registros SOCIO = número x precio, ANTES de ajustes voluntarios. No incluye no socios.'),
    income_voluntary:v26MoneySchema('Suma de los campos voluntarios/ajustes de TODOS los registros; puede incluir aportaciones de no socios y ajustes negativos de socios.'),
    income_attention_count:v26CountSchema('señales','Situaciones de ingreso que merecen explicación contextual: exenciones con asistencia, ajustes negativos o desajustes de fórmula.'),
    income_technical_correction_count:v26CountSchema('correcciones','Apuntes técnicos negativos de entidades z_DEV que corrigen/devuelven ingresos.'),
    purchases_realized:v26MoneySchema('Compras efectivamente realizadas'),purchases_pending:v26MoneySchema('Compras previstas/pendientes, no realizadas'),donations_value:v26MoneySchema('Valor estimado del producto donado; no es salida de caja'),
    operating_balance:v26MoneySchema('Saldo operativo = ingresos - compras realizadas - compras pendientes, según la lógica vigente de ControlEvent'),event_valuation:v26MoneySchema('Valoración = compras realizadas + valor del producto donado'),
    attendees_canonical:v26CountSchema('personas','Asistencia según criterio canónico'),members_attending:v26CountSchema('personas','Socios asistentes canónicos'),nonmembers_attending:v26CountSchema('personas','No socios asistentes canónicos'),hitos_count:v26CountSchema('hitos'),lg_count:v26CountSchema('tareas')
  };
  facts.semantic_guardrail='No deduzcas que una diferencia entre agregados pertenece a un grupo concreto solo porque la aritmética encaje. income_members, income_mandatory e income_voluntary tienen definiciones distintas; para atribuir un ajuste a una persona o rango consulta event_people.';
  const rows=[
    {Indicador:'Estado',Valor:facts.status},{Indicador:'Fecha inicio',Valor:facts.start},{Indicador:'Fecha fin',Valor:facts.end},{Indicador:'Precio por socio',Valor:facts.price},
    {Indicador:'Ingresos',Valor:facts.income_total},{Indicador:'Compras realizadas',Valor:facts.purchases_realized},{Indicador:'Compras pendientes',Valor:facts.purchases_pending},{Indicador:'Donaciones valoradas',Valor:facts.donations_value},{Indicador:'Saldo operativo',Valor:facts.operating_balance},{Indicador:'Valoración del evento',Valor:facts.event_valuation},{Indicador:'Asistentes canónicos',Valor:facts.attendees_canonical}
  ];
  const economicsChartRows=[
    {Indicador:'Ingresos',Valor:facts.income_total},{Indicador:'Compras realizadas',Valor:facts.purchases_realized},{Indicador:'Donaciones valoradas',Valor:facts.donations_value},{Indicador:'Saldo operativo',Valor:facts.operating_balance},{Indicador:'Valoración del evento',Valor:facts.event_valuation}
  ];
  const attendanceChartRows=[
    {Indicador:'Socios asistentes',Valor:facts.members_attending},{Indicador:'No socios asistentes',Valor:facts.nonmembers_attending},{Indicador:'Socios no asistentes',Valor:facts.members_not_attending}
  ];
  const managementChartRows=[
    {Indicador:'Hitos',Valor:facts.hitos_count},{Indicador:'Tareas LG completadas',Valor:facts.lg_completed},{Indicador:'Tareas LG pendientes',Valor:facts.lg_pending}
  ];
  return{id:tool.id,name:tool.name,ok:true,title:`Dossier · ${rr.nombre}`,facts,facts_schema,provenance:'ControlEvent · hechos canónicos',tables:[
    v26Table('kpis',`Indicadores de ${rr.nombre}`,rows,{Indicador:v26TextSchema('Nombre del indicador'),Valor:v26TextSchema('Valor; la unidad depende del indicador y está definida en facts_schema')}),
    v26Table('economics_chart',`Economía · ${rr.nombre}`,economicsChartRows,{Indicador:v26TextSchema('Magnitud económica'),Valor:v26MoneySchema('Importe canónico en euros')}),
    v26Table('attendance_chart',`Asistencia · ${rr.nombre}`,attendanceChartRows,{Indicador:v26TextSchema('Grupo de asistencia'),Valor:v26CountSchema('personas','Personas según criterio canónico')}),
    v26Table('management_chart',`Gestión · ${rr.nombre}`,managementChartRows,{Indicador:v26TextSchema('Indicador de gestión'),Valor:v26CountSchema('elementos','Recuento de hitos/tareas')}),
    {...v26Table('income_attention',`Ingresos que merecen atención · ${rr.nombre}`,incomeAttention.signals,{Persona:v26TextSchema('Persona/pareja'),Tipo:v26TextSchema('Patrón detectado'),Número:v26CountSchema('personas','Número usado para calcular la cuota obligatoria'),'Cuota estándar evento completo':v26MoneySchema('Precio del evento × tamaño nominal de la persona/pareja'),'Importe obligatorio':v26MoneySchema('Número × precio'),'Ajuste voluntario':v26MoneySchema('Ajuste manual; puede ser negativo'),'Importe total':v26MoneySchema('Obligatorio + ajuste voluntario'),'Donado en este evento':v26MoneySchema('Producto donado por esa entidad en este evento'),'Donado históricamente':v26MoneySchema('Producto donado por esa entidad en todos los eventos'),Asistencia:v26StatusSchema('Asistencia canónica'),Explicación:v26TextSchema('Interpretación semántica respaldada por las reglas de ControlEvent')}),chartable:false},
    {...v26Table('income_corrections',`Correcciones/devoluciones de ingresos · ${rr.nombre}`,incomeAttention.technicalCorrections,{Entidad:v26TextSchema('Entidad técnica'),Importe:v26MoneySchema('Importe negativo de corrección'),'Situación / forma registrada':v26TextSchema('Situación/forma almacenada'),Tipo:v26TextSchema('Tipo de señal'),Explicación:v26TextSchema('Semántica canónica de la corrección')}),chartable:false}
  ].filter(t=>t.rows.length||['kpis','economics_chart','attendance_chart','management_chart'].includes(t.key))};
}
async function v26ToolEventBreakdowns(tool,state,selectedEventId){
  const rr=v26ResolveEvent(state,selectedEventId,tool.event,tool.scope); if(!rr.ok)throw new Error(rr.error);
  const stores=byId(state?.tiendas),products=byId(state?.productos);const lines=arr(state?.compras).filter(x=>trim(x?.eventId||x?.event_id)===rr.id);
  const byStore=new Map(),byDest=new Map(),bySeg=new Map(),byProd=new Map();
  const addSplit=(map,key,kind,amount)=>{const k=trim(key)||'Sin clasificar',g=map.get(k)||{Comprado:0,Donado:0,'Pte.Compra':0};g[kind]+=amount;map.set(k,g);};
  for(const row of lines){const amount=valueOfLine(row),tt=ticketText(row),pid=trim(row?.productoId||row?.producto_id),prod=products.get(pid)||{},kind=isDonationTicket(tt)?'Donado':isPendingTicket(tt)?'Pte.Compra':'Comprado';
    addSplit(byDest,trim(prod?.destino)||'Sin destino',kind,amount);addSplit(bySeg,trim(prod?.segmento)||'Sin segmento',kind,amount);
    if(kind==='Comprado'){const store=trim(stores.get(trim(row?.tiendaId||row?.tienda_id))?.nombre)||'Sin tienda';byStore.set(store,(byStore.get(store)||0)+amount);const pn=trim(prod?.nombre)||pid||'Sin producto',g=byProd.get(pn)||{Producto:pn,Unidades:0,Importe:0};g.Unidades+=num(row?.unidades);g.Importe+=amount;byProd.set(pn,g);}
  }
  const splitRows=(map,label)=>[...map.entries()].map(([name,g])=>({[label]:name,Comprado:v26Money(g.Comprado),Donado:v26Money(g.Donado),'Pte.Compra':v26Money(g['Pte.Compra']),'Valor disponible':v26Money(g.Comprado+g.Donado),'Plan total':v26Money(g.Comprado+g.Donado+g['Pte.Compra'])})).sort((a,b)=>num(b['Plan total'])-num(a['Plan total']));
  const storeRows=[...byStore.entries()].map(([Tienda,Importe])=>({Tienda,Importe:v26Money(Importe)})).sort((a,b)=>b.Importe-a.Importe);
  const prodRows=[...byProd.values()].map(x=>({Producto:x.Producto,Unidades:round(x.Unidades,3),Importe:v26Money(x.Importe)})).sort((a,b)=>b.Importe-a.Importe);
  const prodQty=prodRows.slice().sort((a,b)=>b.Unidades-a.Unidades);
  const compact=compactState(state,rr.id),summary=arr(compact?.eventosResumen).find(x=>trim(x?.id)===rr.id)||{};
  const incomeMethods=arr(summary?.ingresosPorFormaPago).map(x=>({'Forma de pago':trim(x?.nombre),Importe:v26Money(x?.valor)}));
  const splitSchema=(label)=>({[label]:v26TextSchema(label),Comprado:v26MoneySchema('Compras realizadas'),'Donado':v26MoneySchema('Donaciones de producto'),'Pte.Compra':v26MoneySchema('Compras pendientes'),'Valor disponible':v26MoneySchema('Comprado + Donado; producto ya disponible'),'Plan total':v26MoneySchema('Comprado + Donado + Pte.Compra')});
  const destinationRows=splitRows(byDest,'Destino'),segmentRows=splitRows(bySeg,'Segmento');
  const purchasesRealized=v26Money(storeRows.reduce((a,x)=>a+x.Importe,0));
  const donationsValue=v26Money(destinationRows.reduce((a,x)=>a+num(x.Donado),0));
  const purchasesPending=v26Money(destinationRows.reduce((a,x)=>a+num(x['Pte.Compra']),0));
  return{id:tool.id,name:tool.name,ok:true,title:`Desgloses · ${rr.nombre}`,facts:{event:rr.nombre,purchases_realized:purchasesRealized,purchases_pending:purchasesPending,donations_value:donationsValue,
    top_stores:storeRows.slice(0,5),top_destinations_realized:destinationRows.slice().sort((a,b)=>num(b.Comprado)-num(a.Comprado)).slice(0,5),top_segments_realized:segmentRows.slice().sort((a,b)=>num(b.Comprado)-num(a.Comprado)).slice(0,5),top_products_realized:prodRows.slice(0,8),
    economic_distribution_note:'Comprado, Donado y Pte.Compra son conceptos distintos. Valor disponible = Comprado + Donado. Plan total = Comprado + Donado + Pte.Compra.'},tables:[
    v26Table('stores','Compras realizadas por tienda',storeRows,{Tienda:v26TextSchema('Tienda'),Importe:v26MoneySchema('Solo compras realizadas; excluye donaciones y pendientes')}),
    v26Table('destinations','Distribución económica por destino',destinationRows,splitSchema('Destino')),
    v26Table('segments','Distribución económica por segmento',segmentRows,splitSchema('Segmento')),
    v26Table('products_cost','Productos comprados por coste',prodRows.slice(0,20),{Producto:v26TextSchema('Producto'),Unidades:v26SchemaField('quantity','uds','Unidades compradas'),Importe:v26MoneySchema('Coste de compras realizadas')}),
    v26Table('products_units','Productos comprados por unidades',prodQty.slice(0,20),{Producto:v26TextSchema('Producto'),Unidades:v26SchemaField('quantity','uds','Unidades compradas'),Importe:v26MoneySchema('Coste de compras realizadas')}),
    v26Table('income_methods','Ingresos por forma de pago',incomeMethods,{'Forma de pago':v26TextSchema('Forma de pago'),Importe:v26MoneySchema('Ingresos canónicos')})
  ].filter(t=>t.rows.length)};
}
async function v26ToolEventPeople(tool,state,selectedEventId){
  const rr=v26ResolveEvent(state,selectedEventId,tool.event,tool.scope); if(!rr.ok)throw new Error(rr.error); const h=v26PersonHistoryHelpers(state); const rows=[];
  for(const c of arr(state?.colaboradores).filter(x=>trim(x?.eventId||x?.event_id)===rr.id)){
    const inc=h.income(c); const technical=/^z[\s_-]*dev/i.test(trim(inc.identity.name))||/^z[\s_-]*de/i.test(trim(inc.identity.name));
    if(technical)continue;
    rows.push({Persona:inc.identity.name,Rango:inc.identity.range,Número:inc.numero,'Situación / forma registrada':trim(c?.situacion||c?.formaPago||c?.ingreso||'Pendiente'),'Importe obligatorio':inc.mandatory,'Importe voluntario':inc.voluntary,'Importe total':inc.total});
  }
  const att=arr(buildCanonicalAttendance(state,[rr.id])?.porEvento)[0]||{};
  const attention=v271IncomeAttentionSignals(state,rr.id,num(rr?.row?.precio));
  return{id:tool.id,name:tool.name,ok:true,title:`Personas · ${rr.nombre}`,facts:{event:rr.nombre,records:rows.length,income_people_units:round(rows.reduce((a,r)=>a+num(r.Número),0),3),attendees_canonical:round(att?.totalAsistentesPersonas,3),members_attending:round(att?.sociosAsistentesPersonas,3),nonmembers_attending:round(att?.noSociosAsistentesPersonas,3),income_total:v26Money(rows.reduce((a,r)=>a+num(r['Importe total']),0)),income_attention_count:attention.summary.attention_count,income_technical_correction_count:attention.summary.technical_correction_count,income_attention_rule:attention.summary.rule,income_attention_signals:attention.signals.slice(0,20),income_technical_corrections:attention.technicalCorrections.slice(0,20),attendance_criterion:trim(att?.criterio),income_row_formula:'Para SOCIO, Importe obligatorio = Número × precio del evento. Importe total = Importe obligatorio + Importe voluntario/ajuste. Número 0 puede coexistir con asistencia canónica cuando la situación confirma exención/invitación. Un importe voluntario negativo reduce deliberadamente la cuota estándar.',semantic_guardrail:'No reasignes un importe de un grupo a otro por diferencia aritmética. Distingue cuota estándar, ajuste manual, exención y correcciones z_DEV. Si el total es 0, no digas «pagado por Banco»: di «situación/forma registrada: Banco».'},facts_schema:{records:v26CountSchema('registros','Registros de personas/parejas del evento, excluyendo entidades técnicas z_DEV'),income_people_units:v26CountSchema('personas','Suma del campo Número de registros; no sustituye asistencia canónica'),attendees_canonical:v26CountSchema('personas','Asistencia canónica'),members_attending:v26CountSchema('personas','Socios asistentes canónicos'),nonmembers_attending:v26CountSchema('personas','No socios asistentes canónicos'),income_total:v26MoneySchema('Suma de Importe total de las filas de personas/parejas'),income_attention_count:v26CountSchema('señales','Situaciones de ingreso que merecen explicación contextual'),income_technical_correction_count:v26CountSchema('correcciones','Correcciones/devoluciones registradas mediante entidades técnicas')},provenance:'ControlEvent · hechos canónicos',tables:[
    v26Table('people',`Participación e ingresos · ${rr.nombre}`,rows,{Persona:v26TextSchema('Persona o pareja registrada'),Rango:v26TextSchema('Rango histórico'),Número:v26CountSchema('personas','Multiplicador de la cuota obligatoria; NO equivale por sí solo a asistencia canónica'),'Situación / forma registrada':v26TextSchema('Situación o forma registrada; con importe 0 no implica que haya existido un pago'),'Importe obligatorio':v26MoneySchema('Para SOCIO: Número × precio del evento, antes del ajuste voluntario'),'Importe voluntario':v26MoneySchema('Aportación adicional o ajuste manual; puede ser negativa para rebajar la cuota estándar'),'Importe total':v26MoneySchema('Importe obligatorio + importe voluntario/ajuste')}),
    v26Table('attention_signals',`Situaciones de ingreso que merecen atención · ${rr.nombre}`,attention.signals,{Persona:v26TextSchema(),Tipo:v26TextSchema(),Número:v26CountSchema('personas'),'Cuota estándar evento completo':v26MoneySchema(),'Importe obligatorio':v26MoneySchema(),'Ajuste voluntario':v26MoneySchema(),'Importe total':v26MoneySchema(),'Donado en este evento':v26MoneySchema(),'Donado históricamente':v26MoneySchema(),Asistencia:v26StatusSchema(),Explicación:v26TextSchema()}),
    v26Table('technical_corrections',`Correcciones/devoluciones técnicas · ${rr.nombre}`,attention.technicalCorrections,{Entidad:v26TextSchema(),Importe:v26MoneySchema('Importe negativo de corrección'),'Situación / forma registrada':v26TextSchema(),Tipo:v26TextSchema(),Explicación:v26TextSchema()})
  ].filter(t=>t.rows.length)};
}
async function v26ToolParticipation(tool,state){
  const r=v26ResolvePersonFamily(state,tool.person); if(!r.ok)throw new Error(r.ambiguous?`«${tool.person}» puede ser varias personas: ${r.candidates.map(x=>x.nombre).join(' / ')}`:`No encuentro a «${tool.person}».`);
  const ids=new Set(r.ids),h=v26PersonHistoryHelpers(state),eventMap=h.eventMap,rows=[];const seen=new Set();
  for(const c of arr(state?.colaboradores).filter(x=>ids.has(trim(x?.personaId||x?.persona_id)))){
    const eid=trim(c?.eventId||c?.event_id),pid=trim(c?.personaId||c?.persona_id),ev=eventMap.get(eid)||{};const sig=`${eid}|${pid}`;if(!eid||seen.has(sig))continue;seen.add(sig);const inc=h.income(c);const registered=trim(h.people.get(pid)?.nombre)||inc.identity.name;
    rows.push({Evento:trim(ev?.titulo||eid),'Fecha inicio':trim(ev?.fechaIni),'Fecha fin':trim(ev?.fechaFin),'Registrado como':registered,'Estado ingreso':trim(c?.situacion||''),'Número':inc.numero});
  }
  rows.sort((a,b)=>text(b['Fecha inicio']).localeCompare(text(a['Fecha inicio'])));const eventCount=new Set(rows.map(x=>x.Evento).filter(Boolean)).size;
  return{id:tool.id,name:tool.name,ok:true,title:`Eventos de ${r.nombre}`,facts:{person:r.nombre,query:trim(tool.person),identity_key:r.identity_key||canonicalNameKey(r.nombre),identity_kind:r.identity_kind||'person',event_count:eventCount,matched_entities:r.names,canonical_representations:r.names,composite_expansion:r.expanded,shared_pair_warning:trim(r.shared_pair_warning)},facts_schema:{person:v26TextSchema('Identidad canónica resuelta'),event_count:v26CountSchema('eventos','Eventos únicos vinculados a cualquiera de sus representaciones'),canonical_representations:v26TextSchema('Nombres/parejas vinculados a esta identidad')},provenance:'ControlEvent · hechos canónicos',tables:[v26Table('events',`Eventos en los que aparece ${r.nombre}`,rows,{Evento:v26TextSchema('Evento'),'Fecha inicio':v26DateSchema(),'Fecha fin':v26DateSchema(),'Registrado como':v26TextSchema('Nombre exacto del registro, incluida pareja si procede'),'Estado ingreso':v26StatusSchema('Situación del ingreso'),Número:v26CountSchema('personas','Número del registro')})]};
}
async function v26ToolPersonDossier(tool,state){
  const r=v26ResolvePersonFamily(state,tool.person); if(!r.ok)throw new Error(r.ambiguous?`«${tool.person}» puede ser varias personas: ${r.candidates.map(x=>x.nombre).join(' / ')}`:`No encuentro a «${tool.person}».`);
  const ids=new Set(r.ids),directIds=new Set(arr(r.directIds)),h=v26PersonHistoryHelpers(state),eventMap=h.eventMap,participation=[],incomes=[],negatives=[];let linkedIncome=0,directIncome=0,compositeIncome=0;const directEvents=new Set(),compositeEvents=new Set();
  for(const c of arr(state?.colaboradores).filter(x=>ids.has(trim(x?.personaId||x?.persona_id)))){
    const pid=trim(c?.personaId||c?.persona_id),eid=trim(c?.eventId||c?.event_id),ev=eventMap.get(eid)||{},inc=h.income(c),registered=trim(h.people.get(pid)?.nombre)||inc.identity.name;linkedIncome+=inc.total;if(directIds.has(pid)){directIncome+=inc.total;if(eid)directEvents.add(eid);}else{compositeIncome+=inc.total;if(eid)compositeEvents.add(eid);}if(inc.voluntary<0)negatives.push({event:trim(ev?.titulo),registered_as:registered,voluntary:inc.voluntary,mandatory:inc.mandatory,total:inc.total});
    participation.push({Evento:trim(ev?.titulo),'Fecha inicio':trim(ev?.fechaIni),'Fecha fin':trim(ev?.fechaFin),'Registrado como':registered,'Estado ingreso':trim(c?.situacion||''),'Número':inc.numero});
    incomes.push({Evento:trim(ev?.titulo),'Registrado como':registered,Importe:inc.total,'Importe obligatorio':inc.mandatory,'Importe voluntario':inc.voluntary});
  }
  const purchaseRows=arr(state?.compras).filter(c=>ids.has(trim(c?.responsableId||c?.responsable_id))&&!isDonationTicket(ticketText(c))&&!isPendingTicket(ticketText(c))).map(c=>{const ev=eventMap.get(trim(c?.eventId||c?.event_id))||{},pid=trim(c?.responsableId||c?.responsable_id);return{Evento:trim(ev?.titulo),Responsable:trim(h.people.get(pid)?.nombre)||r.nombre,TKxx:ticketText(c),Importe:valueOfLine(c)};});
  const donationRows=arr(state?.compras).filter(c=>isDonationTicket(ticketText(c))&&ids.has(trim(text(c?.donorRef||c?.donor_ref).replace(/^P:/,'')))).map(c=>{const ev=eventMap.get(trim(c?.eventId||c?.event_id))||{},pid=trim(text(c?.donorRef||c?.donor_ref).replace(/^P:/,''));return{Evento:trim(ev?.titulo),Donante:trim(h.people.get(pid)?.nombre)||r.nombre,Tipo:ticketText(c),Importe:valueOfLine(c)};});
  let hitos=[],lgs=[];try{const hs=await listAllHitosState();hitos=arr(hs?.hitos).filter(x=>ids.has(trim(x?.responsableId))||r.names.some(n=>norm(x?.responsableNombre)===norm(n)));lgs=arr(hs?.lgs).filter(x=>ids.has(trim(x?.responsableId))||r.names.some(n=>norm(x?.responsableNombre)===norm(n)));}catch(_){ }
  const taskRows=[...hitos.map(x=>({Tipo:'HITO',Evento:trim(eventMap.get(trim(x?.eventId))?.titulo),Responsable:trim(x?.responsableNombre),Descripción:trim(x?.nombreHito||x?.descripcion),Estado:''})),...lgs.map(x=>({Tipo:'LG',Evento:trim(eventMap.get(trim(x?.eventId))?.titulo),Responsable:trim(x?.responsableNombre),Descripción:trim(x?.descripcion),Estado:x?.cumplida?'Cumplida':'Pendiente'}))];
  const uniqueEvents=new Set(participation.map(x=>x.Evento).filter(Boolean));
  const facts={person:r.nombre,query:trim(tool.person),identity_key:r.identity_key||canonicalNameKey(r.nombre),identity_kind:r.identity_kind||'person',matched_entities:r.names,canonical_representations:r.names,composite_expansion:r.expanded,event_count:uniqueEvents.size,direct_event_count:directEvents.size,composite_event_count:compositeEvents.size,income_linked_total:v26Money(linkedIncome),income_direct_total:v26Money(directIncome),income_composite_total:v26Money(compositeIncome),income_semantics:r.expanded?'income_linked_total incluye registros individuales y registros de pareja/entidad compuesta; no atribuir todo el importe exclusivamente a una sola persona.': 'Todos los ingresos enlazados corresponden a la entidad resuelta.',shared_pair_warning:trim(r.shared_pair_warning),purchase_responsibility_total:v26Money(purchaseRows.reduce((a,x)=>a+num(x.Importe),0)),purchase_responsibility_records:purchaseRows.length,purchase_responsibility_lines:purchaseRows.length,donations_value:v26Money(donationRows.reduce((a,x)=>a+num(x.Importe),0)),donation_records:donationRows.length,donation_lines:donationRows.length,hitos_count:hitos.length,lg_count:lgs.length,negative_voluntary_adjustments:negatives};
  const facts_schema={person:v26TextSchema('Identidad canónica resuelta'),identity_key:v26TextSchema('Clave estable de identidad dentro de esta respuesta'),canonical_representations:v26TextSchema('Nombres/parejas que ControlEvent vinculó a la identidad'),event_count:v26CountSchema('eventos','Número de eventos únicos vinculados a cualquiera de las representaciones'),direct_event_count:v26CountSchema('eventos','Eventos mediante registro individual/directo'),composite_event_count:v26CountSchema('eventos','Eventos mediante registro de pareja/entidad compuesta'),income_linked_total:v26MoneySchema('Ingresos vinculados a todas las representaciones de la identidad; los registros de pareja son compartidos y no deben atribuirse íntegramente a un solo miembro'),income_direct_total:v26MoneySchema('Ingresos de registros individuales/directos'),income_composite_total:v26MoneySchema('Ingresos de registros de pareja/entidad compuesta'),purchase_responsibility_total:v26MoneySchema('Importe de compras realizadas bajo responsabilidad de cualquiera de las representaciones canónicas'),purchase_responsibility_records:v26CountSchema('registros','Registros de compra realizada bajo responsabilidad'),donations_value:v26MoneySchema('Valor de donaciones vinculadas como donante a cualquiera de las representaciones'),donation_records:v26CountSchema('registros','Registros de donación vinculados'),hitos_count:v26CountSchema('hitos','Hitos bajo responsabilidad vinculada'),lg_count:v26CountSchema('tareas','Tareas LG bajo responsabilidad vinculada')};
  const schemaP={Evento:v26TextSchema('Evento'),'Fecha inicio':v26DateSchema(),'Fecha fin':v26DateSchema(),'Registrado como':v26TextSchema('Entidad exacta encontrada'),'Estado ingreso':v26StatusSchema(),Número:v26CountSchema('personas','Número del registro')};
  const schemaI={Evento:v26TextSchema('Evento'),'Registrado como':v26TextSchema('Entidad exacta encontrada'),Importe:v26MoneySchema('Ingreso enlazado al registro'),'Importe obligatorio':v26MoneySchema('Parte obligatoria'),'Importe voluntario':v26MoneySchema('Parte voluntaria o ajuste')};
  return{id:tool.id,name:tool.name,ok:true,title:`Dossier personal · ${r.nombre}`,facts,facts_schema,provenance:'ControlEvent · hechos canónicos',tables:[v26Table('participation',`Participación vinculada a ${r.nombre}`,participation,schemaP),v26Table('incomes',`Ingresos vinculados a ${r.nombre}`,incomes,schemaI),v26Table('purchase_responsibility',`Compras bajo responsabilidad vinculada a ${r.nombre}`,purchaseRows,{Evento:v26TextSchema(),Responsable:v26TextSchema(),TKxx:v26TextSchema(),Importe:v26MoneySchema()}),v26Table('donations',`Donaciones vinculadas a ${r.nombre}`,donationRows,{Evento:v26TextSchema(),Donante:v26TextSchema(),Tipo:v26TextSchema(),Importe:v26MoneySchema()}),v26Table('tasks',`Hitos y LG vinculados a ${r.nombre}`,taskRows,{Tipo:v26TextSchema(),Evento:v26TextSchema(),Responsable:v26TextSchema(),Descripción:v26TextSchema(),Estado:v26StatusSchema()})].filter(t=>t.rows.length)};
}
async function v26ToolStorePurchases(tool,state,selectedEventId=''){
  const r=semanticResolveEntity(state,'store',tool.store); if(!r.ok)throw new Error(r.ambiguous?`La tienda «${tool.store}» es ambigua: ${r.candidates.map(x=>x.nombre).join(' / ')}`:`No encuentro la tienda «${tool.store}».`);
  const events=arr(state?.eventos),evMap=byId(events),allowed=new Set();
  if(tool.scope==='active_event'){
    const id=trim(selectedEventId); if(!id)throw new Error('No hay un evento activo para limitar la consulta de tienda.'); allowed.add(id);
  }else if(tool.scope==='named_event'){
    const er=semanticResolveEntity(state,'event',tool.event); if(!er.ok)throw new Error(er.ambiguous?`El evento «${tool.event}» es ambiguo: ${er.candidates.map(x=>x.nombre).join(' / ')}`:`No encuentro el evento «${tool.event}».`); allowed.add(er.id);
  }
  const inScope=eid=>!allowed.size||allowed.has(trim(eid));
  const groups=new Map();
  for(const c of arr(state?.compras).filter(x=>trim(x?.tiendaId||x?.tienda_id)===r.id&&inScope(x?.eventId||x?.event_id))){
    const tt=ticketText(c); if(isDonationTicket(tt))continue; if(tool.status==='realized'&&isPendingTicket(tt))continue; if(tool.status==='pending'&&!isPendingTicket(tt))continue;
    const eid=trim(c?.eventId||c?.event_id),ev=evMap.get(eid)||{}; const g=groups.get(eid)||{Evento:trim(ev?.titulo||eid),'Fecha inicio':trim(ev?.fechaIni),'Fecha fin':trim(ev?.fechaFin),'Registros de compra':0,Importe:0};g['Registros de compra']+=1;g.Importe+=valueOfLine(c);groups.set(eid,g);
  }
  if(tool.include_empty){for(const ev of events){const id=trim(ev?.id);if(!inScope(id))continue;if(!groups.has(id))groups.set(id,{Evento:trim(ev?.titulo),'Fecha inicio':trim(ev?.fechaIni),'Fecha fin':trim(ev?.fechaFin),'Registros de compra':0,Importe:0});}}
  const rows=[...groups.values()].map(x=>({...x,Importe:v26Money(x.Importe)})).sort((a,b)=>text(b['Fecha inicio']).localeCompare(text(a['Fecha inicio']))); const total=v26Money(rows.reduce((a,x)=>a+num(x.Importe),0));
  return{id:tool.id,name:tool.name,ok:true,title:`Compras · ${r.nombre}`,facts:{store:r.nombre,status:tool.status,scope:tool.scope,event_count:rows.filter(x=>num(x.Importe)!==0).length,total_amount:total,total_records:rows.reduce((a,x)=>a+num(x['Registros de compra']),0)},tables:[v26Table('by_event',`Compras en ${r.nombre} por evento`,rows,{Evento:v26TextSchema('Evento'),'Fecha inicio':v26DateSchema(),'Fecha fin':v26DateSchema(),'Registros de compra':v26CountSchema('registros','Registros de compra'),Importe:v26MoneySchema('Importe de compras según estado solicitado')})]};
}
async function v26ToolCanonicalSocios(tool,state){
  const rows=semanticCanonicalSocioRows(arr(state?.personas).map(p=>({id:p?.id,nombre:p?.nombre,rango:p?.rango}))); const people=rows.reduce((a,x)=>a+num(x?.Personas),0);
  return{id:tool.id,name:tool.name,ok:true,title:'Socios canónicos · ColtyLAB',facts:{canonical_records:rows.length,people_count:people,criterion:'Rango SOCIO; excluye z_DEV, Grupo, Peña y Personas; conserva parejas «A y B» y evita duplicar integrantes.'},tables:[v26Table('socios','Socios canónicos · criterio ColtyLAB',rows,{'Nombre persona':v26TextSchema('Socio o pareja canónica'),Rango:v26TextSchema('Rango'),Personas:v26CountSchema('personas','Personas representadas')})]};
}
async function v26ToolEventsCatalog(tool,state){
  const rows=arr(state?.eventos).map(e=>({Evento:trim(e?.titulo),'Fecha inicio':trim(e?.fechaIni),'Fecha fin':trim(e?.fechaFin),Estado:trim(e?.situacion),Precio:v26Money(e?.precio)})).sort((a,b)=>text(b['Fecha inicio']).localeCompare(text(a['Fecha inicio'])));
  return{id:tool.id,name:tool.name,ok:true,title:'Catálogo de eventos',facts:{event_count:rows.length},tables:[v26Table('events','Eventos registrados',rows,{Evento:v26TextSchema(),'Fecha inicio':v26DateSchema(),'Fecha fin':v26DateSchema(),Estado:v26StatusSchema(),Precio:v26MoneySchema('Precio por socio')})]};
}


function v26TicketToken(value){const m=trim(value).match(/\bTK\s*\d+[A-Z0-9_-]*\b/i);return m?m[0].replace(/\s+/g,'').toUpperCase():'';}
function v26ImageInnerKey(value){return trim(value).split('|').slice(1).join('|')||trim(value);}
function v26HasImage(state,eventId,inner){
  const images=state?.ticketImages||state?.ticketImageRefs||{},ev=trim(eventId),inr=trim(inner);if(!ev||!inr)return false;const tk=v26TicketToken(inr);
  return Object.keys(images||{}).some(key=>{if(!key.startsWith(`${ev}|`))return false;const ik=v26ImageInnerKey(key);if(ik===inr)return true;return !!(tk&&v26TicketToken(ik)===tk);});
}

async function v26ToolPeopleActivity(tool,state){
  const idx=v262CanonicalPeopleIndex(state),people=byId(state?.personas),eventSets=new Map(),incomeRecords=new Map(),purchaseRecords=new Map(),purchaseValue=new Map(),donationRecords=new Map(),donationValue=new Map(),hitosMap=new Map(),lgMap=new Map();
  const bump=(map,id,v=1)=>{if(id)map.set(id,num(map.get(id))+v);};
  for(const c of arr(state?.colaboradores)){const pid=trim(c?.personaId||c?.persona_id),eid=trim(c?.eventId||c?.event_id);if(!pid)continue;if(!eventSets.has(pid))eventSets.set(pid,new Set());if(eid)eventSets.get(pid).add(eid);bump(incomeRecords,pid);}
  for(const c of arr(state?.compras)){const tt=ticketText(c),amount=valueOfLine(c);if(isDonationTicket(tt)){const pid=trim(text(c?.donorRef||c?.donor_ref).replace(/^P:/,''));if(pid){bump(donationRecords,pid);bump(donationValue,pid,amount);}}else if(!isPendingTicket(tt)){const pid=trim(c?.responsableId||c?.responsable_id);if(pid){bump(purchaseRecords,pid);bump(purchaseValue,pid,amount);}}}
  try{const hs=await listAllHitosState();for(const h of arr(hs?.hitos)){const pid=trim(h?.responsableId);if(pid)bump(hitosMap,pid);}for(const l of arr(hs?.lgs)){const pid=trim(l?.responsableId);if(pid)bump(lgMap,pid);}}catch(_){ }
  const rows=[];
  for(const rec of idx.atoms.values()){
    const ids=[...new Set([...rec.standaloneIds,...rec.compositeIds])];if(!ids.length)continue;
    const name=trim(rec.display);if(!name||/^z_dev/i.test(name)||/^grupo/i.test(name)||/^peña/i.test(name)||/^personas?$/i.test(name))continue;
    const events=new Set();ids.forEach(id=>{for(const eid of (eventSets.get(id)||[]))events.add(eid);});
    const sum=map=>ids.reduce((a,id)=>a+num(map.get(id)),0);
    rows.push({Entidad:name,Representaciones:[...rec.names].join(' / '),'Eventos con participación':events.size,'Registros de ingreso':sum(incomeRecords),'Registros compra responsabilidad':sum(purchaseRecords),'Importe compra gestionado':v26Money(sum(purchaseValue)),'Donaciones como donante':sum(donationRecords),'Valor donado':v26Money(sum(donationValue)),Hitos:sum(hitosMap),'Tareas LG':sum(lgMap)});
  }
  rows.sort((a,b)=>num(b['Eventos con participación'])-num(a['Eventos con participación'])||num(b['Tareas LG'])-num(a['Tareas LG'])||num(b['Registros compra responsabilidad'])-num(a['Registros compra responsabilidad'])||text(a.Entidad).localeCompare(text(b.Entidad),'es'));
  const schema={Entidad:v26TextSchema('Persona canónica; integra sus registros individuales y los de parejas donde aparece'),Representaciones:v26TextSchema('Nombres exactos de los registros enlazados a la persona'),'Eventos con participación':v26CountSchema('eventos','Eventos únicos vinculados a cualquiera de sus representaciones'),'Registros de ingreso':v26CountSchema('registros','Registros de ingreso vinculados; los registros de pareja son compartidos'),'Registros compra responsabilidad':v26CountSchema('registros','Registros de compra bajo responsabilidad vinculada'),'Importe compra gestionado':v26MoneySchema('Importe de compras bajo responsabilidad vinculada; una pareja puede vincular el mismo importe a ambos miembros'),'Donaciones como donante':v26CountSchema('registros','Registros de donación vinculados como donante'),'Valor donado':v26MoneySchema('Valor de producto donado vinculado'),Hitos:v26CountSchema('hitos','Hitos como responsable vinculado'),'Tareas LG':v26CountSchema('tareas','LG como responsable vinculado')};
  const facts={entities:rows.length,identity_mode:'canonical_atomic_person',criterion:'Cada fila representa una persona canónica y agrega todas sus representaciones registradas, incluidas parejas. Las cifras de pareja son vínculos compartidos: sirven para medir relación/implicación de cada miembro, pero NO deben sumarse entre personas como si fueran importes independientes.',non_additive_pair_metrics:true};
  const facts_schema={entities:v26CountSchema('personas','Personas canónicas representadas'),identity_mode:v26TextSchema('Modo de resolución de identidad'),non_additive_pair_metrics:v26TextSchema('Aviso semántico: métricas de pareja pueden aparecer vinculadas a ambos miembros')};
  return{id:tool.id,name:tool.name,ok:true,title:'Implicación de personas canónicas',facts,facts_schema,provenance:'ControlEvent · hechos canónicos',tables:[v26Table('people_activity','Implicación por dimensiones · identidad canónica',rows,schema)]};
}
async function v26ToolEventsOverview(tool,state){
  const events=arr(state?.eventos).filter(e=>trim(e?.id));const ids=events.map(e=>trim(e.id));const attendance=buildCanonicalAttendance(state,ids),attMap=new Map(arr(attendance?.porEvento).map(x=>[trim(x.eventId),x]));const rows=[];
  for(const ev of events){const id=trim(ev.id),c=compactState(state,id),sum=arr(c?.eventosResumen).find(x=>trim(x?.id)===id)||{},att=attMap.get(id)||{};rows.push({Evento:trim(ev?.titulo),Estado:trim(ev?.situacion),'Fecha inicio':trim(ev?.fechaIni),'Fecha fin':trim(ev?.fechaFin),Ingresos:v26Money(sum?.ingresosTotal),'Compras realizadas':v26Money(sum?.comprasReales),'Compras pendientes':v26Money(sum?.comprasPendientes),'Donaciones valoradas':v26Money(sum?.donacionesValor),'Saldo operativo':v26Money(num(sum?.ingresosTotal)-num(sum?.comprasReales)-num(sum?.comprasPendientes)),'Valoración del evento':v26Money(num(sum?.comprasReales)+num(sum?.donacionesValor)),'Asistentes canónicos':round(att?.totalAsistentesPersonas,3)});}
  rows.sort((a,b)=>text(b['Fecha inicio']).localeCompare(text(a['Fecha inicio'])));
  const schema={Evento:v26TextSchema('Evento'),Estado:v26StatusSchema(),'Fecha inicio':v26DateSchema(),'Fecha fin':v26DateSchema(),Ingresos:v26MoneySchema('Ingresos'),'Compras realizadas':v26MoneySchema('Compras realizadas'),'Compras pendientes':v26MoneySchema('Compras pendientes'),'Donaciones valoradas':v26MoneySchema('Producto donado valorado'),'Saldo operativo':v26MoneySchema('Ingresos - compras realizadas - compras pendientes'),'Valoración del evento':v26MoneySchema('Compras realizadas + producto donado'),'Asistentes canónicos':v26CountSchema('personas','Asistencia canónica')};
  return{id:tool.id,name:tool.name,ok:true,title:'Panorama de eventos',facts:{event_count:rows.length,valuation_formula:'Valoración = compras realizadas + producto donado'},tables:[v26Table('events_overview','Panorama canónico de eventos',rows,schema)]};
}
async function v26ToolEventDocumentation(tool,state,selectedEventId=''){
  const rr=v26ResolveEvent(state,selectedEventId,tool.event,tool.scope);if(!rr.ok)throw new Error(rr.error);const eid=rr.id;
  const people=byId(state?.personas);
  const incomes=arr(state?.colaboradores).filter(x=>trim(x?.eventId||x?.event_id)===eid);
  const incomeRows=incomes.map(x=>({Registro:trim(x?.id),Persona:trim(people.get(trim(x?.personaId||x?.persona_id))?.nombre),'Forma/estado':trim(x?.situacion||x?.formaPago||x?.ingreso),Justificante:v26HasImage(state,eid,`INGRESO:${trim(x?.id)}`)?'Sí':'No'}));
  const purchaseMap=new Map();
  for(const c of arr(state?.compras).filter(x=>trim(x?.eventId||x?.event_id)===eid&&!isDonationTicket(ticketText(x))&&!isPendingTicket(ticketText(x)))){
    const tk=v26TicketToken(ticketText(c));if(!tk)continue;
    if(!purchaseMap.has(tk))purchaseMap.set(tk,{TKxx:tk,Ticket:v26HasImage(state,eid,tk)?'Sí':'No','Registros de compra':0,Importe:0});
    const g=purchaseMap.get(tk);g['Registros de compra']+=1;g.Importe+=valueOfLine(c);
  }
  const tickets=[...purchaseMap.values()].map(x=>({...x,Importe:v26Money(x.Importe)}));
  const docs=arr(state?.eventDocuments).filter(d=>trim(d?.eventId||d?.event_id)===eid).map(d=>{const code=trim(d?.codigo||d?.imageKey||d?.id||'DOC');return{Documento:code,Fecha:trim(d?.fecha),Descripción:trim(d?.descripcion||d?.texto),Adjunto:(v26HasImage(state,eid,code)||!!trim(d?.imageUrl))?'Sí':'No'};});
  const missing=[];
  incomeRows.filter(x=>x.Justificante!=='Sí').forEach(x=>missing.push({Tipo:'Ingreso',Referencia:x.Registro||x.Persona||'Ingreso',Detalle:[x.Persona,x['Forma/estado']].filter(Boolean).join(' · '),Falta:'Justificante adjunto'}));
  tickets.filter(x=>x.Ticket!=='Sí').forEach(x=>missing.push({Tipo:'Compra',Referencia:x.TKxx||'Ticket',Detalle:`${v26CountPhrase(x['Registros de compra']||x.Líneas||0,'registro de compra','registros de compra')} · ${v26FormatEuro(x.Importe||0)}`,Falta:'Fototicket / justificante de compra'}));
  docs.filter(x=>x.Adjunto!=='Sí').forEach(x=>missing.push({Tipo:'Documento',Referencia:x.Documento||'DOC',Detalle:[x.Fecha,x.Descripción].filter(Boolean).join(' · '),Falta:'Adjunto del documento'}));
  const incomeJust=incomeRows.filter(x=>x.Justificante==='Sí').length,ticketJust=tickets.filter(x=>x.Ticket==='Sí').length,docJust=docs.filter(x=>x.Adjunto==='Sí').length;
  const facts={event:rr.nombre,income_records:incomeRows.length,income_with_receipt:incomeJust,income_without_receipt:incomeRows.length-incomeJust,purchase_tickets:tickets.length,purchase_tickets_with_image:ticketJust,purchase_tickets_without_image:tickets.length-ticketJust,documents:docs.length,documents_with_attachment:docJust,documents_without_attachment:docs.length-docJust,missing_evidence_count:missing.length,missing_evidence:missing.slice(0,80),note:'Este bloque mide evidencias/adjuntos disponibles en ControlEvent. No debe equiparar automáticamente ausencia de foto con falta de conciliación bancaria.'};
  const documentationChartRows=[{Indicador:'Ingresos con justificante',Valor:incomeJust},{Indicador:'Ingresos sin justificante',Valor:incomeRows.length-incomeJust},{Indicador:'Tickets con imagen',Valor:ticketJust},{Indicador:'Tickets sin imagen',Valor:tickets.length-ticketJust},{Indicador:'Documentos con adjunto',Valor:docJust},{Indicador:'Documentos sin adjunto',Valor:docs.length-docJust}];
  return{id:tool.id,name:tool.name,ok:true,title:`Justificación documental · ${rr.nombre}`,facts,tables:[
    v26Table('documentation_chart',`Cobertura documental · ${rr.nombre}`,documentationChartRows,{Indicador:v26TextSchema('Tipo de evidencia'),Valor:v26CountSchema('elementos','Número de elementos documentales')}),
    v26Table('missing_evidence','Elementos sin evidencia documental',missing,{Tipo:v26TextSchema('Tipo de elemento'),Referencia:v26TextSchema('Identificador o persona'),Detalle:v26TextSchema('Contexto'),Falta:v26StatusSchema('Evidencia que falta')}),
    v26Table('income_receipts','Justificantes de ingresos',incomeRows,{Registro:v26TextSchema(),Persona:v26TextSchema(),'Forma/estado':v26TextSchema(),Justificante:v26StatusSchema()}),
    v26Table('purchase_tickets','Tickets/fototickets de compra',tickets,{TKxx:v26TextSchema(),Ticket:v26StatusSchema(),'Registros de compra':v26CountSchema('registros'),Importe:v26MoneySchema()}),
    v26Table('documents','Documentos del evento',docs,{Documento:v26TextSchema(),Fecha:v26DateSchema(),Descripción:v26TextSchema(),Adjunto:v26StatusSchema()})
  ].filter(t=>t.rows.length)};
}
async function v26ToolCompareEvents(tool,state,selectedEventId=''){
  const requested=semanticUnique(arr(tool?.events).concat(trim(tool?.event)?[trim(tool.event)]:[])).slice(0,6);if(requested.length<2)throw new Error('La comparación necesita al menos dos eventos.');
  const resolved=[];for(const name of requested){let r=semanticResolveEntity(state,'event',name);if(!r.ok){const scored=arr(state?.eventos).map(e=>({e,score:v26EventFragmentScore(name,e?.titulo)})).sort((a,b)=>b.score-a.score);if(scored[0]?.score>=.8)r={ok:true,id:trim(scored[0].e.id),nombre:trim(scored[0].e.titulo)};}if(!r.ok)throw new Error(`No puedo resolver con seguridad el evento «${name}».`);if(!resolved.some(x=>x.id===r.id))resolved.push(r);}
  if(resolved.length<2)throw new Error('La comparación no ha resuelto dos eventos distintos.');
  const attendance=buildCanonicalAttendance(state,resolved.map(x=>x.id));const attMap=new Map(arr(attendance?.porEvento).map(x=>[trim(x.eventId),x]));const rows=[];
  for(const r of resolved){const c=compactState(state,r.id),s=arr(c?.eventosResumen).find(x=>trim(x?.id)===r.id)||{},ev=v26EventById(state,r.id)||{},att=attMap.get(r.id)||{};rows.push({Evento:r.nombre,Estado:trim(ev?.situacion||s?.situacion),'Fecha inicio':trim(ev?.fechaIni),'Fecha fin':trim(ev?.fechaFin),'Precio por socio':v26Money(ev?.precio),Ingresos:v26Money(s?.ingresosTotal),'Compras realizadas':v26Money(s?.comprasReales),'Compras pendientes':v26Money(s?.comprasPendientes),'Donaciones valoradas':v26Money(s?.donacionesValor),'Saldo operativo':v26Money(num(s?.ingresosTotal)-num(s?.comprasReales)-num(s?.comprasPendientes)),'Valoración del evento':v26Money(num(s?.comprasReales)+num(s?.donacionesValor)),'Asistentes canónicos':round(att?.totalAsistentesPersonas,3)});}
  const moneyMetrics=['Ingresos','Compras realizadas','Compras pendientes','Donaciones valoradas','Saldo operativo','Valoración del evento'];const differences=[];if(rows.length===2){const a=rows[0],b=rows[1];for(const m of moneyMetrics){const av=num(a[m]),bv=num(b[m]),d=v26Money(bv-av),pct=av?round((d/Math.abs(av))*100,2):null;differences.push({Indicador:m,[a.Evento]:v26Money(av),[b.Evento]:v26Money(bv),Diferencia:d,'Variación %':pct});}const av=num(a['Asistentes canónicos']),bv=num(b['Asistentes canónicos']),d=round(bv-av,3);differences.push({Indicador:'Asistentes canónicos',[a.Evento]:av,[b.Evento]:bv,Diferencia:d,'Variación %':av?round((d/Math.abs(av))*100,2):null});}
  const schema={Evento:v26TextSchema('Evento'),Estado:v26StatusSchema(),'Fecha inicio':v26DateSchema(),'Fecha fin':v26DateSchema(),'Precio por socio':v26MoneySchema('Precio por socio'),Ingresos:v26MoneySchema('Ingresos canónicos'),'Compras realizadas':v26MoneySchema('Compras realizadas'),'Compras pendientes':v26MoneySchema('Compras pendientes'),'Donaciones valoradas':v26MoneySchema('Donaciones de producto valoradas'),'Saldo operativo':v26MoneySchema('Ingresos comprometidos - compras realizadas - compras pendientes'),'Valoración del evento':v26MoneySchema('Compras realizadas + valor del producto donado'),'Asistentes canónicos':v26CountSchema('personas','Asistencia canónica')};
  const facts={event_names:rows.map(x=>x.Evento),event_count:rows.length,comparison_direction:rows.length===2?`${rows[1].Evento} frente a ${rows[0].Evento}`:'comparación múltiple',money_metrics:moneyMetrics};
  const tables=[v26Table('comparison','Comparativa canónica de eventos',rows,schema)];if(differences.length){const ds={Indicador:v26TextSchema('Métrica'),[rows[0].Evento]:v26TextSchema('Valor con unidad según indicador'),[rows[1].Evento]:v26TextSchema('Valor con unidad según indicador'),Diferencia:v26TextSchema('Diferencia con unidad según indicador'),'Variación %':v26SchemaField('percent','%','Variación del segundo evento frente al primero')};tables.push(v26Table('differences',`Diferencias · ${rows[1].Evento} frente a ${rows[0].Evento}`,differences,ds));facts.differences=differences;}
  return{id:tool.id,name:tool.name,ok:true,title:'Comparativa de eventos',facts,tables};
}

async function v26ExecuteTool(tool,state,selectedEventId){
  if(tool.name==='event_dossier')return v26ToolEventDossier(tool,state,selectedEventId);
  if(tool.name==='event_breakdowns')return v26ToolEventBreakdowns(tool,state,selectedEventId);
  if(tool.name==='event_people')return v26ToolEventPeople(tool,state,selectedEventId);
  if(tool.name==='person_dossier')return v26ToolPersonDossier(tool,state);
  if(tool.name==='participation_events')return v26ToolParticipation(tool,state);
  if(tool.name==='store_purchases')return v26ToolStorePurchases(tool,state,selectedEventId);
  if(tool.name==='canonical_socios')return v26ToolCanonicalSocios(tool,state);
  if(tool.name==='events_catalog')return v26ToolEventsCatalog(tool,state);
  if(tool.name==='compare_events')return v26ToolCompareEvents(tool,state,selectedEventId);
  if(tool.name==='events_overview')return v26ToolEventsOverview(tool,state);
  if(tool.name==='event_documentation')return v26ToolEventDocumentation(tool,state,selectedEventId);
  if(tool.name==='people_activity')return v26ToolPeopleActivity(tool,state);
  throw new Error(`Herramienta no permitida: ${tool.name}`);
}
async function v26ExecuteTools(tools,state,selectedEventId,flowTrace=[]){
  const started=Date.now();
  const results=await Promise.all(arr(tools).map(async tool=>{
    try{
      const r=await v26ExecuteTool(tool,state,selectedEventId);
      zuzuTracePush(flowTrace,`V26 · Herramienta ${tool.name}`,'OK',`${r.tables?.reduce((a,t)=>a+arr(t.rows).length,0)||0} fila(s) estructuradas.`);
      return r;
    }catch(error){
      // Una herramienta parcial que falla no convierte toda la consulta en KO si las demás
      // pueden responder. Se conserva como WARN y solo se marca KO si no queda ningún hecho fiable.
      zuzuTracePush(flowTrace,`V26 · Herramienta ${tool.name}`,'WARN',cleanGeminiError(error));
      return{id:tool.id,name:tool.name,ok:false,title:tool.name,error:cleanGeminiError(error),facts:{},tables:[]};
    }
  }));
  const good=results.filter(x=>x.ok).length;
  zuzuTracePush(flowTrace,'V27 · ControlEvent obtiene hechos',good?'OK':'KO',`${good}/${results.length} herramientas OK en ${Date.now()-started} ms.`);
  return results;
}
function v26CompactToolPayload(results){
  return arr(results).map(r=>({id:r.id,name:r.name,ok:r.ok,title:r.title,error:r.error||'',facts:r.facts||{},tables:arr(r.tables).map(t=>({key:t.key,title:t.title,schema:t.schema||{},rows:arr(t.rows).slice(0,120)}))}));
}
function v26ParseLocalizedDisplayNumber(value){
  const raw=trim(value).replace(/\u00a0/g,' ').replace(/\s+/g,'');
  if(!raw)return NaN;
  let sign=1,s=raw;
  if(s.startsWith('-')){sign=-1;s=s.slice(1);}else if(s.startsWith('+'))s=s.slice(1);
  s=s.replace(/(?:€|euros?)$/i,'');
  const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
  let dec='';
  if(comma>=0&&dot>=0) dec=comma>dot?',':'.';
  else if(comma>=0){const digits=s.length-comma-1;dec=(digits>0&&digits<=2)?',':'';}
  else if(dot>=0){const digits=s.length-dot-1;dec=(digits>0&&digits<=2)?'.':'';}
  let normalized;
  if(dec){const i=s.lastIndexOf(dec);normalized=s.slice(0,i).replace(/[.,]/g,'')+'.'+s.slice(i+1).replace(/[.,]/g,'');}
  else normalized=s.replace(/[.,]/g,'');
  const n=Number(normalized);return Number.isFinite(n)?sign*n:NaN;
}
function v26FormatEuro(value){
  const n=typeof value==='number'?value:v26ParseLocalizedDisplayNumber(value);
  if(!Number.isFinite(n))return trim(value);
  const negative=n<0?'-':'';const fixed=Math.abs(n).toFixed(2);const parts=fixed.split('.');const entero=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.');
  return `${negative}${entero},${parts[1]} €`;
}
function v26FormatPercent(value){
  const n=typeof value==='number'?value:v26ParseLocalizedDisplayNumber(value);
  if(!Number.isFinite(n))return trim(value);
  return new Intl.NumberFormat('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n)+' %';
}
function v26FormatPlainNumber(value,maxDigits=3){
  const n=typeof value==='number'?value:v26ParseLocalizedDisplayNumber(value);
  if(!Number.isFinite(n))return trim(value);
  return new Intl.NumberFormat('es-ES',{minimumFractionDigits:0,maximumFractionDigits:maxDigits}).format(n);
}
function v26UnitLabel(unit,value){
  const u=trim(unit);if(!u||u==='registros')return'';
  const n=typeof value==='number'?value:v26ParseLocalizedDisplayNumber(value);if(!Number.isFinite(n))return u;
  const singular={personas:'persona',eventos:'evento','líneas':'línea',lineas:'línea',tareas:'tarea',hitos:'hito',llamadas:'llamada',unidades:'unidad'};
  return Math.abs(n)===1?(singular[u]||u.replace(/s$/,'')):u;
}
function v26CountPhrase(value,singular,plural){
  const n=typeof value==='number'?value:v26ParseLocalizedDisplayNumber(value);const label=Math.abs(n)===1?singular:(plural||singular+'s');
  return `${v26FormatPlainNumber(n,3)} ${label}`;
}
function v26MoneyIndicator(label){return /precio|ingres|compra|donaci|saldo|valoraci|importe|coste|aportaci/i.test(trim(label));}
function v26EffectiveCellMeta(table,column,row){
  const direct=v26TableFieldMeta(table,column);if(direct&&direct.kind!=='text')return direct;
  const key=trim(table?.key);
  if(key==='kpis'&&column==='Valor'){
    const indicator=trim(row?.Indicador);if(v26MoneyIndicator(indicator))return v26MoneySchema(indicator);
    if(/asistent|participante|persona/i.test(indicator))return v26CountSchema('personas',indicator);
    if(/fecha/i.test(indicator))return v26DateSchema(indicator);
    return direct||v26TextSchema(indicator);
  }
  if(key==='differences'&&column!=='Indicador'){
    const indicator=trim(row?.Indicador);
    if(column==='Variación %')return v26SchemaField('percent','%',indicator);
    if(/asistent/i.test(indicator))return v26CountSchema('personas',indicator);
    return v26MoneySchema(indicator||column);
  }
  return direct||null;
}
function v26FormatPresentationCell(value,meta){
  if(!meta)return text(value);
  if(meta.kind==='money')return v26FormatEuro(value);
  if(meta.kind==='percent')return v26FormatPercent(value);
  if(meta.kind==='count'){const label=v26UnitLabel(meta.unit,value);return v26FormatPlainNumber(value,3)+(label?' '+label:'');}
  if(meta.kind==='quantity'||meta.kind==='number')return v26FormatPlainNumber(value,3)+(trim(meta.unit)?' '+trim(meta.unit):'');
  return text(value);
}
function v26MoneyContext(textValue,start,end){
  const t=text(textValue),before=t.slice(Math.max(0,start-64),start),after=t.slice(end,Math.min(t.length,end+64));
  return /(€|euros?|importe|ingres|gasto|compra|donaci|saldo|valoraci|precio|aportaci|coste|costoso|proveedor)/i.test(before+' '+after);
}
function v26FormatNarrativeMoney(answer,results){
  // No inferimos que cualquier número del texto sea dinero: DIC25, 18 eventos, 29 personas,
  // unidades o porcentajes deben conservar su tipo. Solo normalizamos importes que Gemini marcó
  // explícitamente como euros; los datos estructurados se formatean por schema.
  const src=text(answer);if(!src)return'';
  const re=/-?(?:\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,4})?|\d+(?:[.,]\d{1,4})?)\s*(?:€|euros?)/gi;
  let out='',last=0,m;
  while((m=re.exec(src))){
    out+=src.slice(last,m.index);
    const n=v26ParseLocalizedDisplayNumber(m[0]);
    out+=Number.isFinite(n)?v26FormatEuro(n):m[0];
    last=re.lastIndex;
  }
  out+=src.slice(last);
  return trim(out.replace(/\s+([,.;:!?])/g,'$1').replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g,'$1 '));
}

function v26PolishNarrative(answer){
  let a=trim(answer);
  if(!a)return'';
  a=a.replace(/\*\*/g,'').replace(/#{2,}\s*/g,'').replace(/`{1,3}/g,'');
  a=a.replace(/\b(el evento|este evento|la persona|esa persona|esta persona|la jornada|esa jornada|el usuario)\s+\1\b/gi,'$1');
  a=a.replace(/¡\s*\./g,'.').replace(/!\s*\./g,'!').replace(/\.\s*!/g,'.');
  a=a.replace(/\s+([,.;:!?])/g,'$1').replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g,'$1 ');
  return trim(a);
}

function v26KnownMoneyValues(results){
  const vals=[];
  const moneyKey=/amount|importe|income|purchase|donation|saldo|balance|valuation|valor|price|precio|total/i;
  const nonMoneyKey=/people|person|count|units|unit|event_count|lines|records|attendee|members_attending|nonmembers|asistentes|participantes/i;
  function push(v){const n=Number(v);if(Number.isFinite(n))vals.push(round(n,2));}
  for(const r of arr(results)){
    for(const [k,v] of Object.entries(r?.facts||{})) if(moneyKey.test(k)&&!nonMoneyKey.test(k)&&typeof v==='number')push(v);
    for(const t of arr(r?.tables)) for(const row of arr(t?.rows)) for(const [k,v] of Object.entries(row||{})){
      const meta=v26EffectiveCellMeta(t,k,row);if(meta?.kind==='money'&&typeof v==='number')push(v);
    }
  }
  return [...new Set(vals)];
}
function v26UnsupportedMoney(answer,results){
  const known=v26KnownMoneyValues(results); if(!known.length)return[]; const out=[]; const txt=text(answer);
  // Solo auditamos como dinero cifras que Gemini haya marcado explícitamente con € / euro(s).
  // Porcentajes, fechas, años, conteos y unidades no deben entrar aquí aunque estén cerca de una palabra económica.
  const re=/-?(?:\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,4})?|\d+(?:[.,]\d{1,4})?)\s*(?:€|euros?)/gi; let m;
  while((m=re.exec(txt))){const n=round(v26ParseLocalizedDisplayNumber(m[0]),2);if(!Number.isFinite(n))continue;if(!known.some(v=>Math.abs(v-n)<0.011))out.push(n);}
  return [...new Set(out)];
}
function v26FinalPrompt(userPrompt,plan,results,repair='',conversationHistory=[],conversationContext={}){
  return `Eres Zuzu, ANALISTA de ControlEvent v27_prod_1.2. ControlEvent ya ha ejecutado las herramientas y te entrega HECHOS CANÓNICOS. Tu valor añadido es interpretarlos bien, detectar lo relevante y responder como un analista humano. NO inventes datos y NO recalcules totales: usa exactamente los hechos numéricos ya calculados por CE.

PREGUNTA ORIGINAL:\n${userPrompt}
CONTEXTO CONVERSACIONAL RECIENTE:\n${JSON.stringify(arr(conversationHistory).slice(-6))}\nMARCO CONVERSACIONAL RESUELTO POR CONTROLEVENT:\n${JSON.stringify(v26NormalizeConversationContext(conversationContext))}\nINTENCIÓN INTERPRETADA:\n${plan.intent}
¿EL USUARIO PIDIÓ GRÁFICAS?: ${plan.wantsCharts?'SÍ':'NO'}

RESULTADOS DE HERRAMIENTAS:\n${JSON.stringify(v26CompactToolPayload(results))}

REGLAS DE RESPUESTA:
- Responde a la INTENCIÓN probable del usuario, no solo a las palabras literales. El usuario no debe tener que pedir «en euros», «con dos decimales», «incluye la pareja», «no repitas tablas» o «analiza»: son convenciones implícitas de ControlEvent.
- En preguntas abiertas («háblame de X», «qué tal salió», «dime cositas») haz una síntesis inteligente: 2-4 hallazgos relevantes, cifras clave, contexto y cualquier anomalía real. No digas «CE obtuvo N filas».
- Una pregunta conversacional se responde primero con conversación/análisis. NO muestres tablas salvo que aporten una utilidad clara; si la respuesta puede entenderse bien sin tabla, show_tables debe quedar vacío.
- Si el usuario pide lista, detalle, desglose, «por destino/segmento/tienda», comparación o datos tabulares, entonces sí puedes elegir las tablas mínimas necesarias.
- Si una cifra ya viene en facts (por ejemplo income_total), cópiala; no la vuelvas a sumar mentalmente.
- FORMATO MONETARIO IMPLÍCITO Y OBLIGATORIO: cualquier hecho cuyo schema/kind sea money se expresa siempre en formato español con dos decimales y símbolo, por ejemplo 1.234,56 €. El usuario no tiene que pedirlo.
- NO conviertas otros números en dinero: eventos, personas, unidades, días, porcentajes, años, fechas, códigos como DIC25 o TK05 conservan su propia unidad/tipo.
- Singular/plural natural: 1 persona / 2 personas; 1 evento / 18 eventos; 1 línea / 5 líneas.
- «Finalizado» describe el estado del evento; no lo conviertas automáticamente en «finalizado con éxito» salvo que exista un hecho que permita valorar el éxito.
- Evita felicitaciones, entusiasmo gratuito o juicios como «¡es genial!». Sé cercano pero analítico.
- Si hay un ajuste extraño (por ejemplo importe voluntario negativo), explícalo como dato a revisar, sin inventar su causa.
- No afirmes «no hay datos» de un ámbito salvo que la herramienta correspondiente lo haya comprobado.
- Si person_dossier trae compras, donaciones, hitos o LG, una pregunta amplia sobre la persona debe resumir esas responsabilidades aunque el usuario no las enumere.
- Si event_dossier + event_breakdowns están disponibles en una pregunta abierta sobre un evento, busca al menos una lectura que vaya más allá de repetir KPIs: concentración del gasto, peso de donaciones, saldo, pendientes, asistencia o anomalías.
- show_tables: elige solo tablas que ayuden. No muestres tablas redundantes ni columnas administrativas sin valor.
- charts: solo si el usuario las pidió. No hagas donuts/pies de una sola categoría ni gráficas donde todos los valores sean iguales. Para «todos los datos» selecciona 3-5 vistas complementarias, no una gráfica por cada tabla.
- La descripción larga del evento se interpreta/narra: no la conviertas en una enorme celda de tabla.
- Cada tabla incluye schema con kind, unit y concept. RESPETA esa semántica literalmente: una fecha nunca es €, un conteo de personas nunca es €, y «Valor disponible» no es «Compras».
- Comprado = compras realizadas. Donado = donaciones de producto. Pte.Compra = compras pendientes. Valor disponible = Comprado + Donado. No mezcles ni renombres estos conceptos.
- FÓRMULAS CANÓNICAS CE: Saldo operativo = Ingresos - Compras realizadas - Compras pendientes. Las donaciones NO entran en el saldo de caja. Valoración del evento = Compras realizadas + Compras pendientes + Valor del producto donado. NUNCA calcules la valoración como saldo + donaciones ni como ingresos + donaciones - compras.
- Si preguntas «en qué se fue el dinero», «qué se gastó» o equivalente, habla de COMPRAS REALIZADAS y de su distribución. No llames compras a Comprado+Donado ni a la valoración del evento.
- No atribuyas causalidad falsa: nunca digas «gracias a las donaciones el saldo fue positivo» porque las donaciones no son dinero de caja.
- En person_dossier, matched_entities puede incluir una persona individual y una pareja/entidad compuesta. Si composite_expansion=true, explica la relación y NO atribuyas income_linked_total como dinero exclusivo de una sola persona; distingue income_direct_total e income_composite_total.
- Si recibes dos person_dossier en una petición comparativa, compara ESAS DOS PERSONAS; no cambies el sujeto a eventos ni al evento activo.
- events_overview sirve para razonar entre eventos; no reduzcas una pregunta global al evento activo.
- event_documentation distingue evidencias/adjuntos de conciliación bancaria: no inventes que algo está conciliado si la herramienta solo acredita una imagen o documento.
- people_activity no define por sí sola quién es «mejor»: compara varias dimensiones y explica el criterio de implicación que utilizas. No afirmes presencia en compras/donaciones/tareas si la fila correspondiente no lo respalda.
- En una CONTINUACIÓN DE CONVERSACIÓN conserva el sujeto del turno anterior. El evento de pantalla es un contexto secundario, no un comodín para reiniciar el tema.
- En una comparativa, compara TODOS los eventos entregados por compare_events. No redactes un evento y grafiques otro. Usa differences para destacar subidas/bajadas relevantes.
- Español natural, preciso y útil. Puedes ser cercano, sin rellenar espacio ni entusiasmo gratuito.
- Redacta pensando también en lectura por voz: evita repeticiones contiguas como «el evento el evento», «esa persona esa persona», muletillas, frases cortadas y signos absurdos como «¡.».
- No uses Markdown visible (**texto**, ###, etc.) dentro de answer: el visor/PDF muestra texto plano.
- No inventes la finalidad u objetivo del evento («recaudar fondos», «celebrar...») salvo que figure expresamente en los hechos/descripcion.
- Si valoras que un evento «salió bien» o «salió mejor», explica EN QUÉ sentido y qué hechos lo sustentan (económico, asistencia, gestión). No declares «éxito organizativo» sin datos de gestión que lo respalden.
${repair?`\nCORRECCIÓN OBLIGATORIA DEL INTENTO ANTERIOR: ${repair}`:''}
Devuelve JSON estructurado.`;
}

function v26NarrativeEuroAfterLabel(answer,labelSource){
  const number='(-?(?:\\d{1,3}(?:[.\\s]\\d{3})+(?:,\\d{1,4})?|\\d+(?:[.,]\\d{1,4})?))\\s*(?:€|euros?)';
  const re=new RegExp('(?:'+labelSource+')[^\\d€]{0,70}'+number,'i');
  const m=text(answer).match(re);if(!m)return null;
  const n=v26ParseLocalizedDisplayNumber(m[1]);return Number.isFinite(n)?round(n,2):null;
}
function v26MoneyMatches(value,expected){return Number.isFinite(value)&&Math.abs(round(value,2)-round(expected,2))<0.011;}
function v26NarrativeStyleIssues(answer){
  const a=text(answer),issues=[];
  if(/\\b(el evento|este evento|la persona|esa persona|esta persona|la jornada|esa jornada|el usuario)\\s+\\1\\b/i.test(a))issues.push('Hay una repetición contigua de una expresión nominal; reescribe de forma fluida para lectura por voz.');
  if(/\\*\\*|#{2,}|`{1,3}/.test(a))issues.push('No uses marcas Markdown visibles en la respuesta de texto plano.');
  if(/¡\\s*\\.|!\\s*\\.|\\.\\s*!|¡\\s*!/.test(a))issues.push('Hay signos de puntuación/exclamación defectuosos.');
  const bangs=(a.match(/!/g)||[]).length+(a.match(/¡/g)||[]).length;
  if(bangs>2)issues.push('Reduce las exclamaciones: el tono debe ser cercano pero analítico y cómodo para la voz.');
  if(/¡\\s*(?:hola|qué bueno|que bueno|genial|enhorabuena|un gran trabajo|un éxito|un exito)/i.test(a))issues.push('Evita saludos o entusiasmo artificial; entra directamente en el análisis.');
  return issues;
}

function v26ResponseQualityIssues(raw,results,userPrompt,conversationContext={}){
  const issues=[],intent=v26ImplicitIntent(userPrompt),answer=trim(raw?.answer);
  const event=arr(results).find(r=>r.ok&&r.name==='event_dossier');
  const documentation=arr(results).find(r=>r.ok&&r.name==='event_documentation');

  // Este auditor solo fuerza reintento por errores de VERDAD/SEMÁNTICA.
  // Presentación, tablas, estilo, conclusiones o brevedad se corrigen después de forma
  // determinista por ControlEvent y no deben provocar cuatro llamadas Gemini.
  if(event&&(intent.broadEvent||intent.spendAnalysis||intent.anomaly)){
    const f=event.facts||{};
    const claims=[
      ['ingresos totales','(?:ingresos(?:\\s+totales|\\s+confirmados)?\\s*(?:sumaron|ascendieron\\s+a|fueron|de|:))',num(f.income_total)],
      ['compras realizadas','(?:compras\\s+realizadas\\s*(?:sumaron|ascendieron\\s+a|fueron|por\\s+valor\\s+de|de|:)|total\\s+de\\s+compras\\s*(?:realizadas)?\\s*(?:de|:))',num(f.purchases_realized)],
      ['donaciones valoradas','(?:donaciones(?:\\s+valoradas)?\\s*(?:sumaron|ascendieron\\s+a|fueron|por\\s+valor\\s+de|de|:))',num(f.donations_value)],
      ['saldo operativo','(?:saldo(?:\\s+operativo|\\s+final|\\s+actual)?\\s*(?:es|fue|queda|quedó|de|:))',num(f.operating_balance)],
      ['valoración del evento','(?:valoraci[oó]n(?:\\s+del\\s+evento|\\s+con\\s+donaciones)?\\s*(?:es|fue|asciende\\s+a|de|:))',num(f.event_valuation)]
    ];
    for(const [label,reSrc,expected] of claims){
      const got=v26NarrativeEuroAfterLabel(answer,reSrc);
      if(got!==null&&!v26MoneyMatches(got,expected))issues.push(`La cifra citada para ${label} debe ser ${v26FormatEuro(expected)}.`);
    }
    if(/gracias\s+a\s+(?:las\s+)?donaciones[^.!?]{0,120}\bsaldo\b|\bdonaciones\b[^.!?]{0,100}\b(?:mejoraron|aumentaron|elevaron|hicieron\s+positivo)\b[^.!?]{0,60}\bsaldo\b/i.test(answer))issues.push('Las donaciones no pueden presentarse como causa del saldo operativo.');
    if(intent.spendAnalysis){
      const valuation=num(f.event_valuation),purchases=num(f.purchases_realized);
      const claimedPurchases=v26NarrativeEuroAfterLabel(answer,'(?:compras\\s+realizadas\\s*(?:sumaron|ascendieron\\s+a|fueron|por\\s+valor\\s+de|de|:)|total\\s+de\\s+compras\\s*(?:realizadas)?\\s*(?:de|:))');
      if(claimedPurchases!==null&&v26MoneyMatches(claimedPurchases,valuation)&&!v26MoneyMatches(valuation,purchases))issues.push('Se ha usado la valoración como si fueran compras realizadas.');
    }
    const desc=norm(f.description||'');
    if(/\bobjetiv[oa]\s+(?:era|fue|consist[ií]a)\b/i.test(answer)&&!/\bobjetiv/.test(desc))issues.push('Se ha inventado el objetivo/finalidad del evento.');
  }

  if(documentation){
    const f=documentation.facts||{};
    if(/\b(todo|todos|ninguno|ninguna)\b[^.!?]{0,70}\b(?:justific|document|adjunt|ticket)/i.test(answer)){
      const missing=num(f.missing_evidence_count);
      if(missing>0&&/\b(todo|todos|ninguno|ninguna)\b/i.test(answer))issues.push(`Existen ${missing} elementos sin evidencia documental; no puede afirmarse que está todo completo.`);
    }
    if(/\bconciliad[oa]s?\b/i.test(answer)&&!/conciliaci[oó]n/.test(norm(f.note||'')))issues.push('La herramienta documental acredita adjuntos, no conciliación bancaria.');
  }

  if(/\b\d+(?:[.,]\d+)?\s*€\s*(?:eventos?|personas?|líneas?|lineas?|días?|dias?|unidades?)/i.test(answer))issues.push('Un conteo se ha presentado erróneamente como euros.');

  const knownMoney=v26KnownMoneyValues(results);
  const rawNumber=/-?(?:\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,4})?|\d+(?:[.,]\d{1,4})?)/g;
  let nm;
  while((nm=rawNumber.exec(answer))){
    const before=answer[nm.index-1]||'',after=answer[rawNumber.lastIndex]||'';
    if(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(before)||/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ/]/.test(after))continue;
    if(/^\s*(?:€|euros?)/i.test(answer.slice(rawNumber.lastIndex,rawNumber.lastIndex+10)))continue;
    if(!v26MoneyContext(answer,nm.index,rawNumber.lastIndex))continue;
    const n=round(v26ParseLocalizedDisplayNumber(nm[0]),2);
    if(Number.isFinite(n)&&knownMoney.some(v=>Math.abs(v-n)<0.011)){issues.push(`El importe ${nm[0]} está sin unidad monetaria.`);break;}
  }
  return semanticUnique(issues);
}

async function callGeminiV26Final(userPrompt,plan,results,flowTrace=[],conversationHistory=[],conversationContext={}){
  const apiKey=geminiKey(); if(!apiKey)throw new Error('Falta GEMINI_API_KEY para redactar la respuesta.');
  let repair='',lastError=null;
  const models=v26ModelList('final');
  let preferredModel=models[0]||'gemini-2.5-flash';

  for(let attempt=1;attempt<=2;attempt++){
    let qualityRetry=false, completedTransport=false;
    for(let mi=0;mi<models.length;mi++){
      const model=mi===0?preferredModel:models[mi];
      if(mi>0&&model===preferredModel)continue;
      try{
        const promptText=v26FinalPrompt(userPrompt,plan,results,repair,conversationHistory,conversationContext);
        zuzuTracePush(flowTrace,'V27 · Gemini analiza y redacta','RUN',`Modelo ${model}${attempt>1?' · reintento de calidad':''}.`);
        const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
        const body={contents:[{role:'user',parts:[{text:promptText}]}],generationConfig:{responseMimeType:'application/json',responseSchema:v26FinalSchema(),temperature:0.22,maxOutputTokens:4200}};
        const {res,payload}=await geminiFetchJsonWithTimeout(url,body,apiKey,Number(process.env.CONTROLEVENT_ZUZU_TOOLS_FINAL_TIMEOUT_MS||26000));
        logGeminiUsage('V26 TOOLS FINAL',model,payload);
        if(!res.ok){const e=new Error(payload?.error?.message||`Gemini final HTTP ${res.status}`);e.status=Number(res.status||502);throw e;}
        completedTransport=true;preferredModel=model;
        const apiUsage=usageSmall(payload,model);
        zuzuTracePush(flowTrace,'V27 · Gemini API · análisis/redacción','OK',`Llamada facturable completada con ${model}${attempt>1?' (reintento de calidad)':''}.`,{model,usage:apiUsage});
        const raw=JSON.parse(trim(geminiOutText(payload))||'{}');
        const bad=v26UnsupportedMoney(raw?.answer,results);
        if(bad.length){
          repair=`Has citado importes no presentes entre los hechos canónicos: ${bad.join(', ')}. Reescribe usando exclusivamente cifras entregadas por CE.`;
          lastError=new Error(repair);qualityRetry=true;
          zuzuTracePush(flowTrace,'V27 · Auditor de verdad','RETRY',repair,{model});
          break;
        }
        const qualityIssues=v26ResponseQualityIssues(raw,results,userPrompt,conversationContext);
        if(qualityIssues.length){
          repair=`Corrige únicamente estos problemas objetivos: ${qualityIssues.join(' | ')}`;
          lastError=new Error(repair);qualityRetry=true;
          zuzuTracePush(flowTrace,'V27 · Auditor de verdad','RETRY',repair,{model});
          break;
        }
        zuzuTracePush(flowTrace,'V27 · Auditor de verdad','OK','Cifras y conceptos canónicos coherentes.',{model});
        zuzuTracePush(flowTrace,'V27 · Gemini analiza y redacta','OK',`Respuesta final estructurada (${trim(raw?.answer).length} caracteres).`,{model});
        return{title:trim(raw?.title)||'Respuesta de Zuzu',answer:trim(raw?.answer),warnings:arr(raw?.warnings).map(trim).filter(Boolean),showTables:arr(raw?.show_tables),chartSpecs:arr(raw?.charts),model,usage:apiUsage};
      }catch(error){
        lastError=error;
        const canRetryTransport=mi<models.length-1&&isRetryable(error)&&!isQuotaError(error);
        zuzuTracePush(flowTrace,'V27 · Gemini analiza y redacta',canRetryTransport?'RETRY':'KO',cleanGeminiError(error),{model});
        if(!canRetryTransport)break;
      }
    }
    if(qualityRetry&&attempt<2)continue;
    if(qualityRetry)break;
    if(!completedTransport)break;
  }
  throw lastError||new Error('Gemini no pudo redactar una respuesta fiable.');
}
function v27AutoChartSpecs(results,userPrompt='',forceCharts=false,maxSpecs=5){
  if(!forceCharts&&!semanticPromptExplicitlyRequestsCharts(userPrompt))return[];
  const specs=[],p=norm(userPrompt);
  const bankFocused=/\b(banco|bancari\w*|concili\w*|movimientos?|saldo\s+(?:bancari\w*|de\s+la\s+cuenta)|evolucion\s+(?:bancari\w*|del\s+saldo))\b/.test(p);
  const preferredKeys=bankFocused
    ? ['balance_timeline','economics_chart','attendance_chart','management_chart','documentation_chart','stores','destinations','segments','products','comparison','weather']
    : ['economics_chart','attendance_chart','management_chart','documentation_chart','stores','destinations','segments','products','comparison','weather','balance_timeline'];
  // Orden global por utilidad semántica. No dependemos del orden accidental en que las
  // herramientas hayan terminado: una petición bancaria puede priorizar su cronología aunque
  // el dossier se haya ejecutado antes; una petición general hace justo lo contrario.
  const candidates=[];
  arr(results).forEach((r,ri)=>{
    if(!r?.ok)return;
    arr(r?.tables).forEach((t,ti)=>{
      if(t?.chartable===false)return;
      const pi=preferredKeys.indexOf(trim(t?.key));
      candidates.push({r,t,ri,ti,priority:pi<0?999:pi});
    });
  });
  candidates.sort((a,b)=>a.priority-b.priority||a.ri-b.ri||a.ti-b.ti);
  for(const {r,t} of candidates){
    if(specs.length>=maxSpecs)break;
    const rows=arr(t?.rows);if(rows.length<2)continue;
    if(trim(t?.key)==='balance_timeline'){
      const wantsImpact=/\b(impacto|variacion|variación|aportad[oa]|movimientos?\s+del\s+evento)\b/i.test(text(userPrompt));
      const valueField=wantsImpact?'Impacto bancario acumulado':'Saldo bancario del periodo';
      const title=wantsImpact?(trim(t.title)||'Impacto bancario acumulado'):(trim(t.title)||'Saldo bancario del periodo');
      specs.push({title,type:'line',tool_id:trim(r.id),table_key:trim(t.key),label_field:'Momento',value_field:valueField,series_fields:[],marker_field:'Tipo',unit:'€'});
      continue;
    }
    const fields=[...new Set(rows.flatMap(row=>row&&typeof row==='object'&&!Array.isArray(row)?Object.keys(row):[]))];
    const label=fields.find(f=>{const m=v26TableFieldMeta(t,f);return !m||!v26IsChartNumericMeta(m);});
    const numeric=fields.filter(f=>v26IsChartNumericMeta(v26TableFieldMeta(t,f)));
    if(!label||!numeric.length)continue;
    const baseUnit=trim(v26TableFieldMeta(t,numeric[0])?.unit);
    let grouped=numeric.filter(f=>trim(v26TableFieldMeta(t,f)?.unit)===baseUnit).slice(0,4);
    if(['destinations','segments'].includes(trim(t.key))){
      grouped=['Comprado','Donado','Pte.Compra'].filter(f=>fields.includes(f)&&v26IsChartNumericMeta(v26TableFieldMeta(t,f)));
    }
    if(grouped.length>1 && ['destinations','segments'].includes(trim(t.key))){
      specs.push({title:trim(t.title),type:'stackedBar',tool_id:trim(r.id),table_key:trim(t.key),label_field:label,value_field:'',series_fields:grouped,unit:baseUnit});
    }else{
      const vf=numeric[0],meta=v26TableFieldMeta(t,vf);
      specs.push({title:trim(t.title),type:rows.length>8?'horizontalBar':'bar',tool_id:trim(r.id),table_key:trim(t.key),label_field:label,value_field:vf,series_fields:[],unit:trim(meta?.unit)});
    }
  }
  return specs;
}

function v26BuildPresentation(final,results,userPrompt,options={}){
  const byId=new Map(arr(results).map(r=>[trim(r.id),r])); const tables=[],charts=[]; const seenT=new Set();
  const explicitCharts=semanticPromptExplicitlyRequestsCharts(userPrompt);
  const inferredCharts=options?.wantsCharts===true;
  const chartIntent=explicitCharts||inferredCharts;
  const autoChartSpecs=chartIntent?v27AutoChartSpecs(results,userPrompt,true,explicitCharts?5:1):[];
  const chartSpecs=arr(final?.chartSpecs).concat(autoChartSpecs);
  const asksTablesWithCharts=/\b(tabla|tablas|listado|listados|datos en tabla|detalle tabular)\b/i.test(text(userPrompt));
  for(const ref of (chartIntent&&!asksTablesWithCharts?[]:arr(final?.showTables).slice(0,6))){
    const r=byId.get(trim(ref?.tool_id)),t=arr(r?.tables).find(x=>trim(x?.key)===trim(ref?.table_key)); if(!t||!arr(t.rows).length)continue; const sig=`${r.id}:${t.key}`;if(seenT.has(sig))continue;seenT.add(sig);
    const srcRows=arr(t.rows).slice(0,160);const columns=[];srcRows.forEach(row=>{if(row&&typeof row==='object'&&!Array.isArray(row))Object.keys(row).forEach(k=>{if(!columns.includes(k))columns.push(k);});});const cols=columns.slice(0,24);
    const rows=srcRows.map(row=>cols.map(c=>v26FormatPresentationCell(row?.[c],v26EffectiveCellMeta(t,c,row))));if(cols.length)tables.push({title:t.title,columns:cols,rows});
  }
  const wantsCharts=chartIntent || arr(final?.chartSpecs).length>0;
  if(wantsCharts){
    const seenCharts=new Set();
    for(const spec of chartSpecs.slice(0,12)){
      if(charts.length>=5)break;
      const chartSig=[trim(spec?.tool_id),trim(spec?.table_key),trim(spec?.label_field),trim(spec?.value_field),arr(spec?.series_fields).map(trim).join('|')].join('::');
      if(seenCharts.has(chartSig))continue;seenCharts.add(chartSig);
      const r=byId.get(trim(spec?.tool_id)),t=arr(r?.tables).find(x=>trim(x?.key)===trim(spec?.table_key));if(!t||t?.chartable===false)continue;const lf=trim(spec?.label_field),vf=trim(spec?.value_field),labelMeta=v26TableFieldMeta(t,lf),valueMeta=v26TableFieldMeta(t,vf);if(labelMeta&&v26IsChartNumericMeta(labelMeta))continue;
      const requestedSeries=arr(spec?.series_fields).map(trim).filter(Boolean);if(requestedSeries.length){const metas=requestedSeries.map(f=>v26TableFieldMeta(t,f));if(metas.some(m=>!v26IsChartNumericMeta(m)))continue;const units=[...new Set(metas.map(m=>trim(m?.unit)).filter(Boolean))];if(units.length>1)continue;const labels=[],series=requestedSeries.map(f=>({name:f,values:[]}));for(const row of arr(t.rows).slice(0,20)){if(!(lf in row))continue;labels.push(trim(row[lf])||'Sin etiqueta');requestedSeries.forEach((f,i)=>series[i].values.push(num(row[f])));}if(labels.length<2)continue;charts.push({title:trim(spec?.title)||t.title,type:'stackedBar',labels,values:[],series,unit:units[0]||trim(spec?.unit)});continue;}
      if(!v26IsChartNumericMeta(valueMeta))continue;const labels=[],values=[],pointKinds=[];const markerField=trim(spec?.marker_field);const maxChartRows=trim(t?.key)==='balance_timeline'?800:30;for(const row of arr(t.rows).slice(0,maxChartRows)){if(!(lf in row)||!(vf in row))continue;const n=Number(row[vf]);if(!Number.isFinite(n))continue;labels.push(trim(row[lf])||'Sin etiqueta');values.push(n);if(markerField)pointKinds.push(trim(row?.[markerField]));}if(labels.length<2)continue;const uniq=new Set(values.map(v=>round(v,6)));if(uniq.size<=1)continue;let type=trim(spec?.type);if(!['bar','horizontalBar','pie','donut','line'].includes(type))type=labels.length>8?'horizontalBar':'bar';if((type==='pie'||type==='donut')&&labels.length<2)continue;charts.push({title:trim(spec?.title)||t.title,type,labels,values,pointKinds:pointKinds.length===labels.length?pointKinds:[],unit:trim(valueMeta?.unit)||trim(spec?.unit)});
    }
    const compare=arr(results).find(r=>r.ok&&r.name==='compare_events');if(compare&&!charts.length){const t=arr(compare.tables).find(x=>x.key==='comparison');if(t&&arr(t.rows).length>=2){for(const field of ['Ingresos','Compras realizadas','Donaciones valoradas','Saldo operativo','Valoración del evento']){const meta=v26TableFieldMeta(t,field);const values=arr(t.rows).map(x=>num(x[field]));if(new Set(values.map(v=>round(v,6))).size<=1)continue;charts.push({title:`Comparativa · ${field}`,type:'bar',labels:arr(t.rows).map(x=>trim(x.Evento)),values,unit:trim(meta?.unit)});if(charts.length>=5)break;}}}
  }
  return{tables,charts};
}
function v26SemanticAudit(final,results,userPrompt,conversationContext={}){
  const out={...final,showTables:arr(final?.showTables).slice(),chartSpecs:arr(final?.chartSpecs).slice(),warnings:arr(final?.warnings).slice()};
  const p=norm(userPrompt),intent=v26ImplicitIntent(userPrompt),frame=v26NormalizeConversationContext(conversationContext);
  const cmp=arr(results).find(r=>r.ok&&r.name==='compare_events');

  if(intent.comparison&&cmp){
    const names=arr(cmp?.facts?.event_names);
    const missing=names.filter(n=>!norm(out.answer).includes(norm(n)));
    const tooGeneric=trim(out.answer).length<90||/he recuperado los datos solicitados/i.test(out.answer);
    if(missing.length||tooGeneric){
      const table=arr(cmp.tables).find(x=>x.key==='comparison'),rows=arr(table?.rows);
      if(rows.length){
        const incomeWinner=rows.slice().sort((a,b)=>num(b.Ingresos)-num(a.Ingresos))[0];
        const valuationWinner=rows.slice().sort((a,b)=>num(b['Valoración del evento'])-num(a['Valoración del evento']))[0];
        const balanceWinner=rows.slice().sort((a,b)=>num(b['Saldo operativo'])-num(a['Saldo operativo']))[0];
        const donationWinner=rows.slice().sort((a,b)=>num(b['Donaciones valoradas'])-num(a['Donaciones valoradas']))[0];
        out.title=`Comparativa · ${names.join(' vs ')}`;
        out.answer=`La comparación usa la misma base canónica para ${names.length} eventos. ${incomeWinner.Evento} registra los mayores ingresos (${v26FormatEuro(incomeWinner.Ingresos)}); ${balanceWinner.Evento}, el mayor saldo operativo (${v26FormatEuro(balanceWinner['Saldo operativo'])}); ${donationWinner.Evento}, el mayor valor de producto donado (${v26FormatEuro(donationWinner['Donaciones valoradas'])}); y ${valuationWinner.Evento}, la mayor valoración total (${v26FormatEuro(valuationWinner['Valoración del evento'])}).`;
      }
    }
    if(intent.asksConclusion&&!/(?:sal[ií]o|fue|result[oó]|queda|qued[oó])\s+(?:claramente\s+)?mejor|mejor\s+resultado|peor\s+resultado|en\s+conclusi[oó]n|por\s+tanto|en\s+conjunto|econ[oó]micamente\s+(?:mejor|peor)|m[aá]s\s+eficiente/i.test(out.answer)){
      const t=arr(cmp.tables).find(x=>x.key==='comparison'),rows=arr(t?.rows);
      if(rows.length===2){
        const a=rows[0],b=rows[1],aVal=num(a['Valoración del evento']),bVal=num(b['Valoración del evento']),aSaldo=num(a['Saldo operativo']),bSaldo=num(b['Saldo operativo']);
        const winner=bVal>aVal?b:a,other=winner===a?b:a;
        const saldoWinner=winner===a?aSaldo:bSaldo,saldoOther=winner===a?bSaldo:aSaldo;
        out.answer+=` En conjunto, ${winner.Evento} aporta más valor según la valoración económica de ControlEvent: ${v26FormatEuro(winner['Valoración del evento'])} frente a ${v26FormatEuro(other['Valoración del evento'])}. Su saldo operativo es ${v26FormatEuro(saldoWinner)}, frente a ${v26FormatEuro(saldoOther)} del otro evento.`;
      }
    }
    if(!out.showTables.some(x=>trim(x.tool_id)===trim(cmp.id)&&trim(x.table_key)==='comparison')&&intent.explicitList)out.showTables.unshift({tool_id:cmp.id,table_key:'comparison'});
    out.chartSpecs=out.chartSpecs.filter(x=>trim(x.tool_id)===trim(cmp.id));
  }

  const persons=arr(results).filter(r=>r.ok&&r.name==='person_dossier');
  if(persons.length>=2){
    const a=persons[0].facts||{},b=persons[1].facts||{};
    const an=trim(arr(results).find(r=>r===persons[0])?.facts?.query||a.person||'Primera persona');
    const bn=trim(arr(results).find(r=>r===persons[1])?.facts?.query||b.person||'Segunda persona');
    const focus=v26FollowupFocusFromPrompt(userPrompt,frame.focus);
    out.title=`Comparativa · ${an} vs ${bn}`;

    if(focus==='participation'||/\bparticip/.test(p)){
      const ac=num(a.event_count),bc=num(b.event_count);
      const winner=ac===bc?'Empate':ac>bc?an:bn;
      out.answer=`${an} aparece vinculado a ${v26CountPhrase(ac,'evento','eventos')} y ${bn} a ${v26CountPhrase(bc,'evento','eventos')}. ${winner==='Empate'?'Los dos tienen la misma participación por número de eventos.':`Por participación en eventos, ${winner} ha participado más.`}`;
    }else if(focus==='responsibilities'||/\bresponsab/.test(p)){
      const aTasks=num(a.hitos_count)+num(a.lg_count),bTasks=num(b.hitos_count)+num(b.lg_count);
      out.answer=`En responsabilidades, ${an} tiene ${v26CountPhrase(a.purchase_responsibility_lines,'línea','líneas')} de compra vinculadas por ${v26FormatEuro(a.purchase_responsibility_total)}, además de ${v26CountPhrase(a.hitos_count,'hito','hitos')} y ${v26CountPhrase(a.lg_count,'tarea LG','tareas LG')}. ${bn} tiene ${v26CountPhrase(b.purchase_responsibility_lines,'línea','líneas')} de compra por ${v26FormatEuro(b.purchase_responsibility_total)}, ${v26CountPhrase(b.hitos_count,'hito','hitos')} y ${v26CountPhrase(b.lg_count,'tarea LG','tareas LG')}.`;
      if(num(a.purchase_responsibility_lines)!==num(b.purchase_responsibility_lines)||aTasks!==bTasks){
        const aw=(num(a.purchase_responsibility_lines)>num(b.purchase_responsibility_lines)?1:0)+(aTasks>bTasks?1:0);
        const bw=(num(b.purchase_responsibility_lines)>num(a.purchase_responsibility_lines)?1:0)+(bTasks>aTasks?1:0);
        if(aw!==bw)out.answer+=` En estas dimensiones, ${aw>bw?an:bn} acumula más responsabilidad operativa registrada.`;
      }
    }else if(focus==='implication'||/\bimplicad/.test(p)){
      const dims=[
        ['participación',num(a.event_count),num(b.event_count)],
        ['líneas de compra bajo responsabilidad',num(a.purchase_responsibility_lines),num(b.purchase_responsibility_lines)],
        ['gestión Hitos/LG',num(a.hitos_count)+num(a.lg_count),num(b.hitos_count)+num(b.lg_count)],
        ['donaciones como donante',num(a.donation_lines),num(b.donation_lines)]
      ];
      let aw=0,bw=0;dims.forEach(([,av,bv])=>{if(av>bv)aw++;else if(bv>av)bw++;});
      const winner=aw===bw?'ninguno de forma clara':aw>bw?an:bn;
      out.answer=`Para valorar la implicación no uso un índice opaco: comparo participación, responsabilidades de compra, gestión Hitos/LG y donaciones. ${an} aparece en ${v26CountPhrase(a.event_count,'evento','eventos')} y registra ${v26CountPhrase(a.purchase_responsibility_lines,'línea','líneas')} de compra bajo responsabilidad, ${v26CountPhrase(a.hitos_count+a.lg_count,'responsabilidad de gestión','responsabilidades de gestión')}; ${bn} aparece en ${v26CountPhrase(b.event_count,'evento','eventos')} y registra ${v26CountPhrase(b.purchase_responsibility_lines,'línea','líneas')} de compra y ${v26CountPhrase(b.hitos_count+b.lg_count,'responsabilidad de gestión','responsabilidades de gestión')}. ${winner==='ninguno de forma clara'?'Las dimensiones quedan repartidas y no hay un ganador claro.':`Con ese criterio, ${winner} muestra una implicación registrada mayor.`}`;
    }else{
      out.answer=`${an} aparece en ${v26CountPhrase(a.event_count,'evento','eventos')} y ${bn} en ${v26CountPhrase(b.event_count,'evento','eventos')}. En ingresos vinculados constan ${v26FormatEuro(a.income_linked_total)} frente a ${v26FormatEuro(b.income_linked_total)}; en compras bajo responsabilidad, ${v26FormatEuro(a.purchase_responsibility_total)} frente a ${v26FormatEuro(b.purchase_responsibility_total)}.`;
    }
    if(!intent.explicitList)out.showTables=[];
  }else if(persons.length===1){
    const person=persons[0],f=person.facts||{};
    if(f.composite_expansion){
      const names=arr(f.matched_entities);
      if(names.length>1&&!names.some(n=>norm(out.answer).includes(norm(n))))out.answer=`He tenido en cuenta que «${f.query}» aparece en ControlEvent bajo varias entidades relacionadas: ${names.join(' y ')}. ${out.answer}`;
    }
    if(intent.broadPerson&&!/responsab|compras?|hitos?|tareas?|\blg\b|donaci/i.test(out.answer)){
      const bits=[];
      if(num(f.purchase_responsibility_lines)>0)bits.push(`${v26CountPhrase(f.purchase_responsibility_lines,'línea','líneas')} de compra bajo responsabilidad vinculada, por ${v26FormatEuro(f.purchase_responsibility_total)}`);
      if(num(f.donation_lines)>0)bits.push(`${v26CountPhrase(f.donation_lines,'donación','donaciones')} vinculadas, valoradas en ${v26FormatEuro(f.donations_value)}`);
      if(num(f.hitos_count)>0||num(f.lg_count)>0)bits.push(`${v26CountPhrase(f.hitos_count,'hito','hitos')} y ${v26CountPhrase(f.lg_count,'tarea','tareas')} LG`);
      if(bits.length)out.answer+=` En responsabilidades y gestión constan ${bits.join('; ')}.`;
    }
  }

  const documentation=arr(results).find(r=>r.ok&&r.name==='event_documentation');
  if(documentation){
    const f=documentation.facts||{},missing=arr(f.missing_evidence);
    const asksMissing=frame.focus==='documentation_missing'||/\b(faltan|pendientes|cuales son|cuáles son)\b/.test(p);
    if(asksMissing){
      out.title=`Justificación documental · ${f.event}`;
      if(!missing.length){
        out.answer=`No falta ningún justificante o adjunto de los que ControlEvent controla documentalmente en ${f.event}: los ${v26CountPhrase(f.income_records,'registro de ingreso','registros de ingreso')} tienen justificante, los ${v26CountPhrase(f.purchase_tickets,'ticket de compra','tickets de compra')} tienen fototicket y los ${v26CountPhrase(f.documents,'documento','documentos')} registrados tienen adjunto. Esto acredita documentación disponible; no equivale por sí solo a conciliación bancaria.`;
        out.showTables=[];
      }else{
        out.answer=`Faltan ${v26CountPhrase(missing.length,'elemento documental','elementos documentales')} en ${f.event}. Te indico exactamente cuáles en la tabla de pendientes.`;
        out.showTables=[{tool_id:documentation.id,table_key:'missing_evidence'}];
      }
    }else if(trim(out.answer).length<100||/he recuperado los datos solicitados/i.test(out.answer)){
      out.title=`Justificación documental · ${f.event}`;
      out.answer=`En ${f.event}, ${v26CountPhrase(f.income_with_receipt,'registro de ingreso tiene','registros de ingreso tienen')} justificante de ${v26CountPhrase(f.income_records,'registro','registros')}; ${v26CountPhrase(f.purchase_tickets_with_image,'ticket de compra tiene','tickets de compra tienen')} fototicket de ${v26CountPhrase(f.purchase_tickets,'ticket','tickets')}; y ${v26CountPhrase(f.documents_with_attachment,'documento tiene','documentos tienen')} adjunto de ${v26CountPhrase(f.documents,'documento','documentos')}. ${num(f.missing_evidence_count)>0?`Quedan ${v26CountPhrase(f.missing_evidence_count,'elemento','elementos')} sin evidencia documental.`:'No detecto adjuntos documentales pendientes en estos tres bloques.'}`;
    }
  }

  const event=arr(results).find(r=>r.ok&&r.name==='event_dossier');
  if(event&&intent.anomaly){
    const f=event.facts||{},people=arr(results).find(r=>r.ok&&r.name==='event_people'),breakdown=arr(results).find(r=>r.ok&&r.name==='event_breakdowns');
    const docs=documentation,findings=[];
    const peopleTable=arr(people?.tables).find(t=>t.key==='people');
    const negative=arr(peopleTable?.rows).filter(r=>num(r['Importe voluntario'])<0);
    if(negative.length)findings.push(`${v26CountPhrase(negative.length,'ajuste voluntario negativo','ajustes voluntarios negativos')} en ingresos (${negative.slice(0,3).map(r=>`${r.Persona}: ${v26FormatEuro(r['Importe voluntario'])}`).join(', ')})`);
    if(num(f.purchases_pending)>0)findings.push(`quedan ${v26FormatEuro(f.purchases_pending)} en compras pendientes`);
    if(num(f.operating_balance)<0)findings.push(`el saldo operativo es negativo (${v26FormatEuro(f.operating_balance)})`);
    if(docs&&num(docs?.facts?.missing_evidence_count)>0)findings.push(`hay ${v26CountPhrase(docs.facts.missing_evidence_count,'elemento documental','elementos documentales')} sin adjunto`);
    if(breakdown){
      const bf=breakdown.facts||{};
      if(Math.abs(num(bf.purchases_realized)-num(f.purchases_realized))>.02)findings.push(`el desglose de compras (${v26FormatEuro(bf.purchases_realized)}) no coincide con el total canónico (${v26FormatEuro(f.purchases_realized)})`);
      if(Math.abs(num(bf.donations_value)-num(f.donations_value))>.02)findings.push(`el desglose de donaciones (${v26FormatEuro(bf.donations_value)}) no coincide con el total canónico (${v26FormatEuro(f.donations_value)})`);
    }
    out.title=`Revisión de anomalías · ${f.event}`;
    if(findings.length){
      out.answer=`He revisado ingresos, compras, donaciones, saldo, participación y documentación. Sí hay aspectos que merecen revisión: ${findings.join('; ')}. No les atribuyo una causa sin datos adicionales.`;
    }else{
      const ratio=num(f.purchases_realized)?round(num(f.donations_value)/num(f.purchases_realized)*100,1):0;
      out.answer=`He revisado los principales cruces de ${f.event} y no veo un descuadre contable evidente: ingresos ${v26FormatEuro(f.income_total)}, compras ${v26FormatEuro(f.purchases_realized)}, saldo ${v26FormatEuro(f.operating_balance)} y valoración ${v26FormatEuro(f.event_valuation)} son coherentes entre sí. Como dato llamativo, el producto donado vale ${v26FormatEuro(f.donations_value)}${ratio?`, aproximadamente un ${v26FormatPlainNumber(ratio,1)} % del valor de las compras realizadas`:''}. Eso es relevante, pero no es por sí mismo una anomalía.`;
    }
    out.showTables=[];
  }

  const breakdown=arr(results).find(r=>r.ok&&r.name==='event_breakdowns');
  if(breakdown){
    const force=(key)=>{if(!out.showTables.some(x=>trim(x.tool_id)===trim(breakdown.id)&&trim(x.table_key)===key))out.showTables.push({tool_id:breakdown.id,table_key:key});};
    if(/\bdestino\b/.test(p))force('destinations');
    if(/\bsegmento\b/.test(p))force('segments');
    if(/\bforma de pago\b/.test(p))force('income_methods');
    if(/\btienda|tiendas\b/.test(p))force('stores');
  }

  if(intent.explicitNoTables||(intent.conversational&&!intent.explicitList&&!intent.comparison)){
    out.showTables=[];
  }
  return out;
}
function v26FallbackFromTools(results,userPrompt){
  const ok=arr(results).filter(r=>r.ok),intent=v26ImplicitIntent(userPrompt); if(!ok.length)return{title:'Zuzu no ha podido recuperar datos',answer:'No he podido obtener hechos fiables de ControlEvent para responder a esta petición.',showTables:[],chartSpecs:[],warnings:arr(results).map(r=>r.error).filter(Boolean)};
  const persons=ok.filter(r=>r.name==='person_dossier');if(persons.length>=2){const a=persons[0].facts||{},b=persons[1].facts||{};return{title:`Comparativa · ${a.person||'persona 1'} vs ${b.person||'persona 2'}`,answer:`${a.person} aparece en ${v26CountPhrase(a.event_count,'evento','eventos')} y ${b.person} en ${v26CountPhrase(b.event_count,'evento','eventos')}. En ingresos vinculados constan ${v26FormatEuro(a.income_linked_total)} frente a ${v26FormatEuro(b.income_linked_total)}; en responsabilidades de compra, ${v26FormatEuro(a.purchase_responsibility_total)} frente a ${v26FormatEuro(b.purchase_responsibility_total)}.`,showTables:[],chartSpecs:[],warnings:[]};}
  const activity=ok.find(r=>r.name==='people_activity');if(activity){return{title:'Implicación en las actividades de la Peña',answer:'He cruzado participación, responsabilidad de compras, donaciones y gestión. No uso un único recuento como sinónimo de implicación: la conclusión debe apoyarse en varias dimensiones.',showTables:[{tool_id:activity.id,table_key:'people_activity'}],chartSpecs:[],warnings:[]};}
  const overview=ok.find(r=>r.name==='events_overview');if(overview){return{title:'Panorama de eventos',answer:`He revisado ${v26CountPhrase(overview.facts?.event_count||0,'evento','eventos')} con una base económica homogénea para poder comparar caja, compras, donaciones, valoración y asistencia.`,showTables:[],chartSpecs:[],warnings:[]};}
  const documentation=ok.find(r=>r.name==='event_documentation');if(documentation){const f=documentation.facts||{};return{title:`Justificación documental · ${f.event||''}`,answer:`En ${f.event} constan ${v26CountPhrase(f.income_records||0,'registro de ingreso','registros de ingreso')}, de los que ${v26CountPhrase(f.income_with_receipt||0,'tiene','tienen')} justificante adjunto; ${v26CountPhrase(f.purchase_tickets||0,'ticket de compra','tickets de compra')}, con ${v26CountPhrase(f.purchase_tickets_with_image||0,'fototicket','fototickets')} disponibles; y ${v26CountPhrase(f.documents||0,'documento','documentos')} del evento.`,showTables:[],chartSpecs:[],warnings:[]};}
  const person=ok.find(r=>r.name==='person_dossier');if(person){const f=person.facts||{};const entities=arr(f.matched_entities).filter(Boolean);const relation=f.composite_expansion&&entities.length>1?` He tenido en cuenta sus apariciones como ${entities.join(' y ')}.`:'';const money=f.composite_expansion?` Los registros individuales suman ${v26FormatEuro(f.income_direct_total)} y los registros de pareja/entidad compuesta suman ${v26FormatEuro(f.income_composite_total)}.`:` Sus ingresos enlazados suman ${v26FormatEuro(f.income_linked_total)}.`;const resp=[];if(num(f.purchase_responsibility_lines)>0)resp.push(`${v26CountPhrase(f.purchase_responsibility_lines,'línea','líneas')} de compra por ${v26FormatEuro(f.purchase_responsibility_total)}`);if(num(f.hitos_count)>0||num(f.lg_count)>0)resp.push(`${v26CountPhrase(f.hitos_count,'hito','hitos')} y ${v26CountPhrase(f.lg_count,'tarea','tareas')} LG`);const answer=`${f.person} aparece en ${v26CountPhrase(f.event_count,'evento','eventos')}.${relation}${money}${resp.length?` En responsabilidades y gestión constan ${resp.join(' y ')}.`:''}`;return{title:`Información sobre ${f.person||'la persona'}`,answer,showTables:[],chartSpecs:[],warnings:[]};}
  const event=ok.find(r=>r.name==='event_dossier'),breakdown=ok.find(r=>r.name==='event_breakdowns');
  if(event&&(intent.broadEvent||intent.spendAnalysis)){
    const f=event.facts||{},b=breakdown?.facts||{};
    if(intent.spendAnalysis){
      const stores=arr(b.top_stores).slice(0,3),dests=arr(b.top_destinations_realized).filter(x=>num(x?.Comprado)>0).slice(0,3),prods=arr(b.top_products_realized).slice(0,3);
      const parts=[];
      if(stores.length)parts.push(`por tienda destacan ${stores.map(x=>`${x.Tienda} (${v26FormatEuro(x.Importe)})`).join(', ')}`);
      if(dests.length)parts.push(`por destino, ${dests.map(x=>`${x.Destino} (${v26FormatEuro(x.Comprado)})`).join(', ')}`);
      if(prods.length)parts.push(`entre los conceptos de mayor coste, ${prods.map(x=>`${x.Producto} (${v26FormatEuro(x.Importe)})`).join(', ')}`);
      return{title:`En qué se gastó el dinero · ${f.event}`,answer:`En ${f.event} se realizaron compras por ${v26FormatEuro(f.purchases_realized)}.${parts.length?` El gasto se concentra ${parts.join('; ')}.`:''} Las donaciones, valoradas en ${v26FormatEuro(f.donations_value)}, aportan producto pero no forman parte del dinero gastado ni del saldo de caja.`,showTables:[],chartSpecs:[],warnings:[]};
    }
    const mgmt=num(f.lg_count)>0?` En gestión constan ${v26CountPhrase(f.lg_count,'tarea','tareas')} LG, con ${v26CountPhrase(f.lg_pending,'pendiente','pendientes')}.`:'';
    return{title:`Resumen de ${f.event}`,answer:`${f.event} registró ${v26FormatEuro(f.income_total)} de ingresos. Las compras realizadas fueron ${v26FormatEuro(f.purchases_realized)}${num(f.purchases_pending)>0?` y quedan ${v26FormatEuro(f.purchases_pending)} pendientes`:''}; el producto donado está valorado en ${v26FormatEuro(f.donations_value)}. El saldo operativo es ${v26FormatEuro(f.operating_balance)} y la valoración del evento, calculada como compras más producto donado, es ${v26FormatEuro(f.event_valuation)}. La asistencia confirmada es de ${v26CountPhrase(f.attendees_canonical,'persona','personas')}.${mgmt}`,showTables:[],chartSpecs:[],warnings:[]};
  }
  if(breakdown){const p=norm(userPrompt),refs=[];if(/\bdestino\b/.test(p))refs.push({tool_id:breakdown.id,table_key:'destinations'});if(/\bsegmento\b/.test(p))refs.push({tool_id:breakdown.id,table_key:'segments'});if(/\btienda|tiendas\b/.test(p))refs.push({tool_id:breakdown.id,table_key:'stores'});if(!refs.length)refs.push({tool_id:breakdown.id,table_key:'destinations'},{tool_id:breakdown.id,table_key:'segments'});return{title:breakdown.title,answer:'He separado los datos económicos respetando Comprado, Donado y Pte.Compra; Valor disponible y Plan total se mantienen como conceptos distintos.',showTables:refs,chartSpecs:[],warnings:[]};}
  const store=ok.find(r=>r.name==='store_purchases');if(store){const f=store.facts||{};return{title:`Compras en ${f.store}`,answer:`Las compras ${f.status==='realized'?'realizadas ':''}en ${f.store} suman ${v26FormatEuro(f.total_amount)} en ${v26CountPhrase(f.event_count,'evento','eventos')}.`,showTables:[{tool_id:store.id,table_key:'by_event'}],chartSpecs:[],warnings:[]};}
  if(event){const f=event.facts||{};return{title:`Resumen de ${f.event}`,answer:`${f.event} registró ${v26FormatEuro(f.income_total)} de ingresos, ${v26FormatEuro(f.purchases_realized)} de compras realizadas y ${v26FormatEuro(f.donations_value)} en producto donado. El saldo operativo es ${v26FormatEuro(f.operating_balance)}, la valoración del evento es ${v26FormatEuro(f.event_valuation)} y constan ${v26CountPhrase(f.attendees_canonical,'persona','personas')} de asistencia confirmada.`,showTables:[],chartSpecs:[],warnings:[]};}
  const part=ok.find(r=>r.name==='participation_events');if(part)return{title:part.title,answer:`He encontrado ${v26CountPhrase(part.facts?.event_count||0,'evento','eventos')} para ${part.facts?.person||'la persona indicada'}.`,showTables:[{tool_id:part.id,table_key:'events'}],chartSpecs:[],warnings:[]};
  return{title:'Respuesta de Zuzu',answer:'He recuperado los datos solicitados de ControlEvent.',showTables:ok.slice(0,2).flatMap(r=>arr(r.tables).slice(0,1).map(t=>({tool_id:r.id,table_key:t.key}))),chartSpecs:[],warnings:[]};
}
async function runZuzuV26Tools({userPrompt,state,selectedEventId,flowTrace=[],conversationHistory=[],conversationContext={},conversationResolution={}}){
  let plan=v26DeterministicPlan(userPrompt,state,selectedEventId,conversationResolution,conversationContext);
  if(plan){
    zuzuTracePush(flowTrace,'V27 · Plan ControlEvent','OK',`Plan local determinista: ${plan.tools.map(t=>t.name).join(', ')}. Se evita una llamada Gemini de planificación porque la intención ya es inequívoca.`);
  }else{
    try{plan=await callGeminiV26Planner(userPrompt,state,selectedEventId,flowTrace,conversationHistory);}
    catch(error){return{ok:true,rejected:true,title:'Zuzu no ha podido interpretar la petición',answer:friendlyZuzuErrorMessage(error),warnings:[cleanGeminiError(error)],charts:[],tables:[],files:[],provider:'v26-tools-planner-error',model:'',debugTrace:flowTrace,showDebugTrace:true};}
  }
  if(plan.action==='clarify')return{ok:true,rejected:false,title:'Necesito concretar una cosa',answer:plan.clarification,warnings:[],charts:[],tables:[],files:[],provider:'v26-tools-clarify',model:plan.model||'',debugTrace:flowTrace,showDebugTrace:true};

  const results=await v26ExecuteTools(plan.tools,state,selectedEventId,flowTrace);
  const good=results.filter(r=>r.ok);
  if(!good.length){
    return{ok:true,rejected:true,title:'No puedo obtener datos fiables',answer:results.map(r=>r.error).filter(Boolean).join(' · ')||'Las herramientas de ControlEvent no han podido recuperar datos.',warnings:[],charts:[],tables:[],files:[],provider:'v26-tools-data-error',model:plan.model||'',debugTrace:flowTrace,showDebugTrace:true};
  }

  const nextContext=v26ConversationContextFromRun(userPrompt,plan,results,conversationContext,conversationResolution,selectedEventId);
  let final;
  try{
    final=await callGeminiV26Final(userPrompt,plan,results,flowTrace,conversationHistory,nextContext);
  }catch(error){
    // El fallback no es un KO funcional: CE ya tiene los hechos canónicos y construye
    // una respuesta determinista. Se deja WARN para diagnóstico sin contaminar la traza con
    // un fallo rojo si la consulta sí ha quedado respondida correctamente.
    zuzuTracePush(flowTrace,'V27 · Redacción de respaldo','WARN',`Se usa redacción determinista de ControlEvent: ${cleanGeminiError(error)}`);
    final=v26FallbackFromTools(results,userPrompt);final.model='';final.warnings=arr(final.warnings);
  }
  final=v26SemanticAudit(final,results,userPrompt,nextContext);
  final={...final,answer:v26PolishNarrative(v26FormatNarrativeMoney(final.answer,results))};
  const presentation=v26BuildPresentation(final,results,userPrompt); const files=[];
  for(const t of presentation.tables.slice(0,4)){
    const objs=t.rows.map(r=>Object.fromEntries(t.columns.map((c,i)=>[c,r[i]])));
    files.push({filename:fileSafe(`${t.title}_v27_prod_1.2.csv`),mime:'text/csv;charset=utf-8',content:csvFromRows(t.columns,objs)});
  }
  const displayName=zuzuLoggedUserDisplayName({usuarioLogado:state?.usuarioLogado||state?.ce_acceso_usuario_logado||null});
  const answer=`${trim(final.answer)}\n\n${displayName}, soy tu amigo Zuzu, pregúntame lo que quieras.`;
  zuzuTracePush(flowTrace,'V27 · ControlEvent presenta','OK',`Tools=${results.length}; tablas=${presentation.tables.length}; gráficas=${presentation.charts.length}. Contexto=${nextContext.topic||'sin marco'}${nextContext.focus?`/${nextContext.focus}`:''}.`);
  return{
    ok:true,rejected:false,title:final.title||'Respuesta de Zuzu',answer,warnings:arr(final.warnings),charts:presentation.charts,tables:presentation.tables,files,
    provider:'gemini-v26-tools',model:final.model||plan.model||'',
    meta:{
      generatedAt:new Date().toISOString(),version:'v27_prod_1.2',
      architecture:'Prompt -> CE resuelve conversación -> CE planifica si la intención es inequívoca / Gemini planifica si es ambigua -> CE calcula hechos canónicos -> Gemini analiza -> CE audita y presenta',
      plannerModel:plan.model||'',intent:plan.intent||'',tools:plan.tools.map(t=>t.name),
      conversationContext:nextContext,
      geminiUsageEstimate:summarizeGeminiUsageFromTrace(flowTrace),
      debugTrace:arr(flowTrace).slice(0,100)
    },
    conversationContext:nextContext,
    debugTrace:arr(flowTrace).slice(0,100),showDebugTrace:true
  };
}

// ============================================================================
// v27_prod_1.2 · ZUZU GEMINI INTERACTIONS
// Gemini mantiene el hilo, interpreta la intención y decide las herramientas.
// ControlEvent se limita a ejecutar herramientas, calcular hechos canónicos,
// verificar hechos objetivos y presentar. No hay rutas conversacionales hard-code.
// ============================================================================

function v261InteractionModel(){
  return trim(process.env.CONTROLEVENT_ZUZU_INTERACTIONS_MODEL || process.env.CONTROLEVENT_ZUZU_NARRATIVE_MODEL || process.env.CONTROLEVENT_EVENT_AI_MODEL || 'gemini-2.5-flash').replace(/^models\//,'') || 'gemini-2.5-flash';
}

function v261EventManagementTool(tool,state,selectedEventId=''){
  return (async()=>{
    const rr=v26ResolveEvent(state,selectedEventId,tool?.event,tool?.scope);if(!rr.ok)throw new Error(rr.error);
    const hs=await listAllHitosState();
    const people=byId(state?.personas),eventId=rr.id;
    const hitos=arr(hs?.hitos).filter(x=>trim(x?.eventId)===eventId);
    const lgs=arr(hs?.lgs).filter(x=>trim(x?.eventId)===eventId);
    const hitosRows=hitos.map(x=>({
      Hito:trim(x?.nombreHito||x?.nombre||x?.descripcion),Descripción:trim(x?.descripcion),Responsable:trim(x?.responsableNombre)||trim(people.get(trim(x?.responsableId))?.nombre),
      'Fecha inicio':trim(x?.fechaMin||x?.fechaInicio||x?.fecha_inicio),'Fecha fin':trim(x?.fechaMax||x?.fechaFin||x?.fecha_fin),
      'Tareas LG':lgs.filter(l=>trim(l?.hitoId||l?.hito_id)===trim(x?.id)).length
    }));
    const lgRows=lgs.map(x=>({
      Hito:trim(hitos.find(h=>trim(h?.id)===trim(x?.hitoId||x?.hito_id))?.nombreHito||''),Tarea:trim(x?.descripcion),Responsable:trim(x?.responsableNombre)||trim(people.get(trim(x?.responsableId))?.nombre),
      'Fecha inicio':trim(x?.fechaMin||x?.fechaInicio||x?.fecha_inicio),'Fecha fin':trim(x?.fechaMax||x?.fechaFin||x?.fecha_fin),Estado:x?.cumplida===true?'Cumplida':'Pendiente',Notas:trim(x?.notas)
    }));
    const completed=lgRows.filter(x=>x.Estado==='Cumplida').length;
    return{id:tool.id,name:tool.name,ok:true,title:`Gestión · ${rr.nombre}`,facts:{event:rr.nombre,hitos_count:hitosRows.length,lg_count:lgRows.length,lg_completed:completed,lg_pending:Math.max(0,lgRows.length-completed)},tables:[
      v26Table('hitos',`Hitos · ${rr.nombre}`,hitosRows,{Hito:v26TextSchema(),Descripción:v26TextSchema(),Responsable:v26TextSchema(),'Fecha inicio':v26DateSchema(),'Fecha fin':v26DateSchema(),'Tareas LG':v26CountSchema('tareas','Tareas LG del hito')}),
      v26Table('tasks',`Tareas LG · ${rr.nombre}`,lgRows,{Hito:v26TextSchema(),Tarea:v26TextSchema(),Responsable:v26TextSchema(),'Fecha inicio':v26DateSchema(),'Fecha fin':v26DateSchema(),Estado:v26StatusSchema(),Notas:v26TextSchema()})
    ].filter(t=>t.rows.length)};
  })();
}

async function v261EventBankTool(tool,state,selectedEventId=''){
  const rr=v26ResolveEvent(state,selectedEventId,tool?.event,tool?.scope);if(!rr.ok)throw new Error(rr.error);
  const bank=await exportBankData({accountId:'TODOS',eventId:rr.id});
  const movements=arr(bank?.movements).map(x=>({Fecha:trim(x?.executedAt||x?.executed_at||x?.fecha),Concepto:trim(x?.concept||x?.concepto||x?.description),Importe:v26Money(x?.amount||x?.importe),Incluido:x?.included!==false?'Sí':'No','Tickets vinculados':arr(x?.links).map(l=>trim(l?.ticketCode)).filter(Boolean).join(', '),'Ingresos vinculados':arr(x?.incomeLinks).length}));
  const links=arr(bank?.links).map(x=>({TKxx:trim(x?.ticketCode),Importe:v26Money(x?.ticketAmountSnapshot||x?.amount||x?.importe),Forzado:x?.forcedSquare===true?'Sí':'No'}));
  return{id:tool.id,name:tool.name,ok:true,title:`Cuadre bancario · ${rr.nombre}`,facts:{event:rr.nombre,period:bank?.period||null,summary:bank?.summary||null,ticket_summary:bank?.ticketSummary||null,movement_count:movements.length,link_count:links.length,note:'La conciliación bancaria es distinta de disponer de justificantes documentales.'},tables:[
    v26Table('movements',`Movimientos bancarios · ${rr.nombre}`,movements,{Fecha:v26DateSchema(),Concepto:v26TextSchema(),Importe:v26MoneySchema('Importe bancario'),Incluido:v26StatusSchema(),'Tickets vinculados':v26TextSchema(),'Ingresos vinculados':v26CountSchema('registros')}),
    v26Table('ticket_links',`Vínculos con tickets · ${rr.nombre}`,links,{TKxx:v26TextSchema(),Importe:v26MoneySchema(),Forzado:v26StatusSchema()})
  ].filter(t=>t.rows.length)};
}


function v272DateOnly(value){
  const iso=parseCeDateToIso(value);if(!iso)return '';
  const m=iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return '';
  const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]),dt=new Date(Date.UTC(y,mo-1,d));
  return dt.getUTCFullYear()===y&&dt.getUTCMonth()===mo-1&&dt.getUTCDate()===d?iso:'';
}
function v272DateMs(value){const iso=v272DateOnly(value);if(!iso)return NaN;const d=Date.parse(`${iso}T00:00:00Z`);return Number.isFinite(d)?d:NaN;}
function v272PeriodRelation(a1,a2,b1,b2){
  const values=[a1,a2,b1,b2].map(v=>trim(v));
  const iso=values.map(v272DateOnly);
  if(values.some(v=>!v)) return {status:'unknown',reason:'missing_date',dates:iso};
  if(iso.some(v=>!v)) return {status:'unknown',reason:'invalid_date',dates:iso};
  const ms=iso.map(v272DateMs);
  if(ms.some(v=>!Number.isFinite(v))) return {status:'unknown',reason:'invalid_date',dates:iso};
  const [A1,A2,B1,B2]=ms;
  if(A1>A2||B1>B2) return {status:'unknown',reason:'reversed_period',dates:iso};
  return {status:(A1<=B2&&B1<=A2)?'overlap':'disjoint',reason:'',dates:iso};
}
function v271BankMovementEvidence(row){
  const bits=[];
  if(row?.eventInclusionExplicit===true)bits.push('selección explícita del evento');
  if(arr(row?.links).length)bits.push('TK vinculado al evento');
  if((row?.incomeAssociationMode==='MANUAL'||num(row?.manualIncomeLinkCount)>0)&&arr(row?.incomeLinks).length)bits.push('ingreso vinculado manualmente al evento');
  return bits;
}
async function v271EventBankTimelineTool(tool,state,selectedEventId=''){
  const rr=v26ResolveEvent(state,selectedEventId,tool?.event,tool?.scope);if(!rr.ok)throw new Error(rr.error);
  const bank=await exportBankData({accountId:'TODOS',eventId:rr.id});
  const ev=rr.row||{},period=bank?.period||{},summary=bank?.summary||{};
  const eventStart=v272DateOnly(ev?.fechaIni),eventEnd=v272DateOnly(ev?.fechaFin);
  const periodStart=v272DateOnly(period?.dateFrom),periodEnd=v272DateOnly(period?.dateTo);
  const relation=v272PeriodRelation(ev?.fechaIni,ev?.fechaFin,period?.dateFrom,period?.dateTo);
  const all=arr(bank?.movements).filter(x=>x?.included!==false).slice().sort((a,b)=>trim(a?.executedAt).localeCompare(trim(b?.executedAt))||trim(a?.id).localeCompare(trim(b?.id)));
  const evidence=all.filter(row=>v271BankMovementEvidence(row).length>0);
  // Política genérica de calidad: si sabemos que los periodos NO se solapan, evitamos mezclar
  // movimientos sin evidencia del evento. Si el solape es correcto usamos el ledger «En saldo».
  // Si las fechas no pueden validarse, conservamos la evidencia específica cuando existe y dejamos
  // la incertidumbre explícita en facts, sin convertir un fallo de parseo en «no solapa».
  const chosen=relation.status==='overlap'?all:(relation.status==='disjoint'?evidence:(evidence.length?evidence:all));
  const openingBalance=v26Money(summary?.openingBalance);
  let impact=0;
  const rows=chosen.map((x,index)=>{
    const amount=v26Money(x?.amount),type=amount>0?'INGRESO':amount<0?'CARGO':'NEUTRO';impact=v26Money(impact+amount);
    const dt=trim(x?.executedAt),isoDate=v272DateOnly(dt),short=isoDate?`${isoDate.slice(8,10)}/${isoDate.slice(5,7)}/${isoDate.slice(0,4)}${dt.length>10?' '+dt.slice(11,16):''}`:dt;
    const ledgerBalance=Number.isFinite(Number(x?.eventBalanceAfter))?v26Money(x.eventBalanceAfter):v26Money(openingBalance+impact);
    return {Orden:index+1,Momento:short||dt,Fecha:dt,Tipo:type,Movimiento:amount,'Impacto bancario acumulado':impact,'Saldo bancario del periodo':ledgerBalance,Concepto:trim(x?.description||x?.concept||x?.concepto),Evidencia:v271BankMovementEvidence(x).join(' + ')||(relation.status==='overlap'?'En saldo dentro del periodo configurado':'Sin evidencia específica')};
  });
  const incomes=v26Money(rows.filter(r=>r.Tipo==='INGRESO').reduce((a,r)=>a+num(r.Movimiento),0));
  const charges=v26Money(rows.filter(r=>r.Tipo==='CARGO').reduce((a,r)=>a+Math.abs(num(r.Movimiento)),0));
  let qualityIssue='';
  if(relation.status==='disjoint') qualityIssue=`El periodo bancario configurado (${periodStart||'?'} a ${periodEnd||'?'}) no solapa las fechas del evento (${eventStart||'?'} a ${eventEnd||'?'}). La cronología prioriza movimientos con evidencia específica del evento.`;
  else if(relation.status==='unknown') qualityIssue='No se ha podido validar de forma determinista el solape entre fechas del evento y periodo bancario. ControlEvent no interpreta esta incertidumbre como «no solapa» y conserva la evidencia disponible.';
  const closingBalance=rows.length?num(rows[rows.length-1]['Saldo bancario del periodo']):openingBalance;
  return{id:tool.id,name:tool.name,ok:true,title:`Cronología bancaria · ${rr.nombre}`,facts:{event:rr.nombre,event_start:eventStart,event_end:eventEnd,bank_period_start:periodStart,bank_period_end:periodEnd,bank_period_relation:relation.status,bank_period_relation_reason:relation.reason,bank_period_plausible:relation.status!=='disjoint',raw_included_movement_count:all.length,event_evidence_movement_count:evidence.length,timeline_movement_count:rows.length,opening_balance:openingBalance,closing_balance:v26Money(closingBalance),income_total_bank:incomes,charge_total_bank:charges,bank_impact:v26Money(rows.length?rows[rows.length-1]['Impacto bancario acumulado']:0),data_quality_note:qualityIssue||'Las fechas del evento y el periodo bancario se solapan. La cronología usa los movimientos «En saldo» configurados para el evento.',rendering_complete:true,chart_instruction:'Para SALDO BANCARIO usa la tabla balance_timeline con Momento como etiqueta y Saldo bancario del periodo como valor. Para IMPACTO/VARIACIÓN atribuida a los movimientos usa Impacto bancario acumulado, que parte de 0. Nunca presentes este impacto base 0 como saldo de la cuenta ni como saldo operativo del evento. Tipo sirve como marker_field.'},facts_schema:{timeline_movement_count:v26CountSchema('movimientos','Movimientos usados en la cronología'),opening_balance:v26MoneySchema('Saldo bancario al inicio del periodo del evento'),closing_balance:v26MoneySchema('Saldo bancario calculado al final de la cronología'),income_total_bank:v26MoneySchema('Abonos bancarios incluidos'),charge_total_bank:v26MoneySchema('Valor absoluto de cargos bancarios incluidos'),bank_impact:v26MoneySchema('Suma algebraica de los movimientos mostrados; variación, no saldo')},provenance:'ControlEvent · Cuadre Banco · cronología canónica',tables:[v26Table('balance_timeline',`Cronología bancaria · ${rr.nombre}`,rows,{Orden:v26CountSchema('movimientos'),Momento:v26TextSchema('Fecha/hora abreviada para eje X'),Fecha:v26DateSchema('Fecha/hora bancaria'),Tipo:v26StatusSchema('INGRESO, CARGO o NEUTRO'),Movimiento:v26MoneySchema('Movimiento bancario firmado'),'Impacto bancario acumulado':v26MoneySchema('Variación acumulada desde 0 de los movimientos mostrados; NO es saldo de cuenta'),'Saldo bancario del periodo':v26MoneySchema('Saldo del ledger bancario del evento, partiendo del saldo inicial del periodo'),Concepto:v26TextSchema('Concepto bancario'),Evidencia:v26TextSchema('Por qué el movimiento se considera del evento')})].filter(t=>t.rows.length)};
}

async function v261EventWeatherTool(tool,state,selectedEventId='',flowTrace=[]){
  const rr=v26ResolveEvent(state,selectedEventId,tool?.event,tool?.scope);if(!rr.ok)throw new Error(rr.error);
  const ev=rr.row||{};
  const ctx={eventosObjetivo:[{'Titulo del evento':rr.nombre,'fecha ini':trim(ev?.fechaIni),'fecha fin':trim(ev?.fechaFin)}]};
  const wx=await maybeFetchWeatherContext('',ctx,flowTrace,true);
  if(!wx?.ok)throw new Error(trim(wx?.reason)||'No se pudo obtener meteorología fiable para el evento.');
  const rows=arr(wx?.filas).filter(x=>!x?.Aviso).map(x=>({Evento:trim(x?.Evento),Localidad:trim(x?.Localidad),Día:trim(x?.Día),Fecha:trim(x?.Fecha),Cielo:trim(x?.Cielo),'Temp. máx':num(x?.['Temp. máx']),'Temp. mín':num(x?.['Temp. mín']),'Prob. lluvia %':num(x?.['Prob. lluvia %']),'Viento km/h':num(x?.['Viento km/h'])}));
  return{id:tool.id,name:tool.name,ok:true,title:`Meteorología · ${rr.nombre}`,facts:{event:rr.nombre,provider:trim(wx?.proveedor),location:trim(wx?.localidad),days:rows.length},tables:[v26Table('weather',`Meteorología · ${rr.nombre}`,rows,{Evento:v26TextSchema(),Localidad:v26TextSchema(),Día:v26TextSchema(),Fecha:v26DateSchema(),Cielo:v26TextSchema(),'Temp. máx':v26SchemaField('number','°C','Temperatura máxima'),'Temp. mín':v26SchemaField('number','°C','Temperatura mínima'),'Prob. lluvia %':v26SchemaField('percent','%','Probabilidad de lluvia'),'Viento km/h':v26SchemaField('number','km/h','Viento máximo')})]};
}

function v261AgentTools(){
  const eventArg={type:'string',description:'Nombre/título del evento. Omítelo cuando la conversación se refiera claramente al evento actualmente seleccionado.'};
  const scopeArg={type:'string',enum:['active_event','named_event','all_events'],description:'Ámbito. Usa active_event solo si la conversación realmente se refiere al evento de pantalla; named_event cuando indiques un evento; all_events para consulta global.'};
  const detailArg={type:'string',enum:['brief','standard','full'],description:'Cantidad de detalle que necesitas. standard por defecto; full solo si el usuario pide detalle exhaustivo.'};
  return [
    {type:'function',name:'event_dossier',description:'Obtiene el panorama canónico agregado de un evento: fechas, estado, ingresos, compras realizadas y pendientes, producto donado, saldo, valoración, asistencia y conteos de gestión. Es un buen punto de partida, pero no sustituye el detalle cuando necesites investigar anomalías, causas o matices.',parameters:{type:'object',properties:{event:eventArg,scope:scopeArg,detail:detailArg},required:['scope']}},
    {type:'function',name:'event_breakdowns',description:'Desglosa un evento por tienda, destino, segmento, producto y forma de pago. Separa comprado, donado y pendiente. Úsala para explicar en qué se gastó el dinero o qué recursos hubo.',parameters:{type:'object',properties:{event:eventArg,scope:scopeArg,detail:detailArg},required:['scope']}},
    {type:'function',name:'event_people',description:'Obtiene participantes/colaboradores e ingresos de un evento con criterio de asistencia canónica. Incluye número, forma/estado, importe obligatorio, voluntario y total por registro; úsala cuando necesites inspeccionar matices, ajustes o posibles anomalías de ingresos.',parameters:{type:'object',properties:{event:eventArg,scope:scopeArg,detail:detailArg},required:['scope']}},
    {type:'function',name:'event_documentation',description:'Comprueba evidencias documentales de un evento: justificantes de ingresos, fototickets de compra y documentos/adjuntos. No equivale a conciliación bancaria.',parameters:{type:'object',properties:{event:eventArg,scope:scopeArg,detail:detailArg},required:['scope']}},
    {type:'function',name:'event_management',description:'Obtiene Hitos y tareas LG de un evento, responsables, fechas, estado y notas. Úsala para responsabilidades y gestión.',parameters:{type:'object',properties:{event:eventArg,scope:scopeArg,detail:detailArg},required:['scope']}},
    {type:'function',name:'event_bank',description:'Obtiene el cuadre/conciliación bancaria de un evento: periodo, resumen, movimientos y vínculos con tickets/ingresos. Úsala para conciliación y documentación bancaria general.',parameters:{type:'object',properties:{event:eventArg,scope:scopeArg,detail:detailArg},required:['scope']}},
    {type:'function',name:'event_bank_timeline',description:'Obtiene la cronología bancaria del evento con saldo inicial, saldo bancario del periodo e impacto acumulado de los movimientos. Úsala cuando el usuario pregunte por banco, conciliación, movimientos, saldo bancario o evolución temporal. No es necesaria para un resumen gráfico general del evento.',parameters:{type:'object',properties:{event:eventArg,scope:scopeArg,detail:detailArg},required:['scope']}},
    {type:'function',name:'event_weather',description:'Obtiene meteorología para las fechas de un evento mediante la fuente externa configurada por ControlEvent.',parameters:{type:'object',properties:{event:eventArg,scope:scopeArg},required:['scope']}},
    {type:'function',name:'person_dossier',description:'Obtiene el dossier CANÓNICO completo de una persona o pareja: apariciones individuales/compuestas, participación, ingresos, compras bajo responsabilidad, donaciones, Hitos y tareas LG. La resolución de identidad es compartida por todas las herramientas personales. Si el usuario nombra personas concretas o las compara, esta es la fuente principal y debes llamar una vez por cada persona.',parameters:{type:'object',properties:{person:{type:'string',description:'Nombre o alias de la persona/pareja.'},detail:detailArg},required:['person']}},
    {type:'function',name:'participation_events',description:'Lista de forma ligera los eventos de una identidad personal CANÓNICA, incluyendo apariciones individuales y dentro de parejas. Usa la misma resolución que person_dossier.',parameters:{type:'object',properties:{person:{type:'string'},detail:detailArg},required:['person']}},
    {type:'function',name:'people_activity',description:'Exploración GLOBAL de implicación por personas canónicas: cada fila agrega el registro individual y las parejas donde aparece esa persona. Úsala para descubrir o clasificar personas cuando el usuario NO haya nombrado sujetos concretos. Si ya hay nombres concretos en la conversación, usa person_dossier para cada uno y no people_activity.',parameters:{type:'object',properties:{detail:detailArg}}},
    {type:'function',name:'store_purchases',description:'Obtiene compras de una tienda por evento, con ámbito y estado. Las donaciones no cuentan como compra realizada.',parameters:{type:'object',properties:{store:{type:'string'},scope:{type:'string',enum:['active_event','named_event','all_events']},event:eventArg,status:{type:'string',enum:['realized','pending','all']},include_empty:{type:'boolean'},detail:detailArg},required:['store','scope']}},
    {type:'function',name:'canonical_socios',description:'Obtiene los socios canónicos según el criterio ColtyLAB de ControlEvent.',parameters:{type:'object',properties:{detail:detailArg}}},
    {type:'function',name:'events_catalog',description:'Lista el catálogo de eventos con fechas, estado y precio. Úsala para resolver títulos o explorar qué eventos existen.',parameters:{type:'object',properties:{detail:detailArg}}},
    {type:'function',name:'events_overview',description:'Obtiene una matriz canónica de todos los eventos con ingresos, compras, donaciones, saldo, valoración y asistentes. Úsala para preguntas globales, tendencias, máximos, mínimos o para buscar eventos que cumplan una condición.',parameters:{type:'object',properties:{detail:detailArg}}},
    {type:'function',name:'compare_events',description:'Compara de forma homogénea dos o más eventos y calcula diferencias. Usa títulos aproximados; ControlEvent resuelve los eventos.',parameters:{type:'object',properties:{events:{type:'array',items:{type:'string'},description:'Dos o más títulos/nombres de eventos.'},detail:detailArg},required:['events']}}
  ];
}

function v261FinalSchema(){
  return {type:'object',properties:{
    title:{type:'string'},
    answer:{type:'string'},
    warnings:{type:'array',items:{type:'string'}},
    show_tables:{type:'array',items:{type:'object',properties:{tool_id:{type:'string'},table_key:{type:'string'}},required:['tool_id','table_key']}},
    charts:{type:'array',items:{type:'object',properties:{title:{type:'string'},type:{type:'string',enum:['bar','horizontalBar','pie','donut','line','stackedBar']},tool_id:{type:'string'},table_key:{type:'string'},label_field:{type:'string'},value_field:{type:'string'},series_fields:{type:'array',items:{type:'string'}},marker_field:{type:'string',description:'Campo categórico opcional para colorear marcadores en gráficas de línea, p. ej. Tipo=INGRESO/CARGO.'},unit:{type:'string'}},required:['title','type','tool_id','table_key','label_field']}}
  },required:['title','answer','warnings','show_tables','charts']};
}

function v261SystemInstruction(state,selectedEventId,{usuarioLogado,user,authUser,ce_acceso,clientNowIso,clientLocalDateTime,clientTimeZone}={}){
  const active=v26EventById(state,selectedEventId);const activeText=active?`${trim(active?.titulo)} (${trim(active?.situacion)||'sin estado'}, ${trim(active?.fechaIni)||'?'} a ${trim(active?.fechaFin)||'?'})`:'ninguno';
  const display=zuzuLoggedUserDisplayName({usuarioLogado:state?.usuarioLogado||state?.ce_acceso_usuario_logado||usuarioLogado||user||authUser||ce_acceso||null});
  const fallbackNow=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',dateStyle:'full',timeStyle:'medium'}).format(new Date());
  const localNow=trim(clientLocalDateTime).slice(0,120)||fallbackNow;
  const tz=trim(clientTimeZone).slice(0,80)||'Europe/Madrid';
  const utcNow=trim(clientNowIso).slice(0,80)||new Date().toISOString();
  return `Eres Zuzu, el asistente conversacional y analista de ControlEvent v27_prod_1.2. Hablas en español natural con ${display}.\n\nPRINCIPIO DE ARQUITECTURA:\n- TÚ mantienes la conversación, resuelves pronombres y elipsis a partir del historial de esta Interaction, interpretas la intención, decides qué herramientas necesitas, analizas sus resultados y redactas la respuesta.\n- ControlEvent NO interpreta por ti la conversación: solo ejecuta las herramientas que solicites y te devuelve hechos canónicos.\n- Las herramientas pueden incluir facts_schema y schema de tablas: son la definición semántica de cada cifra. No uses dos magnitudes como si significaran lo mismo solo porque su aritmética encaje.\n- El evento actualmente visible es SOLO contexto ambiental: ${activeText}. No cambies el tema hacia él si el hilo actual trata de otra persona, comparación, documento o evento.\n\nCONTEXTO TEMPORAL FIABLE:\n- Fecha y hora local del usuario al iniciar este turno: ${localNow}. Zona horaria informada: ${tz}. Referencia UTC: ${utcNow}.\n- Si preparas un informe con fecha de emisión, usa esta fecha/hora actual. No confundas la fecha de emisión con las fechas del evento y no inventes fechas.\n\nREGLAS DE INTELIGENCIA:\n- Responde exactamente a lo que el usuario intenta saber, no a una plantilla. Integra los turnos anteriores: si antes comparaste participación y luego responsabilidades, una pregunta sobre «implicación» debe considerar lo ya aprendido y pedir más datos si los necesitas.\n- Ante preguntas abiertas, evaluativas, de anomalías, conclusiones, riesgos, matices o informes ejecutivos, INVESTIGA antes de concluir. Un resumen agregado puede servir para orientarte, pero no basta para afirmar que «todo está bien» si existen herramientas con detalle relevante. Decide tú qué herramientas consultar y encadena más de una ronda si la evidencia inicial no es suficiente.\n- PROACTIVIDAD: cuando analices un evento por primera vez, revisa las income_attention_signals que ya aporta event_dossier. Si hay señales materiales, menciónalas en ESA PRIMERA RESPUESTA con su explicación respaldada y, si hace falta detalle, consulta event_people en la misma interacción. No esperes a que el usuario te diga «mira más», «husmea» o «¿no ves nada raro?». Si aparece una casuística nueva no contemplada, investígala con las herramientas disponibles y explica qué hecho te llama la atención y qué falta para cerrarla.\n- En informes para Dirección, revisiones de riesgos o cuando el usuario pregunte qué exige actuación, no declares «sin incidencias», «impecable», «éxito operativo» o equivalente solo por tener saldo positivo o tareas cerradas. Si puede cambiar la conclusión, consulta documentación, gestión y conciliación bancaria además del dossier económico antes de cerrar el juicio.\n- En seguimientos y comparaciones, no repitas listados extensos que ya aparecieron en el turno anterior salvo que el usuario los pida: sintetiza la diferencia nueva y reutiliza el contexto de la Interaction.\n- Si una herramienta devuelve datos truncados y la conclusión depende del conjunto completo, solicita más detalle o una herramienta más adecuada antes de concluir.\n- No repitas herramientas si el historial de la Interaction ya contiene hechos suficientes y siguen siendo aplicables al hilo actual.\n- IDENTIDAD PERSONAL CANÓNICA: si el usuario nombra una o varias personas concretas, usa person_dossier para cada una. Esa herramienta integra automáticamente sus registros individuales y las parejas donde aparece. people_activity es para exploración global cuando todavía no hay sujetos concretos; no la uses para sustituir un dossier nominal.\n- Si dos herramientas personales muestran representaciones distintas, prevalece la identidad canónica y sus canonical_representations; no presentes la pareja y el individuo como identidades incompatibles ni cambies cifras entre turnos sin volver a consultar la fuente canónica.\n- Pregunta para aclarar solo cuando exista una ambigüedad real que no puedas resolver razonablemente con el historial o las herramientas.\n- Puedes opinar, destacar, comparar, detectar anomalías y recomendar basándote en datos. Una opinión debe explicar brevemente qué hechos la sustentan.\n- No inventes causas, éxitos, objetivos, conciliaciones ni relaciones no aportadas por ControlEvent.\n- No muestres SQL, nombres internos de columnas ni detalles de implementación.\n\nPROCEDENCIA Y GRADO DE CERTEZA:\n- Los resultados de herramientas de ControlEvent son HECHOS CANÓNICOS de la aplicación.\n- Lo que el usuario te explique o corrija durante la conversación es CONTEXTO APORTADO POR EL USUARIO: úsalo para interpretar y continuar, pero no lo conviertas en una regla general, política interna o dato persistente salvo que una herramienta lo confirme.\n- Lo que deduzcas a partir de hechos es una INFERENCIA. Exprésala con naturalidad como interpretación («esto sugiere...», «con estos datos...»), no como hecho almacenado.\n- Una HIPÓTESIS causal («quizá se compensó con...», «podría deberse a...») debe presentarse como posibilidad y debes decir si ControlEvent NO contiene un vínculo que la demuestre. No uses «la explicación más probable» salvo que los hechos aporten evidencia comparativa suficiente. Coincidencia de importes, nombres, fechas o proveedores no demuestra causalidad.\n- No conviertas una inferencia o una aclaración del usuario en «política interna», «acuerdo oficial» o regla persistente si una herramienta no lo confirma.\n- Si rehaces un informe a partir de una aclaración del usuario, atribuye esa interpretación de forma natural («según lo que me acabas de aclarar...») cuando sea relevante.\n\nHECHOS CANÓNICOS DE CONTROLEVENT:\n- Saldo operativo y valoración son conceptos distintos.\n- VALORACIÓN DEL EVENTO = COMPRAS REALIZADAS + VALOR DEL PRODUCTO DONADO. Nunca uses saldo + donaciones ni añadas Pte.Compra a la valoración.\n- Donaciones de producto no son salida de caja.\n- Compras pendientes no son compras realizadas.\n- Una persona puede aparecer dentro de una pareja; la herramienta personal resuelve esa relación y distingue importes individuales de los de la entidad compuesta.\n- Dinero: formato español y siempre dos decimales, p. ej. 1.234,56 €. Recuentos, personas, eventos, unidades, años, fechas y porcentajes NO son euros.\n- SEMÁNTICA DE INGRESOS: income_members es ingreso REAL de filas SOCIO después de sus ajustes; income_mandatory es el componente obligatorio teórico de filas SOCIO antes de ajustes; income_voluntary suma aportaciones/ajustes voluntarios de todos los registros y puede incluir no socios y negativos. Nunca atribuyas una diferencia entre estos agregados a una persona o rango por mera resta: consulta event_people.\n- REGLA DE CUOTA SOCIO: Importe obligatorio = Número × precio del evento. Número 2 suele representar una pareja completa, 1 una persona y 0 elimina la cuota obligatoria. Número 0 NO significa automáticamente que no asistieron: la asistencia canónica puede confirmarse por la situación registrada (Banco/Efectivo/Bizum/Exento/etc.).\n- EXENCIONES: si un SOCIO/pareja aparece con asistencia confirmada, Número 0 e importe total 0, trátalo como una exención o cuota cero, no como un error matemático. Cuando la misma entidad aporta en ese evento producto donado por un valor igual o superior a su cuota estándar completa, ControlEvent considera ese patrón coherente con una exención por aportación en especie. Si solo existe un historial fuerte de donaciones pero no una aportación suficiente en ese evento, preséntalo como patrón compatible, no como causa demostrada.\n- PRECIOS CONVENIDOS: un Importe voluntario negativo en un SOCIO es el mecanismo operativo de ControlEvent para rebajar la cuota estándar calculada. Se utiliza para precios convenidos por asistencia parcial u otras circunstancias de conveniencia. Señala el ajuste desde la primera revisión; si no existe nota/contexto que concrete la causa, di que el patrón es compatible con un precio convenido y no inventes el motivo exacto.\n- DEVOLUCIONES/CORRECCIONES: los apuntes negativos realizados mediante entidades técnicas z_DEV (por ejemplo una entidad de corrección de ingresos) reducen ingresos previamente registrados y pueden representar devoluciones. Si existe evidencia que vincula la corrección a una persona/pareja, explica «pagó y posteriormente se devolvieron X € mediante un apunte corrector». Si no existe ese vínculo, señala la corrección pero NO atribuyas el beneficiario por simple coincidencia de importes.\n- Si una fila tiene importe total 0 y la situación dice Banco/Efectivo/Bizum, no redactes «pagó 0 € por Banco»: di «situación/forma registrada: Banco» o equivalente.\n- Una igualdad aritmética no autoriza por sí sola a reclasificar un ingreso, una donación o un pago entre categorías. Para explicar una discrepancia, exige coincidencia semántica o detalle por registro.\n\nREDACCIÓN Y VOZ:\n- Escribe como una IA moderna: directa, fluida, contextual y con capacidad de síntesis. Evita repetir «el evento», «esa persona» u otras muletillas.\n- Evita entusiasmo artificial («éxito rotundo», «genial») salvo que el usuario lo pida o los datos lo justifiquen claramente.\n- En prosa prefiere «registros de compra» en vez de «líneas de compra», y «tareas LG» en vez de «líneas de gestión», porque algunos sintetizadores pronuncian mal «líneas».\n- No repitas una respuesta anterior cuando el usuario pide que expliques «a qué te refieres»: desarrolla el punto concreto que causó la pregunta.\n- No cierres cada turno con una coletilla fija ni con «pregúntame lo que quieras»; conversa con naturalidad y termina cuando la respuesta esté completa.\n- Antes de entregar el JSON final, relee silenciosamente la respuesta: corrige erratas, concordancias, palabras duplicadas y signos de puntuación extraños sin alterar los hechos.\n- Las señales internas de validación, auditoría o autocorrección de ControlEvent son invisibles para el usuario. Nunca digas «ControlEvent ha identificado un dato no respaldado», «gracias por la verificación», «procedo a corregir» ni describas una revisión interna salvo que el usuario pregunte explícitamente por la traza. Entrega directamente la respuesta ya corregida.\n\nPRESENTACIÓN:\n- answer es la respuesta principal y debe poder entenderse por sí sola.\n- Elige tablas solo si aportan valor. show_tables NO es una función ni una herramienta: es un campo del JSON final. Rellénalo con tool_id = id de la llamada de herramienta y table_key = key de la tabla devuelta.\n- charts TAMPOCO es una función/herramienta: es un campo del JSON final que ControlEvent renderiza realmente. NUNCA digas que no puedes generar gráficas, ni intentes llamar a show_tables o charts como funciones. Para crear una gráfica: solicita los datos necesarios mediante herramientas reales y después rellena charts con referencias a sus tablas.\n- Si el usuario pide una gráfica en un turno de seguimiento, vuelve a solicitar en ESE MISMO TURNO las herramientas de datos necesarias para la visualización, aunque recuerdes los valores de turnos anteriores: el renderizador necesita tool_id y table_key del resultado actual.\n- Las tablas economics_chart, attendance_chart, management_chart y documentation_chart están preparadas expresamente para gráficas; event_breakdowns ofrece además stores, destinations, segments y products.\n- Puedes proponer gráficas aunque el usuario no diga literalmente «gráfica» si ayudan de verdad. Evita gráficas constantes o de una sola categoría.\n- Si el usuario pide una respuesta eminentemente gráfica, DEBES devolver al menos una especificación válida en charts y, si hay datos para ello, varias gráficas útiles con una síntesis breve. No describas una gráfica hipotética: pide datos y genera la especificación para que ControlEvent la dibuje.\n- Una petición de gráfica es una ORDEN DE EJECUCIÓN, no una invitación a preguntar cómo hacerla. Elige la representación razonable y genérala directamente. Si el usuario especifica tipo, variables o marcadores, respétalos. No preguntes «¿quieres que la genere?» después de haber recibido ya la petición.\n- Para una petición genérica de «datos más importantes», «resumen gráfico» o equivalente, prioriza event_dossier y sus tablas economics_chart, attendance_chart y management_chart. No añadas una cronología bancaria salvo que el usuario pregunte por banco, saldo bancario, conciliación, movimientos o evolución temporal.
- Para evolución de SALDO BANCARIO usa event_bank_timeline y grafica Momento frente a Saldo bancario del periodo. Para analizar el IMPACTO/VARIACIÓN de los movimientos atribuibles al evento usa Impacto bancario acumulado, que parte de 0. Nunca llames «saldo» a esa variación base 0 ni la confundas con el saldo operativo del evento. Tipo puede usarse como marker_field. Los marcadores INGRESO se muestran en verde y CARGO en rojo.\n- En event_bank_timeline, el payload que ves puede recortar filas para ahorrar tokens, pero rendering_complete=true significa que el renderizador de ControlEvent conserva la tabla completa. NO rechaces una gráfica por ver truncated=true en esa tabla; referencia la tabla y ControlEvent dibujará todos los puntos disponibles.\n- No escribas tablas Markdown dentro de answer. Si una tabla aporta valor, usa show_tables; answer debe ser prosa limpia para pantalla, PDF y voz.\n- No digas «ControlEvent ha recuperado los datos» como sustituto de una respuesta.\n\nDevuelve el resultado final usando el JSON estructurado solicitado por la API.`;
}

function v261UsageSmall(payload,model=''){
  const u=payload?.usage||{};
  const mapped={promptTokenCount:u.total_input_tokens??0,candidatesTokenCount:u.total_output_tokens??0,totalTokenCount:u.total_tokens??0};
  const base=usageSmall(mapped,model);
  base.thoughtTokens=num(u.total_thought_tokens);base.toolUseTokens=num(u.total_tool_use_tokens);base.cachedTokens=num(u.total_cached_tokens);
  return base;
}

function v261OutputText(payload){
  return arr(payload?.steps).filter(s=>s?.type==='model_output').flatMap(s=>arr(s?.content)).filter(c=>c?.type==='text').map(c=>text(c?.text)).join('\n').trim();
}
function v261FunctionCalls(payload){return arr(payload?.steps).filter(s=>s?.type==='function_call'&&trim(s?.name)&&trim(s?.id));}
function v261ParseFinal(payload){
  const raw=v261OutputText(payload);if(!raw)return{title:'Respuesta de Zuzu',answer:'',warnings:[],showTables:[],chartSpecs:[]};
  try{
    const parsed=parsePlanJsonLenientHf37(raw).parsed||{};
    return{title:trim(parsed?.title)||'Respuesta de Zuzu',answer:trim(parsed?.answer),warnings:arr(parsed?.warnings).map(trim).filter(Boolean).slice(0,8),showTables:arr(parsed?.show_tables||parsed?.showTables).slice(0,8),chartSpecs:arr(parsed?.charts||parsed?.chart_specs||parsed?.chartSpecs).slice(0,8)};
  }catch(_){return{title:'Respuesta de Zuzu',answer:raw,warnings:[],showTables:[],chartSpecs:[]};}
}

function v261CompactToolResult(result,detail='standard'){
  const limit=detail==='full'?160:detail==='brief'?18:60;
  const tables=arr(result?.tables).map(t=>({key:t.key,title:t.title,schema:t.schema,rows:arr(t.rows).slice(0,limit),row_count:arr(t.rows).length,truncated:arr(t.rows).length>limit}));
  return{id:trim(result?.id),name:trim(result?.name),ok:result?.ok!==false,title:trim(result?.title),provenance:trim(result?.provenance)||'ControlEvent · datos estructurados',facts:result?.facts||{},facts_schema:result?.facts_schema||{},tables};
}

async function v261ExecuteAgentTool(call,state,selectedEventId,flowTrace=[]){
  const args=(call?.arguments&&typeof call.arguments==='object')?call.arguments:{};
  const tool={id:trim(call?.id),name:trim(call?.name),...args};
  if(!tool.scope && tool.event)tool.scope='named_event';
  if(['event_dossier','event_breakdowns','event_people','event_documentation','event_management','event_bank','event_bank_timeline','event_weather','store_purchases'].includes(tool.name) && !tool.scope){
    throw new Error('Falta el scope de la herramienta. Gemini debe decidir si el ámbito es active_event, named_event o all_events; ControlEvent no elegirá por defecto el evento de pantalla.');
  }
  if(tool.name==='event_management')return v261EventManagementTool(tool,state,selectedEventId);
  if(tool.name==='event_bank')return v261EventBankTool(tool,state,selectedEventId);
  if(tool.name==='event_bank_timeline')return v271EventBankTimelineTool(tool,state,selectedEventId);
  if(tool.name==='event_weather')return v261EventWeatherTool(tool,state,selectedEventId,flowTrace);
  return v26ExecuteTool(tool,state,selectedEventId);
}

async function v261CallInteraction({input,previousInteractionId='',model,systemInstruction,tools,flowTrace=[],stage='Gemini',toolChoice='auto'}){
  const apiKey=geminiKey();if(!apiKey){const e=new Error('Falta GEMINI_API_KEY para Zuzu.');e.status=503;throw e;}
  const body={model,input,system_instruction:systemInstruction,tools,response_format:{type:'text',mime_type:'application/json',schema:v261FinalSchema()},generation_config:{thinking_level:'medium',thinking_summaries:'none',max_output_tokens:6000,tool_choice:toolChoice},store:true};
  if(trim(previousInteractionId))body.previous_interaction_id=trim(previousInteractionId);
  const url='https://generativelanguage.googleapis.com/v1/interactions';
  let res,payload;
  try{({res,payload}=await geminiFetchJsonWithTimeout(url,body,apiKey,Number(process.env.CONTROLEVENT_ZUZU_INTERACTIONS_TIMEOUT_MS||45000)));}
  catch(error){zuzuTracePush(flowTrace,stage,'KO',cleanGeminiError(error));throw error;}
  const usage=v261UsageSmall(payload,model);
  if(!res.ok){const e=new Error(payload?.error?.message||`Gemini Interactions HTTP ${res.status}`);e.status=res.status;e.details=payload;zuzuTracePush(flowTrace,stage,'KO',cleanGeminiError(e),{model,usage});throw e;}
  const status=trim(payload?.status)||'completed';
  zuzuTracePush(flowTrace,stage,status==='failed'?'KO':'OK',`Interactions ${status}; pasos=${arr(payload?.steps).length}; id=${trim(payload?.id).slice(0,48)}.`,{model,usage});
  if(['failed','cancelled','budget_exceeded'].includes(status)){const e=new Error(payload?.error?.message||`Gemini Interactions terminó con estado ${status}.`);e.status=502;e.details=payload;throw e;}
  return payload;
}

function v261PreviousIdFailure(error){return [400,404].includes(Number(error?.status))&&/(previous|interaction|not found|invalid|expired|predecessor)/i.test(text(error?.message)+' '+JSON.stringify(error?.details||{}));}
function v261EmergencyConversationInput(userPrompt,conversationHistory=[]){
  const hist=arr(conversationHistory).slice(-6).map(x=>`Usuario: ${trim(x?.user).slice(0,700)}\nZuzu: ${trim(x?.assistant).slice(0,1000)}`).join('\n\n');
  return hist?`Se ha perdido el identificador técnico de la conversación anterior. Reconstruye el contexto SOLO a partir de estos últimos turnos y continúa con naturalidad; no los repitas al usuario.\n\n${hist}\n\nNUEVO MENSAJE DEL USUARIO:\n${userPrompt}`:userPrompt;
}

function v261ConversationMoneyValues(conversationHistory=[]){
  const vals=[];const re=/-?(?:\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,4})?|\d+(?:[.,]\d{1,4})?)\s*(?:€|euros?)/gi;
  for(const h of arr(conversationHistory).slice(-8)){const txt=trim(h?.assistant);let m;while((m=re.exec(txt))){const n=round(v26ParseLocalizedDisplayNumber(m[0]),2);if(Number.isFinite(n))vals.push(n);}re.lastIndex=0;}
  return[...new Set(vals)];
}
function v261UnsupportedMoneyWithConversation(answer,results,conversationHistory=[]){
  const known=[...new Set([...v26KnownMoneyValues(results),...v261ConversationMoneyValues(conversationHistory)])];if(!known.length)return[];
  const out=[],txt=text(answer),re=/-?(?:\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,4})?|\d+(?:[.,]\d{1,4})?)\s*(?:€|euros?)/gi;let m;
  while((m=re.exec(txt))){const n=round(v26ParseLocalizedDisplayNumber(m[0]),2);if(!Number.isFinite(n))continue;if(!known.some(v=>Math.abs(v-n)<0.011))out.push(n);}
  return[...new Set(out)];
}
function v261ObjectiveIssues(final,results,conversationHistory=[]){
  const issues=[];const answer=trim(final?.answer);
  // En una conversación con estado, un importe válido puede proceder de un turno anterior y no
  // reaparecer en las herramientas del turno actual. Por eso el auditor usa también las cifras ya
  // entregadas al usuario en el hilo, evitando falsos RETRY que luego contaminaban la conversación.
  const unsupported=v261UnsupportedMoneyWithConversation(answer,results,conversationHistory);if(unsupported.length)issues.push(`Hay importes que no aparecen ni en los hechos canónicos de este turno ni en los turnos previos validados: ${unsupported.map(v26FormatEuro).join(', ')}.`);
  if(/valoraci[oó]n[^.]{0,120}(?:saldo[^.]{0,40}(?:donaci|producto)|(?:donaci|producto)[^.]{0,40}saldo)/i.test(answer))issues.push('La valoración del evento no puede calcularse con saldo + donaciones. Fórmula canónica: compras realizadas + valor del producto donado.');
  const bankTimeline=arr(results).find(r=>r?.ok&&r?.name==='event_bank_timeline');
  const relation=trim(bankTimeline?.facts?.bank_period_relation),normalizedAnswer=norm(answer);
  if(relation==='overlap'&&(/\bno\s+(?:se\s+)?solap/.test(normalizedAnswer)||/\bno\s+abarca/.test(normalizedAnswer)||/\bfuera\s+del\s+periodo/.test(normalizedAnswer)))issues.push('Las fechas canónicas indican que el periodo bancario sí solapa el periodo del evento; no afirmes lo contrario.');
  if(relation==='disjoint'&&(/\bsi\s+(?:se\s+)?solap/.test(normalizedAnswer)||/\babarca\s+las\s+fechas/.test(normalizedAnswer)||/\besta\s+dentro\s+del\s+periodo/.test(normalizedAnswer)))issues.push('Las fechas canónicas indican que el periodo bancario no solapa el periodo del evento; no afirmes que sí.');
  return issues;
}

async function runZuzuV261InteractionsAgent({userPrompt,state,selectedEventId,flowTrace=[],previousInteractionId='',conversationHistory=[],usuarioLogado,user,authUser,ce_acceso,clientNowIso,clientLocalDateTime,clientTimeZone}){
  const model=v261InteractionModel(),tools=v261AgentTools(),systemInstruction=v261SystemInstruction(state,selectedEventId,{usuarioLogado,user,authUser,ce_acceso,clientNowIso,clientLocalDateTime,clientTimeZone});
  let currentId=trim(previousInteractionId),payload;
  const cache=new Map(),allResults=[];
  const initialInput=userPrompt;
  try{payload=await v261CallInteraction({input:initialInput,previousInteractionId:currentId,model,systemInstruction,tools,flowTrace,stage:'V27.1.2 · Gemini conversación'});}
  catch(error){
    if(currentId&&v261PreviousIdFailure(error)){
      zuzuTracePush(flowTrace,'V27.1.2 · Recuperación de conversación','WARN','El previous_interaction_id ya no es válido. Gemini reconstruirá el hilo con los últimos turnos guardados por el navegador.');
      currentId='';payload=await v261CallInteraction({input:v261EmergencyConversationInput(userPrompt,conversationHistory),model,systemInstruction,tools,flowTrace,stage:'V27.1.2 · Gemini conversación recuperada'});
    }else throw error;
  }
  currentId=trim(payload?.id)||currentId;
  for(let cycle=1;cycle<=6;cycle++){
    const calls=v261FunctionCalls(payload);
    if(!calls.length)break;
    zuzuTracePush(flowTrace,`V27.1.2 · Herramientas · ronda ${cycle}`,'OK',`Gemini solicitó ${calls.length} herramienta(s): ${calls.map(c=>trim(c.name)).join(', ')}.`);
    const functionResults=await Promise.all(calls.map(async call=>{
      const args=(call?.arguments&&typeof call.arguments==='object')?call.arguments:{};const key=`${trim(call.name)}:${JSON.stringify(args)}`;
      try{
        let full=cache.get(key);if(!full){full=await v261ExecuteAgentTool(call,state,selectedEventId,flowTrace);cache.set(key,full);}else{full={...full,id:trim(call.id),name:trim(call.name)};}
        full={...full,id:trim(call.id),name:trim(call.name)};allResults.push(full);
        const compact=v261CompactToolResult(full,trim(args?.detail)||'standard');
        zuzuTracePush(flowTrace,`V27.1.2 · Tool ${trim(call.name)}`,'OK',`${trim(full?.title)||'Resultado'}; tablas=${arr(full?.tables).length}.`);
        return{type:'function_result',name:trim(call.name),call_id:trim(call.id),result:compact};
      }catch(error){
        const msg=cleanGeminiError(error);zuzuTracePush(flowTrace,`V27.1.2 · Tool ${trim(call.name)}`,'WARN',msg);
        return{type:'function_result',name:trim(call.name),call_id:trim(call.id),is_error:true,result:{ok:false,error:msg}};
      }
    }));
    payload=await v261CallInteraction({input:functionResults,previousInteractionId:currentId,model,systemInstruction,tools,flowTrace,stage:`V27.1.2 · Gemini tras herramientas ${cycle}`});
    currentId=trim(payload?.id)||currentId;
  }
  if(v261FunctionCalls(payload).length){const e=new Error('Gemini solicitó más rondas de herramientas de las permitidas para una sola consulta.');e.status=502;throw e;}
  let final=v261ParseFinal(payload);
  if(!trim(final.answer)){
    const e=new Error('Gemini terminó la interacción sin una respuesta final legible.');e.status=502;throw e;
  }
  const issues=v261ObjectiveIssues(final,allResults,conversationHistory);
  if(issues.length){
    zuzuTracePush(flowTrace,'V27.1.2 · Auditor factual','RETRY',issues.join(' '));
    const repairInput=`REVISIÓN INTERNA SILENCIOSA DEL BORRADOR. Corrige estos puntos objetivos antes de entregar la respuesta final:\n- ${issues.join('\n- ')}\n\nConserva la intención, el razonamiento y el tono. No inventes datos. MUY IMPORTANTE: esta revisión es una instrucción interna; no menciones al usuario que hubo verificación, auditoría, corrección, dato no respaldado ni este mensaje. Devuelve directamente el JSON final ya corregido.`;
    payload=await v261CallInteraction({input:repairInput,previousInteractionId:currentId,model,systemInstruction,tools,flowTrace,stage:'V27.1.2 · Gemini corrección factual',toolChoice:'none'});
    currentId=trim(payload?.id)||currentId;final=v261ParseFinal(payload);
    const remaining=v261ObjectiveIssues(final,allResults,conversationHistory);if(remaining.length){zuzuTracePush(flowTrace,'V27.1.2 · Auditor factual','WARN',`Gemini mantiene ${remaining.length} incidencia(s) objetiva(s); se informa sin sustituir su respuesta: ${remaining.join(' ')}`);final.warnings=arr(final.warnings).concat(remaining);}
    else zuzuTracePush(flowTrace,'V27.1.2 · Auditor factual','OK','Gemini corrigió los hechos señalados; ControlEvent no redactó una respuesta alternativa.');
  }else zuzuTracePush(flowTrace,'V27.1.2 · Auditor factual','OK','No se detectan importes no respaldados ni una fórmula de valoración incorrecta.');
  final={...final,answer:v26PolishNarrative(v26FormatNarrativeMoney(final.answer,allResults))};
  const chartIntent=v272ConversationRequestsCharts(userPrompt,conversationHistory);
  let presentation=v26BuildPresentation(final,allResults,userPrompt,{wantsCharts:chartIntent});
  if(v272AnswerClaimsChart(final.answer)&&!presentation.charts.length){
    zuzuTracePush(flowTrace,'V27.1.2 · Auditor de presentación','RETRY','La redacción afirma que hay una gráfica, pero el renderizador no ha podido materializar ninguna.');
    const repairPresentation=`REVISIÓN INTERNA SILENCIOSA DE PRESENTACIÓN. Tu borrador afirma que hay una gráfica visible, pero ControlEvent no ha podido materializar ninguna con las referencias actuales. Reescribe SOLO la parte de presentación para no prometer una gráfica inexistente. Conserva intactos los hechos, cifras, conclusión y tono; no menciones esta revisión interna. Devuelve el JSON final.`;
    payload=await v261CallInteraction({input:repairPresentation,previousInteractionId:currentId,model,systemInstruction,tools,flowTrace,stage:'V27.1.2 · Gemini corrección de presentación',toolChoice:'none'});
    currentId=trim(payload?.id)||currentId;final=v261ParseFinal(payload);
    final={...final,answer:v26PolishNarrative(v26FormatNarrativeMoney(final.answer,allResults))};
    presentation=v26BuildPresentation(final,allResults,userPrompt,{wantsCharts:chartIntent});
  }
  const files=[];
  for(const t of presentation.tables.slice(0,6)){
    const objs=t.rows.map(r=>Object.fromEntries(t.columns.map((c,i)=>[c,r[i]])));
    files.push({filename:fileSafe(`${t.title}_v27_prod_1.2.csv`),mime:'text/csv;charset=utf-8',content:csvFromRows(t.columns,objs)});
  }
  const answer=trim(final.answer);
  if(chartIntent&&!presentation.charts.length){
    zuzuTracePush(flowTrace,'V27.1.2 · Presentación gráfica','WARN','La intención conversacional pedía una gráfica, pero ninguna tabla numérica compatible pudo materializarse como visualización.');
  }
  zuzuTracePush(flowTrace,'V27.1.2 · Presentación','OK',`Gemini dirigió la jugada. Herramientas ejecutadas=${allResults.length}; tablas mostradas=${presentation.tables.length}; gráficas=${presentation.charts.length}; intención gráfica=${chartIntent?'sí':'no'}.`);
  return{ok:true,rejected:false,title:final.title||'Respuesta de Zuzu',answer,warnings:arr(final.warnings),charts:presentation.charts,tables:presentation.tables,files,provider:'gemini-interactions-v27-prod-1.2',model,interactionId:currentId,meta:{generatedAt:new Date().toISOString(),version:'v27_prod_1.2',architecture:'Usuario -> Gemini Interactions (estado nativo) -> Gemini elige herramientas -> ControlEvent ejecuta hechos canónicos -> Gemini razona/redacta -> ControlEvent verifica hechos/presenta',interactionId:currentId,tools:[...new Set(allResults.map(r=>trim(r?.name)).filter(Boolean))],geminiUsageEstimate:summarizeGeminiUsageFromTrace(flowTrace),debugTrace:arr(flowTrace).slice(0,120)},debugTrace:arr(flowTrace).slice(0,120),showDebugTrace:true};
}

async function runZuzuSemanticAgent({userPrompt,state,selectedEventId,flowTrace=[]}){
  let plan;
  try{plan=await callGeminiSemanticPlanner(userPrompt,state,selectedEventId,flowTrace);}catch(error){return{ok:true,rejected:true,title:'No puedo interpretar la consulta con garantías',answer:`Gemini no ha podido construir un plan semántico fiable. ${friendlyZuzuErrorMessage(error)}`,warnings:[cleanGeminiError(error)],charts:[],tables:[],files:[],provider:'zuzu-semantic-agent-planner-error',model:'',debugTrace:flowTrace,showDebugTrace:true};}
  if(plan.action==='clarify')return{ok:true,rejected:false,title:'Necesito concretar una cosa',answer:plan.clarification,warnings:[],charts:[],tables:[],files:[],provider:'zuzu-semantic-agent-clarification',model:plan.model||'',debugTrace:flowTrace,showDebugTrace:true};
  const allResults=[]; const allQueries=[]; let currentQueries=plan.queries; let roundsExecuted=0;
  for(let round=1;round<=3;round++){
    const prep=semanticPlanWithResolvedQueries({queries:currentQueries},state,selectedEventId);
    if(prep.error){zuzuTracePush(flowTrace,`Paso 2.${round} · Resolución de entidades`,'KO',prep.error);return{ok:true,rejected:false,title:'Necesito concretar una entidad',answer:`${prep.error} Prefiero preguntarlo antes que devolverte un cero falso.`,warnings:[],charts:[],tables:semanticPresentation(allResults,userPrompt).tables,files:semanticPresentation(allResults,userPrompt).files,provider:'zuzu-semantic-agent-entity-clarification',model:plan.model||'',debugTrace:flowTrace,showDebugTrace:true};}
    zuzuTracePush(flowTrace,`Paso 2.${round} · Resolución de entidades`,'OK',prep.resolved.length?`Resueltas: ${prep.resolved.map(x=>`${x.field||x.type}:${x.nombre}`).join(' · ')}`:'No había entidades humanas que resolver.');
    const ids=new Set(allQueries.map(q=>q.id)); const built=prep.built.filter(q=>!ids.has(q.id)); if(!built.length)break;
    roundsExecuted=round; allQueries.push(...built); const batch=await semanticExecuteQueries(built,flowTrace); allResults.push(...batch);
    if(round>=3)break;
    const review=await callGeminiSemanticReviewer(userPrompt,plan,allResults,round,flowTrace);
    if(review.status==='clarify')return{ok:true,rejected:false,title:'Necesito una aclaración',answer:review.clarification||review.reason,warnings:[],charts:[],tables:semanticPresentation(allResults,userPrompt).tables,files:semanticPresentation(allResults,userPrompt).files,provider:'zuzu-semantic-agent-review-clarification',model:review.model||plan.model||'',debugTrace:flowTrace,showDebugTrace:true};
    if(review.status!=='more'||!review.additionalQueries.length)break;
    currentQueries=review.additionalQueries;
  }
  const presentation=semanticPresentation(allResults,userPrompt);
  let final;
  try{
    final=await callGeminiSemanticFinal(userPrompt,plan,allResults,flowTrace);
  }catch(error){
    try{
      final=await callGeminiSemanticFinalText(userPrompt,plan,allResults,flowTrace);
      final.warnings=arr(final.warnings);
    }catch(error2){
      const fb=semanticFallbackAnswer(allResults);
      final={...fb,chartSpecs:[],model:'',warnings:arr(fb.warnings).concat(friendlyZuzuErrorMessage(error2||error))};
    }
  }
  const charts=semanticBuildCharts(final.chartSpecs,allResults,userPrompt,plan);
  const displayName=zuzuLoggedUserDisplayName({usuarioLogado:state?.usuarioLogado||state?.ce_acceso_usuario_logado||null});
  const answer=`${trim(final.answer)}\n\n${displayName}, soy tu amigo Zuzu, pregúntame lo que quieras.`;
  zuzuTracePush(flowTrace,'Paso 5 · ControlEvent presenta','OK',`Tablas=${presentation.tables.length}; gráficas=${charts.length}; conjuntos de datos=${allResults.length}.`);
  return{ok:true,rejected:false,title:final.title,answer,warnings:arr(final.warnings),charts,tables:presentation.tables,files:presentation.files,provider:'gemini-semantic-agent-control-event',model:final.model||plan.model||'',meta:{generatedAt:new Date().toISOString(),version:'v27_prod_1.2',architecture:'Prompt -> Gemini plan semántico -> CE resuelve entidades/crea SELECT -> CE ejecuta -> Gemini revisa/pide más -> Gemini sintetiza -> CE valida/presenta',plannerModel:plan.model||'',plannerIntent:plan.intent||'',plannerScope:plan.scopeSummary||'',plannerRationale:plan.rationale||'',dataRounds:roundsExecuted,geminiUsageEstimate:summarizeGeminiUsageFromTrace(flowTrace),filenameSubject:fileSafe(dominantSubjectFromPrompt(userPrompt,{})).slice(0,70),debugTrace:arr(flowTrace).slice(0,100)},debugTrace:arr(flowTrace).slice(0,100),showDebugTrace:true};
}


function finalizeZuzuResult(result, context, userPrompt, flowTrace = []) {
  const withWeather = attachWeatherVisualsIfNeeded(result || {}, context, userPrompt);
  const structured = sanitizeResultStructure(withWeather, context, userPrompt);
  const sorted = sortResultTables(structured || {});
  const meta = scopeMetaFromContext(context);
  const reportPolicy = analyzeZuzuReportRequest(userPrompt);
  const singleEventReport = eventNamesFromContext(context).length === 1 && (reportPolicy.isReport || reportPolicy.broadReport || reportPolicy.onePage);
  const normalizedTitle = singleEventReport ? (reportPolicy.onePage ? 'Informe ejecutivo' : 'Informe operativo') : trim(sorted?.title || 'Respuesta de Zuzu');
  let finalAnswer = trim(sorted?.answer || '');
  finalAnswer = enforceCanonicalAttendanceAnswer(finalAnswer, context, userPrompt, sorted);
  finalAnswer = finalAnswer
    .replace(/Aquí Zuzu,\s*lista\b/gi, 'Aquí Zuzu, listo')
    .replace(/Zuzu está bien configurada/gi, 'Zuzu está bien configurado')
    .replace(/Zuzu está preparada/gi, 'Zuzu está preparado');
  finalAnswer = v26PolishNarrative(tidyNarrativeAnswer(finalAnswer, context, userPrompt));
  if (!sorted?.rejected && finalAnswer) finalAnswer += `\n\n${zuzuLoggedUserDisplayName(context)}, soy tu amigo Zuzu, pregúntame lo que quieras.`;
  return {
    ...sorted,
    title: normalizedTitle,
    answer: finalAnswer,
    ok: true,
    meta: {
      ...(sorted.meta || {}),
      ...meta,
      generatedAt: new Date().toISOString(),
      version: 'v27_prod_1.2',
      reportCoverage: {
        requested: reportPolicy.modules,
        tables: arr(sorted?.tables).map(t=>trim(t?.title)).filter(Boolean),
        canonicalAttendance: arr(context?.asistenciaCanonica?.porEvento).map(r=>({Evento:trim(r?.Evento),socios:num(r?.sociosAsistentesPersonas),noSocios:num(r?.noSociosAsistentesPersonas),total:num(r?.totalAsistentesPersonas)}))
      },
      geminiUsageEstimate: summarizeGeminiUsageFromTrace(flowTrace),
      filenameSubject: fileSafe(dominantSubjectFromPrompt(userPrompt, sorted)).slice(0, 70),
      debugTrace: arr(flowTrace).slice(0, 80)
    },
    debugTrace: arr(flowTrace).slice(0, 80),
    showDebugTrace: true
  };
}


function v26LocalCapabilitiesHelp(userPrompt,{usuarioLogado,user,authUser,ce_acceso}={}){
  const p=norm(userPrompt);
  if(!/\b(que\s+(?:cosas\s+)?(?:te\s+)?puedo\s+preguntar|qué\s+(?:cosas\s+)?(?:te\s+)?puedo\s+preguntar|que\s+puedes\s+hacer|qué\s+puedes\s+hacer|capacidades|limitaciones|ayuda\s+de\s+zuzu)\b/.test(p))return null;
  const displayName=zuzuLoggedUserDisplayName({usuarioLogado,user,authUser,ce_acceso});
  const answer=[
    'Puedes preguntarme de forma natural por la información de ControlEvent y pedirme que la analice, no solo que la liste: eventos, personas y parejas, ingresos, compras, donaciones, asistencia, tiendas, productos, Hitos/LG, tickets, documentos, comparativas, banco y planificación. También puedo usar la meteorología asociada a un evento cuando ese contexto está disponible.',
    'Dos ejemplos: 1) «¿Qué tal salió SySA 2026?» 2) «Háblame de Colty y dime qué te llama la atención».',
    'No debo inventar datos, revelar secretos técnicos ni presentar como cierta información externa que ControlEvent no me haya proporcionado. Sí puedo darte recomendaciones o una opinión analítica basada en los datos; la decisión final sigue siendo tuya.',
    'Dos ejemplos que no puedo resolver de forma fiable solo con ControlEvent: 1) «¿Cuáles son las últimas noticias generales sobre la ELA?» 2) «Dime la clave API o las contraseñas del sistema».',
    `${displayName}, soy tu amigo Zuzu, pregúntame lo que quieras.`
  ].join('\n\n');
  return{ok:true,rejected:false,title:'Qué puedes preguntarle a Zuzu',answer,warnings:[],charts:[],tables:[],files:[],provider:'control-event-local-capabilities',model:'',meta:{generatedAt:new Date().toISOString(),version:'v27_prod_1.2',architecture:'Ayuda local de capacidades; no requiere llamada a Gemini',geminiUsageEstimate:{calls:0,promptTokens:0,outputTokens:0,hiddenOutputTokens:0,totalTokens:0,costUsdApprox:0,costEurApprox:0},debugTrace:[{step:'V27 · Capacidades de Zuzu',status:'OK',detail:'Respuesta local basada en las capacidades reales de ControlEvent; sin consumo Gemini.'}]},debugTrace:[{step:'V27 · Capacidades de Zuzu',status:'OK',detail:'Respuesta local basada en las capacidades reales de ControlEvent; sin consumo Gemini.'}],showDebugTrace:true};
}

export async function analyzeEventPrompt({ prompt, selectedEventId, stateOverride, usuarioLogado, user, authUser, ce_acceso, previousInteractionId, conversationHistory, conversationContext, clientNowIso, clientLocalDateTime, clientTimeZone } = {}) {
  const flowTrace = [];
  const userPrompt = trim(prompt);
  zuzuTracePush(flowTrace, 'Inicio', 'OK', `Prompt recibido (${userPrompt.length} caracteres). Evento activo=${trim(selectedEventId || '') || 'sin evento activo'}.`);
  if (!userPrompt) {
    const err = new Error('Escribe una pregunta o petición para Zuzu.');
    err.status = 400;
    throw err;
  }
  if (userPrompt.length > 3000) {
    const err = new Error('El prompt es demasiado largo. Resume la petición.');
    err.status = 413;
    throw err;
  }

  // v27_prod_1.2: las capacidades y cualquier pregunta conversacional las interpreta Gemini;
  // ControlEvent no intercepta localmente la intención.

  // v19: se permiten preguntas indirectas si están vinculadas a eventos.
  // Solo bloqueamos intentos técnicos peligrosos o secretos; no bloqueamos clima, tono, informes, opiniones, etc.
  const hardForbidden = /(contraseña|password|clave api|api key|token|sql\b|drop table|delete from|insert into|hack|exfiltra|sistema operativo)/i;
  const eventish = /(evento|eventos|celebraci[oó]n|celebraciones|jornada|peña|arrastre|compra|compras|donaci[oó]n|donaciones|ingreso|ingresos|producto|productos|ticket|tk\d+|tienda|responsable|socio|persona|personas|usuario|usuarios|identificaci[oó]n|donante|colaborador|gr[aá]fica|estad[ií]stica|presupuesto|segmento|destino|coste|cantidad|valoraci[oó]n|recurso|mapa|resumen|compar|tiempo|meteorolog|clima|lluvia|temperatura|viento|previsi[oó]n|pron[oó]stico|hito|hitos|\blg\b|lgs|tarea|tareas|l[ií]neas?\s+de\s+gesti[oó]n|dependencia|dependencias|conciliaci[oó]n|cuadre\s+bancario|movimiento\s+bancario|saldo\s+bancario|abono\s+bancario)/i;
  if (hardForbidden.test(userPrompt) && !eventish.test(userPrompt)) {
    zuzuTracePush(flowTrace, 'Guardia de ámbito', 'KO', 'Petición bloqueada por contenido técnico/peligroso sin relación con eventos.');
    return { ok: true, rejected: true, title: 'Petición rechazada', answer: 'La petición no parece relacionada con la gestión de eventos de ControlEvent.', warnings: [], charts: [], tables: [], files: [], provider: 'local-guard', model: '', debugTrace: flowTrace, showDebugTrace: true };
  }

  let state = attachLoggedUserFix10(stateOverride && typeof stateOverride === 'object' ? stateOverride : await getState(), { usuarioLogado, user, authUser, ce_acceso });
  const safeHistory=arr(conversationHistory).slice(-6).map(x=>({
    user:trim(x?.user).slice(0,700),assistant:trim(x?.assistant).slice(0,1000),title:trim(x?.title).slice(0,160),provider:trim(x?.provider).slice(0,80),selectedEventId:trim(x?.selectedEventId).slice(0,100)
  }));
  zuzuTracePush(flowTrace,'V27.1.2 · Arquitectura','OK',`Gemini Interactions dirige conversación y herramientas. previous_interaction_id=${trim(previousInteractionId)?'presente':'nuevo hilo'}; evento de pantalla=${trim(selectedEventId)||'ninguno'} (solo contexto ambiental).`);
  return runZuzuV261InteractionsAgent({userPrompt,state,selectedEventId,flowTrace,previousInteractionId:trim(previousInteractionId),conversationHistory:safeHistory,usuarioLogado,user,authUser,ce_acceso,clientNowIso:trim(clientNowIso).slice(0,80),clientLocalDateTime:trim(clientLocalDateTime).slice(0,120),clientTimeZone:trim(clientTimeZone).slice(0,80)});

  /* Código histórico conservado temporalmente para Planificación y trazabilidad de versiones previas.
     La ruta /event-ai/analyze de v27_prod_1.2 retorna antes de llegar aquí. */
  const safeContext=v26NormalizeConversationContext(conversationContext||{});
  const conv=v26ResolveConversationFollowUp(userPrompt,state,selectedEventId,safeHistory,safeContext);
  const processingPrompt=trim(conv?.effectivePrompt)||userPrompt;
  if(conv?.isFollowUp)zuzuTracePush(flowTrace,'V27 · Contexto conversacional','OK',`${conv.reason||'Continuación detectada'}. Personas=${arr(conv.people).join(' / ')||'—'}; eventos=${arr(conv.events).join(' / ')||'—'}; foco=${trim(conv.focus)||'—'}. El evento de pantalla queda como contexto secundario.`);
  // IMPORTANTE: una continuación ya resuelta SIEMPRE entra en Zuzu Tools. Antes se volvía
  // a evaluar solo el prompt reescrito; frases como «¿y en responsabilidades?» podían perder
  // el marcador de continuación y caer en la rama antigua.
  const weatherSpecial=wantsWeatherInfo(userPrompt)||/\b(meteo|meteorolog|metereolog|clima|lluvia|temperatura|viento|previsi[oó]n|pron[oó]stico)\b/i.test(userPrompt);
  const semanticAgentMode = !weatherSpecial && (conv?.isFollowUp || promptNeedsSemanticAgent(userPrompt, state, safeHistory) || promptNeedsSemanticAgent(processingPrompt, state, safeHistory) || eventish.test(userPrompt));
  if (semanticAgentMode) {
    const intent=v26ImplicitIntent(processingPrompt);
    if(intent.documentation||conv?.focus==='documentation'||conv?.focus==='documentation_missing')state=await attachBankState(state,processingPrompt,flowTrace);
    zuzuTracePush(flowTrace, 'V27 · Zuzu Tools', 'OK', `Petición de datos detectada${conv?.isFollowUp?' como continuación conversacional':''}. ControlEvent intentará resolver localmente el plan inequívoco; Gemini solo planificará si queda ambigüedad. Catálogo: eventos=${arr(state?.eventos).length}, tiendas=${arr(state?.tiendas).length}, productos=${arr(state?.productos).length}, personas=${arr(state?.personas).length}.`);
    return runZuzuV26Tools({ userPrompt:processingPrompt, state, selectedEventId, flowTrace, conversationHistory:safeHistory, conversationContext:safeContext, conversationResolution:conv });
  }
  state = await attachHitosState(state, flowTrace);
  state = await attachBankState(state, processingPrompt, flowTrace);
  zuzuTracePush(flowTrace, 'Paso 0 · Estado CE', 'OK', `Estado cargado: eventos=${arr(state?.eventos).length}, compras=${arr(state?.compras).length}, ingresos=${arr(state?.colaboradores).length}, personas=${arr(state?.personas).length}, productos=${arr(state?.productos).length}, hitos=${arr(state?.hitos).length}, LG=${arr(state?.lgs).length}, banco=${arr(state?.bankMovements).length}, vínculosBanco=${arr(state?.bankTicketLinks).length}.`);
  const plan = await buildZuzuPlan(processingPrompt, state, selectedEventId, flowTrace);
  state = await hydrateStateForExactEvents(state, plan, flowTrace);
  const context = buildZuzuModuleContext(state, selectedEventId, processingPrompt, plan);
  context.fechaActualControlEvent = todayIsoMadrid();
  context.contextoTemporal = narrativeTemporalContext(context);
  context.contextoPersonasZuzu = buildRelevantPeopleContext(processingPrompt, context);
  await executeZuzuSqlSelects(context, flowTrace);
  context.zuzuFlujo = {
    version: 'v27_prod_1.2',
    arquitectura: 'Prompt usuario -> Zuzu planifica -> ControlEvent extrae datos -> Zuzu redacta/contextualiza -> ControlEvent presenta',
    planificador: trim(plan?.__zuzuPlannerProvider || 'desconocido'),
    modeloPlanificador: trim(plan?.__zuzuPlannerModel || ''),
    usoPlanificador: plan?.__zuzuPlannerUsage || null,
    politicaModelos: 'planificador=Zuzu/Gemini decide módulos, condiciones y SELECTs; v22 ejecuta SELECTs válidos literalmente por RPC; redacción/informes=Flash primero con contexto compacto; planificación inicial total=Flash; planificación parcial=Flash-Lite; OCR tickets=Flash'
  };
  zuzuTracePush(flowTrace, 'Paso 2 · Extracción ControlEvent', context?.needsClarification ? 'KO' : 'OK', context?.needsClarification ? trim(context?.clarification || 'Necesita concreción') : `Módulos=${Object.keys(context?.modulosExtraidos || {}).join(', ') || 'ninguno'}; registros=${JSON.stringify(context?.totalesRegistrosPorModulo || {})}; eventos=${arr(context?.eventosObjetivo).map(e=>trim(e['Titulo del evento']||e.titulo||e.Evento)).join(' | ') || 'sin evento'}.`);

  const weatherRequested = wantsWeatherInfo(processingPrompt) || /\bMETEO\b/i.test(JSON.stringify(plan || {}));
  const weatherCtx = await maybeFetchWeatherContext(processingPrompt, context, flowTrace, weatherRequested);
  if (weatherCtx) {
    context.infoIndirecta = { ...(context.infoIndirecta || {}), meteorologia: weatherCtx };
    if (!weatherCtx.ok) {
      context.advertencias = arr(context.advertencias).concat('Se pidió meteorología, pero ControlEvent no obtuvo datos externos fiables; Zuzu no debe inventar previsión.');
    }
  } else if (weatherRequested) {
    zuzuTracePush(flowTrace, 'Paso 2b · Datos indirectos meteorología', 'KO', 'Meteorología solicitada, pero no se pudo iniciar consulta externa.');
    context.advertencias = arr(context.advertencias).concat('Se pidió meteorología, pero ControlEvent no pudo iniciar la consulta externa.');
  }

  const done = (result) => finalizeZuzuResult(result, context, processingPrompt, flowTrace);
  if (context?.needsClarification) {
    return done({
      ok: true,
      rejected: true,
      title: 'Zuzu necesita una petición más concreta',
      answer: context.clarification || 'Debes ser más concreto en tu petición. Piensa un poco más lo que quieres.',
      warnings: Array.isArray(context.warnings) ? context.warnings : [],
      charts: [],
      tables: [],
      files: [],
      provider: 'control-event-context-planner',
      model: ''
    });
  }

  const highConfidence = directHighConfidenceResultIfApplicable(userPrompt, context) || directSqlSelectResultIfApplicable(userPrompt, context);
  if (highConfidence) {
    zuzuTracePush(flowTrace, 'Paso 2c · Cálculo local CE', 'OK', `CE ha cocinado datos con alta confianza (${highConfidence.provider || 'provider local'}). La salida NO se entrega directamente: pasa a Zuzu redacción humana.`);
    const highConfidenceWithIndirect = attachWeatherVisualsIfNeeded(highConfidence, context, userPrompt);
    return done(await maybeEnrichLocalResultWithZuzu(userPrompt, context, highConfidenceWithIndirect, flowTrace));
  }

  try {
    const geminiResult = await callGeminiEvent(userPrompt, context, flowTrace);
    zuzuTracePush(flowTrace, 'Paso 5 · Presentación CE', 'OK', `Respuesta principal viene de ${geminiResult.provider || 'Zuzu'} / ${geminiResult.model || 'modelo no informado'}.`);
    return done(await maybeEnrichLocalResultWithZuzu(userPrompt, context, geminiResult, flowTrace));
  } catch (error) {
    const friendly = friendlyZuzuErrorMessage(error);
    zuzuTracePush(flowTrace, 'Paso 3 · Zuzu respuesta final estructurada', 'KO', cleanGeminiError(error));
    const fallback = directCashEvolutionIfApplicable(userPrompt, context) || directPersonsCatalogIfApplicable(userPrompt, context) || directPersonRoleReportIfApplicable(userPrompt, context) || directChronologicalEventNarrativeIfApplicable(userPrompt, context) || directProductConsumptionResultIfApplicable(userPrompt, context) || directDeterministicResultIfApplicable(userPrompt, context) || directGraphResultIfApplicable(userPrompt, context);
    if (fallback) {
      fallback.warnings = arr(fallback.warnings).concat(`${friendly} CE ha cocinado datos de respaldo, pero intentará pasarlos a Zuzu como redacción final.`);
      fallback.provider = `${fallback.provider || 'control-event'}-fallback`;
      fallback.model = 'sin-gemini-estructurado-por-error';
      zuzuTracePush(flowTrace, 'Paso 2c · Cálculo local CE de respaldo', 'OK', `CE generó datos de respaldo (${fallback.provider}). Ahora se intenta Zuzu narrativa.`);
      return done(await maybeEnrichLocalResultWithZuzu(userPrompt, context, fallback, flowTrace));
    }
    return done({
      ok: true,
      rejected: true,
      title: 'Zuzu no disponible temporalmente',
      answer: friendly,
      warnings: [],
      charts: [],
      tables: [],
      files: [],
      provider: 'control-event-zuzu-error-sanitizado',
      model: ''
    });
  }
}

// v27_prod_1.2 - Planificación inicial asistida por Zuzu.
function planAiSchema() {
  return {
    type: 'OBJECT',
    properties: {
      ok: { type: 'BOOLEAN' },
      title: { type: 'STRING' },
      notes: { type: 'ARRAY', items: { type: 'STRING' } },
      menuResumen: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            dia: { type: 'STRING', description: 'dia_1, dia_2, dia_3...' },
            momento: { type: 'STRING', description: 'aperitivo, comida, tardeo/cubatas, cena u otro momento del día' },
            resumen: { type: 'STRING', description: 'Resumen claro de qué se va a servir o de qué va a componerse ese momento' }
          },
          required: ['dia','momento','resumen']
        }
      },
      rows: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            productId: { type: 'STRING' },
            producto: { type: 'STRING' },
            tipo: { type: 'STRING', description: 'COMPRA o DONACION' },
            unidades: { type: 'NUMBER' },
            precio: { type: 'NUMBER' },
            ticketDonacion: { type: 'STRING' },
            tienda: { type: 'STRING' },
            responsable: { type: 'STRING' },
            donante: { type: 'STRING' },
            include: { type: 'BOOLEAN' },
            reason: { type: 'STRING' },
            necesidadTotal: { type: 'NUMBER', description: 'Necesidad total calculada para el evento antes de restar donaciones/existencias' }
          },
          required: ['tipo','producto','unidades','precio','reason']
        }
      }
    },
    required: ['ok','title','notes','menuResumen','rows']
  };
}
function planModeLabel(mode) {
  const m = trim(mode).toUpperCase();
  if (m === 'ZUZU_TOTAL') return 'Encargo total a Zuzu';
  if (m === 'ZUZU_PARCIAL') return 'Encargo parcial a Zuzu';
  return 'Replicar un evento Finalizado';
}
function planContentModules(content) {
  const c = trim(content || 'TODO').toUpperCase();
  if (c === 'INGRESOS') return ['INGRESOS'];
  if (c === 'COMPRAS') return ['COMPRAS'];
  if (c === 'DONACIONES') return ['DONACIONES'];
  if (c === 'INGRESOS_COMPRAS') return ['INGRESOS','COMPRAS'];
  if (c === 'INGRESOS_DONACIONES') return ['INGRESOS','DONACIONES'];
  if (c === 'COMPRAS_DONACIONES') return ['COMPRAS','DONACIONES'];
  if (c === 'INGRESOS_SOCIOS_OBLIGATORIOS') return ['INGRESOS_SOCIOS_OBLIGATORIOS'];
  if (c === 'NINGUN_DATO') return [];
  return ['INGRESOS','COMPRAS','DONACIONES'];
}
function normPlanKey(value) { return norm(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim(); }
function planProductAliasKey(value) {
  const n = normPlanKey(value || '');
  if (!n) return '';
  const has = (...parts) => parts.every(part => n.includes(normPlanKey(part)));
  const hasTok = (tok) => new RegExp('(^|\\s)' + normPlanKey(tok) + '(\\s|$)').test(n);

  if (has('COCA','COLA','ZERO') && (has('ZERO','ZERO') || /ZERO\s+ZERO/.test(n))) return 'alias coca cola zero zero';
  if (has('COCA','COLA','ZERO')) return 'alias coca cola zero';
  if (has('COCA','COLA')) return 'alias coca cola normal';
  if (has('FANTA','NARANJA')) return 'alias fanta naranja';
  if (has('FANTA','LIMON')) return 'alias fanta limon';
  if (hasTok('SPRITE')) return 'alias sprite';
  if (has('CERVEZA','SKOL')) return 'alias cerveza skol';
  if (has('TONICA','SCHWEPPES')) return 'alias tonica schweppes';
  if ((hasTok('BITTER') || hasTok('BEETER')) && hasTok('KAS')) return 'alias bitter kas';

  if (has('ron','barcelo')) return 'alias ron barcelo';
  if (has('ron','brugal')) return 'alias ron brugal';
  if ((hasTok('wiski') || hasTok('whisky') || hasTok('whiski')) && (hasTok('jb') || /j\s*b/.test(n) || has('5','anos') || has('5','años'))) return 'alias whisky jb';
  if ((hasTok('wiski') || hasTok('whisky') || hasTok('whiski')) && hasTok('dyc')) return 'alias whisky dyc';
  if ((hasTok('wiski') || hasTok('whisky') || hasTok('whiski')) && (has('johnnie') || has('jonie') || has('jhony') || has('johny') || has('walker'))) return 'alias whisky walker';
  if ((hasTok('ginebra') || hasTok('gin')) && has('puerto','indias')) return 'alias ginebra puerto indias';
  if ((hasTok('ginebra') || hasTok('gin')) && hasTok('larios')) return 'alias ginebra larios';
  if ((hasTok('ginebra') || hasTok('gin')) && (hasTok('beefeater') || hasTok('beefetaer'))) return 'alias ginebra beefeater';

  if (has('aceite','aove') || hasTok('aove')) return 'alias aceite aove';
  if (hasTok('vinagre')) return 'alias vinagre';
  if (hasTok('agua') && (has('1l') || has('1','l') || hasTok('cristal'))) return 'alias agua 1l cristal';
  if (hasTok('baicon') || hasTok('bacon')) return 'alias baicon';
  if (has('chuleta','cerdo')) return 'alias chuleta cerdo';
  if (hasTok('fairy')) return 'alias fairy';
  if (has('papel','higienico')) return 'alias papel higienico';
  if (has('rollo','secamanos') || has('papel','secamanos')) return 'alias rollo secamanos';
  if (has('bolsas','basura') || has('bolsa','basura')) return 'alias bolsas basura grandes';
  if (has('jabon','manos') || has('jabon','lavamanos')) return 'alias jabon manos';
  if (hasTok('ambientador')) return 'alias ambientador';

  if (has('cafe','descafeinado')) return 'alias cafe descafeinado gorritas';
  if (has('cafe','normal')) return 'alias cafe normal gorritas';
  if (has('vino','blanco')) return 'alias vino blanco';
  if (has('vino','frizzante')) return 'alias vino frizzante';
  if (has('vino','tinto','rioja')) return 'alias vino tinto rioja';
  if (has('vino','tinto')) return 'alias vino tinto';
  if (has('oreja','salsa')) return 'alias oreja en salsa';

  return n;
}
function planBuildMaps(state) {
  const events = arr(state?.eventos);
  const people = byId(state?.personas);
  const stores = byId(state?.tiendas);
  const products = byId(state?.productos);
  const productByName = new Map();
  arr(state?.productos).forEach(p => {
    const k = normPlanKey(p?.nombre); if(k && !productByName.has(k)) productByName.set(k, p);
    const ak = planProductAliasKey(p?.nombre); if(ak && !productByName.has(ak)) productByName.set(ak, p);
  });
  const storeByName = new Map();
  arr(state?.tiendas).forEach(t => { const k = normPlanKey(t?.nombre); if(k && !storeByName.has(k)) storeByName.set(k, t); });
  const personByName = new Map();
  arr(state?.personas).forEach(pe => { const k = normPlanKey(pe?.nombre); if(k && !personByName.has(k)) personByName.set(k, pe); });
  return { events, people, stores, products, productByName, storeByName, personByName };
}
function planEventById(state, eventId) {
  const id = trim(eventId);
  return arr(state?.eventos).find(e => trim(e?.id) === id) || null;
}
function planEventTitle(ev) { return trim(ev?.titulo) || 'Evento sin título'; }
function planIsDonation(row) { return /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(trim(row?.ticketDonacion || row?.ticket || '')); }
function planTicket(row) { return trim(row?.ticketDonacion || row?.ticket || '') || 'Pte.Compra u otros gastos'; }
function planLineValue(row) {
  const explicit = num(row?.importe ?? row?.valor ?? row?.total ?? row?.importeTotal);
  if (explicit > 0) return round(explicit, 2);
  return round(num(row?.unidades) * num(row?.precio), 2);
}
function planProductName(row, maps) { return trim(maps.products.get(trim(row?.productoId || row?.producto_id))?.nombre || row?.producto || 'Producto sin nombre'); }
function planProduct(row, maps) { return maps.products.get(trim(row?.productoId || row?.producto_id)) || null; }
function planStoreName(id, maps) { return trim(maps.stores.get(trim(id))?.nombre || 'Sin tienda'); }
function planPersonName(id, maps) { return trim(maps.people.get(trim(id))?.nombre || 'Sin responsable'); }
function planDonorLabel(ref, maps) {
  const raw = trim(ref);
  if (!raw) return '';
  const [kind, ...rest] = raw.split(':');
  const id = rest.join(':');
  if (/^P$/i.test(kind)) return trim(maps.people.get(id)?.nombre || raw);
  if (/^T$/i.test(kind)) return trim(maps.stores.get(id)?.nombre || raw);
  return raw;
}
function planDonorRefFromLabel(label, maps) {
  const k = normPlanKey(label);
  if (!k) return '';
  const pe = maps.personByName.get(k);
  if (pe?.id) return 'P:' + pe.id;
  const st = maps.storeByName.get(k);
  if (st?.id) return 'T:' + st.id;
  return '';
}

function planImportantProductTokens(key) {
  return String(key || '').split(' ').filter(t => /\d/.test(t) || /^(cl|ml|l|kg|gr|ud|uds|unidad|unidades|lata|latas|botellin|botellines|botella|botellas|pack|packs)$/.test(t));
}
function planFindProductLoose(label, maps) {
  const rawLabel = trim(label || '');
  const key = normPlanKey(rawLabel);
  if (!key) return null;

  function aliasText(value) {
    return normPlanKey(value || '')
      .replace(/\bWISKI\b/g, 'WHISKY')
      .replace(/\bWHISKI\b/g, 'WHISKY')
      .replace(/\bJOHNY\b/g, 'JHONY')
      .replace(/\bJOHNNY\b/g, 'JHONY')
      .replace(/\bJOHNNIE\b/g, 'JHONY')
      .replace(/\bJONIE\b/g, 'JHONY')
      .replace(/\bJ\s*B\b/g, 'JB')
      .replace(/\bBEETER\b/g, 'BITTER')
      .replace(/\bLAVAMANOS\b/g, 'MANOS')
      .replace(/\bBTLLA\b/g, 'BOTELLA')
      .replace(/\bBTELLA\b/g, 'BOTELLA')
      .replace(/\bAÑEJO\b/g,'ANEJO')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function simplify(value) {
    return aliasText(value || '')
      .replace(/\b(?:BOLSA|PACK|PACKS|PAQUETE|PAQUETES|CAJA|PIEZA|UD|UDS|UNIDAD|UNIDADES|BOTELLA|BOTELLAS|LATA|LATAS|BOTE|BOTES|BARRIL|BARRILES|KG|GR|L|CL|ML|LITRO|LITROS|NORMAL|GRANDE|MEDIANA|PEQUENA|PEQUEÑA|ENTERO|MEZCLA)\b/g, ' ')
      .replace(/\b\d+(?:[,.]\d+)?\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function aliasKey(value) {
    const n = aliasText(value || '');
    const s = simplify(value || '');
    const has = (...parts) => parts.every(part => n.includes(aliasText(part)));
    const hasS = (...parts) => parts.every(part => s.includes(aliasText(part)));
    const tok = t => new RegExp('(^|\\s)' + aliasText(t) + '(\\s|$)').test(n);

    if(has('COCA','COLA','ZERO') && (has('ZERO ZERO') || /ZERO\s+ZERO/.test(n))) return 'alias:coca-cola-zero-zero';
    if(has('COCA','COLA','ZERO')) return 'alias:coca-cola-zero';
    if(has('COCA','COLA')) return 'alias:coca-cola';
    if(has('FANTA','NARANJA')) return 'alias:fanta-naranja';
    if(has('FANTA','LIMON')) return 'alias:fanta-limon';
    if(has('SPRITE')) return 'alias:sprite';
    if(has('CERVEZA','AMBAR') && hasS('BARRIL') && (has('50') || /\b50\s*L?\b/.test(n))) return 'alias:cerveza-ambar-barril-50';
    if(has('CERVEZA','AMBAR') && hasS('BARRIL') && (has('30') || /\b30\s*L?\b/.test(n))) return 'alias:cerveza-ambar-barril-30';
    if(has('CERVEZA','AMBAR') && hasS('BARRIL')) return 'alias:cerveza-ambar-barril';
    if(has('CERVEZA','SKOL')) return 'alias:cerveza-skol';
    if(has('TONICA','SCHWEPPES')) return 'alias:tonica-schweppes';
    if((has('BITTER') || has('BEETER')) && has('KAS')) return 'alias:bitter-kas';
    if(has('RON','BARCELO')) return 'alias:ron-barcelo';
    if(has('RON','BRUGAL')) return 'alias:ron-brugal';
    if((hasS('WHISKY') || hasS('WISKI')) && (tok('JB') || has('J B') || has('5 ANOS') || has('5 AÑOS'))) return 'alias:whisky-jb';
    if((hasS('WHISKY') || hasS('WISKI')) && hasS('DYC')) return 'alias:whisky-dyc';
    if((hasS('WHISKY') || hasS('WISKI')) && (hasS('JHONY') || hasS('JOHNY') || hasS('JONIE') || hasS('WALKER'))) return 'alias:whisky-walker';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('PUERTO','INDIAS')) return 'alias:ginebra-puerto-indias';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('LARIOS')) return 'alias:ginebra-larios';
    if((hasS('GINEBRA') || hasS('GIN')) && hasS('BEEFEATER')) return 'alias:ginebra-beefeater';
    if(hasS('ACEITE','AOVE') || hasS('AOVE')) return 'alias:aceite-aove';
    if(hasS('VINAGRE')) return 'alias:vinagre';
    if(hasS('AGUA') && (has('1L') || has('1 L') || hasS('CRISTAL'))) return 'alias:agua-1l-cristal';
    if(hasS('BAICON') || hasS('BACON')) return 'alias:baicon';
    if(hasS('CHULETA','CERDO')) return 'alias:chuleta-cerdo';
    if(hasS('FAIRY')) return 'alias:fairy';
    if(hasS('PAPEL','HIGIENICO')) return 'alias:papel-higienico';
    if(hasS('ROLLO','SECAMANOS') || hasS('PAPEL','SECAMANOS')) return 'alias:rollo-secamanos';
    if(hasS('BOLSAS','BASURA') || hasS('BOLSA','BASURA')) return 'alias:bolsas-basura';
    if(hasS('JABON','MANOS') || hasS('JABON','LAVAMANOS')) return 'alias:jabon-manos';
    if(hasS('AMBIENTADOR')) return 'alias:ambientador';
    if(hasS('CAFE','DESCAFEINADO')) return 'alias:cafe-descafeinado-gorritas';
    if(hasS('CAFE','NORMAL') || (hasS('CAFE') && hasS('GORRITAS') && !hasS('DESCAFEINADO'))) return 'alias:cafe-normal-gorritas';
    if(hasS('VINO','BLANCO')) return 'alias:vino-blanco';
    if(hasS('VINO','FRIZZANTE')) return 'alias:vino-frizzante';
    if(hasS('VINO','TINTO','RIOJA')) return 'alias:vino-tinto-rioja';
    if(hasS('VINO','TINTO')) return 'alias:vino-tinto';
    if(hasS('OREJA','SALSA')) return 'alias:oreja-salsa';
    if(hasS('MEJILLONES')) return 'alias:mejillones';
    return 'norm:' + simplify(value || '');
  }

  const norm = aliasText(rawLabel);
  if (maps.productByName.has(norm)) return maps.productByName.get(norm);

  const wantedAlias = aliasKey(rawLabel);
  const rawHas50Barril = /\bCERVEZA\b/i.test(aliasText(rawLabel)) && /\bAMBAR\b/i.test(aliasText(rawLabel)) && /\bBARRIL\b/i.test(aliasText(rawLabel)) && /\b50\b/.test(aliasText(rawLabel));
  const rawHas30Barril = /\bCERVEZA\b/i.test(aliasText(rawLabel)) && /\bAMBAR\b/i.test(aliasText(rawLabel)) && /\bBARRIL\b/i.test(aliasText(rawLabel)) && /\b30\b/.test(aliasText(rawLabel));
  const aliasMatches = Array.from(maps.products.values()).filter(p => aliasKey(p?.nombre || '') === wantedAlias);
  if (aliasMatches.length === 1) return aliasMatches[0];
  if (aliasMatches.length > 1) {
    const exactNorm = aliasMatches.find(p => aliasText(p?.nombre || '') === norm);
    if (exactNorm) return exactNorm;
    const sizeExact = aliasMatches.find(p => {
      const pn = aliasText(p?.nombre || '');
      return (rawHas50Barril && /\b50\b/.test(pn)) || (rawHas30Barril && /\b30\b/.test(pn));
    });
    if (sizeExact) return sizeExact;
    return aliasMatches.sort((a,b)=>String(a?.nombre||'').length-String(b?.nombre||'').length)[0];
  }

  const target = simplify(rawLabel);
  const exactSimple = Array.from(maps.products.values()).find(p => simplify(p?.nombre || '') === target);
  if (exactSimple) return exactSimple;

  const queries = [];
  if(target) queries.push(target);
  const words = target.split(' ').filter(w => w.length >= 3);
  for(let i=0;i<words.length;i++){
    const q = words.slice(i).join(' ');
    if(q.length >= 4) queries.push(q);
  }
  for(const q0 of [...queries]){
    let q = trim(q0);
    while(q.length >= 5){
      queries.push(q);
      q = trim(q.slice(0, -1));
    }
  }
  for(const q of [...new Set(queries.filter(Boolean))]){
    const contains = Array.from(maps.products.values()).filter(p => simplify(p?.nombre || '').includes(q));
    if(contains.length === 1) return contains[0];
    if(contains.length > 1) return contains.sort((a,b)=>String(a?.nombre||'').length-String(b?.nombre||'').length)[0];
  }

  const generic = new Set('DE DEL LA EL LOS LAS EN CON SIN TIPO PARA Y O A UN UNA UNO UD UDS UNIDAD UNIDADES BOTELLA BOTELLAS LATA LATAS BOTE BOTES BOLSA BOLSAS PACK PAQUETE PAQUETES CAJA PIEZA KG GR L CL ML LITRO LITROS NORMAL GRANDE MEDIANA PEQUENA PEQUEÑA ENTERO MEZCLA'.split(' '));
  const toks = value => simplify(value).split(' ').filter(t => t.length >= 2 && !generic.has(t));
  const wanted = toks(rawLabel);
  let best = null, bestScore = -9999;
  for (const p of maps.products.values()) {
    const ps = simplify(p?.nombre || '');
    const pt = toks(p?.nombre || '');
    let score = 0, matched = 0;
    wanted.forEach(t => {
      if (pt.includes(t)) { score += 80 + t.length; matched++; }
      else if (ps.includes(t)) { score += 40 + t.length; matched++; }
      else score -= 18;
    });
    if(aliasKey(p?.nombre || '') === wantedAlias) score += 400;
    if(!matched) score -= 300;
    score -= Math.abs(ps.length - target.length) * 0.05;
    if(score > bestScore){ bestScore = score; best = p; }
  }
  return bestScore >= 80 ? best : null;
}
function planReasonablePlanPrice(productName, catalogPrice = 0) {
  const n = normPlanKey(productName || '');
  const c = num(catalogPrice);
  const reasonable = (fallback, max = Infinity) => (c > 0 && c <= max ? round(c,4) : fallback);
  if (/hielo|cubito/.test(n)) return reasonable(0.9, 3);
  if (/coca|fanta|sprite|tonica|aquarius|acuarius|bitter|refresco/.test(n) && /lata|bote|33|25/.test(n)) return reasonable(0.75, 2);
  if (/coca|fanta|sprite|tonica|aquarius|acuarius|bitter|refresco/.test(n) && /botella.*2|2\s*l/.test(n)) return reasonable(1.6, 4);
  if (/agua/.test(n) && /bot/.test(n)) return reasonable(0.35, 2);
  if (/cerveza/.test(n) && /lata|skol|bote/.test(n)) return reasonable(0.55, 2);
  if (/cerveza/.test(n) && /botell/.test(n)) return reasonable(0.45, 2);
  if (/barril/.test(n) && /50/.test(n)) return reasonable(110, 180);
  if (/barril/.test(n) && /30/.test(n)) return reasonable(70, 140);
  if (/ron/.test(n)) return reasonable(14, 35);
  if (/whisky|wiski|jb|dyc|walker/.test(n)) return reasonable(12, 35);
  if (/gin|ginebra|beefeater|larios|puerto de indias/.test(n)) return reasonable(13, 35);
  if (/jamon/.test(n)) return reasonable(70, 180);
  if (/queso/.test(n)) return reasonable(20, 80);
  if (/pan/.test(n)) return reasonable(1.2, 5);
  if (/servilleta|vasos|copa|cuchara|tenedor|plato/.test(n)) return reasonable(0.04, 2);
  if (/bolsa.*basura|sacos.*basura/.test(n)) return reasonable(0.4, 3);
  if (/fairy|jabon|ambientador|papel|rollo/.test(n)) return reasonable(c || 2.5, 12);
  if (c > 0) return round(c,4);
  return 1;
}
function planPackRoundedProduct(productName) {
  const n = normPlanKey(productName || '');
  if (/(lata|latas|botellin|botellines|bote|botes)/.test(n) && /(cerveza|coca|fanta|sprite|tonica|aquarius|acuarius|refresco|bitter)/.test(n)) return true;
  if (/(coca cola|fanta|sprite|tonica|aquarius|acuarius|cerveza skol)/.test(n) && !/botella\s*2/.test(n)) return true;
  return false;
}
function planProductAllowsDecimalUnits(productName) {
  const n = normPlanKey(productName || '');
  if (!/(kg|kilo|kilos|gr|gramo|gramos|litro|litros)/.test(n)) return false;
  // Si el propio nombre habla de botella, lata, bote, garrafa, pack, saco, etc., se compra por unidad/envase.
  if (/(lata|latas|botellin|botellines|bote|botes|botella|botellas|garrafa|garrafas|saco|sacos|pack|packs|paquete|paquetes|barril|barriles)/.test(n)) return false;
  return true;
}
function planRoundBuyUnits(productName, units) {
  const u = Math.max(0, num(units));
  if (!u) return 0;
  if (planPackRoundedProduct(productName)) return Math.max(24, Math.ceil(u / 24) * 24);
  if (planProductAllowsDecimalUnits(productName)) return round(Math.ceil(u * 100) / 100, 2);
  return Math.max(1, Math.ceil(u));
}
function planBuyAfterDonation(productName, totalNeed, donatedUnits) {
  const need = Math.max(0, num(totalNeed));
  const donated = Math.max(0, num(donatedUnits));
  // HOTFIX18: A COMPRAR es exactamente necesidad calculada - suma de donaciones del producto.
  // No se vuelve a redondear aquí, porque la necesidad calculada ya es la cifra que revisa el usuario.
  return Math.max(0, round(need - donated, 2));
}
function planCanonicalProductForRow(row, maps) {
  const byIdProd = trim(row?.productId || row?.productoId || row?.producto_id) ? maps.products.get(trim(row?.productId || row?.productoId || row?.producto_id)) : null;
  return byIdProd || planFindProductLoose(row?.productName || row?.producto || '', maps) || null;
}
function planCanonicalizeRowProduct(row, maps) {
  const prod = planCanonicalProductForRow(row, maps);
  if (!prod?.id) return row;
  const original = trim(row?.__productoEscritoOriginal || row?.producto || row?.productName || '');
  if (original && row?.__geminiDirect38 === true && !planProductFormatCompatible38(original, prod.nombre || '')) {
    return {
      ...row,
      productId: '',
      productName: original,
      segmento: trim(row.segmento || prod.segmento || 'Sin segmento'),
      destino: trim(row.destino || prod.destino || 'Sin destino'),
      reason: trim(row.reason || '') + ' Producto conservado como revisable: el catálogo parecido cambiaba formato/capacidad.'
    };
  }
  return {
    ...row,
    productId: trim(prod.id),
    productName: trim(prod.nombre || row.productName || row.producto || 'Producto'),
    segmento: trim(prod.segmento || row.segmento || 'Sin segmento'),
    destino: trim(prod.destino || row.destino || 'Sin destino')
  };
}
function planDisplayNeedAfterRounding(productName, totalNeed) {
  const need = Math.max(0, num(totalNeed));
  if (!need) return 0;
  return planPackRoundedProduct(productName) ? planRoundBuyUnits(productName, need) : round(need, 2);
}
function planConsumptionProfile(form) {
  const rawInfo = trim((form?.info || '') + ' ' + (form?.descripcion || ''));
  const info = normPlanKey(rawInfo);
  const people = Math.max(1, num(form?.personas) || 25);
  const days = Math.max(1, num(form?.dias) || 1);
  const calor = /40|calor|temperatura|verano|mucho sol/.test(info);
  const cubatas = /cubata|copa|copas|tardeo|barra libre/.test(info);
  const cerveza = /cerveza|botellin|botellines|lata|barril/.test(info) || cubatas;
  const noAlcoholCue = /niños|ninos|infantil|sin alcohol|no bebedores|abstemios/.test(info);
  function explicit(re) {
    const m = rawInfo.match(re);
    return m ? Math.max(0, Math.round(num(m[1]))) : 0;
  }
  const explicitBeer = explicit(/personas\s+que\s+beber[aá]n\s+cerveza\s*[:=]\s*(\d+)/i);
  const explicitCuba = explicit(/personas\s+que\s+tomar[aá]n\s+cubatas\s*[:=]\s*(\d+)/i);
  const explicitNoAlcohol = explicit(/personas\s+sin\s+alcohol(?:\s*\/\s*ni[ñn]os|\s+o\s+ni[ñn]os|[^\n:]*)?\s*[:=]\s*(\d+)/i);
  const beerPeople = explicitBeer || Math.max(0, Math.round(people * (cerveza ? (noAlcoholCue ? 0.55 : 0.70) : 0.35)));
  const cubaPeople = explicitCuba || Math.max(0, Math.round(people * (cubatas ? (noAlcoholCue ? 0.35 : 0.45) : 0.15)));
  const directSoftPeople = Math.max(1, explicitNoAlcohol || Math.round(people * (noAlcoholCue ? 0.45 : 0.25)));
  return { people, days, calor, cubatas, beerPeople, cubaPeople, directSoftPeople, cubatasTotal: cubaPeople * (cubatas ? 3.5 : 1.5) * days };
}
function planProductLooksTwoLiter(n) { return /botella.*2|2\s*l|2l|litro/.test(n) && !/lata|bote|33|25/.test(n); }
function planMinimumNeed(productName, form, currentNeed) {
  const n = normPlanKey(productName || '');
  const p = planConsumptionProfile(form);
  let min = 0;

  if (/cerveza/.test(n) && /lata|botellin|botellines|skol|bote/.test(n)) {
    // No se fuerza el máximo completo por cada marca/formato: el cupo de cerveza se reparte entre barril, latas y botellines.
    // Si hay existencias/donaciones explícitas, se respetan y no se infla esa misma línea automáticamente.
    min = num(currentNeed);
  } else if (/barril/.test(n) && /cerveza/.test(n)) {
    // Un barril ya cubre muchas cañas; no duplicar además el máximo de latas/botellines por persona.
    min = num(currentNeed);
  } else if (/ron|whisky|wiski|gin|ginebra/.test(n)) {
    // Los cubatas se reparten entre varios alcoholes; no calcular 4 botellas de ron + 4 de whisky + 4 de ginebra.
    min = Math.max(num(currentNeed), 1);
  } else if (/coca|fanta|sprite|tonica|aquarius|acuarius|bitter|refresco/.test(n)) {
    if (planProductLooksTwoLiter(n)) {
      // Botellas de 2 l: mezcla de cubatas + algo de consumo directo, con margen extra si hay calor y tardeo.
      const mixerBottles = p.cubatas ? Math.ceil(p.cubatasTotal / 7) : 0;
      const directBottles = Math.ceil((p.directSoftPeople * (p.calor ? 0.85 : 0.50) * p.days) / 6);
      min = mixerBottles + directBottles + (p.calor && p.cubatas ? 1 : 0);
    } else {
      // Latas/botes directos: en día caluroso + aperitivo + cubatas, Coca-Colas y refrescos se quedan cortos con 2-3 packs.
      const cubataMixUnits = p.cubatas ? Math.ceil(p.cubatasTotal * (/coca/.test(n) ? 0.55 : (/tonica|sprite|fanta/.test(n) ? 0.22 : 0.12))) : 0;
      min = p.directSoftPeople * (p.calor ? 1.75 : 1.10) * p.days + cubataMixUnits;
      if (p.calor && p.cubatas && /coca|fanta|sprite|tonica/.test(n)) min += 24; // un pack extra de margen por tipo principal.
    }
  } else if (/agua/.test(n) && /bot/.test(n)) {
    min = p.people * (p.calor ? 2.0 : 1.25) * p.days;
  } else if (/hielo|cubito/.test(n)) {
    // Bolsas de 2 kg aprox.: con calor/cubatas 11 se queda corto; damos margen operativo sin dispararlo.
    min = Math.ceil(p.people * (p.calor ? 0.65 : 0.40) * p.days) + (p.cubatas ? 2 : 0);
  } else if (/gambon|gambones|langostino|langostinos/.test(n)) {
    // Referencia del usuario: para una paella normal, 1 kg de gambones puede ser base suficiente; no saltar a 5 kg sin justificación.
    min = Math.max(num(currentNeed), Math.min(2, Math.max(1, Math.ceil(p.people / 70))));
  } else if (/arroz/.test(n)) {
    min = Math.max(num(currentNeed), Math.ceil((p.people * 0.10) * 10) / 10);
  } else if (/chorizo|morcilla|montado|panceta/.test(n)) {
    // Aperitivo/cena informal: evitar barbaridades tipo 17 kg de chorizo por copiar una proporción de personas.
    // Si el prompt no fija otra cosa, se propone 1 kg/unidad de referencia por producto y se revisa a mano.
    const current = num(currentNeed);
    if (current > 0 && current <= 3) return current;
    return Math.max(1, Math.ceil(p.people / 90));
  }
  if (!min) return Math.max(0, num(currentNeed));
  return Math.max(num(currentNeed), Math.ceil(min));
}
function planCompraTotal(rows) {
  return arr(rows).filter(r => r?.include !== false && r?.tipo === 'COMPRA').reduce((sum, r) => sum + num(r.unidades) * num(r.precio), 0);
}

function planMenuIntentHf29(form) {
  const raw = trim((form?.descripcion || '') + '\n' + (form?.info || ''));
  const n = normPlanKey(raw);
  const negPaella = /\b(NO|SIN|NADA\s+DE|EVITAR|EVITA|NO\s+QUEREMOS|NO\s+HACER|NO\s+PREPARAR)\b.{0,50}\b(PAELLA|ARROZ|MARISCO|GAMBON|GAMBONES|ALMEJA|ALMEJAS)\b/.test(n);
  const negBbq = /\b(NO|SIN|NADA\s+DE|EVITAR|EVITA|NO\s+QUEREMOS|NO\s+HACER|NO\s+PREPARAR)\b.{0,50}\b(BARBACOA|BBQ|PARRILLA|BRASA|ASADO|LOMO|MORCILLA|PANCETA|CHORIZO)\b/.test(n);
  const paella = !negPaella && /\b(PAELLA|ARROZ|FIDEUA|FIDEU[AÁ]|MARISCO|GAMBON|GAMBONES|GAMBA|GAMBAS|ALMEJA|ALMEJAS|CALDO\s+PAELLA)\b/.test(n);
  const bbq = !negBbq && /\b(BARBACOA|BBQ|PARRILLA|BRASA|ASADO|ASADA|PLANCHA|LOMO|MORCILLA|PANCETA|CHORIZO|MONTADO|MONTADOS)\b/.test(n);
  const bocadillos = /\b(BOCADILLO|BOCADILLOS|SANDWICH|SANDWICHES|PERRITO|PERRITOS|HAMBURGUESA|HAMBURGUESAS)\b/.test(n);
  const tapas = /\b(TAPA|TAPAS|APERITIVO|PICOTEO|RACIONES|TORTILLA|EMPANADA|CANAPE|CANAPES|EMBUTIDO|QUESO)\b/.test(n);
  const frio = /\b(FRIO|FRIA|FRÍA|COMIDA\s+FRIA|COMIDA\s+FRÍA|ENSALADA|GAZPACHO)\b/.test(n);
  return { paella, bbq, bocadillos, tapas, frio, texto: n.slice(0, 1200) };
}
function planLegacyMenuFamilyHf29(productName) {
  const n = normPlanKey(productName || '');
  if (/\bARROZ\b|GAMBON|GAMBONES|GAMBA|GAMBAS|LANGOSTINO|LANGOSTINOS|ALMEJA|ALMEJAS|CALDO\s+PAELLA|PREPARADO\s+PAELLA/.test(n)) return 'paella';
  if (/\bLOMO\b|LOMO\s+FRESCO|MORCILLA|PANCETA|CHORIZO|CHORIZOS/.test(n)) return 'bbq';
  return '';
}
function planFilterUnrequestedLegacyMenuRowsHf29(rows, form) {
  // FIX30_PLANIFICACION: se deja como no-op defensivo.
  // ControlEvent ya no elimina paella/barbacoa propuestas por Zuzu: solo se evita el menú local fijo saltándose este filtro.
  return { rows: arr(rows).slice(), notes: [] };
}


function planBudgetGuard(rows, form) {
  const openCtx = planOpenConsumptionContextFix47(form);
  const people = Math.max(1, num(openCtx.asistentesBase) || num(form?.personas) || 25);
  const budget = planBudgetFromPrompt(form);
  const maxPer = budget.maximoPorPersona || 35;
  const targetPer = budget.objetivoPorPersona || Math.min(32.5, maxPer);
  const notes = [];
  let out = arr(rows).map(r => ({...r}));
  let total = planCompraTotal(out);
  let per = total / people;
  const initialPer = per;
  if (maxPer > 0 && initialPer > maxPer) {
    const target = Math.max(1, Math.min(targetPer || maxPer * 0.95, maxPer * 0.96));
    const factor = Math.max(0.25, (target * people) / Math.max(1, total));
    out = out.map(r => {
      if (r?.tipo !== 'COMPRA' || r.include === false) return r;
      const before = num(r.unidades);
      const productName = trim(r.productName || r.producto || '');
      if (num(r.donadoTotal) > 0 || r.explicitPromptDonation === true) {
        return { ...r, unidades: before, aComprarCalculado: before, reason: trim(r.reason || '') + ' Línea con donación/existencia confirmada: no se reduce automáticamente para no descuadrar el déficit.' };
      }
      const rawScaled = before * factor;
      const scaled = planRoundBuyUnits(productName, rawScaled);
      return { ...r, unidades: scaled, aComprarCalculado: scaled, reason: trim(r.reason || '') + ` Ajuste automático de Zuzu: la propuesta inicial superaba el límite de ${round(maxPer,2)} €/persona indicado en el prompt.` };
    });
    total = planCompraTotal(out);
    per = total / people;
    notes.push(`Control de coste: la primera propuesta salía a ${round(initialPer,2)} €/persona. Zuzu la ha reducido a ${round(per,2)} €/persona para respetar el límite del prompt (${round(maxPer,2)} €/persona).`);
  } else if (budget.objetivoPorPersona || budget.maximoPorPersona) {
    notes.push(`Control de coste: compra prevista ${round(initialPer,2)} €/persona frente a objetivo ${budget.objetivoPorPersona || 'sin dato'} €/persona y límite ${budget.maximoPorPersona || maxPer} €/persona indicados en el prompt.`);
  } else if (initialPer > 25) {
    notes.push(`Control de coste: la propuesta queda en ${round(initialPer,2)} €/persona de compra prevista. Está por encima del objetivo normal de 25 €/persona, pero dentro del rango revisable.`);
  } else {
    notes.push(`Control de coste: la propuesta queda en ${round(initialPer,2)} €/persona de compra prevista, dentro del objetivo normal de coste.`);
  }
  return { rows: out, notes };
}


function planApplyPositiveSaldoFix39(rows, form, state) {
  const out = arr(rows).map(r => ({...r}));
  const budget = planBudgetFromPrompt(form);
  const openCtx = planOpenConsumptionContextFix47(form);
  const people = Math.max(1, num(openCtx.asistentesBase) || num(form?.personas) || 0);
  const income = people * num(budget.objetivoPorPersona);
  const notes = [];
  if (!income || income <= 0) return { rows: out, notes };
  let total = planCompraTotal(out);
  if (total <= 0) return { rows: out, notes };
  const initialSaldo = income - total;
  const initialRatio = initialSaldo / total;
  if (!(initialSaldo > 0 && initialRatio > 0.25)) return { rows: out, notes };
  const maps = planBuildMaps(state || {});
  const defaults = { tiendaId: trim(form.defaultStoreId), responsableId: trim(form.defaultResponsibleId) };
  const maxAdds = new Map();
  function currentRatio() { const t = planCompraTotal(out); return t > 0 ? (income - t) / t : 0; }
  function keyFor(item){ return normPlanKey(item.label || item.q); }
  function addItem(item, reasonTag) {
    const countKey = keyFor(item);
    const currentCount = maxAdds.get(countKey) || 0;
    if (item.maxAdds && currentCount >= item.maxAdds) return false;
    const prod = planFindProductLoose(item.q, maps) || planFindProductLoose(item.label, maps) || {};
    const productName = trim(prod.nombre || item.label);
    const price = planReasonablePlanPrice(productName, prod.defaultPrecio ?? prod.precio ?? item.fallback);
    const units = item.units;
    const cost = units * price;
    const nextTotal = planCompraTotal(out) + cost;
    if (income - nextTotal < -0.005) return false;
    const existing = out.find(r => r.tipo === 'COMPRA' && ((trim(r.productId) && trim(r.productId) === trim(prod.id)) || normPlanKey(r.productName) === normPlanKey(productName)));
    if (existing) {
      existing.unidades = round(num(existing.unidades) + units, 2);
      existing.aComprarCalculado = existing.unidades;
      existing.reason = trim(existing.reason || '') + ` Ajuste automático de saldo positivo FIX43 (${reasonTag}).`;
      existing.__ceHf46SaldoBalancer = true;
      existing.__ceHf52SaldoBalancer = true;
      maxAdds.set(countKey, currentCount + 1);
      return true;
    }
    out.push({
      key:`saldo-fix43:${out.length}:${trim(prod.id || productName)}`,
      include:true,
      tipo:'COMPRA',
      productId:trim(prod.id || ''),
      productName,
      segmento:trim(prod.segmento || item.segmento || 'BEBIDA'),
      destino:trim(prod.destino || item.destino || 'CUBATAS'),
      unidades:units,
      precio:price,
      tiendaId:trim(prod.defaultTiendaId || defaults.tiendaId),
      responsableId:trim(defaults.responsableId),
      ticketDonacion:'',
      donorRef:'',
      confidence:'Ajuste saldo FIX43',
      reason:`Ajuste automático de saldo positivo FIX43: se añade por prioridad y proporción de bebidas (${reasonTag}) hasta acercar el saldo al 10%.`,
      __ceHf46SaldoBalancer:true,
      __ceHf52SaldoBalancer:true
    });
    maxAdds.set(countKey, currentCount + 1);
    return true;
  }
  const BEER = {q:'Cerveza lata 33cl', label:'Cerveza lata 33cl', units:24, fallback:0.55, maxAdds:6};
  const COKE = {q:'COCA COLA Bote 32 Cl', label:'COCA COLA Bote 32 Cl', units:24, fallback:0.75, maxAdds:4};
  const COKE_ZERO = {q:'COCA COLA ZERO Bote 32 Cl', label:'COCA COLA ZERO Bote 32 Cl', units:24, fallback:0.75, maxAdds:4};
  const COKE_ZZ = {q:'COCA COLA ZERO -ZERO 33 cl', label:'COCA COLA ZERO -ZERO 33 cl', units:24, fallback:0.75, maxAdds:3};
  const ICE = {q:'Hielo', label:'Hielo en cubitos', units:5, fallback:1.25, maxAdds:8};
  const RON = {q:'Ron BARCELO Añejo 0.7 L', label:'Ron BARCELO Añejo 0.7 L', units:1, fallback:14.35, maxAdds:4};
  const WJB = {q:'Whisky 5 Años J.B Botella 0.7 L', label:'Whisky 5 Años J.B Botella 0.7 L', units:1, fallback:14.65, maxAdds:4};
  const GIN = {q:'GINEBRA Beefeater', label:'GINEBRA Beefeater', units:1, fallback:16.8, maxAdds:4};
  const FANTA_N = {q:'FANTA Naranja Bote 32 C.L', label:'FANTA Naranja Bote 32 C.L', units:24, fallback:0.6, maxAdds:2};
  const FANTA_L = {q:'FANTA Limon Bote 32 CL', label:'FANTA Limon Bote 32 CL', units:24, fallback:0.6, maxAdds:2};
  const TONIC = {q:'Tónica lata', label:'Tónica lata', units:24, fallback:0.75, maxAdds:2};
  const SPRITE = {q:'Sprite lata (33cl)', label:'Sprite lata (33cl)', units:24, fallback:0.52, maxAdds:2};
  const BRUGAL = {q:'Ron BRUGAL Añejo 0.7L', label:'Ron BRUGAL Añejo 0.7L', units:1, fallback:13.59, maxAdds:2};
  const PAPEL_SEC = {q:'Rollo papel secamanos', label:'Rollo papel secamanos', units:1, fallback:3.5, maxAdds:2, segmento:'INFRAESTRUCTURA', destino:'INFRAESTRUCTURA'};
  const FAIRY = {q:'Fairy', label:'Fairy', units:1, fallback:3.5, maxAdds:2, segmento:'INFRAESTRUCTURA', destino:'INFRAESTRUCTURA'};
  const BOLSAS = {q:'Bolsas Basura Grandes 240L', label:'Bolsas Basura Grandes 240L', units:1, fallback:4.5, maxAdds:2, segmento:'INFRAESTRUCTURA', destino:'INFRAESTRUCTURA'};
  const LAVAVAJILLAS = {q:'Lavavajillas', label:'Lavavajillas', units:1, fallback:7, maxAdds:1, segmento:'INFRAESTRUCTURA', destino:'INFRAESTRUCTURA'};
  const ABRILLANTADOR = {q:'Abrillantador lavavajillas', label:'Abrillantador lavavajillas', units:1, fallback:5, maxAdds:1, segmento:'INFRAESTRUCTURA', destino:'INFRAESTRUCTURA'};
  const JABON_MANOS = {q:'Jabon de manos', label:'Jabón lavamanos', units:1, fallback:2.5, maxAdds:2, segmento:'INFRAESTRUCTURA', destino:'INFRAESTRUCTURA'};
  const infraCycles = initialRatio >= 0.50 ? [[PAPEL_SEC], [FAIRY], [BOLSAS], [LAVAVAJILLAS], [ABRILLANTADOR], [JABON_MANOS]] : [];
  const cycles = [
    [BEER],
    [COKE, RON, WJB, ICE],
    [COKE_ZERO, RON, WJB, ICE],
    [COKE_ZZ, RON, WJB, ICE],
    [TONIC, GIN, GIN, ICE],
    [FANTA_N, ICE],
    [FANTA_L, ICE],
    [SPRITE, BRUGAL, ICE],
    ...infraCycles
  ];
  let added = 0, guard = 0;
  while (currentRatio() > 0.10 + 0.005 && guard < 80) {
    guard += 1;
    let didCycle = false;
    for (const cycle of cycles) {
      if (currentRatio() <= 0.10 + 0.005) break;
      let cycleAdded = false;
      for (const item of cycle) {
        if (currentRatio() <= 0.10 + 0.005) break;
        if (addItem(item, cycle.map(x=>x.label).join(' + '))) { added += 1; cycleAdded = true; didCycle = true; }
      }
      if (cycleAdded) break;
    }
    if (!didCycle) break;
  }
  if (added) {
    const finalTotal = planCompraTotal(out);
    const capped = currentRatio() > 0.10 + 0.005;
    notes.push(`Ajuste automático de saldo proporcional: saldo inicial ${round(initialSaldo,2)} € (${round(initialRatio*100,1)}% sobre compras). Se han añadido/reforzado ${added} línea(s) manteniendo proporción: pack de Coca-Cola acompaña ron y whisky; pack de tónica acompaña 2 ginebras; cada ciclo añade saco de hielo de 5 bolsas de 2 kg; si el saldo inicial supera el 50% sobre compras se incorporan elementos INFRAESTRUCTURA - INFRAESTRUCTURA imprescindibles. Compra final ${round(finalTotal,2)} € y saldo ${round(income-finalTotal,2)} €${capped ? '; se para por topes operativos para evitar inflados' : ''}.`);
  }
  return { rows: out, notes };
}



function planClampOperationalUnitsFix40(rows, form, state = {}) {
  const openCtx = planOpenConsumptionContextFix47(form);
  const people = Math.max(1, num(openCtx.asistentesBase) || num(form?.personas) || 30);
  const days = Math.max(1, num(form?.dias) || 1);
  const out = arr(rows).map(r => ({...r}));
  const maxByPrompt = {
    beer: 504,
    coca: 504,
    fantaNaranja: 168,
    fantaLimon: 192,
    tonica: 120,
    spriteLata: 24,
    spriteBotella2l: 10,
    otras: 24,
    panBarra: Math.ceil(people * 0.55) * days,
    bbqKg: round(people * 0.3 * days, 2)
  };
  function nameOf(r){ return normPlanKey(r?.productName || r?.producto || ''); }
  function isCompra(r){ return r && r.tipo === 'COMPRA' && r.include !== false && num(r.unidades) > 0; }
  function addReason(r, text){ r.reason = trim(r.reason || '') + ' ' + text; }
  function stepFor(predicateName){ return /beer|coca|fanta|tonica|spriteLata|otras/.test(predicateName) ? 24 : (/pan/.test(predicateName) ? 1 : 0.1); }
  function roundDownStep(v, step){ if(step >= 1) return Math.max(0, Math.floor(v / step) * step); return Math.max(0, Math.floor(v * 10) / 10); }
  function capGroup(label, predicate, cap, step, reason){
    const items = out.map((r,i)=>({r,i})).filter(x => isCompra(x.r) && predicate(nameOf(x.r), x.r));
    const total = items.reduce((sum,x)=>sum + num(x.r.unidades), 0);
    if(!(cap > 0) || total <= cap + 0.001) return;
    let remaining = cap;
    items.forEach((x,pos) => {
      const old = num(x.r.unidades);
      let next;
      if(pos === items.length - 1) next = remaining;
      else next = Math.min(remaining, roundDownStep(old * cap / total, step || 1));
      if(step >= 1 && next > 0 && next < step && remaining >= step) next = step;
      next = Math.max(0, round(next, 2));
      remaining = Math.max(0, round(remaining - next, 2));
      if(next < old - 0.001){
        x.r.unidades = next;
        x.r.aComprarCalculado = next;
        x.r.necesidadTotal = Math.min(num(x.r.necesidadTotal || old), cap);
        if(next <= 0) x.r.include = false;
        addReason(x.r, `Ajustado por tope operativo FIX45 ${label}: máximo ${cap} (${reason}).`);
      }
    });
  }
  capGroup('cerveza lata/botellín', n => /cerveza/.test(n) && !/barril/.test(n), maxByPrompt.beer, 24, 'sumando todas las marcas/formato lata o botellín');
  capGroup('Coca-Cola lata', n => /coca\s*cola|cocacola/.test(n) && !/botella.*2\s*l/.test(n), maxByPrompt.coca, 24, 'normal, Zero y Zero-Zero sumadas');
  capGroup('Fanta naranja', n => /fanta/.test(n) && /naranja/.test(n), maxByPrompt.fantaNaranja, 24, '7 packs');
  capGroup('Fanta limón', n => /fanta/.test(n) && /limon|limón/.test(n), maxByPrompt.fantaLimon, 24, '8 packs');
  capGroup('tónica', n => /tonica|tónica|schweppes|sweep/.test(n), maxByPrompt.tonica, 24, '5 packs');
  capGroup('Sprite lata 33cl', n => /sprite/.test(n) && !/botella|2\s*l/.test(n), maxByPrompt.spriteLata, 24, '1 pack');
  capGroup('Sprite botella 2l', n => /sprite/.test(n) && (/BOTELLA/.test(n) || /2\s*L/.test(n)), maxByPrompt.spriteBotella2l, 1, '10 botellas');
  capGroup('otras bebidas', n => /bitter|beeter|kas|tinto\s+de\s+verano|aquarius|nestea/.test(n), maxByPrompt.otras, 24, 'otras bebidas limitadas');
  capGroup('pan barra', n => /pan/.test(n) && /barra|baguette/.test(n), maxByPrompt.panBarra, 1, '0,55 barras/persona/día');
  capGroup('carnes barbacoa', n => /(panceta|chorizo|lomo|morcilla|chuleta|venao|venado)/.test(n), maxByPrompt.bbqKg, 0.1, '300 g/persona/día sumando carnes de barbacoa');

  function findOrCreate(label, units, familyReason){
    if(!(units > 0)) return;
    const maps = planBuildMaps(state || {});
    const prod = planFindProductLoose(label, maps) || {};
    const normLabel = normPlanKey(label);
    const row = out.find(r => isCompra(r) && (normPlanKey(r.productName || r.producto || '') === normLabel || planProductAliasKey(r.productName || r.producto || '') === planProductAliasKey(label)));
    if(row){
      row.unidades = units; row.aComprarCalculado = units; row.include = true;
      addReason(row, `Reparto proporcional FIX45 de bebidas alcohólicas (${familyReason}).`);
      return;
    }
    out.push({ key:`fix45-spirit:${out.length}:${normLabel}`, include:true, tipo:'COMPRA', productId:trim(prod.id || ''), productName:trim(prod.nombre || label), producto:trim(prod.nombre || label), segmento:trim(prod.segmento || 'BEBIDA'), destino:trim(prod.destino || 'CUBATAS'), unidades:units, precio:planReasonablePlanPrice(prod.nombre || label, prod.defaultPrecio ?? prod.precio ?? 0), tiendaId:trim(prod.defaultTiendaId || form?.defaultStoreId || ''), responsableId:trim(form?.defaultResponsibleId || ''), ticketDonacion:'', donorRef:'', confidence:'Reparto proporcional FIX45', reason:`Reparto proporcional FIX45 de bebidas alcohólicas (${familyReason}).` });
  }
  function rebalanceFamily(familyName, predicate, desired){
    const items = out.filter(r => isCompra(r) && predicate(nameOf(r), r));
    const total = Math.round(items.reduce((sum,r)=>sum + num(r.unidades), 0));
    if(total <= 1) return;
    items.forEach(r => { r.unidades = 0; r.aComprarCalculado = 0; r.include = false; addReason(r, `Sustituido por reparto proporcional FIX45 ${familyName}.`); });
    const weights = desired.map(x=>x.weight);
    const split = planSplitWholeFix45(total, weights);
    desired.forEach((d,i) => { if(split[i] > 0) findOrCreate(d.label, split[i], `${familyName}: ${d.note}`); });
  }
  rebalanceFamily('ron', n => /ron/.test(n), [
    {label:'Ron BARCELO Añejo 0.7 L', weight:60, note:'60% Barceló'},
    {label:'Ron BRUGAL Añejo 0.7L', weight:30, note:'30% Brugal'},
    {label:'Ron Puerto de Indias', weight:10, note:'10% otros/residual'}
  ]);
  rebalanceFamily('whisky', n => /whisky|wiski|j\.?b\b|jb\b|dyc|walker|jhony|johnnie|jonie/.test(n), [
    {label:'Whisky 5 Años J.B Botella 0.7 L', weight:60, note:'60% JB'},
    {label:'Whisky DYC 1L. 40°', weight:30, note:'30% DYC 1L'},
    {label:'Whisky JHONY WALKER 0.7 L. 40°', weight:10, note:'10% Jhonnie Walker'}
  ]);
  rebalanceFamily('ginebra', n => /ginebra|gin|beefeater|larios|tanquer|tanker|puerto\s+de\s+indias/.test(n), [
    {label:'Gin BEEFEATER 0.7 L. 43°', weight:55, note:'55% Beefeater'},
    {label:'Gin LARIOS 1 L. 40°', weight:30, note:'30% Larios 1L'},
    {label:'GINEBRA Tanqueray', weight:15, note:'15% Tanqueray/residual'}
  ]);
  return out.filter(r => !(r?.tipo === 'COMPRA' && num(r.unidades) <= 0 && r.include === false));
}

function planReadableNotes(rawNotes, rows, form, budgetNotes) {
  const people = Math.max(1, num(form?.personas) || 25);
  const days = Math.max(1, num(form?.dias) || 1);
  const total = planCompraTotal(rows);
  const per = total / people;
  const title = trim(form?.title) || 'evento nuevo';
  const useful = arr(rawNotes)
    .map(n => trim(n))
    .filter(Boolean)
    // Evita mezclar mensajes de Zuzu sobre costes anteriores con el coste final postprocesado.
    .filter(n => !/(coste|persona|25|35|sobredimensionad|reajust|control de realidad|precio orientativo|dentro del rango)/i.test(n))
    .slice(0, 2);
  const donCount = arr(rows).filter(r => r?.tipo === 'DONACION' && r.include !== false).length;
  const donUnits = arr(rows).filter(r => r?.tipo === 'DONACION' && r.include !== false).reduce((sum, r) => sum + num(r.unidades), 0);
  const compraCount = arr(rows).filter(r => r?.tipo === 'COMPRA' && r.include !== false).length;
  const geminiFailed = arr(rawNotes).some(n => /Zuzu no pudo|no devolvi[oó]|tard[oó] demasiado|timeout|aborted|cuota|quota/i.test(trim(n)));
  const base = (geminiFailed && compraCount === 0)
    ? `Atención: Zuzu no ha devuelto compras estructuradas para “${title}” (${people} personas, ${days} día${days === 1 ? '' : 's'}). ControlEvent conserva ${donCount} donaciones/existencias detectadas, pero NO da por calculada la compra: vuelve a generar o revisa la traza.`
    : `Resumen claro: Zuzu ha preparado una propuesta revisable para “${title}” (${people} personas, ${days} día${days === 1 ? '' : 's'}). Compra prevista final: ${round(total,2)} € (${round(per,2)} €/persona). Donaciones/existencias detectadas: ${donCount} líneas / ${round(donUnits,2)} ud.; solo se descuentan si están confirmadas por el prompt o por histórico real.`;
  const guide = `Para afinar de verdad, usa el campo de información como una conversación guiada: asistentes que beben cerveza, asistentes que toman cubatas, niños/no bebedores, comidas incluidas, presupuesto objetivo y existencias/donaciones confirmadas.`;
  return [base, ...arr(budgetNotes).map(n => trim(n)).filter(Boolean), ...useful, guide].filter(Boolean);
}
function planPostProcessPlanningRows(rows, form, state) {
  const maps = planBuildMaps(state);
  const promptHintsHf21 = planConfirmedPromptDonationHintsHf21(form, state);
  const hintMapHf21 = new Map(promptHintsHf21.map(h => [h.key, h]));
  const grouped = new Map();
  const out = arr(rows).map((r, idx) => planCanonicalizeRowProduct({...r, key:r.key || `plan:${idx}`}, maps));
  // HOTFIX21: si una línea del prompt confirmado quedó como compra, se reconvierte a DONACION.
  out.forEach(row => {
    const prod = row.productId ? maps.products.get(trim(row.productId)) : planFindProductLoose(row.productName || row.producto || '', maps);
    const k = trim(prod?.id || row.productId) ? `id:${trim(prod?.id || row.productId)}` : (planProductAliasKey(row.productName || row.producto || '') || normPlanKey(row.productName || row.producto || ''));
    const h = hintMapHf21.get(k);
    if (h && row.tipo !== 'DONACION') {
      row.tipo = 'DONACION';
      row.productId = h.productId || row.productId || '';
      row.productName = h.productName || row.productName;
      row.segmento = h.segmento || row.segmento;
      row.destino = h.destino || row.destino;
      row.unidades = h.unidades;
      row.precio = h.precio || row.precio;
      row.ticketDonacion = h.ticketDonacion;
      row.donorRef = h.donorRef;
      row.tiendaId = h.tiendaId;
      row.responsableId = h.responsableId;
      row.explicitPromptDonation = true;
      row.explicitConfirmedDonation = true;
      row.explicitPromptStrictHf12 = true;
      row.reason = `Donación/existencia confirmada por prompt (${h.donorLabel}).`;
    }
  });
  // Añade cualquier donación del prompt que todavía no exista en rows.
  promptHintsHf21.forEach((h, pos) => {
    const already = out.some(row => {
      const prod = row.productId ? maps.products.get(trim(row.productId)) : planFindProductLoose(row.productName || row.producto || '', maps);
      const k = trim(prod?.id || row.productId) ? `id:${trim(prod?.id || row.productId)}` : (planProductAliasKey(row.productName || row.producto || '') || normPlanKey(row.productName || row.producto || ''));
      return k === h.key && row.tipo === 'DONACION';
    });
    if (!already) out.push({
      key:`prompt-hf21-missing:${pos}:${h.key}`,
      include:true,
      tipo:'DONACION',
      productId:h.productId,
      productName:h.productName,
      segmento:h.segmento,
      destino:h.destino,
      unidades:h.unidades,
      precio:h.precio,
      tiendaId:h.tiendaId,
      responsableId:h.responsableId,
      ticketDonacion:h.ticketDonacion,
      donorRef:h.donorRef,
      explicitPromptDonation:true,
      explicitConfirmedDonation:true,
      explicitPromptStrictHf12:true,
      reason:`Donación/existencia confirmada por prompt (${h.donorLabel}).`
    });
  });
  out.forEach((r, idx) => {
    const k = trim(r.productId) ? `id:${trim(r.productId)}` : (planProductAliasKey(r.productName || r.producto || '') || normPlanKey(r.productName || r.producto || r.productId || `p${idx}`));
    const g = grouped.get(k) || {key:k, rows:[], donation:0, purchase:0, needHint:0, productName:r.productName || r.producto || '', productId:r.productId || '', segment:r.segmento, destino:r.destino};
    g.rows.push(idx);
    const units = num(r.unidades);
    if (r.tipo === 'DONACION') g.donation += units; else g.purchase += units;
    if (num(r.necesidadTotal) > g.needHint) g.needHint = num(r.necesidadTotal);
    if ((r.productName || '').length > (g.productName || '').length) { g.productName = r.productName || g.productName; g.segment = r.segmento || g.segment; g.destino = r.destino || g.destino; }
    if (!g.productId && r.productId) g.productId = r.productId;
    if (r.tipo === 'COMPRA' && r.productId) g.productId = r.productId;
    grouped.set(k, g);
  });
  for (const g of grouped.values()) {
    const prod = g.productId ? maps.products.get(trim(g.productId)) : planFindProductLoose(g.productName, maps);
    const pname = trim(prod?.nombre || g.productName);
    const hasExplicitDonation = g.rows.some(i => out[i]?.explicitPromptDonation === true);
    // Si hay una donación explícita del prompt y no viene necesidadTotal fiable, la compra existente
    // se interpreta como necesidad total calculada, NO como compra adicional sobre lo donado.
    // Ej.: Anchoas donadas 1 y Zuzu calcula 2 => necesidad 2, compra 1; no compra 2.
    const currentNeed = hasExplicitDonation
      ? (g.needHint > 0 ? Math.max(g.needHint, g.donation) : Math.max(g.donation, g.purchase || g.donation))
      : (g.needHint > 0 ? g.needHint : (g.donation + g.purchase));
    const rawNeed = (hasExplicitDonation && g.purchase <= 0 && g.needHint <= 0)
      ? currentNeed
      : planMinimumNeed(pname, form, currentNeed);
    const need = planDisplayNeedAfterRounding(pname, rawNeed);
    // HOTFIX20: si solo hay donación/existencia explícita y no hay cálculo externo de necesidad,
    // no se inventa compra por déficit para esa misma línea.
    let buy = (hasExplicitDonation && g.purchase <= 0 && g.needHint <= 0) ? 0 : planBuyAfterDonation(pname, need, g.donation);
    const price = planReasonablePlanPrice(pname, prod?.defaultPrecio ?? prod?.precio ?? 0);
    let firstPurchase = g.rows.find(i => out[i]?.tipo === 'COMPRA');
    if (buy > 0 && firstPurchase === undefined) {
      firstPurchase = out.length;
      out.push({
        key:`auto-deficit:${g.key}`,
        include:true,
        tipo:'COMPRA', productId:trim(prod?.id || g.productId), productName:pname, segmento:trim(prod?.segmento || g.segment || 'Sin segmento'), destino:trim(prod?.destino || g.destino || 'Sin destino'),
        unidades:buy, precio:price, tiendaId:trim(form.defaultStoreId), responsableId:trim(form.defaultResponsibleId), ticketDonacion:'', donorRef:'', confidence:'Déficit calculado',
        reason:'Compra creada automáticamente como déficit tras restar existencias/donaciones.'
      });
      g.rows.push(firstPurchase);
    }
    g.rows.forEach(i => {
      if (!out[i]) return;
      out[i].necesidadTotal = round(need,2);
      out[i].donadoTotal = round(g.donation,2);
      out[i].aComprarCalculado = round(buy,2);
      if (out[i].tipo === 'DONACION') out[i].precio = planReasonablePlanPrice(pname, out[i].precio || price);
    });
    if (firstPurchase !== undefined && out[firstPurchase]) {
      out[firstPurchase].include = buy > 0;
      out[firstPurchase].unidades = buy;
      out[firstPurchase].precio = price;
      out[firstPurchase].tiendaId = trim(out[firstPurchase].tiendaId || form.defaultStoreId);
      out[firstPurchase].responsableId = trim(out[firstPurchase].responsableId || form.defaultResponsibleId);
      out[firstPurchase].necesidadTotal = round(need,2);
      out[firstPurchase].donadoTotal = round(g.donation,2);
      out[firstPurchase].aComprarCalculado = round(buy,2);
    }
  }
  return out.filter(r => r.productId || r.productName);
}

function planRefFromLooseLabel(label, maps, preferred = 'P') {
  const direct = planDonorRefFromLabel(label, maps);
  if (direct) return direct;
  const key = normPlanKey(label);
  if (!key) return '';
  const scan = preferred === 'T' ? maps.stores : maps.people;
  let best = null, bestScore = 0;
  for (const row of scan.values()) {
    const rk = normPlanKey(row?.nombre);
    if (!rk) continue;
    let score = 0;
    if (rk === key) score += 100;
    if (rk.includes(key) || key.includes(rk)) score += 30;
    key.split(' ').filter(t=>t.length>=3).forEach(t => { if (rk.includes(t)) score += Math.min(8,t.length); });
    if (score > bestScore) { best = row; bestScore = score; }
  }
  if (best && bestScore >= 12) return (preferred === 'T' ? 'T:' : 'P:') + best.id;
  return '';
}
function planFindPersonLoose(label, maps) {
  const key = normPlanKey(label);
  if (!key) return null;
  if (maps.personByName.has(key)) return maps.personByName.get(key);
  let best = null, scoreBest = 0;
  for (const p of maps.people.values()) {
    const pk = normPlanKey(p?.nombre);
    if (!pk) continue;
    let score = 0;
    if (pk === key) score += 100;
    if (pk.includes(key) || key.includes(pk)) score += 30;
    key.split(' ').filter(t=>t.length>=3).forEach(t => { if (pk.includes(t)) score += Math.min(7,t.length); });
    if (score > scoreBest) { best = p; scoreBest = score; }
  }
  return scoreBest >= 12 ? best : null;
}
function planFindStoreLoose(label, maps) {
  const key = normPlanKey(label);
  if (!key) return null;
  if (maps.storeByName.has(key)) return maps.storeByName.get(key);
  let best = null, scoreBest = 0;
  for (const t of maps.stores.values()) {
    const tk = normPlanKey(t?.nombre);
    if (!tk) continue;
    let score = 0;
    if (tk === key) score += 100;
    if (tk.includes(key) || key.includes(tk)) score += 30;
    key.split(' ').filter(x=>x.length>=3).forEach(x => { if (tk.includes(x)) score += Math.min(7,x.length); });
    if (score > scoreBest) { best = t; scoreBest = score; }
  }
  return scoreBest >= 12 ? best : null;
}
function planExtractBracket(text, names) {
  const raw = trim(text || '');
  for (const name of names) {
    const safe = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let m = raw.match(new RegExp('\\[\\s*' + safe + '\\s*[:=]\\s*([^\\]\\n]+)\\]', 'i'));
    if (m) return trim(m[1] || '').replace(/[\]\)\.。]+$/,'').trim();
    m = raw.match(new RegExp(safe + '\\s*[:=]\\s*["“]([^"”]+)["”]', 'i'));
    if (m) return trim(m[1] || '').replace(/[\]\)\.。]+$/,'').trim();
    m = raw.match(new RegExp(safe + '\\s*[:=]\\s*([^\\]\\);,\\n]+)', 'i'));
    if (m) return trim(m[1] || '').replace(/[\]\)\.。]+$/,'').trim();
  }
  return '';
}
function planMentionedStore(textBlock, maps) {
  const hay = normPlanKey(textBlock || '');
  if (!hay) return null;
  return [...maps.stores.values()]
    .filter(t => normPlanKey(t?.nombre).length >= 3)
    .sort((a,b)=>normPlanKey(b?.nombre).length - normPlanKey(a?.nombre).length)
    .find(t => hay.includes(normPlanKey(t?.nombre))) || null;
}
function planMentionedPerson(textBlock, maps) {
  const hay = normPlanKey(textBlock || '');
  if (!hay) return null;
  return [...maps.people.values()]
    .filter(pe => normPlanKey(pe?.nombre).length >= 3)
    .sort((a,b)=>normPlanKey(b?.nombre).length - normPlanKey(a?.nombre).length)
    .find(pe => hay.includes(normPlanKey(pe?.nombre))) || null;
}
function planCleanExplicitProductText(text) {
  let s = trim(text || '').replace(/^\s*[•\-\*]\s*/, '');
  const donorPrefix = s.match(/^([^:\n]{2,90})\s*:\s*([^:\n]{2,240}:\s*.+)$/i);
  if (donorPrefix) s = trim(donorPrefix[2]);
  if (s.includes(':')) s = s.slice(0, s.lastIndexOf(':'));
  s = s.replace(/^\d+(?:[,.]\d+)?\s*(?:ud\.?|uds\.?|unidades|kg\.?|kilos?|l\.?|litros?|botellas?|latas?|rollos?|sacos?|packs?|paquetes?|barriles?|botellines?)?\s+(?:de\s+)?/i, '');
  s = s.replace(/\(([^)]*)\)/g, (m, inner) => {
    const t = trim(inner || '');
    if (!t) return ' ';
    if (/^(?:bolsa|pack|paquete|caja)\s+\d/i.test(t)) return ' ';
    return ' ' + t + ' ';
  });
  s = s.replace(/\b(?:bolsa|pack|packs|paquete|paquetes)\s*(?:de|x)?\s*\d+(?:[,.]\d+)?\s*(?:ud\.?|uds\.?|unidades|latas|botellines|botellas|botes)?\b/ig, ' ');
  s = s.replace(/\bpieza\s+\d+(?:[,.]\d+)?\s*kg\b/ig, ' ');
  s = s.replace(/\bBEETER\b/ig, 'Bitter');
  s = s.replace(/\bWISKI\b/ig, 'Whisky');
  s = s.replace(/\bJHONY\b/ig, 'Jhony');
  s = s.replace(/\bLAVAMANOS\b/ig, 'manos');
  s = s.replace(/\s+/g, ' ');
  return trim(s.replace(/[.;]+$/,''));
}
function planExplicitUnits(text) {
  const raw = trim(text || '');
  const tail = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : raw;
  let m = tail.match(/(\d+(?:[,.]\d+)?)\s*(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)\s*(?:ud\.?|uds\.?|unidades|latas|botellines|botellas|botes)?/i);
  if (m) return Math.max(0, round(num(m[1]) * num(m[2]), 2));
  m = tail.match(/(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
  if (m) return Math.max(0, round(num(m[1]), 2));
  m = tail.match(/(\d+(?:[,.]\d+)?)/);
  if (m) return Math.max(0, num(m[1]));
  m = raw.match(/^\s*[•\-]?\s*(\d+(?:[,.]\d+)?)/);
  if (m) return Math.max(0, num(m[1]));
  return 1;
}
function planBlockBetween(raw, startRe, endReList) {
  const m = raw.match(startRe);
  if (!m) return '';
  const start = m.index + m[0].length;
  let end = raw.length;
  for (const re of endReList) {
    const sub = raw.slice(start).search(re);
    if (sub >= 0) end = Math.min(end, start + sub);
  }
  return raw.slice(start, end);
}
function planExplicitItemLines(block) {
  const out = [];
  trim(block).split(/\n+/).forEach(line => {
    const s = trim(line);
    if (!s || /^\s*[•\-\*]?\s*COMPRA\s*:/i.test(s)) return;
    if (/\b(responsable|donante|tienda|tipo\s+donaci[oó]n)\b\s*:/i.test(s) && !/\d/.test(s)) return;
    const m = s.match(/^\s*[•\-\*]\s*(.+)$/);
    if (m) { out.push(m[1]); return; }
    // Soporta líneas sin guion: "Anchoas: 1", "Rollo papel secamanos: 1", "1 kg de chorizo"
    // y líneas con donante delante: "Pocholo y Celes: Anchoas: 1".
    if (/^[A-ZÁÉÍÓÚÑ0-9][^:\n]{1,140}:\s*(?:\d|un|una|uno)/i.test(s)
      || /^[^:\n]{2,90}:\s*[^:\n]{2,160}:\s*(?:\d|un|una|uno)/i.test(s)
      || /^\d+(?:[,.]\d+)?\s*(?:ud\.?|unidades|kg\.?|kilos?|l\.?|litros?|botellas?|latas?|rollos?|sacos?|packs?|paquetes?|barriles?|botellines?)?\s+\D{2,}/i.test(s)) out.push(s);
  });
  return out.map(x => trim(x).replace(/^\s*[•\-\*]\s*/, '')).filter(Boolean);
}
function planExplicitDonationSections(info) {
  const raw = trim(info || '').replace(/\r/g, '');
  if (!raw) return [];
  const headerRe = /(?:^|\n)[^\n]*(?:(?:PRODUCTO\s+EN\s+LA\s+PE[NÑ]A)|PRODUCTOS?\s+DONADOS?|DONACIONES?|DONACION|EXISTENCIAS?|YA\s+TENEMOS|MATERIAL\s+DONADO)[^\n]*/gi;
  const matches = [];
  let m;
  while ((m = headerRe.exec(raw))) matches.push({ index:m.index, end:headerRe.lastIndex, header:trim(m[0]) });
  return matches.map((h, idx) => {
    let end = idx + 1 < matches.length ? matches[idx + 1].index : raw.length;
    const tail = raw.slice(h.end);
    const stopRe = /\n\s*(?:[•\-]\s*)?(?:COMPRA|COMPRAS|A\s+COMPRAR|DETALLES\s+PARA|COMIDAS\s+INCLUIDAS|CRITERIO\s+DE\s+C[ÁA]LCULO|RESULTADO\s+QUE\s+QUIERO|OBJETIVO)\s*:/i;
    const stop = tail.search(stopRe);
    if (stop >= 0) end = Math.min(end, h.end + stop);
    const block = raw.slice(h.end, end);
    const typeMatch = (h.header + '\n' + block.slice(0, 250)).match(/DONADO\s+(SOCIO|TIENDA|OTROS)/i);
    const ticket = typeMatch ? `DONADO ${typeMatch[1].toUpperCase()}` : (/\btienda\b|\bdespensa\b/i.test(h.header) ? 'DONADO TIENDA' : 'DONADO SOCIO');
    return { header:h.header, block, ticketDonacion:ticket };
  }).filter(x => planExplicitItemLines(x.block).length);
}
function planExplicitDonationRowsFromPrompt(form, state) {
  const info = planPromptRawText(form).replace(/\r/g, '');
  if (!trim(info)) return [];
  const maps = planBuildMaps(state);
  const rowsOut = [];
  const seen = new Set();

  function donationTypeFromText(txt) {
    const n = normPlanKey(txt || '');
    if (/donado\s+tienda|donacion\s+de\s+tienda|donaci[oó]n\s+de\s+tienda|donaciones\s+de\s+tienda/.test(n)) return 'DONADO TIENDA';
    if (/donado\s+otros|donacion\s+de\s+otros|donaci[oó]n\s+de\s+otros|donaciones\s+de\s+otros/.test(n)) return 'DONADO OTROS';
    if (/producto\s+en\s+la\s+pe[nñ]a|donado\s+socio|donaciones\s+de\s+socios|donacion\s+de\s+socios/.test(n)) return 'DONADO SOCIO';
    if (/tienda/.test(n)) return 'DONADO TIENDA';
    if (/otros|externo/.test(n)) return 'DONADO OTROS';
    return 'DONADO SOCIO';
  }
  function headerMeta(line, prev = {}) {
    const h = trim(line || '');
    const out = { ...(prev || {}) };
    const type = donationTypeFromText(h);
    if (/donado|donaci[oó]n|producto\s+en\s+la\s+pe[nñ]a|existenc|ya\s+tenemos/i.test(h)) out.ticket = type;
    const bracketDonor = planExtractBracket(h, ['Donante']);
    const bracketResp = planExtractBracket(h, ['Responsable']);
    const bracketStore = planExtractBracket(h, ['Tienda']);
    if (bracketDonor) out.donor = bracketDonor;
    if (bracketResp) out.responsable = bracketResp;
    if (bracketStore) out.tienda = bracketStore;

    // Soporta: "Donado socio - Peña El Arrastre / Responsable Colty"
    let m = h.match(/donado\s+(socio|tienda|otros)\s*[-–:]\s*([^\n\[]+)/i)
      || h.match(/donaci[oó]n\s+de\s+(socio|socios|tienda|otros)\s*[-–:]\s*([^\n\[]+)/i)
      || h.match(/donaciones\s+de\s+(socios|tienda|otros)\s*[-–:]\s*([^\n\[]+)/i);
    if (m) {
      const kind = normPlanKey(m[1] || '');
      out.ticket = /tienda/.test(kind) ? 'DONADO TIENDA' : (/otro/.test(kind) ? 'DONADO OTROS' : 'DONADO SOCIO');
      const rest = trim(m[2] || '');
      const parts = rest.split('/').map(x => trim(x)).filter(Boolean);
      // FIX35: si aparece un encabezado explícito de donación, ese encabezado manda.
      // En FIX34 se heredaba "Existencias" desde el encabezado general y no se sustituía.
      if (parts[0]) out.donor = parts[0].replace(/responsable\s*[:=]?.*$/i, '').trim();
      const respPart = parts.find(x => /responsable/i.test(x));
      if (respPart) out.responsable = trim(respPart.replace(/responsable\s*[:=]?/i, ''));
      if (!out.responsable && out.donor && /producto\s+en\s+la\s+pe[nñ]a/i.test(h)) out.responsable = trim(form.defaultResponsibleName || 'Colty');
    }
    if (!out.donor && /producto\s+en\s+la\s+pe[nñ]a/i.test(h)) out.donor = 'Peña El Arrastre';
    if (!out.responsable && /producto\s+en\s+la\s+pe[nñ]a/i.test(h)) out.responsable = trim(form.defaultResponsibleName || 'Colty');
    if (!out.ticket) out.ticket = 'DONADO SOCIO';
    if (!out.donor && /^\s*(?:[-*•]\s*)?(?:existencias?|ya\s+tenemos)\b/i.test(h)) out.donor = 'Existencias';
    if (!out.donor) out.donor = out.ticket === 'DONADO TIENDA' ? 'Tienda donante' : (out.ticket === 'DONADO OTROS' ? 'Donante externo' : 'Donante indicado');
    if (!out.responsable) out.responsable = trim(form.defaultResponsibleName || out.donor);
    if (!out.tienda && out.ticket === 'DONADO TIENDA') out.tienda = out.donor;
    return out;
  }
  function isDonationHeader(line) {
    const l = line || '';
    // FIX38: "Donaciones y existencias confirmadas" es un título de sección, no un donante.
    // En FIX36/FIX37 activaba el donante genérico "Existencias" y se perdían Peña/Pocholo/etc.
    if (/^\s*(?:[-*•]\s*)?DONACIONES?\s+Y\s+EXISTENCIAS\s+CONFIRMADAS\b/i.test(l)) return false;
    return /^\s*(?:[-*•]\s*)?(?:PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?\s+(?:DE\s+SOCIOS?|DE\s+TIENDA|DE\s+OTROS)|DONACI[OÓ]N\s+DE\s+(?:SOCIOS?|TIENDA|OTROS)|DONACION\s+DE\s+(?:SOCIOS?|TIENDA|OTROS)|DONADO\s+(?:SOCIO|TIENDA|OTROS)\s*[-–:]|EXISTENCIAS?\b|YA\s+TENEMOS\b|PRODUCTOS?\s+DONADOS?|MATERIAL\s+DONADO)\b/i.test(l);
  }
  function isHardStop(line) {
    return /^\s*(?:PISTAS?\s+DE\s+COMPRA|REGLAS?\s+FINALES|CRITERIOS?\s+DE\s+C[ÁA]LCULO|DATOS\s+PARA\s+EL\s+C[ÁA]LCULO|DESCRIPCI[OÓ]N\s+CONCEPTUAL|OBJETIVO\s+DEL\s+EVENTO)\b/i.test(line || '');
  }
  function isProductLine(line) {
    const s = trim(line || '');
    if (!s || /^PRODUCTOS?\s*:?$/i.test(s)) return false;
    if (/^(?:tratar\s+todo|donante|responsable|tienda)\b/i.test(s)) return false;
    if (/^\s*[•\-*]\s*[^:\n]{2,260}:\s*(?:\d|un|una|uno|pack|paquete|caja|barril)/i.test(line || '')) return true;
    if (/^[^:\n]{2,260}:\s*(?:\d|un|una|uno|pack|paquete|caja|barril)/i.test(s)) return true;
    return /^\s*[•\-*]\s*\d+(?:[,.]\d+)?\s*(?:ud\.?|uds\.?|unidades|kg\.?|kilos?|l\.?|litros?|botellas?|latas?|rollos?|sacos?|packs?|paquetes?|barriles?|botellines?)?\s+\D{2,}/i.test(line || '');
  }
  function pushItem(itemRaw, meta) {
    const productoTexto = planCleanExplicitProductText(itemRaw);
    if (!productoTexto || /^(productos?|donante|responsable|tratar\s+todo|bloque)$/i.test(productoTexto)) return;
    const unidades = Math.max(0.01, planExplicitUnits(itemRaw));
    const k = [meta.ticket, normPlanKey(meta.donor), normPlanKey(productoTexto), unidades].join('|');
    if (seen.has(k)) return;
    seen.add(k);
    const prod = planFindProductLoose(productoTexto, maps) || {};
    const donorKind = meta.ticket === 'DONADO TIENDA' ? 'T' : 'P';
    const donorRef = planRefFromLooseLabel(meta.donor, maps, donorKind) || (meta.ticket === 'DONADO TIENDA' ? planRefFromLooseLabel(meta.tienda || meta.donor, maps, 'T') : '') || trim(meta.donor);
    const rowResp = planFindPersonLoose(meta.responsable, maps);
    const rowStore = planFindStoreLoose(meta.tienda || meta.donor, maps);
    rowsOut.push({
      key:`prompt-don-fix35:${rowsOut.length}:${trim(prod?.id || productoTexto)}`,
      include:true,
      tipo:'DONACION',
      productId:trim(prod?.id || ''),
      productName:trim(prod?.nombre || productoTexto),
      segmento:trim(prod?.segmento || 'Sin segmento'),
      destino:trim(prod?.destino || 'Sin destino'),
      unidades:round(unidades, 2),
      precio:planReasonablePlanPrice(prod?.nombre || productoTexto, prod?.defaultPrecio ?? prod?.precio ?? 0),
      tiendaId:trim(rowStore?.id || form.defaultStoreId || ''),
      responsableId:trim(rowResp?.id || form.defaultResponsibleId || ''),
      ticketDonacion:meta.ticket,
      donorRef,
      confidence:'Prompt explícito',
      explicitPromptDonation:true,
      explicitConfirmedDonation:true,
      explicitPromptStrictHf12:true,
      reason:`Existencia/donación indicada literalmente por el usuario (${meta.donor}).`
    });
  }

  let active = null;
  info.split(/\n/).forEach(rawLine => {
    const line = trim(rawLine);
    if (!line) return;
    if (isHardStop(line)) { active = null; return; }
    if (isDonationHeader(line)) { active = headerMeta(line, active || {}); return; }
    if (active && (/Tratar\s+todo\s+este\s+bloque\s+como\s+DONADO/i.test(line) || /Tratar\s+como\s+DONADO/i.test(line) || /\[Donante:|\[Responsable:/i.test(line) || /^responsable\s*[:=]/i.test(line) || /^donante\s*[:=]/i.test(line))) { active = headerMeta(line, active); return; }
    if (!active) return;
    if (/^PRODUCTOS?\s*:?$/i.test(line)) return;
    if (isProductLine(rawLine)) pushItem(rawLine, active);
  });

  // Frases sueltas fuera de bloques: "Pocholo dona Anchoas: 1" o "Ya tenemos ...".
  info.split(/\n+/).forEach(lineRaw => {
    const s = trim(lineRaw);
    if (!s || !/(dona|donar|donad|aport|regala|cede|existenc|ya\s+tenemos)/i.test(s)) return;
    let m = s.match(/^\s*(?:[•\-]\s*)?(.{2,80}?)\s+(?:dona|donar[áa]?|aporta|regala|cede)\s+(.+)$/i);
    if (m) { pushItem(trim(m[2]), { ticket:'DONADO SOCIO', donor:trim(m[1]), responsable:trim(m[1]), tienda:'' }); return; }
    m = s.match(/^\s*(?:[•\-]\s*)?(?:ya\s+tenemos|existencias?)\s*:?\s*(.+)$/i);
    if (m) pushItem(trim(m[1]), { ticket:'DONADO SOCIO', donor:'Existencias', responsable:trim(form.defaultResponsibleName || 'Responsable'), tienda:'' });
  });
  return rowsOut;
}

function planExplicitDonationRowsFromPromptRobustFix39(form, state) {
  const info = planPromptRawText(form).replace(/\r/g, '');
  if (!trim(info)) return [];
  const maps = planBuildMaps(state || {});
  const rows = [];
  const seen = new Set();

  function typeFromKind(kind, whole='') {
    const n = normPlanKey((kind || '') + ' ' + (whole || ''));
    if (/TIENDA/.test(n)) return 'DONADO TIENDA';
    if (/OTRO|OTROS|EXTERNO/.test(n)) return 'DONADO OTROS';
    return 'DONADO SOCIO';
  }
  function cleanDonorText(value) {
    return trim(String(value || '')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/responsable\s*[:=]?.*$/i, '')
      .replace(/tratar\s+todo.*$/i, '')
      .replace(/productos?\s*:.*$/i, '')
      .replace(/[.;]+$/g, '')
    );
  }
  function headerFromLine(line, prev={}) {
    const h = trim(line || '');
    const meta = {...(prev || {})};
    let m = h.match(/^\s*(?:[-*•]\s*)?Donado\s+(socio|tienda|otros)\s*[-–:]\s*(.+)$/i)
      || h.match(/^\s*(?:[-*•]\s*)?Donaci[oó]n\s+de\s+(socio|socios|tienda|otros)\s*[-–:]?\s*(.*)$/i)
      || h.match(/^\s*(?:[-*•]\s*)?Donaciones\s+de\s+(socio|socios|tienda|otros)\s*[-–:]?\s*(.*)$/i);
    if (m) {
      meta.ticket = typeFromKind(m[1], h);
      const rest = trim(m[2] || '');
      if (rest) {
        const parts = rest.split('/').map(x => trim(x)).filter(Boolean);
        if (parts[0]) meta.donor = cleanDonorText(parts[0]);
        const respPart = parts.find(x => /responsable/i.test(x));
        if (respPart) meta.responsable = trim(respPart.replace(/responsable\s*[:=]?/i, ''));
      }
      if (!meta.donor && /tienda/i.test(m[1])) meta.donor = 'Tienda donante';
      if (!meta.donor && /otros/i.test(m[1])) meta.donor = 'Donante externo';
      return meta;
    }
    if (/PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) {
      meta.ticket = 'DONADO SOCIO';
      meta.donor = meta.donor && !/existenc|donante indicado/i.test(meta.donor) ? meta.donor : 'Peña El Arrastre';
      meta.responsable = meta.responsable || trim(form.defaultResponsibleName || 'Colty');
      return meta;
    }
    if (/DONACI[OÓ]N\s+DE\s+TIENDA|DONACION\s+DE\s+TIENDA|DONADO\s+TIENDA/i.test(h)) { meta.ticket = 'DONADO TIENDA'; return meta; }
    if (/DONACI[OÓ]N\s+DE\s+OTROS|DONACION\s+DE\s+OTROS|DONADO\s+OTROS/i.test(h)) { meta.ticket = 'DONADO OTROS'; return meta; }
    if (/DONACIONES?\s+DE\s+SOCIOS?|DONADO\s+SOCIO/i.test(h)) { meta.ticket = 'DONADO SOCIO'; return meta; }
    if (/EXISTENCIAS?|YA\s+TENEMOS/i.test(h)) { meta.ticket = meta.ticket || 'DONADO SOCIO'; meta.donor = meta.donor || 'Existencias'; return meta; }
    return meta;
  }
  function applyMetaLine(line, meta={}) {
    const h = trim(line || '');
    const out = {...(meta || {})};
    const donor = planExtractBracket(h, ['Donante']) || (h.match(/^\s*Donante\s*[:=]\s*(.+)$/i)||[])[1] || '';
    const resp = planExtractBracket(h, ['Responsable']) || (h.match(/^\s*Responsable\s*[:=]\s*(.+)$/i)||[])[1] || '';
    if (donor) out.donor = trim(donor);
    if (resp) out.responsable = trim(resp);
    if (/DONADO\s+TIENDA/i.test(h)) out.ticket = 'DONADO TIENDA';
    else if (/DONADO\s+OTROS/i.test(h)) out.ticket = 'DONADO OTROS';
    else if (/DONADO\s+SOCIO/i.test(h)) out.ticket = 'DONADO SOCIO';
    return out;
  }
  function isHeader(line) {
    const l = trim(line || '');
    if (/^DONACIONES?\s+Y\s+EXISTENCIAS\s+CONFIRMADAS\b/i.test(l)) return false;
    return /^(?:[-*•]\s*)?(?:Donado\s+(?:socio|tienda|otros)\s*[-–:]|Donaci[oó]n\s+de\s+(?:socio|socios|tienda|otros)|Donaciones\s+de\s+(?:socio|socios|tienda|otros)|Producto\s+en\s+la\s+pe[nñ]a|Existencias?|Ya\s+tenemos)\b/i.test(l);
  }
  function isStop(line) {
    return /^\s*(?:Pistas?\s+de\s+compra|Reglas?\s+finales|Criterios?\s+de\s+c[aá]lculo|Datos\s+para\s+el\s+c[aá]lculo|Descripci[oó]n\s+conceptual|Resumen\s+de\s+men[uú]|Personas\s+y\s+consumo|Datos\s+generales)\b/i.test(line || '');
  }
  function productLine(line) {
    const s = trim(line || '').replace(/^\s*[•\-*]\s*/, '');
    if (!s || /^PRODUCTOS?\s*:?$/i.test(s)) return '';
    if (/^(?:Tratar\s+todo|Donante|Responsable|Tienda)\b/i.test(s)) return '';
    if (/^[^:\n]{2,260}:\s*(?:\d|un|una|uno|pack|paquete|caja|barril)/i.test(s)) return s;
    return '';
  }
  function push(raw, meta) {
    const m = {...(meta || {})};
    if (!m.ticket) m.ticket = 'DONADO SOCIO';
    if (!m.donor) m.donor = m.ticket === 'DONADO TIENDA' ? 'Tienda donante' : (m.ticket === 'DONADO OTROS' ? 'Donante externo' : 'Donante indicado');
    if (!m.responsable) m.responsable = trim(form.defaultResponsibleName || m.donor);
    const productoTexto = planCleanExplicitProductText(raw);
    if (!productoTexto) return;
    const unidades = Math.max(0.01, planExplicitUnits(raw));
    const k = [normPlanKey(m.ticket), normPlanKey(m.donor), normPlanKey(productoTexto), unidades].join('|');
    if (seen.has(k)) return;
    seen.add(k);
    const prod = planFindProductLoose(productoTexto, maps) || {};
    const donorKind = m.ticket === 'DONADO TIENDA' ? 'T' : 'P';
    const donorRef = planRefFromLooseLabel(m.donor, maps, donorKind) || trim(m.donor);
    const rowResp = planFindPersonLoose(m.responsable, maps);
    const rowStore = m.ticket === 'DONADO TIENDA' ? planFindStoreLoose(m.donor, maps) : null;
    rows.push({
      key:`prompt-don-fix39:${rows.length}:${trim(prod?.id || productoTexto)}`,
      include:true,
      tipo:'DONACION',
      productId:trim(prod?.id || ''),
      productName:trim(prod?.nombre || productoTexto),
      segmento:trim(prod?.segmento || 'Sin segmento'),
      destino:trim(prod?.destino || 'Sin destino'),
      unidades:round(unidades, 2),
      precio:planReasonablePlanPrice(prod?.nombre || productoTexto, prod?.defaultPrecio ?? prod?.precio ?? 0),
      tiendaId:trim(rowStore?.id || form.defaultStoreId || ''),
      responsableId:trim(rowResp?.id || (donorRef.startsWith('P:') ? donorRef.slice(2) : '') || form.defaultResponsibleId || ''),
      ticketDonacion:m.ticket,
      donorRef,
      confidence:'Prompt explícito FIX39',
      explicitPromptDonation:true,
      explicitConfirmedDonation:true,
      explicitPromptStrictHf12:true,
      reason:`Existencia/donación indicada literalmente por el usuario (${m.donor}).`
    });
  }

  let active = null;
  info.split(/\n/).forEach(raw => {
    const line = trim(raw);
    if (!line) return;
    if (isStop(line)) { active = null; return; }
    if (isHeader(line)) { active = headerFromLine(line, active || {}); return; }
    if (active && (/Tratar\s+todo\s+este\s+bloque\s+como\s+DONADO/i.test(line) || /^\[?(?:Donante|Responsable)\s*:/i.test(line) || /^\s*(?:Donante|Responsable)\s*=/i.test(line))) { active = applyMetaLine(line, active); return; }
    if (!active) return;
    const pl = productLine(raw);
    if (pl) push(pl, active);
  });
  return rows;
}


function planExplicitDonationRowsUltraFix40(form, state) {
  const info = planPromptRawText(form).replace(/\r/g, '');
  if (!trim(info)) return [];
  const maps = planBuildMaps(state || {});
  const rows = [];
  const seen = new Set();
  function parseHeader(line) {
    const h = trim(line || '');
    let m = h.match(/^\s*(?:[-*•]\s*)?Donado\s+(socio|tienda|otros)\s*[-–:]\s*(.+)$/i)
      || h.match(/^\s*(?:[-*•]\s*)?Donaci[oó]n\s+de\s+(socio|socios|tienda|otros)\s*[-–:]?\s*(.*)$/i)
      || h.match(/^\s*(?:[-*•]\s*)?Donaciones\s+de\s+(socio|socios|tienda|otros)\s*[-–:]?\s*(.*)$/i);
    if (m) {
      const kind = normPlanKey(m[1] || '');
      const ticket = /tienda/.test(kind) ? 'DONADO TIENDA' : (/otro/.test(kind) ? 'DONADO OTROS' : 'DONADO SOCIO');
      const rest = trim(m[2] || '');
      const parts = rest.split('/').map(x => trim(x)).filter(Boolean);
      const donor = trim((parts[0] || (ticket === 'DONADO TIENDA' ? 'Tienda donante' : ticket === 'DONADO OTROS' ? 'Donante externo' : 'Donante indicado')).replace(/responsable\s*[:=]?.*$/i, ''));
      const respPart = parts.find(x => /responsable/i.test(x));
      const responsable = respPart ? trim(respPart.replace(/responsable\s*[:=]?/i, '')) : trim(form.defaultResponsibleName || donor);
      return { ticket, donor, responsable, tienda: ticket === 'DONADO TIENDA' ? donor : '' };
    }
    if (/^\s*(?:[-*•]\s*)?Producto\s+en\s+la\s+pe[nñ]a\b/i.test(h)) return { ticket:'DONADO SOCIO', donor:'Peña El Arrastre', responsable:trim(form.defaultResponsibleName || 'Colty'), tienda:'' };
    return null;
  }
  function isStop(line) {
    return /^\s*(?:Pistas?\s+de\s+compra|Reglas?\s+finales|Criterios?\s+de\s+c[aá]lculo|Datos\s+para\s+el\s+c[aá]lculo|Descripci[oó]n\s+conceptual|Resumen\s+de\s+men[uú]|Personas\s+y\s+consumo|Datos\s+generales|Objetivo\s+del\s+evento)\b/i.test(line || '');
  }
  function isProduct(line) {
    const s = trim(line || '').replace(/^\s*[•\-*]\s*/, '');
    if (!s || /^PRODUCTOS?\s*:?$/i.test(s)) return false;
    if (/^(?:Tratar\s+todo|Donante|Responsable|Tienda)\b/i.test(s)) return false;
    return /^[^:\n]{2,260}:\s*(?:\d|un|una|uno|pack|paquete|caja|barril)/i.test(s);
  }
  function push(raw, meta) {
    const clean = trim(String(raw || '').replace(/^\s*[•\-*]\s*/, ''));
    const productoTexto = planCleanExplicitProductText(clean);
    if (!productoTexto) return;
    const unidades = Math.max(0.01, planExplicitUnits(clean));
    const k = [normPlanKey(meta.ticket), normPlanKey(meta.donor), normPlanKey(productoTexto), round(unidades, 2)].join('|');
    if (seen.has(k)) return;
    seen.add(k);
    let prod = planFindProductLoose(productoTexto, maps) || {};
    const incompatible = prod?.id && !planProductFormatCompatible38(productoTexto, prod.nombre || '');
    const donorKind = meta.ticket === 'DONADO TIENDA' ? 'T' : 'P';
    const donorRef = planRefFromLooseLabel(meta.donor, maps, donorKind) || trim(meta.donor);
    const rowResp = planFindPersonLoose(meta.responsable, maps);
    const rowStore = meta.ticket === 'DONADO TIENDA' ? planFindStoreLoose(meta.tienda || meta.donor, maps) : null;
    rows.push({
      key:`prompt-don-fix40:${rows.length}:${trim((!incompatible && prod?.id) || productoTexto)}`,
      include:true,
      tipo:'DONACION',
      productId: incompatible ? '' : trim(prod?.id || ''),
      productName: incompatible ? productoTexto : trim(prod?.nombre || productoTexto),
      segmento:trim(prod?.segmento || 'Sin segmento'),
      destino:trim(prod?.destino || 'Sin destino'),
      unidades:round(unidades, 2),
      precio:planReasonablePlanPrice(prod?.nombre || productoTexto, prod?.defaultPrecio ?? prod?.precio ?? 0),
      tiendaId:trim(rowStore?.id || form.defaultStoreId || ''),
      responsableId:trim(rowResp?.id || (String(donorRef).startsWith('P:') ? String(donorRef).slice(2) : '') || form.defaultResponsibleId || ''),
      ticketDonacion:meta.ticket,
      donorRef,
      confidence:'Prompt explícito FIX40',
      explicitPromptDonation:true,
      explicitConfirmedDonation:true,
      explicitPromptStrictHf12:true,
      __productoEscritoOriginal: productoTexto,
      reason:`Donación/existencia indicada literalmente por el usuario (${meta.donor}).`
    });
  }
  let active = null;
  info.split(/\n/).forEach(raw => {
    const line = trim(raw);
    if (!line) return;
    const header = parseHeader(line);
    if (header) { active = header; return; }
    if (active && isStop(line)) { active = null; return; }
    if (active && isProduct(line)) push(raw, active);
  });
  return rows;
}

function planExplicitDonationRowsLocalFix39(form, state) {
  const oldRows = arr(planExplicitDonationRowsFromPrompt(form, state));
  const robustRows = arr(planExplicitDonationRowsFromPromptRobustFix39(form, state));
  const ultraRows = arr(planExplicitDonationRowsUltraFix40(form, state));
  const byKey = new Map();
  function key(row) { return [normPlanKey(row?.ticketDonacion), normPlanKey(row?.donorRef), normPlanKey(row?.productName), round(row?.unidades,2)].join('|'); }
  function donorIsGeneric(row){ return /EXISTENCIAS|DONANTE INDICADO|DONANTE EXTERNO|TIENDA DONANTE/.test(normPlanKey(row?.donorRef || row?.donorLabel || '')); }
  function put(row){
    if (row?.tipo !== 'DONACION') return;
    const k = key(row);
    const old = byKey.get(k);
    if (!old || donorIsGeneric(old) || !donorIsGeneric(row)) byKey.set(k, row);
  }
  oldRows.forEach(put);
  robustRows.forEach(put);
  ultraRows.forEach(put);
  return [...byKey.values()];
}

function planDonationProductKey(row) {
  return trim(row?.productId) || planProductAliasKey(row?.productName || row?.producto || '') || normPlanKey(row?.productName || row?.producto || '');
}
function planExplicitDonationMatch(row, ex, exactUnits = false) {
  if (!row || row.tipo !== 'DONACION' || !ex) return false;
  const rowKey = planDonationProductKey(row);
  const exKey = planDonationProductKey(ex);
  if (!rowKey || !exKey || rowKey !== exKey) return false;
  const rowDonor = trim(row.donorRef);
  const exDonor = trim(ex.donorRef);
  if (rowDonor && exDonor && rowDonor !== exDonor) return false;
  const rowTicket = trim(row.ticketDonacion).toUpperCase();
  const exTicket = trim(ex.ticketDonacion).toUpperCase();
  if (rowTicket && exTicket && rowTicket !== exTicket) return false;
  if (exactUnits && Math.abs(num(row.unidades) - num(ex.unidades)) >= 0.01) return false;
  return true;
}
function planMergeExplicitDonations(rows, explicitRows) {
  let explicit = arr(explicitRows).filter(r => r?.tipo === 'DONACION' && num(r.unidades) > 0);
  if (!explicit.length) return arr(rows).slice();
  // FIX38: si Zuzu devuelve donaciones en JSON directo, se respetan sus donantes/responsables.
  // El parser local queda como red de seguridad para añadir faltantes, no para pisar a Zuzu con "Existencias".
  const rowsListForDirect38 = arr(rows);
  const hasGeminiDirectDonation38 = rowsListForDirect38.some(r => r?.tipo === 'DONACION' && r.__geminiDirect38 === true);
  if (hasGeminiDirectDonation38) {
    const directKeys = new Set(rowsListForDirect38.filter(r => r?.tipo === 'DONACION').map(planDonationProductKey).filter(Boolean));
    explicit = explicit.filter(ex => !directKeys.has(planDonationProductKey(ex)));
    if (!explicit.length) return rowsListForDirect38.slice();
  }
  // Deduplicación defensiva: el mismo producto/donante/tipo puede detectarse dos veces si el usuario
  // lo escribe dentro de un bloque de donaciones y además como línea suelta. En ese caso manda la
  // cantidad menor/primera escrita, para evitar barbaridades como 20 + 48 de la misma cerveza.
  const byExplicitKey = new Map();
  explicit.forEach(ex => {
    const k = [planDonationProductKey(ex), trim(ex.donorRef), trim(ex.ticketDonacion).toUpperCase()].join('|');
    const prev = byExplicitKey.get(k);
    if (!prev) { byExplicitKey.set(k, ex); return; }
    const a = num(prev.unidades), b = num(ex.unidades);
    // Si una detección trae más unidades por haber leído una frase larga o contexto, se conserva la cantidad más prudente.
    byExplicitKey.set(k, b > 0 && (a <= 0 || b < a) ? ex : prev);
  });
  explicit = [...byExplicitKey.values()];
  // Si el prompt trae una donación explícita, esa cantidad manda. Eliminamos cualquier DONACION de Zuzu
  // o histórica del mismo producto, aunque traiga otro donante o más unidades, para que no se duplique ni se infle.
  const explicitKeys = new Set(explicit.map(planDonationProductKey).filter(Boolean));
  const out = arr(rows).filter(row => !(row?.tipo === 'DONACION' && explicitKeys.has(planDonationProductKey(row))));
  const seen = new Set();
  explicit.forEach(ex => {
    const key = [planDonationProductKey(ex), trim(ex.donorRef), trim(ex.ticketDonacion).toUpperCase()].join('|');
    if (seen.has(key)) return;
    seen.add(key);
    out.unshift({
      ...ex,
      explicitPromptDonation: true,
      explicitConfirmedDonation: true,
      unidades: Math.max(0, round(ex.unidades, 2)),
      include: ex.include !== false,
      confidence: trim(ex.confidence || 'Prompt explícito'),
      reason: trim(ex.reason || 'Donación indicada por el usuario.') + ' Cantidad de donación bloqueada por prompt: cualquier necesidad adicional debe ir a compra por déficit.'
    });
  });
  return out;
}
function planSanitizeInventedDonations(rows, baseRows, explicitRows, mode = '') {
  const allowedHistoric = new Set();
  // En REPLICA se conservan donaciones históricas. En ZUZU_TOTAL/PARCIAL no se arrastran
  // donaciones futuras no confirmadas por el prompt: se convierten en compra pendiente.
  if (trim(mode).toUpperCase() === 'REPLICA') arr(baseRows).filter(r => r?.tipo === 'DONACION').forEach(r => allowedHistoric.add(planDonationProductKey(r)));
  const explicit = arr(explicitRows).filter(r => r?.tipo === 'DONACION');
  const allowedExplicit = new Set(explicit.map(planDonationProductKey).filter(Boolean));
  return arr(rows).map(row => {
    if (row?.tipo !== 'DONACION') return row;
    const key = planDonationProductKey(row);
    if (row?.explicitPromptDonation === true || row?.explicitPromptStrictHf12 === true || row?.explicitConfirmedDonation === true) return row;
    if (allowedExplicit.has(key) && /Prompt|expl[ií]cito|confirmad/i.test(trim(row?.confidence || '') + ' ' + trim(row?.reason || ''))) return {...row, explicitPromptDonation:true, explicitConfirmedDonation:true};
    const exactExplicit = explicit.some(ex => planExplicitDonationMatch(row, ex, true));
    if (exactExplicit) return row;
    if (allowedExplicit.has(key)) {
      return {
        ...row,
        tipo: 'COMPRA',
        ticketDonacion: '',
        donorRef: '',
        include: row.include !== false,
        confidence: 'Compra por déficit',
        reason: trim(row.reason || 'Zuzu propuso esta línea.') + ' El prompt ya fija una donación exacta para este producto; esta cantidad adicional no se acepta como donación y queda como compra pendiente.'
      };
    }
    if (trim(mode).toUpperCase() === 'REPLICA' && (allowedHistoric.has(key) || /^histor/i.test(trim(row.confidence)) || /^histor/i.test(trim(row.key)))) return row;
    return {
      ...row,
      tipo: 'COMPRA',
      ticketDonacion: '',
      donorRef: '',
      include: row.include !== false,
      confidence: 'Posible donación pendiente',
      reason: trim(row.reason || 'Zuzu propuso esta línea.') + ' No se acepta como donación porque no está indicada de forma explícita en el prompt; se mantiene como compra pendiente para no descontarla.'
    };
  });
}



function planCoalesceDonationsAfterSanitize(rows, explicitRows, mode = '') {
  const explicitKeys = new Set(arr(explicitRows).map(planDonationProductKey).filter(Boolean));
  const seenDonation = new Map();
  const out = [];
  arr(rows).forEach(row => {
    if (row?.tipo !== 'DONACION') { out.push(row); return; }
    const key = [planDonationProductKey(row), trim(row.donorRef), trim(row.ticketDonacion).toUpperCase()].join('|');
    const isExplicit = row.explicitPromptDonation === true || explicitKeys.has(planDonationProductKey(row));
    const prevIndex = seenDonation.get(key);
    if (prevIndex == null) {
      seenDonation.set(key, out.length);
      out.push({...row, explicitPromptDonation:isExplicit || row.explicitPromptDonation === true});
      return;
    }
    const prev = out[prevIndex];
    if (isExplicit || prev?.explicitPromptDonation) {
      // Para donaciones del prompt no se suman duplicados: se conserva la cantidad menor/confirmada.
      const prevUnits = num(prev.unidades), rowUnits = num(row.unidades);
      if (rowUnits > 0 && (prevUnits <= 0 || rowUnits < prevUnits)) {
        out[prevIndex] = {...prev, ...row, unidades:round(rowUnits,2), explicitPromptDonation:true, include:row.include !== false};
      }
      return;
    }
    // Histórico puro: si de verdad hay varias líneas iguales, se agrupan para no enseñar duplicados.
    prev.unidades = round(num(prev.unidades) + num(row.unidades), 2);
    prev.precio = num(prev.precio) || num(row.precio);
    prev.reason = trim(prev.reason || '') + ' Línea de donación equivalente agrupada para evitar duplicados visuales.';
  });
  return out;
}

function planInfoDonationRules(info, maps) {
  const raw = trim(info || '');
  if (!raw) return [];
  const rules = [];
  function addRule(productText, donorLabel, respLabel, type = 'DONADO SOCIO') {
    const cleanProduct = trim(productText).replace(/^\d+(?:[,.]\d+)?\s*(?:ud\.?|unidades|kg|l|litros|botellas|latas|rollos|sacos|pack|packs)?\s*/i, '').replace(/[.:;]+$/,'').trim();
    if (!cleanProduct || cleanProduct.length < 2) return;
    const donorRef = planDonorRefFromLabel(donorLabel, maps);
    const resp = maps.personByName.get(normPlanKey(respLabel || donorLabel));
    rules.push({ productKey:normPlanKey(cleanProduct), productText:cleanProduct, donorRef, responsableId:trim(resp?.id), ticketDonacion:type, donorLabel:trim(donorLabel), responsableLabel:trim(respLabel || donorLabel) });
  }
  const existHeader = raw.match(/INFORMACION\s+SOBRE\s+EXISTENCIA[\s\S]{0,220}?DONADO\s+SOCIO\s+["“]([^"”]+)["”][\s\S]{0,160}?RESPONSABLE\s+["“]([^"”]+)["”]/i);
  if (existHeader) {
    const start = existHeader.index + existHeader[0].length;
    const next = raw.slice(start).search(/\n\s*-?\s*POSIBLES\s+DONACIONES/i);
    const block = next >= 0 ? raw.slice(start, start + next) : raw.slice(start);
    block.split(/\n+/).forEach(line => {
      const m = line.match(/^\s*[-•]\s*(.+)$/);
      if (!m) return;
      const item = m[1].split(':')[0].trim();
      addRule(item, existHeader[1], existHeader[2], 'DONADO SOCIO');
    });
  }
  const poss = raw.match(/POSIBLES\s+DONACIONES\s+DE\s+["“]([^"”]+)["”]\s*:\s*([\s\S]+)/i);
  if (poss) {
    poss[2].split(/[\n,;]+/).forEach(part => addRule(part, poss[1], poss[1], 'DONADO SOCIO'));
  }
  for (const section of planExplicitDonationSections(raw)) {
    const donor = planExtractBracket(section.header, ['Donante']) || (/PE[NÑ]A/i.test(section.header) ? 'Peña El Arrastre' : 'Donante indicado');
    const resp = planExtractBracket(section.header, ['Responsable']) || donor;
    planExplicitItemLines(section.block).forEach(item => addRule(item, donor, resp, section.ticketDonacion));
  }
  return rules.filter(r => r.donorRef || r.responsableId);
}
function planApplyDonationRules(rows, rules) {
  const list = arr(rules);
  if (!list.length) return rows;
  return arr(rows).map(row => {
    if (row.tipo !== 'DONACION') return row;
    const key = normPlanKey(row.productName);
    const rule = list.find(r => key.includes(r.productKey) || r.productKey.includes(key) || r.productKey.split(' ').filter(Boolean).some(tok => tok.length >= 5 && key.includes(tok)));
    if (!rule) return row;
    return {
      ...row,
      ticketDonacion: row.ticketDonacion || rule.ticketDonacion || 'DONADO SOCIO',
      donorRef: row.donorRef || rule.donorRef,
      responsableId: row.responsableId || rule.responsableId,
      reason: trim(row.reason || 'Propuesta ajustada por Zuzu.') + ` Donante/responsable aplicado desde instrucciones del prompt: ${rule.donorLabel || rule.productText}.`
    };
  });
}
function planRowsForEvent(state, eventId, modules) {
  const maps = planBuildMaps(state);
  const ev = planEventById(state, eventId);
  const rowsOut = [];
  const includeCompras = modules.includes('COMPRAS');
  const includeDon = modules.includes('DONACIONES');
  arr(state?.compras).filter(row => trim(row?.eventId || row?.event_id) === trim(eventId)).forEach((row, index) => {
    const don = planIsDonation(row);
    if (don && !includeDon) return;
    if (!don && !includeCompras) return;
    const prod = planProduct(row, maps) || {};
    const unidades = round(row?.unidades, 3);
    const amount = planLineValue(row);
    const precio = unidades ? round(amount / unidades, 4) : round(row?.precio, 4);
    rowsOut.push({
      key: `plan:${trim(row?.id) || index}`,
      include: true,
      tipo: don ? 'DONACION' : 'COMPRA',
      sourceId: trim(row?.id),
      productId: trim(row?.productoId || row?.producto_id),
      productName: trim(prod.nombre || row?.producto || planProductName(row, maps)),
      segmento: trim(prod.segmento || row?.segmento || 'Sin segmento'),
      destino: trim(prod.destino || row?.destino || 'Sin destino'),
      unidades,
      precio: precio || round(row?.precio, 4),
      tiendaId: trim(row?.tiendaId || row?.tienda_id || prod.defaultTiendaId || prod.tiendaId),
      responsableId: trim(row?.responsableId || row?.responsable_id),
      ticketDonacion: don ? planTicket(row) : '',
      donorRef: don ? trim(row?.donorRef || row?.donor_ref || '') : '',
      confidence: 'Histórico',
      reason: don ? 'Donación tomada del histórico del evento modelo.' : 'Compra tomada del histórico del evento modelo.',
      sourceEventTitle: ev ? planEventTitle(ev) : ''
    });
  });
  return rowsOut;
}
function planIncomeRowsForEvent(state, eventId) {
  const maps = planBuildMaps(state);
  const ev = planEventById(state, eventId) || {};
  const precio = num(ev.precio);
  return arr(state?.colaboradores).filter(c => trim(c?.eventId || c?.event_id) === trim(eventId)).map((c, index) => {
    const personId = trim(c?.personaId || c?.persona_id);
    const p = maps.people.get(personId) || {};
    const snap = arr(state?.eventPersonSnapshots).find(row=>trim(row?.eventId||row?.event_id)===trim(eventId)&&trim(row?.personaId||row?.persona_id)===personId) || {};
    const rango = trim(c?.personaRangoSnapshot || c?.persona_rango_snapshot || snap?.rangoSnapshot || snap?.rango_snapshot || p.rango || c?.rango || '').toUpperCase() || 'SIN RANGO';
    const numero = num(c.numero);
    const voluntario = num(c.importeVoluntario ?? c.importe ?? 0);
    return {
      key: `ingreso:${trim(c.id) || index}`,
      sourceId: trim(c.id),
      personaId: trim(c?.personaId || c?.persona_id),
      personaName: trim(c?.personaNombreSnapshot || c?.persona_nombre_snapshot || snap?.nombreSnapshot || snap?.nombre_snapshot || p.nombre || c?.nombre || 'Persona sin nombre'),
      rango,
      numero,
      situacion: trim(c.situacion || c.ingreso || 'Pendiente'),
      importeVoluntario: round(voluntario, 2),
      importeObligatorio: rango === 'SOCIO' ? round(numero * precio, 2) : 0
    };
  });
}
function planScaleRows(rows, factor, defaultStoreId, defaultRespId) {
  const f = Number.isFinite(factor) && factor > 0 ? factor : 1;
  return arr(rows).map(row => {
    const isDonation = trim(row?.tipo).toUpperCase() === 'DONACION';
    const unidades = isDonation ? Math.max(0, round(row.unidades, 2)) : Math.max(0, round(num(row.unidades) * f, 2));
    return {
      ...row,
      unidades,
      tiendaId: trim(row.tiendaId || defaultStoreId),
      responsableId: trim(row.responsableId || defaultRespId),
      reason: isDonation
        ? `${row.reason || 'Línea histórica.'} Donación conservada sin escalado: las unidades donadas son exactas.`
        : `${row.reason || 'Línea histórica.'} Ajuste inicial aplicado por planificación (${round(f, 3)}x).`
    };
  });
}

function planAttendeesForEvent(state, eventId) {
  return arr(state?.colaboradores).filter(c => trim(c?.eventId || c?.event_id) === trim(eventId)).reduce((sum, c) => sum + num(c.numero), 0);
}
function planPlanningProductScore(product, rawPrompt) {
  const raw = normPlanKey(rawPrompt || '');
  const name = trim(product?.nombre || '');
  const n = normPlanKey([name, product?.segmento, product?.destino].filter(Boolean).join(' '));
  if (!n) return -999;
  let score = 0;
  const important = [
    'cerveza','vino','ron','whisky','ginebra','gin','beefeater','larios','brugal','barcelo','dyc','johnny','jhonny','walker','cubata','licor',
    'coca','cola','fanta','sprite','kas','tonica','refresco','lata','botella','tinto de verano','agua','hielo',
    'jamon','chorizo','salchichon','queso','anchoa','mejillon','salmon','patata','berenjena','tortilla','huevo','pan','picos',
    'lomo','panceta','morcilla','venao','venado','chuleta','carne','baicon','bacon','barbacoa','carbon','butano',
    'vaso','plato','servilleta','cuchillo','tenedor','bolsa','basura','fairy','jabon','papel','secamanos','higienico','ambientador','limpieza','cafe','aceite','vinagre'
  ];
  important.forEach(tok => { const t = normPlanKey(tok); if (n.includes(t)) score += 8; if (raw.includes(t) && n.includes(t)) score += 16; });
  const words = n.split(' ').filter(w => w.length >= 4);
  words.forEach(w => { if (raw.includes(w)) score += Math.min(18, 4 + w.length); });
  if (/bebida|alimentaci|comida|carnicer|aperitivo|infraestructura|limpieza|menaje/i.test(n)) score += 5;
  return score;
}
function planCatalogForGemini(state, form = {}) {
  const maps = planBuildMaps(state);
  const raw = planPromptRawText(form);
  const totalMode = trim(form?.mode).toUpperCase() === 'ZUZU_TOTAL';
  const finalizados = totalMode ? [] : arr(state?.eventos).filter(e => /^finalizado$/i.test(trim(e?.situacion)));
  const productosBase = arr(state?.productos).map(p => ({
    id: trim(p.id), nombre: trim(p.nombre), segmento: trim(p.segmento), destino: trim(p.destino),
    precio: round(p.defaultPrecio ?? p.precio, 4), tienda: planStoreName(p.defaultTiendaId || p.tiendaId, maps),
    __score: planPlanningProductScore(p, raw)
  })).filter(p => p.nombre);
  const mustHave = /cerveza|vino|ron|whisky|ginebra|gin|coca|fanta|sprite|kas|tonica|refresco|agua|hielo|jamon|chorizo|salchichon|queso|anchoa|mejillon|patata|berenjena|tortilla|huevo|pan|lomo|panceta|morcilla|venao|venado|chuleta|bacon|baicon|barbacoa|carbon|butano|vaso|plato|servilleta|bolsa|basura|fairy|jabon|papel|secamanos|higienico|ambientador|cafe|aceite|vinagre/i;
  const productosOrdenados = productosBase
    .filter(p => !totalMode || p.__score > 0 || mustHave.test([p.nombre,p.segmento,p.destino].join(' ')))
    .sort((a,b) => b.__score - a.__score || a.nombre.localeCompare(b.nombre, 'es'));
  const productos = (productosOrdenados.length ? productosOrdenados : productosBase)
    .slice(0, totalMode ? 120 : 650)
    .map(({__score, tienda, ...p}) => totalMode ? ({...p, tienda}) : ({...p, tienda}));
  return { modoCatalogo: totalMode ? 'json-directo-productos-fix39' : 'historico-ampliado', totalProductosCatalogo: arr(state?.productos).length, productosEntregadosGemini: productos.length, eventosFinalizados: finalizados.map(e => ({ id: trim(e.id), titulo: planEventTitle(e), fechaIni: trim(e.fechaIni), fechaFin: trim(e.fechaFin), precio: round(e.precio, 2), asistentes: planAttendeesForEvent(state, e.id) })).slice(0, 60), productos, tiendas: totalMode ? [] : arr(state?.tiendas).map(t => trim(t.nombre)).filter(Boolean).slice(0, 180), personas: totalMode ? [] : arr(state?.personas).map(p => ({ nombre: trim(p.nombre), rango: trim(p.rango) })).filter(p => p.nombre).slice(0, 250) };
}
function planDetectedDaysFromPrompt(form = {}) {
  const raw = trim([form.title, form.descripcion, form.info].filter(Boolean).join('\n'));
  const lower = normPlanKey(raw);
  const candidates = [];
  const add = v => { const n = Math.round(num(v)); if (n >= 1 && n <= 14) candidates.push(n); };
  let m;
  const patterns = [
    /(?:durara|durará|dura|duracion|duración|duracion\s+del\s+evento|seran|serán|son|de)\s*[:=]?\s*(\d{1,2})\s*(?:dia|dias|día|días|jornada|jornadas)/gi,
    /(\d{1,2})\s*(?:dia|dias|día|días|jornada|jornadas)\s*(?:de\s+evento|de\s+fiesta|completos|completas)?/gi,
    /(?:dia|día)\s*[_\- ]*([1-9]\d?)/gi
  ];
  patterns.forEach(rx => { while ((m = rx.exec(raw + '\n' + lower))) add(m[1]); });
  const dayLabels = new Set();
  const dayRe = /(?:^|\n)\s*(?:[-*]\s*)?(?:dia|día)\s*[_\- ]*([1-9]\d?)/gi;
  while ((m = dayRe.exec(raw))) add(m[1]);
  const weekdays = ['lunes','martes','miercoles','miércoles','jueves','viernes','sabado','sábado','domingo'];
  weekdays.forEach(d => { if (lower.includes(normPlanKey(d))) dayLabels.add(normPlanKey(d)); });
  if (dayLabels.size >= 2) candidates.push(Math.min(7, dayLabels.size));
  return candidates.length ? Math.max(...candidates) : 0;
}
function planEffectiveDays(form = {}) {
  return Math.max(1, planDetectedDaysFromPrompt(form) || num(form?.dias) || 1);
}
function planExpectedMenuSlots(days) {
  const total = Math.max(1, Math.min(14, Math.round(num(days) || 1)));
  const slots = [];
  for (let i = 1; i <= total; i += 1) {
    ['aperitivo','comida','tardeo/cubatas','cena'].forEach(momento => slots.push({ dia:`dia_${i}`, momento }));
  }
  return slots;
}
function planNormalizeMenuResumen(raw, form = {}) {
  const expectedDays = planEffectiveDays(form);
  const list = arr(raw).map((item, idx) => {
    if (typeof item === 'string') return { dia:`dia_${Math.floor(idx / 4) + 1}`, momento:'resumen', resumen:trim(item) };
    return { dia:trim(item?.dia || item?.day || `dia_${Math.floor(idx / 4) + 1}`), momento:trim(item?.momento || item?.slot || item?.franja || 'resumen'), resumen:trim(item?.resumen || item?.summary || item?.descripcion || item?.texto || '') };
  }).filter(item => item.resumen);
  if (!list.length) return [];
  return list.map(item => ({
    dia: /^dia[_\- ]?\d+/i.test(item.dia) ? item.dia.replace(/\s+/g,'_').toLowerCase() : item.dia,
    momento: item.momento,
    resumen: item.resumen
  })).slice(0, Math.max(4, expectedDays * 6));
}

function planPromptRawText(form = {}) {
  return trim([form.title, form.descripcion, form.info].filter(Boolean).join('\n'));
}
function planPromptNumber(form, patterns, fallback = 0) {
  const raw = planPromptRawText(form);
  for (const rx of patterns) {
    const m = raw.match(rx);
    if (m) return num(m[1]);
  }
  return fallback;
}

function planPromptRangeFix47(form, patterns, fallbackMin = 0, fallbackMax = 0) {
  const raw = planPromptRawText(form);
  for (const rx of patterns) {
    const m = raw.match(rx);
    if (!m) continue;
    const a = num(m[1]);
    const b = num(m[2]);
    if (a > 0 || b > 0) {
      const min = a > 0 ? a : b;
      const max = b > 0 ? Math.max(a, b) : min;
      return { min, max };
    }
  }
  return { min: fallbackMin, max: fallbackMax || fallbackMin };
}
function planOpenConsumptionContextFix47(form = {}) {
  const raw = planPromptRawText(form);
  const base = planPromptNumber(form, [
    /asistentes\s+base\s*[:=]\s*(\d+(?:[,.]\d+)?)/i,
    /personas\s+base\s*[:=]\s*(\d+(?:[,.]\d+)?)/i,
    /personas\s+asistentes\s*[:=]\s*(\d+(?:[,.]\d+)?)/i,
    /asistentes\s*[:=]\s*(\d+(?:[,.]\d+)?)/i,
    /(\d+(?:[,.]\d+)?)\s+personas/i
  ], num(form.personas));
  const explicitOpen = planPromptNumber(form, [
    /consumo\s+abierto\s*[:=]\s*(\d+(?:[,.]\d+)?)/i,
    /asistentes\s+(?:de\s+)?consumo\s+abierto\s*[:=]\s*(\d+(?:[,.]\d+)?)/i,
    /personas\s+(?:de\s+)?consumo\s+abierto\s*[:=]\s*(\d+(?:[,.]\d+)?)/i,
    /equivalentes?\s+(?:de\s+)?consumo\s*[:=]\s*(\d+(?:[,.]\d+)?)/i
  ], 0);
  const hasOpenHint = /consumo\s+abierto|pe[nñ]a[^\n]{0,80}plaza|plaza[^\n]{0,80}pe[nñ]a|pasa\s+mucha\s+gente|gente\s+de\s+paso|se\s+(?:les\s+)?invita|se\s+invita\s+a\s+todos|evento\s+abierto/i.test(raw);
  const derivedOpen = base > 0 ? Math.ceil(base * 1.66) : 0;
  const consumoAbiertoPersonas = explicitOpen > 0 ? explicitOpen : (hasOpenHint ? derivedOpen : base);
  const aplicaConsumoAbierto = explicitOpen > 0 || hasOpenHint;
  const cenaRange = planPromptRangeFix47(form, [
    /(?:asistentes\s+)?cena\s+real\s*[:=]\s*(\d+(?:[,.]\d+)?)(?:\s*(?:-|–|a|\/)\s*(\d+(?:[,.]\d+)?))?/i,
    /personas\s+que\s+cenar[aá]n\s+realmente\s*[:=]\s*(\d+(?:[,.]\d+)?)(?:\s*(?:-|–|a|\/)\s*(\d+(?:[,.]\d+)?))?/i,
    /cenar[aá]n\s+realmente\s*[:=]\s*(\d+(?:[,.]\d+)?)(?:\s*(?:-|–|a|\/)\s*(\d+(?:[,.]\d+)?))?/i
  ], 0, 0);
  const derivedCena = base > 0 ? Math.ceil(base / 2) : 0;
  const cenaRealMin = cenaRange.min > 0 ? cenaRange.min : derivedCena;
  const cenaRealMax = cenaRange.max > 0 ? cenaRange.max : cenaRealMin;
  return {
    asistentesBase: base || 0,
    consumoAbiertoPersonas: consumoAbiertoPersonas || 0,
    consumoAbiertoCalculado: derivedOpen || 0,
    aplicaConsumoAbierto,
    consumoAbiertoOrigen: explicitOpen > 0 ? 'prompt' : (hasOpenHint ? 'formula_66_por_ciento' : 'base'),
    cenaRealMin: cenaRealMin || 0,
    cenaRealMax: cenaRealMax || 0,
    cenaRealOrigen: (cenaRange.min > 0 || cenaRange.max > 0) ? 'prompt' : (derivedCena ? 'base_dividido_entre_2' : 'sin_dato')
  };
}
function planBudgetFromPrompt(form = {}) {
  const objetivo = planPromptNumber(form, [
    /presupuesto\s+objetivo\s*[:=]\s*(\d+(?:[,.]\d+)?)\s*€?\s*\/\s*persona/i,
    /objetivo\s*[:=]\s*(\d+(?:[,.]\d+)?)\s*€?\s*\/\s*persona/i
  ], 0);
  const maximo = planPromptNumber(form, [
    /l[ií]mite\s+m[aá]ximo\s+de\s+coste\s*[:=]\s*(\d+(?:[,.]\d+)?)\s*€?\s*\/\s*persona/i,
    /coste\s+m[aá]ximo\s*[:=]\s*(\d+(?:[,.]\d+)?)\s*€?\s*\/\s*persona/i,
    /m[aá]ximo\s*[:=]\s*(\d+(?:[,.]\d+)?)\s*€?\s*\/\s*persona/i
  ], 0);
  return { objetivoPorPersona: objetivo, maximoPorPersona: maximo || (objetivo ? round(objetivo * 1.10, 2) : 0) };
}
function planExtractParagraph(raw, startWord, nextWords) {
  const txt = text(raw || '').replace(/\r/g, '');
  const startRe = new RegExp('(?:^|\\n)\\s*(?:el\\s+)?' + startWord + '\\b[\\s\\S]*?', 'i');
  const m = txt.match(startRe);
  if (!m || m.index == null) return '';
  const from = m.index;
  let to = txt.length;
  const rest = txt.slice(from + 1);
  for (const w of nextWords) {
    const re = new RegExp('\\n\\s*(?:el\\s+)?' + w + '\\b', 'i');
    const k = rest.search(re);
    if (k >= 0) to = Math.min(to, from + 1 + k);
  }
  return trim(txt.slice(from, to)).replace(/\s+/g, ' ').slice(0, 900);
}
function planMomentsFromPrompt(form = {}) {
  const raw = planPromptRawText(form).replace(/\r/g, '');
  const days = planEffectiveDays(form);
  const lines = raw.split(/\n/);
  const out = [];
  const seen = new Set();
  const dayLineRe = /^\s*(?:[-*•]\s*)?(?:d[ií]a|dia|jornada)\s*[_\- ]*(\d{1,2})\b\s*(?:\(([^)]*)\))?\s*:??\s*([^\n]*)/i;
  const stopRe = /^\s*(?:DATOS\s+PARA|DESCRIPCI[OÓ]N\s+CONCEPTUAL|CRITERIOS?|REGLAS?|PRODUCTO\s+EN|DONACIONES?|DONACI[OÓ]N|DONADO\s+(?:SOCIO|TIENDA|OTROS)|PISTAS?|RESULTADO|OBJETIVO)\b/i;
  function add(dia, momento, detalle, index) {
    if (!momento || dia > days) return;
    const key = `${dia}|${normPlanKey(momento)}`;
    const clean = trim(detalle || '').replace(/^\([^)]*\)\s*:??\s*/,'').replace(/\s+/g,' ');
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ dia:`dia_${dia}`, momento, detalle:clean || 'Franja detectada por ControlEvent; Zuzu debe concretarla.', index:index || 0 });
  }
  function momentFromText(text) {
    const n = normPlanKey(text || '');
    const found = [];
    const push = (momento, rx) => { const m = n.match(rx); if (m) found.push({ momento, index:m.index }); };
    push('desayuno', /\bdesayuno\b/);
    push('aperitivo', /\b(aperitivo|vermut|vermu|picoteo|entrantes?)\b/);
    push('comida', /\b(comida|almuerzo|buffet|paella|asado)\b/);
    push('tardeo/cubatas', /\b(tardeo|sobremesa|cubatas?\s+de\s+tarde|copas?\s+de\s+tarde|tarde[^.;,\n]{0,40}cubatas?|cubatas?[^.;,\n]{0,40}tarde)\b/);
    push('merienda', /\bmerienda\b/);
    push('cena', /\b(cena|cenar)\b/);
    if (/\b(cubatas?|copas?)\b/.test(n) && /\b(noche|nocturn[oa]s?)\b/.test(n)) push('cubatas noche', /\b(cubatas?\s*(?:de\s*)?noche|copas?\s*(?:de\s*)?noche|noche[^.;,\n]{0,40}cubatas?|noche[^.;,\n]{0,40}copas?)\b/);
    if (/todo\s+el\s+d[ií]a|dia\s+completo|día\s+completo/.test(n) && !found.length) return ['aperitivo','comida','tardeo/cubatas','cena'].map((momento,index)=>({momento,index}));
    const localSeen = new Set();
    return found.sort((a,b)=>a.index-b.index).filter(x => { const k=normPlanKey(x.momento); if(localSeen.has(k)) return false; localSeen.add(k); return true; });
  }
  function isExplicitMoment(paren) {
    const n = normPlanKey(paren || '');
    if (!n) return [];
    const out = [];
    if (/\bdesayuno\b/.test(n)) out.push('desayuno');
    if (/\baperitivo\b|\bvermut\b|\bpicoteo\b/.test(n)) out.push('aperitivo');
    if (/\bcomida\b|\balmuerzo\b/.test(n)) out.push('comida');
    if (/\btardeo\b|cubatas.*tarde|tarde.*cubatas/.test(n)) out.push('tardeo/cubatas');
    if (/\bmerienda\b/.test(n)) out.push('merienda');
    if (/\bcubatas?\s*(?:de\s*)?noche\b|\bnoche\s+de\s+copas\b/.test(n)) out.push('cubatas noche');
    if (/\bcena\b/.test(n)) out.push('cena');
    return out;
  }
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(dayLineRe);
    if (!m) continue;
    const dia = Math.max(1, Math.min(14, Math.round(num(m[1]))));
    const paren = trim(m[2] || '');
    const bodyParts = [trim(m[3] || '')];
    for (let j = i + 1; j < lines.length; j += 1) {
      if (dayLineRe.test(lines[j]) || stopRe.test(lines[j])) break;
      const l = trim(lines[j]);
      if (l) bodyParts.push(l);
      if (bodyParts.join(' ').length > 600) break;
    }
    const body = bodyParts.join(' ').replace(/^:\s*/,'').trim();
    const explicit = isExplicitMoment(paren);
    if (explicit.length && explicit.length <= 2 && !/todo\s+el\s+d[ií]a|sabado|s[áa]bado|domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|\d{1,2}\/\d{1,2}/i.test(paren)) {
      explicit.forEach((momento, k) => add(dia, momento, body || paren, i * 10 + k));
    } else {
      const slots = momentFromText(body || paren);
      slots.forEach((slot, k) => add(dia, slot.momento, body || paren, i * 10 + slot.index + k));
    }
  }
  if (!out.length) {
    const n = normPlanKey(raw); const slots = [];
    if (/aperitivo|vermut|picoteo/.test(n)) slots.push('aperitivo');
    if (/comida|almuerzo|buffet|paella|asado/.test(n)) slots.push('comida');
    if (/tardeo|sobremesa|cubata|copa/.test(n)) slots.push('tardeo/cubatas');
    if (/cena|cenar/.test(n)) slots.push('cena');
    const use = slots.length ? slots : ['aperitivo','comida','tardeo/cubatas','cena'];
    for (let d=1; d<=Math.max(1,days); d+=1) use.forEach((momento,k) => add(d, momento, 'Franja inferida genéricamente del prompt; Zuzu debe concretarla.', d*10+k));
  }
  return out.sort((a,b)=>a.index-b.index).map(({index, ...x}) => x).slice(0, 120);
}
function planPromptBriefObject(form = {}, state = {}) {
  const raw = planPromptRawText(form);
  const budget = planBudgetFromPrompt(form);
  const openCtx = planOpenConsumptionContextFix47(form);
  const basePeople = openCtx.asistentesBase || num(form.personas) || 0;
  const beerDeclared = planPromptNumber(form, [/personas\s+que\s+beber[aá]n\s+cerveza\s*[:=]\s*(\d+(?:[,.]\d+)?)/i, /cerveza[^\n]{0,50}?(\d+(?:[,.]\d+)?)\s+personas/i], 0);
  const cubataDeclared = planPromptNumber(form, [/personas\s+que\s+tomar[aá]n\s+cubatas\s*[:=]\s*(\d+(?:[,.]\d+)?)/i, /cubatas[^\n]{0,50}?(\d+(?:[,.]\d+)?)\s+personas/i], 0);
  const consumptionOpen = openCtx.consumoAbiertoPersonas || basePeople;
  const beerCalc = openCtx.aplicaConsumoAbierto ? Math.max(beerDeclared, consumptionOpen) : beerDeclared;
  const cubataCalc = openCtx.aplicaConsumoAbierto ? Math.max(cubataDeclared, consumptionOpen) : cubataDeclared;
  return {
    versionBrief: 'FIX47_CONSUMO_ABIERTO_VARIABLE_V1',
    objetivoEvento: firstNonEmpty((raw.match(/OBJETIVO\s+DEL\s+EVENTO\s*:\s*([^\n]+)/i) || [])[1], form.title),
    duracionDias: planEffectiveDays(form),
    personasAsistentes: basePeople,
    asistentesBase: basePeople,
    personasConsumoAbierto: consumptionOpen,
    consumoAbiertoAplicado: openCtx.aplicaConsumoAbierto,
    consumoAbiertoOrigen: openCtx.consumoAbiertoOrigen,
    consumoAbiertoCalculado: openCtx.consumoAbiertoCalculado,
    presupuestoObjetivoPorPersona: budget.objetivoPorPersona,
    limiteMaximoPorPersona: budget.maximoPorPersona,
    temperatura: firstNonEmpty((raw.match(/temperatura\s+prevista\s*:\s*([^\n]+)/i) || [])[1], /calor|verano|mucho\s+sol/i.test(raw) ? 'mucho calor' : ''),
    personasCervezaDeclaradas: beerDeclared,
    personasCerveza: beerCalc,
    personasCubatasDeclaradas: cubataDeclared,
    personasCubatas: cubataCalc,
    cubatasPorPersonaConsumidora: planPromptNumber(form, [/cubatas\s*[:=]\s*(\d+(?:[,.]\d+)?)\s*por\s+persona/i, /(\d+(?:[,.]\d+)?)\s*cubatas\s+por\s+persona/i], 0),
    cervezasMaxPorPersonaDia: planPromptNumber(form, [/cerveza\s*[:=]\s*(?:m[aá]ximo\s*)?(\d+(?:[,.]\d+)?)\s*(?:latas|botellines)/i, /(\d+(?:[,.]\d+)?)\s*(?:latas|botellines)\s+por\s+persona\s+consumidora/i], 0),
    personasSinAlcoholNinos: planPromptNumber(form, [/personas\s+sin\s+alcohol\s*\/\s*ni[ñn]os\s*[:=]\s*(\d+(?:[,.]\d+)?)/i, /personas\s+sin\s+alcohol[^\n:]*[:=]\s*(\d+(?:[,.]\d+)?)/i], 0),
    personasCenaReal: openCtx.cenaRealMax,
    personasCenaRealMin: openCtx.cenaRealMin,
    personasCenaRealMax: openCtx.cenaRealMax,
    cenaRealOrigen: openCtx.cenaRealOrigen,
    horas: {
      aperitivo: firstNonEmpty((raw.match(/hora\s+aproximada\s+del\s+aperitivo\s*:\s*([^\n]+)/i) || [])[1], ''),
      comida: firstNonEmpty((raw.match(/hora\s+aproximada\s+de\s+la\s+comida\s*:\s*([^\n]+)/i) || [])[1], ''),
      tardeoCubatas: firstNonEmpty((raw.match(/duraci[oó]n\s+del\s+tardeo\s*\/?\s*cubatas\s*:\s*([^\n]+)/i) || [])[1], ''),
      cena: firstNonEmpty((raw.match(/hora\s+aproximada\s+de\s+la\s+cena\s*:\s*([^\n]+)/i) || [])[1], '')
    },
    momentosPorDia: planMomentsFromPrompt(form),
    concepto: {
      aperitivo: planExtractParagraph(raw, 'aperitivo', ['comida', 'tardeo', 'cena', 'criterios?']),
      comida: planExtractParagraph(raw, 'comida', ['tardeo', 'cena', 'criterios?']),
      tardeoCubatas: planExtractParagraph(raw, 'tardeo', ['cena', 'criterios?']),
      cena: planExtractParagraph(raw, 'cena', ['criterios?', 'producto\\s+en\\s+la\\s+pe[nñ]a', 'donaciones?', 'pistas'])
    },
    reglasBebida: [
      'Cerveza/cubatas solo a consumidores reales cuando el usuario lo indique.',
      'Si existe consumo abierto, usar personasConsumoAbierto para cerveza, refrescos, cubatas, hielo, vasos, aperitivo y menaje.',
      'Separar refrescos de mezcla y refrescos de consumo directo si aparece en el prompt.',
      'Ajustar agua, hielo, cerveza y refrescos por calor sin exagerar.',
      'Redondear packs/latas a múltiplos operativos cuando el prompt lo pida.'
    ],
    reglasComida: [
      'No multiplicar todos los productos por todos los asistentes.',
      'Calcular aperitivos como picoteo compartido si procede.',
      'Calcular cenas solo para quienes cenan realmente si el prompt lo indica; si no, usar asistentesBase/2.',
      'Compra = necesidad total - donaciones/existencias confirmadas.'
    ],
    donacionesDetectadas: planExplicitDonationRowsLocalFix39(form, state).map(r => ({ producto:r.productName, unidades:r.unidades, tipo:r.ticketDonacion, donante:r.donorRef, responsable:r.responsableId })).slice(0, 140)
  };
}
function planPromptBriefText(form = {}, state = {}) {
  const b = planPromptBriefObject(form, state);
  const lines = [];
  lines.push('BRIEF ESTRUCTURADO DEL EVENTO - ControlEvent FIX47');
  lines.push(`Duración: ${b.duracionDias} día(s). Asistentes base: ${b.asistentesBase || b.personasAsistentes || 'sin dato'}.`);
  lines.push(`Consumo abierto: ${b.consumoAbiertoAplicado ? `${b.personasConsumoAbierto} personas (${b.consumoAbiertoOrigen})` : 'no aplicado'}${b.consumoAbiertoCalculado ? ` · fórmula base+66%=${b.consumoAbiertoCalculado}` : ''}.`);
  lines.push(`Bebida: cerveza ${b.personasCerveza || 'sin dato'} personas (${b.cervezasMaxPorPersonaDia || '?'} ud/persona/día si aplica); cubatas ${b.personasCubatas || 'sin dato'} personas (${b.cubatasPorPersonaConsumidora || '?'} por persona si aplica); sin alcohol/niños ${b.personasSinAlcoholNinos || 'sin dato'}.`);
  if (b.personasCenaReal) lines.push(`Cena real: ${b.personasCenaRealMin && b.personasCenaRealMin !== b.personasCenaRealMax ? `${b.personasCenaRealMin}-${b.personasCenaRealMax}` : b.personasCenaReal} personas (${b.cenaRealOrigen}).`);
  if (b.presupuestoObjetivoPorPersona || b.limiteMaximoPorPersona) lines.push(`Presupuesto: objetivo ${b.presupuestoObjetivoPorPersona || '?'} €/persona; máximo ${b.limiteMaximoPorPersona || '?'} €/persona.`);
  if (b.temperatura) lines.push(`Temperatura/clima: ${b.temperatura}`);
  lines.push('Momentos detectados:');
  b.momentosPorDia.forEach(m => lines.push(`- ${m.dia} (${m.momento}): ${m.detalle}`));
  const conceptLines = Object.entries(b.concepto).filter(([,v]) => v).map(([k,v]) => `- ${k}: ${v}`);
  if (conceptLines.length) lines.push('Concepto resumido:\n' + conceptLines.join('\n'));
  lines.push(`Donaciones/existencias confirmadas detectadas: ${b.donacionesDetectadas.length} línea(s).`);
  lines.push('Regla central: Zuzu calcula compras por déficit; ControlEvent conserva donaciones literales y no copia históricos en encargo total.');
  return lines.join('\n');
}
function planMenuResumenFromBrief(form = {}) {
  const b = planPromptBriefObject(form, {});
  function resumenPara(item) {
    const det = trim(item?.detalle || '');
    if (det && !/franja\s+(?:a\s+definir|inferida)/i.test(det)) { const limpio = det.replace(/^todo\s+el\s+d[ií]a\s*:?\s*/i, '').replace(/\s+/g, ' ').trim(); return /^ser[aá]\s+a\s+base\s+de/i.test(limpio) ? limpio : `Será a base de ${limpio.charAt(0).toLowerCase()}${limpio.slice(1)}`; }
    const mom = normPlanKey(item?.momento);
    if (/aperitivo/.test(mom)) return 'Será a base de aperitivo/picoteo compartido, ajustado al concepto del usuario y a las donaciones disponibles.';
    if (/comida/.test(mom)) return 'Será a base de una comida principal definida por Zuzu según el brief, con compras solo por déficit.';
    if (/tardeo|cubata/.test(mom) && !/noche/.test(mom)) return 'Será a base de tardeo/copas/cubatas si procede, separando mezcla, consumo directo, hielo y vasos.';
    if (/cena/.test(mom)) return 'Será a base de una cena ajustada a las personas que realmente cenan y al tipo de evento indicado.';
    if (/noche/.test(mom)) return 'Será a base de copas/cubatas de noche si procede, calculadas para consumidores reales.';
    return 'Será a base de una propuesta libre de Zuzu ajustada al brief, sin plantilla fija.';
  }
  return b.momentosPorDia.map(item => ({ dia:item.dia, momento:item.momento, resumen:resumenPara(item) }));
}
function planCompleteMenuResumen(raw, form = {}) {
  const base = planNormalizeMenuResumen(raw, form);
  const fallback = planMenuResumenFromBrief(form);
  const seen = new Set(base.map(x => `${normPlanKey(x.dia)}|${normPlanKey(x.momento)}`));
  fallback.forEach(x => {
    const k = `${normPlanKey(x.dia)}|${normPlanKey(x.momento)}`;
    if (!seen.has(k)) base.push(x);
  });
  return base.slice(0, Math.max(4, planEffectiveDays(form) * 6));
}



function planPromptCompactForGemini33(form = {}) {
  const raw = planPromptRawText(form).replace(/\r/g, '');
  if (!raw) return '';
  const lines = raw.split(/\n/).map(x => trim(x)).filter(Boolean);
  const useful = [];
  const keepRx = /(objetivo|fecha|duraci[oó]n|asistentes|asistentes\s+base|consumo\s+abierto|cena\s+real|presupuesto|l[ií]mite|temperatura|tipo\s+de\s+evento|personas\s+que|sin\s+alcohol|cenar[aá]n|hora|tardeo|aperitivo|comida|cena|cubatas|cerveza|reglas?|criterios?|pistas?)/i;
  for (const line of lines) { if (useful.join('\n').length > 3500) break; if (keepRx.test(line) || /^(?:d[ií]a|dia)\s*[_\- ]*\d+/i.test(line)) useful.push(line); }
  const txt = useful.join('\n') || raw.slice(0, 3500);
  return txt.slice(0, 4200);
}
function planDonationRowsForGemini33(form = {}, state = {}) {
  const maps = planBuildMaps(state);
  return planExplicitDonationRowsLocalFix39(form, state).map(r => ({ producto: trim(r.productName), unidades: round(r.unidades, 2), precio: round(r.precio, 4), tipoDonacion: trim(r.ticketDonacion), donante: planDonorLabel(r.donorRef, maps) || trim(r.donorRef), responsable: planPersonName(r.responsableId, maps) || trim(r.responsableId), segmento: trim(r.segmento), destino: trim(r.destino) })).slice(0, 140);
}

function planDonationCompactLine(r) {
  return [trim(r.tipoDonacion || r.ticketDonacion || 'DONADO'), trim(r.donante || r.donorRef || 'Donante'), trim(r.responsable || r.responsableId || 'Responsable'), `${trim(r.producto || r.productName || '')}: ${round(r.unidades, 2)}`]
    .filter(Boolean).join(' | ');
}
function planFormattedUserPromptForGemini38(form = {}) {
  const raw = planPromptRawText(form).replace(/\r/g, '');
  if (!raw) return '';
  const lines = raw.split(/\n/).map(x => trim(x)).filter(Boolean);
  const useful = [];
  let skipProducts = false;
  const keepRx = /(objetivo|fecha|duraci[oó]n|asistentes|asistentes\s+base|consumo\s+abierto|cena\s+real|presupuesto|l[ií]mite|temperatura|coste|personas que|sin alcohol|ni[ñn]os|cenar[aá]n|hora|tardeo|aperitivo|comida|cena|cubatas|cerveza|reglas?|criterios?|pistas?|d[ií]a\s*[_\- ]*\d|donado\s+(?:socio|tienda|otros)|responsable|comprar solo|d[eé]ficit|no inventar|no copiar|cat[aá]logo)/i;
  for (const line of lines) {
    if (/^PRODUCTOS\s*:?$/i.test(line)) { skipProducts = true; continue; }
    if (/^(?:Donado|Donaci[oó]n|Pistas|Reglas|Criterios|Datos|Resumen|Objetivo|Fechas|Duraci[oó]n|Asistentes|Presupuesto|L[ií]mite|Temperatura)/i.test(line)) skipProducts = false;
    if (skipProducts && /^[*\-•]?\s*.+\s*:\s*\d+(?:[,.]\d+)?\s*$/i.test(line)) continue;
    if (keepRx.test(line)) useful.push(line);
    if (useful.join('\n').length > 5200) break;
  }
  return (useful.join('\n') || raw.slice(0, 5200)).slice(0, 6200);
}

function planContextDirectJsonForGemini38(ctx, form = {}) {
  const brief = ctx?.briefEvento || {};
  const moments = arr(ctx?.momentosEsperados || brief?.momentosPorDia)
    .map(m => ({ dia: trim(m.dia), momento: trim(m.momento), detalle: trim(m.detalle || '') }))
    .slice(0, 80);
  const products = arr(ctx?.catalogos?.productos).slice(0, 160).map(p => ({
    producto: trim(p.nombre),
    precio: round(p.precio, 4),
    segmento: trim(p.segmento),
    destino: trim(p.destino),
    tienda: trim(p.tienda)
  })).filter(p => p.producto);
  return {
    versionContexto: 'FIX47_CONSUMO_ABIERTO_VARIABLE',
    modo: ctx?.modo,
    instruccionPrincipal: 'Lee el prompt formateado como fuente principal. Las donaciones ya las crea ControlEvent; usa el resumen solo para descontar déficit. Devuelve compras concretas y avisos, no repitas donaciones.',
    evento: {
      titulo: ctx?.eventoNuevo?.titulo,
      dias: ctx?.eventoNuevo?.diasOperativos,
      asistentes: brief.personasAsistentes,
      presupuestoObjetivoPersona: brief.presupuestoObjetivoPorPersona,
      limitePersona: brief.limiteMaximoPorPersona,
      clima: brief.temperatura
    },
    consumo: {
      cervezaPersonas: brief.personasCerveza,
      cervezaMaxPorPersonaDia: brief.cervezasMaxPorPersonaDia,
      cubatasPersonas: brief.personasCubatas,
      cubatasPorPersona: brief.cubatasPorPersonaConsumidora,
      sinAlcoholNinos: brief.personasSinAlcoholNinos,
      cenaRealPersonas: brief.personasCenaReal
    },
    momentosDetectadosPorControlEvent: moments,
    promptFormateadoUsuario: planFormattedUserPromptForGemini38(form),
    donacionesExistenciasResumen: arr(ctx?.existenciasYDonacionesExplicitas).map(planDonationCompactLine).slice(0, 60),
    productosCatalogo: products.slice(0, 55),
    reglasControlEvent: [
      'NO devuelvas donaciones completas; ControlEvent ya las extrae y crea desde el prompt. Úsalas solo para calcular déficit.',
      'Las compras deben salir en compras con producto, tienda y responsable; añade cantidad/unidades/precio si puedes.',
      'Compra solo déficit real tras restar donaciones/existencias descritas en el prompt.',
      'No inventes donaciones; si algo es dudoso, compra revisable o aviso.',
      'No uses plantillas fijas ni históricos.',
      'Mantén nombres de producto parecidos al catálogo cuando encajen, pero si el tamaño/formato cambia conserva el nombre original.'
    ],
    salidaJsonEsperada: {
      menuResumen: [{ dia:'dia_1', momento:'cena', resumen:'Será a base de ...' }],
      compras: [{ producto:'Cerveza clásica (8 packs de 24 latas 33cl)', tienda:'Supermercado Mayorista', responsable:'Zuzu', unidades:192, precio:0.45 }],
      avisos: []
    }
  };
}
function planGeminiContext(form, baseRows, incomeRows, state, sourceEvent, modules) {
  const totalMode = trim(form.mode).toUpperCase() === 'ZUZU_TOTAL';
  const compactRows = totalMode ? [] : arr(baseRows).slice(0, 450).map(r => ({ productId:r.productId, producto:r.productName, segmento:r.segmento, destino:r.destino, tipo:r.tipo, unidades:r.unidades, precio:r.precio, ticketDonacion:r.ticketDonacion, tienda: r.tiendaId, responsable: r.responsableId, donante:r.donorRef, origen:r.sourceEventTitle }));
  const diasDetectadosPrompt = planDetectedDaysFromPrompt(form);
  const diasOperativos = planEffectiveDays(form);
  const brief = planPromptBriefObject(form, state);
  const donaciones = planDonationRowsForGemini33(form, state);
  return { __formForGemini38: form, versionContexto: totalMode ? 'FIX47_CONSUMO_ABIERTO_VARIABLE' : 'HISTORICO_AMPLIADO', modo: planModeLabel(form.mode), aislamientoEncargoTotal: totalMode ? 'ACTIVO: no se entregan eventos finalizados ni filas históricas como fuente; solo brief variable, donaciones literales y catálogo compacto.' : 'NO ACTIVO', modulosSolicitados: modules, eventoNuevo: { titulo: trim(form.title), fechaIni: trim(form.fechaIni), fechaFin: trim(form.fechaFin), diasFormulario: num(form.diasFormulario ?? form.dias), diasDetectadosPrompt, diasOperativos, personasEstimadas: num(form.personas) }, promptUsuarioCompacto: totalMode ? planPromptCompactForGemini33(form) : planPromptRawText(form).slice(0, 12000), briefEvento: brief, briefEventoTexto: planPromptBriefText(form, state), momentosEsperados: brief.momentosPorDia, eventoModelo: sourceEvent ? { id: trim(sourceEvent.id), titulo: planEventTitle(sourceEvent), precio: round(sourceEvent.precio, 2), fechaIni: trim(sourceEvent.fechaIni), fechaFin: trim(sourceEvent.fechaFin) } : null, responsablePorDefecto: trim(form.defaultResponsibleName), tiendaPorDefecto: trim(form.defaultStoreName), filasHistoricasBase: compactRows, ingresosHistoricosBase: totalMode ? [] : arr(incomeRows).slice(0, 120).map(i => ({ colaborador:i.personaName, rango:i.rango, numero:i.numero, obligatorio:i.importeObligatorio, voluntario:i.importeVoluntario })), existenciasYDonacionesExplicitas: donaciones, reglasCalculo: ['Crear compras solo por déficit: necesidad total menos donaciones/existencias confirmadas.', 'No inventar donaciones ni aumentar cantidades donadas.', 'Conservar como compra revisable cualquier producto razonable que no encaje exacto en catálogo.', 'No usar menús fijos: el menú sale del brief del usuario y de la propuesta de Zuzu.', 'Si no hay datos suficientes, proponer supuestos explícitos y preguntas pendientes, no copiar históricos.'], catalogos: planCatalogForGemini(state, form) };
}
function planPromptContextForGemini(ctx, totalMode) {
  if (!totalMode) return ctx;
  // FIX35: el prompt a Zuzu debe parecerse a una consulta humana corta.
  // La traza completa conserva el brief detallado, pero a Zuzu solo se le manda lo operativo.
  return planContextDirectJsonForGemini38(ctx, ctx?.__formForGemini38 || {});
}


function planPromptWithoutDonationBlocksFix43(form = {}) {
  const raw = planPromptRawText(form).replace(/\r/g, '');
  const lines = raw.split(/\n/);
  const out = [];
  let skipping = false;
  const startDon = /^(\s*)(DONACIONES?\b|DONACI[ÓO]N\b|DONACION\b|DONADO\s+(?:SOCIO|TIENDA|OTROS)\b|PRODUCTO\s+EN\s+LA\s+PE[NÑ]A\b|EXISTENCIAS?\b|YA\s+TENEMOS\b|PRODUCTOS\s*:)/i;
  const stop = /^(\s*)(PISTAS\s+DE\s+COMPRA|REGLAS\s+FINALES|CRITERIOS?|OBJETIVO|DATOS\s+PARA|DESCRIPCI[ÓO]N|RESUMEN\s+DE\s+MEN[ÚU]|REGLAS\s+DE\s+BEBIDA|REGLAS\s+DE\s+COMIDA)\b/i;
  for (const line of lines) {
    const t = trim(line || '');
    if (startDon.test(t)) { skipping = true; continue; }
    if (skipping && stop.test(t)) { skipping = false; out.push(line); continue; }
    if (!skipping) out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, 2400);
}
function planCompactCatalogForNeedsFix43(state = {}, form = {}) {
  const wanted = /cerveza|coca|zero|fanta|sprite|tonica|t[oó]nica|schweppes|hielo|agua|ron|barcelo|brugal|whisky|wiski|jb|ginebra|beefeater|larios|pan|chorizo|lomo|morcilla|panceta|venao|jam[oó]n|queso|anchoa|mejillon|patata|encurtido|vaso|plato|servilleta|bolsa|basura|fairy|lavavajillas|abrillantador|secamanos|papel|jabon|jab[oó]n|ambientador/i;
  const seen = new Set();
  const products = arr(state?.productos)
    .filter(p => p && p.nombre && (wanted.test(p.nombre) || wanted.test(String(p.segmento || '') + ' ' + String(p.destino || ''))))
    .map(p => ({ producto:trim(p.nombre), precio:round(num(p.defaultPrecio ?? p.precio ?? p.precioReferencia), 4), segmento:trim(p.segmento || ''), destino:trim(p.destino || '') }))
    .filter(p => {
      const k = normPlanKey(p.producto);
      if(!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  // FIX44: catálogo mínimo y útil. No se manda media base de datos a Zuzu.
  const priority = /cerveza|coca|hielo|ron|whisky|wiski|jb|ginebra|beefeater|tonica|fanta|sprite|agua|chorizo|lomo|morcilla|panceta|venao|pan|vaso|plato|servilleta|fairy|lavavajillas|abrillantador|secamanos|bolsa.*basura/i;
  return products.sort((a,b)=> (priority.test(b.producto)?1:0) - (priority.test(a.producto)?1:0)).slice(0, 32);
}
function planTheoreticalPromptContextFix43(form = {}, state = {}) {
  const brief = planPromptBriefObject(form, state);
  return {
    versionContexto:'FIX47_CONSUMO_ABIERTO_VARIABLE',
    tarea:'Devuelve SOLO un array JSON de necesidades teóricas totales; ControlEvent descontará donaciones y calculará el déficit.',
    evento:{
      dias:brief.duracionDias,
      asistentesBase:brief.asistentesBase || brief.personasAsistentes,
      asistentes:brief.personasAsistentes,
      consumoAbiertoPersonas:brief.personasConsumoAbierto,
      consumoAbiertoAplicado:brief.consumoAbiertoAplicado,
      consumoAbiertoOrigen:brief.consumoAbiertoOrigen,
      cenaRealPersonas:brief.personasCenaReal,
      cenaRealMin:brief.personasCenaRealMin,
      cenaRealMax:brief.personasCenaRealMax,
      clima:brief.temperatura,
      presupuestoPersona:brief.presupuestoObjetivoPorPersona,
      limitePersona:brief.limiteMaximoPorPersona
    },
    consumo:{
      cervezaPersonasDeclaradas:brief.personasCervezaDeclaradas,
      cervezaPersonasCalculo:brief.personasCerveza,
      cervezaMaxPorPersonaDia:brief.cervezasMaxPorPersonaDia,
      cubatasPersonasDeclaradas:brief.personasCubatasDeclaradas,
      cubatasPersonasCalculo:brief.personasCubatas,
      cubatasPorPersona:brief.cubatasPorPersonaConsumidora,
      sinAlcoholNinos:brief.personasSinAlcoholNinos,
      cenaRealPersonas:brief.personasCenaReal
    },
    reglasConsumoAbierto:[
      'Si consumoAbiertoAplicado es true, calcula cerveza, refrescos, cubatas, hielo, vasos, aperitivo y menaje usando consumoAbiertoPersonas, no asistentesBase.',
      'La cena/barbacoa se calcula aparte con cenaRealPersonas o rango cenaRealMin-cenaRealMax.',
      'Si no se indica consumo abierto pero el texto habla de peña en plaza, gente de paso o invitados, ControlEvent usa asistentesBase + 66%.'
    ],
    momentos:arr(brief.momentosPorDia).slice(0, 14).map(m => `${m.dia} ${m.momento}: ${trim(m.detalle).slice(0,120)}`),
    concepto:planPromptWithoutDonationBlocksFix43(form),
    catalogo:planCompactCatalogForNeedsFix43(state, form),
    salida:'array JSON: [{"producto":"...","cantidadTotal":0,"unidad":"ud|kg|botellas|bolsas","motivo":"formula o criterio"}]'
  };
}

function planSplitWholeFix45(total, weights) {
  const t = Math.max(0, Math.round(num(total)));
  const ws = arr(weights).map(w => Math.max(0, num(w)));
  const sum = ws.reduce((a,b)=>a+b,0) || 1;
  const raw = ws.map(w => (t * w) / sum);
  const base = raw.map(x => Math.floor(x));
  let left = t - base.reduce((a,b)=>a+b,0);
  raw.map((x,i)=>({i, frac:x-base[i]})).sort((a,b)=>b.frac-a.frac).forEach(x => { if(left>0){ base[x.i] += 1; left -= 1; } });
  return base;
}
function planLocalTheoreticalNeedsFix44(form = {}) {
  const b = planPromptBriefObject(form, {});
  const days = Math.max(1, num(b.duracionDias) || 1);
  const people = Math.max(1, num(b.asistentesBase || b.personasAsistentes) || num(form.personas) || 1);
  const openPeople = Math.max(people, num(b.personasConsumoAbierto) || people);
  const activePeople = b.consumoAbiertoAplicado ? openPeople : people;
  const beerPeople = Math.max(0, num(b.personasCerveza) || (b.consumoAbiertoAplicado ? activePeople : 0));
  const beerPerDay = Math.max(0, num(b.cervezasMaxPorPersonaDia));
  const cubataPeople = Math.max(0, num(b.personasCubatas) || (b.consumoAbiertoAplicado ? activePeople : 0));
  const cubatasPer = Math.max(0, num(b.cubatasPorPersonaConsumidora));
  const cenaPeople = Math.max(0, num(b.personasCenaRealMax || b.personasCenaReal) || Math.ceil(people / 2));
  const hot = /calor|verano|sol/i.test(String(b.temperatura || '') + ' ' + planPromptRawText(form));
  const out = [];
  function add(producto, cantidadTotal, unidad, motivo){
    const qty = round(num(cantidadTotal), 2);
    if(!producto || !(qty > 0)) return;
    out.push({producto, cantidadTotal:qty, unidad, motivo});
  }
  if(beerPeople && beerPerDay) add('Cerveza lata 33cl', Math.ceil((beerPeople * beerPerDay * days) / 24) * 24, 'ud', `${beerPeople} consumidores x ${beerPerDay} ud x ${days} días, redondeado a packs de 24`);
  const totalCubatas = cubataPeople && cubatasPer ? cubataPeople * cubatasPer : 0;
  if(totalCubatas){
    const ronTotal = Math.max(1, Math.ceil(totalCubatas * 0.35 / 14));
    const whiskyTotal = Math.max(1, Math.ceil(totalCubatas * 0.30 / 14));
    const ginTotal = Math.max(1, Math.ceil(totalCubatas * 0.25 / 14));
    const ron = planSplitWholeFix45(ronTotal, [60,30,10]);
    const whisky = planSplitWholeFix45(whiskyTotal, [60,30,10]);
    const gin = planSplitWholeFix45(ginTotal, [55,30,15]);
    if(ron[0]) add('Ron BARCELO Añejo 0.7 L', ron[0], 'botellas', `${totalCubatas} cubatas teóricos: ron 60% Barceló, 30% Brugal, 10% otros.`);
    if(ron[1]) add('Ron BRUGAL Añejo 0.7L', ron[1], 'botellas', `${totalCubatas} cubatas teóricos: ron 60% Barceló, 30% Brugal, 10% otros.`);
    if(ron[2]) add('Ron Puerto de Indias', ron[2], 'botellas', `${totalCubatas} cubatas teóricos: ron residual/otros.`);
    if(whisky[0]) add('Whisky 5 Años J.B Botella 0.7 L', whisky[0], 'botellas', `${totalCubatas} cubatas teóricos: whisky 60% JB, 30% DYC 1L, 10% Jhonnie Walker.`);
    if(whisky[1]) add('Whisky DYC 1L. 40°', whisky[1], 'botellas', `${totalCubatas} cubatas teóricos: whisky 60% JB, 30% DYC 1L, 10% Jhonnie Walker.`);
    if(whisky[2]) add('Whisky JHONY WALKER 0.7 L. 40°', whisky[2], 'botellas', `${totalCubatas} cubatas teóricos: whisky residual/otros.`);
    if(gin[0]) add('Gin BEEFEATER 0.7 L. 43°', gin[0], 'botellas', `${totalCubatas} cubatas teóricos: ginebra 55% Beefeater, 30% Larios, 15% Tanqueray.`);
    if(gin[1]) add('Gin LARIOS 1 L. 40°', gin[1], 'botellas', `${totalCubatas} cubatas teóricos: ginebra 55% Beefeater, 30% Larios, 15% Tanqueray.`);
    if(gin[2]) add('GINEBRA Tanqueray', gin[2], 'botellas', `${totalCubatas} cubatas teóricos: ginebra residual Tanqueray.`);
    add('COCA COLA Bote 32 Cl', Math.ceil((totalCubatas * 0.45) / 24) * 24, 'ud', 'Refresco de mezcla principal para cubatas');
    add('COCA COLA ZERO Bote 32 Cl', Math.ceil((totalCubatas * 0.20) / 24) * 24, 'ud', 'Refresco de mezcla y consumo directo sin azúcar');
    add('Tónica lata', Math.ceil((totalCubatas * 0.18) / 24) * 24, 'ud', 'Tónica para ginebra y combinados');
    add('FANTA Naranja Bote 32 C.L', 24, 'ud', 'Refresco de apoyo para mezcla/consumo directo');
    add('FANTA Limon Bote 32 CL', 24, 'ud', 'Refresco de apoyo para mezcla/consumo directo');
    add('HIELO', hot ? 35 : 25, 'bolsas', 'Cubatas, refrescos y conservación con ajuste por calor');
  }
  add('Garrafa AGUA (5L)', hot ? Math.ceil((activePeople * days * 1.2) / 5) : Math.ceil((activePeople * days * 0.8) / 5), 'garrafas', 'Agua de apoyo por consumo abierto/base, días y temperatura');
  const raw = planPromptRawText(form);
  if(/chorizo/i.test(raw)) add('Chorizo fresco de asar', Math.max(1, round(cenaPeople * 0.10 * Math.min(days,3), 1)), 'kg', 'Cena informal calculada solo para quienes cenan realmente');
  if(/lomo/i.test(raw)) add('Lomo fresco', Math.max(1, round(cenaPeople * 0.12 * Math.min(days,3), 1)), 'kg', 'Cena informal calculada solo para quienes cenan realmente');
  if(/morcilla/i.test(raw)) add('Morcilla', Math.max(1, round(cenaPeople * 0.08 * Math.min(days,3), 1)), 'kg', 'Cena informal calculada solo para quienes cenan realmente');
  if(/panceta|baicon|bacon/i.test(raw)) add('Panceta', Math.max(1, round(cenaPeople * 0.10 * Math.min(days,3), 1)), 'kg', 'Cena informal calculada solo para quienes cenan realmente');
  if(/venao|venado/i.test(raw)) add('Venao en salsa', Math.max(2, round(cenaPeople * 0.18, 1)), 'kg', 'Plato indicado en cena, cantidad revisable');
  if(/aperitivo|picoteo|patatas/i.test(raw)) add('patatas fritas (bolsa grande)', Math.max(4, Math.ceil(activePeople / 12) * days), 'bolsas', 'Picoteo compartido calculado con consumo abierto/base');
  if(/pan|barra|buffet|barbacoa/i.test(raw)) add('PAN (Barra)', Math.max(10, Math.ceil(people * days * 0.55)), 'ud', 'Pan de apoyo calculado con asistentes base: 0,55 barras/persona/día');
  add('Vasos de plástico', Math.max(100, Math.ceil((activePeople * days * 4) / 50) * 50), 'ud', 'Vasos para bebida/cubatas calculados con consumo abierto/base');
  add('Platos desechables', Math.max(50, Math.ceil((Math.max(activePeople, cenaPeople) * Math.min(days,3) * 1.5) / 50) * 50), 'ud', 'Platos para comidas/cenas con consumo abierto y cena real');
  add('Servilletas', Math.max(2, days), 'paquetes', 'Servicio de comidas y aperitivos');
  add('Bolsas Basura Grandes 240L', Math.max(1, days), 'rollos', 'Infraestructura básica del local');
  return out.slice(0, 28);
}
function planMergeTheoreticalNeedsFix44(parsed, form = {}) {
  const out = Array.isArray(parsed) ? { necesidadesTeoricas: parsed, __jsonArrayFix44:true } : { ...(parsed || {}) };
  const list = arr(out.necesidadesTeoricas || out.necesidades_teoricas || out.NECESIDADES_TEORICAS || out.theoreticalNeeds || out.requirements).slice();
  const seen = new Set(list.map(x => planFamilyFix43(x?.producto || x?.PRODUCTO || x?.product || x?.nombre || '')).filter(Boolean));
  for(const n of planLocalTheoreticalNeedsFix44(form)){
    const fam = planFamilyFix43(n.producto);
    if(fam && !seen.has(fam)){ list.push({...n, motivo: trim(n.motivo || '') + ' · añadido por ControlEvent FIX47 porque Zuzu no entregó esta familia.'}); seen.add(fam); }
  }
  out.necesidadesTeoricas = list.slice(0, 28);
  out.__ceFix44MergedLocalNeeds = true;
  return out;
}

function planPrompt(form, baseRows, incomeRows, state, sourceEvent, modules) {
  const ctx = planGeminiContext(form, baseRows, incomeRows, state, sourceEvent, modules);
  const totalMode = trim(form.mode).toUpperCase() === 'ZUZU_TOTAL';
  if (!totalMode) {
    const ctxJson = JSON.stringify(planPromptContextForGemini(ctx, false));
    return `Eres Zuzu, planificador de eventos dentro de ControlEvent. Devuelve SOLO JSON válido.
SALIDA: {"menuResumen":[{"dia":"dia_1","momento":"aperitivo","resumen":"Será a base de ..."}],"rows":[{"tipo":"COMPRA","producto":"...","unidades":1,"precio":0,"necesidadTotal":1,"reason":"..."}],"notes":[],"preguntasPendientes":[]}
CONTEXTO:
${ctxJson}`;
  }
  const needCtx = planTheoreticalPromptContextFix43(form, state);
  const needJson = JSON.stringify(needCtx);
  return `Devuelve SOLO un ARRAY JSON válido, sin markdown y sin texto fuera.
Cada elemento debe ser una necesidad teórica total del evento, NO una compra final.
No descuentes donaciones. ControlEvent descontará después con equivalencias locales.
Máximo 18 elementos. Prioriza bebida, hielo, agua, comida indicada, menaje e infraestructura básica.
Formato exacto: [{"producto":"Cerveza lata 33cl","cantidadTotal":375,"unidad":"ud","motivo":"25 consumidores x 5 ud x 3 días"}]
Usa nombres parecidos al catálogo si encajan, sin cambiar formato/capacidad.
CONTEXTO=${needJson}`;
}

function planRowsFromLocalTheoreticalNeedsFix44(form = {}, state = {}, explicitDonationRows = [], baseRows = []) {
  const pseudo = planNormalizeDirectGeminiJson38(planMergeTheoreticalNeedsFix44({ necesidadesTeoricas: [] }, form));
  let matched = matchPlanRows(pseudo.rows, arr(baseRows), state, form);
  matched = planSubtractDonationsFromTheoreticalRowsFix43(matched, explicitDonationRows);
  return {
    rows: matched,
    menuResumen: planCompleteMenuResumen([], form),
    notes: ['ControlEvent FIX47 ha completado necesidades teóricas por cálculo local porque Zuzu no devolvió un JSON completo. Se usan datos del prompt: días, asistentes, cerveza, cubatas, calor, cenas reales, comida indicada e infraestructura básica.']
  };
}
function planDirectDonationType38(value) {
  const n = normPlanKey(value || '');
  if (/TIENDA/.test(n)) return 'DONADO TIENDA';
  if (/OTROS|OTRO|EXTERNO/.test(n)) return 'DONADO OTROS';
  return 'DONADO SOCIO';
}
function planUnitsFromGeminiProduct38(productText, fallback = 1) {
  const raw = trim(productText || '');
  let m = raw.match(/(\d+(?:[,.]\d+)?)\s*(?:pack|packs|paquete|paquetes|caja|cajas)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)\s*(?:ud\.?|uds\.?|unidades|latas|botellines|botellas|botes)?/i);
  if (m) return Math.max(0.01, round(num(m[1]) * num(m[2]), 2));
  m = raw.match(/[\(\[]\s*(\d+(?:[,.]\d+)?)\s*(?:botellas?|bolsas?|sacos?|packs?|paquetes?|cajas?|latas?|botes?|ud\.?|uds\.?|unidades|kg|kilos?)\b/i);
  if (m) return Math.max(0.01, round(num(m[1]), 2));
  m = raw.match(/\b(\d+(?:[,.]\d+)?)\s*(?:botellas?|bolsas?|sacos?|packs?|paquetes?|cajas?|latas?|botes?|ud\.?|uds\.?|unidades|kg|kilos?)\b/i);
  if (m) return Math.max(0.01, round(num(m[1]), 2));
  if (num(fallback) > 0) return Math.max(0.01, round(fallback, 2));
  return Math.max(0.01, planExplicitUnits(raw));
}
function planCleanGeminiProductLabel38(productText) {
  let s = trim(productText || '');
  // En donaciones con "Producto: 1", planCleanExplicitProductText ya conserva el nombre.
  s = s.replace(/\s*[\(\[]\s*\d+(?:[,.]\d+)?\s*(?:botellas?|bolsas?|sacos?|packs?|paquetes?|cajas?|latas?|botes?|ud\.?|uds\.?|unidades)\b[^\)\]]*[\)\]]\s*/ig, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return planCleanExplicitProductText(s) || trim(productText || '');
}
function planNormalizeDirectGeminiJson38(parsed) {
  const out = Array.isArray(parsed) ? { necesidadesTeoricas: parsed, __jsonArrayFix44:true } : { ...(parsed || {}) };
  const rows = arr(out.rows).slice();
  const necesidades = arr(out.necesidadesTeoricas || out.necesidades_teoricas || out.NECESIDADES_TEORICAS || out.theoreticalNeeds || out.requirements);
  const donaciones = arr(out.donaciones || out.DONACIONES || out.donations || out.DONATIONS);
  const compras = arr(out.compras || out.COMPRAS || out.purchases || out.PURCHASES);
  necesidades.forEach((n, idx) => {
    const productoRaw = trim(n?.producto || n?.PRODUCTO || n?.product || n?.nombre || '');
    if (!productoRaw) return;
    const totalNeed = num(n?.cantidadTotal ?? n?.cantidad ?? n?.unidades ?? n?.uds ?? n?.total ?? 0) || planUnitsFromGeminiProduct38(productoRaw, 1);
    rows.push({
      tipo:'COMPRA',
      producto: planCleanGeminiProductLabel38(productoRaw),
      unidades: Math.max(0, round(totalNeed, 2)),
      necesidadTotal: Math.max(0, round(totalNeed, 2)),
      unidadTeorica: trim(n?.unidad || n?.UNIDAD || ''),
      precio: num(n?.precio ?? n?.price ?? 0),
      tienda: trim(n?.tienda || n?.TIENDA || n?.store || ''),
      responsable: trim(n?.responsable || n?.RESPONSABLE || n?.manager || 'Zuzu'),
      reason: trim(n?.motivo || n?.reason || '') || 'Necesidad teórica total devuelta por Zuzu; ControlEvent resta donaciones después.',
      __ceFix43NecesidadTeorica:true,
      __productoEscritoOriginal: productoRaw,
      __geminiDirect38:true,
      __geminiDirectIndex: idx
    });
  });
  donaciones.forEach((d, idx) => {
    const productoRaw = trim(d?.producto || d?.PRODUCTO || d?.product || d?.Product || '');
    if (!productoRaw) return;
    rows.push({
      tipo: 'DONACION',
      producto: planCleanGeminiProductLabel38(productoRaw),
      unidades: num(d?.unidades ?? d?.uds ?? d?.cantidad) > 0 ? num(d?.unidades ?? d?.uds ?? d?.cantidad) : planExplicitUnits(productoRaw),
      ticketDonacion: planDirectDonationType38(d?.tipoDonacion || d?.['TIPO DE DONACION'] || d?.tipo || d?.type),
      donante: trim(d?.donante || d?.DONANTE || d?.donor || ''),
      responsable: trim(d?.responsable || d?.RESPONSABLE || d?.manager || ''),
      reason: 'Donación devuelta por Zuzu en JSON directo.',
      __geminiDirect38: true,
      __geminiDirectIndex: idx
    });
  });
  compras.forEach((c, idx) => {
    const productoRaw = trim(c?.producto || c?.PRODUCTO || c?.product || c?.Product || '');
    if (!productoRaw) return;
    rows.push({
      tipo: 'COMPRA',
      producto: planCleanGeminiProductLabel38(productoRaw),
      unidades: num(c?.unidades ?? c?.uds ?? c?.cantidad) > 0 ? num(c?.unidades ?? c?.uds ?? c?.cantidad) : planUnitsFromGeminiProduct38(productoRaw, 1),
      precio: num(c?.precio ?? c?.price ?? 0),
      tienda: trim(c?.tienda || c?.TIENDA || c?.store || ''),
      responsable: trim(c?.responsable || c?.RESPONSABLE || c?.manager || 'Zuzu'),
      reason: trim(c?.reason || c?.motivo || c?.MOTIVO || '') || 'Compra por déficit devuelta por Zuzu en JSON directo.',
      __productoEscritoOriginal: productoRaw,
      __geminiDirect38: true,
      __geminiDirectIndex: idx
    });
  });
  out.rows = rows;
  out.notes = arr(out.notes).concat(arr(out.avisos || out.AVISOS || out.warnings)).map(x => trim(typeof x === 'string' ? x : JSON.stringify(x))).filter(Boolean);
  out.__directCounts38 = { necesidadesTeoricas: necesidades.length, donaciones: donaciones.length, compras: compras.length, rows: rows.length };
  return out;
}

function planExtractJsonArrayByKeyFix39(textValue, key) {
  const txt = String(textValue || '');
  const rx = new RegExp('"' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"\\s*:\\s*\\[', 'i');
  const m = rx.exec(txt);
  if (!m) return [];
  let i = m.index + m[0].lastIndexOf('[');
  let depth = 0, inStr = false, esc = false;
  for (let j=i; j<txt.length; j++) {
    const ch = txt[j];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '[') depth += 1;
    else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        const piece = txt.slice(i, j + 1).replace(/,\s*([}\]])/g, '$1');
        try { return JSON.parse(piece); } catch (_) { return []; }
      }
    }
  }
  return [];
}
function planSalvageJsonArrayPrefixFix44(outText) {
  const txt = String(outText || '').trim();
  const start = txt.indexOf('[');
  if (start < 0) return [];
  const out = [];
  let depth = 0, objStart = -1, inStr = false, esc = false;
  for (let i = start + 1; i < txt.length; i++) {
    const ch = txt[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === '{') { if (depth === 0) objStart = i; depth += 1; }
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0 && objStart >= 0) {
        const piece = txt.slice(objStart, i + 1).replace(/,\s*([}\]])/g, '$1');
        try { out.push(JSON.parse(piece)); } catch (_) {}
        objStart = -1;
      }
    }
  }
  return out;
}
function planSalvageDirectGeminiJsonFix39(outText) {
  let necesidadesTeoricas = planExtractJsonArrayByKeyFix39(outText, 'necesidadesTeoricas');
  const topArray = planSalvageJsonArrayPrefixFix44(outText);
  if (!necesidadesTeoricas.length && topArray.length) necesidadesTeoricas = topArray;
  const menuResumen = planExtractJsonArrayByKeyFix39(outText, 'menuResumen');
  const compras = planExtractJsonArrayByKeyFix39(outText, 'compras');
  const avisos = planExtractJsonArrayByKeyFix39(outText, 'avisos');
  const notes = planExtractJsonArrayByKeyFix39(outText, 'notes');
  if (necesidadesTeoricas.length || menuResumen.length || compras.length || avisos.length || notes.length) return { necesidadesTeoricas, menuResumen, compras, avisos, notes, __jsonSalvagedFix39:true, __jsonArrayPrefixSalvagedFix44: topArray.length > 0 };
  return null;
}

async function callGeminiPlanificacion(form, baseRows, incomeRows, state, sourceEvent, modules) {
  const apiKey = geminiKey();
  if (!apiKey) throw new Error('Sin GEMINI_API_KEY para planificacion con Zuzu.');
  const started = Date.now();
  const promptText = planPrompt(form, baseRows, incomeRows, state, sourceEvent, modules);
  const context = planGeminiContext(form, baseRows, incomeRows, state, sourceEvent, modules);
  const contextPrompt = planPromptContextForGemini(context, trim(form?.mode).toUpperCase() === 'ZUZU_TOTAL');
  const trace = {
    version: 'FIX47_CONSUMO_ABIERTO_VARIABLE',
    startedAt: new Date(started).toISOString(),
    mode: trim(form?.mode),
    promptChars: promptText.length,
    contextResumen: {
      diasOperativos: context?.eventoNuevo?.diasOperativos,
      diasDetectadosPrompt: context?.eventoNuevo?.diasDetectadosPrompt,
      asistentes: context?.briefEvento?.personasAsistentes,
      consumoAbierto: context?.briefEvento?.personasConsumoAbierto,
      consumoAbiertoAplicado: context?.briefEvento?.consumoAbiertoAplicado,
      cenaReal: context?.briefEvento?.personasCenaReal,
      momentos: arr(context?.briefEvento?.momentosPorDia).length,
      donacionesDetectadas: arr(context?.existenciasYDonacionesExplicitas).length,
      productosCatalogoEntregados: arr(contextPrompt?.productosCatalogo).length || arr(contextPrompt?.catalogoIndicativo).length || contextPrompt?.catalogos?.productosEntregadosZuzu || context?.catalogos?.productosEntregadosGemini,
      totalProductosCatalogo: context?.catalogos?.totalProductosCatalogo
    },
    briefEvento: context.briefEvento,
    briefEventoTexto: context.briefEventoTexto,
    geminiRequestPreview: promptText.slice(0, 12000),
    promptCharsFinal: promptText.length,
    attempts: []
  };
  let lastError = null;
  for (const model of configuredGeminiPlanningModels(form)) {
    const attemptStart = Date.now();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const totalPlanMode = trim(form?.mode).toUpperCase() === 'ZUZU_TOTAL';
    const generationConfig = {
      responseMimeType: 'application/json',
      temperature: totalPlanMode ? 0.45 : 0.25,
      maxOutputTokens: totalPlanMode ? 3072 : 4096
    };
    // FIX44: en Encargo total sí forzamos esquema, pero esquema de ARRAY muy simple.
    // Esto evita respuestas cortadas en objetos grandes con menuResumen/compras/donaciones.
    if (totalPlanMode) {
      generationConfig.responseSchema = {
        type:'ARRAY',
        items:{
          type:'OBJECT',
          properties:{
            producto:{type:'STRING'},
            cantidadTotal:{type:'NUMBER'},
            unidad:{type:'STRING'},
            motivo:{type:'STRING'}
          },
          required:['producto','cantidadTotal','unidad','motivo']
        }
      };
    } else {
      generationConfig.responseSchema = planAiSchema();
    }
    const body = {
      contents: [{ role: 'user', parts: [{ text: promptText }] }],
      generationConfig
    };
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutMs = trim(form?.mode).toUpperCase() === 'ZUZU_TOTAL' ? 26000 : 16000;
      const abortTimer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
      let res;
      try {
        res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body), signal: controller?.signal });
      } finally {
        if (abortTimer) clearTimeout(abortTimer);
      }
      const payload = await res.json().catch(async () => ({ error:{ message: await res.text().catch(() => res.statusText) } }));
      const elapsedMs = Date.now() - attemptStart;
      if (!res.ok) {
        trace.attempts.push({ model, ok:false, elapsedMs, httpStatus:res.status, error:payload?.error?.message || `HTTP ${res.status}` });
        throw new Error(payload?.error?.message || `Zuzu planificacion HTTP ${res.status}`);
      }
      const outText = trim(geminiOutText(payload));
      if (!outText) {
        trace.attempts.push({ model, ok:false, elapsedMs, httpStatus:res.status, error:'Zuzu no devolvió texto analizable.' });
        throw new Error('Zuzu no devolvió propuesta de planificación.');
      }
      let parsed, repairedJson = false;
      try {
        const parsedInfo = parsePlanJsonLenientHf37(outText);
        parsed = parsedInfo.parsed;
        repairedJson = !!parsedInfo.repaired;
      } catch (jsonError) {
        const salvaged = planSalvageDirectGeminiJsonFix39(outText);
        if (salvaged) {
          parsed = salvaged;
          repairedJson = true;
        } else {
          trace.attempts.push({ model, ok:false, elapsedMs, httpStatus:res.status, error:trim(jsonError?.message || jsonError), rawChars:outText.length, rawTextPreview:outText.slice(0, 60000) });
          jsonError.__trace = trace;
          throw jsonError;
        }
      }
      if (totalPlanMode) parsed = planMergeTheoreticalNeedsFix44(parsed, form);
      parsed = planNormalizeDirectGeminiJson38(parsed);
      parsed.__model = model;
      trace.attempts.push({
        model,
        ok:true,
        jsonRepaired: repairedJson,
        elapsedMs,
        httpStatus:res.status,
        rawChars:outText.length,
        usage: usageSmall(payload, model),
        costEstimate: estimateGeminiCost(model, payload?.usageMetadata || {}),
        necesidadesTeoricasGemini: parsed.__directCounts38?.necesidadesTeoricas || 0,
        menuResumenGemini: arr(parsed.menuResumen).length,
        rowsGemini: arr(parsed.rows).length,
        comprasGemini: arr(parsed.rows).filter(r => /^COMPRA$/i.test(trim(r?.tipo))).length,
        donacionesGemini: arr(parsed.rows).filter(r => /^DON/i.test(trim(r?.tipo))).length,
        comprasDirectasGemini: parsed.__directCounts38?.compras || 0,
        donacionesDirectasGemini: parsed.__directCounts38?.donaciones || 0,
        rawTextPreview: outText.slice(0, 60000)
      });
      trace.elapsedMs = Date.now() - started;
      trace.selectedModel = model;
      trace.costEstimate = summarizeGeminiUsageFromTrace(trace.attempts.map(a => ({ usage:a.usage })).filter(Boolean));
      trace.geminiRawTextPreview = outText.slice(0, 60000);
      trace.geminiParsedCounts = {
        necesidadesTeoricas: parsed.__directCounts38?.necesidadesTeoricas || 0,
        menuResumen: arr(parsed.menuResumen).length,
        rows: arr(parsed.rows).length,
        compras: arr(parsed.rows).filter(r => /^COMPRA$/i.test(trim(r?.tipo))).length,
        donaciones: arr(parsed.rows).filter(r => /^DON/i.test(trim(r?.tipo))).length,
        comprasDirectas: parsed.__directCounts38?.compras || 0,
        donacionesDirectas: parsed.__directCounts38?.donaciones || 0
      };
      parsed.__trace = trace;
      return parsed;
    } catch (error) {
      lastError = error;
      if (!trace.attempts.some(a => a.model === model)) trace.attempts.push({ model, ok:false, elapsedMs:Date.now() - attemptStart, error:trim(error?.message || error) });
      if (!isRetryable(error)) break;
    }
  }
  if (lastError) lastError.__trace = { ...trace, elapsedMs:Date.now() - started, lastError:trim(lastError?.message || lastError) };
  throw lastError || new Error('Zuzu planificación no disponible.');
}

function planProductFormatTokens38(value) {
  const n = normPlanKey(value || '');
  const capacities = [];
  const containers = new Set();
  let m;
  const capRx = /(\d+(?:[,.]\d+)?)\s*(l|litro|litros|kg|kilo|kilos|cl|ml)\b/g;
  while ((m = capRx.exec(n))) {
    const unitRaw = m[2];
    const unit = /^k/.test(unitRaw) ? 'KG' : (/^c/.test(unitRaw) ? 'CL' : (/^m/.test(unitRaw) ? 'ML' : 'L'));
    capacities.push(`${String(m[1]).replace(',','.')}:${unit}`);
  }
  if (/\bbarril(?:es)?\b/.test(n)) containers.add('BARRIL');
  if (/\blata(?:s)?\b|\bbote(?:s)?\b/.test(n)) containers.add('LATA');
  if (/\bbotella(?:s)?\b/.test(n)) containers.add('BOTELLA');
  if (/\bgarrafa(?:s)?\b/.test(n)) containers.add('GARRAFA');
  if (/\bbolsa(?:s)?\b|\bsaco(?:s)?\b/.test(n)) containers.add('BOLSA');
  return { capacities, containers:[...containers] };
}
function planProductFormatCompatible38(written, catalogName) {
  const a = planProductFormatTokens38(written);
  const b = planProductFormatTokens38(catalogName);
  if (a.capacities.length && b.capacities.length) {
    // Si el usuario escribió 50l y el catálogo dice 30l, no se acepta como exacto.
    const commonUnits = new Set(a.capacities.map(x => x.split(':')[1]).filter(u => b.capacities.some(y => y.endsWith(':'+u))));
    for (const u of commonUnits) {
      const av = a.capacities.filter(x => x.endsWith(':'+u)).map(x => x.split(':')[0]);
      const bv = b.capacities.filter(x => x.endsWith(':'+u)).map(x => x.split(':')[0]);
      if (av.length && bv.length && !av.some(v => bv.includes(v))) return false;
    }
  }
  if (a.containers.length && b.containers.length) {
    const same = a.containers.some(x => b.containers.includes(x));
    // Lata/bote no debe convertirse en botella 2L, ni botella en lata; barril sí debe seguir siendo barril.
    if (!same) return false;
  }
  return true;
}
function matchPlanRows(aiRows, baseRows, state, form) {
  const maps = planBuildMaps(state);
  const defaults = { tiendaId: trim(form.defaultStoreId), responsableId: trim(form.defaultResponsibleId) };
  const baseByProduct = new Map();
  arr(baseRows).forEach(r => { const k = trim(r.productId) || normPlanKey(r.productName); if(k && !baseByProduct.has(k)) baseByProduct.set(k, r); });
  const out = [];
  arr(aiRows).forEach((row, idx) => {
    const pid = trim(row?.productId);
    let prod = pid ? maps.products.get(pid) : null;
    if (!prod) prod = maps.productByName.get(normPlanKey(row?.producto));
    if (!prod) prod = planFindProductLoose(row?.producto, maps);
    const base = prod ? (baseByProduct.get(trim(prod.id)) || baseByProduct.get(normPlanKey(prod.nombre))) : null;
    // FIX31: no descartar propuestas libres de Zuzu por no encajar al 100% con PRODUCTOS.
    // Se conservan como líneas revisables con productId vacío, para que el usuario vea la idea y pueda ajustar catálogo.
    const tipo = /^DON/i.test(trim(row?.tipo)) ? 'DONACION' : 'COMPRA';
    const ticketDonacion = tipo === 'DONACION' ? (trim(row?.ticketDonacion) || 'DONADO OTROS') : '';
    const tienda = maps.storeByName.get(normPlanKey(row?.tienda)) || planFindStoreLoose(row?.tienda, maps);
    const responsable = maps.personByName.get(normPlanKey(row?.responsable)) || planFindPersonLoose(row?.responsable, maps);
    const donorRef = tipo === 'DONACION' ? (planDonorRefFromLabel(row?.donante, maps) || planRefFromLooseLabel(row?.donante, maps, /^DONADO\s+TIENDA/i.test(ticketDonacion) ? 'T' : 'P') || base?.donorRef || '') : '';
    out.push({
      ...(base || {}),
      key: `zuzu:${idx}:${trim(prod?.id || base?.productId || row?.producto || 'sin-producto')}`,
      include: row?.include !== false,
      tipo,
      productId: trim((row?.__productoEscritoOriginal && prod && !planProductFormatCompatible38(row.__productoEscritoOriginal, prod.nombre)) ? '' : (prod?.id || base?.productId)),
      productName: trim((row?.__productoEscritoOriginal && prod && !planProductFormatCompatible38(row.__productoEscritoOriginal, prod.nombre)) ? row.__productoEscritoOriginal : (prod?.nombre || base?.productName || row?.producto)),
      segmento: trim(prod?.segmento || base?.segmento || 'Sin segmento'),
      destino: trim(prod?.destino || base?.destino || 'Sin destino'),
      unidades: tipo === 'COMPRA'
        ? planRoundBuyUnits(prod?.nombre || base?.productName || row?.producto, row?.unidades)
        : Math.max(0, round(row?.unidades, 2)),
      precio: planReasonablePlanPrice(prod?.nombre || base?.productName || row?.producto, num(row?.precio) > 0 ? row.precio : (base?.precio || prod?.defaultPrecio || prod?.precio)),
      tiendaId: trim(tienda?.id || base?.tiendaId || defaults.tiendaId),
      responsableId: trim(responsable?.id || base?.responsableId || defaults.responsableId),
      ticketDonacion,
      donorRef,
      confidence: row?.__geminiDirect38 === true ? 'Zuzu JSON directo' : 'Zuzu',
      __geminiDirect38: row?.__geminiDirect38 === true,
      explicitPromptDonation: tipo === 'DONACION' && row?.__geminiDirect38 === true,
      explicitConfirmedDonation: tipo === 'DONACION' && row?.__geminiDirect38 === true,
      explicitPromptStrictHf12: tipo === 'DONACION' && row?.__geminiDirect38 === true,
      __productoEscritoOriginal: row?.__productoEscritoOriginal || '',
      necesidadTotal: num(row?.necesidadTotal) > 0 ? round(row.necesidadTotal, 2) : undefined,
      reason: trim(row?.reason) || 'Propuesta ajustada por Zuzu a partir del menú, asistentes, duración, temperatura y existencias.'
    });
  });
  return planApplyDonationRules(out.filter(r => (r.productId || r.productName) && r.unidades >= 0), planInfoDonationRules(planPromptRawText(form), maps));
}

function planFamilyFix43(name) {
  const n = normPlanKey(name || '');
  if (/cerveza/.test(n)) return 'cerveza';
  if (/coca.*zero.*zero|zero.*zero/.test(n)) return 'coca-zero-zero';
  if (/coca.*zero|zero/.test(n)) return 'coca-zero';
  if (/coca/.test(n)) return 'coca-normal';
  if (/fanta.*naranja|naranja/.test(n)) return 'fanta-naranja';
  if (/fanta.*lim[oó]n|limon/.test(n)) return 'fanta-limon';
  if (/sprite/.test(n)) return 'sprite';
  if (/t[oó]nica|tonica|schweppes/.test(n)) return 'tonica';
  if (/hielo/.test(n)) return 'hielo';
  if (/agua/.test(n)) return 'agua';
  if (/ron.*barcelo|barcelo/.test(n)) return 'ron-barcelo';
  if (/brugal/.test(n)) return 'ron-brugal';
  if (/ron/.test(n)) return 'ron';
  if (/whisky|wiski|j\.?b\b|jb\b/.test(n)) return 'whisky';
  if (/ginebra|gin|beefeater|larios|puerto de indias/.test(n)) return 'ginebra';
  if (/chorizo/.test(n)) return 'chorizo';
  if (/lomo/.test(n)) return 'lomo';
  if (/morcilla/.test(n)) return 'morcilla';
  if (/panceta|baicon|bacon/.test(n)) return 'panceta';
  if (/venao|venado/.test(n)) return 'venao';
  if (/pan\b|barra|baguette/.test(n)) return 'pan';
  if (/vaso/.test(n)) return 'vasos';
  if (/plato/.test(n)) return 'platos';
  if (/servilleta/.test(n)) return 'servilletas';
  if (/bolsa.*basura|basura/.test(n)) return 'bolsas-basura';
  if (/fairy/.test(n)) return 'fairy';
  if (/lavavajillas/.test(n)) return 'lavavajillas';
  if (/abrillantador/.test(n)) return 'abrillantador';
  if (/secamanos/.test(n)) return 'papel-secamanos';
  return normPlanKey(name || '').slice(0,80);
}
function planEquivalentUnitsForFamilyFix43(name, units) {
  const n = normPlanKey(name || '');
  const u = Math.max(0, num(units));
  if (/cerveza/.test(n) && /barril/.test(n)) {
    const liters = /50\s*l/.test(n) ? 50 : (/30\s*l/.test(n) ? 30 : 50);
    return round((liters / 0.33) * u, 2);
  }
  if (/(coca|fanta|sprite|refresco)/.test(n) && /botella/.test(n) && /2\s*l/.test(n)) return round(u * 6, 2);
  return u;
}
function planSubtractDonationsFromTheoreticalRowsFix43(rows, explicitDonationRows) {
  const donationEquiv = new Map();
  arr(explicitDonationRows).forEach(d => {
    const fam = planFamilyFix43(d.productName || d.producto || '');
    if (!fam) return;
    donationEquiv.set(fam, (donationEquiv.get(fam) || 0) + planEquivalentUnitsForFamilyFix43(d.productName || d.producto || '', d.unidades));
  });
  return arr(rows).map(row => {
    if (row?.tipo !== 'COMPRA' || row.__ceFix43NecesidadAjustada === true) return row;
    const fam = planFamilyFix43(row.productName || row.producto || '');
    const totalNeed = Math.max(0, num(row.necesidadTotal || row.unidades || row.aComprarCalculado));
    if (!fam || totalNeed <= 0) return row;
    const donated = Math.max(0, donationEquiv.get(fam) || 0);
    const deficit = Math.max(0, round(totalNeed - donated, 2));
    return {
      ...row,
      unidades:deficit,
      aComprarCalculado:deficit,
      necesidadTotal:totalNeed,
      include:deficit > 0 && row.include !== false,
      reason: trim(row.reason || '') + ` Déficit calculado por ControlEvent FIX43: necesidad teórica ${round(totalNeed,2)} - donado/existente equivalente ${round(donated,2)} = compra ${round(deficit,2)}.`,
      __ceFix43NecesidadAjustada:true,
      __ceFix43DonadoRestado:donated
    };
  }).filter(r => r && (r.tipo !== 'COMPRA' || num(r.unidades) > 0 || r.include !== false));
}

function buildTotalBaseRows(state, modules, form) {
  if (!arr(modules).some(m => m === 'COMPRAS' || m === 'DONACIONES')) return [];
  const maps = planBuildMaps(state);
  const finalIds = new Set(arr(state?.eventos).filter(e => /^finalizado$/i.test(trim(e?.situacion))).map(e => trim(e.id)).filter(Boolean));
  const grouped = new Map();
  arr(state?.compras).forEach(row => {
    const evId = trim(row?.eventId || row?.event_id);
    if (!finalIds.has(evId)) return;
    const don = planIsDonation(row);
    if (don && !modules.includes('DONACIONES')) return;
    if (!don && !modules.includes('COMPRAS')) return;
    const prod = planProduct(row, maps);
    const pid = trim(prod?.id || row?.productoId || row?.producto_id);
    if (!pid) return;
    const key = `${don?'D':'C'}|${pid}`;
    const old = grouped.get(key) || { row, unidades:0, importe:0, count:0, don };
    old.unidades += num(row.unidades);
    old.importe += planLineValue(row);
    old.count += 1;
    grouped.set(key, old);
  });
  const estimated = Math.max(1, num(form.personas) || 30);
  return [...grouped.values()].sort((a,b)=>b.count-a.count || b.importe-a.importe).slice(0, 80).map((g, idx) => {
    const row = g.row;
    const prod = planProduct(row, maps) || {};
    const avgUnits = Math.max(0.5, round(g.unidades / Math.max(1, g.count), 2));
    const precio = planReasonablePlanPrice(prod.nombre || row.producto, g.unidades ? round(g.importe / g.unidades, 4) : (row.precio || prod.defaultPrecio || prod.precio));
    return {
      key:`total:${idx}:${prod.id || row.productoId}`,
      include:true,
      tipo:g.don ? 'DONACION' : 'COMPRA',
      productId:trim(prod.id || row.productoId || row.producto_id),
      productName:trim(prod.nombre || row.producto || 'Producto'),
      segmento:trim(prod?.segmento || 'Sin segmento'),
      destino:trim(prod?.destino || 'Sin destino'),
      unidades: avgUnits,
      precio,
      tiendaId:trim(row.tiendaId || row.tienda_id || prod.defaultTiendaId || form.defaultStoreId),
      responsableId:trim(row.responsableId || row.responsable_id || form.defaultResponsibleId),
      ticketDonacion:g.don ? planTicket(row) : '',
      donorRef:g.don ? trim(row.donorRef || row.donor_ref || '') : '',
      confidence:'Histórico general',
      reason:`Producto frecuente en históricos finalizados (${g.count} apariciones). Ajustar manualmente según ${estimated} personas estimadas.`
    };
  });
}
function planApplyFinalDefaultsHf14(rows, form, state) {
  const maps = planBuildMaps(state);
  const defStoreByName = planFindStoreLoose(form?.defaultStoreName || '', maps);
  const defRespByName = planFindPersonLoose(form?.defaultResponsibleName || '', maps);
  const firstStore = arr(state?.tiendas)[0] || {};
  const firstResp = arr(state?.personas)[0] || {};
  const defStoreId = trim(form?.defaultStoreId || defStoreByName?.id || firstStore?.id || '');
  const defRespId = trim(form?.defaultResponsibleId || defRespByName?.id || firstResp?.id || '');
  return arr(rows).map(row => {
    const out = {...row};
    if (out.tipo === 'COMPRA') {
      out.tiendaId = trim(out.tiendaId || defStoreId);
      out.responsableId = trim(out.responsableId || defRespId);
      out.ticketDonacion = '';
      out.donorRef = '';
      return out;
    }
    if (out.tipo === 'DONACION') {
      out.explicitConfirmedDonation = out.explicitConfirmedDonation || out.explicitPromptDonation === true || out.explicitPromptStrictHf12 === true;
      const donor = trim(out.donorRef || '');
      if (!out.responsableId) {
        if (donor.startsWith('P:')) out.responsableId = donor.slice(2);
        else out.responsableId = defRespId;
      }
      if (/DONADO\s+TIENDA/i.test(out.ticketDonacion || '') && !out.tiendaId && donor.startsWith('T:')) {
        out.tiendaId = donor.slice(2);
      }
    }
    return out;
  });
}


function planConfirmedPromptDonationHintsHf21(form, state) {
  const info = planPromptRawText(form);
  if (!info) return [];
  const maps = planBuildMaps(state || {});
  const hints = [];
  const lines = info.replace(/\r/g, '').split(/\n/);
  let active = null;
  const stop = /^(OBJETIVO|DATOS\s+PARA|DESCRIPCI[ÓO]N|CRITERIOS?|DETALLES|COMIDAS|PISTAS\s+DE\s+COMPRA|REGLAS\s+FINALES|COMPRA|COMPRAS|A\s+COMPRAR)\s*:/i;
  const start = /^(PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?\b|DONACI[ÓO]N\b|DONACION\b|EXISTENCIAS?\b|YA\s+TENEMOS\b)/i;
  function meta(line, prev) {
    const h = trim(line || '');
    const m = {...(prev || {})};
    if (/DONADO\s+TIENDA|DONACI[ÓO]N\s+DE\s+TIENDA/i.test(h)) m.ticketDonacion = 'DONADO TIENDA';
    else if (/DONADO\s+OTROS|DONACI[ÓO]N\s+DE\s+OTROS/i.test(h)) m.ticketDonacion = 'DONADO OTROS';
    else if (/DONADO\s+SOCIO|DONACIONES?\s+DE\s+SOCIOS?|PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.ticketDonacion = 'DONADO SOCIO';
    if (!m.ticketDonacion) m.ticketDonacion = 'DONADO SOCIO';
    const donor = planExtractBracket(h, ['Donante']) || '';
    const resp = planExtractBracket(h, ['Responsable']) || '';
    if (donor) m.donor = donor;
    if (resp) m.responsable = resp;
    if (!m.donor && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.donor = 'Peña El Arrastre';
    if (!m.responsable && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) m.responsable = trim(form.defaultResponsibleName || 'Colty');
    return m;
  }
  function qty(raw) {
    const s = trim(raw || '').replace(/^\s*[•\-\*]\s*/, '');
    const tail = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
    let m = tail.match(/(\d+(?:[,.]\d+)?)\s*(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
    if (m) return Math.max(0, round(num(m[1]) * num(m[2]), 2));
    m = tail.match(/(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
    if (m) return Math.max(0, round(num(m[1]), 2));
    m = tail.match(/(\d+(?:[,.]\d+)?)/);
    return m ? Math.max(0, num(m[1])) : 1;
  }
  function prodText(raw) {
    let s = trim(raw || '').replace(/^\s*[•\-\*]\s*/, '');
    if (!s.includes(':')) return '';
    s = s.slice(0, s.lastIndexOf(':'));
    return planCleanExplicitProductText(s);
  }
  function keyOf(name, prod) {
    return trim(prod?.id) ? `id:${trim(prod.id)}` : (planProductAliasKey(name || '') || normPlanKey(name || ''));
  }
  lines.forEach(raw => {
    const line = trim(raw);
    if (!line) return;
    if (stop.test(line)) { active = null; return; }
    if (start.test(line)) { active = meta(line, {}); return; }
    if (active && (/Tratar\s+como\s+DONADO/i.test(line) || /\[Donante:|\[Responsable:/i.test(line))) { active = meta(line, active); return; }
    if (active && /^PRODUCTOS?\s*:?\s*$/i.test(line)) return;
    if (!active || !/^\s*[•\-\*]\s*[^:\n]{2,220}:\s*(?:\d|un|una|uno|pack|paquete)/i.test(raw)) return;
    const text = prodText(raw);
    if (!text) return;
    const prod = planFindProductLoose(text, maps);
    const ticket = active.ticketDonacion || 'DONADO SOCIO';
    const donorLabel = trim(active.donor || 'Donante indicado');
    const respLabel = trim(active.responsable || (ticket === 'DONADO TIENDA' ? form.defaultResponsibleName : donorLabel) || form.defaultResponsibleName || '');
    const donorRef = planRefFromLooseLabel(donorLabel, maps, ticket === 'DONADO TIENDA' ? 'T' : 'P') || donorLabel;
    const resp = planFindPersonLoose(respLabel, maps);
    const store = ticket === 'DONADO TIENDA' ? planFindStoreLoose(donorLabel, maps) : null;
    hints.push({
      productText:text,
      productId:trim(prod?.id || ''),
      productName:trim(prod?.nombre || text),
      key:keyOf(text, prod),
      unidades:qty(raw),
      precio:planReasonablePlanPrice(prod?.nombre || text, prod?.defaultPrecio ?? prod?.precio ?? 0),
      segmento:trim(prod?.segmento || 'Sin segmento'),
      destino:trim(prod?.destino || 'Sin destino'),
      ticketDonacion:ticket,
      donorRef,
      tiendaId:trim(store?.id || form.defaultStoreId || ''),
      responsableId:trim(resp?.id || (donorRef.startsWith('P:') ? donorRef.slice(2) : '') || form.defaultResponsibleId || ''),
      donorLabel
    });
  });
  return hints;
}

function planHasConfirmedDonationBlocksHf17(form) {
  const info = planPromptRawText(form);
  return /(PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?(?:\s+(?:Y\s+EXISTENCIAS\s+CONFIRMADAS|DE\s+[^:\n]+))?\s*:|DONACION(?:\s+DE\s+[^:\n]+)?\s*:|DONACI[ÓO]N(?:\s+DE\s+[^:\n]+)?\s*:|DONADO\s+(?:SOCIO|TIENDA|OTROS)\s*[-–:]|EXISTENCIAS?(?:\s+[^:\n]+)?\s*:|YA\s+TENEMOS)/i.test(info)
    && /(\[Donante:|Tratar\s+como\s+DONADO|PRODUCTOS?\s*:|DONADO\s+(?:SOCIO|TIENDA|OTROS)\s*[-–:])/i.test(info);
}
function planRowsFromExplicitPromptOnlyHf17(form, state) {
  const explicit = planExplicitDonationRowsFromPrompt(form, state);
  return arr(explicit).map((r, idx) => ({
    ...r,
    key: r.key || `prompt-direct:${idx}`,
    include: r.include !== false,
    explicitPromptDonation: true,
    explicitConfirmedDonation: true,
    confidence: trim(r.confidence || 'Prompt explícito confirmado'),
    reason: trim(r.reason || 'Donación/existencia confirmada por el prompt.')
  }));
}
function planWithTimeoutHf17(promise, ms, label = 'Zuzu') {
  let timer = null;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} tardó demasiado y se ha usado cálculo directo del prompt.`)), Math.max(1000, ms || 18000));
    })
  ]).finally(() => { if (timer) clearTimeout(timer); });
}
function planBoolOptionFix46(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return !!defaultValue;
  if (typeof value === 'boolean') return value;
  const s = trim(value).toLowerCase();
  return ['1','true','yes','si','sí','on','checked'].includes(s);
}
function planOptionSummaryFix46(form) {
  return {
    ajusteSaldo: planBoolOptionFix46(form?.applySaldoAjuste, true),
    topesProducto: planBoolOptionFix46(form?.applyProductCaps, true)
  };
}

export async function planificacionInicialZuzu({ mode, modelEventId, content, title, fechaIni, fechaFin, dias, personas, defaultResponsibleId, defaultStoreId, descripcion, info, applySaldoAjuste, applyProductCaps, usuarioLogado, user, authUser, ce_acceso } = {}) {
  const state = attachLoggedUserFix10(await getState(), { usuarioLogado, user, authUser, ce_acceso });
  const maps = planBuildMaps(state);
  const modules = planContentModules(content);
  const rawForm = { mode, modelEventId, content, title, fechaIni, fechaFin, dias, personas, defaultResponsibleId, defaultStoreId, descripcion, info, applySaldoAjuste, applyProductCaps };
  const diasDetectadosPrompt = planDetectedDaysFromPrompt(rawForm);
  const diasOperativos = Math.max(1, diasDetectadosPrompt || num(dias) || 1);
  const form = { ...rawForm, diasFormulario: dias, diasDetectadosPrompt, dias: diasOperativos, defaultResponsibleName: planPersonName(defaultResponsibleId, maps), defaultStoreName: planStoreName(defaultStoreId, maps) };
  const m = trim(mode || 'REPLICA').toUpperCase();
  const planOptionsFix46 = planOptionSummaryFix46(form);
  const allowLocalFallbackFix46 = planOptionsFix46.ajusteSaldo || planOptionsFix46.topesProducto || (applySaldoAjuste === undefined && applyProductCaps === undefined);
  const phaseDetailsFix46 = [];
  const phaseSnapshotFix46 = (fase, rows, extra = {}) => phaseDetailsFix46.push({
    fase,
    compras: arr(rows).filter(r => r?.tipo === 'COMPRA' && r.include !== false).length,
    donaciones: arr(rows).filter(r => r?.tipo === 'DONACION' && r.include !== false).length,
    totalCompras: round(planCompraTotal(rows), 2),
    ...extra
  });
  phaseDetailsFix46.push({ fase:'Opciones', origen:'ControlEvent', compras:'', donaciones:'', totalCompras:null, detalle:`Ajuste saldo: ${planOptionsFix46.ajusteSaldo ? 'ACTIVO' : 'NO'} · Topes producto: ${planOptionsFix46.topesProducto ? 'ACTIVOS' : 'NO'} · Base ${planOpenConsumptionContextFix47(form).asistentesBase || '—'} · Consumo abierto ${planOpenConsumptionContextFix47(form).aplicaConsumoAbierto ? planOpenConsumptionContextFix47(form).consumoAbiertoPersonas : 'NO'} · Cena real ${planOpenConsumptionContextFix47(form).cenaRealMin && planOpenConsumptionContextFix47(form).cenaRealMax && planOpenConsumptionContextFix47(form).cenaRealMin !== planOpenConsumptionContextFix47(form).cenaRealMax ? planOpenConsumptionContextFix47(form).cenaRealMin + '-' + planOpenConsumptionContextFix47(form).cenaRealMax : (planOpenConsumptionContextFix47(form).cenaRealMax || '—')}` });
  const sourceEvent = planEventById(state, modelEventId);
  if ((m === 'REPLICA' || m === 'ZUZU_PARCIAL') && !sourceEvent) {
    const err = new Error('Debes elegir un Evento modelo finalizado para este modo de planificación.');
    err.status = 400; throw err;
  }
  let baseRows = (m === 'ZUZU_TOTAL') ? [] : planRowsForEvent(state, modelEventId, modules);
  const sourceAtt = sourceEvent ? planAttendeesForEvent(state, sourceEvent.id) : 0;
  const targetAtt = num(planOpenConsumptionContextFix47(form).asistentesBase) || num(personas) || sourceAtt || 30;
  const sourceDays = sourceEvent ? Math.max(1, 1) : 1;
  const targetDays = Math.max(1, num(form.dias) || 1);
  if (m === 'ZUZU_PARCIAL' && sourceAtt > 0) baseRows = planScaleRows(baseRows, Math.max(0.1, (targetAtt / sourceAtt) * Math.sqrt(targetDays / sourceDays)), defaultStoreId, defaultResponsibleId);
  let incomeRows = modules.includes('INGRESOS') && sourceEvent ? planIncomeRowsForEvent(state, sourceEvent.id) : [];
  const explicitDonationRows = planExplicitDonationRowsLocalFix39(form, state);
  let rowsOut = baseRows;
  let aiNotes = [];
  let aiProvider = 'control-event-historico';
  let aiModel = '';
  let aiMenuResumen = [];
  let aiTrace = null;
  const hasConfirmedPromptBlocks = planHasConfirmedDonationBlocksHf17(form);
  const largePrompt = trim(form.info || '').length > 6000;

  if (m === 'ZUZU_TOTAL' && hasConfirmedPromptBlocks) {
    // FIX28 planificación: las donaciones/existencias explícitas se cargan siempre,
    // pero Zuzu debe interpretar también el concepto, duración y comidas del prompt.
    // Si Zuzu falla, NO se inventa menú fijo local; se devuelven solo esas donaciones y notas de aviso.
    rowsOut = planRowsFromExplicitPromptOnlyHf17(form, state);
    aiProvider = 'control-event-prompt-directo';
    aiNotes.push('FIX47_CONSUMO_ABIERTO_VARIABLE activo: ControlEvent extrae y crea localmente las donaciones/existencias; Zuzu devuelve solo necesidades teóricas totales y ControlEvent calcula el déficit real.');
    try {
      const ai = await planWithTimeoutHf17(callGeminiPlanificacion(form, [], incomeRows, state, sourceEvent, modules), 34000, 'Zuzu planificación');
      aiTrace = ai?.__trace || null;
      let matched = matchPlanRows(ai?.rows, [], state, form);
      matched = planSubtractDonationsFromTheoreticalRowsFix43(matched, explicitDonationRows);
      if (aiTrace) aiTrace.matchCounts = { rowsGemini: arr(ai?.rows).length, matched: matched.length, comprasMatched: matched.filter(r=>r.tipo==='COMPRA').length, donacionesMatched: matched.filter(r=>r.tipo==='DONACION').length };
      if (matched.length) {
        rowsOut = planMergeExplicitDonations(matched, explicitDonationRows);
        aiMenuResumen = planCompleteMenuResumen(ai?.menuResumen, form);
        aiNotes = arr(ai?.notes).map(x => trim(x)).filter(Boolean).concat(aiNotes);
        aiProvider = 'gemini-planificacion+prompt-confirmado'; aiModel = ai.__model || '';
      } else {
        if (allowLocalFallbackFix46) {
          const local = planRowsFromLocalTheoreticalNeedsFix44(form, state, explicitDonationRows, []);
          if(local.rows.length){
            rowsOut = planMergeExplicitDonations(local.rows, explicitDonationRows);
            aiMenuResumen = local.menuResumen;
            aiNotes = local.notes.concat(aiNotes);
            aiProvider = 'control-event-necesidades-locales-fix44';
          } else {
            aiNotes.push('Zuzu no devolvió necesidades teóricas utilizables y ControlEvent no pudo completar cálculo local revisable.');
          }
        } else {
          aiNotes.push('Zuzu no devolvió necesidades teóricas utilizables. Como las opciones de saldo y topes están desactivadas, ControlEvent no aplica cálculo local de emergencia.');
        }
      }
    } catch (error) {
      aiTrace = error?.__trace || aiTrace;
      if (allowLocalFallbackFix46) {
        const local = planRowsFromLocalTheoreticalNeedsFix44(form, state, explicitDonationRows, []);
        if(local.rows.length){
          rowsOut = planMergeExplicitDonations(local.rows, explicitDonationRows);
          aiMenuResumen = local.menuResumen;
          aiNotes = local.notes.concat(aiNotes);
          aiProvider = 'control-event-necesidades-locales-fix44';
        }
        aiNotes.push('Zuzu no pudo completar la planificación de necesidades: ' + trim(error?.message || error) + '. ControlEvent aplica cálculo local de necesidades y descuenta donaciones porque hay opciones de ajuste activas.');
      } else {
        aiNotes.push('Zuzu no pudo completar la planificación de necesidades: ' + trim(error?.message || error) + '. Opciones de saldo/topes desactivadas: se muestran solo donaciones y cualquier necesidad real recuperada de Zuzu.');
      }
    }
  } else if (m === 'ZUZU_TOTAL' || m === 'ZUZU_PARCIAL') {
    if (m === 'ZUZU_TOTAL') aiNotes.push('FIX47_CONSUMO_ABIERTO_VARIABLE activo: encargo total con brief estructurado y control real de Zuzu; sin históricos, sin compras locales de seguridad y con resumen por días/momentos.');
    try {
      const ai = await planWithTimeoutHf17(callGeminiPlanificacion(form, baseRows, incomeRows, state, sourceEvent, modules), 34000, 'Zuzu planificación');
      aiTrace = ai?.__trace || null;
      let matched = matchPlanRows(ai?.rows, baseRows, state, form);
      matched = planSubtractDonationsFromTheoreticalRowsFix43(matched, explicitDonationRows);
      if (aiTrace) aiTrace.matchCounts = { rowsGemini: arr(ai?.rows).length, matched: matched.length, comprasMatched: matched.filter(r=>r.tipo==='COMPRA').length, donacionesMatched: matched.filter(r=>r.tipo==='DONACION').length };
      if (matched.length) {
        rowsOut = matched;
        aiMenuResumen = planCompleteMenuResumen(ai?.menuResumen, form);
        aiNotes = arr(ai?.notes).map(x => trim(x)).filter(Boolean);
        aiProvider = 'gemini-planificacion'; aiModel = ai.__model || '';
      } else {
        if (allowLocalFallbackFix46) {
          const local = planRowsFromLocalTheoreticalNeedsFix44(form, state, explicitDonationRows, baseRows);
          if(local.rows.length){ rowsOut = local.rows; aiMenuResumen = local.menuResumen; aiNotes = local.notes; aiProvider = 'control-event-necesidades-locales-fix44'; }
          else aiNotes.push('Zuzu no devolvió filas utilizables; se mantiene la propuesta histórica base.');
        } else {
          aiNotes.push('Zuzu no devolvió filas utilizables. Sin saldo ni topes activos, ControlEvent no aplica cálculo local de emergencia.');
        }
      }
    } catch (error) {
      aiTrace = error?.__trace || aiTrace;
      if (allowLocalFallbackFix46) {
        const local = planRowsFromLocalTheoreticalNeedsFix44(form, state, explicitDonationRows, baseRows);
        if(local.rows.length){ rowsOut = local.rows; aiMenuResumen = local.menuResumen; aiNotes = local.notes; aiProvider = 'control-event-necesidades-locales-fix44'; }
        aiNotes.push('Zuzu no pudo ajustar la propuesta a tiempo; ControlEvent usa necesidades locales y donaciones del prompt porque hay opciones de ajuste activas: ' + trim(error?.message || error));
        aiProvider = aiProvider || 'control-event-timeout-fallback';
      } else {
        aiNotes.push('Zuzu no pudo ajustar la propuesta a tiempo: ' + trim(error?.message || error) + '. Opciones de saldo/topes desactivadas: no se genera cálculo local alternativo.');
      }
    }
  } else {
    aiNotes.push('Modo réplica: se conserva el evento modelo sin ajuste de IA.');
  }
  rowsOut = planMergeExplicitDonations(rowsOut, explicitDonationRows);
  phaseSnapshotFix46('0. Zuzu / fallback antes de cocinar', rowsOut, { origen: aiProvider || 'pendiente', detalle: aiModel ? `Modelo: ${aiModel}` : 'Sin modelo Zuzu final o con fallback local.' });
  rowsOut = planSanitizeInventedDonations(rowsOut, baseRows, explicitDonationRows, m);
  rowsOut = planCoalesceDonationsAfterSanitize(rowsOut, explicitDonationRows, m);
  rowsOut = planApplyFinalDefaultsHf14(arr(rowsOut).map((row, idx) => ({ ...row, key: row.key || `plan:${idx}` })), form, state);
  phaseSnapshotFix46('1. Donaciones confirmadas y saneo', rowsOut, { origen:'ControlEvent', detalle:`${explicitDonationRows.length} donaciones/existencias detectadas en prompt.` });
  if (m === 'ZUZU_TOTAL' || m === 'ZUZU_PARCIAL') {
    rowsOut = planPostProcessPlanningRows(rowsOut, form, state);
    phaseSnapshotFix46('2. Déficit base', rowsOut, { origen:'ControlEvent', detalle:'Cruce con catálogo y resta de donaciones/existencias. Sin saldo ni topes todavía.' });
    if (planOptionsFix46.topesProducto) {
      rowsOut = planClampOperationalUnitsFix40(rowsOut, form, state);
      phaseSnapshotFix46('3. Topes de producto', rowsOut, { origen:'ControlEvent', estado:'ACTIVO', detalle:'Aplicados límites por familia: cerveza, refrescos, tónica, carnes, pan, etc.' });
    } else {
      phaseSnapshotFix46('3. Topes de producto', rowsOut, { origen:'ControlEvent', estado:'NO APLICADO', detalle:'Se conserva el déficit base sin recortar por topes operativos.' });
    }
    if (m === 'ZUZU_TOTAL') {
      aiNotes.push('FIX47_CONSUMO_ABIERTO_VARIABLE activo: Zuzu/ControlEvent generan necesidad base; el usuario decide si aplica ajuste por saldo y/o topes de producto.');
    }
    if (!aiMenuResumen.length) aiMenuResumen = planCompleteMenuResumen([], form);
    const budgetNotes = [];
    let saldoNotes = [];
    if (planOptionsFix46.topesProducto) {
      const budget = planBudgetGuard(rowsOut, form);
      rowsOut = budget.rows;
      budgetNotes.push(...arr(budget.notes));
      phaseSnapshotFix46('4. Control de coste/tope presupuesto', rowsOut, { origen:'ControlEvent', estado:'ACTIVO', detalle:'Aplicado junto con topes de producto.' });
    } else {
      phaseSnapshotFix46('4. Control de coste/tope presupuesto', rowsOut, { origen:'ControlEvent', estado:'NO APLICADO', detalle:'No se reduce ni ajusta por coste/persona; se muestra necesidad base.' });
    }
    if (planOptionsFix46.ajusteSaldo) {
      const saldoFix39 = planApplyPositiveSaldoFix39(rowsOut, form, state);
      rowsOut = saldoFix39.rows;
      saldoNotes = arr(saldoFix39.notes);
      phaseSnapshotFix46('5. Ajuste de compras por saldo', rowsOut, { origen:'ControlEvent', estado:'ACTIVO', detalle: saldoNotes.join(' ') || 'No hizo falta añadir compra por saldo.' });
    } else {
      phaseSnapshotFix46('5. Ajuste de compras por saldo', rowsOut, { origen:'ControlEvent', estado:'NO APLICADO', detalle:'No se añaden compras extra para gastar saldo positivo.' });
    }
    if (planOptionsFix46.topesProducto) {
      rowsOut = planClampOperationalUnitsFix40(rowsOut, form, state);
      phaseSnapshotFix46('6. Topes finales post-saldo', rowsOut, { origen:'ControlEvent', estado:'ACTIVO', detalle:'Revisión final de topes después del saldo.' });
    }
      phaseSnapshotFix46('7. Compra final presentada', rowsOut, { origen:'ControlEvent', detalle:'Resultado que verá el usuario en propuesta y detalle avanzado.' });
    const optionNote = `Opciones de cálculo: Ajuste de compras por saldo ${planOptionsFix46.ajusteSaldo ? 'ACTIVO' : 'DESACTIVADO'}; Topes de producto ${planOptionsFix46.topesProducto ? 'ACTIVOS' : 'DESACTIVADOS'}.`;
    aiNotes = planReadableNotes([optionNote].concat(aiNotes), rowsOut, form, budgetNotes.concat(saldoNotes));
  } else {
    phaseSnapshotFix46('2. Réplica final', rowsOut, { origen:'ControlEvent', detalle:'Modo réplica sin IA.' });
    aiNotes = planReadableNotes(aiNotes, rowsOut, form, []);
  }
  return {
    ok: true,
    version: 'v27_prod_1.2_FIX47_CONSUMO_ABIERTO_VARIABLE',
    provider: aiProvider,
    model: aiModel,
    mode: m,
    modules,
    event: sourceEvent ? { id: trim(sourceEvent.id), titulo: planEventTitle(sourceEvent), fechaIni: trim(sourceEvent.fechaIni), fechaFin: trim(sourceEvent.fechaFin), situacion: trim(sourceEvent.situacion), precio: round(sourceEvent.precio,2) } : { id:'', titulo:'Sin evento modelo', situacion:'No procede' },
    rows: rowsOut,
    incomes: incomeRows,
    notes: aiNotes,
    menuResumen: aiMenuResumen,
    briefEvento: planPromptBriefObject(form, state),
    debugPlanificacion: {
      ...(aiTrace || { version:'FIX47_CONSUMO_ABIERTO_VARIABLE', warning:'No hubo llamada Zuzu trazable; revisar provider/notas.', contextResumen:{ diasOperativos: form.dias, asistentes: targetAtt, donacionesDetectadas: explicitDonationRows.length } }),
      phaseDetails: phaseDetailsFix46,
      opcionesCalculo: planOptionsFix46,
      finalCounts: { rows: rowsOut.length, incomes: incomeRows.length, compras: rowsOut.filter(r=>r.tipo==='COMPRA').length, donaciones: rowsOut.filter(r=>r.tipo==='DONACION').length },
      providerFinal: aiProvider,
      modelFinal: aiModel,
      notesFinal: aiNotes.slice(0, 20)
    },
    counts: { rows: rowsOut.length, incomes: incomeRows.length, compras: rowsOut.filter(r=>r.tipo==='COMPRA').length, donaciones: rowsOut.filter(r=>r.tipo==='DONACION').length }
  };
}

// Exportaciones de prueba estructural. No se usan por la interfaz ni exponen datos por HTTP.
export const __zuzuStructuralTesting = Object.freeze({
  buildLocalEventReport: directEventReportIfApplicable,
  attachWeatherVisualsIfNeeded,
  finalizeResult: finalizeZuzuResult,
  finalizeNarrativeText: tidyNarrativeAnswer,
  sanitizeStructure: sanitizeResultStructure,
  v26ExecuteTool,
  v26ExecuteTools,
  v26BuildPresentation,
  v26FallbackFromTools,
  v26ResolvePersonFamily,
  v26ComparisonEventNamesFromPrompt,
  v26SemanticAudit,
  v26FormatNarrativeMoney,
  v26FormatEuro,
  v26BuildPresentation,
  v271IncomeAttentionSignals,
  v272DateOnly,
  v272PeriodRelation,
  v272IsShortAffirmativeFollowUp,
  v272ConversationRequestsCharts,
  v272AnswerClaimsChart,
  v27AutoChartSpecs
});
