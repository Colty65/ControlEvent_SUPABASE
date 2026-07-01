/* ControlEvent v17_prod - Zuzu / Analítica libre sobre datos del evento.
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
  const explicitGemini = process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.CONTROLEVENT_GEMINI_API_KEY
    || process.env.OPENIA_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || '';
  if (explicitGemini) return explicitGemini;
  const maybeOpenAiVar = process.env.OPENAI_API_KEY || '';
  return maybeOpenAiVar && !looksLikeOpenAiKey(maybeOpenAiVar) ? maybeOpenAiVar : '';
}
function configuredGeminiModels() {
  // v11.1: no volver a llamar a Gemini 1.5 desde v1beta.
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
1) Gemini/planificador ha deducido los módulos necesarios.
2) ControlEvent ha extraído esos módulos desde la app, en registros legibles y sin códigos internos.
3) Ahora recibes TODOS los registros entregados por esos módulos y el prompt original del usuario. Tu trabajo es cocinar/formatear la respuesta final exactamente según lo pedido.

Reglas obligatorias:
- Usa exclusivamente modulosExtraidos y metricasCanonicas. No inventes datos ni completes huecos por intuición.
- La respuesta principal debe ser legible para usuario final: máximo 10-12 líneas de explicación; no pegues JSON, arrays ni listados brutos dentro de answer.
- Si hay muchos registros, resume y crea tablas de resumen. El detalle completo debe ir en tables o files, no en answer.
- Devuelve SIEMPRE JSON válido. No uses markdown fuera de los campos de texto. No cortes strings. Si no puedes generar todo, prioriza resumen + tablas cortas + aviso.
- Si el usuario cita eventos concretos entre comillas o por título, filtra la respuesta a esos eventos exactos. No mezcles otros eventos aunque aparezcan en el contexto.
- Si el usuario pide "todos los eventos", entonces sí puedes usar todos los eventos del contexto.
- Si el usuario menciona varios módulos o conceptos, responde a todos: por ejemplo DONACIONES, COMPRAS, COLABORADORES/INGRESOS, TICKETS y DOCUMENTOS deben aparecer todos si los pidió.
- Si el usuario pide comparativa, crea una tabla comparativa por evento y por módulo solicitado. No te quedes solo con el primer módulo.
- Si pide agrupar, totalizar, calcular, ordenar, resumir o graficar, hazlo sobre TODOS los registros entregados del módulo correspondiente, no sobre una muestra.
- Si el usuario pide una gráfica, devuelve al menos un objeto en charts. No digas que has pintado una gráfica si charts está vacío.
- Tipos de gráfica disponibles: bar, horizontalBar, pie, donut, line y stackedBar. Para comparativas entre eventos usa bar/stackedBar. Para repartos por tipo usa pie/donut. Para rankings largos usa horizontalBar.
- Para stackedBar rellena labels con las categorías y series con [{name, values}].
- Para DONACIONES, suma el campo Valor. Para COMPRAS, suma Importe. Para INGRESOS, el total por línea es Importe obligatorio + Importe voluntario.
- Para “producto/artículo más utilizado comprado/donado”, mide por Unidades, separando Comprado y Donado si el usuario lo pide.
- Para listados, usa todos los registros relevantes. Puedes resumir en la respuesta principal, pero aporta una tabla o fichero si procede.
- No generes SQL. No expliques claves internas. No propongas cambios en base de datos.
- Si detectas que el contexto no contiene un módulo necesario para responder, dilo claramente en warnings.
- Responde siempre en español.

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
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return s;
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
  // y pasar esos datos ya fiables a Gemini junto con el prompt original.
  // No se debe cortar con el listado directo, porque perdería agrupaciones, totalizaciones,
  // cálculos, comparativas, gráficos o formatos pedidos por el usuario.
  return /\b(agrupa|agrupar|agrupado|agrupados|agrupacion|agrupación|totaliza|totalizar|totalizado|subtotal|subtotales|suma|sumar|sumatorio|calcula|calcular|calculo|cálculo|media|promedio|porcentaje|porcentajes|ratio|ranking|ordena|ordenar|filtra|filtrar|resume|resumen|resumir|analiza|analisis|análisis|compara|comparar|comparativa|evolucion|evolución|tendencia|grafica|gráfica|grafico|gráfico|diagrama|tabla dinamica|tabla dinámica|desglose|desglosa|desglosar)\b/.test(p);
}
function isListExtractionPrompt(prompt) {
  const p = norm(prompt);
  if (isTransformAnalysisPrompt(prompt)) return false;
  return /\b(lista|listado|relacion|relación|detalle|detallame|detalla|dame|muestra|muéstrame|ensena|enseña|ver|cuales|cuáles|todos|todas)\b/.test(p);
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
  if (/\bevento|eventos|fecha|estado|situacion|situación\b/.test(p) && Array.isArray(mods.EVENTOS)) priority.push('EVENTOS');
  if (/\bproducto|productos|catalogo|catálogo\b/.test(p) && Array.isArray(mods.PRODUCTOS)) priority.push('PRODUCTOS');
  if (/\btienda|tiendas\b/.test(p) && Array.isArray(mods.TIENDAS) && !priority.includes('COMPRAS')) priority.push('TIENDAS');
  if (/\bpersona|personas|responsable|responsables\b/.test(p) && Array.isArray(mods.PERSONAS) && !priority.includes('INGRESOS')) priority.push('PERSONAS');
  if (!priority.length) return null;
  const moduleName = priority[0];
  const rows = arr(mods[moduleName]);
  const columns = orderedColumnsForModule(moduleName, rows);
  const eventos = arr(context.eventosObjetivo).map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.EVENTO || e?.Evento)).filter(Boolean).join(', ');
  const filename = fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_v17_prod.csv`);
  const tableLimit = 1000;
  const tableRows = rows.slice(0, tableLimit).map(row => columns.map(c => {
    const v = row?.[c];
    if (c === 'Líneas contables' && Array.isArray(v)) return v.map(x => `${x.Producto || ''} ${x.Unidades || ''} x ${x.Precio || ''} = ${x.Importe || ''}`).join(' | ');
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : text(v);
  }));
  const extra = rows.length > tableRows.length ? ` Se muestran ${tableRows.length} en pantalla; el CSV descargable incluye las ${rows.length}.` : '';
  rowsOut = planApplyFinalDefaultsHf14(rowsOut, form, state);
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
    ['Motor de cálculo', 'ControlEvent local, sin Gemini para sumas/agrupaciones']
  ];
}

function directAggregateResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  // Diagnóstico fiable: detección amplia, sin depender de que Gemini interprete el prompt.
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
      { filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_agrupado_v17_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(groupedCsvColumns, groupedCsvRows) },
      { filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_detalle_v17_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(detailColumns, rows) }
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
    ['Motor de cálculo', 'ControlEvent local, sin Gemini para selección de eventos ni sumas']
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
    files: [{ filename: fileSafe(`Comparativa_eventos_v17_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }],
    provider: 'control-event-local-comparativa-estricta',
    model: 'sin-gemini-para-alcance-ni-calculos'
  };
}


function firstIntInPrompt(prompt, fallback = 25) {
  const m = text(prompt).match(/\b(\d{1,4})\b/);
  const n = m ? Number(m[1]) : fallback;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 1000) : fallback;
}
function eventNamesFromContext(context) {
  return arr(context?.eventosObjetivo).map(e => trim(e?.['Titulo del evento'] || e?.Titulo || e?.Evento || e?.EVENTO)).filter(Boolean);
}
function normEq(a, b) { return norm(a) === norm(b); }
function nameMatches(value, needle) {
  const v = norm(value), n = norm(needle);
  return !!v && !!n && (v === n || v.includes(n) || n.includes(v));
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
  return { ok:true, rejected:false, title:'Precio de eventos', answer:`ControlEvent ha revisado ${rows.length} evento(s) y ha calculado localmente el más barato y el más costoso.`, warnings, charts:[{title:'Precio de eventos extremos', type:'bar', labels:['Más barato','Más costoso'], values:[round(barato?.Precio,2), round(caro?.Precio,2)], unit:'€'}], tables:[{title:'Evento más barato y más costoso', columns, rows: tableRows}], files:[{filename:fileSafe('EVENTOS_precios_extremos_v17_prod.csv'), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, tableRows.map(r=>Object.fromEntries(columns.map((c,i)=>[c,r[i]]))))}], provider:'control-event-local-eventos-precios', model:'sin-gemini-para-calculos' };
}
function directPersonAppearanceIfApplicable(prompt, context) {
  const p = norm(prompt);
  if (!/\b(busca|buscar|aparece|aparecen|cuantos|cuántos|revisa)\b/.test(p) || !/\b(persona|colaborador|colaboradores|responsable|responsables|donante|donantes)\b/.test(p)) return null;
  const q = quotedNames(prompt)[0];
  const people = arr(context?.modulosExtraidos?.PERSONAS);
  const needle = q || (people.length === 1 ? people[0]?.['Nombre persona'] : '');
  if (!needle) return null;
  const ingresos = arr(context?.modulosExtraidos?.INGRESOS).filter(r => nameMatches(r?.Nombre, needle));
  const comprasResp = arr(context?.modulosExtraidos?.COMPRAS).filter(r => nameMatches(r?.Responsable, needle));
  const donResp = arr(context?.modulosExtraidos?.DONACIONES).filter(r => nameMatches(r?.Responsable, needle));
  const donDonante = /\bdonante|donantes\b/.test(p) ? arr(context?.modulosExtraidos?.DONACIONES).filter(r => nameMatches(r?.Donante, needle)) : [];
  const events = new Map();
  function touch(evento){ const e=trim(evento)||'Sin evento'; if(!events.has(e)) events.set(e,{Evento:e, Colaborador:0,'Responsable compras':0,'Responsable donaciones':0,'Donante donaciones':0}); return events.get(e); }
  ingresos.forEach(r=>touch(r.Evento).Colaborador += 1);
  comprasResp.forEach(r=>touch(r.Evento)['Responsable compras'] += 1);
  donResp.forEach(r=>touch(r.Evento)['Responsable donaciones'] += 1);
  donDonante.forEach(r=>touch(r.Evento)['Donante donaciones'] += 1);
  const rows = [...events.values()].sort((a,b)=>String(a.Evento).localeCompare(String(b.Evento),'es'));
  const columns = ['Evento','Colaborador','Responsable compras','Responsable donaciones','Donante donaciones'];
  return { ok:true, rejected:false, title:`Apariciones de ${needle}`, answer:`ControlEvent ha buscado a “${needle}” en todos los módulos disponibles: colaboradores/ingresos, responsables de compras y responsables de donaciones${/\bdonante|donantes\b/.test(p)?', y donantes de donaciones':''}. Aparece en ${rows.length} evento(s).`, warnings:[], charts:[{title:`Eventos donde aparece ${needle}`, type:'bar', labels:rows.map(r=>r.Evento), values:rows.map(r=>r.Colaborador+r['Responsable compras']+r['Responsable donaciones']+r['Donante donaciones']), unit:'apariciones'}], tables:[{title:`Apariciones de ${needle} por evento`, columns, rows: rows.map(r=>columns.map(c=>text(r[c])))}], files:[{filename:fileSafe(`Apariciones_${needle}_v17_prod.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}], provider:'control-event-local-busqueda-persona', model:'sin-gemini-para-busquedas' };
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
  return { ok:true, rejected:false, title:`Productos más utilizados${eventos?` - ${eventos}`:''}`, answer:`ControlEvent ha unido COMPRAS y DONACIONES y ha calculado localmente el producto más utilizado por unidades, separando Comprado y Donado.`, warnings:[], charts:[{title:'Top productos por unidades compradas + donadas', type:'bar', labels:shown.slice(0,30).map(r=>r.Producto), values:shown.slice(0,30).map(r=>r['Total unidades']), unit:'uds'}], tables:[{title:`Top ${shown.length} productos por unidades`, columns, rows:shown.map(r=>columns.map(c=>text(r[c])))}], files:[{filename:fileSafe(`Productos_comprado_donado_${eventos||'ControlEvent'}_v17_prod.csv`), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}], provider:'control-event-local-comprado-donado', model:'sin-gemini-para-calculos' };
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
  return { ok:true, rejected:false, title:'PRODUCTOS extraído por ControlEvent', answer:`ControlEvent ha consultado el catálogo de productos con filtros exactos y cálculo local. Registros entregados: ${rows.length}.`, warnings:[], charts: top ? [{title:`Top ${shown.length} productos por precio rfa.`, type:'bar', labels:shown.slice(0,30).map(r=>r['Nombre producto']), values:shown.slice(0,30).map(r=>round(r['Precio rfa.'],2)), unit:'€'}] : [], tables, files:[{filename:fileSafe('PRODUCTOS_catalogo_v17_prod.csv'), mime:'text/csv;charset=utf-8', content: csvFromRows(columns, rows)}], provider:'control-event-local-productos', model:'sin-gemini-para-catalogos' };
}
function directPersonsCatalogIfApplicable(prompt, context) {
  const p = norm(prompt); const rows=arr(context?.modulosExtraidos?.PERSONAS);
  if (!rows.length || !/\b(persona|personas)\b/.test(p)) return null;
  if (!/\b(agrupa|agrupad|rango|lista|completa|tabla)\b/.test(p)) return null;
  const groups = new Map(); rows.forEach(r=>{ const k=trim(r.Rango)||'Sin rango'; groups.set(k,(groups.get(k)||0)+1); });
  const gcols=['Rango','Personas']; const grows=[...groups.entries()].sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'es')).map(([k,v])=>[k,String(v)]);
  const cols=['Nombre persona','Rango'];
  return {ok:true,rejected:false,title:'PERSONAS por rango',answer:`ControlEvent ha consultado la tabla PERSONAS completa y ha agrupado localmente por Rango. Registros: ${rows.length}.`,warnings:[],charts:[{title:'Personas por rango',type:'bar',labels:grows.map(r=>r[0]),values:grows.map(r=>num(r[1])),unit:'personas'}],tables:[{title:'Resumen por Rango',columns:gcols,rows:grows},{title:`PERSONAS (${rows.length})`,columns:cols,rows:rows.map(r=>cols.map(c=>text(r[c])))}],files:[{filename:fileSafe('PERSONAS_por_rango_v17_prod.csv'),mime:'text/csv;charset=utf-8',content:csvFromRows(cols,rows)}],provider:'control-event-local-personas',model:'sin-gemini-para-catalogos'};
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
  return {ok:true,rejected:false,title,answer:`ControlEvent ha comparado estrictamente ${moduleName} entre los eventos citados. No se han mezclado otros eventos.`,warnings:[],charts:[{title,type:'bar',labels:out.map(r=>r.Evento),values:out.map(r=>r.Total),unit:'€'}],tables:[{title,columns:cols,rows:out.map(r=>cols.map(c=>text(r[c])))}],files:[{filename:fileSafe(`${moduleName}_comparativa_eventos_v17_prod.csv`),mime:'text/csv;charset=utf-8',content:csvFromRows(cols,out)}],provider:'control-event-local-comparativa-modulo',model:'sin-gemini-para-calculos'};
}
function directDeterministicResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
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
  if (!isModuleDataPrompt(prompt)) return null;
  const mods = context.modulosExtraidos || {};
  const first = Object.keys(mods).find(k => Array.isArray(mods[k]));
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
    ['Motor', 'ControlEvent local, diagnóstico de módulos']
  ];
  return {
    ok: true,
    rejected: false,
    title: `${first} extraído por ControlEvent`,
    answer: `ControlEvent ha extraído ${rows.length} registro(s) del módulo ${first}${eventos ? ` para ${eventos}` : ''}. En esta fase de diagnóstico no se usa Gemini para transformar los datos; se prioriza comprobar que el módulo devuelve los registros correctos y legibles.`,
    warnings: arr(context.advertencias),
    charts: [],
    tables: [
      { title: 'Auditoría de extracción', columns: ['Dato','Valor'], rows: auditRows },
      ...(rows.length ? [{ title: `${first} (${rows.length} registro(s))`, columns, rows: tableRows }] : [])
    ],
    files: rows.length ? [{ filename: fileSafe(`${first}_${eventos || 'ControlEvent'}_diagnostico_v17_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }] : [],
    provider: 'control-event-local-deterministico',
    model: 'diagnostico-modulos-sin-gemini'
  };
}

function directGraphResultIfApplicable(prompt, context) {
  if (!context || context.needsClarification) return null;
  const p = norm(prompt);
  if (!/\b(grafica|gráfica|grafico|gráfico|diagrama|barras|tarta)\b/.test(p)) return null;
  const mods = context.modulosExtraidos || {};
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
    files: [{ filename: fileSafe(`${moduleName}_${eventos || 'ControlEvent'}_grafica_v17_prod.csv`), mime: 'text/csv;charset=utf-8', content: csvFromRows(columns, rows) }],
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
    title: trim(out.title || 'Respuesta Gemini del evento'),
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
function isRetryable(err) { return /400|404|model|not supported|429|quota|RESOURCE_EXHAUSTED|rate|unavailable|503|INVALID_ARGUMENT/i.test(text(err?.message || '')); }

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
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) });
      const payload = await res.json().catch(async () => ({ error: { message: await res.text().catch(() => res.statusText) } }));
      if (!res.ok) {
        const e = new Error(payload?.error?.message || `Gemini HTTP ${res.status}`);
        e.status = Number(res.status || 502);
        e.details = payload;
        throw e;
      }
      const outText = trim(geminiOutText(payload));
      if (!outText) throw new Error('Gemini no devolvió texto analizable.');
      let parsed;
      try { parsed = JSON.parse(stripJsonText(outText)); }
      catch (e) {
        // v11_3_3 hotfix: nunca mostrar al usuario una respuesta cruda/rota de Gemini.
        // Si Gemini no respeta el JSON, se entrega una salida estructurada de ControlEvent
        // con los datos canónicos y una advertencia.
        const fallback = directDeterministicResultIfApplicable(prompt, context) || directGraphResultIfApplicable(prompt, context) || directModuleResultIfApplicable(prompt, context);
        if (fallback) {
          fallback.warnings = arr(fallback.warnings).concat('Gemini no devolvió JSON estructurado válido; se ha usado una salida estructurada de ControlEvent para no mostrar datos crudos ni desformateados.');
          fallback.provider = `${fallback.provider || 'control-event'}-json-fallback`;
          fallback.model = 'formato-local-por-json-invalido';
          return fallback;
        }
        return {
          ok: true,
          rejected: false,
          title: 'Respuesta de Zuzu no estructurada',
          answer: 'Gemini no devolvió un JSON válido. ControlEvent ha evitado mostrar la respuesta cruda para no entregar una pantalla ilegible. Repite la consulta de forma algo más concreta o revisa la cuota/modelo de Gemini.',
          warnings: ['Gemini no devolvió JSON estructurado válido y no hubo una salida local aplicable.'],
          charts: [],
          tables: [],
          files: [{ filename: fileSafe('Zuzu_respuesta_gemini_no_estructurada_v17_prod.txt'), mime: 'text/plain;charset=utf-8', content: outText.slice(0, 250000) }],
          provider: 'gemini-rest-json-fallback',
          model
        };
      }
      return normalizeResult(parsed, model);
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) break;
    }
  }
  lastError.status = lastError.status || 502;
  throw lastError;
}

function plannerSchema() {
  return {
    type: 'OBJECT',
    properties: {
      ok: { type: 'BOOLEAN' },
      needsClarification: { type: 'BOOLEAN' },
      clarification: { type: 'STRING' },
      modules: { type: 'ARRAY', items: { type: 'STRING' } },
      eventos: { type: 'ARRAY', items: { type: 'STRING' } },
      todosLosEventos: { type: 'BOOLEAN' },
      filters: {
        type: 'OBJECT',
        properties: {
          personas: { type: 'ARRAY', items: { type: 'STRING' } },
          productos: { type: 'ARRAY', items: { type: 'STRING' } },
          tiendas: { type: 'ARRAY', items: { type: 'STRING' } },
          responsables: { type: 'ARRAY', items: { type: 'STRING' } },
          donantes: { type: 'ARRAY', items: { type: 'STRING' } },
          tickets: { type: 'ARRAY', items: { type: 'STRING' } }
        }
      },
      reasoning: { type: 'STRING' }
    },
    required: ['ok','needsClarification','clarification','modules','eventos','todosLosEventos','filters','reasoning']
  };
}
function plannerPrompt(userPrompt, catalog) {
  const ctx = JSON.stringify(catalog).slice(0, 95000);
  return `Eres el planificador seguro de Zuzu para ControlEvent. Tu única tarea es decidir qué módulos de extracción debe usar ControlEvent para responder bien al usuario. NO respondas la pregunta final.

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
- Si el prompt menciona explícitamente un módulo o uno de sus sinónimos, inclúyelo.
- Si el prompt pide una comparativa con varios conceptos, incluye TODOS esos módulos, no solo el primero.
- Si pide "colaboradores", "asistentes", "justificantes de ingreso" o "recaudación", incluye INGRESOS.
- Si pide "comprado/donado" o "separa comprado y donado", incluye COMPRAS y DONACIONES.
- Si pide "tickets", incluye TICKETS y, si pide importes o líneas, también COMPRAS.
- Si pide "documentos adjuntos", incluye DOCUMENTOS y EVENTOS.
- Si cita eventos entre comillas, pon sus títulos en eventos exactamente como aparecen en el prompt o como mejor coincidan con el catálogo.
- Si dice "todos los eventos", "eventos registrados" o "entre todos los eventos", todosLosEventos=true.
- De momento NO propongas filtros de persona, producto, tienda, responsable, donante, segmento ni destino. ControlEvent traerá todos los registros de cada módulo y la respuesta final se filtrará en la segunda llamada a Gemini usando el prompt original.
- needsClarification=true solo si no puedes identificar ningún módulo útil. No pidas concreción por volumen.
- Devuelve SOLO JSON con el esquema.

CATÁLOGO CONTROL EVENT:
${ctx}

PROMPT DEL USUARIO:
${trim(userPrompt).slice(0, 2500)}`;
}
async function callGeminiPlanner(userPrompt, catalog) {
  const apiKey = geminiKey();
  if (!apiKey) throw new Error('Sin GEMINI_API_KEY para planificador.');
  let lastError = null;
  for (const model of configuredGeminiModels()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = {
      contents: [{ role: 'user', parts: [{ text: plannerPrompt(userPrompt, catalog) }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: plannerSchema(), temperature: 0.05 }
    };
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) });
      const payload = await res.json().catch(async () => ({ error: { message: await res.text().catch(() => res.statusText) } }));
      if (!res.ok) throw new Error(payload?.error?.message || `Gemini planner HTTP ${res.status}`);
      const outText = trim(geminiOutText(payload));
      if (!outText) throw new Error('Planificador no devolvió texto.');
      return JSON.parse(stripJsonText(outText));
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) break;
    }
  }
  throw lastError || new Error('Planificador Gemini no disponible.');
}
async function buildZuzuPlan(userPrompt, state, selectedEventId) {
  const local = buildZuzuLocalPlan(state, selectedEventId, userPrompt);
  try {
    const catalog = buildZuzuPlanningCatalog(state, selectedEventId);
    const ai = await callGeminiPlanner(userPrompt, catalog);
    const modules = [...new Set([].concat(arr(ai?.modules || ai?.modulos), arr(local.modules)).map(x => trim(x).toUpperCase()).filter(Boolean))];
    return {
      ...ai,
      ok: ai?.ok !== false,
      needsClarification: ai?.needsClarification === true && !modules.length,
      modules: modules.length ? modules : local.modules,
      eventos: arr(ai?.eventos).length ? arr(ai.eventos) : arr(local.eventos),
      todosLosEventos: ai?.todosLosEventos === true || local.todosLosEventos === true,
      filters: {},
      reasoning: trim(ai?.reasoning || '') || 'Planificador Gemini: módulos deducidos desde el prompt. ControlEvent extrae todos los registros de esos módulos sin filtros de reducción.',
      __zuzuPlannerProvider: 'gemini-planner',
      __zuzuGeminiAllRows: true
    };
  } catch (error) {
    return {
      ...local,
      filters: {},
      reasoning: `${local.reasoning || 'Plan local de respaldo.'} Aviso: el planificador Gemini no respondió (${trim(error?.message || error)}).`,
      __zuzuPlannerProvider: 'local-fallback',
      __zuzuGeminiAllRows: true,
      plannerWarning: trim(error?.message || error)
    };
  }
}

export async function analyzeEventPrompt({ prompt, selectedEventId, stateOverride } = {}) {
  const userPrompt = trim(prompt);
  if (!userPrompt) {
    const err = new Error('Escribe una pregunta o petición para Gemini.');
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
  // 1) planificación de módulos, 2) extracción oficial por ControlEvent, 3) respuesta final con Gemini.
  // Las respuestas locales quedan solo como respaldo si Gemini falla.
  if (context?.needsClarification) {
    return {
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
    };
  }

  try {
    return await callGeminiEvent(userPrompt, context);
  } catch (error) {
    const fallback = directDeterministicResultIfApplicable(userPrompt, context) || directGraphResultIfApplicable(userPrompt, context);
    if (fallback) {
      fallback.warnings = arr(fallback.warnings).concat(`Gemini no pudo completar la respuesta final: ${trim(error?.message || error)}. Se muestra respaldo local de ControlEvent.`);
      fallback.provider = `${fallback.provider || 'control-event'}-fallback`;
      fallback.model = 'sin-gemini-por-error';
      return fallback;
    }
    throw error;
  }
}


// v17_prod - Planificación inicial asistida por Zuzu.
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
  const aliasMatches = Array.from(maps.products.values()).filter(p => aliasKey(p?.nombre || '') === wantedAlias);
  if (aliasMatches.length === 1) return aliasMatches[0];
  if (aliasMatches.length > 1) return aliasMatches.sort((a,b)=>String(a?.nombre||'').length-String(b?.nombre||'').length)[0];

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
  // ControlEvent ya no elimina paella/barbacoa propuestas por Gemini: solo se evita el menú local fijo saltándose este filtro.
  return { rows: arr(rows).slice(), notes: [] };
}


function planBudgetGuard(rows, form) {
  const people = Math.max(1, num(form?.personas) || 25);
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

function planReadableNotes(rawNotes, rows, form, budgetNotes) {
  const people = Math.max(1, num(form?.personas) || 25);
  const days = Math.max(1, num(form?.dias) || 1);
  const total = planCompraTotal(rows);
  const per = total / people;
  const title = trim(form?.title) || 'evento nuevo';
  const useful = arr(rawNotes)
    .map(n => trim(n))
    .filter(Boolean)
    // Evita mezclar mensajes de Gemini sobre costes anteriores con el coste final postprocesado.
    .filter(n => !/(coste|persona|25|35|sobredimensionad|reajust|control de realidad|precio orientativo|dentro del rango)/i.test(n))
    .slice(0, 2);
  const donCount = arr(rows).filter(r => r?.tipo === 'DONACION' && r.include !== false).length;
  const donUnits = arr(rows).filter(r => r?.tipo === 'DONACION' && r.include !== false).reduce((sum, r) => sum + num(r.unidades), 0);
  const base = `Resumen claro: Zuzu ha preparado una propuesta revisable para “${title}” (${people} personas, ${days} día${days === 1 ? '' : 's'}). Compra prevista final: ${round(total,2)} € (${round(per,2)} €/persona). Donaciones/existencias detectadas: ${donCount} líneas / ${round(donUnits,2)} ud.; solo se descuentan si están confirmadas por el prompt o por histórico real.`;
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
  const info = trim(form?.info || '');
  if (!info) return [];
  const maps = planBuildMaps(state);
  const rowsOut = [];
  function addRows(block, defaults) {
    const donorLabel = defaults.donor || defaults.store || 'Sin donante';
    const responsableLabel = defaults.responsable || donorLabel;
    const storeLabel = defaults.store || donorLabel;
    const donorRef = planRefFromLooseLabel(donorLabel, maps, defaults.preferredDonorKind || 'P') || planRefFromLooseLabel(storeLabel, maps, 'T') || trim(donorLabel);
    const resp = planFindPersonLoose(responsableLabel, maps);
    const store = planFindStoreLoose(storeLabel, maps);
    for (const itemRaw of planExplicitItemLines(block)) {
      let item = itemRaw;
      let lineDonorLabel = donorLabel;
      let lineRespLabel = responsableLabel;
      let lineStoreLabel = storeLabel;
      let lineTicket = defaults.ticketDonacion || 'DONADO SOCIO';
      const donorPrefix = trim(itemRaw).match(/^([^:\n]{2,90})\s*:\s*([^:\n]{2,160}:\s*\d+(?:[,.]\d+)?\b.*)$/i);
      if (donorPrefix) {
        const prefix = trim(donorPrefix[1]);
        const mentionedStore = planFindStoreLoose(prefix, maps);
        const mentionedPerson = planFindPersonLoose(prefix, maps);
        if (mentionedStore?.id || mentionedPerson?.id || /pe[nñ]a|despensa|tienda|almacen|almac[eé]n/i.test(prefix)) {
          item = donorPrefix[2];
          if (mentionedStore?.id || /tienda|despensa/i.test(prefix)) {
            lineTicket = 'DONADO TIENDA';
            lineStoreLabel = mentionedStore?.nombre || prefix;
            lineDonorLabel = mentionedStore?.nombre || prefix;
            lineRespLabel = trim(form.defaultResponsibleName || responsableLabel || '');
          } else {
            lineTicket = 'DONADO SOCIO';
            lineDonorLabel = mentionedPerson?.nombre || prefix;
            lineRespLabel = mentionedPerson?.nombre || prefix;
          }
        }
      }
      const productoTexto = planCleanExplicitProductText(item);
      const prod = planFindProductLoose(productoTexto, maps);
      if (!prod?.id) continue;
      const unidades = Math.max(0.01, planExplicitUnits(item));
      const rowDonorRef = planRefFromLooseLabel(lineDonorLabel, maps, lineTicket === 'DONADO TIENDA' ? 'T' : 'P') || planRefFromLooseLabel(lineStoreLabel, maps, 'T') || trim(lineDonorLabel);
      const rowResp = planFindPersonLoose(lineRespLabel, maps);
      const rowStore = planFindStoreLoose(lineStoreLabel, maps);
      rowsOut.push({
        key:`prompt-don:${rowsOut.length}:${prod.id}`,
        include:true,
        tipo:'DONACION',
        productId:trim(prod.id),
        productName:trim(prod.nombre || productoTexto),
        segmento:trim(prod.segmento || 'Sin segmento'),
        destino:trim(prod.destino || 'Sin destino'),
        unidades:round(unidades, 2),
        precio:planReasonablePlanPrice(prod.nombre || productoTexto, prod.defaultPrecio ?? prod.precio ?? 0),
        tiendaId:trim(rowStore?.id || store?.id || form.defaultStoreId || ''),
        responsableId:trim(rowResp?.id || resp?.id || form.defaultResponsibleId || ''),
        ticketDonacion:lineTicket,
        donorRef:rowDonorRef,
        confidence:'Prompt explícito',
        explicitPromptDonation:true,
        explicitConfirmedDonation:true,
        explicitPromptStrictHf12: defaults.strictHf12 === true,
        reason:`Existencia/donación indicada literalmente por el usuario (${lineDonorLabel}).`
      });
    }
  }
  for (const section of planExplicitDonationSections(info)) {
    const header = section.header;
    const headBlock = header + '\n' + section.block.split(/\n/).slice(0, 8).join('\n');
    const mentionedStore = planMentionedStore(headBlock, maps);
    const mentionedPerson = planMentionedPerson(headBlock, maps);
    const rawDonor = planExtractBracket(headBlock, ['Donante']) || planExtractBracket(headBlock, ['Dona', 'De']) || (mentionedPerson?.nombre || '') || (/PE[NÑ]A/i.test(headBlock) ? 'Peña El Arrastre' : 'Donante indicado');
    const rawStore = planExtractBracket(headBlock, ['Tienda']) || mentionedStore?.nombre || '';
    addRows(section.block, {
      ticketDonacion:section.ticketDonacion,
      donor:section.ticketDonacion === 'DONADO TIENDA' ? (rawStore || rawDonor) : rawDonor,
      store:section.ticketDonacion === 'DONADO TIENDA' ? (rawStore || rawDonor) : '',
      responsable:planExtractBracket(headBlock, ['Responsable']) || mentionedPerson?.nombre || trim(form.defaultResponsibleName || ''),
      preferredDonorKind:section.ticketDonacion === 'DONADO TIENDA' ? 'T' : 'P'
    });
  }
  const existBlock = planBlockBetween(info, /EXISTENCIAS\s+QUE\s+YA\s+TENEMOS\s*:?/i, [/DONACIONES\s+PREVISTAS\s*:?/i, /CRITERIO\s+DE\s+C[ÁA]LCULO\s*:?/i, /RESULTADO\s+QUE\s+QUIERO\s*:?/i]);
  if (existBlock) {
    const header = existBlock.split(/\n/).slice(0, 5).join('\n');
    addRows(existBlock, {
      ticketDonacion:/DONADO\s+TIENDA/i.test(header) ? 'DONADO TIENDA' : (/DONADO\s+OTROS/i.test(header) ? 'DONADO OTROS' : 'DONADO SOCIO'),
      donor:planExtractBracket(header, ['Donante']) || planExtractBracket(header, ['de', 'socio']) || 'Peña El Arrastre',
      store:planExtractBracket(header, ['Tienda']) || 'PEÑA EL ARRASTRE',
      responsable:planExtractBracket(header, ['responsable', 'Responsable']) || trim(form.defaultResponsibleName || ''),
      preferredDonorKind:'P'
    });
  }
  const donatedBlock = planBlockBetween(info, /DONACIONES\s+PREVISTAS\s*:?/i, [/CRITERIO\s+DE\s+C[ÁA]LCULO\s*:?/i, /RESULTADO\s+QUE\s+QUIERO\s*:?/i]);
  if (donatedBlock) {
    const header = donatedBlock.split(/\n/).slice(0, 12).join('\n');
    addRows(donatedBlock, {
      ticketDonacion:/DONADO\s+TIENDA/i.test(header) ? 'DONADO TIENDA' : (/DONADO\s+OTROS/i.test(header) ? 'DONADO OTROS' : 'DONADO SOCIO'),
      donor:planExtractBracket(header, ['Donante']) || planExtractBracket(header, ['DE']) || 'Donante previsto',
      store:planExtractBracket(header, ['Tienda']) || '',
      responsable:planExtractBracket(header, ['Responsable']) || planExtractBracket(header, ['Donante']) || trim(form.defaultResponsibleName || ''),
      preferredDonorKind:'P'
    });
  }
  // Lectura conservadora de líneas tipo "Anchoas: 1" o "Rollo papel secamanos: 1" cuando están
  // dentro de un bloque o contexto de donaciones/existencias. Esto evita convertir en COMPRA
  // una donación explícita del prompt aunque la línea no lleve la palabra "donado".
  const infoLines = info.replace(/\r/g, '').split(/\n/);
  infoLines.forEach((line, i) => {
    const s = trim(line);
    if (!s || !/\d/.test(s) || !planExplicitItemLines(s).length) return;
    if (/^\s*[•\-]?\s*(COMPRA|COMPRAS|A\s+COMPRAR)\s*:/i.test(s)) return;
    const before = infoLines.slice(Math.max(0, i - 6), i + 1).join('\n');
    const after = infoLines.slice(i, Math.min(infoLines.length, i + 2)).join('\n');
    const ctx = before + '\n' + after;
    if (/\b(sin|no)\s+(donaci[oó]n|donaciones|donado|donada|existencias?)\b/i.test(ctx)) return;
    const isDonationCtx = /(donaci[oó]n|donaciones|donado|donada|donados|donadas|existencias?|ya\s+tenemos|producto\s+en\s+la\s+pe[nñ]a|productos?\s+donados?|material\s+donado|donante|dona|aporta|cedido|regalado)/i.test(ctx);
    if (!isDonationCtx) return;
    const lastCompra = Math.max(before.toUpperCase().lastIndexOf('COMPRA:'), before.toUpperCase().lastIndexOf('COMPRAS:'), before.toUpperCase().lastIndexOf('A COMPRAR'));
    const lastDona = Math.max(before.toUpperCase().lastIndexOf('DONACION'), before.toUpperCase().lastIndexOf('DONACIONES'), before.toUpperCase().lastIndexOf('DONADO'), before.toUpperCase().lastIndexOf('EXISTENCIAS'), before.toUpperCase().lastIndexOf('PRODUCTO EN LA PE'));
    if (lastCompra > lastDona && !/(donad|donaci[oó]n|existenc|dona|aporta)/i.test(s)) return;
    const mentionedStore = planMentionedStore(ctx, maps);
    const mentionedPerson = planMentionedPerson(ctx, maps);
    const isStoreDonation = /DONADO\s+TIENDA|tienda|despensa/i.test(ctx) && !!mentionedStore;
    addRows(s, {
      ticketDonacion: isStoreDonation ? 'DONADO TIENDA' : 'DONADO SOCIO',
      donor: isStoreDonation ? (mentionedStore?.nombre || 'Tienda donante') : (mentionedPerson?.nombre || (/PE[NÑ]A/i.test(ctx) ? 'Peña El Arrastre' : 'Donante indicado')),
      store: isStoreDonation ? (mentionedStore?.nombre || '') : '',
      responsable: planExtractBracket(ctx, ['Responsable']) || mentionedPerson?.nombre || trim(form.defaultResponsibleName || ''),
      preferredDonorKind: isStoreDonation ? 'T' : 'P'
    });
  });

  info.split(/\n+/).forEach(line => {
    const s = trim(line);
    if (!s || !/\d/.test(s) || !/(dona|donar|donad|aport|regala|cede|existenc)/i.test(s)) return;
    let m = s.match(/^\s*(?:[•\-]\s*)?(.{2,80}?)\s+(?:dona|donar[áa]?|aporta|regala|cede)\s+(.+)$/i);
    if (m) {
      addRows('- ' + trim(m[2]), { ticketDonacion:'DONADO SOCIO', donor:trim(m[1]), responsable:trim(m[1]) || trim(form.defaultResponsibleName || ''), preferredDonorKind:'P' });
      return;
    }
    m = s.match(/^\s*(?:[•\-]\s*)?(.+?)\s+(?:donad[oa]s?|aportad[oa]s?|cedid[oa]s?)\s+(?:por|de)\s+(.+)$/i);
    if (m) addRows('- ' + trim(m[1]), { ticketDonacion:'DONADO SOCIO', donor:trim(m[2]), responsable:trim(m[2]) || trim(form.defaultResponsibleName || ''), preferredDonorKind:'P' });
  });

  // HOTFIX12: lectura estricta de bloques simples de donaciones:
  // Donaciones:
  // Pocholo y Celes:
  // - Cerveza AMSTEL (Barril 30l): 1
  // DESPENSA:
  // - Cerveza CON SKOL (Lata 33cl): 24
  // En este formato cada cabecera intermedia manda sobre las líneas siguientes.
  (function parseSimpleDonationBlockHf12(){
    const lines = info.replace(/\r/g, '').split(/\n/);
    let inDonBlock = false;
    let currentDonor = '';
    let currentKind = 'P';
    const stopRe = /^\s*(?:COMPRA|COMPRAS|A\s+COMPRAR|CRITERIO|RESULTADO|OBJETIVO|MEN[ÚU]|MENU|COMIDAS?|BEBIDAS?)\s*:/i;
    lines.forEach(rawLine => {
      const line = trim(rawLine);
      if(!line) return;
      if(/^\s*DONACIONES?\s*:/i.test(line)){ inDonBlock = true; currentDonor = ''; currentKind = 'P'; return; }
      if(!inDonBlock) return;
      if(stopRe.test(line)){ inDonBlock = false; return; }
      const header = line.match(/^\s*([A-Za-zÁÉÍÓÚÜÑ0-9][^:\n]{1,80})\s*:\s*$/);
      if(header){
        const label = trim(header[1]);
        if(!/^(donaciones?|productos?|compras?|responsable|donante|tienda)$/i.test(label)){
          const store = planFindStoreLoose(label, maps);
          const person = planFindPersonLoose(label, maps);
          currentDonor = trim(store?.nombre || person?.nombre || label);
          currentKind = (store?.id || /^(DESPENSA|TIENDA|SUPERMERCADO|ALMAC[EÉ]N)$/i.test(label)) ? 'T' : 'P';
        }
        return;
      }
      if(!currentDonor) return;
      if(!/^\s*[-•*]/.test(line) && !/^[^:\n]{2,160}:\s*(?:\d|un|una|uno)\b/i.test(line)) return;
      const donorIsStore = currentKind === 'T';
      addRows(line, {
        ticketDonacion: donorIsStore ? 'DONADO TIENDA' : 'DONADO SOCIO',
        donor: currentDonor,
        store: donorIsStore ? currentDonor : '',
        responsable: donorIsStore ? trim(form.defaultResponsibleName || '') : currentDonor,
        preferredDonorKind: donorIsStore ? 'T' : 'P',
        strictHf12:true
      });
    });
  })();


  // HOTFIX13: parser estricto de bloques largos tipo:
  // PRODUCTO EN LA PEÑA (...) / DONACIONES: / DONACION:
  //   PRODUCTOS
  //   • Producto: cantidad
  // Respeta cantidades exactas escritas, incluidos "1 pack de 24 ud.".
  (function parseStructuredDonationBlocksHf13(){
    const lines = info.replace(/\r/g, '').split(/\n/);
    let active = null;
    const headerRe = /(PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?|DONACION|EXISTENCIAS?|YA\s+TENEMOS|PRODUCTOS?\s+DONADOS?)/i;
    const stopRe = /^\s*(?:COMPRA|COMPRAS|A\s+COMPRAR|CRITERIO|RESULTADO|OBJETIVO|DETALLES\s+PARA|COMIDAS\s+INCLUIDAS)\s*:/i;
    function sectionDefaults(header){
      const h = trim(header || '');
      const tipo = /DONADO\s+TIENDA/i.test(h) ? 'DONADO TIENDA' : (/DONADO\s+OTROS/i.test(h) ? 'DONADO OTROS' : 'DONADO SOCIO');
      const donor = planExtractBracket(h, ['Donante']) || planExtractBracket(h, ['Dona','De']) || (/PE[NÑ]A/i.test(h) ? 'Peña El Arrastre' : '');
      const resp = planExtractBracket(h, ['Responsable']) || donor || trim(form.defaultResponsibleName || '');
      const store = tipo === 'DONADO TIENDA' ? (donor || planExtractBracket(h, ['Tienda']) || '') : '';
      return { ticketDonacion:tipo, donor:donor || store || 'Donante indicado', store, responsable:resp, preferredDonorKind:tipo==='DONADO TIENDA'?'T':'P', strictHf12:true };
    }
    lines.forEach(rawLine => {
      const line = trim(rawLine);
      if(!line) return;
      if(stopRe.test(line)){ if(!/^COMPRA/i.test(line)) active = null; else active = null; return; }
      if(headerRe.test(line) && /DONADO\s+(SOCIO|TIENDA|OTROS)|Donante:|Responsable:|PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACION/i.test(line)){
        active = sectionDefaults(line);
        return;
      }
      if(active && /^PRODUCTOS?\s*$/i.test(line)) return;
      if(active && (/^\s*[•\-]/.test(line) || /^[^:\n]{2,180}:\s*.+\d/.test(line))){
        addRows(line, active);
      }
    });
  })();


  // HOTFIX16: parser directo y determinista de donaciones/existencias confirmadas.
  // Cualquier producto listado dentro de PRODUCTO EN LA PEÑA / DONACIONES / DONACION se acepta como DONACION.
  // Si no encuentra producto exacto en catálogo, conserva el nombre textual como donación revisable, pero NO lo convierte en compra.
  (function parseConfirmedPromptDonationsHf16(){
    const lines = info.replace(/\r/g, '').split(/\n/);
    let active = null;

    function kindFrom(text){
      const h = trim(text || '');
      if (/DONADO\s+TIENDA|DONACION\s+DE\s+TIENDA/i.test(h)) return 'DONADO TIENDA';
      if (/DONADO\s+OTROS|DONACION\s+DE\s+OTROS/i.test(h)) return 'DONADO OTROS';
      return 'DONADO SOCIO';
    }
    function updateMetaFromText(meta, text){
      const h = trim(text || '');
      if (!meta) meta = {};
      if (/DONADO\s+TIENDA|DONACION\s+DE\s+TIENDA/i.test(h)) meta.ticketDonacion = 'DONADO TIENDA';
      if (/DONADO\s+OTROS|DONACION\s+DE\s+OTROS/i.test(h)) meta.ticketDonacion = 'DONADO OTROS';
      if (/DONADO\s+SOCIO|DONACIONES?\s+DE\s+SOCIOS?/i.test(h)) meta.ticketDonacion = 'DONADO SOCIO';
      const donor = planExtractBracket(h, ['Donante']) || planExtractBracket(h, ['Dona']) || '';
      const resp = planExtractBracket(h, ['Responsable']) || '';
      if (donor) meta.donor = donor;
      if (resp) meta.responsable = resp;
      if (!meta.donor && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) meta.donor = 'Peña El Arrastre';
      if (!meta.responsable && /PRODUCTO\s+EN\s+LA\s+PE[NÑ]A/i.test(h)) meta.responsable = trim(form.defaultResponsibleName || 'Colty');
      if (!meta.ticketDonacion) meta.ticketDonacion = kindFrom(h);
      return meta;
    }
    function isSectionStart(line){
      return /^(?:\s*)(PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?\b|DONACION\b|DONACI[ÓO]N\b|EXISTENCIAS?\b|YA\s+TENEMOS\b)/i.test(line)
        || (/Tratar\s+como\s+DONADO\s+(?:SOCIO|TIENDA|OTROS)/i.test(line) && /\[Donante:/i.test(line));
    }
    function isHardStop(line){
      return /^(?:\s*)(PISTAS\s+DE\s+COMPRA|REGLAS\s+FINALES|COMPRA|COMPRAS|A\s+COMPRAR|OBJETIVO|DATOS\s+PARA|DESCRIPCI[ÓO]N\s+CONCEPTUAL|CRITERIOS?\s+DE|DETALLES\s+PARA|COMIDAS\s+INCLUIDAS)\s*:/i.test(line);
    }
    function looksItem(line){
      const s = trim(line || '');
      if (!s) return false;
      if (/^(PRODUCTOS?|Tratar\s+como)\b/i.test(s)) return false;
      if (/^\s*[•\-]\s*/.test(s)) return true;
      return /^[^:\n]{2,180}:\s*(?:\d|un|una|uno)/i.test(s);
    }
    function addDirect(itemRaw, meta){
      const item = trim(itemRaw).replace(/^\s*[•\-]\s*/, '');
      const productText = planCleanExplicitProductText(item);
      if (!productText || /^(PRODUCTOS?|Tratar\s+como)$/i.test(productText)) return;
      const prod = planFindProductLoose(productText, maps);
      const unidades = Math.max(0.01, planExplicitUnits(item));
      const ticket = meta.ticketDonacion || 'DONADO SOCIO';
      const donorLabel = trim(meta.donor || (ticket === 'DONADO TIENDA' ? meta.store : '') || 'Donante indicado');
      const respLabel = trim(meta.responsable || (ticket === 'DONADO TIENDA' ? form.defaultResponsibleName : donorLabel) || form.defaultResponsibleName || '');
      const storeLabel = ticket === 'DONADO TIENDA' ? donorLabel : '';
      const donorRef = planRefFromLooseLabel(donorLabel, maps, ticket === 'DONADO TIENDA' ? 'T' : 'P') || trim(donorLabel);
      const resp = planFindPersonLoose(respLabel, maps);
      const store = planFindStoreLoose(storeLabel || donorLabel, maps);
      rowsOut.push({
        key:`prompt-confirmed-hf16:${rowsOut.length}:${trim(prod?.id || productText)}`,
        include:true,
        tipo:'DONACION',
        productId:trim(prod?.id || ''),
        productName:trim(prod?.nombre || productText),
        segmento:trim(prod?.segmento || 'Sin segmento'),
        destino:trim(prod?.destino || 'Sin destino'),
        unidades:round(unidades, 2),
        precio:planReasonablePlanPrice(prod?.nombre || productText, prod?.defaultPrecio ?? prod?.precio ?? 0),
        tiendaId:trim((ticket === 'DONADO TIENDA' ? (store?.id || form.defaultStoreId || '') : (store?.id || form.defaultStoreId || ''))),
        responsableId:trim(resp?.id || (donorRef.startsWith('P:') ? donorRef.slice(2) : '') || form.defaultResponsibleId || ''),
        ticketDonacion:ticket,
        donorRef,
        confidence:'Prompt explícito confirmado',
        explicitPromptDonation:true,
        explicitConfirmedDonation:true,
        explicitPromptStrictHf12:true,
        reason:`Donación/existencia confirmada por el prompt (${donorLabel}). No requiere histórico.`
      });
    }

    lines.forEach(raw => {
      const line = trim(raw);
      if (!line) return;
      if (isHardStop(line)) { active = null; return; }
      if (isSectionStart(line)) {
        active = updateMetaFromText({}, line);
        return;
      }
      if (active && (/Tratar\s+como\s+DONADO/i.test(line) || /\[Donante:|\[Responsable:/i.test(line))) {
        active = updateMetaFromText(active, line);
        return;
      }
      if (active && /^PRODUCTOS?\s*:?\s*$/i.test(line)) return;
      if (active && looksItem(line)) addDirect(line, active);
    });
  })();


  // HOTFIX19: barrido final simple y fiable de todas las líneas de productos de bloques confirmados.
  // Es deliberadamente menos "inteligente" y más contable: si está bajo un bloque de donación,
  // cada línea con "* producto: cantidad" / "- producto: cantidad" / "• producto: cantidad" entra.
  (function parseEveryConfirmedDonationLineHf19(){
    const lines = info.replace(/\r/g, '').split(/\n/);
    let active = null;
    const stop = /^(OBJETIVO|DATOS\s+PARA|DESCRIPCI[ÓO]N|CRITERIOS?|DETALLES|COMIDAS|PISTAS\s+DE\s+COMPRA|REGLAS\s+FINALES|COMPRA|COMPRAS|A\s+COMPRAR)\s*:/i;
    const start = /^(PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?\b|DONACI[ÓO]N\b|DONACION\b|EXISTENCIAS?\b|YA\s+TENEMOS\b)/i;
    function metaFrom(line, prev){
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
    function lineQty(raw){
      const s = trim(raw || '').replace(/^\s*[•\-\*]\s*/, '');
      const tail = s.includes(':') ? s.slice(s.lastIndexOf(':') + 1) : s;
      let m = tail.match(/(\d+(?:[,.]\d+)?)\s*(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
      if (m) return Math.max(0, round(num(m[1]) * num(m[2]), 2));
      m = tail.match(/(?:pack|packs|paquete|paquetes)\s*(?:de|x)\s*(\d+(?:[,.]\d+)?)/i);
      if (m) return Math.max(0, round(num(m[1]), 2));
      m = tail.match(/(\d+(?:[,.]\d+)?)/);
      if (m) return Math.max(0, num(m[1]));
      return 1;
    }
    function lineProduct(raw){
      let s = trim(raw || '').replace(/^\s*[•\-\*]\s*/, '');
      if (!s.includes(':')) return '';
      s = s.slice(0, s.lastIndexOf(':'));
      return planCleanExplicitProductText(s);
    }
    function add(raw, meta){
      const productText = lineProduct(raw);
      if (!productText || /^(PRODUCTOS?|Tratar\s+como)$/i.test(productText)) return;
      const qty = lineQty(raw);
      const prod = planFindProductLoose(productText, maps);
      const ticket = meta.ticketDonacion || 'DONADO SOCIO';
      const donorLabel = trim(meta.donor || 'Donante indicado');
      const respLabel = trim(meta.responsable || (ticket === 'DONADO TIENDA' ? form.defaultResponsibleName : donorLabel) || form.defaultResponsibleName || '');
      const donorRef = planRefFromLooseLabel(donorLabel, maps, ticket === 'DONADO TIENDA' ? 'T' : 'P') || donorLabel;
      const resp = planFindPersonLoose(respLabel, maps);
      const store = ticket === 'DONADO TIENDA' ? planFindStoreLoose(donorLabel, maps) : null;
      rowsOut.push({
        key:`prompt-line-hf19:${rowsOut.length}:${trim(prod?.id || productText)}`,
        include:true,
        tipo:'DONACION',
        productId:trim(prod?.id || ''),
        productName:trim(prod?.nombre || productText),
        segmento:trim(prod?.segmento || 'Sin segmento'),
        destino:trim(prod?.destino || 'Sin destino'),
        unidades:round(qty, 2),
        precio:planReasonablePlanPrice(prod?.nombre || productText, prod?.defaultPrecio ?? prod?.precio ?? 0),
        tiendaId:trim(store?.id || form.defaultStoreId || ''),
        responsableId:trim(resp?.id || (donorRef.startsWith('P:') ? donorRef.slice(2) : '') || form.defaultResponsibleId || ''),
        ticketDonacion:ticket,
        donorRef,
        confidence:'Prompt confirmado línea a línea',
        explicitPromptDonation:true,
        explicitConfirmedDonation:true,
        explicitPromptStrictHf12:true,
        reason:`Donación/existencia confirmada por línea del prompt (${donorLabel}).`
      });
    }
    lines.forEach(rawLine => {
      const line = trim(rawLine);
      if (!line) return;
      if (stop.test(line)) { active = null; return; }
      if (start.test(line)) { active = metaFrom(line, {}); return; }
      if (active && (/Tratar\s+como\s+DONADO/i.test(line) || /\[Donante:|\[Responsable:/i.test(line))) { active = metaFrom(line, active); return; }
      if (active && /^PRODUCTOS?\s*:?\s*$/i.test(line)) return;
      if (active && /^\s*[•\-\*]\s*[^:\n]{2,220}:\s*(?:\d|un|una|uno|pack|paquete)/i.test(rawLine)) add(rawLine, active);
    });
  })();

  const strictProductKeysHf12 = new Set(rowsOut.filter(r => r.explicitPromptStrictHf12 === true).map(r => trim(r.productId)).filter(Boolean));
  const finalRowsHf12 = strictProductKeysHf12.size
    ? rowsOut.filter(r => !strictProductKeysHf12.has(trim(r.productId)) || r.explicitPromptStrictHf12 === true)
    : rowsOut;
  // HOTFIX19: si hay varias lecturas de la misma línea/producto/donante, manda el barrido final línea a línea.
  const best = new Map();
  finalRowsHf12.forEach((r, pos) => {
    const productKey = trim(r.productId) || planProductAliasKey(r.productName || r.producto || '') || normPlanKey(r.productName || r.producto || '');
    const k = [productKey, trim(r.donorRef), trim(r.ticketDonacion).toUpperCase()].join('|');
    const weight = String(r.key || '').includes('prompt-line-hf19') ? 10000 : (r.explicitPromptStrictHf12 ? 1000 : 0);
    const prev = best.get(k);
    if (!prev || weight + pos > prev.weight + prev.pos) best.set(k, {r, weight, pos});
  });
  const seen = new Set();
  return Array.from(best.values()).map(x => x.r).filter(r => {
    const productKey = trim(r.productId) || planProductAliasKey(r.productName || r.producto || '') || normPlanKey(r.productName || r.producto || '');
    const k = [productKey, trim(r.donorRef), trim(r.ticketDonacion).toUpperCase(), num(r.unidades)].join('|');
    if (seen.has(k)) return false;
    seen.add(k); return true;
  });
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
function planCatalogForGemini(state, form = {}) {
  const maps = planBuildMaps(state);
  const totalMode = trim(form?.mode).toUpperCase() === 'ZUZU_TOTAL';
  const finalizados = totalMode ? [] : arr(state?.eventos).filter(e => /^finalizado$/i.test(trim(e?.situacion)));
  return {
    eventosFinalizados: finalizados.map(e => ({ id: trim(e.id), titulo: planEventTitle(e), fechaIni: trim(e.fechaIni), fechaFin: trim(e.fechaFin), precio: round(e.precio, 2), asistentes: planAttendeesForEvent(state, e.id) })).slice(0, 60),
    productos: arr(state?.productos).map(p => ({ id: trim(p.id), nombre: trim(p.nombre), segmento: trim(p.segmento), destino: trim(p.destino), precio: round(p.defaultPrecio ?? p.precio, 4), tienda: planStoreName(p.defaultTiendaId || p.tiendaId, maps) })).slice(0, 1000),
    tiendas: arr(state?.tiendas).map(t => trim(t.nombre)).filter(Boolean).slice(0, 300),
    personas: arr(state?.personas).map(p => ({ nombre: trim(p.nombre), rango: trim(p.rango) })).filter(p => p.nombre).slice(0, 500)
  };
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
  const out = [];
  const rx = /(?:^|\n)\s*(?:[-*]\s*)?(?:dia|día)\s*[_\- ]*(\d{1,2})\s*(?:\([^\n)]*\))?\s*:?\s*([^\n]+)/gi;
  let m;
  while ((m = rx.exec(raw))) {
    const diaNum = Math.max(1, Math.min(14, Math.round(num(m[1]))));
    const desc = trim(m[2] || '');
    if (!desc || /^todo\s+el\s+d[ií]a\s*:?\s*$/i.test(desc)) continue;
    const n = normPlanKey(desc);
    const add = (momento, detalle) => out.push({ dia:`dia_${diaNum}`, momento, detalle: trim(detalle || desc) });
    if (/aperitivo/.test(n)) add('aperitivo', desc);
    if (/comida/.test(n)) add('comida', desc);
    if (/tardeo|cubatas?\s+de\s+tarde/.test(n)) add('tardeo/cubatas', desc);
    if (/cena/.test(n)) add('cena', desc);
    if (/cubatas?\s+noche|noche/.test(n) && /cubata/.test(n)) add('cubatas noche', desc);
  }
  if (out.length) return out.filter(item => num(item.dia.replace(/\D/g,'')) <= days);
  return planExpectedMenuSlots(days).map(x => ({ ...x, detalle: 'Franja a definir por Zuzu según concepto del evento.' }));
}
function planPromptBriefObject(form = {}, state = {}) {
  const raw = planPromptRawText(form);
  const budget = planBudgetFromPrompt(form);
  const personas = planPromptNumber(form, [/personas\s+asistentes\s*[:=]\s*(\d+(?:[,.]\d+)?)/i], num(form.personas));
  const cenas = planPromptNumber(form, [/personas\s+que\s+cenar[aá]n\s+realmente\s*[:=]\s*(\d+(?:[,.]\d+)?)/i, /cena[^\n]{0,80}?(\d+(?:[,.]\d+)?)\s*personas/i], 0);
  const brief = {
    versionBrief: 'FIX31_BRIEF_EVENTO_V1',
    objetivoEvento: firstNonEmpty((raw.match(/OBJETIVO\s+DEL\s+EVENTO\s*:\s*([^\n]+)/i) || [])[1], form.title),
    duracionDias: planEffectiveDays(form),
    personasAsistentes: personas || num(form.personas) || 0,
    presupuestoObjetivoPorPersona: budget.objetivoPorPersona,
    limiteMaximoPorPersona: budget.maximoPorPersona,
    temperatura: firstNonEmpty((raw.match(/temperatura\s+prevista\s*:\s*([^\n]+)/i) || [])[1], /calor|verano|mucho\s+sol/i.test(raw) ? 'mucho calor' : ''),
    personasCerveza: planPromptNumber(form, [/personas\s+que\s+beber[aá]n\s+cerveza\s*[:=]\s*(\d+(?:[,.]\d+)?)/i], 0),
    personasCubatas: planPromptNumber(form, [/personas\s+que\s+tomar[aá]n\s+cubatas\s*[:=]\s*(\d+(?:[,.]\d+)?)/i], 0),
    personasSinAlcoholNinos: planPromptNumber(form, [/personas\s+sin\s+alcohol\s*\/\s*ni[ñn]os\s*[:=]\s*(\d+(?:[,.]\d+)?)/i, /personas\s+sin\s+alcohol[^\n:]*[:=]\s*(\d+(?:[,.]\d+)?)/i], 0),
    personasCenaReal: cenas,
    horas: {
      aperitivo: firstNonEmpty((raw.match(/hora\s+aproximada\s+del\s+aperitivo\s*:\s*([^\n]+)/i) || [])[1], ''),
      comida: firstNonEmpty((raw.match(/hora\s+aproximada\s+de\s+la\s+comida\s*:\s*([^\n]+)/i) || [])[1], ''),
      tardeoCubatas: firstNonEmpty((raw.match(/duraci[oó]n\s+del\s+tardeo\s*\/\s*cubatas\s*:\s*([^\n]+)/i) || [])[1], ''),
      cena: firstNonEmpty((raw.match(/hora\s+aproximada\s+de\s+la\s+cena\s*:\s*([^\n]+)/i) || [])[1], '')
    },
    momentosPorDia: planMomentsFromPrompt(form),
    concepto: {
      aperitivo: planExtractParagraph(raw, 'aperitivo', ['comida', 'tardeo', 'cena', 'criterios?']),
      comida: planExtractParagraph(raw, 'comida', ['tardeo', 'cena', 'criterios?']),
      tardeoCubatas: planExtractParagraph(raw, 'tardeo', ['cena', 'criterios?']),
      cena: planExtractParagraph(raw, 'cena', ['criterios?', 'producto\s+en\s+la\s+pe[nñ]a', 'donaciones?', 'pistas'])
    },
    reglasBebida: [
      'Cerveza solo a personas consumidoras, máximo indicado por prompt.',
      'Cubatas solo a personas consumidoras, separar refrescos de mezcla y refrescos directos.',
      'Con calor subir agua, hielo, cerveza y refrescos sin exagerar.',
      'Redondear latas/refrescos a múltiplos de 24 cuando tenga sentido.'
    ],
    reglasComida: [
      'No multiplicar todos los productos por todos los asistentes.',
      'Aperitivo como picoteo compartido.',
      'Cena informal solo para quienes cenan realmente.',
      'Compra = necesidad total - donaciones/existencias confirmadas.'
    ],
    donacionesDetectadas: planExplicitDonationRowsFromPrompt(form, state).map(r => ({ producto:r.productName, unidades:r.unidades, tipo:r.ticketDonacion, donante:r.donorRef, responsable:r.responsableId })).slice(0, 120)
  };
  return brief;
}
function planPromptBriefText(form = {}, state = {}) {
  const b = planPromptBriefObject(form, state);
  const lines = [];
  lines.push('BRIEF ESTRUCTURADO DEL EVENTO - generado por ControlEvent antes de llamar a Gemini');
  lines.push(`Duración: ${b.duracionDias} día(s)`);
  lines.push(`Asistentes: ${b.personasAsistentes || 'sin dato'} | Cerveza: ${b.personasCerveza || 'sin dato'} | Cubatas: ${b.personasCubatas || 'sin dato'} | Sin alcohol/niños: ${b.personasSinAlcoholNinos || 'sin dato'} | Cenan realmente: ${b.personasCenaReal || 'sin dato'}`);
  if (b.presupuestoObjetivoPorPersona || b.limiteMaximoPorPersona) lines.push(`Presupuesto: objetivo ${b.presupuestoObjetivoPorPersona || '?'} €/persona; máximo ${b.limiteMaximoPorPersona || '?'} €/persona.`);
  if (b.temperatura) lines.push(`Temperatura: ${b.temperatura}`);
  lines.push('Momentos por día:');
  b.momentosPorDia.forEach(m => lines.push(`- ${m.dia} (${m.momento}): ${m.detalle}`));
  lines.push('Concepto culinario resumido:');
  Object.entries(b.concepto).forEach(([k,v]) => { if (v) lines.push(`- ${k}: ${v}`); });
  lines.push(`Donaciones/existencias detectadas: ${b.donacionesDetectadas.length} línea(s).`);
  lines.push('Reglas clave: compra solo por déficit; no inventar donaciones; no copiar eventos anteriores; usar catálogo si coincide y conservar nombres parecidos si no coincide perfecto.');
  return lines.join('\n');
}
function planMenuResumenFromBrief(form = {}) {
  const raw = planPromptRawText(form);
  const b = planPromptBriefObject(form, {});
  const concept = b.concepto || {};
  const byDay = new Map();
  b.momentosPorDia.forEach(m => {
    const key = `${m.dia}|${normPlanKey(m.momento)}`;
    if (!byDay.has(key)) byDay.set(key, m);
  });
  function dayNum(dia) { return Math.max(1, num(String(dia || '').replace(/\D/g,'')) || 1); }
  function resumenPara(item) {
    const d = dayNum(item.dia);
    const mom = normPlanKey(item.momento);
    if (/aperitivo/.test(mom)) return 'Será a base de picoteo de pie y compartido: ibéricos, queso, anchoas/mejillones, patatas, encurtidos, tortilla y productos donados por socios, ajustando compra solo al déficit.';
    if (/comida/.test(mom)) {
      if (d === 2 && /jam[oó]n\s+asado/i.test(raw)) return 'Será a base de jamón asado en horno de leña servido tipo buffet, con acompañamientos sencillos, pan y bebida, descontando lo existente/donado.';
      if (d === 3 && /sobrad[ao]s?|barbacoa/i.test(raw)) return 'Será a base de aprovechamiento planificado de carne sobrante de las barbacoas/cenas, con acompañamientos fríos y compra mínima de apoyo.';
      return 'Será una comida sentada o principal definida por el concepto del prompt, con cantidades ajustadas a asistentes reales y existencias.';
    }
    if (/tardeo|cubata/.test(mom) && !/noche/.test(mom)) return 'Será a base de cubatas y música: ron, whisky, ginebra, refrescos de mezcla separados de refrescos directos, hielo, vasos y reposición prudente por calor.';
    if (/cena/.test(mom)) return 'Será una barbacoa informal calculada para las personas que realmente cenan, repartiendo chorizo de asar, panceta, lomo fresco, morcilla y venao en salsa sin multiplicarlo todo por los 30 asistentes.';
    if (/noche/.test(mom)) return 'Será a base de cubatas de noche, reforzando hielo, refrescos de mezcla, vasos y bebida alcohólica según consumidores reales.';
    return 'Será a base de una propuesta libre de Zuzu ajustada al brief del evento, sin plantilla fija.';
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


function planPrompt(form, baseRows, incomeRows, state, sourceEvent, modules) {
  const compactRows = trim(form.mode).toUpperCase() === 'ZUZU_TOTAL' ? [] : arr(baseRows).slice(0, 450).map(r => ({ productId:r.productId, producto:r.productName, segmento:r.segmento, destino:r.destino, tipo:r.tipo, unidades:r.unidades, precio:r.precio, ticketDonacion:r.ticketDonacion, tienda: r.tiendaId, responsable: r.responsableId, donante:r.donorRef, origen:r.sourceEventTitle }));
  const diasDetectadosPrompt = planDetectedDaysFromPrompt(form);
  const diasOperativos = planEffectiveDays(form);
  const ctx = {
    modo: planModeLabel(form.mode),
    aislamientoEncargoTotal: trim(form.mode).toUpperCase() === 'ZUZU_TOTAL' ? 'ACTIVO: no se entregan eventos finalizados ni filas históricas como fuente; solo catálogo, prompt y donaciones explícitas.' : 'NO ACTIVO',
    modulosSolicitados: modules,
    eventoNuevo: { titulo: trim(form.title), fechaIni: trim(form.fechaIni), fechaFin: trim(form.fechaFin), diasFormulario: num(form.diasFormulario ?? form.dias), diasDetectadosPrompt, diasOperativos, personasEstimadas: num(form.personas), descripcion: trim(form.descripcion), informacionConstruccion: trim(form.info) },
    briefEvento: planPromptBriefObject(form, state),
    briefEventoTexto: planPromptBriefText(form, state),
    franjasMenuEsperadas: planExpectedMenuSlots(diasOperativos),
    eventoModelo: sourceEvent ? { id: trim(sourceEvent.id), titulo: planEventTitle(sourceEvent), precio: round(sourceEvent.precio, 2), fechaIni: trim(sourceEvent.fechaIni), fechaFin: trim(sourceEvent.fechaFin) } : null,
    responsablePorDefecto: trim(form.defaultResponsibleName),
    tiendaPorDefecto: trim(form.defaultStoreName),
    filasHistoricasBase: compactRows,
    ingresosHistoricosBase: arr(incomeRows).slice(0, 120).map(i => ({ colaborador:i.personaName, rango:i.rango, numero:i.numero, obligatorio:i.importeObligatorio, voluntario:i.importeVoluntario })),
    reglasDonacionesDetectadas: planInfoDonationRules(form.info, planBuildMaps(state)).map(r => ({producto:r.productText, donante:r.donorLabel, responsable:r.responsableLabel, tipo:r.ticketDonacion})),
    existenciasYDonacionesExplicitas: planExplicitDonationRowsFromPrompt(form, state).map(r => ({producto:r.productName, unidades:r.unidades, precio:r.precio, tipoDonacion:r.ticketDonacion, donante:r.donorRef, responsable:r.responsableId, tienda:r.tiendaId})),
    catalogos: planCatalogForGemini(state, form)
  };
  return `Eres Zuzu dentro de ControlEvent, módulo de PLANIFICACIÓN INICIAL. Debes crear una propuesta revisable para un evento nuevo, usando históricos y las instrucciones del usuario.

Reglas:
- Devuelve SOLO JSON válido según el esquema.
- La fuente principal es ctx.briefEvento y ctx.briefEventoTexto. El brief ya viene cocinado por ControlEvent desde el prompt del usuario: duración, momentos por día, asistentes, bebida, cenas reales, presupuesto, calor, donaciones y reglas. Antes de proponer productos, lee ese brief y haz una propuesta coherente con él.
- Calculas COSTE REAL de evento, no precio de bar/restaurante. Si el prompt indica presupuesto objetivo o límite por persona, úsalo como referencia para TODO el evento; si no lo indica, usa criterio razonable y marca supuestos.
- NO inventes productos donados. En Encargo total o parcial, solo devuelve DONACION si aparece como donación/existencia explícita en el prompt. En réplica exacta sí puedes conservar DONACIONES históricas base. Si crees que algo podría donarse, trátalo como COMPRA con la razón "posible donación pendiente de confirmar", pero NO lo descuentes.
- Cerveza lata/botellín: usa como referencia hasta unas 5 unidades por persona consumidora en todo el día, no por todos los asistentes. Cubatas: 3 o 4 por persona consumidora; calcula refrescos de mezcla según cubatas, no como botella por persona.
- No uses nunca un menú fijo por defecto. La palabra genérica comida/comer no significa automáticamente paella, y la palabra cena no significa automáticamente barbacoa.
- Sí puedes proponer paella, arroz, barbacoa, bocadillos, tapas, comida fría, tortillas, pizzas u otras ideas si encajan de verdad con el concepto, duración, presupuesto y tono del evento. Si eliges una de esas líneas de menú, debe ser una decisión tuya razonada como organizador experto, no una plantilla repetida.
- No inventes claves internas. Si propones un producto existente, devuelve su productId del catálogo. Si dudas, usa el producto histórico base.
- Para modo "Replicar un evento Finalizado", conserva las filas históricas base casi tal cual; solo completa responsable/tienda con los valores por defecto si faltan.
- Para modo "Encargo parcial a Zuzu", usa el evento modelo como plantilla pero ajusta cantidades/variedad según días, personas estimadas e instrucciones.
- Para modo "Encargo total a Zuzu", PROHIBIDO usar eventos pasados, listas históricas, patrones de un evento anterior o menús fijos. En este modo ControlEvent no te entrega eventos finalizados ni filas históricas; si recuerdas o deduces una lista vieja, ignórala.
- En Encargo total debes obedecer el texto completo de descripcion/informacionConstruccion y, sobre todo, el briefEvento: duración/días, concepto del evento, comidas indicadas, horarios, preferencias de comida, bebida, cosas que NO se quieren y nivel de detalle pedido.
- En Encargo total manda el prompt del usuario. Si el prompt habla de 3 días, 2 días o varios momentos, construye una propuesta para TODOS esos días aunque el campo diasFormulario venga a 1. Usa diasDetectadosPrompt/diasOperativos como referencia de trabajo.
- Si falta algún dato, participa activamente: propone una solución razonable y deja en notes qué preguntas faltan para afinar. Solo te bloqueas si no hay personas ni concepto mínimo; no vuelvas a una plantilla fija.
- Si el usuario pide más bebida/calor/más días/más gente, ajusta unidades. Mantén precios de referencia razonables.
- Antes de proponer compras, calcula necesidad total por producto para personas/días/temperatura y resta existencias o donaciones indicadas. La COMPRA debe ser solo el déficit con margen de seguridad si procede; la DONACION representa exactamente lo que ya se tiene o se prevé recibir.
- Si el usuario dice que hay existencias o donaciones previstas, debes devolver esas líneas como DONACION con las unidades exactas indicadas; no las conviertas en compra.
- La cantidad de una DONACION indicada en la descripción/informaciónConstruccion queda BLOQUEADA: no aumentes nunca esa línea para cubrir necesidad calculada. Si falta más producto, crea o deja que la app cree una COMPRA por el déficit.
- Para bebidas en lata/botellín, si propones compra y el usuario pide múltiplos de 24, redondea las unidades de compra al alza al múltiplo de 24.
- No agrupes productos bajo conceptos genéricos tipo "cosas de paella" si el usuario pide desglose: usa líneas concretas de arroz, carne, verduras, aceite, platos, vasos, hielo, agua, refrescos, pan, etc.
- Tipo debe ser COMPRA o DONACION. Para donaciones usa ticketDonacion DONADO SOCIO, DONADO TIENDA o DONADO OTROS.
- Respeta las instrucciones explícitas de donante/responsable del prompt. Si el usuario dice que ciertas existencias son DONADO SOCIO de una persona/peña y responsable concreto, usa esos datos en todas esas filas de DONACION.
- Si modulosSolicitados está vacío por la opción Ningún dato, apóyate solo en la información del usuario y el catálogo de productos; no copies históricos de eventos.
- Sé creativo y operativo como organizador experto: propone menús completos pero razonables para aperitivo, comida, tardeo/cubatas, cena, limpieza y menaje si se han pedido. No te limites a repetir literalmente el prompt.
- OBLIGATORIO: devuelve menuResumen con una línea por cada momento real del briefEvento.momentosPorDia, no solo cuatro líneas genéricas. Formato: "Será a base de ...". Debe explicar al usuario el menú antes de ver la tabla de compras/donaciones. Si hay 3 días, devuelve día_1, día_2 y día_3; si el día 1 solo tiene cena y cubatas noche, no inventes aperitivo/comida de día 1.
- En cada producto, intenta devolver necesidadTotal: necesidad total antes de restar donado/existente. Las líneas DONACION representan lo que ya hay o se donará; las líneas COMPRA representan solo el déficit.
- No devuelvas más de 180 filas. Prioriza productos útiles y evita productos absurdos o no pedidos.
- La app mostrará la propuesta para que el usuario pueda editarla; no estás creando el evento real.

CONTEXTO:
${JSON.stringify(ctx).slice(0, 240000)}`;
}
async function callGeminiPlanificacion(form, baseRows, incomeRows, state, sourceEvent, modules) {
  const apiKey = geminiKey();
  if (!apiKey) throw new Error('Sin GEMINI_API_KEY para planificacion con Zuzu.');
  let lastError = null;
  for (const model of configuredGeminiModels()) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const body = { contents: [{ role: 'user', parts: [{ text: planPrompt(form, baseRows, incomeRows, state, sourceEvent, modules) }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: planAiSchema(), temperature: trim(form?.mode).toUpperCase() === 'ZUZU_TOTAL' ? 0.55 : 0.25 } };
    try {
      const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify(body) });
      const payload = await res.json().catch(async () => ({ error:{ message: await res.text().catch(() => res.statusText) } }));
      if (!res.ok) throw new Error(payload?.error?.message || `Gemini planificacion HTTP ${res.status}`);
      const outText = trim(geminiOutText(payload));
      if (!outText) throw new Error('Gemini no devolvió propuesta de planificación.');
      const parsed = JSON.parse(stripJsonText(outText));
      parsed.__model = model;
      return parsed;
    } catch (error) { lastError = error; if (!isRetryable(error)) break; }
  }
  throw lastError || new Error('Gemini planificación no disponible.');
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
    // FIX31: no descartar propuestas libres de Gemini por no encajar al 100% con PRODUCTOS.
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
      productId: trim(prod?.id || base?.productId),
      productName: trim(prod?.nombre || base?.productName || row?.producto),
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
      confidence: 'Zuzu',
      necesidadTotal: num(row?.necesidadTotal) > 0 ? round(row.necesidadTotal, 2) : undefined,
      reason: trim(row?.reason) || 'Propuesta ajustada por Zuzu a partir del menú, asistentes, duración, temperatura y existencias.'
    });
  });
  return planApplyDonationRules(out.filter(r => (r.productId || r.productName) && r.unidades >= 0), planInfoDonationRules(form.info, maps));
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
      segmento:trim(prod.segmento || 'Sin segmento'),
      destino:trim(prod.destino || 'Sin destino'),
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
  const info = trim(form?.info || '');
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
  const info = trim(form?.info || '');
  return /(PRODUCTO\s+EN\s+LA\s+PE[NÑ]A|DONACIONES?\s*:|DONACION\s*:|DONACI[ÓO]N\s*:|EXISTENCIAS?\s*:|YA\s+TENEMOS)/i.test(info)
    && /\[Donante:|Tratar\s+como\s+DONADO|PRODUCTOS?\s*:/i.test(info);
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

export async function planificacionInicialZuzu({ mode, modelEventId, content, title, fechaIni, fechaFin, dias, personas, defaultResponsibleId, defaultStoreId, descripcion, info } = {}) {
  const state = await getState();
  const maps = planBuildMaps(state);
  const modules = planContentModules(content);
  const rawForm = { mode, modelEventId, content, title, fechaIni, fechaFin, dias, personas, defaultResponsibleId, defaultStoreId, descripcion, info };
  const diasDetectadosPrompt = planDetectedDaysFromPrompt(rawForm);
  const diasOperativos = Math.max(1, diasDetectadosPrompt || num(dias) || 1);
  const form = { ...rawForm, diasFormulario: dias, diasDetectadosPrompt, dias: diasOperativos, defaultResponsibleName: planPersonName(defaultResponsibleId, maps), defaultStoreName: planStoreName(defaultStoreId, maps) };
  const m = trim(mode || 'REPLICA').toUpperCase();
  const sourceEvent = planEventById(state, modelEventId);
  if ((m === 'REPLICA' || m === 'ZUZU_PARCIAL') && !sourceEvent) {
    const err = new Error('Debes elegir un Evento modelo finalizado para este modo de planificación.');
    err.status = 400; throw err;
  }
  let baseRows = (m === 'ZUZU_TOTAL') ? [] : planRowsForEvent(state, modelEventId, modules);
  const sourceAtt = sourceEvent ? planAttendeesForEvent(state, sourceEvent.id) : 0;
  const targetAtt = num(personas) || sourceAtt || 30;
  const sourceDays = sourceEvent ? Math.max(1, 1) : 1;
  const targetDays = Math.max(1, num(form.dias) || 1);
  if (m === 'ZUZU_PARCIAL' && sourceAtt > 0) baseRows = planScaleRows(baseRows, Math.max(0.1, (targetAtt / sourceAtt) * Math.sqrt(targetDays / sourceDays)), defaultStoreId, defaultResponsibleId);
  let incomeRows = modules.includes('INGRESOS') && sourceEvent ? planIncomeRowsForEvent(state, sourceEvent.id) : [];
  const explicitDonationRows = planExplicitDonationRowsFromPrompt(form, state);
  let rowsOut = baseRows;
  let aiNotes = [];
  let aiProvider = 'control-event-historico';
  let aiModel = '';
  let aiMenuResumen = [];
  const hasConfirmedPromptBlocks = planHasConfirmedDonationBlocksHf17(form);
  const largePrompt = trim(form.info || '').length > 6000;

  if (m === 'ZUZU_TOTAL' && hasConfirmedPromptBlocks) {
    // FIX28 planificación: las donaciones/existencias explícitas se cargan siempre,
    // pero Gemini debe interpretar también el concepto, duración y comidas del prompt.
    // Si Gemini falla, NO se inventa menú fijo local; se devuelven solo esas donaciones y notas de aviso.
    rowsOut = planRowsFromExplicitPromptOnlyHf17(form, state);
    aiProvider = 'control-event-prompt-directo';
    aiNotes.push('FIX31_PLANIFICACION activo: ControlEvent extrae un brief estructurado del prompt y se lo entrega a Gemini; donaciones/existencias confirmadas cargadas; compras y menú deben venir del brief+Gemini.');
    try {
      const ai = await planWithTimeoutHf17(callGeminiPlanificacion(form, [], incomeRows, state, sourceEvent, modules), largePrompt ? 45000 : 30000, 'Gemini planificación');
      const matched = matchPlanRows(ai?.rows, [], state, form);
      if (matched.length) {
        rowsOut = planMergeExplicitDonations(matched, explicitDonationRows);
        aiMenuResumen = planCompleteMenuResumen(ai?.menuResumen, form);
        aiNotes = arr(ai?.notes).map(x => trim(x)).filter(Boolean).concat(aiNotes);
        aiProvider = 'gemini-planificacion+prompt-confirmado'; aiModel = ai.__model || '';
      } else {
        aiNotes.push('Gemini no devolvió compras utilizables. No se añade una compra automática local para no inventar paella/barbacoa ni un menú que el usuario no haya pedido.');
      }
    } catch (error) {
      aiNotes.push('Gemini no pudo completar la planificación del menú/compras: ' + trim(error?.message || error) + '. No se añade una compra automática local; completa o acorta el prompt y vuelve a generar.');
    }
  } else if (m === 'ZUZU_TOTAL' || m === 'ZUZU_PARCIAL') {
    if (m === 'ZUZU_TOTAL') aiNotes.push('FIX31_PLANIFICACION activo: encargo total con brief estructurado y control real de Gemini; sin históricos, sin compras locales de seguridad y con resumen por días/momentos.');
    try {
      const ai = await planWithTimeoutHf17(callGeminiPlanificacion(form, baseRows, incomeRows, state, sourceEvent, modules), 30000, 'Gemini planificación');
      const matched = matchPlanRows(ai?.rows, baseRows, state, form);
      if (matched.length) {
        rowsOut = matched;
        aiMenuResumen = planCompleteMenuResumen(ai?.menuResumen, form);
        aiNotes = arr(ai?.notes).map(x => trim(x)).filter(Boolean);
        aiProvider = 'gemini-planificacion'; aiModel = ai.__model || '';
      } else aiNotes.push('Zuzu no devolvió filas utilizables; se mantiene la propuesta histórica base.');
    } catch (error) {
      aiNotes.push('Gemini no pudo ajustar la propuesta a tiempo; se mantiene propuesta base y donaciones del prompt: ' + trim(error?.message || error));
      aiProvider = 'control-event-timeout-fallback';
    }
  } else {
    aiNotes.push('Modo réplica: se conserva el evento modelo sin ajuste de IA.');
  }
  rowsOut = planMergeExplicitDonations(rowsOut, explicitDonationRows);
  rowsOut = planSanitizeInventedDonations(rowsOut, baseRows, explicitDonationRows, m);
  rowsOut = planCoalesceDonationsAfterSanitize(rowsOut, explicitDonationRows, m);
  rowsOut = planApplyFinalDefaultsHf14(arr(rowsOut).map((row, idx) => ({ ...row, key: row.key || `plan:${idx}` })), form, state);
  if (m === 'ZUZU_TOTAL' || m === 'ZUZU_PARCIAL') {
    rowsOut = planPostProcessPlanningRows(rowsOut, form, state);
    if (m === 'ZUZU_TOTAL') {
      aiNotes.push('FIX31_PLANIFICACION activo: Gemini decide el menú y las compras desde el brief del prompt; ControlEvent no elimina paella/barbacoa ni mete menú local fijo.');
    }
    if (!aiMenuResumen.length) aiMenuResumen = planCompleteMenuResumen([], form);
    const budget = planBudgetGuard(rowsOut, form);
    rowsOut = planApplyFinalDefaultsHf14(budget.rows, form, state);
    aiNotes = planReadableNotes(aiNotes, rowsOut, form, budget.notes);
  } else {
    aiNotes = planReadableNotes(aiNotes, rowsOut, form, []);
  }
  return {
    ok: true,
    version: 'v17_prod_FIX31_PLANIFICACION_BRIEF_GEMINI',
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
    counts: { rows: rowsOut.length, incomes: incomeRows.length, compras: rowsOut.filter(r=>r.tipo==='COMPRA').length, donaciones: rowsOut.filter(r=>r.tipo==='DONACION').length }
  };
}
