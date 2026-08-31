const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');
let ok=0,ko=0;const t=(n,c,d='')=>{if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n,d)}};

// UNIT: registro real P1.17 sin dependencias externas.
const regPath=path.join(root,'services/zuzu-capability-registry.service.js');
let reg=fs.readFileSync(regPath,'utf8').replace(/^import .*$/gm,'').replace(/export\s+const\s+/g,'const ').replace(/export\s+function\s+/g,'function ');
reg+='\n;globalThis.__R={CAPABILITY_REGISTRY_VERSION,capabilityOperations,auditCapabilityCall,queryCeToolParameters};';
const rctx={crypto,getSupabaseAdmin:()=>null,console,setTimeout,Promise};vm.createContext(rctx);new vm.Script(reg,{filename:regPath}).runInContext(rctx);const R=rctx.__R;
const ops=R.capabilityOperations(),schema=R.queryCeToolParameters();
t('registro P1.17',R.CAPABILITY_REGISTRY_VERSION==='20260831-P117');
t('23 capacidades canónicas',ops.length===23,String(ops.length));
t('schema discriminado anyOf por operation',Array.isArray(schema.anyOf)&&schema.anyOf.length===ops.length,String(schema.anyOf?.length));
const purchaseBranch=schema.anyOf.find(x=>x?.properties?.operation?.enum?.[0]==='event_purchases');
t('rama event_purchases solo publica sus claves',!!purchaseBranch&&purchaseBranch.additionalProperties===false&&purchaseBranch.properties.mine&&purchaseBranch.properties.order_by&&!purchaseBranch.properties.attendance_mode);
t('requested_constraints desaparece del schema',!schema.properties.requested_constraints&&!schema.anyOf.some(x=>x?.properties?.requested_constraints));
const mine=R.auditCapabilityCall({operation:'event_purchases',event:'X',mine:true,responsible:'Colty'});
t('mine/responsible válidos no requieren duplicación',mine.ok&&mine.sanitizedArgs.mine===true&&mine.sanitizedArgs.responsible==='Colty'&&mine.classification==='KNOWN',JSON.stringify(mine));
const rf=R.auditCapabilityCall({operation:'event_summary',event:'X',requested_fields:'attendees'});
t('requested_fields string se normaliza estructuralmente',rf.ok&&Array.isArray(rf.sanitizedArgs.requested_fields)&&rf.sanitizedArgs.requested_fields[0]==='attendees',JSON.stringify(rf));
const malformed=R.auditCapabilityCall({operation:'event_summary',event:'X',attendance_mode:'attendees'});
t('clave ajena a operation => MALFORMED_CALL',!malformed.ok&&malformed.classification==='MALFORMED_CALL',JSON.stringify(malformed));
const missing=R.auditCapabilityCall({operation:'event_bank'});t('required missing => MALFORMED_CALL',!missing.ok&&missing.classification==='MALFORMED_CALL',JSON.stringify(missing));
const unknown=R.auditCapabilityCall({operation:'event_magic'});t('operación desconocida => UNSUPPORTED_CAPABILITY',!unknown.ok&&unknown.classification==='UNSUPPORTED_CAPABILITY');

// UNIT ITV: bloque puro real del laboratorio.
const labPath=path.join(root,'services/zuzu-test-lab.service.js'),labFull=fs.readFileSync(labPath,'utf8');
const cut=labFull.indexOf('async function buildRealFastCases');let lab=labFull.slice(0,cut).replace(/^import .*$/gm,'').replace(/export\s+async\s+function\s+/g,'async function ').replace(/export\s+function\s+/g,'function ').replace(/export\s+const\s+/g,'const ');
lab+='\n;globalThis.__L={itvCapabilityExpectation,itvObservedCapability,itvCapabilityCompatible,validateExpectedCapability,itvDecisionDiagnosis,vNextAuditOf,vNextTableRowsAsObjects,markScenarioCascade,validateOracle,validatePaidCase};';
const lctx={console,setTimeout,Promise,Intl,Date,Math,Number,String,Array,Object,Set,Map,RegExp,JSON,Error};vm.createContext(lctx);new vm.Script(lab,{filename:labPath}).runInContext(lctx);const L=lctx.__L;
function result({answer,op,event='',person='',tables=[],capOp=op,tool='query_ce'}){return{ok:true,title:'Zuzu',answer,warnings:[],tables,charts:[],meta:{tools:tool?[tool]:[],resultContext:{kind:tool?'data':'conversation',operation:op||'',event,person},capabilityCalls:tool?[{tool,rawArgs:{operation:capOp,...(event?{event}:{}),...(person?{person}:{})},normalizedArgs:{operation:capOp,...(event?{event}:{}),...(person?{person}:{})},effectiveOperation:op||capOp,audit:{classification:'KNOWN',repairs:[]}}]:[]}};}
const event='IV Jornada Solidaria vs ELA - DIC25';
const eventCase={engine:'VNEXT',group:'MEDIA · CONTINUIDAD EVENTO',event,oracle:{kind:'event-summary',event,data:{income:7941,purchases:2376,pending:0,donations:4039.26,balance:5565,valuation:6415.26,attendees:45}}};
const wrongEvent=result({answer:`Colty no figura entre quienes nos acompañan en ${event}. Su registro de ingreso asociado es 50,00 €.`,op:'person_event_status',event,person:'Colty'});
const ev=L.validatePaidCase(eventCase,wrongEvent);t('falso OK Colty/evento pasa a KO por contrato',ev.status==='KO'&&ev.reasons.some(x=>x.includes('capacidad factual esperada')),JSON.stringify(ev));
const dd=L.itvDecisionDiagnosis(eventCase,wrongEvent,ev);t('falso OK se clasifica CONTINUITY/GEMINI',dd.category==='CONTINUITY'||dd.category==='GEMINI_GUIDANCE',JSON.stringify(dd));
const mgmtCase={engine:'VNEXT',group:'BÁSICO · GESTIÓN',event:'Semana Santa 2026 (Resurrección)',oracle:{kind:'management',event:'Semana Santa 2026 (Resurrección)',data:{hitos:0,lg:0,pending:0,completed:0}}};
const wrongMgmt=result({answer:'Semana Santa 2026 (Resurrección): ingresos 500,00 €, compras 499,22 €.',op:'event_summary',event:'Semana Santa 2026 (Resurrección)'});
const mv=L.validatePaidCase(mgmtCase,wrongMgmt);t('event_management no aprueba event_summary económico',mv.status==='KO',JSON.stringify(mv));
const multiCase={engine:'VNEXT',group:'MEDIA · DOS OBJETIVOS',event:'MUNDIAL 4ºs Final',oracle:{kind:'event-summary',event:'MUNDIAL 4ºs Final',requiredMetrics:['income','attendees'],data:{income:200,purchases:243.85,pending:0,donations:158.12,balance:-43.85,valuation:0,attendees:10}}};
const multi=result({answer:'MUNDIAL 4ºs Final: ingresos 200,00 €, asistencia 10 personas.',op:'event_summary',event:'MUNDIAL 4ºs Final'});
const multiV=L.validatePaidCase(multiCase,multi);t('asistencia expresada como "10 personas" certifica objetivo múltiple',multiV.status==='OK',JSON.stringify(multiV));
const personCase={engine:'VNEXT',group:'BÁSICO · PERSONA',person:'Titi y Luisfer',oracle:{kind:'person-summary',person:'Titi y Luisfer',data:{eventCount:1,income:20,purchases:0,donations:0,summaryRows:[{Evento:'Cumple PORRETA LIX - MAY26'}]}}};
const personIncomplete=result({answer:'Titi y Luisfer aparece en 1 eventos: Cumple PORRETA LIX - MAY26.',op:'person_profile',person:'Titi y Luisfer'});
const piv=L.validatePaidCase(personCase,personIncomplete);t('dossier personal incompleto ya no es OK',piv.status==='KO'&&piv.reasons.some(x=>x.includes('faltan ingresos')),JSON.stringify(piv));
const personGood=result({answer:'Titi y Luisfer aparece en 1 evento y tiene 20,00 € en ingresos vinculados.',op:'person_profile',person:'Titi y Luisfer'});
const pgv=L.validatePaidCase(personCase,personGood);t('dossier personal suficiente sí pasa',pgv.status==='OK',JSON.stringify(pgv));
const effective={ok:true,title:'Zuzu',answer:'Resumen de Ana.',warnings:[],tables:[],charts:[],meta:{tools:['query_ce'],resultContext:{kind:'data',operation:'person_profile',person:'Ana'},capabilityCalls:[{tool:'query_ce',rawArgs:{operation:'event_summary',event:'Ana'},normalizedArgs:{operation:'event_summary',event:'Ana'},effectiveOperation:'person_profile',audit:{classification:'KNOWN',repairs:[]}}]}};
const effObs=L.itvObservedCapability(effective);t('ITV usa operación efectiva tras reparación de tipo',effObs.operation==='person_profile'&&effObs.attemptedOperation==='event_summary',JSON.stringify(effObs));
const rows=[{id:'a',scenario:'S1',status:'KO',decisionDiagnosis:{category:'GEMINI_GUIDANCE',touch:'G'}},{id:'b',scenario:'S1',status:'KO',decisionDiagnosis:{category:'CE_DATA_CONTRACT',touch:'CE'}}];L.markScenarioCascade(rows);t('cascade sigue dependiendo del primer KO real',rows[1].decisionDiagnosis.category==='CASCADE'&&rows[1].decisionDiagnosis.cascadeOf==='a');

// STRUCTURAL: runtime/UI/SQL. No es E2E Gemini.
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8'),ui=fs.readFileSync(path.join(root,'public/app/features/zuzu-test-console-gd.js'),'utf8'),html=fs.readFileSync(path.join(root,'public/index.html'),'utf8'),sql=fs.readFileSync(path.join(root,'sql/ce_zuzu_capability_registry_p117.sql'),'utf8');
t('runtime no pide requested_constraints',!ai.includes('Para restricciones opcionales usa requested_constraints')&&!ai.includes('declara la etiqueta correspondiente en requested_constraints'));
t('runtime publica identidad/procedencia separada',ai.includes('income_registered_as')&&ai.includes('attendance_registered_as')&&ai.includes('identity_provenance'));
t('capabilityCalls exporta effectiveOperation',ai.includes('effectiveOperation:trim(x?.result?._vnext_operation'));
t('ITV valida capacidad antes de aprobar',labFull.includes('validateExpectedCapability(caseDef,result)')&&labFull.includes("capability.status==='KO'"));
t('build P1.17 UI',ui.includes('20260831-P117-STRICT-ITV-DISCRIMINATED-CONTRACTS-IDENTITY-NHC'));
t('cache P1.17',html.includes('20260831-VNEXT-P117-STRICT-ITV-DISCRIMINATED-CONTRACTS-IDENTITY-LANG260-NHC'));
t('SQL P1.17 auditable',sql.includes('20260831-P117')&&sql.includes('ce_zuzu_capability_observations'));
console.log(`RESULTADO ${ok}/${ok+ko}`);process.exitCode=ko?1:0;
