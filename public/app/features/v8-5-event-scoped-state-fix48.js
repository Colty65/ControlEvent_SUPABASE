(function(){
  'use strict';
  const LOG='[CE FIX48 EVENT-SCOPED STATE v10.4.4]';
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

  function payloadCount(data){
    if(!data || typeof data !== 'object') return 0;
    let n=0;
    ['compras','colaboradores','eventDocuments'].forEach(k=>{ if(Array.isArray(data[k])) n += data[k].length; });
    if(data.ticketImages && typeof data.ticketImages === 'object') n += Object.keys(data.ticketImages).length;
    if(data.ticketImageRefs && typeof data.ticketImageRefs === 'object') n += Object.keys(data.ticketImageRefs).length;
    return n;
  }
  function localCountForSelected(){
    const s=stateObj(); let n=0;
    ['compras','colaboradores','eventDocuments'].forEach(k=>{ if(Array.isArray(s[k])) n += s[k].length; });
    if(s.ticketImages && typeof s.ticketImages === 'object') n += Object.keys(s.ticketImages).length;
    if(s.ticketImageRefs && typeof s.ticketImageRefs === 'object') n += Object.keys(s.ticketImageRefs).length;
    return n;
  }

  function scopedCount(data, ev){
    if(!data || typeof data !== 'object') return 0;
    let n=0;
    ['compras','colaboradores','eventDocuments'].forEach(k=>{ if(Array.isArray(data[k])) n += data[k].filter(r=>text(r?.eventId || r?.event_id).trim()===ev).length; });
    ['ticketImages','ticketImageRefs'].forEach(k=>{ const bag=data[k]||{}; if(bag && typeof bag==='object') n += Object.keys(bag).filter(key=>text(key).startsWith(ev+'|')).length; });
    return n;
  }
  async function fullFallbackState(nativeFetch, ev){
    try{
      const res=await nativeFetch('/api/state?fullFallback=1&v102=1&_='+Date.now(), {cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
      const data=await res.json().catch(()=>({}));
      if(res.ok && scopedCount(data, ev)>0){
        console.warn(LOG,'Fallback completo recuperó datos del evento tras respuesta vacía scoped.', {eventId:ev, scopedCount:scopedCount(data, ev)});
        return data;
      }
    }catch(err){ console.warn(LOG,'Fallback completo no disponible', err?.message || err); }
    return null;
  }
  async function fetchEventState(eventId){
    const ev=text(eventId).trim();
    if(!ev) throw new Error('No hay evento seleccionado para cargar datos por evento.');
    const nativeFetch = window.__ceFix48NativeFetch || window.fetch;
    const hadLocal = localCountForSelected();
    let lastData=null, lastError=null;
    for(let attempt=1; attempt<=6; attempt++){
      try{
        const url='/api/state?eventId='+encodeURIComponent(ev)+'&scope=event&fix48=1&v102=1&attempt='+attempt+'&_='+Date.now();
        const res=await nativeFetch(url, {cache:'no-store', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
        const data=await res.json().catch(()=>({}));
        if(!res.ok) throw new Error(data.error || ('No se pudo cargar datos del evento '+ev));
        lastData=data;
        const count=payloadCount(data);
        // v10.4.4: si llega una respuesta vacía justo después de cambiar/recargar un evento que tenía datos en pantalla,
        // no machacamos el estado a la primera. Reintentamos porque a veces el navegador/edge devuelve una carga parcial.
        if(count===0 && attempt<6){
          console.warn(LOG,'Respuesta de evento aparentemente vacía; reintento antes de aplicar estado vacío', {eventId:ev, attempt, hadLocal});
          await new Promise(r=>setTimeout(r, 300 + attempt*450));
          continue;
        }
        if(count===0){
          const fallback=await fullFallbackState(nativeFetch, ev);
          if(fallback) return applyState(fallback, ev);
        }
        return applyState(data, ev);
      }catch(err){
        lastError=err;
        if(attempt<6){ await new Promise(r=>setTimeout(r, 250 + attempt*420)); continue; }
      }
    }
    if(lastData) return applyState(lastData, ev);
    throw lastError || new Error('No se pudo cargar datos del evento '+ev);
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
    const prev=text(s.selectedEventId).trim();
    try{
      document.body.classList.add('ce-event-loading-fix48');
      await fetchEventState(ev);
      rememberEvent(ev);
      persistLocal();
      const sel2=document.getElementById('selectedEvent');
      if(sel2) sel2.value=ev;
      try{ if(typeof render==='function') render(); }catch(_){}
      return false;
    }catch(err){
      console.error(LOG,'No se pudo cargar evento seleccionado',err);
      if(prev){ s.selectedEventId=prev; const sel=document.getElementById('selectedEvent'); if(sel) sel.value=prev; try{ if(typeof render==='function') render(); }catch(_){} }
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

  // v10.4.4: sin recarga automática tras login/CTRL+F5 para evitar reentradas y temblores.
  function afterAuthTryScopedLoad(){ return; }

  console.info(LOG,'activo: /api/state con eventId y cambio de evento por carga parcial.');
})();
