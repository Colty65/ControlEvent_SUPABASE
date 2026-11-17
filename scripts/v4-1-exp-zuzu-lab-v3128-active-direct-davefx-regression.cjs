const fs=require('fs'),path=require('path'),vm=require('vm');
const R=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(R,p),'utf8');
const lab=read('public/app/features/antonio-lab-v3.js'),svc=read('services/antonio-lab.service.js'),ai=read('services/event-ai.service.js'),html=read('public/antonio-lab.html'),ui=read('public/app/features/zuzu-test-console-gd.js'),routes=read('routes/antonio-lab.routes.js'),vercel=read('vercel.json');
let ok=0,ko=0;function t(n,c){if(c){ok++;console.log('OK',n)}else{ko++;console.error('KO',n)}}
function extractFn(src,name){const i=src.indexOf(`function ${name}`);if(i<0)return'';const p0=src.indexOf('(',i);if(p0<0)return'';let pd=0,body=-1;for(let j=p0;j<src.length;j++){const c=src[j];if(c==='(')pd++;else if(c===')'){pd--;if(pd===0){body=src.indexOf('{',j);break}}}if(body<0)return'';let d=0,inS=false,inD=false,inT=false,esc=false;for(let j=body;j<src.length;j++){const c=src[j];if(esc){esc=false;continue}if(c==='\\'){esc=true;continue}if(!inD&&!inT&&c==="'"){inS=!inS;continue}if(!inS&&!inT&&c==='"'){inD=!inD;continue}if(!inS&&!inD&&c==='`'){inT=!inT;continue}if(inS||inD||inT)continue;if(c==='{')d++;else if(c==='}'){d--;if(d===0)return src.slice(i,j+1)}}return'';}

t('build V3.12.8 coherente',/V3\.12\.8-STABLE-ACTIVE-DIRECT-DAVEFX/.test(lab)&&/V3\.12\.8-STABLE-ACTIVE-DIRECT-DAVEFX/.test(svc)&&/V3\.12\.8/.test(html)&&/V3\.12\.8/.test(ui));
t('ruta VOZ está antes del Ledger',ai.indexOf("if(voiceConversation===true)")>ai.indexOf('export async function analyzeEventPrompt')&&ai.indexOf("if(voiceConversation===true)")<ai.indexOf('return await runZuzuV73Ledger',ai.indexOf('export async function analyzeEventPrompt')));
t('voz intenta CE directo real antes de P2-R',/const direct=await v281TryDirectRoute/.test(ai)&&/return await runZuzuVNextP2Agent/.test(ai));
t('rama oral no entra al Ledger',/runZuzuV73Ledger\(\{userPrompt,state,selectedEventId,flowTrace,voiceConversation:false/.test(ai));
t('compras v29 ya no hardcodea realized',/status:trim\(task\?\.filters\?\.status\)\|\|'realized'/.test(ai));
t('parser v29 distingue compras pending/realized',/asksPendingPurchases/.test(ai)&&/task\.filters\.status=asksPendingPurchases/.test(ai));
t('responsables naturales activan agrupación',/personas\?\\s\+\(\?:encargadas\?\|responsables\?\)/.test(ai)||/asksResponsibleList/.test(ai));
t('respuesta de cuántas pendientes usa count + total',/asksCount/.test(ai)&&/hay \$\{v26CountPhrase\(lines\.length/.test(ai));
t('respuesta responsables enumera nombres reales',/responsables de compras \$\{statusLabel\}/.test(ai)&&/r\.Responsable/.test(ai));
t('respuesta detallada enumera filas reales',/compras \$\{statusLabel\}, una por una/.test(ai)&&/r\.Producto/.test(ai)&&/r\.Responsable/.test(ai)&&/r\.Tienda/.test(ai));
t('donantes pedidos por nombre se enumeran',/asksDonorNames/.test(ai)&&/r\.Donante/.test(ai));
t('qué donó cada uno enumera producto real',/asksEachDonation/.test(ai)&&/r\.Producto/.test(ai));

t('DaveFX masculino es voz primaria local',/DAVEFX_VOICE_ID='es_ES-davefx-medium'/.test(lab)&&/daveFxSpeak/.test(lab)&&/S\.ttsProvider='davefx'/.test(lab));
t('no se elige una voz española aleatoria',/maleSystemVoiceScore/.test(lab)&&/else return -999/.test(lab));
t('cliente no llama TTS de pago',!/\/api\/antonio-lab\/tts-stream/.test(lab));
t('endpoint TTS pago sigue bloqueado 410',/tts-stream/.test(routes)&&/status\(410\)/.test(routes));
t('config anuncia DaveFX 0 coste',/local-vits-web/.test(svc)&&/es_ES-davefx-medium/.test(svc)&&/coste TTS 0/.test(svc));
t('coste visible está desglosado',/STT \$/.test(lab)&&/Cerebro €/.test(lab)&&/TTS €0/.test(lab)&&/brainCostEur/.test(lab));
t('saludo local ya no entra en bucle Sí dime',/Hola\. ¿Qué necesitas\?/.test(lab));
t('Dime se resuelve local sin cerebro',/function isOpenPromptOnly/.test(lab)&&/return 'Te escucho\.'/ .test(lab));
t('queja/meta social se resuelve local',/function isSocialMetaOnly/.test(lab)&&/saludo/.test(lab)&&/vaya mierda/.test(lab));
t('diagnóstico guarda STT+cerebro+TTS',/estimatedSttUsd/.test(lab)&&/brainCostEur/.test(lab)&&/estimatedTtsUsd:0/.test(lab));
t('HTML no dice Gemini TTS principal',!/voz principal se genera en streaming con Gemini/i.test(html)&&/DaveFX masculino local/.test(html));
t('cost fix Vercel preservado',!/"source"\s*:\s*"\/\(\.\*\)"/.test(vercel)&&/api\/index\.js/.test(vercel));

// Conservamos una prueba ejecutable del formateador P2 que ya filtra PENDIENTE.
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
  const r={_vnext_operation:'event_purchases',facts:{event:'FUNCION 2026',status:'all',pending_purchase_count:3,pending_purchase_amount:60},tables:[{key:'purchase_lines',rows:[
    {Producto:'Pan',Responsable:'Nines',Importe:10,Tienda:'A',Tipo:'PENDIENTE',Unidades:2},
    {Producto:'Carne',Responsable:'Cordo',Importe:20,Tienda:'B',Tipo:'PENDIENTE',Unidades:1},
    {Producto:'Hielo',Responsable:'Nines',Importe:30,Tienda:'C',Tipo:'PENDIENTE',Unidades:3},
    {Producto:'Refresco',Responsable:'Cito',Importe:40,Tienda:'D',Tipo:'REALIZADA',Unidades:4}
  ]}]};
  result={status:v3127PurchaseStatusFromPrompt('¿Cuántas compras hay pendientes?'),count:v3127WrittenPurchaseDetail(r,{operation:'event_purchases'},{},'¿Cuántas compras hay pendientes?'),resp:v3127WrittenPurchaseDetail(r,{operation:'event_purchases'},{},'Dame las compras pendientes y las personas encargadas de comprarlas'),full:v3127WrittenPurchaseDetail(r,{operation:'event_purchases'},{},'Dame información muy detallada de las compras pendientes y las personas responsables, tienda e importe')};
 `,ctx);
 t('P2 parser sigue detectando pending',ctx.result?.status==='pending');
 t('P2 pending no mezcla realizada',/3 compras pendientes/.test(ctx.result?.count||'')&&!/Refresco/.test(ctx.result?.count||''));
 t('P2 responsables devuelve Nines/Cordo no Cito',/Nines/.test(ctx.result?.resp||'')&&/Cordo/.test(ctx.result?.resp||'')&&!/Cito/.test(ctx.result?.resp||''));
 t('P2 detalle contiene productos pendientes',/Pan/.test(ctx.result?.full||'')&&/Carne/.test(ctx.result?.full||'')&&/Hielo/.test(ctx.result?.full||'')&&!/Refresco/.test(ctx.result?.full||''));
}catch(e){console.error(e);t('formateador P2 ejecutable',false)}
console.log(`\nV3.12.8 active direct + DaveFX: ${ok} OK / ${ko} KO`);process.exit(ko?1:0);
