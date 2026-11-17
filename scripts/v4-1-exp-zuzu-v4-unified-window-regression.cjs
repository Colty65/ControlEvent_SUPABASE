const fs=require('fs');let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK · '+n)}else{ko++;console.error('KO · '+n)}}
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
const ai=fs.readFileSync('services/event-ai.service.js','utf8');
const itv=fs.readFileSync('services/zuzu-test-lab.service.js','utf8');
t('ventana única incluye Hablar',/id="ceAiMic"/.test(ui));
t('ventana única incluye Voz ON/OFF',/id="ceAiVoiceToggle"/.test(ui));
t('micrófono usa STT Zuzu existente',/\/api\/zuzu-voice\/transcribe/.test(ui));
t('voz y escritura comparten BRAIN-LITE',/brainLite:vnext/.test(ui)&&/var voiceConversation=true/.test(ui));
t('Voz ON reproduce spokenAnswer también en la ventana escrita',/if\(__ceUnifiedVoiceReply\)/.test(ui)&&/ceSpeakLocal\(say\)/.test(ui));
t('plan BRAIN-LITE registra usage real',/V4 BRAIN-LITE · PLAN[\s\S]{0,500}usage:usageSmall\(payload,model\)/.test(ai));
t('respuesta BRAIN-LITE exporta geminiUsageEstimate',/provider:'zuzu-v4-brain-lite'[\s\S]{0,1800}geminiUsageEstimate:summarizeGeminiUsageFromTrace/.test(ai));
t('ITV corrige contradicción del simulador contra filas materializadas',/Evidencia estructurada autoritativa: tabla materializada/.test(itv));
console.log(`\nUNIFIED WINDOW: ${ok} OK · ${ko} KO`);process.exitCode=ko?1:0;
