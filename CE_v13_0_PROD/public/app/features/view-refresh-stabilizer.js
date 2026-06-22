/* ControlEvent v13.0_prod - RESCATE ESTABLE
   Este mÃ³dulo sustituye el estabilizador anterior porque repintaba varias veces la vista activa
   al cambiar de menÃº/evento y provocaba temblores, pÃ©rdida de foco en buscadores y cargas duplicadas.
   No hace render automÃ¡tico ni intervalos. Se deja solo una API manual por compatibilidad. */
(function(){
  'use strict';
  if(window.__ceViewRefreshStabilizerStable1043) return;
  window.__ceViewRefreshStabilizerStable1043 = true;
  const VERSION = 'ControlEvent v13.0_prod';
  const stats = {version: VERSION, installed: true, mode: 'disabled-auto-refresh', hydrations: 0, schedules: 0};
  function getFn(name){ try{ return typeof window[name] === 'function' ? window[name] : null; }catch(_){ return null; } }
  function hydrate(tab, reason){
    // Solo bajo llamada manual explÃ­cita de consola o desde otro mÃ³dulo, nunca por timers.
    stats.hydrations += 1;
    try{
      const fn = tab === 'ingresos' ? getFn('renderColabs') :
        tab === 'donaciones' ? getFn('renderDonaciones') :
        tab === 'compras' ? getFn('renderCompras') :
        tab === 'mapa' ? getFn('renderMapaProductos') :
        tab === 'resumen' ? getFn('renderBudget') :
        tab === 'graficas' ? getFn('renderGraficas') : null;
      if(fn) fn();
    }catch(error){ console.warn('[CE v10.4.3] hydrate manual fallÃ³:', reason, error); }
  }
  window.ControlEventViewRefreshStabilizer = {version: VERSION, stats, hydrate, schedule: function(){ stats.schedules += 1; }, inspect: function(){ return {...stats}; }};
})();
