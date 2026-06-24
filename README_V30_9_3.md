# ControlEvent v15_prod

Corrección de rescate sobre v30.9.2.

- Añade una guardia temprana del login (`login-input-guard-v30.9.3.js`) para impedir que capas globales de globos/mapa/render bloqueen los campos de acceso.
- Mantiene los cambios de Mapa de recursos y globos de v30.9.
- Actualiza cache del service worker a `controlevent-shell-v50-24`.
- `package.json` y `package-lock.json` validados como JSON.
- Referencias de scripts en `index.html` verificadas.
