/* ControlEvent v1.0_exp · Router Gemini en modo SOMBRA.
   Esta capa SOLO clasifica la petición y NO consulta/modifica datos de ControlEvent.
   Su decisión se usa únicamente para diagnóstico hasta que se active expresamente la nueva arquitectura. */

function text(value){ return value == null ? '' : String(value); }
function trim(value){ return text(value).trim(); }
function arr(value){ return Array.isArray(value) ? value : []; }
function num(value){ const n=Number(value); return Number.isFinite(n)?n:0; }
function clamp01(value){ return Math.max(0,Math.min(1,num(value))); }
function clean(value,max=240){ return trim(value).replace(/\s+/g,' ').slice(0,max); }
function looksLikeOpenAiKey(value){ return /^sk-/i.test(trim(value)); }

function geminiKey(){
  const explicit = process.env.GEMINI_API_KEY
    || process.env.GOOGLE_API_KEY
    || process.env.CONTROLEVENT_GEMINI_API_KEY
    || process.env.OPENIA_API_KEY
    || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    || '';
  if(explicit) return explicit;
  const maybeOpenAi = process.env.OPENAI_API_KEY || '';
  return maybeOpenAi && !looksLikeOpenAiKey(maybeOpenAi) ? maybeOpenAi : '';
}

export const ZUZU_ROUTER_PIPELINES = Object.freeze([
  'PERSON_OVERVIEW',
  'PERSON_PARTICIPATION',
  'PERSON_PURCHASES',
  'PERSON_INCOMES',
  'PERSON_DONATIONS',
  'PERSON_MANAGEMENT',
  'PEOPLE_ACTIVITY',
  'PEOPLE_COMPARE',
  'EVENT_OVERVIEW',
  'EVENT_BREAKDOWN',
  'EVENT_PURCHASES',
  'EVENT_DONATIONS',
  'EVENT_PEOPLE_INCOMES',
  'EVENT_DOCUMENTATION',
  'EVENT_MANAGEMENT',
  'BANK',
  'STORE_PURCHASES',
  'CATALOG',
  'EVENTS_ANALYSIS',
  'COMPARE_EVENTS',
  'WEATHER',
  'UNKNOWN'
]);

const PIPELINE_HELP = [
  ['PERSON_OVERVIEW','Ficha/resumen global o por evento de una persona concreta.'],
  ['PERSON_PARTICIPATION','En qué eventos participa/asiste una persona.'],
  ['PERSON_PURCHASES','Compras, tickets o responsabilidad de compra de una persona.'],
  ['PERSON_INCOMES','Ingresos/aportaciones/cuotas vinculadas a una persona.'],
  ['PERSON_DONATIONS','Donaciones vinculadas a una persona.'],
  ['PERSON_MANAGEMENT','Hitos/LG/tareas/responsabilidades de gestión de una persona.'],
  ['PEOPLE_ACTIVITY','Ranking/búsqueda global de implicación o actividad de personas.'],
  ['PEOPLE_COMPARE','Comparación directa entre dos o más personas.'],
  ['EVENT_OVERVIEW','Resumen/dossier general de un evento, KPIs y resultado/saldo operativo del evento cuando NO se habla de banco o cuenta.'],
  ['EVENT_BREAKDOWN','Desglose de evento por producto/segmento/destino/tienda u otra dimensión económica.'],
  ['EVENT_PURCHASES','Compras del evento; productos, responsables, tickets, pendientes o detalle.'],
  ['EVENT_DONATIONS','Donaciones/donantes/productos donados del evento.'],
  ['EVENT_PEOPLE_INCOMES','Asistencia, socios, colaboradores, pagos e ingresos propios de un evento.'],
  ['EVENT_DOCUMENTATION','Documentos, fototickets y justificantes del evento.'],
  ['EVENT_MANAGEMENT','Hitos, LG, tareas, fechas, dependencias y responsables del evento.'],
  ['BANK','Cuadre/conciliación, movimientos, saldo bancario o de cuenta, evolución y justificación bancaria. No usar para saldo operativo del evento sin mención bancaria.'],
  ['STORE_PURCHASES','Compras de una tienda/proveedor concreto en uno o varios eventos.'],
  ['CATALOG','Catálogo/listado maestro de productos, tiendas, personas o eventos.'],
  ['EVENTS_ANALYSIS','Análisis global de muchos/todos los eventos, máximos, mínimos, tendencias o condiciones.'],
  ['COMPARE_EVENTS','Comparación explícita entre dos o más eventos.'],
  ['WEATHER','Meteorología/tiempo asociado a un evento y sus fechas.'],
  ['UNKNOWN','Petición fuera de estas tuberías o que necesita aclaración real.']
];

function routerModel(){
  return clean(process.env.CONTROLEVENT_ZUZU_ROUTER_MODEL || 'gemini-2.5-flash-lite',80).replace(/^models\//,'');
}

function sessionMode(conversationHistory){ return arr(conversationHistory).length ? 'CONVERSATION' : 'TRANSACTIONAL'; }

function compactRouterHistory(conversationHistory=[]){
  return arr(conversationHistory).slice(-6).map((turn,index)=>{
    const shadow=turn?.routerShadow?.decision || turn?.routerShadow || null;
    return {
      turn:index+1,
      user:clean(turn?.user,420),
      assistant_title:clean(turn?.title,120),
      assistant_tail:clean(turn?.assistantTail || turn?.assistant,360),
      prior_route:clean(shadow?.route,60),
      prior_subject:clean(shadow?.subject?.value || shadow?.subject_value,120),
      prior_event:clean(shadow?.event?.value || shadow?.event_value,160),
      prior_scope:clean(shadow?.event?.scope || shadow?.event_scope,40),
      result_subject:clean(turn?.resultContext?.person||turn?.resultContext?.persona||turn?.resultContext?.subject||'',120),
      result_event:clean(turn?.resultContext?.event||turn?.resultContext?.evento||turn?.resultContext?.eventName||'',160)
    };
  });
}

function compactConversationContext(value){
  if(!value || typeof value!=='object') return null;
  const out={};
  for(const key of ['focus','people','persons','person','events','event','eventName','subject','scope','lastIntent','intent']){
    const v=value[key];
    if(v===undefined || v===null) continue;
    if(Array.isArray(v)) out[key]=v.slice(0,5).map(x=>clean(x,120));
    else if(typeof v==='object') out[key]=JSON.parse(JSON.stringify(v));
    else out[key]=clean(v,160);
  }
  return Object.keys(out).length?out:null;
}

function routerSchema(){
  return {
    type:'object',
    properties:{
      route:{type:'string',enum:ZUZU_ROUTER_PIPELINES},
      subject:{type:'object',properties:{
        type:{type:'string',enum:['PERSON','EVENT','STORE','DONOR','PRODUCT','NONE']},
        value:{type:'string'},
        source:{type:'string',enum:['EXPLICIT','INHERITED','LOGGED_USER','NONE']}
      },required:['type','value','source']},
      event:{type:'object',properties:{
        scope:{type:'string',enum:['ACTIVE_EVENT','NAMED_EVENT','ALL_EVENTS','INHERITED','UNRESOLVED']},
        value:{type:'string'},
        source:{type:'string',enum:['EXPLICIT','INHERITED','SCREEN','NONE']}
      },required:['scope','value','source']},
      operation:{type:'string',enum:['SUMMARY','LIST','DETAIL','TOTAL','RANKING','COMPARE','REVIEW','GRAPH','TABLE','EXPLAIN','SEARCH','OTHER']},
      filters:{type:'object',properties:{
        exact_subject:{type:'boolean'},
        purchase_status:{type:'string',enum:['REALIZED','PENDING','ALL','NA']},
        ticket:{type:'string'},
        store:{type:'string'},
        donor:{type:'string'}
      },required:['exact_subject','purchase_status','ticket','store','donor']},
      inheritance:{type:'object',properties:{
        subject:{type:'boolean'},event:{type:'boolean'},route:{type:'boolean'},topic:{type:'boolean'}
      },required:['subject','event','route','topic']},
      confidence:{type:'number'},
      reason:{type:'string'}
    },
    required:['route','subject','event','operation','filters','inheritance','confidence','reason']
  };
}

function routerInstruction(payload){
  const catalog=PIPELINE_HELP.map(([name,desc])=>`${name}: ${desc}`).join('\n');
  return `Eres el ROUTER de ControlEvent/Zuzu. NO respondes la pregunta, NO buscas datos y NO eliges herramientas técnicas. Tu único trabajo es decidir por qué TUBERÍA funcional debe pasar el mensaje actual.

REGLA DE SESIÓN INNEGOCIABLE:
- session_mode=TRANSACTIONAL significa primer turno después de una escobita/reset: no hay conversación previa.
- session_mode=CONVERSATION significa que el usuario NO ha limpiado y continúa el mismo hilo. Conserva sujeto, evento y tema anteriores salvo cambio explícito del usuario.
- Frases elípticas como «dime más», «revisa bien», «¿seguro?», «solo X», «y ahora», «pero busca solo X», «¿y sus compras?» heredan el contexto necesario.
- Si el usuario nombra una persona nueva, cambia el sujeto; puede conservar el tema si la frase es comparativa o una continuación del tipo «¿y Esther?».
- Una expresión dentro de paréntesis o un nombre de entidad compuesto NO debe trocearse para inventar personas. Ejemplo: «Personas colaboradoras Tardeo (Copas y más)» es una entidad completa; «más» no es una persona.
- «show_tables», «charts», «gráfica», «tabla» son PRESENTACIÓN/operación, nunca herramientas ni tuberías por sí mismas: conserva la tubería de datos correcta y usa operation=GRAPH/TABLE.
- El evento de pantalla es solo contexto ambiental. Usa ACTIVE_EVENT únicamente si el usuario realmente se refiere a «este evento/el evento actual» o el hilo ya lo fijó. Para una persona global sin evento nombrado usa ALL_EVENTS.
- REGLA CRÍTICA DE ÁMBITO PERSONAL: si el usuario nombra una PERSONA y no nombra ningún evento ni dice «este evento/el actual/aquí», una ruta PERSON_* debe llevar event.scope=ALL_EVENTS, event.value vacío y event.source=NONE. Nunca copies el evento de pantalla por comodidad.
- REGLA CRÍTICA PERSONA vs EVENTO: títulos como «SySA 2026», «SySA 2025», «IV Jornada Solidaria vs ELA - DIC25» son EVENTOS, no personas. «¿Qué ingresos tuvo SySA 2026?» => EVENT_PEOPLE_INCOMES. «¿Quién asistió a SySA 2026?» => EVENT_PEOPLE_INCOMES. No uses PERSON_INCOMES ni PERSON_PARTICIPATION para esas preguntas.
- SALDOS: «¿Qué saldo dejó SySA 2026?» sin palabras banco/cuenta/conciliación/cuadre significa saldo OPERATIVO del evento => EVENT_OVERVIEW + TOTAL. Solo usa BANK si la pregunta habla explícitamente de banco, cuenta, movimientos, conciliación, cuadre o saldo bancario.
- OPERACIONES: TOTAL=importe/cantidad total; LIST=qué/cuáles/quiénes o enumeración; DETAIL=detalla/desglosa un elemento o pide detalle exhaustivo; SEARCH=localizar una referencia concreta; REVIEW=revisar/verificar; SUMMARY=resumen general. «¿Qué tickets justifican los cargos bancarios...?» es BANK + LIST/DETAIL, no SEARCH genérico.
- Si el usuario dice «solo Colty» después de hablar de compras de Colty, la ruta sigue siendo PERSON_PURCHASES y exact_subject=true.
- Si dice «revisa mi responsabilidad en compras» dentro de un hilo sobre Colty, «mi» mantiene el sujeto Colty salvo que el usuario cambie explícitamente de sujeto.
- FILTROS DE CONTINUACIÓN: «solo los directos», «incluye también los compartidos», «excluye los compartidos», «ahora solo SySA», «solo las de 2026» cambian FILTRO/ÁMBITO, no deben inventar un sujeto nuevo. Conserva el sujeto y la tubería del turno inmediatamente anterior salvo cambio explícito real.
- «SySA» o un año como «2026» no son personas. Si aparecen como filtro dentro de PERSON_*, conserva la persona anterior y úsalo para concretar el evento/año.
- Si operation=COMPARE y hay dos eventos explícitos/heredados, usa COMPARE_EVENTS.
- «¿Qué tienda concentra más compras?» sin nombrar una tienda concreta es un desglose/ranking del evento => EVENT_BREAKDOWN. STORE_PURCHASES se reserva para una tienda/proveedor concreto.
- Un mensaje claramente ajeno a ControlEvent y que tampoco sea una continuación lingüística real (p. ej. «toma paloma pastillas de goma») debe ser UNKNOWN; no arrastres por inercia la tubería previa.

TUBERÍAS DISPONIBLES:
${catalog}

Devuelve SOLO el JSON estructurado solicitado. reason debe ser breve (máximo 180 caracteres) y explicar la herencia/cambio principal, no el razonamiento interno.

ENTRADA:
${JSON.stringify(payload)}`;
}

function parseJsonText(raw){
  const src=trim(raw);
  if(!src) return null;
  try{return JSON.parse(src);}catch(_){ }
  const a=src.indexOf('{'),b=src.lastIndexOf('}');
  if(a>=0&&b>a){try{return JSON.parse(src.slice(a,b+1));}catch(_){ }}
  return null;
}

function outputText(payload){
  return arr(payload?.candidates?.[0]?.content?.parts).map(p=>text(p?.text)).join('\n').trim();
}

function estimateUsage(model,payload){
  const u=payload?.usageMetadata||{};
  const promptTokens=num(u.promptTokenCount),candidateTokens=num(u.candidatesTokenCount),totalTokens=num(u.totalTokenCount);
  const outputTokens=Math.max(candidateTokens,totalTokens?Math.max(0,totalTokens-promptTokens):candidateTokens);
  const hiddenOutputTokens=Math.max(0,outputTokens-candidateTokens);
  const lite=/flash-lite/i.test(model);
  const inputRate=num(lite?(process.env.CONTROLEVENT_GEMINI_FLASH_LITE_INPUT_USD_PER_M||0.10):(process.env.CONTROLEVENT_GEMINI_FLASH_INPUT_USD_PER_M||0.30));
  const outputRate=num(lite?(process.env.CONTROLEVENT_GEMINI_FLASH_LITE_OUTPUT_USD_PER_M||0.40):(process.env.CONTROLEVENT_GEMINI_FLASH_OUTPUT_USD_PER_M||2.50));
  const costUsd=(promptTokens*inputRate+outputTokens*outputRate)/1000000;
  const eurRate=num(process.env.CONTROLEVENT_USD_EUR||0.92)||0.92;
  return {calls:1,promptTokens,candidateTokens,outputTokens,hiddenOutputTokens,totalTokens:totalTokens||(promptTokens+outputTokens),costUsd:Number(costUsd.toFixed(8)),costEurApprox:Number((costUsd*eurRate).toFixed(8))};
}

function normalizeDecision(raw,mode){
  const route=ZUZU_ROUTER_PIPELINES.includes(trim(raw?.route))?trim(raw.route):'UNKNOWN';
  const subjectRaw=raw?.subject&&typeof raw.subject==='object'?raw.subject:{};
  const eventRaw=raw?.event&&typeof raw.event==='object'?raw.event:{};
  const filtersRaw=raw?.filters&&typeof raw.filters==='object'?raw.filters:{};
  const inheritanceRaw=raw?.inheritance&&typeof raw.inheritance==='object'?raw.inheritance:{};
  const subjectType=['PERSON','EVENT','STORE','DONOR','PRODUCT','NONE'].includes(trim(subjectRaw.type))?trim(subjectRaw.type):'NONE';
  const subjectSource=['EXPLICIT','INHERITED','LOGGED_USER','NONE'].includes(trim(subjectRaw.source))?trim(subjectRaw.source):'NONE';
  const eventScope=['ACTIVE_EVENT','NAMED_EVENT','ALL_EVENTS','INHERITED','UNRESOLVED'].includes(trim(eventRaw.scope))?trim(eventRaw.scope):'UNRESOLVED';
  const eventSource=['EXPLICIT','INHERITED','SCREEN','NONE'].includes(trim(eventRaw.source))?trim(eventRaw.source):'NONE';
  const operation=['SUMMARY','LIST','DETAIL','TOTAL','RANKING','COMPARE','REVIEW','GRAPH','TABLE','EXPLAIN','SEARCH','OTHER'].includes(trim(raw?.operation))?trim(raw.operation):'OTHER';
  const purchaseStatus=['REALIZED','PENDING','ALL','NA'].includes(trim(filtersRaw.purchase_status))?trim(filtersRaw.purchase_status):'NA';
  return {
    mode,
    route,
    subject:{type:subjectType,value:clean(subjectRaw.value,140),source:subjectSource},
    event:{scope:eventScope,value:clean(eventRaw.value,180),source:eventSource},
    operation,
    filters:{
      exact_subject:filtersRaw.exact_subject===true,
      purchase_status:purchaseStatus,
      ticket:clean(filtersRaw.ticket,80),
      store:clean(filtersRaw.store,140),
      donor:clean(filtersRaw.donor,140)
    },
    inheritance:{
      subject:inheritanceRaw.subject===true,
      event:inheritanceRaw.event===true,
      route:inheritanceRaw.route===true,
      topic:inheritanceRaw.topic===true
    },
    confidence:clamp01(raw?.confidence),
    reason:clean(raw?.reason,180)
  };
}


function normMatch(value){
  return clean(value,600).toLocaleLowerCase('es-ES').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
}
function messageMentions(message,value){
  const a=normMatch(message),b=normMatch(value);
  return !!(a&&b&&a.includes(b));
}
function looksEventLikeValue(value){ const n=normMatch(value); return /^(?:sysa\b|.*\b20\d{2}\b|.*\bjornada\b|.*\bevento\b|.*\bcuotas\b|.*\bingresos y gastos\b)/i.test(n); }
function priorTurns(input){ return arr(input?.prior_turns); }
function recentPersonFromHistory(input){
  const p=priorTurns(input);
  for(let i=p.length-1;i>=0;i--){
    const resultSubject=clean(p[i]?.result_subject,120);
    if(resultSubject&&!looksEventLikeValue(resultSubject)&&!/^(none|all|unknown)$/i.test(resultSubject))return resultSubject;
    // En un filtro corto manda el sujeto REAL del turno inmediatamente anterior, aunque el
    // Router sombra anterior hubiese arrastrado por error un prior_subject más viejo.
    const combined=`${clean(p[i]?.user,420)} ${clean(p[i]?.assistant_tail,360)}`;
    const patterns=[
      /\b(?:actividad|dossier|compras|ingresos|responsabilidad|datos|registros|tareas)\s+(?:de|del)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ-]{2,30})\b/,
      /\b(?:para|sobre|sin\s+contar\s+a|de)\s+([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ-]{2,30})\b/
    ];
    for(const re of patterns){const m=combined.match(re);if(m&&m[1]&&!looksEventLikeValue(m[1])&&!/^(control|evento|datos|tabla)$/i.test(m[1]))return m[1];}
    const priorSubject=clean(p[i]?.prior_subject,120);
    if(priorSubject&&!looksEventLikeValue(priorSubject)&&!/^(none|all|unknown)$/i.test(priorSubject))return priorSubject;
  }
  return '';
}
function recentSpecificEventForYear(input,year){
  const y=String(year||'').trim(),p=priorTurns(input);
  for(let i=p.length-1;i>=0;i--){ for(const v of [p[i]?.result_event,p[i]?.prior_event]){ const c=clean(v,180); if(c&&(!y||c.includes(y))&&looksEventLikeValue(c)&&!/^[12]\d{3}$/.test(c)) return c; } }
  const screen=clean(input?.screen_event?.title,180); return screen&&(!y||screen.includes(y))?screen:'';
}
export function applyZuzuRouterGuardrails(decision,input){
  const d=decision&&typeof decision==='object'?decision:null;
  if(!d) return d;
  const msg=clean(input?.message,3000);
  const msgN=normMatch(msg);
  const screenTitle=clean(input?.screen_event?.title,180);
  const deicticEvent=/\b(este evento|el evento actual|evento actual|en este evento|aqui|aquí)\b/i.test(msg);
  const personRoute=/^PERSON_/.test(d.route||'');
  const filterContinuation=/^(?:dame\s+)?(?:solo|incluye|excluye|ahora\s+solo|ahora\s+sin|tambien|también|sin\s+contar)\b/i.test(msgN);
  const continuationCue=/^(?:y\b|pero\b|dime\s+mas|dime\s+más|dame\b|continua|continúa|lo\s+mismo|ahora\b|solo\b|incluye\b|excluye\b|revisa\b|comprueba\b|seguro\b|entonces\b)/i.test(msgN);
  const ceDomainSignal=/\b(eventos?|sysa|compras?|tickets?|tk|ingresos?|donaciones?|donantes?|donante|hitos?|tareas?|lg|lgs|banco|movimientos?|mvtos?|saldo|asistentes?|socios?|tiendas?|proveedores?|documentos?|graficas?|gráficas?|tablas?|responsabilidad|directos|compartidos)\b/i.test(msgN);

  // Los filtros cortos no pueden convertirse en sujetos nuevos.
  if(filterContinuation && /^PERSON_/.test(d.route||'')){
    const recentPerson=recentPersonFromHistory(input);
    const currentSubject=clean(d.subject?.value,120);
    const currentExplicitlyNamed=currentSubject&&messageMentions(msg,currentSubject);
    if(recentPerson && !currentExplicitlyNamed && (d.subject?.type!=='PERSON' || looksEventLikeValue(currentSubject) || !currentSubject || normMatch(currentSubject)!==normMatch(recentPerson))){
      d.subject={type:'PERSON',value:recentPerson,source:'INHERITED'};
      if(d.inheritance)d.inheritance.subject=true;
      d.reason=clean((d.reason?d.reason+' ':'')+'CE conserva la persona real del turno inmediatamente anterior; el mensaje actual es un filtro sin sujeto nuevo explícito.',180);
    }
  }

  // Una ruta personal no puede llevar como evento el propio nombre de la persona.
  if(/^PERSON_/.test(d.route||'') && d.subject?.type==='PERSON' && normMatch(d.event?.value) && normMatch(d.event?.value)===normMatch(d.subject?.value)){
    d.event={scope:'ALL_EVENTS',value:'',source:'NONE'};
    if(d.inheritance)d.inheritance.event=false;
    d.reason=clean('CE elimina un evento imposible que coincidía con el nombre de la persona.',180);
  }

  // Si Gemini dejó solo un año, recupera el evento específico reciente de ese año cuando exista.
  if(/^PERSON_/.test(d.route||'') && /^20\d{2}$/.test(clean(d.event?.value,20))){
    const ev=recentSpecificEventForYear(input,d.event.value);
    if(ev){d.event={scope:'NAMED_EVENT',value:ev,source:'INHERITED'};if(d.inheritance)d.inheritance.event=true;}
  }

  // «Ahora solo SySA» conserva la persona y concreta el SySA reciente.
  if(/^PERSON_/.test(d.route||'') && /\bsolo\s+sysa\b/i.test(msgN)){
    const rp=recentPersonFromHistory(input),ym=(msgN.match(/\b20\d{2}\b/)||[])[0]||'',ev=recentSpecificEventForYear(input,ym);
    if(rp)d.subject={type:'PERSON',value:rp,source:'INHERITED'};
    if(ev)d.event={scope:'NAMED_EVENT',value:ev,source:'INHERITED'};
  }

  // El evento visible en pantalla nunca debe contaminar una consulta personal global.
  if(personRoute && d.subject?.type==='PERSON' && d.event?.source==='SCREEN' && !deicticEvent && !messageMentions(msg,screenTitle)){
    d.event={scope:'ALL_EVENTS',value:'',source:'NONE'};
    if(d.inheritance) d.inheritance.event=false;
    d.reason=clean((d.reason?d.reason+' ':'')+'CE corrige ámbito: persona explícita sin evento nombrado => todos los eventos.',180);
  }

  // Combinaciones imposibles: una ruta PERSON_* no puede tratar un EVENT como persona.
  if(personRoute && d.subject?.type==='EVENT'){
    const map={
      PERSON_OVERVIEW:'EVENT_OVERVIEW',
      PERSON_PARTICIPATION:'EVENT_PEOPLE_INCOMES',
      PERSON_PURCHASES:'EVENT_PURCHASES',
      PERSON_INCOMES:'EVENT_PEOPLE_INCOMES',
      PERSON_DONATIONS:'EVENT_DONATIONS',
      PERSON_MANAGEMENT:'EVENT_MANAGEMENT'
    };
    if(map[d.route]){
      d.route=map[d.route];
      const eventValue=clean(d.event?.value||d.subject?.value,180);
      d.event={scope:'NAMED_EVENT',value:eventValue,source:'EXPLICIT'};
      d.reason=clean('CE valida tipo: el sujeto es un EVENTO, por lo que la consulta se enruta a '+d.route+'.',180);
    }
  }

  // «Quién asistió a EVENTO» es una consulta del evento, no participación histórica de una persona.
  if(d.route==='PERSON_PARTICIPATION' && d.event?.value && /\b(quien|quienes|asistio|asistieron|asistentes)\b/i.test(msgN)){
    d.route='EVENT_PEOPLE_INCOMES'; d.operation='LIST';
    d.reason=clean('CE valida semántica: se pide la lista de asistentes de un evento.',180);
  }

  // «Ingresos de EVENTO» pertenece a la tubería de personas/ingresos del evento.
  if(d.route==='PERSON_INCOMES' && d.event?.value && (d.subject?.value===d.event?.value || d.subject?.type==='EVENT')){
    d.route='EVENT_PEOPLE_INCOMES';
    d.reason=clean('CE valida semántica: se preguntan ingresos de un evento, no de una persona.',180);
  }

  // Diferencia saldo operativo de saldo bancario.
  if(d.route==='BANK' && /\bsaldo\b/i.test(msgN) && !/\b(banco|bancario|bancaria|cuenta|conciliacion|cuadre|movimiento|extracto)\b/i.test(msgN)){
    d.route='EVENT_OVERVIEW'; d.operation='TOTAL';
    d.reason=clean('CE valida semántica: «saldo» sin referencia bancaria se interpreta como saldo operativo del evento.',180);
  }

  // Si pregunta qué/cuáles tickets justifican cargos, el resultado esperado es una lista/detalle de tickets.
  if(d.route==='BANK' && /\b(ticket|tickets|tk\d*)\b/i.test(msgN) && /\b(cargo|cargos|justifica|justifican|justificado|justificados)\b/i.test(msgN)){
    d.operation='LIST';
  }

  if(d.operation==='COMPARE' && /,/.test(clean(d.event?.value,220)) && d.route==='EVENTS_ANALYSIS'){
    d.route='COMPARE_EVENTS'; d.reason=clean('CE valida operación: comparar dos eventos usa COMPARE_EVENTS.',180);
  }
  if(d.route==='STORE_PURCHASES' && d.operation==='RANKING' && !(d.subject?.type==='STORE'&&d.subject?.source==='EXPLICIT'&&d.subject?.value)){
    d.route='EVENT_BREAKDOWN'; d.subject={type:'NONE',value:'',source:'NONE'}; d.reason=clean('CE valida semántica: ranking de tiendas del evento => EVENT_BREAKDOWN.',180);
  }
  if(d.mode==='CONVERSATION' && msgN.split(/\s+/).filter(Boolean).length>=4 && !ceDomainSignal && !continuationCue){
    d.route='UNKNOWN'; d.subject={type:'NONE',value:'',source:'NONE'}; d.event={scope:'UNRESOLVED',value:'',source:'NONE'}; d.operation='OTHER';
    d.inheritance={subject:false,event:false,route:false,topic:false}; d.confidence=Math.min(d.confidence||0.5,0.65); d.reason='CE detecta un mensaje ajeno al dominio y no hereda por inercia el contexto anterior.';
  }
  return d;
}

export async function classifyZuzuShadow({prompt,selectedEventId,selectedEventTitle,conversationHistory,conversationContext,usuarioLogado,user,authUser,ce_acceso}={}){
  const userPrompt=clean(prompt,3000);
  const history=compactRouterHistory(conversationHistory);
  const mode=sessionMode(history);
  if(!userPrompt) return {ok:false,shadow:true,mode,error:'Prompt vacío para Router sombra.'};
  const apiKey=geminiKey();
  if(!apiKey) return {ok:false,shadow:true,mode,error:'Router sombra sin GEMINI_API_KEY.',decision:null,usage:{calls:0,promptTokens:0,candidateTokens:0,outputTokens:0,hiddenOutputTokens:0,totalTokens:0,costUsd:0,costEurApprox:0}};
  const logged=usuarioLogado||authUser||user||{};
  const input={
    session_mode:mode,
    message:userPrompt,
    screen_event:{id:clean(selectedEventId,120),title:clean(selectedEventTitle,180)},
    logged_user:{identificacion:clean(logged?.identificacion||logged?.Identificacion||logged?.usuario||'',100),nombre:clean(logged?.nombre||logged?.Nombre||logged?.name||'',120),nivel:clean(logged?.nivel||logged?.Nivel||ce_acceso||'',40)},
    prior_turns:history,
    conversation_context:compactConversationContext(conversationContext)
  };
  const model=routerModel();
  const body={
    contents:[{role:'user',parts:[{text:routerInstruction(input)}]}],
    generationConfig:{responseMimeType:'application/json',responseSchema:routerSchema(),temperature:0,maxOutputTokens:700}
  };
  const controller=new AbortController();
  const timeoutMs=Math.max(2500,Math.min(12000,Number(process.env.CONTROLEVENT_ZUZU_ROUTER_TIMEOUT_MS||7000)));
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':apiKey},body:JSON.stringify(body),signal:controller.signal});
    const payload=await res.json().catch(async()=>({error:{message:await res.text().catch(()=>res.statusText)}}));
    const usage=estimateUsage(model,payload);
    if(!res.ok) return {ok:false,shadow:true,mode,model,usage,error:clean(payload?.error?.message||`Gemini Router HTTP ${res.status}`,400)};
    const parsed=parseJsonText(outputText(payload));
    if(!parsed) return {ok:false,shadow:true,mode,model,usage,error:'Gemini Router no devolvió JSON legible.'};
    const rawDecision=normalizeDecision(parsed,mode);
    const rawDecisionSnapshot=JSON.parse(JSON.stringify(rawDecision));
    const decision=applyZuzuRouterGuardrails(rawDecision,input);
    const guardrailApplied=JSON.stringify(rawDecisionSnapshot)!==JSON.stringify(decision);
    return {ok:true,shadow:true,model,usage,decision,rawDecision:rawDecisionSnapshot,guardrailApplied,generatedAt:new Date().toISOString()};
  }catch(error){
    const msg=error?.name==='AbortError'?`Router sombra agotó ${Math.round(timeoutMs/1000)} s sin afectar a la respuesta principal.`:clean(error?.message||error,400);
    return {ok:false,shadow:true,mode,model,error:msg,usage:{calls:0,promptTokens:0,candidateTokens:0,outputTokens:0,hiddenOutputTokens:0,totalTokens:0,costUsd:0,costEurApprox:0}};
  }finally{ clearTimeout(timer); }
}
