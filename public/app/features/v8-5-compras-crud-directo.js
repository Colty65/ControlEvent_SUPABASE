/* ControlEvent v8.5_prod - COMPRAS CRUD directo fila-a-fila
   Regla: las acciones de COMPRAS escriben en BBDD en ese mismo momento.
   - Añadir compra    -> POST   /api/crud/compras
   - Modificar compra -> PUT    /api/crud/compras/:id
   - Eliminar compra  -> DELETE /api/crud/compras/:id
   No usa saveState ni pushStateToServer. */
(function(){
  'use strict';

  const WRITE_SCOPE = 'row-crud-v8-5-compras-directo';
  const LOG = '[CE v8.5 compras CRUD directo]';
  let busy = false;

  function $(id){ return document.getElementById(id); }
  function txt(v){ return String(v ?? '').trim(); }
  function num(v){
    if(typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s = String(v ?? '').replace(/€/g,'').replace(/\s/g,'').trim();
    if(!s) return 0;
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if(lastComma !== -1 && lastDot !== -1){
      if(lastComma > lastDot) s = s.replace(/\./g,'').replace(',', '.');
      else s = s.replace(/,/g,'');
    }else if(lastComma !== -1){
      s = s.replace(/\./g,'').replace(',', '.');
    }else{
      s = s.replace(/,/g,'');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  function uidLocal(){
    try{ if(typeof uid === 'function') return uid(); }catch(_){ }
    return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function stateRef(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    if(!window.state) window.state = {};
    return window.state;
  }
  function currentUser(){
    try{ if(typeof authUser !== 'undefined') return authUser; }catch(_){ }
    return window.authUser || window.__CONTROL_EVENT_USER__ || null;
  }
  function canWrite(){
    try{ if(typeof canWriteRole === 'function') return !!canWriteRole(); }catch(_){ }
    const lvl = txt(currentUser()?.nivel).toUpperCase();
    return lvl === 'GD' || lvl === 'RW';
  }
  function selectedId(){
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return txt(ev.id); }catch(_){ }
    return txt(stateRef().selectedEventId);
  }
  function selectedEventRow(){
    const s = stateRef();
    const id = selectedId();
    try{ const ev = typeof selectedEvent === 'function' ? selectedEvent() : null; if(ev?.id) return ev; }catch(_){ }
    return (Array.isArray(s.eventos) ? s.eventos : []).find(e => txt(e.id) === id) || null;
  }
  function isFinalizado(ev){ return txt(ev?.situacion).toLowerCase() === 'finalizado'; }
  function compraById(id){
    const s = stateRef();
    return (Array.isArray(s.compras) ? s.compras : []).find(c => txt(c.id) === txt(id)) || null;
  }
  function css(v){ try{ return CSS.escape(String(v)); }catch(_){ return String(v).replace(/"/g,'\\"'); } }
  function valueByAction(action, id){
    const el = document.querySelector(`[data-action="${action}"][data-id="${css(id)}"]`);
    return el ? el.value : '';
  }
  function productoPrecio(productoId){
    const s = stateRef();
    const p = (Array.isArray(s.productos) ? s.productos : []).find(x => txt(x.id) === txt(productoId));
    return num(p?.precio ?? p?.defaultPrecio ?? 0);
  }
  function compraPayloadFromRow(id){
    const old = compraById(id) || {};
    const productoId = valueByAction('edit-compra-producto', id) || old.productoId || '';
    const rawPrecio = valueByAction('edit-compra-precio', id);
    const payload = {
      id: txt(id),
      eventId: txt(old.eventId || selectedId()),
      productoId: txt(productoId),
      unidades: num(valueByAction('edit-compra-unidades', id) || old.unidades || 0),
      precio: rawPrecio ? num(rawPrecio) : num(old.precio ?? old.precioCalc ?? productoPrecio(productoId)),
      ticketDonacion: txt(valueByAction('edit-compra-ticket', id) || old.ticketDonacion || ''),
      donorRef: txt(valueByAction('edit-compra-donante', id) || old.donorRef || ''),
      tiendaId: txt(valueByAction('edit-compra-tienda', id) || old.tiendaId || ''),
      responsableId: txt(valueByAction('edit-compra-responsable', id) || old.responsableId || '')
    };
    return payload;
  }
  function compraPayloadFromAdd(){
    const productoId = txt($('buyProducto')?.value || '');
    return {
      id: uidLocal(),
      eventId: selectedId(),
      productoId,
      unidades: num($('buyUnidades')?.value || 0),
      precio: num($('buyPrecio')?.value || productoPrecio(productoId)),
      ticketDonacion: txt($('buyTicket')?.value || ''),
      donorRef: '',
      tiendaId: txt($('buyTienda')?.value || ''),
      responsableId: txt($('buyResponsable')?.value || '')
    };
  }
  function crudHeaders(){
    return {
      'Content-Type': 'application/json',
      'X-ControlEvent-Write-Scope': WRITE_SCOPE,
      'X-ControlEvent-Row-Only': '1'
    };
  }
  async function requestJson(url, options){
    const res = await fetch(url, { cache:'no-store', ...options });
    const data = await res.json().catch(() => ({}));
    if(!res.ok || data?.ok === false){
      const err = new Error(data?.error || data?.message || `Error HTTP ${res.status}`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }
  async function reloadStateFromDb(){
    const fresh = await requestJson('/api/state?_=' + Date.now(), { method:'GET' });
    const s = stateRef();
    Object.keys(s).forEach(k => delete s[k]);
    Object.assign(s, fresh || {});
    try{ window.state = s; }catch(_){ }
    try{ if(typeof persistStateLocal === 'function') persistStateLocal(); }catch(_){ }
    try{ if(typeof render === 'function') render(); }catch(err){ console.warn(LOG, 'render falló tras recargar', err); }
    try{ if(typeof renderCompras === 'function') renderCompras(); }catch(_){ }
    return s;
  }
  function resetAddInputs(){
    ['buyProducto','buyTienda','buyResponsable'].forEach(id => { const el=$(id); if(el) el.value=''; });
    const u=$('buyUnidades'); if(u) u.value='1.00';
    const p=$('buyPrecio'); if(p) p.value='0,00 €';
    const t=$('buyTicket'); if(t) t.value='';
  }
  function validateWritablePurchase(payload, action){
    if(!canWrite()) throw new Error('No tienes permisos RW/GD para mantener compras.');
    const ev = selectedEventRow();
    if(!payload.eventId) throw new Error('No hay evento seleccionado.');
    if(isFinalizado(ev)) throw new Error('Evento Finalizado: no se permite ' + action + ' compras. Cambia primero la situación a En curso.');
    if(!payload.productoId && action !== 'eliminar') throw new Error('Falta producto.');
  }
  async function addCompraDirecta(){
    const payload = compraPayloadFromAdd();
    validateWritablePurchase(payload, 'añadir');
    const data = await requestJson('/api/crud/compras', {
      method:'POST', headers:crudHeaders(), body: JSON.stringify({ ...payload, __crudRowOnly:true })
    });
    resetAddInputs();
    await reloadStateFromDb();
    return data;
  }
  async function saveCompraDirecta(id){
    const payload = compraPayloadFromRow(id);
    validateWritablePurchase(payload, 'modificar');
    const data = await requestJson('/api/crud/compras/' + encodeURIComponent(id), {
      method:'PUT', headers:crudHeaders(), body: JSON.stringify({ ...payload, __crudRowOnly:true })
    });
    await reloadStateFromDb();
    return data;
  }
  async function deleteCompraDirecta(id){
    const payload = compraPayloadFromRow(id);
    validateWritablePurchase(payload, 'eliminar');
    if(!confirm('¿Eliminar esta línea de compra en BBDD?')) return null;
    const data = await requestJson('/api/crud/compras/' + encodeURIComponent(id), {
      method:'DELETE', headers:crudHeaders(), body: JSON.stringify({ ...payload, __crudRowOnly:true })
    });
    const s = await reloadStateFromDb();
    const still = (Array.isArray(s.compras) ? s.compras : []).some(c => txt(c.id) === txt(id));
    if(still){
      throw new Error('La baja no ha quedado reflejada al releer BBDD. Revisa el registro antes de continuar.');
    }
    return data;
  }
  function actionFromEvent(ev){
    const btn = ev.target?.closest?.('button');
    if(!btn) return null;
    const action = btn.dataset?.action || btn.id || '';
    if(action === 'btnAddCompra') return { type:'add', id:'' };
    if(action === 'save-compra') return { type:'save', id:btn.dataset.id || '' };
    if(action === 'delete-compra') return { type:'delete', id:btn.dataset.id || '' };
    return null;
  }
  async function handle(ev){
    const info = actionFromEvent(ev);
    if(!info) return;
    ev.preventDefault();
    ev.stopPropagation();
    ev.stopImmediatePropagation();
    if(busy) return false;
    busy = true;
    try{
      if(info.type === 'add') await addCompraDirecta();
      else if(info.type === 'save') await saveCompraDirecta(info.id);
      else if(info.type === 'delete') await deleteCompraDirecta(info.id);
    }catch(err){
      console.error(LOG, err);
      alert(err?.message || 'No se pudo completar la operación de COMPRAS.');
    }finally{
      busy = false;
    }
    return false;
  }

  window.addEventListener('click', handle, true);
  // Por si algún script invoca addCompra() directamente, también se redirige a CRUD real.
  try{
    window.addCompra = function(){ addCompraDirecta().catch(err => { console.error(LOG, err); alert(err?.message || 'No se pudo añadir la compra.'); }); };
    try{ addCompra = window.addCompra; }catch(_){ }
  }catch(_){ }
  console.info(LOG, 'activo');
})();
