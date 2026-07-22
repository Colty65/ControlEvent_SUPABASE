/* ControlEvent v23_prod_r1 OPT2I - antiretemblor visual en GRAFICAS.
   Objetivo: durante el cambio de evento, mantener una instantánea estable de la gráfica
   anterior y revelar la nueva solo cuando el render V46 esté asentado.
   No cambia cálculos ni datos; solo evita el salto vertical bajo/alto durante el render.
*/
(function(){
  'use strict';
  const VERSION = 'v23_prod_opt_2i';
  const $ = id => document.getElementById(id);
  const text = v => String(v == null ? '' : v).trim();
  const now = () => Date.now();

  if(window.ControlEventOpt2I && typeof window.ControlEventOpt2I.begin === 'function') return;

  const metrics = window.ControlEventOpt2I = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    freezes: 0,
    releases: 0,
    forcedReleases: 0,
    lastEventId: '',
    lastReason: '',
    lastHoldMs: 0,
    lastAlignPx: 0,
    active: false
  };

  let overlay = null;
  let releaseTimer = 0;
  let watchdogTimer = 0;
  let mutationQuietTimer = 0;
  let lastMutationAt = 0;
  let startAt = 0;
  let targetEventId = '';
  let startFinalCommits = 0;
  let initialRect = null;
  let initialScrollY = 0;
  let mo = null;

  function state(){ try{ return (typeof window.state !== 'undefined' && window.state) || window.ControlEventApp?.state || {}; }catch(_){ return {}; } }
  function currentEventId(){ return text(state().selectedEventId || $('selectedEvent')?.value || ''); }
  function graficasVisible(){ const t = $('tabGraficas'); return !!t && !t.classList.contains('hidden'); }
  function wrap(){ return $('eventChartWrap'); }
  function tab(){ return $('tabGraficas'); }

  function getProtoDesc(){
    let p = Element.prototype;
    while(p){
      const d = Object.getOwnPropertyDescriptor(p, 'innerHTML');
      if(d && typeof d.get === 'function') return d;
      p = Object.getPrototypeOf(p);
    }
    return null;
  }
  function rawHtml(el){
    try{ const d = getProtoDesc(); return d ? d.get.call(el) : el.innerHTML; }catch(_){ return el?.innerHTML || ''; }
  }
  function pieCount(html){ return (String(html || '').match(/ce-v434-pie-card/g) || []).length; }
  function isStrictV46(html){
    html = String(html || '');
    return html.includes('ce-v46-pies') && pieCount(html) >= 6 && /SALDO ACTUAL/i.test(html) && /SALDO OPERATIVO/i.test(html) && /VALORACION DEL EVENTO/i.test(html);
  }

  function injectStyle(){
    if($('ceV16Opt2IStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceV16Opt2IStyle';
    st.textContent = `
      .ce-opt2i-snapshot{position:fixed;z-index:6900;overflow:hidden;background:#fff;pointer-events:none;contain:strict;box-sizing:border-box;}
      body.ce-opt2i-freezing #tabGraficas{min-height:var(--ce-opt2i-tab-h,680px)!important;}
      body.ce-opt2i-freezing #eventChartWrap{min-height:var(--ce-opt2i-wrap-h,560px)!important;contain:layout paint!important;}
      body.ce-opt2i-freezing #tabGraficas.ce-opt2i-underlay{visibility:hidden!important;}
      body.ce-opt2i-freezing #tabGraficas *,body.ce-opt2i-freezing #eventChartWrap *{transition:none!important;animation:none!important;scroll-behavior:auto!important;}
      body.ce-opt2i-freezing #ceOpt1Notice,body.ce-opt2i-freezing #ceEventSwitchNotice,.ce-v447-loading{display:none!important;visibility:hidden!important;opacity:0!important;}
    `;
    document.head.appendChild(st);
  }

  function removeOverlay(){
    if(overlay){ try{ overlay.remove(); }catch(_){ } overlay = null; }
  }

  function clearTimers(){
    clearTimeout(releaseTimer); releaseTimer = 0;
    clearTimeout(watchdogTimer); watchdogTimer = 0;
    clearTimeout(mutationQuietTimer); mutationQuietTimer = 0;
  }

  function disconnectObserver(){
    if(mo){ try{ mo.disconnect(); }catch(_){ } mo = null; }
  }

  function noteMutation(){
    lastMutationAt = now();
    clearTimeout(mutationQuietTimer);
    mutationQuietTimer = setTimeout(() => tryRelease('mutation-quiet'), 180);
  }

  function observeWrap(){
    disconnectObserver();
    const w = wrap();
    if(!w || typeof MutationObserver !== 'function') return;
    mo = new MutationObserver(noteMutation);
    try{ mo.observe(w, {childList:true, subtree:true, attributes:true, characterData:true}); }catch(_){ }
  }

  function makeSnapshot(){
    const t = tab();
    if(!t) return false;
    const r = t.getBoundingClientRect();
    if(!r || r.width < 80 || r.height < 80) return false;
    initialRect = {left:r.left, top:r.top, width:r.width, height:r.height};
    initialScrollY = window.scrollY || window.pageYOffset || 0;

    const clone = t.cloneNode(true);
    clone.id = 'ceOpt2ISnapshotClone';
    try{ clone.querySelectorAll('[id]').forEach((el, i) => { el.id = 'ceOpt2IClone_' + i; }); }catch(_){ }

    const shell = document.createElement('div');
    shell.id = 'ceOpt2ISnapshot';
    shell.className = 'ce-opt2i-snapshot';
    shell.style.left = Math.round(r.left) + 'px';
    shell.style.top = Math.round(r.top) + 'px';
    shell.style.width = Math.round(r.width) + 'px';
    shell.style.height = Math.round(r.height) + 'px';
    shell.appendChild(clone);
    document.body.appendChild(shell);
    overlay = shell;

    try{
      document.documentElement.style.setProperty('--ce-opt2i-tab-h', Math.max(420, Math.round(t.scrollHeight || r.height)) + 'px');
      const w = wrap();
      if(w) document.documentElement.style.setProperty('--ce-opt2i-wrap-h', Math.max(360, Math.round(w.scrollHeight || w.getBoundingClientRect().height || 560)) + 'px');
      t.classList.add('ce-opt2i-underlay');
      document.body.classList.add('ce-opt2i-freezing');
    }catch(_){ }
    return true;
  }

  function alignBeforeRelease(){
    const t = tab();
    if(!t || !initialRect) return;
    try{
      const r = t.getBoundingClientRect();
      const delta = r.top - initialRect.top;
      metrics.lastAlignPx = Math.round(delta);
      if(Number.isFinite(delta) && Math.abs(delta) > 0.5 && Math.abs(delta) < 90){
        window.scrollBy(0, delta);
      }
    }catch(_){ }
  }

  function readyToRelease(reason){
    if(!metrics.active || !graficasVisible()) return true;
    const elapsed = now() - startAt;
    const html = rawHtml(wrap());
    const commits = Number(window.ControlEventOpt2H?.finalCommits || 0);
    const selectedOk = !targetEventId || currentEventId() === targetEventId || $('selectedEvent')?.value === targetEventId;
    const strict = isStrictV46(html);
    const quiet = (now() - lastMutationAt) >= 220;

    // Mantiene la instantánea mientras el sistema hace los repintados internos.
    // Si Opt2H ya hizo algún commit final y el DOM está quieto, se puede revelar.
    if(selectedOk && strict && quiet && elapsed >= 420 && commits > startFinalCommits) return true;
    // En eventos lentos, espera algo más para no soltar justo antes del segundo render.
    if(selectedOk && strict && quiet && elapsed >= 1750) return true;
    return false;
  }

  function release(reason, forced){
    if(!metrics.active && !overlay) return;
    metrics.active = false;
    metrics.releases++;
    if(forced) metrics.forcedReleases++;
    metrics.lastReason = reason || (forced ? 'forced-release' : 'release');
    metrics.lastHoldMs = now() - startAt;
    clearTimers();
    disconnectObserver();
    try{ alignBeforeRelease(); }catch(_){ }
    try{ tab()?.classList.remove('ce-opt2i-underlay'); }catch(_){ }
    try{ document.body.classList.remove('ce-opt2i-freezing'); }catch(_){ }
    removeOverlay();
  }

  function tryRelease(reason){
    if(!metrics.active) return;
    if(readyToRelease(reason)){
      requestAnimationFrame(() => requestAnimationFrame(() => release(reason || 'ready', false)));
      return;
    }
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(() => tryRelease('poll'), 90);
  }

  function begin(eventId, reason){
    injectStyle();
    if(!graficasVisible()) return;
    const t = tab();
    const w = wrap();
    if(!t || !w) return;
    eventId = text(eventId || $('selectedEvent')?.value || currentEventId());
    // Si ya estamos congelados para el mismo cambio, solo ampliamos la espera.
    if(metrics.active){
      targetEventId = eventId || targetEventId;
      lastMutationAt = now();
      clearTimeout(watchdogTimer);
      watchdogTimer = setTimeout(() => release('watchdog', true), 3600);
      tryRelease('begin-again');
      return;
    }
    metrics.active = true;
    metrics.freezes++;
    metrics.lastEventId = eventId;
    metrics.lastReason = reason || 'begin';
    targetEventId = eventId;
    startAt = now();
    lastMutationAt = startAt;
    startFinalCommits = Number(window.ControlEventOpt2H?.finalCommits || 0);
    if(!makeSnapshot()){
      metrics.active = false;
      return;
    }
    observeWrap();
    try{ window.ControlEventOpt2H?.reassert?.('opt2i-begin'); }catch(_){ }
    clearTimeout(watchdogTimer);
    watchdogTimer = setTimeout(() => release('watchdog', true), 3600);
    releaseTimer = setTimeout(() => tryRelease('initial'), 240);
  }

  function install(){
    injectStyle();
    // Opt1 emite este evento justo antes de empezar el cambio efectivo.
    window.addEventListener('controlevent:opt1-event-start', ev => begin(ev.detail?.eventId, 'opt1-event-start'), true);
    window.addEventListener('controlevent:opt1-event-stable', ev => {
      if(!metrics.active) return;
      targetEventId = text(ev.detail?.eventId || targetEventId);
      lastMutationAt = now();
      setTimeout(() => tryRelease('opt1-stable'), 260);
    }, true);
    window.addEventListener('controlevent:event-ready', () => {
      if(metrics.active){ lastMutationAt = now(); setTimeout(() => tryRelease('event-ready'), 260); }
    }, true);
    window.addEventListener('scroll', () => {
      // La instantánea es fija; si el usuario desplaza manualmente, se libera para no tapar la pantalla.
      if(metrics.active && Math.abs((window.scrollY || window.pageYOffset || 0) - initialScrollY) > 80){ release('user-scroll', true); }
    }, {passive:true});
    window.addEventListener('keydown', ev => {
      if(metrics.active && (ev.key === 'Escape' || ev.key === 'Esc')) release('escape', true);
    }, true);
    document.addEventListener('click', ev => {
      if(metrics.active && ev.target?.closest && !ev.target.closest('#selectedEvent')){
        // No se libera por clic normal; solo registra actividad. El objetivo es cubrir los repintados.
        lastMutationAt = now();
      }
    }, true);
  }

  metrics.begin = begin;
  metrics.release = release;
  install();
})();
