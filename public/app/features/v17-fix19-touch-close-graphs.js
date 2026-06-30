/* ControlEvent v17_prod FIX19 - cierre móvil avance, cierre visor a la izquierda,
   deduplicación de miniaturas y bloqueo visual de gráficas antiguas de barras.
   No cambia cálculos ni datos. */
(function(){
  'use strict';
  if(window.__ceV17Fix19TouchCloseGraphs) return;
  window.__ceV17Fix19TouchCloseGraphs = true;

  const $ = id => document.getElementById(id);
  const stop = ev => { try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){} return false; };
  const norm = v => String(v == null ? '' : v).trim();

  function injectStyle(){
    if($('ceV17Fix19TouchCloseGraphsStyle')) return;
    const st = document.createElement('style');
    st.id = 'ceV17Fix19TouchCloseGraphsStyle';
    st.textContent = `
      /* Cerrar visor de ticket: abajo a la izquierda para no tocar otra miniatura. */
      #ceV17TicketViewerFinal [data-ce-v17-ticket-close],
      #ceV104TicketDetail [data-ce-v104-close],#ceV103TicketDetail [data-ce-v103-close],#ceV102TicketDetail [data-ce-v102-close],#ceV101TicketDetail [data-ce-v101-close],#ceV100TicketDetail [data-ce-v100-close],#ceV96TicketDetail [data-ce-v96-close],#ceV40TicketPhotoModal .ce-v40-modal-close{
        left:calc(2vw + 18px)!important;right:auto!important;bottom:calc(2vh + 14px)!important;top:auto!important;
        align-self:flex-start!important;margin:8px auto 0 10px!important;z-index:10000095!important;
      }
      /* Avance del evento: cierre grande abajo a la izquierda en móvil/tablet. */
      #ceHf48AvanceLayer{pointer-events:auto!important;}
      #ceHf48AvanceLayer.visible{display:flex!important;}
      #ceHf48AvanceLayer .ce-hf48-bubble{padding-bottom:62px!important;}
      #ceHf48AvanceLayer .ce-hf48-close{
        position:sticky!important;left:8px!important;right:auto!important;bottom:8px!important;top:auto!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;
        width:auto!important;min-width:118px!important;height:42px!important;padding:0 14px!important;
        border-radius:999px!important;background:#fff!important;color:#0f172a!important;font-size:15px!important;font-weight:950!important;
        box-shadow:0 8px 26px rgba(15,23,42,.24)!important;z-index:10000002!important;
      }
      @media(max-width:760px){#ceHf48AvanceLayer .ce-hf48-bubble{width:96vw!important;max-height:82vh!important;}}
      /* Duplicados: si una capa antigua mete otra miniatura, solo queda visible una. */
      #summaryTiendaTicket .summary-item img.ce-v17-duplicate-thumb,
      #summaryTiendaTicket .ce-v17-doc-row img.ce-v17-duplicate-thumb{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      /* Gráficas antiguas de barras: no deben verse ni un segundo durante el cambio de evento. */
      #eventChartWrap .chart-bars,#eventChartWrap .vbars-wrap,#eventChartWrap .vbars-grid{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #eventChartWrap.ce-v17-fix19-guarding{min-height:540px!important;contain:layout paint!important;}
    `;
    document.head.appendChild(st);
  }

  function closeAvance(ev){
    const layer = $('ceHf48AvanceLayer');
    if(!layer || !layer.classList.contains('visible')) return false;
    if(ev) stop(ev);
    try{ layer.classList.remove('visible'); layer.setAttribute('aria-hidden','true'); }catch(_){}
    return false;
  }
  function normalizeAvanceClose(){
    const layer = $('ceHf48AvanceLayer');
    if(!layer) return;
    const btn = layer.querySelector('.ce-hf48-close');
    if(btn){
      try{
        btn.textContent = '✕ Cerrar';
        btn.setAttribute('aria-label','Cerrar avance del evento');
        btn.type = 'button';
      }catch(_){}
    }
  }
  function bindAvanceClose(){
    if(window.__ceV17Fix19AvanceCloseBound) return;
    window.__ceV17Fix19AvanceCloseBound = true;
    ['pointerdown','touchstart','mousedown','click'].forEach(type => {
      document.addEventListener(type, ev => {
        const layer = $('ceHf48AvanceLayer');
        if(!layer || !layer.classList.contains('visible')) return;
        const target = ev.target;
        if(target?.closest?.('.ce-hf48-close')) return closeAvance(ev);
        const bubble = target?.closest?.('.ce-hf48-bubble');
        const logo = target?.closest?.('.brand,img.brand-logo-large,img[alt*="Colty"],.brand-logo-large');
        if(!bubble && !logo) return closeAvance(ev);
      }, {capture:true, passive:false});
    });
    document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeAvance(ev); }, true);
  }

  function closeAllTicketViewers(ev){
    if(ev) stop(ev);
    document.querySelectorAll('#ceV17TicketViewerFinal,#ceV104TicketDetail,#ceV103TicketDetail,#ceV102TicketDetail,#ceV101TicketDetail,#ceV100TicketDetail,#ceV96TicketDetail,#ceV40TicketPhotoModal,#ceV310PhotoViewer,#ceTicketModalV234,#ceTicketImageModalV225,.ce-v40-modal,.ce-v401-pc-modal').forEach(el => { try{ el.remove(); }catch(_){ try{ el.classList.remove('visible'); }catch(__){} } });
    return false;
  }
  function bindTicketClose(){
    if(window.__ceV17Fix19TicketCloseBound) return;
    window.__ceV17Fix19TicketCloseBound = true;
    ['pointerdown','touchstart','click'].forEach(type => {
      document.addEventListener(type, ev => {
        if(ev.target?.closest?.('[data-ce-v17-ticket-close],[data-ce-v104-close],[data-ce-v103-close],[data-ce-v102-close],[data-ce-v101-close],[data-ce-v100-close],[data-ce-v96-close],.ce-v40-modal-close')){
          return closeAllTicketViewers(ev);
        }
      }, {capture:true, passive:false});
    });
  }

  function scoreThumb(img, row){
    let n = 0;
    if(norm(img?.dataset?.ceV17Detail)) n += 1000;
    if(norm(row?.dataset?.ceV17Detail)) n += 300;
    if(img?.classList?.contains('ce-v17-doc-thumb')) n += 40;
    if(norm(img?.dataset?.ceV17Label)) n += 20;
    if(norm(img?.currentSrc || img?.src).startsWith('data:image/')) n += 5;
    return n;
  }
  function dedupeTicketThumbs(){
    const root = $('summaryTiendaTicket');
    if(!root) return;
    root.querySelectorAll('.summary-item,.ce-v17-doc-row').forEach(row => {
      const thumbs = Array.from(row.querySelectorAll('img.ce-v17-doc-thumb,img.ticket-thumb,img[src*="ticket-images"],img[src^="data:image/"]'));
      if(!thumbs.length) return;
      thumbs.forEach(img => { try{ img.classList.add('ce-v17-doc-thumb'); img.classList.remove('ticket-thumb','ce-v17-duplicate-thumb'); if(row.dataset.ceV17Label && !img.dataset.ceV17Label) img.dataset.ceV17Label = row.dataset.ceV17Label; if(row.dataset.ceV17Detail && !img.dataset.ceV17Detail) img.dataset.ceV17Detail = row.dataset.ceV17Detail; }catch(_){} });
      if(thumbs.length <= 1) return;
      const keep = thumbs.slice().sort((a,b)=>scoreThumb(b,row)-scoreThumb(a,row))[0] || thumbs[0];
      try{ if(row.dataset.ceV17Detail && !keep.dataset.ceV17Detail) keep.dataset.ceV17Detail = row.dataset.ceV17Detail; }catch(_){}
      thumbs.forEach(img => {
        if(img === keep) return;
        try{ img.classList.add('ce-v17-duplicate-thumb'); img.remove(); }catch(_){ try{ img.style.setProperty('display','none','important'); }catch(__){} }
      });
    });
  }

  function isOldGraphHtml(html){
    html = String(html || '');
    return !html.includes('ce-v46-pies') && (/class=["'][^"']*(chart-bars|vbars-wrap|vbars-grid)/i.test(html) || /<div[^>]+vbar-col/i.test(html));
  }
  function patchGraphWrap(){
    const w = $('eventChartWrap');
    if(!w || w.__ceV17Fix19GraphPatched) return;
    w.__ceV17Fix19GraphPatched = true;
    let desc = null, p = Element.prototype;
    while(p && !desc){ desc = Object.getOwnPropertyDescriptor(p, 'innerHTML'); p = Object.getPrototypeOf(p); }
    if(!desc || typeof desc.get !== 'function' || typeof desc.set !== 'function') return;
    try{
      Object.defineProperty(w, 'innerHTML', {
        configurable:true,
        get(){ return desc.get.call(this); },
        set(value){
          const html = String(value == null ? '' : value);
          if(isOldGraphHtml(html)){
            try{ this.classList.add('ce-v17-fix19-guarding'); }catch(_){}
            const current = desc.get.call(this) || '';
            if(current && current.includes('ce-v46-pies')) return;
            desc.set.call(this, '');
            return;
          }
          desc.set.call(this, html);
          if(html.includes('ce-v46-pies')){ try{ this.classList.remove('ce-v17-fix19-guarding'); }catch(_){} }
        }
      });
    }catch(_){}
  }
  function removeVisibleOldGraphs(){
    const w = $('eventChartWrap');
    if(!w) return;
    const html = w.innerHTML || '';
    if(isOldGraphHtml(html)){
      try{ w.classList.add('ce-v17-fix19-guarding'); w.innerHTML = ''; }catch(_){}
      try{ window.ControlEventOpt2H?.reassert?.('fix19-old-graph-removed'); }catch(_){}
      try{ window.ControlEventV464?.renderGraficas?.({force:true, reason:'fix19-old-graph-removed'}); }catch(_){}
    }
  }

  let scheduled = 0;
  function run(){
    scheduled = 0;
    injectStyle();
    bindAvanceClose();
    bindTicketClose();
    normalizeAvanceClose();
    dedupeTicketThumbs();
    patchGraphWrap();
    removeVisibleOldGraphs();
  }
  function schedule(){
    if(scheduled) return;
    scheduled = setTimeout(run, 50);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, {once:true}); else run();
  window.addEventListener('load', run, {once:true});
  ['controlevent:event-loaded','controlevent:event-ready','controlevent:module-mounted','controlevent:data-loaded'].forEach(evt => window.addEventListener(evt, () => setTimeout(run, 60), true));
  document.addEventListener('click', () => setTimeout(run, 30), true);
  try{ new MutationObserver(schedule).observe(document.body || document.documentElement, {childList:true, subtree:true}); }catch(_){}
  [120,600,1400,3000].forEach(ms => setTimeout(run, ms));

  window.ControlEventFix19 = {run, closeAvance, dedupeTicketThumbs, removeVisibleOldGraphs, version:'v17_prod_fix19_touch_close_graph_guard'};
})();
