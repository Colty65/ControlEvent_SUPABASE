# ControlEvent v29_prod

Base: `ControlEvent_v28.5.3_prod`.

## Cambio funcional

Se mejora la gráfica de conciliación bancaria de los informes de Zuzu:

- Cada movimiento muestra un globo unido a su punto con **concepto, importe, saldo resultante y justificación**.
- Los **abonos/ingresos** se identifican en **verde** y los **cargos** en **rojo**.
- En cargos, la justificación muestra los **TKxx** asociados; en abonos, el **ingreso/socio** que lo justifica cuando existe en los datos de conciliación.
- Cuando hay demasiados movimientos para mantener la lectura, la serie se divide automáticamente en tramos equilibrados, indicando `Movimientos X–Y de N`.
- La petición directa de “gráfica del cuadre bancario y otra de ingresos” sigue devolviendo únicamente esas dos visualizaciones.

## Identidad de versión

La versión visible y los nombres generados pasan a `v29_prod`, incluyendo:

- interfaz principal y bloqueo final de versión;
- PDF de Zuzu;
- INFOEVENTO, tanto en el nombre externo del fichero como en sus metadatos/contenido interno;
- BACKUP, tanto en el nombre externo del fichero como en sus metadatos/contenido interno;
- identificadores centrales de versión, build y ZIP.

Se conserva `ControlEvent_v28.5.3_prod` únicamente como prefijo legado de migración de almacenamiento para no perder preferencias/sesión al actualizar.

## Comprobaciones

- Sintaxis Node validada en el servicio de IA, render de Zuzu y hardlock v29.
- 8 pruebas específicas de regresión `v29_prod` superadas.
