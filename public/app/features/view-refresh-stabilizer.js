/* ControlEvent v18_prod - RESCATE ESTABLE
   Este módulo sustituye el estabilizador anterior porque repintaba varias veces la vista activa
   al cambiar de menú/evento y provocaba temblores, pérdida de foco en buscadores y cargas duplicadas.
   No hace render automático ni intervalos. Se deja solo una API manual por compatibilidad. */
(function(){
  'use strict';
  if(window.__ceViewRefreshStabilizerStable1043) return;
  window.__ceViewRefreshStabilizerStable1043 = true;
  const VERSION = 'ControlEvent v18_prod';
  const stats = {version: VERSION, installed: true, mode: 'disabled-auto-refresh', hydrations: 0, schedules: 0};
  function getFn(name){ try{ return typeof window[name] === 'function' ? window[name] : null; }catch(_){ return null; } }
  function hydrate(tab, reason){
    // Solo bajo llamada manual explícita de consola o desde otro módulo, nunca por timers.
    stats.hydrations += 1;
    try{
      const fn = tab === 'ingresos' ? getFn('renderColabs') :
        tab === 'donaciones' ? getFn('renderDonaciones') :
        tab === 'compras' ? getFn('renderCompras') :
        tab === 'mapa' ? getFn('renderMapaProductos') :
        tab === 'resumen' ? getFn('renderBudget') :
        tab === 'graficas' ? getFn('renderGraficas') : null;
      if(fn) fn();
    }catch(error){ console.warn('[CE v10.4.3] hydrate manual falló:', reason, error); }
  }
  window.ControlEventViewRefreshStabilizer = {version: VERSION, stats, hydrate, schedule: function(){ stats.schedules += 1; }, inspect: function(){ return {...stats}; }};
})();
