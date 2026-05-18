# ControlEvent v27.4.5

Corrección menor centrada en los Excel modulares generados desde consola.

## Objetivo

- Mantener INFOEVENTO limpio, sin hojas auxiliares RESUMEN_MODULAR/GRAFICAS_MODULAR.
- Limpiar los standalone `ControlEventResumenSheet.downloadStandalone()` y `ControlEventGraficasSheet.downloadStandalone()`.
- Evitar que los standalone arrastren hojas cruzadas, imágenes, dibujos, rangos residuales o filas de diagnóstico.
- Mantener las hojas standalone protegidas con `open_excel_arrastre`.

## Pruebas recomendadas

```js
ControlEventResumenSheet.downloadStandalone().then(console.log).catch(console.error)
ControlEventGraficasSheet.downloadStandalone().then(console.log).catch(console.error)
```

Cada archivo debe tener una sola hoja visible:

- RESUMEN
- GRAFICAS

El INFOEVENTO normal debe seguir saliendo sólo con sus hojas clásicas.
