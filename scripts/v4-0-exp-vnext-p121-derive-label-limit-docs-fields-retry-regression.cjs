const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');let ok=0,ko=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n,d)}};

const regPath=path.join(root,'services/zuzu-capability-registry.service.js');
let reg=fs.readFileSync(regPath,'utf8').replace(/^import .*$/gm,'').replace(/export\s+const\s+/g,'const ').replace(/export\s+function\s+/g,'function ');
reg+='\n;globalThis.__R={CAPABILITY_REGISTRY_VERSION,capabilityOperations,auditCapabilityCall,queryCeToolParameters,capabilityEnvelopeFromArgs};';
const rctx={crypto,getSupabaseAdmin:()=>null,console,setTimeout,Promise};vm.createContext(rctx);new vm.Script(reg,{filename:regPath}).runInContext(rctx);const R=rctx.__R;

t('registro P1.21',R.CAPABILITY_REGISTRY_VERSION==='20260901-P121');
t('23 capacidades canónicas',R.capabilityOperations().length===23,String(R.capabilityOperations().length));
const schema=R.queryCeToolParameters(),schemaText=JSON.stringify(schema);
t('schema discriminado 23 ramas',Array.isArray(schema.anyOf)&&schema.anyOf.length===23);
t('schema compacto para latencia',schemaText.length<45000,`chars=${schemaText.length}`);
const eventSummary=schema.anyOf.find(x=>x.properties?.operation?.enum?.[0]==='event_summary');
const fields=eventSummary?.properties?.requested_fields?.items?.enum||[];
t('event_summary requested_fields catálogo fuerte',JSON.stringify(fields)===JSON.stringify(['income','purchases','pending','donations','balance','attendees','valuation','status']),JSON.stringify(fields));
t('balance está publicado explícitamente',fields.includes('balance')&&String(eventSummary.properties.requested_fields.description).includes('saldo operativo'));

const top1=R.auditCapabilityCall({operation:'event_purchases',event:'SySA 2026',purchase_status:'realized',order_by:'amount_desc',record_count:1});
t('record_count=1 + amount_desc → DERIVE MAX',top1.ok&&top1.effectiveOperation==='derive'&&top1.sanitizedArgs.derive_operation==='MAX'&&top1.sanitizedArgs.field==='amount',JSON.stringify(top1));
t('top1 conserva source event',top1.sanitizedArgs.source_args?.event==='SySA 2026'&&top1.sanitizedArgs.source_args?.operation==='event_purchases',JSON.stringify(top1.sanitizedArgs));
const ordinary=R.auditCapabilityCall({operation:'event_purchases',event:'E',order_by:'amount_desc',record_count:91});
t('record_count normal NO se interpreta como top_n',ordinary.ok&&ordinary.effectiveOperation==='event_purchases',JSON.stringify(ordinary));
const aliases=R.auditCapabilityCall({operation:'event_summary',event:'E',requested_fields:['operating_balance','total_income','total_attendance']});
t('aliases requested_fields siguen canonizando',JSON.stringify(aliases.sanitizedArgs.requested_fields)===JSON.stringify(['balance','income','attendees']),JSON.stringify(aliases.sanitizedArgs));

const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
t('DERIVE label vacío usa identificador por defecto, no campo numérico',ai.includes("requestedLabel=trim(decision?.label_field),labelField=requestedLabel?vnextP116ResolveDeriveField(table,requestedLabel):vnextP116DefaultLabelField(table,sourceOp)"));
t('docs sin query se canoniza a event_documentation',ai.includes('function vnextP121NormalizeAuxiliaryCalls')&&ai.includes("search_documents'&&trim(a.event)&&!trim(a.query)")&&ai.includes("operation:'event_documentation'"));
t('retry único de pseudo function_call',ai.includes('VNEXT P1.21 · FUNCTION CALL RETRY')&&ai.includes('[CE_PROTOCOL_RETRY]')&&ai.includes('calls++'));
t('retry solo se activa sin tool y con leak',ai.includes('if(!functionCalls.length&&vnextP110LooksLikeInternalCall(trim(v261OutputText(payload))))'));
t('provider P1.21',ai.includes('zuzu-vnext-p121-derive-label-limit-docs-fields-retry-jsonlight'));
t('arquitectura P1.21',ai.includes('VNext P1.21 · DERIVE row identity'));
t('ayuda Gemini explicita balance',ai.includes('balance es el saldo operativo canónico'));
t('ayuda docs distingue búsqueda de estado documental',ai.includes('search_documents solo sirve para buscar CONTENIDO concreto'));
t('NHC: no contiene preguntas GOLDEN literales como reglas nuevas',!ai.includes("prompt==='¿Cuál tuvo más ingresos?'")&&!ai.includes("prompt.includes('Servicio cantante')")&&!ai.includes("prompt.includes('Semana Santa 2026')"));

const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
t('JSON LIGHT P1.21',ui.includes("reportFormat:'LIGHT-P121'"));
t('cache-bust P1.21',html.includes('20260901-VNEXT-P121-DERIVE-LABEL-LIMIT-DOCS-FIELDS-RETRY-GOLDEN110-NHC'));
const sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p121.sql'),'utf8');
t('SQL P1.21 idempotente/versionado',sql.includes('20260901-P121')&&sql.includes('on conflict (operation) do update'));
const golden=JSON.parse(fs.readFileSync(path.join(root,'config/zuzu-itv-golden-p117-110.json'),'utf8'));
t('GOLDEN sigue fijo 110',golden.count===110&&golden.cases.length===110&&new Set(golden.cases.map(x=>x.id)).size===110);
console.log(`RESULTADO ${ok}/${ok+ko}`);process.exitCode=ko?1:0;
