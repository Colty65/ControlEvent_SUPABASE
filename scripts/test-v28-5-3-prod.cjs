const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
let n=0;function test(name,fn){fn();n++;console.log('OK',name)}
const s=read('services/event-ai.service.js');

test('identidad v28.5.3_prod',()=>{
  for(const rel of ['app/version.js','public/app/version.js']){
    const v=read(rel);assert(v.includes("VERSION = 'v28.5.3_prod'"));assert(v.includes("VERSION_FILE = 'ControlEvent_v28.5.3_prod'"));assert(v.includes("'ControlEvent_v28.5.2_prod'"));
  }
  assert.equal(JSON.parse(read('package.json')).version,'28.5.3');
});

test('INFOEVENTO y BACKUP v28.5.3',()=>{
  assert(read('public/app/legacy/legacy-bundle-before-modules-v30.9.3.js').includes('ControlEvent_v28.5.3_prod_INFOEVENTO-'));
  const er=read('routes/export.routes.js');assert(er.includes("BACKUP_VERSION = 'ControlEvent v28.5.3_prod'"));assert(er.includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.5.3_prod'"));
});

test('analista prefetch usa texto plano y no esquema JSON',()=>{
  const a=s.indexOf('async function v2853CallPlainAnalyst'),b=s.indexOf('function v2853FallbackAnswer',a),chunk=s.slice(a,b);
  assert(a>0&&b>a);assert(chunk.includes("responseMimeType:'text/plain'"));assert(!chunk.includes('responseSchema'));assert(!chunk.includes('v261FinalSchema()'));
});

test('analista prefetch es una sola llamada sin herramientas',()=>{
  const a=s.indexOf('async function v2853RunPrefetchedAnalyst'),b=s.indexOf('function v281CanonicalOverviewChartSpecs',a),chunk=s.slice(a,b);
  assert(chunk.includes('v2853CallPlainAnalyst'));assert(!chunk.includes('v261CallInteraction'));assert(!chunk.includes('tools='));
});

test('opinión, análisis, ingresos+banco y ejecutivo entran por prefetch',()=>{
  assert(s.includes("return'income_bank'"));assert(s.includes("return'opinion'"));assert(s.includes("return'executive'"));assert(s.includes("return'analysis'"));
  const a=s.indexOf('const prefetchedAnalyst=await v2853RunPrefetchedAnalyst'),b=s.indexOf('runZuzuV261InteractionsAgent',a);assert(a>0&&b>a);
});

test('fallback CE impide página roja en analítica',()=>{
  assert(s.includes('function v2853FallbackAnswer'));assert(s.includes('v28.5.3 · Respaldo CE'));
  assert(s.includes('v28.5.3 · Respaldo conversacional'));
});

test('detalle bancario de presentación es 0 Gemini',()=>{
  const a=s.indexOf('añadir/mostrar detalle de movimientos bancarios'),b=s.indexOf('banco + ingresos en gráfica',a),chunk=s.slice(a,b);
  assert(a>0&&b>a);assert(chunk.includes('v283DirectBankReport'));assert(!chunk.includes('Gemini'));
});

test('gráficas banco+ingresos siguen deterministas',()=>{
  assert(s.includes('async function v2852DirectBankIncomeCharts'));
  const a=s.indexOf('async function v2852DirectBankIncomeCharts'),b=s.indexOf('async function v281TryDirectRoute',a),chunk=s.slice(a,b);
  assert(chunk.includes("table_key:'income_methods'"));assert(chunk.includes("table_key:key"));
});

test('primera llamada Interactions no se bloquea por estimación',()=>{
  const a=s.indexOf('async function v261CallInteraction'),b=s.indexOf('function v261PreviousIdFailure',a),chunk=s.slice(a,b);
  assert(chunk.includes('if(num(spent?.calls)>=1&&num(spent?.costEurApprox)+num(predicted?.costEurApprox)>hardCap)'));
  assert(!chunk.includes('if(num(spent?.costEurApprox)+num(predicted?.costEurApprox)>hardCap)'));
});

test('errores de coste no se redactan para usuario en la nueva ruta',()=>{
  assert(!s.includes('Control de coste Zuzu: una nueva llamada podría superar'));
  assert(!s.includes('Control de coste Zuzu: se alcanzó el máximo'));
});

test('Pte.Compra conserva semántica canónica',()=>{
  assert(s.includes("un registro de compra con Ticket/Otros gastos vacío es Pte.Compra"));
  assert(s.includes("purchases_pending"));assert(s.includes("'Pte.Compra'"));
});

test('sin hardcode de pruebas en bloque v2853',()=>{
  const a=s.indexOf('// v28.5.3_prod · ANALISTA DE TEXTO PLANO'),b=s.indexOf('function v281CanonicalOverviewChartSpecs',a),chunk=s.slice(a,b);
  for(const x of ['Cuotas y gastos corrientes 2026','746,68','INNER ENERGIA','SySA 2026','TK05'])assert(!chunk.includes(x),x);
});

console.log(`OK ${n} pruebas v28.5.3_prod`);
