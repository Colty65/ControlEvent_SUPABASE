# ControlEvent v16_prod

Corrección conservadora sobre v28.1.

## Objetivo

Evitar el error rojo de guardado `/api/state 500` por claves duplicadas en `ce_eventos_pkey`.

## Cambios

- Normalización defensiva en cliente antes de enviar `/api/state`.
- Refuerzo en backend: normalización por clave primaria y `upsert` tras reemplazo de tabla.
- Mantiene ExcelJS bajo demanda, BACKUP servidor e INFOEVENTO estable.

## No toca funcionalmente

- INFOEVENTO
- BACKUP
- Carga de datos
- Formularios reales
- Mantenimiento real
