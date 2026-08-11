const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
let n=0;
function test(name,fn){fn();n++;console.log('OK · '+name);}

test('identidad central v28.5_prod',()=>{
  const v=read('public/app/version.js');
  assert(v.includes("VERSION = 'v28.5_prod'"));
  assert(v.includes("VERSION_TEXT = 'ControlEvent v28.5_prod'"));
  assert(v.includes("VERSION_FILE = 'ControlEvent_v28.5_prod'"));
  assert(v.includes("ZIP_NAME = 'ControlEvent_v28.5_prod.zip'"));
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.name,'controlevent-v28-5-prod');
  assert.equal(pkg.version,'28.5.0');
  assert(pkg.scripts['test:v28.5'].includes('test-v28-5-prod.cjs'));
});

test('migración conserva v28.3 como origen histórico',()=>{
  const v=read('public/app/version.js');
  assert(v.includes("'ControlEvent_v28.3_prod'"));
  assert(v.includes("oldKey.replace(prefix, 'ControlEvent_v28.5_prod')"));
});

test('INFOEVENTO y BACKUP externo/interno usan v28.5',()=>{
  const legacy=read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');
  assert(legacy.includes('ControlEvent_v28.5_prod_INFOEVENTO-'));
  for(const rel of ['public/modules/excel/backup.js','routes/export.routes.js']){
    const s=read(rel);
    assert(s.includes("BACKUP_VERSION = 'ControlEvent v28.5_prod'"),rel);
    assert(s.includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.5_prod'"),rel);
  }
});

test('hardlock final no destruye cabecera',()=>{
  const html=read('public/index.html'),lock=read('public/app/features/v28-5-prod-version-hardlock.js');
  assert(html.lastIndexOf('v28-5-prod-version-hardlock.js')>html.lastIndexOf('v28-5-prod-detail-globes.js'));
  ['headerDateTime','btnLogout'].forEach(x=>assert(html.includes(x),x));
  assert(lock.includes('NUNCA tocar contenedores de cabecera con textContent'));
  assert(lock.includes('__ceV285VersionHardlock'));
  assert(!lock.includes("querySelectorAll('.appname,.appname span,.appname-stack"));
});

test('Por destino conserva la lógica estable anterior',()=>{
  const s=read('public/app/features/v28-5-prod-detail-globes.js');
  assert(s.includes('ControlEventV280RestoredGraphDetails'));
  assert(s.includes("const subset=all.filter(r=>norm(r.destino)===norm(destination)&&r.kind===k)"));
  assert(!s.includes('expandCompletePurchasedTickets'));
});

test('banco construye justificación canónica ingreso/TK',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('const movementJustification=x=>'));
  assert(s.includes('Ingreso: ${items.join'));
  assert(s.includes('Tickets: ${items.join'));
  assert(s.includes("'Sin vínculo justificativo registrado'"));
  assert(s.includes('Justificación:justification'));
});

test('movimientos justificados viajan pegados a la gráfica bancaria',()=>{
  const back=read('services/event-ai.service.js'),front=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(back.includes('justifiedMovements:bankRows.length===labels.length?bankRows:[]'));
  assert(front.includes('function bankJustificationHtml(ch)'));
  assert(front.includes('Movimientos y justificación de la conciliación'));
  assert(front.includes("kind==='INGRESO'"));
  assert(front.includes("kind==='CARGO'"));
  assert(front.includes('<strong>Justificación:</strong>'));
});

test('tablas bancarias auxiliares nunca se convierten en gráficas finales',()=>{
  const s=read('services/event-ai.service.js');
  for(const key of ['reconciliation_justified_movements','movements','ticket_links']){
    assert(new RegExp(`v26Table\\('${key}'[\\s\\S]{0,400}?chartable:false`).test(s),key);
  }
  assert(s.includes("const bankKeys=new Set(['event_window_timeline','reconciliation_timeline','balance_timeline','reconciliation_justified_movements','movements','ticket_links'])"));
  assert(s.includes('La cronología y su justificación ya viajan pegadas a la gráfica bancaria canónica'));
});

test('prefetch de informe gráfico obtiene solo dossier+banco en paralelo y con scope real',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('async function v281PrefetchEventAnalysis'),b=s.indexOf('function v281PrefetchInput',a),chunk=s.slice(a,b);
  assert(chunk.includes("{id:'v284_prefetch_dossier',name:'event_dossier',...ea,detail:'brief'}"));
  assert(chunk.includes("{id:'v284_prefetch_bank',name:'event_bank',...ea,detail:'brief'}"));
  assert(chunk.includes("v261ExecuteAgentTool({id,name,arguments:arguments_}"));
  const broad=chunk.slice(chunk.indexOf('const defs=broadGraphical?['),chunk.indexOf(']:[',chunk.indexOf('const defs=broadGraphical?[')));
  assert(!broad.includes('event_breakdowns'));
  assert(!broad.includes('event_people'));
});

test('informe preconsultado usa una llamada de razonamiento sin tools ni previous_interaction_id',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('async function runZuzuV261InteractionsAgent'),b=s.indexOf('async function runZuzuSemanticAgent',a),chunk=s.slice(a,b);
  assert(chunk.includes("let currentId='',payload"));
  assert(chunk.includes("const noToolsThisTurn=!!prefetch"));
  assert(chunk.includes("stage:'v28.5 · Gemini razonamiento único'"));
  assert(chunk.includes("initialToolChoice=noToolsThisTurn?'none':'auto'"));
  assert(chunk.includes("initialTools=noToolsThisTurn?[]:tools"));
});

test('auditor factual de informe preconsultado no paga segunda llamada',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('}else if(issues.length&&prefetch){'),b=s.indexOf('}else if(issues.length){',a),chunk=s.slice(a,b);
  assert(a>0&&b>a);
  assert(chunk.includes('v283DeterministicSafetyRepair'));
  assert(!chunk.includes('v261CallInteraction'));
});

test('memoria conversacional usa cápsula compacta y no encadena Interactions',()=>{
  const s=read('services/event-ai.service.js'),front=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes('function v284ConversationCapsuleInput'));
  assert(s.includes('arr(conversationHistory).slice(-3)'));
  assert(s.includes('Se ignora previous_interaction_id para ahorrar contexto acumulado'));
  assert(front.includes("var previousInteractionId=''; // v28.5_prod"));
});

test('sí/hazlo ejecuta la última propuesta estructurada sin Gemini',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('function v284PendingActionFromAnswer'));
  const parser=s.slice(s.indexOf('function v284PendingActionFromAnswer'),s.indexOf('function v284SanitizeUnsupportedCausalClaims'));
  assert(parser.indexOf("return{action:'purchases'") < parser.indexOf("return{action:'charts'") );
  assert(s.includes("if(pending.action==='purchases')"));
  const a=s.indexOf("if(pending.action==='purchases')"),b=s.indexOf("if(pending.action==='management')",a),chunk=s.slice(a,b);
  assert(!chunk.includes('v261CallInteraction'));
  assert(chunk.includes("name:'event_breakdowns'"));
});

test('frontend conserva pendingAction en el historial local',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes("var pendingAction=(data.meta&&data.meta.pendingAction"));
  assert(s.includes('pendingAction:pendingAction'));
});

test('informe de movimientos conciliados es ruta directa sin Gemini',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('if(v283BankReportRequest(userPrompt,conversationHistory))'),b=s.indexOf('// v28.5_prod: un «sí / hazlo»',a),chunk=s.slice(a,b);
  assert(a>0&&b>a);
  assert(chunk.includes('return v283DirectBankReport'));
  assert(!chunk.includes('v261CallInteraction'));
});

test('saneo causal elimina causas no respaldadas',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('function v284SanitizeUnsupportedCausalClaims'));
  assert(s.includes('posiblemente|probablemente|quiz'));
  assert(s.includes('El ajuste está registrado, pero el motivo concreto no consta en los datos consultados.'));
});

test('productos se ordenan TIENDA > SEGMENTO > DESTINO > PRODUCTO',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('function v274PurchaseRowsForEvent'),b=s.indexOf('async function v274ToolMasterCatalog',a),chunk=s.slice(a,b);
  const it=chunk.indexOf('trim(a.Tienda)'),is=chunk.indexOf('trim(a.Segmento)'),id=chunk.indexOf('trim(a.Destino)'),ip=chunk.indexOf('trim(a.Producto)');
  assert(it>0&&is>it&&id>is&&ip>id);
});

test('traza siempre disponible, plegada por defecto y sin tarjeta de consumo fuera',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes('la traza está SIEMPRE disponible en pantalla'));
  assert(s.includes('<details><summary>Ver traza de resolución</summary>'));
  assert(!s.includes('<details open'));
  assert(s.includes('html+=traceHtml(data);'));
  assert(!s.includes('html+=usageHtml(data);'));
});

test('traza añade total general acumulado de tokens y coste',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes("function zuzuUsageTotalKey()"));
  assert(s.includes("function recordZuzuUsage(data)"));
  assert(s.includes('geminiConversationTotal'));
  assert(s.includes('Total general de la conversación Zuzu'));
  assert(s.includes('costEurApprox'));
  assert(s.includes('recordZuzuUsage(data);'));
});

test('PDF plegado no incluye ni traza ni total general; desplegado sí',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes("var traceExpanded=!!result.querySelector('.ce-ai-trace details[open]')"));
  assert(s.includes("if(!traceExpanded) printable.querySelectorAll('.ce-ai-trace').forEach(function(node){ node.remove(); });"));
  assert(s.includes("else printable.querySelectorAll('.ce-ai-trace details').forEach(function(node){ node.setAttribute('open','open'); });"));
  assert(s.indexOf('Total general de la conversación Zuzu') > s.indexOf('function traceHtml'));
});

test('limpiar Zuzu reinicia también el total acumulado',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  const a=s.indexOf('function clearZuzu'),b=s.indexOf('function installPromptEventShield',a),chunk=s.slice(a,b);
  assert(chunk.includes('window.__ceZuzuUsageTotalV285=emptyZuzuUsageTotal()'));
  assert(chunk.includes("sessionStorage.removeItem(v+'_zuzu_usage_total')"));
});

test('PDF conserva contexto causal de follow-ups',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes('function reportConversationContextHtml'));
  assert(s.includes('Contexto de la consulta'));
  assert(s.includes('function proposalTail'));
  assert(s.includes('<strong>Zuzu:</strong>'));
});

test('app/public del frontend Zuzu son idénticos',()=>{
  assert.equal(read('app/features/v11-3-zuzu-analitica-libre.js'),read('public/app/features/v11-3-zuzu-analitica-libre.js'));
});

test('version.js app/public son idénticos',()=>{
  assert.equal(read('app/version.js'),read('public/app/version.js'));
});

test('no se hardcodean entidades de la batería en la lógica nueva v28.5',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('// v28.5_prod · RUTAS DETERMINISTAS DE BAJO COSTE'),b=s.indexOf('/* Código histórico conservado',a),chunk=s.slice(a,b);
  assert(a>0&&b>a);
  for(const token of ['SySA 2026','FUNCION 2025','Pocholo','Carmelo','TK05','CUBATAS','ALMACEN']) assert(!chunk.includes(token),token);
});



test('comparativa multievento tiene prioridad sobre gráfica de un solo evento',()=>{
  const s=read('services/event-ai.service.js');
  const route=s.slice(s.indexOf('async function v281TryDirectRoute'),s.indexOf('// TKxx concreto',s.indexOf('async function v281TryDirectRoute')));
  const cmp=route.indexOf('v285ComparisonEventNames');
  const single=route.indexOf('v281GraphEachFollowUp');
  assert(cmp>0 && single>cmp);
  assert(route.includes('return v285DirectMultiEventComparison'));
});

test('comparativa completa resuelve serie y eventos sin nombres hardcodeados',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('// v28.5_prod · COMPARATIVAS MULTIEVENTO DETERMINISTAS'),b=s.indexOf('async function v281TryDirectRoute',a),chunk=s.slice(a,b);
  assert(chunk.includes('function v285SeriesBase'));
  assert(chunk.includes('function v285ComparisonEventNames'));
  assert(chunk.includes("name:'compare_events_extended'"));
  assert(chunk.includes("'Movimientos conciliados'"));
  assert(chunk.includes("'Ingresos con justificante'"));
  assert(chunk.includes("'Documentos con adjunto'"));
  assert(chunk.includes('no se mezclan movimientos individuales'));
  for(const token of ['SySA 2026','SySA 2025','SySA 2024','TK05','CUBATAS','ALMACEN'])assert(!chunk.includes(token),token);
});

test('comparativa gráfica de todos los datos genera múltiples métricas homogéneas',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('function v285ComparisonChartSpecs'),b=s.indexOf('function v285ComparisonGoodBadText',a),chunk=s.slice(a,b);
  for(const metric of ['Ingresos','Compras realizadas','Donaciones valoradas','Saldo operativo','Valoración del evento','Asistentes canónicos','Precio por socio','Tickets de compra','Documentos','Movimientos conciliados','Impacto bancario'])assert(chunk.includes(`'${metric}'`),metric);
  assert(s.includes('const chartLimit=arr(final?.chartSpecs).length>5?Math.min(12,arr(final?.chartSpecs).length):5;'));
});

test('comparativa no adjunta cronologías individuales de banco',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('async function v285DirectMultiEventComparison'),b=s.indexOf('async function v281TryDirectRoute',a),chunk=s.slice(a,b);
  assert(chunk.includes('results:[result]'));
  assert(!chunk.includes('results:[result,...'));
  assert(chunk.includes('no se mezclan movimientos individuales'));
});

test('claro que sí cuenta como afirmación y compras materializa tabla real',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('function v282AffirmativeFollowUp'),b=s.indexOf('function v282PendingProposal',a),affirm=s.slice(a,b);
  assert(affirm.includes('claro que si'));
  const p1=s.indexOf("if(pending.action==='purchases')"),p2=s.indexOf("if(pending.action==='management')",p1),purchase=s.slice(p1,p2);
  assert(purchase.includes("showTables:[{tool_id:breakdown.id,table_key:key}]"));
});

test('reclamación de tabla prometida se resuelve localmente',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('Si el usuario reclama una tabla'),b=s.indexOf('// v28.5_prod: presentar/repetir',a),chunk=s.slice(a,b);
  assert(a>0&&b>a);
  assert(chunk.includes('v282PendingProposal'));
  assert(chunk.includes('v282ExecutePendingProposal'));
  assert(!chunk.includes('v261CallInteraction'));
});

console.log(`OK ${n} pruebas v28.5_prod`);
