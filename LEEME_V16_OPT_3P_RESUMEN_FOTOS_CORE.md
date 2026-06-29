# ControlEvent v16_prod - OPT3P Resumen fotos TKxx core

Base: v16_opt_3O rebasada al comportamiento estable OPT3L/OPT3J para Resumen.
Versión visible: v16_prod.

Objetivo: corregir la gestión de fotos de TKxx en Resumen presupuestario sin añadir renders tardíos ni capas de normalización visual.

Cambios:

1. Backend
- `services/ticket-images.service.js` ahora pasa `tk` al borrado real.
- `lib/supabase-normalized.js` corrige la detección de TKxx en servidor. Había una expresión regular dañada con caracteres de retroceso, por eso borrar por TK no encontraba filas.
- El borrado y la sustitución vuelven a funcionar por evento + TKxx, no solo por clave exacta.

2. Resumen / Por tienda y ticket
- Se deja de cargar el parche OPT3O que reescribía acciones con MutationObserver.
- Las acciones de foto se generan desde el render estable del Resumen, no como capa tardía.
- Clip y papelera salen disponibles desde el render de la fila.
- La papelera pide confirmación en el primer clic útil.
- Adjuntar limpia caché de filas e índice de imágenes para no recuperar la miniatura anterior.

3. Cachés
- `v16-opt3f-resumen-hardlock.js` ahora incluye la firma de imagen real, no solo el número de imágenes. Así, si se sustituye una foto por otra y el número de fotos no cambia, no reutiliza la fila antigua.
- Se expone `ControlEventOpt3F.clearCaches()` para que las acciones de foto invaliden el bloque de Resumen.

4. Visor de foto ampliada
- Se fuerza el botón Cerrar abajo a la derecha cuando el modal contiene imagen.

No se toca:
- login
- selector de evento
- `/api/state`
- gráficas
- compras
- ingresos
- donaciones
- documentos
- planificación
- AVANCE DEL EVENTO
