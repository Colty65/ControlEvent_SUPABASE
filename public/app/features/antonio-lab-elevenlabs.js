const $=id=>document.getElementById(id);
const BUILD='ANTONIO-LAB-V2-ELEVENLABS-WEBRTC';
let ConversationApi=null;
async function loadSdk(){
  if(ConversationApi)return ConversationApi;
  const urls=['https://cdn.jsdelivr.net/npm/@elevenlabs/client@1.18.0/+esm','https://esm.sh/@elevenlabs/client@1.18.0'];
  let last=null;
  for(const url of urls){try{const mod=await import(url);if(mod?.Conversation?.startSession){ConversationApi=mod.Conversation;log('sdk','SDK ElevenLabs cargado',{url});return ConversationApi;}}catch(e){last=e;log('sdk','Falló carga SDK',{url,error:e?.message||String(e)});}}
  throw new Error('No se pudo cargar @elevenlabs/client 1.18.0 desde los CDN previstos: '+(last?.message||''));
}
const S={config:null,agentHealth:null,conversation:null,status:'disconnected',mode:'idle',conversationId:'',events:[],startedAt:0,connectedAt:0,firstSpeakingAt:0,firstMessageAt:0,interruptions:0,lastMode:'',lastUserMessageAt:0,lastAgentMessageAt:0,micPermission:'unknown',micSettings:null,probeSent:false};
function clean(v,max=4000){return String(v==null?'':v).replace(/\u0000/g,'').trim().slice(0,max);}
function safe(v,depth=0){if(depth>4)return '[depth]';if(v==null||['string','number','boolean'].includes(typeof v))return v;if(Array.isArray(v))return v.slice(0,40).map(x=>safe(x,depth+1));if(typeof v==='object'){const o={};for(const [k,val] of Object.entries(v).slice(0,80)){if(/token|api.?key|authorization|signed.?url/i.test(k))o[k]='[redacted]';else o[k]=safe(val,depth+1);}return o;}return clean(v);}
function stamp(){return new Date().toISOString();}
function log(type,message,data){const e={at:stamp(),type:clean(type,60),message:clean(message,1200)};if(data!==undefined)e.data=safe(data);S.events.push(e);if(S.events.length>600)S.events.splice(0,S.events.length-600);const line=`[${new Date().toLocaleTimeString('es-ES')}] ${e.type.toUpperCase()} · ${e.message}${data!==undefined?' · '+JSON.stringify(e.data):''}`;$('log').textContent+=line+'\n';$('log').scrollTop=$('log').scrollHeight;}
function val(x,key){if(x&&typeof x==='object'&&key in x)return x[key];return x;}
function setStatus(status,detail=''){S.status=status;$('status').textContent=status;$('detail').textContent=detail||'';const bad=/ERROR|FALTA|NO CONFIG/i.test(status);$('status').className=bad?'bad':/CONECT|ESCUCH|HABLA|LISTO/i.test(status)?'ok':'';}
function update(){
  $('connection').textContent=S.status==='connected'?'Conectada':S.status==='connecting'?'Conectando…':'Desconectada';
  $('mode').textContent=S.mode==='speaking'?'Hablando':S.mode==='listening'?'Escuchando':S.mode||'—';
  $('mic').textContent=S.micPermission==='granted'?'Permitido':S.micPermission==='denied'?'Denegado':S.micPermission==='prompt'?'Pendiente':'—';
  $('interruptions').textContent=String(S.interruptions);
  $('latency').textContent=S.connectedAt&&S.startedAt?`${S.connectedAt-S.startedAt} ms`:'—';
  $('start').disabled=!S.config?.configured||S.status==='connected'||S.status==='connecting';$('stop').disabled=S.status!=='connected';$('probe').disabled=S.status!=='connected';
}
function appendUtter(id,text,ai=false){text=clean(text,5000);if(!text)return;const host=$(id);if(host.classList.contains('tiny')){host.classList.remove('tiny');host.textContent='';}const d=document.createElement('div');d.className='utter'+(ai?' ai':'');d.textContent=text;host.appendChild(d);host.scrollTop=host.scrollHeight;}
async function permissionState(){try{if(!navigator.permissions?.query)return 'unknown';const p=await navigator.permissions.query({name:'microphone'});return p.state||'unknown';}catch(_){return 'unknown';}}
async function inspectMic(){
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('Este navegador no ofrece getUserMedia.');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  try{const t=stream.getAudioTracks()[0];S.micSettings=safe(t?.getSettings?.()||{});log('micro','Permiso concedido y pista abierta',S.micSettings);}finally{stream.getTracks().forEach(t=>t.stop());}
  S.micPermission=await permissionState();update();
}
function extractMessage(m){if(typeof m==='string')return {text:m,source:''};if(!m||typeof m!=='object')return {text:clean(m),source:''};return {text:clean(m.message||m.text||m.content||m.transcript||m?.message_event?.text||'',5000),source:clean(m.source||m.role||m.type||'',40).toLowerCase(),raw:safe(m)};}
async function loadConfig(){
  S.micPermission=await permissionState();
  const [cfgRes,healthRes]=await Promise.all([fetch('/api/antonio-lab/config',{cache:'no-store'}),fetch('/api/antonio-lab/health',{cache:'no-store'})]);
  S.config=await cfgRes.json();S.agentHealth=await healthRes.json().catch(()=>({ok:false,error:'No se pudo leer health'}));
  $('build').textContent=`${S.config.build||BUILD} · SDK ${S.config.sdkVersion||'1.18.0'}`;
  log('config','Configuración recibida',{config:S.config,agentHealth:S.agentHealth});
  if(!S.config.configured){setStatus('FALTA CONFIGURAR','Añade ELEVENLABS_AGENT_ID en Vercel. Para agente privado añade también ELEVENLABS_API_KEY.');$('mainPanel').classList.add('configMissing');}
  else if(S.agentHealth?.ok===false){setStatus('CONFIG CON AVISO',S.agentHealth.error||'No pude inspeccionar el agente. Puedes intentar conectar.');}
  else setStatus('LISTO','Una sola pulsación para abrir la conversación WebRTC.');
  update();
}
async function getSessionCredential(){const r=await fetch('/api/antonio-lab/conversation-token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});const p=await r.json().catch(()=>({}));if(!r.ok||p.ok===false)throw new Error(p.error||`Token HTTP ${r.status}`);return p;}
async function start(){
  if(S.status==='connected'||S.status==='connecting')return;S.startedAt=Date.now();S.connectedAt=0;S.firstSpeakingAt=0;S.firstMessageAt=0;S.interruptions=0;S.probeSent=false;setStatus('CONECTANDO','Pidiendo micrófono y abriendo ElevenLabs por WebRTC…');S.status='connecting';update();log('start','Inicio de sesión solicitado');
  try{
    await inspectMic();const [cred,Conversation]=await Promise.all([getSessionCredential(),loadSdk()]);log('auth',`Credencial recibida en modo ${cred.mode}`);
    const options={connectionType:'webrtc',useWakeLock:true,
      onConnect:(info)=>{S.connectedAt=Date.now();S.status='connected';S.conversationId=clean(info?.conversationId||info?.conversation_id||info||'',300);setStatus('CONECTADO','Antonio está escuchando. Habla con normalidad.');log('connect','WebRTC conectado',safe(info));update();},
      onDisconnect:(info)=>{S.status='disconnected';S.mode='idle';setStatus('DESCONECTADO','La sesión terminó.');log('disconnect','Sesión cerrada',safe(info));update();},
      onStatusChange:(x)=>{const s=clean(val(x,'status'),60).toLowerCase();if(s)S.status=s;log('status',s||'cambio de estado',safe(x));update();},
      onModeChange:(x)=>{const m=clean(val(x,'mode'),60).toLowerCase();if(m){if(m==='speaking'&&!S.firstSpeakingAt)S.firstSpeakingAt=Date.now();S.lastMode=S.mode;S.mode=m;if(m==='speaking')setStatus('ANTONIO HABLA','Empieza a hablarle encima cuando quieras interrumpirlo.');else if(m==='listening')setStatus('TE ESCUCHA','Habla normal.');}log('mode',m||'cambio de modo',safe(x));update();},
      onMessage:(m)=>{const {text,source,raw}=extractMessage(m);if(!S.firstMessageAt)S.firstMessageAt=Date.now();log('message',`${source||'unknown'}: ${text||'[sin texto]'}`,raw);if(source==='user'||source==='human'){if(S.mode==='speaking'){S.interruptions++;log('interrupt','Usuario habló mientras Antonio estaba hablando');}S.lastUserMessageAt=Date.now();appendUtter('userText',text||JSON.stringify(raw));}else if(source==='ai'||source==='agent'){S.lastAgentMessageAt=Date.now();appendUtter('agentText',text||JSON.stringify(raw),true);}else if(text){appendUtter('agentText',text,true);}update();},
      onError:(e)=>{const msg=clean(e?.message||e,1600)||'Error de ElevenLabs';setStatus('ERROR',msg);log('error',msg,safe(e));update();},
      onDebug:(e)=>{log('debug','Evento SDK',safe(e));},
      onVadScore:(e)=>{const n=Number(e?.vadScore??e?.vad_score??e);if(Number.isFinite(n)&&n>.72)log('vad',`voz detectada ${n.toFixed(2)}`);}
    };
    if(cred.mode==='private')options.conversationToken=cred.conversationToken;else options.agentId=cred.agentId||S.config.agentId;
    S.conversation=await Conversation.startSession(options);
    if(S.status!=='connected'){S.status='connected';S.connectedAt=S.connectedAt||Date.now();setStatus('CONECTADO','Antonio está escuchando.');update();}
    log('session','startSession completado',{conversationId:S.conversation?.conversationId||S.conversationId||''});
  }catch(error){S.status='disconnected';setStatus('ERROR',clean(error?.message||error,1200));log('error',clean(error?.stack||error,3000));update();}
}
async function stop(){try{await S.conversation?.endSession?.();}catch(e){log('error','Error cerrando sesión',safe(e));}finally{S.conversation=null;S.status='disconnected';S.mode='idle';setStatus('DESCONECTADO','Sesión terminada manualmente.');update();}}
function probe(){if(!S.conversation?.sendUserMessage)return log('probe','El SDK no expone sendUserMessage en esta sesión.');S.probeSent=true;S.conversation.sendUserMessage('Responde solo: Te oigo perfectamente.');log('probe','Mensaje de prueba enviado');}
function diagnostic(){return {type:'ControlEvent Antonio LAB diagnostic',generatedAt:stamp(),build:S.config?.build||BUILD,provider:'ElevenLabs Agents',sdkVersion:S.config?.sdkVersion||'1.18.0',environment:{url:location.href,userAgent:navigator.userAgent,platform:navigator.platform||'',language:navigator.language||'',secureContext:window.isSecureContext,online:navigator.onLine,hardwareConcurrency:navigator.hardwareConcurrency||null,connection:safe(navigator.connection||{}),mediaDevices:Boolean(navigator.mediaDevices),microphonePermission:S.micPermission,micSettings:S.micSettings},config:safe(S.config),agentHealth:safe(S.agentHealth),state:{status:S.status,mode:S.mode,conversationId:S.conversation?.conversationId||S.conversationId||''},metrics:{connectMs:S.connectedAt&&S.startedAt?S.connectedAt-S.startedAt:null,firstSpeakingMs:S.firstSpeakingAt&&S.startedAt?S.firstSpeakingAt-S.startedAt:null,firstMessageMs:S.firstMessageAt&&S.startedAt?S.firstMessageAt-S.startedAt:null,interruptions:S.interruptions},events:S.events.slice(-300)};}
function downloadBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},800);}
function saveJson(){const d=diagnostic();downloadBlob(new Blob([JSON.stringify(d,null,2)],{type:'application/json'}),`Antonio-LAB-diagnostico-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);log('diagnostic','JSON descargado');}
async function savePdf(){try{const d=diagnostic();const r=await fetch('/api/antonio-lab/diagnostic-pdf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});if(!r.ok)throw new Error(`PDF HTTP ${r.status}`);downloadBlob(await r.blob(),`Antonio-LAB-diagnostico-${new Date().toISOString().replace(/[:.]/g,'-')}.pdf`);log('diagnostic','PDF descargado');}catch(e){log('error','No pude generar PDF',safe(e));}}
async function copyDiag(){try{await navigator.clipboard.writeText(JSON.stringify(diagnostic(),null,2));log('diagnostic','Diagnóstico copiado al portapapeles');}catch(e){log('error','No se pudo copiar',safe(e));}}
$('start').addEventListener('click',start);$('stop').addEventListener('click',stop);$('probe').addEventListener('click',probe);$('json').addEventListener('click',saveJson);$('pdf').addEventListener('click',savePdf);$('copy').addEventListener('click',copyDiag);window.addEventListener('beforeunload',()=>{try{S.conversation?.endSession?.();}catch(_){}});
loadConfig().catch(e=>{setStatus('ERROR',clean(e?.message||e));log('error','Carga inicial',safe(e));update();});
log('lab','Antonio LAB V2 cargado. No se ha pedido todavía permiso de micrófono.');update();
