/* ControlEvent v4.0_prod - Refuerzo de ordenacion en Resumen / Por tienda y Ticket.
   Evita depender del onclick inline, que en algunas capas antiguas no se ejecutaba. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v4.0_prod';
  const ROOT_ID = 'summaryTiendaTicket';

  function $(id){ return document.getElementById(id); }
  function stateRef(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || window.ControlEventApp?.state || {};
  }
  function renderBudgetSafe(){
    try{ if(typeof renderBudget === 'function') return renderBudget(); }catch(_){ }
    try{ if(typeof window.renderBudget === 'function') return window.renderBudget(); }catch(_){ }
    try{ window.ControlEventModules?.activate?.('resumen', {reason:'summary-sort-v307'}); }catch(_){ }
    return null;
  }
  function normalizeText(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toUpperCase();
  }
  function modeFromTarget(target){
    const el = target?.closest?.('#' + ROOT_ID + ' a,#' + ROOT_ID + ' button,[data-ce-summary-sort]');
    if(!el) return '';
    const explicit = el.getAttribute('data-ce-summary-sort');
    if(explicit === 'tienda' || explicit === 'ticket') return explicit;
    const txt = normalizeText(el.textContent || '');
    if(txt.includes('TIENDA')) return 'tienda';
    if(txt.includes('TICKET')) return 'ticket';
    return '';
  }
  function applySort(mode){
    if(mode !== 'tienda' && mode !== 'ticket') return false;
    const st = stateRef();
    st.summaryTiendaSort = mode;
    try{ window.state = st; }catch(_){ }
    renderBudgetSafe();
    setTimeout(markLinks, 0);
    setTimeout(markLinks, 80);
    return true;
  }
  function handleEvent(event){
    const mode = modeFromTarget(event.target);
    if(!mode) return;
    try{ event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); }catch(_){ }
    applySort(mode);
  }
  function markLinks(){
    const root = $(ROOT_ID);
    if(!root) return;
    const mode = stateRef().summaryTiendaSort || 'tienda';
    root.querySelectorAll('.hint a, .hint button, [data-ce-summary-sort]').forEach(el => {
      const m = modeFromTarget(el);
      if(!m) return;
      el.classList.add('ce-sort-link-v307');
      el.setAttribute('role','button');
      el.setAttribute('tabindex','0');
      el.setAttribute('data-ce-summary-sort', m);
      el.classList.toggle('is-active', m === mode);
    });
  }
  function patchRenderSummaryList(){
    const old = (typeof window.renderSummaryList === 'function') ? window.renderSummaryList : null;
    if(!old || old.__ceV307SummarySortWrapped) return;
    const wrapped = function(){
      const ret = old.apply(this, arguments);
      if(String(arguments[0] || '') === ROOT_ID) setTimeout(markLinks, 0);
      return ret;
    };
    wrapped.__ceV307SummarySortWrapped = true;
    try{ window.renderSummaryList = wrapped; renderSummaryList = wrapped; }catch(_){ window.renderSummaryList = wrapped; }
  }

  document.addEventListener('click', handleEvent, true);
  document.addEventListener('pointerup', handleEvent, true);
  document.addEventListener('touchend', handleEvent, {capture:true, passive:false});
  document.addEventListener('keydown', event => {
    if(event.key !== 'Enter' && event.key !== ' ') return;
    handleEvent(event);
  }, true);

  patchRenderSummaryList();
  markLinks();
  [80,250,700,1500,3000].forEach(ms => setTimeout(() => { patchRenderSummaryList(); markLinks(); }, ms));
  window.addEventListener('controlevent:runtime-ready', () => { patchRenderSummaryList(); markLinks(); });
  window.ControlEventSummaryTiendaSortFix = {version: VERSION, applySort, markLinks};
})();
