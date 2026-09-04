/* ControlEvent v4_1_exp · VOICE-NEXT 1
   Capa oral nueva, aislada del sistema histórico de voz.
   UNA entrada: micrófono PCM -> Gemini Live.
   UNA salida: audio nativo Gemini Live (Antonio/Zuzu).
   El cerebro sigue siendo VNext/CE mediante el tool route_voice_turn.
   Sin Web Speech, voces del navegador, grabadores antiguos, Auto, Leer,
   selector de voz, selector de micrófono ni frases de entretenimiento. */
(function(){
  'use strict';
  if(window.__ceVoiceNext1) return;
  window.__ceVoiceNext1=true;

  var BUILD='v4_1_exp-VOICE-NEXT-1-V1';
  var WS_OPEN=1;
  var state={
    phase:'BOOT', active:false, activating:false, needsGesture:false, awake:false,
    ws:null, wsReady:false, intentionalClose:false, reconnectTimer:null,
    setup:null, model:'', voice:'Antonio',
    stream:null, audioContext:null, micSource:null, processor:null, silentGain:null,
    inputSampleRate:48000, transcriptBuffer:'',
    pendingCeTool:null, pendingCePrompt:'', requestInFlight:false,
    allowAudio:false, suppressUntilTurnComplete:false, speaking:false,
    playbackCursor:0, playbackSources:new Set(),
    lastError:'', lastUserText:'', lastOutputText:'',
    setupCompletedAt:0, activatedAt:0, firstAudioAt:0
  };

  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){var s=clean(v);try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(_){}return s.toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\s+/g,' ').trim();}
  function $(id){return document.getElementById(id);}
  function overlayOpen(){return !!$('ceGeminiLibreOverlay');}
  function setPhase(p,detail){state.phase=clean(p||'IDLE').toUpperCase();try{console.info('[VOICE-NEXT 1]',state.phase,clean(detail||''));}catch(_){}updateBadge();updateOverlayStatus();}
  function setError(err){state.lastError=clean(err&&err.message||err||'Error de voz');setPhase('ERROR',state.lastError);}

  function badge(){return $('ceVoiceNextBadge');}
  function injectStyle(){
    if($('ceVoiceNextStyle'))return;
    var st=document.createElement('style');st.id='ceVoiceNextStyle';st.textContent='\n'+
      '.ce-voice-next-badge{position:fixed;right:18px;bottom:18px;z-index:99980;border:1px solid #cbd5e1;background:rgba(255,255,255,.97);color:#334155;border-radius:999px;padding:8px 12px;font-size:11px;font-weight:900;box-shadow:0 7px 22px rgba(15,23,42,.15);cursor:pointer;user-select:none}'+
      '.ce-voice-next-badge.is-ready{border-color:#86efac;background:#f0fdf4;color:#166534}.ce-voice-next-badge.is-awake{border-color:#fdba74;background:#fff7ed;color:#9a3412}.ce-voice-next-badge.is-speaking{border-color:#93c5fd;background:#eff6ff;color:#1d4ed8}.ce-voice-next-badge.is-error{border-color:#fca5a5;background:#fef2f2;color:#b91c1c}'+
      '#ceVoiceNextStatus{display:inline-flex;align-items:center;min-height:30px;padding:5px 9px;border:1px solid #dbeafe;border-radius:9px;background:#f8fafc;color:#334155;font-size:10px;font-weight:900;white-space:nowrap}';
    document.head.appendChild(st);
  }
  function injectBadge(){
    if(badge()||!document.body)return;
    var b=document.createElement('button');b.id='ceVoiceNextBadge';b.type='button';b.className='ce-voice-next-badge';
    b.addEventListener('click',function(ev){try{ev.preventDefault();ev.stopPropagation();}catch(_){}activate(true);});
    document.body.appendChild(b);updateBadge();
  }
  function updateBadge(){
    var b=badge();if(!b)return;
    b.className='ce-voice-next-badge';
    if(state.phase==='ERROR'){b.classList.add('is-error');b.textContent='🎙 Activar Antonio';b.title=state.lastError||'Reintentar conversación';return;}
    if(state.needsGesture||!state.active){b.textContent='🎙 Activar conversación';b.title='Un único toque habilita micrófono y voz de Antonio';return;}
    if(state.speaking){b.classList.add('is-speaking');b.textContent='🔊 Antonio · puedes interrumpir';return;}
    if(state.awake){b.classList.add('is-awake');b.textContent='🎙 Antonio · te escucha';return;}
    b.classList.add('is-ready');b.textContent='👂 Hola Zuzu · Hola Antonio';
  }
  function ensureOverlayStatus(){
    var overlay=$('ceGeminiLibreOverlay');if(!overlay||$('ceVoiceNextStatus'))return;
    var toolbar=overlay.querySelector('.ce-ai-toolbar');if(!toolbar)return;
    var s=document.createElement('span');s.id='ceVoiceNextStatus';s.textContent='Antonio · iniciando';toolbar.appendChild(s);updateOverlayStatus();
  }
  function updateOverlayStatus(){
    ensureOverlayStatus();var e=$('ceVoiceNextStatus');if(!e)return;
    var text='Antonio';
    if(state.phase==='ERROR')text+=' · voz no disponible';
    else if(state.needsGesture||!state.active)text+=' · pulsa Activar conversación una vez';
    else if(state.speaking)text+=' · hablando; puedes cortarle';
    else if(state.requestInFlight)text+=' · pensando';
    else if(state.awake)text+=' · escuchando';
    else text+=' · di «Hola Zuzu» o «Hola Antonio»';
    e.textContent=text;
  }

  function b64FromInt16(arr){
    var u8=new Uint8Array(arr.buffer,arr.byteOffset,arr.byteLength),s='',step=0x4000;
    for(var i=0;i<u8.length;i+=step)s+=String.fromCharCode.apply(null,u8.subarray(i,Math.min(i+step,u8.length)));
    return btoa(s);
  }
  function int16FromB64(b64){
    var bin=atob(String(b64||'')),buf=new ArrayBuffer(bin.length),u8=new Uint8Array(buf);
    for(var i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    return new Int16Array(buf);
  }
  function resampleTo16k(input,inputRate){
    if(!input||!input.length)return new Int16Array(0);
    var outRate=16000,ratio=inputRate/outRate,outLen=Math.max(1,Math.round(input.length/ratio)),out=new Int16Array(outLen);
    for(var i=0;i<outLen;i++){
      var pos=i*ratio,idx=Math.floor(pos),frac=pos-idx,a=input[idx]||0,b=input[Math.min(idx+1,input.length-1)]||a,v=a+(b-a)*frac;
      v=Math.max(-1,Math.min(1,v));out[i]=v<0?v*32768:v*32767;
    }
    return out;
  }

  function stopPlayback(reason){
    state.allowAudio=false;state.speaking=false;state.playbackCursor=0;
    state.playbackSources.forEach(function(src){try{src.stop(0);}catch(_){}try{src.disconnect();}catch(_){}});state.playbackSources.clear();
    setPhase(state.awake?'LISTENING':'SLEEPING',reason||'audio detenido');
  }
  function playPcmChunk(b64){
    if(!state.allowAudio||state.suppressUntilTurnComplete||!state.audioContext)return;
    var pcm;try{pcm=int16FromB64(b64);}catch(_){return;}if(!pcm.length)return;
    var ac=state.audioContext;try{if(ac.state==='suspended')ac.resume().catch(function(){});}catch(_){}
    var buffer=ac.createBuffer(1,pcm.length,24000),ch=buffer.getChannelData(0);
    for(var i=0;i<pcm.length;i++)ch[i]=pcm[i]/32768;
    var src=ac.createBufferSource();src.buffer=buffer;src.connect(ac.destination);
    var start=Math.max(ac.currentTime+0.015,state.playbackCursor||0);state.playbackCursor=start+buffer.duration;state.playbackSources.add(src);
    src.onended=function(){state.playbackSources.delete(src);if(!state.playbackSources.size&&state.speaking&&!state.requestInFlight){state.speaking=false;setPhase(state.awake?'LISTENING':'SLEEPING','audio terminado');}};
    try{src.start(start);state.speaking=true;if(!state.firstAudioAt)state.firstAudioAt=Date.now();setPhase('SPEAKING','audio Live');}catch(_){state.playbackSources.delete(src);}
  }

  function wakeRegex(){return /\b(?:zuzu|zuzito|antonio|antonito)\b/i;}
  function hasWake(text){var n=norm(text);return /(?:^|\s)(?:hola|oye|eh|ey|buenas|vamos|escucha|perdona)?\s*(?:zuzu|zuzito|antonio|antonito)(?:\s|$)/.test(n);}
  function removeLeadingWake(text){
    var s=clean(text);
    return clean(s.replace(/^\s*(?:(?:hola|oye|eh|ey|buenas|vamos|escucha|perdona)\s+)?(?:zuzu|zuzito|antonio|antoñito|antonito)\b\s*[,;:.!?-]*\s*/i,''));
  }
  function isSleepCommand(text){var n=norm(text);return /^(?:adios|hasta luego|hasta despues|dejalo|duerme|vete a dormir)(?:\s+(?:zuzu|antonio|zuzito|antonito))?$/.test(n);}
  function interruptRemainder(text){
    var s=clean(text),n=norm(s);
    if(!/^(?:para|calla|espera|perdona|corta|detente|joder|escucha|escuchame)\b/.test(n))return null;
    if(/^joder\s+(?:tio\s+)?escuchame$/.test(n)||/^(?:para|calla|espera|perdona|corta|detente|escucha|escuchame)(?:\s+(?:zuzu|zuzito|antonio|antonito|tio))?$/.test(n))return '';
    var r=s.replace(/^\s*(?:para|calla|espera|perdona|corta|detente|escucha|escúchame)(?:\s+(?:zuzu|zuzito|antonio|antoñito|antonito|t[ií]o))?\s*[,;:.!?-]*\s*/i,'');
    if(r===s&&/^\s*joder\b/i.test(s))r=s.replace(/^\s*joder(?:\s+t[ií]o)?(?:\s+esc[uú]chame)?\s*[,;:.!?-]*\s*/i,'');
    return clean(r);
  }

  function sendWs(obj){if(!state.ws||state.ws.readyState!==WS_OPEN)return false;try{state.ws.send(JSON.stringify(obj));return true;}catch(_){return false;}}
  function sendToolResponse(fc,payload,allowSpeech){
    state.allowAudio=!!allowSpeech;state.suppressUntilTurnComplete=!allowSpeech;if(allowSpeech){state.speaking=true;setPhase('SPEAKING_PREP','respuesta CE entregada a Antonio');}
    sendWs({toolResponse:{functionResponses:[{name:fc.name,id:fc.id,response:{result:payload}}]}});
  }

  function routeToolCall(fc){
    if(!fc||fc.name!=='route_voice_turn'){sendToolResponse(fc,{should_speak:false,error:'tool no permitido'},false);return;}
    var argText=clean(fc.args&&fc.args.text||''),trans=clean(state.transcriptBuffer),text=(trans.length>=argText.length?trans:argText);state.transcriptBuffer='';state.lastUserText=text;
    if(!text){sendToolResponse(fc,{should_speak:false,status:'empty'},false);return;}

    // Live ya interrumpe por VAD; este parseo evita convertir «Para Antonio» en una consulta CE.
    var stopRest=interruptRemainder(text);
    if(state.awake&&stopRest!==null){stopPlayback('interrupción humana');if(!stopRest){sendToolResponse(fc,{should_speak:false,status:'interrupted_listening'},false);return;}text=stopRest;}

    if(isSleepCommand(text)){state.awake=false;state.requestInFlight=false;sendToolResponse(fc,{should_speak:true,spoken_text:'Vale, aquí estoy cuando me llames.'},true);setPhase('SLEEPING','fin conversación');return;}

    if(!state.awake){
      if(!hasWake(text)){sendToolResponse(fc,{should_speak:false,status:'sleeping'},false);setPhase('SLEEPING','audio ambiente ignorado');return;}
      state.awake=true;openZuzu();var rest=removeLeadingWake(text);
      if(!rest){sendToolResponse(fc,{should_speak:true,spoken_text:'Hola. Dime.'},true);return;}
      text=rest;
    } else if(hasWake(text) && !removeLeadingWake(text)) {
      sendToolResponse(fc,{should_speak:true,spoken_text:'Dime.'},true);return;
    }

    if(state.pendingCeTool||state.requestInFlight){sendToolResponse(fc,{should_speak:false,status:'busy'},false);return;}
    state.pendingCeTool=fc;state.pendingCePrompt=text;state.requestInFlight=true;state.allowAudio=false;state.suppressUntilTurnComplete=true;setPhase('THINKING','ControlEvent resuelve');openZuzu();
    if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.submitVoicePrompt==='function'){
      try{window.ControlEventV113ZuzuAnalitica.submitVoicePrompt(text);}catch(err){completeCeError(err);}
    } else completeCeError(new Error('Zuzu VNext todavía no está disponible.'));
  }

  function openZuzu(){try{if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.open==='function')window.ControlEventV113ZuzuAnalitica.open();}catch(_){} }
  function completeCeResponse(answer){
    var fc=state.pendingCeTool;if(!fc)return;state.pendingCeTool=null;state.pendingCePrompt='';state.requestInFlight=false;
    var text=clean(answer)||'No he podido cerrar eso con seguridad. Dímelo otra vez.';state.lastOutputText=text;
    sendToolResponse(fc,{should_speak:true,spoken_text:text},true);
  }
  function completeCeError(err){
    var fc=state.pendingCeTool;state.pendingCeTool=null;state.pendingCePrompt='';state.requestInFlight=false;
    if(fc)sendToolResponse(fc,{should_speak:true,spoken_text:'No he podido cerrar eso. Dímelo otra vez.'},true);else setError(err);
  }

  function handleServerContent(content){
    if(!content)return;
    if(content.interrupted){stopPlayback('barge-in Live');state.suppressUntilTurnComplete=false;state.allowAudio=false;}
    if(content.inputTranscription&&content.inputTranscription.text){var t=clean(content.inputTranscription.text);if(t)state.transcriptBuffer=clean((state.transcriptBuffer?state.transcriptBuffer+' ':'')+t);}
    if(content.outputTranscription&&content.outputTranscription.text)state.lastOutputText=clean(content.outputTranscription.text);
    if(content.modelTurn&&Array.isArray(content.modelTurn.parts))content.modelTurn.parts.forEach(function(part){if(part&&part.inlineData&&part.inlineData.data)playPcmChunk(part.inlineData.data);});
    if(content.turnComplete){state.transcriptBuffer='';state.suppressUntilTurnComplete=false;if(!state.playbackSources.size){state.allowAudio=false;state.speaking=false;setPhase(state.awake?'LISTENING':'SLEEPING','turno Live completo');}}
  }
  function handleWsMessage(ev){
    var msg;try{msg=JSON.parse(ev.data);}catch(_){return;}
    if(msg.setupComplete){state.wsReady=true;state.setupCompletedAt=Date.now();setPhase(state.awake?'LISTENING':'SLEEPING','Live listo');startMic();return;}
    if(msg.serverContent)handleServerContent(msg.serverContent);
    if(msg.toolCall&&Array.isArray(msg.toolCall.functionCalls))msg.toolCall.functionCalls.forEach(routeToolCall);
    if(msg.toolCallCancellation&&Array.isArray(msg.toolCallCancellation.ids)){if(state.pendingCeTool&&msg.toolCallCancellation.ids.indexOf(state.pendingCeTool.id)>=0){state.pendingCeTool=null;state.pendingCePrompt='';state.requestInFlight=false;}}
    if(msg.goAway)scheduleReconnect('goAway');
  }

  function stopMic(){
    try{state.processor&&state.processor.disconnect();}catch(_){}try{state.micSource&&state.micSource.disconnect();}catch(_){}try{state.silentGain&&state.silentGain.disconnect();}catch(_){}
    state.processor=null;state.micSource=null;state.silentGain=null;
    try{state.stream&&state.stream.getTracks().forEach(function(t){t.stop();});}catch(_){}state.stream=null;
  }
  function closeAudioContext(){stopMic();stopPlayback('cierre');try{state.audioContext&&state.audioContext.close();}catch(_){}state.audioContext=null;}
  function startMic(){
    if(state.stream||!state.wsReady)return Promise.resolve(true);
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){setError('Este navegador no ofrece getUserMedia.');return Promise.resolve(false);}
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false}).then(function(stream){
      state.stream=stream;var AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('Este navegador no ofrece AudioContext.');
      var ac=state.audioContext;if(!ac||ac.state==='closed')ac=state.audioContext=new AC();state.inputSampleRate=Number(ac.sampleRate||48000);
      try{if(ac.state==='suspended')ac.resume().catch(function(){});}catch(_){}
      state.micSource=ac.createMediaStreamSource(stream);state.processor=ac.createScriptProcessor(2048,1,1);state.silentGain=ac.createGain();state.silentGain.gain.value=0;
      state.processor.onaudioprocess=function(e){if(!state.wsReady||!state.ws||state.ws.readyState!==WS_OPEN)return;var input=e.inputBuffer.getChannelData(0),pcm=resampleTo16k(input,state.inputSampleRate);if(!pcm.length)return;sendWs({realtimeInput:{audio:{data:b64FromInt16(pcm),mimeType:'audio/pcm;rate=16000'}}});};
      state.micSource.connect(state.processor);state.processor.connect(state.silentGain);state.silentGain.connect(ac.destination);
      state.active=true;state.needsGesture=false;state.activatedAt=Date.now();setPhase(state.awake?'LISTENING':'SLEEPING','micrófono PCM activo');return true;
    }).catch(function(err){state.active=false;state.needsGesture=!!(err&&(/NotAllowed|Security|Permission/i.test(err.name||'')||/permiso|permission/i.test(err.message||'')));if(state.needsGesture){state.lastError='';setPhase('NEEDS_GESTURE','permiso de micrófono');}else setError(err);return false;});
  }

  function closeWs(intentional){state.intentionalClose=!!intentional;state.wsReady=false;try{state.ws&&state.ws.close();}catch(_){}state.ws=null;}
  function scheduleReconnect(reason){
    if(state.intentionalClose||state.reconnectTimer)return;clearTimeout(state.reconnectTimer);state.reconnectTimer=setTimeout(function(){state.reconnectTimer=null;connectLive(false);},700);setPhase('RECONNECTING',reason||'reconexión');
  }
  function connectLive(fromGesture){
    if(state.activating||state.wsReady||(state.ws&&state.ws.readyState===0))return Promise.resolve(true);state.activating=true;state.intentionalClose=false;setPhase('CONNECTING','token Live');
    return fetch('/api/zuzu-live/token',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(function(res){return res.json().then(function(j){if(!res.ok||j.ok===false)throw new Error(j.error||('HTTP '+res.status));return j;});}).then(function(j){
      state.setup=j.setup||{};state.model=clean(j.model);state.voice=clean(j.voice)||'Antonio';var url=clean(j.websocketUrl)+'?access_token='+encodeURIComponent(j.token);var ws=new WebSocket(url);state.ws=ws;
      ws.onopen=function(){setPhase('CONNECTING','WebSocket abierto');sendWs({setup:state.setup});};
      ws.onmessage=handleWsMessage;
      ws.onerror=function(){state.lastError='Error de conexión Live.';};
      ws.onclose=function(){state.wsReady=false;state.ws=null;stopPlayback('WebSocket cerrado');if(!state.intentionalClose)scheduleReconnect('WebSocket cerrado');};
      return true;
    }).catch(function(err){setError(err);return false;}).finally(function(){state.activating=false;});
  }
  function activate(fromGesture){
    injectBadge();state.needsGesture=false;var p=connectLive(!!fromGesture);if(fromGesture&&state.audioContext){try{state.audioContext.resume().catch(function(){});}catch(_){}}
    return p.then(function(ok){if(ok&&state.wsReady)return startMic();return ok;});
  }

  function manualOpen(){state.awake=true;ensureOverlayStatus();if(!state.active&&!state.activating)activate(false);setPhase(state.active?'LISTENING':'CONNECTING','ventana Zuzu abierta manualmente');}
  function manualClose(){state.awake=false;state.pendingCeTool=null;state.pendingCePrompt='';state.requestInFlight=false;stopPlayback('ventana cerrada');setPhase(state.active?'SLEEPING':'IDLE','ventana Zuzu cerrada');}

  document.addEventListener('ce:zuzu-request-started',function(ev){if(!state.awake)return;state.requestInFlight=true;setPhase('THINKING','petición VNext');});
  document.addEventListener('ce:zuzu-response-rendered',function(ev){if(!state.pendingCeTool)return;var spoken=clean(ev&&ev.detail&&ev.detail.spokenAnswer),screen=clean(ev&&ev.detail&&ev.detail.answer);completeCeResponse(spoken||screen);});
  document.addEventListener('ce:zuzu-request-error',function(ev){if(state.pendingCeTool)completeCeError(new Error(clean(ev&&ev.detail&&ev.detail.message)||'Error CE'));});
  window.addEventListener('controlevent:zuzu-opened',manualOpen);
  window.addEventListener('controlevent:zuzu-closed',manualClose);
  ['controlevent:login-ok','controlevent:auth-restored-v96','controlevent:auth-changed'].forEach(function(name){window.addEventListener(name,function(){setTimeout(function(){if(!state.active&&!state.activating)activate(false);},120);},true);});
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&state.audioContext){try{state.audioContext.resume().catch(function(){});}catch(_){}}});
  window.addEventListener('beforeunload',function(){state.intentionalClose=true;clearTimeout(state.reconnectTimer);closeWs(true);closeAudioContext();});

  function primeFromGesture(){if(state.active||state.activating)return;if(state.needsGesture||state.phase==='BOOT'||state.phase==='ERROR')activate(true);}
  document.addEventListener('pointerdown',primeFromGesture,true);
  document.addEventListener('touchstart',primeFromGesture,{capture:true,passive:true});
  document.addEventListener('keydown',primeFromGesture,true);

  function install(){injectStyle();injectBadge();setPhase('BOOT','VOICE-NEXT 1');setTimeout(function(){activate(false);},250);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

  window.ControlEventVoiceTurns=window.ControlEventV22Voz4=window.ControlEventVoiceV2=window.ControlEventV22Voz3={
    version:BUILD,
    isConversationalMode:function(){return !!state.awake;},
    startAmbientListening:function(){return activate(true);},
    startDirectConversation:function(){state.awake=true;openZuzu();return activate(true);},
    endVoiceConversation:function(){state.awake=false;stopPlayback('fin manual');updateBadge();},
    stopSpeaking:function(){stopPlayback('stop manual');},
    maybeAutoRead:function(){return false;},
    speakResponse:function(){return false;},
    supportsRecognition:function(){return false;},
    supportsDeviceSpeech:function(){return false;},
    spokenPreview:function(text){return clean(text);},
    debugState:function(){return{build:BUILD,phase:state.phase,active:state.active,needsGesture:state.needsGesture,awake:state.awake,wsReady:state.wsReady,model:state.model,voice:state.voice,speaking:state.speaking,requestInFlight:state.requestInFlight,pendingCe:!!state.pendingCeTool,lastUserText:state.lastUserText,lastOutputText:state.lastOutputText,lastError:state.lastError,inputSampleRate:state.inputSampleRate,setupCompletedAt:state.setupCompletedAt,activatedAt:state.activatedAt,firstAudioAt:state.firstAudioAt};}
  };
})();
