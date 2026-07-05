/* ControlEvent v18_prod OPT2D - Gráficas sin avisos negros y con repintado estabilizado.
   Alcance cerrado: GRAFICAS + hidratación de justificantes al cambiar evento.
   Estrategia:
   - No pinta estados intermedios vacíos durante el cambio de evento.
   - Mantiene el último gráfico válido hasta tener HTML nuevo no vacío.
   - Coalescea múltiples repintados en una sola escritura final.
   - No muestra mensajes centrales de carga.
*/
(function(){
  'use strict';
  if(window.__ceV16Opt2DInstalled) return;
  window.__ceV16Opt2DInstalled = true;

  const VERSION = 'v18_prod_opt_2d';
  const $ = id => document.getElementById(id);
  const text = v => String(v == null ? '' : v).trim();
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stateRef = () => safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {});
  const arr = k => Array.isArray(stateRef()[k]) ? stateRef()[k] : [];
  const currentEventId = () => text(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const currentTab = () => text(safe(() => window.__ceCurrentMainTab || window.ControlEventApp?.navigation?.currentMainTab || (typeof currentMainTab !== 'undefined' ? currentMainTab : '') || '', ''));
  const targetTab = () => text(window.ControlEventV447?.state?.targetTab || currentTab());
  const graficasVisible = () => !!$('tabGraficas') && !$('tabGraficas').classList.contains('hidden');
  const isGraphTarget = () => graficasVisible() || currentTab() === 'graficas' || targetTab() === 'graficas';
  const isSwitching = () => document.body.classList.contains('ce-opt1-switching') || document.body.classList.contains('ce-v447-switching') || !!window.ControlEventV447?.state?.active || Date.now() < switchUntil;
  const rowEventId = r => text(r?.eventId || r?.eventoId || r?.event_id || r?.evento_id || r?.idEvento || r?.evento || '');
  const belongs = (r, ev) => !rowEventId(r) || rowEventId(r) === ev;
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v == null ? '' : v).replace(/€/g,'').replace(/\s/g,'').trim();
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const moneyValCompra = c => num(c?.total ?? c?.importe ?? c?.valor ?? c?.coste ?? c?.precioTotal ?? (num(c?.precio ?? c?.precioUnitario ?? c?.precioReferencia) * Math.max(1, num(c?.unidades ?? c?.uds ?? c?.cantidad))));
  const moneyValDonacion = d => num(d?.valorEstimado ?? d?.valor ?? d?.importe ?? d?.total ?? (num(d?.precio ?? d?.precioReferencia) * Math.max(1, num(d?.unidades ?? d?.uds ?? d?.cantidad))));
  const moneyValIngreso = i => num(i?.total ?? i?.totalIngreso ?? i?.importeTotal ?? (num(i?.importeObligatorio ?? i?.obligatorio) + num(i?.importeVoluntario ?? i?.voluntario)));

  const metrics = window.ControlEventOpt2 = window.ControlEventOpt2D = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    blockedBlankWrites: 0,
    committedStableWrites: 0,
    coalescedWrites: 0,
    skippedDuplicateHtml: 0,
    graphRenderRequests: 0,
    graphRenderRuns: 0,
    receiptHydrations: 0,
    lastKey: '',
    lastRenderMs: 0,
    lastHydratedEventId: '',
    lastSwitchEventId: '',
    lastReason: '',
    dedupedRenderAfterStable: 0,
    suppressedLoadNotices: 0
  };

  let cachedChartHtml = '';
  let cachedChartHeight = 0;
  let cachedChartEventId = '';
  let pendingHtml = '';
  let pendingTimer = 0;
  let renderTimer = 0;
  let lastRenderKey = '';
  let lastRenderAt = 0;
  let lastHtml = '';
  let lastHtmlAt = 0;
  let switchUntil = 0;
  let switchEventId = '';
  let observer = null;
  let rawInnerHTMLDesc = null;
  let finalRenderTimer = 0;
  let lastFinalRenderKey = '';
  let lastFinalRenderAt = 0;

  function injectStyle(){
    if($('ceV16Opt2CStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV16Opt2CStyle';
    style.textContent = `
      #eventChartWrap .ce-v447-loading{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #ceOpt1Notice,#ceEventSwitchNotice{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      body.ce-opt2c-switching #eventChartWrap, body.ce-opt2d-switching #eventChartWrap{contain:layout paint;}
      #eventChartWrap.ce-opt2c-holding{contain:layout paint;min-height:var(--ce-opt2c-hold-height,420px);}
      #eventChartWrap.ce-opt2c-stable{contain:layout paint;}
      #eventChartWrap.ce-opt2c-rendering{pointer-events:none;}
      body.ce-opt2c-switching #eventChartWrap{contain:layout paint;}
    `;
    document.head.appendChild(style);
  }

  function findInnerHTMLDescriptor(el){
    let p = el;
    while(p){
      const d = Object.getOwnPropertyDescriptor(p, 'innerHTML');
      if(d && typeof d.set === 'function' && typeof d.get === 'function') return d;
      p = Object.getPrototypeOf(p);
    }
    return Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML') || null;
  }
  function getDesc(el){ rawInnerHTMLDesc = rawInnerHTMLDesc || findInnerHTMLDescriptor(el); return rawInnerHTMLDesc; }
  function rawSetInnerHTML(el, html){ const d = getDesc(el); if(d) d.set.call(el, html); else el.innerHTML = html; }
  function rawGetInnerHTML(el){ const d = getDesc(el); return d ? d.get.call(el) : el.innerHTML; }

  function isLoadingHtml(v){
    const s = String(v == null ? '' : v);
    return s.includes('ce-v447-loading') || /Cargando\s+(nuevo\s+)?evento|Calculando\s+gr[aá]ficas/i.test(s);
  }
  function hasStableChart(wrap){
    return !!wrap && !!wrap.querySelector('.ce-v434-chart-layout-shell,.ce-v434-chart-layout,.chart-shell');
  }
  function htmlLooksStableChart(html){
    html = String(html == null ? '' : html);
    return html.includes('ce-v434-chart-layout-shell') || html.includes('ce-v434-chart-layout') || html.includes('chart-shell');
  }
  function htmlLooksBlankChart(html){
    html = String(html == null ? '' : html);
    if(!html) return true;
    if(isLoadingHtml(html)) return true;
    if(!htmlLooksStableChart(html)) return false;
    const slices = (html.match(/ce-v434-pie-slice/g) || []).length;
    const sinDatos = (html.match(/Sin datos/g) || []).length;
    const ceros = (html.match(/0,00\s*€/g) || []).length;
    const emptyDestino = /Sin datos por destino/i.test(html);
    // Un gráfico válido tiene al menos alguna porción o barras por destino. Si todo son ceros/sin datos, es el estado intermedio que causa los quesos blancos.
    if(slices === 0 && (sinDatos >= 2 || ceros >= 5 || emptyDestino)) return true;
    return false;
  }
  function eventHasLoadedData(ev){
    ev = text(ev || currentEventId());
    if(!ev) return false;
    const compras = arr('compras').filter(r => belongs(r, ev));
    const donaciones = arr('donaciones').filter(r => belongs(r, ev));
    const ingresos = arr('colaboradores').filter(r => belongs(r, ev));
    const total = compras.reduce((a,b)=>a+moneyValCompra(b),0) + donaciones.reduce((a,b)=>a+moneyValDonacion(b),0) + ingresos.reduce((a,b)=>a+moneyValIngreso(b),0);
    return compras.length + donaciones.length + ingresos.length > 0 && Math.abs(total) > 0.001;
  }
  function cacheCurrentChart(){
    const wrap = $('eventChartWrap');
    if(!wrap || !hasStableChart(wrap)) return false;
    const html = rawGetInnerHTML(wrap) || '';
    if(!html || isLoadingHtml(html) || htmlLooksBlankChart(html)) return false;
    cachedChartHtml = html;
    cachedChartHeight = Math.max(360, Math.round(wrap.getBoundingClientRect?.().height || wrap.scrollHeight || 420));
    cachedChartEventId = currentEventId();
    return true;
  }
  function holdPreviousChart(wrap, reason){
    if(!wrap || !cachedChartHtml || !isGraphTarget()) return false;
    try{
      metrics.lastReason = reason || 'hold';
      wrap.style.setProperty('--ce-opt2c-hold-height', cachedChartHeight + 'px');
      wrap.classList.add('ce-opt2c-holding');
      rawSetInnerHTML(wrap, cachedChartHtml);
      return true;
    }catch(_){ return false; }
  }
  function startSwitch(reason){
    const ev = currentEventId();
    cacheCurrentChart();
    switchUntil = Date.now() + 2100;
    switchEventId = ev;
    metrics.lastSwitchEventId = ev;
    metrics.lastReason = reason || 'switch';
    try{ document.body.classList.add('ce-opt2c-switching','ce-opt2d-switching'); }catch(_){ }
    const wrap = $('eventChartWrap');
    if(wrap && cachedChartHtml) holdPreviousChart(wrap, reason || 'switch-start');
    clearTimeout(startSwitch._t);
    startSwitch._t = setTimeout(() => { try{ document.body.classList.remove('ce-opt2c-switching','ce-opt2d-switching'); }catch(_){ } }, 3400);
  }
  function clearPending(){
    clearTimeout(pendingTimer);
    pendingTimer = 0;
    pendingHtml = '';
  }
  function commitStableHtml(wrap, html, delay){
    pendingHtml = String(html == null ? '' : html);
    clearTimeout(pendingTimer);
    metrics.coalescedWrites++;
    pendingTimer = setTimeout(() => {
      if(!pendingHtml) return;
      const finalHtml = pendingHtml;
      pendingHtml = '';
      try{
        rawSetInnerHTML(wrap, finalHtml);
        lastHtml = finalHtml;
        lastHtmlAt = Date.now();
        wrap.classList.remove('ce-opt2c-holding','ce-opt2c-rendering');
        wrap.classList.add('ce-opt2c-stable');
        metrics.committedStableWrites++;
        cacheCurrentChart();
      }catch(err){ console.warn('[v18_prod_opt_2c] commit gráficas', err); }
    }, Number(delay || 180));
  }

  function patchChartContainer(){
    const wrap = $('eventChartWrap');
    if(!wrap || wrap.__ceOpt2CPatched) return;
    wrap.__ceOpt2CPatched = true;
    const desc = getDesc(wrap);
    if(desc){
      Object.defineProperty(wrap, 'innerHTML', {
        configurable:true,
        get(){ return desc.get.call(this); },
        set(v){
          const html = String(v == null ? '' : v);
          const now = Date.now();
          const hot = isSwitching() || (now - lastRenderAt) < 900;
          if(isLoadingHtml(html)){
            if(holdPreviousChart(this, 'block-loading-html')) return;
          }
          if(hot && htmlLooksBlankChart(html) && (eventHasLoadedData(currentEventId()) || cachedChartHtml)){
            metrics.blockedBlankWrites++;
            if(holdPreviousChart(this, 'block-blank-chart')) return;
          }
          if(html && html === lastHtml && (now - lastHtmlAt) < 1800){
            metrics.skippedDuplicateHtml++;
            return;
          }
          if(hot && htmlLooksStableChart(html)){
            commitStableHtml(this, html, eventHasLoadedData(currentEventId()) ? 140 : 260);
            return;
          }
          rawSetInnerHTML(this, html);
          lastHtml = html;
          lastHtmlAt = now;
          if(hasStableChart(this) && !htmlLooksBlankChart(html)){
            this.classList.remove('ce-opt2c-holding','ce-opt2c-rendering');
            this.classList.add('ce-opt2c-stable');
            setTimeout(cacheCurrentChart, 0);
          }
        }
      });
    }
    const oldReplace = wrap.replaceChildren;
    if(typeof oldReplace === 'function' && !oldReplace.__ceOpt2C){
      const wrapped = function(){
        if(arguments.length === 0 && isSwitching() && isGraphTarget() && cachedChartHtml){
          metrics.blockedBlankWrites++;
          holdPreviousChart(this, 'block-empty-replace');
          return undefined;
        }
        const ret = oldReplace.apply(this, arguments);
        if(hasStableChart(this) && !htmlLooksBlankChart(rawGetInnerHTML(this))) setTimeout(cacheCurrentChart, 0);
        return ret;
      };
      wrapped.__ceOpt2C = true;
      wrap.replaceChildren = wrapped;
    }
  }

  function chartKey(){
    const ev = currentEventId();
    const sum = (xs, fn) => Math.round(xs.reduce((a,b) => a + fn(b), 0) * 100) / 100;
    const ingresos = arr('colaboradores').filter(r => belongs(r, ev));
    const compras = arr('compras').filter(r => belongs(r, ev));
    const donaciones = arr('donaciones').filter(r => belongs(r, ev));
    return [ev,'i'+ingresos.length+':'+sum(ingresos, moneyValIngreso),'c'+compras.length+':'+sum(compras, moneyValCompra),'d'+donaciones.length+':'+sum(donaciones, moneyValDonacion)].join('|');
  }
  function getBaseRender(){
    const candidates = [window.ControlEventV434?.renderGraficas, window.ControlEventV435?.renderGraficas, window.ControlEventV436?.renderGraficas, window.renderGraficas];
    for(const fn of candidates){
      if(typeof fn === 'function') return fn.__ceOpt2COriginal || fn.__ceOpt2BOriginal || fn.__ceV16Opt2Original || fn;
    }
    return null;
  }
  function runGraphRender(base, ctx, options){
    const wrap = $('eventChartWrap');
    if(!wrap || !graficasVisible()) return undefined;
    patchChartContainer();
    metrics.graphRenderRequests++;
    const key = chartKey();
    const now = Date.now();
    if(key && key === lastRenderKey && hasStableChart(wrap) && !htmlLooksBlankChart(rawGetInnerHTML(wrap)) && (now - lastRenderAt) < 2200){
      if(options?.force === 'hard') metrics.dedupedRenderAfterStable++;
      return undefined;
    }
    clearTimeout(renderTimer);
    const wait = isSwitching() ? (eventHasLoadedData(currentEventId()) ? 80 : 180) : 60;
    renderTimer = setTimeout(() => {
      const start = performance.now ? performance.now() : Date.now();
      try{
        const before = currentEventId();
        wrap.classList.add('ce-opt2c-rendering');
        base.call(ctx || window.ControlEventV434 || window, Object.assign({}, options || {}, {force:true, reason:'v18_prod_opt_2c'}));
        if(before === currentEventId()){
          lastRenderKey = chartKey();
          lastRenderAt = Date.now();
          metrics.lastKey = lastRenderKey;
          metrics.graphRenderRuns++;
          setTimeout(cacheCurrentChart, 30);
        }
      }catch(err){ console.warn('[v18_prod_opt_2c] render gráficas', err); }
      finally{
        wrap.classList.remove('ce-opt2c-rendering');
        metrics.lastRenderMs = Math.round((performance.now ? performance.now() : Date.now()) - start);
      }
    }, wait);
    return undefined;
  }
  function patchRenderers(){
    [window.ControlEventV434, window.ControlEventV435, window.ControlEventV436].filter(Boolean).forEach(obj => {
      const fn = obj.renderGraficas;
      if(typeof fn !== 'function' || fn.__ceOpt2CWrapped) return;
      const original = fn.__ceOpt2COriginal || fn.__ceOpt2BOriginal || fn.__ceV16Opt2Original || fn;
      const wrapped = function(options){ return runGraphRender(original, this, options || {}); };
      wrapped.__ceOpt2CWrapped = true;
      wrapped.__ceOpt2COriginal = original;
      obj.renderGraficas = wrapped;
    });
    const win = window.renderGraficas;
    if(typeof win === 'function' && !win.__ceOpt2CWrappedWindow){
      const original = win.__ceOpt2COriginal || win.__ceOpt2BOriginal || win.__ceV16Opt2Original || win;
      const wrapped = function(options){ return runGraphRender(original, window.ControlEventV434 || window, options || {}); };
      wrapped.__ceOpt2CWrappedWindow = true;
      wrapped.__ceOpt2COriginal = original;
      try{ renderGraficas = wrapped; }catch(_){ }
      window.renderGraficas = wrapped;
      try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.renderGraficas = wrapped; }catch(_){ }
    }
  }
  function patchV447(){
    const api = window.ControlEventV447;
    if(!api || api.__ceOpt2CV447) return;
    api.__ceOpt2CV447 = true;
    const oldRenderActive = api.renderActive;
    if(typeof oldRenderActive === 'function'){
      api.renderActive = function(tab){
        const t = text(tab || currentTab());
        if(t === 'graficas') startSwitch('v447-render-active');
        patchChartContainer();
        const ret = oldRenderActive.apply(this, arguments);
        if(t === 'graficas') setTimeout(renderAfterStable, 180);
        return ret;
      };
    }
  }
  function renderAfterStable(){
    patchChartContainer();
    patchRenderers();
    if(!graficasVisible()) return;
    clearTimeout(finalRenderTimer);
    finalRenderTimer = setTimeout(() => {
      if(!graficasVisible()) return;
      const key = chartKey();
      const now = Date.now();
      const wrap = $('eventChartWrap');
      if(key && key === lastFinalRenderKey && hasStableChart(wrap) && !htmlLooksBlankChart(rawGetInnerHTML(wrap)) && (now - lastFinalRenderAt) < 2600){
        metrics.dedupedRenderAfterStable++;
        return;
      }
      const base = getBaseRender();
      if(typeof base === 'function'){
        lastFinalRenderKey = key;
        lastFinalRenderAt = now;
        runGraphRender(base, window.ControlEventV434 || window, {force:'soft', reason:'event-stable-2d'});
      }
    }, 120);
  }
  async function hydrateReceipts(force){
    const ev = currentEventId();
    if(!ev) return;
    metrics.receiptHydrations++;
    metrics.lastHydratedEventId = ev;
    const race = (p, ms) => Promise.race([Promise.resolve(p), new Promise(resolve => setTimeout(resolve, ms))]);
    try{ await race(window.ControlEventV469?.hydrateEventReceipts?.(force !== false), 2100); }catch(err){ console.warn('[v18_prod_opt_2c] hidratación justificantes', err); }
    if(ev !== currentEventId()) return;
    try{ window.ControlEventV469?.compactIngresoReceipts?.(); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
  }
  function observeWrap(){
    const wrap = $('eventChartWrap');
    if(!wrap || observer?.__target === wrap) return;
    try{ observer?.disconnect?.(); }catch(_){ }
    observer = new MutationObserver(() => {
      patchChartContainer();
      const html = rawGetInnerHTML(wrap) || '';
      if(isSwitching() && htmlLooksBlankChart(html) && cachedChartHtml){
        metrics.blockedBlankWrites++;
        holdPreviousChart(wrap, 'observer-blank');
        return;
      }
      if(hasStableChart(wrap) && !htmlLooksBlankChart(html)) cacheCurrentChart();
    });
    observer.__target = wrap;
    observer.observe(wrap, {childList:true, subtree:false});
  }
  function install(){
    injectStyle();
    patchChartContainer();
    patchRenderers();
    patchV447();
    observeWrap();
    cacheCurrentChart();
  }

  window.addEventListener('change', function(ev){ if(ev.target && ev.target.id === 'selectedEvent') startSwitch('select-change'); }, true);
  window.addEventListener('controlevent:opt1-event-stable', () => {
    startSwitch('opt1-stable');
    setTimeout(() => { renderAfterStable(); hydrateReceipts(true); }, 180);
  }, true);
  let eventReadyTimer = 0;
  window.addEventListener('controlevent:event-ready', () => {
    clearTimeout(eventReadyTimer);
    eventReadyTimer = setTimeout(() => { install(); hydrateReceipts(false); renderAfterStable(); }, 260);
  }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30), true));
  document.addEventListener('visibilitychange', () => { if(!document.hidden) setTimeout(install, 80); }, true);
  [0,120,450,1200,2600].forEach(ms => setTimeout(install, ms));
})();
