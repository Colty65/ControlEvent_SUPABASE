# Auditoría · Zuzu ITV ORÁCULO de ejecución + capabilities + COMPRAS/DONACIONES

Fecha: 23/08/2026
Versión: ControlEvent v4_0_exp

## Cambios auditados

### Zuzu / ITV
- El oráculo contrasta las expectativas contra el DATASET realmente ejecutado (dominio, scope/evento, filas) y no solo contra el PLAN emitido por Gemini.
- Se valida también el tipo de respuesta (`amount`, `whether`, `context`, `conversation_summary`) cuando el oráculo lo exige.
- Se incorporan capabilities semánticas por dominio para resolver roles de negocio (`person`, `responsible`, `donor`, `product`, `event`, `store`, `ticket`) y métricas (`amount`, `units`, `count`) hacia campos físicos reales del DATASET.
- `rank` y `compare` pueden usar roles/métricas en vez de depender del nombre literal de una columna.
- Las entidades tipadas se filtran sobre el DATASET materializado cuando la fuente canónica no tiene filtro físico equivalente (por ejemplo persona dentro de asistencia).
- Una continuación compatible usa primero el contexto actual; el recall histórico global se reserva para selección explícita o cuando el contexto inmediato no basta.
- Una selección histórica pendiente no secuestra una pregunta nueva que no sea una respuesta de selección.
- `whether` puede contestar sobre una entidad concreta materializada en el DATASET.
- `conversation_summary` genera prosa humana a partir del ledger en vez de enumerar etiquetas técnicas.

### COMPRAS / DONACIONES · registro de mantenimiento
- El Responsable de EDITAR usa el mismo origen global `socioResponsableOptions()` que el Responsable de AÑADIR: todos los registros con rango SOCIO, incluidos nombres individuales y parejas dadas de alta como SOCIO.
- Si Producto, Tienda, Donante, Responsable o Ticket/Tipo conservan un valor grabado que ya no está en el catálogo/lista actualmente visible, EDITAR inyecta ese valor como opción seleccionada en vez de mostrar el campo vacío.
- Las filas de DONACIONES usan el contrato correcto `edit-donacion-*`, `save-donacion` y `delete-donacion`; antes el renderer de mantenimiento podía mezclarlas con las acciones de compra.
- Se mantienen alias snake_case/camelCase al reconstruir el formulario de edición.

## Regresiones ejecutadas

- `test:zuzu-ledger`: OK
  - pseudocódigo disperso
  - capacidades tipadas
  - VIEW multioperación
  - filtros tipados sobre DATASET
  - 923 filas
  - SCC multievento
  - comparación
  - memoria histórica
- `test:zuzu-itv-oracle`: OK
  - incluye caso PLAN correcto pero DATASET ejecutado con dominio/evento incorrecto => KO
  - incluye `amount` sin importe explícito => KO
- `test:zuzu-history-ranking`: OK
- `test:zuzu-itv-excel`: OK (21/21 + 33/33)
- `test:zuzu-invariants`: 158 OK / 0 KO
- `test:zuzu-router:observed`: OK
- `test:zuzu-router:dry`: 100 mensajes OK, sin llamada a Gemini ni CE
- `test:compras-donaciones-maintenance`: OK
- Sintaxis JS global: 234 ficheros OK

Nota de entorno: para ejecutar las suites que importan `event-ai.service.js` se usaron stubs locales mínimos de las dependencias externas durante la auditoría, porque el ZIP no incluye `node_modules`. Esos stubs y `node_modules` no se incluyen en el artefacto final.

## Limitación

No se ha ejecutado aquí la batería completa de 21+33 turnos contra Gemini real. La auditoría cubre la lógica determinista, contratos, invariantes y regresiones internas. La comprobación E2E de interpretación IA debe hacerse en ITV FULL-CERT desplegada.
