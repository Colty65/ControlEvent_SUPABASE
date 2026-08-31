const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
let ok=0,ko=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n,d)}};

// UNIT · registro/canonizador real P1.18 sin DB.
const regPath=path.join(root,'services/zuzu-capability-registry.service.js');
let reg=fs.readFileSync(regPath,'utf8').replace(/^import .*$/gm,'').replace(/export\s+const\s+/g,'const ').replace(/export\s+function\s+/g,'function ');
reg+='\n;globalThis.__R={CAPABILITY_REGISTRY_VERSION,capabilityOperations,capabilityDefinition,auditCapabilityCall,queryCeToolParameters};';
const rctx={crypto,getSupabaseAdmin:()=>null,console,setTimeout,Promise};vm.createContext(rctx);new vm.Script(reg,{filename:regPath}).runInContext(rctx);const R=rctx.__R;
const ops=R.capabilityOperations(),schema=R.queryCeToolParameters();
t('registro P1.18',R.CAPABILITY_REGISTRY_VERSION==='20260831-P118');
t('23 capacidades canónicas',ops.length===23,String(ops.length));
t('schema discriminado por operation',Array.isArray(schema.anyOf)&&schema.anyOf.length===23,String(schema.anyOf?.length));
const pBranch=schema.anyOf.find(x=>x?.properties?.operation?.enum?.[0]==='event_purchases');
t('event_purchases publica compatibilidad top_n/status',!!pBranch?.properties?.top_n&&!!pBranch?.properties?.status&&pBranch.additionalProperties===false);
const mgmt=R.auditCapabilityCall({operation:'event_management',event:'E',requested_fields:['milestones','tasks']});
t('event_management acepta requested_fields',mgmt.ok&&mgmt.classification==='CANONICAL',JSON.stringify(mgmt));
const overview=R.auditCapabilityCall({operation:'events_overview',scope:'all_events'});
t('events_overview scope redundante => COMPATIBLE',overview.ok&&overview.classification==='COMPATIBLE'&&overview.sanitizedArgs.scope===undefined,JSON.stringify(overview));
const statusAlias=R.auditCapabilityCall({operation:'event_purchases',event:'E',status:'pending'});
t('status compras => purchase_status NORMALIZED',statusAlias.ok&&statusAlias.classification==='NORMALIZED'&&statusAlias.sanitizedArgs.purchase_status==='pending'&&statusAlias.sanitizedArgs.status===undefined,JSON.stringify(statusAlias));
const max=R.auditCapabilityCall({operation:'event_purchases',event:'E',order_by:'amount_desc',top_n:1});
t('top1 amount_desc => DERIVE MAX',max.ok&&max.effectiveOperation==='derive'&&max.classification==='NORMALIZED'&&max.sanitizedArgs.derive_operation==='MAX'&&max.sanitizedArgs.source_operation==='event_purchases'&&max.sanitizedArgs.source_args.event==='E',JSON.stringify(max));
const rank=R.auditCapabilityCall({operation:'event_purchases',event:'E',order_by:'amount_desc',top_n:3});
t('topN amount_desc => DERIVE RANK',rank.ok&&rank.effectiveOperation==='derive'&&rank.sanitizedArgs.derive_operation==='RANK'&&rank.sanitizedArgs.top_n===3,JSON.stringify(rank));
const rf=R.auditCapabilityCall({operation:'event_summary',event:'E',requested_fields:'attendees'});
t('requested_fields string => array compatible',rf.ok&&Array.isArray(rf.sanitizedArgs.requested_fields)&&rf.sanitizedArgs.requested_fields[0]==='attendees',JSON.stringify(rf));
const person=R.auditCapabilityCall({operation:'person_profile',person:'Ana'});
t('person focus por defecto REPLACE estructurado',person.ok&&person.sanitizedArgs.focus_mode==='replace',JSON.stringify(person));
const malformed=R.auditCapabilityCall({operation:'event_summary',event:'E',attendance_mode:'attendees'});
t('clave realmente ajena => MALFORMED_CALL',!malformed.ok&&malformed.classification==='MALFORMED_CALL',JSON.stringify(malformed));
const unknown=R.auditCapabilityCall({operation:'event_magic'});
t('operación inexistente => UNSUPPORTED_CAPABILITY',!unknown.ok&&unknown.classification==='UNSUPPORTED_CAPABILITY',JSON.stringify(unknown));

// UNIT ITV · cargamos únicamente el bloque puro previo a buildRealFastCases.
const labPath=path.join(root,'services/zuzu-test-lab.service.js'),labFull=fs.readFileSync(labPath,'utf8');
const cut=labFull.indexOf('async function buildRealFastCases');
let lab=labFull.slice(0,cut).replace(/^import .*$/gm,'').replace(/^const __dirname = .*$/gm,'').replace(/export\s+async\s+function\s+/g,'async function ').replace(/export\s+function\s+/g,'function ').replace(/export\s+const\s+/g,'const ');
lab+='\n;globalThis.__L={itvCapabilityExpectation,itvObservedCapability,itvCapabilityCompatible,validateExpectedCapability,itvDecisionDiagnosis,vNextAuditOf,markScenarioCascade,validateOracle,validatePaidCase};';
const lctx={console,setTimeout,Promise,Intl,Date,Math,Number,String,Array,Object,Set,Map,RegExp,JSON,Error};vm.createContext(lctx);new vm.Script(lab,{filename:labPath}).runInContext(lctx);const L=lctx.__L;
function result({answer,op,event='',person='',tables=[],durationMs=1000,classification='CANONICAL',tool='query_ce',args={}}){const raw={operation:op,...(event?{event}:{}),...(person?{person}:{}),...args};return{ok:true,title:'Zuzu',answer,warnings:[],tables,charts:[],meta:{tools:tool?[tool]:[],performance:{totalMs:durationMs},geminiUsageEstimate:{calls:1,totalTokens:5000},resultContext:{kind:tool?'data':'conversation',operation:op||'',event,person,order_by:args.order_by||''},capabilityCalls:tool?[{tool,rawArgs:raw,normalizedArgs:raw,effectiveOperation:op,audit:{classification,repairs:[]}}]:[]}};}
const donationsCase={engine:'VNEXT',group:'MEDIA · DOS OBJETIVOS',event:'E',oracle:{kind:'donations',event:'E',data:{records:0,total:0}}};
const donationsViaSummary=result({answer:'E: ingresos 100,00 €, asistencia 10 personas, donaciones 0,00 €.',op:'event_summary',event:'E'});
const dv=L.validatePaidCase(donationsCase,donationsViaSummary);
t('factual coverage: event_summary puede cubrir donaciones',dv.functionalStatus==='OK',JSON.stringify(dv));
const compareCase={engine:'VNEXT',group:'MEDIA · COMPARACIÓN',oracle:{kind:'compare-metric',metric:'income',compare:{rows:[{event:'A',income:500},{event:'B',income:200}]}}};
const compare=result({answer:'A tiene más ingresos: 500,00 € frente a 200,00 €.',op:'compare_events'});
t('compare_events aceptable si cubre compare-metric',L.validateExpectedCapability(compareCase,compare).status==='OK');
const purchaseCase={engine:'VNEXT',group:'MEDIA · COMPRAS',event:'E',oracle:{kind:'purchase-max',event:'E',row:{label:'Producto X',amount:240}}};
const purchase=result({answer:'El producto más caro es Producto X: 240,00 €.',op:'event_purchases',event:'E'});
t('event_purchases aceptable como cobertura de purchase-max',L.validatePaidCase(purchaseCase,purchase).functionalStatus==='OK',JSON.stringify(L.validatePaidCase(purchaseCase,purchase)));
const slowCase={engine:'VNEXT',group:'MEDIA · DOS OBJETIVOS',event:'E',oracle:{kind:'event-summary',event:'E',requiredMetrics:['income','attendees'],data:{income:100,purchases:50,pending:0,donations:0,balance:50,valuation:50,attendees:10}}};
const slow=result({answer:'E: ingresos 100,00 €, asistencia 10 personas.',op:'event_summary',event:'E',durationMs:19001});
const slowV=L.validatePaidCase(slowCase,slow);
t('latencia >18s no convierte funcional OK en KO',slowV.functionalStatus==='OK'&&slowV.status==='OK'&&slowV.performanceStatus==='KO',JSON.stringify(slowV));
const bankCase={engine:'VNEXT',group:'BÁSICO · BANCO',event:'E',prompt:'Dame el Cuadre Banco de E.',oracle:{kind:'bank-summary',event:'E',data:{hasReconciliation:false,lifecycleMessage:'CUADRE BANCARIO SIN REALIZAR'}}};
const bank=result({answer:'CUADRE BANCARIO SIN REALIZAR. E: 0 movimientos incluidos, 0 justificados, impacto 0,00 € y saldo 0,00 €.',op:'event_bank',event:'E'});
t('bank SIN REALIZAR admite ceros explícitos',L.validatePaidCase(bankCase,bank).functionalStatus==='OK',JSON.stringify(L.validatePaidCase(bankCase,bank)));
const sortCase={engine:'VNEXT',group:'MEDIA · TABLA',event:'E',oracle:{kind:'ledger-structural',domain:'purchases',operations:['sort:Importe:desc']}};
const sort=result({answer:'E: detalle ordenado por amount / desc.',op:'event_purchases',event:'E',args:{order_by:'amount_desc'},tables:[{key:'purchase_lines',columns:['Producto','Importe'],rows:[{Producto:'X',Importe:10}]}]});
t('SORT amount_desc acredita Importe desc',L.validatePaidCase(sortCase,sort).functionalStatus==='OK',JSON.stringify(L.validatePaidCase(sortCase,sort)));

// GOLDEN fijo.
const goldenPath=path.join(root,'config/zuzu-itv-golden-p117-110.json'),golden=JSON.parse(fs.readFileSync(goldenPath,'utf8'));
const ids=golden.cases.map(x=>x.id),basic=ids.filter(x=>x.startsWith('lang-basic-')).length,medium=ids.filter(x=>x.startsWith('lang-medium-')).length;
t('GOLDEN fixture 110 exactos',golden.count===110&&golden.cases.length===110,String(golden.cases.length));
t('GOLDEN IDs únicos 50+60',new Set(ids).size===110&&basic===50&&medium===60,`${basic}/${medium}`);
t('GOLDEN conserva escenarios y motor VNEXT',golden.cases.every(x=>x.scenario&&x.engine==='VNEXT'));

// ESTRUCTURAL runtime/UI/SQL · no es E2E Gemini.
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8'),ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8'),sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p118.sql'),'utf8');
t('runtime P1.18 usa canonizador',ai.includes('VNEXT P1.18 · REGISTRO/CANONIZADOR DE CAPACIDADES')&&ai.includes('zuzu-vnext-p118-capability-canonicalizer-golden-itv-fast'));
t('runtime tiene foco REPLACE/ADD estructurado',ai.includes('vnextP118ApplyStructuredFocusCalls')&&ai.includes('focus_mode'));
t('runtime DERIVE admite source_args',ai.includes('source_args')&&ai.includes('source_operation'));
t('runtime NHC no contiene prompts GOLDEN',!ai.includes('Dame un panorama económico de todos los eventos.')&&!ai.includes('¿Cuál fue el producto más caro de esos?'));
t('ITV P1.18 separa functional/performance',labFull.includes('functionalStatus')&&labFull.includes('performanceStatus'));
t('ITV GOLDEN disponible',labFull.includes("GOLDEN:{id:'GOLDEN'")&&labFull.includes('GOLDEN-P117-110'));
t('UI ofrece GOLDEN 110',ui.includes('data-level="GOLDEN"')&&ui.includes('GOLDEN · 110'));
t('UI separa rendimiento',ui.includes('performanceVerdicts')&&ui.includes('PERF_WARN')&&ui.includes('PERF_KO'));
t('build UI P1.18',ui.includes('20260831-P118-CANONICALIZER-FACTUAL-COVERAGE-GOLDEN110-NHC'));
t('cache P1.18',html.includes('20260831-VNEXT-P118-CANONICALIZER-FACTUAL-COVERAGE-GOLDEN110-LANG260-NHC'));
t('SQL espejo P1.18',sql.includes('20260831-P118')&&sql.includes('ce_zuzu_capability_observations')&&sql.includes('requested_fields'));

console.log(`RESULTADO ${ok}/${ok+ko}`);process.exitCode=ko?1:0;
