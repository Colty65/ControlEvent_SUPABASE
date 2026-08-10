/* ControlEvent v27_prod_1.1 - v8.4 ticket image hydrator disabled by FIX6.
   Motivo: Resumen/Cálculos usa el controlador único v17. Evita rehidrataciones antiguas,
   renderBudget repetidos y recuperación de URLs viejas de TKxx. */
(function(){
  'use strict';
  window.__ceV821TicketImagesVisibleAfterEvent = true;
  window.ControlEventV821TicketImages = {
    version:'v27_prod_1.1_v821_disabled_fix6',
    hydrate:function(){ return Promise.resolve(false); },
    refresh:function(){ return 0; },
    findImage:function(){ return ''; }
  };
})();
