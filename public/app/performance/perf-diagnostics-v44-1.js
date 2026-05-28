/* ControlEvent v50.18 - Diagnóstico de rendimiento robusto.
   Solo instrumenta y muestra datos. No cambia la lógica funcional de la app. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v50.18';
  const START_MS = (performance && performance.now) ? performance.now() : Date.now();
  const MAX_EVENTS = 120;
  const MAX_ERRORS = 30;
  const state = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    opened: false,
    lastToggleMs: 0,
    counters: {
      clicksMenu: 0,
      renders: 0,
      renderTabVisibility: 0,
      moduleActivations: 0,
      eventChanges: 0,
      longTasks: 0,
      domMutations: 0,
      errors: 0
    },
    timings: {
      maxRenderMs: 0,
      lastRenderMs: 0,
      maxModuleMs: 0,
      lastModuleMs: 0,
      maxLongTaskMs: 0,
      lastLongTaskMs: 0
    },
    last: {},
    events: [],
    errors: [],
    timers: []
  };

  function now(){ return (performance && performance.now) ? performance.now() : Date.now(); }
  function bootMs(){ return Math.round(now() - START_MS); }
  function safe(fn, fallback){ try{ const value = fn(); return value === undefined ? fallback : value; }catch(_){ return fallback; } }
  function byId(id){ return document.getElementById(id); }
  function app(){ return window.ControlEventApp || window.ControlEventRuntime?.app || null; }
  function appState(){ return app()?.state || window.state || {}; }
  function nav(){ return app()?.navigation || {}; }
  function text(value){ return String(value == null ? '' : value); }

  function pushEvent(type, detail){
    state.events.push(Object.assign({at: new Date().toLocaleTimeString(), ms: bootMs(), type}, detail || {}));
    if(state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
    if(state.opened) scheduleUpdate();
  }

  function recordError(type, error){
    const message = text(error?.message || error?.reason?.message || error?.reason || error || 'Error');
    state.counters.errors += 1;
    state.errors.push({at: new Date().toLocaleTimeString(), type, message: message.slice(0, 260)});
    if(state.errors.length > MAX_ERRORS) state.errors.splice(0, state.errors.length - MAX_ERRORS);
    pushEvent('error', {message: message.slice(0, 120)});
  }

  function arr(name){ const value = appState()?.[name]; return Array.isArray(value) ? value : []; }
  function selectedEventId(){ return text(appState().selectedEventId || nav().selectedEventId || safe(() => byId('selectedEvent')?.value, '')); }
  function currentScreen(){
    return text(nav().currentMainTab || window.currentMainTab || window.__ceCurrentMainTab || safe(() => document.querySelector('.tab.active,[data-active="true"]')?.id, ''));
  }
  function rows(){
    return {
      eventos: arr('eventos').length,
      personas: arr('personas').length,
      productos: arr('productos').length,
      tiendas: arr('tiendas').length,
      ingresos: arr('colaboradores').length || arr('asistentes').length,
      compras: arr('compras').length,
      donaciones: arr('donaciones').length || arr('donacionesProducto').length
    };
  }
  function memory(){
    const mem = performance && performance.memory;
    if(!mem) return {available:false, label:'No disponible en este navegador'};
    const mb = n => Math.round((Number(n || 0) / 1048576) * 10) / 10;
    return {
      available: true,
      usedMB: mb(mem.usedJSHeapSize),
      totalMB: mb(mem.totalJSHeapSize),
      limitMB: mb(mem.jsHeapSizeLimit),
      label: `${mb(mem.usedJSHeapSize)} / ${mb(mem.totalJSHeapSize)} MB`
    };
  }
  function dom(){
    return {
      nodes: document.getElementsByTagName('*').length,
      buttons: document.getElementsByTagName('button').length,
      inputs: document.querySelectorAll('input,select,textarea').length,
      cards: document.querySelectorAll('.card,.panel,.resource-card,.ce-map-card,.compra-card,.donacion-card,.rowline,[class*="card"],[class*="ficha"]').length
    };
  }

  function sample(reason){
    state.last = {
      reason: reason || 'sample',
      updatedAt: new Date().toLocaleTimeString(),
      bootMs: bootMs(),
      screen: currentScreen(),
      eventId: selectedEventId(),
      rows: rows(),
      memory: memory(),
      dom: dom(),
      url: location.pathname + location.search
    };
    return state.last;
  }

  function wrapGlobalFunction(name, counter, maxKey, lastKey){
    const old = window[name];
    if(typeof old !== 'function' || old.__cePerf4411Wrapped) return false;
    const wrapped = function(){
      const t0 = now();
      try{ return old.apply(this, arguments); }
      finally{
        const ms = Math.round((now() - t0) * 10) / 10;
        state.counters[counter] = (state.counters[counter] || 0) + 1;
        state.timings[lastKey] = ms;
        state.timings[maxKey] = Math.max(state.timings[maxKey] || 0, ms);
        pushEvent(name, {ms, screen: currentScreen()});
      }
    };
    wrapped.__cePerf4411Wrapped = true;
    wrapped.__cePerf4411Original = old;
    window[name] = wrapped;
    return true;
  }

  function installWrappers(){
    wrapGlobalFunction('render', 'renders', 'maxRenderMs', 'lastRenderMs');
    wrapGlobalFunction('renderTabVisibility', 'renderTabVisibility', 'maxRenderMs', 'lastRenderMs');
    const modules = window.ControlEventModules;
    if(modules && typeof modules.activate === 'function' && !modules.activate.__cePerf4411Wrapped){
      const old = modules.activate;
      const wrapped = async function(name, options){
        const t0 = now();
        try{ return await old.apply(this, arguments); }
        finally{
          const ms = Math.round((now() - t0) * 10) / 10;
          state.counters.moduleActivations += 1;
          state.timings.lastModuleMs = ms;
          state.timings.maxModuleMs = Math.max(state.timings.maxModuleMs || 0, ms);
          pushEvent('module.activate', {name: text(name), ms, reason: text(options?.reason || '')});
        }
      };
      wrapped.__cePerf4411Wrapped = true;
      wrapped.__cePerf4411Original = old;
      modules.activate = wrapped;
    }
  }

  function installObservers(){
    if(!window.__cePerf4411Events){
      window.__cePerf4411Events = true;
      window.addEventListener('error', e => recordError('error', e.error || e.message));
      window.addEventListener('unhandledrejection', e => recordError('unhandledrejection', e.reason || e));
      document.addEventListener('click', function(e){
        const el = e.target?.closest?.('button,[data-target],a');
        if(!el || el.id === 'cePerf4411Button' || el.closest?.('#cePerf4411Panel')) return;
        const label = text(el.id || el.dataset?.target || el.textContent).trim().slice(0, 70);
        if(label){ state.counters.clicksMenu += 1; pushEvent('click', {label}); }
      }, true);
      document.addEventListener('change', function(e){
        const el = e.target;
        if(el && (el.id === 'selectedEvent' || el.name === 'selectedEvent')){
          state.counters.eventChanges += 1;
          pushEvent('event.change', {eventId: text(el.value)});
          setTimeout(() => { sample('event-change'); scheduleUpdate(true); }, 100);
        }
      }, true);
    }
    if(!window.__cePerf4411MutationObserver && typeof MutationObserver === 'function'){
      window.__cePerf4411MutationObserver = new MutationObserver(list => {
        state.counters.domMutations += list.length;
        if(state.opened) scheduleUpdate();
      });
      safe(() => window.__cePerf4411MutationObserver.observe(document.body, {childList:true, subtree:true}), null);
    }
    if(!window.__cePerf4411LongTask && typeof PerformanceObserver === 'function'){
      safe(() => {
        const observer = new PerformanceObserver(list => {
          for(const entry of list.getEntries()){
            const ms = Math.round(entry.duration * 10) / 10;
            state.counters.longTasks += 1;
            state.timings.lastLongTaskMs = ms;
            state.timings.maxLongTaskMs = Math.max(state.timings.maxLongTaskMs || 0, ms);
            pushEvent('longtask', {ms});
          }
        });
        observer.observe({entryTypes:['longtask']});
        window.__cePerf4411LongTask = observer;
      }, null);
    }
  }

  function injectCss(){
    if(byId('cePerf4411Style')) return;
    const style = document.createElement('style');
    style.id = 'cePerf4411Style';
    style.textContent = `
      #cePerf4411Button{position:fixed!important;left:10px!important;bottom:10px!important;z-index:2147483640!important;border:0!important;border-radius:999px!important;background:#111827!important;color:#fff!important;font:800 12px/1 system-ui,-apple-system,Segoe UI,sans-serif!important;letter-spacing:.04em!important;padding:9px 11px!important;box-shadow:0 8px 22px rgba(0,0,0,.28)!important;opacity:.92!important;touch-action:manipulation!important;-webkit-user-select:none!important;user-select:none!important}
      #cePerf4411Button:active{transform:translateY(1px)!important}
      #cePerf4411Panel{position:fixed!important;left:10px!important;bottom:54px!important;z-index:2147483639!important;width:min(420px,calc(100vw - 20px))!important;max-height:min(72vh,560px)!important;overflow:auto!important;display:none;background:rgba(15,23,42,.98)!important;color:#f9fafb!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:18px!important;box-shadow:0 20px 56px rgba(0,0,0,.38)!important;font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif!important;padding:12px!important;box-sizing:border-box!important}
      #cePerf4411Panel.open{display:block!important}
      #cePerf4411Panel h3{margin:0 0 8px 0!important;font-size:14px!important;color:#fff!important}
      #cePerf4411Panel .grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
      #cePerf4411Panel .item{background:rgba(255,255,255,.08)!important;border-radius:10px!important;padding:7px!important;min-width:0!important}
      #cePerf4411Panel .label{font-size:10px!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:#93c5fd!important;margin-bottom:2px!important}
      #cePerf4411Panel .value{font-weight:800!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#fff!important}
      #cePerf4411Panel pre{background:rgba(0,0,0,.26)!important;color:#d1d5db!important;border-radius:10px!important;padding:8px!important;max-height:150px!important;overflow:auto!important;white-space:pre-wrap!important;word-break:break-word!important;margin:8px 0!important}
      #cePerf4411Panel .actions{display:flex!important;gap:6px!important;flex-wrap:wrap!important;margin-top:8px!important}
      #cePerf4411Panel button{border:0!important;border-radius:9px!important;background:#fbbf24!important;color:#111827!important;font-weight:800!important;padding:7px 9px!important;font-size:11px!important;touch-action:manipulation!important}
      #cePerf4411Panel button.secondary{background:rgba(255,255,255,.16)!important;color:#fff!important}
      @media(max-width:760px){#cePerf4411Button{left:8px!important;bottom:8px!important;padding:8px 10px!important;font-size:11px!important}#cePerf4411Panel{left:8px!important;bottom:48px!important;width:calc(100vw - 16px)!important;max-height:70vh!important}}
    `;
    document.head.appendChild(style);
  }

  let updateTimer = null;
  function scheduleUpdate(force){
    if(!state.opened && !force) return;
    clearTimeout(updateTimer);
    updateTimer = setTimeout(updatePanel, 140);
  }

  function htmlEscape(value){
    return text(value).replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }
  function cell(label, value){
    return `<div class="item"><div class="label">${htmlEscape(label)}</div><div class="value">${htmlEscape(value)}</div></div>`;
  }

  function updatePanel(){
    const panel = byId('cePerf4411Panel');
    if(!panel || !state.opened) return;
    const last = sample('panel');
    const r = last.rows || {};
    const d = last.dom || {};
    const m = last.memory || {};
    const events = state.events.slice(-8).map(ev => `${ev.at} · ${ev.type}${ev.ms ? ' · '+ev.ms+'ms' : ''}${ev.label ? ' · '+ev.label : ''}${ev.name ? ' · '+ev.name : ''}`).join('\n');
    panel.innerHTML = `
      <h3>Diagnóstico rendimiento · v44.1.1</h3>
      <div class="grid">
        ${cell('Pantalla', last.screen || '-')}
        ${cell('Evento', last.eventId || '-')}
        ${cell('Memoria JS', m.label || 'No disponible')}
        ${cell('DOM', `${d.nodes || 0} nodos`)}
        ${cell('Botones / inputs', `${d.buttons || 0} / ${d.inputs || 0}`)}
        ${cell('Tarjetas', d.cards || 0)}
        ${cell('Renders', `${state.counters.renders} · max ${state.timings.maxRenderMs || 0} ms`)}
        ${cell('Visibilidad tabs', `${state.counters.renderTabVisibility} · max ${state.timings.maxRenderMs || 0} ms`)}
        ${cell('Módulos', `${state.counters.moduleActivations} · max ${state.timings.maxModuleMs || 0} ms`)}
        ${cell('Long tasks', `${state.counters.longTasks} · max ${state.timings.maxLongTaskMs || 0} ms`)}
        ${cell('Mutaciones DOM', state.counters.domMutations)}
        ${cell('Errores', state.counters.errors)}
      </div>
      <pre>Registros: eventos ${r.eventos||0}, personas ${r.personas||0}, productos ${r.productos||0}, tiendas ${r.tiendas||0}, ingresos ${r.ingresos||0}, compras ${r.compras||0}, donaciones ${r.donaciones||0}\nActualizado: ${last.updatedAt}\nArranque: ${last.bootMs} ms</pre>
      <pre>${htmlEscape(events || 'Sin eventos recientes')}</pre>
      <div class="actions">
        <button type="button" id="cePerf4411Copy">Copiar informe</button>
        <button type="button" id="cePerf4411Refresh" class="secondary">Actualizar</button>
        <button type="button" id="cePerf4411Clear" class="secondary">Limpiar</button>
        <button type="button" id="cePerf4411Close" class="secondary">Cerrar</button>
      </div>
    `;
    bindPanelButtons();
  }

  function bindPanelButtons(){
    const map = {
      cePerf4411Copy: copyReport,
      cePerf4411Refresh: updatePanel,
      cePerf4411Clear: clearCounters,
      cePerf4411Close: closePanel
    };
    Object.keys(map).forEach(id => {
      const btn = byId(id);
      if(!btn || btn.__cePerfBound) return;
      btn.__cePerfBound = true;
      ['pointerdown','touchstart','mousedown','click'].forEach(evt => btn.addEventListener(evt, e => {
        e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.();
        if(evt === 'click') map[id]();
      }, true));
    });
  }

  function report(){
    sample('report');
    return {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: location.href,
      last: state.last,
      counters: Object.assign({}, state.counters),
      timings: Object.assign({}, state.timings),
      recentEvents: state.events.slice(-80),
      recentErrors: state.errors.slice(-20),
      runtime: safe(() => window.ControlEventRuntime?.inspect?.(), null),
      modules: safe(() => window.ControlEventModules?.status?.(), null)
    };
  }

  function copyReport(){
    const text = JSON.stringify(report(), null, 2);
    const ok = () => { pushEvent('copied', {chars: text.length}); updatePanel(); };
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(ok).catch(() => fallbackCopy(text, ok));
    }else fallbackCopy(text, ok);
  }
  function fallbackCopy(value, cb){
    const area = document.createElement('textarea');
    area.value = value;
    area.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;';
    document.body.appendChild(area);
    area.focus(); area.select();
    safe(() => document.execCommand('copy'), null);
    area.remove();
    cb && cb();
  }

  function clearCounters(){
    Object.keys(state.counters).forEach(key => state.counters[key] = 0);
    Object.keys(state.timings).forEach(key => state.timings[key] = 0);
    state.events.length = 0;
    state.errors.length = 0;
    pushEvent('cleared');
    updatePanel();
  }
  function openPanel(){
    state.opened = true;
    const panel = byId('cePerf4411Panel');
    if(panel) panel.classList.add('open');
    updatePanel();
  }
  function closePanel(){
    state.opened = false;
    const panel = byId('cePerf4411Panel');
    if(panel) panel.classList.remove('open');
  }
  function togglePanel(){
    const t = now();
    if(t - state.lastToggleMs < 300) return;
    state.lastToggleMs = t;
    if(state.opened) closePanel(); else openPanel();
  }

  function ensureUi(){
    injectCss();
    const oldBtn = byId('cePerf4411Button') || byId('cePerf441Button');
    if(oldBtn) oldBtn.remove();
    const oldPanel = byId('cePerf4411Panel') || byId('cePerf441Panel');
    if(oldPanel) oldPanel.remove();

    const btn = document.createElement('button');
    btn.id = 'cePerf4411Button';
    btn.type = 'button';
    btn.textContent = 'PERF';
    btn.setAttribute('aria-label', 'Abrir diagnóstico de rendimiento');
    btn.removeAttribute('title');
    ['pointerdown','touchstart','mousedown','click'].forEach(evt => {
      btn.addEventListener(evt, function(e){
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        togglePanel();
      }, true);
    });
    const panel = document.createElement('div');
    panel.id = 'cePerf4411Panel';
    document.body.appendChild(panel);
    document.body.appendChild(btn);
  }

  function install(){
    installWrappers();
    installObservers();
    ensureUi();
    sample('install');
    pushEvent('installed', {version: VERSION});
  }

  window.ControlEventPerf = {
    version: VERSION,
    state,
    install,
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
    sample,
    report,
    copy: copyReport,
    print: function(){ const r = report(); console.log('[ControlEvent PERF]', r); try{ console.table(r.recentEvents); }catch(_){} return r; },
    clear: clearCounters
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  window.addEventListener('load', () => setTimeout(install, 80), {once:true});
  ['controlevent:app-ready','controlevent:runtime-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(installWrappers, 80)));
  setInterval(() => { installWrappers(); if(state.opened) updatePanel(); }, 3000);
})();
