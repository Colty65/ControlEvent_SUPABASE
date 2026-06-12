/* ControlEvent v8.5_prod FIX21 - CORTE RADICAL DE ESCRITURAS AUTOMATICAS.
   Regla:
   - Abrir app/login/refrescar/cambiar evento/cambiar pestana/ver globos/render = SOLO LECTURA.
   - PUT /api/state solo se deja pasar si viene de una accion explicita de mantenimiento
     marcada por este modulo, o de una restauracion total __forceReplaceAll.
   - Las llamadas antiguas que intenten guardar por render/refresco se responden como ignoradas.
*/
(function(){
  'use strict';
  const INSTALLED = '__ceV85NoAutomaticWritesFix21';
  if(window[INSTALLED]) return;
  window[INSTALLED] = true;

  const WRITE_ACTION_RE = /^(btnAddPersona|btnAddEvento|btnAddTienda|btnAddProducto|btnAddColab|btnAddCompra|btnAddDonacion|btnAddAcceso|btnStartImport|btnTogglePower|btnChangePassword|save-|delete-)/i;
  const DOC_WRITE_RE = /^doc:(add|save|delete|replace|remove-image|upload)$/i;
  let writeUntil = 0;
  let writeReason = '';
  let blocked = 0;
  let allowed = 0;

  function now(){ return Date.now(); }
  function norm(v){ return String(v ?? '').trim(); }
  function mark(reason, ms){
    writeUntil = Math.max(writeUntil, now() + (ms || 4500));
    writeReason = reason || 'accion-explicita';
  }
  function explicit(){ return now() <= writeUntil; }
  function st(){
    try{ if(typeof state !== 'undefined' && state) return state; }catch(_){ }
    return window.state || window.ControlEventApp?.state || {};
  }
  function storageKey(){
    try{ if(typeof STORAGE_KEY !== 'undefined') return STORAGE_KEY; }catch(_){ }
    return 'controlevent_v6_4';
  }
  function jsonResponse(status, body){
    return new Response(JSON.stringify(body || {}), {status, headers:{'Content-Type':'application/json'}});
  }
  function parseBody(body){
    if(!body || typeof body !== 'string') return null;
    try{ return JSON.parse(body); }catch(_){ return null; }
  }
  function shallowCloneForServer(){
    const src = st() || {};
    const out = {...src};
    // No enviar base64 pesado por /api/state. Las fotos se guardan por /api/ticket-images.
    const cleanImages = {};
    Object.entries(src.ticketImages || {}).forEach(([k,v]) => {
      if(!v) return;
      if(typeof v === 'string' && /^data:image\//i.test(v)) return;
      if(typeof v === 'string') cleanImages[k] = v;
      else if(v && typeof v === 'object') cleanImages[k] = v.pathname || v.url || v.public_url || v.publicUrl || v.path || '';
    });
    out.ticketImages = cleanImages;
    out.__explicitWrite = true;
    out.__explicitWriteReason = writeReason || 'accion-explicita';
    delete out.__cleanupStaleIngresoImages;
    delete out.__cleanupOrphanTicketImages;
    return out;
  }
  function shouldMarkTarget(target){
    const el = target?.closest?.('button,[data-action],[data-doc-save],[data-doc-delete],[data-doc-replace],[data-doc-remove-image],#btnAddEventDoc,input[type="file"]');
    if(!el) return '';
    const id = norm(el.id);
    const action = norm(el.dataset?.action);
    if(WRITE_ACTION_RE.test(id || action)) return action || id;
    if(id === 'btnAddEventDoc') return 'doc:add';
    if(el.dataset?.docSave) return 'doc:save';
    if(el.dataset?.docDelete) return 'doc:delete';
    if(el.dataset?.docReplace) return 'doc:replace';
    if(el.dataset?.docRemoveImage) return 'doc:remove-image';
    if(el.matches?.('input[type="file"]')){
      if(id === 'eventDocNewFile' || el.dataset?.docUploadInput != null) return 'doc:upload';
      if(el.accept && /image/i.test(el.accept)) return 'image:upload';
    }
    return '';
  }
  function collectionFromDeleteAction(action){
    action = norm(action);
    if(action === 'delete-persona') return 'personas';
    if(action === 'delete-evento') return 'eventos';
    if(action === 'delete-tienda') return 'tiendas';
    if(action === 'delete-producto') return 'productos';
    if(action === 'delete-collab') return 'colaboradores';
    if(action === 'delete-compra' || action === 'delete-donacion') return 'compras';
    return '';
  }
  function scheduleExplicitWrite(target, reason, evt){
    if(!reason) return;
    const el = target?.closest?.('button,[data-action],[data-doc-save],[data-doc-delete],[data-doc-remove-image],#btnAddEventDoc,input[type="file"]');
    const action = norm(el?.dataset?.action || el?.id || '');
    const id = norm(el?.dataset?.id || '');
    const isCrudDelete = action.startsWith('delete-') && collectionFromDeleteAction(action) && id;
    const isReadOnlyNav = /^tab|^mt(?!Acceso)|btnExport|btnLogout|btnOpen|toggle/i.test(action);
    if(isReadOnlyNav) return;

    setTimeout(async () => {
      try{
        mark(reason, 4500);
        if(isCrudDelete){
          const collection = collectionFromDeleteAction(action);
          await fetch(`/api/crud/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`, {
            method:'DELETE',
            headers:{'X-ControlEvent-Explicit-Write':'1','X-ControlEvent-Write-Reason':action},
            cache:'no-store'
          }).catch(error => console.warn('[ControlEvent FIX21] DELETE CRUD no completado:', error));
          return;
        }
        // Altas/modificaciones/documentos: se persiste de forma no destructiva.
        if(!action.startsWith('delete-acceso')) await controlledSaveState();
      }catch(error){
        console.warn('[ControlEvent FIX21] Guardado explicito no completado:', error);
      }
    }, evt === 'change' ? 900 : 120);
  }

  ['pointerdown','mousedown','touchstart','click','change','submit'].forEach(evt => {
    document.addEventListener(evt, event => {
      const reason = shouldMarkTarget(event.target);
      if(reason){
        mark(reason, evt === 'change' ? 7000 : 5000);
        if(evt === 'click' || evt === 'change' || evt === 'submit') scheduleExplicitWrite(event.target, reason, evt);
      }
    }, true);
  });

  // SaveState limpio: local siempre; servidor solo si se acaba de pulsar una accion real.
  async function controlledSaveState(){
    try{ localStorage.setItem(storageKey(), JSON.stringify(st())); }catch(_){ }
    if(!explicit()){
      blocked++;
      try{ console.warn('[ControlEvent FIX21] saveState ignorado en servidor: no viene de accion explicita.', {blocked}); }catch(_){ }
      return {ok:true, ignored:true, reason:'no-explicit-user-write'};
    }
    allowed++;
    const payload = shallowCloneForServer();
    const res = await fetch('/api/state', {
      method:'PUT',
      headers:{'Content-Type':'application/json','X-ControlEvent-Explicit-Write':'1','X-ControlEvent-Write-Reason':writeReason || 'accion-explicita'},
      body: JSON.stringify(payload),
      cache:'no-store'
    });
    if(!res.ok){
      const txt = await res.text().catch(() => '');
      throw new Error(txt || ('Error guardando estado HTTP ' + res.status));
    }
    return res.json().catch(() => ({ok:true}));
  }
  function installSaveOverride(){
    try{ Function('fn', 'saveState = fn;')(controlledSaveState); }catch(_){ }
    try{ window.saveState = controlledSaveState; }catch(_){ }
    // Si algun parche llama a pushStateToServer directamente, tambien queda controlado.
    try{ Function('fn', 'pushStateToServer = fn;')(controlledSaveState); }catch(_){ }
    try{ window.pushStateToServer = controlledSaveState; }catch(_){ }
  }

  if(typeof window.fetch === 'function' && !window.fetch.__ceV85NoAutomaticWritesFix21){
    const oldFetch = window.fetch.bind(window);
    const wrapped = function(input, init){
      const url = String(typeof input === 'string' ? input : (input && input.url) || '');
      const method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();

      if(method === 'PUT' && /\/api\/state(?:$|\?)/i.test(url)){
        const payload = parseBody(init && init.body) || {};
        const isRestore = payload.__forceReplaceAll === true || payload.__allowEmptyReplace === true;
        const isExplicit = explicit() || payload.__explicitWrite === true || (init?.headers && String(init.headers['X-ControlEvent-Explicit-Write'] || '').trim() === '1');
        if(!isRestore && !isExplicit){
          blocked++;
          try{ console.warn('[ControlEvent FIX21] PUT /api/state bloqueado/ignorado por escritura automatica.', {url, blocked}); }catch(_){ }
          return Promise.resolve(jsonResponse(200, {ok:true, ignored:true, blocked:true, reason:'automatic-state-put-blocked'}));
        }
        const nextPayload = {...payload, __explicitWrite:true, __explicitWriteReason: writeReason || payload.__explicitWriteReason || 'accion-explicita'};
        delete nextPayload.__cleanupStaleIngresoImages;
        delete nextPayload.__cleanupOrphanTicketImages;
        const headers = Object.assign({}, init?.headers || {}, {'Content-Type':'application/json','X-ControlEvent-Explicit-Write':'1','X-ControlEvent-Write-Reason': nextPayload.__explicitWriteReason});
        return oldFetch(input, Object.assign({}, init || {}, {headers, body: JSON.stringify(nextPayload), cache:'no-store'}));
      }

      if(method === 'POST' && /\/api\/crud-deltas(?:$|\?)/i.test(url)){
        try{ console.warn('[ControlEvent FIX21] /api/crud-deltas bloqueado siempre.'); }catch(_){ }
        return Promise.resolve(jsonResponse(409, {ok:false, error:'crud-deltas automaticos bloqueados por FIX21'}));
      }

      if(method === 'DELETE' && /\/api\/crud\//i.test(url) && !explicit()){
        try{ console.warn('[ControlEvent FIX21] DELETE CRUD bloqueado por no ser accion explicita.', {url}); }catch(_){ }
        return Promise.resolve(jsonResponse(409, {ok:false, error:'DELETE CRUD sin accion explicita bloqueado por FIX21'}));
      }

      return oldFetch(input, init);
    };
    wrapped.__ceV85NoAutomaticWritesFix21 = true;
    window.fetch = wrapped;
  }

  installSaveOverride();
  setTimeout(installSaveOverride, 0);
  setTimeout(installSaveOverride, 300);
  setTimeout(installSaveOverride, 1200);

  window.ControlEventNoAutomaticWritesFix21 = {
    version:'v8.5_prod_fix21',
    mark,
    explicit,
    status:() => ({explicit:explicit(), writeUntil, writeReason, blocked, allowed})
  };
  try{ console.warn('[ControlEvent FIX21] Corte radical de escrituras automaticas activo.'); }catch(_){ }
})();
