const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),ai=read('services/event-ai.service.js'),html=read('public/antonio-lab.html'),ui=read('public/app/features/zuzu-test-console-gd.js'),routes=read('routes/antonio-lab.routes.js'),vercel=read('vercel.json');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
function extractFn(src,name){const i=src.indexOf(`function ${name}`);if(i<0)return'';const p0=src.indexOf('(',i);if(p0<0)return'';let pd=0,body=-1;for(let j=p0;j<src.length;j++){const c=src[j];if(c==='(')pd++;else if(c===')'){pd--;if(pd===0){body=src.indexOf('{',j);break}}}if(body<0)return'';let d=0,inS=false,inD=false,inT=false,esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(!inD&&!inT&&c==="'"){inS=!inS;continue}if(!inS&&!inT&&c==='"'){inD=!inD;continue}if(!inS&&!inD&&c==='`'){inT=!inT;continue}if(inS||inD||inT)continue;if(c==='{')d++;else if(c==='}'){d--;if(d===0)return src.slice(i,j+1)}}return'';}

t('build V3.12.7 coherente',/V3\.12\.7-STABLE-DIRECT-DATA-LOCAL-TTS/.test(lab)&&/V3\.12\.7-STABLE-DIRECT-DATA-LOCAL-TTS/.test(svc)&&/V3\.12\.7/.test(html)&&/V3\.12\.7/.test(ui));
t('speechSynthesis local activo',/SpeechSynthesisUtterance/.test(lab)&&/speechSynthesis\.speak/.test(lab)&&/LOCAL_TTS_LANG='es-ES'/.test(lab));
t('cliente no llama al TTS de pago',!/\/api\/antonio-lab\/tts-stream/.test(lab));
t('endpoint TTS de pago bloqueado 410',/tts-stream/.test(routes)&&/status\(410\)/.test(routes)&&/TTS de pago desactivado/.test(routes));
t('servicio premium TTS inutilizado',!/gemini-3\.1-flash-tts-preview|v1beta\/interactions|Iapetus/.test(svc)&&/streamZuzuTts\(\)/.test(svc)&&/status=410/.test(svc));
t('config declara voz local 0 coste',/browser-speechSynthesis/.test(svc)&&/coste TTS 0/.test(svc));
t('cerebro devuelve answer escrito como fuente oral',/const written=clean\(out\?\.answer/.test(lab)&&/la boca local leerá el ANSWER factual/.test(lab));
t('coste cliente fija TTS a cero',/estimatedTtsUsd:0/.test(lab)&&/geminiTtsCostUsd/.test(lab)===false);
t('HTML informa voz local gratuita',/Voz local del dispositivo · 0 €/.test(html));
t('estado PENDIENTE se fuerza desde petición explícita',/v3127PurchaseStatusFromPrompt/.test(ai)&&/ESTADO COMPRA AUTORITATIVO/.test(ai)&&/a\.purchase_status=explicitPromptStatus/.test(ai));
t('respuesta escrita de compras tiene detalle específico',/v3127WrittenPurchaseDetail/.test(ai)&&/Responsables:/.test(ai)&&/Detalle:/.test(ai));
t('P2 usa detalle escrito V3.12.7',/v3127WrittenRequestedDetail\(x\.result,x\.args,stForVoice,userPrompt\)/.test(ai));
t('voz P2 deriva directamente de writtenAnswer',/ANSWER DIRECTO A BOCA LOCAL/.test(ai)&&/spokenAnswer=v440HumanizeMachineTime\(writtenAnswer/.test(ai));
t('P2 no usa segundo narrador natural en su bloque oral',!/const n0=Date\.now\(\),natural=await v311NaturalVoiceNarrator/.test(ai.slice(ai.indexOf('async function runZuzuVNextP2Agent'),ai.indexOf('async function runZuzuVNextP13Agent'))));
t('narración opcional Gemini queda solo para modo escrito',/const needsOptionalNarration=good\.length&&!voiceConversation&&vnextP2NeedsNarration/.test(ai));
t('feedback corto local evita llamada IA',/isComplaintOnly/.test(lab)&&/return 'Vale\.'/g.test(lab)&&/encima\\s\+caro/.test(ai));
t('cost fix Vercel preservado',!/"source"\s*:\s*"\/\(\.\*\)"/.test(vercel)&&/api\/index\.js/.test(vercel));

try{
 const ctx={};vm.createContext(ctx);vm.runInContext(`
  const trim=v=>String(v??'').trim(),arr=v=>Array.isArray(v)?v:[],num=v=>Number(v)||0;
  function vnextP17LooseNorm(v=''){return String(v||'').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\\s+/g,' ').trim();}
  function vnextP1Table(r,k){return (r?.tables||[]).find(x=>x.key===k)}
  function v437VoiceEventLabel(r){return r?.facts?.event||'el evento'}
  function v26Money(v){return Math.round((Number(v)||0)*100)/100}
  function v26FormatEuro(v){return Number(v).toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'}
  ${extractFn(ai,'v3127PurchaseStatusFromPrompt')}
  ${extractFn(ai,'v3127PurchaseRowsForAnswer')}
  ${extractFn(ai,'v3127PurchaseAnswerCues')}
  ${extractFn(ai,'v3127GroupPurchaseRowsByResponsible')}
  ${extractFn(ai,'v3127WrittenPurchaseDetail')}
  const r={_vnext_operation:'event_purchases',facts:{event:'FUNCION 2026',status:'all',pending_purchase_count:3,pending_purchase_amount:90},tables:[{key:'purchase_lines',rows:[
    {Producto:'Pan',Responsable:'Nines',Importe:10,Tienda:'A',Tipo:'PENDIENTE',Unidades:2},
    {Producto:'Carne',Responsable:'Cordo',Importe:50,Tienda:'B',Tipo:'PENDIENTE',Unidades:1},
    {Producto:'Hielo',Responsable:'Nines',Importe:30,Tienda:'C',Tipo:'PENDIENTE',Unidades:3},
    {Producto:'Refresco',Responsable:'Cito',Importe:40,Tienda:'D',Tipo:'REALIZADA',Unidades:4}
  ]}]};
  result={
    status:v3127PurchaseStatusFromPrompt('¿Cuántas compras hay pendientes?'),
    count:v3127WrittenPurchaseDetail(r,{operation:'event_purchases'},{},'¿Cuántas compras hay pendientes?'),
    resp:v3127WrittenPurchaseDetail(r,{operation:'event_purchases'},{},'Dame las compras pendientes y las personas encargadas de comprarlas'),
    full:v3127WrittenPurchaseDetail(r,{operation:'event_purchases'},{},'Dame información muy detallada de las compras pendientes y las personas responsables, tienda e importe')
  };
 `,ctx);
 t('parser detecta pending',ctx.result?.status==='pending');
 t('cuántas pendientes responde 3 y 90, no realizadas',/3 compras pendientes/.test(ctx.result?.count||'')&&/90,00 €/.test(ctx.result?.count||'')&&!/Refresco/.test(ctx.result?.count||''));
 t('responsables pendientes devuelve Nines y Cordo',/Nines/.test(ctx.result?.resp||'')&&/Cordo/.test(ctx.result?.resp||'')&&!/Cito/.test(ctx.result?.resp||''));
 t('detalle completo devuelve cada producto, responsable e importe',/Pan/.test(ctx.result?.full||'')&&/Carne/.test(ctx.result?.full||'')&&/Hielo/.test(ctx.result?.full||'')&&/Nines/.test(ctx.result?.full||'')&&/Cordo/.test(ctx.result?.full||'')&&/10,00 €/.test(ctx.result?.full||'')&&/50,00 €/.test(ctx.result?.full||'')&&!/Refresco/.test(ctx.result?.full||''));
}catch(e){console.error(e);t('formateador de compras ejecutable',false)}

console.log(`\nV3.12.7 direct data + local TTS: ${ok} OK / ${ko} KO`);process.exit(ko?1:0);
