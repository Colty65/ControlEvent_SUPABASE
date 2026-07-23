/* ControlEvent v23_prod_r2 OPT1 - estabilizador de carga/cambio de evento.
   Objetivo: una sola selección efectiva, sin guardados globales, sin renders duplicados
   y con protección del desplegable principal. No modifica cálculos ni ventanas. */
(function(){
  'use strict';
  if(window.__ceV16Opt1Installed) return;
  window.__ceV16Opt1Installed = true;

  const VERSION = 'v23_prod_opt_1';
  const SELECT_KEYS = [
    'controlevent_v229_selected_event_id',
    'controlevent_selected_event_id',
    'controlevent_last_selected_event_id',
    'ce_selected_event_id'
  ];
  const stateRef = () => {
    try{ return (typeof state !== 'undefined' && state) || window.state || window.ControlEventApp?.state || {}; }
    catch(_){ return window.state || window.ControlEventApp?.state || {}; }
  };
  const $ = id => document.getElementById(id);
  const text = v => String(v == null ? '' : v).trim();
  const arr = v => Array.isArray(v) ? v : [];
  const safe = (fn, fallback) => { try{ const v = fn(); return v === undefined ? fallback : v; }catch(_){ return fallback; } };
  const currentEventId = () => text(stateRef().selectedEventId || $('selectedEvent')?.value || '');
  const eventById = id => arr(stateRef().eventos).find(e => text(e && e.id) === text(id)) || null;
  const validEventId = id => !!text(id) && (!arr(stateRef().eventos).length || !!eventById(id));
  const currentTab = () => safe(() => window.__ceCurrentMainTab || window.ControlEventApp?.navigation?.currentMainTab || (typeof currentMainTab !== 'undefined' ? currentMainTab : '') || 'graficas', 'graficas');

  const metrics = window.ControlEventOpt1 = {
    version: VERSION,
    installedAt: new Date().toISOString(),
    eventChanges: 0,
    ignoredDuplicateChanges: 0,
    dedupedStateFetches: 0,
    lastEventId: '',
    lastDurationMs: 0,
    active: false
  };

  function rememberEvent(id){
    id = text(id);
    if(!id) return;
    SELECT_KEYS.forEach(k => {
      try{ sessionStorage.setItem(k, id); }catch(_){ }
      try{ localStorage.setItem(k, id); }catch(_){ }
    });
  }

  function closeHeavyFloaters(){
    try{ document.body.classList.remove('mobile-drawer-open'); }catch(_){ }
    try{ window.ControlEventV16AvanceLigero?.close?.(); }catch(_){ }
    try{ window.ControlEventBudgetLiteTips?.sanitize?.(); }catch(_){ }
    try{ document.querySelectorAll('.ce-v15-avance-pop,.ce-v16-avance-pop,.ce-budget-tip,.budget-tooltip,.ce-v85-doc-modal').forEach(el => el.remove()); }catch(_){ }
  }

  function injectStyle(){
    if($('ceV16Opt1Style')) return;
    const style = document.createElement('style');
    style.id = 'ceV16Opt1Style';
    style.textContent = `
      body.ce-opt1-switching #selectedEvent{outline:2px solid rgba(245,158,11,.75)!important;box-shadow:0 0 0 4px rgba(245,158,11,.17)!important;}
      body.ce-opt1-switching .ce-opt1-pending-hide{opacity:.35;pointer-events:none;}
      #ceOpt1Notice{display:none!important;visibility:hidden!important;position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 10px);transform:translateX(-50%) translateY(-4px);z-index:7000;max-width:min(560px,92vw);padding:9px 13px;border-radius:999px;background:rgba(15,23,42,.92);color:white;font:800 13px/1.25 Inter,system-ui,sans-serif;box-shadow:0 12px 30px rgba(15,23,42,.22);pointer-events:none;opacity:0;transition:opacity .14s ease,transform .14s ease;text-align:center;}
      #ceOpt1Notice.visible{opacity:1;transform:translateX(-50%) translateY(0);}
      #selectedEvent.ce-opt1-open{position:relative;z-index:7100;}
    `;
    document.head.appendChild(style);
  }

  function notice(msg, ms){
    // v23_prod_opt_2D: sin avisos negros de carga. El cambio de evento debe ser silencioso.
    try{ const box = $('ceOpt1Notice'); if(box) box.remove(); }catch(_){ }
  }

  function setBusy(on){
    metrics.active = !!on;
    try{ document.body.classList.toggle('ce-opt1-switching', !!on); }catch(_){ }
    const sel = $('selectedEvent');
    if(sel){
      sel.disabled = false;
      sel.style.pointerEvents = 'auto';
      sel.style.opacity = '1';
      sel.classList.toggle('ce-opt1-open', !!on && document.activeElement === sel);
    }
  }

  // Dedupe temporal de lecturas /api/state iguales durante cambios rápidos.
  // Evita 2-4 respuestas concurrentes pisándose al cambiar de evento.
  (function patchFetchStateDedup(){
    const oldFetch = window.fetch;
    if(typeof oldFetch !== 'function' || oldFetch.__ceOpt1StateDedup) return;
    const inflight = new Map();
    const wrapped = function(input, init){
      let url = '';
      let method = text(init?.method || (input && input.method) || 'GET').toUpperCase() || 'GET';
      try{ url = typeof input === 'string' ? input : (input && input.url) || ''; }catch(_){ }
      if(method === 'GET' && url){
        try{
          const u = new URL(url, window.location.origin);
          if(u.pathname === '/api/state'){
            // Normalizamos cache-busters para dedupe de una misma petición real.
            u.searchParams.delete('ts');
            u.searchParams.delete('_');
            u.searchParams.delete('cacheBust');
            const key = u.pathname + '?' + Array.from(u.searchParams.entries()).sort().map(([k,v]) => k+'='+v).join('&');
            const hit = inflight.get(key);
            if(hit && (Date.now() - hit.at) < 650){
              metrics.dedupedStateFetches++;
              return hit.promise.then(resp => resp.clone());
            }
            const p = oldFetch.apply(this, arguments).finally(() => setTimeout(() => inflight.delete(key), 120));
            inflight.set(key, {at:Date.now(), promise:p.then(resp => resp.clone())});
            return p;
          }
        }catch(_){ }
      }
      return oldFetch.apply(this, arguments);
    };
    wrapped.__ceOpt1StateDedup = true;
    window.fetch = wrapped;
  })();

  let token = 0;
  let debounce = 0;
  let lastRequested = '';
  let lastAt = 0;

  async function doSelectEvent(id, options){
    id = text(id);
    const s = stateRef();
    if(!id || !validEventId(id)){
      return false;
    }
    const now = Date.now();
    if(id === lastRequested && (now - lastAt) < 450){
      metrics.ignoredDuplicateChanges++;
      return false;
    }
    lastRequested = id;
    lastAt = now;
    const my = ++token;
    const start = performance.now ? performance.now() : Date.now();
    metrics.eventChanges++;
    metrics.lastEventId = id;
    try{ window.dispatchEvent(new CustomEvent('controlevent:opt1-event-start', {detail:{eventId:id, tab:currentTab()}})); }catch(_){ }
    try{ window.ControlEventOpt2I?.begin?.(id, 'opt1-event-start'); }catch(_){ }
    setBusy(true);
    closeHeavyFloaters();
    rememberEvent(id);
    const sel = $('selectedEvent');
    if(sel && sel.value !== id) sel.value = id;
    notice('');

    try{
      if(window.ControlEventV447 && typeof window.ControlEventV447.selectEvent === 'function'){
        // No cambiamos state.selectedEventId antes: el selector v44.7 necesita conocer
        // si venimos de "sin evento" para abrir Gráficas y limpiar bien.
        await window.ControlEventV447.selectEvent(id, Object.assign({force:true, delay:0}, options || {}));
      }else{
        try{ s.selectedEventId = id; }catch(_){ }
        if(typeof window.changeSelectedEvent === 'function' && window.changeSelectedEvent !== changeSelectedEventOpt1){
          await window.changeSelectedEvent(id);
        }else if(typeof window.render === 'function'){
          window.render();
        }
      }
    }catch(err){
      console.warn('[v23_prod_opt_1] cambio de evento', err);
    }finally{
      if(my === token){
        metrics.lastDurationMs = Math.round((performance.now ? performance.now() : Date.now()) - start);
        setTimeout(() => {
          if(my !== token) return;
          setBusy(false);
          closeHeavyFloaters();
          const sel2 = $('selectedEvent');
          if(sel2){ sel2.disabled = false; sel2.style.pointerEvents = 'auto'; sel2.style.opacity = '1'; if(sel2.value !== id) sel2.value = id; }
          try{ window.dispatchEvent(new CustomEvent('controlevent:opt1-event-stable', {detail:{eventId:id, durationMs:metrics.lastDurationMs, tab:currentTab()}})); }catch(_){ }
        }, 160);
      }
    }
    return false;
  }

  function changeSelectedEventOpt1(value, options){
    const id = text(value);
    clearTimeout(debounce);
    debounce = setTimeout(() => doSelectEvent(id, options), 65);
    return false;
  }
  changeSelectedEventOpt1.__ceV16Opt1 = true;

  function installChangeHook(){
    if(window.changeSelectedEvent !== changeSelectedEventOpt1){
      try{ window.__ceOpt1PreviousChangeSelectedEvent = window.changeSelectedEvent; }catch(_){ }
      window.changeSelectedEvent = changeSelectedEventOpt1;
      try{ changeSelectedEvent = changeSelectedEventOpt1; }catch(_){ }
      try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.changeSelectedEvent = changeSelectedEventOpt1; }catch(_){ }
    }
  }

  function selectCapture(ev){
    const sel = ev.target && ev.target.closest ? ev.target.closest('#selectedEvent') : null;
    if(!sel) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    sel.classList.remove('ce-opt1-open');
    changeSelectedEventOpt1(sel.value);
    return false;
  }

  function protectSelectPointer(ev){
    const sel = ev.target && ev.target.closest ? ev.target.closest('#selectedEvent') : null;
    if(!sel) return;
    sel.disabled = false;
    sel.style.pointerEvents = 'auto';
    sel.style.opacity = '1';
    sel.classList.add('ce-opt1-open');
    // No preventDefault: debe abrirse el select nativo. Solo paramos burbujas posteriores.
    ev.stopPropagation();
  }

  function unlockSelect(){
    const sel = $('selectedEvent');
    if(!sel) return;
    sel.disabled = false;
    sel.removeAttribute('disabled');
    sel.style.pointerEvents = 'auto';
    sel.style.opacity = '1';
  }

  function install(){
    injectStyle();
    installChangeHook();
    unlockSelect();
  }

  window.addEventListener('change', selectCapture, true);
  window.addEventListener('pointerdown', protectSelectPointer, true);
  window.addEventListener('mousedown', protectSelectPointer, true);
  window.addEventListener('touchstart', protectSelectPointer, true);
  window.addEventListener('focusin', function(ev){ if(ev.target && ev.target.id === 'selectedEvent') unlockSelect(); }, true);
  window.addEventListener('blur', function(){ const sel=$('selectedEvent'); if(sel) sel.classList.remove('ce-opt1-open'); }, true);
  window.addEventListener('controlevent:event-ready', unlockSelect, true);
  window.addEventListener('controlevent:app-ready', install, true);
  window.addEventListener('load', () => setTimeout(install, 40), true);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true}); else install();
  [150, 650, 1800].forEach(ms => setTimeout(install, ms));
})();
