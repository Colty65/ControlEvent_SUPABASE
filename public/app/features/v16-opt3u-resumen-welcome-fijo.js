/* ControlEvent v16_prod OPT3U - rescate mínimo visual.
   No toca subir/eliminar fotos. Corrige:
   1) resumen inferior que se queda sin desplegar por filtros de evento/capas viejas,
   2) pantalla sin evento: solo icono CE, sin ficha ni textos,
   3) cambio de evento: desaparece primero el icono y no se muestra GRAFICAS a medio pintar. */
(function(){
  'use strict';
  if(window.__ceV16Opt3UResumenWelcomeFijo) return;
  window.__ceV16Opt3UResumenWelcomeFijo = true;

  const VERSION = 'v16_opt_3u';
  const WELCOME_ICON = './assets/icons/controlevent-welcome-v44.png';
  const $ = id => document.getElementById(id);
  const clean = v => String(v == null ? '' : v).trim();
  const stateRef = () => { try{ return window.ControlEventApp?.state || window.state || (typeof state !== 'undefined' ? state : {}) || {}; }catch(_){ return {}; } };
  const selectedEventId = () => clean(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const authVisible = () => {
    const ov = $('authOverlay');
    if(!ov || ov.classList.contains('hidden') || ov.hasAttribute('hidden')) return false;
    try{ const cs = getComputedStyle(ov); return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity || 1) !== 0; }catch(_){ return true; }
  };
  const hasEvent = () => !!selectedEventId();
  const isResumenVisible = () => {
    const tab = $('tabResumen');
    if(!tab || tab.classList.contains('hidden')) return false;
    try{ const cs = getComputedStyle(tab); return cs.display !== 'none' && cs.visibility !== 'hidden'; }catch(_){ return true; }
  };

  const metrics = window.ControlEventOpt3U = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    welcomeWrites: 0,
    welcomeHides: 0,
    resumenRecoveries: 0,
    graphTransitions: 0,
    lastResumenReason: '',
    lastEventId: ''
  };

  function injectStyle(){
    if($('ceOpt3UStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceOpt3UStyle';
    st.textContent = `
      #noEventMessage.ce-opt3u-welcome-only,
      body.ce-opt3u-awaiting-event #noEventMessage{
        display:flex!important;align-items:center!important;justify-content:center!important;
        min-height:46vh!important;background:transparent!important;border:0!important;box-shadow:none!important;
        padding:0!important;margin:0!important;overflow:visible!important;
      }
      #noEventMessage.ce-opt3u-welcome-only.hidden{display:none!important;}
      #noEventMessage.ce-opt3u-welcome-only .ce-opt3u-welcome{
        display:flex!important;align-items:center!important;justify-content:center!important;
        width:auto!important;height:auto!important;background:transparent!important;border:0!important;box-shadow:none!important;
        padding:0!important;margin:0!important;transform:none!important;transition:none!important;animation:none!important;
      }
      #noEventMessage.ce-opt3u-welcome-only img{
        display:block!important;width:240px!important;height:240px!important;min-width:240px!important;max-width:240px!important;
        object-fit:contain!important;margin:0!important;padding:0!important;transform:none!important;transition:none!important;animation:none!important;
      }
      #noEventMessage.ce-opt3u-welcome-only h1,
      #noEventMessage.ce-opt3u-welcome-only h2,
      #noEventMessage.ce-opt3u-welcome-only h3,
      #noEventMessage.ce-opt3u-welcome-only p,
      #noEventMessage.ce-opt3u-welcome-only .empty{display:none!important;}
      body.ce-opt3u-has-event #noEventMessage,
      body.ce-opt3u-event-transition #noEventMessage{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-opt3u-event-transition #tabGraficas:not(.hidden),
      body.ce-opt3u-event-transition #eventChartWrap{visibility:hidden!important;}
      #summaryTiendaTicket.ce-opt3u-recovering{min-height:90px!important;}
    `;
    document.head.appendChild(st);
  }

  function forceWelcomeIcon(){
    const msg = $('noEventMessage');
    if(!msg || authVisible()) return;
    if(hasEvent()){
      msg.classList.add('hidden');
      msg.classList.remove('ce-opt3u-welcome-only');
      document.body.classList.add('ce-opt3u-has-event');
      document.body.classList.remove('ce-opt3u-awaiting-event');
      metrics.welcomeHides++;
      return;
    }
    document.body.classList.remove('ce-opt3u-has-event','ce-opt3u-event-transition');
    document.body.classList.add('ce-opt3u-awaiting-event');
    msg.classList.remove('hidden');
    msg.classList.add('ce-opt3u-welcome-only');
    const wanted = `<div class="ce-opt3u-welcome"><img src="${WELCOME_ICON}" alt="ControlEvent"></div>`;
    if(msg.innerHTML !== wanted){
      msg.innerHTML = wanted;
      metrics.welcomeWrites++;
    }
  }

  let activeTransition = false;
  function hideWelcomeBeforeEventPaint(holdGraphs){
    const msg = $('noEventMessage');
    document.body.classList.add('ce-opt3u-has-event');
    if(holdGraphs || activeTransition) document.body.classList.add('ce-opt3u-event-transition');
    document.body.classList.remove('ce-opt3u-awaiting-event');
    if(msg){
      msg.classList.add('hidden');
      msg.classList.remove('ce-opt3u-welcome-only');
      msg.style.display = 'none';
      msg.style.visibility = 'hidden';
    }
    metrics.welcomeHides++;
    metrics.graphTransitions++;
    setTimeout(() => {
      try{
        if(msg){ msg.style.removeProperty('display'); msg.style.removeProperty('visibility'); }
      }catch(_){ }
    }, 80);
  }

  let transitionTimer = 0;
  function startEventTransition(){
    if(!hasEvent()) return;
    activeTransition = true;
    hideWelcomeBeforeEventPaint(true);
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(endEventTransition, 2600);
  }
  function endEventTransition(){
    if(hasEvent()){
      activeTransition = false;
      document.body.classList.remove('ce-opt3u-event-transition','ce-opt3u-awaiting-event');
      document.body.classList.add('ce-opt3u-has-event');
      const msg = $('noEventMessage');
      if(msg){ msg.classList.add('hidden'); msg.classList.remove('ce-opt3u-welcome-only'); }
      recoverResumen('end-event-transition');
    }else{
      activeTransition = false;
      document.body.classList.remove('ce-opt3u-event-transition','ce-opt3u-has-event');
      forceWelcomeIcon();
    }
  }

  function patchChangeSelectedEvent(){
    const old = window.changeSelectedEvent;
    if(!old || old.__ceOpt3UWrapped) return;
    const wrapped = function(value){
      if(clean(value)){ startEventTransition(); }
      else { document.body.classList.remove('ce-opt3u-has-event','ce-opt3u-event-transition'); }
      return old.apply(this, arguments);
    };
    wrapped.__ceOpt3UWrapped = true;
    wrapped.__ceOpt3UOld = old;
    try{ window.changeSelectedEvent = wrapped; changeSelectedEvent = wrapped; }catch(_){ window.changeSelectedEvent = wrapped; }
  }

  function rootHasUsefulContent(root){
    if(!root) return false;
    if(root.querySelector('.ce-opt3e-row,.summary-item:not(.ce-tt-total-evento),.ce-opt3e-sortbar,.ce-hf10-sortbar,[data-opt3e-sort]')) return true;
    return clean(root.textContent).length > 8;
  }

  let recoverTimer = 0;
  function recoverResumen(reason){
    if(!hasEvent() || !isResumenVisible()) return;
    const root = $('summaryTiendaTicket');
    if(!root) return;
    clearTimeout(recoverTimer);
    recoverTimer = setTimeout(() => {
      try{
        if(!hasEvent() || !isResumenVisible()) return;
        const weak = !rootHasUsefulContent(root);
        if(weak) root.classList.add('ce-opt3u-recovering');
        if(weak || !root.querySelector('.ce-opt3e-row,.summary-item:not(.ce-tt-total-evento),.ce-opt3e-sortbar,[data-opt3e-sort]')){
          try{ window.ControlEventOpt3F?.clearCaches?.(); }catch(_){ }
          try{ window.ControlEventOpt3F?.renderNow?.(true); }catch(_){ try{ if(typeof renderBudget === 'function') renderBudget(); }catch(__){} }
          setTimeout(() => { try{ window.ControlEventOpt3F?.renderNow?.(true); }catch(_){} root.classList.remove('ce-opt3u-recovering'); }, 220);
          metrics.resumenRecoveries++;
          metrics.lastResumenReason = reason || '';
          metrics.lastEventId = selectedEventId();
        }
      }catch(err){ console.warn('[v16_opt_3u] recoverResumen', err); }
    }, 180);
  }

  function installObserver(){
    const msg = $('noEventMessage');
    if(msg && !msg.__ceOpt3UObserved){
      msg.__ceOpt3UObserved = true;
      try{
        new MutationObserver(() => { setTimeout(forceWelcomeIcon, 0); }).observe(msg, {childList:true, subtree:true, characterData:true, attributes:true, attributeFilter:['class','style']});
      }catch(_){ }
    }
    const root = $('summaryTiendaTicket');
    if(root && !root.__ceOpt3UObserved){
      root.__ceOpt3UObserved = true;
      try{
        new MutationObserver(() => recoverResumen('summary-mutation')).observe(root, {childList:true});
      }catch(_){ }
    }
  }

  function install(){
    injectStyle();
    patchChangeSelectedEvent();
    installObserver();
    if(hasEvent()){
      hideWelcomeBeforeEventPaint(false);
      if(activeTransition) setTimeout(endEventTransition, 260);
    }else{
      forceWelcomeIcon();
    }
    recoverResumen('install');
  }

  document.addEventListener('change', ev => {
    if(ev.target && ev.target.id === 'selectedEvent'){
      if(clean(ev.target.value)) startEventTransition();
      else setTimeout(forceWelcomeIcon, 0);
    }
  }, true);
  document.addEventListener('click', ev => {
    if(ev.target?.closest?.('#tabResumenBtn,#tabGraficasBtn')) setTimeout(() => recoverResumen('tab-click'), 120);
  }, true);
  ['controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:module-mounted','controlevent:rendered','controlevent:event-changed','controlevent:opt1-event-stable'].forEach(type => {
    window.addEventListener(type, () => {
      if(type === 'controlevent:event-ready' || type === 'controlevent:opt1-event-stable') setTimeout(endEventTransition, 80);
      setTimeout(install, 100);
      setTimeout(() => recoverResumen(type), 320);
    }, true);
  });
  document.addEventListener('DOMContentLoaded', () => setTimeout(install, 60), {once:true});
  window.addEventListener('load', () => setTimeout(install, 120), {once:true});
  setTimeout(install, 80);
  setTimeout(install, 500);
})();
