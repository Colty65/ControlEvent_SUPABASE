const fs=require('fs');const path=require('path');const assert=require('assert');
const root=path.join(__dirname,'..');const read=r=>fs.readFileSync(path.join(root,r),'utf8');let n=0;
function test(name,fn){fn();n++;console.log('OK · '+name);}

test('identidad central v28.5.1_prod',()=>{
  const v=read('public/app/version.js');assert(v.includes("VERSION = 'v28.5.1_prod'"));assert(v.includes("VERSION_TEXT = 'ControlEvent v28.5.1_prod'"));assert(v.includes("VERSION_FILE = 'ControlEvent_v28.5.1_prod'"));assert(v.includes("ZIP_NAME = 'ControlEvent_v28.5.1_prod.zip'"));
  const pkg=JSON.parse(read('package.json'));assert.equal(pkg.name,'controlevent-v28-5-1-prod');assert.equal(pkg.version,'28.2.0');
});

test('migración conserva v28.1 como origen, no como versión activa',()=>{
  const v=read('public/app/version.js');assert(v.includes("legacyPrefixes = ['ControlEvent_v28.1_prod'"));assert(v.includes("oldKey.replace(prefix, 'ControlEvent_v28.5.1_prod')"));
});

test('INFOEVENTO y BACKUP externo/interno son v28.2',()=>{
  const legacy=read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');assert(legacy.includes('ControlEvent_v28.5.1_prod_INFOEVENTO-'));
  for(const rel of ['public/modules/excel/backup.js','routes/export.routes.js']){const s=read(rel);assert(s.includes("BACKUP_VERSION = 'ControlEvent v28.5.1_prod'"),rel);assert(s.includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.5.1_prod'"),rel);}
});

test('hardlock v28.2 queda al final sin destruir cabecera',()=>{
  const html=read('public/index.html'),lock=read('public/app/features/v28-5-1-prod-version-hardlock.js');
  assert(html.lastIndexOf('v28-5-1-prod-version-hardlock.js')>html.lastIndexOf('v28-5-1-prod-detail-globes.js'));
  ['controlevent-welcome-v44.png','headerDateTime','btnLogout'].forEach(x=>assert(html.includes(x),x));
  assert(!lock.includes("querySelectorAll('.appname,.appname span,.appname-stack"));assert(lock.includes("source:'v28-5-1-prod-version-hardlock.js'"));
});

test('globo Por destino conserva exactamente la lógica estable',()=>{
  const s=read('public/app/features/v28-5-1-prod-detail-globes.js');assert(s.includes('ControlEventV280RestoredGraphDetails'));assert(s.includes("const subset=all.filter(r=>norm(r.destino)===norm(destination)&&r.kind===k)"));assert(!s.includes('expandCompletePurchasedTickets'));assert(!s.includes('TOTAL TICKETS COMPLETOS MOSTRADOS'));
});

test('banco incorpora justificación humana de ingresos y TK',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('const movementJustification=x=>'));assert(s.includes('Ingreso: ${items.join'));assert(s.includes('Tickets: ${items.join'));assert(s.includes("Justificación:justification"));assert(s.includes("reconciliation_justified_movements"));
});

test('informe gráfico canónico pone justificación justo tras conciliación',()=>{
  const s=read('services/event-ai.service.js'),a=s.indexOf("type:'line',tool_id:bank.id"),b=s.indexOf("table_key:'reconciliation_justified_movements'",a),c=s.indexOf("table_key:'economics_chart'",a);assert(a>0&&b>a&&c>b);
});

test('movimientos justificados usan tipo como semántica verde/rojo',()=>{
  const back=read('services/event-ai.service.js'),front=read('public/app/features/v11-3-zuzu-analitica-libre.js');assert(back.includes("marker_field:'Tipo'"));assert(front.includes("kind==='INGRESO'?'#22c55e'"));assert(front.includes("kind==='CARGO'?'#e11d48'"));assert(front.includes('Math.abs(v)/max'));
});

test('sí/hazlo ejecuta la última propuesta concreta sin Gemini',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('function v282AffirmativeFollowUp'));assert(s.includes('function v282PendingProposal'));assert(s.includes("action:'documentation'"));assert(s.includes('v282ExecutePendingProposal'));assert(s.includes("id:'v282_followup_documentation'"));
});

test('documentación incremental no reconstruye dossier completo',()=>{
  const s=read('services/event-ai.service.js');const a=s.indexOf("if(pending.action==='documentation')"),b=s.indexOf("if(pending.action==='charts')",a),chunk=s.slice(a,b);assert(chunk.includes('v26ToolEventDocumentation'));assert(!chunk.includes('v26ToolEventDossier'));assert(!chunk.includes('v261EventBankTool'));assert(chunk.includes('v281LocalResponse'));
});

test('prefetch no repite análisis amplio en follow-up olvidado',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('const contextualFollowUp='));assert(s.includes('if(contextualFollowUp)return null'));assert(!s.slice(s.indexOf('async function v281PrefetchEventAnalysis'),s.indexOf('function v281PrefetchInput')).includes("{id:'v28_prefetch_documentation'"));
});

test('Gemini recibe reglas de memoria incremental y última propuesta',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('MEMORIA INCREMENTAL:'));assert(s.includes('ÚLTIMA PROPUESTA:'));assert(s.includes('TRAZA BAJO PETICIÓN:'));
});

test('refinamiento de gráfica bancaria es ruta directa y no duplica informe 9',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('function v282BankRefinementFollowUp'));assert(s.includes("id:'v282_direct_bank_refinement'"));const a=s.indexOf('if(v282BankRefinementFollowUp'),b=s.indexOf('// Gráfica bancaria acotada',a),chunk=s.slice(a,b);assert(chunk.includes('v281LocalResponse'));assert(!chunk.includes('v261CallInteraction'));
});

test('deduplicación de gráficas es por contenido, no tool_id',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('seenChartContent'));assert(s.includes("JSON.stringify([trim(ch?.type),arr(ch?.labels),arr(ch?.values),arr(ch?.series)])"));
});

test('deduplicación de tablas es por columnas y filas',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes('seenTableContent'));assert(s.includes('JSON.stringify([cols,rows])'));
});

test('productos se ordenan por TIENDA > SEGMENTO > DESTINO > PRODUCTO',()=>{
  const s=read('services/event-ai.service.js');const a=s.indexOf('function v274PurchaseRowsForEvent'),b=s.indexOf('async function v274ToolMasterCatalog',a),chunk=s.slice(a,b);const it=chunk.indexOf('trim(a.Tienda)'),is=chunk.indexOf('trim(a.Segmento)'),id=chunk.indexOf('trim(a.Destino)'),ip=chunk.indexOf('trim(a.Producto)');assert(it>0&&is>it&&id>is&&ip>id);
  assert(s.includes("by_store_segment_destination_product"));
});

test('catálogo de productos también usa orden canónico por defecto',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes("if(entity==='products')rows.sort((a,b)=>trim(a['Tienda referencia'])"));
});

test('TK concreto sigue filtrando antes de entregar y mantiene TK05 lógico',()=>{
  const s=read('services/event-ai.service.js');assert(s.includes("allRows.filter(r=>v281TicketEqual(r?.['Ticket u otros gastos'],ticketFilter))"));assert(s.includes('function v281TicketKey'));assert(s.includes('return`TK${m[1]}`.toUpperCase()'));
});

test('PDF conserva contexto causal mínimo en follow-ups',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');assert(s.includes('function reportConversationContextHtml'));assert(s.includes('Contexto de la consulta'));assert(s.includes('function proposalTail'));assert(s.includes('assistantTail'));assert(s.includes("<strong>Zuzu:</strong>"));
});

test('PDF imprime traza solo si el usuario la pide',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');assert(s.includes('function wantsTraceInReport'));assert(s.includes('if(!includeTrace)'));assert(s.includes("setAttribute('open','open')"));
});

test('la conversación guarda principio y final de la respuesta para contexto',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');assert(s.includes('assistant:fullAnswer.slice(0,1200)'));assert(s.includes('assistantTail:fullAnswer.slice(-1000)'));
});

test('frontend duplicado app/public permanece idéntico',()=>{assert.equal(read('app/features/v11-3-zuzu-analitica-libre.js'),read('public/app/features/v11-3-zuzu-analitica-libre.js'));});

test('solo quedan referencias v28.1 como migración histórica en app activa',()=>{
  const allowed=new Set(['app/version.js','public/app/version.js','app/features/v11-3-zuzu-analitica-libre.js','public/app/features/v11-3-zuzu-analitica-libre.js']);const bad=[];
  function walk(base){for(const ent of fs.readdirSync(path.join(root,base),{withFileTypes:true})){const rel=path.posix.join(base,ent.name),abs=path.join(root,rel);if(ent.isDirectory())walk(rel);else if(/\.(js|html|css|json|mjs|cjs)$/.test(ent.name)){const txt=fs.readFileSync(abs,'utf8');if(/v28\.1_prod|ControlEvent_v28\.1_prod|ControlEvent v28\.1_prod|v28-1-prod|V28-1-PROD/.test(txt)&&!allowed.has(rel))bad.push(rel);}}}walk('app');walk('public');walk('services');walk('routes');walk('server');assert.deepEqual(bad,[]);
});

console.log(`OK ${n} pruebas v28.5.1_prod`);
