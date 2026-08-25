const fs=require('fs');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
const index=fs.readFileSync('public/index.html','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}

t('build RAW14M VOICE ENGINE',/RAW14M-VOICE-ENGINE-FIX43/.test(voice));
t('saludo usa nombre del usuario logado y no un nombre hard-code',/function voiceGreetingName\(\)[\s\S]{0,500}u\.nombre[\s\S]{0,500}identificacion/.test(voice)&&/Hola, '\+name\+'\. ¿Tienes ganas de que hablemos\? Pregúntame algo\./.test(voice));
t('wake abre Zuzu antes del saludo local',/function openZuzuOnly\(\)[\s\S]{0,600}ControlEventV113ZuzuAnalitica\.open[\s\S]{0,350}speakLocalGreeting/.test(voice));
t('saludo local silencia ambos motores para no oírse a sí mismo',/function speakLocalControl[\s\S]{0,220}pauseCloudListening\(\);stopRecognition\(\);stopBarge\(\)/.test(voice));
t('Borra texto es comando local tolerante a borrar y borra el texto',/function hasClearTextCommand[\s\S]{0,250}borra\|borrar\|borre[\s\S]{0,120}texto/.test(voice));
t('Borra texto limpia solo buffer/prompt del turno',/function clearDraftBuffer\(\)[^\n]*turnPrefix=''[^\n]*turnSession=''[^\n]*setPrompt\(''\)/.test(voice));
t('Borra texto responde localmente con usuario y vuelve a escuchar',/Te escucho de nuevo, '\+voiceGreetingName\(\)\+'\./.test(voice)&&/function clearTextAndListen[\s\S]{0,600}startUser\(''\)/.test(voice));
t('Web Speech intercepta Borra texto antes de escribir/enviar',/function handleUserText\(text\)\{if\(!text\)return;if\(hasClearTextCommand\(text\)\)\{clearTextAndListen\(\);return;\}/.test(voice));
t('Voz CE cloud intercepta Borra texto antes de componer',/if\(hasClearTextCommand\(text\)\)\{clearTextAndListen\(\);return text;\}/.test(voice));
t('fin real de pregunta espera tres segundos',/turnCommitMs:3000/.test(voice)&&/state\.turnCommitMs-elapsed/.test(voice));
t('Web Speech conserva el buffer si una pausa cierra la sesión técnica',/Web Speech terminó sesión; conserva buffer/.test(voice)&&/state\.turnPrefix=pending;state\.turnSession='';/.test(voice));
t('Voz CE no corta una pausa breve: espera tres segundos de silencio acústico',/silent>3000/.test(voice));
t('Voz CE permite preguntas largas antes del corte de seguridad',/elapsed>45000/.test(voice));
t('cloud compone el texto y no dispara la consulta por cada fragmento',/state\.turnPrefix=mergeText\(currentTurn\(\),text\)[\s\S]{0,400}scheduleTurnCommit\(state\.turnLastAt\)/.test(voice));
t('watchdog Web Speech recupera arranque colgado hacia Voz CE',/function armRecognitionStartWatchdog[\s\S]{0,1200}startCloudRecognition[\s\S]{0,200}3500/.test(voice));
t('watchdog getUserMedia deja rastro y permite rearme por gesto',/function armCloudStartWatchdog[\s\S]{0,800}needsGesture=true[\s\S]{0,300}6000/.test(voice));
t('autenticación rearma la escucha ambiental',/controlevent:login-ok/.test(voice)&&/controlevent:auth-changed/.test(voice)&&/rearmAmbientAfterAuth/.test(voice));
t('máquina de estados queda observable en debugState',/voicePhase:'BOOT'/.test(voice)&&/phaseHistory:state\.voicePhaseHistory\.slice\(\)/.test(voice));
t('se mantienen los doce segundos de ventana de réplica',/replyWindowMs:12000/.test(voice));
t('index fuerza carga del JS RAW14M y evita JS viejo',/v22-voz3-zuzu\.js\?v=20260825-RAW14M-VOICE-ENGINE/.test(index));

console.log(`\nRAW14M VOICE ENGINE · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
