/* ControlEvent v17_prod - logo inicial fijo y transición limpia a GRAFICAS.
   No cambia version. Evita reescrituras repetidas: CSS fijo desde cabecera + una sola
   inserción de imagen si el contenedor no trae logo. */
(function(){
  'use strict';
  const INSTALLED = '__ceV17LogoGraficasCleanStableV4';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const STYLE_ID = 'ceV17LogoGraficasStableStyleV4';
  const ICON = './assets/icons/controlevent-welcome-v44.png';
  const $ = id => document.getElementById(id);
  const norm = value => String(value ?? '').trim();
  const safe = (fn, fb) => { try{ const out = fn(); return out === undefined ? fb : out; }catch(_){ return fb; } };
  const getLexical = name => safe(() => Function('return (typeof '+name+' !== "undefined") ? '+name+' : undefined;')(), undefined);
  const setLexical = (name, value) => safe(() => Function('value', name + ' = value;')(value), undefined);

  function stateObjects(){
    const out = [];
    const add = item => { if(item && typeof item === 'object' && !out.includes(item)) out.push(item); };
    add(getLexical('state'));
    add(window.state);
    add(window.ControlEventApp?.state);
    add(window.ControlEventRuntime?.app?.state);
    return out;
  }
  function auth(){
    const lexical = safe(() => (typeof authUser !== 'undefined' && authUser) ? authUser : null, null);
    return lexical || window.authUser || window.ControlEventApp?.authUser || null;
  }
  function selectedId(){
    for(const s of stateObjects()){ if(norm(s?.selectedEventId)) return norm(s.selectedEventId); }
    return norm($('selectedEvent')?.value || '');
  }
  function events(){
    for(const s of stateObjects()){ if(Array.isArray(s?.eventos)) return s.eventos; }
    return [];
  }
  function hasValidEvent(id = selectedId()){
    id = norm(id);
    return !!id && events().some(ev => String(ev?.id || '') === id);
  }
  function setGraficasTab(){
    setLexical('currentMainTab', 'graficas');
    try{ window.currentMainTab = 'graficas'; }catch(_){ }
    try{ window.__ceCurrentMainTab = 'graficas'; }catch(_){ }
    try{ if(window.ControlEventApp?.navigation) window.ControlEventApp.navigation.currentMainTab = 'graficas'; }catch(_){ }
  }
  function injectStyle(){
    if($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #noEventMessage.ce-v17-logo-only,#noEventMessage.ce-v44-welcome-card.ce-v17-logo-only,#noEventMessage.card.ce-v17-logo-only{display:flex!important;align-items:center!important;justify-content:center!important;min-height:44vh!important;background:transparent!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;overflow:hidden!important;}
      #noEventMessage.ce-v17-logo-only.hidden{display:none!important;}
      #noEventMessage.ce-v17-logo-only .ce-v44-welcome,#noEventMessage.ce-v17-logo-only .ce-v17-welcome-logo-only,#noEventMessage.ce-v17-logo-only .empty{width:auto!important;max-width:none!important;margin:0 auto!important;padding:0!important;text-align:center!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;}
      #noEventMessage.ce-v17-logo-only h1,#noEventMessage.ce-v17-logo-only h2,#noEventMessage.ce-v17-logo-only h3,#noEventMessage.ce-v17-logo-only p,#noEventMessage.ce-v17-logo-only .empty:not(.ce-v17-welcome-logo-only){display:none!important;visibility:hidden!important;opacity:0!important;max-height:0!important;overflow:hidden!important;}
      #noEventMessage.ce-v17-logo-only img{display:block!important;width:min(150px,36vw)!important;max-width:150px!important;height:auto!important;margin:0 auto!important;border-radius:24px!important;filter:drop-shadow(0 12px 22px rgba(15,23,42,.20))!important;transform:none!important;transition:none!important;animation:none!important;}
      body.ce-v17-event-switching #noEventMessage,body.ce-v17-has-event #noEventMessage{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;max-height:0!important;overflow:hidden!important;}
    `;
    document.head.appendChild(style);
  }
  function ensureLogoNode(){
    const msg = $('noEventMessage');
    if(!msg) return;
    msg.classList.add('ce-v17-logo-only');
    msg.classList.remove('hidden');
    msg.removeAttribute('aria-hidden');
    msg.style.removeProperty('display');
    msg.style.removeProperty('visibility');
    msg.style.removeProperty('pointer-events');
    msg.style.removeProperty('max-height');
    msg.style.removeProperty('overflow');
    let img = msg.querySelector('img');
    if(!img){
      msg.innerHTML = `<div class="ce-v17-welcome-logo-only"><img src="${ICON}" alt="ControlEvent" /></div>`;
      img = msg.querySelector('img');
    }else{
      // No reescribir el contenedor si ya existe una imagen: solo fijar el src si venia vacio.
      if(!norm(img.getAttribute('src'))) img.setAttribute('src', ICON);
    }
  }
  function hideWelcomeNow(){
    try{ document.body.classList.add('ce-v17-event-switching','ce-v17-has-event'); }catch(_){ }
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.add('hidden');
      msg.setAttribute('aria-hidden','true');
      msg.style.setProperty('display','none','important');
      msg.style.setProperty('visibility','hidden','important');
      msg.style.setProperty('pointer-events','none','important');
      msg.style.setProperty('max-height','0','important');
      msg.style.setProperty('overflow','hidden','important');
    }
  }
  function apply(){
    injectStyle();
    if(!auth()) return;
    const valid = hasValidEvent();
    try{ document.body.classList.toggle('ce-v17-has-event', valid); }catch(_){ }
    if(valid){ hideWelcomeNow(); return; }
    try{ document.body.classList.remove('ce-v17-event-switching','ce-v17-has-event'); }catch(_){ }
    ensureLogoNode();
  }
  function wrapChangeSelected(){
    const fn = window.changeSelectedEvent || getLexical('changeSelectedEvent');
    if(typeof fn !== 'function' || fn.__ceV17LogoStable) return;
    const wrapped = function(value){
      if(norm(value)){
        setGraficasTab();
        hideWelcomeNow();
      }
      const result = fn.apply(this, arguments);
      Promise.resolve(result).finally(() => setTimeout(() => {
        try{ document.body.classList.remove('ce-v17-event-switching'); }catch(_){ }
        apply();
      }, 80));
      return result;
    };
    wrapped.__ceV17LogoStable = true;
    window.changeSelectedEvent = wrapped;
    setLexical('changeSelectedEvent', wrapped);
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.changeSelectedEvent = (...args) => wrapped(...args); }catch(_){ }
  }
  function handleSelectCapture(event){
    const sel = event.target?.closest?.('#selectedEvent');
    if(!sel) return;
    if(norm(sel.value)){
      setGraficasTab();
      hideWelcomeNow();
    }
  }
  function install(){ injectStyle(); wrapChangeSelected(); apply(); }

  window.addEventListener('change', handleSelectCapture, true);
  document.addEventListener('change', handleSelectCapture, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:data-loaded','controlevent:event-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 40), true));
  [0,180,900].forEach(ms => setTimeout(install, ms));
  window.ControlEventV17LogoGraficasClean = {install, apply, hideWelcomeNow, version:'v17_prod_logo_fijo'};
})();
