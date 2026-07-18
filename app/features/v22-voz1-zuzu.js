/* ControlEvent v22_prod · VOZ1
   Capa de voz independiente para Zuzu.
   - Dictado con SpeechRecognition/webkitSpeechRecognition.
   - Micrófono abierto hasta que el usuario lo detiene.
   - Lectura de la respuesta con speechSynthesis.
   - No modifica el planificador, consultas, cálculos, tablas ni PDF de Zuzu. */
(function(){
  'use strict';
  if(window.__ceV22Voz1Zuzu) return;
  window.__ceV22Voz1Zuzu = true;

  var BUILD = 'v22_prod_voz1';
  var STYLE_ID = 'ceV22Voz1Style';
  var PANEL_ID = 'ceV22Voz1Panel';
  var STORAGE = {
    autoRead: 'ce_zuzu_voz1_auto_read',
    voiceUri: 'ce_zuzu_voz1_voice_uri',
    rate: 'ce_zuzu_voz1_rate'
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
    lastReadSignature: '',
    modalObserver: null,
    resultObserver: null,
    statusObserver: null
  };

  function $(id){ return document.getElementById(id); }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function joinText(){
    return Array.prototype.slice.call(arguments).map(clean).filter(Boolean).join(' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  }
  function safeGet(key, fallback){
    try{
      var value = localStorage.getItem(key);
      return value == null ? fallback : value;
    }catch(_){ return fallback; }
  }
  function safeSet(key, value){ try{ localStorage.setItem(key, String(value)); }catch(_){ } }
  function supportsRecognition(){ return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
  function supportsSpeech(){ return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); }

  function injectStyle(){
    if($(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = '\n'+
      '#'+PANEL_ID+'{margin-top:10px;border:1px solid #fdba74;background:linear-gradient(180deg,#fff7ed,#fff);border-radius:14px;padding:10px 11px;display:grid;gap:8px;color:#0f172a}\n'+
      '#'+PANEL_ID+' .ce-voz1-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n'+
      '#'+PANEL_ID+' .ce-voz1-btn{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:11px;padding:8px 11px;font-weight:850;cursor:pointer;min-height:38px;line-height:1}\n'+
      '#'+PANEL_ID+' .ce-voz1-btn:hover{background:#f8fafc}\n'+
      '#'+PANEL_ID+' .ce-voz1-btn:disabled{opacity:.45;cursor:not-allowed}\n'+
      '#'+PANEL_ID+' .ce-voz1-mic{border-color:#fb923c;background:#fff7ed;color:#9a3412;min-width:126px}\n'+
      '#'+PANEL_ID+' .ce-voz1-mic.is-listening{background:#dc2626;color:#fff;border-color:#b91c1c;box-shadow:0 0 0 5px rgba(220,38,38,.14);animation:ceVoz1Pulse 1.25s infinite}\n'+
      '#'+PANEL_ID+' .ce-voz1-status{font-size:12px;font-weight:800;color:#475569;flex:1 1 190px;min-width:140px}\n'+
      '#'+PANEL_ID+' .ce-voz1-status.ok{color:#15803d}\n'+
      '#'+PANEL_ID+' .ce-voz1-status.err{color:#b91c1c}\n'+
      '#'+PANEL_ID+' .ce-voz1-auto{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:850;white-space:nowrap}\n'+
      '#'+PANEL_ID+' .ce-voz1-auto input{width:17px;height:17px;accent-color:#f97316}\n'+
      '#'+PANEL_ID+' .ce-voz1-label{font-size:11px;font-weight:900;color:#64748b}\n'+
      '#'+PANEL_ID+' select{border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:7px 8px;max-width:260px;font-weight:700;color:#0f172a}\n'+
      '#'+PANEL_ID+' .ce-voz1-note{font-size:11px;color:#64748b;line-height:1.25}\n'+
      '@keyframes ceVoz1Pulse{0%,100%{box-shadow:0 0 0 4px rgba(220,38,38,.12)}50%{box-shadow:0 0 0 9px rgba(220,38,38,.04)}}\n'+
      '@media(max-width:760px){#'+PANEL_ID+'{padding:9px}#'+PANEL_ID+' .ce-voz1-row{align-items:stretch}#'+PANEL_ID+' .ce-voz1-btn{flex:1 1 auto}#'+PANEL_ID+' .ce-voz1-status{flex-basis:100%}#'+PANEL_ID+' select{max-width:100%;flex:1 1 150px}}\n';
    document.head.appendChild(st);
  }

  function setVoiceStatus(message, kind){
    var el = $('ceVoz1Status');
    if(!el) return;
    el.className = 'ce-voz1-status' + (kind ? ' '+kind : '');
    el.textContent = message || '';
  }
  function setMicUi(listening){
    var btn = $('ceVoz1Mic');
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
    try{
      el.dispatchEvent(new Event('change', {bubbles:false}));
      el.setSelectionRange(value.length, value.length);
    }catch(_){ }
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

  function buildRecognition(){
    var Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!Ctor) return null;
    var rec = new Ctor();
    rec.lang = 'es-ES';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onstart = function(){
      state.recognitionStarting = false;
      setMicUi(true);
      setVoiceStatus('Escuchando. El micrófono seguirá abierto hasta que pulses Detener.', 'ok');
    };
    rec.onresult = function(ev){
      var interim = '';
      for(var i=ev.resultIndex; i<ev.results.length; i++){
        var text = clean(ev.results[i] && ev.results[i][0] && ev.results[i][0].transcript);
        if(!text) continue;
        if(ev.results[i].isFinal) state.finalText = joinText(state.finalText, text);
        else interim = joinText(interim, text);
      }
      updatePrompt(interim);
      if(interim) setVoiceStatus('Escuchando: '+interim, 'ok');
      else setVoiceStatus('Escuchando. Puedes seguir hablando o pulsar Detener.', 'ok');
    };
    rec.onerror = function(ev){
      state.recognitionStarting = false;
      var code = String(ev && ev.error || 'desconocido');
      if(code === 'aborted' && !state.wantListening) return;
      var fatal = /not-allowed|service-not-allowed|audio-capture|network|language-not-supported/.test(code);
      if(fatal) state.wantListening = false;
      setMicUi(state.wantListening && !fatal);
      setVoiceStatus(recognitionErrorText(code), fatal ? 'err' : '');
    };
    rec.onend = function(){
      state.recognitionStarting = false;
      if(state.wantListening && document.getElementById('ceGeminiLibreOverlay')){
        setMicUi(true);
        setVoiceStatus('Micrófono abierto. Reanudando la escucha…', 'ok');
        setTimeout(function(){ if(state.wantListening) startRecognitionEngine(); }, 260);
      }else{
        setMicUi(false);
        if(clean((promptEl() || {}).value)) setVoiceStatus('Pregunta preparada. Revísala y pulsa Zuzu.', 'ok');
        else setVoiceStatus('Micrófono detenido.', '');
      }
    };
    return rec;
  }

  function startRecognitionEngine(){
    if(!state.wantListening || state.recognitionStarting) return;
    if(!state.recognition) state.recognition = buildRecognition();
    if(!state.recognition) return;
    try{
      state.recognitionStarting = true;
      state.recognition.start();
    }catch(err){
      state.recognitionStarting = false;
      if(/already started|start/i.test(String(err && err.message || ''))){
        setMicUi(true);
        return;
      }
      state.wantListening = false;
      setMicUi(false);
      setVoiceStatus('No se pudo iniciar el micrófono: '+clean(err && err.message || err), 'err');
    }
  }

  function startListening(){
    if(!supportsRecognition()){
      setVoiceStatus('Este navegador no ofrece dictado web. Usa Chrome/Edge o el micrófono del teclado.', 'err');
      return;
    }
    stopSpeaking(false);
    var p = promptEl();
    state.baseText = clean(p && p.value);
    state.finalText = '';
    state.wantListening = true;
    setMicUi(true);
    setVoiceStatus('Solicitando acceso al micrófono…', '');
    startRecognitionEngine();
  }
  function stopListening(message){
    state.wantListening = false;
    state.recognitionStarting = false;
    setMicUi(false);
    try{ if(state.recognition) state.recognition.stop(); }catch(_){ try{ state.recognition && state.recognition.abort(); }catch(__){ } }
    if(message !== false){
      if(clean((promptEl() || {}).value)) setVoiceStatus('Pregunta preparada. Revísala y pulsa Zuzu.', 'ok');
      else setVoiceStatus('Micrófono detenido.', '');
    }
  }
  function toggleListening(){ if(state.wantListening) stopListening(); else startListening(); }

  function spanishVoices(){
    if(!supportsSpeech()) return [];
    var all = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    var es = all.filter(function(v){ return /^es(?:-|_)/i.test(String(v.lang || '')); });
    return es.length ? es : all;
  }
  function populateVoices(){
    var select = $('ceVoz1Voice');
    if(!select || !supportsSpeech()) return;
    var voices = spanishVoices();
    var chosen = safeGet(STORAGE.voiceUri, '');
    select.innerHTML = '';
    voices.forEach(function(v){
      var option = document.createElement('option');
      option.value = v.voiceURI || v.name;
      option.textContent = (v.name || 'Voz') + (v.lang ? ' · '+v.lang : '') + (v.default ? ' · predeterminada' : '');
      if(option.value === chosen) option.selected = true;
      select.appendChild(option);
    });
    if(!select.value && voices[0]) select.value = voices[0].voiceURI || voices[0].name;
  }
  function selectedVoice(){
    var wanted = (($('ceVoz1Voice') || {}).value) || safeGet(STORAGE.voiceUri, '');
    var voices = spanishVoices();
    return voices.find(function(v){ return (v.voiceURI || v.name) === wanted; }) || voices[0] || null;
  }
  function selectedRate(){
    var raw = Number((($('ceVoz1Rate') || {}).value) || safeGet(STORAGE.rate, '0.95'));
    return isFinite(raw) && raw >= 0.6 && raw <= 1.5 ? raw : 0.95;
  }

  function visibleAnswerText(){
    var result = $('ceAiResult');
    if(!result) return '';
    var cards = qa('.ce-ai-card', result).filter(function(card){
      return !card.classList.contains('ce-ai-trace') && !card.classList.contains('ce-ai-loading') && !card.classList.contains('ce-ai-files-card');
    });
    for(var i=0;i<cards.length;i++){
      var answer = q('.ce-ai-answer', cards[i]);
      var text = clean(answer && answer.innerText);
      if(!text || /escribe una pregunta|zuzu est[aá] pensando/i.test(text)) continue;
      var heading = clean((q('h3', cards[i]) || {}).innerText);
      var spoken = joinText(heading, text);
      if(spoken.length > 6000){
        var cut = spoken.slice(0, 5600);
        var last = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
        if(last > 3500) cut = cut.slice(0,last+1);
        spoken = cut + ' El resto del detalle queda disponible en pantalla y en el PDF.';
      }
      return spoken;
    }
    return '';
  }
  function splitSpeech(text){
    var src = clean(text);
    if(!src) return [];
    var sentences = src.match(/[^.!?;:]+[.!?;:]?|[^.!?;:]+$/g) || [src];
    var chunks = [], current = '';
    sentences.forEach(function(sentence){
      sentence = clean(sentence);
      if(!sentence) return;
      if((current+' '+sentence).trim().length <= 230) current = joinText(current, sentence);
      else{
        if(current) chunks.push(current);
        while(sentence.length > 230){
          var part = sentence.slice(0,230);
          var cut = Math.max(part.lastIndexOf(', '), part.lastIndexOf(' '));
          if(cut < 120) cut = 230;
          chunks.push(clean(sentence.slice(0,cut)));
          sentence = clean(sentence.slice(cut));
        }
        current = sentence;
      }
    });
    if(current) chunks.push(current);
    return chunks;
  }
  function updateSpeechButtons(){
    var pause = $('ceVoz1Pause'), resume = $('ceVoz1Resume'), stop = $('ceVoz1Stop');
    if(pause) pause.disabled = !state.speaking || state.paused;
    if(resume) resume.disabled = !state.speaking || !state.paused;
    if(stop) stop.disabled = !state.speaking;
  }
  function speakNext(){
    if(!state.speaking) return;
    if(state.speechIndex >= state.speechChunks.length){
      state.speaking = false;
      state.paused = false;
      updateSpeechButtons();
      setVoiceStatus('Lectura terminada.', 'ok');
      return;
    }
    var utter = new SpeechSynthesisUtterance(state.speechChunks[state.speechIndex]);
    utter.lang = 'es-ES';
    utter.rate = selectedRate();
    var voice = selectedVoice();
    if(voice) utter.voice = voice;
    utter.onend = function(){
      if(!state.speaking) return;
      state.speechIndex += 1;
      speakNext();
    };
    utter.onerror = function(ev){
      if(!state.speaking) return;
      state.speaking = false;
      state.paused = false;
      updateSpeechButtons();
      setVoiceStatus('La lectura se ha detenido'+(ev && ev.error ? ': '+ev.error : '.'), 'err');
    };
    try{
      window.speechSynthesis.speak(utter);
      setVoiceStatus('Zuzu está leyendo la respuesta…', 'ok');
    }catch(err){
      state.speaking = false;
      updateSpeechButtons();
      setVoiceStatus('No se pudo iniciar la lectura: '+clean(err && err.message || err), 'err');
    }
  }
  function speakResponse(){
    if(!supportsSpeech()){
      setVoiceStatus('La lectura por altavoz no está disponible en este navegador.', 'err');
      return;
    }
    stopListening(false);
    stopSpeaking(false);
    var text = visibleAnswerText();
    if(!text){
      setVoiceStatus('Todavía no hay una respuesta de Zuzu para leer.', 'err');
      return;
    }
    state.speechChunks = splitSpeech(text);
    state.speechIndex = 0;
    state.speaking = true;
    state.paused = false;
    state.lastReadSignature = text.slice(0,500);
    updateSpeechButtons();
    speakNext();
  }
  function pauseSpeaking(){
    if(!supportsSpeech() || !state.speaking || state.paused) return;
    try{ window.speechSynthesis.pause(); state.paused = true; updateSpeechButtons(); setVoiceStatus('Lectura en pausa.', ''); }catch(_){ }
  }
  function resumeSpeaking(){
    if(!supportsSpeech() || !state.speaking || !state.paused) return;
    try{ window.speechSynthesis.resume(); state.paused = false; updateSpeechButtons(); setVoiceStatus('Zuzu continúa leyendo…', 'ok'); }catch(_){ }
  }
  function stopSpeaking(showMessage){
    if(supportsSpeech()){
      try{ window.speechSynthesis.cancel(); }catch(_){ }
    }
    state.speaking = false;
    state.paused = false;
    state.speechChunks = [];
    state.speechIndex = 0;
    updateSpeechButtons();
    if(showMessage !== false) setVoiceStatus('Lectura detenida.', '');
  }

  function autoReadEnabled(){
    var box = $('ceVoz1AutoRead');
    return box ? !!box.checked : safeGet(STORAGE.autoRead, '1') !== '0';
  }
  function maybeAutoRead(){
    if(!autoReadEnabled() || !supportsSpeech()) return;
    var text = visibleAnswerText();
    if(!text) return;
    var signature = text.slice(0,500);
    if(signature === state.lastReadSignature) return;
    state.lastReadSignature = signature;
    setTimeout(function(){
      if(document.getElementById('ceGeminiLibreOverlay') && autoReadEnabled()) speakResponse();
    }, 320);
  }

  function panelHtml(){
    var recognitionOk = supportsRecognition();
    var speechOk = supportsSpeech();
    var auto = safeGet(STORAGE.autoRead, '1') !== '0';
    var rate = safeGet(STORAGE.rate, '0.95');
    return ''+
      '<div id="'+PANEL_ID+'" role="group" aria-label="Controles de voz de Zuzu">'+
        '<div class="ce-voz1-row">'+
          '<button type="button" id="ceVoz1Mic" class="ce-voz1-btn ce-voz1-mic" aria-pressed="false"'+(recognitionOk?'':' disabled')+'>🎙️ Hablar</button>'+
          '<span id="ceVoz1Status" class="ce-voz1-status">'+(recognitionOk?'Micrófono preparado.':'Dictado no disponible en este navegador.')+'</span>'+
          '<label class="ce-voz1-auto"><input id="ceVoz1AutoRead" type="checkbox" '+(auto?'checked':'')+' '+(speechOk?'':'disabled')+'> Leer respuesta automáticamente</label>'+
        '</div>'+
        '<div class="ce-voz1-row">'+
          '<button type="button" id="ceVoz1Read" class="ce-voz1-btn" '+(speechOk?'':'disabled')+'>🔊 Leer</button>'+
          '<button type="button" id="ceVoz1Pause" class="ce-voz1-btn" disabled>⏸ Pausa</button>'+
          '<button type="button" id="ceVoz1Resume" class="ce-voz1-btn" disabled>▶ Continuar</button>'+
          '<button type="button" id="ceVoz1Stop" class="ce-voz1-btn" disabled>⏹ Detener</button>'+
          '<span class="ce-voz1-label">Voz</span><select id="ceVoz1Voice" aria-label="Voz de lectura" '+(speechOk?'':'disabled')+'></select>'+
          '<span class="ce-voz1-label">Velocidad</span><select id="ceVoz1Rate" aria-label="Velocidad de lectura" '+(speechOk?'':'disabled')+'>'+
            '<option value="0.8"'+(rate==='0.8'?' selected':'')+'>Lenta</option>'+
            '<option value="0.95"'+(rate==='0.95'?' selected':'')+'>Normal</option>'+
            '<option value="1.15"'+(rate==='1.15'?' selected':'')+'>Rápida</option>'+
          '</select>'+
        '</div>'+
        '<div class="ce-voz1-note">El micrófono solo se abre al pulsar Hablar y permanece visible y activo hasta pulsar Detener. La pregunta queda escrita para revisarla antes de enviarla.</div>'+
      '</div>';
  }

  function observeResponse(){
    if(state.resultObserver){ try{ state.resultObserver.disconnect(); }catch(_){ } }
    if(state.statusObserver){ try{ state.statusObserver.disconnect(); }catch(_){ } }
    var result = $('ceAiResult');
    var status = $('ceAiStatus');
    if(result && window.MutationObserver){
      state.resultObserver = new MutationObserver(function(){
        var loading = q('.ce-ai-loading', result);
        if(!loading && /respuesta generada/i.test(clean((status || {}).textContent))) maybeAutoRead();
      });
      state.resultObserver.observe(result, {childList:true, subtree:true, characterData:true});
    }
    if(status && window.MutationObserver){
      state.statusObserver = new MutationObserver(function(){
        var txt = clean(status.textContent);
        if(/respuesta generada/i.test(txt)) maybeAutoRead();
        if(/error|rechazada/i.test(txt)) stopSpeaking(false);
      });
      state.statusObserver.observe(status, {childList:true, subtree:true, characterData:true, attributes:true});
    }
  }

  function bindPanel(){
    var mic = $('ceVoz1Mic');
    if(mic) mic.addEventListener('click', toggleListening);
    var read = $('ceVoz1Read');
    if(read) read.addEventListener('click', speakResponse);
    var pause = $('ceVoz1Pause');
    if(pause) pause.addEventListener('click', pauseSpeaking);
    var resume = $('ceVoz1Resume');
    if(resume) resume.addEventListener('click', resumeSpeaking);
    var stop = $('ceVoz1Stop');
    if(stop) stop.addEventListener('click', function(){ stopSpeaking(true); });
    var auto = $('ceVoz1AutoRead');
    if(auto) auto.addEventListener('change', function(){ safeSet(STORAGE.autoRead, auto.checked ? '1' : '0'); });
    var voice = $('ceVoz1Voice');
    if(voice) voice.addEventListener('change', function(){ safeSet(STORAGE.voiceUri, voice.value || ''); });
    var rate = $('ceVoz1Rate');
    if(rate) rate.addEventListener('change', function(){ safeSet(STORAGE.rate, rate.value || '0.95'); });
    populateVoices();
    updateSpeechButtons();
    observeResponse();
  }

  function injectPanel(){
    var overlay = $('ceGeminiLibreOverlay');
    if(!overlay || $(PANEL_ID)) return false;
    injectStyle();
    var prompt = q('.ce-ai-prompt', overlay);
    var toolbar = q('.ce-ai-toolbar', overlay);
    if(!prompt || !toolbar) return false;
    toolbar.insertAdjacentHTML('afterend', panelHtml());
    bindPanel();
    return true;
  }

  function cleanupWhenClosed(){
    if($('ceGeminiLibreOverlay')) return;
    stopListening(false);
    stopSpeaking(false);
    state.lastReadSignature = '';
    if(state.resultObserver){ try{ state.resultObserver.disconnect(); }catch(_){ } state.resultObserver=null; }
    if(state.statusObserver){ try{ state.statusObserver.disconnect(); }catch(_){ } state.statusObserver=null; }
  }

  document.addEventListener('click', function(ev){
    var target = ev && ev.target;
    if(target && target.closest && target.closest('#ceAiRun')){
      stopListening(false);
      stopSpeaking(false);
      state.lastReadSignature = '';
      setVoiceStatus('Pregunta enviada. Esperando la respuesta de Zuzu…', '');
    }
    if(target && target.closest && target.closest('#ceAiClear')){
      stopListening(false);
      stopSpeaking(false);
      state.lastReadSignature = '';
      setVoiceStatus('Campo limpio. Puedes volver a hablar.', '');
    }
    if(target && target.closest && target.closest('#ceAiClose')){
      stopListening(false);
      stopSpeaking(false);
    }
  }, true);

  function install(){
    injectStyle();
    injectPanel();
    if(supportsSpeech()){
      try{ window.speechSynthesis.onvoiceschanged = function(){ populateVoices(); }; }catch(_){ }
      setTimeout(populateVoices, 250);
      setTimeout(populateVoices, 1200);
    }
    if(window.MutationObserver){
      state.modalObserver = new MutationObserver(function(){
        if($('ceGeminiLibreOverlay')) injectPanel(); else cleanupWhenClosed();
      });
      state.modalObserver.observe(document.documentElement, {childList:true, subtree:true});
    }
    window.addEventListener('beforeunload', function(){ stopListening(false); stopSpeaking(false); });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();

  window.ControlEventV22Voz1 = {
    version: BUILD,
    startListening: startListening,
    stopListening: stopListening,
    speakResponse: speakResponse,
    stopSpeaking: stopSpeaking,
    supportsRecognition: supportsRecognition,
    supportsSpeech: supportsSpeech
  };
})();
