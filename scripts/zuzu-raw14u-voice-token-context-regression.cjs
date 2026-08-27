const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const svc=fs.readFileSync(path.join(root,'services','event-ai.service.js'),'utf8');
const voice=fs.readFileSync(path.join(root,'public','app','features','v22-voz3-zuzu.js'),'utf8');
const index=fs.readFileSync(path.join(root,'public','index.html'),'utf8');
let ok=0,ko=0;
function t(name,cond){if(cond){ok++;console.log('OK · '+name)}else{ko++;console.error('KO · '+name)}}
function phraseCount(){const a=voice.indexOf('var ENTERTAINMENT_PHRASES=['),b=voice.indexOf('\n  ];',a);if(a<0||b<0)return 0;return (voice.slice(a,b).match(/^\s*'(?:[^'\\]|\\.)*',?\s*$/gm)||[]).length;}
function phraseUnique(){const a=voice.indexOf('var ENTERTAINMENT_PHRASES=['),b=voice.indexOf('\n  ];',a);const p=(voice.slice(a,b).match(/^\s*'(?:[^'\\]|\\.)*',?\s*$/gm)||[]).map(x=>x.trim());return new Set(p).size===p.length;}

t('build RAW14U voz',voice.includes('RAW14U-VOICE-GUARD-CAROUSEL'));
t('caché index entretenimiento contextual',index.includes('v22-voz3-zuzu.js?v=20260827-RAW14U-CONTEXTUAL-ENTERTAINMENT'));
t('carrusel tiene exactamente 100 frases nuevas',phraseCount()===100);
t('las 100 frases no se repiten en fuente',phraseUnique());
t('storage v44 fuerza mazo limpio',voice.includes('entertainment_deck_v44')&&voice.includes('entertainment_used_v44'));
t('entretenimiento empieza a los 3 s',voice.includes('entertainmentInitialDelayMs:3000'));
t('entretenimiento espaciado y limitado',voice.includes('entertainmentIntervalMs:6000')&&voice.includes('entertainmentMaxPerRequest:2'));
t('siguiente frase se agenda solo si queda cupo',voice.includes('state.entertainmentCount<state.entertainmentMaxPerRequest')&&voice.includes('scheduleEntertainment(state.entertainmentIntervalMs||6000)'));
t('respuesta espera a que termine frase en curso',voice.includes('if(state.entertainmentSpeaking){state.pendingAnswerTimer=setTimeout(deliver,60);return;}'));
t('variables usuario/nombre',voice.includes('usuario:voiceAddressName(false)')&&voice.includes('nombre:voiceGreetingName()'));
t('variables temporales locales',voice.includes('mes_actual:')&&voice.includes('diasemana:')&&voice.includes('ano_actual:')&&voice.includes('hora_actual:')&&voice.includes('fecha_hoy:')&&voice.includes('momento_dia:'));
t('barge-in usa 5 alternativas',voice.includes('r.maxAlternatives=5;state.bargeRecognition'));
t('reconocimiento normal usa 5 alternativas',voice.includes("r.maxAlternatives=5;if(state.localSpeechReady"));
t('barge-in tolera un error corto de ASR',voice.includes('controlEditDistance')&&voice.includes('isBargeWord'));
t('Perdona Zuzu limpia la cola Zuzu',voice.includes('stripLeadingVoiceControl(bargeTail(t))'));
t('residuo zu/zuzu se descarta localmente',voice.includes('voiceControlResidueInfo(text)')&&voice.includes('residuo local de control descartado'));
t('sí/no/ok cortos siguen siendo respuestas válidas',voice.includes('function meaningfulShortReply')&&voice.includes('si|no|ok|vale'));
t('cuarentena tras residuo evita disparo precoz',voice.includes('voiceResidueQuarantineMs:4200')&&voice.includes('fragmento corto tras residuo'));

t('normalizador acepta field_name',svc.includes('x?.field||x?.field_name||x?.filter_field'));
t('guard de cambio de evento exige anclaje actual',svc.includes('sin una referencia EVENT anclada en CURRENT_USER')&&svc.includes("semanticEntityScore(p,target.nombre,'event')"));
t('guard máximo/mínimo entre eventos',svc.includes('function v73CrossEventSuperlativeViolation')&&svc.includes('scope all_events'));
t('guard de orden explícito',svc.includes('function v73RequestedSortViolation')&&svc.includes('no prometas una ordenación'));
t('guard de reconsulta de recuerdo usa matched turn',svc.includes('function v73RecallFollowupViolation')&&svc.includes('matched_turn_id'));
t('regla narrativa de redacción',svc.includes('REDACCIÓN / RELATO / CRÓNICA'));
t('kernel no usa fields para redacción de evento',svc.includes('REDACCIÓN DE EVENTO')&&svc.includes('sin usar fields para reducir la fuente'));
t('contexto compilador reducido a 4 refs',svc.includes("recentRefs=arr(session?.recentTurns).slice(-4)"));
t('diálogo compilador reducido a 2 turnos',svc.includes("recentDialogue=arr(session?.recentTurns).slice(-2)"));
t('historia compilador se limita a 5 candidatos',svc.includes('hist=arr(historyCandidates).slice(0,5)'));
t('final solo arrastra 3 turnos recientes',svc.includes("function v73RawFinalRecentTurns(session={}){\n  return arr(session?.recentTurns).slice(-3)"));
t('muestra final limitada a 12 filas',svc.includes('slice(0,12),limit=12'));
t('recuerdo actual no carga histórico DB',svc.includes('currentConversationRecall=v73IsCurrentConversationRecallPrompt')&&svc.includes("isRecallPrompt(userPrompt)&&!currentConversationRecall"));
t('resumen actual compila local',svc.includes('TOKEN BUDGET · COMPILACIÓN LOCAL')&&svc.includes("conversation_summary"));
t('acuse simple compila local',svc.includes('v73IsSimpleAcknowledgement')&&svc.includes('Acuse breve: CE evita la primera llamada Gemini'));
t('turnos locales también evitan presentación Gemini',svc.includes('if(compiled.local_compile||execution?.local_authoritative_presentation===true)')&&svc.includes("'local_memory_literal':'local_token_budget'"));
t('arquitectura RAW14U',/RAW14(?:U · TOKEN BUDGET \+ CONTEXTO ESTRICTO|V · DISCOURSE \+ MEMORY FOCUS \+ EVENT COVERAGE)/.test(svc));
console.log(`RAW14U · ${ok}/${ok+ko} comprobaciones OK`);if(ko)process.exit(1);
