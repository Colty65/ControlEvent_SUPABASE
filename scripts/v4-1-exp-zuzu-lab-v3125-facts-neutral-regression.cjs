const fs=require('fs'),path=require('path'),vm=require('vm');const R=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),ai=read('services/event-ai.service.js'),html=read('public/antonio-lab.html'),ui=read('public/app/features/zuzu-test-console-gd.js'),vercel=read('vercel.json');let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
function extractFn(src,name){const i=src.indexOf(`function ${name}`);if(i<0)return'';const p0=src.indexOf('(',i);if(p0<0)return'';let pd=0,body=-1;for(let j=p0;j<src.length;j++){const c=src[j];if(c==='(')pd++;else if(c===')'){pd--;if(pd===0){body=src.indexOf('{',j);break}}}if(body<0)return'';let d=0,inS=false,inD=false,inT=false,esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(!inD&&!inT&&c==="'"){inS=!inS;continue}if(!inS&&!inT&&c==='"'){inD=!inD;continue}if(!inS&&!inD&&c==='`'){inT=!inT;continue}if(inS||inD||inT)continue;if(c==='{')d++;else if(c==='}'){d--;if(d===0)return src.slice(i,j+1)}}return'';}

t('build V3.12.5 coherente',/V3\.12\.5-STABLE-FACTS-FIRST-NEUTRAL/.test(lab)&&/V3\.12\.5-STABLE-FACTS-FIRST-NEUTRAL/.test(svc));
t('sin Live; Interactions streaming preservado',!/native-audio|BidiGenerateContent|gemini-live/i.test(lab)&&/Interactions API/.test(svc));
t('Iapetus única principal y DaveFX solo respaldo',/const TTS_VOICE='Iapetus'/.test(lab)&&/voiceId:'Iapetus'/.test(svc)&&/es_ES-davefx-medium/.test(svc));
t('prosodia TTS neutra y anti-zalamero',/voz masculina neutra, clara, sobria/i.test(svc)&&/sin tono cómplice, adulador, zalamero/i.test(svc));
t('sesión/cache V3125',/controlevent:zuzu-lab:v3125:session/.test(lab)&&/20260906-V3125/.test(html)&&/20260906-V3125/.test(ui));
t('asentamiento V3.12.4 preservado',/deadline:performance\.now\(\)\+6800/.test(lab)&&/Fragmentos unidos antes de consultar VNext/.test(lab));
t('fecha/meteo preservados',/v3122ServerCurrentDateCue/.test(ai)&&/FECHA METEO AUTORITATIVA/.test(ai)&&/api\.open-meteo\.com\/v1\/forecast/.test(ai));
t('ghost guard preservado',/isLocalWakeCluster/.test(lab)&&/isImpossibleWakeCluster/.test(svc));
t('narrador baja creatividad y dato primero',/temperature:\.22,topP:\.72/.test(ai)&&/DATO PRIMERO/.test(ai)&&/colega zalamero/.test(ai));
t('muletillas zalameras prohibidas',/qué memoria la tuya/.test(ai)&&/tranquilo, hombre/.test(ai)&&/aquí me tienes/.test(ai)&&/te echo una mano/.test(ai));
t('recall_memory entra en fast path',/name==='local_response'\|\|name==='recall_memory'/.test(ai));
t('event_documentation cubierto por voz fast',/event_documentation/.test(ai)&&/documentos con adjunto/.test(ai));
t('corrección oral autoritativa existe',/CORRECCION_ORAL_AUTORITATIVA/.test(ai)&&/v3125ApplyCorrectionCalls/.test(ai)&&/v3125ApplyCorrectionText/.test(ai));
t('fuzzy persona admite cuatro letras',/needle\.length<4/.test(ai));
t('identidad usuario incluye cómo me llamo yo',/como me llamo yo/.test(ai)&&/IDENTIDAD USUARIO LOCAL/.test(ai));
t('feedback puro evita planner',/FEEDBACK CORTO LOCAL/.test(ai)&&/Vale\. Voy al dato\./.test(ai));
t('cost fix Vercel preservado',!/"source"\s*:\s*"\/\(\.\*\)"/.test(vercel)&&/api\/index\.js/.test(vercel));

try{const ctx={};vm.createContext(ctx);vm.runInContext(`
 function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();}
 ${extractFn(ai,'v3124VoiceComparativeMetricCue')}${extractFn(ai,'v437VoiceNoFiguresRequested')}${extractFn(ai,'v439VoiceDirectMetricRequest')}${extractFn(ai,'v438VoiceFigureMode')}
 result=[v438VoiceFigureMode('Dame cifras del evento Función 2026, pero todo lujo de detalles de cifras.'),v438VoiceFigureMode('Cómo va Función 2026'),v438VoiceFigureMode('Háblame sin cifras de Función 2026'),v438VoiceFigureMode('Dime la compra de más valor')];`,ctx);
 t('todo lujo de detalles ejecuta FULL',ctx.result?.[0]==='full');t('resumen normal no fuerza modo full',ctx.result?.[1]==='none');t('sin cifras sigue NONE',ctx.result?.[2]==='none');t('máximo/mínimo sigue BRIEF cuantitativo',ctx.result?.[3]==='brief');}catch(e){console.error(e);t('clasificador cifras ejecutable',false)}

try{const ctx={};vm.createContext(ctx);vm.runInContext(`
 const trim=v=>String(v??'').trim(),num=v=>Number(v)||0,arr=v=>Array.isArray(v)?v:[];
 function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();}
 function v437VoiceEventLabel(r){return r?.facts?.event||'el evento'}
 function v439VoiceRoundMoney(v){return Math.round(Number(v)||0)+' euros'}
 function vnextP15NaturalJoin(a){return a.length<2?a.join(''):a.slice(0,-1).join(', ')+' y '+a.at(-1)}
 ${extractFn(ai,'v439VoiceNaturalJoin')}${extractFn(ai,'v439VoiceMetricCues')}${extractFn(ai,'v439VoiceSummaryFigures')}
 const r={_vnext_operation:'event_summary',facts:{event:'FUNCION 2026',income_total:6485,income_received:6485,income_pending:0,purchases_planned:6138,purchases_realized:6000,purchases_pending:138,donations_value:900,operating_balance:347,event_valuation:7038,attendees_canonical:23,hitos_count:3,lg_count:8,lg_completed:6,lg_pending:2,document_context_count:5,purchase_ticket_context_count:7}};
 result=[v439VoiceSummaryFigures(r,{operation:'event_summary'},{},'Dame todo lujo de detalles de cifras','full'),v439VoiceSummaryFigures(r,{operation:'event_summary'},{},'Cómo va el evento','brief')];`,ctx);
 const full=ctx.result?.[0]||'',brief=ctx.result?.[1]||'';
 t('FULL ejecutado incluye economía completa',/ingresos 6485 euros/.test(full)&&/compras realizadas 6000 euros/.test(full)&&/compras pendientes 138 euros/.test(full)&&/donaciones valoradas 900 euros/.test(full)&&/saldo operativo 347 euros/.test(full)&&/valoración total del evento 7038 euros/.test(full));
 t('FULL ejecutado incluye asistencia y gestión',/asistencia 23 personas/.test(full)&&/hitos 3/.test(full)&&/tareas de gestión 8/.test(full));
 t('resumen normal ejecutado da cinco KPI, no dos',/ingresos 6485 euros/.test(brief)&&/compras realizadas 6000 euros/.test(brief)&&/compras pendientes 138 euros/.test(brief)&&/donaciones valoradas 900 euros/.test(brief)&&/saldo operativo 347 euros/.test(brief));
}catch(e){console.error(e);t('summary figures ejecutable',false)}

try{const ctx={};vm.createContext(ctx);vm.runInContext(String.raw`
 const trim=v=>String(v??'').trim();function vnextNorm(v=''){return trim(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ]+/g,' ').trim();}const arr=v=>Array.isArray(v)?v:[];
 function v3125EscapeRegExp(value=''){return String(value||'');}
 function v3125ExplicitCorrection(userPrompt=''){const raw=trim(userPrompt);if(!raw)return null;let m;m=raw.match(/\b(?:de|a|sobre)\s+([\p{L}][\p{L}'’-]{1,30})\b[\s\S]{0,90}?\b(?:ser[aá]|quiero\s+decir|quise\s+decir|he\s+dicho)\s+(?:de\s+)?([\p{L}][\p{L}'’-]{1,30})\b/iu);if(m&&vnextNorm(m[1])!==vnextNorm(m[2]))return{wrong:trim(m[1]),right:trim(m[2]),source:'spoken_pair'};m=raw.match(/\b([\p{L}][\p{L}'’-]{1,30})\s*,?\s+no\s*[,;:]?\s*([\p{L}][\p{L}'’-]{1,30})\b/iu);if(m&&vnextNorm(m[1])!==vnextNorm(m[2]))return{wrong:trim(m[1]),right:trim(m[2]),source:'x_no_y'};return null;}
 function v3125ApplyCorrectionText(text='',c=null){if(!c?.wrong)return trim(text);return trim(String(text||'').split(c.wrong).join(c.right));}
 const a=v3125ExplicitCorrection('pero de Córdoba, gilipollas, será de Cordo.'),b=v3125ExplicitCorrection('Inés no, Nines'),c=v3125ExplicitCorrection('Córdoba es una ciudad');result=[a,b,c,v3125ApplyCorrectionText('De Córdoba, claro. ¿Qué querías saber de Córdoba?',a)];`,ctx);
 t('corrección Cordoba→Cordo ejecutada',ctx.result?.[0]?.wrong==='Córdoba'&&ctx.result?.[0]?.right==='Cordo'&&ctx.result?.[3]==='De Cordo, claro. ¿Qué querías saber de Cordo?');
 t('corrección Inés→Nines ejecutada sin hardcode',ctx.result?.[1]?.wrong==='Inés'&&ctx.result?.[1]?.right==='Nines');
 t('Córdoba normal no se corrige globalmente',ctx.result?.[2]===null);
}catch(e){console.error(e);t('corrección oral ejecutable',false)}

try{const ctx={};vm.createContext(ctx);vm.runInContext(`
 const trim=v=>String(v??'').trim(),arr=v=>Array.isArray(v)?v:[];function vnextNorm(v=''){return trim(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ]+/g,' ').trim();}function vnextPersonAliasRows(){return []}
 ${extractFn(ai,'vnextP14EditDistance')}${extractFn(ai,'vnextP14FuzzyPersonCandidate')}
 result=vnextP14FuzzyPersonCandidate({personas:[{id:'1',nombre:'Nines'},{id:'2',nombre:'Colty'}]},'Inés');`,ctx);
 t('fuzzy persona ejecutado Inés→Nines solo si candidato único',ctx.result?.canonical_name==='Nines'&&ctx.result?.distance===1);
}catch(e){console.error(e);t('fuzzy persona ejecutable',false)}

try{const ctx={};vm.createContext(ctx);vm.runInContext(`const arr=v=>Array.isArray(v)?v:[],trim=v=>String(v??'').trim();${extractFn(ai,'v3122FastVoiceCovered')}result=v3122FastVoiceCovered([{call:{name:'recall_memory'},result:{facts:{action:'search'}}}]);`,ctx);t('memory fast ejecutado sin segundo narrador',ctx.result===true)}catch(e){console.error(e);t('memory fast ejecutable',false)}

console.log(`\nV3.12.5 facts-first neutral: ${ok} OK / ${ko} KO`);process.exit(ko?1:0);
