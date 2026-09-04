const fs=require('fs');
const path=require('path');
const assert=require('assert');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let ok=0;function t(name,fn){try{fn();ok++;console.log('OK',name);}catch(e){console.error('KO',name,'-',e.message);process.exitCode=1;}}

const idx=read('public/index.html');
const live=read('public/app/features/voice-next1-zuzu.js');
const ui=read('public/app/features/v11-3-zuzu-analitica-libre.js');
const srv=read('services/zuzu-live.service.js');
const app=read('server/app.js');

t('bundle carga VOICE-NEXT y no el módulo v22 antiguo',()=>{assert(idx.includes('voice-next1-zuzu.js'));assert(!idx.includes('v22-voz3-zuzu.js'));});
t('cliente nuevo no usa Web Speech ni speechSynthesis',()=>{assert(!/window\.speechSynthesis|new\s+SpeechSynthesisUtterance|webkitSpeechRecognition|window\.SpeechRecognition/.test(live));});
t('cliente nuevo no usa MediaRecorder',()=>{assert(!/\bMediaRecorder\b/.test(live.replace(/comentario[^\n]*/gi,'')));});
t('no existen controles Auto Leer voz o micro en VOICE-NEXT',()=>{['ceVoz3AutoRead','ceVoz3Read','ceVoz3VoiceChoice','ceVoz3MicChoice'].forEach(x=>assert(!live.includes(x)));});
t('un solo transporte: PCM 16k entrada y PCM 24k salida',()=>{assert(live.includes("audio/pcm;rate=16000"));assert(live.includes('createBuffer(1,pcm.length,24000)'));});
t('barge-in del servidor Live vacía audio local',()=>{assert(live.includes('content.interrupted'));assert(live.includes("stopPlayback('barge-in Live')"));});
t('aliases Zuzu Antonio y controles naturales',()=>{['zuzu','zuzito','antonio','antonito','perdona','calla','joder'].forEach(x=>assert(live.toLowerCase().includes(x)));});
t('Live solo enruta al tool route_voice_turn',()=>{assert(srv.includes("name: 'route_voice_turn'"));assert(srv.includes('NO eres el cerebro de negocio'));});
t('voz estándar Algenib y Live 2.5 estable',()=>{assert(srv.includes("'Algenib'"));assert(srv.includes('gemini-2.5-flash-native-audio-preview-12-2025'));});
t('token efímero de un uso y API key no llega al cliente',()=>{assert(srv.includes('uses: 1'));assert(srv.includes('bidiGenerateContentSetup: setup'));assert(!live.includes('GEMINI_API_KEY'));});
t('VNext es permanente y botón no se renderiza',()=>{assert(ui.includes('function isZuzuVNextMode(){ return true; }'));assert(!ui.includes('id="ceAiVNextMode" title='));});
t('server monta ruta Live',()=>{assert(app.includes("zuzuLiveRoutes"));assert(app.includes("app.use('/api', zuzuLiveRoutes)"));});
t('sin mazo de entretenimiento en el cliente nuevo',()=>{assert(!/ENTERTAINMENT_PHRASES|Ummmmm|besitos muá/.test(live));});

(async()=>{
  const oldFetch=global.fetch;const oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY='AIza_TEST_ONLY';let captured=null;
  global.fetch=async (url,opts)=>{captured={url,opts,body:JSON.parse(opts.body)};return{ok:true,status:200,json:async()=>({name:'ephemeral-test-token'})};};
  try{
    const mod=await import(path.join(root,'services/zuzu-live.service.js')+'?test='+Date.now());
    const r=await mod.createZuzuLiveToken();
    t('servicio crea token restringido con setup Live',()=>{assert.strictEqual(r.token,'ephemeral-test-token');assert(captured.url.includes('/v1beta/auth_tokens'));assert.strictEqual(captured.body.uses,1);assert(captured.body.bidiGenerateContentSetup.tools[0].functionDeclarations[0].name==='route_voice_turn');});
  }catch(e){console.error('KO servicio token -',e);process.exitCode=1;}
  finally{global.fetch=oldFetch;if(oldKey==null)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
  console.log(`VOICE-NEXT 1: ${ok}/14 OK`);
})();
