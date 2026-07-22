/* ControlEvent v23_prod OPT2J - bloqueo duro de gráficas antiguas + anti segundo repintado.
   Objetivo: que nunca se vea la gráfica antigua de 4 quesos / 2 columnas.
   Estrategia:
   - Se carga muy pronto y también al final para reengancharse.
   - Bloquea cualquier HTML de GRAFICAS que no sea V46 estricta: ce-v46-pies + 6 tarjetas.
   - Ignora asignaciones antiguas a renderGraficas y fuerza el render V46 cuando está disponible.
*/
(function(){
  'use strict';
  const VERSION = 'v23_prod_opt_2j';
  const now = () => Date.now();
  const $ = id => document.getElementById(id);
  const text = v => String(v == null ? '' : v).trim();

  window.__ceDisableLegacyBarGraficas = true;
  window.__ceV16Opt2HGraphHardLock = true;

  if(window.ControlEventOpt2H && typeof window.ControlEventOpt2H.reassert === 'function'){
    try{ window.ControlEventOpt2H.reassert('script-reload'); }catch(_){ }
    return;
  }

  const metrics = window.ControlEventOpt2H = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    hardBlocks: 0,
    blankBlocks: 0,
    oldRendererAssignments: 0,
    v46RendererAssignments: 0,
    objectRendererRewrites: 0,
    mutationRepairs: 0,
    finalSchedules: 0,
    finalRuns: 0,
    finalCommits: 0,
    lastReason: '',
    lastEventId: '',
    lastBlockedSnippet: '',
    duplicateCommitSkips: 0,
    lockedCommitSkips: 0,
    skippedSchedulesFresh: 0
  };

  let protoDesc = null;
  let cachedHtml = '';
  let cachedHeight = 440;
  let v46Renderer = null;
  let exportedWrapper = null;
  let renderTimer = 0;
  let guardTimer = 0;
  let reassertTimer = 0;
  let activeRawCommit = false;
  let lastFinalAt = 0;
  let lastCommitSig = '';
  let lastCommitEventId = '';
  const POST_COMMIT_LOCK_MS = 1450;
  const FRESH_SCHEDULE_LOCK_MS = 1900;

  function normalizedHtmlSig(html){
    html = String(html || '');
    // Firma estable: elimina ruido de estilos/espacios, suficiente para detectar repintados idénticos.
    const norm = html.replace(/style=\"[^\"]*\"/g,'').replace(/data-[a-zA-Z0-9_-]+=\"[^\"]*\"/g,'').replace(/\s+/g,' ').trim();
    let h = 2166136261;
    for(let i=0;i<norm.length;i++){ h ^= norm.charCodeAt(i); h = Math.imul(h, 16777619); }
    return String((h >>> 0).toString(16)) + ':' + norm.length;
  }
  function currentStrictFresh(w){
    w = w || $('eventChartWrap');
    if(!w) return false;
    const ev = currentEventId();
    if(!ev || ev !== lastCommitEventId) return false;
    if(now() - lastFinalAt > FRESH_SCHEDULE_LOCK_MS) return false;
    const html = rawGet(w) || '';
    return isStrictV46Html(html) && !isBlankChartHtml(html);
  }

  function state(){ try{ return (typeof window.state !== 'undefined' && window.state) || window.ControlEventApp?.state || {}; }catch(_){ return {}; } }
  function currentEventId(){ return text(state().selectedEventId || $('selectedEvent')?.value || ''); }
  function graficasVisible(){ const t = $('tabGraficas'); return !!t && !t.classList.contains('hidden'); }

  function injectStyle(){
    if($('ceV16Opt2HStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceV16Opt2HStyle';
    st.textContent = `
      #ceOpt1Notice,#ceEventSwitchNotice,.ce-v447-loading{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #eventChartWrap.ce-opt2h-holding{contain:layout paint;min-height:var(--ce-opt2h-h,440px);}
      #eventChartWrap .ce-v46-pies{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
      @media(max-width:980px){#eventChartWrap .ce-v46-pies{grid-template-columns:repeat(2,minmax(0,1fr))!important;}}
      #eventChartWrap.ce-opt2h-holding *{transition:none!important;animation:none!important;}
    `;
    document.head.appendChild(st);
  }

  function getProtoDesc(){
    if(protoDesc) return protoDesc;
    let p = Element.prototype;
    while(p){
      const d = Object.getOwnPropertyDescriptor(p, 'innerHTML');
      if(d && typeof d.get === 'function' && typeof d.set === 'function'){ protoDesc = d; return d; }
      p = Object.getPrototypeOf(p);
    }
    return null;
  }
  function rawGet(el){ const d = getProtoDesc(); return d ? d.get.call(el) : el.innerHTML; }
  function rawSet(el, html){
    activeRawCommit = true;
    try{ const d = getProtoDesc(); if(d) d.set.call(el, html); else el.innerHTML = html; }
    finally{ activeRawCommit = false; }
  }

  function isChartHtml(html){
    html = String(html || '');
    return html.includes('chart-shell') || html.includes('ce-v413-chart-layout') || html.includes('ce-v434-chart-layout') || html.includes('ce-v434-chart-layout-shell') || html.includes('ce-v46-pies');
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

  function cacheIfStrict(){
    const w = $('eventChartWrap'); if(!w) return false;
    const html = rawGet(w) || '';
    if(isStrictV46Html(html) && !isBlankChartHtml(html)){
      cachedHtml = html;
      cachedHeight = Math.max(420, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedHeight));
      metrics.lastEventId = currentEventId();
      return true;
    }
    return false;
  }
  function hold(reason){
    const w = $('eventChartWrap'); if(!w) return false;
    try{
      w.style.setProperty('--ce-opt2h-h', cachedHeight + 'px');
      w.classList.add('ce-opt2h-holding');
      if(cachedHtml){ rawSet(w, cachedHtml); return true; }
      rawSet(w, '');
      return true;
    }catch(_){ return false; }
  }
  function commitIfStrict(html, reason){
    const w = $('eventChartWrap'); if(!w) return false;
    html = String(html || '');
    if(!isStrictV46Html(html) || isBlankChartHtml(html)) return false;
    const ev = currentEventId();
    const incomingSig = normalizedHtmlSig(html);
    const currentHtml = rawGet(w) || '';
    const currentIsStrict = isStrictV46Html(currentHtml) && !isBlankChartHtml(currentHtml);
    const elapsed = now() - lastFinalAt;

    // OPT2J: una vez que ya se ha pintado la V46 buena del evento, no volvemos a escribir
    // otra V46 inmediatamente. Esos segundos commits eran el pequeño retemblor post-pintado.
    if(currentIsStrict && ev && ev === lastCommitEventId && elapsed >= 0 && elapsed < POST_COMMIT_LOCK_MS){
      if(normalizedHtmlSig(currentHtml) === incomingSig){ metrics.duplicateCommitSkips++; }
      else { metrics.lockedCommitSkips++; }
      cachedHtml = currentHtml;
      cachedHeight = Math.max(420, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedHeight));
      metrics.lastReason = 'skip-postcommit-' + (reason || 'commit');
      return true;
    }

    if(currentIsStrict && normalizedHtmlSig(currentHtml) === incomingSig && ev && ev === lastCommitEventId){
      metrics.duplicateCommitSkips++;
      cachedHtml = currentHtml;
      cachedHeight = Math.max(420, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedHeight));
      metrics.lastReason = 'skip-duplicate-' + (reason || 'commit');
      return true;
    }

    rawSet(w, html);
    w.classList.remove('ce-opt2h-holding','ce-opt2g-holding','ce-opt2f-holding','ce-opt2e-frozen','ce-opt2c-holding','ce-opt2c-rendering');
    w.classList.add('ce-opt2h-final');
    cachedHtml = html;
    cachedHeight = Math.max(420, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedHeight));
    metrics.finalCommits++;
    metrics.lastReason = reason || 'commit';
    metrics.lastEventId = ev;
    lastFinalAt = now();
    lastCommitEventId = ev;
    lastCommitSig = incomingSig;
    return true;
  }

  function looksV46Renderer(fn){
    if(typeof fn !== 'function') return false;
    try{
      const src = Function.prototype.toString.call(fn);
      return src.includes('ce-v46-pies') && src.includes('VALORACION DEL EVENTO') && src.includes('SALDO ACTUAL');
    }catch(_){ return false; }
  }
  function unwrap(fn){
    let f = fn;
    const seen = new Set();
    while(typeof f === 'function' && !seen.has(f)){
      seen.add(f);
      const n = f.__ceOpt2HOriginal || f.__ceOpt2GOriginal || f.__ceOpt2FOriginal || f.__ceOpt2EOriginal || f.__ceOpt2COriginal || f.__ceOpt2Original;
      if(!n || n === f) break;
      f = n;
    }
    return f;
  }
  function findV46Renderer(){
    if(looksV46Renderer(v46Renderer)) return v46Renderer;
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
      if(looksV46Renderer(f)){ v46Renderer = f; return f; }
    }
    return null;
  }
  function runFinal(reason){
    clearTimeout(renderTimer);
    if(!graficasVisible()) return;
    const w = $('eventChartWrap'); if(!w) return;
    if(currentStrictFresh(w)){
      metrics.skippedSchedulesFresh++;
      metrics.lastReason = 'skip-run-fresh-' + (reason || 'final');
      return;
    }
    const fn = findV46Renderer();
    if(typeof fn !== 'function'){
      hold('no-v46-' + (reason || ''));
      scheduleFinal('wait-v46', 180);
      return;
    }
    metrics.finalRuns++;
    try{ fn.call(window.ControlEventV462 || window.ControlEventV461 || window.ControlEventV460 || window, {force:true, reason:'v23_prod_opt_2h_' + (reason || 'final')}); }
    catch(err){ console.warn('[v23_prod_opt_2h] render V46', err); }
    const html = rawGet(w) || '';
    if(!commitIfStrict(html, reason || 'final')){
      if(isWrongChartHtml(html) || isBlankChartHtml(html)){
        blockWrong(w, html, 'after-final-' + (reason || ''));
      }
    }
  }
  function scheduleFinal(reason, delay){
    if(!graficasVisible()) return;
    const w = $('eventChartWrap');
    if(currentStrictFresh(w)){
      metrics.skippedSchedulesFresh++;
      metrics.lastReason = 'skip-schedule-fresh-' + (reason || 'scheduled');
      return;
    }
    metrics.finalSchedules++;
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => runFinal(reason || 'scheduled'), Number(delay == null ? 140 : delay));
  }

  function blockWrong(w, html, reason){
    if(!w) return;
    metrics.hardBlocks++;
    metrics.lastReason = reason || 'block';
    metrics.lastBlockedSnippet = String(html || '').replace(/\s+/g,' ').slice(0,220);
    if(isBlankChartHtml(html)) metrics.blankBlocks++;
    hold(reason || 'blocked');
    scheduleFinal(reason || 'blocked', 120);
  }

  function patchWrap(){
    const w = $('eventChartWrap');
    if(!w) return;
    try{
      Object.defineProperty(w, 'innerHTML', {
        configurable: true,
        get(){ return rawGet(this); },
        set(v){
          if(activeRawCommit){ rawSet(this, v); return; }
          const html = String(v == null ? '' : v);
          if(isStrictV46Html(html) && !isBlankChartHtml(html)){
            commitIfStrict(html, 'setter-v46');
            return;
          }
          if(isLoadingHtml(html) || isBlankChartHtml(html) || isWrongChartHtml(html)){
            blockWrong(this, html, isLoadingHtml(html) ? 'setter-loading' : 'setter-wrong-old-chart');
            return;
          }
          rawSet(this, html);
        }
      });
      w.__ceOpt2HHardLocked = true;
    }catch(err){ console.warn('[v23_prod_opt_2h] patch wrap', err); }
  }

  function makeWrapper(){
    if(exportedWrapper) return exportedWrapper;
    exportedWrapper = function(options){
      scheduleFinal(text(options?.reason || 'renderGraficas'), options?.force === 'hard' ? 20 : 120);
      return undefined;
    };
    exportedWrapper.__ceOpt2HWrapped = true;
    Object.defineProperty(exportedWrapper, '__ceOpt2HOriginal', {value: () => v46Renderer, configurable:true});
    return exportedWrapper;
  }
  function patchRenderGlobal(){
    const wrapper = makeWrapper();
    try{
      const current = unwrap(window.renderGraficas);
      if(looksV46Renderer(current)) v46Renderer = current;
      Object.defineProperty(window, 'renderGraficas', {
        configurable: true,
        get(){ return wrapper; },
        set(fn){
          const real = unwrap(fn);
          if(looksV46Renderer(real)){
            v46Renderer = real;
            metrics.v46RendererAssignments++;
            scheduleFinal('v46-assigned', 90);
          }else if(typeof fn === 'function'){
            metrics.oldRendererAssignments++;
          }
        }
      });
      try{ renderGraficas = wrapper; }catch(_){ }
    }catch(err){
      try{ window.renderGraficas = wrapper; }catch(_){ }
    }
  }
  function patchKnownObjects(){
    const wrapper = makeWrapper();
    const names = ['ControlEventV413','ControlEventV434','ControlEventV435','ControlEventV436','ControlEventV460','ControlEventV461','ControlEventV462','__ceV254','__ceV255'];
    names.forEach(name => {
      const obj = window[name];
      if(!obj || typeof obj.renderGraficas !== 'function') return;
      const real = unwrap(obj.renderGraficas);
      if(looksV46Renderer(real)) v46Renderer = real;
      if(obj.renderGraficas !== wrapper){
        try{ obj.renderGraficas = wrapper; metrics.objectRendererRewrites++; }catch(_){ }
      }
    });
  }
  function guardDom(reason){
    const w = $('eventChartWrap'); if(!w || !graficasVisible()) return;
    const html = rawGet(w) || '';
    if(isStrictV46Html(html) && !isBlankChartHtml(html)){ cacheIfStrict(); return; }
    if(isWrongChartHtml(html) || isBlankChartHtml(html) || isLoadingHtml(html)){
      metrics.mutationRepairs++;
      blockWrong(w, html, 'guard-' + (reason || ''));
    }
  }
  function installObserver(){
    const w = $('eventChartWrap');
    if(!w || w.__ceOpt2HObserver) return;
    w.__ceOpt2HObserver = true;
    const mo = new MutationObserver(() => {
      clearTimeout(guardTimer);
      guardTimer = setTimeout(() => guardDom('mutation'), 0);
    });
    mo.observe(w, {childList:true, subtree:true, attributes:true, attributeFilter:['class','style']});
  }

  function reassert(reason){
    window.__ceDisableLegacyBarGraficas = true;
    window.__ceV16Opt2HGraphHardLock = true;
    injectStyle();
    patchWrap();
    patchRenderGlobal();
    patchKnownObjects();
    installObserver();
    cacheIfStrict();
    guardDom(reason || 'reassert');
    if(graficasVisible() && !currentStrictFresh()) scheduleFinal(reason || 'reassert', 160);
  }
  metrics.reassert = reassert;

  window.addEventListener('change', ev => {
    if(ev.target?.id === 'selectedEvent'){
      cacheIfStrict();
      reassert('selected-event-change');
      scheduleFinal('selected-event-change', 360);
      setTimeout(() => { reassert('selected-event-late'); scheduleFinal('selected-event-late', 80); }, 900);
    }
  }, true);
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:module-mounted','controlevent:event-ready','controlevent:opt1-event-stable'].forEach(name => {
    window.addEventListener(name, () => reassert(name), true);
  });

  reassert('install');
  [0,120,420,1000,2200].forEach(ms => setTimeout(() => reassert('boot-'+ms), ms));
  reassertTimer = setInterval(() => {
    reassert('interval');
    if(now() - (new Date(metrics.installedAt).getTime()) > 8000){ clearInterval(reassertTimer); }
  }, 1200);
})();
