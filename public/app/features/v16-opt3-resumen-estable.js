/* ControlEvent v16_prod OPT3 - Resumen presupuestario estable.
   Objetivo: reducir renders duplicados de Resumen, cachear cálculos repetidos
   y evitar saltos verticales durante el pintado. No modifica importes ni datos. */
(function(){
  'use strict';
  if(window.__ceV16Opt3ResumenEstable) return;
  window.__ceV16Opt3ResumenEstable = true;

  const VERSION = 'v16_opt_3';
  const $ = id => document.getElementById(id);
  const text = v => String(v == null ? '' : v).trim();
  const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
  const arr = v => Array.isArray(v) ? v : [];
  const safe = (fn, fallback) => { try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } };
  const stateRef = () => safe(() => (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}, window.state || window.ControlEventApp?.state || {});
  const currentEventId = () => text(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const currentTab = () => text(safe(() => window.__ceCurrentMainTab || window.ControlEventApp?.navigation?.currentMainTab || (typeof currentMainTab !== 'undefined' ? currentMainTab : '') || '', ''));
  const isVisible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const isResumenActive = () => currentTab() === 'resumen' || isVisible($('tabResumen')) || isVisible($('budgetLayout'));

  const metrics = window.ControlEventOpt3 = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    budgetCalls: 0,
    budgetExecs: 0,
    budgetSkipped: 0,
    summaryCalls: 0,
    summaryCacheHits: 0,
    lastRenderMs: 0,
    lastReason: '',
    lastSignature: '',
    lastEventId: ''
  };

  function hashText(value){
    const str = text(value);
    let h = 0;
    for(let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }
  function rowKey(row){
    row = row || {};
    return [
      row.id, row.codigo, row.nombre, row.producto, row.segmento, row.destino, row.tienda,
      row.ticket, row.tk, row.responsable, row.tipo, row.estado, row.include, row.excluir,
      row.fecha, row.texto, row.descripcion
    ].map(text).join('~');
  }
  function cheapArraySig(list, pick){
    let len = 0, a = 0, b = 0, c = 0, h = 0;
    const rows = arr(list);
    len = rows.length;
    for(let i = 0; i < rows.length; i++){
      const row = rows[i] || {};
      a += num(pick(row, 0));
      b += num(pick(row, 1));
      c += num(pick(row, 2));
      h = (h + hashText(rowKey(row)) + ((i + 1) * 2654435761)) >>> 0;
    }
    return len + ':' + Math.round(a * 100) + ':' + Math.round(b * 100) + ':' + Math.round(c * 100) + ':' + h;
  }

  function dataSignature(){
    const s = stateRef();
    return [
      currentEventId(),
      cheapArraySig(s.ingresos || s.colaboradores || s.personas, (r, n) => n === 0 ? (r.importe || r.total || r.cantidad || r.ingresado) : (n === 1 ? r.pendiente : r.id)),
      cheapArraySig(s.compras, (r, n) => n === 0 ? (r.importe || r.total || (num(r.unidades) * num(r.precio))) : (n === 1 ? r.unidades : r.precio)),
      cheapArraySig(s.donaciones, (r, n) => n === 0 ? (r.importe || r.valor || r.total || (num(r.unidades) * num(r.precio))) : (n === 1 ? r.unidades : r.precio)),
      arr(s.ticketImages || s.ticket_images || s.ce_ticket_images).length,
      arr(s.documentos || s.docs).length
    ].join('|');
  }

  function injectStyle(){
    if($('ceV16Opt3ResumenStyle')) return;
    const style = document.createElement('style');
    style.id = 'ceV16Opt3ResumenStyle';
    style.textContent = `
      body.ce-opt3-budget-rendering #tabResumen .budget-wrap,
      body.ce-opt3-budget-rendering #tabResumen .summary-top-grid,
      body.ce-opt3-budget-rendering #tabResumen .summary-bottom-grid{contain:layout paint;}
      body.ce-opt3-budget-rendering #budgetLayout{transform:translateZ(0);backface-visibility:hidden;}
    `;
    document.head.appendChild(style);
  }

  let originalBudgetSummary = null;
  let summaryCache = {sig:'', at:0, value:null};
  function wrapBudgetSummary(){
    const current = safe(() => (typeof budgetSummary === 'function' ? budgetSummary : null), null) || window.budgetSummary || window.ControlEventApp?.calculations?.budgetSummary;
    if(typeof current !== 'function') return;
    if(current.__ceOpt3BudgetSummaryWrapped) return;
    originalBudgetSummary = current;
    const wrapped = function(){
      metrics.summaryCalls++;
      const sig = dataSignature();
      const now = Date.now();
      if(summaryCache.value && summaryCache.sig === sig && (now - summaryCache.at) < 900){
        metrics.summaryCacheHits++;
        return summaryCache.value;
      }
      const value = originalBudgetSummary.apply(this, arguments);
      summaryCache = {sig, at:now, value};
      return value;
    };
    wrapped.__ceOpt3BudgetSummaryWrapped = true;
    wrapped.__ceOpt3Original = current;
    try{ budgetSummary = wrapped; }catch(_){ }
    window.budgetSummary = wrapped;
    try{ if(window.ControlEventApp?.calculations) window.ControlEventApp.calculations.budgetSummary = wrapped; }catch(_){ }
  }

  let originalRenderBudget = null;
  let pendingTimer = 0;
  let pendingArgs = null;
  let pendingThis = null;
  let pendingReason = '';
  let inExec = false;
  let lastCommittedAt = 0;
  let lastCommittedSig = '';

  function reserveHeight(root){
    if(!root) return () => {};
    const h = Math.round(root.getBoundingClientRect?.().height || root.offsetHeight || 0);
    if(h > 160){
      root.style.minHeight = h + 'px';
      const parent = root.closest?.('.budget-wrap');
      if(parent) parent.style.minHeight = Math.max(h, Math.round(parent.getBoundingClientRect?.().height || 0)) + 'px';
      return () => setTimeout(() => {
        try{ root.style.minHeight = ''; }catch(_){ }
        try{ if(parent) parent.style.minHeight = ''; }catch(_){ }
      }, 220);
    }
    return () => {};
  }

  function executeBudgetRender(){
    pendingTimer = 0;
    if(inExec) return;
    if(typeof originalRenderBudget !== 'function') return;
    const sig = dataSignature();
    const now = Date.now();
    if(lastCommittedSig === sig && (now - lastCommittedAt) < 520 && $('budgetLayout')?.innerHTML){
      metrics.budgetSkipped++;
      return;
    }
    const root = $('budgetLayout');
    const releaseHeight = reserveHeight(root);
    const start = performance.now ? performance.now() : Date.now();
    inExec = true;
    metrics.budgetExecs++;
    metrics.lastReason = pendingReason || 'renderBudget';
    try{ document.body.classList.add('ce-opt3-budget-rendering'); }catch(_){ }
    const run = () => {
      try{
        originalRenderBudget.apply(pendingThis || window, pendingArgs || []);
        try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
        try{ window.ControlEventSummaryTiendaSortFix?.apply?.(); }catch(_){ }
      }catch(err){
        console.warn('[v16_opt_3] renderBudget estable', err);
      }finally{
        lastCommittedAt = Date.now();
        lastCommittedSig = dataSignature();
        metrics.lastSignature = lastCommittedSig;
        metrics.lastEventId = currentEventId();
        metrics.lastRenderMs = Math.round((performance.now ? performance.now() : Date.now()) - start);
        inExec = false;
        setTimeout(() => { try{ document.body.classList.remove('ce-opt3-budget-rendering'); }catch(_){ } releaseHeight(); }, 120);
      }
    };
    if(typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(run);
    else run();
  }

  function scheduleBudgetRender(ctx, args, reason){
    metrics.budgetCalls++;
    pendingThis = ctx;
    pendingArgs = args || [];
    pendingReason = reason || 'renderBudget';
    clearTimeout(pendingTimer);
    const delay = document.body.classList.contains('ce-opt1-switching') ? 140 : 70;
    pendingTimer = setTimeout(executeBudgetRender, delay);
    return undefined;
  }

  function wrapRenderBudget(){
    const current = safe(() => (typeof renderBudget === 'function' ? renderBudget : null), null) || window.renderBudget || window.ControlEventApp?.actions?.renderBudget;
    if(typeof current !== 'function') return;
    if(current.__ceOpt3RenderBudgetWrapped) return;
    originalRenderBudget = current.__ceOpt3Original || current;
    const wrapped = function(){
      // Fuera de Resumen no forzamos trabajo de esta ventana: evita renders fantasma.
      if(!isResumenActive()){
        metrics.budgetSkipped++;
        return undefined;
      }
      return scheduleBudgetRender(this, Array.from(arguments), 'renderBudget');
    };
    wrapped.__ceOpt3RenderBudgetWrapped = true;
    wrapped.__ceOpt3Original = originalRenderBudget;
    try{ renderBudget = wrapped; }catch(_){ }
    window.renderBudget = wrapped;
    try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.renderBudget = wrapped; }catch(_){ }
  }

  function install(){
    injectStyle();
    wrapBudgetSummary();
    wrapRenderBudget();
  }

  window.ControlEventOpt3 = Object.assign(metrics, {
    install,
    flush(){ clearTimeout(pendingTimer); executeBudgetRender(); },
    originalRenderBudget: () => originalRenderBudget,
    originalBudgetSummary: () => originalBudgetSummary
  });

  install();
  setTimeout(install, 80);
  setTimeout(install, 450);
  window.addEventListener('controlevent:event-ready', install, true);
  window.addEventListener('controlevent:opt1-event-stable', install, true);
})();
