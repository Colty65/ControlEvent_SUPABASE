/* ControlEvent v21_prod FIX22 - menú oculto desde login hasta elegir evento,
   doble toque real móvil en Por tienda y Ticket, cierre visor a la izquierda, deduplicación de miniaturas
   y bloqueo visual de gráficas antiguas. No cambia cálculos ni datos. */
(function(){
  'use strict';
  if(window.__ceV17Fix19TouchCloseGraphs) return;
  window.__ceV17Fix19TouchCloseGraphs = true;

  const $ = id => document.getElementById(id);
  const stop = ev => { try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){} return false; };
  const norm = v => String(v == null ? '' : v).trim();
  const st = () => { try{ return (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}; }catch(_){ return window.state || window.ControlEventApp?.state || {}; } };
  const arr = name => Array.isArray(st()[name]) ? st()[name] : [];
  function isPhoneOrAndroidPhone(){
    const ua = String(navigator.userAgent || '');
    const iPhone = /iPhone|iPod/i.test(ua);
    const androidPhone = /Android/i.test(ua) && /Mobile/i.test(ua);
    const iPadLike = /iPad/i.test(ua) || (/Macintosh/i.test(ua) && Number(navigator.maxTouchPoints || 0) > 1);
    const narrowTouch = !!(window.matchMedia && window.matchMedia('(max-width: 640px) and (pointer: coarse)').matches);
    return iPhone || androidPhone || (narrowTouch && !iPadLike);
  }
  function validSelectedEvent(){
    const sel = $('selectedEvent');
    // FIX23 PARTE 1: el DOM manda. Si el selector está vacío, no hay evento, aunque
    // state.selectedEventId conserve uno anterior.
    if(sel && !norm(sel.value || '')) return false;
    const id = norm((sel && sel.value) || st().selectedEventId || '');
    if(!id) return false;
    const evs = arr('eventos');
    return !evs.length || evs.some(e => norm(e && e.id) === id);
  }

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
      body.ce-v17-fix22-event-ready #ceHf48AvanceLayer.visible{display:flex!important;}
      body.ce-v17-fix22-no-event #ceHf48AvanceLayer,
      body.ce-v17-fix21-awaiting-event #ceHf48AvanceLayer,
      body.ce-v17-fix22-no-event #ceV16Hf5AvanceLayer,
      body.ce-v17-fix21-awaiting-event #ceV16Hf5AvanceLayer{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      body.ce-v17-fix22-no-event .ce-v17-fix20-avance-close-float,
      body.ce-v17-fix21-awaiting-event .ce-v17-fix20-avance-close-float{display:none!important;visibility:hidden!important;pointer-events:none!important;}
      #ceHf48AvanceLayer .ce-hf48-bubble{padding-bottom:62px!important;}
      #ceHf48AvanceLayer .ce-hf48-close{
        position:sticky!important;left:8px!important;right:auto!important;bottom:8px!important;top:auto!important;
        display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:6px!important;
        width:auto!important;min-width:118px!important;height:42px!important;padding:0 14px!important;
        border-radius:999px!important;background:#fff!important;color:#0f172a!important;font-size:15px!important;font-weight:950!important;
        box-shadow:0 8px 26px rgba(15,23,42,.24)!important;z-index:10000002!important;
      }
      @media(max-width:760px){#ceHf48AvanceLayer .ce-hf48-bubble{width:96vw!important;max-height:82vh!important;}}
      #ceHf48AvanceLayer .ce-v17-fix20-avance-close-float{
        position:fixed!important;left:calc(10px + env(safe-area-inset-left))!important;bottom:calc(10px + env(safe-area-inset-bottom))!important;
        right:auto!important;top:auto!important;z-index:10000020!important;display:none!important;align-items:center!important;justify-content:center!important;gap:6px!important;
        min-width:118px!important;height:44px!important;padding:0 14px!important;border-radius:999px!important;border:1px solid #cbd5e1!important;
        background:#fff!important;color:#0f172a!important;font-size:15px!important;font-weight:950!important;box-shadow:0 10px 28px rgba(15,23,42,.28)!important;
        -webkit-tap-highlight-color:transparent!important;touch-action:manipulation!important;cursor:pointer!important;
      }
      #ceHf48AvanceLayer.visible .ce-v17-fix20-avance-close-float{display:inline-flex!important;}
      /* Avance ligero real (ceV16Hf5): el X superior derecho debe cerrar también en iPhone. */
      #ceV16Hf5AvanceLayer{pointer-events:auto!important;}
      #ceV16Hf5AvanceLayer.visible{display:flex!important;}
      #ceV16Hf5AvanceLayer .ce-v16hf5-close{
        z-index:2147483647!important;pointer-events:auto!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;
        cursor:pointer!important;user-select:none!important;-webkit-user-select:none!important;
      }
      /* Hasta que se elige evento, no se muestran menús ni secciones. */
      body.ce-v17-fix22-no-event #mainTabs,
      body.ce-v17-fix21-awaiting-event #mainTabs,
      body.ce-v17-fix21-awaiting-event .footer,
      body.ce-v17-fix21-awaiting-event #tabIngresos,
      body.ce-v17-fix21-awaiting-event #tabDonaciones,
      body.ce-v17-fix21-awaiting-event #tabCompras,
      body.ce-v17-fix21-awaiting-event #tabMapa,
      body.ce-v17-fix21-awaiting-event #tabDocumentos,
      body.ce-v17-fix21-awaiting-event #tabPlanificacionInicial,
      body.ce-v17-fix21-awaiting-event #tabResumen,
      body.ce-v17-fix21-awaiting-event #tabGraficas,
      body.ce-v17-fix21-awaiting-event #maintenanceWrapper{
        display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;
      }

      body.ce-v17-fix22-no-event #mainTabs,
      body.ce-v17-fix22-no-event .footer,
      body.ce-v17-fix22-no-event #tabIngresos,
      body.ce-v17-fix22-no-event #tabDonaciones,
      body.ce-v17-fix22-no-event #tabCompras,
      body.ce-v17-fix22-no-event #tabMapa,
      body.ce-v17-fix22-no-event #tabMapaProductos,
      body.ce-v17-fix22-no-event #tabDocumentos,
      body.ce-v17-fix22-no-event #tabPlanificacionInicial,
      body.ce-v17-fix22-no-event #tabResumen,
      body.ce-v17-fix22-no-event #tabGraficas,
      body.ce-v17-fix22-no-event #maintenanceWrapper,
      body.ce-v17-fix22-no-event .maintenance-tabs{
        display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important;
      }

      @media(max-width:640px) and (pointer:coarse){
        #summaryTiendaTicket > .summary-item.ce-v17-fix21-singletap-blocked{outline:2px solid rgba(37,99,235,.22)!important;}
      }
      /* Resumen presupuestario / Por tienda y ticket: SOLO móviles. Dos líneas útiles y miniatura a la derecha. */
      @media(max-width:640px){
        #summaryTiendaTicket > .summary-item{
          display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;grid-template-rows:auto auto!important;
          align-items:center!important;column-gap:6px!important;row-gap:1px!important;min-height:50px!important;padding:6px 7px!important;
          font-size:11px!important;line-height:1.12!important;overflow:hidden!important;
        }
        #summaryTiendaTicket > .summary-item > span:first-child{
          grid-column:1!important;grid-row:1!important;min-width:0!important;max-width:100%!important;overflow:hidden!important;text-overflow:ellipsis!important;
          white-space:nowrap!important;text-align:left!important;font-size:11px!important;font-weight:800!important;line-height:1.14!important;
        }
        #summaryTiendaTicket > .summary-item > span:nth-child(2){display:contents!important;}
        #summaryTiendaTicket > .summary-item > .pill,
        #summaryTiendaTicket > .summary-item > span:nth-child(2) > .pill{
          grid-column:1!important;grid-row:2!important;justify-self:start!important;align-self:center!important;
          font-size:10.5px!important;line-height:1!important;padding:3px 7px!important;white-space:nowrap!important;text-align:left!important;
        }
        #summaryTiendaTicket > .summary-item .ticket-actions{
          grid-column:2!important;grid-row:1 / 3!important;justify-self:end!important;align-self:center!important;
          display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important;margin:0!important;flex-wrap:nowrap!important;min-width:max-content!important;
        }
        #summaryTiendaTicket > .summary-item .ticket-actions button,
        #summaryTiendaTicket > .summary-item .ticket-actions .outline.small{
          width:26px!important;min-width:26px!important;height:26px!important;min-height:26px!important;padding:0!important;border-radius:8px!important;font-size:14px!important;line-height:1!important;
        }
        #summaryTiendaTicket > .summary-item .ticket-actions input{display:none!important;}
        #summaryTiendaTicket > .summary-item .ticket-actions img,
        #summaryTiendaTicket > .summary-item img.ce-v17-doc-thumb,
        #summaryTiendaTicket > .summary-item img.ticket-thumb{
          width:42px!important;height:42px!important;max-width:42px!important;max-height:42px!important;object-fit:cover!important;border-radius:8px!important;flex:0 0 auto!important;
        }
        #summaryTiendaTicket > .summary-item.ce-tt-total-evento{min-height:36px!important;}
        #summaryTiendaTicket > .summary-item.ce-tt-total-evento > span:first-child{grid-row:1 / 3!important;align-self:center!important;}
      }
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
    let closed = false;
    const layer48 = $('ceHf48AvanceLayer');
    const layer16 = $('ceV16Hf5AvanceLayer');
    if(layer48 && layer48.classList.contains('visible')){
      try{ layer48.classList.remove('visible'); layer48.setAttribute('aria-hidden','true'); closed = true; }catch(_){}
    }
    if(layer16 && layer16.classList.contains('visible')){
      try{ layer16.classList.remove('visible'); layer16.setAttribute('aria-hidden','true'); closed = true; }catch(_){}
    }
    if(closed && ev) stop(ev);
    return false;
  }
  function normalizeAvanceClose(){
    const layer = $('ceHf48AvanceLayer');
    if(!layer) return;
    if(!validSelectedEvent()){
      try{ layer.classList.remove('visible'); layer.setAttribute('aria-hidden','true'); }catch(_){}
      try{ layer.querySelectorAll('.ce-v17-fix20-avance-close-float').forEach(el=>el.remove()); }catch(_){}
      return;
    }
    const btn = layer.querySelector('.ce-hf48-close');
    if(btn){
      try{
        btn.textContent = '✕ Cerrar';
        btn.setAttribute('aria-label','Cerrar avance del evento');
        btn.type = 'button';
        btn.style.setProperty('touch-action','manipulation','important');
        btn.style.setProperty('-webkit-tap-highlight-color','transparent','important');
        if(!btn.__ceV17Fix20CloseBound){
          btn.__ceV17Fix20CloseBound = true;
          ['touchstart','touchend','pointerdown','pointerup','mousedown','click'].forEach(type => {
            btn.addEventListener(type, closeAvance, {capture:true, passive:false});
          });
        }
      }catch(_){}
    }
    let floatBtn = layer.querySelector('.ce-v17-fix20-avance-close-float');
    if(!floatBtn){
      floatBtn = document.createElement('button');
      floatBtn.type = 'button';
      floatBtn.className = 'ce-v17-fix20-avance-close-float';
      floatBtn.textContent = '✕ Cerrar';
      floatBtn.setAttribute('aria-label','Cerrar avance del evento');
      try{ layer.appendChild(floatBtn); }catch(_){}
    }
    if(floatBtn && !floatBtn.__ceV17Fix20CloseBound){
      floatBtn.__ceV17Fix20CloseBound = true;
      ['touchstart','touchend','pointerdown','pointerup','mousedown','click'].forEach(type => {
        floatBtn.addEventListener(type, closeAvance, {capture:true, passive:false});
      });
    }
  }
  function normalizeV16AvanceClose(){
    const layer = $('ceV16Hf5AvanceLayer');
    if(!layer) return;
    const btn = layer.querySelector('.ce-v16hf5-close');
    if(!btn) return;
    try{
      btn.type = 'button';
      btn.setAttribute('aria-label','Cerrar avance del evento');
      btn.style.setProperty('touch-action','manipulation','important');
      btn.style.setProperty('-webkit-tap-highlight-color','transparent','important');
      if(!btn.__ceV17Fix21IphoneCloseBound){
        btn.__ceV17Fix21IphoneCloseBound = true;
        ['touchstart','touchend','pointerdown','pointerup','mousedown','mouseup','click'].forEach(type => {
          btn.addEventListener(type, closeAvance, {capture:true, passive:false});
        });
      }
    }catch(_){}
  }

  function bindAvanceClose(){
    if(window.__ceV17Fix19AvanceCloseBound) return;
    window.__ceV17Fix19AvanceCloseBound = true;
    ['touchstart','touchend','pointerdown','pointerup','mousedown','mouseup','click'].forEach(type => {
      document.addEventListener(type, ev => {
        const layer = $('ceHf48AvanceLayer');
        if(!layer || !layer.classList.contains('visible')) return;
        const target = ev.target;
        const path = (typeof ev.composedPath === 'function') ? ev.composedPath() : [];
        if(target?.closest?.('.ce-hf48-close,.ce-v17-fix20-avance-close-float') || path.some(n => n?.classList?.contains?.('ce-hf48-close') || n?.classList?.contains?.('ce-v17-fix20-avance-close-float'))) return closeAvance(ev);
        const bubble = target?.closest?.('.ce-hf48-bubble') || path.some(n => n?.classList?.contains?.('ce-hf48-bubble'));
        const logo = target?.closest?.('.brand,img.brand-logo-large,img[alt*="Colty"],.brand-logo-large');
        if(target === layer || (!bubble && !logo)) return closeAvance(ev);
      }, {capture:true, passive:false});
    });
    document.addEventListener('keydown', ev => { if(ev.key === 'Escape') closeAvance(ev); }, true);
  }

  function bindV16IphoneClose(){
    if(window.__ceV17Fix21V16IphoneCloseBound) return;
    window.__ceV17Fix21V16IphoneCloseBound = true;
    ['touchstart','touchend','pointerdown','pointerup','mousedown','mouseup','click'].forEach(type => {
      window.addEventListener(type, ev => {
        const layer = $('ceV16Hf5AvanceLayer');
        if(!layer || !layer.classList.contains('visible')) return;
        const target = ev.target;
        if(target?.closest?.('.ce-v16hf5-close')) return closeAvance(ev);
      }, {capture:true, passive:false});
    });
  }

  function setEventMenuGate(){
    const overlay = $('authOverlay');
    const loginActive = !!(overlay && !overlay.classList.contains('hidden'));
    const hasEvent = validSelectedEvent();
    const waiting = loginActive || !hasEvent;
    document.body.classList.toggle('ce-v17-fix21-awaiting-event', !!waiting);
    document.body.classList.toggle('ce-v17-fix22-no-event', !!waiting);
    document.body.classList.toggle('ce-v17-fix22-event-ready', !waiting);
  }
  function bindEventMenuGate(){
    if(window.__ceV17Fix21MenuGateBound) return;
    window.__ceV17Fix21MenuGateBound = true;
    document.addEventListener('change', ev => { if(ev.target?.id === 'selectedEvent') setTimeout(setEventMenuGate, 0); }, true);
    ['controlevent:event-loaded','controlevent:event-ready','controlevent:module-mounted','controlevent:data-loaded','controlevent:app-ready','controlevent:runtime-ready'].forEach(evt => window.addEventListener(evt, () => setTimeout(setEventMenuGate, 40), true));
    document.addEventListener('click', ev => { if(ev.target?.closest?.('#btnLogin,#btnLogout,#selectedEvent')) setTimeout(setEventMenuGate, 120); }, true);
    [80,260,700,1400,2800,5200].forEach(ms => setTimeout(setEventMenuGate, ms));
  }

  let ceFix21LastSummaryTap = {row:null, at:0};
  function isSummaryInteractiveTarget(target){
    return !!target?.closest?.('img,button,input,select,textarea,a,label,.ticket-actions,.ce-v17-doc-actions,[data-ce-v17-photo],[data-ce-v17-ticket-open],[data-ce-v17-ticket-close]');
  }
  function summaryRowFor(target){
    const root = $('summaryTiendaTicket');
    if(!root) return null;
    const row = target?.closest?.('#summaryTiendaTicket .summary-item,#summaryTiendaTicket .ce-v17-doc-row,#summaryTiendaTicket .ce-hf10-row');
    return row && root.contains(row) ? row : null;
  }
  function stopOnlyPropagation(ev){
    try{ ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){}
    return false;
  }
  function handleSummaryDoubleTapEvent(ev){
    if(!isPhoneOrAndroidPhone()) return false;
    const row = summaryRowFor(ev.target);
    if(!row) return false;
    if(isSummaryInteractiveTarget(ev.target)) return false;
    const type = String(ev.type || '');
    const now = Date.now();
    if(type !== 'click'){
      // Bloquea manejadores antiguos de pointerup/touchend en móvil sin cancelar el click sintético.
      // Así el primer toque no abre globo, pero el segundo click todavía puede llegar.
      return stopOnlyPropagation(ev);
    }
    const isDouble = ceFix21LastSummaryTap.row === row && (now - ceFix21LastSummaryTap.at) <= 650;
    ceFix21LastSummaryTap = {row, at:now};
    if(isDouble){
      try{ row.classList.remove('ce-v17-fix21-singletap-blocked'); row.dataset.ceV17DoubleTapOk=String(now); }catch(_){}
      return false; // segundo click: se deja pasar al manejador normal del globo
    }
    try{ row.classList.add('ce-v17-fix21-singletap-blocked'); setTimeout(()=>row.classList.remove('ce-v17-fix21-singletap-blocked'), 520); }catch(_){}
    return stop(ev);
  }
  function bindSummaryDoubleTapMobile(){
    if(window.__ceV17Fix22SummaryDoubleTapBound) return;
    window.__ceV17Fix22SummaryDoubleTapBound = true;
    ['pointerup','touchend','click'].forEach(type => {
      window.addEventListener(type, ev => { handleSummaryDoubleTapEvent(ev); }, {capture:true, passive:false});
    });
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
    bindV16IphoneClose();
    bindEventMenuGate();
    bindSummaryDoubleTapMobile();
    bindTicketClose();
    normalizeAvanceClose();
    normalizeV16AvanceClose();
    setEventMenuGate();
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
  try{
    new MutationObserver(muts => {
      if((muts||[]).some(m => {
        const nodes = Array.from(m.addedNodes||[]);
        return nodes.some(n => n && n.nodeType===1 && (n.id==='summaryTiendaTicket' || n.id==='ceV16Hf5AvanceLayer' || n.id==='ceHf48AvanceLayer' || n.querySelector?.('#summaryTiendaTicket,#ceV16Hf5AvanceLayer,#ceHf48AvanceLayer,img.ce-v17-doc-thumb,img.ticket-thumb')));
      })) schedule();
    }).observe(document.body || document.documentElement, {childList:true, subtree:true});
  }catch(_){}
  [120,600,1400,3000].forEach(ms => setTimeout(run, ms));

  window.ControlEventFix19 = {run, closeAvance, dedupeTicketThumbs, removeVisibleOldGraphs, setEventMenuGate, version:'v21_prod_fix22_menu_inicio_doubletap_movil'};
})();
