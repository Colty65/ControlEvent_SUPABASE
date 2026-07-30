# ControlEvent v25_prod · FIX3

## Objetivo

Corrección conjunta de la operativa de **Cuadre Banco**, la presentación de movimientos pertenecientes a otros eventos y los globos de **GRAFICAS / Resumen presupuestario**.

## Cuadre Banco

- Eliminado el capturador global de `pointerdown/click` que impedía que los controles recibieran el gesto del usuario.
- Recuperado el funcionamiento nativo de:
  - Cargar CSV.
  - Cuenta bancaria.
  - Vista de control.
  - Orden temporal.
  - Búsqueda de movimientos.
- `Cargar CSV` utiliza `showPicker()` cuando el navegador lo admite y `input.click()` como alternativa.
- Cabeceras visibles en escritorio:
  - **Movimientos bancarios**.
  - **Tickets justificantes del mvto bancario**.
- La ficha se divide en dos zonas estables y los importes ya no invaden la conciliación.
- Los TKxx se ordenan por evento y número de ticket.

## Movimientos que pertenecen a otro evento

Cuando un movimiento entra en el periodo del evento activo por coincidencia de fechas, pero ya está conciliado en otro evento:

- Se muestra el TKxx existente.
- Se muestra el nombre del evento propietario.
- Aparece inicialmente **Inactivo** en el evento actual.
- No puede activarse en `En saldo` ni recibir nuevos TKxx desde el evento actual.
- El buscador también localiza el movimiento por el TKxx o por el nombre del otro evento.

Esta protección evita imputar el mismo movimiento bancario a dos eventos distintos.

## GRAFICAS y Resumen presupuestario

- Eliminado el globo oscuro duplicado creado en FIX2.
- Se utiliza un único globo canónico (`ceTooltipV21`).
- El globo queda fijado al pulsar y solo se cierra mediante:
  - Su botón `×`.
  - La tecla `Escape`.
  - La selección de otro dato, que reemplaza el contenido anterior.
- Salir con el ratón o pulsar fuera ya no lo hace desaparecer.
- La información respeta el orden:
  1. Cabecera.
  2. Detalle.
  3. Total al final.
- Se elimina la ordenación global que separaba títulos, líneas y totales.

## Despliegue

1. Sustituir el proyecto completo por el contenido del ZIP.
2. Desplegar en GitHub/Vercel.
3. Realizar una recarga completa con `Ctrl + F5`.

No requiere SQL nuevo sobre la instalación de v25_prod FIX2.

## Pruebas incluidas

- Periodos inclusivos, saldos, abonos, cargos y exclusión por evento.
- CSV con 2.500 movimientos desde enero de 2024.
- Paginación de 5.000 movimientos.
- Controles sin captura en `window`.
- Movimiento de otro evento visible con TKxx, título, inactivo y bloqueado.
- INFOEVENTO limitado a `En saldo`.
- Globo único persistente y orden cabecera-detalle-total.
