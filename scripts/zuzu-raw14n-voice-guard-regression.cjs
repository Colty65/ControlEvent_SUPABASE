const fs=require('fs');
const voice=fs.readFileSync('public/app/features/v22-voz3-zuzu.js','utf8');
const backend=fs.readFileSync('services/event-ai.service.js','utf8');
const index=fs.readFileSync('public/index.html','utf8');
let pass=0,fail=0;function t(name,ok){if(ok){console.log('OK · '+name);pass++;}else{console.error('KO · '+name);fail++;}}

t('build RAW14N VOICE GUARD',/RAW14N-VOICE-GUARD-FIX44/.test(voice));
t('Borra texto sigue siendo local',/function hasClearTextCommand[\s\S]{0,250}borra\|borrar\|borre[\s\S]{0,120}texto/.test(voice)&&/Te escucho de nuevo, '\+voiceGreetingName\(\)\+'\./.test(voice));
t('tras Borra texto se abre una cuarentena temporal',/postClearQuarantineMs:8000/.test(voice)&&/state\.postClearUntil=Date\.now\(\)\+Number\(state\.postClearQuarantineMs/.test(voice));
t('fragmentos muy cortos no arrancan el temporizador normal',/function isShortPostClearFragmentShape[\s\S]{0,500}postClearMinWords[\s\S]{0,300}postClearMinChars/.test(voice)&&/function scheduleTurnIfReady[\s\S]{0,500}fragmento corto en cuarentena/.test(voice));
t('fragmento aislado queda retenido y solo después pasa al guard semántico',/function armPostClearDiscard[\s\S]{0,900}fragmento corto pasa al guard semántico Gemini[\s\S]{0,250}commitUserTurn\(\)/.test(voice));
t('guard final impide commit de fragmento post-clear',/function commitUserTurn[\s\S]{0,900}postClearFragmentNeedsMore\(text\)[\s\S]{0,350}return;/.test(voice));
t('Web Speech usa el guard al cerrar sesión técnica',/Web Speech terminó sesión; conserva buffer[\s\S]{0,150}scheduleTurnIfReady/.test(voice));
t('Voz CE usa el guard al componer fragmentos',/Voz CE mantiene el buffer[\s\S]{0,160}scheduleTurnIfReady/.test(voice));
t('la pausa humana general sigue en tres segundos',/turnCommitMs:3000/.test(voice)&&/silent>3000/.test(voice));

const arrMatch=voice.match(/var ENTERTAINMENT_PHRASES=\[([\s\S]*?)\n  \];/);
const phraseCount=arrMatch?(arrMatch[1].match(/^\s*'/gm)||[]).length:0;
t('mazo sustituido por 23 frases',phraseCount===23);
t('frases incluyen usuario y nombre dinámicos',/\{usuario\}/.test(arrMatch?.[1]||'')&&/\{nombre\}/.test(arrMatch?.[1]||'')&&/function renderEntertainmentPhrase[\s\S]{0,350}voiceAddressName\(false\)[\s\S]{0,180}voiceGreetingName\(\)/.test(voice));
t('las frases solicitadas clave están presentes',/viva el cristo de las angustias joder/i.test(voice)&&/Morgan de la tubería/.test(voice)&&/Arrikitaum tan tin/.test(voice)&&/La tabla está hablando/.test(voice));
t('nuevo mazo usa almacenamiento versionado propio',/entertainment_deck_v42/.test(voice));

t('tool CE lleva input_quality obligatorio en primera llamada',/required:\[\.\.\.new Set\(\['input_quality'/.test(backend)&&/input_quality:inputQuality/.test(backend));
t('Gemini distingue coherent, topic shift y possible noise',/coherent[\s\S]{0,120}intentional_topic_shift[\s\S]{0,120}possible_voice_noise/.test(backend));
t('cambio radical de tema o evento está permitido explícitamente',/Un cambio radical de evento o conversación NO es ruido por ser diferente/.test(backend));
t('canal voz llega a la primera compilación Gemini',/INPUT_CHANNEL:\\n\$\{channel\}/.test(backend)&&/v73KernelInput\(userPrompt,session,entityCandidates,historyCandidates,display,screen,timeContext,voiceConversation\)/.test(backend));
t('possible_voice_noise solo puede convertirse en conversación incoherente',/function v73VoiceInputAssessmentViolation[\s\S]{0,900}possible_voice_noise[\s\S]{0,500}incoherent_input/.test(backend));
t('assessment se toma de la misma function call y se conserva',/v73InputAssessmentFromArgs\(calls\[0\]\?\.arguments/.test(backend)&&/input_assessment:assessment/.test(backend));
t('traza muestra calidad de entrada de voz',/CALIDAD ENTRADA VOZ/.test(backend));
t('run ledger pasa voiceConversation al compilador',/v73CompileTurn\(\{userPrompt,state,selectedEventId,session,entityCandidates,historyCandidates,display,policy,flowTrace,externalSignal,timeContext:[\s\S]{0,180}voiceConversation\}/.test(backend));
t('index invalida cache y carga RAW14N',/v22-voz3-zuzu\.js\?v=20260826-RAW14N-VOICE-GUARD/.test(index));

console.log(`\nRAW14N VOICE GUARD · ${pass}/${pass+fail} comprobaciones OK`);process.exit(fail?1:0);
