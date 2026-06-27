# ControlEvent v16_prod - GRAFICAS modular integrado en INFOEVENTO en modo auditoría

Versión progresiva sobre v27.3.

## Objetivo

Integrar un escritor modular de GRAFICAS dentro del flujo real de INFOEVENTO sin sustituir todavía la hoja GRAFICAS legacy.

## Qué cambia

Al generar INFOEVENTO, el Excel mantiene las hojas clásicas:

- `RESUMEN`
- `GRAFICAS`

Y añade hojas modulares de auditoría:

- `RESUMEN_MODULAR`
- `GRAFICAS_MODULAR`

## Consola

```js
ControlEventGraficasSheet.preview()
ControlEventGraficasSheet.downloadStandalone()
ControlEventGraficasSheet.auditConfig()
ControlEventGraficasSheet.enableInfoEventoAudit(false)
ControlEventGraficasSheet.enableInfoEventoAudit(true)
ControlEventExcel.graficasAuditConfig()
```

## Siguiente paso

Si `GRAFICAS_MODULAR` cuadra frente a `GRAFICAS`, se podrá plantear en una versión posterior sacar las hojas de detalle de INFOEVENTO o sustituir parcialmente la hoja modular.
