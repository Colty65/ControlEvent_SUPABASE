import fs from 'node:fs';
import vm from 'node:vm';

const src=fs.readFileSync(new URL('../services/event-ai.service.js',import.meta.url),'utf8');
let bad=0;
const test=(name,ok)=>{console.log((ok?'OK':'KO')+' - '+name);if(!ok)bad++;};

function extractFunction(name){
  const start=src.indexOf(`function ${name}(`);
  if(start<0)throw new Error(`No encuentro ${name}`);
  const sigEnd=src.indexOf('){',start);const brace=sigEnd+1;let depth=0,inS=false,inD=false,inT=false,esc=false;
  for(let i=brace;i<src.length;i++){
    const c=src[i];
    if(esc){esc=false;continue;}
    if(c==='\\'){esc=true;continue;}
    if(!inD&&!inT&&c==="'")inS=!inS; else if(!inS&&!inT&&c==='"')inD=!inD; else if(!inS&&!inD&&c==='`')inT=!inT;
    if(inS||inD||inT)continue;
    if(c==='{')depth++; else if(c==='}'){depth--;if(depth===0)return src.slice(start,i+1);}
  }
  throw new Error(`Función ${name} incompleta`);
}

// Contrato estructural: seis tools exclusivas, sin inspect/reset como comando de primera llamada.
const contractContext={};vm.createContext(contractContext);
vm.runInContext(`${extractFunction('v73TurnTool')}\n${extractFunction('v73CommandTools')}\nthis.tools=v73CommandTools();`,contractContext);
const toolNames=contractContext.tools.map(x=>x.name);
test('catálogo cerrado de 6 comandos',JSON.stringify(toolNames)===JSON.stringify(['ce_query','ce_local','ce_set_context','ce_reference','ce_conversation','ce_clarify']));
test('response_kind distingue amount/units/count',contractContext.tools[0].parameters.properties.response_kind.enum.includes('units')&&contractContext.tools[0].parameters.properties.response_kind.enum.includes('count'));
const qSchema=contractContext.tools[0].parameters.properties.query;
test('query usa contrato único targets 1..N',!!qSchema.properties.targets&&!qSchema.properties.domain&&qSchema.required.includes('targets'));
test('target no fuerza métrica',qSchema.properties.targets.items.required.length===1&&qSchema.properties.targets.items.required[0]==='domain');
const localOps=contractContext.tools[1].parameters.properties.local.properties.operations.items.properties.type.enum;
test('local tiene show_table explícito',localOps.includes('show_table'));
test('chart contract tiene x_field y series',!!qSchema.properties.presentation.properties.chart_config.properties.x_field&&!!qSchema.properties.presentation.properties.chart_config.properties.series);

// Stubs físicos mínimos para ejecutar DE VERDAD la operación local actual.
const arr=x=>Array.isArray(x)?x:[];
const trim=x=>String(x??'').trim();
const norm=x=>trim(x).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const v40MaybeNumber=x=>{const n=Number(String(x??'').replace(',','.'));return Number.isFinite(n)?n:null;};
const v70FieldKey=(rows,f)=>{const keys=[...new Set(arr(rows).flatMap(r=>Object.keys(r||{})))];return keys.find(k=>norm(k)===norm(f))||'';};
const v70ApplyViewFilters=(rows)=>rows;
const v70ApplySort=(rows,sort)=>{const s=arr(sort)[0];if(!s)return rows;return rows.slice().sort((a,b)=>{const A=a[s.field],B=b[s.field];return (A>B?1:A<B?-1:0)*(s.direction==='desc'?-1:1);});};
const v70ApplyGroup=(rows,groups,metrics)=>{
  if(!arr(groups).length)return null;const g=groups[0],m=arr(metrics).length?metrics:['count'],map=new Map();
  for(const r of rows){const key=trim(r[g]);if(!map.has(key))map.set(key,[]);map.get(key).push(r);}
  const out=[];for(const [key,rs] of map){const o={[g]:key};for(const spec of m){const [op,field]=trim(spec).split(':',2);if(norm(op)==='count')o['Nº registros']=rs.length;else if(norm(op)==='sum'&&field)o[`Suma ${field}`]=rs.reduce((a,r)=>a+(v40MaybeNumber(r[field])??0),0);}out.push(o);}return out;
};
const v73RowsForStored=(ds,v)=>{let rows=arr(ds.rows).map(r=>({...r}));const grouped=v70ApplyGroup(rows,arr(v.groupBy),arr(v.metrics));if(grouped)rows=grouped;rows=v70ApplySort(rows,arr(v.sort));if(Number(v.rowLimit)>0)rows=rows.slice(0,Number(v.rowLimit));return rows;};
const v73BusinessFields=cols=>arr(cols);
const v73RoleFromLabel=(raw)=>({product:'product',producto:'product',responsible:'responsible',responsable:'responsible',units:'units',unidades:'units',amount:'amount',importe:'amount'}[norm(raw)]||'');
const v73FieldFromCapability=(ds,raw,kind,roleHint)=>{const role=trim(roleHint)||v73RoleFromLabel(raw);const map={product:'Producto',responsible:'Responsable',units:'Unidades',amount:'Importe'};const wanted=map[role]||raw;return arr(ds.columns).find(c=>norm(c)===norm(wanted))||'';};
const v72LabWarn=()=>{};
const opContext={arr,trim,norm,v40MaybeNumber,v70FieldKey,v70ApplyViewFilters,v70ApplySort,v70ApplyGroup,v73RowsForStored,v73BusinessFields,v73RoleFromLabel,v73FieldFromCapability,v72LabWarn};
vm.createContext(opContext);vm.runInContext(`${extractFunction('v73ApplyLocalOperations')}\nthis.apply=v73ApplyLocalOperations;`,opContext);
const dataset={datasetId:'DS1',domain:'purchases',columns:['Producto','Unidades','Importe','Responsable'],rows:[{Producto:'PAN',Unidades:4,Importe:2,Responsable:'A'},{Producto:'PAN',Unidades:6,Importe:3,Responsable:'B'},{Producto:'HIELO',Unidades:2,Importe:5,Responsable:'A'}]};
const base={turn:{title:'Compras'},dataset,view:{visibleFields:['Producto','Importe'],sort:[],rowFilters:[],groupBy:[],metrics:[],rowLimit:null,presentation:{table:true,summary:true,chart:false},title:'Compras'}};
const grouped=opContext.apply(base,[{type:'group',group_field:'product',metric_role:'units'}],[]);
test('CE ejecuta group_field=product literalmente',grouped.view.groupBy.length===1&&grouped.view.groupBy[0]==='Producto');
test('CE ejecuta metric_role=units como suma de unidades',grouped.view.metrics.length===1&&grouped.view.metrics[0]==='sum:Unidades');
test('CE no cambia producto por responsable',!grouped.view.groupBy.includes('Responsable'));
test('VIEW agrupada expone Suma Unidades',grouped.view.visibleFields.includes('Suma Unidades'));
const shown=opContext.apply({...base,view:{...base.view,presentation:{table:false,summary:true,chart:true}}},[{type:'show_table'}],[]);
test('show_table fuerza tabla y apaga gráfica',shown.view.presentation.table===true&&shown.view.presentation.chart===false);
const chartOp=opContext.apply(base,[{type:'chart',chart_type:'line',x_field:'Fecha',series:['Temp. máx','Temp. mín'],aggregation:'none'}],[]);
test('CE conserva config exacta de gráfica',chartOp.view.presentation.chart_config.x_field==='Fecha'&&chartOp.view.presentation.chart_config.series.length===2&&chartOp.view.presentation.chart_config.chart_type==='line');

// Prueba real del constructor de gráfica solicitado.
const chartContext={arr,trim,norm,v40MaybeNumber,num:x=>Number(x)||0,v70FieldKey,v73RowsForStored:(ds)=>arr(ds.rows),v73ChartFieldAlias:()=>'',v72LabWarn:()=>{}};
vm.createContext(chartContext);vm.runInContext(`${extractFunction('v73RequestedChartFromBundle')}\nthis.chart=v73RequestedChartFromBundle;`,chartContext);
const weatherBundle={turn:{title:'Tiempo'},dataset:{domain:'weather',columns:['Fecha','Temp. máx','Temp. mín'],rows:[{'Fecha':'2026-09-03','Temp. máx':33.5,'Temp. mín':18.7},{'Fecha':'2026-09-04','Temp. máx':34.3,'Temp. mín':19.1}]},view:{presentation:{chart:true,chart_config:{chart_type:'line',x_field:'Fecha',series:['Temp. máx','Temp. mín'],aggregation:'none'}},title:'Tiempo'}};
const chart=chartContext.chart(weatherBundle,[])[0];
test('gráfica usa Fecha en eje X',chart.labels[0]==='2026-09-03'&&chart.labels[1]==='2026-09-04');
test('gráfica conserva dos series máxima/mínima',chart.series.length===2&&chart.series[0].name==='Temp. máx'&&chart.series[1].name==='Temp. mín');
test('gráfica meteorológica conserva °C',chart.unit==='°C');

// Magnitud: aunque haya euros, si el plan pide units debe mandar units.
const metricContext={arr,trim,v40MaybeNumber,v70FieldKey,v73FieldFromCapability:(ds,raw,kind,role)=>role==='units'?'Unidades':role==='amount'?'Importe':'',round:(x,n)=>Number(Number(x).toFixed(n))};
vm.createContext(metricContext);vm.runInContext(`${extractFunction('v73FirstNumericTotal')}\n${extractFunction('v73PlanMetricRole')}\n${extractFunction('v73MetricTotal')}\nthis.role=v73PlanMetricRole;this.total=v73MetricTotal;`,metricContext);
const plan={response_kind:'units',query:{domain:'purchases',operations:[{type:'group',group_field:'product',metric_role:'units'}]}};
const ws={row_count:2,row_cache:{rows:[{Producto:'PAN','Suma Unidades':10,'Suma Importe':5},{Producto:'HIELO','Suma Unidades':2,'Suma Importe':5}]},aggregate:{}};
test('plan métrico reconoce units',metricContext.role(plan)==='units');
test('total units no se convierte en euros',metricContext.total('units',ws,dataset)===12);

// Prompt/context guardrails.
test('frase actual tiene autoridad absoluta',/CURRENT_USER tiene autoridad absoluta/.test(src));
test('corrección explícita cancela interpretación incompatible',/corrección explícita: cancela cualquier interpretación previa incompatible/i.test(src));
test('consulta compuesta se ejecuta por targets',/function v73ExecuteCompositePlan[\s\S]*targets\.length<2[\s\S]*QUERY COMPUESTA RAW12/.test(src));
test('current_context incluye fields disponibles/visibles',/active_dataset:activeDataset[\s\S]*recent_referents/.test(src)&&/available_fields[\s\S]*visible_fields/.test(src));
test('final respeta autoridad metric_role',/AUTORIDAD DE MÉTRICA:[\s\S]*metric_role=units/.test(src));
test('set_context se certifica solo dentro del tipo elegido',/function v73CertifyContext[\s\S]*semanticType=\['person','donor','responsible'\]/.test(src));

// CURRENT_CONTEXT: un set_context posterior debe mandar sobre el scope operativo anterior sin destruir el dataset visible.
const ctxContext={arr,trim,norm,v73RecentReferents:()=>[]};vm.createContext(ctxContext);vm.runInContext(`${extractFunction('v73NormalizeTargets')}\n${extractFunction('v73LastOperationalTurn')}\n${extractFunction('v73CurrentSummary')}\nthis.summary=v73CurrentSummary;`,ctxContext);
const contextSession={
  currentTurn:{actionType:'set_context'},
  recentTurns:[
    {actionType:'query',status:'OK',normalizedPlan:{response_kind:'summary',query:{domain:'weather',scope:{kind:'named_event',event:'FUNCION 2026'}}},execution:{domain:'weather',scope:{kind:'named_event',event:'FUNCION 2026'},focus:{event:'FUNCION 2026'}}},
    {actionType:'set_context',status:'OK',normalizedPlan:{action:'set_context',context:{type:'event',values:['FUNCION 2025']}},execution:{focus:{event:'FUNCION 2025'}}}
  ],
  dataset:{datasetId:'DS-WX',domain:'weather',scope:{kind:'named_event',event:'FUNCION 2026'},rowCount:5,columns:['Fecha','Temp. máx','Temp. mín']},
  view:{visibleFields:['Fecha','Temp. máx'],sort:[],groupBy:[],presentation:{table:true,chart:true}}
};
const contextSummary=ctxContext.summary(contextSession);
test('set_context manda sobre scope anterior',contextSummary.scope.event==='FUNCION 2025');
test('dataset visible conserva su propio scope separado',contextSummary.active_dataset.scope.event==='FUNCION 2026');
const resetSession={...contextSession,currentTurn:{actionType:'set_context'},recentTurns:[...contextSession.recentTurns,{actionType:'set_context',status:'OK',normalizedPlan:{action:'set_context',context:{clear_all:true}},execution:{focus:{}}}]};
const resetSummary=ctxContext.summary(resetSession);
test('clear_all limpia foco, scope y dataset contextual',Object.keys(resetSummary.scope).length===0&&resetSummary.active_dataset===null&&Object.keys(resetSummary.active_entities).length===0);

if(bad){console.error(`RAW11 CONTRACT EXECUTION: ${bad} KO`);process.exit(1);}console.log('ZUZU RAW11 CONTRACT EXECUTION: OK');
