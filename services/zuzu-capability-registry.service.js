/* ControlEvent v4_0_exp · VNext P1.17
   Registro canónico de capacidades query_ce.
   NHC: describe contratos JSON y semántica de ejecución; nunca palabras/frases del usuario. */
import crypto from 'node:crypto';
import { getSupabaseAdmin } from '../lib/supabase.js';

const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();
const arr=v=>Array.isArray(v)?v:[];

export const CAPABILITY_REGISTRY_VERSION='20260831-P117';

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
  requested_fields:{type:'array',items:{type:'string',enum:['income','purchases','pending','donations','balance','valuation','attendees','status','event']}},
  derive_operation:{type:'string',enum:['SUM','COUNT','DISTINCT_COUNT','MAX','MIN','AVG','RANK','DIFFERENCE']},field:{type:'string'},label_field:{type:'string'},table_key:{type:'string'},top_n:{type:'integer'}
};

const PRESENT=['detail','tone','register','tease','narrate'];
const def=(module,required=[],optional=[],result='',guarded=[],defaults={})=>({module,required,optional:[...new Set([...optional,...PRESENT])],result,guarded,defaults});

export const CAPABILITY_REGISTRY=Object.freeze({
  people_catalog:def('PERSONAS',[],['population'],'people_catalog'),
  events_catalog:def('EVENTOS',[],[],'events_catalog'),
  person_profile:def('PERSONAS',['person'],['event'],'person_dossier'),
  person_events:def('PERSONAS',['person'],[],'person_events'),
  person_income_status:def('INGRESOS',['person','event'],[],'person_income_status'),
  person_event_status:def('PERSONAS',['person','event'],[],'person_event_status'),
  event_income_status:def('INGRESOS',['event'],['status','population'],'income_status',[],{status:'pending',population:'all'}),
  event_income_lines:def('INGRESOS',['event'],[],'income_lines'),
  event_attendance:def('ASISTENCIA',['event'],['attendance_mode'],'attendance',[],{attendance_mode:'attendees'}),
  event_summary:def('EVENTO',['event'],['requested_fields'],'event_dossier'),
  event_scenario:def('ESCENARIOS',['event'],['income_delta','scenario_people','plan','plan_detail','plan_focus','plan_target','chart','chart_type'],'scenario'),
  event_purchases:def('COMPRAS',['event'],['purchase_status','responsible','mine','order_by','store_filter_mode','include_stores','exclude_stores','exclude_products','visible_columns','hidden_columns','view_filters','view_sort','reset_table'],'purchase_dataset',[],{purchase_status:'all',store_filter_mode:'all'}),
  event_donations:def('DONACIONES',['event'],[],'donation_dataset'),
  event_bank:def('BANCO',['event'],[],'bank_summary'),
  event_weather:def('TIEMPO',['event'],['start_date','end_date','chart','chart_type'],'weather'),
  event_stores_used:def('TIENDAS',['event'],[],'event_stores'),
  event_products:def('PRODUCTOS',['event'],[],'event_products'),
  compare_events:def('COMPARACION',['events'],['metric','chart','chart_type'],'comparison',[],{metric:'all'}),
  event_documentation:def('DOCUMENTOS',['event'],[],'event_documentation'),
  event_management:def('GESTION',['event'],[],'event_management'),
  store_purchases:def('TIENDAS',['store'],['event','scope','status','include_empty'],'store_purchases',[],{scope:'all_events',status:'realized'}),
  events_overview:def('EVENTOS',[],['metric','chart','chart_type'],'events_overview',[],{metric:'all'}),
  derive:def('DERIVACION',['derive_operation'],['field','label_field','table_key','top_n'],'derived_dataset')
});

export function capabilityOperations(){return Object.keys(CAPABILITY_REGISTRY);}
export function capabilityDefinition(operation=''){return CAPABILITY_REGISTRY[trim(operation)]||null;}
export function queryCeSchemaProperties(){
  const props={};for(const [k,v] of Object.entries(P))props[k]=v;
  props.operation={type:'string',enum:capabilityOperations(),description:'Operación canónica de ControlEvent. Cada operación habilita solo sus propias claves.'};
  return props;
}
function capabilityBranchSchema(operation=''){
  const d=capabilityDefinition(operation);if(!d)return null;
  const keys=[...new Set(['operation',...d.required,...d.optional])],properties={};
  for(const k of keys){if(k==='operation')properties.operation={type:'string',enum:[operation]};else if(P[k])properties[k]={...P[k]};}
  if(properties.mine)properties.mine={...properties.mine,description:'true solo cuando el objetivo estructurado sea limitar las compras al usuario actual.'};
  if(properties.responsible)properties.responsible={...properties.responsible,description:'Persona responsable por la que debe filtrarse el dataset; omitir si no se solicita ese filtro.'};
  if(properties.order_by)properties.order_by={...properties.order_by,description:'Orden solicitado para la vista; omitir si no hay una ordenación pedida.'};
  if(properties.requested_fields)properties.requested_fields={...properties.requested_fields,description:'Magnitudes que deben materializarse en la respuesta. No filtra el dataset.'};
  return{type:'object',properties,required:['operation',...d.required],additionalProperties:false};
}
export function queryCeToolParameters(){
  const branches=capabilityOperations().map(capabilityBranchSchema).filter(Boolean);
  // P1.17: discriminador por operation. Se conserva properties en la raíz por compatibilidad
  // con consumidores que inspeccionan el schema, pero anyOf expresa el contrato real de cada operación.
  return{type:'object',properties:queryCeSchemaProperties(),required:['operation'],anyOf:branches};
}
export function capabilityCatalogText(){
  return capabilityOperations().map(op=>{const d=CAPABILITY_REGISTRY[op],req=d.required.length?`req=${d.required.join(',')}`:'req=—',opt=d.optional.filter(x=>!PRESENT.includes(x)).length?`opt=${d.optional.filter(x=>!PRESENT.includes(x)).join(',')}`:'opt=—';return`- ${op} [${d.module}] ${req}; ${opt}; resultado=${d.result}`;}).join('\n');
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

export function auditCapabilityCall(rawArgs={}){
  const raw={...(rawArgs||{})},operation=trim(raw.operation),d=capabilityDefinition(operation),issues=[],repairs=[],sanitized={...raw};
  if(!d)return{ok:false,operation,classification:'UNSUPPORTED_CAPABILITY',issues:[`Operación no registrada: ${operation||'—'}`],repairs,rawArgs:raw,sanitizedArgs:sanitized,signature:capabilitySignature(raw),signatureHash:capabilitySignatureHash(raw),registryVersion:CAPABILITY_REGISTRY_VERSION};
  const allowed=new Set(['operation',...d.required,...d.optional]);
  const unknown=Object.keys(raw).filter(k=>!k.startsWith('_')&&!allowed.has(k));
  if(unknown.length){issues.push(`Claves no permitidas para ${operation}: ${unknown.join(', ')}`);for(const k of unknown)delete sanitized[k];}
  for(const k of d.required){const v=raw[k];if(v==null||v===''||(Array.isArray(v)&&!v.length))issues.push(`Falta clave obligatoria ${k}`);}
  for(const k of [...d.required,...d.optional]){
    if(raw[k]===undefined)continue;
    // Tolerancia JSON estructural: un único requested_field puede llegar como string.
    if(k==='requested_fields'&&typeof raw[k]==='string'&&valueTypeOk([raw[k]],P[k]||{})){sanitized[k]=[raw[k]];repairs.push('requested_fields normalizado de string a array');continue;}
    if(!valueTypeOk(raw[k],P[k]||{})){issues.push(`Tipo inválido en ${k}`);delete sanitized[k];}
  }
  for(const [k,v] of Object.entries(d.defaults||{})){if(sanitized[k]===undefined||sanitized[k]==='')sanitized[k]=v;}
  // P1.17: una clave ajena a la operación o un tipo inválido es MALFORMED_CALL.
  // No se intenta reinterpretar el castellano ni se "aprende" la combinación errónea.
  const fatal=issues.length>0;
  return{ok:!fatal,operation,classification:fatal?'MALFORMED_CALL':repairs.length?'NORMALIZED':'KNOWN',issues,repairs,rawArgs:raw,sanitizedArgs:sanitized,signature:capabilitySignature(raw),signatureHash:capabilitySignatureHash(raw),registryVersion:CAPABILITY_REGISTRY_VERSION,module:d.module,resultContract:d.result};
}

export function queueCapabilityObservation(observation={}){
  const payload={registry_version:CAPABILITY_REGISTRY_VERSION,operation:trim(observation.operation),module:trim(observation.module),signature:trim(observation.signature),signature_hash:trim(observation.signatureHash),status:trim(observation.status)||'PENDING',classification:trim(observation.classification),prompt:trim(observation.prompt).slice(0,3000),raw_args:observation.rawArgs||{},sanitized_args:observation.sanitizedArgs||{},issues:arr(observation.issues),repairs:arr(observation.repairs),scenario:trim(observation.scenario),observed_at:new Date().toISOString()};
  Promise.resolve().then(async()=>{try{const db=getSupabaseAdmin();if(!db)return;const {error}=await db.from('ce_zuzu_capability_observations').insert(payload);if(error&&!/does not exist|schema cache|relation .* does not exist/i.test(text(error?.message)))console.warn('[P1.17 CAPABILITY OBS]',error.message||error);}catch(_){}});
}
