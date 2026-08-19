import { __zuzuStructuralTesting as T } from '../services/event-ai.service.js';
const { v46BuildPartitionedWorkingSet, v47BuildDerivedAnswer, v51BuildLocalPartitionFocus, v51BuildLocalProductFilter, v51SanitizeSccRequestFilters, v50BuildLocalPresentation } = T;

let ok=0,ko=0;
function check(name,cond,detail=''){
  if(cond){ok++;console.log(`OK  ${name}`);}
  else{ko++;console.error(`KO  ${name}${detail?` · ${detail}`:''}`);}
}
const state={
  eventos:[{id:'e25',titulo:'SySA 2025'},{id:'e24',titulo:'SySA 2024'}],
  productos:[{nombre:'Ensaladas',segmento:'COMIDA',destino:'COMIDA'},{nombre:'Galletas (helado corte)',segmento:'COMIDA',destino:'COMIDA'},{nombre:'WISKI ballentines azul(20º)',segmento:'BEBIDA',destino:'CUBATAS'}]
};
const targetSet={kind:'events',items:[{type:'event',id:'e25',name:'SySA 2025'},{type:'event',id:'e24',name:'SySA 2024'}],source:'prompt',domain:'comparison',requested_object:'summary'};
const plan={scope:'named_event',event:'SySA 2025',events:['SySA 2025','SySA 2024'],subjects:[],domain:'comparison',requested_object:'summary'};
const compareResult={ok:true,name:'compare_events',tables:[{key:'comparison',rows:[
  {Evento:'SySA 2025','Compras realizadas':2424,'Compras pendientes':0,Ingresos:3190,'Donaciones valoradas':300,'Saldo operativo':766,'Valoración del evento':2724,'Asistentes canónicos':30},
  {Evento:'SySA 2024','Compras realizadas':2600,'Compras pendientes':0,Ingresos:2700,'Donaciones valoradas':200,'Saldo operativo':100,'Valoración del evento':2800,'Asistentes canónicos':28}
]}]};
const ws=v46BuildPartitionedWorkingSet(plan,[compareResult],targetSet,'Dame info de SySA 2025 y SySA 2024.');
check('compare_events conserva dos particiones no vacías',ws?.targets?.length===2&&ws.targets.every(x=>!x.empty),JSON.stringify(ws));
check('métricas de compras sobreviven en TARGET_SET',ws?.targets?.[0]?.metrics?.purchases_amount===2424&&ws?.targets?.[1]?.metrics?.purchases_amount===2600,JSON.stringify(ws?.targets));

const baseMd={general:{event:'SySA 2025',scope:'named_event',domain:'comparison'},specific:{active:true,event:'SySA 2025',scope:'named_event',subjects:[],domain:'comparison',requested_object:'summary',operation:'summary',dataset:{id:'events_comparison_sySA',description:'',carry_forward:true}},working_set:ws,target_set:targetSet,stack:[]};
let contextBook={multidim:baseMd,current_message:{references_working_set:true}};
const amounts=v47BuildDerivedAnswer('Dame el importe de las compras de los dos.',state,'e25',contextBook);
check('importe de compras de ambos se resuelve localmente',!!amounts&&/2(?:\.|\s)?424\s*€/.test(amounts.answer)&&/2(?:\.|\s)?600\s*€/.test(amounts.answer),amounts?.answer);
const max=v47BuildDerivedAnswer('¿Cuál de los dos tuvo más compras por importe?',state,'e25',contextBook);
check('máximo de compras sale del WORKING_SET',!!max&&/SySA 2024/.test(max.answer)&&/176\s*€/.test(max.answer),max?.answer);

const focus=v51BuildLocalPartitionFocus('Ahora solo SySA 2024 y dime sus compras.',state,'e25',contextBook,[]);
check('selección de SySA 2024 evita rematerializar',!!focus&&/2(?:\.|\s)?600\s*€/.test(focus.answer)&&focus?.committed?.general?.event==='SySA 2024',focus?.answer);

const sanitized=v51SanitizeSccRequestFilters({event:'SySA 2024',product:'comprados'},{tool:'event_purchase_lines'},plan,state,'Dame una lista de los productos comprados, su cantidad, precio e importe valorado ordenados por DESTINO.',[]);
check('planner no puede inventar filtro de producto',!Object.prototype.hasOwnProperty.call(sanitized,'product'),JSON.stringify(sanitized));

const rows=[
  {Producto:'Galletas (helado corte)',Destino:'COMIDA',Unidades:6,Precio:0.42,Importe:2.52,'Nº registros':2},
  {Producto:'WISKI ballentines azul(20º)',Destino:'CUBATAS',Unidades:2,Precio:12.99,Importe:25.98,'Nº registros':1},
  {Producto:'Agua',Destino:'BEBIDA',Unidades:20,Precio:0.30,Importe:6,'Nº registros':2}
];
const listWs={kind:'products',event:'SySA 2024',scope:'named_event',subjects:[],domain:'purchases',requested_object:'products',tool:'event_purchase_lines',table_key:'by_segment_destination_product',row_count:3,record_count:5,empty:false,aggregate:{total_amount:34.5,total_units:28},row_cache:{table_key:'by_segment_destination_product',title:'Compras por Segmento/Destino · SySA 2024',source_tool:'event_purchase_lines',primary_field:'Producto',visible_fields:['Producto','Destino','Unidades','Precio','Importe','Nº registros'],columns:['Producto','Destino','Unidades','Precio','Importe','Nº registros'],rows,complete:true}};
contextBook={multidim:{general:{event:'SySA 2024',scope:'named_event',domain:'purchases'},specific:{active:true,event:'SySA 2024',scope:'named_event',subjects:[],domain:'purchases',requested_object:'products',operation:'list',dataset:{id:'events_comparison_sySA',description:'',carry_forward:true}},working_set:listWs,target_set:null,stack:[]},current_message:{references_working_set:true}};
const emptyFilter=v51BuildLocalProductFilter('Sí, las ensaladas solo.',state,'e24',contextBook,[]);
check('filtro vacío responde vacío',!!emptyFilter&&/No se encontraron compras de ensaladas/i.test(emptyFilter.answer),emptyFilter?.answer);
check('filtro vacío conserva el WORKING_SET base',emptyFilter?.committed?.working_set?.row_count===3&&!emptyFilter?.committed?.working_set?.empty,JSON.stringify(emptyFilter?.committed?.working_set));

const preservedBook={multidim:emptyFilter.committed,current_message:{references_working_set:true}};
const sorted=v50BuildLocalPresentation('Ahora ordénalos por IMPORTE de mayor a menor.',state,'e24',preservedBook,[]);
check('orden posterior usa la lista base conservada',!!sorted&&/WISKI/.test(sorted.answer)&&sorted?.committed?.working_set?.row_cache?.rows?.[0]?.Producto?.startsWith('WISKI'),sorted?.answer);
const summary=v50BuildLocalPresentation('Dame un resumen de esas compras.',state,'e24',preservedBook,[]);
check('resumen posterior no convierte compras en cero',!!summary&&/5 registros de compra/.test(summary.answer)&&/3 productos distintos/.test(summary.answer)&&/35\s*€/.test(summary.answer),summary?.answer);

console.log(`\nResultado PDF SCC226: ${ok} OK / ${ko} KO`);
if(ko)process.exit(1);
