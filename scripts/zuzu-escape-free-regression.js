import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ai=read('services/event-ai.service.js');
const lab=read('services/zuzu-test-lab.service.js');
const route=read('routes/event-ai.routes.js');
const ui=read('public/app/features/v11-3-zuzu-analitica-libre.js');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const checks=[
 ['entrada compartida exportada',/export async function runZuzuUserTurn\(input=\{\}\)\{return analyzeEventPrompt\(input\);\}/.test(ai)],
 ['ventana usa entrada compartida',/runZuzuUserTurn\(req\.body \|\| \{\}\)/.test(route)],
 ['ITV usa entrada compartida',/runZuzuUserTurn\(\{prompt:c\.prompt/.test(lab)],
 ['Gemini redacta tras datos CE',/ESCAPE LIBRE · Gemini redacta respuesta FINAL/.test(ai)],
 ['respuesta final se guarda literal',/gemini_final_answer:rawFinal\.answer/.test(ai)&&/answer=rawFinal\.answer/.test(ai)],
 ['cliente no reescribe answer',/ESCAPE LIBRE: respuesta Gemini literal/.test(ui)&&!/data\.answer=withoutGeminiLabel\(ensureZuzuUserPreface/.test(ui)],
 ['ITV observación sin oráculo',/ITV_OBSERVATION_MODE=true/.test(itv)&&/oracleEnabled:false/.test(itv)],
 ['ITV resultado OBSERVED',/status:'OBSERVED'/.test(lab)],
 ['ITV no evalúa runSaved',!/runSavedZuzuTestCase[\s\S]{0,5000}validatePaidCase\(/.test(lab)],
 ['cache bust escape libre',/20260823-ESCAPE-LIBRE-1/.test(read('public/index.html'))]
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK':'KO'} · ${name}`);if(!ok)bad++;}if(bad){console.error(`ESCAPE FREE REGRESSION: ${bad} KO`);process.exit(1);}console.log('ESCAPE FREE REGRESSION: OK');
