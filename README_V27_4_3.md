# ControlEvent v27.4.4

Corrección menor sobre v27.4.2.

## Objetivo

Corregir la protección de hojas Excel en INFOEVENTO y en los Excel standalone modulares.

## Cambios

- `INFOEVENTO` aplica protección final a todas las hojas antes de descargar el libro.
- La protección usa la contraseña histórica `open_excel_arrastre`.
- Se protegen también las hojas generadas por las herramientas standalone:
  - `ControlEventResumenSheet.downloadStandalone()`
  - `ControlEventGraficasSheet.downloadStandalone()`
- Se expone en `ControlEventExcel`:
  - `protectWorkbook(workbook, options)`
  - `protectWorksheet(worksheet, options)`

## Prueba recomendada

1. Generar INFOEVENTO.
2. Abrir Excel.
3. Intentar modificar la hoja `RESUMEN`.
4. Intentar modificar `RESUMEN_MODULAR` y `GRAFICAS_MODULAR`.
5. Debe pedir/deshabilitar edición por protección de hoja.

## No cambia

- BACKUP.
- Carga de datos.
- Cálculos.
- Visual de la app.
- Estructura de hojas.
