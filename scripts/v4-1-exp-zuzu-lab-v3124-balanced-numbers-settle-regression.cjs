const fs=require('fs'),path=require('path'),vm=require('vm');const R=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),ai=read('services/event-ai.service.js'),html=read('public/antonio-lab.html'),ui=read('public/app/features/zuzu-test-console-gd.js');let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
function extractFn(src,name){
  const i=src.indexOf(`function ${name}`);if(i<0)return'';
  const p0=src.indexOf('(',i);if(p0<0)return'';let pd=0,body=-1;
  for(let j=p0;j<src.length;j++){const c=src[j];if(c==='(')pd++;else if(c===')'){pd--;if(pd===0){body=src.indexOf('{',j);break}}}
  if(body<0)return'';let d=0,inS=false,inD=false,inT=false,esc=false;
  for(let j=body;j<src.length;j++){const c=src[j];if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(!inD&&!inT&&c==="'"){inS=!inS;continue}if(!inS&&!inT&&c==='"'){inD=!inD;continue}if(!inS&&!inD&&c==='`'){inT=!inT;continue}if(inS||inD||inT)continue;if(c==='{')d++;else if(c==='}'){d--;if(d===0)return src.slice(i,j+1)}}return'';
}
t('build V3.12.4 coherente',/V3\.12\.4-STABLE-BALANCED-NUMBERS-SETTLE/.test(lab)&&/V3\.12\.4-STABLE-BALANCED-NUMBERS-SETTLE/.test(svc));
t('sin Live ni cambio de boca',!/native-audio|BidiGenerateContent|gemini-live/i.test(lab)&&/const TTS_VOICE='Algenib'/.test(lab)&&/es_ES-davefx-medium/.test(lab));
t('sesión v3124 y cache nueva',/controlevent:zuzu-lab:v3124:session/.test(lab)&&/20260905-V3124/.test(html)&&/20260905-V3124/.test(ui));
t('asentamiento detecta captura posterior',/function hasLaterCapture/.test(lab)&&/ya hay una captura posterior en curso/.test(lab)&&/Habla asentada: consulta única a VNext/.test(lab));
t('fragmentos se unen antes de VNext',/Fragmentos unidos antes de consultar VNext/.test(lab));
t('asentamiento aguanta continuación hablada real',/deadline:performance\.now\(\)\+6800/.test(lab)&&/if\(S\.speech\)\{S\.fragmentTimer=setTimeout\(flush,260\)/.test(lab)&&/processingTurnId/.test(lab));
t('ack breve no entra a VNext',/isAcknowledgementOnly/.test(lab)&&/localAcknowledgementReply/.test(lab));
t('política cifras equilibradas presente',/1-3 cifras útiles por defecto/.test(ai));
t('comparativos cuantitativos presentes',/function v3124VoiceComparativeMetricCue/.test(ai));
t('máximo compra devuelve producto e importe',/la compra de \$\{low\?'menor':'mayor'\} importe es/.test(ai));
t('derive conserva ganador y cifra',ai.includes('return winner?`${winner}: ${rendered}.`'));
t('banco equilibrado da movimientos y saldo',/movimientos, \$\{unlinked\} sin justificar y saldo calculado/.test(ai));
t('compras equilibradas dan recuento e importe',/compras pendientes, por unos/.test(ai)&&/compras realizadas, por/.test(ai));
t('listado de compras lleva total breve sin vomitar importes',/numericLead=figureMode!==['"]none['"]/.test(ai)&&/rows\.length===1\?'compra':'compras'/.test(ai)&&/limit=exhaustive\?20:\(figureMode!==['"]none['"]\?6:8\)/.test(ai));
t('fecha/meteo preservados',/v3122ServerCurrentDateCue/.test(ai)&&/FECHA METEO AUTORITATIVA/.test(ai)&&/api\.open-meteo\.com\/v1\/forecast/.test(ai));
t('persona preservada',/v3123ServerPersonaCue/.test(ai)&&/Sesenta y cuatro tacos/.test(ai));
t('STT corto y DaveFX progresivo preservados',/setTimeout\(\(\)=>controller\.abort\(\),5200\)/.test(lab)&&/Comienza DaveFX local progresivo/.test(lab));
t('ghost guard preservado',/isLocalWakeCluster/.test(lab)&&/isImpossibleWakeCluster/.test(svc));
try{const ctx={};vm.createContext(ctx);vm.runInContext(`function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();}${extractFn(ai,'v3124VoiceComparativeMetricCue')}${extractFn(ai,'v437VoiceNoFiguresRequested')}${extractFn(ai,'v439VoiceDirectMetricRequest')}${extractFn(ai,'v438VoiceFigureMode')}result=[v438VoiceFigureMode('Dame la compra de más valor que hayamos hecho hasta ahora'),v438VoiceFigureMode('¿Cuál es la compra más cara?'),v438VoiceFigureMode('Háblame de las compras sin cifras'),v438VoiceFigureMode('Cuánto llevamos gastado')];`,ctx);t('comparativos ejecutan modo brief',ctx.result?.[0]==='brief'&&ctx.result?.[1]==='brief');t('sin cifras ejecuta none',ctx.result?.[2]==='none');t('cuánto ejecuta brief',ctx.result?.[3]==='brief')}catch(e){console.error(e);t('clasificador cifras ejecutable',false)}

try{
  const ctx={};vm.createContext(ctx);
  vm.runInContext(`
    const trim=v=>String(v??'').trim(),num=v=>Number(v)||0,arr=v=>Array.isArray(v)?v:[];
    function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();}
    function v437VoiceEventLabel(result){return result?.facts?.event||'el evento'}
    function v439VoiceRoundMoney(v){return Math.round(Number(v)||0)+' euros'}
    function v439VoicePurchaseRows(result){return result?.tables?.[0]?.rows||[]}
    function v439VoiceListCue(){return false}
    function v26FormatPlainNumber(v){return String(v)}
    function vnextP1LocalFinal(){return {answer:''}}
    ${extractFn(ai,'v3124VoiceComparativeMetricCue')}
    ${extractFn(ai,'v439VoiceExplicitAnswer')}
    result=v439VoiceExplicitAnswer({_vnext_operation:'event_purchases',facts:{event:'FUNCION 2026'},tables:[{rows:[{Producto:'Pan',Importe:12,Tienda:'A'},{Producto:'Jamón',Importe:87,Tienda:'B'}]}]},{operation:'event_purchases'},{},'Dame la compra de más valor que hayamos hecho hasta ahora','brief');
  `,ctx);
  t('máximo de compra ejecutado da elemento + cifra',/Jamón/.test(ctx.result)&&/87 euros/.test(ctx.result));
}catch(e){console.error(e);t('máximo de compra ejecutable',false)}
try{
  const ctx={};vm.createContext(ctx);
  vm.runInContext(`
    const trim=v=>String(v??'').trim(),num=v=>Number(v)||0,arr=v=>Array.isArray(v)?v:[];
    function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();}
    function v437VoiceEventLabel(result){return result?.facts?.event||'el evento'}
    function v437VoiceAsksWho(){return false}
    function v437VoiceNoFiguresRequested(p=''){return /sin cifras/.test(vnextP17LooseNorm(p))}
    function v439VoiceRoundMoney(v){return Math.round(Number(v)||0)+' euros'}
    function vnextP1Table(){return {rows:[]}}
    function vnextP1SpokenPersonLabel(_s,v){return v}
    function v439VoiceNaturalJoin(v){return v.join(', ')}
    function v439VoiceListCue(){return false}
    function v439VoicePurchaseList(){return ''}
    function v3124VoiceComparativeMetricCue(){return false}
    function v439VoiceExplicitAnswer(){return ''}
    function v437VoiceQualitativeBalance(){return 'Va bien.'}
    function vnextP14PersonSocialLabel(_s,v){return v}
    function vnextP14EventSpokenLabel(_s,v){return v}
    function vnextP15PersonStatusSpoken(){return ''}
    function vnextP1LocalFinal(){return {answer:''}}
    ${extractFn(ai,'v439VoiceGroundedNoFigures')}
    result=v439VoiceGroundedNoFigures({_vnext_operation:'event_bank',facts:{event:'FUNCION 2026',included_movement_count:14,unlinked_movement_count:2,justified_movement_count:12,closing_balance:942.5}},{operation:'event_bank'},{},'Cómo va el cuadro bancario','');
  `,ctx);
  t('banco factual ejecutado lleva 1-3 cifras útiles',/14 movimientos/.test(ctx.result)&&/2 sin justificar/.test(ctx.result)&&/943 euros/.test(ctx.result));
}catch(e){console.error(e);t('banco equilibrado ejecutable',false)}


try{
  const ctx={};vm.createContext(ctx);vm.runInContext(`
    const trim=v=>String(v??'').trim();
    function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ/,-]+/g,' ').replace(/\\s+/g,' ').trim();}
    ${extractFn(ai,'vnextP2IsoDateParts')}
    ${extractFn(ai,'vnextP2AddDaysIso')}
    ${extractFn(ai,'vnextP2DateRangeFromPrompt')}
    result=[vnextP2DateRangeFromPrompt('Quiero el tiempo del día 5, 6 y 7 de septiembre','2026-09-05T20:00:00.000Z'),vnextP2DateRangeFromPrompt('del 5 al 7 de septiembre','2026-09-05T20:00:00.000Z'),vnextP2DateRangeFromPrompt('5 de septiembre','2026-09-05T20:00:00.000Z')];
  `,ctx);
  t('fecha natural ejecutada: 5, 6 y 7 septiembre',ctx.result?.[0]?.start_date==='2026-09-05'&&ctx.result?.[0]?.end_date==='2026-09-07');
  t('fecha natural ejecutada: del 5 al 7',ctx.result?.[1]?.start_date==='2026-09-05'&&ctx.result?.[1]?.end_date==='2026-09-07');
  t('fecha natural ejecutada: fecha única',ctx.result?.[2]?.start_date==='2026-09-05'&&ctx.result?.[2]?.end_date==='2026-09-05');
}catch(e){console.error(e);t('parser fecha natural ejecutable',false)}
try{
  const ctx={};vm.createContext(ctx);vm.runInContext(`const clean=(v,m=5000)=>String(v??'').trim().slice(0,m);${extractFn(lab,'splitFallbackSpeech')}result=splitFallbackSpeech('Mira, este es un primer tramo que debería salir pronto. Después viene otra frase bastante más larga para que DaveFX la prepare mientras ya está hablando y no tengamos nueve segundos de silencio antes de arrancar. Y todavía queda un tercer remate corto.');`,ctx);
  t('DaveFX largo sigue partiéndose realmente',Array.isArray(ctx.result)&&ctx.result.length>=2&&ctx.result[0].length<=190);
}catch(e){console.error(e);t('split DaveFX ejecutable',false)}

console.log(`\nV3.12.4 balanced numbers + settle: ${ok} OK / ${ko} KO`);process.exit(ko?1:0);
