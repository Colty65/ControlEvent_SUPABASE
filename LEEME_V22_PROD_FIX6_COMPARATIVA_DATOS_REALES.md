# ControlEvent v22_prod FIX6 — comparativas con datos reales y PDF legible

Base: `CE_v22_PROD_FIX5_INFORMES_USUARIO_COLTYLAB`.

## Correcciones

1. **Comparativas completas de varios eventos**
   - Cuando el usuario pide expresamente “toda la información” de varios eventos, los años, títulos y el estado del evento se usan para seleccionar el alcance, pero no para filtrar las filas de INGRESOS, COMPRAS, DONACIONES o TICKETS.
   - Se añade una recuperación automática sin filtros si un módulo queda a cero aunque el estado bruto tenga registros para los eventos solicitados.
   - Las cifras se calculan sobre los módulos oficiales de ControlEvent; las consultas SQL siguen siendo una comprobación interna.

2. **Ingresos cobrados y pendientes**
   - Solo BANCO, EFECTIVO y BIZUM se consideran cobrados.
   - PENDIENTE se conserva como ingreso previsto para la previsión al cierre, pero no como caja actual.

3. **PDF para usuario final**
   - “Consulta restringida” pasa a “Comparativa”.
   - La tabla única de 22 columnas se divide en:
     - Resumen económico por evento.
     - Participación y documentación por evento.
   - Las tablas impresas usan ajuste fijo, salto de palabra y tamaño reducido cuando son anchas, evitando columnas cortadas en A4.

4. **Caché**
   - Actualizada la marca del módulo Zuzu a `v22_prod_FIX6_COMPARATIVA_DATOS_REALES`.

## Validaciones realizadas

- Sintaxis Node/JavaScript comprobada en los servicios y en el módulo visual de Zuzu.
- Prueba sintética de tres eventos con un filtro erróneo `En curso`: FIX6 recupera correctamente INGRESOS, COMPRAS y DONACIONES de los tres eventos.
