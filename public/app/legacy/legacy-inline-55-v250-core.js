/* ControlEvent v26.6 - JS legacy extraido de public/index.html. Bloque inline #55. */
/* ==== v25.0: entrada sin evento, render ligero y base modular ==== */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v26.6';
  const VERSION_FILE = 'ControlEvent_v26_6';
  const CHOSEN_KEY = 'ce_v250_event_chosen';
  const LEGACY_EVENT_KEY = 'controlevent_v229_selected_event_id';
  const tipStore = new WeakMap();
  const $ = id => document.getElementById(id);
  const events = () => {
    const s = stateRef();
    return Array.isArray(s.eventos) ? s.eventos : [];
  };
  function stateRef(){
    try{ return (typeof state !== 'undefined' && state) || window.state || {}; }
    catch(_){ return window.state || {}; }
  }
  function isAuthed(){
    try{ return !!((typeof authUser !== 'undefined' && authUser) || window.authUser); }
    catch(_){ return !!window.authUser; }
  }
  function chosenForThisEntry(){
    try{ return sessionStorage.getItem(CHOSEN_KEY) === '1'; }
    catch(_){ return false; }
  }
  function markEntryNeedsEvent(){
    try{ sessionStorage.removeItem(CHOSEN_KEY); }catch(_){ }
    clearLegacyEventMemory();
  }
  function clearLegacyEventMemory(){
    try{ sessionStorage.removeItem(LEGACY_EVENT_KEY); }catch(_){ }
    try{ localStorage.removeItem(LEGACY_EVENT_KEY); }catch(_){ }
  }
  function validSelected(){
    const s = stateRef();
    const id = String(s.selectedEventId || '');
    return !!id && events().some(e => String(e.id) === id);
  }
  function forcePickerIfNeeded(){
    if(!isAuthed() || chosenForThisEntry()) return;
    const s = stateRef();
    if(!Array.isArray(s.eventos)) return;
    if(s.selectedEventId) s.__ceV250PreviousEventId = s.selectedEventId;
    s.selectedEventId = '';
    clearLegacyEventMemory();
  }
  function patchVersion(){
    try{ document.title = VERSION; }catch(_){ }
    document.querySelectorAll('.appname span,.appname-stack span').forEach(el => {
      if(/ControlEvent\s+v\d+\.\d+(?:\.\d+)?/i.test(el.textContent || '')) el.textContent = VERSION;
    });
    try{
      window.emittedByTextV171 = function(date = new Date()){
        const p = n => String(n).padStart(2,'0');
        return `Emitido por "(c)oltyLAB '26_${VERSION_FILE}_${p(date.getDate())}${p(date.getMonth()+1)}${date.getFullYear()}_${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}"`;
      };
      emittedByTextV171 = window.emittedByTextV171;
    }catch(_){ }
  }
  function patchEventSelect(){
    const sel = $('selectedEvent');
    if(!sel) return;
    if(!sel.querySelector('option[value=""]')){
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = events().length ? 'Selecciona evento...' : 'Sin eventos';
      sel.insertBefore(opt, sel.firstChild);
    }
    if(!validSelected()) sel.value = '';
    sel.classList.toggle('ce-v250-awaiting', isAuthed() && !validSelected());
  }
  function patchNoEventMessage(){
    const waiting = isAuthed() && !validSelected();
    document.body.classList.toggle('ce-v250-no-event', waiting);
    const msg = $('noEventMessage');
    if(msg){
      msg.classList.toggle('hidden', !waiting);
      msg.classList.toggle('ce-v250-pick-event', waiting);
      const empty = msg.querySelector('.empty');
      if(empty){
        empty.textContent = events().length
          ? 'Selecciona un evento en el desplegable EVENTO para cargar sus datos.'
          : 'No hay eventos. Crea uno desde mantenimiento.';
      }
    }
  }
  function renderHeaderOnly(){
    try{ if(typeof renderEnvironmentBanner === 'function') renderEnvironmentBanner(); }catch(_){ }
    try{ if(typeof renderAuthUI === 'function') renderAuthUI(); }catch(_){ }
    patchVersion();
    if(!isAuthed()) return;
    forcePickerIfNeeded();
    try{ if(typeof renderHeader === 'function') renderHeader(); }catch(err){ console.warn('[v25.0] renderHeader ligero', err); }
    try{ if(typeof renderTabVisibility === 'function') renderTabVisibility(); }catch(_){ }
    try{ if(typeof renderMainSelectors === 'function') renderMainSelectors(); }catch(err){ console.warn('[v25.0] renderMainSelectors ligero', err); }
    patchEventSelect();
    patchNoEventMessage();
    try{ if(typeof renderPermissions === 'function') renderPermissions(); }catch(_){ }
    try{ if(typeof renderLockState === 'function') renderLockState(); }catch(_){ }
    scheduleDeferredTips();
  }
  function deferTipsNow(){
    document.querySelectorAll('[data-ce-tip-v21]').forEach(el => {
      if(el.closest('#ceTooltipV21,#authOverlay')) return;
      const html = el.getAttribute('data-ce-tip-v21');
      if(!html) return;
      tipStore.set(el, {
        html,
        bg: el.getAttribute('data-tip-bg-v21') || el.getAttribute('data-ce-tip-bg') || '',
        layout: el.getAttribute('data-ce-tip-layout-v21') || el.getAttribute('data-ce-tip-layout') || ''
      });
      el.removeAttribute('data-ce-tip-v21');
      el.removeAttribute('data-tip-bg-v21');
      el.removeAttribute('data-ce-tip-layout-v21');
      el.removeAttribute('data-ce-tip-bg');
      el.removeAttribute('data-ce-tip-layout');
      el.setAttribute('data-ce-tip-lazy-v250','1');
    });
  }
  function hydrateTip(target){
    const el = target?.closest?.('[data-ce-tip-lazy-v250]');
    if(!el) return;
    const tip = tipStore.get(el);
    if(!tip) return;
    el.setAttribute('data-ce-tip-v21', tip.html);
    if(tip.bg) el.setAttribute('data-tip-bg-v21', tip.bg);
    if(tip.layout) el.setAttribute('data-ce-tip-layout-v21', tip.layout);
    el.removeAttribute('data-ce-tip-lazy-v250');
  }
  function scheduleDeferredTips(){
    [0, 90, 350, 1000].forEach(ms => setTimeout(deferTipsNow, ms));
  }
  ['pointerdown','mousedown','touchstart','focusin'].forEach(type => {
    document.addEventListener(type, ev => hydrateTip(ev.target), true);
  });
  document.addEventListener('keydown', ev => {
    if(ev.key === 'Enter' || ev.key === ' ') hydrateTip(ev.target);
  }, true);

  const previousRender = (typeof render === 'function') ? render : window.render;
  function renderV250(){
    if(!isAuthed()){
      const ret = previousRender ? previousRender.apply(this, arguments) : undefined;
      patchVersion();
      return ret;
    }
    forcePickerIfNeeded();
    if(!validSelected()){
      renderHeaderOnly();
      return undefined;
    }
    const ret = previousRender ? previousRender.apply(this, arguments) : undefined;
    patchVersion();
    patchEventSelect();
    patchNoEventMessage();
    scheduleDeferredTips();
    return ret;
  }
  try{ render = renderV250; }catch(_){ }
  window.render = renderV250;

  const previousMerge = (typeof mergeLoadedState === 'function') ? mergeLoadedState : window.mergeLoadedState;
  if(previousMerge && !previousMerge.__v250Wrapped){
    const wrappedMerge = function(serverState, defaults){
      const merged = previousMerge.apply(this, arguments);
      if(isAuthed() && !chosenForThisEntry() && merged && Array.isArray(merged.eventos)){
        merged.selectedEventId = '';
      }
      return merged;
    };
    wrappedMerge.__v250Wrapped = true;
    try{ mergeLoadedState = wrappedMerge; }catch(_){ }
    window.mergeLoadedState = wrappedMerge;
  }

  const previousLogin = (typeof doLogin === 'function') ? doLogin : window.doLogin;
  if(previousLogin && !previousLogin.__v250Wrapped){
    const wrappedLogin = async function(){
      markEntryNeedsEvent();
      const ret = await previousLogin.apply(this, arguments);
      if(isAuthed()){
        forcePickerIfNeeded();
        renderV250();
      }
      return ret;
    };
    wrappedLogin.__v250Wrapped = true;
    try{ doLogin = wrappedLogin; }catch(_){ }
    window.doLogin = wrappedLogin;
  }

  const previousLogout = (typeof doLogout === 'function') ? doLogout : window.doLogout;
  if(previousLogout && !previousLogout.__v250Wrapped){
    const wrappedLogout = async function(){
      markEntryNeedsEvent();
      return previousLogout.apply(this, arguments);
    };
    wrappedLogout.__v250Wrapped = true;
    try{ doLogout = wrappedLogout; }catch(_){ }
    window.doLogout = wrappedLogout;
  }

  const previousChangeSelected = (typeof changeSelectedEvent === 'function') ? changeSelectedEvent : window.changeSelectedEvent;
  const changeSelectedEventV250 = async function(value){
    const id = String(value || '');
    const s = stateRef();
    if(!id){
      markEntryNeedsEvent();
      s.selectedEventId = '';
      renderV250();
      return false;
    }
    try{ sessionStorage.setItem(CHOSEN_KEY, '1'); }catch(_){ }
    s.selectedEventId = id;
    if(previousChangeSelected && previousChangeSelected !== changeSelectedEventV250){
      return previousChangeSelected.apply(this, arguments);
    }
    renderV250();
    return false;
  };
  try{ changeSelectedEvent = changeSelectedEventV250; }catch(_){ }
  window.changeSelectedEvent = changeSelectedEventV250;

  patchVersion();
  if(isAuthed()) renderV250();
  scheduleDeferredTips();
  window.__ceV250 = {version: VERSION, render: renderV250, deferTips: deferTipsNow};
})();
