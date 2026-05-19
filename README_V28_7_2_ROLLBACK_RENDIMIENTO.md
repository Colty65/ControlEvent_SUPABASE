# ControlEvent v28.7.3

Versión de rollback de rendimiento basada funcionalmente en v28.6.1, que fue la última confirmada como fluida en PC, iPad, Android e iPhone.

No toca funcionalmente INFOEVENTO, BACKUP, carga de datos ni guardado.

Objetivo: retirar los cambios de consolidación v28.7/v28.7.1 que empeoraron la experiencia en iPad/Android y volver al comportamiento práctico de v28.6.1, manteniendo numeración nueva.

Después de subirla, borrar si existen:
- public/app/legacy/legacy-bundle-before-modules-v28.7.js
- public/app/legacy/legacy-bundle-after-modules-v28.7.js
- public/app/legacy/legacy-bundle-before-modules-v28.7.1.js
- public/app/legacy/legacy-bundle-after-modules-v28.7.1.js
- public/app/performance/status.js
