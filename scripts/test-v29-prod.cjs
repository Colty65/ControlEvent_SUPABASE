const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
let n=0;function test(name,fn){fn();n++;console.log('OK',name)}
const service=read('services/event-ai.service.js');
const renderer=read('public/app/features/v11-3-zuzu-analitica-libre.js');

test('identidad central v29_prod',()=>{
  for(const rel of ['app/version.js','public/app/version.js']){
    const v=read(rel);
    assert(v.includes("VERSION = 'v29_prod'"));
    assert(v.includes("VERSION_TEXT = 'ControlEvent v29_prod'"));
    assert(v.includes("VERSION_FILE = 'ControlEvent_v29_prod'"));
    assert(v.includes("ZIP_NAME = 'ControlEvent_v29_prod.zip'"));
    assert(v.includes("'ControlEvent_v28.5.3_prod'"),'debe migrar claves de la versión anterior');
    assert(v.includes("oldKey.replace(prefix, 'ControlEvent_v29_prod')"));
  }
  const pkg=JSON.parse(read('package.json'));
  assert.equal(pkg.name,'controlevent-v29-prod');
  assert.equal(pkg.version,'29.0.0');
});

test('cabecera visible y hardlock final v29_prod',()=>{
  const html=read('public/index.html');
  assert(html.includes('<title>ControlEvent v29_prod</title>'));
  assert(html.includes('<span data-ce-version-label>v29_prod</span>'));
  assert(html.includes('content="20260811-V29-PROD"'));
  assert(html.includes('./app/features/v29-prod-version-hardlock.js?v=20260811-V29-PROD'));
  assert(fs.existsSync(path.join(ROOT,'public/app/features/v29-prod-version-hardlock.js')));
  const h=read('public/app/features/v29-prod-version-hardlock.js');
  assert(h.includes("LABEL='v29_prod'"));
  assert(h.includes("FILE='ControlEvent_v29_prod'"));
  assert(h.includes("ZIP='ControlEvent_v29_prod.zip'"));
});

test('INFOEVENTO v29 externo e interno',()=>{
  const legacy=read('public/app/legacy/legacy-bundle-before-modules-v30.7.js');
  assert(legacy.includes('ControlEvent_v29_prod_INFOEVENTO-'));
  assert(legacy.includes("ControlEvent v29_prod - ©oltyLAB"));
  const graficas=read('public/modules/excel/graficas-sheet.js');
  const resumen=read('public/modules/excel/resumen-sheet.js');
  assert(graficas.includes("PRODUCT_VERSION = 'v29_prod'"));
  assert(resumen.includes("PRODUCT_VERSION = 'v29_prod'"));
});

test('BACKUP v29 externo e interno cliente y servidor',()=>{
  for(const rel of ['public/modules/excel/backup.js','routes/export.routes.js']){
    const s=read(rel);
    assert(s.includes("BACKUP_VERSION = 'ControlEvent v29_prod'"),rel);
    assert(s.includes("BACKUP_VERSION_FILE = 'ControlEvent_v29_prod'"),rel);
    assert(s.includes("['VERSION', BACKUP_VERSION]"),rel);
    assert(s.includes("['VERSION_FICHERO', BACKUP_VERSION_FILE]"),rel);
  }
});

test('PDF de Zuzu sale como v29_prod',()=>{
  assert(renderer.includes("ControlEvent_v29_prod-responde_Zuzu_a_"));
});

test('conciliación bancaria siempre genera globo con cuatro datos',()=>{
  assert(service.includes("if(bankTimeline)pointLabelFields=['Concepto','Movimiento','Saldo bancario del periodo','Justificación']"));
  assert(service.includes('staticPointLabels:(bankTimeline||staticPointLabels)&&pointLabels.length===labels.length'));
  const a=service.indexOf('function v273PointLabelFromRow'),b=service.indexOf('function v273PointTooltipFromRow',a),chunk=service.slice(a,b);
  assert(chunk.includes('/concepto|descripcion/'));
  assert(chunk.includes('/movimiento|importe/'));
  assert(chunk.includes('/saldo/'));
  assert(chunk.includes('/justificacion|evidencia/'));
});

test('globos bancarios se colorean y se reparten sin amontonar',()=>{
  assert(renderer.includes('var maxPerSegment=8'));
  assert(renderer.includes('segmentCount=Math.max(1,Math.ceil(labels.length/maxPerSegment))'));
  assert(renderer.includes('<rect x='));
  assert(renderer.includes("if(k==='INGRESO')return '#16a34a'"));
  assert(renderer.includes("if(k==='CARGO')return '#dc2626'"));
  assert(renderer.includes('Cada globo muestra concepto, importe, saldo resultante y justificación'));
  assert(renderer.includes('Movimientos '+"'"+'+(seg.start+1)+')); // encabezado por tramo
});

test('banco + ingresos conserva resumen y añade detalle nominal segmentado',()=>{
  const a=service.indexOf('async function v2852DirectBankIncomeCharts'),b=service.indexOf('async function v281TryDirectRoute',a),chunk=service.slice(a,b);
  assert(a>0&&b>a);
  assert(chunk.includes("v26ToolEventPeople({id:'v29_direct_income_people'"));
  assert(chunk.includes("table_key:'income_methods'"));
  assert(chunk.includes("name:'event_income_detail'"));
  assert(chunk.includes('const perBlock=8'));
  assert(chunk.includes("type:'horizontalBar'"));
  assert(chunk.includes("label_field:'Ingreso'"));
  assert(chunk.includes('persona/pareja, importe y forma registrada'));
});

test('follow-up de persona gana a comparativa incidental de eventos',()=>{
  const routeA=service.indexOf('const personSubject=v29RecentPersonSubject'),routeB=service.indexOf('const comparisonEvents=v285ComparisonEventNames',routeA);
  assert(routeA>0&&routeB>routeA,'la continuidad personal debe resolverse antes de la comparativa');
  const helper=service.slice(service.indexOf('function v29RecentPersonSubject'),service.indexOf('function v2852BankIncomeGraphRequest'));
  assert(helper.includes("exactEventTitlesFromPrompt(u,arr(state?.eventos))"));
  assert(helper.includes("return''; // cambio de sujeto posterior"));
  assert(helper.includes('Mantengo el sujeto de la conversación'));
});

test('transformaciones de persona a tabla o barras son locales y canónicas',()=>{
  const helper=service.slice(service.indexOf('function v29PersonPresentationIntent'),service.indexOf('function v2852BankIncomeGraphRequest'));
  assert(helper.includes("v26ToolPersonDossier({id:'v29_person_followup'"));
  assert(helper.includes('const wantsDetail='));
  assert(helper.includes('intent.wantsTable||intent.wantsDetail'));
  assert(helper.includes("v26Table('income_by_event'"));
  assert(helper.includes("v26Table('donations_by_event'"));
  assert(helper.includes("showTables.push({tool_id:dossier.id,table_key:key})"));
  assert(helper.includes("allow_equal_values:true"));
});

test('promesas de detalle y HTML crudo quedan materializados/saneados',()=>{
  assert(service.includes('function v29ContainsRawTableMarkup'));
  assert(service.includes('function v29SanitizeAnswerMarkup'));
  assert(service.includes('function v29PromisedPersonTables'));
  assert(service.includes('for(const key of v29PromisedPersonTables(final.answer,personResultForPromise))addShowTable'));
  assert(service.includes("replace(/<\\s*table\\b[\\s\\S]*?<\\s*\\/\\s*table\\s*>/gi,''"));
});

console.log(`OK ${n} pruebas v29_prod`);
