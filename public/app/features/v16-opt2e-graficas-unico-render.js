/* ControlEvent v17_prod OPT2E - GRAFICAS: un solo pintado final sin retemblores.
   Alcance cerrado: solo estabilización visual de GRAFICAS durante cambio de evento.
   - No cambia planificación, compras, ingresos, documentos, tickets ni avance.
   - Mantiene la última gráfica válida durante el cambio.
   - Bloquea escrituras intermedias y carga/blank.
   - Ejecuta un único render final cuando el evento queda estable.
*/
(function(){
  'use strict';
  if(window.__ceV16Opt2EInstalled) return;
  window.__ceV16Opt2EInstalled = true;

  const VERSION = 'v17_prod_opt_2e';
  const $ = id => document.getElementById(id);
  const txt = v => String(v == null ? '' : v).trim();
  const safe = (fn, fb) => { try{ const v = fn(); return v === undefined ? fb : v; }catch(_){ return fb; } };
  const stateRef = () => safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {});
  const arr = k => Array.isArray(stateRef()[k]) ? stateRef()[k] : [];
  const evId = () => txt(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const rowEv = r => txt(r?.eventId || r?.eventoId || r?.event_id || r?.evento_id || r?.idEvento || r?.evento || '');
  const belongs = (r, ev) => !rowEv(r) || rowEv(r) === ev;
  const graficasVisible = () => !!$('tabGraficas') && !$('tabGraficas').classList.contains('hidden');
  const now = () => Date.now();
  const num = v => {
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v == null ? '' : v).replace(/€/g,'').replace(/\s/g,'').trim();
    if(!s) return 0;
    if(s.includes(',') && s.includes('.')) s = s.replace(/\./g,'').replace(',', '.');
    else if(s.includes(',')) s = s.replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  const valCompra = c => num(c?.total ?? c?.importe ?? c?.valor ?? c?.coste ?? c?.precioTotal ?? (num(c?.precio ?? c?.precioUnitario ?? c?.precioReferencia) * Math.max(1, num(c?.unidades ?? c?.uds ?? c?.cantidad))));
  const valDon = d => num(d?.valorEstimado ?? d?.valor ?? d?.importe ?? d?.total ?? (num(d?.precio ?? d?.precioReferencia) * Math.max(1, num(d?.unidades ?? d?.uds ?? d?.cantidad))));
  const valIng = i => num(i?.total ?? i?.totalIngreso ?? i?.importeTotal ?? (num(i?.importeObligatorio ?? i?.obligatorio) + num(i?.importeVoluntario ?? i?.voluntario)));
  const sum = (xs, fn) => Math.round(xs.reduce((a,b)=>a+fn(b),0)*100)/100;

  const metrics = window.ControlEventOpt2E = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    freezeStarts: 0,
    blockedWrites: 0,
    queuedWrites: 0,
    finalCommits: 0,
    finalRenders: 0,
    duplicateSkips: 0,
    lastKey: '',
    lastReason: '',
    lastCommitAt: 0
  };

  let rawDesc = null;
  let installedSetter = false;
  let freezeUntil = 0;
  let freezeEventId = '';
  let freezeReason = '';
  let cachedHtml = '';
  let cachedHeight = 420;
  let queuedHtml = '';
  let finalTimer = 0;
  let quietTimer = 0;
  let allowDirectCommit = false;
  let lastCommittedKey = '';
  let lastCommittedHtml = '';
  let lastChangeAt = 0;
  let baseRender = null;

  function injectStyle(){
    if($('ceV16Opt2EStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceV16Opt2EStyle';
    st.textContent = `
      #ceOpt1Notice,#ceEventSwitchNotice,.ce-v447-loading{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;}
      #eventChartWrap.ce-opt2e-frozen{contain:layout paint;min-height:var(--ce-opt2e-h,420px);}
      #eventChartWrap.ce-opt2e-final{contain:layout paint;}
      #eventChartWrap.ce-opt2e-frozen *{transition:none!important;animation:none!important;}
    `;
    document.head.appendChild(st);
  }

  function getRawDesc(){
    if(rawDesc) return rawDesc;
    let p = Element.prototype;
    while(p){
      const d = Object.getOwnPropertyDescriptor(p, 'innerHTML');
      if(d && typeof d.get === 'function' && typeof d.set === 'function'){ rawDesc = d; return d; }
      p = Object.getPrototypeOf(p);
    }
    return null;
  }
  function rawGet(el){ const d = getRawDesc(); return d ? d.get.call(el) : el.innerHTML; }
  function rawSet(el, html){ const d = getRawDesc(); if(d) d.set.call(el, html); else el.innerHTML = html; }

  function looksLoading(html){ return /Cargando\s+(nuevo\s+)?evento|Calculando\s+gr[aá]ficas|ce-v447-loading/i.test(String(html || '')); }
  function looksChart(html){ html = String(html || ''); return html.includes('ce-v434-chart-layout-shell') || html.includes('ce-v434-chart-layout') || html.includes('chart-shell'); }
  function looksBlank(html){
    html = String(html || '');
    if(!html || looksLoading(html)) return true;
    if(!looksChart(html)) return false;
    const slices = (html.match(/ce-v434-pie-slice/g) || []).length;
    const sinDatos = (html.match(/Sin datos/g) || []).length;
    const ceros = (html.match(/0,00\s*€/g) || []).length;
    return slices === 0 && (sinDatos >= 2 || ceros >= 5 || /Sin datos por destino/i.test(html));
  }
  function keyFor(ev){
    ev = txt(ev || evId());
    const ingresos = arr('colaboradores').filter(r => belongs(r, ev));
    const compras = arr('compras').filter(r => belongs(r, ev));
    const donaciones = arr('donaciones').filter(r => belongs(r, ev));
    return [ev,'i'+ingresos.length+':'+sum(ingresos,valIng),'c'+compras.length+':'+sum(compras,valCompra),'d'+donaciones.length+':'+sum(donaciones,valDon)].join('|');
  }
  function hasData(ev){
    ev = txt(ev || evId());
    if(!ev) return false;
    const ingresos = arr('colaboradores').filter(r => belongs(r, ev));
    const compras = arr('compras').filter(r => belongs(r, ev));
    const donaciones = arr('donaciones').filter(r => belongs(r, ev));
    return ingresos.length + compras.length + donaciones.length > 0 && Math.abs(sum(ingresos,valIng)+sum(compras,valCompra)+sum(donaciones,valDon)) > 0.001;
  }
  function captureCurrent(){
    const w = $('eventChartWrap');
    if(!w) return;
    const html = rawGet(w) || '';
    if(looksChart(html) && !looksBlank(html)){
      cachedHtml = html;
      cachedHeight = Math.max(360, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || 420));
    }
  }
  function holdCached(){
    const w = $('eventChartWrap');
    if(!w || !cachedHtml) return;
    try{
      w.style.setProperty('--ce-opt2e-h', cachedHeight + 'px');
      w.classList.add('ce-opt2e-frozen');
      rawSet(w, cachedHtml);
    }catch(_){ }
  }
  function inFreeze(){ return now() < freezeUntil; }
  function startFreeze(reason, ms){
    if(!graficasVisible()) return;
    captureCurrent();
    freezeEventId = evId();
    freezeReason = reason || 'freeze';
    freezeUntil = Math.max(freezeUntil, now() + (ms || 1700));
    metrics.freezeStarts++;
    metrics.lastReason = freezeReason;
    holdCached();
    scheduleFinal(reason || 'freeze');
  }

  function commitHtml(html, reason){
    const w = $('eventChartWrap');
    if(!w || !html || looksBlank(html)) return false;
    const k = keyFor(evId());
    if(k && k === lastCommittedKey && html === lastCommittedHtml){ metrics.duplicateSkips++; return true; }
    allowDirectCommit = true;
    try{
      rawSet(w, html);
      w.classList.remove('ce-opt2e-frozen');
      w.classList.add('ce-opt2e-final');
      lastCommittedKey = k;
      lastCommittedHtml = html;
      cachedHtml = html;
      cachedHeight = Math.max(360, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedHeight || 420));
      metrics.finalCommits++;
      metrics.lastKey = k;
      metrics.lastReason = reason || 'commit';
      metrics.lastCommitAt = now();
      return true;
    }finally{ allowDirectCommit = false; queuedHtml = ''; }
  }

  function findBaseRender(){
    const candidates = [window.ControlEventV434?.renderGraficas, window.ControlEventV435?.renderGraficas, window.ControlEventV436?.renderGraficas, window.ControlEventV462?.renderGraficas, window.renderGraficas];
    for(const fn of candidates){
      if(typeof fn !== 'function') continue;
      let f = fn;
      const seen = new Set();
      while(f && typeof f === 'function' && !seen.has(f)){
        seen.add(f);
        const next = f.__ceOpt2EOriginal || f.__ceOpt2COriginal || f.__ceOpt2BOriginal || f.__ceV16Opt2Original || f.__ceOpt2Original;
        if(!next || next === f) break;
        f = next;
      }
      if(typeof f === 'function') return f;
    }
    return null;
  }

  function scheduleFinal(reason){
    clearTimeout(finalTimer);
    const delay = Math.max(120, Math.min(900, freezeUntil - now() + 60));
    finalTimer = setTimeout(() => finalPaint(reason || 'scheduled'), delay);
  }

  function finalPaint(reason){
    if(!graficasVisible()) return;
    if(inFreeze()){ scheduleFinal(reason); return; }
    const w = $('eventChartWrap');
    if(!w) return;
    if(queuedHtml && !looksBlank(queuedHtml)){
      commitHtml(queuedHtml, reason || 'queued-final');
      return;
    }
    const k = keyFor(evId());
    if(k && k === lastCommittedKey && now() - metrics.lastCommitAt < 2500) return;
    const fn = baseRender || findBaseRender();
    baseRender = fn || baseRender;
    if(typeof fn !== 'function') return;
    allowDirectCommit = true;
    metrics.finalRenders++;
    try{
      fn.call(window.ControlEventV434 || window.ControlEventV462 || window, {force:true, reason:'v17_prod_opt_2e_final'});
      const html = rawGet(w) || '';
      if(looksChart(html) && !looksBlank(html)){
        w.classList.remove('ce-opt2e-frozen');
        w.classList.add('ce-opt2e-final');
        lastCommittedKey = k;
        lastCommittedHtml = html;
        cachedHtml = html;
        cachedHeight = Math.max(360, Math.round(w.getBoundingClientRect?.().height || w.scrollHeight || cachedHeight || 420));
        metrics.finalCommits++;
        metrics.lastKey = k;
        metrics.lastCommitAt = now();
      }else if(cachedHtml){
        holdCached();
        setTimeout(() => finalPaint('retry-after-blank'), 380);
      }
    }catch(err){ console.warn('[v17_prod_opt_2e] final render', err); }
    finally{ allowDirectCommit = false; queuedHtml = ''; }
  }

  function installSetter(){
    const w = $('eventChartWrap');
    if(!w || installedSetter && w.__ceOpt2EPatched) return;
    installedSetter = true;
    w.__ceOpt2EPatched = true;
    Object.defineProperty(w, 'innerHTML', {
      configurable: true,
      get(){ return rawGet(this); },
      set(v){
        const html = String(v == null ? '' : v);
        lastChangeAt = now();
        if(allowDirectCommit){ rawSet(this, html); return; }
        if(looksLoading(html) || looksBlank(html)){
          metrics.blockedWrites++;
          if(cachedHtml) holdCached();
          return;
        }
        if(looksChart(html)){
          // Durante cambio de evento o ráfaga de renders, NO se pinta; se guarda el último y se pinta una vez al final.
          if(inFreeze() || (now() - metrics.lastCommitAt) < 900){
            queuedHtml = html;
            metrics.queuedWrites++;
            if(cachedHtml) holdCached();
            clearTimeout(quietTimer);
            quietTimer = setTimeout(() => { if(!inFreeze()) finalPaint('quiet-final'); }, 520);
            scheduleFinal('queued-write');
            return;
          }
          commitHtml(html, 'direct-stable');
          return;
        }
        rawSet(this, html);
      }
    });
  }

  function wrapRenderers(){
    const original = baseRender || findBaseRender();
    if(original) baseRender = original;
    const wrapper = function(options){
      if(!graficasVisible()) return undefined;
      const reason = txt(options?.reason || 'render');
      // Cualquier petición de render se convierte en un único pintado final.
      startFreeze('render:' + reason, hasData(evId()) ? 760 : 1300);
      if(queuedHtml && !inFreeze()) finalPaint('render-now');
      return undefined;
    };
    wrapper.__ceOpt2EWrapped = true;
    wrapper.__ceOpt2EOriginal = baseRender || original;
    try{ window.renderGraficas = wrapper; renderGraficas = wrapper; }catch(_){ window.renderGraficas = wrapper; }
    [window.ControlEventV434, window.ControlEventV435, window.ControlEventV436, window.ControlEventV460, window.ControlEventV461, window.ControlEventV462].filter(Boolean).forEach(o => {
      try{ o.renderGraficas = wrapper; }catch(_){ }
    });
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.renderGraficas = wrapper; }catch(_){ }
  }

  function install(){
    injectStyle();
    installSetter();
    captureCurrent();
    wrapRenderers();
  }

  window.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') startFreeze('selected-event-change', 1900); }, true);
  window.addEventListener('controlevent:opt1-event-stable', () => { startFreeze('opt1-stable', 620); scheduleFinal('opt1-stable'); }, true);
  window.addEventListener('controlevent:event-ready', () => { startFreeze('event-ready', 520); scheduleFinal('event-ready'); }, true);
  window.addEventListener('controlevent:module-mounted', () => { setTimeout(install, 20); if(graficasVisible()) scheduleFinal('module-mounted'); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready'].forEach(e => window.addEventListener(e, () => setTimeout(install, 30), true));
  [0,120,450,1200,2500].forEach(ms => setTimeout(install, ms));
})();
