/* ControlEvent v13.0_prod - Baja segura de evento con eliminación en cascada controlada.
   Elimina EVENTO + INGRESOS + COMPRAS/DONACIONES + imágenes de tickets.
   No elimina PERSONAS, TIENDAS ni PRODUCTOS generales. */
(function(){
  'use strict';
  const INSTALLED = '__ceEventDeleteCascadeV337';
  if(document[INSTALLED]) return;
  document[INSTALLED] = true;

  function st(){ return window.state || window.ControlEventApp?.state || window.ControlEventRuntime?.app?.state || {}; }
  function esc(value){ return String(value ?? ''); }
  function isGD(){
    try{ if(typeof window.isGodRole === 'function') return !!window.isGodRole(); }catch(_){ }
    try{ if(typeof isGodRole === 'function') return !!isGodRole(); }catch(_){ }
    const u = window.authUser || window.ControlEventApp?.authUser || window.ControlEventRuntime?.app?.authUser || null;
    return String(u?.nivel || '').toUpperCase() === 'GD';
  }
  function save(){
    try{ if(typeof window.saveState === 'function'){ window.saveState(); return; } }catch(_){ }
    try{ if(typeof saveState === 'function') saveState(); }catch(_){ }
  }
  function redraw(){
    try{ if(typeof window.render === 'function'){ window.render(); } }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
    refreshMaintenanceEventos();
  }
  function refreshMaintenanceEventos(){
    try{ if(typeof renderEventos === 'function') renderEventos(); }catch(_){ }
    try{ if(typeof renderMaintenanceTabs === 'function') renderMaintenanceTabs(); }catch(_){ }
    try{
      const api=window.ControlEventMaintenance;
      if(api && typeof api.refreshCurrent==='function'){
        Promise.resolve(api.refreshCurrent({reason:'event-delete-cascade-refresh', force:true})).catch(()=>{});
      }
    }catch(_){ }
  }
  function eventById(id){ return (st().eventos || []).find(e => String(e.id || '') === String(id || '')) || null; }
  function countTicketImages(eventId){
    const prefix = String(eventId) + '|';
    const keys = new Set();
    const addKeys = obj => {
      if(!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(k => { if(String(k).startsWith(prefix)) keys.add(String(k)); });
    };
    addKeys(st().ticketImages);
    addKeys(st().ticketImageRefs);
    return keys.size;
  }
  function deleteTicketImagesLocal(eventId){
    const prefix = String(eventId) + '|';
    ['ticketImages','ticketImageRefs'].forEach(name => {
      const obj = st()[name];
      if(!obj || typeof obj !== 'object') return;
      Object.keys(obj).forEach(k => { if(String(k).startsWith(prefix)) delete obj[k]; });
    });
  }
  async function deleteTicketImagesServer(eventId){
    const url = '/api/ticket-images?eventId=' + encodeURIComponent(String(eventId || '')) + '&all=1';
    const res = await fetch(url, { method: 'DELETE', cache: 'no-store' });
    if(!res.ok){
      const text = await res.text().catch(() => '');
      throw new Error(text || ('HTTP ' + res.status + ' eliminando fotos del evento'));
    }
    return res.json().catch(() => ({ok:true}));
  }
  function scheduleTicketImageCleanup(eventId){
    // Segunda pasada no bloqueante: cubre retardos de guardado remoto o cualquier handler legado que haya persistido tarde.
    window.setTimeout(() => {
      deleteTicketImagesServer(eventId).catch(error => {
        console.warn('[ControlEvent v13.0_prod] Limpieza diferida de CE_TICKET_IMAGES no bloqueante:', error?.message || error);
      });
    }, 1400);
  }
  async function handleDelete(button, event){
    const eventId = button?.dataset?.id || '';
    if(!eventId) return;
    if(!isGD()) return;
    const state = st();
    const ev = eventById(eventId);
    if(!ev) return;

    event.preventDefault();
    event.stopPropagation();
    if(typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();

    const ingresos = (state.colaboradores || []).filter(x => String(x.eventId || '') === String(eventId));
    const compras = (state.compras || []).filter(x => String(x.eventId || '') === String(eventId));
    const donaciones = compras.filter(x => ['DONADO TIENDA','DONADO SOCIO','DONADO OTROS'].includes(String(x.ticketDonacion || '').trim()));
    const comprasNoDon = compras.length - donaciones.length;
    const ticketImgs = countTicketImages(eventId);
    const docs = (state.eventDocuments || []).filter(x => String(x.eventId || '') === String(eventId));

    const msg = [
      'ATENCIÓN: baja definitiva de evento.',
      '',
      'Evento: ' + esc(ev.titulo || 'sin título'),
      '',
      'Se eliminará:',
      '• El propio evento.',
      '• Ingresos/colaboradores del evento: ' + ingresos.length,
      '• Compras/gastos del evento: ' + comprasNoDon,
      '• Donaciones de producto del evento: ' + donaciones.length,
      '• Imágenes de tickets/documentos del evento: ' + ticketImgs,
      '• Fichas de documentos del evento: ' + docs.length,
      '',
      'NO se eliminarán PERSONAS, TIENDAS ni PRODUCTOS de las tablas generales, aunque solo hayan intervenido en este evento.',
      '',
      'Esta operación no se puede deshacer salvo restaurando un BACKUP.',
      '',
      '¿Quieres continuar?'
    ].join('\n');
    let ok = false;
    try{ ok = confirm(msg); }catch(_){ ok = false; }
    if(!ok) return;

    let ok2 = false;
    try{ ok2 = confirm('Confirmación final: ¿eliminar definitivamente el evento "' + esc(ev.titulo || '') + '" y todos sus ingresos/compras/donaciones?'); }catch(_){ ok2 = false; }
    if(!ok2) return;

    const prevDisabled = !!button.disabled;
    button.disabled = true;
    try{
      await deleteTicketImagesServer(eventId);
    }catch(err){
      button.disabled = prevDisabled;
      try{ alert('No se han podido eliminar las fotos del evento en servidor. No se da de baja el evento para evitar referencias huérfanas.\n\n' + (err?.message || err)); }catch(_){ }
      return;
    }

    state.eventos = (state.eventos || []).filter(e => String(e.id || '') !== String(eventId));
    state.colaboradores = (state.colaboradores || []).filter(c => String(c.eventId || '') !== String(eventId));
    state.compras = (state.compras || []).filter(c => String(c.eventId || '') !== String(eventId));
    deleteTicketImagesLocal(eventId);
    if(Array.isArray(state.eventDocuments)) state.eventDocuments = state.eventDocuments.filter(d => String(d.eventId || '') !== String(eventId));
    if(String(state.selectedEventId || '') === String(eventId)) state.selectedEventId = state.eventos?.[0]?.id || '';
    save();
    scheduleTicketImageCleanup(eventId);
    redraw();
  }

  document.addEventListener('click', function(event){
    const button = event.target?.closest?.('button[data-action="delete-evento"]');
    if(button) handleDelete(button, event).catch(err => {
      try{ alert('Error dando de baja el evento: ' + (err?.message || err)); }catch(_){ }
    });
  }, true);
})();
