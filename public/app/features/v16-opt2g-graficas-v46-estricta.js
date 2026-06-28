/* ControlEvent v16_prod OPT2G - GRAFICAS: solo renderer V46 estricto.
   Corrige el caso en el que se cuela la gráfica antigua de 2 quesos de ancho.
   La única gráfica aceptada en #eventChartWrap debe contener .ce-v46-pies con 6 tarjetas.
*/
(function(){
  'use strict';
  if(window.__ceV16Opt2GInstalled) return;
  window.__ceV16Opt2GInstalled = true;

  const VERSION = 'v16_opt_2g';
  const $ = id => document.getElementById(id);
  const text = v => String(v == null ? '' : v).trim();
  const now = () => Date.now();
  const graficasVisible = () => !!$('tabGraficas') && !$('tabGraficas').classList.contains('hidden');
  const state = () => window.state || window.ControlEventApp?.state || {};
  const currentEventId = () => text(state().selectedEventId || $('selectedEvent')?.value || '');
  const arr = k => Array.isArray(state()[k]) ? state()[k] : [];
  const rowEvent = r => text(r?.eventId || r?.eventoId || r?.event_id || r?.evento_id || r?.idEvento || r?.evento || '');
  const belongs = (r, ev) => !rowEvent(r) || rowEvent(r) === ev;
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    const s = String(v ?? '').replace(/\./g,'').replace(',', '.').replace(/[^0-9.-]/g,'');
    const n = Number(s); return Number.isFinite(n) ? n : 0;
  };

  const metrics = window.ControlEventOpt2G = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    blockedWrongCharts: 0,
    blockedBlankCharts: 0,
    finalRenderRequests: 0,
    finalRuns: 0,
    finalCommits: 0,
    duplicateSkips: 0,
    mutationRepairs: 0,
    rendererPatches: 0,
    lastReason: '',
    lastEventId: '',
    lastSig: ''
  };

  let protoDesc = null;
  let patchedWrap = null;
  let finalRenderer = null;
  let scheduleTimer = 0;
  let patchTimer = 0;
  let cachedHtml = '';
  let cachedHeight = 440;
  let lastCommittedHtml = '';
  let lastCommittedSig = '';
  let lastCommitAt = 0;
  let runningFinal = false;

  function injectStyle(){
    if($('ceV16Opt2GStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceV16Opt2GStyle';
    st.textContent = `
      #ceOpt1Notice,#ceEventSwitchNotice,.ce-v447-loading{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #eventChartWrap.ce-opt2g-holding{contain:layout paint;min-height:var(--ce-opt2g-h,440px);}
      #eventChartWrap.ce-opt2g-final{contain:layout paint;}
      #eventChartWrap .ce-v46-pies{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
      @media(max-width:980px){#eventChartWrap .ce-v46-pies{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}
      #eventChartWrap.ce-opt2g-holding *{transition:none!important;animation:none!important;}
    `;
    document.head.appendChild(st);
  }
  function getProtoDesc(){
    if(protoDesc) return protoDesc;
    let p = Element.prototype;
    while(p){
      const d = Object.getOwnPropertyDescriptor(p, 'innerHTML');
      if(d && typeof d.get === 'function' && typeof d.set === 'function'){
        protoDesc = d; return d;
      }
      p = Object.getPrototypeOf(p);
    }
    return null;
  }
  function rawGet(el){ const d = getProtoDesc(); return d ? d.get.call(el) : el.innerHTML; }
  function rawSet(el, html){ const d = getProtoDesc(); if(d) d.set.call(el, html); else el.innerHTML = html; }

  function isChartHtml(html){
    html = String(html || '');
    return html.includes('chart-shell') || html.includes('ce-v434-chart-layout') || html.includes('ce-v434-chart-layout-shell');
  }
  function isLoadingHtml(html){ return /Cargando\s+(nuevo\s+)?evento|Calculando\s+gr[aá]ficas|ce-v447-loading/i.test(String(html || '')); }
  function pieCount(html){ return (String(html || '').match(/ce-v434-pie-card/g) || []).length; }
  function isStrictV46Html(html){
    html = String(html || '');
    return isChartHtml(html) && html.includes('ce-v46-pies') && pieCount(html) >= 6 &&
      /SALDO ACTUAL/i.test(html) && /SALDO OPERATIVO/i.test(html) && /VALORACION DEL EVENTO/i.test(html);
  }
  function isBlankChartHtml(html){
    html = String(html || '');
    if(!html || isLoadingHtml(html)) return true;
    if(!isChartHtml(html)) return false;
    const slices = (html.match(/ce-v434-pie-slice/g) || []).length;
    const sinDatos = (html.match(/Sin datos/g) || []).length;
    const ceros = (html.match(/0,00\s*€/g) || []).length;
    return slices === 0 && (sinDatos >= 2 || ceros >= 5 || /Sin datos por destino/i.test(html));
  }
  function isWrongChartHtml(html){ return isChartHtml(html) && !isStrictV46Html(html); }

  function chartSig(){
    const ev = currentEventId();
    const sum = (xs, fields) => xs.reduce((a,r) => {
      for(const f of fields){ if(r && r[f] != null) return a + num(r[f]); }
      return a;
    },0);
    const ingresos = arr('colaboradores').filter(r => belongs(r, ev));
    const compras = arr('compras').filter(r => belongs(r, ev));
    const donaciones = arr('donaciones').filter(r => belongs(r, ev));
    return [ev,
      ingresos.length + ':' + Math.round(sum(ingresos, ['importe','cantidad','total','ingresado','aportacion','importeSocio','importeNoSocio'])*100),
      compras.length + ':' + Math.round(sum(compras, ['importe','total','valor','precioTotal','precio','basePrice'])*100),
      donaciones.length + ':' + Math.round(sum(donaciones, ['importe','total','valor','precioTotal','precio','basePrice'])*100)
    ].join('|');
  }
  function eventHasAnyData(){
    const ev = currentEventId();
    return arr('colaboradores').some(r => belongs(r, ev)) || arr('compras').some(r => belongs(r, ev)) || arr('donaciones').some(r => belongs(r, ev));
  }

  function unwrap(fn){
    let f = fn;
    const seen = new Set();
    while(typeof f === 'function' && !seen.has(f)){
      seen.add(f);
      const next = f.__ceOpt2GOriginal || f.__ceOpt2FOriginal || f.__ceOpt2EOriginal || f.__ceOpt2COriginal || f.__ceOpt2BOriginal || f.__ceV16Opt2Original || f.__ceOpt2Original;
      if(!next || next === f) break;
      f = next;
    }
    return f;
  }
  function looksV46Renderer(fn){
    if(typeof fn !== 'function') return false;
    const src = Function.prototype.toString.call(fn);
    return src.includes('ce-v46-pies') && src.includes('VALORACION DEL EVENTO') && src.includes('SALDO ACTUAL');
  }
  function findV46Renderer(){
    if(looksV46Renderer(finalRenderer)) return finalRenderer;
    const candidates = [
      window.ControlEventV462?.renderGraficas,
      window.ControlEventV461?.renderGraficas,
      window.ControlEventV460?.renderGraficas,
      window.ControlEventV434?.renderGraficas,
      window.ControlEventV435?.renderGraficas,
      window.ControlEventV436?.renderGraficas,
      window.renderGraficas
    ];
    for(const c of candidates){
      const f = unwrap(c);
      if(looksV46Renderer(f)){ finalRenderer = f; return f; }
    }
    return null;
  }

  function cacheIfStrict(){
    const w = $('eventChartWrap'); if(!w) return false;
    const html = rawGet(w) || '';
    if(isStrictV46Html(html) && !isBlankChartHtml(html)){
      cachedHtml = html;
      cachedHeight = Math.max(420, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedHeight));
      return true;
    }
    return false;
  }
  function holdCached(reason){
    const w = $('eventChartWrap'); if(!w || !cachedHtml) return false;
    try{
      w.style.setProperty('--ce-opt2g-h', cachedHeight + 'px');
      w.classList.add('ce-opt2g-holding');
      rawSet(w, cachedHtml);
      metrics.lastReason = reason || metrics.lastReason;
      return true;
    }catch(_){ return false; }
  }
  function commitStrict(html, reason){
    const w = $('eventChartWrap'); if(!w) return false;
    html = String(html || '');
    if(!isStrictV46Html(html) || isBlankChartHtml(html)) return false;
    const sig = chartSig();
    if(sig === lastCommittedSig && html === lastCommittedHtml && now() - lastCommitAt < 3500){
      metrics.duplicateSkips++;
      cachedHtml = html;
      return true;
    }
    rawSet(w, html);
    w.classList.remove('ce-opt2g-holding','ce-opt2f-holding','ce-opt2e-frozen','ce-opt2c-holding','ce-opt2c-rendering');
    w.classList.add('ce-opt2g-final');
    cachedHtml = html;
    cachedHeight = Math.max(420, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedHeight));
    lastCommittedHtml = html;
    lastCommittedSig = sig;
    lastCommitAt = now();
    metrics.finalCommits++;
    metrics.lastReason = reason || 'commit';
    metrics.lastEventId = currentEventId();
    metrics.lastSig = sig;
    return true;
  }

  function runFinal(reason){
    clearTimeout(scheduleTimer);
    if(!graficasVisible()) return;
    const w = $('eventChartWrap'); const fn = findV46Renderer();
    if(!w || typeof fn !== 'function') return;
    if(!eventHasAnyData() && cachedHtml){ holdCached('wait-data-' + (reason || '')); scheduleFinal('wait-data', 360); return; }
    metrics.finalRuns++;
    runningFinal = true;
    try{ fn.call(window.ControlEventV462 || window.ControlEventV461 || window.ControlEventV460 || window, {force:true, reason:'v16_opt_2g_' + (reason || 'final')}); }
    catch(err){ console.warn('[v16_opt_2g] render final gráficas', err); }
    finally{ runningFinal = false; }
    const html = rawGet(w) || '';
    if(!commitStrict(html, reason || 'final')){
      if(isWrongChartHtml(html) || isBlankChartHtml(html)){
        metrics.blockedWrongCharts++;
        if(!holdCached('after-wrong-final')) rawSet(w, '');
      }
    }
  }
  function scheduleFinal(reason, delay){
    if(!graficasVisible()) return;
    metrics.finalRenderRequests++;
    cacheIfStrict();
    holdCached('schedule-' + (reason || ''));
    clearTimeout(scheduleTimer);
    scheduleTimer = setTimeout(() => runFinal(reason || 'scheduled'), Number(delay == null ? 220 : delay));
  }

  function patchWrap(){
    const w = $('eventChartWrap');
    if(!w || patchedWrap === w) return;
    patchedWrap = w;
    cacheIfStrict();
    Object.defineProperty(w, 'innerHTML', {
      configurable: true,
      get(){ return rawGet(this); },
      set(v){
        const html = String(v == null ? '' : v);
        if(isStrictV46Html(html) && !isBlankChartHtml(html)){
          commitStrict(html, runningFinal ? 'strict-from-v46' : 'strict-external');
          return;
        }
        if(isLoadingHtml(html) || isBlankChartHtml(html)){
          metrics.blockedBlankCharts++;
          if(!holdCached('block-loading-blank')) rawSet(this, '');
          scheduleFinal('blocked-blank', 260);
          return;
        }
        if(isWrongChartHtml(html)){
          metrics.blockedWrongCharts++;
          if(!holdCached('block-non-v46-chart')) rawSet(this, '');
          scheduleFinal('blocked-wrong-chart', 160);
          return;
        }
        rawSet(this, html);
      }
    });
  }

  function patchReplaceChildren(){
    const w = $('eventChartWrap');
    if(!w || w.__ceOpt2GReplacePatched) return;
    w.__ceOpt2GReplacePatched = true;
    const old = w.replaceChildren;
    if(typeof old === 'function'){
      w.replaceChildren = function(){
        if(arguments.length === 0 && graficasVisible()){
          metrics.blockedBlankCharts++;
          if(holdCached('block-empty-replace')){ scheduleFinal('empty-replace', 240); return undefined; }
        }
        const ret = old.apply(this, arguments);
        setTimeout(() => guardCurrentDom('replaceChildren'), 0);
        return ret;
      };
    }
  }

  function guardCurrentDom(reason){
    const w = $('eventChartWrap'); if(!w || !graficasVisible()) return;
    const html = rawGet(w) || '';
    if(isStrictV46Html(html) && !isBlankChartHtml(html)){ cacheIfStrict(); return; }
    if(isWrongChartHtml(html) || isBlankChartHtml(html) || isLoadingHtml(html)){
      metrics.mutationRepairs++;
      if(!holdCached('guard-' + (reason || ''))) rawSet(w, '');
      scheduleFinal('guard-' + (reason || ''), 100);
    }
  }
  function mutationGuard(){
    const w = $('eventChartWrap');
    if(!w || w.__ceOpt2GObserver) return;
    w.__ceOpt2GObserver = true;
    const mo = new MutationObserver(() => {
      if(runningFinal) return;
      setTimeout(() => guardCurrentDom('mutation'), 0);
    });
    mo.observe(w, {childList:true, subtree:false, attributes:true, attributeFilter:['class','style']});
  }

  function makeWrapper(){
    const original = findV46Renderer();
    const wrapper = function(options){
      if(!graficasVisible()) return undefined;
      scheduleFinal(text(options?.reason || 'render-request'), options?.force === 'hard' ? 60 : 180);
      return undefined;
    };
    wrapper.__ceOpt2GWrapped = true;
    wrapper.__ceOpt2GOriginal = original || finalRenderer;
    return wrapper;
  }
  function patchRenderers(){
    const original = findV46Renderer();
    if(typeof original !== 'function') return;
    const wrapper = makeWrapper();
    try{ window.renderGraficas = wrapper; renderGraficas = wrapper; }catch(_){ window.renderGraficas = wrapper; }
    [window.ControlEventV413, window.ControlEventV434, window.ControlEventV435, window.ControlEventV436, window.ControlEventV460, window.ControlEventV461, window.ControlEventV462].filter(Boolean).forEach(o => {
      try{ o.renderGraficas = wrapper; metrics.rendererPatches++; }catch(_){ }
    });
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.renderGraficas = wrapper; }catch(_){ }
  }

  function install(){
    injectStyle();
    patchWrap();
    patchReplaceChildren();
    mutationGuard();
    patchRenderers();
    guardCurrentDom('install');
  }

  window.addEventListener('change', ev => {
    if(ev.target?.id === 'selectedEvent'){
      cacheIfStrict();
      scheduleFinal('selected-event-change', 520);
      setTimeout(() => scheduleFinal('selected-event-settled', 900), 900);
    }
  }, true);
  ['controlevent:opt1-event-stable','controlevent:event-ready','controlevent:module-mounted','controlevent:runtime-ready','controlevent:app-ready','load','DOMContentLoaded'].forEach(name => {
    window.addEventListener(name, () => {
      clearTimeout(patchTimer);
      patchTimer = setTimeout(install, 20);
      if(name !== 'DOMContentLoaded') scheduleFinal(name, name === 'controlevent:event-ready' ? 260 : 420);
    }, true);
  });
  [0,60,180,420,900,1600,2800].forEach(ms => setTimeout(() => { install(); if(graficasVisible()) scheduleFinal('boot-'+ms, ms < 300 ? 120 : 260); }, ms));
})();
