const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');let ok=0,ko=0;const read=p=>fs.readFileSync(path.join(root,p),'utf8');function t(n,f){let pass=false;try{pass=!!f()}catch{}if(pass){ok++;console.log('OK ',n)}else{ko++;console.error('KO ',n)}}
const html=read('public/antonio-lab.html'),js=read('public/app/features/antonio-lab-v3.js'),idx=read('public/index.html');
t('botón nace habilitado',()=>/id="start">Activar Antonio/.test(html)&&!/id="start" disabled>Activar Antonio/.test(html));
t('primer clic espera configuración',()=>/configPromise/.test(js)&&/await \(S\.configPromise\|\|Promise\.resolve\(S\.config\)\)/.test(js));
t('estado registra clic inmediatamente',()=>/He recibido tu clic/.test(js));
t('micro no espera Piper',()=>/await startMic\(\);S\.active=true/.test(js)&&!/Promise\.all\(\[startMic\(\),prepareTts\(\)\]\)/.test(js));
t('Piper se prepara independiente',()=>/function ensureTts/.test(js)&&/ensureTts\(\)\.catch/.test(js));
t('respuesta queda en cola si voz no lista',()=>/pendingSpeech/.test(js)&&/Te he oído/.test(js));
t('config inicia precarga sin bloquear clic',()=>/ensureTts\(\)\.catch\(e=>log\('tts','Preparación anticipada/.test(js));
t('cache buster nuevo',()=>/V31-FIRST-CLICK/.test(html));
t('acceso visible actualizado',()=>/Antonio LAB V3\.1/.test(idx));
t('build V3.1',()=>/ANTONIO-LAB-V3\.1-FIRST-CLICK/.test(js+html));
console.log(`\nANTONIO LAB V3.1 FIRST CLICK: ${ok} OK / ${ko} KO`);process.exitCode=ko?1:0;
