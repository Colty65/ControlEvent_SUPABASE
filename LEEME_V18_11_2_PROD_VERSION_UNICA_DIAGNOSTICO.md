# ControlEvent v18.11.2_prod · Versionado único y diagnóstico

Esta entrega no cambia la lógica de negocio de Zuzu. Su objetivo es dejar claro qué versión se está ejecutando realmente.

## Cambios

- Fuente única de versión en `public/app/version.js` y `server/paths.js`.
- Script defensivo `v18-11-2-version-sanity.js` que corrige en pantalla cualquier rastro de versiones anteriores que puedan pintar hotfix antiguos.
- `/api/version` devuelve versión, label, fichero, build y ZIP.
- `MANIFEST_VERSION.txt` incluido en raíz del ZIP.
- Actualizadas cabecera, bienvenida, PDF/nombres de archivo y cache-busting básico.
- Limpieza de restos visibles `v18.9_prod`, `v18.10_prod`, `v18.11_prod` y `v18.11.1_prod` en archivos funcionales.

## Verificación rápida

En consola del navegador ejecutar:

```js
ControlEventVersionCheck()
```

Debe devolver `ok: true` y coincidir front/API en `ControlEvent v18.11.2_prod`.
