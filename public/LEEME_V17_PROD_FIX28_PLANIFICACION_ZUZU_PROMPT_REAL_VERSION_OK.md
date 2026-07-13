# ControlEvent v20_prod FIX28_PLANIFICACION — versión corregida visible

Base: v20_prod_FIX27 recuperada + ajuste de Planificación inicial.

Corrección sobre la entrega anterior:
- El globo ColtyLAB de bienvenida ahora muestra `v20_prod_FIX28_PLANIFICACION`, no FIX27.
- Se han actualizado las marcas `?v=` de `planificacion-inicial.js` y del módulo ColtyLAB para evitar caché antigua.
- El backend devuelve `version: v20_prod_FIX28_PLANIFICACION` en `/api/event-ai/planificacion-propuesta`.
- En las notas de Zuzu aparece una línea `FIX28_PLANIFICACION activo...` para verificar que se está ejecutando esta versión.

Cambio funcional mantenido:
- En `Encargo total a Zuzu`, si el prompt trae donaciones/existencias, esas líneas se cargan directamente, pero Zuzu interpreta también el resto del prompt: concepto, duración, días, comidas y preferencias.
- No se aplica el menú local fijo de seguridad paella/barbacoa si Zuzu no devuelve compras.

No tocado:
- GRAFICAS.
- RESUMEN PRESUPUESTARIO.
- Ordenación de globos.
- Login / bienvenida salvo etiqueta visible de versión y caché.
