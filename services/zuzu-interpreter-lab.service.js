/* ControlEvent v4_0_exp · ITV INTÉRPRETE GEMINI V2
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

/* El V2 distingue transporte limpio de intención recuperable. Si Gemini añade basura después
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
function enrichState(caseDef={}){
  const state=clone(caseDef.context||{}),recognized=[];
  for(const e of ENTITY_FIXTURE)if(mentioned(caseDef.prompt,e.canonical))recognized.push({...e,source:'literal_catalog_match'});
  if(state?.screen_event&&!recognized.some(e=>same(e.canonical,state.screen_event)))recognized.push({canonical:state.screen_event,type:'EVENT',source:'screen_event'});
  for(const p of arr(state?.recent_entities))if(!recognized.some(e=>same(e.canonical,p)))recognized.push({canonical:p,type:'PERSON',source:'recent_entity'});
  const datasets=arr(state.visible_datasets).map(d=>({dataset_id:d.dataset_id,table_key:d.table_key,title:d.title,columns:arr(d.columns),row_count:d.row_count}));
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
const DATA_REQUESTS=Object.freeze(['event_summary','event_purchases','event_income_status','compare_events','event_weather','event_documentation','event_bank']);
const TABLE_REQUESTS=Object.freeze(['select','filter','hide','show_sort','reset','summarize','analyze']);
const PERSON_REQUESTS=Object.freeze(['profile','events','event_status']);
const MEMORY_REQUESTS=Object.freeze(['search','read','summarize']);

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
  "label":"etiqueta opcional para identificar una fila calculada",
  "sort":{"field":"...","direction":"asc|desc"},
  "query":"texto opcional",
  "result_index":1,
  "status":"pending|realized opcional",
  "analysis":false,
  "summary":"frase interna breve"
}

VOCABULARIO CONCEPTUAL:
DATA request = event_summary | event_purchases | event_income_status | compare_events | event_weather | event_documentation | event_bank.
TABLE request = select | filter | hide | show_sort | reset | summarize | analyze.
CALCULATE request = MAX | MIN | SUM | AVG | COUNT.
MEMORY request = search | read | summarize.
PERSON request = profile | events | event_status.
CHAT = conversación sin datos empresariales nuevos. CLARIFY = ambigüedad real. UNSUPPORTED = ControlEvent no dispone de esa capacidad.

REGLAS:
- recognized_entities informa qué nombres existen y de qué tipo son. Úsalo como conocimiento, no como orden.
- available_datasets contiene tablas ya materializadas. TABLE select elige por dataset id; TABLE no reabre módulos empresariales.
- Para varias personas usa people:[...], no inventes una identidad compuesta.
- Los pronombres se resuelven con active_focus/recent_entities/screen_event.
- TABLE filter expresa field + values. No construyas view_filters.
- TABLE show_sort expresa column + sort. No construyas visible_columns/view_sort.
- MEMORY search/read/summarize expresa solo query/result_index cuando corresponda.
- analysis=true SOLO si después de obtener/seleccionar datos hace falta una segunda IA para interpretar, explicar hallazgos o redactar un resumen analítico. No afecta a qué datos hay que obtener.`;}
function userInput(caseDef={}){return `ESTADO ENRIQUECIDO:\n${JSON.stringify(enrichState(caseDef))}\n\nMENSAJE DEL USUARIO:\n${caseDef.prompt}`;}

function c(id,category,prompt,context,expected,analysis=false,note=''){return{id:`interp-${String(id).padStart(2,'0')}`,category,prompt,context,expected:{...expected,analysis},note};}
const BASE_CASES=Object.freeze([
  c(1,'DATA','Dame un resumen de SySA 2026.',{}, {type:'DATA',request:'event_summary',events:['SySA 2026']}),
  c(2,'DATA','Sácame las compras realizadas de FUNCION 2026.',{}, {type:'DATA',request:'event_purchases',events:['FUNCION 2026'],status:'realized'}),
  c(3,'DATA','¿Qué ingresos están pendientes en SySA 2026?',{}, {type:'DATA',request:'event_income_status',events:['SySA 2026'],status:'pending'}),
  c(4,'DATA','Compara SySA 2025 con SySA 2026 y luego dime qué te llama la atención.',{}, {type:'DATA',request:'compare_events',events:['SySA 2025','SySA 2026']},true),
  c(5,'DATA','¿Qué tiempo hizo o se prevé para FUNCION 2026?',{}, {type:'DATA',request:'event_weather',events:['FUNCION 2026']}),
  c(6,'MEMORY','¿Recuerdas algo de Pocholo?',{}, {type:'MEMORY',request:'search',query:'Pocholo'}),
  c(7,'MEMORY','Abre el primero de los recuerdos que acabas de encontrar.',{memory_matches:[{index:1,title:'Información de Pocholo'},{index:2,title:'Detalle de eventos de Pocholo'}]}, {type:'MEMORY',request:'read',result_index:1}),
  c(8,'MEMORY','Resúmeme ese recuerdo en dos o tres ideas.',{selected_memory_episode:{result_index:1,title:'Información de Pocholo'},current_dataset:{dataset_id:'memory-pocholo',title:'Conversación recordada · Información de Pocholo',table_key:'memory_turns',columns:['Fecha','Pregunta','Respuesta','Resumen']}}, {type:'MEMORY',request:'summarize'},true),
  c(9,'TABLE','De las tablas que acabas de mostrar, enséñame Economía.',{visible_datasets:[{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5},{dataset_id:'att-sysa26',table_key:'attendance_chart',title:'Asistencia · SySA 2026',columns:['Indicador','Valor'],row_count:3}]}, {type:'TABLE',request:'select',dataset:'econ-sysa26'}),
  c(10,'TABLE','Quédate solo con las filas cuyo Indicador sea Ingresos o Compras realizadas.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5}}, {type:'TABLE',request:'filter',field:'Indicador',values:['Ingresos','Compras realizadas']}),
  c(11,'TABLE','Oculta la columna Valor.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2}}, {type:'TABLE',request:'hide',column:'Valor'}),
  c(12,'TABLE','Recupérala y ordénalo por Valor de mayor a menor.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],hidden_columns:['Valor'],row_count:2}}, {type:'TABLE',request:'show_sort',column:'Valor',sort:{field:'Valor',direction:'desc'}}),
  c(13,'CALCULATE','¿Cuál de esas filas tiene el Valor más alto y cuánto es?',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2}}, {type:'CALCULATE',request:'MAX',field:'Valor',label:'Indicador'}),
  c(14,'TABLE','Quita los filtros y déjala completa otra vez.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2}}, {type:'TABLE',request:'reset'}),
  c(15,'TABLE','Volvamos a la tabla de Economía de SySA 2026 que dejamos antes.',{current_dataset:{dataset_id:'person-events-colty',table_key:'person_events',title:'Eventos · Colty',columns:['Evento','Fecha']},visible_datasets:[{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2},{dataset_id:'person-events-colty',table_key:'person_events',title:'Eventos · Colty',columns:['Evento','Fecha'],row_count:17}]}, {type:'TABLE',request:'select',dataset:'econ-sysa26'}),
  c(16,'PERSON','Háblame de Colty.',{}, {type:'PERSON',request:'profile',people:['Colty']}),
  c(17,'PERSON','Háblame de Colty y Esther.',{}, {type:'PERSON',request:'profile',people:['Colty','Esther']}),
  c(18,'REFERENT','¿En qué eventos aparecen?',{recent_entities:['Colty','Esther'],active_focus:{type:'multi_person',entities:['Colty','Esther']}}, {type:'PERSON',request:'events',people:['Colty','Esther']}),
  c(19,'REFERENT','¿Y sus eventos?',{recent_entities:['Pocholo'],active_focus:{type:'person',entities:['Pocholo']}}, {type:'PERSON',request:'events',people:['Pocholo']}),
  c(20,'REFERENT','¿Y sus compras?',{screen_event:'SySA 2026',active_focus:{type:'event',entities:['SySA 2026']}}, {type:'DATA',request:'event_purchases',events:['SySA 2026']}),
  c(21,'MULTI','Dime el estado de Colty en SySA 2026 y de Esther en ese mismo evento.',{}, {type:'PERSON',request:'event_status',people:['Colty','Esther'],events:['SySA 2026']}),
  c(22,'MULTI','Compara SySA 2024, SySA 2025 y SySA 2026.',{}, {type:'DATA',request:'compare_events',events:['SySA 2024','SySA 2025','SySA 2026']},false,'Comparar mecánicamente no obliga a una segunda IA.'),
  c(23,'ANALYSIS','De toda esta tabla, dime solo lo que merece que me preocupe.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5}}, {type:'TABLE',request:'analyze'},true),
  c(24,'ANALYSIS','¿Ves alguna incoherencia entre estos dos eventos?',{visible_datasets:[{dataset_id:'cmp-sysa',table_key:'comparison',title:'Comparación SySA 2025 vs SySA 2026',columns:['Evento','Ingresos','Compras','Donaciones','Saldo']}]}, {type:'TABLE',request:'analyze'},true),
  c(25,'CHAT','Hola Zuzu, ¿qué tal?',{}, {type:'CHAT'}),
  c(26,'CHAT','Resúmeme qué hemos hecho en esta conversación y qué queda abierto.',{session_ledger:[{kind:'memory',value:'Pocholo'},{kind:'event',value:'SySA 2026'},{kind:'dataset',value:'Economía · SySA 2026'},{kind:'person',value:'Colty'},{kind:'person',value:'Esther'}]}, {type:'CHAT'}),
  c(27,'CLARIFY','Dime cosas de Manolo.',{entity_resolution:{query:'Manolo',status:'ambiguous',candidates:['Pocholo','Pocholo y Celes']}}, {type:'CLARIFY'}),
  c(28,'UNSUPPORTED','Predice cuántos cubatas beberá cada persona en el próximo evento.',{}, {type:'UNSUPPORTED'}),
  c(29,'DATA','Enséñame los documentos del evento que tengo abierto.',{screen_event:'FUNCION 2026'}, {type:'DATA',request:'event_documentation',events:['FUNCION 2026']}),
  c(30,'DATA','Sácame la situación del banco de SySA 2026.',{}, {type:'DATA',request:'event_bank',events:['SySA 2026']})
]);

function scalarMatch(actual,expected){return expected===undefined||same(actual,expected);}
function listMatch(actual,expected){if(expected===undefined)return true;const a=arr(actual).map(norm),e=arr(expected).map(norm);return e.length===a.length&&e.every(x=>a.includes(x));}
function conceptualIntentMatch(plan={},expected={}){
  const reasons=[];
  if(!scalarMatch(trim(plan.type).toUpperCase(),trim(expected.type).toUpperCase()))reasons.push(`type esperado ${expected.type}; recibido ${plan.type||'—'}`);
  if(expected.request!==undefined&&!scalarMatch(plan.request,expected.request))reasons.push(`request esperado ${expected.request}; recibido ${plan.request||'—'}`);
  if(expected.events!==undefined&&!listMatch(plan.events,expected.events))reasons.push(`events esperados ${JSON.stringify(expected.events)}; recibidos ${JSON.stringify(plan.events||[])}`);
  if(expected.people!==undefined&&!listMatch(plan.people,expected.people))reasons.push(`people esperados ${JSON.stringify(expected.people)}; recibidos ${JSON.stringify(plan.people||[])}`);
  for(const k of ['dataset','field','column','query','status','label'])if(expected[k]!==undefined&&!scalarMatch(plan[k],expected[k]))reasons.push(`${k} esperado ${expected[k]}; recibido ${plan[k]??'—'}`);
  if(expected.values!==undefined&&!listMatch(plan.values,expected.values))reasons.push(`values esperados ${JSON.stringify(expected.values)}; recibidos ${JSON.stringify(plan.values||[])}`);
  if(expected.result_index!==undefined&&num(plan.result_index)!==num(expected.result_index))reasons.push(`result_index esperado ${expected.result_index}; recibido ${plan.result_index??'—'}`);
  if(expected.sort){if(!plan.sort||!scalarMatch(plan.sort.field,expected.sort.field)||!scalarMatch(plan.sort.direction,expected.sort.direction))reasons.push(`sort esperado ${JSON.stringify(expected.sort)}; recibido ${JSON.stringify(plan.sort||{})}`);}
  return{ok:reasons.length===0,reasons};
}
function analysisPolicyMatch(plan={},expected={}){return Boolean(plan.analysis)===Boolean(expected.analysis);}

function datasetById(state,id){return arr(state.available_datasets).find(d=>same(d.dataset_id,id))||null;}
function currentDataset(state){return state.current_dataset||arr(state.available_datasets)[0]||null;}
function translateConcept(plan={},state={}){
  const type=trim(plan.type).toUpperCase(),request=trim(plan.request),actions=[],issues=[];
  const push=(capability,arguments_)=>actions.push({capability,arguments:arguments_});
  if(['CHAT','CLARIFY','UNSUPPORTED'].includes(type))return{ok:true,actions,issues};
  if(type==='DATA'){
    const events=arr(plan.events).map(trim).filter(Boolean),event=events[0];
    if(!DATA_REQUESTS.includes(request))issues.push(`DATA request desconocida: ${request||'—'}`);
    else if(request==='compare_events'){if(events.length<2)issues.push('compare_events necesita al menos 2 eventos');else push('compare_events',{events});}
    else if(!event)issues.push(`${request} necesita evento`);
    else if(request==='event_purchases')push('event_purchases',{event,...(trim(plan.status)?{purchase_status:trim(plan.status)}:{})});
    else if(request==='event_income_status')push('event_income_status',{event,status:trim(plan.status)||'pending'});
    else push(request,{event});
  }else if(type==='PERSON'){
    const people=arr(plan.people).map(trim).filter(Boolean),event=arr(plan.events).map(trim).filter(Boolean)[0]||trim(plan.event);
    if(!PERSON_REQUESTS.includes(request))issues.push(`PERSON request desconocida: ${request||'—'}`);else if(!people.length)issues.push('PERSON necesita people');
    else if(request==='profile')people.forEach(person=>push('person_profile',{person}));
    else if(request==='events')people.forEach(person=>push('person_events',{person}));
    else if(request==='event_status'){if(!event)issues.push('event_status necesita evento');else people.forEach(person=>push('person_event_status',{person,event}));}
  }else if(type==='MEMORY'){
    if(!MEMORY_REQUESTS.includes(request))issues.push(`MEMORY request desconocida: ${request||'—'}`);
    else if(request==='search'){if(!trim(plan.query))issues.push('MEMORY search necesita query');else push('recall_memory',{action:'search',query:trim(plan.query)});}
    else if(request==='read'){const ix=num(plan.result_index);if(!ix)issues.push('MEMORY read necesita result_index');else push('recall_memory',{action:'read',result_index:ix});}
    else {const ds=currentDataset(state);if(ds&&norm(ds.table_key)==='memory_turns')push('summarize_current',{dataset_id:ds.dataset_id,table_key:ds.table_key});else{const ix=num(plan.result_index||state.selected_memory_episode?.result_index);if(!ix)issues.push('MEMORY summarize necesita recuerdo seleccionado');else push('recall_memory',{action:'summarize',result_index:ix});}}
  }else if(type==='TABLE'){
    if(!TABLE_REQUESTS.includes(request))issues.push(`TABLE request desconocida: ${request||'—'}`);else{
      const ds=datasetById(state,trim(plan.dataset))||currentDataset(state),base={};if(ds?.dataset_id)base.dataset_id=ds.dataset_id;if(ds?.table_key)base.table_key=ds.table_key;
      if(request==='select'){if(!ds?.dataset_id)issues.push('TABLE select necesita dataset válido');else push('view_current',base);}
      else if(request==='filter'){if(!trim(plan.field)||!arr(plan.values).length)issues.push('TABLE filter necesita field+values');else push('view_current',{...base,view_filters:arr(plan.values).map(value=>({field:trim(plan.field),operator:'eq',value}))});}
      else if(request==='hide'){if(!trim(plan.column))issues.push('TABLE hide necesita column');else push('view_current',{...base,hidden_columns:[trim(plan.column)]});}
      else if(request==='show_sort'){const column=trim(plan.column||plan.sort?.field),sf=trim(plan.sort?.field||column),direction=norm(plan.sort?.direction)==='asc'?'asc':'desc';if(!column||!sf)issues.push('TABLE show_sort necesita column+sort');else{const cols=arr(ds?.columns).map(trim).filter(Boolean),visible=cols.includes(column)?cols:[...cols,column];push('view_current',{...base,visible_columns:visible,view_sort:[{field:sf,direction}]});}}
      else if(request==='reset')push('view_current',{...base,reset_filters:true});
      else if(request==='summarize'||request==='analyze')push('summarize_current',base);
    }
  }else if(type==='CALCULATE'){
    const op=trim(request).toUpperCase();if(!['MAX','MIN','SUM','AVG','COUNT'].includes(op))issues.push(`CALCULATE request desconocida: ${request||'—'}`);else if(!trim(plan.field))issues.push('CALCULATE necesita field');else{const ds=currentDataset(state);push('derive',{...(ds?.dataset_id?{dataset_id:ds.dataset_id}:{}),...(ds?.table_key?{table_key:ds.table_key}:{}),derive_operation:op,derive_field:trim(plan.field),...(trim(plan.label)?{label_field:trim(plan.label)}:{})});}
  }else issues.push(`type conceptual desconocido: ${type||'—'}`);
  return{ok:issues.length===0,actions,issues};
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

function canonicalConceptSignature(plan={}){const p={type:trim(plan.type).toUpperCase(),request:norm(plan.request),events:arr(plan.events).map(norm).sort(),people:arr(plan.people).map(norm).sort(),dataset:norm(plan.dataset),field:norm(plan.field),values:arr(plan.values).map(norm).sort(),column:norm(plan.column),query:norm(plan.query),result_index:num(plan.result_index),status:norm(plan.status),label:norm(plan.label),sort:plan.sort?{field:norm(plan.sort.field),direction:norm(plan.sort.direction)}:null};return JSON.stringify(p);}

async function callGemini(caseDef={},externalSignal=null){
  const apiKey=geminiKey();if(!apiKey){const e=new Error('Falta GEMINI_API_KEY para ITV INTÉRPRETE GEMINI V2.');e.status=503;throw e;}
  const model=interpreterModel(),url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body={systemInstruction:{parts:[{text:systemInstruction()}]},contents:[{role:'user',parts:[{text:userInput(caseDef)}]}],generationConfig:{temperature:0.1,maxOutputTokens:500,responseMimeType:'application/json'}};
  const timer=timeoutSignal(Number(process.env.CONTROLEVENT_ZUZU_INTERPRETER_TIMEOUT_MS)||30000,externalSignal),started=Date.now();
  try{const res=await fetch(`${url}?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:timer.signal});let payload={};try{payload=await res.json();}catch(_){}if(!res.ok){const e=new Error(payload?.error?.message||`Gemini HTTP ${res.status}`);e.status=res.status;e.details=payload;throw e;}const raw=extractCandidateText(payload),parsed=parseConceptPlan(raw),usage=payload?.usageMetadata||{};return{model,raw,parsed,payload,durationMs:Date.now()-started,usage:{promptTokens:num(usage.promptTokenCount),outputTokens:num(usage.candidatesTokenCount),totalTokens:num(usage.totalTokenCount),costEur:estimateCost(model,usage)}};}finally{timer.dispose();}
}

function publicCase(base={},repeat=1){return{id:`${base.id}-r${repeat}`,baseId:base.id,repeat,category:base.category,prompt:base.prompt,context:clone(base.context),enriched:enrichState(base),expected:clone(base.expected),note:base.note||''};}
export function previewInterpreterBattery(){const cases=[];for(const base of BASE_CASES)for(let r=1;r<=3;r++)cases.push(publicCase(base,r));return{ok:true,source:'interpreter-lab-v2',batteryCode:'INTERPRETER-GEMINI-V2-30X3',label:'ITV · INTÉRPRETE GEMINI V2 · 90',baseCases:30,repeats:3,total:90,model:interpreterModel(),executesCE:false,usesFunctionCalling:false,conceptLanguage:'DATA|TABLE|CALCULATE|MEMORY|PERSON|CHAT|CLARIFY|UNSUPPORTED',cases};}
function baseFromPublic(caseDef={}){return{id:trim(caseDef.baseId||caseDef.id).replace(/-r\d+$/,''),category:caseDef.category,prompt:trim(caseDef.prompt),context:caseDef.context||{},expected:caseDef.expected||{},note:trim(caseDef.note)};}
export async function runInterpreterCase({caseDef,signal=null}={}){
  const cdef=baseFromPublic(caseDef),started=Date.now(),state=enrichState(cdef);
  try{
    const got=await callGemini(cdef,signal),parsed=got.parsed,plan=parsed.plan&&typeof parsed.plan==='object'?parsed.plan:{},intent=parsed.parsed?conceptualIntentMatch(plan,cdef.expected):{ok:false,reasons:[parsed.error||'JSON no recuperable']},policy=parsed.parsed?analysisPolicyMatch(plan,cdef.expected):false,translation=parsed.parsed?translateConcept(plan,state):{ok:false,actions:[],issues:['plan no parseable']},ce=translatorAudit(translation);
    const status=parsed.parsed&&intent.ok&&ce.ok?'OK':'KO';
    return{ok:true,id:caseDef.id,baseId:caseDef.baseId||cdef.id,repeat:num(caseDef.repeat)||1,category:cdef.category,prompt:cdef.prompt,context:cdef.context,enriched:state,expected:cdef.expected,plan,raw:got.raw,conceptSignature:canonicalConceptSignature(plan),translatedActions:translation.actions,status,metrics:{planParsed:parsed.parsed,transportClean:parsed.transportClean,transportRecovered:parsed.recovered,intentCorrect:intent.ok,translationCE:ce.ok,analysisPolicy:policy},reasons:[...(parsed.parsed?[]:[parsed.error||'JSON inválido']),...intent.reasons,...ce.issues,...(policy?[]:[`analysis esperado ${Boolean(cdef.expected.analysis)}; recibido ${Boolean(plan.analysis)}`])],audits:ce.audits,durationMs:got.durationMs||Date.now()-started,usage:got.usage,model:got.model,executesCE:false};
  }catch(error){return{ok:false,id:caseDef.id,baseId:caseDef.baseId||cdef.id,repeat:num(caseDef.repeat)||1,category:cdef.category,prompt:cdef.prompt,context:cdef.context,enriched:state,expected:cdef.expected,plan:null,raw:'',conceptSignature:'',translatedActions:[],status:'KO',metrics:{planParsed:false,transportClean:false,transportRecovered:false,intentCorrect:false,translationCE:false,analysisPolicy:false},reasons:[error?.message||String(error)],audits:[],durationMs:Date.now()-started,usage:{promptTokens:0,outputTokens:0,totalTokens:0,costEur:0},model:interpreterModel(),executesCE:false,error:error?.message||String(error)};}
}
export async function runInterpreterStream({send,signal=null,maxCases=90}={}){
  const preview=previewInterpreterBattery(),cases=preview.cases.slice(0,Math.max(1,Math.min(preview.total,num(maxCases)||preview.total))),rows=[];
  send?.({type:'start',batteryCode:preview.batteryCode,label:preview.label,total:cases.length,model:preview.model,executesCE:false,usesFunctionCalling:false});
  let calls=0,tokens=0,costEur=0;
  for(let i=0;i<cases.length;i++){if(signal?.aborted)break;const cdef=cases[i];send?.({type:'progress',index:i+1,total:cases.length,id:cdef.id,prompt:cdef.prompt});const row=await runInterpreterCase({caseDef:cdef,signal});rows.push(row);calls++;tokens+=num(row.usage?.totalTokens);costEur=round(costEur+num(row.usage?.costEur),6);send?.({type:'case',case:row});}
  const done=rows.length,pct=n=>done?Math.round(n*10000/done)/100:0,intent=rows.filter(r=>r.metrics?.intentCorrect).length,translation=rows.filter(r=>r.metrics?.translationCE).length,transport=rows.filter(r=>r.metrics?.transportClean).length,parsed=rows.filter(r=>r.metrics?.planParsed).length,policy=rows.filter(r=>r.metrics?.analysisPolicy).length;
  const groups=new Map();for(const r of rows){if(!groups.has(r.baseId))groups.set(r.baseId,[]);groups.get(r.baseId).push(r);}let stable3=0,stableExact=0,completeGroups=0;for(const g of groups.values()){if(g.length!==3)continue;completeGroups++;if(g.every(r=>r.metrics?.intentCorrect))stable3++;if(new Set(g.map(r=>r.conceptSignature)).size===1)stableExact++;}
  const summary={done,total:cases.length,ok:rows.filter(r=>r.status==='OK').length,ko:rows.filter(r=>r.status!=='OK').length,calls,tokens,costEur,planParsed:parsed,transportClean:transport,intentCorrect:intent,translationCE:translation,analysisPolicy:policy,planParsedPct:pct(parsed),transportCleanPct:pct(transport),intentCorrectPct:pct(intent),translationCEPct:pct(translation),analysisPolicyPct:pct(policy),stable3of3:stable3,stableExact,stabilityCases:completeGroups,stability3of3Pct:completeGroups?Math.round(stable3*10000/completeGroups)/100:0,stabilityExactPct:completeGroups?Math.round(stableExact*10000/completeGroups)/100:0,completed:done===cases.length&&!signal?.aborted,executesCE:false};
  send?.({type:'summary',summary});return summary;
}

export function __interpreterLabForRegression(){return{BASE_CASES,ENTITY_FIXTURE,parseConceptPlan,enrichState,conceptualIntentMatch,translateConcept,translatorAudit,canonicalConceptSignature,systemInstruction};}
