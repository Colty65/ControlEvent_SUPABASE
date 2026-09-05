const fs=require('fs'),vm=require('vm');
const root=process.cwd();
const read=p=>fs.readFileSync(root+'/'+p,'utf8');
const lab=read('public/app/features/antonio-lab-v3.js');
const ai=read('services/event-ai.service.js');
const html=read('public/antonio-lab.html');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const svc=read('services/antonio-lab.service.js');
const routes=read('routes/antonio-lab.routes.js');
const pkg=JSON.parse(read('package.json'));
const checks=[];const t=(n,p)=>checks.push([n,!!p]);

t('build ZUZU V3.11 coherente',/ZUZU-LAB-V3\.11-NATURAL-NARRATOR-ALGENIB-STREAM-PERSIST/.test(lab)&&/ZUZU-LAB-V3\.11-NATURAL-NARRATOR-ALGENIB-STREAM-PERSIST/.test(svc)&&/ZUZU LAB V3\.11/.test(html)&&/ZUZU LAB V3\.11/.test(itv));
t('cache V311',/20260905-V311/.test(lab)&&/20260905-V311/.test(html)&&/20260905-V311/.test(itv));
t('STT actualizado a Flash-Lite 3.1 por defecto',/CONTROLEVENT_ANTONIO_STT_MODEL\|\|'gemini-3\.1-flash-lite'/.test(svc));
t('voz principal Algenib grave',/ttsVoice\(\)\{return clean\([^\n]*'Algenib'/.test(svc)&&/voz de hombre adulto muy grave, atractiva, cálida y ligeramente áspera/i.test(svc)&&/TTS_VOICE='Algenib'/.test(lab));
t('TTS Gemini 3.1 realmente streaming',/streamGenerateContent\?alt=sse/.test(svc)&&/responseModalities:\['AUDIO'\]/.test(svc)&&/application\/x-ndjson/.test(routes)&&/res\.write\(JSON\.stringify\(\{type:'audio'/.test(routes));
t('sin nueva dependencia SDK',!pkg.dependencies['@google/genai']&&!/from '@google\/genai'/.test(svc));
t('precio TTS trazable 0.0005 USD/s',/costUsd:seconds\*\.0005/.test(svc)&&/geminiTtsCostUsd/.test(lab));
t('Piper no se precarga; solo fallback',/prepareFallbackTts/.test(lab)&&/ttsProvider:'gemini-3\.1-flash-tts-preview'/.test(lab)&&!/setTimeout\(\(\)=>prepareFallbackTts/.test(lab));
t('iPhone no carga fallback pesado tras fallo TTS',/function isIosLike/.test(lab)&&/Fallback local bloqueado en iOS para evitar recarga por memoria/.test(lab));
t('diagnóstico LAB sobrevive recarga con localStorage',/localStorage\.setItem\(PERSIST_KEY/.test(lab)&&/localStorage\.getItem\(PERSIST_KEY/.test(lab)&&/PERSIST_TTL_MS=6\*60\*60\*1000/.test(lab));
t('historial Zuzu tiene espejo de recuperación para voz',/zuzuVoiceRecoveryKey/.test(read('public/app/features/v11-3-zuzu-analitica-libre.js'))&&/armZuzuVoiceRecovery\(\)/.test(read('public/app/features/v11-3-zuzu-analitica-libre.js'))&&/localStorage\.setItem\(zuzuVoiceRecoveryKey/.test(read('public/app/features/v11-3-zuzu-analitica-libre.js')));
t('narrador natural sustituye catálogo oral en VNext voz',/function v311NaturalVoiceNarrator/.test(ai)&&/natural=await v311NaturalVoiceNarrator/.test(ai)&&/if\(natural\)\{spokenAnswer=natural/.test(ai));
t('narrador no hace chatbot de soporte',/No uses fórmulas tipo «Entiendo tu frustración»/.test(ai)&&/no redactes una disculpa de soporte/.test(ai)&&/No cierres sistemáticamente con «si quieres…»/.test(ai));
t('peticiones abiertas reciben contenido, no otra pregunta genérica',/«dame un variadito»/.test(ai)&&/NO le devuelvas otra pregunta genérica/.test(ai));
t('Zuzu puede tomar iniciativa conversacional sin plantilla fija',/Zuzu no es un contestador pasivo/.test(ai)&&/una observación corta, una comparación o UNA pregunta concreta/.test(ai));
t('cifras: se dan cuando el usuario las pide',/El usuario ha pedido una cifra o cantidad: contesta con la cifra pertinente ahora/.test(ai)&&/El usuario NO ha pedido cifras: evita importes/.test(ai));
t('narrador con techo de latencia',/VOICE_NARRATOR_TIMEOUT_MS\|\|3000/.test(ai));
t('tiempo humano sigue activo',/function v440HumanizeMachineTime/.test(ai)&&/spoken:false/.test(ai)&&/spoken:true/.test(ai));
t('visor de puntos/fotos de V3.9+ se conserva',/ceBankZoomPointPhoto/.test(read('public/app/features/v24-cuadre-banco.js'))||/open.*photo/i.test(read('public/app/features/v24-cuadre-banco.js')));

let ok=0;for(const [n,p] of checks){console.log(`${p?'OK':'KO'} · ${n}`);if(p)ok++;}
console.log(`\nZUZU LAB V3.11 NATURAL + ALGENIB STREAM + RECOVERY: ${ok}/${checks.length}`);process.exitCode=ok===checks.length?0:1;
