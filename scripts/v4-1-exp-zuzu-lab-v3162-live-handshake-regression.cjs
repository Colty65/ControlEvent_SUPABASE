const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
const root=path.resolve(__dirname,'..');
let ok=0;function t(cond,msg){if(!cond)throw new Error('KO: '+msg);ok++;console.log('OK',ok,'-',msg)}
(async()=>{
  const client=fs.readFileSync(path.join(root,'public/app/features/antonio-lab-v3.js'),'utf8');
  const service=fs.readFileSync(path.join(root,'services/antonio-lab.service.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'public/antonio-lab.html'),'utf8');
  t(client.includes("ZUZU-LAB-V3.16.2-LIVE-HANDSHAKE-STABLE"),'build cliente V3.16.2');
  t(service.includes("ZUZU-LAB-V3.16.2-LIVE-HANDSHAKE-STABLE"),'build servidor V3.16.2');
  t(client.includes("gemini-2.5-flash-native-audio-preview-12-2025"),'una boca Live 2.5');
  t(!client.includes("gemini-3.1-flash-live-preview"),'cliente no alterna a Live 3.1');
  t(client.includes('BidiGenerateContentConstrained?access_token='),'usa endpoint constrained de token efímero');
  t(client.includes("Object.prototype.hasOwnProperty.call(msg,'setupComplete')"),'detecta setupComplete aunque sea objeto vacío');
  t(client.includes('10000 ms'),'handshake no se mata a los 3.5 s');
  t(client.includes('liveLastServerMessage'),'diagnóstico conserva último mensaje servidor');
  t(client.includes("clientContent:{turns:[{role:'user',parts:[{text}]"),'envío final literal por clientContent');
  t(client.includes('turnComplete:true'),'turno de boca se cierra explícitamente');
  t(service.includes('bidiGenerateContentSetup:antonioLiveSetup(selected)'),'token intenta setup bloqueado REST');
  t(service.includes('setupLocked=false'),'token cae a formato mínimo si la cuenta no reconoce setup bloqueado');
  t(!client.includes('/api/antonio-lab/tts-stream'),'cliente no usa TTS de respaldo agotado');
  t(html.includes('V3162-LIVE-HANDSHAKE'),'cache bust V3.16.2');
  t(client.includes("if(!n.startsWith('hola'))return false"),'saludo social corto tolera vocativo STT imperfecto');

  // Simula el endpoint de token para verificar el cuerpo real que genera el servicio sin tocar Google.
  const oldFetch=global.fetch, oldKey=process.env.GEMINI_API_KEY; process.env.GEMINI_API_KEY='AIzaTEST';
  const mod=await import(pathToFileURL(path.join(root,'services/antonio-lab.service.js')).href+'?v3162='+Date.now());
  let bodies=[];
  global.fetch=async(_url,opt)=>{bodies.push(JSON.parse(opt.body));return new Response(JSON.stringify({name:'auth_tokens/fake'}),{status:200,headers:{'content-type':'application/json'}})};
  let r=await mod.createAntonioLiveToken({model:'gemini-2.5-flash-native-audio-preview-12-2025'});
  t(r.setupLocked===true,'token bloqueado aceptado se reporta correctamente');
  t(Array.isArray(bodies[0]?.bidiGenerateContentSetup?.generationConfig?.responseModalities),'setup token contiene responseModalities AUDIO');
  t(bodies[0]?.bidiGenerateContentSetup?.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName==='Iapetus','setup token fija Iapetus');
  t(bodies[0]?.bidiGenerateContentSetup?.systemInstruction?.parts?.[0]?.text?.includes('BOCA de Zuzu'),'setup token fija instrucción de boca');

  bodies=[];let n=0;
  global.fetch=async(_url,opt)=>{bodies.push(JSON.parse(opt.body));n++;if(n===1)return new Response(JSON.stringify({error:{message:'Invalid JSON payload received. Unknown name "bidiGenerateContentSetup" at auth_token: Cannot find field.'}}),{status:400,headers:{'content-type':'application/json'}});return new Response(JSON.stringify({name:'auth_tokens/fallback'}),{status:200,headers:{'content-type':'application/json'}})};
  r=await mod.createAntonioLiveToken({});
  t(r.setupLocked===false,'si backend no reconoce setup bloqueado usa token mínimo conocido');
  t(bodies.length===2&&!('bidiGenerateContentSetup' in bodies[1]),'segundo intento elimina solo el campo incompatible');
  global.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
  console.log(`\nV3.16.2 LIVE HANDSHAKE: ${ok}/${ok} OK`);
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
