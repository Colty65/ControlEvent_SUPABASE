/* ControlEvent v9.1_prod - IA para lectura asistida de tickets de compra.
   No escribe datos. Solo analiza una imagen y devuelve filas candidatas para revisión GD. */

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
function normalizeLine(item = {}) {
  const descripcion = cleanName(item.descripcion || item.producto || item.nombre || item.concepto || item.description || item.name || '');
  const unidades = money(item.unidades ?? item.cantidad ?? item.qty ?? item.quantity ?? 1) || 1;
  let precio = money(item.precio ?? item.precio_unitario ?? item.unit_price ?? item.price);
  let importe = money(item.importe ?? item.total ?? item.line_total ?? item.amount);
  if (!precio && importe && unidades) precio = importe / unidades;
  if (!importe && precio && unidades) importe = precio * unidades;
  return {
    descripcion,
    unidades: Number(unidades.toFixed(3)),
    precio: Number(precio.toFixed(4)),
    importe: Number(importe.toFixed(4)),
    confianza: Math.max(0, Math.min(1, Number(item.confianza ?? item.confidence ?? 0) || 0)),
    notas: text(item.notas || item.notes || '').trim(),
    requiereRevision: !descripcion || !precio || !importe || String(item.requiereRevision || '').toLowerCase() === 'true'
  };
}
function normalizeAnalysis(raw = {}) {
  const rows = Array.isArray(raw.productos) ? raw.productos
    : Array.isArray(raw.items) ? raw.items
    : Array.isArray(raw.lineas) ? raw.lineas
    : [];
  const productos = rows.map(normalizeLine).filter(row => row.descripcion || row.importe || row.precio);
  return {
    ok: true,
    proveedor: raw.proveedor || raw.tienda || raw.store || '',
    fecha: raw.fecha || raw.date || '',
    total: money(raw.total || raw.importe_total || raw.amount_total || 0),
    productos,
    advertencias: Array.isArray(raw.advertencias) ? raw.advertencias : [],
    raw
  };
}
function imageMessage(dataUrl) {
  return {
    type: 'input_image',
    image_url: dataUrl
  };
}
function jsonInstruction() {
  return `Eres un asistente de extracción de tickets de compra para una app de gestión de eventos.\n\nLee la imagen del ticket y devuelve SOLO JSON válido, sin markdown.\n\nFormato obligatorio:\n{\n  "proveedor": "nombre comercio si aparece",\n  "fecha": "YYYY-MM-DD si aparece o cadena vacía",\n  "total": numero,\n  "productos": [\n    {"descripcion":"texto artículo", "unidades":numero, "precio":numero, "importe":numero, "confianza":numero_0_a_1, "notas":""}\n  ],\n  "advertencias": []\n}\n\nReglas:\n- No inventes productos que no se vean.\n- Excluye subtotal, total, IVA, pago con tarjeta, cambio, efectivo, cabeceras y descuentos globales salvo que el descuento sea una línea de artículo clara.\n- Si el ticket no tiene descripción clara del artículo, deja descripcion vacía o texto literal breve y pon confianza baja.\n- Si hay cantidad x precio, pon unidades, precio unitario e importe.\n- Usa punto decimal.\n- Si dudas, conserva la línea con confianza baja para que el usuario la revise.`;
}
async function callOpenAI({ dataUrl }) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.CONTROLEVENT_OPENAI_API_KEY || '';
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
          { type: 'input_text', text: jsonInstruction() },
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
            fecha: { type: 'string' },
            total: { type: 'number' },
            productos: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  descripcion: { type: 'string' },
                  unidades: { type: 'number' },
                  precio: { type: 'number' },
                  importe: { type: 'number' },
                  confianza: { type: 'number' },
                  notas: { type: 'string' }
                },
                required: ['descripcion', 'unidades', 'precio', 'importe', 'confianza', 'notas']
              }
            },
            advertencias: { type: 'array', items: { type: 'string' } }
          },
          required: ['proveedor', 'fecha', 'total', 'productos', 'advertencias']
        }
      }
    }
  };
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
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
    const err = new Error('La IA no devolvió texto analizable.');
    err.status = 502;
    throw err;
  }
  let parsed;
  try { parsed = JSON.parse(outText); }
  catch (error) {
    const err = new Error('La IA no devolvió JSON válido.');
    err.status = 502;
    err.raw = outText.slice(0, 2000);
    throw err;
  }
  return normalizeAnalysis(parsed);
}

export async function analyzeReceiptImage({ dataUrl } = {}) {
  const src = text(dataUrl).trim();
  if (!/^data:image\//.test(src)) {
    const err = new Error('Falta imagen del ticket en formato data:image/...');
    err.status = 400;
    throw err;
  }
  if (src.length > 32 * 1024 * 1024) {
    const err = new Error('Imagen demasiado grande para analizar.');
    err.status = 413;
    throw err;
  }
  const result = await callOpenAI({ dataUrl: src });
  return { ...result, modelo: process.env.CONTROLEVENT_TICKET_AI_MODEL || 'gpt-4.1-mini' };
}
