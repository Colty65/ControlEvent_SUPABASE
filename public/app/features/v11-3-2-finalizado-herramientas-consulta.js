/* ControlEvent v11_3_2_prod - HOTFIX: herramientas de consulta/maestros disponibles aunque el evento activo esté Finalizado.
   No desbloquea edición de datos del evento finalizado: solo Zuzu, BACKUP/Excel y mantenimientos generales. */
(function(){
  'use strict';
  if (window.__ceV1132FinalizadoHerramientasConsulta) return;
  window.__ceV1132FinalizadoHerramientasConsulta = true;
  const STYLE_ID = 'ce-v1132-finalizado-herramientas-consulta-style';
  const SAFE_SELECTORS = [
    '#btnToggleMaintenance', '#btnExportSeed', '#btnExportExcel',
    '#maintenancePanel', '#mtPersonas', '#mtEventos', '#mtTiendas', '#mtProductos', '#mtAcceso',
    '#mtPersonasBtn', '#mtEventosBtn', '#mtTiendasBtn', '#mtProductosBtn', '#mtAccesoBtn',
    '#ceGeminiLibreBtn', '#ceGeminiLibreOverlay', '#ceGeminiLibreOverlay *',
    '.ce-zuzu-open', '.ce-zuzu-open *',
    '#maintenancePanel input', '#maintenancePanel select', '#maintenancePanel textarea', '#maintenancePanel button',
    '#ceGeminiLibreOverlay input', '#ceGeminiLibreOverlay select', '#ceGeminiLibreOverlay textarea', '#ceGeminiLibreOverlay button'
  ];
  function $(id){ return document.getElementById(id); }
  function selectedEvent(){
    try{
      const st = window.state || window.appState || {};
      const sid = (window.selectedEventId && window.selectedEventId()) || st.selectedEventId || $('selectedEvent')?.value || '';
      const evs = Array.isArray(st.eventos) ? st.eventos : [];
      return evs.find(e => String(e.id) === String(sid)) || null;
    }catch(_){ return null; }
  }
  function isFinalizado(){
    const ev = selectedEvent();
    return String(ev?.situacion || '').trim().toUpperCase() === 'FINALIZADO';
  }
  function unlock(el){
    if (!el) return;
    try{ el.disabled = false; el.readOnly = false; el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled'); el.removeAttribute('inert'); }catch(_){ }
    try{ el.classList.remove('locked','app-disabled','disabled','is-locked','ce-v225-ro-disabled'); }catch(_){ }
    try{ el.style.setProperty('pointer-events','auto','important'); el.style.setProperty('opacity','1','important'); el.style.setProperty('filter','none','important'); el.style.setProperty('visibility','visible','important'); }catch(_){ }
  }
  function injectStyle(){
    if ($(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      body.ce-v1132-finalizado-tools #btnToggleMaintenance,
      body.ce-v1132-finalizado-tools #btnExportSeed,
      body.ce-v1132-finalizado-tools #btnExportExcel,
      body.ce-v1132-finalizado-tools #maintenancePanel,
      body.ce-v1132-finalizado-tools #mtPersonas,
      body.ce-v1132-finalizado-tools #mtEventos,
      body.ce-v1132-finalizado-tools #mtTiendas,
      body.ce-v1132-finalizado-tools #mtProductos,
      body.ce-v1132-finalizado-tools #mtAcceso,
      body.ce-v1132-finalizado-tools #ceGeminiLibreBtn,
      body.ce-v1132-finalizado-tools #ceGeminiLibreOverlay{
        pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important;
      }
      body.ce-v1132-finalizado-tools #mtPersonas *,
      body.ce-v1132-finalizado-tools #mtEventos *,
      body.ce-v1132-finalizado-tools #mtTiendas *,
      body.ce-v1132-finalizado-tools #mtProductos *,
      body.ce-v1132-finalizado-tools #mtAcceso *,
      body.ce-v1132-finalizado-tools #ceGeminiLibreOverlay *{
        pointer-events:auto!important;opacity:1!important;filter:none!important;
      }
      body.ce-v1132-finalizado-tools .footer{pointer-events:auto!important;}
      body.ce-v1132-finalizado-tools #maintenancePanel input,
      body.ce-v1132-finalizado-tools #maintenancePanel select,
      body.ce-v1132-finalizado-tools #maintenancePanel textarea,
      body.ce-v1132-finalizado-tools #ceGeminiLibreOverlay textarea{
        pointer-events:auto!important;opacity:1!important;filter:none!important;user-select:text!important;caret-color:auto!important;background:#fff!important;
      }
    `;
    document.head.appendChild(style);
  }
  function apply(){
    injectStyle();
    document.body.classList.toggle('ce-v1132-finalizado-tools', isFinalizado());
    SAFE_SELECTORS.forEach(sel => {
      try{ document.querySelectorAll(sel).forEach(unlock); }catch(_){ }
    });
    ['btnToggleMaintenance','btnExportSeed','btnExportExcel','ceGeminiLibreBtn'].forEach(id => unlock($(id)));
    ['maintenancePanel','mtPersonas','mtEventos','mtTiendas','mtProductos','mtAcceso','ceGeminiLibreOverlay'].forEach(id => {
      const root = $(id);
      unlock(root);
      try{ root?.querySelectorAll('button,input,select,textarea,[contenteditable]').forEach(unlock); }catch(_){ }
    });
  }
  function unlockAroundTarget(ev){
    try{
      const t = ev && ev.target;
      if (!t || !t.closest) return;
      const root = t.closest('#maintenancePanel,#ceGeminiLibreOverlay,#mtPersonas,#mtEventos,#mtTiendas,#mtProductos,#mtAcceso');
      if (root) { unlock(root); root.querySelectorAll('button,input,select,textarea,[contenteditable]').forEach(unlock); unlock(t); }
    }catch(_){ }
  }
  document.addEventListener('focusin', unlockAroundTarget, true);
  document.addEventListener('keydown', unlockAroundTarget, true);
  document.addEventListener('input', unlockAroundTarget, true);
  document.addEventListener('pointerdown', unlockAroundTarget, true);
  document.addEventListener('click', function(ev){
    const t = ev.target && ev.target.closest && ev.target.closest('#btnToggleMaintenance,#btnExportSeed,#btnExportExcel,#ceGeminiLibreBtn,#mtPersonas,#mtEventos,#mtTiendas,#mtProductos,#mtAcceso');
    if (t) setTimeout(apply, 0);
  }, true);
  ['DOMContentLoaded','ce:state-loaded','ce:event-selected','ce:render','visibilitychange'].forEach(name => {
    try{ document.addEventListener(name, apply, true); }catch(_){ }
  });
  [80,250,800,1800].forEach(ms => setTimeout(apply, ms));
  // Sin observadores agresivos: un refuerzo suave cada 1,2 s solo mientras el evento activo esté Finalizado.
  setInterval(function(){ if(isFinalizado()) apply(); }, 1200);
})();
