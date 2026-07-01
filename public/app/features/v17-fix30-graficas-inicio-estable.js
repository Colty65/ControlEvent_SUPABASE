/* ControlEvent v17_prod FIX30
   - Primera selección tras login: Gráficas no debe quedarse en 0/sin datos hasta Refrescar.
   - Cambio entre eventos: mantener el render estable, conservar maestros y reducir retemblor visual.
   - No cambia cálculos; solo sincroniza estado/selector y fuerza render V46 cuando ya hay datos del evento. */
(function(){
  'use strict';
  if(window.__ceV17Fix30GraficasInicioEstable) return;
  window.__ceV17Fix30GraficasInicioEstable = true;

  const VERSION = 'v17_prod_FIX30';
  const $ = id => document.getElementById(id);
  const text = v => String(v == null ? '' : v).trim();
  const now = () => Date.now();
  const metrics = window.ControlEventFix30Graficas = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    ensures: 0,
    forcedRenders: 0,
    fixedSelector: 0,
    normalizedRows: 0,
    okSkips: 0,
    lastEventId: '',
    lastReason: '',
    lastBlankSnippet: ''
  };

  function st(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp?.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  function arr(k){ const a = st()[k]; return Array.isArray(a) ? a : []; }
  function currentEventId(){ return text(st().selectedEventId || $('selectedEvent')?.value || window.ControlEventV447?.state?.eventId || ''); }
  function eventById(id){ id = text(id); return arr('eventos').find(e => text(e?.id) === id) || null; }
  function graficasVisible(){ const t = $('tabGraficas'); return !!t && !t.classList.contains('hidden'); }
  function wrap(){ return $('eventChartWrap'); }

  function rowEventId(r){ return text(r?.eventId || r?.event_id || r?.eventoId || r?.evento_id || r?.idEvento || r?.evento || ''); }
  function rowBelongsOrScoped(r, id){
    const ev = rowEventId(r);
    if(ev) return ev === id;
    // Si la lectura es scoped y una fila viene sin eventId, se asume del evento seleccionado.
    return !!id;
  }
  function normalizeScopedRows(id){
    id = text(id); if(!id) return;
    ['compras','colaboradores','donaciones','eventDocuments'].forEach(k => {
      const rows = arr(k);
      if(!rows.length) return;
      rows.forEach(r => {
        if(r && typeof r === 'object' && !r.eventId && !r.event_id){ r.eventId = id; metrics.normalizedRows++; }
      });
    });
  }
  function dataCount(id){
    id = text(id); if(!id) return 0;
    let n = 0;
    ['compras','colaboradores','donaciones','eventDocuments'].forEach(k => { n += arr(k).filter(r => rowBelongsOrScoped(r, id)).length; });
    const imgs = st().ticketImages || {}; const refs = st().ticketImageRefs || {};
    if(imgs && typeof imgs === 'object') n += Object.keys(imgs).filter(k => text(k).startsWith(id + '|')).length;
    if(refs && typeof refs === 'object') n += Object.keys(refs).filter(k => text(k).startsWith(id + '|')).length;
    return n;
  }

  let protoDesc = null;
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
  function rawGet(el){ try{ const d = getProtoDesc(); return d ? d.get.call(el) : el.innerHTML; }catch(_){ return el?.innerHTML || ''; } }

  function pieCount(html){ return (String(html || '').match(/ce-v434-pie-card/g) || []).length; }
  function isStrictV46(html){
    html = String(html || '');
    return html.includes('ce-v46-pies') && pieCount(html) >= 6 && /SALDO ACTUAL/i.test(html) && /SALDO OPERATIVO/i.test(html) && /VALORACION DEL EVENTO/i.test(html);
  }
  function isBlankGraph(html){
    html = String(html || '');
    if(!html) return true;
    const slices = (html.match(/ce-v434-pie-slice/g) || []).length;
    const sinDatos = (html.match(/Sin datos/g) || []).length;
    const ceros = (html.match(/0,00\s*€/g) || []).length;
    return isStrictV46(html) && slices === 0 && (sinDatos >= 2 || ceros >= 5 || /Sin datos por destino/i.test(html));
  }
  function chartOk(){ const w = wrap(); if(!w) return false; const html = rawGet(w); return isStrictV46(html) && !isBlankGraph(html); }

  function syncSelector(id){
    id = text(id); if(!id) return;
    const s = st();
    try{ s.selectedEventId = id; }catch(_){ }
    try{ window.state = s; }catch(_){ }
    try{ if(window.ControlEventApp) window.ControlEventApp.state = s; }catch(_){ }
    const sel = $('selectedEvent');
    if(sel){
      const has = Array.from(sel.options || []).some(o => o.value === id);
      if(!has){
        const ev = eventById(id);
        if(ev){ const opt = document.createElement('option'); opt.value = id; opt.textContent = ev.titulo || ev.nombre || id; sel.appendChild(opt); }
      }
      if(sel.value !== id){ try{ sel.value = id; metrics.fixedSelector++; }catch(_){ } }
    }
  }

  function looksV46Renderer(fn){
    if(typeof fn !== 'function') return false;
    try{ const src = Function.prototype.toString.call(fn); return src.includes('ce-v46-pies') && src.includes('VALORACION DEL EVENTO') && src.includes('SALDO ACTUAL'); }catch(_){ return false; }
  }
  function unwrap(fn){
    let f = fn; const seen = new Set();
    for(let i=0; i<12 && typeof f === 'function' && !seen.has(f); i++){
      seen.add(f);
      if(looksV46Renderer(f)) return f;
      let n = f.__ceFix30Original || f.__ceOpt2HOriginal || f.__ceOpt2GOriginal || f.__ceOpt2FOriginal || f.__ceOpt2EOriginal || f.__ceOpt2COriginal || f.__ceOpt2Original || f.__ceV447Original;
      if(typeof n === 'function'){
        if(looksV46Renderer(n)){ f = n; continue; }
        // En Opt2H el original es un getter sin argumentos: () => v46Renderer.
        // No llamamos a cualquier función porque algunas son renderers reales con efecto lateral.
        let src = '';
        try{ src = Function.prototype.toString.call(n); }catch(_){ }
        if(/=>\s*v46Renderer|return\s+v46Renderer/.test(src)){
          let maybe = null;
          try{ maybe = n(); }catch(_){ }
          if(looksV46Renderer(maybe)){ f = maybe; continue; }
        }
      }
      if(!n || n === f) break;
      f = n;
    }
    return looksV46Renderer(f) ? f : null;
  }
  function findRealRenderer(){
    const candidates = [
      window.ControlEventV462?.renderGraficas,
      window.ControlEventV461?.renderGraficas,
      window.ControlEventV460?.renderGraficas,
      window.ControlEventV434?.renderGraficas,
      window.ControlEventV435?.renderGraficas,
      window.ControlEventV436?.renderGraficas,
      window.renderGraficas
    ];
    for(const c of candidates){ const f = unwrap(c); if(f) return f; }
    return null;
  }

  function injectStyle(){
    if($('ceV17Fix30GraficasStyle')) return;
    const stl = document.createElement('style');
    stl.id = 'ceV17Fix30GraficasStyle';
    stl.textContent = `
      #eventChartWrap.ce-fix30-graph-stabilizing{contain:layout paint;min-height:var(--ce-fix30-graph-h,560px)!important;}
      #eventChartWrap.ce-fix30-graph-stabilizing *{transition:none!important;animation:none!important;scroll-behavior:auto!important;}
      body.ce-fix30-graph-switching #tabGraficas{min-height:var(--ce-fix30-tab-h,680px)!important;}
      body.ce-fix30-graph-switching #ceOpt1Notice,
      body.ce-fix30-graph-switching #ceEventSwitchNotice,
      body.ce-fix30-graph-switching .ce-v447-loading{display:none!important;visibility:hidden!important;opacity:0!important;}
    `;
    document.head.appendChild(stl);
  }
  function markStabilizing(on){
    const w = wrap(); if(!w) return;
    if(on){
      try{ document.documentElement.style.setProperty('--ce-fix30-graph-h', Math.max(520, Math.round(w.scrollHeight || w.getBoundingClientRect().height || 560)) + 'px'); }catch(_){ }
      w.classList.add('ce-fix30-graph-stabilizing');
      document.body.classList.add('ce-fix30-graph-switching');
    }else{
      w.classList.remove('ce-fix30-graph-stabilizing');
      document.body.classList.remove('ce-fix30-graph-switching');
    }
  }

  let lastForcedAt = 0;
  function ensureGraficas(id, reason){
    injectStyle();
    if(!graficasVisible()) return;
    id = text(id || currentEventId());
    if(!id) return;
    metrics.ensures++;
    metrics.lastEventId = id;
    metrics.lastReason = reason || 'ensure';
    syncSelector(id);
    normalizeScopedRows(id);
    const w = wrap(); if(!w) return;
    const count = dataCount(id);
    const html = rawGet(w);
    if(isStrictV46(html) && !isBlankGraph(html)){
      metrics.okSkips++;
      markStabilizing(false);
      try{ window.ControlEventOpt2H?.reassert?.('fix30-ok'); }catch(_){ }
      return;
    }
    metrics.lastBlankSnippet = String(html || '').replace(/\s+/g,' ').slice(0,220);
    if(!count && !eventById(id)) return;
    markStabilizing(true);
    const renderer = findRealRenderer();
    if(typeof renderer === 'function'){
      // Espera mínima entre renders forzados para no crear el tembleque que estamos corrigiendo.
      if(now() - lastForcedAt > 180){
        lastForcedAt = now();
        metrics.forcedRenders++;
        try{ renderer.call(window.ControlEventV462 || window.ControlEventV461 || window.ControlEventV460 || window, {force:true, reason:'v17_prod_fix30_' + (reason || 'ensure')}); }catch(err){ console.warn('[FIX30 graficas] render V46', err); }
      }
    }else{
      try{ window.ControlEventOpt2H?.reassert?.('fix30-no-real-renderer'); }catch(_){ }
    }
    setTimeout(() => { if(chartOk()) markStabilizing(false); else try{ window.ControlEventOpt2H?.reassert?.('fix30-after-force'); }catch(_){} }, 120);
    setTimeout(() => { if(chartOk()) markStabilizing(false); }, 520);
  }

  const timers = new Map();
  function scheduleEnsure(id, reason){
    id = text(id || currentEventId());
    if(!id) return;
    injectStyle();
    markStabilizing(true);
    const key = id + '|' + (reason || '');
    (timers.get(key) || []).forEach(clearTimeout);
    const list = [60, 180, 420, 820, 1450, 2300].map(ms => setTimeout(() => ensureGraficas(id, (reason || 'scheduled') + '-' + ms), ms));
    timers.set(key, list);
    setTimeout(() => { timers.delete(key); if(chartOk()) markStabilizing(false); }, 2600);
  }

  function patchV447(){
    const api = window.ControlEventV447;
    if(!api || typeof api.selectEvent !== 'function' || api.selectEvent.__ceFix30Patched) return;
    const old = api.selectEvent.bind(api);
    const wrapped = function(value, options){
      const id = text(value);
      if(id) scheduleEnsure(id, 'before-select');
      const ret = old(value, options || {});
      Promise.resolve(ret).then(() => { if(id) scheduleEnsure(id, 'after-select'); }).catch(() => { if(id) scheduleEnsure(id, 'after-select-error'); });
      return ret;
    };
    wrapped.__ceFix30Patched = true;
    wrapped.__ceFix30Original = old;
    api.selectEvent = wrapped;
    try{ window.changeSelectedEvent = function(value, options){ return api.selectEvent(value, options); }; }catch(_){ }
    try{ changeSelectedEvent = window.changeSelectedEvent; }catch(_){ }
  }

  function install(){
    injectStyle();
    patchV447();
    const id = currentEventId();
    if(id && graficasVisible()) scheduleEnsure(id, 'install');
  }

  window.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') scheduleEnsure(ev.target.value, 'select-change'); }, true);
  ['controlevent:event-loaded','controlevent:event-ready','controlevent:opt1-event-stable','controlevent:module-mounted'].forEach(name => {
    window.addEventListener(name, ev => scheduleEnsure(ev.detail?.eventId || currentEventId(), name), true);
  });
  window.addEventListener('focus', () => { const id=currentEventId(); if(id && graficasVisible()) scheduleEnsure(id, 'window-focus'); }, true);
  ['DOMContentLoaded','load','controlevent:app-ready','controlevent:runtime-ready','controlevent:modules-ready'].forEach(name => window.addEventListener(name, () => setTimeout(install, 30), true));
  [0,120,480,1200,2200].forEach(ms => setTimeout(install, ms));

  metrics.ensure = ensureGraficas;
  metrics.schedule = scheduleEnsure;
})();
