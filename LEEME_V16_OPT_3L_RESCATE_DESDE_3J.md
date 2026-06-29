# ControlEvent v16_prod - OPT3L REBASE / RESCATE DESDE OPT3J

Versión visible mantenida: **v16_prod**.

Este paquete retira completamente la línea OPT3K, porque introdujo efectos no aceptables en Resumen presupuestario:

- botones duplicados de adjuntar/eliminar,
- miniaturas repetidas,
- eliminación/sustitución de foto no fiable,
- recuperación de miniaturas antiguas,
- vibraciones y repintados feos en Resumen.

## Base usada

Se ha reconstruido desde **OPT3J**, que era la última base previa a OPT3K.

## Qué conserva

- OPT1: carga/cambio de evento.
- OPT2J: gráficas V46 estables.
- OPT3F/OPT3G: Resumen con donaciones clicables rápidas.
- Reposo PC de OPT3J.

## Qué se elimina

- `v16-opt3k-resumen-fotos-y-reposo.js`.
- Cualquier referencia de carga a `v16-opt3k...`.

## Qué NO toca

- Login.
- Selector de evento.
- `/api/state`.
- Compras.
- Ingresos.
- Donaciones como módulo.
- Documentos.
- Tickets.
- AVANCE.
- Planificación inicial.

## Objetivo

Volver a una base funcional, sin la degradación visual y operativa introducida por OPT3K. A partir de aquí, cualquier corrección de foto de ticket en Resumen deberá hacerse en el módulo original de tickets/fotos, no mediante superposición de botones o interceptores globales.
