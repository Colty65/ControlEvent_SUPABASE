/* ControlEvent v4_0_exp · RAW14T · Zuzu Memory Core + semilla de Experiencia CE.
   Persistencia server-side, inmutable por turno. El navegador conserva solo conversation_id.
   MEMORIA HISTÓRICA: fuente única = tablas persistentes ce_zuzu_conversations/ce_zuzu_turns.
   ce_meta puede seguir sirviendo al ledger técnico de compatibilidad, pero NUNCA aporta recuerdos. */
import crypto from 'node:crypto';
import { getSupabaseAdmin } from '../lib/supabase.js';

const T_CONV='ce_zuzu_conversations';
const T_TURN='ce_zuzu_turns';
const T_DATA='ce_zuzu_datasets';
const T_VIEW='ce_zuzu_views';
const META_PREFIX='zuzu_ledger_v1:';

const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();
const arr=v=>Array.isArray(v)?v:[];
const now=()=>new Date().toISOString();
const db=()=>getSupabaseAdmin();
const clone=v=>v&&typeof v==='object'?JSON.parse(JSON.stringify(v)):v;
const actorId=a=>trim(a?.identificacion||a?.Identificacion||a?.id||a?.ID||a?.usuario||a?.Usuario);
const actorName=a=>trim(a?.nombre||a?.Nombre||a?.identificacion||a?.Identificacion||a?.usuario||a?.Usuario)||'usuario';
const norm=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();

function isMissingTable(error){
  const s=`${error?.code||''} ${error?.message||''}`.toLowerCase();
  return s.includes('42p01')||s.includes('does not exist')||s.includes('not found')||s.includes('schema cache');
}
function isMissingColumn(error){
  const s=`${error?.code||''} ${error?.message||''}`.toLowerCase();
  return s.includes('42703')||s.includes('column')&&s.includes('does not exist')||s.includes('schema cache');
}
function clip(v='',n=420){const x=trim(v).replace(/\s+/g,' ');return x.length<=n?x:`${x.slice(0,Math.max(1,n-1)).trim()}…`;}
function uniqueNorm(values=[]){const out=[],seen=new Set();for(const raw of arr(values)){const v=trim(raw);if(!v)continue;const k=norm(v);if(!k||seen.has(k))continue;seen.add(k);out.push(v);}return out;}
function safeId(s=''){return trim(s).replace(/[^A-Za-z0-9_-]/g,'').slice(0,120);}
function randomCode(n=8){return crypto.randomBytes(Math.ceil(n/2)).toString('hex').slice(0,n).toUpperCase();}
export function newConversationId(){const d=new Date().toISOString().slice(0,10).replaceAll('-','');return`ZC_${d}_${randomCode(10)}`;}
export function newDatasetId(conversationId='',seq=0){return`ZD_${safeId(conversationId).slice(-18)}_${String(seq).padStart(4,'0')}_${randomCode(6)}`;}
export function newViewId(conversationId='',seq=0){return`ZV_${safeId(conversationId).slice(-18)}_${String(seq).padStart(4,'0')}_${randomCode(6)}`;}
export function turnIdFor(conversationId='',seq=0){return`${safeId(conversationId)}-${String(seq).padStart(4,'0')}`;}
export function fingerprint(value){return crypto.createHash('sha1').update(JSON.stringify(value??null)).digest('hex').slice(0,20);}

function mkey(kind,id){return `${META_PREFIX}${kind}:${safeId(id)}`;}
async function metaGet(key){const {data,error}=await db().from('ce_meta').select('value').eq('key',key).maybeSingle();if(error)throw error;return data?.value??null;}
async function metaSet(key,value){const {error}=await db().from('ce_meta').upsert({key,value},{onConflict:'key'});if(error)throw error;}
async function metaDelete(key){const {error}=await db().from('ce_meta').delete().eq('key',key);if(error)throw error;}
async function metaList(prefix,limit=200){const {data,error}=await db().from('ce_meta').select('key,value').like('key',`${prefix}%`).limit(Math.max(1,Math.min(1000,Number(limit)||200)));if(error)throw error;return arr(data).map(x=>({key:x.key,value:x.value}));}

function publicConversation(r={}){return{conversationId:trim(r.conversation_id),userId:trim(r.user_id),userName:trim(r.user_name),title:trim(r.title),createdAt:trim(r.created_at),updatedAt:trim(r.updated_at),currentSeq:Number(r.current_seq)||0,currentTurnId:trim(r.current_turn_id),selectedEventId:trim(r.selected_event_id),status:trim(r.status)||'active',memorySummary:trim(r.memory_summary),memoryMainTopics:arr(r.memory_main_topics),memoryMainEntities:arr(r.memory_main_entities),memoryRecallableTurns:Number(r.memory_recallable_turns)||0,memoryVisibility:trim(r.memory_visibility)||'private'};}
function publicTurn(r={}){return{turnId:trim(r.turn_id),conversationId:trim(r.conversation_id),seq:Number(r.seq)||0,userPrompt:trim(r.user_prompt),actionType:trim(r.action_type),geminiPlan:r.gemini_plan||{},normalizedPlan:r.normalized_plan||{},execution:r.execution||{},datasetId:trim(r.dataset_id),viewId:trim(r.view_id),parentTurnId:trim(r.parent_turn_id),referencedTurnId:trim(r.referenced_turn_id),status:trim(r.status)||'OK',title:trim(r.title),answer:trim(r.answer),createdAt:trim(r.created_at),memoryRecallable:r.memory_recallable===true,memoryQuality:Number(r.memory_quality)||0,memorySummary:trim(r.memory_summary),memoryEntities:arr(r.memory_entities),memoryPlanSignature:r.memory_plan_signature||{},memoryKind:trim(r.memory_kind),memoryVisibility:trim(r.memory_visibility)||'private',memoryExperienceSignature:r.memory_experience_signature||{}};}
function publicDataset(r={}){return{datasetId:trim(r.dataset_id),conversationId:trim(r.conversation_id),sourceTurnId:trim(r.source_turn_id),domain:trim(r.domain),scope:r.scope||{},rowCount:Number(r.row_count)||0,columns:arr(r.columns),rows:arr(r.rows),facts:r.facts||{},provenance:r.provenance||{},fingerprint:trim(r.fingerprint),createdAt:trim(r.created_at)};}
function publicView(r={}){return{viewId:trim(r.view_id),conversationId:trim(r.conversation_id),datasetId:trim(r.dataset_id),sourceTurnId:trim(r.source_turn_id),visibleFields:arr(r.visible_fields),sort:arr(r.sort),rowFilters:arr(r.row_filters),groupBy:arr(r.group_by),metrics:arr(r.metrics),rowLimit:r.row_limit==null?null:Number(r.row_limit),presentation:r.presentation||{},title:trim(r.title),createdAt:trim(r.created_at)};}

async function tableGetConversation(id){const {data,error}=await db().from(T_CONV).select('*').eq('conversation_id',id).maybeSingle();if(error)throw error;return data?publicConversation(data):null;}
async function tableEnsureConversation(row){const {data,error}=await db().from(T_CONV).upsert(row,{onConflict:'conversation_id'}).select('*').single();if(error)throw error;return publicConversation(data);}
async function tableGetTurn(id){const {data,error}=await db().from(T_TURN).select('*').eq('turn_id',id).maybeSingle();if(error)throw error;return data?publicTurn(data):null;}
async function tableListTurns(convId,limit=500){const {data,error}=await db().from(T_TURN).select('*').eq('conversation_id',convId).order('seq',{ascending:false}).limit(Math.max(1,Math.min(1000,Number(limit)||500)));if(error)throw error;return arr(data).map(publicTurn).sort((a,b)=>a.seq-b.seq);}
async function tableGetDataset(id,{includeRows=true}={}){
  if(!id)return null;
  const projection=includeRows?'*':'dataset_id,conversation_id,source_turn_id,domain,scope,row_count,columns,facts,provenance,fingerprint,created_at';
  const {data,error}=await db().from(T_DATA).select(projection).eq('dataset_id',id).maybeSingle();if(error)throw error;return data?publicDataset(data):null;
}
async function tableGetView(id){if(!id)return null;const {data,error}=await db().from(T_VIEW).select('*').eq('view_id',id).maybeSingle();if(error)throw error;return data?publicView(data):null;}

async function fallbackGetConversation(id){const v=await metaGet(mkey('conversation',id));return v?publicConversation(v):null;}
async function fallbackGetTurn(id){const v=await metaGet(mkey('turn',id));return v?publicTurn(v):null;}
async function fallbackListTurns(convId,limit=500){const items=await metaList(`${META_PREFIX}turn:${safeId(convId)}-`,limit);return items.map(x=>publicTurn(x.value)).sort((a,b)=>a.seq-b.seq);}
async function fallbackGetDataset(id){const v=id?await metaGet(mkey('dataset',id)):null;return v?publicDataset(v):null;}
async function fallbackGetView(id){const v=id?await metaGet(mkey('view',id)):null;return v?publicView(v):null;}

async function withFallback(tableFn,fallbackFn){try{return await tableFn();}catch(error){if(!isMissingTable(error))throw error;return fallbackFn();}}

export async function ensureZuzuConversation({conversationId='',actor={},selectedEventId='',title=''}={}){
  const uid=actorId(actor);if(!uid){const e=new Error('No puedo persistir la conversación Zuzu sin usuario identificado.');e.status=401;throw e;}
  let id=safeId(conversationId)||newConversationId();
  const existing=await withFallback(()=>tableGetConversation(id),()=>fallbackGetConversation(id));
  if(existing&&existing.userId&&norm(existing.userId)!==norm(uid)){id=newConversationId();}
  if(existing&&norm(existing.userId)===norm(uid))return existing;
  const stamp=now(),row={conversation_id:id,user_id:uid,user_name:actorName(actor),title:trim(title)||'Conversación Zuzu',created_at:stamp,updated_at:stamp,current_seq:0,current_turn_id:'',selected_event_id:trim(selectedEventId),status:'active'};
  return withFallback(()=>tableEnsureConversation(row),async()=>{await metaSet(mkey('conversation',id),row);return publicConversation(row);});
}

export async function getZuzuConversationSession({conversationId='',actor={},includeRows=true,recentLimit=10}={}){
  const uid=actorId(actor),id=safeId(conversationId);if(!id||!uid)return null;
  const conversation=await withFallback(()=>tableGetConversation(id),()=>fallbackGetConversation(id));
  if(!conversation||norm(conversation.userId)!==norm(uid))return null;
  const turns=await withFallback(()=>tableListTurns(id,recentLimit),()=>fallbackListTurns(id,recentLimit));
  const current=turns.find(t=>t.turnId===conversation.currentTurnId)||turns[turns.length-1]||null;
  const dataset=current?.datasetId?await withFallback(()=>tableGetDataset(current.datasetId,{includeRows}),()=>fallbackGetDataset(current.datasetId)):null;
  const view=current?.viewId?await withFallback(()=>tableGetView(current.viewId),()=>fallbackGetView(current.viewId)):null;
  if(dataset&&!includeRows)dataset.rows=[];
  return{conversation,currentTurn:current,dataset,view,recentTurns:turns};
}

export async function getZuzuTurnBundle({turnId='',actor={}}={}){
  const uid=actorId(actor),id=safeId(turnId);if(!uid||!id)return null;
  const turn=await withFallback(()=>tableGetTurn(id),()=>fallbackGetTurn(id));if(!turn)return null;
  const conv=await withFallback(()=>tableGetConversation(turn.conversationId),()=>fallbackGetConversation(turn.conversationId));if(!conv||norm(conv.userId)!==norm(uid))return null;
  const dataset=turn.datasetId?await withFallback(()=>tableGetDataset(turn.datasetId),()=>fallbackGetDataset(turn.datasetId)):null;
  const view=turn.viewId?await withFallback(()=>tableGetView(turn.viewId),()=>fallbackGetView(turn.viewId)):null;
  return{conversation:conv,turn,dataset,view};
}

export async function appendZuzuTurn({conversation,actor={},userPrompt='',actionType='',geminiPlan={},normalizedPlan={},execution={},dataset=null,view=null,datasetId:datasetIdArg='',viewId:viewIdArg='',parentTurnId='',referencedTurnId='',status='OK',title='',answer='',selectedEventId=''}={}){
  const uid=actorId(actor);if(!uid)throw Object.assign(new Error('Usuario no identificado para ledger Zuzu.'),{status:401});
  const conv=conversation||await ensureZuzuConversation({actor,selectedEventId});const seq=(Number(conv.currentSeq)||0)+1,turnId=turnIdFor(conv.conversationId,seq),stamp=now();
  let datasetId=trim(datasetIdArg)||trim(dataset?.datasetId),viewId=trim(viewIdArg)||trim(view?.viewId);
  if(dataset){datasetId=datasetId||newDatasetId(conv.conversationId,seq);const drow={dataset_id:datasetId,conversation_id:conv.conversationId,source_turn_id:turnId,domain:trim(dataset.domain),scope:dataset.scope||{},row_count:Number(dataset.rowCount)||arr(dataset.rows).length,columns:arr(dataset.columns),rows:arr(dataset.rows),facts:dataset.facts||{},provenance:dataset.provenance||{},fingerprint:trim(dataset.fingerprint)||fingerprint({domain:dataset.domain,scope:dataset.scope,rows:dataset.rows}),created_at:stamp};await withFallback(async()=>{const {error}=await db().from(T_DATA).insert(drow);if(error)throw error;},()=>metaSet(mkey('dataset',datasetId),drow));}
  if(view){viewId=viewId||newViewId(conv.conversationId,seq);const vrow={view_id:viewId,conversation_id:conv.conversationId,dataset_id:trim(view.datasetId)||datasetId,source_turn_id:turnId,visible_fields:arr(view.visibleFields),sort:arr(view.sort),row_filters:arr(view.rowFilters),group_by:arr(view.groupBy),metrics:arr(view.metrics),row_limit:view.rowLimit==null?null:Number(view.rowLimit),presentation:view.presentation||{},title:trim(view.title),created_at:stamp};await withFallback(async()=>{const {error}=await db().from(T_VIEW).insert(vrow);if(error)throw error;},()=>metaSet(mkey('view',viewId),vrow));}
  const trow={turn_id:turnId,conversation_id:conv.conversationId,seq,user_prompt:trim(userPrompt),action_type:trim(actionType),gemini_plan:clone(geminiPlan)||{},normalized_plan:clone(normalizedPlan)||{},execution:{...(clone(execution)||{}),selected_event_id:trim(selectedEventId)},dataset_id:datasetId,view_id:viewId,parent_turn_id:trim(parentTurnId),referenced_turn_id:trim(referencedTurnId),status:trim(status)||'OK',title:trim(title),answer:trim(answer),created_at:stamp};
  await withFallback(async()=>{const {error}=await db().from(T_TURN).insert(trow);if(error)throw error;},()=>metaSet(mkey('turn',turnId),trow));
  const crow={conversation_id:conv.conversationId,user_id:uid,user_name:actorName(actor),title:trim(conv.title)||'Conversación Zuzu',created_at:trim(conv.createdAt)||stamp,updated_at:stamp,current_seq:seq,current_turn_id:turnId,selected_event_id:trim(selectedEventId),status:'active'};
  let savedConv=await withFallback(()=>tableEnsureConversation(crow),async()=>{await metaSet(mkey('conversation',conv.conversationId),crow);return publicConversation(crow);});
  const rawTurn=publicTurn(trow),memory=memoryProjectionForTurn(rawTurn);
  await persistTurnMemoryProjection(rawTurn.turnId,memory);
  const savedTurn={...rawTurn,memoryRecallable:memory.recallable,memoryQuality:memory.quality,memorySummary:memory.summary,memoryEntities:memory.entities,memoryPlanSignature:memory.planSignature,memoryKind:memory.kind,memoryVisibility:memory.visibility||'private',memoryExperienceSignature:memory.experienceSignature||{}};
  await updateHistoryIndex({conversation:savedConv,turn:savedTurn,actor,memory});
  const episode=await updateConversationMemoryProjection({conversation:savedConv,turn:savedTurn,actor,memory});
  if(episode)savedConv={...savedConv,memorySummary:episode.conversation_summary,memoryMainTopics:episode.main_topics,memoryMainEntities:episode.main_entities,memoryRecallableTurns:episode.recallable_turns};
  return{conversation:savedConv,turn:savedTurn,datasetId,viewId};
}

function semanticTagsFromTurn(turn={}){
  const plan=turn.normalizedPlan||{},q=plan.query||{},scope=q.scope||{},exec=turn.execution||{};
  const entity=(name,value)=>trim(value)?{role:name,value:trim(value)}:null;
  const entities=[
    entity('person',q.person),entity('responsible',q.responsible),entity('donor',q.donor),entity('store',q.store),
    entity('ticket',q.ticket),entity('product',q.product?.text||q.product_text),entity('event',scope.event)
  ].filter(Boolean);
  // RAW14T · NHC: una consulta multientidad debe dejar en la memoria TODAS las entidades
  // tipadas, no solo los campos singulares. Así «Esther» sigue siendo recuperable aunque el
  // turno original fuera people:["Colty","Esther"] o stores:[...].
  for(const [role,key] of [['person','people'],['responsible','responsibles'],['donor','donors'],['store','stores'],['ticket','tickets']]){
    for(const raw of arr(q?.[key])){const value=trim(raw?.text||raw);if(value)entities.push({role,value});}
  }
  for(const e of arr(scope.events))if(trim(e?.name||e))entities.push({role:'event',value:trim(e?.name||e)});
  const deduped=[],seen=new Set();for(const e of entities){const k=`${norm(e.role)}:${norm(e.value)}`;if(!k||seen.has(k))continue;seen.add(k);deduped.push(e);}
  return{
    action:trim(plan.action||turn.actionType),domain:trim(q.domain||arr(q.targets)[0]?.domain||exec.domain),responseKind:trim(plan.response_kind),
    entities:deduped,scopeKind:trim(scope.kind||exec.scope?.kind),scopeEvent:trim(scope.event||exec.scope?.event),
    operations:arr(plan.local?.operations).map(o=>({type:trim(o?.type),field:trim(o?.field||o?.group_field),value:trim(o?.value||o?.reference)})).filter(o=>o.type)
  };
}


function memoryPlanSignature(turn={}){
  const plan=turn.normalizedPlan||{},q=plan.query||{},sig={action:trim(plan.action||turn.actionType),response_kind:trim(plan.response_kind)};
  if(sig.action==='query'){
    sig.targets=arr(q.targets).map(x=>trim(x?.domain)).filter(Boolean);
    sig.scope=q.scope||{};
    for(const k of ['people_mode','person','responsible','donor','store','ticket','purchase_status'])if(trim(q?.[k]))sig[k]=trim(q[k]);
    for(const k of ['people','responsibles','donors','stores','tickets','purchase_statuses']){const vals=uniqueNorm(q?.[k]);if(vals.length)sig[k]=vals.slice(0,24);}
    if(trim(q?.product?.text))sig.product={text:trim(q.product.text),match:trim(q.product.match)};
    const ops=arr(q.operations).map(o=>({type:trim(o?.type),field:trim(o?.field||o?.group_field),metric:trim(o?.metric),metric_role:trim(o?.metric_role),value:trim(o?.value||o?.reference)})).filter(o=>o.type);if(ops.length)sig.operations=ops.slice(0,12);
  }else if(sig.action==='local'){
    const ops=arr(plan?.local?.operations).map(o=>({type:trim(o?.type),field:trim(o?.field||o?.group_field),metric:trim(o?.metric),metric_role:trim(o?.metric_role),value:trim(o?.value||o?.reference)})).filter(o=>o.type);if(ops.length)sig.operations=ops.slice(0,12);
  }
  Object.keys(sig).forEach(k=>{if(sig[k]===''||(Array.isArray(sig[k])&&!sig[k].length))delete sig[k];});
  return sig;
}
function memoryRowBucket(n=0){const v=Math.max(0,Number(n)||0);if(v===0)return'0';if(v===1)return'1';if(v<=5)return'2-5';if(v<=20)return'6-20';if(v<=100)return'21-100';return'100+';}
function memoryExperienceSignature(turn={},memory={}){
  const plan=turn.normalizedPlan||{},q=plan.query||{},exec=turn.execution||{},tags=semanticTagsFromTurn(turn),m=memory||{};
  const domains=uniqueNorm([...arr(q.targets).map(x=>trim(x?.domain)),trim(tags.domain),trim(exec.domain)]).filter(Boolean).sort();
  const entityRoles=uniqueNorm(arr(tags.entities).map(e=>trim(e?.role))).filter(Boolean).sort();
  const operations=uniqueNorm([...arr(q.operations),...arr(plan?.local?.operations)].map(o=>trim(o?.type))).filter(Boolean).sort();
  // RAW14T · huella anónima: describe QUÉ forma de trabajo fue útil, nunca QUIÉN la hizo
  // ni los valores literales de PERSON/EVENT/STORE/PRODUCT. Es la semilla de Experiencia CE.
  const shape={
    action:trim(plan.action||turn.actionType),
    domains,scope_kind:trim(q?.scope?.kind||exec?.scope?.kind),response_kind:trim(plan.response_kind),
    entity_roles:entityRoles,entity_count:arr(tags.entities).length,operation_types:operations,
    memory_kind:trim(m.kind),row_bucket:memoryRowBucket(exec?.row_count)
  };
  Object.keys(shape).forEach(k=>{if(shape[k]===''||(Array.isArray(shape[k])&&!shape[k].length))delete shape[k];});
  return{...shape,shape_id:fingerprint(shape)};
}
export function deriveZuzuExperienceSignature(turn={}){const m=memoryProjectionForTurn(turn);return memoryExperienceSignature(turn,m);}

function memoryIsTechnicalTurn(turn={}){
  const action=trim(turn.actionType||turn.normalizedPlan?.action),status=trim(turn.status),exec=turn.execution||{},kind=trim(turn.normalizedPlan?.conversation?.kind),answer=norm(turn.answer),note=norm(turn.normalizedPlan?.conversation?.note);
  if(status==='KO'||action==='compile_error'||exec?.error||exec?.gemini_final_error||trim(exec?.response_mode)==='gemini_dual_presentation_failed')return true;
  if(['incoherent_input','incoherent_progress','irrelevant_input','system_complaint','clarify'].includes(kind))return true;
  if(note.includes('voice noise')||answer.includes('no pudo interpretar')||answer.includes('no pudo emitir')||answer.includes('fallo tecnico')||answer.includes('no he podido procesar'))return true;
  if(exec?.memory_episode)return true; // recordar un recuerdo no genera otro recuerdo recursivo.
  return false;
}
function memoryLocalHasSubstance(turn={}){
  const ops=arr(turn.normalizedPlan?.local?.operations),types=new Set(ops.map(o=>trim(o?.type)));
  if(!types.size)return false;
  // Cambios puramente visuales/mecánicos no merecen ocupar memoria episódica.
  const onlyPresentation=[...types].every(t=>['show_table','compact_table','set_fields','add_field','add_fields','remove_field','remove_fields','show_all_fields','sort','limit','chart','clear_filters'].includes(t));
  if(onlyPresentation)return false;
  return [...types].some(t=>['filter','group','rank','compare'].includes(t));
}
function memoryProjectionForTurn(turn={}){
  const action=trim(turn.actionType||turn.normalizedPlan?.action),answer=trim(turn.answer),prompt=trim(turn.userPrompt),exec=turn.execution||{},tags=semanticTagsFromTurn(turn),entities=arr(tags.entities),sig=memoryPlanSignature(turn);
  if(memoryIsTechnicalTurn(turn)){const base={recallable:false,quality:0,summary:'',entities:[],planSignature:sig,kind:'technical',visibility:'private'};return{...base,experienceSignature:memoryExperienceSignature(turn,base)};}
  let quality=0,kind='other';
  if(['query','reference','inspect'].includes(action)){quality=2;kind='business';if((Number(exec.row_count)||0)>0||entities.length||answer.length>220)quality=3;}
  else if(action==='local'&&memoryLocalHasSubstance(turn)){quality=2;kind='business_transform';}
  else if(action==='conversation'){
    const ck=trim(turn.normalizedPlan?.conversation?.kind);
    if(ck==='general'&&prompt.length>=18&&answer.length>=100){quality=2;kind='social';}
  }
  if(!answer||answer.length<28)quality=0;
  const recallable=quality>=2;
  if(!recallable){const base={recallable:false,quality,summary:'',entities,planSignature:sig,kind,visibility:'private'};return{...base,experienceSignature:memoryExperienceSignature(turn,base)};}
  const scope=exec.scope||turn.normalizedPlan?.query?.scope||{},domain=trim(exec.domain||tags.domain),scopeText=trim(scope.event)||arr(scope.events).map(trim).filter(Boolean).join(' / ')||(scope.kind==='all_events'?'todos los eventos':trim(scope.kind));
  const entityText=entities.map(e=>`${trim(e.role)}=${trim(e.value)}`).filter(x=>!x.endsWith('=')).slice(0,8).join(' · ');
  const lines=[
    clip(turn.title||domain||'Conversación Zuzu',140),
    `Tema: ${[domain,scopeText,entityText].filter(Boolean).join(' · ')||'conversación general'}`,
    `Pregunta: ${clip(prompt,300)}`,
    `Respuesta: ${clip(answer,520)}`
  ].filter(Boolean).slice(0,5);
  const base={recallable:true,quality,summary:lines.join('\n'),entities,planSignature:sig,kind,visibility:'private'};return{...base,experienceSignature:memoryExperienceSignature(turn,base)};
}
export function deriveZuzuMemoryProjection(turn={}){return memoryProjectionForTurn(turn);}

async function persistTurnMemoryProjection(turnId='',memory={}){
  const id=trim(turnId);if(!id)return;
  const base={memory_recallable:memory.recallable===true,memory_quality:Number(memory.quality)||0,memory_summary:trim(memory.summary),memory_entities:arr(memory.entities),memory_plan_signature:memory.planSignature||{},memory_kind:trim(memory.kind)};
  try{
    const {error}=await db().from(T_TURN).update({...base,memory_visibility:trim(memory.visibility)||'private',memory_experience_signature:memory.experienceSignature||{}}).eq('turn_id',id);
    if(error)throw error;
  }catch(error){
    if(isMissingColumn(error)){const {error:e2}=await db().from(T_TURN).update(base).eq('turn_id',id);if(e2&&!isMissingColumn(e2)&&!isMissingTable(e2))throw e2;return;}
    if(!isMissingTable(error))throw error;
  }
}
function memoryItemFromTurn(conversation,turn,memory={}){
  const exec=turn.execution||{},m=memory?.summary!==undefined?memory:memoryProjectionForTurn(turn);
  return{conversationId:trim(conversation?.conversationId||turn.conversationId),turnId:turn.turnId,seq:turn.seq,createdAt:turn.createdAt,userPrompt:turn.userPrompt,title:turn.title,answer:turn.answer,actionType:turn.actionType,domain:trim(exec.domain),scope:exec.scope||{},focus:exec.focus||{},semanticTags:semanticTagsFromTurn(turn),rowCount:Number(exec.row_count)||0,summary:trim(m.summary),memoryQuality:Number(m.quality)||0,memoryKind:trim(m.kind),memoryEntities:arr(m.entities),planSignature:m.planSignature||{},memoryVisibility:trim(m.visibility||turn.memoryVisibility)||'private',experienceSignature:m.experienceSignature||turn.memoryExperienceSignature||{},memorySource:'db'};
}
async function updateHistoryIndex(){
  // RAW14T: histórico = tablas persistentes. Deliberadamente NO escribimos índice de recuerdos en ce_meta.
  // El nombre se mantiene para no alterar el flujo de append; la proyección ya quedó persistida en ce_zuzu_turns.
  return;
}
function episodeSummaryFromItems(items=[]){
  const ordered=arr(items).slice().sort((a,b)=>text(a.createdAt).localeCompare(text(b.createdAt))),topics=[],entities=[];
  for(const x of ordered){
    const t=trim(x.title)||trim(x.domain);if(t&&!topics.some(y=>norm(y)===norm(t)))topics.push(t);
    for(const e of arr(x.memoryEntities||x.semanticTags?.entities)){const v=trim(e?.value||e);if(v&&!entities.some(y=>norm(y)===norm(v)))entities.push(v);}
  }
  const lines=[];if(ordered.length)lines.push(`Conversación con ${ordered.length} recuerdo${ordered.length===1?'':'s'} sustancial${ordered.length===1?'':'es'}, de ${ordered[0].createdAt||'fecha desconocida'} a ${ordered[ordered.length-1].createdAt||'fecha desconocida'}.`);
  if(topics.length)lines.push(`Temas: ${topics.slice(0,8).join(' → ')}${topics.length>8?'…':''}.`);
  if(entities.length)lines.push(`Referencias principales: ${entities.slice(0,10).join(', ')}${entities.length>10?'…':''}.`);
  return{conversation_summary:lines.slice(0,5).join('\n'),main_topics:topics.slice(0,16),main_entities:entities.slice(0,24),recallable_turns:ordered.length};
}
async function updateConversationMemoryProjection({conversation,turn,actor,memory}={}){
  const uid=actorId(actor);if(!uid||!conversation)return null;
  let turns=[];
  try{turns=await tableListTurns(conversation.conversationId,1000);}catch(error){if(isMissingTable(error))return null;throw error;}
  const items=[];
  for(const t of turns){
    const recomputed=memoryProjectionForTurn(t),stored=(t.memorySummary||t.memoryQuality)?{recallable:t.memoryRecallable,quality:t.memoryQuality,summary:t.memorySummary,entities:t.memoryEntities,planSignature:t.memoryPlanSignature,kind:t.memoryKind,visibility:t.memoryVisibility,experienceSignature:t.memoryExperienceSignature}:null;
    const mem=recomputed.recallable?recomputed:(stored?.recallable&&Number(stored.quality)>=2&&trim(stored.summary)?stored:recomputed);
    if(mem.recallable)items.push(memoryItemFromTurn(conversation,t,mem));
  }
  const summary=episodeSummaryFromItems(items),episode={conversation_id:conversation.conversationId,user_id:uid,user_name:actorName(actor),started_at:items.length?items.map(x=>x.createdAt).sort()[0]:trim(conversation.createdAt),updated_at:trim(conversation.updatedAt)||now(),memory_source:'db',memory_visibility:trim(conversation.memoryVisibility)||'private',...summary,turn_refs:items.slice().sort((a,b)=>Number(a.seq)-Number(b.seq)).map(x=>x.turnId)};
  try{
    const {error}=await db().from(T_CONV).update({memory_summary:summary.conversation_summary,memory_main_topics:summary.main_topics,memory_main_entities:summary.main_entities,memory_recallable_turns:summary.recallable_turns}).eq('conversation_id',conversation.conversationId);
    if(error)throw error;
  }catch(error){if(!isMissingColumn(error)&&!isMissingTable(error))throw error;}
  return episode;
}

const STOP=new Set('ahora antes despues luego este esta esto esa ese esos esas aquel aquella aquellos aquellas te acuerdas recuerdas recordar hablamos conversacion conversaciones sobre cosa cosas algo aquello volver vuelve dame dime lo la los las un una unos unas de del al en y o que me nos se si por para con ya fue era es son estuvimos estaba estaban hoy ayer anteayer ultimamente recientemente poco minutos minuto horas hora rato semana semanas mes meses ano anos dia dias manana tarde noche'.split(' '));
function tokens(v=''){return norm(v).split(' ').filter(x=>x.length>2&&!STOP.has(x)).map(x=>x.length>5&&x.endsWith('es')?x.slice(0,-2):x.length>4&&x.endsWith('s')?x.slice(0,-1):x); }
function tokenHitScore(q,source,weight=1){const set=new Set(tokens(source));let n=0;for(const t of q)if(set.has(t))n+=(t.length>=6?2:1)*weight;return n;}
function historyScore(prompt='',item={}){
  const q=tokens(prompt);if(!q.length)return 0;
  const direct=tokenHitScore(q,item.userPrompt||'',5);
  const semantic=tokenHitScore(q,`${JSON.stringify(item.semanticTags||{})} ${JSON.stringify(item.planSignature||{})}`,4);
  const focus=tokenHitScore(q,JSON.stringify(item.focus||{}),2);
  const descriptive=tokenHitScore(q,`${item.title||''} ${item.summary||''} ${item.conversationSummary||''} ${JSON.stringify(item.scope||{})}`,2);
  let score=(direct+semantic+focus+descriptive)/Math.max(1,new Set(q).size);
  const action=norm(item.actionType||item.semanticTags?.action);
  if(['query','reference'].includes(action))score+=0.35;
  if(Number(item.memoryQuality)>=3)score+=0.25;
  if(['clarify','conversation'].includes(action))score-=0.35;
  if(/\b(?:principio|comienzo|inicio|primer[oa]?)\b/i.test(trim(prompt)))score+=1/Math.max(1,Number(item.seq)||1);
  return Math.max(0,score);
}
const MEMORY_MONTHS={enero:0,febrero:1,marzo:2,abril:3,mayo:4,junio:5,julio:6,agosto:7,septiembre:8,setiembre:8,octubre:9,noviembre:10,diciembre:11};
const MEMORY_NUMBERS={un:1,uno:1,una:1,dos:2,tres:3,cuatro:4,cinco:5,seis:6,siete:7,ocho:8,nueve:9,diez:10,once:11,doce:12};
function memoryNumber(raw=''){const n=Number(raw);if(Number.isFinite(n))return n;return MEMORY_NUMBERS[norm(raw)]||0;}
function memoryUtc(y,m,d,h=0,min=0,sec=0){return Date.UTC(y,m,d,h,min,sec,0);}
function memoryAddDays(ms,days){return ms+Number(days)*86400000;}
export function resolveZuzuMemoryTimeWindow(prompt='',nowIso=''){
  const raw=trim(prompt),n=norm(raw),nowDate=new Date(trim(nowIso)||Date.now());if(Number.isNaN(nowDate.getTime()))return null;
  const nowMs=nowDate.getTime(),y=nowDate.getUTCFullYear(),m=nowDate.getUTCMonth(),d=nowDate.getUTCDate(),today=memoryUtc(y,m,d),dayWindow=(offset,label)=>({startMs:memoryAddDays(today,offset),endMs:memoryAddDays(today,offset+1)-1,label});
  let w=null;
  // RAW14T: referencias humanas recientes que aparecieron en las pruebas reales.
  if(/\b(?:hace\s+unos?\s+minutos?|hace\s+un\s+rato|hace\s+unos?\s+instantes?)\b/.test(n))w={startMs:nowMs-2*3600000,endMs:nowMs,label:'hace un rato'};
  else if(/\bhace\s+unas?\s+horas?\b/.test(n))w={startMs:nowMs-12*3600000,endMs:nowMs,label:'hace unas horas'};
  else if(/\b(?:ultimamente|recientemente|hace\s+poco)\b/.test(n))w={startMs:nowMs-7*86400000,endMs:nowMs,label:'últimamente'};
  else if(/\banteayer\b/.test(n))w=dayWindow(-2,'anteayer');
  else if(/\bayer\b/.test(n))w=dayWindow(-1,'ayer');
  else if(/\bhoy\b/.test(n))w=dayWindow(0,'hoy');
  else{
    const ago=n.match(/\bhace\s+(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce)\s+(dia|dias|semana|semanas|mes|meses)\b/);
    if(ago){const num=Math.max(1,memoryNumber(ago[1]));if(ago[2].startsWith('dia'))w=dayWindow(-num,`hace ${num} día${num===1?'':'s'}`);else if(ago[2].startsWith('semana')){const end=memoryAddDays(today,-7*num+1)-1,start=memoryAddDays(end+1,-7);w={startMs:start,endMs:end,label:`hace ${num} semana${num===1?'':'s'}`};}else{const target=new Date(memoryUtc(y,m-num,d));w={startMs:memoryUtc(target.getUTCFullYear(),target.getUTCMonth(),1),endMs:memoryUtc(target.getUTCFullYear(),target.getUTCMonth()+1,1)-1,label:`hace ${num} mes${num===1?'':'es'}`};}}
  }
  if(!w&&/\b(?:la\s+)?semana\s+pasada\b/.test(n)){const dow=(new Date(today).getUTCDay()+6)%7,startThis=memoryAddDays(today,-dow);w={startMs:memoryAddDays(startThis,-7),endMs:startThis-1,label:'la semana pasada'};}
  if(!w&&/\b(?:el\s+)?mes\s+pasado\b/.test(n)){w={startMs:memoryUtc(y,m-1,1),endMs:memoryUtc(y,m,1)-1,label:'el mes pasado'};}
  if(!w&&/\b(?:el\s+)?ano\s+pasado(?:\s+(?:por\s+estas\s+fechas|por\s+ahora|a\s+estas\s+alturas|por\s+entonces))\b/.test(n)){const center=memoryUtc(y-1,m,d);w={startMs:memoryAddDays(center,-15),endMs:memoryAddDays(center,16)-1,label:'el año pasado por estas fechas'};}
  if(!w&&/\b(?:esta\s+manana|esta\s+tarde|esta\s+noche)\b/.test(n))w=dayWindow(0,'hoy');
  if(!w&&/\b(?:el\s+)?otro\s+dia\b/.test(n))w={startMs:memoryAddDays(today,-7),endMs:today-1,label:'el otro día'};
  if(!w){
    for(const [monthName,month] of Object.entries(MEMORY_MONTHS)){
      if(!new RegExp(`\\b${monthName}\\b`).test(n))continue;
      const ym=n.match(new RegExp(`\\b${monthName}\\s+(?:de\\s+)?(20\\d{2})\\b`)),yy=ym?Number(ym[1]):(month>m?y-1:y);
      w={startMs:memoryUtc(yy,month,1),endMs:memoryUtc(yy,month+1,1)-1,label:`${monthName} de ${yy}`};break;
    }
  }
  if(!w)return null;
  const daypart=/\bmadrugada\b/.test(n)?[0,6,'de madrugada']:/\bmanana\b/.test(n)?[6,12,'por la mañana']:/\btarde\b/.test(n)?[12,20,'por la tarde']:/\bnoche\b/.test(n)?[20,24,'por la noche']:null;
  if(daypart&&w.endMs-w.startMs<172800000){const base=new Date(w.startMs),yy=base.getUTCFullYear(),mm=base.getUTCMonth(),dd=base.getUTCDate();w={startMs:memoryUtc(yy,mm,dd,daypart[0]),endMs:memoryUtc(yy,mm,dd,daypart[1])-1,label:`${w.label} ${daypart[2]}`};}
  return{...w,start:new Date(w.startMs).toISOString(),end:new Date(w.endMs).toISOString()};
}
export function isRecallPrompt(prompt=''){
  const p=trim(prompt),n=norm(p);
  if(/\b(?:te\s+acuerdas|recuerdas|recu[eé]rdame|recu[eé]rdanos|recuerda|acu[eé]rdate|recordamos|recordad[oa]|recuerdos?|conversaci[oó]n\s+(?:pasada|anterior)|(?:aquella|esa)\s+(?:tabla|conversaci[oó]n)|aquel\s+(?:tema|d[ií]a)|lo\s+que\s+vimos|lo\s+de\s+(?:antes|otro\s+d[ií]a)|(?:retoma|retomemos)\b|(?:vuelve|volvamos|volver)\s+(?:a\s+)?(?:lo\s+de|aquel(?:la)?\s+(?:tema|conversaci[oó]n)|esa\s+conversaci[oó]n))\b/i.test(p))return true;
  // «vuelve a revisarla» NO es memoria: es una orden de revisar CURRENT. Para abrir memoria
  // exigimos una referencia humana al pasado, al hablar previo o una ventana temporal.
  return /\b(?:hablamos|hemos\s+(?:hablado|estado\s+hablando)|estuvimos\s+(?:hablando|viendo|mirando)|te\s+pregunte|me\s+dijiste|me\s+contestaste|que\s+vimos)\b/.test(n)&&/\b(?:ayer|anteayer|hoy|semana|mes|ano|dia|manana|tarde|noche|hace|pasad[oa]|ultimamente|recientemente|minutos?|horas?|rato)\b/.test(n);
}
async function memoryIndexItemsForUser(uid=''){
  // RAW14T · FUENTE ÚNICA. Si las tablas de memoria no están disponibles, Zuzu no "recuerda".
  // No se consulta ce_meta ni caché del navegador para reconstruir historia.
  const fresh=[];
  try{
    let convs=[];
    try{const res=await db().from(T_CONV).select('conversation_id,user_id,user_name,title,created_at,updated_at,memory_summary,memory_main_topics,memory_main_entities,memory_recallable_turns,memory_visibility').eq('user_id',uid).order('updated_at',{ascending:false}).limit(240);if(res.error)throw res.error;convs=arr(res.data);}
    catch(error){if(!isMissingColumn(error))throw error;const res=await db().from(T_CONV).select('conversation_id,user_id,user_name,title,created_at,updated_at,memory_summary,memory_main_topics,memory_main_entities,memory_recallable_turns').eq('user_id',uid).order('updated_at',{ascending:false}).limit(240);if(res.error)throw res.error;convs=arr(res.data);}
    const convMap=new Map(arr(convs).map(x=>[trim(x.conversation_id),publicConversation(x)])),ids=[...convMap.keys()].filter(Boolean);
    if(!ids.length)return[];
    let data=[];
    try{
      const res=await db().from(T_TURN)
        .select('turn_id,conversation_id,seq,user_prompt,action_type,gemini_plan,normalized_plan,execution,dataset_id,view_id,parent_turn_id,referenced_turn_id,status,title,answer,created_at,memory_recallable,memory_quality,memory_summary,memory_entities,memory_plan_signature,memory_kind,memory_visibility,memory_experience_signature')
        .in('conversation_id',ids).order('created_at',{ascending:false}).limit(2000);
      if(res.error)throw res.error;data=arr(res.data);
    }catch(error){
      if(!isMissingColumn(error))throw error;
      const res=await db().from(T_TURN)
        .select('turn_id,conversation_id,seq,user_prompt,action_type,gemini_plan,normalized_plan,execution,dataset_id,view_id,parent_turn_id,referenced_turn_id,status,title,answer,created_at,memory_recallable,memory_quality,memory_summary,memory_entities,memory_plan_signature,memory_kind')
        .in('conversation_id',ids).order('created_at',{ascending:false}).limit(2000);
      if(res.error)throw res.error;data=arr(res.data);
    }
    for(const r of data){
      const turn=publicTurn(r),recomputed=memoryProjectionForTurn(turn),stored=(turn.memorySummary||turn.memoryQuality)?{recallable:turn.memoryRecallable,quality:turn.memoryQuality,summary:turn.memorySummary,entities:turn.memoryEntities,planSignature:turn.memoryPlanSignature,kind:turn.memoryKind,visibility:turn.memoryVisibility,experienceSignature:turn.memoryExperienceSignature}:null;
      const mem=recomputed.recallable?recomputed:(stored?.recallable&&Number(stored.quality)>=2&&trim(stored.summary)?stored:recomputed);
      if(!mem.recallable)continue;fresh.push(memoryItemFromTurn(convMap.get(turn.conversationId)||{conversationId:turn.conversationId},turn,mem));
    }
  }catch(error){
    if(isMissingTable(error)||isMissingColumn(error))return[];
    throw error;
  }
  const out=[],seen=new Set();
  for(const item of fresh.sort((a,b)=>text(b.createdAt).localeCompare(text(a.createdAt)))){const id=trim(item?.turnId);if(!id||seen.has(id)||Number(item?.memoryQuality)<2||!trim(item?.summary))continue;seen.add(id);out.push(item);if(out.length>=2000)break;}
  return out;
}
async function memoryEpisodeMeta(conversationId=''){
  const id=trim(conversationId);if(!id)return null;
  try{const conv=await tableGetConversation(id);if(!conv)return null;return{conversation_id:id,started_at:conv.createdAt,updated_at:conv.updatedAt,conversation_summary:conv.memorySummary,main_topics:conv.memoryMainTopics,main_entities:conv.memoryMainEntities,recallable_turns:conv.memoryRecallableTurns,memory_source:'db',memory_visibility:conv.memoryVisibility||'private'};}catch(error){if(isMissingTable(error))return null;throw error;}
}
function withinMemoryWindow(item={},window=null){if(!window)return true;const ms=new Date(item.createdAt).getTime();return Number.isFinite(ms)&&ms>=window.startMs&&ms<=window.endMs;}
function memoryRecentMs(item={}){const ms=new Date(item?.createdAt).getTime();return Number.isFinite(ms)?ms:0;}
function compareMemoryCandidates(a={},b={},preferRecent=false){
  const sa=Number(a?.score)||0,sb=Number(b?.score)||0,delta=sa-sb;
  // Comportamiento humano: normalmente recordamos de lo más joven a lo más viejo.
  // Pero una pista contextual claramente mejor puede llevar el puntero más atrás.
  const semanticMargin=preferRecent?2.25:1.25;if(Math.abs(delta)>=semanticMargin)return delta>0?-1:1;
  const dateDelta=memoryRecentMs(b)-memoryRecentMs(a);if(dateDelta)return dateDelta;
  return sb-sa;
}
export async function searchZuzuHistoryCandidates({actor={},prompt='',conversationId='',limit=8,nowIso=''}={}){
  const uid=actorId(actor);if(!uid)return[];const items=await memoryIndexItemsForUser(uid),window=resolveZuzuMemoryTimeWindow(prompt,nowIso),explicit=isRecallPrompt(prompt),n=norm(prompt),broadRecent=/\b(?:ultimamente|recientemente|hace poco|hace unos minutos|hace un rato|hace unas horas)\b/.test(n),topicTerms=tokens(prompt);
  let scored=items.filter(x=>withinMemoryWindow(x,window)).map(x=>({...x,score:historyScore(prompt,x)}));
  if(explicit&&window)scored=scored.map(x=>({...x,score:Math.max(x.score,0.28+Math.min(0.3,(Number(x.memoryQuality)||2)*0.08))+(broadRecent?Math.max(0,0.95-daysAgo(x.createdAt,nowIso)*0.11):0)}));
  if(explicit&&!scored.some(x=>x.score>0)&&!window)scored=items.slice(0,120).map(x=>({...x,score:0.15+Math.min(0.2,(Number(x.memoryQuality)||2)*0.05)}));
  scored=scored.filter(x=>x.score>0).sort((a,b)=>compareMemoryCandidates(a,b,broadRecent||topicTerms.length===0));
  const out=[],seen=new Set();for(const x of scored){const k=trim(x.conversationId)||x.turnId;if(seen.has(k))continue;seen.add(k);const episode=await memoryEpisodeMeta(x.conversationId);out.push({...x,episode});if(out.length>=Math.max(1,Math.min(12,Number(limit)||8)))break;}
  return out.map((x,i)=>({ref:`H${i+1}`,conversation_id:x.conversationId,turn_id:x.turnId,seq:x.seq,created_at:x.createdAt,prompt:x.userPrompt,title:x.title,domain:x.domain,scope:x.scope,focus:x.focus,semantic_tags:x.semanticTags||{},row_count:x.rowCount,summary:x.summary,memory_quality:Number(x.memoryQuality)||0,memory_kind:trim(x.memoryKind),memory_visibility:trim(x.memoryVisibility)||'private',memory_source:'db',experience_signature:x.experienceSignature||{},plan_signature:x.planSignature||{},episode_summary:trim(x.episode?.conversation_summary),episode_started_at:trim(x.episode?.started_at),episode_updated_at:trim(x.episode?.updated_at),episode_topics:arr(x.episode?.main_topics),score:Number(x.score.toFixed(3)),time_window:window?{start:window.start,end:window.end,label:window.label}:null,same_conversation:trim(x.conversationId)===trim(conversationId)}));
}
function planSimilarityScore(plan={},item={}){
  const sig=item.planSignature||{},p=plan||{},q=p.query||{},domains=arr(q.targets).map(x=>trim(x?.domain)).filter(Boolean),oldDomains=arr(sig.targets).map(trim).filter(Boolean);let score=0;
  if(domains.length&&oldDomains.length&&domains.some(d=>oldDomains.includes(d)))score+=2.6;
  const curScope=q.scope||{},oldScope=sig.scope||{};
  if(trim(curScope.event)&&norm(curScope.event)===norm(oldScope.event))score+=2.2;
  const list=(obj,keys)=>uniqueNorm(keys.flatMap(k=>arr(obj?.[k]).length?obj[k]:trim(obj?.[k])?[obj[k]]:[]).map(x=>x?.text||x));
  const cur=list(q,['people','responsibles','donors','stores','tickets','person','responsible','donor','store','ticket','products']),old=list(sig,['people','responsibles','donors','stores','tickets','person','responsible','donor','store','ticket']);
  if(trim(q?.product?.text))cur.push(trim(q.product.text));if(trim(sig?.product?.text))old.push(trim(sig.product.text));
  for(const v of cur)if(old.some(x=>norm(x)===norm(v)))score+=1.8;
  if(trim(p.response_kind)&&norm(p.response_kind)===norm(sig.response_kind))score+=0.35;
  return score;
}
function daysAgo(createdAt='',nowIso=''){const a=new Date(createdAt).getTime(),b=new Date(trim(nowIso)||Date.now()).getTime();return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,(b-a)/86400000):99999;}
function proactiveEntityValues(plan={},prompt=''){
  const q=plan?.query||{},vals=[];
  for(const k of ['people','responsibles','donors','stores','tickets'])for(const v of arr(q?.[k])){const t=trim(v?.text||v);if(t)vals.push(t);}
  for(const k of ['person','responsible','donor','store','ticket']){const t=trim(q?.[k]);if(t)vals.push(t);}
  if(trim(q?.product?.text))vals.push(trim(q.product.text));
  // Conversación ociosa: una mención suficientemente concreta puede actuar como ancla social aunque no haya QUERY.
  if(!vals.length){for(const t of tokens(prompt))if(t.length>=5)vals.push(t);}
  return uniqueNorm(vals);
}
function proactiveItemEntityValues(item={}){
  const vals=[];
  for(const e of arr(item?.memoryEntities||item?.semanticTags?.entities)){const t=trim(e?.value||e);if(t)vals.push(t);}
  const sig=item?.planSignature||{};for(const k of ['people','responsibles','donors','stores','tickets'])for(const v of arr(sig?.[k])){const t=trim(v?.text||v);if(t)vals.push(t);}
  for(const k of ['person','responsible','donor','store','ticket']){const t=trim(sig?.[k]);if(t)vals.push(t);}
  if(trim(sig?.product?.text))vals.push(trim(sig.product.text));
  return uniqueNorm(vals);
}
function proactiveEntityOverlap(plan={},prompt='',item={}){
  const cur=proactiveEntityValues(plan,prompt),old=proactiveItemEntityValues(item);let n=0;
  for(const a of cur)if(old.some(b=>norm(a)===norm(b)))n++;return n;
}
function proactiveAgeMeta(createdAt='',nowIso='',user=''){
  const days=daysAgo(createdAt,nowIso),hours=days*24,u=trim(user)||'amigo';
  if(hours<=8)return{age_band:'few_hours',age_days:Number(days.toFixed(3)),age_label:hours<1?'hace menos de una hora':`hace ${Math.max(1,Math.round(hours))} hora${Math.round(hours)===1?'':'s'}`,human_intro:`Vaya cabecita que tienes ${u}, el tío Zuzu te lo recuerda.`};
  if(days<=4){const d=Math.max(1,Math.round(days));return{age_band:'few_days',age_days:Number(days.toFixed(3)),age_label:`hace ${d} día${d===1?'':'s'}`,human_intro:`${u}, se te ha ido un poco la olla desde hace ${d} día${d===1?'':'s'}; el tío Zuzu te refresca la memoria.`};}
  if(days<=180){const d=Math.max(5,Math.round(days));return{age_band:'days_to_months',age_days:Number(days.toFixed(3)),age_label:`hace ${d} días`,human_intro:`Madre mía, ${u}, esto ya estaba cogiendo polvo en el cajón de Zuzu; espera, que te refresco la memoria.`};}
  return{age_band:'long_ago',age_days:Number(days.toFixed(3)),age_label:`hace ${Math.max(1,Math.round(days/30))} meses`,human_intro:`Yo lo tengo fresco ${u}, ahora te cuento y te pondrás tan contento.`};
}
export async function searchZuzuProactiveMemory({actor={},prompt='',plan={},conversationId='',nowIso='',days=3650,limit=3}={}){
  const uid=actorId(actor);if(!uid)return[];const items=await memoryIndexItemsForUser(uid),maxDays=Math.max(4,Number(days)||3650),user=actorName(actor);
  const scored=items.filter(x=>trim(x.conversationId)!==trim(conversationId)&&daysAgo(x.createdAt,nowIso)<=maxDays).map(x=>{
    const age=daysAgo(x.createdAt,nowIso),overlap=proactiveEntityOverlap(plan,prompt,x),lex=historyScore(prompt,x),base=planSimilarityScore(plan,x),recencyBoost=age<=0.34?0.65:age<=4?0.35:0,score=base+lex*0.55+Math.min(2,overlap)*1.45+recencyBoost;
    const threshold=age<=0.34?2.25:age<=4?2.55:age<=180?3.6:4.5;
    const eligible=score>=threshold && (age<=4 || overlap>0 || lex>=2.2);
    return{...x,score,overlap,lex,age,eligible,ageMeta:proactiveAgeMeta(x.createdAt,nowIso,user)};
  }).filter(x=>x.eligible).sort((a,b)=>b.score-a.score||a.age-b.age||text(b.createdAt).localeCompare(text(a.createdAt)));
  const out=[],seenConversation=new Set();for(const x of scored){if(seenConversation.has(x.conversationId))continue;seenConversation.add(x.conversationId);const episode=await readZuzuMemoryEpisode({conversationId:x.conversationId,actor,matchedTurnId:x.turnId,includeAnswers:false});if(episode)out.push({...episode,match:{turn_id:x.turnId,score:Number(x.score.toFixed(3)),summary:x.summary,entity_overlap:x.overlap,lexical_score:Number(x.lex.toFixed(3))},...x.ageMeta});if(out.length>=Math.max(1,Math.min(4,Number(limit)||3)))break;}return out;
}
export async function searchZuzuSocialMemoryHints({actor={},prompt='',plan={},conversationId='',nowIso='',limit=2}={}){
  const uid=actorId(actor);if(!uid)return[];const items=await memoryIndexItemsForUser(uid);
  const scored=items.filter(x=>trim(x.conversationId)!==trim(conversationId)&&daysAgo(x.createdAt,nowIso)<=365).map(x=>({...x,score:planSimilarityScore(plan,x)*0.55+historyScore(prompt,x)*0.35+(Number(x.memoryQuality)>=3?0.2:0)})).filter(x=>x.score>=1.05).sort((a,b)=>b.score-a.score||text(b.createdAt).localeCompare(text(a.createdAt)));
  const out=[],seen=new Set();for(const x of scored){if(seen.has(x.conversationId))continue;seen.add(x.conversationId);out.push({conversation_id:x.conversationId,created_at:x.createdAt,title:x.title,summary:clip(x.summary,420),entities:arr(x.memoryEntities).slice(0,6),score:Number(x.score.toFixed(3))});if(out.length>=Math.max(1,Math.min(2,Number(limit)||2)))break;}return out;
}

export async function readZuzuMemoryEpisode({conversationId='',actor={},matchedTurnId='',includeAnswers=true,limit=500}={}){
  const uid=actorId(actor),id=safeId(conversationId);if(!uid||!id)return null;
  let conversation=null,turns=[];try{conversation=await tableGetConversation(id);if(!conversation||norm(conversation.userId)!==norm(uid))return null;turns=await tableListTurns(id,limit);}catch(error){if(isMissingTable(error))return null;throw error;}const memoryTurns=[];
  for(const t of turns){
    let mem=(t.memoryRecallable||t.memoryQuality||t.memorySummary)?{recallable:t.memoryRecallable,quality:t.memoryQuality,summary:t.memorySummary,entities:t.memoryEntities,planSignature:t.memoryPlanSignature,kind:t.memoryKind,visibility:t.memoryVisibility,experienceSignature:t.memoryExperienceSignature}:memoryProjectionForTurn(t);
    if(!mem.recallable||Number(mem.quality)<2)continue;
    memoryTurns.push({
      turn_id:t.turnId,seq:t.seq,created_at:t.createdAt,question:t.userPrompt,title:t.title,
      ...(includeAnswers?{answer:t.answer}:{}),
      summary:trim(mem.summary),memory_quality:Number(mem.quality)||0,memory_kind:trim(mem.kind),
      entities:arr(mem.entities),plan_signature:mem.planSignature||{},experience_signature:mem.experienceSignature||memoryExperienceSignature(t,mem),memory_visibility:trim(mem.visibility||t.memoryVisibility)||'private',memory_source:'db',action_type:t.actionType,
      domain:trim(t.execution?.domain),scope:t.execution?.scope||{},focus:t.execution?.focus||{},
      matched:trim(t.turnId)===trim(matchedTurnId)
    });
  }
  memoryTurns.sort((a,b)=>Number(a.seq)-Number(b.seq)||text(a.created_at).localeCompare(text(b.created_at)));
  let episode=await memoryEpisodeMeta(id);if(!episode){const items=memoryTurns.map(t=>({createdAt:t.created_at,title:t.title,domain:t.domain,memoryEntities:t.entities,semanticTags:{entities:t.entities}})),sum=episodeSummaryFromItems(items);episode={conversation_id:id,started_at:memoryTurns[0]?.created_at||conversation.createdAt,updated_at:memoryTurns[memoryTurns.length-1]?.created_at||conversation.updatedAt,...sum};}
  return{
    conversation_id:id,user_id:conversation.userId,user_name:conversation.userName,memory_source:'db',memory_visibility:conversation.memoryVisibility||'private',
    started_at:trim(episode?.started_at)||memoryTurns[0]?.created_at||conversation.createdAt,
    ended_at:memoryTurns[memoryTurns.length-1]?.created_at||conversation.updatedAt,
    conversation_summary:trim(episode?.conversation_summary)||trim(conversation.memorySummary),
    main_topics:arr(episode?.main_topics).length?arr(episode.main_topics):arr(conversation.memoryMainTopics),
    main_entities:arr(episode?.main_entities).length?arr(episode.main_entities):arr(conversation.memoryMainEntities),
    recallable_turns:memoryTurns.length,matched_turn_id:trim(matchedTurnId),turns:memoryTurns
  };
}

export async function listZuzuConversations({actor={},limit=40}={}){
  const uid=actorId(actor);if(!uid)return[];
  try{const {data,error}=await db().from(T_CONV).select('*').eq('user_id',uid).order('updated_at',{ascending:false}).limit(Math.max(1,Math.min(100,Number(limit)||40)));if(error)throw error;return arr(data).map(publicConversation);}catch(error){if(!isMissingTable(error))throw error;const items=await metaList(`${META_PREFIX}conversation:`,300);return items.map(x=>publicConversation(x.value)).filter(x=>norm(x.userId)===norm(uid)).sort((a,b)=>text(b.updatedAt).localeCompare(text(a.updatedAt))).slice(0,limit);}
}

export async function readZuzuConversation({conversationId='',actor={},limit=500}={}){
  const session=await getZuzuConversationSession({conversationId,actor,includeRows:false,recentLimit:limit});if(!session)return null;return{conversation:session.conversation,turns:session.recentTurns.map(t=>({turnId:t.turnId,seq:t.seq,userPrompt:t.userPrompt,actionType:t.actionType,status:t.status,title:t.title,answer:t.answer,createdAt:t.createdAt,datasetId:t.datasetId,viewId:t.viewId,execution:t.execution}))};
}

export async function deleteZuzuConversation({conversationId='',actor={}}={}){
  const uid=actorId(actor),id=safeId(conversationId);if(!uid||!id)return{ok:false};const conv=await withFallback(()=>tableGetConversation(id),()=>fallbackGetConversation(id));if(!conv||norm(conv.userId)!==norm(uid))return{ok:false};
  try{for(const t of [T_VIEW,T_DATA,T_TURN]){const {error}=await db().from(t).delete().eq('conversation_id',id);if(error)throw error;}const {error}=await db().from(T_CONV).delete().eq('conversation_id',id);if(error)throw error;}catch(error){if(!isMissingTable(error))throw error;const turns=await fallbackListTurns(id,500);for(const t of turns){if(t.datasetId)await metaDelete(mkey('dataset',t.datasetId));if(t.viewId)await metaDelete(mkey('view',t.viewId));await metaDelete(mkey('turn',t.turnId));}await metaDelete(mkey('conversation',id));}
  return{ok:true,conversationId:id};
}
