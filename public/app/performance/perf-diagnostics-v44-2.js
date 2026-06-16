/* ControlEvent v9.4_prod - Diagnóstico de rendimiento robusto.
   Solo instrumenta y muestra datos. No cambia la lógica funcional de la app. */
(function(){
  'use strict';

  const VERSION = 'ControlEvent v9.4_prod';
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
  function auth(){ return app()?.authUser || window.authUser || null; }
  function userLevel(){ return text(auth()?.nivel || '').trim().toUpperCase(); }
  function isPcLike(){
    const ua = navigator.userAgent || '';
    const mobileUA = /iPad|iPhone|Android|Mobile/i.test(ua);
    const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    const narrow = !!(window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
    return !mobileUA && !coarse && !narrow;
  }
  function perfAllowed(){
    const level = userLevel();
    return isPcLike() && (level === 'GD' || level === 'RW');
  }
  function removeUi(){
    state.opened = false;
    const btn = byId('cePerf442Button') || byId('cePerf441Button');
    if(btn) btn.remove();
    const panel = byId('cePerf442Panel') || byId('cePerf441Panel');
    if(panel) panel.remove();
  }

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
  function isDonationTicket(value){
    return ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(text(value).trim());
  }
  function rows(){
    const eventId = selectedEventId();
    const comprasAll = arr('compras');
    const ingresosAll = arr('colaboradores').length ? arr('colaboradores') : arr('asistentes');
    const donacionesStandalone = arr('donaciones').length ? arr('donaciones') : arr('donacionesProducto');
    const comprasEvent = comprasAll.filter(row => !eventId || text(row.eventId) === eventId);
    const ingresosEvent = ingresosAll.filter(row => !eventId || text(row.eventId) === eventId);
    const donacionesComprasAll = comprasAll.filter(row => isDonationTicket(row.ticketDonacion));
    const donacionesComprasEvent = comprasEvent.filter(row => isDonationTicket(row.ticketDonacion));
    const total = {
      eventos: arr('eventos').length,
      personas: arr('personas').length,
      productos: arr('productos').length,
      tiendas: arr('tiendas').length,
      ingresos: ingresosAll.length,
      compras: comprasAll.filter(row => !isDonationTicket(row.ticketDonacion)).length,
      donaciones: donacionesStandalone.length || donacionesComprasAll.length
    };
    const evento = {
      ingresos: ingresosEvent.length,
      compras: comprasEvent.filter(row => !isDonationTicket(row.ticketDonacion)).length,
      donaciones: donacionesStandalone.filter(row => !eventId || text(row.eventId) === eventId).length || donacionesComprasEvent.length
    };
    const renderizado = {
      ingresos: document.querySelectorAll('#collabList > .itemcard, #collabList > .rowline, #collabList > .persona').length,
      compras: document.querySelectorAll('#comprasList > .itemcard').length,
      donaciones: document.querySelectorAll('#donacionesList > .itemcard').length,
      mapa: document.querySelectorAll('#mapaProductosList .resource-card,#mapaProductosList .card,#mapaProductosList [data-id]').length,
      resumen: document.querySelectorAll('#budgetLayout .budget-card,#summarySegmento .summary-item,#summaryDestino .summary-item,#summaryTiendaTicket .summary-item').length,
      graficas: document.querySelectorAll('#eventChartWrap .ce-v434-pie-card,#eventChartWrap .ce-v434-destino-card,#eventChartWrap svg,#eventChartWrap canvas').length
    };
    return Object.assign({}, total, {total, evento, renderizado});
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

  const renderOptimizer = {installed:false, guards:0, prunes:0, clearedNodes:0, lastReason:''};
  const dynamicGroups = {
    ingresos: ['collabList'],
    compras: ['comprasList'],
    donaciones: ['donacionesList'],
    mapa: ['mapaProductosSummary','mapaProductosList'],
    resumen: ['budgetLayout','summarySegmento','summaryDestino','summaryTiendaTicket'],
    graficas: ['eventChartWrap']
  };
  const tabByGroup = {
    ingresos:'tabIngresos', compras:'tabCompras', donaciones:'tabDonaciones',
    mapa:'tabMapaProductos', resumen:'tabResumen', graficas:'tabGraficas'
  };
  function visibleElement(id){
    const el = byId(id);
    return !!(el && !el.classList.contains('hidden') && el.offsetParent !== null);
  }
  function activeGroup(){
    for(const [group, id] of Object.entries(tabByGroup)){
      if(visibleElement(id)) return group;
    }
    return '';
  }
  function clearContainer(id){
    const el = byId(id);
    if(!el || !el.childNodes || !el.childNodes.length) return 0;
    const count = el.getElementsByTagName ? el.getElementsByTagName('*').length : el.childNodes.length;
    el.replaceChildren();
    el.dataset.cePruned = '1';
    return count;
  }
  function pruneInactiveDynamicDom(reason){
    const active = activeGroup();
    let cleared = 0;
    Object.entries(dynamicGroups).forEach(([group, ids]) => {
      if(group === active) return;
      ids.forEach(id => { cleared += clearContainer(id); });
    });
    const maint = byId('maintenanceWrapper');
    if(maint && maint.classList.contains('hidden')){
      ['personasList','eventosList','tiendasList','productosList','accesoList'].forEach(id => { cleared += clearContainer(id); });
    }
    if(cleared){
      renderOptimizer.prunes += 1;
      renderOptimizer.clearedNodes += cleared;
      renderOptimizer.lastReason = reason || 'prune';
      pushEvent('dom.prune', {active, cleared, reason: reason || ''});
    }
    return cleared;
  }
  function guardRenderFunction(name, tabId){
    const old = window[name];
    if(typeof old !== 'function' || old.__cePerf442Guarded) return false;
    const wrapped = function(){
      const tab = byId(tabId);
      if(tab && tab.classList.contains('hidden')){
        renderOptimizer.guards += 1;
        return undefined;
      }
      return old.apply(this, arguments);
    };
    wrapped.__cePerf442Guarded = true;
    wrapped.__cePerf442Original = old;
    window[name] = wrapped;
    return true;
  }
  function installRenderOptimizer(){
    // v45.4: el diagnóstico ya NO limpia automáticamente el DOM.
    // La limpieza global de v44.2/v45.4 era útil para medir, pero generaba demasiadas pasadas
    // y podía convertirse en otro proceso pesado. Aquí solo se mantienen métricas y una acción manual.
    if(renderOptimizer.installed) return;
    renderOptimizer.installed = true;
    renderOptimizer.mode = 'diagnostic-only-no-auto-prune';
    renderOptimizer.lastReason = 'v45.4: limpieza automática desactivada';
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
    if(typeof old !== 'function' || old.__cePerf442Wrapped) return false;
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
    wrapped.__cePerf442Wrapped = true;
    wrapped.__cePerf442Original = old;
    window[name] = wrapped;
    return true;
  }

  function installWrappers(){
    wrapGlobalFunction('render', 'renders', 'maxRenderMs', 'lastRenderMs');
    wrapGlobalFunction('renderTabVisibility', 'renderTabVisibility', 'maxRenderMs', 'lastRenderMs');
    const modules = window.ControlEventModules;
    if(modules && typeof modules.activate === 'function' && !modules.activate.__cePerf442Wrapped){
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
      wrapped.__cePerf442Wrapped = true;
      wrapped.__cePerf442Original = old;
      modules.activate = wrapped;
    }
  }

  function installObservers(){
    if(!window.__cePerf442Events){
      window.__cePerf442Events = true;
      window.addEventListener('error', e => recordError('error', e.error || e.message));
      window.addEventListener('unhandledrejection', e => recordError('unhandledrejection', e.reason || e));
      document.addEventListener('click', function(e){
        const el = e.target?.closest?.('button,[data-target],a');
        if(!el || el.id === 'cePerf442Button' || el.closest?.('#cePerf442Panel')) return;
        const label = text(el.id || el.dataset?.target || el.textContent).trim().slice(0, 70);
        if(label){ state.counters.clicksMenu += 1; pushEvent('click', {label}); }
      }, true);
      document.addEventListener('change', function(e){
        const el = e.target;
        if(el && (el.id === 'selectedEvent' || el.name === 'selectedEvent')){
          state.counters.eventChanges += 1;
          pushEvent('event.change', {eventId: text(el.value)});
          setTimeout(() => { sample('event-change'); scheduleUpdate(true); }, 100);
          setTimeout(() => { sample('event-change-late'); scheduleUpdate(true); }, 900);
        }
      }, true);
      ['controlevent:module-before-activate','controlevent:module-mounted','controlevent:app-ready','controlevent:runtime-ready'].forEach(evt => {
        window.addEventListener(evt, event => {
          const detail = event.detail || {};
          pushEvent(evt.replace('controlevent:',''), {name: text(detail.name || detail.viewId || '')});
          setTimeout(() => { sample(evt); scheduleUpdate(true); }, 80);
        });
      });
    }
    if(!window.__cePerf442MutationObserver && typeof MutationObserver === 'function'){
      window.__cePerf442MutationObserver = new MutationObserver(list => {
        state.counters.domMutations += list.length;
        if(state.opened) scheduleUpdate();
      });
      safe(() => window.__cePerf442MutationObserver.observe(document.body, {childList:true, subtree:true}), null);
    }
    if(!window.__cePerf442LongTask && typeof PerformanceObserver === 'function'){
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
        window.__cePerf442LongTask = observer;
      }, null);
    }
  }

  function injectCss(){
    if(byId('cePerf442Style')) return;
    const style = document.createElement('style');
    style.id = 'cePerf442Style';
    style.textContent = `
      #cePerf442Button{position:fixed!important;left:10px!important;bottom:10px!important;z-index:2147483640!important;border:0!important;border-radius:999px!important;background:#111827!important;color:#fff!important;font:800 12px/1 system-ui,-apple-system,Segoe UI,sans-serif!important;letter-spacing:.04em!important;padding:9px 11px!important;box-shadow:0 8px 22px rgba(0,0,0,.28)!important;opacity:.92!important;touch-action:manipulation!important;-webkit-user-select:none!important;user-select:none!important}
      #cePerf442Button:active{transform:translateY(1px)!important}
      #cePerf442Panel{position:fixed!important;left:10px!important;bottom:54px!important;z-index:2147483639!important;width:min(420px,calc(100vw - 20px))!important;max-height:min(72vh,560px)!important;overflow:auto!important;display:none;background:rgba(15,23,42,.98)!important;color:#f9fafb!important;border:1px solid rgba(255,255,255,.18)!important;border-radius:18px!important;box-shadow:0 20px 56px rgba(0,0,0,.38)!important;font:12px/1.35 system-ui,-apple-system,Segoe UI,sans-serif!important;padding:12px!important;box-sizing:border-box!important}
      #cePerf442Panel.open{display:block!important}
      #cePerf442Panel h3{margin:0 0 8px 0!important;font-size:14px!important;color:#fff!important}
      #cePerf442Panel .grid{display:grid!important;grid-template-columns:1fr 1fr!important;gap:6px!important}
      #cePerf442Panel .item{background:rgba(255,255,255,.08)!important;border-radius:10px!important;padding:7px!important;min-width:0!important}
      #cePerf442Panel .label{font-size:10px!important;letter-spacing:.05em!important;text-transform:uppercase!important;color:#93c5fd!important;margin-bottom:2px!important}
      #cePerf442Panel .value{font-weight:800!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;color:#fff!important}
      #cePerf442Panel pre{background:rgba(0,0,0,.26)!important;color:#d1d5db!important;border-radius:10px!important;padding:8px!important;max-height:150px!important;overflow:auto!important;white-space:pre-wrap!important;word-break:break-word!important;margin:8px 0!important}
      #cePerf442Panel .actions{display:flex!important;gap:6px!important;flex-wrap:wrap!important;margin-top:8px!important}
      #cePerf442Panel button{border:0!important;border-radius:9px!important;background:#fbbf24!important;color:#111827!important;font-weight:800!important;padding:7px 9px!important;font-size:11px!important;touch-action:manipulation!important}
      #cePerf442Panel button.secondary{background:rgba(255,255,255,.16)!important;color:#fff!important}
      @media(max-width:760px){#cePerf442Button{left:8px!important;bottom:8px!important;padding:8px 10px!important;font-size:11px!important}#cePerf442Panel{left:8px!important;bottom:48px!important;width:calc(100vw - 16px)!important;max-height:70vh!important}}
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
    const panel = byId('cePerf442Panel');
    if(!panel || !state.opened) return;
    const last = sample('panel');
    const r = last.rows || {};
    const d = last.dom || {};
    const m = last.memory || {};
    const events = state.events.slice(-8).map(ev => `${ev.at} · ${ev.type}${ev.ms ? ' · '+ev.ms+'ms' : ''}${ev.label ? ' · '+ev.label : ''}${ev.name ? ' · '+ev.name : ''}`).join('\n');
    panel.innerHTML = `
      <h3>Diagnóstico rendimiento · ${htmlEscape(VERSION)}</h3>
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
      <pre>BD total: eventos ${r.total?.eventos||0}, personas ${r.total?.personas||0}, productos ${r.total?.productos||0}, tiendas ${r.total?.tiendas||0}, ingresos ${r.total?.ingresos||0}, compras ${r.total?.compras||0}, donaciones ${r.total?.donaciones||0}\nEvento activo: ingresos ${r.evento?.ingresos||0}, compras ${r.evento?.compras||0}, donaciones ${r.evento?.donaciones||0}\nRenderizado: ingresos ${r.renderizado?.ingresos||0}, compras ${r.renderizado?.compras||0}, donaciones ${r.renderizado?.donaciones||0}, mapa ${r.renderizado?.mapa||0}, resumen ${r.renderizado?.resumen||0}, gráficas ${r.renderizado?.graficas||0}\nOptimización DOM: guardias ${renderOptimizer.guards}, limpiezas ${renderOptimizer.prunes}, nodos limpiados ${renderOptimizer.clearedNodes}
Optimización v45.4: limpiezas ${window.__ceV443Stats?.prunes||0}, nodos ${window.__ceV443Stats?.clearedNodes||0}\nActualizado: ${last.updatedAt}\nArranque: ${last.bootMs} ms</pre>
      <pre>${htmlEscape(events || 'Sin eventos recientes')}</pre>
      <div class="actions">
        <button type="button" id="cePerf442Copy">Copiar informe</button>
        <button type="button" id="cePerf442Refresh" class="secondary">Actualizar</button>
        <button type="button" id="cePerf442Clear" class="secondary">Limpiar</button>
        <button type="button" id="cePerf442Close" class="secondary">Cerrar</button>
      </div>
    `;
    bindPanelButtons();
  }

  function bindPanelButtons(){
    const map = {
      cePerf442Copy: copyReport,
      cePerf442Refresh: updatePanel,
      cePerf442Clear: clearCounters,
      cePerf442Close: closePanel
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
      modules: safe(() => window.ControlEventModules?.status?.(), null),
      renderOptimizer: Object.assign({}, renderOptimizer)
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
    const panel = byId('cePerf442Panel');
    if(panel) panel.classList.add('open');
    updatePanel();
  }
  function closePanel(){
    state.opened = false;
    const panel = byId('cePerf442Panel');
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
    // v45.4: no recrear el botón/panel en cada refresco de instalación.
    // El intervalo de instalación anterior eliminaba el panel abierto y por eso PERF aparecía un instante y desaparecía.
    const old441Btn = byId('cePerf441Button');
    if(old441Btn) old441Btn.remove();
    const old441Panel = byId('cePerf441Panel');
    if(old441Panel) old441Panel.remove();

    let panel = byId('cePerf442Panel');
    if(!panel){
      panel = document.createElement('div');
      panel.id = 'cePerf442Panel';
      document.body.appendChild(panel);
    }

    let btn = byId('cePerf442Button');
    if(!btn){
      btn = document.createElement('button');
      btn.id = 'cePerf442Button';
      btn.type = 'button';
      btn.textContent = 'PERF';
      btn.setAttribute('aria-label', 'Abrir diagnóstico de rendimiento');
      btn.removeAttribute('title');
      document.body.appendChild(btn);
    }
    if(!btn.__cePerf442ToggleBound){
      btn.__cePerf442ToggleBound = true;
      ['pointerdown','touchstart','mousedown','click'].forEach(evt => {
        btn.addEventListener(evt, function(e){
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          if(evt === 'click') togglePanel();
        }, true);
      });
    }
    btn.style.pointerEvents = 'auto';
    btn.disabled = false;
    if(state.opened) panel.classList.add('open');
  }

  let coreInstalled = false;
  function install(){
    if(!perfAllowed()){
      removeUi();
      return;
    }
    installWrappers();
    installObservers();
    installRenderOptimizer();
    ensureUi();
    sample(coreInstalled ? 'install-refresh' : 'install');
    if(!coreInstalled){
      pushEvent('installed', {version: VERSION, scope:'pc-gd-rw'});
      coreInstalled = true;
    }
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
    clear: clearCounters,
    prune: pruneInactiveDynamicDom,
    optimizer: renderOptimizer
  };

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  window.addEventListener('load', () => setTimeout(install, 80), {once:true});
  ['controlevent:app-ready','controlevent:runtime-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(install, 80)));
  // v45.4: PERF solo se ofrece en PC para usuarios GD/RW; sin UI ni instrumentación activa en móvil/tablet/RO.
  setInterval(() => {
    install();
    if(state.opened) updatePanel();
  }, 1200);
})();
