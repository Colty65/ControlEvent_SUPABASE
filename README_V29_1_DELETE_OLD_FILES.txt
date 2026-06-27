ControlEvent v16_prod

Si subes esta versión a GitHub, puedes borrar versiones antiguas de bundles legacy para evitar confusiones:

- public/app/legacy/legacy-bundle-before-modules-v29.0.js
- public/app/legacy/legacy-bundle-after-modules-v29.0.js
- public/app/legacy/legacy-bundle-before-modules-v28.6.1.js
- public/app/legacy/legacy-bundle-after-modules-v28.6.1.js

La v29.1 usa:

- public/app/legacy/legacy-bundle-before-modules-v29.1.js
- public/app/legacy/legacy-bundle-after-modules-v29.1.js
- public/app/performance/low-resource-boot.js

El service worker cambia a controlevent-shell-v50-24, por lo que debería refrescar la caché automáticamente.
