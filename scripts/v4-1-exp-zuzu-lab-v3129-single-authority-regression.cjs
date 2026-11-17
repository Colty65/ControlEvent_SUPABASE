const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const ai=read('services/event-ai.service.js'),lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),html=read('public/antonio-lab.html'),ui=read('public/app/features/zuzu-test-console-gd.js'),routes=read('routes/antonio-lab.routes.js'),vercel=read('vercel.json');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
function fn(src,name,nextName){const a=src.indexOf(`function ${name}`);if(a<0)return'';const b=nextName?src.indexOf(`function ${nextName}`,a+10):-1;return src.slice(a,b>0?b:src.length)}

t('build activo coherente',/V3\.13\.0-RESPONSE-LEVELS-CLEAN-RECOVERY/.test(lab)&&/V3\.13\.0-RESPONSE-LEVELS-CLEAN-RECOVERY/.test(svc)&&/V3\.13/.test(html)&&/V3\.13/.test(ui));
t('voz tiene una sola ruta semántica',/V3\.13 · VOZ: una sola autoridad semántica/.test(ai)&&!/const direct=await v281TryDirectRoute/.test(ai.slice(ai.indexOf('export async function analyzeEventPrompt'),ai.indexOf('// SCC 2.0',ai.indexOf('export async function analyzeEventPrompt')))));
t('voz no entra al Ledger',/runZuzuV73Ledger\(\{userPrompt,state,selectedEventId,flowTrace,voiceConversation:false/.test(ai));
t('schema plan incluye context/source tipados',/context_mode:\{type:'string',enum:\['CONTINUE','REPLACE','NONE'\]/.test(ai)&&/source_mode:\{type:'string',enum:\['FRESH','CURRENT_DATASET','MEMORY','NONE'\]/.test(ai));
t('mensaje actual aparece primero en input',/return `MENSAJE ACTUAL \(AUTORIDAD DEL TURNO\):/.test(ai));
t('prompt declara current dataset solo referencia',/NUNCA manda sobre el mensaje actual/.test(ai)&&/VIEW\/CALCULATE solo significa/.test(ai));
t('modo voz evita reparador semántico posterior',/if\(voiceConversation\)\{functionCalls=v3129ApplySingleAuthorityPlan/.test(ai));
t('hora actual no puede contaminar nombres canónicos',/NUNCA pegues esta fecha\/hora al nombre de un evento/.test(ai)&&/target debe seguir siendo exactamente esa entidad canónica/.test(ai));
t('petición general de evento obliga a event_summary en el plan',/información general[\s\S]{0,220}operation=event_summary/.test(ai)&&/No elijas al azar compras, donaciones, ingresos/.test(ai));
t('tacos no anulan una petición factual',/tacos, bromas, insultos[\s\S]{0,220}NO cambia la intención factual/.test(ai)||/El tono del usuario[\s\S]{0,260}CHAT solo cuando realmente no haya una petición factual/.test(ai));
t('voz aplica barrera canónica determinista sin segundo cerebro',/v3129CanonicalizeAuthorityContracts\(functionCalls,stForGuard,userPrompt,selectedEventId,flowTrace\)/.test(ai)&&/BARRERA CANÓNICA \+ FILTROS EXPLÍCITOS/.test(ai));
t('catálogo de eventos admite descripción como nombre canónico',/e\?\.titulo\|\|e\?\.nombre\|\|e\?\.descripcion/.test(fn(ai,'vnextP2CatalogMentions','v3129CanonicalEventFromCatalog')));
t('compras en P2 recuperan estado explícito del turno',/if\(trim\(args.operation\)===['"]event_purchases['"]\)args=vnextP18RepairPurchaseView/.test(ai));
t('diagnóstico publica target ya normalizado',/target:authorityTarget,entities:authorityEntities/.test(ai));
t('reparador viejo queda solo para no-voz',/else if\(functionCalls\.some[\s\S]{0,220}vnextP2RepairTranslatedCalls/.test(ai));
t('working set persiste source_args exactos',/source_args:v3129WorkingSetSourceArgs\(\{\.\.\.args,operation:resultOp\}\)/.test(ai)&&/source_args:v3129WorkingSetSourceArgs\(value\.source_args\|\|\{\}\)/.test(ai));
t('muestra incompleta puede reabrir fuente exacta',/function v3129ReopenWorkingSetCall/.test(ai)&&/a\.detail='full'/.test(ai));
t('status de compras se normaliza estructuralmente',/operation==='event_purchases'&&trim\(a\.status\)&&!trim\(a\.purchase_status\)/.test(ai));
t('memoria nunca ejecuta search sin query',/name==='recall_memory'&&trim\(a\.action\)==='search'&&!trim\(a\.query\)/.test(ai)&&/trim\(userPrompt\)/.test(fn(ai,'v3129ApplySingleAuthorityPlan','vnextP2CatalogMentions')));
t('identidad Zuzu y usuario separadas',/function v3129AssistantIdentityQuestion/.test(ai)&&/assistant_identity/.test(ai)&&/user_identity/.test(ai));
t('feedback inadmisible se resuelve local',/inadmisible/.test(fn(ai,'vnextP110FeedbackOnly','vnextP110PrepareArgs')));
t('diagnóstico expone autoridad y operación ejecutada',/authority=out\?\.meta\?\.turnAuthority/.test(lab)&&/executedOperations/.test(lab));
t('meta servidor expone turnAuthority',/turnAuthority:\{intent:turnPlan\.intent/.test(ai)&&/executedOperations:results/.test(ai));
t('DaveFX masculino sigue siendo TTS primario',/DAVEFX_VOICE_ID='es_ES-davefx-medium'/.test(lab)&&/S\.ttsProvider='davefx'/.test(lab));
t('TTS pago sigue bloqueado',!/\/api\/antonio-lab\/tts-stream/.test(lab)&&/status\(410\)/.test(routes));
t('coste TTS permanece cero',/estimatedTtsUsd:0/.test(lab)&&/TTS €0/.test(lab));
t('cost fix Vercel preservado',!/"source"\s*:\s*"\/\(\.\*\)"/.test(vercel)&&/api\/index\.js/.test(vercel));

// Prueba ejecutable aislada del traductor/validador: no importa Supabase ni necesita red.
try{
 const ctx={};vm.createContext(ctx);
 const normalize=`function vnextP2RNormalizePlanObject(value={}){const x=(value&&typeof value==='object'&&!Array.isArray(value))?value:{};const intent=trim(x.intent).toUpperCase(),allowed=new Set(['DATA','VIEW','CALCULATE','MEMORY','PERSON','CHAT']);if(!allowed.has(intent))throw new Error('bad');const defaults={DATA:['REPLACE','FRESH','EVENT'],VIEW:['CONTINUE','CURRENT_DATASET','DATASET'],CALCULATE:['CONTINUE','CURRENT_DATASET','DATASET'],MEMORY:['CONTINUE','MEMORY','MEMORY'],PERSON:['REPLACE','FRESH','PERSON'],CHAT:['NONE','NONE','NONE']},d=defaults[intent]||['NONE','NONE','NONE'],cm=trim(x.context_mode).toUpperCase(),sm=trim(x.source_mode).toUpperCase(),st=trim(x.subject_type).toUpperCase();return {intent,context_mode:['CONTINUE','REPLACE','NONE'].includes(cm)?cm:d[0],source_mode:['FRESH','CURRENT_DATASET','MEMORY','NONE'].includes(sm)?sm:d[1],subject_type:['EVENT','PERSON','MEMORY','DATASET','NONE'].includes(st)?st:d[2],operation:trim(x.operation),target:trim(x.target),entities:arr(x.entities).map(trim).filter(Boolean).slice(0,8),args:trim(x.args),response:trim(x.response),narrate:x.narrate===true,repeat:x.repeat===true};}`;
 vm.runInContext(`
 const trim=v=>String(v??'').trim(),arr=v=>Array.isArray(v)?v:[];
 function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim()}
 function vnextP2RScalar(v=''){const t=trim(v);if(!t)return'';if(/^(true|false)$/i.test(t))return t.toLowerCase()==='true';if(/^-?\d+(?:\.\d+)?$/.test(t))return Number(t);return t}
 function vnextP119LastStructuredFocus(){return {}}
 function vnextP13UniqueCalls(x){return x}
 function vnextP122NormalizeMemoryCalls(x){return x}
 function zuzuTracePush(){}
 function vnextP1222NormalizeWorkingSet(x){return x}
 function vnextP1222LastWorkingSet(h){return h[h.length-1]?.resultContext?.current_dataset||null}
 function vnextP125ResolveWorkingSet(h){return vnextP1222LastWorkingSet(h)}
 function v3129WorkingSetSourceArgs(a){const o={};for(const [k,v] of Object.entries(a||{}))if(!['dataset_id','table_key','view_filters','view_sort','visible_columns','hidden_columns'].includes(k))o[k]=v;return o}
 ${normalize}
 ${fn(ai,'vnextP2RParseArgs','vnextP2RPlanToCalls')}
 ${fn(ai,'vnextP2RPlanToCalls','v3129ReopenWorkingSetCall')}
 ${fn(ai,'v3129ReopenWorkingSetCall','v3129ApplySingleAuthorityPlan')}
 ${fn(ai,'v3129ApplySingleAuthorityPlan','vnextP2CatalogMentions')}
 const ws={dataset_id:'ws1',key:'purchase_lines',title:'Compras',base_columns:['Producto'],base_rows:[{Producto:'A'}],total_rows:26,complete:false,source_tool:'query_ce',source_operation:'event_purchases',source_args:{operation:'event_purchases',event:'FUNCION 2026',purchase_status:'pending',detail:'standard'},source_ref:{event:'FUNCION 2026'},view_state:{filters:[],sort:[],visible_columns:[],hidden_columns:[]}};
 const hist=[{resultContext:{current_dataset:ws,operation:'event_purchases',event:'FUNCION 2026',purchase_status:'pending'}}];
 let p={intent:'VIEW',operation:'detail',context_mode:'CONTINUE',source_mode:'FRESH',subject_type:'DATASET'};let c=vnextP2RPlanToCalls(p,hist,[]);let reopen=v3129ApplySingleAuthorityPlan(p,c,hist,'Dámelas una por una',[]);
 p={intent:'DATA',operation:'event_donations',context_mode:'REPLACE',source_mode:'FRESH',subject_type:'EVENT',target:'FUNCION 2026'};c=vnextP2RPlanToCalls(p,hist,[]);let donors=v3129ApplySingleAuthorityPlan(p,c,hist,'Quiero saber los donantes',[]);
 p={intent:'DATA',operation:'event_purchases',context_mode:'REPLACE',source_mode:'FRESH',subject_type:'EVENT',target:'FUNCION 2026',args:'status=pending'};c=vnextP2RPlanToCalls(p,hist,[]);let pending=v3129ApplySingleAuthorityPlan(p,c,hist,'pendientes',[]);
 p={intent:'MEMORY',operation:'search',context_mode:'REPLACE',source_mode:'MEMORY',subject_type:'MEMORY'};c=vnextP2RPlanToCalls(p,hist,[]);let mem=v3129ApplySingleAuthorityPlan(p,c,hist,'recuerdas una conversación de Placidín',[]);
 result={reopen,donors,pending,mem};`,ctx);
 t('reopen conserva fuente event_purchases',ctx.result.reopen?.[0]?.arguments?.operation==='event_purchases');
 t('reopen conserva pending y fuerza full',ctx.result.reopen?.[0]?.arguments?.purchase_status==='pending'&&ctx.result.reopen?.[0]?.arguments?.detail==='full');
 t('cambio a donaciones no arrastra dataset compras',ctx.result.donors?.[0]?.arguments?.operation==='event_donations'&&!('dataset_id' in ctx.result.donors[0].arguments));
 t('status=pending se convierte a purchase_status',ctx.result.pending?.[0]?.arguments?.purchase_status==='pending'&&!('status' in ctx.result.pending[0].arguments));
 t('memory search vacío recibe query del turno actual',/Placidín/.test(ctx.result.mem?.[0]?.arguments?.query||''));
}catch(e){console.error(e);t('suite ejecutable single authority',false)}


// Prueba ejecutable de detalle conversacional: «más detallada» ya no equivale a recitar todo el dataset.
try{
 const ctx={};vm.createContext(ctx);
 vm.runInContext(`
 const trim=v=>String(v??'').trim(),arr=v=>Array.isArray(v)?v:[],num=v=>Number(v)||0;
 function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim()}
 function vnextP1Table(r,k){return (r?.tables||[]).find(x=>x.key===k)}
 function v437VoiceEventLabel(r){return r?.facts?.event||'el evento'}
 function v26Money(v){return Math.round((Number(v)||0)*100)/100}
 function v26FormatEuro(v){return Number(v).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
 ${fn(ai,'v3127PurchaseStatusFromPrompt','vnextP18RepairPurchaseView')}
 ${fn(ai,'v3127PurchaseRowsForAnswer','v3127PurchaseAnswerCues')}
 ${fn(ai,'v3127PurchaseAnswerCues','v3127GroupPurchaseRowsByResponsible')}
 ${fn(ai,'v3127GroupPurchaseRowsByResponsible','v3127WrittenPurchaseDetail')}
 ${fn(ai,'v3127WrittenPurchaseDetail','v3127WrittenRequestedDetail')}
 const rows=[];for(let i=1;i<=179;i++)rows.push({Producto:'Producto '+i,Responsable:['Cito','Colty','Nines','Cordo','Esther'][i%5],Importe:i%17+1,Tipo:'REALIZADA',Unidades:1});
 const r={_vnext_operation:'event_purchases',facts:{event:'Función 2026',status:'all'},tables:[{key:'purchase_lines',rows}]};
 moderate=v3127WrittenPurchaseDetail(r,{operation:'event_purchases'},{},'Dame una información muchísimo más detallada de la que me estás dando.');
 exhaustive=v3127WrittenPurchaseDetail(r,{operation:'event_purchases'},{},'Dame un listado completo, una por una, de todas las compras.');
 `,ctx);
 t('detalle natural no vuelve a 8000 caracteres',typeof ctx.moderate==='string'&&ctx.moderate.length<1400&&/179 compras/.test(ctx.moderate)&&/Reparto principal/.test(ctx.moderate));
 t('listado exhaustivo queda acotado para voz y avisa del resto',typeof ctx.exhaustive==='string'&&ctx.exhaustive.length<5000&&/Quedan 155 compras más/.test(ctx.exhaustive));
}catch(e){console.error(e);t('detalle natural no vuelve a 8000 caracteres',false);t('listado exhaustivo queda acotado para voz y avisa del resto',false)}

// Prueba ejecutable del guard canónico: reproduce exactamente el fallo observado
// «Función 2026 + fecha/hora» sin depender de Gemini, red ni Supabase.
try{
 const ctx={};vm.createContext(ctx);
 vm.runInContext(`
 const trim=v=>String(v??'').trim(),arr=v=>Array.isArray(v)?v:[];
 function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim()}
 const vnextNorm=vnextP17LooseNorm;
 function vnextP1ResolveEventName(){throw new Error('not exact')}
 function zuzuTracePush(){}
 ${fn(ai,'vnextP2CatalogMentions','v3129CanonicalEventFromCatalog')}
 ${fn(ai,'v3129CanonicalEventFromCatalog','v3129CanonicalizeAuthorityContracts')}
 ${fn(ai,'v3129CanonicalizeAuthorityContracts','vnextP2RecentEvents')}
 const state={eventos:[{descripcion:'Función 2026'},{titulo:'SySA 2026'}]};
 const calls=[{name:'query_ce',arguments:{operation:'event_purchases',event:'Función 2026 domingo 6 de septiembre de 2026, 21:41:44.888Z',focus_type:'event',focus_entities:['Función 2026 domingo 6 de septiembre de 2026, 21:41:44.888Z']}}];
 result=v3129CanonicalizeAuthorityContracts(calls,state,'¿Cuántas compras hay pendientes en función 2026?','',[]);
 `,ctx);
 t('guard ejecutable limpia timestamp del evento',ctx.result?.[0]?.arguments?.event==='Función 2026'&&ctx.result?.[0]?.arguments?.focus_entities?.[0]==='Función 2026');
}catch(e){console.error(e);t('guard ejecutable limpia timestamp del evento',false)}

console.log(`\nV3.13 single authority inherited invariants: ${ok} OK / ${ko} KO`);process.exit(ko?1:0);
