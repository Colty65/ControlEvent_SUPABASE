/* ControlEvent v9.2_prod - Refuerzo de ordenacion en Resumen / Por tienda y Ticket.
   Evita depender del onclick inline, que en algunas capas antiguas no se ejecutaba. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v9.2_prod';
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

  function injectPijamaStyle(){
    if(document.getElementById('ceSummaryTiendaPijamaV85')) return;
    const style = document.createElement('style');
    style.id = 'ceSummaryTiendaPijamaV85';
    style.textContent = `
      #summaryTiendaTicket > .summary-item.ce-tt-pijama-odd{background:#eaf6ff!important;border-color:#c7dff4!important;}
      #summaryTiendaTicket > .summary-item.ce-tt-pijama-even{background:#cfe6ff!important;border-color:#afd3f2!important;}
      #summaryTiendaTicket > .summary-item.ce-tt-total-evento{background:#fff!important;border-color:#dbe2ea!important;font-weight:900!important;}
      #summaryTiendaTicket > .summary-item.ce-tt-total-evento .pill{font-weight:950!important;}
    `;
    document.head.appendChild(style);
  }

  function applyPijamaRows(){
    injectPijamaStyle();
    const root = $(ROOT_ID);
    if(!root) return;
    const items = Array.from(root.children || []).filter(el => el?.classList?.contains('summary-item'));
    if(!items.length) return;
    let rowIndex = 0;
    items.forEach((item, idx) => {
      item.classList.remove('ce-tt-pijama-odd','ce-tt-pijama-even','ce-tt-total-evento');
      const labelEl = item.querySelector(':scope > span:first-child') || item.querySelector('span');
      const label = normalizeText(labelEl?.textContent || '');
      const isTotal = label === 'TOTAL' || label === 'TOTAL EVENTO' || idx === items.length - 1;
      if(isTotal){
        if(labelEl) labelEl.textContent = 'TOTAL EVENTO';
        item.classList.add('ce-tt-total-evento');
        return;
      }
      rowIndex += 1;
      item.classList.add(rowIndex % 2 === 1 ? 'ce-tt-pijama-odd' : 'ce-tt-pijama-even');
    });
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
    setTimeout(() => { markLinks(); applyPijamaRows(); }, 0);
    setTimeout(() => { markLinks(); applyPijamaRows(); }, 80);
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
      if(String(arguments[0] || '') === ROOT_ID) setTimeout(() => { markLinks(); applyPijamaRows(); }, 0);
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
  applyPijamaRows();
  let pijamaPending = false;
  try{
    const obs = new MutationObserver(() => {
      if(pijamaPending) return;
      pijamaPending = true;
      setTimeout(() => { pijamaPending = false; markLinks(); applyPijamaRows(); }, 40);
    });
    const rootNow = $(ROOT_ID);
    if(rootNow) obs.observe(rootNow, {childList:true, subtree:false, characterData:true});
    window.__ceSummaryTiendaPijamaObserverV85 = obs;
  }catch(_){}
  [80,250,700,1500,3000].forEach(ms => setTimeout(() => { patchRenderSummaryList(); markLinks(); applyPijamaRows(); }, ms));
  window.addEventListener('controlevent:runtime-ready', () => { patchRenderSummaryList(); markLinks(); applyPijamaRows(); });
  window.ControlEventSummaryTiendaSortFix = {version: VERSION, applySort, markLinks, applyPijamaRows};
})();
