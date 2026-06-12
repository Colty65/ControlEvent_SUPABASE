/* ControlEvent v8.5_prod FIX20 - BLOQUEO DE DELTAS AUTOMATICOS.
   La FIX19 intentaba deducir altas/bajas/modificaciones comparando snapshots del estado
   en el navegador. Eso NO es seguro en esta app legacy: durante renders/cambios de ventana
   puede haber estados parciales y se pueden interpretar como bajas reales.

   En FIX20 este módulo queda intencionadamente inactivo. Ningún click, refresco, login,
   cambio de pestaña o repintado del navegador puede enviar DELETE por diferencias.

   Regla vigente:
   - /api/state: guardado no destructivo, nunca borra por ausencia.
   - /api/crud-deltas: el servidor rechaza deletes automáticos.
   - Las bajas reales deberán implementarse después botón a botón con endpoint explícito.
*/
(function(){
  'use strict';
  window.ControlEventCrudSafeV85 = {
    version: 'v8.5_prod_fix20_auto_deltas_disabled',
    disabled: true,
    reason: 'Los deltas automáticos de FIX19 quedan anulados para impedir bajas por estado transitorio.',
    snapshot: () => ({}),
    diff: () => ({}),
    sync: async () => ({ok:true, disabled:true})
  };
  try { console.warn('[ControlEvent FIX20] Deltas CRUD automáticos desactivados.'); } catch(_) {}
})();
