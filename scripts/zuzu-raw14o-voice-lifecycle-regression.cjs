const fs=require('fs');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
const backend=fs.readFileSync('services/event-ai.service.js','utf8');
const modal=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
const index=fs.readFileSync('public/index.html','utf8');
let pass=0,fail=0;function t(n,ok){if(ok){console.log('OK · '+n);pass++;}else{console.error('KO · '+n);fail++;}}

t('build RAW14O',/RAW14O-VOICE-LIFECYCLE-FIX45/.test(voice));
t('Borra texto local se conserva',/function hasClearTextCommand[\s\S]{0,250}borra\|borrar\|borre[\s\S]{0,120}texto/.test(voice)&&/Te escucho de nuevo, '\+voiceGreetingName\(\)\+'\./.test(voice));
t('pausa humana sigue 3s',/turnCommitMs:3000/.test(voice)&&/silent>3000/.test(voice));
t('badge ya no es interruptor y rearma',/globo es un REARME/.test(voice)&&/forceAmbientRearm\(true,'clic en globo'\)/.test(voice));
t('badge sanea conversación huérfana',/state\.conversationMode&&!\$\('ceGeminiLibreOverlay'\)/.test(voice)&&/forceReturnToAmbient\(true,'clic en globo con Zuzu cerrada'\)/.test(voice));
t('modal emite opened',/controlevent:zuzu-opened/.test(modal)&&/source:'zuzu-modal'/.test(modal));
t('modal emite closed',/controlevent:zuzu-closed/.test(modal)&&/function closeModal\(\)[\s\S]{0,500}dispatchEvent/.test(modal));
t('voice escucha closed y rearma ambiente',/controlevent:zuzu-closed'[\s\S]{0,200}forceReturnToAmbient/.test(voice));
t('watchdog de overlay ausente',/overlayMissingSince/.test(voice)&&/overlay Zuzu desaparecido/.test(voice));
t('watchdog de escucha ambiental periódico',/ambientHealthTimer/.test(voice)&&/setInterval\(ambientHealthTick,2200\)/.test(voice));
t('Web Speech se recicla antes de quedar sordo',/ambientSessionMaxMs:26000/.test(voice)&&/AMBIENT_RECYCLE/.test(voice)&&/renovación preventiva Web Speech/.test(voice));
t('focus y visibility rearman ambiente',/focus ventana/.test(voice)&&/pestaña visible/.test(voice));
t('debug expone overlay y tiempos de reconocimiento',/overlayOpen:!!\$\('ceGeminiLibreOverlay'\)/.test(voice)&&/recognitionStartedAt/.test(voice)&&/recognitionLastResultAt/.test(voice));

t('schema ya no lleva input_quality/input_note',!/input_quality:inputQuality/.test(backend)&&!/required:\[\.\.\.new Set\(\['input_quality'/.test(backend));
t('guard de voz ocurre en la misma primera llamada sin campo extra',/Si INPUT_CHANNEL=voice, ANTES de elegir la tool haz internamente esta criba/.test(backend)&&/VOICE_NOISE:/.test(backend));
t('cambio radical sigue siendo válido',/Un cambio radical de evento o conversación NO es ruido por ser diferente/.test(backend));
t('ruido usa ce_conversation incoherent_input',/possible_voice_noise/.test(backend)&&/incoherent_input/.test(backend)&&/VOICE_NOISE/.test(backend));
t('parseCommand ya no depende de input assessment schema',!/v73InputAssessmentFromArgs\(calls\[0\]/.test(backend)&&/const command=trim\(calls\[0\]\.name\),raw=v73CommandCallToRaw/.test(backend));
t('traza de calidad sigue disponible',/CALIDAD ENTRADA VOZ/.test(backend)&&/v73VoiceGateAssessment/.test(backend));
t('cache RAW14O',/v22-voz3-zuzu\.js\?v=20260826-RAW14O-VOICE-LIFECYCLE/.test(index));

console.log(`\nRAW14O VOICE LIFECYCLE · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
