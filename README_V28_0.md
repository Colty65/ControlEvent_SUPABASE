# ControlEvent v28.1

Optimización móvil: ExcelJS bajo demanda.

## Cambio principal

Se elimina la carga inicial de `/vendor/exceljs.min.js` desde `public/index.html`.
ExcelJS se cargará sólo cuando se ejecute una acción de Excel, especialmente INFOEVENTO.

## No se toca funcionalmente

- INFOEVENTO
- BACKUP / descarga de datos
- Carga de datos
- Ingresos / Compras / Donaciones
- Mantenimiento real
- Tickets/fotos

## Pruebas recomendadas

1. Abrir app normal.
2. Activar debug si se quiere medir: `await ControlEventDebug.enable()`.
3. Ejecutar `ControlEventMobilePerformance.quick()` antes de generar Excel: `excelJsAtStart` debería ser `false`.
4. Generar INFOEVENTO y comprobar que sigue correcto.
5. Ejecutar `ControlEventExcel.info().excelJs` para ver la carga bajo demanda.

## Archivos legacy antiguos

Si siguen en GitHub, pueden borrarse los bundles v27.9 cuando v28.0 esté probada.
