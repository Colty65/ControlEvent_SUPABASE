/* ControlEvent v3_0_exp - v8.4 ticket image hydrator disabled by FIX6.
   Motivo: Resumen/Cálculos usa el controlador único v17. Evita rehidrataciones antiguas,
   renderBudget repetidos y recuperación de URLs viejas de TKxx. */
(function(){
  'use strict';
  window.__ceV821TicketImagesVisibleAfterEvent = true;
  window.ControlEventV821TicketImages = {
    version:'v3_0_exp_v821_disabled_fix6',
    hydrate:function(){ return Promise.resolve(false); },
    refresh:function(){ return 0; },
    findImage:function(){ return ''; }
  };
})();
