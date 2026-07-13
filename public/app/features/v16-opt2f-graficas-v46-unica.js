/* ControlEvent v19_prod OPT2F - GRAFICAS: renderer único v46 / 3 quesos de ancho.
   Alcance cerrado: solo estabilización visual de GRAFICAS.
   Objetivo: bloquear la gráfica antigua de 4 quesos / 2 columnas que se pintaba antes
   y dejar un único pintado final con la gráfica v46 (6 quesos / 3 columnas).
*/
(function(){
  'use strict';
  if(window.__ceV16Opt2FInstalled) return;
  window.__ceV16Opt2FInstalled = true;

  const VERSION = 'v19_prod_opt_2f';
  const $ = id => document.getElementById(id);
  const txt = v => String(v == null ? '' : v).trim();
  const now = () => Date.now();
  const visible = () => !!$('tabGraficas') && !$('tabGraficas').classList.contains('hidden');
  const currentEventId = () => txt((window.state || window.ControlEventApp?.state || {}).selectedEventId || $('selectedEvent')?.value || '');

  const metrics = window.ControlEventOpt2F = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    blockedLegacyGraphs: 0,
    blockedLoadingGraphs: 0,
    finalRenders: 0,
    finalCommits: 0,
    duplicateSkips: 0,
    rendererPatched: 0,
    lastReason: '',
    lastEventId: '',
    lastCommitAt: 0
  };

  let rawDesc = null;
  let patchedWrap = null;
  let allowCommit = false;
  let cachedFinalHtml = '';
  let cachedFinalHeight = 420;
  let finalTimer = 0;
  let lastFinalSig = '';
  let lastFinalHtml = '';
  let finalRenderer = null;
  let patchTimer = 0;

  function injectStyle(){
    if($('ceV16Opt2FStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceV16Opt2FStyle';
    st.textContent = `
      #ceOpt1Notice,#ceEventSwitchNotice,.ce-v447-loading{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #eventChartWrap.ce-opt2f-holding{contain:layout paint;min-height:var(--ce-opt2f-h,420px);}
      #eventChartWrap.ce-opt2f-final{contain:layout paint;}
      #eventChartWrap.ce-opt2f-holding *{transition:none!important;animation:none!important;}
    `;
    document.head.appendChild(st);
  }

  function getRawDesc(){
    if(rawDesc) return rawDesc;
    let p = Element.prototype;
    while(p){
      const d = Object.getOwnPropertyDescriptor(p, 'innerHTML');
      if(d && typeof d.get === 'function' && typeof d.set === 'function'){
        rawDesc = d;
        return d;
      }
      p = Object.getPrototypeOf(p);
    }
    return null;
  }
  function rawGet(el){ const d = getRawDesc(); return d ? d.get.call(el) : el.innerHTML; }
  function rawSet(el, html){ const d = getRawDesc(); if(d) d.set.call(el, html); else el.innerHTML = html; }

  function isChartHtml(html){
    html = String(html || '');
    return html.includes('chart-shell') || html.includes('ce-v434-chart-layout') || html.includes('ce-v434-chart-layout-shell');
  }
  function isLoadingHtml(html){
    return /Cargando\s+(nuevo\s+)?evento|Calculando\s+gr[aá]ficas|ce-v447-loading/i.test(String(html || ''));
  }
  function isFinalGraphHtml(html){
    html = String(html || '');
    if(!isChartHtml(html)) return false;
    return html.includes('ce-v46-pies') || (/SALDO ACTUAL/i.test(html) && /VALORACION DEL EVENTO/i.test(html));
  }
  function isLegacyGraphHtml(html){
    html = String(html || '');
    if(!isChartHtml(html) || isFinalGraphHtml(html)) return false;
    const pieCards = (html.match(/ce-v434-pie-card/g) || []).length;
    // La versión antigua que está causando el temblor pinta 4 quesos: ingresos, donación, gastos y saldo operativo.
    if(pieCards > 0 && pieCards < 6) return true;
    if(/DONACI[ÓO]N DE PRODUCTO/i.test(html) && /SALDO OPERATIVO/i.test(html) && !/SALDO ACTUAL|VALORACION DEL EVENTO/i.test(html)) return true;
    return false;
  }
  function isBlankGraphHtml(html){
    html = String(html || '');
    if(!html || isLoadingHtml(html)) return true;
    if(!isChartHtml(html)) return false;
    const slices = (html.match(/ce-v434-pie-slice/g) || []).length;
    const sinDatos = (html.match(/Sin datos/g) || []).length;
    const ceros = (html.match(/0,00\s*€/g) || []).length;
    return slices === 0 && (sinDatos >= 2 || ceros >= 5 || /Sin datos por destino/i.test(html));
  }

  function unwrap(fn){
    let f = fn;
    const seen = new Set();
    while(typeof f === 'function' && !seen.has(f)){
      seen.add(f);
      const next = f.__ceOpt2FOriginal || f.__ceOpt2EOriginal || f.__ceOpt2COriginal || f.__ceOpt2BOriginal || f.__ceV16Opt2Original || f.__ceOpt2Original;
      if(!next || next === f) break;
      f = next;
    }
    return f;
  }
  function looksFinalRenderer(fn){
    if(typeof fn !== 'function') return false;
    const src = Function.prototype.toString.call(fn);
    return src.includes('ce-v46-pies') || src.includes('SALDO ACTUAL') || src.includes('VALORACION DEL EVENTO');
  }
  function findFinalRenderer(){
    if(looksFinalRenderer(finalRenderer)) return finalRenderer;
    const candidates = [
      window.ControlEventV462?.renderGraficas,
      window.ControlEventV461?.renderGraficas,
      window.ControlEventV460?.renderGraficas,
      window.ControlEventV434?.renderGraficas,
      window.ControlEventV435?.renderGraficas,
      window.ControlEventV436?.renderGraficas,
      window.renderGraficas
    ];
    for(const candidate of candidates){
      const f = unwrap(candidate);
      if(looksFinalRenderer(f)){
        finalRenderer = f;
        return f;
      }
    }
    return null;
  }

  function captureFinal(){
    const w = $('eventChartWrap');
    if(!w) return false;
    const html = rawGet(w) || '';
    if(isFinalGraphHtml(html) && !isBlankGraphHtml(html)){
      cachedFinalHtml = html;
      cachedFinalHeight = Math.max(380, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || 420));
      return true;
    }
    return false;
  }
  function holdFinal(reason){
    const w = $('eventChartWrap');
    if(!w) return;
    captureFinal();
    if(cachedFinalHtml){
      try{
        w.style.setProperty('--ce-opt2f-h', cachedFinalHeight + 'px');
        w.classList.add('ce-opt2f-holding');
        rawSet(w, cachedFinalHtml);
      }catch(_){ }
    }
    metrics.lastReason = reason || metrics.lastReason;
  }

  function eventSignature(){
    const st = window.state || window.ControlEventApp?.state || {};
    const ev = currentEventId();
    const rowEv = r => txt(r?.eventId || r?.eventoId || r?.event_id || r?.evento_id || r?.idEvento || r?.evento || '');
    const belongs = r => !rowEv(r) || rowEv(r) === ev;
    const count = k => Array.isArray(st[k]) ? st[k].filter(belongs).length : 0;
    return [ev, count('colaboradores'), count('compras'), count('donaciones'), count('ticketImages'), count('documentos')].join('|');
  }

  function commitFinalHtml(html, reason){
    const w = $('eventChartWrap');
    if(!w || !isFinalGraphHtml(html) || isBlankGraphHtml(html)) return false;
    const sig = eventSignature();
    if(sig === lastFinalSig && html === lastFinalHtml && now() - metrics.lastCommitAt < 2500){
      metrics.duplicateSkips++;
      return true;
    }
    allowCommit = true;
    try{
      rawSet(w, html);
      w.classList.remove('ce-opt2f-holding','ce-opt2e-frozen','ce-opt2c-holding','ce-opt2c-rendering');
      w.classList.add('ce-opt2f-final');
      cachedFinalHtml = html;
      cachedFinalHeight = Math.max(380, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedFinalHeight));
      lastFinalSig = sig;
      lastFinalHtml = html;
      metrics.finalCommits++;
      metrics.lastReason = reason || 'commit';
      metrics.lastEventId = currentEventId();
      metrics.lastCommitAt = now();
      return true;
    }finally{
      allowCommit = false;
    }
  }

  function finalPaint(reason){
    clearTimeout(finalTimer);
    if(!visible()) return;
    const w = $('eventChartWrap');
    const fn = findFinalRenderer();
    if(!w || typeof fn !== 'function') return;
    metrics.finalRenders++;
    metrics.lastReason = reason || 'final';
    allowCommit = true;
    try{
      fn.call(window.ControlEventV462 || window.ControlEventV461 || window.ControlEventV460 || window, {force:true, reason:'v19_prod_opt_2f_' + (reason || 'final')});
    }catch(err){
      console.warn('[v19_prod_opt_2f] render final gráficas', err);
    }finally{
      allowCommit = false;
    }
    const html = rawGet(w) || '';
    if(isFinalGraphHtml(html) && !isBlankGraphHtml(html)) commitFinalHtml(html, reason || 'final-render');
    else if(cachedFinalHtml) holdFinal('fallback-after-final');
  }
  function scheduleFinal(reason, delay){
    if(!visible()) return;
    holdFinal(reason || 'schedule');
    clearTimeout(finalTimer);
    finalTimer = setTimeout(() => finalPaint(reason || 'scheduled'), Number(delay == null ? 360 : delay));
  }

  function patchChartWrap(){
    const w = $('eventChartWrap');
    if(!w || patchedWrap === w) return;
    patchedWrap = w;
    captureFinal();
    Object.defineProperty(w, 'innerHTML', {
      configurable: true,
      get(){ return rawGet(this); },
      set(v){
        const html = String(v == null ? '' : v);
        if(allowCommit){ rawSet(this, html); return; }
        if(isLoadingHtml(html) || isBlankGraphHtml(html)){
          metrics.blockedLoadingGraphs++;
          holdFinal('block-loading-or-blank');
          scheduleFinal('blocked-loading', 420);
          return;
        }
        if(isLegacyGraphHtml(html)){
          metrics.blockedLegacyGraphs++;
          holdFinal('block-legacy-4-pies');
          scheduleFinal('blocked-legacy', 300);
          return;
        }
        if(isFinalGraphHtml(html)){
          // Cualquier gráfica buena se confirma una sola vez y se cachea.
          commitFinalHtml(html, 'setter-final');
          return;
        }
        rawSet(this, html);
      }
    });
  }

  function makeWrapper(){
    const original = findFinalRenderer();
    const wrapper = function(options){
      if(!visible()) return undefined;
      scheduleFinal(txt(options?.reason || 'render-request'), 360);
      return undefined;
    };
    wrapper.__ceOpt2FWrapped = true;
    wrapper.__ceOpt2FOriginal = original || finalRenderer;
    return wrapper;
  }
  function patchRenderers(){
    const original = findFinalRenderer();
    if(typeof original !== 'function') return;
    const wrapper = makeWrapper();
    try{ window.renderGraficas = wrapper; renderGraficas = wrapper; }catch(_){ window.renderGraficas = wrapper; }
    [window.ControlEventV413, window.ControlEventV434, window.ControlEventV435, window.ControlEventV436, window.ControlEventV460, window.ControlEventV461, window.ControlEventV462].filter(Boolean).forEach(o => {
      try{ o.renderGraficas = wrapper; metrics.rendererPatched++; }catch(_){ }
    });
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.renderGraficas = wrapper; }catch(_){ }
  }

  function mutationGuard(){
    const w = $('eventChartWrap');
    if(!w || w.__ceOpt2FObserver) return;
    w.__ceOpt2FObserver = true;
    const mo = new MutationObserver(() => {
      if(allowCommit) return;
      const html = rawGet(w) || '';
      if(isLegacyGraphHtml(html)){
        metrics.blockedLegacyGraphs++;
        holdFinal('mutation-legacy');
        scheduleFinal('mutation-legacy', 300);
      }
    });
    mo.observe(w, {childList:true, subtree:false});
  }

  function install(){
    injectStyle();
    patchChartWrap();
    mutationGuard();
    patchRenderers();
    if(visible()) scheduleFinal('install', 220);
  }

  window.addEventListener('change', ev => {
    if(ev.target?.id === 'selectedEvent') scheduleFinal('selected-event-change', 520);
  }, true);
  ['controlevent:opt1-event-stable','controlevent:event-ready','controlevent:module-mounted','controlevent:runtime-ready','controlevent:app-ready','load','DOMContentLoaded'].forEach(name => {
    window.addEventListener(name, () => {
      clearTimeout(patchTimer);
      patchTimer = setTimeout(install, 30);
      if(name !== 'DOMContentLoaded') scheduleFinal(name, name === 'controlevent:event-ready' ? 380 : 520);
    }, true);
  });
  [0,80,240,700,1400,2600].forEach(ms => setTimeout(install, ms));
})();
