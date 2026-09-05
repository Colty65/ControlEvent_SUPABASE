const fs=require('fs');
const root=process.cwd(),read=p=>fs.readFileSync(root+'/'+p,'utf8');
const lab=read('public/app/features/antonio-lab-v3.js');
const svc=read('services/antonio-lab.service.js');
const routes=read('routes/antonio-lab.routes.js');
const html=read('public/antonio-lab.html');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const checks=[],t=(n,p)=>checks.push([n,!!p]);

t('build V3.13 coherente',/ZUZU-LAB-V3\.13-SEMANTIC-SETTLE-STREAM/.test(lab)&&/ZUZU-LAB-V3\.13-SEMANTIC-SETTLE-STREAM/.test(svc)&&/ZUZU LAB V3\.13/.test(html)&&/ZUZU LAB V3\.13/.test(itv));
t('cache V313',/20260905-V313/.test(lab)&&/20260905-V313/.test(html)&&/20260905-V313/.test(itv));
t('sesion persistida queda aislada por build',/build:BUILD/.test(lab)&&/clean\(x\.build,120\)!==BUILD/.test(lab)&&/controlevent:zuzu-lab:v313:session/.test(lab));
t('todos los turnos sustantivos pasan por asentamiento',/deferFragment\(text,turnId,delay/.test(lab)&&/microventana anti-corte/.test(lab)&&/Habla asentada: consulta única a VNext/.test(lab));
t('detecta tramo posterior sin mirar contenido de negocio',/function fragmentHasLaterCapture/.test(lab)&&/S\.latestTurnId>turnId/.test(lab)&&/S\.utteranceQueue\.some/.test(lab));
t('si ya hay otro tramo espera antes de consultar CE',/laterCapture\?620:360/.test(lab)&&/setTimeout\(flush,420\)/.test(lab));
t('fragmentos consecutivos se unen',/Fragmentos unidos antes de consultar VNext/.test(lab)&&/`\$\{p\.text\} \$\{text\}`/.test(lab));
t('backchannels no cancelan fragmento',/Interjección breve: no cancela respuesta ni fragmento/.test(lab)&&/touchFragment\(turnId\)/.test(lab));
t('backchannel admite repeticiones naturales',/const soft=new Set/.test(lab)&&/'dime'/.test(lab)&&/'claro'/.test(lab)&&/words\.every/.test(lab));
t('wake con contenido también usa asentamiento',/wake con microventana anti-corte/.test(lab)&&/deferFragment\(remainder,turnId/.test(lab));
t('diagnostico aclara que 500 chars son preview',/spokenChars:spoken\.length/.test(lab)&&/diagnosticPreviewOnly:spoken\.length>500/.test(lab));
t('TTS 3.1 Interactions se conserva',/v1beta\/interactions/.test(svc)&&/response_format:\{type:'audio'\}/.test(svc)&&/stream:true/.test(svc));
t('watchdog primer audio se conserva',/CONTROLEVENT_ZUZU_TTS_FIRST_AUDIO_TIMEOUT_MS\|\|8000/.test(svc)&&/no entregó primer audio/.test(svc));
t('desconexion real usa response, no request close',!/req\.on\('close'/.test(routes)&&/res\.on\('close',clientGone\)/.test(routes));
t('Algenib y DaveFX se conservan',/TTS_VOICE='Algenib'/.test(lab)&&/FALLBACK_VOICE_ID='es_ES-davefx-medium'/.test(lab));
t('barge-in real se conserva',/stopAudio\('voz del usuario detectada'\)/.test(lab));

let ok=0;for(const [n,p] of checks){console.log(`${p?'OK':'KO'} · ${n}`);if(p)ok++;}
console.log(`\nZUZU LAB V3.13 SEMANTIC SETTLE: ${ok}/${checks.length}`);
process.exitCode=ok===checks.length?0:1;
