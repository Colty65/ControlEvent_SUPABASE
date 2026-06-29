/* ControlEvent v17_prod - Alta asistida para lectura de tickets de compra.
   FIX v9.5: Gemini por REST + indicaciones adicionales por ticket/factura. */

function text(value) { return value == null ? '' : String(value); }
function money(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let s = text(value).replace(/€/g, '').replace(/\s/g, '').trim();
  if (!s) return 0;
  const c = s.lastIndexOf(','), d = s.lastIndexOf('.');
  if (c !== -1 && d !== -1) s = c > d ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c !== -1) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(/,/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function cleanName(value) {
  return text(value)
    .replace(/\s+/g, ' ')
    .replace(/^[*\-•#\s]+/, '')
    .replace(/[\s:;,.]+$/, '')
    .trim();
}
function normalizeLine(item = {}, idx = 0) {
  const descripcion = cleanName(item.descripcion || item.producto || item.nombre || item.concepto || item.description || item.name || '');
  const unidades = money(item.unidades ?? item.cantidad ?? item.qty ?? item.quantity ?? 1) || 1;
  let precio = money(item.precio ?? item.precio_unitario ?? item.precioUnitario ?? item.unit_price ?? item.price);
  let importe = money(item.importe ?? item.precio_total ?? item.total ?? item.line_total ?? item.amount);
  if (!precio && importe && unidades) precio = importe / unidades;
  if (!importe && precio && unidades) importe = precio * unidades;
  return {
    orden: Number(item.orden ?? item.linea ?? item.posicion ?? idx + 1) || idx + 1,
    descripcion,
    unidades: Number(unidades.toFixed(3)),
    precio: Number(precio.toFixed(4)),
    importe: Number(importe.toFixed(4)),
    confianza: Math.max(0, Math.min(1, Number(item.confianza ?? item.confidence ?? 0.5) || 0)),
    segmento: cleanName(item.segmento || item.segment || item.categoria || item.category || ''),
    destino: cleanName(item.destino || item.destination || item.uso || item.use || ''),
    notas: text(item.notas || item.notes || '').trim(),
    requiereRevision: !descripcion || !precio || !importe || String(item.requiereRevision || '').toLowerCase() === 'true'
  };
}
function normalizeAnalysis(raw = {}) {
  const rows = Array.isArray(raw.productos) ? raw.productos
    : Array.isArray(raw.items) ? raw.items
    : Array.isArray(raw.lineas) ? raw.lineas
    : [];
  const productos = rows.map((row, idx) => normalizeLine(row, idx)).filter(row => row.descripcion || row.importe || row.precio);
  return {
    ok: true,
    proveedor: raw.proveedor || raw.comercio || raw.tienda || raw.store || '',
    responsable: raw.responsable || raw.responsableNombre || raw.encargado || raw.persona || raw.responsible || '',
    fecha: raw.fecha || raw.date || '',
    ticket: raw.ticket || raw.tk || raw.ticketDonacion || raw.codigoTicket || raw.numeroTicket || '',
    total: money(raw.total || raw.importe_total || raw.amount_total || 0),
    productos,
    advertencias: Array.isArray(raw.advertencias) ? raw.advertencias : [],
    raw
  };
}
function jsonInstruction(extraInstructions = '', context = {}) {
  const extra = text(extraInstructions).trim().slice(0, 2500);
  const responsables = Array.isArray(context.responsables) ? context.responsables.map(x => text(x).trim()).filter(Boolean).slice(0, 120) : [];
  const tiendas = Array.isArray(context.tiendas) ? context.tiendas.map(x => text(x).trim()).filter(Boolean).slice(0, 120) : [];
  const knownContext = `${responsables.length ? `\nResponsables existentes en PERSONAS/SOCIO que puedes seleccionar si el usuario lo indica: ${responsables.join(', ')}.` : ''}${tiendas.length ? `\nTiendas existentes en TIENDAS que puedes seleccionar si reconoces o el usuario indica una: ${tiendas.join(', ')}.` : ''}`;
  return `Eres un asistente de extracción de tickets de compra para una app de gestión de eventos.

Lee la imagen del ticket/factura y devuelve SOLO JSON válido, sin markdown.

Formato obligatorio:
{
  "proveedor": "nombre comercio si aparece",
  "responsable": "nombre responsable si el usuario lo indica o aparece, si no cadena vacía",
  "fecha": "YYYY-MM-DD si aparece o cadena vacía",
  "ticket": "TKxx si aparece escrito en la foto o en indicaciones, si no cadena vacía",
  "total": numero,
  "productos": [
    {"orden":1, "descripcion":"texto artículo", "unidades":numero, "precio":numero, "importe":numero, "segmento":"", "destino":"", "confianza":numero_0_a_1, "notas":""}
  ],
  "advertencias": []
}

Reglas principales:
- Si aparece escrito en la foto o en las indicaciones un patrón TKxx (por ejemplo TK01, TK1, TK 01), devuélvelo en el campo ticket normalizado como TK01.
- Devuelve los productos en el mismo orden vertical en que aparecen en el ticket/foto.
- Excluye subtotal, total, IVA, pago con tarjeta, cambio, efectivo, cabeceras y descuentos globales salvo que el descuento sea una línea de artículo clara.
- Si hay cantidad x precio, pon unidades, precio unitario e importe final de esa línea.
- Usa punto decimal.
- Si dudas, conserva la línea con confianza baja para que el usuario la revise.
- Los campos segmento y destino se devuelven vacíos salvo que el usuario los indique expresamente o sean evidentes por la indicación adicional.
- El campo responsable se devuelve vacío salvo que el usuario indique de forma explícita un responsable o aparezca de forma clara en las indicaciones. Si coincide con un responsable existente, usa exactamente el nombre existente.
- No uses MATERIAL como segmento. Para carbón, vasos, platos, hielo, bolsas, servilletas o similares, usa INFRAESTRUCTURA si procede o deja segmento vacío si no estás seguro.

IMPORTANTE SOBRE INDICACIONES DEL USUARIO:
- Las indicaciones adicionales del usuario tienen prioridad como corrección manual de ESTA factura/ticket.
- Si el usuario dice que falta una línea, o pide añadir/incluir una línea concreta, debes añadirla a productos aunque no la hayas detectado visualmente. Pon confianza 0.05 y en notas "Añadida por indicación del usuario".
- Si el usuario indica SEGMENTO y/o DESTINO para una línea, copia esos valores exactamente en los campos segmento y destino de esa línea, salvo el segmento MATERIAL que ya no debe proponerse.
- Si el usuario indica RESPONSABLE, encargado o persona concreta, devuelve ese nombre en el campo responsable y no lo ignores.
- Si el usuario indica cómo aplicar IVA, recargo, descuento o cualquier regla de cálculo, recalcula precio e importe siguiendo esa indicación y añade advertencia breve explicando que se aplicó.
- Si las líneas visibles no cuadran con el total y el usuario explica la diferencia, aplica su explicación.
${knownContext}
${extra ? `
Indicaciones adicionales del usuario para ESTA factura/ticket:
${extra}

Relee las indicaciones anteriores y aplícalas de forma efectiva en el JSON final.` : ''}`;
}
function dataUrlParts(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/i.exec(text(dataUrl).trim());
  if (!match) return null;
  return { mimeType: match[1] || 'image/jpeg', base64: match[2] || '' };
}
function stripJsonText(value) {
  let s = text(value).trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return s;
}
function parseJsonStrictish(outText, provider) {
  let parsed;
  try { parsed = JSON.parse(stripJsonText(outText)); }
  catch (error) {
    const err = new Error(`${provider} no devolvió JSON válido.`);
    err.status = 502;
    err.raw = text(outText).slice(0, 2000);
    throw err;
  }
  return normalizeAnalysis(parsed);
}
function looksLikeOpenAiKey(value) {
  return /^sk-/i.test(text(value).trim());
}
function openAiKey() {
  const k = process.env.OPENAI_API_KEY || process.env.CONTROLEVENT_OPENAI_API_KEY || '';
  return looksLikeOpenAiKey(k) ? k : '';
}
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
function providerName() {
  const explicit = text(process.env.CONTROLEVENT_TICKET_AI_PROVIDER || process.env.TICKET_AI_PROVIDER || '').trim().toLowerCase();
  if (explicit === 'openai' || explicit === 'gemini') return explicit;
  if (geminiKey()) return 'gemini';
  if (openAiKey()) return 'openai';
  return 'gemini';
}
function imageMessage(dataUrl) {
  return { type: 'input_image', image_url: dataUrl };
}
async function callOpenAI({ dataUrl, instrucciones = '', responsables = [], tiendas = [] }) {
  const apiKey = openAiKey();
  if (!apiKey) {
    const err = new Error('Falta OPENAI_API_KEY o CONTROLEVENT_OPENAI_API_KEY en variables de entorno.');
    err.status = 503;
    throw err;
  }
  const model = process.env.CONTROLEVENT_TICKET_AI_MODEL || 'gpt-4.1-mini';
  const body = {
    model,
    input: [
      {
        role: 'user',
        content: [
          { type: 'input_text', text: jsonInstruction(instrucciones, {responsables, tiendas}) },
          imageMessage(dataUrl)
        ]
      }
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'ticket_compra',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            proveedor: { type: 'string' },
            responsable: { type: 'string' },
            ticket: { type: 'string' },
            fecha: { type: 'string' },
            total: { type: 'number' },
            productos: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  orden: { type: 'number' },
                  descripcion: { type: 'string' },
                  unidades: { type: 'number' },
                  precio: { type: 'number' },
                  importe: { type: 'number' },
                  segmento: { type: 'string' },
                  destino: { type: 'string' },
                  confianza: { type: 'number' },
                  notas: { type: 'string' }
                },
                required: ['orden', 'descripcion', 'unidades', 'precio', 'importe', 'segmento', 'destino', 'confianza', 'notas']
              }
            },
            advertencias: { type: 'array', items: { type: 'string' } }
          },
          required: ['proveedor', 'responsable', 'fecha', 'ticket', 'total', 'productos', 'advertencias']
        }
      }
    }
  };
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await res.json().catch(async () => ({ error: { message: await res.text().catch(() => res.statusText) } }));
  if (!res.ok) {
    const err = new Error(payload?.error?.message || `OpenAI HTTP ${res.status}`);
    err.status = 502;
    err.details = payload;
    throw err;
  }
  const outText = payload.output_text || payload.output?.flatMap(o => o.content || []).map(c => c.text || '').join('\n') || '';
  if (!outText.trim()) {
    const err = new Error('OpenAI no devolvió texto analizable.');
    err.status = 502;
    throw err;
  }
  return { ...parseJsonStrictish(outText, 'OpenAI'), modelo: model, proveedorIa: 'openai' };
}
function configuredGeminiModels() {
  // v11.1: no volver a llamar a Gemini 1.5 desde v1beta.
  // Algunas claves/regiones ya no aceptan gemini-1.5-flash para generateContent y provocan errores intermitentes.
  const configuredRaw = text(process.env.CONTROLEVENT_TICKET_AI_MODEL || process.env.GEMINI_MODEL || process.env.GOOGLE_GEMINI_MODEL || '');
  const configured = configuredRaw.split(/[;,\s]+/).map(x => x.replace(/^models\//, '').trim()).filter(Boolean);
  const fallback = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  const out = [];
  [...configured, ...fallback].forEach(model => {
    const m = text(model).replace(/^models\//, '').trim();
    if (!m) return;
    if (/^gemini-1\.5(?:-|$)/i.test(m) || /^gemini-pro$/i.test(m)) return;
    if (!out.includes(m)) out.push(m);
  });
  return out;
}
function ticketSchemaRest() {
  return {
    type: 'OBJECT',
    properties: {
      proveedor: { type: 'STRING', description: 'Nombre de la tienda o supermercado' },
      responsable: { type: 'STRING', description: 'Nombre del responsable indicado por el usuario, si lo hay' },
      ticket: { type: 'STRING', description: 'TKxx detectado en la foto o indicado por el usuario, normalizado como TK01' },
      fecha: { type: 'STRING', description: 'Fecha de compra en formato YYYY-MM-DD, si aparece' },
      total: { type: 'NUMBER', description: 'Importe total del ticket' },
      productos: {
        type: 'ARRAY',
        description: 'Lista de artículos individuales comprados, en el mismo orden vertical del ticket',
        items: {
          type: 'OBJECT',
          properties: {
            orden: { type: 'NUMBER', description: 'Orden visual de la línea en el ticket empezando en 1' },
            descripcion: { type: 'STRING', description: 'Descripción del artículo' },
            unidades: { type: 'NUMBER', description: 'Cantidad o unidades' },
            precio: { type: 'NUMBER', description: 'Precio unitario' },
            importe: { type: 'NUMBER', description: 'Importe total de esta línea' },
            segmento: { type: 'STRING', description: 'Segmento indicado por el usuario o vacío' },
            destino: { type: 'STRING', description: 'Destino indicado por el usuario o vacío' },
            confianza: { type: 'NUMBER', description: 'Confianza entre 0 y 1' },
            notas: { type: 'STRING', description: 'Aviso breve si la línea es dudosa' }
          },
          required: ['orden', 'descripcion', 'unidades', 'precio', 'importe', 'segmento', 'destino', 'confianza', 'notas']
        }
      },
      advertencias: { type: 'ARRAY', items: { type: 'STRING' } }
    },
    required: ['proveedor', 'responsable', 'ticket', 'productos', 'total']
  };
}
function decorateGeminiError(err, model, payload) {
  err.proveedorIa = 'gemini';
  err.modelo = model;
  err.details = payload || err.details;
  return err;
}
function isRetryableGeminiError(err) {
  const m = text(err?.message || err?.details?.error?.message || '');
  return /400|404|not found|not supported|model|429|quota|RESOURCE_EXHAUSTED|rate.?limit|l[ií]mite|unavailable|503|INVALID_ARGUMENT/i.test(m);
}
function geminiOutText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('\n') || '';
}
async function callGeminiModel({ model, parts, apiKey, instrucciones = '', responsables = [], tiendas = [] }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: jsonInstruction(instrucciones, {responsables, tiendas}) },
          { inlineData: { data: parts.base64, mimeType: parts.mimeType } },
          { text: 'Devuelve ahora el JSON final aplicando obligatoriamente las indicaciones adicionales del usuario si las hay.' }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: ticketSchemaRest(),
      temperature: 0.1
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body)
  });
  const payload = await res.json().catch(async () => ({ error: { message: await res.text().catch(() => res.statusText) } }));
  if (!res.ok) {
    const err = new Error(payload?.error?.message || `Gemini HTTP ${res.status}`);
    err.status = Number(res.status || 502);
    throw decorateGeminiError(err, model, payload);
  }
  const outText = text(geminiOutText(payload)).trim();
  if (!outText) {
    const err = new Error('Gemini no devolvió texto analizable.');
    err.status = 502;
    throw decorateGeminiError(err, model, payload);
  }
  return { ...parseJsonStrictish(outText, 'Gemini'), modelo: model, proveedorIa: 'gemini-rest' };
}
async function callGemini({ dataUrl, instrucciones = '', responsables = [], tiendas = [] }) {
  const apiKey = geminiKey();
  if (!apiKey) {
    const err = new Error('Falta GEMINI_API_KEY en Vercel. También se admite GOOGLE_API_KEY, CONTROLEVENT_GEMINI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OPENIA_API_KEY o, provisionalmente, OPENAI_API_KEY si contiene una clave de Gemini.');
    err.status = 503;
    err.proveedorIa = 'gemini';
    throw err;
  }
  const parts = dataUrlParts(dataUrl);
  if (!parts || !parts.base64) {
    const err = new Error('La imagen no está en formato data:image/...;base64,...');
    err.status = 400;
    err.proveedorIa = 'gemini';
    throw err;
  }
  const models = configuredGeminiModels();
  let lastError = null;
  for (const model of models) {
    try {
      return await callGeminiModel({ model, parts, apiKey, instrucciones, responsables, tiendas });
    } catch (error) {
      lastError = decorateGeminiError(error, model, error?.details);
      if (!isRetryableGeminiError(error)) throw lastError;
      try { console.warn(`[ControlEvent v17_prod Alta IA] Gemini REST falló con ${model}; se probará otro modelo si queda disponible.`, error?.message || error); } catch (_) {}
    }
  }
  if (lastError) {
    lastError.message = `${lastError.message} (modelos probados con Gemini REST: ${models.join(', ')})`;
    throw lastError;
  }
  const err = new Error('No hay modelos Gemini configurados para probar.');
  err.status = 503;
  err.proveedorIa = 'gemini';
  throw err;
}

export async function analyzeReceiptImage({ dataUrl, instrucciones, indicaciones, hint, responsables = [], tiendas = [] } = {}) {
  const src = text(dataUrl).trim();
  const extraInstructions = text(instrucciones || indicaciones || hint || '').trim().slice(0, 1500);
  if (!/^data:image\//.test(src)) {
    const err = new Error('Falta imagen del ticket en formato data:image/...');
    err.status = 400;
    throw err;
  }
  if (src.length > 20 * 1024 * 1024) {
    const err = new Error('Imagen demasiado grande para analizar con la IA. Reduce la foto o recórtala.');
    err.status = 413;
    throw err;
  }
  const provider = providerName();
  if (provider === 'openai') {
    try {
      return await callOpenAI({ dataUrl: src, instrucciones: extraInstructions, responsables, tiendas });
    } catch (error) {
      if (geminiKey()) {
        try { console.warn('[ControlEvent v17_prod Alta IA] OpenAI falló; se reintenta con Gemini REST.', error?.message || error); } catch (_) {}
        return await callGemini({ dataUrl: src, instrucciones: extraInstructions, responsables, tiendas });
      }
      throw error;
    }
  }
  return await callGemini({ dataUrl: src, instrucciones: extraInstructions, responsables, tiendas });
}
