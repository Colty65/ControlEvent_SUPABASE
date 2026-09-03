const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('services/event-ai.service.js','utf8');
const lab=fs.readFileSync('services/zuzu-test-lab.service.js','utf8');
const ui=fs.readFileSync('public/app/features/zuzu-test-console-gd.js','utf8');
const html=fs.readFileSync('public/index.html','utf8');

function extractFunction(name){
  const start=src.indexOf(`function ${name}(`);
  if(start<0)throw new Error(`No encuentro ${name}`);
  const p0=src.indexOf('(',start);let pd=0,quote='',esc=false,close=-1;
  for(let i=p0;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='(')pd++; else if(c===')'&&--pd===0){close=i;break;}
  }
  const brace=src.indexOf('{',close);let depth=0;quote='';esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote='';continue;}
    if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
    if(c==='{')depth++; else if(c==='}'&&--depth===0)return src.slice(start,i+1);
  }
  throw new Error(`Función incompleta ${name}`);
}
const helpers=`const arr=v=>Array.isArray(v)?v:[]; const trim=v=>v==null?'':String(v).trim(); const zuzuTracePush=()=>{};`;
const code=[helpers,extractFunction('v73NormalizeScope'),extractFunction('v73NormalizeOperations'),extractFunction('v79ScopeIsCanonical'),extractFunction('v79RepairQueryScopeFromContext'),extractFunction('v79FastLocalPresentation'),'return {v73NormalizeScope,v73NormalizeOperations,v79RepairQueryScopeFromContext,v79FastLocalPresentation};'].join('\n');
const F=new Function(code)();
let n=0;const ok=(cond,msg)=>{assert.ok(cond,msg);n++;console.log(`OK ${n}: ${msg}`)};

let s=F.v73NormalizeScope({kind:'event',event:'FUNCION 2025'});ok(s.kind==='named_event'&&s.event==='FUNCION 2025','scope event -> named_event conserva evento');
s=F.v73NormalizeScope({kind:'events',events:['SySA 2024','SySA 2025']});ok(s.kind==='named_events'&&s.events.length===2,'scope events -> named_events conserva conjunto');
s=F.v73NormalizeScope({kind:'conversation'});ok(s.kind==='inherit','scope conversation -> inherit transitorio');
s=F.v73NormalizeScope({kind:'all'});ok(s.kind==='all_events','scope all -> all_events global');
let ops=F.v73NormalizeOperations([{op:'sort',field:'amount',order:'descending'}]);ok(ops[0]?.type==='sort'&&ops[0]?.field==='amount'&&ops[0]?.direction==='desc','op sort/descending se conserva');
ops=F.v73NormalizeOperations([{operation:'order_by',value:'income',desc:true}]);ok(ops[0]?.type==='sort'&&ops[0]?.field==='income'&&ops[0]?.direction==='desc','operation order_by/value/desc se adapta');
let q=F.v79RepairQueryScopeFromContext({targets:[{domain:'purchases'}],scope:{kind:'conversation'}},{scope:{kind:'named_event',event:'FUNCION 2025'}},[]);ok(q.scope.kind==='named_event'&&q.scope.event==='FUNCION 2025','inherit hereda CURRENT_CONTEXT sin perder evento');
q=F.v79RepairQueryScopeFromContext({targets:[{domain:'donations'}],scope:{}},{scope:{kind:'named_event',event:'SySA 2026'}},[]);ok(q.scope.event==='SySA 2026','scope vacío hereda evento conversacional');
q=F.v79RepairQueryScopeFromContext({targets:[{domain:'purchases'}],scope:{}},{scope:{}},[]);ok(q.scope.kind==='all_events','sin scope contextual cae a all_events, no inventa evento');
ok(F.v79FastLocalPresentation({action:'query',response_kind:'table',query:{targets:[{domain:'purchases'}]}},{},{domain:'purchases'},'OK')===true,'FAST-LOCAL acepta tabla determinista con dataset');
ok(F.v79FastLocalPresentation({action:'query',response_kind:'summary',query:{targets:[{domain:'event_summary'}]}},{},{domain:'event_summary'},'OK')===false,'FAST-LOCAL no salta redacción de resumen de evento');
ok(src.includes('CONTROLEVENT_ZUZU_MEMORY_BUDGET_MS')&&src.includes('BANK4_8 · MEMORY GATE'),'memoria proactiva tiene presupuesto duro y traza BANK4_8');
ok(src.includes("resolution:'canonical_id'")&&src.includes('v79DirectTypedEntity'),'entidades tipadas aceptan ID canónico sin fuzzy');
ok(lab.includes("exportBankData({accountId:'TODOS'})")&&lab.includes('bankMovements:arr(bank?.movements)'),'ITV incorpora snapshot bancario de solo lectura');
ok(lab.includes('Actividad directa · ${name}')&&!lab.includes("label:`Dossier global · ${name}`"),'FAST ya no ejecuta dossier pesado por cada persona');
ok(lab.includes('TIMEOUT FAST')&&lab.includes("streamWrite(send,'heartbeat'"),'FAST tiene watchdog/heartbeat por caso');
ok(lab.includes('focus.person')&&lab.includes("ctx?.type)==='person'"),'oráculo valida cambio de persona contra ledger interno');
ok(ui.includes('ORÁCULO ACTIVO')&&!ui.includes('SIN ORÁCULO'),'UI ITV declara oráculo activo');
ok(html.includes('20260828-BANK48-SCOPE-CONTEXT-FASTLOCAL-MEMORY-WATCHDOG'),'index usa cache-bust BANK4_8');
console.log(`BANK4_8 regression: ${n}/${n} OK`);
