const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');let ok=0,bad=0;function t(n,v){if(v){console.log('OK ',n);ok++}else{console.error('FAIL',n);bad++}}
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),html=read('public/antonio-lab.html');
t('build 3154 cliente',/V3\.15\.4-IAPETUS-PROGRESSIVE-RECOVERY/.test(lab));
t('build 3154 servidor',/V3\.15\.4-IAPETUS-PROGRESSIVE-RECOVERY/.test(svc));
t('cache 3154',/V3154-IAPETUS/.test(html));
t('sesion 3154',/v3154:session/.test(lab));
t('voz unica Iapetus',/const TTS_VOICE='Iapetus'/.test(lab)&&/const LAB_TTS_VOICE='Iapetus'/.test(svc));
t('segmentador progresivo',/function splitRecoverySegments/.test(lab)&&/chooseRecoveryCut/.test(lab));
t('maximo tres tramos por diseño',/return\[first,rest\.slice\(0,cut\)\.trim\(\),rest\.slice\(cut\)\.trim\(\)\]/.test(lab));
t('primer tramo antes del resto',/const first=await fetchRecoveryAudio\(segments\[0\]/.test(lab)&&/Primer tramo de recuperación listo/.test(lab));
t('resto se prefetchea en paralelo',/Promise\.all\(segments\.slice\(1\)/.test(lab));
t('programacion WebAudio continua',/Math\.max\(now\+\.02,S\.nextTtsTime\|\|0\)/.test(lab));
t('abortable al interrumpir',/S\.ttsAbort=new AbortController\(\)/.test(lab)&&/signal,body/.test(lab));
t('3.1 se bloquea tras cero audio',/marcado no disponible/.test(lab)&&/sin audio utilizable/.test(lab));
t('2.5 sigue siendo misma voz',/gemini-2\.5-flash-preview-tts/.test(lab)&&/voice:TTS_VOICE/.test(lab));
t('sin DaveFX en runtime LAB',!/["'`]es_ES-davefx-medium["'`]/.test(lab));
console.log(`\n${ok}/${ok+bad} OK`);process.exitCode=bad?1:0;
