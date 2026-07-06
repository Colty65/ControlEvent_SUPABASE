Tras subir V30.3 puedes eliminar referencias antiguas si quieres limpiar el repositorio:

public/app/legacy/legacy-bundle-before-modules-v30.2.js
public/app/legacy/legacy-bundle-after-modules-v30.2.js
public/app/legacy/legacy-bundle-before-modules-v30.1.js
public/app/legacy/legacy-bundle-after-modules-v30.1.js

No borres carpetas completas. La V30.3 ya referencia los ficheros legacy v30.3 desde public/index.html y public/sw.js.
