const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const client=read('public/app/features/antonio-lab-v3.js');
const service=read('services/antonio-lab.service.js');
const html=read('public/antonio-lab.html');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const index=read('public/index.html');
const checks=[
 ['build V3.4',/ANTONIO-LAB-V3\.4-TURN-MANAGER/.test(client)&&/V3\.4/.test(html)&&/V3\.4-TURN-MANAGER-GEMINI-PIPER/.test(service)],
 ['cola de turnos',/utteranceQueue\.push\(\{frames,turnId\}\)/.test(client)&&/while\(S\.utteranceQueue\.length\)/.test(client)],
 ['no tira frase por utteranceBusy',!client.includes('utteranceBusy')],
 ['turnId creciente al inicio de voz',/const turnId=\+\+S\.turnSeq;S\.latestTurnId=turnId/.test(client)],
 ['nuevo turno invalida audio/síntesis',/stopAudio\('nuevo turno del usuario'\)/.test(client)&&/turnId!==S\.latestTurnId/.test(client)],
 ['respuesta obsoleta no habla',/Respuesta del turno .* omitida/.test(client)&&/staleRepliesDiscarded/.test(client)],
 ['espera silencio antes de reproducir',/waitForPlaybackWindow/.test(client)&&/!S\.speech&&quietFor>=280/.test(client)],
 ['guardia evita barge inmediato falso',/bargeGuardUntil=S\.playStartedAt\+350/.test(client)&&/performance\.now\(\)>=S\.bargeGuardUntil/.test(client)],
 ['interrupción real corta audio',/S\.interruptions\+\+;stopAudio\('voz del usuario detectada'\)/.test(client)],
 ['STT pide texto plano',/ÚNICAMENTE el texto transcrito en texto plano/.test(service)&&!/responseMimeType:'application\/json'/.test(service)],
 ['parser rescata text incluso JSON roto',service.includes('const m=s.match(/[\"\']?text')],
 ['diagnóstico incluye cola y obsoletas',/queuedUtterances:S\.queuedUtterances/.test(client)&&/Respuestas obsoletas descartadas/.test(service)],
 ['Antonio abre dentro de ITV',/iframe id="calFrame"/.test(itv)&&/allow="microphone; autoplay"/.test(itv)&&/openAntonioLab/.test(itv)],
 ['Antonio no navega fuera de ITV',!/ztAntonioLab'\)\.onclick=.*location\.assign/.test(itv)],
 ['Volver cierra overlay y conserva ITV',/ce:antonio-lab-close/.test(client)&&/closeAntonioLab/.test(itv)&&/VOLVER A ITV/.test(itv)],
 ['primer clic sigue abriendo micro antes que Piper',/await startMic\(ctx\);S\.active=true/.test(client)&&/setTimeout\(\(\)=>ensureTts/.test(client)],
 ['botón activar nace habilitado',/<button class="primary" id="start">Activar Antonio<\/button>/.test(html)],
 ['cache buster V3.4 laboratorio',/20260904-V34-TURN-MANAGER/.test(html)&&/20260904-V34/.test(client)],
 ['cache buster V3.4 ITV',/20260904-ANTONIO-V34-ITV-EMBEDDED/.test(index)],
];
let ok=0,ko=0;for(const [name,pass] of checks){if(pass){ok++;console.log('OK ',name)}else{ko++;console.log('KO ',name)}}
console.log(`\nANTONIO LAB V3.4 TURN MANAGER: ${ok} OK / ${ko} KO`);process.exitCode=ko?1:0;
