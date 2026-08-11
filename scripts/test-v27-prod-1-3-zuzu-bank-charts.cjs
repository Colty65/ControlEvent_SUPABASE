#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const servicePath = path.join(root, 'services', 'event-ai.service.js');
const rendererPath = path.join(root, 'public', 'app', 'features', 'v11-3-zuzu-analitica-libre.js');
const source = fs.readFileSync(servicePath, 'utf8');
const renderer = fs.readFileSync(rendererPath, 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`No encuentro ${name}`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0, quote = '', escaped = false, lineComment = false, blockComment = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i], next = source[i + 1] || '';
    if (lineComment) { if (ch === '\n') lineComment = false; continue; }
    if (blockComment) { if (ch === '*' && next === '/') { blockComment = false; i += 1; } continue; }
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === '/' && next === '/') { lineComment = true; i += 1; continue; }
    if (ch === '/' && next === '*') { blockComment = true; i += 1; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Cuerpo incompleto de ${name}`);
}

const sandbox = { console, Date, Number, String, Set, Map, Math };
sandbox.trim = v => String(v ?? '').trim();
sandbox.text = v => String(v ?? '');
sandbox.arr = v => Array.isArray(v) ? v : [];
sandbox.norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
sandbox.round = (v,d=2) => { const p=10**d; return Math.round((Number(v)||0)*p)/p; };
sandbox.v26TableFieldMeta = (table, field) => table && table.__testSchema ? (table.__testSchema[field] || null) : null;
sandbox.v26IsChartNumericMeta = meta => !!meta && meta.numeric === true;
vm.createContext(sandbox);

[
  'semanticPromptExplicitlyRequestsCharts',
  'v272IsShortAffirmativeFollowUp',
  'v272ConversationRequestsCharts',
  'v273ChartRefinementFollowUp',
  'v273ConversationRequestsCharts',
  'v273BankTerms',
  'v273ConversationBankContext',
  'v273ExplicitHistoricalBankRequest',
  'v280BankEventWindowRequest',
  'v273PromptRequestsStaticPointLabels',
  'v273RoutingInstruction',
  'v273AnswerBlamesRenderer',
  'v27AutoChartSpecs'
].forEach(name => vm.runInContext(`${extractFunction(name)}\nthis.${name}=${name};`, sandbox));

const tests=[];
function test(name,fn){tests.push([name,fn]);}
function assert(cond,msg){if(!cond)throw new Error(msg||'assertion failed');}
function eq(a,b,msg){if(a!==b)throw new Error(`${msg||'valor inesperado'}: ${a} !== ${b}`);}
function schema(fields){const out={};for(const [name,numeric,unit=''] of fields)out[name]={numeric,unit};return out;}

const historyBankChart=[
  {user:'¿Y qué hay de la conciliación bancaria?',assistant:'Aquí tienes el Cuadre Banco del evento con sus movimientos y vínculos.'},
  {user:'Representa la conciliación bancaria en un gráfico de líneas',assistant:'Aquí tienes la gráfica de líneas con ingresos y cargos.'}
];

test('follow-up de puntos hereda intención gráfica',()=>{
  assert(sandbox.v273ConversationRequestsCharts('Pon encima de cada punto el importe, el concepto y el saldo',historyBankChart));
});
test('follow-up gráfico conserva contexto bancario',()=>{
  assert(sandbox.v273ConversationBankContext('Pon encima de cada punto el importe, el concepto y el saldo',historyBankChart));
});
test('detecta etiquetas estáticas para PDF',()=>{
  assert(sandbox.v273PromptRequestsStaticPointLabels('Pon encima de cada punto el importe, el concepto y el saldo porque es un PDF',historyBankChart));
});
test('detecta excusa de arquitectura',()=>{
  assert(sandbox.v273AnswerBlamesRenderer('Mi función es preparar la especificación técnica y la plataforma ControlEvent debería representarla.'));
});
test('routing prioriza event_bank',()=>{
  const hint=sandbox.v273RoutingInstruction('Representa la conciliación bancaria en un gráfico de líneas',historyBankChart);
  assert(/event_bank/.test(hint),'debe citar event_bank');
  assert(/reconciliation_timeline/.test(hint),'debe citar reconciliation_timeline');
});
test('histórico explícito permite timeline histórico',()=>{
  assert(sandbox.v273ExplicitHistoricalBankRequest('Quiero ver todo el histórico de la cuenta desde el principio'));
  assert(!sandbox.v273ExplicitHistoricalBankRequest('Quiero los movimientos bancarios de este evento'));
});

const results=[
  {id:'dossier',ok:true,name:'event_dossier',tables:[
    {key:'economics_chart',title:'Economía',rows:[{Indicador:'Ingresos',Valor:1000},{Indicador:'Compras',Valor:800}],__testSchema:schema([['Indicador',false],['Valor',true,'€']])}
  ]},
  {id:'bank',ok:true,name:'event_bank',tables:[
    {key:'reconciliation_timeline',title:'Conciliación bancaria',rows:[
      {Momento:'14/07 10:00',Tipo:'INGRESO',Movimiento:110,'Saldo bancario del periodo':3486.54,'Impacto bancario acumulado':110,Concepto:'TRANSFERENCIA A'},
      {Momento:'15/07 11:00',Tipo:'CARGO',Movimiento:-84,'Saldo bancario del periodo':3402.54,'Impacto bancario acumulado':26,Concepto:'COMPRA B'}
    ],__testSchema:schema([['Momento',false],['Tipo',false],['Movimiento',true,'€'],['Saldo bancario del periodo',true,'€'],['Impacto bancario acumulado',true,'€'],['Concepto',false]])}
  ]},
  {id:'timeline',ok:true,name:'event_bank_timeline',tables:[
    {key:'balance_timeline',title:'Histórico bancario',rows:[
      {Momento:'01/01',Tipo:'INGRESO','Saldo bancario del periodo':2000,'Impacto bancario acumulado':10},
      {Momento:'02/01',Tipo:'CARGO','Saldo bancario del periodo':1900,'Impacto bancario acumulado':-90}
    ],__testSchema:schema([['Momento',false],['Tipo',false],['Saldo bancario del periodo',true,'€'],['Impacto bancario acumulado',true,'€']])}
  ]}
];

test('banco prioriza reconciliation_timeline frente a histórico',()=>{
  const specs=sandbox.v27AutoChartSpecs(results,'Representa la conciliación bancaria en un gráfico de líneas',true,5,{bankContext:true});
  assert(specs.length>0);
  eq(specs[0].table_key,'reconciliation_timeline');
  eq(specs[0].value_field,'Saldo bancario del periodo');
});
test('etiquetas estáticas se incorporan al spec canónico',()=>{
  const specs=sandbox.v27AutoChartSpecs(results,'Pon encima de cada punto el importe, el concepto y el saldo',true,1,{bankContext:true,staticPointLabels:true});
  eq(specs[0].table_key,'reconciliation_timeline');
  eq(JSON.stringify(specs[0].point_label_fields),JSON.stringify(['Movimiento','Concepto','Saldo bancario del periodo']));
});
test('event_bank expone timeline de conciliación',()=>{
  const fn=extractFunction('v261EventBankTool');
  assert(fn.includes("v26Table('reconciliation_timeline'"),'falta reconciliation_timeline');
  assert(fn.includes("x?.included!==false"),'debe usar movimientos incluidos');
  assert(fn.includes("'Saldo bancario del periodo'"),'debe calcular saldo por punto');
});
test('renderer tiene modo PDF con etiquetas y tramos',()=>{
  assert(renderer.includes('function detailedLineChartHtml'),'falta renderer detallado');
  assert(renderer.includes('staticPointLabels===true'),'falta activación de etiquetas estáticas');
  assert(renderer.includes('segmentSize=8'),'falta segmentación legible');
  assert(renderer.includes('Movimientos '+"'"+'+(seg.start+1)'),'falta encabezado de tramos');
});
test('producción no contiene hardcode de casos de prueba nuevos',()=>{
  const newBlock=source.slice(source.indexOf('function v273ChartRefinementFollowUp'),source.indexOf('function semanticPromptRequestsTotal'));
  ['FUNCION 2025','SySA 2026','Pocholo','Carmelo'].forEach(v=>assert(!newBlock.includes(v),`hardcode detectado: ${v}`));
});

let passed=0;
for(const [name,fn] of tests){
  try{fn();passed+=1;}
  catch(error){console.error(`KO · ${name}: ${error.message}`);process.exitCode=1;}
}
if(!process.exitCode)console.log(`OK ${passed} pruebas v27_prod_1.3: ${tests.map(x=>x[0]).join(' · ')}`);
