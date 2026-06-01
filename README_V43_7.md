# ControlEvent v50.24

Correcciones sobre v43.6:

- Modificación de COMPRAS y DONACIONES sin falso bloqueo por duplicidad al editar registros existentes.
- Ocultación del globo permanente de borrado cuando no se está sobre un botón de eliminar.
- Mapa de recursos reordenado: VALORACION DEL EVENTO, DONACION DE PRODUCTO (estimado), COMPRAS y SALDO LÍMITE.
- SALDO LÍMITE calcula los ingresos totales previstos del evento: importes ingresados + pendientes.
- Exportación INFOEVENTO y BACKUP protegidas contra el error `RangeError: Maximum call stack size exceeded`.
- Nuevo interceptor v43.7 para exportaciones seguras y actualización de versión en cabecera, PWA y descargas.
