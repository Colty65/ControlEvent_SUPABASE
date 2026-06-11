/* ControlEvent v8.5_prod FIX15 - preflight de fotos en eventos recien creados.
   La FIX13 bloqueaba correctamente fotos de eventos inexistentes, pero un evento nuevo
   puede estar aun pendiente del PUT /api/state cuando se adjunta el primer justificante.
   Antes de POST /api/ticket-images, fuerza una sincronizacion completa del estado vivo. */
(function(){
  'use strict';
  const INSTALLED = '__ceV85TicketImagesNewEventPreflightFix15';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const norm = value => String(value ?? '').trim();
  const isTicketImagesPost = (url, method) => /\/api\/ticket-images(?:$|\?)/i.test(String(url || '')) && String(method || 'GET').toUpperCase() === 'POST';

  function stateRef(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    try{ if(window.state) return window.state; }catch(_){ }
    try{ if(window.ControlEventApp && window.ControlEventApp.state) return window.ControlEventApp.state; }catch(_){ }
    return {};
  }
  function authenticated(){
    try{ if(window.authUser && window.authUser.identificacion) return true; }catch(_){ }
    try{ if(typeof authUser !== 'undefined' && authUser && authUser.identificacion) return true; }catch(_){ }
    return false;
  }
  function liveEventIds(){
    const s = stateRef();
    return new Set((Array.isArray(s.eventos) ? s.eventos : []).map(e => norm(e && e.id)).filter(Boolean));
  }
  function decodeBody(init){
    const body = init && init.body;
    if(!body || typeof body !== 'string') return {};
    try{ return JSON.parse(body); }catch(_){ return {}; }
  }
  function snapshotState(){
    const s = stateRef();
    if(!s || typeof s !== 'object') return null;
    try{
      const copy = JSON.parse(JSON.stringify(s));
      copy.__imageUploadPreflight = true;
      return copy;
    }catch(_){
      try{ return Object.assign({}, s, {__imageUploadPreflight:true}); }catch(__){ return null; }
    }
  }

  let preflightChain = Promise.resolve();
  const lastOk = new Map();

  async function ensureStateSavedBeforeImageUpload(oldFetch, eventId){
    const ev = norm(eventId);
    if(!ev || !authenticated()) return;
    const ids = liveEventIds();
    if(!ids.has(ev)) return;

    const now = Date.now();
    const last = lastOk.get(ev) || 0;
    if(now - last < 2500) return;

    const payload = snapshotState();
    if(!payload || !Array.isArray(payload.eventos) || !payload.eventos.some(e => norm(e && e.id) === ev)) return;

    preflightChain = preflightChain.catch(() => {}).then(async () => {
      const res = await oldFetch('/api/state?imagePreflight=1&ts=' + Date.now(), {
        method: 'PUT',
        headers: {'Content-Type':'application/json','Cache-Control':'no-cache','Pragma':'no-cache'},
        body: JSON.stringify(payload),
        cache: 'no-store'
      });
      if(!res.ok){
        let msg = '';
        try{ msg = await res.text(); }catch(_){ }
        throw new Error('No se pudo sincronizar el evento antes de subir la foto. ' + msg);
      }
      lastOk.set(ev, Date.now());
    });
    await preflightChain;
  }

  if(typeof window.fetch === 'function' && !window.fetch.__ceV85TicketImagesNewEventPreflightFix15){
    const oldFetch = window.fetch.bind(window);
    const wrapped = async function(input, init){
      const url = String(typeof input === 'string' ? input : (input && input.url) || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if(isTicketImagesPost(url, method)){
        const payload = decodeBody(init || {});
        const eventId = norm(payload && payload.eventId);
        try{ await ensureStateSavedBeforeImageUpload(oldFetch, eventId); }
        catch(error){
          try{ console.warn('[ControlEvent v8.5 FIX15] Preflight /api/state antes de subir imagen fallido:', error); }catch(_){ }
          return new Response(JSON.stringify({ok:false, error:error?.message || String(error || 'No se pudo sincronizar el evento antes de subir la foto.')}), {status:409, headers:{'Content-Type':'application/json'}});
        }
      }
      return oldFetch(input, init);
    };
    wrapped.__ceV85TicketImagesNewEventPreflightFix15 = true;
    window.fetch = wrapped;
  }

  window.ControlEventV85TicketImagesNewEventPreflight = {version:'v8.5_prod FIX15'};
})();
