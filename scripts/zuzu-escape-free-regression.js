import fs from 'node:fs';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ai=read('services/event-ai.service.js');
const lab=read('services/zuzu-test-lab.service.js');
const route=read('routes/event-ai.routes.js');
const ui=read('public/app/features/v11-3-zuzu-analitica-libre.js');
const voice=read('public/app/features/v22-voz3-zuzu.js');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const index=read('public/index.html');
const checks=[
 ['entrada compartida exportada',/export async function runZuzuUserTurn\(input=\{\}\)\{return analyzeEventPrompt\(input\);\}/.test(ai)],
 ['ventana usa entrada compartida',/runZuzuUserTurn\(req\.body \|\| \{\}\)/.test(route)],
 ['ITV usa entrada compartida',/runZuzuUserTurn\(\{prompt:c\.prompt/.test(lab)],
 ['Gemini redacta después de CE',/PRESENTACIÓN · Gemini redacta pantalla \+ voz/.test(ai)],
 ['Gemini devuelve escrito y hablado',/written_answer/.test(ai)&&/spoken_answer/.test(ai)&&/v73FinalPresentationSchema/.test(ai)],
 ['cliente conserva respuesta escrita',/data\.spokenAnswer=String/.test(ui)&&/window\.__ceZuzuLastSpokenAnswer/.test(ui)],
 ['voz usa spokenAnswer',/ev\.detail\.spokenAnswer\|\|ev\.detail\.answer/.test(voice)],
 ['modo voz no borra artefactos visuales',!/voiceConversation\)\{data\.charts=\[\]/.test(ui)],
 ['scope named_event acepta events[0] sin perder evento',/if\(kind==='named_event'\)\{const one=event\|\|events\[0\]\|\|'';if\(one\)out\.event=one;\}/.test(ai)],
 ['scope named_events acepta event singular',/else if\(kind==='named_events'\)\{if\(events\.length\)out\.events=events;else if\(event\)out\.events=\[event\];\}/.test(ai)],
 ['contrato de acciones es estricto',/CONTRATO ESTRUCTURAL ESTRICTO/.test(ai)&&/v73ProtocolViolation/.test(ai)],
 ['presentación la decide Gemini',/gemini_presentation/.test(ai)&&/PRESENTACIÓN · ARTEFACTOS/.test(ai)],
 ['redacción oral diferenciada',/spoken_answer está pensado para ser ESCUCHADO/.test(ai)],
 ['prosa respetada',/si el usuario pide prosa, NO uses listas ni viñetas/.test(ai)],
 ['segunda llamada compacta contexto',/slice\(-6\)/.test(ai)&&/v73CompactFinalValue/.test(ai)&&/rows\.slice\(0,limit\)/.test(ai)],
 ['micrófono explícito usa Voz CE',/el botón Hablar usa directamente getUserMedia \+ Voz CE/.test(voice)&&/if\(supportsCeVoice\(\)\)\{state\.cloudFallback=true;startCloudRecognition\('user',true\);\}/.test(voice)],
 ['ITV observación sin oráculo',/ITV_OBSERVATION_MODE=true/.test(itv)&&/oracleEnabled:false/.test(itv)],
 ['ITV resultado OBSERVED',/status:'OBSERVED'/.test(lab)],
 ['build RAW4 limpia sesión anterior',/ZUZU_RUNTIME_BUILD='20260823-PRESENTACION-RAW4'/.test(ui)&&/ensureZuzuRuntimeBuild\(\)/.test(ui)],
 ['cache bust RAW4',/20260823-PRESENTACION-RAW4/.test(index)]
];
let bad=0;for(const [name,ok] of checks){console.log(`${ok?'OK':'KO'} · ${name}`);if(!ok)bad++;}if(bad){console.error(`RAW4 REGRESSION: ${bad} KO`);process.exit(1);}console.log('RAW4 REGRESSION: OK');
