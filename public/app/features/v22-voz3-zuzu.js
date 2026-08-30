/* ControlEvent v4_0_exp · Zuzu Voice · RAW14U/Z1H · guard local de residuos + barge-in robusto + pensamiento breve de espera
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

  var BUILD='v4_0_exp-BANK4_27-Z1H-VOICE-V56';
  var PANEL_ID='ceV22Voz3Panel';
  var STYLE_ID='ceZuzuVoiceV2Style';
  var STORAGE={
    ambient:'ce_zuzu_voz4_ambient_wake', auto:'ce_zuzu_voz3_auto_read', rate:'ce_zuzu_voz3_rate',
    mode:'ce_zuzu_voz3_voice_mode', female:'ce_zuzu_voz3_female_voice', male:'ce_zuzu_voz3_male_voice', mic:'ce_zuzu_voz3_mic_device', manualDraft:'ce_zuzu_manual_draft_v4', entertainmentDeck:'ce_zuzu_voz3_entertainment_deck_v56', entertainmentLast:'ce_zuzu_voz3_entertainment_last_v56', entertainmentCycle:'ce_zuzu_voz3_entertainment_cycle_v56', entertainmentUsed:'ce_zuzu_voz3_entertainment_used_v56', entertainmentRequestCounter:'ce_zuzu_voz3_entertainment_request_counter_v56'
  };
  var state={
    mode:'idle', ambientEnabled:true, conversationMode:false, parked:false,
    recognition:null, recognitionGeneration:0, recognitionStarting:false, recognitionLive:false, needsGesture:false, webSpeechNoSpeechCount:0, webSpeechStartFailures:0,
    localSpeechReady:false, localSpeechPreparing:false, localSpeechAttempted:false, localSpeechUnavailable:false, lastRecognitionError:'', pendingRecognitionKind:'ambient',
    cloudFallback:false, cloudStream:null, cloudAudioContext:null, cloudSource:null, cloudAnalyser:null, cloudSplitter:null, cloudAnalysers:[], cloudChannelRms:[], cloudMonitor:null, cloudWanted:false, cloudKind:'ambient', cloudRecorder:null, cloudChunks:[], cloudRecording:false, cloudBusy:false, cloudLastVoiceAt:0, cloudRecordStartedAt:0,
    cloudThreshold:0.006, cloudNoiseFloor:0.001, cloudRms:0, cloudPeak:0, cloudVoiceFrames:0, cloudCalibratingUntil:0, cloudNoiseSamples:[], cloudCalibrationDone:false, cloudMeterLastPaint:0, cloudDeviceLabel:'', cloudDeviceId:'', cloudDeviceSettings:{}, cloudGeneration:0, cloudLastTranscript:'',
    wakeCapture:false, wakeText:'', wakeSession:'', wakeTimer:null, wakeLastAt:0,
    turnPrefix:'', turnSession:'', turnTimer:null, turnLastAt:0, turnCommitMs:3000, replyWindowTimer:null, replyWindowUntil:0, replyWindowMs:12000,
    postClearUntil:0, postClearQuarantineMs:8000, postClearDiscardTimer:null, postClearMinWords:3, postClearMinChars:10, voiceResidueUntil:0, voiceResidueQuarantineMs:4200, lastLocalControlEndedAt:0,
    voicePhase:'BOOT', voicePhaseSince:Date.now(), voicePhaseHistory:[], recognitionStartWatchdog:null, cloudStartWatchdog:null, ambientHealthTimer:null, overlayMissingSince:0, recognitionStartedAt:0, recognitionLastResultAt:0, ambientSessionMaxMs:26000, localControlSpeaking:false, localControlGeneration:0,
    requestInFlight:false, awaitingResponse:false, requestPrompt:'', requestTitle:'',
    speaking:false, speechGeneration:0, speechChunks:[], speechIndex:0, currentUtterance:null,
    bargeRecognition:null, bargeGeneration:0,
    voices:[],
    recorderStream:null, recorder:null, recorderChunks:[], recordingActive:false, lastRecordingBlob:null, lastRecordingMime:'',
    entertainmentTimer:null, entertainmentCount:0, entertainmentInitialDelayMs:3300, entertainmentIntervalMs:0, entertainmentMaxPerRequest:1, entertainmentSpeaking:false, entertainmentUtterance:null, entertainmentFinishedAt:0, pendingAnswerTimer:null, lastEntertainmentIndex:-1, entertainmentDeck:[], entertainmentUsed:[], pendingEntertainmentIndex:-1, entertainmentCycle:0, entertainmentLoaded:false, entertainmentRequestCounter:0, entertainmentPersonalize:false,
    manualDraftOwned:false, manualDraftValue:'', programmaticPromptWrite:0, manualDraftBoundTo:null
  };

  // Z1H · La espera no es una segunda conversación. El humano suele callarse y pensar.
  // Si la respuesta tarda, Zuzu emite COMO MÁXIMO una microseñal de pensamiento, breve y
  // no temática. El mazo evita repeticiones hasta agotarse; no se personaliza con nombres.
  // BANK4_19 · Frases de pensamiento: display y audio están separados.
  // La pantalla puede conservar puntos largos; TTS recibe palabras pronunciables y pausas
  // explícitas. Así «ummmmm» suena como una vacilación y no como «eme, eme, eme».
  var ENTERTAINMENT_PHRASES=[
    {display:'Ummmmm................... espera un poco, que estoy intentando acordarme bien.',speech:[['uuuuuuuummmmmmmmmmmmmm',900,0.28],['espera un poco, que estoy intentando acordarme bien.',0,0.90]]},
    {display:'Ufffff............... a ver, que estoy tirando del hilo y no quiero saltarme nada.',speech:[['ufffffff',650,0.55],['a ver, que estoy tirando del hilo y no quiero saltarme nada.',0,0.90]]},
    {display:'Aaaah............... espera, espera, que esto me suena mucho.',speech:[['aaaaah',620,0.58],['espera, espera.',380,0.88],['que esto me suena mucho.',0,0.90]]},
    {display:'Ummmmm............... calla, que creo que ya sé por dónde va esto.',speech:[['uuuuuuuummmmmmmmmmmmmm',900,0.28],['calla, que creo que ya sé por dónde va esto.',0,0.90]]},
    {display:'Ufffff............... lo tengo en la punta de la lengua... dame un segundo.',speech:[['ufffffff',650,0.55],['lo tengo en la punta de la lengua.',460,0.88],['dame un segundo.',0,0.90]]},
    {display:'Ehhhh............... a ver, déjame ordenar esto un momento.',speech:[['eeehhhhh',620,0.55],['a ver, déjame ordenar esto un momento.',0,0.90]]},
    {display:'Ummmmm............... un momentín, que estoy juntando las piezas.',speech:[['uuuuuuuummmmmmmmmmmmmm',900,0.28],['un momentín, que estoy juntando las piezas.',0,0.90]]},
    {display:'Aaaah............... calla, calla... que me está viniendo ahora.',speech:[['aaaaah',620,0.58],['calla, calla.',400,0.88],['que me está viniendo ahora.',0,0.90]]},
    {display:'Ufffff............... espera, que casi lo tengo encajado.',speech:[['ufffffff',650,0.55],['espera, que casi lo tengo encajado.',0,0.90]]},
    {display:'Ummmmm............... déjame rebuscar un poquito, que está por aquí.',speech:[['uuuuuuuummmmmmmmmmmmmm',900,0.28],['déjame rebuscar un poquito, que está por aquí.',0,0.90]]},
    {display:'A ver, a ver............... espera, que no quiero soltarte una burrada.',speech:[['a ver, a ver',520,0.86],['espera, que no quiero soltarte una burrada.',0,0.90]]},
    {display:'Ufffff............... dame un instante, que estoy comprobando una cosa.',speech:[['ufffffff',650,0.55],['dame un instante, que estoy comprobando una cosa.',0,0.90]]},
    {display:'Ummmmm............... sí, sí... espera, que creo que ya lo tengo.',speech:[['uuuuuuuummmmmmmmmmmmmm',900,0.28],['sí, sí.',360,0.86],['espera, que creo que ya lo tengo.',0,0.90]]},
    {display:'Calla............... ya lo tengo....., besitos muá.',speech:[['calla',620,0.84],['ya lo tengo',520,0.86],['besitos muá',0,0.84]]},
    {display:'Aaaah............... vale, espera, que ya sé por dónde tirar.',speech:[['aaaaah',620,0.58],['vale, espera, que ya sé por dónde tirar.',0,0.90]]},
    {display:'Ufffff............... dame un pelín, que estoy llegando.',speech:[['ufffffff',650,0.55],['dame un pelín, que estoy llegando.',0,0.90]]},
    {display:'Ummmmm............... espera un momento, que esto está aquí, casi lo veo.',speech:[['uuuuuuuummmmmmmmmmmmmm',900,0.28],['espera un momento, que esto está aquí, casi lo veo.',0,0.90]]},
    {display:'Ehhhh............... sí, sí... un segundo, que ya viene.',speech:[['eeehhhhh',620,0.55],['sí, sí.',360,0.86],['un segundo, que ya viene.',0,0.90]]},
    {display:'Ufffff............... espera, que me estoy acordando ahora mismo.',speech:[['ufffffff',650,0.55],['espera, que me estoy acordando ahora mismo.',0,0.90]]},
    {display:'Ummmmm............... no me sale todavía... déjame pensar un poquito más.',speech:[['uuuuuuuummmmmmmmmmmmmm',900,0.28],['no me sale todavía.',420,0.88],['déjame pensar un poquito más.',0,0.90]]}
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
  function manualDraftStored(){try{return sessionStorage.getItem(STORAGE.manualDraft)||'';}catch(_){return state.manualDraftValue||'';}}
  function storeManualDraft(v){state.manualDraftValue=String(v==null?'':v);try{if(state.manualDraftValue)sessionStorage.setItem(STORAGE.manualDraft,state.manualDraftValue);else sessionStorage.removeItem(STORAGE.manualDraft);}catch(_){} }
  function releaseManualDraft(keepText){state.manualDraftOwned=false;state.manualDraftValue='';try{sessionStorage.removeItem(STORAGE.manualDraft);}catch(_){}if(!keepText){var p=promptEl();if(p){state.programmaticPromptWrite++;try{p.value='';p.textContent='';p.dispatchEvent(new Event('input',{bubbles:true}));}finally{state.programmaticPromptWrite=Math.max(0,state.programmaticPromptWrite-1);}}}}
  function setPrompt(v,force){var p=promptEl();if(!p)return false;if(state.manualDraftOwned&&!force)return false;state.programmaticPromptWrite++;try{p.value=clean(v);p.dispatchEvent(new Event('input',{bubbles:true}));p.setSelectionRange(p.value.length,p.value.length);return true;}catch(_){return false;}finally{state.programmaticPromptWrite=Math.max(0,state.programmaticPromptWrite-1);} }
  function installManualDraftGuard(){var p=promptEl();if(!p||state.manualDraftBoundTo===p)return;state.manualDraftBoundTo=p;var saved=manualDraftStored();if(saved&&!p.value){state.manualDraftOwned=true;state.programmaticPromptWrite++;try{p.value=saved;p.dispatchEvent(new Event('input',{bubbles:true}));p.setSelectionRange(p.value.length,p.value.length);}catch(_){}finally{state.programmaticPromptWrite=Math.max(0,state.programmaticPromptWrite-1);}}
    // BANK4_27 · El primer carácter escrito también es del usuario. beforeinput toma posesión
    // ANTES de que reconocimiento/TTS puedan tocar el prompt, corta la lectura anterior y evita
    // que se pierda la primera tecla al empezar una nueva pregunta mientras Zuzu habla.
    p.addEventListener('beforeinput',function(){if(state.programmaticPromptWrite)return;state.manualDraftOwned=true;if(state.speaking)stopSpeaking(true);stopEntertainment(true);if(state.cloudFallback)pauseCloudListening();else stopRecognition();stopBarge();clearTurnTimer();clearReplyWindow();state.turnPrefix='';state.turnSession='';state.turnLastAt=0;state.mode='manual';setVoicePhase('MANUAL_DRAFT','usuario empieza a escribir; lectura anterior cortada');},{capture:true});
    p.addEventListener('input',function(ev){if(state.programmaticPromptWrite)return;var v=String(p.value||'');if(!v){releaseManualDraft(true);return;}state.manualDraftOwned=true;storeManualDraft(v);clearTurnTimer();clearPostClearDiscardTimer();clearReplyWindow();state.turnPrefix='';state.turnSession='';state.turnLastAt=0;if(state.cloudFallback)pauseCloudListening();else stopRecognition();stopBarge();setMic(false);state.mode='manual';setVoicePhase('MANUAL_DRAFT','texto humano protegido');setStatus('Escribiendo… conservaré este texto hasta que lo envíes o lo borres tú.','ok');},{passive:true});
  }
  function setStatus(msg,kind){var e=$('ceVoz3Status');if(!e)return;e.className='ce-voz3-status'+(kind?' '+kind:'');e.textContent=msg||'';}
  function setMic(on){var b=$('ceVoz3Mic');if(!b)return;b.classList.toggle('is-listening',!!on);b.textContent=on?'⏹ Detener micro':'🎙️ Hablar';}
  function mergeText(base,part){base=clean(base);part=clean(part);if(!part)return base;if(!base)return part;var nb=norm(base),np=norm(part);if(nb===np||nb.endsWith(np))return base;if(np.startsWith(nb))return part;return clean(base+' '+part);}
  function isZuzuWord(w){w=norm(w).replace(/\s/g,'');return ['zuzu','susu','suzu','zusu','zulu','yuyu'].indexOf(w)>=0||(w.length>=3&&w.length<=6&&w.charAt(0)==='z');}
  function wakeInfo(v){var words=norm(v).split(' ').filter(Boolean);for(var i=0;i<words.length-1;i++){if(['hola','ola','oye','ey','eh','buenas'].indexOf(words[i])>=0&&isZuzuWord(words[i+1]))return{ok:true,index:i};}return{ok:false,index:-1};}
  function hasWake(v){return wakeInfo(v).ok;}
  function wakeOnly(v){var words=norm(v).split(' ').filter(Boolean),wi=wakeInfo(v);return wi.ok&&words.length<=wi.index+3;}
  function controlEditDistance(a,b){a=norm(a);b=norm(b);var m=a.length,n=b.length,prev=new Array(n+1),cur=new Array(n+1);for(var j=0;j<=n;j++)prev[j]=j;for(var i=1;i<=m;i++){cur[0]=i;for(j=1;j<=n;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a.charAt(i-1)===b.charAt(j-1)?0:1));var t=prev;prev=cur;cur=t;}return prev[n];}
  function isBargeWord(w){w=norm(w).replace(/[^a-záéíóúüñ]/g,'');if(!w)return false;var roots=['perdona','perdon','espera','esperate'];return roots.some(function(r){return w===r||(w.length>=5&&Math.abs(w.length-r.length)<=1&&controlEditDistance(w,r)<=1);});}
  function hasBarge(v){return norm(v).split(/\s+/).some(isBargeWord);}
  function bargeTail(v){var raw=clean(v),re=/\b(perdona|perd[oó]n|espera|esp[eé]rate)\b/ig,m,last=null;while((m=re.exec(raw)))last=re.lastIndex;return last==null?'':clean(raw.slice(last).replace(/^[\s,;:.!?-]+/,''));}
  function voiceControlResidueInfo(v){var raw=clean(v),t=norm(raw),words=t.split(' ').filter(Boolean);if(!t)return{only:false,text:''};var zuzuLike=function(w){var z=String(w||'').replace(/\s/g,'');return isZuzuWord(z)||/^(?:a)?z+u*z*u*$/.test(z)||/^(?:a)?s+u*z*u*$/.test(z);};var kept=words.filter(function(w){return !zuzuLike(w)&&!['hola','ola','oye','ey','eh'].includes(w);});var only=words.length<=3&&kept.length===0;return{only:only,text:kept.join(' ')};}
  function meaningfulShortReply(v){var t=norm(v).replace(/[!?.,;:]/g,'').trim();return /^(?:si|no|ok|vale|[1-9]\d?)$/.test(t);}
  function stripLeadingVoiceControl(v){var raw=clean(v),words=raw.split(/\s+/),out=words.slice();while(out.length){var n=norm(out[0]).replace(/\s/g,'');if(['hola','ola','oye','ey','eh'].includes(n)||isZuzuWord(n)||/^(?:a)?z+u*z*u*$/.test(n)||/^(?:a)?s+u*z*u*$/.test(n))out.shift();else break;}return clean(out.join(' '));}
  function eventAlternativeTexts(ev){var out=[];try{for(var i=ev.resultIndex;i<ev.results.length;i++){var r=ev.results[i];for(var j=0;j<Math.min(5,r.length||0);j++){var t=clean(r[j]&&r[j].transcript);if(t&&!out.includes(t))out.push(t);}}}catch(_){}return out;}
  function stripReservedFromSpeech(v){return clean(v).replace(/\bperdona\b/ig,'disculpa').replace(/\bperd[oó]n\b/ig,'disculpa').replace(/\bespera\b/ig,'aguarda').replace(/\besp[eé]rate\b/ig,'aguarda');}
  function currentVoiceUser(){try{return window.authUser||window.__CONTROL_EVENT_USER__||(window.ControlEventApp&&window.ControlEventApp.authUser)||(window.ControlEventRuntime&&window.ControlEventRuntime.app&&window.ControlEventRuntime.app.authUser)||{};}catch(_){return{};}}
  function voiceUserNames(){var u=currentVoiceUser(),informal=clean(u.identificacion||u.Identificacion||u.usuario||u.user||u.nombre||u.Nombre||''),formal=clean(u.nombre||u.Nombre||u.name||informal);return{informal:informal||formal||'amigo',formal:formal||informal||'usuario'};}
  function voiceAddressName(formal){var n=voiceUserNames();return formal?n.formal:n.informal;}
  function voiceGreetingName(){var u=currentVoiceUser(),name=clean(u.nombre||u.Nombre||u.name||u.identificacion||u.Identificacion||u.usuario||u.user||'usuario');return clean(name.split(/\s+/)[0]||name||'usuario');}
  function setVoicePhase(phase,detail){phase=clean(phase||'IDLE').toUpperCase();if(!phase)return;state.voicePhase=phase;state.voicePhaseSince=Date.now();var item={at:state.voicePhaseSince,phase:phase,detail:clean(detail||'')};state.voicePhaseHistory.push(item);if(state.voicePhaseHistory.length>40)state.voicePhaseHistory.shift();try{console.info('[CE VOZ RAW14U]',phase,item.detail||'');}catch(_){} }
  function clearRecognitionStartWatchdog(){clearTimeout(state.recognitionStartWatchdog);state.recognitionStartWatchdog=null;}
  function clearCloudStartWatchdog(){clearTimeout(state.cloudStartWatchdog);state.cloudStartWatchdog=null;}
  function armRecognitionStartWatchdog(kind,gen,r){clearRecognitionStartWatchdog();state.recognitionStartWatchdog=setTimeout(function(){state.recognitionStartWatchdog=null;if(gen!==state.recognitionGeneration||state.recognitionLive||state.recognition!==r)return;setVoicePhase('RECOVERY','Web Speech no confirmó onstart');setStatus('La escucha tarda demasiado. Cambio a Voz CE…','ok');stopRecognition();if(supportsCeVoice()){state.cloudFallback=true;startCloudRecognition(kind||'ambient',false);}else{state.needsGesture=true;setStatus('La escucha necesita rearmarse. Pulsa una vez en ControlEvent.','err');updateBadge();}},3500);}
  function armCloudStartWatchdog(kind,gen){clearCloudStartWatchdog();state.cloudStartWatchdog=setTimeout(function(){state.cloudStartWatchdog=null;if(gen!==state.cloudGeneration||state.cloudStream)return;state.needsGesture=true;setVoicePhase('RECOVERY','getUserMedia tarda en resolver');setStatus('El micrófono tarda en arrancar. Pulsa una vez para rearmarlo.','err');updateBadge();},6000);}
  function hasClearTextCommand(v){var t=norm(v);return /(?:^|\s)(?:borra|borrar|borre)\s+(?:el\s+)?texto(?:\s|$)/.test(t);}
  function clearPostClearDiscardTimer(){clearTimeout(state.postClearDiscardTimer);state.postClearDiscardTimer=null;}
  function isShortPostClearFragmentShape(v){
    var t=norm(v),words=t.split(' ').filter(Boolean),chars=t.replace(/\s+/g,'').length;
    if(!t)return false;
    return words.length<Number(state.postClearMinWords||3)&&chars<Number(state.postClearMinChars||10);
  }
  function postClearFragmentNeedsMore(v){
    return Date.now()<=Number(state.postClearUntil||0)&&isShortPostClearFragmentShape(v);
  }
  function armPostClearDiscard(){
    clearPostClearDiscardTimer();
    var wait=Math.max(100,Number(state.postClearUntil||0)-Date.now()+60);
    state.postClearDiscardTimer=setTimeout(function(){
      state.postClearDiscardTimer=null;
      var pending=clean(currentTurn());
      if(!pending||!isShortPostClearFragmentShape(pending))return;
      state.postClearUntil=0;
      state.turnLastAt=Date.now()-Number(state.turnCommitMs||3000);
      setVoicePhase('PAUSA_DUBITATIVA','fin de cuarentena; fragmento corto pasa al guard semántico Gemini');
      setStatus('Compruebo si ese fragmento era realmente una pregunta…','ok');
      commitUserTurn();
    },wait);
  }
  function scheduleTurnIfReady(lastAt){
    var pending=clean(currentTurn());
    if(postClearFragmentNeedsMore(pending)){
      clearTurnTimer();state.turnLastAt=Number(lastAt)||Date.now();state.postClearUntil=Math.max(Number(state.postClearUntil||0),Date.now()+4500);armPostClearDiscard();
      setVoicePhase('LISTENING','fragmento corto en cuarentena tras Borra texto');
      setStatus('Te escucho… sigo esperando la pregunta completa.','ok');
      return false;
    }
    if(pending){state.postClearUntil=0;clearPostClearDiscardTimer();}
    scheduleTurnCommit(lastAt);
    return true;
  }
  function clearDraftBuffer(force){clearTurnTimer();clearPostClearDiscardTimer();state.turnPrefix='';state.turnSession='';state.turnLastAt=0;if(state.manualDraftOwned&&!force)return false;if(force)releaseManualDraft(false);else setPrompt('',false);return true;}
  function chooseLocalControlVoice(){var list=spanishVoices().filter(function(v){return v&&v.localService===true;}),male=/male|hombre|jorge|pablo|diego|alvaro|álvaro/i;return list.find(function(v){return male.test(v.name||'');})||list[0]||chooseVoice();}
  function speakLocalControl(text,after,phase){var done=false,gen=++state.localControlGeneration;pauseCloudListening();stopRecognition();stopBarge();clearReplyWindow();state.localControlSpeaking=true;state.speaking=true;state.mode='local_speech';setVoicePhase(phase||'LOCAL_SPEECH',text);updateBadge();function finish(){if(done||gen!==state.localControlGeneration)return;done=true;state.localControlSpeaking=false;state.speaking=false;state.currentUtterance=null;state.lastLocalControlEndedAt=Date.now();updateBadge();if(typeof after==='function')setTimeout(after,120);}if(!supportsSpeech()){finish();return;}try{window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(text);u.lang='es-ES';u.rate=speechRate();u.pitch=0.82;u.volume=1;var v=chooseLocalControlVoice();if(v)u.voice=v;state.currentUtterance=u;u.onend=finish;u.onerror=finish;window.speechSynthesis.speak(u);setTimeout(function(){if(!done&&gen===state.localControlGeneration&&(!window.speechSynthesis||!window.speechSynthesis.speaking))finish();},900);}catch(_){finish();}}
  function clearTextAndListen(){if(!state.conversationMode)return;clearDraftBuffer(true);state.postClearUntil=0;setStatus('Texto borrado. Te escucho de nuevo…','ok');speakLocalControl('Te escucho de nuevo, '+voiceGreetingName()+'.',function(){if(!state.conversationMode)return;state.postClearUntil=Date.now()+Number(state.postClearQuarantineMs||8000);setVoicePhase('LISTENING','tras Borra texto · cuarentena de fragmentos cortos');startUser('');},'CLEAR_TEXT');}
  function speakLocalGreeting(){var name=voiceGreetingName(),text='Hola, '+name+'. ¿Tienes ganas de que hablemos? Pregúntame algo.';setStatus('Zuzu está lista para escucharte.','ok');speakLocalControl(text,function(){if(!state.conversationMode)return;setVoicePhase('LISTENING','saludo local terminado');startUser('');},'GREETING_LOCAL');}
  function isFormalVoiceTurn(prompt,title){var t=norm(clean(prompt));return /\b(informe formal|informe ejecutivo|informe oficial|informe tecnico|informe tecnica|auditoria|memoria formal|acta|documento formal|comunicado oficial|para la directiva|para los socios)\b/.test(t);}
  function reEsc(v){return String(v||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
  function stripVoiceAnswerLead(v){
    // RAW14: solo elimina rótulos técnicos. Los vocativos naturales ("Mira, Colty...",
    // "Jesús, ...") son parte de la conversación y deben llegar intactos a la voz.
    return clean(v).replace(/^(?:respuesta|contestacion|contestación|informe)\s+(?:de\s+)?zuzu\s*[:.\-–—]*\s*/i,'').replace(/^zuzu\s+(?:responde|contesta)\s*[:.\-–—]*\s*/i,'').trim();
  }

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
  function injectBadge(){if($('ceZuzuWakeBadge')||!document.body)return;var b=document.createElement('button');b.id='ceZuzuWakeBadge';b.type='button';b.addEventListener('click',function(){
    // RAW14P: el globo es un REARME, no un interruptor. Si quedó un estado conversacional
    // huérfano después de cerrar Zuzu, lo limpia y vuelve a escuchar en este mismo gesto.
    if(state.conversationMode&&!$('ceGeminiLibreOverlay')){forceReturnToAmbient(true,'clic en globo con Zuzu cerrada');return;}
    if(state.conversationMode){if(!state.speaking&&!state.requestInFlight&&!state.awaitingResponse)activateDirectConversation();return;}
    state.ambientEnabled=true;safeSet(STORAGE.ambient,'1');state.needsGesture=false;forceAmbientRearm(true,'clic en globo');
  });document.body.appendChild(b);updateBadge();}

  function recognitionCtor(){return window.SpeechRecognition||window.webkitSpeechRecognition;}
  function localSpeechApi(){var C=recognitionCtor();return C&&typeof C.available==='function'&&typeof C.install==='function'?C:null;}
  function supportsCeVoice(){return !!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&typeof MediaRecorder!=='undefined'&&typeof fetch==='function');}
  function cloudMime(){var opts=['audio/webm;codecs=opus','audio/webm','audio/mp4'];for(var i=0;i<opts.length;i++){try{if(!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(opts[i]))return opts[i];}catch(_){}}return '';}
  function clamp(n,min,max){n=Number(n)||0;return Math.max(min,Math.min(max,n));}
  function cloudStatus(kind){if(state.cloudCalibratingUntil>Date.now())setStatus('Calibrando micrófono…','ok');else{var mic=clean(state.cloudDeviceLabel||'');setStatus((kind==='user'?'Te escucho':'Voz CE activa. Di «Hola Zuzu»')+(mic?' · '+mic:''),'ok');}updateBadge();}
  function cloudAudioConstraints(){var id=clean(safeGet(STORAGE.mic,'')),audio={echoCancellation:false,noiseSuppression:false,autoGainControl:false};if(id)audio.deviceId={exact:id};return{audio:audio,video:false};}
  function ensureCloudAudioContext(fromGesture){var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;var ac=state.cloudAudioContext;try{if(!ac||ac.state==='closed'){ac=new AC();state.cloudAudioContext=ac;}if(fromGesture&&ac.state==='suspended'){var pr=ac.resume();if(pr&&typeof pr.catch==='function')pr.catch(function(){});}}catch(_){return ac||null;}return ac;}
  function cloudTrackInfo(stream){try{var t=stream&&stream.getAudioTracks&&stream.getAudioTracks()[0];state.cloudDeviceLabel=clean(t&&t.label||'Micrófono predeterminado');state.cloudDeviceSettings=t&&t.getSettings?t.getSettings():{};state.cloudDeviceId=clean(state.cloudDeviceSettings.deviceId||safeGet(STORAGE.mic,''));}catch(_){state.cloudDeviceLabel='Micrófono';state.cloudDeviceSettings={};}}
  function refreshMicDevices(){var sel=$('ceVoz3MicChoice');if(!sel||!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return;var selected=clean(safeGet(STORAGE.mic,state.cloudDeviceId||''));navigator.mediaDevices.enumerateDevices().then(function(list){var ins=list.filter(function(d){return d.kind==='audioinput';});sel.innerHTML='<option value="">Mic automático</option>'+ins.map(function(d,i){var id=clean(d.deviceId),label=clean(d.label)||('Micrófono '+(i+1));return '<option value="'+id.replace(/"/g,'&quot;')+'"'+(id===selected?' selected':'')+'>'+label.replace(/</g,'&lt;')+'</option>';}).join('');if(!selected&&state.cloudDeviceId)sel.value=state.cloudDeviceId;}).catch(function(){});}
  function updateMicMeter(force){var now=Date.now();if(!force&&now-state.cloudMeterLastPaint<90)return;state.cloudMeterLastPaint=now;var fill=$('ceVoz3MeterFill'),val=$('ceVoz3MeterValue'),wrap=$('ceVoz3Meter'),rms=Number(state.cloudRms)||0,thr=Math.max(0.0001,Number(state.cloudThreshold)||0.006),pct=clamp((rms/(thr*2.2))*100,0,100),chs=(state.cloudChannelRms||[]).map(function(x){return(Number(x||0)*1000).toFixed(1);}).join('/');if(fill)fill.style.width=pct.toFixed(0)+'%';if(val)val.textContent=(rms*1000).toFixed(1);if(wrap){wrap.title='Mic: '+(state.cloudDeviceLabel||'—')+' · RMS '+rms.toFixed(5)+(chs?' · canales '+chs:'')+' · ruido '+Number(state.cloudNoiseFloor||0).toFixed(5)+' · umbral '+thr.toFixed(5)+(state.cloudRecording?' · VOZ':'');wrap.setAttribute('aria-label',wrap.title);}}
  function finishCloudCalibration(){if(state.cloudCalibrationDone)return;var a=state.cloudNoiseSamples.filter(function(x){return Number.isFinite(x)&&x>=0;}).sort(function(x,y){return x-y;}),floor=a.length?a[Math.min(a.length-1,Math.floor(a.length*0.28))]:Math.max(0.0004,state.cloudRms||0);state.cloudNoiseFloor=clamp(floor,0.00015,0.02);state.cloudThreshold=clamp(state.cloudNoiseFloor*2.35+0.0010,0.0022,0.022);state.cloudCalibrationDone=true;state.cloudCalibratingUntil=0;state.cloudVoiceFrames=0;cloudStatus(state.cloudKind);updateMicMeter(true);try{console.info('[CE VOZ FIX31] MIC calibrado',{label:state.cloudDeviceLabel,rms:state.cloudRms,ruido:state.cloudNoiseFloor,umbral:state.cloudThreshold,settings:state.cloudDeviceSettings});}catch(_){}}
  function blobBase64(blob){return new Promise(function(resolve,reject){var fr=new FileReader();fr.onload=function(){var x=String(fr.result||''),i=x.indexOf(',');resolve(i>=0?x.slice(i+1):x);};fr.onerror=function(){reject(fr.error||new Error('No se pudo leer el audio.'));};fr.readAsDataURL(blob);});}
  function pauseCloudListening(){state.cloudWanted=false;if(state.cloudRecorder&&state.cloudRecording){try{state.cloudRecorder.__discard=true;state.cloudRecorder.stop();}catch(_){}}setMic(false);}
  function closeCloudVoice(){clearCloudStartWatchdog();state.cloudGeneration++;state.cloudWanted=false;state.cloudBusy=false;clearInterval(state.cloudMonitor);state.cloudMonitor=null;try{if(state.cloudRecorder&&state.cloudRecording){state.cloudRecorder.__discard=true;state.cloudRecorder.stop();}}catch(_){}state.cloudRecorder=null;state.cloudRecording=false;try{(state.cloudAnalysers||[]).forEach(function(a){try{a.disconnect();}catch(_){}});}catch(_){}try{state.cloudSplitter&&state.cloudSplitter.disconnect();}catch(_){}state.cloudSplitter=null;state.cloudAnalysers=[];state.cloudChannelRms=[];try{state.cloudSource&&state.cloudSource.disconnect();}catch(_){}state.cloudSource=null;try{state.cloudAudioContext&&state.cloudAudioContext.close();}catch(_){}state.cloudAudioContext=null;state.cloudAnalyser=null;try{state.cloudStream&&state.cloudStream.getTracks().forEach(function(t){t.stop();});}catch(_){}state.cloudStream=null;state.cloudRms=0;state.cloudPeak=0;state.cloudVoiceFrames=0;state.cloudCalibrationDone=false;state.cloudCalibratingUntil=0;state.cloudNoiseSamples=[];updateMicMeter(true);setMic(false);}
  function sendCloudAudio(blob,kind,gen){if(!blob||blob.size<900||gen!==state.cloudGeneration)return Promise.resolve('');state.cloudBusy=true;return blobBase64(blob).then(function(audioBase64){return fetch('/api/zuzu-voice/transcribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({audioBase64:audioBase64,mimeType:blob.type||'audio/webm',mode:kind})});}).then(function(res){return res.json().then(function(j){if(!res.ok||j.ok===false)throw new Error(j.error||('HTTP '+res.status));return clean(j.text||'');});}).then(function(text){state.cloudLastTranscript=text;state.cloudBusy=false;if(gen!==state.cloudGeneration)return'';if(!text){if(state.cloudWanted)cloudStatus(kind);return'';}if(kind==='ambient'){if(hasWake(text)){pauseCloudListening();setVoicePhase('WAKING','wake detectado por Voz CE');if(wakeOnly(text)){openZuzuOnly();}else{state.conversationMode=true;state.parked=false;state.mode='request';state.requestInFlight=true;state.awaitingResponse=true;state.requestPrompt=text;updateBadge();setVoicePhase('PROCESSING','wake + pregunta');setStatus('Procesando tu pregunta…','ok');if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.submitVoicePrompt==='function')window.ControlEventV113ZuzuAnalitica.submitVoicePrompt(text);}return text;}cloudStatus('ambient');return text;}if(hasClearTextCommand(text)){clearTextAndListen();return text;}touchReplyWindow();state.turnPrefix=mergeText(currentTurn(),text);state.turnSession='';state.turnLastAt=Number(state.cloudLastVoiceAt)||Date.now();setPrompt(state.turnPrefix);setVoicePhase('PAUSE_DUBITATIVA','Voz CE mantiene el buffer');setStatus('Te escucho… puedes continuar.','ok');scheduleTurnIfReady(state.turnLastAt);return text;}).catch(function(err){state.cloudBusy=false;setVoicePhase('RECOVERY','fallo transcripción Voz CE');setStatus('Voz CE: '+clean(err&&err.message||err||'error'),'err');if(state.cloudWanted)setTimeout(function(){cloudStatus(kind);},1200);return'';});}

  function finishCloudUtterance(kind){var mr=state.cloudRecorder;if(!mr||!state.cloudRecording)return;state.cloudRecording=false;try{mr.stop();}catch(_){} }
  function startCloudUtterance(kind){if(state.cloudRecording||state.cloudBusy||!state.cloudStream)return;var mime=cloudMime(),mr;try{mr=mime?new MediaRecorder(state.cloudStream,{mimeType:mime}):new MediaRecorder(state.cloudStream);}catch(err){setStatus('Voz CE no puede grabar este micrófono.','err');return;}var gen=state.cloudGeneration;state.cloudRecorder=mr;state.cloudChunks=[];state.cloudRecording=true;state.cloudRecordStartedAt=Date.now();state.cloudLastVoiceAt=Date.now();mr.ondataavailable=function(e){if(e.data&&e.data.size)state.cloudChunks.push(e.data);};mr.onstop=function(){var discard=!!mr.__discard,chunks=state.cloudChunks.slice(),type=mr.mimeType||mime||'audio/webm';if(state.cloudRecorder===mr)state.cloudRecorder=null;state.cloudChunks=[];if(discard||gen!==state.cloudGeneration)return;var blob=new Blob(chunks,{type:type});try{console.info('[CE VOZ FIX31] Fragmento voz',{bytes:blob.size,rms:state.cloudRms,ruido:state.cloudNoiseFloor,umbral:state.cloudThreshold});}catch(_){}sendCloudAudio(blob,kind,gen);};try{mr.start(180);}catch(err){state.cloudRecording=false;state.cloudRecorder=null;setStatus('Voz CE no pudo iniciar la captura.','err');}}
  function analyserRms(an){if(!an)return 0;var arr=new Float32Array(an.fftSize||1024);try{an.getFloatTimeDomainData(arr);}catch(_){return 0;}var sum=0;for(var i=0;i<arr.length;i++)sum+=arr[i]*arr[i];return Math.sqrt(sum/Math.max(1,arr.length));}
  function cloudMonitorTick(){if(!state.cloudWanted||state.speaking||state.requestInFlight||state.awaitingResponse||state.cloudBusy)return;var ans=(state.cloudAnalysers&&state.cloudAnalysers.length)?state.cloudAnalysers:(state.cloudAnalyser?[state.cloudAnalyser]:[]);if(!ans.length)return;var levels=ans.map(analyserRms),rms=0;for(var j=0;j<levels.length;j++)if(levels[j]>rms)rms=levels[j];state.cloudChannelRms=levels;var now=Date.now();state.cloudRms=rms;state.cloudPeak=Math.max(rms,state.cloudPeak*0.985);if(!state.cloudCalibrationDone){state.cloudNoiseSamples.push(rms);if(state.cloudNoiseSamples.length>90)state.cloudNoiseSamples.shift();updateMicMeter();if(now>=state.cloudCalibratingUntil)finishCloudCalibration();return;}if(!state.cloudRecording&&rms<state.cloudThreshold){state.cloudNoiseFloor=clamp(state.cloudNoiseFloor*0.985+rms*0.015,0.00015,0.02);var target=clamp(state.cloudNoiseFloor*2.35+0.0010,0.0022,0.022);state.cloudThreshold=state.cloudThreshold*0.985+target*0.015;}var ratio=rms/Math.max(0.0002,state.cloudNoiseFloor),voice=(rms>=state.cloudThreshold)||(rms>=0.0014&&ratio>=1.65);state.cloudVoiceFrames=voice?state.cloudVoiceFrames+1:0;if(voice&&state.cloudVoiceFrames>=2){if(state.cloudKind==='user')touchReplyWindow();if(!state.cloudRecording)startCloudUtterance(state.cloudKind);state.cloudLastVoiceAt=now;}if(state.cloudRecording){var elapsed=now-state.cloudRecordStartedAt,silent=now-state.cloudLastVoiceAt;if((elapsed>700&&silent>3000)||elapsed>45000)finishCloudUtterance(state.cloudKind);}updateMicMeter();}
  function setupCloudStream(stream,kind){clearCloudStartWatchdog();state.needsGesture=false;state.cloudStream=stream;state.cloudKind=kind;cloudTrackInfo(stream);state.cloudNoiseSamples=[];state.cloudNoiseFloor=0.001;state.cloudThreshold=0.006;state.cloudRms=0;state.cloudPeak=0;state.cloudVoiceFrames=0;state.cloudCalibrationDone=false;state.cloudCalibratingUntil=Date.now()+1350;var ac=ensureCloudAudioContext(false);if(!ac)throw new Error('AudioContext no disponible');state.cloudAudioContext=ac;state.cloudSource=ac.createMediaStreamSource(stream);state.cloudAnalysers=[];state.cloudChannelRms=[];var main=ac.createAnalyser();main.fftSize=1024;main.smoothingTimeConstant=0.12;state.cloudAnalyser=main;state.cloudSource.connect(main);state.cloudAnalysers.push(main);var settings=state.cloudDeviceSettings||{},channels=Number(settings.channelCount||state.cloudSource.channelCount||1);channels=Math.max(1,Math.min(4,channels||1));if(channels>1&&typeof ac.createChannelSplitter==='function'){try{var sp=ac.createChannelSplitter(channels);state.cloudSplitter=sp;state.cloudSource.connect(sp);for(var c=0;c<channels;c++){var ca=ac.createAnalyser();ca.fftSize=1024;ca.smoothingTimeConstant=0.12;sp.connect(ca,c,0);state.cloudAnalysers.push(ca);}}catch(_){state.cloudSplitter=null;}}state.cloudWanted=true;clearInterval(state.cloudMonitor);state.cloudMonitor=setInterval(cloudMonitorTick,45);try{var rp=ac.resume();if(rp&&typeof rp.catch==='function')rp.catch(function(){});}catch(_){}setStatus('Calibrando micrófono…','ok');refreshMicDevices();updateMicMeter(true);try{console.info('[CE VOZ FIX31] entrada',{label:state.cloudDeviceLabel,settings:settings,analizadores:state.cloudAnalysers.length});}catch(_){}return true;}
  function startCloudRecognition(kind,fromGesture){kind=kind||'ambient';state.cloudFallback=true;state.cloudKind=kind;state.cloudWanted=true;state.needsGesture=false;if(!supportsCeVoice()){setVoicePhase('ERROR','Voz CE no disponible');setStatus('Este navegador no permite la Voz CE por micrófono.','err');return false;}if(state.cloudStream){if(fromGesture)ensureCloudAudioContext(true);cloudStatus(kind);setMic(kind==='user');setVoicePhase(kind==='user'?'LISTENING':'AMBIENT_LISTENING','Voz CE reutiliza stream');return true;}var gen=++state.cloudGeneration;setVoicePhase(kind==='user'?'USER_STARTING':'AMBIENT_STARTING','getUserMedia');setStatus('Activando Voz CE…','ok');armCloudStartWatchdog(kind,gen);navigator.mediaDevices.getUserMedia(cloudAudioConstraints()).then(function(stream){clearCloudStartWatchdog();if(gen!==state.cloudGeneration){try{stream.getTracks().forEach(function(t){t.stop();});}catch(_){}return;}setupCloudStream(stream,kind);setMic(kind==='user');setVoicePhase(kind==='user'?'LISTENING':'AMBIENT_LISTENING','Voz CE lista');}).catch(function(err){clearCloudStartWatchdog();if(clean(safeGet(STORAGE.mic,''))){safeSet(STORAGE.mic,'');setStatus('Ese micrófono no está disponible. Vuelvo al predeterminado…','err');setTimeout(function(){startCloudRecognition(kind,true);},100);return;}state.needsGesture=true;setVoicePhase('RECOVERY','getUserMedia '+clean(err&&err.name||err&&err.message||'permiso'));setStatus('Micrófono bloqueado: '+clean(err&&err.name||err&&err.message||'permiso')+'. Pulsa una vez en ControlEvent.','err');updateBadge();});return true;}
  function fallbackToCeVoice(kind){state.localSpeechUnavailable=true;state.cloudFallback=true;stopRecognition();setStatus('Web Speech no responde. Activo Voz CE…','ok');startCloudRecognition(kind||state.pendingRecognitionKind||'ambient',false);return false;}
  function stopRecognition(){clearRecognitionStartWatchdog();state.recognitionGeneration++;state.recognitionStarting=false;state.recognitionLive=false;var r=state.recognition;state.recognition=null;try{r&&r.abort();}catch(_){try{r&&r.stop();}catch(__){}}setMic(false);}
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
    var C=recognitionCtor();if(!C)return null;var r=new C(),gen=++state.recognitionGeneration;r.lang='es-ES';r.continuous=true;r.interimResults=true;r.maxAlternatives=5;if(state.localSpeechReady&&'processLocally' in r)r.processLocally=true;r.__gen=gen;r.__kind=kind;
    r.onstart=function(){if(gen!==state.recognitionGeneration)return;clearRecognitionStartWatchdog();state.recognitionStarting=false;state.recognitionLive=true;state.needsGesture=false;state.lastRecognitionError='';state.webSpeechStartFailures=0;state.recognitionStartedAt=Date.now();state.recognitionLastResultAt=0;setMic(kind==='user');if(kind==='ambient'){setVoicePhase('AMBIENT_LISTENING','Web Speech onstart');setStatus(state.wakeCapture?'Sigue hablando…':state.localSpeechReady?'Voz local activa. Di «Hola Zuzu».':'Escucha activa. Di «Hola Zuzu».','ok');}if(kind==='user'){setVoicePhase('LISTENING','Web Speech onstart');setStatus(state.localSpeechReady?'Te escucho (voz local)…':'Te escucho…','ok');}updateBadge();};
    r.onerror=function(ev){if(gen!==state.recognitionGeneration)return;clearRecognitionStartWatchdog();state.recognitionStarting=false;state.recognitionLive=false;var code=clean(ev&&ev.error),message=clean(ev&&ev.message);state.lastRecognitionError=code+(message?' · '+message:'');if(code==='network'||code==='audio-capture'){state.pendingRecognitionKind=kind;setVoicePhase('RECOVERY','Web Speech '+(code||'error'));setStatus('La voz del navegador no responde bien. Paso a Voz CE…','ok');setTimeout(function(){fallbackToCeVoice(kind);},0);}else if(code==='no-speech'){state.webSpeechNoSpeechCount=(Number(state.webSpeechNoSpeechCount)||0)+1;if(state.webSpeechNoSpeechCount>=2&&supportsCeVoice()){state.pendingRecognitionKind=kind;setVoicePhase('RECOVERY','Web Speech repite no-speech');setStatus('El reconocimiento del navegador está sordo. Paso a Voz CE…','ok');setTimeout(function(){fallbackToCeVoice(kind);},0);}}else if(code==='language-not-supported'&&state.localSpeechReady){state.localSpeechReady=false;state.localSpeechUnavailable=false;state.pendingRecognitionKind=kind;setVoicePhase('RECOVERY','idioma local no soportado');setTimeout(function(){prepareLocalSpeech(kind);},0);}else if(code==='not-allowed'||code==='service-not-allowed'){state.needsGesture=true;setVoicePhase('RECOVERY','permiso Web Speech');setStatus('La escucha se rearmará con tu siguiente pulsación normal.','err');}else if(code&&code!=='no-speech'&&code!=='aborted'){setVoicePhase('RECOVERY','Web Speech '+code);setStatus('Micrófono: '+code+(message?' · '+message:''),'err');}updateBadge();};
    r.onend=function(){if(gen!==state.recognitionGeneration)return;clearRecognitionStartWatchdog();state.recognitionStarting=false;state.recognitionLive=false;state.recognition=null;setMic(false);if(state.needsGesture||state.localSpeechPreparing){updateBadge();return;}if(state.lastRecognitionError==='network'&&!state.localSpeechReady){updateBadge();return;}if(kind==='ambient'&&state.ambientEnabled&&!state.conversationMode)setTimeout(function(){startAmbient(false);},90);else if(kind==='user'&&state.conversationMode&&!state.speaking&&!state.requestInFlight&&!state.awaitingResponse){var pending=clean(currentTurn());if(pending){state.turnPrefix=pending;state.turnSession='';setPrompt(pending);setVoicePhase('PAUSA_DUBITATIVA','Web Speech terminó sesión; conserva buffer');scheduleTurnIfReady(state.turnLastAt||Date.now());}setTimeout(function(){startUser(state.turnPrefix);},90);}};
    r.onresult=function(ev){if(gen!==state.recognitionGeneration)return;state.webSpeechNoSpeechCount=0;state.recognitionLastResultAt=Date.now();var t=sessionText(ev);if(kind==='ambient')handleAmbientText(t);else{setVoicePhase('LISTENING','entrada Web Speech');handleUserText(t);}};
    return r;
  }
  function startRecognition(kind,fromGesture){
    if(!supportsRecognition())return false;
    if(fromGesture&&state.recognition&&!state.recognitionLive){stopRecognition();}
    if(state.recognitionStarting||state.recognition)return !!state.recognitionLive;
    state.recognitionStarting=true;state.mode=kind;setVoicePhase(kind==='user'?'USER_STARTING':'AMBIENT_STARTING','Web Speech start');var r=newRecognition(kind);state.recognition=r;
    try{r.start();armRecognitionStartWatchdog(kind,r.__gen,r);return true;}catch(err){clearRecognitionStartWatchdog();state.recognitionStarting=false;state.recognitionLive=false;state.recognition=null;state.webSpeechStartFailures=(Number(state.webSpeechStartFailures)||0)+1;var en=clean(err&&err.name||'');if(state.webSpeechStartFailures>=2&&supportsCeVoice()&&!/NotAllowed|Security/i.test(en)){state.needsGesture=false;setVoicePhase('RECOVERY','Web Speech no arranca de forma estable');setTimeout(function(){fallbackToCeVoice(kind);},0);return false;}if(fromGesture){state.needsGesture=false;}else{state.needsGesture=true;}setVoicePhase('RECOVERY','Web Speech start lanzó excepción');updateBadge();return false;}
  }

  function clearWakeTimer(){clearTimeout(state.wakeTimer);state.wakeTimer=null;}
  function handleAmbientText(text){
    if(!text)return;
    if(!state.wakeCapture){if(!hasWake(text))return;state.wakeCapture=true;state.wakeText=clean(text);state.wakeSession=clean(text);state.wakeLastAt=Date.now();setVoicePhase('WAKING','wake detectado por Web Speech');updateBadge();}
    else if(text!==state.wakeSession){var delta=text;if(norm(text).startsWith(norm(state.wakeSession)))delta=clean(text.slice(state.wakeSession.length));state.wakeText=mergeText(state.wakeText,delta);state.wakeSession=text;state.wakeLastAt=Date.now();}
    clearWakeTimer();state.wakeTimer=setTimeout(commitWake,1200);
  }
  function openZuzuOnly(){
    pauseCloudListening();stopRecognition();clearDraftBuffer();state.conversationMode=true;state.parked=false;state.mode='user';state.requestInFlight=false;state.awaitingResponse=false;setVoicePhase('OPENING_ZUZU','wake sin pregunta');updateBadge();
    try{if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.open==='function')window.ControlEventV113ZuzuAnalitica.open();}catch(_){}
    setStatus('Zuzu se está preparando…','ok');setTimeout(function(){if(state.conversationMode)speakLocalGreeting();},100);
  }
  function commitWake(){
    if(!state.wakeCapture)return;var elapsed=Date.now()-state.wakeLastAt;if(elapsed<1050){clearWakeTimer();state.wakeTimer=setTimeout(commitWake,1100-elapsed);return;}
    var full=clean(state.wakeText);state.wakeCapture=false;state.wakeText='';state.wakeSession='';clearWakeTimer();stopRecognition();
    if(wakeOnly(full)){openZuzuOnly();return;}
    state.conversationMode=true;state.parked=false;state.mode='request';state.requestInFlight=true;state.awaitingResponse=true;state.requestPrompt=full;setVoicePhase('PROCESSING','wake + pregunta');updateBadge();setStatus('Procesando tu pregunta…','ok');
    if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.submitVoicePrompt==='function')window.ControlEventV113ZuzuAnalitica.submitVoicePrompt(full);
  }
  function startAmbient(fromGesture){if(!state.ambientEnabled||state.conversationMode||state.speaking||state.requestInFlight)return;state.mode='ambient';setVoicePhase('AMBIENT_STARTING',fromGesture?'gesto':'automático');if(state.cloudFallback||!supportsRecognition())startCloudRecognition('ambient',!!fromGesture);else startRecognition('ambient',!!fromGesture);updateBadge();}
  function forceAmbientRearm(fromGesture,reason){
    if(!state.ambientEnabled||state.conversationMode)return false;
    setVoicePhase('AMBIENT_REARM',reason||'rearme');
    if(state.cloudFallback||!supportsRecognition()){
      state.needsGesture=false;
      if(state.cloudStream){state.cloudKind='ambient';state.cloudWanted=true;if(fromGesture)ensureCloudAudioContext(true);cloudStatus('ambient');return true;}
      return startCloudRecognition('ambient',!!fromGesture);
    }
    stopRecognition();state.needsGesture=false;return startRecognition('ambient',!!fromGesture);
  }
  function forceReturnToAmbient(fromGesture,reason){
    clearWakeTimer();clearTurnTimer();clearReplyWindow();pauseCloudListening();clearTimeout(state.pendingAnswerTimer);state.pendingAnswerTimer=null;stopEntertainment(true);stopRecognition();stopBarge();stopSpeaking(true);clearDraftBuffer();
    state.conversationMode=false;state.parked=true;state.requestInFlight=false;state.awaitingResponse=false;state.overlayMissingSince=0;state.ambientEnabled=true;safeSet(STORAGE.ambient,'1');state.needsGesture=false;
    setVoicePhase('AMBIENT_REARM',reason||'salida de Zuzu');updateBadge();
    if(fromGesture)return forceAmbientRearm(true,reason||'salida de Zuzu');
    setTimeout(function(){if(!state.conversationMode&&state.ambientEnabled&&!state.needsGesture)forceAmbientRearm(false,reason||'salida de Zuzu');},140);return true;
  }
  function ambientHealthTick(){
    if(!state.ambientEnabled)return;
    var overlay=!!$('ceGeminiLibreOverlay'),now=Date.now();
    // El botón Cerrar de Zuzu antiguamente eliminaba el overlay sin avisar al motor de voz.
    // Si detectamos conversación sin ventana durante >700 ms, saneamos el estado por nuestra cuenta.
    if(state.conversationMode&&!overlay){
      if(!state.overlayMissingSince)state.overlayMissingSince=now;
      if(now-state.overlayMissingSince>700){forceReturnToAmbient(false,'overlay Zuzu desaparecido');return;}
    }else state.overlayMissingSince=0;
    if(state.conversationMode||state.speaking||state.requestInFlight||state.awaitingResponse||state.needsGesture)return;
    if(state.cloudFallback||!supportsRecognition()){
      if(state.cloudStream){if(!state.cloudWanted){state.cloudKind='ambient';state.cloudWanted=true;cloudStatus('ambient');}}else startCloudRecognition('ambient',false);
      return;
    }
    if(!state.recognition&&!state.recognitionStarting&&!state.recognitionLive){startAmbient(false);return;}
    if(state.recognitionLive&&!state.wakeCapture&&now-Number(state.recognitionStartedAt||now)>Number(state.ambientSessionMaxMs||26000)&&now-Number(state.recognitionLastResultAt||0)>4500){
      // Chrome/Edge pueden dejar una sesión Web Speech aparentemente viva pero sorda tras
      // bastante silencio. La reciclamos preventivamente antes de llegar a ese estado.
      setVoicePhase('AMBIENT_RECYCLE','renovación preventiva Web Speech');stopRecognition();setTimeout(function(){if(!state.conversationMode&&!state.needsGesture)startAmbient(false);},120);
    }
  }
  function primeAmbientFromGesture(ev){
    if(ev&&ev.isTrusted===false)return;
    ensureCloudAudioContext(true);
    if(!state.ambientEnabled||state.conversationMode)return;
    var t=ev&&ev.target;if(t&&t.closest&&t.closest('#ceVoz3Mic,#ceZuzuWakeBadge'))return;
    setVoicePhase('AMBIENT_STARTING','rearme por gesto');
    if(state.cloudFallback||!supportsRecognition()){state.needsGesture=false;startCloudRecognition('ambient',true);return;}
    if(state.needsGesture||state.recognitionStarting||(state.recognition&&!state.recognitionLive)){stopRecognition();state.needsGesture=false;startAmbient(true);return;}
    if(!state.recognition&&!state.recognitionLive){state.needsGesture=false;startAmbient(true);}
  }

  function clearReplyWindow(){clearTimeout(state.replyWindowTimer);state.replyWindowTimer=null;state.replyWindowUntil=0;}
  function armReplyWindow(delay){
    clearReplyWindow();if(!state.conversationMode||state.requestInFlight||state.awaitingResponse||state.speaking)return;
    var ms=Math.max(4000,Number(delay)||state.replyWindowMs);state.replyWindowUntil=Date.now()+ms;setVoicePhase('REPLY_WINDOW','esperando réplica');
    state.replyWindowTimer=setTimeout(function(){state.replyWindowTimer=null;if(!state.conversationMode||state.requestInFlight||state.awaitingResponse||state.speaking)return;var pending=clean(currentTurn());if(pending)return;setStatus('Conversación en espera. Di «Hola Zuzu» para seguir.','');parkConversation();},ms+40);
  }
  function touchReplyWindow(){if(state.conversationMode&&!state.requestInFlight&&!state.awaitingResponse&&!state.speaking)armReplyWindow(state.replyWindowMs);}
  function clearTurnTimer(){clearTimeout(state.turnTimer);state.turnTimer=null;}
  function currentTurn(){return mergeText(state.turnPrefix,state.turnSession);}
  function scheduleTurnCommit(lastAt){clearTurnTimer();state.turnLastAt=Number(lastAt)||Date.now();var wait=Math.max(40,state.turnCommitMs-(Date.now()-state.turnLastAt));state.turnTimer=setTimeout(commitUserTurn,wait+25);}
  function handleUserText(text){if(!text)return;if(hasClearTextCommand(text)){clearTextAndListen();return;}touchReplyWindow();state.turnSession=text;setPrompt(currentTurn());setVoicePhase('PAUSA_DUBITATIVA','buffer conservado; espera fin real');setStatus('Te escucho… puedes continuar.','ok');scheduleTurnIfReady(Date.now());}
  function commitUserTurn(){var elapsed=Date.now()-state.turnLastAt,remaining=state.turnCommitMs-elapsed;if(remaining>0){clearTurnTimer();state.turnTimer=setTimeout(commitUserTurn,remaining+25);return;}var text=clean(currentTurn());if(!text)return;var residue=voiceControlResidueInfo(text);if(residue.only||(!meaningfulShortReply(text)&&norm(text).replace(/\s+/g,'').length<=1)){clearDraftBuffer();state.voiceResidueUntil=Date.now()+Number(state.voiceResidueQuarantineMs||4200);setVoicePhase('LISTENING','residuo local de control descartado');setStatus('Te escucho… ese fragmento no era una pregunta completa.','ok');setTimeout(function(){if(state.conversationMode&&!state.speaking&&!state.requestInFlight)startUser('');},90);return;}if(Date.now()<=Number(state.voiceResidueUntil||0)&&isShortPostClearFragmentShape(text)){clearTurnTimer();state.turnLastAt=Date.now();setVoicePhase('LISTENING','fragmento corto tras residuo; amplía escucha');setStatus('Te escucho… continúa.','ok');scheduleTurnCommit(state.turnLastAt+1800);return;}state.voiceResidueUntil=0;if(postClearFragmentNeedsMore(text)){clearTurnTimer();armPostClearDiscard();setVoicePhase('LISTENING','bloqueo final de fragmento corto tras Borra texto');setStatus('Te escucho… sigo esperando la pregunta completa.','ok');return;}state.postClearUntil=0;clearPostClearDiscardTimer();clearReplyWindow();clearTurnTimer();if(state.cloudFallback)pauseCloudListening();else stopRecognition();state.turnPrefix='';state.turnSession='';state.requestPrompt=text;state.requestInFlight=true;state.awaitingResponse=true;state.mode='request';setPrompt(text);setVoicePhase('PROCESSING','pregunta completa tras silencio');setStatus('Procesando…','ok');updateBadge();var b=$('ceAiRun');if(b)b.click();}
  function startUser(seed){if(!state.conversationMode||state.speaking||state.requestInFlight||state.awaitingResponse)return;if(state.manualDraftOwned){setVoicePhase('MANUAL_DRAFT','no rearmar micro sobre texto escrito');setStatus('Borrador escrito protegido. Envíalo cuando quieras.','ok');setMic(false);return;}stopBarge();armReplyWindow(state.replyWindowMs);state.turnPrefix=clean(seed||state.turnPrefix);state.turnSession='';if(state.turnPrefix){setPrompt(state.turnPrefix);scheduleTurnIfReady(state.turnLastAt||Date.now());}state.mode='user';setVoicePhase('USER_STARTING',state.turnPrefix?'reanuda con buffer':'nueva escucha');if(state.cloudFallback||!supportsRecognition())startCloudRecognition('user',false);else startRecognition('user',false);updateBadge();}

  function stopBarge(){state.bargeGeneration++;var r=state.bargeRecognition;state.bargeRecognition=null;try{r&&r.abort();}catch(_){try{r&&r.stop();}catch(__){}}}
  function startBarge(){stopRecognition();stopBarge();if(state.cloudFallback)return;if(!state.conversationMode||!state.speaking||!supportsRecognition())return;var C=recognitionCtor(),r=new C(),gen=++state.bargeGeneration;r.lang='es-ES';r.continuous=true;r.interimResults=true;r.maxAlternatives=5;state.bargeRecognition=r;r.onresult=function(ev){if(gen!==state.bargeGeneration||!state.speaking)return;var alternatives=eventAlternativeTexts(ev),t=alternatives.find(hasBarge)||sessionText(ev);if(!hasBarge(t))return;var seed=stripLeadingVoiceControl(bargeTail(t));if(voiceControlResidueInfo(seed).only)seed='';stopSpeaking(true);state.voiceResidueUntil=Date.now()+Number(state.voiceResidueQuarantineMs||4200);state.turnPrefix=seed;state.turnSession='';setPrompt(seed);setStatus('Te escucho…','ok');setVoicePhase('LISTENING','interrupción local detectada; cola limpia');setTimeout(function(){startUser(seed);},60);};r.onend=function(){if(gen!==state.bargeGeneration)return;state.bargeRecognition=null;if(state.speaking&&state.conversationMode)setTimeout(startBarge,80);};r.onerror=function(){};try{r.start();}catch(_){setTimeout(function(){if(state.speaking)startBarge();},120);}}

  function loadVoices(){if(!supportsSpeech())return;try{state.voices=window.speechSynthesis.getVoices()||[];}catch(_){state.voices=[];}populateVoices();}
  function spanishVoices(){return state.voices.filter(function(v){return /^es(?:-|_)/i.test(v.lang||'')||/spanish|español/i.test(v.name||'');});}
  function selectedMode(){return 'male';}
  function voiceKey(){return selectedMode()==='male'?STORAGE.male:STORAGE.female;}
  function populateVoices(){var sel=$('ceVoz3VoiceChoice');if(!sel)return;var list=spanishVoices(),wanted=safeGet(voiceKey(),'auto');sel.innerHTML='<option value="auto">Voz automática</option>'+list.map(function(v){var n=clean(v.name);return '<option value="'+n.replace(/"/g,'&quot;')+'"'+(n===wanted?' selected':'')+'>'+n+'</option>';}).join('');}
  function chooseVoice(){var list=spanishVoices(),sel=$('ceVoz3VoiceChoice'),wanted=sel?sel.value:safeGet(voiceKey(),'auto');if(wanted&&wanted!=='auto'){var exact=list.find(function(v){return v.name===wanted;});if(exact)return exact;}var male=/male|hombre|jorge|pablo|diego|alvaro|álvaro/i,female=/female|mujer|helena|monica|mónica|paulina|lucia|lucía/i;var re=selectedMode()==='male'?male:female;return list.find(function(v){return re.test(v.name||'');})||list[0]||state.voices[0]||null;}
  function speechRate(){var e=$('ceVoz3Rate'),n=Number(e?e.value:safeGet(STORAGE.rate,'0.90'));return Number.isFinite(n)?n:0.90;}
  function spokenNumberEs(n){
    n=Math.round(Number(n));if(!Number.isFinite(n)||n<0||n>9999)return String(n);
    var u=['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
    if(n<30)return u[n];if(n<100){var d=['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'][Math.floor(n/10)],r=n%10;return r?d+' y '+u[r]:d;}
    if(n===100)return'cien';if(n<1000){var h=['','','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'][Math.floor(n/100)]||'ciento',r2=n%100;return (Math.floor(n/100)===1?'ciento':h)+(r2?' '+spokenNumberEs(r2):'');}
    var th=Math.floor(n/1000),rest=n%1000,head=th===1?'mil':spokenNumberEs(th)+' mil';return head+(rest?' '+spokenNumberEs(rest):'');
  }
  function spokenDecimalEs(value){
    var raw=String(value==null?'':value).trim().replace(/\s/g,''),neg=raw.charAt(0)==='-';if(neg)raw=raw.slice(1);raw=raw.replace(',','.');var n=Number(raw);if(!Number.isFinite(n))return String(value||'');
    var whole=Math.floor(Math.abs(n)),frac=raw.indexOf('.')>=0?raw.split('.')[1].replace(/0+$/,''):'';var head=spokenNumberEs(whole);if(frac){var digits=frac.split('').map(function(d){return spokenNumberEs(Number(d));}).join(' ');head+=' coma '+digits;}return (neg?'menos ':'')+head;
  }
  function spokenQuantity(value,unit){
    var raw=String(value||'').replace(',','.'),n=Number(raw),u=String(unit||'').toLowerCase();if(!Number.isFinite(n))return value+' '+unit;
    if(u==='ml'){if(Math.abs(n-500)<0.001)return'medio litro';if(Math.abs(n-1000)<0.001)return'un litro';if(Math.abs(n-1500)<0.001)return'litro y medio';return spokenDecimalEs(n)+' mililitros';}
    if(u==='cl'){if(Math.abs(n-50)<0.001)return'medio litro';if(Math.abs(n-100)<0.001)return'un litro';if(Math.abs(n-150)<0.001)return'litro y medio';return spokenDecimalEs(n)+' centilitros';}
    if(u==='l'||u==='lt'){if(Math.abs(n-0.5)<0.001)return'medio litro';if(Math.abs(n-1)<0.001)return'un litro';if(Math.abs(n-1.5)<0.001)return'litro y medio';return spokenDecimalEs(n)+' litros';}
    if(u==='kg')return spokenDecimalEs(n)+(Math.abs(n-1)<0.001?' kilo':' kilos');if(u==='g'||u==='gr')return spokenDecimalEs(n)+(Math.abs(n-1)<0.001?' gramo':' gramos');
    if(u==='cm')return spokenDecimalEs(n)+' centímetros';if(u==='mm')return spokenDecimalEs(n)+' milímetros';return value+' '+unit;
  }
  function humanizeSpokenLabels(v){
    var out=String(v==null?'':v);
    out=out.replace(/\s*[-–—/]?\s*\b(?:ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SEPT|OCT|NOV|DIC)[._\/-]?(?:20)?\d{2}\b/gi,' ');
    // BANK4_26 · oralización meteorológica/numérica. El símbolo de grados NO es un ordinal.
    out=out.replace(/(-?\d+(?:[.,]\d+)?)\s*[º°](?![sS])\s*(?:C|Celsius|centígrados?)?/gi,function(_,n){return spokenDecimalEs(n)+' grados';});
    out=out.replace(/(-?\d+(?:[.,]\d+)?)\s*%/g,function(_,n){return spokenDecimalEs(n)+' por ciento';});
    out=out.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kmh)\b/gi,function(_,n){return spokenDecimalEs(n)+' kilómetros por hora';});
    out=out.replace(/(-?\d+(?:[.,]\d+)?)\s*hPa\b/gi,function(_,n){return spokenDecimalEs(n)+' hectopascales';});
    // RAW14C: no uses \b tras unidades de una letra: en JavaScript la í de «líneas» no cuenta como ASCII word-char y «40 líneas» se interpretaba como «40 l» + «íneas» (litrosíneas).
    out=out.replace(/\b(\d+(?:[.,]\d+)?)\s*(ml|cl|lt|l|kg|gr|g|cm|mm)(?![A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/gi,function(_,n,u){return spokenQuantity(n,u);});
    out=out.replace(/\bzero\b/gi,'cero').replace(/\b\d{1,2}en\d{1,2}\b/gi,' ');
    var ordSing={1:'primero',2:'segundo',3:'tercero',4:'cuarto',5:'quinto',6:'sexto',7:'séptimo',8:'octavo',9:'noveno',10:'décimo'},ordPlur={1:'primeros',2:'segundos',3:'terceros',4:'cuartos',5:'quintos',6:'sextos',7:'séptimos',8:'octavos',9:'novenos',10:'décimos'};
    // El ordinal tipográfico es º. El símbolo ° queda reservado a grados/temperatura.
    out=out.replace(/\b(10|[1-9])\s*º([sS])?\b/g,function(_,n,p){return p?ordPlur[Number(n)]:ordSing[Number(n)];}).replace(/\bcuartos\s+final\b/gi,'cuartos de final');
    out=out.replace(/[()[\]{}]/g,' ').replace(/([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])\s*[-–—/]\s*([A-Za-zÁÉÍÓÚÜÑáéíóúüñ])/g,'$1 $2');
    out=out.replace(/(^|\s)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,4})(?=\s|$)/g,function(m,pre,tok){return /[aeiouáéíóúü]/i.test(tok)?m:pre;});
    return out.replace(/\s+([,.;:!?])/g,'$1').replace(/([,;:])\s*([,;:])/g,'$1').replace(/\s{2,}/g,' ').trim();
  }
  function humanizeSpokenListRhythm(v){
    var out=String(v==null?'':v).replace(/(^|\s)(\d{1,3})(?:\.|\))\s+/g,function(_,pre,n){return (pre||'')+'§CEITEM'+n+'§ ';});
    var parts=out.split(/§CEITEM(\d{1,3})§\s*/);if(parts.length<3)return out;var res=clean(parts[0]);
    for(var i=1;i<parts.length;i+=2){var n=Number(parts[i]),body=clean(parts[i+1]||'');if(res&&!/[.!?]$/.test(res))res+='.';if(res)res+=' ';res+=spokenNumberEs(n)+', '+body;}
    return res;
  }
  function parseSpokenEuroNumber(raw){var t=clean(raw).replace(/\s/g,'');if(!t)return NaN;var sign=t.charAt(0)==='-'?-1:1;if(sign<0)t=t.slice(1);if(t.indexOf(',')>=0){t=t.replace(/\./g,'').replace(',','.');}else if((t.match(/\./g)||[]).length>1||/^\d{1,3}(?:\.\d{3})+$/.test(t)){t=t.replace(/\./g,'');}var n=Number(t);return Number.isFinite(n)?sign*n:NaN;}
  function spokenEuroAmount(n){n=Number(n);if(!Number.isFinite(n))return'';var neg=n<0,a=Math.abs(n),whole=Math.floor(a+1e-9),cents=Math.round((a-whole)*100);if(cents===100){whole+=1;cents=0;}var words=whole===1?'un':spokenNumberEs(whole),out=(neg?'menos ':'')+words+' euro'+(whole===1?'':'s');if(cents)out+=' con '+(cents===1?'un':spokenNumberEs(cents))+' céntimo'+(cents===1?'':'s');return out;}
  function humanizeSpokenMoney(v){return String(v==null?'':v).replace(/(-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?)\s*(?:€|euros?\b)/gi,function(_,numtxt){var n=parseSpokenEuroNumber(numtxt);return Number.isFinite(n)?spokenEuroAmount(n):_;});}
  function voiceExplicitMoneyValues(v){var out=[],re=/(-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:[.,]\d+)?)\s*(?:€|EUR\b|euros?\b)/gi,m;while((m=re.exec(String(v==null?'':v)))){var n=parseSpokenEuroNumber(m[1]);if(Number.isFinite(n))out.push(Math.trunc(n));}return out;}
  function safeVoiceAgainstScreen(screen,spoken){var w=String(screen==null?'':screen),s=String(spoken==null?'':spoken);if(!s)return w;if(!w)return s;var allowed=voiceExplicitMoneyValues(w),claims=voiceExplicitMoneyValues(s),bad=claims.some(function(n){return allowed.indexOf(n)<0;});if(bad){try{console.warn('[CE VOZ BANK4_24] spoken_answer añade un importe numérico no acreditado; fallback a pantalla.');}catch(_){}return w;}try{if(s!==w)console.info('[CE VOZ BANK4_24] TTS usa spoken_answer certificado del servidor; la pantalla queda intacta.');}catch(_){}return s;}
  function prepareSpeechText(v){var text=String(v==null?'':v).replace(/[*_`#>|]/g,' ');text=humanizeSpokenMoney(text);text=humanizeSpokenListRhythm(text);text=humanizeSpokenLabels(text);return stripReservedFromSpeech(clean(text));}
  function speechProsodySegments(v){
    var text=prepareSpeechText(v);if(!text)return[];var out=[],buf='',i=0;
    function push(pause){var t=clean(buf);buf='';if(t)out.push({text:t,pauseAfter:pause||0});}
    function digit(c){return /[0-9]/.test(c||'');}
    for(i=0;i<text.length;i++){
      var ch=text.charAt(i),prev=text.charAt(i-1),next=text.charAt(i+1);buf+=ch;
      // BANK4_27 · La puntuación vive DENTRO de la locución. No creamos un utterance por
      // cada coma/dos puntos: Chrome/Edge se descoordina en textos largos con cientos de
      // utterances cortos. El sintetizador respira con la coma y CE solo corta por frase o tamaño.
      if((ch==='.'||ch===','||ch===':')&&digit(prev)&&digit(next))continue;
      if(ch==='.'&&text.substr(i,3)==='...'){buf+='..';i+=2;continue;}
      if(ch==='.'||ch==='!'||ch==='?'){push(95);continue;}
      // Frases especialmente largas: preferir ; o : cercanos y, si no, un espacio. Nunca mitad de palabra.
      if(buf.length>=330){var cut=Math.max(buf.lastIndexOf(';'),buf.lastIndexOf(':'));if(cut<185)cut=buf.lastIndexOf(' ');if(cut>185){var tail=buf.slice(cut+1);buf=buf.slice(0,cut+1);push(70);buf=tail;}}
    }
    push(0);return out;
  }
  function chunkSpeech(v){return speechProsodySegments(v);}
  function stopSpeaking(interrupted){state.speechGeneration++;state.localControlGeneration++;state.localControlSpeaking=false;state.speaking=false;state.currentUtterance=null;state.speechChunks=[];state.speechIndex=0;stopBarge();try{window.speechSynthesis.pause();window.speechSynthesis.cancel();}catch(_){}updateBadge();if(!interrupted&&state.conversationMode&&!state.requestInFlight&&!state.awaitingResponse)setTimeout(startUser,180);}
  function speakChunks(answer){if(!supportsSpeech()||!state.conversationMode){startUser();return;}pauseCloudListening();stopRecognition();stopBarge();try{window.speechSynthesis.cancel();}catch(_){}state.speechGeneration++;var gen=state.speechGeneration;state.speechChunks=chunkSpeech(answer);state.speechIndex=0;state.speaking=true;state.mode='speaking';setVoicePhase('SPEAKING','respuesta Zuzu · prosodia BANK4_26');updateBadge();setStatus('Zuzu está hablando. «Perdona» o «Espera» para cortar.','ok');function next(){if(gen!==state.speechGeneration||!state.speaking)return;if(state.speechIndex>=state.speechChunks.length){state.speaking=false;stopBarge();updateBadge();setStatus('Te escucho…','ok');setVoicePhase('REPLY_WINDOW','respuesta terminada');setTimeout(startUser,180);return;}var seg=state.speechChunks[state.speechIndex++]||{},phrase=typeof seg==='string'?seg:seg.text,pause=Number(seg&&seg.pauseAfter)||0;if(!phrase){setTimeout(next,pause);return;}var u=new SpeechSynthesisUtterance(phrase);u.lang='es-ES';u.rate=speechRate();u.pitch=0.82;u.volume=1;var voice=chooseVoice();if(voice)u.voice=voice;state.currentUtterance=u;u.onstart=function(){if(gen===state.speechGeneration)startBarge();};u.onend=function(){if(gen===state.speechGeneration)setTimeout(next,pause);};u.onerror=function(){if(gen===state.speechGeneration)setTimeout(next,Math.min(120,pause));};try{window.speechSynthesis.speak(u);}catch(_){setTimeout(next,Math.min(120,pause));}}next();}
  function speakResponse(){var dedicated=clean(window.__ceZuzuLastSpokenAnswer||'');var a=q('#ceAiResult .ce-ai-answer');var txt=dedicated||clean(a&&a.textContent);if(txt){if(!state.conversationMode)state.conversationMode=true;speakChunks(txt);}}
  function previewVoice(){if(!supportsSpeech())return;try{window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance('Esta es la voz de Zuzu. Estoy listo. Vamos al lío.');u.lang='es-ES';u.rate=speechRate();u.pitch=0.82;u.volume=1;var v=chooseVoice();if(v)u.voice=v;window.speechSynthesis.speak(u);}catch(_){} }

  function renderEntertainmentPhrase(raw){
    var item=(raw&&typeof raw==='object')?raw:{display:String(raw||''),speech:[[String(raw||''),0]]};
    var d=new Date(),months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'],days=['domingo','lunes','martes','miércoles','jueves','viernes','sábado'],h=d.getHours(),moment=h<7?'madrugada':h<13?'mañana':h<15?'mediodía':h<20?'tarde':'noche',pad=function(n){return String(n).padStart(2,'0');};
    var vars={usuario:voiceAddressName(false),nombre:voiceGreetingName(),mes_actual:months[d.getMonth()],mes:months[d.getMonth()],diasemana:days[d.getDay()],dia_semana:days[d.getDay()],ano_actual:String(d.getFullYear()),'añoactual':String(d.getFullYear()),dia_mes:String(d.getDate()),hora_actual:pad(h)+':'+pad(d.getMinutes()),fecha_hoy:pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear(),momento_dia:moment,version:'v4_0_exp'};
    function inject(v){var out=String(v||'');Object.keys(vars).forEach(function(k){out=out.replace(new RegExp('\\{'+k+'\\}','g'),vars[k]);});return clean(out);}
    var speech=Array.isArray(item.speech)?item.speech:[];
    return{display:inject(item.display),speech:speech.map(function(part){if(Array.isArray(part))return{text:inject(part[0]),pauseMs:Math.max(0,Number(part[1])||0),rate:Number(part[2])||0,pitch:Number(part[3])||0};return{text:inject(part&&part.text),pauseMs:Math.max(0,Number(part&&part.pauseMs)||0),rate:Number(part&&part.rate)||0,pitch:Number(part&&part.pitch)||0};}).filter(function(x){return !!x.text;})};
  }
  function contextualEntertainmentPhrase(){
    // No comenta el tema ni anticipa conclusiones: solo una señal humana de pensamiento.
    var idx=nextEntertainmentIndex();
    if(!Number.isInteger(idx)||idx<0||idx>=ENTERTAINMENT_PHRASES.length)return{display:'Ummmmm................... espera un poco, que estoy intentando acordarme bien.',speech:[['uuuuuuuummmmmmmmmmmmmm',900,0.28],['espera un poco, que estoy intentando acordarme bien.',0,0.90]]};
    commitEntertainmentIndex(idx);
    return ENTERTAINMENT_PHRASES[idx];
  }

  function entertainmentRandomInt(max){
    max=Math.max(1,Number(max)||1);try{if(window.crypto&&window.crypto.getRandomValues){var a=new Uint32Array(1);window.crypto.getRandomValues(a);return a[0]%max;}}catch(_){}return Math.floor(Math.random()*max);
  }
  function shuffleEntertainmentDeck(items){
    var deck=items.slice();for(var i=deck.length-1;i>0;i--){var j=entertainmentRandomInt(i+1),tmp=deck[i];deck[i]=deck[j];deck[j]=tmp;}return deck;
  }
  function persistEntertainmentState(){
    try{safeSet(STORAGE.entertainmentDeck,JSON.stringify(state.entertainmentDeck||[]));safeSet(STORAGE.entertainmentUsed,JSON.stringify(state.entertainmentUsed||[]));safeSet(STORAGE.entertainmentLast,String(Number(state.lastEntertainmentIndex)));safeSet(STORAGE.entertainmentCycle,String(state.entertainmentCycle||0));}catch(_){}
  }
  function refillEntertainmentDeck(){
    var all=[];for(var i=0;i<ENTERTAINMENT_PHRASES.length;i++)all.push(i);
    state.entertainmentUsed=[];state.entertainmentDeck=shuffleEntertainmentDeck(all);
    if(state.entertainmentDeck.length>1&&state.entertainmentDeck[0]===state.lastEntertainmentIndex){var t=state.entertainmentDeck[0];state.entertainmentDeck[0]=state.entertainmentDeck[1];state.entertainmentDeck[1]=t;}
    state.entertainmentCycle++;persistEntertainmentState();
  }
  function loadEntertainmentState(){
    if(state.entertainmentLoaded)return;state.entertainmentLoaded=true;state.entertainmentCycle=Math.max(0,Number(safeGet(STORAGE.entertainmentCycle,'0'))||0);state.lastEntertainmentIndex=Number(safeGet(STORAGE.entertainmentLast,'-1'));if(!Number.isInteger(state.lastEntertainmentIndex)||state.lastEntertainmentIndex<0||state.lastEntertainmentIndex>=ENTERTAINMENT_PHRASES.length)state.lastEntertainmentIndex=-1;
    try{var used=JSON.parse(safeGet(STORAGE.entertainmentUsed,'[]'));state.entertainmentUsed=Array.isArray(used)?used.map(Number).filter(function(x,i,a){return Number.isInteger(x)&&x>=0&&x<ENTERTAINMENT_PHRASES.length&&a.indexOf(x)===i;}):[];}catch(_){state.entertainmentUsed=[];}
    try{var raw=JSON.parse(safeGet(STORAGE.entertainmentDeck,'[]'));state.entertainmentDeck=Array.isArray(raw)?raw.map(Number).filter(function(x,i,a){return Number.isInteger(x)&&x>=0&&x<ENTERTAINMENT_PHRASES.length&&state.entertainmentUsed.indexOf(x)<0&&a.indexOf(x)===i;}):[];}catch(_){state.entertainmentDeck=[];}
    if(state.entertainmentUsed.length>=ENTERTAINMENT_PHRASES.length||!state.entertainmentDeck.length)refillEntertainmentDeck();
  }
  function nextEntertainmentIndex(){
    loadEntertainmentState();if(!state.entertainmentDeck.length)refillEntertainmentDeck();
    var idx=state.entertainmentDeck[0];state.pendingEntertainmentIndex=idx;persistEntertainmentState();return idx;
  }
  function commitEntertainmentIndex(idx){
    idx=Number(idx);if(!Number.isInteger(idx)||idx<0||idx>=ENTERTAINMENT_PHRASES.length)return;
    state.entertainmentDeck=(state.entertainmentDeck||[]).filter(function(x){return Number(x)!==idx;});
    if(state.entertainmentUsed.indexOf(idx)<0)state.entertainmentUsed.push(idx);
    state.lastEntertainmentIndex=idx;state.pendingEntertainmentIndex=-1;persistEntertainmentState();
  }
  function requeueEntertainmentIndex(idx){
    idx=Number(idx);state.pendingEntertainmentIndex=-1;
    if(Number.isInteger(idx)&&idx>=0&&idx<ENTERTAINMENT_PHRASES.length&&state.entertainmentUsed.indexOf(idx)<0){
      state.entertainmentDeck=(state.entertainmentDeck||[]).filter(function(x){return Number(x)!==idx;});
      state.entertainmentDeck.push(idx);
    }
    persistEntertainmentState();
  }
  function stopEntertainment(cancelSpeech){
    clearTimeout(state.entertainmentTimer);state.entertainmentTimer=null;
    if(cancelSpeech){var was=state.entertainmentSpeaking,u=state.entertainmentUtterance,idx=state.pendingEntertainmentIndex;if(u){try{u.onstart=null;u.onend=null;u.onerror=null;}catch(_){}}
      state.entertainmentSpeaking=false;state.entertainmentUtterance=null;if(idx>=0&&state.entertainmentUsed.indexOf(idx)<0)requeueEntertainmentIndex(idx);state.pendingEntertainmentIndex=-1;if(was)state.entertainmentFinishedAt=Date.now();persistEntertainmentState();if(was&&supportsSpeech()){try{window.speechSynthesis.cancel();}catch(_){}}}
  }
  function scheduleEntertainment(delay){clearTimeout(state.entertainmentTimer);state.entertainmentTimer=setTimeout(function(){if(!state.conversationMode||!state.requestInFlight)return;speakEntertainmentPhrase();},Math.max(0,Number(delay)||0));}
  function entertainmentEnded(){state.entertainmentSpeaking=false;state.entertainmentUtterance=null;state.entertainmentFinishedAt=Date.now();}
  function entertainmentSpeechParts(item){
    if(item&&Array.isArray(item.speech)&&item.speech.length)return item.speech.map(function(x){return{text:clean(x.text),pauseMs:Math.max(0,Number(x.pauseMs)||0),rate:Number(x.rate)||0,pitch:Number(x.pitch)||0};}).filter(function(x){return !!x.text;});
    var p=String(item&&item.display||item||'').trim();if(!p)return[];
    return p.replace(/…+/g,'...').split(/(?:\.{3,}|[;]+)/).map(function(x){return{text:clean(x).replace(/^[,.:!?\s]+|[,.:!?\s]+$/g,''),pauseMs:300};}).filter(function(x){return !!x.text;});
  }
  function entertainmentVoiceText(item){
    var t=String(item&&item.display||'').replace(/\.{3,}/g,', ').replace(/\s+,/g,',').replace(/,\s*,+/g,', ').replace(/\s+/g,' ').trim();
    // La U inicial fuerza un murmullo, no una sucesión de nombres de letras «eme».
    t=t.replace(/^Ummmmm+/i,'Uuuummmmmmmm').replace(/^Ufffff+/i,'Uffffff').replace(/^Ehhhh+/i,'Eeehhhh').replace(/^Aaaah+/i,'Aaaah');
    return t;
  }
  function speakEntertainmentPhrase(){
    if(!state.conversationMode||!state.requestInFlight||!supportsSpeech()||state.entertainmentSpeaking||state.entertainmentCount>=state.entertainmentMaxPerRequest)return;
    var item=renderEntertainmentPhrase(contextualEntertainmentPhrase(state.requestPrompt,state.entertainmentCount)),phrase=item.display,voiceText=entertainmentVoiceText(item);state.entertainmentCount++;setStatus(phrase,'ok');
    if(!voiceText){entertainmentEnded();return;}
    // BANK4_27 · Una frase de entretenimiento = UN utterance. Así no se pierde la segunda
    // mitad cuando el navegador está ocupado y la respuesta nueva espera a que acabe completa.
    state.entertainmentSpeaking=true;var v=chooseVoice(),done=false,watchdog=null;
    function finish(){if(done)return;done=true;clearTimeout(watchdog);state.entertainmentUtterance=null;entertainmentEnded();}
    try{var u=new SpeechSynthesisUtterance(voiceText);u.lang='es-ES';u.rate=Math.max(0.68,Math.min(0.82,speechRate()-0.10));u.pitch=0.82;u.volume=1;if(v)u.voice=v;state.entertainmentUtterance=u;u.onend=finish;u.onerror=finish;window.speechSynthesis.speak(u);
      watchdog=setTimeout(function(){if(!done&&(!window.speechSynthesis||!window.speechSynthesis.speaking))finish();},Math.max(7000,voiceText.length*105));
    }catch(_){finish();}
  }

  function startEntertainment(){stopEntertainment(true);state.entertainmentCount=0;state.entertainmentPersonalize=false;if(state.conversationMode&&state.requestInFlight)scheduleEntertainment(state.entertainmentInitialDelayMs||3300);}
  function queueAnswerAfterEntertainment(answer,autoRead){clearTimeout(state.pendingAnswerTimer);state.pendingAnswerTimer=null;var hadEntertainment=state.entertainmentSpeaking||!!state.entertainmentUtterance||(state.entertainmentFinishedAt>0&&Date.now()-state.entertainmentFinishedAt<600);function deliver(){if(!state.conversationMode)return;if(state.entertainmentSpeaking){state.pendingAnswerTimer=setTimeout(deliver,60);return;}var wait=hadEntertainment?Math.max(0,500-(Date.now()-(state.entertainmentFinishedAt||0))):0;state.pendingAnswerTimer=setTimeout(function(){state.pendingAnswerTimer=null;if(!state.conversationMode)return;if(autoRead)speakChunks(answer);else startUser();},wait);}deliver();}

  function resumeConversationListening(delay){if(!state.conversationMode||state.speaking||state.requestInFlight||state.awaitingResponse)return;setTimeout(function(){if(state.conversationMode&&!state.speaking&&!state.requestInFlight&&!state.awaitingResponse)startUser();},Number(delay)||180);}
  function startManualRecording(){if(state.recordingActive||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||typeof MediaRecorder==='undefined')return Promise.resolve(false);return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:true}}).then(function(stream){state.recorderStream=stream;state.recorderChunks=[];var mr=new MediaRecorder(stream);state.recorder=mr;mr.ondataavailable=function(e){if(e.data&&e.data.size)state.recorderChunks.push(e.data);};mr.onstop=function(){try{state.lastRecordingMime=mr.mimeType||'audio/webm';state.lastRecordingBlob=new Blob(state.recorderChunks,{type:state.lastRecordingMime});}catch(_){}state.recordingActive=false;try{stream.getTracks().forEach(function(t){t.stop();});}catch(_){}state.recorderStream=null;state.recorder=null;updateRecordButton();resumeConversationListening(220);};mr.start(1000);state.recordingActive=true;updateRecordButton();return true;}).catch(function(){setStatus('Grabación no disponible; la conversación por voz sigue activa.','');resumeConversationListening(180);return false;});}
  function updateRecordButton(){var b=$('ceVoz3RecordDownload');if(b)b.textContent=state.recordingActive?'⏹ Guardar voz':state.lastRecordingBlob?'⬇ Grabación':'⏺ Grabar';}
  function saveRecording(blob){if(!blob)return;var ext=/mp4/i.test(blob.type)?'mp4':'webm',a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ControlEvent-Zuzu-conversacion-'+new Date().toISOString().replace(/[-:T]/g,'').slice(0,14)+'.'+ext;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);}
  function downloadAndReleaseRecording(){if(!state.lastRecordingBlob)return;saveRecording(state.lastRecordingBlob);state.lastRecordingBlob=null;state.lastRecordingMime='';updateRecordButton();resumeConversationListening(250);}
  function toggleRecording(){if(state.recordingActive&&state.recorder){var mr=state.recorder;mr.addEventListener('stop',function once(){mr.removeEventListener('stop',once);setTimeout(downloadAndReleaseRecording,60);});try{mr.stop();}catch(_){state.recordingActive=false;resumeConversationListening(180);}return;}if(state.lastRecordingBlob){downloadAndReleaseRecording();return;}startManualRecording();}

  function activateDirectConversation(){
    clearWakeTimer();clearTurnTimer();stopEntertainment(true);stopBarge();clearDraftBuffer();state.conversationMode=true;state.parked=false;state.mode='user';state.requestInFlight=false;state.awaitingResponse=false;
    stopRecognition();state.needsGesture=false;setVoicePhase('USER_STARTING','micrófono manual');
    // RAW4: el botón Hablar usa directamente getUserMedia + Voz CE. En PC evita depender
    // del servicio Web Speech del navegador, que puede fallar aunque el micrófono físico funcione.
    if(supportsCeVoice()){state.cloudFallback=true;startCloudRecognition('user',true);}
    else if(supportsRecognition()){state.cloudFallback=false;startRecognition('user',true);}
    else setStatus('Este navegador no ofrece una entrada de micrófono compatible.','err');
    updateBadge();return true;
  }
  function toggleDirectConversationMic(){
    var active=state.conversationMode&&state.mode==='user'&&((state.cloudFallback&&state.cloudWanted)||(!state.cloudFallback&&(state.recognition||state.recognitionLive||state.recognitionStarting)));
    if(active){if(state.cloudFallback)pauseCloudListening();else stopRecognition();setStatus('Micrófono pausado. Pulsa Hablar para continuar.','');setMic(false);return;}
    activateDirectConversation();
  }

  function panelHtml(){var auto=safeGet(STORAGE.auto,'1')!=='0',mode='male',rate=safeGet(STORAGE.rate,'0.90');return '<div id="'+PANEL_ID+'">'+
    '<button type="button" id="ceVoz3Mic" class="ce-voz3-btn ce-voz3-mic">🎙️ Hablar</button>'+
    '<label class="ce-voz3-auto"><input id="ceVoz3AutoRead" type="checkbox"'+(auto?' checked':'')+'> Auto</label>'+
    '<button type="button" id="ceVoz3Read" class="ce-voz3-btn">🔊 Leer</button><button type="button" id="ceVoz3Stop" class="ce-voz3-btn">■ Parar</button>'+
    '<button type="button" id="ceVoz3RecordDownload" class="ce-voz3-btn">⏺ Grabar</button><button type="button" id="ceVoz3Preview" class="ce-voz3-btn">▶ Prueba</button>'+
    '<select id="ceVoz3VoiceMode" disabled title="Zuzu tiene identidad y voz masculina"><option value="male" selected>♂ Zuzu · Masculina</option></select>'+ 
    '<select id="ceVoz3VoiceChoice"><option value="auto">Voz automática</option></select><select id="ceVoz3Rate"><option value="0.82"'+(rate==='0.82'?' selected':'')+'>Lento</option><option value="0.90"'+(rate==='0.90'?' selected':'')+'>Normal</option><option value="1.06"'+(rate==='1.06'?' selected':'')+'>Rápido</option></select>'+
    '<select id="ceVoz3MicChoice" title="Micrófono de entrada"><option value="">Mic automático</option></select>'+
    '<span id="ceVoz3Meter" class="ce-voz3-meter" title="Nivel del micrófono"><span class="ce-voz3-meter-track"><span id="ceVoz3MeterFill" class="ce-voz3-meter-fill"></span></span><span id="ceVoz3MeterValue" class="ce-voz3-meter-value">0.0</span></span>'+
    '<span id="ceVoz3Status" class="ce-voz3-status">Conversación por voz</span></div>';}
  function bindPanel(){var b=$('ceVoz3Mic');if(b)b.onclick=toggleDirectConversationMic;b=$('ceVoz3AutoRead');if(b)b.onchange=function(){safeSet(STORAGE.auto,b.checked?'1':'0');};b=$('ceVoz3Read');if(b)b.onclick=speakResponse;b=$('ceVoz3Stop');if(b)b.onclick=function(){stopSpeaking(true);activateDirectConversation();};b=$('ceVoz3RecordDownload');if(b)b.onclick=toggleRecording;b=$('ceVoz3Preview');if(b)b.onclick=previewVoice;b=$('ceVoz3VoiceMode');if(b)b.onchange=function(){safeSet(STORAGE.mode,b.value);populateVoices();};b=$('ceVoz3VoiceChoice');if(b)b.onchange=function(){safeSet(voiceKey(),b.value);};b=$('ceVoz3Rate');if(b)b.onchange=function(){safeSet(STORAGE.rate,b.value);};b=$('ceVoz3MicChoice');if(b)b.onchange=function(){safeSet(STORAGE.mic,b.value||'');var kind=state.conversationMode?'user':'ambient';closeCloudVoice();state.cloudFallback=true;setTimeout(function(){if(kind==='user')activateDirectConversation();else startCloudRecognition('ambient',true);},80);};loadVoices();refreshMicDevices();updateMicMeter(true);updateRecordButton();}
  function injectPanel(){var overlay=$('ceGeminiLibreOverlay');if(!overlay)return;installManualDraftGuard();if($(PANEL_ID))return;injectStyle();var toolbar=q('.ce-ai-toolbar',overlay),pdf=$('ceAiDownloadResult');if(!toolbar)return;if(pdf)pdf.insertAdjacentHTML('afterend',panelHtml());else toolbar.insertAdjacentHTML('beforeend',panelHtml());bindPanel();}

  function endConversation(){forceReturnToAmbient(false,'fin conversación');state.parked=false;}
  function parkConversation(){if(!state.conversationMode)return;forceReturnToAmbient(false,'ventana Zuzu cerrada o réplica agotada');state.parked=true;}

  document.addEventListener('ce:zuzu-request-started',function(ev){if(state.manualDraftOwned)releaseManualDraft(true);if(!state.conversationMode)return;clearReplyWindow();/* BANK4_27: una pregunta nueva manda sobre la lectura vieja. */if(state.speaking)stopSpeaking(true);stopEntertainment(true);pauseCloudListening();state.requestInFlight=true;state.awaitingResponse=true;state.requestPrompt=clean(ev&&ev.detail&&ev.detail.prompt||state.requestPrompt);stopRecognition();clearTurnTimer();setVoicePhase('PROCESSING','petición CE iniciada; lectura anterior cancelada');setStatus('Consultando ControlEvent…','ok');startEntertainment();});
  document.addEventListener('ce:zuzu-request-error',function(){if(!state.conversationMode)return;state.requestInFlight=false;state.awaitingResponse=false;stopEntertainment(true);setVoicePhase('RECOVERY','error de petición CE');setStatus('No se pudo completar. Te escucho.','err');setTimeout(startUser,180);});
  document.addEventListener('ce:zuzu-response-rendered',function(ev){if(!state.conversationMode)return;state.requestInFlight=false;state.awaitingResponse=false;stopEntertainment(false);var screen=clean(ev&&ev.detail&&ev.detail.answer),spoken=clean(ev&&ev.detail&&ev.detail.spokenAnswer),raw=clean(safeVoiceAgainstScreen(screen,spoken||screen));var answer=stripVoiceAnswerLead(raw);window.__ceZuzuLastSpokenAnswer=answer||raw;var auto=$('ceVoz3AutoRead'),autoRead=!auto||auto.checked!==false;if(!answer){queueAnswerAfterEntertainment('',false);return;}queueAnswerAfterEntertainment(answer,autoRead);});
  window.addEventListener('controlevent:zuzu-opened',function(){state.overlayMissingSince=0;setTimeout(function(){injectPanel();installManualDraftGuard();},30);});
  window.addEventListener('controlevent:zuzu-closed',function(ev){forceReturnToAmbient(!!(ev&&ev.detail&&ev.detail.fromGesture),'evento controlevent:zuzu-closed');});
  document.addEventListener('click',function(ev){var t=ev.target;if(t&&t.closest&&t.closest('#ceAiDownloadResult')&&state.conversationMode)stopEntertainment(true);},true);
  document.addEventListener('ce:zuzu-pdf-print-started',function(){if(!state.conversationMode)return;stopEntertainment(true);if(state.cloudFallback)pauseCloudListening();else stopRecognition();setStatus('Generando PDF…','ok');});
  document.addEventListener('ce:zuzu-pdf-print-finished',function(){resumeConversationListening(300);});
  window.addEventListener('focus',function(){if(state.conversationMode)resumeConversationListening(220);else if(state.ambientEnabled&&!state.needsGesture)setTimeout(function(){forceAmbientRearm(false,'focus ventana');},120);});
  document.addEventListener('visibilitychange',function(){if(!document.hidden){if(state.conversationMode)resumeConversationListening(250);else if(state.ambientEnabled&&!state.needsGesture)setTimeout(function(){forceAmbientRearm(false,'pestaña visible');},140);}});

  function rearmAmbientAfterAuth(){if(!state.ambientEnabled||state.conversationMode)return;setTimeout(function(){if(!state.ambientEnabled||state.conversationMode)return;state.needsGesture=false;setVoicePhase('AMBIENT_STARTING','rearme tras autenticación');if(state.cloudFallback||!supportsRecognition()){if(!state.cloudWanted)startCloudRecognition('ambient',false);return;}if(!state.recognitionLive&&!state.recognitionStarting){stopRecognition();startAmbient(false);}},180);}

  function install(){
    injectStyle();injectBadge();injectPanel();setVoicePhase('BOOT','RAW14U instalado');
    // FIX27: la escucha queda ACTIVA por defecto en esta compilación. Si el navegador la
    // rechaza sin gesto, NO insistimos por temporizador: esperamos el siguiente gesto normal
    // (por ejemplo Entrar) y arrancamos el reconocimiento dentro de ese mismo evento.
    safeSet(STORAGE.ambient,'1');safeSet(STORAGE.mode,'male');state.ambientEnabled=true;
    if(supportsSpeech()){loadVoices();try{window.speechSynthesis.onvoiceschanged=loadVoices;}catch(_){} }
    // Transporte híbrido restaurado desde la última base que funcionó en conversación real:
    // Web Speech cuando el navegador lo resuelve; si devuelve `network` o no existe, Voz CE.
    // No intentamos instalar paquetes locales ni encadenar un tercer motor.
    state.localSpeechReady=false;state.localSpeechUnavailable=true;
    if(state.ambientEnabled)setTimeout(function(){if(!supportsRecognition()){state.cloudFallback=true;startCloudRecognition('ambient',false);}else startAmbient(false);},260);
    document.addEventListener('pointerdown',primeAmbientFromGesture,true);
    document.addEventListener('touchstart',primeAmbientFromGesture,{capture:true,passive:true});
    document.addEventListener('keydown',primeAmbientFromGesture,true);
    document.addEventListener('click',primeAmbientFromGesture,true);
    window.addEventListener('controlevent:login-ok',rearmAmbientAfterAuth,true);
    window.addEventListener('controlevent:auth-changed',rearmAmbientAfterAuth,true);
    window.addEventListener('controlevent:auth-restored-v96',rearmAmbientAfterAuth,true);
    if(window.MutationObserver){new MutationObserver(function(){if($('ceGeminiLibreOverlay'))injectPanel();else if(state.conversationMode&&!state.overlayMissingSince)state.overlayMissingSince=Date.now();}).observe(document.documentElement,{childList:true,subtree:true});}
    clearInterval(state.ambientHealthTimer);state.ambientHealthTimer=setInterval(ambientHealthTick,2200);
    window.addEventListener('beforeunload',function(){clearInterval(state.ambientHealthTimer);stopRecognition();closeCloudVoice();stopBarge();stopEntertainment(true);try{state.recorder&&state.recordingActive&&state.recorder.stop();}catch(_){}try{state.recorderStream&&state.recorderStream.getTracks().forEach(function(t){t.stop();});}catch(_){} });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();

  window.ControlEventVoiceTurns={
    version:BUILD,isConversationalMode:function(){return !!state.conversationMode;},
    startAmbientListening:function(){state.ambientEnabled=true;state.needsGesture=false;safeSet(STORAGE.ambient,'1');startAmbient(true);},startDirectConversation:activateDirectConversation,
    endVoiceConversation:endConversation,downloadConversationRecording:toggleRecording,
    speakResponse:speakResponse,stopSpeaking:stopSpeaking,supportsRecognition:supportsRecognition,supportsDeviceSpeech:supportsSpeech,spokenPreview:function(text){return prepareSpeechText(text);},
    clearDraftText:clearTextAndListen,localGreeting:speakLocalGreeting,
    debugState:function(){return{build:BUILD,phase:state.voicePhase,phaseSince:state.voicePhaseSince,phaseHistory:state.voicePhaseHistory.slice(),ambientEnabled:state.ambientEnabled,conversationMode:state.conversationMode,recognitionStarting:state.recognitionStarting,recognitionLive:state.recognitionLive,needsGesture:state.needsGesture,mode:state.mode,localControlSpeaking:state.localControlSpeaking,localSpeechReady:state.localSpeechReady,localSpeechPreparing:state.localSpeechPreparing,localSpeechUnavailable:state.localSpeechUnavailable,lastRecognitionError:state.lastRecognitionError,webSpeechNoSpeechCount:state.webSpeechNoSpeechCount,webSpeechStartFailures:state.webSpeechStartFailures,cloudFallback:state.cloudFallback,cloudWanted:state.cloudWanted,cloudRecording:state.cloudRecording,cloudBusy:state.cloudBusy,cloudLastTranscript:state.cloudLastTranscript,turnBuffer:currentTurn(),turnCommitMs:state.turnCommitMs,postClearUntil:state.postClearUntil,postClearQuarantineMs:state.postClearQuarantineMs,replyWindowUntil:state.replyWindowUntil,replyWindowMs:state.replyWindowMs,entertainment:{total:ENTERTAINMENT_PHRASES.length,used:state.entertainmentUsed.length,remaining:state.entertainmentDeck.length,cycle:state.entertainmentCycle,initialDelayMs:state.entertainmentInitialDelayMs,intervalMs:state.entertainmentIntervalMs,maxPerRequest:state.entertainmentMaxPerRequest,requestCounter:state.entertainmentRequestCounter,lastIndex:state.lastEntertainmentIndex},recognitionStartedAt:state.recognitionStartedAt,recognitionLastResultAt:state.recognitionLastResultAt,ambientSessionMaxMs:state.ambientSessionMaxMs,overlayOpen:!!$('ceGeminiLibreOverlay'),mic:{label:state.cloudDeviceLabel,id:state.cloudDeviceId,rms:state.cloudRms,channels:state.cloudChannelRms,peak:state.cloudPeak,noise:state.cloudNoiseFloor,threshold:state.cloudThreshold,calibrated:state.cloudCalibrationDone,settings:state.cloudDeviceSettings}};}
  };
  window.ControlEventVoiceV2=window.ControlEventVoiceTurns;
  window.ControlEventV22Voz4=window.ControlEventVoiceTurns;
  window.ControlEventV22Voz3=window.ControlEventVoiceTurns;
})();
