# ControlEvent v16_prod - OPT3O Resumen fotos TKxx directas

Base: rebase desde OPT3L/OPT3J estable.

Alcance cerrado:
- No cambia la versión visible: v16_prod.
- No toca login, selector de eventos, /api/state, gráficas, compras, ingresos, donaciones, documentos, planificación ni AVANCE.
- Solo corrige acciones de fotos de TKxx dentro de Resumen presupuestario / Cálculos por tienda y ticket.

Cambios:
1. Sustituye los botones antiguos de foto de TKxx por botones directos normalizados al pintarse la lista.
2. Restaura confirmación real al eliminar.
3. La papelera y el clip quedan disponibles sin esperar a capas antiguas.
4. DELETE /api/ticket-images elimina por clave exacta y también por TKxx dentro del evento.
5. POST /api/ticket-images elimina variantes antiguas del TK antes de subir la nueva.
6. Se limpian referencias locales e IndexedDB de ese TK.
7. Las URLs se entregan con marca de caché para evitar volver a enseñar la imagen anterior.
8. El botón Cerrar del visor de foto se fuerza abajo a la derecha.

Nota: si el evento está Finalizado, el bloqueo de seguridad de datos puede impedir modificar fotos.
