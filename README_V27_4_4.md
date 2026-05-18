# ControlEvent v27.4.4

Corrección de estabilización Excel después de v27.4.3.

## Cambios

- El INFOEVENTO vuelve a salir limpio: ya no se añaden por defecto las hojas `RESUMEN_MODULAR` ni `GRAFICAS_MODULAR`.
- Las hojas modulares eran sólo auditoría interna para comparar con las hojas legacy y se mantienen como herramientas standalone de consola.
- Se corrigen los Excel standalone modulares para que no arrastren hojas auxiliares y para que queden protegidos.
- Se conserva el INFOEVENTO clásico estable.

## Herramientas standalone

Siguen disponibles desde consola si se quieren comprobar:

```js
ControlEventResumenSheet.downloadStandalone()
ControlEventGraficasSheet.downloadStandalone()
```

## Limpieza

Si existen en GitHub, se pueden borrar los bundles antiguos:

- `public/app/legacy/legacy-bundle-before-modules-v27.4.3.js`
- `public/app/legacy/legacy-bundle-after-modules-v27.4.3.js`
