/* ControlEvent v18.11.2_prod - Zuzu / Analítica libre sobre datos del evento.
   Solo lectura: no modifica BBDD ni estado. */
import { getState } from './state.service.js';
import { buildZuzuModuleContext, buildZuzuPlanningCatalog, buildZuzuLocalPlan } from './event-context.service.js';

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
function configuredGeminiModels() {
  // v11.1: no volver a llamar a Zuzu 1.5 desde v1beta.
  // Algunas claves/regiones ya no aceptan gemini-1.5-flash para generateContent y provocan errores intermitentes.
  const configuredRaw = trim(process.env.CONTROLEVENT_EVENT_AI_MODEL || process.env.CONTROLEVENT_TICKET_AI_MODEL || process.env.GEMINI_MODEL || process.env.GOOGLE_GEMINI_MODEL || '');
  const configured = configuredRaw.split(/[;,\s]+/).map(x => trim(x).replace(/^models\//, '')).filter(Boolean);
  const fallback = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash'];
  const out = [];
  [...configured, ...fallback].forEach(model => {
    const m = trim(model).replace(/^models\//, '');
    if (!m) return;
    if (/^gemini-1\.5(?:-|$)/i.test(m) || /^gemini-pro$/i.test(m) || /^gemini-2\.0-flash-lite$/i.test(m)) return;
    if (!out.includes(m)) out.push(m);
  });
  return out;
}

function configuredGeminiPlanningModels() {
  // FIX44: planificación pide array de necesidades teóricas a Zuzu; ControlEvent calcula déficit y saldo.
  const configuredRaw = trim(process.env.CONTROLEVENT_PLAN_AI_MODEL || process.env.CONTROLEVENT_EVENT_AI_MODEL || process.env.GEMINI_MODEL || process.env.GOOGLE_GEMINI_MODEL || '');
  const configured = configuredRaw.split(/[;,\s]+/).map(x => trim(x).replace(/^models\//, '')).filter(Boolean);
  const fallback = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash'];
  const out = [];
  [...configured, ...fallback].forEach(model => {
    const m = trim(model).replace(/^models\//, '');
    if (!m) return;
    if (/^gemini-1\.5(?:-|$)/i.test(m) || /^gemini-pro$/i.test(m) || /^gemini-2\.0-flash-lite$/i.test(m)) return;
    if (!out.includes(m)) out.push(m);
  });
  return out;
}

function compactState(state, selectedEventId = '') {
  const events = arr(state?.eventos);
  const people = byId(state?.personas);
  const stores = byId(state?.tiendas);
  const products = byId(state?.productos);
  const compras = arr(state?.compras);
  const colaboradores = arr(state?.colaboradores);
  const selectedEvent = events.find(e => trim(e.id) === trim(selectedEventId)) || null;

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
    const persona = people.get(trim(row?.personaId || row?.persona_id));
    return norm(persona?.rango || row?.rango || row?.personaRango || row?.tipoPersona || '');
  }
  function isSocioIncome(row) { return incomeRango(row) === 'socio'; }
  function incomePayment(row) { return trim(row?.situacion || row?.formaPago || row?.ingreso || 'Pendiente') || 'Pendiente'; }
  function incomePersonName(row) {
    const id = trim(row?.personaId || row?.persona_id);
    return trim(people.get(id)?.nombre || row?.nombre || id || 'Sin colaborador');
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
      rango: socio ? 'SOCIO' : (trim(people.get(trim(row?.personaId || row?.persona_id))?.rango || row?.rango || row?.personaRango || '') || 'NO SOCIO / OTRO'),
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
      valoracionEvento: round(ingresosTotal + donacionesValor - comprasReales, 2),
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
  return `Eres Zuzu, la Analítica libre integrada en ControlEvent, una aplicación de gestión de eventos solidarios.

Arquitectura obligatoria ya ejecutada por ControlEvent:
1) Zuzu ha leído el prompt y ha devuelto módulos, filtros y datos solicitados.
2) ControlEvent ha extraído esos módulos desde la app, en registros legibles y sin códigos internos.
3) Ahora recibes TODOS los registros entregados por esos módulos y el prompt original del usuario. Tu trabajo es cocinar/formatear la respuesta final exactamente según lo pedido.
4) ControlEvent NO debe decidir la conclusión por ti: si el contexto entregado no alcanza, debes pedir el dato o módulo que falta en warnings/answer, no inventar una respuesta cómoda.

Reglas obligatorias:
- Usa exclusivamente modulosExtraidos y metricasCanonicas. No inventes datos ni completes huecos por intuición.
- La respuesta principal debe ser legible para usuario final: máximo 10-12 líneas de explicación; no pegues JSON, arrays ni listados brutos dentro de answer.
- Si hay muchos registros, resume y crea tablas de resumen. El detalle completo debe ir en tables o files, no en answer.
- Devuelve SIEMPRE JSON válido. No uses markdown fuera de los campos de texto. No cortes strings. Si no puedes generar todo, prioriza resumen + tablas cortas + aviso.
- Si el usuario cita eventos concretos entre comillas o por título, filtra la respuesta a esos eventos exactos. No mezcles otros eventos aunque aparezcan en el contexto.
- Si el usuario pide "todos los eventos", entonces sí puedes usar todos los eventos del contexto.
- Si el usuario menciona varios módulos o conceptos, responde a todos: por ejemplo DONACIONES, COMPRAS, COLABORADORES/INGRESOS, TICKETS y DOCUMENTOS deben aparecer todos si los pidió.
- Si el usuario pide comparativa, crea una tabla comparativa por evento y por módulo solicitado. No te quedes solo con el primer módulo.
- Si el usuario pide informe de cada evento, "cosas que ocurrieron", crónica, celebración o datos de todos los eventos registrados, ordena SIEMPRE por fecha ini/fecha de celebración y cuenta lo operativo de cada evento: INGRESOS/colaboradores, COMPRAS, DONACIONES, TICKETS/Fototickets y DOCUMENTOS. No respondas con una gráfica genérica ni con la ficha técnica de EVENTOS.
- Si pide agrupar, totalizar, calcular, ordenar, resumir o graficar, hazlo sobre TODOS los registros entregados del módulo correspondiente, no sobre una muestra.
- Si el usuario pide una gráfica, devuelve al menos un objeto en charts. No digas que has pintado una gráfica si charts está vacío.
- Si el usuario pide productos consumidos, productos más consumidos, coste por producto o unidades por producto, usa COMPRAS y DONACIONES cuando estén disponibles, agrupa por Producto y devuelve DOS salidas si procede: ranking por coste/valor y ranking por unidades. No respondas con auditoría de extracción ni con métricas técnicas del módulo EVENTOS.
- Si ControlEvent te entrega COMPRAS/DONACIONES/PRODUCTOS, úsalo como datos operativos; EVENTOS solo sirve para identificar título/fechas, no para construir una gráfica de consumo.
- Tipos de gráfica disponibles: bar, horizontalBar, pie, donut, line y stackedBar. Para comparativas entre eventos usa bar/stackedBar. Para repartos por tipo usa pie/donut. Para rankings largos usa horizontalBar.
- Para stackedBar rellena labels con las categorías y series con [{name, values}].
- Para DONACIONES, suma el campo Valor. Para COMPRAS, suma Importe. Para INGRESOS, el total por línea es Importe obligatorio + Importe voluntario.
- Para “producto/artículo más utilizado comprado/donado”, mide por Unidades, separando Comprado y Donado si el usuario lo pide.
- Para listados, usa todos los registros relevantes. Puedes resumir en la respuesta principal, pero aporta una tabla o fichero si procede.
- No generes SQL. No expliques claves internas. No propongas cambios en base de datos.
- Si detectas que el contexto no contiene un módulo necesario para responder, dilo claramente en warnings y formula una petición concreta de ampliación de contexto para ControlEvent, por ejemplo: "Necesito COMPRAS y DONACIONES de todos los eventos de 2025".
- Si necesitas más datos de ControlEvent para responder con precisión, no completes por intuición: responde con una solicitud concreta de información adicional y qué módulo/eventos deberían extraerse.
- Responde siempre en español.
- Respeta el tono solicitado por el usuario. Si pide informe coloquial, informal, simpático, con chascarrillos o para socios, escribe una lectura cercana y humana antes de las tablas, con humor ligero y sin perder rigor. Si pide informe técnico, financiero, auditoría, Dirección o justificación formal, escribe en tono ejecutivo, preciso y sobrio, con conclusiones, salvedades y criterios de cálculo.
- No entregues solo datos crudos cuando el usuario pida un informe: primero redacta un texto de interpretación que explique las líneas generales y responda con el estilo pedido; después deja tablas, gráficas y ficheros como soporte.

- En v18.11 TODA respuesta final debe parecer escrita por Zuzu/Gemini: interpreta el prompt completo del usuario, su intención, tono y destinatario. ControlEvent solo te ha preparado los datos; no copies su carcasa.
- No devuelvas una plantilla mecánica repetida. Cambia estructura, vocabulario y enfoque según cada petición y cada persona/evento consultado.
- Si el usuario pide opinión, informe, valoración, tono cachondo, formal, técnico o coloquial, la parte answer debe ser una redacción humana completa y no una introducción de dos líneas seguida de tablas.

Campos oficiales por módulo:
- INGRESOS: Evento; Nombre; Numero; Importe obligatorio; Importe voluntario; Ingreso; Rango; Just.ing.
- DONACIONES: Evento; Producto; Unidades; Precio; Valor; Tipo de donación; Donante; Responsable.
- COMPRAS: Evento; Producto; Unidades; Precio; Importe; Ticket u otros gastos; Tienda; Responsable; Ticket SI/NO.
- EVENTOS: Titulo del evento; Precio; fecha ini; fecha fin; Estado; DOCxxx.
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
    EVENTOS: ['Titulo del evento','Precio','fecha ini','fecha fin','Estado','DOCxxx','Fecha documento','Descripcion documento','Documento con imagen'],
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
  const filename = fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_v18_11_2_prod.csv`);
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
    charts: [{ title: `${moduleName} por ${ag.groupField} (cálculo local ControlEvent)`, type: /\btarta|pie\b/.test(p) ? 'pie' : 'bar', labels: ag.groups.map(g => g.key).slice(0, 30), values: ag.groups.map(g => round(g.total, 2)).slice(0, 30), unit: '€' }],
    tables: [
      { title: `${moduleName} agrupado por ${ag.groupField}`, columns: groupedColumns, rows: groupedRows },
      { title: `${moduleName} detalle base (${rows.length} registro(s))`, columns: detailColumns, rows: detailRows }
    ],
    files: [
      { filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_agrupado_v18_11_2_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(groupedCsvColumns, groupedCsvRows) },
      { filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_detalle_v18_11_2_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(detailColumns, rows) }
    ],
    provider: 'control-event-local-deterministico',
    model: 'sin-gemini-para-calculos'
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
  const charts = [
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
    files: [{ filename: fileSafe(`Comparativa_eventos_v18_11_2_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }],
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
  return { ok:true, rejected:false, title:'Precio de eventos', answer:`ControlEvent ha revisado ${rows.length} evento(s) y ha calculado localmente el más barato y el más costoso.`, warnings, charts:[{title:'Precio de eventos extremos', type:'bar', labels:['Más barato','Más costoso'], values:[round(barato?.Precio,2), round(caro?.Precio,2)], unit:'€'}], tables:[{title:'Evento más barato y más costoso', columns, rows: tableRows}], files:[{filename:fileSafe('EVENTOS_precios_extremos_v18_11_2_prod.csv'), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, tableRows.map(r=>Object.fromEntries(columns.map((c,i)=>[c,r[i]]))))}], provider:'control-event-local-eventos-precios', model:'sin-gemini-para-calculos' };
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
  return { ok:true, rejected:false, title:`Apariciones de ${needle}`, answer:`ControlEvent ha buscado a “${needle}” en los módulos disponibles: INGRESOS, COMPRAS y DONACIONES. Aparece en ${rows.length} evento(s).`, warnings: rows.length?[]:[`No hay coincidencias para “${needle}” en los módulos extraídos. Prueba con el nombre tal como aparece en PERSONAS/TIENDAS.`], charts:rows.length?[{title:`Eventos donde aparece ${needle}`, type:'bar', labels:rows.map(r=>r.Evento), values:rows.map(r=>r.Colaborador+r['Responsable compras']+r['Responsable donaciones']+r['Donante donaciones']), unit:'apariciones'}]:[], tables:rows.length?[{title:`Apariciones de ${needle} por evento`, columns, rows: rows.map(r=>columns.map(c=>text(r[c])))}]:[], files:rows.length?[{filename:fileSafe(`Apariciones_${needle}_v18_11_2_prod.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}]:[], provider:'control-event-local-busqueda-persona', model:'sin-gemini-para-busquedas' };
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
    files: [{ filename: fileSafe(`Informe_participacion_${needle}_v18_11_2_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(colsDetail, detail) }],
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
    files: [{ filename: fileSafe(`Evolucion_saldo_caja_${anio || 'ControlEvent'}_v18_11_2_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(cols, rows) }],
    provider: 'control-event-local-saldo-caja',
    model: 'sin-gemini-para-saldo-caja'
  };
}
function friendlyZuzuErrorMessage(error) {
  const msg = trim(error?.message || error);
  if (/quota|RESOURCE_EXHAUSTED|rate|429|rate-limit|rate limit|free_tier/i.test(msg)) return 'Zuzu ha alcanzado temporalmente la cuota de la API. ControlEvent intentará resolver localmente las preguntas que pueda; si no hay cálculo local disponible, espera un minuto y repite la consulta.';
  if (/timeout|abort|tard[oó] demasiado|504/i.test(msg)) return 'Zuzu ha tardado demasiado. Prueba con una petición más concreta o repite la consulta.';
  if (/GEMINI_API_KEY|api key|key/i.test(msg)) return 'Zuzu no está bien configurada en el servidor. Revisa la clave GEMINI_API_KEY en Vercel.';
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
  return { ok:true, rejected:false, title:`Productos más utilizados${eventos?` - ${eventos}`:''}`, answer:`ControlEvent ha unido COMPRAS y DONACIONES y ha calculado localmente el producto más utilizado por unidades, separando Comprado y Donado.`, warnings:[], charts:[{title:'Top productos por unidades compradas + donadas', type:'bar', labels:shown.slice(0,30).map(r=>r.Producto), values:shown.slice(0,30).map(r=>r['Total unidades']), unit:'uds'}], tables:[{title:`Top ${shown.length} productos por unidades`, columns, rows:shown.map(r=>columns.map(c=>text(r[c])))}], files:[{filename:fileSafe(`Productos_comprado_donado_${eventos||'ControlEvent'}_v18_11_2_prod.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}], provider:'control-event-local-comprado-donado', model:'sin-gemini-para-calculos' };
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
  return { ok:true, rejected:false, title:'PRODUCTOS extraído por ControlEvent', answer:`ControlEvent ha consultado el catálogo de productos con filtros exactos y cálculo local. Registros entregados: ${rows.length}.`, warnings:[], charts: top ? [{title:`Top ${shown.length} productos por precio rfa.`, type:'bar', labels:shown.slice(0,30).map(r=>r['Nombre producto']), values:shown.slice(0,30).map(r=>round(r['Precio rfa.'],2)), unit:'€'}] : [], tables, files:[{filename:fileSafe('PRODUCTOS_catalogo_v18_11_2_prod.csv'), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}], provider:'control-event-local-productos', model:'sin-gemini-para-catalogos' };
}
function rangosSolicitadosFromPrompt(prompt) {
  const p = norm(prompt);
  const out = [];
  if (/\bno\s+socios?\b/.test(p)) out.push('NO SOCIO');
  else if (/\bsocios?\b/.test(p)) out.push('SOCIO');
  if (/\bdonantes?\b/.test(p)) out.push('DONANTE');
  return out;
}
function directPersonsCatalogIfApplicable(prompt, context) {
  const p = norm(prompt);
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
    files:[{filename:fileSafe(`${rangos.length ? 'PERSONAS_'+rangos.join('_') : 'PERSONAS_catalogo'}_v18_11_2_prod.csv`),mime:'text/csv;charset=utf-8',content:csvFromRows(cols,rows)}],
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
  return {ok:true,rejected:false,title,answer:`ControlEvent ha comparado estrictamente ${moduleName} entre los eventos citados. No se han mezclado otros eventos.`,warnings:[],charts:[{title,type:'bar',labels:out.map(r=>r.Evento),values:out.map(r=>r.Total),unit:'€'}],tables:[{title,columns:cols,rows:out.map(r=>cols.map(c=>text(r[c])))}],files:[{filename:fileSafe(`${moduleName}_comparativa_eventos_v18_11_2_prod.csv`),mime:'text/csv;charset=utf-8',content:csvFromRows(cols,out)}],provider:'control-event-local-comparativa-modulo',model:'sin-gemini-para-calculos'};
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
    files: detail.length ? [{ filename: fileSafe(`Donaciones_${titleNames}_v18_11_2_prod.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(detailColumns, detail) }] : [],
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
    const occurred = facts.length ? facts.join('; ') + '.' : 'No hay actividad operativa registrada en los módulos extraídos.';
    const highlights = [
      comprasTop ? `Compras destacadas: ${comprasTop}.` : '',
      tiendasTop ? `Tiendas principales: ${tiendasTop}.` : '',
      donTopProd ? `Donaciones destacadas: ${donTopProd}.` : '',
      donTopDonantes ? `Donantes principales: ${donTopDonantes}.` : '',
      docsList ? `Documentos: ${docsList}.` : '',
      tkList ? `Tickets: ${tkList}.` : ''
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
      'Qué ocurrió': `${occurred} ${highlights}`.trim()
    });
    moduleRows.push(
      { Orden: idx + 1, Evento: eventName, Módulo: 'INGRESOS', Registros: ing.length, Total: ingresos, Detalle: colaboradores || asistentes || ingresos ? `${colaboradores} colaborador(es), ${asistentes} asistente(s)/unidad(es), ${formatMoneyText(ingresos)}. Formas de ingreso: ${topJoined(ing, 'Ingreso', null, 4) || 'sin desglose'}.` : 'Sin ingresos registrados.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'COMPRAS', Registros: comAll.length, Total: compras, Detalle: comAll.length ? `Realizadas ${formatMoneyText(compras)}; pendientes ${formatMoneyText(pendientes)}. ${comprasTop ? 'Productos: ' + comprasTop + '.' : ''} ${tiendasTop ? 'Tiendas: ' + tiendasTop + '.' : ''}`.trim() : 'Sin compras registradas.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'DONACIONES', Registros: don.length, Total: donaciones, Detalle: don.length ? `${don.length} línea(s), ${formatMoneyText(donaciones)} valorado. ${donTopProd ? 'Productos: ' + donTopProd + '.' : ''} ${donTopDonantes ? 'Donantes: ' + donTopDonantes + '.' : ''}`.trim() : 'Sin donaciones registradas.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'TICKETS', Registros: tk.length, Total: round(sumField(tk, 'Total ticket'),2), Detalle: tk.length ? (tkList || `${tk.length} ticket(s) registrados.`) : 'Sin fototickets/tickets registrados.' },
      { Orden: idx + 1, Evento: eventName, Módulo: 'DOCUMENTOS', Registros: doc.length, Total: doc.length, Detalle: doc.length ? (docsList || `${doc.length} documento(s) registrados.`) : 'Sin documentos registrados.' }
    );
  });
  const columns = ['Orden','Fecha inicio','Fecha fin','Evento','Estado','Ingresos (€)','Compras realizadas (€)','Compras pendientes (€)','Donaciones valoradas (€)','Saldo (€)','Colaboradores','Asistentes / número','Tickets','Documentos','Qué ocurrió'];
  const moduleColumns = ['Orden','Evento','Módulo','Registros','Total','Detalle'];
  const labels = summaryRows.map(r => `${r['Fecha inicio'] || '?'} · ${r.Evento}`);
  return {
    ok: true,
    rejected: false,
    title: 'Informe cronológico de eventos',
    answer: `He ordenado ${summaryRows.length} evento(s) por fecha de inicio/celebración y he preparado una crónica operativa de lo que ocurrió en cada uno. No uso EVENTOS como respuesta final: EVENTOS solo ordena e identifica; el contenido sale de INGRESOS, COMPRAS, DONACIONES, TICKETS/Fototickets y DOCUMENTOS.`,
    warnings: arr(context.advertencias),
    charts: [
      { title: 'Cronología económica por evento', type: 'stackedBar', labels, values: summaryRows.map(r=>round(r['Ingresos (€)'],2)), unit: '€', series: [
        { name: 'Ingresos', values: summaryRows.map(r=>round(r['Ingresos (€)'],2)) },
        { name: 'Compras realizadas', values: summaryRows.map(r=>round(r['Compras realizadas (€)'],2)) },
        { name: 'Donaciones valoradas', values: summaryRows.map(r=>round(r['Donaciones valoradas (€)'],2)) }
      ]},
      { title: 'Actividad registrada por evento', type: 'bar', labels, values: summaryRows.map(r=>num(r.Colaboradores)+num(r.Tickets)+num(r.Documentos)+num(r['Asistentes / número'])), unit: 'registros/unidades' }
    ],
    tables: [
      { title: 'Crónica ordenada por fecha de celebración', columns, rows: summaryRows.map(r=>columns.map(c=>text(r[c]))) },
      { title: 'Detalle por evento y módulo', columns: moduleColumns, rows: moduleRows.map(r=>moduleColumns.map(c=>text(r[c]))) }
    ],
    files: [
      { filename: fileSafe('Informe_cronologico_eventos_v18_11_2_prod.csv'), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, summaryRows) },
      { filename: fileSafe('Informe_cronologico_eventos_detalle_modulos_v18_11_2_prod.csv'), mime: 'text/csv;charset=utf-8', content: csvFromRows(moduleColumns, moduleRows) }
    ],
    provider: 'control-event-local-cronica-eventos',
    model: 'zuzu-planifica-control-event-ordena-y-resume'
  };
}

function directEventReportIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  const events = eventNamesFromContext(context);
  const wantsReport = /\b(informe|exhaustivo|exhaustiva|resumen\s+general|dashboard|balance|situaci[oó]n|estado\s+general)\b/.test(p);
  const wantsGraph = /\b(grafica|gráfica|grafico|gráfico|graficamente|gráficamente|representado|representar|diagrama|barras)\b/.test(p);
  const wantsEventDossier = /\b(toda\s+la\s+info|toda\s+la\s+informacion|toda\s+la\s+información|informacion\s+del\s+evento|información\s+del\s+evento|info\s+del\s+evento|datos\s+del\s+evento|dossier|celebracion|celebración|que\s+tal\s+tiempo|tiempo\s+va\s+a\s+hacer|meteorolog)\b/.test(p);
  const wantsComparison = events.length >= 2 && /\b(compara|comparar|comparativa|comparativas|frente\s+a|versus|\bvs\b)\b/.test(p);
  if (!events.length || !(wantsReport || wantsEventDossier || wantsComparison || (events.length >= 2 && wantsGraph))) return null;
  const canonical = arr(context?.metricasCanonicas?.porEvento);
  const byEvent = new Map(canonical.map(r => [norm(r.Evento), r]));
  const mods = context.modulosExtraidos || {};
  const rows = events.map(ev => {
    const can = byEvent.get(norm(ev)) || {};
    const ing = rowsForEvent(arr(mods.INGRESOS), ev);
    const com = rowsForEvent(arr(mods.COMPRAS), ev);
    const don = rowsForEvent(arr(mods.DONACIONES), ev);
    const tk = rowsForEvent(arr(mods.TICKETS), ev);
    const doc = rowsForEvent(arr(mods.DOCUMENTOS), ev);
    const ingresos = round(can['Ingresos total'] ?? ing.reduce((a,r)=>a+num(r?.['Importe obligatorio'])+num(r?.['Importe voluntario']),0),2);
    const compras = round(can['Compras realizadas'] ?? sumField(com.filter(r=>!/pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos']))),'Importe'),2);
    const pendientes = round(can['Compras pendientes'] ?? sumField(com.filter(r=>/pte\.?\s*compra|pendiente/i.test(trim(r?.['Ticket u otros gastos']))),'Importe'),2);
    const donaciones = round(can['Donaciones valor'] ?? sumField(don,'Valor'),2);
    const saldo = round(can['Saldo actual'] ?? (ingresos-compras),2);
    const valoracion = round(can['Valoracion con donaciones'] ?? (compras+donaciones),2);
    return {
      Evento: ev,
      'Ingresos total (€)': ingresos,
      'Compras realizadas (€)': compras,
      'Compras pendientes (€)': pendientes,
      'Donaciones valoradas (€)': donaciones,
      'Saldo ingresos - compras (€)': saldo,
      'Valor compras + donaciones (€)': valoracion,
      'Colaboradores': can['Colaboradores registros'] ?? ing.length,
      'Asistentes / número': round(can['Asistentes / Numero'] ?? ing.reduce((a,r)=>a+num(r?.Numero),0),3),
      'Líneas compras': can['Compras registros'] ?? com.length,
      'Líneas donaciones': can['Donaciones registros'] ?? don.length,
      'Tickets': can['Tickets numero'] ?? tk.length,
      'Documentos': can['Documentos numero'] ?? doc.length
    };
  });
  const columns = ['Evento','Ingresos total (€)','Compras realizadas (€)','Compras pendientes (€)','Donaciones valoradas (€)','Saldo ingresos - compras (€)','Valor compras + donaciones (€)','Colaboradores','Asistentes / número','Líneas compras','Líneas donaciones','Tickets','Documentos'];
  const rowsTable = rows.map(r => columns.map(c => text(r[c])));
  const charts = [
    { title: 'Ingresos, compras y donaciones por evento', type: 'bar', labels: rows.map(r=>r.Evento), values: rows.map(r=>round(r['Ingresos total (€)'],2)), unit: '€', series: [
      { name: 'Ingresos', values: rows.map(r=>round(r['Ingresos total (€)'],2)) },
      { name: 'Compras realizadas', values: rows.map(r=>round(r['Compras realizadas (€)'],2)) },
      { name: 'Donaciones valoradas', values: rows.map(r=>round(r['Donaciones valoradas (€)'],2)) }
    ] },
    { title: 'Saldo por evento', type: 'bar', labels: rows.map(r=>r.Evento), values: rows.map(r=>round(r['Saldo ingresos - compras (€)'],2)), unit: '€' },
    { title: 'Volumen de registros por evento', type: 'bar', labels: rows.map(r=>r.Evento), values: rows.map(r=>num(r['Líneas compras'])+num(r['Líneas donaciones'])+num(r.Colaboradores)), unit: 'registros' }
  ];
  const weatherAsked = /\b(que\s+tal\s+tiempo|tiempo\s+va\s+a\s+hacer|meteorolog|previsi[oó]n|lluvia|calor|fr[ií]o)\b/.test(p);
  const detailTables = [];
  function addModuleDetail(moduleName, title, limit = 120) {
    const data = arr(mods[moduleName]);
    if (!data.length) return;
    const cols = orderedColumnsForModule(moduleName, data);
    detailTables.push({ title, columns: cols, rows: data.slice(0, limit).map(r => cols.map(c => { const v = r?.[c]; if (Array.isArray(v)) return v.map(x => typeof x === 'object' ? JSON.stringify(x) : text(x)).join(' | '); return typeof v === 'object' && v !== null ? JSON.stringify(v) : text(v); })) });
  }
  addModuleDetail('INGRESOS', 'Detalle de INGRESOS / colaboradores del evento', 120);
  addModuleDetail('COMPRAS', 'Detalle de COMPRAS / gastos del evento', 160);
  addModuleDetail('DONACIONES', 'Detalle de DONACIONES de producto del evento', 160);
  addModuleDetail('TICKETS', 'Fototickets / tickets del evento', 120);
  addModuleDetail('DOCUMENTOS', 'Documentos del evento', 120);
  const answer = `${weatherAsked ? 'ControlEvent no dispone de previsión meteorológica externa ni consulta AEMET desde Zuzu; por eso no invento el tiempo. ' : ''}Informe de ${rows.length} evento(s): ${events.join(' | ')}. Incluyo lo operativo del evento: ingresos/colaboradores, compras, donaciones, tickets/fototickets, documentos y saldo. EVENTOS solo se usa para identificar título, fechas y estado. Saldo = ingresos - compras realizadas; las donaciones se valoran aparte y no se suman al saldo financiero.`;
  return {
    ok: true, rejected: false,
    title: `${wantsComparison ? 'Comparativa operativa de eventos' : 'Informe operativo de evento'}`,
    answer,
    warnings: arr(context.advertencias),
    charts,
    tables: [{ title: 'Resumen operativo por evento', columns, rows: rowsTable }, ...detailTables],
    files: [{ filename: fileSafe(`Informe_eventos_v18_11_2_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }],
    provider: 'control-event-local-informe-eventos',
    model: 'calculo-local-oficial'
  };
}

function directHighConfidenceResultIfApplicable(prompt, context) {
  return directCashEvolutionIfApplicable(prompt, context)
    || directPersonsCatalogIfApplicable(prompt, context)
    || directPersonRoleReportIfApplicable(prompt, context)
    || directPersonAppearanceIfApplicable(prompt, context)
    || directProductConsumptionResultIfApplicable(prompt, context)
    || directDonorDonationProductsIfApplicable(prompt, context)
    || directBoughtDonatedUsageIfApplicable(prompt, context)
    || directChronologicalEventNarrativeIfApplicable(prompt, context)
    || directEventReportIfApplicable(prompt, context);
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
      { filename: fileSafe(`Productos_consumidos_coste${titleEvents}_v18_11_2_prod.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, byCost) },
      { filename: fileSafe(`Productos_consumidos_unidades${titleEvents}_v18_11_2_prod.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, byUnits) },
      { filename: fileSafe(`Productos_consumidos_detalle${titleEvents}_v18_11_2_prod.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(detailColumns, rowsSrc.map(r=>({ 'Evento':r.evento, 'Origen':r.origen, 'Producto':r.producto, 'Unidades':round(r.unidades,3), 'Precio':round(r.precio,4), 'Importe/Valor':round(r.importe,2), 'Ticket/Tipo':r.detalle, 'Tienda/Donante':r.tercero, 'Responsable':r.responsable }))) }
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
    files: rows.length ? [{ filename: fileSafe(`${first}_${eventos || 'ControlEvent'}_diagnostico_v18_11_2_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }] : [],
    provider: 'control-event-local-consulta-directa',
    model: 'consulta-modulos-sin-gemini'
  };
}

function directGraphResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  if (!/\b(grafica|gráfica|grafico|gráfico|diagrama|barras|tarta)\b/.test(p)) return null;
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
    charts: [{ title: `${moduleName} por ${g.groupField}`, type: /\btarta|pie\b/.test(p) ? 'pie' : 'bar', labels: g.labels, values: g.values, unit: '€' }],
    tables: [{ title: `${moduleName} base usada (${rows.length} registro(s))`, columns, rows: tableRows }],
    files: [{ filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_grafica_v18_11_2_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }],
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
function logGeminiUsage(stage, model, payload) {
  try {
    const u = payload?.usageMetadata || {};
    console.log(`[ControlEvent v18.11.2_prod Zuzu] ${stage} · ${model} · prompt=${u.promptTokenCount ?? ''} candidates=${u.candidatesTokenCount ?? ''} total=${u.totalTokenCount ?? ''}`);
  } catch (_) {}
}
function isRetryable(err) { return /400|404|model|not supported|429|quota|RESOURCE_EXHAUSTED|rate|unavailable|503|504|aborted|abort|tard[oó] demasiado|INVALID_ARGUMENT/i.test(text(err?.message || '')); }
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

async function callGeminiEvent(prompt, context) {
  const apiKey = geminiKey();
  if (!apiKey) {
    const err = new Error('Falta GEMINI_API_KEY en Vercel para usar Zuzu / Analítica libre.');
    err.status = 503;
    throw err;
  }
  let lastError = null;
  for (const model of configuredGeminiModels()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: systemPrompt(prompt, context) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: eventAiSchema(), temperature: 0.2 }
    };
    try {
      const { res, payload } = await geminiFetchJsonWithTimeout(url, body, apiKey, 18000);
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
        return {
          ok: true,
          rejected: false,
          title: 'Respuesta de Zuzu no estructurada',
          answer: 'Zuzu no devolvió un JSON válido. ControlEvent ha evitado mostrar la respuesta cruda para no entregar una pantalla ilegible. Repite la consulta de forma algo más concreta o revisa la cuota/modelo de Zuzu.',
          warnings: ['Zuzu no devolvió JSON estructurado válido y no hubo una salida local aplicable.'],
          charts: [],
          tables: [],
          files: [{ filename: fileSafe('Zuzu_respuesta_zuzu_no_estructurada_v18_11_2_prod.txt'), mime: 'text/plain;charset=utf-8', content: outText.slice(0, 250000) }],
          provider: 'gemini-rest-json-fallback',
          model
        };
      }
      return normalizeResult(parsed, model);
    } catch (error) {
      lastError = error;
      if (isQuotaError(error) || !isRetryable(error)) break;
    }
  }
  lastError.status = lastError.status || 502;
  throw lastError;
}


function narrativeToneFromPrompt(prompt) {
  const p = norm(prompt);
  const informal = /\b(coloquial|informal|simpatic|simpático|chascarrill|cachond|cachondo|cachonda|cachondeo|coña|broma|risas|guasa|gracios|socios?|soci[ao]s?|peña|ameno|cercano|divertid|natural|humano|campechano|para\s+contar|para\s+leer|para\s+dar|para\s+darselo|para\s+dárselo|buena\s+persona|señor[ao]\s+espos[ao])\b/.test(p);
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
  return /\b(una\s+pagina|1\s+pagina|p[aá]gina|texto\s+de\s+1|texto\s+de\s+una|informe\s+en\s+texto|redaccion|redacción|desarrollado|todo\s+lujo\s+de\s+detalles)\b/.test(p);
}
function wantsNarrativeReport(prompt) {
  const p = norm(prompt);
  return /\b(informe|infore|memoria|cronica|crónica|resumen|dossier|explica|explicame|explícame|cuenta|cuentame|cuéntame|cositas|lectura|conclusiones|valoracion|valoración|opinion|opinión|parece|merece|ves\s+tu|ves\s+tú|como\s+lo\s+ves|cómo\s+lo\s+ves|texto|pagina|página|redaccion|redacción|palabras|entonacion|entonación|tono|sentimiento|para\s+entregar|para\s+pasar|para\s+darlo|para\s+darselo|para\s+dárselo|socios|direccion|dirección|coloquial|informal|cachond|chascarrill|tecnic|técnic|financier|contable)\b/.test(p);
}
function requiresGeminiNarrativeStrict(prompt) {
  const p = norm(prompt);
  // Cuando el usuario pide tono, opinión o que “lo haga Zuzu”, no queremos plantillas locales.
  // ControlEvent cocina los datos; Zuzu/Gemini debe escribir la respuesta humana.
  return wantsNarrativeReport(prompt) && /\b(zuzu|dejate|déjate|curra|opinion|opinión|merece|como\s+lo\s+ves|cómo\s+lo\s+ves|tono|cachond|chascarrill|coloquial|informal|simpatic|simpa[tá]ic|palabras|texto\s+de|una\s+pagina|1\s+pagina|p[aá]gina|para\s+darselo|para\s+dárselo|para\s+socios|para\s+direccion|direcci[oó]n)\b/.test(p);
}
function shouldEnrichLocalResultWithNarrative(prompt, result) {
  if (!result || result.rejected === true || result.ok === false) return false;
  const hasData = arr(result.tables).length || arr(result.charts).length || trim(result.answer);
  if (!hasData) return false;
  const provider = trim(result.provider || '');
  // v18.11: toda salida cocinada localmente por CE debe pasar por Zuzu/Gemini como capa final de contexto y redacción.
  // Si ya viene de Gemini REST estructurado o de la capa de redacción, no se fuerza una segunda llamada.
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
  const scored = tables.map((tb, idx) => {
    const t = norm(tb?.title || '');
    let score = 0;
    if (/resumen|cronica|crónica|comparativa|participaci|saldo|ranking|operativo/.test(t)) score += 10;
    if (/detalle.*registros|detalle.*donaciones|detalle.*compras|detalle.*ingresos/.test(t)) score += 7;
    else if (/detalle/.test(t)) score -= 1;
    return { tb, idx, score };
  }).sort((a,b)=>b.score-a.score || a.idx-b.idx);
  return scored.slice(0, 4).map(x => x.tb);
}
function compactResultForNarrative(result) {
  const tables = pickNarrativeTables(result).map(tb => ({
    title: trim(tb?.title),
    columns: arr(tb?.columns).map(c => trim(c)).slice(0, 16),
    rows: tableObjects(tb, wantsOnePageNarrative(result?.__userPrompt || '') ? 90 : 45)
  }));
  const charts = arr(result?.charts).slice(0, 6).map(ch => ({
    title: trim(ch?.title),
    type: trim(ch?.type),
    labels: arr(ch?.labels).map(x => trim(x)).slice(0, 12),
    values: arr(ch?.values).map(x => round(x, 3)).slice(0, 12),
    series: arr(ch?.series).slice(0, 5).map(s => ({ name: trim(s?.name), values: arr(s?.values).map(x => round(x, 3)).slice(0, 12) })),
    unit: trim(ch?.unit)
  }));
  return {
    title: trim(result?.title),
    answerBase: trim(result?.answer).slice(0, 1200),
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
function fallbackPersonNarrativeForLocalReport(prompt, result) {
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

function fallbackNarrativeForLocalReport(prompt, result) {
  const personFallback = fallbackPersonNarrativeForLocalReport(prompt, result);
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
    return `Lectura ejecutiva de Zuzu: el informe de ${evento} presenta ${cifras}. El análisis separa la caja financiera de las donaciones valoradas: el saldo se interpreta como ingresos menos compras realizadas, mientras que las donaciones se muestran como aportación operativa adicional.\n\nConclusión: el detalle de tablas y ficheros permite justificar ingresos/colaboradores, gasto por compras, aportaciones donadas, tickets/fototickets y documentación soporte. Conviene revisar cualquier línea negativa o de ajuste antes de entregar el informe como cierre definitivo.`;
  }
  if (tone.id === 'coloquial-socios') {
    return `Lectura de Zuzu para contar a los socios: en ${evento} hubo movimiento del bueno: ${cifras}. Traducido a cristiano, aquí no solo hay números; hay gente que colaboró, compras que sostuvieron la celebración y donaciones que ayudaron a que la cosa saliera adelante sin que la caja tuviera que cargar con todo.\n\nEl resumen detallado viene debajo con pelos y señales: colaboradores${colaboradores ? ` (${colaboradores})` : ''}, asistentes${asistentes ? ` (${asistentes})` : ''}, tickets${tickets ? ` (${tickets})` : ''} y documentos${documentos ? ` (${documentos})` : ''}. Vamos, que si alguien pregunta “¿y esto de dónde sale?”, hay papeles y números para aburrir a una oveja, pero contado bonito.`;
  }
  return `Lectura general de Zuzu: el informe de ${evento} resume ${cifras}. Las tablas siguientes dejan trazabilidad por ingresos/colaboradores, compras, donaciones, tickets/fototickets y documentos.\n\nLa idea principal es separar la visión financiera de caja de la actividad real del evento: la caja se mide por ingresos menos compras realizadas, y las donaciones explican valor recibido aunque no entren como ingreso monetario.`;
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
  const onePage = wantsOnePageNarrative(userPrompt);
  const enriched = { ...localResult, __userPrompt: userPrompt };
  const compact = compactResultForNarrative(enriched);
  const ctx = JSON.stringify({ tono: tone.label, instruccionesTono: tone.instruction, modoTextoLargo: onePage, resultadoControlEvent: compact }).slice(0, onePage ? 32000 : 22000);
  const limit = onePage ? 'entre 5 y 8 párrafos, con aspecto de una página de texto, hasta 6500 caracteres' : 'entre 3 y 5 párrafos, hasta 3200 caracteres';
  return `Eres Zuzu/Gemini, la voz final de ControlEvent. ControlEvent ya ha hecho la parte fría: cálculos, tablas, gráficas y CSV. Tu trabajo NO es rellenar una plantilla: debes leer el prompt completo, captar intención, destinatario, tono y contexto, y escribir una respuesta humana, bonita y útil como si realmente te hubieran encargado a ti el informe.

Reglas obligatorias:
- NO respondas como ControlEvent. No empieces con frases mecánicas tipo "He localizado X registros", "Informe operativo" o "Separado por papeles". Puedes usar los números, pero integrados en una explicación humana.
- Esta redacción debe ser ORIGINAL para esta petición concreta. Prohibido reutilizar plantillas o coletillas de otros informes.
- No menciones nombres que no vengan en la petición original o en los datos oficiales de abajo. Si el usuario pregunta por Colty, no acabes hablando de Pocholo; si pregunta por Pocholo, no cambies a Colty.
- Respeta exactamente el tono pedido: si el usuario pide cachondeo, socios, chascarrillos o palabras cercanas, escribe con gracia y complicidad; si pide Dirección/financiero/técnico, escribe sobrio, ejecutivo y justificable.
- Si el usuario pide opinión, da una opinión explícita de Zuzu, prudente y apoyada en datos. No digas que no puedes opinar si los datos permiten valorar participación, esfuerzo o relevancia.
- Si el usuario dice "déjate de ControlEvent", debe notarse que habla Zuzu: usa primera persona con naturalidad, pero sin inventar datos.
- Usa nombres, productos y cifras reales que aparecen en los datos resumidos. No inventes personas, importes, fechas ni incidencias.
- Las tablas son soporte y ya se mostrarán debajo. Tu answer debe ser un texto redactado que sirva por sí solo para leerlo o entregarlo.
- ${limit}.
- No uses markdown, no devuelvas tablas, no pegues JSON.
- Si aparecen saldo/caja/donaciones, aclara con naturalidad que el saldo financiero no suma donaciones si procede.
- Devuelve SOLO JSON válido con title, answer, warnings.

PETICIÓN ORIGINAL DEL USUARIO:
${trim(userPrompt).slice(0, 3500)}

DATOS OFICIALES CALCULADOS POR CONTROLEVENT:
${ctx}`;
}
async function callGeminiNarrativeForLocalResult(userPrompt, localResult, context) {
  const apiKey = geminiKey();
  if (!apiKey) throw new Error('Sin GEMINI_API_KEY para redactar informe con Zuzu.');
  // v18.11: no se usa caché narrativa; el usuario ha contratado prepago y quiere que Zuzu/Gemini recontextualice cada petición.
  const tone = narrativeToneFromPrompt(userPrompt);
  let lastError = null;
  for (const model of configuredGeminiModels()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: narrativePrompt(userPrompt, localResult, context) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: narrativeMiniSchema(), temperature: tone.id === 'coloquial-socios' ? 0.82 : 0.28 }
    };
    try {
      const { res, payload } = await geminiFetchJsonWithTimeout(url, body, apiKey, wantsOnePageNarrative(userPrompt) ? 32000 : 24000);
      logGeminiUsage('PASO 2 redacción humana', model, payload);
      if (!res.ok) throw new Error(payload?.error?.message || `Zuzu narrativa HTTP ${res.status}`);
      const outText = trim(geminiOutText(payload));
      if (!outText) throw new Error('Zuzu narrativa no devolvió texto.');
      let parsed;
      try { parsed = JSON.parse(stripJsonText(outText)); }
      catch (_) {
        // Si Gemini entendió la intención pero no respetó el JSON, aprovechamos el texto en vez de caer a plantilla local.
        const cleaned = outText.replace(/^```(?:json)?/i,'').replace(/```$/,'').trim();
        return { title: trim(localResult?.title || 'Respuesta de Zuzu'), answer: cleaned, warnings: ['Zuzu redactó texto libre y ControlEvent lo ha presentado sin plantilla local.'], model };
      }
      const finalNarrative = { title: trim(parsed?.title), answer: trim(parsed?.answer), warnings: arr(parsed?.warnings).map(w => trim(w)).filter(Boolean), model };
      return finalNarrative;
    } catch (error) {
      lastError = error;
      if (isQuotaError(error) || !isRetryable(error)) break;
    }
  }
  throw lastError || new Error('Zuzu narrativa no disponible.');
}
async function maybeEnrichLocalResultWithZuzu(userPrompt, context, localResult) {
  if (!shouldEnrichLocalResultWithNarrative(userPrompt, localResult)) return localResult;
  const out = { ...localResult, warnings: arr(localResult.warnings).slice() };
  try {
    const narrative = await callGeminiNarrativeForLocalResult(userPrompt, localResult, context);
    if (trim(narrative.answer)) {
      const ans = trim(narrative.answer);
      const tone = narrativeToneFromPrompt(userPrompt);
      const mechanical = tone.id === 'coloquial-socios' && /^he localizado\s+\d+\s+registro/i.test(ans);
      if (mechanical) throw new Error('Zuzu devolvió una redacción demasiado mecánica para el tono pedido.');
      out.title = trim(narrative.title) || out.title;
      out.answer = ans;
      out.warnings = arr(out.warnings).concat(arr(narrative.warnings));
      out.provider = `${trim(out.provider || 'control-event-local')}+zuzu-sentimiento-redaccion`;
      out.model = narrative.model || 'zuzu-redaccion';
      return out;
    }
  } catch (error) {
    const strict = requiresGeminiNarrativeStrict(userPrompt);
    if (strict) {
      out.answer = `Zuzu no ha podido redactar todavía la parte humana del informe. Los datos calculados por ControlEvent quedan debajo para no perder el trabajo, pero no voy a disfrazar una plantilla local como si fuera una respuesta de Zuzu/Gemini. Motivo: ${friendlyZuzuErrorMessage(error)}`;
      out.provider = `${trim(out.provider || 'control-event-local')}+zuzu-redaccion-no-disponible`;
      out.model = 'zuzu-redaccion-obligatoria-fallida';
      out.showWarnings = true;
      out.warnings = out.warnings.concat('La petición exigía tono/opinión/redacción humana. Se evita respuesta mecánica de ControlEvent para no dar una falsa impresión de inteligencia.');
      return out;
    }
    const fallback = fallbackNarrativeForLocalReport(userPrompt, localResult);
    if (fallback) {
      out.answer = fallback;
      out.provider = `${trim(out.provider || 'control-event-local')}+redaccion-local`;
      out.model = 'redaccion-local-por-fallo-zuzu';
      out.showWarnings = true;
      out.warnings = out.warnings.concat(`Zuzu/Gemini no pudo redactar el texto narrativo (${friendlyZuzuErrorMessage(error)}). ControlEvent ha aplicado una redacción local de respaldo.`);
      return out;
    }
  }
  return out;
}

function plannerSchema() {
  const strArr = { type: 'ARRAY', items: { type: 'STRING' } };
  return {
    type: 'OBJECT',
    properties: {
      ok: { type: 'BOOLEAN' },
      needsClarification: { type: 'BOOLEAN' },
      clarification: { type: 'STRING' },
      modules: strArr,
      eventos: strArr,
      todosLosEventos: { type: 'BOOLEAN' },
      filters: {
        type: 'OBJECT',
        properties: {
          personas: strArr, productos: strArr, tiendas: strArr, responsables: strArr, donantes: strArr, tickets: strArr, segmentos: strArr, destinos: strArr, rangos: strArr,
          anios: strArr, fechaDesde: { type: 'STRING' }, fechaHasta: { type: 'STRING' }, estado: strArr
        }
      },
      dataRequests: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: { modulo: { type: 'STRING' }, filtro: { type: 'STRING' }, campos: strArr, motivo: { type: 'STRING' } }
        }
      },
      salidaDeseada: strArr,
      reasoning: { type: 'STRING' }
    },
    required: ['ok','needsClarification','clarification','modules','eventos','todosLosEventos','filters','reasoning']
  };
}
function plannerPrompt(userPrompt, catalog) {
  const ctx = JSON.stringify(catalog).slice(0, 42000);
  return `Eres Zuzu en modo PLANIFICADOR DE MÓDULOS de ControlEvent. En esta primera llamada NO respondas al usuario.
Tu única tarea es leer el prompt y devolver qué módulos necesitas y con qué filtros para que ControlEvent extraiga SOLO la información necesaria.

Módulos disponibles:
- INGRESOS: colaboradores, ingresos, recaudación, asistentes, socios/no socios, justificantes de ingreso.
- DONACIONES: donaciones de producto, productos donados, donantes.
- COMPRAS: compras, gastos, productos comprados, tiendas, responsables, Pte. Compra.
- EVENTOS: eventos, título, precio, fechas, estado, documentos asociados.
- TICKETS: TKxx, tickets, facturas, resumen por ticket.
- DOCUMENTOS: DOCxxx, documentos adjuntos del evento.
- PRODUCTOS: catálogo de productos, segmento, destino, precio de referencia.
- TIENDAS: catálogo de tiendas.
- PERSONAS: catálogo de personas, rango.

Reglas de planificación:
- Devuelve módulos y filtros. Ejemplo: para "productos consumidos en SySA 2025" pide EVENTOS, COMPRAS, DONACIONES y PRODUCTOS; filtro evento=SySA 2025, año=2025, agrupación producto.
- Si el usuario pide gráficas/rankings de productos consumidos, incluye COMPRAS + DONACIONES + PRODUCTOS.
- Si pide fecha, precio o estado técnico de un evento, EVENTOS es suficiente.
- Si pide datos, información, resumen, dossier, comparativa o “qué ocurrió” en un evento, NO devuelvas solo EVENTOS: incluye INGRESOS, COMPRAS, DONACIONES, TICKETS y DOCUMENTOS.
- Si pregunta por el tiempo meteorológico de una celebración, incluye EVENTOS y los módulos de actividad del evento; ControlEvent responderá que no hay previsión meteorológica externa si no existe ese dato.
- Si pregunta dónde ha participado/aparecido una persona, incluye INGRESOS + COMPRAS + DONACIONES + PERSONAS y busca en todos los eventos si no cita un evento concreto.
- Si pide personas SOCIO/DONANTE/NO SOCIO registradas en el sistema, usa PERSONAS, filtro filters.rangos=[SOCIO/DONANTE/NO SOCIO] y NO lo limites al evento activo.
- Si pide coste/unidades/tiendas/responsables de compras, incluye COMPRAS y PRODUCTOS; añade TIENDAS/PERSONAS solo si necesita catálogos.
- Si cita eventos entre comillas, pon sus títulos en eventos. Si menciona año, añade filters.anios.
- Si dice todos los eventos/eventos registrados/celebraciones, todosLosEventos=true.
- Propón filtros seguros: productos, tiendas, personas, responsables, donantes, tickets, segmentos, destinos, anios, fechaDesde/fechaHasta. No inventes IDs. Usa nombres humanos.
- Si no hay filtro claro para producto/persona/tienda, deja ese filtro vacío. No filtres por palabras comunes del nombre de evento.
- dataRequests debe explicar por módulo qué debe extraer ControlEvent y por qué.
- needsClarification=true solo si no puedes identificar ningún módulo útil o falta un evento imprescindible.
- Devuelve SOLO JSON con el esquema.

CATÁLOGO RESUMIDO CONTROL EVENT:
${ctx}

PROMPT DEL USUARIO:
${trim(userPrompt).slice(0, 2600)}`;
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
async function callGeminiPlanner(userPrompt, catalog) {
  const apiKey = geminiKey();
  if (!apiKey) throw new Error('Sin GEMINI_API_KEY para Zuzu planificador.');
  // v18.11: siempre se pregunta a Zuzu/Gemini en el Paso 1 para decidir módulos y filtros.
  let lastError = null;
  for (const model of configuredGeminiModels()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: plannerPrompt(userPrompt, catalog) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: plannerSchema(), temperature: 0.05 }
    };
    try {
      const { res, payload } = await geminiFetchJsonWithTimeout(url, body, apiKey, 7500);
      logGeminiUsage('PASO 1 planificación de datos', model, payload);
      if (!res.ok) throw new Error(payload?.error?.message || `Zuzu planner HTTP ${res.status}`);
      const outText = trim(geminiOutText(payload));
      if (!outText) throw new Error('Planificador no devolvió texto.');
      const parsed = JSON.parse(stripJsonText(outText));
      return parsed;
    } catch (error) {
      lastError = error;
      if (isQuotaError(error) || !isRetryable(error)) break;
    }
  }
  throw lastError || new Error('Planificador Zuzu no disponible.');
}
function shouldUseGeminiPlanner(userPrompt, local) {
  // v18.11: flujo pedido por el usuario: SIEMPRE Paso 1 con Zuzu/Gemini.
  // ControlEvent solo aporta plan local como red de seguridad si Gemini no responde.
  return true;
}
async function buildZuzuPlan(userPrompt, state, selectedEventId) {
  const local = buildZuzuLocalPlan(state, selectedEventId, userPrompt);
  if (!shouldUseGeminiPlanner(userPrompt, local)) {
    return {
      ...local,
      reasoning: `${local.reasoning || 'Plan local de respaldo.'} Zuzu planificador no se ha usado solo por ausencia/fallo; en v18.11 la ruta normal siempre es Gemini para planificar.`,
      __zuzuPlannerProvider: 'local-solo-si-gemini-no-disponible',
      __zuzuGeminiAllRows: false
    };
  }
  try {
    const catalog = buildZuzuPlanningCatalog(state, selectedEventId);
    const ai = await callGeminiPlanner(userPrompt, catalog);
    const modules = [...new Set([].concat(arr(ai?.modules || ai?.modulos), arr(local.modules)).map(x => trim(x).toUpperCase()).filter(Boolean))];
    const filters = mergePlannerFilters(local.filters, ai?.filters);
    return {
      ...ai,
      ok: ai?.ok !== false,
      needsClarification: ai?.needsClarification === true && !modules.length,
      modules: modules.length ? modules : local.modules,
      eventos: arr(ai?.eventos).length ? arr(ai.eventos) : arr(local.eventos),
      todosLosEventos: ai?.todosLosEventos === true || local.todosLosEventos === true,
      filters,
      dataRequests: arr(ai?.dataRequests),
      salidaDeseada: arr(ai?.salidaDeseada),
      reasoning: trim(ai?.reasoning || '') || 'Zuzu ha deducido módulos y filtros desde el prompt; ControlEvent extrae solo los datos necesarios y humanizados.',
      __zuzuPlannerProvider: 'zuzu-planner',
      __zuzuGeminiAllRows: false
    };
  } catch (error) {
    return {
      ...local,
      filters: local.filters || {},
      reasoning: `${local.reasoning || 'Plan local de respaldo.'} Aviso: Zuzu planificador no respondió (${trim(error?.message || error)}).`,
      __zuzuPlannerProvider: 'local-fallback',
      __zuzuGeminiAllRows: false,
      plannerWarning: trim(error?.message || error)
    };
  }
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
  if (evs.length === 1) {
    const e = evs[0] || {};
    const title = trim(e['Titulo del evento'] || e.titulo || e.Evento || '');
    const estado = trim(e.Estado || e.situacion || '');
    return { eventHeader: [title, estado].filter(Boolean).join(' · '), scopeKind: 'single-event', eventCount: 1 };
  }
  if (evs.length > 1) return { eventHeader: `Consulta global · ${evs.length} eventos`, scopeKind: 'multi-event', eventCount: evs.length };
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
function finalizeZuzuResult(result, context, userPrompt) {
  const sorted = sortResultTables(result || {});
  const meta = scopeMetaFromContext(context);
  return {
    ...sorted,
    meta: {
      ...(sorted.meta || {}),
      ...meta,
      generatedAt: new Date().toISOString(),
      version: 'v18.11.2_prod',
      filenameSubject: fileSafe(dominantSubjectFromPrompt(userPrompt, sorted)).slice(0, 70)
    }
  };
}

export async function analyzeEventPrompt({ prompt, selectedEventId, stateOverride } = {}) {
  const userPrompt = trim(prompt);
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
  const forbidden = /(contraseña|password|clave api|api key|token|sql|drop table|delete from|insert into|hack|exfiltra|sistema operativo|receta|chiste|horóscopo|fútbol|politic[ao]s?)/i;
  const eventish = /(evento|eventos|compra|compras|donaci[oó]n|donaciones|ingreso|ingresos|producto|productos|ticket|tk\d+|tienda|responsable|socio|donante|colaborador|gr[aá]fica|estad[ií]stica|presupuesto|segmento|destino|coste|cantidad|valoraci[oó]n|recurso|mapa|resumen|compar)/i;
  if (forbidden.test(userPrompt) && !eventish.test(userPrompt)) {
    return { ok: true, rejected: true, title: 'Petición rechazada', answer: 'La petición no parece relacionada con la gestión de eventos de ControlEvent.', warnings: [], charts: [], tables: [], files: [], provider: 'local-guard', model: '' };
  }
  const state = stateOverride && typeof stateOverride === 'object' ? stateOverride : await getState();
  const plan = await buildZuzuPlan(userPrompt, state, selectedEventId);
  const context = buildZuzuModuleContext(state, selectedEventId, userPrompt, plan);

  // v11_3_3 hotfix: Zuzu vuelve al flujo en 3 pasos pedido por el usuario:
  // 1) planificación de módulos, 2) extracción oficial por ControlEvent, 3) respuesta final con Zuzu.
  // Las respuestas locales quedan solo como respaldo si Zuzu falla.
  const done = (result) => finalizeZuzuResult(result, context, userPrompt);
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

  const highConfidence = directHighConfidenceResultIfApplicable(userPrompt, context);
  if (highConfidence) return done(await maybeEnrichLocalResultWithZuzu(userPrompt, context, highConfidence));

  try {
    const geminiResult = await callGeminiEvent(userPrompt, context);
    return done(await maybeEnrichLocalResultWithZuzu(userPrompt, context, geminiResult));
  } catch (error) {
    const friendly = friendlyZuzuErrorMessage(error);
    const fallback = directCashEvolutionIfApplicable(userPrompt, context) || directPersonsCatalogIfApplicable(userPrompt, context) || directPersonRoleReportIfApplicable(userPrompt, context) || directChronologicalEventNarrativeIfApplicable(userPrompt, context) || directProductConsumptionResultIfApplicable(userPrompt, context) || directDeterministicResultIfApplicable(userPrompt, context) || directGraphResultIfApplicable(userPrompt, context);
    if (fallback) {
      fallback.warnings = arr(fallback.warnings).concat(`${friendly} Se muestra respaldo analítico de ControlEvent basado en los módulos oficiales.`);
      fallback.provider = `${fallback.provider || 'control-event'}-fallback`;
      fallback.model = 'sin-gemini-por-error';
      return done(await maybeEnrichLocalResultWithZuzu(userPrompt, context, fallback));
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


// v18.11.2_prod - Planificación inicial asistida por Zuzu.
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
    const p = maps.people.get(trim(c?.personaId || c?.persona_id)) || {};
    const rango = trim(p.rango || c?.rango || '').toUpperCase() || 'SIN RANGO';
    const numero = num(c.numero);
    const voluntario = num(c.importeVoluntario ?? c.importe ?? 0);
    return {
      key: `ingreso:${trim(c.id) || index}`,
      sourceId: trim(c.id),
      personaId: trim(c?.personaId || c?.persona_id),
      personaName: trim(p.nombre || c?.nombre || 'Persona sin nombre'),
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
  for (const model of configuredGeminiPlanningModels()) {
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

export async function planificacionInicialZuzu({ mode, modelEventId, content, title, fechaIni, fechaFin, dias, personas, defaultResponsibleId, defaultStoreId, descripcion, info, applySaldoAjuste, applyProductCaps } = {}) {
  const state = await getState();
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
    version: 'v18.11.2_prod_FIX47_CONSUMO_ABIERTO_VARIABLE',
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
