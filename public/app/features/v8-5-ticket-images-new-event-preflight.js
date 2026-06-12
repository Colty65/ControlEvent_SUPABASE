/* ControlEvent v8.5_prod FIX17 - subida de fotos sin PUT destructivo de /api/state.
   Sustituye el preflight de FIX15/FIX16. Ya NO sincroniza el estado completo antes de subir fotos.
   Para eventos recien creados, adjunta una fotografia del evento actual al POST /api/ticket-images;
   el servidor solo podra crear ese evento concreto si aun no existe, sin tocar INGRESOS/COMPRAS. */
(function(){
  'use strict';
  const INSTALLED = '__ceV85TicketImagesNewEventPreflightFix17';
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
  function selectedEventSnapshot(eventId){
    const evId = norm(eventId);
    const s = stateRef();
    const eventos = Array.isArray(s.eventos) ? s.eventos : [];
    let ev = eventos.find(item => norm(item && item.id) === evId) || null;
    if(!ev){
      try{ const sel = typeof selectedEvent === 'function' ? selectedEvent() : null; if(sel && norm(sel.id) === evId) ev = sel; }catch(_){ }
    }
    if(!ev || !evId) return null;
    return {
      id: evId,
      titulo: ev.titulo || ev.nombre || '',
      precio: ev.precio ?? 0,
      fechaIni: ev.fechaIni || ev.fecha_ini || '',
      fechaFin: ev.fechaFin || ev.fecha_fin || '',
      situacion: ev.situacion || 'En curso',
      descripcion: ev.descripcion || ''
    };
  }
  function decodeBody(init){
    const body = init && init.body;
    if(!body || typeof body !== 'string') return null;
    try{ return JSON.parse(body); }catch(_){ return null; }
  }

  if(typeof window.fetch === 'function' && !window.fetch.__ceV85TicketImagesNewEventPreflightFix17){
    const oldFetch = window.fetch.bind(window);
    const wrapped = async function(input, init){
      const url = String(typeof input === 'string' ? input : (input && input.url) || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      if(isTicketImagesPost(url, method) && init && typeof init.body === 'string'){
        const payload = decodeBody(init);
        if(payload && !payload.eventSnapshot){
          const snap = selectedEventSnapshot(payload.eventId);
          if(snap){
            const nextInit = Object.assign({}, init, {body: JSON.stringify(Object.assign({}, payload, {eventSnapshot: snap}))});
            return oldFetch(input, nextInit);
          }
        }
      }
      return oldFetch(input, init);
    };
    wrapped.__ceV85TicketImagesNewEventPreflightFix17 = true;
    window.fetch = wrapped;
  }

  window.ControlEventV85TicketImagesNewEventPreflight = {version:'v8.5_prod FIX17', mode:'eventSnapshotOnly'};
})();
