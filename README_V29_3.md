# ControlEvent v29.3

Versión de limpieza visual basada en **v29.2**, que fue la versión donde se corrigió la lentitud en iPad y Android.

## Objetivo

Mantener la fluidez conseguida en v29.2, pero ocultar el indicador `LITE ON` y el contador en el uso normal.

## Cambios principales

- El modo LITE/turbo sigue funcionando en iPad y Android.
- El indicador de diagnóstico ya no aparece en producción.
- El panel de diagnóstico solo se muestra usando `?ceDiag=1`.
- Se actualiza la versión visible a **ControlEvent v29.3**.
- Se actualiza el cache del service worker a `controlevent-shell-v29-3`.
- No se modifica la lógica de datos, BACKUP, INFOEVENTOS, Excel ni formularios.

## Comprobación rápida

- PC e iPhone: sin indicador visible.
- iPad y Android: sin indicador visible, pero con la fluidez de v29.2.
- Diagnóstico opcional: añadir `?ceDiag=1` a la URL.

## Notas

`?ceLite=1` fuerza el modo ligero y `?ceLite=0` lo desactiva para comparación técnica.
