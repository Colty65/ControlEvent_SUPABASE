# ControlEvent v5.1.0_prod - Render visible-only para iPad/Android

Versión generada sobre la base estable v28.6.1.

## Objetivo

Mejorar la fluidez en iPad y Android sin volver a activar `ControlEventActiveRender`, que en v28.6 empeoraba esos dispositivos.

## Cambios principales

- Versión visible actualizada a `ControlEvent v5.1.0_prod`.
- Nuevos bundles legacy renombrados a `legacy-bundle-before-modules-v29.0.js` y `legacy-bundle-after-modules-v29.0.js`.
- Nuevo optimizador `ControlEventMobileLite`, activado por defecto.
- `ControlEventMobileLite` evita repintar pantallas ocultas: Ingresos, Compras, Donaciones, Resumen, Gráficas y Mantenimiento.
- Mantiene `ControlEventActiveRender` desactivado por defecto.
- No toca INFOEVENTO, BACKUP, carga inicial, ExcelJS ni Supabase.

## Comandos de comprobación

En la consola del navegador:

```js
ControlEventMobileLite.print()
ControlEventActiveRender.print()
ControlEventDebug.status()
```

Si se quisiera desactivar temporalmente el nuevo optimizador:

```js
ControlEventMobileLite.disable()
```

Para restaurarlo:

```js
ControlEventMobileLite.enable()
```

## Prueba recomendada

1. Subir primero el paquete `SOLO_SUBIR_GITHUB` si ya estás en v28.6.1.
2. Abrir la app en modo normal, no con debug.
3. Probar iPad, Android, PC e iPhone.
4. Cambiar entre Ingresos, Compras, Donaciones, Resumen y Gráficas.
5. Añadir/modificar un registro pequeño y comprobar que la pantalla activa responde más rápido.

