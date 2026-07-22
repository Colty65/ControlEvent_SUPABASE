/* ControlEvent v23_prod FIX25 - logo Peña El Arrastre en pantalla de bienvenida post-login.
   No refresca datos ni toca cálculos: solo pinta el logo si no hay evento elegido y lo oculta antes de cargar GRAFICAS. */
(function(){
  'use strict';
  if(window.__ceV17Fix25WelcomeElArrastre) return;
  window.__ceV17Fix25WelcomeElArrastre = true;

  const STYLE_ID = 'ceV17Fix25WelcomeElArrastreStyle';
  const ASSET = './assets/icons/penya-el-arrastre-welcome.png';
  const $ = id => document.getElementById(id);
  const norm = v => String(v == null ? '' : v).trim();
  const safe = (fn, fb) => { try{ const out = fn(); return out === undefined ? fb : out; }catch(_){ return fb; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+'!=="undefined")?'+name+':undefined')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name+'=value;')(value), undefined);

  function injectStyle(){
    if($(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
      body.ce-v17-fix25-welcome-ready #noEventMessage{
        display:flex!important;align-items:center!important;justify-content:center!important;
        min-height:56vh!important;margin:0!important;padding:0!important;background:transparent!important;
        border:0!important;box-shadow:none!important;overflow:hidden!important;
        transition:none!important;animation:none!important;
      }
      body.ce-v17-fix25-welcome-ready #noEventMessage.card{background:transparent!important;border:0!important;box-shadow:none!important;}
      body.ce-v17-fix25-welcome-ready #noEventMessage>*{display:none!important;visibility:hidden!important;opacity:0!important;max-height:0!important;overflow:hidden!important;}
      body.ce-v17-fix25-welcome-ready #noEventMessage::before{
        content:""!important;display:block!important;
        width:clamp(210px,38vw,340px)!important;height:clamp(160px,29vw,258px)!important;
        max-width:76vw!important;max-height:42vh!important;
        background:url('${ASSET}') center/contain no-repeat!important;
        border:0!important;border-radius:0!important;box-shadow:none!important;filter:none!important;outline:0!important;
        transform:none!important;transition:none!important;animation:none!important;
      }
      @media(max-width:640px){
        body.ce-v17-fix25-welcome-ready #noEventMessage{min-height:54vh!important;}
        body.ce-v17-fix25-welcome-ready #noEventMessage::before{
          width:min(76vw,300px)!important;height:min(58vw,228px)!important;max-height:38vh!important;
        }
      }
      body.ce-v17-fix25-has-event #noEventMessage,
      body.ce-v17-event-switching #noEventMessage,
      body.ce-v17-has-event #noEventMessage{
        display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;
        max-height:0!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:0!important;
      }
    `;
    document.head.appendChild(st);
  }

  function stateObjects(){
    const out = [];
    const add = o => { if(o && typeof o === 'object' && !out.includes(o)) out.push(o); };
    add(getLexical('state'));
    add(window.state);
    add(window.ControlEventApp && window.ControlEventApp.state);
    add(window.ControlEventRuntime && window.ControlEventRuntime.app && window.ControlEventRuntime.app.state);
    return out;
  }
  function selectedId(){
    const sel = $('selectedEvent');
    const domId = norm((sel && sel.value) || '');
    if(domId) return domId;
    // Si el desplegable ya existe y está sin valor, estamos en bienvenida: no reutilizar un selectedEventId viejo de estado.
    if(sel && sel.options && sel.options.length) return '';
    for(const s of stateObjects()){
      const id = norm(s && s.selectedEventId);
      if(id) return id;
    }
    return '';
  }
  function events(){
    for(const s of stateObjects()){
      if(Array.isArray(s && s.eventos)) return s.eventos;
    }
    const sel = $('selectedEvent');
    if(sel && sel.options && sel.options.length){
      return Array.from(sel.options).map(o => ({id:o.value})).filter(e => norm(e.id));
    }
    return [];
  }
  function hasValidEvent(id){
    id = norm(id == null ? selectedId() : id);
    if(!id) return false;
    const evs = events();
    return !evs.length || evs.some(e => norm(e && e.id) === id);
  }
  function loginVisible(){
    const overlay = $('authOverlay');
    return !!(overlay && !overlay.classList.contains('hidden'));
  }
  function setGraficas(){
    setLexical('currentMainTab', 'graficas');
    try{ window.currentMainTab = 'graficas'; }catch(_){ }
    try{ window.__ceCurrentMainTab = 'graficas'; }catch(_){ }
  }

  function hideWelcome(){
    document.body.classList.remove('ce-v17-fix25-welcome-ready');
    document.body.classList.add('ce-v17-fix25-has-event','ce-v17-has-event');
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.add('hidden');
      msg.setAttribute('aria-hidden','true');
      msg.style.setProperty('display','none','important');
    }
  }
  function showWelcome(){
    injectStyle();
    document.body.classList.remove('ce-v17-fix25-has-event','ce-v17-has-event','ce-v17-event-switching');
    document.body.classList.add('ce-v17-fix25-welcome-ready');
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.remove('hidden');
      msg.removeAttribute('aria-hidden');
      msg.style.setProperty('display','flex','important');
      msg.style.setProperty('align-items','center','important');
      msg.style.setProperty('justify-content','center','important');
    }
  }
  function syncWelcome(){
    injectStyle();
    if(loginVisible() || hasValidEvent()) hideWelcome();
    else showWelcome();
  }

  function wrapChangeSelectedEvent(){
    const fn = getLexical('changeSelectedEvent') || window.changeSelectedEvent;
    if(typeof fn !== 'function' || fn.__ceV17Fix25WelcomeElArrastre) return;
    const wrapped = function(value){
      const id = norm(value);
      if(id){
        setGraficas();
        document.body.classList.add('ce-v17-event-switching');
        hideWelcome();
      }
      const ret = fn.apply(this, arguments);
      Promise.resolve(ret).finally(() => setTimeout(() => {
        document.body.classList.remove('ce-v17-event-switching');
        syncWelcome();
      }, 30));
      return ret;
    };
    wrapped.__ceV17Fix25WelcomeElArrastre = true;
    try{ window.changeSelectedEvent = wrapped; setLexical('changeSelectedEvent', wrapped); }catch(_){ window.changeSelectedEvent = wrapped; }
  }

  function bind(){
    if(window.__ceV17Fix25WelcomeElArrastreBound) return;
    window.__ceV17Fix25WelcomeElArrastreBound = true;
    document.addEventListener('change', ev => {
      if(ev.target && ev.target.id === 'selectedEvent'){
        if(norm(ev.target.value)){
          setGraficas();
          document.body.classList.add('ce-v17-event-switching');
          hideWelcome();
        }
        setTimeout(syncWelcome, 80);
      }
    }, true);
    document.addEventListener('click', ev => {
      if(ev.target && ev.target.closest && ev.target.closest('#btnLogin,#btnLogout,#selectedEvent')){
        setTimeout(syncWelcome, 180);
        setTimeout(syncWelcome, 650);
      }
    }, true);
    const overlay = $('authOverlay');
    if(overlay && window.MutationObserver){
      try{
        new MutationObserver(() => setTimeout(syncWelcome, 30)).observe(overlay, {attributes:true, attributeFilter:['class','style']});
      }catch(_){ }
    }
    ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-loaded','controlevent:event-ready'].forEach(evt => {
      window.addEventListener(evt, () => setTimeout(syncWelcome, 40), true);
    });
  }

  function install(){
    injectStyle();
    wrapChangeSelectedEvent();
    bind();
    syncWelcome();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  setTimeout(install, 100);
  setTimeout(syncWelcome, 900);

  window.ControlEventV17Fix25WelcomeElArrastre = {
    version:'v23_prod_fix25_welcome_elarrastre',
    install,
    sync:syncWelcome,
    show:showWelcome,
    hide:hideWelcome
  };
})();
