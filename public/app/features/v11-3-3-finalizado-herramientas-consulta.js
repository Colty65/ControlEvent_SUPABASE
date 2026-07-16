/* ControlEvent v22_prod - herramientas de consulta/maestros disponibles aunque el evento activo esté Finalizado.
   No desbloquea edición de datos del evento finalizado: solo Zuzu, BACKUP/Excel, Importación/descarga y mantenimientos generales. */
(function(){
  'use strict';
  if (window.__ceV1133FinalizadoHerramientasConsulta) return;
  window.__ceV1133FinalizadoHerramientasConsulta = true;

  const STYLE_ID = 'ce-v1133-finalizado-herramientas-consulta-style';
  const ROOTS = [
    '#maintenanceWrapper','#maintenancePanel','#mtPersonas','#mtEventos','#mtTiendas','#mtProductos','#mtAcceso','#mtImportar',
    '#ceGeminiLibreOverlay','#ceGeminiLibreOverlay *'
  ];
  const BUTTONS = [
    '#btnToggleMaintenance','#btnExportSeed','#btnExportExcel','#btnOpenImport','#btnStartImport','#btnClearImportStatus',
    '#mtPersonasBtn','#mtEventosBtn','#mtTiendasBtn','#mtProductosBtn','#mtAccesoBtn',
    '#ceGeminiLibreBtn','.ce-zuzu-open'
  ];
  const SAFE_SELECTOR = ROOTS.concat(BUTTONS, [
    '#maintenanceWrapper input','#maintenanceWrapper select','#maintenanceWrapper textarea','#maintenanceWrapper button',
    '#maintenancePanel input','#maintenancePanel select','#maintenancePanel textarea','#maintenancePanel button',
    '#ceGeminiLibreOverlay input','#ceGeminiLibreOverlay select','#ceGeminiLibreOverlay textarea','#ceGeminiLibreOverlay button',
    '#importWorkbookFile','#importTicketFiles','#importMode'
  ]).join(',');

  function $(id){ return document.getElementById(id); }
  function st(){ try { return window.state || window.appState || {}; } catch(_) { return {}; } }
  function selectedEvent(){
    try{
      const s = st();
      const sid = (typeof window.selectedEventId === 'function' && window.selectedEventId()) || s.selectedEventId || $('selectedEvent')?.value || '';
      const evs = Array.isArray(s.eventos) ? s.eventos : [];
      return evs.find(e => String(e.id) === String(sid)) || null;
    }catch(_){ return null; }
  }
  function isFinalizado(){ return String(selectedEvent()?.situacion || '').trim().toUpperCase() === 'FINALIZADO'; }

  let safeUntil = 0;
  function isSafeAreaTarget(t){
    try{
      return !!(t && t.closest && t.closest('#ceGeminiLibreOverlay,#maintenanceWrapper,#maintenancePanel,#mtPersonas,#mtEventos,#mtTiendas,#mtProductos,#mtAcceso,#mtImportar,#btnToggleMaintenance,#btnExportSeed,#btnExportExcel,#btnOpenImport,#ceGeminiLibreBtn,.ce-zuzu-open'));
    }catch(_){ return false; }
  }
  function markSafeTarget(t){ if(isSafeAreaTarget(t)){ safeUntil = Date.now() + 1200; } }
  function safeContextActive(){ return Date.now() < safeUntil || isSafeAreaTarget(document.activeElement); }
  function patchIsLockedContextual(){
    try{
      const old = (typeof window.isLocked === 'function' ? window.isLocked : (typeof isLocked === 'function' ? isLocked : null));
      if(!old || old.__ceV1133FinalToolsContextual) return;
      const wrapped = function(){
        try{ if(safeContextActive()) return false; }catch(_){ }
        return old.apply(this, arguments);
      };
      wrapped.__ceV1133FinalToolsContextual = true;
      wrapped.__ceOriginalIsLocked = old;
      window.isLocked = wrapped;
      try{ isLocked = wrapped; }catch(_){ }
    }catch(_){ }
  }
  function unlock(el){
    if (!el) return;
    try { el.disabled = false; el.readOnly = false; el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled'); el.removeAttribute('inert'); } catch(_) {}
    try { el.classList.remove('locked','app-disabled','disabled','is-locked','ce-v225-ro-disabled','hidden-by-role-v228'); } catch(_) {}
    try { el.style.setProperty('pointer-events','auto','important'); el.style.setProperty('opacity','1','important'); el.style.setProperty('filter','none','important'); el.style.setProperty('visibility','visible','important'); } catch(_) {}
  }
  function injectStyle(){
    if ($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.ce-v1133-finalizado-tools #btnToggleMaintenance,
      body.ce-v1133-finalizado-tools #btnExportSeed,
      body.ce-v1133-finalizado-tools #btnExportExcel,
      body.ce-v1133-finalizado-tools #btnOpenImport,
      body.ce-v1133-finalizado-tools #maintenanceWrapper,
      body.ce-v1133-finalizado-tools #maintenancePanel,
      body.ce-v1133-finalizado-tools #mtPersonas,
      body.ce-v1133-finalizado-tools #mtEventos,
      body.ce-v1133-finalizado-tools #mtTiendas,
      body.ce-v1133-finalizado-tools #mtProductos,
      body.ce-v1133-finalizado-tools #mtAcceso,
      body.ce-v1133-finalizado-tools #mtImportar,
      body.ce-v1133-finalizado-tools #ceGeminiLibreBtn,
      body.ce-v1133-finalizado-tools #ceGeminiLibreOverlay{
        pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important;
      }
      body.ce-v1133-finalizado-tools #maintenanceWrapper *,
      body.ce-v1133-finalizado-tools #ceGeminiLibreOverlay *{
        pointer-events:auto!important;opacity:1!important;filter:none!important;
      }
      body.ce-v1133-finalizado-tools #maintenanceWrapper input,
      body.ce-v1133-finalizado-tools #maintenanceWrapper select,
      body.ce-v1133-finalizado-tools #maintenanceWrapper textarea,
      body.ce-v1133-finalizado-tools #ceGeminiLibreOverlay textarea,
      body.ce-v1133-finalizado-tools #ceGeminiLibreOverlay input{
        pointer-events:auto!important;opacity:1!important;filter:none!important;user-select:text!important;-webkit-user-select:text!important;caret-color:auto!important;background:#fff!important;color:#111827!important;
      }
    `;
    document.head.appendChild(style);
  }
  function apply(){
    injectStyle();
    patchIsLockedContextual();
    const fin = isFinalizado();
    document.body.classList.toggle('ce-v1133-finalizado-tools', fin);
    if (!fin) return;
    try { document.querySelectorAll(SAFE_SELECTOR).forEach(unlock); } catch(_) {}
    ROOTS.concat(BUTTONS).forEach(sel => { try { document.querySelectorAll(sel).forEach(unlock); } catch(_) {} });
    ['maintenanceWrapper','maintenancePanel','mtPersonas','mtEventos','mtTiendas','mtProductos','mtAcceso','mtImportar','ceGeminiLibreOverlay'].forEach(id => {
      const root = $(id); unlock(root);
      try { root?.querySelectorAll('button,input,select,textarea,[contenteditable]').forEach(unlock); } catch(_) {}
    });
  }
  function around(ev){
    try{
      const t = ev && ev.target;
      markSafeTarget(t);
      patchIsLockedContextual();
      const root = t && t.closest && t.closest('#maintenanceWrapper,#maintenancePanel,#ceGeminiLibreOverlay,#mtPersonas,#mtEventos,#mtTiendas,#mtProductos,#mtAcceso,#mtImportar');
      if (root) { unlock(root); root.querySelectorAll('button,input,select,textarea,[contenteditable]').forEach(unlock); unlock(t); }
    }catch(_){}
  }
  ['focusin','keydown','keyup','beforeinput','input','pointerdown','mousedown','click','touchstart','touchend','pointerup'].forEach(name => {
    try { window.addEventListener(name, function(ev){ if (isFinalizado()) { markSafeTarget(ev && ev.target); patchIsLockedContextual(); } }, {capture:true, passive:false}); } catch(_) {}
    try { document.addEventListener(name, function(ev){ if (isFinalizado()) { around(ev); setTimeout(apply, 0); } }, true); } catch(_) {}
  });
  function wrapRenderLock(){
    try{
      const fn = window.renderLockState;
      if (typeof fn === 'function' && !fn.__ceV1133FinalToolsWrapped) {
        const w = function(){ const r = fn.apply(this, arguments); setTimeout(apply, 0); setTimeout(apply, 60); return r; };
        w.__ceV1133FinalToolsWrapped = true;
        window.renderLockState = w;
        try { renderLockState = w; } catch(_) {}
      }
    }catch(_){}
  }
  ['DOMContentLoaded','ce:state-loaded','ce:event-selected','ce:render','visibilitychange'].forEach(name => {
    try { document.addEventListener(name, function(){ wrapRenderLock(); apply(); }, true); } catch(_) {}
  });
  [50,150,400,900,1600,2600].forEach(ms => setTimeout(function(){ wrapRenderLock(); apply(); }, ms));
  setInterval(function(){ if (isFinalizado()) { wrapRenderLock(); apply(); } }, 900);
})();
