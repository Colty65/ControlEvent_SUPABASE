/* ControlEvent v23_prod_r2 - Política estructural de informes Zuzu.
   Centraliza alcance, profundidad, módulos y reglas de no redundancia. */

function text(value){ return value == null ? '' : String(value); }
function norm(value){
  const s = text(value);
  return (s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g,'') : s)
    .toLowerCase().replace(/\s+/g,' ').trim();
}

export const ZUZU_REPORT_CORE_MODULES = Object.freeze([
  'EVENTOS','INGRESOS','PERSONAS','COMPRAS','DONACIONES','PRODUCTOS','TIENDAS','TICKETS','DOCUMENTOS'
]);

export function analyzeZuzuReportRequest(prompt=''){
  const p = norm(prompt);
  const onePage = /\b(?:(?:una|1)\s+(?:pag(?:ina)?|pagina)|1\s*pag\.?|una\s+sola\s+pagina)\b/.test(p);
  const isReport = /\b(informe|dossier|memoria|resumen\s+(?:general|ejecutivo)|dashboard|balance|estado\s+del\s+evento|situacion\s+del\s+evento|como\s+va(?:n)?\s+(?:el|los)\s+evento)\b/.test(p);
  const broadDetails = /\b(?:detalles?\s+de\s+todo\s+tipo|todo\s+tipo\s+de\s+detalles?|todos?\s+los\s+detalles?|toda\s+la\s+info(?:rmacion)?|informacion\s+completa|datos\s+completos|informe\s+(?:completo|exhaustivo)|dossier\s+completo|poquito\s+de\s+todo|de\s+todo\s+un\s+poco)\b/.test(p);
  const explicitLineDetail = /\b(?:linea\s+por\s+linea|registro\s+por\s+registro|listado\s+completo|anexo\s+detallado|detalle\s+exhaustivo|todos?\s+los\s+productos|todas?\s+las\s+lineas)\b/.test(p);
  const genericDetails = /\b(?:dame|quiero|necesito|saca|prepara|curra)\s+(?:todos?\s+)?detalles?\b/.test(p) || /\bdetalles?\s+del\s+evento\b/.test(p);
  const explicit = {
    EVENTOS: /\b(descripcion|descripción|programa|fechas?|estado\s+del\s+evento|evento)\b/.test(p),
    INGRESOS: /\b(ingresos?|cobros?|colaboradores?|cuotas?|pagos?|socios?|no\s+socios?)\b/.test(p),
    PERSONAS: /\b(personas?|socios?|no\s+socios?|asistencia|asistentes?|no\s+asistentes?|parentesco|personalidad)\b/.test(p),
    COMPRAS: /\b(compras?|gastos?|pendiente\s+de\s+compra|producto\s+disponible)\b/.test(p),
    DONACIONES: /\b(donaciones?|donantes?|donado)\b/.test(p),
    PRODUCTOS: /\b(productos?|segmentos?|destinos?|existencias?)\b/.test(p),
    TIENDAS: /\b(tiendas?|proveedores?)\b/.test(p),
    TICKETS: /\b(tickets?|fototickets?|facturas?|tk\s*\d+)\b/.test(p),
    DOCUMENTOS: /\b(documentos?|adjuntos?|doc\s*\d+|autorizaciones?|solicitudes?|reintegros?)\b/.test(p),
    METEO: /\b(meteo|meteorolog|metereolog|tiempo|clima|lluvia|temperatura|viento|prevision|pronostico)\b/.test(p)
  };
  const explicitOperational = Object.entries(explicit).filter(([k,v])=>v && !['EVENTOS','METEO'].includes(k)).map(([k])=>k);
  const narrowOnly = /\b(?:solo|unicamente|únicamente|exclusivamente)\b/.test(p) && explicitOperational.length > 0;
  const broadReport = !narrowOnly && (broadDetails || genericDetails || (isReport && explicitOperational.length === 0));
  const modules = new Set();
  if (broadReport || onePage && isReport) ZUZU_REPORT_CORE_MODULES.forEach(m=>modules.add(m));
  Object.entries(explicit).forEach(([m,v])=>{ if(v && m !== 'METEO') modules.add(m); });
  if (explicit.METEO) { modules.add('EVENTOS'); modules.add('METEO'); }
  if (modules.has('INGRESOS') || modules.has('PERSONAS')) { modules.add('EVENTOS'); modules.add('INGRESOS'); modules.add('PERSONAS'); }
  if (modules.has('COMPRAS') || modules.has('DONACIONES') || modules.has('TICKETS')) { modules.add('EVENTOS'); modules.add('PRODUCTOS'); modules.add('TIENDAS'); }
  if (modules.has('DOCUMENTOS')) modules.add('EVENTOS');

  const greetOneByOne = /\b(?:saluda|saludar)\b[\s\S]{0,80}\b(?:uno\s+por\s+uno|a\s+todos|socios|asistentes)\b/.test(p) || /\buno\s+por\s+uno\b/.test(p);
  const wantsNames = greetOneByOne || /\b(?:enumera|lista|listado|nombres?|quienes|quiénes)\b/.test(p);
  const asksPeopleContext = /\b(parentesco|personalidad|mote|apodo|quien\s+es|quién\s+es|conoce\s+a|como\s+es|cómo\s+es)\b/.test(p) || greetOneByOne;
  const detailLevel = onePage ? 'executive' : (explicitLineDetail ? 'exhaustive' : ((broadDetails || genericDetails || /\b(detalle|desglosa|completo|exhaustivo)\b/.test(p)) ? 'detailed' : 'summary'));

  return {
    promptNorm:p,
    isReport,
    broadReport,
    onePage,
    detailLevel,
    explicitLineDetail,
    wantsWeather:explicit.METEO,
    wantsNames,
    greetOneByOne,
    asksPeopleContext,
    explicit,
    modules:[...modules],
    includeTickets:modules.has('TICKETS') || broadReport,
    includeDocuments:modules.has('DOCUMENTOS') || broadReport,
    includeAllCore:broadReport || (onePage && isReport)
  };
}

export function needsModuleForReport(prompt, moduleName){
  const policy = analyzeZuzuReportRequest(prompt);
  return policy.modules.includes(String(moduleName || '').toUpperCase());
}

export function isBroadEventReportRequest(prompt){
  const policy = analyzeZuzuReportRequest(prompt);
  return policy.broadReport || (policy.onePage && policy.isReport);
}
