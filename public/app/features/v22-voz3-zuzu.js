/* ControlEvent v2.0_exp · Zuzu Voice · FIX31 PC mic-array multicanal sobre motor estable
   Objetivo: recuperar la escucha ambiental que sí funcionó y mantener conversación oral humana.
   Flujo deliberadamente simple:
   AMBIENTE -> "Hola Zuzu" -> USUARIO -> ESPERA IA -> ZUZU HABLA -> USUARIO.
   La escucha se intenta al cargar y, si el navegador exige activación, se rearma SINCRÓNICAMENTE
   en el primer gesto real del usuario (incluido el botón Entrar), sin pedir pulsar el micrófono de Zuzu.
*/
(function(){
  'use strict';
  if(window.__ceV22Voz3Zuzu) return;
  window.__ceV22Voz3Zuzu=true;

  var BUILD='v2.0_exp-FIX31-VOICE-PC-MULTICHANNEL';
  var PANEL_ID='ceV22Voz3Panel';
  var STYLE_ID='ceZuzuVoiceV2Style';
  var STORAGE={
    ambient:'ce_zuzu_voz4_ambient_wake', auto:'ce_zuzu_voz3_auto_read', rate:'ce_zuzu_voz3_rate',
    mode:'ce_zuzu_voz3_voice_mode', female:'ce_zuzu_voz3_female_voice', male:'ce_zuzu_voz3_male_voice', mic:'ce_zuzu_voz3_mic_device'
  };
  var state={
    mode:'idle', ambientEnabled:true, conversationMode:false, parked:false,
    recognition:null, recognitionGeneration:0, recognitionStarting:false, recognitionLive:false, needsGesture:false,
    localSpeechReady:false, localSpeechPreparing:false, localSpeechAttempted:false, localSpeechUnavailable:false, lastRecognitionError:'', pendingRecognitionKind:'ambient',
    cloudFallback:false, cloudStream:null, cloudAudioContext:null, cloudSource:null, cloudAnalyser:null, cloudSplitter:null, cloudAnalysers:[], cloudChannelRms:[], cloudMonitor:null, cloudWanted:false, cloudKind:'ambient', cloudRecorder:null, cloudChunks:[], cloudRecording:false, cloudBusy:false, cloudLastVoiceAt:0, cloudRecordStartedAt:0,
    cloudThreshold:0.006, cloudNoiseFloor:0.001, cloudRms:0, cloudPeak:0, cloudVoiceFrames:0, cloudCalibratingUntil:0, cloudNoiseSamples:[], cloudCalibrationDone:false, cloudMeterLastPaint:0, cloudDeviceLabel:'', cloudDeviceId:'', cloudDeviceSettings:{}, cloudGeneration:0, cloudLastTranscript:'',
    wakeCapture:false, wakeText:'', wakeSession:'', wakeTimer:null, wakeLastAt:0,
    turnPrefix:'', turnSession:'', turnTimer:null, turnLastAt:0,
    requestInFlight:false, awaitingResponse:false, requestPrompt:'', requestTitle:'',
    speaking:false, speechGeneration:0, speechChunks:[], speechIndex:0, currentUtterance:null,
    bargeRecognition:null, bargeGeneration:0,
    voices:[],
    recorderStream:null, recorder:null, recorderChunks:[], recordingActive:false, lastRecordingBlob:null, lastRecordingMime:'',
    entertainmentTimer:null, entertainmentCount:0, entertainmentSpeaking:false, entertainmentUtterance:null, lastEntertainmentIndex:-1
  };

  var ENTERTAINMENT_PHRASES=[
    'Estoy rebuscando en los cajones de ControlEvent.',
    'Dame un segundo, que esto tiene miga.',
    'Estoy atando cabos, no te me escapes.',
    'Un momento, que Zuzu está haciendo cuentas.',
    'Estoy cruzando datos; ya casi lo tengo.',
    'Esto está cocinándose, y huele bastante bien.',
    'Déjame mirar debajo de la alfombra digital.',
    'Estoy buscando la aguja en el pajar.',
    'Voy tirando del hilo; aparece algo interesante.',
    'Un segundo, que los números vienen corriendo.',
    'Estoy poniendo orden en este pequeño sarao.',
    'No me he ido, sigo husmeando datos.',
    'Aquí hay tomate; déjame comprobarlo bien.',
    'Estoy haciendo arqueología fina por ControlEvent.',
    'Aguanta un instante, que esto promete.',
    'Estoy separando el grano de la paja.',
    'Los datos están hablando; estoy escuchándolos.',
    'Un momento, que no quiero venderte humo.',
    'Estoy comprobando que las cuentas no hagan trampas.',
    'Ya veo movimiento; dame un pelín más.'
  ];

  function $(id){return document.getElementById(id);}
  function q(sel,root){return (root||document).querySelector(sel);}
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){var s=clean(v);try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(_){}return s.toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\s+/g,' ').trim();}
  function safeGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:v;}catch(_){return d;}}
  function safeSet(k,v){try{localStorage.setItem(k,String(v));}catch(_){} }
  function supportsRecognition(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
  function supportsSpeech(){return !!(window.speechSynthesis&&window.SpeechSynthesisUtterance);}
  function promptEl(){return $('ceAiPrompt');}
  function setPrompt(v){var p=promptEl();if(!p)return;p.value=clean(v);try{p.dispatchEvent(new Event('input',{bubbles:true}));p.setSelectionRange(p.value.length,p.value.length);}catch(_){} }
  function setStatus(msg,kind){var e=$('ceVoz3Status');if(!e)return;e.className='ce-voz3-status'+(kind?' '+kind:'');e.textContent=msg||'';}
  function setMic(on){var b=$('ceVoz3Mic');if(!b)return;b.classList.toggle('is-listening',!!on);b.textContent=on?'⏹ Detener micro':'🎙️ Hablar';}
  function mergeText(base,part){base=clean(base);part=clean(part);if(!part)return base;if(!base)return part;var nb=norm(base),np=norm(part);if(nb===np||nb.endsWith(np))return base;if(np.startsWith(nb))return part;return clean(base+' '+part);}
  function isZuzuWord(w){w=norm(w).replace(/\s/g,'');return ['zuzu','susu','suzu','zusu','zulu','yuyu'].indexOf(w)>=0||(w.length>=3&&w.length<=6&&w.charAt(0)==='z');}
  function wakeInfo(v){var words=norm(v).split(' ').filter(Boolean);for(var i=0;i<words.length-1;i++){if(['hola','ola','oye','ey','eh','buenas'].indexOf(words[i])>=0&&isZuzuWord(words[i+1]))return{ok:true,index:i};}return{ok:false,index:-1};}
  function hasWake(v){return wakeInfo(v).ok;}
  function wakeOnly(v){var words=norm(v).split(' ').filter(Boolean),wi=wakeInfo(v);return wi.ok&&words.length<=wi.index+3;}
  function hasBarge(v){return /\b(perdona|perdon|espera|esperate)\b/.test(norm(v));}
  function bargeTail(v){var raw=clean(v),re=/\b(perdona|perd[oó]n|espera|esp[eé]rate)\b/ig,m,last=null;while((m=re.exec(raw)))last=re.lastIndex;return last==null?'':clean(raw.slice(last).replace(/^[\s,;:.!?-]+/,''));}
  function stripReservedFromSpeech(v){return clean(v).replace(/\bperdona\b/ig,'disculpa').replace(/\bperd[oó]n\b/ig,'disculpa').replace(/\bespera\b/ig,'aguarda').replace(/\besp[eé]rate\b/ig,'aguarda');}
  function currentVoiceUser(){try{return window.authUser||window.__CONTROL_EVENT_USER__||(window.ControlEventApp&&window.ControlEventApp.authUser)||(window.ControlEventRuntime&&window.ControlEventRuntime.app&&window.ControlEventRuntime.app.authUser)||{};}catch(_){return{};}}
  function voiceUserNames(){var u=currentVoiceUser(),informal=clean(u.identificacion||u.Identificacion||u.usuario||u.user||u.nombre||u.Nombre||''),formal=clean(u.nombre||u.Nombre||u.name||informal);return{informal:informal||formal||'amigo',formal:formal||informal||'usuario'};}
  function voiceAddressName(formal){var n=voiceUserNames();return formal?n.formal:n.informal;}
  function isFormalVoiceTurn(prompt,title){var t=norm(clean(prompt));return /\b(informe formal|informe ejecutivo|informe oficial|informe tecnico|informe tecnica|auditoria|memoria formal|acta|documento formal|comunicado oficial|para la directiva|para los socios)\b/.test(t);}
  function reEsc(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function stripVoiceAnswerLead(v){
    var out=clean(v).replace(/^(?:respuesta|contestacion|contestación|informe)\s+(?:de\s+)?zuzu\s*[:.\-–—]*\s*/i,'').replace(/^zuzu\s+(?:responde|contesta)\s*[:.\-–—]*\s*/i,'').trim();
    var n=voiceUserNames(),names=[n.informal,n.formal].filter(Boolean).sort(function(a,b){return b.length-a.length;}).map(reEsc);if(!names.length)return out;
    var who='(?:'+names.join('|')+')';
    out=out.replace(new RegExp('^(?:hola|buenas|oye)\\s+'+who+'\\s*[,.:;\\-–—]*\\s*','i'),'');
    out=out.replace(new RegExp('^(?:te|le)\\s+comento\\s*[,.:;\\-–—]*\\s*'+who+'\\s*[,.:;\\-–—]*\\s*','i'),'');
    out=out.replace(new RegExp('^'+who+'\\s*[,.:;\\-–—]+\\s*','i'),'');
    return clean(out);
  }
  function voiceBridge(prompt,title){var formal=isFormalVoiceTurn(prompt,title),name=voiceAddressName(formal);return (formal?'Le comento, ':'Te comento, ')+name+'.';}

  function injectStyle(){
    if($(STYLE_ID))return;var st=document.createElement('style');st.id=STYLE_ID;
    st.textContent='\n#'+PANEL_ID+'{display:inline-flex;align-items:center;gap:4px;flex:1 1 560px;min-width:300px;flex-wrap:wrap;margin:0;padding:0;border:0;background:transparent;color:#0f172a}'+
      '#'+PANEL_ID+' .ce-voz3-btn{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:8px;padding:5px 7px;font-size:10px;font-weight:850;cursor:pointer;min-height:30px;line-height:1;white-space:nowrap}'+
      '#'+PANEL_ID+' .ce-voz3-mic{border-color:#fb923c;background:#fff7ed;color:#9a3412;min-width:76px}#'+PANEL_ID+' .ce-voz3-mic.is-listening{background:#dc2626;color:#fff;border-color:#b91c1c}'+
      '#'+PANEL_ID+' .ce-voz3-auto{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:900;border:1px solid #fed7aa;background:#fff7ed;border-radius:8px;padding:4px 6px;min-height:30px}#'+PANEL_ID+' select{border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:4px 5px;font-size:9px;font-weight:800;min-height:30px;max-width:165px}'+
      '#'+PANEL_ID+' .ce-voz3-status{font-size:9px;font-weight:800;color:#475569;flex:1 1 120px;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#'+PANEL_ID+' .ce-voz3-status.ok{color:#15803d}#'+PANEL_ID+' .ce-voz3-status.err{color:#b91c1c}'+
      '#'+PANEL_ID+' .ce-voz3-meter{display:inline-flex;align-items:center;gap:4px;min-width:116px;height:28px;padding:0 5px;border:1px solid #dbe4ee;border-radius:8px;background:#fff}#'+PANEL_ID+' .ce-voz3-meter-track{width:72px;height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden}#'+PANEL_ID+' .ce-voz3-meter-fill{display:block;width:0%;height:100%;background:#16a34a;transition:width .08s linear}#'+PANEL_ID+' .ce-voz3-meter-value{font-size:8px;font-weight:900;color:#64748b;min-width:28px;text-align:right}'+
      '.ce-zuzu-wake-badge{position:fixed;right:18px;bottom:18px;z-index:99970;border:1px solid #cbd5e1;background:rgba(255,255,255,.95);color:#475569;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:900;box-shadow:0 6px 20px rgba(15,23,42,.13);cursor:pointer}.ce-zuzu-wake-badge.is-listening{border-color:#86efac;background:#f0fdf4;color:#166534}.ce-zuzu-wake-badge.is-conversation{border-color:#fdba74;background:#fff7ed;color:#9a3412}';
    document.head.appendChild(st);
  }
  function updateBadge(){var b=$('ceZuzuWakeBadge');if(!b)return;if(state.conversationMode){b.className='ce-zuzu-wake-badge is-conversation';b.textContent=state.speaking?'🔊 Zuzu habla':'🎙 Conversando con Zuzu';return;}if(state.ambientEnabled){b.className='ce-zuzu-wake-badge is-listening';b.textContent=state.wakeCapture?'👂 Sigue hablando…':state.needsGesture?'👂 Zuzu se arma al entrar':'👂 Hola Zuzu';}else{b.className='ce-zuzu-wake-badge';b.textContent='👂 Activar Zuzu';}}
  function injectBadge(){if($('ceZuzuWakeBadge')||!document.body)return;var b=document.createElement('button');b.id='ceZuzuWakeBadge';b.type='button';b.addEventListener('click',function(){state.ambientEnabled=!state.ambientEnabled;safeSet(STORAGE.ambient,state.ambientEnabled?'1':'0');if(state.ambientEnabled){state.needsGesture=false;startAmbient(true);}else stopRecognition();updateBadge();});document.body.appendChild(b);updateBadge();}

  function recognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition;}
  function localSpeechApi(){var C=recognitionCtor();return C&&typeof C.available==='function'&&typeof C.install==='function'?C:null;}
  function supportsCeVoice(){return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&typeof MediaRecorder!=='undefined'&&typeof fetch==='function');}
  function cloudMime(){var opts=['audio/webm;codecs=opus','audio/webm','audio/mp4'];for(var i=0;i<opts.length;i++){try{if(!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(opts[i]))return opts[i];}catch(_){}}return '';}
  function clamp(n,min,max){n=Number(n)||0;return Math.max(min,Math.min(max,n));}
  function cloudStatus(kind){if(state.cloudCalibratingUntil>Date.now())setStatus('Calibrando micrófono…','ok');else setStatus(kind==='user'?'Te escucho con Voz CE…':'Voz CE activa. Di «Hola Zuzu».','ok');updateBadge();}
  function cloudAudioConstraints(){var id=clean(safeGet(STORAGE.mic,'')),audio={echoCancellation:false,noiseSuppression:false,autoGainControl:false};if(id)audio.deviceId={exact:id};return{audio:audio,video:false};}
  function ensureCloudAudioContext(fromGesture){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;var ac=state.cloudAudioContext;try{if(!ac||ac.state==='closed'){ac=new AC();state.cloudAudioContext=ac;}if(fromGesture&&ac.state==='suspended'){var pr=ac.resume();if(pr&&typeof pr.catch==='function')pr.catch(function(){});}}catch(_){return ac||null;}return ac;}
  function cloudTrackInfo(stream){try{var t=stream&&stream.getAudioTracks&&stream.getAudioTracks()[0];state.cloudDeviceLabel=clean(t&&t.label||'Micrófono predeterminado');state.cloudDeviceSettings=t&&t.getSettings?t.getSettings():{};state.cloudDeviceId=clean(state.cloudDeviceSettings.deviceId||safeGet(STORAGE.mic,''));}catch(_){state.cloudDeviceLabel='Micrófono';state.cloudDeviceSettings={};}}
  function refreshMicDevices(){var sel=$('ceVoz3MicChoice');if(!sel||!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return;var selected=clean(safeGet(STORAGE.mic,state.cloudDeviceId||''));navigator.mediaDevices.enumerateDevices().then(function(list){var ins=list.filter(function(d){return d.kind==='audioinput';});sel.innerHTML='<option value="">Mic automático</option>'+ins.map(function(d,i){var id=clean(d.deviceId),label=clean(d.label)||('Micrófono '+(i+1));return '<option value="'+id.replace(/"/g,'&quot;')+'"'+(id===selected?' selected':'')+'>'+label.replace(/</g,'&lt;')+'</option>';}).join('');if(!selected&&state.cloudDeviceId)sel.value=state.cloudDeviceId;}).catch(function(){});}
  function updateMicMeter(force){var now=Date.now();if(!force&&now-state.cloudMeterLastPaint<90)return;state.cloudMeterLastPaint=now;var fill=$('ceVoz3MeterFill'),val=$('ceVoz3MeterValue'),wrap=$('ceVoz3Meter'),rms=Number(state.cloudRms)||0,thr=Math.max(0.0001,Number(state.cloudThreshold)||0.006),pct=clamp((rms/(thr*2.2))*100,0,100),chs=(state.cloudChannelRms||[]).map(function(x){return(Number(x||0)*1000).toFixed(1);}).join('/');if(fill)fill.style.width=pct.toFixed(0)+'%';if(val)val.textContent=(rms*1000).toFixed(1);if(wrap){wrap.title='Mic: '+(state.cloudDeviceLabel||'—')+' · RMS '+rms.toFixed(5)+(chs?' · canales '+chs:'')+' · ruido '+Number(state.cloudNoiseFloor||0).toFixed(5)+' · umbral '+thr.toFixed(5)+(state.cloudRecording?' · VOZ':'');wrap.setAttribute('aria-label',wrap.title);}}
  function finishCloudCalibration(){if(state.cloudCalibrationDone)return;var a=state.cloudNoiseSamples.filter(function(x){return Number.isFinite(x)&&x>=0;}).sort(function(x,y){return x-y;}),floor=a.length?a[Math.min(a.length-1,Math.floor(a.length*0.28))]:Math.max(0.0004,state.cloudRms||0);state.cloudNoiseFloor=clamp(floor,0.00015,0.02);state.cloudThreshold=clamp(state.cloudNoiseFloor*2.35+0.0010,0.0022,0.022);state.cloudCalibrationDone=true;state.cloudCalibratingUntil=0;state.cloudVoiceFrames=0;cloudStatus(state.cloudKind);updateMicMeter(true);try{console.info('[CE VOZ FIX31] MIC calibrado',{label:state.cloudDeviceLabel,rms:state.cloudRms,ruido:state.cloudNoiseFloor,umbral:state.cloudThreshold,settings:state.cloudDeviceSettings});}catch(_){}}
  function blobBase64(blob){return new Promise(function(resolve,reject){var fr=new FileReader();fr.onload=function(){var x=String(fr.result||''),i=x.indexOf(',');resolve(i>=0?x.slice(i+1):x);};fr.onerror=function(){reject(fr.error||new Error('No se pudo leer el audio.'));};fr.readAsDataURL(blob);});}
  function pauseCloudListening(){state.cloudWanted=false;if(state.cloudRecorder&&state.cloudRecording){try{state.cloudRecorder.__discard=true;state.cloudRecorder.stop();}catch(_){}}setMic(false);}
  function closeCloudVoice(){state.cloudGeneration++;state.cloudWanted=false;state.cloudBusy=false;clearInterval(state.cloudMonitor);state.cloudMonitor=null;try{if(state.cloudRecorder&&state.cloudRecording){state.cloudRecorder.__discard=true;state.cloudRecorder.stop();}}catch(_){}state.cloudRecorder=null;state.cloudRecording=false;try{(state.cloudAnalysers||[]).forEach(function(a){try{a.disconnect();}catch(_){}});}catch(_){}try{state.cloudSplitter&&state.cloudSplitter.disconnect();}catch(_){}state.cloudSplitter=null;state.cloudAnalysers=[];state.cloudChannelRms=[];try{state.cloudSource&&state.cloudSource.disconnect();}catch(_){}state.cloudSource=null;try{state.cloudAudioContext&&state.cloudAudioContext.close();}catch(_){}state.cloudAudioContext=null;state.cloudAnalyser=null;try{state.cloudStream&&state.cloudStream.getTracks().forEach(function(t){t.stop();});}catch(_){}state.cloudStream=null;state.cloudRms=0;state.cloudPeak=0;state.cloudVoiceFrames=0;state.cloudCalibrationDone=false;state.cloudCalibratingUntil=0;state.cloudNoiseSamples=[];updateMicMeter(true);setMic(false);}
  function sendCloudAudio(blob,kind,gen){if(!blob||blob.size<900||gen!==state.cloudGeneration)return Promise.resolve('');state.cloudBusy=true;return blobBase64(blob).then(function(audioBase64){return fetch('/api/zuzu-voice/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:audioBase64,mimeType:blob.type||'audio/webm',mode:kind})});}).then(function(res){return res.json().then(function(j){if(!res.ok||j.ok===false)throw new Error(j.error||('HTTP '+res.status));return clean(j.text||'');});}).then(function(text){state.cloudLastTranscript=text;state.cloudBusy=false;if(gen!==state.cloudGeneration)return'';if(!text){if(state.cloudWanted)cloudStatus(kind);return'';}if(kind==='ambient'){if(hasWake(text)){pauseCloudListening();if(wakeOnly(text)){openZuzuOnly();}else{state.conversationMode=true;state.parked=false;state.mode='request';state.requestInFlight=true;state.awaitingResponse=true;state.requestPrompt=text;updateBadge();setStatus('Procesando tu pregunta…','ok');if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.submitVoicePrompt==='function')window.ControlEventV113ZuzuAnalitica.submitVoicePrompt(text);}return text;}cloudStatus('ambient');return text;}setPrompt(text);pauseCloudListening();state.requestPrompt=text;state.requestInFlight=true;state.awaitingResponse=true;state.mode='request';setStatus('Procesando…','ok');updateBadge();var b=$('ceAiRun');if(b)b.click();return text;}).catch(function(err){state.cloudBusy=false;setStatus('Voz CE: '+clean(err&&err.message||err||'error'),'err');if(state.cloudWanted)setTimeout(function(){cloudStatus(kind);},1200);return'';});}
  function finishCloudUtterance(kind){var mr=state.cloudRecorder;if(!mr||!state.cloudRecording)return;state.cloudRecording=false;try{mr.stop();}catch(_){} }
  function startCloudUtterance(kind){if(state.cloudRecording||state.cloudBusy||!state.cloudStream)return;var mime=cloudMime(),mr;try{mr=mime?new MediaRecorder(state.cloudStream,{mimeType:mime}):new MediaRecorder(state.cloudStream);}catch(err){setStatus('Voz CE no puede grabar este micrófono.','err');return;}var gen=state.cloudGeneration;state.cloudRecorder=mr;state.cloudChunks=[];state.cloudRecording=true;state.cloudRecordStartedAt=Date.now();state.cloudLastVoiceAt=Date.now();mr.ondataavailable=function(e){if(e.data&&e.data.size)state.cloudChunks.push(e.data);};mr.onstop=function(){var discard=!!mr.__discard,chunks=state.cloudChunks.slice(),type=mr.mimeType||mime||'audio/webm';if(state.cloudRecorder===mr)state.cloudRecorder=null;state.cloudChunks=[];if(discard||gen!==state.cloudGeneration)return;var blob=new Blob(chunks,{type:type});try{console.info('[CE VOZ FIX31] Fragmento voz',{bytes:blob.size,rms:state.cloudRms,ruido:state.cloudNoiseFloor,umbral:state.cloudThreshold});}catch(_){}sendCloudAudio(blob,kind,gen);};try{mr.start(180);}catch(err){state.cloudRecording=false;state.cloudRecorder=null;setStatus('Voz CE no pudo iniciar la captura.','err');}}
  function analyserRms(an){if(!an)return 0;var arr=new Float32Array(an.fftSize||1024);try{an.getFloatTimeDomainData(arr);}catch(_){return 0;}var sum=0;for(var i=0;i<arr.length;i++)sum+=arr[i]*arr[i];return Math.sqrt(sum/Math.max(1,arr.length));}
  function cloudMonitorTick(){if(!state.cloudWanted||state.speaking||state.requestInFlight||state.awaitingResponse||state.cloudBusy)return;var ans=(state.cloudAnalysers&&state.cloudAnalysers.length)?state.cloudAnalysers:(state.cloudAnalyser?[state.cloudAnalyser]:[]);if(!ans.length)return;var levels=ans.map(analyserRms),rms=0;for(var j=0;j<levels.length;j++)if(levels[j]>rms)rms=levels[j];state.cloudChannelRms=levels;var now=Date.now();state.cloudRms=rms;state.cloudPeak=Math.max(rms,state.cloudPeak*0.985);if(!state.cloudCalibrationDone){state.cloudNoiseSamples.push(rms);if(state.cloudNoiseSamples.length>90)state.cloudNoiseSamples.shift();updateMicMeter();if(now>=state.cloudCalibratingUntil)finishCloudCalibration();return;}if(!state.cloudRecording&&rms<state.cloudThreshold){state.cloudNoiseFloor=clamp(state.cloudNoiseFloor*0.985+rms*0.015,0.00015,0.02);var target=clamp(state.cloudNoiseFloor*2.35+0.0010,0.0022,0.022);state.cloudThreshold=state.cloudThreshold*0.985+target*0.015;}var ratio=rms/Math.max(0.0002,state.cloudNoiseFloor),voice=(rms>=state.cloudThreshold)||(rms>=0.0014&&ratio>=1.65);state.cloudVoiceFrames=voice?state.cloudVoiceFrames+1:0;if(voice&&state.cloudVoiceFrames>=2){if(!state.cloudRecording)startCloudUtterance(state.cloudKind);state.cloudLastVoiceAt=now;}if(state.cloudRecording){var elapsed=now-state.cloudRecordStartedAt,silent=now-state.cloudLastVoiceAt;if((elapsed>560&&silent>900)||elapsed>9000)finishCloudUtterance(state.cloudKind);}updateMicMeter();}
  function setupCloudStream(stream,kind){state.cloudStream=stream;state.cloudKind=kind;cloudTrackInfo(stream);state.cloudNoiseSamples=[];state.cloudNoiseFloor=0.001;state.cloudThreshold=0.006;state.cloudRms=0;state.cloudPeak=0;state.cloudVoiceFrames=0;state.cloudCalibrationDone=false;state.cloudCalibratingUntil=Date.now()+1350;var ac=ensureCloudAudioContext(false);if(!ac)throw new Error('AudioContext no disponible');state.cloudAudioContext=ac;state.cloudSource=ac.createMediaStreamSource(stream);state.cloudAnalysers=[];state.cloudChannelRms=[];var main=ac.createAnalyser();main.fftSize=1024;main.smoothingTimeConstant=0.12;state.cloudAnalyser=main;state.cloudSource.connect(main);state.cloudAnalysers.push(main);var settings=state.cloudDeviceSettings||{},channels=Number(settings.channelCount||state.cloudSource.channelCount||1);channels=Math.max(1,Math.min(4,channels||1));if(channels>1&&typeof ac.createChannelSplitter==='function'){try{var sp=ac.createChannelSplitter(channels);state.cloudSplitter=sp;state.cloudSource.connect(sp);for(var c=0;c<channels;c++){var ca=ac.createAnalyser();ca.fftSize=1024;ca.smoothingTimeConstant=0.12;sp.connect(ca,c,0);state.cloudAnalysers.push(ca);}}catch(_){state.cloudSplitter=null;}}state.cloudWanted=true;clearInterval(state.cloudMonitor);state.cloudMonitor=setInterval(cloudMonitorTick,45);try{var rp=ac.resume();if(rp&&typeof rp.catch==='function')rp.catch(function(){});}catch(_){}setStatus('Calibrando micrófono…','ok');refreshMicDevices();updateMicMeter(true);try{console.info('[CE VOZ FIX31] entrada',{label:state.cloudDeviceLabel,settings:settings,analizadores:state.cloudAnalysers.length});}catch(_){}return true;}
  function startCloudRecognition(kind,fromGesture){kind=kind||'ambient';state.cloudFallback=true;state.cloudKind=kind;state.cloudWanted=true;state.needsGesture=false;if(!supportsCeVoice()){setStatus('Este navegador no permite la Voz CE por micrófono.','err');return false;}if(state.cloudStream){if(fromGesture)ensureCloudAudioContext(true);cloudStatus(kind);setMic(kind==='user');return true;}var gen=++state.cloudGeneration;setStatus('Activando Voz CE…','ok');navigator.mediaDevices.getUserMedia(cloudAudioConstraints()).then(function(stream){if(gen!==state.cloudGeneration){try{stream.getTracks().forEach(function(t){t.stop();});}catch(_){}return;}setupCloudStream(stream,kind);setMic(kind==='user');}).catch(function(err){if(clean(safeGet(STORAGE.mic,''))){safeSet(STORAGE.mic,'');setStatus('Ese micrófono no está disponible. Vuelvo al predeterminado…','err');setTimeout(function(){startCloudRecognition(kind,true);},100);return;}state.needsGesture=true;setStatus('Micrófono bloqueado: '+clean(err&&err.name||err&&err.message||'permiso')+'. Pulsa una vez en ControlEvent.','err');updateBadge();});return true;}
  function fallbackToCeVoice(kind){state.localSpeechUnavailable=true;state.cloudFallback=true;stopRecognition();setStatus('Web Speech no responde. Activo Voz CE…','ok');startCloudRecognition(kind||state.pendingRecognitionKind||'ambient',false);return false;}
  function stopRecognition(){state.recognitionGeneration++;state.recognitionStarting=false;state.recognitionLive=false;var r=state.recognition;state.recognition=null;try{r&&r.abort();}catch(_){try{r&&r.stop();}catch(__){}}setMic(false);}
  function restartRecognitionKind(kind){setTimeout(function(){if(kind==='user'&&state.conversationMode&&!state.speaking&&!state.requestInFlight&&!state.awaitingResponse)startUser();else if(kind==='ambient'&&state.ambientEnabled&&!state.conversationMode)startAmbient(false);},120);}
  function prepareLocalSpeech(kind){
    var C=localSpeechApi();state.pendingRecognitionKind=kind||state.pendingRecognitionKind||'ambient';
    if(!C){return Promise.resolve(fallbackToCeVoice(state.pendingRecognitionKind));}
    if(state.localSpeechReady){restartRecognitionKind(state.pendingRecognitionKind);return Promise.resolve(true);}
    if(state.localSpeechPreparing)return Promise.resolve(false);
    state.localSpeechPreparing=true;state.localSpeechAttempted=true;setStatus('La voz en red falló. Activando reconocimiento local…','ok');updateBadge();
    var opts={langs:['es-ES'],processLocally:true};
    return Promise.resolve().then(function(){return C.available(opts);}).then(function(result){
      result=clean(result).toLowerCase();
      if(result==='available'){state.localSpeechReady=true;state.localSpeechUnavailable=false;setStatus('Voz local activa. Di «Hola Zuzu».','ok');return true;}
      if(result==='downloadable'||result==='downloading'){setStatus('Preparando voz local en español…','ok');return C.install(opts).then(function(ok){state.localSpeechReady=!!ok;state.localSpeechUnavailable=!ok;setStatus(ok?'Voz local instalada. Di «Hola Zuzu».':'No se pudo instalar la voz local en español.',ok?'ok':'err');return !!ok;});}
      return fallbackToCeVoice(state.pendingRecognitionKind);
    }).catch(function(){return fallbackToCeVoice(state.pendingRecognitionKind);}).then(function(ok){state.localSpeechPreparing=false;updateBadge();if(ok&&!state.cloudFallback)restartRecognitionKind(state.pendingRecognitionKind);return ok;});
  }
  function sessionText(ev){var parts=[];for(var i=0;i<ev.results.length;i++){var t=clean(ev.results[i]&&ev.results[i][0]&&ev.results[i][0].transcript);if(t)parts.push(t);}return clean(parts.join(' '));}
  function newRecognition(kind){
    var C=recognitionCtor();if(!C)return null;var r=new C(),gen=++state.recognitionGeneration;r.lang='es-ES';r.continuous=true;r.interimResults=true;r.maxAlternatives=3;if(state.localSpeechReady&&'processLocally' in r)r.processLocally=true;r.__gen=gen;r.__kind=kind;
    r.onstart=function(){if(gen!==state.recognitionGeneration)return;state.recognitionStarting=false;state.recognitionLive=true;state.needsGesture=false;state.lastRecognitionError='';setMic(kind==='user');if(kind==='ambient')setStatus(state.wakeCapture?'Sigue hablando…':state.localSpeechReady?'Voz local activa. Di «Hola Zuzu».':'Escucha activa. Di «Hola Zuzu».','ok');if(kind==='user')setStatus(state.localSpeechReady?'Te escucho (voz local)…':'Te escucho…','ok');updateBadge();};
    r.onerror=function(ev){if(gen!==state.recognitionGeneration)return;state.recognitionStarting=false;state.recognitionLive=false;var code=clean(ev&&ev.error),message=clean(ev&&ev.message);state.lastRecognitionError=code+(message?' · '+message:'');if(code==='network'&&!state.localSpeechReady){state.localSpeechPreparing=true;state.pendingRecognitionKind=kind;setStatus('La voz en red ha fallado. Paso a reconocimiento local…','ok');setTimeout(function(){state.localSpeechPreparing=false;prepareLocalSpeech(kind);},0);}else if(code==='language-not-supported'&&state.localSpeechReady){state.localSpeechReady=false;state.localSpeechUnavailable=false;state.pendingRecognitionKind=kind;setTimeout(function(){prepareLocalSpeech(kind);},0);}else if(code==='not-allowed'||code==='service-not-allowed'){state.needsGesture=true;setStatus('La escucha se rearmará con tu siguiente pulsación normal.','err');}else if(code&&code!=='no-speech'&&code!=='aborted')setStatus('Micrófono: '+code+(message?' · '+message:''),'err');updateBadge();};
    r.onend=function(){if(gen!==state.recognitionGeneration)return;state.recognitionStarting=false;state.recognitionLive=false;state.recognition=null;setMic(false);if(state.needsGesture||state.localSpeechPreparing){updateBadge();return;}if(state.lastRecognitionError==='network'&&!state.localSpeechReady){updateBadge();return;}if(kind==='ambient'&&state.ambientEnabled&&!state.conversationMode)setTimeout(function(){startAmbient(false);},90);else if(kind==='user'&&state.conversationMode&&!state.speaking&&!state.requestInFlight&&!state.awaitingResponse)setTimeout(startUser,90);};
    r.onresult=function(ev){if(gen!==state.recognitionGeneration)return;var t=sessionText(ev);if(kind==='ambient')handleAmbientText(t);else handleUserText(t);};
    return r;
  }
  function startRecognition(kind,fromGesture){
    if(!supportsRecognition())return false;
    if(fromGesture&&state.recognition&&!state.recognitionLive){stopRecognition();}
    if(state.recognitionStarting||state.recognition)return !!state.recognitionLive;
    state.recognitionStarting=true;state.mode=kind;var r=newRecognition(kind);state.recognition=r;
    try{r.start();return true;}catch(err){state.recognitionStarting=false;state.recognitionLive=false;state.recognition=null;if(fromGesture){state.needsGesture=false;}else{state.needsGesture=true;}updateBadge();return false;}
  }

  function clearWakeTimer(){clearTimeout(state.wakeTimer);state.wakeTimer=null;}
  function handleAmbientText(text){
    if(!text)return;
    if(!state.wakeCapture){if(!hasWake(text))return;state.wakeCapture=true;state.wakeText=clean(text);state.wakeSession=clean(text);state.wakeLastAt=Date.now();updateBadge();}
    else if(text!==state.wakeSession){var delta=text;if(norm(text).startsWith(norm(state.wakeSession)))delta=clean(text.slice(state.wakeSession.length));state.wakeText=mergeText(state.wakeText,delta);state.wakeSession=text;state.wakeLastAt=Date.now();}
    clearWakeTimer();state.wakeTimer=setTimeout(commitWake,1500);
  }
  function openZuzuOnly(){
    state.conversationMode=true;state.parked=false;state.mode='user';state.requestInFlight=false;state.awaitingResponse=false;updateBadge();
    try{if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.open==='function')window.ControlEventV113ZuzuAnalitica.open();}catch(_){}
    setStatus('Te escucho…','ok');setTimeout(startUser,160);
  }
  function commitWake(){
    if(!state.wakeCapture)return;var elapsed=Date.now()-state.wakeLastAt;if(elapsed<1350){clearWakeTimer();state.wakeTimer=setTimeout(commitWake,1400-elapsed);return;}
    var full=clean(state.wakeText);state.wakeCapture=false;state.wakeText='';state.wakeSession='';clearWakeTimer();stopRecognition();
    if(wakeOnly(full)){openZuzuOnly();return;}
    state.conversationMode=true;state.parked=false;state.mode='request';state.requestInFlight=true;state.awaitingResponse=true;state.requestPrompt=full;updateBadge();setStatus('Procesando tu pregunta…','ok');
    if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.submitVoicePrompt==='function')window.ControlEventV113ZuzuAnalitica.submitVoicePrompt(full);
  }
  function startAmbient(fromGesture){if(!state.ambientEnabled||state.conversationMode||state.speaking||state.requestInFlight)return;state.mode='ambient';if(state.cloudFallback||!supportsRecognition())startCloudRecognition('ambient',!!fromGesture);else startRecognition('ambient',!!fromGesture);updateBadge();}
  function primeAmbientFromGesture(ev){
    if(ev&&ev.isTrusted===false)return;
    ensureCloudAudioContext(true);
    if(!state.ambientEnabled||state.conversationMode)return;
    var t=ev&&ev.target;if(t&&t.closest&&t.closest('#ceVoz3Mic,#ceZuzuWakeBadge'))return;
    if(state.cloudFallback||!supportsRecognition()){state.needsGesture=false;startCloudRecognition('ambient',true);return;}
    if(state.needsGesture||state.recognitionStarting||(state.recognition&&!state.recognitionLive)){stopRecognition();state.needsGesture=false;startAmbient(true);return;}
    if(!state.recognition&&!state.recognitionLive){state.needsGesture=false;startAmbient(true);}
  }

  function clearTurnTimer(){clearTimeout(state.turnTimer);state.turnTimer=null;}
  function currentTurn(){return mergeText(state.turnPrefix,state.turnSession);}
  function scheduleTurnCommit(){clearTurnTimer();state.turnLastAt=Date.now();state.turnTimer=setTimeout(commitUserTurn,1800);}
  function handleUserText(text){if(!text)return;state.turnSession=text;setPrompt(currentTurn());scheduleTurnCommit();}
  function commitUserTurn(){var elapsed=Date.now()-state.turnLastAt;if(elapsed<1650){clearTurnTimer();state.turnTimer=setTimeout(commitUserTurn,1700-elapsed);return;}var text=clean(currentTurn());if(!text)return;clearTurnTimer();stopRecognition();state.turnPrefix='';state.turnSession='';state.requestPrompt=text;state.requestInFlight=true;state.awaitingResponse=true;state.mode='request';setPrompt(text);setStatus('Procesando…','ok');updateBadge();var b=$('ceAiRun');if(b)b.click();}
  function startUser(seed){if(!state.conversationMode||state.speaking||state.requestInFlight||state.awaitingResponse)return;stopBarge();state.turnPrefix=clean(seed||state.turnPrefix);state.turnSession='';if(state.turnPrefix&&!state.cloudFallback){setPrompt(state.turnPrefix);scheduleTurnCommit();}state.mode='user';if(state.cloudFallback||!supportsRecognition())startCloudRecognition('user',false);else startRecognition('user',false);updateBadge();}

  function stopBarge(){state.bargeGeneration++;var r=state.bargeRecognition;state.bargeRecognition=null;try{r&&r.abort();}catch(_){try{r&&r.stop();}catch(__){}}}
  function startBarge(){stopRecognition();stopBarge();if(state.cloudFallback)return;if(!state.conversationMode||!state.speaking||!supportsRecognition())return;var C=recognitionCtor(),r=new C(),gen=++state.bargeGeneration;r.lang='es-ES';r.continuous=true;r.interimResults=true;r.maxAlternatives=3;state.bargeRecognition=r;r.onresult=function(ev){if(gen!==state.bargeGeneration||!state.speaking)return;var t=sessionText(ev);if(!hasBarge(t))return;var seed=bargeTail(t);stopSpeaking(true);state.turnPrefix=seed;state.turnSession='';setPrompt(seed);setStatus('Te escucho…','ok');setTimeout(function(){startUser(seed);},80);};r.onend=function(){if(gen!==state.bargeGeneration)return;state.bargeRecognition=null;if(state.speaking&&state.conversationMode)setTimeout(startBarge,80);};r.onerror=function(){};try{r.start();}catch(_){setTimeout(function(){if(state.speaking)startBarge();},120);}}

  function loadVoices(){if(!supportsSpeech())return;try{state.voices=window.speechSynthesis.getVoices()||[];}catch(_){state.voices=[];}populateVoices();}
  function spanishVoices(){return state.voices.filter(function(v){return /^es(?:-|_)/i.test(v.lang||'')||/spanish|español/i.test(v.name||'');});}
  function selectedMode(){var e=$('ceVoz3VoiceMode');return e?e.value:(safeGet(STORAGE.mode,'female')||'female');}
  function voiceKey(){return selectedMode()==='male'?STORAGE.male:STORAGE.female;}
  function populateVoices(){var sel=$('ceVoz3VoiceChoice');if(!sel)return;var list=spanishVoices(),wanted=safeGet(voiceKey(),'auto');sel.innerHTML='<option value="auto">Voz automática</option>'+list.map(function(v){var n=clean(v.name);return '<option value="'+n.replace(/"/g,'&quot;')+'"'+(n===wanted?' selected':'')+'>'+n+'</option>';}).join('');}
  function chooseVoice(){var list=spanishVoices(),sel=$('ceVoz3VoiceChoice'),wanted=sel?sel.value:safeGet(voiceKey(),'auto');if(wanted&&wanted!=='auto'){var exact=list.find(function(v){return v.name===wanted;});if(exact)return exact;}var male=/male|hombre|jorge|pablo|diego|alvaro|álvaro/i,female=/female|mujer|helena|monica|mónica|paulina|lucia|lucía/i;var re=selectedMode()==='male'?male:female;return list.find(function(v){return re.test(v.name||'');})||list[0]||state.voices[0]||null;}
  function speechRate(){var e=$('ceVoz3Rate'),n=Number(e?e.value:safeGet(STORAGE.rate,'0.92'));return Number.isFinite(n)?n:0.92;}
  function prepareSpeechText(v){return stripReservedFromSpeech(clean(v).replace(/[*_`#>|]/g,' ').replace(/\s+/g,' '));}
  function chunkSpeech(v){var text=prepareSpeechText(v);if(!text)return[];var sentences=text.split(/(?<=[.!?;:])\s+/),out=[],cur='';sentences.forEach(function(s){if((cur+' '+s).trim().length<=170)cur=clean(cur+' '+s);else{if(cur)out.push(cur);cur=s;}});if(cur)out.push(cur);return out.length?out:[text];}
  function stopSpeaking(interrupted){state.speechGeneration++;state.speaking=false;state.currentUtterance=null;state.speechChunks=[];state.speechIndex=0;stopBarge();try{window.speechSynthesis.pause();window.speechSynthesis.cancel();}catch(_){}updateBadge();if(!interrupted&&state.conversationMode&&!state.requestInFlight&&!state.awaitingResponse)setTimeout(startUser,180);}
  function speakChunks(answer){if(!supportsSpeech()||!state.conversationMode){startUser();return;}pauseCloudListening();stopRecognition();stopBarge();try{window.speechSynthesis.cancel();}catch(_){}state.speechGeneration++;var gen=state.speechGeneration;state.speechChunks=chunkSpeech(answer);state.speechIndex=0;state.speaking=true;state.mode='speaking';updateBadge();setStatus('Zuzu está hablando. «Perdona» o «Espera» para cortar.','ok');function next(){if(gen!==state.speechGeneration||!state.speaking)return;if(state.speechIndex>=state.speechChunks.length){state.speaking=false;stopBarge();updateBadge();setStatus('Te escucho…','ok');setTimeout(startUser,180);return;}var u=new SpeechSynthesisUtterance(state.speechChunks[state.speechIndex++]);u.lang='es-ES';u.rate=speechRate();u.volume=0.9;var voice=chooseVoice();if(voice)u.voice=voice;state.currentUtterance=u;u.onstart=function(){if(gen===state.speechGeneration)startBarge();};u.onend=function(){if(gen===state.speechGeneration)next();};u.onerror=function(){if(gen===state.speechGeneration)next();};try{window.speechSynthesis.speak(u);}catch(_){next();}}next();}
  function speakResponse(){var a=q('#ceAiResult .ce-ai-answer');if(a)speakChunks(clean(a.textContent));}
  function previewVoice(){if(!supportsSpeech())return;try{window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance('Esta es la voz de Zuzu. Estoy lista para conversar contigo.');u.lang='es-ES';u.rate=speechRate();u.volume=0.9;var v=chooseVoice();if(v)u.voice=v;window.speechSynthesis.speak(u);}catch(_){} }

  function entertainmentIndex(second,count){var seed=((Number(second)||0)+1)*1103515245+((Number(count)||0)+1)*12345;seed=(seed>>>0);seed=(Math.imul(seed^0x9e3779b9,2654435761)>>>0);var idx=seed%ENTERTAINMENT_PHRASES.length;if(idx===state.lastEntertainmentIndex)idx=(idx+1)%ENTERTAINMENT_PHRASES.length;state.lastEntertainmentIndex=idx;return idx;}
  function stopEntertainment(cancelSpeech){clearTimeout(state.entertainmentTimer);state.entertainmentTimer=null;var was=state.entertainmentSpeaking;state.entertainmentSpeaking=false;state.entertainmentUtterance=null;if(cancelSpeech&&was&&supportsSpeech()){try{window.speechSynthesis.cancel();}catch(_){} }}
  function scheduleEntertainment(delay){clearTimeout(state.entertainmentTimer);state.entertainmentTimer=setTimeout(function(){if(!state.conversationMode||!state.requestInFlight)return;speakEntertainmentPhrase();},Number(delay)||2000);}
  function speakEntertainmentPhrase(){if(!state.conversationMode||!state.requestInFlight||!supportsSpeech())return;stopEntertainment(false);var now=new Date(),secondOfHour=now.getMinutes()*60+now.getSeconds(),idx=entertainmentIndex(secondOfHour,state.entertainmentCount++),phrase=ENTERTAINMENT_PHRASES[idx];try{var u=new SpeechSynthesisUtterance(phrase);u.lang='es-ES';u.rate=Math.min(1,speechRate()+0.03);u.volume=0.94;var v=chooseVoice();if(v)u.voice=v;state.entertainmentSpeaking=true;state.entertainmentUtterance=u;u.onend=function(){state.entertainmentSpeaking=false;state.entertainmentUtterance=null;if(state.conversationMode&&state.requestInFlight)scheduleEntertainment(4200);};u.onerror=function(){state.entertainmentSpeaking=false;state.entertainmentUtterance=null;if(state.conversationMode&&state.requestInFlight)scheduleEntertainment(4200);};window.speechSynthesis.speak(u);}catch(_){state.entertainmentSpeaking=false;if(state.conversationMode&&state.requestInFlight)scheduleEntertainment(4200);}}
  function startEntertainment(){stopEntertainment(true);state.entertainmentCount=0;state.lastEntertainmentIndex=-1;if(state.conversationMode&&state.requestInFlight)scheduleEntertainment(2000);}

  function startManualRecording(){if(state.recordingActive||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined')return Promise.resolve(false);return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:true}}).then(function(stream){state.recorderStream=stream;state.recorderChunks=[];var mr=new MediaRecorder(stream);state.recorder=mr;mr.ondataavailable=function(e){if(e.data&&e.data.size)state.recorderChunks.push(e.data);};mr.onstop=function(){try{state.lastRecordingMime=mr.mimeType||'audio/webm';state.lastRecordingBlob=new Blob(state.recorderChunks,{type:state.lastRecordingMime});}catch(_){}state.recordingActive=false;try{stream.getTracks().forEach(function(t){t.stop();});}catch(_){}updateRecordButton();};mr.start(1000);state.recordingActive=true;updateRecordButton();return true;}).catch(function(){setStatus('Grabación no disponible; la conversación por voz sigue activa.','');return false;});}
  function updateRecordButton(){var b=$('ceVoz3RecordDownload');if(b)b.textContent=state.recordingActive?'⏹ Guardar voz':state.lastRecordingBlob?'⬇ Grabación':'⏺ Grabar';}
  function saveRecording(blob){if(!blob)return;var ext=/mp4/i.test(blob.type)?'mp4':'webm',a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ControlEvent-Zuzu-conversacion-'+new Date().toISOString().replace(/[-:T]/g,'').slice(0,14)+'.'+ext;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
  function toggleRecording(){if(state.recordingActive&&state.recorder){var mr=state.recorder;mr.addEventListener('stop',function once(){mr.removeEventListener('stop',once);setTimeout(function(){saveRecording(state.lastRecordingBlob);},30);});try{mr.stop();}catch(_){}return;}if(state.lastRecordingBlob){saveRecording(state.lastRecordingBlob);return;}startManualRecording();}

  function panelHtml(){var auto=safeGet(STORAGE.auto,'1')!=='0',mode=safeGet(STORAGE.mode,'female'),rate=safeGet(STORAGE.rate,'0.92');return '<div id="'+PANEL_ID+'">'+
    '<button type="button" id="ceVoz3Mic" class="ce-voz3-btn ce-voz3-mic">🎙️ Hablar</button>'+
    '<label class="ce-voz3-auto"><input id="ceVoz3AutoRead" type="checkbox"'+(auto?' checked':'')+'> Auto</label>'+
    '<button type="button" id="ceVoz3Read" class="ce-voz3-btn">🔊 Leer</button><button type="button" id="ceVoz3Stop" class="ce-voz3-btn">■ Parar</button>'+
    '<button type="button" id="ceVoz3RecordDownload" class="ce-voz3-btn">⏺ Grabar</button><button type="button" id="ceVoz3Preview" class="ce-voz3-btn">▶ Prueba</button>'+
    '<select id="ceVoz3VoiceMode"><option value="female"'+(mode==='female'?' selected':'')+'>♀ Femenina</option><option value="male"'+(mode==='male'?' selected':'')+'>♂ Masculina</option></select>'+
    '<select id="ceVoz3VoiceChoice"><option value="auto">Voz automática</option></select><select id="ceVoz3Rate"><option value="0.82"'+(rate==='0.82'?' selected':'')+'>Lento</option><option value="0.92"'+(rate==='0.92'?' selected':'')+'>Normal</option><option value="1.06"'+(rate==='1.06'?' selected':'')+'>Rápido</option></select>'+
    '<select id="ceVoz3MicChoice" title="Micrófono de entrada"><option value="">Mic automático</option></select>'+
    '<span id="ceVoz3Meter" class="ce-voz3-meter" title="Nivel del micrófono"><span class="ce-voz3-meter-track"><span id="ceVoz3MeterFill" class="ce-voz3-meter-fill"></span></span><span id="ceVoz3MeterValue" class="ce-voz3-meter-value">0.0</span></span>'+
    '<span id="ceVoz3Status" class="ce-voz3-status">Conversación por voz</span></div>';}
  function bindPanel(){var b=$('ceVoz3Mic');if(b)b.onclick=function(){if(state.conversationMode){if(state.cloudFallback){if(state.cloudWanted){pauseCloudListening();setStatus('Micrófono pausado.','');}else startCloudRecognition('user',true);}else if(state.recognition)stopRecognition();else startUser();}else{state.needsGesture=false;state.ambientEnabled=true;safeSet(STORAGE.ambient,'1');startAmbient(true);}};b=$('ceVoz3AutoRead');if(b)b.onchange=function(){safeSet(STORAGE.auto,b.checked?'1':'0');};b=$('ceVoz3Read');if(b)b.onclick=speakResponse;b=$('ceVoz3Stop');if(b)b.onclick=function(){stopSpeaking(true);startUser();};b=$('ceVoz3RecordDownload');if(b)b.onclick=toggleRecording;b=$('ceVoz3Preview');if(b)b.onclick=previewVoice;b=$('ceVoz3VoiceMode');if(b)b.onchange=function(){safeSet(STORAGE.mode,b.value);populateVoices();};b=$('ceVoz3VoiceChoice');if(b)b.onchange=function(){safeSet(voiceKey(),b.value);};b=$('ceVoz3Rate');if(b)b.onchange=function(){safeSet(STORAGE.rate,b.value);};b=$('ceVoz3MicChoice');if(b)b.onchange=function(){safeSet(STORAGE.mic,b.value||'');var kind=state.conversationMode?'user':'ambient';closeCloudVoice();state.cloudFallback=true;setTimeout(function(){startCloudRecognition(kind,true);},80);};loadVoices();refreshMicDevices();updateMicMeter(true);updateRecordButton();}
  function injectPanel(){var overlay=$('ceGeminiLibreOverlay');if(!overlay||$(PANEL_ID))return;injectStyle();var toolbar=q('.ce-ai-toolbar',overlay),pdf=$('ceAiDownloadResult');if(!toolbar)return;if(pdf)pdf.insertAdjacentHTML('afterend',panelHtml());else toolbar.insertAdjacentHTML('beforeend',panelHtml());bindPanel();}

  function endConversation(){clearWakeTimer();clearTurnTimer();stopEntertainment(true);stopRecognition();stopBarge();stopSpeaking(true);state.conversationMode=false;state.parked=false;state.requestInFlight=false;state.awaitingResponse=false;state.turnPrefix='';state.turnSession='';updateBadge();if(state.ambientEnabled&&!state.needsGesture)setTimeout(function(){startAmbient(false);},220);}
  function parkConversation(){if(!state.conversationMode)return;clearTurnTimer();stopEntertainment(true);stopRecognition();stopBarge();stopSpeaking(true);state.conversationMode=false;state.parked=true;state.requestInFlight=false;state.awaitingResponse=false;updateBadge();if(state.ambientEnabled&&!state.needsGesture)setTimeout(function(){startAmbient(false);},220);}

  document.addEventListener('ce:zuzu-request-started',function(ev){if(!state.conversationMode)return;pauseCloudListening();state.requestInFlight=true;state.awaitingResponse=true;state.requestPrompt=clean(ev&&ev.detail&&ev.detail.prompt||state.requestPrompt);stopRecognition();clearTurnTimer();setStatus('Consultando ControlEvent…','ok');startEntertainment();});
  document.addEventListener('ce:zuzu-request-error',function(){if(!state.conversationMode)return;state.requestInFlight=false;state.awaitingResponse=false;stopEntertainment(true);setStatus('No se pudo completar. Te escucho.','err');setTimeout(startUser,180);});
  document.addEventListener('ce:zuzu-response-rendered',function(ev){if(!state.conversationMode)return;state.requestInFlight=false;state.awaitingResponse=false;stopEntertainment(true);var answer=stripVoiceAnswerLead(clean(ev&&ev.detail&&ev.detail.answer)),title=clean(ev&&ev.detail&&ev.detail.title);if(!answer){setTimeout(startUser,120);return;}var auto=$('ceVoz3AutoRead');if(!auto||auto.checked!==false)speakChunks(voiceBridge(state.requestPrompt,title)+' '+answer);else startUser();});
  window.addEventListener('controlevent:zuzu-opened',function(){setTimeout(injectPanel,30);});
  window.addEventListener('controlevent:zuzu-closed',function(){parkConversation();});
  document.addEventListener('click',function(ev){var t=ev.target;if(t&&t.closest&&t.closest('#ceAiDownloadResult')&&state.conversationMode)endConversation();},true);

  function install(){
    injectStyle();injectBadge();injectPanel();
    // FIX27: la escucha queda ACTIVA por defecto en esta compilación. Si el navegador la
    // rechaza sin gesto, NO insistimos por temporizador: esperamos el siguiente gesto normal
    // (por ejemplo Entrar) y arrancamos el reconocimiento dentro de ese mismo evento.
    safeSet(STORAGE.ambient,'1');state.ambientEnabled=true;
    if(supportsSpeech()){loadVoices();try{window.speechSynthesis.onvoiceschanged=loadVoices;}catch(_){} }
    // FIX28: no dependemos ciegamente del servicio remoto de Web Speech. Si Chrome ya tiene
    // español local instalado lo usamos desde el primer ciclo; si no, probamos red y ante
    // error `network` descargamos/activamos automáticamente el reconocimiento local.
    try{var LC=localSpeechApi();if(LC)LC.available({langs:['es-ES'],processLocally:true}).then(function(r){if(clean(r).toLowerCase()==='available')state.localSpeechReady=true;}).catch(function(){});}catch(_){}
    if(state.ambientEnabled)setTimeout(function(){if(!supportsRecognition()){state.cloudFallback=true;startCloudRecognition('ambient',false);}else startAmbient(false);},350);
    document.addEventListener('pointerdown',primeAmbientFromGesture,true);
    document.addEventListener('touchstart',primeAmbientFromGesture,{capture:true,passive:true});
    document.addEventListener('keydown',primeAmbientFromGesture,true);
    document.addEventListener('click',primeAmbientFromGesture,true);
    if(window.MutationObserver){new MutationObserver(function(){if($('ceGeminiLibreOverlay'))injectPanel();}).observe(document.documentElement,{childList:true,subtree:true});}
    window.addEventListener('beforeunload',function(){stopRecognition();closeCloudVoice();stopBarge();stopEntertainment(true);try{state.recorder&&state.recordingActive&&state.recorder.stop();}catch(_){}try{state.recorderStream&&state.recorderStream.getTracks().forEach(function(t){t.stop();});}catch(_){} });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

  window.ControlEventVoiceTurns={
    version:BUILD,isConversationalMode:function(){return !!state.conversationMode;},
    startAmbientListening:function(){state.ambientEnabled=true;state.needsGesture=false;safeSet(STORAGE.ambient,'1');startAmbient(true);},
    endVoiceConversation:endConversation,downloadConversationRecording:toggleRecording,
    speakResponse:speakResponse,stopSpeaking:stopSpeaking,supportsRecognition:supportsRecognition,supportsDeviceSpeech:supportsSpeech,
    debugState:function(){return{build:BUILD,ambientEnabled:state.ambientEnabled,conversationMode:state.conversationMode,recognitionStarting:state.recognitionStarting,recognitionLive:state.recognitionLive,needsGesture:state.needsGesture,mode:state.mode,localSpeechReady:state.localSpeechReady,localSpeechPreparing:state.localSpeechPreparing,localSpeechUnavailable:state.localSpeechUnavailable,lastRecognitionError:state.lastRecognitionError,cloudFallback:state.cloudFallback,cloudWanted:state.cloudWanted,cloudRecording:state.cloudRecording,cloudBusy:state.cloudBusy,cloudLastTranscript:state.cloudLastTranscript,mic:{label:state.cloudDeviceLabel,id:state.cloudDeviceId,rms:state.cloudRms,channels:state.cloudChannelRms,peak:state.cloudPeak,noise:state.cloudNoiseFloor,threshold:state.cloudThreshold,calibrated:state.cloudCalibrationDone,settings:state.cloudDeviceSettings}};}
  };
  window.ControlEventVoiceV2=window.ControlEventVoiceTurns;
  window.ControlEventV22Voz4=window.ControlEventVoiceTurns;
  window.ControlEventV22Voz3=window.ControlEventVoiceTurns;
})();
