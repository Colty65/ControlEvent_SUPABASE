/* ControlEvent v8.5_prod FIX39 - COMPRAS RPC + CORRECCION CONTROLADA
   Objetivo: que COMPRAS tenga un único camino efectivo de escritura en pantalla real.
   Se carga ANTES del CRUD raíz antiguo para interceptar primero:
     Añadir compra    -> POST /api/crud/compras
     Modificar compra -> PUT  /api/crud/compras/:id
     Eliminar compra  -> DELETE /api/crud/compras/:id
   Tras borrar, se quita la fila de memoria y del DOM aunque algún render legacy conserve copia vieja.
*/
(function(){
  'use strict';
  const TAG='__ceV85ComprasRpcHeadFix39';
  if(window[TAG]) return; window[TAG]=true;
  const LOG='[CE FIX39 COMPRAS RPC HEAD]';
  const WRITE_SCOPE='row-crud-v8-5-compras-directo';
  const deletedIds = new Set();
  let busy=false;

  function text(v){ return String(v ?? '').trim(); }
  function css(v){ try{return CSS.escape(String(v));}catch(_){return String(v).replace(/"/g,'\\"');} }
  function $(id){ return document.getElementById(id); }
  function num(v){
    if(typeof v==='number') return Number.isFinite(v)?v:0;
    let s=String(v??'').replace(/€/g,'').replace(/\s/g,'').trim();
    if(!s) return 0;
    const c=s.lastIndexOf(','), d=s.lastIndexOf('.');
    if(c!==-1 && d!==-1){ s = c>d ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,''); }
    else if(c!==-1){ s=s.replace(/\./g,'').replace(',', '.'); }
    else { s=s.replace(/,/g,''); }
    const n=Number(s); return Number.isFinite(n)?n:0;
  }
  function uid(){
    try{ const v=Function('return (typeof uid==="function")?uid():null')(); if(v) return v; }catch(_){ }
    return 'id-'+Math.random().toString(36).slice(2)+Date.now().toString(36);
  }
  function stateObj(){
    try{ const s=Function('return (typeof state!=="undefined")?state:null')(); if(s) return s; }catch(_){ }
    if(!window.state) window.state={}; return window.state;
  }
  function authObj(){ try{return Function('return (typeof authUser!=="undefined")?authUser:null')();}catch(_){return window.authUser||null;} }
  function canWrite(){ const u=authObj(); return !!u && ['GD','RW'].includes(text(u.nivel).toUpperCase()); }
  function selectedEventId(){
    try{ const ev=Function('return (typeof selectedEvent==="function")?selectedEvent():null')(); if(ev?.id) return text(ev.id); }catch(_){ }
    return text(stateObj().selectedEventId);
  }
  function selectedEvent(){
    const s=stateObj(), id=selectedEventId();
    try{ const ev=Function('return (typeof selectedEvent==="function")?selectedEvent():null')(); if(ev?.id) return ev; }catch(_){ }
    return (Array.isArray(s.eventos)?s.eventos:[]).find(e=>text(e.id)===id)||null;
  }
  function isFinalizado(){ return text(selectedEvent()?.situacion).toLowerCase()==='finalizado'; }
  function arr(name){ const s=stateObj(); if(!Array.isArray(s[name])) s[name]=[]; return s[name]; }
  function productById(id){ return arr('productos').find(p=>text(p.id)===text(id))||{}; }
  function compraById(id){ return arr('compras').find(c=>text(c.id)===text(id))||null; }
  function val(action,id,fallback=''){
    const el=document.querySelector(`[data-action="${action}"][data-id="${css(id)}"]`);
    return el ? String(el.value ?? '') : String(fallback ?? '');
  }
  function elVal(id,fallback=''){ const el=$(id); return el ? String(el.value ?? '') : String(fallback ?? ''); }
  function setElVal(id,value){ const el=$(id); if(el) el.value=value; }
  function headers(){ return {'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE,'X-ControlEvent-Row-Only':'1'}; }
  async function apiJson(url, init){
    const res=await fetch(url, {cache:'no-store', ...(init||{})});
    const data=await res.json().catch(async()=>({error:await res.text().catch(()=>res.statusText)}));
    if(!res.ok || data?.ok===false){ throw new Error(data?.error || data?.message || ('HTTP '+res.status+' '+url)); }
    return data;
  }

  function isCorrectionRequired(err){
    return /CE_CORRECCION_REQUERIDA/i.test(String(err?.message || err || ''));
  }
  async function openComprasCorrection(reason){
    const evId = selectedEventId();
    if(!evId) throw new Error('No hay evento seleccionado para abrir corrección de COMPRAS.');
    const ev = selectedEvent();
    const msg = 'Este evento ya estuvo FINALIZADO. Por seguridad no basta con ponerlo En curso.\n\n¿Autorizar corrección temporal de COMPRAS durante 30 minutos para este evento?\n\nEvento: ' + (ev?.titulo || evId);
    if(!confirm(msg)) throw new Error('Operación cancelada: no se autorizó la corrección temporal de COMPRAS.');
    return apiJson('/api/crud/eventos/'+encodeURIComponent(evId)+'/correccion-compras', {
      method:'POST', headers:headers(), body:JSON.stringify({minutes:30, reason:reason||'Corrección manual de COMPRAS', __crudRowOnly:true})
    });
  }
  async function apiJsonCompraWithCorrection(url, init, reason){
    try{ return await apiJson(url, init); }
    catch(err){
      if(!isCorrectionRequired(err)) throw err;
      await openComprasCorrection(reason);
      return apiJson(url, init);
    }
  }
  function validate(payload, action){
    if(!canWrite()) throw new Error('Usuario sin permiso de escritura en COMPRAS.');
    if(isFinalizado()) throw new Error('Evento Finalizado: no se permite '+action+' compras. Cambia antes la situación a En curso.');
    if(!payload.eventId) throw new Error('No hay evento seleccionado.');
    if(action!=='eliminar' && !payload.productoId) throw new Error('Falta producto.');
  }
  function rowPayload(id){
    const old=compraById(id)||{};
    const productoId=text(val('edit-compra-producto',id,old.productoId||''));
    const p=productById(productoId);
    const rawPrecio=val('edit-compra-precio',id,'');
    return {
      id:text(id),
      eventId:text(old.eventId||selectedEventId()),
      productoId,
      unidades:num(val('edit-compra-unidades',id,old.unidades||0)),
      precio: rawPrecio!=='' ? num(rawPrecio) : num(old.precio ?? old.precioCalc ?? p.precio ?? p.defaultPrecio ?? 0),
      ticketDonacion:text(val('edit-compra-ticket',id,old.ticketDonacion||'')),
      donorRef:text(val('edit-compra-donante',id,old.donorRef||'')),
      tiendaId:text(val('edit-compra-tienda',id,old.tiendaId||p.tiendaId||p.defaultTiendaId||'')),
      responsableId:text(val('edit-compra-responsable',id,old.responsableId||''))
    };
  }
  function addPayload(){
    const productoId=text(elVal('buyProducto',''));
    const p=productById(productoId);
    return {
      id:uid(),
      eventId:selectedEventId(),
      productoId,
      unidades:num(elVal('buyUnidades','0')),
      precio:num(elVal('buyPrecio',p.precio??p.defaultPrecio??0)),
      ticketDonacion:text(elVal('buyTicket','')),
      donorRef:'',
      tiendaId:text(elVal('buyTienda',p.tiendaId||p.defaultTiendaId||'')),
      responsableId:text(elVal('buyResponsable',''))
    };
  }
  function normalizeItem(item, fallback){
    return {
      ...(fallback||{}),
      ...(item||{}),
      id:text(item?.id ?? fallback?.id),
      eventId:text(item?.eventId ?? item?.event_id ?? fallback?.eventId),
      productoId:text(item?.productoId ?? item?.producto_id ?? fallback?.productoId),
      unidades:num(item?.unidades ?? fallback?.unidades),
      precio:num(item?.precio ?? fallback?.precio),
      ticketDonacion:text(item?.ticketDonacion ?? item?.ticket_donacion ?? fallback?.ticketDonacion),
      donorRef:text(item?.donorRef ?? item?.donor_ref ?? fallback?.donorRef),
      tiendaId:text(item?.tiendaId ?? item?.tienda_id ?? fallback?.tiendaId),
      responsableId:text(item?.responsableId ?? item?.responsable_id ?? fallback?.responsableId)
    };
  }
  function replaceCompraLocal(row){
    const s=stateObj(); const list=arr('compras');
    const idx=list.findIndex(c=>text(c.id)===text(row.id));
    if(idx>=0) list[idx]={...list[idx],...row}; else list.push(row);
    s.compras=list;
    try{ window.state=s; }catch(_){ }
    try{ Function('s','state=s;')(s); }catch(_){ }
  }
  function removeCompraLocal(id){
    const s=stateObj();
    s.compras=arr('compras').filter(c=>text(c.id)!==text(id));
    try{ window.state=s; }catch(_){ }
    try{ Function('s','state=s;')(s); }catch(_){ }
    try{ if(typeof persistStateLocal==='function') persistStateLocal(); }catch(_){ }
  }
  function cardForId(id){
    const el=document.querySelector(`[data-action="delete-compra"][data-id="${css(id)}"], [data-action="save-compra"][data-id="${css(id)}"]`);
    return el?.closest?.('.itemcard') || null;
  }
  function scrubDeletedFromDom(){
    if(!deletedIds.size) return;
    deletedIds.forEach(id=>{
      document.querySelectorAll(`[data-id="${css(id)}"]`).forEach(el=>{
        const card=el.closest?.('.itemcard');
        if(card) card.remove();
      });
    });
    // Importante: no reescribir comprasList en cada mutación. En FIX34 eso podía
    // provocar bucles de MutationObserver y dejar la interfaz aparentemente inactiva.
    const wrap=$('comprasList');
    if(wrap && !wrap.querySelector('.itemcard') && !wrap.querySelector('.empty')){
      const empty=document.createElement('div');
      empty.className='empty';
      empty.textContent='Todavía no hay compras u otros gastos para este evento.';
      wrap.appendChild(empty);
    }
  }
  function withNoStateWrites(fn){
    const oldSave = window.saveState;
    const oldPush = window.pushStateToServer;
    const oldFetch = window.fetch;
    const localOk = function(){ try{ if(typeof persistStateLocal==='function') persistStateLocal(); }catch(_){} return Promise.resolve({ok:true, localOnly:true, fix:'FIX39'}); };
    try{
      window.saveState = localOk;
      window.pushStateToServer = localOk;
      if(typeof oldFetch === 'function'){
        window.fetch = function(input, init){
          const url = String(typeof input==='string' ? input : (input && input.url) || '');
          const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
          if(method === 'PUT' && /\/api\/state(?:$|\?)/i.test(url)){
            return Promise.resolve(new Response(JSON.stringify({ok:true, localOnly:true, blockedBy:'FIX39_RENDER'}), {status:200, headers:{'Content-Type':'application/json'}}));
          }
          return oldFetch.apply(this, arguments);
        };
      }
      return fn();
    }finally{
      try{ window.saveState = oldSave; }catch(_){}
      try{ window.pushStateToServer = oldPush; }catch(_){}
      try{ window.fetch = oldFetch; }catch(_){}
    }
  }
  function renderAndScrub(){
    // Render completo solo para recalcular saldos/listados con memoria ya sincronizada.
    // Durante este render, cualquier PUT /api/state legacy se responde local-only.
    try{ withNoStateWrites(()=>{ if(typeof render==='function') render(); }); }catch(err){ console.warn(LOG,'render falló',err); }
    scrubDeletedFromDom();
    setTimeout(scrubDeletedFromDom, 0);
    setTimeout(scrubDeletedFromDom, 100);
    setTimeout(scrubDeletedFromDom, 400);
    setTimeout(scrubDeletedFromDom, 1000);
    setTimeout(scrubDeletedFromDom, 2500);
  }
  function flashRow(id, cls){
    setTimeout(()=>{
      const card=cardForId(id); if(!card) return;
      card.classList.add(cls||'ce-crud-flash');
      setTimeout(()=>card.classList.remove(cls||'ce-crud-flash'), 12000);
    }, 50);
  }
  function unlockUi(){
    // Desbloqueo fuerte: tras la baja no debe quedar ninguna capa/estado legacy
    // impidiendo navegar a otro menú o cambiar de evento.
    busy=false;
    const removeBusyFrom = (el)=>{
      if(!el) return;
      try{ el.removeAttribute('inert'); }catch(_){}
      try{ el.removeAttribute('aria-busy'); }catch(_){}
      try{ el.removeAttribute('aria-disabled'); }catch(_){}
      try{ el.style.removeProperty('pointer-events'); el.style.removeProperty('filter'); el.style.removeProperty('opacity'); }catch(_){}
      try{ el.classList.remove('locked','ce-crud-deleting','ce-v46-deleting','ce-crud-ui-busy','ce-v447-switching','ce-v447-login-loading'); }catch(_){}
    };
    try{
      [document.documentElement, document.body, document.querySelector('.app'), document.querySelector('.main'), $('mainTabs'), $('selectedEvent')].forEach(removeBusyFrom);
      document.querySelectorAll('.locked,.app-lockable.locked,.ce-crud-deleting,.ce-v46-deleting,.ce-crud-ui-busy,[inert],[aria-busy="true"]').forEach(removeBusyFrom);
      document.querySelectorAll('#mainTabs button,.tab,#selectedEvent,#btnSoftRefresh,#btnLogout,#tabComprasBtn,#tabIngresosBtn,#tabDonacionesBtn,#tabResumenBtn,#tabGraficasBtn,#tabMapaBtn,#tabDocumentosBtn').forEach(el=>{
        removeBusyFrom(el);
        try{ if(el.id !== 'tabPlanificacionBtn') el.disabled=false; }catch(_){}
      });
      if(authObj()){
        document.body.classList.remove(
          'auth-locked','ce-locked','ce-busy','ce-crud-ui-busy',
          'ce-v447-switching','ce-v447-login-loading',
          'ce-logged-out-v507','ce-logged-out-v508','ce-logged-out-v509',
          'ce-v5011-logged-out','ce-v5013-logged-out','ce-v506-logged-out'
        );
      }
    }catch(err){ console.warn(LOG,'unlockUi fuerte falló parcialmente',err); }
  }
  function unlockUiRepeated(){
    unlockUi();
    [0,80,250,600,1200].forEach(ms=>setTimeout(unlockUi,ms));
  }
  function callGlobal(name){
    try{
      const fn = Function('return (typeof '+name+'===\"function\")?'+name+':null')();
      if(typeof fn === 'function') return fn();
    }catch(err){ console.warn(LOG,'falló '+name,err); }
    try{
      const fn = window[name];
      if(typeof fn === 'function') return fn();
    }catch(err){ console.warn(LOG,'falló window.'+name,err); }
  }
  function renderCompraViewsFull(opts){
    opts = opts || {};
    try{
      const s = stateObj();
      deletedIds.forEach(id=>{
        s.compras = (Array.isArray(s.compras)?s.compras:[]).filter(c=>text(c.id)!==text(id));
      });
    }catch(_){}
    // Primero render completo protegido para que se recalcule TODO: saldos, resumen, gráficas y compras.
    // Después repasamos módulos concretos por si la app los mantiene separados.
    renderAndScrub();
    callGlobal('renderBudget');
    callGlobal('renderCompras');
    callGlobal('renderDonaciones');
    callGlobal('renderGraficas');
    scrubDeletedFromDom();
    if(opts.flashId && opts.flashClass) flashRow(opts.flashId, opts.flashClass);
    unlockUiRepeated();
  }
  function refreshCompraViewsLight(){
    renderCompraViewsFull();
    setTimeout(()=>renderCompraViewsFull(), 80);
  }
  async function syncStateNoRender(){
    try{
      const fresh=await apiJson('/api/state?fix39=1&_='+Date.now(), {method:'GET', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
      const s=stateObj(); const keep=s.selectedEventId;
      ['eventos','personas','tiendas','productos','colaboradores','compras','ticketImages','ticketImageRefs','eventDocuments','eventCodeMap','entityCodeMaps'].forEach(k=>{
        if(Object.prototype.hasOwnProperty.call(fresh,k)) s[k]=fresh[k];
      });
      if(keep) s.selectedEventId=keep;
      deletedIds.forEach(id=>{ s.compras=(Array.isArray(s.compras)?s.compras:[]).filter(c=>text(c.id)!==text(id)); });
      try{ Function('s','state=s;')(s); }catch(_){ }
      try{ window.state=s; }catch(_){ }
    }catch(err){ console.warn(LOG,'No se pudo sincronizar /api/state tras operación',err); }
  }
  function eventById(id){ return arr('eventos').find(e=>text(e.id)===text(id))||null; }
  function eventSituationFromForm(id){
    const el=document.querySelector(`[data-action="edit-evento-situacion"][data-id="${css(id)}"], [data-action="save-evento"][data-id="${css(id)}"]`);
    const direct=document.querySelector(`[data-action="edit-evento-situacion"][data-id="${css(id)}"]`);
    if(direct) return text(direct.value);
    const byName=document.querySelector(`select[data-id="${css(id)}"][data-action*="situacion"], select[data-id="${css(id)}"][name*="situacion" i]`);
    if(byName) return text(byName.value);
    const card=document.querySelector(`[data-action="save-evento"][data-id="${css(id)}"]`)?.closest?.('.itemcard');
    const sel=card?.querySelector?.('select');
    return text(sel?.value || eventById(id)?.situacion || 'En curso');
  }
  async function updateEventoSituacion(id){
    if(!id) throw new Error('Falta id de evento para cambiar situación.');
    if(!authObj() || text(authObj().nivel).toUpperCase()!=='GD') throw new Error('Solo GD puede cambiar la situación del evento.');
    const old=eventById(id);
    const next=eventSituationFromForm(id);
    if(!next) throw new Error('Falta situación del evento.');
    if(old && text(old.situacion)===next){
      // No hay cambio real: evitamos que un handler legacy intente insertar/upsert de ce_eventos.
      return {ok:true, noChange:true};
    }
    const data=await apiJson('/api/crud/eventos/'+encodeURIComponent(id)+'/situacion', {
      method:'PUT', headers:headers(), body:JSON.stringify({situacion:next,__crudRowOnly:true})
    });
    if(old) old.situacion=next;
    await syncStateNoRender();
    if(next === 'Finalizado'){
      // Decisión drástica: al finalizar se cierran permisos de corrección en SQL
      // y se recarga la app. No se deja ningún render legacy vivo con memoria vieja.
      try{ sessionStorage.setItem('ce_fix39_restore_event', id); sessionStorage.setItem('ce_fix39_restore_tab', 'resumen'); }catch(_){ }
      toast('Evento Finalizado en BBDD. Recargando datos reales...');
      setTimeout(()=>{ try{ window.location.reload(); }catch(_){ window.location.href=window.location.href; } }, 650);
      return data;
    }
    renderCompraViewsFull();
    if(old && text(old.situacion)==='Finalizado' && next==='En curso'){
      alert('Evento abierto en En curso. Por seguridad, COMPRAS de un evento ya finalizado siguen bloqueadas hasta autorizar corrección temporal cuando intentes añadir/modificar/eliminar.');
    }
    return data;
  }


  function storageKey(){ try{ return typeof STORAGE_KEY !== 'undefined' ? STORAGE_KEY : 'controlevent_v6_4'; }catch(_){ return 'controlevent_v6_4'; } }
  function persistLocalNow(){
    try{ localStorage.setItem(storageKey(), JSON.stringify(stateObj())); }catch(err){ console.warn(LOG,'No se pudo persistir localStorage antes de recargar',err); }
  }
  function toast(msg){
    // v9.5.1: sin avisos flotantes negros; solo consola para depuración.
    try{ console.info(LOG || '[ControlEvent v11_3_1_prod]', msg); }catch(_){}
  }
  function reloadAfterDelete(id){
    // FIX39: dejamos de confiar en repintados parciales legacy.
    // Tras confirmar DELETE en BBDD, se guarda en local la foto actual del estado
    // sin la compra y se recarga la app. Es el equivalente automático a lo que
    // el usuario hacía manualmente cambiando de evento para ver la realidad.
    try{ sessionStorage.setItem('ce_fix39_restore_event', selectedEventId()); }catch(_){ }
    try{ sessionStorage.setItem('ce_fix39_restore_tab', 'compras'); }catch(_){ }
    try{ sessionStorage.setItem('ce_fix39_deleted_compra', String(id||'')); }catch(_){ }
    persistLocalNow();
    toast('Compra eliminada en BBDD. Recargando datos reales...');
    setTimeout(()=>{
      try{ window.location.reload(); }
      catch(_){ window.location.href = window.location.href; }
    }, 650);
  }
  function restoreAfterReload(){
    const evId = (()=>{ try{return sessionStorage.getItem('ce_fix39_restore_event')||'';}catch(_){return '';} })();
    const tab = (()=>{ try{return sessionStorage.getItem('ce_fix39_restore_tab')||'';}catch(_){return '';} })();
    if(!evId && !tab) return;
    try{ sessionStorage.removeItem('ce_fix39_restore_event'); sessionStorage.removeItem('ce_fix39_restore_tab'); }catch(_){ }
    const apply=()=>{
      try{
        const s=stateObj();
        if(evId && Array.isArray(s.eventos) && s.eventos.some(e=>String(e.id)===String(evId))){ s.selectedEventId=evId; }
        if(tab){ try{ currentMainTab=tab; }catch(_){ } }
        persistLocalNow();
        withNoStateWrites(()=>{ try{ if(typeof render==='function') render(); }catch(err){ console.warn(LOG,'render restore falló',err); } });
        if(tab==='compras') callGlobal('renderCompras');
        callGlobal('renderBudget');
        callGlobal('renderGraficas');
        unlockUiRepeated();
      }catch(err){ console.warn(LOG,'restoreAfterReload falló',err); }
    };
    setTimeout(apply, 250);
    setTimeout(apply, 900);
  }

  // Anulamos el inline onclick legacy de los botones de EVENTOS.
  // En mantenimiento de eventos solo permitimos cambiar situación por RPC.
  try{
    window.saveEventRecord = function(id){
      updateEventoSituacion(id).catch(err=>{ console.error(LOG,err); alert(err?.message||String(err)); });
      return false;
    };
  }catch(_){ }
  function resetAdd(){
    ['buyProducto','buyTienda','buyResponsable'].forEach(id=>setElVal(id,''));
    setElVal('buyUnidades','1.00'); setElVal('buyPrecio','0,00 €'); setElVal('buyTicket','');
  }
  async function addCompra(){
    const payload=addPayload(); validate(payload,'añadir');
    const data=await apiJsonCompraWithCorrection('/api/crud/compras', {method:'POST', headers:headers(), body:JSON.stringify({...payload,__crudRowOnly:true})}, 'Alta de compra');
    const item=normalizeItem(data?.item,payload); replaceCompraLocal(item); resetAdd();
    await syncStateNoRender();
    renderCompraViewsFull({flashId:item.id, flashClass:'ce-crud-flash-add'});
  }
  async function saveCompra(id){
    const payload=rowPayload(id); validate(payload,'modificar');
    const data=await apiJsonCompraWithCorrection('/api/crud/compras/'+encodeURIComponent(id), {method:'PUT', headers:headers(), body:JSON.stringify({...payload,__crudRowOnly:true})}, 'Modificación de compra');
    const item=normalizeItem(data?.item,payload); replaceCompraLocal(item);
    await syncStateNoRender();
    renderCompraViewsFull({flashId:id, flashClass:'ce-crud-flash-update'});
  }
  async function deleteCompra(id, btn){
    const payload=rowPayload(id); validate(payload,'eliminar');
    if(!confirm('¿Eliminar esta línea de compra en BBDD?')){ unlockUiRepeated(); return; }
    const oldTxt = btn ? btn.textContent : '';
    const card=btn?.closest?.('.itemcard') || cardForId(id);
    try{
      if(btn){ btn.disabled=true; btn.textContent='Eliminando...'; btn.setAttribute('data-ce-crud-busy','1'); }
      if(card) card.classList.add('ce-crud-deleting');
      await apiJsonCompraWithCorrection('/api/crud/compras/'+encodeURIComponent(id), {
        method:'DELETE', headers:headers(), body:JSON.stringify({...payload,__crudRowOnly:true})
      }, 'Baja de compra');

      // Confirmado por BBDD: actualizamos local y hacemos recarga determinista.
      // Ya no dependemos de 5 renders parciales distintos: la recarga reconstruye
      // COMPRAS, RESUMEN, GRAFICAS y saldos desde /api/state/localStorage limpio.
      deletedIds.add(text(id));
      removeCompraLocal(id);
      if(card) card.classList.add('ce-crud-deleted');
      try{ await syncStateNoRender(); }catch(err){ console.warn(LOG,'sync posterior a baja falló',err); }
      removeCompraLocal(id);
      scrubDeletedFromDom();
      unlockUiRepeated();
      reloadAfterDelete(id);
      return;
    }finally{
      if(btn && document.body.contains(btn)){
        btn.disabled=false;
        btn.textContent=oldTxt || 'Eliminar';
        btn.removeAttribute('data-ce-crud-busy');
      }
      unlockUiRepeated();
    }
  }
  function action(ev){
    const btn=ev.target?.closest?.('button'); if(!btn) return null;
    const a=btn.dataset?.action||'';
    if(btn.id==='btnAddCompra') return {type:'add', btn};
    if(a==='save-compra') return {type:'save', id:btn.dataset.id||'', btn};
    if(a==='delete-compra') return {type:'delete', id:btn.dataset.id||'', btn};
    if(a==='save-evento') return {type:'event-situacion', id:btn.dataset.id||'', btn};
    return null;
  }
  async function handleClick(ev){
    const info=action(ev); if(!info) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    if(info.type==='delete' && deletedIds.has(text(info.id))){
      scrubDeletedFromDom();
      renderCompraViewsFull();
      return false;
    }
    if(busy) return false;
    busy=true;
    try{
      if(info.type==='add') await addCompra();
      else if(info.type==='save') await saveCompra(info.id);
      else if(info.type==='delete') await deleteCompra(info.id, info.btn);
      else if(info.type==='event-situacion') await updateEventoSituacion(info.id);
    }catch(err){
      console.error(LOG, err);
      alert(err?.message || String(err));
      try{ if(info.btn){ info.btn.disabled=false; if(info.type==='delete') info.btn.textContent='Eliminar'; }}catch(_){ }
      document.querySelectorAll('.ce-crud-deleting').forEach(el=>el.classList.remove('ce-crud-deleting'));
    }finally{ busy=false; unlockUiRepeated(); }
    return false;
  }

  window.addEventListener('click', handleClick, true);
  document.addEventListener('DOMContentLoaded', ()=>{
    // Sin MutationObserver continuo: evitamos bucles de repintado tras baja.
    setTimeout(scrubDeletedFromDom, 250);
    setTimeout(restoreAfterReload, 350);
  });
  const style=document.createElement('style');
  style.textContent=`
    .ce-crud-deleting{ opacity:.42; transform:scale(.995); transition:opacity .22s ease, transform .22s ease; pointer-events:none; }
    .ce-crud-deleted{ opacity:0!important; transform:scale(.985)!important; transition:opacity .26s ease, transform .26s ease!important; }
    .ce-crud-flash-add{ animation:ceCrudPulseFix38 1.1s ease-in-out 0s 7 alternate; outline:4px solid #22c55e !important; box-shadow:0 0 0 6px rgba(34,197,94,.22) !important; font-weight:900!important; transition:outline .25s ease, box-shadow .25s ease; }
    .ce-crud-flash-update{ animation:ceCrudPulseFix38 1.1s ease-in-out 0s 7 alternate; outline:4px solid #0ea5e9 !important; box-shadow:0 0 0 6px rgba(14,165,233,.22) !important; font-weight:900!important; transition:outline .25s ease, box-shadow .25s ease; }
    .ce-crud-flash-add input,.ce-crud-flash-add select,.ce-crud-flash-update input,.ce-crud-flash-update select{font-weight:900!important;background:#fff7cc!important;}

    @keyframes ceCrudPulseFix38{from{filter:saturate(1.0) brightness(1)}to{filter:saturate(1.18) brightness(1.06)}}
  `;
  try{ document.head.appendChild(style); }catch(_){ }
  // La siguiente interacción de navegación limpia posibles restos de bloqueo legacy.
  window.addEventListener('pointerdown', (ev)=>{
    const nav=ev.target?.closest?.('#mainTabs button,#selectedEvent,#btnSoftRefresh,#btnLogout,.tab');
    if(nav) unlockUiRepeated();
  }, true);
  console.info(LOG,'activo en HEAD: COMPRAS RPC FIX39 con corrección controlada y finalización con recarga');
})();
