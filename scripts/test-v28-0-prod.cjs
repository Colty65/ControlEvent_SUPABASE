const fs=require('fs');const path=require('path');const vm=require('vm');const assert=require('assert');
const root=path.join(__dirname,'..');
function read(rel){return fs.readFileSync(path.join(root,rel),'utf8');}
let n=0;function test(name,fn){fn();n++;console.log('OK · '+name);}

test('versión central exacta v28.0_prod',()=>{
  const v=read('public/app/version.js');
  assert(v.includes("VERSION = 'v28.0_prod'"));assert(v.includes("VERSION_TEXT = 'ControlEvent v28.0_prod'"));assert(v.includes("VERSION_FILE = 'ControlEvent_v28.0_prod'"));
  const paths=read('server/paths.js');assert(paths.includes("APP_VERSION_LABEL = 'v28.0_prod'"));assert(paths.includes("ZIP_NAME = 'ControlEvent_v28.0_prod.zip'"));
});

test('INFOEVENTO y BACKUP externos usan v28.0_prod',()=>{
  const legacy=read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');assert(legacy.includes('ControlEvent_v28.0_prod_INFOEVENTO-'));
  assert(read('public/modules/excel/backup.js').includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.0_prod'"));
  assert(read('routes/export.routes.js').includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.0_prod'"));
});

test('identidad interna de Excel usa v28.0_prod',()=>{
  for(const rel of ['public/modules/excel/backup.js','public/modules/excel/graficas-sheet.js','public/modules/excel/resumen-sheet.js','routes/export.routes.js']){const s=read(rel);assert(s.includes('v28.0_prod')||s.includes('ControlEvent_v28.0_prod'),rel);}
});

test('hardlock final de versión se carga al final',()=>{
  const html=read('public/index.html');const detail=html.lastIndexOf('v28-0-prod-detail-globes.js'),hard=html.lastIndexOf('v28-0-prod-version-hardlock.js');assert(detail>0&&hard>detail);
});

test('globo de destino vuelve al comportamiento estable anterior',()=>{
  const code=read('public/app/features/v28-0-prod-detail-globes.js');
  assert(code.includes('ControlEventV280RestoredGraphDetails'));
  assert(code.includes("const subset=all.filter(r=>norm(r.destino)===norm(destination)&&r.kind===k)"));
  assert(code.includes("'Tienda | Ticket | Producto | Cant. | Precio | Total'"));
  assert(!code.includes('expandCompletePurchasedTickets'));
  assert(!code.includes('TOTAL TICKETS COMPLETOS MOSTRADOS'));
  assert(!code.includes('TICKETS COMPLETOS RELACIONADOS'));
});

test('detalle TKxx filtra antes de compactar',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes("const ticketFilter=norm(tool?.ticket)"));
  assert(s.includes("allRows.filter(r=>norm(r?.['Ticket u otros gastos'])===ticketFilter)"));
  assert(s.includes("ticket:{type:'string'"));
});

test('consultas estructuradas inequívocas tienen ruta directa sin Gemini',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('async function v281TryDirectRoute'));
  assert(s.includes("provider:'control-event-v28-direct'"));
  assert(s.includes('geminiUsageEstimate:{calls:0'));
  assert(s.includes('if(dataReq.catalogEntity)'));
  assert(s.includes('if(dataReq.purchaseDetail)'));
});

test('catálogo + evento materializa la tabla combinada real',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes("key=dataReq.groupSegmentDestination?'catalog_with_event_purchases_by_segment_destination':'catalog_with_event_purchases'"));
  assert(s.includes("catalog_purchase_totals_by_segment_destination"));
});

test('gráfica bancaria de fechas del evento es exclusiva y conversa en follow-up',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('function v281EventWindowChartContext'));
  assert(s.includes("table_key:'event_window_timeline'"));
  assert(s.includes('No sustituyo ese intervalo por el histórico general'));
});

test('resumen gráfico global usa datasets tipados y no KPI mixto',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes("table_key:'economics_chart'"));assert(s.includes("table_key:'attendance_chart'"));assert(s.includes("table_key:'management_chart'"));
  assert(s.includes("if(trim(t?.key)==='kpis')continue"));
});

test('salida interna charts/show_tables nunca se enseña como respuesta',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('function v281StripInternalPresentationLeak'));assert(s.includes("(?:charts|show_tables|showTables|chart_specs|chartSpecs)"));
});

test('interacciones reducen gasto sin eliminar razonamiento abierto',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes("CONTROLEVENT_ZUZU_THINKING_LEVEL||'low'"));assert(s.includes('CONTROLEVENT_ZUZU_MAX_OUTPUT_TOKENS')&&s.includes('||3200'));
  assert(s.includes('for(let cycle=1;cycle<=4;cycle++)'));
  assert(s.includes('v281PrefetchEventAnalysis'));
});

test('informe/curiosidades preconsultan fuentes en paralelo y usan una sola redacción',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes("return'executive'"));assert(s.includes("return'analysis'"));assert(s.includes('Promise.all(defs.map'));
  assert(s.includes("initialToolChoice=(prefetch||v281PreviousAnswerAuditRequest(userPrompt))?'none':'auto'"));
});

test('no quedan versiones activas 1.1/1.4/1.5 en public salvo migración histórica',()=>{
  const bad=[];function walk(dir){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,ent.name);if(ent.isDirectory()){if(ent.name==='node_modules')continue;walk(p);}else if(/\.(js|html|json|css)$/.test(ent.name)){const rel=path.relative(root,p).replace(/\\/g,'/');if(rel==='public/app/version.js')continue;const s=fs.readFileSync(p,'utf8');if(/v27_prod_1\.(1|4|5)|ControlEvent[_ ]v27_prod_1\.(1|4|5)/.test(s))bad.push(rel);}}}walk(path.join(root,'public'));assert.deepEqual(bad,[]);
});
console.log(`OK ${n} pruebas v28.0_prod reajustada`);
