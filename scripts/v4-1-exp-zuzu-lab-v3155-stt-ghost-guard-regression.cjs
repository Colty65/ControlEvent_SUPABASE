const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');let ok=0,bad=0;function t(n,v){if(v){console.log('OK ',n);ok++}else{console.error('FAIL',n);bad++}}
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),html=read('public/antonio-lab.html'),ui=read('public/app/features/zuzu-test-console-gd.js');
t('build 3155 cliente',/V3\.15\.5-IAPETUS-STT-GHOST-GUARD/.test(lab));
t('build 3155 servidor',/V3\.15\.5-IAPETUS-STT-GHOST-GUARD/.test(svc));
t('cache 3155',/V3155-IAPETUS-GHOST/.test(html));
t('sesion 3155',/v3155:session/.test(lab));
t('prompt STT ya no ceba lista de alias',!/en especial, Zuzu, Zuzito, Antonio y Antoñito/i.test(svc));
t('prompt STT prohibe adivinar por contexto',/No uses contexto previo, listas de nombres, palabras sugeridas ni el nombre del asistente para adivinar contenido/.test(svc));
t('audio ambiguo pide vacio',/Si no hay habla inteligible o el audio es ambiguo, devuelve una cadena vacía/.test(svc));
t('guardia microaudio presente',/function isImpossibleWakeCluster/.test(svc)&&/sec<=1\.6/.test(svc));
t('un solo wake no se filtra',/words\.length<2\)return false/.test(svc));
t('requiere varios alias distintos',/uniq\.size>=2&&words\.every\(w=>WAKE_CONTROL_WORDS\.has\(w\)\)/.test(svc));
t('falso STT se devuelve vacio',/ghostFiltered\?'':transcript/.test(svc));
t('cliente no pinta ghost como transcripcion normal',/if\(p\.ghostFiltered\)log\('stt','Microfragmento ambiguo descartado antes de entrar en la conversación'/.test(lab));
t('ITV abre build 3155',/ZUZU LAB V3\.15\.5/.test(ui)&&/v=20260905-V3155/.test(ui));
t('voz sigue Iapetus unica',/const TTS_VOICE='Iapetus'/.test(lab)&&/const LAB_TTS_VOICE='Iapetus'/.test(svc));
t('recuperacion progresiva intacta',/function splitRecoverySegments/.test(lab)&&/gemini-2\.5-flash-preview-tts/.test(lab));
console.log(`\n${ok}/${ok+bad} OK`);process.exitCode=bad?1:0;
