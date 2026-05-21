/* ControlEvent v33.6 - Baja segura de evento con eliminación en cascada controlada.
   Elimina EVENTO + INGRESOS + COMPRAS/DONACIONES + imágenes de tickets.
   No elimina PERSONAS, TIENDAS ni PRODUCTOS generales. */
(function(){
  'use strict';
  const INSTALLED = '__ceEventDeleteCascadeV336';
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
    try{ if(typeof window.render === 'function'){ window.render(); return; } }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(_){ }
  }
  function eventById(id){ return (st().eventos || []).find(e => String(e.id || '') === String(id || '')) || null; }
  function countTicketImages(eventId){
    const imgs = st().ticketImages || {};
    return Object.keys(imgs).filter(k => String(k).startsWith(String(eventId) + '|')).length;
  }
  function deleteTicketImages(eventId){
    const imgs = st().ticketImages || {};
    Object.keys(imgs).forEach(k => { if(String(k).startsWith(String(eventId) + '|')) delete imgs[k]; });
  }
  function handleDelete(button, event){
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
      '• Imágenes de tickets del evento: ' + ticketImgs,
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

    state.eventos = (state.eventos || []).filter(e => String(e.id || '') !== String(eventId));
    state.colaboradores = (state.colaboradores || []).filter(c => String(c.eventId || '') !== String(eventId));
    state.compras = (state.compras || []).filter(c => String(c.eventId || '') !== String(eventId));
    deleteTicketImages(eventId);
    if(String(state.selectedEventId || '') === String(eventId)) state.selectedEventId = state.eventos?.[0]?.id || '';
    save();
    redraw();
  }

  document.addEventListener('click', function(event){
    const button = event.target?.closest?.('button[data-action="delete-evento"]');
    if(button) handleDelete(button, event);
  }, true);
})();
