/* ControlEvent v19_prod FIX30 - CRUD raíz fila-a-fila con baja por firma
   Objetivo: cortar el modelo de guardado global y hacer persistencia inmediata.
   Regla:
   - Login, render, refrescar, cambiar ventana, cambiar evento, globos y fotos en visor = lectura/local.
   - Alta/Modificar/Baja de mantenimientos = endpoint CRUD concreto, una fila concreta.
   - Cambiar situación del evento = endpoint explícito de situación.
   - Evento Finalizado = datos bloqueados; solo se puede cambiar situación de forma explícita.
*/
(function(){
  'use strict';
  const TAG='__ceV85CrudRootFix30';
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
  function val(action,id,fallback='',scope){
    const selector=`[data-action="${action}"][data-id="${css(id)}"]`;
    const scopedNodes = scope && scope.querySelectorAll ? Array.from(scope.querySelectorAll(selector)) : [];
    const nodes=scopedNodes.length ? scopedNodes : Array.from(document.querySelectorAll(selector));
    if(!nodes.length) return String(fallback ?? '');
    const active=document.activeElement;
    if(active && nodes.includes(active)) return String(active.value ?? fallback ?? '');
    const isVisible=el=>{
      try{
        if(el.disabled) return false;
        if(el.closest('[hidden],.hidden,[aria-hidden="true"]')) return false;
        const cs=getComputedStyle(el);
        if(cs.display==='none' || cs.visibility==='hidden') return false;
        return !!(el.offsetParent || el.getClientRects().length || cs.position==='fixed');
      }catch(_){ return true; }
    };
    const root=$('collabList');
    let candidates=nodes.filter(isVisible);
    if(root){
      const inRoot=candidates.filter(el=>root.contains(el));
      if(inRoot.length) candidates=inRoot;
    }
    // En algunas vistas quedan controles duplicados/stale con el mismo data-id.
    // Para guardar ingresos tomamos el control visible mas reciente, no el primero oculto.
    const el=(candidates.length ? candidates[candidates.length-1] : nodes[nodes.length-1]);
    return String(el.value ?? fallback ?? '');
  }
  function elVal(id,fallback=''){ const el=$(id); return el ? String(el.value ?? '') : String(fallback ?? ''); }
  function setVal(id,value){ const el=$(id); if(el) el.value=value; }
  function clear(ids){ ids.forEach(id=>{ const el=$(id); if(el) el.value=''; }); }
  function parseNum(v){ const n=Number(String(v??'').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.')); return Number.isFinite(n)?n:0; }
  function money(v){ try{ if(typeof parseEuroInput==='function') return parseEuroInput(v); }catch(_){} return parseNum(v); }
  function productById(id){ return arr('productos').find(p=>String(p.id||'')===String(id||''))||{}; }
  function localStore(){ try{ const key=Function('return (typeof STORAGE_KEY!=="undefined")?STORAGE_KEY:"controlevent_v6_4"')(); localStorage.setItem(key, JSON.stringify(getState())); }catch(_){} }
  function renderNow(){ localStore(); try{ if(typeof render==='function') render(); }catch(e){ log('render falló', e); } }
  function refreshMaintenanceAfterSync(collection, opts){
    const col=String(collection||'').trim();
    try{
      if((!col || col==='eventos') && typeof renderEventos==='function') renderEventos();
    }catch(e){ log('renderEventos tras sincronizar falló', e); }
    try{ if(!opts?.skipLegacyTabs && typeof renderMaintenanceTabs==='function') renderMaintenanceTabs(); }catch(_){ }
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
  const MAINT_SECTION_BY_COLLECTION={personas:'personas',tiendas:'tiendas',productos:'productos',eventos:'eventos'};
  const MAINT_VIEW_BY_SECTION={personas:'mtPersonas',eventos:'mtEventos',tiendas:'mtTiendas',productos:'mtProductos',acceso:'mtAcceso',importar:'mtImportar'};
  const MAINT_BTN_BY_SECTION={personas:'mtPersonasBtn',eventos:'mtEventosBtn',tiendas:'mtTiendasBtn',productos:'mtProductosBtn',acceso:'mtAccesoBtn',importar:'mtImportBtn'};
  const MAIN_PANEL_IDS=['tabIngresos','tabDonaciones','tabCompras','tabMapaProductos','tabPlanificacionInicial','tabResumen','tabGraficas','tabDocumentos'];
  function maintVisibleName(){
    for(const [name,id] of Object.entries(MAINT_VIEW_BY_SECTION)){
      const el=$(id);
      if(el && !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none') return name;
    }
    return '';
  }
  function maintenanceSnapshot(collection){
    const wrap=$('maintenanceWrapper');
    const open=!!(wrap && !wrap.classList.contains('hidden') && getComputedStyle(wrap).display !== 'none');
    let section=MAINT_SECTION_BY_COLLECTION[String(collection||'')] || maintVisibleName();
    try{ section=section || window.ControlEventMaintenance?.current?.() || ''; }catch(_){ }
    try{ section=section || window.ControlEventApp?.navigation?.currentMaintTab || ''; }catch(_){ }
    if(section==='importacion') section='importar';
    const scrolls=[];
    ['maintenanceWrapper','personasList','eventosList','tiendasList','productosList','mtPersonas','mtEventos','mtTiendas','mtProductos'].forEach(id=>{
      const el=$(id); if(el) scrolls.push([id, el.scrollLeft||0, el.scrollTop||0]);
    });
    return {open, section:section||'personas', scrolls};
  }
  function restoreMaintenanceSnapshot(snap){
    if(!snap || !snap.open) return;
    const section=snap.section || 'personas';
    try{ if(window.ControlEventApp?.navigation){ window.ControlEventApp.navigation.currentMainTab='maintenance'; window.ControlEventApp.navigation.currentMaintTab=section; } }catch(_){ }
    MAIN_PANEL_IDS.forEach(id=>{ const el=$(id); if(el) el.classList.add('hidden'); });
    const wrap=$('maintenanceWrapper');
    if(wrap){ wrap.classList.remove('hidden'); wrap.hidden=false; wrap.style.display=''; wrap.removeAttribute('aria-hidden'); }
    Object.entries(MAINT_VIEW_BY_SECTION).forEach(([name,id])=>{ const el=$(id); if(el) el.classList.toggle('hidden', name!==section); });
    Object.entries(MAINT_BTN_BY_SECTION).forEach(([name,id])=>{ const b=$(id); if(b) b.classList.toggle('active', name===section); });
    const api=window.ControlEventMaintenance;
    if(api && typeof api.activate==='function') setTimeout(()=>{
      Promise.resolve(api.activate(section,{reason:'crud-root-restore-maintenance', force:true})).catch(e=>log('ControlEventMaintenance.activate restore falló', e));
    }, 0);
    setTimeout(()=>{ (snap.scrolls||[]).forEach(([id,x,y])=>{ const el=$(id); if(el){ el.scrollLeft=x; el.scrollTop=y; } }); }, 80);
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
    const snap=maintenanceSnapshot(collection);
    const fresh=await readFreshState();
    replaceLocalState(fresh, keep);
    if(snap.open){
      try{ if(window.ControlEventApp?.navigation){ window.ControlEventApp.navigation.currentMainTab='maintenance'; window.ControlEventApp.navigation.currentMaintTab=snap.section || 'personas'; } }catch(_){ }
    }
    const col=String(collection||'').trim();
    const masterNoFullRender = !!(snap.open && ['personas','tiendas','productos'].includes(col));
    if(masterNoFullRender){
      // Evita que el render global cierre toda la ventana de Mantenimiento al guardar tablas maestras.
      localStore();
      restoreMaintenanceSnapshot(snap);
      refreshMaintenanceAfterSync(col, {skipLegacyTabs:true});
      restoreMaintenanceSnapshot(snap);
      return fresh;
    }
    renderNow();
    restoreMaintenanceSnapshot(snap);
    refreshMaintenanceAfterSync(collection);
    restoreMaintenanceSnapshot(snap);
    return fresh;
  }
  function replaceLocal(collection,row){ const a=arr(collection); const i=a.findIndex(x=>String(x.id||'')===String(row.id||'')); if(i>=0) a[i]={...a[i],...row}; else a.push(row); }
  function removeLocal(collection,id){ const s=getState(); s[collection]=arr(collection).filter(x=>String(x.id||'')!==String(id)); }

  function rowEventoFromForm(id){ const old=eventById(id)||{}; return {...old,id:String(id),titulo:val('edit-evento-titulo',id,old.titulo||'').trim(),precio:money(val('edit-evento-precio',id,old.precio||0)),fechaIni:val('edit-evento-fechaini',id,old.fechaIni||'').trim(),fechaFin:val('edit-evento-fechafin',id,old.fechaFin||'').trim(),descripcion:val('edit-evento-descripcion',id,old.descripcion||'').trim(),situacion:val('edit-evento-situacion',id,old.situacion||'En curso')}; }
  function rowCollabFromForm(id,scope){
    const old=arr('colaboradores').find(x=>String(x.id)===String(id))||{};
    const row={...old,id:String(id),eventId:String(old.eventId||selectedEventId()),personaId:val('edit-collab-persona',id,old.personaId||'',scope),numero:Number(val('edit-collab-numero',id,old.numero||0,scope)||0),situacion:val('edit-collab-situacion',id,old.situacion||'Pendiente',scope),importe:money(val('edit-collab-importe',id,old.importe||0,scope))};
    row.situacion = String(row.situacion || 'Pendiente').trim() || 'Pendiente';
    return row;
  }
  function rowCompraFromForm(id,donacion){ const old=arr('compras').find(x=>String(x.id)===String(id))||{}; const pref=donacion?'donacion':'compra'; const pId=val('edit-'+pref+'-producto',id,old.productoId||''); const p=productById(pId); return {...old,id:String(id),eventId:String(old.eventId||selectedEventId()),productoId:pId,unidades:Number(val('edit-'+pref+'-unidades',id,old.unidades||0)||0),precio:money(val('edit-'+pref+'-precio',id,old.precio??p.precio??p.defaultPrecio??0)),ticketDonacion:val('edit-'+pref+'-ticket',id,old.ticketDonacion||''),donorRef:donacion?val('edit-donacion-donante',id,old.donorRef||''):val('edit-compra-donante',id,old.donorRef||''),responsableId:val('edit-'+pref+'-responsable',id,old.responsableId||''),tiendaId:donacion?(old.tiendaId||p.tiendaId||p.defaultTiendaId||''):val('edit-compra-tienda',id,old.tiendaId||p.tiendaId||p.defaultTiendaId||'')}; }
  function rowPersonaFromForm(id){ const old=arr('personas').find(x=>String(x.id)===String(id))||{}; return {...old,id:String(id),nombre:val('edit-persona-nombre',id,old.nombre||'').trim(),rango:val('edit-persona-rango',id,old.rango||'SOCIO')}; }
  function rowTiendaFromForm(id){ const old=arr('tiendas').find(x=>String(x.id)===String(id))||{}; return {...old,id:String(id),nombre:val('edit-tienda-nombre',id,old.nombre||'').trim()}; }
  function rowProductoFromForm(id){ const old=arr('productos').find(x=>String(x.id)===String(id))||{}; const precio=money(val('edit-producto-precio',id,old.defaultPrecio??old.precio??0)); const tienda=val('edit-producto-tienda',id,old.defaultTiendaId||old.tiendaId||''); return {...old,id:String(id),nombre:val('edit-producto-nombre',id,old.nombre||'').trim(),segmento:val('edit-producto-segmento',id,old.segmento||''),destino:val('edit-producto-destino',id,old.destino||''),precio,defaultPrecio:precio,tiendaId:tienda,defaultTiendaId:tienda}; }

  async function addEvento(){ if(!requireGD()) return; const titulo=elVal('newEventoTitulo').trim(); if(!titulo) return; const row={id:uid(),titulo,precio:money(elVal('newEventoPrecio','0')),fechaIni:elVal('newEventoFechaIni').trim(),fechaFin:elVal('newEventoFechaFin').trim(),situacion:elVal('newEventoSituacion','En curso'),descripcion:elVal('newEventoDescripcion').trim()}; await upsert('eventos',row); replaceLocal('eventos',row); getState().selectedEventId=row.id; clear(['newEventoTitulo','newEventoFechaIni','newEventoFechaFin','newEventoDescripcion']); setVal('newEventoPrecio','0.00'); await refreshFromDb('eventos'); }
  async function addPersona(){ if(!requireWrite())return; const nombre=elVal('newPersonaNombre').trim(); if(!nombre)return; const row={id:uid(),nombre,rango:elVal('newPersonaRango','SOCIO')}; await upsert('personas',row); replaceLocal('personas',row); setVal('newPersonaNombre',''); await refreshFromDb('personas'); }
  async function addTienda(){ if(!requireWrite())return; const nombre=elVal('newTiendaNombre').trim(); if(!nombre)return; const row={id:uid(),nombre}; await upsert('tiendas',row); replaceLocal('tiendas',row); setVal('newTiendaNombre',''); await refreshFromDb('tiendas'); }
  async function addProducto(){ if(!requireWrite())return; const nombre=elVal('newProductoNombre').trim(); if(!nombre)return; const precio=money(elVal('newProductoPrecio','0')); const tienda=elVal('newProductoTienda',''); const row={id:uid(),nombre,segmento:elVal('newProductoSegmento'),destino:elVal('newProductoDestino'),precio,defaultPrecio:precio,tiendaId:tienda,defaultTiendaId:tienda}; await upsert('productos',row); replaceLocal('productos',row); setVal('newProductoNombre',''); setVal('newProductoPrecio','0,00 €'); await refreshFromDb('productos'); }
  async function addCollab(){ if(!requireWrite())return; if(blockIfFinalized(selectedEvent(),'añadir ingresos'))return; const personaId=elVal('collabPersona'); if(!personaId)return; const row={id:uid(),eventId:selectedEventId(),personaId,numero:Number(elVal('collabNumero','0')||0),situacion:elVal('collabSituacion','Pendiente'),importe:money(elVal('collabImporte','0'))}; await upsert('colaboradores',row); replaceLocal('colaboradores',row); setVal('collabPersona',''); setVal('collabNumero','1'); setVal('collabSituacion','Pendiente'); setVal('collabImporte','0,00 €'); await refreshFromDb(); }
  async function addCompra(donacion){ if(!requireWrite())return; if(blockIfFinalized(selectedEvent(),'añadir compras/donaciones'))return; const pId=elVal(donacion?'donProducto':'buyProducto'); if(!pId)return; const p=productById(pId); const row={id:uid(),eventId:selectedEventId(),productoId:pId,unidades:Number(elVal(donacion?'donUnidades':'buyUnidades','0')||0),precio:money(elVal(donacion?'donPrecio':'buyPrecio',p.precio??p.defaultPrecio??0)),ticketDonacion:elVal(donacion?'donTicket':'buyTicket'),donorRef:donacion?elVal('donDonante'):'',responsableId:elVal(donacion?'donResponsable':'buyResponsable'),tiendaId:donacion?(p.tiendaId||p.defaultTiendaId||''):elVal('buyTienda',p.tiendaId||p.defaultTiendaId||'')}; await upsert('compras',row); replaceLocal('compras',row); if(donacion){ clear(['donProducto','donDonante','donResponsable']); setVal('donUnidades','1.00'); setVal('donPrecio','0,00 €'); } else { clear(['buyProducto','buyTienda','buyResponsable']); setVal('buyUnidades','1.00'); setVal('buyPrecio','0,00 €'); setVal('buyTicket',''); } await refreshFromDb(); }

  async function handleMaintenance(action,id,sourceBtn){
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
    const actionIsEventBound = /^(save|delete)-(compra|donacion|collab)$/.test(String(action || ''));
    if(actionIsEventBound && blockIfFinalized(ev,'mantener datos del evento')) return;

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
    if(action==='save-collab'){
      const scope = sourceBtn?.closest?.('.rowline.collab,.itemcard,.card') || null;
      const row=rowCollabFromForm(id, scope);
      await upsert('colaboradores',row);
      replaceLocal('colaboradores',row);
      const fresh = await refreshFromDb();
      // FIX10: si el refresco devuelve una copia antigua, se mantiene en local TODO el ingreso guardado.
      // Antes solo se comparaba Situación; por eso algunos cambios (importe, número, colaborador) exigían guardar dos veces.
      try{
        const saved = Array.isArray(fresh?.colaboradores) ? fresh.colaboradores.find(x=>String(x.id||'')===String(id)) : null;
        const sameSaved = saved
          && String(saved.personaId||'') === String(row.personaId||'')
          && String(saved.situacion||'') === String(row.situacion||'')
          && Number(saved.numero||0) === Number(row.numero||0)
          && Math.abs(Number(money(saved.importe||0)) - Number(money(row.importe||0))) < 0.005
          && String(saved.eventoId||'') === String(row.eventoId||'');
        if(!sameSaved){
          replaceLocal('colaboradores',row);
          renderNow();
          try{ if(typeof renderIngresosSummary==='function') renderIngresosSummary(); }catch(__){}
          try{ if(typeof renderColabs==='function') renderColabs(); }catch(__){}
        }
      }catch(_){ }
      return;
    }
    if(action==='delete-collab'){ await del('colaboradores',id); removeLocal('colaboradores',id); await refreshFromDb(); if(arr('colaboradores').some(x=>String(x.id||'')===String(id))){ throw new Error('La baja de ingreso NO ha quedado en BBDD. Registro sigue existiendo tras DELETE: '+id); } return; }
    if(action==='save-persona'){ const row=rowPersonaFromForm(id); await upsert('personas',row); replaceLocal('personas',row); await refreshFromDb('personas'); return; }
    if(action==='delete-persona'){ await del('personas',id); removeLocal('personas',id); await refreshFromDb('personas'); return; }
    if(action==='save-tienda'){ const row=rowTiendaFromForm(id); await upsert('tiendas',row); replaceLocal('tiendas',row); await refreshFromDb('tiendas'); return; }
    if(action==='delete-tienda'){ await del('tiendas',id); removeLocal('tiendas',id); await refreshFromDb('tiendas'); return; }
    if(action==='save-producto'){ const row=rowProductoFromForm(id); await upsert('productos',row); replaceLocal('productos',row); await refreshFromDb('productos'); return; }
    if(action==='delete-producto'){ await del('productos',id); removeLocal('productos',id); await refreshFromDb('productos'); return; }
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
        return await handleMaintenance(action,id,btn);
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
