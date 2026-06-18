/* ControlEvent v10.2_prod FIX13 - guardia de escritura ce_ticket_images.
   Evita que migraciones antiguas/locales suban fotos al abrir la pantalla de login
   con un selectedEventId obsoleto y creen event_id huérfanos. */
(function(){
  'use strict';
  const INSTALLED = '__ceV85TicketImagesWriteGuardFix13';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const norm = value => String(value ?? '').trim();
  const isTicketImagesPost = (url, method) => /\/api\/ticket-images(?:$|\?)/i.test(String(url || '')) && String(method || 'GET').toUpperCase() === 'POST';
  const jsonResponse = (status, body) => new Response(JSON.stringify(body || {}), {status, headers:{'Content-Type':'application/json'}});

  function stateRef(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || window.ControlEventApp?.state || {};
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
  function selectedEventId(){
    const s = stateRef();
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev && ev.id) return norm(ev.id); }catch(_){ }
    return norm(s.selectedEventId || '');
  }
  function decodeBody(init){
    const body = init && init.body;
    if(!body || typeof body !== 'string') return {};
    try{ return JSON.parse(body); }catch(_){ return {}; }
  }
  function shouldBlockUpload(payload){
    const eventId = norm(payload && payload.eventId) || selectedEventId();
    if(!authenticated()) return {block:true, reason:'not_authenticated', eventId};
    if(!eventId) return {block:true, reason:'empty_event_id', eventId};
    const ids = liveEventIds();
    if(ids.size && !ids.has(eventId)) return {block:true, reason:'event_not_in_loaded_state', eventId};
    const key = norm(payload && payload.key);
    const first = key.split('|')[0] || '';
    if(/^id-[a-z0-9_-]+$/i.test(first) && first !== eventId) return {block:true, reason:'key_from_other_event', eventId, key};
    return {block:false, eventId};
  }

  if(typeof window.fetch === 'function' && !window.fetch.__ceV85TicketImagesWriteGuardFix13){
    const oldFetch = window.fetch.bind(window);
    const wrapped = function(input, init){
      const url = String(typeof input === 'string' ? input : (input && input.url) || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if(isTicketImagesPost(url, method)){
        const payload = decodeBody(init || {});
        const check = shouldBlockUpload(payload);
        if(check.block){
          try{ console.warn('[ControlEvent v8.5 FIX13/FIX26] POST /api/ticket-images bloqueado:', check); }catch(_){ }
          return Promise.resolve(jsonResponse(409, {ok:false, blocked:true, error:'Subida de foto bloqueada: evento no valido o usuario no autenticado.', detail:check}));
        }
        const headers = (()=>{ try{ return init?.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : {...(init?.headers||{})}; }catch(_){ return {}; } })();
        headers['X-ControlEvent-Write-Scope'] = 'ticket-image-v8-5-fix26';
        init = {...(init||{}), headers};
      }
      return oldFetch(input, init);
    };
    wrapped.__ceV85TicketImagesWriteGuardFix13 = true;
    window.fetch = wrapped;
  }

  window.ControlEventV85TicketImagesWriteGuard = {version:'v8.5_prod FIX13', authenticated, liveEventIds, selectedEventId};
})();
