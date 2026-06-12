/* ControlEvent v8.5_prod FIX25 - CRUD EXPLICITO SERVIDO DESDE PUBLIC
   Regla:
   - Evento Finalizado: no se permite alta, baja, modificación ni foto.
   - Alta/modificación/baja persistente: llamada inmediata a /api/crud fila-a-fila.
   - Nada de PUT /api/state para mantenimientos ordinarios.
*/
(function(){
  'use strict';
  const TAG='__ceV85ExplicitCrudFix25';
  if(window[TAG]) return; window[TAG]=true;
  const WRITE_SCOPE='row-crud-v8-5-fix23';

  function warn(msg, extra){try{console.warn('[FIX25 CRUD]' , msg, extra||'');}catch(_){}}
  function $(id){return document.getElementById(id);}
  function getState(){try{return Function('return (typeof state!=="undefined")?state:(window.state||{})')();}catch(_){return window.state||{};}}
  function setGlobal(name, fn){try{Function('fn', name+' = fn;')(fn);}catch(_){ } try{window[name]=fn;}catch(_){}}
  function arr(name){const s=getState(); if(!Array.isArray(s[name])) s[name]=[]; return s[name];}
  function uid(){try{if(typeof window.uid==='function') return window.uid();}catch(_){ } try{return Function('return (typeof uid==="function")?uid():null')() || ('id-'+Math.random().toString(36).slice(2)+Date.now().toString(36));}catch(_){return 'id-'+Math.random().toString(36).slice(2)+Date.now().toString(36);}}
  function selectedEventId(){const s=getState(); try{if(typeof selectedEvent==='function' && selectedEvent()) return String(selectedEvent().id||'');}catch(_){ } return String(s.selectedEventId||'');}
  function eventById(id){return arr('eventos').find(e=>String(e.id||'')===String(id||''))||null;}
  function selectedEventRow(){return eventById(selectedEventId());}
  function isFinalized(ev){return String(ev?.situacion||'').trim().toLowerCase()==='finalizado';}
  function blockFinalized(ev, what){ if(isFinalized(ev)){ alert('Evento Finalizado: no se permite '+(what||'modificar')+'.'); return true; } return false; }
  function canWrite(){try{const u=Function('return (typeof authUser!=="undefined")?authUser:(window.authUser||null)')(); return !!u && ['RW','GD'].includes(String(u.nivel||'').toUpperCase());}catch(_){return false;}}
  function isGod(){try{const u=Function('return (typeof authUser!=="undefined")?authUser:(window.authUser||null)')(); return !!u && String(u.nivel||'').toUpperCase()==='GD';}catch(_){return false;}}
  function val(action,id, fallback=''){const el=document.querySelector(`[data-action="${action}"][data-id="${window.CSS&&window.CSS.escape?window.CSS.escape(String(id)):String(id).replace(/"/g,'\\"')}"]`); return el?String(el.value??''):String(fallback??'');}
  function elVal(id, fallback=''){const el=$(id); return el?String(el.value??''):String(fallback??'');}
  function num(v){const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\./g,'').replace(',','.')); return Number.isFinite(n)?n:0;}
  function money(v){try{if(typeof parseEuroInput==='function') return parseEuroInput(v);}catch(_){ } return num(v);}
  function productById(id){return arr('productos').find(p=>String(p.id||'')===String(id||''))||null;}
  function localSave(){try{const s=getState(); const key=Function('return (typeof STORAGE_KEY!=="undefined")?STORAGE_KEY:"controlevent_v6_4"')(); localStorage.setItem(key, JSON.stringify(s));}catch(_){}}
  function rerender(){localSave(); try{if(typeof render==='function') render();}catch(e){warn('render falló',e);} }
  function clearFields(ids){ids.forEach(id=>{const e=$(id); if(e) e.value='';});}
  function setVal(id,v){const e=$(id); if(e) e.value=v;}

  async function crud(method, collection, id, row){
    const url = '/api/crud/'+encodeURIComponent(collection)+(id?('/'+encodeURIComponent(id)):'');
    const init={method, headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE,'X-ControlEvent-Row-Only':'1'}};
    if(method!=='DELETE') init.body=JSON.stringify({...(row||{}),__crudRowOnly:true});
    const res=await fetch(url, init);
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok===false) throw new Error(data.error||('Error CRUD '+method+' '+collection));
    return data;
  }
  async function upsert(collection, row){return crud(row?.id?'PUT':'POST', collection, row?.id||'', row);}
  async function del(collection, id){return crud('DELETE', collection, id, null);}
  function replaceLocal(collection, row){const a=arr(collection); const i=a.findIndex(x=>String(x.id||'')===String(row.id||'')); if(i>=0) a[i]={...a[i],...row}; else a.push(row);}
  function removeLocal(collection, id){const s=getState(); s[collection]=arr(collection).filter(x=>String(x.id||'')!==String(id));}

  function rowCompraFromForm(id, donation){
    const old=arr('compras').find(x=>String(x.id||'')===String(id||''))||{};
    const prefix=donation?'donacion':'compra';
    const pId = val('edit-'+prefix+'-producto', id, old.productoId||'');
    const p = productById(pId);
    return {
      ...old,
      id:String(id),
      eventId:String(old.eventId||selectedEventId()),
      productoId:pId,
      unidades:Number(val('edit-'+prefix+'-unidades', id, old.unidades||0)||0),
      precio:money(val('edit-'+prefix+'-precio', id, old.precio ?? p?.precio ?? p?.defaultPrecio ?? 0)),
      ticketDonacion:val('edit-'+prefix+'-ticket', id, old.ticketDonacion||''),
      donorRef: donation ? val('edit-donacion-donante', id, old.donorRef||'') : val('edit-compra-donante', id, old.donorRef||''),
      responsableId:val('edit-'+prefix+'-responsable', id, old.responsableId||''),
      tiendaId: donation ? (old.tiendaId||p?.tiendaId||p?.defaultTiendaId||'') : val('edit-compra-tienda', id, old.tiendaId||p?.tiendaId||p?.defaultTiendaId||'')
    };
  }
  function rowCollabFromForm(id){const old=arr('colaboradores').find(x=>String(x.id||'')===String(id||''))||{}; return {...old,id:String(id),eventId:String(old.eventId||selectedEventId()),personaId:val('edit-collab-persona',id,old.personaId||''),numero:Number(val('edit-collab-numero',id,old.numero||0)||0),situacion:val('edit-collab-situacion',id,old.situacion||'Pendiente'),importe:money(val('edit-collab-importe',id,old.importe||0))};}
  function rowPersonaFromForm(id){const old=arr('personas').find(x=>String(x.id||'')===String(id||''))||{}; return {...old,id:String(id),nombre:val('edit-persona-nombre',id,old.nombre||'').trim(),rango:val('edit-persona-rango',id,old.rango||'SOCIO')};}
  function rowTiendaFromForm(id){const old=arr('tiendas').find(x=>String(x.id||'')===String(id||''))||{}; return {...old,id:String(id),nombre:val('edit-tienda-nombre',id,old.nombre||'').trim()};}
  function rowProductoFromForm(id){const old=arr('productos').find(x=>String(x.id||'')===String(id||''))||{}; return {...old,id:String(id),nombre:val('edit-producto-nombre',id,old.nombre||'').trim(),segmento:val('edit-producto-segmento',id,old.segmento||''),destino:val('edit-producto-destino',id,old.destino||''),precio:money(val('edit-producto-precio',id,old.precio||old.defaultPrecio||0)),defaultPrecio:money(val('edit-producto-precio',id,old.precio||old.defaultPrecio||0)),tiendaId:val('edit-producto-tienda',id,old.tiendaId||old.defaultTiendaId||''),defaultTiendaId:val('edit-producto-tienda',id,old.tiendaId||old.defaultTiendaId||'')};}
  function rowEventoFromForm(id){const old=arr('eventos').find(x=>String(x.id||'')===String(id||''))||{}; return {...old,id:String(id),titulo:val('edit-evento-titulo',id,old.titulo||'').trim(),precio:money(val('edit-evento-precio',id,old.precio||0)),fechaIni:val('edit-evento-fechaini',id,old.fechaIni||'').trim(),fechaFin:val('edit-evento-fechafin',id,old.fechaFin||'').trim(),descripcion:val('edit-evento-descripcion',id,old.descripcion||'').trim(),situacion:val('edit-evento-situacion',id,old.situacion||'En curso')};}

  async function doAddCompra(donation){
    if(!canWrite()) return; const ev=selectedEventRow(); if(!ev) return; if(blockFinalized(ev,'añadir registros')) return;
    const id=uid(); const pId=elVal(donation?'donProducto':'buyProducto'); if(!pId) return; const p=productById(pId);
    const row={id,eventId:selectedEventId(),productoId:pId,unidades:Number(elVal(donation?'donUnidades':'buyUnidades','0')||0),precio:money(elVal(donation?'donPrecio':'buyPrecio', p?.precio ?? p?.defaultPrecio ?? 0)),ticketDonacion:elVal(donation?'donTicket':'buyTicket'),donorRef:donation?elVal('donDonante'):'',responsableId:elVal(donation?'donResponsable':'buyResponsable'),tiendaId:donation?(p?.tiendaId||p?.defaultTiendaId||''):elVal('buyTienda',p?.tiendaId||p?.defaultTiendaId||'')};
    await upsert('compras',row); replaceLocal('compras',row);
    clearFields(donation?['donProducto','donDonante','donResponsable']:['buyProducto','buyTienda','buyResponsable']); setVal(donation?'donUnidades':'buyUnidades','1.00'); setVal(donation?'donPrecio':'buyPrecio','0,00 €'); if(!donation) setVal('buyTicket','');
    rerender();
  }
  async function doAddCollab(){ if(!canWrite())return; const ev=selectedEventRow(); if(!ev)return; if(blockFinalized(ev,'añadir ingresos'))return; const personaId=elVal('collabPersona'); if(!personaId)return; const row={id:uid(),eventId:selectedEventId(),personaId,numero:Number(elVal('collabNumero','0')||0),situacion:elVal('collabSituacion','Pendiente'),importe:money(elVal('collabImporte','0'))}; await upsert('colaboradores',row); replaceLocal('colaboradores',row); setVal('collabPersona',''); setVal('collabNumero','1'); setVal('collabSituacion','Pendiente'); setVal('collabImporte','0,00 €'); rerender(); }
  async function doAddEvento(){ if(!isGod())return; const titulo=elVal('newEventoTitulo').trim(); if(!titulo)return; const row={id:uid(),titulo,precio:Number(elVal('newEventoPrecio','0')||0),fechaIni:elVal('newEventoFechaIni').trim(),fechaFin:elVal('newEventoFechaFin').trim(),situacion:elVal('newEventoSituacion','En curso'),descripcion:elVal('newEventoDescripcion').trim()}; await upsert('eventos',row); replaceLocal('eventos',row); const s=getState(); if(!s.selectedEventId)s.selectedEventId=row.id; clearFields(['newEventoTitulo','newEventoFechaIni','newEventoFechaFin','newEventoDescripcion']); setVal('newEventoPrecio','0.00'); rerender(); }
  async function doAddPersona(){ if(!canWrite())return; if(blockFinalized(selectedEventRow(),'añadir personas desde un evento cerrado'))return; const nombre=elVal('newPersonaNombre').trim(); if(!nombre)return; const row={id:uid(),nombre,rango:elVal('newPersonaRango','SOCIO')}; await upsert('personas',row); replaceLocal('personas',row); setVal('newPersonaNombre',''); rerender(); }
  async function doAddTienda(){ if(!canWrite())return; if(blockFinalized(selectedEventRow(),'añadir tiendas desde un evento cerrado'))return; const nombre=elVal('newTiendaNombre').trim(); if(!nombre)return; const row={id:uid(),nombre}; await upsert('tiendas',row); replaceLocal('tiendas',row); setVal('newTiendaNombre',''); rerender(); }
  async function doAddProducto(){ if(!canWrite())return; if(blockFinalized(selectedEventRow(),'añadir productos desde un evento cerrado'))return; const nombre=elVal('newProductoNombre').trim(); if(!nombre)return; const precio=money(elVal('newProductoPrecio','0')); const row={id:uid(),nombre,segmento:elVal('newProductoSegmento'),destino:elVal('newProductoDestino'),precio,defaultPrecio:precio,tiendaId:elVal('newProductoTienda'),defaultTiendaId:elVal('newProductoTienda')}; await upsert('productos',row); replaceLocal('productos',row); setVal('newProductoNombre',''); setVal('newProductoPrecio','0,00 €'); rerender(); }

  async function handleAction(action,id){
    const ev=selectedEventRow();
    // FIX25: los datos de un evento Finalizado siguen bloqueados.
    // La única excepción es save-evento, para permitir que GD cambie explícitamente la SITUACIÓN
    // (Finalizado <-> En curso). El servidor valida que no se toquen otros campos si estaba Finalizado.
    if(action!=='save-evento' && action!=='delete-evento' && blockFinalized(ev,'mantener datos')) return;
    if(action==='save-evento'){ const row=rowEventoFromForm(id); await upsert('eventos',row); replaceLocal('eventos',row); rerender(); return; }
    if(action==='delete-evento'){ const target=eventById(id); if(blockFinalized(target,'eliminar el evento'))return; await del('eventos',id); removeLocal('eventos',id); const s=getState(); s.colaboradores=arr('colaboradores').filter(c=>String(c.eventId)!==String(id)); s.compras=arr('compras').filter(c=>String(c.eventId)!==String(id)); if(s.ticketImages) Object.keys(s.ticketImages).forEach(k=>{if(String(k).startsWith(id+'|')) delete s.ticketImages[k];}); if(s.selectedEventId===id)s.selectedEventId=arr('eventos')[0]?.id||''; rerender(); return; }
    if(action==='save-compra'||action==='save-donacion'){ const row=rowCompraFromForm(id, action==='save-donacion'); await upsert('compras',row); replaceLocal('compras',row); rerender(); return; }
    if(action==='delete-compra'||action==='delete-donacion'){ await del('compras',id); removeLocal('compras',id); rerender(); return; }
    if(action==='save-collab'){ const row=rowCollabFromForm(id); await upsert('colaboradores',row); replaceLocal('colaboradores',row); rerender(); return; }
    if(action==='delete-collab'){ await del('colaboradores',id); removeLocal('colaboradores',id); if(getState().ticketImages) delete getState().ticketImages[selectedEventId()+'|INGRESO:'+id]; rerender(); return; }
    if(action==='save-persona'){ const row=rowPersonaFromForm(id); await upsert('personas',row); replaceLocal('personas',row); rerender(); return; }
    if(action==='delete-persona'){ await del('personas',id); removeLocal('personas',id); const s=getState(); s.colaboradores=arr('colaboradores').filter(c=>String(c.personaId)!==String(id)); s.compras=arr('compras').map(c=>String(c.responsableId)===String(id)?{...c,responsableId:''}:c); rerender(); return; }
    if(action==='save-tienda'){ const row=rowTiendaFromForm(id); await upsert('tiendas',row); replaceLocal('tiendas',row); rerender(); return; }
    if(action==='delete-tienda'){ await del('tiendas',id); removeLocal('tiendas',id); const s=getState(); s.productos=arr('productos').map(p=>String(p.tiendaId||p.defaultTiendaId)===String(id)?{...p,tiendaId:'',defaultTiendaId:''}:p); s.compras=arr('compras').map(c=>String(c.tiendaId)===String(id)?{...c,tiendaId:''}:c); rerender(); return; }
    if(action==='save-producto'){ const row=rowProductoFromForm(id); await upsert('productos',row); replaceLocal('productos',row); rerender(); return; }
    if(action==='delete-producto'){ await del('productos',id); removeLocal('productos',id); getState().compras=arr('compras').filter(c=>String(c.productoId)!==String(id)); rerender(); return; }
  }

  const handledActions=new Set(['save-compra','delete-compra','save-donacion','delete-donacion','save-collab','delete-collab','save-evento','delete-evento','save-persona','delete-persona','save-tienda','delete-tienda','save-producto','delete-producto']);
  const handledIds=new Set(['btnAddCompra','btnAddDonacion','btnAddColab','btnAddEvento','btnAddPersona','btnAddTienda','btnAddProducto']);
  document.addEventListener('click', function(ev){
    const btn=ev.target?.closest?.('button'); if(!btn) return;
    const action=btn.dataset?.action||''; const id=btn.dataset?.id||''; const bid=btn.id||'';
    if(!handledActions.has(action) && !handledIds.has(bid)) return;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation();
    (async()=>{
      try{
        if(bid==='btnAddCompra') return await doAddCompra(false);
        if(bid==='btnAddDonacion') return await doAddCompra(true);
        if(bid==='btnAddColab') return await doAddCollab();
        if(bid==='btnAddEvento') return await doAddEvento();
        if(bid==='btnAddPersona') return await doAddPersona();
        if(bid==='btnAddTienda') return await doAddTienda();
        if(bid==='btnAddProducto') return await doAddProducto();
        return await handleAction(action,id);
      }catch(e){console.error('[FIX25 CRUD]',e); alert(e.message||String(e));}
    })();
    return false;
  }, true);

  // Override de funciones invocadas por código antiguo/onclick.
  function installOverrides(){
    setGlobal('addCompra', ()=>{doAddCompra(false).catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addDonation', ()=>{doAddCompra(true).catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addColab', ()=>{doAddCollab().catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addEvento', ()=>{doAddEvento().catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addPersona', ()=>{doAddPersona().catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addTienda', ()=>{doAddTienda().catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addProducto', ()=>{doAddProducto().catch(e=>alert(e.message||String(e))); return false;});
  }
  installOverrides(); [50,250,1000,2500,5000].forEach(ms=>setTimeout(installOverrides,ms));

  window.ControlEventExplicitCrudFix25={active:true, version:'v8.5_prod_fix25', rule:'CRUD inmediato fila-a-fila; evento Finalizado solo permite cambio explícito de situación por GD'};
  warn('Activo: mantenimiento por CRUD explícito FIX25 servido desde /public.');
})();
