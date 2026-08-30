const fs=require('fs');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
const db=fs.readFileSync('lib/supabase-normalized.js','utf8');
const index=fs.readFileSync('public/index.html','utf8');
let ok=0,ko=0;function t(name,cond){if(cond){ok++;console.log('OK ',name);}else{ko++;console.log('KO ',name);}}
t('export usa agente P1.2',/runZuzuVNextUserTurn[\s\S]{0,2200}runZuzuVNextP12Agent/.test(svc));
t('P1.2 arranca estado y Gemini en paralelo',/const statePromise=.*getState\(\{parallel:true\}\)/.test(svc)&&/runZuzuVNextP12Agent/.test(svc));
t('lectura Supabase paralela solo bajo flag',/function stateFromDbParallel/.test(db)&&/options\.parallel === true/.test(db)&&/Promise\.all\(\[\s*basePromise, aliasPromise, snapshotPromise, metaPromise, imagesPromise/.test(db));
t('P1.2 usa native function calling sin schema JSON final',/plainTextResponse:true/.test(svc)&&/minOutputTokens:256/.test(svc)&&/maxCalls:1/.test(svc));
t('P1.2 mantiene contratos de ingresos',/person_income_status/.test(svc)&&/event_income_status/.test(svc)&&/event_income_lines/.test(svc));
t('adaptador servidor convierte filas objeto a arrays UI',/function vnextP12UiTable/.test(svc)&&/columns\.map\(c=>text\(row\?\.\[c\]\)\)/.test(svc));
t('renderer cliente tolera filas objeto y arrays',/var cells=Array\.isArray\(r\)\?r:cols\.map/.test(ui));
t('UI identifica P1.2',/VNext P1\.2/.test(ui)&&/trabajan en paralelo/.test(ui));
t('cache bust P1.2',/VNEXT-P12-SCREEN-PARALLEL/.test(index)&&/VNEXT-P12-SCREEN-PARALLEL/.test(ui));
t('latencia registra espera real de estado',/espera estado tras IA=\$\{stateWaitMs\} ms/.test(svc)&&/stateWaitAfterModelMs:stateWaitMs/.test(svc));
t('sin Semantic Core ni Memory Gate en P1.2',/VNEXT P1\.2 · PARALLEL FAST PATH[\s\S]{0,5000}sin Semantic Core, sin Memory Gate/.test(svc));
t('soft failure P1.2 conserva conversación',/provider:'zuzu-vnext-p12-soft-failure'/.test(svc));
console.log(`TOTAL ${ok+ko} · OK ${ok} · KO ${ko}`);process.exit(ko?1:0);
