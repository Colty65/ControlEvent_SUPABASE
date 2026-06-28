/* ControlEvent v16_prod OPT2B - Gráficas sin pantalla de carga ni retemblores.
   Alcance cerrado: solo estabiliza el pintado de GRAFICAS y mantiene la hidratación de justificantes.
   - No muestra textos tipo "Cargando/Calculando" en el centro.
   - Mantiene el último gráfico válido mientras cambia el evento.
   - Deduplica repintados iguales del contenedor de gráficas.
*/
(function(){
  'use strict';
  if(window.__ceV16Opt2BInstalled) return;
  window.__ceV16Opt2BInstalled = true;

  const VERSION = 'v16_opt_2b';
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
  const isSwitching = () => document.body.classList.contains('ce-opt1-switching') || document.body.classList.contains('ce-v447-switching') || !!window.ControlEventV447?.state?.active;
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

  const metrics = window.ControlEventOpt2 = window.ControlEventOpt2B = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    cachedHolds: 0,
    skippedDuplicateHtml: 0,
    graphRenderRequests: 0,
    graphRenderRuns: 0,
    receiptHydrations: 0,
    lastKey: '',
    lastRenderMs: 0,
    lastHydratedEventId: ''
  };

  let cachedChartHtml = '';
  let cachedChartHeight = 0;
  let cachedChartEventId = '';
  let renderTimer = 0;
  let lastRenderKey = '';
  let lastRenderAt = 0;
  let observer = null;

  function injectStyle(){
    if($('ceV16Opt2BStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV16Opt2BStyle';
    style.textContent = `
      #eventChartWrap .ce-v447-loading{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #eventChartWrap.ce-opt2-holding{contain:layout paint;min-height:var(--ce-opt2-hold-height,420px);}
      #eventChartWrap.ce-opt2-stable{contain:layout paint;}
      #eventChartWrap.ce-opt2-rendering{pointer-events:none;}
    `;
    document.head.appendChild(style);
  }

  function hasStableChart(wrap){
    return !!wrap && !!wrap.querySelector('.ce-v434-chart-layout-shell,.ce-v434-chart-layout,.chart-shell');
  }
  function isLoadingHtml(v){
    const s = String(v == null ? '' : v);
    return s.includes('ce-v447-loading') || /Cargando\s+(nuevo\s+)?evento|Calculando\s+gr[aá]ficas/i.test(s);
  }
  function cacheCurrentChart(){
    const wrap = $('eventChartWrap');
    if(!wrap || !hasStableChart(wrap)) return false;
    const html = wrap.innerHTML || '';
    if(!html || isLoadingHtml(html)) return false;
    cachedChartHtml = html;
    cachedChartHeight = Math.max(360, Math.round(wrap.getBoundingClientRect?.().height || wrap.scrollHeight || 420));
    cachedChartEventId = currentEventId();
    return true;
  }
  function holdPreviousChart(wrap){
    if(!wrap || !cachedChartHtml || !isGraphTarget()) return false;
    try{
      metrics.cachedHolds++;
      wrap.style.setProperty('--ce-opt2-hold-height', cachedChartHeight + 'px');
      wrap.classList.add('ce-opt2-holding');
      rawSetInnerHTML(wrap, cachedChartHtml);
      return true;
    }catch(_){ return false; }
  }

  function findInnerHTMLDescriptor(el){
    let p = el;
    while(p){
      const d = Object.getOwnPropertyDescriptor(p, 'innerHTML');
      if(d && typeof d.set === 'function' && typeof d.get === 'function') return d;
      p = Object.getPrototypeOf(p);
    }
    return null;
  }
  let innerHTMLDesc = null;
  function rawSetInnerHTML(el, html){
    innerHTMLDesc = innerHTMLDesc || findInnerHTMLDescriptor(el);
    if(innerHTMLDesc) innerHTMLDesc.set.call(el, html);
    else el.innerHTML = html;
  }
  function rawGetInnerHTML(el){
    innerHTMLDesc = innerHTMLDesc || findInnerHTMLDescriptor(el);
    if(innerHTMLDesc) return innerHTMLDesc.get.call(el);
    return el.innerHTML;
  }

  function patchChartContainer(){
    const wrap = $('eventChartWrap');
    if(!wrap || wrap.__ceOpt2BPatched) return;
    wrap.__ceOpt2BPatched = true;
    innerHTMLDesc = innerHTMLDesc || findInnerHTMLDescriptor(wrap);
    if(innerHTMLDesc){
      let lastSet = '';
      let lastAt = 0;
      Object.defineProperty(wrap, 'innerHTML', {
        configurable:true,
        get(){ return innerHTMLDesc.get.call(this); },
        set(v){
          const html = String(v == null ? '' : v);
          if(isLoadingHtml(html) && holdPreviousChart(this)) return;
          const now = Date.now();
          if(html && html === lastSet && (now - lastAt) < 1300){
            metrics.skippedDuplicateHtml++;
            return;
          }
          lastSet = html;
          lastAt = now;
          innerHTMLDesc.set.call(this, html);
          if(hasStableChart(this)){
            this.classList.remove('ce-opt2-holding','ce-opt2-rendering');
            this.classList.add('ce-opt2-stable');
            setTimeout(cacheCurrentChart, 0);
          }
        }
      });
    }
    const oldReplace = wrap.replaceChildren;
    if(typeof oldReplace === 'function'){
      wrap.replaceChildren = function(){
        if(arguments.length === 0 && isSwitching() && isGraphTarget() && cachedChartHtml){
          holdPreviousChart(this);
          return undefined;
        }
        const ret = oldReplace.apply(this, arguments);
        if(hasStableChart(this)) setTimeout(cacheCurrentChart, 0);
        return ret;
      };
    }
  }

  function chartKey(){
    const ev = currentEventId();
    const sum = (xs, fn) => Math.round(xs.reduce((a,b) => a + fn(b), 0) * 100) / 100;
    const ingresos = arr('colaboradores').filter(r => belongs(r, ev));
    const compras = arr('compras').filter(r => belongs(r, ev));
    const donaciones = arr('donaciones').filter(r => belongs(r, ev));
    return [
      ev,
      'i'+ingresos.length+':'+sum(ingresos, moneyValIngreso),
      'c'+compras.length+':'+sum(compras, moneyValCompra),
      'd'+donaciones.length+':'+sum(donaciones, moneyValDonacion)
    ].join('|');
  }

  function getBaseRender(){
    const candidates = [
      window.ControlEventV434?.renderGraficas,
      window.ControlEventV435?.renderGraficas,
      window.ControlEventV436?.renderGraficas,
      window.renderGraficas
    ];
    for(const fn of candidates){
      if(typeof fn === 'function') return fn.__ceOpt2BOriginal || fn.__ceV16Opt2Original || fn;
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
    if(key && key === lastRenderKey && hasStableChart(wrap) && (now - lastRenderAt) < 1600 && options?.force !== true){
      return undefined;
    }
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      const start = performance.now ? performance.now() : Date.now();
      try{
        const current = currentEventId();
        wrap.classList.add('ce-opt2-rendering');
        base.call(ctx || window.ControlEventV434 || window, Object.assign({}, options || {}, {force:true, reason:'v16_opt_2b'}));
        if(current === currentEventId()){
          lastRenderKey = chartKey();
          lastRenderAt = Date.now();
          metrics.lastKey = lastRenderKey;
          metrics.graphRenderRuns++;
          cacheCurrentChart();
        }
      }catch(err){
        console.warn('[v16_opt_2b] render gráficas', err);
      }finally{
        wrap.classList.remove('ce-opt2-holding','ce-opt2-rendering');
        metrics.lastRenderMs = Math.round((performance.now ? performance.now() : Date.now()) - start);
      }
    }, isSwitching() ? 120 : 35);
    return undefined;
  }

  function patchRenderers(){
    [window.ControlEventV434, window.ControlEventV435, window.ControlEventV436].filter(Boolean).forEach(obj => {
      const fn = obj.renderGraficas;
      if(typeof fn !== 'function' || fn.__ceOpt2BWrapped) return;
      const original = fn.__ceOpt2BOriginal || fn.__ceV16Opt2Original || fn;
      const wrapped = function(options){ return runGraphRender(original, this, options || {}); };
      wrapped.__ceOpt2BWrapped = true;
      wrapped.__ceOpt2BOriginal = original;
      obj.renderGraficas = wrapped;
    });
    const win = window.renderGraficas;
    if(typeof win === 'function' && !win.__ceOpt2BWrappedWindow){
      const original = win.__ceOpt2BOriginal || win.__ceV16Opt2Original || win;
      const wrapped = function(options){ return runGraphRender(original, window.ControlEventV434 || window, options || {}); };
      wrapped.__ceOpt2BWrappedWindow = true;
      wrapped.__ceOpt2BOriginal = original;
      try{ renderGraficas = wrapped; }catch(_){ }
      window.renderGraficas = wrapped;
      try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.renderGraficas = wrapped; }catch(_){ }
    }
  }

  function patchV447(){
    const api = window.ControlEventV447;
    if(!api || api.__ceOpt2BV447) return;
    api.__ceOpt2BV447 = true;
    const oldRenderActive = api.renderActive;
    if(typeof oldRenderActive === 'function'){
      api.renderActive = function(tab){
        const t = text(tab || currentTab());
        cacheCurrentChart();
        patchChartContainer();
        const ret = oldRenderActive.apply(this, arguments);
        if(t === 'graficas') setTimeout(renderAfterStable, 30);
        return ret;
      };
    }
  }

  function renderAfterStable(){
    patchChartContainer();
    patchRenderers();
    if(!graficasVisible()) return;
    const base = getBaseRender();
    if(typeof base === 'function') runGraphRender(base, window.ControlEventV434 || window, {force:true, reason:'event-stable'});
  }

  async function hydrateReceipts(force){
    const ev = currentEventId();
    if(!ev) return;
    metrics.receiptHydrations++;
    metrics.lastHydratedEventId = ev;
    const race = (p, ms) => Promise.race([Promise.resolve(p), new Promise(resolve => setTimeout(resolve, ms))]);
    try{ await race(window.ControlEventV469?.hydrateEventReceipts?.(force !== false), 2100); }catch(err){ console.warn('[v16_opt_2b] hidratación justificantes', err); }
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
      if(hasStableChart(wrap)) cacheCurrentChart();
      else if(isSwitching() && isGraphTarget() && cachedChartHtml) holdPreviousChart(wrap);
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

  window.addEventListener('controlevent:opt1-event-stable', () => { setTimeout(() => { renderAfterStable(); hydrateReceipts(true); }, 25); }, true);
  window.addEventListener('controlevent:event-ready', () => { setTimeout(() => { install(); hydrateReceipts(false); }, 60); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30), true));
  document.addEventListener('visibilitychange', () => { if(!document.hidden) setTimeout(install, 80); }, true);
  [0,120,450,1200,2600].forEach(ms => setTimeout(install, ms));
})();
