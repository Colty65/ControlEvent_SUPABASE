/* ControlEvent v4_0_exp · ITV INTÉRPRETE GEMINI
   Laboratorio AISLADO: Gemini interpreta -> plan JSON. NO ejecuta CE, NO consulta Supabase,
   NO usa function calling. El registro CE se usa únicamente como catálogo/validador estructural. */
import {
  auditCapabilityCall,
  capabilityCatalogTextCompact,
  capabilityDefinition
} from './zuzu-capability-registry.service.js';

const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();
const arr=v=>Array.isArray(v)?v:[];
const num=v=>Number(v)||0;
const round=(v,d=6)=>{const p=10**d;return Math.round((Number(v)||0)*p)/p;};
const clone=v=>JSON.parse(JSON.stringify(v));
const norm=v=>trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');

function geminiKey(){
  return process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||process.env.CONTROLEVENT_GEMINI_API_KEY||process.env.GOOGLE_GENERATIVE_AI_API_KEY||'';
}
function interpreterModel(){
  return trim(process.env.CONTROLEVENT_ZUZU_INTERPRETER_MODEL||process.env.CONTROLEVENT_ZUZU_PLANNER_MODEL||'gemini-2.5-flash-lite').replace(/^models\//,'');
}
function timeoutSignal(ms=30000,externalSignal=null){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(new Error('timeout')),ms);
  const abort=()=>controller.abort(externalSignal?.reason||new Error('aborted'));
  externalSignal?.addEventListener?.('abort',abort,{once:true});
  return{signal:controller.signal,dispose:()=>{clearTimeout(timer);externalSignal?.removeEventListener?.('abort',abort);}};
}
function estimateCost(model,usage={}){
  const input=num(usage.promptTokenCount||usage.promptTokens),output=num(usage.candidatesTokenCount||usage.outputTokens);
  const lite=/flash-lite/i.test(model),inputRate=lite?0.10:0.30,outputRate=lite?0.40:2.50;
  return round(input/1e6*inputRate+output/1e6*outputRate,6);
}
function extractCandidateText(payload={}){
  return arr(payload?.candidates)[0]?.content?.parts?.map(p=>trim(p?.text)).filter(Boolean).join('\n')||'';
}
function parseJsonPlan(raw=''){
  let s=trim(raw).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  if(!s)return{ok:false,error:'respuesta vacía',plan:null};
  try{return{ok:true,plan:JSON.parse(s),error:''};}catch(_){}
  const a=s.indexOf('{'),b=s.lastIndexOf('}');
  if(a>=0&&b>a){s=s.slice(a,b+1);try{return{ok:true,plan:JSON.parse(s),error:''};}catch(e){return{ok:false,error:e.message||'JSON inválido',plan:null};}}
  return{ok:false,error:'No se encontró un objeto JSON completo.',plan:null};
}

const EXTRA_CAPABILITIES=Object.freeze({
  recall_memory:{description:'Memoria histórica de conversaciones. action=search busca episodios; action=read abre una referencia encontrada; action=summarize resume un episodio histórico ya identificado.',requiredByAction:{search:['query'],read:['result_index'],summarize:['result_index']}},
  search_documents:{description:'Busca documentación/adjuntos cuando la petición es documental y no una consulta empresarial estructurada.',required:['query']}
});

function capabilityKnown(name=''){return !!capabilityDefinition(name)||Object.prototype.hasOwnProperty.call(EXTRA_CAPABILITIES,trim(name));}
function extraCapabilityAudit(name,args={}){
  const d=EXTRA_CAPABILITIES[name];if(!d)return{ok:false,issues:['capacidad desconocida']};
  const issues=[];
  if(name==='recall_memory'){
    const action=trim(args?.action);if(!['search','read','summarize'].includes(action))issues.push('recall_memory.action inválida');
    for(const k of arr(d.requiredByAction?.[action]))if(args?.[k]===undefined||args?.[k]===null||trim(args?.[k])==='')issues.push(`falta ${k}`);
  }else for(const k of arr(d.required))if(args?.[k]===undefined||args?.[k]===null||trim(args?.[k])==='')issues.push(`falta ${k}`);
  return{ok:issues.length===0,issues};
}
function auditAction(action={}){
  const capability=trim(action?.capability),args=action?.arguments&&typeof action.arguments==='object'&&!Array.isArray(action.arguments)?action.arguments:{};
  if(!capabilityKnown(capability))return{known:false,executable:false,issues:[`capacidad desconocida: ${capability||'—'}`],normalized:null};
  if(EXTRA_CAPABILITIES[capability]){const a=extraCapabilityAudit(capability,args);return{known:true,executable:a.ok,issues:a.issues,normalized:{capability,arguments:args}};}
  const audited=auditCapabilityCall({operation:capability,...args});
  return{known:true,executable:audited?.ok===true,issues:arr(audited?.issues),normalized:{capability:trim(audited?.effectiveOperation||capability),arguments:audited?.sanitizedArgs||{operation:capability,...args}},audit:audited};
}

function deepSubset(actual,expected){
  if(expected===undefined)return true;
  if(expected===null||typeof expected!=='object')return norm(actual)===norm(expected);
  if(Array.isArray(expected)){
    if(!Array.isArray(actual))return false;
    return expected.every(ev=>actual.some(av=>deepSubset(av,ev)));
  }
  if(!actual||typeof actual!=='object'||Array.isArray(actual))return false;
  return Object.entries(expected).every(([k,v])=>deepSubset(actual[k],v));
}
function semanticMatch(plan={},expected={}){
  const reasons=[],type=trim(plan?.type).toUpperCase(),wantedType=trim(expected?.type).toUpperCase();
  if(wantedType&&type!==wantedType)reasons.push(`type esperado ${wantedType}; recibido ${type||'—'}`);
  if(expected?.needs_analysis!==undefined&&Boolean(plan?.needs_analysis)!==Boolean(expected.needs_analysis))reasons.push(`needs_analysis esperado ${Boolean(expected.needs_analysis)}; recibido ${Boolean(plan?.needs_analysis)}`);
  const actualActions=arr(plan?.actions),wanted=arr(expected?.actions),used=new Set();
  for(const wa of wanted){
    let found=-1;
    for(let i=0;i<actualActions.length;i++){
      if(used.has(i))continue;const aa=actualActions[i];
      if(trim(aa?.capability)!==trim(wa?.capability))continue;
      if(!deepSubset(aa?.arguments||{},wa?.arguments||{}))continue;
      found=i;break;
    }
    if(found<0)reasons.push(`falta ${wa.capability} ${JSON.stringify(wa.arguments||{})}`);else used.add(found);
  }
  if(expected?.exactActionCount!==false&&actualActions.length!==wanted.length)reasons.push(`acciones esperadas ${wanted.length}; recibidas ${actualActions.length}`);
  return{ok:reasons.length===0,reasons};
}

function c(id,category,prompt,context,expected,note=''){
  return{id:`interp-${String(id).padStart(2,'0')}`,category,prompt,context,expected,note};
}
const BASE_CASES=Object.freeze([
  c(1,'DATA','Dame un resumen de SySA 2026.',{}, {type:'EXECUTE',actions:[{capability:'event_summary',arguments:{event:'SySA 2026'}}],needs_analysis:false}),
  c(2,'DATA','Sácame las compras realizadas de FUNCION 2026.',{}, {type:'EXECUTE',actions:[{capability:'event_purchases',arguments:{event:'FUNCION 2026',purchase_status:'realized'}}],needs_analysis:false}),
  c(3,'DATA','¿Qué ingresos están pendientes en SySA 2026?',{}, {type:'EXECUTE',actions:[{capability:'event_income_status',arguments:{event:'SySA 2026',status:'pending'}}],needs_analysis:false}),
  c(4,'DATA','Compara SySA 2025 con SySA 2026 y luego dime qué te llama la atención.',{}, {type:'EXECUTE',actions:[{capability:'compare_events',arguments:{events:['SySA 2025','SySA 2026']}}],needs_analysis:true}),
  c(5,'DATA','¿Qué tiempo hizo o se prevé para FUNCION 2026?',{}, {type:'EXECUTE',actions:[{capability:'event_weather',arguments:{event:'FUNCION 2026'}}],needs_analysis:false}),
  c(6,'MEMORY','¿Recuerdas algo de Pocholo?',{}, {type:'EXECUTE',actions:[{capability:'recall_memory',arguments:{action:'search',query:'Pocholo'}}],needs_analysis:false}),
  c(7,'MEMORY','Abre el primero de los recuerdos que acabas de encontrar.',{memory_matches:[{index:1,title:'Información de Pocholo'},{index:2,title:'Detalle de eventos de Pocholo'}]}, {type:'EXECUTE',actions:[{capability:'recall_memory',arguments:{action:'read',result_index:1}}],needs_analysis:false}),
  c(8,'MEMORY','Resúmeme ese recuerdo en dos o tres ideas.',{selected_memory_episode:{result_index:1,title:'Información de Pocholo'},current_dataset:{title:'Conversación recordada · Información de Pocholo',table_key:'memory_turns',columns:['Fecha','Pregunta','Respuesta','Resumen']}}, {type:'EXECUTE',actions:[{capability:'summarize_current',arguments:{}}],needs_analysis:true},'También sería semánticamente razonable recall_memory:summarize; el laboratorio acepta solo la vía del dataset ya abierto para mantener el experimento comparable.'),
  c(9,'VIEW','De las tablas que acabas de mostrar, enséñame Economía.',{visible_datasets:[{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5},{dataset_id:'att-sysa26',table_key:'attendance_chart',title:'Asistencia · SySA 2026',columns:['Indicador','Valor'],row_count:3}]}, {type:'EXECUTE',actions:[{capability:'view_current',arguments:{dataset_id:'econ-sysa26',table_key:'economics_chart'}}],needs_analysis:false}),
  c(10,'VIEW','Quédate solo con las filas cuyo Indicador sea Ingresos o Compras realizadas.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5}}, {type:'EXECUTE',actions:[{capability:'view_current',arguments:{view_filters:[{field:'Indicador',operator:'eq',value:'Ingresos'},{field:'Indicador',operator:'eq',value:'Compras realizadas'}]}}],needs_analysis:false}),
  c(11,'VIEW','Oculta la columna Valor.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2}}, {type:'EXECUTE',actions:[{capability:'view_current',arguments:{hidden_columns:['Valor']}}],needs_analysis:false}),
  c(12,'VIEW','Recupérala y ordénalo por Valor de mayor a menor.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],hidden_columns:['Valor'],row_count:2}}, {type:'EXECUTE',actions:[{capability:'view_current',arguments:{visible_columns:['Indicador','Valor'],view_sort:[{field:'Valor',direction:'desc'}]}}],needs_analysis:false}),
  c(13,'CALCULATE','¿Cuál de esas filas tiene el Valor más alto y cuánto es?',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2}}, {type:'EXECUTE',actions:[{capability:'derive',arguments:{derive_operation:'MAX',derive_field:'Valor',label_field:'Indicador'}}],needs_analysis:false}),
  c(14,'VIEW','Quita los filtros y déjala completa otra vez.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2}}, {type:'EXECUTE',actions:[{capability:'view_current',arguments:{reset_filters:true}}],needs_analysis:false}),
  c(15,'VIEW','Volvamos a la tabla de Economía de SySA 2026 que dejamos antes.',{current_dataset:{dataset_id:'person-events-colty',table_key:'person_events',title:'Eventos · Colty',columns:['Evento','Fecha']},visible_datasets:[{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:2},{dataset_id:'person-events-colty',table_key:'person_events',title:'Eventos · Colty',columns:['Evento','Fecha'],row_count:17}]}, {type:'EXECUTE',actions:[{capability:'view_current',arguments:{dataset_id:'econ-sysa26',table_key:'economics_chart'}}],needs_analysis:false}),
  c(16,'PERSON','Háblame de Colty.',{}, {type:'EXECUTE',actions:[{capability:'person_profile',arguments:{person:'Colty'}}],needs_analysis:false}),
  c(17,'PERSON','Háblame de Colty y Esther.',{}, {type:'EXECUTE',actions:[{capability:'person_profile',arguments:{person:'Colty'}},{capability:'person_profile',arguments:{person:'Esther'}}],needs_analysis:false}),
  c(18,'REFERENT','¿En qué eventos aparecen?',{recent_entities:['Colty','Esther'],active_focus:{type:'multi_person',entities:['Colty','Esther']}}, {type:'EXECUTE',actions:[{capability:'person_events',arguments:{person:'Colty'}},{capability:'person_events',arguments:{person:'Esther'}}],needs_analysis:false}),
  c(19,'REFERENT','¿Y sus eventos?',{recent_entities:['Pocholo'],active_focus:{type:'person',entities:['Pocholo']}}, {type:'EXECUTE',actions:[{capability:'person_events',arguments:{person:'Pocholo'}}],needs_analysis:false}),
  c(20,'REFERENT','¿Y sus compras?',{screen_event:'SySA 2026',active_focus:{type:'event',entities:['SySA 2026']}}, {type:'EXECUTE',actions:[{capability:'event_purchases',arguments:{event:'SySA 2026'}}],needs_analysis:false}),
  c(21,'MULTI','Dime el estado de Colty en SySA 2026 y de Esther en ese mismo evento.',{}, {type:'EXECUTE',actions:[{capability:'person_event_status',arguments:{person:'Colty',event:'SySA 2026'}},{capability:'person_event_status',arguments:{person:'Esther',event:'SySA 2026'}}],needs_analysis:false}),
  c(22,'MULTI','Compara SySA 2024, SySA 2025 y SySA 2026.',{}, {type:'EXECUTE',actions:[{capability:'compare_events',arguments:{events:['SySA 2024','SySA 2025','SySA 2026']}}],needs_analysis:true}),
  c(23,'ANALYSIS','De toda esta tabla, dime solo lo que merece que me preocupe.',{current_dataset:{dataset_id:'econ-sysa26',table_key:'economics_chart',title:'Economía · SySA 2026',columns:['Indicador','Valor'],row_count:5}}, {type:'EXECUTE',actions:[{capability:'summarize_current',arguments:{}}],needs_analysis:true}),
  c(24,'ANALYSIS','¿Ves alguna incoherencia entre estos dos eventos?',{visible_datasets:[{dataset_id:'cmp-sysa',table_key:'comparison',title:'Comparación SySA 2025 vs SySA 2026',columns:['Evento','Ingresos','Compras','Donaciones','Saldo']}]}, {type:'EXECUTE',actions:[{capability:'summarize_current',arguments:{dataset_id:'cmp-sysa',table_key:'comparison'}}],needs_analysis:true}),
  c(25,'CHAT','Hola Zuzu, ¿qué tal?',{}, {type:'CHAT',actions:[],needs_analysis:false}),
  c(26,'CHAT','Resúmeme qué hemos hecho en esta conversación y qué queda abierto.',{session_ledger:[{kind:'memory',value:'Pocholo'},{kind:'event',value:'SySA 2026'},{kind:'dataset',value:'Economía · SySA 2026'},{kind:'person',value:'Colty'},{kind:'person',value:'Esther'}]}, {type:'CHAT',actions:[],needs_analysis:false}),
  c(27,'CLARIFY','Dime cosas de Manolo.',{entity_resolution:{query:'Manolo',status:'ambiguous',candidates:['Pocholo','Pocholo y Celes']}}, {type:'CLARIFY',actions:[],needs_analysis:false}),
  c(28,'UNSUPPORTED','Predice cuántos cubatas beberá cada persona en el próximo evento.',{}, {type:'UNSUPPORTED',actions:[],needs_analysis:false}),
  c(29,'DATA','Enséñame los documentos del evento que tengo abierto.',{screen_event:'FUNCION 2026'}, {type:'EXECUTE',actions:[{capability:'event_documentation',arguments:{event:'FUNCION 2026'}}],needs_analysis:false}),
  c(30,'DATA','Sácame la situación del banco de SySA 2026.',{}, {type:'EXECUTE',actions:[{capability:'event_bank',arguments:{event:'SySA 2026'}}],needs_analysis:false})
]);

function interpreterCatalog(){
  return `${capabilityCatalogTextCompact()}\n- recall_memory req=según action · search(query), read(result_index), summarize(result_index). Memoria histórica; no es resumen de sesión actual.\n- search_documents req=query. Búsqueda documental libre.`;
}
function systemInstruction(){
  return `Eres el INTÉRPRETE AISLADO de ControlEvent. NO eres el asistente final y NO debes responder al usuario. Tu única tarea es convertir lenguaje natural + estado en un plan mínimo ejecutable.\n\nREGLAS:\n- Devuelve EXCLUSIVAMENTE un objeto JSON, sin markdown ni comentarios externos.\n- type: EXECUTE cuando hacen falta datos/transformaciones; CHAT para conversación que no necesita datos nuevos; CLARIFY si el estado dado demuestra ambigüedad real; UNSUPPORTED si la capacidad no existe.\n- actions es una lista. Cada acción contiene capability y arguments. Usa SOLO capacidades del catálogo.\n- Si hay varias personas, emite una acción por persona. No unas dos nombres en una sola identidad.\n- Usa el ESTADO como referencias disponibles, no como órdenes. Una mención explícita del usuario gana al foco anterior.\n- Una tabla ya materializada se opera con view_current/summarize_current/derive; no reabras el módulo empresarial para cambiar filas, columnas u orden.\n- Para cálculos sobre una tabla usa derive.\n- No inventes campos ni capacidades. Si falta un dato imprescindible y no está en el estado, CLARIFY.\n- needs_analysis=true solo cuando, después de obtener datos, una segunda IA tendría que comparar, interpretar o explicar hallazgos; no para una extracción mecánica.\n\nFORMATO EXACTO:\n{"type":"EXECUTE|CHAT|CLARIFY|UNSUPPORTED","actions":[{"capability":"nombre","arguments":{}}],"needs_analysis":false,"summary":"explicación interna muy breve"}\n\nCATÁLOGO DE CAPACIDADES CE:\n${interpreterCatalog()}`;
}
function userInput(caseDef={}){
  return `ESTADO CONTROLADO:\n${JSON.stringify(caseDef.context||{})}\n\nMENSAJE DEL USUARIO:\n${caseDef.prompt}`;
}

async function callGemini(caseDef={},externalSignal=null){
  const apiKey=geminiKey();if(!apiKey){const e=new Error('Falta GEMINI_API_KEY para ITV INTÉRPRETE GEMINI.');e.status=503;throw e;}
  const model=interpreterModel(),url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body={systemInstruction:{parts:[{text:systemInstruction()}]},contents:[{role:'user',parts:[{text:userInput(caseDef)}]}],generationConfig:{temperature:0.1,maxOutputTokens:700,responseMimeType:'application/json'}};
  const timer=timeoutSignal(Number(process.env.CONTROLEVENT_ZUZU_INTERPRETER_TIMEOUT_MS)||30000,externalSignal),started=Date.now();
  try{
    const res=await fetch(`${url}?key=${encodeURIComponent(apiKey)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:timer.signal});
    let payload={};try{payload=await res.json();}catch(_){}
    if(!res.ok){const e=new Error(payload?.error?.message||`Gemini HTTP ${res.status}`);e.status=res.status;e.details=payload;throw e;}
    const raw=extractCandidateText(payload),parsed=parseJsonPlan(raw),usage=payload?.usageMetadata||{};
    return{model,raw,parsed,payload,durationMs:Date.now()-started,usage:{promptTokens:num(usage.promptTokenCount),outputTokens:num(usage.candidatesTokenCount),totalTokens:num(usage.totalTokenCount),costEur:estimateCost(model,usage)}};
  }finally{timer.dispose();}
}

function publicCase(base={},repeat=1){return{id:`${base.id}-r${repeat}`,baseId:base.id,repeat,category:base.category,prompt:base.prompt,context:clone(base.context),expected:clone(base.expected),note:base.note||''};}
export function previewInterpreterBattery(){
  const cases=[];for(const base of BASE_CASES)for(let r=1;r<=3;r++)cases.push(publicCase(base,r));
  return{ok:true,source:'interpreter-lab',batteryCode:'INTERPRETER-GEMINI-30X3',label:'ITV · INTÉRPRETE GEMINI · 90',baseCases:BASE_CASES.length,repeats:3,total:cases.length,model:interpreterModel(),executesCE:false,usesFunctionCalling:false,catalogOperations:interpreterCatalog().split('\n').filter(Boolean).length,cases};
}
function baseFromPublic(caseDef={}){return{id:trim(caseDef.baseId||caseDef.id).replace(/-r\d+$/,''),category:caseDef.category,prompt:trim(caseDef.prompt),context:caseDef.context||{},expected:caseDef.expected||{},note:trim(caseDef.note)};}
export async function runInterpreterCase({caseDef,signal=null}={}){
  const cdef=baseFromPublic(caseDef),started=Date.now();
  try{
    const got=await callGemini(cdef,signal),parsed=got.parsed,plan=parsed.plan&&typeof parsed.plan==='object'?parsed.plan:{},actions=arr(plan.actions),audits=actions.map(a=>({capability:trim(a?.capability),...auditAction(a)}));
    const jsonValid=parsed.ok===true,known=jsonValid&&actions.every((_,i)=>audits[i]?.known===true),executable=jsonValid&&actions.every((_,i)=>audits[i]?.executable===true),semantic=jsonValid?semanticMatch(plan,cdef.expected):{ok:false,reasons:[parsed.error||'JSON inválido']};
    const status=jsonValid&&known&&executable&&semantic.ok?'OK':'KO';
    return{ok:true,id:caseDef.id,baseId:caseDef.baseId||cdef.id,repeat:num(caseDef.repeat)||1,category:cdef.category,prompt:cdef.prompt,context:cdef.context,expected:cdef.expected,plan,raw:got.raw,status,metrics:{jsonValid,capabilityKnown:known,executable,semanticCorrect:semantic.ok},reasons:[...(jsonValid?[]:[parsed.error||'JSON inválido']),...(known?[]:audits.flatMap(a=>a.known?[]:a.issues)),...(executable?[]:audits.flatMap(a=>a.executable?[]:a.issues)),...semantic.reasons],audits,durationMs:got.durationMs||Date.now()-started,usage:got.usage,model:got.model,executesCE:false};
  }catch(error){return{ok:false,id:caseDef.id,baseId:caseDef.baseId||cdef.id,repeat:num(caseDef.repeat)||1,category:cdef.category,prompt:cdef.prompt,context:cdef.context,expected:cdef.expected,plan:null,raw:'',status:'KO',metrics:{jsonValid:false,capabilityKnown:false,executable:false,semanticCorrect:false},reasons:[error?.message||String(error)],audits:[],durationMs:Date.now()-started,usage:{promptTokens:0,outputTokens:0,totalTokens:0,costEur:0},model:interpreterModel(),executesCE:false,error:error?.message||String(error)};}
}
export async function runInterpreterStream({send,signal=null,maxCases=90}={}){
  const preview=previewInterpreterBattery(),cases=preview.cases.slice(0,Math.max(1,Math.min(preview.total,num(maxCases)||preview.total)));
  send?.({type:'start',batteryCode:preview.batteryCode,label:preview.label,total:cases.length,model:preview.model,executesCE:false,usesFunctionCalling:false});
  let done=0,ok=0,ko=0,jsonValid=0,known=0,executable=0,semantic=0,calls=0,tokens=0,costEur=0;
  for(const cdef of cases){
    if(signal?.aborted)break;
    send?.({type:'progress',index:done+1,total:cases.length,id:cdef.id,prompt:cdef.prompt});
    const row=await runInterpreterCase({caseDef:cdef,signal});done++;calls++;if(row.status==='OK')ok++;else ko++;
    if(row.metrics?.jsonValid)jsonValid++;if(row.metrics?.capabilityKnown)known++;if(row.metrics?.executable)executable++;if(row.metrics?.semanticCorrect)semantic++;
    tokens+=num(row.usage?.totalTokens);costEur=round(costEur+num(row.usage?.costEur),6);send?.({type:'case',case:row});
  }
  const pct=n=>done?Math.round(n*10000/done)/100:0,summary={done,total:cases.length,ok,ko,calls,tokens,costEur,jsonValid,capabilityKnown:known,executable,semanticCorrect:semantic,jsonValidPct:pct(jsonValid),capabilityKnownPct:pct(known),executablePct:pct(executable),semanticCorrectPct:pct(semantic),completed:done===cases.length&&!signal?.aborted,executesCE:false};
  send?.({type:'summary',summary});return summary;
}

export function __interpreterLabForRegression(){return{BASE_CASES,parseJsonPlan,semanticMatch,auditAction,interpreterCatalog,systemInstruction};}
