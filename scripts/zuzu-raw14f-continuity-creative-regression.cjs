const fs=require('fs'),vm=require('vm');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}
const trim=v=>String(v==null?'':v).trim(),arr=v=>Array.isArray(v)?v:[],norm=v=>trim(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

// Normalización real de operaciones: el alias sort_field del PDF debe sobrevivir.
const nm=svc.match(/function v73NormalizeOperations\(raw=\[\]\)\{[\s\S]*?\n\}/);let normOps=null;
if(nm){const box={arr,trim};vm.createContext(box);vm.runInContext(nm[0]+'\nthis.fn=v73NormalizeOperations;',box);normOps=box.fn;}
const sort=normOps?normOps([{type:'sort',sort_field:'Suma Importe',order:'descending'}])[0]:{};
t('sort_field alias se conserva físicamente',sort.field==='Suma Importe'&&sort.direction==='desc');
const clear=normOps?normOps([{type:'clear_filters'}])[0]:{};
t('clear_filters entra en el plan local normalizado',clear.type==='clear_filters');

// Ejecución física de clear_filters: quita SOLO filtros; conserva grouping/sort/presentación.
const start=svc.indexOf('function v73ApplyLocalOperations');const end=svc.indexOf('function v73TableFromBundle',start);let apply=null;
if(start>=0&&end>start){const code=svc.slice(start,end);const box={arr,trim,norm,v73BusinessFields:x=>x,v73RowsForStored:(ds,v)=>ds.rows,v72LabWarn:()=>{},v70FieldKey:()=>'',v73RoleFromLabel:()=>'',v73FieldFromCapability:()=>'',v70ApplyGroup:()=>null};vm.createContext(box);vm.runInContext(code+'\nthis.fn=v73ApplyLocalOperations;',box);apply=box.fn;}
const bundle={dataset:{domain:'purchases',columns:['Responsable','Importe'],rows:[{Responsable:'Esther',Importe:10},{Responsable:'Colty',Importe:20}]},view:{visibleFields:['Responsable','Suma Importe'],sort:[{field:'Suma Importe',direction:'desc'}],rowFilters:[{field:'Responsable',value:'Esther'}],groupBy:['Responsable'],metrics:['sum:Importe'],rowLimit:null,presentation:{table:true,chart:false},title:'Compras'}};
const applied=apply?apply(bundle,[{type:'clear_filters'}],[]):null;
t('clear_filters elimina filtro Esther',applied&&Array.isArray(applied.view.rowFilters)&&applied.view.rowFilters.length===0);
t('clear_filters conserva agrupación',applied&&applied.view.groupBy[0]==='Responsable'&&applied.view.metrics[0]==='sum:Importe');
t('clear_filters conserva ordenación',applied&&applied.view.sort[0]?.field==='Suma Importe'&&applied.view.sort[0]?.direction==='desc');

// Guard estructural contra saltos de evento no fundamentados.
const gm=svc.match(/function v73UngroundedEventScopeViolation\(raw=\{\},session=\{\},entityCandidates=\{\}\)\{[\s\S]*?\n\}/);let guard=null;
if(gm){const box={arr,trim,norm,v73NormalizeScope:s=>s,v73CurrentSummary:s=>s.ctx};vm.createContext(box);vm.runInContext(gm[0]+'\nthis.fn=v73UngroundedEventScopeViolation;',box);guard=box.fn;}
const session={ctx:{scope:{kind:'named_event',event:'FUNCION 2026'},recent_referents:[]}};
const jump={action:'query',query:{targets:[{domain:'purchases'}],scope:{kind:'named_event',event:'Ingresos y Gastos extraordinarios 2026'}}};
t('CE detecta salto de evento sin referencia explícita',guard&&/cambiar el evento activo/.test(guard(jump,session,{typed:{EVENT:[]}})));
t('CE permite cambio de evento cuando hay candidato EVENT explícito',guard&&guard(jump,session,{typed:{EVENT:[{canonical_name:'Ingresos y Gastos extraordinarios 2026'}]}})==='');
t('CE permite continuar en el mismo evento',guard&&guard({action:'query',query:{scope:{kind:'named_event',event:'FUNCION 2026'}}},session,{typed:{EVENT:[]}})==='');

// Contrato conversacional/narrativo.
t('evento de pantalla se vuelve ambiental cuando existe scope conversacional',/ambient_only_when_conversation_scope_exists:hasConversationEventScope/.test(svc));
t('volver a todos en una VIEW filtrada usa clear_filters',/REGLA DE RESTAURAR VIEW/.test(svc)&&/clear_filters/.test(svc));
t('preguntar por el foco usa current_context y no set_context',/REGLA DE INSPECCIÓN DE FOCO/.test(svc)&&/kind=\"current_context\"/.test(svc));
t('queja con nombres de eventos no cambia foco por sí sola',/REGLA DE META CON ENTIDADES/.test(svc));
t('info general de evento reentra por event_summary',/INFORMACIÓN GENERAL DE EVENTO/.test(svc)&&/event_summary es el punto de reentrada general/.test(svc));
t('poesía/historia de evento nunca se compila como conversation',/REDACCIÓN CREATIVA DE EVENTO/.test(svc)&&/NUNCA uses ce_conversation/.test(svc));
t('respuesta general obliga a usar descripción/contexto si existen',/CONTEXTO DE EVENTO OBLIGATORIO/.test(svc)&&/respuesta general con solo cifras es incompleta/.test(svc));
t('poesía no puede ser texto genérico intercambiable',/texto genérico intercambiable/.test(svc));
t('tool set_context restringe context_type a tipos válidos',/contextType=\{type:'string',enum:\['event','person','product','store','donor','responsible','ticket'\]\}/.test(svc));
t('traza activa identifica RAW14F',/CANDIDATOS TIPADOS RAW14F/.test(svc));
console.log(`\nRAW14F · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
