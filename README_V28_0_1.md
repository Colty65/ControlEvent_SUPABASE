# ControlEvent v16_prod

Corrección conservadora sobre v28.0.

## Motivo

En consola aparecía un `PUT /api/state 500` con error de clave duplicada en Supabase (`ce_eventos_pkey`).

## Corrección

El backend normaliza las filas por clave primaria antes de guardar cada colección. Si el estado recibido contiene IDs duplicados, conserva el último registro recibido y evita que Supabase rechace todo el guardado por una clave duplicada.

No cambia funcionalmente INFOEVENTO, BACKUP, carga de datos, formularios, mantenimiento ni tickets.

## Móvil

Se mantiene la mejora de v28.0: ExcelJS sigue en modo lazy/bajo demanda.
