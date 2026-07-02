ControlEvent v16_prod - limpieza de archivos antiguos

Para una subida limpia a GitHub, conserva los archivos incluidos en este paquete y elimina del repositorio archivos legacy antiguos que no estén referenciados por index.html o sw.js.

En v29.3 los bundles activos son:
- public/app/legacy/legacy-bundle-before-modules-v29.3.js
- public/app/legacy/legacy-bundle-after-modules-v29.3.js

El service worker usa:
- controlevent-shell-v50-24

Si existen bundles v29.0, v29.1 o v29.2 en el repositorio y no están en este paquete, pueden eliminarse para evitar confusión y cache antiguo.
