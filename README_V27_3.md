# ControlEvent v27.3 - RESUMEN modular integrado en INFOEVENTO en modo auditoría

Versión progresiva sobre v27.2.2.

## Objetivo

Integrar el escritor modular de RESUMEN dentro del flujo real de INFOEVENTO sin sustituir todavía la hoja RESUMEN legacy.

## Qué cambia

Al generar INFOEVENTO, el Excel mantiene la hoja `RESUMEN` clásica y añade una hoja nueva:

- `RESUMEN_MODULAR`

Esta hoja se genera desde `public/modules/excel/resumen-sheet.js` usando el escritor modular real de v27.2.

## Por qué se hace así

Permite comparar:

- `RESUMEN` legacy estable
- `RESUMEN_MODULAR` nuevo

sin arriesgar la exportación principal.

## Consola

```js
ControlEventResumenSheet.auditConfig()
ControlEventResumenSheet.enableInfoEventoAudit(false) // desactiva hoja RESUMEN_MODULAR
ControlEventResumenSheet.enableInfoEventoAudit(true)  // vuelve a activarla
ControlEventExcel.resumenAuditConfig()
```

## Siguiente paso

Si `RESUMEN_MODULAR` coincide con el RESUMEN clásico, en v27.4 se podrá plantear la sustitución parcial o total de la hoja RESUMEN legacy.
