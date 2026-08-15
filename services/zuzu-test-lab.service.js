/* ControlEvent v1.0_exp · Laboratorio/ITV de Zuzu.
   SOLO LECTURA. Genera pruebas desde los datos REALES de ControlEvent.
   FAST no llama a Gemini. AI-SMOKE y FULL-CERT tienen presupuesto duro configurable. */
import { getState } from './state.service.js';
import { listUsers } from './auth.service.js';
import { analyzeEventPrompt, __zuzuStructuralTesting as Z } from './event-ai.service.js';

const arr = v => Array.isArray(v) ? v : [];
const text = v => v == null ? '' : String(v);
const trim = v => text(v).trim();
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const round = (v,d=2) => Number(num(v).toFixed(d));
const norm = v => trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const key = v => norm(v).replace(/\s+/g,'-').slice(0,48) || 'x';
const moneyEq = (a,b) => Math.abs(num(a)-num(b)) < 0.011;
const nowIso = () => new Date().toISOString();

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
  const c=result?.meta?.resultContext||{};
  return arr(c.eventNames || c.events || c.event_names).concat(trim(c.event || c.eventName || c.event_name)?[trim(c.event || c.eventName || c.event_name)]:[]).filter(Boolean);
}
function resultHasEvent(result,name){ return resultContextEvents(result).some(x=>norm(x)===norm(name)) || answerHasName(result,name); }
function resultHasPerson(result,name){
  const c=result?.meta?.resultContext||{};
  const p=trim(c.person || c.subject || c.personName || c.person_name);
  return (p && norm(p)===norm(name)) || answerHasName(result,name);
}
function usageOf(result){
  const u=result?.meta?.geminiUsageEstimate||{};
  return {calls:num(u.calls),tokens:num(u.totalTokens||u.totalTokenCount),costEur:round(u.costEurApprox,6),costUsd:round(u.costUsdApprox,6)};
}
function findTable(result,keyName){ return arr(result?.tables).find(t=>trim(t?.key)===keyName) || null; }
function toolTable(tool,keyName){ return arr(tool?.tables).find(t=>trim(t?.key)===keyName) || null; }
function compactCase(c){ return {id:c.id,group:c.group,label:c.label,prompt:c.prompt||'',expected:c.expected||'',meta:c.meta||{}}; }

function makeCase({id,group,label,prompt='',expected='',meta={},run}){ return {id,group,label,prompt,expected,meta,run}; }
function outcome(c,status,actual,extra={}){ return {id:c.id,group:c.group,label:c.label,prompt:c.prompt||'',expected:c.expected||'',actual:trim(actual),status,...extra}; }

async function buildRealFastCases(state){
  const events=arr(state?.eventos).filter(e=>trim(e?.id)&&eventName(e));
  const people=arr(state?.personas).filter(p=>trim(p?.id)&&personName(p) && !/^z[_ -]?dev/i.test(personName(p)));
  const purchasesByEvent=new Map();
  for(const r of arr(state?.compras)){ const eid=eventIdOf(r); if(eid) purchasesByEvent.set(eid,(purchasesByEvent.get(eid)||0)+1); }
  const cases=[];

  for(const ev of events){
    const title=eventName(ev), eid=trim(ev.id);
    cases.push(makeCase({id:`event-resolve-${key(eid)}`,group:'EVENTOS',label:`Resolver evento exacto · ${title}`,expected:title,run:async function(){
      const r=Z.semanticResolveEntity(state,'event',title); return outcome(this,r?.ok&&trim(r.id)===eid?'OK':'KO',r?.ok?`${r.nombre} [${r.id}]`:r?.error||'No resuelto');
    }}));
    cases.push(makeCase({id:`event-dossier-${key(eid)}`,group:'EVENTOS',label:`Dossier canónico · ${title}`,expected:`event=${title}`,run:async function(){
      const r=await Z.v26ExecuteTool({id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid);
      const ok=r?.ok!==false && norm(r?.facts?.event)===norm(title);
      return outcome(this,ok?'OK':'KO',`${r?.facts?.event||'sin evento'} · ingresos=${r?.facts?.income_total??'—'} · compras=${r?.facts?.purchases_realized??'—'}`);
    }}));
    cases.push(makeCase({id:`event-people-${key(eid)}`,group:'PERSONAS',label:`Asistencia/dossier coherentes · ${title}`,expected:'Mismo evento y asistencia no negativa',run:async function(){
      const [d,p]=await Promise.all([
        Z.v26ExecuteTool({id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid),
        Z.v26ExecuteTool({id:'fast_p',name:'event_people',event:title,scope:'named_event',detail:'brief'},state,eid)
      ]);
      const same=norm(d?.facts?.event)===norm(p?.facts?.event), dv=num(d?.facts?.attendees_canonical), pv=num(p?.facts?.attendees_canonical);
      return outcome(this,same&&dv>=0&&pv>=0&&Math.abs(dv-pv)<0.001?'OK':'KO',`dossier=${dv}; people=${pv}; evento=${p?.facts?.event||'—'}`);
    }}));
    if(purchasesByEvent.get(eid)) cases.push(makeCase({id:`event-purchases-${key(eid)}`,group:'COMPRAS',label:`Compras coherentes · ${title}`,expected:'Dossier = desglose; MAX/MIN/SUM consistentes',run:async function(){
      const [d,b]=await Promise.all([
        Z.v26ExecuteTool({id:'fast_d',name:'event_dossier',event:title,scope:'named_event',detail:'brief'},state,eid),
        Z.v26ExecuteTool({id:'fast_b',name:'event_breakdowns',event:title,scope:'named_event',detail:'full'},state,eid)
      ]);
      const rows=arr(toolTable(b,'products_cost')?.rows), sum=round(rows.reduce((a,r)=>a+num(r.Importe),0),2), max=rows.slice().sort((a,b)=>num(b.Importe)-num(a.Importe))[0], min=rows.filter(r=>Number.isFinite(Number(r.Importe))).slice().sort((a,b)=>num(a.Importe)-num(b.Importe))[0];
      const base=round(d?.facts?.purchases_realized,2), breakdown=round(b?.facts?.purchases_realized,2);
      const sumCheck=rows.length<20 ? moneyEq(sum,breakdown) : sum<=breakdown+0.011; // tabla puede estar limitada a top20
      const ok=moneyEq(base,breakdown)&&sumCheck&&(!max||num(max.Importe)>=num(min?.Importe));
      return outcome(this,ok?'OK':'KO',`dossier=${base}; desglose=${breakdown}; productos=${rows.length}; suma_tabla=${sum}; max=${max?.Producto||'—'} ${max?.Importe??'—'}; min=${min?.Producto||'—'} ${min?.Importe??'—'}`);
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
        const r=await Z.v26ExecuteTool({id:'fast_cmp',name:'compare_events',events:[an,bn],scope:'named_event'},state,'');
        const names=arr(r?.facts?.event_names), ok=names.length===2 && new Set(names.map(norm)).size===2 && names.some(x=>norm(x)===norm(an)) && names.some(x=>norm(x)===norm(bn));
        return outcome(this,ok?'OK':'KO',names.join(' ↔ ')||'sin comparación');
      }}));
    }
  }

  // Pares heterogéneos reales, limitados para no convertir FAST en un proceso pesado.
  const pairLimit=Math.min(36,Math.max(0,events.length*2));
  for(let i=0;i<pairLimit && events.length>1;i++){
    const a=events[i%events.length], b=events[(i*7+3)%events.length]; if(a.id===b.id) continue;
    const an=eventName(a),bn=eventName(b);
    cases.push(makeCase({id:`compare-mixed-${i}-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:`Comparación cruzada · ${an} / ${bn}`,expected:'A y B distintos',run:async function(){
      const r=await Z.v26ExecuteTool({id:'fast_cmp',name:'compare_events',events:[an,bn],scope:'named_event'},state,'');
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
    cases.push(makeCase({id:`person-dossier-${key(pid)}`,group:'PERSONAS',label:`Dossier global · ${name}`,expected:'Totales coherentes y no negativos',run:async function(){
      const r=await Z.v26ExecuteTool({id:'fast_pd',name:'person_dossier',person:name,scope:'all_events',status:'all',detail:'brief'},state,'');
      const f=r?.facts||{}; const ok=r?.ok!==false && num(f.event_count)>=0 && num(f.purchase_responsibility_total)>=0 && num(f.donations_value)>=0;
      return outcome(this,ok?'OK':'KO',`persona=${f.person||'—'}; eventos=${f.event_count??'—'}; compras=${f.purchase_responsibility_total??'—'}; donaciones=${f.donations_value??'—'}`);
    }}));
  }

  cases.push(makeCase({id:'event-nonexistent-real-catalog',group:'SEGURIDAD',label:'Evento inexistente no se inventa',expected:'No resuelto',run:async function(){
    const fake=`Evento Autotest Inexistente ${Date.now()} ZZ`; const r=Z.semanticResolveEntity(state,'event',fake); return outcome(this,!r?.ok?'OK':'KO',r?.ok?`Resuelto indebidamente a ${r.nombre}`:'No resuelto');
  }}));
  return cases;
}

function chooseEvents(state){
  const events=arr(state?.eventos).filter(e=>trim(e?.id)&&eventName(e));
  const purchaseCounts=new Map(); for(const r of arr(state?.compras)){const id=eventIdOf(r);if(id)purchaseCounts.set(id,(purchaseCounts.get(id)||0)+1);}
  const withPurchases=events.filter(e=>purchaseCounts.get(trim(e.id))>0).sort((a,b)=>(purchaseCounts.get(trim(b.id))||0)-(purchaseCounts.get(trim(a.id))||0));
  const families=new Map(); for(const e of events){const stem=familyStem(eventName(e)),y=yearOf(eventName(e));if(stem&&y){if(!families.has(stem))families.set(stem,[]);families.get(stem).push(e);}}
  const sibling=[...families.values()].find(v=>v.length>=2)?.slice().sort((a,b)=>yearOf(eventName(a)).localeCompare(yearOf(eventName(b)))) || [];
  return {events,withPurchases,sibling};
}
function choosePeople(state){
  const people=arr(state?.personas).filter(p=>trim(p?.id)&&personName(p)&&!/^z[_ -]?dev/i.test(personName(p)));
  const sample=people.slice().sort((a,b)=>personName(a).localeCompare(personName(b),'es')).filter((_,i)=>i%Math.max(1,Math.floor(people.length/8))===0).slice(0,8);
  return {people,sample};
}

function buildAiSmokeCases(state,max=24){
  const {events,withPurchases,sibling}=chooseEvents(state),{sample:people}=choosePeople(state),cases=[];
  const add=c=>{if(cases.length<max)cases.push(c);};
  events.slice(0,Math.min(6,events.length)).forEach((e,i)=>add({id:`ai-event-${i}-${key(e.id)}`,group:'EVENTOS',label:`IA identifica evento · ${eventName(e)}`,prompt:`Háblame de ${eventName(e)}.`,expectedEvent:eventName(e),validate:r=>resultHasEvent(r,eventName(e))}));
  withPurchases.slice(0,5).forEach((e,i)=>add({id:`ai-purchases-${i}-${key(e.id)}`,group:'COMPRAS',label:`IA selecciona compras · ${eventName(e)}`,prompt:`¿Qué compras hubo en ${eventName(e)}?`,expectedEvent:eventName(e),validate:r=>resultHasEvent(r,eventName(e)) && arr(r?.meta?.tools).some(t=>/event_(?:breakdowns|purchase_lines|dossier)/.test(t))}));
  if(sibling.length>=2){const a=sibling[0],b=sibling[1];add({id:`ai-compare-${key(a.id)}-${key(b.id)}`,group:'COMPARACIONES',label:'IA conserva dos eventos parecidos',prompt:`Compara ${eventName(a)} con ${eventName(b)}.`,expectedEvents:[eventName(a),eventName(b)],validate:r=>[eventName(a),eventName(b)].every(n=>resultHasEvent(r,n)) || /compare_events/.test(arr(r?.meta?.tools).join(' '))});}
  people.slice(0,6).forEach((p,i)=>add({id:`ai-person-${i}-${key(p.id)}`,group:'PERSONAS',label:`IA identifica persona · ${personName(p)}`,prompt:`Háblame de ${personName(p)}.`,expectedPerson:personName(p),validate:r=>resultHasPerson(r,personName(p))}));
  if(events[0]) add({id:'ai-nondeducible-consumption',group:'SEGURIDAD',label:'IA no inventa consumo individual',prompt:`¿Quién consumió más comida en ${eventName(events[0])}?`,validate:r=>/no (?:registra|puede|se puede)|no.*deduc/i.test(text(r?.answer)) || /Dato no deducible/i.test(text(r?.title))});
  add({id:'ai-nonexistent-event',group:'SEGURIDAD',label:'IA no inventa evento inexistente',prompt:'Háblame del evento Autotest Lunar Inexistente 2099 ZXQ.',validate:r=>/no (?:encuentro|existe|est[aá] registrado)|no tengo.*registro/i.test(text(r?.answer))});
  return cases.slice(0,max);
}

function buildFullCertScenarios(state,maxTurns=18){
  const {events,withPurchases,sibling}=chooseEvents(state),{sample:people}=choosePeople(state); const sc=[];
  if(events.length>=2){const a=events[0],b=events[Math.min(1,events.length-1)]; sc.push({name:'Cambio de evento',turns:[
    {prompt:`Háblame de ${eventName(a)}.`,event:eventName(a)},
    {prompt:'¿Cómo quedó económicamente?',event:eventName(a)},
    {prompt:`Ahora cambia a ${eventName(b)}.`,event:eventName(b)},
    {prompt:'¿Qué datos importantes destacarías?',event:eventName(b)}
  ]});}
  if(sibling.length>=2){const a=sibling[0],b=sibling[1]; sc.push({name:'Comparación persistente',turns:[
    {prompt:`Compara ${eventName(a)} con ${eventName(b)}.`,events:[eventName(a),eventName(b)]},
    {prompt:'¿Cuál tuvo más ingresos?',events:[eventName(a),eventName(b)]},
    {prompt:'¿Y cuál tuvo más compras?',events:[eventName(a),eventName(b)]}
  ]});}
  if(withPurchases[0]){const e=withPurchases[0];sc.push({name:'Result-set de compras',turns:[
    {prompt:`¿Qué productos se compraron en ${eventName(e)}?`,event:eventName(e)},
    {prompt:'¿Cuál fue el más caro?',event:eventName(e)},
    {prompt:'¿Y el de menor importe?',event:eventName(e)},
    {prompt:'¿Cuánto suman todos?',event:eventName(e)}
  ]});}
  if(people.length>=2){const p1=people[0],p2=people[1];sc.push({name:'Cambio de persona',turns:[
    {prompt:`Háblame de ${personName(p1)}.`,person:personName(p1)},
    {prompt:'¿En qué eventos aparece?',person:personName(p1)},
    {prompt:`Ahora háblame de ${personName(p2)}.`,person:personName(p2)},
    {prompt:'¿Qué ingresos tiene vinculados?',person:personName(p2)}
  ]});}
  const out=[]; for(const s of sc){for(const t of s.turns){if(out.length>=maxTurns)break;out.push({...t,scenario:s.name,id:`full-${out.length+1}-${key(s.name)}`});} if(out.length>=maxTurns)break;}
  return out;
}

async function batteryBlueprint(state){
  const fast=await buildRealFastCases(state); const smoke=buildAiSmokeCases(state,40); const full=buildFullCertScenarios(state,30);
  const counts={events:arr(state?.eventos).length,people:arr(state?.personas).length,products:arr(state?.productos).length,stores:arr(state?.tiendas).length,purchases:arr(state?.compras).length,incomes:arr(state?.colaboradores).length,bankMovements:arr(state?.bankMovements||state?.movimientosBanco||state?.movimientos_banco).length};
  return {counts,fast,smoke,full};
}

export async function previewZuzuBattery(){
  const state=await getState(); const b=await batteryBlueprint(state);
  return {ok:true,generatedAt:nowIso(),source:'ControlEvent · tablas reales · solo lectura',dataCounts:b.counts,tests:{FAST:b.fast.length,'AI-SMOKE':b.smoke.length,'FULL-CERT':b.full.length},estimated:{'AI-SMOKE':{cases:Math.min(24,b.smoke.length),costEurRange:'0,05–0,25 €',hardCapSuggested:0.25},'FULL-CERT':{turns:Math.min(18,b.full.length),costEurRange:'0,10–0,50 €',hardCapSuggested:0.50}},notes:['FAST usa datos reales y 0 llamadas IA.','AI-SMOKE prueba interpretación/selección sobre casos reales, con presupuesto duro.','FULL-CERT ejecuta conversaciones reales multiturmo, con presupuesto duro.','Ningún modo modifica datos de producción.']};
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
  try{return{value:await task(guard.signal),timedOut:false};}
  catch(error){return{error,timedOut:guard.timedOut()};}
  finally{clearInterval(heartbeat);guard.cleanup();}
}

async function runFast({state,cases,send,signal}){
  const total=cases.length; let ok=0,warn=0,ko=0,done=0; const failures=[];
  for(const c of cases){
    if(signal?.aborted)break; const t0=Date.now(); let r;
    try{ r=await c.run.call(c); }catch(e){r=outcome(c,'KO',e?.message||String(e));}
    r.durationMs=Date.now()-t0; done++; if(r.status==='OK')ok++; else if(r.status==='WARN')warn++; else{ko++;failures.push(r);} streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100}});
  }
  return {done,total,ok,warn,ko,failures,costEur:0,calls:0,tokens:0,aborted:!!signal?.aborted};
}

async function runSmoke({state,cases,send,signal,maxCostEur=0.25,maxCases=24}){
  const selected=cases.slice(0,Math.max(1,Math.min(80,Number(maxCases)||24))), total=selected.length; let ok=0,warn=0,ko=0,done=0,costEur=0,calls=0,tokens=0; const failures=[];
  const timeoutMs=Math.max(30000,Math.min(120000,Number(process.env.CONTROLEVENT_ZUZU_TEST_SMOKE_TIMEOUT_MS)||60000));
  for(let i=0;i<selected.length;i++){
    const c=selected[i]; if(signal?.aborted)break;
    const reserve=0.012; if(costEur>0 && costEur+reserve>maxCostEur){streamWrite(send,'budget',{message:`Presupuesto protegido: no se inicia otra prueba porque quedan menos de ${reserve.toFixed(3)} € de margen.`,costEur});break;}
    const t0=Date.now(); let r;
    const timed=await runTimedAiCase({caseDef:c,send,parentSignal:signal,index:i+1,total,timeoutMs,task:async externalSignal=>{
      const result=await analyzeEventPrompt({prompt:c.prompt,stateOverride:state,conversationHistory:[],conversationTurnNumber:1,externalSignal});
      return result;
    }});
    if(signal?.aborted)break;
    if(timed.timedOut){
      costEur=round(costEur+reserve,6);calls+=1;
      r=outcome(c,'WARN',`TIEMPO MÁXIMO: la prueba superó ${Math.round(timeoutMs/1000)} s. Se abortó solo este caso y la batería continúa. El coste mostrado reserva ${reserve.toFixed(3)} € de forma conservadora.`,{timeout:true,usage:{calls:1,tokens:0,costEur:reserve}});
    }else if(timed.error){
      r=outcome(c,'KO',timed.error?.message||String(timed.error));
    }else{
      const result=timed.value,u=usageOf(result);costEur=round(costEur+u.costEur,6);calls+=u.calls;tokens+=u.tokens;const valid=c.validate?!!c.validate(result):!!result?.ok;
      r=outcome(c,valid?'OK':'KO',`${result?.title||''} · ${trim(result?.answer).slice(0,260)}`,{usage:u,tools:arr(result?.meta?.tools)});
    }
    r.durationMs=Date.now()-t0;done++;if(r.status==='OK')ok++;else if(r.status==='WARN')warn++;else{ko++;failures.push(r);}streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100,costEur,calls,tokens}});
    if(costEur>=maxCostEur){streamWrite(send,'budget',{message:'Se ha alcanzado el presupuesto máximo configurado.',costEur});break;}
  }
  return {done,total,ok,warn,ko,failures,costEur,calls,tokens,aborted:!!signal?.aborted,caseTimeoutMs:timeoutMs};
}

async function runFull({state,turns,send,signal,maxCostEur=0.50,maxCases=18}){
  const selected=turns.slice(0,Math.max(1,Math.min(40,Number(maxCases)||18))),total=selected.length;let ok=0,warn=0,ko=0,done=0,costEur=0,calls=0,tokens=0;const failures=[];
  const timeoutMs=Math.max(45000,Math.min(150000,Number(process.env.CONTROLEVENT_ZUZU_TEST_FULL_TIMEOUT_MS)||75000));
  let previousInteractionId='',history=[],activeScenario='';
  for(let i=0;i<selected.length;i++){
    const c=selected[i]; if(signal?.aborted)break;
    if(activeScenario && trim(c.scenario)!==activeScenario){ previousInteractionId=''; history=[]; }
    activeScenario=trim(c.scenario);
    const reserve=0.015;if(costEur>0&&costEur+reserve>maxCostEur){streamWrite(send,'budget',{message:`Presupuesto protegido: no se inicia otro turno porque quedan menos de ${reserve.toFixed(3)} € de margen.`,costEur});break;}
    const t0=Date.now();let r;
    const timed=await runTimedAiCase({caseDef:c,send,parentSignal:signal,index:i+1,total,timeoutMs,task:async externalSignal=>analyzeEventPrompt({prompt:c.prompt,stateOverride:state,previousInteractionId,conversationHistory:history.slice(-8),conversationTurnNumber:history.length+1,externalSignal})});
    if(signal?.aborted)break;
    if(timed.timedOut){
      costEur=round(costEur+reserve,6);calls+=1;previousInteractionId='';
      r=outcome(c,'WARN',`TIEMPO MÁXIMO: este turno superó ${Math.round(timeoutMs/1000)} s. Se abortó el turno, se reinicia la cadena del escenario y la ITV continúa.`,{scenario:c.scenario,timeout:true,usage:{calls:1,tokens:0,costEur:reserve}});
    }else if(timed.error){r=outcome(c,'KO',timed.error?.message||String(timed.error),{scenario:c.scenario});previousInteractionId='';}
    else{
      const result=timed.value,u=usageOf(result);costEur=round(costEur+u.costEur,6);calls+=u.calls;tokens+=u.tokens;
      let valid=!!result?.ok;if(c.event)valid=valid&&resultHasEvent(result,c.event);if(c.events)valid=valid&&c.events.every(n=>resultHasEvent(result,n));if(c.person)valid=valid&&resultHasPerson(result,c.person);
      r=outcome(c,valid?'OK':'KO',`${result?.title||''} · ${trim(result?.answer).slice(0,300)}`,{usage:u,tools:arr(result?.meta?.tools),scenario:c.scenario});
      previousInteractionId=trim(result?.interactionId||result?.meta?.interactionId||'');
      history.push({user:c.prompt,assistant:trim(result?.answer).slice(0,1200),assistantTail:trim(result?.answer).slice(-900),title:trim(result?.title),provider:trim(result?.provider),selectedEventId:'',pendingAction:result?.meta?.pendingAction||null,resultContext:result?.meta?.resultContext||null});
    }
    r.durationMs=Date.now()-t0;done++;if(r.status==='OK')ok++;else if(r.status==='WARN')warn++;else{ko++;failures.push(r);}streamWrite(send,'case',{case:r,progress:{done,total,ok,warn,ko,percent:total?Math.round(done*100/total):100,costEur,calls,tokens}});
    if(costEur>=maxCostEur){streamWrite(send,'budget',{message:'Se ha alcanzado el presupuesto máximo configurado.',costEur});break;}
  }
  return {done,total,ok,warn,ko,failures,costEur,calls,tokens,aborted:!!signal?.aborted,caseTimeoutMs:timeoutMs};
}

export async function runZuzuTestStream({mode='FAST',maxCostEur=0.25,maxCases,caseIds,send,signal}){
  const state=await getState(); const b=await batteryBlueprint(state); const m=trim(mode).toUpperCase();
  const all=m==='AI-SMOKE'?b.smoke:m==='FULL-CERT'?b.full:b.fast; const selected=filterCases(all,caseIds);
  streamWrite(send,'start',{mode:m,dataCounts:b.counts,total:selected.length,source:'tablas reales de ControlEvent',maxCostEur:m==='FAST'?0:round(maxCostEur,2)});
  const result=m==='AI-SMOKE'?await runSmoke({state,cases:selected,send,signal,maxCostEur:Math.max(0.02,num(maxCostEur)||0.25),maxCases:maxCases||24}):m==='FULL-CERT'?await runFull({state,turns:selected,send,signal,maxCostEur:Math.max(0.02,num(maxCostEur)||0.50),maxCases:maxCases||18}):await runFast({state,cases:selected,send,signal});
  streamWrite(send,'summary',{mode:m,...result,finishedAt:nowIso(),certified:result.ko===0&&!result.aborted&&result.done>0});
  return result;
}
