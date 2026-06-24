/* ControlEvent v15_prod - carga fiable por evento sin refrescos en bucle.
   Al cambiar de evento hace una única lectura /api/state?eventId=... y repinta la ventana activa. */
(function(){
  'use strict';
  if (window.__ceV120EventScopedLoader) return;
  window.__ceV120EventScopedLoader = true;

  function $(id){ return document.getElementById(id); }
  function text(v){ return v == null ? '' : String(v); }
  function st(){ try{ return window.state || window.ControlEventApp?.state || window.appState || {}; }catch(_){ return {}; } }
  function selectedId(){
    try{ if(typeof window.selectedEventId === 'function') return text(window.selectedEventId()).trim(); }catch(_){}
    return text(st().selectedEventId || $('selectedEvent')?.value || '').trim();
  }
  function currentTab(){
    try{ if(typeof window.currentTab === 'function') return window.currentTab(); }catch(_){}
    try{ return window.state?.currentTab || window.activeTab || 'graficas'; }catch(_){ return 'graficas'; }
  }
  function mergeState(server, id){
    const target = st();
    let merged = server || {};
    try{ if(typeof window.mergeLoadedState === 'function' && typeof window.defaultState === 'function') merged = window.mergeLoadedState(server, window.defaultState()); }catch(_){}
    try{ if(typeof mergeLoadedState === 'function' && typeof defaultState === 'function') merged = mergeLoadedState(server, defaultState()); }catch(_){}
    Object.keys(target).forEach(k => { delete target[k]; });
    Object.assign(target, merged || {});
    target.selectedEventId = id;
    try{ if(window.ControlEventApp) window.ControlEventApp.state = target; }catch(_){}
    const sel=$('selectedEvent'); if(sel && sel.value !== id) sel.value = id;
    return target;
  }
  function call(name){
    try{ const fn = window[name] || (typeof globalThis !== 'undefined' ? globalThis[name] : null); if(typeof fn === 'function') return fn(); }catch(_){}
    try{ if(typeof eval === 'function'){ const fn = eval('typeof '+name+'==="function"?'+name+':null'); if(typeof fn==='function') return fn(); } }catch(_){}
  }
  function renderActive(reason){
    try{ document.body.classList.remove('ce-v120-event-loading'); }catch(_){}
    call('renderHeader');
    call('renderTabVisibility');
    const tab = currentTab();
    try{ if(typeof window.renderActiveTab === 'function') window.renderActiveTab(tab); else if(typeof renderActiveTab === 'function') renderActiveTab(tab); else call('render'); }catch(_){ call('render'); }
    if(tab === 'graficas') { call('renderGraficas'); }
    if(tab === 'budget' || tab === 'resumen') { call('renderBudget'); }
    try{ window.ControlEventViewRefreshStabilizer?.hydrate?.(tab, 'v12-event-scoped-'+reason); }catch(_){}
    try{ window.ControlEventV113ZuzuAnalitica?.install?.(); }catch(_){}
    try{ window.ControlEventV120FinalizadoTools?.apply?.(); }catch(_){}
    try{ window.dispatchEvent(new CustomEvent('controlevent:event-loaded', {detail:{eventId:selectedId(), reason}})); }catch(_){}
  }
  let busyId = '';
  let scheduled = 0;
  let seq = 0;
  let lastOk = '';
  async function load(id, reason){
    if(!id) return;
    const s = st();
    if(s.__eventScoped === true && text(s.__eventScopedId).trim() === id && lastOk === id) return;
    const mySeq = ++seq;
    busyId = id;
    try{ document.body.classList.add('ce-v120-event-loading'); }catch(_){}
    try{
      const res = await fetch('/api/state?eventId=' + encodeURIComponent(id) + '&ts=' + Date.now(), {cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
      if(!res.ok) throw new Error('No se pudo cargar el evento '+id+' ('+res.status+')');
      const fresh = await res.json();
      if(mySeq !== seq || selectedId() !== id) return;
      mergeState(fresh, id);
      lastOk = id;
      renderActive(reason || 'event-change');
    }catch(err){
      console.warn('[ControlEvent v15_prod] Carga por evento fallida:', err && err.message || err);
    }finally{
      if(mySeq === seq){ busyId = ''; try{ document.body.classList.remove('ce-v120-event-loading'); }catch(_){} }
    }
  }
  function schedule(reason, delay){
    const id = selectedId();
    if(!id) return;
    clearTimeout(scheduled);
    scheduled = setTimeout(function(){ load(id, reason); }, delay == null ? 180 : delay);
  }
  function patchChangeSelected(){
    try{
      const old = window.changeSelectedEvent || (typeof changeSelectedEvent === 'function' ? changeSelectedEvent : null);
      if(typeof old !== 'function' || old.__ceV120EventScoped) return;
      const w = function(value){
        const ret = old.apply(this, arguments);
        const id = text(value || selectedId()).trim();
        if(id){ lastOk = ''; schedule('changeSelectedEvent', 120); }
        return ret;
      };
      w.__ceV120EventScoped = true;
      window.changeSelectedEvent = w;
      try{ changeSelectedEvent = w; }catch(_){}
      try{ if(window.ControlEventApp?.actions) window.ControlEventApp.actions.changeSelectedEvent = w; }catch(_){}
    }catch(_){}
  }
  document.addEventListener('change', function(ev){ if(ev.target && ev.target.id === 'selectedEvent'){ lastOk=''; schedule('select-change', 120); } }, true);
  ['controlevent:event-ready','controlevent:app-ready','ce:event-selected','DOMContentLoaded','load'].forEach(name => {
    try{ window.addEventListener(name, function(){ patchChangeSelected(); schedule(name, 260); }, true); }catch(_){}
    try{ document.addEventListener(name, function(){ patchChangeSelected(); schedule(name, 260); }, true); }catch(_){}
  });
  patchChangeSelected();
  [300,1200].forEach(ms => setTimeout(function(){ patchChangeSelected(); schedule('startup', 0); }, ms));
  window.ControlEventV120EventScopedLoader = { load, schedule, renderActive };
})();
