const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');let ok=0,ko=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n,d)}};

// UNIT · registro/canonizador P1.19 sin DB.
const regPath=path.join(root,'services/zuzu-capability-registry.service.js');
let reg=fs.readFileSync(regPath,'utf8').replace(/^import .*$/gm,'').replace(/export\s+const\s+/g,'const ').replace(/export\s+function\s+/g,'function ');
reg+='\n;globalThis.__R={CAPABILITY_REGISTRY_VERSION,capabilityOperations,capabilityDefinition,auditCapabilityCall,queryCeToolParameters};';
const rctx={crypto,getSupabaseAdmin:()=>null,console,setTimeout,Promise};vm.createContext(rctx);new vm.Script(reg,{filename:regPath}).runInContext(rctx);const R=rctx.__R;
t('registro P1.19',R.CAPABILITY_REGISTRY_VERSION==='20260831-P119');
t('23 capacidades canónicas',R.capabilityOperations().length===23,String(R.capabilityOperations().length));
const schema=R.queryCeToolParameters(),pBranch=schema.anyOf.find(x=>x?.properties?.operation?.enum?.[0]==='event_purchases');
t('schema discriminado 23 ramas',Array.isArray(schema.anyOf)&&schema.anyOf.length===23);
t('focus universal publicado',schema.anyOf.every(x=>x.properties.focus_mode&&x.properties.focus_type&&x.properties.focus_entities));
t('event_purchases publica derive_field',!!pBranch?.properties?.derive_field);
const rf=R.auditCapabilityCall({operation:'event_summary',event:'E',requested_fields:['total_income','total_attendance','operating_balance','total_donations']});
t('requested_fields aliases → canónicos',rf.ok&&JSON.stringify(rf.sanitizedArgs.requested_fields)===JSON.stringify(['income','attendees','balance','donations']),JSON.stringify(rf));
const sum=R.auditCapabilityCall({operation:'event_purchases',event:'E',derive_operation:'SUM',derive_field:'Importe'});
t('derive_field + SUM compras → DERIVE SUM',sum.ok&&sum.effectiveOperation==='derive'&&sum.sanitizedArgs.derive_operation==='SUM'&&sum.sanitizedArgs.field==='amount'&&sum.sanitizedArgs.source_args.event==='E',JSON.stringify(sum));
const max=R.auditCapabilityCall({operation:'event_purchases',event:'E',order_by:'amount_desc',top_n:1});
t('top1 amount_desc → DERIVE MAX',max.ok&&max.effectiveOperation==='derive'&&max.sanitizedArgs.derive_operation==='MAX',JSON.stringify(max));
const globalIncome=R.auditCapabilityCall({operation:'person_income_status',person:'Pocholo',requested_fields:['total_income']});
t('ingreso global persona → person_profile income',globalIncome.ok&&globalIncome.effectiveOperation==='person_profile'&&globalIncome.sanitizedArgs.person==='Pocholo'&&globalIncome.sanitizedArgs.requested_fields.includes('income'),JSON.stringify(globalIncome));
const focus=R.auditCapabilityCall({operation:'person_profile',person:'Angelito Téllez',focus_mode:'replace',focus_type:'person',focus_entities:['Angelito Téllez']});
t('focus_entities ya no es MALFORMED',focus.ok&&focus.sanitizedArgs.focus_entities[0]==='Angelito Téllez',JSON.stringify(focus));
const purchases=R.auditCapabilityCall({operation:'event_purchases',event:'E'});
t('compras sin status → realized',purchases.ok&&purchases.sanitizedArgs.purchase_status==='realized',JSON.stringify(purchases));

// UNIT ITV puro.
const labPath=path.join(root,'services/zuzu-test-lab.service.js'),labFull=fs.readFileSync(labPath,'utf8'),cut=labFull.indexOf('async function buildRealFastCases');
let lab=labFull.slice(0,cut).replace(/^import .*$/gm,'').replace(/^const __dirname = .*$/gm,'').replace(/export\s+async\s+function\s+/g,'async function ').replace(/export\s+function\s+/g,'function ').replace(/export\s+const\s+/g,'const ');
lab+='\n;globalThis.__L={itvDecisionDiagnosis,validatePaidCase};';const lctx={console,setTimeout,Promise,Intl,Date,Math,Number,String,Array,Object,Set,Map,RegExp,JSON,Error};vm.createContext(lctx);new vm.Script(lab,{filename:labPath}).runInContext(lctx);const L=lctx.__L;
function result({answer,op,event='',classification='CANONICAL',durationMs=1000,args={}}){const raw={operation:op,...(event?{event}:{}),...args};return{ok:true,title:'Zuzu',answer,warnings:[],tables:[],charts:[],meta:{tools:['query_ce'],performance:{totalMs:durationMs},geminiUsageEstimate:{calls:1,totalTokens:5000},resultContext:{kind:'data',operation:op,event},capabilityCalls:[{tool:'query_ce',rawArgs:raw,normalizedArgs:raw,effectiveOperation:op,audit:{classification,repairs:classification==='NORMALIZED'?['x']:[]}}]}};}
const zeroCase={engine:'VNEXT',group:'MEDIA · DOS OBJETIVOS',event:'E',oracle:{kind:'donations',event:'E',data:{records:0,donors:0,total:0}}};
const blank=L.validatePaidCase(zeroCase,result({answer:'E: .',op:'event_summary',event:'E'}));
t('ITV cero no materializado = KO',blank.functionalStatus==='KO'&&blank.functionalReasons.some(x=>x.includes('valor cero')),JSON.stringify(blank));
const explicit=L.validatePaidCase(zeroCase,result({answer:'E: donaciones 0,00 €.',op:'event_summary',event:'E'}));
t('ITV cero explícito = OK',explicit.functionalStatus==='OK',JSON.stringify(explicit));
const normalizedBad=result({answer:'E: .',op:'event_summary',event:'E',classification:'NORMALIZED'}),verdict=L.validatePaidCase({engine:'VNEXT',group:'MEDIA · DOS OBJETIVOS',event:'E',oracle:{kind:'event-summary',event:'E',requiredMetrics:['income','attendees'],data:{income:100,attendees:10,purchases:0,pending:0,donations:0,balance:100,valuation:0}}},normalizedBad),diag=L.itvDecisionDiagnosis({engine:'VNEXT',group:'MEDIA · DOS OBJETIVOS',event:'E',oracle:{kind:'event-summary',event:'E',requiredMetrics:['income','attendees'],data:{income:100,attendees:10,purchases:0,pending:0,donations:0,balance:100,valuation:0}}},normalizedBad,verdict);
t('decisionDiagnosis nunca OK si functional KO',verdict.functionalStatus==='KO'&&diag.category!=='OK',JSON.stringify({verdict,diag}));

// ESTRUCTURAL runtime.
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8'),ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8'),sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p119.sql'),'utf8');
t('runtime ancla entidades canónicas atómicas',ai.includes('vnextP119AnchorCanonicalEntities')&&ai.includes('ENTIDADES CANÓNICAS ATÓMICAS'));
t('runtime usa foco P1.19',ai.includes('vnextP119ApplyStructuredFocusCalls')&&ai.includes('focus_type'));
t('DERIVE conserva source_event/source_person',ai.includes('source_event:trim(source?.facts?.event||base?.event)')&&ai.includes('source_person:trim(source?.facts?.person||base?.person)'));
t('ejecución compras default realized',ai.includes("trim(decision.purchase_status):'realized'"));
t('provider/arquitectura P1.19',ai.includes('zuzu-vnext-p119-atomic-entity-focus-derive-golden-itv-fast')&&ai.includes('VNext P1.19 · atomic canonical entities'));
t('schema ayuda distingue gestión/documentación',ai.includes('event_management es exclusivamente Hitos y tareas LG')&&ai.includes('event_documentation es expediente/evidencias'));
t('schema ayuda distingue pendientes por dominio',ai.includes('pendiente DE INGRESO')&&ai.includes('pendiente DE COMPRA'));
t('schema trata entidad canónica como átomo',ai.includes('Los nombres canónicos que existen en los catálogos de CE son ÁTOMOS'));
t('runtime NHC no contiene prompts GOLDEN nuevos',!ai.includes('Dame un panorama económico de todos los eventos.')&&!ai.includes('¿Cuál fue el producto más caro de esos?'));
t('ITV P1.19 contiene guard cero',labFull.includes('el valor cero debe materializarse explícitamente'));
t('build UI P1.19',ui.includes('20260831-P119-ATOMIC-FOCUS-DERIVE-GOLDEN110-NHC'));
t('cache UI P1.19',html.includes('20260831-VNEXT-P119-ATOMIC-FOCUS-DERIVE-GOLDEN110-NHC'));
t('SQL espejo P1.19',sql.includes('20260831-P119')&&sql.includes('"purchase_status":"realized"')&&sql.includes('focus_entities')&&sql.includes('derive_field'));
const golden=JSON.parse(fs.readFileSync(path.join(root,'config/zuzu-itv-golden-p117-110.json'),'utf8'));
t('GOLDEN sigue fijo 110',golden.count===110&&golden.cases.length===110&&new Set(golden.cases.map(x=>x.id)).size===110);

console.log(`RESULTADO ${ok}/${ok+ko}`);process.exitCode=ko?1:0;
