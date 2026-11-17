const fs=require('fs');
const svc=fs.readFileSync('services/event-ai.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK ',n)}else{ko++;console.error('KO ',n)}}
t('THEN→NOW evita compare_events',/V5 P13 · MEMORY THEN→NOW/.test(svc)&&/Replay factual/.test(svc)&&/0 compare_events/.test(svc));
t('THEN→NOW conserva memoryComparison',/memoryComparison:mc/.test(svc)&&/historicalAnswer:trim\(prevMem\.answer/.test(svc)&&/currentAnswer:current/.test(svc));
t('afirmación acepta sugerencia de refresco',/v5P13AffirmativeCue/.test(svc)&&/memoryPresentation\?\.canRefresh/.test(svc));
t('evidencia memory exige sujeto acreditado',/v5P13EvidenceMentionsSubject/.test(svc)&&/turnRows\.filter\(r=>personHint\?v5P13EvidenceMentionsSubject/.test(svc));
t('seguimiento de recuerdo usa persona del C activo',/trim\(memoryCtx\?\.person\)\|\|v4BrainLiteRecallTopic/.test(svc));
t('detalle pendiente persona usa dossier global',/PERSON PENDING INCOME/.test(svc)&&/income_pending/.test(svc));
t('respuesta pendiente lista eventos de la persona',/income_pending_by_event/.test(svc)&&/pendientes de ingreso en/.test(svc));
t('otra gráfica cicla registro real',/v5P13NextViewCue/.test(svc)&&/registry\[\(Math\.max/.test(svc));
t('una de cada tipo materializa registro real',/v5P11AllViewsCue/.test(svc)&&/for\(const view of v5P9ViewRegistry\(\)\)/.test(svc));
t('UI muestra Recuerdo y Hoy',/ce-ai-memory-compare/.test(ui)&&/🕰 Recuerdo/.test(ui)&&/📍 Hoy/.test(ui));
t('aislamiento iOS usa lease y BroadcastChannel',/controlevent:zuzu:tab-lease:v2/.test(ui)&&/controlevent:zuzu:tab-session:v2/.test(ui));
t('runtime FIX36 P13',/FIX36-P13-MEMORY-GRAPH-TAB-HARDEN|FIX37-P14-SCOPE-AUTHORITY/.test(ui));
// NHC: no se admiten casos concretos de las conversaciones que motivaron P13.
const block=svc.slice(svc.indexOf('function v5P13MemoryRefreshCue'),svc.indexOf('function v4BrainLitePlan'));
t('P13 sin personas/eventos de prueba hard-code',!/(Carmelo|Cordo|Pana|Angel T[eé]llez|FUNCION 2026|SySA 2026)/i.test(block));
console.log(`P13 ${ok}/${ok+ko} OK`);process.exitCode=ko?1:0;
