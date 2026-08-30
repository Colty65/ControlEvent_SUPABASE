const fs=require('fs');
const s=fs.readFileSync('services/event-ai.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
let ok=0,ko=0;function t(n,c){if(c){console.log('OK',n);ok++;}else{console.error('KO',n);ko++;}}
t('export usa agente P1.1',/runZuzuVNextUserTurn[\s\S]{0,1800}runZuzuVNextP11Agent/.test(s));
t('P1.1 usa function calling nativo',/function vnextP11Tools\(\)/.test(s)&&/tools=vnextP11Tools\(\)/.test(s));
t('P1.1 conserva contratos tipados',/person_income_status/.test(s)&&/event_income_status/.test(s)&&/event_income_lines/.test(s));
t('P1.1 una sola IA factual y cierre local',/one-Interaction local close/.test(s)&&/hadTools\?'':\(payloadId\|\|currentPrev\)/.test(s));
t('sin Vale seguimos en P1.1',!s.slice(s.indexOf('function vnextP11Tools'),s.indexOf('export async function runZuzuVNextUserTurn')).includes("'Vale, seguimos.'"));
t('tool query_ce resuelve con ejecutor P1',/name==='query_ce'\)result=await vnextP1ExecuteData/.test(s));
t('mote La Estercita ejemplo a person_profile',/La Estercita[\s\S]{0,100}person_profile/.test(s));
t('pago persona usa person_income_status',/el primo[\s\S]{0,140}person_income_status/.test(s));
t('pendientes usa event_income_status',/quién queda Pendiente[\s\S]{0,130}event_income_status/.test(s));
t('ingresos uno a uno usa event_income_lines',/ingresos uno por uno[\s\S]{0,100}event_income_lines/.test(s));
t('UI identifica P1.1',/VNext P1\.1/.test(ui));
console.log(`TOTAL ${ok+ko} · OK ${ok} · KO ${ko}`);process.exitCode=ko?1:0;
