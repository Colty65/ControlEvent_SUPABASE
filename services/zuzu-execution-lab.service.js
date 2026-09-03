/* ControlEvent v4_1_exp · ITV EJECUCIÓN CONTROLADA V1 FIX5
   Laboratorio read-only: contexto real -> Intérprete Gemini V2.3 -> traductor conceptual ->
   executor canónico CE REAL. No sustituye Zuzu, no genera respuesta narrativa y no escribe BBDD. */
import { getState } from './state.service.js';
import { runInterpreterPlan, __interpreterLabForRegression } from './zuzu-interpreter-lab.service.js';
import { __zuzuStructuralTesting } from './event-ai.service.js';

const { conceptualIntentMatch }=__interpreterLabForRegression();
const { vnextP19ExecuteData, vnextRecallMemory, vnextP125WorkingSetsFromResult }=__zuzuStructuralTesting;
const text=v=>v==null?'':String(v),trim=v=>text(v).trim(),arr=v=>Array.isArray(v)?v:[],num=v=>Number(v)||0;
const norm=v=>trim(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const clone=v=>JSON.parse(JSON.stringify(v));
const round=(v,d=6)=>{const p=10**d;return Math.round((Number(v)||0)*p)/p;};
const READ_ONLY_CAPABILITIES=new Set(['event_summary','event_purchases','event_income_status','compare_events','event_weather','event_documentation','event_bank','event_liquidations','person_profile','person_events','person_event_status','view_current','summarize_current','derive','recall_memory']);

function eventName(e={}){return trim(e?.titulo||e?.nombre||e?.title);}
function personName(p={}){return trim(p?.nombre||p?.Nombre);}
function eventIdOf(row={}){return trim(row?.eventId||row?.event_id);}
function responsibleIdOf(row={}){return trim(row?.responsableId||row?.responsable_id);}
function ticketText(row={}){return trim(row?.ticketDonacion||row?.ticket_donacion||row?.ticket||row?.ticketOtrosGastos||row?.ticket_otros_gastos);}
function realizedPurchase(row={}){const t=norm(ticketText(row));return /^tk\s*\d+/.test(t)||/gastos? corrientes?/.test(t);}
function isDonation(row={}){return /donaci/.test(norm(ticketText(row)));}

function liveCatalog(state={}){
  const out=[];
  for(const p of arr(state.personas)){const canonical=personName(p);if(canonical)out.push({canonical,type:'PERSON'});}
  for(const e of arr(state.eventos)){const canonical=eventName(e);if(canonical)out.push({canonical,type:'EVENT'});}
  return out;
}
function dateKey(e={}){return trim(e?.fechaIni||e?.fecha_ini||e?.fechaFin||e?.fecha_fin||e?.createdAt||e?.created_at);}
function chooseFixtures(state={}){
  const events=arr(state.eventos).filter(e=>trim(e?.id)&&eventName(e));if(events.length<2)throw new Error('ITV EJECUCIÓN necesita al menos dos eventos reales.');
  const pcount=new Map();for(const c of arr(state.compras)){if(isDonation(c)||!realizedPurchase(c))continue;const id=eventIdOf(c);if(id)pcount.set(id,(pcount.get(id)||0)+1);}
  const byPurchases=events.slice().sort((a,b)=>(pcount.get(trim(b.id))||0)-(pcount.get(trim(a.id))||0)||dateKey(b).localeCompare(dateKey(a)));
  const viewSafe=byPurchases.filter(e=>{const n=pcount.get(trim(e.id))||0;return n>0&&n<=60;});
  const withPurchases=byPurchases.filter(e=>(pcount.get(trim(e.id))||0)>0);
  const eventA=viewSafe[0]||withPurchases.slice().sort((a,b)=>(pcount.get(trim(a.id))||0)-(pcount.get(trim(b.id))||0))[0]||byPurchases[0],eventB=byPurchases.find(e=>trim(e.id)!==trim(eventA.id))||byPurchases[1];
  const people=arr(state.personas).filter(p=>trim(p?.id)&&personName(p));if(people.length<2)throw new Error('ITV EJECUCIÓN necesita al menos dos personas reales.');
  const rcount=new Map();for(const c of arr(state.compras)){const id=responsibleIdOf(c);if(id)rcount.set(id,(rcount.get(id)||0)+1);}
  const peopleSorted=people.slice().sort((a,b)=>(rcount.get(trim(b.id))||0)-(rcount.get(trim(a.id))||0)||personName(a).localeCompare(personName(b),'es',{sensitivity:'base'}));
  const personA=peopleSorted[0],personB=peopleSorted.find(p=>trim(p.id)!==trim(personA.id))||peopleSorted[1];
  const memoryPerson=people.find(p=>norm(personName(p))==='pocholo')||personA;
  return{eventA:{id:trim(eventA.id),name:eventName(eventA)},eventB:{id:trim(eventB.id),name:eventName(eventB)},personA:{id:trim(personA.id),name:personName(personA)},personB:{id:trim(personB.id),name:personName(personB)},memoryPerson:{id:trim(memoryPerson.id),name:personName(memoryPerson)}};
}

function E(type,request,extra={}){return{type,request,...extra};}
function buildCases(f={}){
  const A=f.eventA.name,B=f.eventB.name,P=f.personA.name,Q=f.personB.name,M=f.memoryPerson.name;
  return [
    {id:'exec-01',label:'Resumen evento',prompt:`Ponme al día con ${A}.`,expected:E('DATA','event_summary',{events:[A]})},
    {id:'exec-02',label:'Compras reales',prompt:`Enséñame las compras realizadas de ${A}.`,expected:E('DATA','event_purchases',{events:[A]})},
    {id:'exec-03',label:'Ordenar tabla',prompt:'Ordena esta tabla por Importe de mayor a menor.',expected:E('TABLE','show_sort',{column:'Importe',sort:{field:'Importe',direction:'desc'}}),requiresDataset:true},
    {id:'exec-04',label:'Ocultar columna',prompt:'Oculta la columna Unidades.',expected:E('TABLE','hide',{column:'Unidades'}),requiresDataset:true},
    {id:'exec-05',label:'Quitar filtros',prompt:'Quita cualquier filtro y vuelve a enseñarme todas las filas.',expected:E('TABLE','reset'),requiresDataset:true},
    {id:'exec-06',label:'Máximo tabla',prompt:'¿Qué fila tiene el Importe más alto?',expected:E('CALCULATE','MAX',{field:'Importe'}),requiresDataset:true},
    {id:'exec-07',label:'Ingresos pendientes',prompt:`Ahora dime qué ingresos quedan pendientes en ${A}.`,expected:E('DATA','event_income_status',{events:[A]})},
    {id:'exec-08',label:'Documentación',prompt:`Enséñame el estado de la documentación de ${A}.`,expected:E('DATA','event_documentation',{events:[A]})},
    {id:'exec-09',label:'Banco',prompt:`¿Qué hay en el cuadre bancario de ${A}?`,expected:E('DATA','event_bank',{events:[A]})},
    {id:'exec-10',label:'Comparación real',prompt:`Compara ${A} con ${B}.`,expected:E('DATA','compare_events',{events:[A,B]})},
    {id:'exec-11',label:'Analizar tabla',prompt:'Sobre esa comparación que ya tenemos, ¿ves algo que merezca revisión?',expected:E('TABLE','analyze'),requiresDataset:true},
    {id:'exec-12',label:'Máximo comparación',prompt:'De esos eventos, ¿cuál tiene más Ingresos?',expected:E('CALCULATE','MAX',{field:'Ingresos'}),requiresDataset:true},
    {id:'exec-13',label:'Perfil persona',prompt:`Háblame de ${P}.`,expected:E('PERSON','profile',{people:[P]})},
    {id:'exec-14',label:'Referente persona',prompt:'¿En qué eventos aparece?',expected:E('PERSON','events',{people:[P]})},
    {id:'exec-15',label:'Multientidad',prompt:`Háblame de ${P} y de ${Q}.`,expected:E('PERSON','profile',{people:[P,Q]})},
    {id:'exec-16',label:'Referentes múltiples',prompt:'¿Y en qué eventos aparecen los dos?',expected:E('PERSON','events',{people:[P,Q]})},
    {id:'exec-17',label:'Persona en evento',prompt:`¿Cuál es la situación de ${P} dentro de ${A}?`,expected:E('PERSON','event_status',{people:[P],events:[A]})},
    {id:'exec-18',label:'Volver a dataset',prompt:`Vuelve a la tabla de compras de ${A} que teníamos antes.`,expected:E('TABLE','select'),requiresDatasetTitle:'Compras producto a producto'},
    {id:'exec-19',label:'Resumen dataset',prompt:'Resúmeme esa tabla sin volver a consultar las compras.',expected:E('TABLE','summarize'),requiresDataset:true},
    {id:'exec-20',label:'Memoria histórica',prompt:`¿Recuerdas algo de ${M}?`,expected:E('MEMORY','search',{people:[M]})},
    {id:'exec-21',label:'Abrir recuerdo',prompt:'Abre el primero de esos recuerdos.',expected:E('MEMORY','read',{result_index:1}),requiresMemoryMatch:true},
    {id:'exec-22',label:'Resumir recuerdo',prompt:'Resúmeme ese recuerdo en tres ideas.',expected:E('MEMORY','summarize'),requiresSelectedMemory:true},
    {id:'exec-23',label:'Capacidad inexistente',prompt:'Predice cuántos cubatas beberá cada persona en el próximo evento.',expected:E('UNSUPPORTED',undefined),expectNoExecution:true},
    {id:'exec-24',label:'Cambio de foco',prompt:`Cambiamos de tema: ponme al día con ${B}.`,expected:E('DATA','event_summary',{events:[B]})},
    {id:'exec-25',label:'Liquidaciones estándar',prompt:`Enséñame las liquidaciones de compras de ${A}.`,expected:E('DATA','event_liquidations',{events:[A]})},
    {id:'exec-26',label:'Liquidaciones · productos completos',prompt:`De las liquidaciones de ${A}, dame TODO el detalle de productos que componen los Tickets incluidos.`,expected:E('DATA','event_liquidations',{events:[A],detail:'full'})},
    {id:'exec-27',label:'Resumen de sesión',prompt:'Resúmeme qué hemos consultado en esta sesión y qué ha quedado abierto.',expected:E('CHAT','session_summary'),expectNoExecution:true}
  ];
}

function wsColumns(ws={}){return arr(ws.base_columns||ws.columns).map(trim).filter(Boolean);}
function wsHiddenLabels(ws={}){const hidden=new Set(arr(ws?.view_state?.hidden_columns)),cat=arr(ws?.column_catalog);return cat.filter(c=>hidden.has(c.id)).map(c=>trim(c.label)).filter(Boolean);}
function compactWs(ws={}){return{dataset_id:trim(ws.dataset_id),table_key:trim(ws.key||ws.table_key),title:trim(ws.title),columns:wsColumns(ws),hidden_columns:wsHiddenLabels(ws),row_count:num(ws.total_rows||arr(ws.base_rows).length),view_filters:arr(ws?.view_state?.filters)};}
const DATASET_CONTEXT_STOP=new Set(['tabla','tablas','lista','listado','datos','resumen','detalle','evento','eventos','por','para','de','del','la','las','el','los','en','registrado','registrada','vinculado','vinculada']);
function datasetContextScore(prompt='',ws={}){const p=` ${norm(prompt)} `,title=norm(ws?.title),key=norm(ws?.key||ws?.table_key);if(!p.trim()||!title)return 0;let score=title&&p.includes(` ${title} `)?100:0;if(key&&key.length>=4&&p.includes(` ${key} `))score+=60;const toks=title.split(' ').filter(t=>t.length>=3&&!DATASET_CONTEXT_STOP.has(t));for(const t of toks)if(p.includes(` ${t} `))score+=t.length>=6?8:5;return score;}
function contextDatasets(session={},prompt=''){const currentId=trim(session.currentDataset?.dataset_id),scored=arr(session.datasets).map(ws=>({ws,score:datasetContextScore(prompt,ws)})).filter(x=>x.score>=8&&trim(x.ws?.dataset_id)!==currentId).sort((a,b)=>b.score-a.score),out=[];if(session.currentDataset)out.push(compactWs(session.currentDataset));for(const x of scored.slice(0,4)){const c=compactWs(x.ws);if(!out.some(d=>trim(d.dataset_id)===trim(c.dataset_id)))out.push(c);}return out;}
function uniqueRecentEntities(values=[]){const out=[];for(const v of arr(values)){const x=trim(v);if(!x)continue;const i=out.findIndex(y=>norm(y)===norm(x));if(i>=0)out.splice(i,1);out.push(x);}return out;}
function sessionContext(session={},fixtures={},prompt=''){
  const ctx={screen_event:fixtures.eventA.name,recent_entities:uniqueRecentEntities(session.recentEntities).slice(-4),session_ledger:arr(session.ledger).slice(-14)};
  if(session.currentDataset)ctx.current_dataset=compactWs(session.currentDataset);
  const relevant=contextDatasets(session,prompt);if(relevant.length)ctx.visible_datasets=relevant;
  if(session.activeFocus)ctx.active_focus=clone(session.activeFocus);
  if(session.memoryMatches.length)ctx.memory_matches=session.memoryMatches.map((m,i)=>({index:i+1,title:m.title}));
  if(session.selectedMemory)ctx.selected_memory_episode={result_index:session.selectedMemory.index,title:session.selectedMemory.title};
  return ctx;
}
function historyForSession(session={}){return[{resultContext:{current_dataset:session.currentDataset||null,presented_datasets:session.datasets.slice(-80)}}];}
function mergeDataset(session,ws,{makeCurrent=true}={}){if(!ws||!trim(ws.dataset_id))return;const i=session.datasets.findIndex(x=>trim(x.dataset_id)===trim(ws.dataset_id));if(i>=0)session.datasets[i]=ws;else session.datasets.push(ws);if(makeCurrent)session.currentDataset=ws;}
function rememberResultDatasets(session,result,capability,args){
  if(result?._current_dataset){mergeDataset(session,result._current_dataset);return;}
  const sets=vnextP125WorkingSetsFromResult(result,capability==='recall_memory'?'recall_memory':'query_ce',{operation:capability,...(args||{})});
  sets.forEach((ws,i)=>mergeDataset(session,ws,{makeCurrent:i===0}));
}
function updateFocus(session,plan={}){const type=trim(plan.type).toUpperCase(),people=arr(plan.people).map(trim).filter(Boolean),events=arr(plan.events).map(trim).filter(Boolean);if(type==='PERSON'&&people.length){session.recentEntities=uniqueRecentEntities([...session.recentEntities,...people]).slice(-8);session.activeFocus={type:people.length>1?'multi_person':'person',entities:uniqueRecentEntities(people)};}else if(type==='DATA'&&events.length){session.activeFocus={type:events.length>1?'multi_event':'event',entities:[...new Set(events)]};}}
function resultSummary(result={}){return{ok:result?.ok!==false,title:trim(result?.title),operation:trim(result?._vnext_operation||result?.facts?.operation||result?.facts?.action),facts:result?.facts||{},tables:arr(result?.tables).slice(0,8).map(t=>({key:trim(t?.key),title:trim(t?.title),columns:arr(t?.columns).length?arr(t.columns):Object.keys(t?.schema||{}),row_count:arr(t?.rows).length,rows:arr(t?.rows).slice(0,12)}))};}
function validateCeResult(action={},result={}){
  const issues=[];if(!result||result.ok===false)issues.push(trim(result?.error)||'CE devolvió resultado no OK');
  const cap=trim(action.capability),op=trim(result?._vnext_operation||result?.facts?.operation||result?.facts?.action);if(cap&&!['recall_memory'].includes(cap)&&op&&norm(op)!==norm(cap))issues.push(`CE ejecutó ${op} en vez de ${cap}`);
  const a=action.arguments||{},f=result?.facts||{};if(trim(a.event)&&trim(f.event)&&norm(a.event)!==norm(f.event))issues.push(`evento devuelto ${f.event} != ${a.event}`);if(trim(a.person)&&trim(f.person)&&norm(a.person)!==norm(f.person))issues.push(`persona devuelta ${f.person} != ${a.person}`);if(cap==='compare_events'&&arr(a.events).length){const got=arr(f.event_names).map(norm),miss=arr(a.events).filter(e=>!got.includes(norm(e)));if(miss.length)issues.push(`faltan eventos en resultado: ${miss.join(', ')}`);}
  return{ok:issues.length===0,issues};
}
function resolveMemoryArgs(action={},session={}){
  const a={...(action.arguments||{})},act=trim(a.action);if(!['read','summarize'].includes(act)||trim(a.conversation_id))return a;const ix=Math.max(1,num(a.result_index)||1),m=session.memoryMatches[ix-1]||(act==='summarize'?session.selectedMemory:null);if(!m)throw Object.assign(new Error(`No existe recuerdo #${ix} en la búsqueda real.`),{code:'DATA_GAP'});return{...a,conversation_id:m.conversation_id,matched_turn_id:m.turn_id||'',_memory_title:m.title||'',result_index:ix};
}
async function executeAction(action={},session={},state={},actor={},fixtures={},signal=null){
  const cap=trim(action.capability),args=action.arguments||{},flowTrace=[];
  if(!READ_ONLY_CAPABILITIES.has(cap))throw Object.assign(new Error(`READ_ONLY_GUARD: capacidad no permitida en ITV: ${cap||'—'}.`),{code:'READ_ONLY_GUARD'});
  if(cap==='recall_memory'){
    const resolved=resolveMemoryArgs(action,session),call={id:`exec_mem_${Date.now().toString(36)}`,name:'recall_memory',arguments:resolved},result=await vnextRecallMemory(call,actor,'',new Date().toISOString(),[]);
    if(trim(resolved.action)==='search'){
      const table=arr(result?.tables).find(t=>trim(t?.key)==='memory_matches'),rows=arr(table?.rows);session.memoryMatches=rows.map((r,i)=>({index:i+1,title:trim(r?.Título||r?.Resumen||r?.Referencia)||`Recuerdo ${i+1}`,conversation_id:trim(r?.['Conversation ID']),turn_id:trim(r?.['Turn ID'])})).filter(x=>x.conversation_id);
    }else if(['read','summarize'].includes(trim(resolved.action))){const ix=Math.max(1,num(resolved.result_index)||1),m=session.memoryMatches[ix-1]||session.selectedMemory;if(m)session.selectedMemory={...m,index:ix};}
    rememberResultDatasets(session,result,cap,resolved);return{result,resolvedArgs:resolved,flowTrace};
  }
  const decision={operation:cap,...args,_user_prompt:session.currentPrompt};
  const result=await vnextP19ExecuteData(decision,state,fixtures.eventA.id,flowTrace,historyForSession(session));rememberResultDatasets(session,result,cap,args);return{result,resolvedArgs:args,flowTrace};
}

function validateCasePostcondition(c={},session={}){
  const issues=[],ws=session.currentDataset||{},vs=ws.view_state||{};
  if(c.id==='exec-03'){const sort=arr(vs.sort)[0]||{};if(norm(sort.field)!=='importe'||norm(sort.direction)!=='desc')issues.push('La vista real no quedó ordenada por Importe desc.');}
  if(c.id==='exec-04'&&!wsHiddenLabels(ws).some(x=>norm(x)==='unidades'))issues.push('La vista real no dejó Unidades oculta.');
  if(c.id==='exec-05'&&arr(vs.filters).length)issues.push('La vista real conserva filtros después de TABLE/reset.');
  if(c.id==='exec-18'&&!norm(ws.title).includes(norm(c.requiresDatasetTitle)))issues.push('CE no dejó activa la tabla histórica de compras seleccionada.');
  if(c.id==='exec-19'&&norm(ws.source_operation)!=='event purchases')issues.push(`El resumen dejó de estar anclado al dataset de compras (${trim(ws.source_operation)||'sin origen'}).`);
  return{ok:issues.length===0,issues};
}

function expectedForCase(c,session){const e=clone(c.expected||{});if(c.id==='exec-18'){const ws=session.datasets.find(w=>norm(w.title).includes(norm(c.requiresDatasetTitle)));if(ws)e.dataset=ws.dataset_id;}return e;}
function prerequisites(c,session){if(c.requiresDataset&&!session.currentDataset)return'No existe dataset actual real.';if(c.requiresDatasetTitle&&!session.datasets.some(w=>norm(w.title).includes(norm(c.requiresDatasetTitle))))return`No existe dataset previo «${c.requiresDatasetTitle}».`;if(c.requiresMemoryMatch&&!session.memoryMatches.length)return'La búsqueda de memoria no devolvió recuerdos.';if(c.requiresSelectedMemory&&!session.selectedMemory)return'No existe recuerdo seleccionado.';return'';}

export async function previewExecutionBattery({stateOverride=null}={}){const state=stateOverride||await getState(),fixtures=chooseFixtures(state),cases=buildCases(fixtures);return{ok:true,source:'execution-lab-v1',batteryCode:'EXECUTION-CONTROLLED-V1-FIX5-27',label:'ITV · EJECUCIÓN CONTROLADA V1 FIX5 · 27',total:cases.length,readOnly:true,executesCE:true,replacesZuzu:false,narrates:false,planner:'INTÉRPRETE GEMINI V2.3',fixtures,cases:cases.map(c=>({id:c.id,label:c.label,prompt:c.prompt,expected:c.expected}))};}

export async function runExecutionStream({send,signal=null,actor={},maxCases=27,stateOverride=null}={}){
  const state=stateOverride||await getState(),fixtures=chooseFixtures(state),catalog=liveCatalog(state),cases=buildCases(fixtures).slice(0,Math.max(1,Math.min(27,num(maxCases)||27))),session={datasets:[],currentDataset:null,recentEntities:[],activeFocus:null,memoryMatches:[],selectedMemory:null,ledger:[],currentPrompt:''},rows=[];
  send?.({type:'start',batteryCode:'EXECUTION-CONTROLLED-V1-FIX5-27',label:'ITV · EJECUCIÓN CONTROLADA V1 FIX5 · 27',total:cases.length,readOnly:true,executesCE:true,narrates:false,fixtures});
  let plannerCalls=0,ceCalls=0,tokens=0,costEur=0;
  for(let i=0;i<cases.length;i++){
    if(signal?.aborted)break;const c=cases[i],pre=prerequisites(c,session);send?.({type:'progress',index:i+1,total:cases.length,id:c.id,label:c.label,prompt:c.prompt});
    if(pre){const row={id:c.id,label:c.label,prompt:c.prompt,status:'SKIP',diagnosis:'DATA_GAP',reasons:[pre],expected:expectedForCase(c,session),plan:null,translatedActions:[],ceResults:[],context:sessionContext(session,fixtures,c.prompt),usage:{totalTokens:0,costEur:0}};rows.push(row);session.ledger.push({kind:'skip',value:`${c.label}: ${pre}`});send?.({type:'case',case:row});continue;}
    const expected=expectedForCase(c,session),context=sessionContext(session,fixtures,c.prompt);session.currentPrompt=c.prompt;let row;
    try{
      const planned=await runInterpreterPlan({prompt:c.prompt,context,entityCatalog:catalog,signal});plannerCalls++;tokens+=num(planned.usage?.totalTokens);costEur=round(costEur+num(planned.usage?.costEur),6);
      const intent=planned.parsed?.parsed?conceptualIntentMatch(planned.plan,expected):{ok:false,reasons:[planned.parsed?.error||'Plan no parseable']};
      const translated=planned.translation||{ok:false,actions:[],issues:['sin traducción']},ta=planned.translationAudit||{ok:false,issues:['sin auditoría']};
      let diagnosis='OK',status='OK',reasons=[...intent.reasons];const ceResults=[];
      if(!intent.ok){diagnosis='INTERPRETATION';status='KO';}
      else if(!translated.ok||!ta.ok){diagnosis='TRANSLATION';status='KO';reasons.push(...arr(translated.issues),...arr(ta.issues));}
      else if(c.expectNoExecution){if(arr(translated.actions).length){diagnosis='TRANSLATION';status='KO';reasons.push('Este turno no debía ejecutar CE.');}else diagnosis='OK_NO_EXECUTION';}
      else if(!arr(translated.actions).length){diagnosis=trim(planned.plan?.type).toUpperCase()==='UNSUPPORTED'?'CAPABILITY':'TRANSLATION';status='KO';reasons.push('El plan correcto no produjo ninguna acción CE ejecutable.');}
      else{
        for(const action of translated.actions){
          try{const ex=await executeAction(action,session,state,actor,fixtures,signal);ceCalls++;const check=validateCeResult(action,ex.result);ceResults.push({action:{capability:action.capability,arguments:ex.resolvedArgs},result:resultSummary(ex.result),validation:check,trace:arr(ex.flowTrace).slice(-40)});if(!check.ok){diagnosis='CE';status='KO';reasons.push(...check.issues);break;}}
          catch(error){if(error?.code==='DATA_GAP'){diagnosis='DATA_GAP';status='SKIP';reasons.push(error.message||String(error));}else if(error?.code==='READ_ONLY_GUARD'){diagnosis='CAPABILITY';status='KO';reasons.push(error.message||String(error));}else{diagnosis='CE';status='KO';reasons.push(error?.message||String(error));}break;}
        }
        if(status==='OK'){const post=validateCasePostcondition(c,session);if(!post.ok){diagnosis='CE';status='KO';reasons.push(...post.issues);}}
      }
      // Un turno KO no debe mutar el foco ni contaminar el ledger que reciben los turnos siguientes.
      // El laboratorio conserva el fallo en su row/diagnóstico, pero el contexto conversacional solo incorpora turnos válidos.
      if(status==='OK'){updateFocus(session,planned.plan);session.ledger.push({kind:trim(planned.plan?.type).toLowerCase()||'turn',value:`${c.label}: ${trim(planned.plan?.request)||trim(planned.plan?.type)}`});}
      row={id:c.id,label:c.label,prompt:c.prompt,status,diagnosis,reasons,expected,context,enriched:planned.enriched,plan:planned.plan,rawPlan:planned.raw,translatedActions:translated.actions,executionGuard:translated.guard||null,ceResults,metrics:{planParsed:planned.parsed?.parsed===true,intentCorrect:intent.ok,translationCE:translated.ok&&ta.ok,ceExecuted:ceResults.length>0,ceValid:ceResults.length?ceResults.every(x=>x.validation?.ok):c.expectNoExecution===true},usage:planned.usage,model:planned.model};
    }catch(error){row={id:c.id,label:c.label,prompt:c.prompt,status:'KO',diagnosis:'TRANSPORT',reasons:[error?.message||String(error)],expected,context,plan:null,translatedActions:[],ceResults:[],usage:{totalTokens:0,costEur:0}};}
    rows.push(row);send?.({type:'case',case:row});
  }
  const done=rows.length,ok=rows.filter(r=>r.status==='OK').length,skip=rows.filter(r=>r.status==='SKIP').length,ko=rows.filter(r=>r.status==='KO').length,eligible=Math.max(1,done-skip),diag={};for(const r of rows)diag[r.diagnosis]=(diag[r.diagnosis]||0)+1;
  const summary={done,total:cases.length,ok,ko,skip,endToEndPct:Math.round(ok*10000/eligible)/100,plannerCalls,ceCalls,tokens,costEur,diagnosis:diag,readOnly:true,executesCE:true,narrates:false,completed:done===cases.length&&!signal?.aborted,datasetsMaterialized:session.datasets.length,memoryMatches:session.memoryMatches.length};send?.({type:'summary',summary});return summary;
}

export function __executionLabForRegression(){return{chooseFixtures,buildCases,liveCatalog,compactWs,validateCeResult,validateCasePostcondition,resultSummary,sessionContext,contextDatasets,datasetContextScore,uniqueRecentEntities,readOnlyCapabilities:[...READ_ONLY_CAPABILITIES]};}
