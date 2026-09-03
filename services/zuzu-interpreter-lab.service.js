/* ControlEvent v4_1_exp · ITV INTÉRPRETE GEMINI V2.3 · PARÁFRASIS HARDENED
   Laboratorio AISLADO: ENRIQUECIMIENTO determinista -> Gemini entiende conceptos ->
   TRADUCTOR determinista a contratos CE -> auditoría. NO ejecuta CE, NO consulta Supabase,
   NO usa function calling y NO modifica el runtime Zuzu. */
import { auditCapabilityCall, capabilityDefinition } from './zuzu-capability-registry.service.js';

const text=v=>v==null?'':String(v),trim=v=>text(v).trim(),arr=v=>Array.isArray(v)?v:[],num=v=>Number(v)||0;
const round=(v,d=6)=>{const p=10**d;return Math.round((Number(v)||0)*p)/p;};
const clone=v=>JSON.parse(JSON.stringify(v));
const norm=v=>trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const same=(a,b)=>norm(a)===norm(b);

function geminiKey(){return process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||process.env.CONTROLEVENT_GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||'';}
function interpreterModel(){return trim(process.env.CONTROLEVENT_ZUZU_INTERPRETER_MODEL||process.env.CONTROLEVENT_ZUZU_PLANNER_MODEL||'gemini-2.5-flash-lite').replace(/^models\//,'');}
function timeoutSignal(ms=30000,externalSignal=null){const c=new AbortController(),timer=setTimeout(()=>c.abort(new Error('timeout')),ms),abort=()=>c.abort(externalSignal?.reason||new Error('aborted'));externalSignal?.addEventListener?.('abort',abort,{once:true});return{signal:c.signal,dispose:()=>{clearTimeout(timer);externalSignal?.removeEventListener?.('abort',abort);}};}
function estimateCost(model,usage={}){const input=num(usage.promptTokenCount||usage.promptTokens),output=num(usage.candidatesTokenCount||usage.outputTokens),lite=/flash-lite/i.test(model),ir=lite?0.10:0.30,or=lite?0.40:2.50;return round(input/1e6*ir+output/1e6*or,6);}
function extractCandidateText(payload={}){return arr(payload?.candidates)[0]?.content?.parts?.map(p=>trim(p?.text)).filter(Boolean).join('\n')||'';}

/* V2.3 conserva la distinción entre transporte limpio de intención recuperable. Si Gemini añade basura después
   de un objeto JSON completo, la intención aún puede analizarse sin una segunda llamada IA. */
function firstJsonObject(raw=''){
  const s=trim(raw).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  const start=s.indexOf('{');if(start<0)return'';
  let depth=0,inString=false,escape=false;
  for(let i=start;i<s.length;i++){
    const ch=s[i];
    if(inString){if(escape){escape=false;continue;}if(ch==='\\'){escape=true;continue;}if(ch==='"')inString=false;continue;}
    if(ch==='"'){inString=true;continue;}if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0)return s.slice(start,i+1);}
  }
  return'';
}
function parseConceptPlan(raw=''){
  const cleaned=trim(raw).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  if(!cleaned)return{parsed:false,transportClean:false,recovered:false,error:'respuesta vacía',plan:null};
  try{return{parsed:true,transportClean:true,recovered:false,error:'',plan:JSON.parse(cleaned)};}catch(strictErr){
    const first=firstJsonObject(cleaned);if(!first)return{parsed:false,transportClean:false,recovered:false,error:strictErr.message||'JSON inválido',plan:null};
    try{return{parsed:true,transportClean:false,recovered:true,error:'',plan:JSON.parse(first)};}catch(e){return{parsed:false,transportClean:false,recovered:false,error:e.message||'JSON inválido',plan:null};}
  }
}

/* Fixture de reconocimiento: simula únicamente el servicio barato que CE ya posee conceptualmente:
   nombres conocidos -> tipo/canónico. No decide qué quiere el usuario. */
const ENTITY_FIXTURE=Object.freeze([
  {canonical:'Colty',type:'PERSON'},{canonical:'Esther',type:'PERSON'},{canonical:'Pocholo',type:'PERSON'},
  {canonical:'SySA 2024',type:'EVENT'},{canonical:'SySA 2025',type:'EVENT'},{canonical:'SySA 2026',type:'EVENT'},{canonical:'FUNCION 2026',type:'EVENT'}
]);
function mentioned(haystack,name){const h=` ${norm(haystack)} `,n=` ${norm(name)} `;return h.includes(n);}
/* Distancia Damerau-Levenshtein acotada: una transposición oral/escrita cuenta como un error.
   V2.3 endurece el fuzzy para evitar falsos positivos como "corto" -> "Colty" sin perder
   Sisa/SySA, Pohcolo/Pocholo o Colti/Colty. */
function editDistance(a='',b=''){
  a=norm(a);b=norm(b);const m=a.length,n=b.length,dp=Array.from({length:m+1},()=>Array(n+1).fill(0));
  for(let i=0;i<=m;i++)dp[i][0]=i;for(let j=0;j<=n;j++)dp[0][j]=j;
  for(let i=1;i<=m;i++)for(let j=1;j<=n;j++){
    const cost=a[i-1]===b[j-1]?0:1;dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])dp[i][j]=Math.min(dp[i][j],dp[i-2][j-2]+1);
  }
  return dp[m][n];
}
function fuzzyMentioned(haystack,name){
  const ht=norm(haystack).split(' ').filter(Boolean),nt=norm(name).split(' ').filter(Boolean);if(!ht.length||!nt.length)return false;
  for(const token of nt.filter(t=>/^\d+$/.test(t)))if(!ht.includes(token))return false;
  const words=nt.filter(t=>!/^\d+$/.test(t));if(!words.length)return false;
  return words.every(w=>ht.some(t=>{if(t.length<3)return false;const max=w.length<=7?1:w.length<=12?2:Math.max(2,Math.floor(w.length*.18));return editDistance(t,w)<=max;}));
}
function enrichState(caseDef={},entityFixture=ENTITY_FIXTURE){
  const state=clone(caseDef.context||{}),recognized=[];
  const fixture=arr(entityFixture).length?arr(entityFixture):ENTITY_FIXTURE;
  for(const e of fixture){if(mentioned(caseDef.prompt,e.canonical))recognized.push({...e,source:'literal_catalog_match'});else if(fuzzyMentioned(caseDef.prompt,e.canonical))recognized.push({...e,source:'fuzzy_catalog_match'});}
  if(state?.screen_event&&!recognized.some(e=>same(e.canonical,state.screen_event)))recognized.push({canonical:state.screen_event,type:'EVENT',source:'screen_event'});
  const focusType=norm(state?.active_focus?.type);for(const e of arr(state?.active_focus?.entities)){const type=focusType.includes('person')?'PERSON':focusType.includes('event')?'EVENT':'';if(type&&!recognized.some(x=>same(x.canonical,e)))recognized.push({canonical:e,type,source:'active_focus'});}
  for(const p of arr(state?.recent_entities))if(!recognized.some(e=>same(e.canonical,p)))recognized.push({canonical:p,type:'PERSON',source:'recent_entity'});
  const datasets=arr(state.visible_datasets).map(d=>({dataset_id:d.dataset_id,table_key:d.table_key,title:d.title,columns:arr(d.columns),hidden_columns:arr(d.hidden_columns),row_count:d.row_count,base_row_count:d.base_row_count,view_filters:arr(d.view_filters)}));
  if(state.current_dataset&&state.current_dataset.dataset_id&&!datasets.some(d=>d.dataset_id===state.current_dataset.dataset_id))datasets.unshift(clone(state.current_dataset));
  const datasetHints=[];
  for(const d of datasets){
    const title=trim(d.title);if(!title)continue;
    const first=trim(title.split('·')[0]);
    if(first&&mentioned(caseDef.prompt,first))datasetHints.push({dataset_id:d.dataset_id,table_key:d.table_key,title:d.title,source:'title_match'});
  }
  return{...state,recognized_entities:recognized,available_datasets:datasets,dataset_hints:datasetHints};
}

/* Lenguaje conceptual: Gemini NO conoce arrays/aliases/contratos CE. */
const CONCEPT_TYPES=Object.freeze(['DATA','TABLE','CALCULATE','MEMORY','PERSON','CHAT','CLARIFY','UNSUPPORTED']);
const DATA_REQUESTS=Object.freeze(['event_summary','event_purchases','event_income_status','event_liquidations','compare_events','event_weather','event_documentation','event_bank']);
const TABLE_REQUESTS=Object.freeze(['select','filter','hide','show_sort','reset','summarize','analyze']);
const PERSON_REQUESTS=Object.freeze(['profile','events','event_status']);
const MEMORY_REQUESTS=Object.freeze(['search','read','summarize']);
const CHAT_REQUESTS=Object.freeze(['social','session_summary']);

function systemInstruction(){return `Eres el INTÉRPRETE CONCEPTUAL AISLADO de ControlEvent. NO respondas al usuario y NO escribas contratos CE. Decide únicamente QUÉ quiere hacer el usuario y SOBRE QUÉ objetos.

Devuelve EXCLUSIVAMENTE un JSON con estas claves simples:
{
  "type":"DATA|TABLE|CALCULATE|MEMORY|PERSON|CHAT|CLARIFY|UNSUPPORTED",
  "request":"...",
  "events":["..."],
  "people":["..."],
  "dataset":"id opcional",
  "field":"campo opcional",
  "values":["..."],
  "column":"columna opcional",
  "sort":{"field":"...","direction":"asc|desc"},
  "query":"texto libre solo cuando no haya un sujeto reconocido suficiente",
  "result_index":1,
  "status":"opcional",
  "detail":"standard|full opcional",
  "analysis":false,
  "summary":"frase interna breve"
}

VOCABULARIO CONCEPTUAL:
DATA request = event_summary | event_purchases | event_income_status | event_liquidations | compare_events | event_weather | event_documentation | event_bank.
TABLE request = select | filter | hide | show_sort | reset | summarize | analyze.
CALCULATE request = MAX | MIN | SUM | AVG | COUNT.
MEMORY request = search | read | summarize.
PERSON request = profile | events | event_status.
CHAT request = social para saludo/charla conversacional que no requiere datos | session_summary cuando se pide resumir la conversación ACTUAL.
CLARIFY = existe una ambigüedad real que impide saber sobre qué entidad actuar.
UNSUPPORTED = ControlEvent no dispone de esa capacidad.

SEMÁNTICA DE CAPACIDADES:
- DATA/event_summary = visión general / estado global / puesta al día de un evento. Es la opción para conocer cómo está el evento en conjunto.
- DATA/event_documentation = SOLO documentos, archivos o documentación vinculada al evento. NUNCA sustituye a event_summary.
- DATA/event_purchases ya significa las compras realizadas del evento en el contrato actual; no necesitas repetir status=realized.
- DATA/event_income_status usa por defecto el estado pending en el contrato actual; no necesitas repetir status=pending cuando eso es lo pedido.
- DATA/event_bank = Cuadre Banco / cuadre bancario / conciliación bancaria del evento: movimientos bancarios, saldos, vínculos y situación de conciliación. Si el sujeto explícito es banco, cuenta bancaria, cuadre o conciliación bancaria, usa event_bank. NUNCA lo sustituyas por event_liquidations.
- DATA/event_liquidations = liquidaciones de compras entre la caja de la Peña y responsables de compras. DEBE significa que SALE dinero de la caja de la Peña; HABER significa que ENTRA dinero en la caja de la Peña. Es independiente del Cuadre Banco y NUNCA representa una consulta sobre banco, cuenta bancaria, cuadre o conciliación bancaria. Por defecto detail=standard: movimientos de caja + Ticket/s + resumen suficiente de cada Ticket. Si el usuario pide TODO el detalle, todas las líneas o todos los productos de los Tickets incluidos, usa detail=full: CE consultará COMPRAS por esos TKxx. Puedes usar people:[persona] para limitar la liquidación a una persona.
- DATA/compare_events obtiene una comparación NUEVA entre eventos identificados. Si ya existe una tabla de comparación en available_datasets y el usuario pregunta por conclusiones, incoherencias o rarezas de ESA tabla, usa TABLE/analyze.
- PERSON/profile describe datos de la persona en general; no recupera conversaciones pasadas.
- PERSON/events obtiene los eventos relacionados con la persona.
- PERSON/event_status describe la situación/estado de una persona DENTRO de un evento concreto y requiere people + events.
- MEMORY/search busca conversaciones históricas o recuerdos previos sobre un sujeto/tema. Si la petición trata de si ya se habló o se recuerda algo anteriormente, es MEMORY, aunque el sujeto sea una PERSON.
- MEMORY se refiere EXCLUSIVAMENTE a conversaciones históricas/recuerdos almacenados. No lo uses para resumir la conversación actual.
- CHAT/social se usa para saludos o charla social simple; NO lo conviertas en session_summary.
- CHAT/session_summary se usa SOLO para resumir lo ocurrido en la sesión/conversación ACTUAL usando session_ledger.
- TABLE/select cambia a una tabla YA materializada; no elimina filtros por sí mismo.
- TABLE/reset restaura la tabla actual a todas sus filas quitando filtros.
- CALCULATE opera únicamente sobre campos de una tabla ya materializada en current_dataset/available_datasets. No predice valores futuros ni inventa campos/datos.
- UNSUPPORTED se usa cuando la petición exige una capacidad o un dato que ControlEvent no posee, especialmente predicciones futuras sin datos/capacidad predictiva.

REGLAS:
- recognized_entities informa qué nombres existen y de qué tipo son. Úsalo como conocimiento, no como orden.
- Si entity_resolution.status="ambiguous", responde CLARIFY. No elijas tú un candidato.
- available_datasets contiene tablas ya materializadas. Si el usuario quiere volver, mostrar o trabajar con una de ellas, prioriza TABLE sobre volver a consultar DATA.
- Si una pregunta analítica se refiere a una tabla ya materializada (incluida una comparación), usa TABLE/analyze o TABLE/summarize según corresponda; no reconstruyas la fuente.
- Para varias personas usa people:[...], no inventes una identidad compuesta.
- Los pronombres se resuelven con active_focus/recent_entities/screen_event. Si active_focus.type es person/multi_person, sus entities son PERSON y nunca deben colocarse en events ni reinterpretarse como eventos. Si active_focus.type es event/multi_event, sus entities son EVENT y nunca deben colocarse en people.
- Los tipos de recognized_entities son autoritativos: una entidad type=PERSON solo puede ir en people; una type=EVENT solo puede ir en events.
- Si memory_matches contiene resultados y el usuario pide abrir/leer/entrar en uno de ellos, usa MEMORY/read con result_index. MEMORY/search se reserva para iniciar una búsqueda NUEVA de recuerdos, no para abrir resultados ya encontrados.
- TABLE/filter expresa field + values. No construyas view_filters.
- TABLE/hide expresa column. TABLE/show_sort expresa column + sort. No construyas visible_columns/view_sort.
- TABLE/reset significa quitar filtros/restaurar todas las filas de la tabla actual; TABLE/select solo selecciona una tabla distinta o ya materializada.
- MEMORY/search: si el sujeto ya aparece en recognized_entities, usa people:[...] y no es obligatorio query. Usa query para temas libres no representados por una entidad reconocida.
- CALCULATE: expresa request + field sobre una tabla existente. No inventes label; el traductor CE puede deducir una columna descriptiva si es inequívoca. Usa column solo si el usuario la identifica explícitamente.
- Si la petición requiere conocer un valor futuro que no existe en ningún dataset/capacidad, responde UNSUPPORTED; no simules una predicción con COUNT, PERSON/event_status ni otra operación factual.
- No repitas parámetros que ya estén fijados inequívocamente por type/request y por el contrato conceptual.
- El runtime decide de forma determinista analysis para TABLE/analyze, TABLE/summarize, MEMORY/summarize y CALCULATE. No necesitas acertar esa bandera en esos casos.
- En DATA/compare_events usa analysis=true únicamente si el usuario pide además interpretación/insights. En una comparación mecánica, false. No afecta a qué datos hay que obtener.`;}

function userInput(caseDef={},enrichedOverride=null){const enriched=enrichedOverride&&typeof enrichedOverride==='object'?enrichedOverride:enrichState(caseDef);return `ESTADO ENRIQUECIDO:\n${JSON.stringify(enriched)}\n\nMENSAJE DEL USUARIO:\n${caseDef.prompt}`;}

function c(id,category,prompts,context,expected,analysis=false,note=''){const ps=Array.isArray(prompts)?prompts:[prompts];if(ps.length!==3)throw new Error(`interp-${id} necesita exactamente 3 paráfrasis`);return{id:`interp-${String(id).padStart(2,'0')}`,category,prompts:ps,context,expected:{...expected,analysis},note};}
const BASE_CASES=Object.freeze([
  c(1,'DATA',['Dame un resumen de SySA 2026.','Ponme al día con SySA 2026.','Cuéntame cómo está Sisa 2026.'],{}, {type:'DATA',request:'event_summary',events:['SySA 2026']}),
  c(2,'DATA',['Sácame las compras realizadas de FUNCION 2026.','Enséñame lo que ya se ha comprado para FUNCION 2026.','¿Qué compras tenemos hechas en Funcion 2026?'],{}, {type:'DATA',request:'event_purchases',events:['FUNCION 2026']}),
  c(3,'DATA',['¿Qué ingresos están pendientes en SySA 2026?','Dime lo que queda por ingresar de SySA 2026.','En Sisa 2026, ¿qué ingresos faltan todavía?'],{}, {type:'DATA',request:'event_income_status',events:['SySA 2026']}),
  c(4,'DATA',['Compara SySA 2025 con SySA 2026 y luego dime qué te llama la atención.','Pon frente a frente SySA 2025 y SySA 2026 y cuéntame qué te parece destacable.','Mira Sisa 2025 contra Sisa 2026 y dime si hay algo que te llame la atención.'],{}, {type:'DATA',request:'compare_events',events:['SySA 2025','SySA 2026']},true),
  c(5,'DATA',['¿Qué tiempo hizo o se prevé para FUNCION 2026?','¿Qué tiempo hubo o se espera en FUNCION 2026?','Cuéntame el tiempo de Funcion 2026.'],{}, {type:'DATA',request:'event_weather',events:['FUNCION 2026']}),
  c(6,'MEMORY',['¿Recuerdas algo de Pocholo?','Busca si hemos hablado antes de Pocholo.','¿Te suena algo de Pohcolo?'],{}, {type:'MEMORY',request:'search',people:['Pocholo']}),
  c(7,'MEMORY',['Abre el primero de los recuerdos que acabas de encontrar.','Abre el recuerdo número uno.','Métete en el primero de esos recuerdos.'],{memory_matches:[{index:1,title:'Información de Pocholo'},{index:2,title:'Detalle de eventos de Pocholo'}]}, {type:'MEMORY',request:'read',result_index:1}),
  c(8,'MEMORY',['Resúmeme ese recuerdo en dos o tres ideas.','Hazme un resumen corto de ese recuerdo.','Cuéntame en tres ideas lo importante de lo que recordamos.'],{selected_memory_episode:{result_index:1,title:'Información de Pocholo'},current_dataset:{dataset_id:'memory-pocholo',title:'Conversación recordada · Información de Pocholo',table_key:'memory_turns',columns:['Fecha','Pregunta','Respuesta','Resumen']}}, {type:'MEMORY',request:'summarize'},true),
  c(9,'TABLE',['De las tablas que acabas de mostrar, enséñame Economía.','De esas tablas, ponme la de Economía.','Quiero volver a ver Economía, no Asistencia.'],{visible_datasets:[{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5},{dataset_id:'att-sysa26',table_key:'attendance_chart',title:'Asistencia · SySA 2026',columns:['Indicador','Valor'],row_count:3}]}, {type:'TABLE',request:'select',dataset:'econ-sysa26'}),
  c(10,'TABLE',['Quédate solo con las filas cuyo Indicador sea Ingresos o Compras realizadas.','Déjame únicamente Ingresos y Compras realizadas.','Filtra esa tabla para que solo salgan Ingresos o Compras realizadas.'],{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5}}, {type:'TABLE',request:'filter',field:'Indicador',values:['Ingresos','Compras realizadas']}),
  c(11,'TABLE',['Oculta la columna Valor.','Quítame de la vista la columna Valor.','No quiero ver Valor en esta tabla.'],{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2}}, {type:'TABLE',request:'hide',column:'Valor'}),
  c(12,'TABLE',['Recupérala y ordénalo por Valor de mayor a menor.','Vuelve a mostrar Valor y ordénala de más a menos por esa columna.','Recupera Valor y pon primero los importes más altos.'],{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],hidden_columns:['Valor'],row_count:2}}, {type:'TABLE',request:'show_sort',column:'Valor',sort:{field:'Valor',direction:'desc'}}),
  c(13,'CALCULATE',['¿Cuál de esas filas tiene el Valor más alto y cuánto es?','De esas dos, ¿cuál tiene el importe mayor?','Dime la fila con más Valor y su cifra.'],{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2}}, {type:'CALCULATE',request:'MAX',field:'Valor'}),
  c(14,'TABLE',['Quita los filtros y déjala completa otra vez.','Vuelve a enseñarme todas las filas.','Déjala como estaba antes de filtrar.'],{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2,base_row_count:5,view_filters:[{field:'Indicador',operator:'eq',value:'Ingresos'},{field:'Indicador',operator:'eq',value:'Compras realizadas'}]}}, {type:'TABLE',request:'reset'}),
  c(15,'TABLE',['Volvamos a la tabla de Economía de SySA 2026 que dejamos antes.','Regresa a Economía de SySA 2026.','Quiero la tabla de Economía que teníamos antes.'],{current_dataset:{dataset_id:'person-events-colty',table_key:'person_events',title:'Eventos · Colty',columns:['Evento','Fecha']},visible_datasets:[{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2},{dataset_id:'person-events-colty',table_key:'person_events',title:'Eventos · Colty',columns:['Evento','Fecha'],row_count:17}]}, {type:'TABLE',request:'select',dataset:'econ-sysa26'}),
  c(16,'PERSON',['Háblame de Colty.','Cuéntame quién es Colty.','Háblame un poco de Colti.'],{}, {type:'PERSON',request:'profile',people:['Colty']}),
  c(17,'PERSON',['Háblame de Colty y Esther.','Dame información de Colty y de Esther.','Cuéntame cosas de Esther y Colti.'],{}, {type:'PERSON',request:'profile',people:['Colty','Esther']}),
  c(18,'REFERENT',['¿En qué eventos aparecen?','¿Dónde han participado los dos?','Dime los eventos en los que estuvieron Colty y Esther.'],{recent_entities:['Colty','Esther'],active_focus:{type:'multi_person',entities:['Colty','Esther']}}, {type:'PERSON',request:'events',people:['Colty','Esther']}),
  c(19,'REFERENT',['¿Y sus eventos?','¿En qué eventos ha estado?','Dime dónde ha participado Pocholo.'],{recent_entities:['Pocholo'],active_focus:{type:'person',entities:['Pocholo']}}, {type:'PERSON',request:'events',people:['Pocholo']}),
  c(20,'REFERENT',['¿Y sus compras?','¿Qué se ha comprado para ese evento?','Y de SySA 2026, sácame las compras.'],{screen_event:'SySA 2026',active_focus:{type:'event',entities:['SySA 2026']}}, {type:'DATA',request:'event_purchases',events:['SySA 2026']}),
  c(21,'MULTI',['Dime el estado de Colty en SySA 2026 y de Esther en ese mismo evento.','¿Cómo figuran Colty y Esther dentro de SySA 2026?','En Sisa 2026 dime la situación de Colti y Esther.'],{}, {type:'PERSON',request:'event_status',people:['Colty','Esther'],events:['SySA 2026']}),
  c(22,'MULTI',['Compara SySA 2024, SySA 2025 y SySA 2026.','Compárame SySA 2024 con SySA 2025 y SySA 2026.','Quiero ver diferencias entre Sisa 2024, Sisa 2025 y Sisa 2026.'],{}, {type:'DATA',request:'compare_events',events:['SySA 2024','SySA 2025','SySA 2026']},false,'Comparar mecánicamente no obliga a una segunda IA.'),
  c(23,'ANALYSIS',['De toda esta tabla, dime solo lo que merece que me preocupe.','De esta tabla, dime qué debería preocuparme.','Mira estos datos y señala solo lo que veas preocupante.'],{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5}}, {type:'TABLE',request:'analyze'},true),
  c(24,'ANALYSIS',['¿Ves alguna incoherencia entre estos dos eventos?','¿Hay algo que no cuadre entre los dos eventos?','Revisa la comparación y dime si ves cosas raras.'],{visible_datasets:[{dataset_id:'cmp-sysa',table_key:'comparison',title:'Comparación SySA 2025 vs SySA 2026',columns:['Evento','Ingresos','Compras','Donaciones','Saldo']}]}, {type:'TABLE',request:'analyze'},true),
  c(25,'CHAT',['Hola Zuzu, ¿qué tal?','Buenas, Zuzu.','Ey Zuzu, ¿cómo va?'],{}, {type:'CHAT',request:'social'}),
  c(26,'CHAT',['Resúmeme qué hemos hecho en esta conversación y qué queda abierto.','Recuérdame qué hemos tratado aquí y qué nos queda.','Hazme un resumen de esta charla hasta ahora y de lo pendiente.'],{session_ledger:[{kind:'memory',value:'Pocholo'},{kind:'event',value:'SySA 2026'},{kind:'dataset',value:'Economía · SySA 2026'},{kind:'person',value:'Colty'},{kind:'person',value:'Esther'}]}, {type:'CHAT',request:'session_summary'}),
  c(27,'CLARIFY',['Dime cosas de Manolo.','Háblame de Manolo.','Quiero información sobre Manolo.'],{entity_resolution:{query:'Manolo',status:'ambiguous',candidates:['Pocholo','Pocholo y Celes']}}, {type:'CLARIFY'}),
  c(28,'UNSUPPORTED',['Predice cuántos cubatas beberá cada persona en el próximo evento.','Dime cuántos cubatas va a beber cada uno en el próximo evento.','Pronostica el consumo individual de cubatas de la próxima fiesta.'],{}, {type:'UNSUPPORTED'}),
  c(29,'DATA',['Enséñame los documentos del evento que tengo abierto.','Muéstrame los documentos del evento actual.','Quiero ver la documentación del evento que está en pantalla.'],{screen_event:'FUNCION 2026'}, {type:'DATA',request:'event_documentation',events:['FUNCION 2026']}),
  c(30,'DATA',['¿Qué hay en el cuadre bancario de SySA 2026?','¿Cómo está el banco de SySA 2026?','Dame la situación de conciliación bancaria de Sisa 2026.'],{}, {type:'DATA',request:'event_bank',events:['SySA 2026']})
]);

function scalarMatch(actual,expected){return expected===undefined||same(actual,expected);}
function listMatch(actual,expected){if(expected===undefined)return true;const a=arr(actual).map(norm),e=arr(expected).map(norm);return e.length===a.length&&e.every(x=>a.includes(x));}
const DERIVE_REQUESTS=Object.freeze(['MAX','MIN','SUM','AVG','COUNT']);
/* Normalización sintáctica/conceptual V2.3. No interpreta lenguaje: acepta dos formas inequívocamente
   equivalentes que Gemini puede producir (field/column y TABLE/MAX frente a CALCULATE/MAX). */
function normalizeConceptPlan(plan={}){
  const p=clone(plan||{}),hasRequest=Object.prototype.hasOwnProperty.call(p,'request'),type=trim(p.type).toUpperCase(),rq=trim(p.request),op=rq.toUpperCase();p.type=type;if(hasRequest)p.request=rq;else delete p.request;
  if(type==='TABLE'&&DERIVE_REQUESTS.includes(op)){p.type='CALCULATE';p.request=op;}
  if(p.type==='CALCULATE'&&!trim(p.field)&&trim(p.column))p.field=trim(p.column);
  if(p.type==='TABLE'&&['hide','show_sort'].includes(norm(p.request))&&!trim(p.column)&&trim(p.field))p.column=trim(p.field);
  return p;
}
function conceptualIntentMatch(plan={},expected={}){
  plan=normalizeConceptPlan(plan);expected=normalizeConceptPlan(expected);
  const reasons=[];
  if(!scalarMatch(trim(plan.type).toUpperCase(),trim(expected.type).toUpperCase()))reasons.push(`type esperado ${expected.type}; recibido ${plan.type||'—'}`);
  if(expected.request!==undefined&&!scalarMatch(plan.request,expected.request))reasons.push(`request esperado ${expected.request}; recibido ${plan.request||'—'}`);
  if(expected.events!==undefined&&!listMatch(plan.events,expected.events))reasons.push(`events esperados ${JSON.stringify(expected.events)}; recibidos ${JSON.stringify(plan.events||[])}`);
  if(expected.people!==undefined&&!listMatch(plan.people,expected.people))reasons.push(`people esperados ${JSON.stringify(expected.people)}; recibidos ${JSON.stringify(plan.people||[])}`);
  for(const k of ['dataset','field','column','query','status','label','detail'])if(expected[k]!==undefined&&!scalarMatch(plan[k],expected[k]))reasons.push(`${k} esperado ${expected[k]}; recibido ${plan[k]??'—'}`);
  if(expected.values!==undefined&&!listMatch(plan.values,expected.values))reasons.push(`values esperados ${JSON.stringify(expected.values)}; recibidos ${JSON.stringify(plan.values||[])}`);
  if(expected.result_index!==undefined&&num(plan.result_index)!==num(expected.result_index))reasons.push(`result_index esperado ${expected.result_index}; recibido ${plan.result_index??'—'}`);
  if(expected.sort){if(!plan.sort||!scalarMatch(plan.sort.field,expected.sort.field)||!scalarMatch(plan.sort.direction,expected.sort.direction))reasons.push(`sort esperado ${JSON.stringify(expected.sort)}; recibido ${JSON.stringify(plan.sort||{})}`);}
  return{ok:reasons.length===0,reasons};
}
function resolveAnalysisPolicy(plan={}){const type=trim(plan.type).toUpperCase(),request=norm(plan.request);if(type==='TABLE'&&['analyze','summarize'].includes(request))return{required:true,source:'deterministic'};if(type==='MEMORY'&&request==='summarize')return{required:true,source:'deterministic'};if(type==='CALCULATE')return{required:false,source:'deterministic'};if(type==='DATA'&&request==='compare events')return{required:Boolean(plan.analysis),source:'planner_hint'};return{required:false,source:'deterministic'};}
function analysisPolicyMatch(plan={},expected={}){const decision=resolveAnalysisPolicy(plan);return{ok:decision.required===Boolean(expected.analysis),...decision};}

function datasetById(state,id){return arr(state.available_datasets).find(d=>same(d.dataset_id,id))||null;}
function currentDataset(state){return state.current_dataset||arr(state.available_datasets)[0]||null;}
function ambiguityGuard(state={}){const r=state?.entity_resolution||{};return norm(r.status)==='ambiguous'?{blocked:true,reason:'AMBIGUOUS_ENTITY',query:trim(r.query),candidates:arr(r.candidates).map(trim).filter(Boolean)}:{blocked:false};}
function knownEntities(state={},type=''){return arr(state.recognized_entities).filter(e=>norm(e.type)===norm(type));}
function resolveKnownName(value,state={},type=''){const v=trim(value),known=knownEntities(state,type);if(!v)return'';const hit=known.find(e=>same(e.canonical,v));return hit?trim(hit.canonical):'';}
function canonicalPeople(plan={},state={}){
  const raw=arr(plan.people).map(trim).filter(Boolean),direct=raw.map(v=>resolveKnownName(v,state,'PERSON')).filter(Boolean);return raw.length?[...new Set(direct)]:[];
}
function canonicalEvents(plan={},state={}){
  const direct=arr(plan.events).map(v=>resolveKnownName(v,state,'EVENT')).filter(Boolean);if(direct.length)return [...new Set(direct)];
  const single=resolveKnownName(plan.event,state,'EVENT');if(single)return[single];
  return[];
}
function canonicalColumn(ds,value){const v=trim(value),cols=arr(ds?.columns).map(trim).filter(Boolean);return cols.find(c=>same(c,v))||'';}
function memorySearchQuery(plan={},state={}){
  const people=canonicalPeople(plan,state);if(people.length)return people.join(' ');
  return trim(plan.query);
}
function inferLabelColumn(plan={},ds=null){
  const field=trim(plan.field),cols=arr(ds?.columns).map(trim).filter(Boolean),explicit=[trim(plan.column),trim(plan.label)].filter(Boolean);
  for(const candidate of explicit){const exact=cols.find(c=>same(c,candidate));if(exact&&!same(exact,field))return exact;}
  const others=cols.filter(c=>!same(c,field));return others.length===1?others[0]:'';
}
function translateConcept(plan={},state={}){
  plan=normalizeConceptPlan(plan);
  const type=trim(plan.type).toUpperCase(),request=trim(plan.request),actions=[],issues=[],guard=ambiguityGuard(state);
  const push=(capability,arguments_)=>actions.push({capability,arguments:arguments_});
  if(guard.blocked&&type!=='CLARIFY')return{ok:true,actions,issues,guard};
  if(type==='CHAT'){if(!CHAT_REQUESTS.includes(request))issues.push(`CHAT request desconocida: ${request||'—'}`);return{ok:issues.length===0,actions,issues,guard};}
  if(['CLARIFY','UNSUPPORTED'].includes(type))return{ok:true,actions,issues,guard};
  if(type==='DATA'){
    const events=canonicalEvents(plan,state),event=events[0];
    if(!DATA_REQUESTS.includes(request))issues.push(`DATA request desconocida: ${request||'—'}`);
    else if(request==='compare_events'){if(events.length<2)issues.push('compare_events necesita al menos 2 eventos');else push('compare_events',{events});}
    else if(!event)issues.push(`${request} necesita evento`);
    else if(request==='event_purchases')push('event_purchases',{event,purchase_status:trim(plan.status)||'realized'});
    else if(request==='event_income_status')push('event_income_status',{event,status:trim(plan.status)||'pending'});
    else if(request==='event_liquidations'){const people=canonicalPeople(plan,state);push('event_liquidations',{event,...(people[0]?{person:people[0]}:{}),settlement_status:trim(plan.status)||'all',detail:norm(plan.detail)==='full'?'full':'standard'});}
    else push(request,{event});
  }else if(type==='PERSON'){
    const people=canonicalPeople(plan,state),event=canonicalEvents(plan,state)[0]||'';
    if(!PERSON_REQUESTS.includes(request))issues.push(`PERSON request desconocida: ${request||'—'}`);else if(!people.length)issues.push('PERSON necesita people');
    else if(request==='profile')people.forEach(person=>push('person_profile',{person}));
    else if(request==='events')people.forEach(person=>push('person_events',{person}));
    else if(request==='event_status'){if(!event)issues.push('event_status necesita evento');else people.forEach(person=>push('person_event_status',{person,event}));}
  }else if(type==='MEMORY'){
    if(!MEMORY_REQUESTS.includes(request))issues.push(`MEMORY request desconocida: ${request||'—'}`);
    else if(request==='search'){const query=memorySearchQuery(plan,state);if(!query)issues.push('MEMORY search necesita sujeto o query');else push('recall_memory',{action:'search',query});}
    else if(request==='read'){const ix=num(plan.result_index);if(!ix)issues.push('MEMORY read necesita result_index');else push('recall_memory',{action:'read',result_index:ix});}
    else {const ds=currentDataset(state);if(ds&&norm(ds.table_key)==='memory_turns')push('summarize_current',{dataset_id:ds.dataset_id,table_key:ds.table_key});else{const ix=num(plan.result_index||state.selected_memory_episode?.result_index);if(!ix)issues.push('MEMORY summarize necesita recuerdo seleccionado');else push('recall_memory',{action:'summarize',result_index:ix});}}
  }else if(type==='TABLE'){
    if(!TABLE_REQUESTS.includes(request))issues.push(`TABLE request desconocida: ${request||'—'}`);else{
      const ds=datasetById(state,trim(plan.dataset))||currentDataset(state),base={};if(ds?.dataset_id)base.dataset_id=ds.dataset_id;if(ds?.table_key)base.table_key=ds.table_key;
      if(request==='select'){if(!ds?.dataset_id)issues.push('TABLE select necesita dataset válido');else push('view_current',base);}
      else if(request==='filter'){if(!trim(plan.field)||!arr(plan.values).length)issues.push('TABLE filter necesita field+values');else push('view_current',{...base,view_filters:arr(plan.values).map(value=>({field:trim(plan.field),operator:'eq',value}))});}
      else if(request==='hide'){const column=canonicalColumn(ds,plan.column||plan.field);if(!column)issues.push('TABLE hide necesita column válida');else push('view_current',{...base,hidden_columns:[column]});}
      else if(request==='show_sort'){const column=canonicalColumn(ds,plan.column||plan.field||plan.sort?.field),sf=canonicalColumn(ds,plan.sort?.field||column),direction=norm(plan.sort?.direction)==='asc'?'asc':'desc';if(!column||!sf)issues.push('TABLE show_sort necesita column+sort válidos');else{const cols=arr(ds?.columns).map(trim).filter(Boolean),visible=cols.includes(column)?cols:[...cols,column];push('view_current',{...base,visible_columns:visible,view_sort:[{field:sf,direction}]});}}
      else if(request==='reset')push('view_current',{...base,reset_filters:true});
      else if(request==='summarize'||request==='analyze')push('summarize_current',base);
    }
  }else if(type==='CALCULATE'){
    const op=trim(request).toUpperCase(),ds=datasetById(state,trim(plan.dataset))||currentDataset(state),field=canonicalColumn(ds,plan.field||plan.column);
    if(!DERIVE_REQUESTS.includes(op))issues.push(`CALCULATE request desconocida: ${request||'—'}`);
    else if(!ds?.dataset_id)issues.push('CALCULATE necesita dataset materializado');
    else if(!field)issues.push('CALCULATE necesita field existente en el dataset');
    else{const label=inferLabelColumn({...plan,field},ds);push('derive',{dataset_id:ds.dataset_id,...(ds?.table_key?{table_key:ds.table_key}:{}),derive_operation:op,derive_field:field,...(label?{label_field:label}:{})});}
  }else issues.push(`type conceptual desconocido: ${type||'—'}`);
  return{ok:issues.length===0,actions,issues,guard};
}

const EXTRA_CAPABILITIES=Object.freeze({recall_memory:true});
function auditAction(action={}){
  const capability=trim(action.capability),args=action.arguments||{};
  if(EXTRA_CAPABILITIES[capability]){
    const issues=[],act=trim(args.action);if(!['search','read','summarize'].includes(act))issues.push('recall_memory.action inválida');if(act==='search'&&!trim(args.query))issues.push('falta query');if(['read','summarize'].includes(act)&&!num(args.result_index))issues.push('falta result_index');return{known:true,executable:!issues.length,issues,normalized:action};
  }
  if(!capabilityDefinition(capability))return{known:false,executable:false,issues:[`capacidad desconocida: ${capability}`],normalized:action};
  const a=auditCapabilityCall({operation:capability,...args});return{known:true,executable:a?.ok===true,issues:arr(a?.issues),normalized:{capability:trim(a?.effectiveOperation||capability),arguments:a?.sanitizedArgs||args},audit:a};
}
function translatorAudit(translation={}){const audits=arr(translation.actions).map(a=>({capability:a.capability,...auditAction(a)}));const known=translation.ok&&audits.every(a=>a.known),executable=translation.ok&&audits.every(a=>a.executable);return{ok:translation.ok&&known&&executable,known,executable,audits,issues:[...arr(translation.issues),...audits.flatMap(a=>a.executable?[]:a.issues)]};}

function canonicalConceptSignature(plan={}){plan=normalizeConceptPlan(plan);const p={type:trim(plan.type).toUpperCase(),request:norm(plan.request),events:arr(plan.events).map(norm).sort(),people:arr(plan.people).map(norm).sort(),dataset:norm(plan.dataset),field:norm(plan.field),values:arr(plan.values).map(norm).sort(),column:norm(plan.column),query:norm(plan.query),result_index:num(plan.result_index),status:norm(plan.status),label:norm(plan.label),detail:norm(plan.detail),sort:plan.sort?{field:norm(plan.sort.field),direction:norm(plan.sort.direction)}:null};return JSON.stringify(p);}
function canonicalExecutionSignature(translation={}){const guard=translation?.guard?.blocked?{blocked:true,reason:translation.guard.reason,candidates:arr(translation.guard.candidates).map(norm).sort()}:null,actions=arr(translation.actions).map(a=>({capability:trim(a.capability),arguments:a.arguments||{}}));return JSON.stringify({guard,actions});}

async function callGemini(caseDef={},externalSignal=null,enrichedOverride=null){
  const apiKey=geminiKey();if(!apiKey){const e=new Error('Falta GEMINI_API_KEY para ITV INTÉRPRETE GEMINI V2.3.');e.status=503;throw e;}
  const model=interpreterModel(),url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body={systemInstruction:{parts:[{text:systemInstruction()}]},contents:[{role:'user',parts:[{text:userInput(caseDef,enrichedOverride)}]}],generationConfig:{temperature:0.1,maxOutputTokens:500,responseMimeType:'application/json'}};
  const timer=timeoutSignal(Number(process.env.CONTROLEVENT_ZUZU_INTERPRETER_TIMEOUT_MS)||30000,externalSignal),started=Date.now();
  try{const res=await fetch(`${url}?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:timer.signal});let payload={};try{payload=await res.json();}catch(_){}if(!res.ok){const e=new Error(payload?.error?.message||`Gemini HTTP ${res.status}`);e.status=res.status;e.details=payload;throw e;}const raw=extractCandidateText(payload),parsed=parseConceptPlan(raw),usage=payload?.usageMetadata||{};return{model,raw,parsed,payload,durationMs:Date.now()-started,usage:{promptTokens:num(usage.promptTokenCount),outputTokens:num(usage.candidatesTokenCount),totalTokens:num(usage.totalTokenCount),costEur:estimateCost(model,usage)}};}finally{timer.dispose();}
}

function publicCase(base={},variant=1){const prompt=arr(base.prompts)[variant-1]||arr(base.prompts)[0]||'';const cdef={...base,prompt};return{id:`${base.id}-p${variant}`,baseId:base.id,variant,repeat:variant,category:base.category,prompt,context:clone(base.context),enriched:enrichState(cdef),expected:clone(base.expected),note:base.note||''};}
export async function runInterpreterPlan({prompt='',context={},entityCatalog=[],signal=null}={}){
  const cdef={id:'execution-live',category:'LIVE',prompt:trim(prompt),context:context&&typeof context==='object'?clone(context):{},expected:{}};
  if(!cdef.prompt)throw new Error('Falta el mensaje del usuario para el intérprete.');
  const state=enrichState(cdef,arr(entityCatalog).length?entityCatalog:ENTITY_FIXTURE),got=await callGemini(cdef,signal,state),parsed=got.parsed,plan=parsed.plan&&typeof parsed.plan==='object'?normalizeConceptPlan(parsed.plan):{};
  const translation=parsed.parsed?translateConcept(plan,state):{ok:false,actions:[],issues:['plan no parseable'],guard:null},ce=translatorAudit(translation),policy=parsed.parsed?resolveAnalysisPolicy(plan):{ok:false,required:false,source:'unavailable'};
  return{ok:parsed.parsed&&ce.ok,prompt:cdef.prompt,context:cdef.context,enriched:state,plan,raw:got.raw,parsed,translation,translationAudit:ce,analysisDecision:policy,conceptSignature:canonicalConceptSignature(plan),executionSignature:canonicalExecutionSignature(translation),usage:got.usage,model:got.model,durationMs:got.durationMs};
}

export function previewInterpreterBattery(){const cases=[];for(const base of BASE_CASES)for(let v=1;v<=3;v++)cases.push(publicCase(base,v));return{ok:true,source:'interpreter-lab-v2-3-paraphrases-hardened',batteryCode:'INTERPRETER-GEMINI-V2-3-PARAPHRASE-HARDENED-30X3',label:'ITV · INTÉRPRETE GEMINI V2.3 · PARÁFRASIS HARDENED · 90',baseCases:30,paraphrases:3,repeats:3,total:90,model:interpreterModel(),executesCE:false,usesFunctionCalling:false,conceptLanguage:'DATA|TABLE|CALCULATE|MEMORY|PERSON|CHAT|CLARIFY|UNSUPPORTED',cases};}
function baseFromPublic(caseDef={}){return{id:trim(caseDef.baseId||caseDef.id).replace(/-[rp]\d+$/,''),category:caseDef.category,prompt:trim(caseDef.prompt),context:caseDef.context||{},expected:caseDef.expected||{},note:trim(caseDef.note)};}
export async function runInterpreterCase({caseDef,signal=null}={}){
  const cdef=baseFromPublic(caseDef),started=Date.now(),state=enrichState(cdef);
  try{
    const got=await callGemini(cdef,signal),parsed=got.parsed,plan=parsed.plan&&typeof parsed.plan==='object'?parsed.plan:{},intent=parsed.parsed?conceptualIntentMatch(plan,cdef.expected):{ok:false,reasons:[parsed.error||'JSON no recuperable']},policy=parsed.parsed?analysisPolicyMatch(plan,cdef.expected):{ok:false,required:false,source:'unavailable'},translation=parsed.parsed?translateConcept(plan,state):{ok:false,actions:[],issues:['plan no parseable']},ce=translatorAudit(translation);
    const status=parsed.parsed&&intent.ok&&ce.ok?'OK':'KO';
    return{ok:true,id:caseDef.id,baseId:caseDef.baseId||cdef.id,variant:num(caseDef.variant||caseDef.repeat)||1,repeat:num(caseDef.repeat||caseDef.variant)||1,category:cdef.category,prompt:cdef.prompt,context:cdef.context,enriched:state,expected:cdef.expected,plan,raw:got.raw,conceptSignature:canonicalConceptSignature(plan),executionSignature:canonicalExecutionSignature(translation),translatedActions:translation.actions,executionGuard:translation.guard||null,status,analysisDecision:policy,metrics:{planParsed:parsed.parsed,transportClean:parsed.transportClean,transportRecovered:parsed.recovered,intentCorrect:intent.ok,translationCE:ce.ok,analysisPolicy:policy.ok,guardedAmbiguity:Boolean(translation.guard?.blocked)},reasons:[...(parsed.parsed?[]:[parsed.error||'JSON inválido']),...intent.reasons,...ce.issues,...(translation.guard?.blocked?[`ejecución bloqueada: ${translation.guard.reason}`]:[]),...(policy.ok?[]:[`modo análisis esperado ${Boolean(cdef.expected.analysis)}; resuelto ${Boolean(policy.required)} (${policy.source})`])],audits:ce.audits,durationMs:got.durationMs||Date.now()-started,usage:got.usage,model:got.model,executesCE:false};
  }catch(error){return{ok:false,id:caseDef.id,baseId:caseDef.baseId||cdef.id,variant:num(caseDef.variant||caseDef.repeat)||1,repeat:num(caseDef.repeat||caseDef.variant)||1,category:cdef.category,prompt:cdef.prompt,context:cdef.context,enriched:state,expected:cdef.expected,plan:null,raw:'',conceptSignature:'',executionSignature:'',translatedActions:[],executionGuard:null,status:'KO',analysisDecision:{ok:false,required:false,source:'error'},metrics:{planParsed:false,transportClean:false,transportRecovered:false,intentCorrect:false,translationCE:false,analysisPolicy:false},reasons:[error?.message||String(error)],audits:[],durationMs:Date.now()-started,usage:{promptTokens:0,outputTokens:0,totalTokens:0,costEur:0},model:interpreterModel(),executesCE:false,error:error?.message||String(error)};}
}
export async function runInterpreterStream({send,signal=null,maxCases=90}={}){
  const preview=previewInterpreterBattery(),cases=preview.cases.slice(0,Math.max(1,Math.min(preview.total,num(maxCases)||preview.total))),rows=[];
  send?.({type:'start',batteryCode:preview.batteryCode,label:preview.label,total:cases.length,model:preview.model,executesCE:false,usesFunctionCalling:false});
  let calls=0,tokens=0,costEur=0;
  for(let i=0;i<cases.length;i++){if(signal?.aborted)break;const cdef=cases[i];send?.({type:'progress',index:i+1,total:cases.length,id:cdef.id,prompt:cdef.prompt});const row=await runInterpreterCase({caseDef:cdef,signal});rows.push(row);calls++;tokens+=num(row.usage?.totalTokens);costEur=round(costEur+num(row.usage?.costEur),6);send?.({type:'case',case:row});}
  const done=rows.length,pct=n=>done?Math.round(n*10000/done)/100:0,intent=rows.filter(r=>r.metrics?.intentCorrect).length,translation=rows.filter(r=>r.metrics?.translationCE).length,transport=rows.filter(r=>r.metrics?.transportClean).length,parsed=rows.filter(r=>r.metrics?.planParsed).length,policy=rows.filter(r=>r.metrics?.analysisPolicy).length;
  const groups=new Map();for(const r of rows){if(!groups.has(r.baseId))groups.set(r.baseId,[]);groups.get(r.baseId).push(r);}let stable3=0,stableExact=0,stableCE=0,completeGroups=0;for(const g of groups.values()){if(g.length!==3)continue;completeGroups++;if(g.every(r=>r.metrics?.intentCorrect))stable3++;if(new Set(g.map(r=>r.conceptSignature)).size===1)stableExact++;if(g.every(r=>r.metrics?.translationCE)&&new Set(g.map(r=>r.executionSignature)).size===1)stableCE++;}
  const guarded=rows.filter(r=>r.metrics?.guardedAmbiguity).length;
  const summary={done,total:cases.length,ok:rows.filter(r=>r.status==='OK').length,ko:rows.filter(r=>r.status!=='OK').length,calls,tokens,costEur,planParsed:parsed,transportClean:transport,intentCorrect:intent,translationCE:translation,analysisPolicy:policy,guardedAmbiguity:guarded,planParsedPct:pct(parsed),transportCleanPct:pct(transport),intentCorrectPct:pct(intent),translationCEPct:pct(translation),analysisPolicyPct:pct(policy),stable3of3:stable3,stableExact,stableCE,stabilityCases:completeGroups,stability3of3Pct:completeGroups?Math.round(stable3*10000/completeGroups)/100:0,stabilityExactPct:completeGroups?Math.round(stableExact*10000/completeGroups)/100:0,stabilityCEPct:completeGroups?Math.round(stableCE*10000/completeGroups)/100:0,paraphrase3of3:stable3,paraphraseCEPct:completeGroups?Math.round(stableCE*10000/completeGroups)/100:0,completed:done===cases.length&&!signal?.aborted,executesCE:false};
  send?.({type:'summary',summary});return summary;
}

export function __interpreterLabForRegression(){return{BASE_CASES,ENTITY_FIXTURE,parseConceptPlan,enrichState,conceptualIntentMatch,translateConcept,translatorAudit,canonicalConceptSignature,canonicalExecutionSignature,ambiguityGuard,resolveAnalysisPolicy,fuzzyMentioned,editDistance,normalizeConceptPlan,systemInstruction};}
