/* ControlEvent v22_prod · VOZ3 GRATIS
   Capa de voz independiente para Zuzu.
   - Conserva el dictado de voz de VOZ1/VOZ2.
   - Lee exclusivamente con las mejores voces españolas instaladas o expuestas por cada dispositivo.
   - No usa Azure, OpenAI ni ningún servicio TTS de pago; no necesita claves ni variables nuevas.
   - Permite perfil femenino/masculino, elección de voz concreta, prueba, pausa y lectura por bloques.
   - Prepara importes, porcentajes, fechas, horas, tickets, temperaturas y unidades para una lectura humana.
   - No modifica la inteligencia, consultas, cálculos, tablas ni PDF de Zuzu. */
(function(){
  'use strict';
  if(window.__ceV22Voz3Zuzu) return;
  window.__ceV22Voz3Zuzu = true;

  var BUILD = 'v22_prod_voz3';
  var STYLE_ID = 'ceV22Voz3Style';
  var PANEL_ID = 'ceV22Voz3Panel';
  var STORAGE = {
    autoRead: 'ce_zuzu_voz3_auto_read',
    voiceMode: 'ce_zuzu_voz3_voice_mode',
    rate: 'ce_zuzu_voz3_rate',
    femaleVoice: 'ce_zuzu_voz3_female_voice',
    maleVoice: 'ce_zuzu_voz3_male_voice'
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
    selectedVoiceLabel: ''
  };

  function $(id){ return document.getElementById(id); }
  function q(sel, root){ return (root || document).querySelector(sel); }
  function qa(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clean(v){ return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); }
  function joinText(){
    return Array.prototype.slice.call(arguments).map(clean).filter(Boolean).join(' ').replace(/\s+([,.;:!?])/g, '$1').trim();
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
      '#'+PANEL_ID+'{margin-top:10px;border:1px solid #fdba74;background:linear-gradient(180deg,#fff7ed,#fff);border-radius:14px;padding:10px 11px;display:grid;gap:8px;color:#0f172a}\n'+
      '#'+PANEL_ID+' .ce-voz3-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n'+
      '#'+PANEL_ID+' .ce-voz3-btn{border:1px solid #cbd5e1;background:#fff;color:#0f172a;border-radius:11px;padding:8px 11px;font-weight:850;cursor:pointer;min-height:38px;line-height:1}\n'+
      '#'+PANEL_ID+' .ce-voz3-btn:hover{background:#f8fafc}\n'+
      '#'+PANEL_ID+' .ce-voz3-btn:disabled{opacity:.45;cursor:not-allowed}\n'+
      '#'+PANEL_ID+' .ce-voz3-mic{border-color:#fb923c;background:#fff7ed;color:#9a3412;min-width:126px}\n'+
      '#'+PANEL_ID+' .ce-voz3-mic.is-listening{background:#dc2626;color:#fff;border-color:#b91c1c;box-shadow:0 0 0 5px rgba(220,38,38,.14);animation:ceVoz3Pulse 1.25s infinite}\n'+
      '#'+PANEL_ID+' .ce-voz3-status{font-size:12px;font-weight:800;color:#475569;flex:1 1 190px;min-width:140px}\n'+
      '#'+PANEL_ID+' .ce-voz3-status.ok{color:#15803d}\n'+
      '#'+PANEL_ID+' .ce-voz3-status.err{color:#b91c1c}\n'+
      '#'+PANEL_ID+' .ce-voz3-auto{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:850;white-space:nowrap}\n'+
      '#'+PANEL_ID+' .ce-voz3-auto input{width:17px;height:17px;accent-color:#f97316}\n'+
      '#'+PANEL_ID+' .ce-voz3-label{font-size:11px;font-weight:900;color:#64748b}\n'+
      '#'+PANEL_ID+' select{border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:7px 8px;max-width:270px;font-weight:750;color:#0f172a}\n'+
      '#'+PANEL_ID+' .ce-voz3-note{font-size:11px;color:#64748b;line-height:1.3}\n'+
      '#'+PANEL_ID+' .ce-voz3-engine{font-size:10px;font-weight:850;color:#0f766e;background:#ecfeff;border:1px solid #a5f3fc;border-radius:999px;padding:3px 7px}\n'+
      '#'+PANEL_ID+' .ce-voz3-voice-choice{min-width:210px;max-width:360px}\n'+
      '#'+PANEL_ID+' .ce-voz3-help{border-color:#bae6fd;background:#f0f9ff;color:#075985}\n'+
      '.ce-voz3-help-layer{position:fixed;inset:0;z-index:100005;background:rgba(15,23,42,.62);display:flex;align-items:center;justify-content:center;padding:18px}\n'+
      '.ce-voz3-help-card{width:min(620px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 24px 70px rgba(0,0,0,.28);padding:20px;color:#0f172a}\n'+
      '.ce-voz3-help-card h3{margin:0 0 10px;font-size:20px}.ce-voz3-help-card p{line-height:1.5;margin:8px 0}.ce-voz3-help-card ol{padding-left:22px;line-height:1.55}.ce-voz3-help-card button{margin-top:12px;border:0;border-radius:10px;padding:9px 14px;background:#0f172a;color:#fff;font-weight:850;cursor:pointer}\n'+
      '@keyframes ceVoz3Pulse{0%,100%{box-shadow:0 0 0 4px rgba(220,38,38,.12)}50%{box-shadow:0 0 0 9px rgba(220,38,38,.04)}}\n'+
      '@media(max-width:760px){#'+PANEL_ID+'{padding:9px}#'+PANEL_ID+' .ce-voz3-row{align-items:stretch}#'+PANEL_ID+' .ce-voz3-btn{flex:1 1 auto}#'+PANEL_ID+' .ce-voz3-status{flex-basis:100%}#'+PANEL_ID+' select{max-width:100%;flex:1 1 170px}}\n';
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
      setVoiceStatus(interim ? 'Escuchando: '+interim : 'Escuchando. Puedes seguir hablando o pulsar Detener.', 'ok');
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
    try{ state.recognitionStarting = true; state.recognition.start(); }
    catch(err){
      state.recognitionStarting = false;
      if(/already started|start/i.test(String(err && err.message || ''))){ setMicUi(true); return; }
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
    var s=String(raw||'').replace(/\s/g,'').trim();
    var negative=false;
    if(s.charAt(0)==='-'){ negative=true; s=s.slice(1); }
    var comma=s.lastIndexOf(','), dot=s.lastIndexOf('.'), decimal='';
    if(comma>=0 && dot>=0) decimal=comma>dot?',':'.';
    else if(comma>=0){ var cd=s.length-comma-1; decimal=(cd>0 && cd<=3)?',':''; }
    else if(dot>=0){ var dd=s.length-dot-1; decimal=(dd>0 && dd<=2)?'.':''; }
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
    s=s.replace(/\bPte\.?\s*Compra\b/gi,'pendiente de compra');
    s=s.replace(/\bGASTOS\s+CORRIENTES\b/gi,'gastos corrientes');
    s=s.replace(/\bTK\s*0*(\d+)\b/gi,function(_,n){return 'ticket '+integerWords(Number(n),false);});
    s=s.replace(/\bTKxx\b/gi,'tickets realizados');
    s=s.replace(/\bSySA\s*(\d{4})?\b/gi,function(_,year){return 'Santiago y Santa Ana'+(year?' '+integerWords(Number(year),false):'');});
    s=s.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g,function(_,d,m,y){
      var months=['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      return integerWords(Number(d),false)+' de '+(months[Number(m)]||integerWords(Number(m),false))+' de '+integerWords(Number(y),false);
    });
    s=s.replace(/\b(\d{1,2}):(\d{2})\b/g,function(_,h,m){var hw=integerWords(Number(h),false).replace(/veintiuno$/,'veintiuna').replace(/ y uno$/,' y una').replace(/uno$/,'una'); return hw+' horas'+(Number(m)?' y '+integerWords(Number(m),false)+' minutos':'');});
    s=s.replace(/(-?\d[\d.\s]*(?:,\d{1,2})?|-?\d+(?:\.\d{1,2})?)\s*€/g,function(_,n){return moneyWords(n);});
    s=s.replace(/(-?\d[\d.\s]*(?:,\d{1,2})?|-?\d+(?:\.\d{1,2})?)\s*%/g,function(_,n){return percentWords(n);});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:°\s*C|º\s*C)\b/gi,function(_,n){return genericNumberWords(n)+' grados centígrados';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*km\s*\/\s*h\b/gi,function(_,n){return genericNumberWords(n)+' kilómetros por hora';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(kg|kilos?)\b/gi,function(_,n){return genericNumberWords(n)+' kilogramos';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:cl|centilitros?)\b/gi,function(_,n){return genericNumberWords(n)+' centilitros';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:ml|mililitros?)\b/gi,function(_,n){return genericNumberWords(n)+' mililitros';});
    s=s.replace(/(-?\d+(?:[.,]\d+)?)\s*(?:l|litros?)\b/gi,function(_,n){return genericNumberWords(n)+' litros';});
    s=s.replace(/\b-?\d+(?:[.,]\d+)?\b/g,function(n){return genericNumberWords(n);});
    s=s.replace(/\s+\/\s+/g,', ').replace(/\s*·\s*/g,'. ');
    s=s.replace(/\bPDF\b/g,'pe de efe').replace(/\bIA\b/g,'inteligencia artificial').replace(/\bBIZUM\b/g,'bízum');
    s=s.replace(/\s+/g,' ').replace(/\s+([,.;:!?])/g,'$1').replace(/([.!?])(?=[A-ZÁÉÍÓÚÑ])/g,'$1 ');
    return clean(s);
  }

  function visibleAnswerText(){
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
      var spoken=joinText(heading,text);
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
    state.speaking=false; state.paused=false; state.engine=''; state.speechChunks=[]; state.speechIndex=0;
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
      state.speaking=false; state.paused=false; state.currentUtterance=null; updateSpeechButtons(); setVoiceStatus('Lectura terminada.','ok'); return;
    }
    var utter=new SpeechSynthesisUtterance(state.speechChunks[state.speechIndex]);
    var voice=selectedDeviceVoice();
    utter.lang=(voice&&voice.lang)||'es-ES'; utter.rate=selectedRate(); utter.pitch=1; utter.volume=1;
    if(voice) utter.voice=voice;
    state.currentUtterance=utter;
    utter.onstart=function(){
      if(!state.speaking||state.engine!=='local')return;
      setVoiceStatus('Zuzu está leyendo con '+(voice?clean(voice.name):'la voz del dispositivo')+'…','ok');
    };
    utter.onend=function(){
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
    state.engine='local'; state.speechChunks=splitSpeech(text,speechChunkLimit()); state.speechIndex=0; state.speaking=true; state.paused=false; state.stopRequested=false;
    updateSpeechButtons();
    speakDeviceNext();
  }

  function speakText(rawText, isPreview){
    stopListening(false); stopSpeaking(false);
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
    var box=$('ceVoz3AutoRead');
    return box?!!box.checked:safeGet(STORAGE.autoRead,'1')!=='0';
  }
  function maybeAutoRead(){
    if(!autoReadEnabled()) return;
    var text=visibleAnswerText(); if(!text) return;
    var signature=text.slice(0,500); if(signature===state.lastReadSignature) return;
    state.lastReadSignature=signature;
    setTimeout(function(){ if(document.getElementById('ceGeminiLibreOverlay')&&autoReadEnabled()) speakResponse(); },350);
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
        '<div class="ce-voz3-row">'+
          '<button type="button" id="ceVoz3Mic" class="ce-voz3-btn ce-voz3-mic" aria-pressed="false"'+(recognitionOk?'':' disabled')+'>🎙️ Hablar</button>'+
          '<span id="ceVoz3Status" class="ce-voz3-status">'+(recognitionOk?'Micrófono preparado.':'Usa el micrófono del teclado para dictar en este navegador.')+'</span>'+
          '<label class="ce-voz3-auto"><input id="ceVoz3AutoRead" type="checkbox" '+(auto?'checked':'')+'> Leer respuesta automáticamente</label>'+
        '</div>'+
        '<div class="ce-voz3-row">'+
          '<button type="button" id="ceVoz3Read" class="ce-voz3-btn">🔊 Leer</button>'+
          '<button type="button" id="ceVoz3Preview" class="ce-voz3-btn">▶ Probar voz</button>'+
          '<button type="button" id="ceVoz3Pause" class="ce-voz3-btn" disabled>⏸ Pausa</button>'+
          '<button type="button" id="ceVoz3Resume" class="ce-voz3-btn" disabled>▶ Continuar</button>'+
          '<button type="button" id="ceVoz3Stop" class="ce-voz3-btn" disabled>⏹ Detener</button>'+
        '</div>'+
        '<div class="ce-voz3-row">'+
          '<span class="ce-voz3-label">Perfil</span>'+
          '<select id="ceVoz3VoiceMode" aria-label="Perfil de voz de Zuzu">'+
            '<option value="female"'+(mode==='female'?' selected':'')+'>Femenina recomendada</option>'+
            '<option value="male"'+(mode==='male'?' selected':'')+'>Masculina recomendada</option>'+
          '</select>'+
          '<span class="ce-voz3-label">Voz instalada</span>'+
          '<select id="ceVoz3VoiceChoice" class="ce-voz3-voice-choice" aria-label="Voz concreta de Zuzu"><option value="auto">Buscando voces…</option></select>'+
        '</div>'+
        '<div class="ce-voz3-row">'+
          '<span class="ce-voz3-label">Velocidad</span>'+
          '<select id="ceVoz3Rate" aria-label="Velocidad de lectura">'+
            '<option value="0.82"'+(rate==='0.82'?' selected':'')+'>Lenta</option>'+
            '<option value="0.92"'+(rate==='0.92'||rate==='0.96'?' selected':'')+'>Natural</option>'+
            '<option value="1.06"'+(rate==='1.06'||rate==='1.12'?' selected':'')+'>Rápida</option>'+
          '</select>'+
          '<button type="button" id="ceVoz3Refresh" class="ce-voz3-btn">↻ Buscar voces</button>'+
          '<button type="button" id="ceVoz3Help" class="ce-voz3-btn ce-voz3-help">ⓘ Mejorar voz gratis</button>'+
          '<span id="ceVoz3Engine" class="ce-voz3-engine">Voz local · 0 €</span>'+
        '</div>'+
        '<div class="ce-voz3-note">Los importes, porcentajes, fechas, temperaturas, unidades y tickets se convierten a lenguaje hablado. <span id="ceVoz3Disclosure">No usa Azure ni OpenAI.</span></div>'+
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
  function bindPanel(){
    var mic=$('ceVoz3Mic'); if(mic) mic.addEventListener('click',toggleListening);
    var read=$('ceVoz3Read'); if(read) read.addEventListener('click',speakResponse);
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
    updateSpeechButtons(); observeResponse(); loadLocalVoices(true);
  }
  function injectPanel(){
    var overlay=$('ceGeminiLibreOverlay');
    if(!overlay||$(PANEL_ID)) return false;
    injectStyle();
    var prompt=q('.ce-ai-prompt',overlay),toolbar=q('.ce-ai-toolbar',overlay);
    if(!prompt||!toolbar) return false;
    toolbar.insertAdjacentHTML('afterend',panelHtml()); bindPanel(); return true;
  }
  function cleanupWhenClosed(){
    if($('ceGeminiLibreOverlay')) return;
    stopListening(false); stopSpeaking(false); state.lastReadSignature='';
    if(state.resultObserver){try{state.resultObserver.disconnect();}catch(_){}state.resultObserver=null;}
    if(state.statusObserver){try{state.statusObserver.disconnect();}catch(_){}state.statusObserver=null;}
  }

  document.addEventListener('click',function(ev){
    var target=ev&&ev.target;
    if(target&&target.closest&&target.closest('#ceAiRun')){
      stopListening(false);stopSpeaking(false);state.lastReadSignature='';setVoiceStatus('Pregunta enviada. Esperando la respuesta de Zuzu…','');
    }
    if(target&&target.closest&&target.closest('#ceAiClear')){
      stopListening(false);stopSpeaking(false);state.lastReadSignature='';setVoiceStatus('Campo limpio. Puedes volver a hablar.','');
    }
    if(target&&target.closest&&target.closest('#ceAiClose')){stopListening(false);stopSpeaking(false);}
  },true);

  function install(){
    injectStyle();injectPanel();
    if(supportsDeviceSpeech()){
      try{window.speechSynthesis.onvoiceschanged=function(){loadLocalVoices(true);};}catch(_){}
      loadLocalVoices(true);
      setTimeout(function(){loadLocalVoices(true);},300);
      setTimeout(function(){loadLocalVoices(true);},1200);
    }
    if(window.MutationObserver){
      state.modalObserver=new MutationObserver(function(){if($('ceGeminiLibreOverlay'))injectPanel();else cleanupWhenClosed();});
      state.modalObserver.observe(document.documentElement,{childList:true,subtree:true});
    }
    window.addEventListener('beforeunload',function(){stopListening(false);stopSpeaking(false);});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();

  window.ControlEventV22Voz3={
    version:BUILD,
    startListening:startListening,
    stopListening:stopListening,
    speakResponse:speakResponse,
    previewVoice:previewVoice,
    stopSpeaking:stopSpeaking,
    prepareSpeechText:prepareSpeechText,
    supportsRecognition:supportsRecognition,
    supportsDeviceSpeech:supportsDeviceSpeech,
    refreshVoices:loadLocalVoices,
    selectedDeviceVoice:selectedDeviceVoice
  };
})();
