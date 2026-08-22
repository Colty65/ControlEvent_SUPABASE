/* ControlEvent v3_0_exp · Zuzu Conversation Ledger.
   Persistencia server-side, inmutable por turno. El navegador conserva solo conversation_id.
   Prefiere tablas dedicadas; si no existen, usa ce_meta sin bloquear la conversación. */
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

function publicConversation(r={}){return{conversationId:trim(r.conversation_id),userId:trim(r.user_id),userName:trim(r.user_name),title:trim(r.title),createdAt:trim(r.created_at),updatedAt:trim(r.updated_at),currentSeq:Number(r.current_seq)||0,currentTurnId:trim(r.current_turn_id),selectedEventId:trim(r.selected_event_id),status:trim(r.status)||'active'};}
function publicTurn(r={}){return{turnId:trim(r.turn_id),conversationId:trim(r.conversation_id),seq:Number(r.seq)||0,userPrompt:trim(r.user_prompt),actionType:trim(r.action_type),geminiPlan:r.gemini_plan||{},normalizedPlan:r.normalized_plan||{},execution:r.execution||{},datasetId:trim(r.dataset_id),viewId:trim(r.view_id),parentTurnId:trim(r.parent_turn_id),referencedTurnId:trim(r.referenced_turn_id),status:trim(r.status)||'OK',title:trim(r.title),answer:trim(r.answer),createdAt:trim(r.created_at)};}
function publicDataset(r={}){return{datasetId:trim(r.dataset_id),conversationId:trim(r.conversation_id),sourceTurnId:trim(r.source_turn_id),domain:trim(r.domain),scope:r.scope||{},rowCount:Number(r.row_count)||0,columns:arr(r.columns),rows:arr(r.rows),facts:r.facts||{},provenance:r.provenance||{},fingerprint:trim(r.fingerprint),createdAt:trim(r.created_at)};}
function publicView(r={}){return{viewId:trim(r.view_id),conversationId:trim(r.conversation_id),datasetId:trim(r.dataset_id),sourceTurnId:trim(r.source_turn_id),visibleFields:arr(r.visible_fields),sort:arr(r.sort),rowFilters:arr(r.row_filters),groupBy:arr(r.group_by),metrics:arr(r.metrics),rowLimit:r.row_limit==null?null:Number(r.row_limit),presentation:r.presentation||{},title:trim(r.title),createdAt:trim(r.created_at)};}

async function tableGetConversation(id){const {data,error}=await db().from(T_CONV).select('*').eq('conversation_id',id).maybeSingle();if(error)throw error;return data?publicConversation(data):null;}
async function tableEnsureConversation(row){const {data,error}=await db().from(T_CONV).upsert(row,{onConflict:'conversation_id'}).select('*').single();if(error)throw error;return publicConversation(data);}
async function tableGetTurn(id){const {data,error}=await db().from(T_TURN).select('*').eq('turn_id',id).maybeSingle();if(error)throw error;return data?publicTurn(data):null;}
async function tableListTurns(convId,limit=50){const {data,error}=await db().from(T_TURN).select('*').eq('conversation_id',convId).order('seq',{ascending:false}).limit(Math.max(1,Math.min(200,Number(limit)||50)));if(error)throw error;return arr(data).map(publicTurn).sort((a,b)=>a.seq-b.seq);}
async function tableGetDataset(id,{includeRows=true}={}){
  if(!id)return null;
  const projection=includeRows?'*':'dataset_id,conversation_id,source_turn_id,domain,scope,row_count,columns,facts,provenance,fingerprint,created_at';
  const {data,error}=await db().from(T_DATA).select(projection).eq('dataset_id',id).maybeSingle();if(error)throw error;return data?publicDataset(data):null;
}
async function tableGetView(id){if(!id)return null;const {data,error}=await db().from(T_VIEW).select('*').eq('view_id',id).maybeSingle();if(error)throw error;return data?publicView(data):null;}

async function fallbackGetConversation(id){const v=await metaGet(mkey('conversation',id));return v?publicConversation(v):null;}
async function fallbackGetTurn(id){const v=await metaGet(mkey('turn',id));return v?publicTurn(v):null;}
async function fallbackListTurns(convId,limit=50){const items=await metaList(`${META_PREFIX}turn:${safeId(convId)}-`,limit);return items.map(x=>publicTurn(x.value)).sort((a,b)=>a.seq-b.seq);}
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
  const savedConv=await withFallback(()=>tableEnsureConversation(crow),async()=>{await metaSet(mkey('conversation',conv.conversationId),crow);return publicConversation(crow);});
  await updateHistoryIndex({conversation:savedConv,turn:publicTurn(trow),actor});
  return{conversation:savedConv,turn:publicTurn(trow),datasetId,viewId};
}

async function updateHistoryIndex({conversation,turn,actor}={}){
  const uid=actorId(actor);if(!uid||!turn)return;const key=mkey('index',uid),old=arr(await metaGet(key));const exec=turn.execution||{};
  const item={conversationId:conversation.conversationId,turnId:turn.turnId,seq:turn.seq,createdAt:turn.createdAt,userPrompt:turn.userPrompt,title:turn.title,actionType:turn.actionType,domain:trim(exec.domain),scope:exec.scope||{},focus:exec.focus||{},rowCount:Number(exec.row_count)||0,summary:trim(exec.summary)||trim(turn.title)||trim(turn.userPrompt)};
  const next=[item,...old.filter(x=>trim(x?.turnId)!==turn.turnId)].slice(0,400);await metaSet(key,next);
}

const STOP=new Set('ahora antes despues luego este esta esto esa ese esos esas aquel aquella aquellos aquellas te acuerdas recuerdas recordar hablamos conversacion conversaciones sobre cosa cosas algo aquello volver vuelve dame dime lo la los las un una unos unas de del al en y o que me nos se si por para con ya fue era es son'.split(' '));
function tokens(v=''){return norm(v).split(' ').filter(x=>x.length>2&&!STOP.has(x));}
function historyScore(prompt='',item={}){const q=tokens(prompt),h=tokens(`${item.userPrompt||''} ${item.title||''} ${item.summary||''} ${JSON.stringify(item.focus||{})} ${JSON.stringify(item.scope||{})}`);if(!q.length||!h.length)return 0;const hs=new Set(h);let hit=0;for(const t of q)if(hs.has(t))hit+=t.length>=6?2:1;const unique=new Set(q).size;return hit/Math.max(1,unique);}
export function isRecallPrompt(prompt=''){return /\b(?:te\s+acuerdas|recuerdas|recu[eé]rdame|recu[eé]rdanos|recuerda|acu[eé]rdate|recordamos|hablamos|conversaci[oó]n\s+(?:pasada|anterior)|aquella\s+(?:tabla|conversaci[oó]n)|aquel\s+(?:tema|d[ií]a)|lo\s+que\s+vimos|lo\s+de\s+(?:antes|otro\s+d[ií]a)|(?:vuelve|volvamos|volver|retoma)\s+a(?:\s+lo\s+de)?)\b/i.test(trim(prompt));}
export async function searchZuzuHistoryCandidates({actor={},prompt='',conversationId='',limit=8}={}){
  const uid=actorId(actor);if(!uid)return[];let items=arr(await metaGet(mkey('index',uid)));
  // Si todavía no existe índice (conversaciones anteriores a esta versión), intenta poblarlo desde la tabla de turnos.
  if(!items.length){
    try{
      const {data:convs,error:ce}=await db().from(T_CONV).select('conversation_id').eq('user_id',uid).limit(300);if(ce)throw ce;const ids=arr(convs).map(x=>trim(x?.conversation_id)).filter(Boolean);
      if(ids.length){const {data,error}=await db().from(T_TURN).select('turn_id,conversation_id,seq,user_prompt,action_type,execution,title,created_at').in('conversation_id',ids).order('created_at',{ascending:false}).limit(400);if(error)throw error;items=arr(data).map(r=>({conversationId:r.conversation_id,turnId:r.turn_id,seq:r.seq,createdAt:r.created_at,userPrompt:r.user_prompt,title:r.title,actionType:r.action_type,domain:trim(r.execution?.domain),scope:r.execution?.scope||{},focus:r.execution?.focus||{},rowCount:Number(r.execution?.row_count)||0,summary:trim(r.execution?.summary)||trim(r.title)||trim(r.user_prompt)}));}
    }catch(error){if(!isMissingTable(error))throw error;}
  }
  const scored=items.map(x=>({...x,score:historyScore(prompt,x)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||text(b.createdAt).localeCompare(text(a.createdAt)));
  const out=[];const seen=new Set();for(const x of scored){const k=x.turnId;if(seen.has(k))continue;seen.add(k);out.push(x);if(out.length>=Math.max(1,Math.min(12,Number(limit)||8)))break;}
  return out.map((x,i)=>({ref:`H${i+1}`,conversation_id:x.conversationId,turn_id:x.turnId,seq:x.seq,created_at:x.createdAt,prompt:x.userPrompt,title:x.title,domain:x.domain,scope:x.scope,focus:x.focus,row_count:x.rowCount,summary:x.summary,score:Number(x.score.toFixed(3)),same_conversation:trim(x.conversationId)===trim(conversationId)}));
}

export async function listZuzuConversations({actor={},limit=40}={}){
  const uid=actorId(actor);if(!uid)return[];
  try{const {data,error}=await db().from(T_CONV).select('*').eq('user_id',uid).order('updated_at',{ascending:false}).limit(Math.max(1,Math.min(100,Number(limit)||40)));if(error)throw error;return arr(data).map(publicConversation);}catch(error){if(!isMissingTable(error))throw error;const items=await metaList(`${META_PREFIX}conversation:`,300);return items.map(x=>publicConversation(x.value)).filter(x=>norm(x.userId)===norm(uid)).sort((a,b)=>text(b.updatedAt).localeCompare(text(a.updatedAt))).slice(0,limit);}
}

export async function readZuzuConversation({conversationId='',actor={},limit=100}={}){
  const session=await getZuzuConversationSession({conversationId,actor,includeRows:false,recentLimit:limit});if(!session)return null;return{conversation:session.conversation,turns:session.recentTurns.map(t=>({turnId:t.turnId,seq:t.seq,userPrompt:t.userPrompt,actionType:t.actionType,status:t.status,title:t.title,answer:t.answer,createdAt:t.createdAt,datasetId:t.datasetId,viewId:t.viewId,execution:t.execution}))};
}

export async function deleteZuzuConversation({conversationId='',actor={}}={}){
  const uid=actorId(actor),id=safeId(conversationId);if(!uid||!id)return{ok:false};const conv=await withFallback(()=>tableGetConversation(id),()=>fallbackGetConversation(id));if(!conv||norm(conv.userId)!==norm(uid))return{ok:false};
  try{for(const t of [T_VIEW,T_DATA,T_TURN]){const {error}=await db().from(t).delete().eq('conversation_id',id);if(error)throw error;}const {error}=await db().from(T_CONV).delete().eq('conversation_id',id);if(error)throw error;}catch(error){if(!isMissingTable(error))throw error;const turns=await fallbackListTurns(id,500);for(const t of turns){if(t.datasetId)await metaDelete(mkey('dataset',t.datasetId));if(t.viewId)await metaDelete(mkey('view',t.viewId));await metaDelete(mkey('turn',t.turnId));}await metaDelete(mkey('conversation',id));}
  return{ok:true,conversationId:id};
}
