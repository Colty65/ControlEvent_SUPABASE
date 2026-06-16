/* ControlEvent v9.3_prod - Control de duplicados en mantenimientos generales
   Evita duplicar PERSONAS, EVENTOS, TIENDAS y PRODUCTOS al añadir o modificar. */
(function(){
  'use strict';
  const VERSION = 'ControlEvent v9.3_prod';
  const TABLES = {
    persona: {stateKey:'personas', label:'PERSONAS', field:'nombre', addBtn:'btnAddPersona', addInput:'newPersonaNombre', saveAction:'save-persona', editAction:'edit-persona-nombre'},
    evento: {stateKey:'eventos', label:'EVENTOS', field:'titulo', addBtn:'btnAddEvento', addInput:'newEventoTitulo', saveAction:'save-evento', editAction:'edit-evento-titulo'},
    tienda: {stateKey:'tiendas', label:'TIENDAS', field:'nombre', addBtn:'btnAddTienda', addInput:'newTiendaNombre', saveAction:'save-tienda', editAction:'edit-tienda-nombre'},
    producto: {stateKey:'productos', label:'PRODUCTOS', field:'nombre', addBtn:'btnAddProducto', addInput:'newProductoNombre', saveAction:'save-producto', editAction:'edit-producto-nombre'}
  };
  const $ = (id) => document.getElementById(id);
  function st(){ try{ if(typeof state !== 'undefined') return state || {}; }catch(_){ } return window.state || window.ControlEventApp?.state || {}; }
  function arr(key){ const v = st()[key]; return Array.isArray(v) ? v : []; }
  function norm(value){ return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim().toUpperCase(); }
  function cssEsc(value){ try{ if(window.CSS && typeof CSS.escape === 'function') return CSS.escape(String(value||'')); }catch(_){ } return String(value||'').replace(/\\/g,'\\\\').replace(/"/g,'\\"'); }
  function readEditValue(action, id){
    try{ if(typeof currentValuesByAction === 'function') return currentValuesByAction(action, id); }catch(_){ }
    const el = document.querySelector(`[data-action="${action}"][data-id="${cssEsc(id)}"]`);
    return el ? el.value : '';
  }
  function findDuplicate(def, value, selfId){
    const wanted = norm(value);
    if(!wanted) return null;
    return arr(def.stateKey).find(item => String(item?.id || '') !== String(selfId || '') && norm(item?.[def.field]) === wanted) || null;
  }
  function markExisting(def, dup){
    if(!dup) return;
    const selector = `[data-action="${def.editAction}"][data-id="${cssEsc(dup.id)}"]`;
    const input = document.querySelector(selector);
    const card = input?.closest?.('.itemcard,.rowline,article,section') || input;
    if(card){
      card.classList.add('ce-duplicate-highlight');
      try{ card.scrollIntoView({behavior:'smooth', block:'center'}); }catch(_){ try{ card.scrollIntoView(); }catch(__){} }
      setTimeout(()=>card.classList.remove('ce-duplicate-highlight'), 2200);
    }
  }
  function warn(def, value, dup){
    const name = String(value || '').trim();
    try{ alert(`No autorizado. Ya existe en ${def.label}: ${name}`); }catch(_){ }
    markExisting(def, dup);
  }
  function blockAdd(def){
    const input = $(def.addInput);
    if(!input) return false;
    const value = input.value || '';
    const dup = findDuplicate(def, value, '');
    if(!dup) return false;
    warn(def, value, dup);
    try{ input.focus(); input.select?.(); }catch(_){ }
    return true;
  }
  function blockSave(def, id){
    const value = readEditValue(def.editAction, id);
    const dup = findDuplicate(def, value, id);
    if(!dup) return false;
    warn(def, value, dup);
    const input = document.querySelector(`[data-action="${def.editAction}"][data-id="${cssEsc(id)}"]`);
    try{ input?.focus(); input?.select?.(); }catch(_){ }
    return true;
  }
  function getDefFromButton(btn){
    const action = btn?.dataset?.action || btn?.id || '';
    for(const def of Object.values(TABLES)){
      if(action === def.addBtn) return {def, mode:'add'};
      if(action === def.saveAction) return {def, mode:'save'};
    }
    return null;
  }
  function guard(ev){
    const btn = ev.target?.closest?.('button');
    if(!btn) return;
    const info = getDefFromButton(btn);
    if(!info) return;
    let blocked = false;
    if(info.mode === 'add') blocked = blockAdd(info.def);
    else blocked = blockSave(info.def, btn.dataset.id || '');
    if(blocked){
      try{ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }catch(_){ }
      return false;
    }
  }
  function wrapFunction(name, def, mode){
    try{
      const old = window[name] || (typeof globalThis[name] === 'function' ? globalThis[name] : null);
      if(typeof old !== 'function' || old.__ceDupGuardV314) return;
      const wrapped = function(){
        if(mode === 'add' && blockAdd(def)) return;
        return old.apply(this, arguments);
      };
      wrapped.__ceDupGuardV314 = true;
      try{ window[name] = wrapped; }catch(_){ }
      try{ globalThis[name] = wrapped; }catch(_){ }
    }catch(_){ }
  }

  function wrapSaveEventRecord(){
    try{
      const old = window.saveEventRecord || (typeof globalThis.saveEventRecord === 'function' ? globalThis.saveEventRecord : null);
      if(typeof old !== 'function' || old.__ceDupGuardV314) return;
      const wrapped = function(id){
        if(blockSave(TABLES.evento, id)) return;
        return old.apply(this, arguments);
      };
      wrapped.__ceDupGuardV314 = true;
      try{ window.saveEventRecord = wrapped; }catch(_){ }
      try{ globalThis.saveEventRecord = wrapped; }catch(_){ }
    }catch(_){ }
  }
  function injectStyle(){
    if(document.getElementById('ceDuplicateStyleV314')) return;
    const style = document.createElement('style');
    style.id = 'ceDuplicateStyleV314';
    style.textContent = `.ce-duplicate-highlight{outline:3px solid rgba(220,38,38,.75)!important; box-shadow:0 0 0 6px rgba(220,38,38,.12)!important; transition:outline .2s, box-shadow .2s;}`;
    document.head.appendChild(style);
  }
  function install(){
    injectStyle();
    document.addEventListener('click', guard, true);
    document.addEventListener('submit', guard, true);
    wrapFunction('addPersona', TABLES.persona, 'add');
    wrapFunction('addEvento', TABLES.evento, 'add');
    wrapFunction('addTienda', TABLES.tienda, 'add');
    wrapFunction('addProducto', TABLES.producto, 'add');
    wrapSaveEventRecord();
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, {once:true});
  else install();
  window.ControlEventDuplicateGuard = {version: VERSION, checkAdd:blockAdd, checkSave:blockSave};
  window.addEventListener('controlevent:runtime-ready', () => { wrapSaveEventRecord(); });
})();
