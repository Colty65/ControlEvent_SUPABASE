/* ControlEvent v8.5_prod FIX16 - preflight ligero de fotos en eventos recien creados.
   Mantiene la proteccion anti-huerfanos, pero al sincronizar antes de subir una foto
   NO envia ticketImages/ticketImageRefs. Asi evita que aliases antiguos/canonicos de
   imagen provoquen ON CONFLICT ... affect row a second time durante el PUT /api/state. */
(function(){
  'use strict';
  const INSTALLED = '__ceV85TicketImagesNewEventPreflightFix16';
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
      // FIX16: este preflight solo debe consolidar tablas de estado, no regrabar fotos.
      // Enviar ticketImages/ticketImageRefs aqui puede contener aliases duplicados que,
      // al canonizarse en servidor, acaban en dos filas con el mismo image_key dentro
      // del mismo upsert y Supabase devuelve ON CONFLICT ... second time.
      delete copy.ticketImages;
      delete copy.ticketImageRefs;
      return copy;
    }catch(_){
      try{
        const copy = Object.assign({}, s, {__imageUploadPreflight:true});
        delete copy.ticketImages;
        delete copy.ticketImageRefs;
        return copy;
      }catch(__){ return null; }
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

  if(typeof window.fetch === 'function' && !window.fetch.__ceV85TicketImagesNewEventPreflightFix16){
    const oldFetch = window.fetch.bind(window);
    const wrapped = async function(input, init){
      const url = String(typeof input === 'string' ? input : (input && input.url) || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if(isTicketImagesPost(url, method)){
        const payload = decodeBody(init || {});
        const eventId = norm(payload && payload.eventId);
        try{ await ensureStateSavedBeforeImageUpload(oldFetch, eventId); }
        catch(error){
          try{ console.warn('[ControlEvent v8.5 FIX16] Preflight /api/state antes de subir imagen fallido:', error); }catch(_){ }
          return new Response(JSON.stringify({ok:false, error:error?.message || String(error || 'No se pudo sincronizar el evento antes de subir la foto.')}), {status:409, headers:{'Content-Type':'application/json'}});
        }
      }
      return oldFetch(input, init);
    };
    wrapped.__ceV85TicketImagesNewEventPreflightFix16 = true;
    window.fetch = wrapped;
  }

  window.ControlEventV85TicketImagesNewEventPreflight = {version:'v8.5_prod FIX16'};
})();
