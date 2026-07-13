/* ControlEvent v20_prod FIX24 - modo reposo: reduce ventilador/longtasks en PC y móviles.
   No toca datos, fotos, permisos ni cálculos. */
(function(){
  'use strict';
  if(window.__ceV17Fix24IdleQuiet) return;
  window.__ceV17Fix24IdleQuiet = true;

  function byId(id){ return document.getElementById(id); }
  function clearPerfLiveNoise(){
    try{
      const perf = window.ControlEventPerf;
      if(perf && perf.state){
        perf.state.events = (perf.state.events || []).slice(-12);
        perf.state.recentEvents = (perf.state.recentEvents || []).slice?.(-12) || perf.state.recentEvents;
      }
    }catch(_){ }
  }
  function closeStaleTransientUi(){
    try{
      // No tocar modales/fotos visibles. Solo eliminar globos/tips huérfanos que no estén abiertos/activos.
      document.querySelectorAll('.ce-v17-orphan-tip,[data-ce-transient="orphan"]').forEach(n => n.remove());
    }catch(_){ }
  }
  function status(){
    const p = window.ControlEventPerf?.report?.();
    return {
      version:'v20_prod_fix24_idle_quiet',
      nodes:p?.last?.dom?.nodes || document.getElementsByTagName('*').length,
      longTasks:p?.counters?.longTasks,
      domMutations:p?.counters?.domMutations,
      lowResource:window.ControlEventLowResource?.stats || null,
      note:'PERF ya no repinta automáticamente; usar botón Actualizar para medir.'
    };
  }
  window.ControlEventFix24IdleQuiet = {version:'v20_prod_fix24_idle_quiet', status, quiet:function(){ clearPerfLiveNoise(); closeStaleTransientUi(); return status(); }};

  window.addEventListener('controlevent:event-loaded', () => setTimeout(clearPerfLiveNoise, 1200), true);
  document.addEventListener('visibilitychange', () => { if(document.visibilityState === 'visible') setTimeout(clearPerfLiveNoise, 300); }, true);
})();
