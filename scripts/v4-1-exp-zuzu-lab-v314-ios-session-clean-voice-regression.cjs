const fs=require('fs');
const root=process.cwd(),read=p=>fs.readFileSync(root+'/'+p,'utf8');
const lab=read('public/app/features/antonio-lab-v3.js');
const svc=read('services/antonio-lab.service.js');
const voice=read('services/zuzu-voice.service.js');
const parent=read('public/app/features/v11-3-zuzu-analitica-libre.js');
const logout=read('public/app/features/v7-3-login-clean-no-preselect.js');
const html=read('public/antonio-lab.html');
const itv=read('public/app/features/zuzu-test-console-gd.js');
const routes=read('routes/antonio-lab.routes.js');
const checks=[],t=(n,p)=>checks.push([n,!!p]);

t('build V3.14 coherente',/ZUZU-LAB-V3\.14-IOS-SESSION-CLEAN-CASUAL-VOICE/.test(lab)&&/ZUZU-LAB-V3\.14-IOS-SESSION-CLEAN-CASUAL-VOICE/.test(svc)&&/ZUZU LAB V3\.14/.test(html)&&/ZUZU LAB V3\.14/.test(itv));
t('cache V314',/20260905-V314/.test(lab)&&/20260905-V314/.test(html)&&/20260905-V314/.test(itv));
t('voz casual masculina nueva',/TTS_VOICE='Zubenelgenubi'/.test(lab)&&/voiceId:'Zubenelgenubi'/.test(svc)&&/Zubenelgenubi/.test(voice));
t('prompt quita teatralidad y graves forzados',/Evita voz cinematográfica, épica, seductora, de personaje/.test(svc)&&/No fuerces graves ni aspereza/.test(svc)&&/cotidiana, sobria, relajada y cercana/.test(svc));
t('TTS Interactions 3.1 se conserva',/v1beta\/interactions/.test(svc)&&/response_format:\{type:'audio'\}/.test(svc)&&/stream:true/.test(svc));
t('LAB persiste solo en sessionStorage',/sessionStorage\.setItem\(PERSIST_KEY/.test(lab)&&!/localStorage\.setItem\(PERSIST_KEY/.test(lab)&&/const raw=sessionStorage\.getItem\(PERSIST_KEY/.test(lab));
t('LAB debouncea escrituras',/PERSIST_WRITE_DELAY_MS=900/.test(lab)&&/function schedulePersist/.test(lab)&&/schedulePersist\(\)/.test(lab));
t('LAB acota eventos y render',/PERSIST_EVENT_LIMIT=220/.test(lab)&&/PERSIST_RENDER_LIMIT=140/.test(lab)&&/while\(box\.childNodes\.length>PERSIST_RENDER_LIMIT\)/.test(lab));
t('LAB acota burbujas visibles',/while\(host\.children\.length>48\)/.test(lab));
t('LAB expone reset de logout',/function resetForLogout/.test(lab)&&/window\.ControlEventAntonioLabV3=\{build:BUILD,resetForLogout/.test(lab)&&/allowPersist=false/.test(lab));
t('logout resetea iframe antes de cerrarlo',/contentWindow\?\.ControlEventAntonioLabV3\?\.resetForLogout/.test(logout)&&/window\.ceCloseAntonioLab/.test(logout));
t('logout y login fuerzan sesión limpia',/resetZuzuAuthSession\('logout'\)/.test(logout)&&/resetZuzuAuthSession\('login'\)/.test(logout));
t('bridge expone resetSession',/resetSession:resetZuzuSessionForAuth/.test(parent)&&/function resetZuzuSessionForAuth/.test(parent));
t('reset aborta voz y commits pendientes',/__ceAntonioVoiceAbort\.abort/.test(parent)&&/__ceAntonioPendingVoiceCommits\.clear/.test(parent));
t('historial activo baja de 500 a 120',/ZUZU_LOCAL_HISTORY_LIMIT=120/.test(parent)&&!/ZUZU_LOCAL_HISTORY_LIMIT=500/.test(parent));
t('recuperación localStorage antigua queda desactivada',/function zuzuVoiceRecoveryActive\(\)\{return false;\}/.test(parent)&&!/localStorage\.setItem\(zuzuVoiceRecoveryKey/.test(parent));
t('runtime nuevo limpia sesión al desplegar V314',/ZUZU_RUNTIME_BUILD='20260905-V314-IOS-SESSION-CLEAN'/.test(parent)&&/ensureZuzuRuntimeBuild\(\);\n    armZuzuVoiceRecovery/.test(parent));
t('logout elimina claves antiguas de sesiones Zuzu/LAB',/_zuzu_\(\?:conversation\|context\|interaction_id/.test(parent)&&/\^controlevent:zuzu-lab:v\\d\+:session\$/.test(parent)&&/_zuzu_\(\?:conversation\|context\|interaction_id/.test(logout));
t('barge-in y asentamiento semántico se conservan',/stopAudio\('voz del usuario detectada'\)/.test(lab)&&/Habla asentada: consulta única a VNext/.test(lab)&&/Fragmentos unidos antes de consultar VNext/.test(lab));
t('watchdog primer audio se conserva',/CONTROLEVENT_ZUZU_TTS_FIRST_AUDIO_TIMEOUT_MS\|\|8000/.test(svc)&&/no entregó primer audio/.test(svc));
t('desconexión real sigue en response',!/req\.on\('close'/.test(routes)&&/res\.on\('close',clientGone\)/.test(routes));

let ok=0;for(const [n,p] of checks){console.log(`${p?'OK':'KO'} · ${n}`);if(p)ok++;}
console.log(`\nZUZU LAB V3.14 IOS SESSION CLEAN + CASUAL VOICE: ${ok}/${checks.length}`);
process.exitCode=ok===checks.length?0:1;
