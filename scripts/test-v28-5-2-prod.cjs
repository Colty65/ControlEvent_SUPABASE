const fs=require('fs'),path=require('path'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const read=r=>fs.readFileSync(path.join(ROOT,r),'utf8');
let n=0;function test(name,fn){fn();n++;console.log('OK',name)}

test('identidad v28.5.2_prod',()=>{
  const v=read('app/version.js'),pv=read('public/app/version.js'),pkg=JSON.parse(read('package.json'));
  for(const s of [v,pv]){assert(s.includes("VERSION = 'v28.5.2_prod'"));assert(s.includes("VERSION_FILE = 'ControlEvent_v28.5.2_prod'"));assert(s.includes("'ControlEvent_v28.5.1_prod'"));}
  assert.equal(pkg.version,'28.5.2');
});

test('INFOEVENTO y BACKUP v28.5.2',()=>{
  assert(read('public/app/legacy/legacy-bundle-before-modules-v30.9.3.js').includes('ControlEvent_v28.5.2_prod_INFOEVENTO-'));
  for(const rel of ['public/modules/excel/backup.js','routes/export.routes.js']){const s=read(rel);assert(s.includes("BACKUP_VERSION = 'ControlEvent v28.5.2_prod'"));assert(s.includes("BACKUP_VERSION_FILE = 'ControlEvent_v28.5.2_prod'"));}
});

const s=read('services/event-ai.service.js');
test('banco aporta agregados compactos',()=>{
  for(const k of ['included_income_total','included_charge_total','justified_movement_count','unlinked_movement_count','event_window_income_total','event_window_charge_total'])assert(s.includes(k),k);
  assert(s.includes("if(detail!=='full')return 0"));
});

test('prefetch brief no manda tablas redundantes',()=>{
  assert(s.includes("detail==='brief'&&['event_dossier','event_breakdowns','event_documentation'].includes(name)"));
  assert(s.includes("if(detail==='brief')return 0;\n      if(key==='people')"));
  assert(s.includes("if(limit<=0)return null"));
});

test('opinion y profundiza ingresos+banco prefetch mínimo',()=>{
  assert(s.includes("return'income_bank'"));assert(s.includes("return'opinion'"));
  assert(s.includes("if(kind==='opinion')defs=[{id:'v2852_prefetch_dossier'"));
  assert(s.includes("else if(kind==='income_bank')defs=["));
  assert(s.includes("name:'event_people'"));assert(s.includes("name:'event_bank'"));
});

test('razonamiento prefetch usa system prompt corto',()=>{
  assert(s.includes('function v2852CompactAnalystSystemInstruction'));
  assert(s.includes('initialSystemInstruction=noToolsThisTurn?v2852CompactAnalystSystemInstruction():systemInstruction'));
});

test('graficas banco+ingresos ruta directa 0 Gemini',()=>{
  assert(s.includes('function v2852BankIncomeGraphRequest'));
  assert(s.includes('async function v2852DirectBankIncomeCharts'));
  const a=s.indexOf('if(v2852BankIncomeGraphRequest(userPrompt,conversationHistory))'),b=s.indexOf('const comparisonEvents=',a);assert(a>0&&b>a);
  const chunk=s.slice(s.indexOf('async function v2852DirectBankIncomeCharts'),s.indexOf('async function v281TryDirectRoute'));
  assert(chunk.includes("table_key:'income_methods'"));assert(chunk.includes("table_key:key"));assert(chunk.includes('include_justified_movements:wantsMovementDetail'));
});

test('movimientos justificados solo si el spec lo pide',()=>{
  assert(s.includes("if(bankTimeline&&spec?.include_justified_movements===true)"));
  const overview=s.slice(s.indexOf('function v281CanonicalOverviewChartSpecs'),s.indexOf('function v281GraphEachFollowUp'));
  assert(overview.includes('include_justified_movements:true'));
});

test('detalle bancario solo aparece cuando se pide de forma expresa',()=>{
  assert(s.includes("include_justified_movements:/\\b(detalle|movim|justific|ticket|tk\\d+|concepto)\\b/.test(p)"));
  assert(s.includes("include_justified_movements:true,unit:'€'"));
});

test('disciplina de coste: max 2, techo 1 centimo, salida menor',()=>{
  assert(s.includes("CONTROLEVENT_ZUZU_HARD_CAP_EUR||0.010"));
  assert(s.includes("num(spent?.calls)>=2"));
  assert(s.includes("e.code='ZUZU_COST_CAP'"));
  assert(s.includes("Number(process.env.CONTROLEVENT_ZUZU_MAX_OUTPUT_TOKENS)||1600"));
  assert(s.includes('for(let cycle=1;cycle<=1;cycle++)'));
});

test('auditor no paga tercera llamada',()=>{
  const a=s.indexOf("v28.5.2 · Auditor factual determinista");assert(a>0);
  const vicinity=s.slice(a-500,a+1200);assert(!vicinity.includes('Gemini corrección factual'));
});

test('traza informa control de coste',()=>{
  assert(s.includes("v28.5.2 · Control de coste"));assert(s.includes('Objetivo habitual <=0,004 €; techo 0,010 €'));
});

test('sin hardcode de casos de prueba en bloque nuevo',()=>{
  const a=s.indexOf('function v2852BankIncomeGraphRequest'),b=s.indexOf('async function v281TryDirectRoute',a),chunk=s.slice(a,b);
  for(const x of ['Cuotas y gastos corrientes 2026','746,68','INNER ENERGIA','SySA 2026','TK05'])assert(!chunk.includes(x),x);
});
console.log(`OK ${n} pruebas v28.5.2_prod`);
