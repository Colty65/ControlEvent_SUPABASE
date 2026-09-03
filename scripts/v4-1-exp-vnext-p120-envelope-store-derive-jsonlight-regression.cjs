const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');let ok=0,ko=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n,d)}};

// UNIT · registro/canonizador P1.20 sin DB/dependencias.
const regPath=path.join(root,'services/zuzu-capability-registry.service.js');
let reg=fs.readFileSync(regPath,'utf8').replace(/^import .*$/gm,'').replace(/export\s+const\s+/g,'const ').replace(/export\s+function\s+/g,'function ');
reg+='\n;globalThis.__R={CAPABILITY_REGISTRY_VERSION,capabilityOperations,capabilityDefinition,auditCapabilityCall,queryCeToolParameters,capabilityEnvelopeFromArgs};';
const rctx={crypto,getSupabaseAdmin:()=>null,console,setTimeout,Promise};vm.createContext(rctx);new vm.Script(reg,{filename:regPath}).runInContext(rctx);const R=rctx.__R;
t('registro P1.20',R.CAPABILITY_REGISTRY_VERSION==='20260831-P120');
t('23 capacidades canónicas',R.capabilityOperations().length===23,String(R.capabilityOperations().length));
const schema=R.queryCeToolParameters();
t('schema discriminado 23 ramas',Array.isArray(schema.anyOf)&&schema.anyOf.length===23);
t('contexto universal publica source_args/table_key/focus',schema.anyOf.every(x=>x.properties.source_args&&x.properties.table_key&&x.properties.focus_mode&&x.properties.focus_type&&x.properties.focus_entities));

const store=R.auditCapabilityCall({operation:'event_purchases',store:'Leroy Merlín'});
t('event_purchases + store global → store_purchases',store.ok&&store.effectiveOperation==='store_purchases'&&store.sanitizedArgs.scope==='all_events'&&store.sanitizedArgs.status==='realized',JSON.stringify(store));
t('envelope separa tienda como subject',store.envelope?.subject?.store==='Leroy Merlín'&&store.envelope?.context?.scope==='all_events',JSON.stringify(store.envelope));
const storeScoped=R.auditCapabilityCall({operation:'event_purchases',event:'E',store:'T'});
t('store dentro de evento → include_stores',storeScoped.ok&&storeScoped.effectiveOperation==='event_purchases'&&storeScoped.sanitizedArgs.include_stores?.includes('T'),JSON.stringify(storeScoped));

const personNoise=R.auditCapabilityCall({operation:'person_profile',person:'P',status:'received',view_filters:[{field:'Evento',operator:'contains',value:'2026'}]});
t('person_profile no muere por status heredado',personNoise.ok&&!('status' in personNoise.sanitizedArgs),JSON.stringify(personNoise));
const globalIncome=R.auditCapabilityCall({operation:'person_income_status',person:'P'});
t('ingreso personal global → person_profile income',globalIncome.ok&&globalIncome.effectiveOperation==='person_profile'&&globalIncome.sanitizedArgs.requested_fields?.includes('income'),JSON.stringify(globalIncome));

const deriveEvent=R.auditCapabilityCall({operation:'derive',derive_operation:'SUM',field:'Importe',event:'E',source_operation:'event_purchases'});
t('DERIVE mueve event a source_args',deriveEvent.ok&&deriveEvent.sanitizedArgs.source_args?.event==='E'&&!('event' in deriveEvent.sanitizedArgs),JSON.stringify(deriveEvent));
t('DERIVE canonicaliza Importe→amount',deriveEvent.sanitizedArgs.field==='amount',JSON.stringify(deriveEvent));
const deriveTable=R.auditCapabilityCall({operation:'derive',derive_operation:'MAX',field:'amount',table_key:'by_product',source_args:{operation:'event_purchases',event:'E'}});
t('DERIVE acepta table_key/context',deriveTable.ok&&deriveTable.sanitizedArgs.table_key==='by_product',JSON.stringify(deriveTable));
const purchaseSum=R.auditCapabilityCall({operation:'event_purchases',event:'E',derive_operation:'SUM',derive_field:'Importe'});
t('compras + SUM → DERIVE',purchaseSum.ok&&purchaseSum.effectiveOperation==='derive'&&purchaseSum.sanitizedArgs.derive_operation==='SUM'&&purchaseSum.sanitizedArgs.source_args?.event==='E',JSON.stringify(purchaseSum));

const noisyCompare=R.auditCapabilityCall({operation:'compare_events',events:['A','B'],metric:'income',source_args:{operation:'compare_events',events:['A','B']},mine:true,title:'Comparativa',visible_columns:['Evento'],store_filter_mode:'all',plan:true,purchase_status:'all',exclude_products:['x'],record_count:2,include_stores:['s'],responsible:'p',hidden_columns:['X'],exclude_stores:['z'],order_by:'amount_desc',social_register:'close',income_delta:-2,chart_type:'pie'});
t('compare_events tolera metadatos/descarta claves de otros módulos',noisyCompare.ok&&noisyCompare.effectiveOperation==='compare_events'&&!('mine' in noisyCompare.sanitizedArgs)&&!('purchase_status' in noisyCompare.sanitizedArgs),JSON.stringify(noisyCompare));
t('chart_type inválido sin chart no bloquea',noisyCompare.ok&&!('chart_type' in noisyCompare.sanitizedArgs),JSON.stringify(noisyCompare));
const env=R.capabilityEnvelopeFromArgs(noisyCompare.sanitizedArgs);
t('envelope separa subject/query/context/presentation',env.subject.events?.length===2&&env.query.metric==='income'&&env.context.source_args&&env.presentation.visible_columns?.length===1,JSON.stringify(env));

const table=R.auditCapabilityCall({operation:'event_purchases',event:'E',table_key:'purchase_lines',order_by:'amount_desc'});
t('table_key no invalida event_purchases',table.ok&&table.sanitizedArgs.table_key==='purchase_lines',JSON.stringify(table));
const noOpPerson=R.auditCapabilityCall({person:'Pocholo y Celes',focus_type:'person',focus_entities:['Pocholo y Celes']});
t('operation vacía + person → person_profile',noOpPerson.ok&&noOpPerson.effectiveOperation==='person_profile'&&noOpPerson.sanitizedArgs.person==='Pocholo y Celes',JSON.stringify(noOpPerson));
const noOpEvent=R.auditCapabilityCall({event:'SySA 2025'});
t('operation vacía + event → event_summary',noOpEvent.ok&&noOpEvent.effectiveOperation==='event_summary',JSON.stringify(noOpEvent));
const catEvent=R.auditCapabilityCall({operation:'events_catalog',event:'SySA 2025',scope:'named_event'});
t('events_catalog + event → event_summary',catEvent.ok&&catEvent.effectiveOperation==='event_summary'&&catEvent.sanitizedArgs.event==='SySA 2025',JSON.stringify(catEvent));

const rf=R.auditCapabilityCall({operation:'event_summary',event:'E',requested_fields:['total_income','total_attendance','total_donations','operating_balance']});
t('requested_fields canónicos',JSON.stringify(rf.sanitizedArgs.requested_fields)===JSON.stringify(['income','attendees','donations','balance']),JSON.stringify(rf));

// ESTRUCTURAL runtime + UI/SQL.
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
const sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p120.sql'),'utf8');
t('runtime P1.20 provider/architecture',ai.includes('zuzu-vnext-p120-envelope-store-derive-jsonlight-golden-itv-fast')&&ai.includes('VNext P1.20 · canonical envelope'));
t('DERIVE mezcla historyBase + explicitSource',ai.includes('base={...historyBase,...explicitSource}'));
t('event_income_lines materializa total',ai.includes('ingresos ${fmt(f.income_total)} en ${num(f.record_count)} líneas'));
t('compare_events con metric puede cerrar ganador localmente',ai.includes("metric==='income'?'ingresos'")&&ai.includes('Diferencia:'));
t('anclaje explícito evento vence persona heredada',ai.includes('Una entidad de evento nombrada AHORA tiene prioridad')&&ai.includes("personOps.has(op)&&events.length===1&&people.length===0"));
t('seguimiento global persona usa foco estructurado',ai.includes('vnextP119LastStructuredFocus')&&ai.includes("op==='person_income_status'&&!events.length&&!people.length"));
t('operation vacía se repara sin lenguaje',ai.includes("if(!op&&people.length===1)")&&ai.includes("else if(!op&&events.length===1)"));
t('runtime NHC no incorpora preguntas GOLDEN como reglas',!ai.includes("prompt==='¿Cuál tuvo más ingresos?'")&&!ai.includes("prompt.includes('Leroy Merlín')"));

t('ITV ofrece JSON LIGHT + FULL',ui.includes('⬇ JSON LIGHT')&&ui.includes('⬇ FULL')&&ui.includes("reportFormat:'LIGHT-P120'"));
t('JSON LIGHT no referencia variable inexistente',!ui.includes('executedManifest||')&&ui.includes('const executed=modeManifests[lastMode]||preview||{}'));
t('JSON LIGHT poda filas pesadas de oráculo',ui.includes('function lightOracle')&&ui.includes('summaryRows|incomeRows|productRows|donorRows'));
t('cache-bust P1.20',html.includes('20260831-VNEXT-P120-ENVELOPE-STORE-DERIVE-JSONLIGHT-GOLDEN110-NHC'));
t('SQL P1.20 añade envelope',sql.includes('20260831-P120')&&sql.includes('add column if not exists envelope jsonb'));
t('SQL mantiene 23 contratos',((sql.match(/true,now\(\)\)/g)||[]).length)>=23);
const golden=JSON.parse(fs.readFileSync(path.join(root,'config/zuzu-itv-golden-p117-110.json'),'utf8'));
t('GOLDEN sigue fijo 110',golden.count===110&&golden.cases.length===110&&new Set(golden.cases.map(x=>x.id)).size===110);

console.log(`RESULTADO ${ok}/${ok+ko}`);process.exitCode=ko?1:0;
