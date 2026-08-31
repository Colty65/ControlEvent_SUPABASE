/* ControlEvent v4_0_exp · VNext P1.19
   Registro + canonizador estructural de capacidades query_ce.
   NHC: describe/normaliza JSON y semántica de contratos; nunca interpreta frases del usuario. */
import crypto from 'node:crypto';
import { getSupabaseAdmin } from '../lib/supabase.js';

const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();
const arr=v=>Array.isArray(v)?v:[];

export const CAPABILITY_REGISTRY_VERSION='20260831-P119';

const P={
  operation:{type:'string'},
  event:{type:'string'},events:{type:'array',items:{type:'string'}},person:{type:'string'},store:{type:'string'},product:{type:'string'},ticket:{type:'string'},responsible:{type:'string'},
  scope:{type:'string',enum:['active_event','named_event','all_events']},
  status:{type:'string',enum:['pending','received','realized','all']},purchase_status:{type:'string',enum:['pending','realized','all']},population:{type:'string',enum:['socios','all']},attendance_mode:{type:'string',enum:['attendees','attending_members','attending_non_members','non_attending_members','attendance_full']},
  detail:{type:'string',enum:['brief','standard','full']},start_date:{type:'string'},end_date:{type:'string'},chart:{type:'boolean'},chart_type:{type:'string',enum:['line','bar','horizontalBar']},metric:{type:'string',enum:['all','purchases','income','donations','attendance']},
  tone:{type:'string',enum:['friendly','banter','neutral']},register:{type:'string',enum:['normal','close','banter']},tease:{type:'boolean'},narrate:{type:'boolean'},
  mine:{type:'boolean'},order_by:{type:'string',enum:['store_product','product','store','amount_desc']},store_filter_mode:{type:'string',enum:['all','include','exclude']},include_stores:{type:'array',items:{type:'string'}},exclude_stores:{type:'array',items:{type:'string'}},exclude_products:{type:'array',items:{type:'string'}},
  visible_columns:{type:'array',items:{type:'string'}},hidden_columns:{type:'array',items:{type:'string'}},view_filters:{type:'array',items:{type:'object',properties:{field:{type:'string'},operator:{type:'string',enum:['eq','neq','contains','not_contains']},value:{type:'string'}},required:['field','operator','value']}},view_sort:{type:'array',items:{type:'object',properties:{field:{type:'string'},direction:{type:'string',enum:['asc','desc']}},required:['field']}},reset_table:{type:'boolean'},
  income_delta:{type:'number'},scenario_people:{type:'array',items:{type:'string'}},plan:{type:'boolean'},plan_detail:{type:'boolean'},plan_focus:{type:'array',items:{type:'string'}},plan_target:{type:'number'},include_empty:{type:'boolean'},
  // Proyección de salida. No filtra el dataset.
  requested_fields:{type:'array',items:{type:'string'}},
  // Metadatos universales de contexto. No forman parte de la semántica empresarial del módulo.
  focus_mode:{type:'string',enum:['replace','add']},
  focus_type:{type:'string',enum:['event','person','multi_person','dataset']},
  focus_entities:{type:'array',items:{type:'string'}},
  // Lenguaje algebraico sobre datasets CE.
  derive_operation:{type:'string',enum:['SUM','COUNT','DISTINCT_COUNT','MAX','MIN','AVG','RANK','DIFFERENCE']},field:{type:'string'},derive_field:{type:'string'},label_field:{type:'string'},table_key:{type:'string'},top_n:{type:'integer'},
  source_operation:{type:'string'},source_args:{type:'object'}
};

const PRESENT=['detail','tone','register','tease','narrate'];
const META=['requested_fields','focus_mode','focus_type','focus_entities'];
const def=(module,required=[],optional=[],result='',guarded=[],defaults={})=>({module,required,optional:[...new Set([...optional,...PRESENT,...META])],result,guarded,defaults});

export const CAPABILITY_REGISTRY=Object.freeze({
  people_catalog:def('PERSONAS',[],['population'],'people_catalog'),
  events_catalog:def('EVENTOS',[],[],'events_catalog'),
  person_profile:def('PERSONAS',['person'],['event'],'person_dossier'),
  person_events:def('PERSONAS',['person'],[],'person_events'),
  person_income_status:def('INGRESOS',['person','event'],[],'person_income_status'),
  person_event_status:def('PERSONAS',['person','event'],[],'person_event_status'),
  event_income_status:def('INGRESOS',['event'],['status','population'],'income_status',[],{status:'pending',population:'all'}),
  event_income_lines:def('INGRESOS',['event'],[],'income_lines'),
  event_attendance:def('ASISTENCIA',['event'],['attendance_mode','scope'],'attendance',[],{attendance_mode:'attendees'}),
  event_summary:def('EVENTO',['event'],['scope'],'event_dossier'),
  event_scenario:def('ESCENARIOS',['event'],['income_delta','scenario_people','plan','plan_detail','plan_focus','plan_target','chart','chart_type'],'scenario'),
  // Sin status explícito, "compras" significa compras realizadas. all debe pedirse explícitamente.
  // top_n / derive_* son compatibilidad JSON y se canonizan a DERIVE cuando procede.
  event_purchases:def('COMPRAS',['event'],['purchase_status','status','responsible','mine','order_by','store_filter_mode','include_stores','exclude_stores','exclude_products','visible_columns','hidden_columns','view_filters','view_sort','reset_table','top_n','derive_operation','derive_field','field','label_field'],'purchase_dataset',[],{purchase_status:'realized',store_filter_mode:'all'}),
  event_donations:def('DONACIONES',['event'],['scope'],'donation_dataset'),
  event_bank:def('BANCO',['event'],['scope'],'bank_summary'),
  event_weather:def('TIEMPO',['event'],['start_date','end_date','chart','chart_type'],'weather'),
  event_stores_used:def('TIENDAS',['event'],[],'event_stores'),
  event_products:def('PRODUCTOS',['event'],[],'event_products'),
  compare_events:def('COMPARACION',['events'],['metric','chart','chart_type'],'comparison',[],{metric:'all'}),
  event_documentation:def('DOCUMENTOS',['event'],['scope'],'event_documentation'),
  event_management:def('GESTION',['event'],['scope'],'event_management'),
  store_purchases:def('TIENDAS',['store'],['event','scope','status','include_empty'],'store_purchases',[],{scope:'all_events',status:'realized'}),
  events_overview:def('EVENTOS',[],['scope','metric','chart','chart_type'],'events_overview',[],{metric:'all'}),
  derive:def('DERIVACION',['derive_operation'],['field','derive_field','label_field','table_key','top_n','source_operation','source_args'],'derived_dataset')
});

const OP_DESCRIPTIONS={
  event_management:'Gestión operativa del evento: Hitos y tareas LG. No es documentación ni justificantes.',
  event_documentation:'Estado estructurado del expediente: justificantes de ingresos, TKxx/imágenes, DOC/adjuntos y evidencias faltantes. No son Hitos/LG.',
  event_income_status:'Ingresos recibidos/pendientes de ingreso. No representa compras pendientes.',
  event_purchases:'Compras del evento. purchase_status=pending significa pendiente DE COMPRA; realized son compras ya realizadas; all incluye ambas.',
  compare_events:'Construye un dataset comparativo homogéneo entre dos o más eventos. Para decidir ganador/máximo/mínimo sobre ese dataset usa derive.',
  derive:'Calcula SUM/COUNT/DISTINCT_COUNT/MAX/MIN/AVG/RANK/DIFFERENCE sobre un dataset factual anterior o source_args explícito.',
  person_profile:'Dossier global de una identidad personal. Para ingreso global de una persona usa esta capacidad con requested_fields=[income].',
  person_income_status:'Estado de ingreso de una persona DENTRO de un evento concreto; requiere person + event.',
  events_overview:'Panorama homogéneo del conjunto de eventos; no necesita enumerar events.'
};

export function capabilityOperations(){return Object.keys(CAPABILITY_REGISTRY);}
export function capabilityDefinition(operation=''){return CAPABILITY_REGISTRY[trim(operation)]||null;}
export function queryCeSchemaProperties(){
  const props={};for(const [k,v] of Object.entries(P))props[k]=v;
  props.operation={type:'string',enum:capabilityOperations(),description:'Operación canónica de ControlEvent. Cada operation publica sus claves válidas y compatibilidades estructurales.'};
  return props;
}
function capabilityBranchSchema(operation=''){
  const d=capabilityDefinition(operation);if(!d)return null;
  const keys=[...new Set(['operation',...d.required,...d.optional])],properties={};
  for(const k of keys){if(k==='operation')properties.operation={type:'string',enum:[operation]};else if(P[k])properties[k]={...P[k]};}
  if(properties.mine)properties.mine={...properties.mine,description:'true solo cuando el objetivo estructurado sea limitar las compras al usuario actual.'};
  if(properties.responsible)properties.responsible={...properties.responsible,description:'Filtro de responsable; omitir si no se solicita ese filtro.'};
  if(properties.order_by)properties.order_by={...properties.order_by,description:'Orden de vista. amount_desc + top_n se puede canonizar a DERIVE/RANK o MAX.'};
  if(properties.requested_fields)properties.requested_fields={...properties.requested_fields,description:'Campos/magnitudes que deben materializarse. Usa nombres conceptuales simples; CE canonicaliza aliases JSON como total_income→income y total_attendance→attendees.'};
  if(properties.focus_mode)properties.focus_mode={...properties.focus_mode,description:'Metadato de contexto: replace sustituye el foco previo; add compone focos deliberadamente.'};
  if(properties.focus_entities)properties.focus_entities={...properties.focus_entities,description:'Entidades canónicas que forman el foco actual. Si una pareja/grupo existe como entidad canónica, conservarla como un único elemento.'};
  if(properties.focus_type)properties.focus_type={...properties.focus_type,description:'Tipo del foco estructurado actual.'};
  if(operation==='events_overview'&&properties.scope)properties.scope={...properties.scope,description:'Compatibilidad: all_events es redundante y se elimina al canonizar.'};
  if(operation==='event_purchases'&&properties.top_n)properties.top_n={...properties.top_n,description:'Compatibilidad estructural: con amount_desc o derive_operation se canoniza a DERIVE.'};
  return{type:'object',description:OP_DESCRIPTIONS[operation]||'',properties,required:['operation',...d.required],additionalProperties:false};
}
export function queryCeToolParameters(){
  const branches=capabilityOperations().map(capabilityBranchSchema).filter(Boolean);
  return{type:'object',properties:queryCeSchemaProperties(),required:['operation'],anyOf:branches};
}
export function capabilityCatalogText(){
  return capabilityOperations().map(op=>{const d=CAPABILITY_REGISTRY[op],req=d.required.length?`req=${d.required.join(',')}`:'req=—',opt=d.optional.filter(x=>!PRESENT.includes(x)).length?`opt=${d.optional.filter(x=>!PRESENT.includes(x)).join(',')}`:'opt=—',desc=OP_DESCRIPTIONS[op]?` · ${OP_DESCRIPTIONS[op]}`:'';return`- ${op} [${d.module}] ${req}; ${opt}; resultado=${d.result}${desc}`;}).join('\n');
}

function valueTypeOk(value,schema={}){
  if(value==null)return true;
  let typeOk=true;
  if(schema.type==='string')typeOk=typeof value==='string';
  else if(schema.type==='boolean')typeOk=typeof value==='boolean';
  else if(schema.type==='number'||schema.type==='integer')typeOk=typeof value==='number'&&Number.isFinite(value)&&(schema.type!=='integer'||Number.isInteger(value));
  else if(schema.type==='array')typeOk=Array.isArray(value);
  else if(schema.type==='object')typeOk=value&&typeof value==='object'&&!Array.isArray(value);
  if(!typeOk)return false;
  if(Array.isArray(schema.enum)&&!schema.enum.includes(value))return false;
  if(schema.type==='array'&&schema.items&&Array.isArray(value)&&!value.every(v=>valueTypeOk(v,schema.items)))return false;
  return true;
}
export function capabilitySignature(args={}){
  const op=trim(args?.operation)||'—',keys=Object.keys(args||{}).filter(k=>!k.startsWith('_')&&args[k]!==undefined&&args[k]!==null&&args[k]!==''&&(!Array.isArray(args[k])||args[k].length)).sort();
  return `${op}|${keys.map(k=>`${k}:${Array.isArray(args[k])?'array':typeof args[k]}`).join('|')}`;
}
export function capabilitySignatureHash(args={}){return crypto.createHash('sha256').update(capabilitySignature(args)).digest('hex');}

const REQUESTED_FIELD_ALIASES=Object.freeze({
  total_income:'income',income_total:'income',
  total_purchases:'purchases',purchases_realized:'purchases',realized_purchases:'purchases',
  purchases_pending:'pending',pending_purchases:'pending',total_pending:'pending',
  total_donations:'donations',donations_value:'donations',
  operating_balance:'balance',net_income:'balance',
  total_valuation:'valuation',event_valuation:'valuation',
  total_attendance:'attendees',attendance:'attendees',attendees_canonical:'attendees',total_attendees:'attendees',
  event_status:'status',name:'event',event_name:'event'
});
function canonicalRequestedField(value=''){
  const raw=trim(value);if(!raw)return'';const key=raw.toLowerCase().replace(/[\s.-]+/g,'_');return REQUESTED_FIELD_ALIASES[key]||key;
}
function canonicalRequestedFields(value){
  const input=Array.isArray(value)?value:(typeof value==='string'?[value]:[]),out=[];for(const v of input){const c=canonicalRequestedField(v);if(c&&!out.includes(c))out.push(c);}return out;
}
function canonicalDeriveField(value=''){
  const raw=trim(value),key=raw.toLowerCase().replace(/[\s.-]+/g,'_');const map={importe:'amount',amount:'amount',valor:'amount',total:'amount',ingresos:'income',income:'income',compras:'purchases',purchases:'purchases',donaciones:'donations',donations:'donations',asistencia:'attendees',attendance:'attendees',attendees:'attendees'};return map[key]||raw;
}
function cleanSourceArgs(input={}){
  const out={...input};for(const k of ['derive_operation','derive_field','field','label_field','table_key','top_n','source_operation','source_args','requested_fields','focus_mode','focus_type','focus_entities'])delete out[k];return out;
}
function validateAgainstDefinition(args={},operation='',issues=[]){
  const d=capabilityDefinition(operation);if(!d)return null;
  const allowed=new Set(['operation',...d.required,...d.optional]);
  const unknown=Object.keys(args).filter(k=>!k.startsWith('_')&&!allowed.has(k));if(unknown.length)issues.push(`Claves no permitidas para ${operation}: ${unknown.join(', ')}`);
  for(const k of d.required){const v=args[k];if(v==null||v===''||(Array.isArray(v)&&!v.length))issues.push(`Falta clave obligatoria ${k}`);}
  for(const k of [...d.required,...d.optional]){if(args[k]===undefined)continue;if(!valueTypeOk(args[k],P[k]||{}))issues.push(`Tipo inválido en ${k}`);}
  return d;
}
function mark(repairs,msg,current='CANONICAL',target='NORMALIZED'){repairs.push(msg);return current==='CANONICAL'?target:current;}

export function auditCapabilityCall(rawArgs={}){
  const raw={...(rawArgs||{})},originalOperation=trim(raw.operation),initialDef=capabilityDefinition(originalOperation),issues=[],repairs=[];
  if(!initialDef)return{ok:false,operation:originalOperation,effectiveOperation:originalOperation,classification:'UNSUPPORTED_CAPABILITY',issues:[`Operación no registrada: ${originalOperation||'—'}`],repairs,rawArgs:raw,sanitizedArgs:{...raw},signature:capabilitySignature(raw),signatureHash:capabilitySignatureHash(raw),registryVersion:CAPABILITY_REGISTRY_VERSION};

  let sanitized={...raw},effectiveOperation=originalOperation,classification='CANONICAL';
  // Tolerancias puramente JSON.
  if(typeof sanitized.requested_fields==='string'){sanitized.requested_fields=[sanitized.requested_fields];classification=mark(repairs,'requested_fields: string → array',classification,'COMPATIBLE');}
  if(sanitized.requested_fields!==undefined){const before=arr(sanitized.requested_fields).map(trim).filter(Boolean),after=canonicalRequestedFields(sanitized.requested_fields);sanitized.requested_fields=after;if(JSON.stringify(before)!==JSON.stringify(after))classification=mark(repairs,`requested_fields canonicalizados: ${before.join(',')||'—'} → ${after.join(',')||'—'}`,classification);}
  if(typeof sanitized.focus_mode==='string')sanitized.focus_mode=trim(sanitized.focus_mode).toLowerCase();
  if(typeof sanitized.focus_type==='string')sanitized.focus_type=trim(sanitized.focus_type).toLowerCase();
  if(typeof sanitized.focus_entities==='string'){sanitized.focus_entities=[sanitized.focus_entities];classification=mark(repairs,'focus_entities: string → array',classification,'COMPATIBLE');}
  if(sanitized.derive_field!==undefined&&!trim(sanitized.field)){sanitized.field=canonicalDeriveField(sanitized.derive_field);delete sanitized.derive_field;classification=mark(repairs,'derive_field → field',classification);}
  else if(sanitized.field!==undefined){const cf=canonicalDeriveField(sanitized.field);if(cf!==trim(sanitized.field)){sanitized.field=cf;classification=mark(repairs,`field canonicalizado → ${cf}`,classification);}}

  // Ámbitos redundantes en contratos cuyo nombre ya fija el ámbito.
  if(effectiveOperation==='events_overview'&&sanitized.scope!==undefined){
    if(trim(sanitized.scope)==='all_events'){delete sanitized.scope;classification=mark(repairs,'events_overview: scope=all_events redundante eliminado',classification,'COMPATIBLE');}
    else issues.push(`events_overview solo admite scope=all_events como compatibilidad; recibido ${trim(sanitized.scope)||'—'}`);
  }
  if(['event_management','event_documentation','event_donations','event_bank','event_attendance','event_summary'].includes(effectiveOperation)&&sanitized.scope!==undefined){
    if(['named_event','active_event',''].includes(trim(sanitized.scope))){delete sanitized.scope;classification=mark(repairs,`${effectiveOperation}: scope redundante eliminado`,classification,'COMPATIBLE');}
    else issues.push(`${effectiveOperation} es de un evento y no admite scope=${trim(sanitized.scope)}`);
  }

  // Alias estructural de compras.
  if(effectiveOperation==='event_purchases'&&sanitized.status!==undefined){
    const s=trim(sanitized.status);if(!sanitized.purchase_status&&['pending','realized','all'].includes(s)){sanitized.purchase_status=s;delete sanitized.status;classification=mark(repairs,'event_purchases: status → purchase_status',classification);}
    else if(sanitized.purchase_status){delete sanitized.status;classification=mark(repairs,'event_purchases: status redundante eliminado',classification,'COMPATIBLE');}
  }

  // Ingreso global de persona: la forma person_income_status sin event se canoniza al dossier global.
  if(effectiveOperation==='person_income_status'&&trim(sanitized.person)&&!trim(sanitized.event)){
    const fields=canonicalRequestedFields([...(arr(sanitized.requested_fields)), 'income']);
    sanitized={...sanitized,operation:'person_profile',requested_fields:fields};delete sanitized.event;
    effectiveOperation='person_profile';classification=mark(repairs,'person_income_status sin event → person_profile requested_fields=[income]',classification);
  }

  // Formas algebraicas de compras → DERIVE, antes de validar para que aliases compatibles no fallen.
  if(effectiveOperation==='event_purchases'){
    const dop=trim(sanitized.derive_operation).toUpperCase(),top=Math.max(0,Number(sanitized.top_n)||0),order=trim(sanitized.order_by);let targetDerive='';
    if(dop)targetDerive=dop;else if(top>0&&order==='amount_desc')targetDerive=top===1?'MAX':'RANK';
    if(targetDerive){
      const sourceArgs=cleanSourceArgs({...sanitized,operation:'event_purchases'}),keep={detail:sanitized.detail,tone:sanitized.tone,register:sanitized.register,tease:sanitized.tease,narrate:sanitized.narrate,requested_fields:sanitized.requested_fields,focus_mode:sanitized.focus_mode,focus_type:sanitized.focus_type,focus_entities:sanitized.focus_entities};
      sanitized={operation:'derive',derive_operation:targetDerive,field:canonicalDeriveField(sanitized.field)||'amount',label_field:trim(sanitized.label_field)||'product',top_n:top||undefined,source_operation:'event_purchases',source_args:sourceArgs,...Object.fromEntries(Object.entries(keep).filter(([,v])=>v!==undefined))};
      effectiveOperation='derive';classification=mark(repairs,`event_purchases → derive(${targetDerive}) sobre dataset de compras`,classification);
    }
  }

  validateAgainstDefinition(sanitized,effectiveOperation,issues);
  if(issues.length){const d=capabilityDefinition(effectiveOperation)||initialDef;return{ok:false,operation:originalOperation,effectiveOperation,classification:'MALFORMED_CALL',issues,repairs,rawArgs:raw,sanitizedArgs:sanitized,signature:capabilitySignature(raw),signatureHash:capabilitySignatureHash(raw),registryVersion:CAPABILITY_REGISTRY_VERSION,module:d?.module||'',resultContract:d?.result||''};}

  const effectiveDef=capabilityDefinition(effectiveOperation);
  for(const [k,v] of Object.entries(effectiveDef?.defaults||{})){if(sanitized[k]===undefined||sanitized[k]==='')sanitized[k]=v;}
  return{ok:true,operation:originalOperation,effectiveOperation,classification,issues:[],repairs,rawArgs:raw,sanitizedArgs:sanitized,signature:capabilitySignature(raw),signatureHash:capabilitySignatureHash(raw),registryVersion:CAPABILITY_REGISTRY_VERSION,module:effectiveDef?.module||initialDef.module,resultContract:effectiveDef?.result||initialDef.result};
}

export function queueCapabilityObservation(observation={}){
  const payload={registry_version:CAPABILITY_REGISTRY_VERSION,operation:trim(observation.operation),module:trim(observation.module),signature:trim(observation.signature),signature_hash:trim(observation.signatureHash),status:trim(observation.status)||'PENDING',classification:trim(observation.classification),prompt:trim(observation.prompt).slice(0,3000),raw_args:observation.rawArgs||{},sanitized_args:observation.sanitizedArgs||{},issues:arr(observation.issues),repairs:arr(observation.repairs),scenario:trim(observation.scenario),observed_at:new Date().toISOString()};
  Promise.resolve().then(async()=>{try{const db=getSupabaseAdmin();if(!db)return;const {error}=await db.from('ce_zuzu_capability_observations').insert(payload);if(error&&!/does not exist|schema cache|relation .* does not exist/i.test(text(error?.message)))console.warn('[P1.19 CAPABILITY OBS]',error.message||error);}catch(_){}});
}
