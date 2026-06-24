# ControlEvent v15_prod

Corrección precisa de protección Excel y limpieza de standalones modulares.

## Cambios

- La protección de hojas Excel ahora activa también protección de objetos/dibujos (`objects:false`, `scenarios:false`, que en ExcelJS genera `objects="1"` y bloquea dibujos).
- Evita que los parches legacy de `writeBuffer()` reconstruyan RESUMEN/GRAFICAS dentro de los Excel standalone modulares.
- Los Excel standalone de consola se marcan con `__ceModularStandaloneClean` para no arrastrar hojas cruzadas.
- INFOEVENTO permanece limpio: no se añaden RESUMEN_MODULAR ni GRAFICAS_MODULAR.

## Prueba

1. Generar INFOEVENTO y comprobar que en RESUMEN y GRAFICAS no se pueden seleccionar/eliminar gráficos.
2. Ejecutar `ControlEventResumenSheet.downloadStandalone()` y verificar una sola hoja RESUMEN, protegida.
3. Ejecutar `ControlEventGraficasSheet.downloadStandalone()` y verificar una sola hoja GRAFICAS, protegida.
