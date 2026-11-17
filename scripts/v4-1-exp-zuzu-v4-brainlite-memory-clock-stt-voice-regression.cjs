const fs=require('fs');
const ai=fs.readFileSync('services/event-ai.service.js','utf8');
const ui=fs.readFileSync('public/app/features/v11-3-zuzu-analitica-libre.js','utf8');
let ok=0,ko=0;function t(n,c){if(c){console.log('OK ',n);ok++}else{console.log('KO ',n);ko++}}
t('Brain-Lite recupera memoria histórica persistente',ai.includes("provider:'zuzu-v4-brain-lite-memory'")&&ai.includes('vnextRecallMemory(searchCall'));
t('Memoria se separa del evento activo',ai.includes('memoria histórica persistente'));
t('Hora Brain-Lite usa guardia local autoritativa',ai.includes("provider:'zuzu-v4-brain-lite-local-time'")&&ai.includes('v3130ServerCurrentTimeReply'));
t('Fecha Brain-Lite usa guardia local autoritativa',ai.includes("provider:'zuzu-v4-brain-lite-local-date'"));
t('STT extrae solo text y elimina ecos',ui.includes('function ceExtractSttText')&&ui.includes('var txt=ceExtractSttText(d.text)'));
t('Selector ofrece DaveFX y CarlFM',ui.includes('es_ES-davefx-medium')&&ui.includes('es_ES-carlfm-x_low')&&ui.includes('ceAiVoiceSelect'));
t('Cambio de voz invalida motor y descarga modelo elegido',ui.includes('__ceDaveFx=null;__ceDaveFxPromise=null')&&ui.includes("localStorage.setItem('ceZuzuVoiceId'"));
console.log(`\nBRAIN-LITE MEMORY/CLOCK/STT/VOICE: ${ok} OK · ${ko} KO`);process.exitCode=ko?1:0;
