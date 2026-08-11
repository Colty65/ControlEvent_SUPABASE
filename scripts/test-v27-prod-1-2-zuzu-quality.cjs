#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.join(__dirname, '..', 'services', 'event-ai.service.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`No encuentro ${name} en event-ai.service.js`);
  const bodyStart = source.indexOf('{', start);
  if (bodyStart < 0) throw new Error(`No encuentro cuerpo de ${name}`);
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

const sandbox = {
  console,
  Date,
  Number,
  String,
  Set,
  Map,
  Math,
};
sandbox.trim = v => String(v ?? '').trim();
sandbox.text = v => String(v ?? '');
sandbox.arr = v => Array.isArray(v) ? v : [];
sandbox.norm = v => String(v ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
sandbox.v26TableFieldMeta = (table, field) => table && table.__testSchema ? (table.__testSchema[field] || null) : null;
sandbox.v26IsChartNumericMeta = meta => !!meta && meta.numeric === true;
vm.createContext(sandbox);

[
  'parseCeDateToIso',
  'semanticPromptExplicitlyRequestsCharts',
  'v272IsShortAffirmativeFollowUp',
  'v272ConversationRequestsCharts',
  'v273ChartRefinementFollowUp',
  'v273PromptRequestsStaticPointLabels',
  'v272AnswerClaimsChart',
  'v272DateOnly',
  'v272DateMs',
  'v272PeriodRelation',
  'v280BankEventWindowRequest',
  'v27AutoChartSpecs',
].forEach(name => vm.runInContext(`${extractFunction(name)}\nthis.${name}=${name};`, sandbox));

const tests = [];
function test(name, fn) { tests.push([name, fn]); }
function assert(condition, message) { if (!condition) throw new Error(message || 'assertion failed'); }
function eq(actual, expected, message) { if (actual !== expected) throw new Error(`${message || 'valor inesperado'}: ${actual} !== ${expected}`); }

// Fechas: formatos reales y validación de calendario, sin reglas ligadas a un evento concreto.
test('fecha ISO', () => eq(sandbox.v272DateOnly('2026-08-10'), '2026-08-10'));
test('fecha ES /', () => eq(sandbox.v272DateOnly('10/08/2026'), '2026-08-10'));
test('fecha ES -', () => eq(sandbox.v272DateOnly('10-08-2026'), '2026-08-10'));
test('fecha ISO datetime', () => eq(sandbox.v272DateOnly('2026-08-10T15:15:00Z'), '2026-08-10'));
test('fecha calendario inválida => unknown', () => eq(sandbox.v272PeriodRelation('31/02/2026','02/03/2026','2026-01-01','2026-12-31').status, 'unknown'));
test('solape real', () => eq(sandbox.v272PeriodRelation('15/08/2025','08/09/2025','2020-02-24','2026-07-28').status, 'overlap'));
test('sin solape', () => eq(sandbox.v272PeriodRelation('01/01/2027','03/01/2027','2020-02-24','2026-07-28').status, 'disjoint'));
test('fecha no interpretable => unknown', () => eq(sandbox.v272PeriodRelation('fecha desconocida','03/01/2027','2020-02-24','2026-07-28').status, 'unknown'));

// Continuidad: una afirmación corta solo hereda intención gráfica si el turno anterior la contiene.
test('SI hereda gráfica', () => assert(sandbox.v272ConversationRequestsCharts('SI', [{assistant:'¿Quieres que te genere una gráfica con ese desglose?'}]) === true));
test('SI no inventa gráfica', () => assert(sandbox.v272ConversationRequestsCharts('SI', [{assistant:'¿Quieres que te explique la diferencia?'}]) === false));
test('petición directa gráfica', () => assert(sandbox.v272ConversationRequestsCharts('Dame una gráfica de los datos principales', []) === true));
test('detecta promesa gráfica', () => assert(sandbox.v272AnswerClaimsChart('Aquí tienes una gráfica que desglosa los ingresos y compras.') === true));

function schema(fields) {
  const out = {};
  for (const [name, numeric, unit=''] of fields) out[name] = {numeric, unit};
  return out;
}
const results = [
  {
    id:'dossier', ok:true, name:'event_dossier', tables:[
      {key:'income_attention', title:'Ingresos que merecen atención', chartable:false, rows:[{Persona:'A',Personas:0},{Persona:'B',Personas:2}], __testSchema:schema([['Persona',false],['Personas',true,'personas']])},
      {key:'economics_chart', title:'Economía', rows:[{Indicador:'Ingresos',Valor:2860},{Indicador:'Compras',Valor:2082.52},{Indicador:'Saldo',Valor:777.48}], __testSchema:schema([['Indicador',false],['Valor',true,'€']])},
      {key:'attendance_chart', title:'Asistencia', rows:[{Indicador:'Socios',Valor:27},{Indicador:'No socios',Valor:2}], __testSchema:schema([['Indicador',false],['Valor',true,'personas']])}
    ]
  },
  {
    id:'bank', ok:true, name:'event_bank_timeline', tables:[
      {key:'balance_timeline', title:'Cronología bancaria', rows:[
        {Momento:'01/08', 'Saldo bancario del periodo':1200, 'Impacto bancario acumulado':-84, Tipo:'CARGO'},
        {Momento:'02/08', 'Saldo bancario del periodo':1310, 'Impacto bancario acumulado':26, Tipo:'INGRESO'}
      ], __testSchema:schema([['Momento',false],['Saldo bancario del periodo',true,'€'],['Impacto bancario acumulado',true,'€'],['Tipo',false]])}
    ]
  }
];

test('gráfica general prioriza economía', () => {
  const s = sandbox.v27AutoChartSpecs(results, 'Dame una gráfica de los datos más importantes', true, 5);
  assert(s.length > 0, 'debe producir gráficos');
  eq(s[0].table_key, 'economics_chart');
  assert(!s.some(x => x.table_key === 'income_attention'), 'income_attention no debe graficarse');
});
test('saldo bancario prioriza timeline y saldo real', () => {
  const s = sandbox.v27AutoChartSpecs(results, 'Dame una gráfica del saldo bancario', true, 5);
  eq(s[0].table_key, 'balance_timeline');
  eq(s[0].value_field, 'Saldo bancario del periodo');
});
test('impacto bancario usa variación base cero', () => {
  const s = sandbox.v27AutoChartSpecs(results, 'Dame una gráfica del impacto de los movimientos del evento', true, 5);
  eq(s[0].table_key, 'balance_timeline');
  eq(s[0].value_field, 'Impacto bancario acumulado');
});
test('follow-up gráfico inferido limita a una visualización', () => {
  const s = sandbox.v27AutoChartSpecs(results, 'SI', true, 1);
  eq(s.length, 1);
  eq(s[0].table_key, 'economics_chart');
});

let passed = 0;
for (const [name, fn] of tests) {
  try { fn(); passed += 1; }
  catch (error) {
    console.error(`KO · ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log(`OK ${passed} pruebas: ${tests.map(x=>x[0]).join(' · ')}`);
