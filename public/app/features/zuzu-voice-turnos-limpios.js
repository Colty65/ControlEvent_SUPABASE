/* ControlEvent v1.0_exp · Zuzu Voice · Transporte de turnos limpio
   Dócil + fluida + exacta en la captura de turnos.
   Arquitectura de audio deliberadamente simple:
   AMBIENTE -> captura completa de "Hola Zuzu ..." -> USUARIO -> ESPERA IA -> ZUZU HABLA.
   Durante la locución NO existe un reconocedor de usuario: solo un detector de "Perdona/Espera".
*/
(function(){
  'use strict';
  if(window.__ceZuzuVoiceTurns) return;
  window.__ceZuzuVoiceTurns=true;

  var BUILD='v1.0_exp-VOICE-TURNS-CLEAN';
  var PANEL_ID='ceV22Voz3Panel';
  var STYLE_ID='ceZuzuVoiceV2Style';
  var STORAGE={
    ambient:'ce_zuzu_voz4_ambient_wake', auto:'ce_zuzu_voz3_auto_read', rate:'ce_zuzu_voz3_rate',
    mode:'ce_zuzu_voz3_voice_mode', female:'ce_zuzu_voz3_female_voice', male:'ce_zuzu_voz3_male_voice'
  };
  var state={
    mode:'idle', ambientEnabled:true, conversationMode:false, parked:false,
    recognition:null, recognitionGeneration:0, recognitionStarting:false,
    wakeCapture:false, wakeText:'', wakeSession:'', wakeTimer:null, wakeLastAt:0,
    turnPrefix:'', turnSession:'', turnTimer:null, turnLastAt:0,
    requestInFlight:false, awaitingResponse:false,
    speaking:false, speechGeneration:0, speechChunks:[], speechIndex:0, currentUtterance:null,
    bargeRecognition:null, bargeGeneration:0, bargeSeed:'',
    voices:[],
    recorderStream:null, recorder:null, recorderChunks:[], recordingActive:false, lastRecordingBlob:null, lastRecordingMime:''
  };

  function $(id){return document.getElementById(id);}
  function q(sel,root){return (root||document).querySelector(sel);}
  function clean(v){return String(v==null?'':v).replace(/\s+/g,' ').trim();}
  function norm(v){var s=clean(v);try{s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,'');}catch(_){}return s.toLowerCase().replace(/[^a-z0-9ñ ]+/g,' ').replace(/\s+/g,' ').trim();}
  function safeGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:v;}catch(_){return d;}}
  function safeSet(k,v){try{localStorage.setItem(k,String(v));}catch(_){}}
  function supportsRecognition(){return !!(window.SpeechRecognition||window.webkitSpeechRecognition);}
  function supportsSpeech(){return !!(window.speechSynthesis&&window.SpeechSynthesisUtterance);}
  function promptEl(){return $('ceAiPrompt');}
  function setPrompt(v){var p=promptEl();if(!p)return;p.value=clean(v);try{p.dispatchEvent(new Event('input',{bubbles:true}));p.setSelectionRange(p.value.length,p.value.length);}catch(_){}}
  function setStatus(msg,kind){var e=$('ceVoz3Status');if(!e)return;e.className='ce-voz3-status'+(kind?' '+kind:'');e.textContent=msg||'';}
  function setMic(on){var b=$('ceVoz3Mic');if(!b)return;b.classList.toggle('is-listening',!!on);b.textContent=on?'⏹ Detener micro':'🎙️ Hablar';}
  function mergeText(base,part){base=clean(base);part=clean(part);if(!part)return base;if(!base)return part;var nb=norm(base),np=norm(part);if(nb===np||nb.endsWith(np))return base;if(np.startsWith(nb))return part;return clean(base+' '+part);}
  function isZuzuWord(w){w=norm(w).replace(/\s/g,'');return ['zuzu','susu','suzu','zusu','zulu','yuyu'].indexOf(w)>=0 || (w.length>=3&&w.length<=6&&w.charAt(0)==='z');}
  function wakeInfo(v){var words=norm(v).split(' ').filter(Boolean);for(var i=0;i<words.length-1;i++){if(['hola','ola','oye','ey','eh','buenas'].indexOf(words[i])>=0&&isZuzuWord(words[i+1]))return{ok:true,index:i};}return{ok:false,index:-1};}
  function hasWake(v){return wakeInfo(v).ok;}
  function hasBarge(v){return /\b(perdona|perdon|espera|esperate)\b/.test(norm(v));}
  function bargeTail(v){var raw=clean(v),re=/\b(perdona|perd[oó]n|espera|esp[eé]rate)\b/ig,m,last=null;while((m=re.exec(raw)))last=re.lastIndex;return last==null?'':clean(raw.slice(last).replace(/^[\s,;:.!?-]+/,''));}
  function stripReservedFromSpeech(v){return clean(v).replace(/\bperdona\b/ig,'disculpa').replace(/\bperd[oó]n\b/ig,'disculpa').replace(/\bespera\b/ig,'aguarda').replace(/\besp[eé]rate\b/ig,'aguarda');}

  function injectStyle(){
    if($(STYLE_ID))return;var st=document.createElement('style');st.id=STYLE_ID;
    st.textContent='\n#'+PANEL_ID+'{display:inline-flex;align-items:center;gap:4px;flex:1 1 560px;min-width:300px;flex-wrap:wrap;margin:0;padding:0;border:0;background:transparent;color:#0f172a}'+
      '#'+PANEL_ID+' .ce-voz3-btn{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:8px;padding:5px 7px;font-size:10px;font-weight:850;cursor:pointer;min-height:30px;line-height:1;white-space:nowrap}'+
      '#'+PANEL_ID+' .ce-voz3-mic{border-color:#fb923c;background:#fff7ed;color:#9a3412;min-width:76px}#'+PANEL_ID+' .ce-voz3-mic.is-listening{background:#dc2626;color:#fff;border-color:#b91c1c}'+
      '#'+PANEL_ID+' .ce-voz3-auto{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:900;border:1px solid #fed7aa;background:#fff7ed;border-radius:8px;padding:4px 6px;min-height:30px}#'+PANEL_ID+' select{border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:4px 5px;font-size:9px;font-weight:800;min-height:30px;max-width:165px}'+
      '#'+PANEL_ID+' .ce-voz3-status{font-size:9px;font-weight:800;color:#475569;flex:1 1 120px;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#'+PANEL_ID+' .ce-voz3-status.ok{color:#15803d}#'+PANEL_ID+' .ce-voz3-status.err{color:#b91c1c}'+
      '.ce-zuzu-wake-badge{position:fixed;right:18px;bottom:18px;z-index:99970;border:1px solid #cbd5e1;background:rgba(255,255,255,.95);color:#475569;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:900;box-shadow:0 6px 20px rgba(15,23,42,.13);cursor:pointer}.ce-zuzu-wake-badge.is-listening{border-color:#86efac;background:#f0fdf4;color:#166534}.ce-zuzu-wake-badge.is-conversation{border-color:#fdba74;background:#fff7ed;color:#9a3412}';
    document.head.appendChild(st);
  }
  function updateBadge(){var b=$('ceZuzuWakeBadge');if(!b)return;if(state.conversationMode){b.className='ce-zuzu-wake-badge is-conversation';b.textContent=state.speaking?'🔊 Zuzu habla':'🎙 Conversando con Zuzu';return;}if(state.ambientEnabled){b.className='ce-zuzu-wake-badge is-listening';b.textContent=state.wakeCapture?'👂 Sigue hablando…':'👂 Hola Zuzu';}else{b.className='ce-zuzu-wake-badge';b.textContent='👂 Activar Zuzu';}}
  function injectBadge(){if($('ceZuzuWakeBadge')||!document.body)return;var b=document.createElement('button');b.id='ceZuzuWakeBadge';b.type='button';b.addEventListener('click',function(){state.ambientEnabled=!state.ambientEnabled;safeSet(STORAGE.ambient,state.ambientEnabled?'1':'0');if(state.ambientEnabled)startAmbient();else stopRecognition();updateBadge();});document.body.appendChild(b);updateBadge();}

  function recognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition;}
  function stopRecognition(){state.recognitionGeneration++;state.recognitionStarting=false;var r=state.recognition;state.recognition=null;try{r&&r.abort();}catch(_){try{r&&r.stop();}catch(__){}}setMic(false);}
  function sessionText(ev){var parts=[];for(var i=0;i<ev.results.length;i++){var t=clean(ev.results[i]&&ev.results[i][0]&&ev.results[i][0].transcript);if(t)parts.push(t);}return clean(parts.join(' '));}
  function newRecognition(kind){
    var C=recognitionCtor();if(!C)return null;var r=new C(),gen=++state.recognitionGeneration;r.lang='es-ES';r.continuous=true;r.interimResults=true;r.maxAlternatives=3;r.__gen=gen;r.__kind=kind;
    r.onstart=function(){if(gen!==state.recognitionGeneration)return;state.recognitionStarting=false;setMic(kind==='user');if(kind==='ambient')setStatus(state.wakeCapture?'Sigue hablando…':'Di «Hola Zuzu…»','ok');if(kind==='user')setStatus('Te escucho…','ok');};
    r.onerror=function(ev){if(gen!==state.recognitionGeneration)return;state.recognitionStarting=false;var code=clean(ev&&ev.error);if(code&&code!=='no-speech'&&code!=='aborted')setStatus('Micrófono: '+code,'err');};
    r.onend=function(){if(gen!==state.recognitionGeneration)return;state.recognitionStarting=false;state.recognition=null;setMic(false);if(kind==='ambient'&&state.ambientEnabled&&!state.conversationMode)setTimeout(startAmbient,80);else if(kind==='user'&&state.conversationMode&&!state.speaking&&!state.requestInFlight&&!state.awaitingResponse)setTimeout(startUser,80);};
    r.onresult=function(ev){if(gen!==state.recognitionGeneration)return;var t=sessionText(ev);if(kind==='ambient')handleAmbientText(t);else handleUserText(t);};
    return r;
  }
  function startRecognition(kind){if(!supportsRecognition())return;if(state.recognitionStarting||state.recognition)return;state.recognitionStarting=true;state.mode=kind;var r=newRecognition(kind);state.recognition=r;try{r.start();}catch(_){state.recognitionStarting=false;state.recognition=null;setTimeout(function(){if(kind==='ambient')startAmbient();else startUser();},160);}}

  function clearWakeTimer(){clearTimeout(state.wakeTimer);state.wakeTimer=null;}
  function handleAmbientText(text){
    if(!text)return;
    if(!state.wakeCapture){if(!hasWake(text))return;state.wakeCapture=true;state.wakeText=clean(text);state.wakeSession=clean(text);state.wakeLastAt=Date.now();updateBadge();}
    else{
      if(text!==state.wakeSession){var delta=text;if(norm(text).startsWith(norm(state.wakeSession)))delta=clean(text.slice(state.wakeSession.length));state.wakeText=mergeText(state.wakeText,delta);state.wakeSession=text;state.wakeLastAt=Date.now();}
    }
    clearWakeTimer();state.wakeTimer=setTimeout(commitWake,2000);
  }
  function commitWake(){
    if(!state.wakeCapture)return;var elapsed=Date.now()-state.wakeLastAt;if(elapsed<1850){clearWakeTimer();state.wakeTimer=setTimeout(commitWake,1900-elapsed);return;}
    var full=clean(state.wakeText);state.wakeCapture=false;state.wakeText='';state.wakeSession='';clearWakeTimer();stopRecognition();
    state.conversationMode=true;state.parked=false;state.mode='request';state.requestInFlight=true;state.awaitingResponse=true;updateBadge();ensureRecording();
    setStatus('Procesando tu pregunta completa…','ok');
    if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.submitVoicePrompt==='function')window.ControlEventV113ZuzuAnalitica.submitVoicePrompt(full||'Hola Zuzu');
  }
  function startAmbient(){if(!state.ambientEnabled||state.conversationMode||state.speaking||state.requestInFlight)return;state.mode='ambient';startRecognition('ambient');updateBadge();}

  function clearTurnTimer(){clearTimeout(state.turnTimer);state.turnTimer=null;}
  function currentTurn(){return mergeText(state.turnPrefix,state.turnSession);}
  function scheduleTurnCommit(){clearTurnTimer();state.turnLastAt=Date.now();state.turnTimer=setTimeout(commitUserTurn,1800);}
  function handleUserText(text){
    if(!text)return;state.turnSession=text;setPrompt(currentTurn());scheduleTurnCommit();
  }
  function commitUserTurn(){
    var elapsed=Date.now()-state.turnLastAt;if(elapsed<1650){clearTurnTimer();state.turnTimer=setTimeout(commitUserTurn,1700-elapsed);return;}
    var text=clean(currentTurn());if(!text)return;clearTurnTimer();stopRecognition();state.turnPrefix='';state.turnSession='';state.requestInFlight=true;state.awaitingResponse=true;state.mode='request';setPrompt(text);setStatus('Procesando…','ok');updateBadge();
    var b=$('ceAiRun');if(b)b.click();
  }
  function startUser(seed){
    if(!state.conversationMode||state.speaking||state.requestInFlight||state.awaitingResponse)return;stopBarge();state.turnPrefix=clean(seed||state.turnPrefix);state.turnSession='';if(state.turnPrefix){setPrompt(state.turnPrefix);scheduleTurnCommit();}state.mode='user';startRecognition('user');updateBadge();
  }

  function stopBarge(){state.bargeGeneration++;var r=state.bargeRecognition;state.bargeRecognition=null;try{r&&r.abort();}catch(_){try{r&&r.stop();}catch(__){}}}
  function startBarge(){
    stopRecognition();stopBarge();if(!state.conversationMode||!state.speaking||!supportsRecognition())return;var C=recognitionCtor(),r=new C(),gen=++state.bargeGeneration;r.lang='es-ES';r.continuous=true;r.interimResults=true;r.maxAlternatives=3;state.bargeRecognition=r;
    r.onresult=function(ev){if(gen!==state.bargeGeneration||!state.speaking)return;var t=sessionText(ev);if(!hasBarge(t))return;var seed=bargeTail(t);stopSpeaking(true);state.turnPrefix=seed;state.turnSession='';setPrompt(seed);setStatus('Te escucho…','ok');setTimeout(function(){startUser(seed);},80);};
    r.onend=function(){if(gen!==state.bargeGeneration)return;state.bargeRecognition=null;if(state.speaking&&state.conversationMode)setTimeout(startBarge,80);};
    r.onerror=function(){};try{r.start();}catch(_){setTimeout(function(){if(state.speaking)startBarge();},120);}
  }

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
  function speakChunks(answer){
    if(!supportsSpeech()||!state.conversationMode){startUser();return;}stopRecognition();stopBarge();try{window.speechSynthesis.cancel();}catch(_){}state.speechGeneration++;var gen=state.speechGeneration;state.speechChunks=chunkSpeech(answer);state.speechIndex=0;state.speaking=true;state.mode='speaking';updateBadge();setStatus('Zuzu está hablando. «Perdona» o «Espera» para cortar.','ok');
    function next(){if(gen!==state.speechGeneration||!state.speaking)return;if(state.speechIndex>=state.speechChunks.length){state.speaking=false;stopBarge();updateBadge();setStatus('Te escucho…','ok');setTimeout(startUser,180);return;}var u=new SpeechSynthesisUtterance(state.speechChunks[state.speechIndex++]);u.lang='es-ES';u.rate=speechRate();u.volume=0.9;var voice=chooseVoice();if(voice)u.voice=voice;state.currentUtterance=u;u.onstart=function(){if(gen===state.speechGeneration)startBarge();};u.onend=function(){if(gen===state.speechGeneration)next();};u.onerror=function(){if(gen===state.speechGeneration)next();};try{window.speechSynthesis.speak(u);}catch(_){next();}}
    next();
  }
  function speakResponse(){var a=q('#ceAiResult .ce-ai-answer');if(a)speakChunks(clean(a.textContent));}
  function previewVoice(){if(!supportsSpeech())return;try{window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance('Esta es la voz de Zuzu. Estoy lista para conversar contigo.');u.lang='es-ES';u.rate=speechRate();u.volume=0.9;var v=chooseVoice();if(v)u.voice=v;window.speechSynthesis.speak(u);}catch(_){}}

  async function ensureRecording(){
    if(state.recordingActive||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined')return;
    try{var stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:true}});state.recorderStream=stream;state.recorderChunks=[];var mr=new MediaRecorder(stream);state.recorder=mr;mr.ondataavailable=function(e){if(e.data&&e.data.size)state.recorderChunks.push(e.data);};mr.onstop=function(){try{state.lastRecordingMime=mr.mimeType||'audio/webm';state.lastRecordingBlob=new Blob(state.recorderChunks,{type:state.lastRecordingMime});}catch(_){}state.recordingActive=false;updateRecordButton();};mr.start(1000);state.recordingActive=true;updateRecordButton();}catch(_){setStatus('Conversación activa; grabación no disponible.','');}
  }
  function updateRecordButton(){var b=$('ceVoz3RecordDownload');if(b)b.textContent=state.recordingActive?'⬇ Grabación':'⬇ Última grabación';}
  function downloadRecording(){
    function save(blob){if(!blob)return;var ext=/mp4/i.test(blob.type)?'mp4':'webm',a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ControlEvent-Zuzu-conversacion-'+new Date().toISOString().replace(/[-:T]/g,'').slice(0,14)+'.'+ext;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);endConversation('recording');}
    if(state.recordingActive&&state.recorder){var mr=state.recorder;mr.addEventListener('stop',function once(){mr.removeEventListener('stop',once);setTimeout(function(){save(state.lastRecordingBlob);},30);});try{mr.stop();}catch(_){}}else save(state.lastRecordingBlob);
  }

  function panelHtml(){var auto=safeGet(STORAGE.auto,'1')!=='0',mode=safeGet(STORAGE.mode,'female'),rate=safeGet(STORAGE.rate,'0.92');return '<div id="'+PANEL_ID+'">'+
    '<button type="button" id="ceVoz3Mic" class="ce-voz3-btn ce-voz3-mic">🎙️ Hablar</button>'+
    '<label class="ce-voz3-auto"><input id="ceVoz3AutoRead" type="checkbox"'+(auto?' checked':'')+'> Auto</label>'+
    '<button type="button" id="ceVoz3Read" class="ce-voz3-btn">🔊 Leer</button><button type="button" id="ceVoz3Stop" class="ce-voz3-btn">■ Parar</button>'+
    '<button type="button" id="ceVoz3RecordDownload" class="ce-voz3-btn">⬇ Grabación</button><button type="button" id="ceVoz3Preview" class="ce-voz3-btn">▶ Prueba</button>'+
    '<select id="ceVoz3VoiceMode"><option value="female"'+(mode==='female'?' selected':'')+'>♀ Femenina</option><option value="male"'+(mode==='male'?' selected':'')+'>♂ Masculina</option></select>'+
    '<select id="ceVoz3VoiceChoice"><option value="auto">Voz automática</option></select><select id="ceVoz3Rate"><option value="0.82"'+(rate==='0.82'?' selected':'')+'>Lento</option><option value="0.92"'+(rate==='0.92'?' selected':'')+'>Normal</option><option value="1.06"'+(rate==='1.06'?' selected':'')+'>Rápido</option></select>'+
    '<span id="ceVoz3Status" class="ce-voz3-status">Conversación por voz</span></div>';}
  function bindPanel(){
    var b=$('ceVoz3Mic');if(b)b.onclick=function(){if(state.conversationMode){if(state.recognition)stopRecognition();else startUser();}else startAmbient();};
    b=$('ceVoz3AutoRead');if(b)b.onchange=function(){safeSet(STORAGE.auto,b.checked?'1':'0');};
    b=$('ceVoz3Read');if(b)b.onclick=speakResponse;b=$('ceVoz3Stop');if(b)b.onclick=function(){stopSpeaking(true);startUser();};b=$('ceVoz3RecordDownload');if(b)b.onclick=downloadRecording;b=$('ceVoz3Preview');if(b)b.onclick=previewVoice;
    b=$('ceVoz3VoiceMode');if(b)b.onchange=function(){safeSet(STORAGE.mode,b.value);populateVoices();};b=$('ceVoz3VoiceChoice');if(b)b.onchange=function(){safeSet(voiceKey(),b.value);};b=$('ceVoz3Rate');if(b)b.onchange=function(){safeSet(STORAGE.rate,b.value);};loadVoices();updateRecordButton();
  }
  function injectPanel(){var overlay=$('ceGeminiLibreOverlay');if(!overlay||$(PANEL_ID))return;injectStyle();var toolbar=q('.ce-ai-toolbar',overlay),pdf=$('ceAiDownloadResult');if(!toolbar)return;if(pdf)pdf.insertAdjacentHTML('afterend',panelHtml());else toolbar.insertAdjacentHTML('beforeend',panelHtml());bindPanel();}

  function endConversation(reason){clearWakeTimer();clearTurnTimer();stopRecognition();stopBarge();stopSpeaking(true);state.conversationMode=false;state.parked=false;state.requestInFlight=false;state.awaitingResponse=false;state.turnPrefix='';state.turnSession='';updateBadge();if(state.ambientEnabled)setTimeout(startAmbient,220);}
  function parkConversation(){if(!state.conversationMode)return;clearTurnTimer();stopRecognition();stopBarge();stopSpeaking(true);state.conversationMode=false;state.parked=true;state.requestInFlight=false;state.awaitingResponse=false;updateBadge();if(state.ambientEnabled)setTimeout(startAmbient,220);}

  document.addEventListener('ce:zuzu-request-started',function(){if(!state.conversationMode)return;state.requestInFlight=true;state.awaitingResponse=true;stopRecognition();clearTurnTimer();setStatus('Consultando ControlEvent…','ok');});
  document.addEventListener('ce:zuzu-request-error',function(){if(!state.conversationMode)return;state.requestInFlight=false;state.awaitingResponse=false;setStatus('No se pudo completar. Te escucho.','err');setTimeout(startUser,180);});
  document.addEventListener('ce:zuzu-response-rendered',function(ev){if(!state.conversationMode)return;state.requestInFlight=false;state.awaitingResponse=false;var answer=clean(ev&&ev.detail&&ev.detail.answer);var auto=$('ceVoz3AutoRead');if(!auto||auto.checked!==false)speakChunks(answer);else startUser();});
  window.addEventListener('controlevent:zuzu-opened',function(){setTimeout(injectPanel,30);});
  window.addEventListener('controlevent:zuzu-closed',function(){parkConversation();});
  document.addEventListener('click',function(ev){var t=ev.target;if(t&&t.closest&&t.closest('#ceAiDownloadResult')&&state.conversationMode)endConversation('pdf');},true);

  function install(){injectStyle();injectBadge();injectPanel();state.ambientEnabled=safeGet(STORAGE.ambient,'1')!=='0';if(supportsSpeech()){loadVoices();try{window.speechSynthesis.onvoiceschanged=loadVoices;}catch(_){}}if(state.ambientEnabled)setTimeout(startAmbient,500);if(window.MutationObserver){new MutationObserver(function(){if($('ceGeminiLibreOverlay'))injectPanel();}).observe(document.documentElement,{childList:true,subtree:true});}window.addEventListener('beforeunload',function(){stopRecognition();stopBarge();try{state.recorder&&state.recordingActive&&state.recorder.stop();}catch(_){}try{state.recorderStream&&state.recorderStream.getTracks().forEach(function(t){t.stop();});}catch(_){}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

  window.ControlEventVoiceTurns={
    version:BUILD,isConversationalMode:function(){return !!state.conversationMode;},
    startAmbientListening:startAmbient,endVoiceConversation:endConversation,downloadConversationRecording:downloadRecording,
    speakResponse:speakResponse,stopSpeaking:stopSpeaking,supportsRecognition:supportsRecognition,supportsDeviceSpeech:supportsSpeech
  };
  // Compatibilidad mínima con el módulo Zuzu sin cargar el controlador histórico.
  window.ControlEventVoiceV2=window.ControlEventVoiceTurns;
  window.ControlEventV22Voz4=window.ControlEventVoiceTurns;
  window.ControlEventV22Voz3=window.ControlEventVoiceTurns;
})();
