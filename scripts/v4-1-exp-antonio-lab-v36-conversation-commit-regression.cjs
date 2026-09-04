const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js'),zuzu=read('public/app/features/v11-3-zuzu-analitica-libre.js'),itv=read('public/app/features/zuzu-test-console-gd.js'),html=read('public/antonio-lab.html'),svc=read('services/antonio-lab.service.js');
const checks=[
 ['build V3.6',/V3\.6-COMMIT-ON-SPEAK/.test(lab)&&/V3\.6-COMMIT-ON-SPEAK/.test(svc)],
 ['vocativo no cancela',/Vocativo\/intervención breve: NO cancela/.test(lab)&&/isBareName\(text\)\|\|isSoftInterjectionOnly\(text\)/.test(lab)],
 ['captura no invalida mientras piensa',!/stopAudio\('nuevo turno del usuario'\)/.test(lab)&&/Si Antonio YA está hablando, el corte sí es instantáneo/.test(lab)],
 ['cancelación dura explícita',/isHardCancelOnly/.test(lab)&&/cancelación verbal explícita/.test(lab)],
 ['epoch semántico separado del capture turn',/responseEpoch/.test(lab)&&/beginSemanticTurn/.test(lab)],
 ['respuesta VNext diferida',/deferCommit:true/.test(lab)&&/__ceAntonioPendingVoiceCommits/.test(zuzu)],
 ['memoria sólo al empezar reproducción',/commitVoiceResponse/.test(lab)&&/Respuesta confirmada en conversación al comenzar la reproducción/.test(lab)],
 ['puente expone commit y discard',/commitVoiceResponse:commitVoiceResponse/.test(zuzu)&&/discardVoiceResponse:discardVoiceResponse/.test(zuzu)],
 ['respuesta no pronunciada se descarta',/discardVoiceResponse/.test(lab)&&/Respuesta no pronunciada descartada/.test(lab)],
 ['fragmento corto puede unirse',/isLikelyIncomplete/.test(lab)&&/Fragmentos unidos antes de consultar VNext/.test(lab)],
 ['silencio VAD algo más tolerante',/silentFrames>=34/.test(lab)],
 ['barge-in real sigue instantáneo',/if\(S\.speaking\)\{S\.interruptions\+\+;stopAudio\('voz del usuario detectada'\)/.test(lab)],
 ['WebAudio iPhone preservado',/AudioBufferSourceNode/.test(lab)&&/createBufferSource/.test(lab)],
 ['ITV abre V3.6',/Antonio LAB V3\.6/.test(itv)&&/20260904-V36/.test(itv)],
 ['retorno ITV preservado',/ce:antonio-lab-close/.test(lab)&&/ce:antonio-lab-close/.test(itv)],
 ['cache buster V3.6',/V36-COMMIT-ON-SPEAK/.test(html)],
];let ok=0;for(const [n,p] of checks){console.log(`${p?'OK':'KO'} · ${n}`);if(p)ok++;}console.log(`\nAntonio LAB V3.6: ${ok}/${checks.length}`);process.exitCode=ok===checks.length?0:1;
