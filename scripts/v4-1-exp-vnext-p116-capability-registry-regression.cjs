const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
let ok=0,ko=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n,d)}};

// UNIT: ejecuta el código REAL del registro, retirando solo imports/exports ESM y sustituyendo Supabase por stub.
const regPath=path.join(root,'services/zuzu-capability-registry.service.js');
let reg=fs.readFileSync(regPath,'utf8').replace(/^import .*$/gm,'').replace(/export\s+const\s+/g,'const ').replace(/export\s+function\s+/g,'function ');
reg+='\n;globalThis.__R={CAPABILITY_REGISTRY_VERSION,capabilityOperations,auditCapabilityCall,queryCeToolParameters};';
const rctx={crypto,getSupabaseAdmin:()=>null,console,setTimeout,Promise};vm.createContext(rctx);new vm.Script(reg,{filename:regPath}).runInContext(rctx);const R=rctx.__R;
const ops=R.capabilityOperations();
t('registro P1.16 real',R.CAPABILITY_REGISTRY_VERSION==='20260831-P116');t('23 capacidades canónicas reales',ops.length===23,String(ops.length));
for(const op of ['event_documentation','event_management','store_purchases','events_overview','derive'])t(`capacidad ${op}`,ops.includes(op));
const schema=R.queryCeToolParameters();t('schema query_ce nace del registro',schema.properties.operation.enum.length===ops.length);t('DERIVE enum completo',JSON.stringify(schema.properties.derive_operation.enum)===JSON.stringify(['SUM','COUNT','DISTINCT_COUNT','MAX','MIN','AVG','RANK','DIFFERENCE']));
const accidental=R.auditCapabilityCall({operation:'event_purchases',event:'X',mine:true,responsible:'Colty'});t('mine/responsible accidental se sanea',accidental.ok&&accidental.classification==='SANITIZED'&&accidental.sanitizedArgs.mine===undefined&&accidental.sanitizedArgs.responsible===undefined,JSON.stringify(accidental));
const explicit=R.auditCapabilityCall({operation:'event_purchases',event:'X',mine:true,responsible:'Colty',requested_constraints:['mine','responsible']});t('mine/responsible explícito se conserva',explicit.ok&&explicit.sanitizedArgs.mine===true&&explicit.sanitizedArgs.responsible==='Colty');
const missing=R.auditCapabilityCall({operation:'event_bank'});t('required event se valida',!missing.ok&&missing.classification==='INVALID_CONTRACT',JSON.stringify(missing));
const unknown=R.auditCapabilityCall({operation:'event_magic'});t('operación desconocida no se autoaprueba',!unknown.ok&&unknown.classification==='UNSUPPORTED_CAPABILITY');
const enumBad=R.auditCapabilityCall({operation:'event_attendance',event:'SySA 2026',attendance_mode:'quienquiera'});t('enum inválido se rechaza',!enumBad.ok&&enumBad.issues.some(x=>x.includes('Tipo inválido en attendance_mode')),JSON.stringify(enumBad));

// UNIT ITV: ejecuta el primer bloque REAL del laboratorio (funciones puras) sin cargar dependencias externas.
const labPath=path.join(root,'services/zuzu-test-lab.service.js'),labFull=fs.readFileSync(labPath,'utf8');
const cut=labFull.indexOf('async function buildRealFastCases');let lab=labFull.slice(0,cut).replace(/^import .*$/gm,'').replace(/export\s+async\s+function\s+/g,'async function ').replace(/export\s+function\s+/g,'function ').replace(/export\s+const\s+/g,'const ');
lab+='\n;globalThis.__L={itvCapabilityExpectation,itvObservedCapability,itvDecisionDiagnosis,vNextAuditOf,vNextTableRowsAsObjects,markScenarioCascade,validatePaidCase};';
const lctx={console,setTimeout,Promise,Intl,Date,Math,Number,String,Array,Object,Set,Map,RegExp,JSON,Error};vm.createContext(lctx);new vm.Script(lab,{filename:labPath}).runInContext(lctx);const L=lctx.__L;
for(const [kind,op] of [['documentation','event_documentation'],['management','event_management'],['store-purchases','store_purchases'],['events-overview','events_overview'],['compare-metric','derive'],['purchase-max','derive'],['purchase-sum','derive']]){const e=L.itvCapabilityExpectation({oracle:{kind}});t(`ITV ${kind} -> ${op}`,e.available===true&&e.operation===op,JSON.stringify(e));}
const purchaseCase={engine:'VNEXT',event:'Reforma fachada y barra - JUL25',oracle:{kind:'purchase-set',event:'Reforma fachada y barra - JUL25',productCount:2,total:30}};
const purchaseResult={ok:true,answer:'Reforma fachada y barra - JUL25: 3 registros · 2 productos distintos por 30,00 €.',tables:[{key:'by_product',columns:['Producto','Importe'],rows:[['Pan',10],['Queso',20]]}],meta:{tools:['query_ce'],resultContext:{kind:'data',operation:'event_purchases',event:'Reforma fachada y barra - JUL25'},capabilityCalls:[{tool:'query_ce',rawArgs:{operation:'event_purchases',event:'Reforma fachada y barra - JUL25'},normalizedArgs:{operation:'event_purchases',event:'Reforma fachada y barra - JUL25'},audit:{classification:'KNOWN',repairs:[]}}]}};
const pv=L.validatePaidCase(purchaseCase,purchaseResult);t('purchase-set certifica by_product con filas array',pv.status==='OK',JSON.stringify(pv));
const sortCase={engine:'VNEXT',event:'SySA 2026',oracle:{kind:'ledger-structural',domain:'purchases',event:'SySA 2026',operations:['sort:Importe:desc']}};
const sortResult={ok:true,answer:'SySA 2026 ordenado.',tables:[{key:'purchase_lines',columns:['Producto','Importe'],rows:[['A',20],['B',10]]}],meta:{tools:['query_ce'],resultContext:{kind:'data',operation:'event_purchases',event:'SySA 2026',order_by:'Importe:desc',table_view_sort:[{field:'Importe',direction:'desc'}]}}};
const sv=L.validatePaidCase(sortCase,sortResult);t('SORT se certifica estructuralmente',sv.status==='OK',JSON.stringify(sv));
const diag=L.itvDecisionDiagnosis({group:'BÁSICO · COMPRAS',oracle:{kind:'purchase-set'}},{meta:{tools:['query_ce'],resultContext:{kind:'data',operation:'event_purchases'},capabilityCalls:[{tool:'query_ce',rawArgs:{operation:'event_purchases',event:'X',mine:true,responsible:'Colty'},normalizedArgs:{operation:'event_purchases',event:'X'},audit:{classification:'SANITIZED',repairs:['Se ignoró mine','Se ignoró responsible']}}]}},{status:'KO',reasons:['x']});
t('args espurios => GEMINI_GUIDANCE',diag.category==='GEMINI_GUIDANCE',JSON.stringify(diag));
const rows=[{id:'a',scenario:'S1',status:'KO',decisionDiagnosis:{category:'CE_DATA_CONTRACT',touch:'CE'}},{id:'b',scenario:'S1',status:'KO',decisionDiagnosis:{category:'GEMINI_GUIDANCE',touch:'G'}},{id:'c',scenario:'S2',status:'KO',decisionDiagnosis:{category:'CAPABILITY_GAP',touch:'N'}}];L.markScenarioCascade(rows);t('primer KO queda raíz',rows[0].decisionDiagnosis.rootCause===true&&!rows[0].decisionDiagnosis.cascade);t('segundo KO mismo escenario => CASCADE',rows[1].decisionDiagnosis.category==='CASCADE'&&rows[1].decisionDiagnosis.cascadeOf==='a');t('otro escenario conserva causa',rows[2].decisionDiagnosis.category==='CAPABILITY_GAP');

// STRUCTURAL: cableado runtime/UI/SQL. No se presenta como prueba E2E Gemini.
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8'),ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8'),sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p116.sql'),'utf8');
t('runtime audita JSON completo',ai.includes('auditCapabilityCall(rawArgs')&&ai.includes('capabilityCalls:results.map'));
t('runtime ejecuta cuatro capacidades generales',ai.includes("op==='event_documentation'")&&ai.includes("op==='event_management'")&&ai.includes("op==='store_purchases'")&&ai.includes("op==='events_overview'"));
t('runtime ejecuta DERIVE',ai.includes('vnextP116ExecuteDerive')&&ai.includes("if(op==='derive')"));t('person_events usa person_dossier común',ai.includes('Misma identidad y misma fuente person_dossier que person_profile'));t('renderer usa requested_fields',ai.includes('requested_fields')&&ai.includes('attendees:`asistencia'));
t('ITV conserva capabilityCalls',labFull.includes('capabilityCalls:vnext?arr(result?.meta?.capabilityCalls)'));t('UI causa raíz/cascade',ui.includes('function classifyCascades')&&ui.includes("category:'CASCADE'"));t('build P1.16',ui.includes('20260831-P116-CAPABILITY-REGISTRY-DERIVE-ROOT-CAUSE-NHC'));t('cache bust P1.16',html.includes('20260831-VNEXT-P116-CAPABILITY-REGISTRY-DERIVE-ROOTCAUSE-LANG260-NHC'));t('SQL auditable',sql.includes('ce_zuzu_capabilities')&&sql.includes('ce_zuzu_capability_observations'));
console.log(`RESULTADO ${ok}/${ok+ko}`);process.exitCode=ko?1:0;
