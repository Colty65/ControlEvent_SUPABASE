/* ControlEvent v8.5_prod FIX33 - COMPRAS RPC desde HEAD
   Objetivo: que COMPRAS tenga un único camino efectivo de escritura en pantalla real.
   Se carga ANTES del CRUD raíz antiguo para interceptar primero:
     Añadir compra    -> POST /api/crud/compras
     Modificar compra -> PUT  /api/crud/compras/:id
     Eliminar compra  -> DELETE /api/crud/compras/:id
   Tras borrar, se quita la fila de memoria y del DOM aunque algún render legacy conserve copia vieja.
*/
(function(){
  'use strict';
  const TAG='__ceV85ComprasRpcHeadFix33';
  if(window[TAG]) return; window[TAG]=true;
  const LOG='[CE FIX33 COMPRAS RPC HEAD]';
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
    const wrap=$('comprasList');
    if(wrap && !wrap.querySelector('.itemcard')){
      const hint=wrap.querySelector('.hint')?.outerHTML || '<div class="hint">Ordenar por: Producto · Ticket · Tienda · Responsable</div>';
      wrap.innerHTML = hint + '<div class="empty">Todavía no hay compras u otros gastos para este evento.</div>';
    }
  }
  function renderAndScrub(){
    try{ if(typeof render==='function') render(); }catch(err){ console.warn(LOG,'render falló',err); }
    scrubDeletedFromDom();
    setTimeout(scrubDeletedFromDom, 0);
    setTimeout(scrubDeletedFromDom, 100);
    setTimeout(scrubDeletedFromDom, 400);
  }
  function flashRow(id, cls){
    setTimeout(()=>{
      const card=cardForId(id); if(!card) return;
      card.classList.add(cls||'ce-crud-flash');
      setTimeout(()=>card.classList.remove(cls||'ce-crud-flash'), 1800);
    }, 50);
  }
  async function syncStateNoRender(){
    try{
      const fresh=await apiJson('/api/state?fix33=1&_='+Date.now(), {method:'GET', headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}});
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
  function resetAdd(){
    ['buyProducto','buyTienda','buyResponsable'].forEach(id=>setElVal(id,''));
    setElVal('buyUnidades','1.00'); setElVal('buyPrecio','0,00 €'); setElVal('buyTicket','');
  }
  async function addCompra(){
    const payload=addPayload(); validate(payload,'añadir');
    const data=await apiJson('/api/crud/compras', {method:'POST', headers:headers(), body:JSON.stringify({...payload,__crudRowOnly:true})});
    const item=normalizeItem(data?.item,payload); replaceCompraLocal(item); resetAdd();
    await syncStateNoRender(); renderAndScrub(); flashRow(item.id,'ce-crud-flash-add');
  }
  async function saveCompra(id){
    const payload=rowPayload(id); validate(payload,'modificar');
    const data=await apiJson('/api/crud/compras/'+encodeURIComponent(id), {method:'PUT', headers:headers(), body:JSON.stringify({...payload,__crudRowOnly:true})});
    const item=normalizeItem(data?.item,payload); replaceCompraLocal(item);
    await syncStateNoRender(); renderAndScrub(); flashRow(id,'ce-crud-flash-update');
  }
  async function deleteCompra(id, btn){
    const payload=rowPayload(id); validate(payload,'eliminar');
    if(!confirm('¿Eliminar esta línea de compra en BBDD?')) return;
    if(btn){ btn.disabled=true; btn.textContent='Eliminando...'; }
    const card=btn?.closest?.('.itemcard') || cardForId(id);
    if(card) card.classList.add('ce-crud-deleting');
    await apiJson('/api/crud/compras/'+encodeURIComponent(id), {method:'DELETE', headers:headers(), body:JSON.stringify({...payload,__crudRowOnly:true})});
    deletedIds.add(text(id));
    removeCompraLocal(id);
    if(card){ setTimeout(()=>{ try{ card.remove(); }catch(_){ } }, 120); }
    scrubDeletedFromDom();
    await syncStateNoRender();
    renderAndScrub();
  }
  function action(ev){
    const btn=ev.target?.closest?.('button'); if(!btn) return null;
    const a=btn.dataset?.action||'';
    if(btn.id==='btnAddCompra') return {type:'add', btn};
    if(a==='save-compra') return {type:'save', id:btn.dataset.id||'', btn};
    if(a==='delete-compra') return {type:'delete', id:btn.dataset.id||'', btn};
    return null;
  }
  async function handleClick(ev){
    const info=action(ev); if(!info) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    if(busy) return false;
    busy=true;
    try{
      if(info.type==='add') await addCompra();
      else if(info.type==='save') await saveCompra(info.id);
      else if(info.type==='delete') await deleteCompra(info.id, info.btn);
    }catch(err){
      console.error(LOG, err);
      alert(err?.message || String(err));
      try{ if(info.btn){ info.btn.disabled=false; if(info.type==='delete') info.btn.textContent='Eliminar'; }}catch(_){ }
      document.querySelectorAll('.ce-crud-deleting').forEach(el=>el.classList.remove('ce-crud-deleting'));
    }finally{ busy=false; }
    return false;
  }

  window.addEventListener('click', handleClick, true);
  document.addEventListener('DOMContentLoaded', ()=>{
    const wrap=$('comprasList');
    if(wrap && window.MutationObserver){
      const mo=new MutationObserver(()=>scrubDeletedFromDom());
      mo.observe(wrap,{childList:true,subtree:true});
    }
  });
  const style=document.createElement('style');
  style.textContent=`
    .ce-crud-deleting{ opacity:.28; transform:scale(.995); transition:opacity .15s ease, transform .15s ease; pointer-events:none; }
    .ce-crud-flash-add{ outline:3px solid #22c55e !important; box-shadow:0 0 0 4px rgba(34,197,94,.16) !important; }
    .ce-crud-flash-update{ outline:3px solid #0ea5e9 !important; box-shadow:0 0 0 4px rgba(14,165,233,.16) !important; }
  `;
  try{ document.head.appendChild(style); }catch(_){ }
  console.info(LOG,'activo en HEAD: intercepta COMPRAS antes de parches antiguos');
})();
