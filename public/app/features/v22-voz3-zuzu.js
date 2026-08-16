/* ControlEvent v2.0_exp · VOZ4 MOVIL ESTABLE
   Capa de voz independiente para Zuzu.
   - Conserva el dictado de voz de VOZ1/VOZ2.
   - Lee exclusivamente con las mejores voces españolas instaladas o expuestas por cada dispositivo.
   - No usa Azure, OpenAI ni ningún servicio TTS de pago; no necesita claves ni variables nuevas.
   - Permite perfil femenino/masculino, elección de voz concreta, prueba, pausa y lectura por bloques.
   - Prepara importes, porcentajes, fechas, horas, tickets, temperaturas y unidades para una lectura humana.
   - Los importes en formato español (1.234,56 €) se convierten a palabras antes de llegar al motor TTS.
   - No modifica la inteligencia, consultas, cálculos, tablas ni PDF de Zuzu. */
(function(){
  'use strict';
  if(window.__ceV22Voz3Zuzu) return;
  window.__ceV22Voz3Zuzu = true;

  var BUILD = 'v2.0_exp';
  var STYLE_ID = 'ceV22Voz3Style';
  var PANEL_ID = 'ceV22Voz3Panel';
  var STORAGE = {
    autoRead: 'ce_zuzu_voz3_auto_read',
    voiceMode: 'ce_zuzu_voz3_voice_mode',
    rate: 'ce_zuzu_voz3_rate',
    femaleVoice: 'ce_zuzu_voz3_female_voice',
    maleVoice: 'ce_zuzu_voz3_male_voice',
    ambientWake: 'ce_zuzu_voz4_ambient_wake'
  };
  var state = {
    recognition: null,
    wantListening: false,
    recognitionStarting: false,
    baseText: '',
    finalText: '',
    speechChunks: [],
    speechIndex: 0,
    speaking: false,
    paused: false,
    engine: '',
    currentUtterance: null,
    stopRequested: false,
    lastReadSignature: '',
    modalObserver: null,
    resultObserver: null,
    statusObserver: null,
    voices: [],
    voicesLoaded: false,
    voiceRetryTimer: null,
    voiceRetryCount: 0,
    selectedVoiceLabel: '',
    finalSegments: [],
    recognitionEndWaiters: [],
    submitBypass: false,
    recognitionMode: 'ambient',
    conversationMode: false,
    ambientEnabled: true,
    ambientHeard: '',
    voiceSegments: [],
    voiceInterim: '',
    silenceTimer: null,
    requestInFlight: false,
    queuedUtterance: '',
    lastSpokenText: '',
    currentSpokenChunk: '',
    recentSpokenChunks: [],
    speechEchoUntil: 0,
    wakeStartedAt: 0,
    recorderStream: null,
    mediaRecorder: null,
    recorderChunks: [],
    recordingActive: false,
    lastRecordingBlob: null,
    lastRecordingMime: '',
    recordingStartedAt: 0,
    autoArmTried: false
  };

  function $(id){ return document.getElementById(id); }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function joinText(){
    return Array.prototype.slice.call(arguments).map(clean).filter(Boolean).join(' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  }
  function normalizedTranscript(value){
    return clean(value).toLocaleLowerCase('es-ES').replace(/[.,;:!?¿¡]+/g,'').trim();
  }
  function wakeNorm(value){
    return normalizedTranscript(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9ñ ]+/g,' ').replace(/\s+/g,' ').trim();
  }
  function editDistance(a,b){
    a=String(a||'');b=String(b||'');var m=a.length,n=b.length,prev=[],cur=[],i,j;
    for(j=0;j<=n;j++)prev[j]=j;
    for(i=1;i<=m;i++){cur=[i];for(j=1;j<=n;j++)cur[j]=Math.min(cur[j-1]+1,prev[j]+1,prev[j-1]+(a.charAt(i-1)===b.charAt(j-1)?0:1));prev=cur;}
    return prev[n];
  }
  function isZuzuWord(word){
    word=wakeNorm(word).replace(/\s/g,'');
    if(!word)return false;
    if(['zuzu','susu','suzu','zusu','yuyu','zulu','zuzú','susú'].indexOf(word)>=0)return true;
    return word.length>=3&&word.length<=6&&editDistance(word,'zuzu')<=2;
  }
  function wakeMatch(value){
    var n=wakeNorm(value),parts=n.split(' ').filter(Boolean);
    for(var i=0;i<parts.length-1;i++){
      if(['hola','ola','oye','ey','eh','buenas'].indexOf(parts[i])<0)continue;
      if(isZuzuWord(parts[i+1]))return{matched:true,phrase:parts[i]+' '+parts[i+1],rest:parts.slice(i+2).join(' ')};
    }
    return{matched:false,rest:''};
  }
  function goodbyeMatch(value){
    var n=wakeNorm(value),parts=n.split(' ').filter(Boolean);
    if(!/\b(adios|hasta luego|hasta pronto|nos vemos)\b/.test(n))return false;
    return parts.some(isZuzuWord)||/\badios\b/.test(n)&&state.conversationMode;
  }
  function wordOverlapRatio(a,b){
    var aa=wakeNorm(a).split(' ').filter(function(x){return x.length>2;}),bb=wakeNorm(b).split(' ').filter(function(x){return x.length>2;});
    if(!aa.length||!bb.length)return 0;var set=new Set(bb),hit=0;aa.forEach(function(x){if(set.has(x))hit++;});return hit/aa.length;
  }
  function contentTokens(value){
    var stop={el:1,la:1,los:1,las:1,un:1,una:1,unos:1,unas:1,de:1,del:1,al:1,y:1,o:1,que:1,como:1,por:1,para:1,con:1,sin:1,es:1,son:1,ha:1,he:1};
    return wakeNorm(value).split(' ').filter(function(x){return x.length>2&&!stop[x];});
  }
  function tokenNear(a,b){
    if(a===b)return true;
    if(!a||!b)return false;
    if(a.length>=4&&b.length>=4&&(a.indexOf(b)===0||b.indexOf(a)===0))return true;
    return a.length>=4&&b.length>=4&&editDistance(a,b)<=1;
  }
  function fuzzyTokenCoverage(a,b){
    var aa=contentTokens(a),bb=contentTokens(b);if(!aa.length||!bb.length)return 0;
    var hit=0;aa.forEach(function(x){if(bb.some(function(y){return tokenNear(x,y);})){hit++;}});
    return hit/aa.length;
  }
  function maxOwnVoiceSimilarity(value){
    var candidates=[];
    if(state.currentSpokenChunk)candidates.push(state.currentSpokenChunk);
    (state.recentSpokenChunks||[]).slice(-3).forEach(function(x){if(x)candidates.push(x);});
    if(state.lastSpokenText)candidates.push(state.lastSpokenText);
    var best=0,n=wakeNorm(value);
    candidates.forEach(function(spoken){
      var s=wakeNorm(spoken);if(!s)return;
      if(s.indexOf(n)>=0||n.indexOf(s)>=0)best=Math.max(best,0.99);
      best=Math.max(best,wordOverlapRatio(n,s),fuzzyTokenCoverage(n,s));
    });
    return best;
  }
  function isLikelyOwnVoice(value){
    if((!state.speaking&&Date.now()>Number(state.speechEchoUntil||0))||!state.lastSpokenText)return false;
    var n=wakeNorm(value);if(n.length<3)return true;
    return maxOwnVoiceSimilarity(n)>=0.46;
  }
  function explicitInterruptCue(value){
    return /\b(zuzu|susu|suzu|oye|ey|espera|esperate|para|para un momento|no espera|no no|perdona|perdon|una cosa)\b/.test(wakeNorm(value));
  }
  function voiceAliasNormalize(value){
    var out=clean(value);if(!out)return out;
    out=out
      .replace(/\b(?:santiago\s+y\s+santa\s+ana|santiago\s+santa\s+ana|sisa|s\s+y\s+s\s+a|ese\s+y\s+ese\s+a)\b/gi,'SySA')
      .replace(/\bversus\b/gi,'vs');
    if(/\b(jornada|visita|evento|edici[oó]n|funci[oó]n)\b/i.test(out)){
      var ord=[['d[eé]cima','X'],['novena','IX'],['octava','VIII'],['s[eé]ptima','VII'],['sexta','VI'],['quinta','V'],['cuarta','IV'],['tercera','III'],['segunda','II'],['primera','I']];
      ord.forEach(function(pair){out=out.replace(new RegExp('\\b'+pair[0]+'\\b','gi'),pair[1]);});
      out=out.replace(/\bYii\b/gi,'III').replace(/\bjornada\s+solidaridad\b/gi,'Jornada Solidaria');
    }
    return clean(out);
  }
  function appendFinalTranscript(text){
    text=clean(text); if(!text) return;
    var key=normalizedTranscript(text);
    if(!key) return;
    var segments=state.finalSegments;
    if(segments.some(function(item){ return item.key===key; })) return;
    var last=segments.length?segments[segments.length-1]:null;
    if(last && (last.key.indexOf(key)>=0 || key.indexOf(last.key)>=0)){
      if(key.length>last.key.length) segments[segments.length-1]={key:key,text:text};
    }else{
      segments.push({key:key,text:text});
    }
    state.finalText=segments.map(function(item){return item.text;}).join(' ');
  }
  function resolveRecognitionEnd(){
    var waiters=state.recognitionEndWaiters.splice(0);
    waiters.forEach(function(resolve){try{resolve();}catch(_){}});
  }
  function stopListeningAndWait(maxWait){
    maxWait=Number(maxWait)||750;
    state.wantListening=false;
    state.recognitionStarting=false;
    setMicUi(false);
    return new Promise(function(resolve){
      var done=false;
      function finish(){if(done)return;done=true;resolve();}
      state.recognitionEndWaiters.push(finish);
      try{ if(state.recognition) state.recognition.stop(); else finish(); }
      catch(_){ try{state.recognition&&state.recognition.abort();}catch(__){} setTimeout(finish,30); }
      setTimeout(finish,maxWait);
    });
  }
  function safeGet(key, fallback){
    try{ var value = localStorage.getItem(key); return value == null ? fallback : value; }catch(_){ return fallback; }
  }
  function safeSet(key, value){ try{ localStorage.setItem(key, String(value)); }catch(_){ } }
  function supportsRecognition(){ return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
  function supportsDeviceSpeech(){ return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); }

  function injectStyle(){
    if($(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = '\n'+
      '#'+PANEL_ID+'{display:inline-flex;align-items:center;gap:4px;flex:1 1 560px;min-width:300px;flex-wrap:wrap;margin:0;padding:0;border:0;background:transparent;color:#0f172a}\n'+
      '#'+PANEL_ID+' .ce-voz3-btn{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:8px;padding:5px 7px;font-size:10px;font-weight:850;cursor:pointer;min-height:30px;line-height:1;white-space:nowrap}\n'+
      '#'+PANEL_ID+' .ce-voz3-btn:hover{background:#f8fafc}#'+PANEL_ID+' .ce-voz3-btn:disabled{opacity:.42;cursor:not-allowed}\n'+
      '#'+PANEL_ID+' .ce-voz3-mic{border-color:#fb923c;background:#fff7ed;color:#9a3412;min-width:76px}\n'+
      '#'+PANEL_ID+' .ce-voz3-mic.is-listening{background:#dc2626;color:#fff;border-color:#b91c1c;box-shadow:0 0 0 4px rgba(220,38,38,.12);animation:ceVoz3Pulse 1.25s infinite}\n'+
      '#'+PANEL_ID+' .ce-voz3-auto{display:inline-flex;align-items:center;gap:3px;font-size:9px;font-weight:900;white-space:nowrap;border:1px solid #fed7aa;background:#fff7ed;border-radius:8px;padding:4px 6px;min-height:30px;box-sizing:border-box}\n'+
      '#'+PANEL_ID+' .ce-voz3-auto input{width:14px;height:14px;accent-color:#f97316;margin:0}\n'+
      '#'+PANEL_ID+' select{border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:4px 5px;font-size:9px;font-weight:800;color:#0f172a;min-height:30px;max-width:160px}\n'+
      '#'+PANEL_ID+' .ce-voz3-voice-choice{width:145px;max-width:180px}\n'+
      '#'+PANEL_ID+' .ce-voz3-help{border-color:#bae6fd;background:#f0f9ff;color:#075985}\n'+
      '#'+PANEL_ID+' .ce-voz3-status{font-size:9px;font-weight:800;color:#475569;flex:1 1 120px;max-width:210px;min-width:95px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\n'+
      '#'+PANEL_ID+' .ce-voz3-status.ok{color:#15803d}#'+PANEL_ID+' .ce-voz3-status.err{color:#b91c1c}\n'+
      '#'+PANEL_ID+' .ce-voz3-engine{font-size:8px;font-weight:900;color:#0f766e;background:#ecfeff;border:1px solid #a5f3fc;border-radius:999px;padding:3px 5px;white-space:nowrap}\n'+
      '.ce-voz3-help-layer{position:fixed;inset:0;z-index:100005;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:18px}.ce-voz3-help-card{width:min(620px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:20px;color:#0f172a}.ce-voz3-help-card h3{margin:0 0 10px;font-size:20px}.ce-voz3-help-card p{line-height:1.5;margin:8px 0}.ce-voz3-help-card ol{padding-left:22px;line-height:1.55}.ce-voz3-help-card button{margin-top:12px;border:0;border-radius:10px;padding:9px 14px;background:#0f172a;color:#fff;font-weight:850;cursor:pointer}\n'+
      '.ce-zuzu-wake-badge{position:fixed;right:18px;bottom:18px;z-index:99970;border:1px solid #cbd5e1;background:rgba(255,255,255,.94);color:#475569;border-radius:999px;padding:7px 11px;font-size:11px;font-weight:900;box-shadow:0 6px 20px rgba(15,23,42,.13);cursor:pointer;backdrop-filter:blur(6px)}.ce-zuzu-wake-badge.is-listening{border-color:#86efac;background:#f0fdf4;color:#166534}.ce-zuzu-wake-badge.is-conversation{border-color:#fdba74;background:#fff7ed;color:#9a3412;animation:ceZuzuWakePulse 1.4s infinite}@keyframes ceZuzuWakePulse{0%,100%{transform:scale(1)}50%{transform:scale(1.045)}}\n'+
      '@keyframes ceVoz3Pulse{0%,100%{box-shadow:0 0 0 3px rgba(220,38,38,.12)}50%{box-shadow:0 0 0 7px rgba(220,38,38,.04)}}\n'+
      '#ceGeminiLibreOverlay #ceAiResult{flex:1 1 300px;min-height:230px;overflow:auto;-webkit-overflow-scrolling:touch}\n'+
      '@media(max-width:980px){#'+PANEL_ID+'{flex-basis:100%;min-width:0}#'+PANEL_ID+' .ce-voz3-status{max-width:none}}\n'+
      '@media(max-width:760px){#'+PANEL_ID+'{gap:3px}#'+PANEL_ID+' .ce-voz3-btn{font-size:9px;padding:5px 6px}#'+PANEL_ID+' select{max-width:135px}#'+PANEL_ID+' .ce-voz3-voice-choice{width:120px}#ceGeminiLibreOverlay .ce-ai-modal{overflow:hidden}#ceGeminiLibreOverlay .ce-ai-prompt{flex:0 0 auto}#ceGeminiLibreOverlay #ceAiResult{flex:1 1 220px;min-height:190px}}\n';
    document.head.appendChild(st);
  }

  function setVoiceStatus(message, kind){
    var el = $('ceVoz3Status');
    if(!el) return;
    el.className = 'ce-voz3-status' + (kind ? ' '+kind : '');
    el.textContent = message || '';
  }
  function setMicUi(listening){
    var btn = $('ceVoz3Mic');
    if(!btn) return;
    btn.classList.toggle('is-listening', !!listening);
    btn.setAttribute('aria-pressed', listening ? 'true' : 'false');
    btn.textContent = listening ? '⏹ Detener micro' : '🎙️ Hablar';
    btn.title = listening ? 'Detener el dictado' : 'Abrir el micrófono y dictar la pregunta';
  }
  function promptEl(){ return $('ceAiPrompt'); }
  function updatePrompt(interim){
    var el = promptEl();
    if(!el) return;
    var value = joinText(state.baseText, state.finalText, interim || '');
    el.value = value;
    try{ el.dispatchEvent(new Event('change', {bubbles:false})); el.setSelectionRange(value.length, value.length); }catch(_){ }
  }

  function recognitionErrorText(code){
    var map = {
      'not-allowed':'Permiso de micrófono denegado. Actívalo en el navegador.',
      'service-not-allowed':'El navegador ha bloqueado el reconocimiento de voz.',
      'audio-capture':'No se encuentra ningún micrófono disponible.',
      'network':'No se pudo conectar con el servicio de reconocimiento de voz.',
      'no-speech':'No he oído voz. El micrófono sigue abierto.',
      'aborted':'Dictado detenido.',
      'language-not-supported':'El reconocimiento en español no está disponible en este dispositivo.'
    };
    return map[code] || ('No se pudo usar el micrófono ('+code+').');
  }

  function updateWakeBadge(){
    var b=$('ceZuzuWakeBadge'); if(!b) return;
    var listening=!!state.wantListening;
    if(state.conversationMode){b.className='ce-zuzu-wake-badge is-conversation';b.textContent='🎙 Conversando con Zuzu';b.title='Conversación oral activa. Puedes interrumpir a Zuzu hablando.';return;}
    if(listening){b.className='ce-zuzu-wake-badge is-listening';b.textContent='👂 Hola Zuzu';b.title='Escucha ambiental activa. Di «Hola Zuzu» desde cualquier pantalla.';}
    else{b.className='ce-zuzu-wake-badge';b.textContent='👂 Activar Zuzu';b.title='Pulsa para activar la escucha ambiental.';}
  }
  function injectWakeBadge(){
    if($('ceZuzuWakeBadge')||!document.body)return;
    var b=document.createElement('button');b.type='button';b.id='ceZuzuWakeBadge';b.className='ce-zuzu-wake-badge';b.textContent='👂 Activar Zuzu';
    b.addEventListener('click',function(ev){
      if(ev)ev.preventDefault();
      if(state.conversationMode){setVoiceStatus('La conversación oral está activa. Di «Adiós, Zuzu» para terminar.','ok');return;}
      state.ambientEnabled=!state.wantListening;safeSet(STORAGE.ambientWake,state.ambientEnabled?'1':'0');
      if(state.ambientEnabled)startAmbientListening(true);else stopAmbientListening();
    });
    document.body.appendChild(b);updateWakeBadge();
  }
  function resetVoiceUtterance(){state.voiceSegments=[];state.voiceInterim='';clearTimeout(state.silenceTimer);state.silenceTimer=null;}
  function appendVoiceFinal(text){
    text=clean(text);if(!text)return;var key=normalizedTranscript(text);if(!key)return;
    var last=state.voiceSegments.length?state.voiceSegments[state.voiceSegments.length-1]:null;
    if(last&&(last.key.indexOf(key)>=0||key.indexOf(last.key)>=0)){if(key.length>last.key.length)state.voiceSegments[state.voiceSegments.length-1]={key:key,text:text};}
    else if(!state.voiceSegments.some(function(x){return x.key===key;}))state.voiceSegments.push({key:key,text:text});
  }
  function currentVoiceUtterance(){return joinText(state.voiceSegments.map(function(x){return x.text;}).join(' '),state.voiceInterim);}
  function showVoicePrompt(text){
    var p=promptEl();if(!p)return;p.value=clean(text);try{p.dispatchEvent(new Event('input',{bubbles:true}));p.setSelectionRange(p.value.length,p.value.length);}catch(_){ }
  }
  function openZuzuForVoice(done){
    if($('ceGeminiLibreOverlay')){if(done)done();return;}
    try{if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.open==='function')window.ControlEventV113ZuzuAnalitica.open();}catch(_){ }
    setTimeout(function(){injectPanel();if(done)done();},110);
  }
  function scheduleVoiceSubmission(){
    clearTimeout(state.silenceTimer);
    state.silenceTimer=setTimeout(function(){
      var text=currentVoiceUtterance();
      if(!clean(text))return;
      resetVoiceUtterance();
      submitVoiceUtterance(text);
    },2000);
  }
  function submitVoiceUtterance(text){
    text=voiceAliasNormalize(text);if(!text)return;
    if(goodbyeMatch(text)){endVoiceConversation('goodbye');return;}
    if(state.requestInFlight){state.queuedUtterance=text;setVoiceStatus('Te he escuchado. Respondo a eso en cuanto termine el turno actual.','ok');return;}
    openZuzuForVoice(function(){
      showVoicePrompt(text);setVoiceStatus('Te he escuchado. Estoy pensando…','ok');
      var b=$('ceAiRun');if(b)b.click();
    });
  }
  function beginVoiceConversation(initialText){
    if(state.conversationMode)return;
    state.conversationMode=true;state.recognitionMode='conversation';state.wakeStartedAt=Date.now();state.requestInFlight=false;state.queuedUtterance='';state.ambientHeard='';
    resetVoiceUtterance();updateWakeBadge();startSessionRecording();
    openZuzuForVoice(function(){
      var first=clean(initialText)||'Hola Zuzu';
      appendVoiceFinal(first);showVoicePrompt(first);setVoiceStatus('Hola. Te escucho; cuando calles dos segundos te respondo.','ok');scheduleVoiceSubmission();
    });
  }
  function processConversationSpeech(text,isFinal,confidence){
    text=voiceAliasNormalize(text);if(!text)return;
    var echoScore=maxOwnVoiceSimilarity(text),echoTail=Date.now()<=Number(state.speechEchoUntil||0);
    if(isLikelyOwnVoice(text))return;
    if(state.speaking){
      // Los resultados provisionales son la principal fuente de auto-interrupciones:
      // no cortamos a Zuzu hasta tener una frase final claramente distinta de lo que está diciendo.
      if(!isFinal){
        if(explicitInterruptCue(text)&&echoScore<0.25){
          stopSpeaking(false);state.speechEchoUntil=Date.now()+650;setVoiceStatus('Te escucho. Continúa; esperaré dos segundos cuando termines.','ok');resetVoiceUtterance();
          state.voiceInterim=text;showVoicePrompt(text);
        }
        return;
      }
      // Para cortar una locución sin palabra de interrupción exigimos una frase final
      // suficientemente distinta, con contenido real y una confianza razonable. Así un eco
      // deformado por el altavoz no convierte a Zuzu en su propia interlocutora.
      var confOk=!confidence||Number(confidence)>=0.40;
      var userLike=explicitInterruptCue(text)||(contentTokens(text).length>=3&&echoScore<0.30&&confOk);
      if(!userLike)return;
      stopSpeaking(false);state.speechEchoUntil=Date.now()+650;setVoiceStatus('Te escucho. Continúa; esperaré dos segundos cuando termines.','ok');resetVoiceUtterance();
    }else if(echoTail&&echoScore>=0.28){
      return;
    }
    if(isFinal){appendVoiceFinal(text);state.voiceInterim='';}else state.voiceInterim=text;
    var full=currentVoiceUtterance();showVoicePrompt(full);scheduleVoiceSubmission();
  }
  function processAmbientSpeech(text){
    text=voiceAliasNormalize(text);if(!text||isLikelyOwnVoice(text))return;
    state.ambientHeard=joinText(state.ambientHeard,text).slice(-180);
    var match=wakeMatch(state.ambientHeard);
    if(match.matched){
      var first=match.rest?('Hola Zuzu. '+match.rest):'Hola Zuzu';
      state.ambientHeard='';beginVoiceConversation(first);return;
    }
    // Mantener solo unas pocas palabras evita activar por frases antiguas acumuladas.
    var words=state.ambientHeard.split(/\s+/);if(words.length>10)state.ambientHeard=words.slice(-10).join(' ');
  }
  function recordingMime(){
    if(!window.MediaRecorder)return'';var list=['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'];
    for(var i=0;i<list.length;i++){try{if(!MediaRecorder.isTypeSupported||MediaRecorder.isTypeSupported(list[i]))return list[i];}catch(_){ }}return'';
  }
  function ensureRecorderStream(){
    if(state.recorderStream&&state.recorderStream.active)return Promise.resolve(state.recorderStream);
    if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)return Promise.resolve(null);
    // La grabación conserva también la voz de Zuzu que sale por altavoces; por eso aquí no
    // activamos echoCancellation. La supresión del eco para el diálogo se hace sobre las
    // transcripciones, no destruyendo el audio que el usuario quiere descargar.
    return navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:true}}).then(function(stream){state.recorderStream=stream;return stream;}).catch(function(){return null;});
  }
  function startSessionRecording(){
    if(state.recordingActive||!window.MediaRecorder)return;
    ensureRecorderStream().then(function(stream){
      if(!stream||!state.conversationMode||state.recordingActive)return;
      try{
        state.recorderChunks=[];state.lastRecordingBlob=null;state.lastRecordingMime='';var mime=recordingMime();
        state.mediaRecorder=mime?new MediaRecorder(stream,{mimeType:mime}):new MediaRecorder(stream);
        state.mediaRecorder.ondataavailable=function(ev){if(ev&&ev.data&&ev.data.size)state.recorderChunks.push(ev.data);};
        state.mediaRecorder.onstop=function(){
          var type=state.mediaRecorder&&state.mediaRecorder.mimeType||mime||'audio/webm';
          if(state.recorderChunks.length)state.lastRecordingBlob=new Blob(state.recorderChunks,{type:type});
          state.lastRecordingMime=type;state.recordingActive=false;updateRecordButton();
        };
        state.mediaRecorder.start(900);state.recordingActive=true;state.recordingStartedAt=Date.now();updateRecordButton();
      }catch(_){state.recordingActive=false;updateRecordButton();}
    });
  }
  function stopSessionRecording(){
    return new Promise(function(resolve){
      var rec=state.mediaRecorder;
      if(!rec||!state.recordingActive||rec.state==='inactive'){state.recordingActive=false;updateRecordButton();resolve(state.lastRecordingBlob);return;}
      var done=false;function finish(){if(done)return;done=true;setTimeout(function(){resolve(state.lastRecordingBlob);},30);}
      try{rec.addEventListener('stop',finish,{once:true});rec.stop();}catch(_){finish();}
      setTimeout(finish,900);
    });
  }
  function recordingExtension(type){type=String(type||'').toLowerCase();if(type.indexOf('mp4')>=0)return'm4a';if(type.indexOf('ogg')>=0)return'ogg';return'webm';}
  function downloadRecordingBlob(blob){
    if(!blob||!blob.size){setVoiceStatus('No hay una grabación de esta conversación disponible.','err');return;}
    var d=new Date(),pad=function(n){return String(n).padStart(2,'0');};var stamp=d.getFullYear()+pad(d.getMonth()+1)+pad(d.getDate())+'-'+pad(d.getHours())+pad(d.getMinutes())+pad(d.getSeconds());
    var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='ControlEvent-Zuzu-conversacion-'+stamp+'.'+recordingExtension(blob.type||state.lastRecordingMime);document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},2500);
  }
  function downloadConversationRecording(){
    var wasConversation=state.conversationMode;
    stopSessionRecording().then(function(blob){downloadRecordingBlob(blob);if(wasConversation)finishVoiceConversationState('recording');});
  }
  function updateRecordButton(){
    var b=$('ceVoz3RecordDownload');if(!b)return;
    b.disabled=!(state.recordingActive||(state.lastRecordingBlob&&state.lastRecordingBlob.size));
    b.textContent=state.recordingActive?'⏺ Guardar voz':'⬇ Grabación';
    b.title=state.recordingActive?'Finalizar la conversación oral y descargar la grabación':'Descargar la última grabación oral disponible';
  }
  function finishVoiceConversationState(reason){
    state.conversationMode=false;state.recognitionMode='ambient';state.requestInFlight=false;state.queuedUtterance='';resetVoiceUtterance();state.ambientHeard='';updateWakeBadge();
    if(state.ambientEnabled){state.wantListening=true;startRecognitionEngine();}
    setVoiceStatus(reason==='pdf'?'Conversación oral finalizada al preparar el PDF. Di «Hola Zuzu» cuando quieras volver.':'Escucha ambiental activa. Di «Hola Zuzu» cuando quieras.','ok');
  }
  function endVoiceConversation(reason){
    var was=state.conversationMode;clearTimeout(state.silenceTimer);state.silenceTimer=null;stopSpeaking(false);
    stopSessionRecording().then(function(){if(was)finishVoiceConversationState(reason);});
    if(reason==='goodbye'){
      state.conversationMode=false;state.recognitionMode='ambient';state.lastSpokenText='Hasta luego. Cuando quieras volver a hablar conmigo, di Hola Zuzu.';
      setTimeout(function(){startDeviceSpeech(prepareSpeechText(state.lastSpokenText));},80);
      setTimeout(function(){try{if(window.ControlEventV113ZuzuAnalitica&&typeof window.ControlEventV113ZuzuAnalitica.close==='function')window.ControlEventV113ZuzuAnalitica.close();}catch(_){ }},850);
    }
  }

  function appVoiceState(){
    try{return window.state||window.ControlEventApp&&window.ControlEventApp.state||{};}catch(_){return{};}
  }
  function entityHintScore(value){
    var n=wakeNorm(voiceAliasNormalize(value));if(!n)return 0;
    var st=appVoiceState(),rows=[];
    (Array.isArray(st.eventos)?st.eventos:[]).forEach(function(x){if(x&&x.titulo)rows.push(x.titulo);});
    (Array.isArray(st.personas)?st.personas:[]).forEach(function(x){if(x&&x.nombre)rows.push(x.nombre);});
    var nt=contentTokens(n),best=0;
    rows.slice(0,500).forEach(function(label){
      var l=wakeNorm(label),lt=contentTokens(l);if(!lt.length)return;
      var hit=0;nt.forEach(function(x){if(lt.some(function(y){return tokenNear(x,y);})){hit++;}});
      if(hit)best=Math.max(best,hit/Math.max(1,Math.min(nt.length,lt.length)));
    });
    return Math.min(1,best);
  }
  function bestRecognitionAlternative(result){
    if(!result||!result.length)return{text:'',confidence:0};
    var best={text:clean(result[0]&&result[0].transcript),confidence:Number(result[0]&&result[0].confidence)||0,score:-1};
    for(var i=0;i<Math.min(result.length,5);i++){
      var raw=clean(result[i]&&result[i].transcript);if(!raw)continue;
      var normalized=voiceAliasNormalize(raw),conf=Number(result[i]&&result[i].confidence)||0;
      var score=conf*0.35+entityHintScore(normalized)*0.65;
      if(score>best.score)best={text:normalized,confidence:conf,score:score};
    }
    best.text=voiceAliasNormalize(best.text);
    return best;
  }
  function spokenLabelVariants(label){
    var raw=clean(label),out=[raw];if(!raw)return[];
    if(/\bsysa\b/i.test(raw))out=out.concat(['Santiago y Santa Ana','Santiago y Santa Ana '+(raw.match(/\b20\d{2}\b/)||[''])[0],'Sisa '+(raw.match(/\b20\d{2}\b/)||[''])[0],'S y S A '+(raw.match(/\b20\d{2}\b/)||[''])[0]]);
    var romanWords={I:'primera',II:'segunda',III:'tercera',IV:'cuarta',V:'quinta',VI:'sexta',VII:'séptima',VIII:'octava',IX:'novena',X:'décima'};
    var m=raw.match(/^\s*(X|IX|VIII|VII|VI|V|IV|III|II|I)\b/i);
    if(m&&romanWords[m[1].toUpperCase()])out.push(raw.replace(m[0],romanWords[m[1].toUpperCase()]+' '));
    return out.map(clean).filter(Boolean);
  }
  function installRecognitionGrammar(rec){
    try{
      var G=window.SpeechGrammarList||window.webkitSpeechGrammarList;if(!G)return;
      var st=appVoiceState(),labels=['SySA','Santiago y Santa Ana','Sisa','S y S A','ese y ese a'];
      (Array.isArray(st.eventos)?st.eventos:[]).slice(0,80).forEach(function(x){if(x&&x.titulo)labels=labels.concat(spokenLabelVariants(x.titulo));});
      (Array.isArray(st.personas)?st.personas:[]).slice(0,120).forEach(function(x){if(x&&x.nombre)labels=labels.concat(spokenLabelVariants(x.nombre));});
      labels=labels.map(function(x){return x.replace(/[;=|<>]/g,' ').replace(/\s+/g,' ').trim();}).filter(Boolean);
      if(!labels.length)return;
      var grammar='#JSGF V1.0; grammar controlevent; public <entidad> = '+labels.join(' | ')+' ;';
      var list=new G();list.addFromString(grammar,1);rec.grammars=list;
    }catch(_){}
  }

  function buildRecognition(){
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Ctor) return null;
    var rec = new Ctor();
    rec.lang = 'es-ES';rec.continuous = true;rec.interimResults = true;rec.maxAlternatives = 5;installRecognitionGrammar(rec);
    rec.onstart = function(){
      state.recognitionStarting=false;setMicUi(true);updateWakeBadge();
      setVoiceStatus(state.conversationMode?'Te escucho. Habla con naturalidad; enviaré al detectar dos segundos de silencio.':state.recognitionMode==='manual'?'Escuchando dictado.':'Escucha ambiental activa: di «Hola Zuzu».','ok');
    };
    rec.onresult = function(ev){
      for(var i=ev.resultIndex;i<ev.results.length;i++){
        var picked=bestRecognitionAlternative(ev.results[i]),text=clean(picked.text);if(!text)continue;
        var isFinal=!!ev.results[i].isFinal;
        if(state.conversationMode)processConversationSpeech(text,isFinal,picked.confidence);
        else if(state.recognitionMode==='manual'){
          if(isFinal)appendFinalTranscript(text);else state.voiceInterim=text;updatePrompt(isFinal?'':text);
        }else processAmbientSpeech(text);
      }
    };
    rec.onerror = function(ev){
      state.recognitionStarting=false;var code=String(ev&&ev.error||'desconocido');
      if(code==='aborted'&&!state.wantListening)return;
      var fatal=/not-allowed|service-not-allowed|audio-capture|language-not-supported/.test(code);
      if(fatal)state.wantListening=false;setMicUi(state.wantListening&&!fatal);updateWakeBadge();setVoiceStatus(recognitionErrorText(code),fatal?'err':'');
    };
    rec.onend = function(){
      state.recognitionStarting=false;resolveRecognitionEnd();
      if(state.wantListening&&(state.ambientEnabled||state.conversationMode||state.recognitionMode==='manual')){
        setMicUi(true);updateWakeBadge();setTimeout(function(){if(state.wantListening)startRecognitionEngine();},260);
      }else{setMicUi(false);updateWakeBadge();}
    };
    return rec;
  }
  function startRecognitionEngine(){
    if(!state.wantListening||state.recognitionStarting)return;if(!state.recognition)state.recognition=buildRecognition();if(!state.recognition)return;
    try{state.recognitionStarting=true;state.recognition.start();}
    catch(err){state.recognitionStarting=false;if(/already started|start/i.test(String(err&&err.message||''))){setMicUi(true);return;}setMicUi(false);updateWakeBadge();}
  }
  function startAmbientListening(fromGesture){
    if(!supportsRecognition()){updateWakeBadge();return;}
    state.ambientEnabled=true;safeSet(STORAGE.ambientWake,'1');if(!state.conversationMode)state.recognitionMode='ambient';state.wantListening=true;updateWakeBadge();
    if(fromGesture)ensureRecorderStream();startRecognitionEngine();
  }
  function stopAmbientListening(){
    state.ambientEnabled=false;safeSet(STORAGE.ambientWake,'0');state.wantListening=false;state.recognitionStarting=false;try{state.recognition&&state.recognition.stop();}catch(_){try{state.recognition&&state.recognition.abort();}catch(__){ }}setMicUi(false);updateWakeBadge();setVoiceStatus('Escucha ambiental pausada.','');
  }
  function startListening(){
    if(!supportsRecognition()){setVoiceStatus('Este navegador no ofrece dictado web. Usa Chrome/Edge o el micrófono del teclado.','err');return;}
    stopSpeaking(false);var p=promptEl();state.baseText=clean(p&&p.value);state.finalText='';state.finalSegments=[];state.recognitionMode='manual';state.wantListening=true;setMicUi(true);ensureRecorderStream();startRecognitionEngine();
  }
  function stopListening(message){
    if(state.conversationMode){state.wantListening=state.ambientEnabled;state.recognitionMode='ambient';}
    else{state.wantListening=false;state.recognitionMode='ambient';}
    state.recognitionStarting=false;try{if(state.recognition)state.recognition.stop();}catch(_){try{state.recognition&&state.recognition.abort();}catch(__){ }}setMicUi(false);updateWakeBadge();if(message!==false)setVoiceStatus('Micrófono detenido.','');
  }
  function toggleListening(){
    if(state.conversationMode){setVoiceStatus('La conversación oral ya está escuchando. Di «Adiós, Zuzu» para finalizar.','ok');return;}
    if(state.wantListening&&state.recognitionMode==='manual'){state.recognitionMode='ambient';state.baseText='';state.finalText='';state.finalSegments=[];setVoiceStatus('Escucha ambiental activa. Di «Hola Zuzu».','ok');updateWakeBadge();}
    else startListening();
  }

  /* ---------- Conversión de cifras a lenguaje hablado ---------- */
  var UNITS = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
  var TENS = ['', '', 'veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
  var HUNDREDS = ['', 'ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];
  function underThousand(n){
    n = Math.floor(Math.abs(n));
    if(n < 30) return UNITS[n];
    if(n < 100){ var t = Math.floor(n/10), r=n%10; return r ? TENS[t]+' y '+UNITS[r] : TENS[t]; }
    if(n === 100) return 'cien';
    var h = Math.floor(n/100), rest=n%100;
    return rest ? HUNDREDS[h]+' '+underThousand(rest) : HUNDREDS[h];
  }
  function apocopate(value){ return String(value).replace(/veintiuno$/,'veintiún').replace(/ y uno$/,' y un').replace(/uno$/,'un'); }
  function integerWords(value, apocope){
    var n = Math.round(Number(value));
    if(!isFinite(n)) return String(value);
    if(n < 0) return 'menos '+integerWords(-n, apocope);
    if(n < 1000){ var a=underThousand(n); return apocope ? apocopate(a) : a; }
    if(n < 1000000){
      var th=Math.floor(n/1000), rest=n%1000;
      var prefix=th===1?'mil':integerWords(th,true)+' mil';
      return rest ? prefix+' '+integerWords(rest, apocope) : prefix;
    }
    if(n < 1000000000000){
      var millions=Math.floor(n/1000000), rem=n%1000000;
      var mp=millions===1?'un millón':integerWords(millions,true)+' millones';
      return rem ? mp+' '+integerWords(rem, apocope) : mp;
    }
    return String(n);
  }
  function parseLocalizedNumber(raw){
    var s=String(raw||'').replace(/\u00a0/g,' ').replace(/\s/g,'').trim();
    var negative=false;
    if(s.charAt(0)==='-'){ negative=true; s=s.slice(1); }
    else if(s.charAt(0)==='+'){ s=s.slice(1); }
    s=s.replace(/(?:€|euros?)$/i,'');
    var comma=s.lastIndexOf(','), dot=s.lastIndexOf('.'), decimal='';
    if(comma>=0 && dot>=0){
      decimal=comma>dot?',':'.';
    }else if(comma>=0){
      var cd=s.length-comma-1;
      decimal=(cd>0 && cd<=2)?',':'';
    }else if(dot>=0){
      var dd=s.length-dot-1;
      decimal=(dd>0 && dd<=2)?'.':'';
    }
    var normalized;
    if(decimal){
      var idx=s.lastIndexOf(decimal);
      normalized=s.slice(0,idx).replace(/[.,]/g,'')+'.'+s.slice(idx+1).replace(/[.,]/g,'');
    }else normalized=s.replace(/[.,]/g,'');
    var n=Number(normalized);
    return isFinite(n) ? (negative?-n:n) : NaN;
  }
  function moneyWords(raw){
    var n=parseLocalizedNumber(raw);
    if(!isFinite(n)) return raw+' euros';
    var negative=n<0; n=Math.abs(n);
    var euros=Math.floor(n+1e-8), cents=Math.round((n-euros)*100);
    if(cents===100){ euros++; cents=0; }
    var out=(euros===1?'un euro':integerWords(euros,true)+' euros');
    if(cents) out+=' con '+(cents===1?'un céntimo':integerWords(cents,true)+' céntimos');
    return (negative?'menos ':'')+out;
  }
  function percentWords(raw){
    var n=parseLocalizedNumber(raw);
    if(!isFinite(n)) return raw+' por ciento';
    var negative=n<0; n=Math.abs(n);
    var whole=Math.floor(n), decimals=Math.round((n-whole)*100);
    var out=integerWords(whole,false);
    if(decimals){
      var decimalRaw=String(raw).replace(/.*[.,]/,'').replace(/\D/g,'').slice(0,2);
      if(decimalRaw.charAt(0)==='0') out+=' coma cero '+integerWords(Number(decimalRaw.charAt(1)||0),false);
      else out+=' coma '+integerWords(Number(decimalRaw),false);
    }
    return (negative?'menos ':'')+out+' por ciento';
  }
  function genericNumberWords(raw){
    var s=String(raw||'');
    var n=parseLocalizedNumber(s);
    if(!isFinite(n)) return s;
    var negative=n<0; n=Math.abs(n);
    var whole=Math.floor(n);
    var out=integerWords(whole,false);
    if(/[.,]/.test(s)){
      var decimals=s.split(/[.,]/).pop().replace(/\D/g,'');
      if(decimals){
        if(decimals.length>1 && decimals.charAt(0)==='0') out+=' coma '+decimals.split('').map(function(d){return integerWords(Number(d),false);}).join(' ');
        else out+=' coma '+integerWords(Number(decimals),false);
      }
    }
    return (negative?'menos ':'')+out;
  }
  function prepareSpeechText(value){
    var s=String(value==null?'':value);
    s=s.replace(/\u00a0/g,' ').replace(/[•▪◦]/g,'. ').replace(/[|]+/g,', ');
    // v2.0_exp · Los marcadores Markdown se conservan en pantalla/PDF, pero no deben pronunciarse.
    s=s.replace(/\*+/g,' ').replace(/(^|\s)#{1,6}(?=\s)/g,'$1').replace(/[`_~]+/g,' ');
    s=s.replace(/\bPte\.?\s*Compra\b/gi,'pendiente de compra');
    // v2.0_exp · Voz: el TTS de algunos navegadores pronuncia mal «línea/líneas».
    // Solo cambiamos el texto enviado a voz; no alteramos los datos ni lo que se muestra en pantalla.
    s=s.replace(/\bl[ií]neas?\s+de\s+compra\b/gi,function(m){return /^l[ií]nea\b/i.test(m)?'registro de compra':'registros de compra';});
    s=s.replace(/\bl[ií]neas?\s+de\s+gesti[oó]n\b/gi,function(m){return /^l[ií]nea\b/i.test(m)?'tarea de gestión':'tareas de gestión';});
    s=s.replace(/\bl[ií]nea\b/gi,'registro').replace(/\bl[ií]neas\b/gi,'registros');
    s=s.replace(/\bGASTOS\s+CORRIENTES\b/gi,'gastos corrientes');
    s=s.replace(/\bTK\s*0*(\d+)\b/gi,function(_,n){return 'ticket '+integerWords(Number(n),false);});
    s=s.replace(/\bTKxx\b/gi,'tickets realizados');
    s=s.replace(/\bSySA\s*(\d{4})?\b/gi,function(_,year){return 'Santiago y Santa Ana'+(year?' '+integerWords(Number(year),false):'');});
    s=s.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,function(_,d,m,y){
      var months=['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      return integerWords(Number(d),false)+' de '+(months[Number(m)]||integerWords(Number(m),false))+' de '+integerWords(Number(y),false);
    });
    s=s.replace(/\b(\d{1,2}):(\d{2})\b/g,function(_,h,m){var hw=integerWords(Number(h),false).replace(/veintiuno$/,'veintiuna').replace(/ y uno$/,' y una').replace(/uno$/,'una'); return hw+' horas'+(Number(m)?' y '+integerWords(Number(m),false)+' minutos':'');});
    s=s.replace(/(-?(?:\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?))\s*(?:€|euros?)/gi,function(_,n){return moneyWords(n);});
    s=s.replace(/(-?\d[\d.\s]*(?:,\d{1,2})?|-?\d+(?:\.\d{1,2})?)\s*%/g,function(_,n){return percentWords(n);});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:°\s*C|º\s*C)\b/gi,function(_,n){return genericNumberWords(n)+' grados centígrados';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*km\s*\/\s*h\b/gi,function(_,n){return genericNumberWords(n)+' kilómetros por hora';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(kg|kilos?)\b/gi,function(_,n){return genericNumberWords(n)+' kilogramos';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:cl|centilitros?)\b/gi,function(_,n){return genericNumberWords(n)+' centilitros';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:ml|mililitros?)\b/gi,function(_,n){return genericNumberWords(n)+' mililitros';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:l|litros?)\b/gi,function(_,n){return genericNumberWords(n)+' litros';});
    // Concordancia antes de convertir los números restantes a palabras.
    s=s.replace(/\b1\s+(registro(?: de compra)?|evento|ticket|hito|producto|documento|ingreso)\b/gi,'un $1');
    s=s.replace(/\b1\s+(tarea(?: LG| de gestión)?|persona|compra|donación|llamada)\b/gi,'una $1');
    s=s.replace(/\b-?\d+(?:[.,]\d+)?\b/g,function(n){return genericNumberWords(n);});
    s=s.replace(/\s+\/\s+/g,', ').replace(/\s*·\s*/g,'. ');
    s=s.replace(/\bPDF\b/g,'pe de efe').replace(/\bIA\b/g,'inteligencia artificial').replace(/\bBIZUM\b/g,'bízum');
    s=s.replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g,'$1 ');
    return clean(s);
  }

  function welcomePromptText(){
    var prompt=$('ceAiPrompt');
    if(!prompt || prompt.getAttribute('data-ce-zuzu-welcome')!=='1') return '';
    return clean(prompt.value||prompt.textContent||'');
  }
  function visibleAnswerText(){
    var welcome=welcomePromptText(); if(welcome) return welcome;
    var result = $('ceAiResult');
    if(!result) return '';
    var cards = qa('.ce-ai-card', result).filter(function(card){
      return !card.classList.contains('ce-ai-trace') && !card.classList.contains('ce-ai-loading') && !card.classList.contains('ce-ai-files-card');
    });
    for(var i=0;i<cards.length;i++){
      var answer=q('.ce-ai-answer',cards[i]);
      var text=clean(answer && answer.innerText);
      if(!text || /escribe una pregunta|zuzu est[aá] pensando/i.test(text)) continue;
      var heading=clean((q('h3',cards[i])||{}).innerText);
      var spoken=state.conversationMode?text:joinText(heading,text);
      if(spoken.length>6200){
        var cut=spoken.slice(0,5700);
        var last=Math.max(cut.lastIndexOf('. '),cut.lastIndexOf('! '),cut.lastIndexOf('? '));
        if(last>3600) cut=cut.slice(0,last+1);
        spoken=cut+' El resto del detalle queda disponible en pantalla y en el PDF.';
      }
      return spoken;
    }
    return '';
  }
  function splitSpeech(text, maxLength){
    var src=clean(text), limit=maxLength||3000;
    if(!src) return [];
    var sentences=src.match(/[^.!?;:]+[.!?;:]?|[^.!?;:]+$/g)||[src];
    var chunks=[],current='';
    sentences.forEach(function(sentence){
      sentence=clean(sentence); if(!sentence) return;
      if((current+' '+sentence).trim().length<=limit) current=joinText(current,sentence);
      else{
        if(current) chunks.push(current);
        while(sentence.length>limit){
          var part=sentence.slice(0,limit), cut=Math.max(part.lastIndexOf(', '),part.lastIndexOf(' '));
          if(cut<Math.floor(limit*.55)) cut=limit;
          chunks.push(clean(sentence.slice(0,cut)));
          sentence=clean(sentence.slice(cut));
        }
        current=sentence;
      }
    });
    if(current) chunks.push(current);
    return chunks;
  }

  function selectedRate(){
    var raw=Number((($('ceVoz3Rate')||{}).value)||safeGet(STORAGE.rate,safeGet('ce_zuzu_voz2_rate','0.92')));
    return isFinite(raw)&&raw>=0.75&&raw<=1.25?raw:0.92;
  }
  function selectedMode(){
    var value=(($('ceVoz3VoiceMode')||{}).value)||safeGet(STORAGE.voiceMode,safeGet('ce_zuzu_voz2_voice_mode','female'));
    return value==='male'?'male':'female';
  }
  function voiceId(v){ return String((v&&v.voiceURI)||'')+'¦'+String((v&&v.name)||'')+'¦'+String((v&&v.lang)||''); }
  function spanishVoices(){
    if(!supportsDeviceSpeech()) return [];
    var all=state.voices&&state.voices.length?state.voices:(window.speechSynthesis.getVoices?window.speechSynthesis.getVoices():[]);
    var es=all.filter(function(v){return /^es(?:-|_)/i.test(String(v.lang||''));});
    return es.length?es:all;
  }
  function genderHint(v){
    var text=(String(v&&v.name||'')+' '+String(v&&v.voiceURI||'')).toLowerCase();
    if(/m[oó]nica|helena|elvira|paulina|sabina|conchita|luciana|marisol|carmen|soledad|isabel|laura|alba|dalia|paloma|female|mujer|woman|es-es-x-eef|es-us-x-esf/.test(text)) return 'female';
    if(/jorge|[aá]lvaro|pablo|ra[uú]l|diego|juan|mateo|enrique|antonio|carlos|male|hombre|man|es-es-x-eed|es-us-x-esd/.test(text)) return 'male';
    return '';
  }
  function voiceScore(v, mode){
    var name=String(v&&v.name||'').toLowerCase(), uri=String(v&&v.voiceURI||'').toLowerCase(), lang=String(v&&v.lang||'').toLowerCase(), text=name+' '+uri, n=0;
    if(lang==='es-es'||lang==='es_es') n+=130;
    else if(lang.indexOf('es-')===0||lang.indexOf('es_')===0) n+=80;
    else n-=120;
    if(/natural|neural|premium|enhanced|mejorada|online|siri/.test(text)) n+=75;
    if(/microsoft|google|apple|siri/.test(text)) n+=28;
    if(/compact|espeak|festival|mbrola/.test(text)) n-=80;
    if(v&&v.default) n+=8;
    if(v&&v.localService===false) n+=12;
    var hint=genderHint(v);
    if(hint===mode) n+=70;
    else if(hint&&hint!==mode) n-=55;
    if(mode==='female'&&/m[oó]nica|elvira|helena|paulina|luciana|sabina/.test(text)) n+=35;
    if(mode==='male'&&/jorge|[aá]lvaro|pablo|ra[uú]l|diego|juan/.test(text)) n+=35;
    return n;
  }
  function sortedVoices(mode){
    return spanishVoices().slice().sort(function(a,b){
      var diff=voiceScore(b,mode)-voiceScore(a,mode);
      return diff||String(a.name||'').localeCompare(String(b.name||''),'es');
    });
  }
  function storageVoiceKey(mode){ return mode==='male'?STORAGE.maleVoice:STORAGE.femaleVoice; }
  function selectedVoiceId(){
    var choice=$('ceVoz3VoiceChoice');
    return choice?String(choice.value||'auto'):safeGet(storageVoiceKey(selectedMode()),'auto');
  }
  function selectedDeviceVoice(){
    var mode=selectedMode(), voices=sortedVoices(mode);
    if(!voices.length) return null;
    var wanted=selectedVoiceId();
    if(wanted&&wanted!=='auto'){
      var found=voices.find(function(v){return voiceId(v)===wanted;});
      if(found) return found;
    }
    return voices[0]||null;
  }
  function voiceLabel(v){
    if(!v) return 'Voz española del dispositivo';
    var label=clean(v.name)||'Voz española';
    var lang=clean(v.lang);
    return label+(lang?' · '+lang:'')+(v.localService===false?' · en línea':'');
  }
  function escapeHtml(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
  function populateVoiceChoices(){
    var choice=$('ceVoz3VoiceChoice'), badge=$('ceVoz3Engine'), note=$('ceVoz3Disclosure');
    if(!choice) return;
    var mode=selectedMode(), voices=sortedVoices(mode), preferred=voices[0]||null;
    var stored=safeGet(storageVoiceKey(mode),'auto');
    var html='<option value="auto">Automática'+(preferred?' · '+escapeHtml(clean(preferred.name)):'')+'</option>';
    voices.slice(0,40).forEach(function(v,index){
      var hint=genderHint(v), marker=index===0?'★ ':'';
      var extra=hint===mode?' · '+(mode==='male'?'masculina':'femenina'):hint?' · perfil contrario':'';
      html+='<option value="'+escapeHtml(voiceId(v))+'">'+marker+escapeHtml(voiceLabel(v)+extra)+'</option>';
    });
    choice.innerHTML=html;
    var valid=Array.prototype.some.call(choice.options,function(opt){return opt.value===stored;});
    choice.value=valid?stored:'auto';
    var selected=selectedDeviceVoice();
    state.selectedVoiceLabel=voiceLabel(selected);
    if(badge) badge.textContent=selected?'Gratis · '+clean(selected.name):'Voz local no disponible';
    if(note){
      if(selected) note.textContent='Se usará '+voiceLabel(selected)+'. La voz elegida se recuerda solo en este dispositivo.';
      else note.textContent='No aparece una voz española. Puedes instalar una desde los ajustes del dispositivo y pulsar Buscar voces.';
    }
  }
  function loadLocalVoices(force){
    if(!supportsDeviceSpeech()){
      state.voices=[];state.voicesLoaded=true;populateVoiceChoices();return;
    }
    var list=[];
    try{list=window.speechSynthesis.getVoices?window.speechSynthesis.getVoices():[];}catch(_){list=[];}
    if(list.length||force){state.voices=list;state.voicesLoaded=!!list.length;populateVoiceChoices();}
    if(list.length){state.voiceRetryCount=0;clearTimeout(state.voiceRetryTimer);return;}
    if(state.voiceRetryCount<5){
      state.voiceRetryCount++;
      clearTimeout(state.voiceRetryTimer);
      state.voiceRetryTimer=setTimeout(function(){loadLocalVoices(true);},700*state.voiceRetryCount);
    }
  }
  function platformHelpText(){
    var ua=String(navigator.userAgent||''), touch=Number(navigator.maxTouchPoints||0)>1;
    if(/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&touch)) return '<ol><li>Abre <b>Ajustes</b>.</li><li>Entra en <b>Accesibilidad</b> y después en <b>Contenido leído</b> o <b>Leer y hablar</b>.</li><li>Abre <b>Voces</b> → <b>Español</b> y descarga una voz de calidad mejorada.</li><li>Cierra y vuelve a abrir Safari o ControlEvent; después pulsa <b>Buscar voces</b>.</li></ol>';
    if(/Android/i.test(ua)) return '<ol><li>Abre <b>Ajustes</b>.</li><li>Busca <b>Salida de texto a voz</b> o <b>Síntesis de voz</b>.</li><li>Selecciona el motor de Google y descarga los datos de <b>Español (España)</b>.</li><li>Vuelve a ControlEvent y pulsa <b>Buscar voces</b>.</li></ol>';
    if(/Windows/i.test(ua)) return '<ol><li>Abre <b>Configuración de Windows</b>.</li><li>Entra en <b>Hora e idioma</b> → <b>Voz</b> o busca <b>Agregar voces</b>.</li><li>Instala una voz de <b>Español (España)</b>.</li><li>Reinicia Chrome o Edge y pulsa <b>Buscar voces</b>.</li></ol>';
    return '<p>Instala o activa una voz de español de mejor calidad en los ajustes de accesibilidad, idioma o síntesis de voz del dispositivo. Reinicia el navegador y pulsa <b>Buscar voces</b>.</p>';
  }
  function openVoiceHelp(){
    var old=$('ceVoz3HelpLayer');if(old)old.remove();
    var layer=document.createElement('div');layer.id='ceVoz3HelpLayer';layer.className='ce-voz3-help-layer';
    layer.innerHTML='<div class="ce-voz3-help-card" role="dialog" aria-modal="true" aria-label="Mejorar voz de Zuzu"><h3>Mejorar gratuitamente la voz de Zuzu</h3><p>ControlEvent usa las voces que ofrece este aparato. No requiere Azure, OpenAI, tarjetas ni claves.</p>'+platformHelpText()+'<p>Después podrás escoger la voz concreta en el desplegable y escucharla con <b>Probar voz</b>.</p><button type="button" id="ceVoz3HelpClose">Cerrar</button></div>';
    document.body.appendChild(layer);
    layer.addEventListener('click',function(ev){if(ev.target===layer||ev.target.id==='ceVoz3HelpClose')layer.remove();});
  }

  function updateSpeechButtons(){
    var pause=$('ceVoz3Pause'),resume=$('ceVoz3Resume'),stop=$('ceVoz3Stop');
    if(pause) pause.disabled=!state.speaking||state.paused;
    if(resume) resume.disabled=!state.speaking||!state.paused;
    if(stop) stop.disabled=!state.speaking;
  }
  function stopSpeaking(showMessage){
    state.stopRequested=true;
    state.currentUtterance=null;
    if(supportsDeviceSpeech()){ try{ window.speechSynthesis.cancel(); }catch(_){ } }
    state.speaking=false; state.paused=false; state.engine=''; state.speechChunks=[]; state.speechIndex=0;state.speechEchoUntil=Date.now()+700;
    updateSpeechButtons();
    setTimeout(function(){state.stopRequested=false;},80);
    if(showMessage!==false) setVoiceStatus('Lectura detenida.','');
  }

  function speechChunkLimit(){
    var ua=String(navigator.userAgent||'');
    var apple=/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/i.test(ua)&&Number(navigator.maxTouchPoints||0)>1);
    return apple?155:220;
  }
  function speakDeviceNext(){
    if(!state.speaking||state.engine!=='local'||state.paused) return;
    if(state.speechIndex>=state.speechChunks.length){
      state.speaking=false; state.paused=false; state.currentUtterance=null; updateSpeechButtons(); setVoiceStatus(state.conversationMode?'Te escucho. Puedes hablar cuando quieras.':'Lectura terminada.','ok'); return;
    }
    var spokenChunk=state.speechChunks[state.speechIndex];
    state.currentSpokenChunk=spokenChunk;
    state.recentSpokenChunks=(state.recentSpokenChunks||[]).concat([spokenChunk]).slice(-4);
    state.speechEchoUntil=Date.now()+500;
    var utter=new SpeechSynthesisUtterance(spokenChunk);
    var voice=selectedDeviceVoice();
    utter.lang=(voice&&voice.lang)||'es-ES'; utter.rate=selectedRate(); utter.pitch=1; utter.volume=1;
    if(voice) utter.voice=voice;
    state.currentUtterance=utter;
    utter.onstart=function(){
      if(!state.speaking||state.engine!=='local')return;
      setVoiceStatus('Zuzu está leyendo con '+(voice?clean(voice.name):'la voz del dispositivo')+'…','ok');
    };
    utter.onend=function(){
      state.speechEchoUntil=Date.now()+900;
      if(!state.speaking||state.engine!=='local'||state.stopRequested) return;
      state.currentUtterance=null; state.speechIndex++;
      setTimeout(speakDeviceNext,45);
    };
    utter.onerror=function(ev){
      if(state.stopRequested||!state.speaking) return;
      var code=String(ev&&ev.error||'');
      if(code==='canceled'||code==='interrupted') return;
      state.speaking=false; state.paused=false; state.currentUtterance=null; updateSpeechButtons();
      setVoiceStatus('La lectura se ha detenido'+(code?': '+code:'.'),'err');
    };
    try{ window.speechSynthesis.speak(utter); }
    catch(err){ state.speaking=false; updateSpeechButtons(); setVoiceStatus('No se pudo iniciar la lectura: '+clean(err&&err.message||err),'err'); }
  }
  function startDeviceSpeech(text){
    if(!supportsDeviceSpeech()){
      state.speaking=false; updateSpeechButtons(); setVoiceStatus('Este dispositivo no dispone de lectura por voz.','err'); return;
    }
    loadLocalVoices(false);
    state.engine='local'; state.lastSpokenText=clean(text); state.speechChunks=splitSpeech(text,speechChunkLimit()); state.speechIndex=0; state.speaking=true; state.paused=false; state.stopRequested=false;
    updateSpeechButtons();
    speakDeviceNext();
  }

  function speakText(rawText, isPreview){
    if(!state.conversationMode&&state.recognitionMode==='manual') stopListening(false); stopSpeaking(false);
    var text=prepareSpeechText(rawText);
    if(!text){ setVoiceStatus('Todavía no hay texto para leer.','err'); return; }
    if(!isPreview) state.lastReadSignature=clean(rawText).slice(0,500);
    startDeviceSpeech(text);
  }
  function speakResponse(){
    var text=visibleAnswerText();
    if(!text){ setVoiceStatus('Todavía no hay una respuesta de Zuzu para leer.','err'); return; }
    speakText(text,false);
  }
  function previewVoice(){
    speakText('Hola, soy Zuzu. El saldo actual es de 1.016,55 €, el 58,69 % está pendiente y el evento comienza el 24/07/2026.',true);
  }
  function pauseSpeaking(){
    if(!state.speaking||state.paused) return;
    try{
      if(state.engine==='local'&&supportsDeviceSpeech()) window.speechSynthesis.pause();
      state.paused=true; updateSpeechButtons(); setVoiceStatus('Lectura en pausa.','');
    }catch(_){ }
  }
  function resumeSpeaking(){
    if(!state.speaking||!state.paused) return;
    try{
      if(state.engine==='local'&&supportsDeviceSpeech()) window.speechSynthesis.resume();
      state.paused=false; updateSpeechButtons(); setVoiceStatus('Zuzu continúa leyendo…','ok');
    }catch(_){ }
  }

  function autoReadEnabled(){
    if(state.conversationMode)return true;
    var box=$('ceVoz3AutoRead');
    return box?!!box.checked:safeGet(STORAGE.autoRead,'1')!=='0';
  }
  function maybeAutoRead(){
    if(state.conversationMode&&state.queuedUtterance){
      var queued=state.queuedUtterance;state.queuedUtterance='';stopSpeaking(false);setTimeout(function(){submitVoiceUtterance(queued);},140);return;
    }
    if(!autoReadEnabled()) return;
    var text=visibleAnswerText(); if(!text) return;
    var signature=text.slice(0,500); if(signature===state.lastReadSignature) return;
    state.lastReadSignature=signature;
    setTimeout(function(){ if(document.getElementById('ceGeminiLibreOverlay')&&autoReadEnabled()) speakResponse(); },state.conversationMode?120:350);
  }

  function updateVoiceOptions(){
    loadLocalVoices(true);
  }

  function panelHtml(){
    var recognitionOk=supportsRecognition();
    var auto=safeGet(STORAGE.autoRead,safeGet('ce_zuzu_voz2_auto_read','1'))!=='0';
    var rate=safeGet(STORAGE.rate,safeGet('ce_zuzu_voz2_rate','0.92'));
    var oldMode=safeGet('ce_zuzu_voz2_voice_mode','female');
    var mode=safeGet(STORAGE.voiceMode,oldMode==='male'?'male':'female');
    if(mode!=='male') mode='female';
    return ''+
      '<div id="'+PANEL_ID+'" role="group" aria-label="Controles de voz de Zuzu">'+
        '<button type="button" id="ceVoz3Mic" class="ce-voz3-btn ce-voz3-mic" aria-pressed="false" title="Hablar / dictar la pregunta"'+(recognitionOk?'':' disabled')+'>🎙 Hablar</button>'+
        '<label class="ce-voz3-auto" title="Leer automáticamente cada respuesta"><input id="ceVoz3AutoRead" type="checkbox" '+(auto?'checked':'')+'> Auto</label>'+
        '<button type="button" id="ceVoz3Read" class="ce-voz3-btn" title="Leer la respuesta">🔊 Leer</button>'+
        '<button type="button" id="ceVoz3RecordDownload" class="ce-voz3-btn" title="Descargar la grabación de la conversación oral" disabled>⬇ Grabación</button>'+
        '<button type="button" id="ceVoz3Preview" class="ce-voz3-btn" title="Probar la voz elegida">▶ Prueba</button>'+
        '<button type="button" id="ceVoz3Pause" class="ce-voz3-btn" title="Pausar lectura" disabled>⏸</button>'+
        '<button type="button" id="ceVoz3Resume" class="ce-voz3-btn" title="Continuar lectura" disabled>▶</button>'+
        '<button type="button" id="ceVoz3Stop" class="ce-voz3-btn" title="Detener lectura" disabled>■</button>'+
        '<select id="ceVoz3VoiceMode" aria-label="Perfil de voz de Zuzu" title="Perfil de voz">'+
          '<option value="female"'+(mode==='female'?' selected':'')+'>♀ Femenina</option>'+
          '<option value="male"'+(mode==='male'?' selected':'')+'>♂ Masculina</option>'+
        '</select>'+
        '<select id="ceVoz3VoiceChoice" class="ce-voz3-voice-choice" aria-label="Voz concreta de Zuzu" title="Voz instalada"><option value="auto">Voz…</option></select>'+
        '<select id="ceVoz3Rate" aria-label="Velocidad de lectura" title="Velocidad">'+
          '<option value="0.82"'+(rate==='0.82'?' selected':'')+'>Lento</option>'+
          '<option value="0.92"'+(rate==='0.92'||rate==='0.96'?' selected':'')+'>Normal</option>'+
          '<option value="1.06"'+(rate==='1.06'||rate==='1.12'?' selected':'')+'>Rápido</option>'+
        '</select>'+
        '<button type="button" id="ceVoz3Refresh" class="ce-voz3-btn" title="Buscar voces instaladas">↻ Voz</button>'+
        '<button type="button" id="ceVoz3Help" class="ce-voz3-btn ce-voz3-help" title="Ayuda para mejorar la voz">ⓘ</button>'+
        '<span id="ceVoz3Engine" class="ce-voz3-engine">Voz local · 0 €</span>'+
        '<span id="ceVoz3Status" class="ce-voz3-status" title="Estado de voz">'+(recognitionOk?'Di «Hola Zuzu»':'Usa el micro del teclado')+'</span>'+
      '</div>';
  }

  function observeResponse(){
    if(state.resultObserver){try{state.resultObserver.disconnect();}catch(_){}}
    if(state.statusObserver){try{state.statusObserver.disconnect();}catch(_){}}
    var result=$('ceAiResult'),status=$('ceAiStatus');
    if(result&&window.MutationObserver){
      state.resultObserver=new MutationObserver(function(){
        var loading=q('.ce-ai-loading',result);
        if(!loading&&/respuesta generada/i.test(clean((status||{}).textContent))) maybeAutoRead();
      });
      state.resultObserver.observe(result,{childList:true,subtree:true,characterData:true});
    }
    if(status&&window.MutationObserver){
      state.statusObserver=new MutationObserver(function(){
        var txt=clean(status.textContent);
        if(/respuesta generada/i.test(txt)) maybeAutoRead();
        if(/error|rechazada/i.test(txt)) stopSpeaking(false);
      });
      state.statusObserver.observe(status,{childList:true,subtree:true,characterData:true,attributes:true});
    }
  }
  document.addEventListener('ce:zuzu-request-started',function(){state.requestInFlight=true;});
  document.addEventListener('ce:zuzu-request-error',function(){state.requestInFlight=false;});
  document.addEventListener('ce:zuzu-response-rendered',function(){
    state.requestInFlight=false;
    setTimeout(function(){ try{ maybeAutoRead(); }catch(_){ } },80);
  });

  function bindPanel(){
    var mic=$('ceVoz3Mic'); if(mic) mic.addEventListener('click',toggleListening);
    var read=$('ceVoz3Read'); if(read) read.addEventListener('click',speakResponse);
    var recDownload=$('ceVoz3RecordDownload'); if(recDownload) recDownload.addEventListener('click',downloadConversationRecording);
    var preview=$('ceVoz3Preview'); if(preview) preview.addEventListener('click',previewVoice);
    var pause=$('ceVoz3Pause'); if(pause) pause.addEventListener('click',pauseSpeaking);
    var resume=$('ceVoz3Resume'); if(resume) resume.addEventListener('click',resumeSpeaking);
    var stop=$('ceVoz3Stop'); if(stop) stop.addEventListener('click',function(){stopSpeaking(true);});
    var auto=$('ceVoz3AutoRead'); if(auto) auto.addEventListener('change',function(){safeSet(STORAGE.autoRead,auto.checked?'1':'0');});
    var voice=$('ceVoz3VoiceMode'); if(voice) voice.addEventListener('change',function(){safeSet(STORAGE.voiceMode,voice.value||'female');stopSpeaking(false);populateVoiceChoices();});
    var choice=$('ceVoz3VoiceChoice'); if(choice) choice.addEventListener('change',function(){safeSet(storageVoiceKey(selectedMode()),choice.value||'auto');stopSpeaking(false);populateVoiceChoices();});
    var rate=$('ceVoz3Rate'); if(rate) rate.addEventListener('change',function(){safeSet(STORAGE.rate,rate.value||'0.92');});
    var refresh=$('ceVoz3Refresh'); if(refresh) refresh.addEventListener('click',function(){loadLocalVoices(true);setVoiceStatus('Lista de voces actualizada. Pulsa Probar voz.','ok');});
    var help=$('ceVoz3Help'); if(help) help.addEventListener('click',openVoiceHelp);
    updateSpeechButtons(); updateRecordButton(); observeResponse(); loadLocalVoices(true);
  }
  function injectPanel(){
    var overlay=$('ceGeminiLibreOverlay');
    if(!overlay||$(PANEL_ID)) return false;
    injectStyle();
    var prompt=q('.ce-ai-prompt',overlay),toolbar=q('.ce-ai-toolbar',overlay),pdf=$('ceAiDownloadResult');
    if(!prompt||!toolbar) return false;
    if(pdf) pdf.insertAdjacentHTML('afterend',panelHtml()); else toolbar.insertAdjacentHTML('beforeend',panelHtml());
    bindPanel(); return true;
  }
  function cleanupWhenClosed(){
    if($('ceGeminiLibreOverlay')) return;
    if(!state.conversationMode) stopSpeaking(false); state.lastReadSignature='';
    if(state.resultObserver){try{state.resultObserver.disconnect();}catch(_){}state.resultObserver=null;}
    if(state.statusObserver){try{state.statusObserver.disconnect();}catch(_){}state.statusObserver=null;}
    updateWakeBadge();
  }

  document.addEventListener('click',function(ev){
    var target=ev&&ev.target;
    var runButton=target&&target.closest&&target.closest('#ceAiRun');
    if(runButton){
      if(state.conversationMode){
        state.lastReadSignature='';
        // En conversación oral el micro NO se cierra al enviar: así el usuario puede interrumpir a Zuzu.
      }else if(state.submitBypass){
        state.submitBypass=false;
        stopSpeaking(false);state.lastReadSignature='';setVoiceStatus('','');
      }else if(state.wantListening&&state.recognitionMode==='ambient'){
        // La escucha «Hola Zuzu» es global y no debe apagarse por una consulta escrita.
        stopSpeaking(false);state.lastReadSignature='';
      }else if(state.wantListening || state.recognitionStarting){
        ev.preventDefault(); ev.stopPropagation();
        try{ev.stopImmediatePropagation();}catch(_){}
        setVoiceStatus('Cerrando el dictado antes de enviar…','');
        stopListeningAndWait(850).then(function(){
          state.submitBypass=true;
          setVoiceStatus('','');
          runButton.click();
          setTimeout(function(){if(state.ambientEnabled&&!state.conversationMode)startAmbientListening(false);},180);
        });
      }else{
        stopListening(false);stopSpeaking(false);state.lastReadSignature='';setVoiceStatus('','');
      }
    }
    if(target&&target.closest&&target.closest('#ceAiClear')){
      if(!state.conversationMode) stopListening(false);stopSpeaking(false);state.lastReadSignature='';setVoiceStatus(state.conversationMode?'Te escucho.':'Campo limpio.','');
    }
    if(target&&target.closest&&target.closest('#ceAiDownloadResult')&&state.conversationMode){endVoiceConversation('pdf');}
    if(target&&target.closest&&target.closest('#ceAiClose')){if(!state.conversationMode)stopSpeaking(false);}
  },true);

  function install(){
    injectStyle();injectPanel();injectWakeBadge();state.ambientEnabled=safeGet(STORAGE.ambientWake,'1')!=='0';
    if(supportsDeviceSpeech()){
      try{window.speechSynthesis.onvoiceschanged=function(){loadLocalVoices(true);};}catch(_){}
      loadLocalVoices(true);
      setTimeout(function(){loadLocalVoices(true);},300);
      setTimeout(function(){loadLocalVoices(true);},1200);
    }
    if(state.ambientEnabled){
      setTimeout(function(){if(state.ambientEnabled&&!state.wantListening)startAmbientListening(false);},650);
      // Si el navegador exige gesto de usuario, el primer clic vuelve a intentarlo y obtiene el permiso.
      document.addEventListener('click',function ambientGestureArm(){
        if(!state.ambientEnabled||state.wantListening)return;
        ensureRecorderStream();startAmbientListening(true);
      },true);
    }
    if(window.MutationObserver){
      state.modalObserver=new MutationObserver(function(){if($('ceGeminiLibreOverlay'))injectPanel();else cleanupWhenClosed();});
      state.modalObserver.observe(document.documentElement,{childList:true,subtree:true});
    }
    window.addEventListener('beforeunload',function(){stopListening(false);stopSpeaking(false);try{if(state.mediaRecorder&&state.recordingActive)state.mediaRecorder.stop();}catch(_){}try{if(state.recorderStream)state.recorderStream.getTracks().forEach(function(t){t.stop();});}catch(_){}});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();

  window.ControlEventV22Voz4={
    version:BUILD,
    startListening:startListening,
    stopListening:stopListening,
    speakResponse:speakResponse,
    previewVoice:previewVoice,
    stopSpeaking:stopSpeaking,
    prepareSpeechText:prepareSpeechText,
    supportsRecognition:supportsRecognition,
    supportsDeviceSpeech:supportsDeviceSpeech,
    maybeAutoRead:maybeAutoRead,
    refreshVoices:loadLocalVoices,
    selectedDeviceVoice:selectedDeviceVoice,
    isConversationalMode:function(){return !!state.conversationMode;},
    startAmbientListening:startAmbientListening,
    endVoiceConversation:endVoiceConversation,
    downloadConversationRecording:downloadConversationRecording
  };
  window.ControlEventV22Voz3=window.ControlEventV22Voz4;
})();
