/* ControlEvent v8.5_prod FIX19 - Persistencia CRUD segura.
   La app legacy puede seguir repintando y llamando a saveState(), pero /api/state ya no borra
   registros por ausencia. Este módulo detecta altas/modificaciones/bajas reales en el estado
   local y envía deltas explícitos a /api/crud-deltas. */
(function(){
  'use strict';
  const VERSION = 'v8.5_prod_fix19_crud_safe';
  const COLLECTIONS = ['eventos','personas','tiendas','productos','colaboradores','compras'];
  const WRITE_IDS = new Set([
    'btnAddPersona','btnAddEvento','btnAddTienda','btnAddProducto','btnAddColab','btnAddCompra','btnAddDonacion',
    'btnTogglePower','btnStartImport'
  ]);
  const WRITE_ACTION_RE = /^(save|delete)-|^edit-|^btnAdd|^toggleEventPower/i;
  let beforeSnapshot = null;
  let beforeTimer = 0;
  let syncBusy = false;
  let syncQueued = false;

  function appState(){ return window.ControlEventApp?.state || window.state || null; }
  function arr(name){ const s = appState(); return Array.isArray(s?.[name]) ? s[name] : []; }
  function cloneRow(row){ try{ return JSON.parse(JSON.stringify(row || {})); }catch(_){ return {...(row || {})}; } }
  function snapshot(){
    const snap = {};
    COLLECTIONS.forEach(name => {
      snap[name] = new Map();
      arr(name).forEach(row => { const id = String(row?.id || '').trim(); if(id) snap[name].set(id, cloneRow(row)); });
    });
    return snap;
  }
  function stable(row){
    const clean = cloneRow(row);
    delete clean.__ui; delete clean.__tmp; delete clean.producto; delete clean.persona; delete clean.tienda; delete clean.responsable; delete clean.donor;
    return JSON.stringify(clean, Object.keys(clean).sort());
  }
  function diff(before, after){
    const deltas = {upserts:{}, deletes:{}};
    COLLECTIONS.forEach(name => {
      const a = before?.[name] || new Map();
      const b = after?.[name] || new Map();
      for(const [id, oldRow] of a.entries()){
        if(!b.has(id)){
          if(!deltas.deletes[name]) deltas.deletes[name] = [];
          deltas.deletes[name].push(id);
        }
      }
      for(const [id, newRow] of b.entries()){
        const oldRow = a.get(id);
        if(!oldRow || stable(oldRow) !== stable(newRow)){
          if(!deltas.upserts[name]) deltas.upserts[name] = [];
          deltas.upserts[name].push(newRow);
        }
      }
    });
    if(!Object.keys(deltas.upserts).length) delete deltas.upserts;
    if(!Object.keys(deltas.deletes).length) delete deltas.deletes;
    return deltas;
  }
  function hasDelta(d){ return !!(d && (d.upserts || d.deletes)); }
  async function postDeltas(deltas){
    if(!hasDelta(deltas)) return;
    if(syncBusy){ syncQueued = deltas; return; }
    syncBusy = true;
    try{
      const res = await fetch('/api/crud-deltas', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(deltas)
      });
      if(!res.ok) throw new Error(await res.text());
    }catch(err){
      console.error('[ControlEvent FIX19] Error enviando deltas CRUD:', err);
      alert('No se pudo guardar la operación CRUD en servidor. Revisa antes de seguir: ' + (err?.message || err));
    }finally{
      syncBusy = false;
      if(syncQueued){ const q = syncQueued; syncQueued = false; setTimeout(() => postDeltas(q), 50); }
    }
  }
  function markBefore(){
    beforeSnapshot = snapshot();
    clearTimeout(beforeTimer);
    beforeTimer = setTimeout(() => { beforeSnapshot = null; }, 6000);
  }
  function scheduleAfter(reason){
    const base = beforeSnapshot;
    if(!base) return;
    [120, 450, 900].forEach((ms, idx) => setTimeout(() => {
      if(idx < 2 && !beforeSnapshot) return;
      const d = diff(base, snapshot());
      if(hasDelta(d)) postDeltas(d);
      if(idx === 2){ beforeSnapshot = null; clearTimeout(beforeTimer); }
    }, ms));
  }
  function isWriteTarget(target){
    const el = target?.closest?.('button,[data-action],input[type="file"],select');
    if(!el) return false;
    const id = el.id || '';
    const action = el.getAttribute?.('data-action') || '';
    if(WRITE_IDS.has(id)) return true;
    if(WRITE_ACTION_RE.test(action)) return true;
    if(/delete|remove|upload|guardar|modificar|añadir|add/i.test(id + ' ' + action + ' ' + (el.textContent || ''))) return true;
    return false;
  }
  document.addEventListener('pointerdown', ev => { if(isWriteTarget(ev.target)) markBefore(); }, true);
  document.addEventListener('click', ev => { if(isWriteTarget(ev.target)){ if(!beforeSnapshot) markBefore(); scheduleAfter('click'); } }, true);
  document.addEventListener('change', ev => { if(isWriteTarget(ev.target)){ if(!beforeSnapshot) markBefore(); scheduleAfter('change'); } }, true);

  window.ControlEventCrudSafeV85 = {version:VERSION, snapshot, diff, sync:() => { const s=snapshot(); const d=diff(s, snapshot()); return postDeltas(d); }};
})();
