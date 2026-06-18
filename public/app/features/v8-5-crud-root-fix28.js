/* ControlEvent v10.1_prod FIX29 - CRUD raíz fila-a-fila con baja por firma
   Objetivo: cortar el modelo de guardado global y hacer persistencia inmediata.
   Regla:
   - Login, render, refrescar, cambiar ventana, cambiar evento, globos y fotos en visor = lectura/local.
   - Alta/Modificar/Baja de mantenimientos = endpoint CRUD concreto, una fila concreta.
   - Cambiar situación del evento = endpoint explícito de situación.
   - Evento Finalizado = datos bloqueados; solo se puede cambiar situación de forma explícita.
*/
(function(){
  'use strict';
  const TAG='__ceV85CrudRootFix29';
  if(window[TAG]) return; window[TAG]=true;

  const WRITE_SCOPE='row-crud-v8-5-fix29';
  const COLLECTIONS=['eventos','personas','tiendas','productos','colaboradores','compras'];
  const MAINT_ACTIONS=new Set([
    'save-compra','delete-compra','save-donacion','delete-donacion',
    'save-collab','delete-collab',
    'save-evento','delete-evento',
    'save-persona','delete-persona',
    'save-tienda','delete-tienda',
    'save-producto','delete-producto'
  ]);
  const ADD_BUTTONS=new Set(['btnAddCompra','btnAddDonacion','btnAddColab','btnAddEvento','btnAddPersona','btnAddTienda','btnAddProducto']);

  function log(){ try{ console.warn('[FIX28 CRUD RAIZ]', ...arguments); }catch(_){} }
  function $(id){ return document.getElementById(id); }
  function css(s){ try{return window.CSS && CSS.escape ? CSS.escape(String(s)) : String(s).replace(/"/g,'\\"');}catch(_){return String(s||'');} }
  function getState(){ try{return Function('return (typeof state!=="undefined")?state:(window.state||{})')();}catch(_){return window.state||{};} }
  function getAuth(){ try{return Function('return (typeof authUser!=="undefined")?authUser:(window.authUser||null)')();}catch(_){return window.authUser||null;} }
  function setGlobal(name, fn){ try{ Function('fn', name+' = fn;')(fn); }catch(_){} try{ window[name]=fn; }catch(_){} }
  function arr(name){ const s=getState(); if(!Array.isArray(s[name])) s[name]=[]; return s[name]; }
  function uid(){ try{ if(typeof window.uid==='function') return window.uid(); }catch(_){} try{ return Function('return (typeof uid==="function")?uid():null')() || makeId(); }catch(_){ return makeId(); } }
  function makeId(){ return 'id-'+Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function selectedEventId(){ const s=getState(); return String(s.selectedEventId||''); }
  function eventById(id){ return arr('eventos').find(e=>String(e.id||'')===String(id||''))||null; }
  function selectedEvent(){ return eventById(selectedEventId()); }
  function isFinalized(ev){ return String(ev?.situacion||'').trim().toLowerCase()==='finalizado'; }
  function canWrite(){ const u=getAuth(); return !!u && ['RW','GD'].includes(String(u.nivel||'').toUpperCase()); }
  function isGD(){ const u=getAuth(); return !!u && String(u.nivel||'').toUpperCase()==='GD'; }
  function val(action,id,fallback=''){ const el=document.querySelector(`[data-action="${action}"][data-id="${css(id)}"]`); return el ? String(el.value ?? '') : String(fallback ?? ''); }
  function elVal(id,fallback=''){ const el=$(id); return el ? String(el.value ?? '') : String(fallback ?? ''); }
  function setVal(id,value){ const el=$(id); if(el) el.value=value; }
  function clear(ids){ ids.forEach(id=>{ const el=$(id); if(el) el.value=''; }); }
  function parseNum(v){ const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.')); return Number.isFinite(n)?n:0; }
  function money(v){ try{ if(typeof parseEuroInput==='function') return parseEuroInput(v); }catch(_){} return parseNum(v); }
  function productById(id){ return arr('productos').find(p=>String(p.id||'')===String(id||''))||{}; }
  function localStore(){ try{ const key=Function('return (typeof STORAGE_KEY!=="undefined")?STORAGE_KEY:"controlevent_v6_4"')(); localStorage.setItem(key, JSON.stringify(getState())); }catch(_){} }
  function renderNow(){ localStore(); try{ if(typeof render==='function') render(); }catch(e){ log('render falló', e); } }
  function refreshMaintenanceAfterSync(collection){
    const col=String(collection||'').trim();
    try{
      if((!col || col==='eventos') && typeof renderEventos==='function') renderEventos();
    }catch(e){ log('renderEventos tras sincronizar falló', e); }
    try{ if(typeof renderMaintenanceTabs==='function') renderMaintenanceTabs(); }catch(_){ }
    try{
      const api=window.ControlEventMaintenance;
      const current=api && typeof api.current==='function' ? String(api.current()||'') : '';
      if(api && typeof api.refreshCurrent==='function' && (!current || current===col || col==='eventos' || (!col && current==='eventos'))){
        Promise.resolve(api.refreshCurrent({reason:'crud-root-sync-'+(col||'state'), force:true})).catch(function(e){ log('ControlEventMaintenance.refreshCurrent falló', e); });
      }
    }catch(_){ }
    try{ window.dispatchEvent(new CustomEvent('controlevent:crud-row-synced',{detail:{collection:col, at:Date.now()}})); }catch(_){ }
  }
  function requireWrite(){ if(!canWrite()){ alert('Usuario sin permiso de escritura.'); return false; } return true; }
  function requireGD(){ if(!isGD()){ alert('Solo usuario GD puede realizar esta operación.'); return false; } return true; }
  function blockIfFinalized(ev, text){ if(isFinalized(ev)){ alert('Evento Finalizado: no se permite '+(text||'modificar datos')+'. Cambia antes la situación a En curso si necesitas corregirlo.'); return true; } return false; }
  function onlySituationChange(old,row){
    if(!old || !row) return false;
    return String(old.situacion||'').trim() !== String(row.situacion||'').trim()
      && String(row.situacion||'').trim() !== '';
  }

  async function apiJson(url, init){
    const res=await fetch(url, init||{});
    const data=await res.json().catch(async()=>({error:await res.text().catch(()=>res.statusText)}));
    if(!res.ok || data.ok===false){ throw new Error(data.error || data.message || ('HTTP '+res.status+' '+url)); }
    return data;
  }
  async function crud(method, collection, id, row){
    const url='/api/crud/'+encodeURIComponent(collection)+(id?('/'+encodeURIComponent(id)):'');
    const init={method, headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE,'X-ControlEvent-Row-Only':'1'}};
    if(method!=='DELETE') init.body=JSON.stringify({...(row||{}),__crudRowOnly:true});
    return apiJson(url, init);
  }
  async function upsert(collection,row){ return crud(row?.id?'PUT':'POST', collection, row?.id||'', row); }
  async function del(collection,id,row){
    const url='/api/crud/'+encodeURIComponent(collection)+'/'+encodeURIComponent(id||'');
    const body = row ? {...row,__crudRowOnly:true,__deleteSignature:true} : {__crudRowOnly:true};
    return apiJson(url, {
      method:'DELETE',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE,'X-ControlEvent-Row-Only':'1'},
      body:JSON.stringify(body)
    });
  }
  async function updateEventSituation(id, situacion){
    return apiJson('/api/crud/eventos/'+encodeURIComponent(id)+'/situacion', {
      method:'PUT',
      headers:{'Content-Type':'application/json','X-ControlEvent-Write-Scope':WRITE_SCOPE,'X-ControlEvent-Row-Only':'1'},
      body:JSON.stringify({situacion:String(situacion||'En curso'),__crudRowOnly:true})
    });
  }
  async function readFreshState(){
    return apiJson('/api/state?ts='+Date.now(), {cache:'no-store'});
  }
  function replaceLocalState(fresh, keepSelected){
    if(!fresh || typeof fresh!=='object') return;
    const s=getState();
    const selected = keepSelected || s.selectedEventId;
    for(const k of [...COLLECTIONS,'ticketImages','ticketImageRefs','eventDocuments','eventCodeMap','entityCodeMaps','comprasSort','summaryTiendaSort']){
      if(Object.prototype.hasOwnProperty.call(fresh,k)) s[k]=fresh[k];
    }
    if(selected && Array.isArray(s.eventos) && s.eventos.some(e=>String(e.id)===String(selected))) s.selectedEventId=selected;
    else if(Array.isArray(s.eventos)) s.selectedEventId=s.eventos[0]?.id||'';
    localStore();
  }
  async function refreshFromDb(collection){
    const keep=selectedEventId();
    const fresh=await readFreshState();
    replaceLocalState(fresh, keep);
    renderNow();
    refreshMaintenanceAfterSync(collection);
    return fresh;
  }
  function replaceLocal(collection,row){ const a=arr(collection); const i=a.findIndex(x=>String(x.id||'')===String(row.id||'')); if(i>=0) a[i]={...a[i],...row}; else a.push(row); }
  function removeLocal(collection,id){ const s=getState(); s[collection]=arr(collection).filter(x=>String(x.id||'')!==String(id)); }

  function rowEventoFromForm(id){ const old=eventById(id)||{}; return {...old,id:String(id),titulo:val('edit-evento-titulo',id,old.titulo||'').trim(),precio:money(val('edit-evento-precio',id,old.precio||0)),fechaIni:val('edit-evento-fechaini',id,old.fechaIni||'').trim(),fechaFin:val('edit-evento-fechafin',id,old.fechaFin||'').trim(),descripcion:val('edit-evento-descripcion',id,old.descripcion||'').trim(),situacion:val('edit-evento-situacion',id,old.situacion||'En curso')}; }
  function rowCollabFromForm(id){ const old=arr('colaboradores').find(x=>String(x.id)===String(id))||{}; return {...old,id:String(id),eventId:String(old.eventId||selectedEventId()),personaId:val('edit-collab-persona',id,old.personaId||''),numero:Number(val('edit-collab-numero',id,old.numero||0)||0),situacion:val('edit-collab-situacion',id,old.situacion||'Pendiente'),importe:money(val('edit-collab-importe',id,old.importe||0))}; }
  function rowCompraFromForm(id,donacion){ const old=arr('compras').find(x=>String(x.id)===String(id))||{}; const pref=donacion?'donacion':'compra'; const pId=val('edit-'+pref+'-producto',id,old.productoId||''); const p=productById(pId); return {...old,id:String(id),eventId:String(old.eventId||selectedEventId()),productoId:pId,unidades:Number(val('edit-'+pref+'-unidades',id,old.unidades||0)||0),precio:money(val('edit-'+pref+'-precio',id,old.precio??p.precio??p.defaultPrecio??0)),ticketDonacion:val('edit-'+pref+'-ticket',id,old.ticketDonacion||''),donorRef:donacion?val('edit-donacion-donante',id,old.donorRef||''):val('edit-compra-donante',id,old.donorRef||''),responsableId:val('edit-'+pref+'-responsable',id,old.responsableId||''),tiendaId:donacion?(old.tiendaId||p.tiendaId||p.defaultTiendaId||''):val('edit-compra-tienda',id,old.tiendaId||p.tiendaId||p.defaultTiendaId||'')}; }
  function rowPersonaFromForm(id){ const old=arr('personas').find(x=>String(x.id)===String(id))||{}; return {...old,id:String(id),nombre:val('edit-persona-nombre',id,old.nombre||'').trim(),rango:val('edit-persona-rango',id,old.rango||'SOCIO')}; }
  function rowTiendaFromForm(id){ const old=arr('tiendas').find(x=>String(x.id)===String(id))||{}; return {...old,id:String(id),nombre:val('edit-tienda-nombre',id,old.nombre||'').trim()}; }
  function rowProductoFromForm(id){ const old=arr('productos').find(x=>String(x.id)===String(id))||{}; const precio=money(val('edit-producto-precio',id,old.defaultPrecio??old.precio??0)); const tienda=val('edit-producto-tienda',id,old.defaultTiendaId||old.tiendaId||''); return {...old,id:String(id),nombre:val('edit-producto-nombre',id,old.nombre||'').trim(),segmento:val('edit-producto-segmento',id,old.segmento||''),destino:val('edit-producto-destino',id,old.destino||''),precio,defaultPrecio:precio,tiendaId:tienda,defaultTiendaId:tienda}; }

  async function addEvento(){ if(!requireGD()) return; const titulo=elVal('newEventoTitulo').trim(); if(!titulo) return; const row={id:uid(),titulo,precio:money(elVal('newEventoPrecio','0')),fechaIni:elVal('newEventoFechaIni').trim(),fechaFin:elVal('newEventoFechaFin').trim(),situacion:elVal('newEventoSituacion','En curso'),descripcion:elVal('newEventoDescripcion').trim()}; await upsert('eventos',row); replaceLocal('eventos',row); getState().selectedEventId=row.id; clear(['newEventoTitulo','newEventoFechaIni','newEventoFechaFin','newEventoDescripcion']); setVal('newEventoPrecio','0.00'); await refreshFromDb('eventos'); }
  async function addPersona(){ if(!requireWrite())return; if(blockIfFinalized(selectedEvent(),'añadir personas'))return; const nombre=elVal('newPersonaNombre').trim(); if(!nombre)return; const row={id:uid(),nombre,rango:elVal('newPersonaRango','SOCIO')}; await upsert('personas',row); replaceLocal('personas',row); setVal('newPersonaNombre',''); await refreshFromDb(); }
  async function addTienda(){ if(!requireWrite())return; if(blockIfFinalized(selectedEvent(),'añadir tiendas'))return; const nombre=elVal('newTiendaNombre').trim(); if(!nombre)return; const row={id:uid(),nombre}; await upsert('tiendas',row); replaceLocal('tiendas',row); setVal('newTiendaNombre',''); await refreshFromDb(); }
  async function addProducto(){ if(!requireWrite())return; if(blockIfFinalized(selectedEvent(),'añadir productos'))return; const nombre=elVal('newProductoNombre').trim(); if(!nombre)return; const precio=money(elVal('newProductoPrecio','0')); const tienda=elVal('newProductoTienda',''); const row={id:uid(),nombre,segmento:elVal('newProductoSegmento'),destino:elVal('newProductoDestino'),precio,defaultPrecio:precio,tiendaId:tienda,defaultTiendaId:tienda}; await upsert('productos',row); replaceLocal('productos',row); setVal('newProductoNombre',''); setVal('newProductoPrecio','0,00 €'); await refreshFromDb(); }
  async function addCollab(){ if(!requireWrite())return; if(blockIfFinalized(selectedEvent(),'añadir ingresos'))return; const personaId=elVal('collabPersona'); if(!personaId)return; const row={id:uid(),eventId:selectedEventId(),personaId,numero:Number(elVal('collabNumero','0')||0),situacion:elVal('collabSituacion','Pendiente'),importe:money(elVal('collabImporte','0'))}; await upsert('colaboradores',row); replaceLocal('colaboradores',row); setVal('collabPersona',''); setVal('collabNumero','1'); setVal('collabSituacion','Pendiente'); setVal('collabImporte','0,00 €'); await refreshFromDb(); }
  async function addCompra(donacion){ if(!requireWrite())return; if(blockIfFinalized(selectedEvent(),'añadir compras/donaciones'))return; const pId=elVal(donacion?'donProducto':'buyProducto'); if(!pId)return; const p=productById(pId); const row={id:uid(),eventId:selectedEventId(),productoId:pId,unidades:Number(elVal(donacion?'donUnidades':'buyUnidades','0')||0),precio:money(elVal(donacion?'donPrecio':'buyPrecio',p.precio??p.defaultPrecio??0)),ticketDonacion:elVal(donacion?'donTicket':'buyTicket'),donorRef:donacion?elVal('donDonante'):'',responsableId:elVal(donacion?'donResponsable':'buyResponsable'),tiendaId:donacion?(p.tiendaId||p.defaultTiendaId||''):elVal('buyTienda',p.tiendaId||p.defaultTiendaId||'')}; await upsert('compras',row); replaceLocal('compras',row); if(donacion){ clear(['donProducto','donDonante','donResponsable']); setVal('donUnidades','1.00'); setVal('donPrecio','0,00 €'); } else { clear(['buyProducto','buyTienda','buyResponsable']); setVal('buyUnidades','1.00'); setVal('buyPrecio','0,00 €'); setVal('buyTicket',''); } await refreshFromDb(); }

  async function handleMaintenance(action,id){
    if(action==='save-evento'){
      if(!requireGD())return;
      const old=eventById(id);
      const row=rowEventoFromForm(id);
      // FIX28: si el evento YA está Finalizado, la única operación permitida es
      // cambiar exclusivamente la situación. No mandamos el registro completo,
      // porque cualquier diferencia de formato en fechas/descripción provocaba
      // bloqueo y además no debe actualizar campos de un evento cerrado.
      if(isFinalized(old)){
        if(!onlySituationChange(old,row)){
          alert('Evento Finalizado: solo se permite cambiar la SITUACIÓN. Para modificar datos, primero pásalo a En curso.');
          return;
        }
        await updateEventSituation(id,row.situacion);
        if(old) old.situacion=row.situacion;
        await refreshFromDb('eventos');
        return;
      }
      await upsert('eventos',row); replaceLocal('eventos',row); await refreshFromDb('eventos'); return;
    }
    if(action==='delete-evento'){ if(!requireGD())return; const target=eventById(id); if(blockIfFinalized(target,'eliminar evento'))return; if(!confirm('¿Eliminar evento y sus datos asociados?')) return; await del('eventos',id); removeLocal('eventos',id); await refreshFromDb('eventos'); return; }

    if(!requireWrite()) return;
    const ev=selectedEvent();
    if(blockIfFinalized(ev,'mantener datos')) return;

    if(action==='save-compra'||action==='save-donacion'){ const row=rowCompraFromForm(id, action==='save-donacion'); await upsert('compras',row); replaceLocal('compras',row); await refreshFromDb(); return; }
    if(action==='delete-compra'||action==='delete-donacion'){
      const row=rowCompraFromForm(id, action==='delete-donacion');
      const result = await del('compras', id, row);
      removeLocal('compras', id);
      await refreshFromDb();
      const stillById = arr('compras').some(x=>String(x.id||'')===String(id));
      const deletedActualId = result?.fallback?.deletedActualId;
      const stillByActual = deletedActualId ? arr('compras').some(x=>String(x.id||'')===String(deletedActualId)) : false;
      if(stillById || stillByActual){ throw new Error('La baja de compra NO ha quedado en BBDD. Registro sigue existiendo tras DELETE: '+id); }
      return;
    }
    if(action==='save-collab'){ const row=rowCollabFromForm(id); await upsert('colaboradores',row); replaceLocal('colaboradores',row); await refreshFromDb(); return; }
    if(action==='delete-collab'){ await del('colaboradores',id); removeLocal('colaboradores',id); await refreshFromDb(); if(arr('colaboradores').some(x=>String(x.id||'')===String(id))){ throw new Error('La baja de ingreso NO ha quedado en BBDD. Registro sigue existiendo tras DELETE: '+id); } return; }
    if(action==='save-persona'){ const row=rowPersonaFromForm(id); await upsert('personas',row); replaceLocal('personas',row); await refreshFromDb(); return; }
    if(action==='delete-persona'){ await del('personas',id); removeLocal('personas',id); await refreshFromDb(); return; }
    if(action==='save-tienda'){ const row=rowTiendaFromForm(id); await upsert('tiendas',row); replaceLocal('tiendas',row); await refreshFromDb(); return; }
    if(action==='delete-tienda'){ await del('tiendas',id); removeLocal('tiendas',id); await refreshFromDb(); return; }
    if(action==='save-producto'){ const row=rowProductoFromForm(id); await upsert('productos',row); replaceLocal('productos',row); await refreshFromDb(); return; }
    if(action==='delete-producto'){ await del('productos',id); removeLocal('productos',id); await refreshFromDb(); return; }
  }

  async function togglePower(){
    if(!requireGD()) return;
    const ev=selectedEvent(); if(!ev) return;
    const next=isFinalized(ev)?'En curso':'Finalizado';
    await updateEventSituation(ev.id,next);
    ev.situacion=next;
    await refreshFromDb('eventos');
  }

  function handleCrudClick(e){
    const btn=e.target?.closest?.('button'); if(!btn) return;
    const action=btn.dataset?.action||''; const id=btn.dataset?.id||''; const bid=btn.id||'';
    const isHandled=MAINT_ACTIONS.has(action)||ADD_BUTTONS.has(bid)||bid==='btnTogglePower';
    if(!isHandled) return;
    // Va en WINDOW CAPTURE y se registra antes de los parches legacy.
    // Así ningún listener antiguo puede borrar solo en memoria ni lanzar saveState global.
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    (async()=>{
      try{
        if(bid==='btnTogglePower') return await togglePower();
        if(bid==='btnAddEvento') return await addEvento();
        if(bid==='btnAddPersona') return await addPersona();
        if(bid==='btnAddTienda') return await addTienda();
        if(bid==='btnAddProducto') return await addProducto();
        if(bid==='btnAddColab') return await addCollab();
        if(bid==='btnAddCompra') return await addCompra(false);
        if(bid==='btnAddDonacion') return await addCompra(true);
        return await handleMaintenance(action,id);
      }catch(err){ console.error('[FIX28 CRUD RAIZ]',err); alert(err.message||String(err)); }
    })();
    return false;
  }
  window.addEventListener('click', handleCrudClick, true);
  document.addEventListener('click', handleCrudClick, true);

  function localOnlySave(){ localStore(); return Promise.resolve({ok:true, localOnly:true, fix:'FIX27'}); }
  function installGlobals(){
    setGlobal('saveState', localOnlySave);
    setGlobal('pushStateToServer', localOnlySave);
    setGlobal('addCompra', ()=>{addCompra(false).catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addDonation', ()=>{addCompra(true).catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addColab', ()=>{addCollab().catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addEvento', ()=>{addEvento().catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addPersona', ()=>{addPersona().catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addTienda', ()=>{addTienda().catch(e=>alert(e.message||String(e))); return false;});
    setGlobal('addProducto', ()=>{addProducto().catch(e=>alert(e.message||String(e))); return false;});
  }
  installGlobals(); [0,25,100,250,500,1000,2000,4000,8000].forEach(ms=>setTimeout(installGlobals,ms));

  if(typeof window.fetch==='function' && !window.fetch.__ceFix26StateGuard){
    const original=window.fetch.bind(window);
    const wrapped=function(input, init){
      const url=String(typeof input==='string'?input:(input&&input.url)||'');
      const method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
      if(method==='PUT' && /\/api\/state(?:$|\?)/i.test(url)){
        let payload={}; try{ payload=JSON.parse(init?.body||'{}'); }catch(_){}
        const restore=payload.__forceReplaceAll===true && String((init?.headers||{})['X-ControlEvent-Backup-Restore']||'')==='1';
        if(!restore){
          log('Bloqueado PUT /api/state de código legacy. Solo local.');
          return Promise.resolve(new Response(JSON.stringify({ok:false,blocked:true,error:'FIX27: PUT /api/state bloqueado; use CRUD fila-a-fila'}),{status:409,headers:{'Content-Type':'application/json'}}));
        }
      }
      return original(input,init);
    };
    wrapped.__ceFix26StateGuard=true; window.fetch=wrapped;
  }
  try{
    if('serviceWorker' in navigator) navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister().catch(()=>{}))).catch(()=>{});
    if(window.caches&&caches.keys) caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).catch(()=>{});
  }catch(_){}

  window.ControlEventCrudRootFix29={active:true, version:'v8.5_prod_fix29', scope:WRITE_SCOPE}; try{document.documentElement.setAttribute('data-ce-crud-root','fix29');}catch(_){}
  log('Activo FIX29 en WINDOW CAPTURE: CRUD raíz fila-a-fila. Baja de compras con fallback por firma. Sin guardado global.');
})();
