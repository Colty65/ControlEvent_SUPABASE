/* ControlEvent v4_0_exp · Histórico persistente ITV Zuzu.
   Prefiere tabla dedicada ce_zuzu_test_runs. Si todavía no se ha creado,
   usa ce_meta como compatibilidad inmediata sin bloquear la ITV. */
import { getSupabaseAdmin } from '../lib/supabase.js';

const TABLE='ce_zuzu_test_runs';
const META_KEY='zuzu_itv_runs_v1';
const text=v=>v==null?'':String(v);
const trim=v=>text(v).trim();
const arr=v=>Array.isArray(v)?v:[];
const now=()=>new Date().toISOString();
const db=()=>getSupabaseAdmin();
const maxRuns=18;

function isMissingTable(error){
  const s=`${error?.code||''} ${error?.message||''}`.toLowerCase();
  return s.includes('42p01')||s.includes('does not exist')||s.includes('not found')||s.includes('schema cache');
}
function normalizeRun(payload={},actor={}){
  const seed=Math.abs(Math.trunc(Number(payload.seed)||0))>>>0;
  const runKey=trim(payload.runKey)||`seed-${seed}-${Date.now()}`;
  return {
    run_key:runKey,
    seed,
    battery_clock:trim(payload.batteryClock),
    app_version:trim(payload.appVersion)||'v4_0_exp',
    created_by:trim(actor.identificacion||actor.Identificacion),
    generated_at:trim(payload.generatedAt||payload.generatedBattery?.generatedAt)||now(),
    data_counts:payload.dataCounts||payload.generatedBattery?.dataCounts||{},
    generated_battery:payload.generatedBattery||{},
    report:payload.report||{},
    summary:payload.summary||{},
    updated_at:now()
  };
}
function publicRow(r={}){
  return {runKey:trim(r.run_key),seed:Number(r.seed)||0,batteryClock:trim(r.battery_clock),appVersion:trim(r.app_version),createdBy:trim(r.created_by),generatedAt:trim(r.generated_at),updatedAt:trim(r.updated_at),dataCounts:r.data_counts||{},summary:r.summary||{},generatedBattery:r.generated_battery||{},report:r.report||{}};
}

async function tableSave(row){
  const {data,error}=await db().from(TABLE).upsert(row,{onConflict:'run_key'}).select('*').single();
  if(error)throw error;return publicRow(data);
}
async function metaLoad(){
  const {data,error}=await db().from('ce_meta').select('value').eq('key',META_KEY).maybeSingle();
  if(error)throw error;return arr(data?.value);
}
async function metaSave(rows){
  const {error}=await db().from('ce_meta').upsert({key:META_KEY,value:arr(rows).slice(0,maxRuns)},{onConflict:'key'});
  if(error)throw error;
}

export async function saveZuzuTestRun(payload={},actor={}){
  const row=normalizeRun(payload,actor);
  try{return {ok:true,storage:'ce_zuzu_test_runs',run:await tableSave(row)};}
  catch(error){
    if(!isMissingTable(error))throw error;
    const rows=await metaLoad();
    const next=[row,...rows.filter(r=>trim(r?.run_key)!==row.run_key)].sort((a,b)=>text(b.updated_at).localeCompare(text(a.updated_at))).slice(0,maxRuns);
    await metaSave(next);
    return {ok:true,storage:'ce_meta-fallback',run:publicRow(row),warning:'La tabla ce_zuzu_test_runs no existe todavía; se usa ce_meta como histórico compatible.'};
  }
}

export async function listZuzuTestRuns(limit=30){
  const lim=Math.max(1,Math.min(60,Number(limit)||30));
  try{
    const {data,error}=await db().from(TABLE).select('run_key,seed,battery_clock,app_version,created_by,generated_at,updated_at,data_counts,summary').order('updated_at',{ascending:false}).limit(lim);
    if(error)throw error;return {ok:true,storage:'ce_zuzu_test_runs',runs:arr(data).map(publicRow)};
  }catch(error){
    if(!isMissingTable(error))throw error;
    const rows=(await metaLoad()).sort((a,b)=>text(b.updated_at).localeCompare(text(a.updated_at))).slice(0,lim);
    return {ok:true,storage:'ce_meta-fallback',runs:rows.map(r=>{const x=publicRow(r);delete x.generatedBattery;delete x.report;return x;}),warning:'Histórico en ce_meta hasta crear ce_zuzu_test_runs.'};
  }
}

export async function getZuzuTestRun(runKey=''){
  const key=trim(runKey);if(!key){const e=new Error('Falta runKey.');e.status=400;throw e;}
  try{
    const {data,error}=await db().from(TABLE).select('*').eq('run_key',key).maybeSingle();
    if(error)throw error;if(!data){const e=new Error('Batería histórica no encontrada.');e.status=404;throw e;}return {ok:true,storage:'ce_zuzu_test_runs',run:publicRow(data)};
  }catch(error){
    if(!isMissingTable(error))throw error;
    const hit=(await metaLoad()).find(r=>trim(r?.run_key)===key);if(!hit){const e=new Error('Batería histórica no encontrada.');e.status=404;throw e;}
    return {ok:true,storage:'ce_meta-fallback',run:publicRow(hit)};
  }
}


export async function deleteZuzuTestRun(runKey=''){
  const key=trim(runKey);if(!key){const e=new Error('Falta runKey.');e.status=400;throw e;}
  try{
    const {error}=await db().from(TABLE).delete().eq('run_key',key);
    if(error)throw error;
    return {ok:true,storage:'ce_zuzu_test_runs',runKey:key};
  }catch(error){
    if(!isMissingTable(error))throw error;
    const rows=await metaLoad();
    const next=rows.filter(r=>trim(r?.run_key)!==key);
    await metaSave(next);
    return {ok:true,storage:'ce_meta-fallback',runKey:key};
  }
}
