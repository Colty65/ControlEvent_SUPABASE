import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ai=read('services/event-ai.service.js');
const lab=read('services/zuzu-test-lab.service.js');
const route=read('routes/event-ai.routes.js');
const ui=read('public/app/features/v11-3-zuzu-analitica-libre.js');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const index=read('public/index.html');
const checks=[
 ['entrada compartida exportada',/export async function runZuzuUserTurn\(input=\{\}\)\{return analyzeEventPrompt\(input\);\}/.test(ai)],
 ['ventana usa entrada compartida',/runZuzuUserTurn\(req\.body \|\| \{\}\)/.test(route)],
 ['ITV usa entrada compartida',/runZuzuUserTurn\(\{prompt:c\.prompt/.test(lab)],
 ['Gemini redacta tras datos CE',/ESCAPE LIBRE · Gemini redacta respuesta FINAL/.test(ai)],
 ['respuesta final se guarda literal',/gemini_final_answer:rawFinal\.answer/.test(ai)&&/answer=rawFinal\.answer/.test(ai)],
 ['cliente no reescribe answer',/ESCAPE LIBRE: respuesta Gemini literal/.test(ui)&&!/data\.answer=withoutGeminiLabel\(ensureZuzuUserPreface/.test(ui)],
 ['scope named_event acepta events[0] sin perder evento',/if\(kind==='named_event'\)\{const one=event\|\|events\[0\]\|\|'';if\(one\)out\.event=one;\}/.test(ai)],
 ['scope named_events acepta event singular',/else if\(kind==='named_events'\)\{if\(events\.length\)out\.events=events;else if\(event\)out\.events=\[event\];\}/.test(ai)],
 ['capacidades people/person explicadas',/people=asistencia\/listado de personas DENTRO DE UN ÚNICO evento/.test(ai)&&/person admite all_events o named_event/.test(ai)],
 ['redacción final respeta forma del usuario',/RESPETA LITERALMENTE las instrucciones de forma del CURRENT_USER/.test(ai)&&/si pide prosa, escribe prosa sin viñetas ni tabla/.test(ai)],
 ['CE no inyecta resumen narrativo en redacción final',/resultado_ce:\{status,execution:v73RawFinalExecution\(execution\)/.test(ai)],
 ['respuesta exterior oculta tablas y gráficas CE',/PRESENTACIÓN CE OCULTA/.test(ai)&&/warnings:\[\],charts:\[\],tables:\[\],files:\[\],provider:'gemini-zuzu-ledger-escape-free'/.test(ai)],
 ['replay también muestra una sola voz',/provider:'zuzu-ledger-server-replay'/.test(ai)&&/warnings:\[\],charts:\[\],tables:\[\],files:\[\],provider:'zuzu-ledger-server-replay'/.test(ai)],
 ['ITV observación sin oráculo',/ITV_OBSERVATION_MODE=true/.test(itv)&&/oracleEnabled:false/.test(itv)],
 ['ITV resultado OBSERVED',/status:'OBSERVED'/.test(lab)],
 ['ITV no evalúa runSaved',!/runSavedZuzuTestCase[\s\S]{0,5000}validatePaidCase\(/.test(lab)],
 ['cache bust RAW2',/20260823-ESCAPE-LIBRE-RAW2/.test(index)]
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK':'KO'} · ${name}`);if(!ok)bad++;}if(bad){console.error(`ESCAPE FREE REGRESSION: ${bad} KO`);process.exit(1);}console.log('ESCAPE FREE REGRESSION: OK');
