const fs=require('fs'),path=require('path');const R=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),ai=read('services/event-ai.service.js'),html=read('public/antonio-lab.html'),ui=read('public/app/features/zuzu-test-console-gd.js');let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
t('build V3.12.3 coherente',/V3\.12\.3-STABLE-CORE-REMAP/.test(lab)&&/V3\.12\.3-STABLE-CORE-REMAP/.test(svc));
t('sin Gemini Live',!/native-audio|BidiGenerateContent|gemini-live/i.test(lab));
t('Algenib Interactions se conserva',/const TTS_VOICE='Algenib'/.test(lab)&&/tts-stream/.test(lab)&&/interactions/i.test(svc));
t('DaveFX sigue como respaldo',/es_ES-davefx-medium/.test(lab)&&/fallbackSpeak/.test(lab));
t('sesión nueva v3123',/controlevent:zuzu-lab:v3123:session/.test(lab));
t('fecha local auditable',/currentDateInfo/.test(lab)&&/currentDateIso/.test(lab)&&/timeZone/.test(lab));
t('fecha directa servidor preservada',/v3122ServerCurrentDateCue/.test(ai)&&/local-clock/.test(ai));
t('identidad directa inequívoca',/v3123ServerPersonaCue/.test(ai)&&/Hombre, claro/.test(ai)&&/Sesenta y cuatro tacos/.test(ai));
t('carácter evita centralita',/carácter tiene que NOTARSE/i.test(ai)&&/Aquí estoy para lo que necesites/.test(ai));
t('parser meses españoles',/const months=\{enero:1/.test(ai)&&/septiembre:9/.test(ai)&&/listRe/.test(ai)&&/rangeRe/.test(ai));
t('meteo fuerza fechas explícitas',/FECHA METEO AUTORITATIVA/.test(ai)&&/trim\(a\.start_date\)!==dr\.start_date/.test(ai)&&/trim\(a\.end_date\)!==dr\.end_date/.test(ai));
t('Open-Meteo sigue siendo fuente',/api\.open-meteo\.com\/v1\/forecast/.test(ai));
t('STT servidor limitado a 4,5 s',/CONTROLEVENT_ANTONIO_STT_TIMEOUT_MS\|\|4500/.test(svc));
t('STT cliente tiene abort 5,2 s',/setTimeout\(\(\)=>controller\.abort\(\),5200\)/.test(lab));
t('timeout STT avisa y sigue',/Ese trozo se me ha atragantado/.test(lab)&&/sttTimeouts/.test(lab));
t('DaveFX progresivo por tramos',/splitFallbackSpeech/.test(lab)&&/scheduleFallbackDecoded/.test(lab)&&/Comienza DaveFX local progresivo/.test(lab));
t('primer tramo corto',/out\.length\?230:145/.test(lab));
t('ghost guard preservado cliente',/isLocalWakeCluster/.test(lab)&&/LOCAL_WAKE_WORDS/.test(lab));
t('ghost guard preservado servidor',/isImpossibleWakeCluster/.test(svc)&&/WAKE_CONTROL_WORDS/.test(svc));
t('caché ITV V3123',/20260905-V3123/.test(html)&&/20260905-V3123/.test(ui));

const vm=require('vm');function extractFn(src,name){const i=src.indexOf(`function ${name}`);if(i<0)return'';let b=src.indexOf('{',i),d=0;for(let j=b;j<src.length;j++){if(src[j]==='{')d++;else if(src[j]==='}'){d--;if(d===0)return src.slice(i,j+1)}}return''}
try{const ctx={};vm.createContext(ctx);vm.runInContext(`const trim=v=>String(v??'').trim();function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ/,-]+/g,' ').replace(/\\s+/g,' ').trim();}${extractFn(ai,'vnextP2IsoDateParts')}${extractFn(ai,'vnextP2AddDaysIso')}${extractFn(ai,'vnextP2DateRangeFromPrompt')}result=[vnextP2DateRangeFromPrompt('Quiero el tiempo del día 5, 6 y 7 de septiembre','2026-09-05T20:00:00.000Z'),vnextP2DateRangeFromPrompt('del 5 al 7 de septiembre','2026-09-05T20:00:00.000Z'),vnextP2DateRangeFromPrompt('5 de septiembre','2026-09-05T20:00:00.000Z')];`,ctx);t('parser natural ejecutado: 5, 6 y 7 septiembre',ctx.result?.[0]?.start_date==='2026-09-05'&&ctx.result?.[0]?.end_date==='2026-09-07');t('parser natural ejecutado: del 5 al 7',ctx.result?.[1]?.start_date==='2026-09-05'&&ctx.result?.[1]?.end_date==='2026-09-07');t('parser natural ejecutado: fecha única',ctx.result?.[2]?.start_date==='2026-09-05'&&ctx.result?.[2]?.end_date==='2026-09-05')}catch(e){t('parser natural ejecutable',false);console.error(e)}
try{const ctx={};vm.createContext(ctx);vm.runInContext(`const clean=(v,m=5000)=>String(v??'').trim().slice(0,m);${extractFn(lab,'splitFallbackSpeech')}result=splitFallbackSpeech('Mira, este es un primer tramo que debería salir pronto. Después viene otra frase bastante más larga para que DaveFX la prepare mientras ya está hablando y no tengamos nueve segundos de silencio antes de arrancar. Y todavía queda un tercer remate corto.');`,ctx);t('DaveFX largo se parte realmente',Array.isArray(ctx.result)&&ctx.result.length>=2&&ctx.result[0].length<=190)}catch(e){t('split DaveFX ejecutable',false)}

console.log(`\nV3.12.3 stable remap: ${ok} OK / ${ko} KO`);process.exit(ko?1:0);
