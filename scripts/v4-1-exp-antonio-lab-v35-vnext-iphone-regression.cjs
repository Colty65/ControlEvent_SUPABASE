const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js');
const zuzu=read('public/app/features/v11-3-zuzu-analitica-libre.js');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const html=read('public/antonio-lab.html');
const svc=read('services/antonio-lab.service.js');
const index=read('public/index.html');
const checks=[
 ['build V3.5',/ANTONIO-LAB-V3\.5-VNEXT-IPHON/.test(lab)&&/V3\.5-VNEXT-IPHON/.test(svc)],
 ['LAB llama puente VNext',/askBrain\(text,turnId\)/.test(lab)&&/ControlEventV113ZuzuAnalitica/.test(lab)&&/askVoice/.test(lab)],
 ['puente llama analyze-vnext',/askVoiceDirect/.test(zuzu)&&/\/api\/event-ai\/analyze-vnext/.test(zuzu)],
 ['voz fuerza voiceConversation',/voiceConversation:true/.test(zuzu)],
 ['usa spokenAnswer',/spokenAnswer/.test(lab)&&/data\.spokenAnswer/.test(zuzu)],
 ['elimina respuesta local genérica',!/'Vale, te sigo\.'/ .test(lab)&&!/'Te he oído\. Sigue\.'/ .test(lab)],
 ['vocativo aislado no contesta',/Vocativo aislado/.test(lab)&&/isBareName/.test(lab)],
 ['reproducción WebAudio iPhone',/decodeAudioBuffer/.test(lab)&&/createBufferSource/.test(lab)&&/AudioBufferSourceNode/.test(lab)],
 ['salida WebAudio se prima en el clic',/Salida WebAudio primada en el gesto/.test(lab)],
 ['no depende de HTML Audio para hablar',!/const a=new Audio\(/.test(lab)],
 ['barge-in corta BufferSource',/S\.playSource\.stop\(0\)/.test(lab)],
 ['iframe permite micro y autoplay',/allow="microphone; autoplay"/.test(itv)],
 ['ITV abre V3.5',/Antonio LAB V3\.5/.test(itv)&&/20260904-V35/.test(itv)],
 ['LAB declara VNext real',/VNext\/CE real/.test(html)],
 ['cache bust V3.5',/V35-VNEXT-IPHON/.test(html)&&/ANTONIO-V35-VOICE-BRIDGE/.test(index)],
 ['retorno ITV preservado',/ce:antonio-lab-close/.test(lab)&&/ce:antonio-lab-close/.test(itv)],
];
let ok=0;for(const [name,pass] of checks){console.log(`${pass?'OK':'KO'} · ${name}`);if(pass)ok++;}
console.log(`\nAntonio LAB V3.5: ${ok}/${checks.length}`);process.exitCode=ok===checks.length?0:1;
