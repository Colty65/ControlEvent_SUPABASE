(function(){
  'use strict';
  const LOG='[CE FIX48 EVENT-SCOPED STATE]';
  const SELECT_KEY='controlevent_v229_selected_event_id';
  const STORAGE_KEY_FALLBACK='controlevent_v6_4';

  function text(v){ return v == null ? '' : String(v); }
  function stateObj(){ try { return (typeof window.state !== 'undefined' && window.state) || {}; } catch(_) { return window.state || {}; } }
  function storageKey(){ try { return typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : STORAGE_KEY_FALLBACK; } catch(_) { return STORAGE_KEY_FALLBACK; } }
  function selectedEventId(){
    const s=stateObj();
    let id=text(s.selectedEventId).trim();
    if(id) return id;
    try { id=text(sessionStorage.getItem(SELECT_KEY)).trim(); } catch(_) {}
    if(id) return id;
    try { id=text(localStorage.getItem(SELECT_KEY)).trim(); } catch(_) {}
    return id;
  }
  function rememberEvent(id){
    id=text(id).trim(); if(!id) return;
    try{ sessionStorage.setItem(SELECT_KEY,id); }catch(_){}
    try{ localStorage.setItem(SELECT_KEY,id); }catch(_){}
  }
  function persistLocal(){
    try{ localStorage.setItem(storageKey(), JSON.stringify(stateObj())); }catch(_){}
  }
  function validEventId(id){
    id=text(id).trim(); if(!id) return false;
    const events=Array.isArray(stateObj().eventos)?stateObj().eventos:[];
    return !events.length || events.some(e=>text(e && e.id).trim()===id);
  }
  function mergeLoaded(serverState){
    try{
      if(typeof mergeLoadedState==='function' && typeof defaultState==='function'){
        return mergeLoadedState(serverState||{}, defaultState());
      }
    }catch(err){ console.warn(LOG,'mergeLoadedState falló; uso estado directo',err); }
    return serverState || {};
  }
  function applyState(serverState, eventId){
    const s=stateObj();
    const merged=mergeLoaded(serverState || {});
    Object.keys(s).forEach(k=>{ delete s[k]; });
    Object.assign(s, merged);
    if(eventId) s.selectedEventId=eventId;
    rememberEvent(s.selectedEventId || eventId || '');
    persistLocal();
    try{ window.state=s; }catch(_){}
    return s;
  }
  function decorateStateUrl(input){
    try{
      const method='GET';
      let raw=typeof input==='string' ? input : (input && input.url) || '';
      if(!raw) return input;
      const u=new URL(raw, window.location.origin);
      if(u.pathname !== '/api/state') return input;
      if(u.searchParams.has('eventId') || u.searchParams.has('event_id')) return input;
      const ev=selectedEventId();
      if(!ev) return input;
      u.searchParams.set('eventId', ev);
      u.searchParams.set('scope', 'event');
      u.searchParams.set('fix48', '1');
      const next = u.pathname + u.search;
      if(typeof input==='string') return next;
      try{ return new Request(next, input); }catch(_){ return next; }
    }catch(_){ return input; }
  }

  async function fetchEventState(eventId){
    const ev=text(eventId).trim();
    if(!ev) throw new Error('No hay evento seleccionado para cargar datos por evento.');
    const url='/api/state?eventId='+encodeURIComponent(ev)+'&scope=event&fix48=1&_='+Date.now();
    const res=await (window.__ceFix48NativeFetch || window.fetch)(url, {cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
    const data=await res.json().catch(()=>({}));
    if(!res.ok) throw new Error(data.error || ('No se pudo cargar datos del evento '+ev));
    return applyState(data, ev);
  }

  // Interceptor conservador: todo GET /api/state posterior a tener selectedEventId se convierte
  // en lectura por evento. No afecta PUT /api/state, backup, importación ni CRUD.
  if(!window.__ceFix48FetchInstalled){
    window.__ceFix48FetchInstalled=true;
    window.__ceFix48NativeFetch=window.fetch.bind(window);
    window.fetch=function(input, init){
      try{
        const method=text((init && init.method) || (input && input.method) || 'GET').toUpperCase();
        if(method==='GET') input=decorateStateUrl(input);
      }catch(_){}
      return window.__ceFix48NativeFetch(input, init);
    };
  }

  async function changeSelectedEventScoped(value){
    const ev=text(value).trim();
    if(!ev || !validEventId(ev)) return false;
    const s=stateObj();
    s.selectedEventId=ev;
    rememberEvent(ev);
    persistLocal();
    const sel=document.getElementById('selectedEvent');
    if(sel) sel.value=ev;
    try{ if(typeof render==='function') render(); }catch(_){}
    try{
      document.body.classList.add('ce-event-loading-fix48');
      await fetchEventState(ev);
      const sel2=document.getElementById('selectedEvent');
      if(sel2) sel2.value=ev;
      try{ if(typeof render==='function') render(); }catch(_){}
      setTimeout(()=>{ try{ if(typeof render==='function') render(); }catch(_){} },80);
      return false;
    }catch(err){
      console.error(LOG,'No se pudo cargar evento seleccionado',err);
      alert(err && err.message ? err.message : String(err));
      return false;
    }finally{
      document.body.classList.remove('ce-event-loading-fix48');
    }
  }

  window.__ceLoadSelectedEventStateFix48=fetchEventState;
  window.changeSelectedEvent=changeSelectedEventScoped;

  document.addEventListener('change',function(ev){
    const t=ev.target;
    if(t && t.id==='selectedEvent'){
      ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
      changeSelectedEventScoped(t.value);
      return false;
    }
  },true);

  // Tras login/reanudación, si hay evento recordado, recarga solo sus datos.
  function afterAuthTryScopedLoad(){
    const ev=selectedEventId();
    if(!ev) return;
    if(window.__ceFix48AutoLoading===ev) return;
    window.__ceFix48AutoLoading=ev;
    setTimeout(()=>{
      fetchEventState(ev)
        .then(()=>{ try{ if(typeof render==='function') render(); }catch(_){} })
        .catch(err=>console.warn(LOG,'Carga inicial por evento no completada',err))
        .finally(()=>{ window.__ceFix48AutoLoading=''; });
    },350);
  }
  window.addEventListener('load', afterAuthTryScopedLoad, false);
  document.addEventListener('DOMContentLoaded', afterAuthTryScopedLoad, false);
  document.addEventListener('click',function(ev){
    const t=ev.target;
    if(t && (t.id==='btnLogin' || t.closest && t.closest('#btnLogin'))){ setTimeout(afterAuthTryScopedLoad,900); }
  },true);

  console.info(LOG,'activo: /api/state con eventId y cambio de evento por carga parcial.');
})();
