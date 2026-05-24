/* ControlEvent v44.1 - Diagnóstico de rendimiento sin cambios funcionales.
   Objetivo: medir renders, cambios de ventana, uso aproximado de memoria, tamaño DOM y errores,
   sin tocar COMPRAS, DONACIONES, INFOEVENTO, BACKUP, GRAFICAS ni navegación. */
(function(){
  'use strict';
  if(window.ControlEventPerf && window.ControlEventPerf.version === 'ControlEvent v44.1') return;

  const VERSION = 'ControlEvent v44.1';
  const START = performance.now ? performance.now() : Date.now();
  const MAX_EVENTS = 180;
  const MAX_ERRORS = 40;
  const state = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    bootMs: 0,
    enabled: true,
    panelOpen: false,
    counters: {
      render: 0,
      moduleActivate: 0,
      menuClicks: 0,
      eventChanges: 0,
      longTasks: 0,
      errors: 0
    },
    timings: {
      renderLast: 0,
      renderMax: 0,
      activateLast: 0,
      activateMax: 0,
      lastLongTask: 0,
      maxLongTask: 0
    },
    last: {
      screen: '',
      module: '',
      eventId: '',
      rows: {},
      memory: null,
      dom: null,
      updatedAt: ''
    },
    events: [],
    errors: []
  };

  const $ = id => document.getElementById(id);
  const now = () => performance.now ? performance.now() : Date.now();
  const dt = start => Math.round((now() - start) * 10) / 10;
  const safe = fn => { try{ return fn(); }catch(_){ return undefined; } };
  const app = () => window.ControlEventApp || null;
  const appState = () => app()?.state || window.state || {};

  function pushEvent(type, detail = {}){
    const item = {at: new Date().toISOString(), msFromBoot: Math.round(now() - START), type, ...detail};
    state.events.push(item);
    if(state.events.length > MAX_EVENTS) state.events.splice(0, state.events.length - MAX_EVENTS);
    schedulePanelUpdate();
    return item;
  }

  function recordError(type, error){
    const msg = error?.message || error?.reason?.message || String(error?.reason || error || 'Error desconocido');
    const item = {at: new Date().toISOString(), type, message: msg, stack: String(error?.stack || error?.reason?.stack || '').slice(0, 900)};
    state.counters.errors++;
    state.errors.push(item);
    if(state.errors.length > MAX_ERRORS) state.errors.splice(0, state.errors.length - MAX_ERRORS);
    pushEvent('error', {message: msg.slice(0,160)});
  }

  function rowsCount(name){
    const s = appState();
    const value = s?.[name];
    return Array.isArray(value) ? value.length : 0;
  }

  function currentScreen(){
    return safe(() => app()?.navigation?.currentMainTab) || safe(() => window.currentMainTab) || safe(() => window.__ceCurrentMainTab) || '';
  }

  function memorySnapshot(){
    const mem = performance.memory;
    if(!mem) return null;
    const mb = n => Math.round((n / 1048576) * 10) / 10;
    return {usedMB: mb(mem.usedJSHeapSize || 0), totalMB: mb(mem.totalJSHeapSize || 0), limitMB: mb(mem.jsHeapSizeLimit || 0)};
  }

  function domSnapshot(){
    const all = document.getElementsByTagName('*').length;
    const controls = document.querySelectorAll('button,input,select,textarea,[onclick],[data-action],[data-target]').length;
    const cards = document.querySelectorAll('.card,.rowline,.resource-card,.ce-map-card,.compra-card,.donacion-card').length;
    return {nodes: all, controls, cards};
  }

  function dataSnapshot(){
    return {
      eventos: rowsCount('eventos'),
      personas: rowsCount('personas'),
      productos: rowsCount('productos'),
      tiendas: rowsCount('tiendas'),
      colaboradores: rowsCount('colaboradores'),
      compras: rowsCount('compras'),
      donaciones: rowsCount('donaciones') || rowsCount('donacionesProducto')
    };
  }

  function sample(reason = 'sample'){
    state.bootMs = Math.round(now() - START);
    state.last.screen = currentScreen();
    state.last.eventId = String(appState().selectedEventId || '');
    state.last.rows = dataSnapshot();
    state.last.memory = memorySnapshot();
    state.last.dom = domSnapshot();
    state.last.updatedAt = new Date().toLocaleTimeString();
    if(reason !== 'silent') pushEvent(reason, {screen: state.last.screen, eventId: state.last.eventId});
    else schedulePanelUpdate();
    return state.last;
  }

  function wrapRender(){
    const old = safe(() => window.render) || safe(() => render);
    if(typeof old !== 'function' || old.__cePerf441Wrapped) return false;
    const wrapped = function(){
      const t0 = now();
      try{ return old.apply(this, arguments); }
      finally{
        const ms = dt(t0);
        state.counters.render++;
        state.timings.renderLast = ms;
        state.timings.renderMax = Math.max(state.timings.renderMax, ms);
        pushEvent('render', {ms, screen: currentScreen()});
        setTimeout(() => sample('silent'), 40);
      }
    };
    wrapped.__cePerf441Wrapped = true;
    wrapped.__cePerf441Original = old;
    window.render = wrapped;
    safe(() => { render = wrapped; });
    return true;
  }

  function wrapModuleActivate(){
    const modules = window.ControlEventModules;
    if(!modules || typeof modules.activate !== 'function' || modules.activate.__cePerf441Wrapped) return false;
    const old = modules.activate;
    const wrapped = async function(name, options){
      const t0 = now();
      try{ return await old.apply(this, arguments); }
      finally{
        const ms = dt(t0);
        state.counters.moduleActivate++;
        state.timings.activateLast = ms;
        state.timings.activateMax = Math.max(state.timings.activateMax, ms);
        state.last.module = String(name || '');
        pushEvent('moduleActivate', {name: String(name || ''), ms, reason: options?.reason || ''});
        setTimeout(() => sample('silent'), 40);
      }
    };
    wrapped.__cePerf441Wrapped = true;
    wrapped.__cePerf441Original = old;
    modules.activate = wrapped;
    return true;
  }

  function installLongTaskObserver(){
    if(window.__cePerf441LongTaskInstalled || typeof PerformanceObserver !== 'function') return;
    safe(() => {
      const observer = new PerformanceObserver(list => {
        for(const entry of list.getEntries()){
          const duration = Math.round(entry.duration * 10) / 10;
          state.counters.longTasks++;
          state.timings.lastLongTask = duration;
          state.timings.maxLongTask = Math.max(state.timings.maxLongTask, duration);
          pushEvent('longTask', {duration});
        }
      });
      observer.observe({entryTypes:['longtask']});
      window.__cePerf441LongTaskInstalled = true;
      state.longTaskObserver = observer;
    });
  }

  function installEventListeners(){
    if(window.__cePerf441EventsInstalled) return;
    window.__cePerf441EventsInstalled = true;
    window.addEventListener('error', e => recordError('error', e.error || e.message));
    window.addEventListener('unhandledrejection', e => recordError('unhandledrejection', e.reason || e));
    ['controlevent:app-ready','controlevent:runtime-ready','controlevent:module-before-activate','controlevent:module-mounted'].forEach(name => {
      window.addEventListener(name, event => pushEvent(name, event.detail || {}));
    });
    document.addEventListener('click', event => {
      const btn = event.target?.closest?.('button,[data-target]');
      if(!btn) return;
      const id = btn.id || btn.dataset?.target || btn.textContent?.trim()?.slice(0,50) || 'control';
      if(/tab|menu|graf|resumen|compras|donacion|ingresos|mapa|manten|planific/i.test(id)){
        state.counters.menuClicks++;
        pushEvent('click', {id});
      }
    }, true);
    const selected = $('selectedEvent');
    if(selected && !selected.__cePerf441Change){
      selected.__cePerf441Change = true;
      selected.addEventListener('change', () => {
        state.counters.eventChanges++;
        pushEvent('eventChange', {eventId: selected.value || ''});
        setTimeout(() => sample('silent'), 80);
      }, true);
    }
  }

  let updatePending = false;
  function schedulePanelUpdate(){
    if(updatePending || !state.panelOpen) return;
    updatePending = true;
    setTimeout(() => { updatePending = false; updatePanel(); }, 120);
  }

  function css(){
    if($('cePerf441Style')) return;
    const style = document.createElement('style');
    style.id = 'cePerf441Style';
    style.textContent = `
      #cePerf441Button{position:fixed;left:10px;bottom:12px;z-index:2147482600;border:0;border-radius:999px;background:#0f172a;color:#fff;font-weight:800;font-size:12px;letter-spacing:.03em;padding:8px 10px;box-shadow:0 6px 18px rgba(15,23,42,.25);opacity:.82}
      #cePerf441Button:active{transform:translateY(1px)}
      #cePerf441Panel{position:fixed;left:10px;bottom:52px;z-index:2147482600;width:min(380px,calc(100vw - 20px));max-height:min(68vh,520px);overflow:auto;border-radius:18px;background:rgba(15,23,42,.96);color:#e5e7eb;box-shadow:0 18px 46px rgba(0,0,0,.33);font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:12px;padding:12px;border:1px solid rgba(255,255,255,.12)}
      #cePerf441Panel.hidden{display:none!important}
      #cePerf441Panel h3{margin:0 0 8px 0;font-size:14px;color:#fff}
      #cePerf441Panel .ce-perf-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
      #cePerf441Panel .ce-perf-item{background:rgba(255,255,255,.08);border-radius:10px;padding:7px;min-width:0}
      #cePerf441Panel .ce-perf-label{color:#93c5fd;font-size:10px;text-transform:uppercase;letter-spacing:.04em}
      #cePerf441Panel .ce-perf-value{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #cePerf441Panel .ce-perf-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
      #cePerf441Panel .ce-perf-actions button{border:0;border-radius:9px;background:#fbbf24;color:#111827;font-weight:800;padding:7px 9px;font-size:11px}
      #cePerf441Panel .ce-perf-actions button.secondary{background:rgba(255,255,255,.15);color:#fff}
      #cePerf441Panel pre{white-space:pre-wrap;word-break:break-word;margin:8px 0 0 0;max-height:130px;overflow:auto;background:rgba(0,0,0,.24);border-radius:10px;padding:8px;color:#d1d5db}
      @media(max-width:760px){#cePerf441Button{left:8px;bottom:10px;font-size:11px;padding:7px 9px}#cePerf441Panel{left:8px;bottom:48px;width:calc(100vw - 16px);font-size:11px}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    css();
    if(!$('cePerf441Button')){
      const button = document.createElement('button');
      button.id = 'cePerf441Button';
      button.type = 'button';
      button.textContent = 'PERF';
      button.title = 'Diagnóstico rendimiento ControlEvent v44.1';
      button.addEventListener('click', () => {
        state.panelOpen = !state.panelOpen;
        $('cePerf441Panel')?.classList.toggle('hidden', !state.panelOpen);
        sample('panel');
        updatePanel();
      });
      document.body.appendChild(button);
    }
    if(!$('cePerf441Panel')){
      const panel = document.createElement('div');
      panel.id = 'cePerf441Panel';
      panel.className = 'hidden';
      document.body.appendChild(panel);
    }
  }

  function formatMemory(mem){
    if(!mem) return 'No disponible';
    return `${mem.usedMB} / ${mem.totalMB} MB`;
  }

  function updatePanel(){
    const panel = $('cePerf441Panel');
    if(!panel || !state.panelOpen) return;
    const last = state.last || {};
    const rows = last.rows || {};
    const dom = last.dom || {};
    panel.innerHTML = `
      <h3>PERF · ControlEvent v44.1</h3>
      <div class="ce-perf-grid">
        <div class="ce-perf-item"><div class="ce-perf-label">Pantalla</div><div class="ce-perf-value">${last.screen || '-'}</div></div>
        <div class="ce-perf-item"><div class="ce-perf-label">Evento</div><div class="ce-perf-value">${last.eventId || '-'}</div></div>
        <div class="ce-perf-item"><div class="ce-perf-label">Memoria JS</div><div class="ce-perf-value">${formatMemory(last.memory)}</div></div>
        <div class="ce-perf-item"><div class="ce-perf-label">DOM</div><div class="ce-perf-value">${dom.nodes || 0} nodos</div></div>
        <div class="ce-perf-item"><div class="ce-perf-label">Renders</div><div class="ce-perf-value">${state.counters.render} · max ${state.timings.renderMax} ms</div></div>
        <div class="ce-perf-item"><div class="ce-perf-label">Módulos</div><div class="ce-perf-value">${state.counters.moduleActivate} · max ${state.timings.activateMax} ms</div></div>
        <div class="ce-perf-item"><div class="ce-perf-label">Long tasks</div><div class="ce-perf-value">${state.counters.longTasks} · max ${state.timings.maxLongTask} ms</div></div>
        <div class="ce-perf-item"><div class="ce-perf-label">Errores</div><div class="ce-perf-value">${state.counters.errors}</div></div>
      </div>
      <pre>Filas: eventos ${rows.eventos||0}, personas ${rows.personas||0}, productos ${rows.productos||0}, tiendas ${rows.tiendas||0}, ingresos ${rows.colaboradores||0}, compras ${rows.compras||0}, donaciones ${rows.donaciones||0}\nActualizado: ${last.updatedAt || '-'}</pre>
      <div class="ce-perf-actions">
        <button type="button" id="cePerf441Copy">Copiar informe</button>
        <button type="button" class="secondary" id="cePerf441Refresh">Actualizar</button>
        <button type="button" class="secondary" id="cePerf441Clear">Limpiar</button>
        <button type="button" class="secondary" id="cePerf441Close">Cerrar</button>
      </div>
    `;
    $('cePerf441Copy')?.addEventListener('click', copyReport);
    $('cePerf441Refresh')?.addEventListener('click', () => { sample('manual'); updatePanel(); });
    $('cePerf441Clear')?.addEventListener('click', clear);
    $('cePerf441Close')?.addEventListener('click', () => { state.panelOpen = false; panel.classList.add('hidden'); });
  }

  function report(){
    sample('silent');
    return {
      version: VERSION,
      userAgent: navigator.userAgent,
      url: location.href,
      generatedAt: new Date().toISOString(),
      bootMs: state.bootMs,
      counters: {...state.counters},
      timings: {...state.timings},
      last: JSON.parse(JSON.stringify(state.last || {})),
      recentEvents: state.events.slice(-80),
      recentErrors: state.errors.slice(-20),
      runtime: safe(() => window.ControlEventRuntime?.inspect?.()) || null,
      screenLazy: safe(() => window.ControlEventScreenLazy?.info?.()) || null,
      mobileLite: safe(() => window.ControlEventRuntime?.inspect?.().mobileLite) || null
    };
  }

  function copyReport(){
    const text = JSON.stringify(report(), null, 2);
    const done = () => pushEvent('reportCopied', {chars: text.length});
    if(navigator.clipboard?.writeText){
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    }else{
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done){
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    safe(() => document.execCommand('copy'));
    area.remove();
    done?.();
  }

  function clear(){
    state.events.length = 0;
    state.errors.length = 0;
    state.counters.render = 0;
    state.counters.moduleActivate = 0;
    state.counters.menuClicks = 0;
    state.counters.eventChanges = 0;
    state.counters.longTasks = 0;
    state.counters.errors = 0;
    state.timings.renderLast = state.timings.renderMax = 0;
    state.timings.activateLast = state.timings.activateMax = 0;
    state.timings.lastLongTask = state.timings.maxLongTask = 0;
    sample('cleared');
    updatePanel();
  }

  function install(){
    installEventListeners();
    installLongTaskObserver();
    wrapRender();
    wrapModuleActivate();
    ensurePanel();
    sample('install');
  }

  window.ControlEventPerf = {
    version: VERSION,
    state,
    install,
    sample,
    report,
    print: () => { const r = report(); console.group('[ControlEvent PERF v44.1]'); console.log(r); console.table(r.recentEvents || []); console.groupEnd(); return r; },
    copy: copyReport,
    clear
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  ['load','controlevent:app-ready','controlevent:runtime-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 60)));
  setInterval(() => {
    wrapRender();
    wrapModuleActivate();
    sample('silent');
  }, 5000);
})();
