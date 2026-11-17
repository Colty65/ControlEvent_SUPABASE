const fs=require('fs'),path=require('path'),vm=require('vm');const R=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),ai=read('services/event-ai.service.js'),html=read('public/antonio-lab.html'),ui=read('public/app/features/zuzu-test-console-gd.js'),vercel=read('vercel.json');let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
function extractFn(src,name){const i=src.indexOf(`function ${name}`);if(i<0)return'';const p0=src.indexOf('(',i);if(p0<0)return'';let pd=0,body=-1;for(let j=p0;j<src.length;j++){const c=src[j];if(c==='(')pd++;else if(c===')'){pd--;if(pd===0){body=src.indexOf('{',j);break}}}if(body<0)return'';let d=0,inS=false,inD=false,inT=false,esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(!inD&&!inT&&c==="'"){inS=!inS;continue}if(!inS&&!inT&&c==='"'){inD=!inD;continue}if(!inS&&!inD&&c==='`'){inT=!inT;continue}if(inS||inD||inT)continue;if(c==='{')d++;else if(c==='}'){d--;if(d===0)return src.slice(i,j+1)}}return'';}

t('build V3.12.6 coherente',/V3\.12\.6-STABLE-FAITHFUL-ANSWER/.test(lab)&&/V3\.12\.6-STABLE-FAITHFUL-ANSWER/.test(svc)&&/V3\.12\.6-STABLE-FAITHFUL-ANSWER/.test(html));
t('sin Live; Interactions streaming preservado',!/native-audio|BidiGenerateContent|gemini-live/i.test(lab)&&/Interactions API/.test(svc));
t('Iapetus preservada como boca única principal',/const TTS_VOICE='Iapetus'/.test(lab)&&/voiceId:'Iapetus'/.test(svc));
t('prosodia más seca y sin sonrisa audible',/llana, seca e informativa/i.test(svc)&&/sin sonrisa audible/i.test(svc));
t('sesión/cache V3126',/controlevent:zuzu-lab:v3126:session/.test(lab)&&/20260906-V3126/.test(html)&&/20260906-V3126/.test(ui));
t('asentamiento 6800 ms preservado',/deadline:performance\.now\(\)\+6800/.test(lab));
t('cost fix Vercel preservado',!/"source"\s*:\s*"\/\(\.\*\)"/.test(vercel)&&/api\/index\.js/.test(vercel));
t('voz fiel usa writtenAnswer antes de reescribir datos',/la voz NO reescribe por defecto la respuesta factual/.test(ai)&&/v3126NeutralSpeechCleanup\(writtenAnswer,userPrompt\)/.test(ai));
t('sin cap oral global de 300 caracteres',!/spokenAnswer\.length>300/.test(ai));
t('listas de donantes salen de tabla donors',/vnextP1Table\(result,'donors'\)/.test(ai)&&/los donantes son/.test(ai));
t('texto escrito también conserva detalle solicitado',/v3126WrittenRequestedDetail/.test(ai)&&/requestedWritten/.test(ai));
t('anti repetición semántica presente',/v3126RepeatGuard/.test(ai)&&/repetir lo mismo no te sirve/.test(ai));
t('más dominios usan fast path sin segundo narrador',/event_liquidations/.test(extractFn(ai,'v3122FastVoiceCovered'))&&/event_weather/.test(extractFn(ai,'v3122FastVoiceCovered'))&&/event_management/.test(extractFn(ai,'v3122FastVoiceCovered')));
t('diagnóstico mide caracteres oral/escrito',/spokenChars:spoken\.length/.test(lab)&&/writtenChars:/.test(lab));
t('corrección de nombres V3.12.5 preservada',/v3125ExplicitCorrection/.test(ai)&&/CORRECCIÓN ORAL AUTORITATIVA|CORRECCION_ORAL_AUTORITATIVA/.test(ai));

try{const ctx={};vm.createContext(ctx);vm.runInContext(`
 const trim=v=>String(v??'').trim(),arr=v=>Array.isArray(v)?v:[],num=v=>Number(v)||0;
 function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();}
 function vnextP1Table(r,k){return (r?.tables||[]).find(x=>x.key===k)}
 function v437VoiceEventLabel(r){return r?.facts?.event||'el evento'}
 function v439VoiceRoundMoney(v){return Math.round(Number(v)||0)+' euros'}
 function v26FormatEuro(v){return Number(v).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
 function vnextP15NaturalJoin(a){return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' y '+a.at(-1)}
 function v439VoiceNaturalJoin(a){return vnextP15NaturalJoin(a.map(trim).filter(Boolean))}
 function v439VoiceListCue(p=''){return /uno por uno|lista|listado|cada uno/i.test(p)}
 function v3124VoiceComparativeMetricCue(){return false}
 function v437VoiceNoFiguresRequested(){return false}
 function v439VoiceDirectMetricRequest(){return false}
 ${extractFn(ai,'v438VoiceFigureMode')}
 ${extractFn(ai,'v3126VoiceNamesCue')}
 ${extractFn(ai,'v3126VoiceDonationRows')}
 ${extractFn(ai,'v3126VoiceDonationDetail')}
 ${extractFn(ai,'v3126WrittenRequestedDetail')}
 const r={_vnext_operation:'event_donations',facts:{event:'FUNCION 2026',donor_count:3,donation_record_count:4,total_value:834,donations_delivered_count:2,donations_committed_count:1,donations_supposed_count:1},tables:[{key:'donors',rows:[{Donante:'Peña El Arrastre','Tipo donante':'Otro',Valor:400},{Donante:'Pocholo y Celes','Tipo donante':'Persona',Valor:234},{Donante:'Torres bus','Tipo donante':'Tienda',Valor:200}]}]};
 result=[
  v3126VoiceDonationDetail(r,{operation:'event_donations'},{},'¿Quiénes son esos donantes?','none'),
  v3126VoiceDonationDetail(r,{operation:'event_donations'},{},'Dime uno por uno los donantes y sus cifras','full'),
  v3126VoiceDonationDetail(r,{operation:'event_donations'},{},'Dame las personas que han donado','none'),
  v3126WrittenRequestedDetail(r,{operation:'event_donations'},{},'Dame los nombres de los donantes')
 ];`,ctx);
 const [names,full,people,written]=ctx.result||[];
 t('quiénes devuelve nombres reales y no agregado',/Peña El Arrastre/.test(names)&&/Pocholo y Celes/.test(names)&&/Torres bus/.test(names)&&!/834/.test(names));
 t('uno por uno con cifras devuelve nombres + valores + total',/400 euros/.test(full)&&/234 euros/.test(full)&&/200 euros/.test(full)&&/Valor total: 834 euros/.test(full));
 t('personas filtra Tipo donante=Persona',/Pocholo y Celes/.test(people)&&!/Torres bus/.test(people)&&!/Peña El Arrastre/.test(people));
 t('respuesta escrita conserva nombres',/Peña El Arrastre/.test(written)&&/Pocholo y Celes/.test(written)&&/Torres bus/.test(written));
}catch(e){console.error(e);t('detalle donantes ejecutable',false)}

try{const ctx={};vm.createContext(ctx);vm.runInContext(`
 const trim=v=>String(v??'').trim(),arr=v=>Array.isArray(v)?v:[];
 function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();}
 function v439VoiceListCue(p=''){return /uno por uno|lista|listado|cada uno/i.test(p)}
 function v438VoiceFigureMode(p=''){return /detalle completo|todas las cifras/i.test(p)?'full':'none'}
 ${extractFn(ai,'v3126VoiceNamesCue')}
 ${extractFn(ai,'v3126TokenSimilarity')}
 ${extractFn(ai,'v3126RepeatGuard')}
 result=[v3126RepeatGuard('Hay 3 donantes y 834 euros.',[{assistant:'Hay 3 donantes y 834 euros.'}],'Dime los nombres de los donantes',''),v3126RepeatGuard('Los donantes son A, B y C.',[{assistant:'Hay 3 donantes y 834 euros.'}],'Dime los nombres','')];`,ctx);
 t('anti-repeat bloquea repetir agregado al pedir nombres',/repetir lo mismo no te sirve/.test(ctx.result?.[0]||''));
 t('anti-repeat deja pasar respuesta distinta útil',ctx.result?.[1]==='Los donantes son A, B y C.');
}catch(e){console.error(e);t('anti-repeat ejecutable',false)}

try{const ctx={};vm.createContext(ctx);vm.runInContext(`const arr=v=>Array.isArray(v)?v:[],trim=v=>String(v??'').trim();${extractFn(ai,'v3122FastVoiceCovered')}result=v3122FastVoiceCovered([{call:{name:'query_ce'},args:{operation:'event_liquidations'},result:{_vnext_operation:'event_liquidations'}}]);`,ctx);t('liquidaciones ahora evitan segundo narrador',ctx.result===true)}catch(e){console.error(e);t('fast coverage ejecutable',false)}

console.log(`\nV3.12.6 faithful answer: ${ok} OK / ${ko} KO`);process.exit(ko?1:0);
