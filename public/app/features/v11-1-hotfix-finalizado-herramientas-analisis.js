/* ControlEvent v11.1_prod - Hotfix: herramientas de análisis/generales disponibles con evento Finalizado.
   Alcance mínimo: Gemini libre desde GRAFICAS, INFOEVENTO/BACKUP y mantenimiento general.
   No cambia permisos por rol; solo evita que la situación Finalizado bloquee herramientas de consulta/generales. */
(function(){
  'use strict';
  if(window.__ceV111FinalizadoHerramientasAnalisis) return;
  window.__ceV111FinalizadoHerramientasAnalisis = true;

  var TOOL_IDS = ['btnExportExcel','btnExportSeed','btnToggleMaintenance','ceGeminiLibreBtn'];
  function $(id){ return document.getElementById(id); }
  function txt(v){ return v == null ? '' : String(v); }
  function up(v){ return txt(v).trim().toUpperCase(); }
  function stateObj(){ try{ return (typeof state !== 'undefined' && state) || window.state || {}; }catch(_){ return window.state || {}; } }
  function rows(k){ var s=stateObj(); return Array.isArray(s[k]) ? s[k] : []; }
  function selectedEventId(){ return txt((stateObj().selectedEventId) || (($('selectedEvent')||{}).value) || '').trim(); }
  function selectedEvent(){ var id=selectedEventId(); return rows('eventos').find(function(e){ return txt(e.id).trim() === id; }) || null; }
  function isFinalizado(){ return up((selectedEvent()||{}).situacion) === 'FINALIZADO'; }
  function role(){ return up((stateObj().authUser||{}).nivel || (stateObj().authUser||{}).role || (window.authUser||{}).nivel || ''); }
  function isGD(){ return role() === 'GD' || role() === 'ADMIN' || role() === 'ROOT'; }
  function isRW(){ return role() === 'RW'; }

  function unlock(el){
    if(!el) return;
    try{ el.disabled = false; }catch(_){ }
    try{ el.readOnly = false; }catch(_){ }
    try{ el.removeAttribute('disabled'); el.removeAttribute('readonly'); el.removeAttribute('aria-disabled'); }catch(_){ }
    try{ el.classList.remove('locked','app-locked','ce-v225-ro-disabled','ce-finalizado-disabled','disabled'); }catch(_){ }
    try{ el.style.pointerEvents = 'auto'; el.style.opacity = '1'; el.style.filter = 'none'; el.style.visibility = 'visible'; }catch(_){ }
  }

  function allowTools(){
    TOOL_IDS.forEach(function(id){ unlock($(id)); });
    document.querySelectorAll('.mobile-menu-action[data-target="btnExportExcel"],.mobile-menu-action[data-target="btnExportSeed"],.mobile-menu-action[data-target="btnToggleMaintenance"],.mobile-menu-action[data-target="ceGeminiLibreBtn"]').forEach(unlock);
    var gem = $('ceGeminiLibreBtn');
    if(gem){
      try{ gem.title = 'Gemini libre del evento (análisis disponible aunque el evento esté Finalizado)'; }catch(_){ }
      unlock(gem);
    }
  }

  function openGeminiLibre(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }
    allowTools();
    if(!selectedEventId()){
      try{ alert('Selecciona un evento antes de consultar Gemini libre.'); }catch(_){ }
      return false;
    }
    var api = window.ControlEventV111GeminiLibre || window.ControlEventV110GeminiLibre;
    if(api && typeof api.open === 'function'){
      try{ api.open(); }catch(err){ console.error('[v11.1 hotfix Gemini libre]', err); try{ alert('No se pudo abrir Gemini libre: ' + (err && err.message || err)); }catch(_){ } }
    }else{
      try{ alert('Gemini libre todavía no ha terminado de cargarse. Espera un segundo y vuelve a pulsar.'); }catch(_){ }
    }
    return false;
  }

  function toggleMaintenance(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }
    allowTools();
    var wrap = $('maintenanceWrapper');
    var btn = $('btnToggleMaintenance');
    if(!wrap) return false;
    var hidden = wrap.classList.contains('hidden');
    if(hidden){
      wrap.classList.remove('hidden');
      try{ btn && btn.classList.add('maint-btn-open'); btn && btn.classList.remove('maint-btn-closed'); }catch(_){ }
    }else{
      wrap.classList.add('hidden');
      try{ btn && btn.classList.remove('maint-btn-open'); btn && btn.classList.add('maint-btn-closed'); }catch(_){ }
    }
    try{ wrap.style.pointerEvents = 'auto'; wrap.style.opacity = '1'; wrap.style.filter = 'none'; }catch(_){ }
    return false;
  }

  function runInfoEvento(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }
    allowTools();
    var api = window.ControlEventV462 || window.ControlEventV461 || window.ControlEventV460;
    if(api && typeof api.directInfoEvento === 'function') return api.directInfoEvento();
    if(typeof window.exportExcel === 'function') return window.exportExcel();
    try{ alert('INFOEVENTO no está disponible todavía. Espera a que termine de cargar la app.'); }catch(_){ }
    return false;
  }

  function runBackup(ev){
    if(ev){ ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation(); }
    allowTools();
    if(!isGD()){
      try{ alert('La descarga BACKUP queda reservada a usuarios GD.'); }catch(_){ }
      return false;
    }
    var api = window.ControlEventV462 || window.ControlEventV461 || window.ControlEventV460;
    if(api && typeof api.directBackup === 'function') return api.directBackup();
    if(typeof window.exportSeedWorkbook === 'function') return window.exportSeedWorkbook();
    try{ alert('BACKUP no está disponible todavía. Espera a que termine de cargar la app.'); }catch(_){ }
    return false;
  }

  function handleClick(ev){
    var t = ev.target;
    if(!t || !t.closest) return;
    if(t.closest('#ceGeminiLibreBtn,.mobile-menu-action[data-target="ceGeminiLibreBtn"]')) return openGeminiLibre(ev);

    // En eventos finalizados estas herramientas son de consulta/globales, no de mantenimiento del evento concreto.
    if(!isFinalizado()) return;

    if(t.closest('#btnToggleMaintenance,.mobile-menu-action[data-target="btnToggleMaintenance"]')) return toggleMaintenance(ev);
    if(t.closest('#btnExportExcel,.mobile-menu-action[data-target="btnExportExcel"]')) return runInfoEvento(ev);
    if(t.closest('#btnExportSeed,.mobile-menu-action[data-target="btnExportSeed"]')) return runBackup(ev);
  }

  function injectStyle(){
    if($('ceV111FinalizadoHerramientasStyle')) return;
    var s = document.createElement('style');
    s.id = 'ceV111FinalizadoHerramientasStyle';
    s.textContent = [
      '#ceGeminiLibreBtn,#btnExportExcel,#btnExportSeed,#btnToggleMaintenance{pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important}',
      'body.ce-finalizado-consulta #ceGeminiLibreBtn,body.ce-v235-finalizado #ceGeminiLibreBtn,body.ce-event-finalizado-v40 #ceGeminiLibreBtn{pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important}',
      'body.ce-finalizado-consulta #btnExportExcel,body.ce-finalizado-consulta #btnExportSeed,body.ce-finalizado-consulta #btnToggleMaintenance{pointer-events:auto!important;opacity:1!important;filter:none!important;visibility:visible!important}',
      '.mobile-menu-action[data-target="btnExportExcel"],.mobile-menu-action[data-target="btnExportSeed"],.mobile-menu-action[data-target="btnToggleMaintenance"],.mobile-menu-action[data-target="ceGeminiLibreBtn"]{pointer-events:auto!important;opacity:1!important;filter:none!important}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function install(){
    injectStyle();
    allowTools();
    var api = window.ControlEventV111GeminiLibre || window.ControlEventV110GeminiLibre;
    if(api && typeof api.install === 'function'){
      try{ api.install(); }catch(_){ }
    }
    allowTools();
  }

  window.addEventListener('click', handleClick, true);
  document.addEventListener('change', function(ev){ if(ev.target && ev.target.id === 'selectedEvent') setTimeout(install, 60); }, true);
  ['DOMContentLoaded','load','controlevent:runtime-ready','controlevent:app-ready','controlevent:event-ready','controlevent:event-loaded','controlevent:module-mounted'].forEach(function(evt){
    window.addEventListener(evt, function(){ setTimeout(install, 60); });
  });
  try{
    new MutationObserver(function(){ install(); }).observe(document.documentElement, {childList:true, subtree:true, attributes:true, attributeFilter:['disabled','class','style','aria-disabled']});
  }catch(_){ }
  [0,150,500,1000,2000].forEach(function(ms){ setTimeout(install, ms); });
})();
