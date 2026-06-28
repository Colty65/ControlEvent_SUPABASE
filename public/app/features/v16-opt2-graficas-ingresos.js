/* ControlEvent v16_prod OPT2 - Gráficas estables + hidratación de justificantes de ingresos.
   Alcance cerrado: no cambia cálculos, planificación, compras, documentos ni tickets.
   - Evita que GRAFICAS muestre quesos vacíos durante el cambio de evento: esqueleto breve y render único.
   - Fuerza carga de justificantes de ingresos del evento activo tras el cambio, sin depender de Refrescar.
*/
(function(){
  'use strict';
  if(window.__ceV16Opt2Installed) return;
  window.__ceV16Opt2Installed = true;

  const VERSION = 'v16_opt_2';
  const $ = id => document.getElementById(id);
  const text = v => String(v == null ? '' : v).trim();
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v == null ? '' : v).trim().replace(/€/g,'').replace(/\s/g,'');
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const st = () => safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {});
  const arr = k => Array.isArray(st()[k]) ? st()[k] : [];
  const currentEventId = () => text(st().selectedEventId || $('selectedEvent')?.value || '');
  const rowEventId = r => text(r?.eventId || r?.eventoId || r?.event_id || r?.evento_id || r?.idEvento || r?.evento || '');
  const belongs = (r, ev) => !rowEventId(r) || rowEventId(r) === ev;
  const currentTab = () => text(safe(() => window.__ceCurrentMainTab || window.ControlEventApp?.navigation?.currentMainTab || (typeof currentMainTab !== 'undefined' ? currentMainTab : '') || '', ''));
  const graficasVisible = () => !!$('tabGraficas') && !$('tabGraficas').classList.contains('hidden');
  const ingresosVisible = () => !!$('tabIngresos') && !$('tabIngresos').classList.contains('hidden');

  const metrics = window.ControlEventOpt2 = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    chartSchedules: 0,
    chartRenders: 0,
    chartSkips: 0,
    receiptHydrations: 0,
    lastChartKey: '',
    lastHydratedEventId: '',
    lastRenderMs: 0
  };

  function injectStyle(){
    if($('ceV16Opt2Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV16Opt2Style';
    style.textContent = `
      #eventChartWrap.ce-opt2-chart-loading{min-height:420px;position:relative;}
      #eventChartWrap.ce-opt2-chart-loading::before{content:'Calculando gráficas del evento…';display:flex;align-items:center;justify-content:center;min-height:280px;margin:8px 0;border-radius:22px;border:1px solid rgba(148,163,184,.32);background:linear-gradient(90deg,rgba(248,250,252,.95),rgba(239,246,255,.95),rgba(248,250,252,.95));background-size:240% 100%;animation:ceOpt2Pulse 1.25s ease-in-out infinite;color:#334155;font:900 16px/1.2 Inter,system-ui,sans-serif;box-shadow:0 12px 34px rgba(15,23,42,.08);}
      #eventChartWrap.ce-opt2-chart-loading > *{display:none!important;}
      @keyframes ceOpt2Pulse{0%{background-position:0% 0}100%{background-position:240% 0}}
    `;
    document.head.appendChild(style);
  }

  function valueOfCompra(c){
    return num(c?.total ?? c?.importe ?? c?.valor ?? c?.coste ?? c?.precioTotal ?? (num(c?.precio ?? c?.precioUnitario ?? c?.precioReferencia) * Math.max(1, num(c?.unidades ?? c?.uds ?? c?.cantidad))));
  }
  function valueOfIngreso(c){
    return num(c?.total ?? c?.totalIngreso ?? c?.importeTotal ?? (num(c?.importeObligatorio ?? c?.obligatorio) + num(c?.importeVoluntario ?? c?.voluntario)));
  }
  function valueOfDonacion(d){
    return num(d?.valorEstimado ?? d?.valor ?? d?.importe ?? d?.total ?? (num(d?.precio ?? d?.precioReferencia) * Math.max(1, num(d?.unidades ?? d?.uds ?? d?.cantidad))));
  }
  function chartKey(){
    const ev = currentEventId();
    const compras = arr('compras').filter(r => belongs(r, ev));
    const donaciones = arr('donaciones').filter(r => belongs(r, ev));
    const ingresos = arr('colaboradores').filter(r => belongs(r, ev));
    const sum = (xs, fn) => Math.round(xs.reduce((a,b) => a + fn(b), 0) * 100) / 100;
    return [
      ev,
      'i' + ingresos.length + ':' + sum(ingresos, valueOfIngreso),
      'c' + compras.length + ':' + sum(compras, valueOfCompra),
      'd' + donaciones.length + ':' + sum(donaciones, valueOfDonacion)
    ].join('|');
  }
  function hasOwnStableChart(){
    const wrap = $('eventChartWrap');
    return !!wrap && !!wrap.querySelector('.ce-v434-chart-layout-shell,.ce-v434-chart-layout,.chart-shell');
  }
  function isSwitching(){
    return document.body.classList.contains('ce-v447-switching') || document.body.classList.contains('ce-opt1-switching');
  }
  function showChartLoading(){
    injectStyle();
    const wrap = $('eventChartWrap');
    if(!wrap || !graficasVisible()) return;
    if(!wrap.classList.contains('ce-opt2-chart-loading')) wrap.classList.add('ce-opt2-chart-loading');
  }
  function hideChartLoading(){
    const wrap = $('eventChartWrap');
    if(wrap) wrap.classList.remove('ce-opt2-chart-loading');
  }

  let renderTimer = 0;
  let lastPaintKey = '';
  let lastPaintAt = 0;
  let primaryOriginalRender = null;

  function scheduleChartRender(original, ctx, options){
    if(!graficasVisible()) return original.call(ctx || window, options || {});
    const key = chartKey();
    const now = Date.now();
    if(key && key === lastPaintKey && hasOwnStableChart() && !isSwitching() && (now - lastPaintAt) < 1400){
      metrics.chartSkips++;
      hideChartLoading();
      return undefined;
    }
    metrics.chartSchedules++;
    showChartLoading();
    clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
      const start = performance.now ? performance.now() : Date.now();
      try{
        const evBefore = currentEventId();
        const finalKey = chartKey();
        original.call(ctx || window, Object.assign({}, options || {}, {force:true, reason:'v16_opt_2'}));
        if(evBefore === currentEventId()){
          lastPaintKey = finalKey;
          lastPaintAt = Date.now();
          metrics.lastChartKey = finalKey;
          metrics.chartRenders++;
        }
      }catch(err){
        console.warn('[v16_opt_2] render gráficas', err);
      }finally{
        hideChartLoading();
        metrics.lastRenderMs = Math.round((performance.now ? performance.now() : Date.now()) - start);
      }
    }, isSwitching() ? 170 : 80);
    return undefined;
  }

  function patchGraficasRenderers(){
    const objs = [window.ControlEventV434, window.ControlEventV435, window.ControlEventV436].filter(Boolean);
    objs.forEach(obj => {
      const fn = obj.renderGraficas;
      if(typeof fn !== 'function' || fn.__ceV16Opt2Wrapped) return;
      if(!primaryOriginalRender) primaryOriginalRender = fn;
      const wrapped = function(options){ return scheduleChartRender(fn, this, options || {}); };
      wrapped.__ceV16Opt2Wrapped = true;
      wrapped.__ceV16Opt2Original = fn;
      obj.renderGraficas = wrapped;
    });
    const rw = window.renderGraficas;
    if(typeof rw === 'function' && !rw.__ceV16Opt2WrappedWindow){
      const base = primaryOriginalRender || rw;
      const wrapped = function(options){ return scheduleChartRender(base, window.ControlEventV434 || window, options || {}); };
      wrapped.__ceV16Opt2WrappedWindow = true;
      try{ renderGraficas = wrapped; }catch(_){ }
      window.renderGraficas = wrapped;
      try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.renderGraficas = wrapped; }catch(_){ }
    }
  }

  async function hydrateReceipts(force){
    const ev = currentEventId();
    if(!ev) return;
    metrics.receiptHydrations++;
    metrics.lastHydratedEventId = ev;
    const race = (p, ms) => Promise.race([Promise.resolve(p), new Promise(resolve => setTimeout(resolve, ms))]);
    try{ await race(window.ControlEventV469?.hydrateEventReceipts?.(force !== false), 2600); }catch(err){ console.warn('[v16_opt_2] hidratación justificantes', err); }
    if(ev !== currentEventId()) return;
    try{ window.ControlEventV469?.compactIngresoReceipts?.(); }catch(_){ }
    try{ window.ControlEventV469?.enrichOpenTooltips?.(); }catch(_){ }
    // Si el usuario está justo en INGRESOS, las cajas de miniatura deben actualizarse sin pulsar Refrescar.
    if(ingresosVisible()){
      [80,220,520].forEach(ms => setTimeout(() => {
        if(ev !== currentEventId()) return;
        try{ window.ControlEventV469?.compactIngresoReceipts?.(); }catch(_){ }
      }, ms));
    }
  }

  function onEventStable(){
    patchGraficasRenderers();
    hydrateReceipts(true);
    if(graficasVisible() || currentTab() === 'graficas'){
      showChartLoading();
      const fn = primaryOriginalRender || window.ControlEventV434?.renderGraficas?.__ceV16Opt2Original || window.ControlEventV434?.renderGraficas || window.renderGraficas;
      if(typeof fn === 'function') scheduleChartRender(fn.__ceV16Opt2Original || fn, window.ControlEventV434 || window, {force:true, reason:'event-stable'});
    }
  }

  function patchTabRender(){
    // Cuando se pulsa Gráficas después de un cambio, asegurar que el primer pintado visible sea el estable.
    const old = window.ControlEventV447?.renderActive;
    if(typeof old === 'function' && !old.__ceV16Opt2RenderActive){
      const wrapped = function(tab){
        const t = text(tab || currentTab());
        if(t === 'graficas') showChartLoading();
        const ret = old.apply(this, arguments);
        if(t === 'graficas') setTimeout(() => onEventStable(), 40);
        return ret;
      };
      wrapped.__ceV16Opt2RenderActive = true;
      window.ControlEventV447.renderActive = wrapped;
    }
  }

  function install(){
    injectStyle();
    patchGraficasRenderers();
    patchTabRender();
    if(graficasVisible() && !hasOwnStableChart()) showChartLoading();
  }

  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:module-mounted'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 30), true));
  window.addEventListener('controlevent:opt1-event-stable', () => setTimeout(onEventStable, 20), true);
  window.addEventListener('controlevent:event-ready', () => setTimeout(() => { patchGraficasRenderers(); hydrateReceipts(false); }, 60), true);
  document.addEventListener('visibilitychange', () => { if(!document.hidden) setTimeout(install, 80); }, true);
  [0,120,450,1200,2600].forEach(ms => setTimeout(install, ms));
})();
