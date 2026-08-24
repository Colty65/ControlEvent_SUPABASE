import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
let bad=0;const test=(name,ok)=>{console.log((ok?'OK':'KO')+' - '+name);if(!ok)bad++;};
function extractFunction(name){
  const start=src.indexOf(`function ${name}(`);if(start<0)throw new Error(`No encuentro ${name}`);
  const sigEnd=src.indexOf('){',start),brace=sigEnd+1;let depth=0,inS=false,inD=false,inT=false,esc=false;
  for(let i=brace;i<src.length;i++){const c=src[i];if(esc){esc=false;continue;}if(c==='\\'){esc=true;continue;}if(!inD&&!inT&&c==="'")inS=!inS;else if(!inS&&!inT&&c==='"')inD=!inD;else if(!inS&&!inD&&c==='`')inT=!inT;if(inS||inD||inT)continue;if(c==='{')depth++;else if(c==='}'){depth--;if(depth===0)return src.slice(start,i+1);}}
  throw new Error(`Función ${name} incompleta`);
}
const arr=x=>Array.isArray(x)?x:[],trim=x=>String(x??'').trim(),norm=x=>trim(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

// 1. Contrato único: query.targets 1..N. No doble sintaxis domain/targets.
const c1={arr,trim,norm};vm.createContext(c1);vm.runInContext(`${extractFunction('v73TurnTool')}\n${extractFunction('v73CommandTools')}\n${extractFunction('v73NormalizeTargets')}\n${extractFunction('v73PrimaryTarget')}\n${extractFunction('v73PrimaryDomain')}\nthis.tools=v73CommandTools();this.nt=v73NormalizeTargets;this.pd=v73PrimaryDomain;`,c1);
const qs=c1.tools.find(t=>t.name==='ce_query').parameters.properties.query;
test('schema query obliga targets',qs.required.includes('targets')&&qs.properties.targets.minItems===1);
test('schema query ya no expone domain alternativo',!Object.prototype.hasOwnProperty.call(qs.properties,'domain'));
test('un target simple produce dominio primario',c1.pd({targets:[{domain:'weather'}]})==='weather');
const dedup=c1.nt({targets:[{domain:'person'},{domain:'person',metric_role:'count'}]});
test('targets repetidos del mismo dominio se deduplican mecánicamente',dedup.length===1&&dedup[0].domain==='person');

// 2. Protocolo acepta un único target.
const c2={arr,trim};vm.createContext(c2);vm.runInContext(`${extractFunction('v73ProtocolViolation')}\nthis.p=v73ProtocolViolation;`,c2);
test('protocolo acepta query con 1 target',c2.p({action:'query',query:{targets:[{domain:'weather'}],scope:{kind:'named_event',event:'FUNCION 2026'}}},{})==='');

// 3. CURRENT conserva filtro semántico del query base aunque el turno actual sea LOCAL,
//    y set_context posterior manda sobre el scope del dataset antiguo.
const c3={arr,trim,norm,v73RecentReferents:()=>[],v73NormalizeTargets:c1.nt};vm.createContext(c3);vm.runInContext(`${extractFunction('v73LastOperationalTurn')}\n${extractFunction('v73CurrentSummary')}\nthis.s=v73CurrentSummary;`,c3);
const session={
  currentTurn:{actionType:'set_context',datasetId:'DS1'},
  recentTurns:[
    {turnId:'T1',seq:1,actionType:'query',status:'OK',datasetId:'DS1',normalizedPlan:{action:'query',response_kind:'units',query:{targets:[{domain:'purchases',metric_role:'units'}],scope:{kind:'named_event',event:'FUNCION 2026'},product:{text:'pan',match:'semantic'}}},execution:{domain:'purchases',scope:{kind:'named_event',event:'FUNCION 2026'},focus:{event:'FUNCION 2026',product:'pan'}}},
    {turnId:'T2',seq:2,actionType:'local',status:'OK',datasetId:'DS1',normalizedPlan:{action:'local',local:{from_ref:'T1',operations:[{type:'show_table'}]}},execution:{domain:'purchases',scope:{kind:'named_event',event:'FUNCION 2026'},focus:{event:'FUNCION 2026',product:'pan'}}},
    {turnId:'T3',seq:3,actionType:'set_context',status:'OK',datasetId:'DS1',normalizedPlan:{action:'set_context',context:{type:'event',values:['FUNCION 2025']}},execution:{focus:{event:'FUNCION 2025'}}}
  ],
  dataset:{datasetId:'DS1',domain:'purchases',scope:{kind:'named_event',event:'FUNCION 2026'},rowCount:6,columns:['Evento','Producto','Unidades','Responsable']},
  view:{visibleFields:['Producto','Unidades'],sort:[],rowFilters:[],groupBy:[],presentation:{table:true,chart:false}}
};
const sum=c3.s(session);
test('CURRENT conserva product=pan tras un turno LOCAL',sum.last_intent?.semantic_filters?.product==='pan');
test('set_context posterior tiene autoridad explícita',sum.scope_authority==='explicit_set_context'&&sum.scope.event==='FUNCION 2025');
test('dataset antiguo queda marcado incompatible con nuevo scope',sum.active_dataset?.compatible_with_active_scope===false);

// 4. Artefactos: Gemini final puede añadir, nunca vetar show_table/chart explícitos.
const c4={arr,trim};vm.createContext(c4);vm.runInContext(`${extractFunction('v73PlanArtifactIntent')}\n${extractFunction('v73MergeArtifactIntent')}\nthis.m=v73MergeArtifactIntent;`,c4);
const tableIntent=c4.m({action:'local',local:{operations:[{type:'show_table'}]}},{presentation:{table:false,chart:false}},{table:false,chart:false,chart_type:'none'});
test('show_table explícito sobrevive a table=false de redacción final',tableIntent.table===true);
const chartIntent=c4.m({action:'local',local:{operations:[{type:'chart',chart_type:'line',x_field:'Fecha',series:['Temp. máx','Temp. mín']}]}},{presentation:{}},{table:false,chart:false,chart_type:'none'});
test('chart explícito sobrevive a chart=false de redacción final',chartIntent.chart===true&&chartIntent.chart_type==='line');

// 5. Ejecución local real: múltiples gráficas y configuración literal.
const v40MaybeNumber=x=>{const n=Number(String(x??'').replace(',','.'));return Number.isFinite(n)?n:null;};
const v70FieldKey=(rows,f)=>{const keys=[...new Set(arr(rows).flatMap(r=>Object.keys(r||{})))];return keys.find(k=>norm(k)===norm(f))||'';};
const v70ApplyViewFilters=(rows)=>rows, v70ApplySort=(rows)=>rows;
const v70ApplyGroup=(rows,groups,metrics)=>{if(!arr(groups).length)return null;const g=groups[0],m=arr(metrics).length?metrics:['count'],map=new Map();for(const r of rows){const k=trim(r[g]);if(!map.has(k))map.set(k,[]);map.get(k).push(r);}return [...map].map(([k,rs])=>{const o={[g]:k};for(const sp of m){const [op,f]=trim(sp).split(':',2);if(op==='count')o['Nº registros']=rs.length;else if(op==='sum'&&f)o[`Suma ${f}`]=rs.reduce((a,r)=>a+(v40MaybeNumber(r[f])??0),0);}return o;});};
const v73RowsForStored=(ds,v)=>{let r=arr(ds.rows).map(x=>({...x}));const g=v70ApplyGroup(r,arr(v.groupBy),arr(v.metrics));return g||r;};
const v73BusinessFields=x=>arr(x),v73RoleFromLabel=(r)=>({product:'product',producto:'product',units:'units',unidades:'units',amount:'amount',importe:'amount'}[norm(r)]||''),v73FieldFromCapability=(ds,r,k,h)=>{const want={product:'Producto',units:'Unidades',amount:'Importe'}[trim(h)||v73RoleFromLabel(r)]||r;return arr(ds.columns).find(c=>norm(c)===norm(want))||'';},v72LabWarn=()=>{};
const c5={arr,trim,norm,v40MaybeNumber,v70FieldKey,v70ApplyViewFilters,v70ApplySort,v70ApplyGroup,v73RowsForStored,v73BusinessFields,v73RoleFromLabel,v73FieldFromCapability,v72LabWarn};vm.createContext(c5);vm.runInContext(`${extractFunction('v73ApplyLocalOperations')}\nthis.a=v73ApplyLocalOperations;`,c5);
const wxds={datasetId:'WX',domain:'weather',columns:['Día','Fecha','Temp. máx','Temp. mín','Humedad relativa %','Prob. lluvia %','Viento km/h'],rows:[{'Día':'Jueves','Fecha':'2026-09-03','Temp. máx':29.1,'Temp. mín':15.5,'Humedad relativa %':52,'Prob. lluvia %':3,'Viento km/h':13.6},{'Día':'Viernes','Fecha':'2026-09-04','Temp. máx':29.8,'Temp. mín':13.2,'Humedad relativa %':48,'Prob. lluvia %':6,'Viento km/h':15.4}]};
const base={turn:{title:'Tiempo'},dataset:wxds,view:{visibleFields:wxds.columns,sort:[],rowFilters:[],groupBy:[],metrics:[],rowLimit:null,presentation:{table:true,chart:false},title:'Tiempo'}};
const applied=c5.a(base,[{type:'chart',chart_type:'line',x_field:'Fecha',series:['Prob. lluvia %']},{type:'chart',chart_type:'line',x_field:'Fecha',series:['Viento km/h']}],[]);
test('dos operaciones chart quedan como dos chart_configs',applied.view.presentation.chart_configs.length===2);
const purchaseDs={datasetId:'P1',domain:'purchases',columns:['Producto','Unidades','Importe'],rows:[{Producto:'PAN',Unidades:4,Importe:2},{Producto:'PAN',Unidades:6,Importe:3},{Producto:'HIELO',Unidades:2,Importe:5}]};
const purchaseBase={turn:{title:'Compras'},dataset:purchaseDs,view:{visibleFields:['Producto','Unidades','Importe'],sort:[],rowFilters:[],groupBy:[],metrics:[],rowLimit:null,presentation:{table:true,chart:false},title:'Compras'}};
const explicitAgg=c5.a(purchaseBase,[{type:'group',group_field:'Producto',metric:'Unidades',aggregation:'sum'}],[]);
test('group metric+aggregation se ejecuta literalmente',explicitAgg.view.metrics[0]==='sum:Unidades'&&explicitAgg.view.visibleFields.includes('Suma Unidades'));

// 6. Constructor visible usa x_field/series del JSON, no la gráfica genérica por Evento.
const c6={arr,trim,norm,v40MaybeNumber,num:x=>Number(x)||0,v70FieldKey,v73RowsForStored:(ds)=>arr(ds.rows),v73ChartFieldAlias:()=>'',v72LabWarn:()=>{}};vm.createContext(c6);vm.runInContext(`${extractFunction('v73RequestedChartFromBundle')}\nthis.g=v73RequestedChartFromBundle;`,c6);
const tempBundle={dataset:wxds,view:{presentation:{chart:true,chart_config:{chart_type:'line',x_field:'Fecha',series:['Temp. máx','Temp. mín']}}}};
const g=c6.g(tempBundle,[])[0];
test('gráfica visible usa fechas en X',g.labels.join('|')==='2026-09-03|2026-09-04');
test('gráfica visible conserva máxima y mínima',g.series.length===2&&g.series[0].name==='Temp. máx'&&g.series[1].name==='Temp. mín');
const aggBundle={dataset:{domain:'purchases',columns:['Evento','Unidades'],rows:[{Evento:'A',Unidades:2},{Evento:'A',Unidades:3},{Evento:'B',Unidades:4}]},view:{presentation:{chart:true,chart_config:{chart_type:'bar',x_field:'Evento',series:['Unidades'],aggregation:'sum'}}}};
const ag=c6.g(aggBundle,[])[0];
test('chart aggregation=sum agrupa por eje X',ag.labels.join('|')==='A|B'&&ag.values[0]===5&&ag.values[1]===4);

// 7. Candidatos: no premiar tokens comunes internos de nombres compuestos; exactos siguen.
const c7={arr,trim,norm,semanticCleanToken:norm};vm.createContext(c7);vm.runInContext(`${extractFunction('v74TypedCandidateList')}\nthis.f=v74TypedCandidateList;`,c7);
const noisy=c7.f([{id:'1',name:'Judia Verde Plana',matched:'verde',match_kind:'strong',score:.96},{id:'2',name:'Helado corte no turron',matched:'no',match_kind:'strong',score:.96},{id:'3',name:'Pocholo',matched:'pocholo',match_kind:'exact',score:1}],3);
test('candidatos descartan verde/no pero conservan exacto',noisy.length===1&&noisy[0].canonical_name==='Pocholo');

// 8. Meteorología incluye humedad real vía hourly relative_humidity_2m.
test('Open-Meteo solicita relative_humidity_2m',/hourly=relative_humidity_2m/.test(src));
test('dataset weather expone humedad relativa',/weather:\['Evento','Localidad','Día','Fecha','Cielo','Temp\. máx','Temp\. mín','Humedad relativa %','Humedad máx %','Humedad mín %'/.test(src));

// 9. Prompt: fecha actual, persona múltiple en un target, filtros elípticos y no redundar fuentes.
test('Gemini recibe CURRENT_TIME',/CURRENT_TIME:/.test(src)&&/clientLocalDateTime/.test(src));
test('prompt enseña person múltiple en UN target',/Varias personas: UN solo target \{domain:"person"\} \+ people/.test(src));
test('prompt prohíbe purchases+products como rutas alternativas',/purchases = líneas[\s\S]*products = producto lógico agregado[\s\S]*Elige UNO/.test(src));
test('prompt conserva semantic_filters en elipsis',/elipsis\/pronombre conserva los semantic_filters compatibles/.test(src));

// 10. Replay server-side respeta requested chart.
test('replay prioriza v73RequestedChartFromBundle',/readZuzuLedgerTurnPresentation[\s\S]*v73RequestedChartFromBundle\(bundle/.test(src));

if(bad){console.error(`RAW12 OBEDIENCE: ${bad} KO`);process.exit(1);}console.log('ZUZU RAW12 OBEDIENCE: OK');
