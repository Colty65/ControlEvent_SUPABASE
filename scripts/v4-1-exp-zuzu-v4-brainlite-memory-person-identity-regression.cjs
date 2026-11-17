const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const ai=fs.readFileSync(path.join(root,'services/event-ai.service.js'),'utf8');
const voice=fs.readFileSync(path.join(root,'services/zuzu-voice.service.js'),'utf8');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK ',n)}else{ko++;console.error('KO ',n)}}
t('memory cue acepta recuerda/recuerdas/recordar',/recuerd\[a-z\]\*/.test(ai)&&/record\[a-z\]\*/.test(ai));
t('memoria usa identidad canónica de persona',/v4BrainLiteCanonicalPersonHint/.test(ai)&&/canonicalQuery/.test(ai));
t('memoria reintenta por nombre canónico si la frase mete ruido',/brainmem_person_/.test(ai));
t('args tipados person responsible donor pasan por catálogo canónico',/v4BrainLiteCanonicalizeTypedPersonArgs/.test(ai)&&/\['person','responsible','donor'\]/.test(ai));
t('no hay alias hardcodeados de Cordo/Córdoba en resolver',!/["'`]Cordo(?:ba|bá)?["'`]/.test(ai));
t('STT pide no convertir nombres propios en topónimos',/No autocorrijas un nombre propio poco común convirtiéndolo en una ciudad/.test(voice));
console.log(`\nBRAIN-LITE MEMORY PERSON IDENTITY: ${ok} OK · ${ko} KO`);process.exitCode=ko?1:0;
