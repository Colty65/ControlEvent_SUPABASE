# ControlEvent v50.24

Versión de estabilización después de las pruebas de Excel standalone.

## Decisión importante

Los libros standalone `RESUMEN_MODULAR` y `GRAFICAS_MODULAR` se desactivan como descarga porque no son la fuente fiable del resultado final. La fuente fiable vuelve a ser únicamente `INFOEVENTO`, que ya estaba confirmado como correcto.

## Qué cambia

- `INFOEVENTO` no se toca funcionalmente.
- `ControlEventResumenSheet.downloadStandalone()` ya no genera un Excel independiente.
- `ControlEventGraficasSheet.downloadStandalone()` ya no genera un Excel independiente.
- Los módulos siguen disponibles para `preview()`, diagnóstico y trabajo interno.
- Se evita que se sigan descargando libros que no coinciden con INFOEVENTO.

## Prueba esperada

Generar únicamente INFOEVENTO desde la app normal.

Si se ejecuta en consola:

```js
ControlEventResumenSheet.downloadStandalone()
ControlEventGraficasSheet.downloadStandalone()
```

devolverán un objeto `{ ok:false, disabled:true }` y no descargarán ningún archivo.

## Archivos antiguos que se pueden borrar

```text
public/app/legacy/legacy-bundle-before-modules-v27.4.7.js
public/app/legacy/legacy-bundle-after-modules-v27.4.7.js
```
