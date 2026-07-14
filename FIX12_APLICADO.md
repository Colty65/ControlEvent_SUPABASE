# CE_v21_PROD_BASE_FIX12

Base: CE_v21_PROD_BASE_FIX11.

Corrección aplicada:
- Arreglado el fallo del planificador Zuzu: en `buildZuzuPlanningCatalog` se devolvía `eventos` sin definir.
- Ahora se entrega al planificador el catálogo mínimo con `eventos: events`, por lo que Gemini puede decidir módulos/filtros/alcance antes de que ControlEvent extraiga datos.
- No se toca logon, selector, avance, resumen, ingresos, vista aérea ni rendimiento.

Validación:
- `node --check services/event-context.service.js`
- `node --check services/event-ai.service.js`
- prueba de importación de `buildZuzuPlanningCatalog` y `buildZuzuLocalPlan`.
