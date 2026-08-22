import { __zuzuStructuralTesting as z } from '../services/event-ai.service.js';
import { isRecallPrompt } from '../services/zuzu-conversation-ledger.service.js';

const failures=[];
const ok=(cond,label,detail='')=>{if(!cond)failures.push(`${label}${detail?` · ${detail}`:''}`);};
const eq=(a,b,label)=>ok(JSON.stringify(a)===JSON.stringify(b),label,`esperado=${JSON.stringify(b)} obtenido=${JSON.stringify(a)}`);

const {
  v73TurnTool,v73NormalizeScope,v73NormalizePlan,v73NormalizeOperations,v73SpanishDate,v73RecallPreamble,v73CandidateChoices,v73ExpandEventSeries,v73CertifyQuery,
  v73FrameFromQuery,v73ApplyLocalOperations,v73ComparisonAnswer,v50CompactWorkingRowCache
}=z;

// 1) Contrato: el registro normalizado es pseudocódigo disperso, sin campos vacíos heredados.
let plan=v73NormalizePlan({action:'query',query:{domain:'purchases',scope:{kind:'all_events'},product:{text:'PAN',match:'family'},fields:{mode:'all'}}});
eq(plan,{action:'query',query:{domain:'purchases',scope:{kind:'all_events'},product:{text:'PAN',match:'family'},fields:{mode:'all'}}},'QUERY mínimo PAN');
plan=v73NormalizePlan({action:'query',query:{domain:'purchases',scope:{kind:'named_event',event:'SySA 2026'},person:'Vicente'}});
ok(!('store' in plan.query)&&!('donor' in plan.query)&&!('ticket' in plan.query),'QUERY no arrastra campos vacíos');
eq(v73NormalizeScope({kind:'named_events',events:['A','B']}),{kind:'named_events',events:['A','B']},'Scope named_events disperso');

// 2) Producto: si existe producto, el modo nunca cae a none por omisión.
plan=v73NormalizePlan({action:'query',query:{domain:'purchases',scope:{kind:'all_events'},product:{text:'PAN'}}});
eq(plan.query.product,{text:'PAN',match:'semantic'},'Producto sin match recibe modo operativo semantic');
let frame=v73FrameFromQuery(plan.query);ok(frame.filters.product_text==='PAN'&&frame.filters.product_mode==='semantic','Frame aplica producto operativo');

// 3) Capacidades tipadas de fuente, no nombres concretos.
frame=v73FrameFromQuery(v73NormalizePlan({action:'query',query:{domain:'purchases',scope:{kind:'all_events'},person:'Vicente'}}).query);
ok(frame.filters.responsible==='Vicente'&&!frame.filters.person,'Persona en purchases -> responsible');
frame=v73FrameFromQuery(v73NormalizePlan({action:'query',query:{domain:'donations',scope:{kind:'all_events'},person:'Vicente'}}).query);
ok(frame.filters.donor==='Vicente'&&!frame.filters.person,'Persona en donations -> donor');

// 4) VIEW local: varias operaciones, sin BBDD ni fotografía global.
const dataset={datasetId:'D1',domain:'purchases',columns:['Evento','Producto','Segmento','Destino','Unidades','Precio','Importe','Ticket u otros gastos','Tienda','Responsable','Donante','Tipo','ID compra','Creado'],rows:[
  {Evento:'A',Producto:'PAN',Unidades:2,Importe:2,'Ticket u otros gastos':'TK1',Responsable:'X'},
  {Evento:'B',Producto:'PAN',Unidades:10,Importe:10,'Ticket u otros gastos':'TK2',Responsable:'Y'},
  {Evento:'C',Producto:'PAN',Unidades:6,Importe:6,'Ticket u otros gastos':'TK3',Responsable:'Z'}
]};
let bundle={dataset,view:{visibleFields:['Producto','Unidades','Importe'],sort:[],rowFilters:[],groupBy:[],metrics:[],rowLimit:null,presentation:{table:true,summary:true,chart:false},title:'T'}};
let applied=v73ApplyLocalOperations(bundle,[{type:'add_field',field:'Evento',placement:'first'},{type:'remove_field',field:'Unidades'},{type:'sort',field:'Importe',direction:'desc'}],[]);
eq(applied.view.visibleFields,['Evento','Producto','Importe'],'LOCAL multioperación add/remove');
eq(applied.rows.map(r=>r.Importe),[10,6,2],'LOCAL sort desc');
applied=v73ApplyLocalOperations(bundle,[],[]);ok(applied.unchanged===true&&!!applied.error,'LOCAL vacío produce WARN y conserva');
applied=v73ApplyLocalOperations(bundle,[{type:'add_field',field:'Color del ticket'}],[]);eq(applied.view.visibleFields,bundle.view.visibleFields,'Campo inexistente no destruye VIEW');ok(applied.warnings.length===1,'Campo inexistente deja WARN');

// 5) DATASET grande: regresión del antiguo límite 220.
const bigRows=Array.from({length:923},(_,i)=>({Evento:'E',Producto:`P${i}`,Importe:i}));
const cache=v50CompactWorkingRowCache({table_key:'x',columns:['Evento','Producto','Importe'],visible_fields:['Evento','Producto','Importe'],rows:bigRows,complete:true});
ok(cache&&cache.rows.length===923,'DATASET 923 filas se conserva para transformaciones locales');

// 6) Multievento SCC: serie homogénea y lista heterogénea usan el mismo contrato.
const state={eventos:[
  {id:'1',titulo:'SySA 2024'},{id:'2',titulo:'SySA 2025'},{id:'3',titulo:'SySA 2026'},
  {id:'4',titulo:'Cuotas y gastos corrientes 2026'},{id:'5',titulo:'FUNCION 2025'},
  {id:'6',titulo:'Cumple PORRETA LIX - MAY26'},{id:'7',titulo:'MUNDIAL 4ºs Final (España vs Belgica) JUL26'}
]};
let series=v73ExpandEventSeries(state,'SySA');
ok(series.length===3&&series.every(x=>x.name.startsWith('SySA')),'SCC serie SySA -> 3 eventos');
let cert=v73CertifyQuery({domain:'comparison',scope:{kind:'event_series',series:'SySA'}},state,[]);
eq(cert.query.scope,{kind:'named_events',events:['SySA 2024','SySA 2025','SySA 2026']},'Serie se congela como eventos canónicos');
cert=v73CertifyQuery({domain:'comparison',scope:{kind:'named_events',events:['Cuotas y gastos corrientes 2026','FUNCION 2025','Cumple PORRETA LIX - MAY26','MUNDIAL 4ºs Final (España vs Belgica) JUL26']}},state,[]);
ok(!cert.error&&cert.query.scope.events.length===4,'Comparación heterogénea certifica 4 eventos');

// 7) Narrativa comparativa se deriva de filas canónicas, sin una segunda IA.
const prose=v73ComparisonAnswer([
  {Evento:'A','Compras realizadas':100,Ingresos:300,'Asistentes canónicos':10},
  {Evento:'B','Compras realizadas':150,Ingresos:250,'Asistentes canónicos':20}
],'');
ok(prose.includes('He comparado 2 eventos')&&prose.includes('B presenta el mayor importe de compras realizadas'),'Narrativa comparativa canónica');

// 8) Tool contract mantiene ramas y operaciones explícitas.
const tool=v73TurnTool();
ok(tool?.name==='zuzu_turn_record','Tool única de registro');
const ops=tool?.parameters?.properties?.local?.properties?.operations?.items?.properties?.type?.enum||[];
ok(ops.includes('add_field')&&ops.includes('remove_field')&&ops.includes('sort')&&ops.includes('chart'),'Tool LOCAL expone operaciones explícitas');

// 9) QUERY puede describir transformaciones derivadas sobre su DATASET sin segunda consulta.
plan=v73NormalizePlan({action:'query',query:{domain:'purchases',scope:{kind:'all_events'},person:'Vicente',operations:[{type:'group',field:'Responsable',metrics:['sum:Importe']},{type:'sort',field:'Suma Importe',direction:'desc'},{type:'limit',limit:3}]}});
eq(plan.query.operations,[{type:'group',field:'Responsable',metrics:['sum:Importe']},{type:'sort',field:'Suma Importe',direction:'desc'},{type:'limit',limit:3}],'QUERY conserva operaciones derivadas');
applied=v73ApplyLocalOperations(bundle,[{type:'group',field:'Evento',metrics:['sum:Importe']},{type:'sort',field:'Suma Importe',direction:'desc'},{type:'limit',limit:2}],[]);eq(applied.view.visibleFields,['Evento','Suma Importe'],'GROUP expone campos derivados');eq(applied.rows.map(r=>r['Suma Importe']),[10,6],'GROUP + SORT + LIMIT sobre métrica derivada');
const requiredQuery=tool?.parameters?.properties?.query?.required||[];ok(requiredQuery.includes('scope'),'Tool QUERY exige scope explícito');
const qOps=tool?.parameters?.properties?.query?.properties?.operations?.items?.properties?.type?.enum||[];ok(qOps.includes('group')&&qOps.includes('sort')&&qOps.includes('limit'),'Tool QUERY permite operaciones post-DATASET');

// 10) Filtros locales numéricos, útiles para comparativas/rankings, siguen siendo deterministas.
applied=v73ApplyLocalOperations({dataset:{...dataset,columns:['Evento','Producto','Importe'],rows:[{Evento:'A',Producto:'P1',Importe:2},{Evento:'B',Producto:'P2',Importe:10},{Evento:'C',Producto:'P3',Importe:6}]},view:{visibleFields:['Evento','Producto','Importe'],sort:[],rowFilters:[],groupBy:[],metrics:[],rowLimit:null,presentation:{table:true,summary:true,chart:false},title:'T'}},[{type:'filter',field:'Importe',operator:'gt',value:'5'}],[]);
eq(applied.rows.map(r=>r.Importe),[10,6],'LOCAL filter numérico gt');

// 11) Recuerdo humano: fecha legible, usuario y alternativas sin inventar conversación.
const remembered={turn:{createdAt:'2026-08-19T10:00:00Z',title:'Compras de FUNCION 2026'}};
const pre=v73RecallPreamble('Colty',remembered);ok(pre.includes('Ahora recuerdo **Colty**')&&pre.includes('diecinueve de agosto de dos mil veintiséis')&&pre.includes('Compras de FUNCION 2026'),'Preambulo histórico humano');
const choices=v73CandidateChoices([{ref:'H1',created_at:'2026-08-19T10:00:00Z',title:'Compras de FUNCION 2026'},{ref:'H2',created_at:'2026-08-20T10:00:00Z',title:'Comparativa SySA'}]);ok(choices.length===2&&choices[0].includes('H1')&&choices[1].includes('H2'),'Alternativas históricas materializadas');
ok(isRecallPrompt('Ahora recuérdame qué me dijiste al principio')&&isRecallPrompt('Oye, ¿te acuerdas que hablamos de aquello?'),'Detección genérica de recuerdo humano');

if(failures.length){
  console.error(`ZUZU LEDGER STRUCTURAL SUITE: ${failures.length} fallo(s)`);
  for(const f of failures)console.error(` - ${f}`);
  process.exit(1);
}
console.log('ZUZU LEDGER STRUCTURAL SUITE: OK');
console.log('Controles: pseudocódigo disperso · producto operativo · capacidades tipadas · VIEW multioperación · QUERY post-DATASET · filtros numéricos · 923 filas · SCC multievento · comparación · memoria histórica · contrato tool.');
