const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.join(__dirname,'..');
const read=r=>fs.readFileSync(path.join(root,r),'utf8');
let n=0;
function test(name,fn){fn();n++;console.log('OK · '+name);}

test('identidad central v28.3_prod',()=>{
  const v=read('public/app/version.js');
  assert(v.includes("VERSION = 'v28.3_prod'"));
  assert(v.includes("VERSION_TEXT = 'ControlEvent v28.3_prod'"));
  assert(v.includes("VERSION_FILE = 'ControlEvent_v28.3_prod'"));
  assert(v.includes("ZIP_NAME = 'ControlEvent_v28.3_prod.zip'"));
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.name,'controlevent-v28-3-prod');
  assert.equal(pkg.version,'28.3.0');
});

test('migración conserva v28.2 como origen histórico',()=>{
  const v=read('public/app/version.js');
  assert(v.includes("'ControlEvent_v28.2_prod'"));
  assert(v.includes("oldKey.replace(prefix, 'ControlEvent_v28.3_prod')"));
});

test('INFOEVENTO y BACKUP externo/interno usan v28.3',()=>{
  const legacy=read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');
  assert(legacy.includes('ControlEvent_v28.3_prod_INFOEVENTO-'));
  for(const rel of ['public/modules/excel/backup.js','routes/export.routes.js']){
    const s=read(rel);
    assert(s.includes("BACKUP_VERSION = 'ControlEvent v28.3_prod'"),rel);
    assert(s.includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.3_prod'"),rel);
  }
});

test('hardlock final no destruye cabecera',()=>{
  const html=read('public/index.html'),lock=read('public/app/features/v28-3-prod-version-hardlock.js');
  assert(html.lastIndexOf('v28-3-prod-version-hardlock.js')>html.lastIndexOf('v28-3-prod-detail-globes.js'));
  ['headerDateTime','btnLogout'].forEach(x=>assert(html.includes(x),x));
  assert(lock.includes('NUNCA tocar contenedores de cabecera con textContent'));
  assert(!lock.includes("querySelectorAll('.appname,.appname span,.appname-stack"));
});

test('Por destino conserva la lógica estable anterior',()=>{
  const s=read('public/app/features/v28-3-prod-detail-globes.js');
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

test('la justificación viaja pegada a la gráfica bancaria',()=>{
  const back=read('services/event-ai.service.js'),front=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(back.includes('justifiedMovements:bankRows.length===labels.length?bankRows:[]'));
  assert(front.includes('function bankJustificationHtml(ch)'));
  assert(front.includes('Movimientos y justificación de la conciliación'));
  assert(front.includes("kind==='INGRESO'"));
  assert(front.includes("kind==='CARGO'"));
  assert(front.includes('<strong>Justificación:</strong>'));
});

test('informe gráfico general no manda tablas bancarias redundantes al final',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes("const bankKeys=new Set(['event_window_timeline','reconciliation_timeline','balance_timeline','reconciliation_justified_movements','movements','ticket_links'])"));
  assert(s.includes('showTables=showTables.filter(ref=>!'));
  assert(s.includes('La cronología y su justificación ya viajan pegadas a la gráfica bancaria canónica'));
});

test('informe de movimientos conciliados es ruta directa sin Gemini',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('function v283BankReportRequest'));
  assert(s.includes('async function v283DirectBankReport'));
  const a=s.indexOf('if(v283BankReportRequest(userPrompt,conversationHistory))');
  const b=s.indexOf('// v28.3_prod: un «sí / hazlo»',a);
  const chunk=s.slice(a,b);
  assert(chunk.includes('return v283DirectBankReport'));
  assert(!chunk.includes('v261CallInteraction'));
});

test('sí/hazlo ejecuta la última propuesta concreta',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('function v282AffirmativeFollowUp'));
  assert(s.includes('function v282PendingProposal'));
  assert(s.includes("action:'documentation'"));
  assert(s.includes("action:'bank_exclusions'"));
  assert(s.includes('v282ExecutePendingProposal'));
});

test('exclusiones bancarias se muestran como evidencia y no como deducción personal',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf("if(pending.action==='bank_exclusions')"),b=s.indexOf("if(pending.action==='bank')",a),chunk=s.slice(a,b);
  assert(chunk.includes("table_key:'excluded_movements'"));
  assert(chunk.includes('fecha, importe, concepto y vínculos registrados'));
  assert(chunk.includes('no deduce que sean personales'));
  assert(!chunk.includes('v261CallInteraction'));
});

test('prefetch gráfico reduce filas bancarias enviadas a Gemini',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes("if(key==='reconciliation_timeline')return detail==='full'?24:(detail==='brief'?0:10)"));
  assert(s.includes("if(key==='reconciliation_justified_movements')return detail==='full'?24:0"));
  assert(s.includes("if(key==='movements'||key==='ticket_links')return detail==='full'?24:(detail==='brief'?0:10)"));
});

test('prefetch prohíbe inventar motivos personales y delega representación a CE',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('No inventes causas personales, motivos de ajustes, acuerdos, asistencia parcial'));
  assert(s.includes('ControlEvent construirá después las gráficas, tablas y la justificación bancaria'));
});

test('auditor de informe preconsultado no paga una segunda llamada Gemini',()=>{
  const s=read('services/event-ai.service.js');
  assert(s.includes('function v283DeterministicSafetyRepair'));
  const a=s.indexOf('if(issues.length&&prefetch)'),b=s.indexOf('}else if(issues.length&&v281PreviousAnswerAuditRequest',a),chunk=s.slice(a,b);
  assert(chunk.includes('v283DeterministicSafetyRepair'));
  assert(!chunk.includes('v261CallInteraction'));
});

test('productos se ordenan TIENDA > SEGMENTO > DESTINO > PRODUCTO',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('function v274PurchaseRowsForEvent'),b=s.indexOf('async function v274ToolMasterCatalog',a),chunk=s.slice(a,b);
  const it=chunk.indexOf('trim(a.Tienda)'),is=chunk.indexOf('trim(a.Segmento)'),id=chunk.indexOf('trim(a.Destino)'),ip=chunk.indexOf('trim(a.Producto)');
  assert(it>0&&is>it&&id>is&&ip>id);
});

test('traza siempre existe en pantalla y queda plegada por defecto',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes('la traza está SIEMPRE disponible en pantalla'));
  assert(s.includes('<details><summary>Ver traza de resolución</summary>'));
  assert(!s.includes('<details open'));
  assert(s.includes('html+=traceHtml(data);'));
});

test('consumo Gemini vive dentro de la traza, no como tarjeta independiente renderizada',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes('<strong>Consumo Gemini</strong>'));
  assert(!s.includes('html+=usageHtml(data);'));
});

test('PDF: traza plegada se elimina por completo; desplegada se exporta completa',()=>{
  const s=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes("var traceExpanded=!!result.querySelector('.ce-ai-trace details[open]')"));
  assert(s.includes("if(!traceExpanded) printable.querySelectorAll('.ce-ai-trace').forEach(function(node){ node.remove(); });"));
  assert(s.includes("else printable.querySelectorAll('.ce-ai-trace details').forEach(function(node){ node.setAttribute('open','open'); });"));
});

test('traza contiene datos de fuentes, filas, render, deduplicación y coste',()=>{
  const s=read('services/event-ai.service.js'),front=read('public/app/features/v11-3-zuzu-analitica-libre.js');
  assert(s.includes('filas fuente=${ps.sourceRows'));
  assert(s.includes('filas renderizadas=${ps.renderedTableRows'));
  assert(s.includes('descartes por deduplicación='));
  assert(front.includes('Tokens: '));
  assert(front.includes('coste aprox.'));
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

test('no se hardcodean entidades de la batería en la lógica nueva v28.3',()=>{
  const s=read('services/event-ai.service.js');
  const a=s.indexOf('// v28.3_prod · RUTAS DETERMINISTAS DE BAJO COSTE'),b=s.indexOf('/* Código histórico conservado',a),chunk=s.slice(a,b);
  for(const token of ['SySA 2026','FUNCION 2025','Pocholo','Carmelo','TK05','CUBATAS','ALMACEN']) assert(!chunk.includes(token),token);
});

console.log(`OK ${n} pruebas v28.3_prod`);
