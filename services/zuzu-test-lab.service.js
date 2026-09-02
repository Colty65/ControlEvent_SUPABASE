/* ControlEvent v4_0_exp · Laboratorio/ITV de Zuzu.
   SOLO LECTURA. Genera pruebas desde los datos REALES de ControlEvent.
   FAST no llama a Gemini. AI-SMOKE y FULL-CERT tienen presupuesto duro configurable. */
import { getState } from './state.service.js';
import { listUsers } from './auth.service.js';
import { runZuzuUserTurn, runZuzuVNextUserTurn, generateZuzuItvDialogueUserTurn, __zuzuStructuralTesting as Z } from './event-ai.service.js';
import { exportBankData } from './bank-reconciliation.service.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const arr = v => Array.isArray(v) ? v : [];
const text = v => v == null ? '' : String(v);
const trim = v => text(v).trim();
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round = (v,d=2) => Number(num(v).toFixed(d));
const norm = v => trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const key = v => norm(v).replace(/\s+/g,'-').slice(0,48) || 'x';
const moneyEq = (a,b) => Math.abs(num(a)-num(b)) < 0.011;
const nowIso = () => new Date().toISOString();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function getItvState(){
  const base=await getState();
  try{
    const bank=await exportBankData({accountId:'TODOS'});
    return {...base,bankMovements:arr(bank?.movements),bankTicketLinks:arr(bank?.links),bankImportBatches:arr(bank?.batches),bankEventSettings:arr(bank?.eventSettings),bankMovementStates:arr(bank?.movementStates),bankMovementSettlements:arr(bank?.movementSettlements)};
  }catch(_){return base;}
}

// Semilla reproducible para que cada batería pueda variar sin perder trazabilidad.
// El navegador envía una semilla derivada de su reloj local; el servidor la reutiliza
// en preview, FAST, AI-SMOKE y FULL-CERT. Así una batería puede repetirse exactamente.
function normalizeSeed(raw){
  let n=Number(raw);
  if(!Number.isFinite(n)){const d=new Date();n=(d.getUTCSeconds()+1)*1000003+(d.getUTCMinutes()+1)*1009+(d.getUTCHours()+1)*97+d.getUTCDate();}
  n=Math.abs(Math.trunc(n))>>>0;
  return n||0x6d2b79f5;
}
function mixSeed(seed,salt=''){
  let h=normalizeSeed(seed)^0x811c9dc5;
  for(const ch of text(salt)){h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;}
  return h||0x9e3779b9;
}
function rngFor(seed,salt=''){
  let x=mixSeed(seed,salt);
  return ()=>{x=(x+0x6d2b79f5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
}
function shuffled(list,seed,salt=''){
  const out=arr(list).slice(),rnd=rngFor(seed,salt);
  for(let i=out.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}
function pick(list,seed,salt=''){const a=arr(list);if(!a.length)return null;return a[Math.floor(rngFor(seed,salt)()*a.length)];}
function pickIndex(length,seed,salt=''){return length>0?Math.floor(rngFor(seed,salt)()*length):0;}
function variant(templates,seed,salt,repl={}){
  const tpl=pick(templates,seed,salt)||'';
  return Object.entries(repl).reduce((v,[k,x])=>v.replaceAll(`{${k}}`,text(x)),tpl);
}

export async function assertGdActor(actor = {}) {
  const id = trim(actor.identificacion || actor.Identificacion);
  const level = trim(actor.nivel || actor.Nivel).toUpperCase();
  if (!id || level !== 'GD') { const e = new Error('Solo GD puede ejecutar PRUEBAS ZUZU.'); e.status = 403; throw e; }
  const users = await listUsers();
  const found = users.find(u => norm(u.identificacion || u.Identificacion) === norm(id));
  if (!found || trim(found.nivel || found.Nivel).toUpperCase() !== 'GD') { const e = new Error('El usuario no está autorizado como GD.'); e.status = 403; throw e; }
  return found;
}

function eventName(e){ return trim(e?.titulo || e?.nombre || e?.title); }
function personName(p){ return trim(p?.nombre || p?.Nombre || p?.identificacion); }
function eventIdOf(row){ return trim(row?.eventId || row?.event_id); }
function yearOf(name){ return (trim(name).match(/\b(?:19|20)\d{2}\b/)||[])[0] || ''; }
function familyStem(name){ return norm(name).replace(/\b(?:19|20)\d{2}\b/g,' ').replace(/\b(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g,' ').replace(/\s+/g,' ').trim(); }
function significant(name){ return norm(name).split(' ').filter(w=>w.length>2 && !['del','las','los','con','para','por','and','the','ano'].includes(w)); }
function answerHasName(result,name){
  const h = norm(`${result?.title||''} ${result?.answer||''}`), toks=significant(name);
  const y=yearOf(name); if(y && !h.includes(y)) return false;
  if(!toks.length) return false;
  return toks.filter(t=>h.includes(t)).length >= Math.min(2,toks.length);
}
function resultContextEvents(result){
  const c=result?.meta?.resultContext||{},ex=result?.meta?.ledgerAudit?.execution||{},focus=ex?.focus||{},ctx=ex?.context||{};
  const extra=[];if(trim(focus?.event))extra.push(focus.event);if(trim(ctx?.type)==='event')extra.push(...arr(ctx?.values));
  return arr(c.eventNames || c.events || c.event_names).concat(trim(c.event || c.eventName || c.event_name)?[trim(c.event || c.eventName || c.event_name)]:[],extra).filter(Boolean);
}
function resultHasEvent(result,name){ return resultContextEvents(result).some(x=>norm(x)===norm(name)) || answerHasName(result,name); }
function resultHasPerson(result,name){
  const c=result?.meta?.resultContext||{},ex=result?.meta?.ledgerAudit?.execution||{},focus=ex?.focus||{},ctx=ex?.context||{};
  const values=[c.person,c.subject,c.personName,c.person_name,focus.person,...(trim(ctx?.type)==='person'?arr(ctx?.values):[])].map(trim).filter(Boolean);
  return values.some(p=>norm(p)===norm(name)) || answerHasName(result,name);
}
function ledgerAuditOf(result){
  const a=result?.meta?.ledgerAudit||{},ex=a?.execution||{};return{conversationId:trim(result?.conversationId||result?.meta?.conversationId),turnId:trim(result?.turnId||result?.meta?.turnId),turnSeq:num(result?.turnSeq||result?.meta?.turnSeq),ledgerAction:trim(a?.action),geminiPlan:a?.geminiPlan||{},normalizedPlan:a?.normalizedPlan||{},answerPayload:ex?.answer_payload||{},answerBlueprintUsed:!!ex?.answer_blueprint_used,responseMode:trim(ex?.response_mode),geminiFinalRaw:text(ex?.gemini_final_raw),geminiFinalAnswer:text(ex?.gemini_final_answer)};
}
function usageOf(result){
  const u=result?.meta?.geminiUsageEstimate||{};
  const trace=arr(result?.meta?.debugTrace);
  const modelCalls={},attemptedModels=[];let fallbackReason='';
  for(const item of trace){
    const model=trim(item?.model),usage=item?.usage;
    if(model&&!attemptedModels.includes(model))attemptedModels.push(model);
    if(/escalado lite/i.test(trim(item?.step))&&!fallbackReason)fallbackReason=trim(item?.detail).slice(0,300);
    if(!model||!usage||(!num(usage?.promptTokens)&&!num(usage?.totalTokens)))continue;
    modelCalls[model]=(modelCalls[model]||0)+1;
  }
  const finalModel=trim(result?.model);
  if(/^gemini-/i.test(finalModel)&&!attemptedModels.includes(finalModel))attemptedModels.push(finalModel);
  const models=Object.keys(modelCalls);
  if(/^gemini-/i.test(finalModel)&&!models.includes(finalModel)&&num(u.calls)>0)models.push(finalModel);
  return {calls:num(u.calls),tokens:num(u.totalTokens||u.totalTokenCount),costEur:round(u.costEurApprox,6),costUsd:round(u.costUsdApprox,6),models,modelCalls,attemptedModels,modelTier:trim(result?.meta?.modelTier),fallbackReason};
}
function findTable(result,keyName){ return arr(result?.tables).find(t=>trim(t?.key)===keyName) || null; }
function toolTable(tool,keyName){ return arr(tool?.tables).find(t=>trim(t?.key)===keyName) || null; }
function compactCase(c){ return {id:c.id,group:c.group,label:c.label,prompt:c.prompt||'',expected:c.expected||'',meta:c.meta||{}}; }

async function execCanonicalTool(state,toolOrName,argsOrState={},selectedEventId=''){
  const tool=(toolOrName&&typeof toolOrName==='object')?{...toolOrName}:{id:`itv_${trim(toolOrName)}`,name:trim(toolOrName),...(argsOrState&&typeof argsOrState==='object'?argsOrState:{})};
  const name=trim(tool.name),id=trim(tool.id)||`itv_${name}`;
  if(typeof Z.v261ExecuteAgentTool==='function'){
    const args={...tool};delete args.id;delete args.name;
    return Z.v261ExecuteAgentTool({id,name,arguments:args},state,selectedEventId,[]);
  }
  return Z.v26ExecuteTool({id,name,...tool},state,selectedEventId);
}

function publicBatteryCase(c,mode=''){
  const expected = trim(c?.expected) || (trim(c?.expectedEvent)?`Evento: ${trim(c.expectedEvent)}`:'') || (arr(c?.expectedEvents).length?`Eventos: ${arr(c.expectedEvents).join(' ↔ ')}`:'') || (trim(c?.expectedPerson)?`Persona: ${trim(c.expectedPerson)}`:'') || (trim(c?.event)?`Evento: ${trim(c.event)}`:'') || (arr(c?.events).length?`Eventos: ${arr(c.events).join(' ↔ ')}`:'') || (trim(c?.person)?`Persona: ${trim(c.person)}`:'') || 'Regla/invariante satisfecha';
  // Se guarda también el contrato verificable de la pregunta. Así una batería histórica
  // puede repetirse EXACTAMENTE aunque en una versión futura cambien las plantillas de texto.
  const validationRule=trim(c?.validationRule)||(
    trim(c?.id)==='ai-nonexistent-event'?'nonexistent-event':
    trim(c?.id)==='ai-nondeducible-consumption'?'nondeducible-consumption':''
  );
  return {
    id:trim(c?.id),group:trim(c?.group)||'CONVERSACIÓN',label:trim(c?.label)||trim(c?.scenario)||trim(c?.prompt),
    prompt:trim(c?.prompt),expected,scenario:trim(c?.scenario),mode:trim(mode),
    event:trim(c?.event),events:arr(c?.events).map(trim).filter(Boolean),person:trim(c?.person),
    expectedEvent:trim(c?.expectedEvent),expectedEvents:arr(c?.expectedEvents).map(trim).filter(Boolean),expectedPerson:trim(c?.expectedPerson),
    oracle:c?.oracle&&typeof c.oracle==='object'?c.oracle:null,requireAnswer:c?.requireAnswer!==false,validationRule,
    engine:trim(c?.engine).toUpperCase()==='VNEXT'?'VNEXT':'',
    dialogue:c?.dialogue&&typeof c.dialogue==='object'?c.dialogue:null
  };
}

function restoredHistoricalCase(raw={},mode=''){
  const c={
    id:trim(raw?.id),group:trim(raw?.group)||'HISTÓRICO',label:trim(raw?.label)||trim(raw?.prompt),prompt:trim(raw?.prompt),expected:trim(raw?.expected),
    scenario:trim(raw?.scenario),mode:trim(mode||raw?.mode).toUpperCase(),event:trim(raw?.event||raw?.expectedEvent),
    events:arr(raw?.events).length?arr(raw.events).map(trim).filter(Boolean):arr(raw?.expectedEvents).map(trim).filter(Boolean),
    person:trim(raw?.person||raw?.expectedPerson),oracle:raw?.oracle&&typeof raw.oracle==='object'?raw.oracle:null,requireAnswer:raw?.requireAnswer!==false,
    engine:trim(raw?.engine).toUpperCase()==='VNEXT'?'VNEXT':'',dialogue:raw?.dialogue&&typeof raw.dialogue==='object'?raw.dialogue:null
  };
  const rule=trim(raw?.validationRule);
  if(rule==='nonexistent-event') c.validate=r=>{
    const answer=text(r?.answer),denied=/(?:no\s+(?:he\s+|hemos\s+)?encontrad[oa]|no\s+(?:lo\s+)?(?:encuentro|existe|figura|consta)|no\s+se\s+(?:encuentra|localiza)|no\s+est[aá]\s+registrad[oa]|no\s+hay\s+un\s+evento|ning[uú]n\s+evento[^.]{0,100}(?:coincid|parec|registr))/i.test(answer);
    return denied;
  };
  else if(rule==='nondeducible-consumption') c.validate=r=>/no (?:registra|puede|se puede)|no.*deduc|no.*acredit|no.*saber|no.*determinar/i.test(text(r?.answer))||/Dato no deducible/i.test(text(r?.title));
  return c;
}

function makeCase({id,group,label,prompt='',expected='',meta={},run}){ return {id,group,label,prompt,expected,meta,run}; }
function outcome(c,status,actual,extra={}){ return {id:c.id,group:c.group,label:c.label,prompt:c.prompt||'',expected:c.expected||'',actual:trim(actual),status,...extra}; }
const ITV_ESCAPE_FREE=false;
function vNextTableRowsAsObjects(result={},keyName=''){
  const table=arr(result?.tables).find(t=>!keyName||trim(t?.key)===trim(keyName));if(!table)return[];
  const cols=arr(table?.columns).map(trim);
  return arr(table?.rows).map(row=>{if(!Array.isArray(row))return row&&typeof row==='object'?row:{};const o={};for(let i=0;i<cols.length;i++)o[cols[i]]=row[i];return o;});
}
function vNextAuditOf(result={}){
  const ctx=(result?.meta?.resultContext&&typeof result.meta.resultContext==='object')?result.meta.resultContext:{};
  const tables=arr(result?.tables).map(t=>({key:trim(t?.key),title:trim(t?.title),columns:arr(t?.columns).map(trim).filter(Boolean),rowCount:arr(t?.rows).length}));
  const visible=[...new Set(tables.flatMap(t=>t.columns))],capabilityCalls=arr(result?.meta?.capabilityCalls).map(x=>({tool:trim(x?.tool),rawArgs:x?.rawArgs&&typeof x.rawArgs==='object'?x.rawArgs:{},normalizedArgs:x?.normalizedArgs&&typeof x.normalizedArgs==='object'?x.normalizedArgs:{},effectiveOperation:trim(x?.effectiveOperation),effectiveSubject:x?.effectiveSubject&&typeof x.effectiveSubject==='object'?x.effectiveSubject:{},audit:x?.audit&&typeof x.audit==='object'?x.audit:null,error:trim(x?.error)}));
  const attempted=[...capabilityCalls].reverse().find(x=>x.tool==='query_ce')||capabilityCalls[0]||null;
  return{
    resultContext:ctx,kind:trim(ctx?.kind),operation:trim(ctx?.operation)||trim(attempted?.normalizedArgs?.operation)||trim(attempted?.rawArgs?.operation),event:trim(ctx?.event),events:arr(ctx?.events).map(trim).filter(Boolean),person:trim(ctx?.person),
    orderBy:trim(ctx?.order_by),visibleColumns:arr(ctx?.visible_columns).map(trim).filter(Boolean),hiddenColumns:arr(ctx?.hidden_columns).map(trim).filter(Boolean),
    tableCount:tables.length,tables,renderedRows:tables.reduce((n,t)=>n+num(t.rowCount),0),renderedColumns:visible,chartCount:arr(result?.charts).length,
    tools:arr(result?.meta?.tools).map(trim).filter(Boolean),warnings:arr(result?.warnings).map(trim).filter(Boolean),capabilityRegistryVersion:trim(result?.meta?.capabilityRegistryVersion),capabilityCalls,attemptedCapability:attempted
  };
}
// P1.15 · MAPA DE DECISIÓN ITV -------------------------------------------------
// Clasifica la CAPA probable a tocar usando contratos/oráculos estructurados.
// NHC: no interpreta palabras del usuario ni añade sinónimos al runtime de Zuzu.
const ITV_DIAG={
  OK:'OK', ITV:'ITV', GAP:'CAPABILITY_GAP', CONT:'CONTINUITY', GEMINI:'GEMINI_GUIDANCE',
  CE:'CE_DATA_CONTRACT', PRESENT:'DERIVATION_PRESENTATION', CASCADE:'CASCADE', TECH:'TECHNICAL', UNKNOWN:'INDETERMINATE'
};
function itvCapabilityExpectation(c={}){
  const o=c?.oracle||{},kind=trim(o?.kind),label=norm(o?.label);
  const direct={
    'event-summary':['query_ce',['event_summary']],'event-economy':['query_ce',['event_summary']],
    'purchase-set':['query_ce',['event_purchases']],'purchase-max':['query_ce',['derive','event_purchases']],'purchase-sum':['query_ce',['derive','event_purchases']],
    'attendance':['query_ce',['event_attendance']],'donations':['query_ce',['event_donations','event_summary']],'bank-summary':['query_ce',['event_bank']],
    'person-summary':['query_ce',['person_profile']],'person-events':['query_ce',['person_events']],'person-income':['query_ce',['person_profile','person_income_status']],
    'catalog-count':['query_ce',[trim(o?.entity)==='events'?'events_catalog':'people_catalog']],'canonical-socios':['query_ce',['people_catalog']],
    'comparison':['query_ce',['compare_events']],'compare-metric':['query_ce',['derive','compare_events']],
    'events-overview':['query_ce',['events_overview']],'store-purchases':['query_ce',['store_purchases']],
    'documentation':['query_ce',['event_documentation']],'management':['query_ce',['event_management']]
  };
  if(kind==='event-metric'){
    const ops=label.includes('compras pendientes')?['event_summary','event_purchases']:label.includes('ingresos')?['event_summary','event_income_status']:['event_summary'];
    return{available:true,tool:'query_ce',operation:ops[0],operations:ops,kind};
  }
  if(kind==='ledger-structural')return{available:true,tool:'query_ce',operation:trim(o?.domain)==='purchases'?'event_purchases':'',operations:trim(o?.domain)==='purchases'?['event_purchases']:[],kind};
  const pair=direct[kind];if(pair)return{available:true,tool:pair[0],operation:pair[1][0],operations:pair[1],kind};
  return{available:null,tool:'',operation:'',operations:[],kind,reason:'oráculo sin mapeo de capacidad'};
}
function itvObservedCapability(result={}){
  const a=vNextAuditOf(result),attempt=a?.attemptedCapability||{},metaCalls=arr(result?.meta?.capabilityCalls),tools=arr(a.tools),tool=trim(attempt?.tool)||(tools.includes('query_ce')?'query_ce':tools.includes('search_documents')?'search_documents':tools.includes('recall_memory')?'recall_memory':tools.includes('resolve_entity')?'resolve_entity':trim(tools[0]));
  const rawArgs=attempt?.rawArgs&&typeof attempt.rawArgs==='object'?attempt.rawArgs:{},normalizedArgs=attempt?.normalizedArgs&&typeof attempt.normalizedArgs==='object'?attempt.normalizedArgs:{};
  const allCalls=metaCalls.map(c=>({tool:trim(c?.tool),operation:trim(c?.effectiveOperation||c?.normalizedArgs?.operation||c?.rawArgs?.operation),rawArgs:c?.rawArgs||{},normalizedArgs:c?.normalizedArgs||{},audit:c?.audit||null,error:trim(c?.error)}));
  const allOperations=[...new Set(allCalls.filter(c=>c.tool==='query_ce'&&c.operation&&!c.error).map(c=>c.operation))];
  return{tool,operation:trim(attempt?.effectiveOperation)||trim(a.operation)||trim(normalizedArgs?.operation)||trim(rawArgs?.operation),attemptedOperation:trim(normalizedArgs?.operation)||trim(rawArgs?.operation),allOperations,allCalls,event:trim(a.event),person:trim(a.person),warnings:arr(a.warnings),rawArgs,normalizedArgs,capabilityAudit:attempt?.audit||null,error:trim(attempt?.error),audit:a};
}
function itvCapabilitySignature(x={}){const ops=arr(x?.operations).map(trim).filter(Boolean);return[trim(x.tool)||'—',ops.length?`[${ops.join('|')}]`:trim(x.operation)||'—'].join(':');}
function itvCapabilityCompatible(expected={},observed={}){
  if(expected?.available!==true)return true;
  const wantedTool=trim(expected.tool),ops=arr(expected.operations).map(trim).filter(Boolean);
  if(wantedTool==='query_ce'){
    const calls=arr(observed?.allCalls).filter(c=>trim(c?.tool)==='query_ce'&&!trim(c?.error));
    if(calls.length){if(!ops.length)return true;return calls.some(c=>ops.includes(trim(c?.operation)));}
  }
  if(wantedTool&&trim(observed.tool)!==wantedTool)return false;
  if(ops.length&&!ops.includes(trim(observed.operation)))return false;
  return true;
}

function validateExpectedCapability(caseDef={},result={}){
  if(trim(caseDef?.engine).toUpperCase()!=='VNEXT')return{status:'OK',reasons:[]};
  const expected=itvCapabilityExpectation(caseDef);if(expected.available!==true)return{status:'OK',reasons:[]};
  const observed=itvObservedCapability(result);if(itvCapabilityCompatible(expected,observed))return{status:'OK',reasons:[]};
  const wanted=[trim(expected.tool),arr(expected.operations).map(trim).filter(Boolean).join('|')].filter(Boolean).join(':');
  return{status:'KO',reasons:[`capacidad factual esperada ${wanted||itvCapabilitySignature(expected)}; observada ${itvCapabilitySignature(observed)}`]};
}
function itvDecisionDiagnosis(c={},result={},verdict={status:'KO',reasons:[]}){
  const expected=itvCapabilityExpectation(c),observed=itvObservedCapability(result),reasons=arr(verdict?.reasons),status=trim(verdict?.status),group=norm(c?.group),kind=trim(c?.oracle?.kind),capAudit=observed?.capabilityAudit||{};
  const base={category:ITV_DIAG.UNKNOWN,touch:'REVISAR',confidence:'media',expectedCapability:itvCapabilitySignature(expected),observedCapability:itvCapabilitySignature(observed),reason:'No hay evidencia suficiente para asignar una capa única.',rawArgs:observed.rawArgs||{},normalizedArgs:observed.normalizedArgs||{},capabilityAudit:capAudit||null,rootCause:true,cascade:false};
  if(status==='OK'&&itvCapabilityCompatible(expected,observed))return{...base,category:ITV_DIAG.OK,touch:'NINGUNO',confidence:'alta',reason:arr(capAudit?.repairs).length?'Oráculo correcto; el registro normalizó JSON sin cambiar la intención.':'Oráculo, contrato y ejecución compatibles.'};
  if(status==='OK')return{...base,category:group.includes('continuidad')?ITV_DIAG.CONT:ITV_DIAG.GEMINI,touch:group.includes('continuidad')?'SOFTWARE CONTEXTO + AYUDA GEMINI':'AYUDA/SCHEMA GEMINI',confidence:'alta',reason:`Respuesta plausible con contrato incorrecto: esperado ${itvCapabilitySignature(expected)}, observado ${itvCapabilitySignature(observed)}.`};
  if(status==='WARN'&&reasons.length&&reasons.every(x=>/^ITV VNext:/i.test(trim(x))))return{...base,category:ITV_DIAG.ITV,touch:'ITV',confidence:'alta',reason:'La ejecución parece correcta pero ITV todavía no puede certificar estructuralmente el efecto.'};
  if(expected.available===false)return{...base,category:ITV_DIAG.GAP,touch:'SOFTWARE CE · NUEVA CAPACIDAD',confidence:'alta',reason:expected.reason};
  const technical=arr(result?.warnings).some(x=>/timeout|error t[eé]cnico|fallo t[eé]cnico/i.test(trim(x)))||reasons.some(x=>/fallo t[eé]cnico|timeout/i.test(trim(x)));
  if(technical)return{...base,category:ITV_DIAG.TECH,touch:'SOFTWARE CE/INFRA',confidence:'alta',reason:'Fallo técnico independiente de la elección semántica.'};
  // P1.19: NORMALIZED/COMPATIBLE acredita el contrato, pero nunca convierte un KO/WARN funcional en OK.
  if(['UNSUPPORTED_CAPABILITY','UNSUPPORTED'].includes(trim(capAudit?.classification)))return{...base,category:ITV_DIAG.GAP,touch:'SOFTWARE CE · NUEVA CAPACIDAD',confidence:'alta',reason:'Gemini solicitó una operación fuera del registro canónico.'};
  if(['INVALID_CONTRACT','MALFORMED_CALL','MALFORMED'].includes(trim(capAudit?.classification)))return{...base,category:ITV_DIAG.GEMINI,touch:'AYUDA/SCHEMA GEMINI',confidence:'alta',reason:`La operación existe pero el JSON no cumple el contrato: ${arr(capAudit?.issues).join(' | ')}`};
  const opExpected=trim(expected.operation),opObserved=trim(observed.operation);
  if(expected.available===true&&opExpected&&opObserved!==opExpected){
    if(group.includes('continuidad')||group.includes('tabla'))return{...base,category:ITV_DIAG.CONT,touch:'SOFTWARE CONTEXTO + AYUDA GEMINI',confidence:'alta',reason:`La capacidad existe (${opExpected}) pero el turno no conserva/materializa ese contrato.`};
    return{...base,category:ITV_DIAG.GEMINI,touch:'AYUDA/SCHEMA GEMINI',confidence:'alta',reason:`La capacidad existe (${opExpected}) pero se eligió/materializó ${opObserved||'ninguna'}.`};
  }
  if(['compare-metric','purchase-max','purchase-sum'].includes(kind)||arr(c?.oracle?.requiredMetrics).length>1)return{...base,category:ITV_DIAG.PRESENT,touch:'SOFTWARE CE · DERIVACIÓN/PRESENTACIÓN',confidence:'alta',reason:'El contrato de datos es correcto; falta transformar o expresar el resultado pedido.'};
  if(kind==='ledger-structural'&&status==='WARN')return{...base,category:ITV_DIAG.ITV,touch:'ITV',confidence:'alta',reason:'El efecto de vista no está suficientemente expuesto al laboratorio.'};
  if(expected.available===true&&opExpected&&opObserved===opExpected)return{...base,category:ITV_DIAG.CE,touch:'SOFTWARE CE / CONTRATO / DATOS',confidence:'media-alta',reason:'Gemini llegó al contrato esperado; el desacuerdo aparece en ejecución, semántica del contrato o datos devueltos.'};
  if(expected.available===true&&!opExpected&&observed.tool!==expected.tool)return{...base,category:ITV_DIAG.GEMINI,touch:'AYUDA/SCHEMA GEMINI',confidence:'media',reason:'Existe herramienta adecuada pero no se materializó.'};
  return base;
}
function markScenarioCascade(rows=[]){
  const rootByScenario=new Map();
  for(const r of rows){const scenario=trim(r?.scenario);if(!scenario)continue;const bad=!['OK','OBSERVED'].includes(trim(r?.status));if(!bad)continue;const first=rootByScenario.get(scenario);
    if(!first){rootByScenario.set(scenario,r);if(r?.decisionDiagnosis)r.decisionDiagnosis={...r.decisionDiagnosis,rootCause:true,cascade:false,cascadeOf:''};continue;}
    if(r?.decisionDiagnosis){const d=r.decisionDiagnosis;r.decisionDiagnosis={...d,underlyingCategory:d.category,category:ITV_DIAG.CASCADE,touch:'NO CONTAR COMO CAUSA RAÍZ',confidence:'media-alta',rootCause:false,cascade:true,cascadeOf:trim(first?.id),reason:`Fallo posterior al primer KO/WARN del escenario (${trim(first?.id)}). Se conserva la categoría original como underlyingCategory=${d.category}.`};}
  }
  return rows;
}
function p124PresentationEvidence(result={}){const m=result?.meta?.presentationEvidence,rc=result?.meta?.resultContext||{},sort=arr(rc?.current_dataset?.view_state?.sort||rc?.table_view_sort).map(x=>({field:trim(x?.field),direction:trim(x?.direction)==='desc'?'desc':'asc'})).filter(x=>x.field);if(m&&typeof m==='object')return{...m,viewSort:sort};const tables=arr(result?.tables).filter(Boolean).slice(0,8).map(t=>{const rows=arr(t?.rows),columns=arr(t?.columns).length?arr(t.columns).map(trim).filter(Boolean):Object.keys(rows[0]||{}).map(trim).filter(Boolean);return{key:trim(t?.key),title:trim(t?.title),rowCount:rows.length,columns:columns.slice(0,20)};});return{tableCount:tables.length,tables,viewSort:sort,chartCount:arr(result?.charts).filter(Boolean).length,materialized:tables.length>0||arr(result?.charts).length>0};}
function p124NormalizeDialogueAssessment(assessment={},result={}){const a=(assessment&&typeof assessment==='object')?{...assessment}:{},p=p124PresentationEvidence(result),tools=arr(result?.meta?.tools);if(a.empty_promise===true&&(tools.length||p.materialized===true)){a.empty_promise=false;a.note=trim(a.note)||'Hubo ejecución/materialización estructurada; cualquier desacuerdo debe juzgarse por contenido, no como promesa vacía.';}return a;}
function p125TargetTables(target=''){const raw=trim(target);if(!/tabla/i.test(raw))return[];const body=raw.includes('→')?raw.split('→').slice(1).join('→'):raw;return body.split('|').map(x=>trim(x.replace(/\[[^\]]*\].*$/,'').replace(/^tabla\(s\)\s*/i,'').replace(/^tabla\s*/i,''))).filter(x=>x.length>=3).slice(0,6);}
function p125TableTitleMatch(expected='',actual=''){const e=norm(expected),a=norm(actual);if(!e||!a)return false;if(a.includes(e)||e.includes(a))return true;const toks=e.split(' ').filter(x=>x.length>=3&&!['tabla','datos','filas','columnas'].includes(x));return toks.length>0&&toks.every(t=>a.includes(t));}
function p126DialogueArtifactGuard(userMove={},result={},assessment={}){const a={...(assessment||{})},targets=p125TargetTables(userMove?.target),p=p124PresentationEvidence(result),op=trim(result?.meta?.resultContext?.operation);if(!targets.length||!p.materialized||op==='derive')return a;const titles=arr(p.tables).map(t=>trim(t?.title||t?.key)).filter(Boolean),missing=targets.filter(t=>!titles.some(x=>p125TableTitleMatch(t,x)));if(missing.length){a.previous_coherent=false;if(userMove?.changeFocus!==true)a.focus_preserved=false;a.note=`La respuesta materializó otra tabla; faltó ${missing.slice(0,2).join(' / ')}`.slice(0,180);}return a;}
function observedOutcome(c,result,usage={},extra={}){const verdict=validatePaidCase(c,result);const vnext=trim(c?.engine).toUpperCase()==='VNEXT';const diagnosis=vnext?itvDecisionDiagnosis(c,result,verdict):null;return{id:c.id,group:c.group,label:c.label,prompt:c.prompt||'',expected:c.expected||'',actual:text(result?.answer),status:verdict.status,functionalStatus:verdict.functionalStatus||verdict.status,functionalReasons:verdict.functionalReasons||verdict.reasons,performanceStatus:verdict.performanceStatus||'OK',performanceReasons:verdict.performanceReasons||[],validationReasons:verdict.reasons,usage,performance:result?.meta?.performance||{},tools:arr(result?.meta?.tools),engine:vnext?'VNEXT':'LEDGER',provider:text(result?.provider),architecture:text(result?.meta?.architecture),oracleEnabled:true,observationMode:'ORACLE_ACTIVE',serverTitle:text(result?.title),serverWarnings:arr(result?.warnings),resultContext:(result?.meta?.resultContext&&typeof result.meta.resultContext==='object')?result.meta.resultContext:null,vnextAudit:vnext?vNextAuditOf(result):null,capabilityCalls:vnext?arr(result?.meta?.capabilityCalls):[],decisionDiagnosis:diagnosis,debugTrace:arr(result?.meta?.debugTrace).slice(0,60),...ledgerAuditOf(result),...extra};}
function technicalErrorOutcome(c,message,usage={},extra={}){return{id:c.id,group:c.group,label:c.label,prompt:c.prompt||'',expected:c.expected||'',actual:text(message),status:'KO',functionalStatus:'KO',functionalReasons:['fallo técnico/timeout'],performanceStatus:'KO',performanceReasons:['fallo técnico/timeout'],validationReasons:['fallo técnico/timeout'],usage,oracleEnabled:true,observationMode:'ORACLE_ACTIVE',decisionDiagnosis:{category:ITV_DIAG.TECH,touch:'SOFTWARE CE/INFRA',confidence:'alta',expectedCapability:itvCapabilitySignature(itvCapabilityExpectation(c)),observedCapability:'—:—',reason:'Fallo técnico/timeout antes de disponer de una ejecución certificable.'},...extra};}

// FIX2.10 · ORÁCULO FUERTE -----------------------------------------------------
// La ITV no debe aprobar una respuesta solo porque conserve la entidad correcta.
// Estos helpers calculan la verdad esperada desde las tablas reales de CE, sin IA,
// y validan CONTEXTO + CONTENIDO factual + calidad mínima de respuesta.
function firstNonEmpty(...values){ for(const v of values){const x=trim(v);if(x)return x;} return ''; }
function ticketTextLocal(row){ return firstNonEmpty(row?.ticketDonacion,row?.ticket_donacion,row?.ticket,row?.ticketOtrosGastos,row?.ticket_otros_gastos); }
function isDonationTicketLocal(v){ return /^DONADO\s+(TIENDA|SOCIO|OTROS)$/i.test(trim(v)); }
function isPendingTicketLocal(v){ const raw=trim(v); return !raw || /PTE\.?\s*COMPRA|PENDIENTE/i.test(raw); }
function lineAmountLocal(row){ return round(num(row?.unidades)*num(row?.precio),2); }
function mapById(rows=[]){ const m=new Map(); for(const r of arr(rows)){const id=trim(r?.id);if(id)m.set(id,r);} return m; }
function euro(v){ try{return Z.v26FormatEuro(num(v));}catch(_){return `${round(v,2).toFixed(2).replace('.',',')} €`;} }
function parseLocalizedDisplayNumber(raw=''){
  let s=trim(raw).replace(/\s/g,'').replace(/(?:€|euros?|eur)/gi,''); if(!s)return NaN;
  const comma=s.lastIndexOf(','),dot=s.lastIndexOf('.');
  if(comma>=0&&dot>=0){ if(comma>dot)s=s.replace(/\./g,'').replace(',','.'); else s=s.replace(/,/g,''); }
  else if(comma>=0)s=s.replace(/\./g,'').replace(',','.');
  else if(dot>=0){const parts=s.split('.');if(parts.length>2)s=parts.join('');else if(parts.length===2&&/^\d{1,3}$/.test(parts[0].replace(/^[-+]/,''))&&/^\d{3}$/.test(parts[1]))s=parts.join('');}
  const n=Number(s); return Number.isFinite(n)?n:NaN;
}
function euroValues(value=''){
  const out=[],re=/-?(?:\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,4})?|\d+(?:[.,]\d{1,4})?)\s*(?:€|euros?|EUR)/gi;let m;
  while((m=re.exec(text(value)))){const n=parseLocalizedDisplayNumber(m[0]);if(Number.isFinite(n))out.push(round(n,2));}
  return out;
}
function hasMoney(value,amount){ return euroValues(value).some(v=>moneyEq(v,amount)); }
function resultBlob(result){ return `${trim(result?.title)}\n${trim(result?.answer)}`.trim(); }
function resultCtx(result){ const c=result?.meta?.resultContext; return c&&typeof c==='object'?c:{}; }
function resultEvidence(result){ const e=resultCtx(result)?.evidence; return e&&typeof e==='object'?e:null; }
function resultDerived(result){ const d=resultCtx(result)?.derived; return d&&typeof d==='object'?d:null; }
function tableRowsByKeys(result,keys=[]){
  const wanted=new Set(arr(keys).map(trim)); let rows=[];
  for(const t of arr(result?.tables)){ if(wanted.has(trim(t?.key))) rows=rows.concat(arr(t?.rows)); }
  return rows;
}
function looksEmptyOrDeferred(result){
  const a=trim(result?.answer),b=norm(`${result?.title||''} ${a}`);
  if(!a)return true;
  return /control\s*event ha conservado los datos canonicos|se ha omitido una interpretacion|voy a (?:consultar|revisar|buscar)|necesito (?:revisar|consultar) los registros/.test(b);
}
function claimsNoProducts(result){ return /no\s+(?:se\s+)?(?:encontraron|hay|hubo|constan|aparecen)[^.]{0,90}(?:productos?|compras?)/i.test(resultBlob(result)); }
function claimsKnownEventMissing(result,name=''){
  const b=resultBlob(result); if(!hasNameInText(b,name))return false;
  // Solo es negación de EXISTENCIA del evento si la negación apunta al propio concepto "evento".
  // No confundir "no hay compras pendientes" ni "Rafita no figura en el evento X" con "el evento X no existe".
  return /(?:no\s+(?:encuentro|localizo|existe|consta)\s+(?:(?:ning[uú]n|un|el)\s+)?evento\b|no\s+hay\s+(?:(?:ning[uú]n|un)\s+)?evento\b(?:[^.\n]{0,90}(?:llamad|denominad|con\s+el\s+nombre))?|(?:el\s+)?evento\b[^.\n]{0,120}\bno\s+(?:existe|consta|se\s+encuentra|est[aá]\s+registrad[oa]))/i.test(b);
}
function resultUsedTool(result,name=''){return arr(result?.meta?.tools).some(t=>trim(t)===trim(name));}
function hasNameInText(value,name){ const h=norm(value),toks=significant(name); if(yearOf(name)&&!h.includes(yearOf(name)))return false; return toks.length>0&&toks.filter(t=>h.includes(t)).length>=Math.min(2,toks.length); }

function purchaseOracle(state,event){
  const rr=Z.semanticResolveEntity(state,'event',event); if(!rr?.ok)return null;
  const products=mapById(state?.productos),groups=new Map(); let total=0,records=0,totalUnits=0;
  for(const row of arr(state?.compras)){
    if(eventIdOf(row)!==trim(rr.id))continue; const tt=ticketTextLocal(row);
    if(isDonationTicketLocal(tt)||isPendingTicketLocal(tt))continue;
    const pid=trim(row?.productoId||row?.producto_id),prod=products.get(pid)||{},label=trim(prod?.nombre)||pid||'Sin producto',amount=lineAmountLocal(row),units=round(row?.unidades,3);
    total+=amount; totalUnits+=units; records++;
    const k=norm(label),g=groups.get(k)||{label,amount:0,units:0,records:0};g.amount+=amount;g.units+=units;g.records++;groups.set(k,g);
  }
  const rows=[...groups.values()].map(x=>({...x,amount:round(x.amount,2),units:round(x.units,3)}));
  const byAmountDesc=rows.slice().sort((a,b)=>num(b.amount)-num(a.amount)||a.label.localeCompare(b.label,'es',{sensitivity:'base'}));
  const byAmountAsc=rows.slice().sort((a,b)=>num(a.amount)-num(b.amount)||a.label.localeCompare(b.label,'es',{sensitivity:'base'}));
  return{event:rr.nombre,eventId:rr.id,total:round(total,2),totalUnits:round(totalUnits,3),records,productCount:rows.length,rows,max:byAmountDesc[0]||null,min:byAmountAsc[0]||null};
}
function pendingPurchaseOracle(state,event){
  const rr=Z.semanticResolveEntity(state,'event',event); if(!rr?.ok)return null;
  const products=mapById(state?.productos),groups=new Map(); let total=0,records=0,totalUnits=0;
  for(const row of arr(state?.compras)){
    if(eventIdOf(row)!==trim(rr.id))continue; const tt=ticketTextLocal(row);
    if(isDonationTicketLocal(tt)||!isPendingTicketLocal(tt))continue;
    const pid=trim(row?.productoId||row?.producto_id),prod=products.get(pid)||{},label=trim(prod?.nombre)||pid||'Sin producto',amount=lineAmountLocal(row),units=round(row?.unidades,3);
    total+=amount; totalUnits+=units; records++;
    const k=norm(label),g=groups.get(k)||{label,amount:0,units:0,records:0};g.amount+=amount;g.units+=units;g.records++;groups.set(k,g);
  }
  const rows=[...groups.values()].map(x=>({...x,amount:round(x.amount,2),units:round(x.units,3)}));
  const byAmountDesc=rows.slice().sort((a,b)=>num(b.amount)-num(a.amount)||a.label.localeCompare(b.label,'es',{sensitivity:'base'}));
  const byAmountAsc=rows.slice().sort((a,b)=>num(a.amount)-num(b.amount)||a.label.localeCompare(b.label,'es',{sensitivity:'base'}));
  return{event:rr.nombre,eventId:rr.id,total:round(total,2),totalUnits:round(totalUnits,3),records,productCount:rows.length,rows,max:byAmountDesc[0]||null,min:byAmountAsc[0]||null,status:'pending'};
}
async function eventOracle(state,event){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_event',name:'event_dossier',event,scope:'named_event',detail:'brief'},state,'');return{event:trim(r?.facts?.event)||event,income:round(r?.facts?.income_total,2),purchases:round(r?.facts?.purchases_realized,2),pending:round(r?.facts?.purchases_pending,2),donations:round(r?.facts?.donations_value,2),balance:round(r?.facts?.operating_balance,2),valuation:round(r?.facts?.event_valuation,2),attendees:round(r?.facts?.attendees_canonical,3),status:trim(r?.facts?.status)};}catch(_){return null;}
}
async function comparisonOracle(state,events=[]){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_compare',name:'compare_events',events:arr(events),detail:'standard'},state,'');const rows=arr(toolTable(r,'comparison')?.rows).map(x=>({event:trim(x?.Evento),income:round(x?.Ingresos,2),purchases:round(x?.['Compras realizadas'],2),pending:round(x?.['Compras pendientes'],2),donations:round(x?.['Donaciones valoradas'],2),balance:round(x?.['Saldo operativo'],2),valuation:round(x?.['Valoración del evento'],2),attendees:round(x?.['Asistentes canónicos'],3)}));return rows.length>=2?{events:rows.map(x=>x.event),rows}:null;}catch(_){return null;}
}
async function personOracle(state,person,event=''){
  try{const args={id:'itv_oracle_person',name:'person_dossier',person,scope:event?'named_event':'all_events',detail:'brief'};if(event)args.event=event;const r=await execCanonicalTool(state,args,state,'');const f=r?.facts||{};return{person:trim(f.person)||person,event:trim(f.scope_event),eventCount:num(f.event_count),income:round(f.income_linked_total,2),purchases:round(f.purchase_responsibility_total,2),donations:round(f.donations_value,2),purchaseRecords:num(f.purchase_responsibility_records),donationRecords:num(f.donation_records),hitos:num(f.hitos_count),lg:num(f.lg_count),summaryRows:arr(toolTable(r,'summary_by_event')?.rows),incomeRows:arr(toolTable(r,'income_by_event')?.rows)};}catch(_){return null;}
}

async function documentationOracle(state,event){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_docs',name:'event_documentation',event,scope:'named_event',detail:'full'},state,'');const f=r?.facts||{};return{event:trim(f.event)||event,incomeRecords:num(f.income_records),incomeWithReceipt:num(f.income_with_receipt),tickets:num(f.purchase_tickets),ticketsWithImage:num(f.purchase_tickets_with_image),documents:num(f.documents),documentsWithAttachment:num(f.documents_with_attachment),missing:num(f.missing_evidence_count),ticketRows:arr(toolTable(r,'purchase_tickets')?.rows),documentRows:arr(toolTable(r,'documents')?.rows),incomeRows:arr(toolTable(r,'income_receipts')?.rows)};}catch(_){return null;}
}
async function bankOracle(state,event){
  const rr=Z.semanticResolveEntity(state,'event',event);if(!rr?.ok)return null;
  try{
    // Usa exactamente la misma fuente canónica y la misma política que Zuzu. Así la ITV no
    // vuelve a certificar como «Cuadre» candidatos del histórico que la respuesta no debe usar.
    const r=await execCanonicalTool(state,{id:'itv_oracle_bank',name:'event_bank',event:rr.nombre,scope:'named_event',detail:'full'},state,'');
    const f=r?.facts||{},hasReconciliation=f?.has_bank_reconciliation!==false,movements=hasReconciliation?num(f?.included_movement_count??f?.movement_count):0;
    return{event:trim(f?.event)||rr.nombre,eventId:rr.id,eventFinalized:f?.event_finalized===true,hasReconciliation,rowCount:num(f?.reconciliation_row_count),reconciliationStatus:trim(f?.reconciliation_status)||(hasReconciliation?'EN_CURSO_CUADRE_EN_CURSO':(f?.event_finalized===true?'FINALIZADO_CUADRE_SIN_REALIZAR':'EN_CURSO_CUADRE_SIN_INICIAR')),lifecycleMessage:trim(f?.lifecycle_message),complete:f?.reconciliation_complete===true,movements,included:movements,income:hasReconciliation?round(f?.included_income_total,2):0,expense:hasReconciliation?round(f?.included_charge_total,2):0,impact:hasReconciliation?round(f?.bank_impact,2):0,opening:hasReconciliation?round(f?.opening_balance,2):0,closing:hasReconciliation?round(f?.closing_balance,2):0,cashIncome:0,eventIncome:hasReconciliation?round(f?.included_income_total,2):0,period:hasReconciliation?(f?.period||{}):{},ticketSummary:hasReconciliation?(f?.ticket_summary||{}):{},incomeSummary:hasReconciliation?(f?.income_summary||{}):{},periodCandidates:num(f?.period_candidate_movement_count),hasData:hasReconciliation&&f?.bank_data_available!==false&&movements>0};
  }catch(_){return null;}
}

async function managementOracle(state,event){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_management',name:'event_management',event,scope:'named_event',detail:'full'},state,'');const f=r?.facts||{};return{event:trim(f.event)||event,hitos:num(f.hitos_count),lg:num(f.lg_count),completed:num(f.lg_completed),pending:num(f.lg_pending)};}catch(_){return null;}
}
async function donationOracle(state,event){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_donations',name:'event_donation_lines',event,scope:'named_event',detail:'full'},state,'');const f=r?.facts||{};return{event:trim(f.event)||event,records:num(f.donation_record_count),donors:num(f.donor_count),products:num(f.product_count),total:round(f.total_value,2),supposed:num(f.donations_supposed_count??f.supposed_count??f.supuesta_count),committed:num(f.donations_committed_count??f.committed_count??f.comprometida_count),delivered:num(f.donations_delivered_count??f.delivered_count??f.entregada_count),supposedValue:round(f.donations_supposed_value??f.supposed_value??f.supuesta_value,2),committedValue:round(f.donations_committed_value??f.committed_value??f.comprometida_value,2),deliveredValue:round(f.donations_delivered_value??f.delivered_value??f.entregada_value,2),lineRows:arr(toolTable(r,'donation_lines')?.rows),donorRows:arr(toolTable(r,'donors')?.rows),productRows:arr(toolTable(r,'donor_products')?.rows)};}catch(_){return null;}
}
function attendanceOracle(eventData,event){return eventData?{event,attendees:num(eventData.attendees)}:null;}

function catalogOracle(state,entity){
  const map={events:arr(state?.eventos),people:arr(state?.personas),products:arr(state?.productos),stores:arr(state?.tiendas)};return{entity,count:arr(map[entity]).length};
}
async function eventsOverviewOracle(state){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_events_overview',name:'events_overview',detail:'full'},state,'');return{count:num(r?.facts?.event_count),rows:arr(toolTable(r,'events_overview')?.rows)};}catch(_){return null;}
}
async function peopleActivityOracle(state){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_people_activity',name:'people_activity',detail:'full'},state,'');return{count:num(r?.facts?.entities),rows:arr(toolTable(r,'people_activity')?.rows)};}catch(_){return null;}
}
async function canonicalSociosOracle(state){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_socios',name:'canonical_socios',detail:'full'},state,'');return{records:num(r?.facts?.canonical_records),people:num(r?.facts?.people_count),rows:arr(toolTable(r,'socios')?.rows)};}catch(_){return null;}
}
async function participationOracle(state,person){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_participation',name:'participation_events',person,detail:'full'},state,'');return{person:trim(r?.facts?.person)||person,eventCount:num(r?.facts?.event_count),rows:arr(toolTable(r,'events')?.rows)};}catch(_){return null;}
}
async function storePurchasesOracle(state,store){
  try{const r=await execCanonicalTool(state,{id:'itv_oracle_store',name:'store_purchases',store,scope:'all_events',status:'realized',include_empty:false,detail:'full'},state,'');return{store:trim(r?.facts?.store)||store,eventCount:num(r?.facts?.event_count),records:num(r?.facts?.total_records),total:round(r?.facts?.total_amount,2),rows:arr(toolTable(r,'by_event')?.rows)};}catch(_){return null;}
}
async function bankTimelineOracle(state,event){
  try{
    const r=await execCanonicalTool(state,{id:'itv_oracle_bank_timeline',name:'event_bank_timeline',event,scope:'named_event',detail:'full'},state,'');
    const f=r?.facts||{},hasReconciliation=f?.has_bank_reconciliation!==false;
    return{event:trim(f?.event)||event,eventFinalized:f?.event_finalized===true,hasReconciliation,rowCount:num(f?.reconciliation_row_count),reconciliationStatus:trim(f?.reconciliation_status)||(hasReconciliation?'EN_CURSO_CUADRE_EN_CURSO':(f?.event_finalized===true?'FINALIZADO_CUADRE_SIN_REALIZAR':'EN_CURSO_CUADRE_SIN_INICIAR')),lifecycleMessage:trim(f?.lifecycle_message),points:hasReconciliation?num(f?.timeline_movement_count):0,opening:hasReconciliation?round(f?.opening_balance,2):0,closing:hasReconciliation?round(f?.closing_balance,2):0,impact:hasReconciliation?round(f?.bank_impact,2):0,rows:hasReconciliation?arr(toolTable(r,'balance_timeline')?.rows):[]};
  }catch(_){return null;}
}
async function refreshHistoricalCanonicalSociosOracle(caseDef,state){
  const c=caseDef;if(trim(c?.oracle?.kind)!=='canonical-socios')return c;
  try{
    const data=await canonicalSociosOracle(state);if(!data)return c;
    c.oracle={kind:'canonical-socios',records:data.records,people:data.people};
    c.expected=expectedOracleText(c.oracle);
  }catch(_){/* Si falla la lectura actual, se conserva el contrato histórico. */}
  return c;
}

async function refreshHistoricalBankOracle(caseDef,state){
  const c=caseDef,kind=trim(c?.oracle?.kind),event=trim(c?.event||c?.oracle?.event);
  if(!event||!['bank-summary','bank-timeline'].includes(kind))return c;
  try{
    if(kind==='bank-summary'){
      const data=await bankOracle(state,event);if(!data)return c;
      c.oracle={kind:'bank-summary',event:data.event||event,data};
      c.expected=expectedOracleText(c.oracle);
      return c;
    }
    const data=await bankTimelineOracle(state,event);if(!data)return c;
    c.oracle={kind:'bank-timeline',event:data.event||event,...data};
    c.expected=expectedOracleText(c.oracle);
  }catch(_){/* Si no podemos refrescar la verdad bancaria, conservamos el contrato histórico. */}
  return c;
}

function donationCountForEvent(state,eventId){return arr(state?.compras).filter(r=>eventIdOf(r)===trim(eventId)&&isDonationTicketLocal(ticketTextLocal(r))).length;}

function metricWinner(compare,metric){
  const rows=arr(compare?.rows); if(rows.length<2)return null; const sorted=rows.slice().sort((a,b)=>num(b?.[metric])-num(a?.[metric])||trim(a.event).localeCompare(trim(b.event),'es'));const winner=sorted[0],runner=sorted[1];return{winner,runner,diff:round(num(winner?.[metric])-num(runner?.[metric]),metric==='attendees'?3:2)};
}
function expectedOracleText(oracle){
  if(!oracle)return'';
  if(oracle.kind==='purchase-set')return `${oracle.event}: ${oracle.productCount} productos · ${euro(oracle.total)}`;
  if(oracle.kind==='purchase-presence')return `${oracle.event}: compras presentes (${oracle.productCount||0} productos canónicos)`;
  if(oracle.kind==='event-summary')return `${oracle.event}: resumen canónico disponible`;
  if(oracle.kind==='purchase-max'||oracle.kind==='purchase-min')return `${oracle.row?.label||'—'} · ${euro(oracle.row?.amount||0)}`;
  if(oracle.kind==='purchase-sum')return `${oracle.event}: ${euro(oracle.total)}`;
  if(oracle.kind==='compare-metric'){const w=metricWinner(oracle.compare,oracle.metric);return w?`${w.winner.event} · ${euro(w.winner[oracle.metric])} · diferencia ${euro(w.diff)}`:'';}
  if(oracle.kind==='person-income'&&oracle.known!==false)return `${oracle.person}: ${euro(oracle.total)}`;
  if(oracle.kind==='person-relation'&&oracle.known!==false)return `${oracle.person} ${oracle.related?'SÍ':'NO'} tiene relación con ${oracle.event}`;
  if(oracle.kind==='event-economy')return `${oracle.event}: ingresos ${euro(oracle.data?.income)} · compras ${euro(oracle.data?.purchases)} · saldo ${euro(oracle.data?.balance)}`;
  if(oracle.kind==='documentation')return `${oracle.event}: ingresos ${oracle.data?.incomeRecords||0} (${oracle.data?.incomeWithReceipt||0} justificantes) · TKxx ${oracle.data?.tickets||0} (${oracle.data?.ticketsWithImage||0} imágenes) · DOC ${oracle.data?.documents||0} (${oracle.data?.documentsWithAttachment||0} adjuntos) · faltan ${oracle.data?.missing||0}`;
  if(oracle.kind==='ticket-detail')return `${oracle.event}: ${oracle.ticket}`;
  if(oracle.kind==='catalog-count')return `${oracle.entity}: ${oracle.count} registros`;
  if(oracle.kind==='bank-summary')return trim(oracle.data?.lifecycleMessage)||(oracle.data?.hasReconciliation===false?`${oracle.event}: no consta Cuadre Banco configurado`:`${oracle.event}: ${oracle.data?.movements||0} movimientos${oracle.data?.hasData?` · impacto ${euro(oracle.data?.impact||0)}`:''}`);
  if(oracle.kind==='attendance')return `${oracle.event}: ${oracle.data?.attendees||0} asistentes`;
  if(oracle.kind==='management')return `${oracle.event}: ${oracle.data?.hitos||0} hitos · ${oracle.data?.lg||0} LG · ${oracle.data?.pending||0} pendientes`;
  if(oracle.kind==='donations')return `${oracle.event}: ${oracle.data?.records||0} donaciones · ${oracle.data?.donors||0} donantes · ${euro(oracle.data?.total||0)}`;
  if(oracle.kind==='donation-status')return `${oracle.event}: ${arr(oracle.statuses).join('+')} · ${oracle.records||0} registros · ${euro(oracle.total||0)}`;
  if(oracle.kind==='documentation-field')return `${oracle.event}: ${oracle.label} = ${oracle.value}`;
  if(oracle.kind==='event-metric')return `${oracle.event}: ${oracle.label} = ${euro(oracle.value)}`;
  if(oracle.kind==='events-overview')return `Panorama: ${oracle.count} eventos`;
  if(oracle.kind==='people-activity')return `Identidades personales canónicas globales: ${oracle.count}`;
  if(oracle.kind==='canonical-socios')return `Socios canónicos: ${oracle.records} registros · ${oracle.people} personas`;
  if(oracle.kind==='store-purchases')return `${oracle.store}: ${euro(oracle.total)} · ${oracle.records} registros en ${oracle.eventCount} eventos`;
  if(oracle.kind==='participation-events')return `${oracle.person}: ${oracle.eventCount} eventos`;
  if(oracle.kind==='bank-timeline')return trim(oracle.lifecycleMessage)||(oracle.hasReconciliation===false?`${oracle.event}: no consta Cuadre Banco configurado`:`${oracle.event}: ${oracle.points} puntos · impacto ${euro(oracle.impact)}`);
  return'';
}
function oracleFail(reasons=[]){return{ok:false,reasons:arr(reasons).filter(Boolean)};}
function oraclePass(){return{ok:true,reasons:[]};}
function validateOracle(caseDef,result){
  const reasons=[],oracle=caseDef?.oracle||null,blob=resultBlob(result),ctx=resultCtx(result),ev=resultEvidence(result),derived=resultDerived(result);
  if(!result?.ok)reasons.push('result.ok=false');
  if(caseDef?.requireAnswer!==false&&looksEmptyOrDeferred(result))reasons.push(!trim(result?.answer)?'respuesta vacía':'respuesta aplazada/genérica sin resolver el dato');
  if(caseDef?.event&&!resultHasEvent(result,caseDef.event))reasons.push(`foco de evento distinto de ${caseDef.event}`);
  if(caseDef?.event&&claimsKnownEventMissing(result,caseDef.event))reasons.push(`niega que exista un evento canónico real: ${caseDef.event}`);
  if(arr(caseDef?.events).length&&!arr(caseDef.events).every(n=>resultHasEvent(result,n)))reasons.push('la comparación no conserva todos los eventos');
  if(caseDef?.person&&!resultHasPerson(result,caseDef.person))reasons.push(`sujeto distinto de ${caseDef.person}`);
  if(!oracle)return reasons.length?oracleFail(reasons):oraclePass();

  if(oracle.kind==='event-summary'){
    const d=oracle.data||{},answerText=text(result?.answer);
    if(claimsKnownEventMissing(result,oracle.event)||/\b(?:no\s+(?:se\s+)?(?:han\s+)?encontrad[oa]s?|no\s+hay|sin)\b[^.\n]{0,80}\b(?:datos|detalle|informaci[oó]n)\b/i.test(answerText))reasons.push(`resumen de evento: afirma ausencia de datos canónicos para ${oracle.event}`);
    const money=[d.income,d.purchases,d.pending,d.donations,d.balance,d.valuation].filter(v=>Number.isFinite(Number(v))&&Math.abs(Number(v))>0.004);
    if(money.length&&!money.some(v=>hasMoney(blob,v))&&!arr(result?.tables).length&&!resultUsedTool(result,'event_dossier')&&!resultUsedTool(result,'query_ce'))reasons.push('resumen de evento: no acredita ninguna magnitud canónica disponible');
    for(const metric of arr(oracle.requiredMetrics)){
      if(metric==='income'&&!hasMoney(blob,d.income))reasons.push(`objetivo múltiple: falta ingreso ${euro(d.income)}`);
      if(metric==='purchases'&&!hasMoney(blob,d.purchases))reasons.push(`objetivo múltiple: faltan compras ${euro(d.purchases)}`);
      if(metric==='balance'&&!hasMoney(blob,d.balance))reasons.push(`objetivo múltiple: falta saldo ${euro(d.balance)}`);
      if(metric==='attendees'&&!new RegExp(`\\b${Number(d.attendees)}\\b[^.\n]{0,45}(?:asistent|person|gente)|(?:asistent|person|gente)[^.\n]{0,45}\\b${Number(d.attendees)}\\b`,'i').test(blob))reasons.push(`objetivo múltiple: falta asistencia ${Number(d.attendees)}`);
    }
  }else if(oracle.kind==='purchase-set'){
    if(oracle.productCount>0&&claimsNoProducts(result))reasons.push(`afirma que no hay productos, pero CE tiene ${oracle.productCount}`);
    if(ev?.kind==='product_set'){
      if(trim(ev.filterProduct))reasons.push(`aplicó un filtro de producto no pedido: ${ev.filterProduct}`);
      if(num(ev.productCount||ev.distinctCount)!==num(oracle.productCount))reasons.push(`conteo de productos ${num(ev.productCount||ev.distinctCount)} != ${oracle.productCount}`);
      if(!moneyEq(ev.totalAmount,oracle.total))reasons.push(`total del result-set ${euro(ev.totalAmount)} != ${euro(oracle.total)}`);
    }else{
      const byProduct=vNextTableRowsAsObjects(result,'by_product'),anyRows=arr(result?.tables).flatMap(t=>vNextTableRowsAsObjects({tables:[t]})).filter(r=>trim(r?.Producto||r?.label)),payload=result?.meta?.ledgerAudit?.execution?.answer_payload||{},payloadItems=arr(payload?.item_values).map(trim).filter(Boolean);
      const productRows=byProduct.length?byProduct:anyRows,labels=new Set([...productRows.map(r=>norm(r?.Producto||r?.label)).filter(Boolean),...payloadItems.map(norm)]);
      if(oracle.productCount>0&&labels.size===0)reasons.push('no entrega un result-set de productos verificable');
      if(byProduct.length&&num(labels.size)!==num(oracle.productCount))reasons.push(`conteo by_product ${labels.size} != ${oracle.productCount}`);
      if(payloadItems.length&&num(payloadItems.length)!==num(oracle.productCount))reasons.push(`conteo del result-set estructurado ${payloadItems.length} != ${oracle.productCount}`);
      const amountField=byProduct.length?['Importe','Total','Valor'].find(k=>byProduct.some(r=>Number.isFinite(Number(r?.[k])))):'';if(amountField){const total=byProduct.reduce((sum,r)=>sum+num(r?.[amountField]),0);if(!moneyEq(total,oracle.total))reasons.push(`total by_product ${euro(total)} != ${euro(oracle.total)}`);}
      if(payload?.amount_value!=null&&!moneyEq(payload.amount_value,oracle.total))reasons.push(`total del result-set estructurado ${euro(payload.amount_value)} != ${euro(oracle.total)}`);
    }
  }else if(oracle.kind==='purchase-presence'){
    const pc=num(oracle.productCount),payload=result?.meta?.ledgerAudit?.execution?.answer_payload||{},payloadItems=arr(payload?.item_values).map(trim).filter(Boolean),rows=arr(result?.tables).flatMap(t=>arr(t?.rows));
    if(pc>0&&claimsNoProducts(result))reasons.push(`compras: afirma ausencia de productos, pero CE tiene ${pc}`);
    if(pc>0&&payloadItems.length===0&&rows.length===0&&!resultUsedTool(result,'event_purchase_lines'))reasons.push('compras: no materializa el conjunto canónico disponible');
  }else if(oracle.kind==='purchase-max'||oracle.kind==='purchase-min'){
    const op=oracle.kind==='purchase-max'?'max':'min',row=oracle.row;
    if(!row)reasons.push('el oráculo no tiene producto esperado');
    else if(derived?.operation===op){if(norm(derived.label)!==norm(row.label))reasons.push(`${op} producto ${derived.label||'—'} != ${row.label}`);if(!moneyEq(derived.value,row.amount))reasons.push(`${op} importe ${euro(derived.value)} != ${euro(row.amount)}`);}
    else{if(!hasNameInText(blob,row.label))reasons.push(`no identifica el producto esperado: ${row.label}`);if(!hasMoney(blob,row.amount))reasons.push(`no devuelve el importe esperado: ${euro(row.amount)}`);}
  }else if(oracle.kind==='purchase-sum'){
    if(derived?.operation==='sum'){if(!moneyEq(derived.value,oracle.total))reasons.push(`suma ${euro(derived.value)} != ${euro(oracle.total)}`);}
    else if(!hasMoney(blob,oracle.total))reasons.push(`no devuelve la suma canónica ${euro(oracle.total)}`);
  }else if(oracle.kind==='comparison'){
    if(!oracle.compare?.rows?.length)reasons.push('sin comparación canónica de referencia');
    const ce=ev?.kind==='event_comparison'?arr(ev.rows):[];
    if(ce.length>=2){for(const expected of oracle.compare.rows){const got=ce.find(r=>norm(r.event)===norm(expected.event));if(!got){reasons.push(`falta ${expected.event} en evidencia comparativa`);continue;}for(const k of ['income','purchases','donations','balance'])if(!moneyEq(got[k],expected[k]))reasons.push(`${expected.event} ${k} no coincide`);}}
  }else if(oracle.kind==='compare-metric'){
    const w=metricWinner(oracle.compare,oracle.metric);if(!w)reasons.push('sin ganador canónico');else if(derived?.operation==='comparison_max'){
      if(norm(derived.winner)!==norm(w.winner.event))reasons.push(`ganador ${derived.winner||'—'} != ${w.winner.event}`);
      if(!moneyEq(derived.difference,w.diff))reasons.push(`diferencia ${euro(derived.difference)} != ${euro(w.diff)}`);
    }else{if(!hasNameInText(blob,w.winner.event))reasons.push(`no identifica ganador ${w.winner.event}`);if(!hasMoney(blob,w.winner[oracle.metric]))reasons.push(`no contiene valor ganador ${euro(w.winner[oracle.metric])}`);}
  }else if(oracle.kind==='event-economy'){
    const d=oracle.data;if(d){const values=[d.balance,d.income,d.purchases].filter(v=>Number.isFinite(Number(v)));if(values.length&&!values.some(v=>hasMoney(blob,v)))reasons.push('no contiene ninguna magnitud económica canónica esperada');}
  }else if(oracle.kind==='person-summary'){
    if(!trim(result?.answer))reasons.push('resumen personal vacío');
    const d=oracle.data||{},expectedEvents=arr(d.summaryRows).map(r=>trim(r?.Evento)).filter(Boolean);
    if(d.eventCount>0&&!hasNameInText(blob,oracle.person)&&!resultHasPerson(result,oracle.person))reasons.push('no mantiene la identidad personal');
    const countMatch=d.eventCount<=0||new RegExp(`\\b${Number(d.eventCount)}\\b[^.\n]{0,30}eventos?|eventos?[^.\n]{0,30}\\b${Number(d.eventCount)}\\b`,'i').test(blob)||expectedEvents.some(n=>hasNameInText(blob,n))||arr(result?.tables).length>0;
    if(!countMatch)reasons.push(`dossier personal: no acredita sus ${Number(d.eventCount)} eventos`);
    for(const [label,value] of [['ingresos',d.income],['compras',d.purchases],['donaciones',d.donations]])if(Math.abs(num(value))>0.004&&!hasMoney(blob,value))reasons.push(`dossier personal incompleto: faltan ${label} ${euro(value)}`);
  }else if(oracle.kind==='person-events'){
    const names=arr(oracle.data?.summaryRows).map(r=>trim(r?.Evento)).filter(Boolean),expectedCount=num(oracle.data?.eventCount);
    if(expectedCount>0&&/(?:aparece|figura|participa|est[aá])[^.\n]{0,45}\b0\s+eventos?\b|\b0\s+eventos?\b/i.test(blob))reasons.push(`afirma 0 eventos, pero CE acredita ${expectedCount}`);
    const m=blob.match(/\b(\d+)\s+eventos?\b/i);if(m&&expectedCount>0&&Number(m[1])!==expectedCount)reasons.push(`recuento de eventos ${Number(m[1])} != ${expectedCount}`);
    if(names.length&&!names.some(n=>hasNameInText(blob,n))&&arr(result?.tables).length===0&&!(m&&Number(m[1])===expectedCount))reasons.push('no muestra ningún evento real de la persona');
  }else if(oracle.kind==='person-income'){
    if(oracle.known!==false&&!hasMoney(blob,oracle.total))reasons.push(`ingreso vinculado no coincide con ${euro(oracle.total)}`);
  }else if(oracle.kind==='person-relation'){
    if(oracle.known!==false){const neg=/\bno\s+(?:figura|aparece|tiene|consta|se\s+encuentra|se\s+registra|se\s+registran|hay)|ninguna\s+relaci[oó]n|sin\s+relaci[oó]n\s+registrada|no\s+se\s+encontr/i.test(blob),pos=/\bsi\b|\bsí\b|figura|aparece|tiene\s+relaci[oó]n|vinculad/i.test(blob);
    if(oracle.related&&neg&&!pos)reasons.push('niega una relación que sí existe');
    if(!oracle.related&&!neg)reasons.push('no niega una relación que CE no registra');}
  }else if(oracle.kind==='documentation'){
    const d=oracle.data;if(d){const nums=[d.incomeRecords,d.incomeWithReceipt,d.tickets,d.ticketsWithImage,d.documents,d.documentsWithAttachment,d.missing];if(!nums.some(n=>new RegExp(`\\b${Number(n)}\\b`).test(blob)))reasons.push('no refleja ningún recuento documental canónico');}
  }else if(oracle.kind==='ticket-detail'){
    if(oracle.ticket&&!norm(blob).includes(norm(oracle.ticket)))reasons.push(`no conserva el TKxx esperado ${oracle.ticket}`);
  }else if(oracle.kind==='catalog-count'){
    if(!new RegExp(`\\b${Number(oracle.count)}\\b`).test(blob)&&!arr(result?.tables).some(t=>arr(t?.rows).length===Number(oracle.count)))reasons.push(`catálogo: no acredita ${oracle.count} registros`);
  }else if(oracle.kind==='bank-summary'){
    const d=oracle.data,required=trim(d?.lifecycleMessage),normalizedRequired=norm(required),promptNorm=norm(caseDef?.prompt),asksLifecycle=/cuadre|concili|justific|estado|como qued|cómo qued/.test(promptNorm),asksCount=/cuantos? movimientos|cuántos movimientos|numero de movimientos|número de movimientos/.test(promptNorm),asksImpact=/impacto|saldo final|neto/.test(promptNorm);
    // BANK4_10 · el oráculo evalúa lo que se preguntó. Un recuento no obliga a recitar
    // también el estado del cuadre: eso penalizaba justo la conversación humana que buscamos.
    if(required&&asksLifecycle&&!norm(blob).includes(normalizedRequired))reasons.push(`estado de Cuadre Banco no coincide: se exige «${required}»`);
    if(d?.hasReconciliation===false){
      // P1.18: el estado SIN REALIZAR manda. Los ceros explícitos no contradicen el oráculo.
      const hasBankTable=arr(result?.tables).some(t=>arr(t?.rows).length>0),answerText=text(result?.answer),nonZeroMoney=euroValues(answerText).some(v=>Math.abs(num(v))>0.004),movementClaims=[...answerText.matchAll(/\b(\d+)\s+movimientos?\b/gi)].some(m=>Number(m[1])>0);
      if(hasBankTable||nonZeroMoney||movementClaims)reasons.push('Cuadre inexistente: no puede mezclar magnitudes no nulas ni tablas del histórico general');
    }else if(d?.hasData){
      if(asksCount&&d.movements>0&&!new RegExp(`\\b${Number(d.movements)}\\b`).test(blob))reasons.push(`no devuelve el recuento bancario canónico ${Number(d.movements)}`);
      else if(asksImpact&&!hasMoney(blob,d.impact)&&!hasMoney(blob,d.closing))reasons.push('no devuelve la magnitud bancaria solicitada');
      else if(!asksCount&&!asksImpact&&d.movements>0&&!new RegExp(`\\b${Number(d.movements)}\\b`).test(blob)&&!hasMoney(blob,d.impact)&&!hasMoney(blob,d.closing))reasons.push('no devuelve ninguna magnitud bancaria canónica almacenada');
    }
  }else if(oracle.kind==='attendance'){
    const d=oracle.data;if(d&&d.attendees>=0&&!new RegExp(`\\b${Number(d.attendees)}\\b`).test(blob))reasons.push(`asistencia: no acredita ${d.attendees} personas`);
  }else if(oracle.kind==='management'){
    const d=oracle.data,hasMgmtLabel=/\bhitos?\b|\b(?:tareas?\s+)?LG\b/i.test(blob);
    if(d&&!hasMgmtLabel)reasons.push('gestión: la respuesta no materializa Hitos/LG');
    else if(d&&![d.hitos,d.lg,d.pending,d.completed].some(n=>new RegExp(`\\b${Number(n)}\\b`).test(blob)))reasons.push('gestión: no refleja ningún recuento canónico de Hitos/LG');
  }else if(oracle.kind==='donations'){
    const d=oracle.data;if(d){
      if(d.records>0&&claimsNoProducts(result))reasons.push('donaciones: afirma ausencia de producto pese a existir registros');
      if(d.total>0&&!hasMoney(blob,d.total)&&!new RegExp(`\b${Number(d.records)}\b`).test(blob))reasons.push(`donaciones: no acredita ${euro(d.total)} ni ${d.records} registros`);
      // P1.19: cero también es un hecho. Un "Evento: ." no acredita donaciones=0.
      if(num(d.records)===0&&num(d.donors)===0&&Math.abs(num(d.total))<0.005){const nb=norm(blob),zeroDonation=/\b0(?:[.,]0{1,2})?\s*(?:€|euros?)?\b/.test(blob)&&/donacion/.test(nb),semanticZero=/\b(?:sin|no hay|no constan|ninguna?s?)\s+(?:registros?\s+de\s+)?donaciones?\b/.test(nb);if(!zeroDonation&&!semanticZero)reasons.push('donaciones: el valor cero debe materializarse explícitamente');}
    }
  }else if(oracle.kind==='donation-status'){
    const expectedStatuses=arr(oracle.statuses).map(norm).filter(Boolean),expectedRecords=num(oracle.records),expectedTotal=round(oracle.total,2),plan=vItvLedgerPlan(result),q=plan?.query||{},ops=arr(q?.operations),statusOps=ops.filter(op=>trim(op?.type)==='filter'&&/situacion entrega|donation delivery status|donacion situacion/.test(norm(op?.field))),planStatuses=[...arr(q?.donation_delivery_statuses),...statusOps.flatMap(op=>arr(op?.value).length?arr(op.value):[op?.value])].map(norm).filter(Boolean);
    if(expectedStatuses.length&&!expectedStatuses.every(st=>planStatuses.includes(st)))reasons.push(`donaciones: no conserva filtro físico ${arr(oracle.statuses).join('/')}`);
    const payload=result?.meta?.ledgerAudit?.execution?.answer_payload||{},gotCount=payload?.count!=null?num(payload.count):null,gotAmount=payload?.amount_value!=null?round(payload.amount_value,2):null;
    if(gotCount!=null&&gotCount!==expectedRecords)reasons.push(`donaciones: subconjunto ${gotCount} registros != ${expectedRecords}`);
    else if(expectedRecords>0&&!new RegExp(`\b${expectedRecords}\b`).test(blob)&&!arr(result?.tables).some(t=>arr(t?.rows).length===expectedRecords))reasons.push(`donaciones: no acredita ${expectedRecords} registros del subconjunto físico`);
    if(gotAmount!=null&&!moneyEq(gotAmount,expectedTotal))reasons.push(`donaciones: importe del subconjunto ${euro(gotAmount)} != ${euro(expectedTotal)}`);
    else if(Math.abs(expectedTotal)>0.004&&!hasMoney(blob,expectedTotal)&&gotAmount==null)reasons.push(`donaciones: no acredita ${euro(expectedTotal)} del subconjunto físico`);
    if(expectedRecords===0&&(/\b[1-9]\d*\s+(?:registros?|donaciones?|productos?)\b/.test(blob)||(gotCount!=null&&gotCount>0)))reasons.push('donaciones: debería devolver subconjunto físico vacío');
    if(oracle.requireResponsible){const wanted=arr(oracle.responsibles).map(norm).filter(Boolean);if(wanted.length&&!wanted.some(n=>norm(blob).includes(n)))reasons.push('donaciones: no conserva responsables/donantes del subconjunto «esas»');}
  }else if(oracle.kind==='documentation-field'){
    const expected=Number(oracle.value),label=norm(oracle.label);
    const numeric=new RegExp(`\\b${expected}\\b`).test(blob);
    const docCodes=[...new Set((blob.match(/\bDOC\s*\d+\b/gi)||[]).map(x=>norm(x).replace(/\s+/g,'')))];
    const tkCodes=[...new Set((blob.match(/\bTK\s*\d+\b/gi)||[]).map(x=>norm(x).replace(/\s+/g,'')))];
    const tableEvidence=arr(result?.tables).some(t=>arr(t?.rows).length>=expected);
    const codeEvidence=(label.includes('document')&&docCodes.length>=expected)||((label.includes('tkxx')||label.includes('ticket'))&&tkCodes.length>=expected);
    if(!numeric&&!codeEvidence&&!tableEvidence)reasons.push(`documentación: ${oracle.label} esperado ${oracle.value}`);
  }else if(oracle.kind==='event-metric'){
    const zeroSemantic=Math.abs(num(oracle.value))<0.005&&/compras?\s+pendientes?/.test(norm(oracle.label))&&/\b(?:no\s+(?:queda|quedan|hay|tiene|tienen)\s+(?:ninguna?s?\s+|nada\s+)?compras?\s+pendientes?|no\s+(?:queda|quedan|hay|tiene|tienen)\s+(?:nada\s+|ninguna?s?\s+)?pendiente|sin\s+compras?\s+pendientes?|nada\s+pendiente)\b/.test(norm(blob));
    if(!hasMoney(blob,oracle.value)&&!zeroSemantic)reasons.push(`${oracle.label}: no devuelve ${euro(oracle.value)}`);
  }else if(oracle.kind==='events-overview'){
    if(!new RegExp(`\\b${Number(oracle.count)}\\b`).test(blob)&&!arr(result?.tables).some(t=>arr(t?.rows).length===Number(oracle.count)))reasons.push(`panorama global: no acredita ${oracle.count} eventos`);
  }else if(oracle.kind==='people-activity'){
    const exactCount=new RegExp(`\\b${Number(oracle.count)}\\b`).test(blob)||arr(result?.tables).some(t=>arr(t?.rows).length===Number(oracle.count));
    // Si la herramienta canónica people_activity se ejecutó, no obligamos a Zuzu a recitar
    // el tamaño total del universo cuando la pregunta pide el ranking/actividad de personas.
    if(oracle.count>0&&!exactCount&&!resultUsedTool(result,'people_activity'))reasons.push(`actividad global: no acredita ${oracle.count} personas canónicas`);
  }else if(oracle.kind==='canonical-socios'){
    if(oracle.records>0&&!new RegExp(`\\b${Number(oracle.records)}\\b`).test(blob)&&!new RegExp(`\\b${Number(oracle.people)}\\b`).test(blob)&&!arr(result?.tables).some(t=>arr(t?.rows).length===Number(oracle.records)))reasons.push(`socios canónicos: no acredita ${oracle.records} registros / ${oracle.people} personas`);
  }else if(oracle.kind==='store-purchases'){
    if(!hasNameInText(blob,oracle.store)&&!arr(result?.tables).length)reasons.push(`tienda no acreditada: ${oracle.store}`);
    if(oracle.total>0&&!hasMoney(blob,oracle.total)&&!arr(result?.tables).length)reasons.push(`compras de tienda: no acredita ${euro(oracle.total)}`);
    if(num(oracle.records)===0&&/no puedo resolver la persona|persona .* no (?:resuelta|encontrada)|no encuentro (?:a )?la persona/i.test(text(result?.answer)))reasons.push('tienda sin compras: se ha desviado al dominio persona');
  }else if(oracle.kind==='participation-events'){
    const exactCount=new RegExp(`\\b${Number(oracle.eventCount)}\\b`).test(blob)||arr(result?.tables).some(t=>arr(t?.rows).length===Number(oracle.eventCount));
    const expectedNames=arr(oracle?.rows).map(r=>trim(r?.Evento)).filter(Boolean);
    const namedCount=expectedNames.filter(n=>hasNameInText(blob,n)).length;
    if(oracle.eventCount>0&&!exactCount&&namedCount<Math.min(Number(oracle.eventCount),expectedNames.length||Number(oracle.eventCount)))reasons.push(`participación: no acredita ${oracle.eventCount} eventos`);
  }else if(oracle.kind==='bank-timeline'){
    const required=trim(oracle.lifecycleMessage),normalizedRequired=norm(required);
    if(required&&!norm(blob).includes(normalizedRequired))reasons.push(`estado de cronología bancaria no coincide: se exige «${required}»`);
    if(oracle.hasReconciliation===false){
      if(arr(result?.tables).some(t=>arr(t?.rows).length>0)||/\d[\d.,]*\s*€|\b\d+\s+(?:puntos?|movimientos?)\b/i.test(text(result?.answer)))reasons.push('Cuadre inexistente: no debe materializar cronología ni magnitudes desde el histórico general');
    }else if(oracle.points>0&&!new RegExp(`\\b${Number(oracle.points)}\\b`).test(blob)&&!arr(result?.tables).some(t=>arr(t?.rows).length>=Number(oracle.points)))reasons.push(`cronología bancaria: no acredita ${oracle.points} puntos/movimientos almacenados`);
  }
  return reasons.length?oracleFail(reasons):oraclePass();
}
function vItvLedgerPlan(result={}){return result?.meta?.ledgerAudit?.normalizedPlan||{};}
function vItvLedgerDataset(result={}){return result?.meta?.resultContext?.ledger?.dataset||null;}
function vItvLedgerView(result={}){return result?.meta?.resultContext?.ledger?.view||null;}
function vItvPlanEntityValues(plan={}){
  const q=plan?.query||{},vals=[];
  if(q.product?.text)vals.push(q.product.text);
  for(const k of ['person','responsible','donor','store','ticket','purchase_status'])if(trim(q?.[k]))vals.push(q[k]);
  for(const x of arr(q?.reuse)){if(trim(x?.entity))vals.push(`${trim(x.entity)}@${trim(x.from_ref)}`);}
  return vals;
}
function vItvPlanOperations(plan={}){
  const ops=plan?.action==='local'?arr(plan?.local?.operations):plan?.action==='query'?arr(plan?.query?.operations):[];
  return ops.map(op=>{
    const t=trim(op?.type);if(!t)return'';
    if(t==='sort')return`${t}:${trim(op.field)}:${trim(op.direction)}`;
    if(t==='filter')return`${t}:${trim(op.field)}:${trim(op.operator)||'eq'}:${trim(op.value)}`;
    if(t==='rank')return`${t}:${trim(op.group_field)}:${trim(op.metric)}:${trim(op.reference)}`;
    if(t==='compare')return`${t}:${trim(op.group_field)}:${trim(op.metric)}:${arr(op.values).map(trim).filter(Boolean).join(',')}`;
    if(['add_field','remove_field'].includes(t))return`${t}:${trim(op.field)}`;
    if(['set_fields','add_fields','remove_fields'].includes(t))return`${t}:${arr(op.fields).map(trim).filter(Boolean).join(',')}`;
    return t;
  }).filter(Boolean);
}
function validateLedgerStructural(caseDef,result){
  const o=caseDef?.oracle;if(!o||trim(o.kind)!=='ledger-structural')return{status:'OK',reasons:[]};
  const reasons=[],plan=vItvLedgerPlan(result),ds=vItvLedgerDataset(result),view=vItvLedgerView(result),auditExec=result?.meta?.ledgerAudit?.execution||{},action=trim(result?.meta?.ledgerAudit?.action||plan?.action);
  const oneOf=(actual,expected)=>String(expected||'').split('|').map(trim).filter(Boolean).some(x=>norm(actual)===norm(x));
  const expectedAction=trim(o.action||o.expectedAction);if(expectedAction&&!oneOf(action,expectedAction))reasons.push(`acción ledger ${action||'—'} != ${expectedAction}`);
  const expectedDomain=trim(o.domain||o.expectedDomain),planDomain=trim(plan?.query?.domain),actualDomain=trim(auditExec?.domain||ds?.domain||planDomain);if(expectedDomain&&!oneOf(actualDomain,expectedDomain))reasons.push(`dominio EJECUTADO ${actualDomain||'—'} != ${expectedDomain}`);if(expectedDomain&&planDomain&&!oneOf(planDomain,expectedDomain))reasons.push(`dominio PLAN ${planDomain} != ${expectedDomain}`);
  const actualScope=(auditExec?.scope&&Object.keys(auditExec.scope).length?auditExec.scope:(ds?.scope&&Object.keys(ds.scope).length?ds.scope:{}))||{},planScope=plan?.query?.scope||{},scopeKind=trim(actualScope?.kind||planScope?.kind),expectedScope=trim(o.scopeKind||o.expectedScopeKind);if(expectedScope&&norm(scopeKind)!==norm(expectedScope))reasons.push(`scope EJECUTADO ${scopeKind||'—'} != ${expectedScope}`);
  const expectedEvent=trim(o.event||o.expectedEvent);if(expectedEvent){const names=[trim(actualScope?.event),...arr(actualScope?.events).map(trim)].filter(Boolean);if(!names.some(x=>norm(x)===norm(expectedEvent)))reasons.push(`evento EJECUTADO esperado «${expectedEvent}» no materializado (${names.join(' / ')||'—'})`);}
  const expectedRef=trim(o.ref||o.expectedRef);if(expectedRef){const got=trim(plan?.local?.from_ref||plan?.reference?.target_ref||plan?.inspect?.target_ref);if(!oneOf(got,expectedRef))reasons.push(`referencia ${got||'—'} != ${expectedRef}`);}
  const expectedEntity=trim(o.entity||o.expectedEntity);if(expectedEntity){
    const vals=vItvPlanEntityValues(plan);if(!vals.some(x=>norm(x).includes(norm(expectedEntity))))reasons.push(`entidad «${expectedEntity}» no aparece en el plan`);
    const payload=auditExec?.answer_payload||{},focus=auditExec?.focus||{},physical=[payload.subject,payload.person,payload.product,payload.event,focus.person,focus.product,focus.event].map(trim).filter(Boolean);
    if(physical.length&&!physical.some(x=>norm(x).includes(norm(expectedEntity))||norm(expectedEntity).includes(norm(x))))reasons.push(`entidad EJECUTADA ${physical.join(' / ')} no contiene «${expectedEntity}»`);
  }
  const forbidden=arr(o.forbiddenEntities||o.forbiddenEntity).flatMap(x=>String(x||'').split('|')).map(trim).filter(Boolean);if(forbidden.length){const blob=norm(JSON.stringify(plan));for(const x of forbidden)if(blob.includes(norm(x)))reasons.push(`entidad prohibida arrastrada: ${x}`);}
  const actualRows=Number.isFinite(Number(auditExec?.row_count))?Number(auditExec.row_count):Number(ds?.row_count)||0;
  if(o.rows!=null&&actualRows!==Number(o.rows))reasons.push(`filas EJECUTADAS ${actualRows} != ${Number(o.rows)}`);
  if(o.minRows!=null&&actualRows<Number(o.minRows))reasons.push(`filas EJECUTADAS ${actualRows} < ${Number(o.minRows)}`);
  if(o.maxRows!=null&&actualRows>Number(o.maxRows))reasons.push(`filas EJECUTADAS ${actualRows} > ${Number(o.maxRows)}`);
  if(o.rows!=null&&arr(auditExec?.table_row_counts).length){const counts=arr(auditExec.table_row_counts).map(Number).filter(Number.isFinite);if(counts.length&&!counts.includes(Number(o.rows)))reasons.push(`presentación materializada ${counts.join('/')} filas, no ${Number(o.rows)}`);}
  const expectedFields=arr(o.fields||o.expectedFields).flatMap(x=>typeof x==='string'?x.split('|'):x).map(trim).filter(Boolean);if(expectedFields.length){const got=arr(auditExec?.visible_fields).length?arr(auditExec.visible_fields).map(trim):arr(view?.displayed_fields).map(trim);for(const f of expectedFields)if(!got.some(x=>norm(x)===norm(f)))reasons.push(`campo visible esperado «${f}» no aparece`);}
  const absentFields=arr(o.absentFields).flatMap(x=>typeof x==='string'?x.split('|'):x).map(trim).filter(Boolean);if(absentFields.length){const got=arr(view?.displayed_fields).map(trim);for(const f of absentFields)if(got.some(x=>norm(x)===norm(f)))reasons.push(`campo «${f}» debería estar ausente`);}
  const expectedOps=arr(o.operations||o.expectedOperations).flatMap(x=>typeof x==='string'?x.split('|'):x).map(trim).filter(Boolean),gotOps=vItvPlanOperations(plan);for(const e of expectedOps)if(!gotOps.some(g=>norm(g).startsWith(norm(e))))reasons.push(`operación esperada «${e}» no aparece (${gotOps.join(', ')||'sin operaciones'})`);
  const responseKind=trim(o.responseKind||o.expectedResponseKind),answerPayload=auditExec?.answer_payload||{};if(responseKind&&norm(trim(plan?.response_kind))!==norm(responseKind))reasons.push(`response_kind ${trim(plan?.response_kind)||'—'} != ${responseKind}`);
  if(responseKind){
    const answer=trim(result?.answer),pk=trim(answerPayload?.kind);if(!pk)reasons.push(`ANSWER_PAYLOAD ausente para respuesta ${responseKind}`);else if(norm(pk)!==norm(responseKind))reasons.push(`ANSWER_PAYLOAD.kind ${pk} != ${responseKind}`);
    if(expectedEntity&&trim(answerPayload?.subject)&&!norm(answerPayload.subject).includes(norm(expectedEntity))&&!norm(expectedEntity).includes(norm(answerPayload.subject)))reasons.push(`ANSWER_PAYLOAD sujeto ${answerPayload.subject} != ${expectedEntity}`);
    if(responseKind==='amount'){if(answerPayload?.amount_value==null||!Number.isFinite(Number(answerPayload.amount_value)))reasons.push('ANSWER_PAYLOAD amount sin valor numérico factual');if(!/[-+]?\d[\d.]*,\d{2}\s*€/.test(answer))reasons.push('respuesta amount sin importe monetario explícito');}
    if(responseKind==='whether'){if(typeof answerPayload?.value!=='boolean')reasons.push('ANSWER_PAYLOAD whether sin booleano factual');if(!/^(?:Ahora recuerdo[^\n]*\n\n)?\s*(?:Sí|No)\b/i.test(answer))reasons.push('respuesta whether no comienza por Sí/No');}
    if(responseKind==='who'&&!(arr(answerPayload?.people_values).length||trim(answerPayload?.people))&&actualRows>0)reasons.push('ANSWER_PAYLOAD who sin personas materializadas');
    if(responseKind==='what'&&!(arr(answerPayload?.item_values).length||trim(answerPayload?.items))&&actualRows>0)reasons.push('ANSWER_PAYLOAD what sin elementos materializados');
    if(responseKind==='which_event'&&!(arr(answerPayload?.event_values).length||trim(answerPayload?.event))&&actualRows>0)reasons.push('ANSWER_PAYLOAD which_event sin evento materializado');
    if(responseKind==='compare'&&!trim(answerPayload?.winner))reasons.push('ANSWER_PAYLOAD compare sin ganador materializado');
    if(responseKind==='context'&&!trim(answerPayload?.summary))reasons.push('ANSWER_PAYLOAD context sin resumen factual');
    if(responseKind==='conversation_summary'&&!trim(answerPayload?.summary))reasons.push('ANSWER_PAYLOAD conversation_summary sin resumen factual');
    if(responseKind==='context'&&!/Estoy viendo|Contexto actual/i.test(`${trim(result?.title)} ${answer}`))reasons.push('respuesta context no describe el contexto actual');if(responseKind==='conversation_summary'&&!/Resumen de la conversación|En esta conversación/i.test(`${trim(result?.title)} ${answer}`))reasons.push('respuesta conversation_summary no resume la conversación');
  }
  const mustChart=o.chart===true;if(mustChart&&!(Number(auditExec?.chart_count)>0)&&!arr(result?.charts).length)reasons.push('se esperaba gráfica y no se generó');
  const expectedStatus=trim(o.expectedStatus).toUpperCase();if(expectedStatus==='WARN'&&reasons.length===0)return{status:'WARN',reasons:['aviso esperado por contrato de prueba']};
  return{status:reasons.length?'KO':'OK',reasons};
}
function vItvGenericHealth(result={}){
  const blob=`${trim(result?.title)}\n${trim(result?.answer)}`,warnings=arr(result?.warnings).map(trim).filter(Boolean),reasons=[];
  if(result?.ok===false)return{status:'KO',reasons:['result.ok=false']};
  if(/ControlEvent no pudo ejecutar|Gemini no (?:pudo|llegó a) interpretar|No puedo ejecutar todavía|scope\s+\w+\s+requiere|No puedo certificar el evento|fallo técnico real/i.test(blob))reasons.push('respuesta de fallo/no ejecución');
  if(reasons.length)return{status:'KO',reasons};
  if(/Necesito una precisión|No encuentro (?:la conversación|un resultado anterior|el turno)|¿A qué .* te refieres|Which .* do you want|Could you specify/i.test(blob))reasons.push('turno aplazado por aclaración/referencia no resuelta');
  if(/(?:por|total de|valor total de)\s*\./i.test(blob))reasons.push('importe/total vacío en respuesta canónica');
  if(warnings.length)reasons.push(`warnings CE: ${warnings.join(' | ')}`);
  return{status:reasons.length?'WARN':'OK',reasons};
}
function vItvPerformanceHealth(result={}){
  const p=result?.meta?.performance||{},u=result?.meta?.geminiUsageEstimate||{},ms=num(p?.totalMs),calls=num(u?.calls),tokens=num(u?.totalTokens||u?.totalTokenCount),reasons=[];
  let status='OK';
  if(ms>18000){status='KO';reasons.push(`latencia ${Math.round(ms)} ms > 18 s`);}else if(ms>12000){status='WARN';reasons.push(`latencia ${Math.round(ms)} ms > 12 s`);}
  if(calls>2&&status!=='KO'){status='WARN';reasons.push(`${calls} llamadas IA en un turno`);}
  if(tokens>18000&&status!=='KO'){status='WARN';reasons.push(`${Math.round(tokens)} tokens en un turno`);}
  return{status,reasons};
}
function vNextDomainFromAudit(a={}){
  const op=norm(a?.operation);
  if(op.includes('purchase'))return'purchases';if(op.includes('attendance'))return'attendance';if(op.includes('donation'))return'donations';if(op.includes('income'))return'incomes';
  if(op.includes('document'))return'documents';if(op.includes('bank'))return'bank';if(op.includes('management'))return'management';if(op.includes('compare'))return'comparison';
  if(op.includes('person')||op.includes('participation'))return'person';if(op.includes('catalog')||op.includes('overview'))return'catalog';return'';
}
function vNextTableHasColumn(a={},field=''){const f=norm(field);return arr(a?.renderedColumns).some(x=>norm(x)===f)||arr(a?.visibleColumns).some(x=>norm(x)===f);}
function validateVNextStructural(caseDef,result){
  const o=caseDef?.oracle;if(!o||trim(o.kind)!=='ledger-structural')return{status:'OK',reasons:[]};
  const a=vNextAuditOf(result),reasons=[],uncertified=[];
  const expectedDomain=trim(o.domain||o.expectedDomain),actualDomain=vNextDomainFromAudit(a);
  if(expectedDomain&&actualDomain&&norm(actualDomain)!==norm(expectedDomain))reasons.push(`dominio VNext ${actualDomain} != ${expectedDomain}`);
  if(expectedDomain&&!actualDomain&&a.kind==='data')uncertified.push(`dominio esperado ${expectedDomain} no queda tipado en resultContext`);
  const expectedEvent=trim(o.event||o.expectedEvent||caseDef?.event);if(expectedEvent){const names=[a.event,...a.events].filter(Boolean);if(!names.some(x=>norm(x)===norm(expectedEvent))&&!resultHasEvent(result,expectedEvent))reasons.push(`evento VNext esperado «${expectedEvent}» no materializado`);}
  const expectedEntity=trim(o.entity||o.expectedEntity||caseDef?.person);if(expectedEntity){const names=[a.person].filter(Boolean);if(!names.some(x=>norm(x).includes(norm(expectedEntity))||norm(expectedEntity).includes(norm(x)))&&!resultHasPerson(result,expectedEntity))reasons.push(`entidad VNext esperada «${expectedEntity}» no materializada`);}
  const expectedFields=arr(o.fields||o.expectedFields).flatMap(x=>typeof x==='string'?x.split('|'):x).map(trim).filter(Boolean);for(const f of expectedFields)if(!vNextTableHasColumn(a,f))reasons.push(`campo visible esperado «${f}» no aparece en VNext`);
  const absentFields=arr(o.absentFields).flatMap(x=>typeof x==='string'?x.split('|'):x).map(trim).filter(Boolean);for(const f of absentFields){const explicitlyHidden=arr(a.hiddenColumns).some(x=>norm(x)===norm(f));if(vNextTableHasColumn(a,f)&&!explicitlyHidden)reasons.push(`campo «${f}» debería estar oculto en VNext`);}
  const ops=arr(o.operations||o.expectedOperations).flatMap(x=>typeof x==='string'?x.split('|'):x).map(trim).filter(Boolean);
  for(const op of ops){const parts=op.split(':').map(trim),kind=norm(parts[0]),field=parts[1]||'';
    if(kind==='remove field'){if(!arr(a.hiddenColumns).some(x=>norm(x)===norm(field))&&vNextTableHasColumn(a,field))reasons.push(`VNext no ocultó el campo «${field}»`);}
    else if(kind==='add field'){if(!vNextTableHasColumn(a,field))reasons.push(`VNext no restauró el campo «${field}»`);}
    else if(kind==='sort'&&field){const requested=norm(`${field} ${parts[2]||''}`),dir=norm(parts[2]||''),fn=norm(field),ctxSort=arr(a?.resultContext?.table_view_sort||a?.resultContext?.view_sort);const structured=ctxSort.some(x=>norm(x?.field)===fn&&(!dir||norm(x?.direction)===dir)),flat=norm(a.orderBy),fieldAliases=fn==='importe'?['importe','amount']:fn==='producto'?['producto','product']:fn==='tienda'?['tienda','store']:[fn],flatField=fieldAliases.some(x=>flat.includes(x)),flatDir=!dir||flat.includes(dir);if(!structured&&!(flatField&&flatDir))uncertified.push(`orden ${requested} no queda acreditado en resultContext`);}
    else if(['filter','rank','compare','set fields','add fields','remove fields'].includes(kind))uncertified.push(`operación ${op} no dispone todavía de evidencia estructural suficiente en VNext`);
  }
  if(o.chart===true&&a.chartCount<1)reasons.push('se esperaba gráfica y VNext no generó ninguna');
  if(expectedDomain==='purchases'&&!ops.length&&a.tableCount<1&&!resultUsedTool(result,'query_ce'))reasons.push('consulta de compras sin tabla ni contrato materializado');
  if(reasons.length)return{status:'KO',reasons};
  if(uncertified.length)return{status:'WARN',reasons:uncertified.map(x=>`ITV VNext: ${x}`)};
  return{status:'OK',reasons:[]};
}
function validatePaidCase(caseDef,result){
  const base=caseDef?.validate?!!caseDef.validate(result):true,oracle=validateOracle(caseDef,result),capability=validateExpectedCapability(caseDef,result),structural=trim(caseDef?.engine).toUpperCase()==='VNEXT'?validateVNextStructural(caseDef,result):validateLedgerStructural(caseDef,result),health=vItvGenericHealth(result),perf=vItvPerformanceHealth(result);
  const functionalReasons=[...(base?[]:['invariante de selección/contexto no satisfecha']),...oracle.reasons,...capability.reasons,...structural.reasons,...health.reasons];
  let functionalStatus='OK';if(!base||!oracle.ok||capability.status==='KO'||structural.status==='KO'||health.status==='KO')functionalStatus='KO';else if(structural.status==='WARN'||health.status==='WARN')functionalStatus='WARN';
  return{ok:functionalStatus==='OK',status:functionalStatus,reasons:functionalReasons,functionalStatus,functionalReasons,performanceStatus:perf.status,performanceReasons:perf.reasons,allReasons:[...functionalReasons,...perf.reasons]};
}

async function buildRealFastCases(state,seed){
  const events=arr(state?.eventos).filter(e=>trim(e?.id)&&eventName(e));
  const people=arr(state?.personas).filter(p=>trim(p?.id)&&personName(p) && !/^z[_ -]?dev/i.test(personName(p)));
  const purchasesByEvent=new Map();
  for(const r of arr(state?.compras)){ const eid=eventIdOf(r); if(eid) purchasesByEvent.set(eid,(purchasesByEvent.get(eid)||0)+1); }
  const cases=[];

  for(const entity of ['events','people','products','stores']){
    const o=catalogOracle(state,entity);
    cases.push(makeCase({id:`catalog-${entity}`,group:'TABLAS GENERALES',label:`Catálogo general · ${entity}`,expected:`${o.count} registros`,run:async function(){
      const r=await execCanonicalTool(state,{id:`fast_catalog_${entity}`,name:'master_catalog',entity,detail:'full'},state,'');
      const rows=arr(r?.tables).flatMap(t=>arr(t?.rows));
      return outcome(this,r?.ok!==false&&rows.length===o.count?'OK':'KO',`${entity}: ${rows.length} registros; esperado=${o.count}`);
    }}));
  }
  cases.push(makeCase({id:'global-events-overview',group:'TABLAS GENERALES',label:'Panorama económico de todos los eventos',expected:`${events.length} eventos`,run:async function(){
    const o=await eventsOverviewOracle(state);return outcome(this,o&&o.count===events.length?'OK':'KO',`eventos=${o?.count??'—'}; esperado=${events.length}`);
  }}));
  cases.push(makeCase({id:'global-people-activity',group:'TABLAS GENERALES',label:'Identidades personales canónicas globales',expected:'Identidades personales canónicas globales disponibles',run:async function(){
    const o=await peopleActivityOracle(state);return outcome(this,o&&o.count>=0?'OK':'KO',`identidades personales canónicas globales=${o?.count??'—'}; filas=${o?.rows?.length??0}`);
  }}));
  cases.push(makeCase({id:'global-canonical-socios',group:'TABLAS GENERALES',label:'Censo de socios canónicos',expected:'Censo canónico disponible',run:async function(){
    const o=await canonicalSociosOracle(state);return outcome(this,o&&o.records>=0&&o.people>=0?'OK':'KO',`registros=${o?.records??'—'}; personas=${o?.people??'—'}`);
  }}));

  // Z1H · Escaneo integral sin IA. No crea miles de tarjetas en la ITV: una sola prueba recorre
  // físicamente todas las filas operativas cargadas y comprueba enlaces esenciales + semántica
  // Supuesta/Comprometida/Entregada. Sirve para poder decir «todos los registros» de verdad sin
  // convertir FULL-CERT en cientos de llamadas pagadas.
  cases.push(makeCase({id:'all-records-integrity-scan',group:'TODOS LOS REGISTROS',label:'Escaneo integral de filas reales CE',expected:'Todas las filas operativas recorridas sin huérfanos básicos ni estados de donación inválidos',run:async function(){
    const eventIds=new Set(events.map(e=>trim(e?.id)).filter(Boolean)),productIds=new Set(arr(state?.productos).map(x=>trim(x?.id)).filter(Boolean));
    const collections={eventos:arr(state?.eventos),personas:arr(state?.personas),tiendas:arr(state?.tiendas),productos:arr(state?.productos),compras:arr(state?.compras),ingresos:arr(state?.colaboradores),documentos:arr(state?.eventDocuments),hitos:arr(state?.hitos),lg:arr(state?.lgs),banco:arr(state?.bankMovements||state?.movimientosBanco||state?.movimientos_banco),fototickets:Object.values(state?.ticketImages||{})};
    let scanned=0;for(const rows of Object.values(collections))scanned+=rows.length;
    const issues=[];
    for(const r of collections.compras){
      const eid=eventIdOf(r),pid=trim(r?.productoId||r?.producto_id),tt=ticketTextLocal(r),isDon=isDonationTicketLocal(tt),ds=trim(r?.donacionSituacion||r?.donacion_situacion);
      if(eid&&!eventIds.has(eid))issues.push(`compra ${trim(r?.id)||'?'}: evento huérfano ${eid}`);
      if(pid&&!productIds.has(pid))issues.push(`compra ${trim(r?.id)||'?'}: producto huérfano ${pid}`);
      if(isDon&&ds&&!['Supuesta','Comprometida','Entregada'].includes(ds))issues.push(`donación ${trim(r?.id)||'?'}: situación inválida ${ds}`);
      if(!isDon&&ds)issues.push(`compra ${trim(r?.id)||'?'}: situación de donación impropia ${ds}`);
      if(issues.length>=12)break;
    }
    for(const [name,rows] of [['ingreso',collections.ingresos],['documento',collections.documentos],['hito',collections.hitos],['LG',collections.lg]])for(const r of rows){const eid=eventIdOf(r);if(eid&&!eventIds.has(eid)){issues.push(`${name} ${trim(r?.id)||'?'}: evento huérfano ${eid}`);if(issues.length>=12)break;}}
    const detail=`filas recorridas=${scanned} · eventos=${collections.eventos.length} · personas=${collections.personas.length} · tiendas=${collections.tiendas.length} · productos=${collections.productos.length} · compras/donaciones=${collections.compras.length} · ingresos=${collections.ingresos.length} · documentos=${collections.documentos.length} · hitos=${collections.hitos.length} · LG=${collections.lg.length} · banco=${collections.banco.length} · fototickets=${collections.fototickets.length}`;
    return outcome(this,issues.length?'KO':'OK',issues.length?`${detail} · incidencias: ${issues.join(' | ')}`:`${detail} · integridad básica OK`);
  }}));

  for(const store of shuffled(arr(state?.tiendas).filter(s=>trim(s?.id)&&trim(s?.nombre)),seed,'fast-stores')){
    const name=trim(store?.nombre);cases.push(makeCase({id:`store-purchases-${key(store?.id||name)}`,group:'TIENDAS',label:`Compras históricas de tienda · ${name}`,expected:'Consulta de tienda coherente',run:async function(){
      const o=await storePurchasesOracle(state,name);return outcome(this,o?'OK':'KO',o?`${o.store}: ${o.records} registros · ${euro(o.total)} · ${o.eventCount} eventos`:'No resuelta');
    }}));
  }

  for(const p of shuffled(people,seed,'fast-participation-people')){
    const name=personName(p);cases.push(makeCase({id:`participation-events-${key(p?.id||name)}`,group:'PERSONAS',label:`Eventos de participación · ${name}`,expected:'Participación personal coherente',run:async function(){
      const o=await participationOracle(state,name);return outcome(this,o?'OK':'KO',o?`${o.person}: ${o.eventCount} eventos`:'No resuelta');
    }}));
  }

  for(const ev of events){
    const title=eventName(ev), eid=trim(ev.id);
    cases.push(makeCase({id:`event-resolve-${key(eid)}`,group:'EVENTOS',label:`Resolver evento exacto · ${title}`,expected:title,run:async function(){
      const r=Z.semanticResolveEntity(state,'event',title); return outcome(this,r?.ok&&trim(r.id)===eid?'OK':'KO',r?.ok?`${r.nombre} [${r.id}]`:r?.error||'No resuelto');
    }}));
    cases.push(makeCase({id:`event-dossier-${key(eid)}`,group:'EVENTOS',label:`Dossier canónico · ${title}`,expected:`event=${title}`,run:async function(){
      const r=await execCanonicalTool(state,{id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid);
      const ok=r?.ok!==false && norm(r?.facts?.event)===norm(title);
      return outcome(this,ok?'OK':'KO',`${r?.facts?.event||'sin evento'} · ingresos=${r?.facts?.income_total??'—'} · compras=${r?.facts?.purchases_realized??'—'}`);
    }}));
    cases.push(makeCase({id:`event-people-${key(eid)}`,group:'PERSONAS',label:`Asistencia/dossier coherentes · ${title}`,expected:'Mismo evento y asistencia no negativa',run:async function(){
      const [d,p]=await Promise.all([
        execCanonicalTool(state,{id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid),
        execCanonicalTool(state,{id:'fast_p',name:'event_people',event:title,scope:'named_event',detail:'brief'},state,eid)
      ]);
      const same=norm(d?.facts?.event)===norm(p?.facts?.event), dv=num(d?.facts?.attendees_canonical), pv=num(p?.facts?.attendees_canonical);
      return outcome(this,same&&dv>=0&&pv>=0&&Math.abs(dv-pv)<0.001?'OK':'KO',`dossier=${dv}; people=${pv}; evento=${p?.facts?.event||'—'}`);
    }}));
    cases.push(makeCase({id:`event-docs-${key(eid)}`,group:'DOCUMENTOS',label:`Documentos / TKxx / justificantes · ${title}`,expected:'Recuentos documentales coherentes',run:async function(){
      const r=await execCanonicalTool(state,{id:'fast_doc',name:'event_documentation',event:title,scope:'named_event',detail:'full'},state,eid),f=r?.facts||{};
      const ok=r?.ok!==false&&num(f.income_with_receipt)<=num(f.income_records)&&num(f.purchase_tickets_with_image)<=num(f.purchase_tickets)&&num(f.documents_with_attachment)<=num(f.documents)&&num(f.missing_evidence_count)>=0;
      return outcome(this,ok?'OK':'KO',`ingresos=${f.income_records||0}; justificantes=${f.income_with_receipt||0}; TKxx=${f.purchase_tickets||0}; fototickets=${f.purchase_tickets_with_image||0}; DOC=${f.documents||0}; adjuntos=${f.documents_with_attachment||0}; faltan=${f.missing_evidence_count||0}`);
    }}));
    cases.push(makeCase({id:`event-management-${key(eid)}`,group:'HITOS/LG',label:`Gestión · ${title}`,expected:'Hitos/LG coherentes',run:async function(){
      const r=await execCanonicalTool(state,{id:'fast_mgmt',name:'event_management',event:title,scope:'named_event',detail:'brief'},state,eid),f=r?.facts||{};
      const vals=Object.values(f).filter(v=>typeof v==='number');const ok=r?.ok!==false&&vals.every(v=>Number.isFinite(v)&&v>=0);
      return outcome(this,ok?'OK':'KO',`evento=${f.event||title}; hitos=${f.hitos_count??f.hitos??'—'}; LG=${f.lg_count??f.lgs??'—'}`);
    }}));
    if(donationCountForEvent(state,eid)>0) cases.push(makeCase({id:`event-donations-${key(eid)}`,group:'DONACIONES',label:`Donaciones · ${title}`,expected:'Donaciones del evento coherentes',run:async function(){
      const r=await execCanonicalTool(state,{id:'fast_don',name:'event_donation_lines',event:title,scope:'named_event',detail:'full'},state,eid),f=r?.facts||{};
      const ok=r?.ok!==false&&num(f.donation_line_count||f.records||0)>=0&&num(f.total_value||f.donations_value||0)>=0;
      return outcome(this,ok?'OK':'KO',`evento=${f.event||title}; registros=${f.donation_line_count??f.records??'—'}; valor=${f.total_value??f.donations_value??'—'}`);
    }}));

    if(purchasesByEvent.get(eid)) cases.push(makeCase({id:`event-purchases-${key(eid)}`,group:'COMPRAS',label:`Compras coherentes · ${title}`,expected:'Dossier = desglose; MAX/MIN/SUM consistentes',run:async function(){
      const [d,b]=await Promise.all([
        execCanonicalTool(state,{id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid),
        execCanonicalTool(state,{id:'fast_b',name:'event_breakdowns',event:title,scope:'named_event',detail:'full'},state,eid)
      ]);
      const rows=arr(toolTable(b,'products_cost')?.rows), sum=round(rows.reduce((a,r)=>a+num(r.Importe),0),2), max=rows.slice().sort((a,b)=>num(b.Importe)-num(a.Importe))[0], min=rows.filter(r=>Number.isFinite(Number(r.Importe))).slice().sort((a,b)=>num(a.Importe)-num(b.Importe))[0];
      const base=round(d?.facts?.purchases_realized,2), breakdown=round(b?.facts?.purchases_realized,2);
      const sumCheck=rows.length<20 ? moneyEq(sum,breakdown) : sum<=breakdown+0.011; // tabla puede estar limitada a top20
      const ok=moneyEq(base,breakdown)&&sumCheck&&(!max||num(max.Importe)>=num(min?.Importe));
      return outcome(this,ok?'OK':'KO',`dossier=${base}; desglose=${breakdown}; productos=${rows.length}; suma_tabla=${sum}; max=${max?.Producto||'—'} ${max?.Importe??'—'}; min=${min?.Producto||'—'} ${min?.Importe??'—'}`);
    }}));
  }

  // Banco: FAST comprueba primero si el evento tiene un Cuadre Banco EXPLÍCITO.
  // Un histórico de cuenta dentro de las fechas del evento no se convierte nunca en cuadre.
  const fastBankEvents=shuffled(events,seed,'fast-bank-events').slice(0,Math.min(6,events.length));
  for(const ev of fastBankEvents){
    const title=eventName(ev),eid=trim(ev.id);
    cases.push(makeCase({id:`event-bank-${key(eid)}`,group:'BANCO',label:`Cuadre Banco · ${title}`,expected:'Estado de Cuadre Banco según ciclo de vida + filas almacenadas',run:async function(){
      try{
        const b=await bankOracle(state,title);
        if(!b)return outcome(this,'WARN','Sin fuente bancaria utilizable para este evento.');
        return outcome(this,'OK',`${b.reconciliationStatus} · filas=${b.rowCount} · ${b.lifecycleMessage||'sin mensaje'}${b.hasReconciliation?` · movimientos incluidos=${b.movements} · candidatos históricos ignorados=${b.periodCandidates}`:''}`);
      }catch(error){return outcome(this,'WARN',`Sin fuente bancaria utilizable para este evento: ${trim(error?.message)||'sin datos'}`);}
    }}));
  }
  for(const ev of fastBankEvents.slice(0,Math.min(2,fastBankEvents.length))){
    const title=eventName(ev);cases.push(makeCase({id:`event-bank-timeline-${key(ev.id)}`,group:'BANCO',label:`Cronología bancaria · ${title}`,expected:'Cronología solo si hay Cuadre Banco explícito',run:async function(){
      const o=await bankTimelineOracle(state,title);
      if(!o)return outcome(this,'WARN','Sin fuente bancaria utilizable');
      if(o.hasReconciliation===false)return outcome(this,'OK','Sin Cuadre Banco explícito: no se construye cronología desde el histórico general.');
      return outcome(this,'OK',`puntos=${o.points}; apertura=${euro(o.opening)}; cierre=${euro(o.closing)}; impacto=${euro(o.impact)}`);
    }}));
  }

  // Matriz estricta de ciclo de vida: si existe en los datos, FAST exige cada uno de los
  // seis estados definidos por negocio (estado del evento + filas + cobertura de TKxx/ingresos).
  // Así la ITV no da por completo un cuadre que tenga una sola asociación pendiente.
  const lifecycleSamples=new Map();
  const lifecycleChecks=await Promise.all(events.map(async ev=>({ev,b:await bankOracle(state,eventName(ev))})));
  for(const sample of lifecycleChecks){
    const {ev,b}=sample;if(!b)continue;
    if(!lifecycleSamples.has(b.reconciliationStatus))lifecycleSamples.set(b.reconciliationStatus,{ev,b});
    if(lifecycleSamples.size>=6)break;
  }
  for(const [status,sample] of lifecycleSamples){
    const title=eventName(sample.ev),b=sample.b;
    cases.push(makeCase({id:`bank-lifecycle-${key(status)}`,group:'BANCO',label:`Estado definitivo Cuadre · ${title}`,expected:b.lifecycleMessage||status,run:async function(){
      const fresh=await bankOracle(state,title);
      const completedStatus=['FINALIZADO_CUADRE_REALIZADO','EN_CURSO_CUADRE_COMPLETO'].includes(status);
      const ok=!!fresh&&fresh.reconciliationStatus===status&&trim(fresh.lifecycleMessage)===trim(b.lifecycleMessage)&&((fresh.rowCount>0)===fresh.hasReconciliation)
        &&(fresh.complete===completedStatus)
        &&(!fresh.hasReconciliation||((fresh.ticketSummary?.allJustified===true&&fresh.incomeSummary?.allReconciled===true)===completedStatus));
      return outcome(this,ok?'OK':'KO',`${fresh?.reconciliationStatus||'—'} · filas=${fresh?.rowCount??'—'} · TKxx=${fresh?.ticketSummary?.linked??0}/${fresh?.ticketSummary?.total??0} · ingresos=${fresh?.incomeSummary?.reconciled??0}/${fresh?.incomeSummary?.total??0} · ${fresh?.lifecycleMessage||'sin mensaje'}`);
    }}));
  }

  // Familias reales con año distinto: prueba la pareja completa y que nunca colapse A/B.
  const families=new Map();
  for(const e of events){ const stem=familyStem(eventName(e)), y=yearOf(eventName(e)); if(!stem||!y) continue; if(!families.has(stem))families.set(stem,[]); families.get(stem).push(e); }
  let pairNo=0;
  for(const list of families.values()){
    const sorted=list.slice().sort((a,b)=>yearOf(eventName(a)).localeCompare(yearOf(eventName(b))));
    for(let i=1;i<sorted.length;i++){
      const a=sorted[i-1], b=sorted[i], an=eventName(a), bn=eventName(b); pairNo++;
      cases.push(makeCase({id:`compare-family-${pairNo}-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:`Comparación misma familia · ${an} / ${bn}`,expected:'Dos eventos distintos conservados',run:async function(){
        const r=await execCanonicalTool(state,{id:'fast_cmp',name:'compare_events',events:[an,bn],scope:'named_event'},state,'');
        const names=arr(r?.facts?.event_names), ok=names.length===2 && new Set(names.map(norm)).size===2 && names.some(x=>norm(x)===norm(an)) && names.some(x=>norm(x)===norm(bn));
        return outcome(this,ok?'OK':'KO',names.join(' ↔ ')||'sin comparación');
      }}));
    }
  }

  // Pares heterogéneos reales. La semilla cambia qué filas del catálogo se cruzan en cada batería,
  // pero la misma semilla reproduce exactamente la selección.
  const mixedEvents=shuffled(events,seed,'fast-mixed-events');
  const pairLimit=Math.min(36,Math.max(0,mixedEvents.length*2));
  for(let i=0;i<pairLimit && mixedEvents.length>1;i++){
    const a=mixedEvents[i%mixedEvents.length], b=mixedEvents[(i*7+3+pickIndex(mixedEvents.length,seed,`fast-pair-${i}`))%mixedEvents.length]; if(a.id===b.id) continue;
    const an=eventName(a),bn=eventName(b);
    cases.push(makeCase({id:`compare-mixed-${i}-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:`Comparación cruzada · ${an} / ${bn}`,expected:'A y B distintos',run:async function(){
      const r=await execCanonicalTool(state,{id:'fast_cmp',name:'compare_events',events:[an,bn],scope:'named_event'},state,'');
      const names=arr(r?.facts?.event_names); const ok=names.length===2&&new Set(names.map(norm)).size===2;
      return outcome(this,ok?'OK':'KO',names.join(' ↔ ')||'sin comparación');
    }}));
  }

  for(const p of people){
    const name=personName(p),pid=trim(p.id);
    cases.push(makeCase({id:`person-resolve-${key(pid)}`,group:'PERSONAS',label:`Resolver persona · ${name}`,expected:name,run:async function(){
      const r=Z.semanticResolveEntity(state,'person',name); const ok=r?.ok && (trim(r.id)===pid || norm(r.nombre)===norm(name));
      return outcome(this,ok?'OK':'KO',r?.ok?`${r.nombre} [${r.id}]`:r?.error||'No resuelta');
    }}));
    cases.push(makeCase({id:`person-activity-${key(pid)}`,group:'PERSONAS',label:`Actividad directa · ${name}`,expected:'Filas directas de la persona recorridas sin bloqueo',run:async function(){
      const ingresos=arr(state?.colaboradores).filter(x=>trim(x?.personaId||x?.persona_id)===pid).length;
      const compras=arr(state?.compras).filter(x=>trim(x?.responsableId||x?.responsable_id)===pid&&!isDonationTicketLocal(ticketTextLocal(x))).length;
      const donorKey=`P:${pid}`.toUpperCase();const donaciones=arr(state?.compras).filter(x=>trim(x?.donorRef||x?.donor_ref).toUpperCase()===donorKey).length;
      const hitos=arr(state?.hitos).filter(x=>trim(x?.responsableId||x?.responsable_id)===pid).length,lgs=arr(state?.lgs).filter(x=>trim(x?.responsableId||x?.responsable_id)===pid).length;
      return outcome(this,'OK',`persona=${name}; ingresos=${ingresos}; compras=${compras}; donaciones=${donaciones}; hitos=${hitos}; LG=${lgs}`);
    }}));
  }

  cases.push(makeCase({id:'event-nonexistent-real-catalog',group:'SEGURIDAD',label:'Evento inexistente no se inventa',expected:'No resuelto',run:async function(){
    const fake=`Evento ${variant(['Lunar','Boreal','Imposible','Fantasma','Orbital'],seed,'fast-fake-word')} Inexistente ${2090+(normalizeSeed(seed)%9)} ${String(normalizeSeed(seed)%997).padStart(3,'0')}`;
    const r=Z.semanticResolveEntity(state,'event',fake); return outcome(this,!r?.ok?'OK':'KO',r?.ok?`Resuelto indebidamente a ${r.nombre}`:'No resuelto');
  }}));
  return cases;
}

function chooseEvents(state,seed){
  const events=arr(state?.eventos).filter(e=>trim(e?.id)&&eventName(e));
  const purchaseCounts=new Map(),pendingPurchaseCounts=new Map();
  for(const r of arr(state?.compras)){
    const id=eventIdOf(r);if(!id)continue;const tt=ticketTextLocal(r);
    if(!isDonationTicketLocal(tt))purchaseCounts.set(id,(purchaseCounts.get(id)||0)+1);
    if(!isDonationTicketLocal(tt)&&isPendingTicketLocal(tt))pendingPurchaseCounts.set(id,(pendingPurchaseCounts.get(id)||0)+1);
  }
  const withPurchases=events.filter(e=>purchaseCounts.get(trim(e.id))>0);
  const withPendingPurchases=events.filter(e=>pendingPurchaseCounts.get(trim(e.id))>0);
  const families=new Map(); for(const e of events){const stem=familyStem(eventName(e)),y=yearOf(eventName(e));if(stem&&y){if(!families.has(stem))families.set(stem,[]);families.get(stem).push(e);}}
  const familyLists=[...families.values()].filter(v=>v.length>=2);
  let sibling=[];
  if(familyLists.length){
    const list=pick(familyLists,seed,'family-choice')||familyLists[0];
    const sorted=list.slice().sort((a,b)=>yearOf(eventName(a)).localeCompare(yearOf(eventName(b))));
    const pos=Math.min(sorted.length-2,pickIndex(Math.max(1,sorted.length-1),seed,'family-pair'));
    sibling=sorted.slice(pos,pos+2);
  }
  return {events:shuffled(events,seed,'events'),withPurchases:shuffled(withPurchases,seed,'purchases-events'),withPendingPurchases:shuffled(withPendingPurchases,seed,'pending-purchases-events'),sibling};
}
function choosePeople(state,seed){
  const people=arr(state?.personas).filter(p=>trim(p?.id)&&personName(p)&&!/^z[_ -]?dev/i.test(personName(p)));
  return {people:shuffled(people,seed,'people'),sample:shuffled(people,seed,'people-sample').slice(0,Math.min(10,people.length))};
}

const TPL={
  event:[
    'Háblame de {event}.','Cuéntame lo esencial de {event}.','¿Qué me puedes decir de {event}?','Repásame {event}.',
    'Quiero una radiografía rápida de {event}.','Ponte con {event}: dime lo más importante.','Dame los datos clave de {event}.',
    'Vamos con {event}; ¿cómo quedó?','Sitúame en {event}.','Hazme un resumen útil de {event}.'
  ],
  purchases:[
    '¿Qué compras hubo en {event}?','¿Qué se compró para {event}?','Sácame las compras de {event}.','¿En qué se gastó el dinero en {event}?',
    'Quiero ver los gastos de compra de {event}.','¿Qué compramos en {event}?','Repasa las compras de {event}.','Dime en qué se fue el dinero de compras en {event}.',
    'Solo compras de {event}, ¿qué hubo?','¿Qué material o productos se compraron en {event}?'
  ],
  compare:[
    'Compara {a} con {b}.','Pon frente a frente {a} y {b}.','Quiero comparar {a} frente a {b}.','¿Qué diferencias ves entre {a} y {b}?',
    'Hazme una comparativa de {a} y {b}.','Entre {a} y {b}, ¿cómo quedaron?','Contrasta {a} con {b}.','Mírame {a} y {b} uno al lado del otro.'
  ],
  person:[
    'Háblame de {person}.','¿Qué sabes de {person} en ControlEvent?','Hazme un resumen de {person}.','Repasa la actividad de {person}.',
    'Quiero ver qué ha hecho {person}.','Dime la actividad registrada de {person}.','Ponte con {person}.','¿Qué relación tiene {person} con nuestros eventos?'
  ],
  consumption:[
    '¿Quién consumió más comida en {event}?','¿Quién fue el que más comió en {event}?','¿Quién bebió más en {event}?','Dime quién consumió más producto en {event}.',
    '¿Quién se tomó más bebida en {event}?','¿Quién gastó más producto personalmente en {event}?'
  ],
  nonexistent:[
    'Háblame del evento {fake}.','Dime qué pasó en {fake}.','Quiero información de {fake}.','¿Cómo quedó el evento {fake}?','Repásame {fake}.'
  ],
  economyFollow:['¿Cómo quedó económicamente?','¿Qué tal salió de números?','¿Cómo terminó en lo económico?','¿Qué balance dejó?','¿Cómo quedaron las cuentas?'],
  highlightFollow:['¿Qué datos importantes destacarías?','¿Qué te parece lo más relevante?','Dime solo lo que más destaca.','¿Con qué me debería quedar?'],
  switchEvent:['Ahora cambia a {event}.','Deja ese y vete a {event}.','Vale, ahora {event}.','Cambiemos de asunto: {event}.','Vuelve la vista a {event}.'],
  listProducts:['¿Qué productos se compraron en {event}?','Sácame los productos comprados en {event}.','¿Qué cosas se compraron para {event}?','Dame el detalle de productos de {event}.'],
  maxFollow:['¿Cuál fue el más caro?','¿Qué producto tuvo el mayor importe?','¿Cuál se llevó más dinero?','Dime el de mayor coste.'],
  minFollow:['¿Y el de menor importe?','¿Cuál fue el más barato?','¿Qué producto costó menos?','Ahora dime el de menor coste.'],
  sumFollow:['¿Cuánto suman todos?','¿Y todo eso cuánto fue?','Dame el total de esos productos.','¿Cuánto sale la suma completa?'],
  eventsPersonFollow:['¿En qué eventos aparece?','¿Dónde aparece registrado?','¿En qué eventos tiene actividad?','¿Por qué eventos se mueve?'],
  incomePersonFollow:['¿Qué ingresos tiene vinculados?','¿Y de ingresos qué tiene?','Dime sus ingresos asociados.','¿Cuánto ingreso tiene vinculado?'],
  switchPerson:['Ahora háblame de {person}.','Cambia a {person}.','Vale, ahora {person}.','Deja al anterior y mira a {person}.'],
  compareIncomeFollow:['¿Cuál tuvo más ingresos?','Entre los dos, ¿quién ingresó más?','¿Y de ingresos cuál quedó por encima?'],
  comparePurchasesFollow:['¿Y cuál tuvo más compras?','¿Cuál gastó más en compras?','Entre esos dos, ¿dónde hubo más compras?'],
  relationFollow:['¿Tuvo alguna relación con ese evento?','¿Aparece relacionado con ese evento?','¿Tuvo algo que ver con ese evento?','¿Figura en ese evento de alguna manera?'],
  relativeNext:['¿Y el del año siguiente?','Ahora el del año posterior.','¿Qué pasa con el del siguiente año?','Vete al de {year}.'],
  catalog:[
    'Dame la lista general de {entity}.','¿Cuántos {entity} hay registrados?','Enséñame el catálogo de {entity}.','Quiero consultar el catálogo de {entity}.',
    'Repasa la tabla general de {entity}.','¿Qué contiene el maestro de {entity}?'
  ],
  documentation:[
    'Revisa la documentación de {event}.','¿Cómo está de justificantes y documentos {event}?','Comprueba las evidencias documentales de {event}.',
    'Dime si faltan justificantes, fototickets o documentos en {event}.','Hazme una radiografía documental de {event}.','¿Qué documentación consta en {event}?'
  ],
  receipts:[
    '¿Cuántos ingresos tienen justificante en {event}?','Dime los justificantes de ingresos de {event}.','¿Qué cobertura de justificantes de ingreso tiene {event}?',
    'En {event}, ¿cuántos registros de ingreso llevan justificante?'
  ],
  tickets:[
    '¿Cuántos TKxx tienen fototicket en {event}?','Repasa los tickets de compra y sus imágenes en {event}.','¿Qué TKxx están documentados en {event}?',
    'Dime la situación de los fototickets de {event}.'
  ],
  ticketDetail:[
    'Háblame del {ticket} de {event}.','Dame el detalle del {ticket} en {event}.','Busca el {ticket} de {event}.','¿Qué consta sobre el {ticket} de {event}?'
  ],
  attendance:[
    '¿Cuánta gente asistió a {event}?','Dime la asistencia de {event}.','¿Cuántas personas constan como asistentes en {event}?','Repasa la asistencia de {event}.'
  ],
  incomes:[
    '¿Cuánto ingresó {event}?','Dime los ingresos de {event}.','¿Qué ingresos constan en {event}?','Repasa las aportaciones económicas de {event}.'
  ],
  pendingPurchases:[
    '¿Cuánto queda pendiente de compra en {event}?','Dime el Pte.Compra de {event}.','¿Qué importe de compras pendientes tiene {event}?','¿Queda gasto pendiente por comprar en {event}?'
  ],
  donations:[
    '¿Qué donaciones hubo en {event}?','Repasa las donaciones de {event}.','¿Cuánto producto donado recibió {event}?','Dime donantes y valor de las donaciones de {event}.'
  ],
  management:[
    '¿Cómo van los hitos y tareas LG de {event}?','Repasa la gestión de {event}.','Dime los hitos y LG de {event}.','¿Qué tareas de gestión constan en {event}?'
  ],
  bank:[
    'Dame el Cuadre Banco de {event}.','¿Cómo quedó el banco en {event}?','Repasa los movimientos bancarios de {event}.','¿Qué impacto bancario tuvo {event}?',
    'Dime movimientos, ingresos y cargos bancarios de {event}.'
  ],
  overview:[
    'Dame un panorama económico de todos los eventos.','¿Cómo están los eventos en conjunto?','Hazme una visión global de los eventos registrados.','Sácame la matriz económica general de eventos.'
  ],
  peopleActivity:[
    '¿Qué personas tienen más actividad en ControlEvent?','Repasa la implicación global de las personas.','Dame una visión de actividad por persona.','¿Cómo se reparte la actividad entre las personas canónicas?'
  ],
  socios:[
    'Dame el censo de socios canónicos.','¿Cuántos socios canónicos constan?','Repasa la lista de socios según el criterio canónico.','Quiero consultar los socios canónicos.'
  ],
  storePurchases:[
    '¿Qué compras se han hecho en {store}?','Repasa las compras históricas de {store}.','¿Cuánto se ha comprado en {store} y en qué eventos?','Dime la actividad de compras de la tienda {store}.'
  ],
  participation:[
    '¿En qué eventos aparece {person}?','Dime los eventos en los que participa {person}.','¿Dónde figura {person} a lo largo de los eventos?','Lista los eventos vinculados a {person}.'
  ],
  bankTimeline:[
    'Dame la cronología bancaria de {event}.','Quiero ver la evolución temporal del banco en {event}.','Repasa el saldo bancario movimiento a movimiento de {event}.','Sácame la línea temporal bancaria de {event}.'
  ],
  docsFollow:['¿Y los documentos del evento?','¿Qué DOC constan?','Dime los documentos y adjuntos.','¿Hay documentación sin adjuntar?'],
  ticketsFollow:['¿Y los TKxx?','¿Qué tickets tienen imagen?','Repasa ahora los fototickets.','¿Cuántos tickets están documentados?'],
  bankFollow:['¿Cuántos movimientos hubo?','¿Y el impacto neto?','¿Cómo quedó el saldo final?','¿Están justificados los movimientos?'],
  donationFollow:['¿Cuánto suman las donaciones y cuántos donantes hay?','¿Qué valor total aportaron y cuántos donantes fueron?','¿Cuántos registros de donación constan y por qué valor?','Resúmeme en cifras las donaciones.'],
  donationMissingPhysical:['¿Cuáles todavía no tenemos físicamente?','¿Qué donaciones faltan por llegar físicamente?','¿Qué de eso aún no está entregado?','De esas donaciones, ¿qué sigue sin estar en el almacén?'],
  donationDelivered:['¿Y cuáles ya están entregadas?','¿Qué productos donados tenemos ya físicamente?','¿Cuáles constan como Entregada?','Ahora dime las que sí han llegado.'],
  responsibleFollow:['¿Quién es el responsable?','¿Quién se encarga de eso?','¿Quién lleva esa compra?','¿De quién depende?'],
  samePersonOtherThings:['¿Y qué otras cosas tiene esa persona?','¿Qué más lleva esa persona?','¿Qué otras compras tiene a su cargo?','¿Y qué más tiene pendiente?'],
  managementFollow:['¿Cuántas tareas LG quedan pendientes?','¿Qué queda pendiente de gestión?','Dime el reparto entre LG terminadas y pendientes.','¿Cuántos hitos y tareas constan?'],
  attendanceFollow:['¿Y cuántas personas fueron en total?','Dame solo el total de asistentes.','¿Cuánta gente consta finalmente?','Resúmeme la asistencia en una cifra.']
};



// VNext P1.11 · ITV ALCANCE DE LENGUAJE -------------------------------------
// Estas baterías son DATOS DE PRUEBA, no reglas del runtime. NHC: ninguna frase
// de aquí se usa para interpretar al usuario ni para decidir qué ejecuta CE.
// La única misión es lanzar lenguaje cada vez más abierto por la MISMA tubería
// real de Zuzu y observar PLAN -> CE -> respuesta con oráculo/ledger.
const LANGUAGE_REACH_PROFILES={
  GOLDEN:{id:'GOLDEN',label:'GOLDEN · 110',count:110,expectedBand:'regresión fija',description:'Las mismas 110 preguntas de la referencia P1.17; los oráculos se refrescan con los datos actuales.'},
  GOLDEN_DIALOGUE:{id:'GOLDEN_DIALOGUE',label:'GOLDEN DIÁLOGO · 14',count:14,expectedBand:'continuidad fija comparable',description:'Una conversación fija de 14 turnos: mismas frases, mismo orden y mismo escenario en cada versión.'},
  DIALOGUE:{id:'DIALOGUE',label:'DIÁLOGO · 24',count:24,expectedBand:'continuidad adaptativa',description:'Una conversación sintética continua: cada turno nace de la respuesta real de Zuzu y del foco que haya quedado activo.'},
  BASIC:{id:'BASIC',label:'BÁSICA',count:50,expectedBand:'95–100%',description:'Preguntas simples, explícitas y de un solo objetivo.'},
  MEDIUM:{id:'MEDIUM',label:'MEDIA',count:60,expectedBand:'≈90%',description:'Continuidad corta, comparaciones, varias acciones y referencias naturales.'},
  HARD:{id:'HARD',label:'DIFÍCIL',count:70,expectedBand:'<50% de partida',description:'Composición, cambios de foco, tablas, gráficas, elipsis y lenguaje ruidoso.'},
  EXTREME:{id:'EXTREME',label:'EXTREMA',count:80,expectedBand:'<25% de partida',description:'Peticiones abiertas, derivaciones, cruces y capacidades todavía no garantizadas.'}
};
function normalizeLanguageLevel(raw='BASIC'){
  const n=norm(raw).replace(/\s+/g,'');
  if(['goldendialogue','goldendialog','dialoguegolden','dialogogolden','golden14','dialog14'].includes(n))return'GOLDEN_DIALOGUE';
  if(['golden','golden110','110','fija','regresion'].includes(n))return'GOLDEN';
  if(['dialogue','dialogo','diálogo','conversation','conversacion','conversación','24'].includes(n))return'DIALOGUE';
  if(['basic','basica','facil','50'].includes(n))return'BASIC';
  if(['medium','media','intermedia','60'].includes(n))return'MEDIUM';
  if(['hard','dificil','dificil70','70'].includes(n))return'HARD';
  if(['extreme','extrema','imposible','80'].includes(n))return'EXTREME';
  return'BASIC';
}
function languageActiveEvent(events=[]){
  return arr(events).find(e=>/en\s+curso|activo|abierto/.test(norm(e?.estado||e?.situacion||e?.status)))||arr(events)[0]||null;
}
function languageEventAt(events=[],i=0){const a=arr(events);return a.length?a[Math.abs(i)%a.length]:null;}
function languagePersonAt(people=[],i=0){const a=arr(people);return a.length?a[Math.abs(i)%a.length]:null;}
function languageStoreAt(stores=[],i=0){const a=arr(stores);return a.length?a[Math.abs(i)%a.length]:null;}
function languageCase({level,index,group,label,prompt,scenario,event='',events=[],person='',oracle=null,expected='',requireAnswer=true}){
  // P1.12: estas baterías miden expresamente el motor VNext que usa el botón 🧪 VNext.
  // Es configuración de ITV, no interpretación lingüística: NHC permanece intacto.
  return{id:`lang-${level.toLowerCase()}-${String(index+1).padStart(3,'0')}`,group,label,prompt,scenario,event,events,person,oracle,expected:trim(expected)||expectedOracleText(oracle)||'Debe resolver la petición con datos reales y sin inventar hechos.',requireAnswer,engine:'VNEXT'};
}
function languageLedger(extra={}){return{kind:'ledger-structural',...extra};}

function goldenFixture(){
  try{return JSON.parse(fs.readFileSync(path.join(__dirname,'../config/zuzu-itv-golden-p117-110.json'),'utf8'));}catch(_){return{count:0,cases:[]};}
}
async function refreshGoldenCase(caseDef,state,cache=new Map()){
  const c=JSON.parse(JSON.stringify(caseDef||{})),o=c.oracle||{},kind=trim(o.kind),event=trim(c.event||o.event),person=trim(c.person||o.person);let data=null;
  const cached=async(k,fn)=>{if(cache.has(k))return await cache.get(k);const p=Promise.resolve().then(fn);cache.set(k,p);try{return await p;}catch(e){cache.delete(k);throw e;}};
  try{
    if(['event-summary','event-economy'].includes(kind)){data=await cached(`event:${norm(event)}`,()=>eventOracle(state,event));if(data)c.oracle={kind,event,data,...(arr(o.requiredMetrics).length?{requiredMetrics:arr(o.requiredMetrics).slice()}: {})};}
    else if(kind==='event-metric'){data=await cached(`event:${norm(event)}`,()=>eventOracle(state,event));if(data){const label=trim(o.label),n=norm(label),value=n.includes('compras pendientes')?data.pending:n.includes('ingresos')?data.income:n.includes('compras')?data.purchases:n.includes('donaciones')?data.donations:n.includes('saldo')?data.balance:o.value;c.oracle={kind,event,label,value};}}
    else if(['purchase-set','purchase-max','purchase-sum'].includes(kind)){data=await cached(`purchase:${norm(event)}`,()=>purchaseOracle(state,event));if(data)c.oracle=kind==='purchase-set'?{kind,event:data.event,productCount:data.productCount,total:data.total}:kind==='purchase-sum'?{kind,event:data.event,total:data.total}:{kind,event:data.event,row:data.max};}
    else if(kind==='attendance'){data=await cached(`event:${norm(event)}`,()=>eventOracle(state,event));if(data)c.oracle={kind,event,data:attendanceOracle(data,event)};}
    else if(kind==='donations'){data=await cached(`don:${norm(event)}`,()=>donationOracle(state,event));if(data)c.oracle={kind,event:data.event||event,data};}
    else if(kind==='documentation'){data=await cached(`docs:${norm(event)}`,()=>documentationOracle(state,event));if(data)c.oracle={kind,event:data.event||event,data};}
    else if(kind==='bank-summary'){data=await cached(`bank:${norm(event)}`,()=>bankOracle(state,event));if(data)c.oracle={kind,event:data.event||event,data};}
    else if(kind==='management'){data=await cached(`mgmt:${norm(event)}`,()=>managementOracle(state,event));if(data)c.oracle={kind,event:data.event||event,data};}
    else if(['person-summary','person-events','person-income'].includes(kind)){data=await cached(`person:${norm(person)}`,()=>personOracle(state,person));if(data)c.oracle=kind==='person-income'?{kind,person:data.person||person,total:data.income,known:true}:{kind,person:data.person||person,data};}
    else if(['comparison','compare-metric'].includes(kind)){const evs=arr(c.events||o.compare?.events),ck=`compare:${evs.map(norm).join('|')}`;data=await cached(ck,()=>comparisonOracle(state,evs));if(data)c.oracle=kind==='comparison'?{kind,compare:data}:{kind,compare:data,metric:trim(o.metric)};}
    else if(kind==='events-overview'){data=await cached('events-overview',()=>eventsOverviewOracle(state));if(data)c.oracle={kind,count:data.count};}
    else if(kind==='store-purchases'){const st=trim(o.store||c.store);data=await cached(`store:${norm(st)}`,()=>storePurchasesOracle(state,st));if(data)c.oracle={kind,...data};}
    else if(kind==='catalog-count'){const ent=trim(o.entity);data=await cached(`catalog:${ent}`,()=>catalogOracle(state,ent));if(data)c.oracle={kind,...data};}
    else if(kind==='canonical-socios'){data=await cached('canonical-socios',()=>canonicalSociosOracle(state));if(data)c.oracle={kind,records:data.records,people:data.people};}
  }catch(_){/* mantiene snapshot si el refresco no puede acreditarse */}
  c.expected=expectedOracleText(c.oracle)||trim(c.expected);c.mode='FULL-CERT';c.engine='VNEXT';return c;
}
async function buildGoldenLanguageCases(state){const f=goldenFixture(),out=[],cache=new Map();for(const c of arr(f.cases))out.push(await refreshGoldenCase(c,state,cache));return out.slice(0,110);}

async function buildGoldenDialogueCases(state={}){
  // ITV exclusivamente: estas frases NO se reutilizan en el runtime. Su valor es repetir
  // exactamente la misma carretera conversacional en cada versión.
  const turns=[
    {prompt:'Sácame algo histórico que recuerdes de Pocholo; quiero ir tirando del hilo contigo.',tool:'recall_memory',actions:['search'],changeFocus:true},
    {prompt:'Abre el primer recuerdo que me acabas de enseñar.',tool:'recall_memory',actions:['read']},
    {prompt:'Resúmeme ese recuerdo en dos o tres ideas, sin soltarme códigos.',tool:'recall_memory',actions:['summarize']},
    {prompt:'Ahora cambia de tema: dame un resumen de SySA 2026.',tool:'query_ce',operations:['event_summary'],changeFocus:true},
    {prompt:'De las tablas que acabas de mostrar, enséñame Economía.',tool:'query_ce',operations:['view_current']},
    {prompt:'Quédate solo con las filas cuyo Indicador sea Coste de personal o Ingresos por patrocinio.',tool:'query_ce',operations:['view_current']},
    {prompt:'Oculta la columna Valor.',tool:'query_ce',operations:['view_current']},
    {prompt:'Recupérala y ordénalo por Valor de mayor a menor.',tool:'query_ce',operations:['view_current']},
    {prompt:'¿Cuál de esas filas tiene el Valor más alto y cuánto es?',tool:'query_ce',operations:['derive']},
    {prompt:'Vale, cambia de asunto: háblame de Colty y Esther.',requiresTool:true,changeFocus:true},
    {prompt:'¿En qué eventos aparecen?',tool:'query_ce',operations:['person_events']},
    {prompt:'Volvamos a la tabla de Economía de SySA 2026 que dejamos antes.',tool:'query_ce',operations:['view_current'],changeFocus:true},
    {prompt:'Quita los filtros y déjala completa otra vez.',tool:'query_ce',operations:['view_current']},
    {prompt:'Resúmeme qué hemos hecho en esta conversación y qué asuntos quedan abiertos.',tool:'recall_memory',actions:['current']}
  ];
  return turns.map((spec,i)=>({id:`golden-dialogue-${String(i+1).padStart(3,'0')}`,group:'GOLDEN DIÁLOGO FIJO',label:`Turno fijo ${i+1}`,prompt:spec.prompt,expected:'Mantener el hilo, ejecutar la acción pedida y no arrastrar un foco anterior contra una corrección explícita.',scenario:'ITV GOLDEN DIALOGUE P2',mode:'FULL-CERT',engine:'VNEXT',dialogue:{adaptive:false,fixed:true,turn:i+1,total:turns.length,requiresTool:spec.requiresTool!==false,changeFocus:spec.changeFocus===true,expectedTool:trim(spec.tool),expectedOperations:arr(spec.operations),expectedActions:arr(spec.actions)}}));
}

function buildAdaptiveDialogueCases(state={},seed=1){
  const people=shuffled(arr(state?.personas).map(personName).filter(Boolean),seed,'dialogue-people'),events=shuffled(arr(state?.eventos).map(eventName).filter(Boolean),seed,'dialogue-events'),p1=people[0]||'una persona conocida',p2=people[1]||p1,e1=events[0]||'el evento activo',e2=events[1]||e1;
  const mission=`Mantén UNA sola conversación larga y humana con Zuzu. El único arranque fijado será una búsqueda histórica alrededor de ${p1}; desde ahí NO sigas un guion de preguntas. Cada siguiente turno debe decidirse después de leer la respuesta real de Zuzu y continuar, corregir, aclarar, bromear o cambiar de rumbo como haría una persona. Durante la charla intenta, solo cuando el hilo lo permita, trabajar varios turnos sobre un mismo objeto/tabla (incluye alguna exclusión/filtro de filas y su recuperación, columnas, orden o resumen), resolver alguna aclaración, hacer al menos un cambio deliberado de foco hacia algo como ${e1} o ${p2}, y volver a un asunto anterior si resulta natural. No hay orden obligatorio ni frase preparada para esas acciones. Si Zuzu abre un foco inesperado, síguelo antes de decidir el turno siguiente. Si se equivoca, corrígelo dentro de la misma conversación; nunca reinicies para que el test salga bien. Usa a veces elipsis, referencias como “ese/lo de antes/y ahora”, coloquialismos o pequeñas erratas. Al acercarte al final, pide un resumen solo si encaja con lo que realmente se haya hablado.`;
  const out=[];for(let i=1;i<=24;i++)out.push({id:`dialogue-${String(i).padStart(3,'0')}`,group:'DIÁLOGO ADAPTATIVO',label:`Turno conversacional ${i}`,prompt:i===1?`Sácame algo histórico que recuerdes de ${p1}; quiero ir tirando del hilo contigo.`:'[turno generado dinámicamente desde la respuesta anterior]',expected:'Mantener hilo, foco, intención pendiente y objeto activo; ejecutar acciones sin promesas vacías.',scenario:'ITV DIALOGUE P2',mode:'FULL-CERT',engine:'VNEXT',dialogue:{adaptive:true,turn:i,total:24,mission,seed:String(seed),anchors:{people:[p1,p2],events:[e1,e2]}}});return out;
}

async function buildLanguageReachCases(state,rawLevel='BASIC',seed=1){
  const level=normalizeLanguageLevel(rawLevel),profile=LANGUAGE_REACH_PROFILES[level];
  if(level==='GOLDEN')return buildGoldenLanguageCases(state);
  if(level==='GOLDEN_DIALOGUE')return buildGoldenDialogueCases(state);
  if(level==='DIALOGUE')return buildAdaptiveDialogueCases(state,seed);
  const chosen=chooseEvents(state,seed),events=arr(chosen.events),people=choosePeople(state,seed).people,stores=shuffled(arr(state?.tiendas).filter(x=>trim(x?.nombre)),seed,'lang-stores');
  const active=languageActiveEvent(events),activeName=eventName(active),catalogs=['events','people','products','stores'];
  const eventCache=new Map(),docsCache=new Map(),bankCache=new Map(),mgmtCache=new Map(),donCache=new Map(),personCache=new Map(),compareCache=new Map(),storeCache=new Map();
  const eventData=async en=>{const k=norm(en);if(!eventCache.has(k))eventCache.set(k,await eventOracle(state,en));return eventCache.get(k);};
  const docsData=async en=>{const k=norm(en);if(!docsCache.has(k))docsCache.set(k,await documentationOracle(state,en));return docsCache.get(k);};
  const bankData=async en=>{const k=norm(en);if(!bankCache.has(k))bankCache.set(k,await bankOracle(state,en));return bankCache.get(k);};
  const mgmtData=async en=>{const k=norm(en);if(!mgmtCache.has(k))mgmtCache.set(k,await managementOracle(state,en));return mgmtCache.get(k);};
  const donData=async en=>{const k=norm(en);if(!donCache.has(k))donCache.set(k,await donationOracle(state,en));return donCache.get(k);};
  const personData=async pn=>{const k=norm(pn);if(!personCache.has(k))personCache.set(k,await personOracle(state,pn));return personCache.get(k);};
  const compareData=async names=>{const k=arr(names).map(norm).join('|');if(!compareCache.has(k))compareCache.set(k,await comparisonOracle(state,names));return compareCache.get(k);};
  const storeData=async sn=>{const k=norm(sn);if(!storeCache.has(k))storeCache.set(k,await storePurchasesOracle(state,sn));return storeCache.get(k);};
  const out=[];
  const add=async spec=>{if(out.length>=profile.count)return;out.push(languageCase({level,index:out.length,...spec}));};
  const eName=i=>eventName(languageEventAt(events,i))||activeName||'el evento activo';
  const pName=i=>personName(languagePersonAt(people,i))||'una persona registrada';
  const sName=i=>trim(languageStoreAt(stores,i)?.nombre)||'una tienda registrada';
  const evOracle=async(en,kind='event-summary')=>{const d=await eventData(en);return d?{kind,event:en,data:d}:null;};

  if(level==='BASIC'){
    const eventPhrases=[
      en=>`Háblame de ${en}.`,en=>`Dame los datos clave de ${en}.`,en=>`¿Cómo quedó ${en}?`,en=>`Repásame ${en}.`,en=>`Cuéntame lo importante de ${en}.`
    ];
    for(let i=0;i<profile.count;i++){
      const en=eName(i),pn=pName(i),sn=sName(i),slot=i%16,scenario=`LANG BASIC ${String(i+1).padStart(2,'0')}`;
      // P1.14: oráculos LAZY. Cada pregunta calcula únicamente la fuente factual que necesita.
      // BASIC deja de precalcular evento+compras+donaciones+documentos+banco+gestión+persona para luego tirar 6/7 resultados.
      if(slot===0){const eo=await eventData(en);await add({group:'BÁSICO · EVENTO',label:'Resumen explícito',prompt:eventPhrases[i%eventPhrases.length](en),scenario,event:en,oracle:eo?{kind:'event-summary',event:en,data:eo}:null});}
      else if(slot===1){const eo=await eventData(en);await add({group:'BÁSICO · INGRESOS',label:'Total de ingresos',prompt:`¿Cuánto se ingresó en ${en}?`,scenario,event:en,oracle:eo?{kind:'event-metric',event:en,label:'Ingresos',value:eo.income}:null});}
      else if(slot===2){const po=purchaseOracle(state,en);await add({group:'BÁSICO · COMPRAS',label:'Compras del evento',prompt:`¿Qué compras hubo en ${en}?`,scenario,event:en,oracle:po?{kind:'purchase-set',event:en,productCount:po.productCount,total:po.total}:null});}
      else if(slot===3){const eo=await eventData(en);await add({group:'BÁSICO · PTE.COMPRA',label:'Pendiente de compra',prompt:`¿Cuánto queda pendiente de compra en ${en}?`,scenario,event:en,oracle:eo?{kind:'event-metric',event:en,label:'Compras pendientes',value:eo.pending}:null});}
      else if(slot===4){const eo=await eventData(en);await add({group:'BÁSICO · ASISTENCIA',label:'Asistencia total',prompt:`¿Cuánta gente asistió a ${en}?`,scenario,event:en,oracle:eo?{kind:'attendance',event:en,data:attendanceOracle(eo,en)}:null});}
      else if(slot===5){const d=await donData(en);await add({group:'BÁSICO · DONACIONES',label:'Donaciones',prompt:`¿Qué donaciones hubo en ${en}?`,scenario,event:en,oracle:d?{kind:'donations',event:en,data:d}:null});}
      else if(slot===6){const doc=await docsData(en);await add({group:'BÁSICO · DOCUMENTOS',label:'Documentación',prompt:`Revisa la documentación de ${en}.`,scenario,event:en,oracle:doc?{kind:'documentation',event:en,data:doc}:null});}
      else if(slot===7){const b=await bankData(en);await add({group:'BÁSICO · BANCO',label:'Cuadre banco',prompt:`Dame el Cuadre Banco de ${en}.`,scenario,event:en,oracle:b?{kind:'bank-summary',event:en,data:b}:null});}
      else if(slot===8){const m=await mgmtData(en);await add({group:'BÁSICO · GESTIÓN',label:'Hitos y LG',prompt:`¿Cómo van los hitos y tareas LG de ${en}?`,scenario,event:en,oracle:m?{kind:'management',event:en,data:m}:null});}
      else if(slot===9){const pp=await personData(pn);await add({group:'BÁSICO · PERSONA',label:'Dossier personal',prompt:`Háblame de ${pn}.`,scenario,person:pn,oracle:pp?{kind:'person-summary',person:pn,data:pp}:null});}
      else if(slot===10){const pp=await personData(pn);await add({group:'BÁSICO · PERSONA',label:'Eventos de una persona',prompt:`¿En qué eventos aparece ${pn}?`,scenario,person:pn,oracle:pp?{kind:'person-events',person:pn,data:pp}:null});}
      else if(slot===11){const pp=await personData(pn);await add({group:'BÁSICO · PERSONA',label:'Ingresos de una persona',prompt:`¿Qué ingresos tiene vinculados ${pn}?`,scenario,person:pn,oracle:pp?{kind:'person-income',person:pn,total:pp.income,known:true}:null});}
      else if(slot===12){const ce=catalogs[i%catalogs.length],co=catalogOracle(state,ce);await add({group:'BÁSICO · CATÁLOGO',label:`Catálogo ${ce}`,prompt:`¿Cuántos ${ce==='events'?'eventos':ce==='people'?'personas':ce==='products'?'productos':'tiendas'} hay registrados?`,scenario,oracle:{kind:'catalog-count',...co}});}
      else if(slot===13){const so=await storeData(sn);await add({group:'BÁSICO · TIENDA',label:'Compras por tienda',prompt:`¿Qué compras se han hecho en ${sn}?`,scenario,oracle:so?{kind:'store-purchases',...so}:null});}
      else if(slot===14){const co=await canonicalSociosOracle(state);await add({group:'BÁSICO · SOCIOS',label:'Censo canónico',prompt:'Dame el censo de socios canónicos.',scenario,oracle:co?{kind:'canonical-socios',records:co.records,people:co.people}:null});}
      else {const ov=await eventsOverviewOracle(state);await add({group:'BÁSICO · GLOBAL',label:'Panorama de eventos',prompt:'Dame un panorama económico de todos los eventos.',scenario,oracle:ov?{kind:'events-overview',count:ov.count}:null});}
    }
  }

  if(level==='MEDIUM'){
    // 20 bloques de 3 turnos. Cada bloque conserva conversationState; entre bloques se reinicia.
    for(let block=0;block<20&&out.length<profile.count;block++){
      const en=eName(block),en2=eName(block+1),pn=pName(block),pn2=pName(block+1),eo=await eventData(en),po=purchaseOracle(state,en),pp=await personData(pn),pp2=await personData(pn2),cmp=en2&&norm(en2)!==norm(en)?await compareData([en,en2]):null,doc=await docsData(en),don=await donData(en),scenario=`LANG MEDIA ${String(block+1).padStart(2,'0')}`;
      const type=block%7;
      if(type===0){
        await add({group:'MEDIA · CONTINUIDAD EVENTO',label:'Abrir evento',prompt:`Sitúame en ${en}.`,scenario,event:en,oracle:eo?{kind:'event-summary',event:en,data:eo}:null});
        await add({group:'MEDIA · CONTINUIDAD EVENTO',label:'Seguimiento económico',prompt:'¿Y económicamente cómo quedó?',scenario,event:en,oracle:eo?{kind:'event-economy',event:en,data:eo}:null});
        await add({group:'MEDIA · CONTINUIDAD EVENTO',label:'Seguimiento documental',prompt:'¿Y la documentación?',scenario,event:en,oracle:doc?{kind:'documentation',event:en,data:doc}:null});
      }else if(type===1){
        await add({group:'MEDIA · COMPRAS',label:'Lista de compras',prompt:`Sácame las compras de ${en}.`,scenario,event:en,oracle:po?{kind:'purchase-set',event:en,productCount:po.productCount,total:po.total}:null});
        await add({group:'MEDIA · COMPRAS',label:'Máximo por referencia',prompt:'¿Cuál fue el producto más caro de esos?',scenario,event:en,oracle:po?{kind:'purchase-max',event:en,row:po.max}:null});
        await add({group:'MEDIA · COMPRAS',label:'Suma del conjunto',prompt:'¿Y cuánto suman todos?',scenario,event:en,oracle:po?{kind:'purchase-sum',event:en,total:po.total}:null});
      }else if(type===2){
        await add({group:'MEDIA · PERSONA',label:'Abrir persona',prompt:`Hazme un resumen de ${pn}.`,scenario,person:pn,oracle:pp?{kind:'person-summary',person:pn,data:pp}:null});
        await add({group:'MEDIA · PERSONA',label:'Eventos de esa persona',prompt:'¿En qué eventos aparece?',scenario,person:pn,oracle:pp?{kind:'person-events',person:pn,data:pp}:null});
        await add({group:'MEDIA · PERSONA',label:'Ingresos de esa persona',prompt:'¿Y de ingresos qué tiene?',scenario,person:pn,oracle:pp?{kind:'person-income',person:pn,total:pp.income,known:true}:null});
      }else if(type===3&&cmp){
        await add({group:'MEDIA · COMPARACIÓN',label:'Comparar eventos',prompt:`Compara ${en} con ${en2}.`,scenario,events:[en,en2],oracle:{kind:'comparison',compare:cmp}});
        await add({group:'MEDIA · COMPARACIÓN',label:'Ganador ingresos',prompt:'¿Cuál tuvo más ingresos?',scenario,events:[en,en2],oracle:{kind:'compare-metric',compare:cmp,metric:'income'}});
        await add({group:'MEDIA · COMPARACIÓN',label:'Ganador compras',prompt:'¿Y cuál gastó más en compras?',scenario,events:[en,en2],oracle:{kind:'compare-metric',compare:cmp,metric:'purchases'}});
      }else if(type===4){
        await add({group:'MEDIA · DOS OBJETIVOS',label:'Ingresos y asistencia',prompt:`Dime cuánto se ingresó y cuánta gente asistió a ${en}.`,scenario,event:en,oracle:eo?{kind:'event-summary',event:en,data:eo,requiredMetrics:['income','attendees']}:null});
        await add({group:'MEDIA · DOS OBJETIVOS',label:'Añadir donaciones',prompt:'Añade ahora las donaciones al resumen.',scenario,event:en,oracle:don?{kind:'donations',event:en,data:don}:null});
        await add({group:'MEDIA · DOS OBJETIVOS',label:'Volver al balance',prompt:'Vale, con eso dime cómo quedó el saldo operativo.',scenario,event:en,oracle:eo?{kind:'event-metric',event:en,label:'Saldo operativo',value:eo.balance}:null});
      }else if(type===5){
        await add({group:'MEDIA · CAMBIO DE FOCO',label:'Persona inicial',prompt:`Háblame de ${pn}.`,scenario,person:pn,oracle:pp?{kind:'person-summary',person:pn,data:pp}:null});
        await add({group:'MEDIA · CAMBIO DE FOCO',label:'Cambiar persona',prompt:`Ahora cambia a ${pn2}.`,scenario,person:pn2,oracle:pp2?{kind:'person-summary',person:pn2,data:pp2}:null});
        await add({group:'MEDIA · CAMBIO DE FOCO',label:'Seguir nuevo foco',prompt:'¿En qué eventos aparece?',scenario,person:pn2,oracle:pp2?{kind:'person-events',person:pn2,data:pp2}:null});
      }else{
        await add({group:'MEDIA · TABLA',label:'Abrir tabla de compras',prompt:`Dame las compras de ${en} en tabla.`,scenario,event:en,oracle:languageLedger({action:'query',domain:'purchases',event:en})});
        await add({group:'MEDIA · TABLA',label:'Ordenar vista',prompt:'Ordénala por Importe de mayor a menor.',scenario,event:en,oracle:languageLedger({action:'local|query',domain:'purchases',operations:['sort:Importe:desc']})});
        await add({group:'MEDIA · TABLA',label:'Quitar columna',prompt:'Quita la columna Unidades, pero no pierdas los datos.',scenario,event:en,oracle:languageLedger({action:'local|query',domain:'purchases',operations:['remove_field:Unidades'],absentFields:['Unidades']})});
      }
    }
  }

  if(level==='HARD'){
    // 14 bloques de 5 turnos = 70. Mezcla continuidad, vistas, multientidad y presentación.
    for(let block=0;block<14&&out.length<profile.count;block++){
      const en=eName(block),en2=eName(block+2),pn=pName(block),pn2=pName(block+2),eo=await eventData(en),po=purchaseOracle(state,en),pp=await personData(pn),cmp=en2&&norm(en2)!==norm(en)?await compareData([en,en2]):null,scenario=`LANG DIFÍCIL ${String(block+1).padStart(2,'0')}`,type=block%7;
      if(type===0){
        await add({group:'DIFÍCIL · VISTA TABLA',label:'Crear tabla',prompt:`Dame las compras de ${en}, con todas las columnas disponibles.`,scenario,event:en,oracle:languageLedger({action:'query',domain:'purchases',event:en})});
        await add({group:'DIFÍCIL · VISTA TABLA',label:'Filtro semántico',prompt:'Ahora deja solo las que tengan importe mayor que cero.',scenario,event:en,oracle:languageLedger({action:'local|query',domain:'purchases',operations:['filter']})});
        await add({group:'DIFÍCIL · VISTA TABLA',label:'Ordenación',prompt:'De esas, pon primero las más caras.',scenario,event:en,oracle:languageLedger({action:'local|query',domain:'purchases',operations:['sort']})});
        await add({group:'DIFÍCIL · VISTA TABLA',label:'Ocultar campo',prompt:'Quita Unidades de la vista, que me estorba.',scenario,event:en,oracle:languageLedger({action:'local|query',domain:'purchases',operations:['remove_field:Unidades'],absentFields:['Unidades']})});
        await add({group:'DIFÍCIL · VISTA TABLA',label:'Restaurar campo',prompt:'Vale, vuelve a poner Unidades sin cambiar el resto.',scenario,event:en,oracle:languageLedger({action:'local|query',domain:'purchases',operations:['add_field:Unidades'],fields:['Unidades']})});
      }else if(type===1){
        await add({group:'DIFÍCIL · CAMBIO DE CONTEXTO',label:'Evento A',prompt:`Estamos con ${en}. Dame lo esencial.`,scenario,event:en,oracle:eo?{kind:'event-summary',event:en,data:eo}:null});
        await add({group:'DIFÍCIL · CAMBIO DE CONTEXTO',label:'Persona dentro de evento',prompt:`Y dentro de ese evento, ¿qué sabes de ${pn}?`,scenario,event:en,person:pn,oracle:languageLedger({action:'query|reference',entity:pn,event:en})});
        await add({group:'DIFÍCIL · CAMBIO DE CONTEXTO',label:'Saltar a evento B',prompt:`Cambia un momento a ${en2}.`,scenario,event:en2,oracle:await evOracle(en2)});
        await add({group:'DIFÍCIL · CAMBIO DE CONTEXTO',label:'Banco del nuevo foco',prompt:'¿Y el banco cómo quedó ahí?',scenario,event:en2,oracle:languageLedger({action:'query|reference',domain:'bank',event:en2})});
        await add({group:'DIFÍCIL · CAMBIO DE CONTEXTO',label:'Volver al primer foco',prompt:'Vuelve al primero y dime otra vez qué papel tenía esa persona.',scenario,event:en,person:pn,oracle:languageLedger({action:'reference|query',entity:pn,event:en})});
      }else if(type===2){
        await add({group:'DIFÍCIL · MULTIOBJETIVO',label:'Dos consultas a la vez',prompt:`Dime quién no ha pagado en ${en} y también los socios que no asistirán.`,scenario,event:en,oracle:languageLedger({action:'query',event:en})});
        await add({group:'DIFÍCIL · MULTIOBJETIVO',label:'Operar segundo conjunto',prompt:'De los no asistentes, quita a la última persona de la tabla.',scenario,event:en,oracle:languageLedger({action:'local|reference'})});
        await add({group:'DIFÍCIL · MULTIOBJETIVO',label:'Ordenar segundo conjunto',prompt:'Ordénalos ahora por Persona descendente.',scenario,event:en,oracle:languageLedger({action:'local|query',operations:['sort']})});
        await add({group:'DIFÍCIL · MULTIOBJETIVO',label:'Filtro nuevo',prompt:'Ahora déjame solamente una persona de ese resultado.',scenario,event:en,oracle:languageLedger({action:'local|reference',operations:['filter']})});
        await add({group:'DIFÍCIL · MULTIOBJETIVO',label:'Restauración',prompt:'Y vuelve a la tabla original de no asistentes.',scenario,event:en,oracle:languageLedger({action:'local|reference'})});
      }else if(type===3){
        await add({group:'DIFÍCIL · GRÁFICA',label:'Gráfica global libre',prompt:`Dame una gráficaquetecagasdabutiyolé a partir de TODOS los datos de ${en}; elige tú el tipo que tenga sentido.`,scenario,event:en,oracle:languageLedger({action:'query|local',event:en,chart:true})});
        await add({group:'DIFÍCIL · GRÁFICA',label:'Preferencia flexible',prompt:'Preferiblemente de líneas, pero si por los datos procede barras, usa barras.',scenario,event:en,oracle:languageLedger({action:'reference|local|query',event:en,chart:true})});
        await add({group:'DIFÍCIL · GRÁFICA',label:'Todo un poco',prompt:'Pinta de todo un poco, sin mezclar magnitudes que no sean comparables.',scenario,event:en,oracle:languageLedger({action:'reference|query|local',event:en,chart:true})});
        await add({group:'DIFÍCIL · GRÁFICA',label:'Explicar selección',prompt:'Y dime en dos frases por qué has elegido esas gráficas.',scenario,event:en,oracle:languageLedger({action:'reference|inspect|local'})});
        await add({group:'DIFÍCIL · GRÁFICA',label:'Volver a datos',prompt:'Ahora quita la gráfica y dame los datos en tabla.',scenario,event:en,oracle:languageLedger({action:'local|reference|query',event:en})});
      }else if(type===4&&cmp){
        await add({group:'DIFÍCIL · COMPARACIÓN',label:'Comparación general',prompt:`Pon frente a frente ${en} y ${en2}.`,scenario,events:[en,en2],oracle:{kind:'comparison',compare:cmp}});
        await add({group:'DIFÍCIL · COMPARACIÓN',label:'Solo economía',prompt:'De esa comparación, quédate solo con ingresos, compras y saldo.',scenario,events:[en,en2],oracle:languageLedger({action:'local|reference|query',operations:['set_fields']})});
        await add({group:'DIFÍCIL · COMPARACIÓN',label:'Ganador con diferencia',prompt:'¿Cuál salió mejor de saldo y por cuánto?',scenario,events:[en,en2],oracle:{kind:'compare-metric',compare:cmp,metric:'balance'}});
        await add({group:'DIFÍCIL · COMPARACIÓN',label:'Ordenar comparación',prompt:'Ordénamelos del mejor al peor por saldo.',scenario,events:[en,en2],oracle:languageLedger({action:'local|query',operations:['sort']})});
        await add({group:'DIFÍCIL · COMPARACIÓN',label:'Representar comparación',prompt:'Hazme una gráfica de esa comparación.',scenario,events:[en,en2],oracle:languageLedger({action:'local|reference|query',chart:true})});
      }else if(type===5){
        await add({group:'DIFÍCIL · LENGUAJE RUIDOSO',label:'Evento con ruido',prompt:`a ver zuzu, ${en}, dime como fue aquello sin enrrollarte`,scenario,event:en,oracle:eo?{kind:'event-summary',event:en,data:eo}:null});
        await add({group:'DIFÍCIL · LENGUAJE RUIDOSO',label:'Compras coloquial',prompt:'y las compras? solo lo gordo, no me sueltes la biblia',scenario,event:en,oracle:po?{kind:'purchase-presence',event:en,productCount:po.productCount,total:po.total}:null});
        await add({group:'DIFÍCIL · LENGUAJE RUIDOSO',label:'Máximo coloquial',prompt:'de eso cual fue la clavada mas gorda',scenario,event:en,oracle:po?{kind:'purchase-max',event:en,row:po.max}:null});
        await add({group:'DIFÍCIL · LENGUAJE RUIDOSO',label:'Persona con cambio brusco',prompt:`vale pasa de eso, ${pn2}, que ha hecho este?`,scenario,person:pn2,oracle:languageLedger({action:'query',entity:pn2})});
        await add({group:'DIFÍCIL · LENGUAJE RUIDOSO',label:'Resumen del hilo',prompt:'y ahora resumeme que coño hemos mirado en esta conversación',scenario,oracle:languageLedger({action:'inspect',responseKind:'conversation_summary'})});
      }else{
        await add({group:'DIFÍCIL · RELACIÓN',label:'Persona y evento',prompt:`¿Qué relación tiene ${pn} con ${en}?`,scenario,event:en,person:pn,oracle:languageLedger({action:'query',entity:pn,event:en})});
        await add({group:'DIFÍCIL · RELACIÓN',label:'Compras de esa persona',prompt:'¿Y qué compras lleva esa persona?',scenario,person:pn,oracle:languageLedger({action:'query|reference',domain:'purchases',entity:pn})});
        await add({group:'DIFÍCIL · RELACIÓN',label:'Otros eventos',prompt:'¿En qué otros eventos aparece?',scenario,person:pn,oracle:pp?{kind:'person-events',person:pn,data:pp}:null});
        await add({group:'DIFÍCIL · RELACIÓN',label:'Cambiar persona conservando tarea',prompt:`Haz lo mismo con ${pn2}.`,scenario,person:pn2,oracle:languageLedger({action:'reference|query',entity:pn2})});
        await add({group:'DIFÍCIL · RELACIÓN',label:'Comparar personas',prompt:'Compárame a los dos solo por lo que realmente conste en ControlEvent.',scenario,oracle:languageLedger({action:'local|reference|query',operations:['compare']})});
      }
    }
  }

  if(level==='EXTREME'){
    // 16 bloques de 5 turnos = 80. Intencionadamente descubre huecos: que falle aquí es información.
    for(let block=0;block<16&&out.length<profile.count;block++){
      const en=eName(block),en2=eName(block+3),pn=pName(block),pn2=pName(block+3),scenario=`LANG EXTREMA ${String(block+1).padStart(2,'0')}`,type=block%8;
      if(type===0){
        await add({group:'EXTREMA · CRUCE',label:'Asistencia vs pagos',prompt:`De ${en}, sácame quién va a asistir pero todavía no ha pagado, en una sola tabla.`,scenario,event:en,oracle:languageLedger({action:'query',event:en,operations:['filter']})});
        await add({group:'EXTREMA · CRUCE',label:'Añadir situación',prompt:'Añade la situación de ingreso y ordénalos por importe pendiente.',scenario,event:en,oracle:languageLedger({action:'local|query',operations:['add_field','sort']})});
        await add({group:'EXTREMA · CRUCE',label:'Excluir pareja',prompt:'Si hay alguna pareja, quítala pero conserva individualmente a quien sí proceda.',scenario,event:en,oracle:languageLedger({action:'local|query',operations:['filter']})});
        await add({group:'EXTREMA · CRUCE',label:'Resumen cuantificado',prompt:'¿Cuántas personas quedan y cuánto dinero falta por cobrar entre ellas?',scenario,event:en,oracle:languageLedger({action:'local|reference|query'})});
        await add({group:'EXTREMA · CRUCE',label:'Gráfica del subconjunto',prompt:'Representa ese subconjunto de la forma más útil.',scenario,event:en,oracle:languageLedger({action:'local|reference|query',chart:true})});
      }else if(type===1){
        await add({group:'EXTREMA · DERIVACIÓN',label:'Coste por asistente',prompt:`Calcula el coste real de compras por asistente de ${en}.`,scenario,event:en,oracle:languageLedger({action:'query',event:en})});
        await add({group:'EXTREMA · DERIVACIÓN',label:'Comparar coste por asistente',prompt:`Compáralo con ${en2} y dime cuál fue más eficiente por persona.`,scenario,events:[en,en2],oracle:languageLedger({action:'query|reference',operations:['compare']})});
        await add({group:'EXTREMA · DERIVACIÓN',label:'Descomponer diferencia',prompt:'Explícame qué partidas explican principalmente esa diferencia.',scenario,events:[en,en2],oracle:languageLedger({action:'reference|query'})});
        await add({group:'EXTREMA · DERIVACIÓN',label:'Sensibilidad',prompt:'Si al primero hubieran ido dos personas más, ¿cambiaría el ganador?',scenario,events:[en,en2],oracle:languageLedger({action:'local|reference|query'})});
        await add({group:'EXTREMA · DERIVACIÓN',label:'Gráfico comparativo',prompt:'Haz una gráfica que deje clara esa conclusión.',scenario,events:[en,en2],oracle:languageLedger({action:'local|reference|query',chart:true})});
      }else if(type===2){
        await add({group:'EXTREMA · ANOMALÍAS',label:'Buscar anomalías',prompt:`Busca cosas raras en ${en}: importes, asistencia, documentos, compras o banco que merezcan que yo las revise.`,scenario,event:en,oracle:languageLedger({action:'query',event:en})});
        await add({group:'EXTREMA · ANOMALÍAS',label:'Priorizar anomalías',prompt:'Ordénamelas por riesgo de que haya un error real.',scenario,event:en,oracle:languageLedger({action:'local|reference',operations:['sort']})});
        await add({group:'EXTREMA · ANOMALÍAS',label:'Acreditar',prompt:'Para la primera, dime exactamente qué dato de CE te hace sospechar.',scenario,event:en,oracle:languageLedger({action:'reference|inspect|query'})});
        await add({group:'EXTREMA · ANOMALÍAS',label:'Contrastar otro evento',prompt:`Mira si en ${en2} aparece el mismo patrón.`,scenario,event:en2,oracle:languageLedger({action:'query|reference',event:en2})});
        await add({group:'EXTREMA · ANOMALÍAS',label:'Conclusión prudente',prompt:'Concluye sin inventarte causas que no estén en los datos.',scenario,oracle:languageLedger({action:'reference|inspect|query'})});
      }else if(type===3){
        await add({group:'EXTREMA · PLAN',label:'Plan de ahorro',prompt:`En ${en}, proponme cómo ahorrar un 10% de las compras pendientes sin tocar lo ya comprado.`,scenario,event:en,oracle:languageLedger({action:'query',domain:'purchases',event:en})});
        await add({group:'EXTREMA · PLAN',label:'Conservar categorías',prompt:'Intenta que el recorte no elimine por completo ninguna categoría de producto.',scenario,event:en,oracle:languageLedger({action:'local|reference|query'})});
        await add({group:'EXTREMA · PLAN',label:'Responsables',prompt:'Dime a qué responsables afectaría ese plan.',scenario,event:en,oracle:languageLedger({action:'reference|query',domain:'purchases'})});
        await add({group:'EXTREMA · PLAN',label:'Escenario alternativo',prompt:'Haz ahora otro plan priorizando el menor número de cambios posibles.',scenario,event:en,oracle:languageLedger({action:'reference|query'})});
        await add({group:'EXTREMA · PLAN',label:'Comparar planes',prompt:'Compara ambos planes y recomienda uno explicando el criterio.',scenario,event:en,oracle:languageLedger({action:'local|reference',operations:['compare']})});
      }else if(type===4){
        await add({group:'EXTREMA · MULTIENTIDAD',label:'Dos personas y dos eventos',prompt:`Compara la actividad de ${pn} y ${pn2} en ${en} y ${en2}; separa hechos directos de registros compartidos.`,scenario,events:[en,en2],oracle:languageLedger({action:'query',operations:['compare']})});
        await add({group:'EXTREMA · MULTIENTIDAD',label:'Solo responsabilidades',prompt:'Ahora ignora ingresos compartidos y quédate solo con responsabilidades operativas reales.',scenario,oracle:languageLedger({action:'local|reference|query',operations:['filter']})});
        await add({group:'EXTREMA · MULTIENTIDAD',label:'Ranking',prompt:'¿Quién de los dos carga con más responsabilidad económica?',scenario,oracle:languageLedger({action:'local|query',operations:['rank'],responseKind:'who'})});
        await add({group:'EXTREMA · MULTIENTIDAD',label:'Explicar evidencia',prompt:'Justifica la respuesta con las filas que la sostienen.',scenario,oracle:languageLedger({action:'reference|inspect|query'})});
        await add({group:'EXTREMA · MULTIENTIDAD',label:'Cambiar métrica',prompt:'Y si en vez de dinero miro número de tareas, ¿cambia la conclusión?',scenario,oracle:languageLedger({action:'local|reference|query'})});
      }else if(type===5){
        await add({group:'EXTREMA · LENGUAJE ABIERTO',label:'Petición libre',prompt:`Zuzu, méteme mano a ${en} y cuéntame lo que de verdad merezca la pena mirar, no me hagas un inventario.`,scenario,event:en,oracle:languageLedger({action:'query',event:en})});
        await add({group:'EXTREMA · LENGUAJE ABIERTO',label:'Profundizar sin campo',prompt:'Eso primero que has dicho, destrípamelo un poco.',scenario,oracle:languageLedger({action:'reference|query|inspect'})});
        await add({group:'EXTREMA · LENGUAJE ABIERTO',label:'Cambio implícito',prompt:`Ahora haz exactamente el mismo análisis con ${en2}.`,scenario,event:en2,oracle:languageLedger({action:'reference|query',event:en2})});
        await add({group:'EXTREMA · LENGUAJE ABIERTO',label:'Diferencias relevantes',prompt:'No me enumeres todo: dime solo en qué cambian de verdad.',scenario,events:[en,en2],oracle:languageLedger({action:'local|reference|query',operations:['compare']})});
        await add({group:'EXTREMA · LENGUAJE ABIERTO',label:'Resumen oral',prompt:'Y cuéntamelo como si estuviéramos hablando, en medio minuto.',scenario,oracle:languageLedger({action:'reference|inspect'})});
      }else if(type===6){
        await add({group:'EXTREMA · DOCUMENTAL',label:'Cruce evidencias',prompt:`En ${en}, localiza movimientos económicos que deberían tener evidencia documental y dime cuáles parecen peor cubiertos.`,scenario,event:en,oracle:languageLedger({action:'query',event:en})});
        await add({group:'EXTREMA · DOCUMENTAL',label:'Separar tipos',prompt:'Sepáralos entre ingresos, compras y banco.',scenario,event:en,oracle:languageLedger({action:'local|reference|query'})});
        await add({group:'EXTREMA · DOCUMENTAL',label:'Solo faltantes',prompt:'Déjame solo los que tengan algo pendiente de justificar.',scenario,event:en,oracle:languageLedger({action:'local|query',operations:['filter']})});
        await add({group:'EXTREMA · DOCUMENTAL',label:'Ordenar cuantía',prompt:'Ordénalos por importe de mayor a menor.',scenario,event:en,oracle:languageLedger({action:'local|query',operations:['sort']})});
        await add({group:'EXTREMA · DOCUMENTAL',label:'Preparar revisión',prompt:'Hazme una lista corta de revisión, sin modificar ningún dato.',scenario,event:en,oracle:languageLedger({action:'reference|inspect|query'})});
      }else{
        await add({group:'EXTREMA · META-CONTEXTO',label:'Cadena inicial',prompt:`Empieza con ${en}: compras, asistencia y banco, pero solo lo esencial.`,scenario,event:en,oracle:languageLedger({action:'query',event:en})});
        await add({group:'EXTREMA · META-CONTEXTO',label:'Foco parcial',prompt:'Quédate con lo segundo que me has contado y olvida visualmente lo demás, no el contexto.',scenario,oracle:languageLedger({action:'reference|local|inspect'})});
        await add({group:'EXTREMA · META-CONTEXTO',label:'Cambio persona',prompt:`Relaciona eso con ${pn}, si hay datos reales que lo permitan.`,scenario,person:pn,oracle:languageLedger({action:'query|reference',entity:pn})});
        await add({group:'EXTREMA · META-CONTEXTO',label:'Retomar primer foco',prompt:'Vuelve al primer punto de los tres del inicio y amplíalo.',scenario,event:en,oracle:languageLedger({action:'reference|query'})});
        await add({group:'EXTREMA · META-CONTEXTO',label:'Resumen de decisiones',prompt:'Resume qué decisiones de foco has ido tomando para responderme, sin enseñarme código interno.',scenario,oracle:languageLedger({action:'inspect',responseKind:'conversation_summary'})});
      }
    }
  }

  // El contrato exige el tamaño exacto. Si faltan entidades en una instalación pequeña,
  // rellenamos con preguntas de resumen sobre los eventos disponibles; nunca inventamos datos.
  while(out.length<profile.count){
    const en=eName(out.length),eo=await eventData(en),n=out.length;
    out.push(languageCase({level,index:n,group:`${profile.label} · COBERTURA`,label:'Cobertura de reserva',prompt:`Dame un resumen verificable de ${en} y no añadas nada que no conste en ControlEvent.`,scenario:`LANG ${profile.label} RESERVA ${n+1}`,event:en,oracle:eo?{kind:'event-summary',event:en,data:eo}:null}));
  }
  return out.slice(0,profile.count);
}

export async function previewZuzuLanguageBattery({level='BASIC',seed}={}){
  const state=await getItvState(),normalizedLevel=normalizeLanguageLevel(level),normalizedSeed=['GOLDEN','GOLDEN_DIALOGUE'].includes(normalizedLevel)?(normalizedLevel==='GOLDEN'?0x117110:0x200014):normalizeSeed(seed),profile=LANGUAGE_REACH_PROFILES[normalizedLevel],cases=await buildLanguageReachCases(state,normalizedLevel,normalizedSeed),golden=normalizedLevel==='GOLDEN',goldenDialogue=normalizedLevel==='GOLDEN_DIALOGUE',dialogue=normalizedLevel==='DIALOGUE';
  return{ok:true,replayContractVersion:4,source:'language',batteryCode:golden?'GOLDEN-P117-110':goldenDialogue?'GOLDEN-DIALOG-P2-14':dialogue?'DIALOGUE-P2-24':`LANG-${normalizedLevel}-${profile.count}`,languageProfile:{...profile,goldenFixed:golden||goldenDialogue},generatedAt:nowIso(),seed:normalizedSeed,dataCounts:batteryDataCounts(state),tests:{FAST:0,'AI-SMOKE':0,'FULL-CERT':cases.length},cases:{FAST:[],'AI-SMOKE':[],'FULL-CERT':cases.map(c=>publicBatteryCase(c,'FULL-CERT'))},estimated:{'FULL-CERT':{turns:cases.length,costEurRange:`hasta ~${(profile.count*(dialogue?0.05:0.025)).toFixed(2).replace('.',',')} € según modelo/tokens`,hardCapSuggested:round(profile.count*(dialogue?0.05:0.025),2)}},notes:[golden?'GOLDEN 110: prompts y escenarios congelados desde P1.17; los oráculos se recalculan con el estado actual de CE.':goldenDialogue?'GOLDEN DIÁLOGO 14: conversación fija P2; mismas frases y mismo orden para comparar versiones sin cambiar de carretera.':dialogue?'DIÁLOGO P2: solo el primer mensaje es semilla; los siguientes los genera un usuario sintético leyendo la respuesta real y los artefactos visibles de Zuzu.':`Batería de alcance ${profile.label}: ${profile.count} preguntas.`,`Expectativa de partida: ${profile.expectedBand}.`,profile.description,'NHC: estas frases viven exclusivamente en ITV; no añaden reglas lingüísticas al runtime de Zuzu.',dialogue?'Cada turno adaptativo usa dos papeles IA separados: Zuzu + simulador ITV. Sus llamadas y costes se informan por separado.':'FULL-CERT ejecuta expresamente el motor VNext y conserva el historial visible dentro de cada escenario.','P2 separa coste/llamadas de Zuzu del simulador de laboratorio.']};
}

async function buildAiSmokeCases(state,max=40,seed=1){
  const {events,withPurchases,sibling}=chooseEvents(state,seed),{sample:people}=choosePeople(state,seed),cases=[];
  const add=c=>{if(!trim(c?.expected))c.expected=expectedOracleText(c?.oracle)||(trim(c?.expectedEvent)?`Evento: ${trim(c.expectedEvent)}`:arr(c?.expectedEvents).length?`Eventos: ${arr(c.expectedEvents).join(' ↔ ')}`:trim(c?.expectedPerson)?`Persona: ${trim(c.expectedPerson)}`:'Regla/invariante satisfecha');if(cases.length<max)cases.push(c);};
  const eventSample=events.slice(0,Math.min(4,events.length));
  eventSample.forEach((e,i)=>{const name=eventName(e),prompt=variant(TPL.event,seed,`smoke-event-${i}`,{event:name});add({id:`ai-event-${i}-${key(e.id)}`,group:'EVENTOS',label:`IA identifica evento · ${name}`,prompt,expectedEvent:name,event:name,validate:r=>resultHasEvent(r,name)});});
  withPurchases.slice(0,Math.min(4,withPurchases.length)).forEach((e,i)=>{const name=eventName(e),prompt=variant(TPL.purchases,seed,`smoke-purchase-${i}`,{event:name});add({id:`ai-purchases-${i}-${key(e.id)}`,group:'COMPRAS',label:`IA selecciona compras · ${name}`,prompt,expectedEvent:name,event:name,validate:r=>resultHasEvent(r,name) && arr(r?.meta?.tools).some(t=>/event_(?:breakdowns|purchase_lines|dossier)/.test(t))});});

  // Catálogos generales: la semilla rota qué maestros se preguntan, pero el oráculo conoce el recuento real.
  const catalogLabels={events:'eventos',people:'personas',products:'productos',stores:'tiendas'};
  shuffled(Object.keys(catalogLabels),seed,'smoke-catalogs').slice(0,2).forEach((entity,i)=>{const o=catalogOracle(state,entity);add({id:`ai-catalog-${entity}`,group:'TABLAS GENERALES',label:`IA consulta catálogo · ${catalogLabels[entity]}`,prompt:variant(TPL.catalog,seed,`smoke-catalog-${i}`,{entity:catalogLabels[entity]}),oracle:{kind:'catalog-count',...o},expected:expectedOracleText({kind:'catalog-count',...o}),validate:r=>arr(r?.meta?.tools).some(t=>/master_catalog|events_catalog/.test(t))||new RegExp(`\\b${o.count}\\b`).test(resultBlob(r))});});
  const overview=await eventsOverviewOracle(state);if(overview)add({id:'ai-events-overview',group:'TABLAS GENERALES',label:'IA consulta panorama global de eventos',prompt:variant(TPL.overview,seed,'smoke-overview'),oracle:{kind:'events-overview',count:overview.count},validate:r=>arr(r?.meta?.tools).includes('events_overview')||arr(r?.tables).length>0});
  const pa=await peopleActivityOracle(state);if(pa)add({id:'ai-people-activity',group:'TABLAS GENERALES',label:'IA consulta actividad global de personas',prompt:variant(TPL.peopleActivity,seed,'smoke-people-activity'),oracle:{kind:'people-activity',count:pa.count},validate:r=>arr(r?.meta?.tools).includes('people_activity')||arr(r?.tables).length>0});
  const socios=await canonicalSociosOracle(state);if(socios)add({id:'ai-canonical-socios',group:'TABLAS GENERALES',label:'IA consulta socios canónicos',prompt:variant(TPL.socios,seed,'smoke-socios'),oracle:{kind:'canonical-socios',records:socios.records,people:socios.people},validate:r=>arr(r?.meta?.tools).includes('canonical_socios')||arr(r?.tables).length>0});
  const store=pick(arr(state?.tiendas).filter(s=>trim(s?.nombre)),seed,'smoke-store');if(store){const so=await storePurchasesOracle(state,trim(store.nombre));if(so)add({id:`ai-store-${key(store?.id||store?.nombre)}`,group:'TIENDAS',label:`IA consulta compras de tienda · ${so.store}`,prompt:variant(TPL.storePurchases,seed,'smoke-store-prompt',{store:so.store}),oracle:{kind:'store-purchases',...so},validate:r=>arr(r?.meta?.tools).includes('store_purchases')||arr(r?.tables).length>0});}
  if(people[0]){const pn=personName(people[0]),po=await participationOracle(state,pn);if(po)add({id:`ai-participation-${key(people[0]?.id||pn)}`,group:'PERSONAS',label:`IA consulta eventos de participación · ${pn}`,prompt:variant(TPL.participation,seed,'smoke-participation',{person:pn}),person:pn,oracle:{kind:'participation-events',...po},validate:r=>arr(r?.meta?.tools).some(t=>/participation_events|person_dossier/.test(t))||arr(r?.tables).length>0});}

  // Documentación/TKxx/justificantes: elegimos reproduciblemente un evento con la mayor evidencia encontrada entre una muestra real.
  let docPick=null;
  for(const e of shuffled(events,seed,'smoke-doc-events').slice(0,Math.min(6,events.length))){const d=await documentationOracle(state,eventName(e));if(!d)continue;const score=d.incomeRecords+d.tickets+d.documents+d.incomeWithReceipt+d.ticketsWithImage+d.documentsWithAttachment;if(!docPick||score>docPick.score)docPick={e,d,score};}
  if(docPick){const en=eventName(docPick.e),d=docPick.d;
    add({id:`ai-docs-${key(docPick.e.id)}`,group:'DOCUMENTOS',label:`IA revisa documentación · ${en}`,prompt:variant(TPL.documentation,seed,'smoke-doc-summary',{event:en}),event:en,oracle:{kind:'documentation',event:en,data:d}});
    add({id:`ai-receipts-${key(docPick.e.id)}`,group:'JUSTIFICANTES',label:`IA revisa justificantes de ingresos · ${en}`,prompt:variant(TPL.receipts,seed,'smoke-receipts',{event:en}),event:en,oracle:{kind:'documentation-field',event:en,label:'justificantes de ingreso',value:d.incomeWithReceipt}});
    add({id:`ai-tickets-${key(docPick.e.id)}`,group:'TKXX',label:`IA revisa TKxx/fototickets · ${en}`,prompt:variant(TPL.tickets,seed,'smoke-tickets',{event:en}),event:en,oracle:{kind:'documentation-field',event:en,label:'TKxx con imagen',value:d.ticketsWithImage}});
    const ticket=trim(pick(d.ticketRows.filter(r=>trim(r?.TKxx)),seed,'smoke-ticket-row')?.TKxx);if(ticket)add({id:`ai-ticket-detail-${key(docPick.e.id)}-${key(ticket)}`,group:'TKXX',label:`IA localiza ${ticket} · ${en}`,prompt:variant(TPL.ticketDetail,seed,'smoke-ticket-detail',{event:en,ticket}),event:en,oracle:{kind:'ticket-detail',event:en,ticket}});
  }

  if(events[0]){const en=eventName(events[0]),eo=await eventOracle(state,en);if(eo)add({id:`ai-attendance-${key(events[0].id)}`,group:'ASISTENCIA',label:`IA consulta asistencia · ${en}`,prompt:variant(TPL.attendance,seed,'smoke-attendance',{event:en}),event:en,oracle:{kind:'attendance',event:en,data:attendanceOracle(eo,en)}});}
  if(events[1]){const en=eventName(events[1]),eo=await eventOracle(state,en);if(eo){add({id:`ai-incomes-${key(events[1].id)}`,group:'INGRESOS',label:`IA consulta ingresos · ${en}`,prompt:variant(TPL.incomes,seed,'smoke-incomes',{event:en}),event:en,oracle:{kind:'event-metric',event:en,label:'ingresos',value:eo.income}});add({id:`ai-pending-${key(events[1].id)}`,group:'COMPRAS',label:`IA consulta Pte.Compra · ${en}`,prompt:variant(TPL.pendingPurchases,seed,'smoke-pending',{event:en}),event:en,oracle:{kind:'event-metric',event:en,label:'compras pendientes',value:eo.pending}});}}

  const donationEvents=events.filter(e=>donationCountForEvent(state,trim(e.id))>0);
  if(donationEvents.length){const e=pick(donationEvents,seed,'smoke-donation-event'),en=eventName(e),d=await donationOracle(state,en);if(d)add({id:`ai-donations-${key(e.id)}`,group:'DONACIONES',label:`IA consulta donaciones · ${en}`,prompt:variant(TPL.donations,seed,'smoke-donations',{event:en}),event:en,oracle:{kind:'donations',event:en,data:d}});}

  const managementEvents=events.filter(e=>arr(state?.hitos).some(h=>eventIdOf(h)===trim(e.id))||arr(state?.lgs).some(l=>eventIdOf(l)===trim(e.id)));
  if(managementEvents.length){const e=pick(managementEvents,seed,'smoke-management-event'),en=eventName(e),m=await managementOracle(state,en);if(m)add({id:`ai-management-${key(e.id)}`,group:'HITOS/LG',label:`IA consulta gestión · ${en}`,prompt:variant(TPL.management,seed,'smoke-management',{event:en}),event:en,oracle:{kind:'management',event:en,data:m}});}

  // Banco vive en tablas separadas. Priorizamos un evento con Cuadre Banco explícito.
  // Si la muestra no tiene ninguno, probamos una ausencia segura sin reconstruir el histórico.
  let bankPick=null;
  for(const e of shuffled(events,seed,'smoke-bank-events').slice(0,Math.min(6,events.length))){const b=await bankOracle(state,eventName(e));if(!b)continue;if(!bankPick)bankPick={e,b};if(b.hasReconciliation){bankPick={e,b};break;}}
  if(bankPick){const en=eventName(bankPick.e);add({id:`ai-bank-${key(bankPick.e.id)}`,group:'BANCO',label:`IA consulta Cuadre Banco · ${en}`,prompt:variant(TPL.bank,seed,'smoke-bank',{event:en}),event:en,oracle:{kind:'bank-summary',event:en,data:bankPick.b}});}
  if(bankPick?.b?.hasReconciliation&&bankPick?.b?.hasData){const en=eventName(bankPick.e),bt=await bankTimelineOracle(state,en);if(bt)add({id:`ai-bank-timeline-${key(bankPick.e.id)}`,group:'BANCO',label:`IA consulta cronología bancaria · ${en}`,prompt:variant(TPL.bankTimeline,seed,'smoke-bank-timeline',{event:en}),event:en,oracle:{kind:'bank-timeline',...bt},validate:r=>arr(r?.meta?.tools).some(t=>/event_bank(?:_timeline)?/.test(t))||arr(r?.tables).length>0});}

  if(sibling.length>=2){const a=sibling[0],b=sibling[1],an=eventName(a),bn=eventName(b);add({id:`ai-compare-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:'IA conserva dos eventos parecidos',prompt:variant(TPL.compare,seed,'smoke-compare-family',{a:an,b:bn}),expectedEvents:[an,bn],events:[an,bn],validate:r=>[an,bn].every(n=>resultHasEvent(r,n)) || /compare_events/.test(arr(r?.meta?.tools).join(' '))});}
  if(events.length>=2){const a=events[0],b=events.find(x=>trim(x.id)!==trim(a.id));if(b){const an=eventName(a),bn=eventName(b);add({id:`ai-compare-mixed-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:'IA compara dos eventos distintos',prompt:variant(TPL.compare,seed,'smoke-compare-mixed',{a:an,b:bn}),expectedEvents:[an,bn],events:[an,bn],validate:r=>[an,bn].every(n=>resultHasEvent(r,n)) || /compare_events/.test(arr(r?.meta?.tools).join(' '))});}}
  people.slice(0,Math.min(4,people.length)).forEach((p,i)=>{const name=personName(p),prompt=variant(TPL.person,seed,`smoke-person-${i}`,{person:name});add({id:`ai-person-${i}-${key(p.id)}`,group:'PERSONAS',label:`IA identifica persona · ${name}`,prompt,expectedPerson:name,person:name,validate:r=>resultHasPerson(r,name)});});
  if(events[0]){const name=eventName(events[0]);add({id:'ai-nondeducible-consumption',group:'SEGURIDAD',label:'IA no inventa consumo individual',prompt:variant(TPL.consumption,seed,'smoke-consumption',{event:name}),event:name,requireAnswer:true,validate:r=>/no (?:registra|puede|se puede)|no.*deduc|no.*acredit|no.*saber|no.*determinar/i.test(text(r?.answer)) || /Dato no deducible/i.test(text(r?.title))});}
  const fakeWord=variant(['Lunar','Boreal','Marciano','Orbital','Fantasma','Imposible'],seed,'smoke-fake-word'),fake=`Autotest ${fakeWord} Inexistente ${2090+(normalizeSeed(seed)%10)} ${String((normalizeSeed(seed)*17)%997).padStart(3,'0')}`;
  add({id:'ai-nonexistent-event',group:'SEGURIDAD',label:'IA no inventa evento inexistente',prompt:variant(TPL.nonexistent,seed,'smoke-fake-prompt',{fake}),expected:'Debe negar que exista sin fijarlo como evento real',validate:r=>{const answer=text(r?.answer),denied=/(?:no\s+(?:lo\s+)?(?:encuentro|existe|figura|consta)|no\s+(?:he\s+)?encontrad[oa]\b[^.]{0,100}(?:evento|llamad)|no\s+se\s+(?:encuentra|localiza)|no\s+est[aá]\s+registrad[oa]|no\s+tengo[^.]{0,100}(?:registro|constancia)|ning[uú]n\s+evento[^.]{0,100}(?:coincid|parec|registr))/i.test(answer);const fakeWasCanonical=resultContextEvents(r).some(x=>norm(x)===norm(fake));return denied&&!fakeWasCanonical;}});
  return cases.slice(0,max);
}

async function buildFullCertScenarios(state,maxTurns=100,seed=1){
  const {events,withPurchases,withPendingPurchases,sibling}=chooseEvents(state,seed),{sample:people}=choosePeople(state,seed); const sc=[];
  if(events.length>=2){const a=events[0],b=events.find(x=>trim(x.id)!==trim(a.id));if(b){const an=eventName(a),bn=eventName(b),ao=await eventOracle(state,an),bo=await eventOracle(state,bn);sc.push({name:'Cambio de evento',turns:[
    {prompt:variant(TPL.event,seed,'full-event-a',{event:an}),event:an,oracle:{kind:'event-summary',event:an,data:ao}},
    {prompt:variant(TPL.economyFollow,seed,'full-economy-a'),event:an,oracle:{kind:'event-economy',event:an,data:ao}},
    {prompt:variant(TPL.switchEvent,seed,'full-switch-b',{event:bn}),event:bn,oracle:{kind:'event-summary',event:bn,data:bo}},
    {prompt:variant(TPL.highlightFollow,seed,'full-highlight-b'),event:bn,oracle:{kind:'event-summary',event:bn,data:bo}}
  ]});}}
  if(sibling.length>=2){const a=sibling[0],b=sibling[1],an=eventName(a),bn=eventName(b),cmp=await comparisonOracle(state,[an,bn]);sc.push({name:'Comparación persistente',turns:[
    {prompt:variant(TPL.compare,seed,'full-compare',{a:an,b:bn}),events:[an,bn],oracle:{kind:'comparison',compare:cmp}},
    {prompt:variant(TPL.compareIncomeFollow,seed,'full-compare-income'),events:[an,bn],oracle:{kind:'compare-metric',compare:cmp,metric:'income'}},
    {prompt:variant(TPL.comparePurchasesFollow,seed,'full-compare-purchases'),events:[an,bn],oracle:{kind:'compare-metric',compare:cmp,metric:'purchases'}}
  ]});
  const byYear=[a,b].slice().sort((x,y)=>Number(yearOf(eventName(x)))-Number(yearOf(eventName(y))));const first=byYear[0],second=byYear[1],y=yearOf(eventName(second));sc.push({name:'Referencia temporal relativa',turns:[
    {prompt:variant(TPL.event,seed,'full-relative-start',{event:eventName(first)}),event:eventName(first),oracle:{kind:'event-summary',event:eventName(first),data:await eventOracle(state,eventName(first))}},
    {prompt:variant(TPL.relativeNext,seed,'full-relative-next',{year:y}),event:eventName(second),oracle:{kind:'event-summary',event:eventName(second),data:await eventOracle(state,eventName(second))}}
  ]});}
  if(withPendingPurchases[0]){const e=withPendingPurchases[0],en=eventName(e),po=pendingPurchaseOracle(state,en);sc.push({name:'Z1 · Compra → máximo → responsable → sus otras cosas',turns:[
    {prompt:`Dime las compras pendientes de ${en}.`,event:en,oracle:{kind:'purchase-set',...(po||{event:en,total:0,productCount:0,status:'pending'})}},
    {prompt:variant(TPL.maxFollow,seed,'full-max'),event:en,oracle:{kind:'purchase-max',event:en,row:po?.max||null}},
    {prompt:variant(TPL.responsibleFollow,seed,'full-responsible'),event:en,expected:'Debe conservar como sujeto la fila seleccionada en el turno anterior y responder su responsable, no listar personas del evento.'},
    {prompt:variant(TPL.samePersonOtherThings,seed,'full-same-person'),event:en,expected:'Debe conservar a esa persona como responsable y consultar sus otras compras; no debe saltar a asistencia/personas generales.'}
  ]});}
  if(people.length>=2){const p1=people[0],p2=people[1],n1=personName(p1),n2=personName(p2),p1o=await personOracle(state,n1),p2o=await personOracle(state,n2);sc.push({name:'Cambio de persona',turns:[
    {prompt:variant(TPL.person,seed,'full-person-1',{person:n1}),person:n1,oracle:{kind:'person-summary',person:n1,data:p1o}},
    {prompt:variant(TPL.eventsPersonFollow,seed,'full-person-events'),person:n1,oracle:{kind:'person-events',person:n1,data:p1o}},
    {prompt:variant(TPL.switchPerson,seed,'full-person-switch',{person:n2}),person:n2,oracle:{kind:'person-summary',person:n2,data:p2o}},
    {prompt:variant(TPL.incomePersonFollow,seed,'full-person-income'),person:n2,oracle:{kind:'person-income',person:n2,total:p2o?.income||0,known:!!p2o}}
  ]});
  if(events[0]){const en=eventName(events[0]),rel=await personOracle(state,n1,en),related=!!(rel&&(rel.eventCount>0||Math.abs(rel.income)>0||Math.abs(rel.purchases)>0||Math.abs(rel.donations)>0||rel.purchaseRecords>0||rel.donationRecords>0||rel.hitos>0||rel.lg>0));sc.push({name:'Cruce persona y evento',turns:[
    {prompt:variant(TPL.event,seed,'full-cross-event',{event:en}),event:en,oracle:{kind:'event-summary',event:en,data:await eventOracle(state,en)}},
    {prompt:variant(TPL.person,seed,'full-cross-person',{person:n1}),person:n1,oracle:{kind:'person-summary',person:n1,data:p1o}},
    {prompt:variant(TPL.relationFollow,seed,'full-cross-relation'),event:en,person:n1,oracle:{kind:'person-relation',event:en,person:n1,related,known:!!rel,data:rel}}
  ]});}}

  // Documentos, justificantes y TKxx en una misma conversación para probar continuidad documental.
  let docPick=null;
  for(const e of shuffled(events,seed,'full-doc-events').slice(0,Math.min(8,events.length))){const d=await documentationOracle(state,eventName(e));if(!d)continue;const score=d.incomeRecords+d.tickets+d.documents+d.incomeWithReceipt+d.ticketsWithImage+d.documentsWithAttachment;if(!docPick||score>docPick.score)docPick={e,d,score};}
  if(docPick){const en=eventName(docPick.e),d=docPick.d,turns=[
    {prompt:variant(TPL.documentation,seed,'full-doc-summary',{event:en}),event:en,oracle:{kind:'documentation',event:en,data:d}},
    {prompt:variant(TPL.receipts,seed,'full-doc-receipts',{event:en}),event:en,oracle:{kind:'documentation-field',event:en,label:'justificantes de ingreso',value:d.incomeWithReceipt}},
    {prompt:variant(TPL.ticketsFollow,seed,'full-doc-tickets'),event:en,oracle:{kind:'documentation-field',event:en,label:'TKxx con imagen',value:d.ticketsWithImage}},
    {prompt:variant(TPL.docsFollow,seed,'full-doc-documents'),event:en,oracle:{kind:'documentation-field',event:en,label:'documentos con adjunto',value:d.documentsWithAttachment}}
  ];const ticket=trim(pick(d.ticketRows.filter(r=>trim(r?.TKxx)),seed,'full-doc-ticket')?.TKxx);if(ticket)turns.push({prompt:variant(TPL.ticketDetail,seed,'full-doc-ticket-detail',{event:en,ticket}),event:en,oracle:{kind:'ticket-detail',event:en,ticket}});sc.push({name:'Documentos, justificantes y TKxx',turns});}

  const donationEvents=events.filter(e=>donationCountForEvent(state,trim(e.id))>0);
  if(donationEvents.length){
    let chosen=null;
    for(const e of shuffled(donationEvents,seed,'full-donation-event')){const d=await donationOracle(state,eventName(e));if(!d)continue;if(!chosen)chosen={e,d};if(num(d.supposed)+num(d.committed)>0){chosen={e,d};break;}}
    if(chosen){const e=chosen.e,en=eventName(e),d=chosen.d,pendingRows=arr(d.lineRows).filter(r=>['supuesta','comprometida'].includes(norm(r?.['Situación entrega']||r?.Situacion||r?.situacion))),pendingResponsibles=[...new Set(pendingRows.flatMap(r=>[trim(r?.Responsable),trim(r?.Donante)]).filter(Boolean))],pendingRecords=num(d.supposed)+num(d.committed),pendingValue=round(num(d.supposedValue)+num(d.committedValue),2);sc.push({name:'Z1 · Donaciones → no recibidas → responsables → entregadas',turns:[
      {prompt:variant(TPL.donations,seed,'full-donations',{event:en}),event:en,oracle:{kind:'donations',event:en,data:d}},
      {prompt:variant(TPL.donationMissingPhysical,seed,'full-donations-missing'),event:en,oracle:{kind:'donation-status',event:en,statuses:['Supuesta','Comprometida'],records:pendingRecords,total:pendingValue}},
      {prompt:'¿Quién se encarga de esas?',event:en,oracle:{kind:'donation-status',event:en,statuses:['Supuesta','Comprometida'],records:pendingRecords,total:pendingValue,requireResponsible:true,responsibles:pendingResponsibles}},
      {prompt:variant(TPL.donationDelivered,seed,'full-donations-delivered'),event:en,oracle:{kind:'donation-status',event:en,statuses:['Entregada'],records:num(d.delivered),total:round(d.deliveredValue,2)}}
    ]});}
  }

  const mgEvents=events.filter(e=>arr(state?.hitos).some(h=>eventIdOf(h)===trim(e.id))||arr(state?.lgs).some(l=>eventIdOf(l)===trim(e.id)));
  if(mgEvents.length){const e=pick(mgEvents,seed,'full-management-event'),en=eventName(e),m=await managementOracle(state,en);if(m)sc.push({name:'Hitos y LG',turns:[
    {prompt:variant(TPL.management,seed,'full-management',{event:en}),event:en,oracle:{kind:'management',event:en,data:m}},
    {prompt:variant(TPL.managementFollow,seed,'full-management-follow'),event:en,oracle:{kind:'management',event:en,data:m}}
  ]});}

  if(events[1]){const en=eventName(events[1]),eo=await eventOracle(state,en);if(eo)sc.push({name:'Asistencia',turns:[
    {prompt:variant(TPL.attendance,seed,'full-attendance',{event:en}),event:en,oracle:{kind:'attendance',event:en,data:attendanceOracle(eo,en)}},
    {prompt:variant(TPL.attendanceFollow,seed,'full-attendance-follow'),event:en,oracle:{kind:'attendance',event:en,data:attendanceOracle(eo,en)}}
  ]});}

  let bankPick=null;
  for(const e of shuffled(events,seed,'full-bank-events').slice(0,Math.min(7,events.length))){const b=await bankOracle(state,eventName(e));if(!b)continue;if(!bankPick)bankPick={e,b};if(b.hasReconciliation){bankPick={e,b};break;}}
  if(bankPick){const en=eventName(bankPick.e);sc.push({name:'Cuadre Banco',turns:[
    {prompt:variant(TPL.bank,seed,'full-bank',{event:en}),event:en,oracle:{kind:'bank-summary',event:en,data:bankPick.b}},
    {prompt:variant(TPL.bankFollow,seed,'full-bank-follow'),event:en,oracle:{kind:'bank-summary',event:en,data:bankPick.b}}
  ]});}

  const catalogLabels={events:'eventos',people:'personas',products:'productos',stores:'tiendas'};
  const ce=pick(Object.keys(catalogLabels),seed,'full-catalog')||'events',co=catalogOracle(state,ce);sc.push({name:'Tablas generales',turns:[{prompt:variant(TPL.catalog,seed,'full-catalog-prompt',{entity:catalogLabels[ce]}),oracle:{kind:'catalog-count',...co}}]});

  const ov=await eventsOverviewOracle(state);if(ov)sc.push({name:'Panorama global',turns:[{prompt:variant(TPL.overview,seed,'full-overview'),oracle:{kind:'events-overview',count:ov.count}}]});
  const fullStore=pick(arr(state?.tiendas).filter(s=>trim(s?.nombre)),seed,'full-store');if(fullStore){const so=await storePurchasesOracle(state,trim(fullStore.nombre));if(so)sc.push({name:'Tienda entre eventos',turns:[{prompt:variant(TPL.storePurchases,seed,'full-store-prompt',{store:so.store}),oracle:{kind:'store-purchases',...so}}]});}

  // Z1H · Cobertura conversacional de TODOS los eventos reales. FAST ya recorre además todas las
  // personas y valida los catálogos completos; aquí cada evento tiene al menos una continuación
  // elíptica real para que la ITV detecte saltos de foco sin hacer la batería manualmente.
  for(const e of events){
    const en=eventName(e),eo=await eventOracle(state,en);if(!eo)continue;
    const turns=[{prompt:`Háblame de ${en}.`,event:en,oracle:{kind:'event-summary',event:en,data:eo}}];
    if(donationCountForEvent(state,trim(e.id))>0){const d=await donationOracle(state,en);turns.push({prompt:'¿Y de donaciones?',event:en,oracle:{kind:'donations',event:en,data:d}});}
    else if(arr(state?.compras).some(r=>eventIdOf(r)===trim(e.id)&&!isDonationTicketLocal(ticketTextLocal(r)))){const po=purchaseOracle(state,en);turns.push({prompt:'¿Y de compras?',event:en,oracle:{kind:'purchase-presence',event:en,productCount:num(po?.productCount),total:round(po?.total,2)}});}
    else turns.push({prompt:'¿Y económicamente cómo quedó?',event:en,oracle:{kind:'event-economy',event:en,data:eo}});
    sc.push({name:`Z1 TODOS · ${en}`,turns});
  }

  const out=[]; for(const s of sc){for(const t of s.turns){if(out.length>=maxTurns)break;const expected=expectedOracleText(t.oracle)||(t.event?`Evento: ${t.event}`:arr(t.events).length?`Eventos: ${t.events.join(' ↔ ')}`:t.person?`Persona: ${t.person}`:'Regla/invariante satisfecha');out.push({...t,expected,scenario:s.name,id:`full-${out.length+1}-${key(s.name)}-${normalizeSeed(seed).toString(36).slice(-4)}`});} if(out.length>=maxTurns)break;}
  return out;
}


const BATTERY_RUNTIME_CACHE=new Map();
const BATTERY_RUNTIME_TTL_MS=20*60*1000;
function batteryRuntimeGet(rawSeed){
  const seed=normalizeSeed(rawSeed),hit=BATTERY_RUNTIME_CACHE.get(seed);
  if(!hit)return null;
  if(Date.now()-hit.at>BATTERY_RUNTIME_TTL_MS){BATTERY_RUNTIME_CACHE.delete(seed);return null;}
  return hit.blueprint;
}
function batteryRuntimeSet(blueprint){
  if(!blueprint?.seed)return;
  BATTERY_RUNTIME_CACHE.set(normalizeSeed(blueprint.seed),{at:Date.now(),blueprint});
  if(BATTERY_RUNTIME_CACHE.size>8){
    const oldest=[...BATTERY_RUNTIME_CACHE.entries()].sort((a,b)=>a[1].at-b[1].at).slice(0,BATTERY_RUNTIME_CACHE.size-8);
    for(const [key] of oldest)BATTERY_RUNTIME_CACHE.delete(key);
  }
}

function batteryDataCounts(state){
  return{events:arr(state?.eventos).length,people:arr(state?.personas).length,products:arr(state?.productos).length,stores:arr(state?.tiendas).length,purchases:arr(state?.compras).length,incomes:arr(state?.colaboradores).length,documents:arr(state?.eventDocuments).length,ticketImages:Object.keys(state?.ticketImages||{}).length,donationLines:arr(state?.compras).filter(r=>isDonationTicketLocal(ticketTextLocal(r))).length,hitos:arr(state?.hitos).length,lgs:arr(state?.lgs).length,bankMovements:arr(state?.bankMovements||state?.movimientosBanco||state?.movimientos_banco).length};
}
async function buildCasesForMode(state,mode,rawSeed){
  const seed=normalizeSeed(rawSeed),m=trim(mode).toUpperCase();
  if(m==='FAST')return{seed,cases:await buildRealFastCases(state,seed)};
  if(m==='AI-SMOKE')return{seed,cases:await buildAiSmokeCases(state,48,seed)};
  if(m==='FULL-CERT')return{seed,cases:await buildFullCertScenarios(state,100,seed)};
  throw new Error(`Modo ITV no soportado: ${mode}`);
}
async function batteryBlueprint(state,rawSeed){
  const seed=normalizeSeed(rawSeed);
  const fast=await buildRealFastCases(state,seed); const smoke=await buildAiSmokeCases(state,48,seed); const full=await buildFullCertScenarios(state,100,seed);
  return {seed,counts:batteryDataCounts(state),fast,smoke,full};
}

export async function previewZuzuBattery({seed}={}){
  const state=await getItvState(); const b=await batteryBlueprint(state,seed);batteryRuntimeSet(b);
  return {ok:true,replayContractVersion:2,generatedAt:nowIso(),seed:b.seed,source:'ControlEvent · tablas reales · solo lectura',dataCounts:b.counts,tests:{FAST:b.fast.length,'AI-SMOKE':b.smoke.length,'FULL-CERT':b.full.length},cases:{'AI-SMOKE':b.smoke.map(c=>publicBatteryCase(c,'AI-SMOKE')),'FULL-CERT':b.full.map(c=>publicBatteryCase(c,'FULL-CERT'))},estimated:{'AI-SMOKE':{cases:Math.min(36,b.smoke.length),costEurRange:'0,08–0,35 €',hardCapSuggested:0.35},'FULL-CERT':{turns:Math.min(100,b.full.length),costEurRange:'según nº de casos',hardCapSuggested:1.50}},notes:[`Semilla reproducible de batería: ${b.seed}.`,'La semilla elige tanto las filas reales como la variante lingüística de cada familia de preguntas.','FAST usa datos reales y 0 llamadas IA.','AI-SMOKE cubre eventos, compras, tablas generales, asistencia, donaciones, documentos, justificantes, TKxx/fototickets, Hitos/LG, Banco, personas, comparaciones y seguridad.','FULL-CERT incorpora Z1 HUMANIDAD/CONTINUIDAD, oráculo factual activo y métricas de latencia/llamadas/tokens por turno.','El histórico v2 guarda el contrato exacto de cada pregunta para poder repetir literalmente una batería aunque cambien las plantillas futuras.','Banco solo se informa como Cuadre Banco cuando existe configuración/evidencia explícita del evento; el histórico general nunca se reconstruye como cuadre. Ningún modo modifica datos de producción.']};
}

function streamWrite(send,type,payload={}){ send({type,at:nowIso(),...payload}); }
function filterCases(cases,ids){ if(!arr(ids).length)return cases; const s=new Set(arr(ids).map(String)); return cases.filter(c=>s.has(String(c.id))); }

function timedCaseController(parentSignal, timeoutMs){
  const controller=new AbortController(); let timedOut=false;
  const abortFromParent=()=>controller.abort();
  if(parentSignal?.aborted)controller.abort(); else parentSignal?.addEventListener?.('abort',abortFromParent,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},Math.max(5000,Number(timeoutMs)||60000));
  return{signal:controller.signal,timedOut:()=>timedOut,cleanup(){clearTimeout(timer);parentSignal?.removeEventListener?.('abort',abortFromParent);}};
}
async function runTimedAiCase({caseDef,send,parentSignal,index,total,timeoutMs,task}){
  const guard=timedCaseController(parentSignal,timeoutMs),started=Date.now();
  streamWrite(send,'case_start',{case:{id:caseDef.id,group:caseDef.group,label:caseDef.label,prompt:caseDef.prompt||''},index,total,timeoutMs});
  const heartbeat=setInterval(()=>streamWrite(send,'heartbeat',{caseId:caseDef.id,index,total,elapsedMs:Date.now()-started,timeoutMs}),2500);
  let hardTimer=null;
  const taskPromise=Promise.resolve().then(()=>task(guard.signal)).then(value=>({kind:'value',value}),error=>({kind:'error',error}));
  const hardTimeout=new Promise(resolve=>{hardTimer=setTimeout(()=>resolve({kind:'timeout'}),Math.max(5100,Number(timeoutMs)||60000)+150);});
  try{
    const winner=await Promise.race([taskPromise,hardTimeout]);
    if(winner?.kind==='timeout') return {error:new Error(`Tiempo máximo de ${Math.round((Number(timeoutMs)||60000)/1000)} s superado.`),timedOut:true};
    if(winner?.kind==='error') return {error:winner.error,timedOut:guard.timedOut()};
    return {value:winner?.value,timedOut:false};
  } finally { if(hardTimer)clearTimeout(hardTimer);clearInterval(heartbeat);guard.cleanup(); }
}

async function runFast({state,cases,send,signal}){
  const total=cases.length; let ok=0,warn=0,ko=0,done=0; const failures=[],timeoutMs=Math.max(5000,Math.min(30000,Number(process.env.CONTROLEVENT_ZUZU_TEST_FAST_TIMEOUT_MS)||15000));
  for(let i=0;i<cases.length;i++){
    const c=cases[i];if(signal?.aborted)break; const t0=Date.now(); let r,timer=null,heartbeat=null;
    streamWrite(send,'case_start',{case:{id:c.id,group:c.group,label:c.label,prompt:c.prompt||''},index:i+1,total,timeoutMs});
    heartbeat=setInterval(()=>streamWrite(send,'heartbeat',{caseId:c.id,index:i+1,total,elapsedMs:Date.now()-t0,timeoutMs}),2500);
    try{
      const task=Promise.resolve().then(()=>c.run.call(c)).then(value=>({kind:'value',value}),error=>({kind:'error',error}));
      const timeout=new Promise(resolve=>{timer=setTimeout(()=>resolve({kind:'timeout'}),timeoutMs);});
      const got=await Promise.race([task,timeout]);
      if(got.kind==='timeout')r=outcome(c,'KO',`TIMEOUT FAST: ${Math.round(timeoutMs/1000)} s. Se abandona este caso y la batería continúa.`,{timeout:true});
      else if(got.kind==='error')r=outcome(c,'KO',got.error?.message||String(got.error));
      else r=got.value;
    }finally{if(timer)clearTimeout(timer);if(heartbeat)clearInterval(heartbeat);}
    r.durationMs=Date.now()-t0; done++; if(r.status==='OK')ok++; else if(r.status==='WARN')warn++; else{ko++;failures.push(r);} streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100}});
  }
  return {done,total,ok,warn,ko,failures,costEur:0,calls:0,tokens:0,aborted:!!signal?.aborted,caseTimeoutMs:timeoutMs};
}

async function runSmoke({state,cases,send,signal,actor={},maxCostEur=0.25,maxCases=24}){
  const selected=cases.slice(0,Math.max(1,Math.min(80,Number(maxCases)||24))), total=selected.length; let ok=0,warn=0,ko=0,done=0,costEur=0,calls=0,tokens=0; const failures=[];
  const timeoutMs=Math.max(30000,Math.min(120000,Number(process.env.CONTROLEVENT_ZUZU_TEST_SMOKE_TIMEOUT_MS)||38000));
  for(let i=0;i<selected.length;i++){
    const c=selected[i]; if(signal?.aborted)break;
    const reserve=0.012; if(costEur>0 && costEur+reserve>maxCostEur){streamWrite(send,'budget',{message:`Presupuesto protegido: no se inicia otra prueba porque quedan menos de ${reserve.toFixed(3)} € de margen.`,costEur});break;}
    const t0=Date.now(); let r;
    const timed=await runTimedAiCase({caseDef:c,send,parentSignal:signal,index:i+1,total,timeoutMs,task:async externalSignal=>{
      const result=await runZuzuUserTurn({prompt:c.prompt,stateOverride:state,usuarioLogado:actor,conversationId:'',conversationHistory:[],conversationTurnNumber:1,externalSignal});
      return result;
    }});
    if(signal?.aborted)break;
    if(timed.timedOut){
      costEur=round(costEur+reserve,6);calls+=1;
      r=technicalErrorOutcome(c,`TIEMPO MÁXIMO: la prueba superó ${Math.round(timeoutMs/1000)} s.`,{calls:1,tokens:0,costEur:reserve},{timeout:true});
    }else if(timed.error){
      r=technicalErrorOutcome(c,timed.error?.message||String(timed.error),{});
    }else{
      const result=timed.value,u=usageOf(result);costEur=round(costEur+u.costEur,6);calls+=u.calls;tokens+=u.tokens;
      r=observedOutcome(c,result,u);
    }
    r.durationMs=Date.now()-t0;done++;if(r.status==='OBSERVED'||r.status==='OK')ok++;else if(r.status==='WARN')warn++;else{ko++;failures.push(r);}streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100,costEur,calls,tokens}});
    if(costEur>=maxCostEur){streamWrite(send,'budget',{message:'Se ha alcanzado el presupuesto máximo configurado.',costEur});break;}
  }
  return {done,total,ok,warn,ko,failures,costEur,calls,tokens,aborted:!!signal?.aborted,caseTimeoutMs:timeoutMs};
}

async function runFull({state,turns,send,signal,actor={},maxCostEur=0.50,maxCases=18}){
  const selected=turns.slice(0,Math.max(1,Math.min(100,Number(maxCases)||18))),total=selected.length;let ok=0,warn=0,ko=0,done=0,costEur=0,calls=0,tokens=0;const failures=[];
  const timeoutMs=Math.max(45000,Math.min(150000,Number(process.env.CONTROLEVENT_ZUZU_TEST_FULL_TIMEOUT_MS)||42000));
  let previousInteractionId='',history=[],activeScenario='',conversationId='';
  for(let i=0;i<selected.length;i++){
    const c=selected[i]; if(signal?.aborted)break;
    if(activeScenario && trim(c.scenario)!==activeScenario){ previousInteractionId=''; history=[]; conversationId=''; }
    activeScenario=trim(c.scenario);
    const reserve=0.015;if(costEur>0&&costEur+reserve>maxCostEur){streamWrite(send,'budget',{message:`Presupuesto protegido: no se inicia otro turno porque quedan menos de ${reserve.toFixed(3)} € de margen.`,costEur});break;}
    const t0=Date.now();let r;
    const timed=await runTimedAiCase({caseDef:c,send,parentSignal:signal,index:i+1,total,timeoutMs,task:async externalSignal=>runZuzuUserTurn({prompt:c.prompt,stateOverride:state,usuarioLogado:actor,conversationId,previousInteractionId,conversationHistory:history.slice(-8),conversationTurnNumber:history.length+1,externalSignal})});
    if(signal?.aborted)break;
    if(timed.timedOut){
      costEur=round(costEur+reserve,6);calls+=1;previousInteractionId='';conversationId='';
      r=technicalErrorOutcome(c,`TIEMPO MÁXIMO: este turno superó ${Math.round(timeoutMs/1000)} s.`,{calls:1,tokens:0,costEur:reserve},{scenario:c.scenario,timeout:true});
    }else if(timed.error){r=technicalErrorOutcome(c,timed.error?.message||String(timed.error),{},{scenario:c.scenario});previousInteractionId='';conversationId='';}
    else{
      const result=timed.value,u=usageOf(result);costEur=round(costEur+u.costEur,6);calls+=u.calls;tokens+=u.tokens;
      r=observedOutcome(c,result,u,{scenario:c.scenario});
      previousInteractionId=trim(result?.interactionId||result?.meta?.interactionId||'');
      conversationId=trim(result?.conversationId||result?.meta?.conversationId||conversationId);
      history.push({user:c.prompt,assistant:trim(result?.answer).slice(0,1200),assistantTail:trim(result?.answer).slice(-900),title:trim(result?.title),provider:trim(result?.provider),selectedEventId:'',pendingAction:result?.meta?.pendingAction||null,resultContext:result?.meta?.resultContext||null});
    }
    r.durationMs=Date.now()-t0;done++;if(r.status==='OBSERVED'||r.status==='OK')ok++;else if(r.status==='WARN')warn++;else{ko++;failures.push(r);}streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100,costEur,calls,tokens}});
    if(costEur>=maxCostEur){streamWrite(send,'budget',{message:'Se ha alcanzado el presupuesto máximo configurado.',costEur});break;}
  }
  return {done,total,ok,warn,ko,failures,costEur,calls,tokens,aborted:!!signal?.aborted,caseTimeoutMs:timeoutMs};
}


function safeConversationState(raw={}){
  return {conversationId:trim(raw?.conversationId).slice(0,160),previousInteractionId:trim(raw?.previousInteractionId).slice(0,500),scenario:trim(raw?.scenario).slice(0,160),history:arr(raw?.history).slice(-30).map(h=>({user:trim(h?.user).slice(0,1600),assistant:trim(h?.assistant).slice(0,1200),assistantTail:trim(h?.assistantTail).slice(0,900),title:trim(h?.title).slice(0,240),provider:trim(h?.provider).slice(0,120),selectedEventId:trim(h?.selectedEventId).slice(0,160),pendingAction:h?.pendingAction||null,resultContext:h?.resultContext||null})),dialogueNext:raw?.dialogueNext&&typeof raw.dialogueNext==='object'?raw.dialogueNext:null,dialogueMission:trim(raw?.dialogueMission).slice(0,3000),dialogueTurn:num(raw?.dialogueTurn)};
}

export async function runZuzuTestCase({mode='AI-SMOKE',caseId='',conversationState={},seed,signal,actor={}}={}){
  const m=trim(mode).toUpperCase();
  if(!['AI-SMOKE','FULL-CERT'].includes(m)){const e=new Error('run-case solo admite AI-SMOKE o FULL-CERT.');e.status=400;throw e;}
  const state=await getItvState(),cached=batteryRuntimeGet(seed);
  const all=cached?(m==='AI-SMOKE'?cached.smoke:cached.full):(await buildCasesForMode(state,m,seed)).cases;
  const c=all.find(x=>trim(x.id)===trim(caseId));
  if(!c){const e=new Error('Caso de ITV no encontrado en la batería actual. Actualiza datos y batería.');e.status=404;throw e;}
  if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
  const started=Date.now(),reserve=m==='AI-SMOKE'?0.012:0.015,timeoutMs=m==='AI-SMOKE'?Math.max(20000,Math.min(45000,Number(process.env.CONTROLEVENT_ZUZU_TEST_SMOKE_TIMEOUT_MS)||38000)):Math.max(25000,Math.min(48000,Number(process.env.CONTROLEVENT_ZUZU_TEST_FULL_TIMEOUT_MS)||42000));
  let r,nextConversationState=null;
  if(m==='AI-SMOKE'){
    const timed=await runTimedAiCase({caseDef:c,send:()=>{},parentSignal:signal,index:1,total:1,timeoutMs,task:externalSignal=>runItvPaidTurn({caseDef:c,state,actor,conversationState:{},signal:externalSignal,fullCert:false})});
    if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
    if(timed.timedOut) r=technicalErrorOutcome(c,`TIEMPO MÁXIMO: el caso superó ${Math.round(timeoutMs/1000)} s.`,{calls:1,tokens:0,costEur:reserve},{timeout:true});
    else if(timed.error) r=technicalErrorOutcome(c,timed.error?.message||String(timed.error),{calls:1,tokens:0,costEur:reserve});
    else {const result=timed.value,u=usageOf(result);r=observedOutcome(c,result,u);}
  } else {
    let cs=safeConversationState(conversationState);
    if(cs.scenario!==trim(c.scenario)) cs={conversationId:'',previousInteractionId:'',history:[],scenario:trim(c.scenario)};
    const timed=await runTimedAiCase({caseDef:c,send:()=>{},parentSignal:signal,index:1,total:1,timeoutMs,task:externalSignal=>runZuzuUserTurn({prompt:c.prompt,stateOverride:state,usuarioLogado:actor,conversationId:cs.conversationId,previousInteractionId:cs.previousInteractionId,conversationHistory:cs.history,conversationTurnNumber:cs.history.length+1,externalSignal})});
    if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
    if(timed.timedOut){r=technicalErrorOutcome(c,`TIEMPO MÁXIMO: este turno superó ${Math.round(timeoutMs/1000)} s.`,{calls:1,tokens:0,costEur:reserve},{scenario:c.scenario,timeout:true});nextConversationState={conversationId:'',previousInteractionId:'',history:[],scenario:trim(c.scenario)};}
    else if(timed.error){r=technicalErrorOutcome(c,timed.error?.message||String(timed.error),{calls:1,tokens:0,costEur:reserve},{scenario:c.scenario});nextConversationState={conversationId:'',previousInteractionId:'',history:[],scenario:trim(c.scenario)};}
    else {
      const result=timed.value,u=usageOf(result);
      r=observedOutcome(c,result,u,{scenario:c.scenario});
      const hist=cs.history.slice(-7);hist.push({user:c.prompt,assistant:trim(result?.answer).slice(0,1200),assistantTail:trim(result?.answer).slice(-900),title:trim(result?.title),provider:trim(result?.provider),selectedEventId:'',pendingAction:result?.meta?.pendingAction||null,resultContext:result?.meta?.resultContext||null});
      nextConversationState={conversationId:trim(result?.conversationId||result?.meta?.conversationId||cs.conversationId).slice(0,160),previousInteractionId:trim(result?.interactionId||result?.meta?.interactionId||'').slice(0,500),history:hist,scenario:trim(c.scenario)};
    }
  }
  r.durationMs=Date.now()-started;
  return {ok:true,mode:m,case:r,conversationState:nextConversationState,timeoutMs};
}

function p2GoldenDialogueAssessment(caseDef={},result={}){
  const d=caseDef?.dialogue||{};if(d?.fixed!==true)return null;
  const calls=arr(result?.meta?.capabilityCalls),tools=arr(result?.meta?.tools).map(trim).filter(Boolean),reasons=[],wantedTool=trim(d.expectedTool),wantedOps=arr(d.expectedOperations).map(trim).filter(Boolean),wantedActions=arr(d.expectedActions).map(trim).filter(Boolean);
  if(d.requiresTool===true&&!tools.length)reasons.push('el turno fijo requería una acción factual y no hubo tool');
  if(wantedTool&&!tools.includes(wantedTool))reasons.push(`tool esperada ${wantedTool}; observadas ${tools.join(', ')||'ninguna'}`);
  if(wantedOps.length){const got=[...new Set(calls.filter(x=>trim(x?.tool)==='query_ce'&&!trim(x?.error)).map(x=>trim(x?.effectiveOperation||x?.normalizedArgs?.operation||x?.rawArgs?.operation)).filter(Boolean))];if(!got.some(x=>wantedOps.includes(x)))reasons.push(`operación esperada ${wantedOps.join('|')}; observadas ${got.join('|')||'ninguna'}`);}
  if(wantedActions.length){const got=[...new Set(calls.filter(x=>trim(x?.tool)==='recall_memory'&&!trim(x?.error)).map(x=>trim(x?.normalizedArgs?.action||x?.rawArgs?.action)).filter(Boolean))];if(!got.some(x=>wantedActions.includes(x)))reasons.push(`acción de memoria esperada ${wantedActions.join('|')}; observadas ${got.join('|')||'ninguna'}`);}
  const coherent=!reasons.length;return{previous_coherent:coherent,focus_preserved:coherent,empty_promise:false,note:coherent?'GOLDEN fija: capacidad estructural esperada ejecutada.':reasons.join(' · '),reasons};
}

async function runItvPaidTurn({caseDef,state,actor,conversationState,signal,fullCert=false}){
  const useVNext=trim(caseDef?.engine).toUpperCase()==='VNEXT';
  const cs=fullCert?safeConversationState(conversationState):{conversationId:'',previousInteractionId:'',history:[],scenario:''};
  const common={prompt:caseDef.prompt,stateOverride:state,usuarioLogado:actor,conversationHistory:fullCert?cs.history:[],conversationTurnNumber:fullCert?cs.history.length+1:1,externalSignal:signal};
  if(useVNext){
    return runZuzuVNextUserTurn({...common,conversationId:'',previousInteractionId:fullCert?cs.previousInteractionId:''});
  }
  return runZuzuUserTurn({...common,conversationId:fullCert?cs.conversationId:'',previousInteractionId:fullCert?cs.previousInteractionId:''});
}

export async function runSavedZuzuTestCase({mode='AI-SMOKE',savedCase={},conversationState={},signal,actor={}}={}){
  const m=trim(mode||savedCase?.mode).toUpperCase();
  if(!['AI-SMOKE','FULL-CERT'].includes(m)){const e=new Error('La repetición histórica solo admite AI-SMOKE o FULL-CERT.');e.status=400;throw e;}
  let c=restoredHistoricalCase(savedCase,m);if(!c.id||!c.prompt){const e=new Error('La batería histórica no contiene una pregunta ejecutable.');e.status=422;throw e;}
  const state=await getItvState();if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
  const started=Date.now(),reserve=m==='AI-SMOKE'?0.012:0.015,timeoutMs=m==='AI-SMOKE'?Math.max(20000,Math.min(45000,Number(process.env.CONTROLEVENT_ZUZU_TEST_SMOKE_TIMEOUT_MS)||38000)):Math.max(25000,Math.min(48000,Number(process.env.CONTROLEVENT_ZUZU_TEST_FULL_TIMEOUT_MS)||42000));
  let r,nextConversationState=null;
  if(m==='AI-SMOKE'){
    const timed=await runTimedAiCase({caseDef:c,send:()=>{},parentSignal:signal,index:1,total:1,timeoutMs,task:externalSignal=>runZuzuUserTurn({prompt:c.prompt,stateOverride:state,usuarioLogado:actor,conversationId:'',conversationHistory:[],conversationTurnNumber:1,externalSignal})});
    if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
    if(timed.timedOut)r=technicalErrorOutcome(c,`TIEMPO MÁXIMO: el caso histórico superó ${Math.round(timeoutMs/1000)} s.`,{calls:1,tokens:0,costEur:reserve},{timeout:true,historicalExact:true});
    else if(timed.error)r=technicalErrorOutcome(c,timed.error?.message||String(timed.error),{calls:1,tokens:0,costEur:reserve},{historicalExact:true});
    else{const result=timed.value,u=usageOf(result);r=observedOutcome(c,result,u,{historicalExact:true});}
  }else{
    let cs=safeConversationState(conversationState);if(cs.scenario!==trim(c.scenario))cs={conversationId:'',previousInteractionId:'',history:[],scenario:trim(c.scenario),dialogueNext:null,dialogueMission:'',dialogueTurn:0};
    const adaptive=c?.dialogue?.adaptive===true,mission=trim(c?.dialogue?.mission)||trim(cs.dialogueMission),turnNo=num(c?.dialogue?.turn)||cs.history.length+1;let userMove={utterance:c.prompt,requiresTool:turnNo===1,changeFocus:turnNo===1,move:'memory_action',target:'inicio de misión'};
    if(adaptive&&turnNo>1){if(cs.dialogueNext&&trim(cs.dialogueNext.utterance))userMove=cs.dialogueNext;else userMove=await generateZuzuItvDialogueUserTurn({mission,conversationHistory:cs.history,turnNumber:turnNo,seed:c?.dialogue?.seed||'',externalSignal:signal});c={...c,prompt:trim(userMove.utterance)||c.prompt};}
    const timed=await runTimedAiCase({caseDef:c,send:()=>{},parentSignal:signal,index:1,total:1,timeoutMs,task:externalSignal=>runItvPaidTurn({caseDef:c,state,actor,conversationState:cs,signal:externalSignal,fullCert:true})});
    if(signal?.aborted){const e=new Error('Prueba cancelada.');e.name='AbortError';e.status=499;throw e;}
    if(timed.timedOut){r=technicalErrorOutcome(c,`TIEMPO MÁXIMO: este turno histórico superó ${Math.round(timeoutMs/1000)} s.`,{calls:1,tokens:0,costEur:reserve},{scenario:c.scenario,timeout:true,historicalExact:true});nextConversationState={conversationId:'',previousInteractionId:'',history:[],scenario:trim(c.scenario),dialogueNext:null,dialogueMission:mission,dialogueTurn:turnNo};}
    else if(timed.error){r=technicalErrorOutcome(c,timed.error?.message||String(timed.error),{calls:1,tokens:0,costEur:reserve},{scenario:c.scenario});nextConversationState={conversationId:'',previousInteractionId:'',history:[],scenario:trim(c.scenario),dialogueNext:null,dialogueMission:mission,dialogueTurn:turnNo};}
    else{
      const result=timed.value,u=usageOf(result),zuzuMs=num(result?.meta?.performance?.totalMs);r=observedOutcome(c,result,u,{scenario:c.scenario,historicalExact:true});const presentationEvidence=p124PresentationEvidence(result),hist=cs.history.slice(-29);hist.push({user:c.prompt,assistant:trim(result?.answer).slice(0,1200),assistantTail:trim(result?.answer).slice(-900),title:trim(result?.title),provider:trim(result?.provider),selectedEventId:'',pendingAction:result?.meta?.pendingAction||null,resultContext:result?.meta?.resultContext||null,presentationEvidence,tools:arr(result?.meta?.tools)});let next=null,simulatorMs=0,simulatorUsage={};
      if(adaptive){next=await generateZuzuItvDialogueUserTurn({mission,conversationHistory:hist,turnNumber:turnNo+1,seed:c?.dialogue?.seed||'',externalSignal:signal});simulatorMs=num(next?.durationMs);simulatorUsage=next?.usage||{};const assess=p126DialogueArtifactGuard(userMove,result,p124NormalizeDialogueAssessment(next?.assessment||{},result)),reasons=[];next={...next,assessment:assess};if(assess.empty_promise===true)reasons.push('promesa vacía: Zuzu anunció acción pero no la ejecutó');if(assess.previous_coherent===false)reasons.push(trim(assess.note)||'el usuario sintético detecta respuesta incoherente con el hilo');if(assess.focus_preserved===false&&userMove?.changeFocus!==true)reasons.push('pérdida de foco/objeto activo');if(userMove?.requiresTool===true&&!arr(result?.meta?.tools).length)reasons.push('el movimiento requería acción factual y no hubo tool');if(reasons.length){r.status='KO';r.functionalStatus='KO';r.functionalReasons=[...arr(r.functionalReasons),...reasons];r.validationReasons=[...arr(r.validationReasons),...reasons];}r.dialogue={turn:turnNo,userMove:{move:userMove?.move,requiresTool:userMove?.requiresTool===true,changeFocus:userMove?.changeFocus===true,target:trim(userMove?.target)},assessment:assess,nextUtterance:trim(next?.utterance),mission};}
      else if(c?.dialogue?.fixed===true){const assess=p2GoldenDialogueAssessment(c,result),reasons=arr(assess?.reasons);if(reasons.length){r.status='KO';r.functionalStatus='KO';r.functionalReasons=[...arr(r.functionalReasons),...reasons];r.validationReasons=[...arr(r.validationReasons),...reasons];}r.dialogue={turn:turnNo,userMove:{move:'golden_fixed',requiresTool:c?.dialogue?.requiresTool===true,changeFocus:c?.dialogue?.changeFocus===true,target:''},assessment:assess,nextUtterance:'',mission:'GOLDEN DIÁLOGO P2 · carretera fija'};}
      if(adaptive||c?.dialogue?.fixed===true){r.zuzuUsage={...u};r.simulatorUsage={...simulatorUsage};r.presentationEvidence=presentationEvidence;r.labUsage={calls:num(u.calls)+num(simulatorUsage.calls),tokens:num(u.tokens)+num(simulatorUsage.totalTokens||simulatorUsage.tokens),costEur:round(num(u.costEur)+num(simulatorUsage.costEurApprox||simulatorUsage.costEur),6),zuzuCalls:num(u.calls),simulatorCalls:num(simulatorUsage.calls),zuzuTokens:num(u.tokens),simulatorTokens:num(simulatorUsage.totalTokens||simulatorUsage.tokens),zuzuCostEur:round(num(u.costEur),6),simulatorCostEur:round(num(simulatorUsage.costEurApprox||simulatorUsage.costEur),6)};r.usage={...u};}
      r.dialogueRuntime={zuzuMs:zuzuMs||num(r?.performance?.totalMs),simulatorMs,wallMs:0,decisionModelMs:num(result?.meta?.performance?.decisionModelMs),dataMs:num(result?.meta?.performance?.dataMs),narrationMs:num(result?.meta?.performance?.narrationModelMs),zuzuCalls:num(u?.calls),simulatorCalls:num(simulatorUsage?.calls),presentationTables:num(presentationEvidence?.tableCount),presentationCharts:num(presentationEvidence?.chartCount)};
      nextConversationState={conversationId:trim(result?.conversationId||result?.meta?.conversationId||cs.conversationId).slice(0,160),previousInteractionId:(result?.meta?.resetInteractionId===true?'':trim(result?.interactionId||result?.meta?.interactionId||'').slice(0,500)),history:hist,scenario:trim(c.scenario),dialogueNext:next,dialogueMission:mission,dialogueTurn:turnNo};
    }
  }
  r.durationMs=Date.now()-started;if(r?.dialogueRuntime)r.dialogueRuntime={...r.dialogueRuntime,wallMs:r.durationMs};return{ok:true,mode:m,case:r,conversationState:nextConversationState,timeoutMs,historicalExact:true};
}

export async function runZuzuTestStream({mode='FAST',maxCostEur=0.25,maxCases,caseIds,seed,send,signal,actor={}}){
  const m=trim(mode).toUpperCase(),normalizedSeed=normalizeSeed(seed);
  // La primera línea sale ANTES de reconstruir casos/oráculos: el usuario ve respuesta inmediata
  // al pulsar INICIAR y el watchdog no confunde preparación con bloqueo.
  streamWrite(send,'preparing',{mode:m,seed:normalizedSeed,message:`${m}: preparando casos de este modo…`});
  const state=await getItvState(),cached=batteryRuntimeGet(normalizedSeed);
  const built=cached?{seed:cached.seed,cases:m==='AI-SMOKE'?cached.smoke:m==='FULL-CERT'?cached.full:cached.fast}:await buildCasesForMode(state,m,normalizedSeed);
  const selected=filterCases(built.cases,caseIds);
  streamWrite(send,'start',{mode:m,seed:built.seed,dataCounts:cached?.counts||batteryDataCounts(state),total:selected.length,source:cached?'batería preparada · tablas reales de ControlEvent':'tablas reales de ControlEvent',maxCostEur:m==='FAST'?0:round(maxCostEur,2)});
  const result=m==='AI-SMOKE'?await runSmoke({state,cases:selected,send,signal,actor,maxCostEur:Math.max(0.02,num(maxCostEur)||0.25),maxCases:maxCases||24}):m==='FULL-CERT'?await runFull({state,turns:selected,send,signal,actor,maxCostEur:Math.max(0.02,num(maxCostEur)||0.50),maxCases:maxCases||18}):await runFast({state,cases:selected,send,signal});
  streamWrite(send,'summary',{mode:m,...result,finishedAt:nowIso(),certified:result.ko===0&&!result.aborted&&result.done===selected.length&&result.done>0,observationMode:m==='FAST'?false:'ORACLE_ACTIVE',oracleEnabled:true});
  return result;
}

// Solo para regresión automatizada del propio ITV: permite verificar que el semáforo
// distingue resultado correcto, advertencia conversacional y fallo real.
export function __validateZuzuItvCaseForRegression(caseDef={},result={}){return validatePaidCase(caseDef,result);}
export function __itvP116ForRegression(){return{itvCapabilityExpectation,itvObservedCapability,itvDecisionDiagnosis,vNextAuditOf,vNextTableRowsAsObjects,markScenarioCascade};}
export function __itvP117ForRegression(){return{itvCapabilityExpectation,itvObservedCapability,itvCapabilityCompatible,validateExpectedCapability,itvDecisionDiagnosis,vNextAuditOf,vNextTableRowsAsObjects,markScenarioCascade,validateOracle,validatePaidCase};}
export function __itvP118ForRegression(){return{itvCapabilityExpectation,itvObservedCapability,itvCapabilityCompatible,validateExpectedCapability,itvDecisionDiagnosis,vNextAuditOf,vNextTableRowsAsObjects,markScenarioCascade,validateOracle,validatePaidCase,goldenFixture};}
export function __itvP119ForRegression(){return{itvCapabilityExpectation,itvObservedCapability,itvCapabilityCompatible,validateExpectedCapability,itvDecisionDiagnosis,vNextAuditOf,vNextTableRowsAsObjects,markScenarioCascade,validateOracle,validatePaidCase,goldenFixture};}
