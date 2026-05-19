# ControlEvent v27.4.8

Corrección específica de los Excel standalone modulares generados desde consola.

## Qué se corrige

- INFOEVENTO no se toca funcionalmente; se mantiene limpio y correcto.
- Los Excel standalone de consola vuelven a incluir gráficos:
  - `ControlEventResumenSheet.downloadStandalone()` genera una hoja `RESUMEN` con tabla + gráfico visual.
  - `ControlEventGraficasSheet.downloadStandalone()` genera una hoja `GRAFICAS` con tablas + gráfico visual.
- Los gráficos standalone se insertan como imágenes PNG generadas en navegador.
- Se mantiene la protección de hoja con protección de objetos/dibujos para impedir borrado accidental.
- La limpieza standalone ya no borra `media`/`drawing`, porque eso eliminaba los gráficos.

## Pruebas recomendadas

```js
ControlEventResumenSheet.downloadStandalone()
  .then(console.log)
  .catch(console.error)

ControlEventGraficasSheet.downloadStandalone()
  .then(console.log)
  .catch(console.error)
```

Resultado esperado:

- RESUMEN_MODULAR: una sola hoja `RESUMEN`, limpia, protegida y con gráfico.
- GRAFICAS_MODULAR: una sola hoja `GRAFICAS`, limpia, protegida y con gráfico.
- INFOEVENTO: sin hojas modulares extra y sin cambios funcionales.

## Borrado opcional

Si siguen en GitHub, se pueden borrar:

```text
public/app/legacy/legacy-bundle-before-modules-v27.4.6.js
public/app/legacy/legacy-bundle-after-modules-v27.4.6.js
```
